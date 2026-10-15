import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Expense, Member, CATEGORIES, CategoryInfo } from '../types';
import { Search, Plus, Filter, Calendar, Users, Scale, X, ChevronRight, ChevronDown, Star, Trash2 } from 'lucide-react';

interface ExpensesListProps {
  expenses: Expense[];
  currency: string;
  members: Member[];
  categories?: CategoryInfo[];
  onAddClick: () => void;
  onSelectExpense: (expense: Expense) => void;
  onOpenCategoryManager?: () => void;
  onToggleStar?: (expense: Expense) => void;
  onDeleteExpense?: (expense: Expense) => void;
}

interface SwipeableExpenseItemProps {
  item: Expense;
  currency: string;
  members: Member[];
  catInfo: { icon: string; color: string; bgLight: string };
  onSelect: (item: Expense) => void;
  onToggleStar?: (item: Expense) => void;
  onDelete?: (item: Expense) => void;
}

const SWIPE_THRESHOLD = 70; // px to trigger star or delete

const SwipeableExpenseItem: React.FC<SwipeableExpenseItemProps> = ({
  item,
  currency,
  members,
  catInfo,
  onSelect,
  onToggleStar,
  onDelete,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const hasMovedRef = useRef(false);

  const payer = members.find((m) => m.id === item.paidBy);
  const otherMember = members.find((m) => m.id !== item.paidBy);

  let splitLabel = '50/50 Split';
  if (item.splitType === 'common') splitLabel = 'Common';
  else if (item.splitType === 'personal') splitLabel = 'Personal';
  else if (item.splitType === 'split_custom') splitLabel = 'Custom Split';

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting) return;
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    currentXRef.current = touch.clientX;
    isHorizontalSwipeRef.current = null;
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleting) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startXRef.current;
    const dy = touch.clientY - startYRef.current;
    currentXRef.current = touch.clientX;

    // Detect direction on initial movement
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(dx) > 7 || Math.abs(dy) > 7) {
        if (Math.abs(dx) > Math.abs(dy)) {
          isHorizontalSwipeRef.current = true;
        } else {
          isHorizontalSwipeRef.current = false;
        }
      }
    }

    if (isHorizontalSwipeRef.current === true) {
      hasMovedRef.current = true;
      // Damped movement past 110px
      const clamped = dx > 0
        ? (dx > 110 ? 110 + (dx - 110) * 0.25 : dx)
        : (dx < -110 ? -110 + (dx + 110) * 0.25 : dx);
      setOffsetX(clamped);
    }
  };

  const handleTouchEnd = () => {
    if (isDeleting) return;
    setIsDragging(false);

    if (isHorizontalSwipeRef.current === true && hasMovedRef.current) {
      if (offsetX < -SWIPE_THRESHOLD && onDelete) {
        // Swipe Left: Delete
        setIsDeleting(true);
        setTimeout(() => {
          onDelete(item);
        }, 220);
        return;
      } else if (offsetX > SWIPE_THRESHOLD && onToggleStar) {
        // Swipe Right: Star / Unstar
        onToggleStar(item);
      }
    }
    // Snap back
    setOffsetX(0);
    setTimeout(() => {
      hasMovedRef.current = false;
      isHorizontalSwipeRef.current = null;
    }, 150);
  };

  // Mouse / Pointer event handlers for desktop dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isDeleting || e.button !== 0 || e.pointerType === 'touch') return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    currentXRef.current = e.clientX;
    isHorizontalSwipeRef.current = null;
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isDeleting || e.pointerType === 'touch') return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    currentXRef.current = e.clientX;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(dx) > 7 || Math.abs(dy) > 7) {
        isHorizontalSwipeRef.current = Math.abs(dx) > Math.abs(dy);
      }
    }

    if (isHorizontalSwipeRef.current === true) {
      hasMovedRef.current = true;
      const clamped = dx > 0
        ? (dx > 110 ? 110 + (dx - 110) * 0.25 : dx)
        : (dx < -110 ? -110 + (dx + 110) * 0.25 : dx);
      setOffsetX(clamped);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || isDeleting || e.pointerType === 'touch') return;
    setIsDragging(false);

    if (isHorizontalSwipeRef.current === true && hasMovedRef.current) {
      if (offsetX < -SWIPE_THRESHOLD && onDelete) {
        setIsDeleting(true);
        setTimeout(() => {
          onDelete(item);
        }, 220);
        return;
      } else if (offsetX > SWIPE_THRESHOLD && onToggleStar) {
        onToggleStar(item);
      }
    } else if (!hasMovedRef.current) {
      onSelect(item);
    }
    setOffsetX(0);
    setTimeout(() => {
      hasMovedRef.current = false;
      isHorizontalSwipeRef.current = null;
    }, 150);
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
    setOffsetX(0);
    hasMovedRef.current = false;
    isHorizontalSwipeRef.current = null;
  };

  const isSwipingRight = offsetX > 0;
  const isSwipingLeft = offsetX < 0;
  const pastRightThreshold = offsetX > SWIPE_THRESHOLD;
  const pastLeftThreshold = offsetX < -SWIPE_THRESHOLD;

  return (
    <div className="relative overflow-hidden select-none bg-slate-100 dark:bg-slate-800">
      {/* Background action reveal for SWIPE RIGHT: STAR / UNSTAR */}
      {isSwipingRight && (
        <div className={`absolute inset-0 z-0 flex items-center justify-start pl-6 gap-2 text-white font-bold text-xs transition-colors ${
          pastRightThreshold ? 'bg-amber-500 dark:bg-amber-600' : 'bg-amber-400 dark:bg-amber-500'
        }`}>
          <Star className={`w-5 h-5 transition-transform duration-150 ${pastRightThreshold ? 'scale-125' : 'scale-100'} ${item.isStarred ? 'text-white fill-transparent stroke-2' : 'fill-white text-white'}`} />
          <span className="uppercase tracking-wider">
            {item.isStarred ? 'Unstar' : 'Star'}
          </span>
        </div>
      )}

      {/* Background action reveal for SWIPE LEFT: DELETE */}
      {isSwipingLeft && (
        <div className={`absolute inset-0 z-0 flex items-center justify-end pr-6 gap-2 text-white font-bold text-xs transition-colors ${
          pastLeftThreshold ? 'bg-rose-600' : 'bg-rose-500'
        }`}>
          <span className="uppercase tracking-wider">Delete</span>
          <Trash2 className={`w-5 h-5 transition-transform duration-150 ${pastLeftThreshold ? 'scale-125' : 'scale-100'}`} />
        </div>
      )}

      {/* Front Surface Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={(e) => {
          if (hasMovedRef.current || Math.abs(offsetX) > 5) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onSelect(item);
        }}
        style={{
          transform: isDeleting ? 'translateX(-100%)' : `translateX(${offsetX}px)`,
          opacity: isDeleting ? 0 : 1,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out',
        }}
        className="relative z-10 bg-white dark:bg-slate-900 p-3 sm:p-3.5 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800 transition-colors cursor-pointer flex items-center gap-2.5 sm:gap-3 min-w-0 group touch-pan-y"
      >
        {/* 1. Category Icon: Clean fixed avatar */}
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 transition-transform group-hover:scale-105"
          style={{ backgroundColor: catInfo.bgLight }}
        >
          {catInfo.icon}
        </div>

        {/* 2. Text Details: Generous expanded space for full expense name and metadata */}
        <div className="flex-1 min-w-0 pr-1">
          <div
            className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate"
            title={item.description || item.category}
          >
            {item.description || item.category}
          </div>

          {/* Zero-Pill Clean Metadata */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {item.category}
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
            <span>{payer?.name || 'Member'}</span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
            <span>{item.paymentMethod || 'Cash'}</span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
            <span className="font-medium">{splitLabel}</span>
          </div>
        </div>

        {/* 3. Star Column: Dedicated fixed-width slot aligned vertically across all records */}
        <div className="w-8 shrink-0 flex items-center justify-center">
          {onToggleStar && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(item);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                item.isStarred
                  ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  : 'text-slate-300 dark:text-slate-600 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={item.isStarred ? 'Unstar expense (or swipe right)' : 'Star expense (or swipe right)'}
              aria-label={item.isStarred ? 'Unstar expense' : 'Star expense'}
            >
              <Star className={`w-4 h-4 ${item.isStarred ? 'fill-amber-400 text-amber-500' : 'stroke-[1.75]'}`} />
            </button>
          )}
        </div>

        {/* 4. Amount Column: Proportional ~25-30% allocation, eliminating excess blank gap while preserving 6 digits + 2 decimals */}
        <div className="w-[84px] sm:w-[102px] shrink-0 text-right flex flex-col justify-center">
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight whitespace-nowrap tabular-nums leading-tight">
            {currency}
            {item.amount.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          {item.splitType === 'split_equal' && otherMember && (
            <div className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap leading-tight mt-0.5">
              half: {currency}{(item.amount / 2).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          )}
        </div>

        {/* 5. Chevron arrow */}
        <div className="w-3.5 shrink-0 flex items-center justify-center">
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
        </div>
      </div>
    </div>
  );
};

export const ExpensesList: React.FC<ExpensesListProps> = ({
  expenses,
  currency,
  members,
  categories,
  onAddClick,
  onSelectExpense,
  onOpenCategoryManager,
  onToggleStar,
  onDeleteExpense,
}) => {
  const activeCategories = categories && categories.length > 0 ? categories : CATEGORIES;
  const [search, setSearch] = useState('');
  const [selectedPayer, setSelectedPayer] = useState<string>('all');
  const [selectedSplitType, setSelectedSplitType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showStarredOnly, setShowStarredOnly] = useState<boolean>(false);

  // Total count of starred expenses across all
  const starredCount = useMemo(() => {
    return expenses.filter((e) => e.isStarred).length;
  }, [expenses]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // Starred filter
      if (showStarredOnly && !e.isStarred) {
        return false;
      }

      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchDesc = e.description?.toLowerCase().includes(query);
        const matchCat = e.category?.toLowerCase().includes(query);
        const matchNote = e.notes?.toLowerCase().includes(query);
        const matchMethod = e.paymentMethod?.toLowerCase().includes(query);
        if (!matchDesc && !matchCat && !matchNote && !matchMethod) return false;
      }

      // Payer filter
      if (selectedPayer !== 'all' && e.paidBy !== selectedPayer) {
        return false;
      }

      // Split type filter
      if (selectedSplitType !== 'all' && e.splitType !== selectedSplitType) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && e.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [expenses, search, selectedPayer, selectedSplitType, selectedCategory, showStarredOnly]);

  // Group expenses by Date
  const groupedByDate = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yestDate = new Date();
    yestDate.setDate(yestDate.getDate() - 1);
    const yesterday = yestDate.toISOString().split('T')[0];

    const groups: { dateLabel: string; items: Expense[]; dateTotal: number }[] = [];
    const map: Record<string, Expense[]> = {};

    filteredExpenses.forEach((exp) => {
      const d = exp.date || 'Unknown';
      if (!map[d]) map[d] = [];
      map[d].push(exp);
    });

    const sortedDates = Object.keys(map).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach((d) => {
      let dateLabel = d;
      if (d === today) {
        dateLabel = 'Today';
      } else if (d === yesterday) {
        dateLabel = 'Yesterday';
      } else {
        try {
          const parts = d.split('-');
          if (parts.length === 3) {
            const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            dateLabel = parsed.toLocaleDateString('default', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
          }
        } catch {
          dateLabel = d;
        }
      }

      const items = map[d];
      const dateTotal = items.reduce((sum, item) => sum + item.amount, 0);
      groups.push({ dateLabel, items, dateTotal });
    });

    return groups;
  }, [filteredExpenses]);

  const hasActiveFilters =
    search || selectedPayer !== 'all' || selectedSplitType !== 'all' || selectedCategory !== 'all' || showStarredOnly;

  const resetFilters = () => {
    setSearch('');
    setSelectedPayer('all');
    setSelectedSplitType('all');
    setSelectedCategory('all');
    setShowStarredOnly(false);
  };

  const totalFilteredSum = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* Material 3 Search & Filter Card */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        {/* Search Input Bar */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses, store, category, note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Clean Material 3 Filter Chips Row (Zero Scrollbar) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Starred Filter Chip */}
          <button
            onClick={() => setShowStarredOnly(!showStarredOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              showStarredOnly
                ? 'bg-amber-500 text-white font-semibold shadow-xs ring-2 ring-amber-400/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
            }`}
            title="Filter by starred expenses"
          >
            <Star className={`w-3.5 h-3.5 ${showStarredOnly ? 'fill-white text-white' : 'text-amber-500 fill-amber-400'}`} />
            <span>Starred</span>
            {starredCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${showStarredOnly ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold'}`}>
                {starredCount}
              </span>
            )}
          </button>

          {/* Divider */}
          <span className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0 mx-1" />

          {/* All Payers / Members */}
          <button
            onClick={() => setSelectedPayer('all')}
            className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              selectedPayer === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
            }`}
          >
            All Payers
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedPayer(selectedPayer === m.id ? 'all' : m.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                selectedPayer === m.id
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
              }`}
            >
              <span>{m.avatar}</span>
              <span>{m.name}</span>
            </button>
          ))}

          {/* Divider */}
          <span className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0 mx-1" />

          {/* Split Type Chips */}
          <button
            onClick={() => setSelectedSplitType('all')}
            className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              selectedSplitType === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
            }`}
          >
            All Splits
          </button>
          <button
            onClick={() => setSelectedSplitType(selectedSplitType === 'split_equal' ? 'all' : 'split_equal')}
            className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              selectedSplitType === 'split_equal'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
            }`}
          >
            50/50 Split
          </button>
          <button
            onClick={() => setSelectedSplitType(selectedSplitType === 'common' ? 'all' : 'common')}
            className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              selectedSplitType === 'common'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
            }`}
          >
            Common
          </button>
          <button
            onClick={() => setSelectedSplitType(selectedSplitType === 'personal' ? 'all' : 'personal')}
            className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              selectedSplitType === 'personal'
                ? 'bg-purple-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
            }`}
          >
            Personal
          </button>

          {/* Divider */}
          <span className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0 mx-1" />

          {/* Category Dropdown Filter Chip with Matched Font Size */}
          <div className="relative shrink-0 flex items-center">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`filter-chip-select pl-3 pr-7 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700 ${
                selectedCategory !== 'all'
                  ? 'bg-slate-900! text-white! dark:bg-white! dark:text-slate-900! font-semibold shadow-xs'
                  : ''
              }`}
              style={{ fontSize: '12px' }}
            >
              <option value="all">All Categories</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id} className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white">
                  {c.icon} {c.label || c.id}
                </option>
              ))}
            </select>
            <ChevronDown className={`w-3.5 h-3.5 absolute right-2 pointer-events-none transition-colors ${
              selectedCategory !== 'all' ? 'text-white dark:text-slate-900' : 'text-slate-400 dark:text-slate-500'
            }`} />
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline px-2.5 py-1 shrink-0 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Gesture Tip Bar */}
      <div className="flex items-center justify-between px-3 text-[11px] text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1.5">
          <span>👉 Swipe right to star</span>
          <span>·</span>
          <span>👈 Swipe left to delete</span>
        </span>
        {hasActiveFilters && (
          <span className="font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
            {filteredExpenses.length} found ({currency}{totalFilteredSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
          </span>
        )}
      </div>

      {/* Expense Stream / Grouped Items */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">
            {showStarredOnly ? '⭐' : '📝'}
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-slate-200">
            {showStarredOnly
              ? 'No starred expenses'
              : hasActiveFilters
              ? 'No matching expenses'
              : 'No expenses logged yet'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {showStarredOnly
              ? 'Swipe right on any expense in your list to star and bookmark it.'
              : hasActiveFilters
              ? 'Try adjusting your search keywords or clearing active filters.'
              : 'Add your first shared expense to get started with automatic balance tracking.'}
          </p>
          {showStarredOnly ? (
            <button
              onClick={() => setShowStarredOnly(false)}
              className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs rounded-full shadow-xs active:scale-95 transition cursor-pointer"
            >
              View All Expenses
            </button>
          ) : (
            <button
              onClick={onAddClick}
              className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-full shadow-xs active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Expense</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <div key={group.dateLabel} className="space-y-1.5">
              {/* Date Header with subtotal */}
              <div className="flex items-center justify-between px-3 pt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold tracking-wide flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {group.dateLabel}
                </span>
                <span className="tabular-nums font-medium text-slate-600 dark:text-slate-300">
                  {currency}{group.dateTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Transactions Card for this day (Material 3 Tonal Card with Dividers & Swipe gestures) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
                {group.items.map((item) => {
                  const catInfo = activeCategories.find((c) => c.id === item.category) || {
                    icon: '📦',
                    color: '#64748b',
                    bgLight: '#f8fafc',
                  };

                  return (
                    <SwipeableExpenseItem
                      key={item.id}
                      item={item}
                      currency={currency}
                      members={members}
                      catInfo={catInfo}
                      onSelect={onSelectExpense}
                      onToggleStar={onToggleStar}
                      onDelete={onDeleteExpense}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
