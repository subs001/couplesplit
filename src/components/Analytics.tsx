import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { useTheme } from '../context/ThemeContext';
import { computeFinancialSummary } from '../lib/calculations';
import { formatINR } from '../lib/currency';
import { DynamicIcon } from '../lib/icons';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  Calendar,
  PieChart as PieIcon,
  BarChart2,
  TrendingUp,
  Layers,
  CreditCard,
  User,
  Percent,
} from 'lucide-react';

export function Analytics() {
  const { user, userProfile } = useAuth();
  const { partnerProfile, expenses, categories, paymentMethods } = useAccount();
  const { chartColors, isDark } = useTheme();

  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const currentUserUid = user?.uid || '';
  const currentUserName = userProfile?.displayName?.split(' ')[0] || 'You';
  const partnerUid = partnerProfile?.uid || 'partner_placeholder';
  const partnerName = partnerProfile?.displayName?.split(' ')[0] || 'Partner';

  // 1. Filter expenses based on selected timeRange
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => {
      if (!e.expenseDate) return false;
      const d = new Date(e.expenseDate + 'T00:00:00');

      if (timeRange === 'weekly') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      if (timeRange === 'monthly') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (timeRange === 'yearly') {
        return d.getFullYear() === now.getFullYear();
      }
      if (timeRange === 'custom') {
        if (customStart && e.expenseDate < customStart) return false;
        if (customEnd && e.expenseDate > customEnd) return false;
      }
      return true;
    });
  }, [expenses, timeRange, customStart, customEnd]);

  // 2. Financial Summary for the period
  const periodSummary = useMemo(() => {
    return computeFinancialSummary(
      filteredExpenses,
      currentUserUid,
      currentUserName,
      partnerUid,
      partnerName
    );
  }, [filteredExpenses, currentUserUid, currentUserName, partnerUid, partnerName]);

  // 3. Category Breakdown Data
  const categoryData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string; count: number }>();
    filteredExpenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      const cat = categories.find((c) => c.categoryId === e.categoryId);
      const name = cat?.name || e.categoryName || 'Other';
      const color = cat?.colour || '#6366F1';

      const existing = map.get(name);
      if (existing) {
        existing.value += amt;
        existing.count += 1;
      } else {
        map.set(name, { name, value: amt, color, count: 1 });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [filteredExpenses, categories]);

  // 4. Payment Method Breakdown Data
  const paymentMethodData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; count: number }>();
    filteredExpenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      const name = e.paymentMethodName || 'Other';
      const existing = map.get(name);
      if (existing) {
        existing.value += amt;
        existing.count += 1;
      } else {
        map.set(name, { name, value: amt, count: 1 });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  // 5. Person-wise Comparison
  const personComparison = useMemo(() => {
    return [
      {
        person: currentUserName,
        'Amount Paid': periodSummary.user1Paid,
        'Attributed Share': periodSummary.user1AttributedShare,
        'Personal Expenses': periodSummary.user1PersonalTotal,
      },
      {
        person: partnerName,
        'Amount Paid': periodSummary.user2Paid,
        'Attributed Share': periodSummary.user2AttributedShare,
        'Personal Expenses': periodSummary.user2PersonalTotal,
      },
    ];
  }, [periodSummary, currentUserName, partnerName]);

  // 6. Timeline Trend Data (Daily or Monthly aggregated)
  const timelineData = useMemo(() => {
    const map = new Map<string, { date: string; amount: number; user1: number; user2: number }>();

    // Sort chronologically ascending
    const chronological = [...filteredExpenses].sort((a, b) =>
      a.expenseDate.localeCompare(b.expenseDate)
    );

    chronological.forEach((e) => {
      const dateKey = e.expenseDate;
      const amt = Number(e.amount) || 0;
      const isU1 = e.paidBy === currentUserUid;

      const existing = map.get(dateKey);
      if (existing) {
        existing.amount += amt;
        if (isU1) existing.user1 += amt;
        else existing.user2 += amt;
      } else {
        map.set(dateKey, {
          date: dateKey,
          amount: amt,
          user1: isU1 ? amt : 0,
          user2: isU1 ? 0 : amt,
        });
      }
    });

    return Array.from(map.values());
  }, [filteredExpenses, currentUserUid]);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header & Time Scope Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Financial Analytics</h1>
          <p className="text-xs text-muted mt-0.5">
            Spending breakdowns, split attribution, and timeline trends
          </p>
        </div>

        {/* Time Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface border border-app text-xs font-semibold">
          <button
            onClick={() => setTimeRange('weekly')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              timeRange === 'weekly'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeRange('monthly')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              timeRange === 'monthly'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setTimeRange('yearly')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              timeRange === 'yearly'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Yearly
          </button>
          <button
            onClick={() => setTimeRange('custom')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              timeRange === 'custom'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {/* Custom Date Range Selector if custom is active */}
      {timeRange === 'custom' && (
        <div className="p-4 rounded-2xl bg-surface border border-app flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-muted">Select Date Range:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-app bg-transparent"
          />
          <span className="text-muted">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-app bg-transparent"
          />
        </div>
      )}

      {/* Period Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border bg-surface border-app shadow-xs">
          <span className="text-[11px] font-semibold text-muted uppercase">Period Spend</span>
          <div className="text-xl sm:text-2xl font-black mt-1">
            {formatINR(periodSummary.totalExpenditure)}
          </div>
          <span className="text-[11px] text-muted">{filteredExpenses.length} transactions</span>
        </div>

        <div className="p-4 rounded-2xl border bg-surface border-app shadow-xs">
          <span className="text-[11px] font-semibold text-muted uppercase">{currentUserName}'s Share</span>
          <div className="text-xl sm:text-2xl font-black mt-1 text-indigo-600 dark:text-indigo-400">
            {formatINR(periodSummary.user1AttributedShare)}
          </div>
          <span className="text-[11px] text-muted">Paid: {formatINR(periodSummary.user1Paid)}</span>
        </div>

        <div className="p-4 rounded-2xl border bg-surface border-app shadow-xs">
          <span className="text-[11px] font-semibold text-muted uppercase">{partnerName}'s Share</span>
          <div className="text-xl sm:text-2xl font-black mt-1 text-rose-600 dark:text-rose-400">
            {formatINR(periodSummary.user2AttributedShare)}
          </div>
          <span className="text-[11px] text-muted">Paid: {formatINR(periodSummary.user2Paid)}</span>
        </div>

        <div className="p-4 rounded-2xl border bg-surface border-app shadow-xs">
          <span className="text-[11px] font-semibold text-muted uppercase">Shared vs Personal</span>
          <div className="text-xl sm:text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
            {formatINR(periodSummary.sharedExpenditure)}
          </div>
          <span className="text-[11px] text-muted">
            Personal: {formatINR(periodSummary.user1PersonalTotal + periodSummary.user2PersonalTotal)}
          </span>
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border bg-surface border-app">
          <TrendingUp className="w-12 h-12 mx-auto text-muted opacity-30 mb-2" />
          <h3 className="text-sm font-bold">No Expenses for this Period</h3>
          <p className="text-xs text-muted mt-1">
            Select a different time range or record expenses to view analytics.
          </p>
        </div>
      ) : (
        <>
          {/* Spending Trend Line/Area Chart */}
          <div className="p-6 rounded-3xl border bg-surface border-app shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Spending Trend Over Time</span>
                </h3>
                <p className="text-xs text-muted">Daily spending trajectory for this period</p>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="date" stroke={chartColors.text} fontSize={11} tickLine={false} />
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
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke={chartColors.primary}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#spendGradient)"
                    name="Total Spending"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown Charts Grid: Category vs Person-Wise */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Donut */}
            <div className="p-6 rounded-3xl border bg-surface border-app shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-indigo-600" />
                    <span>Category Breakdown</span>
                  </h3>
                  <p className="text-xs text-muted">Expenditure distributed by category</p>
                </div>
              </div>

              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cat-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => formatINR(Number(val) || 0)}
                      contentStyle={{
                        backgroundColor: chartColors.tooltipBg,
                        borderColor: chartColors.tooltipBorder,
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category ranking list */}
              <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-1">
                {categoryData.map((cat) => {
                  const pct =
                    periodSummary.totalExpenditure > 0
                      ? Math.round((cat.value / periodSummary.totalExpenditure) * 100)
                      : 0;
                  return (
                    <div key={cat.name} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-surface-subtle">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-semibold">{cat.name}</span>
                        <span className="text-muted text-[11px]">({cat.count} bills)</span>
                      </div>
                      <div className="font-bold">
                        <span>{formatINR(cat.value)}</span>
                        <span className="text-muted font-normal ml-1.5 text-[11px]">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Person-wise Comparison Bar Chart */}
            <div className="p-6 rounded-3xl border bg-surface border-app shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-indigo-600" />
                    <span>Person-Wise Comparison</span>
                  </h3>
                  <p className="text-xs text-muted">Paid amount vs Attributed share</p>
                </div>
              </div>

              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={personComparison} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="person" stroke={chartColors.text} fontSize={12} tickLine={false} />
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
                    <Bar dataKey="Amount Paid" fill={chartColors.primary} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Attributed Share" fill={chartColors.secondary} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: chartColors.primary }} />
                  <span className="text-muted font-medium">Amount Paid</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: chartColors.secondary }} />
                  <span className="text-muted font-medium">Attributed Share</span>
                </div>
              </div>

              {/* Net differential note */}
              <div className="mt-4 p-3 rounded-xl bg-surface-subtle text-xs text-muted flex items-center justify-between">
                <span>Net balance for this period:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {periodSummary.netBalanceForUser1 > 0
                    ? `${partnerName} owes ${formatINR(periodSummary.netBalanceForUser1)}`
                    : periodSummary.netBalanceForUser1 < 0
                    ? `You owe ${formatINR(Math.abs(periodSummary.netBalanceForUser1))}`
                    : 'Balanced'}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="p-6 rounded-3xl border bg-surface border-app shadow-xs">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Payment Method Distribution</span>
            </h3>
            <p className="text-xs text-muted mb-4">Volume paid through each payment method</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {paymentMethodData.map((pm, idx) => {
                const pct =
                  periodSummary.totalExpenditure > 0
                    ? Math.round((pm.value / periodSummary.totalExpenditure) * 100)
                    : 0;
                return (
                  <div
                    key={pm.name}
                    className="p-3.5 rounded-2xl border border-app bg-surface-subtle"
                  >
                    <span className="text-xs font-semibold block truncate">{pm.name}</span>
                    <div className="text-base font-extrabold mt-1">{formatINR(pm.value)}</div>
                    <div className="text-[11px] text-muted mt-0.5 flex justify-between">
                      <span>{pm.count} bills</span>
                      <span className="font-semibold">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
