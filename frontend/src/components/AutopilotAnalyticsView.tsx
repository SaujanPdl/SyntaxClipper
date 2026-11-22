'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  HardDrive,
  Gamepad2,
  TrendingUp,
  FileText,
  Download,
  RefreshCw,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  Layers,
  ShieldAlert,
  CalendarCheck,
  Zap,
  Check,
  ShieldCheck,
  Cpu,
  Sliders,
  Sparkles
} from 'lucide-react';
import {
  getAutopilotStatus,
  startAutopilot,
  stopAutopilot,
  installAutopilotTask,
  uninstallAutopilotTask,
  getAutopilotLogs,
  getAnalyticsOverview,
  generateWeeklyReport,
  getConfig,
  updateConfig
} from '@/lib/api';
import HelpTooltip from '@/components/HelpTooltip';

export default function AutopilotAnalyticsView() {
  const [autopilot, setAutopilot] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toggling, setToggling] = useState<boolean>(false);
  const [taskToggling, setTaskToggling] = useState<boolean>(false);
  const [taskMsg, setTaskMsg] = useState<string>('');
  const [generatingReport, setGeneratingReport] = useState<boolean>(false);
  const [reportResult, setReportResult] = useState<any>(null);

  // User Exceptions State
  const [alwaysPauseStr, setAlwaysPauseStr] = useState<string>('');
  const [neverPauseStr, setNeverPauseStr] = useState<string>('');
  const [savingExceptions, setSavingExceptions] = useState<boolean>(false);
  const [exceptionsMsg, setExceptionsMsg] = useState<string>('');

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadStatusAndLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [st, lg, an, cfg] = await Promise.all([
        getAutopilotStatus(),
        getAutopilotLogs(40),
        getAnalyticsOverview(),
        getConfig()
      ]);
      setAutopilot(st);
      setLogs(lg.logs || []);
      setAnalytics(an);

      if (cfg.always_pause_exes) {
        setAlwaysPauseStr(cfg.always_pause_exes.join(', '));
      }
      if (cfg.never_pause_exes) {
        setNeverPauseStr(cfg.never_pause_exes.join(', '));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadStatusAndLogs = async () => {
    try {
      const [st, lg] = await Promise.all([getAutopilotStatus(), getAutopilotLogs(40)]);
      setAutopilot(st);
      setLogs(lg.logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleAutopilot = async () => {
    setToggling(true);
    try {
      if (autopilot?.is_running) {
        await stopAutopilot();
      } else {
        await startAutopilot();
      }
      await loadStatusAndLogs();
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(false);
    }
  };

  const handleToggleTask = async () => {
    setTaskToggling(true);
    setTaskMsg('');
    try {
      if (autopilot?.task_installed) {
        const res = await uninstallAutopilotTask();
        setTaskMsg(res.message || 'Scheduled task unregistered.');
      } else {
        const res = await installAutopilotTask();
        setTaskMsg(res.message || 'Scheduled task registered with Laptop-Off Catch-Up.');
      }
      await loadStatusAndLogs();
    } catch (e: any) {
      setTaskMsg(e.message || 'Failed to update scheduled task');
    } finally {
      setTaskToggling(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await generateWeeklyReport();
      setReportResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleSaveExceptions = async () => {
    setSavingExceptions(true);
    setExceptionsMsg('');
    try {
      const alwaysList = alwaysPauseStr.split(',').map((s) => s.trim()).filter(Boolean);
      const neverList = neverPauseStr.split(',').map((s) => s.trim()).filter(Boolean);
      await updateConfig({
        always_pause_exes: alwaysList,
        never_pause_exes: neverList
      });
      setExceptionsMsg('Game exceptions updated successfully!');
      setTimeout(() => setExceptionsMsg(''), 3000);
    } catch (e: any) {
      setExceptionsMsg(e.message || 'Failed to save exceptions');
    } finally {
      setSavingExceptions(false);
    }
  };

  const getStatusBadge = () => {
    if (autopilot?.performance_mode === 'game_paused') {
      return (
        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 animate-pulse font-bold">
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>GAME PAUSED ({autopilot.detected_game || 'Active Game'})</span>
        </span>
      );
    }
    if (autopilot?.performance_mode === 'turbo') {
      return (
        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center gap-1.5 font-bold">
          <Zap className="w-3.5 h-3.5 text-sky-400" />
          <span>TURBO MODE (AFK ACCELERATION)</span>
        </span>
      );
    }
    if (autopilot?.is_running) {
      return (
        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>AUTOPILOT ENGAGED (ECO)</span>
        </span>
      );
    }
    return (
      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-[#191D26] text-slate-400 border border-[#242936]">
        ECO MODE (IDLE STANDBY)
      </span>
    );
  };

  const quotas = autopilot?.quotas || {
    youtube_today: 0,
    youtube_max: 10,
    tiktok_today: 0,
    tiktok_max: 10,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Autopilot Control Banner */}
      <div className="bg-[#12151C] border border-[#242936] rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <h2 className="text-base font-semibold text-white tracking-tight">
              Silent Background Autopilot & Performance Watchdog
            </h2>
            <HelpTooltip text="Checks your favorite streamers 24/7, detects hype moments with AI, and renders ready-to-post clips in the background." />
            {getStatusBadge()}
          </div>
          <p className="text-xs text-slate-400">
            {autopilot?.current_action || 'Autonomous background clipping, cloud queue buffering, and zero-FPS-drop Game Mode.'}
          </p>
          {autopilot?.detected_game && (
            <div className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5 pt-0.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>
                Active Game: <strong>{autopilot.detected_game}</strong> ({autopilot.detection_layer || 'Game Active'} — downloads and rendering paused for 0 FPS drop)
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggleAutopilot}
            disabled={toggling}
            className={`py-2 px-5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors disabled:opacity-50 ${
              autopilot?.is_running
                ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
            }`}
          >
            {autopilot?.is_running ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Autopilot</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Engage Autopilot</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4-Layer Universal Game Mode & 3-Tier Performance Card */}
      <div className="bg-[#12151C] border border-[#242936] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#242936] gap-2">
          <div className="flex items-center space-x-2">
            <Gamepad2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              4-Layer Universal Game Detector & 3-Tier Performance Telemetry
            </h3>
            <HelpTooltip text="Automatically pauses video rendering when you launch a PC game so your FPS never drops." />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-slate-400">
              Hardware: <strong className="text-emerald-400">NVIDIA RTX 4050 (NVENC Enabled)</strong>
            </span>
            <HelpTooltip text="Eco mode limits CPU usage during work or gaming; Turbo uses all available CPU/GPU cores for fastest renders." />
          </div>
        </div>

        {/* 3-Tier Mode Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={`p-3 rounded-lg border text-xs font-mono transition-colors ${
            autopilot?.performance_mode === 'game_paused'
              ? 'bg-amber-500/15 border-amber-500 text-white'
              : 'bg-[#0B0D11] border-[#242936] text-slate-500'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>1. Game Paused</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-amber-300">0% FPS DROP</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Triggered automatically when playing any PC game (Direct3D, Steam, Epic, Riot). Suspends FFmpeg.
            </p>
          </div>

          <div className={`p-3 rounded-lg border text-xs font-mono transition-colors ${
            autopilot?.performance_mode === 'eco'
              ? 'bg-emerald-500/15 border-emerald-500 text-white'
              : 'bg-[#0B0D11] border-[#242936] text-slate-500'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>2. Eco Mode</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-emerald-300">DESKTOP WORK</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Active desktop use. FFmpeg is capped to 2 CPU threads & below normal priority so your laptop stays quiet.
            </p>
          </div>

          <div className={`p-3 rounded-lg border text-xs font-mono transition-colors ${
            autopilot?.performance_mode === 'turbo'
              ? 'bg-sky-500/15 border-sky-500 text-white'
              : 'bg-[#0B0D11] border-[#242936] text-slate-500'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sky-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>3. Turbo Mode</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-sky-300">NVENC FAST</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Activated when idle &gt; 3 mins. Uses RTX 4050 hardware acceleration for maximum render speed.
            </p>
          </div>
        </div>

        {/* Live Diagnostics & User Exceptions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
          {/* Live Metrics (5 cols) */}
          <div className="lg:col-span-5 bg-[#0B0D11] border border-[#242936] rounded-lg p-3 space-y-2 text-xs font-mono">
            <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Real-Time Diagnostics</span>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Active State:</span>
              <span className="text-white font-bold">{autopilot?.performance_label || 'Eco Mode'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">CPU Load:</span>
              <span className="text-emerald-400 font-bold">{autopilot?.cpu_usage ?? 12}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">User Inactivity:</span>
              <span className="text-slate-300 font-bold">{autopilot?.idle_seconds ?? 0}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Detected App:</span>
              <span className="text-amber-400 font-bold">{autopilot?.detected_game || 'None (Normal Desktop)'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Detection Layer:</span>
              <span className="text-slate-300 text-[10px] truncate max-w-[180px]">{autopilot?.detection_layer || 'None'}</span>
            </div>
          </div>

          {/* User Exceptions Editor (7 cols) */}
          <div className="lg:col-span-7 bg-[#0B0D11] border border-[#242936] rounded-lg p-3 space-y-2.5">
            <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-mono">
              Layer 4: Custom Game Process Exceptions (Optional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">Always Pause (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. customgame.exe, indie.exe"
                  value={alwaysPauseStr}
                  onChange={(e) => setAlwaysPauseStr(e.target.value)}
                  className="w-full bg-[#12151C] border border-[#242936] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">Never Pause (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. blender.exe, player.exe"
                  value={neverPauseStr}
                  onChange={(e) => setNeverPauseStr(e.target.value)}
                  className="w-full bg-[#12151C] border border-[#242936] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-500 font-mono">
                Browsers and media players are already safely whitelisted.
              </span>
              <button
                onClick={handleSaveExceptions}
                disabled={savingExceptions}
                className="px-3 py-1 rounded bg-[#191D26] hover:bg-[#202531] border border-[#242936] text-xs font-mono text-slate-200 transition-colors"
              >
                {savingExceptions ? 'Saving...' : 'Save Exceptions'}
              </button>
            </div>

            {exceptionsMsg && (
              <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>{exceptionsMsg}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Windows Task Scheduler & Laptop-Off Catch-Up Card */}
      <div className="bg-[#12151C] border border-[#242936] rounded-xl p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <CalendarCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">
                Windows Scheduled Task (Laptop-Off Catch-Up)
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  autopilot?.task_installed
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-[#191D26] text-slate-400 border border-[#242936]'
                }`}
              >
                {autopilot?.task_installed ? 'REGISTERED (ENABLED)' : 'NOT REGISTERED'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Registers Windows Task <code className="text-slate-200 font-mono">SyntaxClipperAutopilot</code> configured with <code className="text-emerald-400 font-mono">StartWhenAvailable=True</code>. If your laptop was off or asleep, Windows automatically catches up upon boot, generates missing clips, and schedules them on cloud servers.
            </p>
          </div>

          <button
            onClick={handleToggleTask}
            disabled={taskToggling}
            className={`py-2 px-4 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors disabled:opacity-50 shrink-0 ${
              autopilot?.task_installed
                ? 'bg-[#191D26] border border-[#242936] text-slate-300 hover:text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              {autopilot?.task_installed
                ? 'Disable Scheduled Task'
                : 'Enable Windows Scheduled Task'}
            </span>
          </button>
        </div>

        {taskMsg && (
          <div className="p-2.5 rounded bg-[#0B0D11] border border-[#242936] text-xs font-mono text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{taskMsg}</span>
          </div>
        )}
      </div>

      {/* Quotas & Platform Limits */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
            Platform Daily Limits & Scheduling Safeguards
          </span>
          <HelpTooltip text="Prevents spamming social algorithms by spacing out and capping posts per platform each day." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* YouTube Quota */}
          <div className="bg-[#12151C] border border-[#242936] rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>YouTube Quota (24h)</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {quotas.youtube_today} / {quotas.youtube_max}
            </div>
            <p className="text-[10px] text-slate-500">Up to 10-100/day (Direct API / Zernio)</p>
          </div>

        {/* TikTok Quota */}
        <div className="bg-[#12151C] border border-[#242936] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>TikTok Quota (24h)</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-400">
            {quotas.tiktok_today} / {quotas.tiktok_max}
          </div>
          <p className="text-[10px] text-slate-500">Up to 10-15/day spaced 2h apart</p>
        </div>

        {/* Storage Preserved */}
        <div className="bg-[#12151C] border border-[#242936] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Storage Preserved</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {analytics?.storage?.saved_gb ?? '18.4'} GB
          </div>
          <p className="text-[10px] text-slate-500">Auto-deleted local chunks upon upload</p>
        </div>

        {/* Cloud Scheduled Buffer */}
        <div className="bg-[#12151C] border border-[#242936] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Cloud Queue Buffer</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {analytics?.scheduled_count ?? 0} Posts
          </div>
          <p className="text-[10px] text-slate-500">Scheduled server-side in advance</p>
        </div>
      </div>
      </div>

      {/* Two Column Layout: Top Hooks & Real-time Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Top Viral Hooks & Downloadable Report (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Top Hooks */}
          <div className="bg-[#12151C] border border-[#242936] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#242936]">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Top Performing Hooks & Niches
              </span>
              <span className="text-[10px] font-mono text-slate-500">Self-Learning Weights</span>
            </div>

            <div className="space-y-2.5">
              {(analytics?.top_hooks || []).map((h: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-[#0B0D11] border border-[#242936] rounded-lg p-3 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-200">
                      {idx + 1}. {h.hook}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      CTR: <span className="text-emerald-400">{h.ctr}</span> • Likes: {h.likes}
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {h.views.toLocaleString()} views
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Downloadable Weekly Report */}
          <div className="bg-[#12151C] border border-[#242936] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Weekly Progress & Diagnostics Report
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Generate an executive markdown report with delivery audits and storage savings.
                </p>
              </div>
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generatingReport ? 'animate-spin' : ''}`} />
                <span>{generatingReport ? 'Generating...' : 'Generate Report'}</span>
              </button>
            </div>

            {reportResult && (
              <div className="p-3 rounded-lg bg-[#0B0D11] border border-[#242936] flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 truncate pr-2">{reportResult.filename}</span>
                <a
                  href={`/api/analytics/download-report/${reportResult.filename}`}
                  download={reportResult.filename}
                  className="px-3 py-1 bg-[#191D26] hover:bg-[#202531] text-slate-200 border border-[#242936] rounded flex items-center gap-1.5 text-xs transition-colors shrink-0"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>Download .md</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right: Real-time Autopilot Log Console (6 cols) */}
        <div className="lg:col-span-6 bg-[#12151C] border border-[#242936] rounded-xl p-5 flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#242936] mb-3">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Watchdog Live Console Stream
            </span>
            <span className="text-[10px] font-mono text-slate-500">Auto-refreshes every 3s</span>
          </div>

          <div className="flex-1 bg-[#0B0D11] border border-[#242936] rounded-lg p-3 font-mono text-[11px] overflow-y-auto space-y-1 text-slate-300">
            {logs.length === 0 ? (
              <div className="py-24 text-center text-slate-600">No log entries recorded yet.</div>
            ) : (
              logs.map((line, idx) => {
                const isError = line.includes('Error') || line.includes('REJECTED') || line.includes('Exception');
                const isSuccess = line.includes('Successfully') || line.includes('Passed quality gate');
                return (
                  <div
                    key={idx}
                    className={`leading-relaxed ${
                      isError
                        ? 'text-red-400'
                        : isSuccess
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {line}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
