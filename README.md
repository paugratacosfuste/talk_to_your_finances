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

**Data flow for Simulator** (the most complex route):
1. Parse purchase description and optional amount from the request body
2. If no amount is provided, ask Claude to estimate the price
3. Compute a personal finance model from transaction history (avg income, avg expenses, expense std dev, top categories)
4. Fetch macroeconomic indicators from World Bank (inflation, GDP growth, unemployment, real interest rate) and exchange rates from Frankfurter API
5. Load the pre-trained spending model and generate an ML prediction for the current month
6. Run 500 Monte Carlo simulations using Box-Muller normal sampling, inflation-adjusted expenses, and income risk multipliers
7. Compute P10/P50/P90 percentiles at each month and a deterministic risk assessment
8. Send all numeric results to Claude as context; Claude writes the narrative interpretation only
9. Validate Claude's JSON output against a Zod schema; retry once on failure; fall back to a typed default if both attempts fail

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
