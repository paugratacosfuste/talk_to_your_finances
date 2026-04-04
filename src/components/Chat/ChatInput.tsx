'use client';

import { useCallback } from 'react';

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
  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!disabled) onSend();
    },
    [disabled, onSend]
  );

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!disabled && value.trim().length > 0) onSend();
          }
        }}
        placeholder="Ask about your spending, categories, or trends..."
        className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
        disabled={disabled}
        rows={2}
      />
      <button
        type="submit"
        className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled || value.trim().length === 0}
      >
        Send
      </button>
    </form>
  );
}
