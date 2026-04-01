"use client";

import { useState } from "react";
import { formatCurrency } from "@/utils/dataUtils";
import type { RoastResult } from "@/types";

interface RoastCardProps {
  result: RoastResult;
  currency: string;
}

export default function RoastCard({ result, currency }: RoastCardProps) {
  const [copied, setCopied] = useState(false);
  const paragraphs = result.roast.split("\n\n").filter(Boolean);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.roast);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-red-200 bg-white shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 to-orange-500 px-6 py-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Your Roast is Served</h3>
        <button
          onClick={handleCopy}
          className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      <div className="px-6 py-6 space-y-4">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-gray-700 leading-relaxed text-[15px]">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Biggest Offender</p>
            <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 capitalize">
              {result.worstCategory}
            </span>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Potential Savings</p>
            <span className="text-xl font-bold text-green-600">
              {formatCurrency(result.savingsPotential, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
