# Talk to Your Finances

An AI-powered personal finance app that replaces passive dashboards with conversational, emotionally engaging financial insights. Built for the PDAI course (Prototyping with Digital and AI) at ESADE, taught by Professor Jose A. Rodriguez-Serrano.

**Live demo**: [talk-to-your-finances.vercel.app](https://talk-to-your-finances.vercel.app)

## Team

| Member | Role | Ownership |
|--------|------|-----------|
| **Sean** (P1) | Foundation & Data Layer | Types, mock data, Claude client, data utilities, context builder |
| **Ella** (P2) | Conversational Chat | Chat view, message history, on-topic filtering, suggested questions |
| **Pau** (P3) | Simulator, Roast & Diary | Monte Carlo engine, ML integration, RAG retriever, anomaly display, LLM validation |
| **Carlos** (P4) | Dashboard & UI | Dashboard components, balance charts, spending breakdown, theme system |

## What the App Does

The app has five views, each using Claude (Anthropic's LLM) differently:

- **Dashboard** - Balance history, monthly spending bars, category breakdown, transaction list, and upcoming bills. Time-period filtering (1M/3M/6M/All) recomputes every metric on the fly.

- **Chat** - Natural language Q&A over your transaction history. Ask "What did I spend on restaurants in January?" and get a grounded answer. Conversation history is preserved across turns, off-topic messages are filtered, and responses are capped at 1200 characters.

- **Simulator** - Type a purchase ("MacBook Pro" or "$200 sneakers") and the app runs a 500-scenario Monte Carlo simulation. It fetches live macroeconomic indicators from the World Bank API, applies an ML spending prediction model, projects your balance over 6 months with P10/P50/P90 confidence bands, and returns a risk assessment. Claude writes the narrative interpretation; all numbers come from the simulation engine.

- **Roast My Spending** - A brutally honest AI comedian reviews your weekly or monthly spending. The roast is grounded using a RAG pipeline: precomputed sentence-transformer embeddings of a financial knowledge base are matched via cosine similarity to your spending profile, and the top-k chunks are injected into Claude's prompt. Your k-means spending persona (e.g., "The Weekend Spender") shapes the tone.

- **Your Money's Diary** - First-person narrative written from your money's perspective. Select a month and Claude generates a literary diary entry referencing specific merchants, categories, and amounts. The view also shows Isolation Forest anomaly flags with per-transaction explanations and a collapsible month-by-category spend heatmap.

## Tech Stack

| Layer | Tools |
|-------|-------|
| Frontend | React 18, TypeScript, Next.js 14 (App Router), Tailwind CSS, recharts, framer-motion |
| Backend | Next.js API routes, Anthropic SDK (`claude-sonnet-4-20250514`), Zod schema validation |
| ML Pipeline | Python 3, scikit-learn (Ridge, GradientBoosting, RandomForest, IsolationForest, KMeans), sentence-transformers |
| Embeddings | `all-MiniLM-L6-v2` (384-dim, runs fully local, no API calls) |
| Deployment | Vercel |

## Architecture

```
transactions_training_data.csv
        |
        v
  Python ML Pipeline (offline, run once)
  ├── train_spending_model.py    -> models/spending_model.json
  ├── anomaly_detection.py       -> public/anomaly_scores.json
  ├── persona_clustering.py      -> public/persona.json
  └── precompute_embeddings.py   -> public/finance_embeddings.json
                                          |
                                          v
                              Next.js App (runtime)
                              ├── /api/chat      -> Claude (conversational Q&A)
                              ├── /api/simulate  -> Monte Carlo + Claude (narrative)
                              ├── /api/roast     -> RAG + Claude (grounded roast)
                              └── /api/diary     -> Claude (first-person narrative)
```

## Views in Detail

### Dashboard

**What the user sees:** Balance history line chart, monthly spending bars, category breakdown donut, scrollable transaction list, upcoming bills, and account cards. A time-period filter (1M/3M/6M/All) recomputes every metric on the fly.

**Under the hood:** All data is client-side. The `useFinancialData` hook wraps the deterministic mock data generator and exposes computed metrics (totals, breakdowns, balance history). Charts are rendered with recharts (`BalanceChart`, `CategoryBreakdown`). No API calls are made — the dashboard is a pure data-visualization layer.

### Chat

**What the user sees:** A conversational interface styled like a messaging app. The user types a question (or picks a suggested question) and receives a grounded answer about their spending. Conversation history is preserved across turns.

**Under the hood:** `ChatView` manages message state and sends `{ message, history }` to `/api/chat`. The API route builds a compressed financial context (last 6 months of categorised spending, top merchants, recent transactions) via `buildLLMContext`, injects it as a system prompt, and sends the conversation to Claude. Claude responds with a JSON object containing `{ reply, isOnTopic }`. Off-topic messages are filtered server-side — if `isOnTopic` is false, a redirect message is returned instead. Replies are capped at 1,200 characters. History is trimmed to the last 12 messages to stay within the context window.

### Simulator

**What the user sees:** A purchase input field ("MacBook Pro" or "$200 sneakers"), followed by risk badges (low/medium/high, can-afford), a Claude-written narrative analysis, a 6-month projection chart with P10/P50/P90 confidence bands, an ML-predicted category forecast bar chart, and a savings runway calculator.

**Under the hood:** This is the most complex route. The full data flow:
1. Parse purchase description and optional amount from the request body
2. If no amount is provided, ask Claude to estimate the price
3. Compute a personal finance model from transaction history (avg income, avg expenses, expense std dev, top categories)
4. Fetch macroeconomic indicators from World Bank (inflation, GDP growth, unemployment, real interest rate) and exchange rates from Frankfurter API
5. Load the pre-trained spending model and generate an ML prediction for the current month
6. Run 500 Monte Carlo simulations using Box-Muller normal sampling, inflation-adjusted expenses, and income risk multipliers
7. Compute P10/P50/P90 percentiles at each month and a deterministic risk assessment
8. Send all numeric results to Claude as context; Claude writes the narrative interpretation only
9. Validate Claude's JSON output against a Zod schema; retry once on failure; fall back to a typed default if both attempts fail

The category forecast and savings runway sections are computed entirely client-side from `spending_model.json` — they render immediately without an API call.

### Roast My Spending

**What the user sees:** A period toggle (Past Week / Past Month), a "Roast Me" button, their k-means spending persona card, the roast itself (3-4 paragraphs of targeted financial comedy), a summary card (total spent, worst category, wildest transaction, estimated savings potential), and a collapsible "Grounding Sources" section showing which knowledge base chunks informed the roast.

**Under the hood:** Before calling the API, the frontend runs the full RAG pipeline client-side:
1. Lazy-loads precomputed sentence-transformer embeddings and the financial knowledge base on first request
2. Builds a spending profile query from category percentages, savings rate, and persona label
3. Runs hybrid retrieval: keyword overlap (60% weight) + cosine similarity against 384-dim embeddings (40% weight), returning the top-4 chunks
4. Formats the retrieved chunks into a `ragContext` block and sends it alongside the period and persona to `/api/roast`

The API route filters transactions to the selected period, computes category totals and top merchants, injects the RAG context and persona into Claude's system prompt, and requests a roast. The response is validated against a Zod schema. The `savingsPotential` estimate is clamped to the actual total spent as a sanity check.

### Your Money's Diary

**What the user sees:** A month picker (Jan–Apr 2020) with arrow navigation, a "Generate Diary" button, the diary entry itself (4-6 paragraphs of first-person narrative from the money's perspective), highlight badges, a list of Isolation Forest anomaly-flagged transactions with expandable explanations, and a collapsible month-by-category spending heatmap.

**Under the hood:** `DiaryView` sends the selected month to `/api/diary`. The API route filters transactions to that month, computes income/expense totals, builds a list of top categories and merchant names, and prompts Claude to write a first-person diary entry as the user's money — referencing specific merchants, amounts, and categories. The response is validated to ensure a narrative (100-8,000 chars) and 1-6 highlight strings.

Anomaly detection is client-side: the component fetches `anomaly_scores.json` on mount and cross-references it with the month's transactions. Flagged transactions display an orange dot; clicking it expands a human-readable explanation (e.g., "This groceries spend is 3.2x your monthly average"). The `SpendHeatmap` component renders a months-by-categories grid with intensity-scaled cells.

## API Routes

All four API routes follow the same pattern: they are Next.js App Router `POST` handlers in `src/app/api/`, they share the same `callClaude` wrapper, and they return a consistent `APIResponse<T>` envelope (`{ success, data?, error? }`).

| Route | Receives | Returns | Claude's role |
|-------|----------|---------|---------------|
| `/api/chat` | `{ message, history }` | `{ reply }` | Answers the user's question grounded in financial context; classifies on-topic/off-topic |
| `/api/simulate` | `{ purchaseDescription, amount? }` | `{ analysis, projectedBalances, canAfford, riskLevel }` | Writes narrative interpretation of pre-computed simulation results; optionally estimates purchase price |
| `/api/roast` | `{ period, persona?, ragContext? }` | `{ roastText, weekSummary, savingsPotential }` | Generates a humorous spending critique grounded in RAG-retrieved financial knowledge |
| `/api/diary` | `{ month }` | `{ narrative, highlights, totalSpent, totalIncome }` | Writes a first-person diary entry from the money's perspective |

**LLM output validation** is shared across all routes via `llmValidation.ts`. The pipeline: (1) extract the first JSON object from the raw response (handles code fences and prose), (2) validate against a route-specific Zod schema, (3) on failure, retry once with an error-correcting prompt suffix, (4) fall back to a typed default if both attempts fail. This ensures every route returns well-typed data even if Claude produces malformed output.

**Context building** is handled by `buildLLMContext.ts`, which compresses the full transaction dataset into a ~2,000-token system prompt: user profile, dataset overview, top merchants, 6 months of categorised spending summaries, and the 10 most recent transactions.

## RAG System

The Roast feature uses a lightweight retrieval-augmented generation pipeline to prevent generic financial advice. The system has three parts:

**Knowledge base** (`src/data/finance_knowledge_base.json`): 30 hand-curated chunks covering dining benchmarks, subscription traps, savings rules, grocery optimisation, and spending psychology. Each chunk has an ID, topic, text, and keyword tags. Example: "Food delivery apps add a 30-40% markup compared to ordering directly."

**Precomputed embeddings** (`public/finance_embeddings.json`): Each chunk is encoded offline by `precompute_embeddings.py` using `all-MiniLM-L6-v2` (384-dimensional vectors, runs entirely on CPU, no API calls). The embeddings are serialised to JSON and served as a static asset.

**Hybrid retrieval** (`src/utils/ragRetriever.ts`, runs in the browser):
1. Build a user profile query string from spending category percentages, savings rate, and persona label
2. Construct a bag-of-characters query vector (character codes mapped into a 384-dim vector, then L2-normalised)
3. For each chunk, compute two scores:
   - **Keyword overlap** (60% weight): count of shared tokens between query and chunk tags/topic
   - **Cosine similarity** (40% weight): dot product between query vector and precomputed embedding
4. Blend scores, sort descending, return top-4 chunks
5. Format chunks into a prompt block and inject into Claude's system prompt

This hybrid approach means the retriever works without a live embedding model at runtime — all the expensive computation happens offline.

## Anomaly Detection

Unusual transactions are flagged by an Isolation Forest model trained offline in `scripts/anomaly_detection.py`:

1. **Feature engineering**: Each transaction is represented by its amount, day-of-week (0-6), and one-hot-encoded category
2. **Model**: scikit-learn `IsolationForest` with a 5% contamination rate (expects ~5% of transactions to be anomalous)
3. **Explanation generation**: For each flagged transaction, the script computes how the amount compares to the category's monthly average and generates a human-readable reason (e.g., "This groceries spend is 3.2x your monthly average")
4. **Output**: Per-transaction anomaly scores, boolean labels, and reasons are written to `public/anomaly_scores.json`

At runtime, `DiaryView` fetches this JSON on mount and cross-references it with the current month's transactions. Anomalous transactions appear in a dedicated "Unusual Transactions" panel with expandable explanations.

## Spending Personas

The persona system uses k-means clustering to assign each user a spending personality:

1. **Feature matrix**: `persona_clustering.py` pivots transactions into a months-by-categories matrix and standardises with `StandardScaler`
2. **Clustering**: KMeans with k=4 clusters; the dominant cluster is matched to a predefined persona by comparing category signal strengths
3. **Four personas**:
   - **The Weekend Spender** — disproportionate entertainment and restaurant spending
   - **The Subscription Hoarder** — high recurring subscription costs relative to income
   - **The Grocery Optimizer** — spending concentrated in essentials, low discretionary
   - **The Lifestyle Inflater** — spending scales with (or exceeds) income across all categories
4. **Output**: The persona label, a description, and top deviation features are written to `public/persona.json`

The persona surfaces in two places: as a card in the Roast view (showing the label, description, and trait badges) and as context injected into Claude's roast prompt to shape the tone and targets of the critique.

## Frontend Architecture

**View-based layout**: The app is wrapped in an `IPhoneFrame` component that renders a phone-shaped container. A `LoginPage` with a particle-text animation gates entry. Once logged in, five views (Dashboard, Chat, Simulator, Roast, Diary) are swapped via a `TabNav` bottom navigation bar. The active tab ID is lifted to the root `page.tsx` component; each tab renders its corresponding view component.

**Component organisation**: Components are grouped by feature (`Chat/`, `Dashboard/`, `Diary/`, `Roast/`, `Simulator/`) with shared UI primitives in `ui/` (Button, Card, Input, LoadingSpinner, AnimateIn). Each feature folder contains a main view component and its sub-components (e.g., `ChatView` + `ChatBubble` + `ChatInput` + `SuggestedQuestions`).

**Theme system**: A `ThemeProvider` wraps the app in a React context that exposes `{ theme, toggle }`. The theme defaults to dark mode and persists to `localStorage`. Toggling adds/removes a `dark` class on `<html>`, which drives CSS custom properties for all colours (backgrounds, text, borders, accent). The entire UI adapts — no component-level theme logic needed.

**Charts**: All data visualisations use recharts — `AreaChart` for balance history and Monte Carlo projections (with gradient fills for confidence bands), `BarChart` for monthly spending and category forecasts, and a custom `SpendHeatmap` component for the month-by-category grid in the Diary view.

**Animations**: framer-motion handles page transitions (`AnimatePresence`), chat bubble entrances, loading indicators (bouncing dots, typing dots), and fade-in effects on API results. The `AnimateIn` utility component provides reusable scroll-triggered animations.

## ML Pipeline

All scripts live in `scripts/` and read from the same transaction CSV. They run offline and produce JSON artifacts consumed at runtime.

### Spending Prediction (`train_spending_model.py`)
- Aggregates transactions into monthly totals by category
- Engineers 12+ features: lag-1/2/3, rolling mean and std, sine/cosine month encoding, quarter, holiday/summer flags, active category count, top-category share
- Trains Ridge, RandomForest, and GradientBoosting with GridSearchCV over TimeSeriesSplit (3-fold)
- Selects the best model by validation MAE (Ridge won with test R² = 0.97, MAE = $923)
- Exports monthly baselines, per-category predictions, feature importances, lag sensitivity, and trend coefficient to `models/spending_model.json`

### Anomaly Detection (`anomaly_detection.py`)
- Builds features from amount, day-of-week, and encoded category
- Trains an IsolationForest with 5% contamination rate
- For each flagged transaction, generates a human-readable reason (e.g., "This groceries spend is 3.2x your monthly average")
- Outputs per-transaction anomaly scores and labels to `public/anomaly_scores.json`

### Persona Clustering (`persona_clustering.py`)
- Pivots transactions into a months-by-categories matrix, standardizes with StandardScaler
- Runs KMeans (k=4) and matches the dominant cluster to one of four predefined personas by comparing category signal strengths
- Personas: The Weekend Spender, The Subscription Hoarder, The Grocery Optimizer, The Lifestyle Inflater
- Outputs label, description, and top deviation features to `public/persona.json`

### Embedding Precomputation (`precompute_embeddings.py`)
- Loads a 30-chunk financial knowledge base (`src/data/finance_knowledge_base.json`) covering dining benchmarks, subscription traps, savings rules, and spending psychology
- Encodes each chunk with `all-MiniLM-L6-v2` (384-dimensional vectors, runs entirely on CPU)
- Saves ID, topic, and embedding vector to `public/finance_embeddings.json`
- At runtime, the RAG retriever builds a bag-of-characters query vector, computes cosine similarity against precomputed embeddings, blends with keyword overlap (60% keyword / 40% embedding), and returns the top-4 chunks

## Key Technical Decisions

- **All simulation numbers are computed server-side, not by the LLM.** Claude only writes the narrative interpretation. This prevents hallucinated financial projections.
- **LLM output validation** uses a three-stage pipeline: extract JSON from raw response (handles code fences and prose), validate against a Zod schema, retry with an error-correcting prompt, and fall back to a typed default. Every API route uses this pattern.
- **RAG grounding** for the roast feature prevents generic financial advice. The knowledge base contains specific, evidence-based claims (e.g., "food delivery apps add a 30-40% markup") that are injected into the prompt based on the user's actual spending profile.
- **Macroeconomic data is live.** The simulator fetches current inflation, GDP, and unemployment from the World Bank API for the user's currency region, with 5-second timeouts and hardcoded fallbacks.
- **The ML model is a static JSON artifact**, not a live Python server. The pre-trained model's predictions and feature importances are serialized to JSON and imported directly into the TypeScript API route. No Python runtime is needed in production.

## Running Locally

### Prerequisites
- Node.js 18+
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))
- Python 3.9+ (only if regenerating ML artifacts)

### Quick Start

```bash
# Install dependencies
npm install

# Create environment file
echo "ANTHROPIC_API_KEY=your_key_here" > .env.local

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Regenerating ML Artifacts

If you modify the training data or want to re-run the pipeline:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run each script (order matters for embeddings)
python scripts/train_spending_model.py      # -> models/spending_model.json
python scripts/anomaly_detection.py         # -> public/anomaly_scores.json
python scripts/persona_clustering.py        # -> public/persona.json
python scripts/precompute_embeddings.py     # -> public/finance_embeddings.json
```

The embedding script downloads `all-MiniLM-L6-v2` (~80MB) on first run. No GPU required.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript type checking |
| `npm run test` | Run LLM validation unit tests |

## Project Structure

```
.
├── models/
│   └── spending_model.json          # Pre-trained spending prediction artifact
├── public/
│   ├── anomaly_scores.json          # Per-transaction anomaly flags and scores
│   ├── finance_embeddings.json      # Precomputed 384-dim sentence embeddings
│   ├── finance_knowledge_base.json  # RAG knowledge base (30 financial chunks)
│   └── persona.json                 # K-means spending persona assignment
├── scripts/
│   ├── train_spending_model.py      # Ridge/RF/GBR training with GridSearchCV
│   ├── anomaly_detection.py         # IsolationForest anomaly pipeline
│   ├── persona_clustering.py        # KMeans spending persona assignment
│   ├── precompute_embeddings.py     # Sentence-transformer embedding generation
│   └── test_train_spending_model.py # Training pipeline tests
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts        # Conversational Q&A endpoint
│   │   │   ├── simulate/route.ts    # Monte Carlo simulation endpoint
│   │   │   ├── roast/route.ts       # RAG-grounded roast endpoint
│   │   │   └── diary/route.ts       # Narrative diary endpoint
│   │   ├── layout.tsx               # Root layout with ThemeProvider
│   │   └── page.tsx                 # Main app shell with tab navigation
│   ├── components/
│   │   ├── Chat/                    # ChatView, ChatBubble, ChatInput, SuggestedQuestions
│   │   ├── Dashboard/               # DashboardView, BalanceChart, CategoryBreakdown, etc.
│   │   ├── Diary/                   # DiaryView, DiaryEntry, SpendHeatmap
│   │   ├── Login/                   # LoginPage (entry animation)
│   │   ├── Roast/                   # RoastView, RoastCard
│   │   ├── Simulator/               # SimulatorView, PurchaseInput, ImpactTimeline
│   │   └── ui/                      # Shared components (Button, Card, TabNav, ThemeProvider, etc.)
│   ├── data/
│   │   ├── constants.ts             # App-wide constants (categories, date range, seed)
│   │   ├── finance_knowledge_base.json  # Source knowledge base for RAG
│   │   └── mockData.ts             # Deterministic synthetic transaction generator
│   ├── hooks/
│   │   └── useFinancialData.ts      # React hook wrapping mock data with computed metrics
│   ├── types/
│   │   └── index.ts                 # Shared TypeScript interfaces
│   └── utils/
│       ├── buildLLMContext.ts        # Compresses transaction data into Claude system prompt
│       ├── claudeClient.ts          # Anthropic SDK wrapper
│       ├── dataUtils.ts             # Pure financial computation functions
│       ├── llmValidation.ts         # JSON extraction, Zod validation, retry logic
│       └── ragRetriever.ts          # Cosine similarity RAG retrieval (browser-side)
├── .env.example                     # Environment variable template
├── package.json
├── requirements.txt                 # Python dependencies for ML pipeline
├── tailwind.config.js
└── tsconfig.json
```

## Course Context

Built for the Prototyping with Digital and AI (PDAI) course at ESADE Business School, Spring 2026. The assignment required a functional prototype demonstrating meaningful integration of AI capabilities, not just a wrapper around an API call. This project uses Claude as one component within a larger system that includes offline ML training, real-time macroeconomic data, statistical simulation, and retrieval-augmented generation.
