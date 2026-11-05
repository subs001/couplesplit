import React, { createContext, useContext, useEffect, useState } from 'react';
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
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import {
  SharedAccount,
  Expense,
  Category,
  PaymentMethod,
  UserProfile,
} from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

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
  const [pendingInvitations, setPendingInvitations] = useState<SharedAccount[]>([]);

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

    return () => {
      unsubscribeExpenses();
      unsubscribeCategories();
      unsubscribePM();
    };
  }, [account]);

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

    const cleanEmail = inviteEmail?.trim().toLowerCase();
    const userEmail = user.email?.toLowerCase() || '';
    const memberEmails = [userEmail];
    if (cleanEmail && cleanEmail !== userEmail) {
      memberEmails.push(cleanEmail);
    }

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
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address');
    }

    if (account.memberEmails.includes(cleanEmail)) {
      throw new Error('This email is already part of the shared account');
    }

    if (account.memberUids.length >= 2) {
      throw new Error('This shared account already has 2 members');
    }

    const updatedEmails = [...account.memberEmails, cleanEmail];
    try {
      const accRef = doc(db, 'sharedAccounts', account.accountId);
      await updateDoc(accRef, {
        memberEmails: updatedEmails,
        updatedAt: serverTimestamp(),
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
      const q = query(collection(db, 'sharedAccounts'), where('inviteCode', '==', cleanCode));
      const snap = await getDocs(q);

      if (snap.empty) {
        throw new Error('No shared account found with this invite code');
      }

      const accDoc = snap.docs[0];
      const accData = accDoc.data() as SharedAccount;

      if (accData.memberUids.includes(user.uid)) {
        // Already a member
        setAccount({ ...accData, accountId: accDoc.id });
        return true;
      }

      if (accData.memberUids.length >= 2) {
        throw new Error('This shared account already has the maximum of 2 members.');
      }

      const userEmail = user.email?.toLowerCase() || '';
      const newMemberUids = [...accData.memberUids, user.uid];
      const newMemberEmails = accData.memberEmails.includes(userEmail)
        ? accData.memberEmails
        : [...accData.memberEmails, userEmail];

      await updateDoc(doc(db, 'sharedAccounts', accDoc.id), {
        memberUids: newMemberUids,
        memberEmails: newMemberEmails,
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error: any) {
      if (error.message?.includes('No shared account') || error.message?.includes('maximum of 2 members')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.UPDATE, 'sharedAccounts');
      return false;
    }
  };

  // Join by Account ID (e.g. from invitation card)
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
        throw new Error('This account already has 2 members');
      }

      const userEmail = user.email?.toLowerCase() || '';
      const newMemberUids = [...accData.memberUids, user.uid];
      const newMemberEmails = accData.memberEmails.includes(userEmail)
        ? accData.memberEmails
        : [...accData.memberEmails, userEmail];

      await updateDoc(accRef, {
        memberUids: newMemberUids,
        memberEmails: newMemberEmails,
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error: any) {
      if (error.message?.includes('Shared account not found') || error.message?.includes('already has 2 members')) {
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
        (em) => em !== user.email?.toLowerCase()
      );

      if (remainingUids.length === 0) {
        // If creator is leaving and no other member, delete account
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
      await setDoc(newDocRef, {
        ...expenseData,
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
      await updateDoc(docRef, {
        ...expenseData,
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
        colour,
        icon,
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
        colour,
        icon,
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
        icon,
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
        icon,
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
