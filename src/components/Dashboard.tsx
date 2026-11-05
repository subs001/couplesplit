import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { useTheme } from '../context/ThemeContext';
import { computeFinancialSummary } from '../lib/calculations';
import { formatINR, formatDisplayDate } from '../lib/currency';
import { DynamicIcon } from '../lib/icons';
import { SettleUpModal } from './SettleUpModal';
import { PWAInstallButton } from './PWAInstallButton';
import { Expense } from '../types';
import {
  Wallet,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  Receipt,
  Calendar,
  Sparkles,
  TrendingUp,
  Percent,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';

interface DashboardProps {
  onOpenAddExpense: () => void;
  onNavigateToTransactions: () => void;
  onEditExpense: (expense: Expense) => void;
}

export function Dashboard({
  onOpenAddExpense,
  onNavigateToTransactions,
  onEditExpense,
}: DashboardProps) {
  const { user, userProfile } = useAuth();
  const { account, partnerProfile, partnerEmailPending, expenses, categories } = useAccount();
  const { chartColors, isDark } = useTheme();

  const [settleModalOpen, setSettleModalOpen] = useState(false);

  const currentUserUid = user?.uid || '';
  const currentUserName = userProfile?.displayName?.split(' ')[0] || 'You';
  const partnerUid = partnerProfile?.uid || 'partner_placeholder';
  const partnerName = partnerProfile?.displayName?.split(' ')[0] || 'Partner';

  // Compute all metrics
  const summary = computeFinancialSummary(
    expenses,
    currentUserUid,
    currentUserName,
    partnerUid,
    partnerName
  );

  // Current month's expenses
  const now = new Date();
  const thisMonthExpenses = expenses.filter((e) => {
    if (!e.expenseDate) return false;
    const d = new Date(e.expenseDate + 'T00:00:00');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const currentMonthTotal = thisMonthExpenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );

  // Category breakdown for Donut chart
  const categoryMap = new Map<string, { name: string; value: number; color: string }>();
  expenses.forEach((e) => {
    const amt = Number(e.amount) || 0;
    const cat = categories.find((c) => c.categoryId === e.categoryId);
    const catName = cat?.name || e.categoryName || 'Other';
    const color = cat?.colour || '#6366F1';

    const existing = categoryMap.get(catName);
    if (existing) {
      existing.value += amt;
    } else {
      categoryMap.set(catName, { name: catName, value: amt, color });
    }
  });

  const categoryChartData = Array.from(categoryMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Payer comparison data
  const comparisonData = [
    {
      name: currentUserName,
      Paid: summary.user1Paid,
      Share: summary.user1AttributedShare,
    },
    {
      name: partnerName,
      Paid: summary.user2Paid,
      Share: summary.user2AttributedShare,
    },
  ];

  const recentExpenses = expenses.slice(0, 6);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* PWA In-App Install Banner if not installed */}
      <PWAInstallButton variant="banner" />

      {/* Invite Pending Banner if only 1 member */}
      {account && account.memberUids.length === 1 && (
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">
                Waiting for Partner to Connect
              </div>
              <div className="text-xs text-amber-800 dark:text-amber-300">
                {partnerEmailPending
                  ? `Invitation sent to ${partnerEmailPending}. Ask them to sign in with that Google account.`
                  : `Share your 6-digit code (${account.inviteCode}) with your partner so they can connect.`}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(account.inviteCode);
              alert(`Copied Invite Code: ${account.inviteCode}`);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
          >
            Copy Code: {account.inviteCode}
          </button>
        </div>
      )}

      {/* Net Balance & Settlement Banner */}
      <div className="p-6 rounded-3xl border shadow-sm bg-surface border-app relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Net Balance
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {summary.whoOwesWhom.status === 'settled' ? (
              <div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-7 h-7" />
                  <span>All Settled Up</span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Both partners have contributed their fair share. No outstanding debts!
                </p>
              </div>
            ) : summary.whoOwesWhom.status === 'user2_owes_user1' ? (
              <div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <ArrowDownLeft className="w-7 h-7" />
                  <span>{partnerName} owes you {formatINR(summary.whoOwesWhom.amount)}</span>
                </div>
                <p className="text-xs text-muted mt-1">
                  You paid {formatINR(summary.user1Paid)}, but your share was {formatINR(summary.user1AttributedShare)}.
                </p>
              </div>
            ) : (
              <div>
                <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <ArrowUpRight className="w-7 h-7" />
                  <span>You owe {partnerName} {formatINR(summary.whoOwesWhom.amount)}</span>
                </div>
                <p className="text-xs text-muted mt-1">
                  {partnerName} paid {formatINR(summary.user2Paid)}, while your share is {formatINR(summary.user1AttributedShare)}.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setSettleModalOpen(true)}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Settle Up</span>
            </button>
            <button
              onClick={onOpenAddExpense}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Expenditure */}
        <div className="p-5 rounded-2xl border bg-surface border-app shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Spent</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold tracking-tight">
            {formatINR(summary.totalExpenditure)}
          </div>
          <div className="mt-2 text-xs text-muted flex items-center justify-between">
            <span>{summary.totalTransactions} transactions</span>
            <span>Avg {formatINR(summary.averageTransaction)}</span>
          </div>
        </div>

        {/* Card 2: Your Spending (Paid vs Share) */}
        <div className="p-5 rounded-2xl border bg-surface border-app shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{currentUserName}'s Share</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
            {formatINR(summary.user1AttributedShare)}
          </div>
          <div className="mt-2 text-xs text-muted flex items-center justify-between">
            <span>Paid by you: <strong className="text-slate-800 dark:text-slate-200">{formatINR(summary.user1Paid)}</strong></span>
          </div>
        </div>

        {/* Card 3: Partner's Spending (Paid vs Share) */}
        <div className="p-5 rounded-2xl border bg-surface border-app shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{partnerName}'s Share</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
            {formatINR(summary.user2AttributedShare)}
          </div>
          <div className="mt-2 text-xs text-muted flex items-center justify-between">
            <span>Paid by partner: <strong className="text-slate-800 dark:text-slate-200">{formatINR(summary.user2Paid)}</strong></span>
          </div>
        </div>

        {/* Card 4: Current Month Expenditure */}
        <div className="p-5 rounded-2xl border bg-surface border-app shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">This Month</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
            {formatINR(currentMonthTotal)}
          </div>
          <div className="mt-2 text-xs text-muted flex items-center justify-between">
            <span>{thisMonthExpenses.length} bills in {now.toLocaleString('default', { month: 'short' })}</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Donut */}
        <div className="p-6 rounded-3xl border bg-surface border-app shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold">Category Spending</h3>
              <p className="text-xs text-muted">Where your shared funds go</p>
            </div>
            <span className="text-xs font-medium text-muted">Top Categories</span>
          </div>

          {categoryChartData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center text-muted text-xs">
              <Layers className="w-8 h-8 opacity-40 mb-2" />
              <span>No expense records yet to plot</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:w-1/2 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => formatINR(Number(val) || 0)}
                      contentStyle={{
                        backgroundColor: chartColors.tooltipBg,
                        borderColor: chartColors.tooltipBorder,
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: chartColors.text,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full sm:w-1/2 space-y-2">
                {categoryChartData.map((cat) => {
                  const pct =
                    summary.totalExpenditure > 0
                      ? Math.round((cat.value / summary.totalExpenditure) * 100)
                      : 0;
                  return (
                    <div key={cat.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <div className="font-semibold shrink-0">
                        <span>{formatINR(cat.value)}</span>
                        <span className="text-muted ml-1.5 font-normal text-[11px]">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Paid vs Attributed Share Bar Chart */}
        <div className="p-6 rounded-3xl border bg-surface border-app shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold">Contribution vs Fair Share</h3>
              <p className="text-xs text-muted">Amount Paid vs Actual Attributed Share</p>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  stroke={chartColors.text}
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke={chartColors.text}
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip
                  formatter={(val: any) => formatINR(Number(val) || 0)}
                  contentStyle={{
                    backgroundColor: chartColors.tooltipBg,
                    borderColor: chartColors.tooltipBorder,
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="Paid" fill={chartColors.primary} radius={[6, 6, 0, 0]} />
                <Bar dataKey="Share" fill={chartColors.secondary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 mt-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: chartColors.primary }} />
              <span className="text-muted font-medium">Total Paid</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: chartColors.secondary }} />
              <span className="text-muted font-medium">Attributed Share</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="p-6 rounded-3xl border bg-surface border-app shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold">Recent Expenses</h3>
            <p className="text-xs text-muted">Latest updates in your shared account</p>
          </div>
          <button
            onClick={onNavigateToTransactions}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="py-12 text-center text-muted">
            <Receipt className="w-10 h-10 mx-auto opacity-30 mb-2" />
            <p className="text-xs font-medium">No expenses recorded yet.</p>
            <button
              onClick={onOpenAddExpense}
              className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Expense</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-app">
            {recentExpenses.map((expense) => {
              const isPaidByMe = expense.paidBy === currentUserUid;
              const cat = categories.find((c) => c.categoryId === expense.categoryId);
              const catColor = cat?.colour || '#6366F1';
              const catIcon = cat?.icon || 'Tag';

              return (
                <div
                  key={expense.expenseId}
                  onClick={() => onEditExpense(expense)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-surface-subtle/50 px-2 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                      style={{ backgroundColor: `${catColor}20`, color: catColor }}
                    >
                      <DynamicIcon name={catIcon} className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="text-xs font-bold group-hover:text-indigo-600 transition-colors">
                        {expense.title}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted mt-0.5">
                        <span>{formatDisplayDate(expense.expenseDate)}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {isPaidByMe ? 'Paid by You' : `Paid by ${expense.paidByName}`}
                        </span>
                        {expense.location && (
                          <>
                            <span>•</span>
                            <span>{expense.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold">{formatINR(expense.amount)}</div>
                    <div className="text-[10px] text-muted font-medium mt-0.5">
                      {expense.splitType === 'equal'
                        ? 'Equal Split (50%)'
                        : expense.splitType === 'personal'
                        ? 'Personal'
                        : 'Custom Split'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settle Up Modal */}
      <SettleUpModal
        isOpen={settleModalOpen}
        onClose={() => setSettleModalOpen(false)}
        summary={summary}
      />
    </div>
  );
}
