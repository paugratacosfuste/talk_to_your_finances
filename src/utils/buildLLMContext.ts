// ============================================================
// LLM context builder for "Talk to Your Finances"
// Compresses the full dataset into a concise system prompt for Claude.
// P1 (Sean) owns this file.
// ============================================================

import type { Transaction, UserProfile } from '@/types';
import {
  sumByCategory,
  getTopMerchants,
  getTotalSpent,
  getTotalIncome,
  formatCurrency,
} from '@/utils/dataUtils';

// --------------- Types ---------------

interface BuildLLMContextInput {
  transactions: Transaction[];
  profile: UserProfile;
}

// --------------- Helpers ---------------

/** Groups transactions by 'YYYY-MM' and returns a spend summary per month. */
function getMonthlyCategorySummary(transactions: Transaction[]): string {
  const debitsByMonth: Record<string, Transaction[]> = {};

  for (const t of transactions) {
    if (t.type !== 'debit') continue;
    const month = t.date.slice(0, 7);
    if (!debitsByMonth[month]) debitsByMonth[month] = [];
    debitsByMonth[month].push(t);
  }

  const months = Object.keys(debitsByMonth).sort();
  // Limit to the 6 most recent months to stay under token budget
  const recentMonths = months.slice(-6);

  return recentMonths
    .map((month) => {
      const monthTxns = debitsByMonth[month];
      const byCat = sumByCategory(monthTxns);
      const top = Object.entries(byCat)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, amt]) => `  ${cat}: ${formatCurrency(amt)}`)
        .join('\n');
      const total = Object.values(byCat).reduce((s, v) => s + v, 0);
      return `${month} (total spent: ${formatCurrency(total)})\n${top}`;
    })
    .join('\n\n');
}

// --------------- Main exported function ---------------

/**
 * Compresses the full financial dataset into a system prompt string for Claude.
 * Target: under ~2000 tokens. All heavy data is summarised, not dumped verbatim.
 */
export function buildLLMContext(data: BuildLLMContextInput): string {
  const { transactions, profile } = data;

  if (!transactions.length) {
    return 'You are a personal finance assistant. No transaction data is available yet.';
  }

  const totalSpent = getTotalSpent(transactions);
  const totalIncome = getTotalIncome(transactions);
  const topMerchants = getTopMerchants(transactions, 5);
  const allDates = transactions.map((t) => t.date).sort();
  const dateRangeStart = allDates[0];
  const dateRangeEnd = allDates[allDates.length - 1];
  const recentTxns = [...transactions].slice(-10);

  const merchantLines = topMerchants
    .map((m) => `  ${m.merchant}: ${formatCurrency(m.total)} (${m.count} transactions)`)
    .join('\n');

  const recentTxnLines = recentTxns
    .map(
      (t) =>
        `  ${t.date} | ${t.merchant ?? t.description} | ${t.type === 'debit' ? '-' : '+'}${formatCurrency(t.amount)} | ${t.category}`
    )
    .join('\n');

  const monthlySummary = getMonthlyCategorySummary(transactions);

  return `PERSONA
You are a smart, witty, and empathetic personal finance assistant for ${profile.name}.
You have full access to their transaction history and can answer detailed questions about
their spending, income, habits, and financial health. Be concise, helpful, and occasionally
add a touch of humour — but keep financial advice realistic and grounded.

USER PROFILE
Name: ${profile.name}
Account (last 4): ${profile.accountNumber}
Current Balance: ${formatCurrency(profile.currentBalance, profile.currency)}
Currency: ${profile.currency}

DATASET OVERVIEW
Date Range: ${dateRangeStart} to ${dateRangeEnd}
Total Transactions: ${transactions.length}
Total Spent (debits): ${formatCurrency(totalSpent)}
Total Income (credits): ${formatCurrency(totalIncome)}
Net: ${formatCurrency(totalIncome - totalSpent)}

TOP 5 MERCHANTS BY SPEND
${merchantLines}

MONTHLY SPENDING SUMMARY (last 6 months, top 5 categories each)
${monthlySummary}

RECENT 10 TRANSACTIONS
${recentTxnLines}

INSTRUCTIONS
- Answer questions based only on the data above.
- When giving amounts, always format them as currency (e.g. $1,234.56).
- If asked about a time period outside the data range, say so clearly.
- For the "What If" simulation feature, project balances over 30 days.
- For the "Roast Me" feature, be playfully harsh but kind at heart.
- For the "Financial Diary" feature, write in first-person narrative style.
`;
}
