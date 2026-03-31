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

    const now = new Date();
    const daysBack = period === "week" ? 7 : 30;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);

    const start = startDate.toISOString().split("T")[0];
    const end = now.toISOString().split("T")[0];

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

    const baseContext = buildLLMContext({ transactions: periodTransactions, profile });

    const systemPrompt = `${baseContext}

You are a savage but lovable financial comedian. Your job is to roast the user's spending habits for the past ${period}. Be brutally honest, use humor, sarcasm, and exaggeration. Think of yourself as a stand-up comedian doing a bit about someone's bank statement. Keep it funny but not mean-spirited. Reference specific categories and amounts from their data. Your roast should be 3-4 paragraphs.

After your roast, on a new line, provide an estimated savings potential as a single number (no currency symbol, no commas, no decimals) wrapped in XML tags like this: <savings_potential>1234</savings_potential>

This number should represent a realistic estimate of how much the user could save in ${profile.currency} if they cut back on their worst spending habits during this period.`;

    const userMessage = `Roast my spending for the past ${period}. Here's my category breakdown: ${JSON.stringify(categoryTotals)}. My worst category is "${worstCategory}" at ${formatCurrency(worstAmount, profile.currency)}. Top merchants: ${JSON.stringify(topMerchants)}.`;

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
