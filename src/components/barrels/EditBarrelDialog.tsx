import React, { useState, useEffect } from 'react';
import { Barrel, BarrelType } from '../../types';

interface EditBarrelDialogProps {
  barrel: Barrel | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (barrel: Barrel) => Promise<void>;
}

export const EditBarrelDialog: React.FC<EditBarrelDialogProps> = ({
  barrel,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<BarrelType>('hydraulique');
  const [capacity, setCapacity] = useState<number>(200);
  const [currentVolume, setCurrentVolume] = useState<number>(0);
  const [alertThreshold, setAlertThreshold] = useState<number>(30);
  const [unit, setUnit] = useState('L');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (barrel) {
      setName(barrel.name);
      setType(barrel.type);
      setCapacity(barrel.capacity);
      setCurrentVolume(barrel.currentVolume);
      setAlertThreshold(barrel.alertThreshold);
      setUnit(barrel.unit || 'L');
      setError(null);
    }
  }, [barrel]);

  if (!isOpen || !barrel) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Veuillez entrer un nom pour le baril.');
      return;
    }

    if (capacity <= 0) {
      setError('La capacité doit être supérieure à 0.');
      return;
    }

    if (currentVolume < 0 || currentVolume > capacity) {
      setError(`Le volume actuel doit être compris entre 0 et ${capacity} L.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate({
        ...barrel,
        name: name.trim(),
        type,
        capacity,
        currentVolume,
        alertThreshold,
        unit,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erreur lors de la modification du baril.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} disabled={isSubmitting}>&times;</button>
        
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          Modifier le Baril
        </h2>

        {error && (
          <div style={{
            backgroundColor: 'var(--accent-red-glow)',
            color: 'var(--accent-red)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontWeight: 500,
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="form-group">
            <label className="form-label">Type de Baril</label>
            <select 
              className="form-control" 
              value={type} 
              onChange={e => setType(e.target.value as BarrelType)}
              disabled={isSubmitting}
            >
              <option value="hydraulique">Huile Hydraulique</option>
              <option value="motor_oil">Huile Moteur</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Nom du Baril</label>
            <input 
              type="text" 
              className="form-control" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Ex: Huile Hydraulique N°1"
              required 
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Capacité Totale (L)</label>
            <input 
              type="number" 
              className="form-control" 
              value={capacity} 
              onChange={e => setCapacity(Number(e.target.value))} 
              min="1" 
              required 
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Volume Actuel en Stock (L)</label>
            <input 
              type="number" 
              className="form-control" 
              value={currentVolume} 
              onChange={e => setCurrentVolume(Number(e.target.value))} 
              min="0"
              max={capacity}
              required 
              disabled={isSubmitting}
            />
            {/* Quick volume percentage presets */}
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setCurrentVolume(capacity)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: currentVolume === capacity ? 'var(--accent-cyan)' : 'var(--bg-input)',
                  color: currentVolume === capacity ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                100% ({capacity}L)
              </button>
              <button
                type="button"
                onClick={() => setCurrentVolume(Math.round(capacity * 0.75))}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: currentVolume === Math.round(capacity * 0.75) ? 'var(--accent-cyan)' : 'var(--bg-input)',
                  color: currentVolume === Math.round(capacity * 0.75) ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                75% ({Math.round(capacity * 0.75)}L)
              </button>
              <button
                type="button"
                onClick={() => setCurrentVolume(Math.round(capacity * 0.5))}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: currentVolume === Math.round(capacity * 0.5) ? 'var(--accent-cyan)' : 'var(--bg-input)',
                  color: currentVolume === Math.round(capacity * 0.5) ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                50% ({Math.round(capacity * 0.5)}L)
              </button>
              <button
                type="button"
                onClick={() => setCurrentVolume(Math.round(capacity * 0.25))}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: currentVolume === Math.round(capacity * 0.25) ? 'var(--accent-cyan)' : 'var(--bg-input)',
                  color: currentVolume === Math.round(capacity * 0.25) ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                25% ({Math.round(capacity * 0.25)}L)
              </button>
              <button
                type="button"
                onClick={() => setCurrentVolume(0)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: currentVolume === 0 ? 'var(--accent-red)' : 'var(--bg-input)',
                  color: currentVolume === 0 ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                0L (Vide)
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Seuil d'alerte Stock Bas (L)</label>
            <input 
              type="number" 
              className="form-control" 
              value={alertThreshold} 
              onChange={e => setAlertThreshold(Number(e.target.value))} 
              min="0"
              max={capacity}
              required 
              disabled={isSubmitting}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ flex: 1 }} 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1, backgroundColor: 'var(--accent-cyan)', color: '#fff', display: 'flex', justifyContent: 'center' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
