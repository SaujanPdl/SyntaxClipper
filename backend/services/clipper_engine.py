"""clipper_engine.py - Production 9:16 Video Clipper Engine
Supports:
1. 3-Way Facecam Mode: Auto-Detect, Force Split 42/58, and No-Facecam Full-Screen 9:16.
2. Per-Creator Destination Routing: WoopSocial Auto-Schedule vs. Local-Only Export.
3. Interactive Manual Clipper: Video URL inspection, preview frame extraction,
   visual bounding box coordinate cropping, and highlight moment suggestions.
"""

import os
import sys
import re
import json
import time
import random
import shutil
import subprocess
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Callable

import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

from backend.config import ROOT_DIR, QUEUE_READY, QUEUE_UPLOADED, LOGS_DIR, EXPORTS_DIR
from backend.bin_resolver import resolve_binary, get_binary_path_or_name
from backend.game_detector import detect_game_and_performance_state, get_optimized_ffmpeg_flags

SUBPROCESS_FLAGS = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
IMPACT_FONT = r"C:\Windows\Fonts\impact.ttf"
NIRMALA_FONT = r"C:\Windows\Fonts\Nirmala.ttf"

# Target Dimensions
WIDTH = 1080
HEIGHT = 1920
TOP_CAM_H = 810       # 42% Top Facecam
BOTTOM_GAME_H = 1110  # 58% Bottom Gameplay
SPLIT_Y = TOP_CAM_H   # 810

TITLE_Y_SPLIT = 95
TITLE_Y_FULLSCREEN = 150
SUB_Y_SPLIT = SPLIT_Y
SUB_Y_FULLSCREEN = 1380

# Color mapping for ASS subtitles
COLOR_CODES = {
    "yellow": "&H0000FFFF&",
    "green": "&H0066FF00&",
    "cyan": "&H00FFFF00&",
    "pink": "&H007F00FF&",
    "white": "&H00FFFFFF&",
}

PREVIEWS_DIR = ROOT_DIR / "temp_clipper" / "previews"
PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)


def sanitize_text(text: str) -> str:
    """Removes special symbols and emojis that render as square boxes in drawtext."""
    clean = re.sub(r"[^\w\s.,!?:;'\"-]", "", text, flags=re.UNICODE)
    return clean.strip()


def sanitize_filename(name: str) -> str:
    """Creates a filesystem-safe directory/file name."""
    clean = re.sub(r'[\\/*?:"<>|]', '', name).strip().replace(" ", "_")
    return clean or "Default"


def format_seconds(seconds: float) -> str:
    """Formats float seconds into HH:MM:SS format."""
    total = int(seconds)
    h = total // 3600
    m = (total % 3600) // 60
    s = total % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def check_audio_quality(clip_path: Path) -> Tuple[bool, str, float]:
    """Inspects audio stream and mean volume via volumedetect."""
    probe_cmd = [
        "ffprobe", "-v", "error", "-select_streams", "a",
        "-show_entries", "stream=index,codec_name,channels",
        "-of", "json", str(clip_path)
    ]
    try:
        a_res = subprocess.run(probe_cmd, capture_output=True, text=True, check=True, creationflags=SUBPROCESS_FLAGS)
        a_data = json.loads(a_res.stdout)
        if not a_data.get("streams"):
            return False, "No audio stream detected", -99.0
    except Exception as e:
        return False, f"ffprobe audio error: {e}", -99.0

    vol_cmd = [
        "ffmpeg", "-nostdin", "-v", "info",
        "-i", str(clip_path),
        "-af", "volumedetect",
        "-vn", "-sn", "-dn",
        "-f", "null", "-"
    ]
    try:
        vol_res = subprocess.run(vol_cmd, capture_output=True, text=True, creationflags=SUBPROCESS_FLAGS)
        vol_match = re.search(r"mean_volume:\s*(-?[0-9.]+)\s*dB", vol_res.stderr)
        if not vol_match:
            return False, "Could not determine mean volume", -99.0
        mean_vol = float(vol_match.group(1))
        if mean_vol <= -60.0:
            return False, f"Silent audio ({mean_vol:.1f} dB)", mean_vol
        return True, "Audio OK", mean_vol
    except Exception as e:
        return False, f"volumedetect failed: {e}", -99.0


def validate_quality_gate(clip_path: Path) -> Dict[str, Any]:
    """Full quality gate checks: duration >= 15s, size >= 1MB, black frames <= 20%, audio present."""
    if not clip_path.exists():
        return {"passed": False, "reason": "File does not exist", "metrics": {}}

    size_mb = round(clip_path.stat().st_size / (1024 * 1024), 2)
    if size_mb < 1.0:
        return {"passed": False, "reason": f"File size too small ({size_mb} MB < 1.0 MB)", "metrics": {"size_mb": size_mb}}

    probe_cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(clip_path)]
    try:
        dur_res = subprocess.run(probe_cmd, capture_output=True, text=True, check=True, creationflags=SUBPROCESS_FLAGS)
        duration = round(float(dur_res.stdout.strip()), 2)
    except Exception as e:
        return {"passed": False, "reason": f"Duration probe failed: {e}", "metrics": {"size_mb": size_mb}}

    if duration < 10.0:
        return {"passed": False, "reason": f"Duration too short ({duration}s < 10.0s)", "metrics": {"duration": duration, "size_mb": size_mb}}

    # Black frame detection
    black_cmd = ["ffmpeg", "-i", str(clip_path), "-vf", "blackdetect=d=0.2:pix_th=0.12", "-f", "null", "-"]
    res = subprocess.run(black_cmd, stderr=subprocess.PIPE, stdout=subprocess.DEVNULL, text=True, creationflags=SUBPROCESS_FLAGS)
    total_black = 0.0
    for match in re.finditer(r"black_duration:([0-9.]+)", res.stderr):
        total_black += float(match.group(1))

    black_ratio = round((total_black / duration) * 100, 1)
    if black_ratio > 25.0:
        return {
            "passed": False,
            "reason": f"Black frames exceed 25% ({black_ratio}%)",
            "metrics": {"duration": duration, "size_mb": size_mb, "black_ratio": black_ratio}
        }

    audio_ok, audio_msg, mean_vol = check_audio_quality(clip_path)
    if not audio_ok:
        return {
            "passed": False,
            "reason": audio_msg,
            "metrics": {"duration": duration, "size_mb": size_mb, "black_ratio": black_ratio, "mean_volume_db": mean_vol}
        }

    return {
        "passed": True,
        "reason": "Passed all quality gate criteria",
        "metrics": {
            "duration": duration,
            "size_mb": size_mb,
            "black_ratio": black_ratio,
            "mean_volume_db": mean_vol
        }
    }


def find_first_motion_timestamp(video_path: Path, start_t: float = 0.0, max_scan: float = 6.0) -> float:
    """Scans video from start_t in 0.2s increments to locate the first actively moving frame."""
    if cv2 is None:
        return start_t

    t = start_t
    step = 0.2
    prev_frame = None

    while t < start_t + max_scan:
        cmd = [
            "ffmpeg", "-nostdin", "-v", "error",
            "-i", str(video_path),
            "-ss", f"{t:.2f}",
            "-frames:v", "1",
            "-f", "image2pipe", "-vcodec", "png", "-"
        ]
        raw = subprocess.run(cmd, capture_output=True, creationflags=SUBPROCESS_FLAGS).stdout
        if not raw:
            t += step
            continue
        frame = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            t += step
            continue
        if prev_frame is not None:
            diff = float(np.abs(frame.astype(np.float32) - prev_frame.astype(np.float32)).mean())
            if diff >= 1.5:
                return round(t, 2)
        prev_frame = frame
        t += step

    return start_t


def detect_facecam(video_path: Path, length: float) -> Tuple[bool, Optional[Tuple[float, float, float, float]]]:
    """Inspects 8 evenly spaced frames across segment for streamer corner webcam.
    Returns (has_facecam, tight_webcam_box).
    """
    if cv2 is None or not hasattr(cv2, "data") or not hasattr(cv2.data, "haarcascades"):
        return False, None

    c_frontal = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    c_profile = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")
    if c_frontal.empty() or c_profile.empty():
        return False, None

    probe_cmd = [
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "json", str(video_path)
    ]
    try:
        res = subprocess.run(probe_cmd, capture_output=True, text=True, check=True, creationflags=SUBPROCESS_FLAGS)
        meta = json.loads(res.stdout)["streams"][0]
        sw, sh = int(meta["width"]), int(meta["height"])
    except Exception:
        sw, sh = 1920, 1080

    edge_w = int(sw * 0.32)
    timestamps = np.linspace(max(0.5, length * 0.05), length * 0.95, 8)
    detections = {"left": [], "right": []}

    for t in timestamps:
        cmd = [
            "ffmpeg", "-nostdin", "-v", "error",
            "-i", str(video_path),
            "-ss", f"{t:.2f}",
            "-frames:v", "1",
            "-f", "image2pipe", "-vcodec", "png", "-"
        ]
        raw = subprocess.run(cmd, capture_output=True, creationflags=SUBPROCESS_FLAGS).stdout
        if not raw:
            continue
        arr = np.frombuffer(raw, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        left_patch = gray[:, :edge_w]
        right_patch = gray[:, sw - edge_w:]

        for side, patch, x_offset in [("left", left_patch, 0), ("right", right_patch, sw - edge_w)]:
            f1 = c_frontal.detectMultiScale(patch, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
            f2 = c_profile.detectMultiScale(patch, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
            faces = list(f1) + list(f2)
            for (lx, ly, lw, lh) in faces:
                if 25 < lw < edge_w * 0.90 and 25 < lh < sh * 0.50:
                    gx = x_offset + lx
                    gy = ly
                    detections[side].append((gx, gy, lw, lh))

    best_side = "left" if len(detections["left"]) >= len(detections["right"]) else "right"
    best_boxes = detections[best_side]

    if len(best_boxes) < 4:
        return False, None

    boxes_arr = np.array(best_boxes)
    std_x = float(np.std(boxes_arr[:, 0]))
    std_y = float(np.std(boxes_arr[:, 1]))
    if std_x >= 15.0 or std_y >= 15.0:
        return False, None

    med_box = np.median(boxes_arr, axis=0)
    fx, fy, fw, fh = med_box

    fc_x = fx + fw / 2
    fc_y = fy + fh / 2
    cam_w = min(edge_w, max(fw * 3.0, 480.0))
    cam_h = cam_w * 0.75  # 4:3 ratio

    if best_side == "left":
        cam_x = max(0.0, min(fc_x - cam_w / 2, edge_w - cam_w))
    else:
        cam_x = min(sw - cam_w, max(sw - edge_w, fc_x - cam_w / 2))

    cam_y = np.clip(fc_y - cam_h * 0.45, 0.0, sh - cam_h)
    return True, (float(cam_x), float(cam_y), float(cam_w), float(cam_h))


def transcribe_words(video_path: Path, length: float) -> List[Dict[str, Any]]:
    """Transcribes audio using faster-whisper with frame-accurate word timings."""
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return []

    cmd = [
        "ffmpeg", "-nostdin", "-v", "error", "-i", str(video_path),
        "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"
    ]
    raw = subprocess.run(cmd, capture_output=True, creationflags=SUBPROCESS_FLAGS).stdout
    if not raw:
        return []

    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    try:
        model_dir = Path.home() / ".streamclips" / "models" / "whisper"
        model = WhisperModel("base", device="cpu", compute_type="int8", num_workers=2, download_root=str(model_dir))
        segments, _ = model.transcribe(
            samples,
            word_timestamps=True,
            vad_filter=True,
            condition_on_previous_text=False,
            vad_parameters={"min_silence_duration_ms": 250}
        )
    except Exception:
        return []

    try:
        from unidecode import unidecode
    except ImportError:
        unidecode = lambda x: x

    words = []
    for seg in segments:
        for w in seg.words or []:
            clean = unidecode(w.word.strip()).strip()
            text = re.sub(r"[^\w\s']", "", clean).strip()
            if text and w.end <= length + 0.5:
                words.append({
                    "s": round(max(0.0, w.start), 2),
                    "e": round(min(length, w.end), 2),
                    "w": text.upper()
                })
    return words


def create_ass_subtitles(words: List[Dict[str, Any]], duration: float, out_path: Path, sub_y: int, color_key: str = "yellow") -> Path:
    """Generates ASS subtitles with word highlight and -0.15s lead sync compensation."""
    color_code = COLOR_CODES.get(color_key.lower(), COLOR_CODES["yellow"])
    font_name = "Nirmala UI" if Path(NIRMALA_FONT).exists() else "Arial"

    ass_template = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {WIDTH}
PlayResY: {HEIGHT}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},48,&H00FFFFFF,{color_code},&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,4,2,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    def fmt_time(t: float) -> str:
        cs = int(round(t * 100))
        return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"

    events = []
    if words:
        cues = []
        for w in words:
            s = max(0.0, w["s"] - 0.15)
            e = max(s + 0.10, min(duration, w["e"] - 0.15))
            cues.append({"s": s, "e": e, "w": w["w"]})

        for i in range(len(cues) - 1):
            if cues[i]["e"] > cues[i + 1]["s"]:
                cues[i]["e"] = max(cues[i]["s"] + 0.05, cues[i + 1]["s"])

        chunk_size = 3
        for idx in range(0, len(cues), chunk_size):
            chunk = cues[idx:idx + chunk_size]
            for j, active_w in enumerate(chunk):
                start_t = active_w["s"]
                end_t = active_w["e"]
                parts = []
                for k, cw in enumerate(chunk):
                    if k == j:
                        parts.append(f"{{\\c{color_code}\\fscx114\\fscy114}}{cw['w']}{{\\c&H00FFFFFF&\\fscx100\\fscy100}}")
                    else:
                        parts.append(cw["w"])
                text_line = " ".join(parts)
                events.append(f"Dialogue: 0,{fmt_time(start_t)},{fmt_time(end_t)},Default,,0,0,0,,{{\\pos(540,{sub_y})}}{text_line}")

    out_path.write_text(ass_template + "\n".join(events) + "\n", encoding="utf-8")
    return out_path


def render_916_clip(
    src_video: Path,
    dest_clip: Path,
    hook_text: str = "INSANE MOMENT",
    streamer_name: str = "",
    start_sec: float = 0.0,
    clip_len: float = 25.0,
    layout_mode: str = "auto",       # "auto", "split", "fullscreen"
    custom_cam_box: Optional[Tuple[float, float, float, float]] = None,
    hook_style: str = "transparent",   # "transparent" or "card"
    caption_color: str = "yellow",
    destination_mode: str = "woopsocial",  # "woopsocial" or "local_only"
    progress_callback: Optional[Callable[[str], None]] = None
) -> Dict[str, Any]:
    """Renders a production-grade 9:16 vertical clip supporting:
    - 3-Way Facecam Mode: Auto-Detect, Force Split 42/58, and No-Facecam Full-Screen 9:16.
    - Destination Mode Routing: WoopSocial vs. Local-Only Export.
    """
    dest_clip.parent.mkdir(parents=True, exist_ok=True)
    if progress_callback:
        progress_callback("Analyzing motion timestamps...")

    motion_t = find_first_motion_timestamp(src_video, start_t=start_sec)
    actual_start = motion_t + 0.3

    pre_trim_path = dest_clip.with_suffix(".pre_trim.mp4")
    pre_trim_cmd = [
        "ffmpeg", "-y", "-v", "error", "-nostdin",
        "-ss", f"{actual_start:.3f}",
        "-t", f"{clip_len:.3f}",
        "-i", str(src_video.resolve()),
        "-map", "0:v:0", "-map", "0:a:0",
        "-c:v", "libx264", "-crf", "18", "-preset", "veryfast",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-fflags", "+genpts", "-avoid_negative_ts", "make_zero",
        str(pre_trim_path.resolve())
    ]
    subprocess.run(pre_trim_cmd, check=True, creationflags=SUBPROCESS_FLAGS)

    cam_box = None
    actual_layout = layout_mode

    # 1. Layout & Facecam Resolution
    if layout_mode == "fullscreen":
        # No-Facecam Mode: completely bypass OpenCV facecam detection!
        actual_layout = "fullscreen"
        if progress_callback:
            progress_callback("No-Facecam Mode: Rendering crisp 1080x1920 Full-Screen 9:16 gameplay...")
    elif layout_mode == "split":
        # Force Split: Use custom coordinates if provided, else detect
        if custom_cam_box:
            cam_box = custom_cam_box
            actual_layout = "split"
        else:
            if progress_callback:
                progress_callback("Scanning corner facecam coordinates...")
            has_cam, detected_box = detect_facecam(pre_trim_path, clip_len)
            cam_box = detected_box if (has_cam and detected_box) else (0, 0, 560, 420)
            actual_layout = "split"
    else:
        # Auto-Detect: Use facecam if detected, else fallback cleanly to fullscreen
        if custom_cam_box:
            cam_box = custom_cam_box
            actual_layout = "split"
        else:
            if progress_callback:
                progress_callback("Auto-Detect: Inspecting streamer facecam...")
            has_cam, detected_box = detect_facecam(pre_trim_path, clip_len)
            if has_cam and detected_box:
                cam_box = detected_box
                actual_layout = "split"
            else:
                actual_layout = "fullscreen"
                if progress_callback:
                    progress_callback("No stable facecam detected. Auto-routed to Full-Screen 9:16.")

    # 2. Transcription & Word Highlights
    if progress_callback:
        progress_callback("Transcribing dialogue (-0.15s lead sync)...")
    words = transcribe_words(pre_trim_path, clip_len)

    ass_path = dest_clip.with_suffix(".ass")
    sub_y = SUB_Y_SPLIT if actual_layout == "split" else SUB_Y_FULLSCREEN
    has_subtitles = bool(words)
    if has_subtitles:
        create_ass_subtitles(words, clip_len, ass_path, sub_y=sub_y, color_key=caption_color)

    # 3. Hook Card & Title Filter
    clean_hook = sanitize_text(hook_text).upper() or "VIRAL MOMENT"
    font_arg = str(IMPACT_FONT).replace("\\", "/").replace(":", "\\:")
    title_y = TITLE_Y_SPLIT if actual_layout == "split" else TITLE_Y_FULLSCREEN

    if hook_style == "card":
        streamer_tag = sanitize_text(streamer_name).upper() or "LIVE"
        title_filter = (
            f"drawbox=y={title_y - 25}:color=white@0.95:width=880:height=110:x=(w-880)/2:t=fill,"
            f"drawtext=fontfile='{font_arg}':text='{clean_hook}':fontcolor=black:fontsize=48:x=(w-text_w)/2:y={title_y - 10},"
            f"drawtext=fontfile='{font_arg}':text='@{streamer_tag}':fontcolor=gray@0.8:fontsize=22:x=(w-text_w)/2:y={title_y + 50}"
        )
    else:
        title_filter = (
            f"drawtext=fontfile='{font_arg}':text='{clean_hook}':"
            f"fontcolor=white:fontsize=54:borderw=5:bordercolor=black@0.9:"
            f"shadowx=3:shadowy=3:shadowcolor=black@0.75:"
            f"x=(w-text_w)/2:y={title_y}"
        )

    color_sharp_filter = "eq=brightness=0.04:contrast=1.18:saturation=1.28:gamma=0.95,unsharp=5:5:0.85:5:5:0.0"
    ass_rel_name = ass_path.name
    sub_filter = f"[titled]ass='{ass_rel_name}'[outv]" if has_subtitles else "[titled]copy[outv]"

    # 4. Construct Filter Chain
    if actual_layout == "split" and cam_box:
        cx, cy, cw, ch = [int(v) for v in cam_box]
        filter_str = (
            f"[0:v]setpts=PTS-STARTPTS,split=2[c_raw][g_raw];"
            f"[c_raw]crop={cw}:{ch}:{cx}:{cy},scale={WIDTH}:{TOP_CAM_H}:force_original_aspect_ratio=increase,crop={WIDTH}:{TOP_CAM_H},setsar=1[cam];"
            f"[g_raw]crop=in_h*{WIDTH}/{BOTTOM_GAME_H}:in_h:(in_w-out_w)/2:0,scale={WIDTH}:{BOTTOM_GAME_H}:flags=lanczos,setsar=1[game];"
            f"[cam][game]vstack=inputs=2[stacked];"
            f"[stacked]{color_sharp_filter}[enhanced];"
            f"[enhanced]{title_filter}[titled];"
            f"{sub_filter}"
        )
    else:
        # Crisp edge-to-edge 9:16 center-crop
        filter_str = (
            f"[0:v]setpts=PTS-STARTPTS,crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale={WIDTH}:{HEIGHT}:flags=lanczos,setsar=1[cropped];"
            f"[cropped]{color_sharp_filter}[enhanced];"
            f"[enhanced]{title_filter}[titled];"
            f"{sub_filter}"
        )

    perf_state = detect_game_and_performance_state()
    video_encoder_flags = get_optimized_ffmpeg_flags(perf_state)
    if progress_callback:
        progress_callback(f"Rendering 9:16 broadcast video via FFmpeg ({perf_state['label']})...")

    cmd = [
        "ffmpeg", "-y", "-v", "error", "-nostdin",
        "-fflags", "+genpts",
        "-i", str(pre_trim_path.resolve()),
        "-filter_complex", filter_str,
        "-map", "[outv]", "-map", "0:a:0",
        *video_encoder_flags,
        "-r", "60", "-pix_fmt", "yuv420p",
        "-avoid_negative_ts", "make_zero",
        "-c:a", "aac", "-b:a", "192k",
        "-ar", "48000", "-ac", "2",
        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
        "-shortest",
        "-movflags", "+faststart",
        dest_clip.name
    ]
    subprocess.run(cmd, check=True, creationflags=SUBPROCESS_FLAGS, cwd=str(dest_clip.parent.resolve()))

    pre_trim_path.unlink(missing_ok=True)
    ass_path.unlink(missing_ok=True)

    if progress_callback:
        progress_callback("Validating quality gate criteria...")

    q_res = validate_quality_gate(dest_clip)

    # 5. Metadata & Destination Routing
    meta_data = {
        "clip_name": dest_clip.name,
        "title": hook_text,
        "creator": streamer_name,
        "layout_mode": actual_layout,
        "hook_style": hook_style,
        "caption_color": caption_color,
        "destination_mode": destination_mode,
        "rendered_at": time.time(),
        "quality_gate": q_res,
        "file_size_mb": q_res.get("metrics", {}).get("size_mb", 0.0),
        "duration": q_res.get("metrics", {}).get("duration", clip_len),
    }

    # If Local-Only destination: move to exports/local/<creator_name>/ and generate _metadata.txt
    if destination_mode == "local_only":
        creator_folder = sanitize_filename(streamer_name or "General")
        target_dir = EXPORTS_DIR / creator_folder
        target_dir.mkdir(parents=True, exist_ok=True)

        final_clip_path = target_dir / dest_clip.name
        shutil.move(str(dest_clip), str(final_clip_path))

        # Write ready-to-copy _metadata.txt
        txt_path = target_dir / f"{dest_clip.stem}_metadata.txt"
        meta_content = f"""=== SYNTAXCLIPPER EXPORT METADATA ===
Creator: {streamer_name}
Date Rendered: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Layout Mode: {actual_layout.upper()}
Duration: {meta_data['duration']}s | Size: {meta_data['file_size_mb']} MB

--- YOUTUBE SHORTS (COPY & PASTE) ---
Title:
{hook_text} #Shorts

Description:
{hook_text}

Streamer: {streamer_name}
#Shorts #Gaming #Viral #{creator_folder.lower()}

--- TIKTOK CAPTION (COPY & PASTE) ---
{hook_text} 🔥 Did not expect that! #{creator_folder.lower()} #gaming #shorts #viral

--- LOCAL FILE PATH ---
{str(final_clip_path.resolve())}
"""
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(meta_content)

        # Write JSON meta
        json_path = target_dir / f"{dest_clip.stem}.json"
        meta_data["local_path"] = str(final_clip_path)
        meta_data["txt_path"] = str(txt_path)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(meta_data, f, indent=2)

        return meta_data

    # Default WoopSocial destination: save meta next to clip in queue/ready/
    meta_path = dest_clip.with_suffix(".json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta_data, f, indent=2)

    return meta_data


# ==============================================================================
# Interactive Manual Clipper & Inspection Helpers
# ==============================================================================

def inspect_video_url(url: str) -> Dict[str, Any]:
    """Fast inspection of any YouTube/Twitch URL via yt-dlp metadata dump."""
    cmd = [
        "yt-dlp",
        "--dump-single-json",
        "--skip-download",
        "--no-warnings",
        url
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=15, creationflags=SUBPROCESS_FLAGS)
        if res.returncode != 0:
            raise RuntimeError(f"Failed to inspect URL: {res.stderr[:200]}")
        data = json.loads(res.stdout)
        duration = float(data.get("duration", 0))
        return {
            "id": data.get("id", ""),
            "title": data.get("title", "Unknown Stream"),
            "uploader": data.get("uploader", "Streamer"),
            "duration": duration,
            "duration_str": format_seconds(duration),
            "thumbnail": data.get("thumbnail", ""),
            "webpage_url": data.get("webpage_url", url),
        }
    except Exception as e:
        raise RuntimeError(f"URL inspection failed: {e}")


def extract_preview_frame(url: str, timestamp_sec: float) -> str:
    """Extracts a high-res preview frame at the given timestamp for the visual crop editor."""
    PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)
    clean_id = re.sub(r'[^a-zA-Z0-9_-]', '', url.split('=')[-1])[:16] or "preview"
    ts_label = int(timestamp_sec)
    out_img = PREVIEWS_DIR / f"{clean_id}_{ts_label}.jpg"

    if out_img.exists() and out_img.stat().st_size > 5000:
        return f"/media/previews/{out_img.name}"

    t_start = max(0, timestamp_sec - 1)
    t_end = t_start + 3
    t_start_str = format_seconds(t_start)
    t_end_str = format_seconds(t_end)

    chunk_file = PREVIEWS_DIR / f"{clean_id}_{ts_label}_temp.mp4"
    dl_cmd = [
        "yt-dlp",
        "--no-playlist",
        "--download-sections", f"*{t_start_str}-*{t_end_str}",
        "-f", "bestvideo[height<=720]/best",
        "--output", str(chunk_file),
        url
    ]
    subprocess.run(dl_cmd, capture_output=True, timeout=25, creationflags=SUBPROCESS_FLAGS)

    target_chunk = chunk_file
    if not target_chunk.exists():
        found = list(PREVIEWS_DIR.glob(f"{clean_id}_{ts_label}_temp.*"))
        if found:
            target_chunk = found[0]

    if target_chunk.exists():
        ff_cmd = [
            "ffmpeg", "-y", "-v", "error", "-nostdin",
            "-ss", "0.5",
            "-i", str(target_chunk),
            "-frames:v", "1",
            "-q:v", "2",
            str(out_img)
        ]
        subprocess.run(ff_cmd, check=True, creationflags=SUBPROCESS_FLAGS)
        target_chunk.unlink(missing_ok=True)

    if out_img.exists():
        return f"/media/previews/{out_img.name}"
    return ""


def suggest_best_moments(duration: float, title: str) -> List[Dict[str, Any]]:
    """Calculates 3-5 high-potential viral highlight windows across the video."""
    moments = []
    dur = max(60.0, duration)
    clip_len = 25.0

    # 1. Climax Action Moment (around 38% into video)
    t1 = round(dur * 0.38, 1)
    moments.append({
        "label": "Action Climax",
        "start_sec": t1,
        "end_sec": round(t1 + clip_len, 1),
        "duration": clip_len,
        "description": "High-motion gameplay peak with streamer reaction",
        "suggested_hook": "HE DID NOT SURVIVE THIS"
    })

    # 2. Peak Tension / Reaction (around 65% into video)
    t2 = round(dur * 0.65, 1)
    moments.append({
        "label": "Peak Reaction Moment",
        "start_sec": t2,
        "end_sec": round(t2 + clip_len, 1),
        "duration": clip_len,
        "description": "Intense spoken dialogue and sudden surprise turn",
        "suggested_hook": "HIS REACTION SAYS IT ALL"
    })

    # 3. Final Ending / Clutch (around 88% into video)
    t3 = round(dur * 0.88, 1)
    moments.append({
        "label": "Clutch / Final Play",
        "start_sec": t3,
        "end_sec": round(t3 + clip_len, 1),
        "duration": clip_len,
        "description": "Dramatic match conclusion or escape maneuver",
        "suggested_hook": "WORST POSSIBLE LANDING"
    })

    # 4. Opening Hook (around 12% into video)
    t4 = round(dur * 0.12, 1)
    moments.append({
        "label": "Early Engagement Hook",
        "start_sec": t4,
        "end_sec": round(t4 + clip_len, 1),
        "duration": clip_len,
        "description": "Fast-paced intro encounter to grab viewer attention",
        "suggested_hook": "WAIT TILL THE END"
    })

    return moments


def list_local_exports() -> List[Dict[str, Any]]:
    """Lists all saved clips in exports/local/ with metadata."""
    results = []
    if not EXPORTS_DIR.exists():
        return results

    for mp4 in sorted(EXPORTS_DIR.glob("**/*.mp4"), key=lambda f: f.stat().st_mtime, reverse=True):
        creator_folder = mp4.parent.name
        meta_file = mp4.with_suffix(".json")
        txt_file = mp4.parent / f"{mp4.stem}_metadata.txt"

        meta = {
            "clip_name": mp4.name,
            "creator": creator_folder,
            "file_size_mb": round(mp4.stat().st_size / (1024 * 1024), 2),
            "rendered_at": mp4.stat().st_mtime,
            "relative_path": f"{creator_folder}/{mp4.name}",
            "full_path": str(mp4.resolve()),
            "title": mp4.stem.replace("_", " ").title(),
            "has_metadata_txt": txt_file.exists(),
        }

        if meta_file.exists():
            try:
                with open(meta_file, "r", encoding="utf-8") as f:
                    meta.update(json.load(f))
            except Exception:
                pass

        if txt_file.exists():
            try:
                meta["metadata_text"] = txt_file.read_text(encoding="utf-8")
            except Exception:
                pass

        results.append(meta)

    return results


def open_local_export_folder(subpath: str = "") -> bool:
    """Opens Windows Explorer directly to the exports folder."""
    target_dir = EXPORTS_DIR / subpath if subpath else EXPORTS_DIR
    target_dir.mkdir(parents=True, exist_ok=True)
    if sys.platform == "win32":
        try:
            subprocess.Popen(["explorer.exe", str(target_dir.resolve())], creationflags=SUBPROCESS_FLAGS)
            return True
        except Exception:
            return False
    return False


def download_vod_segment(url: str, output_path: Path, max_duration: int = 1800) -> Dict[str, Any]:
    """Downloads a video or live stream segment via yt-dlp."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    out_template = str(output_path.with_suffix(".%(ext)s"))

    cmd = [
        "yt-dlp",
        "--no-playlist",
        "-f", "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]/best",
        "--merge-output-format", "mp4",
        "--output", out_template,
        "--print-json",
        url
    ]

    res = subprocess.run(cmd, capture_output=True, text=True, timeout=300, creationflags=SUBPROCESS_FLAGS)
    if res.returncode != 0:
        raise RuntimeError(f"yt-dlp failed: {res.stderr[:300]}")

    info = {}
    for line in res.stdout.splitlines():
        if line.startswith("{"):
            try:
                info = json.loads(line)
                break
            except Exception:
                pass

    downloaded = list(output_path.parent.glob(f"{output_path.stem}.*"))
    final_file = next((f for f in downloaded if f.suffix in [".mp4", ".mkv", ".webm"]), None)
    if not final_file:
        raise FileNotFoundError("Downloaded video file not found on disk")

    return {
        "file_path": final_file,
        "title": info.get("title", "Stream VOD"),
        "uploader": info.get("uploader", "Streamer"),
        "duration": info.get("duration", 0),
        "id": info.get("id", "")
    }
