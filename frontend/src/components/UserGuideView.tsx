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
  Heart
} from 'lucide-react';

export default function UserGuideView() {
  const [activeSection, setActiveSection] = useState<string>('quickstart');

  const sections = [
    { id: 'quickstart', title: '1. Quick Start (3 Minutes)', icon: Zap },
    { id: 'providers', title: '2. Multi-Provider & Hybrid Setup', icon: KeyRound },
    { id: 'manualstudio', title: '3. Manual URL Studio & Crop', icon: Crosshair },
    { id: 'layouts', title: '4. 3-Way Facecam & Layouts', icon: Video },
    { id: 'destination', title: '5. Multi-Platform & Local Exports', icon: HardDrive },
    { id: 'autopilot', title: '6. Autopilot & Game Mode', icon: Gamepad2 },
    { id: 'limits', title: '7. Platform Limits & Cleanup', icon: Shield },
    { id: 'credits', title: '8. Credits & Support Syntax Nepal', icon: Heart },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="bg-[#12151C] border border-[#242936] rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            SyntaxClipper Official User Manual
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete guide for multi-provider multi-platform publishing (YouTube Shorts, TikTok, Instagram Reels), 3-way facecam, and silent autopilot.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#191D26] text-emerald-400 border border-[#242936]">
            SyntaxClipper v1.1 • by Syntax Nepal
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
                    ? 'bg-[#191D26] text-emerald-400 border border-emerald-500/30'
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
              <span>Zero Cloud Hosting</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              SyntaxClipper runs 100% locally on your computer with zero monthly server costs.
            </p>
          </div>
        </div>

        {/* Content Pane (9 cols) */}
        <div className="lg:col-span-9 bg-[#12151C] border border-[#242936] rounded-xl p-6 text-xs text-slate-300 space-y-6">
          {/* SECTION 1: Quick Start */}
          {activeSection === 'quickstart' && (
            <div className="space-y-4 leading-relaxed">
              <h3 className="text-sm font-bold text-white border-b border-[#242936] pb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                1. Quick Start (3-Minute Setup)
              </h3>

              <p>
                SyntaxClipper operates completely on your local workstation without requiring expensive cloud rendering servers, supporting both automated multi-platform publishing and offline local rendering.
              </p>

              <div className="space-y-3 pt-2">
                <div className="bg-[#0B0D11] border border-[#242936] p-3.5 rounded-lg space-y-1.5">
                  <div className="font-semibold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[11px] flex items-center justify-center font-bold">1</span>
                    <span>Launch the Application</span>
                  </div>
                  <p className="text-slate-400 pl-7 text-[11px]">
                    Double-click <code className="text-emerald-400 font-mono">start_syntaxclipper.bat</code> (or <code className="text-emerald-400 font-mono">start_syntaxclipper.vbs</code> for completely silent background launch). Your browser will open to <code className="text-slate-200 font-mono">http://localhost:3000</code>.
                  </p>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-3.5 rounded-lg space-y-1.5">
                  <div className="font-semibold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[11px] flex items-center justify-center font-bold">2</span>
                    <span>Dependencies Auto-Check</span>
                  </div>
                  <p className="text-slate-400 pl-7 text-[11px]">
                    The First-Run Setup Wizard automatically verifies that <code className="text-slate-200 font-mono">ffmpeg</code>, <code className="text-slate-200 font-mono">ffprobe</code>, <code className="text-slate-200 font-mono">yt-dlp</code>, and Python packages (<code className="text-slate-200 font-mono">faster-whisper</code>, <code className="text-slate-200 font-mono">cv2</code>, <code className="text-slate-200 font-mono">psutil</code>, <code className="text-slate-200 font-mono">google-auth-oauthlib</code>) are installed with green checkmarks.
                  </p>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-3.5 rounded-lg space-y-1.5">
                  <div className="font-semibold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[11px] flex items-center justify-center font-bold">3</span>
                    <span>Select Publishing Providers (Hybrid, Zernio, Direct YouTube, or Local)</span>
                  </div>
                  <p className="text-slate-400 pl-7 text-[11px]">
                    Configure your publishing targets or skip directly to local export mode. You can combine <strong>Direct YouTube Data API v3</strong> for up to 100 free YouTube uploads/day with <strong>Zernio or WoopSocial</strong> for TikTok, Instagram Reels, and Facebook Reels.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Multi-Provider & Hybrid Setup */}
          {activeSection === 'providers' && (
            <div className="space-y-4 leading-relaxed">
              <h3 className="text-sm font-bold text-white border-b border-[#242936] pb-2 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                2. Multi-Provider & Hybrid Mode Architecture
              </h3>

              <div className="space-y-3">
                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-lg space-y-2">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-semibold text-slate-200">Provider A — Unified Multi-Platform API (Zernio / WoopSocial)</h4>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Ideal for 1-key multi-platform posting:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px]">
                    <li><strong className="text-slate-200">Zernio API:</strong> Publishes across YouTube Shorts, TikTok (up to 15 posts/day free), Instagram Reels, Facebook Reels, and X with a single API token.</li>
                    <li><strong className="text-slate-200">WoopSocial API:</strong> Enterprise social scheduler with an auto-enforced 4/day YouTube safety cap and 10/day TikTok cap.</li>
                  </ul>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-lg space-y-2">
                  <div className="flex items-center space-x-2">
                    <Youtube className="w-4 h-4 text-rose-500" />
                    <h4 className="font-semibold text-slate-200">Provider B — Direct YouTube Data API v3 (Up to 100 Uploads/Day Free)</h4>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Bypasses all third-party social networks and talks directly to Google's YouTube Data API v3.
                  </p>
                  <div className="bg-[#12151C] p-3 rounded border border-[#242936] text-[11px] font-mono space-y-1 text-slate-300">
                    <p>1. Open Google Cloud Console (<code className="text-emerald-400">console.cloud.google.com</code>) and create a project.</p>
                    <p>2. Enable <strong>YouTube Data API v3</strong> under APIs & Services.</p>
                    <p>3. Create OAuth Client ID (Desktop App), download <code className="text-slate-200">client_secret.json</code> and paste in SyntaxClipper.</p>
                    <p>4. Click <strong>Authorize YouTube Channel in Browser</strong>. Credentials save to local <code className="text-emerald-400">youtube_token.json</code>.</p>
                  </div>
                  <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono">
                    <strong>Notice:</strong> Personal unverified Google Cloud projects upload videos as Private until audited. You can change visibility to Public in YouTube Studio with 1 click, or combine with Zernio for instant Public uploads.
                  </div>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-lg space-y-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-semibold text-slate-200">Hybrid Mode (Recommended)</h4>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    SyntaxClipper can automatically route YouTube Shorts through Direct YouTube Data API v3 (preserving 100 free uploads/day) while routing TikTok, Instagram Reels, and Facebook Reels through Zernio or WoopSocial!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: Manual URL Studio */}
          {activeSection === 'manualstudio' && (
            <div className="space-y-4 leading-relaxed">
              <h3 className="text-sm font-bold text-white border-b border-[#242936] pb-2 flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-emerald-400" />
                3. Interactive Manual URL Studio & Visual Crop Editor
              </h3>

              <div className="space-y-3">
                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-200">Instant Video Inspection & AI Highlights</h4>
                  <p className="text-slate-400 text-[11px]">
                    Paste any YouTube or Twitch URL. Click <strong>Inspect Video</strong> to resolve metadata in ~2 seconds. Click <strong>Auto-Find Best Moments</strong> to scan duration milestones and suggest 3–5 high-energy highlights.
                  </p>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-200">Interactive Webcam Bounding Box</h4>
                  <p className="text-slate-400 text-[11px]">
                    When using <em>Facecam Split 42/58</em>, toggle <strong>Custom Webcam Bounding Box</strong> to reveal interactive sliders (X, Y, Width, Height). An interactive overlay box shows your crop on top of the preview image in real time!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: 3-Way Facecam Layouts */}
          {activeSection === 'layouts' && (
            <div className="space-y-4 leading-relaxed">
              <h3 className="text-sm font-bold text-white border-b border-[#242936] pb-2 flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                4. 3-Way Facecam Modes & Broadcast Typography
              </h3>

              <div className="space-y-3">
                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-200">1. No-Facecam Full-Screen (Center Crop 9:16)</h4>
                  <p className="text-slate-400 text-[11px]">
                    Center 1080x1920 crop of gameplay with hook card at top (<code className="text-emerald-400 font-mono">y=150</code>) and synced subtitles at lower third (<code className="text-emerald-400 font-mono">y=1380</code>).
                  </p>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-200">2. Facecam Split (42% Top / 58% Bottom)</h4>
                  <p className="text-slate-400 text-[11px]">
                    Webcam top box (1080x810) and gameplay bottom (1080x1110) with hook card at split line (<code className="text-emerald-400 font-mono">y=95</code>) and subtitles at <code className="text-emerald-400 font-mono">y=810</code>.
                  </p>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-200">3. Auto-Detect</h4>
                  <p className="text-slate-400 text-[11px]">
                    Uses OpenCV static corner variance to automatically detect webcams; falls back to No-Facecam 9:16 if absent.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: Multi-Platform & Local Exports */}
          {activeSection === 'destination' && (
            <div className="space-y-4 leading-relaxed">
              <h3 className="text-sm font-bold text-white border-b border-[#242936] pb-2 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                5. Multi-Platform Publishing & Local Video Exports
              </h3>

              <div className="space-y-3">
                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-200">Multi-Platform Checkboxes</h4>
                  <p className="text-slate-400 text-[11px]">
                    Select any combination of YouTube Shorts, TikTok, Instagram Reels, Facebook Reels, and Local Folder. SyntaxClipper formats platform-specific metadata (<code className="text-emerald-400 font-mono">#Shorts</code> enforcement for YouTube, viral hashtags for TikTok) automatically.
                  </p>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-200">Local Video Exports Tab</h4>
                  <p className="text-slate-400 text-[11px]">
                    Browse all locally rendered clips in <code className="text-emerald-400 font-mono">exports/local/</code>, preview them in an embedded 9:16 player, copy ready-to-paste metadata in 1 click, or open directly in Windows Explorer.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: Autopilot & Game Mode */}
          {activeSection === 'autopilot' && (
            <div className="space-y-4 leading-relaxed">
              <h3 className="text-sm font-bold text-white border-b border-[#242936] pb-2 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-emerald-400" />
                6. Autopilot, Laptop-Off Scheduling & Game-Mode Protection
              </h3>

              <div className="space-y-3">
                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-200">Laptop-Off Cloud Scheduling</h4>
                  <p className="text-slate-400 text-[11px]">
                    Scheduled posts sit on enterprise cloud servers. Posts continue publishing to YouTube Shorts and TikTok on exact schedule even when your computer is asleep or powered off.
                  </p>
                </div>

                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-200">Zero FPS Drop Game-Mode Protection</h4>
                  <p className="text-slate-400 text-[11px]">
                    Monitors running processes for games (<code className="text-slate-200 font-mono">GTA6.exe, cs2.exe, VALORANT-Win64-Shipping.exe, javaw.exe, FortniteClient-Win64-Shipping.exe</code>, etc.) and fullscreen windows. Whenever a game is detected, downloads and rendering pause immediately.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: Platform Limits */}
          {activeSection === 'limits' && (
            <div className="space-y-4 leading-relaxed">
              <h3 className="text-sm font-bold text-white border-b border-[#242936] pb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                7. Platform Limits & Disk Cleanup
              </h3>

              <div className="space-y-3">
                <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-200">Platform Quotas</h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px]">
                    <li><strong className="text-slate-200">Direct YouTube Data API v3:</strong> 10,000 units/day quota = up to 100 video uploads/day free.</li>
                    <li><strong className="text-slate-200">WoopSocial YouTube Cap:</strong> 5 posts/day per org (SyntaxClipper defaults to 4/day).</li>
                    <li><strong className="text-slate-200">TikTok:</strong> Up to 10-15 posts/day spaced 2 hours apart.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 8: Credits & Support */}
          {activeSection === 'credits' && (
            <div className="space-y-4 leading-relaxed">
              <h3 className="text-sm font-bold text-white border-b border-[#242936] pb-2 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />
                8. Credits & Support Syntax Nepal
              </h3>

              <div className="bg-[#0B0D11] border border-[#242936] p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-slate-200 text-xs">Architectural Credits</h4>
                <p className="text-slate-400 text-[11px]">
                  Built with Python FastAPI, Next.js 14, Tailwind CSS, Lucide Icons, yt-dlp, FFmpeg, OpenCV, Faster-Whisper, and Google Data API v3. Designed and branded exclusively as <strong>SyntaxClipper by Syntax Nepal</strong>.
                </p>
              </div>

              {/* Support Syntax Nepal Callout */}
              <div className="bg-[#161922] border border-[#262B38] p-4 rounded-lg space-y-3">
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-rose-400 fill-rose-500/30" />
                  <h4 className="font-semibold text-white text-xs">Support Free Development</h4>
                </div>
                <p className="text-slate-400 text-[11px]">
                  SyntaxClipper is 100% free and open, requiring zero cloud hosting fees. If you enjoy using this tool and want to support ongoing updates, features, and fixes, consider leaving a small tip!
                </p>
                <div className="pt-1">
                  <a
                    href="https://kamaucha.me/sozan"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 hover:text-white transition-all text-xs font-medium"
                  >
                    <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                    <span>Support Syntax Nepal</span>
                    <ExternalLink className="w-3 h-3 ml-1 text-slate-400" />
                  </a>
                  <p className="mt-1.5 text-[10px] text-slate-500 font-mono">
                    Accepts eSewa, Khalti, Fonepay, and international cards via kamaucha.me/sozan.
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
