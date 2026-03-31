import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/utils/claudeClient";
import { buildLLMContext } from "@/utils/buildLLMContext";
import { getMockData } from "@/data/mockData";
import { filterByDate } from "@/utils/dataUtils";
import type { DiaryResult, APIResponse } from "@/types";

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
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalIncome = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const baseContext = buildLLMContext({ transactions: monthTransactions, profile });

    const monthName = new Date(year, monthNum - 1).toLocaleString("en-US", { month: "long" });

    const systemPrompt = `${baseContext}

You are a creative writer who personifies money as a living character. Write a first-person diary entry from the perspective of the user's money, describing its adventures during ${monthName} ${year}. The money should have personality — it can feel joy when it arrives (income), anxiety when it's spent frivolously, satisfaction when spent wisely, and existential dread when the balance drops low.

Reference actual transactions, merchants, and categories from the data. Make it vivid and entertaining. Use literary devices. The diary entry should be 4-6 paragraphs long.

Write ONLY the diary narrative. Do not include any metadata, headers, titles, or structured data.`;

    const userMessage = `Write a diary entry for ${monthName} ${year}. Total income this month: ${totalIncome}. Total spent this month: ${totalSpent}. Number of transactions: ${monthTransactions.length}.`;

    const claudeResponse = await callClaude(systemPrompt, userMessage);

    const result: DiaryResult = {
      narrative: claudeResponse.trim(),
      month,
      totalSpent,
      totalIncome,
    };

    return NextResponse.json(
      { success: true, data: result } satisfies APIResponse<DiaryResult>,
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
