import React, { useState } from 'react';
import { Household, Member, CURRENCIES, CategoryInfo, CATEGORIES } from '../types';
import { 
  Share2, 
  Copy, 
  Check, 
  Users, 
  QrCode, 
  Smartphone, 
  DollarSign, 
  Edit2,
  Layers,
  Settings2,
  Palette
} from 'lucide-react';
import { THEMES } from '../theme';

interface HouseholdManagerProps {
  household: Household;
  currency: string;
  categories?: CategoryInfo[];
  googleDriveSyncNode?: React.ReactNode;
  currentTheme?: string;
  onUpdateHousehold: (updated: Partial<Household>) => Promise<void>;
  onSwitchHousehold: (code: string) => void;
  onOpenCategoryManager?: () => void;
  onOpenThemeSelector?: () => void;
}

export const HouseholdManager: React.FC<HouseholdManagerProps> = ({
  household,
  currency,
  categories,
  googleDriveSyncNode,
  currentTheme,
  onUpdateHousehold,
  onSwitchHousehold,
  onOpenCategoryManager,
  onOpenThemeSelector,
}) => {
  const activeCategories = categories && categories.length > 0 ? categories : (household.categories || CATEGORIES);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [newHouseholdCode, setNewHouseholdCode] = useState('');
  const [isEditingNames, setIsEditingNames] = useState(false);
  const [member1Name, setMember1Name] = useState(household.members[0]?.name || 'Shriya');
  const [member1Avatar, setMember1Avatar] = useState(household.members[0]?.avatar || '👩');
  const [member2Name, setMember2Name] = useState(household.members[1]?.name || 'Husband');
  const [member2Avatar, setMember2Avatar] = useState(household.members[1]?.avatar || '👨');
  const [isSaving, setIsSaving] = useState(false);

  // Current URL with household query param for easy sharing
  const shareableUrl = `${window.location.origin}${window.location.pathname}?household=${household.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(household.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedMembers: Member[] = [
        {
          id: household.members[0]?.id || 'm1',
          name: member1Name.trim() || 'Partner 1',
          avatar: member1Avatar,
          color: household.members[0]?.color || '#10b981',
        },
        {
          id: household.members[1]?.id || 'm2',
          name: member2Name.trim() || 'Partner 2',
          avatar: member2Avatar,
          color: household.members[1]?.color || '#3b82f6',
        },
      ];

      await onUpdateHousehold({
        members: updatedMembers,
      });
      setIsEditingNames(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCurrencyChange = async (newCurr: string) => {
    await onUpdateHousehold({ currency: newCurr });
  };

  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    shareableUrl
  )}`;

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* Share With Partner Hero Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <div className="max-w-2xl space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Shared Household Ledger
          </span>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Share with Your Partner
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 leading-relaxed">
            Both of you can add expenses simultaneously from your phones or laptops. Any entry syncs automatically to this shared ledger.
          </p>

          {/* Household Code and Quick Copy */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium block">
                Household Code
              </span>
              <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white tracking-widest mt-0.5">
                {household.id}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopyCode}
                className="px-4 py-2 rounded-full bg-slate-200/80 dark:bg-white/15 hover:bg-slate-300/80 dark:hover:bg-white/25 text-slate-800 dark:text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied' : 'Copy Direct Link'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Google Drive Automatic Backup & Cross-Device Sync Component */}
      {googleDriveSyncNode}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Phone Scan / QR Code */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center gap-5">
          <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-2xl p-2 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700">
            <img
              src={qrSvgUrl}
              alt="Scan to join shared expense tracker"
              className="w-full h-full object-contain rounded-lg"
              loading="lazy"
            />
          </div>

          <div className="space-y-1.5 text-center sm:text-left">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Scan with Phone
            </span>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Instant Mobile Pairing
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Open the camera app on your partner&apos;s phone. Point at the QR code to open this exact shared household.
            </p>
          </div>
        </div>

        {/* Currency & Preferences */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Currency Format
          </span>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Currency symbol used across transactions, monthly breakdown, and settlement balances.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {CURRENCIES.map((curr) => (
              <button
                key={curr.symbol}
                onClick={() => handleCurrencyChange(curr.symbol)}
                className={`p-2.5 rounded-2xl border text-left text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                  currency === curr.symbol
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-slate-900 dark:text-white ring-1 ring-emerald-500/50'
                    : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>{curr.name}</span>
                <span className="text-sm font-bold">{curr.symbol}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Member Names & Profiles */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Household Members</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Customize names and avatars</p>
          </div>
          <button
            onClick={() => setIsEditingNames(!isEditingNames)}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isEditingNames ? 'Cancel' : 'Edit Names'}</span>
          </button>
        </div>

        {isEditingNames ? (
          <form onSubmit={handleSaveMembers} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Partner 1 */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Partner 1</span>
                <div className="flex gap-2">
                  <select
                    value={member1Avatar}
                    onChange={(e) => setMember1Avatar(e.target.value)}
                    className="p-2 text-base bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {['👩', '👧', '👩‍💼', '🧕', '🧑', '✨'].map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={member1Name}
                    onChange={(e) => setMember1Name(e.target.value)}
                    placeholder="e.g. Shriya"
                    className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Partner 2 */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Partner 2</span>
                <div className="flex gap-2">
                  <select
                    value={member2Avatar}
                    onChange={(e) => setMember2Avatar(e.target.value)}
                    className="p-2 text-base bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {['👨', '🧔', '👨‍💼', '👦', '🧑', '⚡'].map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={member2Name}
                    onChange={(e) => setMember2Name(e.target.value)}
                    placeholder="e.g. Husband"
                    className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingNames(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xs cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Profiles'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {household.members.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/40"
              >
                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-xl shrink-0">
                  {m.avatar}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{m.name}</h4>
                  <p className="text-[11px] text-slate-400">Co-Tracker</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Switch or Join Another Household */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Switch Household</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Connect to a different household code:
        </p>
        <div className="flex gap-2 max-w-md pt-1">
          <input
            type="text"
            placeholder="e.g. HOME-9241"
            value={newHouseholdCode}
            onChange={(e) => setNewHouseholdCode(e.target.value.toUpperCase())}
            className="flex-1 px-4 py-2 text-xs uppercase font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white"
          />
          <button
            onClick={() => {
              if (newHouseholdCode.trim()) {
                onSwitchHousehold(newHouseholdCode.trim());
                setNewHouseholdCode('');
              }
            }}
            disabled={!newHouseholdCode.trim()}
            className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-full disabled:opacity-50 transition cursor-pointer"
          >
            Switch
          </button>
        </div>
      </div>
    </div>
  );
};
