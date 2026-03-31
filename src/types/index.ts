// ============================================================
// Central type definitions for "Talk to Your Finances"
// ALL team members import from this file. P1 (Sean) owns it.
// ============================================================

// --------------- Category ---------------

export type Category =
  | 'Groceries'
  | 'Restaurants'
  | 'Transport'
  | 'Subscriptions'
  | 'Rent'
  | 'Entertainment'
  | 'Health'
  | 'Shopping'
  | 'Utilities'
  | 'Income'
  | 'Transfer'
  | 'Other';

// --------------- Transaction ---------------

export interface Transaction {
  id: string;
  date: string; // ISO date string, e.g. '2020-01-15'
  description: string;
  amount: number; // always positive; use `type` to determine direction
  type: 'debit' | 'credit';
  category: Category;
  merchant?: string;
  balance: number; // running balance after this transaction
}

// --------------- UserProfile ---------------

export interface UserProfile {
  name: string;
  accountNumber: string; // last 4 digits only
  currentBalance: number;
  currency: string; // e.g. 'USD'
}

// --------------- ChatMessage ---------------

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO datetime string
}

// --------------- SimulationResult ---------------

export interface SimulationResult {
  analysis: string;
  projectedBalances: Array<{
    date: string;
    withPurchase: number;
    withoutPurchase: number;
  }>;
  warnings: string[];
}

// --------------- RoastResult ---------------

export interface RoastResult {
  roastText: string;
  weekSummary: {
    totalSpent: number;
    topCategory: Category;
    wildestTransaction: string;
  };
}

// --------------- DiaryResult ---------------

export interface DiaryResult {
  narrative: string;
  month: string; // e.g. 'January 2020'
  highlights: string[];
}

// --------------- DashboardData ---------------

export interface DashboardData {
  transactions: Transaction[];
  profile: UserProfile;
  totalSpent: number;
  totalIncome: number;
  topCategories: Record<string, number>;
  recentTransactions: Transaction[];
}

// --------------- Generic API Response ---------------

export interface APIResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}
