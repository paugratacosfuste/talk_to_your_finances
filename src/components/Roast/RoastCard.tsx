import { formatCurrency } from "@/utils/dataUtils";
import type { RoastResult } from "@/types";

interface RoastCardProps {
  result: RoastResult;
  currency: string;
}

export default function RoastCard({ result, currency }: RoastCardProps) {
  const paragraphs = result.roast.split("\n\n").filter(Boolean);

  return (
    <div className="rounded-2xl border border-red-200 bg-white shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 to-orange-500 px-6 py-4">
        <h3 className="text-lg font-bold text-white">Your Roast is Served</h3>
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
