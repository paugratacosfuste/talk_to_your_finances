// ============================================================
// Data utility functions for "Talk to Your Finances"
// Pure functions — no side effects. Safe to call from any context.
// P1 (Sean) owns this file.
// ============================================================

import type { Transaction } from '@/types';
import { DEFAULT_CURRENCY } from '@/data/constants';

// --------------- filterByDate ---------------

/**
 * Returns transactions where the date falls within [startDate, endDate] (inclusive).
 * Dates should be ISO strings: 'YYYY-MM-DD'.
 */
export function filterByDate(
  transactions: Transaction[],
  startDate: string,
  endDate: string
): Transaction[] {
  if (!transactions.length) return [];
  return transactions.filter((t) => t.date >= startDate && t.date <= endDate);
}

// --------------- sumByCategory ---------------

/**
 * Returns total spend per category for debit transactions only.
 * Result keys are category strings; values are total amounts (positive numbers).
 */
export function sumByCategory(transactions: Transaction[]): Record<string, number> {
  if (!transactions.length) return {};
  return transactions
    .filter((t) => t.type === 'debit')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount;
      return acc;
    }, {});
}

// --------------- getTopMerchants ---------------

/**
 * Returns the top N merchants by total spend (debit transactions only),
 * sorted descending by total amount.
 */
export function getTopMerchants(
  transactions: Transaction[],
  n: number
): Array<{ merchant: string; total: number; count: number }> {
  if (!transactions.length || n <= 0) return [];

  const map = transactions
    .filter((t) => t.type === 'debit' && t.merchant)
    .reduce<Record<string, { total: number; count: number }>>((acc, t) => {
      const key = t.merchant as string;
      if (!acc[key]) acc[key] = { total: 0, count: 0 };
      acc[key].total += t.amount;
      acc[key].count += 1;
      return acc;
    }, {});

  return Object.entries(map)
    .map(([merchant, { total, count }]) => ({ merchant, total, count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

// --------------- getSpendingTrend ---------------

/**
 * Returns time-series spend data (debits only) grouped by the given period.
 * - 'daily'   → label: 'YYYY-MM-DD'
 * - 'weekly'  → label: 'YYYY-WNN' (ISO week number)
 * - 'monthly' → label: 'YYYY-MM'
 */
export function getSpendingTrend(
  transactions: Transaction[],
  period: 'daily' | 'weekly' | 'monthly'
): Array<{ label: string; amount: number }> {
  if (!transactions.length) return [];

  const debits = transactions.filter((t) => t.type === 'debit');

  const getLabel = (dateStr: string): string => {
    if (period === 'daily') return dateStr;
    if (period === 'monthly') return dateStr.slice(0, 7); // 'YYYY-MM'
    // Weekly: compute ISO week number
    const d = new Date(dateStr + 'T00:00:00');
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
  };

  const map = debits.reduce<Record<string, number>>((acc, t) => {
    const label = getLabel(t.date);
    acc[label] = (acc[label] ?? 0) + t.amount;
    return acc;
  }, {});

  return Object.entries(map)
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// --------------- formatCurrency ---------------

/**
 * Formats a number as a currency string.
 * e.g. 1234.56 → '$1,234.56'
 * Defaults to USD.
 */
export function formatCurrency(amount: number, currency: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// --------------- getBalanceHistory ---------------

/**
 * Returns one balance data point per day — the last balance recorded that day.
 * Useful for rendering balance-over-time charts.
 */
export function getBalanceHistory(
  transactions: Transaction[]
): Array<{ date: string; balance: number }> {
  if (!transactions.length) return [];

  // transactions are sorted ascending by date; take the last entry per day
  const map = transactions.reduce<Record<string, number>>((acc, t) => {
    acc[t.date] = t.balance; // overwrite with each new transaction for that day
    return acc;
  }, {});

  return Object.entries(map)
    .map(([date, balance]) => ({ date, balance }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// --------------- getTotalSpent ---------------

/**
 * Returns the sum of all debit transaction amounts.
 */
export function getTotalSpent(transactions: Transaction[]): number {
  if (!transactions.length) return 0;
  return transactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
}

// --------------- getTotalIncome ---------------

/**
 * Returns the sum of all credit transaction amounts.
 */
export function getTotalIncome(transactions: Transaction[]): number {
  if (!transactions.length) return 0;
  return transactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
}
