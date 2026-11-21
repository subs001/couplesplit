import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { useTheme } from '../context/ThemeContext';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Plus,
  Moon,
  Sun,
  Flower2,
  LogOut,
  UserPlus,
  LayoutDashboard,
  ReceiptText,
  Target,
  BarChart3,
  Gauge,
  Settings as SettingsIcon,
  Layers,
  Menu,
  X,
} from 'lucide-react';
import { AppTab } from '../types';

interface NavbarProps {
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
  onOpenAddExpense: () => void;
}

const SIDE_NAV_ITEMS: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'transactions', label: 'Expenses', icon: ReceiptText },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'budgets', label: 'Budget', icon: Gauge },
];

export function Navbar({
  currentTab,
  setCurrentTab,
  onOpenAddExpense,
}: NavbarProps) {
  const { userProfile, signOut } = useAuth();
  const { account, partnerProfile, partnerEmailPending } = useAccount();
  const { theme, setTheme } = useTheme();
  const [sideNavOpen, setSideNavOpen] = useState(false);

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('sakura');
    else if (theme === 'sakura') setTheme('pastel');
    else setTheme('light');
  };

  useEffect(() => {
    if (!sideNavOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSideNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sideNavOpen]);

  const handleNavigate = (tab: AppTab) => {
    setCurrentTab(tab);
    setSideNavOpen(false);
  };

  const isConnected = account && account.memberUids.length >= 2;

  return (
    <header className="sticky top-0 w-full border-b border-app transition-colors safe-top z-40">
      <div className="absolute inset-0 -z-10 bg-surface/90 backdrop-blur-md pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand & Desktop Tabs */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            type="button"
            onClick={() => setCurrentTab('dashboard')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <img src="/icon.svg" alt="DuoSpend Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                <span>DuoSpend</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted whitespace-nowrap">
                <span>{account?.name || 'Shared Tracker'}</span>
              </div>
            </div>
          </button>

          {/* Desktop Navigation Tabs (Settings lives in Side Navigation Pane) */}
          <nav aria-label="Desktop Navigation" className="hidden md:flex items-center gap-1 pl-4 border-l border-app">
            <button
              type="button"
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                currentTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('transactions')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                currentTab === 'transactions'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ReceiptText className="w-4 h-4" />
              <span>Expenses</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('goals')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                currentTab === 'goals'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Goals</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('budgets')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                currentTab === 'budgets'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Gauge className="w-4 h-4" />
              <span>Budget</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('analytics')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                currentTab === 'analytics'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* In-App PWA Install Button */}
          <PWAInstallButton variant="button" />

          {/* Duo Connection Indicator */}
          <button
            type="button"
            onClick={() => setCurrentTab('settings')}
            title="View Shared Account Members"
            className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-app bg-surface-subtle text-xs hover:border-indigo-400 transition-colors cursor-pointer"
          >
            <div className="flex -space-x-1.5 items-center">
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  className="w-5 h-5 rounded-full object-cover ring-2 ring-white dark:ring-slate-900"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-[10px] ring-2 ring-white dark:ring-slate-900">
                  {userProfile?.displayName?.charAt(0) || 'U'}
                </div>
              )}

              {isConnected && partnerProfile?.photoURL ? (
                <img
                  src={partnerProfile.photoURL}
                  alt={partnerProfile.displayName}
                  className="w-5 h-5 rounded-full object-cover ring-2 ring-white dark:ring-slate-900"
                />
              ) : isConnected && partnerProfile ? (
                <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px] ring-2 ring-white dark:ring-slate-900">
                  {partnerProfile.displayName.charAt(0)}
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center ring-2 ring-white dark:ring-slate-900 text-[10px]">
                  <UserPlus className="w-3 h-3" />
                </div>
              )}
            </div>

            <span className="hidden sm:inline text-[11px] font-medium whitespace-nowrap">
              {isConnected
                ? `${userProfile?.displayName?.split(' ')[0]} & ${partnerProfile?.displayName?.split(' ')[0] || 'Partner'}`
                : partnerEmailPending
                ? 'Invite Pending'
                : '1/2 Members'}
            </span>
          </button>

          {/* Quick Add Expense button (Desktop) */}
          <button
            type="button"
            onClick={onOpenAddExpense}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>

          {/* Theme switcher */}
          <button
            type="button"
            onClick={cycleTheme}
            aria-label={`Switch theme (current: ${theme})`}
            title={`Current theme: ${theme}. Click to switch.`}
            className="p-2 rounded-xl border border-app hover:bg-surface-subtle transition-colors cursor-pointer text-muted hover:text-slate-900 dark:hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
            {theme === 'dark' && <Moon className="w-4 h-4 text-indigo-400" />}
            {theme === 'sakura' && <Flower2 className="w-4 h-4 text-rose-500" />}
            {theme === 'pastel' && <Layers className="w-4 h-4 text-[#5A7AE0]" />}
          </button>

          {/* 3-line Menu Button (replaces profile icon at top right) */}
          <button
            type="button"
            onClick={() => setSideNavOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={sideNavOpen}
            aria-controls="side-navigation-pane"
            className="p-2 rounded-xl border border-app hover:bg-surface-subtle transition-colors cursor-pointer text-muted hover:text-slate-900 dark:hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Side Navigation Pane Portal */}
      {sideNavOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Blurred Backdrop */}
            <div
              className="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity"
              onClick={() => setSideNavOpen(false)}
              aria-hidden="true"
            />

            {/* Opaque Side Drawer */}
            <aside
              id="side-navigation-pane"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation Menu"
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="relative z-10 w-72 sm:w-80 max-w-[85vw] h-full bg-surface border-l border-app shadow-2xl flex flex-col justify-between p-4 safe-top safe-bottom"
            >
              <div className="space-y-4 overflow-y-auto">
                {/* User Header & Close Button */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-app">
                  <div className="flex items-center gap-3 min-w-0">
                    {userProfile?.photoURL ? (
                      <img
                        src={userProfile.photoURL}
                        alt={userProfile.displayName}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                        {userProfile?.displayName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{userProfile?.displayName}</p>
                      <p className="text-[11px] text-muted truncate">{userProfile?.email}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSideNavOpen(false)}
                    aria-label="Close navigation menu"
                    className="p-2 rounded-xl hover:bg-surface-subtle text-muted hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Primary Pages */}
                <nav aria-label="Side Navigation" className="space-y-1">
                  {SIDE_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavigate(item.id)}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer min-h-[44px] text-left ${
                          active
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                            : 'hover:bg-surface-subtle text-muted hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}

                  <div className="my-2 border-t border-app" />

                  <button
                    type="button"
                    onClick={() => handleNavigate('settings')}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer min-h-[44px] text-left ${
                      currentTab === 'settings'
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                        : 'hover:bg-surface-subtle text-muted hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <SettingsIcon className="w-4 h-4 shrink-0" />
                    <span>Settings</span>
                  </button>
                </nav>
              </div>

              {/* Footer Sign Out */}
              <div className="pt-3 border-t border-app">
                <button
                  type="button"
                  onClick={() => {
                    setSideNavOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-sm font-semibold transition-colors cursor-pointer min-h-[44px] text-left"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            </aside>
          </div>,
          document.body
        )}
    </header>
  );
}
