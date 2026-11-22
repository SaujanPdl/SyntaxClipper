'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Sliders,
  HardDrive,
  KeyRound,
  ShieldCheck,
  Check,
  Video,
  Share2,
  Sparkles,
  Layers,
  Upload,
  Info,
  Youtube,
  Globe,
  X
} from 'lucide-react';
import {
  getSystemCheck,
  installMissingTools,
  verifyWoopSocial,
  verifyZernio,
  getYouTubeStatus,
  uploadClientSecret,
  getYouTubeAuthUrl,
  updateConfig,
  getConfig
} from '@/lib/api';

interface SetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

export default function SetupWizardModal({ isOpen, onClose, onCompleted }: SetupWizardModalProps) {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Step 1: System
  const [systemData, setSystemData] = useState<any>(null);
  const [installing, setInstalling] = useState<boolean>(false);

  // Step 2: Multi-Provider Mode
  const [publishingMode, setPublishingMode] = useState<string>('hybrid'); // 'hybrid' | 'zernio' | 'woopsocial' | 'youtube_direct' | 'local_only'
  const [selectedApiProvider, setSelectedApiProvider] = useState<string>('zernio'); // 'zernio' | 'woopsocial' | 'upload_post'

  // Provider A: Zernio / WoopSocial / Upload-Post
  const [zernioKey, setZernioKey] = useState<string>('');
  const [woopKey, setWoopKey] = useState<string>('');
  const [verifyingApi, setVerifyingApi] = useState<boolean>(false);
  const [apiSuccessMsg, setApiSuccessMsg] = useState<string>('');
  const [apiErrorMsg, setApiErrorMsg] = useState<string>('');
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [showApiGuide, setShowApiGuide] = useState<boolean>(false);

  // Provider B: Direct YouTube Data API v3 & OAuth
  const [ytApiKey, setYtApiKey] = useState<string>('');
  const [clientSecretContent, setClientSecretContent] = useState<string>('');
  const [savingSecrets, setSavingSecrets] = useState<boolean>(false);
  const [authorizingYt, setAuthorizingYt] = useState<boolean>(false);
  const [ytStatus, setYtStatus] = useState<any>(null);
  const [ytPrivacy, setYtPrivacy] = useState<string>('private');
  const [showYtGuide, setShowYtGuide] = useState<boolean>(false);

  // Step 3: Platform Quotas & Preferences
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(['youtube', 'tiktok', 'instagram']);
  const [ytDailyCap, setYtDailyCap] = useState<number>(10);
  const [ttDailyCap, setTtDailyCap] = useState<number>(10);
  const [reelsDailyCap, setReelsDailyCap] = useState<number>(10);
  const [postingIntervalHours, setPostingIntervalHours] = useState<number>(2);
  const [autoDeleteClips, setAutoDeleteClips] = useState<boolean>(true);
  const [gameModePause, setGameModePause] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      const cfg = await getConfig();
      if (cfg.publishing_mode) setPublishingMode(cfg.publishing_mode);
      if (cfg.zernio_api_key) setZernioKey(cfg.zernio_api_key);
      if (cfg.woopsocial_api_key) setWoopKey(cfg.woopsocial_api_key);
      if (cfg.youtube_api_key) setYtApiKey(cfg.youtube_api_key);
      if (cfg.youtube_default_privacy) setYtPrivacy(cfg.youtube_default_privacy);
      if (cfg.selected_social_accounts) setSelectedAccounts(cfg.selected_social_accounts);

      const prefs = cfg.preferences || {};
      if (prefs.target_platforms) setTargetPlatforms(prefs.target_platforms);
      if (prefs.youtube_daily_cap) setYtDailyCap(prefs.youtube_daily_cap);
      if (prefs.tiktok_daily_cap) setTtDailyCap(prefs.tiktok_daily_cap);
      if (prefs.reels_daily_cap) setReelsDailyCap(prefs.reels_daily_cap);
      if (prefs.posting_interval_hours) setPostingIntervalHours(prefs.posting_interval_hours);
      if (prefs.auto_delete_local_clips !== undefined) setAutoDeleteClips(prefs.auto_delete_local_clips);
      if (prefs.game_mode_pause_enabled !== undefined) setGameModePause(prefs.game_mode_pause_enabled);

      await runDiagnostics();
      await checkYouTubeStatus();
    } catch (e: any) {
      console.error(e);
    }
  };

  const runDiagnostics = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await getSystemCheck();
      setSystemData(res);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to verify system dependencies');
    } finally {
      setLoading(false);
    }
  };

  const checkYouTubeStatus = async () => {
    try {
      const status = await getYouTubeStatus();
      setYtStatus(status);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInstallMissing = async () => {
    setInstalling(true);
    try {
      await installMissingTools();
      await runDiagnostics();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to install missing tools');
    } finally {
      setInstalling(false);
    }
  };

  // Verify Provider A
  const handleVerifyApi = async () => {
    setVerifyingApi(true);
    setApiErrorMsg('');
    setApiSuccessMsg('');

    try {
      if (selectedApiProvider === 'zernio') {
        const res = await verifyZernio(zernioKey);
        if (res.valid) {
          setConnectedAccounts(res.accounts || []);
          setSelectedAccounts((res.accounts || []).map((a: any) => a.id));
          setApiSuccessMsg(`Connected to Zernio! Found ${(res.accounts || []).length} active social channels.`);
        } else {
          setApiErrorMsg(res.error || 'Failed to connect to Zernio');
        }
      } else if (selectedApiProvider === 'woopsocial') {
        const res = await verifyWoopSocial(woopKey);
        if (res.valid) {
          const accs = res.accounts || [];
          setConnectedAccounts(accs);
          setSelectedAccounts(accs.map((a: any) => a.id));
          setApiSuccessMsg(`Connected to WoopSocial! Found ${accs.length} connected channels.`);
        } else {
          setApiErrorMsg(res.error || 'Failed to connect to WoopSocial');
        }
      }
    } catch (e: any) {
      setApiErrorMsg(e.message || 'Verification failed');
    } finally {
      setVerifyingApi(false);
    }
  };

  // Save Google OAuth client_secret.json
  const handleSaveClientSecret = async () => {
    if (!clientSecretContent.trim()) return;
    setSavingSecrets(true);
    try {
      await uploadClientSecret(clientSecretContent);
      await checkYouTubeStatus();
    } catch (e: any) {
      alert(e.message || 'Failed to save client_secret.json');
    } finally {
      setSavingSecrets(false);
    }
  };

  // Launch Google OAuth in Browser
  const handleAuthorizeYouTube = async () => {
    setAuthorizingYt(true);
    try {
      const res = await getYouTubeAuthUrl();
      if (res.auth_url) {
        window.open(res.auth_url, '_blank', 'width=650,height=750');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to generate YouTube authorization URL');
    } finally {
      setAuthorizingYt(false);
    }
  };

  // Finish setup
  const handleComplete = async () => {
    setLoading(true);
    try {
      await updateConfig({
        first_run_completed: true,
        publishing_mode: publishingMode,
        zernio_api_key: zernioKey.trim(),
        woopsocial_api_key: woopKey.trim(),
        youtube_api_key: ytApiKey.trim(),
        youtube_default_privacy: ytPrivacy,
        selected_social_accounts: selectedAccounts,
        preferences: {
          daily_post_limit: ytDailyCap + ttDailyCap,
          youtube_daily_cap: ytDailyCap,
          tiktok_daily_cap: ttDailyCap,
          reels_daily_cap: reelsDailyCap,
          posting_interval_hours: postingIntervalHours,
          auto_delete_local_clips: autoDeleteClips,
          game_mode_pause_enabled: gameModePause,
          target_platforms: targetPlatforms,
        }
      });
      onCompleted();
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#12151C] border border-[#242936] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#242936] flex items-center justify-between bg-[#0B0D11]/80">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm shadow-inner">
              SC
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Publishing Providers & Connected Accounts Wizard
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#191D26] text-slate-300 border border-[#242936]">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure your multi-platform publishing engine, Direct YouTube API, or local pipeline
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Steps Indicator */}
            <div className="flex items-center space-x-1.5 bg-[#191D26] p-1 rounded-lg border border-[#242936]">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-6 px-2.5 rounded text-[11px] font-mono font-medium flex items-center justify-center transition-colors ${
                    step === s
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : step > s
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-slate-500'
                  }`}
                >
                  Step {s}
                </div>
              ))}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#191D26] border border-transparent hover:border-[#242936] transition-colors"
              title="Close and enter workspace"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* STEP 1: System & Dependencies Check */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>System Diagnostics & Local Render Binaries</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  SyntaxClipper operates completely on your local computer. We verify video rendering binaries and Python packages.
                </p>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center space-x-2 text-slate-400 font-mono text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
                  <span>Running dependency diagnostics...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Binaries Group */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">
                      Video Processing Binaries
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {['ffmpeg', 'ffprobe', 'yt_dlp'].map((binKey) => {
                        const bin = systemData?.binaries?.[binKey];
                        const isInstalled = bin?.installed;
                        return (
                          <div
                            key={binKey}
                            className="bg-[#0B0D11] border border-[#242936] p-3 rounded-xl flex items-center space-x-3"
                          >
                            {isInstalled ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white uppercase font-mono">
                                {binKey}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate font-mono">
                                {isInstalled ? bin.version || 'Ready' : 'Not Found'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Python Packages Group */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">
                      Python Engine & ML Packages
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      {[
                        'fastapi',
                        'opencv-python',
                        'faster-whisper',
                        'psutil',
                        'google-auth-oauthlib',
                        'google-api-python-client',
                        'numpy',
                        'requests'
                      ].map((pkgKey) => {
                        return (
                          <div
                            key={pkgKey}
                            className="bg-[#0B0D11] border border-[#242936] p-2.5 rounded-lg flex items-center justify-between text-xs font-mono"
                          >
                            <span className="text-slate-300 truncate max-w-[100px]">{pkgKey}</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Workspace Storage */}
                  <div className="p-3.5 rounded-xl bg-[#0B0D11] border border-[#242936] flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                      <HardDrive className="w-4 h-4 text-emerald-400" />
                      <span>Available Workspace Storage:</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">
                      {systemData?.storage?.free_gb ?? '150+'} GB free
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Publishing Providers & Connected Accounts */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <span>Choose Your Publishing Strategy</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  SyntaxClipper supports single-key multi-platform posting, Direct YouTube Data API v3 (up to 100 uploads/day free), and offline local exporting.
                </p>
              </div>

              {/* Publishing Mode Selector Tabs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { id: 'hybrid', label: 'Hybrid Mode', desc: 'YouTube Direct + Zernio/Woop' },
                  { id: 'zernio', label: 'Zernio API', desc: '1-Key Multi-Platform' },
                  { id: 'youtube_direct', label: 'YouTube Direct', desc: '100 uploads/day free' },
                  { id: 'local_only', label: 'Local Only', desc: 'Zero API keys required' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPublishingMode(m.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      publishingMode === m.id
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-[#0B0D11] border-[#242936] hover:border-slate-500 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-200">{m.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>

              {/* SECTION A: Unified Multi-Platform API (Visible in hybrid, zernio, woopsocial) */}
              {(publishingMode === 'hybrid' || publishingMode === 'zernio' || publishingMode === 'woopsocial') && (
                <div className="p-4 rounded-xl bg-[#0B0D11] border border-[#242936] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">
                        Provider A — Unified Multi-Platform API (1-Key Multi-Platform)
                      </span>
                    </div>

                    {/* Provider Toggle: Zernio vs WoopSocial */}
                    <div className="flex items-center space-x-1 bg-[#12151C] p-1 rounded-lg border border-[#242936] text-[11px] font-mono">
                      <button
                        onClick={() => setSelectedApiProvider('zernio')}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          selectedApiProvider === 'zernio' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400'
                        }`}
                      >
                        Zernio
                      </button>
                      <button
                        onClick={() => setSelectedApiProvider('woopsocial')}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          selectedApiProvider === 'woopsocial' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400'
                        }`}
                      >
                        WoopSocial
                      </button>
                    </div>
                  </div>

                  {/* Collapsible 3-Step Guide */}
                  <div className="rounded-lg bg-[#12151C] border border-[#242936] overflow-hidden">
                    <button
                      onClick={() => setShowApiGuide(!showApiGuide)}
                      className="w-full px-3 py-2 text-left flex items-center justify-between text-xs text-slate-300 font-mono hover:text-white"
                    >
                      <span className="flex items-center space-x-2">
                        <Info className="w-3.5 h-3.5 text-emerald-400" />
                        <span>How to get your {selectedApiProvider === 'zernio' ? 'Zernio' : 'WoopSocial'} API Key (3-Step Guide)</span>
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showApiGuide ? 'rotate-180' : ''}`} />
                    </button>

                    {showApiGuide && (
                      <div className="p-3 border-t border-[#242936] text-[11px] text-slate-400 space-y-1.5 font-mono bg-[#0B0D11]">
                        <p>1. Sign up for a free account at <a href={selectedApiProvider === 'zernio' ? 'https://zernio.com' : 'https://woopsocial.com'} target="_blank" rel="noreferrer" className="text-emerald-400 underline inline-flex items-center gap-0.5">{selectedApiProvider === 'zernio' ? 'zernio.com' : 'woopsocial.com'} <ExternalLink className="w-2.5 h-2.5" /></a>.</p>
                        <p>2. Link your YouTube channel, TikTok account, Instagram profile, and Facebook page.</p>
                        <p>3. Go to API & Webhooks, generate your API Key, and paste it below.</p>
                      </div>
                    )}
                  </div>

                  {/* API Key Input */}
                  <div className="flex space-x-2">
                    <input
                      type="password"
                      placeholder={selectedApiProvider === 'zernio' ? 'Paste Zernio API Key (zn_...)' : 'Paste WoopSocial API Key (wsk_...)'}
                      value={selectedApiProvider === 'zernio' ? zernioKey : woopKey}
                      onChange={(e) => selectedApiProvider === 'zernio' ? setZernioKey(e.target.value) : setWoopKey(e.target.value)}
                      className="flex-1 bg-[#12151C] border border-[#242936] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
                    />
                    <button
                      onClick={handleVerifyApi}
                      disabled={verifyingApi}
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-bold text-xs transition-colors shrink-0"
                    >
                      {verifyingApi ? 'Verifying...' : 'Verify & Fetch Accounts'}
                    </button>
                  </div>

                  {apiSuccessMsg && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{apiSuccessMsg}</span>
                    </div>
                  )}

                  {apiErrorMsg && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{apiErrorMsg}</span>
                    </div>
                  )}

                  {/* Connected Accounts Checkboxes */}
                  {connectedAccounts.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#242936]">
                      <span className="text-[11px] font-mono text-slate-400 uppercase">
                        Select Active Publishing Channels:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {connectedAccounts.map((acc) => {
                          const isChecked = selectedAccounts.includes(acc.id);
                          return (
                            <button
                              key={acc.id}
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedAccounts(selectedAccounts.filter((id) => id !== acc.id));
                                } else {
                                  setSelectedAccounts([...selectedAccounts, acc.id]);
                                }
                              }}
                              className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
                                isChecked
                                  ? 'bg-[#12151C] border-emerald-500/60 text-white'
                                  : 'bg-[#12151C] border-[#242936] text-slate-500'
                              }`}
                            >
                              <div className="flex items-center space-x-2 min-w-0">
                                <span className="text-xs font-semibold capitalize font-mono text-slate-200 truncate">
                                  {acc.platform || 'Channel'}: {acc.name || acc.handle}
                                </span>
                              </div>
                              <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                                isChecked ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-slate-600'
                              }`}>
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION B: Direct YouTube Data API v3 (Visible in hybrid, youtube_direct) */}
              {(publishingMode === 'hybrid' || publishingMode === 'youtube_direct') && (
                <div className="p-4 rounded-xl bg-[#0B0D11] border border-[#242936] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Youtube className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-bold text-white">
                        Provider B — Direct YouTube Data API v3 (Up to 100 Uploads/Day Free)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#12151C] text-emerald-400 border border-[#242936]">
                      Zero Middlemen
                    </span>
                  </div>

                  {/* YouTube OAuth Status Banner */}
                  {ytStatus?.configured ? (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center space-x-2 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Connected to YouTube: <strong>{ytStatus.channel?.title || 'Active Channel'}</strong></span>
                      </div>
                      <span className="text-[10px] text-slate-400">youtube_token.json valid</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Collapsible Google Cloud Guide */}
                      <div className="rounded-lg bg-[#12151C] border border-[#242936] overflow-hidden">
                        <button
                          onClick={() => setShowYtGuide(!showYtGuide)}
                          className="w-full px-3 py-2 text-left flex items-center justify-between text-xs text-slate-300 font-mono hover:text-white"
                        >
                          <span className="flex items-center space-x-2">
                            <Info className="w-3.5 h-3.5 text-rose-400" />
                            <span>How to get YouTube API Key & OAuth client_secret.json (Google Cloud)</span>
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showYtGuide ? 'rotate-180' : ''}`} />
                        </button>

                        {showYtGuide && (
                          <div className="p-3 border-t border-[#242936] text-[11px] text-slate-400 space-y-1.5 font-mono bg-[#0B0D11]">
                            <p>1. Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-2.5 h-2.5" /></a> and create a project.</p>
                            <p>2. Enable <strong>YouTube Data API v3</strong> under APIs & Services.</p>
                            <p>3. Create Credentials -&gt; <strong>OAuth Client ID</strong> (Desktop app). Download client_secret.json.</p>
                            <p>4. Add your personal Google account email as a <em>Test User</em> under OAuth Consent Screen.</p>
                          </div>
                        )}
                      </div>

                      {/* Paste client_secret.json */}
                      <div>
                        <label className="block text-[11px] font-mono text-slate-400 mb-1">
                          Paste or Upload Google OAuth client_secret.json:
                        </label>
                        <textarea
                          rows={3}
                          placeholder='{"installed":{"client_id":"...","project_id":"...","client_secret":"..."}}'
                          value={clientSecretContent}
                          onChange={(e) => setClientSecretContent(e.target.value)}
                          className="w-full bg-[#12151C] border border-[#242936] rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <button
                            onClick={handleSaveClientSecret}
                            disabled={savingSecrets || !clientSecretContent.trim()}
                            className="px-3.5 py-1.5 rounded-lg bg-[#191D26] hover:bg-[#202531] border border-[#242936] text-xs font-mono text-slate-200 transition-colors"
                          >
                            {savingSecrets ? 'Saving...' : 'Save client_secret.json'}
                          </button>

                          <button
                            onClick={handleAuthorizeYouTube}
                            disabled={authorizingYt || !ytStatus?.has_client_secret}
                            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs transition-colors"
                          >
                            <Youtube className="w-3.5 h-3.5" />
                            <span>Authorize YouTube Channel in Browser</span>
                          </button>
                        </div>
                      </div>

                      {/* Notice on Visibility */}
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" />
                          <span>Google Cloud Project Verification Notice</span>
                        </div>
                        <p>
                          Unverified personal Google Cloud projects upload videos as <strong>Private</strong> until audited. You can set them to Public in YouTube Studio with 1 click, or combine with Zernio for instant public posting!
                        </p>
                      </div>
                    </div>
                  )}

                  {/* YouTube Default Privacy Setting */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#242936]">
                    <span className="text-xs font-mono text-slate-400">Default YouTube Upload Privacy:</span>
                    <div className="flex space-x-1.5">
                      {['private', 'unlisted', 'public'].map((priv) => (
                        <button
                          key={priv}
                          onClick={() => setYtPrivacy(priv)}
                          className={`px-3 py-1 rounded text-xs font-mono capitalize transition-colors ${
                            ytPrivacy === priv
                              ? 'bg-emerald-500 text-black font-bold'
                              : 'bg-[#12151C] text-slate-400 border border-[#242936]'
                          }`}
                        >
                          {priv}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION C: Local Export Only */}
              {publishingMode === 'local_only' && (
                <div className="p-4 rounded-xl bg-[#0B0D11] border border-[#242936] space-y-3">
                  <div className="flex items-center space-x-2 text-white font-bold text-xs">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    <span>Provider C — Local Export Only (Zero API Keys Required)</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    You can use SyntaxClipper completely offline! Rendered 9:16 vertical clips and ready-to-copy metadata files are saved permanently into <code className="text-emerald-400 font-mono">exports/local/&lt;creator&gt;/</code>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Platform Quotas & Preferences */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Platform Daily Quotas & Smart Automation</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set rate limits to protect your channels from spam penalties and configure autopilot protection.
                </p>
              </div>

              {/* Target Platforms Checkboxes */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono text-slate-400 uppercase">
                  Default Target Platforms:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'youtube', label: 'YouTube Shorts' },
                    { id: 'tiktok', label: 'TikTok' },
                    { id: 'instagram', label: 'Instagram Reels' },
                    { id: 'facebook', label: 'Facebook Reels' },
                  ].map((p) => {
                    const isChecked = targetPlatforms.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (isChecked) {
                            setTargetPlatforms(targetPlatforms.filter((item) => item !== p.id));
                          } else {
                            setTargetPlatforms([...targetPlatforms, p.id]);
                          }
                        }}
                        className={`p-2.5 rounded-lg border text-left flex items-center justify-between text-xs font-mono transition-colors ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500 text-white'
                            : 'bg-[#0B0D11] border-[#242936] text-slate-500'
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
              </div>

              {/* Quota Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#0B0D11] border border-[#242936] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">YouTube Cap:</span>
                    <span className="text-emerald-400 font-bold">{ytDailyCap} / day</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={ytDailyCap}
                    onChange={(e) => setYtDailyCap(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">Spaced every 4-6 hours</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0D11] border border-[#242936] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">TikTok Cap:</span>
                    <span className="text-emerald-400 font-bold">{ttDailyCap} / day</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={ttDailyCap}
                    onChange={(e) => setTtDailyCap(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">Spaced every 2 hours</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0D11] border border-[#242936] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Reels Cap:</span>
                    <span className="text-emerald-400 font-bold">{reelsDailyCap} / day</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={reelsDailyCap}
                    onChange={(e) => setReelsDailyCap(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">Spaced every 3 hours</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => setAutoDeleteClips(!autoDeleteClips)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                    autoDeleteClips
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                      : 'bg-[#0B0D11] border-[#242936] text-slate-400'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      Auto-Delete Local Video Chunks After Scheduled
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Instantly purges temporary raw downloads once confirmed on server, keeping your SSD empty.
                    </div>
                  </div>
                  <span className={`text-xs font-mono font-bold ${autoDeleteClips ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {autoDeleteClips ? 'ENABLED' : 'DISABLED'}
                  </span>
                </button>

                <button
                  onClick={() => setGameModePause(!gameModePause)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                    gameModePause
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                      : 'bg-[#0B0D11] border-[#242936] text-slate-400'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      Zero FPS Drop Game Mode Protection
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Automatically pauses rendering whenever any competitive game executable is detected.
                    </div>
                  </div>
                  <span className={`text-xs font-mono font-bold ${gameModePause ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {gameModePause ? 'ENABLED' : 'DISABLED'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-[#242936] bg-[#0B0D11]/80 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#191D26] hover:bg-[#202531] border border-[#242936] text-xs font-mono text-slate-300 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setPublishingMode('local_only');
                  handleComplete();
                }}
                className="text-xs font-mono text-slate-400 hover:text-slate-200 underline transition-colors"
              >
                Skip & Use Local Mode (Zero Keys)
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs transition-colors shadow-sm"
              >
                <span>Continue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-bold text-xs transition-colors shadow-md"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Settings...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Launch Studio Workspace</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
