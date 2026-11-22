'use client';

import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  text: string;
  position?: 'top' | 'bottom' | 'right' | 'left';
  className?: string;
}

export default function HelpTooltip({ text, position = 'top', className = '' }: HelpTooltipProps) {
  const [visible, setVisible] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-1.5';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-1.5';
    }
  };

  return (
    <div
      className={`relative inline-flex items-center select-none ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      aria-label={text}
    >
      <span className="w-3.5 h-3.5 rounded-full bg-[#161922] hover:bg-[#1E2330] border border-[#2B3142] hover:border-emerald-500/50 flex items-center justify-center text-[9px] font-mono font-bold text-slate-400 hover:text-emerald-400 cursor-help transition-all duration-150">
        ?
      </span>

      {visible && (
        <div
          className={`absolute ${getPositionClasses()} z-50 w-64 p-2.5 rounded-xl bg-[#0E1117] border border-[#262B38] text-slate-200 text-xs leading-relaxed shadow-2xl backdrop-blur-md pointer-events-none animate-in fade-in duration-150 font-sans`}
          role="tooltip"
        >
          <div className="flex items-start space-x-1.5">
            <span className="text-[10px] text-emerald-400 font-mono font-bold mt-0.5 shrink-0">TIP:</span>
            <span className="text-slate-300 text-[11px]">{text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
