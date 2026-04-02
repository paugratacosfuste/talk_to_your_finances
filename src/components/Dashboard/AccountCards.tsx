'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimateIn from '@/components/ui/AnimateIn';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { formatCurrency } from '@/utils/dataUtils';
import type { UserProfile, Transaction } from '@/types';

interface AccountCardsProps {
  profile: UserProfile;
  recentTransactions?: Transaction[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Groceries: '#E8C0E0', Restaurants: '#D4A0CC', Transport: '#B090D0',
  Subscriptions: '#A078C0', Rent: '#C8A8D8', Entertainment: '#E0B0D0',
  Health: '#B8A0D8', Shopping: '#D4A0CC', Utilities: '#C0B0D8',
  Income: '#6BCB77', Transfer: '#B8A0D8', Other: '#A098B0',
};

export default function AccountCards({ profile, recentTransactions = [] }: AccountCardsProps) {
  const [showTransactions, setShowTransactions] = useState(false);

  return (
    <AnimateIn animation="fade-up" delay={80}>
      <div className="space-y-4">
        {/* Welcome */}
        <div className="px-1">
          <p className="text-2xl font-bold text-content-primary tracking-tight">
            {profile.name} Welcome Back!
          </p>
        </div>

        {/* Card area with dark backdrop */}
        <div
          className="relative rounded-3xl overflow-hidden cursor-pointer"
          onClick={() => setShowTransactions(!showTransactions)}
          style={{ background: 'linear-gradient(180deg, #1a1520 0%, #100D18 100%)' }}
        >
          {/* Radiating shadow lines behind card */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[280px] h-[280px] opacity-20" style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(180,140,200,0.15) 10%, transparent 20%, transparent 30%, rgba(180,140,200,0.1) 40%, transparent 50%, transparent 60%, rgba(180,140,200,0.15) 70%, transparent 80%, transparent 90%, rgba(180,140,200,0.1) 100%)',
            }} />
          </div>

          {/* Plus button */}
          <div className="absolute top-4 right-4 z-20">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
          </div>

          {/* The pink card - flat, centered */}
          <div className="relative z-10 flex justify-center py-6 px-8">
            <div className="w-[240px] rounded-2xl overflow-hidden shadow-2xl shadow-[#D4A0CC]/20" style={{ aspectRatio: '0.65' }}>
              {/* Card background - soft pink/lavender gradient */}
              <div className="relative w-full h-full" style={{
                background: 'linear-gradient(160deg, #F0D0F0 0%, #E0B0E0 30%, #D8A0D0 60%, #D090C8 100%)',
              }}>
                {/* Card holder - rotated text along left side */}
                <div className="absolute top-6 left-4">
                  <p className="text-[7px] text-purple-900/40 uppercase tracking-widest">Card Holder</p>
                  <p className="text-[9px] text-purple-900/70 font-semibold uppercase tracking-wider mt-0.5">{profile.name}</p>
                </div>

                {/* Card number - large, rotated */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap">
                  <p className="text-purple-900/50 text-sm font-mono tracking-[0.15em]">
                    4562 1122 4595 7852
                  </p>
                </div>

                {/* Mastercard text */}
                <div className="absolute bottom-16 right-4">
                  <p className="text-purple-900/60 text-[9px] font-semibold tracking-wider">Mastercard</p>
                </div>

                {/* Mastercard logo */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <svg width="44" height="28" viewBox="0 0 44 28">
                    <circle cx="16" cy="14" r="12" fill="#EB001B" fillOpacity="0.85" />
                    <circle cx="28" cy="14" r="12" fill="#F79E1B" fillOpacity="0.85" />
                    <path d="M22 4.8a12 12 0 0 1 0 18.4 12 12 0 0 1 0-18.4z" fill="#FF5F00" fillOpacity="0.7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Total Spent + dots */}
          <div className="relative z-10 flex items-center justify-between px-5 pb-5">
            <div>
              <p className="text-sm text-content-tertiary">Total Spent</p>
              <p className="text-2xl font-bold text-content-primary tracking-tight">
                {formatCurrency(profile.currentBalance, profile.currency)}
              </p>
            </div>
            <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4">
                <circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /><circle cx="5" cy="12" r="1.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Category quick chips - like Shopping $300 in screenshot */}
        <AnimateIn animation="fade-up" delay={160}>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4">
            {recentTransactions.length > 0 && (() => {
              const categoryTotals: Record<string, number> = {};
              recentTransactions.forEach((t) => {
                if (t.type === 'debit') {
                  categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
                }
              });
              const topCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);
              return topCats.map(([cat, amount]) => {
                const color = CATEGORY_COLORS[cat] || '#A098B0';
                return (
                  <div
                    key={cat}
                    className="flex-shrink-0 flex items-center gap-3 rounded-2xl px-4 py-3 min-w-[150px]"
                    style={{ background: 'var(--card-gradient)', border: '1px solid var(--border)' }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                      <CategoryIcon category={cat} size={18} color={color} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-content-primary">{cat}</p>
                      <p className="text-sm font-semibold" style={{ color }}>{formatCurrency(amount, profile.currency)}</p>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </AnimateIn>

        {/* Expandable transactions */}
        <AnimatePresence>
          {showTransactions && recentTransactions.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="warm-card shadow-[var(--card-shadow)] p-4">
                <p className="text-xs font-semibold text-content-tertiary uppercase tracking-wider mb-3">Recent Activity</p>
                {recentTransactions.slice(0, 5).map((txn) => {
                  const color = CATEGORY_COLORS[txn.category] || '#A098B0';
                  return (
                    <div key={txn.id} className="flex items-center gap-3 py-2.5 rounded-xl px-2 hover:bg-surface-tertiary/30 transition-colors">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
                        <CategoryIcon category={txn.category} size={16} color={color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-content-primary truncate">{txn.merchant || txn.description}</p>
                        <p className="text-[10px] text-content-tertiary">{txn.date}</p>
                      </div>
                      <p className={`text-sm font-bold ${txn.type === 'credit' ? 'text-[var(--income)]' : 'text-content-primary'}`}>
                        {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount, profile.currency)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimateIn>
  );
}
