import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { Expense, SplitType } from '../types';
import { getTodayString, formatINR } from '../lib/currency';
import { DynamicIcon } from '../lib/icons';
import {
  X,
  MapPin,
  User,
  Check,
  AlertCircle,
} from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingExpense?: Expense | null;
}

export function ExpenseModal({ isOpen, onClose, editingExpense }: ExpenseModalProps) {
  const { user, userProfile } = useAuth();
  const { partnerProfile, categories, paymentMethods, addExpense, updateExpense } = useAccount();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [location, setLocation] = useState('');
  const [expenseDate, setExpenseDate] = useState(getTodayString());
  const [paidBy, setPaidBy] = useState<string>('');
  const [splitType, setSplitType] = useState<SplitType>('equal');

  // Custom split state
  const [customMode, setCustomMode] = useState<'amount' | 'percentage'>('amount');
  const [user1CustomAmount, setUser1CustomAmount] = useState<number>(0);
  const [user2CustomAmount, setUser2CustomAmount] = useState<number>(0);
  const [user1CustomPercent, setUser1CustomPercent] = useState<number>(50);
  const [user2CustomPercent, setUser2CustomPercent] = useState<number>(50);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentUserUid = user?.uid || '';
  const currentUserName = userProfile?.displayName || 'You';
  const partnerUid = partnerProfile?.uid || 'partner_uid';
  const partnerName = partnerProfile?.displayName || 'Partner';

  // Initialize or reset form
  useEffect(() => {
    if (editingExpense) {
      setTitle(editingExpense.title);
      setAmount(editingExpense.amount.toString());
      setCategoryId(editingExpense.categoryId);
      setPaymentMethodId(editingExpense.paymentMethodId);
      setLocation(editingExpense.location || '');
      setExpenseDate(editingExpense.expenseDate);
      setPaidBy(editingExpense.paidBy);
      setSplitType(editingExpense.splitType);

      if (editingExpense.splitDetails) {
        const d = editingExpense.splitDetails;
        if (d.user1Uid === currentUserUid) {
          setUser1CustomAmount(d.user1Amount);
          setUser2CustomAmount(d.user2Amount);
          setUser1CustomPercent(d.user1Percentage);
          setUser2CustomPercent(d.user2Percentage);
        } else {
          setUser1CustomAmount(d.user2Amount);
          setUser2CustomAmount(d.user1Amount);
          setUser1CustomPercent(d.user2Percentage);
          setUser2CustomPercent(d.user1Percentage);
        }
      }
    } else {
      setTitle('');
      setAmount('');
      setCategoryId(categories[0]?.categoryId || '');
      setPaymentMethodId(paymentMethods[0]?.paymentMethodId || '');
      setLocation('');
      setExpenseDate(getTodayString());
      setPaidBy(currentUserUid);
      setSplitType('equal');
      setUser1CustomAmount(0);
      setUser2CustomAmount(0);
      setUser1CustomPercent(50);
      setUser2CustomPercent(50);
    }
    setErrorMsg(null);
  }, [editingExpense, isOpen, currentUserUid, categories, paymentMethods]);

  const numAmount = parseFloat(amount) || 0;

  const handleUser1AmountChange = (val: number) => {
    setUser1CustomAmount(val);
    const remainder = Math.max(0, Math.round((numAmount - val) * 100) / 100);
    setUser2CustomAmount(remainder);
    if (numAmount > 0) {
      setUser1CustomPercent(Math.round((val / numAmount) * 100));
      setUser2CustomPercent(Math.round((remainder / numAmount) * 100));
    }
  };

  const handleUser2AmountChange = (val: number) => {
    setUser2CustomAmount(val);
    const remainder = Math.max(0, Math.round((numAmount - val) * 100) / 100);
    setUser1CustomAmount(remainder);
    if (numAmount > 0) {
      setUser2CustomPercent(Math.round((val / numAmount) * 100));
      setUser1CustomPercent(Math.round((remainder / numAmount) * 100));
    }
  };

  const handleUser1PercentChange = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    setUser1CustomPercent(clamped);
    setUser2CustomPercent(100 - clamped);
    if (numAmount > 0) {
      const u1Amt = Math.round(((numAmount * clamped) / 100) * 100) / 100;
      setUser1CustomAmount(u1Amt);
      setUser2CustomAmount(Math.round((numAmount - u1Amt) * 100) / 100);
    }
  };

  const handleUser2PercentChange = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    setUser2CustomPercent(clamped);
    setUser1CustomPercent(100 - clamped);
    if (numAmount > 0) {
      const u2Amt = Math.round(((numAmount * clamped) / 100) * 100) / 100;
      setUser2CustomAmount(u2Amt);
      setUser1CustomAmount(Math.round((numAmount - u2Amt) * 100) / 100);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg('Please enter an expense title.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }

    const selectedCategory = categories.find((c) => c.categoryId === categoryId);
    if (!selectedCategory) {
      setErrorMsg('Please select a category.');
      return;
    }

    const selectedPaymentMethod = paymentMethods.find((p) => p.paymentMethodId === paymentMethodId);
    if (!selectedPaymentMethod) {
      setErrorMsg('Please select a payment method.');
      return;
    }

    let splitDetailsData = undefined;
    if (splitType === 'custom') {
      const sum = Math.round((user1CustomAmount + user2CustomAmount) * 100) / 100;
      if (Math.abs(sum - parsedAmount) > 0.05) {
        setErrorMsg(
          `Custom split amounts (₹${user1CustomAmount} + ₹${user2CustomAmount} = ₹${sum}) must equal total expense amount (₹${parsedAmount}).`
        );
        return;
      }

      splitDetailsData = {
        user1Uid: currentUserUid,
        user1Amount: user1CustomAmount,
        user1Percentage: user1CustomPercent,
        user2Uid: partnerUid,
        user2Amount: user2CustomAmount,
        user2Percentage: user2CustomPercent,
      };
    }

    const payerName = paidBy === currentUserUid ? currentUserName : partnerName;

    setIsSubmitting(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.expenseId, {
          title: trimmedTitle,
          amount: parsedAmount,
          location: location.trim() || undefined,
          categoryId: selectedCategory.categoryId,
          categoryName: selectedCategory.name,
          paymentMethodId: selectedPaymentMethod.paymentMethodId,
          paymentMethodName: selectedPaymentMethod.name,
          paidBy,
          paidByName: payerName,
          splitType,
          splitDetails: splitDetailsData,
          expenseDate,
        });
      } else {
        await addExpense({
          title: trimmedTitle,
          amount: parsedAmount,
          location: location.trim() || undefined,
          categoryId: selectedCategory.categoryId,
          categoryName: selectedCategory.name,
          paymentMethodId: selectedPaymentMethod.paymentMethodId,
          paymentMethodName: selectedPaymentMethod.name,
          paidBy,
          paidByName: payerName,
          splitType,
          splitDetails: splitDetailsData,
          expenseDate,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl border-t sm:border border-app shadow-2xl p-5 sm:p-6 my-0 sm:my-8 max-h-[92vh] overflow-y-auto relative safe-bottom">
        {/* Mobile handle pull bar */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-subtle text-muted hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">
            {editingExpense ? 'Edit Expense' : 'Add New Expense'}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Record a shared or personal expense with automatic balance calculation.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount and Title */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold mb-1">
                Expense Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Dinner, Grocery, WiFi"
                className="w-full px-3.5 py-2.5 rounded-xl border border-app bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAmount(val);
                    const n = parseFloat(val) || 0;
                    if (splitType === 'custom') {
                      const u1 = Math.round((n * (user1CustomPercent / 100)) * 100) / 100;
                      setUser1CustomAmount(u1);
                      setUser2CustomAmount(Math.round((n - u1) * 100) / 100);
                    }
                  }}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-app bg-transparent text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 flex items-center justify-between">
              <span>Category <span className="text-rose-500">*</span></span>
              <span className="text-[11px] font-normal text-muted">Tap to select</span>
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1.5 border border-app rounded-xl bg-surface-subtle/50">
              {categories.map((cat) => {
                const isSelected = categoryId === cat.categoryId;
                return (
                  <button
                    key={cat.categoryId}
                    type="button"
                    onClick={() => setCategoryId(cat.categoryId)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer min-h-[36px] ${
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
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <select
                required
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

            <div>
              <label className="block text-xs font-semibold mb-1">Expense Date</label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-app bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[42px]"
              />
            </div>
          </div>

          {/* Location / Merchant (Optional) */}
          <div>
            <label className="block text-xs font-semibold mb-1">
              Location / Merchant <span className="text-muted font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Starbucks, D-Mart"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-app bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[42px]"
              />
            </div>
          </div>

          {/* Paid By Selection */}
          <div>
            <label className="block text-xs font-semibold mb-1.5">Who Paid?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaidBy(currentUserUid)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer min-h-[42px] ${
                  paidBy === currentUserUid
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold ring-1 ring-indigo-600'
                    : 'border-app bg-surface-subtle text-muted hover:border-slate-400'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span className="truncate">You ({currentUserName})</span>
              </button>

              <button
                type="button"
                onClick={() => setPaidBy(partnerUid)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer min-h-[42px] ${
                  paidBy === partnerUid
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold ring-1 ring-indigo-600'
                    : 'border-app bg-surface-subtle text-muted hover:border-slate-400'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span className="truncate">{partnerName}</span>
              </button>
            </div>
          </div>

          {/* Split Type Selector */}
          <div>
            <label className="block text-xs font-semibold mb-1.5">How is this split?</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSplitType('equal')}
                className={`py-2 px-2 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer min-h-[50px] flex flex-col items-center justify-center ${
                  splitType === 'equal'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold ring-1 ring-indigo-600'
                    : 'border-app bg-surface-subtle text-muted hover:border-slate-400'
                }`}
              >
                <div>Equal (50/50)</div>
                <div className="text-[10px] opacity-75 mt-0.5">
                  {numAmount > 0 ? formatINR(numAmount / 2) : 'Split evenly'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSplitType('personal')}
                className={`py-2 px-2 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer min-h-[50px] flex flex-col items-center justify-center ${
                  splitType === 'personal'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold ring-1 ring-indigo-600'
                    : 'border-app bg-surface-subtle text-muted hover:border-slate-400'
                }`}
              >
                <div>Personal</div>
                <div className="text-[10px] opacity-75 mt-0.5">100% Payer</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSplitType('custom');
                  if (numAmount > 0 && user1CustomAmount === 0 && user2CustomAmount === 0) {
                    const half = Math.round((numAmount / 2) * 100) / 100;
                    setUser1CustomAmount(half);
                    setUser2CustomAmount(Math.round((numAmount - half) * 100) / 100);
                  }
                }}
                className={`py-2 px-2 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer min-h-[50px] flex flex-col items-center justify-center ${
                  splitType === 'custom'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold ring-1 ring-indigo-600'
                    : 'border-app bg-surface-subtle text-muted hover:border-slate-400'
                }`}
              >
                <div>Custom</div>
                <div className="text-[10px] opacity-75 mt-0.5">Specify ₹ or %</div>
              </button>
            </div>

            {/* Custom Split Details Sub-panel */}
            {splitType === 'custom' && (
              <div className="mt-3 p-3.5 rounded-2xl bg-surface-subtle border border-app space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted">Custom Breakdown</span>
                  <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5 border border-app">
                    <button
                      type="button"
                      onClick={() => setCustomMode('amount')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                        customMode === 'amount'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-muted'
                      }`}
                    >
                      ₹ Amount
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomMode('percentage')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                        customMode === 'percentage'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-muted'
                      }`}
                    >
                      % Percent
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium truncate">{currentUserName} (You):</span>
                    <div className="flex items-center gap-2">
                      {customMode === 'amount' ? (
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1.5 text-muted font-bold text-xs">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={user1CustomAmount}
                            onChange={(e) => handleUser1AmountChange(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 py-1 rounded-lg border border-app text-xs bg-surface text-right font-semibold"
                          />
                        </div>
                      ) : (
                        <div className="relative w-24">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={user1CustomPercent}
                            onChange={(e) => handleUser1PercentChange(parseInt(e.target.value) || 0)}
                            className="w-full pl-2 pr-6 py-1 rounded-lg border border-app text-xs bg-surface text-right font-semibold"
                          />
                          <span className="absolute right-2.5 top-1.5 text-muted font-bold text-xs">%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium truncate">{partnerName}:</span>
                    <div className="flex items-center gap-2">
                      {customMode === 'amount' ? (
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1.5 text-muted font-bold text-xs">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={user2CustomAmount}
                            onChange={(e) => handleUser2AmountChange(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 py-1 rounded-lg border border-app text-xs bg-surface text-right font-semibold"
                          />
                        </div>
                      ) : (
                        <div className="relative w-24">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={user2CustomPercent}
                            onChange={(e) => handleUser2PercentChange(parseInt(e.target.value) || 0)}
                            className="w-full pl-2 pr-6 py-1 rounded-lg border border-app text-xs bg-surface text-right font-semibold"
                          />
                          <span className="absolute right-2.5 top-1.5 text-muted font-bold text-xs">%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-app flex items-center justify-between text-[11px]">
                  <span className="text-muted">Total allocated:</span>
                  <span
                    className={`font-bold ${
                      Math.abs(user1CustomAmount + user2CustomAmount - numAmount) <= 0.05
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600'
                    }`}
                  >
                    {formatINR(user1CustomAmount + user2CustomAmount)} / {formatINR(numAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons with minimum touch height */}
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
                  <span>{editingExpense ? 'Save Changes' : 'Record Expense'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
