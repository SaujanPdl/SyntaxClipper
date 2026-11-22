# SyntaxClipper — Beginner's User Manual & Guide
**Autonomous Video Clipper, 9:16 Vertical Cropper & Multi-Platform Publisher**  
*Built with ❤️ by Syntax Nepal • Version 1.3.0*

---

## ⚡ 1. 3-Minute Setup (Start Here)

SyntaxClipper is 100% free and runs entirely on your local Windows PC with zero cloud hosting fees. Follow these three quick steps to get started:

### Step 1: Launch SyntaxClipper
- Double-click **`start_syntaxclipper.bat`** (or `start_syntaxclipper.vbs` for silent background start).
- A terminal window will start the local server, and your web browser will automatically open to `http://localhost:3000`.

### Step 2: Auto-Install Video Processing Binaries
- In **Step 1 of the Setup Wizard**, SyntaxClipper checks for `ffmpeg`, `ffprobe`, and `yt-dlp`.
- If any tools are missing, click **"1-Click Auto-Install Missing Tools"**. SyntaxClipper will automatically configure everything without needing manual environment variables or command-line installs.

### Step 3: Connect Publishing OR Select Local Mode
- **To auto-post**: Enter your **Zernio API key** or connect your Google account via **Direct YouTube API**.
- **To save videos to your computer without posting**: Choose **"Save Locally Only"**. Zero API keys are needed, and all vertical 1080x1920 MP4 clips are saved straight to `exports/local/`!

---

## 🚀 2. Two Ways to Use SyntaxClipper

SyntaxClipper provides two flexible ways to create clips depending on your workflow:

### Mode 1: Hands-Free Autopilot (Set It Once and Forget It)
- **Best for**: Channel owners, clipping side-hustles, and 24/7 gaming clip channels.
- **How it works**:
  1. Go to the **Creators & Games** tab or click **"Load Starter Creators"** on the Quick Start card to enable popular streamers (e.g. IShowSpeed, Kai Cenat, CaseOh, BeastBoyShub).
  2. Click **"Turn ON Autopilot"** in the top bar or Autopilot tab.
  3. SyntaxClipper will silently scan streams, detect high-energy moments using Faster-Whisper AI audio transcription, render 9:16 vertical clips, and schedule them across your channels.
- **Zero FPS Drop Game Mode**: Whenever you start any PC game (Steam, Epic, Riot, etc.), SyntaxClipper instantly pauses all video rendering and downloads so your in-game framerate never drops.

### Mode 2: Manual Link Clipper (Instant Precision Control)
- **Best for**: Clipping a specific funny moment, match highlight, or custom stream.
- **How it works**:
  1. Open the **Manual URL Studio** tab.
  2. Paste any YouTube or Twitch link (e.g. `https://www.youtube.com/watch?v=...`).
  3. Click **"Auto-Find Best Moments"** to highlight high-energy action milestones, or drag the timestamp sliders to pick your exact moment.
  4. Choose your framing layout and click **"Render 9:16 Clip"**.

---

## 📐 3. Framing & Layout Modes

Choose how your 16:9 widescreen video is cropped into 9:16 vertical video:

| Layout Mode | Description | Ideal For |
|---|---|---|
| **Webcam + Gameplay Split** | Places the streamer's facecam in the top 42% and gameplay in the bottom 58%. | Livestreams with facecams (IShowSpeed, Kai Cenat, etc.). |
| **Full-Screen Gameplay (No Webcam)** | Takes a center 9:16 slice of the gameplay with headline card at top and captions in lower-third. | VTubers, no-facecam walkthroughs, and cinematic esports. |
| **Auto-Detect Webcam** | Uses OpenCV computer vision to automatically detect if a facecam exists and switches formats accordingly. | Mixed playlist of various streamers. |

---

## 🔑 4. Publishing Providers & Hybrid Architecture

SyntaxClipper supports single-key multi-platform posting, direct YouTube uploads, and local offline exports:

1. **Zernio or WoopSocial API**:
   - Connect once to schedule posts across **YouTube Shorts, TikTok (up to 15 posts/day free), Instagram Reels, and Facebook Reels**.
2. **Direct YouTube Data API v3**:
   - Uses your personal Google Cloud OAuth credentials to upload directly to YouTube servers with Google's free 10,000 units/day quota (~100 video uploads/day).
3. **Hybrid Mode (Recommended)**:
   - Routes YouTube Shorts through Direct YouTube Data API v3 for maximum speed, while routing TikTok, Instagram, and Facebook through Zernio.
4. **Local Only Mode**:
   - Skips all external API services. Rendered `.mp4` video files and formatted title/hashtag `.txt` caption files are saved directly inside `exports/local/<creator>/`.

---

## ❓ 5. Common Questions (FAQ)

### Can I close the browser and turn off my PC?
- **Browser**: Yes! You can close your browser tab at any time—the background server will continue running.
- **PC**: Because video editing and AI audio processing run locally on your own hardware, your PC must be awake to render clips. If your PC sleeps or turns off, Windows Task Scheduler automatically catches up on missing clips as soon as you turn your computer back on.

### What if my stream has no facecam?
- Simply select **"Full-Screen Gameplay (No Webcam)"** mode. SyntaxClipper will cleanly center-crop the gameplay and place dynamic subtitles safely at the bottom so they never block action or game HUD elements.

### Why does YouTube have a daily limit?
- Social platforms flag channels that upload dozens of videos all at once as spam. SyntaxClipper enforces a safe **10 clips/day** limit per channel, spaced 2–4 hours apart, to keep your channel in good standing with the algorithm.

### How do I update SyntaxClipper?
- Click **"Check for Updates"** in the bottom-left sidebar. When a new version is published, click **"Upgrade & Restart Now"**. Your local API keys, video queues, and custom creator libraries are automatically backed up and preserved!

---

## 💖 6. Credits & Support Syntax Nepal

SyntaxClipper is 100% free and open, built with Python FastAPI, Next.js 14, Tailwind CSS, yt-dlp, FFmpeg, OpenCV, and Faster-Whisper.

If SyntaxClipper saves you time or helps grow your content channels, please consider leaving a tip to support ongoing development:

👉 **Support Syntax Nepal**: [https://kamaucha.me/sozan](https://kamaucha.me/sozan)  
*(Supports eSewa, Khalti, Fonepay, and international cards)*
