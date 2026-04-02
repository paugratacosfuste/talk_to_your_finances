'use client';

import AnimateIn from '@/components/ui/AnimateIn';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  color: string;
  glowColor: string;
}

const actions: QuickAction[] = [
  {
    label: 'Send',
    color: '#D4A0CC',
    glowColor: 'rgba(212, 160, 204, 0.15)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
  },
  {
    label: 'Request',
    color: '#6BCB77',
    glowColor: 'rgba(107, 203, 119, 0.15)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M17 7l-5-5-5 5" />
      </svg>
    ),
  },
  {
    label: 'Deposit',
    color: '#A78BFA',
    glowColor: 'rgba(167, 139, 250, 0.15)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    label: 'Pay',
    color: '#F0A0C0',
    glowColor: 'rgba(240, 160, 192, 0.15)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
];

export default function QuickActions() {
  return (
    <AnimateIn animation="fade-up" delay={60}>
      <div className="flex items-center justify-between px-2">
        {actions.map((action, i) => (
          <button
            key={action.label}
            className="quick-action-btn flex flex-col items-center gap-1.5"
            style={{ opacity: 0, animation: `fadeUp 0.4s ease-out ${i * 70 + 100}ms forwards` }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center border border-[var(--border)]"
              style={{
                background: `linear-gradient(135deg, ${action.glowColor}, transparent)`,
                color: action.color,
              }}
            >
              {action.icon}
            </div>
            <span className="text-[10px] font-medium text-content-secondary">{action.label}</span>
          </button>
        ))}
      </div>
    </AnimateIn>
  );
}
