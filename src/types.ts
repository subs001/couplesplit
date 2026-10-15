export interface Member {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

export interface Household {
  id: string;
  name: string;
  currency: string;
  members: Member[];
  categories?: CategoryInfo[];
  createdAt: string;
  updatedAt: string;
}

export type SplitType = 'common' | 'split_equal' | 'split_custom' | 'personal';

export interface Expense {
  id: string;
  householdId: string;
  amount: number;
  category: string;
  paymentMethod: string;
  description: string;
  splitType: SplitType;
  paidBy: string; // member id
  customSplit?: { [memberId: string]: number }; // percentage or exact amount
  date: string; // YYYY-MM-DD
  notes?: string;
  isStarred?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  id: string;
  householdId: string;
  fromMember: string;
  toMember: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface CategoryInfo {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgLight: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'Groceries', label: 'Groceries', icon: '🛒', color: '#10b981', bgLight: '#ecfdf5' },
  { id: 'Dining/Food', label: 'Dining/Food', icon: '🍽️', color: '#f59e0b', bgLight: '#fffbeb' },
  { id: 'Rent', label: 'Rent', icon: '🏠', color: '#6366f1', bgLight: '#eef2ff' },
  { id: 'Maintenance', label: 'Maintenance', icon: '🛠️', color: '#0284c7', bgLight: '#f0f9ff' },
  { id: 'Electricity', label: 'Electricity', icon: '⚡', color: '#eab308', bgLight: '#fefce8' },
  { id: 'Wifi', label: 'Wifi', icon: '📶', color: '#06b6d4', bgLight: '#ecfeff' },
  { id: 'RO', label: 'RO', icon: '💧', color: '#3b82f6', bgLight: '#eff6ff' },
  { id: 'Fuel', label: 'Fuel', icon: '⛽', color: '#ea580c', bgLight: '#fff7ed' },
  { id: 'Transport', label: 'Transport', icon: '🚗', color: '#14b8a6', bgLight: '#f0fdfa' },
  { id: 'Pancake', label: 'Pancake', icon: '🥞', color: '#d97706', bgLight: '#fffbeb' },
  { id: 'Netflix', label: 'Netflix', icon: '🍿', color: '#e11d48', bgLight: '#fff1f2' },
  { id: 'Mobile bills', label: 'Mobile bills', icon: '📱', color: '#8b5cf6', bgLight: '#f5f3ff' },
  { id: 'Vacations', label: 'Vacations', icon: '🏖️', color: '#0ea5e9', bgLight: '#f0f9ff' },
  { id: 'Maid', label: 'Maid', icon: '🧹', color: '#10b981', bgLight: '#f0fdf4' },
  { id: 'Entertainement', label: 'Entertainement', icon: '🎬', color: '#a855f7', bgLight: '#faf5ff' },
  { id: 'Shopping', label: 'Shopping', icon: '🛍️', color: '#ec4899', bgLight: '#fdf2f8' },
  { id: 'House things shopping', label: 'House things shopping', icon: '🛋️', color: '#84cc16', bgLight: '#f7fee7' },
];

export const PAYMENT_METHODS = [
  { id: 'gpay', label: 'gpay', icon: '📱', type: 'UPI' },
  { id: 'Axis Card', label: 'Axis Card', icon: '💳', type: 'Card' },
  { id: 'HSBC card', label: 'HSBC card', icon: '💳', type: 'Card' },
  { id: 'Swiggy card', label: 'Swiggy card', icon: '🍔', type: 'Card' },
  { id: 'amazon pay card', label: 'amazon pay card', icon: '📦', type: 'Card' },
  { id: 'AU card', label: 'AU card', icon: '💳', type: 'Card' },
  { id: 'HDFC card', label: 'HDFC card', icon: '💳', type: 'Card' },
  { id: 'Axis bank', label: 'Axis bank', icon: '🏦', type: 'Net Banking' },
  { id: 'Icici bank', label: 'Icici bank', icon: '🏦', type: 'Net Banking' },
  { id: 'SBI bank', label: 'SBI bank', icon: '🏛️', type: 'Net Banking' },
];

export const CURRENCIES = [
  { symbol: '₹', code: 'INR', name: 'Indian Rupee (₹)' },
  { symbol: '$', code: 'USD', name: 'US Dollar ($)' },
  { symbol: '€', code: 'EUR', name: 'Euro (€)' },
  { symbol: '£', code: 'GBP', name: 'British Pound (£)' },
  { symbol: 'A$', code: 'AUD', name: 'Australian Dollar (A$)' },
  { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar (C$)' },
  { symbol: 'AED', code: 'AED', name: 'UAE Dirham (AED)' },
  { symbol: 'S$', code: 'SGD', name: 'Singapore Dollar (S$)' },
];
