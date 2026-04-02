'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '@/types';
import { SUGGESTED_QUESTIONS } from '@/data/constants';

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = '44px';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, []);

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '44px';
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: [...messages, userMessage].slice(-10),
        }),
      });

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.success ? data.data.reply : (data.error || 'Something went wrong. Please try again.'),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to connect. The API may not be set up yet.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0 && !isLoading;

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
          <p className="text-[10px] text-content-tertiary">Ask about your spending</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--income)] animate-pulse" />
          <span className="text-[10px] text-content-tertiary">Online</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3">
        {isEmpty && (
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

            {/* Suggested questions */}
            <div className="w-full space-y-2">
              {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
                <motion.button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-[var(--bg-secondary)] glass-card border border-[var(--border)] text-xs text-content-secondary hover:text-content-primary hover:border-accent/30 transition-all active:scale-[0.98]"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                >
                  <span className="text-accent mr-2">→</span>
                  {q}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Message bubbles */}
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-[#8B5CF6] flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2c.5 3-1.5 5-3 7 1.5 0 3 .5 3 3 0-2.5 1.5-3 3-3-1.5-2-3.5-4-3-7z" />
                  </svg>
                </div>
              )}
              <div
                className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent text-white rounded-br-md'
                    : 'bg-[var(--bg-secondary)] glass-card border border-[var(--border)] text-content-primary rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
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
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--bg-secondary)] glass-card px-3 py-2.5">
        {/* Quick suggestions when there are messages */}
        {messages.length > 0 && messages.length < 4 && (
          <div className="flex gap-1.5 mb-2 overflow-x-auto no-scrollbar">
            {['Top merchants?', 'Monthly trend?', 'Biggest expense?'].map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-[10px] font-medium border border-accent/20 hover:bg-accent/20 transition-colors active:scale-95"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div
            className={`flex-1 relative rounded-xl border transition-all duration-200 ${
              inputFocused ? 'border-accent/40 shadow-[0_0_0_2px_var(--accent-muted)]' : 'border-[var(--border)]'
            } bg-surface-tertiary/50`}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Ask about your finances..."
              className="w-full bg-transparent text-sm text-content-primary placeholder:text-content-tertiary px-3.5 py-2.5 resize-none focus:outline-none"
              style={{ height: '44px', maxHeight: '120px' }}
              rows={1}
            />
          </div>

          <motion.button
            onClick={() => handleSend()}
            whileTap={{ scale: 0.92 }}
            disabled={isLoading || !input.trim()}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
              input.trim()
                ? 'bg-accent text-white shadow-lg shadow-accent/20'
                : 'bg-surface-tertiary text-content-tertiary'
            }`}
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
              </motion.div>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
