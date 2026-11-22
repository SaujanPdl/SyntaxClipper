'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Gamepad2,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCw,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FolderOpen,
  Share2,
  Sparkles
} from 'lucide-react';
import {
  getCreators,
  createCreator,
  updateCreator,
  deleteCreator,
  getGames,
  createGame,
  updateGame,
  deleteGame,
  toggleRoundRobin,
  loadStarterPresets,
  getConfig
} from '@/lib/api';

export default function LibraryView() {
  const [activeTab, setActiveTab] = useState<'creators' | 'games'>('creators');
  const [creators, setCreators] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [roundRobin, setRoundRobin] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // Creator Modal
  const [showCreatorModal, setShowCreatorModal] = useState<boolean>(false);
  const [creatorEditingId, setCreatorEditingId] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState<string>('');
  const [creatorHandle, setCreatorHandle] = useState<string>('');
  const [creatorUrl, setCreatorUrl] = useState<string>('');
  const [creatorQuery, setCreatorQuery] = useState<string>('');
  const [creatorFacecamMode, setCreatorFacecamMode] = useState<string>('auto'); // auto, split, fullscreen
  const [creatorDestinationMode, setCreatorDestinationMode] = useState<string>('auto'); // auto, local_only
  const [creatorMaxClips, setCreatorMaxClips] = useState<number>(2);

  // Game Modal
  const [showGameModal, setShowGameModal] = useState<boolean>(false);
  const [gameEditingId, setGameEditingId] = useState<string | null>(null);
  const [gameName, setGameName] = useState<string>('');
  const [gameQuery, setGameQuery] = useState<string>('');
  const [gameMinDuration, setGameMinDuration] = useState<number>(25);
  const [gameUploadFilter, setGameUploadFilter] = useState<string>('last_14_days');
  const [gameHashtags, setGameHashtags] = useState<string>('#gaming #shorts #viral');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cRes, gRes, cfg] = await Promise.all([getCreators(), getGames(), getConfig()]);
      setCreators(cRes.creators || []);
      setGames(gRes.games || []);
      setConfig(cfg);
      setRoundRobin(cfg.preferences?.round_robin_enabled ?? true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRoundRobin = async () => {
    try {
      const next = !roundRobin;
      setRoundRobin(next);
      await toggleRoundRobin(next);
    } catch (e) {
      console.error(e);
    }
  };

  // Dynamic destination badge resolver
  const getDestinationBadge = (destMode?: string) => {
    if (destMode === 'local_only' || destMode === 'local') {
      return {
        label: 'Local Exports Only',
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      };
    }
    const mode = config?.publishing_mode || 'hybrid';
    if (mode === 'hybrid') {
      return {
        label: 'Hybrid (YT Direct + Zernio)',
        className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      };
    }
    if (mode === 'zernio') {
      return {
        label: 'Zernio Cloud',
        className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      };
    }
    if (mode === 'youtube_direct') {
      return {
        label: 'YouTube Direct',
        className: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      };
    }
    if (mode === 'woopsocial') {
      return {
        label: 'WoopSocial Cloud',
        className: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      };
    }
    if (mode === 'local_only') {
      return {
        label: 'Local Exports Only',
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      };
    }
    return {
      label: 'Cloud Queue (Auto)',
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    };
  };

  // Creator Actions
  const handleOpenAddCreator = () => {
    setCreatorEditingId(null);
    setCreatorName('');
    setCreatorHandle('');
    setCreatorUrl('');
    setCreatorQuery('');
    setCreatorFacecamMode('auto');
    setCreatorDestinationMode('auto');
    setCreatorMaxClips(2);
    setShowCreatorModal(true);
  };

  const handleLoadStarterPresets = async () => {
    try {
      setLoading(true);
      await loadStarterPresets();
      await loadAll();
    } catch (e: any) {
      alert(`Failed to load presets: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditCreator = (c: any) => {
    setCreatorEditingId(c.id);
    setCreatorName(c.name || '');
    setCreatorHandle(c.handle || '');
    setCreatorUrl(c.channel_url || '');
    setCreatorQuery(c.search_query || '');
    setCreatorFacecamMode(c.facecam_mode || (c.facecam_only ? 'split' : 'auto'));
    setCreatorDestinationMode(c.destination_mode === 'local_only' ? 'local_only' : 'auto');
    setCreatorMaxClips(c.max_clips_per_day ?? 2);
    setShowCreatorModal(true);
  };

  const handleSaveCreator = async () => {
    if (!creatorName.trim()) return;
    const payload = {
      name: creatorName.trim(),
      handle: creatorHandle.trim() || `@${creatorName.trim().replace(/\s+/g, '')}`,
      channel_url: creatorUrl.trim(),
      search_query: creatorQuery.trim() || `ytsearch10:"${creatorName.trim()} gameplay"`,
      facecam_mode: creatorFacecamMode,
      destination_mode: creatorDestinationMode,
      facecam_only: creatorFacecamMode === 'split',
      max_clips_per_day: creatorMaxClips,
      enabled: true,
    };

    try {
      if (creatorEditingId) {
        await updateCreator(creatorEditingId, payload);
      } else {
        await createCreator(payload);
      }
      setShowCreatorModal(false);
      await loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleCreator = async (c: any) => {
    try {
      await updateCreator(c.id, { enabled: !c.enabled });
      await loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCreator = async (id: string) => {
    if (!confirm('Are you sure you want to delete this creator?')) return;
    try {
      await deleteCreator(id);
      await loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  // Game Actions
  const handleOpenAddGame = () => {
    setGameEditingId(null);
    setGameName('');
    setGameQuery('');
    setGameMinDuration(25);
    setGameUploadFilter('last_14_days');
    setGameHashtags('#gaming #shorts #viral');
    setShowGameModal(true);
  };

  const handleOpenEditGame = (g: any) => {
    setGameEditingId(g.id);
    setGameName(g.name || '');
    setGameQuery(g.query || '');
    setGameMinDuration(g.min_duration_minutes ?? 25);
    setGameUploadFilter(g.upload_date_filter || 'last_14_days');
    setGameHashtags(g.hashtags || '#gaming #shorts #viral');
    setShowGameModal(true);
  };

  const handleSaveGame = async () => {
    if (!gameName.trim()) return;
    const payload = {
      name: gameName.trim(),
      query: gameQuery.trim() || `${gameName.trim()} live stream gameplay facecam`,
      min_duration_minutes: gameMinDuration,
      upload_date_filter: gameUploadFilter,
      hashtags: gameHashtags.trim(),
      enabled: true,
    };

    try {
      if (gameEditingId) {
        await updateGame(gameEditingId, payload);
      } else {
        await createGame(payload);
      }
      setShowGameModal(false);
      await loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleGame = async (g: any) => {
    try {
      await updateGame(g.id, { enabled: !g.enabled });
      await loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGame = async (id: string) => {
    if (!confirm('Are you sure you want to delete this game niche?')) return;
    try {
      await deleteGame(id);
      await loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Round-Robin Status */}
      <div className="bg-[#12151C] border border-[#242936] rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            Tracked Creators & Games Library
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage monitored streamers, 3-way facecam layout modes, destination routing, and niches.
          </p>
        </div>

        {/* Round-Robin Toggle Card */}
        <div
          onClick={handleToggleRoundRobin}
          className="bg-[#0B0D11] border border-[#242936] hover:border-slate-700 px-4 py-2.5 rounded-lg flex items-center space-x-3 cursor-pointer transition-colors"
        >
          <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <RotateCw className={`w-4 h-4 ${roundRobin ? 'animate-spin-slow' : ''}`} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-200 flex items-center gap-2">
              <span>Balanced Round-Robin Autopilot</span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                  roundRobin
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {roundRobin ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500">
              Rotates evenly across enabled sources without repeating
            </div>
          </div>
          <div
            className={`w-9 h-4.5 rounded-full p-0.5 transition-colors ${
              roundRobin ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                roundRobin ? 'translate-x-4.5' : 'translate-x-0'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#242936] pb-3">
        <button
          onClick={() => setActiveTab('creators')}
          className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 transition-colors ${
            activeTab === 'creators'
              ? 'bg-[#191D26] text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-[#12151C]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Creators Pool ({creators.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('games')}
          className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 transition-colors ${
            activeTab === 'games'
              ? 'bg-[#191D26] text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-[#12151C]'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span>Games & Niches ({games.length})</span>
        </button>
      </div>

      {/* Tab 1: Creators */}
      {activeTab === 'creators' && (
        <div className="bg-[#12151C] border border-[#242936] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#242936] flex items-center justify-between bg-[#0B0D11]">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              Active Streamers Pool
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleLoadStarterPresets}
                className="py-1.5 px-3 rounded-lg bg-[#191D26] hover:bg-[#1E232F] border border-[#2B3142] text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                title="Load top creators (IShowSpeed, Kai Cenat, CaseOh, BeastBoyShub)"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Load Starter Presets</span>
              </button>
              <button
                onClick={handleOpenAddCreator}
                className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Creator</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0D11] border-b border-[#242936] text-slate-400 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Streamer Name</th>
                  <th className="py-3 px-4">Handle / Channel</th>
                  <th className="py-3 px-4">3-Way Layout Mode</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Max Clips/Day</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242936]">
                {creators.map((c) => {
                  const mode = c.facecam_mode || (c.facecam_only ? 'split' : 'auto');
                  const dest = c.destination_mode || 'woopsocial';
                  return (
                    <tr key={c.id} className="hover:bg-[#191D26]/50 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleCreator(c)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-colors ${
                            c.enabled
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {c.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200">{c.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{c.handle || '-'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            mode === 'split'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : mode === 'fullscreen'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {mode === 'split' ? 'Webcam + Gameplay Split' : mode === 'fullscreen' ? 'Full-Screen Gameplay' : 'Auto-Detect Webcam'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const badge = getDestinationBadge(dest);
                          return (
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badge.className}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {c.max_clips_per_day || 2} / day
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditCreator(c)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#191D26]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCreator(c.id)}
                          className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Games */}
      {activeTab === 'games' && (
        <div className="bg-[#12151C] border border-[#242936] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#242936] flex items-center justify-between bg-[#0B0D11]">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              Active Game Categories & Niches
            </span>
            <button
              onClick={handleOpenAddGame}
              className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Game Niche</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0D11] border-b border-[#242936] text-slate-400 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Game Niche</th>
                  <th className="py-3 px-4">Search Query</th>
                  <th className="py-3 px-4">Min Duration</th>
                  <th className="py-3 px-4">Date Filter</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242936]">
                {games.map((g) => (
                  <tr key={g.id} className="hover:bg-[#191D26]/50 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleGame(g)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-colors ${
                          g.enabled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {g.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">{g.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-400 truncate max-w-xs">{g.query}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{g.min_duration_minutes}m</td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {g.upload_date_filter}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditGame(g)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#191D26]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGame(g.id)}
                        className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Creator Modal with 3-Way Facecam Mode and Destination Routing */}
      {showCreatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#12151C] border border-[#242936] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              {creatorEditingId ? 'Edit Tracked Creator' : 'Add New Creator'}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300">Creator / Streamer Name</label>
                <input
                  type="text"
                  placeholder="e.g. BeastBoyShub"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-[#0B0D11] border border-[#242936] rounded text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-300">Handle / Tag</label>
                <input
                  type="text"
                  placeholder="e.g. @BeastBoyShub"
                  value={creatorHandle}
                  onChange={(e) => setCreatorHandle(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-[#0B0D11] border border-[#242936] rounded text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-300">Custom yt-dlp Search Query</label>
                <input
                  type="text"
                  placeholder='e.g. ytsearch10:"BeastBoyShub GTA 6"'
                  value={creatorQuery}
                  onChange={(e) => setCreatorQuery(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-[#0B0D11] border border-[#242936] rounded text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* 3-Way Facecam Mode */}
              <div>
                <label className="text-slate-300">Facecam Layout Mode</label>
                <select
                  value={creatorFacecamMode}
                  onChange={(e) => setCreatorFacecamMode(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-[#0B0D11] border border-[#242936] rounded text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
                >
                  <option value="split">Webcam + Gameplay Split (42% Top Webcam / 58% Bottom Gameplay)</option>
                  <option value="fullscreen">Full-Screen Gameplay (No Webcam - 9:16 Center Crop)</option>
                  <option value="auto">Auto-Detect Webcam (Uses Split if Webcam Detected, Full-Screen otherwise)</option>
                </select>
              </div>

              {/* Destination Mode */}
              <div>
                <label className="text-slate-300">Destination Routing</label>
                <select
                  value={creatorDestinationMode}
                  onChange={(e) => setCreatorDestinationMode(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-[#0B0D11] border border-[#242936] rounded text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
                >
                  <option value="auto">
                    Auto-Publish via Active Provider ({getDestinationBadge('auto').label})
                  </option>
                  <option value="local_only">Save Locally Only (exports/local/ — Do Not Post)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300">Max Clips Per Day</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={creatorMaxClips}
                  onChange={(e) => setCreatorMaxClips(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-1.5 bg-[#0B0D11] border border-[#242936] rounded text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#242936]">
              <button
                onClick={() => setShowCreatorModal(false)}
                className="px-3 py-1.5 rounded border border-[#242936] text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCreator}
                className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs"
              >
                Save Creator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Modal */}
      {showGameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#12151C] border border-[#242936] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              {gameEditingId ? 'Edit Game Niche' : 'Add New Game Niche'}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300">Game / Niche Name</label>
                <input
                  type="text"
                  placeholder="e.g. GTA 6 or Valorant"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-[#0B0D11] border border-[#242936] rounded text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-300">Search Query / Keywords</label>
                <input
                  type="text"
                  placeholder="e.g. GTA 6 live stream gameplay facecam"
                  value={gameQuery}
                  onChange={(e) => setGameQuery(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-[#0B0D11] border border-[#242936] rounded text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300">Min Duration (Min)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={gameMinDuration}
                    onChange={(e) => setGameMinDuration(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-1.5 bg-[#0B0D11] border border-[#242936] rounded text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300">Upload Date Filter</label>
                  <select
                    value={gameUploadFilter}
                    onChange={(e) => setGameUploadFilter(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 bg-[#0B0D11] border border-[#242936] rounded text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="last_7_days">Last 7 Days</option>
                    <option value="last_14_days">Last 14 Days</option>
                    <option value="last_30_days">Last 30 Days</option>
                    <option value="all_time">All Time</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-slate-300">Hashtags</label>
                <input
                  type="text"
                  placeholder="#gta6 #gaming #shorts"
                  value={gameHashtags}
                  onChange={(e) => setGameHashtags(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-[#0B0D11] border border-[#242936] rounded text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#242936]">
              <button
                onClick={() => setShowGameModal(false)}
                className="px-3 py-1.5 rounded border border-[#242936] text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGame}
                className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs"
              >
                Save Game Niche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
