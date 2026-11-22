"""Sample-aligned original audio with short cut fades and silent-range padding."""
import json
import re
import subprocess
from pathlib import Path
from backend.utils.ffmpeg_utils import get_ffprobe_path, get_ffmpeg_path


def has_audio(video):
    try:
        result = subprocess.run([get_ffprobe_path(), '-v', 'error', '-select_streams', 'a:0',
            '-show_entries', 'stream=index', '-of', 'json', str(video)], capture_output=True,
            text=True, check=True, timeout=30)
        return bool(json.loads(result.stdout).get('streams'))
    except Exception:
        return False


def get_audio_duration(audio_path) -> float:
    """Returns the duration of the audio file in seconds, or 0.0 on error."""
    try:
        result = subprocess.run([
            get_ffprobe_path(), '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            str(audio_path)
        ], capture_output=True, text=True, check=True, timeout=10)
        return float(result.stdout.strip())
    except Exception:
        return 0.0


def find_audio_highlight_start(audio_path, clip_duration: float, mode: str = 'highlight', custom_start: float = 0.0, scene_start: float = 0.0) -> float:
    """Find the optimal audio start offset (in seconds).
    
    Modes:
    - 'highlight': Analyzes track loudness / energy across candidate offsets to locate the chorus / energetic peak.
    - 'start': Starts from 0:00.
    - 'custom': Starts from custom_start (clamped to duration).
    - 'sync': Starts from scene_start (clamped to duration).
    """
    total_dur = get_audio_duration(audio_path)
    if total_dur <= 0 or clip_duration <= 0:
        return 0.0
    if clip_duration >= total_dur:
        return 0.0

    max_start = max(0.0, total_dur - clip_duration)

    if mode in ('start', 'beginning'):
        return 0.0
    if mode == 'custom':
        return min(max_start, max(0.0, custom_start))
    if mode == 'sync':
        return min(max_start, max(0.0, scene_start))

    # Auto Highlight / Peak energy detection:
    # Sample candidate positions across the track (avoiding dead intros/outros)
    fractions = [0.15, 0.25, 0.35, 0.50, 0.65]
    candidates = []
    for f in fractions:
        offset = round(min(max_start, max(0.0, f * total_dur)), 2)
        if offset not in candidates:
            candidates.append(offset)
    if 0.0 not in candidates and max_start > 0:
        candidates.append(0.0)

    best_offset = candidates[0] if candidates else 0.0
    best_volume = -999.0

    ffmpeg_bin = get_ffmpeg_path()
    sample_len = min(4.0, clip_duration)

    for cand in candidates:
        try:
            p = subprocess.run([
                ffmpeg_bin, '-nostdin', '-v', 'info',
                '-ss', f'{cand:.2f}',
                '-t', f'{sample_len:.2f}',
                '-i', str(audio_path),
                '-af', 'volumedetect',
                '-f', 'null', '-'
            ], capture_output=True, text=True, timeout=5)
            match = re.search(r'mean_volume:\s*([-\d.]+)\s*dB', p.stderr)
            if match:
                vol = float(match.group(1))
                if vol > best_volume:
                    best_volume = vol
                    best_offset = cand
        except Exception:
            continue

    return round(best_offset, 2)


def scene_duration(scene):
    # All video cuts are 30 fps; align audio to the same whole-frame durations.
    return max(1, round((scene.end-scene.start)*30)) / 30


def cut_filters(silence_input, duration, audio_input=0, bgm_input=None, ducking=True, has_music=False):
    # The silence input is finite via atrim. It also covers ranges after the
    # original audio track ends, where apad alone receives no input frames.
    # When background music is present, smooth cinematic fades (0.4s in, 1.0s out)
    # prevent jarring cutoffs. Without BGM, keep micro-fades for tight speech cuts.
    fade_in = min(0.4 if (bgm_input is not None or has_music) else 0.008, duration / 4)
    fade_out = min(1.0 if (bgm_input is not None or has_music) else 0.012, duration / 4)
    if bgm_input is not None:
        bgm_vol = '0.20' if ducking else '0.40'
        return (
            f'[{audio_input}:a:0]aresample=48000:async=1:first_pts=0,aformat=sample_fmts=fltp:channel_layouts=stereo[primary_a];'
            f'[{bgm_input}:a:0]aresample=48000:async=1:first_pts=0,volume={bgm_vol},'
            f'afade=t=in:st=0:d={fade_in},afade=t=out:st={duration-fade_out}:d={fade_out},'
            f'aformat=sample_fmts=fltp:channel_layouts=stereo[bgm_a];'
            f'[primary_a][bgm_a]amix=inputs=2:duration=longest:normalize=0[mixed_original];'
            f'[{silence_input}:a:0][mixed_original]amix=inputs=2:duration=longest:normalize=0,'
            f'atrim=duration={duration},asetpts=PTS-STARTPTS,'
            f'afade=t=in:st=0:d={fade_in},afade=t=out:st={duration-fade_out}:d={fade_out}[audioout]'
        )
    return (
        f'[{audio_input}:a:0]aresample=48000:async=1:first_pts=0,'
        'aformat=sample_fmts=fltp:channel_layouts=stereo[original];'
        f'[{silence_input}:a:0][original]amix=inputs=2:duration=longest:normalize=0,'
        f'atrim=duration={duration},asetpts=PTS-STARTPTS,'
        f'afade=t=in:st=0:d={fade_in},afade=t=out:st={duration-fade_out}:d={fade_out}[audioout]'
    )


# The social target the loudness QA checks: -14 LUFS integrated, true peak at or below -1 dBTP.
# The second pass aims 1 dB under the ceiling so the AAC encode's overshoot stays at or below -1 dBTP.
LOUDNORM_TARGET = {'I': -14.0, 'TP': -2.0, 'LRA': 11.0}
_RESAMPLE = 'aresample=48000:async=1:first_pts=0'


def _loudnorm(extra: str = '') -> str:
    target = LOUDNORM_TARGET
    return f"loudnorm=I={target['I']}:TP={target['TP']}:LRA={target['LRA']}{extra}"


def parse_loudnorm(text: str) -> dict | None:
    """The measured block loudnorm prints with print_format=json, or None."""
    end = text.rfind('}')
    start = text.rfind('{', 0, end)
    if start < 0 or end < 0:
        return None
    try:
        data = json.loads(text[start:end + 1])
        values = {key: float(data[key]) for key in ('input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset')}
    except (KeyError, TypeError, ValueError):
        return None
    # Silence measures -inf / -70; a second pass would only add noise gain.
    if values['input_i'] <= -60 or any(value != value or abs(value) == float('inf') for value in values.values()):
        return None
    return values


def loudnorm_filter(measured: dict | None) -> str:
    """The final mix's audio filter: two-pass loudnorm when measured, else the plain resample."""
    if not measured:
        return _RESAMPLE
    second = (
        f":measured_I={measured['input_i']}:measured_TP={measured['input_tp']}"
        f":measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}"
        f":offset={measured['target_offset']}:linear=true"
    )
    # loudnorm works at 192 kHz; bring it back to the 48 kHz the encode uses.
    return f'{_RESAMPLE},{_loudnorm(second)},aresample=48000'


def measure_loudnorm(input_args: list[str], run, timeout: float) -> dict | None:
    """First pass over the joined audio. Any failure keeps the plain mix."""
    from backend.utils.ffmpeg_utils import get_ffmpeg_path
    cmd = [get_ffmpeg_path(), '-hide_banner', '-nostats', *input_args, '-map', '0:a:0', '-vn', '-sn', '-dn',
           '-af', f'{_RESAMPLE},{_loudnorm(":print_format=json")}', '-f', 'null', '-']
    try:
        proc = run(cmd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return None
    if proc.returncode:
        return None
    return parse_loudnorm(proc.stderr or '')
