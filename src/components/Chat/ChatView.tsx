'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasMessages = history.length > 0;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [history, isLoading, scrollToBottom]);

  const handleSend = useCallback(async (text?: string) => {
    const trimmed = (text ?? input).trim();
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
      handleSend(question);
    },
    [handleSend]
  );

  const headerCopy = useMemo(
    () =>
      hasMessages
        ? 'Keep going — ask about categories, trends, or specific merchants.'
        : 'Ask anything about your spending. Try a quick question below.',
    [hasMessages]
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 2c.5 3-1.5 5-3 7 1.5 0 3 .5 3 3 0-2.5 1.5-3 3-3-1.5-2-3.5-4-3-7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Finance AI</h1>
          <p className="text-[11px] text-gray-500">{headerCopy}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[11px] text-gray-500">Online</span>
        </div>
      </div>

      <section className="flex-1 overflow-y-auto px-6 py-6">
        {!hasMessages && !isLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 h-20 w-20 rounded-full bg-blue-200/50 blur-2xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                </svg>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Talk to Your Finances</h2>
            <p className="mt-1 max-w-xs text-xs text-gray-500">
              Ask anything about your spending habits, transactions, or financial health.
            </p>
            <div className="mt-6 w-full">
              <SuggestedQuestions onSelect={handleSelectSuggested} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {history.map((msg) => (
              <ChatBubble key={`${msg.timestamp}-${msg.role}`} message={msg} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M12 2c.5 3-1.5 5-3 7 1.5 0 3 .5 3 3 0-2.5 1.5-3 3-3-1.5-2-3.5-4-3-7z" />
                  </svg>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-500">
                  Claude is thinking…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </section>

      <section className="border-t border-gray-100 bg-gray-50 px-6 py-4">
        {hasMessages && history.length < 4 && (
          <div className="mb-3">
            <SuggestedQuestions
              onSelect={handleSelectSuggested}
              questions={['Top merchants?', 'Monthly trend?', 'Biggest expense?']}
              compact
            />
          </div>
        )}
        {error && <div className="mb-2 text-sm text-red-600">{error}</div>}
        <ChatInput value={input} onChange={setInput} onSend={handleSend} disabled={isLoading} />
      </section>
    </main>
  );
}
