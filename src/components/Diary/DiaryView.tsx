"use client";

import { useState, useEffect } from "react";
import DiaryEntry from "./DiaryEntry";
import SpendHeatmap from "./SpendHeatmap";
import { DEFAULT_CURRENCY, DATE_RANGE } from "@/data/constants";
import { getMockData } from "@/data/mockData";
import { formatCurrency } from "@/utils/dataUtils";
import type { DiaryResult, APIResponse } from "@/types";

interface AnomalyScore {
  is_anomaly: boolean;
  score: number;
  reason: string | null;
}

const LOADING_MESSAGES = [
  "Your money is picking up a pen...",
  "Recalling the month's adventures...",
  "Drafting the first paragraph...",
  "Adding some dramatic flair...",
  "Almost done writing...",
];

const DATA_START = DATE_RANGE.start.slice(0, 7); // "2020-01"
const DATA_END = DATE_RANGE.end.slice(0, 7);     // "2020-04"

function shiftMonth(current: string, delta: number): string {
  const [y, m] = current.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const ny = d.getFullYear();
  const nm = String(d.getMonth() + 1).padStart(2, "0");
  return `${ny}-${nm}`;
}

export default function DiaryView() {
  const [month, setMonth] = useState(DATA_END);
  const [result, setResult] = useState<DiaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [showResult, setShowResult] = useState(false);
  const [trendsOpen, setTrendsOpen] = useState(false);
  const [anomalyScores, setAnomalyScores] = useState<Record<string, AnomalyScore>>({});
  const [expandedAnomaly, setExpandedAnomaly] = useState<string | null>(null);

  useEffect(() => {
    fetch("/anomaly_scores.json")
      .then((res) => res.json())
      .then((data) => setAnomalyScores(data))
      .catch(() => {});
  }, []);

  const canGoPrev = month > DATA_START;
  const canGoNext = month < DATA_END;

  useEffect(() => {
    if (!loading) return;
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setShowResult(false);
    try {
      const response = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const data: APIResponse<DiaryResult> = await response.json();
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
        <h2 className="text-2xl font-bold text-gray-900">Your Money&apos;s Diary</h2>
        <p className="mt-1 text-sm text-gray-500">
          A first-person narrative from your money&apos;s perspective — what it felt, where it went, and what it wishes you&apos;d done differently.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setMonth(shiftMonth(month, -1))}
          disabled={!canGoPrev || loading}
          className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <input
          type="month"
          value={month}
          min={DATA_START}
          max={DATA_END}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />

        <button
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={!canGoNext || loading}
          className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-5 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Writing..." : result ? "Regenerate" : "Generate Diary"}
        </button>
      </div>

      {/* Empty state */}
      {!loading && !result && !error && (
        <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 px-6 py-12 text-center">
          <p className="text-4xl mb-3" aria-hidden="true">&#x1F4D6;</p>
          <p className="text-gray-600 font-medium">What story does your money have to tell?</p>
          <p className="text-sm text-gray-400 mt-1">
            Pick a month (Jan–Apr 2020) and hit &ldquo;Generate Diary&rdquo; to read a narrative written from your money&apos;s point of view.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-6 py-8 text-center space-y-4">
          <div className="flex justify-center gap-1">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-amber-700 font-medium italic transition-opacity duration-300">
            {loadingMsg}
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={handleGenerate}
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
          <DiaryEntry result={result} currency={DEFAULT_CURRENCY} />
        </div>
      )}

      {/* Transaction list with anomaly badges */}
      {(() => {
        const { transactions } = getMockData();
        const monthTxns = transactions.filter((t) => t.date.startsWith(month));
        if (monthTxns.length === 0) return null;
        const anomalies = monthTxns.filter(
          (t) => anomalyScores[t.id]?.is_anomaly
        );
        if (anomalies.length === 0) return null;

        return (
          <div className="rounded-2xl border border-amber-200 bg-white shadow-lg overflow-hidden">
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
              <h4 className="text-sm font-semibold text-amber-800">
                Unusual Transactions ({anomalies.length})
              </h4>
            </div>
            <div className="divide-y divide-gray-100">
              {anomalies.map((t) => {
                const score = anomalyScores[t.id];
                return (
                  <div key={t.id} className="px-6 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full bg-amber-400 cursor-pointer flex-shrink-0"
                          title="Anomaly detected"
                          onClick={() =>
                            setExpandedAnomaly(
                              expandedAnomaly === t.id ? null : t.id
                            )
                          }
                        />
                        <span className="text-sm text-gray-700">
                          {t.description}
                        </span>
                        <span className="text-xs text-gray-400">{t.date}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(t.amount, DEFAULT_CURRENCY)}
                      </span>
                    </div>
                    {expandedAnomaly === t.id && score?.reason && (
                      <p className="mt-1.5 ml-4.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                        {score.reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Trends heatmap - collapsible */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
        <button
          onClick={() => setTrendsOpen(!trendsOpen)}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Spending Trends</h3>
            <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded">
              Month x Category Heatmap
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              trendsOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {trendsOpen && (
          <div className="px-4 py-4 border-t border-gray-100">
            <SpendHeatmap />
          </div>
        )}
      </div>
    </div>
  );
}
