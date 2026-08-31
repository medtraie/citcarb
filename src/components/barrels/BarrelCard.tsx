import React from 'react';
import { Barrel } from '../../types';
import { BarrelVisualization } from './BarrelVisualization';
import { useAuthStore } from '../../store/authStore';

interface BarrelCardProps {
  barrel: Barrel;
  onConsume: () => void;
  onRefill: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const BarrelCard: React.FC<BarrelCardProps> = ({ barrel, onConsume, onRefill, onEdit, onDelete }) => {
  const { user } = useAuthStore();

  if (!user) return null;

  const isLow = barrel.currentVolume <= barrel.alertThreshold;
  const canRefill = user.role === 'admin' || user.permissions.can_refill;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
      
      {/* Top Header Row (Organized header matching Citerne layout) */}
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        
        {/* Left: Type label + Alert badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {barrel.type === 'hydraulique' ? 'Hydraulique' : 'Huile Moteur'}
          </span>
          {isLow && (
            <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>
              Alerte Stock
            </span>
          )}
        </div>

        {/* Right: Clean Edit & Delete Action Buttons matching Citerne style */}
        {user.role === 'admin' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {onEdit && (
              <button 
                className="btn-icon"
                onClick={onEdit}
                title="Modifier ce baril"
                style={{
                  color: 'var(--accent-cyan)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            )}

            {onDelete && (
              <button 
                className="btn-icon"
                onClick={onDelete}
                title="Supprimer ce baril"
                style={{
                  color: 'var(--accent-red)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Visual Canvas */}
      <BarrelVisualization barrel={barrel} width={130} height={190} />

      {/* Title & Volume info */}
      <div style={{ textAlign: 'center', width: '100%' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.2rem', color: 'var(--text-primary)' }}>
          {barrel.name}
        </h3>
        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
          {barrel.currentVolume.toFixed(1)} / {barrel.capacity.toFixed(0)} L
        </p>
      </div>

      {/* Organized Bottom Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: 'auto' }}>
        <button 
          className="btn btn-secondary" 
          style={{ flex: 1, padding: '0.55rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontWeight: 600 }}
          onClick={onConsume}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          Consommer
        </button>

        {canRefill && (
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, padding: '0.55rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', backgroundColor: 'var(--accent-green)', color: '#ffffff', fontWeight: 700 }}
            onClick={onRefill}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            Remplir
          </button>
        )}
      </div>
    </div>
  );
};
