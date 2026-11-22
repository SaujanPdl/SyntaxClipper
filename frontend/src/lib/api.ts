/**
 * api.ts - SyntaxClipper API Client
 */

const API_BASE = '/api';

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    let errMessage = `HTTP error ${res.status}`;
    try {
      const err = await res.json();
      errMessage = err.detail || err.message || errMessage;
    } catch {}
    throw new Error(errMessage);
  }
  return res.json();
}

// System
export const getSystemCheck = () => fetchJson<any>('/system/check');
export const installMissingTools = () => fetchJson<any>('/system/install-missing', { method: 'POST' });
export const installMissingBinaries = () => fetchJson<any>('/system/install-binaries', { method: 'POST' });
export const checkUpdate = () => fetchJson<any>('/system/check-update');
export const applyUpdate = () => fetchJson<any>('/system/apply-update', { method: 'POST' });
export const getVersion = () => fetchJson<any>('/system/version');

// Config
export const getConfig = () => fetchJson<any>('/config');
export const updateConfig = (payload: any) => fetchJson<any>('/config', { method: 'POST', body: JSON.stringify(payload) });

// Publishing Providers (Zernio, WoopSocial, Direct YouTube, Local)
export const verifyZernio = (api_key: string) => fetchJson<any>('/providers/zernio/verify', { method: 'POST', body: JSON.stringify({ api_key }) });
export const getYouTubeStatus = () => fetchJson<any>('/providers/youtube/status');
export const uploadClientSecret = (content: string) => fetchJson<any>('/providers/youtube/client-secret', { method: 'POST', body: JSON.stringify({ content }) });
export const uploadYouTubeToken = (content: string) => fetchJson<any>('/providers/youtube/token', { method: 'POST', body: JSON.stringify({ content }) });
export const getYouTubeAuthUrl = (redirect_uri?: string) => fetchJson<any>('/providers/youtube/auth-url', { method: 'POST', body: JSON.stringify({ redirect_uri }) });
export const exchangeYouTubeCode = (code: string, redirect_uri?: string) => fetchJson<any>('/providers/youtube/callback', { method: 'POST', body: JSON.stringify({ code, redirect_uri }) });
export const updateProviderSettings = (payload: any) => fetchJson<any>('/providers/settings', { method: 'POST', body: JSON.stringify(payload) });

// Unified Queue & Publishing Schedule API
export const getQueueStatus = () => fetchJson<any>('/queue/status');
export const getQueuePosts = (status?: string) => fetchJson<any>(`/queue/posts${status ? `?status=${status}` : ''}`);
export const retryQueuePost = (postId: string) => fetchJson<any>(`/queue/retry/${postId}`, { method: 'POST' });
export const deleteQueuePost = (postId: string) => fetchJson<any>(`/queue/posts/${postId}`, { method: 'DELETE' });

// WoopSocial API (backward-compatible aliases routing to dynamic queue)
export const verifyWoopSocial = (api_key: string) => fetchJson<any>('/woopsocial/verify', { method: 'POST', body: JSON.stringify({ api_key }) });
export const getWoopSocialAccounts = () => fetchJson<any>('/woopsocial/accounts');
export const getWoopSocialPosts = (status?: string) => fetchJson<any>(`/queue/posts${status ? `?status=${status}` : ''}`);
export const retryWoopSocialPost = (postId: string) => fetchJson<any>(`/queue/retry/${postId}`, { method: 'POST' });
export const deleteWoopSocialPost = (postId: string) => fetchJson<any>(`/queue/posts/${postId}`, { method: 'DELETE' });

// Clips & Manual Studio
export const getReadyClips = () => fetchJson<any>('/clips/ready');
export const manualGenerateClip = (payload: any) => fetchJson<any>('/clips/manual-generate', { method: 'POST', body: JSON.stringify(payload) });
export const getJobStatus = (jobId: string) => fetchJson<any>(`/clips/jobs/${jobId}`);
export const scheduleClipDirect = (payload: any) => fetchJson<any>('/clips/schedule-direct', { method: 'POST', body: JSON.stringify(payload) });
export const publishMultiPlatform = (payload: any) => fetchJson<any>('/clips/publish-multi', { method: 'POST', body: JSON.stringify(payload) });
export const deleteReadyClip = (clipName: string) => fetchJson<any>(`/clips/${clipName}`, { method: 'DELETE' });

export const inspectVideoUrl = (url: string) => fetchJson<any>('/clips/inspect', { method: 'POST', body: JSON.stringify({ url }) });
export const previewVideoFrame = (url: string, timestamp_sec: number) => fetchJson<any>('/clips/preview-frame', { method: 'POST', body: JSON.stringify({ url, timestamp_sec }) });
export const findBestMoments = (duration: number, title?: string) => fetchJson<any>('/clips/find-moments', { method: 'POST', body: JSON.stringify({ duration, title }) });

export const getLocalExports = () => fetchJson<any>('/clips/exports/local');
export const openExportFolder = (subpath?: string) => fetchJson<any>(`/clips/exports/open-folder?subpath=${encodeURIComponent(subpath || '')}`, { method: 'POST' });
export const publishLocalExport = (payload: any) => fetchJson<any>('/clips/exports/publish', { method: 'POST', body: JSON.stringify(payload) });

// Library
export const getCreators = () => fetchJson<any>('/library/creators');
export const createCreator = (payload: any) => fetchJson<any>('/library/creators', { method: 'POST', body: JSON.stringify(payload) });
export const updateCreator = (id: string, payload: any) => fetchJson<any>(`/library/creators/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteCreator = (id: string) => fetchJson<any>(`/library/creators/${id}`, { method: 'DELETE' });

export const getGames = () => fetchJson<any>('/library/games');
export const createGame = (payload: any) => fetchJson<any>('/library/games', { method: 'POST', body: JSON.stringify(payload) });
export const updateGame = (id: string, payload: any) => fetchJson<any>(`/library/games/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteGame = (id: string) => fetchJson<any>(`/library/games/${id}`, { method: 'DELETE' });
export const toggleRoundRobin = (round_robin_enabled: boolean) => fetchJson<any>('/library/round-robin', { method: 'POST', body: JSON.stringify({ round_robin_enabled }) });
export const loadStarterPresets = () => fetchJson<any>('/library/load-presets', { method: 'POST' });

// Autopilot
export const getAutopilotStatus = () => fetchJson<any>('/autopilot/status');
export const startAutopilot = () => fetchJson<any>('/autopilot/start', { method: 'POST' });
export const stopAutopilot = () => fetchJson<any>('/autopilot/stop', { method: 'POST' });
export const toggleAutopilot = (enabled: boolean) => fetchJson<any>('/autopilot/toggle', { method: 'POST', body: JSON.stringify({ enabled }) });
export const installAutopilotTask = () => fetchJson<any>('/autopilot/task/install', { method: 'POST' });
export const uninstallAutopilotTask = () => fetchJson<any>('/autopilot/task/uninstall', { method: 'POST' });
export const getAutopilotQuotas = () => fetchJson<any>('/autopilot/quotas');
export const getAutopilotLogs = (limit = 60) => fetchJson<any>(`/autopilot/logs?limit=${limit}`);

// Analytics
export const getAnalyticsOverview = () => fetchJson<any>('/analytics/overview');
export const generateWeeklyReport = () => fetchJson<any>('/analytics/generate-report', { method: 'POST' });
