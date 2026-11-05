import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode } from '../types';
import { DynamicIcon, AVAILABLE_ICONS } from '../lib/icons';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Users,
  Palette,
  Tag,
  CreditCard,
  Mail,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  LogOut,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  Sun,
  Moon,
  Flower2,
  Share2,
  Smartphone,
} from 'lucide-react';

const PRESET_COLORS = [
  '#F97316', // Orange
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#F59E0B', // Amber
  '#64748B', // Slate
  '#84CC16', // Lime
  '#6366F1', // Indigo
];

export function Settings() {
  const { userProfile, signOut } = useAuth();
  const {
    account,
    partnerProfile,
    partnerEmailPending,
    invitePartnerByEmail,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    paymentMethods,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    leaveAccount,
  } = useAccount();
  const { theme, setTheme } = useTheme();

  // Partner Invite state
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);
  const [inviteErrorMsg, setInviteErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Category Edit / Add modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState(PRESET_COLORS[0]);
  const [categoryIcon, setCategoryIcon] = useState('Tag');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Payment Method Edit / Add modal state
  const [isPmModalOpen, setIsPmModalOpen] = useState(false);
  const [editingPmId, setEditingPmId] = useState<string | null>(null);
  const [pmName, setPmName] = useState('');
  const [pmIcon, setPmIcon] = useState('CreditCard');
  const [pmError, setPmError] = useState<string | null>(null);

  // Leave account state
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Copy helpers
  const handleCopyCode = () => {
    if (!account) return;
    navigator.clipboard?.writeText(account.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!account) return;
    const url = `${window.location.origin}?join=${account.inviteCode}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInvitePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteErrorMsg(null);
    setInviteSuccessMsg(null);
    setInviting(true);
    try {
      await invitePartnerByEmail(inviteEmailInput);
      setInviteSuccessMsg(`Invitation registered for ${inviteEmailInput}. They can now sign in!`);
      setInviteEmailInput('');
    } catch (err: any) {
      setInviteErrorMsg(err.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  // Category Handlers
  const openAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryName('');
    setCategoryColor(PRESET_COLORS[0]);
    setCategoryIcon('Tag');
    setCategoryError(null);
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (cat: any) => {
    setEditingCategoryId(cat.categoryId);
    setCategoryName(cat.name);
    setCategoryColor(cat.colour);
    setCategoryIcon(cat.icon);
    setCategoryError(null);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);
    if (editingCategoryId) {
      const res = await updateCategory(editingCategoryId, categoryName, categoryColor, categoryIcon);
      if (!res.success) {
        setCategoryError(res.message || 'Failed to update category');
        return;
      }
    } else {
      const res = await addCategory(categoryName, categoryColor, categoryIcon);
      if (!res.success) {
        setCategoryError(res.message || 'Failed to add category');
        return;
      }
    }
    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = async (categoryId: string, name: string) => {
    if (confirm(`Are you sure you want to delete category "${name}"?`)) {
      await deleteCategory(categoryId);
    }
  };

  // Payment Method Handlers
  const openAddPm = () => {
    setEditingPmId(null);
    setPmName('');
    setPmIcon('CreditCard');
    setPmError(null);
    setIsPmModalOpen(true);
  };

  const openEditPm = (pm: any) => {
    setEditingPmId(pm.paymentMethodId);
    setPmName(pm.name);
    setPmIcon(pm.icon);
    setPmError(null);
    setIsPmModalOpen(true);
  };

  const handleSavePm = async (e: React.FormEvent) => {
    e.preventDefault();
    setPmError(null);
    if (editingPmId) {
      const res = await updatePaymentMethod(editingPmId, pmName, pmIcon);
      if (!res.success) {
        setPmError(res.message || 'Failed to update payment method');
        return;
      }
    } else {
      const res = await addPaymentMethod(pmName, pmIcon);
      if (!res.success) {
        setPmError(res.message || 'Failed to add payment method');
        return;
      }
    }
    setIsPmModalOpen(false);
  };

  const handleDeletePm = async (pmId: string, name: string) => {
    if (confirm(`Are you sure you want to delete payment method "${name}"?`)) {
      await deletePaymentMethod(pmId);
    }
  };

  const isConnected = account && account.memberUids.length >= 2;

  return (
    <div className="space-y-8 pb-20 md:pb-8 max-w-4xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">Settings & Preferences</h1>
        <p className="text-xs text-muted mt-0.5">
          Manage your shared account, partner connection, categories, and themes
        </p>
      </div>

      {/* 1. Theme Selection Section */}
      <div className="p-6 rounded-3xl border bg-surface border-app shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-600" />
            <span>Theme & Appearance</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Choose your preferred aesthetic. Persists across sessions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Light Theme */}
          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              theme === 'light'
                ? 'border-indigo-600 bg-white ring-2 ring-indigo-500 shadow-md text-slate-900'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              {theme === 'light' && (
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </div>
            <div className="font-bold text-xs">Light Mode</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Clean white & crisp soft slate
            </div>
          </button>

          {/* Dark Theme */}
          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              theme === 'dark'
                ? 'border-indigo-500 bg-slate-900 ring-2 ring-indigo-500 shadow-md text-white'
                : 'border-slate-700 bg-slate-800 hover:border-slate-600 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center">
                <Moon className="w-4 h-4" />
              </div>
              {theme === 'dark' && (
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
              )}
            </div>
            <div className="font-bold text-xs">Dark Mode</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Deep charcoal with comfortable contrast
            </div>
          </button>

          {/* Sakura Pink Theme */}
          <button
            onClick={() => setTheme('sakura')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              theme === 'sakura'
                ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-500 shadow-md text-rose-950'
                : 'border-rose-200 bg-rose-50/50 hover:border-rose-300 text-rose-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-rose-200 text-rose-700 flex items-center justify-center">
                <Flower2 className="w-4 h-4" />
              </div>
              {theme === 'sakura' && (
                <span className="w-2 h-2 rounded-full bg-rose-600" />
              )}
            </div>
            <div className="font-bold text-xs">Sakura Pink</div>
            <div className="text-[11px] text-rose-600 mt-1">
              Soft pastel blush & muted rose accents
            </div>
          </button>
        </div>
      </div>

      {/* PWA Mobile Installation Section */}
      <div className="p-6 rounded-3xl border bg-surface border-app shadow-xs space-y-3">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-indigo-600" />
          <span>Mobile App (PWA)</span>
        </h2>
        <p className="text-xs text-muted">
          Install DuoSpend directly on your phone's home screen for offline-ready, standalone mobile app access.
        </p>
        <PWAInstallButton variant="card" />
      </div>

      {/* 2. Connected Users & Shared Account Section */}
      <div className="p-6 rounded-3xl border bg-surface border-app shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Shared Account & Partner Access</span>
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Account: <strong className="text-slate-800 dark:text-slate-200">{account?.name || 'Our Expenses'}</strong> (Max 2 authorized users)
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
              isConnected
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            {isConnected ? '2/2 Connected' : '1/2 Members'}
          </span>
        </div>

        {/* Member Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* User 1 (You) */}
          <div className="p-4 rounded-2xl border border-app bg-surface-subtle flex items-center gap-3">
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt=""
                className="w-11 h-11 rounded-full object-cover ring-2 ring-indigo-500"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-indigo-600 text-white font-bold text-base flex items-center justify-center">
                {userProfile?.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="truncate">
              <div className="text-xs font-bold truncate flex items-center gap-1.5">
                <span>{userProfile?.displayName}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                  You
                </span>
              </div>
              <div className="text-[11px] text-muted truncate">{userProfile?.email}</div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                <Check className="w-3 h-3" /> Signed In
              </span>
            </div>
          </div>

          {/* User 2 (Partner) */}
          <div className="p-4 rounded-2xl border border-app bg-surface-subtle flex items-center gap-3">
            {isConnected && partnerProfile?.photoURL ? (
              <img
                src={partnerProfile.photoURL}
                alt=""
                className="w-11 h-11 rounded-full object-cover ring-2 ring-rose-500"
              />
            ) : isConnected && partnerProfile ? (
              <div className="w-11 h-11 rounded-full bg-rose-600 text-white font-bold text-base flex items-center justify-center">
                {partnerProfile.displayName.charAt(0)}
              </div>
            ) : (
              <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 text-muted flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            )}

            <div className="truncate flex-1">
              {isConnected && partnerProfile ? (
                <>
                  <div className="text-xs font-bold truncate flex items-center gap-1.5">
                    <span>{partnerProfile.displayName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                      Partner
                    </span>
                  </div>
                  <div className="text-[11px] text-muted truncate">{partnerProfile.email}</div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                    <Check className="w-3 h-3" /> Connected
                  </span>
                </>
              ) : partnerEmailPending ? (
                <>
                  <div className="text-xs font-bold truncate">Partner Pending</div>
                  <div className="text-[11px] text-muted truncate">{partnerEmailPending}</div>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5 block">
                    Awaiting partner Google login
                  </span>
                </>
              ) : (
                <>
                  <div className="text-xs font-bold">Partner Not Connected</div>
                  <div className="text-[11px] text-muted">Invite your partner below</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Invite Code & Share Link */}
        {account && (
          <div className="p-4 rounded-2xl bg-surface-subtle border border-app space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold">6-Digit Invite Code</span>
                <p className="text-[11px] text-muted">
                  Your partner can enter this code on the DuoSpend home screen to instantly join.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl border border-app bg-surface font-mono font-bold tracking-widest text-sm">
                  {account.inviteCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Direct Email Invite Form */}
            {!isConnected && (
              <form onSubmit={handleInvitePartner} className="pt-3 border-t border-app space-y-2">
                <label className="block text-xs font-semibold">
                  Or Authorize Partner by Google Email
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
                    <input
                      type="email"
                      required
                      value={inviteEmailInput}
                      onChange={(e) => setInviteEmailInput(e.target.value)}
                      placeholder="partner@gmail.com"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-app bg-surface text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {inviting ? 'Saving...' : 'Authorize'}
                  </button>
                </div>
                {inviteSuccessMsg && (
                  <p className="text-[11px] text-emerald-600 font-medium">{inviteSuccessMsg}</p>
                )}
                {inviteErrorMsg && (
                  <p className="text-[11px] text-red-600 font-medium">{inviteErrorMsg}</p>
                )}
              </form>
            )}
          </div>
        )}
      </div>

      {/* 3. Category Management */}
      <div className="p-6 rounded-3xl border bg-surface border-app shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-600" />
              <span>Expense Categories</span>
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Custom categories shared in real-time between both users ({categories.length} total)
            </p>
          </div>
          <button
            onClick={openAddCategory}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.categoryId}
              className="p-3 rounded-2xl border border-app bg-surface-subtle flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${cat.colour}20`, color: cat.colour }}
                >
                  <DynamicIcon name={cat.icon} className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold truncate">{cat.name}</span>
              </div>

              <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEditCategory(cat)}
                  className="p-1 rounded-lg hover:bg-surface text-muted hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.categoryId, cat.name)}
                  className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-muted hover:text-red-600 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Payment Method Management */}
      <div className="p-6 rounded-3xl border bg-surface border-app shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Payment Methods</span>
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Payment channels shared across both users ({paymentMethods.length} total)
            </p>
          </div>
          <button
            onClick={openAddPm}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Method</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {paymentMethods.map((pm) => (
            <div
              key={pm.paymentMethodId}
              className="p-3 rounded-2xl border border-app bg-surface-subtle flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center shrink-0 border border-app text-indigo-600">
                  <DynamicIcon name={pm.icon} className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold truncate">{pm.name}</span>
              </div>

              <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEditPm(pm)}
                  className="p-1 rounded-lg hover:bg-surface text-muted hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeletePm(pm.paymentMethodId, pm.name)}
                  className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-muted hover:text-red-600 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Account Disconnect & Logout */}
      <div className="p-6 rounded-3xl border bg-surface border-app shadow-xs space-y-4">
        <h2 className="text-sm font-bold">Account Session & Security</h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-app">
          <div>
            <div className="text-xs font-semibold">Sign Out of Google</div>
            <div className="text-[11px] text-muted">
              You will need to sign in again to access DuoSpend.
            </div>
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-app">
          <div>
            <div className="text-xs font-semibold text-rose-600">Disconnect / Leave Shared Account</div>
            <div className="text-[11px] text-muted">
              Unlink yourself from this shared space.
            </div>
          </div>
          {confirmLeave ? (
            <div className="flex items-center gap-2">
              <button
                onClick={leaveAccount}
                className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-semibold text-xs cursor-pointer"
              >
                Confirm Leave
              </button>
              <button
                onClick={() => setConfirmLeave(false)}
                className="px-3 py-1.5 rounded-xl border border-app text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmLeave(true)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-muted hover:text-rose-600 transition-colors cursor-pointer"
            >
              Leave Account
            </button>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-surface rounded-3xl border border-app shadow-2xl p-6">
            <h3 className="text-base font-bold mb-3">
              {editingCategoryId ? 'Edit Category' : 'Create Category'}
            </h3>

            {categoryError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs">
                {categoryError}
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Coffee, Streaming, Pet Care"
                  className="w-full px-3 py-2 rounded-xl border border-app bg-transparent text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCategoryColor(color)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                        categoryColor === color ? 'scale-110 ring-2 ring-indigo-500 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {categoryColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">Icon</label>
                <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 border border-app rounded-xl bg-surface-subtle">
                  {AVAILABLE_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setCategoryIcon(iconName)}
                      className={`p-2 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
                        categoryIcon === iconName
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'hover:bg-surface text-muted'
                      }`}
                    >
                      <DynamicIcon name={iconName} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-app text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {isPmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-surface rounded-3xl border border-app shadow-2xl p-6">
            <h3 className="text-base font-bold mb-3">
              {editingPmId ? 'Edit Payment Method' : 'Create Payment Method'}
            </h3>

            {pmError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs">
                {pmError}
              </div>
            )}

            <form onSubmit={handleSavePm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Method Name</label>
                <input
                  type="text"
                  required
                  value={pmName}
                  onChange={(e) => setPmName(e.target.value)}
                  placeholder="e.g. Amazon Pay, Paytm Wallet"
                  className="w-full px-3 py-2 rounded-xl border border-app bg-transparent text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">Icon</label>
                <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 border border-app rounded-xl bg-surface-subtle">
                  {AVAILABLE_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setPmIcon(iconName)}
                      className={`p-2 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
                        pmIcon === iconName
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'hover:bg-surface text-muted'
                      }`}
                    >
                      <DynamicIcon name={iconName} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPmModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-app text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Save Method
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
