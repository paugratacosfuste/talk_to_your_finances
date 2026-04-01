"use client";

import { useState, useEffect } from "react";
import DiaryEntry from "./DiaryEntry";
import type { DiaryResult, APIResponse } from "@/types";

const LOADING_MESSAGES = [
  "Your money is picking up a pen...",
  "Recalling the month's adventures...",
  "Drafting the first paragraph...",
  "Adding some dramatic flair...",
  "Almost done writing...",
];

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export default function DiaryView() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [result, setResult] = useState<DiaryResult | null>(null);
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
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />

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
            Pick a month and hit &ldquo;Generate Diary&rdquo; to read a narrative written from your money&apos;s point of view.
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
          <DiaryEntry result={result} currency="ZAR" />
        </div>
      )}
    </div>
  );
}
