import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/utils/claudeClient";
import { buildLLMContext } from "@/utils/buildLLMContext";
import { getMockData } from "@/data/mockData";
import { filterByDate, sumByCategory, getTopMerchants, formatCurrency } from "@/utils/dataUtils";
import type { RoastResult, APIResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period } = body;

    if (period !== "week" && period !== "month") {
      return NextResponse.json(
        { success: false, error: "Period must be 'week' or 'month'" } satisfies APIResponse<never>,
        { status: 400 }
      );
    }

    const { transactions, profile } = getMockData();

    // Use the most recent transaction date as the anchor point instead of today,
    // so the date range always overlaps with the mock data regardless of when the demo runs
    const sortedDates = transactions
      .map((t) => t.date)
      .sort((a, b) => b.localeCompare(a));
    const latestDate = sortedDates[0] ?? new Date().toISOString().split("T")[0];
    const endDate = new Date(latestDate);

    const daysBack = period === "week" ? 7 : 30;
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysBack);

    const start = startDate.toISOString().split("T")[0];
    const end = endDate.toISOString().split("T")[0];

    const periodTransactions = filterByDate(transactions, start, end);

    if (periodTransactions.length === 0) {
      return NextResponse.json(
        { success: false, error: "No transactions found for the selected period" } satisfies APIResponse<never>,
        { status: 400 }
      );
    }

    const categoryTotals = sumByCategory(periodTransactions);

    let worstCategory = "";
    let worstAmount = 0;
    for (const [cat, amount] of Object.entries(categoryTotals) as [string, number][]) {
      if (amount > worstAmount) {
        worstAmount = amount;
        worstCategory = cat;
      }
    }

    const topMerchants = getTopMerchants(periodTransactions, 5);
    const totalSpent = periodTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const baseContext = buildLLMContext({ transactions: periodTransactions, profile });

    const systemPrompt = `${baseContext}

You are a brutally honest financial roast comedian — think a mix between a disappointed parent looking at a credit card statement and a stand-up comedian who just discovered their audience's bank accounts. Your job: roast the user's spending over the past ${period}.

TONE & STYLE RULES:
- Open with a punchy one-liner that sets the tone (e.g., "I've seen some financial disasters, but yours? This deserves a documentary.")
- Use specific numbers, category names, and merchant names from the data — generic roasts are lazy
- Exaggerate for comedic effect but stay grounded in the real data
- Mix sarcasm with backhanded compliments ("At least you're consistent — consistently broke")
- End with one genuine, surprisingly helpful piece of advice buried inside the humor
- Keep it 3-4 tight paragraphs — quality over quantity
- Never be cruel or personal — roast the SPENDING, not the person

EXAMPLE TONE (do NOT copy, just match the energy):
"Your dining category looks like you've got a personal chef named UberEats. R2,400 in one week? That's not a food budget, that's a restaurant investment portfolio. At this rate, you'll own the place by December — oh wait, no, they'll own YOU."

After your roast, on a new line, output ONLY this XML tag with a realistic savings estimate as a plain integer:
<savings_potential>NUMBER</savings_potential>`;

    const userMessage = `Roast my spending for the past ${period}. Total spent: ${formatCurrency(totalSpent, profile.currency)}. Category breakdown: ${JSON.stringify(categoryTotals)}. Worst category: "${worstCategory}" at ${formatCurrency(worstAmount, profile.currency)}. Top merchants: ${JSON.stringify(topMerchants)}. My monthly income is ${formatCurrency(profile.monthlyIncome, profile.currency)} and my balance is ${formatCurrency(profile.currentBalance, profile.currency)}.`;

    const claudeResponse = await callClaude(systemPrompt, userMessage);

    const savingsMatch = claudeResponse.match(/<savings_potential>(\d+)<\/savings_potential>/);
    const savingsPotential = savingsMatch ? parseInt(savingsMatch[1], 10) : Math.round(worstAmount * 0.3);

    const roastText = claudeResponse
      .replace(/<savings_potential>\d+<\/savings_potential>/, "")
      .trim();

    const result: RoastResult = {
      roast: roastText,
      worstCategory,
      savingsPotential,
    };

    return NextResponse.json(
      { success: true, data: result } satisfies APIResponse<RoastResult>,
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { success: false, error: message } satisfies APIResponse<never>,
      { status: 500 }
    );
  }
}
