import React, { useState } from 'react';
import { PaymentMethodInfo, Expense, PAYMENT_METHODS } from '../types';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  Check, 
  CreditCard,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface PaymentMethodManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethods: PaymentMethodInfo[];
  expenses: Expense[];
  onSavePaymentMethods: (
    updatedMethods: PaymentMethodInfo[], 
    renameMap?: { oldId: string; newId: string; updatePastExpenses: boolean }
  ) => Promise<void>;
  onDeletePaymentMethod: (methodId: string, reassignToMethodId?: string) => Promise<void>;
  onResetToDefaults: () => Promise<void>;
}

const POPULAR_PAYMENT_ICONS = [
  '💳', '📱', '🏦', '🏛️', '💵', '💰', '🪙', '📦', '🍔', '🛒', 
  '🛍️', '⚡', '🧾', '🏧', '🪙', '🎟️', '💻', '🤝', '💎', '🔑'
];

const PAYMENT_TYPES = [
  'UPI',
  'Card',
  'Net Banking',
  'Cash',
  'Wallet',
  'BNPL',
  'Other'
];

export const PaymentMethodManagerModal: React.FC<PaymentMethodManagerModalProps> = ({
  isOpen,
  onClose,
  paymentMethods,
  expenses,
  onSavePaymentMethods,
  onDeletePaymentMethod,
  onResetToDefaults,
}) => {
  const [editingMethod, setEditingMethod] = useState<PaymentMethodInfo | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethodInfo | null>(null);
  const [reassignMethod, setReassignMethod] = useState<string>('gpay');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('💳');
  const [formType, setFormType] = useState('Card');
  const [updatePastExpenses, setUpdatePastExpenses] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Count usage per payment method
  const usageCounts: Record<string, number> = {};
  expenses.forEach((e) => {
    usageCounts[e.paymentMethod] = (usageCounts[e.paymentMethod] || 0) + 1;
  });

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingMethod(null);
    setFormName('');
    setFormIcon('💳');
    setFormType('Card');
    setUpdatePastExpenses(true);
    setErrorMessage(null);
    setIsAddingNew(true);
  };

  const handleOpenEdit = (method: PaymentMethodInfo) => {
    setIsAddingNew(false);
    setEditingMethod(method);
    setFormName(method.label || method.id);
    setFormIcon(method.icon || '💳');
    setFormType(method.type || 'Card');
    setUpdatePastExpenses(true);
    setErrorMessage(null);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (isAddingNew) {
        if (paymentMethods.some((pm) => pm.id.toLowerCase() === cleanName.toLowerCase())) {
          setErrorMessage(`A payment method named "${cleanName}" already exists.`);
          setIsSubmitting(false);
          return;
        }

        const newMethod: PaymentMethodInfo = {
          id: cleanName,
          label: cleanName,
          icon: formIcon.trim() || '💳',
          type: formType,
        };

        const updated = [...paymentMethods, newMethod];
        await onSavePaymentMethods(updated);
        showToast(`Added "${cleanName}" payment mode`);
        setIsAddingNew(false);
      } else if (editingMethod) {
        const isRenamed = cleanName !== editingMethod.id;
        const updatedMethod: PaymentMethodInfo = {
          id: cleanName,
          label: cleanName,
          icon: formIcon.trim() || '💳',
          type: formType,
        };

        const updated = paymentMethods.map((pm) =>
          pm.id === editingMethod.id ? updatedMethod : pm
        );

        await onSavePaymentMethods(
          updated,
          isRenamed
            ? {
                oldId: editingMethod.id,
                newId: cleanName,
                updatePastExpenses,
              }
            : undefined
        );

        showToast(`Updated "${cleanName}"`);
        setEditingMethod(null);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to save payment method. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const reordered = [...paymentMethods];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;
    await onSavePaymentMethods(reordered);
    showToast('Reordered payment methods');
  };

  const handleMoveDown = async (index: number) => {
    if (index === paymentMethods.length - 1) return;
    const reordered = [...paymentMethods];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;
    await onSavePaymentMethods(reordered);
    showToast('Reordered payment methods');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onDeletePaymentMethod(deleteTarget.id, reassignMethod);
      showToast(`Removed "${deleteTarget.label || deleteTarget.id}"`);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to delete payment method.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReset = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onResetToDefaults();
      showToast('Reset to default payment methods');
      setIsResetConfirmOpen(false);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to reset payment methods.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
              <CreditCard className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Manage Payment Methods</h3>
              <p className="text-xs text-blue-100/90">
                Cards, UPI apps, wallets, and bank accounts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Toast Feedback */}
        {feedbackMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-100 dark:border-emerald-900 px-4 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in slide-in-from-top-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Payment Mode</span>
            </button>
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              title="Reset to default payment methods"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Defaults</span>
            </button>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {paymentMethods.length} payment modes
          </span>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
          {/* Add / Edit Inline Card */}
          {(isAddingNew || editingMethod) && (
            <div className="p-4 mb-4 bg-white dark:bg-slate-800 border-2 border-blue-500/80 rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  {isAddingNew ? 'Add Payment Mode' : `Edit: ${editingMethod?.label}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingMethod(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSaveForm} className="space-y-4">
                {/* Method Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payment Mode Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ICICI Coral Card, PhonePe, Paytm Wallet, Cash"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 dark:text-white"
                  />
                </div>

                {/* Type Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Category / Type
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PAYMENT_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormType(t)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                          formType === t
                            ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Emoji Icon Picker */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Icon / Badge</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Selected:</span>
                      <span className="text-lg p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">{formIcon}</span>
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 max-h-24 overflow-y-auto grid grid-cols-10 gap-1.5">
                    {POPULAR_PAYMENT_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormIcon(emoji)}
                        className={`text-xl p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition flex items-center justify-center cursor-pointer ${
                          formIcon === emoji ? 'bg-white dark:bg-slate-800 shadow-xs ring-2 ring-blue-500 scale-110' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Update past expenses option */}
                {editingMethod && formName.trim() !== editingMethod.id && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="updatePastExpensesPm"
                      checked={updatePastExpenses}
                      onChange={(e) => setUpdatePastExpenses(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600"
                    />
                    <label htmlFor="updatePastExpensesPm" className="text-xs text-amber-900 dark:text-amber-200 cursor-pointer">
                      <strong>Update past expenses:</strong> Automatically change all previous transactions with &quot;{editingMethod.label}&quot; to &quot;{formName.trim()}&quot;.
                    </label>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setEditingMethod(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formName.trim()}
                    className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmitting ? 'Saving...' : isAddingNew ? 'Add Payment Mode' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Delete / Reassign Prompt Modal */}
          {deleteTarget && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2 text-rose-900 dark:text-rose-200">
                <Trash2 className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">
                    Delete &quot;{deleteTarget.label}&quot;?
                  </h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                    {(usageCounts[deleteTarget.id] || 0) > 0 ? (
                      <>
                        This payment mode is currently used in <strong>{usageCounts[deleteTarget.id]}</strong> transaction(s).
                      </>
                    ) : (
                      'No past expenses are using this payment method.'
                    )}
                  </p>
                </div>
              </div>

              {(usageCounts[deleteTarget.id] || 0) > 0 && (
                <div className="space-y-1.5 bg-white dark:bg-slate-800 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Reassign affected transactions to:
                  </label>
                  <select
                    value={reassignMethod}
                    onChange={(e) => setReassignMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                  >
                    {paymentMethods
                      .filter((pm) => pm.id !== deleteTarget.id)
                      .map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.icon} {pm.label} ({pm.type || 'Mode'})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete & Reassign'}
                </button>
              </div>
            </div>
          )}

          {/* Reset Confirmation */}
          {isResetConfirmOpen && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
                <RotateCcw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">Reset Payment Methods to Default?</h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    This restores default modes (gpay, Axis Card, HDFC card, Swiggy card, Amazon Pay, etc.). Your logged expenses won&apos;t be altered.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReset}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Resetting...' : 'Yes, Reset Defaults'}
                </button>
              </div>
            </div>
          )}

          {/* Methods List */}
          <div className="space-y-1.5">
            {paymentMethods.map((pm, idx) => {
              const count = usageCounts[pm.id] || 0;
              return (
                <div
                  key={pm.id}
                  className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition shadow-2xs group"
                >
                  {/* Left: icon + label */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/80 flex items-center justify-center text-xl shrink-0">
                      {pm.icon || '💳'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white truncate">
                          {pm.label || pm.id}
                        </span>
                        {pm.type && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                            {pm.type}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {count === 0 ? 'Not used yet' : `${count} expense${count > 1 ? 's' : ''}`}
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Move Up */}
                    <button
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    {/* Move Down */}
                    <button
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === paymentMethods.length - 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEdit(pm)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                      title="Edit payment mode"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        const fallback = paymentMethods.find((other) => other.id !== pm.id);
                        if (fallback) setReassignMethod(fallback.id);
                        setDeleteTarget(pm);
                      }}
                      disabled={paymentMethods.length <= 1}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-20 cursor-pointer"
                      title="Delete payment mode"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
