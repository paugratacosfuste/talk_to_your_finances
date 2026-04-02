'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/components/ui/ThemeProvider';
import IPhoneFrame from '@/components/ui/IPhoneFrame';
import TabNav, { type TabId } from '@/components/ui/TabNav';
import DashboardView from '@/components/Dashboard/DashboardView';
import ChatView from '@/components/Chat/ChatView';
import LoginPage from '@/components/Login/LoginPage';

/* ─── Placeholder views ─── */
function PlaceholderView({ title, svgIcon, description }: { title: string; svgIcon: React.ReactNode; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div className="w-20 h-20 rounded-3xl bg-accent-muted flex items-center justify-center mb-4 text-accent">
        {svgIcon}
      </div>
      <h2 className="text-lg font-bold text-content-primary mb-2">{title}</h2>
      <p className="text-xs text-content-secondary max-w-[240px] leading-relaxed">{description}</p>
      <div className="mt-5 px-4 py-2 rounded-full bg-accent-muted text-accent text-[11px] font-medium">
        Coming Soon
      </div>
    </div>
  );
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const { theme, toggle } = useTheme();

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'chat':
        return <ChatView />;
      case 'simulator':
        return (
          <PlaceholderView
            title="Future You Simulator"
            svgIcon={<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
            description="See how a potential purchase would affect your balance over time."
          />
        );
      case 'roast':
        return (
          <PlaceholderView
            title="Roast My Spending"
            svgIcon={<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c.5 3-1.5 5-3 7 1.5 0 3 .5 3 3 0-2.5 1.5-3 3-3-1.5-2-3.5-4-3-7z" /><path d="M8 22h8" /><path d="M12 17v5" /></svg>}
            description="Get a brutally honest (but funny) summary of your spending habits."
          />
        );
      case 'diary':
        return (
          <PlaceholderView
            title="Your Money's Diary"
            svgIcon={<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="13" y2="11" /></svg>}
            description="Your money tells its own story — a monthly narrative of where it went."
          />
        );
    }
  };

  const showHeader = activeTab !== 'chat';

  return (
    <IPhoneFrame>
      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          <motion.div
            key="login"
            className="h-full"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LoginPage onEnter={() => setIsLoggedIn(true)} />
          </motion.div>
        ) : (
          <motion.div
            key="app"
            className="flex flex-col h-full bg-surface-primary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {/* Minimal top bar - like screenshot */}
            {showHeader && (
              <header className="flex-shrink-0 z-40 px-5 py-2 flex items-center justify-between">
                <button className="w-8 h-8 flex items-center justify-center active:scale-95 transition-transform">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/60">
                    <line x1="3" y1="8" x2="16" y2="8" />
                    <line x1="3" y1="14" x2="12" y2="14" />
                  </svg>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggle}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 active:scale-95 transition-all"
                    aria-label="Toggle theme"
                  >
                    {theme === 'dark' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-white/50">
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-content-secondary">
                        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                      </svg>
                    )}
                  </button>
                  <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 active:scale-95 transition-all relative">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-white/50">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D4A0CC]" />
                  </button>
                </div>
              </header>
            )}

            {/* Scrollable tab content */}
            <main className="flex-1 overflow-y-auto no-scrollbar" key={activeTab}>
              <div className={`tab-content-enter ${activeTab !== 'chat' ? 'px-4 pt-2 pb-4' : 'h-full'}`}>
                {renderTab()}
              </div>
            </main>

            {/* Bottom navigation */}
            <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
          </motion.div>
        )}
      </AnimatePresence>
    </IPhoneFrame>
  );
}
