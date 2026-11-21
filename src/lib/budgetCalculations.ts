import { Budget, BudgetScope, Expense } from '../types';

export type BudgetStatusLevel = 'healthy' | 'caution' | 'reached' | 'crossed';

export interface BudgetStatusInfo {
  status: BudgetStatusLevel;
  percentage: number;
  cappedPercentage: number;
  remainingAmount: number;
  overAmount: number;
  label: string;
  description: string;
}

export interface CategoryBudgetProgress {
  budget: Budget;
  spent: number;
  matchingExpenses: Expense[];
  statusInfo: BudgetStatusInfo;
}

export interface BudgetsOverview {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  sharedCount: number;
  individualCount: number;
  healthyCount: number;
  cautionCount: number;
  exceededCount: number;
}

export function getMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [yStr, mStr] = monthKey.split('-');
  const year = Number(yStr) || new Date().getFullYear();
  const monthIndex = (Number(mStr) || 1) - 1;
  const shifted = new Date(year, monthIndex + delta, 1);
  return getMonthKey(shifted);
}

export function formatMonthLabel(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const year = Number(yStr) || new Date().getFullYear();
  const monthIndex = (Number(mStr) || 1) - 1;
  const d = new Date(year, monthIndex, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function getNextResetLabel(monthKey: string): string {
  const nextMonth = shiftMonthKey(monthKey, 1);
  const [yStr, mStr] = nextMonth.split('-');
  const year = Number(yStr);
  const monthIndex = (Number(mStr) || 1) - 1;
  const d = new Date(year, monthIndex, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export function getDaysLeftInMonth(monthKey: string, now: Date = new Date()): number | null {
  const currentKey = getMonthKey(now);
  if (monthKey !== currentKey) return null;
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return Math.max(0, lastDayOfMonth - now.getDate());
}

/**
 * Determine monthly budget threshold status:
 * - Red (`crossed` / `reached`): spent >= monthlyLimit (100%+)
 * - Yellow (`caution`): spent >= 60% of monthlyLimit and < 100%
 * - Green (`healthy`): spent < 60% of monthlyLimit
 */
export function getBudgetStatus(spent: number, monthlyLimit: number): BudgetStatusInfo {
  const safeSpent = Math.max(0, Number(spent) || 0);
  const safeLimit = Math.max(0, Number(monthlyLimit) || 0);

  if (safeLimit <= 0) {
    return {
      status: 'healthy',
      percentage: 0,
      cappedPercentage: 0,
      remainingAmount: 0,
      overAmount: 0,
      label: 'Healthily within budget',
      description: 'Healthily within budget',
    };
  }

  const percentage = (safeSpent / safeLimit) * 100;
  const cappedPercentage = Math.min(100, Math.max(0, percentage));
  const diff = Math.round((safeSpent - safeLimit) * 100) / 100;

  if (diff > 0.005) {
    return {
      status: 'crossed',
      percentage,
      cappedPercentage: 100,
      remainingAmount: 0,
      overAmount: diff,
      label: 'Limit crossed',
      description: 'Limit crossed',
    };
  }

  if (Math.abs(diff) <= 0.005) {
    return {
      status: 'reached',
      percentage: 100,
      cappedPercentage: 100,
      remainingAmount: 0,
      overAmount: 0,
      label: 'Limit reached',
      description: 'Limit reached',
    };
  }

  const remainingAmount = Math.max(0, Math.round((safeLimit - safeSpent) * 100) / 100);

  if (safeSpent >= safeLimit * 0.6) {
    return {
      status: 'caution',
      percentage,
      cappedPercentage,
      remainingAmount,
      overAmount: 0,
      label: 'Caution',
      description: 'Caution — within 60%+ of monthly budget',
    };
  }

  return {
    status: 'healthy',
    percentage,
    cappedPercentage,
    remainingAmount,
    overAmount: 0,
    label: 'Healthily within budget',
    description: 'Healthily within budget',
  };
}

/**
 * Compute how much an individual expense contributes to a category budget.
 * - Shared budgets track full category expense amount.
 * - Individual budgets track only the current user's attributed share
 *   (100% of their personal expenses, 50% of equal splits, custom split share, 0 for partner personal).
 */
export function getExpenseAmountForBudget(
  exp: Expense,
  scope: BudgetScope,
  currentUserUid: string
): number {
  const amount = Number(exp.amount) || 0;
  if (amount <= 0) return 0;

  if (scope === 'shared') {
    return amount;
  }

  if (exp.splitType === 'personal') {
    return exp.paidBy === currentUserUid ? amount : 0;
  }

  if (exp.splitType === 'equal') {
    return amount / 2;
  }

  if (exp.splitType === 'custom' && exp.splitDetails) {
    const d = exp.splitDetails;
    if (d.user1Uid === currentUserUid) {
      return Number(d.user1Amount) || 0;
    }
    return Number(d.user2Amount) || 0;
  }

  return amount / 2;
}

export function computeCategoryMonthlySpend(
  expenses: Expense[],
  categoryId: string,
  monthKey: string,
  scope: BudgetScope,
  currentUserUid: string
): { spent: number; matchingExpenses: Expense[] } {
  const matchingExpenses: Expense[] = [];
  let spent = 0;

  for (const exp of expenses) {
    if (exp.categoryId !== categoryId) continue;
    if (!exp.expenseDate || !exp.expenseDate.startsWith(monthKey)) continue;

    const trackedAmount = getExpenseAmountForBudget(exp, scope, currentUserUid);
    if (scope === 'individual' && exp.splitType === 'personal' && exp.paidBy !== currentUserUid) {
      continue;
    }

    spent += trackedAmount;
    matchingExpenses.push(exp);
  }

  matchingExpenses.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));

  return {
    spent: Math.round(spent * 100) / 100,
    matchingExpenses,
  };
}

export function calculateBudgetProgress(
  budget: Budget,
  expenses: Expense[],
  monthKey: string,
  currentUserUid: string
): CategoryBudgetProgress {
  const { spent, matchingExpenses } = computeCategoryMonthlySpend(
    expenses,
    budget.categoryId,
    monthKey,
    budget.scope,
    currentUserUid
  );
  const statusInfo = getBudgetStatus(spent, budget.monthlyLimit);

  return {
    budget,
    spent,
    matchingExpenses,
    statusInfo,
  };
}

export function calculateBudgetsOverview(items: CategoryBudgetProgress[]): BudgetsOverview {
  let totalBudgeted = 0;
  let totalSpent = 0;
  let sharedCount = 0;
  let individualCount = 0;
  let healthyCount = 0;
  let cautionCount = 0;
  let exceededCount = 0;

  for (const item of items) {
    totalBudgeted += Number(item.budget.monthlyLimit) || 0;
    totalSpent += item.spent;

    if (item.budget.scope === 'shared') sharedCount += 1;
    else individualCount += 1;

    if (item.statusInfo.status === 'healthy') healthyCount += 1;
    else if (item.statusInfo.status === 'caution') cautionCount += 1;
    else exceededCount += 1;
  }

  const totalRemaining = Math.max(0, Math.round((totalBudgeted - totalSpent) * 100) / 100);
  const overallPercentage =
    totalBudgeted > 0 ? Math.min(999, Math.round((totalSpent / totalBudgeted) * 100)) : 0;

  return {
    totalBudgeted: Math.round(totalBudgeted * 100) / 100,
    totalSpent: Math.round(totalSpent * 100) / 100,
    totalRemaining,
    overallPercentage,
    sharedCount,
    individualCount,
    healthyCount,
    cautionCount,
    exceededCount,
  };
}

export function checkBudgetConflict(
  categoryId: string,
  targetScope: BudgetScope,
  sharedBudgets: Budget[],
  individualBudgets: Budget[],
  editingBudgetId?: string
): { allowed: boolean; reason?: string } {
  const existingShared = sharedBudgets.find(
    (b) => b.categoryId === categoryId && b.budgetId !== editingBudgetId
  );
  const existingIndividual = individualBudgets.find(
    (b) => b.categoryId === categoryId && b.budgetId !== editingBudgetId
  );

  if (targetScope === 'shared') {
    if (existingShared) {
      return {
        allowed: false,
        reason:
          'A shared budget already exists for this category. Only one shared budget per category is allowed.',
      };
    }
    if (existingIndividual) {
      return {
        allowed: false,
        reason:
          'You already have an individual budget for this category. Remove it first before creating a shared budget.',
      };
    }
  } else {
    if (existingShared) {
      return {
        allowed: false,
        reason:
          'A shared budget already exists for this category. Individual budgets are not allowed when a shared budget is active.',
      };
    }
    if (existingIndividual) {
      return {
        allowed: false,
        reason: 'You already have an individual budget for this category.',
      };
    }
  }

  return { allowed: true };
}
