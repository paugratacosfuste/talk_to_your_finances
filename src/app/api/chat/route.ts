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
const MAX_REPLY_CHARS = 1200;

function buildJsonOnlyPrompt(systemPrompt: string): string {
  return `${systemPrompt}

RESPONSE FORMAT (STRICT)
Return ONLY valid JSON. No Markdown, no code fences, no extra text.
Schema:
{
  "reply": string,
  "isOnTopic": boolean
}`;
}

function parseClaudeJson(raw: string): { reply: string; isOnTopic: boolean } | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.reply !== 'string' ||
      typeof parsed.isOnTopic !== 'boolean'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

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
    const basePrompt = buildLLMContext({ transactions, profile });
    const systemPrompt = buildJsonOnlyPrompt(basePrompt);

    const rawResponse = await callClaude(systemPrompt, message, trimmedHistory);
    const parsed = parseClaudeJson(rawResponse);

    if (!parsed || parsed.reply.trim().length === 0) {
      const response: APIResponse<{ reply: string }> = {
        success: true,
        data: {
          reply:
            "I couldn't parse that response. Try asking in a different way, like a specific category or date range.",
        },
      };
      return NextResponse.json(response, { status: 200 });
    }

    if (!parsed.isOnTopic) {
      const response: APIResponse<{ reply: string }> = {
        success: true,
        data: {
          reply:
            'I can only answer questions about your transactions and spending. Try asking about a category, merchant, or time period.',
        },
      };
      return NextResponse.json(response, { status: 200 });
    }

    const safeReply = parsed.reply.trim().slice(0, MAX_REPLY_CHARS);

    const response: APIResponse<{ reply: string }> = {
      success: true,
      data: { reply: safeReply },
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
