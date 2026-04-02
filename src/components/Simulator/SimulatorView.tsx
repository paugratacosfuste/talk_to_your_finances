"use client";

import { useState, useEffect, useMemo } from "react";
import PurchaseInput from "./PurchaseInput";
import ImpactTimeline from "./ImpactTimeline";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import spendingModel from "../../../models/spending_model.json";
import { getMockData } from "@/data/mockData";
import { formatCurrency } from "@/utils/dataUtils";
import { DEFAULT_CURRENCY } from "@/data/constants";
import type { SimulationResult, APIResponse } from "@/types";

// Extends Sean's SimulationResult with Monte Carlo confidence bands and risk assessment
interface ExtendedProjection {
  date: string;
  withPurchase: number;
  withoutPurchase: number;
  withPurchaseP10: number;
  withPurchaseP90: number;
  withoutPurchaseP10: number;
  withoutPurchaseP90: number;
}

type ExtendedSimulationResult = Omit<SimulationResult, "projectedBalances"> & {
  projectedBalances: ExtendedProjection[];
  canAfford: boolean;
  riskLevel: string;
};

const RISK_STYLES: Record<string, string> = {
  low: "bg-accent-muted text-[var(--income)] border-[var(--border)]",
  medium: "bg-accent-muted text-accent border-[var(--border)]",
  high: "bg-accent-muted text-[var(--expense)] border-[var(--border)]",
};

const LOADING_MESSAGES = [
  "Analyzing your transaction history...",
  "Loading ML spending prediction model...",
  "Fetching macroeconomic indicators...",
  "Running 500 Monte Carlo simulations...",
  "Computing confidence bands (P10/P50/P90)...",
  "Adjusting for inflation and GDP growth...",
  "Generating personalized analysis...",
  "Almost there...",
];

const RUNWAY_OPTIONS = [3, 6, 12] as const;

export default function SimulatorView() {
  const [result, setResult] = useState<ExtendedSimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [showResult, setShowResult] = useState(false);
  const [runwayMonths, setRunwayMonths] = useState<3 | 6 | 12>(3);

  const runway = useMemo(() => {
    const { transactions } = getMockData();
    const monthlyData: Record<string, { income: number; expenses: number }> = {};
    for (const t of transactions) {
      const m = t.date.slice(0, 7);
      if (!monthlyData[m]) monthlyData[m] = { income: 0, expenses: 0 };
      if (t.type === "credit") {
        monthlyData[m].income += t.amount;
      } else {
        monthlyData[m].expenses += t.amount;
      }
    }
    const months = Object.keys(monthlyData);
    const monthCount = months.length || 1;
    const totalIncome = months.reduce((s, m) => s + monthlyData[m].income, 0);
    const avgMonthlyIncome = totalIncome / monthCount;

    const currentMonth = String(new Date().getMonth() + 1);
    const predictedSpend =
      spendingModel.predictions.monthly_baseline[
        currentMonth as keyof typeof spendingModel.predictions.monthly_baseline
      ] ?? Object.values(spendingModel.predictions.monthly_baseline).reduce((a, b) => a + b, 0) / 12;

    const monthlySavings = avgMonthlyIncome - predictedSpend;
    return { avgMonthlyIncome, predictedSpend, monthlySavings };
  }, []);

  const categoryChartData = useMemo(() => {
    const currentMonth = String(new Date().getMonth() + 1);
    const catPreds = spendingModel.predictions.category_predictions[
      currentMonth as keyof typeof spendingModel.predictions.category_predictions
    ] ?? {};
    const catMae = (spendingModel.predictions as Record<string, unknown>).category_mae as
      Record<string, number> | undefined ?? {};

    return Object.entries(catPreds)
      .map(([category, amount]) => ({
        category: category.length > 12 ? category.slice(0, 11) + "..." : category,
        fullCategory: category,
        amount: Math.round(amount as number),
        mae: Math.round((catMae as Record<string, number>)[category] ?? 0),
      }))
      .filter((d) => d.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, []);

  useEffect(() => {
    if (!loading) return;
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleSimulate = async (purchaseDescription: string, amount?: number) => {
    setLoading(true);
    setError(null);
    setShowResult(false);
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseDescription, amount }),
      });
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data: APIResponse<ExtendedSimulationResult> = await response.json();
      if (data.success && data.data) {
        setResult(data.data);
        setTimeout(() => setShowResult(true), 50);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-content-primary">Future You Simulator</h2>
        <p className="mt-1 text-sm text-content-tertiary">
          Describe a purchase and see how it impacts your finances over the next 6 months.
        </p>
      </div>

      <PurchaseInput onSubmit={handleSimulate} loading={loading} />

      {/* Empty state */}
      {!loading && !result && !error && (
        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-accent-muted px-6 py-12 text-center">
          <div className="flex justify-center mb-3" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          </div>
          <p className="text-content-secondary font-medium">What are you thinking of buying?</p>
          <p className="text-sm text-content-tertiary mt-1">
            Enter a purchase above and we&apos;ll run a real simulation using your financial data, live macroeconomic indicators, and inflation projections.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="rounded-2xl border border-[var(--border)] bg-accent-muted px-6 py-8 text-center space-y-4">
          <div className="flex justify-center gap-1">
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-accent font-medium transition-opacity duration-300">
            {loadingMsg}
          </p>
        </div>
      )}

      {/* Error state with retry */}
      {error && (
        <div className="rounded-lg border border-[var(--border)] bg-accent-muted px-4 py-3">
          <p className="text-sm text-[var(--expense)]">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm font-medium text-[var(--expense)] hover:text-[var(--expense)] underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Result with fade-in */}
      {!loading && result && (
        <div
          className={`space-y-6 transition-all duration-500 ${
            showResult ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border capitalize ${RISK_STYLES[result.riskLevel]}`}
            >
              {result.riskLevel} risk
            </span>
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${
                result.canAfford
                  ? "bg-accent-muted text-[var(--income)] border-[var(--border)]"
                  : "bg-accent-muted text-[var(--expense)] border-[var(--border)]"
              }`}
            >
              {result.canAfford ? "You can afford this" : "This might be risky"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-accent-muted text-accent border-[var(--border)]">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              ML-powered prediction (R&sup2; = {spendingModel.evaluation.test_r2.toFixed(2)}, MAE = ${Math.round(spendingModel.evaluation.test_mae)})
            </span>
          </div>

          {/* Analysis card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary-solid)] shadow-[var(--card-shadow)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#D4A0CC] to-[#A78BFA] px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Analysis</h3>
              <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full">
                ML-powered Monte Carlo (500 scenarios)
              </span>
            </div>
            <div className="px-6 py-5 space-y-4">
              {result.analysis.split("\n\n").filter(Boolean).map((paragraph, index) => (
                <p key={index} className="text-content-primary leading-relaxed text-[15px]">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Chart card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary-solid)] shadow-[var(--card-shadow)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-content-primary">6-Month Projection</h3>
                <span className="text-xs text-content-tertiary bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">
                  P10/P50/P90 confidence bands
                </span>
              </div>
              <p className="text-xs text-content-tertiary mt-0.5">
                Solid lines = median (P50), Shaded bands = P10-P90 range
              </p>
            </div>
            <div className="px-4 py-5">
              <ImpactTimeline projectedBalances={result.projectedBalances} />
            </div>
          </div>
        </div>
      )}

      {/* Category Forecast Bar Chart - always visible */}
      {categoryChartData.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary-solid)] shadow-[var(--card-shadow)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-content-primary">Category Forecast</h3>
              <span className="text-xs text-content-tertiary bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">
                ML-predicted spend by category
              </span>
            </div>
            <p className="text-xs text-content-tertiary mt-0.5">
              Predicted spending for the current month, with error margins
            </p>
          </div>
          <div className="px-4 py-5">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
                  width={100}
                />
                <Tooltip
                  formatter={(value, _name, props) => {
                    const payload = props.payload as { fullCategory: string; mae: number };
                    return [
                      `${formatCurrency(Number(value), DEFAULT_CURRENCY)} (+/- ${formatCurrency(payload.mae, DEFAULT_CURRENCY)})`,
                      payload.fullCategory,
                    ];
                  }}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--bg-secondary-solid)", color: "var(--text-primary)" }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {categoryChartData.map((_entry, index) => (
                    <Cell
                      key={index}
                      fill={index === 0 ? "#D4A0CC" : index < 3 ? "#B898D8" : "#A78BFA"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-3 px-2">
              {categoryChartData.slice(0, 5).map((d) => (
                <span key={d.fullCategory} className="text-xs text-content-tertiary">
                  {d.fullCategory}: +/- {formatCurrency(d.mae, DEFAULT_CURRENCY)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Savings Runway - always visible */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary-solid)] shadow-[var(--card-shadow)] overflow-hidden">
        <div className="bg-gradient-to-r from-[#D4A0CC] to-[#A78BFA] px-6 py-4">
          <h3 className="text-lg font-bold text-white">Savings Runway</h3>
          <p className="text-xs text-white/70 mt-0.5">
            How long until you hit your emergency fund target?
          </p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Segmented control */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-content-tertiary mr-1">Emergency fund target:</span>
            <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
              {RUNWAY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setRunwayMonths(opt)}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    runwayMonths === opt
                      ? "bg-accent text-white"
                      : "bg-[var(--bg-secondary-solid)] text-content-primary hover:bg-surface-tertiary/50"
                  }`}
                >
                  {opt} months
                </button>
              ))}
            </div>
          </div>

          {runway.monthlySavings <= 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-accent-muted px-4 py-4 text-center">
              <p className="text-accent font-medium text-sm">
                You are currently spending more than you earn. Reduce spend to unlock this projection.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] p-4 text-center">
                <p className="text-xs text-content-tertiary uppercase tracking-wide mb-1">Target Amount</p>
                <p className="text-xl font-bold text-content-primary">
                  {formatCurrency(runwayMonths * runway.predictedSpend, DEFAULT_CURRENCY)}
                </p>
                <p className="text-xs text-content-tertiary mt-1">{runwayMonths} months of expenses</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] p-4 text-center">
                <p className="text-xs text-content-tertiary uppercase tracking-wide mb-1">Monthly Savings</p>
                <p className="text-xl font-bold text-accent">
                  {formatCurrency(runway.monthlySavings, DEFAULT_CURRENCY)}
                </p>
                <p className="text-xs text-content-tertiary mt-1">income - predicted spend</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] p-4 text-center">
                <p className="text-xs text-content-tertiary uppercase tracking-wide mb-1">Months to Goal</p>
                <p className="text-xl font-bold text-accent">
                  {Math.ceil((runwayMonths * runway.predictedSpend) / runway.monthlySavings)}
                </p>
                <p className="text-xs text-content-tertiary mt-1">at current savings rate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
