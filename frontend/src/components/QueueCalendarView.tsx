'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  Trash2,
  Send,
  Video,
  Layers,
  Youtube,
  KeyRound,
  Settings
} from 'lucide-react';
import {
  getQueueStatus,
  getQueuePosts,
  retryQueuePost,
  deleteQueuePost
} from '@/lib/api';

interface QueueCalendarViewProps {
  onOpenWizard?: () => void;
}

export default function QueueCalendarView({ onOpenWizard }: QueueCalendarViewProps) {
  const [filter, setFilter] = useState<string>('ALL'); // ALL, SCHEDULED, SENT, FAILED
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [providerInfo, setProviderInfo] = useState<any>({
    provider: 'zernio',
    name: 'Zernio',
    label: 'Zernio Queue & Calendar',
    is_connected: true
  });

  useEffect(() => {
    loadProviderAndPosts();
  }, [filter]);

  const loadProviderAndPosts = async () => {
    setLoading(true);
    setActionMsg('');
    setErrorMsg('');
    try {
      const [statusRes, postsRes] = await Promise.all([
        getQueueStatus().catch(() => null),
        getQueuePosts(filter)
      ]);
      if (statusRes) {
        setProviderInfo(statusRes);
      }
      setPosts(postsRes.posts || []);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to fetch publishing queue');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (postId: string) => {
    setRetryingId(postId);
    setActionMsg('');
    setErrorMsg('');
    try {
      await retryQueuePost(postId);
      setActionMsg(`Post ${postId} retried successfully on ${providerInfo?.name || 'provider'}!`);
      await loadProviderAndPosts();
    } catch (e: any) {
      setErrorMsg(e.message || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm(`Are you sure you want to cancel / delete this post from ${providerInfo?.name || 'publishing queue'}?`)) return;
    try {
      await deleteQueuePost(postId);
      setActionMsg('Post deleted successfully');
      await loadProviderAndPosts();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to delete post');
    }
  };

  const providerName = providerInfo?.name || 'Publishing';
  const providerLabel = providerInfo?.label || 'Publishing Queue & Calendar';

  return (
    <div className="space-y-6">
      {/* Top Banner with Filter Tabs */}
      <div className="bg-[#161922] border border-[#262B38] rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              {providerLabel}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#191D26] text-emerald-400 border border-[#262B38]">
              {providerName}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time synchronization with {providerName} multi-platform publishing schedule and post deliveries.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {['ALL', 'SCHEDULED', 'SENT', 'FAILED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                filter === tab
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-[#0E1015] text-slate-400 border border-[#262B38] hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
          <button
            onClick={loadProviderAndPosts}
            title="Refresh Queue"
            className="p-1.5 rounded-lg bg-[#0E1015] border border-[#262B38] text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs font-mono flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div>
              <div className="font-bold text-red-200">Connection or Authorization Notice</div>
              <div className="text-[11px] text-red-300/80 mt-0.5">{errorMsg}</div>
            </div>
          </div>
          {onOpenWizard && (
            <button
              onClick={onOpenWizard}
              className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-slate-950 font-semibold text-xs transition-colors shrink-0 flex items-center space-x-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configure Provider</span>
            </button>
          )}
        </div>
      )}

      {/* Posts Grid / Table */}
      <div className="bg-[#161922] border border-[#262B38] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
            <span className="text-xs font-mono">Syncing posts with {providerName} REST API...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs font-mono flex flex-col items-center justify-center space-y-2">
            <Calendar className="w-8 h-8 text-slate-600 mb-1" />
            <span className="text-slate-400 font-medium">No posts found matching filter "{filter}".</span>
            <span className="text-[11px] text-slate-500">
              When new clips are scheduled via {providerName}, they will appear here automatically.
            </span>
          </div>
        ) : (
          <div className="divide-y divide-[#262B38]">
            {posts.map((p) => {
              const status = p.deliveryStatus || 'UNKNOWN';
              const mediaObj = p.content?.[0]?.media?.[0];
              const thumbUrl = mediaObj?.thumbnailUrl || mediaObj?.url;
              const postTitle = p.title || p.content?.[0]?.text?.slice(0, 60) || 'Untitled Post';

              return (
                <div
                  key={p.socialAccountPostId || p.postId}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#1E222D]/40 transition-colors"
                >
                  {/* Left: Media Thumbnail + Title + Metadata */}
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    {thumbUrl ? (
                      <div className="w-16 h-20 rounded-md bg-black border border-[#262B38] overflow-hidden shrink-0">
                        <img
                          src={thumbUrl}
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                          onError={(e: any) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-20 rounded-md bg-[#0E1015] border border-[#262B38] flex items-center justify-center text-slate-500 shrink-0">
                        <Video className="w-6 h-6" />
                      </div>
                    )}

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                            status === 'SENT'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : status === 'SCHEDULED'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {status}
                        </span>

                        {/* Provider / Channel Badge */}
                        {p.provider_name && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            p.provider === 'youtube_direct'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {p.provider_name}
                          </span>
                        )}

                        {/* Platform Badge */}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0E1015] text-slate-300 border border-[#262B38]">
                          {p.platform || 'MULTI-PLATFORM'}
                        </span>

                        {(p.publishAt || p.scheduledFor) ? (
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {new Date(p.publishAt || p.scheduledFor).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-500">
                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-semibold text-slate-200 truncate">
                        {postTitle}
                      </h4>

                      <p className="text-[11px] text-slate-400 line-clamp-1 font-mono">
                        {p.content?.[0]?.text || ''}
                      </p>

                      {/* Error details if failed */}
                      {status === 'FAILED' && p.errorMessage && (
                        <div className="mt-2 p-2 rounded bg-red-950/40 border border-red-800/40 text-[11px] text-red-300 font-mono flex items-start space-x-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          <span>Error: {p.errorMessage}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {status === 'FAILED' && (
                      <button
                        onClick={() => handleRetry(p.socialAccountPostId || p.postId)}
                        disabled={retryingId === (p.socialAccountPostId || p.postId)}
                        className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${retryingId === (p.socialAccountPostId || p.postId) ? 'animate-spin' : ''}`} />
                        <span>Retry Failed</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(p.postId || p.socialAccountPostId)}
                      className="p-2 rounded-lg bg-[#0E1015] border border-[#262B38] text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                      title="Cancel / Delete Post"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
