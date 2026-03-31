"use client";

import { useState } from "react";
import PurchaseInput from "./PurchaseInput";
import ImpactTimeline from "./ImpactTimeline";
import type { SimulationResult, APIResponse } from "@/types";

const RISK_STYLES: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

export default function SimulatorView() {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async (purchaseDescription: string, amount?: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseDescription, amount }),
      });
      const data: APIResponse<SimulationResult> = await response.json();
      if (data.success && data.data) {
        setResult(data.data);
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

      {loading && (
        <div className="space-y-3">
          <div className="h-4 bg-blue-100 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-blue-100 rounded animate-pulse w-full" />
          <div className="h-4 bg-blue-100 rounded animate-pulse w-5/6" />
          <div className="h-48 bg-blue-50 rounded-lg animate-pulse" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!loading && result && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${RISK_STYLES[result.riskLevel]}`}
            >
              {result.riskLevel} risk
            </span>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                result.canAfford
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {result.canAfford ? "You can afford this" : "This might be risky"}
            </span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Analysis</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              {result.analysis.split("\n\n").filter(Boolean).map((paragraph, index) => (
                <p key={index} className="text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Projected Balance</h3>
            </div>
            <div className="px-6 py-5">
              <ImpactTimeline projectedBalances={result.projectedBalances} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
