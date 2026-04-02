'use client';

import { useEffect, useRef } from 'react';

interface ParticleData {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxSpeed: number;
  maxForce: number;
  settled: boolean;
  killed: boolean;
}

interface ParticleTextProps {
  lines: string[];
  color?: string;
  fontSize?: number;
  lineHeight?: number;
  className?: string;
  vaporize?: boolean;
  onSettled?: () => void;
}

export default function ParticleText({
  lines,
  color = '#D4A0CC',
  fontSize = 48,
  lineHeight = 1.3,
  className = '',
  vaporize = false,
  onSettled,
}: ParticleTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    particles: [] as ParticleData[],
    settled: false,
    callbackFired: false,
    solidFade: 0,
    startTime: 0,
    animFrame: 0,
  });
  const propsRef = useRef({ lines, color, fontSize, lineHeight, vaporize, onSettled });
  propsRef.current = { lines, color, fontSize, lineHeight, vaporize, onSettled };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d')!;

    // Parse color
    const tmpC = document.createElement('canvas');
    const tmpX = tmpC.getContext('2d')!;
    tmpX.fillStyle = color;
    tmpX.fillRect(0, 0, 1, 1);
    const cd = tmpX.getImageData(0, 0, 1, 1).data;
    const rgb = { r: cd[0], g: cd[1], b: cd[2] };

    // Build particles from text
    const font = `800 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
    const totalH = lines.length * fontSize * lineHeight;
    const textStartY = (canvas.height - totalH) / 2 + fontSize * lineHeight * 0.5;

    const off = document.createElement('canvas');
    off.width = canvas.width;
    off.height = canvas.height;
    const oCtx = off.getContext('2d')!;
    oCtx.fillStyle = 'white';
    oCtx.font = font;
    oCtx.textAlign = 'center';
    oCtx.textBaseline = 'middle';
    lines.forEach((line, i) => {
      oCtx.fillText(line, canvas.width / 2, textStartY + i * fontSize * lineHeight);
    });

    const imageData = oCtx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const particles: ParticleData[] = [];
    const step = 2;

    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const idx = (y * canvas.width + x) * 4;
        if (pixels[idx + 3] > 50) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 300 + Math.random() * 400;
          particles.push({
            x: canvas.width / 2 + Math.cos(angle) * dist,
            y: canvas.height / 2 + Math.sin(angle) * dist,
            targetX: x,
            targetY: y,
            vx: 0, vy: 0,
            size: Math.random() * 1.4 + 0.8,
            alpha: 0.7,
            maxSpeed: Math.random() * 6 + 6,
            maxForce: Math.random() * 0.2 + 0.1,
            settled: false,
            killed: false,
          });
        }
      }
    }

    const s = stateRef.current;
    s.particles = particles;
    s.settled = false;
    s.callbackFired = false;
    s.solidFade = 0;
    s.startTime = performance.now();

    const drawSolid = (alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = propsRef.current.color;
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      lines.forEach((line, i) => {
        ctx.fillText(line, canvas.width / 2, textStartY + i * fontSize * lineHeight);
      });
      ctx.restore();
    };

    const fireSettled = () => {
      if (!s.callbackFired) {
        s.settled = true;
        s.callbackFired = true;
        for (const p of s.particles) {
          if (!p.settled && !p.killed) {
            p.x = p.targetX;
            p.y = p.targetY;
            p.vx = 0;
            p.vy = 0;
            p.settled = true;
          }
        }
        propsRef.current.onSettled?.();
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isVaporizing = propsRef.current.vaporize;
      const elapsed = performance.now() - s.startTime;

      // Smooth crossfade to solid ~1s
      if (s.settled && !isVaporizing) {
        s.solidFade = Math.min(1, s.solidFade + 0.015);
      }
      if (isVaporizing) {
        s.solidFade = Math.max(0, s.solidFade - 0.06);
      }

      const particleFade = 1 - s.solidFade;

      // Motion blur while assembling
      if (!s.settled || isVaporizing) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      let unsettledCount = 0;

      for (const p of s.particles) {
        if (isVaporizing && !p.killed) {
          p.killed = true;
          p.settled = false;
          const a = Math.random() * Math.PI * 2;
          p.vx = Math.cos(a) * (Math.random() * 6 + 2);
          p.vy = Math.sin(a) * (Math.random() * 6 + 2);
        }

        if (p.killed) {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha *= 0.96;
          if (p.alpha < 0.01) continue;
        } else if (!p.settled) {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 1.5) {
            // Slow down as we approach — wide zone so we brake early
            const pm = dist < 80 ? dist / 80 : 1;
            const dvx = (dx / dist) * p.maxSpeed * pm;
            const dvy = (dy / dist) * p.maxSpeed * pm;
            let sx = dvx - p.vx;
            let sy = dvy - p.vy;
            const sm = Math.sqrt(sx * sx + sy * sy);
            if (sm > 0) { sx = (sx / sm) * p.maxForce; sy = (sy / sm) * p.maxForce; }
            p.vx += sx;
            p.vy += sy;
            // Heavy braking near target — no overshoot
            if (dist < 40) {
              const brake = dist < 10 ? 0.6 : 0.8;
              p.vx *= brake;
              p.vy *= brake;
            }
            p.x += p.vx;
            p.y += p.vy;
            unsettledCount++;
          } else {
            p.x = p.targetX;
            p.y = p.targetY;
            p.vx = 0;
            p.vy = 0;
            p.settled = true;
          }
          if (p.alpha < 1) p.alpha = Math.min(1, p.alpha + 0.05);
        }

        const drawAlpha = p.killed ? p.alpha : (p.settled ? particleFade : p.alpha * particleFade);
        if (drawAlpha > 0.005) {
          ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${drawAlpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Settle when 95%+ arrived or 4.5s elapsed
      if (!s.settled && s.particles.length > 0) {
        const pct = 1 - (unsettledCount / s.particles.length);
        if (unsettledCount === 0 || pct > 0.95 || elapsed > 4500) {
          fireSettled();
        }
      }

      if (s.solidFade > 0) {
        drawSolid(s.solidFade);
      }

      s.animFrame = requestAnimationFrame(animate);
    };

    s.animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(s.animFrame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    />
  );
}
