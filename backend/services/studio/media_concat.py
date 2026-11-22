"""Multi-clip video concatenation and timeline metadata tracking for reels."""
import json
import logging
import subprocess
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def probe_clip(clip_path: Path) -> Dict[str, Any]:
    """Probe duration, width, height, and audio presence for a video clip."""
    cmd = [
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration:stream=index,codec_type,width,height,r_frame_rate',
        '-of', 'json', str(clip_path)
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=30)
        data = json.loads(res.stdout or '{}')
        streams = data.get('streams', [])
        duration = float(data.get('format', {}).get('duration', 0.0))
        video_stream = next((s for s in streams if s.get('codec_type') == 'video'), {})
        has_audio = any(s.get('codec_type') == 'audio' for s in streams)
        width = int(video_stream.get('width', 1920) or 1920)
        height = int(video_stream.get('height', 1080) or 1080)
        return {
            'duration': duration,
            'has_audio': has_audio,
            'width': width,
            'height': height,
        }
    except Exception as e:
        logger.warning(f"Error probing clip {clip_path}: {e}")
        return {'duration': 10.0, 'has_audio': False, 'width': 1920, 'height': 1080}


def concatenate_video_clips(clip_paths: List[Path], output_path: Path) -> List[Dict[str, Any]]:
    """
    Concatenate multiple video clips sequentially into output_path.
    Normalizes video scaling to standard resolution (based on first clip),
    adds silent audio to clips that lack an audio stream (e.g. drone footage),
    and outputs a standardized concatenated file with exact timestamps for each clip.
    """
    if not clip_paths:
        raise ValueError("No video clips provided for concatenation")

    if len(clip_paths) == 1:
        import shutil
        shutil.copy2(str(clip_paths[0]), str(output_path))
        info = probe_clip(clip_paths[0])
        return [{
            'index': 0,
            'filename': clip_paths[0].name,
            'start': 0.0,
            'end': round(info['duration'], 2),
            'duration': round(info['duration'], 2)
        }]

    clip_infos = [probe_clip(p) for p in clip_paths]

    # Calculate timeline offsets
    boundaries = []
    current_time = 0.0
    for idx, (p, info) in enumerate(zip(clip_paths, clip_infos)):
        dur = max(info['duration'], 0.5)
        boundaries.append({
            'index': idx,
            'filename': p.name,
            'start': round(current_time, 2),
            'end': round(current_time + dur, 2),
            'duration': round(dur, 2)
        })
        current_time += dur

    # Target resolution: determine from first clip or default 1920x1080
    first_w = clip_infos[0]['width']
    first_h = clip_infos[0]['height']
    target_w, target_h = (first_w, first_h) if first_w > 0 and first_h > 0 else (1920, 1080)
    # Ensure even dimensions for libx264
    target_w = target_w if target_w % 2 == 0 else target_w + 1
    target_h = target_h if target_h % 2 == 0 else target_h + 1

    # Build FFmpeg command with filter_complex
    cmd = ['ffmpeg', '-y']
    for p in clip_paths:
        cmd.extend(['-i', str(p)])

    filter_parts = []
    concat_inputs = []
    n = len(clip_paths)

    for i, info in enumerate(clip_infos):
        # Scale and pad each video to target dimensions
        filter_parts.append(
            f"[{i}:v]scale={target_w}:{target_h}:force_original_aspect_ratio=decrease,"
            f"pad={target_w}:{target_h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v{i}]"
        )
        if info['has_audio']:
            filter_parts.append(f"[{i}:a]aformat=sample_rates=44100:channel_layouts=stereo[a{i}]")
        else:
            dur = max(info['duration'], 0.5)
            filter_parts.append(f"aevalsrc=0:d={dur}:s=44100:c=stereo[a{i}]")
        concat_inputs.append(f"[v{i}][a{i}]")

    filter_parts.append(f"{''.join(concat_inputs)}concat=n={n}:v=1:a=1[v_out][a_out]")
    filter_complex = ';'.join(filter_parts)

    cmd.extend([
        '-filter_complex', filter_complex,
        '-map', '[v_out]',
        '-map', '[a_out]',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '20',
        '-c:a', 'aac',
        '-b:a', '192k',
        str(output_path)
    ])

    logger.info(f"Concatenating {n} clips into {output_path}...")
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if proc.returncode != 0:
        logger.error(f"FFmpeg concat failed: {proc.stderr}")
        raise RuntimeError(f"Failed to concatenate video clips: {proc.stderr[-300:]}")

    logger.info(f"Successfully concatenated {n} clips ({current_time:.2f}s total)")
    return boundaries
