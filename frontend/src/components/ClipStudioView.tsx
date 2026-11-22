'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
  Palette,
  Calendar,
  Send,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Video,
  Clock,
  Volume2,
  Sliders,
  Share2
} from 'lucide-react';
import {
  getReadyClips,
  manualGenerateClip,
  getJobStatus,
  scheduleClipDirect,
  deleteReadyClip,
  getConfig
} from '@/lib/api';

export default function ClipStudioView() {
  const [clips, setClips] = useState<any[]>([]);
  const [selectedClip, setSelectedClip] = useState<any>(null);
  const [loadingClips, setLoadingClips] = useState<boolean>(true);

  // Manual clipper inputs
  const [inputUrl, setInputUrl] = useState<string>('');
  const [streamerName, setStreamerName] = useState<string>('Streamer');
  const [hookText, setHookText] = useState<string>('INSANE MOMENT');
  const [startSec, setStartSec] = useState<number>(0);
  const [clipLen, setClipLen] = useState<number>(25);
  const [layoutMode, setLayoutMode] = useState<string>('split'); // 'split' | 'fullscreen'
  const [hookStyle, setHookStyle] = useState<string>('transparent'); // 'transparent' | 'card'
  const [captionColor, setCaptionColor] = useState<string>('yellow');

  // Active Job tracking
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);

  // Inspector edits
  const [editTitle, setEditTitle] = useState<string>('');
  const [editYtDesc, setEditYtDesc] = useState<string>('');
  const [editTiktokCaption, setEditTiktokCaption] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('');
  const [scheduling, setScheduling] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  // Video player
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    loadClips();
  }, []);

  useEffect(() => {
    if (selectedClip) {
      setEditTitle(selectedClip.title || 'Viral Gaming Moment');
      const baseDesc = `${selectedClip.title || 'Viral Gaming Moment'}\n\nCreator: ${selectedClip.creator || 'Streamer'}\n#Shorts`;
      setEditYtDesc(baseDesc);
      setEditTiktokCaption(
        `${selectedClip.title || 'Viral Gaming Moment'} 🔥 #gaming #gta6 #shorts #viral`
      );
      setLayoutMode(selectedClip.layout_mode || 'split');
      setHookStyle(selectedClip.hook_style || 'transparent');
      setCaptionColor(selectedClip.caption_color || 'yellow');
    }
  }, [selectedClip]);

  // Poll active job
  useEffect(() => {
    if (!activeJobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await getJobStatus(activeJobId);
        setJobStatus(res);
        if (res.status === 'COMPLETED') {
          setActiveJobId(null);
          await loadClips();
        } else if (res.status === 'FAILED') {
          setActiveJobId(null);
        }
      } catch (e) {
        console.error(e);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [activeJobId]);

  const loadClips = async () => {
    setLoadingClips(true);
    try {
      const res = await getReadyClips();
      setClips(res.clips || []);
      if (res.clips?.length > 0 && !selectedClip) {
        setSelectedClip(res.clips[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClips(false);
    }
  };

  const handleStartManualClip = async () => {
    if (!inputUrl.trim()) return;
    setActionError('');
    setActionSuccess('');
    try {
      const res = await manualGenerateClip({
        url: inputUrl.trim(),
        streamer_name: streamerName,
        hook_text: hookText,
        start_sec: Number(startSec),
        clip_len: Number(clipLen),
        layout_mode: layoutMode,
        hook_style: hookStyle,
        caption_color: captionColor,
      });
      setActiveJobId(res.job_id);
      setJobStatus({ status: 'QUEUED', progress_log: 'Initializing clipping engine...' });
    } catch (e: any) {
      setActionError(e.message || 'Failed to start clip generation');
    }
  };

  const handleScheduleDirect = async (publishImmediately: boolean) => {
    if (!selectedClip) return;
    setScheduling(true);
    setActionError('');
    setActionSuccess('');

    try {
      const scheduledIso = publishImmediately
        ? null
        : scheduleTime
        ? new Date(scheduleTime).toISOString()
        : new Date(Date.now() + 2 * 3600 * 1000).toISOString();

      await scheduleClipDirect({
        clip_name: selectedClip.clip_name,
        title: editTitle,
        yt_description: editYtDesc,
        tiktok_caption: editTiktokCaption,
        scheduled_for_iso: scheduledIso,
      });

      setActionSuccess(
        publishImmediately
          ? 'Clip published to WoopSocial immediately!'
          : `Clip scheduled successfully for ${new Date(scheduledIso!).toLocaleString()}`
      );
      await loadClips();
    } catch (e: any) {
      setActionError(e.message || 'Scheduling failed');
    } finally {
      setScheduling(false);
    }
  };

  const handleDeleteClip = async (clipName: string) => {
    if (!confirm(`Delete clip ${clipName}?`)) return;
    try {
      await deleteReadyClip(clipName);
      if (selectedClip?.clip_name === clipName) {
        setSelectedClip(null);
      }
      await loadClips();
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Clipper Action Bar */}
      <div className="bg-[#161922] border border-[#262B38] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Video className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Manual VOD Clipper & Batch Generator</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Supports YouTube & Twitch Streams
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Paste YouTube / Twitch VOD link (e.g. https://www.youtube.com/watch?v=...)"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="w-full px-3 py-2 bg-[#0E1015] border border-[#262B38] rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Hook Text (e.g. WORST POSSIBLE LANDING)"
              value={hookText}
              onChange={(e) => setHookText(e.target.value)}
              className="w-full px-3 py-2 bg-[#0E1015] border border-[#262B38] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <button
              onClick={handleStartManualClip}
              disabled={Boolean(activeJobId) || !inputUrl.trim()}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{activeJobId ? 'Processing...' : 'Generate 9:16 Clip'}</span>
            </button>
          </div>
        </div>

        {/* Live Clipping Status Banner */}
        {activeJobId && jobStatus && (
          <div className="p-3 bg-[#0E1015] border border-emerald-500/40 rounded-lg flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
              <span className="text-slate-200">{jobStatus.progress_log}</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold">
              {jobStatus.status}
            </span>
          </div>
        )}
      </div>

      {/* Main Studio Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Ready Clips Queue list (3 cols) */}
        <div className="lg:col-span-3 bg-[#161922] border border-[#262B38] rounded-xl p-4 flex flex-col h-[700px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#262B38] mb-3">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              Ready Clips ({clips.length})
            </span>
            <button
              onClick={loadClips}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1E222D]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingClips ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {clips.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No rendered clips in queue/ready.<br />Generate one above or toggle Autopilot.
              </div>
            ) : (
              clips.map((clip) => {
                const isSelected = selectedClip?.clip_name === clip.clip_name;
                return (
                  <div
                    key={clip.clip_name}
                    onClick={() => setSelectedClip(clip)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#1E222D] border-emerald-500/50'
                        : 'bg-[#0E1015] border-[#262B38] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-medium text-slate-200">
                      <span className="truncate pr-2">{clip.title || clip.clip_name}</span>
                      <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                        {clip.file_size_mb} MB
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>{clip.duration ? `${clip.duration}s` : '25s'}</span>
                      <span className="capitalize">{clip.layout_mode || 'split'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center: 9:16 Video Player (5 cols) */}
        <div className="lg:col-span-5 bg-[#161922] border border-[#262B38] rounded-xl p-4 flex flex-col items-center justify-center">
          {selectedClip ? (
            <div className="w-full flex flex-col items-center space-y-4">
              {/* 9:16 Aspect Box */}
              <div className="relative w-[315px] h-[560px] bg-black rounded-lg border border-[#262B38] overflow-hidden shadow-2xl flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={`/api/clips/preview/${selectedClip.clip_name}`}
                  className="w-full h-full object-cover"
                  onTimeUpdate={() => {
                    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) setDuration(videoRef.current.duration);
                  }}
                  onEnded={() => setIsPlaying(false)}
                />

                {/* Overlay Play/Pause Button on Hover */}
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-950/80 border border-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </div>
                </button>
              </div>

              {/* Scrubber & Controls */}
              <div className="w-full max-w-[315px] space-y-1.5">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => {
                    const t = Number(e.target.value);
                    setCurrentTime(t);
                    if (videoRef.current) videoRef.current.currentTime = t;
                  }}
                  className="w-full h-1 bg-[#262B38] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>{currentTime.toFixed(1)}s</span>
                  <span>{duration.toFixed(1)}s</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 text-xs py-32">
              Select or generate a clip to inspect in the pro player.
            </div>
          )}
        </div>

        {/* Right: Pro Clip Inspector & Scheduling Panel (4 cols) */}
        <div className="lg:col-span-4 bg-[#161922] border border-[#262B38] rounded-xl p-5 space-y-5 h-[700px] overflow-y-auto">
          {selectedClip ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#262B38]">
                <h3 className="text-sm font-semibold text-white">Pro Clip Inspector</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Verified
                </span>
              </div>

              {/* Feedback messages */}
              {actionSuccess && (
                <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}
              {actionError && (
                <div className="p-2.5 rounded bg-red-950/40 border border-red-800/50 text-red-300 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Quality Gate Metrics */}
              <div className="bg-[#0E1015] border border-[#262B38] rounded-lg p-3 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Quality Gate Metrics
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-[#161922] p-2 rounded border border-[#262B38]">
                    <div className="text-[10px] text-slate-500">File Size</div>
                    <div className="text-emerald-400 font-medium">{selectedClip.file_size_mb} MB</div>
                  </div>
                  <div className="bg-[#161922] p-2 rounded border border-[#262B38]">
                    <div className="text-[10px] text-slate-500">Duration</div>
                    <div className="text-emerald-400 font-medium">{selectedClip.duration}s</div>
                  </div>
                  <div className="bg-[#161922] p-2 rounded border border-[#262B38]">
                    <div className="text-[10px] text-slate-500">Black Frames</div>
                    <div className="text-emerald-400 font-medium">
                      {selectedClip.quality_gate?.metrics?.black_ratio ?? 0}%
                    </div>
                  </div>
                  <div className="bg-[#161922] p-2 rounded border border-[#262B38]">
                    <div className="text-[10px] text-slate-500">Mean Audio</div>
                    <div className="text-emerald-400 font-medium">
                      {selectedClip.quality_gate?.metrics?.mean_volume_db ?? -14} dB
                    </div>
                  </div>
                </div>
              </div>

              {/* Tweaks: Layout & Hook Card Style */}
              <div className="space-y-3">
                <span className="text-xs font-mono text-slate-300 font-medium">Layout & Styling</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setLayoutMode('split')}
                    className={`py-1.5 px-2 rounded text-xs font-mono border transition-colors ${
                      layoutMode === 'split'
                        ? 'bg-[#1E222D] border-emerald-500 text-emerald-400'
                        : 'bg-[#0E1015] border-[#262B38] text-slate-400'
                    }`}
                  >
                    42/58 Facecam Split
                  </button>
                  <button
                    onClick={() => setLayoutMode('fullscreen')}
                    className={`py-1.5 px-2 rounded text-xs font-mono border transition-colors ${
                      layoutMode === 'fullscreen'
                        ? 'bg-[#1E222D] border-emerald-500 text-emerald-400'
                        : 'bg-[#0E1015] border-[#262B38] text-slate-400'
                    }`}
                  >
                    Full-Screen 9:16
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setHookStyle('transparent')}
                    className={`py-1.5 px-2 rounded text-xs font-mono border transition-colors ${
                      hookStyle === 'transparent'
                        ? 'bg-[#1E222D] border-emerald-500 text-emerald-400'
                        : 'bg-[#0E1015] border-[#262B38] text-slate-400'
                    }`}
                  >
                    Transparent Title
                  </button>
                  <button
                    onClick={() => setHookStyle('card')}
                    className={`py-1.5 px-2 rounded text-xs font-mono border transition-colors ${
                      hookStyle === 'card'
                        ? 'bg-[#1E222D] border-emerald-500 text-emerald-400'
                        : 'bg-[#0E1015] border-[#262B38] text-slate-400'
                    }`}
                  >
                    White Streamer Card
                  </button>
                </div>

                {/* Caption Highlight Color */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-400">Caption Highlight Accent</label>
                  <div className="flex space-x-2">
                    {[
                      { key: 'yellow', color: '#FFFF00' },
                      { key: 'green', color: '#00FF66' },
                      { key: 'cyan', color: '#00FFFF' },
                      { key: 'pink', color: '#FF007F' },
                      { key: 'white', color: '#FFFFFF' },
                    ].map((c) => (
                      <button
                        key={c.key}
                        onClick={() => setCaptionColor(c.key)}
                        style={{ backgroundColor: c.color }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          captionColor === c.key ? 'scale-125 border-white' : 'border-black/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* YouTube Shorts Title & Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 flex justify-between">
                  <span>YouTube Shorts Title</span>
                  <span className="text-[10px] text-emerald-400">#Shorts Enforced</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0E1015] border border-[#262B38] rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* TikTok Caption */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300">TikTok Caption & Hashtags</label>
                <textarea
                  rows={2}
                  value={editTiktokCaption}
                  onChange={(e) => setEditTiktokCaption(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0E1015] border border-[#262B38] rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono resize-none"
                />
              </div>

              {/* Schedule time input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Schedule For (Optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0E1015] border border-[#262B38] rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-[#262B38]">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleScheduleDirect(false)}
                    disabled={scheduling}
                    className="py-2 px-3 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Schedule to WoopSocial</span>
                  </button>
                  <button
                    onClick={() => handleScheduleDirect(true)}
                    disabled={scheduling}
                    className="py-2 px-3 rounded bg-[#1E222D] hover:bg-[#252B3B] border border-emerald-500/40 text-emerald-400 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish Now</span>
                  </button>
                </div>

                <div className="flex space-x-2">
                  <a
                    href={`/api/clips/preview/${selectedClip.clip_name}`}
                    download={selectedClip.clip_name}
                    className="flex-1 py-1.5 rounded bg-[#0E1015] border border-[#262B38] text-slate-300 hover:text-white text-xs font-mono flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={() => handleDeleteClip(selectedClip.clip_name)}
                    className="p-2 rounded bg-red-950/20 border border-red-900/40 text-red-400 hover:bg-red-900/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 text-xs">
              Select a clip to tweak styling and schedule.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
