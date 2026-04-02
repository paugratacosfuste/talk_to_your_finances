'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import AnimateIn from '@/components/ui/AnimateIn';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { formatCurrency } from '@/utils/dataUtils';
import type { Transaction } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  Groceries: '#E0C0E8',
  Restaurants: '#D4A0CC',
  Transport: '#B898D8',
  Subscriptions: '#B080C8',
  Rent: '#C8B0D8',
  Entertainment: '#C8A0D0',
  Health: '#A890D0',
  Shopping: '#D4A0CC',
  Utilities: '#D0B8E0',
  Income: '#C0D0E8',
  Transfer: '#B8A0C8',
  Other: '#A8A0B8',
};

interface TransactionListProps {
  transactions: Transaction[];
  currency: string;
  title?: string;
}

export default function TransactionList({ transactions, currency, title = 'Recent Transactions' }: TransactionListProps) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? transactions : transactions.slice(0, 8);

  return (
    <AnimateIn animation="fade-up" delay={300}>
      <Card noPadding>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-semibold text-content-primary">{title}</h3>
          <span className="text-xs text-content-tertiary">{transactions.length} total</span>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {displayed.map((txn, idx) => (
            <div
              key={txn.id}
              className="transaction-row flex items-center gap-3 px-5 py-3.5 hover:bg-surface-tertiary/50"
              style={{
                opacity: 0,
                animation: `fadeUp 0.35s ease-out ${idx * 40}ms forwards`,
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${CATEGORY_COLORS[txn.category] || '#576574'}15` }}
              >
                <CategoryIcon
                  category={txn.category}
                  size={18}
                  color={CATEGORY_COLORS[txn.category] || '#576574'}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-content-primary truncate">
                  {txn.merchant || txn.description}
                </p>
                <p className="text-xs text-content-tertiary mt-0.5">{txn.date} &middot; {txn.category}</p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-semibold ${txn.type === 'credit' ? 'text-[var(--income)]' : 'text-content-primary'}`}>
                  {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount, currency)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {transactions.length > 8 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-3.5 text-sm font-medium text-accent hover:bg-surface-tertiary/50 transition-colors border-t border-[var(--border)]"
          >
            {showAll ? 'Show Less' : `View All ${transactions.length} Transactions`}
          </button>
        )}
      </Card>
    </AnimateIn>
  );
}
