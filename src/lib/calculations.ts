import { Expense } from '../types';

export interface FinancialSummary {
  totalExpenditure: number;
  totalTransactions: number;
  averageTransaction: number;
  // User 1 (Current User)
  user1Paid: number;
  user1AttributedShare: number;
  user1PersonalTotal: number;
  // User 2 (Partner)
  user2Paid: number;
  user2AttributedShare: number;
  user2PersonalTotal: number;
  // Shared
  sharedExpenditure: number;
  // Net Balance (Positive = Partner owes User 1, Negative = User 1 owes Partner, 0 = settled)
  netBalanceForUser1: number;
  whoOwesWhom: {
    status: 'settled' | 'user2_owes_user1' | 'user1_owes_user2';
    debtorUid: string | null;
    debtorName: string | null;
    creditorUid: string | null;
    creditorName: string | null;
    amount: number;
  };
}

export function computeFinancialSummary(
  expenses: Expense[],
  user1Uid: string,
  user1Name: string,
  user2Uid?: string,
  user2Name?: string
): FinancialSummary {
  const p2Uid = user2Uid || 'partner_placeholder';
  const p2Name = user2Name || 'Partner';

  let totalExpenditure = 0;
  let user1Paid = 0;
  let user2Paid = 0;
  let user1AttributedShare = 0;
  let user2AttributedShare = 0;
  let user1PersonalTotal = 0;
  let user2PersonalTotal = 0;
  let sharedExpenditure = 0;

  for (const exp of expenses) {
    const amount = Number(exp.amount) || 0;
    totalExpenditure += amount;

    const isPaidByUser1 = exp.paidBy === user1Uid;
    if (isPaidByUser1) {
      user1Paid += amount;
    } else {
      user2Paid += amount;
    }

    if (exp.splitType === 'personal') {
      if (isPaidByUser1) {
        user1AttributedShare += amount;
        user1PersonalTotal += amount;
      } else {
        user2AttributedShare += amount;
        user2PersonalTotal += amount;
      }
    } else if (exp.splitType === 'equal') {
      const half = amount / 2;
      user1AttributedShare += half;
      user2AttributedShare += half;
      sharedExpenditure += amount;
    } else if (exp.splitType === 'custom' && exp.splitDetails) {
      sharedExpenditure += amount;
      const d = exp.splitDetails;
      if (d.user1Uid === user1Uid) {
        user1AttributedShare += Number(d.user1Amount) || 0;
        user2AttributedShare += Number(d.user2Amount) || 0;
      } else {
        user1AttributedShare += Number(d.user2Amount) || 0;
        user2AttributedShare += Number(d.user1Amount) || 0;
      }
    } else {
      // Fallback: equal split
      const half = amount / 2;
      user1AttributedShare += half;
      user2AttributedShare += half;
      sharedExpenditure += amount;
    }
  }

  const totalTransactions = expenses.length;
  const averageTransaction = totalTransactions > 0 ? totalExpenditure / totalTransactions : 0;
  const netBalanceForUser1 = user1Paid - user1AttributedShare;

  let whoOwesWhom: FinancialSummary['whoOwesWhom'] = {
    status: 'settled',
    debtorUid: null,
    debtorName: null,
    creditorUid: null,
    creditorName: null,
    amount: 0,
  };

  const roundedNet = Math.round(netBalanceForUser1 * 100) / 100;

  if (roundedNet > 0.01) {
    whoOwesWhom = {
      status: 'user2_owes_user1',
      debtorUid: p2Uid,
      debtorName: p2Name,
      creditorUid: user1Uid,
      creditorName: user1Name,
      amount: roundedNet,
    };
  } else if (roundedNet < -0.01) {
    whoOwesWhom = {
      status: 'user1_owes_user2',
      debtorUid: user1Uid,
      debtorName: user1Name,
      creditorUid: p2Uid,
      creditorName: p2Name,
      amount: Math.abs(roundedNet),
    };
  }

  return {
    totalExpenditure,
    totalTransactions,
    averageTransaction,
    user1Paid,
    user1AttributedShare,
    user1PersonalTotal,
    user2Paid,
    user2AttributedShare,
    user2PersonalTotal,
    sharedExpenditure,
    netBalanceForUser1,
    whoOwesWhom,
  };
}

/**
 * Filter expenses based on filter state
 */
export function filterExpenses(
  expenses: Expense[],
  userUid: string,
  filter: {
    searchQuery: string;
    timeFilter: string;
    startDate?: string;
    endDate?: string;
    paidBy: string;
    categoryId: string;
    paymentMethodId: string;
    splitType: string;
    sortBy: string;
  }
): Expense[] {
  const query = filter.searchQuery.toLowerCase().trim();
  const now = new Date();

  const filtered = expenses.filter((exp) => {
    // Search query
    if (query) {
      const matchTitle = exp.title.toLowerCase().includes(query);
      const matchCategory = exp.categoryName.toLowerCase().includes(query);
      const matchLocation = exp.location?.toLowerCase().includes(query);
      const matchPayer = exp.paidByName?.toLowerCase().includes(query);
      if (!matchTitle && !matchCategory && !matchLocation && !matchPayer) {
        return false;
      }
    }

    // Category
    if (filter.categoryId !== 'all' && exp.categoryId !== filter.categoryId) {
      return false;
    }

    // Payment Method
    if (filter.paymentMethodId !== 'all' && exp.paymentMethodId !== filter.paymentMethodId) {
      return false;
    }

    // Paid By
    if (filter.paidBy === 'me' && exp.paidBy !== userUid) {
      return false;
    }
    if (filter.paidBy === 'partner' && exp.paidBy === userUid) {
      return false;
    }

    // Split Type
    if (filter.splitType !== 'all' && exp.splitType !== filter.splitType) {
      return false;
    }

    // Time filter
    if (exp.expenseDate) {
      const expDate = new Date(exp.expenseDate + 'T00:00:00');

      if (filter.timeFilter === 'today') {
        const isToday =
          expDate.getDate() === now.getDate() &&
          expDate.getMonth() === now.getMonth() &&
          expDate.getFullYear() === now.getFullYear();
        if (!isToday) return false;
      } else if (filter.timeFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        if (expDate < weekAgo) return false;
      } else if (filter.timeFilter === 'month') {
        const isThisMonth =
          expDate.getMonth() === now.getMonth() &&
          expDate.getFullYear() === now.getFullYear();
        if (!isThisMonth) return false;
      } else if (filter.timeFilter === 'year') {
        if (expDate.getFullYear() !== now.getFullYear()) return false;
      } else if (filter.timeFilter === 'custom') {
        if (filter.startDate && exp.expenseDate < filter.startDate) return false;
        if (filter.endDate && exp.expenseDate > filter.endDate) return false;
      }
    }

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    switch (filter.sortBy) {
      case 'date-asc':
        return a.expenseDate.localeCompare(b.expenseDate);
      case 'amount-desc':
        return b.amount - a.amount;
      case 'amount-asc':
        return a.amount - b.amount;
      case 'date-desc':
      default:
        return b.expenseDate.localeCompare(a.expenseDate);
    }
  });

  return filtered;
}
