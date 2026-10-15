import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  signInWithGoogle,
  signOutGoogle,
  DriveFileMeta,
} from '../services/googleDrive';
import { 
  Cloud, 
  CloudCheck, 
  CloudUpload, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Shield,
  Smartphone,
  Laptop
} from 'lucide-react';

interface GoogleDriveSyncProps {
  currentUser: User | null;
  accessToken: string | null;
  lastBackupMeta: DriveFileMeta | null;
  lastBackupTime: string | null;
  isAutoBackupEnabled: boolean;
  isBackingUp: boolean;
  isRestoring: boolean;
  onToggleAutoBackup: (enabled: boolean) => void;
  onBackupNow: () => Promise<void>;
  onRestoreFromDrive: () => Promise<void>;
  onAuthSuccess: (user: User, token: string) => void;
  onAuthSignOut: () => void;
}

export const GoogleDriveSync: React.FC<GoogleDriveSyncProps> = ({
  currentUser,
  accessToken,
  lastBackupMeta,
  lastBackupTime,
  isAutoBackupEnabled,
  isBackingUp,
  isRestoring,
  onToggleAutoBackup,
  onBackupNow,
  onRestoreFromDrive,
  onAuthSuccess,
  onAuthSignOut,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const res = await signInWithGoogle();
      if (res) {
        onAuthSuccess(res.user, res.accessToken);
        setSuccessMsg(`Connected as ${res.user.email}`);
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed';
      setError(msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutGoogle();
      onAuthSignOut();
      setSuccessMsg('Disconnected Google Drive');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign out failed';
      setError(msg);
    }
  };

  const handleManualBackup = async () => {
    setError(null);
    try {
      await onBackupNow();
      setSuccessMsg('Backup to Google Drive succeeded!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Backup failed');
    }
  };

  const handleManualRestore = async () => {
    setError(null);
    const confirmed = window.confirm(
      'Sync and merge latest expenses from Google Drive? Any expenses added from other devices will be brought into this device.'
    );
    if (!confirmed) return;

    try {
      await onRestoreFromDrive();
      setSuccessMsg('Successfully synced and updated from Google Drive!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sync from Drive failed');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
      {/* Top Banner */}
      <div className="p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-xs">
            <Cloud className="w-3.5 h-3.5" />
            <span>Google Drive Cloud Sync</span>
          </div>
          <h3 className="text-xl font-bold tracking-tight">
            Automatic Google Drive Backup & Cross-Device Sync
          </h3>
          <p className="text-xs text-blue-100 max-w-xl">
            Keep your shared expenses safely backed up in your Google Drive and in sync across your Android phone and laptop.
          </p>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2 self-start sm:self-center bg-white/10 px-3.5 py-2 rounded-2xl border border-white/20 backdrop-blur-xs">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName || 'Google User'}
                className="w-8 h-8 rounded-full border border-white/40"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white text-blue-600 font-bold flex items-center justify-center text-xs">
                {currentUser.displayName ? currentUser.displayName[0] : 'G'}
              </div>
            )}
            <div className="text-left">
              <div className="text-xs font-bold truncate max-w-[140px]">
                {currentUser.displayName || 'Connected'}
              </div>
              <div className="text-[10px] text-blue-200 truncate max-w-[140px]">
                {currentUser.email}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Messages */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {!currentUser ? (
          /* Sign In Call to Action */
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Cloud className="w-6 h-6" />
            </div>

            <div>
              <h4 className="font-extrabold text-sm text-slate-900">
                Connect Your Google Drive Account
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Sign in with Google to enable automatic daily backups into a dedicated &quot;CoupleSplit Backups&quot; folder in your Google Drive.
              </p>
            </div>

            {/* Official Material Google Sign In Button */}
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-xs transition mx-auto disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>
          </div>
        ) : (
          /* Connected State & Controls */
          <div className="space-y-6">
            {/* Status & Toggle Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Backup status card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500 uppercase">Drive Status</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </span>
                </div>

                <div className="text-sm font-extrabold text-slate-800">
                  {lastBackupTime ? `Last synced: ${lastBackupTime}` : 'Ready for first backup'}
                </div>

                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 pt-1">
                  <span>Folder: &quot;CoupleSplit Backups&quot;</span>
                  {lastBackupMeta?.webViewLink && (
                    <a
                      href={lastBackupMeta.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                    >
                      <span>View file in Google Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Automatic Regular Backup Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900">
                    Regular Automatic Backup
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Automatically backs up to Google Drive every time you add an expense and periodically every 15 minutes.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isAutoBackupEnabled}
                    onChange={(e) => onToggleAutoBackup(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {/* Action Buttons: Back Up Now, Sync from Drive, Sign Out */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
              <button
                onClick={handleManualBackup}
                disabled={isBackingUp}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {isBackingUp ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudUpload className="w-4 h-4" />
                )}
                <span>{isBackingUp ? 'Backing up to Drive...' : 'Back Up to Google Drive Now'}</span>
              </button>

              <button
                onClick={handleManualRestore}
                disabled={isRestoring}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-xs transition disabled:opacity-50"
              >
                {isRestoring ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                )}
                <span>{isRestoring ? 'Syncing...' : 'Sync & Merge from Google Drive'}</span>
              </button>

              <button
                onClick={handleSignOut}
                className="sm:ml-auto px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition text-center"
              >
                Disconnect Google Drive
              </button>
            </div>
          </div>
        )}

        {/* Informative Guidance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
            <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block mb-0.5">On Your Phone</strong>
              Any expense you or your husband enters is saved to your shared Google Drive file in the cloud.
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
            <Laptop className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block mb-0.5">On Your Laptop</strong>
              Open CoupleSplit on your laptop to view identical records, or hit &quot;Sync &amp; Merge&quot; to restore from Drive anytime.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
