// Server-side only — do not import in client components
// ============================================================
// Anthropic SDK wrapper for "Talk to Your Finances"
// Every API route calls callClaude() from this file.
// P1 (Sean) owns this file.
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage } from '@/types';

// Lazy-initialised client so the module can be imported without crashing
// if the env var is missing at import time (it will throw on first call instead).
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Add it to your .env.local file and restart the dev server.'
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// --------------- Main exported function ---------------

/**
 * Sends a message to Claude and returns the assistant's text response.
 *
 * @param systemPrompt      - Context / persona injected as the system message.
 * @param userMessage       - The current user message.
 * @param conversationHistory - Optional prior turns for multi-turn chat.
 * @returns                 - The assistant's reply as a plain string.
 */
export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  const client = getClient();

  // Build the messages array from conversation history + the new user message
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    {
      role: 'user' as const,
      content: userMessage,
    },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  // Extract the text content from the response
  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned an unexpected response format (no text block found).');
  }

  return textBlock.text;
}
