import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { useTheme } from '../context/ThemeContext';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Users,
  Plus,
  Moon,
  Sun,
  Flower2,
  LogOut,
  UserPlus,
  LayoutDashboard,
  ReceiptText,
  BarChart3,
  Settings as SettingsIcon,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'dashboard' | 'transactions' | 'analytics' | 'settings';
  setCurrentTab: (tab: 'dashboard' | 'transactions' | 'analytics' | 'settings') => void;
  onOpenAddExpense: () => void;
}

export function Navbar({
  currentTab,
  setCurrentTab,
  onOpenAddExpense,
}: NavbarProps) {
  const { userProfile, signOut } = useAuth();
  const { account, partnerProfile, partnerEmailPending } = useAccount();
  const { theme, setTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('sakura');
    else setTheme('light');
  };

  const isConnected = account && account.memberUids.length >= 2;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md border-b bg-surface/90 border-app transition-colors safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand & Duo Status */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-rose-500 to-amber-500 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-1.5">
                <span>DuoSpend</span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  2P
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Real-Time Sync</span>
              </div>
            </div>
          </button>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-app">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentTab('transactions')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'transactions'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ReceiptText className="w-4 h-4" />
              <span>Transactions</span>
            </button>

            <button
              onClick={() => setCurrentTab('analytics')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'analytics'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => setCurrentTab('settings')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'settings'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* In-App PWA Install Button */}
          <PWAInstallButton variant="button" />

          {/* Duo Connection Indicator Pill */}
          <button
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

            <span className="hidden sm:inline text-[11px] font-medium">
              {isConnected
                ? `${userProfile?.displayName?.split(' ')[0]} & ${partnerProfile?.displayName?.split(' ')[0] || 'Partner'}`
                : partnerEmailPending
                ? 'Invite Pending'
                : '1/2 Members'}
            </span>
          </button>

          {/* Quick Add Expense button (Desktop) */}
          <button
            onClick={onOpenAddExpense}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>

          {/* Theme switcher */}
          <button
            onClick={cycleTheme}
            title={`Current theme: ${theme}. Click to switch.`}
            className="p-2 rounded-xl border border-app hover:bg-surface-subtle transition-colors cursor-pointer text-muted hover:text-slate-900 dark:hover:text-white"
          >
            {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
            {theme === 'dark' && <Moon className="w-4 h-4 text-indigo-400" />}
            {theme === 'sakura' && <Flower2 className="w-4 h-4 text-rose-500" />}
          </button>

          {/* User profile & sign out dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center rounded-full p-0.5 ring-2 ring-transparent hover:ring-indigo-300 transition-all cursor-pointer"
            >
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  {userProfile?.displayName?.charAt(0) || 'U'}
                </div>
              )}
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border shadow-xl bg-surface border-app p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-app mb-1">
                    <p className="font-semibold truncate">{userProfile?.displayName}</p>
                    <p className="text-[11px] text-muted truncate">{userProfile?.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setCurrentTab('settings');
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-subtle text-left transition-colors cursor-pointer font-medium"
                  >
                    <SettingsIcon className="w-4 h-4 text-muted" />
                    <span>Settings & Account</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-left transition-colors cursor-pointer font-medium mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
