# PROJECT BIBLE - "Talk to Your Finances"

> **This document is the single source of truth for all contributors and their Claude Code instances.**
> Every contributor MUST load this file as context before writing any code.
> Last updated: 2026-03-31

---

## 1. Project Overview

### 1.1 Product Description

"Talk to Your Finances" is an AI-powered personal finance app that transforms how users interact with their bank transaction data. Instead of passive dashboards and dry transaction lists, the app uses Claude (Anthropic's LLM) to deliver conversational, emotionally engaging financial insights.

### 1.2 Core Objectives

- Build a fully functional Next.js prototype deployable on Vercel.
- Demonstrate four distinct AI-powered features that each use Claude API for natural language generation.
- Use realistic synthetic transaction data (seeded randomness, deterministic across runs).
- Deliver a polished, presentation-ready prototype for the PDAI course final group assignment (presentation: April 7, 2026).

### 1.3 Key Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Roast My Spending** | AI generates a brutally honest (but funny) weekly spending summary. Turns financial anxiety into entertainment. |
| F2 | **Your Money's Diary** (Transaction Storytelling) | AI generates a monthly narrative of the user's money - personifying transactions into a story. |
| F3 | **Talk to Your Transactions** (Conversational Chat) | Chat interface where users ask natural language questions about their finances ("What did I spend on eating out last 2 weeks?"). |
| F4 | **"Future You" Simulator** | User describes a potential purchase; AI simulates the ripple effect on their projected balance with a timeline visualization. |

### 1.4 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React + TypeScript + Tailwind CSS                           │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│  │ Dashboard │ │   Chat   │ │ Simulate │ │  Roast / Diary   ││
│  │  (P4)    │ │   (P2)   │ │   (P3)   │ │     (P3)         ││
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬──────────┘│
│       │             │            │                │           │
│       └─────────────┴────────────┴────────────────┘           │
│                          │                                    │
│              ┌───────────┴───────────┐                        │
│              │  Shared Data Layer    │                        │
│              │  (P1: types, mockData,│                        │
│              │   dataUtils,          │                        │
│              │   claudeClient,       │                        │
│              │   constants)          │                        │
│              └───────────┬───────────┘                        │
└──────────────────────────┼────────────────────────────────────┘
                           │
┌──────────────────────────┼────────────────────────────────────┐
│                     BACKEND (Next.js API Routes)              │
│                          │                                    │
│  ┌───────────┐  ┌────────┴─────┐  ┌───────────┐              │
│  │ /api/chat │  │ /api/simulate│  │ /api/roast │              │
│  │   (P2)    │  │    (P3)      │  │ /api/diary │              │
│  └───────────┘  └──────────────┘  │   (P3)     │              │
│                                   └────────────┘              │
│                          │                                    │
│              ┌───────────┴───────────┐                        │
│              │  buildLLMContext()    │                        │
│              │  (P1: shared system   │                        │
│              │   prompt builder)     │                        │
│              └───────────────────────┘                        │
└───────────────────────────────────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │ Claude API  │
                    │ (Sonnet)    │
                    └─────────────┘
```

### 1.5 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18+ with TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes |
| AI | Claude API (Anthropic, model: claude-sonnet-4-20250514) |
| Data | Seeded synthetic mock data (no external DB) |
| Deployment | Vercel |
| Version Control | GitHub |

---

## 2. Team Structure & Ownership

### 2.1 Team Members

| Person | Name | Role |
|--------|------|------|
| P1 | **Sean** | Foundation & Data Layer Architect |
| P2 | **Ella** | Chat Feature Lead |
| P3 | **Pau** | Roast, Diary & Simulator Lead |
| P4 | **Carlos** | Dashboard & UI/Layout Lead |

### 2.2 Ownership Matrix

| Component | Owner | Can Read | Can Modify |
|-----------|-------|----------|------------|
| `src/types/index.ts` | P1 (Sean) | All | P1 ONLY |
| `src/data/mockData.ts` | P1 (Sean) | All | P1 ONLY |
| `src/data/constants.ts` | P1 (Sean) | All | P1 ONLY |
| `src/utils/dataUtils.ts` | P1 (Sean) | All | P1 ONLY |
| `src/utils/claudeClient.ts` | P1 (Sean) | All | P1 ONLY |
| `src/utils/buildLLMContext.ts` | P1 (Sean) | All | P1 ONLY |
| `src/app/page.tsx` (root layout/nav) | P4 (Carlos) | All | P4 ONLY |
| `src/app/layout.tsx` | P4 (Carlos) | All | P4 ONLY |
| `src/components/Dashboard/` | P4 (Carlos) | All | P4 ONLY |
| `src/components/Chat/` | P2 (Ella) | All | P2 ONLY |
| `src/components/Simulator/` | P3 (Pau) | All | P3 ONLY |
| `src/components/Roast/` | P3 (Pau) | All | P3 ONLY |
| `src/components/Diary/` | P3 (Pau) | All | P3 ONLY |
| `src/app/api/chat/route.ts` | P2 (Ella) | All | P2 ONLY |
| `src/app/api/simulate/route.ts` | P3 (Pau) | All | P3 ONLY |
| `src/app/api/roast/route.ts` | P3 (Pau) | All | P3 ONLY |
| `src/app/api/diary/route.ts` | P3 (Pau) | All | P3 ONLY |
| `tailwind.config.ts` | P4 (Carlos) | All | P4 ONLY |
| `package.json` | P1 (Sean) | All | P1 ONLY (dependency changes require P1 approval) |
| `README.md` | P1 (Sean) | All | All (append only - do not delete others' sections) |
| `.env.local` / `.env.example` | P1 (Sean) | All | P1 ONLY |

### 2.3 Ownership Boundaries - STRICT RULES

- **You may ONLY modify files in your assigned scope.** No exceptions.
- **You may READ any file** to understand interfaces, types, or data shapes.
- **If you need a change in someone else's file**, open a GitHub Issue or message the owner directly. Do NOT make the change yourself.
- **Shared UI components** (buttons, cards, modals) live in `src/components/ui/` and are owned by P4 (Carlos). If you need a new shared component, request it from P4.

---

## 3. Repository Structure

### 3.1 Exact Folder/File Structure

```
talk-to-your-finances/
├── .env.local                          # [P1] API keys (NEVER commit)
├── .env.example                        # [P1] Template for .env.local
├── .gitignore                          # [P1]
├── package.json                        # [P1]
├── package-lock.json                   # [AUTO]
├── tsconfig.json                       # [P1]
├── tailwind.config.ts                  # [P4]
├── next.config.js                      # [P1]
├── postcss.config.js                   # [P4]
├── README.md                           # [ALL - append only]
├── PROJECT_BIBLE.md                    # [P1 - this file]
│
├── public/                             # [P4] Static assets
│   ├── favicon.ico
│   └── images/
│
├── src/
│   ├── types/                          # [P1] ALL TypeScript interfaces
│   │   └── index.ts                    #   Transaction, Category, UserProfile,
│   │                                   #   ChatMessage, SimulationResult,
│   │                                   #   RoastResult, DiaryResult,
│   │                                   #   DashboardData, APIResponse<T>
│   │
│   ├── data/                           # [P1] Data layer
│   │   ├── constants.ts                #   SEED, categories, date ranges, currency
│   │   └── mockData.ts                 #   generateMockTransactions(),
│   │                                   #   generateUserProfile(),
│   │                                   #   getMockData() (cached singleton)
│   │
│   ├── utils/                          # [P1] Shared utilities
│   │   ├── dataUtils.ts                #   filterByDate(), sumByCategory(),
│   │   │                               #   getTopMerchants(), getSpendingTrend(),
│   │   │                               #   formatCurrency()
│   │   ├── claudeClient.ts             #   callClaude() - single wrapper for API
│   │   └── buildLLMContext.ts           #   buildLLMContext() - compresses full
│   │                                   #   dataset into a system prompt string
│   │
│   ├── components/                     # UI Components
│   │   ├── ui/                         # [P4] Shared/reusable UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── TabNav.tsx
│   │   │
│   │   ├── Dashboard/                  # [P4] Dashboard feature
│   │   │   ├── DashboardView.tsx       #   Main dashboard container
│   │   │   ├── SpendingSummary.tsx      #   Monthly spending overview
│   │   │   ├── CategoryBreakdown.tsx   #   Pie/bar chart by category
│   │   │   ├── TransactionList.tsx     #   Scrollable transaction feed
│   │   │   └── BalanceChart.tsx        #   Balance over time line chart
│   │   │
│   │   ├── Chat/                       # [P2] Chat feature
│   │   │   ├── ChatView.tsx            #   Main chat container
│   │   │   ├── ChatInput.tsx           #   Message input with send button
│   │   │   ├── ChatBubble.tsx          #   Individual message bubble
│   │   │   └── SuggestedQuestions.tsx   #   Quick-tap question chips
│   │   │
│   │   ├── Simulator/                  # [P3] Future You Simulator
│   │   │   ├── SimulatorView.tsx       #   Main simulator container
│   │   │   ├── PurchaseInput.tsx       #   Describe-a-purchase form
│   │   │   └── ImpactTimeline.tsx      #   Projected balance timeline chart
│   │   │
│   │   ├── Roast/                      # [P3] Roast My Spending
│   │   │   ├── RoastView.tsx           #   Main roast container
│   │   │   └── RoastCard.tsx           #   Individual roast display card
│   │   │
│   │   └── Diary/                      # [P3] Your Money's Diary
│   │       ├── DiaryView.tsx           #   Main diary container
│   │       └── DiaryEntry.tsx          #   Monthly narrative display
│   │
│   ├── app/                            # Next.js App Router
│   │   ├── layout.tsx                  # [P4] Root layout (HTML, body, fonts)
│   │   ├── page.tsx                    # [P4] Main page with tab navigation
│   │   ├── globals.css                 # [P4] Global styles
│   │   │
│   │   └── api/                        # API Routes (backend)
│   │       ├── chat/
│   │       │   └── route.ts            # [P2] POST /api/chat
│   │       ├── simulate/
│   │       │   └── route.ts            # [P3] POST /api/simulate
│   │       ├── roast/
│   │       │   └── route.ts            # [P3] POST /api/roast
│   │       └── diary/
│   │           └── route.ts            # [P3] POST /api/diary
│   │
│   └── hooks/                          # [P1] Shared React hooks
│       └── useFinancialData.ts         #   Hook wrapping getMockData()
│
└── docs/                               # Documentation
    └── PROJECT_BIBLE.md                # This file (symlink or copy)
```

### 3.2 Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files (components) | PascalCase | `ChatView.tsx`, `RoastCard.tsx` |
| Files (utilities) | camelCase | `dataUtils.ts`, `claudeClient.ts` |
| Files (API routes) | kebab-case directory + `route.ts` | `api/chat/route.ts` |
| TypeScript interfaces | PascalCase, no `I` prefix | `Transaction`, `UserProfile` |
| TypeScript enums | PascalCase | `Category`, `TransactionType` |
| Functions | camelCase | `buildLLMContext()`, `filterByDate()` |
| Constants | UPPER_SNAKE_CASE | `SEED`, `DEFAULT_CURRENCY` |
| CSS classes | Tailwind utilities only | `className="flex gap-4 p-2"` |
| Branches | `<owner>/<feature-name>` | `sean/data-layer`, `ella/chat-ui` |
| Commits | Conventional Commits | `feat(chat): add message history` |

### 3.3 Rules for Creating New Files

1. You may ONLY create files within your assigned directories (see Section 2.2).
2. New shared types MUST go through P1 (Sean). Open an Issue with the proposed interface.
3. New shared UI components MUST go through P4 (Carlos). Open an Issue with the design need.
4. New API routes MUST follow the pattern: `src/app/api/<feature>/route.ts`.
5. No top-level files may be created without P1 approval.
6. Test files (if created) go adjacent to the file they test: `ChatView.test.tsx` next to `ChatView.tsx`.

---

## 4. Development Rules (MANDATORY)

### 4.1 Scope Enforcement

Each contributor's Claude Code instance MUST:

- **ONLY modify files within its assigned scope** (see Section 2.2 Ownership Matrix).
- **NEVER overwrite, refactor, or restructure another contributor's files.**
- **NEVER rename any shared file** (`types/index.ts`, `dataUtils.ts`, `claudeClient.ts`, `buildLLMContext.ts`, `constants.ts`, `mockData.ts`) without explicit written agreement from ALL team members.
- **NEVER change function signatures in shared utilities** without P1 approval and a migration plan.

### 4.2 Modular Development Principles

- Each feature is self-contained within its component directory.
- Features communicate with the data layer ONLY through the interfaces defined in `src/types/index.ts`.
- Features access data ONLY through `src/utils/dataUtils.ts` and `src/hooks/useFinancialData.ts`.
- Features call Claude ONLY through `src/utils/claudeClient.ts`.
- API routes build their LLM prompts using `buildLLMContext()` from `src/utils/buildLLMContext.ts`.
- No feature should import from another feature's directory. For example, `Chat/` must NEVER import from `Simulator/`.

### 4.3 Separation of Concerns

| Concern | Where It Lives | Who Owns It |
|---------|---------------|-------------|
| TypeScript type definitions | `src/types/index.ts` | P1 |
| Mock data generation | `src/data/mockData.ts` | P1 |
| Data filtering/aggregation | `src/utils/dataUtils.ts` | P1 |
| Claude API communication | `src/utils/claudeClient.ts` | P1 |
| LLM system prompt assembly | `src/utils/buildLLMContext.ts` | P1 |
| Feature-specific UI | `src/components/<Feature>/` | Feature owner |
| Feature-specific API logic | `src/app/api/<feature>/route.ts` | Feature owner |
| App shell, navigation, layout | `src/app/page.tsx`, `layout.tsx` | P4 |
| Shared UI primitives | `src/components/ui/` | P4 |

---

## 5. Git & Workflow Rules

### 5.1 Branching Strategy

```
main
 ├── sean/data-layer          # P1: types, mockData, dataUtils, claudeClient, buildLLMContext
 ├── sean/hooks                # P1: useFinancialData hook
 ├── ella/chat-ui              # P2: Chat components
 ├── ella/chat-api             # P2: /api/chat route
 ├── pau/simulator-ui          # P3: Simulator components
 ├── pau/simulator-api         # P3: /api/simulate route
 ├── pau/roast                 # P3: Roast components + /api/roast
 ├── pau/diary                 # P3: Diary components + /api/diary
 ├── carlos/dashboard          # P4: Dashboard components
 ├── carlos/layout             # P4: App shell, navigation, shared UI
 └── carlos/styling            # P4: Tailwind config, global styles
```

### 5.2 Branch Naming Convention

Pattern: `<first-name>/<short-feature-description>`

Examples: `sean/data-layer`, `ella/chat-streaming`, `pau/roast-api`, `carlos/tab-navigation`

### 5.3 Pull Request Rules

1. **Every merge to `main` requires a Pull Request.** No direct pushes to `main`.
2. PRs must have a descriptive title following Conventional Commits: `feat(chat): implement message history`.
3. PRs must include a brief description of what changed and which files were modified.
4. PRs must ONLY contain changes to files within the author's ownership scope.
5. If a PR touches a shared file (requires P1 approval), tag P1 as a required reviewer.
6. PRs should be small and focused. One feature or fix per PR.

### 5.4 Merge Rules

1. P1 (Sean) merges first - the foundation layer must be on `main` before anyone else merges.
2. After P1's foundation is merged, P2, P3, P4 can merge in any order (they do not depend on each other).
3. Use **squash merge** for feature branches to keep `main` history clean.
4. Before merging, pull latest `main` into your branch and resolve conflicts locally.
5. After merging, delete the feature branch.

### 5.5 Merge Order (CRITICAL)

```
Phase 1: P1 merges foundation (types, data, utils, claudeClient, buildLLMContext)
    ↓
Phase 2: P4 merges layout/navigation shell (app layout, page.tsx with tab structure, shared UI)
    ↓
Phase 3: P2, P3 merge features in any order (Chat, Simulator, Roast, Diary, Dashboard)
```

P2 and P3 MUST NOT merge before P1's foundation is on `main`. P4's layout merge is recommended before P2/P3 but not strictly required if P2/P3 only modify their own component directories.

### 5.6 Conflict Resolution Protocol

1. If you encounter a merge conflict in a file you DO NOT own: **STOP. Do not resolve it.** Contact the file owner.
2. If you encounter a merge conflict in a file you DO own: resolve it yourself, preserving the intent of both changes.
3. If two people need to modify the same shared file: coordinate synchronously (call/message), agree on the change, and have the file owner make it.

### 5.7 Commit Message Standards

Format: `<type>(<scope>): <description>`

| Type | Use When |
|------|----------|
| `feat` | Adding new functionality |
| `fix` | Fixing a bug |
| `refactor` | Restructuring code without changing behavior |
| `style` | CSS/formatting changes only |
| `docs` | Documentation changes |
| `chore` | Config, dependencies, tooling |

Scope = your feature area: `data`, `chat`, `simulator`, `roast`, `diary`, `dashboard`, `layout`, `ui`.

Examples:
- `feat(chat): add suggested questions component`
- `fix(simulator): handle empty purchase description`
- `refactor(data): optimize filterByDate performance`
- `style(dashboard): adjust card spacing on mobile`

---

## 6. Feature Breakdown

### 6.1 Feature: Foundation & Data Layer (P1 - Sean)

**Description:** The shared data infrastructure that all features depend on. Provides TypeScript types, deterministic mock data generation, data utility functions, Claude API wrapper, and LLM context builder.

**Owner:** P1 (Sean)

**Files:**
- `src/types/index.ts`
- `src/data/constants.ts`
- `src/data/mockData.ts`
- `src/utils/dataUtils.ts`
- `src/utils/claudeClient.ts`
- `src/utils/buildLLMContext.ts`
- `src/hooks/useFinancialData.ts`
- `.env.example`
- `package.json`
- `tsconfig.json`
- `next.config.js`

**Dependencies:** None (this is the root dependency for all other features).

**Expected Outputs:**
- `getMockData()`: returns `{ transactions: Transaction[], profile: UserProfile }`
- `filterByDate(transactions, startDate, endDate)`: returns filtered `Transaction[]`
- `sumByCategory(transactions)`: returns `Record<Category, number>`
- `getTopMerchants(transactions, n)`: returns top N merchants by spend
- `getSpendingTrend(transactions, period)`: returns time-series data
- `formatCurrency(amount, currency)`: returns formatted string
- `callClaude(systemPrompt, userMessage)`: returns Claude response text
- `buildLLMContext(data)`: returns a string system prompt with full financial context

**Integration Points:**
- Every other feature imports types from `src/types/index.ts`.
- Every API route uses `callClaude()` and `buildLLMContext()`.
- Every UI component uses `dataUtils` functions for display data.

---

### 6.2 Feature: Chat - "Talk to Your Transactions" (P2 - Ella)

**Description:** A conversational interface where users ask natural language questions about their spending. Claude answers conversationally using the full financial context.

**Owner:** P2 (Ella)

**Files:**
- `src/components/Chat/ChatView.tsx`
- `src/components/Chat/ChatInput.tsx`
- `src/components/Chat/ChatBubble.tsx`
- `src/components/Chat/SuggestedQuestions.tsx`
- `src/app/api/chat/route.ts`

**Dependencies:**
- `src/types/index.ts` (imports `ChatMessage`, `APIResponse`)
- `src/utils/claudeClient.ts` (imports `callClaude`)
- `src/utils/buildLLMContext.ts` (imports `buildLLMContext`)
- `src/data/mockData.ts` (imports `getMockData`)
- `src/utils/dataUtils.ts` (imports `formatCurrency`)

**Expected Inputs (API):**
```typescript
// POST /api/chat
{
  message: string;           // User's question
  history: ChatMessage[];    // Previous messages in conversation
}
```

**Expected Outputs (API):**
```typescript
// Response
{
  reply: string;             // Claude's conversational answer
}
```

**Integration Points:**
- ChatView calls `POST /api/chat` with user message + conversation history.
- API route uses `buildLLMContext()` as the system prompt and passes user message to `callClaude()`.
- Chat history is maintained in React state (ChatView), not persisted.
- Suggested questions are hardcoded strings in `SuggestedQuestions.tsx` (P2 owns these).

---

### 6.3 Feature: "Future You" Simulator (P3 - Pau)

**Description:** User describes a purchase they're considering. AI simulates the financial ripple effect and generates a projected balance timeline.

**Owner:** P3 (Pau)

**Files:**
- `src/components/Simulator/SimulatorView.tsx`
- `src/components/Simulator/PurchaseInput.tsx`
- `src/components/Simulator/ImpactTimeline.tsx`
- `src/app/api/simulate/route.ts`

**Dependencies:**
- `src/types/index.ts` (imports `SimulationResult`, `APIResponse`)
- `src/utils/claudeClient.ts` (imports `callClaude`)
- `src/utils/buildLLMContext.ts` (imports `buildLLMContext`)
- `src/data/mockData.ts` (imports `getMockData`)

**Expected Inputs (API):**
```typescript
// POST /api/simulate
{
  purchaseDescription: string;  // "PS5 for R8,000"
  amount?: number;              // Optional explicit amount
}
```

**Expected Outputs (API):**
```typescript
// Response
{
  analysis: string;                // Claude's narrative analysis
  projectedBalances: {             // For timeline chart
    date: string;
    withPurchase: number;
    withoutPurchase: number;
  }[];
  canAfford: boolean;
  riskLevel: "low" | "medium" | "high";
}
```

**Integration Points:**
- SimulatorView calls `POST /api/simulate`.
- API route uses `buildLLMContext()` for financial context, asks Claude to analyze the purchase impact.
- ImpactTimeline renders the `projectedBalances` array as a line chart (use Recharts or similar - P3's choice within their scope).
- The API route must parse Claude's response to extract structured data. Use JSON mode or XML tags in the prompt.

---

### 6.4 Feature: Roast My Spending (P3 - Pau)

**Description:** AI generates a brutally honest but funny weekly spending summary.

**Owner:** P3 (Pau)

**Files:**
- `src/components/Roast/RoastView.tsx`
- `src/components/Roast/RoastCard.tsx`
- `src/app/api/roast/route.ts`

**Dependencies:**
- `src/types/index.ts` (imports `RoastResult`, `APIResponse`)
- `src/utils/claudeClient.ts` (imports `callClaude`)
- `src/utils/buildLLMContext.ts` (imports `buildLLMContext`)
- `src/data/mockData.ts` (imports `getMockData`)
- `src/utils/dataUtils.ts` (imports `sumByCategory`, `getTopMerchants`)

**Expected Inputs (API):**
```typescript
// POST /api/roast
{
  period: "week" | "month";   // Time period for the roast
}
```

**Expected Outputs (API):**
```typescript
// Response
{
  roast: string;              // The roast text
  worstCategory: string;      // Category where user overspent most
  savingsPotential: number;   // Estimated savings if user cut back
}
```

**Integration Points:**
- RoastView calls `POST /api/roast` with selected period.
- API route filters transactions by period using `dataUtils`, builds context, and prompts Claude for a humorous roast.

---

### 6.5 Feature: Your Money's Diary (P3 - Pau)

**Description:** AI generates a monthly narrative personifying the user's money as a character living through the month.

**Owner:** P3 (Pau)

**Files:**
- `src/components/Diary/DiaryView.tsx`
- `src/components/Diary/DiaryEntry.tsx`
- `src/app/api/diary/route.ts`

**Dependencies:**
- `src/types/index.ts` (imports `DiaryResult`, `APIResponse`)
- `src/utils/claudeClient.ts` (imports `callClaude`)
- `src/utils/buildLLMContext.ts` (imports `buildLLMContext`)
- `src/data/mockData.ts` (imports `getMockData`)

**Expected Inputs (API):**
```typescript
// POST /api/diary
{
  month: string;              // "2026-03" (ISO month)
}
```

**Expected Outputs (API):**
```typescript
// Response
{
  narrative: string;          // The diary narrative
  month: string;
  totalSpent: number;
  totalIncome: number;
}
```

**Integration Points:**
- DiaryView calls `POST /api/diary` with selected month.
- API route retrieves month's transactions, builds context, and prompts Claude for a narrative.

---

### 6.6 Feature: Dashboard (P4 - Carlos)

**Description:** The main overview screen showing spending summary, category breakdown, transaction list, and balance chart. This is the landing/home tab.

**Owner:** P4 (Carlos)

**Files:**
- `src/components/Dashboard/DashboardView.tsx`
- `src/components/Dashboard/SpendingSummary.tsx`
- `src/components/Dashboard/CategoryBreakdown.tsx`
- `src/components/Dashboard/TransactionList.tsx`
- `src/components/Dashboard/BalanceChart.tsx`

**Dependencies:**
- `src/types/index.ts` (imports `Transaction`, `UserProfile`, `DashboardData`)
- `src/data/mockData.ts` (imports `getMockData`)
- `src/utils/dataUtils.ts` (imports `sumByCategory`, `getSpendingTrend`, `formatCurrency`, `filterByDate`)
- `src/hooks/useFinancialData.ts`

**Expected Inputs:** None (reads directly from mock data via hook).

**Expected Outputs:** Rendered UI components displaying financial overview.

**Integration Points:**
- Dashboard does NOT call any API routes. It reads data client-side via `useFinancialData()` hook.
- Dashboard uses `dataUtils` functions for all calculations.
- Dashboard uses shared UI components from `src/components/ui/`.
- For charts, P4 chooses a charting library (Recharts recommended) and installs it via P1.

---

### 6.7 Feature: App Shell & Navigation (P4 - Carlos)

**Description:** The root layout, tab navigation system, and overall app styling.

**Owner:** P4 (Carlos)

**Files:**
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/components/ui/TabNav.tsx`
- `tailwind.config.ts`
- `postcss.config.js`

**Dependencies:**
- All feature `*View.tsx` components (imported into `page.tsx` for tab rendering).

**Expected Behavior:**
- `page.tsx` renders a tab navigation with 5 tabs: Dashboard, Chat, Simulator, Roast, Diary.
- Each tab renders the corresponding `*View.tsx` component.
- Tab state is managed in `page.tsx` via React state.
- P4 imports each feature's main View component but does NOT modify them.

**Integration Points:**
- P4 imports: `DashboardView`, `ChatView`, `SimulatorView`, `RoastView`, `DiaryView`.
- The import paths are fixed. Feature owners must export their View component as the default export from their main file.

---

## 7. Integration Contracts (CRITICAL)

### 7.1 Shared Type Definitions

All types are defined in `src/types/index.ts` and are the ONLY source of truth for data shapes. No feature may define its own types that duplicate or shadow these.

```typescript
// ---- Core Data Types ----

export interface Transaction {
  id: string;
  date: string;                    // ISO date string "2026-03-15"
  amount: number;                  // Positive = income, negative = expense
  description: string;             // Merchant/source name
  category: Category;
  type: "income" | "expense";
}

export type Category =
  | "groceries"
  | "dining"
  | "transport"
  | "entertainment"
  | "shopping"
  | "bills"
  | "health"
  | "travel"
  | "subscriptions"
  | "salary"
  | "other";

export interface UserProfile {
  name: string;
  currency: string;                // "ZAR", "EUR", "USD"
  monthlyIncome: number;
  currentBalance: number;
}

// ---- Feature-Specific Response Types ----

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;               // ISO datetime
}

export interface SimulationResult {
  analysis: string;
  projectedBalances: {
    date: string;
    withPurchase: number;
    withoutPurchase: number;
  }[];
  canAfford: boolean;
  riskLevel: "low" | "medium" | "high";
}

export interface RoastResult {
  roast: string;
  worstCategory: string;
  savingsPotential: number;
}

export interface DiaryResult {
  narrative: string;
  month: string;
  totalSpent: number;
  totalIncome: number;
}

export interface DashboardData {
  transactions: Transaction[];
  profile: UserProfile;
  categoryTotals: Record<Category, number>;
  spendingTrend: { date: string; amount: number }[];
}

// ---- API Types ----

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### 7.2 Data Utility Contract

Functions exported from `src/utils/dataUtils.ts`:

```typescript
export function filterByDate(
  transactions: Transaction[],
  startDate: string,        // ISO date
  endDate: string            // ISO date
): Transaction[];

export function sumByCategory(
  transactions: Transaction[]
): Record<Category, number>;

export function getTopMerchants(
  transactions: Transaction[],
  n: number
): { merchant: string; total: number }[];

export function getSpendingTrend(
  transactions: Transaction[],
  period: "daily" | "weekly" | "monthly"
): { date: string; amount: number }[];

export function formatCurrency(
  amount: number,
  currency: string
): string;
```

### 7.3 Claude Client Contract

```typescript
// src/utils/claudeClient.ts
export async function callClaude(
  systemPrompt: string,
  userMessage: string
): Promise<string>;
```

This function handles the Anthropic API call, error handling, and returns the text content of Claude's response. All API routes use this - never call the Anthropic API directly.

### 7.4 LLM Context Builder Contract

```typescript
// src/utils/buildLLMContext.ts
export function buildLLMContext(
  data: { transactions: Transaction[]; profile: UserProfile }
): string;
```

Returns a comprehensive system prompt string that includes the user's financial profile, recent transactions summary, category breakdowns, and spending patterns. All API routes use this as the system prompt so Claude has consistent financial context regardless of which feature is calling it.

### 7.5 API Route Contracts

All API routes follow this pattern:

```typescript
// Method: POST
// Content-Type: application/json
// Response: APIResponse<T> where T is the feature-specific result type

// Success response:
{ success: true, data: { /* feature result */ } }

// Error response:
{ success: false, error: "Human-readable error message" }
```

HTTP status codes: `200` for success, `400` for bad input, `500` for server/API errors.

### 7.6 Component Export Contract

Every feature's main View component MUST be exported as the default export:

```typescript
// Example: src/components/Chat/ChatView.tsx
export default function ChatView() { ... }
```

P4 (Carlos) imports these in `page.tsx`:

```typescript
import DashboardView from "@/components/Dashboard/DashboardView";
import ChatView from "@/components/Chat/ChatView";
import SimulatorView from "@/components/Simulator/SimulatorView";
import RoastView from "@/components/Roast/RoastView";
import DiaryView from "@/components/Diary/DiaryView";
```

These import paths are LOCKED. Do not rename your main View file or change the export.

### 7.7 Rules to Prevent Breaking Changes

1. **Type changes require a migration.** If P1 needs to change a type in `index.ts`, P1 must notify all team members and provide the migration path (what changed, what to update in your code).
2. **Data utility function signatures are frozen.** If P1 needs to add a parameter, it must be optional with a default value.
3. **New data utility functions can be added freely** by P1 without breaking anything.
4. **API route request/response shapes are frozen** once documented here. Changes require team agreement.
5. **The `buildLLMContext()` output format can change** (P1 optimizing the prompt), but the function signature stays the same.

---

## 8. Prohibitions (STRICT)

The following actions are **STRICTLY FORBIDDEN**. Violation risks merge conflicts, broken builds, and wasted time.

| # | Prohibition | Why |
|---|------------|-----|
| 1 | Editing files outside your assigned scope | Causes merge conflicts and ownership confusion |
| 2 | Changing any type definition in `src/types/index.ts` (unless you are P1) | Breaks all features that depend on the type |
| 3 | Changing function signatures in `dataUtils.ts`, `claudeClient.ts`, or `buildLLMContext.ts` (unless you are P1) | Breaks all callers |
| 4 | Renaming any shared file | Breaks all imports across the codebase |
| 5 | Installing new npm packages without P1 approval | Could conflict with existing dependencies or bloat the bundle |
| 6 | Modifying `package.json` (unless you are P1) | Dependency management must be centralized |
| 7 | Modifying `.env.local` or `.env.example` (unless you are P1) | Environment config must be consistent |
| 8 | Importing from another feature's component directory (e.g., Chat importing from Simulator) | Violates separation of concerns, creates coupling |
| 9 | Pushing directly to `main` | All changes must go through PRs |
| 10 | Resolving merge conflicts in files you do not own | Contact the file owner instead |
| 11 | Large refactors or "cleanup" of shared code without team coordination | Risk of breaking multiple features simultaneously |
| 12 | Adding new top-level directories without P1 approval | Must follow established structure |
| 13 | Using a different Claude model or API call pattern than `claudeClient.ts` | Inconsistent behavior, cost surprises |
| 14 | Hardcoding financial data in components (instead of using `mockData.ts`) | Breaks deterministic data guarantee |
| 15 | Committing `.env.local` or any file containing API keys | Security risk |

---

## 9. Definition of Done

A task/feature is considered **DONE** when ALL of the following are true:

### 9.1 Code Quality
- [ ] Code compiles with zero TypeScript errors (`npx tsc --noEmit`).
- [ ] No `any` types used (use proper types from `src/types/index.ts`).
- [ ] No hardcoded data - all financial data comes from `mockData.ts` via `dataUtils.ts`.
- [ ] No console.log statements left in production code (remove or guard with `process.env.NODE_ENV`).

### 9.2 Functionality
- [ ] Feature works end-to-end in the browser (local `npm run dev`).
- [ ] API routes return proper `APIResponse<T>` format with correct status codes.
- [ ] Error states are handled gracefully (loading spinners, error messages, empty states).
- [ ] Feature does not break other features (test by navigating between all tabs).

### 9.3 Integration
- [ ] Feature uses ONLY types from `src/types/index.ts`.
- [ ] Feature uses ONLY utilities from `src/utils/`.
- [ ] Feature's main View component is exported as default.
- [ ] Feature can be imported and rendered by P4's tab navigation without errors.
- [ ] No cross-feature imports.

### 9.4 Git
- [ ] All changes are in files within your ownership scope.
- [ ] Branch is rebased on latest `main` with no conflicts.
- [ ] Commit messages follow Conventional Commits format.
- [ ] PR is created with clear description.

### 9.5 Polish (for final submission)
- [ ] Responsive layout (works on desktop and tablet).
- [ ] Loading states shown during API calls.
- [ ] Empty states shown when no data.
- [ ] Consistent visual style with shared UI components.

---

## 10. Guidelines for Claude Code Usage

### 10.1 Context Loading

Every contributor MUST start their Claude Code session with:

```
Read the file PROJECT_BIBLE.md first. This is the project bible.
You are working as [Person N - Name]. You may ONLY modify files
within my assigned scope. Do NOT touch any file outside my ownership.
```

### 10.2 Claude Code MUST

- **Respect ownership boundaries.** Before modifying any file, verify it is within the contributor's scope per Section 2.2.
- **Follow the repository structure** exactly as defined in Section 3.1. Do not create files in unexpected locations.
- **Use the exact type definitions** from `src/types/index.ts`. Do not create local type aliases that shadow shared types.
- **Import shared utilities** from the established paths. Do not copy utility code into feature directories.
- **Follow the API response contract** (`APIResponse<T>`) for all API routes.
- **Export View components as default exports.**

### 10.3 Claude Code MUST NOT

- Modify files outside the contributor's scope.
- Create new shared types without going through P1.
- Install packages without P1 approval.
- Refactor or "improve" shared utilities.
- Change import paths or file names of shared modules.
- Add environment variables without P1 approval.

### 10.4 Pre-Commit Validation Checklist

Before committing, run these checks:

```bash
# 1. TypeScript compilation check
npx tsc --noEmit

# 2. Verify you only modified files in your scope
git diff --name-only main

# 3. Verify the app runs
npm run dev
# Then manually check: your feature works, other tabs don't crash

# 4. Verify no .env files are staged
git diff --cached --name-only | grep -i env
# Should return nothing
```

### 10.5 When in Doubt

If Claude Code is unsure whether a change is within scope or might affect another feature:
1. **STOP.** Do not make the change.
2. Add a `// TODO: [YOUR_NAME] - needs team discussion` comment.
3. Open a GitHub Issue describing the needed change.
4. Continue with other work that is clearly in scope.

---

## 11. Scalability & Future Considerations

### 11.1 Adding a New Feature

To add a new feature (e.g., "Smart Nag" notifications or "Voice Input"):

1. **Propose** the feature in a team meeting. Define: name, owner, API route, component directory.
2. **P1 adds** any new types to `src/types/index.ts`.
3. **Feature owner creates** their component directory and API route.
4. **P4 adds** a new tab in `page.tsx` importing the new View component.
5. **Update this document** (Section 2.2, 3.1, 6.x, 7.x).

### 11.2 Adding a New Shared Utility

1. P1 (Sean) adds the function to `src/utils/dataUtils.ts`.
2. P1 documents the function signature in Section 7.2 of this document.
3. P1 merges to `main`.
4. Other contributors pull `main` and can now use the new utility.

### 11.3 Replacing Mock Data with a Real Database

The architecture is designed for this transition:
1. Replace `mockData.ts` with a database client (e.g., Prisma + Postgres).
2. Update `useFinancialData.ts` to fetch from an API route instead of calling `getMockData()`.
3. Add a new API route `GET /api/data` that queries the database.
4. All components continue to work because they depend on the `Transaction` and `UserProfile` types, not the data source.

### 11.4 Adding Authentication

1. Add NextAuth.js or similar to the Next.js app.
2. Protect API routes with session middleware.
3. Replace `getMockData()` with user-specific data fetching.
4. No component changes needed - they still receive the same typed data.

### 11.5 Rules for Extension

- **Never break existing interfaces.** New fields must be optional.
- **Prefer additive changes.** Add new functions, types, components - don't modify existing ones.
- **Document everything** in this file before implementation.
- **One owner per module.** Every new file must have a single owner assigned.

---

## Appendix A: Quick Reference Card

### For P1 (Sean) - Foundation

```
You own: types/, data/, utils/, hooks/, package.json, config files
You build: TypeScript types, mock data, data utils, Claude client, LLM context builder
You merge: FIRST (everyone depends on you)
Key output: getMockData(), callClaude(), buildLLMContext(), all type definitions
```

### For P2 (Ella) - Chat

```
You own: components/Chat/, app/api/chat/
You build: ChatView, ChatInput, ChatBubble, SuggestedQuestions, /api/chat route
You import from: types/index.ts, utils/claudeClient.ts, utils/buildLLMContext.ts, data/mockData.ts
Export: default function ChatView() from ChatView.tsx
API: POST /api/chat { message, history } -> { reply }
```

### For P3 (Pau) - Simulator, Roast, Diary

```
You own: components/Simulator/, components/Roast/, components/Diary/,
         app/api/simulate/, app/api/roast/, app/api/diary/
You build: SimulatorView, RoastView, DiaryView + all sub-components + 3 API routes
You import from: types/index.ts, utils/claudeClient.ts, utils/buildLLMContext.ts, data/mockData.ts, utils/dataUtils.ts
Export: default function SimulatorView(), RoastView(), DiaryView()
APIs:
  POST /api/simulate { purchaseDescription, amount? } -> SimulationResult
  POST /api/roast { period } -> RoastResult
  POST /api/diary { month } -> DiaryResult
```

### For P4 (Carlos) - Dashboard & Layout

```
You own: components/Dashboard/, components/ui/, app/layout.tsx, app/page.tsx,
         app/globals.css, tailwind.config.ts, public/
You build: DashboardView + sub-components, TabNav, shared UI primitives, app shell
You import from: types/index.ts, data/mockData.ts, utils/dataUtils.ts,
                 and all *View.tsx components (for tab rendering)
Export: default function DashboardView() from DashboardView.tsx
No API routes (Dashboard reads data client-side)
```

---

## Appendix B: Environment Variables

```bash
# .env.local (NEVER commit this file)
ANTHROPIC_API_KEY=sk-ant-...

# .env.example (commit this - template for team members)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

All API routes access the key via `process.env.ANTHROPIC_API_KEY`. The `claudeClient.ts` wrapper handles this.

---

## Appendix C: Dependency List (Locked)

Only P1 may modify this list. Request new packages via GitHub Issue.

```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "@anthropic-ai/sdk": "latest",
    "recharts": "^2.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/react": "^18.x",
    "@types/node": "^20.x",
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x"
  }
}
```

Additional packages require P1 approval. Open an Issue with: package name, why you need it, and which feature uses it.
