'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleText from '@/components/ui/ParticleText';

interface LoginPageProps {
  onEnter: () => void;
}

export default function LoginPage({ onEnter }: LoginPageProps) {
  const [settled, setSettled] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 5000);
    return () => clearTimeout(t);
  }, []);

  const handleSettled = useCallback(() => setSettled(true), []);

  const handleGetStarted = () => {
    setIsExiting(true);
    setTimeout(() => onEnter(), 1200);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black -mt-[54px] pt-[54px]">
      {/* Layer 0: Ambient glow orbs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div
          className="absolute top-[20%] left-[10%] w-52 h-52 rounded-full blur-[100px]"
          style={{ background: 'rgba(212, 160, 204, 0.1)' }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[30%] right-[10%] w-44 h-44 rounded-full blur-[90px]"
          style={{ background: 'rgba(167, 139, 250, 0.08)' }}
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
      </div>

      {/* Layer 1: Particle text - full screen canvas */}
      <div className="absolute inset-0 z-10">
        <ParticleText
          lines={['Ready to', 'talk to your', 'finances?']}
          color="#D4A0CC"
          fontSize={52}
          lineHeight={1.25}
          vaporize={isExiting}
          onSettled={handleSettled}
        />
      </div>

      {/* Layer 2: Button + subtext overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center pb-14 pointer-events-none">
        <AnimatePresence>
          {settled && !isExiting && (
            <motion.div
              className="flex flex-col items-center pointer-events-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-[11px] text-white/20 text-center max-w-[250px] leading-relaxed mb-5">
                AI-powered insights into your spending, savings, and financial health
              </p>

              <button
                onClick={handleGetStarted}
                className="group relative px-20 py-6 rounded-full overflow-hidden active:scale-95 transition-transform"
              >
                <div className="absolute inset-0 rounded-full bg-[#D4A0CC]/25 backdrop-blur-xl border border-[#D4A0CC]/30" />
                <div className="absolute inset-0 rounded-full shadow-[inset_1px_1px_4px_rgba(212,160,204,0.25),inset_-1px_-1px_4px_rgba(0,0,0,0.2),0_0_30px_rgba(212,160,204,0.15)]" />
                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[#D4A0CC]/15" />
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4A0CC]/15 to-transparent -skew-x-12"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
                  />
                </div>
                <div className="absolute -inset-1 rounded-full bg-[#D4A0CC]/10 blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
                <span className="relative z-10 text-lg font-extrabold text-white group-hover:text-white transition-colors flex items-center gap-3">
                  Get Started
                  <motion.svg
                    width="20" height="20" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </motion.svg>
                </span>
              </button>

              <div className="flex gap-1.5 mt-6">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#D4A0CC]"
                    animate={{ opacity: [0.2, 0.6, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Layer 3: Exit fade */}
      <AnimatePresence>
        {isExiting && (
          <motion.div
            className="absolute inset-0 z-50 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
