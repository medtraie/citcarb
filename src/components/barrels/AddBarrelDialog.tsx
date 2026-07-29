import React, { useState } from 'react';
import { Barrel, BarrelType } from '../../types';

interface AddBarrelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (barrel: Omit<Barrel, 'id'>) => Promise<void>;
  ownerId: string;
}

export const AddBarrelDialog: React.FC<AddBarrelDialogProps> = ({ isOpen, onClose, onAdd, ownerId }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<BarrelType>('hydraulique');
  const [capacity, setCapacity] = useState<number>(200);
  const [currentVolume, setCurrentVolume] = useState<number>(150);
  const [alertThreshold, setAlertThreshold] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (capacity <= 0) return;
    
    setIsSubmitting(true);
    try {
      await onAdd({
        name: name.trim(),
        type,
        capacity,
        currentVolume,
        alertThreshold,
        unit: 'L',
        ownerId,
      });
      onClose();
      // Reset form
      setName('');
      setCapacity(200);
      setCurrentVolume(150);
      setAlertThreshold(30);
    } catch (error) {
      console.error(error);
      alert('Erreur lors de l\'ajout du baril.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} disabled={isSubmitting}>&times;</button>

        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Ajouter un nouveau baril
        </h2>

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
              placeholder="Ex: Huile Hydraulique N°3"
              required 
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label">CapacitéTotale (L)</label>
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
            <label className="form-label">Volume Actuel (L)</label>
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
          </div>

          <div className="form-group">
            <label className="form-label">Seuil d'alerte (L)</label>
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
              style={{ flex: 1, display: 'flex', justifyContent: 'center' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
