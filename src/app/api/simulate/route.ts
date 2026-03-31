import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/utils/claudeClient";
import { buildLLMContext } from "@/utils/buildLLMContext";
import { getMockData } from "@/data/mockData";
import type { SimulationResult, APIResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { purchaseDescription, amount } = body;

    if (!purchaseDescription || typeof purchaseDescription !== "string" || purchaseDescription.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Purchase description is required" } satisfies APIResponse<never>,
        { status: 400 }
      );
    }

    if (amount !== undefined && amount !== null) {
      if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { success: false, error: "Amount must be a positive number" } satisfies APIResponse<never>,
          { status: 400 }
        );
      }
    }

    const { transactions, profile } = getMockData();
    const baseContext = buildLLMContext({ transactions, profile });

    const now = new Date();
    const projectionMonths: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const future = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const y = future.getFullYear();
      const m = String(future.getMonth() + 1).padStart(2, "0");
      projectionMonths.push(`${y}-${m}`);
    }

    const systemPrompt = `${baseContext}

You are a precise financial analyst. The user is considering a purchase. Analyze whether they can afford it and project the financial impact over the next 6 months.

You MUST respond in the following exact format with no additional text outside these tags:

<analysis>
Your 2-3 paragraph analysis of the purchase's financial impact. Be specific about numbers. Mention the user's current balance, monthly income, typical expenses, and how this purchase fits in.
</analysis>
<can_afford>true OR false</can_afford>
<risk_level>low OR medium OR high</risk_level>
<projected_balances>
<entry date="${projectionMonths[0]}" with_purchase="NUMBER" without_purchase="NUMBER" />
<entry date="${projectionMonths[1]}" with_purchase="NUMBER" without_purchase="NUMBER" />
<entry date="${projectionMonths[2]}" with_purchase="NUMBER" without_purchase="NUMBER" />
<entry date="${projectionMonths[3]}" with_purchase="NUMBER" without_purchase="NUMBER" />
<entry date="${projectionMonths[4]}" with_purchase="NUMBER" without_purchase="NUMBER" />
<entry date="${projectionMonths[5]}" with_purchase="NUMBER" without_purchase="NUMBER" />
</projected_balances>

Rules for projected_balances:
- Use the exact date values shown above for each entry
- NUMBER must be an integer (no decimals, no currency symbols, no commas)
- without_purchase should reflect the user's natural balance trajectory based on historical income and spending patterns
- with_purchase should subtract the purchase amount from the first month and reflect any ongoing cost impact
- Be realistic based on the user's actual income and spending patterns from the data`;

    const amountText = amount
      ? `The cost is approximately ${amount} ${profile.currency}.`
      : "Please estimate a reasonable cost based on the description.";

    const userMessage = `I'm considering buying: ${purchaseDescription.trim()}. ${amountText} Analyze the impact and project my balances for the next 6 months.`;

    const claudeResponse = await callClaude(systemPrompt, userMessage);

    const analysisMatch = claudeResponse.match(/<analysis>([\s\S]*?)<\/analysis>/);
    const canAffordMatch = claudeResponse.match(/<can_afford>(true|false)<\/can_afford>/);
    const riskMatch = claudeResponse.match(/<risk_level>(low|medium|high)<\/risk_level>/);
    const balanceMatches = [
      ...claudeResponse.matchAll(/<entry date="([^"]+)" with_purchase="([^"]+)" without_purchase="([^"]+)" \/>/g),
    ];

    if (!analysisMatch || !canAffordMatch || !riskMatch || balanceMatches.length === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to parse simulation results. Please try again." } satisfies APIResponse<never>,
        { status: 500 }
      );
    }

    const projectedBalances = balanceMatches.map((match) => ({
      date: match[1],
      withPurchase: parseInt(match[2], 10),
      withoutPurchase: parseInt(match[3], 10),
    }));

    const hasInvalidBalances = projectedBalances.some(
      (b) => isNaN(b.withPurchase) || isNaN(b.withoutPurchase)
    );

    if (hasInvalidBalances) {
      return NextResponse.json(
        { success: false, error: "Failed to parse simulation results. Please try again." } satisfies APIResponse<never>,
        { status: 500 }
      );
    }

    const result: SimulationResult = {
      analysis: analysisMatch[1].trim(),
      projectedBalances,
      canAfford: canAffordMatch[1] === "true",
      riskLevel: riskMatch[1] as "low" | "medium" | "high",
    };

    return NextResponse.json(
      { success: true, data: result } satisfies APIResponse<SimulationResult>,
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
