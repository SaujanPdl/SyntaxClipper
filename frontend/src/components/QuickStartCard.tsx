'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Sliders,
  Play,
  Zap,
  HardDrive,
  Users,
  Video,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info
} from 'lucide-react';
import { updateConfig, loadStarterPresets, startAutopilot } from '@/lib/api';

interface QuickStartCardProps {
  config: any;
  autopilotStatus: any;
  analytics: any;
  creators: any[];
  onOpenWizard: () => void;
  onNavigateTab: (tab: 'manual' | 'studio' | 'exports' | 'library' | 'queue' | 'autopilot' | 'guide') => void;
  onRefreshData: () => void;
  onSetDemoUrl?: (url: string) => void;
}

export default function QuickStartCard({
  config,
  autopilotStatus,
  analytics,
  creators = [],
  onOpenWizard,
  onNavigateTab,
  onRefreshData,
  onSetDemoUrl
}: QuickStartCardProps) {
  const [dismissed, setDismissed] = useState<boolean>(true); // start true, verify in useEffect
  const [loadingAction, setLoadingAction] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<string>('');

  useEffect(() => {
    // Check localStorage dismissal
    const isDismissed = localStorage.getItem('syntaxclipper_quickstart_dismissed_v12');
    if (!isDismissed) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('syntaxclipper_quickstart_dismissed_v12', 'true');
    setDismissed(true);
  };

  // Step 1 check: Connected to provider OR local_only mode chosen
  const isStep1Done = Boolean(
    config?.publishing_mode === 'local_only' ||
    config?.zernio_api_key ||
    config?.woopsocial_api_key ||
    config?.youtube_oauth_configured
  );

  // Step 2 check: At least 1 creator enabled OR manual link clipped
  const isStep2Done = Boolean(
    (creators && creators.some((c: any) => c.enabled)) ||
    (analytics?.total_clips && analytics.total_clips > 0)
  );

  // Step 3 check: Autopilot running OR at least 1 clip rendered
  const isStep3Done = Boolean(
    autopilotStatus?.is_running ||
    (analytics?.total_clips && analytics.total_clips > 0)
  );

  const allCompleted = isStep1Done && isStep2Done && isStep3Done;

  const handleQuickLocalMode = async () => {
    setLoadingAction('local');
    setActionMessage('');
    try {
      await updateConfig({
        publishing_mode: 'local_only',
        first_run_completed: true
      });
      setActionMessage('Local Export Mode enabled! Zero API keys required.');
      onRefreshData();
    } catch (e: any) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setLoadingAction('');
    }
  };

  const handleLoadPresets = async () => {
    setLoadingAction('presets');
    setActionMessage('');
    try {
      await loadStarterPresets();
      setActionMessage('Starter creators enabled (IShowSpeed, Kai Cenat, BeastBoyShub, CaseOh)!');
      onRefreshData();
    } catch (e: any) {
      setActionMessage(`Error loading presets: ${e.message}`);
    } finally {
      setLoadingAction('');
    }
  };

  const handleStartAutopilot = async () => {
    setLoadingAction('autopilot');
    setActionMessage('');
    try {
      await startAutopilot();
      setActionMessage('Autopilot started! Monitoring streams in background.');
      onRefreshData();
    } catch (e: any) {
      setActionMessage(`Error starting autopilot: ${e.message}`);
    } finally {
      setLoadingAction('');
    }
  };

  const handleLoadDemoUrl = () => {
    const demo = 'https://www.youtube.com/watch?v=kXYiU_JCYtU'; // Nocopyright gameplay sample
    if (onSetDemoUrl) onSetDemoUrl(demo);
    onNavigateTab('manual');
  };

  if (dismissed) {
    return null;
  }

  const completedStepsCount = [isStep1Done, isStep2Done, isStep3Done].filter(Boolean).length;

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#12151D] via-[#151923] to-[#12151D] border border-[#242A38] p-5 shadow-2xl relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#242A38] gap-3">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                3-Step Quick Start Guide for Beginners
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#191E2A] text-emerald-400 border border-emerald-500/20 font-semibold">
                {completedStepsCount} of 3 Steps Ready
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Set up your publishing mode, pick a stream or creator, and start clipping in under 60 seconds.
            </p>
          </div>
        </div>

        {/* Dismiss and Collapse Buttons */}
        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
          <button
            onClick={handleDismiss}
            className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1A1F2B] border border-transparent hover:border-[#262C3A] text-xs font-mono transition-colors flex items-center space-x-1"
            title="Dismiss guide (workspace stays clean)"
          >
            <span>Dismiss Guide</span>
            <X className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Action Banner Toast */}
      {actionMessage && (
        <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-300 flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage('')} className="text-slate-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* 3 Step Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
        {/* STEP 1 */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isStep1Done
              ? 'bg-[#10141D] border-emerald-500/30'
              : 'bg-[#10131B] border-[#242A38] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1.5">
              <span className="w-4 h-4 rounded-full bg-[#1A1F2C] border border-[#2B3244] flex items-center justify-center text-[10px] text-slate-300">
                1
              </span>
              <span>Publishing Mode</span>
            </span>
            {isStep1Done ? (
              <span className="flex items-center space-x-1 text-emerald-400 text-xs font-mono font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Connected</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-amber-400 text-xs font-mono">
                <Circle className="w-3.5 h-3.5" />
                <span>Pending</span>
              </span>
            )}
          </div>

          <h3 className="text-xs font-bold text-white mb-1">
            Connect Publishing or Choose Local Mode
          </h3>
          <p className="text-[11px] text-slate-400 mb-3.5 leading-relaxed">
            {isStep1Done
              ? `Active: ${config?.publishing_mode === 'local_only' ? 'Local Only (No Keys)' : config?.publishing_mode || 'Configured'}`
              : 'Choose Direct YouTube API, Zernio/WoopSocial, or export directly to your hard drive.'}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-auto">
            <button
              onClick={onOpenWizard}
              className="px-2.5 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#1E2433] border border-[#262C3C] text-xs font-mono text-slate-200 hover:text-white transition-colors"
            >
              Open Setup Wizard
            </button>
            {!isStep1Done && (
              <button
                onClick={handleQuickLocalMode}
                disabled={loadingAction === 'local'}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-mono text-emerald-400 font-medium transition-colors"
              >
                {loadingAction === 'local' ? 'Saving...' : 'Save Locally Only'}
              </button>
            )}
          </div>
        </div>

        {/* STEP 2 */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isStep2Done
              ? 'bg-[#10141D] border-emerald-500/30'
              : 'bg-[#10131B] border-[#242A38] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1.5">
              <span className="w-4 h-4 rounded-full bg-[#1A1F2C] border border-[#2B3244] flex items-center justify-center text-[10px] text-slate-300">
                2
              </span>
              <span>Input Source</span>
            </span>
            {isStep2Done ? (
              <span className="flex items-center space-x-1 text-emerald-400 text-xs font-mono font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ready</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-amber-400 text-xs font-mono">
                <Circle className="w-3.5 h-3.5" />
                <span>Needed</span>
              </span>
            )}
          </div>

          <h3 className="text-xs font-bold text-white mb-1">
            Add a Creator or Paste a Stream Link
          </h3>
          <p className="text-[11px] text-slate-400 mb-3.5 leading-relaxed">
            Clip any YouTube/Twitch stream manually, or let Autopilot automatically monitor your favorite streamers.
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-auto">
            <button
              onClick={handleLoadPresets}
              disabled={loadingAction === 'presets'}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-mono text-emerald-400 font-medium transition-colors"
            >
              {loadingAction === 'presets' ? 'Loading...' : 'Load Starter Creators'}
            </button>
            <button
              onClick={() => onNavigateTab('manual')}
              className="px-2.5 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#1E2433] border border-[#262C3C] text-xs font-mono text-slate-200 hover:text-white transition-colors"
            >
              Paste Custom URL
            </button>
          </div>
        </div>

        {/* STEP 3 */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isStep3Done
              ? 'bg-[#10141D] border-emerald-500/30'
              : 'bg-[#10131B] border-[#242A38] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1.5">
              <span className="w-4 h-4 rounded-full bg-[#1A1F2C] border border-[#2B3244] flex items-center justify-center text-[10px] text-slate-300">
                3
              </span>
              <span>Start Clipping</span>
            </span>
            {isStep3Done ? (
              <span className="flex items-center space-x-1 text-emerald-400 text-xs font-mono font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Active</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-amber-400 text-xs font-mono">
                <Circle className="w-3.5 h-3.5" />
                <span>Ready to Launch</span>
              </span>
            )}
          </div>

          <h3 className="text-xs font-bold text-white mb-1">
            Start Clipping (Manual or Autopilot)
          </h3>
          <p className="text-[11px] text-slate-400 mb-3.5 leading-relaxed">
            Autopilot runs silently and auto-pauses when you game, or you can clip any moment manually right now.
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-auto">
            <button
              onClick={handleStartAutopilot}
              disabled={loadingAction === 'autopilot' || autopilotStatus?.is_running}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                autopilotStatus?.is_running
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
              }`}
            >
              {loadingAction === 'autopilot'
                ? 'Engaging...'
                : autopilotStatus?.is_running
                ? 'Autopilot Running'
                : 'Turn ON Autopilot'}
            </button>
            <button
              onClick={() => onNavigateTab('manual')}
              className="px-2.5 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#1E2433] border border-[#262C3C] text-xs font-mono text-slate-200 hover:text-white transition-colors"
            >
              Manual Studio
            </button>
          </div>
        </div>
      </div>

      {/* All Complete Banner */}
      {allCompleted && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Setup Complete! SyntaxClipper is configured and ready to produce viral 9:16 clips.</span>
          </div>
          <button
            onClick={handleDismiss}
            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold transition-colors shrink-0"
          >
            Hide Quick Start
          </button>
        </div>
      )}
    </div>
  );
}
