'use client';

import React, { useState, useEffect } from 'react';
import {
  Video,
  Sparkles,
  Sliders,
  Play,
  Clock,
  Layers,
  Palette,
  HardDrive,
  Share2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Crosshair,
  Maximize,
  Split,
  Eye,
  FileCheck,
  Check,
  Youtube,
  Globe
} from 'lucide-react';
import {
  inspectVideoUrl,
  previewVideoFrame,
  findBestMoments,
  manualGenerateClip,
  getJobStatus,
  publishMultiPlatform,
  getConfig,
  getAutopilotQuotas
} from '@/lib/api';

interface HighlightMoment {
  start_sec: number;
  end_sec: number;
  duration_sec: number;
  label: string;
  hook_suggestion: string;
}

export default function ManualStudioView() {
  // URL & Inspection state
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [inspecting, setInspecting] = useState<boolean>(false);
  const [videoMeta, setVideoMeta] = useState<any>(null);
  const [inspectError, setInspectError] = useState<string>('');

  // Timestamps & Moments
  const [startSec, setStartSec] = useState<number>(0);
  const [clipLen, setClipLen] = useState<number>(25);
  const [findingMoments, setFindingMoments] = useState<boolean>(false);
  const [suggestedMoments, setSuggestedMoments] = useState<HighlightMoment[]>([]);

  // Preview Frame & Crop
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [camX, setCamX] = useState<number>(65); // percentage from left
  const [camY, setCamY] = useState<number>(5);  // percentage from top
  const [camW, setCamW] = useState<number>(30); // percentage width
  const [camH, setCamH] = useState<number>(40); // percentage height
  const [enableCustomCrop, setEnableCustomCrop] = useState<boolean>(false);

  // Creative & Layout Settings
  const [streamerName, setStreamerName] = useState<string>('Live Streamer');
  const [hookText, setHookText] = useState<string>('INSANE MOMENT');
  const [layoutMode, setLayoutMode] = useState<string>('fullscreen'); // 'fullscreen' | 'split' | 'auto'
  const [hookStyle, setHookStyle] = useState<string>('transparent'); // 'transparent' | 'card'
  const [captionColor, setCaptionColor] = useState<string>('yellow');

  // Destination & Multi-Platform Publishing
  const [destinationMode, setDestinationMode] = useState<string>('multi_publish'); // 'local_only' | 'multi_publish'
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['youtube', 'tiktok', 'instagram']);
  const [ytDescription, setYtDescription] = useState<string>('');
  const [tiktokCaption, setTiktokCaption] = useState<string>('');
  const [instagramCaption, setInstagramCaption] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('');

  // Quotas & Config
  const [quotas, setQuotas] = useState<any>({ youtube_today: 0, youtube_max: 10, tiktok_today: 0, tiktok_max: 10 });

  // Job execution state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [renderSuccess, setRenderSuccess] = useState<string>('');
  const [renderError, setRenderError] = useState<string>('');

  useEffect(() => {
    loadQuotas();
  }, []);

  const loadQuotas = async () => {
    try {
      const q = await getAutopilotQuotas();
      setQuotas(q || { youtube_today: 0, youtube_max: 10, tiktok_today: 0, tiktok_max: 10 });
    } catch (e) {
      console.error(e);
    }
  };

  // Format seconds to MM:SS or HH:MM:SS
  const formatTime = (secs: number) => {
    const s = Math.floor(secs);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const remSecs = s % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  // Inspect video
  const handleInspect = async () => {
    if (!videoUrl.trim()) return;
    setInspecting(true);
    setInspectError('');
    setVideoMeta(null);
    setSuggestedMoments([]);
    setPreviewImageUrl(null);

    try {
      const res = await inspectVideoUrl(videoUrl.trim());
      if (res.success && res.data) {
        setVideoMeta(res.data);
        if (res.data.uploader) {
          setStreamerName(res.data.uploader);
        }
        if (res.data.title) {
          const words = res.data.title.split(' ').slice(0, 4).join(' ').toUpperCase();
          const cleanHook = words || 'INSANE HIGHLIGHT';
          setHookText(cleanHook);
          setYtDescription(`${cleanHook}\n\nCreator: ${res.data.uploader || 'Streamer'}\n#Shorts`);
          setTiktokCaption(`${cleanHook} 🔥 #gaming #shorts #viral`);
          setInstagramCaption(`${cleanHook} 🔥 #reels #gaming`);
        }
        fetchPreview(videoUrl.trim(), 5);
      } else {
        setInspectError('Could not inspect video metadata. Please check the URL.');
      }
    } catch (e: any) {
      setInspectError(e.message || 'Failed to inspect video');
    } finally {
      setInspecting(false);
    }
  };

  // Fetch Preview Frame
  const fetchPreview = async (url: string, ts: number) => {
    setPreviewLoading(true);
    try {
      const res = await previewVideoFrame(url, ts);
      if (res.success && res.image_url) {
        setPreviewImageUrl(res.image_url);
      }
    } catch (e) {
      console.error('Preview error:', e);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Auto-find moments
  const handleFindMoments = async () => {
    if (!videoMeta || !videoMeta.duration) return;
    setFindingMoments(true);
    try {
      const res = await findBestMoments(videoMeta.duration, videoMeta.title);
      if (res.moments) {
        setSuggestedMoments(res.moments);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setFindingMoments(false);
    }
  };

  // Select a highlight moment
  const applyMoment = (m: HighlightMoment) => {
    setStartSec(m.start_sec);
    setClipLen(m.duration_sec);
    if (m.hook_suggestion) {
      setHookText(m.hook_suggestion);
      setYtDescription(`${m.hook_suggestion}\n\nCreator: ${streamerName}\n#Shorts`);
      setTiktokCaption(`${m.hook_suggestion} 🔥 #gaming #shorts #viral`);
      setInstagramCaption(`${m.hook_suggestion} 🔥 #reels #gaming`);
    }
    fetchPreview(videoUrl, m.start_sec + 2);
  };

  // Start Render Job
  const handleStartRender = async () => {
    if (!videoUrl.trim()) return;
    setRenderError('');
    setRenderSuccess('');

    let customBox: number[] | null = null;
    if (layoutMode === 'split' && enableCustomCrop) {
      const absX = (camX / 100) * 1920;
      const absY = (camY / 100) * 1080;
      const absW = (camW / 100) * 1920;
      const absH = (camH / 100) * 1080;
      customBox = [Math.round(absX), Math.round(absY), Math.round(absW), Math.round(absH)];
    }

    try {
      const res = await manualGenerateClip({
        url: videoUrl.trim(),
        streamer_name: streamerName,
        hook_text: hookText,
        start_sec: Number(startSec),
        clip_len: Number(clipLen),
        layout_mode: layoutMode,
        custom_cam_box: customBox,
        hook_style: hookStyle,
        caption_color: captionColor,
        destination_mode: destinationMode === 'local_only' ? 'local_only' : 'woopsocial'
      });

      if (res.job_id) {
        setActiveJobId(res.job_id);
        setJobStatus({ status: 'QUEUED', progress_log: 'Job queued...' });
      }
    } catch (e: any) {
      setRenderError(e.message || 'Failed to start render');
    }
  };

  // Poll Active Job
  useEffect(() => {
    if (!activeJobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await getJobStatus(activeJobId);
        setJobStatus(res);
        if (res.status === 'COMPLETED') {
          clearInterval(interval);
          setActiveJobId(null);

          // If multi-publish is chosen, publish across selected platforms
          if (destinationMode === 'multi_publish' && res.clip_name) {
            try {
              await publishMultiPlatform({
                clip_name: res.clip_name,
                title: hookText,
                yt_description: ytDescription,
                tiktok_caption: tiktokCaption,
                instagram_caption: instagramCaption,
                target_platforms: selectedPlatforms,
                creator_name: streamerName,
                scheduled_for_iso: scheduleTime || null
              });
              setRenderSuccess(`Clip rendered and successfully dispatched to: ${selectedPlatforms.join(', ')}!`);
            } catch (pubErr: any) {
              setRenderSuccess(`Clip rendered to queue/ready! (Multi-publish notice: ${pubErr.message})`);
            }
          } else {
            setRenderSuccess('Clip successfully rendered and saved to exports/local/ with ready metadata!');
          }
          loadQuotas();
        } else if (res.status === 'FAILED') {
          clearInterval(interval);
          setActiveJobId(null);
          setRenderError(res.error || 'Rendering job failed');
        }
      } catch (e) {
        console.error(e);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [activeJobId, destinationMode, selectedPlatforms, hookText, ytDescription, tiktokCaption, instagramCaption, scheduleTime, streamerName]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0D11] overflow-y-auto">
      {/* Studio Header */}
      <div className="p-6 border-b border-[#242936] bg-[#12151C]/60 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Interactive Manual URL Studio
              </h1>
              <p className="text-xs text-slate-400">
                Paste any YouTube or Twitch VOD link to visually preview, crop facecam, pick moments, and dispatch across all platforms.
              </p>
            </div>
          </div>
        </div>

        {/* Quota Telemetry Badges */}
        <div className="flex items-center space-x-2 bg-[#191D26] px-3.5 py-1.5 rounded-lg border border-[#242936] text-xs font-mono">
          <span className="text-slate-400">YouTube:</span>
          <span className="text-emerald-400 font-bold">{quotas.youtube_today}/{quotas.youtube_max || 10}</span>
          <span className="text-slate-600 mx-1">|</span>
          <span className="text-slate-400">TikTok:</span>
          <span className="text-emerald-400 font-bold">{quotas.tiktok_today}/{quotas.tiktok_max || 10}</span>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Step 1: Video URL Input Bar */}
        <div className="bg-[#12151C] border border-[#242936] rounded-xl p-5 shadow-sm">
          <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-2">
            Target Video or Livestream URL
          </label>
          <div className="flex space-x-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=... or Twitch VOD URL"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInspect()}
                className="w-full bg-[#0B0D11] border border-[#242936] focus:border-emerald-500 rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none font-mono"
              />
            </div>
            <button
              onClick={handleInspect}
              disabled={inspecting || !videoUrl.trim()}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-semibold text-xs transition-colors shadow-sm"
            >
              {inspecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Inspecting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Inspect Video</span>
                </>
              )}
            </button>
          </div>

          {inspectError && (
            <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{inspectError}</span>
            </div>
          )}
        </div>

        {/* Video Inspected Summary Card */}
        {videoMeta && (
          <div className="bg-[#12151C] border border-[#242936] rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              {videoMeta.thumbnail ? (
                <img
                  src={videoMeta.thumbnail}
                  alt={videoMeta.title}
                  className="w-24 h-14 object-cover rounded-md border border-[#242936]"
                />
              ) : (
                <div className="w-24 h-14 bg-[#191D26] rounded-md border border-[#242936] flex items-center justify-center text-slate-600">
                  <Video className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-white line-clamp-1">
                  {videoMeta.title || 'Untitled Stream'}
                </h3>
                <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1 font-mono">
                  <span>Channel: <strong className="text-slate-200">{videoMeta.uploader || 'Creator'}</strong></span>
                  <span>•</span>
                  <span>Duration: <strong className="text-emerald-400">{formatTime(videoMeta.duration || 0)}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Auto-Moments Button */}
            <button
              onClick={handleFindMoments}
              disabled={findingMoments}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-[#191D26] hover:bg-[#202531] border border-[#242936] text-xs font-mono text-slate-200 transition-colors shrink-0"
            >
              {findingMoments ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Scanning Highlights...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Auto-Find Best Moments</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Highlight Moments Picker */}
        {suggestedMoments.length > 0 && (
          <div className="bg-[#12151C] border border-[#242936] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Suggested AI Highlights ({suggestedMoments.length})</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Click any moment to apply timestamps & hook
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {suggestedMoments.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => applyMoment(m)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    startSec === m.start_sec
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                      : 'bg-[#191D26] border-[#242936] hover:border-slate-500 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold font-mono text-emerald-400">
                      {formatTime(m.start_sec)} – {formatTime(m.end_sec)}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0B0D11] text-slate-400 border border-[#242936]">
                      {m.duration_sec}s
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-200 truncate">{m.label}</div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">"{m.hook_suggestion}"</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Visual Studio: Split Editor & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Visual Preview Canvas & Cropping */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-[#12151C] border border-[#242936] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Visual Preview & Framing</span>
                </span>
                <button
                  onClick={() => videoUrl && fetchPreview(videoUrl, startSec)}
                  disabled={previewLoading || !videoUrl}
                  className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white font-mono transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${previewLoading ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>Refresh Frame at {formatTime(startSec)}</span>
                </button>
              </div>

              {/* Frame Container with Overlay Bounding Box */}
              <div className="relative aspect-video bg-[#0B0D11] rounded-lg border border-[#242936] overflow-hidden flex items-center justify-center">
                {previewImageUrl ? (
                  <>
                    <img
                      src={previewImageUrl}
                      alt="Preview Frame"
                      className="w-full h-full object-contain"
                    />

                    {/* Layout Mode Overlays */}
                    {layoutMode === 'split' && enableCustomCrop && (
                      <div
                        style={{
                          left: `${camX}%`,
                          top: `${camY}%`,
                          width: `${camW}%`,
                          height: `${camH}%`,
                        }}
                        className="absolute border-2 border-emerald-400 bg-emerald-500/20 rounded shadow-lg pointer-events-none flex flex-col justify-between p-1"
                      >
                        <span className="text-[10px] font-mono font-bold bg-black/80 text-emerald-300 px-1 rounded w-max">
                          Webcam Crop ({camW}% × {camH}%)
                        </span>
                        <span className="text-[9px] font-mono bg-black/80 text-slate-300 px-1 rounded w-max self-end">
                          ({camX}%, {camY}%)
                        </span>
                      </div>
                    )}

                    {layoutMode === 'fullscreen' && (
                      <div
                        style={{
                          left: '21.1%', // Center 9:16 crop box on 16:9
                          top: '0%',
                          width: '57.8%',
                          height: '100%',
                        }}
                        className="absolute border-2 border-dashed border-sky-400/80 bg-sky-500/10 pointer-events-none flex items-center justify-center"
                      >
                        <span className="text-[11px] font-mono font-bold bg-black/80 text-sky-300 px-2 py-0.5 rounded">
                          Full-Screen 9:16 Center Crop
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <Video className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-mono">
                      {inspecting || previewLoading
                        ? 'Extracting video preview frame...'
                        : 'Inspect a video URL or click Refresh Frame to view snapshot'}
                    </p>
                  </div>
                )}
              </div>

              {/* 3-Way Layout Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider">
                  Layout Framing Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setLayoutMode('fullscreen')}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      layoutMode === 'fullscreen'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-[#191D26] border-[#242936] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Maximize className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-semibold">No-Facecam</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Center 9:16 crop. Card at y=150, subs at y=1380.
                    </div>
                  </button>

                  <button
                    onClick={() => setLayoutMode('split')}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      layoutMode === 'split'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-[#191D26] border-[#242936] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Split className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-semibold">Split 42/58</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Webcam top (42%), gameplay bottom (58%).
                    </div>
                  </button>

                  <button
                    onClick={() => setLayoutMode('auto')}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      layoutMode === 'auto'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-[#191D26] border-[#242936] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-semibold">Auto-Detect</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      OpenCV static corner check. Falls back to 9:16.
                    </div>
                  </button>
                </div>
              </div>

              {/* Custom Crop Coordinates (Split Mode Only) */}
              {layoutMode === 'split' && (
                <div className="p-4 rounded-lg bg-[#191D26] border border-[#242936] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-slate-200 flex items-center space-x-2">
                      <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Custom Webcam Bounding Box</span>
                    </span>
                    <button
                      onClick={() => setEnableCustomCrop(!enableCustomCrop)}
                      className={`text-xs font-mono px-2 py-0.5 rounded border ${
                        enableCustomCrop
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-[#12151C] text-slate-400 border-[#242936]'
                      }`}
                    >
                      {enableCustomCrop ? 'Custom Overrides Enabled' : 'Auto Corner Fallback'}
                    </button>
                  </div>

                  {enableCustomCrop && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 block mb-1">X Offset ({camX}%)</span>
                        <input
                          type="range"
                          min="0"
                          max="80"
                          value={camX}
                          onChange={(e) => setCamX(Number(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1">Y Offset ({camY}%)</span>
                        <input
                          type="range"
                          min="0"
                          max="60"
                          value={camY}
                          onChange={(e) => setCamY(Number(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1">Width ({camW}%)</span>
                        <input
                          type="range"
                          min="15"
                          max="60"
                          value={camW}
                          onChange={(e) => setCamW(Number(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1">Height ({camH}%)</span>
                        <input
                          type="range"
                          min="15"
                          max="60"
                          value={camH}
                          onChange={(e) => setCamH(Number(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Clip Settings & Destination */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-[#12151C] border border-[#242936] rounded-xl p-5 space-y-4">
              <span className="text-xs font-mono font-medium text-slate-300 uppercase tracking-wider block">
                Clip Timing & Creative Styling
              </span>

              {/* Timing Controls */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Start Timestamp (Sec)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={startSec}
                      onChange={(e) => setStartSec(Number(e.target.value))}
                      className="w-full bg-[#0B0D11] border border-[#242936] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-xs font-mono text-slate-400 shrink-0">
                      ({formatTime(startSec)})
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Duration (Sec)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="60"
                    value={clipLen}
                    onChange={(e) => setClipLen(Number(e.target.value))}
                    className="w-full bg-[#0B0D11] border border-[#242936] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Creator Name */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Creator / Streamer Name
                </label>
                <input
                  type="text"
                  value={streamerName}
                  onChange={(e) => setStreamerName(e.target.value)}
                  className="w-full bg-[#0B0D11] border border-[#242936] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Hook Text */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Hook Card Text (Headline)
                </label>
                <input
                  type="text"
                  value={hookText}
                  onChange={(e) => setHookText(e.target.value)}
                  placeholder="e.g. UNREAL 1V4 CLUTCH"
                  className="w-full bg-[#0B0D11] border border-[#242936] rounded-lg px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Hook Style Toggle */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1.5">
                  Hook Card Graphic Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setHookStyle('transparent')}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono transition-colors ${
                      hookStyle === 'transparent'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                        : 'bg-[#191D26] border-[#242936] text-slate-400'
                    }`}
                  >
                    Transparent Outlined
                  </button>
                  <button
                    onClick={() => setHookStyle('card')}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono transition-colors ${
                      hookStyle === 'card'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                        : 'bg-[#191D26] border-[#242936] text-slate-400'
                    }`}
                  >
                    Rounded White Card
                  </button>
                </div>
              </div>

              {/* Subtitle Highlight Color */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1.5">
                  Synced Subtitle Word-Pop Color (-0.15s Synced)
                </label>
                <div className="flex space-x-2">
                  {[
                    { id: 'yellow', label: 'Yellow', hex: '#FACC15' },
                    { id: 'green', label: 'Green', hex: '#10B981' },
                    { id: 'cyan', label: 'Cyan', hex: '#06B6D4' },
                    { id: 'pink', label: 'Pink', hex: '#EC4899' },
                    { id: 'white', label: 'White', hex: '#FFFFFF' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCaptionColor(c.id)}
                      className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg border text-[11px] font-mono transition-colors ${
                        captionColor === c.id
                          ? 'border-emerald-500 bg-[#191D26] text-white'
                          : 'border-[#242936] bg-[#0B0D11] text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Mode Selector */}
              <div className="pt-2 border-t border-[#242936] space-y-3">
                <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider">
                  Output Destination & Platforms
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDestinationMode('multi_publish')}
                    className={`p-3 rounded-lg border text-left transition-colors flex items-start space-x-2.5 ${
                      destinationMode === 'multi_publish'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-[#191D26] border-[#242936] text-slate-400'
                    }`}
                  >
                    <Share2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-200">Multi-Platform Dispatch</div>
                      <div className="text-[10px] text-slate-400">YouTube, TikTok, Reels</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setDestinationMode('local_only')}
                    className={`p-3 rounded-lg border text-left transition-colors flex items-start space-x-2.5 ${
                      destinationMode === 'local_only'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-[#191D26] border-[#242936] text-slate-400'
                    }`}
                  >
                    <HardDrive className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-200">Save Locally Only</div>
                      <div className="text-[10px] text-slate-400">exports/local/ folder</div>
                    </div>
                  </button>
                </div>

                {/* Target Platforms Multi-Select (when multi_publish is active) */}
                {destinationMode === 'multi_publish' && (
                  <div className="p-3.5 rounded-xl bg-[#0B0D11] border border-[#242936] space-y-3">
                    <span className="text-[11px] font-mono text-slate-400 uppercase">
                      Select Target Publishing Channels:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'youtube', label: 'YouTube Shorts' },
                        { id: 'tiktok', label: 'TikTok' },
                        { id: 'instagram', label: 'Instagram Reels' },
                        { id: 'facebook', label: 'Facebook Reels' },
                      ].map((p) => {
                        const isChecked = selectedPlatforms.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              if (isChecked) {
                                setSelectedPlatforms(selectedPlatforms.filter((item) => item !== p.id));
                              } else {
                                setSelectedPlatforms([...selectedPlatforms, p.id]);
                              }
                            }}
                            className={`p-2 rounded-lg border text-left flex items-center justify-between text-xs font-mono transition-colors ${
                              isChecked
                                ? 'bg-emerald-500/10 border-emerald-500 text-white'
                                : 'bg-[#12151C] border-[#242936] text-slate-500'
                            }`}
                          >
                            <span>{p.label}</span>
                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                              isChecked ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-slate-600'
                            }`}>
                              {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Schedule Time (Optional) */}
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">
                        Schedule Time (Optional — Leave blank to publish immediately)
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full bg-[#12151C] border border-[#242936] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Render Trigger Button */}
              <div className="pt-2">
                <button
                  onClick={handleStartRender}
                  disabled={activeJobId !== null || !videoUrl.trim()}
                  className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors shadow-md"
                >
                  {activeJobId ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{jobStatus?.status || 'Rendering Clip...'}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>
                        {destinationMode === 'local_only' ? 'Render & Save Locally' : 'Render & Dispatch Multi-Platform'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Progress & Status Box */}
              {activeJobId && jobStatus && (
                <div className="p-3 rounded-lg bg-[#0B0D11] border border-[#242936] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-emerald-400 font-bold">{jobStatus.status}</span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-300">
                    {jobStatus.progress_log || 'Processing video stream with ffmpeg...'}
                  </p>
                </div>
              )}

              {/* Success Notification */}
              {renderSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{renderSuccess}</span>
                </div>
              )}

              {/* Error Notification */}
              {renderError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{renderError}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
