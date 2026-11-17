import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { Goal, GoalScope } from '../types';
import {
  X,
  Check,
  AlertCircle,
  Users,
  User,
  Landmark,
  Calendar,
  EyeOff,
  Eye,
  Target,
} from 'lucide-react';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGoal?: Goal | null;
}

const SAVINGS_ACCOUNT_SUGGESTIONS = [
  'HDFC Savings',
  'SBI Joint',
  'ICICI Savings',
  'Axis Savings',
  'Liquid Fund',
  'FD / RD',
];

function getDefaultTargetDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function GoalModal({ isOpen, onClose, editingGoal }: GoalModalProps) {
  const { user } = useAuth();
  const { addGoal, updateGoal } = useAccount();

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savingsAccount, setSavingsAccount] = useState('');
  const [targetDate, setTargetDate] = useState(getDefaultTargetDate());
  const [scope, setScope] = useState<GoalScope>('shared');
  const [isHiddenFromPartner, setIsHiddenFromPartner] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentUserUid = user?.uid || '';
  const canChangeScopeAndPrivacy = !editingGoal || editingGoal.createdBy === currentUserUid;

  useEffect(() => {
    if (editingGoal) {
      setName(editingGoal.name);
      setTargetAmount(editingGoal.targetAmount.toString());
      setSavingsAccount(editingGoal.savingsAccount);
      setTargetDate(editingGoal.targetDate);
      setScope(editingGoal.scope);
      setIsHiddenFromPartner(Boolean(editingGoal.isHiddenFromPartner));
    } else {
      setName('');
      setTargetAmount('');
      setSavingsAccount('');
      setTargetDate(getDefaultTargetDate());
      setScope('shared');
      setIsHiddenFromPartner(false);
    }
    setErrorMsg(null);
  }, [editingGoal, isOpen]);

  if (!isOpen) return null;

  const handleScopeChange = (nextScope: GoalScope) => {
    if (!canChangeScopeAndPrivacy) return;
    setScope(nextScope);
    if (nextScope === 'shared') {
      setIsHiddenFromPartner(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Please enter a goal name.');
      return;
    }

    const parsedAmount = parseFloat(targetAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid target amount greater than 0.');
      return;
    }

    const trimmedAccount = savingsAccount.trim();
    if (!trimmedAccount) {
      setErrorMsg('Please enter the savings account name.');
      return;
    }

    if (!targetDate) {
      setErrorMsg('Please select a target date.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingGoal) {
        await updateGoal(editingGoal.goalId, {
          name: trimmedName,
          targetAmount: parsedAmount,
          savingsAccount: trimmedAccount,
          targetDate,
          ...(canChangeScopeAndPrivacy
            ? {
                scope,
                isHiddenFromPartner: scope === 'personal' ? isHiddenFromPartner : false,
              }
            : {}),
        });
      } else {
        await addGoal({
          name: trimmedName,
          targetAmount: parsedAmount,
          savingsAccount: trimmedAccount,
          targetDate,
          scope,
          isHiddenFromPartner: scope === 'personal' ? isHiddenFromPartner : false,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save goal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-modal-title"
        style={{ backgroundColor: 'var(--bg-surface)' }}
        className="w-full max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl border-t sm:border border-app shadow-2xl p-5 sm:p-6 my-0 sm:my-8 max-h-[92vh] overflow-y-auto relative safe-bottom"
      >
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close goal modal"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-subtle text-muted hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 id="goal-modal-title" className="text-lg sm:text-xl font-bold tracking-tight">
              {editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
            </h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Track a milestone individually or save together with your partner.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Goal Name & Goal Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-3">
              <label htmlFor="goal-name-input" className="block text-xs font-semibold mb-1">
                Goal Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="goal-name-input"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Emergency Fund, Japan Trip"
                className="w-full px-3.5 py-2.5 rounded-xl border border-app bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="goal-amount-input" className="block text-xs font-semibold mb-1">
                Goal Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted font-bold text-sm">₹</span>
                <input
                  id="goal-amount-input"
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="100000"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-app bg-transparent text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Savings Account & Target Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="goal-savings-account-input" className="block text-xs font-semibold mb-1">
                Savings Account <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Landmark className="w-4 h-4 absolute left-3 top-3 text-muted" />
                <input
                  id="goal-savings-account-input"
                  type="text"
                  required
                  maxLength={80}
                  value={savingsAccount}
                  onChange={(e) => setSavingsAccount(e.target.value)}
                  placeholder="e.g. HDFC Savings, SBI Joint"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-app bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="goal-target-date-input" className="block text-xs font-semibold mb-1">
                Target Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-muted pointer-events-none" />
                <input
                  id="goal-target-date-input"
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-app bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Quick Savings Account Suggestions */}
          <div>
            <span className="block text-[11px] font-medium text-muted mb-1.5">
              Quick account suggestions
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAVINGS_ACCOUNT_SUGGESTIONS.map((acc) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => setSavingsAccount(acc)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer min-h-[32px] ${
                    savingsAccount === acc
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold'
                      : 'border-app bg-surface-subtle text-muted hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {acc}
                </button>
              ))}
            </div>
          </div>

          {/* Goal Type: Shared vs Personal */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold">Goal Ownership</label>
              {!canChangeScopeAndPrivacy && (
                <span className="text-[11px] text-muted">Set by creator</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={!canChangeScopeAndPrivacy}
                onClick={() => handleScopeChange('shared')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[68px] ${
                  scope === 'shared'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200 ring-1 ring-indigo-600'
                    : 'border-app bg-surface-subtle text-muted hover:border-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Shared Together</span>
                </div>
                <p className="text-[11px] opacity-80 mt-1">
                  Both partners can view and contribute.
                </p>
              </button>

              <button
                type="button"
                disabled={!canChangeScopeAndPrivacy}
                onClick={() => handleScopeChange('personal')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[68px] ${
                  scope === 'personal'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200 ring-1 ring-indigo-600'
                    : 'border-app bg-surface-subtle text-muted hover:border-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <User className="w-4 h-4 shrink-0" />
                  <span>Personal Goal</span>
                </div>
                <p className="text-[11px] opacity-80 mt-1">
                  Only you can add or edit contributions.
                </p>
              </button>
            </div>
          </div>

          {/* Hide Personal Savings Toggle */}
          {scope === 'personal' && (
            <div className="p-3.5 rounded-2xl border border-app bg-surface-subtle/70 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-surface border border-app text-muted shrink-0">
                  {isHiddenFromPartner ? (
                    <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold">Hide from partner</div>
                  <p className="text-[11px] text-muted mt-0.5">
                    {isHiddenFromPartner
                      ? 'Private — completely hidden from your partner.'
                      : 'Visible to your partner (read-only for them).'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isHiddenFromPartner}
                aria-label="Hide personal savings goal from partner"
                disabled={!canChangeScopeAndPrivacy}
                onClick={() => setIsHiddenFromPartner(!isHiddenFromPartner)}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-transparent transition-colors cursor-pointer disabled:opacity-50 ${
                  isHiddenFromPartner
                    ? 'bg-indigo-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    isHiddenFromPartner ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Action Buttons */}
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
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editingGoal ? 'Save Changes' : 'Create Goal'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
