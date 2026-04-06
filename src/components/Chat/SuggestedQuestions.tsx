'use client';

import { motion } from 'framer-motion';

const DEFAULT_QUESTIONS = [
  'What did I spend the most on last month?',
  'How much did I spend on restaurants?',
  'What are my top 5 merchants?',
  'Am I spending more or less over time?',
];

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  questions?: string[];
  compact?: boolean;
}

export default function SuggestedQuestions({
  onSelect,
  questions = DEFAULT_QUESTIONS,
  compact = false,
}: SuggestedQuestionsProps) {
  if (compact) {
    return (
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {questions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onSelect(q)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-[10px] font-medium border border-accent/20 hover:bg-accent/20 transition-colors active:scale-95"
          >
            {q}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {questions.map((q, i) => (
        <motion.button
          key={q}
          type="button"
          onClick={() => onSelect(q)}
          className="w-full text-left px-4 py-3 rounded-xl bg-[var(--bg-secondary)] glass-card border border-[var(--border)] text-xs text-content-secondary hover:text-content-primary hover:border-accent/30 transition-all active:scale-[0.98]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.08 }}
        >
          <span className="text-accent mr-2">&#8594;</span>
          {q}
        </motion.button>
      ))}
    </div>
  );
}
