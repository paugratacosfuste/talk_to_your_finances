import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/utils/claudeClient";
import { buildLLMContext } from "@/utils/buildLLMContext";
import { getMockData } from "@/data/mockData";
import { filterByDate, formatCurrency } from "@/utils/dataUtils";
import { z } from "zod";
import { callClaudeWithValidation, buildRetrySuffix } from "@/utils/llmValidation";
import type { DiaryResult, APIResponse } from "@/types";

// Extends Sean's DiaryResult with spending totals displayed in DiaryEntry
type ExtendedDiaryResult = DiaryResult & { totalSpent: number; totalIncome: number };

// ---------------------------------------------------------------------------
// LLM Output Validation: Schema & Fallback
// ---------------------------------------------------------------------------

const diaryResponseSchema = z.object({
  narrative: z.string().min(100).max(8000),
  highlights: z.array(z.string().min(5).max(200)).min(1).max(6),
});

const DIARY_FALLBACK = {
  narrative:
    "This month was a chapter in your financial story, but the full diary could not be written right now. Your spending and income details are summarized below.",
  highlights: ["Summary unavailable"],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month } = body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, error: "Month is required in YYYY-MM format" } satisfies APIResponse<never>,
        { status: 400 }
      );
    }

    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    if (monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { success: false, error: "Month must be between 01 and 12" } satisfies APIResponse<never>,
        { status: 400 }
      );
    }

    const { transactions, profile } = getMockData();

    const start = `${month}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const end = `${month}-${String(lastDay).padStart(2, "0")}`;

    const monthTransactions = filterByDate(transactions, start, end);

    if (monthTransactions.length === 0) {
      return NextResponse.json(
        { success: false, error: `No transactions found for ${month}` } satisfies APIResponse<never>,
        { status: 400 }
      );
    }

    const totalSpent = monthTransactions
      .filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalIncome = monthTransactions
      .filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + t.amount, 0);

    const baseContext = buildLLMContext({ transactions: monthTransactions, profile });

    const monthName = new Date(year, monthNum - 1).toLocaleString("en-US", { month: "long" });

    // Build a brief summary of notable transactions for richer narrative
    const expensesByCategory: Record<string, number> = {};
    const merchantMentions: string[] = [];
    for (const t of monthTransactions) {
      if (t.type === "debit") {
        expensesByCategory[t.category] = (expensesByCategory[t.category] ?? 0) + Math.abs(t.amount);
      }
      if (merchantMentions.length < 5 && !merchantMentions.includes(t.description)) {
        merchantMentions.push(t.description);
      }
    }

    const systemPrompt = `${baseContext}

You are a gifted creative writer. Your task: write a first-person diary entry from the perspective of the user's MONEY  - the currency itself is alive, sentient, and narrating its own month.

CHARACTER VOICE:
- The money has a dramatic, self-aware personality  - part philosopher, part gossip columnist
- It feels RELIEF when salary arrives ("Finally, reinforcements!")
- It feels BETRAYAL when spent on impulse purchases ("Traded for a third pair of sneakers? I thought we were building something here.")
- It feels PRIDE when spent wisely ("Rent day  - noble, necessary. I go with dignity.")
- It feels EXISTENTIAL DREAD when the balance drops dangerously low
- It can be petty, affectionate, sarcastic, and surprisingly wise  - sometimes in the same sentence

STRUCTURE:
- Open with the money "waking up" at the start of the month and checking the balance
- Middle paragraphs follow the month's narrative arc  - income arriving, spending episodes, close calls
- Reference SPECIFIC merchants, categories, and amounts from the data (this is critical  - generic entries feel fake)
- End with a reflective closing: where the money stands now, its hopes/fears for next month
- 4-6 paragraphs, vivid prose, literary devices welcome

Respond with ONLY a JSON object in this exact format, no markdown fences:
{"narrative": "<your diary entry here>", "highlights": ["<highlight 1>", "<highlight 2>", ...]}
- "narrative": 4-6 paragraphs of first-person diary prose, separated by \\n\\n
- "highlights": 3-5 short phrases summarizing the month's key financial events (e.g., "Rent paid on time", "Record spending at restaurants")
- Use standard hyphens (-), never em dashes
- Do not include any text outside the JSON object`;

    const userMessage = `Month: ${monthName} ${year}. Total income: ${formatCurrency(totalIncome, profile.currency)}. Total spent: ${formatCurrency(totalSpent, profile.currency)}. Transactions: ${monthTransactions.length}. Top spending categories: ${JSON.stringify(expensesByCategory)}. Merchants mentioned: ${merchantMentions.join(", ")}. User balance: ${formatCurrency(profile.currentBalance, profile.currency)}.`;

    const { data: diaryData, source: diarySource, attempts } =
      await callClaudeWithValidation({
        callFn: () => callClaude(systemPrompt, userMessage),
        schema: diaryResponseSchema,
        fallback: DIARY_FALLBACK,
        retryCallFn: (errorDetail) =>
          callClaude(
            systemPrompt + buildRetrySuffix(errorDetail),
            userMessage
          ),
      });

    if (diarySource === "fallback") {
      console.warn(
        `[/api/diary] LLM output validation failed after ${attempts} attempts. Using fallback.`
      );
    }

    const result: ExtendedDiaryResult = {
      narrative: diaryData.narrative,
      month,
      highlights: diaryData.highlights,
      totalSpent,
      totalIncome,
    };

    return NextResponse.json(
      {
        success: true,
        data: result,
        validated: diarySource !== "fallback",
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
