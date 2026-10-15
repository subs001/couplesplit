import React, { useState, useMemo } from 'react';
import { Expense, Member, Settlement } from '../types';
import { CheckCircle2, ArrowRight, ShieldCheck, Plus, Check, X } from 'lucide-react';

interface SplitSettlementViewProps {
  expenses: Expense[];
  settlements: Settlement[];
  currency: string;
  members: Member[];
  onRecordSettlement: (settlement: Omit<Settlement, 'id' | 'createdAt'>) => Promise<void>;
}

export const SplitSettlementView: React.FC<SplitSettlementViewProps> = ({
  expenses,
  settlements,
  currency,
  members,
  onRecordSettlement,
}) => {
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleFrom, setSettleFrom] = useState<string>(members[1]?.id || 'm2');
  const [settleTo, setSettleTo] = useState<string>(members[0]?.id || 'm1');
  const [settleNote, setSettleNote] = useState<string>('Settle balance via UPI/Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const m1 = members[0] || { id: 'm1', name: 'Partner 1', avatar: '👩' };
  const m2 = members[1] || { id: 'm2', name: 'Partner 2', avatar: '👨' };

  // Calculate net balances
  // Positive netBalance: m2 owes m1
  // Negative netBalance: m1 owes m2
  const { netBalance, m1PaidTotal, m2PaidTotal, commonTotal } = useMemo(() => {
    let balance = 0;
    let m1Paid = 0;
    let m2Paid = 0;
    let common = 0;

    expenses.forEach((e) => {
      const amt = e.amount;
      const isM1Payer = e.paidBy === m1.id;

      if (isM1Payer) {
        m1Paid += amt;
      } else {
        m2Paid += amt;
      }

      if (e.splitType === 'common' || e.splitType === 'split_equal') {
        common += amt;
        const half = amt / 2;
        if (isM1Payer) {
          balance += half;
        } else {
          balance -= half;
        }
      } else if (e.splitType === 'split_custom' && e.customSplit) {
        common += amt;
        const m1Pct = e.customSplit[m1.id] ?? 50;
        const m1Share = amt * (m1Pct / 100);
        const m2Share = amt - m1Share;

        if (isM1Payer) {
          balance += m2Share;
        } else {
          balance -= m1Share;
        }
      }
    });

    // Account for previous settlements
    settlements.forEach((s) => {
      if (s.fromMember === m2.id && s.toMember === m1.id) {
        balance -= s.amount;
      } else if (s.fromMember === m1.id && s.toMember === m2.id) {
        balance += s.amount;
      }
    });

    return {
      netBalance: Math.round(balance * 100) / 100,
      m1PaidTotal: m1Paid,
      m2PaidTotal: m2Paid,
      commonTotal: common,
    };
  }, [expenses, settlements, m1, m2]);

  const handleOpenSettleModal = () => {
    if (netBalance > 0) {
      setSettleFrom(m2.id);
      setSettleTo(m1.id);
      setSettleAmount(String(netBalance));
    } else if (netBalance < 0) {
      setSettleFrom(m1.id);
      setSettleTo(m2.id);
      setSettleAmount(String(Math.abs(netBalance)));
    } else {
      setSettleAmount('0');
    }
    setShowSettleModal(true);
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(settleAmount);
    if (isNaN(val) || val <= 0) return;

    setIsSubmitting(true);
    try {
      await onRecordSettlement({
        householdId: expenses[0]?.householdId || 'HOME-2026',
        fromMember: settleFrom,
        toMember: settleTo,
        amount: val,
        date: new Date().toISOString().split('T')[0],
        notes: settleNote,
      });
      setShowSettleModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* Main Balance Hero Card (Material 3 Surface Container) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs text-center relative overflow-hidden">
        <div className="max-w-md mx-auto space-y-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Net Household Balance
          </span>

          {netBalance === 0 ? (
            <div className="py-4 space-y-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                All settled up
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Neither partner owes anything right now for common & split expenses.
              </p>
            </div>
          ) : (
            <div className="py-2 space-y-3">
              <div className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                {currency}
                {Math.abs(netBalance).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>

              {/* Clean Statement Pill */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-full text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                <span>{netBalance > 0 ? m2.avatar : m1.avatar}</span>
                <span>{netBalance > 0 ? m2.name : m1.name}</span>
                <span className="text-slate-400 font-normal">owes</span>
                <span>{netBalance > 0 ? m1.avatar : m2.avatar}</span>
                <span>{netBalance > 0 ? m1.name : m2.name}</span>
              </div>
            </div>
          )}

          <div>
            <button
              onClick={handleOpenSettleModal}
              className="px-6 py-3 rounded-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-semibold shadow-xs transition active:scale-95 inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Record Settle Up Payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Contributions Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Partner 1 card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{m1.avatar}</span>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">{m1.name}</h4>
              <p className="text-[11px] text-slate-400">Total spent</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {currency}{m1PaidTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Covers personal purchases and shared household expenses paid up-front.
          </p>
        </div>

        {/* Partner 2 card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{m2.avatar}</span>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">{m2.name}</h4>
              <p className="text-[11px] text-slate-400">Total spent</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {currency}{m2PaidTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Covers personal purchases and shared household expenses paid up-front.
          </p>
        </div>
      </div>

      {/* Settlement Log History */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Settlement Payment Log
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              History of payments transferred between partners
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
            {settlements.length} recorded
          </span>
        </div>

        {settlements.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No payments recorded yet. Log settlements after transfers.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {settlements.map((s) => {
              const fromM = members.find((m) => m.id === s.fromMember);
              const toM = members.find((m) => m.id === s.toMember);
              return (
                <div key={s.id} className="p-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                      ✓
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {fromM?.name} paid {toM?.name}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>{s.date}</span>
                        {s.notes && (
                          <>
                            <span>·</span>
                            <span>{s.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{currency}{s.amount.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settle Up Modal (Material 3 Dialog) */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Record Settle Up</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Log money transferred between partners</p>
              </div>
              <button
                onClick={() => setShowSettleModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="p-5 space-y-4">
              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Settlement Amount ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-4 py-2.5 text-xl font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white tabular-nums"
                />
              </div>

              {/* Who Paid Whom */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block">Sender:</label>
                  <select
                    value={settleFrom}
                    onChange={(e) => setSettleFrom(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block">Receiver:</label>
                  <select
                    value={settleTo}
                    onChange={(e) => setSettleTo(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Note / Method</label>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="e.g. Paid via Google Pay / UPI"
                  className="w-full px-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
