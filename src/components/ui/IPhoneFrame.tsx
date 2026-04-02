'use client';

import { ReactNode } from 'react';

interface IPhoneFrameProps {
  children: ReactNode;
}

export default function IPhoneFrame({ children }: IPhoneFrameProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08040E] p-4 md:p-8">
      <div className="iphone-frame flex flex-col">
        {/* Dynamic Island */}
        <div className="iphone-notch" />

        {/* Status Bar */}
        <div className="iphone-status-bar flex-shrink-0">
          <span className="text-xs font-semibold">9:41</span>
          <div className="flex items-center gap-1">
            <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" className="opacity-80">
              <rect x="0" y="8" width="3" height="4" rx="0.5" />
              <rect x="4.5" y="5" width="3" height="7" rx="0.5" />
              <rect x="9" y="2" width="3" height="10" rx="0.5" />
              <rect x="13.5" y="0" width="2.5" height="12" rx="0.5" opacity="0.3" />
            </svg>
            <svg width="14" height="12" viewBox="0 0 24 20" fill="currentColor" className="opacity-80">
              <path d="M12 18a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
              <path d="M8.1 15a5.5 5.5 0 017.8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M4.9 11.5a10 10 0 0114.2 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M1.7 8a14.5 14.5 0 0120.6 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
            </svg>
            <div className="flex items-center gap-0.5">
              <div className="w-[22px] h-[11px] rounded-[3px] border border-current opacity-80 flex items-center p-[1.5px]">
                <div className="w-[65%] h-full rounded-[1.5px] bg-current" />
              </div>
              <div className="w-[1.5px] h-[5px] rounded-r-sm bg-current opacity-40" />
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>

        {/* Home Indicator */}
        <div className="iphone-home-indicator" />
      </div>
    </div>
  );
}
