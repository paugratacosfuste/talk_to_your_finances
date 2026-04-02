import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/utils/claudeClient';
import { buildLLMContext } from '@/utils/buildLLMContext';
import { getMockData } from '@/data/mockData';
import type { ChatMessage, APIResponse } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history } = body as {
      message: string;
      history?: ChatMessage[];
    };

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required.' } satisfies APIResponse<never>,
        { status: 400 }
      );
    }

    const data = getMockData();
    const systemPrompt = buildLLMContext(data);

    const reply = await callClaude(systemPrompt, message, history ?? []);

    return NextResponse.json(
      { success: true, data: { reply } } satisfies APIResponse<{ reply: string }>,
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json(
      { success: false, error: errorMessage } satisfies APIResponse<never>,
      { status: 500 }
    );
  }
}
