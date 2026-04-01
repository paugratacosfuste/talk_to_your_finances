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

  const net = result.totalIncome - result.totalSpent;

  return (
    <div className="rounded-2xl border border-amber-200 bg-white shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-amber-600 to-yellow-500 px-6 py-4">
        <h3 className="text-lg font-bold text-white font-serif">
          Dear Diary — {monthName}
        </h3>
      </div>

      <div className="px-6 py-6 space-y-4 bg-amber-50/30">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-gray-800 leading-relaxed font-serif text-[15px]">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="px-6 py-4 bg-white border-t border-amber-100">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Spent</p>
            <p className="text-lg font-bold text-red-600">
              {formatCurrency(result.totalSpent, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Earned</p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(result.totalIncome, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Net</p>
            <p className={`text-lg font-bold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
              {net >= 0 ? "+" : ""}{formatCurrency(net, currency)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
