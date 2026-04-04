import { NextResponse } from 'next/server';
import type { APIResponse, ChatMessage } from '@/types';
import { callClaude } from '@/utils/claudeClient';
import { buildLLMContext } from '@/utils/buildLLMContext';
import { getMockData } from '@/data/mockData';

interface ChatRequestBody {
  message?: string;
  history?: ChatMessage[];
}

const MAX_HISTORY_MESSAGES = 12;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const message = body.message?.trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const trimmedHistory = history
      .filter(
        (msg): msg is ChatMessage =>
          msg !== null &&
          typeof msg === 'object' &&
          (msg.role === 'user' || msg.role === 'assistant') &&
          typeof msg.content === 'string' &&
          msg.content.trim().length > 0
      )
      .slice(-MAX_HISTORY_MESSAGES);

    if (!message) {
      const response: APIResponse<{ reply: string }> = {
        success: false,
        error: 'Message is required.',
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { transactions, profile } = getMockData();
    const systemPrompt = buildLLMContext({ transactions, profile });

    const reply = await callClaude(systemPrompt, message, trimmedHistory);

    const response: APIResponse<{ reply: string }> = {
      success: true,
      data: { reply },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const response: APIResponse<{ reply: string }> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error.',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
