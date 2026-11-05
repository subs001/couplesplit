import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PWAInstallButton } from './PWAInstallButton';
import { Users, ShieldCheck, PieChart, Sparkles, AlertCircle, Smartphone, ArrowRight } from 'lucide-react';

export function AuthScreen() {
  const { signInWithGoogle, error, clearError, isStandalone } = useAuth();
  const { theme, setTheme } = useTheme();
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async (useRedirect = false) => {
    setSigningIn(true);
    try {
      await signInWithGoogle(useRedirect);
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden safe-top safe-bottom">
      {/* Background ambient gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 rounded-full blur-3xl opacity-20 pointer-events-none bg-indigo-500" />

      {/* Theme quick selector on top right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-1.5 text-xs z-10">
        <button
          onClick={() => setTheme('light')}
          className={`px-2.5 py-1 rounded-full border transition-all ${
            theme === 'light'
              ? 'bg-white shadow-xs border-slate-300 font-semibold text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Light
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`px-2.5 py-1 rounded-full border transition-all ${
            theme === 'dark'
              ? 'bg-slate-800 border-slate-700 font-semibold text-white'
              : 'border-transparent text-slate-500 hover:text-slate-200'
          }`}
        >
          Dark
        </button>
        <button
          onClick={() => setTheme('sakura')}
          className={`px-2.5 py-1 rounded-full border transition-all ${
            theme === 'sakura'
              ? 'bg-rose-100 border-rose-300 font-semibold text-rose-900'
              : 'border-transparent text-rose-600 hover:text-rose-900'
          }`}
        >
          Sakura
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl overflow-hidden shadow-xl shadow-indigo-500/25 mb-3 sm:mb-4">
            <img src="/app-logo.svg" alt="DuoSpend App Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">DuoSpend</h1>
          <p className="text-xs sm:text-sm mt-1.5 text-muted">
            Shared expense & budget tracker designed for two.
          </p>
          {isStandalone && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold mt-2">
              <Smartphone className="w-3 h-3" /> PWA Standalone Mode
            </span>
          )}
        </div>

        {/* Auth Card */}
        <div className="p-6 sm:p-8 rounded-3xl border shadow-xl backdrop-blur-sm bg-surface border-app">
          <div className="space-y-3.5 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold">Exclusively for Two</h3>
                <p className="text-[11px] sm:text-xs text-muted">
                  Connect with your partner, roommate, or buddy to track shared finances.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold">Real-Time Sync & PWA Ready</h3>
                <p className="text-[11px] sm:text-xs text-muted">
                  Expenses and balances update instantaneously on both phones.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 shrink-0">
                <PieChart className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold">Smart Split & Analytics</h3>
                <p className="text-[11px] sm:text-xs text-muted">
                  Equal, personal, or custom splits with clear "who owes whom" tracking.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
                <button onClick={clearError} className="underline ml-2 cursor-pointer">Dismiss</button>
              </div>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            onClick={() => handleSignIn(false)}
            disabled={signingIn}
            className="w-full min-h-[48px] flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-70 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700 cursor-pointer active:scale-98"
          >
            {signingIn ? (
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>{signingIn ? 'Signing in...' : 'Continue with Google'}</span>
          </button>

          {/* Mobile direct redirect option */}
          <div className="mt-3 text-center">
            <button
              onClick={() => handleSignIn(true)}
              disabled={signingIn}
              className="text-[11px] text-muted hover:text-indigo-600 underline cursor-pointer"
            >
              Having trouble with popups on phone? Tap to sign in via redirect
            </button>
          </div>

          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Persistent authentication session</span>
          </div>
        </div>

        {/* PWA Install Banner */}
        <div className="mt-5">
          <PWAInstallButton variant="banner" />
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-muted mt-6">
          Both users sign in securely with their own Google account.
        </p>
      </div>
    </div>
  );
}
