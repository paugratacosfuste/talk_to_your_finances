import { formatCurrency } from "@/utils/dataUtils";
import type { DiaryResult } from "@/types";

interface DiaryEntryProps {
  result: DiaryResult;
  currency: string;
}

export default function DiaryEntry({ result, currency }: DiaryEntryProps) {
  const paragraphs = result.narrative.split("\n\n").filter(Boolean);

  const [yearStr, monthStr] = result.month.split("-");
  const monthName = new Date(
    parseInt(yearStr, 10),
    parseInt(monthStr, 10) - 1
  ).toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-amber-200 bg-amber-100">
        <h3 className="text-lg font-serif font-semibold text-amber-900">
          Dear Diary — {monthName}
        </h3>
      </div>

      <div className="px-6 py-5 space-y-4">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-gray-800 leading-relaxed font-serif">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="px-6 py-4 bg-white border-t border-amber-200 flex flex-wrap gap-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Spent</p>
          <p className="text-lg font-bold text-red-600">
            {formatCurrency(result.totalSpent, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Income</p>
          <p className="text-lg font-bold text-green-600">
            {formatCurrency(result.totalIncome, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Net</p>
          <p className={`text-lg font-bold ${result.totalIncome - result.totalSpent >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(result.totalIncome - result.totalSpent, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}
