'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Zap,
  Video,
  Shield,
  Gamepad2,
  Calendar,
  HardDrive,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Crosshair,
  Split,
  Maximize,
  FolderOpen,
  KeyRound,
  Youtube,
  Globe,
  Heart,
  HelpCircle,
  Play,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function UserGuideView() {
  const [activeSection, setActiveSection] = useState<string>('quickstart');

  const sections = [
    { id: 'quickstart', title: '1. 3-Minute Setup (Start Here)', icon: Zap },
    { id: 'modes', title: '2. Two Ways to Use SyntaxClipper', icon: Layers },
    { id: 'layouts', title: '3. Framing & Layout Modes', icon: Video },
    { id: 'providers', title: '4. Publishing Setup & Providers', icon: KeyRound },
    { id: 'faq', title: '5. Common Questions (FAQ)', icon: HelpCircle },
    { id: 'support', title: '6. Credits & Support Syntax Nepal', icon: Heart },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="bg-[#12151C] border border-[#242936] rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            SyntaxClipper Beginner Manual & Guide
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Everything you need to turn gaming livestreams into ready-to-post vertical clips (Shorts, TikTok, Reels) in minutes.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#191D26] text-emerald-400 border border-[#242936]">
            v1.3.0 • by Syntax Nepal
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Sidebar (3 cols) */}
        <div className="lg:col-span-3 space-y-1.5">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#191D26] text-emerald-400 border border-emerald-500/30 font-semibold'
                    : 'bg-[#12151C] text-slate-400 hover:text-white border border-[#242936] hover:bg-[#191D26]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{s.title}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? 'rotate-90 text-emerald-400' : 'text-slate-600'}`} />
              </button>
            );
          })}

          <div className="p-4 bg-[#12151C] border border-[#242936] rounded-xl space-y-2 mt-4 text-xs font-mono text-slate-400">
            <div className="text-slate-200 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Free & Local</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              No cloud server subscriptions. All video editing and AI audio processing run entirely on your own PC.
            </p>
          </div>
        </div>

        {/* Content Pane (9 cols) */}
        <div className="lg:col-span-9 bg-[#12151C] border border-[#242936] rounded-xl p-6 text-xs text-slate-300 space-y-6">
          {/* SECTION 1: 3-Minute Setup */}
          {activeSection === 'quickstart' && (
            <div className="space-y-4 leading-relaxed">
              <h3 className="text-sm font-bold text-white border-b border-[#242936] pb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                1. 3-Minute Setup (Start Here)
              </h3>

              <p>
                Follow these three simple steps to start creating vertical clips on any Windows computer:
              </p>

              <div className="space-y-3 pt-1">
                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-xl space-y-1.5">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[11px] flex items-center justify-center font-bold">1</span>
                    <span>Launch SyntaxClipper Once</span>
                  </div>
                  <p className="text-slate-400 pl-7 text-[11px]">
                    Double-click <code className="text-emerald-400 font-mono">start_syntaxclipper.bat</code> in the app folder. A terminal window starts the local background server and automatically opens <code className="text-slate-200 font-mono">http://localhost:3000</code> in your default browser.
                  </p>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-xl space-y-1.5">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[11px] flex items-center justify-center font-bold">2</span>
                    <span>Check Rendering Tools (1-Click Install)</span>
                  </div>
                  <p className="text-slate-400 pl-7 text-[11px]">
                    SyntaxClipper verifies that <code className="text-slate-200 font-mono">ffmpeg</code>, <code className="text-slate-200 font-mono">ffprobe</code>, and <code className="text-slate-200 font-mono">yt-dlp</code> are available. If any are missing, click the <strong className="text-emerald-400">1-Click Auto-Install Missing Tools</strong> button to set them up automatically.
                  </p>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-xl space-y-1.5">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[11px] flex items-center justify-center font-bold">3</span>
                    <span>Connect Publishing OR Select Local Mode</span>
                  </div>
                  <p className="text-slate-400 pl-7 text-[11px]">
                    You can enter a <strong>Zernio</strong> key or connect the <strong>Direct YouTube API</strong> to auto-post. If you don't want to post automatically, select <strong className="text-emerald-400">Local Only Mode</strong>. SyntaxClipper will save all high-definition `.mp4` clips straight to your <code className="text-slate-200 font-mono">exports/local/</code> folder with zero API keys required!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Two Ways to Use */}
          {activeSection === 'modes' && (
            <div className="space-y-4 leading-relaxed">
              <h3 className="text-sm font-bold text-white border-b border-[#242936] pb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                2. Two Ways to Use SyntaxClipper
              </h3>

              <p>
                SyntaxClipper gives you two distinct workflows depending on whether you want full manual artistic control or 100% hands-free automation:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Mode 1: Autopilot */}
                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-xl space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Gamepad2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">Mode 1: Hands-Free Autopilot</h4>
                      <span className="text-[10px] text-emerald-400 font-mono">Set it once and forget it</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Add your favorite streamers (e.g. IShowSpeed, Kai Cenat, CaseOh, BeastBoyShub) or games (GTA 6, Valorant). Autopilot checks streams 24/7, listens for loud speech and chat spikes using Faster-Whisper, cuts viral 9:16 clips, and schedules them on social platforms.
                  </p>
                  <div className="bg-[#12151C] p-2.5 rounded-lg border border-[#242936] text-[10px] font-mono text-slate-300 space-y-1">
                    <p className="text-emerald-400 font-semibold">✓ Zero FPS Drop Game Mode:</p>
                    <p className="text-slate-400">Rendering pauses automatically when you start any PC game so your gameplay never lags.</p>
                  </div>
                </div>

                {/* Mode 2: Manual Studio */}
                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-xl space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <Crosshair className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">Mode 2: Manual Link Clipper</h4>
                      <span className="text-[10px] text-sky-400 font-mono">Instant control over any video</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Paste any YouTube or Twitch VOD link in the <strong>Manual URL Studio</strong> tab. Click <em>Auto-Find Best Moments</em> to preview the peak action highlights, adjust the webcam crop box, customize caption colors, and render in under 30 seconds.
                  </p>
                  <div className="bg-[#12151C] p-2.5 rounded-lg border border-[#242936] text-[10px] font-mono text-slate-300 space-y-1">
                    <p className="text-sky-400 font-semibold">✓ No Full Download Needed:</p>
                    <p className="text-slate-400">Cuts directly from the stream using timestamp slicing—saving gigabytes of bandwidth and disk space.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: Framing & Layout Modes */}
          {activeSection === 'layouts' && (
            <div className="space-y-4 leading-relaxed">
              <h3 className="text-sm font-bold text-white border-b border-[#242936] pb-2 flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                3. Framing & Layout Modes (Webcam vs Full-Screen)
              </h3>

              <p>
                SyntaxClipper supports 3 clear framing modes to fit any stream format:
              </p>

              <div className="space-y-3 pt-1">
                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      <Split className="w-4 h-4 text-emerald-400" />
                      <span>Webcam + Gameplay Split (42% / 58%)</span>
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Recommended for Streamers</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    The classic viral format used on TikTok and Shorts. Places the streamer's facecam in the top 42% of the vertical frame and the gameplay in the bottom 58%. The hook card is placed cleanly at the split line, and animated subtitles pop dynamically below.
                  </p>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      <Maximize className="w-4 h-4 text-purple-400" />
                      <span>Full-Screen Gameplay (No Webcam)</span>
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">Best for VTubers & Esports</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Perfect for gaming streams without a facecam, cinematic gameplay, or esports matches. Crops a clean 1080x1920 center slice of the action with the hook banner at the top and subtitles safely positioned in the lower third so they never cover UI buttons.
                  </p>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-sky-400" />
                      <span>Auto-Detect Webcam</span>
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">Automatic AI Switch</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Uses OpenCV computer vision to inspect video corners. If a streamer camera is detected, it automatically switches to <em>Webcam + Gameplay Split</em>; if no camera exists, it automatically falls back to <em>Full-Screen Gameplay</em>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: Publishing Providers */}
          {activeSection === 'providers' && (
            <div className="space-y-4 leading-relaxed">
              <h3 className="text-sm font-bold text-white border-b border-[#242936] pb-2 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                4. Publishing Setup & Providers
              </h3>

              <div className="space-y-3">
                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-xl space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span>Zernio or WoopSocial API (1 Key for All Platforms)</span>
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    Allows you to post to YouTube Shorts, TikTok, Instagram Reels, and Facebook Reels using a single API key. Connect your social channels in Zernio or WoopSocial, paste your API key in SyntaxClipper, and clips will be scheduled automatically according to your daily limits.
                  </p>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-xl space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-rose-500" />
                    <span>Direct YouTube Data API v3 (100 Free Uploads/Day)</span>
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    Connects directly to your Google YouTube account via official OAuth. You get Google's 10,000 units/day quota completely free (equivalent to ~100 video uploads/day).
                  </p>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-xl space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-amber-400" />
                    <span>Local Only Mode (Zero Keys Needed)</span>
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    Prefer to review or post clips manually? Choose Local Mode. SyntaxClipper will save ready-to-post `.mp4` video files and `.txt` caption files with formatted titles and viral hashtags directly inside your <code className="text-slate-200 font-mono">exports/local/</code> folder.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: FAQ */}
          {activeSection === 'faq' && (
            <div className="space-y-4 leading-relaxed">
              <h3 className="text-sm font-bold text-white border-b border-[#242936] pb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                5. Common Questions (FAQ)
              </h3>

              <div className="space-y-3">
                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-white text-xs">Can I close the browser and turn off my PC?</h4>
                  <p className="text-slate-400 text-[11px]">
                    <strong>Yes, you can close your browser tab at any time!</strong> The backend runs in the background. However, for Autopilot to detect live streams and render clips locally, your PC must remain powered on. If your PC goes to sleep or is turned off, Windows Task Scheduler automatically catches up on missing clips as soon as you boot up.
                  </p>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-white text-xs">What if my stream or video has no facecam?</h4>
                  <p className="text-slate-400 text-[11px]">
                    Simply select <strong>Full-Screen Gameplay (No Webcam)</strong> mode! SyntaxClipper will crop the center 9:16 gameplay smoothly, place the headline banner at the top, and put dynamic captions in the lower third so your gameplay remains front and center.
                  </p>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-white text-xs">Why does YouTube have a daily limit?</h4>
                  <p className="text-slate-400 text-[11px]">
                    Social algorithms flag accounts that upload dozens of videos in a few minutes as spam. SyntaxClipper defaults to a safe <strong>10 clips/day</strong> cap per channel and spaces them 2–4 hours apart. This protects your channel's organic algorithmic reach.
                  </p>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-white text-xs">How do I update SyntaxClipper to the newest version?</h4>
                  <p className="text-slate-400 text-[11px]">
                    Click <strong>Check for Updates</strong> in the bottom-left sidebar. When a new update is released, click <strong>Upgrade & Restart Now</strong>. SyntaxClipper automatically backs up your settings, downloads the latest code, and restarts safely.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: Credits & Support */}
          {activeSection === 'support' && (
            <div className="space-y-4 leading-relaxed">
              <h3 className="text-sm font-bold text-white border-b border-[#242936] pb-2 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />
                6. Credits & Support Syntax Nepal
              </h3>

              <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-xl space-y-2">
                <h4 className="font-semibold text-white text-xs">Built by Syntax Nepal</h4>
                <p className="text-slate-400 text-[11px]">
                  SyntaxClipper is crafted using Python FastAPI, Next.js 14, Tailwind CSS, yt-dlp, FFmpeg, OpenCV, Faster-Whisper, and YouTube Data API v3. Designed and branded exclusively as <strong>SyntaxClipper by Syntax Nepal</strong>.
                </p>
              </div>

              {/* Support Callout */}
              <div className="bg-[#161922] border border-[#262B38] p-5 rounded-xl space-y-3">
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-rose-400 fill-rose-500/30" />
                  <h4 className="font-semibold text-white text-xs">Support Free Development</h4>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  SyntaxClipper is 100% free and open, with zero cloud subscription fees. If this tool saves you time, helps grow your channel, or simplifies your workflow, please consider leaving a tip to support future updates!
                </p>
                <div className="pt-2">
                  <a
                    href="https://kamaucha.me/sozan"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 hover:text-white transition-all text-xs font-semibold"
                  >
                    <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                    <span>Support Syntax Nepal</span>
                    <ExternalLink className="w-3 h-3 ml-1 text-slate-400" />
                  </a>
                  <p className="mt-2 text-[10px] text-slate-500 font-mono">
                    Accepts eSewa, Khalti, Fonepay, and international cards via https://kamaucha.me/sozan.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
