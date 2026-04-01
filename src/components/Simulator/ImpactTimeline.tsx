"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SimulationResult } from "@/types";

interface ImpactTimelineProps {
  projectedBalances: SimulationResult["projectedBalances"];
}

function formatMonth(dateStr: string): string {
  const [yearStr, monthStr] = dateStr.split("-");
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1);
  return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

function formatYAxis(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return String(value);
}

export default function ImpactTimeline({ projectedBalances }: ImpactTimelineProps) {
  const hasConfidenceBands = projectedBalances[0]?.withPurchaseP10 !== undefined;

  const chartData = projectedBalances.map((entry) => ({
    name: formatMonth(entry.date),
    "Without Purchase": entry.withoutPurchase,
    "With Purchase": entry.withPurchase,
    // Confidence band ranges for Area components (needs [low, high] arrays)
    ...(hasConfidenceBands
      ? {
          withoutRange: [entry.withoutPurchaseP10, entry.withoutPurchaseP90],
          withRange: [entry.withPurchaseP10, entry.withPurchaseP90],
        }
      : {}),
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "#6b7280" }}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 12, fill: "#6b7280" }}
          />
          <Tooltip
            formatter={(value: number | number[], name: string) => {
              if (Array.isArray(value)) {
                return [`${value[0].toLocaleString()} – ${value[1].toLocaleString()}`, name];
              }
              return [value.toLocaleString(), name];
            }}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              fontSize: "13px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "13px" }} />

          {/* Confidence bands (P10–P90 shading) */}
          {hasConfidenceBands && (
            <Area
              type="monotone"
              dataKey="withoutRange"
              fill="#22c55e"
              fillOpacity={0.1}
              stroke="none"
              name="Without Purchase (P10–P90)"
              legendType="none"
            />
          )}
          {hasConfidenceBands && (
            <Area
              type="monotone"
              dataKey="withRange"
              fill="#ef4444"
              fillOpacity={0.1}
              stroke="none"
              name="With Purchase (P10–P90)"
              legendType="none"
            />
          )}

          {/* Median lines (P50) */}
          <Line
            type="monotone"
            dataKey="Without Purchase"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="With Purchase"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
