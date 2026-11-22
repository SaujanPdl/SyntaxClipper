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
  Youtube
} from 'lucide-react';
import {
  getWoopSocialPosts,
  retryWoopSocialPost,
  deleteWoopSocialPost
} from '@/lib/api';

export default function QueueCalendarView() {
  const [filter, setFilter] = useState<string>('ALL'); // ALL, SCHEDULED, SENT, FAILED
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    loadPosts();
  }, [filter]);

  const loadPosts = async () => {
    setLoading(true);
    setActionMsg('');
    setErrorMsg('');
    try {
      const res = await getWoopSocialPosts(filter);
      setPosts(res.posts || []);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to fetch posts from WoopSocial');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (postId: string) => {
    setRetryingId(postId);
    setActionMsg('');
    setErrorMsg('');
    try {
      await retryWoopSocialPost(postId);
      setActionMsg(`Post ${postId} retried successfully!`);
      await loadPosts();
    } catch (e: any) {
      setErrorMsg(e.message || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to cancel / delete this post from WoopSocial?')) return;
    try {
      await deleteWoopSocialPost(postId);
      setActionMsg('Post deleted successfully');
      await loadPosts();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to delete post');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Filter Tabs */}
      <div className="bg-[#161922] border border-[#262B38] rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            WoopSocial Queue & Calendar
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time synchronization with WoopSocial publishing schedule and post deliveries.
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
            onClick={loadPosts}
            className="p-1.5 rounded-lg bg-[#0E1015] border border-[#262B38] text-slate-400 hover:text-white"
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
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Posts Grid / Table */}
      <div className="bg-[#161922] border border-[#262B38] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
            <span className="text-xs font-mono">Syncing posts with WoopSocial REST API...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-24 text-center text-slate-500 text-xs font-mono">
            No posts found matching filter "{filter}".
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

                        {/* Platform Badge */}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0E1015] text-slate-300 border border-[#262B38]">
                          {p.platform || 'YOUTUBE'}
                        </span>

                        <span className="text-[11px] font-mono text-slate-500">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}
                        </span>
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
