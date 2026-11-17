import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { useTheme } from '../context/ThemeContext';
import { Goal, GoalContribution } from '../types';
import { formatINR, formatDisplayDate } from '../lib/currency';
import {
  calculateGoalProgress,
  calculateGoalsOverview,
  canUserContributeToGoal,
  canUserManageGoal,
  filterAndSortGoals,
  GoalFilterScope,
  GoalSortBy,
} from '../lib/goalCalculations';
import { GoalModal } from './GoalModal';
import { ContributionModal } from './ContributionModal';
import {
  Target,
  Plus,
  Search,
  X,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Lock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  PiggyBank,
} from 'lucide-react';

/**
 * Clean SVG Circular Progress Ring with crisp tabular percentage readout.
 */
function ProgressRing({
  percentage,
  isCompleted,
  primaryColor,
  trackColor,
  size = 64,
  strokeWidth = 6,
}: {
  percentage: number;
  isCompleted: boolean;
  primaryColor: string;
  trackColor: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percentage));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isCompleted ? '#10B981' : primaryColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <span className="text-xs font-extrabold tabular-nums">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    </div>
  );
}

export function Goals() {
  const { user, userProfile } = useAuth();
  const {
    partnerProfile,
    goals,
    contributionsByGoal,
    toggleGoalPrivacy,
    deleteGoal,
    deleteGoalContribution,
  } = useAccount();
  const { chartColors, isDark } = useTheme();

  const currentUserUid = user?.uid || '';
  const currentUserName = userProfile?.displayName?.split(' ')[0] || 'You';
  const partnerUid = partnerProfile?.uid || 'partner_placeholder';
  const partnerName = partnerProfile?.displayName?.split(' ')[0] || 'Partner';

  // Filters & search
  const [scopeFilter, setScopeFilter] = useState<GoalFilterScope>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<GoalSortBy>('targetDate-asc');

  // Modals
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [contribModalGoal, setContribModalGoal] = useState<Goal | null>(null);
  const [editingContrib, setEditingContrib] = useState<GoalContribution | null>(null);

  // Expanded contributions & inline confirmations
  const [expandedGoalIds, setExpandedGoalIds] = useState<Record<string, boolean>>({});
  const [confirmDeleteGoalId, setConfirmDeleteGoalId] = useState<string | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [confirmDeleteContribId, setConfirmDeleteContribId] = useState<string | null>(null);
  const [deletingContribId, setDeletingContribId] = useState<string | null>(null);
  const [togglingPrivacyId, setTogglingPrivacyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const overview = useMemo(
    () => calculateGoalsOverview(goals, contributionsByGoal, currentUserUid, partnerUid),
    [goals, contributionsByGoal, currentUserUid, partnerUid]
  );

  const hasPartnerVisiblePersonalGoals = useMemo(
    () =>
      goals.some(
        (g) => g.scope === 'personal' && !g.isHiddenFromPartner && g.createdBy !== currentUserUid
      ),
    [goals, currentUserUid]
  );

  const filteredGoals = useMemo(
    () =>
      filterAndSortGoals(goals, contributionsByGoal, currentUserUid, {
        scope: scopeFilter,
        searchQuery,
        sortBy,
      }),
    [goals, contributionsByGoal, currentUserUid, scopeFilter, searchQuery, sortBy]
  );

  const trackColor = isDark ? '#23314F' : '#E2E8F0';

  const handleOpenCreateGoal = () => {
    setEditingGoal(null);
    setGoalModalOpen(true);
  };

  const handleOpenEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalModalOpen(true);
  };

  const handleOpenAddContribution = (goal: Goal) => {
    setEditingContrib(null);
    setContribModalGoal(goal);
    setExpandedGoalIds((prev) => ({ ...prev, [goal.goalId]: true }));
  };

  const handleOpenEditContribution = (goal: Goal, contrib: GoalContribution) => {
    setEditingContrib(contrib);
    setContribModalGoal(goal);
  };

  const handleTogglePrivacy = async (goal: Goal) => {
    setActionError(null);
    setTogglingPrivacyId(goal.goalId);
    try {
      await toggleGoalPrivacy(goal.goalId, !goal.isHiddenFromPartner);
    } catch (err: any) {
      setActionError(err.message || 'Could not update goal visibility.');
    } finally {
      setTogglingPrivacyId(null);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    setActionError(null);
    setDeletingGoalId(goalId);
    try {
      await deleteGoal(goalId);
      setConfirmDeleteGoalId(null);
    } catch (err: any) {
      setActionError(err.message || 'Could not delete goal.');
    } finally {
      setDeletingGoalId(null);
    }
  };

  const handleDeleteContribution = async (goalId: string, contributionId: string) => {
    setActionError(null);
    setDeletingContribId(contributionId);
    try {
      await deleteGoalContribution(goalId, contributionId);
      setConfirmDeleteContribId(null);
    } catch (err: any) {
      setActionError(err.message || 'Could not delete contribution.');
    } finally {
      setDeletingContribId(null);
    }
  };

  const toggleExpand = (goalId: string) => {
    setExpandedGoalIds((prev) => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Savings Goals</h1>
          <p className="text-xs text-muted mt-0.5">
            Track shared milestones together and personal targets in one place
          </p>
        </div>

        <button
          onClick={handleOpenCreateGoal}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Savings Overview Hero Card */}
      <div className="p-5 sm:p-6 rounded-3xl border bg-surface border-app shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            <ProgressRing
              percentage={overview.overallPercentage}
              isCompleted={overview.totalGoalsCount > 0 && overview.totalRemaining === 0 && overview.totalTarget > 0}
              primaryColor={chartColors.primary}
              trackColor={trackColor}
              size={84}
              strokeWidth={8}
            />

            <div>
              <div className="text-xs font-semibold text-muted">Total Saved Across Goals</div>
              <div className="flex flex-wrap items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums">
                  {formatINR(overview.totalSaved)}
                </span>
                <span className="text-xs sm:text-sm font-medium text-muted tabular-nums">
                  of {formatINR(overview.totalTarget)} target
                </span>
              </div>
              <div className="text-xs text-muted mt-1.5 flex flex-wrap items-center gap-2 tabular-nums">
                <span>
                  {overview.totalGoalsCount} {overview.totalGoalsCount === 1 ? 'goal' : 'goals'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{overview.completedCount} completed</span>
                {overview.hiddenPersonalCount > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{overview.hiddenPersonalCount} private</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 3-Column Quantitative Split */}
          <div className="grid grid-cols-3 gap-4 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-app md:pl-6 shrink-0">
            <div>
              <div className="text-[11px] font-medium text-muted">Shared Saved</div>
              <div className="text-sm sm:text-base font-extrabold tabular-nums mt-0.5 text-indigo-600 dark:text-indigo-400">
                {formatINR(overview.sharedSaved)}
              </div>
              <div className="text-[11px] text-muted tabular-nums">
                of {formatINR(overview.sharedTarget)}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-muted">Personal Saved</div>
              <div className="text-sm sm:text-base font-extrabold tabular-nums mt-0.5 text-emerald-600 dark:text-emerald-400">
                {formatINR(overview.personalSaved)}
              </div>
              <div className="text-[11px] text-muted tabular-nums">
                of {formatINR(overview.personalTarget)}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-muted">Remaining</div>
              <div className="text-sm sm:text-base font-extrabold tabular-nums mt-0.5">
                {formatINR(overview.totalRemaining)}
              </div>
              <div className="text-[11px] text-muted tabular-nums">
                {overview.overallPercentage}% funded
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Aggregate Visual Bar */}
        <div>
          <div className="h-3 w-full rounded-full overflow-hidden flex bg-surface-subtle">
            {overview.totalTarget > 0 && (
              <>
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (overview.sharedSaved / overview.totalTarget) * 100)}%`,
                    backgroundColor: chartColors.primary,
                  }}
                  title={`Shared Saved: ${formatINR(overview.sharedSaved)}`}
                />
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      Math.max(0, 100 - (overview.sharedSaved / overview.totalTarget) * 100),
                      (overview.personalSaved / overview.totalTarget) * 100
                    )}%`,
                    backgroundColor: chartColors.secondary,
                  }}
                  title={`Personal Saved: ${formatINR(overview.personalSaved)}`}
                />
              </>
            )}
          </div>
          {overview.totalTarget > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted mt-2">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block"
                    style={{ backgroundColor: chartColors.primary }}
                  />
                  <span>Shared ({overview.sharedCount})</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block"
                    style={{ backgroundColor: chartColors.secondary }}
                  />
                  <span>Personal ({overview.personalCount})</span>
                </span>
              </div>
              <span className="font-semibold tabular-nums">
                {overview.overallPercentage}% of total goal amount saved
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-3.5 sm:p-4 rounded-2xl border bg-surface border-app shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Segmented Scope Filter */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-subtle overflow-x-auto">
          <button
            type="button"
            onClick={() => setScopeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[36px] ${
              scopeFilter === 'all'
                ? 'bg-surface shadow-xs text-slate-900 dark:text-white'
                : 'text-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Goals
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('shared')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[36px] ${
              scopeFilter === 'shared'
                ? 'bg-surface shadow-xs text-slate-900 dark:text-white'
                : 'text-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Shared
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('personal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[36px] ${
              scopeFilter === 'personal'
                ? 'bg-surface shadow-xs text-slate-900 dark:text-white'
                : 'text-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            My Personal
          </button>
          {hasPartnerVisiblePersonalGoals && (
            <button
              type="button"
              onClick={() => setScopeFilter('partner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[36px] ${
                scopeFilter === 'partner'
                  ? 'bg-surface shadow-xs text-slate-900 dark:text-white'
                  : 'text-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {partnerName}'s
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 md:max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search goal or savings account..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-app bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-2.5 text-muted hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            aria-label="Sort goals"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as GoalSortBy)}
            className="px-3 py-2 rounded-xl border border-app bg-surface text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
          >
            <option value="targetDate-asc">Target Date</option>
            <option value="progress-desc">Highest Progress</option>
            <option value="amount-desc">Largest Goal</option>
            <option value="remaining-desc">Most Remaining</option>
          </select>
        </div>
      </div>

      {/* Empty States or Goals Grid */}
      {filteredGoals.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border bg-surface border-app">
          <Target className="w-12 h-12 mx-auto text-muted opacity-30 mb-3" />
          <h3 className="text-sm font-bold">
            {goals.length === 0 ? 'No Savings Goals Yet' : 'No Matching Goals'}
          </h3>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            {goals.length === 0
              ? 'Create your first shared or personal goal to visually track savings progress toward upcoming milestones.'
              : 'Try clearing your search query or switching the goal filter tab.'}
          </p>
          {goals.length === 0 ? (
            <button
              onClick={handleOpenCreateGoal}
              className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Goal</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setScopeFilter('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 rounded-xl border border-app text-xs font-semibold cursor-pointer hover:bg-surface-subtle min-h-[40px]"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredGoals.map((goal) => {
            const contribs = contributionsByGoal[goal.goalId] || [];
            const progress = calculateGoalProgress(goal, contribs, currentUserUid, partnerUid);
            const canContribute = canUserContributeToGoal(goal, currentUserUid);
            const canManage = canUserManageGoal(goal, currentUserUid);
            const isCreator = goal.createdBy === currentUserUid;
            const isExpanded = Boolean(expandedGoalIds[goal.goalId]);

            const daysText = progress.isCompleted
              ? 'Target reached'
              : progress.daysRemaining < 0
              ? `${Math.abs(progress.daysRemaining)} days past target`
              : progress.daysRemaining === 0
              ? 'Target date is today'
              : `${progress.daysRemaining} days left`;

            return (
              <article
                key={goal.goalId}
                className="p-5 sm:p-6 rounded-3xl border bg-surface border-app shadow-xs flex flex-col justify-between gap-4"
              >
                {/* Top Header: Ring + Title + Meta + Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <ProgressRing
                      percentage={progress.rawPercentage}
                      isCompleted={progress.isCompleted}
                      primaryColor={
                        goal.scope === 'shared' ? chartColors.primary : chartColors.secondary
                      }
                      trackColor={trackColor}
                      size={60}
                      strokeWidth={6}
                    />

                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold tracking-tight truncate">
                        {goal.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted mt-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {goal.savingsAccount}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Target {formatDisplayDate(goal.targetDate)}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {goal.scope === 'shared'
                            ? 'Shared'
                            : isCreator
                            ? 'Personal (You)'
                            : `Personal (${goal.createdByName.split(' ')[0]})`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Management Actions */}
                  {confirmDeleteGoalId === goal.goalId ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(goal.goalId)}
                        disabled={deletingGoalId === goal.goalId}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-40 min-h-[36px]"
                      >
                        {deletingGoalId === goal.goalId ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteGoalId(null)}
                        disabled={deletingGoalId === goal.goalId}
                        className="px-2.5 py-1.5 rounded-lg border border-app text-[11px] font-medium cursor-pointer min-h-[36px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditGoal(goal)}
                          aria-label={`Edit goal ${goal.name}`}
                          title="Edit Goal"
                          className="p-2 rounded-xl hover:bg-surface-subtle text-muted hover:text-indigo-600 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteGoalId(goal.goalId)}
                          aria-label={`Delete goal ${goal.name}`}
                          title="Delete Goal"
                          className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-muted hover:text-red-600 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  )}
                </div>

                {/* Progress Bar & Numeric Readout */}
                <div className="space-y-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="tabular-nums">
                      <span className="text-lg font-black">{formatINR(progress.totalSaved)}</span>
                      <span className="text-xs text-muted ml-1.5">
                        of {formatINR(goal.targetAmount)}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        progress.isCompleted
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : progress.isOverdue
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-muted'
                      }`}
                    >
                      {progress.isCompleted
                        ? progress.totalSaved > goal.targetAmount
                          ? `+${formatINR(progress.totalSaved - goal.targetAmount)} extra`
                          : '100% Complete'
                        : `${formatINR(progress.remainingAmount)} left`}
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="h-3 w-full rounded-full overflow-hidden flex bg-surface-subtle">
                    {goal.scope === 'shared' ? (
                      <>
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${progress.user1PercentOfTarget}%`,
                            backgroundColor: chartColors.primary,
                          }}
                          title={`${currentUserName}: ${formatINR(progress.user1Contribution)}`}
                        />
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${progress.user2PercentOfTarget}%`,
                            backgroundColor: chartColors.secondary,
                          }}
                          title={`${partnerName}: ${formatINR(progress.user2Contribution)}`}
                        />
                      </>
                    ) : (
                      <div
                        className="h-full transition-all duration-300 rounded-full"
                        style={{
                          width: `${progress.cappedPercentage}%`,
                          backgroundColor: progress.isCompleted
                            ? '#10B981'
                            : chartColors.secondary,
                        }}
                      />
                    )}
                  </div>

                  {/* Contribution Split & Pace Metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted tabular-nums">
                    {goal.scope === 'shared' ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-sm inline-block"
                            style={{ backgroundColor: chartColors.primary }}
                          />
                          <span>
                            {currentUserName}: {formatINR(progress.user1Contribution)}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-sm inline-block"
                            style={{ backgroundColor: chartColors.secondary }}
                          />
                          <span>
                            {partnerName}: {formatINR(progress.user2Contribution)}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <span>
                        {daysText}
                        {progress.requiredMonthlySaving > 0
                          ? ` · ~${formatINR(progress.requiredMonthlySaving)}/mo needed`
                          : ''}
                      </span>
                    )}

                    {goal.scope === 'shared' && (
                      <span>
                        {daysText}
                        {progress.requiredMonthlySaving > 0
                          ? ` · ~${formatINR(progress.requiredMonthlySaving)}/mo`
                          : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Controls: Privacy Toggle + Contribute + View History */}
                <div className="pt-3 border-t border-app flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {goal.scope === 'personal' && isCreator && (
                      <button
                        type="button"
                        onClick={() => handleTogglePrivacy(goal)}
                        disabled={togglingPrivacyId === goal.goalId}
                        aria-pressed={goal.isHiddenFromPartner}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 min-h-[40px] whitespace-nowrap ${
                          goal.isHiddenFromPartner
                            ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'border-app bg-surface-subtle text-muted hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {goal.isHiddenFromPartner ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Hidden from partner</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Shared view</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpand(goal.goalId)}
                      aria-expanded={isExpanded}
                      className="px-3 py-1.5 rounded-xl border border-app bg-surface-subtle hover:bg-surface text-xs font-semibold text-muted hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer min-h-[40px] whitespace-nowrap"
                    >
                      <span>Contributions ({contribs.length})</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {canContribute ? (
                    <button
                      type="button"
                      onClick={() => handleOpenAddContribution(goal)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px] whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Contribute</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted py-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Only {goal.createdByName.split(' ')[0]} can contribute</span>
                    </span>
                  )}
                </div>

                {/* Expandable Contributions Ledger */}
                {isExpanded && (
                  <div className="pt-3 border-t border-app space-y-2">
                    {contribs.length === 0 ? (
                      <div className="py-4 text-center text-xs text-muted">
                        <PiggyBank className="w-6 h-6 mx-auto opacity-30 mb-1" />
                        <span>No contributions logged yet.</span>
                      </div>
                    ) : (
                      <div className="divide-y divide-app">
                        {contribs.map((contrib) => (
                          <div
                            key={contrib.contributionId}
                            className="py-2.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 font-semibold">
                                <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                                  +{formatINR(contrib.amount)}
                                </span>
                                <span aria-hidden="true" className="text-muted">·</span>
                                <span className="truncate">
                                  {contrib.contributedBy === currentUserUid
                                    ? currentUserName
                                    : contrib.contributedByName}
                                </span>
                              </div>
                              <div className="text-[11px] text-muted mt-0.5 truncate">
                                <span>{formatDisplayDate(contrib.date)}</span>
                                {contrib.note && (
                                  <>
                                    <span className="mx-1.5">·</span>
                                    <span>{contrib.note}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {canContribute && (
                              <div className="shrink-0 flex items-center gap-1">
                                {confirmDeleteContribId === contrib.contributionId ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteContribution(goal.goalId, contrib.contributionId)
                                      }
                                      disabled={deletingContribId === contrib.contributionId}
                                      className="px-2 py-1 rounded-lg bg-red-600 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-40 min-h-[32px]"
                                    >
                                      {deletingContribId === contrib.contributionId
                                        ? 'Deleting...'
                                        : 'Delete'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteContribId(null)}
                                      disabled={deletingContribId === contrib.contributionId}
                                      className="px-2 py-1 rounded-lg border border-app text-[11px] font-medium cursor-pointer min-h-[32px]"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditContribution(goal, contrib)}
                                      aria-label={`Edit contribution of ${formatINR(contrib.amount)}`}
                                      title="Modify Contribution"
                                      className="p-2 rounded-lg hover:bg-surface-subtle text-muted hover:text-indigo-600 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConfirmDeleteContribId(contrib.contributionId)
                                      }
                                      aria-label={`Delete contribution of ${formatINR(contrib.amount)}`}
                                      title="Delete Contribution"
                                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-muted hover:text-red-600 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Goal Create / Edit Modal */}
      <GoalModal
        isOpen={goalModalOpen}
        onClose={() => {
          setGoalModalOpen(false);
          setEditingGoal(null);
        }}
        editingGoal={editingGoal}
      />

      {/* Contribution Create / Edit Modal */}
      <ContributionModal
        isOpen={Boolean(contribModalGoal)}
        onClose={() => {
          setContribModalGoal(null);
          setEditingContrib(null);
        }}
        goal={contribModalGoal}
        remainingAmount={
          contribModalGoal
            ? calculateGoalProgress(
                contribModalGoal,
                contributionsByGoal[contribModalGoal.goalId] || [],
                currentUserUid,
                partnerUid
              ).remainingAmount
            : 0
        }
        editingContribution={editingContrib}
      />
    </div>
  );
}
