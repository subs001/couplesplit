import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  serverTimestamp,
  writeBatch,
  deleteField,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import {
  SharedAccount,
  Expense,
  Category,
  PaymentMethod,
  UserProfile,
  Goal,
  GoalContribution,
  GoalScope,
  Budget,
  BudgetScope,
} from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { canUserContributeToGoal, canUserManageGoal } from '../lib/goalCalculations';
import { checkBudgetConflict } from '../lib/budgetCalculations';

export const DEFAULT_CATEGORIES = [
  { name: 'Food', colour: '#F97316', icon: 'Utensils' },
  { name: 'Groceries', colour: '#10B981', icon: 'ShoppingCart' },
  { name: 'Transport', colour: '#3B82F6', icon: 'Car' },
  { name: 'Shopping', colour: '#EC4899', icon: 'ShoppingBag' },
  { name: 'Entertainment', colour: '#8B5CF6', icon: 'Film' },
  { name: 'Bills', colour: '#EF4444', icon: 'Receipt' },
  { name: 'Travel', colour: '#06B6D4', icon: 'Plane' },
  { name: 'Healthcare', colour: '#14B8A6', icon: 'HeartPulse' },
  { name: 'Miscellaneous', colour: '#64748B', icon: 'Layers' },
];

export const DEFAULT_PAYMENT_METHODS = [
  { name: 'Cash', icon: 'Banknote' },
  { name: 'Credit Card', icon: 'CreditCard' },
  { name: 'Debit Card', icon: 'CreditCard' },
  { name: 'UPI', icon: 'Smartphone' },
  { name: 'Bank Transfer', icon: 'Building2' },
];

interface AccountContextType {
  account: SharedAccount | null;
  accountLoading: boolean;
  partnerProfile: UserProfile | null;
  partnerEmailPending: string | null;
  expenses: Expense[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  goals: Goal[];
  contributionsByGoal: Record<string, GoalContribution[]>;
  sharedBudgets: Budget[];
  individualBudgets: Budget[];
  budgets: Budget[];
  createNewAccount: (accountName?: string, inviteEmail?: string) => Promise<string>;
  invitePartnerByEmail: (email: string) => Promise<void>;
  joinAccountByCode: (code: string) => Promise<boolean>;
  joinAccountById: (accountId: string) => Promise<boolean>;
  // Expense CRUD
  addExpense: (expense: Omit<Expense, 'expenseId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExpense: (expenseId: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  // Category CRUD
  addCategory: (name: string, colour: string, icon: string) => Promise<{ success: boolean; message?: string }>;
  updateCategory: (categoryId: string, name: string, colour: string, icon: string) => Promise<{ success: boolean; message?: string }>;
  deleteCategory: (categoryId: string) => Promise<{ success: boolean; message?: string }>;
  // Payment Method CRUD
  addPaymentMethod: (name: string, icon: string) => Promise<{ success: boolean; message?: string }>;
  updatePaymentMethod: (paymentMethodId: string, name: string, icon: string) => Promise<{ success: boolean; message?: string }>;
  deletePaymentMethod: (paymentMethodId: string) => Promise<{ success: boolean; message?: string }>;
  // Goals & Contributions CRUD
  addGoal: (goal: {
    name: string;
    targetAmount: number;
    savingsAccount: string;
    targetDate: string;
    scope: GoalScope;
    isHiddenFromPartner: boolean;
  }) => Promise<string>;
  updateGoal: (
    goalId: string,
    updates: Partial<Pick<Goal, 'name' | 'targetAmount' | 'savingsAccount' | 'targetDate' | 'scope' | 'isHiddenFromPartner'>>
  ) => Promise<void>;
  toggleGoalPrivacy: (goalId: string, isHiddenFromPartner: boolean) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  addGoalContribution: (
    goalId: string,
    contribution: {
      amount: number;
      date: string;
      note?: string;
      contributedBy: string;
      contributedByName: string;
    }
  ) => Promise<void>;
  updateGoalContribution: (
    goalId: string,
    contributionId: string,
    updates: Partial<Pick<GoalContribution, 'amount' | 'date' | 'note' | 'contributedBy' | 'contributedByName'>>
  ) => Promise<void>;
  deleteGoalContribution: (goalId: string, contributionId: string) => Promise<void>;
  // Budgets CRUD
  addBudget: (budget: { categoryId: string; monthlyLimit: number; scope: BudgetScope }) => Promise<void>;
  updateBudget: (budget: Budget, updates: { monthlyLimit: number }) => Promise<void>;
  deleteBudget: (budget: Budget) => Promise<void>;
  // Reset / Disconnect
  leaveAccount: () => Promise<void>;
  pendingInvitations: SharedAccount[];
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
  const [account, setAccount] = useState<SharedAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState<boolean>(true);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contributionsByGoal, setContributionsByGoal] = useState<Record<string, GoalContribution[]>>({});
  const [sharedBudgets, setSharedBudgets] = useState<Budget[]>([]);
  const [individualBudgets, setIndividualBudgets] = useState<Budget[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<SharedAccount[]>([]);
  const contribUnsubsRef = useRef<Record<string, () => void>>({});

  // Recursively remove undefined keys from plain objects while preserving Firestore FieldValue sentinels
  const sanitizePlainObject = (obj: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype
      ) {
        result[key] = sanitizePlainObject(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  // Generate 6-digit random uppercase invite code
  const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // 1. Listen for user's active shared account or invitations
  useEffect(() => {
    if (!user) {
      setAccount(null);
      setPartnerProfile(null);
      setExpenses([]);
      setCategories([]);
      setPaymentMethods([]);
      setGoals([]);
      setContributionsByGoal({});
      setSharedBudgets([]);
      setIndividualBudgets([]);
      setPendingInvitations([]);
      setAccountLoading(false);
      return;
    }

    setAccountLoading(true);

    const userEmail = user.email?.toLowerCase();
    const accountsRef = collection(db, 'sharedAccounts');

    // Query accounts where user is a member
    const memberQuery = query(accountsRef, where('memberUids', 'array-contains', user.uid));

    const unsubscribeMember = onSnapshot(
      memberQuery,
      async (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data() as SharedAccount;
          const currentAcc: SharedAccount = {
            ...docData,
            accountId: snapshot.docs[0].id,
          };
          setAccount(currentAcc);

          // If current user is sole member and has inviteCode, sync to inviteCodes collection
          if (currentAcc.inviteCode && currentAcc.memberUids.length === 1 && currentAcc.memberUids.includes(user.uid)) {
            try {
              const codeRef = doc(db, 'inviteCodes', currentAcc.inviteCode);
              setDoc(codeRef, {
                code: currentAcc.inviteCode,
                accountId: currentAcc.accountId,
                accountName: currentAcc.name || 'Shared Expenses',
                creatorUid: currentAcc.createdBy || user.uid,
                creatorEmail: user.email || '',
                createdAt: serverTimestamp(),
              }, { merge: true }).catch(() => {});
            } catch {
              // silent background sync
            }
          }
        } else {
          // If not member yet, check if there is an invitation matching user's email
          if (userEmail) {
            try {
              const inviteQuery = query(accountsRef, where('memberEmails', 'array-contains', userEmail));
              const inviteSnap = await getDocs(inviteQuery);
              const invites: SharedAccount[] = [];
              inviteSnap.forEach((docSnap) => {
                const data = docSnap.data() as SharedAccount;
                if (!data.memberUids.includes(user.uid)) {
                  invites.push({ ...data, accountId: docSnap.id });
                }
              });
              setPendingInvitations(invites);
            } catch (err) {
              console.warn('Error checking pending invitations:', err);
            }
          }
          setAccount(null);
        }
        setAccountLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'sharedAccounts');
        setAccountLoading(false);
      }
    );

    return () => {
      unsubscribeMember();
    };
  }, [user]);

  // 2. Fetch Partner profile whenever account changes
  useEffect(() => {
    if (!account || !user) {
      setPartnerProfile(null);
      return;
    }

    const partnerUid = account.memberUids.find((uid) => uid !== user.uid);
    if (!partnerUid) {
      setPartnerProfile(null);
      return;
    }

    const partnerDocRef = doc(db, 'users', partnerUid);
    const unsubscribePartner = onSnapshot(
      partnerDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setPartnerProfile(docSnap.data() as UserProfile);
        } else {
          setPartnerProfile(null);
        }
      },
      (error) => {
        console.warn('Could not fetch partner profile:', error);
      }
    );

    return () => unsubscribePartner();
  }, [account, user]);

  // 3. Real-time Listeners for Expenses, Categories, Payment Methods in Active Account
  useEffect(() => {
    if (!account) {
      setExpenses([]);
      setCategories([]);
      setPaymentMethods([]);
      setGoals([]);
      setContributionsByGoal({});
      setSharedBudgets([]);
      setIndividualBudgets([]);
      return;
    }

    const accountId = account.accountId;

    // Listen to Expenses
    const expensesRef = collection(db, 'sharedAccounts', accountId, 'expenses');
    const unsubscribeExpenses = onSnapshot(
      expensesRef,
      (snapshot) => {
        const loaded: Expense[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ ...(docSnap.data() as Expense), expenseId: docSnap.id });
        });
        // Sort by expenseDate descending, then createdAt descending
        loaded.sort((a, b) => {
          if (b.expenseDate !== a.expenseDate) {
            return b.expenseDate.localeCompare(a.expenseDate);
          }
          return 0;
        });
        setExpenses(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `sharedAccounts/${accountId}/expenses`);
      }
    );

    // Listen to Categories
    const categoriesRef = collection(db, 'sharedAccounts', accountId, 'categories');
    const unsubscribeCategories = onSnapshot(
      categoriesRef,
      (snapshot) => {
        const loaded: Category[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ ...(docSnap.data() as Category), categoryId: docSnap.id });
        });
        loaded.sort((a, b) => a.name.localeCompare(b.name));
        setCategories(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `sharedAccounts/${accountId}/categories`);
      }
    );

    // Listen to Payment Methods
    const pmRef = collection(db, 'sharedAccounts', accountId, 'paymentMethods');
    const unsubscribePM = onSnapshot(
      pmRef,
      (snapshot) => {
        const loaded: PaymentMethod[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ ...(docSnap.data() as PaymentMethod), paymentMethodId: docSnap.id });
        });
        loaded.sort((a, b) => a.name.localeCompare(b.name));
        setPaymentMethods(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `sharedAccounts/${accountId}/paymentMethods`);
      }
    );

    // Listen to Goals (visible shared/personal + creator's hidden personal goals)
    const goalsRef = collection(db, 'sharedAccounts', accountId, 'goals');
    const visibleGoalsQuery = query(goalsRef, where('isHiddenFromPartner', '==', false));
    const myGoalsQuery = user ? query(goalsRef, where('createdBy', '==', user.uid)) : null;

    const visibleMap = new Map<string, Goal>();
    const myMap = new Map<string, Goal>();

    const syncMergedGoals = () => {
      const merged = new Map<string, Goal>();
      visibleMap.forEach((g, id) => merged.set(id, g));
      myMap.forEach((g, id) => merged.set(id, g));
      const list = Array.from(merged.values()).sort((a, b) =>
        a.targetDate.localeCompare(b.targetDate)
      );
      setGoals(list);
    };

    const unsubscribeVisibleGoals = onSnapshot(
      visibleGoalsQuery,
      (snapshot) => {
        visibleMap.clear();
        snapshot.forEach((docSnap) => {
          visibleMap.set(docSnap.id, { ...(docSnap.data() as Goal), goalId: docSnap.id });
        });
        syncMergedGoals();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `sharedAccounts/${accountId}/goals`);
      }
    );

    const unsubscribeMyGoals = myGoalsQuery
      ? onSnapshot(
          myGoalsQuery,
          (snapshot) => {
            myMap.clear();
            snapshot.forEach((docSnap) => {
              myMap.set(docSnap.id, { ...(docSnap.data() as Goal), goalId: docSnap.id });
            });
            syncMergedGoals();
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, `sharedAccounts/${accountId}/goals`);
          }
        )
      : () => {};

    // Listen to Shared Budgets
    const sharedBudgetsRef = collection(db, 'sharedAccounts', accountId, 'budgets');
    const unsubscribeSharedBudgets = onSnapshot(
      sharedBudgetsRef,
      (snapshot) => {
        const loaded: Budget[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({
            ...(docSnap.data() as Budget),
            budgetId: docSnap.id,
            scope: 'shared',
          });
        });
        loaded.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
        setSharedBudgets(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `sharedAccounts/${accountId}/budgets`);
      }
    );

    // Listen to Private Individual Budgets (owner-only, not synced across partner accounts)
    const individualBudgetsQuery = user
      ? query(collection(db, 'users', user.uid, 'budgets'), where('accountId', '==', accountId))
      : null;
    const unsubscribeIndividualBudgets = individualBudgetsQuery
      ? onSnapshot(
          individualBudgetsQuery,
          (snapshot) => {
            const loaded: Budget[] = [];
            snapshot.forEach((docSnap) => {
              loaded.push({
                ...(docSnap.data() as Budget),
                budgetId: docSnap.id,
                scope: 'individual',
              });
            });
            loaded.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
            setIndividualBudgets(loaded);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, `users/${user?.uid}/budgets`);
          }
        )
      : () => {};

    return () => {
      unsubscribeExpenses();
      unsubscribeCategories();
      unsubscribePM();
      unsubscribeVisibleGoals();
      unsubscribeMyGoals();
      unsubscribeSharedBudgets();
      unsubscribeIndividualBudgets();
    };
  }, [account, user]);

  // 4. Manage per-goal Contribution listeners in sync with visible goals
  useEffect(() => {
    const activeUnsubs = contribUnsubsRef.current;

    if (!account) {
      Object.values(activeUnsubs).forEach((unsub) => unsub());
      contribUnsubsRef.current = {};
      setContributionsByGoal({});
      return;
    }

    const accountId = account.accountId;
    const currentGoalIds = new Set(goals.map((g) => g.goalId));

    // Unsubscribe from goals that were deleted or hidden
    for (const goalId of Object.keys(activeUnsubs)) {
      if (!currentGoalIds.has(goalId)) {
        activeUnsubs[goalId]();
        delete activeUnsubs[goalId];
        setContributionsByGoal((prev) => {
          const next = { ...prev };
          delete next[goalId];
          return next;
        });
      }
    }

    // Subscribe to newly visible goals
    for (const goal of goals) {
      if (!activeUnsubs[goal.goalId]) {
        const contribRef = collection(db, 'sharedAccounts', accountId, 'goals', goal.goalId, 'contributions');
        activeUnsubs[goal.goalId] = onSnapshot(
          contribRef,
          (snapshot) => {
            const loaded: GoalContribution[] = [];
            snapshot.forEach((docSnap) => {
              loaded.push({ ...(docSnap.data() as GoalContribution), contributionId: docSnap.id });
            });
            loaded.sort((a, b) => b.date.localeCompare(a.date));
            setContributionsByGoal((prev) => ({
              ...prev,
              [goal.goalId]: loaded,
            }));
          },
          (error) => {
            handleFirestoreError(
              error,
              OperationType.LIST,
              `sharedAccounts/${accountId}/goals/${goal.goalId}/contributions`
            );
          }
        );
      }
    }
  }, [account, goals]);

  // Cleanup all contribution listeners on unmount
  useEffect(() => {
    return () => {
      Object.values(contribUnsubsRef.current).forEach((unsub) => unsub());
      contribUnsubsRef.current = {};
    };
  }, []);

  // Seed default categories and payment methods
  const seedDefaults = async (accountId: string) => {
    try {
      const batch = writeBatch(db);

      // Default categories
      DEFAULT_CATEGORIES.forEach((cat) => {
        const catRef = doc(collection(db, 'sharedAccounts', accountId, 'categories'));
        batch.set(catRef, {
          categoryId: catRef.id,
          name: cat.name,
          colour: cat.colour,
          icon: cat.icon,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      // Default payment methods
      DEFAULT_PAYMENT_METHODS.forEach((pm) => {
        const pmRef = doc(collection(db, 'sharedAccounts', accountId, 'paymentMethods'));
        batch.set(pmRef, {
          paymentMethodId: pmRef.id,
          name: pm.name,
          icon: pm.icon,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (err) {
      console.error('Error seeding default categories/methods:', err);
    }
  };

  // Create a new Shared Account
  const createNewAccount = async (accountName = 'Our Expenses', inviteEmail?: string): Promise<string> => {
    if (!user) throw new Error('You must be signed in to create an account');

    const userEmail = user.email?.toLowerCase() || '';
    const rawUserEmail = user.email || '';
    const cleanEmail = inviteEmail?.trim().toLowerCase();
    const rawInviteEmail = inviteEmail?.trim() || '';

    const memberEmailsSet = new Set<string>();
    if (userEmail) memberEmailsSet.add(userEmail);
    if (rawUserEmail) memberEmailsSet.add(rawUserEmail);
    if (cleanEmail) memberEmailsSet.add(cleanEmail);
    if (rawInviteEmail) memberEmailsSet.add(rawInviteEmail);
    const memberEmails = Array.from(memberEmailsSet);

    const accountRef = doc(collection(db, 'sharedAccounts'));
    const inviteCode = generateInviteCode();

    const accountData: SharedAccount = {
      accountId: accountRef.id,
      name: accountName,
      createdBy: user.uid,
      memberUids: [user.uid],
      memberEmails,
      inviteCode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(accountRef, accountData);

      // Register invite code for fast and secure O(1) lookup by the second user
      try {
        await setDoc(doc(db, 'inviteCodes', inviteCode), {
          code: inviteCode,
          accountId: accountRef.id,
          accountName,
          creatorUid: user.uid,
          creatorEmail: user.email || '',
          createdAt: serverTimestamp(),
        });
      } catch (codeErr) {
        console.warn('Could not register invite code document:', codeErr);
      }

      await seedDefaults(accountRef.id);
      setAccount({ ...accountData, accountId: accountRef.id });
      return accountRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `sharedAccounts/${accountRef.id}`);
    }
  };

  // Invite partner by Google Email
  const invitePartnerByEmail = async (email: string) => {
    if (!account || !user) return;
    const cleanEmail = email.trim().toLowerCase();
    const rawEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address');
    }

    if (account.memberEmails.includes(cleanEmail) || account.memberEmails.includes(rawEmail)) {
      throw new Error('This email is already invited to this shared account');
    }

    if (account.memberUids.length >= 2) {
      throw new Error('This shared account already has 2 members');
    }

    const emailSet = new Set(account.memberEmails);
    emailSet.add(cleanEmail);
    emailSet.add(rawEmail);
    const updatedEmails = Array.from(emailSet);

    try {
      const accRef = doc(db, 'sharedAccounts', account.accountId);
      await updateDoc(accRef, {
        memberEmails: updatedEmails,
        updatedAt: serverTimestamp(),
      });
      setAccount({
        ...account,
        memberEmails: updatedEmails,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sharedAccounts/${account.accountId}`);
    }
  };

  // Join by Invite Code
  const joinAccountByCode = async (code: string): Promise<boolean> => {
    if (!user) return false;
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return false;

    try {
      // 1. Direct O(1) document lookup in inviteCodes (allowed for all signed-in users)
      const codeRef = doc(db, 'inviteCodes', cleanCode);
      const codeSnap = await getDoc(codeRef);

      let targetAccountId = '';
      if (codeSnap.exists()) {
        targetAccountId = codeSnap.data()?.accountId;
      } else {
        // Fallback: If invite code doc wasn't created yet (e.g. legacy account), try querying sharedAccounts
        try {
          const q = query(collection(db, 'sharedAccounts'), where('inviteCode', '==', cleanCode));
          const snap = await getDocs(q);
          if (!snap.empty) {
            targetAccountId = snap.docs[0].id;
          }
        } catch {
          // If query fails due to collection-level listing rules, handled below
        }
      }

      if (!targetAccountId) {
        throw new Error('No shared account found with this invite code. Please check the 6-character code and try again.');
      }

      return await joinAccountById(targetAccountId);
    } catch (error: any) {
      if (
        error.message?.includes('No shared account') ||
        error.message?.includes('maximum of 2 members') ||
        error.message?.includes('already has')
      ) {
        throw error;
      }
      handleFirestoreError(error, OperationType.GET, `inviteCodes/${cleanCode}`);
      return false;
    }
  };

  // Join by Account ID (e.g. from invitation card or resolved invite code)
  const joinAccountById = async (accountId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const accRef = doc(db, 'sharedAccounts', accountId);
      const snap = await getDoc(accRef);
      if (!snap.exists()) {
        throw new Error('Shared account not found');
      }

      const accData = snap.data() as SharedAccount;
      if (accData.memberUids.includes(user.uid)) {
        setAccount({ ...accData, accountId });
        return true;
      }

      if (accData.memberUids.length >= 2) {
        throw new Error('This shared account already has the maximum of 2 members.');
      }

      const userEmailLower = user.email?.toLowerCase() || '';
      const userEmailRaw = user.email || '';
      const newMemberUids = [accData.memberUids[0], user.uid];

      const emailSet = new Set(accData.memberEmails || []);
      if (userEmailLower) emailSet.add(userEmailLower);
      if (userEmailRaw) emailSet.add(userEmailRaw);
      const newMemberEmails = Array.from(emailSet);

      await updateDoc(accRef, {
        memberUids: newMemberUids,
        memberEmails: newMemberEmails,
        updatedAt: serverTimestamp(),
      });

      // Update state locally
      setAccount({
        ...accData,
        accountId,
        memberUids: newMemberUids,
        memberEmails: newMemberEmails,
      });

      setPendingInvitations((prev) => prev.filter((inv) => inv.accountId !== accountId));

      return true;
    } catch (error: any) {
      if (
        error.message?.includes('Shared account not found') ||
        error.message?.includes('maximum of 2 members') ||
        error.message?.includes('already has')
      ) {
        throw error;
      }
      handleFirestoreError(error, OperationType.UPDATE, `sharedAccounts/${accountId}`);
      return false;
    }
  };

  // Leave / Disconnect account
  const leaveAccount = async () => {
    if (!account || !user) return;
    try {
      const accRef = doc(db, 'sharedAccounts', account.accountId);
      const remainingUids = account.memberUids.filter((uid) => uid !== user.uid);
      const remainingEmails = account.memberEmails.filter(
        (em) => em !== user.email?.toLowerCase() && em !== user.email
      );

      if (remainingUids.length === 0) {
        // If creator is leaving and no other member, delete account and invite code
        if (account.inviteCode) {
          try {
            await deleteDoc(doc(db, 'inviteCodes', account.inviteCode));
          } catch {
            // ignore
          }
        }
        await deleteDoc(accRef);
      } else {
        await updateDoc(accRef, {
          memberUids: remainingUids,
          memberEmails: remainingEmails,
          updatedAt: serverTimestamp(),
        });
      }
      setAccount(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sharedAccounts/${account.accountId}`);
    }
  };

  // Add Expense
  const addExpense = async (
    expenseData: Omit<Expense, 'expenseId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!account) throw new Error('No active shared account');
    const path = `sharedAccounts/${account.accountId}/expenses`;
    try {
      const newDocRef = doc(collection(db, 'sharedAccounts', account.accountId, 'expenses'));
      const sanitizedData = sanitizePlainObject(expenseData as Record<string, any>);
      await setDoc(newDocRef, {
        ...sanitizedData,
        expenseId: newDocRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  // Update Expense
  const updateExpense = async (expenseId: string, expenseData: Partial<Expense>) => {
    if (!account) throw new Error('No active shared account');
    const path = `sharedAccounts/${account.accountId}/expenses/${expenseId}`;
    try {
      const docRef = doc(db, 'sharedAccounts', account.accountId, 'expenses', expenseId);
      const sanitizedPayload: Record<string, any> = {};
      for (const [key, value] of Object.entries(expenseData)) {
        if (value === undefined) {
          sanitizedPayload[key] = deleteField();
        } else if (
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          Object.getPrototypeOf(value) === Object.prototype
        ) {
          sanitizedPayload[key] = sanitizePlainObject(value as Record<string, any>);
        } else {
          sanitizedPayload[key] = value;
        }
      }
      await updateDoc(docRef, {
        ...sanitizedPayload,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // Delete Expense
  const deleteExpense = async (expenseId: string) => {
    if (!account) throw new Error('No active shared account');
    const path = `sharedAccounts/${account.accountId}/expenses/${expenseId}`;
    try {
      const docRef = doc(db, 'sharedAccounts', account.accountId, 'expenses', expenseId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Category CRUD with duplicate prevention
  const addCategory = async (name: string, colour: string, icon: string) => {
    if (!account) return { success: false, message: 'No active account' };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, message: 'Category name is required' };
    if (trimmed.length > 50) return { success: false, message: 'Category name must be 50 characters or less.' };

    const exists = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      return { success: false, message: `Category "${trimmed}" already exists.` };
    }

    const path = `sharedAccounts/${account.accountId}/categories`;
    try {
      const catRef = doc(collection(db, 'sharedAccounts', account.accountId, 'categories'));
      await setDoc(catRef, {
        categoryId: catRef.id,
        name: trimmed,
        colour: colour || '#6366F1',
        icon: icon || 'Tag',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return { success: false, message: 'Failed to create category' };
    }
  };

  const updateCategory = async (
    categoryId: string,
    name: string,
    colour: string,
    icon: string
  ) => {
    if (!account) return { success: false, message: 'No active account' };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, message: 'Category name is required' };
    if (trimmed.length > 50) return { success: false, message: 'Category name must be 50 characters or less.' };

    const exists = categories.some(
      (c) => c.categoryId !== categoryId && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      return { success: false, message: `Another category named "${trimmed}" already exists.` };
    }

    const path = `sharedAccounts/${account.accountId}/categories/${categoryId}`;
    try {
      const catRef = doc(db, 'sharedAccounts', account.accountId, 'categories', categoryId);
      await updateDoc(catRef, {
        name: trimmed,
        colour: colour || '#6366F1',
        icon: icon || 'Tag',
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      return { success: false, message: 'Failed to update category' };
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!account) return { success: false, message: 'No active account' };
    const path = `sharedAccounts/${account.accountId}/categories/${categoryId}`;
    try {
      const catRef = doc(db, 'sharedAccounts', account.accountId, 'categories', categoryId);
      await deleteDoc(catRef);
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      return { success: false, message: 'Failed to delete category' };
    }
  };

  // Payment Method CRUD with duplicate prevention
  const addPaymentMethod = async (name: string, icon: string) => {
    if (!account) return { success: false, message: 'No active account' };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, message: 'Payment method name is required' };
    if (trimmed.length > 50) return { success: false, message: 'Payment method name must be 50 characters or less.' };

    const exists = paymentMethods.some(
      (pm) => pm.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      return { success: false, message: `Payment method "${trimmed}" already exists.` };
    }

    const path = `sharedAccounts/${account.accountId}/paymentMethods`;
    try {
      const pmRef = doc(collection(db, 'sharedAccounts', account.accountId, 'paymentMethods'));
      await setDoc(pmRef, {
        paymentMethodId: pmRef.id,
        name: trimmed,
        icon: icon || 'CreditCard',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return { success: false, message: 'Failed to create payment method' };
    }
  };

  const updatePaymentMethod = async (paymentMethodId: string, name: string, icon: string) => {
    if (!account) return { success: false, message: 'No active account' };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, message: 'Payment method name is required' };
    if (trimmed.length > 50) return { success: false, message: 'Payment method name must be 50 characters or less.' };

    const exists = paymentMethods.some(
      (pm) => pm.paymentMethodId !== paymentMethodId && pm.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      return { success: false, message: `Payment method "${trimmed}" already exists.` };
    }

    const path = `sharedAccounts/${account.accountId}/paymentMethods/${paymentMethodId}`;
    try {
      const pmRef = doc(db, 'sharedAccounts', account.accountId, 'paymentMethods', paymentMethodId);
      await updateDoc(pmRef, {
        name: trimmed,
        icon: icon || 'CreditCard',
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      return { success: false, message: 'Failed to update payment method' };
    }
  };

  const deletePaymentMethod = async (paymentMethodId: string) => {
    if (!account) return { success: false, message: 'No active account' };
    const path = `sharedAccounts/${account.accountId}/paymentMethods/${paymentMethodId}`;
    try {
      const pmRef = doc(db, 'sharedAccounts', account.accountId, 'paymentMethods', paymentMethodId);
      await deleteDoc(pmRef);
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      return { success: false, message: 'Failed to delete payment method' };
    }
  };

  // Goals & Contributions CRUD
  const addGoal = async (goalInput: {
    name: string;
    targetAmount: number;
    savingsAccount: string;
    targetDate: string;
    scope: GoalScope;
    isHiddenFromPartner: boolean;
  }): Promise<string> => {
    if (!account || !user) throw new Error('No active shared account');
    const trimmedName = goalInput.name.trim();
    const trimmedAccount = goalInput.savingsAccount.trim();
    const targetAmount = Number(goalInput.targetAmount);

    if (!trimmedName || trimmedName.length > 100) {
      throw new Error('Goal name must be between 1 and 100 characters.');
    }
    if (!trimmedAccount || trimmedAccount.length > 80) {
      throw new Error('Savings account name must be between 1 and 80 characters.');
    }
    if (isNaN(targetAmount) || targetAmount <= 0) {
      throw new Error('Goal amount must be greater than 0.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(goalInput.targetDate)) {
      throw new Error('Please choose a valid target date.');
    }

    const creatorName = (userProfile?.displayName || user.displayName || 'You').trim().slice(0, 80);
    const isHidden = goalInput.scope === 'personal' ? Boolean(goalInput.isHiddenFromPartner) : false;

    const path = `sharedAccounts/${account.accountId}/goals`;
    try {
      const goalRef = doc(collection(db, 'sharedAccounts', account.accountId, 'goals'));
      await setDoc(goalRef, {
        goalId: goalRef.id,
        accountId: account.accountId,
        name: trimmedName,
        targetAmount,
        savingsAccount: trimmedAccount,
        targetDate: goalInput.targetDate,
        scope: goalInput.scope,
        isHiddenFromPartner: isHidden,
        createdBy: user.uid,
        createdByName: creatorName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return goalRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateGoal = async (
    goalId: string,
    updates: Partial<Pick<Goal, 'name' | 'targetAmount' | 'savingsAccount' | 'targetDate' | 'scope' | 'isHiddenFromPartner'>>
  ) => {
    if (!account || !user) throw new Error('No active shared account');
    const existingGoal = goals.find((g) => g.goalId === goalId);
    if (!existingGoal) throw new Error('Goal not found');
    if (!canUserManageGoal(existingGoal, user.uid)) {
      throw new Error('Only the creator of a personal goal can edit it.');
    }

    const payload: Record<string, any> = {};
    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed || trimmed.length > 100) {
        throw new Error('Goal name must be between 1 and 100 characters.');
      }
      payload.name = trimmed;
    }
    if (updates.savingsAccount !== undefined) {
      const trimmed = updates.savingsAccount.trim();
      if (!trimmed || trimmed.length > 80) {
        throw new Error('Savings account name must be between 1 and 80 characters.');
      }
      payload.savingsAccount = trimmed;
    }
    if (updates.targetAmount !== undefined) {
      const amt = Number(updates.targetAmount);
      if (isNaN(amt) || amt <= 0) {
        throw new Error('Goal amount must be greater than 0.');
      }
      payload.targetAmount = amt;
    }
    if (updates.targetDate !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(updates.targetDate)) {
        throw new Error('Please choose a valid target date.');
      }
      payload.targetDate = updates.targetDate;
    }

    // Only creator can modify scope or privacy visibility
    if (existingGoal.createdBy === user.uid) {
      const nextScope = updates.scope ?? existingGoal.scope;
      if (updates.scope !== undefined) {
        payload.scope = nextScope;
      }
      if (nextScope === 'shared') {
        payload.isHiddenFromPartner = false;
      } else if (updates.isHiddenFromPartner !== undefined) {
        payload.isHiddenFromPartner = Boolean(updates.isHiddenFromPartner);
      }
    }

    const path = `sharedAccounts/${account.accountId}/goals/${goalId}`;
    try {
      const goalRef = doc(db, 'sharedAccounts', account.accountId, 'goals', goalId);
      await updateDoc(goalRef, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const toggleGoalPrivacy = async (goalId: string, isHiddenFromPartner: boolean) => {
    if (!account || !user) throw new Error('No active shared account');
    const existingGoal = goals.find((g) => g.goalId === goalId);
    if (!existingGoal) throw new Error('Goal not found');
    if (existingGoal.scope !== 'personal' || existingGoal.createdBy !== user.uid) {
      throw new Error('Only your own personal savings goals can be hidden from your partner.');
    }
    await updateGoal(goalId, { isHiddenFromPartner });
  };

  const deleteGoal = async (goalId: string) => {
    if (!account || !user) throw new Error('No active shared account');
    const existingGoal = goals.find((g) => g.goalId === goalId);
    if (!existingGoal) throw new Error('Goal not found');
    if (!canUserManageGoal(existingGoal, user.uid)) {
      throw new Error('Only the creator of a personal goal can delete it.');
    }

    const path = `sharedAccounts/${account.accountId}/goals/${goalId}`;
    try {
      const contribsRef = collection(db, 'sharedAccounts', account.accountId, 'goals', goalId, 'contributions');
      const snap = await getDocs(contribsRef);
      const batch = writeBatch(db);
      snap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      batch.delete(doc(db, 'sharedAccounts', account.accountId, 'goals', goalId));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const addGoalContribution = async (
    goalId: string,
    contribution: {
      amount: number;
      date: string;
      note?: string;
      contributedBy: string;
      contributedByName: string;
    }
  ) => {
    if (!account || !user) throw new Error('No active shared account');
    const existingGoal = goals.find((g) => g.goalId === goalId);
    if (!existingGoal) throw new Error('Goal not found');
    if (!canUserContributeToGoal(existingGoal, user.uid)) {
      throw new Error('Only the creator can contribute to a personal savings goal.');
    }

    const amount = Number(contribution.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Contribution amount must be greater than 0.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(contribution.date)) {
      throw new Error('Please choose a valid contribution date.');
    }

    const trimmedNote = contribution.note?.trim();
    if (trimmedNote && trimmedNote.length > 150) {
      throw new Error('Contribution note must be 150 characters or less.');
    }

    const contributorUid =
      existingGoal.scope === 'personal' ? existingGoal.createdBy : contribution.contributedBy;
    const contributorName = (
      existingGoal.scope === 'personal'
        ? existingGoal.createdByName
        : contribution.contributedByName
    )
      .trim()
      .slice(0, 80);

    const path = `sharedAccounts/${account.accountId}/goals/${goalId}/contributions`;
    try {
      const contribRef = doc(collection(db, 'sharedAccounts', account.accountId, 'goals', goalId, 'contributions'));
      const dataToWrite = sanitizePlainObject({
        contributionId: contribRef.id,
        goalId,
        amount,
        date: contribution.date,
        ...(trimmedNote ? { note: trimmedNote } : {}),
        contributedBy: contributorUid,
        contributedByName: contributorName || 'You',
      });
      await setDoc(contribRef, {
        ...dataToWrite,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateGoalContribution = async (
    goalId: string,
    contributionId: string,
    updates: Partial<Pick<GoalContribution, 'amount' | 'date' | 'note' | 'contributedBy' | 'contributedByName'>>
  ) => {
    if (!account || !user) throw new Error('No active shared account');
    const existingGoal = goals.find((g) => g.goalId === goalId);
    if (!existingGoal) throw new Error('Goal not found');
    if (!canUserContributeToGoal(existingGoal, user.uid)) {
      throw new Error('Only the creator can modify contributions on a personal savings goal.');
    }

    const payload: Record<string, any> = {};
    if (updates.amount !== undefined) {
      const amt = Number(updates.amount);
      if (isNaN(amt) || amt <= 0) {
        throw new Error('Contribution amount must be greater than 0.');
      }
      payload.amount = amt;
    }
    if (updates.date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(updates.date)) {
        throw new Error('Please choose a valid contribution date.');
      }
      payload.date = updates.date;
    }
    if ('note' in updates) {
      const trimmedNote = updates.note?.trim();
      if (!trimmedNote) {
        payload.note = deleteField();
      } else {
        if (trimmedNote.length > 150) {
          throw new Error('Contribution note must be 150 characters or less.');
        }
        payload.note = trimmedNote;
      }
    }
    if (existingGoal.scope === 'shared') {
      if (updates.contributedBy !== undefined) payload.contributedBy = updates.contributedBy;
      if (updates.contributedByName !== undefined) {
        payload.contributedByName = updates.contributedByName.trim().slice(0, 80) || 'You';
      }
    }

    const path = `sharedAccounts/${account.accountId}/goals/${goalId}/contributions/${contributionId}`;
    try {
      const contribRef = doc(
        db,
        'sharedAccounts',
        account.accountId,
        'goals',
        goalId,
        'contributions',
        contributionId
      );
      await updateDoc(contribRef, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteGoalContribution = async (goalId: string, contributionId: string) => {
    if (!account || !user) throw new Error('No active shared account');
    const existingGoal = goals.find((g) => g.goalId === goalId);
    if (!existingGoal) throw new Error('Goal not found');
    if (!canUserContributeToGoal(existingGoal, user.uid)) {
      throw new Error('Only the creator can delete contributions on a personal savings goal.');
    }

    const path = `sharedAccounts/${account.accountId}/goals/${goalId}/contributions/${contributionId}`;
    try {
      const contribRef = doc(
        db,
        'sharedAccounts',
        account.accountId,
        'goals',
        goalId,
        'contributions',
        contributionId
      );
      await deleteDoc(contribRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Budgets CRUD
  const addBudget = async (budgetInput: {
    categoryId: string;
    monthlyLimit: number;
    scope: BudgetScope;
  }) => {
    if (!account || !user) throw new Error('No active shared account');
    const category = categories.find((c) => c.categoryId === budgetInput.categoryId);
    if (!category) {
      throw new Error('Please choose a valid category.');
    }

    const monthlyLimit = Number(budgetInput.monthlyLimit);
    if (isNaN(monthlyLimit) || monthlyLimit <= 0) {
      throw new Error('Monthly budget limit must be greater than 0.');
    }

    const conflict = checkBudgetConflict(
      category.categoryId,
      budgetInput.scope,
      sharedBudgets,
      individualBudgets
    );
    if (!conflict.allowed) {
      throw new Error(conflict.reason || 'A budget conflict exists for this category.');
    }

    const safeCatName = category.name.trim().slice(0, 50);

    if (budgetInput.scope === 'shared') {
      const path = `sharedAccounts/${account.accountId}/budgets/${category.categoryId}`;
      const creatorName = (userProfile?.displayName || user.displayName || 'You').trim().slice(0, 80);
      try {
        const budgetRef = doc(db, 'sharedAccounts', account.accountId, 'budgets', category.categoryId);
        await setDoc(budgetRef, {
          budgetId: category.categoryId,
          accountId: account.accountId,
          categoryId: category.categoryId,
          categoryName: safeCatName,
          monthlyLimit,
          scope: 'shared',
          createdBy: user.uid,
          createdByName: creatorName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error: any) {
        if (error?.code === 'permission-denied') {
          throw new Error(
            'Unable to create a shared budget because an individual budget already exists for this category.'
          );
        }
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    } else {
      const compositeId = `${account.accountId}_${category.categoryId}`;
      const path = `users/${user.uid}/budgets/${compositeId}`;
      try {
        const budgetRef = doc(db, 'users', user.uid, 'budgets', compositeId);
        await setDoc(budgetRef, {
          budgetId: compositeId,
          accountId: account.accountId,
          categoryId: category.categoryId,
          categoryName: safeCatName,
          monthlyLimit,
          scope: 'individual',
          ownerUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error: any) {
        if (error?.code === 'permission-denied') {
          throw new Error(
            'Unable to create an individual budget because a shared budget already exists for this category.'
          );
        }
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }
  };

  const updateBudget = async (budget: Budget, updates: { monthlyLimit: number }) => {
    if (!account || !user) throw new Error('No active shared account');
    const monthlyLimit = Number(updates.monthlyLimit);
    if (isNaN(monthlyLimit) || monthlyLimit <= 0) {
      throw new Error('Monthly budget limit must be greater than 0.');
    }

    const latestCat = categories.find((c) => c.categoryId === budget.categoryId);
    const safeCatName = (latestCat?.name || budget.categoryName).trim().slice(0, 50);

    if (budget.scope === 'shared') {
      const path = `sharedAccounts/${account.accountId}/budgets/${budget.categoryId}`;
      try {
        const budgetRef = doc(db, 'sharedAccounts', account.accountId, 'budgets', budget.categoryId);
        await updateDoc(budgetRef, {
          monthlyLimit,
          categoryName: safeCatName,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    } else {
      const path = `users/${user.uid}/budgets/${budget.budgetId}`;
      try {
        const budgetRef = doc(db, 'users', user.uid, 'budgets', budget.budgetId);
        await updateDoc(budgetRef, {
          monthlyLimit,
          categoryName: safeCatName,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  };

  const deleteBudget = async (budget: Budget) => {
    if (!account || !user) throw new Error('No active shared account');
    if (budget.scope === 'shared') {
      const path = `sharedAccounts/${account.accountId}/budgets/${budget.categoryId}`;
      try {
        await deleteDoc(doc(db, 'sharedAccounts', account.accountId, 'budgets', budget.categoryId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      const path = `users/${user.uid}/budgets/${budget.budgetId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'budgets', budget.budgetId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  };

  const budgets = [...sharedBudgets, ...individualBudgets].sort((a, b) =>
    a.categoryName.localeCompare(b.categoryName)
  );

  // Derive pending partner email if 1 member and second email exists
  const partnerEmailPending =
    account && account.memberUids.length === 1 && user
      ? account.memberEmails.find((em) => em !== user.email?.toLowerCase()) || null
      : null;

  return (
    <AccountContext.Provider
      value={{
        account,
        accountLoading,
        partnerProfile,
        partnerEmailPending,
        expenses,
        categories,
        paymentMethods,
        goals,
        contributionsByGoal,
        sharedBudgets,
        individualBudgets,
        budgets,
        createNewAccount,
        invitePartnerByEmail,
        joinAccountByCode,
        joinAccountById,
        addExpense,
        updateExpense,
        deleteExpense,
        addCategory,
        updateCategory,
        deleteCategory,
        addPaymentMethod,
        updatePaymentMethod,
        deletePaymentMethod,
        addGoal,
        updateGoal,
        toggleGoalPrivacy,
        deleteGoal,
        addGoalContribution,
        updateGoalContribution,
        deleteGoalContribution,
        addBudget,
        updateBudget,
        deleteBudget,
        leaveAccount,
        pendingInvitations,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}
