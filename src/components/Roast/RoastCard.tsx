import { formatCurrency } from "@/utils/dataUtils";
import type { RoastResult } from "@/types";

interface RoastCardProps {
  result: RoastResult;
  currency: string;
}

export default function RoastCard({ result, currency }: RoastCardProps) {
  const paragraphs = result.roast.split("\n\n").filter(Boolean);

  return (
    <div className="rounded-2xl border border-red-200 bg-white shadow-md overflow-hidden">
      <div className="bg-red-50 px-6 py-4 border-b border-red-200">
        <h3 className="text-lg font-semibold text-red-800">Your Roast is Served</h3>
      </div>

      <div className="px-6 py-5 space-y-4">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-gray-700 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Worst category:</span>
          <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 capitalize">
            {result.worstCategory}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">You could save:</span>
          <span className="text-lg font-bold text-green-700">
            {formatCurrency(result.savingsPotential, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
