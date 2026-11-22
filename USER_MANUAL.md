# SyntaxClipper — Official User Manual
**A Production Desktop Studio for Autonomous Video Clipping, Visual 9:16 Cropping & Multi-Platform Publishing**  
*Built by Syntax Nepal • Version 1.0*

---

## ⚡ 1. Quick Start (3-Minute Setup)

SyntaxClipper is designed to run 100% locally on your computer with zero cloud server hosting costs. It gives creators both an automated 24/7 clipping pipeline and precision manual video editing tools.

### Step 1: Start SyntaxClipper
- Double-click **`start_syntaxclipper.bat`** (or **`start_syntaxclipper.vbs`** for silent background launch).
- Your default web browser will automatically open to `http://localhost:3000`.

### Step 2: Complete the First-Run Setup Wizard
On your first launch, the **Publishing Providers & Connected Accounts Wizard** modal will automatically appear:
1. **System & Dependencies Check**: SyntaxClipper verifies your local installation of `ffmpeg`, `ffprobe`, `yt-dlp`, and required Python libraries (`faster-whisper`, `opencv-python`, `psutil`, `google-auth-oauthlib`). Green checkmarks confirm everything is ready.
2. **Choose Publishing Providers**:
   - **Hybrid Mode (Recommended)**: Combines Direct YouTube Data API v3 for YouTube Shorts with Zernio or WoopSocial for TikTok, Instagram Reels, and Facebook Reels.
   - **Provider A — Unified Multi-Platform API**: Enter your **Zernio API key** (`zn_...`) or **WoopSocial API key** (`wsk_...`) and select your active publishing channels.
   - **Provider B — Direct YouTube Data API v3**: Upload Google OAuth `client_secret.json` and authorize your channel in 1 click for up to **100 uploads/day free**.
   - **Provider C — Local Export Only**: Skip API keys completely and export rendered 9:16 clips to `exports/local/<creator>/`.
3. **Preferences**:
   - Set daily post caps (e.g. YouTube: 10/day, TikTok: 10/day, Reels: 10/day) and keep **"Auto-Delete Local Clips Upon Upload"** enabled.
   - Click **Finish & Launch Studio**.

---

## 🔑 2. Multi-Provider & Hybrid Publishing Architecture

SyntaxClipper supports multiple connection methods that can be used independently or combined in **Hybrid Mode**:

### Provider A: Unified Multi-Platform API (Zernio & WoopSocial)
- **Zernio API**: Enables 1-key publishing across **YouTube Shorts, TikTok (up to 15 posts/day free), Instagram Reels, Facebook Reels, and X**.
  - Get an API key at [Zernio.com](https://zernio.com).
  - Connect your social accounts in the Zernio dashboard.
  - Paste your key in SyntaxClipper and click **Verify & Fetch Connected Accounts**.
- **WoopSocial API**: Enterprise multi-account scheduler with an auto-enforced 4/day YouTube safety cap and 10/day TikTok cap.

### Provider B: Direct YouTube Data API v3 (Up to 100 Uploads/Day Free)
- Completely bypasses any third-party intermediary and uploads directly to Google's YouTube servers.
- **How to Get Your Google OAuth Credentials**:
  1. Open [Google Cloud Console](https://console.cloud.google.com) and create a project named `SyntaxClipper`.
  2. In **APIs & Services**, search for and enable **YouTube Data API v3**.
  3. Go to **Credentials -> Create Credentials -> OAuth Client ID**. Choose **Desktop App**.
  4. Download the `client_secret.json` and paste its contents into the Setup Wizard in SyntaxClipper.
  5. Under **OAuth Consent Screen**, add your personal Google account email as a **Test User**.
  6. Click **Authorize YouTube Channel in Browser** in SyntaxClipper to complete authorization.
- **Notice on YouTube Visibility**:
  - Unverified personal Google Cloud projects upload videos as **Private** until audited. You can set them to Public in YouTube Studio with 1 click, or combine with Zernio for instant Public uploads.

### Provider C: Local Export Only (Zero API Keys)
- Every render produces a high-bitrate vertical 1080x1920 MP4 file and a corresponding `_metadata.txt` with formatted YouTube Shorts title (`#Shorts` enforced) and viral hashtags, saved to `exports/local/<creator>/`.

---

## 🎯 3. Interactive Manual URL Studio & Visual Crop Editor

The **Manual URL Studio** tab provides total precision control over any YouTube or Twitch video without downloading the whole stream first:

### 1. Instant Video Inspection
- Paste any YouTube or Twitch link and click **Inspect Video**.
- Resolves video title, uploader channel, duration, and thumbnail in ~2 seconds.

### 2. AI Highlight Moments
- Click **Auto-Find Best Moments** to analyze duration milestones.
- Generates 3–5 high-engagement highlight moments (e.g., *Peak Battle*, *Clutch Finale*, *High Action*).
- Clicking any moment automatically populates your Start Timestamp, Duration, and a suggested Hook Headline!

### 3. Visual Preview Frame & Custom Facecam Bounding Box
- Click **Refresh Frame** to view an authentic visual snapshot at your selected start timestamp.
- When using **Facecam Split 42/58**, toggle **Custom Webcam Bounding Box** to display an interactive green overlay. Adjust sliders (**X Offset, Y Offset, Width, Height**) to crop the streamer's camera exactly regardless of where they place it on their stream!
- When using **No-Facecam Full-Screen**, a dashed guide displays the center 9:16 gameplay crop.

### 4. Hook Cards, Word-Pop Captions & Rendering
- Enter your **Hook Headline** (e.g. `UNREAL 1V4 CLUTCH`).
- Choose between **Transparent Outlined** title or **Rounded White Streamer Card**.
- Select your **Subtitle Highlight Color** (Yellow, Green, Cyan, Pink, White).
- Multi-select target platforms (**YouTube Shorts, TikTok, Instagram Reels, Facebook Reels, Local Only**).
- Click **Render 9:16 Clip** and watch the real-time progress monitor.

---

## 📐 4. 3-Way Facecam Modes & Dynamic Typography

SyntaxClipper provides dedicated layout geometry tailored for any stream style:

### Mode 1: No-Facecam Full-Screen (Center Crop 9:16)
- **Use Case**: Walkthroughs, no-facecam gameplay, cinematic trailers, esports.
- **Video Geometry**: Bypasses OpenCV facecam detection and takes a crisp `1080x1920` center-crop of the 16:9 canvas.
- **Typography Alignment**:
  - **Hook Headline Card**: Snapped to the top at `y=150` so it is clearly visible above mobile UI buttons.
  - **Synchronized Captions**: Positioned at `y=1380` (lower-third) with `-0.15s` sync lead to ensure the gameplay action remains completely unobstructed.

### Mode 2: Facecam Split (42% Top / 58% Bottom)
- **Use Case**: Streamers with corner webcams (e.g. BeastBoyShub, IShowSpeed, CaseOh, Kai Cenat).
- **Video Geometry**: Crops the streamer's camera into the top `1080x810` box and action gameplay into the bottom `1080x1110` box with zero black bars or seam gaps.
- **Typography Alignment**:
  - **Hook Headline Card**: Positioned across the split line at `y=95`.
  - **Synchronized Captions**: Positioned at `y=810`.

### Mode 3: Auto-Detect (Dynamic Fallback)
- **Use Case**: Automated Autopilot mode across mixed creator libraries.
- SyntaxClipper evaluates static corner pixel variance and Haar cascades:
  - If a stable webcam is found, it automatically applies **Facecam Split 42/58**.
  - If no webcam is found, it cleanly falls back to **No-Facecam Full-Screen 9:16**.

---

## 💾 5. Destination Routing & Local Video Exports

SyntaxClipper supports both fully automated cloud posting and private local editing:

### Per-Creator Destination Setting
In the **Creators & Games Library** tab, each creator profile has a **Destination Mode**:
- **`woopsocial` / Multi-Publish**: Automatically uploads and schedules to connected YouTube, TikTok, and Instagram accounts, adhering to rolling daily limits, and deletes local temp files once confirmed.
- **`local_only` (Save Locally — Do Not Post)**: Renders the clip and saves it permanently to:
  ```
  exports/local/<creator_name>/<clip_filename>.mp4
  exports/local/<creator_name>/<clip_filename>_metadata.txt
  ```

### Local Video Exports Workspace
The **Local Video Exports** tab offers a dedicated browsing suite:
- **Embedded 9:16 HTML5 Player**: Preview saved clips with full scrub controls.
- **1-Click Copy Metadata**:
  - **YouTube Shorts Title & Description**: Formatted with `#Shorts` enforcement and ready to paste into YouTube Studio.
  - **TikTok & Reels Caption**: Includes viral hashtags ready to paste on mobile or web.
- **Open in Windows Explorer**: 1-click button launches `explorer.exe` directly inside the creator's export folder.
- **Send to Socials**: 1-click button lets you instantly schedule any local export to your connected channels whenever you decide to publish.

---

## 🤖 6. Autopilot, Laptop-Off Scheduling & Game Mode

### Silent Background Operation
The background engine (`backend/autopilot.py`) runs silently with zero terminal popups. All `yt-dlp`, `ffmpeg`, and `ffprobe` tasks execute with `CREATE_NO_WINDOW` and run at `BELOW_NORMAL_PRIORITY_CLASS`, preventing CPU spikes.

### Laptop-Off Scheduling (Cloud Buffer)
- When SyntaxClipper generates and schedules a clip, the video is uploaded directly to cloud media servers.
- **You do NOT need to leave your computer running 24/7!** Once a post is scheduled, cloud servers publish the post to YouTube Shorts and TikTok at the exact scheduled time even if your laptop is shut down or offline.

### Automatic Game-Mode Detection (Zero FPS Drop)
- SyntaxClipper monitors active background processes using `psutil` against an extensive list of competitive games (`GTA6.exe`, `GTA5.exe`, `VALORANT-Win64-Shipping.exe`, `cs2.exe`, `FortniteClient-Win64-Shipping.exe`, `javaw.exe`, `Minecraft.Windows.exe`, `sekiro.exe`, `eldenring.exe`, `r5apex.exe`, etc.) and performs fullscreen window detection.
- **Whenever you launch a game, SyntaxClipper immediately pauses all video downloads and FFmpeg rendering.**
- The top telemetry bar will display `Paused — Game Detected (<gamename.exe>)`.
- The moment you close the game, SyntaxClipper resumes seamlessly in the background without stealing a single frame per second.

---

## 📊 7. Platform Limits & Auto Disk Cleanup

### Understanding Platform Rate Limits
- **Direct YouTube Data API v3**: Up to 100 uploads/day free under Google's 10,000 units/day quota.
- **WoopSocial YouTube Cap**: 5 posts per 24 hours per organization (SyntaxClipper defaults to 4 posts per rolling 24 hours).
- **TikTok Schedule**: SyntaxClipper permits up to **10–15 TikTok posts per day**, spaced 2 hours apart.

---

## 💻 8. Launch Scripts & File Reference

| File | Purpose |
| :--- | :--- |
| `start_syntaxclipper.bat` | Standard launcher: Starts FastAPI & Next.js and opens your browser. |
| `start_syntaxclipper.vbs` | Silent launcher: Runs the servers in the background with zero terminal windows. |
| `stop_syntaxclipper.bat` | Clean shutdown: Terminates any running FastAPI, Next.js, or Autopilot processes. |
| `config.json` | Local user configuration (API keys, selected channels, rate limits). |
| `config.example.json` | Clean template for git repository sharing. |
| `client_secret.json` | Local Google Cloud OAuth credentials (strictly gitignored). |
| `youtube_token.json` | Authorized YouTube credentials token (strictly gitignored). |
| `exports/local/` | Storage destination for clips rendered with "Save Locally Only". |
| `queue/ready/` | Local buffer holding clips awaiting cloud scheduling. |
| `backend/` | Python FastAPI backend, OpenCV facecam engine, Whisper subtitles, Multi-Publisher. |
| `frontend/` | Next.js 14, Tailwind CSS, Lucide React dark broadcast studio UI. |

---

## 💖 9. Support & Credits

SyntaxClipper is developed and maintained as an open, free local studio tool by **Syntax Nepal**. It runs entirely locally on your machine with zero required subscription fees or cloud server costs.

If SyntaxClipper helps automate your channel, save hours of manual video editing, or scale your short-form content, consider supporting our ongoing development:

👉 **[Support Syntax Nepal on Kamaucha](https://kamaucha.me/sozan)**
- **Supported Payment Methods**: eSewa, Khalti, Fonepay, and international Cards.
- Every donation directly supports future algorithm updates, new platform integrations, and local AI model optimizations.

---

*SyntaxClipper by Syntax Nepal • Zero Cloud Server Costs • Built for Serious Content Creators*
