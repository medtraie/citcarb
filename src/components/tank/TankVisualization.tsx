import React, { useRef, useEffect } from 'react';

interface TankVisualizationProps {
  capacity: number;
  currentVolume: number;
  alertThreshold: number;
  width?: number;
  height?: number;
}

export const TankVisualization: React.FC<TankVisualizationProps> = ({
  capacity,
  currentVolume,
  alertThreshold,
  width = 200,
  height = 320,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fillRatioRef = useRef(0);
  const targetFillRatio = capacity > 0 ? currentVolume / capacity : 0;

  // Animate liquid level adjustment smoothly
  useEffect(() => {
    let animId: number;
    const animateLevel = () => {
      const diff = targetFillRatio - fillRatioRef.current;
      if (Math.abs(diff) > 0.002) {
        fillRatioRef.current += diff * 0.05;
        animId = requestAnimationFrame(animateLevel);
      } else {
        fillRatioRef.current = targetFillRatio;
      }
    };
    animateLevel();
    return () => cancelAnimationFrame(animId);
  }, [targetFillRatio]);

  // Wave phase animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set pixel ratio for crisp displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let wavePhase = 0;
    let animId: number;

    // Bubble state
    const bubbles = Array.from({ length: 8 }, (_, i) => ({
      x: 20 + Math.random() * (width - 40),
      yOffset: Math.random() * height,
      speed: 0.5 + Math.random() * 0.8,
      size: 1 + Math.random() * 2
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const fillRatio = fillRatioRef.current;
      const isLowStock = currentVolume <= alertThreshold;
      const percent = Math.round(fillRatio * 100);

      // --- 1. Outer steel/glass container background (Rich dark metallic background for 100% contrast in Light & Dark Mode) ---
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#151e31');
      bgGrad.addColorStop(0.5, '#1e293b');
      bgGrad.addColorStop(1, '#0b0f19');

      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 24);
      ctx.fill();

      // --- 2. Interior grid/measurement ticks ---
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'bold 9px "Outfit", sans-serif';

      for (let i = 1; i <= 4; i++) {
        const y = height * (1 - i * 0.2);
        
        // Tick lines
        ctx.beginPath();
        ctx.moveTo(12, y);
        ctx.lineTo(22, y);
        ctx.moveTo(width - 22, y);
        ctx.lineTo(width - 12, y);
        ctx.stroke();

        // Label percentages (20%, 40%, 60%, 80%)
        ctx.fillText(`${i * 20}%`, 26, y + 3);
      }

      // --- 3. Alert Threshold Line ---
      const alertY = height * (1 - alertThreshold / capacity);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(10, alertY);
      ctx.lineTo(width - 10, alertY);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      // --- 4. Liquid (Fuel) ---
      if (fillRatio > 0.01) {
        const liquidHeight = height * fillRatio;
        const baseHeight = height - liquidHeight;

        const startColor = isLowStock ? '#FF416C' : '#00B4DB';
        const endColor = isLowStock ? '#FF4B2B' : '#0083B0';

        ctx.save();
        // Clip to cylinder container
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, 24);
        ctx.clip();

        // A. Back Wave Path (higher frequency, phase shifted)
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, baseHeight);
        for (let x = 0; x <= width; x++) {
          const y = baseHeight - 5 * Math.sin((x * 0.035) + wavePhase + Math.PI);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();

        const backWaveGrad = ctx.createLinearGradient(0, baseHeight, 0, height);
        backWaveGrad.addColorStop(0, startColor + '40'); // 25% opacity
        backWaveGrad.addColorStop(1, endColor + '60');   // 37% opacity
        ctx.fillStyle = backWaveGrad;
        ctx.fill();

        // B. Front Wave Path
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, baseHeight);
        for (let x = 0; x <= width; x++) {
          const y = baseHeight - 6 * Math.sin((x * 0.025) - wavePhase);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();

        const frontWaveGrad = ctx.createLinearGradient(0, baseHeight, 0, height);
        frontWaveGrad.addColorStop(0, startColor);
        frontWaveGrad.addColorStop(1, endColor + 'cc'); // 80% opacity
        ctx.fillStyle = frontWaveGrad;
        ctx.fill();

        // C. Light reflection outline on liquid surface
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(0, baseHeight - 6 * Math.sin(-wavePhase));
        for (let x = 1; x <= width; x++) {
          const y = baseHeight - 6 * Math.sin((x * 0.025) - wavePhase);
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        // D. Floating bubbles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        bubbles.forEach(b => {
          b.yOffset = (b.yOffset - b.speed) % liquidHeight;
          if (b.yOffset < 0) b.yOffset = liquidHeight;
          const bubbleY = height - b.yOffset;
          if (bubbleY > baseHeight + 5) {
            ctx.beginPath();
            ctx.arc(b.x, bubbleY, b.size, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // E. Liquid gloss overlay
        const liquidGloss = ctx.createLinearGradient(0, baseHeight, 0, height);
        liquidGloss.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        liquidGloss.addColorStop(0.4, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = liquidGloss;
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, baseHeight);
        for (let x = 0; x <= width; x++) {
          const y = baseHeight - 6 * Math.sin((x * 0.025) - wavePhase);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      // --- 5. Metallic / Glass reflection highlight overlay ---
      const highlight = ctx.createLinearGradient(0, 0, width, 0);
      highlight.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
      highlight.addColorStop(0.15, 'rgba(255, 255, 255, 0.04)');
      highlight.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
      highlight.addColorStop(0.9, 'rgba(255, 255, 255, 0.10)');

      ctx.fillStyle = highlight;
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 24);
      ctx.fill();

      // --- 6. Metallic outer border ---
      const borderGrad = ctx.createLinearGradient(0, 0, width, height);
      borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      borderGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.1)');
      borderGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.4)');
      borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.25)');

      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 24);
      ctx.stroke();

      // --- 7. Digital Percentage Overlay in the center (High contrast bold text with drop shadow) ---
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 34px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${percent}%`, width / 2, height / 2);
      ctx.shadowBlur = 0; // Reset shadow for other drawings

      // Increment wave phase
      wavePhase += 0.035;

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [width, height, alertThreshold, capacity, currentVolume]);

  const isLowStock = currentVolume <= alertThreshold;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div 
        style={{
          position: 'relative',
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: '24px',
          boxShadow: isLowStock 
            ? '0 0 35px rgba(239, 68, 68, 0.3)' 
            : '0 12px 24px rgba(0, 0, 0, 0.25)',
          border: isLowStock ? '1px solid rgba(239, 68, 68, 0.5)' : 'none',
          transition: 'all 0.3s'
        }}
        className={isLowStock ? 'pulse-warn' : ''}
      >
        <canvas 
          ref={canvasRef} 
          style={{ 
            width: `${width}px`, 
            height: `${height}px`,
            display: 'block'
          }} 
        />
      </div>
      
      <div 
        style={{
          marginTop: '1.25rem',
          padding: '0.5rem 1.25rem',
          borderRadius: '12px',
          backgroundColor: isLowStock ? 'var(--accent-red-glow)' : 'var(--bg-input)',
          border: `1px solid ${isLowStock ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={isLowStock ? 'var(--accent-red)' : 'var(--accent-cyan)'} 
          strokeWidth="2.5"
        >
          {isLowStock ? (
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          ) : (
            <path d="M3 22v-4h18v4H3z M12 2v12 M7 8h10" />
          )}
        </svg>
        <span 
          style={{
            fontSize: '0.95rem',
            fontWeight: 800,
            color: isLowStock ? 'var(--accent-red)' : 'var(--text-primary)'
          }}
        >
          {Math.round(currentVolume).toLocaleString()} / {Math.round(capacity).toLocaleString()} L
        </span>
      </div>
    </div>
  );
};
