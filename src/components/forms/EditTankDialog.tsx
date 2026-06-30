import React, { useState, useEffect } from 'react';
import { Tank } from '../../types';

interface EditTankDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tank: Tank;
  onSave: (updatedTank: Tank) => Promise<void>;
}

export const EditTankDialog: React.FC<EditTankDialogProps> = ({ isOpen, onClose, tank, onSave }) => {
  const [capacity, setCapacity] = useState('');
  const [currentVolume, setCurrentVolume] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && tank) {
      setCapacity(tank.capacity.toString());
      setCurrentVolume(tank.currentVolume.toString());
      setAlertThreshold(tank.alertThreshold.toString());
      setError(null);
    }
  }, [isOpen, tank]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const capNum = parseFloat(capacity);
    const volNum = parseFloat(currentVolume);
    const alertNum = parseFloat(alertThreshold);

    if (isNaN(capNum) || capNum <= 0) {
      setError('Veuillez entrer une capacité valide.');
      return;
    }
    if (isNaN(volNum) || volNum < 0 || volNum > capNum) {
      setError('Le volume actuel doit être entre 0 et la capacité totale.');
      return;
    }
    if (isNaN(alertNum) || alertNum < 0 || alertNum > capNum) {
      setError("Le seuil d'alerte doit être entre 0 et la capacité totale.");
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        ...tank,
        capacity: capNum,
        currentVolume: volNum,
        alertThreshold: alertNum,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <button className="modal-close" onClick={onClose} disabled={submitting}>&times;</button>
        
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          Modifier la Citerne
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {error && (
            <div style={{
              backgroundColor: 'var(--accent-red-glow)',
              color: 'var(--accent-red)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Capacité Totale (L)</label>
            <input 
              type="number" 
              className="form-control"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              min="0"
              step="1"
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Volume Actuel (L)</label>
            <input 
              type="number" 
              className="form-control"
              value={currentVolume}
              onChange={(e) => setCurrentVolume(e.target.value)}
              min="0"
              step="1"
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Seuil d'alerte (L)</label>
            <input 
              type="number" 
              className="form-control"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
              min="0"
              step="1"
              required
              disabled={submitting}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ flex: 1 }}
              onClick={onClose}
              disabled={submitting}
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1 }}
              disabled={submitting}
            >
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
