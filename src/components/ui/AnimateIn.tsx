'use client';

import { useRef, useEffect, useState, ReactNode } from 'react';

interface AnimateInProps {
  children: ReactNode;
  animation?: 'fade-up' | 'fade-in' | 'scale-in' | 'slide-left' | 'slide-right';
  delay?: number;
  className?: string;
  as?: 'div' | 'section';
}

export default function AnimateIn({
  children,
  animation = 'fade-up',
  delay = 0,
  className = '',
  as: Tag = 'div',
}: AnimateInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Find the nearest scrollable ancestor to use as root
    let scrollParent: Element | null = el.parentElement;
    while (scrollParent) {
      const style = getComputedStyle(scrollParent);
      if (style.overflow === 'auto' || style.overflow === 'scroll' ||
          style.overflowY === 'auto' || style.overflowY === 'scroll') {
        break;
      }
      scrollParent = scrollParent.parentElement;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        root: scrollParent || null,
        threshold: 0.05,
        rootMargin: '100px 0px 100px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`${isVisible ? `animate-${animation}` : 'opacity-0'} ${className}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      {children}
    </Tag>
  );
}
