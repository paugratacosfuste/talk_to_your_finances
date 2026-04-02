import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/utils/claudeClient";
import { buildLLMContext } from "@/utils/buildLLMContext";
import { getMockData } from "@/data/mockData";
import type { SimulationResult, APIResponse, Transaction, UserProfile } from "@/types";
import spendingModel from "../../../../models/spending_model.json";

// ---------------------------------------------------------------------------
// Internal types (not exported, not in src/types/)
// ---------------------------------------------------------------------------

interface MacroIndicators {
  inflationRate: number;
  gdpGrowth: number;
  unemploymentRate: number;
  realInterestRate: number;
  exchangeRateToUSD: number | null;
  dataSource: "live" | "fallback";
}

interface PersonalFinanceModel {
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  expenseStdDev: number;
  netMonthlyCashFlow: number;
  monthsOfData: number;
  topExpenseCategories: { category: string; amount: number }[];
}

interface MLPrediction {
  predictedMonthlyExpenses: number;
  predictionSource: "ml-model" | "historical-average";
  modelMetrics: { r2: number; mae: number; rmse: number };
  categoryBreakdown: Record<string, number>;
}

interface MonteCarloProjection {
  date: string;
  withPurchase: number;
  withoutPurchase: number;
  withPurchaseP10: number;
  withPurchaseP90: number;
  withoutPurchaseP10: number;
  withoutPurchaseP90: number;
}

// ---------------------------------------------------------------------------
// Layer 1: Macroeconomic Data Fetch
// ---------------------------------------------------------------------------

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  ZAR: "ZA",
  USD: "US",
  EUR: "EMU",
  GBP: "GB",
  BRL: "BR",
  INR: "IN",
  JPY: "JP",
  AUD: "AU",
  CAD: "CA",
  MXN: "MX",
  CHF: "CH",
  CNY: "CN",
  KRW: "KR",
  SEK: "SE",
  NOK: "NO",
};

const DEFAULT_COUNTRY = "WLD"; // World average fallback

const CURRENCY_TO_COUNTRY_NAME: Record<string, string> = {
  ZAR: "South Africa",
  USD: "United States",
  EUR: "Eurozone",
  GBP: "United Kingdom",
  BRL: "Brazil",
  INR: "India",
  JPY: "Japan",
  AUD: "Australia",
  CAD: "Canada",
  MXN: "Mexico",
  CHF: "Switzerland",
  CNY: "China",
  KRW: "South Korea",
  SEK: "Sweden",
  NOK: "Norway",
};

async function fetchWorldBankIndicator(
  countryCode: string,
  indicatorCode: string,
  fallback: number
): Promise<number> {
  try {
    const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicatorCode}?format=json&per_page=5&date=2020:2026`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return fallback;

    const json = await response.json();
    if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) {
      return fallback;
    }

    // Entries are sorted most-recent-first; find first non-null value
    for (const entry of json[1]) {
      if (entry.value !== null && entry.value !== undefined) {
        return Number(entry.value);
      }
    }
    return fallback;
  } catch {
    return fallback;
  }
}

async function fetchExchangeRate(currency: string): Promise<number | null> {
  try {
    const url = `https://api.frankfurter.dev/v2/rates?base=${currency}&quotes=USD`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;

    const json = await response.json();
    return json.rates?.USD ?? null;
  } catch {
    return null;
  }
}

async function fetchMacroIndicators(currency: string): Promise<MacroIndicators> {
  const countryCode = CURRENCY_TO_COUNTRY[currency] ?? DEFAULT_COUNTRY;

  const results = await Promise.allSettled([
    fetchWorldBankIndicator(countryCode, "FP.CPI.TOTL.ZG", 5.0),
    fetchWorldBankIndicator(countryCode, "NY.GDP.MKTP.KD.ZG", 1.5),
    fetchWorldBankIndicator(countryCode, "SL.UEM.TOTL.ZS", 6.0),
    fetchWorldBankIndicator(countryCode, "FR.INR.RINR", 2.5),
    currency !== "USD" ? fetchExchangeRate(currency) : Promise.resolve(null),
  ]);

  const get = <T>(r: PromiseSettledResult<T>, fb: T): T =>
    r.status === "fulfilled" ? r.value : fb;

  const hasLiveData = results.slice(0, 4).some((r) => r.status === "fulfilled");

  return {
    inflationRate: get(results[0], 5.0) as number,
    gdpGrowth: get(results[1], 1.5) as number,
    unemploymentRate: get(results[2], 6.0) as number,
    realInterestRate: get(results[3], 2.5) as number,
    exchangeRateToUSD: get(results[4], null) as number | null,
    dataSource: hasLiveData ? "live" : "fallback",
  };
}

// ---------------------------------------------------------------------------
// Layer 2: Personal Finance Model
// ---------------------------------------------------------------------------

function computePersonalFinanceModel(
  transactions: Transaction[]
): PersonalFinanceModel {
  const monthlyData: Record<string, { income: number; expenses: number }> = {};

  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0 };
    if (t.type === "credit") {
      monthlyData[month].income += t.amount;
    } else {
      monthlyData[month].expenses += Math.abs(t.amount);
    }
  }

  const months = Object.keys(monthlyData);
  const monthCount = months.length || 1;

  const totalIncome = months.reduce((s, m) => s + monthlyData[m].income, 0);
  const totalExpenses = months.reduce((s, m) => s + monthlyData[m].expenses, 0);
  const avgMonthlyIncome = totalIncome / monthCount;
  const avgMonthlyExpenses = totalExpenses / monthCount;

  // Expense volatility: standard deviation of monthly expenses
  const expenseValues = months.map((m) => monthlyData[m].expenses);
  const mean = avgMonthlyExpenses;
  const variance =
    expenseValues.reduce((s, v) => s + (v - mean) ** 2, 0) / monthCount;
  const expenseStdDev = Math.sqrt(variance);

  // Top expense categories by monthly average
  const categoryTotals: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === "debit") {
      categoryTotals[t.category] =
        (categoryTotals[t.category] ?? 0) + Math.abs(t.amount);
    }
  }
  const topExpenseCategories = Object.entries(categoryTotals)
    .map(([category, total]) => ({
      category,
      amount: Math.round(total / monthCount),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    avgMonthlyIncome: Math.round(avgMonthlyIncome),
    avgMonthlyExpenses: Math.round(avgMonthlyExpenses),
    expenseStdDev: Math.round(expenseStdDev),
    netMonthlyCashFlow: Math.round(avgMonthlyIncome - avgMonthlyExpenses),
    monthsOfData: monthCount,
    topExpenseCategories,
  };
}

// ---------------------------------------------------------------------------
// Layer 2b: ML-Enhanced Spending Prediction
// ---------------------------------------------------------------------------

function getMLPrediction(
  model: PersonalFinanceModel,
): MLPrediction {
  const currentMonth = new Date().getMonth() + 1;
  const monthKey = String(currentMonth);

  const baseline = spendingModel.predictions.monthly_baseline[
    monthKey as keyof typeof spendingModel.predictions.monthly_baseline
  ];

  if (baseline === undefined) {
    return {
      predictedMonthlyExpenses: model.avgMonthlyExpenses,
      predictionSource: "historical-average",
      modelMetrics: spendingModel.evaluation as MLPrediction["modelMetrics"],
      categoryBreakdown: {},
    };
  }

  // Adjust baseline using recent spending deviation and lag sensitivity
  const historicalAvg = model.avgMonthlyExpenses || 1;
  const recentDeviation = (model.avgMonthlyExpenses - historicalAvg) / historicalAvg;
  const adjustedPrediction = baseline * (1 + spendingModel.adjustments.lag_sensitivity * recentDeviation);

  const categoryPreds = spendingModel.predictions.category_predictions[
    monthKey as keyof typeof spendingModel.predictions.category_predictions
  ] ?? {};

  return {
    predictedMonthlyExpenses: Math.max(0, Math.round(adjustedPrediction)),
    predictionSource: "ml-model",
    modelMetrics: {
      r2: spendingModel.evaluation.test_r2,
      mae: spendingModel.evaluation.test_mae,
      rmse: spendingModel.evaluation.test_rmse,
    },
    categoryBreakdown: categoryPreds as Record<string, number>,
  };
}

// ---------------------------------------------------------------------------
// Layer 3: Monte Carlo Projection Engine (500 simulations)
// ---------------------------------------------------------------------------

function boxMullerRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function runMonteCarloSimulation(
  profile: UserProfile,
  model: PersonalFinanceModel,
  macro: MacroIndicators,
  mlPrediction: MLPrediction,
  purchaseAmount: number,
  projectionMonths: number = 6,
  numSimulations: number = 500
): MonteCarloProjection[] {
  const now = new Date();

  // Monthly inflation factor from annual rate
  const monthlyInflation =
    Math.pow(1 + macro.inflationRate / 100, 1 / 12) - 1;

  // Income risk adjustment based on macro conditions
  let incomeMultiplier = 1.0;
  if (macro.gdpGrowth < 0) incomeMultiplier *= 0.95;
  if (macro.unemploymentRate > 10) incomeMultiplier *= 0.97;

  // Use ML-predicted expenses as the base instead of naive historical average
  const baseExpenses = mlPrediction.predictedMonthlyExpenses;

  // Run N simulations, store final balances per month
  const withoutResults: number[][] = Array.from(
    { length: projectionMonths },
    () => []
  );
  const withResults: number[][] = Array.from(
    { length: projectionMonths },
    () => []
  );

  for (let sim = 0; sim < numSimulations; sim++) {
    let balanceWithout = profile.currentBalance;
    let balanceWith = profile.currentBalance - purchaseAmount;

    for (let m = 0; m < projectionMonths; m++) {
      // For future months, look up the ML baseline for that specific month
      const futureMonth = ((now.getMonth() + m + 1) % 12) + 1;
      const futureMonthKey = String(futureMonth);
      const monthBaseline = spendingModel.predictions.monthly_baseline[
        futureMonthKey as keyof typeof spendingModel.predictions.monthly_baseline
      ] ?? baseExpenses;

      // Sample expenses from normal distribution using Box-Muller
      const z = boxMullerRandom();
      const inflatedExpenses =
        monthBaseline * Math.pow(1 + monthlyInflation, m + 1);
      const sampledExpenses = Math.max(0, inflatedExpenses + z * model.expenseStdDev);

      const adjustedIncome = model.avgMonthlyIncome * incomeMultiplier;

      balanceWithout += adjustedIncome - sampledExpenses;
      balanceWith += adjustedIncome - sampledExpenses;

      withoutResults[m].push(balanceWithout);
      withResults[m].push(balanceWith);
    }
  }

  // Compute percentiles at each month
  const projections: MonteCarloProjection[] = [];

  for (let m = 0; m < projectionMonths; m++) {
    const future = new Date(now.getFullYear(), now.getMonth() + m + 1, 1);
    const dateStr = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}`;

    const wpSorted = withResults[m].slice().sort((a, b) => a - b);
    const wopSorted = withoutResults[m].slice().sort((a, b) => a - b);

    const p10 = Math.floor(numSimulations * 0.1);
    const p50 = Math.floor(numSimulations * 0.5);
    const p90 = Math.floor(numSimulations * 0.9);

    projections.push({
      date: dateStr,
      withPurchase: Math.round(wpSorted[p50]),
      withoutPurchase: Math.round(wopSorted[p50]),
      withPurchaseP10: Math.round(wpSorted[p10]),
      withPurchaseP90: Math.round(wpSorted[p90]),
      withoutPurchaseP10: Math.round(wopSorted[p10]),
      withoutPurchaseP90: Math.round(wopSorted[p90]),
    });
  }

  return projections;
}

// ---------------------------------------------------------------------------
// Layer 4: Risk Assessment (deterministic rules)
// ---------------------------------------------------------------------------

function computeRiskAssessment(
  projections: MonteCarloProjection[],
  model: PersonalFinanceModel
): { canAfford: boolean; riskLevel: "low" | "medium" | "high" } {
  // Use P10 (pessimistic) scenario for conservative risk assessment
  const canAfford = projections.every((p) => p.withPurchaseP10 >= 0);

  const minBalance = Math.min(...projections.map((p) => p.withPurchaseP10));
  const monthlyExpenses = model.avgMonthlyExpenses || 1;

  if (minBalance < 0 || minBalance < monthlyExpenses) {
    return { canAfford, riskLevel: "high" };
  } else if (minBalance < 2 * monthlyExpenses) {
    return { canAfford, riskLevel: "medium" };
  } else {
    return { canAfford, riskLevel: "low" };
  }
}

// ---------------------------------------------------------------------------
// Claude Narrative Prompt (interpretation only — no number generation)
// ---------------------------------------------------------------------------

function buildNarrativePrompt(
  baseContext: string,
  profile: UserProfile,
  model: PersonalFinanceModel,
  macro: MacroIndicators,
  mlPrediction: MLPrediction,
  projections: MonteCarloProjection[],
  risk: { canAfford: boolean; riskLevel: "low" | "medium" | "high" },
  purchaseDescription: string,
  purchaseAmount: number
): { systemPrompt: string; userMessage: string } {
  const lastMonth = projections[projections.length - 1];
  const minP10 = Math.min(...projections.map((p) => p.withPurchaseP10));

  const systemPrompt = `${baseContext}

You are a sharp, empathetic financial advisor interpreting a MONTE CARLO financial simulation (500 scenarios). All numbers, projections, and risk scores below were computed by a simulation engine using real financial data, macroeconomic indicators, and expense volatility modeling. Your job is to write a rich narrative that explains the results — do NOT change any numbers or override the risk assessment.

PERSONAL FINANCE (from transaction history, ${model.monthsOfData} months of data):
- Current balance: ${profile.currentBalance} ${profile.currency}
- Avg monthly income: ${model.avgMonthlyIncome} ${profile.currency}
- Avg monthly expenses: ${model.avgMonthlyExpenses} ${profile.currency}
- Net monthly cash flow: ${model.netMonthlyCashFlow} ${profile.currency}
- Expense volatility (std dev): ${model.expenseStdDev} ${profile.currency}
- Top spending: ${model.topExpenseCategories.map((c) => `${c.category}: ${c.amount}/mo`).join(", ")}

MACROECONOMIC INDICATORS (${macro.dataSource} data for ${CURRENCY_TO_COUNTRY_NAME[profile.currency] ?? "World average"}):
- Inflation: ${macro.inflationRate.toFixed(1)}% annually
- GDP growth: ${macro.gdpGrowth.toFixed(1)}%
- Unemployment: ${macro.unemploymentRate.toFixed(1)}%
- Real interest rate: ${macro.realInterestRate.toFixed(1)}%${macro.exchangeRateToUSD !== null ? `\n- Exchange rate: 1 ${profile.currency} = ${macro.exchangeRateToUSD.toFixed(4)} USD` : ""}

ML SPENDING PREDICTION (${mlPrediction.predictionSource === "ml-model" ? `${spendingModel.model_type} model, R²=${mlPrediction.modelMetrics.r2}` : "historical average fallback"}):
- Predicted monthly expenses: ${mlPrediction.predictedMonthlyExpenses} ${profile.currency}
- Model accuracy: MAE=${mlPrediction.modelMetrics.mae}, RMSE=${mlPrediction.modelMetrics.rmse}
- Top predicted categories this month: ${Object.entries(mlPrediction.categoryBreakdown).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 5).map(([cat, amt]) => `${cat}: ${Math.round(amt as number)}`).join(", ")}

PURCHASE: "${purchaseDescription}" for ${purchaseAmount} ${profile.currency}
SIMULATION RESULT: canAfford = ${risk.canAfford} (based on pessimistic P10 scenario), riskLevel = ${risk.riskLevel}

MONTE CARLO PROJECTED BALANCES (500 simulations, with purchase):
${projections.map((p) => `  ${p.date}: P10 (pessimistic) = ${p.withPurchaseP10}, P50 (median) = ${p.withPurchase}, P90 (optimistic) = ${p.withPurchaseP90}`).join("\n")}

MONTE CARLO PROJECTED BALANCES (500 simulations, without purchase):
${projections.map((p) => `  ${p.date}: P10 = ${p.withoutPurchaseP10}, P50 = ${p.withoutPurchase}, P90 = ${p.withoutPurchaseP90}`).join("\n")}

KEY STATS:
- Worst-case (P10) minimum balance with purchase: ${minP10} ${profile.currency}
- Median balance at 6 months with purchase: ${lastMonth.withPurchase} ${profile.currency}
- Median balance at 6 months without purchase: ${lastMonth.withoutPurchase} ${profile.currency}
- Spread at 6 months (P90 - P10) with purchase: ${lastMonth.withPurchaseP90 - lastMonth.withPurchaseP10} ${profile.currency}

NARRATIVE GUIDELINES:
- Write 2-3 paragraphs, conversational but data-driven
- This is a Monte Carlo simulation — reference the range of outcomes naturally: "In the median scenario, your balance will be X. Even in a pessimistic scenario (10th percentile), you'd still have Y."
- Mention the confidence band spread to convey uncertainty: "Your balance could range from X to Y depending on spending variability"
- Macroeconomic data is sourced for ${CURRENCY_TO_COUNTRY_NAME[profile.currency] ?? "the global economy"} based on the user's ${profile.currency} currency — mention this naturally
- Reference specific numbers: balance, cash flow, inflation rate, P10/P50/P90 values
- Explain WHY the risk level is what it is — note that risk is assessed against the pessimistic scenario
- If they can easily afford it, be encouraging. If risky, be direct but constructive
- End with a concrete, actionable recommendation

Write ONLY the narrative. No titles, XML, JSON, or formatting markers. Just clean prose.`;

  const userMessage = `I'm considering buying: ${purchaseDescription}. The cost is ${purchaseAmount} ${profile.currency}. Please interpret my Monte Carlo simulation results.`;

  return { systemPrompt, userMessage };
}

// ---------------------------------------------------------------------------
// POST Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { purchaseDescription, amount } = body;

    if (
      !purchaseDescription ||
      typeof purchaseDescription !== "string" ||
      purchaseDescription.trim().length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Purchase description is required" } satisfies APIResponse<never>,
        { status: 400 }
      );
    }

    if (amount !== undefined && amount !== null) {
      if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { success: false, error: "Amount must be a positive number" } satisfies APIResponse<never>,
          { status: 400 }
        );
      }
    }

    const { transactions, profile } = getMockData();
    const baseContext = buildLLMContext({ transactions, profile });

    // --- Compute personal finance model (needed for fallback + simulation) ---
    const model = computePersonalFinanceModel(transactions);

    // --- Resolve purchase amount ---
    let purchaseAmount: number;
    if (amount !== undefined && amount !== null) {
      purchaseAmount = amount;
    } else {
      const estimateResponse = await callClaude(
        "You are a price estimation tool. Given a purchase description and a currency, respond with ONLY a single integer representing a reasonable price. No text, no symbols, just the number.",
        `Estimate the price of "${purchaseDescription.trim()}" in ${profile.currency}.`
      );
      purchaseAmount = parseInt(estimateResponse.trim(), 10);
      if (isNaN(purchaseAmount) || purchaseAmount <= 0) {
        purchaseAmount = Math.round(model.avgMonthlyIncome * 0.5);
      }
    }

    // --- Fetch macro indicators ---
    const macro = await fetchMacroIndicators(profile.currency);

    // --- ML-enhanced spending prediction ---
    const mlPrediction = getMLPrediction(model);

    // --- Run Monte Carlo simulation (500 scenarios) ---
    const projections = runMonteCarloSimulation(
      profile,
      model,
      macro,
      mlPrediction,
      purchaseAmount
    );

    // --- Compute risk assessment (deterministic rules) ---
    const { canAfford, riskLevel } = computeRiskAssessment(projections, model);

    // --- Get Claude narrative interpretation ---
    const { systemPrompt, userMessage } = buildNarrativePrompt(
      baseContext,
      profile,
      model,
      macro,
      mlPrediction,
      projections,
      { canAfford, riskLevel },
      purchaseDescription.trim(),
      purchaseAmount
    );

    const analysis = await callClaude(systemPrompt, userMessage);

    // --- Assemble response ---
    const result: SimulationResult = {
      analysis: analysis.trim(),
      projectedBalances: projections.map((p) => ({
        date: p.date,
        withPurchase: p.withPurchase,
        withoutPurchase: p.withoutPurchase,
        withPurchaseP10: p.withPurchaseP10,
        withPurchaseP90: p.withPurchaseP90,
        withoutPurchaseP10: p.withoutPurchaseP10,
        withoutPurchaseP90: p.withoutPurchaseP90,
      })),
      canAfford,
      riskLevel,
    };

    return NextResponse.json(
      { success: true, data: result } satisfies APIResponse<SimulationResult>,
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { success: false, error: message } satisfies APIResponse<never>,
      { status: 500 }
    );
  }
}
