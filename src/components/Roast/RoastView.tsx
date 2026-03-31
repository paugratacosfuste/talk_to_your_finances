"use client";

import { useState } from "react";
import RoastCard from "./RoastCard";
import type { RoastResult, APIResponse } from "@/types";

export default function RoastView() {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [result, setResult] = useState<RoastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoast = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const data: APIResponse<RoastResult> = await response.json();
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
        <h2 className="text-2xl font-bold text-gray-900">Roast My Spending</h2>
        <p className="mt-1 text-sm text-gray-500">
          Get a brutally honest take on your spending habits.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex rounded-lg overflow-hidden border border-gray-300">
          <button
            onClick={() => setPeriod("week")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              period === "week"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Past Week
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              period === "month"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Past Month
          </button>
        </div>

        <button
          onClick={handleRoast}
          disabled={loading}
          className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Roasting..." : "Roast Me"}
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={handleRoast}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && result && (
        <RoastCard result={result} currency="ZAR" />
      )}
    </div>
  );
}
