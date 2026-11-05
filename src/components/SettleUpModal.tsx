import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { formatINR, getTodayString } from '../lib/currency';
import { FinancialSummary } from '../lib/calculations';
import { CheckCircle2, ArrowRight, X, Sparkles, AlertCircle } from 'lucide-react';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: FinancialSummary;
}

export function SettleUpModal({ isOpen, onClose, summary }: SettleUpModalProps) {
  const { user, userProfile } = useAuth();
  const { partnerProfile, addExpense, categories, paymentMethods } = useAccount();

  const [settlementAmount, setSettlementAmount] = useState<number>(
    summary.whoOwesWhom.amount
  );
  const [date, setDate] = useState<string>(getTodayString());
  const [note, setNote] = useState<string>('Settlement payment');
  const [paymentMethodId, setPaymentMethodId] = useState<string>(
    paymentMethods[0]?.paymentMethodId || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isUserDebtor = summary.whoOwesWhom.debtorUid === user?.uid;
  const debtorName = isUserDebtor ? 'You' : (partnerProfile?.displayName || 'Partner');
  const creditorName = isUserDebtor ? (partnerProfile?.displayName || 'Partner') : 'You';

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.whoOwesWhom.debtorUid || !summary.whoOwesWhom.creditorUid) {
      onClose();
      return;
    }

    if (settlementAmount <= 0) {
      setErrorMsg('Amount must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const miscCat =
        categories.find((c) => c.name.toLowerCase() === 'miscellaneous') ||
        categories[0];
      const selectedPm =
        paymentMethods.find((p) => p.paymentMethodId === paymentMethodId) ||
        paymentMethods.find((p) => p.name.toLowerCase() === 'upi') ||
        paymentMethods[0];

      const debtorUid = summary.whoOwesWhom.debtorUid;
      const debtorDisplayName = isUserDebtor ? (userProfile?.displayName || 'You') : (partnerProfile?.displayName || 'Partner');
      const creditorUid = summary.whoOwesWhom.creditorUid;

      await addExpense({
        title: note || `Settlement from ${debtorDisplayName}`,
        amount: settlementAmount,
        location: 'Settlement',
        categoryId: miscCat?.categoryId || 'settlement',
        categoryName: miscCat?.name || 'Settlement',
        paymentMethodId: selectedPm?.paymentMethodId || 'upi',
        paymentMethodName: selectedPm?.name || 'UPI',
        paidBy: debtorUid,
        paidByName: debtorDisplayName,
        splitType: 'custom',
        splitDetails: {
          user1Uid: debtorUid,
          user1Amount: 0,
          user1Percentage: 0,
          user2Uid: creditorUid,
          user2Amount: settlementAmount,
          user2Percentage: 100,
        },
        expenseDate: date,
      });

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-surface rounded-t-3xl sm:rounded-3xl border-t sm:border border-app shadow-2xl p-6 relative overflow-hidden safe-bottom">
        {/* Mobile handle pull bar */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-subtle text-muted hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2.5">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">Settle Up Balances</h2>
          <p className="text-xs text-muted mt-0.5">
            Record a transfer between partners to balance your accounts.
          </p>
        </div>

        {summary.whoOwesWhom.status === 'settled' ? (
          <div className="text-center py-6">
            <Sparkles className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <h3 className="font-semibold text-sm">You are completely settled up!</h3>
            <p className="text-xs text-muted mt-1">There are no outstanding debts between you and your partner.</p>
            <button
              onClick={onClose}
              className="mt-6 w-full py-3 rounded-xl bg-surface-subtle border border-app text-xs font-semibold cursor-pointer min-h-[44px]"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSettle} className="space-y-4">
            {/* Balance Card */}
            <div className="p-4 rounded-2xl bg-surface-subtle border border-app text-center">
              <span className="text-xs text-muted uppercase font-medium tracking-wider">
                Outstanding Balance
              </span>
              <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
                {formatINR(summary.whoOwesWhom.amount)}
              </div>
              <p className="text-xs font-medium text-muted mt-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">{debtorName}</span> owes{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">{creditorName}</span>
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1">
                Settlement Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-muted font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-app bg-transparent text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[42px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-app bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Payment Method</label>
                <select
                  value={paymentMethodId}
                  onChange={(e) => setPaymentMethodId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-app bg-surface text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[42px]"
                >
                  {paymentMethods.map((pm) => (
                    <option key={pm.paymentMethodId} value={pm.paymentMethodId}>
                      {pm.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Note / Description</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Paid via Google Pay"
                className="w-full px-3 py-2.5 rounded-xl border border-app bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[42px]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 min-h-[44px]"
            >
              <span>{isSubmitting ? 'Recording settlement...' : 'Record Payment & Clear Balance'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
