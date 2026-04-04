'use client';

const DEFAULT_QUESTIONS = [
  'What did I spend the most on last month?',
  'How much did I spend on restaurants in April 2025?',
  'What are my top 5 merchants?',
  'Am I spending more or less over time?',
  'What was my biggest single purchase?',
];

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  questions?: string[];
}

export default function SuggestedQuestions({
  onSelect,
  questions = DEFAULT_QUESTIONS,
}: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {questions.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onSelect(q)}
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-blue-400 hover:text-blue-700"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
