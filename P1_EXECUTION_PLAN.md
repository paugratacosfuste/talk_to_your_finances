# P1 Execution Plan — Sean (Foundation & Data Layer)

> Each step below is designed to be run in its own Cowork session.
> Before starting each step, paste the provided **Context Prompt** into a fresh terminal.
> Steps must be run **in order** — each one depends on the previous.

---

## Prerequisites (read before starting)

- Your workspace folder contains:
  - `PROJECT_BIBLE.md` — the source of truth
  - `transactions_training_data_ ktrapeznikov.csv` — the raw dataset
- All files should be saved to the **same folder** (the workspace folder).
- You need an Anthropic API key for Step 6.

---

## STEP 1 — Project Scaffolding

**What this does:** Creates the Next.js project skeleton — `package.json`, `tsconfig.json`, `next.config.js`, `.gitignore`, and `.env.example`. Nothing smart yet, just the project wiring.

**Context Prompt to paste:**
```
I am P1 (Sean) building the foundation layer for a Next.js + TypeScript + Tailwind project called "Talk to Your Finances".

Read PROJECT_BIBLE.md in my folder for full context.

Your task for this session:
Create the following files in my workspace folder:
1. package.json — include Next.js 14, React 18, TypeScript, Tailwind CSS, and @anthropic-ai/sdk as dependencies
2. tsconfig.json — standard Next.js TypeScript config with strict mode and path aliases (@/* maps to ./src/*)
3. next.config.js — minimal Next.js config
4. .gitignore — standard Next.js gitignore (include .env.local)
5. .env.example — with a single entry: ANTHROPIC_API_KEY=your_key_here
6. postcss.config.js — standard Tailwind postcss config

Do not create any src/ files yet. Just the root config files.
```

**Output files:** `package.json`, `tsconfig.json`, `next.config.js`, `.gitignore`, `.env.example`, `postcss.config.js`

---

## STEP 2 — TypeScript Types

**What this does:** Creates `src/types/index.ts` — the single file every other team member imports from. This needs to be correct and complete before anything else.

**Context Prompt to paste:**
```
I am P1 (Sean) building the foundation layer for a Next.js + TypeScript + Tailwind project called "Talk to Your Finances".

Read PROJECT_BIBLE.md in my folder for full context.

Your task for this session:
Create src/types/index.ts with the following TypeScript interfaces and types:

- Transaction: { id, date (string), description, amount (number), type ('debit'|'credit'), category (Category), merchant, balance (number) }
- Category: enum or union type covering: Groceries, Restaurants, Transport, Subscriptions, Rent, Entertainment, Health, Shopping, Utilities, Income, Transfer, Other
- UserProfile: { name, accountNumber (last 4 digits), currentBalance, currency (string) }
- ChatMessage: { role ('user'|'assistant'), content (string), timestamp (string) }
- SimulationResult: { analysis (string), projectedBalances: Array<{ date, withPurchase, withoutPurchase }>, warnings: string[] }
- RoastResult: { roastText (string), weekSummary: { totalSpent, topCategory, wildestTransaction } }
- DiaryResult: { narrative (string), month (string), highlights: string[] }
- DashboardData: { transactions, profile, totalSpent, totalIncome, topCategories: Record<Category, number>, recentTransactions }
- APIResponse<T>: { data?: T, error?: string, success (boolean) }

Make all fields that could be missing optional where it makes sense.
```

**Output files:** `src/types/index.ts`

---

## STEP 3 — Constants

**What this does:** Creates `src/data/constants.ts` — the SEED value, category definitions, date range config, and currency setting. Small file but referenced everywhere.

**Context Prompt to paste:**
```
I am P1 (Sean) building the foundation layer for a Next.js + TypeScript project called "Talk to Your Finances".

Read PROJECT_BIBLE.md in my folder for full context.
Also read src/types/index.ts which was already created.

Your task for this session:
Create src/data/constants.ts with:

1. SEED = 42 (number constant for deterministic random data)
2. DEFAULT_CURRENCY = 'USD'
3. DATE_RANGE = { start: '2020-01-01', end: '2020-04-30' } — matches the dataset date range
4. CATEGORIES — an array or object of all valid category strings matching the Category type in types/index.ts
5. CATEGORY_EMOJI — a Record mapping each category to a relevant emoji (e.g. Groceries → '🛒')
6. SUGGESTED_QUESTIONS — array of 5 hardcoded question strings for the chat feature (e.g. "What did I spend most on last month?")

Use UPPER_SNAKE_CASE for all constants. Export everything as named exports.
```

**Output files:** `src/data/constants.ts`

---

## STEP 4 — Mock Data

**What this does:** Creates `src/data/mockData.ts` — reads the CSV dataset and transforms it into the typed `Transaction[]` format, plus generates a `UserProfile`. This is the core data source for the entire app.

**Context Prompt to paste:**
```
I am P1 (Sean) building the foundation layer for a Next.js + TypeScript project called "Talk to Your Finances".

Read PROJECT_BIBLE.md in my folder for full context.
Also read:
- src/types/index.ts
- src/data/constants.ts
- The CSV file: transactions_training_data_ ktrapeznikov.csv (first 30 rows to understand structure)

Your task for this session:
Create src/data/mockData.ts with:

1. A function generateMockTransactions() that:
   - Reads and parses the CSV data (hardcode it as a const array — do NOT use fs.readFile, this runs in the browser too)
   - Maps CSV rows to the Transaction type from src/types/index.ts
   - Maps CSV categories to our Category type (handle unknown categories → 'Other')
   - Assigns a running balance starting at 15000, adjusting per transaction
   - Assigns a unique id to each transaction (e.g. 'txn_001')
   - Returns Transaction[] sorted by date ascending

2. A function generateUserProfile() that returns a hardcoded UserProfile:
   - name: 'Alex Johnson'
   - accountNumber: '4291'
   - currentBalance: (final balance after all transactions)
   - currency: DEFAULT_CURRENCY

3. A getMockData() function that:
   - Is a cached singleton (compute once, return same object)
   - Returns { transactions: Transaction[], profile: UserProfile }

Since Next.js can't use fs in client components, embed the CSV data directly as a TypeScript array — parse the CSV rows into objects manually in this file. Only include the CREDIT CARD account transactions (not Investor Checking) to keep it focused.
```

**Output files:** `src/data/mockData.ts`

---

## STEP 5 — Data Utilities

**What this does:** Creates `src/utils/dataUtils.ts` — all the helper functions for filtering and aggregating transactions. Every dashboard widget and API route uses these.

**Context Prompt to paste:**
```
I am P1 (Sean) building the foundation layer for a Next.js + TypeScript project called "Talk to Your Finances".

Read PROJECT_BIBLE.md in my folder for full context.
Also read:
- src/types/index.ts
- src/data/mockData.ts

Your task for this session:
Create src/utils/dataUtils.ts with these exported functions:

1. filterByDate(transactions: Transaction[], startDate: string, endDate: string): Transaction[]
   - Filters transactions where date falls within the range (inclusive)

2. sumByCategory(transactions: Transaction[]): Record<string, number>
   - Returns total spend per category (debits only)

3. getTopMerchants(transactions: Transaction[], n: number): Array<{ merchant: string, total: number, count: number }>
   - Returns top N merchants by total spend

4. getSpendingTrend(transactions: Transaction[], period: 'daily' | 'weekly' | 'monthly'): Array<{ label: string, amount: number }>
   - Returns time-series spend data grouped by the given period

5. formatCurrency(amount: number, currency?: string): string
   - Formats a number as a currency string (e.g. 1234.56 → '$1,234.56')
   - Defaults to USD

6. getBalanceHistory(transactions: Transaction[]): Array<{ date: string, balance: number }>
   - Returns one balance point per day (last balance of that day)

7. getTotalSpent(transactions: Transaction[]): number
   - Sum of all debit transactions

8. getTotalIncome(transactions: Transaction[]): number
   - Sum of all credit transactions

All functions should be pure (no side effects). Handle empty arrays gracefully.
```

**Output files:** `src/utils/dataUtils.ts`

---

## STEP 6 — Claude Client

**What this does:** Creates `src/utils/claudeClient.ts` — the single wrapper around the Anthropic SDK. Every API route in the app calls this one function.

**Context Prompt to paste:**
```
I am P1 (Sean) building the foundation layer for a Next.js + TypeScript project called "Talk to Your Finances".

Read PROJECT_BIBLE.md in my folder for full context.
Also read src/types/index.ts.

Your task for this session:
Create src/utils/claudeClient.ts with:

1. A callClaude(systemPrompt: string, userMessage: string, conversationHistory?: ChatMessage[]): Promise<string> function that:
   - Uses the @anthropic-ai/sdk package
   - Uses model: 'claude-sonnet-4-20250514' (as specified in PROJECT_BIBLE)
   - Reads the API key from process.env.ANTHROPIC_API_KEY
   - Accepts an optional conversation history array for the chat feature
   - Returns the assistant's text response as a plain string
   - Throws a descriptive error if the API key is missing
   - Has a max_tokens of 1024

This file is server-side only (used in Next.js API routes). Add a comment at the top: // Server-side only — do not import in client components
```

**Output files:** `src/utils/claudeClient.ts`

---

## STEP 7 — LLM Context Builder

**What this does:** Creates `src/utils/buildLLMContext.ts` — compresses the full transaction dataset into a system prompt that gets sent to Claude with every API call. This is what makes Claude "aware" of the user's finances.

**Context Prompt to paste:**
```
I am P1 (Sean) building the foundation layer for a Next.js + TypeScript project called "Talk to Your Finances".

Read PROJECT_BIBLE.md in my folder for full context.
Also read:
- src/types/index.ts
- src/utils/dataUtils.ts

Your task for this session:
Create src/utils/buildLLMContext.ts with a single exported function:

buildLLMContext(data: { transactions: Transaction[], profile: UserProfile }): string

This function compresses the full financial dataset into a system prompt string for Claude. It should:

1. Include a persona: Claude is a smart, witty personal finance assistant for the user
2. Include the UserProfile summary (name, balance, currency)
3. Include a monthly spending summary (use sumByCategory grouped by month)
4. Include top 5 merchants by spend
5. Include recent 10 transactions (date, merchant, amount, category)
6. Include total spent and total income across the dataset
7. Include the full date range of the data
8. Be under ~2000 tokens — summarise, do not dump every transaction

The output string will be used as the system prompt for all Claude API calls.
Format it clearly with sections using plain text headers (no markdown needed inside the prompt itself).
```

**Output files:** `src/utils/buildLLMContext.ts`

---

## STEP 8 — React Hook

**What this does:** Creates `src/hooks/useFinancialData.ts` — the thin React hook that wraps `getMockData()`. This is what UI components call to get data without knowing about the data layer.

**Context Prompt to paste:**
```
I am P1 (Sean) building the foundation layer for a Next.js + TypeScript project called "Talk to Your Finances".

Read PROJECT_BIBLE.md in my folder for full context.
Also read:
- src/types/index.ts
- src/data/mockData.ts
- src/utils/dataUtils.ts

Your task for this session:
Create src/hooks/useFinancialData.ts with a single exported React hook:

useFinancialData(): DashboardData

This hook should:
1. Call getMockData() to get transactions and profile
2. Compute derived data using dataUtils functions:
   - totalSpent (getTotalSpent)
   - totalIncome (getTotalIncome)
   - topCategories (sumByCategory)
   - recentTransactions (last 10 transactions by date)
3. Return a DashboardData object

This hook is synchronous (no async/loading state needed — data is hardcoded).
Keep it simple. Other team members will call this hook in their components.
```

**Output files:** `src/hooks/useFinancialData.ts`

---

## STEP 9 — Verify Everything

**What this does:** Runs a TypeScript check and a quick smoke test to confirm all files compile and the data layer works before you hand off to the team.

**Context Prompt to paste:**
```
I am P1 (Sean) and I have just finished building the foundation data layer for the "Talk to Your Finances" Next.js project.

Read PROJECT_BIBLE.md in my folder for full context.

The following files should now exist in my workspace:
- package.json
- tsconfig.json
- next.config.js
- .env.example
- src/types/index.ts
- src/data/constants.ts
- src/data/mockData.ts
- src/utils/dataUtils.ts
- src/utils/claudeClient.ts
- src/utils/buildLLMContext.ts
- src/hooks/useFinancialData.ts

Your task for this session:
1. Read each file and check for TypeScript errors, missing imports, or broken references between files
2. Verify that getMockData() would return a valid Transaction[] with at least 50 transactions
3. Verify that all function signatures match what the PROJECT_BIBLE specifies (Section 6.1 Expected Outputs)
4. List any issues found and fix them
5. Produce a short "handoff note" summarising what each file exports, so Ella, Pau and Carlos know exactly what they can import
```

**Output:** Fixes to any files + a printed handoff summary

---

## Handoff Checklist

After Step 9, confirm these before telling your team to start:

- [ ] `src/types/index.ts` exports all required types
- [ ] `getMockData()` returns transactions and profile
- [ ] `callClaude()` is exported from `claudeClient.ts`
- [ ] `buildLLMContext()` is exported from `buildLLMContext.ts`
- [ ] `useFinancialData()` hook is exported
- [ ] `.env.example` shows the required env var
- [ ] No file imports from `fs` or Node-only modules in client-side files
- [ ] Push your `sean/data-layer` branch and open a PR to `main`
