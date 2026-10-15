import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Member } from '../types';
import { THEMES, AppThemeId } from '../theme';
import {
  X,
  Download,
  FileSpreadsheet,
  FileJson,
  Layers,
  Palette,
  Cloud,
  Receipt,
  Plus,
  PieChart,
  Scale,
  Users,
  Share2,
  Check,
  Smartphone,
  ChevronRight,
  Database
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface NavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'list' | 'add' | 'monthly' | 'split' | 'household';
  onSelectTab: (tab: 'list' | 'add' | 'monthly' | 'split' | 'household') => void;
  onOpenThemeModal: () => void;
  onOpenCategoryManager: () => void;
  onOpenDriveModal: () => void;
  onDownloadCSV: () => void;
  onDownloadJSON: () => void;
  googleUser: User | null;
  currentTheme: AppThemeId;
  householdId: string;
  categoryCount: number;
  expenseCount: number;
  members: Member[];
  onShareLink: () => void;
  copiedLink: boolean;
}

export const NavDrawer: React.FC<NavDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenThemeModal,
  onOpenCategoryManager,
  onOpenDriveModal,
  onDownloadCSV,
  onDownloadJSON,
  googleUser,
  currentTheme,
  householdId,
  categoryCount,
  expenseCount,
  members,
  onShareLink,
  copiedLink,
}) => {
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const { isInstallable, install } = usePWAInstall();

  if (!isOpen) return null;

  const currentThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Semi-transparent backdrop with click-to-close */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel (Material 3 Navigation Drawer) */}
      <div className="relative w-80 max-w-[85vw] h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col z-10 overflow-y-auto animate-in slide-in-from-left duration-200 rounded-r-3xl">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight leading-tight">
              Couple<span className="text-emerald-600 dark:text-emerald-400">Split</span>
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Household {householdId}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 p-3 space-y-4">
          {/* Navigation Views */}
          <div className="space-y-1">
            <div className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
              Views
            </div>

            <button
              onClick={() => {
                onSelectTab('list');
                onClose();
              }}
              className={`w-full px-3.5 py-2.5 rounded-full text-left flex items-center gap-3 transition text-xs font-semibold cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950/80 dark:text-emerald-200'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Daily Expenses</span>
            </button>

            <button
              onClick={() => {
                onSelectTab('add');
                onClose();
              }}
              className={`w-full px-3.5 py-2.5 rounded-full text-left flex items-center gap-3 transition text-xs font-semibold cursor-pointer ${
                activeTab === 'add'
                  ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950/80 dark:text-emerald-200'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Expense</span>
            </button>

            <button
              onClick={() => {
                onSelectTab('monthly');
                onClose();
              }}
              className={`w-full px-3.5 py-2.5 rounded-full text-left flex items-center gap-3 transition text-xs font-semibold cursor-pointer ${
                activeTab === 'monthly'
                  ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950/80 dark:text-emerald-200'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Monthly Breakdown</span>
            </button>

            <button
              onClick={() => {
                onSelectTab('split');
                onClose();
              }}
              className={`w-full px-3.5 py-2.5 rounded-full text-left flex items-center gap-3 transition text-xs font-semibold cursor-pointer ${
                activeTab === 'split'
                  ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950/80 dark:text-emerald-200'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Split & Settle</span>
            </button>

            <button
              onClick={() => {
                onSelectTab('household');
                onClose();
              }}
              className={`w-full px-3.5 py-2.5 rounded-full text-left flex items-center gap-3 transition text-xs font-semibold cursor-pointer ${
                activeTab === 'household'
                  ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950/80 dark:text-emerald-200'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Household & Drive</span>
            </button>
          </div>

          {/* Tools & Settings Section */}
          <div className="space-y-1 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
              Settings & Data
            </div>

            {/* 1. Download Option */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-800/40">
              <button
                onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      Download Statement
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      CSV & JSON backup
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    showDownloadOptions ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {showDownloadOptions && (
                <div className="p-2 space-y-1 border-t border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <button
                    onClick={() => {
                      onDownloadCSV();
                      onClose();
                    }}
                    className="w-full p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left flex items-center gap-2 transition text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Download CSV (Excel)</span>
                  </button>

                  <button
                    onClick={() => {
                      onDownloadJSON();
                      onClose();
                    }}
                    className="w-full p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left flex items-center gap-2 transition text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <FileJson className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Download JSON Backup</span>
                  </button>

                  {isInstallable && (
                    <button
                      onClick={() => {
                        install();
                        onClose();
                      }}
                      className="w-full p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left flex items-center gap-2 transition text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Install App (PWA)</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. Change Category */}
            <button
              onClick={() => {
                onClose();
                onOpenCategoryManager();
              }}
              className="w-full p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Expense Categories
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {categoryCount} configured categories
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* 3. Theme Selector */}
            <button
              onClick={() => {
                onClose();
                onOpenThemeModal();
              }}
              className="w-full p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Color Theme
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {currentThemeObj.name}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* 4. Drive Sync */}
            <button
              onClick={() => {
                onClose();
                onOpenDriveModal();
              }}
              className="w-full p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Google Drive Backup
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {googleUser ? googleUser.email : 'Cross-device sync'}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2 shrink-0">
          <button
            onClick={onShareLink}
            className="w-full py-2.5 px-3 rounded-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedLink ? 'Link Copied' : 'Share Household Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
