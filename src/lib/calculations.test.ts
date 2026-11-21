import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFinancialSummary } from './calculations';
import { Expense } from '../types';

const USER_1 = 'uid_alice';
const USER_2 = 'uid_bob';

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  expenseId: 'exp_1',
  title: 'Dinner',
  amount: 1000,
  categoryId: 'cat_food',
  categoryName: 'Food',
  paymentMethodId: 'pm_upi',
  paymentMethodName: 'UPI',
  paidBy: USER_1,
  paidByName: 'Alice',
  splitType: 'equal',
  expenseDate: '2026-11-20',
  ...overrides,
});

test('standard equal split without alreadySplit adds partner share to settle balance', () => {
  const expenses = [makeExpense({ amount: 1000, paidBy: USER_1, splitType: 'equal', alreadySplit: false })];
  const summary = computeFinancialSummary(expenses, USER_1, 'Alice', USER_2, 'Bob');

  assert.equal(summary.totalExpenditure, 1000);
  assert.equal(summary.user1Paid, 1000);
  assert.equal(summary.user2Paid, 0);
  assert.equal(summary.user1AttributedShare, 500);
  assert.equal(summary.user2AttributedShare, 500);
  assert.equal(summary.netBalanceForUser1, 500);
  assert.equal(summary.whoOwesWhom.status, 'user2_owes_user1');
  assert.equal(summary.whoOwesWhom.amount, 500);
});

test('alreadySplit equal expense excludes settle balance while reflecting both shares in Paid vs Fair Share', () => {
  const expenses = [
    makeExpense({
      expenseId: 'e_split',
      amount: 1200,
      paidBy: USER_1,
      splitType: 'equal',
      alreadySplit: true,
    }),
  ];
  const summary = computeFinancialSummary(expenses, USER_1, 'Alice', USER_2, 'Bob');

  assert.equal(summary.totalExpenditure, 1200);
  assert.equal(summary.sharedExpenditure, 1200);
  assert.equal(summary.user1Paid, 600);
  assert.equal(summary.user2Paid, 600);
  assert.equal(summary.user1AttributedShare, 600);
  assert.equal(summary.user2AttributedShare, 600);
  assert.equal(summary.netBalanceForUser1, 0);
  assert.equal(summary.whoOwesWhom.status, 'settled');
  assert.equal(summary.whoOwesWhom.amount, 0);
});

test('alreadySplit custom split expense attributes custom shares to both Paid and Fair Share with zero settle balance impact', () => {
  const expenses = [
    makeExpense({
      expenseId: 'e_custom_split',
      amount: 1000,
      paidBy: USER_2,
      paidByName: 'Bob',
      splitType: 'custom',
      alreadySplit: true,
      splitDetails: {
        user1Uid: USER_1,
        user1Amount: 700,
        user1Percentage: 70,
        user2Uid: USER_2,
        user2Amount: 300,
        user2Percentage: 30,
      },
    }),
  ];
  const summary = computeFinancialSummary(expenses, USER_1, 'Alice', USER_2, 'Bob');

  assert.equal(summary.totalExpenditure, 1000);
  assert.equal(summary.user1Paid, 700);
  assert.equal(summary.user2Paid, 300);
  assert.equal(summary.user1AttributedShare, 700);
  assert.equal(summary.user2AttributedShare, 300);
  assert.equal(summary.netBalanceForUser1, 0);
  assert.equal(summary.whoOwesWhom.status, 'settled');
});

test('mixed normal and alreadySplit expenses only settle the unsplit portion while preserving accurate totals', () => {
  const expenses = [
    // Alice paid 1000 unsplit (Bob owes Alice 500)
    makeExpense({
      expenseId: 'e1',
      amount: 1000,
      paidBy: USER_1,
      splitType: 'equal',
      alreadySplit: false,
    }),
    // 2000 dinner already split equally (Alice paid 1000, Bob paid 1000, 0 settle impact)
    makeExpense({
      expenseId: 'e2',
      amount: 2000,
      paidBy: USER_1,
      splitType: 'equal',
      alreadySplit: true,
    }),
    // 600 personal expense by Bob (0 settle impact)
    makeExpense({
      expenseId: 'e3',
      amount: 600,
      paidBy: USER_2,
      paidByName: 'Bob',
      splitType: 'personal',
    }),
  ];

  const summary = computeFinancialSummary(expenses, USER_1, 'Alice', USER_2, 'Bob');

  assert.equal(summary.totalExpenditure, 3600);
  assert.equal(summary.sharedExpenditure, 3000);
  assert.equal(summary.user1Paid, 2000); // 1000 + 1000
  assert.equal(summary.user2Paid, 1600); // 0 + 1000 + 600
  assert.equal(summary.user1AttributedShare, 1500); // 500 + 1000
  assert.equal(summary.user2AttributedShare, 2100); // 500 + 1000 + 600
  assert.equal(summary.netBalanceForUser1, 500);
  assert.equal(summary.whoOwesWhom.status, 'user2_owes_user1');
  assert.equal(summary.whoOwesWhom.amount, 500);
});
