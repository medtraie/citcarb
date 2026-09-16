import React from 'react';

interface PageLoaderProps {
  text?: string;
  subtext?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  text = 'Chargement...',
  subtext = 'RÉCUPÉRATION DES DONNÉES...'
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(11, 15, 25, 0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.75rem',
        animation: 'loaderFadeIn 0.2s ease-out forwards',
        pointerEvents: 'all',
        userSelect: 'none',
      }}
    >
      {/* Outer ambient glow & Spinner */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '90px',
          height: '90px',
        }}
      >
        {/* Subtle background neon glow */}
        <div
          style={{
            position: 'absolute',
            width: '130px',
            height: '130px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.28) 0%, rgba(0, 210, 255, 0.18) 50%, transparent 70%)',
            filter: 'blur(14px)',
          }}
        />

        {/* Circular Spinner in Logo colors (Emerald Green + Cyan) */}
        <div
          style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            border: '3.5px solid rgba(255, 255, 255, 0.08)',
            borderTop: '3.5px solid #10b981',
            borderRight: '3.5px solid #00d2ff',
            boxShadow: '0 0 22px rgba(16, 185, 129, 0.5), 0 0 12px rgba(0, 210, 255, 0.4)',
            animation: 'loaderSpin 0.85s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          }}
        />

        {/* Center glowing dot */}
        <div
          style={{
            position: 'absolute',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#00d2ff',
            boxShadow: '0 0 14px #00d2ff, 0 0 22px #10b981',
            animation: 'loaderPulse 1.4s ease-in-out infinite',
          }}
        />
      </div>

      {/* Texts in French matching screenshot */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.6rem',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            letterSpacing: '0.18em',
            color: '#ffffff',
            margin: 0,
            textShadow: '0 2px 14px rgba(0, 0, 0, 0.6), 0 0 20px rgba(16, 185, 129, 0.25)',
          }}
        >
          {text}
        </h2>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.28em',
            color: '#94a3b8',
            textTransform: 'uppercase',
          }}
        >
          {subtext}
        </span>
      </div>
    </div>
  );
};
