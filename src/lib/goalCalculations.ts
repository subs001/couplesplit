import { Goal, GoalContribution } from '../types';
import { getTodayString } from './currency';

export interface GoalProgress {
  totalSaved: number;
  remainingAmount: number;
  rawPercentage: number;
  cappedPercentage: number;
  user1Contribution: number;
  user2Contribution: number;
  user1PercentOfTarget: number;
  user2PercentOfTarget: number;
  isCompleted: boolean;
  daysRemaining: number;
  isOverdue: boolean;
  requiredMonthlySaving: number;
  contributionCount: number;
}

export interface GoalsOverview {
  totalTarget: number;
  totalSaved: number;
  totalRemaining: number;
  overallPercentage: number;
  cappedOverallPercentage: number;
  sharedCount: number;
  sharedTarget: number;
  sharedSaved: number;
  personalCount: number;
  personalTarget: number;
  personalSaved: number;
  hiddenPersonalCount: number;
  completedCount: number;
  totalGoalsCount: number;
}

export type GoalFilterScope = 'all' | 'shared' | 'personal' | 'partner';
export type GoalSortBy = 'targetDate-asc' | 'progress-desc' | 'amount-desc' | 'remaining-desc';

/**
 * Determine whether a given user can view a goal.
 * Hidden personal goals are strictly visible only to their creator.
 */
export function canUserSeeGoal(goal: Goal, userUid: string): boolean {
  if (!goal.isHiddenFromPartner) return true;
  return goal.createdBy === userUid;
}

/**
 * Determine whether a given user can add/modify/delete contributions on a goal.
 * - Shared goals: both members of the shared account can contribute.
 * - Personal goals: ONLY the creator can contribute.
 */
export function canUserContributeToGoal(goal: Goal, userUid: string): boolean {
  if (!userUid) return false;
  if (goal.scope === 'shared') return true;
  return goal.createdBy === userUid;
}

/**
 * Determine whether a given user can edit or delete a goal's details.
 * - Shared goals: both members can update/delete details.
 * - Personal goals: ONLY the creator can update/delete/toggle privacy.
 */
export function canUserManageGoal(goal: Goal, userUid: string): boolean {
  if (!userUid) return false;
  if (goal.scope === 'shared') return true;
  return goal.createdBy === userUid;
}

/**
 * Compute day difference between two YYYY-MM-DD strings (target - reference).
 */
export function computeDaysRemaining(targetDateStr: string, referenceDateStr?: string): number {
  if (!targetDateStr || targetDateStr.length < 10) return 0;
  const refStr = referenceDateStr || getTodayString();
  const targetMs = new Date(targetDateStr.slice(0, 10) + 'T00:00:00Z').getTime();
  const refMs = new Date(refStr.slice(0, 10) + 'T00:00:00Z').getTime();
  if (Number.isNaN(targetMs) || Number.isNaN(refMs)) return 0;
  return Math.round((targetMs - refMs) / (1000 * 60 * 60 * 24));
}

/**
 * Compute detailed progress metrics for a single savings goal.
 */
export function calculateGoalProgress(
  goal: Goal,
  contributions: GoalContribution[],
  currentUserUid: string,
  partnerUid?: string,
  referenceDateStr?: string
): GoalProgress {
  let totalSaved = 0;
  let user1Contribution = 0;
  let user2Contribution = 0;

  for (const c of contributions) {
    const amt = Number(c.amount) || 0;
    if (amt <= 0) continue;
    totalSaved += amt;
    if (c.contributedBy === currentUserUid) {
      user1Contribution += amt;
    } else if (!partnerUid || c.contributedBy === partnerUid || c.contributedBy !== currentUserUid) {
      user2Contribution += amt;
    }
  }

  totalSaved = Math.round(totalSaved * 100) / 100;
  user1Contribution = Math.round(user1Contribution * 100) / 100;
  user2Contribution = Math.round(user2Contribution * 100) / 100;

  const target = Math.max(0, Number(goal.targetAmount) || 0);
  const remainingAmount = Math.max(0, Math.round((target - totalSaved) * 100) / 100);
  const rawPercentage = target > 0 ? Math.round((totalSaved / target) * 1000) / 10 : 0;
  const cappedPercentage = Math.min(100, Math.max(0, rawPercentage));

  const user1PercentOfTarget = target > 0 ? Math.min(100, (user1Contribution / target) * 100) : 0;
  const user2PercentOfTarget =
    target > 0
      ? Math.min(Math.max(0, 100 - user1PercentOfTarget), (user2Contribution / target) * 100)
      : 0;

  const isCompleted = target > 0 && totalSaved >= target;
  const daysRemaining = computeDaysRemaining(goal.targetDate, referenceDateStr);
  const isOverdue = !isCompleted && daysRemaining < 0;

  let requiredMonthlySaving = 0;
  if (!isCompleted && remainingAmount > 0 && daysRemaining > 0) {
    const monthsRemaining = Math.max(1, daysRemaining / 30.44);
    requiredMonthlySaving = Math.ceil(remainingAmount / monthsRemaining);
  }

  return {
    totalSaved,
    remainingAmount,
    rawPercentage,
    cappedPercentage,
    user1Contribution,
    user2Contribution,
    user1PercentOfTarget,
    user2PercentOfTarget,
    isCompleted,
    daysRemaining,
    isOverdue,
    requiredMonthlySaving,
    contributionCount: contributions.length,
  };
}

/**
 * Aggregate summary metrics across all visible goals.
 */
export function calculateGoalsOverview(
  goals: Goal[],
  contributionsByGoal: Record<string, GoalContribution[]>,
  currentUserUid: string,
  partnerUid?: string
): GoalsOverview {
  let totalTarget = 0;
  let totalSaved = 0;
  let sharedCount = 0;
  let sharedTarget = 0;
  let sharedSaved = 0;
  let personalCount = 0;
  let personalTarget = 0;
  let personalSaved = 0;
  let hiddenPersonalCount = 0;
  let completedCount = 0;

  const visibleGoals = goals.filter((g) => canUserSeeGoal(g, currentUserUid));

  for (const goal of visibleGoals) {
    const contribs = contributionsByGoal[goal.goalId] || [];
    const prog = calculateGoalProgress(goal, contribs, currentUserUid, partnerUid);
    const target = Math.max(0, Number(goal.targetAmount) || 0);

    totalTarget += target;
    totalSaved += prog.totalSaved;
    if (prog.isCompleted) completedCount += 1;

    if (goal.scope === 'shared') {
      sharedCount += 1;
      sharedTarget += target;
      sharedSaved += prog.totalSaved;
    } else {
      personalCount += 1;
      personalTarget += target;
      personalSaved += prog.totalSaved;
      if (goal.isHiddenFromPartner && goal.createdBy === currentUserUid) {
        hiddenPersonalCount += 1;
      }
    }
  }

  totalTarget = Math.round(totalTarget * 100) / 100;
  totalSaved = Math.round(totalSaved * 100) / 100;
  const totalRemaining = Math.max(0, Math.round((totalTarget - totalSaved) * 100) / 100);
  const overallPercentage =
    totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 1000) / 10 : 0;

  return {
    totalTarget,
    totalSaved,
    totalRemaining,
    overallPercentage,
    cappedOverallPercentage: Math.min(100, Math.max(0, overallPercentage)),
    sharedCount,
    sharedTarget: Math.round(sharedTarget * 100) / 100,
    sharedSaved: Math.round(sharedSaved * 100) / 100,
    personalCount,
    personalTarget: Math.round(personalTarget * 100) / 100,
    personalSaved: Math.round(personalSaved * 100) / 100,
    hiddenPersonalCount,
    completedCount,
    totalGoalsCount: visibleGoals.length,
  };
}

/**
 * Filter and sort visible goals for display.
 */
export function filterAndSortGoals(
  goals: Goal[],
  contributionsByGoal: Record<string, GoalContribution[]>,
  currentUserUid: string,
  options: {
    scope: GoalFilterScope;
    searchQuery: string;
    sortBy: GoalSortBy;
  }
): Goal[] {
  const q = options.searchQuery.trim().toLowerCase();

  const filtered = goals.filter((goal) => {
    if (!canUserSeeGoal(goal, currentUserUid)) return false;

    if (options.scope === 'shared' && goal.scope !== 'shared') return false;
    if (options.scope === 'personal' && !(goal.scope === 'personal' && goal.createdBy === currentUserUid)) {
      return false;
    }
    if (options.scope === 'partner' && !(goal.scope === 'personal' && goal.createdBy !== currentUserUid)) {
      return false;
    }

    if (q) {
      const matchName = goal.name.toLowerCase().includes(q);
      const matchAccount = goal.savingsAccount.toLowerCase().includes(q);
      const matchCreator = goal.createdByName.toLowerCase().includes(q);
      if (!matchName && !matchAccount && !matchCreator) return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    const progA = calculateGoalProgress(a, contributionsByGoal[a.goalId] || [], currentUserUid);
    const progB = calculateGoalProgress(b, contributionsByGoal[b.goalId] || [], currentUserUid);

    switch (options.sortBy) {
      case 'progress-desc':
        return progB.rawPercentage - progA.rawPercentage;
      case 'amount-desc':
        return b.targetAmount - a.targetAmount;
      case 'remaining-desc':
        return progB.remainingAmount - progA.remainingAmount;
      case 'targetDate-asc':
      default:
        return a.targetDate.localeCompare(b.targetDate);
    }
  });

  return filtered;
}
