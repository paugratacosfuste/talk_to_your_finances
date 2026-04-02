'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import AnimateIn from '@/components/ui/AnimateIn';
import { formatCurrency } from '@/utils/dataUtils';

interface SpendingSummaryProps {
  totalSpent: number;
  totalIncome: number;
  currency: string;
}

function useCounter(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

export default function SpendingSummary({ totalSpent, totalIncome, currency }: SpendingSummaryProps) {
  const animatedSpent = useCounter(totalSpent);
  const animatedIncome = useCounter(totalIncome);
  const net = totalIncome - totalSpent;
  const animatedNet = useCounter(net);
  const spentPercent = totalIncome > 0 ? Math.round((totalSpent / totalIncome) * 100) : 0;

  // Up = white in dark / black in light (uses content-primary via currentColor)
  // Down = pink always (#D4A0CC)
  const upColor = 'currentColor'; // inherits from text-content-primary
  const downColor = '#D4A0CC';

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Income - UP arrow */}
      <AnimateIn animation="fade-up" delay={0}>
        <Card className="text-center">
          <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-content-primary/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={upColor} strokeWidth="2.5" strokeLinecap="round" className="text-content-primary">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </div>
          <p className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-1">Income</p>
          <p className="text-base font-bold text-content-primary">
            {formatCurrency(animatedIncome, currency)}
          </p>
        </Card>
      </AnimateIn>

      {/* Spent - DOWN arrow */}
      <AnimateIn animation="fade-up" delay={80}>
        <Card className="text-center">
          <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full" style={{ backgroundColor: `${downColor}12` }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={downColor} strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
          <p className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-1">Spent</p>
          <p className="text-base font-bold" style={{ color: downColor }}>
            {formatCurrency(animatedSpent, currency)}
          </p>
        </Card>
      </AnimateIn>

      {/* Net */}
      <AnimateIn animation="fade-up" delay={160}>
        <Card className="text-center">
          <div className={`flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full ${net >= 0 ? 'bg-content-primary/5' : ''}`} style={net < 0 ? { backgroundColor: `${downColor}12` } : {}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={net >= 0 ? upColor : downColor} strokeWidth="2.5" strokeLinecap="round" className={net >= 0 ? 'text-content-primary' : ''}>
              {net >= 0
                ? <path d="M12 19V5M5 12l7-7 7 7" />
                : <path d="M12 5v14M5 12l7 7 7-7" />
              }
            </svg>
          </div>
          <p className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-1">Net</p>
          <p className={`text-base font-bold ${net >= 0 ? 'text-content-primary' : ''}`} style={net < 0 ? { color: downColor } : {}}>
            {formatCurrency(animatedNet, currency)}
          </p>
          <p className="text-[10px] text-content-tertiary mt-0.5">{spentPercent}% spent</p>
        </Card>
      </AnimateIn>
    </div>
  );
}
