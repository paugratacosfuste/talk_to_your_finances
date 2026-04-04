import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/utils/claudeClient";
import { buildLLMContext } from "@/utils/buildLLMContext";
import { getMockData } from "@/data/mockData";
import { filterByDate, sumByCategory, getTopMerchants, formatCurrency } from "@/utils/dataUtils";
import { z } from "zod";
import { callClaudeWithValidation, buildRetrySuffix } from "@/utils/llmValidation";
import type { RoastResult, APIResponse, Category } from "@/types";

// Extends Sean's RoastResult with the savings estimate produced by Claude
type ExtendedRoastResult = RoastResult & { savingsPotential: number };

// ---------------------------------------------------------------------------
// LLM Output Validation: Schema & Fallback
// ---------------------------------------------------------------------------

const roastResponseSchema = z.object({
  roastText: z.string().min(20).max(5000),
  savingsPotential: z.number().int().nonnegative().max(1_000_000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period, persona, ragContext } = body;

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
      .filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalIncome = periodTransactions
      .filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + t.amount, 0);

    const baseContext = buildLLMContext({ transactions: periodTransactions, profile });

    const personaBlock = persona
      ? `\nUser persona: ${persona}. Factor this into your roast.\n`
      : "";

    const ragBlock = ragContext ? `\n${ragContext}\n` : "";

    const systemPrompt = `${baseContext}
${ragBlock}${personaBlock}
You are a brutally honest financial roast comedian  - think a mix between a disappointed parent looking at a credit card statement and a stand-up comedian who just discovered their audience's bank accounts. Your job: roast the user's spending over the past ${period}.

TONE & STYLE RULES:
- Open with a punchy one-liner that sets the tone (e.g., "I've seen some financial disasters, but yours? This deserves a documentary.")
- Use specific numbers, category names, and merchant names from the data  - generic roasts are lazy
- Exaggerate for comedic effect but stay grounded in the real data
- Mix sarcasm with backhanded compliments ("At least you're consistent  - consistently broke")
- End with one genuine, surprisingly helpful piece of advice buried inside the humor
- Keep it 3-4 tight paragraphs  - quality over quantity
- Never be cruel or personal  - roast the SPENDING, not the person

EXAMPLE TONE (do NOT copy, just match the energy):
"Your dining category looks like you've got a personal chef named UberEats. R2,400 in one week? That's not a food budget, that's a restaurant investment portfolio. At this rate, you'll own the place by December  - oh wait, no, they'll own YOU."

Respond with ONLY a JSON object in this exact format, no markdown fences:
{"roastText": "<your roast here>", "savingsPotential": <integer>}
- "roastText": 3-4 paragraphs of roast text, separated by \\n\\n
- "savingsPotential": a realistic integer estimate of how much the user could save by cutting waste in the period
- Use standard hyphens (-), never em dashes
- Do not include any text outside the JSON object`;

    const userMessage = `Roast my spending for the past ${period}. Total spent: ${formatCurrency(totalSpent, profile.currency)}. Category breakdown: ${JSON.stringify(categoryTotals)}. Worst category: "${worstCategory}" at ${formatCurrency(worstAmount, profile.currency)}. Top merchants: ${JSON.stringify(topMerchants)}. My estimated monthly income is ${formatCurrency(totalIncome, profile.currency)} and my balance is ${formatCurrency(profile.currentBalance, profile.currency)}.`;

    const roastFallback = {
      roastText: `Your spending this ${period} was... something else. We could not generate a full roast right now. Try again in a moment!`,
      savingsPotential: 0,
    };

    const { data: roastData, source: roastSource, attempts } =
      await callClaudeWithValidation({
        callFn: () => callClaude(systemPrompt, userMessage),
        schema: roastResponseSchema,
        fallback: roastFallback,
        retryCallFn: (errorDetail) =>
          callClaude(
            systemPrompt + buildRetrySuffix(errorDetail),
            userMessage
          ),
      });

    if (roastSource === "fallback") {
      console.warn(
        `[/api/roast] LLM output validation failed after ${attempts} attempts. Using fallback.`
      );
    }

    // Business rule: clamp savingsPotential to totalSpent
    const clampedSavings =
      roastData.savingsPotential > totalSpent
        ? Math.round(totalSpent * 0.5)
        : roastData.savingsPotential;

    // Find the wildest (largest single) transaction for weekSummary
    const wildest = periodTransactions
      .filter((t) => t.type === "debit")
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];

    const result: ExtendedRoastResult = {
      roastText: roastData.roastText,
      weekSummary: {
        totalSpent,
        topCategory: worstCategory as Category,
        wildestTransaction: wildest
          ? `${wildest.description} (${formatCurrency(Math.abs(wildest.amount), profile.currency)})`
          : "N/A",
      },
      savingsPotential: clampedSavings,
    };

    return NextResponse.json(
      {
        success: true,
        data: result,
        validated: roastSource !== "fallback",
      },
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
