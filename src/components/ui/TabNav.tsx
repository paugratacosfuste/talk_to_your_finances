'use client';

export type TabId = 'dashboard' | 'chat' | 'simulator' | 'roast' | 'diary';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const icons = {
  dashboard: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
    </svg>
  ),
  chat: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  ),
  simulator: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  roast: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c.5 3-1.5 5-3 7 1.5 0 3 .5 3 3 0-2.5 1.5-3 3-3-1.5-2-3.5-4-3-7z" />
      <path d="M8 22h8" />
      <path d="M12 17v5" />
      <path d="M7 13c-1.5-1-2.5-3-2-6" />
      <path d="M17 13c1.5-1 2.5-3 2-6" />
    </svg>
  ),
  diary: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="13" y2="11" />
    </svg>
  ),
};

const tabs: Tab[] = [
  { id: 'dashboard', label: 'Home', icon: icons.dashboard },
  { id: 'chat', label: 'Chat', icon: icons.chat },
  { id: 'simulator', label: 'Future', icon: icons.simulator },
  { id: 'roast', label: 'Roast', icon: icons.roast },
  { id: 'diary', label: 'Diary', icon: icons.diary },
];

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="flex-shrink-0 z-50 glass bg-[var(--bg-secondary-solid)]/80 border-t border-[var(--border)]">
      <div className="flex items-center justify-around px-2 pb-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl
                transition-all duration-200 relative min-w-[56px]
                ${isActive ? 'text-accent' : 'text-content-tertiary'}
              `}
            >
              {isActive && (
                <span className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-accent animate-scale-in" />
              )}
              <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                {tab.icon}
              </span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
