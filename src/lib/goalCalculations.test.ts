import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUserSeeGoal,
  canUserContributeToGoal,
  canUserManageGoal,
  computeDaysRemaining,
  calculateGoalProgress,
  calculateGoalsOverview,
  filterAndSortGoals,
} from './goalCalculations';
import { Goal, GoalContribution } from '../types';

const USER_1 = 'uid_alice';
const USER_2 = 'uid_bob';

const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  goalId: 'goal_1',
  accountId: 'acc_1',
  name: 'Japan Trip',
  targetAmount: 100000,
  savingsAccount: 'HDFC Savings',
  targetDate: '2026-12-31',
  scope: 'shared',
  isHiddenFromPartner: false,
  createdBy: USER_1,
  createdByName: 'Alice',
  ...overrides,
});

const makeContribution = (overrides: Partial<GoalContribution> = {}): GoalContribution => ({
  contributionId: 'c_1',
  goalId: 'goal_1',
  amount: 10000,
  date: '2026-11-01',
  contributedBy: USER_1,
  contributedByName: 'Alice',
  ...overrides,
});

test('permission and privacy rules for shared and personal goals', () => {
  const sharedGoal = makeGoal({ scope: 'shared', isHiddenFromPartner: false, createdBy: USER_1 });
  assert.equal(canUserSeeGoal(sharedGoal, USER_1), true);
  assert.equal(canUserSeeGoal(sharedGoal, USER_2), true);
  assert.equal(canUserContributeToGoal(sharedGoal, USER_1), true);
  assert.equal(canUserContributeToGoal(sharedGoal, USER_2), true);
  assert.equal(canUserManageGoal(sharedGoal, USER_1), true);
  assert.equal(canUserManageGoal(sharedGoal, USER_2), true);

  const visiblePersonalGoal = makeGoal({
    goalId: 'goal_p1',
    scope: 'personal',
    isHiddenFromPartner: false,
    createdBy: USER_1,
  });
  assert.equal(canUserSeeGoal(visiblePersonalGoal, USER_1), true);
  assert.equal(canUserSeeGoal(visiblePersonalGoal, USER_2), true);
  assert.equal(canUserContributeToGoal(visiblePersonalGoal, USER_1), true);
  assert.equal(canUserContributeToGoal(visiblePersonalGoal, USER_2), false);
  assert.equal(canUserManageGoal(visiblePersonalGoal, USER_1), true);
  assert.equal(canUserManageGoal(visiblePersonalGoal, USER_2), false);

  const hiddenPersonalGoal = makeGoal({
    goalId: 'goal_p2',
    scope: 'personal',
    isHiddenFromPartner: true,
    createdBy: USER_1,
  });
  assert.equal(canUserSeeGoal(hiddenPersonalGoal, USER_1), true);
  assert.equal(canUserSeeGoal(hiddenPersonalGoal, USER_2), false);
  assert.equal(canUserContributeToGoal(hiddenPersonalGoal, USER_2), false);
  assert.equal(canUserManageGoal(hiddenPersonalGoal, USER_2), false);
});

test('calculateGoalProgress computes dual contributions, percentages, and pace accurately', () => {
  const goal = makeGoal({ targetAmount: 100000, targetDate: '2026-12-31' });
  const contributions: GoalContribution[] = [
    makeContribution({ contributionId: 'c1', amount: 30000, contributedBy: USER_1 }),
    makeContribution({ contributionId: 'c2', amount: 25000, contributedBy: USER_2, contributedByName: 'Bob' }),
    makeContribution({ contributionId: 'c3', amount: 5000, contributedBy: USER_1 }),
  ];

  const prog = calculateGoalProgress(goal, contributions, USER_1, USER_2, '2026-10-31');
  assert.equal(prog.totalSaved, 60000);
  assert.equal(prog.remainingAmount, 40000);
  assert.equal(prog.rawPercentage, 60);
  assert.equal(prog.cappedPercentage, 60);
  assert.equal(prog.user1Contribution, 35000);
  assert.equal(prog.user2Contribution, 25000);
  assert.equal(prog.user1PercentOfTarget, 35);
  assert.equal(prog.user2PercentOfTarget, 25);
  assert.equal(prog.isCompleted, false);
  assert.equal(prog.daysRemaining, 61);
  assert.equal(prog.isOverdue, false);
  assert.ok(prog.requiredMonthlySaving > 0);
  assert.equal(prog.contributionCount, 3);
});

test('calculateGoalProgress handles goal completion and over-funding cleanly', () => {
  const goal = makeGoal({ targetAmount: 50000, targetDate: '2026-10-01' });
  const contributions = [
    makeContribution({ amount: 55000, contributedBy: USER_1 }),
  ];

  const prog = calculateGoalProgress(goal, contributions, USER_1, USER_2, '2026-11-17');
  assert.equal(prog.totalSaved, 55000);
  assert.equal(prog.remainingAmount, 0);
  assert.equal(prog.rawPercentage, 110);
  assert.equal(prog.cappedPercentage, 100);
  assert.equal(prog.isCompleted, true);
  assert.equal(prog.isOverdue, false);
  assert.equal(prog.requiredMonthlySaving, 0);
});

test('computeDaysRemaining detects overdue goals when incomplete', () => {
  assert.equal(computeDaysRemaining('2026-11-10', '2026-11-17'), -7);
  const goal = makeGoal({ targetAmount: 50000, targetDate: '2026-11-10' });
  const prog = calculateGoalProgress(goal, [], USER_1, USER_2, '2026-11-17');
  assert.equal(prog.isOverdue, true);
  assert.equal(prog.isCompleted, false);
});

test('calculateGoalsOverview aggregates only goals visible to current user', () => {
  const g1 = makeGoal({ goalId: 'g1', targetAmount: 100000, scope: 'shared', createdBy: USER_1 });
  const g2 = makeGoal({ goalId: 'g2', targetAmount: 50000, scope: 'personal', isHiddenFromPartner: false, createdBy: USER_1 });
  const g3HiddenFromBob = makeGoal({ goalId: 'g3', targetAmount: 80000, scope: 'personal', isHiddenFromPartner: true, createdBy: USER_1 });

  const contribsByGoal: Record<string, GoalContribution[]> = {
    g1: [makeContribution({ goalId: 'g1', amount: 50000, contributedBy: USER_1 })],
    g2: [makeContribution({ goalId: 'g2', amount: 50000, contributedBy: USER_1 })],
    g3: [makeContribution({ goalId: 'g3', amount: 20000, contributedBy: USER_1 })],
  };

  const aliceOverview = calculateGoalsOverview([g1, g2, g3HiddenFromBob], contribsByGoal, USER_1, USER_2);
  assert.equal(aliceOverview.totalGoalsCount, 3);
  assert.equal(aliceOverview.totalTarget, 230000);
  assert.equal(aliceOverview.totalSaved, 120000);
  assert.equal(aliceOverview.hiddenPersonalCount, 1);
  assert.equal(aliceOverview.completedCount, 1);

  const bobOverview = calculateGoalsOverview([g1, g2, g3HiddenFromBob], contribsByGoal, USER_2, USER_1);
  assert.equal(bobOverview.totalGoalsCount, 2);
  assert.equal(bobOverview.totalTarget, 150000);
  assert.equal(bobOverview.totalSaved, 100000);
  assert.equal(bobOverview.hiddenPersonalCount, 0);
  assert.equal(bobOverview.completedCount, 1);
});

test('filterAndSortGoals respects scope filters, search query, and sorting', () => {
  const gShared = makeGoal({ goalId: 'g1', name: 'Europe Vacation', savingsAccount: 'SBI Joint', targetAmount: 200000, targetDate: '2027-06-01', scope: 'shared', createdBy: USER_1 });
  const gMyPersonal = makeGoal({ goalId: 'g2', name: 'New Laptop', savingsAccount: 'HDFC Savings', targetAmount: 120000, targetDate: '2026-12-01', scope: 'personal', isHiddenFromPartner: true, createdBy: USER_1 });
  const gPartnerPersonal = makeGoal({ goalId: 'g3', name: 'Guitar Fund', savingsAccount: 'ICICI Savings', targetAmount: 30000, targetDate: '2027-01-15', scope: 'personal', isHiddenFromPartner: false, createdBy: USER_2, createdByName: 'Bob' });

  const contribs: Record<string, GoalContribution[]> = {
    g1: [makeContribution({ goalId: 'g1', amount: 100000 })], // 50%
    g2: [makeContribution({ goalId: 'g2', amount: 90000 })], // 75%
    g3: [makeContribution({ goalId: 'g3', amount: 3000 })], // 10%
  };

  const sortedByProgress = filterAndSortGoals(
    [gShared, gMyPersonal, gPartnerPersonal],
    contribs,
    USER_1,
    { scope: 'all', searchQuery: '', sortBy: 'progress-desc' }
  );
  assert.deepEqual(sortedByProgress.map((g) => g.goalId), ['g2', 'g1', 'g3']);

  const partnerOnly = filterAndSortGoals(
    [gShared, gMyPersonal, gPartnerPersonal],
    contribs,
    USER_1,
    { scope: 'partner', searchQuery: '', sortBy: 'targetDate-asc' }
  );
  assert.deepEqual(partnerOnly.map((g) => g.goalId), ['g3']);

  const searchHDFC = filterAndSortGoals(
    [gShared, gMyPersonal, gPartnerPersonal],
    contribs,
    USER_1,
    { scope: 'all', searchQuery: 'hdfc', sortBy: 'targetDate-asc' }
  );
  assert.deepEqual(searchHDFC.map((g) => g.goalId), ['g2']);
});
