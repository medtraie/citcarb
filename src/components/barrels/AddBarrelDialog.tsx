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
  const [currentVolume, setCurrentVolume] = useState<number>(0);
  const [alertThreshold, setAlertThreshold] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (capacity <= 0) return;
    
    setIsSubmitting(true);
    try {
      await onAdd({
        name,
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
      setCurrentVolume(0);
      setAlertThreshold(30);
    } catch (error) {
      console.error(error);
      alert('Erreur lors de l\'ajout du baril.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2 className="dialog-title">Ajouter un nouveau baril</h2>
          <button className="dialog-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          
          <div className="form-group">
            <label className="form-label">Type de Baril</label>
            <select 
              className="form-input" 
              value={type} 
              onChange={e => setType(e.target.value as BarrelType)}
            >
              <option value="hydraulique">Huile Hydraulique</option>
              <option value="motor_oil">Huile Moteur</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Nom du Baril</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Ex: Huile Hydraulique N°3"
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Capacité (L)</label>
            <input 
              type="number" 
              className="form-input" 
              value={capacity} 
              onChange={e => setCapacity(Number(e.target.value))} 
              min="1" 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Volume Actuel (L)</label>
            <input 
              type="number" 
              className="form-input" 
              value={currentVolume} 
              onChange={e => setCurrentVolume(Number(e.target.value))} 
              min="0"
              max={capacity}
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Seuil d'alerte (L)</label>
            <input 
              type="number" 
              className="form-input" 
              value={alertThreshold} 
              onChange={e => setAlertThreshold(Number(e.target.value))} 
              min="0"
              max={capacity}
              required 
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
