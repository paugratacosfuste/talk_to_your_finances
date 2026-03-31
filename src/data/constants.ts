// ============================================================
// Application-wide constants for "Talk to Your Finances"
// P1 (Sean) owns this file. All team members may import from it.
// ============================================================

import type { Category } from '@/types';

// --------------- Core Config ---------------

/** Seed value used for deterministic random data generation */
export const SEED = 42;

/** Default display currency */
export const DEFAULT_CURRENCY = 'USD';

/** Date range that matches the CSV training dataset */
export const DATE_RANGE = {
  start: '2020-01-01',
  end: '2020-04-30',
} as const;

// --------------- Categories ---------------

/** Full list of valid transaction categories */
export const CATEGORIES: Category[] = [
  'Groceries',
  'Restaurants',
  'Transport',
  'Subscriptions',
  'Rent',
  'Entertainment',
  'Health',
  'Shopping',
  'Utilities',
  'Income',
  'Transfer',
  'Other',
];

/** Mapping of each category to a relevant emoji for UI display */
export const CATEGORY_EMOJI: Record<Category, string> = {
  Groceries: '🛒',
  Restaurants: '🍽️',
  Transport: '🚗',
  Subscriptions: '📱',
  Rent: '🏠',
  Entertainment: '🎬',
  Health: '💊',
  Shopping: '🛍️',
  Utilities: '💡',
  Income: '💰',
  Transfer: '🔄',
  Other: '📦',
};

// --------------- Chat Feature ---------------

/** Hardcoded suggested questions shown in the chat UI */
export const SUGGESTED_QUESTIONS: string[] = [
  'What did I spend most on last month?',
  'How much did I spend on restaurants in January?',
  'What are my top 5 merchants by total spend?',
  'Am I spending more or less than last month?',
  'What subscriptions am I paying for?',
];
