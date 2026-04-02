"use client";

import { useState, useMemo } from "react";
import { getMockData } from "@/data/mockData";
import { formatCurrency } from "@/utils/dataUtils";
import { DEFAULT_CURRENCY } from "@/data/constants";

interface CellData {
  month: string;
  category: string;
  amount: number;
  pctOfMonth: number;
  intensity: number;
}

export default function SpendHeatmap() {
  const [tooltip, setTooltip] = useState<CellData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const { months, categories, grid } = useMemo(() => {
    const { transactions } = getMockData();

    const monthCatSpend: Record<string, Record<string, number>> = {};
    const monthTotals: Record<string, number> = {};

    for (const t of transactions) {
      if (t.type !== "debit") continue;
      const m = t.date.slice(0, 7);
      if (!monthCatSpend[m]) monthCatSpend[m] = {};
      monthCatSpend[m][t.category] = (monthCatSpend[m][t.category] ?? 0) + t.amount;
      monthTotals[m] = (monthTotals[m] ?? 0) + t.amount;
    }

    const allMonths = Object.keys(monthCatSpend).sort();
    const catSet = new Set<string>();
    for (const m of allMonths) {
      for (const c of Object.keys(monthCatSpend[m])) {
        catSet.add(c);
      }
    }
    // Exclude Transfer and Income categories
    const allCategories = [...catSet]
      .filter((c) => c !== "Transfer" && c !== "Income")
      .sort();

    // Compute max per category for column-level normalization
    const maxPerCat: Record<string, number> = {};
    for (const cat of allCategories) {
      let max = 0;
      for (const m of allMonths) {
        const val = monthCatSpend[m][cat] ?? 0;
        if (val > max) max = val;
      }
      maxPerCat[cat] = max;
    }

    // Build grid
    const gridData: CellData[][] = allMonths.map((m) => {
      const total = monthTotals[m] || 1;
      return allCategories.map((cat) => {
        const amount = monthCatSpend[m][cat] ?? 0;
        const colMax = maxPerCat[cat] || 1;
        return {
          month: m,
          category: cat,
          amount,
          pctOfMonth: (amount / total) * 100,
          intensity: amount / colMax,
        };
      });
    });

    return {
      months: allMonths,
      categories: allCategories,
      grid: gridData,
    };
  }, []);

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-").map(Number);
    return new Date(y, mo - 1).toLocaleString("en-US", {
      month: "short",
      year: "2-digit",
    });
  };

  const getColor = (intensity: number) => {
    if (intensity === 0) return "rgb(245, 235, 243)";
    const min = 0.15;
    const scaled = min + intensity * (1 - min);
    // Pink/purple tones based on #D4A0CC
    const r = Math.round(245 - scaled * (245 - 160));
    const g = Math.round(235 - scaled * (235 - 100));
    const b = Math.round(243 - scaled * (243 - 180));
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-[var(--bg-secondary-solid)] z-10 px-2 py-2 text-left text-content-tertiary font-normal uppercase tracking-wide">
                Month
              </th>
              {categories.map((cat) => (
                <th
                  key={cat}
                  className="px-1.5 py-2 text-center text-content-tertiary font-normal uppercase tracking-wide whitespace-nowrap"
                  style={{ minWidth: 60 }}
                >
                  {cat}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, ri) => (
              <tr key={months[ri]}>
                <td className="sticky left-0 bg-[var(--bg-secondary-solid)] z-10 px-2 py-1.5 text-content-secondary font-medium whitespace-nowrap">
                  {formatMonth(months[ri])}
                </td>
                {row.map((cell, ci) => (
                  <td
                    key={categories[ci]}
                    className="px-1 py-1.5 text-center cursor-default"
                    onMouseEnter={(e) => {
                      setTooltip(cell);
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltipPos({
                        x: rect.left + rect.width / 2,
                        y: rect.top - 8,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <div
                      className="w-full h-7 rounded"
                      style={{ backgroundColor: getColor(cell.intensity) }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs shadow-lg pointer-events-none"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-medium">{formatMonth(tooltip.month)} - {tooltip.category}</p>
          <p>{formatCurrency(tooltip.amount, DEFAULT_CURRENCY)}</p>
          <p className="text-gray-300">{tooltip.pctOfMonth.toFixed(1)}% of month&apos;s total</p>
        </div>
      )}
    </div>
  );
}
