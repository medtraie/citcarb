import React, { useState } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';

interface TankRefillFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const TankRefillForm: React.FC<TankRefillFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const { user } = useAuthStore();
  const { refillTank, tank } = useDataStore();

  const [date, setDate] = useState(() => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [quantity, setQuantity] = useState('');
  const [supplier, setSupplier] = useState('');
  const [price, setPrice] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    const qtyNum = parseFloat(val);
    const priceNum = parseFloat(price);
    if (!isNaN(qtyNum) && qtyNum > 0 && !isNaN(priceNum)) {
      setUnitPrice((priceNum / qtyNum).toFixed(2));
    }
  };

  const handlePriceChange = (val: string) => {
    setPrice(val);
    const priceNum = parseFloat(val);
    const qtyNum = parseFloat(quantity);
    if (!isNaN(qtyNum) && qtyNum > 0 && !isNaN(priceNum)) {
      setUnitPrice((priceNum / qtyNum).toFixed(2));
    } else if (!val) {
      setUnitPrice('');
    }
  };

  const handleUnitPriceChange = (val: string) => {
    setUnitPrice(val);
    const uPriceNum = parseFloat(val);
    const qtyNum = parseFloat(quantity);
    if (!isNaN(qtyNum) && qtyNum > 0 && !isNaN(uPriceNum)) {
      setPrice((qtyNum * uPriceNum).toFixed(2));
    } else if (!val) {
      setPrice('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tank) return;

    setError(null);
    const qty = parseFloat(quantity);
    const priceNum = price ? parseFloat(price) : undefined;

    if (isNaN(qty) || qty <= 0) {
      setError('Veuillez entrer une quantité valide.');
      return;
    }

    if (qty > (tank.capacity - tank.currentVolume)) {
      setError(`Quantité dépasse la capacité restante disponible de la citerne (${(tank.capacity - tank.currentVolume).toFixed(0)} L).`);
      return;
    }

    setSubmitting(true);
    try {
      await refillTank({
        tankId: tank.id,
        quantity: qty,
        supplier: supplier.trim() || undefined,
        price: priceNum,
        notes: notes.trim() || undefined,
        performedBy: user.id,
        ownerId: user.ownerId,
        createdAt: date ? new Date(date).toISOString() : undefined
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du remplissage de la citerne.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!tank) return null;

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
        Ravitaillement citerne
      </h2>

      {error && (
        <div style={{
          backgroundColor: 'var(--accent-red-glow)',
          color: 'var(--accent-red)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
          fontWeight: 500,
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          {error}
        </div>
      )}

      <div style={{
        backgroundColor: 'var(--bg-input)',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        fontSize: '0.9rem',
        borderLeft: '4px solid var(--accent-green)'
      }}>
        <strong>Citerne:</strong> Gasoil principal <br/>
        <strong>Capacité libre:</strong> {(tank.capacity - tank.currentVolume).toFixed(0)} L (Stock: {tank.currentVolume.toFixed(0)} / {tank.capacity} L)
      </div>

      <div className="form-group">
        <label className="form-label">Date du ravitaillement</label>
        <input 
          type="datetime-local" 
          className="form-control"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Quantité de carburant ajoutée (Litres)</label>
        <input 
          type="number" 
          className="form-control"
          placeholder="Ex: 2000"
          min="1"
          max={tank.capacity - tank.currentVolume}
          value={quantity}
          onChange={(e) => handleQuantityChange(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Fournisseur / Distributeur</label>
        <input 
          type="text" 
          className="form-control"
          placeholder="Ex: Afriquia, Shell..."
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Coût total (DH) (Optionnel)</label>
        <input 
          type="number" 
          step="0.01"
          className="form-control"
          placeholder="Ex: 24000"
          min="0"
          value={price}
          onChange={(e) => handlePriceChange(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Prix unitaire par litre (DH/L) (Calculé automatiquement)</label>
        <input 
          type="number" 
          step="0.01"
          className="form-control"
          placeholder="Ex: 12.00"
          value={unitPrice}
          onChange={(e) => handleUnitPriceChange(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Notes supplémentaires</label>
        <textarea 
          className="form-control"
          placeholder="Remarques..."
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={onCancel}
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
          {submitting ? 'Ravitaillement...' : 'Valider'}
        </button>
      </div>
    </form>
  );
};
