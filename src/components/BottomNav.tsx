import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
} from 'lucide-react';

interface BottomNavProps {
  currentTab: 'dashboard' | 'transactions' | 'analytics' | 'settings';
  setCurrentTab: (tab: 'dashboard' | 'transactions' | 'analytics' | 'settings') => void;
  onOpenAddExpense: () => void;
}

export function BottomNav({
  currentTab,
  setCurrentTab,
  onOpenAddExpense,
}: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-app px-3 py-1 flex items-center justify-around safe-bottom shadow-lg transition-colors">
      <button
        onClick={() => setCurrentTab('dashboard')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer active:scale-95 ${
          currentTab === 'dashboard'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
            : 'text-muted hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 mb-0.5" />
        <span>Home</span>
      </button>

      <button
        onClick={() => setCurrentTab('transactions')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer active:scale-95 ${
          currentTab === 'transactions'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
            : 'text-muted hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <ReceiptText className="w-5 h-5 mb-0.5" />
        <span>Expenses</span>
      </button>

      {/* Floating Center Plus Button */}
      <div className="relative -top-4 flex items-center justify-center">
        <button
          onClick={onOpenAddExpense}
          className="w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-700 active:from-indigo-700 active:to-indigo-800 text-white flex items-center justify-center shadow-lg shadow-indigo-600/35 active:scale-90 transition-all cursor-pointer ring-4 ring-app"
          aria-label="Add Expense"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      </div>

      <button
        onClick={() => setCurrentTab('analytics')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer active:scale-95 ${
          currentTab === 'analytics'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
            : 'text-muted hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <BarChart3 className="w-5 h-5 mb-0.5" />
        <span>Analytics</span>
      </button>

      <button
        onClick={() => setCurrentTab('settings')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer active:scale-95 ${
          currentTab === 'settings'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
            : 'text-muted hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <SettingsIcon className="w-5 h-5 mb-0.5" />
        <span>Settings</span>
      </button>
    </nav>
  );
}
