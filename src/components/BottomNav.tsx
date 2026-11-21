import React from 'react';
import {
  ReceiptText,
  Target,
  BarChart3,
  Gauge,
  Plus,
} from 'lucide-react';
import { AppTab } from '../types';

interface BottomNavProps {
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
  onOpenAddExpense: () => void;
}

export function BottomNav({
  currentTab,
  setCurrentTab,
  onOpenAddExpense,
}: BottomNavProps) {
  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-app px-2 py-1 flex items-center justify-between safe-bottom shadow-lg transition-colors"
    >
      <button
        type="button"
        onClick={() => setCurrentTab('transactions')}
        className={`flex-1 flex flex-col items-center justify-center min-w-[44px] min-h-[48px] py-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer active:scale-95 ${
          currentTab === 'transactions'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
            : 'text-muted hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <ReceiptText className="w-5 h-5 mb-0.5" />
        <span>Expenses</span>
      </button>

      <button
        type="button"
        onClick={() => setCurrentTab('goals')}
        className={`flex-1 flex flex-col items-center justify-center min-w-[44px] min-h-[48px] py-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer active:scale-95 ${
          currentTab === 'goals'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
            : 'text-muted hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <Target className="w-5 h-5 mb-0.5" />
        <span>Goals</span>
      </button>

      {/* Floating Center Plus Button */}
      <div className="relative -top-3.5 flex items-center justify-center px-1 shrink-0">
        <button
          type="button"
          onClick={onOpenAddExpense}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-700 active:from-indigo-700 active:to-indigo-800 text-white flex items-center justify-center shadow-lg shadow-indigo-600/35 active:scale-90 transition-all cursor-pointer ring-4 ring-app"
          aria-label="Add Expense"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setCurrentTab('analytics')}
        className={`flex-1 flex flex-col items-center justify-center min-w-[44px] min-h-[48px] py-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer active:scale-95 ${
          currentTab === 'analytics'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
            : 'text-muted hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <BarChart3 className="w-5 h-5 mb-0.5" />
        <span>Analytics</span>
      </button>

      <button
        type="button"
        onClick={() => setCurrentTab('budgets')}
        className={`flex-1 flex flex-col items-center justify-center min-w-[44px] min-h-[48px] py-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer active:scale-95 ${
          currentTab === 'budgets'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
            : 'text-muted hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <Gauge className="w-5 h-5 mb-0.5" />
        <span>Budget</span>
      </button>
    </nav>
  );
}
