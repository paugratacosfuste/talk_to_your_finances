'use client';

import { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '44px';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight, value]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!disabled && value.trim().length > 0) onSend();
    },
    [disabled, onSend, value]
  );

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div
        className="flex-1 relative rounded-xl border border-[var(--border)] focus-within:border-accent/40 focus-within:shadow-[0_0_0_2px_var(--accent-muted)] transition-all duration-200 bg-surface-tertiary/50"
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!disabled && value.trim().length > 0) onSend();
            }
          }}
          placeholder="Ask about your finances..."
          className="w-full bg-transparent text-sm text-content-primary placeholder:text-content-tertiary px-3.5 py-2.5 resize-none focus:outline-none"
          disabled={disabled}
          rows={1}
          style={{ height: '44px', maxHeight: '120px' }}
        />
      </div>
      <motion.button
        type="submit"
        whileTap={{ scale: 0.92 }}
        disabled={disabled || value.trim().length === 0}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
          value.trim()
            ? 'bg-accent text-white shadow-lg shadow-accent/20'
            : 'bg-surface-tertiary text-content-tertiary'
        }`}
        aria-label="Send message"
      >
        {disabled ? (
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
    </form>
  );
}
