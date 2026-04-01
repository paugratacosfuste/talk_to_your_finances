"use client";

import { useState, useEffect } from "react";
import RoastCard from "./RoastCard";
import type { RoastResult, APIResponse } from "@/types";

const LOADING_MESSAGES = [
  "Scanning your transactions...",
  "Finding your worst habits...",
  "Sharpening the insults...",
  "This is going to hurt...",
  "Preparing the roast...",
];

export default function RoastView() {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [result, setResult] = useState<RoastResult | null>(null);
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

  const handleRoast = async () => {
    setLoading(true);
    setError(null);
    setShowResult(false);
    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const data: APIResponse<RoastResult> = await response.json();
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
        <h2 className="text-2xl font-bold text-gray-900">Roast My Spending</h2>
        <p className="mt-1 text-sm text-gray-500">
          Get a brutally honest, AI-powered take on your spending habits.
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
          {loading ? "Roasting..." : result ? "Roast Again" : "Roast Me"}
        </button>
      </div>

      {/* Empty state — before any interaction */}
      {!loading && !result && !error && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
          <p className="text-4xl mb-3" aria-hidden="true">&#x1F525;</p>
          <p className="text-gray-600 font-medium">Ready to face the truth?</p>
          <p className="text-sm text-gray-400 mt-1">
            Select a time period and hit &ldquo;Roast Me&rdquo; to get a brutally honest review of your spending.
          </p>
        </div>
      )}

      {/* Loading state with rotating messages */}
      {loading && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-8 text-center space-y-4">
          <div className="flex justify-center gap-1">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-red-700 font-medium transition-opacity duration-300">
            {loadingMsg}
          </p>
        </div>
      )}

      {/* Error state */}
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

      {/* Result with fade-in */}
      {!loading && result && (
        <div
          className={`transition-all duration-500 ${
            showResult ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <RoastCard result={result} currency="ZAR" />
        </div>
      )}
    </div>
  );
}
