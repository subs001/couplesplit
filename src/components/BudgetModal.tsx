import React, { useState, useEffect, useMemo } from 'react';
import { useAccount } from '../context/AccountContext';
import { Budget, BudgetScope } from '../types';
import { DynamicIcon } from '../lib/icons';
import { checkBudgetConflict } from '../lib/budgetCalculations';
import {
  X,
  Check,
  AlertCircle,
  Users,
  User,
  Gauge,
} from 'lucide-react';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBudget?: Budget | null;
}

export function BudgetModal({ isOpen, onClose, editingBudget }: BudgetModalProps) {
  const {
    categories,
    sharedBudgets,
    individualBudgets,
    addBudget,
    updateBudget,
  } = useAccount();

  const [categoryId, setCategoryId] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [scope, setScope] = useState<BudgetScope>('shared');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingBudget) {
      setCategoryId(editingBudget.categoryId);
      setMonthlyLimit(editingBudget.monthlyLimit.toString());
      setScope(editingBudget.scope);
    } else {
      // Pick first category that has no budget yet, fallback to first category
      const firstUnbudgeted = categories.find(
        (c) =>
          !sharedBudgets.some((b) => b.categoryId === c.categoryId) &&
          !individualBudgets.some((b) => b.categoryId === c.categoryId)
      );
      setCategoryId(firstUnbudgeted?.categoryId || categories[0]?.categoryId || '');
      setMonthlyLimit('');
      setScope('shared');
    }
    setErrorMsg(null);
  }, [editingBudget, isOpen, categories, sharedBudgets, individualBudgets]);

  const sharedConflict = useMemo(() => {
    if (!categoryId || editingBudget) return { allowed: true };
    return checkBudgetConflict(categoryId, 'shared', sharedBudgets, individualBudgets);
  }, [categoryId, editingBudget, sharedBudgets, individualBudgets]);

  const individualConflict = useMemo(() => {
    if (!categoryId || editingBudget) return { allowed: true };
    return checkBudgetConflict(categoryId, 'individual', sharedBudgets, individualBudgets);
  }, [categoryId, editingBudget, sharedBudgets, individualBudgets]);

  const activeConflict = scope === 'shared' ? sharedConflict : individualConflict;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedLimit = parseFloat(monthlyLimit);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      setErrorMsg('Please enter a valid monthly limit greater than 0.');
      return;
    }

    if (!editingBudget) {
      if (!categoryId) {
        setErrorMsg('Please select a category.');
        return;
      }
      if (!activeConflict.allowed) {
        setErrorMsg(activeConflict.reason || 'Budget conflict for this category.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingBudget) {
        await updateBudget(editingBudget, { monthlyLimit: parsedLimit });
      } else {
        await addBudget({
          categoryId,
          monthlyLimit: parsedLimit,
          scope,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save budget.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-modal-title"
        style={{ backgroundColor: 'var(--bg-surface)' }}
        className="w-full max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl border-t sm:border border-app shadow-2xl p-5 sm:p-6 my-0 sm:my-8 max-h-[92vh] overflow-y-auto relative safe-bottom"
      >
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close budget modal"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-subtle text-muted hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 id="budget-modal-title" className="text-lg sm:text-xl font-bold tracking-tight">
              {editingBudget ? 'Edit Monthly Budget' : 'Set Monthly Budget'}
            </h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Track category spending with automatic monthly resets on the 1st.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold">
                Category <span className="text-rose-500">*</span>
              </label>
              {editingBudget && (
                <span className="text-[11px] text-muted">Locked on edit</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 border border-app rounded-xl bg-surface-subtle/50">
              {categories.map((cat) => {
                const isSelected = categoryId === cat.categoryId;
                const hasShared = sharedBudgets.some((b) => b.categoryId === cat.categoryId);
                const hasIndividual = individualBudgets.some((b) => b.categoryId === cat.categoryId);
                const statusTag = hasShared ? 'Shared' : hasIndividual ? 'Individual' : null;

                return (
                  <button
                    key={cat.categoryId}
                    type="button"
                    disabled={Boolean(editingBudget)}
                    onClick={() => setCategoryId(cat.categoryId)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[36px] ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                        : 'bg-surface border border-app text-muted hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <DynamicIcon
                      name={cat.icon}
                      className="w-3.5 h-3.5"
                      style={{ color: isSelected ? '#ffffff' : cat.colour }}
                    />
                    <span>{cat.name}</span>
                    {statusTag && !editingBudget && (
                      <span
                        className={`text-[10px] opacity-80 ${
                          isSelected ? 'text-indigo-100' : 'text-muted'
                        }`}
                      >
                        · {statusTag}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monthly Limit */}
          <div>
            <label htmlFor="budget-limit-input" className="block text-xs font-semibold mb-1">
              Monthly Limit (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-muted font-bold text-sm">₹</span>
              <input
                id="budget-limit-input"
                type="number"
                step="0.01"
                min="1"
                required
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                placeholder="e.g. 10000"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-app bg-transparent text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              />
            </div>
            <p className="text-[11px] text-muted mt-1">
              Alerts appear at 60% usage (caution) and 100%+ (limit reached / crossed).
            </p>
          </div>

          {/* Scope Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold">Budget Type</label>
              {editingBudget && (
                <span className="text-[11px] text-muted">Delete to switch type</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={Boolean(editingBudget)}
                onClick={() => setScope('shared')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[76px] ${
                  scope === 'shared'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200 ring-1 ring-indigo-600'
                    : 'border-app bg-surface-subtle text-muted hover:border-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Shared Budget</span>
                </div>
                <p className="text-[11px] opacity-80 mt-1">
                  One shared limit synced for both partners. Tracks all category spend.
                </p>
              </button>

              <button
                type="button"
                disabled={Boolean(editingBudget)}
                onClick={() => setScope('individual')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[76px] ${
                  scope === 'individual'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200 ring-1 ring-indigo-600'
                    : 'border-app bg-surface-subtle text-muted hover:border-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <User className="w-4 h-4 shrink-0" />
                  <span>Individual Budget</span>
                </div>
                <p className="text-[11px] opacity-80 mt-1">
                  Private to your account (not synced). Tracks your share in this category.
                </p>
              </button>
            </div>

            {!editingBudget && !activeConflict.allowed && (
              <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{activeConflict.reason}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-app">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl border border-app text-xs font-semibold text-muted hover:text-slate-900 dark:hover:text-white cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!editingBudget && !activeConflict.allowed)}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editingBudget ? 'Save Limit' : 'Create Budget'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
