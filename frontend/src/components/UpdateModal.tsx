'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ArrowUpCircle,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { applyUpdate } from '@/lib/api';

interface UpdateModalProps {
  updateInfo: {
    update_available: boolean;
    current_version: string;
    latest_version: string;
    changelog: string;
    release_url: string;
    commit_sha?: string;
    remote_sha?: string;
  };
  onClose: () => void;
}

export default function UpdateModal({ updateInfo, onClose }: UpdateModalProps) {
  const [upgrading, setUpgrading] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleApplyUpdate = async () => {
    setUpgrading(true);
    setErrorMsg('');
    setProgressMsg('Preserving local configuration & API keys into backup_config/...');

    try {
      setTimeout(() => {
        setProgressMsg('Fetching latest source code from GitHub...');
      }, 1200);

      const res = await applyUpdate();
      setProgressMsg('Update applied! Restarting SyntaxClipper...');
      setSuccess(true);

      // Reload page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 6000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to apply update from GitHub.');
      setUpgrading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#12151C] border border-[#242936] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#242936] flex items-center justify-between bg-[#161922]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                SyntaxClipper Update Available
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                by Syntax Nepal • Official GitHub Release
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E222D] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Version Comparison */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0D11] border border-[#242936]">
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Current</span>
              <span className="font-mono text-slate-300 font-semibold">
                v{updateInfo.current_version}
              </span>
            </div>
            <ArrowUpCircle className="w-5 h-5 text-emerald-400 animate-bounce" />
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-emerald-400 block font-semibold">New Available</span>
              <span className="font-mono text-emerald-400 font-bold">
                {updateInfo.latest_version}
              </span>
            </div>
          </div>

          {/* Changelog notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider">
              Release Notes & Improvements
            </label>
            <div className="p-3.5 rounded-xl bg-[#0B0D11] border border-[#242936] max-h-48 overflow-y-auto font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
              {updateInfo.changelog || 'Performance improvements, bug fixes, and feature updates.'}
            </div>
          </div>

          {/* Safety Guarantee Notice */}
          <div className="p-3 rounded-xl bg-[#161922] border border-[#242936] flex items-start space-x-2.5 text-[11px] text-slate-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Your local API keys, video queues, export folders, and custom creator libraries are automatically backed up and 100% preserved.
            </span>
          </div>

          {/* Progress / Success Message */}
          {upgrading && (
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-300 flex items-center space-x-2.5 font-mono text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
              <span>{progressMsg}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 flex items-center space-x-2.5 font-mono text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Update installed successfully! Reloading studio in a few seconds...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 flex items-center space-x-2.5 font-mono text-xs">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#242936] bg-[#161922] flex items-center justify-between gap-3">
          <a
            href={updateInfo.release_url || 'https://github.com/SaujanPdl/SyntaxClipper'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors font-mono"
          >
            <span>View on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              disabled={upgrading}
              className="px-3.5 py-2 rounded-lg bg-[#0E1015] border border-[#242936] text-xs font-mono text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            >
              Remind Later
            </button>

            <button
              onClick={handleApplyUpdate}
              disabled={upgrading || success}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              {upgrading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Upgrading...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Restarting...</span>
                </>
              ) : (
                <>
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                  <span>Upgrade & Restart Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
