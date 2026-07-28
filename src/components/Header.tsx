import React from 'react';
import { ShieldCheck, Mail, Send, Activity, Sparkles } from 'lucide-react';
import { TabType } from '../types';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenAiModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenAiModal }) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-[1700px] mx-auto px-4">
        {/* Single Ultra-Compact Horizontal Bar */}
        <div className="flex items-center justify-between h-13 gap-4">
          {/* Left: Brand */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-extrabold text-gray-900 tracking-tight">Mail Verifier & Merge Pro</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                Horizan v3.0
              </span>
            </div>
          </div>

          {/* Center: Inline Tab Switcher */}
          <nav className="flex items-center space-x-1.5 bg-gray-100/90 p-1 rounded-xl border border-gray-200/80 shadow-inner shrink-0">
            <button
              onClick={() => setActiveTab('verify')}
              className={`flex items-center space-x-1.5 px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'verify'
                  ? 'bg-white text-blue-600 shadow-xs border border-gray-200/60'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify MX</span>
            </button>
            <button
              onClick={() => setActiveTab('merge')}
              className={`flex items-center space-x-1.5 px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'merge'
                  ? 'bg-white text-blue-600 shadow-xs border border-gray-200/60'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Mail Merge Studio</span>
            </button>
            <button
              onClick={() => setActiveTab('autoreply')}
              className={`flex items-center space-x-1.5 px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'autoreply'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
                  : 'text-purple-700 hover:text-purple-900 hover:bg-purple-100/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>✨ Magic Auto-Reply</span>
            </button>
          </nav>

          {/* Right: Actions & Status */}
          <div className="flex items-center space-x-2.5 shrink-0">
            {onOpenAiModal && (
              <button
                onClick={onOpenAiModal}
                className="flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors shadow-2xs"
                title="Use Gemini AI to write or polish campaign copy"
              >
                <Sparkles className="w-3 h-3 text-purple-600" />
                <span>AI Copy</span>
              </button>
            )}

            <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 text-[11px] font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden md:inline">100% Inbox Placement</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
