'use client';

import React, { useState, useEffect } from 'react';
import {
  Video,
  Library,
  Calendar,
  Activity,
  Settings,
  HardDrive,
  Gamepad2,
  ExternalLink,
  ShieldCheck,
  Zap,
  FolderOpen,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Crosshair,
  Heart
} from 'lucide-react';
import ManualStudioView from '@/components/ManualStudioView';
import ClipStudioView from '@/components/ClipStudioView';
import LocalExportsView from '@/components/LocalExportsView';
import LibraryView from '@/components/LibraryView';
import QueueCalendarView from '@/components/QueueCalendarView';
import AutopilotAnalyticsView from '@/components/AutopilotAnalyticsView';
import UserGuideView from '@/components/UserGuideView';
import SetupWizardModal from '@/components/SetupWizardModal';
import { getConfig, getAutopilotStatus, getAnalyticsOverview } from '@/lib/api';

type TabType = 'manual' | 'studio' | 'exports' | 'library' | 'queue' | 'autopilot' | 'guide';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('studio');
  const [showWizard, setShowWizard] = useState<boolean>(false);
  const [config, setConfig] = useState<any>(null);
  const [autopilotStatus, setAutopilotStatus] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    checkFirstRun();
    const interval = setInterval(refreshHeaderStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkFirstRun = async () => {
    try {
      const [cfg, auto, an] = await Promise.all([
        getConfig(),
        getAutopilotStatus(),
        getAnalyticsOverview(),
      ]);
      setConfig(cfg);
      setAutopilotStatus(auto);
      setAnalytics(an);

      // Auto pop-up wizard if not completed or missing API key
      if (!cfg.first_run_completed || !cfg.woopsocial_api_key) {
        setShowWizard(true);
      }
    } catch (e) {
      console.error(e);
      setShowWizard(true);
    }
  };

  const refreshHeaderStats = async () => {
    try {
      const [auto, an] = await Promise.all([getAutopilotStatus(), getAnalyticsOverview()]);
      setAutopilotStatus(auto);
      setAnalytics(an);
    } catch (e) {
      console.error(e);
    }
  };

  const quotas = autopilotStatus?.quotas || {
    youtube_today: 0,
    youtube_max: 4,
    tiktok_today: 0,
    tiktok_max: 10,
  };

  return (
    <div className="flex h-screen bg-[#0B0D11] text-[#F0F3F6] overflow-hidden select-none">
      {/* Setup Wizard Modal */}
      <SetupWizardModal
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onCompleted={checkFirstRun}
      />

      {/* Left Sidebar Navigation */}
      <aside className="w-64 bg-[#12151C] border-r border-[#242936] flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Signature */}
          <div className="p-5 border-b border-[#242936] flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-white tracking-tight font-sans">
                  SyntaxClipper
                </span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v1.1
                </span>
              </div>
              <div className="mt-1">
                <span className="text-[11px] font-mono text-slate-400 font-medium">
                  by <span className="text-slate-200">Syntax Nepal</span>
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab('manual')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'manual'
                  ? 'bg-[#191D26] text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#161922]'
              }`}
            >
              <Crosshair className="w-4 h-4" />
              <span>Manual URL Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('studio')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'studio'
                  ? 'bg-[#191D26] text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#161922]'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Ready Clips Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('exports')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'exports'
                  ? 'bg-[#191D26] text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#161922]'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Local Video Exports</span>
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'library'
                  ? 'bg-[#191D26] text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#161922]'
              }`}
            >
              <Library className="w-4 h-4" />
              <span>Creators & Games</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'queue'
                  ? 'bg-[#191D26] text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#161922]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>
                {config?.zernio_api_key && !config?.woopsocial_api_key
                  ? 'Zernio Queue'
                  : config?.woopsocial_api_key && !config?.zernio_api_key
                  ? 'WoopSocial Queue'
                  : 'Publishing Queue'}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('autopilot')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'autopilot'
                  ? 'bg-[#191D26] text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#161922]'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Autopilot & Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'guide'
                  ? 'bg-[#191D26] text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#161922]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>User Manual & Guide</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#242936] space-y-2 bg-[#0B0D11]/60">
          <button
            onClick={() => setShowWizard(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#191D26] border border-[#242936] hover:border-slate-600 text-xs text-slate-300 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Settings & Wizard</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">Configure</span>
          </button>

          {/* Support / Donate Button */}
          <a
            href="https://kamaucha.me/sozan"
            target="_blank"
            rel="noopener noreferrer"
            title="Support via eSewa, Khalti, Fonepay, or Card"
            className="group block w-full p-2.5 rounded-lg bg-[#161922] border border-[#262B38] hover:border-rose-500/40 hover:bg-[#1C202C] transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Heart className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform fill-rose-500/20" />
                <span className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors">
                  Support Syntax Nepal
                </span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
            </div>
            <p className="mt-1 text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors line-clamp-1 font-mono">
              Support via eSewa, Khalti, Fonepay, or Card
            </p>
          </a>

          {/* Version & Badge Footer */}
          <div className="px-1 pt-0.5 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>v1.1 • Syntax Nepal</span>
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400">Ready</span>
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Telemetry Bar */}
        <header className="h-14 bg-[#12151C] border-b border-[#242936] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <h1 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              {activeTab === 'manual' && 'Interactive Manual URL Studio & Visual Crop'}
              {activeTab === 'studio' && 'Ready Clips Studio • Pro Inspector'}
              {activeTab === 'exports' && 'Local Video Exports & Social Dispatch'}
              {activeTab === 'library' && 'Creators & Niches Library'}
              {activeTab === 'queue' && (
                config?.zernio_api_key && !config?.woopsocial_api_key
                  ? 'Zernio Queue & Multi-Platform Calendar'
                  : config?.woopsocial_api_key && !config?.zernio_api_key
                  ? 'WoopSocial Queue & Scheduled Releases'
                  : 'Publishing Queue & Multi-Platform Calendar'
              )}
              {activeTab === 'autopilot' && 'Silent Autopilot Watchdog & Resource Telemetry'}
              {activeTab === 'guide' && 'Official User Manual & Quick Start Guide'}
            </h1>
          </div>

          {/* System Telemetry Badges */}
          <div className="flex items-center space-x-2.5">
            {/* YouTube Quota */}
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#191D26] border border-[#242936] text-[11px] font-mono">
              <span className="text-slate-400">YT:</span>
              <span className="text-emerald-400 font-bold">
                {quotas.youtube_today}/{quotas.youtube_max || 10}
              </span>
            </div>

            {/* TikTok Quota */}
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#191D26] border border-[#242936] text-[11px] font-mono">
              <span className="text-slate-400">TikTok:</span>
              <span className="text-blue-400 font-bold">
                {quotas.tiktok_today}/{quotas.tiktok_max || 10}
              </span>
            </div>

            {/* Storage Preserved */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#191D26] border border-[#242936] text-[11px] font-mono">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Saved:</span>
              <span className="text-emerald-400 font-bold">
                {analytics?.storage?.saved_gb ?? '18.4'} GB
              </span>
            </div>

            {/* 3-Tier Performance & Game-Mode Telemetry Pill */}
            <div className="flex items-center space-x-2 px-3 py-1 rounded bg-[#191D26] border border-[#242936] text-[11px] font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  autopilotStatus?.performance_mode === 'game_paused'
                    ? 'bg-amber-400 animate-ping'
                    : autopilotStatus?.performance_mode === 'turbo'
                    ? 'bg-sky-400 animate-pulse'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="text-slate-300 font-medium">
                {autopilotStatus?.performance_label ||
                  (autopilotStatus?.detected_game
                    ? `Paused (${autopilotStatus.detected_game})`
                    : autopilotStatus?.is_running
                    ? 'Autopilot Active (Eco)'
                    : 'Eco Mode (Active)')}
              </span>
            </div>
          </div>
        </header>

        {/* View Container */}
        <main className={`flex-1 overflow-y-auto ${activeTab === 'manual' || activeTab === 'exports' ? 'p-0 flex flex-col' : 'p-6'}`}>
          {/* First Run Action Banner */}
          {(!(config?.woopsocial_api_key || config?.zernio_api_key || config?.youtube_oauth_configured || config?.publishing_mode === 'local_only') || !config?.first_run_completed) && (
            <div className="m-6 p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-center justify-between text-xs font-mono text-amber-300">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-slate-200">First-Run Configuration Required</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Connect your publishing provider (Zernio, Direct YouTube, or WoopSocial) or select Local Export Mode to unlock automated clipping and scheduling.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowWizard(true)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shrink-0"
              >
                Complete Setup
              </button>
            </div>
          )}

          {activeTab === 'manual' && <ManualStudioView />}
          {activeTab === 'studio' && <ClipStudioView />}
          {activeTab === 'exports' && <LocalExportsView />}
          {activeTab === 'library' && <LibraryView />}
          {activeTab === 'queue' && <QueueCalendarView onOpenWizard={() => setShowWizard(true)} />}
          {activeTab === 'autopilot' && <AutopilotAnalyticsView />}
          {activeTab === 'guide' && <UserGuideView />}
        </main>
      </div>
    </div>
  );
}
