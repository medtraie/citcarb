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
    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '1.5rem 1.25rem', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', display: 'flex', gap: '0.5rem' }}>
        {onEdit && (
          <button 
            onClick={onEdit}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}
            title="Modifier ce baril"
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-cyan)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
        )}

        {onDelete && (
          <button 
            onClick={onDelete}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}
            title="Supprimer ce baril"
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        )}
      </div>
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {barrel.type === 'hydraulique' ? 'Hydraulique' : 'Huile Moteur'}
        </span>
        {isLow && (
          <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Alerte Stock</span>
        )}
      </div>

      <BarrelVisualization barrel={barrel} width={130} height={200} />

      <div style={{ textAlign: 'center', width: '100%' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
          {barrel.name}
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {barrel.currentVolume.toFixed(1)} / {barrel.capacity.toFixed(0)} L
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: 'auto' }}>
        <button 
          className="btn btn-secondary" 
          style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
          onClick={onConsume}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          Consommer
        </button>

        {canRefill && (
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', backgroundColor: 'var(--accent-green)', color: '#fff' }}
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
