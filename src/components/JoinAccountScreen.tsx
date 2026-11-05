import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import {
  Users,
  PlusCircle,
  KeyRound,
  Mail,
  ArrowRight,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export function JoinAccountScreen() {
  const { userProfile, signOut } = useAuth();
  const {
    createNewAccount,
    joinAccountByCode,
    joinAccountById,
    pendingInvitations,
  } = useAccount();

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [accountName, setAccountName] = useState('Our Expenses');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await createNewAccount(accountName, partnerEmail);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create shared account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setErrorMsg('Please enter an invite code');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const success = await joinAccountByCode(inviteCode.trim());
      if (!success) {
        setErrorMsg('Invalid invite code. Please check and try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to join account with this code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptInvite = async (accountId: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await joinAccountById(accountId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to accept invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative safe-top safe-bottom">
      {/* Top bar with user profile & logout */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted">
          {userProfile?.photoURL ? (
            <img
              src={userProfile.photoURL}
              alt=""
              className="w-7 h-7 rounded-full object-cover border border-slate-300"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
              {userProfile?.displayName?.charAt(0) || 'U'}
            </div>
          )}
          <span className="hidden sm:inline font-medium">{userProfile?.displayName}</span>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs text-muted hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-rose-500 text-white shadow-lg mb-3">
            <Users className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Connect Your Duo Account</h1>
          <p className="text-xs text-muted mt-1">
            DuoSpend tracks expenses for two partners. Set up your shared space to get started.
          </p>
        </div>

        {/* Pending Invites Alert */}
        {pendingInvitations.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl border border-indigo-200 bg-indigo-50/80 dark:bg-indigo-950/40 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <h3 className="text-xs font-semibold uppercase tracking-wider">
                Invitation Found!
              </h3>
            </div>
            {pendingInvitations.map((inv) => (
              <div
                key={inv.accountId}
                className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-semibold">{inv.name}</div>
                  <div className="text-xs text-muted">
                    Invited: {inv.memberEmails.join(', ')}
                  </div>
                </div>
                <button
                  onClick={() => handleAcceptInvite(inv.accountId)}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Join</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border mb-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white dark:bg-slate-900 shadow-sm font-semibold text-indigo-600 dark:text-indigo-400'
                : 'text-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create New Shared Account</span>
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'join'
                ? 'bg-white dark:bg-slate-900 shadow-sm font-semibold text-indigo-600 dark:text-indigo-400'
                : 'text-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Join with Code</span>
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="p-6 rounded-3xl border shadow-lg bg-surface border-app">
          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Shared Account Name
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Home & Life, Vacation & Bills"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Partner's Google Email <span className="font-normal text-muted">(Optional now)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-muted" />
                  <input
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    placeholder="partner@gmail.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent border-slate-300 dark:border-slate-700"
                  />
                </div>
                <p className="text-[11px] text-muted mt-1.5">
                  You can also invite your partner anytime later via direct link or 6-digit invite code.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Creating account...' : 'Create Shared Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinByCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  6-Digit Invite Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A9X4B2"
                  className="w-full px-3.5 py-3 rounded-xl border text-center font-mono text-lg tracking-widest font-bold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent border-slate-300 dark:border-slate-700"
                />
                <p className="text-[11px] text-muted mt-1.5 text-center">
                  Ask your partner for the 6-digit code shown in their DuoSpend Settings.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || inviteCode.length < 4}
                className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Connecting...' : 'Join Shared Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
