import React, { useState, useEffect } from 'react';
import { CATEGORIES, PAYMENT_METHODS, Expense, Member, SplitType, CategoryInfo, PaymentMethodInfo } from '../types';
import { Plus, Check, Calendar, ArrowLeft, Trash2, Split, Users, User, Percent, Settings2, CreditCard } from 'lucide-react';

interface AddExpenseFormProps {
  householdId: string;
  currency: string;
  members: Member[];
  categories?: CategoryInfo[];
  paymentMethods?: PaymentMethodInfo[];
  onOpenCategoryManager?: () => void;
  onOpenPaymentMethodManager?: () => void;
  initialData?: Expense | null;
  onSave: (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onCancel: () => void;
}

export const AddExpenseForm: React.FC<AddExpenseFormProps> = ({
  householdId,
  currency,
  members,
  categories,
  paymentMethods,
  onOpenCategoryManager,
  onOpenPaymentMethodManager,
  initialData,
  onSave,
  onDelete,
  onCancel,
}) => {
  const activeCategories = categories && categories.length > 0 ? categories : CATEGORIES;
  const activePaymentMethods = paymentMethods && paymentMethods.length > 0 ? paymentMethods : PAYMENT_METHODS;
  const [amount, setAmount] = useState<string>(initialData ? String(initialData.amount) : '');
  const [category, setCategory] = useState<string>(
    initialData ? initialData.category : (activeCategories[0]?.id || 'Groceries')
  );
  const [customCategory, setCustomCategory] = useState<string>('');
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>(
    initialData ? initialData.paymentMethod : (activePaymentMethods[0]?.id || 'gpay')
  );
  const [customPaymentMethod, setCustomPaymentMethod] = useState<string>('');
  const [isCustomPaymentMethod, setIsCustomPaymentMethod] = useState<boolean>(false);
  const [description, setDescription] = useState<string>(initialData ? initialData.description : '');
  const [splitType, setSplitType] = useState<SplitType>(initialData ? initialData.splitType : 'common');
  const [paidBy, setPaidBy] = useState<string>(initialData ? initialData.paidBy : (members[0]?.id || 'm1'));
  const [date, setDate] = useState<string>(
    initialData ? initialData.date : new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>(initialData?.notes || '');

  // Custom split ratios (percentage)
  const [customSplitPercent, setCustomSplitPercent] = useState<number>(50);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData && !activeCategories.some((c) => c.id === initialData.category)) {
      setIsCustomCategory(true);
      setCustomCategory(initialData.category);
    }
    if (initialData && !activePaymentMethods.some((pm) => pm.id === initialData.paymentMethod)) {
      setIsCustomPaymentMethod(true);
      setCustomPaymentMethod(initialData.paymentMethod);
    }
  }, [initialData, activeCategories, activePaymentMethods]);

  const handleAmountPreset = (addValue: number) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(current + addValue));
  };

  const handleQuickDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid expense amount greater than 0');
      return;
    }

    const finalCategory = isCustomCategory ? (customCategory.trim() || 'Miscellaneous') : category;
    if (!finalCategory) {
      setError('Please select or specify a category');
      return;
    }

    const finalPaymentMethod = isCustomPaymentMethod
      ? (customPaymentMethod.trim() || 'Other')
      : paymentMethod;
    if (!finalPaymentMethod) {
      setError('Please select or specify a payment method');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      let customSplitData: { [memberId: string]: number } | undefined = undefined;
      if (splitType === 'split_custom' && members.length >= 2) {
        customSplitData = {
          [members[0].id]: customSplitPercent,
          [members[1].id]: 100 - customSplitPercent,
        };
      }

      await onSave({
        householdId,
        amount: Math.round(numAmount * 100) / 100,
        category: finalCategory,
        paymentMethod: finalPaymentMethod,
        description: description.trim() || `${finalCategory} expense`,
        splitType,
        paidBy,
        customSplit: customSplitData,
        date,
        notes: notes.trim(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save expense';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const payerMember = members.find((m) => m.id === paidBy) || members[0];
  const otherMember = members.find((m) => m.id !== paidBy) || members[1] || members[0];

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden pb-6">
      {/* Material 3 Surface Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
            title="Cancel and return"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {initialData ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {initialData ? 'Update transaction details' : 'Log shared cost for household'}
            </p>
          </div>
        </div>

        {initialData && onDelete && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Delete this expense?')) {
                onDelete(initialData.id);
              }
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Delete Expense"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs rounded-2xl border border-rose-200 dark:border-rose-900 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* 1. HERO AMOUNT INPUT (Material 3 Expressive Amount Field) */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-6 rounded-3xl border border-slate-200/70 dark:border-slate-700/60 text-center space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Amount Spent
          </span>

          <div className="flex items-center justify-center gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-400 dark:text-slate-500 select-none">
              {currency}
            </span>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              autoFocus={!initialData}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-48 sm:w-64 text-center text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white bg-transparent border-b-2 border-slate-300 dark:border-slate-700 focus:border-emerald-600 dark:focus:border-emerald-400 focus:outline-none transition tabular-nums placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
            {[100, 250, 500, 1000, 2000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleAmountPreset(val)}
                className="px-3 py-1 text-xs font-medium rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer active:scale-95"
              >
                +{currency}{val}
              </button>
            ))}
            {amount && (
              <button
                type="button"
                onClick={() => setAmount('')}
                className="px-2.5 py-1 text-xs font-medium rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* 2. DESCRIPTION & PAYMENT METHOD (Material 3 Outlined Style) */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Description or Store
            </label>
            <input
              type="text"
              placeholder="e.g. D-Mart Grocery, Dinner with friends, Uber ride"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment Mode
              </span>
              <div className="flex items-center gap-2">
                {onOpenPaymentMethodManager && (
                  <button
                    type="button"
                    onClick={onOpenPaymentMethodManager}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Settings2 className="w-3 h-3" />
                    <span>Manage</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCustomPaymentMethod(!isCustomPaymentMethod)}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                >
                  {isCustomPaymentMethod ? 'Use standard' : '+ Custom mode'}
                </button>
              </div>
            </div>

            {isCustomPaymentMethod ? (
              <input
                type="text"
                placeholder="Enter custom payment method (e.g. CRED, Kotak Card, Cash)"
                value={customPaymentMethod}
                onChange={(e) => setCustomPaymentMethod(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-slate-100"
              />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {activePaymentMethods.map((pm) => {
                  const isSelected = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{pm.icon}</span>
                      <span>{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 3. CATEGORY SELECTION */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Category
            </label>
            <div className="flex items-center gap-2">
              {onOpenCategoryManager && (
                <button
                  type="button"
                  onClick={onOpenCategoryManager}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <Settings2 className="w-3 h-3" />
                  <span>Manage</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsCustomCategory(!isCustomCategory)}
                className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                {isCustomCategory ? 'Use standard' : '+ Custom name'}
              </button>
            </div>
          </div>

          {isCustomCategory ? (
            <input
              type="text"
              placeholder="Enter custom category name (e.g. Gift, Pet food, Books)"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-slate-100"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {activeCategories.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 text-slate-900 dark:text-white font-semibold ring-1 ring-emerald-500/50 shadow-xs'
                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                  >
                    <span className="text-xl shrink-0">{cat.icon}</span>
                    <span className="text-xs truncate">{cat.label || cat.id}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. SPLIT TYPE (Material 3 Segmented Control) */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Split Mode
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Common */}
            <button
              type="button"
              onClick={() => setSplitType('common')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                splitType === 'common'
                  ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 text-slate-900 dark:text-white ring-1 ring-emerald-500/50 font-semibold'
                  : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Common</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-tight">
                Shared home expense
              </p>
            </button>

            {/* Split 50/50 */}
            <button
              type="button"
              onClick={() => setSplitType('split_equal')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                splitType === 'split_equal'
                  ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 text-slate-900 dark:text-white ring-1 ring-blue-500/50 font-semibold'
                  : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <Split className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>50 / 50 Split</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-tight">
                Equal half owed
              </p>
            </button>

            {/* Personal */}
            <button
              type="button"
              onClick={() => setSplitType('personal')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                splitType === 'personal'
                  ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/60 text-slate-900 dark:text-white ring-1 ring-purple-500/50 font-semibold'
                  : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Personal</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-tight">
                Not split
              </p>
            </button>

            {/* Custom Split */}
            <button
              type="button"
              onClick={() => setSplitType('split_custom')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                splitType === 'split_custom'
                  ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/60 text-slate-900 dark:text-white ring-1 ring-amber-500/50 font-semibold'
                  : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <Percent className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Custom %</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-tight">
                Adjust ratio
              </p>
            </button>
          </div>

          {/* Custom Split Slider */}
          {splitType === 'split_custom' && members.length >= 2 && (
            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl space-y-2 mt-2">
              <div className="flex justify-between items-center text-xs font-semibold text-amber-900 dark:text-amber-200">
                <span>{members[0].name}: {customSplitPercent}%</span>
                <span>{members[1].name}: {100 - customSplitPercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={customSplitPercent}
                onChange={(e) => setCustomSplitPercent(parseInt(e.target.value, 10))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* 5. WHO PAID & DATE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Who Paid */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Who Paid?
            </label>
            <div className="flex gap-2">
              {members.map((m) => {
                const isSelected = paidBy === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaidBy(m.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/50 shadow-xs'
                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{m.avatar}</span>
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Date
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => handleQuickDate(0)}
                className={`px-3 py-2 text-xs font-medium rounded-2xl border transition cursor-pointer ${
                  date === new Date().toISOString().split('T')[0]
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white font-semibold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Optional Notes */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="Add brief note or bill number"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>

        {/* Live Calculation Preview */}
        {amount && (
          <div className="px-4 py-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 text-xs text-emerald-950 dark:text-emerald-200 flex items-center justify-between">
            <span className="font-medium">
              {payerMember?.name} paid {currency}{amount}
            </span>
            <span className="font-semibold tabular-nums">
              {splitType === 'common'
                ? 'Shared household total'
                : splitType === 'split_equal'
                ? `${otherMember?.name} owes ${currency}${(parseFloat(amount) / 2).toFixed(2)}`
                : splitType === 'personal'
                ? 'Personal expense'
                : 'Custom split applied'}
            </span>
          </div>
        )}

        {/* Action Buttons (Material 3 Button Row) */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-full border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs sm:text-sm transition text-center cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-2 py-3 px-6 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{initialData ? 'Update Expense' : 'Save Expense'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
