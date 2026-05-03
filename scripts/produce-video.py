#!/usr/bin/env python3
# Created by BBMW0 Technologies | bbmw0.com
"""
Video Production Pipeline - GPU Accelerated, Fully Autonomous
=============================================================
Produces a finished MP4 + SRT captions ready for the YouTube Shorts engine.

Capabilities:
  - Animated FFmpeg backgrounds (geq pixel-math, 4 brand themes, zero API cost)
  - RTX NVENC hardware encoding (auto-detected, ~5x faster than CPU)
  - Intel i9 multi-thread CPU fallback (libx264 -threads 0)
  - Microsoft edge-tts voiceover, British English (free, auto-installed)
  - SRT caption file generated alongside every video
  - All Python dependencies self-installed on first run

Usage:
  python produce-video.py --input package.json --output "C:/.../.YouTube Project"
  python produce-video.py --input package.json --dry-run
"""

# ── BOOTSTRAP: self-install all dependencies ──────────────────────────────────
# Agents have unrestricted CMD/PowerShell access  -  this installs automatically.
import subprocess, sys, importlib as _il

def _ensure(package: str, import_name: str | None = None) -> bool:
    name = import_name or package.replace("-", "_")
    try:
        _il.import_module(name)
        return True
    except ImportError:
        print(f"[Bootstrap] {package} not found. Auto-installing via pip...")
        try:
            subprocess.run(
                [sys.executable, "-m", "pip", "install", package, "--quiet", "--upgrade"],
                check=True, timeout=120,
            )
            _il.import_module(name)
            print(f"[Bootstrap] {package} installed successfully.")
            return True
        except Exception as exc:
            print(f"[Bootstrap] Could not install {package}: {exc}")
            return False

_ensure("edge-tts", "edge_tts")
_ensure("requests")  # kept as fallback for any future integrations

# ── STANDARD IMPORTS ─────────────────────────────────────────────────────────

import argparse, asyncio, json, os, time, uuid, tempfile, textwrap
from pathlib import Path
from typing import Optional

# edge-tts loaded dynamically so auto-install above takes effect
try:
    import edge_tts as _edge_tts_mod
    EDGE_TTS_AVAILABLE = True
except ImportError:
    _edge_tts_mod = None
    EDGE_TTS_AVAILABLE = False

# ── HARDWARE PROBE ────────────────────────────────────────────────────────────

_NVENC: Optional[bool] = None

def _nvenc_available() -> bool:
    """Auto-detect RTX NVENC. Cached after first call."""
    global _NVENC
    if _NVENC is None:
        try:
            r = subprocess.run(
                ["ffmpeg", "-hide_banner", "-encoders"],
                capture_output=True, text=True, timeout=10,
            )
            _NVENC = "h264_nvenc" in r.stdout
        except Exception:
            _NVENC = False
        if _NVENC:
            print("[GPU] RTX NVENC detected. Hardware encoding enabled (preset p4, VBR CQ20).")
        else:
            print("[GPU] NVENC not detected. CPU encoding via libx264 -threads 0.")
    return _NVENC

def _enc() -> list[str]:
    """Return FFmpeg encoder args: NVENC if RTX present, libx264 otherwise."""
    if _nvenc_available():
        return ["-c:v", "h264_nvenc", "-preset", "p4", "-rc", "vbr", "-cq", "20", "-b:v", "0"]
    return ["-c:v", "libx264", "-crf", "20", "-preset", "fast", "-threads", "0"]

# ── CONFIG ────────────────────────────────────────────────────────────────────

EDGE_TTS_VOICE = os.environ.get("EDGE_TTS_VOICE", "en-GB-SoniaNeural")

BRAND_COLOURS = {
    "default":      {"bg": "0x0a0a0a", "accent": "0xf59e0b", "text": "0xe0e0e0"},
    "games":        {"bg": "0x0d0d1a", "accent": "0x6366f1", "text": "0xffffff"},
    "tech":         {"bg": "0x0a0a0a", "accent": "0x22c55e", "text": "0xe0e0e0"},
    "motivational": {"bg": "0x1a0a00", "accent": "0xf97316", "text": "0xfafafa"},
}

# Per-theme animated background formulas (FFmpeg geq pixel-math, free, local)
THEME_GEQ = {
    "default": (
        "r='clip(10+45*abs(sin(2*PI*(0.40*t+X/800.0)))*abs(sin(2*PI*(0.30*t+Y/600.0))),0,255)':"
        "g='clip( 5+22*abs(sin(2*PI*(0.30*t+X/600.0+Y/800.0))),0,255)':"
        "b='clip( 2+12*abs(sin(2*PI*(0.50*t-X/900.0+Y/700.0))),0,255)'"
    ),
    "games": (
        "r='clip(13+80*pow(sin(PI*(0.50*t+X/400.0)),2)*pow(sin(PI*(0.40*t+Y/400.0)),2),0,255)':"
        "g='clip(13+80*pow(sin(PI*(0.40*t+X/300.0)),2)*pow(sin(PI*(0.50*t-Y/500.0)),2),0,255)':"
        "b='clip(26+180*pow(sin(PI*(0.30*t+(X+Y)/600.0)),2),0,255)'"
    ),
    "tech": (
        "r='clip( 5+10*sin(Y/50.0+t*2),0,255)':"
        "g='clip(20+140*pow(abs(sin(PI*(t+X/200.0+Y/100.0))),4),0,255)':"
        "b='clip( 5+10*sin(X/50.0+t*3),0,255)'"
    ),
    "motivational": (
        "r='clip(26+200*abs(sin(PI*(0.30*t+Y/1920.0))),0,255)':"
        "g='clip(10+80*abs(sin(PI*(0.30*t+Y/1920.0)*0.7)),0,255)':"
        "b='clip( 0+30*abs(sin(PI*(0.20*t+Y/2000.0))),0,255)'"
    ),
}

OUTPUT_FOLDER = Path(os.environ.get(
    "YT_OUTPUT_FOLDER",
    r"C:\Users\BBMW0\OneDrive\Documents\.YouTube Project",
))

# ── CONTENT POLICY: NO FACES (Islamic tasweer principle) ─────────────────────
# Depicting any face or figure of a living being (human, animal, anime, cartoon)
# is haram (prohibited). All visuals must be abstract, geometric, typographic,
# architectural, or natural (non-living subjects only).
#
# This policy is enforced at two levels:
#   1. HARD: FFmpeg-only backgrounds  -  zero AI image generation, zero faces possible
#   2. SOFT: _policy_check_prompt() rejects any prompt containing face-related terms
#            so that if AI video integration is ever added, this gate still holds.

_FORBIDDEN_PROMPT_TERMS = [
    "face", "person", "people", "human", "man", "woman", "boy", "girl", "child",
    "portrait", "selfie", "character", "anime", "cartoon", "mascot", "avatar",
    "figure", "silhouette", "body", "head", "smile", "eyes", "lips",
    "animal", "dog", "cat", "bird", "creature", "monster", "beast",
    "emoji", "sticker",
]

def _policy_check_prompt(prompt: str) -> tuple[bool, str]:
    """
    Returns (ok, reason). Rejects prompts that describe faces or living beings.
    All content must be abstract, geometric, text-based, or non-living nature.
    """
    low = prompt.lower()
    for term in _FORBIDDEN_PROMPT_TERMS:
        if term in low:
            return False, f"Policy violation: prompt contains '{term}' (faces/living beings are not permitted)"
    return True, ""

def _enforce_policy(scenes: list) -> list:
    """Filter or replace any scene whose prompt violates the content policy."""
    clean = []
    for s in scenes:
        ok, reason = _policy_check_prompt(s.prompt)
        if not ok:
            print(f"  [ContentPolicy] Scene {s.index} blocked  -  {reason}")
            s.prompt = "abstract geometric light pattern, no living beings, digital art"
        clean.append(s)
    return clean

# ── DATA STRUCTURES ───────────────────────────────────────────────────────────

class Scene:
    def __init__(self, index: int, prompt: str, caption: str, duration: int = 5):
        self.index    = index
        self.prompt   = prompt
        self.caption  = caption
        self.duration = duration
        self.clip_path: Optional[Path] = None

class ContentPackage:
    def __init__(self, data: dict):
        self.post_id        = data.get("id", data.get("postId", str(uuid.uuid4())))
        self.platform       = data.get("platform",  "youtube")
        self.format         = data.get("format",    "short")
        self.title          = data.get("title",     "Untitled")
        self.hook           = data.get("hook",      "")
        self.script         = data.get("script",    "")
        self.theme          = data.get("theme",     "default")
        self.niche          = data.get("niche",     "tech")
        self.scenes         = [Scene(i, s["prompt"], s["caption"], s.get("duration", 5))
                               for i, s in enumerate(data.get("scenes", []))]
        self.voiceover_text = data.get("voiceover", data.get("voiceoverText", self.script))

# ── ANIMATED CLIP GENERATION (free, local, RTX or CPU) ───────────────────────

def generate_animated_clip(scene: Scene, theme: str) -> Path:
    """Generate a dynamic animated background using FFmpeg geq + RTX NVENC."""
    geq     = THEME_GEQ.get(theme, THEME_GEQ["default"])
    colours = BRAND_COLOURS.get(theme, BRAND_COLOURS["default"])
    tmp     = Path(tempfile.mktemp(suffix=f"_anim{scene.index}.mp4"))

    # geq runs on CPU; NVENC encodes the output on GPU  -  best of both
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"color=c={colours['bg']}:s=1080x1920:r=30:d={scene.duration}",
        "-vf", f"geq={geq}",
        *_enc(),
        "-pix_fmt", "yuv420p",
        str(tmp),
    ]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        print(f"  [WARN] Animated clip failed (scene {scene.index}): {result.stderr.decode()[:200]}")
        return _solid_clip(scene, theme)
    print(f"  [FFmpeg] Animated clip: scene {scene.index} ({scene.duration}s, theme={theme})")
    return tmp

def _solid_clip(scene: Scene, theme: str) -> Path:
    """Solid-colour fallback if geq fails on this FFmpeg build."""
    colours = BRAND_COLOURS.get(theme, BRAND_COLOURS["default"])
    tmp     = Path(tempfile.mktemp(suffix=f"_solid{scene.index}.mp4"))
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", f"color=c={colours['bg']}:s=1080x1920:r=30:d={scene.duration}",
        *_enc(), "-pix_fmt", "yuv420p", str(tmp),
    ], check=True, capture_output=True)
    return tmp

# ── VOICEOVER via edge-tts (free Microsoft neural TTS) ───────────────────────

async def _tts_async(text: str, voice: str, out: str) -> None:
    communicate = _edge_tts_mod.Communicate(text, voice)
    await communicate.save(out)

def generate_voiceover(text: str, dry_run: bool = False) -> Optional[Path]:
    if dry_run:
        print("  [DRY-RUN] edge-tts: skipped")
        return None
    if not EDGE_TTS_AVAILABLE or _edge_tts_mod is None:
        print("  [WARN] edge-tts unavailable. Video will be silent.")
        return None
    try:
        tmp = Path(tempfile.mktemp(suffix=".mp3"))
        asyncio.run(_tts_async(text, EDGE_TTS_VOICE, str(tmp)))
        print(f"  [edge-tts] Voice={EDGE_TTS_VOICE} | Size={tmp.stat().st_size // 1024}KB")
        return tmp
    except Exception as exc:
        print(f"  [WARN] edge-tts failed: {exc}. Video will be silent.")
        return None

# ── SRT CAPTION GENERATION ────────────────────────────────────────────────────

def _srt_time(seconds: float) -> str:
    h  = int(seconds // 3600)
    m  = int((seconds % 3600) // 60)
    s  = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def generate_srt(scenes: list[Scene], video_path: Path) -> Path:
    """
    Write a .srt subtitle file alongside the video.
    YouTube uses this for closed captions (CC button).
    """
    lines: list[str] = []
    t = 0.0
    for i, scene in enumerate(scenes, 1):
        lines.extend([
            str(i),
            f"{_srt_time(t)} --> {_srt_time(t + scene.duration)}",
            scene.caption,
            "",
        ])
        t += scene.duration
    srt_path = video_path.with_suffix(".srt")
    srt_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"  [Captions] SRT written: {srt_path.name} ({len(scenes)} cues)")
    return srt_path

# ── FFMPEG TEXT AND BRAND OVERLAYS ────────────────────────────────────────────

def _drawtext(caption: str, theme: str, clip_dur: int) -> str:
    colours  = BRAND_COLOURS.get(theme, BRAND_COLOURS["default"])
    font_map = {
        "default":      "C\\:/Windows/Fonts/arialbd.ttf",
        "games":        "C\\:/Windows/Fonts/impact.ttf",
        "tech":         "C\\:/Windows/Fonts/consola.ttf",
        "motivational": "C\\:/Windows/Fonts/ariblk.ttf",
    }
    font  = font_map.get(theme, font_map["default"])
    text  = r"\n".join(textwrap.wrap(caption, width=22))
    fo    = 0.3
    fos   = max(clip_dur - fo - 0.2, clip_dur * 0.7)
    alpha = f"if(lt(t,{fo}),t/{fo},if(gt(t,{fos}),({clip_dur}-t)/{fo},1))"
    return (
        f"drawtext=text='{text}':fontfile='{font}':fontsize=52:"
        f"fontcolor={colours['text']}:bordercolor=black:borderw=3:"
        f"x=(w-text_w)/2:y=h*0.72:alpha='{alpha}':line_spacing=8"
    )

def _hook_overlay(hook: str, theme: str) -> str:
    colours = BRAND_COLOURS.get(theme, BRAND_COLOURS["default"])
    text    = r"\n".join(textwrap.wrap(hook, width=18))
    fade    = "if(lt(t,0.4),t/0.4,if(gt(t,2.0),(2.4-t)/0.4,1))"
    return (
        f"drawtext=text='{text}':fontfile='C\\:/Windows/Fonts/arialbd.ttf':"
        f"fontsize=72:fontcolor={colours['accent']}:bordercolor=black:borderw=4:"
        f"x=(w-text_w)/2:y=h*0.25:alpha='{fade}'"
    )

def _brand_bug(channel: str = "@bbmw.0") -> str:
    return (
        f"drawtext=text='{channel}':fontfile='C\\:/Windows/Fonts/arialbd.ttf':"
        f"fontsize=28:fontcolor=0xffffff@0.7:x=w-text_w-20:y=h-40"
    )

def process_clip(clip: Path, scene: Scene, theme: str,
                 is_first: bool, hook: str) -> Path:
    out     = Path(tempfile.mktemp(suffix=f"_proc{scene.index}.mp4"))
    filters = [_drawtext(scene.caption, theme, scene.duration), _brand_bug()]
    if is_first and hook:
        filters.insert(0, _hook_overlay(hook, theme))
    filters += ["eq=contrast=1.05:brightness=0.02:saturation=1.1", "vignette=angle=PI/5:mode=forward"]

    cmd = [
        "ffmpeg", "-y", "-i", str(clip),
        "-vf", ",".join(filters),
        *_enc(), "-pix_fmt", "yuv420p", "-an", str(out),
    ]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        print(f"  [WARN] process_clip error (scene {scene.index}): {result.stderr.decode()[:200]}")
        return clip
    return out

def stitch_and_mix(processed: list[Path], vo: Optional[Path],
                   out_path: Path) -> None:
    concat_f = Path(tempfile.mktemp(suffix=".txt"))
    with open(concat_f, "w") as f:
        for p in processed:
            f.write(f"file '{str(p).replace(chr(92), '/')}'\n")

    concat_tmp = Path(tempfile.mktemp(suffix="_cat.mp4"))
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_f), "-c:v", "copy", "-an", str(concat_tmp),
    ], check=True, capture_output=True)

    if vo and vo.exists():
        subprocess.run([
            "ffmpeg", "-y",
            "-i", str(concat_tmp), "-i", str(vo),
            "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
            "-shortest", str(out_path),
        ], check=True, capture_output=True)
    else:
        subprocess.run([
            "ffmpeg", "-y", "-i", str(concat_tmp),
            "-c:v", "copy", "-an", str(out_path),
        ], check=True, capture_output=True)

    mb = out_path.stat().st_size // (1024 * 1024)
    print(f"  [FFmpeg] Final video: {out_path.name} ({mb}MB)")

# ── MAIN PIPELINE ─────────────────────────────────────────────────────────────

def produce(pkg: ContentPackage, dry_run: bool = False) -> dict:
    print(f"\n[VideoProducer] '{pkg.title}' | theme={pkg.theme} | scenes={len(pkg.scenes)} | gpu={'yes' if _nvenc_available() else 'no'}")
    if not pkg.scenes:
        return {"success": False, "error": "No scenes provided"}

    # Content policy gate  -  enforce face-free, no living beings
    pkg.scenes = _enforce_policy(pkg.scenes)

    # Stage 1: Animated backgrounds (geq + RTX NVENC or i9 CPU)
    print("[Stage 1] Generating animated clips...")
    for scene in pkg.scenes:
        print(f"  Scene {scene.index}: {scene.caption[:60]}...")
        scene.clip_path = None if dry_run else generate_animated_clip(scene, pkg.theme)

    if dry_run:
        dry_manifest = {
            "id": pkg.post_id, "title": pkg.title,
            "videoPath": "", "thumbnailPath": "", "srtPath": "",
            "duration": 0, "theme": pkg.theme,
            "producedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "klingUsed": False, "elevenLabsUsed": False, "gpuEncoded": False,
        }
        OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)
        dry_path = OUTPUT_FOLDER / f"{pkg.post_id}_dry.json"
        with open(dry_path, "w") as f:
            json.dump(dry_manifest, f)
        print(f"MANIFEST:{dry_path}")
        return dry_manifest

    # Stage 2: Captions, brand bug, colour grade
    print("[Stage 2] Applying captions, brand overlays, colour grade...")
    processed: list[Path] = []
    for i, scene in enumerate(pkg.scenes):
        if scene.clip_path is None:
            continue
        processed.append(process_clip(scene.clip_path, scene, pkg.theme, i == 0, pkg.hook))
        print(f"  Processed scene {scene.index}")
    if not processed:
        return {"success": False, "error": "All clips failed processing"}

    # Stage 3: Voiceover (free Microsoft neural TTS)
    print("[Stage 3] Generating voiceover via edge-tts...")
    vo = generate_voiceover(pkg.voiceover_text)

    # Stage 4: Stitch and mix
    print("[Stage 4] Stitching final video...")
    safe   = "".join(c for c in pkg.title if c.isalnum() or c in " -_")[:60].strip()
    fname  = f"{pkg.post_id}_{safe}.mp4".replace(" ", "_")
    out_path = OUTPUT_FOLDER / fname
    OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)
    stitch_and_mix(processed, vo, out_path)

    # Stage 5: SRT captions file
    print("[Stage 5] Generating SRT captions...")
    srt_path = generate_srt(pkg.scenes, out_path)

    # Probe duration
    duration_sec = 0
    try:
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(out_path)],
            capture_output=True, text=True,
        )
        duration_sec = int(float(probe.stdout.strip() or "0"))
    except Exception:
        duration_sec = sum(s.duration for s in pkg.scenes)

    # Thumbnail from first frame
    thumb_path = out_path.with_suffix(".jpg")
    try:
        subprocess.run([
            "ffmpeg", "-y", "-i", str(out_path),
            "-vframes", "1", "-q:v", "2", str(thumb_path),
        ], capture_output=True, check=True)
    except Exception:
        pass

    # Manifest (matches VideoManifest interface in video-production-agent.ts)
    manifest = {
        "id":             pkg.post_id,
        "title":          pkg.title,
        "videoPath":      str(out_path),
        "thumbnailPath":  str(thumb_path),
        "srtPath":        str(srt_path),
        "duration":       duration_sec,
        "theme":          pkg.theme,
        "producedAt":     time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "klingUsed":      False,
        "elevenLabsUsed": False,
        "gpuEncoded":     _nvenc_available(),
    }
    manifest_path = out_path.with_suffix(".json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"\n[VideoProducer] Done. Output: {out_path}")
    print(f"MANIFEST:{manifest_path}")
    return manifest

# ── ENTRY POINT ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="OmniOrg Video Producer")
    parser.add_argument("--input",   required=True)
    parser.add_argument("--output",  default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    # Load OmniOrg .env
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

    if args.output:
        global OUTPUT_FOLDER
        OUTPUT_FOLDER = Path(args.output)

    # Probe GPU once at startup so it's logged before rendering begins
    _nvenc_available()

    with open(args.input) as f:
        data = json.load(f)

    result = produce(ContentPackage(data), dry_run=args.dry_run)
    print(json.dumps(result, indent=2))
    sys.exit(0 if result.get("success") is not False else 1)

if __name__ == "__main__":
    main()
