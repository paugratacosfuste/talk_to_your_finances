"use client";

import { useState, useEffect, useRef } from "react";
import RoastCard from "./RoastCard";
import { DEFAULT_CURRENCY } from "@/data/constants";
import { getMockData } from "@/data/mockData";
import { sumByCategory, getTotalSpent, getTotalIncome } from "@/utils/dataUtils";
import { loadEmbeddings, loadChunks, retrieveRelevantChunks } from "@/utils/ragRetriever";
import type { RoastResult, APIResponse } from "@/types";

// Extends Sean's RoastResult with the savings estimate produced by the roast API
type ExtendedRoastResult = RoastResult & { savingsPotential: number };

interface Persona {
  label: string;
  description: string;
  top_features: string[];
}

interface GroundingChunk {
  id: string;
  topic: string;
  text: string;
  tags: string[];
}

const LOADING_MESSAGES = [
  "Scanning your transactions...",
  "Finding your worst habits...",
  "Sharpening the insults...",
  "This is going to hurt...",
  "Preparing the roast...",
];

export default function RoastView() {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [result, setResult] = useState<ExtendedRoastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [showResult, setShowResult] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [groundingSources, setGroundingSources] = useState<GroundingChunk[]>([]);
  const [groundingOpen, setGroundingOpen] = useState(false);
  const ragDataRef = useRef<{
    embeddings: Awaited<ReturnType<typeof loadEmbeddings>>;
    chunks: Awaited<ReturnType<typeof loadChunks>>;
  } | null>(null);

  useEffect(() => {
    fetch("/persona.json")
      .then((res) => res.json())
      .then((data) => setPersona(data))
      .catch((e) => console.warn("Failed to load persona data:", e));
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

  const handleRoast = async () => {
    setLoading(true);
    setError(null);
    setShowResult(false);
    setGroundingSources([]);
    try {
      const personaContext = persona
        ? `${persona.label}. Key traits: ${persona.top_features.join(", ")}`
        : undefined;

      // Lazy-load RAG embeddings on first roast request
      if (!ragDataRef.current) {
        try {
          const [embeddings, chunks] = await Promise.all([loadEmbeddings(), loadChunks()]);
          ragDataRef.current = { embeddings, chunks };
        } catch (e) {
          console.warn("Failed to load RAG embeddings:", e);
        }
      }

      // Build user profile for RAG retrieval
      let ragContext: string | undefined;
      if (ragDataRef.current) {
        const { transactions } = getMockData();
        const categoryTotals = sumByCategory(transactions);
        const totalSpent = getTotalSpent(transactions);
        const totalIncome = getTotalIncome(transactions);
        const savingsRate = totalIncome > 0
          ? Math.round(((totalIncome - totalSpent) / totalIncome) * 100)
          : 0;

        const topCats = Object.entries(categoryTotals)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([cat, amt]) => {
            const pct = totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0;
            return `${pct}% on ${cat.toLowerCase()}`;
          });

        const profileQuery = `user spends ${topCats.join(", ")}, saves ${savingsRate}% of income${
          persona ? `, persona: ${persona.label}` : ""
        }`;

        const chunks = retrieveRelevantChunks(
          profileQuery,
          ragDataRef.current.embeddings,
          ragDataRef.current.chunks
        );
        setGroundingSources(chunks);

        if (chunks.length > 0) {
          ragContext = [
            "--- FINANCIAL KNOWLEDGE CONTEXT ---",
            "The following evidence-based guidelines are relevant to this user's profile.",
            "Use them to ground your commentary. Cite the principle, not the source.",
            "",
            ...chunks.map((c, i) => `${i + 1}. ${c.text}`),
            "---",
          ].join("\n");
        }
      }

      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, persona: personaContext, ragContext }),
      });
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data: APIResponse<ExtendedRoastResult> = await response.json();
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
        <h2 className="text-2xl font-bold text-content-primary">Roast My Spending</h2>
        <p className="mt-1 text-sm text-content-tertiary">
          Get a brutally honest, AI-powered take on your spending habits.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
          <button
            onClick={() => setPeriod("week")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              period === "week"
                ? "bg-accent text-white"
                : "bg-[var(--bg-secondary-solid)] text-content-primary hover:bg-surface-tertiary/50"
            }`}
          >
            Past Week
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              period === "month"
                ? "bg-accent text-white"
                : "bg-[var(--bg-secondary-solid)] text-content-primary hover:bg-surface-tertiary/50"
            }`}
          >
            Past Month
          </button>
        </div>

        <button
          onClick={handleRoast}
          disabled={loading}
          className="px-5 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Roasting..." : result ? "Roast Again" : "Roast Me"}
        </button>
      </div>

      {/* Persona card */}
      {persona && (
        <div className="rounded-2xl border border-[var(--border)] bg-accent-muted px-6 py-4">
          <h4 className="text-sm font-bold text-accent">{persona.label}</h4>
          <p className="text-sm text-accent mt-1">{persona.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {persona.top_features.map((feat, i) => (
              <span
                key={i}
                className="text-xs bg-accent-muted text-accent px-2 py-0.5 rounded-full"
              >
                {feat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Empty state - before any interaction */}
      {!loading && !result && !error && (
        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-tertiary)] px-6 py-12 text-center">
          <div className="flex justify-center mb-3" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2c.5 3-1.5 5-3 7 1.5 0 3 .5 3 3 0-2.5 1.5-3 3-3-1.5-2-3.5-4-3-7z" /><path d="M8 22h8" /><path d="M12 17v5" /></svg>
          </div>
          <p className="text-content-secondary font-medium">Ready to face the truth?</p>
          <p className="text-sm text-content-tertiary mt-1">
            Select a time period and hit &ldquo;Roast Me&rdquo; to get a brutally honest review of your spending.
          </p>
        </div>
      )}

      {/* Loading state with rotating messages */}
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

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-[var(--border)] bg-accent-muted px-4 py-3">
          <p className="text-sm text-[var(--expense)]">{error}</p>
          <button
            onClick={handleRoast}
            className="mt-2 text-sm font-medium text-[var(--expense)] hover:text-[var(--expense)] underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Result with fade-in */}
      {!loading && result && (
        <div
          className={`space-y-4 transition-all duration-500 ${
            showResult ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <RoastCard result={result} currency={DEFAULT_CURRENCY} />

          {/* Grounding Sources - collapsible */}
          {groundingSources.length > 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary-solid)] shadow-sm overflow-hidden">
              <button
                onClick={() => setGroundingOpen(!groundingOpen)}
                className="w-full px-5 py-3 flex items-center justify-between bg-[var(--bg-tertiary)] hover:bg-surface-tertiary/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-content-primary">
                    Grounding Sources
                  </span>
                  <span className="text-xs text-content-tertiary bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">
                    {groundingSources.length} references
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-content-tertiary transition-transform duration-200 ${
                    groundingOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {groundingOpen && (
                <div className="px-5 py-3 border-t border-[var(--border)] space-y-2">
                  {groundingSources.map((chunk) => (
                    <div key={chunk.id} className="text-xs">
                      <span className="inline-block bg-accent-muted text-accent px-2 py-0.5 rounded-full font-medium mr-2">
                        {chunk.topic.replace(/_/g, " ")}
                      </span>
                      <span className="text-content-tertiary">{chunk.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
