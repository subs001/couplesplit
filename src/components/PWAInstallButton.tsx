import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X, Check, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'button' | 'banner' | 'card';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'button',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already installed and running standalone, hide install triggers
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        await install();
      } finally {
        setInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      {variant === 'banner' ? (
        <div className={`p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/80 dark:bg-indigo-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Install DuoSpend on Your Phone
              </div>
              <div className="text-[11px] text-muted">
                Fast offline access, fullscreen experience, and persistent Google login.
              </div>
            </div>
          </div>

          <button
            onClick={handleInstallClick}
            disabled={installing}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isIOS ? 'Install on iPhone' : 'Install PWA App'}</span>
          </button>
        </div>
      ) : variant === 'card' ? (
        <div className={`p-4 rounded-2xl border border-app bg-surface-subtle space-y-2.5 ${className}`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold">Install as Mobile App (PWA)</div>
              <div className="text-[11px] text-muted">Run directly from your home screen</div>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            disabled={installing}
            className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isIOS ? 'Show iOS Install Instructions' : 'Install Application'}</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleInstallClick}
          disabled={installing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-semibold text-xs transition-all cursor-pointer ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      )}

      {/* iOS Safari Step-by-Step Installation Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-surface rounded-3xl border border-app shadow-2xl p-6 relative">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-subtle text-muted hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-3">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold">Install DuoSpend on iOS</h3>
              <p className="text-xs text-muted mt-1">
                Install as a native-like app on your iPhone or iPad home screen.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-subtle border border-app">
                <div className="p-1.5 rounded-lg bg-surface text-indigo-600 shadow-xs shrink-0 mt-0.5">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Step 1</div>
                  <div className="text-muted text-[11px] mt-0.5">
                    Tap the <strong>Share</strong> icon in the Safari bottom toolbar.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-subtle border border-app">
                <div className="p-1.5 rounded-lg bg-surface text-indigo-600 shadow-xs shrink-0 mt-0.5">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Step 2</div>
                  <div className="text-muted text-[11px] mt-0.5">
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-subtle border border-app">
                <div className="p-1.5 rounded-lg bg-surface text-emerald-600 shadow-xs shrink-0 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Step 3</div>
                  <div className="text-muted text-[11px] mt-0.5">
                    Tap <strong>Add</strong> in the top-right corner. Launch DuoSpend from your home screen!
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
