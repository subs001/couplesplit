/**
 * Format a number into Indian Rupee representation (₹)
 * Example: 150000 -> ₹1,50,000
 */
export function formatINR(amount: number, options: { decimals?: boolean; showSymbol?: boolean } = {}): string {
  const { decimals = true, showSymbol = true } = options;
  if (isNaN(amount) || amount === null || amount === undefined) {
    return showSymbol ? '₹0' : '0';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals ? (absAmount % 1 !== 0 ? 2 : 0) : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(absAmount);

  const prefix = isNegative ? '-' : '';
  const symbol = showSymbol ? '₹' : '';

  return `${prefix}${symbol}${formatted}`;
}

/**
 * Format ISO or YYYY-MM-DD date to human friendly format
 * e.g., 'Today', 'Yesterday', or '04 Nov 2026'
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const today = new Date();
    const date = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));

    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return dateStr;
  }
}

/**
 * Today as YYYY-MM-DD string in local time
 */
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
