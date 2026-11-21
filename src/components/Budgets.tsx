import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { Budget } from '../types';
import { formatINR, formatDisplayDate } from '../lib/currency';
import { DynamicIcon } from '../lib/icons';
import {
  getMonthKey,
  shiftMonthKey,
  formatMonthLabel,
  getNextResetLabel,
  getDaysLeftInMonth,
  calculateBudgetProgress,
  calculateBudgetsOverview,
} from '../lib/budgetCalculations';
import { BudgetModal } from './BudgetModal';
import {
  Gauge,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  CalendarClock,
  AlertCircle,
} from 'lucide-react';

export function Budgets() {
  const { user } = useAuth();
  const {
    budgets,
    categories,
    expenses,
    deleteBudget,
  } = useAccount();

  const currentUserUid = user?.uid || '';
  const currentMonthKey = getMonthKey();

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'shared' | 'individual'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [expandedBudgetIds, setExpandedBudgetIds] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const progressItems = useMemo(() => {
    return budgets.map((budget) =>
      calculateBudgetProgress(budget, expenses, selectedMonth, currentUserUid)
    );
  }, [budgets, expenses, selectedMonth, currentUserUid]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return progressItems.filter((item) => {
      if (scopeFilter !== 'all' && item.budget.scope !== scopeFilter) return false;
      if (q) {
        const cat = categories.find((c) => c.categoryId === item.budget.categoryId);
        const catName = (cat?.name || item.budget.categoryName).toLowerCase();
        if (!catName.includes(q)) return false;
      }
      return true;
    });
  }, [progressItems, scopeFilter, searchQuery, categories]);

  const overview = useMemo(
    () => calculateBudgetsOverview(progressItems),
    [progressItems]
  );

  const daysLeft = getDaysLeftInMonth(selectedMonth);
  const nextResetLabel = getNextResetLabel(selectedMonth);
  const isCurrentMonth = selectedMonth === currentMonthKey;

  const handleOpenCreate = () => {
    setEditingBudget(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setModalOpen(true);
  };

  const handleDelete = async (budget: Budget) => {
    setActionError(null);
    setDeletingId(budget.budgetId);
    try {
      await deleteBudget(budget);
      setConfirmDeleteId(null);
    } catch (err: any) {
      setActionError(err.message || 'Could not delete budget.');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpand = (budgetId: string) => {
    setExpandedBudgetIds((prev) => ({ ...prev, [budgetId]: !prev[budgetId] }));
  };

  const overviewBarColor =
    overview.exceededCount > 0 || overview.overallPercentage >= 100
      ? 'bg-red-600'
      : overview.overallPercentage >= 60
      ? 'bg-yellow-500'
      : 'bg-green-500';

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Monthly Budgets</h1>
          <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5 shrink-0" />
            <span>
              Category spending limits · Resets monthly on the 1st
              {daysLeft !== null ? ` (next reset ${nextResetLabel}, ${daysLeft}d left)` : ''}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Month Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl border border-app bg-surface">
            <button
              type="button"
              onClick={() => setSelectedMonth((m) => shiftMonthKey(m, -1))}
              aria-label="Previous month"
              className="p-1.5 rounded-lg hover:bg-surface-subtle text-muted hover:text-slate-900 dark:hover:text-white cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold whitespace-nowrap tabular-nums">
              {formatMonthLabel(selectedMonth)}
            </span>
            <button
              type="button"
              disabled={isCurrentMonth}
              onClick={() => setSelectedMonth((m) => shiftMonthKey(m, 1))}
              aria-label="Next month"
              className="p-1.5 rounded-lg hover:bg-surface-subtle text-muted hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonthKey)}
                className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 text-[11px] font-semibold cursor-pointer"
              >
                Current
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Budget</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Monthly Overview Hero Card */}
      <div className="p-5 sm:p-6 rounded-3xl border bg-surface border-app shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-muted">
              {formatMonthLabel(selectedMonth)} Budgeted Spend
            </div>
            <div className="flex flex-wrap items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums">
                {formatINR(overview.totalSpent)}
              </span>
              <span className="text-xs sm:text-sm font-medium text-muted tabular-nums">
                of {formatINR(overview.totalBudgeted)} total limit
              </span>
            </div>
            <div className="text-xs text-muted mt-1.5 flex flex-wrap items-center gap-2 tabular-nums">
              <span>{budgets.length} {budgets.length === 1 ? 'category' : 'categories'}</span>
              <span aria-hidden="true">·</span>
              <span>{overview.sharedCount} shared</span>
              <span aria-hidden="true">·</span>
              <span>{overview.individualCount} individual</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-app md:pl-6 shrink-0">
            <div>
              <div className="text-[11px] font-medium text-muted">Healthy</div>
              <div className="text-base font-extrabold tabular-nums mt-0.5 text-green-700 dark:text-green-400">
                {overview.healthyCount}
              </div>
              <div className="text-[11px] text-muted">&lt;60% used</div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-muted">Caution</div>
              <div className="text-base font-extrabold tabular-nums mt-0.5 text-yellow-700 dark:text-yellow-400">
                {overview.cautionCount}
              </div>
              <div className="text-[11px] text-muted">60%–99%</div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-muted">At / Over</div>
              <div className="text-base font-extrabold tabular-nums mt-0.5 text-red-600 dark:text-red-400">
                {overview.exceededCount}
              </div>
              <div className="text-[11px] text-muted">100%+</div>
            </div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div>
          <div className="h-3 w-full rounded-full overflow-hidden bg-surface-subtle">
            <div
              className={`h-full rounded-full transition-all duration-300 ${overviewBarColor}`}
              style={{ width: `${Math.min(100, overview.overallPercentage)}%` }}
            />
          </div>
          {overview.totalBudgeted > 0 && (
            <div className="flex items-center justify-between text-[11px] text-muted mt-2 tabular-nums">
              <span>{overview.overallPercentage}% of total budgeted amount used</span>
              <span>{formatINR(overview.totalRemaining)} remaining across limits</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl border bg-surface border-app shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-subtle overflow-x-auto">
          <button
            type="button"
            onClick={() => setScopeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[36px] ${
              scopeFilter === 'all'
                ? 'bg-surface shadow-xs text-slate-900 dark:text-white'
                : 'text-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All ({budgets.length})
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('shared')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[36px] ${
              scopeFilter === 'shared'
                ? 'bg-surface shadow-xs text-slate-900 dark:text-white'
                : 'text-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Shared ({overview.sharedCount})
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('individual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[36px] ${
              scopeFilter === 'individual'
                ? 'bg-surface shadow-xs text-slate-900 dark:text-white'
                : 'text-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Individual ({overview.individualCount})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by category..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-app bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-2.5 text-muted hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Budgets List / Empty State */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border bg-surface border-app">
          <Gauge className="w-12 h-12 mx-auto text-muted opacity-30 mb-3" />
          <h3 className="text-sm font-bold">
            {budgets.length === 0 ? 'No Monthly Budgets Set Yet' : 'No Matching Budgets'}
          </h3>
          <p className="text-xs text-muted mt-1 max-w-md mx-auto">
            {budgets.length === 0
              ? 'Set monthly spending caps for categories like Shopping, Food, or Travel. Budgets reset automatically at the start of every month.'
              : 'Try clearing your search filter or switching between Shared and Individual budgets.'}
          </p>
          {budgets.length === 0 ? (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Budget</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setScopeFilter('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 rounded-xl border border-app text-xs font-semibold cursor-pointer hover:bg-surface-subtle min-h-[40px]"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredItems.map(({ budget, spent, matchingExpenses, statusInfo }) => {
            const cat = categories.find((c) => c.categoryId === budget.categoryId);
            const catName = cat?.name || budget.categoryName;
            const catColor = cat?.colour || '#6366F1';
            const catIcon = cat?.icon || 'Tag';
            const isExpanded = Boolean(expandedBudgetIds[budget.budgetId]);

            const isRed = statusInfo.status === 'crossed' || statusInfo.status === 'reached';
            const isYellow = statusInfo.status === 'caution';

            const statusTextColor = isRed
              ? 'text-red-600 dark:text-red-400'
              : isYellow
              ? 'text-yellow-700 dark:text-yellow-400'
              : 'text-green-700 dark:text-green-400';

            const barFillClass = isRed
              ? 'bg-red-600'
              : isYellow
              ? 'bg-yellow-500'
              : 'bg-green-500';

            const statusMessage =
              statusInfo.status === 'crossed'
                ? `Limit crossed — ${formatINR(statusInfo.overAmount)} over monthly limit`
                : statusInfo.status === 'reached'
                ? 'Limit reached — 100% of monthly budget used'
                : statusInfo.status === 'caution'
                ? `Caution: Within 60%+ of budget (${Math.round(statusInfo.percentage)}% used · ${formatINR(statusInfo.remainingAmount)} left)`
                : `Healthily within budget (${formatINR(statusInfo.remainingAmount)} left)`;

            return (
              <article
                key={budget.budgetId}
                className="p-5 sm:p-6 rounded-3xl border bg-surface border-app shadow-xs flex flex-col justify-between gap-4"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${catColor}20`, color: catColor }}
                    >
                      <DynamicIcon name={catIcon} className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold tracking-tight truncate">
                        {catName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted mt-0.5">
                        <span>
                          {budget.scope === 'shared'
                            ? 'Shared budget'
                            : 'Individual budget (Private)'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Resets monthly</span>
                      </div>
                    </div>
                  </div>

                  {/* Edit & Delete Controls */}
                  {confirmDeleteId === budget.budgetId ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDelete(budget)}
                        disabled={deletingId === budget.budgetId}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-40 min-h-[36px]"
                      >
                        {deletingId === budget.budgetId ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deletingId === budget.budgetId}
                        className="px-2.5 py-1.5 rounded-lg border border-app text-[11px] font-medium cursor-pointer min-h-[36px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(budget)}
                        aria-label={`Edit budget for ${catName}`}
                        title="Edit Monthly Limit"
                        className="p-2 rounded-xl hover:bg-surface-subtle text-muted hover:text-indigo-600 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(budget.budgetId)}
                        aria-label={`Delete budget for ${catName}`}
                        title="Delete Budget"
                        className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-muted hover:text-red-600 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress & Threshold Readout */}
                <div className="space-y-2.5">
                  <div className="flex items-baseline justify-between gap-2 tabular-nums">
                    <div>
                      <span className="text-lg font-black">{formatINR(spent)}</span>
                      <span className="text-xs text-muted ml-1.5">
                        of {formatINR(budget.monthlyLimit)}
                      </span>
                    </div>
                    <span className={`text-xs font-extrabold ${statusTextColor}`}>
                      {Math.round(statusInfo.percentage)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-3 w-full rounded-full overflow-hidden bg-surface-subtle">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barFillClass}`}
                      style={{ width: `${statusInfo.cappedPercentage}%` }}
                    />
                  </div>

                  {/* Explicit Status Text + Icon */}
                  <div className={`flex items-start gap-1.5 text-xs font-bold ${statusTextColor}`}>
                    {isRed ? (
                      <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : isYellow ? (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{statusMessage}</span>
                  </div>
                </div>

                {/* Footer & Expandable Category Expenses */}
                <div className="pt-3 border-t border-app flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-muted">
                    {budget.scope === 'shared'
                      ? 'Tracks all account expenses in category'
                      : 'Tracks your attributed share in category'}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleExpand(budget.budgetId)}
                    aria-expanded={isExpanded}
                    className="px-3 py-1.5 rounded-xl border border-app bg-surface-subtle hover:bg-surface text-xs font-semibold text-muted hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px] whitespace-nowrap shrink-0"
                  >
                    <span>Expenses ({matchingExpenses.length})</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="pt-3 border-t border-app space-y-2">
                    {matchingExpenses.length === 0 ? (
                      <p className="py-3 text-center text-xs text-muted">
                        No {catName} expenses recorded in {formatMonthLabel(selectedMonth)}.
                      </p>
                    ) : (
                      <div className="divide-y divide-app max-h-56 overflow-y-auto pr-1">
                        {matchingExpenses.map((exp) => (
                          <div
                            key={exp.expenseId}
                            className="py-2 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{exp.title}</div>
                              <div className="text-[11px] text-muted mt-0.5">
                                {formatDisplayDate(exp.expenseDate)} · {exp.paidByName}
                              </div>
                            </div>
                            <div className="font-bold tabular-nums shrink-0">
                              {formatINR(exp.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Create / Edit Budget Modal */}
      <BudgetModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingBudget(null);
        }}
        editingBudget={editingBudget}
      />
    </div>
  );
}
