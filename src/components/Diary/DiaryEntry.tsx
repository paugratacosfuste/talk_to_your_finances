import { formatCurrency } from "@/utils/dataUtils";
import type { DiaryResult } from "@/types";

// Extends Sean's DiaryResult with spending totals displayed in the footer
type ExtendedDiaryResult = DiaryResult & { totalSpent: number; totalIncome: number };

interface DiaryEntryProps {
  result: ExtendedDiaryResult;
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
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary-solid)] shadow-[var(--card-shadow)] overflow-hidden">
      <div className="bg-gradient-to-r from-[#D4A0CC] to-[#A78BFA] px-6 py-4">
        <h3 className="text-lg font-bold text-white font-serif">
          Dear Diary — {monthName}
        </h3>
      </div>

      <div className="px-6 py-6 space-y-4 bg-accent-muted/30">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-content-primary leading-relaxed font-serif text-[15px]">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="px-6 py-4 bg-[var(--bg-secondary-solid)] border-t border-[var(--border)]">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-content-tertiary uppercase tracking-wide mb-1">Spent</p>
            <p className="text-lg font-bold text-[var(--expense)]">
              {formatCurrency(result.totalSpent, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-content-tertiary uppercase tracking-wide mb-1">Earned</p>
            <p className="text-lg font-bold text-[var(--income)]">
              {formatCurrency(result.totalIncome, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-content-tertiary uppercase tracking-wide mb-1">Net</p>
            <p className={`text-lg font-bold ${net >= 0 ? "text-[var(--income)]" : "text-[var(--expense)]"}`}>
              {net >= 0 ? "+" : ""}{formatCurrency(net, currency)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
