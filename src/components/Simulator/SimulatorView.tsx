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

const RISK_STYLES: Record<string, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-red-100 text-red-800 border-red-200",
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
  const [result, setResult] = useState<SimulationResult | null>(null);
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
      const data: APIResponse<SimulationResult> = await response.json();
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
        <h2 className="text-2xl font-bold text-gray-900">Future You Simulator</h2>
        <p className="mt-1 text-sm text-gray-500">
          Describe a purchase and see how it impacts your finances over the next 6 months.
        </p>
      </div>

      <PurchaseInput onSubmit={handleSimulate} loading={loading} />

      {/* Empty state */}
      {!loading && !result && !error && (
        <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-6 py-12 text-center">
          <p className="text-4xl mb-3" aria-hidden="true">&#x1F52E;</p>
          <p className="text-gray-600 font-medium">What are you thinking of buying?</p>
          <p className="text-sm text-gray-400 mt-1">
            Enter a purchase above and we&apos;ll run a real simulation using your financial data, live macroeconomic indicators, and inflation projections.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-6 py-8 text-center space-y-4">
          <div className="flex justify-center gap-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-blue-700 font-medium transition-opacity duration-300">
            {loadingMsg}
          </p>
        </div>
      )}

      {/* Error state with retry */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-800 underline"
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
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-red-100 text-red-800 border-red-200"
              }`}
            >
              {result.canAfford ? "You can afford this" : "This might be risky"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              ML-powered prediction (R&sup2; = {spendingModel.evaluation.test_r2.toFixed(2)}, MAE = ${Math.round(spendingModel.evaluation.test_mae)})
            </span>
          </div>

          {/* Analysis card */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-500 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Analysis</h3>
              <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full">
                ML-powered Monte Carlo (500 scenarios)
              </span>
            </div>
            <div className="px-6 py-5 space-y-4">
              {result.analysis.split("\n\n").filter(Boolean).map((paragraph, index) => (
                <p key={index} className="text-gray-700 leading-relaxed text-[15px]">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Chart card */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">6-Month Projection</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  P10/P50/P90 confidence bands
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
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
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Category Forecast</h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                ML-predicted spend by category
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Predicted spending for the current month, with error margins
            </p>
          </div>
          <div className="px-4 py-5">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  width={100}
                />
                <Tooltip
                  formatter={(value: number, _name: string, props: { payload: { fullCategory: string; mae: number } }) => [
                    `${formatCurrency(value, DEFAULT_CURRENCY)} (+/- ${formatCurrency(props.payload.mae, DEFAULT_CURRENCY)})`,
                    props.payload.fullCategory,
                  ]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {categoryChartData.map((_entry, index) => (
                    <Cell
                      key={index}
                      fill={index === 0 ? "#3b82f6" : index < 3 ? "#60a5fa" : "#93c5fd"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-3 px-2">
              {categoryChartData.slice(0, 5).map((d) => (
                <span key={d.fullCategory} className="text-xs text-gray-400">
                  {d.fullCategory}: +/- {formatCurrency(d.mae, DEFAULT_CURRENCY)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Savings Runway - always visible */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4">
          <h3 className="text-lg font-bold text-white">Savings Runway</h3>
          <p className="text-xs text-white/70 mt-0.5">
            How long until you hit your emergency fund target?
          </p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Segmented control */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 mr-1">Emergency fund target:</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              {RUNWAY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setRunwayMonths(opt)}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    runwayMonths === opt
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {opt} months
                </button>
              ))}
            </div>
          </div>

          {runway.monthlySavings <= 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-center">
              <p className="text-amber-800 font-medium text-sm">
                You are currently spending more than you earn. Reduce spend to unlock this projection.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Target Amount</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(runwayMonths * runway.predictedSpend, DEFAULT_CURRENCY)}
                </p>
                <p className="text-xs text-gray-400 mt-1">{runwayMonths} months of expenses</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Monthly Savings</p>
                <p className="text-xl font-bold text-emerald-600">
                  {formatCurrency(runway.monthlySavings, DEFAULT_CURRENCY)}
                </p>
                <p className="text-xs text-gray-400 mt-1">income - predicted spend</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Months to Goal</p>
                <p className="text-xl font-bold text-blue-600">
                  {Math.ceil((runwayMonths * runway.predictedSpend) / runway.monthlySavings)}
                </p>
                <p className="text-xs text-gray-400 mt-1">at current savings rate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
