import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { Expense, Household, Settlement, Member, CATEGORIES, CategoryInfo, PaymentMethodInfo, PAYMENT_METHODS } from './types';
import {
  fetchHousehold,
  createOrJoinHousehold,
  updateHousehold,
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  fetchSettlements,
  createSettlement,
  syncDriveBackup,
  batchUpdateCategory,
  batchUpdatePaymentMethod,
} from './services/api';
import {
  initGoogleAuth,
  uploadBackupToDrive,
  downloadBackupFromDrive,
  DriveFileMeta,
} from './services/googleDrive';
import { AddExpenseForm } from './components/AddExpenseForm';
import { MonthlyAnalytics } from './components/MonthlyAnalytics';
import { SplitSettlementView } from './components/SplitSettlementView';
import { ExpensesList } from './components/ExpensesList';
import { HouseholdManager } from './components/HouseholdManager';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { PaymentMethodManagerModal } from './components/PaymentMethodManagerModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { GoogleDriveSync } from './components/GoogleDriveSync';
import { PWAInstallButton } from './components/PWAInstallButton';
import { NavDrawer } from './components/NavDrawer';
import { getSavedTheme, applyTheme, AppThemeId, THEMES } from './theme';
import { 
  Plus,
  PlusCircle, 
  Receipt, 
  PieChart, 
  Scale, 
  Users, 
  WifiOff, 
  RefreshCw, 
  Share2,
  Check,
  Cloud,
  CloudCheck,
  CloudUpload,
  X,
  Layers,
  Settings2,
  Palette,
  Moon,
  Sun,
  Menu,
  RotateCcw,
  Trash2,
  Star
} from 'lucide-react';

export default function App() {
  // Navigation active tab: 'list' | 'add' | 'monthly' | 'split' | 'household'
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'monthly' | 'split' | 'household'>('list');

  // Currently editing expense (if editing from list or monthly drilldown)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Household ID from URL query param or localStorage or default 'HOME-2026'
  const [householdId, setHouseholdId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('household');
    if (fromUrl) {
      localStorage.setItem('couplesplit_household_id', fromUrl.toUpperCase());
      return fromUrl.toUpperCase();
    }
    return localStorage.getItem('couplesplit_household_id') || 'HOME-2026';
  });

  const [household, setHousehold] = useState<Household | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [copiedLink, setCopiedLink] = useState(false);

  // --- Google Drive State ---
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [lastBackupMeta, setLastBackupMeta] = useState<DriveFileMeta | null>(null);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    return localStorage.getItem(`couplesplit_drive_last_backup_${householdId}`) || null;
  });
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('couplesplit_drive_autobackup');
    return saved !== null ? saved === 'true' : true;
  });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isPaymentMethodManagerOpen, setIsPaymentMethodManagerOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [theme, setTheme] = useState<AppThemeId>(() => getSavedTheme());
  const [driveBannerNotice, setDriveBannerNotice] = useState<string | null>(null);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const [deletedExpenseModal, setDeletedExpenseModal] = useState<Expense | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Apply theme to document on mount and whenever theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleSelectTheme = (newTheme: AppThemeId) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  // Auto-backup debounce ref
  const autoBackupTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Connectivity tracking
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Google Auth listener
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load Household, Expenses, and Settlements
  const loadData = useCallback(
    async (showLoading = false) => {
      if (showLoading) setIsLoading(true);
      else setIsSyncing(true);

      try {
        let currentHousehold: Household;
        try {
          currentHousehold = await fetchHousehold(householdId);
        } catch {
          currentHousehold = await createOrJoinHousehold({ id: householdId });
        }

        // Defensive protection against overwriting locally saved categories or payment methods on mobile
        const cachedHRaw = localStorage.getItem(`couplesplit_cache_household_${householdId}`);
        const cachedH = cachedHRaw ? JSON.parse(cachedHRaw) : null;
        if ((!currentHousehold.categories || currentHousehold.categories.length === 0) && cachedH?.categories?.length) {
          currentHousehold.categories = cachedH.categories;
          updateHousehold(householdId, { categories: cachedH.categories }).catch(() => {});
        }
        if ((!currentHousehold.paymentMethods || currentHousehold.paymentMethods.length === 0) && cachedH?.paymentMethods?.length) {
          currentHousehold.paymentMethods = cachedH.paymentMethods;
          updateHousehold(householdId, { paymentMethods: cachedH.paymentMethods }).catch(() => {});
        }

        setHousehold(currentHousehold);

        const [loadedExpenses, loadedSettlements] = await Promise.all([
          fetchExpenses(householdId),
          fetchSettlements(householdId),
        ]);

        setExpenses(loadedExpenses);
        setSettlements(loadedSettlements);

        // Save local backup for offline viewing
        localStorage.setItem(`couplesplit_cache_expenses_${householdId}`, JSON.stringify(loadedExpenses));
        localStorage.setItem(`couplesplit_cache_household_${householdId}`, JSON.stringify(currentHousehold));
      } catch (err) {
        console.warn('Network fetch issue, using cached data if available:', err);
        const cachedH = localStorage.getItem(`couplesplit_cache_household_${householdId}`);
        const cachedE = localStorage.getItem(`couplesplit_cache_expenses_${householdId}`);
        if (cachedH) setHousehold(JSON.parse(cachedH));
        if (cachedE) setExpenses(JSON.parse(cachedE));
      } finally {
        setIsLoading(false);
        setIsSyncing(false);
      }
    },
    [householdId]
  );

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Real-time polling every 10 seconds so expenses added on another phone/laptop appear automatically
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && isOnline) {
        loadData(false);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [loadData, isOnline]);

  // --- Google Drive Backup & Sync Handlers ---
  const performDriveBackup = useCallback(
    async (silent = false) => {
      if (!googleAccessToken || !household) return;
      if (!silent) setIsBackingUp(true);

      try {
        const meta = await uploadBackupToDrive(
          googleAccessToken,
          household,
          expenses,
          settlements
        );
        setLastBackupMeta(meta);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastBackupTime(timeStr);
        localStorage.setItem(`couplesplit_drive_last_backup_${householdId}`, timeStr);

        if (!silent) {
          setDriveBannerNotice('Backed up to Google Drive');
          setTimeout(() => setDriveBannerNotice(null), 3000);
        }
      } catch (err) {
        console.error('Drive backup error:', err);
        if (!silent) throw err;
      } finally {
        if (!silent) setIsBackingUp(false);
      }
    },
    [googleAccessToken, household, expenses, settlements, householdId]
  );

  // Trigger debounced auto-backup when expenses or settlements change
  const triggerAutoBackup = useCallback(() => {
    if (!googleAccessToken || !isAutoBackupEnabled || !household) return;

    if (autoBackupTimerRef.current) {
      clearTimeout(autoBackupTimerRef.current);
    }

    autoBackupTimerRef.current = setTimeout(() => {
      performDriveBackup(true);
    }, 2500);
  }, [googleAccessToken, isAutoBackupEnabled, household, performDriveBackup]);

  // Periodic Google Drive Backup every 15 minutes when connected
  useEffect(() => {
    if (!googleAccessToken || !isAutoBackupEnabled) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && isOnline) {
        performDriveBackup(true);
      }
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [googleAccessToken, isAutoBackupEnabled, isOnline, performDriveBackup]);

  // Manual Restore / Sync from Google Drive
  const handleRestoreFromDrive = async () => {
    if (!googleAccessToken) {
      throw new Error('Please connect your Google Drive account first');
    }

    setIsRestoring(true);
    try {
      const driveData = await downloadBackupFromDrive(googleAccessToken, householdId);
      if (!driveData) {
        throw new Error(`No backup file found in Google Drive for household "${householdId}"`);
      }

      // Sync and merge with server
      const syncResult = await syncDriveBackup({
        household: driveData.payload.household,
        expenses: driveData.payload.expenses,
        settlements: driveData.payload.settlements,
      });

      if (syncResult.success) {
        setHousehold(syncResult.household);
        setExpenses(syncResult.expenses);
        setSettlements(syncResult.settlements);
        setLastBackupMeta(driveData.meta);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastBackupTime(timeStr);
      }
    } finally {
      setIsRestoring(false);
    }
  };

  // Toggle auto backup setting
  const handleToggleAutoBackup = (enabled: boolean) => {
    setIsAutoBackupEnabled(enabled);
    localStorage.setItem('couplesplit_drive_autobackup', String(enabled));
  };

  // Switch household
  const handleSwitchHousehold = (code: string) => {
    const upper = code.toUpperCase();
    localStorage.setItem('couplesplit_household_id', upper);
    const url = new URL(window.location.href);
    url.searchParams.set('household', upper);
    window.history.pushState({}, '', url.toString());

    setHouseholdId(upper);
  };

  // Add / Edit expense handler
  const handleSaveExpense = async (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    // 1. Auto-save new category to household if not yet in categories list
    if (data.category && !activeCategories.some((c) => c.id.toLowerCase() === data.category.toLowerCase())) {
      const newCat: CategoryInfo = {
        id: data.category,
        label: data.category,
        icon: '🏷️',
        color: '#10b981',
        bgLight: '#ecfdf5',
      };
      const nextCategories = [...activeCategories, newCat];
      handleSaveCategories(nextCategories);
    }

    // 2. Auto-save new payment mode to household if not yet in paymentMethods list
    if (data.paymentMethod && !activePaymentMethods.some((pm) => pm.id.toLowerCase() === data.paymentMethod.toLowerCase())) {
      const newPm: PaymentMethodInfo = {
        id: data.paymentMethod,
        label: data.paymentMethod,
        icon: '💳',
        type: 'Other',
      };
      const nextMethods = [...activePaymentMethods, newPm];
      handleSavePaymentMethods(nextMethods);
    }

    if (editingExpense) {
      const updated = await updateExpense(editingExpense.id, data);
      setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setEditingExpense(null);
    } else {
      const created = await createExpense(data);
      setExpenses((prev) => [created, ...prev]);
    }
    setActiveTab('list');
    triggerAutoBackup();
  };

  // Delete expense handler (from edit form)
  const handleDeleteExpense = async (id: string) => {
    const toDelete = expenses.find((e) => e.id === id);
    if (toDelete) {
      await handleDeleteExpenseWithUndo(toDelete);
    } else {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      triggerAutoBackup();
    }
    setEditingExpense(null);
    setActiveTab('list');
  };

  // Swipe-to-delete with undo notification modal
  const handleDeleteExpenseWithUndo = async (expense: Expense) => {
    // Delete optimistically from state
    setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
    if (editingExpense?.id === expense.id) {
      setEditingExpense(null);
    }

    // Set for undo modal
    setDeletedExpenseModal(expense);

    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    undoTimeoutRef.current = setTimeout(() => {
      setDeletedExpenseModal(null);
    }, 6000);

    try {
      await deleteExpense(expense.id);
      triggerAutoBackup();
    } catch (err) {
      console.warn('Failed to delete on server:', err);
    }
  };

  // Undo delete
  const handleUndoDelete = async () => {
    if (!deletedExpenseModal) return;
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    const restoredExp = deletedExpenseModal;
    setDeletedExpenseModal(null);

    // Optimistically re-add to state
    setExpenses((prev) => [restoredExp, ...prev]);

    try {
      await createExpense(restoredExp);
      triggerAutoBackup();
    } catch (err) {
      console.warn('Failed to restore expense on server:', err);
    }
  };

  // Swipe-to-star / unstar
  const handleToggleStarExpense = async (expense: Expense) => {
    const nextStarred = !expense.isStarred;
    // Optimistic update
    setExpenses((prev) =>
      prev.map((e) => (e.id === expense.id ? { ...e, isStarred: nextStarred } : e))
    );

    try {
      await updateExpense(expense.id, { isStarred: nextStarred });
      triggerAutoBackup();
    } catch (err) {
      console.warn('Failed to toggle star on server:', err);
      // Revert on failure
      setExpenses((prev) =>
        prev.map((e) => (e.id === expense.id ? { ...e, isStarred: expense.isStarred } : e))
      );
    }
  };

  // Record settlement
  const handleRecordSettlement = async (settlementData: Omit<Settlement, 'id' | 'createdAt'>) => {
    const created = await createSettlement(settlementData);
    setSettlements((prev) => [created, ...prev]);
    triggerAutoBackup();
  };

  // Update household settings
  const handleUpdateHousehold = async (updated: Partial<Household>) => {
    if (!household) return;
    const res = await updateHousehold(household.id, updated);
    setHousehold(res);
    triggerAutoBackup();
  };

  // Active categories: uses household.categories if configured, otherwise default CATEGORIES
  const activeCategories: CategoryInfo[] =
    household?.categories && household.categories.length > 0 ? household.categories : CATEGORIES;

  // Handle Save Categories (Add, Edit, Reorder)
  const handleSaveCategories = async (
    updatedCategories: CategoryInfo[],
    renameMap?: { oldId: string; newId: string; updatePastExpenses: boolean }
  ) => {
    const targetId = household?.id || householdId || 'HOME-2026';
    const optimisticHousehold: Household = household
      ? { ...household, categories: updatedCategories }
      : {
          id: targetId,
          name: 'Our Shared Home',
          currency: currency || '₹',
          members,
          categories: updatedCategories,
          paymentMethods: activePaymentMethods,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
    setHousehold(optimisticHousehold);
    localStorage.setItem(`couplesplit_cache_household_${targetId}`, JSON.stringify(optimisticHousehold));

    try {
      const res = await updateHousehold(targetId, { categories: updatedCategories });
      setHousehold(res);
      localStorage.setItem(`couplesplit_cache_household_${targetId}`, JSON.stringify(res));
    } catch (err) {
      console.warn('Failed to sync categories to server, kept safely in phone storage:', err);
    }

    if (renameMap && renameMap.oldId !== renameMap.newId && renameMap.updatePastExpenses) {
      try {
        await batchUpdateCategory(targetId, renameMap.oldId, renameMap.newId);
        setExpenses((prev) =>
          prev.map((e) =>
            e.category === renameMap.oldId
              ? { ...e, category: renameMap.newId, updatedAt: new Date().toISOString() }
              : e
          )
        );
      } catch (err) {
        console.warn('Batch category update error:', err);
      }
    }

    triggerAutoBackup();
  };

  // Quick helper to add a custom category from anywhere (e.g. AddExpenseForm)
  const handleAddCustomCategory = async (newCat: CategoryInfo) => {
    const existing = activeCategories.find((c) => c.id.toLowerCase() === newCat.id.toLowerCase());
    if (existing) return;
    const updated = [...activeCategories, newCat];
    await handleSaveCategories(updated);
  };

  // Handle Delete Category
  const handleDeleteCategory = async (catId: string, reassignToCatId?: string) => {
    const targetId = household?.id || householdId || 'HOME-2026';
    const remaining = activeCategories.filter((c) => c.id !== catId);
    await handleSaveCategories(remaining);

    if (reassignToCatId && reassignToCatId !== catId) {
      try {
        await batchUpdateCategory(targetId, catId, reassignToCatId);
        setExpenses((prev) =>
          prev.map((e) =>
            e.category === catId
              ? { ...e, category: reassignToCatId, updatedAt: new Date().toISOString() }
              : e
          )
        );
      } catch (err) {
        console.warn('Batch reassign error:', err);
      }
    }

    triggerAutoBackup();
  };

  // Handle Reset Categories to Default
  const handleResetCategories = async () => {
    await handleSaveCategories(CATEGORIES);
  };

  // Active payment methods: uses household.paymentMethods if configured, otherwise default PAYMENT_METHODS
  const activePaymentMethods: PaymentMethodInfo[] =
    household?.paymentMethods && household.paymentMethods.length > 0 ? household.paymentMethods : PAYMENT_METHODS;

  // Handle Save Payment Methods (Add, Edit, Reorder)
  const handleSavePaymentMethods = async (
    updatedMethods: PaymentMethodInfo[],
    renameMap?: { oldId: string; newId: string; updatePastExpenses: boolean }
  ) => {
    const targetId = household?.id || householdId || 'HOME-2026';
    const optimisticHousehold: Household = household
      ? { ...household, paymentMethods: updatedMethods }
      : {
          id: targetId,
          name: 'Our Shared Home',
          currency: currency || '₹',
          members,
          categories: activeCategories,
          paymentMethods: updatedMethods,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
    setHousehold(optimisticHousehold);
    localStorage.setItem(`couplesplit_cache_household_${targetId}`, JSON.stringify(optimisticHousehold));

    try {
      const res = await updateHousehold(targetId, { paymentMethods: updatedMethods });
      setHousehold(res);
      localStorage.setItem(`couplesplit_cache_household_${targetId}`, JSON.stringify(res));
    } catch (err) {
      console.warn('Failed to sync payment methods to server, kept safely in phone storage:', err);
    }

    if (renameMap && renameMap.oldId !== renameMap.newId && renameMap.updatePastExpenses) {
      try {
        await batchUpdatePaymentMethod(targetId, renameMap.oldId, renameMap.newId);
        setExpenses((prev) =>
          prev.map((e) =>
            e.paymentMethod === renameMap.oldId
              ? { ...e, paymentMethod: renameMap.newId, updatedAt: new Date().toISOString() }
              : e
          )
        );
      } catch (err) {
        console.warn('Batch payment method update error:', err);
      }
    }

    triggerAutoBackup();
  };

  // Quick helper to add a custom payment method from anywhere (e.g. AddExpenseForm)
  const handleAddCustomPaymentMethod = async (newMethod: PaymentMethodInfo) => {
    const existing = activePaymentMethods.find((pm) => pm.id.toLowerCase() === newMethod.id.toLowerCase());
    if (existing) return;
    const updated = [...activePaymentMethods, newMethod];
    await handleSavePaymentMethods(updated);
  };

  // Handle Delete Payment Method
  const handleDeletePaymentMethod = async (methodId: string, reassignToMethodId?: string) => {
    const targetId = household?.id || householdId || 'HOME-2026';
    const remaining = activePaymentMethods.filter((pm) => pm.id !== methodId);
    await handleSavePaymentMethods(remaining);

    if (reassignToMethodId && reassignToMethodId !== methodId) {
      try {
        await batchUpdatePaymentMethod(targetId, methodId, reassignToMethodId);
        setExpenses((prev) =>
          prev.map((e) =>
            e.paymentMethod === methodId
              ? { ...e, paymentMethod: reassignToMethodId, updatedAt: new Date().toISOString() }
              : e
          )
        );
      } catch (err) {
        console.warn('Batch payment method reassign error:', err);
      }
    }

    triggerAutoBackup();
  };

  // Handle Reset Payment Methods to Default
  const handleResetPaymentMethods = async () => {
    await handleSavePaymentMethods(PAYMENT_METHODS);
  };

  const handleShareQuickLink = () => {
    const shareableUrl = `${window.location.origin}${window.location.pathname}?household=${householdId}`;
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Download CSV export handler
  const handleDownloadCSV = () => {
    if (!expenses || expenses.length === 0) {
      setDownloadToast('No expenses to download yet.');
      setTimeout(() => setDownloadToast(null), 3000);
      return;
    }
    const headers = [
      'Date',
      'Category',
      'Description / Store',
      'Amount',
      'Currency',
      'Paid By',
      'Split Type',
      'Notes',
      'Created At',
    ];
    const rows = expenses.map((e) => {
      const payerName = members.find((m) => m.id === e.paidBy)?.name || e.paidBy || 'Partner';
      const catObj = activeCategories.find((c) => c.id === e.category);
      const catLabel = catObj ? `${catObj.icon} ${catObj.label}` : e.category;
      return [
        e.date,
        `"${catLabel.replace(/"/g, '""')}"`,
        `"${(e.description || '').replace(/"/g, '""')}"`,
        e.amount,
        `"${currency}"`,
        `"${payerName.replace(/"/g, '""')}"`,
        `"${(e.splitType || 'split_equal').replace(/"/g, '""')}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
        e.createdAt,
      ];
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CoupleSplit_${householdId}_Expenses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadToast(`Downloaded ${expenses.length} expenses to CSV!`);
    setTimeout(() => setDownloadToast(null), 3500);
  };

  // Download JSON backup handler
  const handleDownloadJSON = () => {
    const backupData = {
      household,
      expenses,
      settlements,
      exportedAt: new Date().toISOString(),
      householdId,
      version: '1.2',
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CoupleSplit_Backup_${householdId}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadToast('Household backup JSON downloaded!');
    setTimeout(() => setDownloadToast(null), 3500);
  };

  const currency = household?.currency || '₹';
  const members: Member[] = household?.members || [
    { id: 'm1', name: 'Shriya', color: '#10b981', avatar: '👩' },
    { id: 'm2', name: 'Husband', color: '#3b82f6', avatar: '👨' },
  ];

  // Render Google Drive Sync component
  const googleDriveNode = (
    <GoogleDriveSync
      currentUser={googleUser}
      accessToken={googleAccessToken}
      lastBackupMeta={lastBackupMeta}
      lastBackupTime={lastBackupTime}
      isAutoBackupEnabled={isAutoBackupEnabled}
      isBackingUp={isBackingUp}
      isRestoring={isRestoring}
      onToggleAutoBackup={handleToggleAutoBackup}
      onBackupNow={() => performDriveBackup(false)}
      onRestoreFromDrive={handleRestoreFromDrive}
      onAuthSuccess={(u, t) => {
        setGoogleUser(u);
        setGoogleAccessToken(t);
      }}
      onAuthSignOut={() => {
        setGoogleUser(null);
        setGoogleAccessToken(null);
      }}
    />
  );

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col font-sans pb-20 sm:pb-8 transition-colors duration-200" style={{ backgroundColor: 'var(--app-bg)', color: 'var(--text-main)' }}>
      {/* Offline Toast */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs font-semibold py-1.5 px-3 text-center flex items-center justify-center gap-2 sticky top-0 z-50 shadow-xs">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Offline Mode — Showing saved expenses from cache. Will sync when reconnected.</span>
        </div>
      )}

      {/* Drive Sync Notice Banner */}
      {driveBannerNotice && (
        <div className="bg-emerald-600 text-white text-xs font-semibold py-1.5 px-3 text-center flex items-center justify-center gap-2 sticky top-0 z-50 shadow-xs animate-in slide-in-from-top duration-200">
          <Cloud className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{driveBannerNotice}</span>
        </div>
      )}

      {/* Main App Top Navigation Bar (Material 3 Top App Bar) */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-40 shadow-xs w-full max-w-full">
        <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Nav Bar Icon & Brand */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
            {/* Nav Bar Icon Button - opens drawer menu */}
            <button
              onClick={() => setIsNavMenuOpen(true)}
              className="w-10 h-10 rounded-full hover:bg-slate-100 active:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center transition shrink-0 cursor-pointer"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </button>

            {/* Brand Logo & Name */}
            <div
              onClick={() => {
                setEditingExpense(null);
                setActiveTab('list');
              }}
              className="flex items-center gap-2 cursor-pointer select-none group shrink-0 min-w-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white truncate">
                    Couple<span className="text-emerald-600 dark:text-emerald-400">Split</span>
                  </h1>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono hidden xs:inline bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {householdId}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links (Material 3 Segmented Pill Navigation) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-full shrink-0 border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => {
                setEditingExpense(null);
                setActiveTab('list');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === 'list' && !editingExpense
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Daily Expenses</span>
            </button>

            <button
              onClick={() => {
                setEditingExpense(null);
                setActiveTab('monthly');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === 'monthly' && !editingExpense
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Monthly Breakdown</span>
            </button>

            <button
              onClick={() => {
                setEditingExpense(null);
                setActiveTab('split');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === 'split' && !editingExpense
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Split & Settle</span>
            </button>

            <button
              onClick={() => {
                setEditingExpense(null);
                setActiveTab('household');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === 'household' && !editingExpense
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Household</span>
            </button>
          </nav>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Add Expense button */}
            <button
              onClick={() => {
                setEditingExpense(null);
                setActiveTab('add');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-full text-xs font-bold shadow-xs transition shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Add Expense</span>
            </button>

            {/* Quick Share Link button */}
            <button
              onClick={handleShareQuickLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition shrink-0 cursor-pointer"
              title="Share household link with partner"
              aria-label="Share Link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
              <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
            </button>

            <PWAInstallButton />

            {isSyncing && (
              <span title="Syncing ledger..." className="shrink-0 p-1">
                <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-5 overflow-x-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-500">
              Loading shared ledger for {householdId}...
            </p>
          </div>
        ) : (
          <>
            {/* 1. Add / Edit Expense View */}
            {(activeTab === 'add' || editingExpense) && (
              <div className="animate-in fade-in duration-200">
                <AddExpenseForm
                  householdId={householdId}
                  currency={currency}
                  members={members}
                  categories={activeCategories}
                  paymentMethods={activePaymentMethods}
                  onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
                  onOpenPaymentMethodManager={() => setIsPaymentMethodManagerOpen(true)}
                  onAddCustomCategory={handleAddCustomCategory}
                  onAddCustomPaymentMethod={handleAddCustomPaymentMethod}
                  initialData={editingExpense}
                  onSave={handleSaveExpense}
                  onDelete={editingExpense ? handleDeleteExpense : undefined}
                  onCancel={() => {
                    setEditingExpense(null);
                    setActiveTab('list');
                  }}
                />
              </div>
            )}

            {/* 2. Daily Expenses Feed */}
            {activeTab === 'list' && !editingExpense && (
              <div className="animate-in fade-in duration-200">
                <ExpensesList
                  expenses={expenses}
                  currency={currency}
                  members={members}
                  categories={activeCategories}
                  onAddClick={() => setActiveTab('add')}
                  onSelectExpense={(item) => {
                    setEditingExpense(item);
                    setActiveTab('add');
                  }}
                  onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
                  onToggleStar={handleToggleStarExpense}
                  onDeleteExpense={handleDeleteExpenseWithUndo}
                />
              </div>
            )}

            {/* 3. Monthly Categories Page */}
            {activeTab === 'monthly' && !editingExpense && (
              <div className="animate-in fade-in duration-200">
                <MonthlyAnalytics
                  expenses={expenses}
                  currency={currency}
                  members={members}
                  categories={activeCategories}
                  onSelectExpense={(item) => {
                    setEditingExpense(item);
                    setActiveTab('add');
                  }}
                  onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
                />
              </div>
            )}

            {/* 4. Split & Settle Page */}
            {activeTab === 'split' && !editingExpense && (
              <div className="animate-in fade-in duration-200">
                <SplitSettlementView
                  expenses={expenses}
                  settlements={settlements}
                  currency={currency}
                  members={members}
                  onRecordSettlement={handleRecordSettlement}
                />
              </div>
            )}

            {/* 5. Household Sharing, Google Drive & Settings */}
            {activeTab === 'household' && !editingExpense && household && (
              <div className="animate-in fade-in duration-200">
                <HouseholdManager
                  household={household}
                  currency={currency}
                  categories={activeCategories}
                  paymentMethods={activePaymentMethods}
                  googleDriveSyncNode={googleDriveNode}
                  currentTheme={theme}
                  onUpdateHousehold={handleUpdateHousehold}
                  onSwitchHousehold={handleSwitchHousehold}
                  onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
                  onOpenPaymentMethodManager={() => setIsPaymentMethodManagerOpen(true)}
                  onOpenThemeSelector={() => setIsThemeModalOpen(true)}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Google Drive Quick Modal */}
      {showDriveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <span className="font-bold text-sm flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-400" />
                Google Drive Backup &amp; Sync
              </span>
              <button
                onClick={() => setShowDriveModal(false)}
                className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {googleDriveNode}
            </div>
          </div>
        </div>
      )}

      {/* Household Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={activeCategories}
        expenses={expenses}
        onSaveCategories={handleSaveCategories}
        onDeleteCategory={handleDeleteCategory}
        onResetToDefaults={handleResetCategories}
      />

      {/* Household Payment Methods Manager Modal */}
      <PaymentMethodManagerModal
        isOpen={isPaymentMethodManagerOpen}
        onClose={() => setIsPaymentMethodManagerOpen(false)}
        paymentMethods={activePaymentMethods}
        expenses={expenses}
        onSavePaymentMethods={handleSavePaymentMethods}
        onDeletePaymentMethod={handleDeletePaymentMethod}
        onResetToDefaults={handleResetPaymentMethods}
      />

      {/* App Theme Selector Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentTheme={theme}
        onSelectTheme={handleSelectTheme}
      />

      {/* Navigation Drawer triggered by Left Nav Bar Icon */}
      <NavDrawer
        isOpen={isNavMenuOpen}
        onClose={() => setIsNavMenuOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setEditingExpense(null);
          setActiveTab(tab);
        }}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
        onOpenPaymentMethodManager={() => setIsPaymentMethodManagerOpen(true)}
        onOpenDriveModal={() => setShowDriveModal(true)}
        onDownloadCSV={handleDownloadCSV}
        onDownloadJSON={handleDownloadJSON}
        googleUser={googleUser}
        currentTheme={theme}
        householdId={householdId}
        categoryCount={activeCategories.length}
        paymentMethodCount={activePaymentMethods.length}
        expenseCount={expenses.length}
        members={members}
        onShareLink={handleShareQuickLink}
        copiedLink={copiedLink}
      />

      {/* Download Toast Notification */}
      {downloadToast && (
        <div className="fixed top-16 right-4 z-50 bg-slate-900 text-white text-xs font-semibold py-2 px-4 rounded-xl shadow-lg border border-slate-700 animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* Deleted Expense Notification Modal with Undo */}
      {deletedExpenseModal && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="deleted-modal-title"
          className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white p-4 rounded-3xl shadow-2xl border border-slate-700/80 ring-1 ring-white/10 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                  <Trash2 className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 id="deleted-modal-title" className="text-sm font-bold text-white tracking-tight">
                    Expense Deleted
                  </h4>
                  <p className="text-xs text-slate-300 truncate mt-0.5">
                    <span className="font-semibold text-white">
                      {deletedExpenseModal.description || deletedExpenseModal.category}
                    </span>
                    <span className="mx-1 text-slate-500">·</span>
                    <span className="font-bold text-emerald-400 tabular-nums">
                      {currency}
                      {deletedExpenseModal.amount.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
                  setDeletedExpenseModal(null);
                }}
                className="w-7 h-7 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center transition cursor-pointer shrink-0"
                title="Dismiss"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400">
                Tap Undo to restore expense
              </span>
              <button
                onClick={handleUndoDelete}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-full transition cursor-pointer shadow-sm hover:shadow-emerald-500/20"
                title="Undo deletion"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Undo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Navigation (Material 3 Navigation Bar & Floating Action Button) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1">
        <div className="max-w-md mx-auto grid grid-cols-5 items-end">
          {/* 1. Daily */}
          <button
            onClick={() => {
              setEditingExpense(null);
              setActiveTab('list');
            }}
            className="flex flex-col items-center justify-center py-1 group min-h-[52px]"
          >
            <div
              className={`px-3.5 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
                activeTab === 'list' && !editingExpense
                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Receipt className="w-5 h-5 stroke-[2]" />
            </div>
            <span
              className={`text-[11px] mt-0.5 tracking-tight ${
                activeTab === 'list' && !editingExpense
                  ? 'font-bold text-slate-900 dark:text-white'
                  : 'font-medium text-slate-500 dark:text-slate-400'
              }`}
            >
              Daily
            </span>
          </button>

          {/* 2. Monthly */}
          <button
            onClick={() => {
              setEditingExpense(null);
              setActiveTab('monthly');
            }}
            className="flex flex-col items-center justify-center py-1 group min-h-[52px]"
          >
            <div
              className={`px-3.5 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
                activeTab === 'monthly' && !editingExpense
                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <PieChart className="w-5 h-5 stroke-[2]" />
            </div>
            <span
              className={`text-[11px] mt-0.5 tracking-tight ${
                activeTab === 'monthly' && !editingExpense
                  ? 'font-bold text-slate-900 dark:text-white'
                  : 'font-medium text-slate-500 dark:text-slate-400'
              }`}
            >
              Monthly
            </span>
          </button>

          {/* 3. Center Slot: Material 3 Elevated FAB (Add Expense) */}
          <div className="flex flex-col items-center justify-center relative">
            <button
              onClick={() => {
                setEditingExpense(null);
                setActiveTab('add');
              }}
              className={`w-13 h-13 -translate-y-3.5 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95 ${
                activeTab === 'add' || editingExpense
                  ? 'bg-emerald-700 text-white ring-4 ring-emerald-500/30 shadow-emerald-700/40'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/35 hover:-translate-y-4'
              }`}
              title="Add Expense"
              aria-label="Add Expense"
            >
              <Plus className="w-6 h-6 stroke-[2.75]" />
            </button>
            <span
              className={`text-[11px] -mt-2.5 tracking-tight ${
                activeTab === 'add' || editingExpense
                  ? 'font-bold text-slate-900 dark:text-white'
                  : 'font-medium text-slate-500 dark:text-slate-400'
              }`}
            >
              Add
            </span>
          </div>

          {/* 4. Split */}
          <button
            onClick={() => {
              setEditingExpense(null);
              setActiveTab('split');
            }}
            className="flex flex-col items-center justify-center py-1 group min-h-[52px]"
          >
            <div
              className={`px-3.5 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
                activeTab === 'split' && !editingExpense
                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Scale className="w-5 h-5 stroke-[2]" />
            </div>
            <span
              className={`text-[11px] mt-0.5 tracking-tight ${
                activeTab === 'split' && !editingExpense
                  ? 'font-bold text-slate-900 dark:text-white'
                  : 'font-medium text-slate-500 dark:text-slate-400'
              }`}
            >
              Split
            </span>
          </button>

          {/* 5. Share */}
          <button
            onClick={() => {
              setEditingExpense(null);
              setActiveTab('household');
            }}
            className="flex flex-col items-center justify-center py-1 group min-h-[52px]"
          >
            <div
              className={`px-3.5 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
                activeTab === 'household' && !editingExpense
                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-5 h-5 stroke-[2]" />
            </div>
            <span
              className={`text-[11px] mt-0.5 tracking-tight ${
                activeTab === 'household' && !editingExpense
                  ? 'font-bold text-slate-900 dark:text-white'
                  : 'font-medium text-slate-500 dark:text-slate-400'
              }`}
            >
              Share
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
