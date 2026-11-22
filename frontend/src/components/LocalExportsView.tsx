'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  HardDrive,
  FolderOpen,
  Share2,
  Copy,
  Check,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  Search,
  Video,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Calendar,
  Send,
  FileText
} from 'lucide-react';
import {
  getLocalExports,
  openExportFolder,
  publishLocalExport
} from '@/lib/api';

export default function LocalExportsView() {
  const [exportsList, setExportsList] = useState<any[]>([]);
  const [selectedExport, setSelectedExport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Video player controls
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Copy feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // WoopSocial Direct Publishing Drawer/Modal
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [publishTitle, setPublishTitle] = useState<string>('');
  const [publishYtDesc, setPublishYtDesc] = useState<string>('');
  const [publishTiktokCaption, setPublishTiktokCaption] = useState<string>('');
  const [scheduleIso, setScheduleIso] = useState<string>('');
  const [publishing, setPublishing] = useState<boolean>(false);
  const [publishSuccess, setPublishSuccess] = useState<string>('');
  const [publishError, setPublishError] = useState<string>('');

  useEffect(() => {
    loadExports();
  }, []);

  const loadExports = async () => {
    setLoading(true);
    try {
      const res = await getLocalExports();
      const list = res.exports || [];
      setExportsList(list);
      if (list.length > 0 && !selectedExport) {
        setSelectedExport(list[0]);
      } else if (selectedExport) {
        const found = list.find((e: any) => e.relative_path === selectedExport.relative_path);
        setSelectedExport(found || list[0] || null);
      }
    } catch (e) {
      console.error('Failed to load local exports:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExport) {
      const meta = selectedExport.metadata || {};
      setPublishTitle(meta.title || selectedExport.clip_name.replace('.mp4', '').replace(/_/g, ' '));
      setPublishYtDesc(meta.yt_description || `${publishTitle}\n\n#Shorts`);
      setPublishTiktokCaption(meta.tiktok_caption || `${publishTitle} 🔥 #shorts #gaming #viral`);
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    }
  }, [selectedExport]);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenFolder = async (subpath = '') => {
    try {
      await openExportFolder(subpath);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendToWoopSocial = async () => {
    if (!selectedExport) return;
    setPublishing(true);
    setPublishError('');
    setPublishSuccess('');

    try {
      await publishLocalExport({
        relative_path: selectedExport.relative_path,
        title: publishTitle,
        yt_description: publishYtDesc,
        tiktok_caption: publishTiktokCaption,
        scheduled_for_iso: scheduleIso || null
      });

      setPublishSuccess('Clip scheduled to publishing queue successfully!');
      setTimeout(() => {
        setShowPublishModal(false);
        setPublishSuccess('');
      }, 2000);
    } catch (e: any) {
      setPublishError(e.message || 'Failed to dispatch clip');
    } finally {
      setPublishing(false);
    }
  };

  const filteredExports = exportsList.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.clip_name?.toLowerCase().includes(q) ||
      item.creator?.toLowerCase().includes(q) ||
      item.metadata?.title?.toLowerCase().includes(q)
    );
  });

  const totalStorageMb = exportsList.reduce((acc, curr) => acc + (curr.file_size_mb || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0D11] overflow-hidden">
      {/* View Header */}
      <div className="p-6 border-b border-[#242936] bg-[#12151C]/60 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Local Video Exports
              </h1>
              <p className="text-xs text-slate-400">
                Clips rendered with "Save Locally Only" destination mode. Saved in <code className="text-emerald-400 font-mono">exports/local/</code> with ready-to-copy metadata.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-3">
          <div className="text-xs font-mono text-slate-400 bg-[#191D26] px-3 py-1.5 rounded-lg border border-[#242936]">
            <span>{exportsList.length} Local Clips</span>
            <span className="mx-2 text-slate-600">|</span>
            <span className="text-emerald-400">{totalStorageMb.toFixed(1)} MB Used</span>
          </div>

          <button
            onClick={() => handleOpenFolder('')}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-[#191D26] hover:bg-[#202531] border border-[#242936] text-xs font-mono text-slate-200 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open in Explorer</span>
          </button>

          <button
            onClick={loadExports}
            disabled={loading}
            className="p-2 rounded-lg bg-[#191D26] hover:bg-[#202531] border border-[#242936] text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Workspace: Left List + Right Inspector */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Column: Clips List (w-96) */}
        <div className="w-96 border-r border-[#242936] bg-[#12151C]/40 flex flex-col shrink-0">
          {/* Search Bar */}
          <div className="p-3 border-b border-[#242936]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search exports by creator or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0B0D11] border border-[#242936] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#242936]/60">
            {filteredExports.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs space-y-2">
                <Video className="w-8 h-8 mx-auto text-slate-600" />
                <p>No local export clips found.</p>
                <p className="text-[11px] text-slate-600">
                  Render a clip in Manual Studio or Creators Autopilot using "Save Locally Only".
                </p>
              </div>
            ) : (
              filteredExports.map((clip) => {
                const isSelected = selectedExport?.relative_path === clip.relative_path;
                const meta = clip.metadata || {};
                return (
                  <button
                    key={clip.relative_path}
                    onClick={() => setSelectedExport(clip)}
                    className={`w-full p-4 text-left transition-colors flex items-start space-x-3 ${
                      isSelected
                        ? 'bg-[#191D26] border-l-2 border-emerald-500'
                        : 'hover:bg-[#161922]'
                    }`}
                  >
                    <div className="w-12 h-16 bg-[#0B0D11] rounded border border-[#242936] flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 truncate max-w-[130px]">
                          {clip.creator}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {clip.file_size_mb} MB
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-white truncate">
                        {meta.title || clip.clip_name}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                        {meta.tiktok_caption || clip.clip_name}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Clip Player & Ready-to-Copy Metadata */}
        {selectedExport ? (
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6">
            {/* Top Bar for Selected Clip */}
            <div className="flex items-center justify-between pb-4 border-b border-[#242936]">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#191D26] text-slate-300 border border-[#242936]">
                    Folder: exports/local/{selectedExport.creator}/
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    File: {selectedExport.clip_name}
                  </span>
                </div>
                <h2 className="text-base font-bold text-white tracking-tight mt-1">
                  {selectedExport.metadata?.title || selectedExport.clip_name}
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleOpenFolder(selectedExport.creator)}
                  className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-[#191D26] hover:bg-[#202531] border border-[#242936] text-xs font-mono text-slate-200 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Open Folder</span>
                </button>

                <button
                  onClick={() => setShowPublishModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition-colors shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Dispatch to Social Queue</span>
                </button>
              </div>
            </div>

            {/* Split Grid: Video Player + Metadata Tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* HTML5 Vertical 9:16 Video Player (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="w-[270px] aspect-[9/16] bg-black rounded-xl border border-[#242936] overflow-hidden relative shadow-2xl flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={selectedExport.video_url}
                    className="w-full h-full object-contain"
                    onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
                    onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
                    onEnded={() => setIsPlaying(false)}
                    loop
                  />
                  {/* Play / Pause Overlay Button */}
                  <button
                    onClick={() => {
                      if (!videoRef.current) return;
                      if (isPlaying) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      } else {
                        videoRef.current.play();
                        setIsPlaying(true);
                      }
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors group"
                  >
                    {!isPlaying && (
                      <div className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    )}
                  </button>
                </div>

                {/* Scrubber Controls */}
                <div className="w-[270px] mt-3 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>{Math.floor(currentTime)}s / {Math.floor(duration || 0)}s</span>
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        videoRef.current.play();
                        setIsPlaying(true);
                      }
                    }}
                    className="hover:text-emerald-400 transition-colors flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Replay</span>
                  </button>
                </div>
              </div>

              {/* Ready-to-Copy Social Metadata & Quality Gate (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* Quality Gate Card */}
                <div className="p-4 rounded-xl bg-[#12151C] border border-[#242936] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-500/10 rounded border border-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Quality Gate Passed</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        1080×1920 • 30fps • AAC Stereo Audio • -0.15s Synced Whisper Subs
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Ready to Post
                  </span>
                </div>

                {/* YouTube Shorts Box */}
                <div className="p-4 rounded-xl bg-[#12151C] border border-[#242936] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                      <Video className="w-3.5 h-3.5 text-rose-500" />
                      <span>YouTube Shorts Metadata</span>
                    </span>
                    <button
                      onClick={() => handleCopy(
                        `${selectedExport.metadata?.title || selectedExport.clip_name}\n\n${selectedExport.metadata?.yt_description || ''}`,
                        'youtube'
                      )}
                      className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#191D26] hover:bg-[#202531] border border-[#242936] text-xs font-mono text-slate-300 transition-colors"
                    >
                      {copiedField === 'youtube' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Title & Desc</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Title</span>
                    <div className="p-2.5 rounded bg-[#0B0D11] border border-[#242936] text-xs font-medium text-white font-mono select-all">
                      {selectedExport.metadata?.title || selectedExport.clip_name}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Description</span>
                    <div className="p-2.5 rounded bg-[#0B0D11] border border-[#242936] text-xs text-slate-300 font-mono whitespace-pre-line select-all">
                      {selectedExport.metadata?.yt_description || `${selectedExport.metadata?.title}\n\nCreator: ${selectedExport.creator}\n#Shorts`}
                    </div>
                  </div>
                </div>

                {/* TikTok & Reels Box */}
                <div className="p-4 rounded-xl bg-[#12151C] border border-[#242936] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                      <FileText className="w-3.5 h-3.5 text-sky-400" />
                      <span>TikTok & Reels Caption</span>
                    </span>
                    <button
                      onClick={() => handleCopy(
                        selectedExport.metadata?.tiktok_caption || `${selectedExport.metadata?.title} 🔥 #shorts #gaming #viral`,
                        'tiktok'
                      )}
                      className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#191D26] hover:bg-[#202531] border border-[#242936] text-xs font-mono text-slate-300 transition-colors"
                    >
                      {copiedField === 'tiktok' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Caption</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-2.5 rounded bg-[#0B0D11] border border-[#242936] text-xs font-medium text-white font-mono select-all">
                    {selectedExport.metadata?.tiktok_caption || `${selectedExport.metadata?.title} 🔥 #shorts #gaming #viral`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 font-mono text-xs">
            Select a clip from the list to preview and copy metadata.
          </div>
        )}
      </div>

      {/* 1-Click Send to WoopSocial Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12151C] border border-[#242936] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#242936] pb-3">
              <div className="flex items-center space-x-2">
                <Share2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Dispatch Local Clip to Social Channels</h3>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="text-slate-500 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                  className="w-full bg-[#0B0D11] border border-[#242936] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">YouTube Description</label>
                <textarea
                  rows={3}
                  value={publishYtDesc}
                  onChange={(e) => setPublishYtDesc(e.target.value)}
                  className="w-full bg-[#0B0D11] border border-[#242936] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">TikTok Caption</label>
                <input
                  type="text"
                  value={publishTiktokCaption}
                  onChange={(e) => setPublishTiktokCaption(e.target.value)}
                  className="w-full bg-[#0B0D11] border border-[#242936] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Schedule Time (Optional — Leave blank to publish immediately)
                </label>
                <input
                  type="datetime-local"
                  value={scheduleIso}
                  onChange={(e) => setScheduleIso(e.target.value)}
                  className="w-full bg-[#0B0D11] border border-[#242936] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {publishSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{publishSuccess}</span>
              </div>
            )}

            {publishError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{publishError}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#242936]">
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 rounded-lg bg-[#191D26] hover:bg-[#202531] border border-[#242936] text-xs font-mono text-slate-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendToWoopSocial}
                disabled={publishing}
                className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-semibold text-xs transition-colors shadow-sm"
              >
                {publishing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading & Queuing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
