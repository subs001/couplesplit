import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBudgetStatus,
  computeCategoryMonthlySpend,
  calculateBudgetProgress,
  calculateBudgetsOverview,
  checkBudgetConflict,
  shiftMonthKey,
} from './budgetCalculations';
import { Budget, Expense } from '../types';

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  expenseId: 'exp1',
  title: 'Shopping Item',
  amount: 1000,
  categoryId: 'cat_shop',
  categoryName: 'Shopping',
  paymentMethodId: 'pm1',
  paymentMethodName: 'UPI',
  paidBy: 'u1',
  paidByName: 'Alice',
  splitType: 'equal',
  expenseDate: '2026-11-10',
  ...overrides,
});

const makeBudget = (overrides: Partial<Budget> = {}): Budget => ({
  budgetId: 'cat_shop',
  accountId: 'acc1',
  categoryId: 'cat_shop',
  categoryName: 'Shopping',
  monthlyLimit: 10000,
  scope: 'shared',
  ...overrides,
});

test('getBudgetStatus returns healthy (<60%), caution (60%-<100%), reached (100%), and crossed (>100%)', () => {
  const low = getBudgetStatus(0, 10000);
  assert.equal(low.status, 'healthy');
  assert.equal(low.label, 'Healthily within budget');
  assert.equal(low.remainingAmount, 10000);

  const justBelow60 = getBudgetStatus(5999, 10000);
  assert.equal(justBelow60.status, 'healthy');

  const at60 = getBudgetStatus(6000, 10000);
  assert.equal(at60.status, 'caution');
  assert.equal(at60.remainingAmount, 4000);

  const at95 = getBudgetStatus(9500, 10000);
  assert.equal(at95.status, 'caution');

  const at100 = getBudgetStatus(10000, 10000);
  assert.equal(at100.status, 'reached');
  assert.equal(at100.label, 'Limit reached');
  assert.equal(at100.remainingAmount, 0);

  const over100 = getBudgetStatus(11250, 10000);
  assert.equal(over100.status, 'crossed');
  assert.equal(over100.label, 'Limit crossed');
  assert.equal(over100.overAmount, 1250);
});

test('computeCategoryMonthlySpend tracks only the selected calendar month (monthly reset)', () => {
  const expenses = [
    makeExpense({ expenseId: 'e1', amount: 3000, expenseDate: '2026-10-25' }),
    makeExpense({ expenseId: 'e2', amount: 2500, expenseDate: '2026-11-02' }),
    makeExpense({ expenseId: 'e3', amount: 1500, expenseDate: '2026-11-18' }),
    makeExpense({ expenseId: 'e4', categoryId: 'cat_food', amount: 5000, expenseDate: '2026-11-19' }),
  ];

  const nov = computeCategoryMonthlySpend(expenses, 'cat_shop', '2026-11', 'shared', 'u1');
  assert.equal(nov.spent, 4000);
  assert.equal(nov.matchingExpenses.length, 2);

  const dec = computeCategoryMonthlySpend(expenses, 'cat_shop', '2026-12', 'shared', 'u1');
  assert.equal(dec.spent, 0);
  assert.equal(dec.matchingExpenses.length, 0);
});

test('computeCategoryMonthlySpend distinguishes shared total vs individual user share', () => {
  const expenses = [
    // Equal split 4000 -> u1 share 2000
    makeExpense({ expenseId: 'e1', amount: 4000, splitType: 'equal', paidBy: 'u2' }),
    // u1 personal 1500 -> u1 share 1500
    makeExpense({ expenseId: 'e2', amount: 1500, splitType: 'personal', paidBy: 'u1' }),
    // u2 personal 2000 -> u1 share 0 (excluded from u1 individual budget)
    makeExpense({ expenseId: 'e3', amount: 2000, splitType: 'personal', paidBy: 'u2' }),
    // Custom split 5000 where u1 is 1000 -> u1 share 1000
    makeExpense({
      expenseId: 'e4',
      amount: 5000,
      splitType: 'custom',
      splitDetails: {
        user1Uid: 'u1',
        user1Amount: 1000,
        user1Percentage: 20,
        user2Uid: 'u2',
        user2Amount: 4000,
        user2Percentage: 80,
      },
    }),
  ];

  const shared = computeCategoryMonthlySpend(expenses, 'cat_shop', '2026-11', 'shared', 'u1');
  assert.equal(shared.spent, 12500);
  assert.equal(shared.matchingExpenses.length, 4);

  const individual = computeCategoryMonthlySpend(expenses, 'cat_shop', '2026-11', 'individual', 'u1');
  assert.equal(individual.spent, 4500);
  assert.equal(individual.matchingExpenses.length, 3);
});

test('checkBudgetConflict enforces max 1 shared budget and mutual exclusion with individual budgets', () => {
  const sharedBudgets = [makeBudget({ budgetId: 'cat_shop', categoryId: 'cat_shop', scope: 'shared' })];
  const individualBudgets = [
    makeBudget({ budgetId: 'acc1_cat_food', categoryId: 'cat_food', scope: 'individual', ownerUid: 'u1' }),
  ];

  // Shared exists -> cannot create individual or second shared for cat_shop
  assert.equal(
    checkBudgetConflict('cat_shop', 'individual', sharedBudgets, individualBudgets).allowed,
    false
  );
  assert.equal(
    checkBudgetConflict('cat_shop', 'shared', sharedBudgets, individualBudgets).allowed,
    false
  );

  // Editing same shared budget does not self-conflict
  assert.equal(
    checkBudgetConflict('cat_shop', 'shared', sharedBudgets, individualBudgets, 'cat_shop').allowed,
    true
  );

  // Individual exists -> cannot create shared for cat_food
  assert.equal(
    checkBudgetConflict('cat_food', 'shared', sharedBudgets, individualBudgets).allowed,
    false
  );

  // Unbudgeted category allows either
  assert.equal(
    checkBudgetConflict('cat_travel', 'shared', sharedBudgets, individualBudgets).allowed,
    true
  );
  assert.equal(
    checkBudgetConflict('cat_travel', 'individual', sharedBudgets, individualBudgets).allowed,
    true
  );
});

test('calculateBudgetsOverview aggregates counts across statuses and shiftMonthKey rolls years', () => {
  const expenses = [
    makeExpense({ expenseId: 'e1', categoryId: 'cat_shop', amount: 11000, expenseDate: '2026-11-05' }),
    makeExpense({ expenseId: 'e2', categoryId: 'cat_food', amount: 3500, splitType: 'personal', paidBy: 'u1', expenseDate: '2026-11-06' }),
    makeExpense({ expenseId: 'e3', categoryId: 'cat_travel', amount: 1000, expenseDate: '2026-11-07' }),
  ];

  const items = [
    calculateBudgetProgress(makeBudget({ categoryId: 'cat_shop', monthlyLimit: 10000, scope: 'shared' }), expenses, '2026-11', 'u1'),
    calculateBudgetProgress(makeBudget({ budgetId: 'acc1_cat_food', categoryId: 'cat_food', monthlyLimit: 5000, scope: 'individual' }), expenses, '2026-11', 'u1'),
    calculateBudgetProgress(makeBudget({ budgetId: 'cat_travel', categoryId: 'cat_travel', monthlyLimit: 5000, scope: 'shared' }), expenses, '2026-11', 'u1'),
  ];

  const overview = calculateBudgetsOverview(items);
  assert.equal(overview.totalBudgeted, 20000);
  assert.equal(overview.totalSpent, 15500);
  assert.equal(overview.sharedCount, 2);
  assert.equal(overview.individualCount, 1);
  assert.equal(overview.exceededCount, 1);
  assert.equal(overview.cautionCount, 1);
  assert.equal(overview.healthyCount, 1);

  assert.equal(shiftMonthKey('2026-12', 1), '2027-01');
  assert.equal(shiftMonthKey('2026-01', -1), '2025-12');
});
