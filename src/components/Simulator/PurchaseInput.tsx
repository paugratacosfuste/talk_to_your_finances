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
        <label htmlFor="purchase-description" className="block text-sm font-medium text-content-primary mb-1">
          What are you thinking of buying?
        </label>
        <input
          id="purchase-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., New MacBook Pro, vacation to Cape Town"
          disabled={loading}
          className="w-full px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-[var(--bg-secondary-solid)] disabled:bg-surface-tertiary disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label htmlFor="purchase-amount" className="block text-sm font-medium text-content-primary mb-1">
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
          className="w-full px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-[var(--bg-secondary-solid)] disabled:bg-surface-tertiary disabled:cursor-not-allowed"
        />
      </div>

      <button
        type="submit"
        disabled={loading || description.trim().length === 0}
        className="px-5 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Simulating..." : "Simulate Impact"}
      </button>
    </form>
  );
}
