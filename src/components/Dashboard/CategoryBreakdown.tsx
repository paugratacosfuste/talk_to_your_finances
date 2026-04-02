'use client';

import { useEffect, useState } from 'react';
import AnimateIn from '@/components/ui/AnimateIn';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { formatCurrency } from '@/utils/dataUtils';

const CATEGORY_COLORS: Record<string, string> = {
  Restaurants: '#E8B8E0',
  Shopping: '#D4A0CC',
  Transport: '#B898D8',
  Entertainment: '#C8A0D0',
  Other: '#A8A0B8',
  Groceries: '#E0C0E8',
  Subscriptions: '#B080C8',
  Rent: '#C8B0D8',
  Health: '#A890D0',
  Utilities: '#D0B8E0',
  Income: '#C0D0E8',
  Transfer: '#B8A0C8',
};

interface CategoryBreakdownProps {
  categoryTotals: Record<string, number>;
  currency: string;
}

export default function CategoryBreakdown({ categoryTotals, currency }: CategoryBreakdownProps) {
  const [animated, setAnimated] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const sorted = Object.entries(categoryTotals)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);

  const total = sorted.reduce((sum, [, amount]) => sum + amount, 0);

  // Donut chart math
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  const segments = sorted.map(([category, amount]) => {
    const pct = total > 0 ? amount / total : 0;
    const dashLength = pct * circumference;
    const offset = cumulativeOffset;
    cumulativeOffset += dashLength;
    return { category, amount, pct, dashLength, offset, color: CATEGORY_COLORS[category] || '#576574' };
  });

  const activeIdx = hoveredIdx ?? expandedIdx;
  const activeSeg = activeIdx !== null ? segments[activeIdx] : null;

  const handleSegmentClick = (idx: number) => {
    setExpandedIdx(expandedIdx === idx ? null : idx);
  };

  return (
    <AnimateIn animation="fade-up" delay={200}>
      <div className="warm-card shadow-[var(--card-shadow)] p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-content-primary">Spending by Category</h3>
          <span className="text-xs text-content-tertiary">All time</span>
        </div>

        {/* Donut Chart */}
        <div className="flex items-center gap-6 mb-5">
          <div className="relative flex-shrink-0" style={{ width: 168, height: 168 }}>
            <svg
              width="168"
              height="168"
              viewBox="0 0 168 168"
              className="-rotate-90"
            >
              {/* Background ring */}
              <circle
                cx="84" cy="84" r={radius}
                fill="none" stroke="var(--bg-tertiary)" strokeWidth="22"
              />
              {/* Animated segments */}
              {segments.map((seg, i) => {
                const isActive = activeIdx === i;
                return (
                  <circle
                    key={seg.category}
                    cx="84" cy="84" r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={isActive ? 28 : 22}
                    strokeDasharray={`${animated ? seg.dashLength : 0} ${circumference}`}
                    strokeDashoffset={-seg.offset}
                    strokeLinecap="round"
                    className="transition-all duration-500 cursor-pointer"
                    style={{
                      transitionDelay: animated ? '0ms' : `${i * 80 + 300}ms`,
                      filter: isActive ? `drop-shadow(0 0 8px ${seg.color}60)` : 'none',
                      opacity: activeIdx !== null && !isActive ? 0.35 : 1,
                    }}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => handleSegmentClick(i)}
                  />
                );
              })}
            </svg>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {activeSeg ? (
                <div className="animate-fade-in text-center">
                  <div className="flex items-center justify-center mb-0.5">
                    <CategoryIcon category={activeSeg.category} size={22} color={activeSeg.color} />
                  </div>
                  <p className="text-sm font-bold text-content-primary mt-0.5">
                    {Math.round(activeSeg.pct * 100)}%
                  </p>
                  <p className="text-[10px] text-content-tertiary">{activeSeg.category}</p>
                </div>
              ) : (
                <>
                  <p className="text-lg font-bold text-content-primary">{formatCurrency(total, currency)}</p>
                  <p className="text-[11px] text-content-tertiary">total spent</p>
                </>
              )}
            </div>
          </div>

          {/* Legend - top 5 */}
          <div className="flex-1 space-y-3">
            {segments.slice(0, 5).map((seg, i) => (
              <div
                key={seg.category}
                className="flex items-center gap-2.5 cursor-pointer transition-opacity duration-200"
                style={{ opacity: activeIdx !== null && activeIdx !== i ? 0.4 : 1 }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => handleSegmentClick(i)}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-sm text-content-secondary flex-1 truncate">
                  {seg.category}
                </span>
                <span className="text-sm font-semibold text-content-primary">
                  {Math.round(seg.pct * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Expanded detail panel */}
        {expandedIdx !== null && segments[expandedIdx] && (
          <div
            className="mb-4 rounded-xl p-4 border border-[var(--border)] animate-fade-in"
            style={{
              background: `linear-gradient(135deg, ${segments[expandedIdx].color}12, transparent)`,
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${segments[expandedIdx].color}15` }}
              >
                <CategoryIcon
                  category={segments[expandedIdx].category}
                  size={20}
                  color={segments[expandedIdx].color}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-content-primary">{segments[expandedIdx].category}</p>
                <p className="text-xs text-content-tertiary">
                  {Math.round(segments[expandedIdx].pct * 100)}% of total spending
                </p>
              </div>
              <p className="text-base font-bold text-content-primary">
                {formatCurrency(segments[expandedIdx].amount, currency)}
              </p>
            </div>
            <p className="text-xs text-accent font-medium cursor-pointer hover:underline">
              View more
            </p>
          </div>
        )}

        {/* Category list with amounts */}
        <div className="space-y-2.5 border-t border-[var(--border)] pt-4">
          <p className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-3">Top Categories</p>
          {sorted.slice(0, 6).map(([category, amount], i) => {
            const pct = total > 0 ? (amount / total) * 100 : 0;
            const color = CATEGORY_COLORS[category] || '#576574';
            const isExpanded = expandedIdx !== null && segments[expandedIdx]?.category === category;
            return (
              <div key={category}>
                <div
                  className="flex items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 hover:bg-surface-tertiary/50 p-1 -m-1"
                  style={{ opacity: 0, animation: `fadeUp 0.35s ease-out ${i * 50 + 400}ms forwards` }}
                  onClick={() => {
                    const segIdx = segments.findIndex(s => s.category === category);
                    if (segIdx >= 0) handleSegmentClick(segIdx);
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <CategoryIcon category={category} size={18} color={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-content-primary">{category}</p>
                    <div className="w-full h-1.5 rounded-full bg-surface-tertiary mt-1 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: animated ? `${pct}%` : '0%',
                          backgroundColor: color,
                          transitionDelay: `${i * 80 + 500}ms`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-content-primary">{formatCurrency(amount, currency)}</p>
                    <p className="text-[10px] text-content-tertiary">{Math.round(pct)}%</p>
                  </div>
                </div>
                {/* Inline expanded detail for category list item */}
                {isExpanded && (
                  <div
                    className="ml-13 mt-1.5 pl-3 border-l-2 animate-fade-in"
                    style={{ borderColor: color }}
                  >
                    <p className="text-xs text-content-secondary">
                      {formatCurrency(amount, currency)} spent ({Math.round(pct)}% of total)
                    </p>
                    <p className="text-xs text-accent font-medium mt-1 cursor-pointer hover:underline">
                      View more
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AnimateIn>
  );
}
