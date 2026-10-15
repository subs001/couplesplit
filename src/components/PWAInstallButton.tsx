import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Laptop, CheckCircle2, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already running as an installed PWA, hide or show minimal badge
  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Installed App
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setShowModal(true);
          }
        }}
        className="inline-flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
        title="Install CoupleSplit on Android, iPhone, or Laptop"
        aria-label="Install App"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold">Install CoupleSplit App</h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Works seamlessly on Android phones, laptops, and iPhones
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm text-slate-700 max-h-[70vh] overflow-y-auto">
              {isInstallable && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col items-start gap-2">
                  <span className="font-semibold text-emerald-900">One-tap Installation Ready</span>
                  <p className="text-xs text-emerald-700">
                    Your browser supports direct installation. Tap the button below to add to your Home Screen or Desktop.
                  </p>
                  <button
                    onClick={async () => {
                      const success = await install();
                      if (success) setShowModal(false);
                    }}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Install Now
                  </button>
                </div>
              )}

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <Smartphone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-xs">On Android Phone (Direct WebAPK Installation)</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Android automatically generates and installs an official <strong>WebAPK</strong> package on your phone:
                  </p>
                  <ol className="text-xs text-slate-600 list-decimal list-inside mt-1 space-y-0.5">
                    <li>Open this link in Chrome on your phone</li>
                    <li>Tap <strong>&quot;Install app&quot;</strong> or Chrome Menu (⋮) → <strong>&quot;Install app&quot;</strong></li>
                    <li>It installs as a real Android app in your phone&apos;s app drawer with zero security warnings!</li>
                  </ol>
                </div>
              </div>

              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-blue-950">
                  📦 Need a standalone .APK file for sideloading?
                </span>
                <p className="text-[11px] text-blue-800 leading-snug">
                  You can generate a downloadable <strong>.apk</strong> or <strong>.aab</strong> package in 1 minute using Google/Microsoft&apos;s official <strong>PWABuilder</strong> tool: enter your app URL and click <em>Package for Android</em>.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <Laptop className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-xs">On Laptop / PC (Chrome or Edge)</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Look for the <strong>Install icon (⊕ or computer with arrow)</strong> in your browser&apos;s address bar next to the star bookmark icon, or click Menu → <strong>&quot;Install CoupleSplit&quot;</strong>.
                  </p>
                </div>
              </div>

              {isIOS && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <Smartphone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-slate-900 text-xs">On iPhone / iPad (Safari)</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Tap the <strong>Share button (box with arrow ↑)</strong> at the bottom of Safari, scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
