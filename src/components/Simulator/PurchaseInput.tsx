"use client";

import { useState } from "react";

interface PurchaseInputProps {
  onSubmit: (purchaseDescription: string, amount?: number) => void;
  loading: boolean;
}

export default function PurchaseInput({ onSubmit, loading }: PurchaseInputProps) {
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = description.trim();
    if (!trimmed) return;

    const amount = amountStr.trim() ? parseFloat(amountStr) : undefined;
    if (amount !== undefined && (isNaN(amount) || amount <= 0)) return;

    onSubmit(trimmed, amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="purchase-description" className="block text-sm font-medium text-gray-700 mb-1">
          What are you thinking of buying?
        </label>
        <input
          id="purchase-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., New MacBook Pro, vacation to Cape Town"
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label htmlFor="purchase-amount" className="block text-sm font-medium text-gray-700 mb-1">
          Amount (optional)
        </label>
        <input
          id="purchase-amount"
          type="number"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          placeholder="Leave blank for AI to estimate"
          min="0"
          step="any"
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      <button
        type="submit"
        disabled={loading || description.trim().length === 0}
        className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Simulating..." : "Simulate Impact"}
      </button>
    </form>
  );
}
