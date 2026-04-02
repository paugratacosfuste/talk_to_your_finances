'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import AnimateIn from '@/components/ui/AnimateIn';
import { formatCurrency } from '@/utils/dataUtils';

interface BalanceChartProps {
  balanceHistory: { date: string; balance: number }[];
  currency: string;
}

export default function BalanceChart({ balanceHistory, currency }: BalanceChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!balanceHistory.length) return null;

  const step = Math.max(1, Math.floor(balanceHistory.length / 40));
  const data = balanceHistory.filter((_, i) => i % step === 0 || i === balanceHistory.length - 1);

  const balances = data.map((d) => d.balance);
  const min = Math.min(...balances);
  const max = Math.max(...balances);
  const range = max - min || 1;

  const width = 360;
  const height = 140;
  const paddingTop = 10;
  const paddingBottom = 6;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = paddingTop + chartHeight - ((d.balance - min) / range) * chartHeight;
    return { x, y, date: d.date, balance: d.balance };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;
  const latest = data[data.length - 1];
  const first = data[0];
  const change = latest.balance - first.balance;
  const changePct = first.balance !== 0 ? (change / first.balance) * 100 : 0;

  return (
    <AnimateIn animation="fade-up" delay={100}>
      <Card noPadding>
        <div className="px-5 pt-5 pb-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold text-content-primary">Balance Trend</h3>
            <div className={`flex items-center gap-1 text-sm font-medium ${change >= 0 ? 'text-content-primary' : ''}`} style={change < 0 ? { color: '#D4A0CC' } : {}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                {change >= 0
                  ? <path d="M12 19V5M5 12l7-7 7 7" />
                  : <path d="M12 5v14M5 12l7 7 7-7" />
                }
              </svg>
              {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%
            </div>
          </div>
          {hovered ? (
            <div className="animate-fade-in">
              <span className="text-2xl font-bold text-content-primary">{formatCurrency(hovered.balance, currency)}</span>
              <span className="text-xs text-content-tertiary ml-2">{hovered.date}</span>
            </div>
          ) : (
            <span className="text-2xl font-bold text-content-primary">{formatCurrency(latest.balance, currency)}</span>
          )}
        </div>

        <div className="px-3 pb-4">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
            preserveAspectRatio="none"
            onMouseLeave={() => setHoveredIndex(null)}
            onTouchEnd={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-gradient-start)" />
                <stop offset="100%" stopColor="var(--chart-gradient-end)" />
              </linearGradient>
            </defs>

            <path d={areaPath} fill="url(#balanceGrad)" className="chart-area" />

            <path
              d={linePath}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="chart-line"
            />

            {points.map((p, i) => (
              <rect
                key={i}
                x={p.x - width / data.length / 2}
                y={0}
                width={width / data.length}
                height={height}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
                onTouchStart={() => setHoveredIndex(i)}
              />
            ))}

            {hovered && (
              <>
                <line x1={hovered.x} y1={0} x2={hovered.x} y2={height} stroke="var(--accent)" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
                <circle
                  cx={hovered.x} cy={hovered.y} r="5"
                  fill="var(--accent)" stroke="var(--bg-secondary-solid)" strokeWidth="2.5"
                  className="animate-scale-in"
                />
              </>
            )}
          </svg>

          <div className="flex justify-between px-2 mt-2">
            <span className="text-[10px] text-content-tertiary">{data[0].date}</span>
            <span className="text-[10px] text-content-tertiary">{latest.date}</span>
          </div>
        </div>
      </Card>
    </AnimateIn>
  );
}
