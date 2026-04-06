'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage, APIResponse } from '@/types';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import SuggestedQuestions from './SuggestedQuestions';

interface ChatReply {
  reply: string;
}

function TypingDots() {
  return (
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 bg-accent rounded-full mx-0.5"
          animate={{
            opacity: [0.3, 0.9, 0.3],
            scale: [0.85, 1.1, 0.85],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: dot * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
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
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    };

    const priorHistory = history;

    setHistory((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: priorHistory,
        }),
      });

      const payload = (await res.json()) as APIResponse<ChatReply>;

      if (!res.ok || !payload.success || !payload.data) {
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
      setInput(msg);
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

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex-shrink-0 px-4 py-3 glass bg-surface-primary/70 border-b border-[var(--border)] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-[#8B5CF6] flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2c.5 3-1.5 5-3 7 1.5 0 3 .5 3 3 0-2.5 1.5-3 3-3-1.5-2-3.5-4-3-7z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-content-primary">Finance AI</h2>
          <p className="text-[10px] text-content-tertiary">
            {hasMessages
              ? 'Keep going \u2014 ask about categories, trends, or merchants.'
              : 'Ask about your spending'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--income)] animate-pulse" />
          <span className="text-[10px] text-content-tertiary">Online</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3">
        {!hasMessages && !isLoading ? (
          <motion.div
            className="flex flex-col items-center justify-center h-full text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Glow background */}
            <div className="relative mb-6">
              <div className="absolute inset-0 w-20 h-20 bg-accent/20 rounded-full blur-2xl" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-[#8B5CF6] flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                </svg>
              </div>
            </div>

            <motion.h3
              className="text-lg font-semibold text-content-primary mb-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Talk to Your Finances
            </motion.h3>
            <motion.p
              className="text-xs text-content-secondary max-w-[220px] leading-relaxed mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Ask anything about your spending habits, transactions, or financial health.
            </motion.p>

            <SuggestedQuestions onSelect={handleSelectSuggested} />
          </motion.div>
        ) : (
          <>
            <AnimatePresence>
              {history.map((msg) => (
                <ChatBubble key={`${msg.timestamp}-${msg.role}`} message={msg} />
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 mb-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 2c.5 3-1.5 5-3 7 1.5 0 3 .5 3 3 0-2.5 1.5-3 3-3-1.5-2-3.5-4-3-7z" />
                    </svg>
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[var(--bg-secondary)] glass-card border border-[var(--border)]">
                    <div className="flex items-center gap-1.5 text-xs text-content-secondary">
                      <span>Thinking</span>
                      <TypingDots />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--bg-secondary)] glass-card px-3 py-2.5">
        {/* Quick suggestions when there are messages */}
        {hasMessages && history.length < 4 && (
          <div className="mb-2">
            <SuggestedQuestions
              onSelect={handleSelectSuggested}
              questions={['Top merchants?', 'Monthly trend?', 'Biggest expense?']}
              compact
            />
          </div>
        )}

        {error && (
          <div className="mb-2 px-1 text-[11px] text-[var(--expense)]">{error}</div>
        )}

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => handleSend()}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
