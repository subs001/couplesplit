import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { Expense, FilterOptions } from '../types';
import { filterExpenses } from '../lib/calculations';
import { formatINR, formatDisplayDate } from '../lib/currency';
import { DynamicIcon } from '../lib/icons';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Trash2,
  Edit2,
  Calendar,
  Tag,
  CreditCard,
  User,
  Plus,
  Receipt,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface TransactionsProps {
  onOpenAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
}

export function Transactions({ onOpenAddExpense, onEditExpense }: TransactionsProps) {
  const { user, userProfile } = useAuth();
  const { partnerProfile, expenses, categories, paymentMethods, deleteExpense } = useAccount();

  const currentUserUid = user?.uid || '';
  const currentUserName = userProfile?.displayName?.split(' ')[0] || 'You';
  const partnerName = partnerProfile?.displayName?.split(' ')[0] || 'Partner';

  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    timeFilter: 'all',
    paidBy: 'all',
    categoryId: 'all',
    paymentMethodId: 'all',
    splitType: 'all',
    sortBy: 'date-desc',
  });

  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter and sort expenses
  const filteredList = useMemo(() => {
    return filterExpenses(expenses, currentUserUid, filters);
  }, [expenses, currentUserUid, filters]);

  const handleDelete = async (expenseId: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      setDeletingId(expenseId);
      try {
        await deleteExpense(expenseId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.timeFilter !== 'all' ||
    filters.paidBy !== 'all' ||
    filters.categoryId !== 'all' ||
    filters.paymentMethodId !== 'all' ||
    filters.splitType !== 'all' ||
    filters.sortBy !== 'date-desc';

  const resetFilters = () => {
    setFilters({
      searchQuery: '',
      timeFilter: 'all',
      paidBy: 'all',
      categoryId: 'all',
      paymentMethodId: 'all',
      splitType: 'all',
      sortBy: 'date-desc',
    });
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredList.length === 0) return;
    const headers = ['Date', 'Title', 'Amount', 'Category', 'Payment Method', 'Paid By', 'Split Type', 'Location'];
    const rows = filteredList.map((e) => [
      e.expenseDate,
      `"${e.title.replace(/"/g, '""')}"`,
      e.amount,
      `"${e.categoryName}"`,
      `"${e.paymentMethodName}"`,
      `"${e.paidByName}"`,
      e.splitType,
      `"${(e.location || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DuoSpend_Expenses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Expense History</h1>
          <p className="text-xs text-muted mt-0.5">
            Showing {filteredList.length} of {expenses.length} total expenses
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={exportToCSV}
            disabled={filteredList.length === 0}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border border-app bg-surface hover:bg-surface-subtle text-xs font-semibold text-muted hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            title="Download CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={onOpenAddExpense}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Search and Quick Filters Bar */}
      <div className="p-4 rounded-3xl border bg-surface border-app shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-muted" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              placeholder="Search expenses, places, categories..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-app bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters({ ...filters, searchQuery: '' })}
                className="absolute right-2.5 top-2 text-muted hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Toggle Advanced Filters Button */}
          <button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              showFiltersPanel || hasActiveFilters
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                : 'border-app hover:bg-surface-subtle text-muted'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            )}
          </button>
        </div>

        {/* Collapsible Filter Panel */}
        {showFiltersPanel && (
          <div className="pt-3 border-t border-app grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 animate-in fade-in text-xs">
            {/* Time Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-1">Time</label>
              <select
                value={filters.timeFilter}
                onChange={(e) => setFilters({ ...filters, timeFilter: e.target.value as any })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-app bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Past 7 Days</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Paid By Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-1">Paid By</label>
              <select
                value={filters.paidBy}
                onChange={(e) => setFilters({ ...filters, paidBy: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-app bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">Everyone</option>
                <option value="me">Paid by You</option>
                <option value="partner">Paid by {partnerName}</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-1">Category</label>
              <select
                value={filters.categoryId}
                onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-app bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-1">Payment Method</label>
              <select
                value={filters.paymentMethodId}
                onChange={(e) => setFilters({ ...filters, paymentMethodId: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-app bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Methods</option>
                {paymentMethods.map((pm) => (
                  <option key={pm.paymentMethodId} value={pm.paymentMethodId}>
                    {pm.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Split Type Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-1">Split Type</label>
              <select
                value={filters.splitType}
                onChange={(e) => setFilters({ ...filters, splitType: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-app bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Splits</option>
                <option value="equal">Equal (50/50)</option>
                <option value="personal">Personal</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-app bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                <option value="date-desc">Date (Newest)</option>
                <option value="date-asc">Date (Oldest)</option>
                <option value="amount-desc">Amount (Highest)</option>
                <option value="amount-asc">Amount (Lowest)</option>
              </select>
            </div>

            {/* Custom Date Range Picker */}
            {filters.timeFilter === 'custom' && (
              <div className="col-span-2 sm:col-span-4 flex items-center gap-2 pt-2">
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="px-2.5 py-1.5 rounded-lg border border-app text-xs bg-surface"
                />
                <span className="text-muted">to</span>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="px-2.5 py-1.5 rounded-lg border border-app text-xs bg-surface"
                />
              </div>
            )}

            {/* Reset Filters */}
            {hasActiveFilters && (
              <div className="col-span-2 sm:col-span-4 lg:col-span-6 flex justify-end">
                <button
                  onClick={resetFilters}
                  className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expenses List */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border bg-surface border-app">
          <Receipt className="w-12 h-12 mx-auto text-muted opacity-30 mb-3" />
          <h3 className="text-sm font-bold">No Expenses Found</h3>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'No transactions match the selected filters. Try broadening your search or resetting filters.'
              : 'Start tracking shared finances with your partner by recording your first expense!'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={resetFilters}
              className="mt-4 px-4 py-2 rounded-xl border border-app text-xs font-semibold cursor-pointer hover:bg-surface-subtle"
            >
              Reset Filters
            </button>
          ) : (
            <button
              onClick={onOpenAddExpense}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((expense) => {
            const isPaidByMe = expense.paidBy === currentUserUid;
            const cat = categories.find((c) => c.categoryId === expense.categoryId);
            const catColor = cat?.colour || '#6366F1';
            const catIcon = cat?.icon || 'Tag';

            // Split breakdown text
            let splitText = 'Equal Split (50/50)';
            if (expense.splitType === 'personal') {
              splitText = isPaidByMe ? 'Personal (100% You)' : `Personal (100% ${expense.paidByName})`;
            } else if (expense.splitType === 'custom' && expense.splitDetails) {
              const d = expense.splitDetails;
              const u1Amt = d.user1Uid === currentUserUid ? d.user1Amount : d.user2Amount;
              const u2Amt = d.user1Uid === currentUserUid ? d.user2Amount : d.user1Amount;
              splitText = `Custom: You ${formatINR(u1Amt)}, ${partnerName} ${formatINR(u2Amt)}`;
            }

            return (
              <div
                key={expense.expenseId}
                className="p-4 rounded-2xl border bg-surface border-app shadow-xs hover:border-indigo-200 dark:hover:border-indigo-900 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                {/* Left section: Icon, Title, Meta */}
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs mt-0.5"
                    style={{ backgroundColor: `${catColor}20`, color: catColor }}
                  >
                    <DynamicIcon name={catIcon} className="w-5 h-5" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {expense.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-2.5 text-xs text-muted mt-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {formatDisplayDate(expense.expenseDate)}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                        <User className="w-3 h-3 text-muted" />
                        {isPaidByMe ? 'Paid by You' : `Paid by ${expense.paidByName}`}
                      </span>
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded-md bg-surface-subtle font-medium text-[11px]">
                        {expense.paymentMethodName}
                      </span>
                      {expense.location && (
                        <>
                          <span>•</span>
                          <span className="text-[11px]">{expense.location}</span>
                        </>
                      )}
                    </div>

                    <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                      {splitText}
                    </div>
                  </div>
                </div>

                {/* Right section: Amount, Action buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-app">
                  <div className="text-left sm:text-right">
                    <div className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                      {formatINR(expense.amount)}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted">
                      {expense.categoryName}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditExpense(expense)}
                      title="Edit Expense"
                      className="p-2 rounded-xl hover:bg-surface-subtle text-muted hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(expense.expenseId, expense.title)}
                      disabled={deletingId === expense.expenseId}
                      title="Delete Expense"
                      className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-muted hover:text-red-600 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
