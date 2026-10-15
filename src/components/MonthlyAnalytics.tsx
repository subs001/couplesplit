import React, { useState, useMemo } from 'react';
import { Expense, Member, CATEGORIES, CategoryInfo } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  TrendingUp, 
  PieChart as PieIcon, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download,
  Filter,
  DollarSign,
  Settings2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface MonthlyAnalyticsProps {
  expenses: Expense[];
  currency: string;
  members: Member[];
  categories?: CategoryInfo[];
  onSelectExpense?: (expense: Expense) => void;
  onOpenCategoryManager?: () => void;
}

export const MonthlyAnalytics: React.FC<MonthlyAnalyticsProps> = ({
  expenses,
  currency,
  members,
  categories,
  onSelectExpense,
  onOpenCategoryManager,
}) => {
  // Current selected month: format "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  // Parse Year and Month for display
  const [yearNum, monthNum] = selectedMonth.split('-').map(Number);
  const monthDate = new Date(yearNum, monthNum - 1, 1);
  const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Navigation handlers
  const handlePrevMonth = () => {
    const prev = new Date(yearNum, monthNum - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
    setActiveCategoryFilter(null);
  };

  const handleNextMonth = () => {
    const next = new Date(yearNum, monthNum, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
    setActiveCategoryFilter(null);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    setActiveCategoryFilter(null);
  };

  // Filter expenses for current selected month
  const monthlyExpenses = useMemo(() => {
    return expenses.filter((e) => e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  // Expenses for previous month (to compare)
  const previousMonthStr = useMemo(() => {
    const prev = new Date(yearNum, monthNum - 2, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  }, [yearNum, monthNum]);

  const prevMonthExpenses = useMemo(() => {
    return expenses.filter((e) => e.date.startsWith(previousMonthStr));
  }, [expenses, previousMonthStr]);

  const prevMonthTotal = useMemo(() => {
    return prevMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [prevMonthExpenses]);

  // Calculations for this month
  const totalSpend = useMemo(() => {
    return monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [monthlyExpenses]);

  const memberSpend = useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach((m) => (map[m.id] = 0));
    monthlyExpenses.forEach((e) => {
      map[e.paidBy] = (map[e.paidBy] || 0) + e.amount;
    });
    return map;
  }, [monthlyExpenses, members]);

  const commonSpend = useMemo(() => {
    return monthlyExpenses
      .filter((e) => e.splitType === 'common' || e.splitType === 'split_equal' || e.splitType === 'split_custom')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [monthlyExpenses]);

  const personalSpend = useMemo(() => {
    return monthlyExpenses
      .filter((e) => e.splitType === 'personal')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [monthlyExpenses]);

  // Category breakdown calculation
  const categoryBreakdown = useMemo(() => {
    const catMap: Record<
      string,
      {
        total: number;
        count: number;
        items: Expense[];
        memberShares: Record<string, number>;
      }
    > = {};

    monthlyExpenses.forEach((exp) => {
      const cat = exp.category || 'Miscellaneous';
      if (!catMap[cat]) {
        catMap[cat] = {
          total: 0,
          count: 0,
          items: [],
          memberShares: {},
        };
      }
      catMap[cat].total += exp.amount;
      catMap[cat].count += 1;
      catMap[cat].items.push(exp);
      catMap[cat].memberShares[exp.paidBy] = (catMap[cat].memberShares[exp.paidBy] || 0) + exp.amount;
    });

    const activeCategories = categories && categories.length > 0 ? categories : CATEGORIES;

    const result = Object.entries(catMap).map(([catName, data]) => {
      const catInfo = activeCategories.find((c) => c.id === catName) || {
        id: catName,
        label: catName,
        icon: '📦',
        color: '#64748b',
        bgLight: '#f8fafc',
      };

      const percent = totalSpend > 0 ? (data.total / totalSpend) * 100 : 0;

      const prevCatTotal = prevMonthExpenses
        .filter((e) => e.category === catName)
        .reduce((sum, e) => sum + e.amount, 0);

      const diffFromPrev = prevCatTotal > 0 ? ((data.total - prevCatTotal) / prevCatTotal) * 100 : null;

      return {
        categoryName: catName,
        icon: catInfo.icon,
        color: catInfo.color,
        bgLight: catInfo.bgLight,
        total: data.total,
        count: data.count,
        percent,
        diffFromPrev,
        memberShares: data.memberShares,
        items: data.items,
      };
    });

    return result.sort((a, b) => b.total - a.total);
  }, [monthlyExpenses, totalSpend, prevMonthExpenses, categories]);

  // Compare month total change
  const totalChangePercent = useMemo(() => {
    if (prevMonthTotal === 0) return null;
    return ((totalSpend - prevMonthTotal) / prevMonthTotal) * 100;
  }, [totalSpend, prevMonthTotal]);

  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const dailyAverage = totalSpend / daysInMonth;

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Currency', 'Paid By', 'Split Type', 'Payment Method', 'Notes'];
    const rows = monthlyExpenses.map((e) => {
      const payer = members.find((m) => m.id === e.paidBy)?.name || e.paidBy;
      return [
        `"${e.date}"`,
        `"${e.category}"`,
        `"${e.description.replace(/"/g, '""')}"`,
        e.amount,
        `"${currency}"`,
        `"${payer}"`,
        `"${e.splitType}"`,
        `"${e.paymentMethod}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `expenses_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* Month Navigation Card (Material 3 Surface Bar) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            title="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
              {monthName}
            </span>
          </div>

          <button
            onClick={handleNextMonth}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            title="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCurrentMonth}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
          >
            This Month
          </button>

          {monthlyExpenses.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Download CSV statement"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid (Material 3 Tonal Metric Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Spend */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Spend
          </span>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
            {currency}{totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {totalChangePercent !== null ? (
              <span className={`inline-flex items-center gap-0.5 ${totalChangePercent > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {totalChangePercent > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {Math.abs(totalChangePercent).toFixed(1)}% vs prev
              </span>
            ) : (
              <span>First tracked month</span>
            )}
          </div>
        </div>

        {/* Common vs Personal */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Shared Home Cost
          </span>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
            {currency}{commonSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            Personal: {currency}{personalSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* Partner Contributions */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Payer Split
          </span>
          <div className="mt-1.5 space-y-1">
            {members.map((m) => {
              const spent = memberSpend[m.id] || 0;
              const pct = totalSpend > 0 ? ((spent / totalSpend) * 100).toFixed(0) : '0';
              return (
                <div key={m.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1 truncate">
                    <span>{m.avatar}</span>
                    <span className="truncate max-w-[70px]">{m.name}</span>
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                    {currency}{spent.toLocaleString()} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Pace */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Daily Average
          </span>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
            {currency}{dailyAverage.toFixed(0)} <span className="text-xs font-normal text-slate-400">/ day</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {monthlyExpenses.length} transactions logged
          </div>
        </div>
      </div>

      {monthlyExpenses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">
            📅
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-slate-200">
            No expenses in {monthName}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            You have not recorded any shared costs for this month yet.
          </p>
        </div>
      ) : (
        <>
          {/* Visual Category Distribution Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Category Spending Distribution
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {categoryBreakdown.length} active categories
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
              {categoryBreakdown.map((cat) => (
                <div
                  key={cat.categoryName}
                  style={{
                    width: `${cat.percent}%`,
                    backgroundColor: cat.color,
                  }}
                  className="h-full transition-all hover:opacity-90 cursor-pointer"
                  title={`${cat.categoryName}: ${currency}${cat.total.toFixed(0)} (${cat.percent.toFixed(1)}%)`}
                  onClick={() =>
                    setActiveCategoryFilter(
                      activeCategoryFilter === cat.categoryName ? null : cat.categoryName
                    )
                  }
                />
              ))}
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {categoryBreakdown.map((cat) => (
                <button
                  key={cat.categoryName}
                  onClick={() =>
                    setActiveCategoryFilter(
                      activeCategoryFilter === cat.categoryName ? null : cat.categoryName
                    )
                  }
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition cursor-pointer ${
                    activeCategoryFilter === cat.categoryName
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.icon} {cat.categoryName}</span>
                  <span className="tabular-nums font-semibold">{cat.percent.toFixed(0)}%</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category-by-Category Detailed List (Material 3 Card) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Monthly Spend By Category
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tap any category to view breakdown
                </p>
              </div>

              <div className="flex items-center gap-2">
                {onOpenCategoryManager && (
                  <button
                    onClick={onOpenCategoryManager}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full transition cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Manage</span>
                  </button>
                )}

                {activeCategoryFilter && (
                  <button
                    onClick={() => setActiveCategoryFilter(null)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold px-2 py-1 cursor-pointer"
                  >
                    Show All
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {categoryBreakdown.map((cat) => {
                const isExpanded = activeCategoryFilter === cat.categoryName;

                return (
                  <div
                    key={cat.categoryName}
                    className={`transition-colors ${
                      isExpanded ? 'bg-slate-50/70 dark:bg-slate-800/40' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <div
                      onClick={() =>
                        setActiveCategoryFilter(isExpanded ? null : cat.categoryName)
                      }
                      className="p-3.5 sm:p-4 cursor-pointer flex items-center justify-between gap-3"
                    >
                      {/* Left: Icon, Category Name, Counts */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
                          style={{ backgroundColor: cat.bgLight, color: cat.color }}
                        >
                          {cat.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                              {cat.categoryName}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              ({cat.count} {cat.count === 1 ? 'item' : 'items'})
                            </span>
                          </div>

                          {/* Member who paid snippet */}
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {members.map((m) => {
                              const share = cat.memberShares[m.id] || 0;
                              if (share === 0) return null;
                              return (
                                <span key={m.id} className="tabular-nums">
                                  {m.name}: {currency}{share.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Progress Bar on tablet/desktop */}
                      <div className="flex-1 max-w-xs hidden md:block px-4">
                        <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                          <span>{cat.percent.toFixed(1)}%</span>
                          {cat.diffFromPrev !== null && (
                            <span
                              className={
                                cat.diffFromPrev > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                              }
                            >
                              {cat.diffFromPrev > 0 ? '+' : ''}
                              {cat.diffFromPrev.toFixed(0)}% vs last mo
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${cat.percent}%`,
                              backgroundColor: cat.color,
                            }}
                          />
                        </div>
                      </div>

                      {/* Right: Amount & Chevron */}
                      <div className="flex items-center gap-3 text-right shrink-0">
                        <div>
                          <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
                            {currency}
                            {cat.total.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                            {cat.percent.toFixed(1)}% of month
                          </span>
                        </div>

                        <div className="text-slate-400 dark:text-slate-500">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Drill-down transactions */}
                    {isExpanded && (
                      <div className="px-4 pb-4 sm:px-6 sm:pb-5 pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">
                          Transactions for {cat.categoryName} in {monthName}:
                        </span>
                        {cat.items.map((item) => {
                          const payer = members.find((m) => m.id === item.paidBy);
                          return (
                            <div
                              key={item.id}
                              onClick={() => onSelectExpense && onSelectExpense(item)}
                              className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-400 cursor-pointer transition flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-base shrink-0">{payer?.avatar || '👤'}</span>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                    {item.description || cat.categoryName}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <span>{item.date}</span>
                                    <span>·</span>
                                    <span>{item.paymentMethod}</span>
                                    <span>·</span>
                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                      {item.splitType === 'common'
                                        ? 'Common'
                                        : item.splitType === 'split_equal'
                                        ? '50/50 Split'
                                        : item.splitType === 'personal'
                                        ? 'Personal'
                                        : 'Custom Split'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                                  {currency}{item.amount.toFixed(2)}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {payer?.name}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
