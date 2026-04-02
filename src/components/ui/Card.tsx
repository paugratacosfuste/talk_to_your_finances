'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  noPadding?: boolean;
}

export default function Card({ children, className = '', onClick, noPadding }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        warm-card
        shadow-[var(--card-shadow)]
        transition-all duration-200
        ${!noPadding ? 'p-4' : ''}
        ${onClick ? 'cursor-pointer hover:shadow-[var(--card-shadow-hover)] active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
