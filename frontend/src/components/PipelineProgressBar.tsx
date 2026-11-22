'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getPipelineProgress, runAutopilotNow } from '@/lib/api';
import {
  Activity,
  Play,
  CheckCircle2,
  Loader2,
  Sparkles,
  RefreshCw,
  Video,
  FileAudio,
  Film,
  Send,
  Clock
} from 'lucide-react';

interface PipelineProgress {
  active: boolean;
  stage: string;
  percent: number;
  detail: string;
  creator?: string;
  updated_at?: string;
}

const STAGES = [
  { id: 'SCANNING', label: 'Scan VODs', icon: Video, pct: 5 },
  { id: 'DOWNLOADING', label: 'Fetch Highlight', icon: RefreshCw, pct: 20 },
  { id: 'TRANSCRIBING', label: 'AI Captions', icon: FileAudio, pct: 45 },
  { id: 'RENDERING', label: 'Render 9:16', icon: Film, pct: 70 },
  { id: 'PUBLISHING', label: 'Publish / Cloud', icon: Send, pct: 85 },
  { id: 'COMPLETE', label: 'Scheduled', icon: CheckCircle2, pct: 100 }
];

export default function PipelineProgressBar({
  onRefresh
}: {
  onRefresh?: () => void;
}) {
  const [progress, setProgress] = useState<PipelineProgress>({
    active: false,
    stage: 'IDLE',
    percent: 0,
    detail: 'Ready — Waiting for next scheduled check',
    creator: ''
  });
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProgress = async () => {
    try {
      const data = await getPipelineProgress();
      if (data && typeof data === 'object') {
        setProgress(data);
      }
    } catch {
      // Quiet fail if backend restarting
    }
  };

  useEffect(() => {
    fetchProgress();

    const intervalMs = progress.active ? 2000 : 8000;
    pollTimerRef.current = setInterval(fetchProgress, intervalMs);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [progress.active]);

  const handleRunNow = async () => {
    if (triggering || progress.active) return;
    setTriggering(true);
    setMessage(null);
    try {
      await runAutopilotNow();
      setMessage('Autonomous clip pipeline triggered!');
      // Instantly set optimistic active progress
      setProgress(prev => ({
        ...prev,
        active: true,
        stage: 'SCANNING',
        percent: 5,
        detail: 'Starting autonomous pipeline scan...'
      }));
      setTimeout(fetchProgress, 1000);
      if (onRefresh) onRefresh();
    } catch (e: any) {
      setMessage(`Failed: ${e.message || 'Could not start pipeline'}`);
    } finally {
      setTriggering(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const getStageIndex = (stage: string) => {
    const s = stage.toUpperCase();
    const idx = STAGES.findIndex(st => st.id === s);
    return idx >= 0 ? idx : 0;
  };

  const currentStageIdx = getStageIndex(progress.stage);

  return (
    <div className="bg-[#12151C] border border-[#242936] rounded-xl p-4 sm:p-5 text-white shadow-xl mb-6 relative overflow-hidden transition-all duration-300">
      {/* Background ambient glow when active */}
      {progress.active && (
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      )}

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${
            progress.active
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400'
          }`}>
            <Activity className={`w-5 h-5 ${progress.active ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm sm:text-base tracking-wide text-zinc-100">
                Live Autonomous Pipeline
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border ${
                  progress.active
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {progress.active ? 'Processing Clip' : 'Standby / Idle'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
              <span>{progress.detail}</span>
              {progress.creator && (
                <span className="bg-zinc-800 text-zinc-300 border border-zinc-700/80 px-1.5 py-0.2 rounded text-[11px] font-mono font-medium">
                  @{progress.creator}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {message && (
            <span className="text-xs text-emerald-400 font-medium px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded">
              {message}
            </span>
          )}
          <button
            type="button"
            onClick={handleRunNow}
            disabled={triggering || progress.active}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-md ${
              progress.active
                ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/60 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-emerald-950/40 border border-emerald-500/40'
            }`}
          >
            {triggering ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Starting...</span>
              </>
            ) : progress.active ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Running ({progress.percent}%)</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run 1 Clip Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="text-zinc-300 font-medium">{progress.stage}</span>
            {progress.active && <span className="text-emerald-400 font-semibold">• Active</span>}
          </span>
          <span className="text-emerald-400 font-bold">{progress.percent}%</span>
        </div>

        {/* Outer bar */}
        <div className="w-full bg-[#191D26] border border-[#242936] rounded-full h-2.5 overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              progress.active
                ? 'bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : progress.percent === 100
                ? 'bg-emerald-500'
                : 'bg-zinc-700'
            }`}
            style={{ width: `${Math.max(progress.percent, progress.active ? 5 : 0)}%` }}
          />
        </div>

        {/* 6 Step Visual Indicators */}
        <div className="grid grid-cols-6 gap-1 pt-1.5">
          {STAGES.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = progress.percent >= s.pct;
            const isCurrent = progress.active && currentStageIdx === idx;

            return (
              <div
                key={s.id}
                className={`flex flex-col items-center justify-center py-1 px-0.5 rounded text-center transition-all ${
                  isCurrent
                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                    : 'bg-transparent'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center mb-1 text-[10px] transition-all ${
                    isCurrent
                      ? 'bg-emerald-500 text-black font-bold ring-2 ring-emerald-400/50 scale-110'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'
                  }`}
                >
                  <Icon className="w-2.5 h-2.5" />
                </div>
                <span
                  className={`text-[10px] leading-tight font-medium hidden sm:block truncate max-w-full ${
                    isCurrent
                      ? 'text-emerald-300 font-semibold'
                      : isCompleted
                      ? 'text-zinc-300'
                      : 'text-zinc-500'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
