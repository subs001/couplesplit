import { Expense, Household, Settlement } from '../types';

const API_BASE = '/api';

export async function fetchHousehold(id: string): Promise<Household> {
  const res = await fetch(`${API_BASE}/household/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch household: ${res.statusText}`);
  }
  return res.json();
}

export async function createOrJoinHousehold(payload: { id?: string; name?: string; currency?: string }): Promise<Household> {
  const res = await fetch(`${API_BASE}/household`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to save household: ${res.statusText}`);
  }
  return res.json();
}

export async function updateHousehold(id: string, payload: Partial<Household>): Promise<Household> {
  const res = await fetch(`${API_BASE}/household/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to update household: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchExpenses(householdId: string): Promise<Expense[]> {
  const res = await fetch(`${API_BASE}/expenses?householdId=${encodeURIComponent(householdId)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch expenses: ${res.statusText}`);
  }
  return res.json();
}

export async function createExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> | (Partial<Expense> & { amount: number; category: string })): Promise<Expense> {
  const res = await fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  if (!res.ok) {
    throw new Error(`Failed to create expense: ${res.statusText}`);
  }
  return res.json();
}

export async function updateExpense(id: string, expense: Partial<Expense>): Promise<Expense> {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  if (!res.ok) {
    throw new Error(`Failed to update expense: ${res.statusText}`);
  }
  return res.json();
}

export async function deleteExpense(id: string): Promise<{ success: boolean; id: string }> {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete expense: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchSettlements(householdId: string): Promise<Settlement[]> {
  const res = await fetch(`${API_BASE}/settlements?householdId=${encodeURIComponent(householdId)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch settlements: ${res.statusText}`);
  }
  return res.json();
}

export async function createSettlement(settlement: Omit<Settlement, 'id' | 'createdAt'>): Promise<Settlement> {
  const res = await fetch(`${API_BASE}/settlements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settlement),
  });
  if (!res.ok) {
    throw new Error(`Failed to create settlement: ${res.statusText}`);
  }
  return res.json();
}

export async function syncDriveBackup(payload: {
  household: Household;
  expenses: Expense[];
  settlements: Settlement[];
}): Promise<{
  success: boolean;
  household: Household;
  expenses: Expense[];
  settlements: Settlement[];
}> {
  const res = await fetch(`${API_BASE}/sync-drive-backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to sync Drive backup with server: ${res.statusText}`);
  }
  return res.json();
}

export async function batchUpdateCategory(
  householdId: string,
  oldCategory: string,
  newCategory: string
): Promise<{ success: boolean; updatedCount: number }> {
  const res = await fetch(`${API_BASE}/expenses/batch-update-category`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ householdId, oldCategory, newCategory }),
  });
  if (!res.ok) {
    throw new Error(`Failed to batch update category: ${res.statusText}`);
  }
  return res.json();
}
