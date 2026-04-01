"use client";

import { useState, useEffect } from "react";
import PurchaseInput from "./PurchaseInput";
import ImpactTimeline from "./ImpactTimeline";
import type { SimulationResult, APIResponse } from "@/types";

const RISK_STYLES: Record<string, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-red-100 text-red-800 border-red-200",
};

const LOADING_MESSAGES = [
  "Analyzing your transaction history...",
  "Fetching macroeconomic indicators...",
  "Running 500 Monte Carlo simulations...",
  "Computing confidence bands (P10/P50/P90)...",
  "Adjusting for inflation and GDP growth...",
  "Generating personalized analysis...",
  "Almost there...",
];

export default function SimulatorView() {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [showResult, setShowResult] = useState(false);

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
          </div>

          {/* Analysis card */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-500 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Analysis</h3>
              <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full">
                Monte Carlo simulation (500 scenarios)
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
                Solid lines = median (P50), Shaded bands = P10–P90 range
              </p>
            </div>
            <div className="px-4 py-5">
              <ImpactTimeline projectedBalances={result.projectedBalances} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
