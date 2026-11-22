import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from backend.services.studio.media_concat import probe_clip, concatenate_video_clips


def test_probe_clip(tmp_path):
    clip = tmp_path / "test.mp4"
    clip.write_bytes(b"dummy")
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            stdout='{"format": {"duration": "12.5"}, "streams": [{"codec_type": "video", "width": 1920, "height": 1080}, {"codec_type": "audio"}]}',
            returncode=0
        )
        res = probe_clip(clip)
        assert res["duration"] == 12.5
        assert res["has_audio"] is True
        assert res["width"] == 1920
        assert res["height"] == 1080


def test_concatenate_single_clip(tmp_path):
    c1 = tmp_path / "clip1.mp4"
    c1.write_bytes(b"video1")
    out = tmp_path / "out.mp4"
    with patch("backend.services.studio.media_concat.probe_clip") as mock_probe:
        mock_probe.return_value = {"duration": 5.0, "has_audio": True, "width": 1920, "height": 1080}
        boundaries = concatenate_video_clips([c1], out)
        assert len(boundaries) == 1
        assert boundaries[0]["filename"] == "clip1.mp4"
        assert boundaries[0]["duration"] == 5.0
        assert out.exists()


def test_concatenate_multi_clips(tmp_path):
    c1 = tmp_path / "clip1.mp4"
    c2 = tmp_path / "clip2.mp4"
    c1.write_bytes(b"v1")
    c2.write_bytes(b"v2")
    out = tmp_path / "out.mp4"
    with patch("backend.services.studio.media_concat.probe_clip") as mock_probe, \
         patch("subprocess.run") as mock_run:
        mock_probe.side_effect = [
            {"duration": 10.0, "has_audio": False, "width": 1920, "height": 1080},
            {"duration": 15.0, "has_audio": True, "width": 1920, "height": 1080},
        ]
        mock_run.return_value = MagicMock(returncode=0, stderr="")
        boundaries = concatenate_video_clips([c1, c2], out)
        assert len(boundaries) == 2
        assert boundaries[0]["start"] == 0.0
        assert boundaries[0]["end"] == 10.0
        assert boundaries[1]["start"] == 10.0
        assert boundaries[1]["end"] == 25.0
        assert boundaries[1]["duration"] == 15.0
