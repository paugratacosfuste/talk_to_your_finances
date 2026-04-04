'use client';

import { useCallback, useMemo, useState } from 'react';
import type { APIResponse, ChatMessage } from '@/types';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import SuggestedQuestions from './SuggestedQuestions';

interface ChatReply {
  reply: string;
}

export default function ChatView() {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMessages = history.length > 0;

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const priorHistory = history;

    setHistory((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history: priorHistory }),
      });

      const payload = (await response.json()) as APIResponse<ChatReply>;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Something went wrong.');
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: payload.data.reply,
        timestamp: new Date().toISOString(),
      };

      setHistory((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error.';
      setHistory(priorHistory);
      setInput(trimmed);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [history, input, isLoading]);

  const handleSelectSuggested = useCallback(
    (question: string) => {
      setInput(question);
    },
    []
  );

  const headerCopy = useMemo(
    () =>
      hasMessages
        ? 'Keep going — ask about categories, trends, or specific merchants.'
        : 'Ask anything about your spending. Try a quick question below.',
    [hasMessages]
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-gray-900">Talk to Your Transactions</h1>
        <p className="text-sm text-gray-500">{headerCopy}</p>
      </header>

      {!hasMessages ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6">
          <p className="text-sm text-gray-600">
            No messages yet. Start with a suggested question or type your own.
          </p>
          <div className="mt-4">
            <SuggestedQuestions onSelect={handleSelectSuggested} />
          </div>
        </div>
      ) : (
        <section className="flex flex-1 flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {history.map((msg) => (
            <ChatBubble key={`${msg.timestamp}-${msg.role}`} message={msg} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
              Claude is thinking…
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        {hasMessages && (
          <SuggestedQuestions onSelect={handleSelectSuggested} />
        )}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={isLoading}
        />
      </section>
    </main>
  );
}
