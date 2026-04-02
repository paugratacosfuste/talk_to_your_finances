'use client';

import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-content-secondary">{label}</label>
      )}
      <input
        className={`
          w-full px-4 py-2.5 rounded-xl text-sm
          bg-surface-tertiary text-content-primary
          border border-[var(--border)]
          placeholder:text-content-tertiary
          focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
          transition-all duration-200
          ${className}
        `}
        {...props}
      />
    </div>
  );
}
