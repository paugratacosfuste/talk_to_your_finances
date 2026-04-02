'use client';

import { useState, useEffect } from 'react';
import { useFinancialData } from '@/hooks/useFinancialData';
import { getBalanceHistory, getSpendingTrend, formatCurrency, filterByDate, sumByCategory, getTotalSpent, getTotalIncome } from '@/utils/dataUtils';
import AnimateIn from '@/components/ui/AnimateIn';
import AccountCards from './AccountCards';
import QuickActions from './QuickActions';
import SpendingSummary from './SpendingSummary';
import CategoryBreakdown from './CategoryBreakdown';
import BalanceChart from './BalanceChart';
import TransactionList from './TransactionList';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TIME_PERIODS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: 'All', months: 0 },
];

export default function DashboardView() {
  const data = useFinancialData();
  const { profile, transactions } = data;
  const [activePeriod, setActivePeriod] = useState(3);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [wavePhase, setWavePhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWavePhase((p) => (p + 0.02) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Filter transactions by selected period
  const periodConfig = TIME_PERIODS[activePeriod];
  const filteredTxns = periodConfig.months === 0
    ? transactions
    : (() => {
        const allDates = transactions.map((t) => t.date).sort();
        if (!allDates.length) return transactions;
        const endDate = allDates[allDates.length - 1];
        const end = new Date(endDate);
        end.setMonth(end.getMonth() - periodConfig.months);
        const startDate = end.toISOString().slice(0, 10);
        return filterByDate(transactions, startDate, endDate);
      })();

  // Compute everything from filtered data
  const totalSpent = getTotalSpent(filteredTxns);
  const totalIncome = getTotalIncome(filteredTxns);
  const topCategories = sumByCategory(filteredTxns);
  const balanceHistory = getBalanceHistory(filteredTxns);
  const monthlyTrend = getSpendingTrend(filteredTxns, 'monthly');
  const recentMonths = monthlyTrend.slice(-6);
  const maxAmount = Math.max(...recentMonths.map((t) => t.amount), 1);

  // Last 20 transactions for the list
  const recentTxns = filteredTxns.slice(-20).reverse();

  return (
    <div className="relative space-y-5 pb-4">
      {/* Ambient animated background */}
      <div className="ambient-bg">
        <div className="ambient-wave" style={{
          width: '200px', height: '200px',
          background: 'radial-gradient(circle, rgba(212,160,204,0.2), transparent)',
          top: `${20 + Math.sin(wavePhase) * 15}%`,
          left: `${10 + Math.cos(wavePhase * 0.7) * 10}%`,
          opacity: 0.25, animation: 'none',
        }} />
        <div className="ambient-wave" style={{
          width: '180px', height: '180px',
          background: 'radial-gradient(circle, rgba(167,139,250,0.15), transparent)',
          top: `${50 + Math.sin(wavePhase * 1.3) * 12}%`,
          right: `${5 + Math.cos(wavePhase * 0.5) * 8}%`,
          opacity: 0.2, animation: 'none',
        }} />
        <div className="ambient-wave" style={{
          width: '150px', height: '150px',
          background: 'radial-gradient(circle, rgba(240,160,192,0.12), transparent)',
          bottom: `${15 + Math.sin(wavePhase * 0.9) * 10}%`,
          left: `${30 + Math.cos(wavePhase * 1.1) * 12}%`,
          opacity: 0.18, animation: 'none',
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-5">
        {/* Account Cards + category chips */}
        <AccountCards profile={profile} recentTransactions={recentTxns} />

        {/* Time Period Selector */}
        <div className="flex items-center gap-1.5 px-1">
          {TIME_PERIODS.map((period, i) => (
            <button
              key={period.label}
              onClick={() => setActivePeriod(i)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                activePeriod === i
                  ? 'bg-accent text-white shadow-lg shadow-accent/25'
                  : 'text-content-tertiary hover:text-content-secondary'
              }`}
              style={activePeriod === i ? { boxShadow: '0 0 20px rgba(212,160,204,0.25)' } : {}}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <SpendingSummary totalSpent={totalSpent} totalIncome={totalIncome} currency={profile.currency} />

        {/* Balance Chart */}
        <BalanceChart balanceHistory={balanceHistory} currency={profile.currency} />

        {/* Monthly Spending */}
        <AnimateIn animation="fade-up" delay={150}>
          <div className="warm-card shadow-[var(--card-shadow)] p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-content-primary">Monthly Spending</h3>
              {hoveredBar !== null && recentMonths[hoveredBar] && (
                <span className="text-sm font-semibold text-accent animate-fade-in">
                  {formatCurrency(recentMonths[hoveredBar].amount, profile.currency)}
                </span>
              )}
            </div>
            <div className="flex items-end gap-3 h-28 mt-3">
              {recentMonths.map((m, i) => {
                const heightPct = maxAmount > 0 ? (m.amount / maxAmount) * 100 : 0;
                const isLast = i === recentMonths.length - 1;
                const isHovered = hoveredBar === i;
                const monthNum = parseInt(m.label.slice(5), 10);
                const monthLabel = MONTH_NAMES[monthNum - 1] || m.label.slice(5);
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer"
                    onMouseEnter={() => setHoveredBar(i)} onMouseLeave={() => setHoveredBar(null)}>
                    <div className="relative w-full flex justify-center">
                      <div className="w-full max-w-[36px] rounded-xl transition-all duration-500" style={{
                        height: `${Math.max(heightPct, 5)}px`,
                        transitionDelay: `${i * 80}ms`,
                        transform: isHovered ? 'scaleY(1.05)' : 'scaleY(1)',
                        transformOrigin: 'bottom',
                        background: isLast || isHovered
                          ? 'linear-gradient(to top, #D4A0CC, #A78BFA)'
                          : 'rgba(212, 160, 204, 0.12)',
                        boxShadow: isLast || isHovered ? '0 0 16px rgba(212,160,204,0.25)' : 'none',
                      }} />
                    </div>
                    <span className={`text-xs font-medium transition-colors duration-200 ${
                      isLast || isHovered ? 'text-content-primary' : 'text-content-tertiary'
                    }`}>{monthLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </AnimateIn>

        {/* Category Breakdown */}
        <CategoryBreakdown categoryTotals={topCategories} currency={profile.currency} />

        {/* Recent Transactions */}
        <TransactionList transactions={recentTxns} currency={profile.currency} />

        {/* Bill Reminders */}
        <AnimateIn animation="fade-up" delay={250}>
          <div className="warm-card shadow-[var(--card-shadow)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-content-primary">Upcoming Bills</h3>
              <span className="text-xs text-accent font-medium">See All</span>
            </div>
            <div className="space-y-3.5">
              {[
                { name: 'Netflix', amount: 15.99, date: 'Apr 5',
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /><line x1="17" y1="17" x2="22" y2="17" /></svg> },
                { name: 'Spotify', amount: 9.99, date: 'Apr 8',
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg> },
                { name: 'Electric Bill', amount: 85.00, date: 'Apr 12',
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg> },
                { name: 'Rent', amount: 1200.00, date: 'Apr 1',
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
              ].map((bill, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center border border-[var(--border)] text-content-primary" style={{ background: 'var(--bg-tertiary)' }}>
                    {bill.svg}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-content-primary">{bill.name}</p>
                    <p className="text-xs text-content-tertiary">Due {bill.date}</p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--expense)]">-{formatCurrency(bill.amount, profile.currency)}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimateIn>

        {/* AI Insight */}
        <AnimateIn animation="fade-up" delay={280}>
          <div className="warm-card shadow-[var(--card-shadow)] p-5" style={{
            background: 'linear-gradient(135deg, rgba(212,160,204,0.08), rgba(167,139,250,0.06))',
          }}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                background: 'linear-gradient(135deg, rgba(212,160,204,0.15), rgba(167,139,250,0.1))',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4A0CC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                  <path d="M20.66 9A10 10 0 0 0 15 3.34" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-content-primary">AI Insight</p>
                <p className="text-xs text-content-secondary mt-1 leading-relaxed">
                  Your restaurant spending is up 23% this month. Try the &quot;Roast&quot; tab for a fun breakdown!
                </p>
              </div>
            </div>
          </div>
        </AnimateIn>
      </div>
    </div>
  );
}
