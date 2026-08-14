import React, { useRef, useEffect } from 'react';
import { Barrel } from '../../types';

interface BarrelVisualizationProps {
  barrel: Barrel;
  width?: number;
  height?: number;
}

export const BarrelVisualization: React.FC<BarrelVisualizationProps> = ({
  barrel,
  width = 150,
  height = 230,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fillRatioRef = useRef(0);
  const targetFillRatio = barrel.capacity > 0 ? barrel.currentVolume / barrel.capacity : 0;

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let wavePhase = 0;
    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const fillRatio = fillRatioRef.current;
      const isLow = barrel.currentVolume <= barrel.alertThreshold;
      const isHydro = barrel.type === 'hydraulique';
      const percent = Math.round(fillRatio * 100);

      // Liquid colors
      const liquidTop = isLow
        ? '#FF416C'
        : (isHydro ? '#00C6FF' : '#f7971e');
      const liquidBot = isLow
        ? '#FF4B2B'
        : (isHydro ? '#0072FF' : '#ffd200');

      // --- 1. Background body ---
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#151e31');
      bgGrad.addColorStop(0.5, '#1e293b');
      bgGrad.addColorStop(1, '#0b0f19');

      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 18);
      ctx.fill();

      // --- 2. Alert threshold line ---
      if (barrel.capacity > 0) {
        const alertY = height * (1 - barrel.alertThreshold / barrel.capacity);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(6, alertY);
        ctx.lineTo(width - 6, alertY);
        ctx.stroke();
        ctx.setLineDash([]); // Reset
      }

      // --- 3. Liquid fill ---
      if (fillRatio > 0.01) {
        const liquidH = height * fillRatio;
        const baseH = height - liquidH;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, 18);
        ctx.clip();

        // Back wave
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, baseH);
        for (let x = 0; x <= width; x++) {
          const y = baseH - 4.0 * Math.sin((x * 0.04) + wavePhase + Math.PI);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();

        const backWaveGrad = ctx.createLinearGradient(0, baseH, 0, height);
        backWaveGrad.addColorStop(0, liquidTop + '40');
        backWaveGrad.addColorStop(1, liquidBot + '50');
        ctx.fillStyle = backWaveGrad;
        ctx.fill();

        // Front wave
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, baseH);
        for (let x = 0; x <= width; x++) {
          const y = baseH - 5.5 * Math.sin((x * 0.028) - wavePhase);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();

        const frontWaveGrad = ctx.createLinearGradient(0, baseH, 0, height);
        frontWaveGrad.addColorStop(0, liquidTop);
        frontWaveGrad.addColorStop(1, liquidBot + 'e0');
        ctx.fillStyle = frontWaveGrad;
        ctx.fill();

        // Wave top gloss
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, baseH - 5.5 * Math.sin(-wavePhase));
        for (let x = 1; x <= width; x++) {
          const y = baseH - 5.5 * Math.sin((x * 0.028) - wavePhase);
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.restore();
      }

      // --- 4. Barrel hoops ---
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
      ctx.lineWidth = 6;
      for (const yFrac of [0.20, 0.48, 0.76]) {
        const y = height * yFrac;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // --- 5. Glass highlight ---
      const highlight = ctx.createLinearGradient(0, 0, width, 0);
      highlight.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
      highlight.addColorStop(0.15, 'rgba(255, 255, 255, 0.04)');
      highlight.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
      highlight.addColorStop(1, 'rgba(255, 255, 255, 0.10)');

      ctx.fillStyle = highlight;
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 18);
      ctx.fill();

      // --- 6. Metallic border ---
      const border = ctx.createLinearGradient(0, 0, width, height);
      border.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      border.addColorStop(0.3, 'rgba(255, 255, 255, 0.08)');
      border.addColorStop(0.7, 'rgba(0, 0, 0, 0.45)');
      border.addColorStop(1, 'rgba(255, 255, 255, 0.22)');

      ctx.strokeStyle = border;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 18);
      ctx.stroke();

      // --- 7. Percentage text ---
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 26px "Outfit", sans-serif';
      ctx.fillText(`${percent}%`, width / 2, height / 2 - 6);

      // --- 8. Subtitle ---
      ctx.fillStyle = isLow ? '#FF416C' : liquidTop;
      ctx.font = '800 7.5px "Outfit", sans-serif';
      const labelText = isLow ? 'NIVEAU BAS' : (isHydro ? 'HYDRAULIQUE' : 'HUILE MOTEUR');
      ctx.fillText(labelText, width / 2, height / 2 + 18);

      wavePhase += 0.030;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [barrel, width, height]);

  const isLow = barrel.currentVolume <= barrel.alertThreshold;

  return (
    <div 
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '18px',
        boxShadow: isLow 
          ? '0 0 28px rgba(239, 68, 68, 0.25)' 
          : '0 10px 20px rgba(0, 0, 0, 0.3)',
        border: isLow ? '1px solid rgba(239, 68, 68, 0.4)' : 'none',
        transition: 'all 0.3s'
      }}
      className={isLow ? 'pulse-warn' : ''}
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
  );
};
