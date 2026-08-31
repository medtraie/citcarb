import React, { useState, useRef } from 'react';
import logoImg from '../../assets/logo.png';

interface Interactive3DLogoProps {
  size?: number;
  className?: string;
  showGlow?: boolean;
}

export const Interactive3DLogo: React.FC<Interactive3DLogoProps> = ({
  size = 48,
  className = '',
  showGlow = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -22;
    const rotY = ((x - centerX) / centerX) * 22;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`interactive-3d-logo-wrapper ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        perspective: '800px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: isHovered
            ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.08, 1.08, 1.08)`
            : 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
          filter: showGlow
            ? isHovered
              ? 'drop-shadow(0 14px 22px rgba(16, 185, 129, 0.55)) drop-shadow(0 0 16px rgba(0, 210, 255, 0.4))'
              : 'drop-shadow(0 6px 12px rgba(16, 185, 129, 0.35))'
            : undefined,
        }}
      >
        {/* Main 3D Logo Image */}
        <img
          src={logoImg}
          alt="SFT FUEL 3D Logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            transform: 'translateZ(12px)',
          }}
        />

        {/* Dynamic Specular 3D Reflection Glare */}
        {isHovered && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: '50%',
              pointerEvents: 'none',
              background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.45) 0%, rgba(52, 211, 153, 0.2) 30%, transparent 65%)`,
              transform: 'translateZ(20px)',
              mixBlendMode: 'overlay',
            }}
          />
        )}
      </div>
    </div>
  );
};
