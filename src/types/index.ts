export type SplitType = 'equal' | 'personal' | 'custom';

export interface SplitDetails {
  user1Uid: string;
  user1Amount: number;
  user1Percentage: number;
  user2Uid: string;
  user2Amount: number;
  user2Percentage: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt?: string;
}

export interface SharedAccount {
  accountId: string;
  name: string;
  createdBy: string;
  memberUids: string[];
  memberEmails: string[];
  inviteCode: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Category {
  categoryId: string;
  name: string;
  colour: string;
  icon: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface PaymentMethod {
  paymentMethodId: string;
  name: string;
  icon: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Expense {
  expenseId: string;
  title: string;
  amount: number;
  location?: string;
  categoryId: string;
  categoryName: string;
  paymentMethodId: string;
  paymentMethodName: string;
  paidBy: string; // Firebase UID
  paidByName: string;
  splitType: SplitType;
  splitDetails?: SplitDetails;
  expenseDate: string; // YYYY-MM-DD
  createdAt?: any;
  updatedAt?: any;
}

export interface Settlement {
  settlementId: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  amount: number;
  date: string;
  note?: string;
  createdAt?: any;
}

export type ThemeMode = 'light' | 'dark' | 'sakura';

export type TimeFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

export interface FilterOptions {
  searchQuery: string;
  timeFilter: TimeFilter;
  startDate?: string;
  endDate?: string;
  paidBy: string; // 'all' | 'me' | 'partner'
  categoryId: string; // 'all' | categoryId
  paymentMethodId: string; // 'all' | paymentMethodId
  splitType: string; // 'all' | SplitType
  sortBy: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
}
