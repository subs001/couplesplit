import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { Goal, GoalContribution } from '../types';
import { formatINR, getTodayString } from '../lib/currency';
import {
  X,
  Check,
  AlertCircle,
  PiggyBank,
  Calendar,
  User,
  StickyNote,
} from 'lucide-react';

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  remainingAmount: number;
  editingContribution?: GoalContribution | null;
}

export function ContributionModal({
  isOpen,
  onClose,
  goal,
  remainingAmount,
  editingContribution,
}: ContributionModalProps) {
  const { user, userProfile } = useAuth();
  const { partnerProfile, addGoalContribution, updateGoalContribution } = useAccount();

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [contributedBy, setContributedBy] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentUserUid = user?.uid || '';
  const currentUserName = userProfile?.displayName?.split(' ')[0] || 'You';
  const partnerUid = partnerProfile?.uid || '';
  const partnerName = partnerProfile?.displayName?.split(' ')[0] || 'Partner';

  useEffect(() => {
    if (!goal) return;
    if (editingContribution) {
      setAmount(editingContribution.amount.toString());
      setDate(editingContribution.date);
      setContributedBy(editingContribution.contributedBy);
      setNote(editingContribution.note || '');
    } else {
      setAmount('');
      setDate(getTodayString());
      setContributedBy(goal.scope === 'personal' ? goal.createdBy : currentUserUid);
      setNote('');
    }
    setErrorMsg(null);
  }, [goal, editingContribution, isOpen, currentUserUid]);

  if (!isOpen || !goal) return null;

  const isSharedGoal = goal.scope === 'shared';
  const hasPartner = Boolean(partnerUid);

  const quickAmounts = [1000, 2500, 5000, 10000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid contribution amount greater than 0.');
      return;
    }

    if (!date) {
      setErrorMsg('Please choose a contribution date.');
      return;
    }

    const selectedUid = isSharedGoal ? contributedBy || currentUserUid : goal.createdBy;
    const selectedName =
      selectedUid === currentUserUid
        ? currentUserName
        : selectedUid === partnerUid
        ? partnerName
        : goal.createdByName;

    setIsSubmitting(true);
    try {
      if (editingContribution) {
        await updateGoalContribution(goal.goalId, editingContribution.contributionId, {
          amount: parsedAmount,
          date,
          note: note.trim(),
          contributedBy: selectedUid,
          contributedByName: selectedName,
        });
      } else {
        await addGoalContribution(goal.goalId, {
          amount: parsedAmount,
          date,
          note: note.trim() || undefined,
          contributedBy: selectedUid,
          contributedByName: selectedName,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save contribution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contribution-modal-title"
        style={{ backgroundColor: 'var(--bg-surface)' }}
        className="w-full max-w-md bg-surface rounded-t-3xl sm:rounded-3xl border-t sm:border border-app shadow-2xl p-5 sm:p-6 my-0 sm:my-8 max-h-[92vh] overflow-y-auto relative safe-bottom"
      >
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close contribution modal"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-subtle text-muted hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 id="contribution-modal-title" className="text-lg font-bold tracking-tight">
              {editingContribution ? 'Modify Contribution' : 'Add Contribution'}
            </h2>
          </div>
          <p className="text-xs text-muted mt-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{goal.name}</span>
            <span className="mx-1.5">·</span>
            <span>{goal.savingsAccount}</span>
            {remainingAmount > 0 && (
              <>
                <span className="mx-1.5">·</span>
                <span className="tabular-nums">{formatINR(remainingAmount)} left</span>
              </>
            )}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label htmlFor="contrib-amount-input" className="block text-xs font-semibold mb-1">
              Contribution Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-muted font-bold text-sm">₹</span>
              <input
                id="contrib-amount-input"
                type="number"
                step="0.01"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-app bg-transparent text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              />
            </div>

            {!editingContribution && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {quickAmounts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(q.toString())}
                    className="px-2.5 py-1 rounded-lg border border-app bg-surface-subtle hover:border-indigo-400 text-[11px] font-semibold tabular-nums cursor-pointer min-h-[32px]"
                  >
                    +{formatINR(q)}
                  </button>
                ))}
                {remainingAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(remainingAmount.toString())}
                    className="px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold tabular-nums cursor-pointer min-h-[32px]"
                  >
                    Complete ({formatINR(remainingAmount)})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label htmlFor="contrib-date-input" className="block text-xs font-semibold mb-1">
              Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-3 text-muted pointer-events-none" />
              <input
                id="contrib-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-app bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              />
            </div>
          </div>

          {/* Contributed By (Shared goals only) */}
          {isSharedGoal && hasPartner && (
            <div>
              <label className="block text-xs font-semibold mb-1.5">Contributed By</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setContributedBy(currentUserUid)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer min-h-[44px] ${
                    contributedBy === currentUserUid
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold ring-1 ring-indigo-600'
                      : 'border-app bg-surface-subtle text-muted hover:border-slate-400'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="truncate">You ({currentUserName})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setContributedBy(partnerUid)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer min-h-[44px] ${
                    contributedBy === partnerUid
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold ring-1 ring-indigo-600'
                      : 'border-app bg-surface-subtle text-muted hover:border-slate-400'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="truncate">{partnerName}</span>
                </button>
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label htmlFor="contrib-note-input" className="block text-xs font-semibold mb-1">
              Note <span className="text-muted font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <StickyNote className="w-4 h-4 absolute left-3 top-3 text-muted" />
              <input
                id="contrib-note-input"
                type="text"
                maxLength={150}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Monthly transfer, Bonus deposit"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-app bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              />
            </div>
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
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editingContribution ? 'Save Contribution' : 'Add Contribution'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
