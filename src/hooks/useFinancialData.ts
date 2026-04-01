// ============================================================
// React hook for "Talk to Your Finances"
// Wraps getMockData() and returns a fully computed DashboardData object.
// Safe to call from any client component — data is synchronous.
// P1 (Sean) owns this file.
// ============================================================

import { useMemo } from 'react';
import type { DashboardData } from '@/types';
import { getMockData } from '@/data/mockData';
import {
  getTotalSpent,
  getTotalIncome,
  sumByCategory,
} from '@/utils/dataUtils';

/**
 * Returns the full financial dashboard dataset, derived from the embedded
 * mock transaction data. All computation is memoised — no async/loading state
 * needed because the underlying data is hardcoded.
 *
 * Usage:
 *   const data = useFinancialData();
 *   // data.transactions, data.profile, data.totalSpent, ...
 */
export function useFinancialData(): DashboardData {
  const { transactions, profile } = getMockData();

  const dashboardData = useMemo<DashboardData>(() => {
    const totalSpent = getTotalSpent(transactions);
    const totalIncome = getTotalIncome(transactions);
    const topCategories = sumByCategory(transactions);
    // Most recent 10 transactions (data is already sorted ascending, so take from end)
    const recentTransactions = transactions.slice(-10);

    return {
      transactions,
      profile,
      totalSpent,
      totalIncome,
      topCategories,
      recentTransactions,
    };
  }, [transactions, profile]);

  return dashboardData;
}
