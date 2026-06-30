import React, { useState } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { Barrel } from '../../types';

interface RefillDialogProps {
  barrel: Barrel;
  isOpen: boolean;
  onClose: () => void;
}

export const RefillDialog: React.FC<RefillDialogProps> = ({
  barrel,
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const { refillBarrel } = useDataStore();

  const [quantity, setQuantity] = useState('');
  const [supplier, setSupplier] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    const qtyNum = parseFloat(quantity);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Veuillez entrer une quantité valide.');
      return;
    }

    const priceNum = price ? parseFloat(price) : undefined;

    setSubmitting(true);
    try {
      await refillBarrel({
        barrelId: barrel.id,
        quantity: qtyNum,
        supplier: supplier.trim() || undefined,
        price: priceNum,
        performedBy: user.id,
        ownerId: user.ownerId,
        notes: notes.trim() || undefined,
      });
      onClose();
      // Reset form
      setQuantity('');
      setSupplier('');
      setPrice('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          Remplir le baril
        </h2>
        
        <div style={{
          backgroundColor: 'var(--bg-input)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          borderLeft: '4px solid var(--accent-green)'
        }}>
          <strong>Baril:</strong> {barrel.name} <br/>
          <strong>Quantité actuelle:</strong> {barrel.currentVolume} / {barrel.capacity} L
        </div>

        {error && (
          <div style={{
            backgroundColor: 'var(--accent-red-glow)',
            color: 'var(--accent-red)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Quantité à ajouter (Litres)</label>
            <input 
              type="number" 
              className="form-control"
              placeholder="Ex: 50"
              step="0.1"
              min="0.1"
              max={barrel.capacity - barrel.currentVolume}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Espace restant disponible: {(barrel.capacity - barrel.currentVolume).toFixed(1)} L
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Fournisseur (Optionnel)</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="Ex: TotalEnergies"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Prix Total (DH) (Optionnel)</label>
            <input 
              type="number" 
              className="form-control"
              placeholder="Ex: 1200"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes (Optionnel)</label>
            <textarea 
              className="form-control"
              placeholder="Ex: Ravitaillement mensuel..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              style={{ flex: 1 }}
              disabled={submitting}
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ flex: 1, backgroundColor: 'var(--accent-green)', color: '#fff' }}
              disabled={submitting}
            >
              {submitting ? 'Remplissage...' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
