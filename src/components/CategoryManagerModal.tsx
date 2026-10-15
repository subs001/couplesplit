import React, { useState } from 'react';
import { CategoryInfo, Expense, CATEGORIES } from '../types';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  Check, 
  Sparkles,
  Layers,
  HelpCircle
} from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryInfo[];
  expenses: Expense[];
  onSaveCategories: (
    updatedCategories: CategoryInfo[], 
    renameMap?: { oldId: string; newId: string; updatePastExpenses: boolean }
  ) => Promise<void>;
  onDeleteCategory: (catId: string, reassignToCatId?: string) => Promise<void>;
  onResetToDefaults: () => Promise<void>;
}

// Preset modern color palette
const COLOR_PRESETS = [
  { color: '#10b981', bgLight: '#ecfdf5', label: 'Emerald' },
  { color: '#06b6d4', bgLight: '#ecfeff', label: 'Cyan' },
  { color: '#3b82f6', bgLight: '#eff6ff', label: 'Blue' },
  { color: '#6366f1', bgLight: '#eef2ff', label: 'Indigo' },
  { color: '#8b5cf6', bgLight: '#f5f3ff', label: 'Purple' },
  { color: '#d946ef', bgLight: '#fdf4ff', label: 'Fuchsia' },
  { color: '#ec4899', bgLight: '#fdf2f8', label: 'Pink' },
  { color: '#f43f5e', bgLight: '#fff1f2', label: 'Rose' },
  { color: '#ea580c', bgLight: '#fff7ed', label: 'Orange' },
  { color: '#eab308', bgLight: '#fefce8', label: 'Amber' },
  { color: '#84cc16', bgLight: '#f7fee7', label: 'Lime' },
  { color: '#64748b', bgLight: '#f8fafc', label: 'Slate' },
];

// Popular emojis for household expenses
const POPULAR_EMOJIS = [
  '🛒', '🍽️', '🏠', '🛠️', '⚡', '📶', '💧', '⛽', '🚗', '🥞',
  '🍿', '📱', '🏖️', '🧹', '🎬', '🛍️', '🛋️', '🏥', '🐾', '👶',
  '📚', '🎁', '🏋️', '✈️', '👔', '☕', '🎮', '💳', '💈', '💊',
  '🌿', '🧘', '🎂', '🍼', '🐶', '🐱', '🚴', '🚆', '🚕', '📦',
  '🧴', '🧼', '💻', '💡', '🥖', '🍎', '🍕', '🍻', '🔧', '🩺'
];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  expenses,
  onSaveCategories,
  onDeleteCategory,
  onResetToDefaults,
}) => {
  // Current local state for editing / reordering
  const [editingCat, setEditingCat] = useState<CategoryInfo | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deleteTargetCat, setDeleteTargetCat] = useState<CategoryInfo | null>(null);
  const [reassignCategory, setReassignCategory] = useState<string>('Miscellaneous');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Form state for Add / Edit
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('🏷️');
  const [formColor, setFormColor] = useState('#10b981');
  const [formBgLight, setFormBgLight] = useState('#ecfdf5');
  const [updatePastExpenses, setUpdatePastExpenses] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Count expenses per category
  const expenseCounts: Record<string, number> = {};
  expenses.forEach((e) => {
    expenseCounts[e.category] = (expenseCounts[e.category] || 0) + 1;
  });

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Open add form
  const handleOpenAdd = () => {
    setEditingCat(null);
    setFormName('');
    setFormIcon('🛍️');
    setFormColor('#10b981');
    setFormBgLight('#ecfdf5');
    setUpdatePastExpenses(true);
    setIsAddingNew(true);
  };

  // Open edit form
  const handleOpenEdit = (cat: CategoryInfo) => {
    setIsAddingNew(false);
    setEditingCat(cat);
    setFormName(cat.label || cat.id);
    setFormIcon(cat.icon || '🏷️');
    setFormColor(cat.color || '#10b981');
    setFormBgLight(cat.bgLight || '#ecfdf5');
    setUpdatePastExpenses(true);
  };

  const handleSelectColor = (preset: typeof COLOR_PRESETS[0]) => {
    setFormColor(preset.color);
    setFormBgLight(preset.bgLight);
  };

  // Save add / edit
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) return;

    setIsSubmitting(true);
    try {
      if (isAddingNew) {
        // Check duplicate
        if (categories.some((c) => c.id.toLowerCase() === cleanName.toLowerCase())) {
          alert(`A category named "${cleanName}" already exists.`);
          setIsSubmitting(false);
          return;
        }

        const newCat: CategoryInfo = {
          id: cleanName,
          label: cleanName,
          icon: formIcon.trim() || '🏷️',
          color: formColor,
          bgLight: formBgLight,
        };

        const updated = [...categories, newCat];
        await onSaveCategories(updated);
        showToast(`Added "${cleanName}" category & synced`);
        setIsAddingNew(false);
      } else if (editingCat) {
        const isRenamed = cleanName !== editingCat.id;
        const updatedCat: CategoryInfo = {
          id: cleanName,
          label: cleanName,
          icon: formIcon.trim() || '🏷️',
          color: formColor,
          bgLight: formBgLight,
        };

        const updated = categories.map((c) => (c.id === editingCat.id ? updatedCat : c));

        await onSaveCategories(
          updated,
          isRenamed
            ? {
                oldId: editingCat.id,
                newId: cleanName,
                updatePastExpenses,
              }
            : undefined
        );

        showToast(`Updated "${cleanName}" & synced`);
        setEditingCat(null);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Move Category Up
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const reordered = [...categories];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;
    await onSaveCategories(reordered);
    showToast('Reordered categories');
  };

  // Move Category Down
  const handleMoveDown = async (index: number) => {
    if (index === categories.length - 1) return;
    const reordered = [...categories];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;
    await onSaveCategories(reordered);
    showToast('Reordered categories');
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTargetCat) return;
    setIsSubmitting(true);
    try {
      await onDeleteCategory(deleteTargetCat.id, reassignCategory);
      showToast(`Removed "${deleteTargetCat.label || deleteTargetCat.id}"`);
      setDeleteTargetCat(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset to default
  const handleConfirmReset = async () => {
    setIsSubmitting(true);
    try {
      await onResetToDefaults();
      showToast('Reset to default household categories');
      setIsResetConfirmOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to reset categories');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
              <Layers className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Customize Categories</h3>
              <p className="text-xs text-emerald-100/90">
                Syncs across all linked phones and laptops
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Toast Feedback */}
        {feedbackMsg && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in slide-in-from-top-2">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Category</span>
            </button>
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
              title="Reset to default categories"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Defaults</span>
            </button>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {categories.length} categories
          </span>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2">
          {/* Add / Edit Inline Card */}
          {(isAddingNew || editingCat) && (
            <div className="p-4 mb-4 bg-white border-2 border-emerald-500/80 rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isAddingNew ? 'Add New Category' : `Edit Category: ${editingCat?.label}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingCat(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveForm} className="space-y-4">
                {/* Name Input */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Category Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pet Care, Fitness, Investments, Baby"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                {/* Emoji Icon Picker */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Icon / Emoji</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500">Selected:</span>
                      <span className="text-lg p-1 bg-slate-100 rounded-lg">{formIcon}</span>
                    </div>
                  </div>

                  {/* Quick emoji grid */}
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 max-h-28 overflow-y-auto grid grid-cols-8 sm:grid-cols-10 gap-1.5">
                    {POPULAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormIcon(emoji)}
                        className={`text-xl p-1.5 rounded-lg hover:bg-white transition flex items-center justify-center ${
                          formIcon === emoji ? 'bg-white shadow-xs ring-2 ring-emerald-500 scale-110' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {/* Custom emoji or text */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-slate-500 shrink-0">Or type custom emoji:</span>
                    <input
                      type="text"
                      maxLength={4}
                      value={formIcon}
                      onChange={(e) => setFormIcon(e.target.value)}
                      className="w-16 px-2 py-1 text-center text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Color Palette */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Category Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        onClick={() => handleSelectColor(preset)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform ${
                          formColor === preset.color
                            ? 'scale-110 ring-2 ring-offset-2 ring-slate-800'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset.color }}
                        title={preset.label}
                      >
                        {formColor === preset.color && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Badge */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Button Preview:</span>
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-xs shadow-xs"
                    style={{
                      borderColor: formColor,
                      backgroundColor: formBgLight,
                      color: '#0f172a',
                    }}
                  >
                    <span className="text-base">{formIcon}</span>
                    <span>{formName.trim() || 'Category Name'}</span>
                  </div>
                </div>

                {/* Rename past expenses checkbox if editing an existing category that has past expenses */}
                {editingCat && editingCat.id !== formName.trim() && (expenseCounts[editingCat.id] || 0) > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                    <label className="flex items-start gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={updatePastExpenses}
                        onChange={(e) => setUpdatePastExpenses(e.target.checked)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>
                        Also update <strong>{expenseCounts[editingCat.id]} past expenses</strong> to use the new name &quot;{formName.trim() || 'New Name'}&quot;
                      </span>
                    </label>
                    <p className="text-[11px] text-amber-700 pl-5">
                      This keeps your monthly category spending breakdown clean and connected.
                    </p>
                  </div>
                )}

                {/* Submit / Cancel Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setEditingCat(null);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formName.trim()}
                    className="px-5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs disabled:opacity-50 transition"
                  >
                    {isSubmitting ? 'Saving...' : isAddingNew ? 'Create Category' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Reorder and Edit List */}
          <div className="space-y-1.5">
            {categories.map((cat, idx) => {
              const count = expenseCounts[cat.id] || 0;
              return (
                <div
                  key={cat.id}
                  className="p-2.5 sm:p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-2 transition-colors shadow-2xs"
                >
                  {/* Left: Reorder Arrows & Info */}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5 text-slate-400">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveUp(idx)}
                        className="p-0.5 hover:text-slate-700 disabled:opacity-20 transition"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === categories.length - 1}
                        onClick={() => handleMoveDown(idx)}
                        className="p-0.5 hover:text-slate-700 disabled:opacity-20 transition"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Icon Badge */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-2xs"
                      style={{ backgroundColor: cat.bgLight || '#f1f5f9' }}
                    >
                      {cat.icon}
                    </div>

                    {/* Name & Count */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {cat.label || cat.id}
                        </span>
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                          title={cat.color}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {count === 0 ? 'No expenses' : `${count} expense${count === 1 ? '' : 's'}`}
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 sm:px-2.5 sm:py-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      title="Edit Category"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTargetCat(cat);
                        // default reassign to first other category
                        const other = categories.find((c) => c.id !== cat.id);
                        setReassignCategory(other ? other.id : 'Miscellaneous');
                      }}
                      className="p-1.5 sm:px-2.5 sm:py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5 shrink-0">
          <Check className="w-3 h-3 text-emerald-600" />
          <span>All category changes sync automatically across all linked accounts & devices</span>
        </div>
      </div>

      {/* Delete Confirmation Sub-modal */}
      {deleteTargetCat && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Delete &quot;{deleteTargetCat.label || deleteTargetCat.id}&quot;?
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  This will remove the category from your daily list.
                </p>
              </div>
            </div>

            {(expenseCounts[deleteTargetCat.id] || 0) > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                <p className="font-semibold">
                  ⚠️ There are {expenseCounts[deleteTargetCat.id]} past expenses under this category.
                </p>
                <label className="block text-[11px] text-amber-800 font-medium">
                  Reassign those expenses to:
                </label>
                <select
                  value={reassignCategory}
                  onChange={(e) => setReassignCategory(e.target.value)}
                  className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {categories
                    .filter((c) => c.id !== deleteTargetCat.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label || c.id}
                      </option>
                    ))}
                  <option value="Miscellaneous">📦 Miscellaneous</option>
                </select>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                No expenses currently use this category, so it can be safely removed.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetCat(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Defaults Confirmation Sub-modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Reset to Default Categories?
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  This will restore the original 17 household categories (Groceries, Dining/Food, Rent, Maintenance, Electricity, Wifi, RO, Fuel, Transport, Pancake, Netflix, Mobile bills, Vacations, Maid, Entertainement, Shopping, House things shopping).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmReset}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
              >
                {isSubmitting ? 'Resetting...' : 'Yes, Reset Defaults'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
