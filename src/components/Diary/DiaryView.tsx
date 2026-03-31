"use client";

import { useState } from "react";
import DiaryEntry from "./DiaryEntry";
import type { DiaryResult, APIResponse } from "@/types";

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

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const data: APIResponse<DiaryResult> = await response.json();
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
        <h2 className="text-2xl font-bold text-gray-900">Your Money&apos;s Diary</h2>
        <p className="mt-1 text-sm text-gray-500">
          Read a first-person narrative from your money&apos;s perspective.
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
          {loading ? "Writing..." : "Generate Diary"}
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="h-4 bg-amber-100 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-amber-100 rounded animate-pulse w-full" />
          <div className="h-4 bg-amber-100 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-amber-100 rounded animate-pulse w-2/3" />
          <div className="h-4 bg-amber-100 rounded animate-pulse w-4/5" />
        </div>
      )}

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

      {!loading && result && (
        <DiaryEntry result={result} currency="ZAR" />
      )}
    </div>
  );
}
