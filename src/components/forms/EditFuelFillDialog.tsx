import React, { useState, useEffect } from 'react';
import { FuelFill, Vehicle, Driver } from '../../types';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';

interface EditFuelFillDialogProps {
  fill: FuelFill | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditFuelFillDialog: React.FC<EditFuelFillDialogProps> = ({
  fill,
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const { vehicles, drivers, updateFuelFill, tank } = useDataStore();

  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [mileage, setMileage] = useState('');
  const [fillDateTime, setFillDateTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fill && isOpen) {
      setVehicleId(fill.vehicleId);
      setDriverId(fill.driverId);
      setQuantity(fill.quantity.toString());
      setMileage(fill.mileage.toString());
      
      const d = fill.createdAt ? new Date(fill.createdAt) : new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setFillDateTime(d.toISOString().slice(0, 16));
      
      setNotes(fill.notes || '');
      setError(null);
    }
  }, [fill, isOpen]);

  if (!isOpen || !fill) return null;

  const handleVehicleChange = (vId: string) => {
    setVehicleId(vId);
    const selectedVeh = vehicles.find(v => v.id === vId);
    if (selectedVeh && selectedVeh.driverId) {
      setDriverId(selectedVeh.driverId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    const qty = parseFloat(quantity);
    const mil = parseFloat(mileage);

    if (isNaN(qty) || qty <= 0) {
      setError('Veuillez entrer une quantité valide de carburant.');
      return;
    }

    if (isNaN(mil) || mil < 0) {
      setError('Veuillez entrer un kilométrage valide.');
      return;
    }

    setSubmitting(true);
    try {
      await updateFuelFill({
        ...fill,
        vehicleId,
        driverId,
        quantity: qty,
        mileage: mil,
        notes: notes.trim() || undefined,
        createdAt: fillDateTime ? new Date(fillDateTime).toISOString() : fill.createdAt,
        ownerId: user.ownerId,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du plein.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeVehicles = vehicles.filter(v => v.status === 'active' || v.id === fill.vehicleId);
  const activeDrivers = drivers.filter(d => d.status === 'active' || d.id === fill.driverId);
  const selectedVehicle = vehicles.find(v => v.id === vehicleId);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <button className="modal-close" onClick={onClose} disabled={submitting}>&times;</button>
        
        <h2 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" strokeWidth="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          Modifier & Valider le Plein de Carburant
        </h2>

        <div style={{
          backgroundColor: 'rgba(0, 210, 255, 0.08)',
          border: '1px solid rgba(0, 210, 255, 0.25)',
          padding: '0.85rem 1rem',
          borderRadius: '10px',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.4
        }}>
          💡 <strong>Action Administrateur :</strong> Vous pouvez corriger la quantité ou le kilométrage saisis par l'agent. Le <strong>niveau de la citerne principal</strong> et le compteur du véhicule seront synchronisés en temps réel dès la validation.
        </div>

        {error && (
          <div style={{
            backgroundColor: 'var(--accent-red-glow)',
            color: 'var(--accent-red)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="form-group">
            <label className="form-label">Véhicule / Engin</label>
            <select 
              className="form-control"
              value={vehicleId}
              onChange={(e) => handleVehicleChange(e.target.value)}
              required
              disabled={submitting}
            >
              <option value="">-- Sélectionner le véhicule --</option>
              {activeVehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} ({v.plateNumber}) - {v.type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Chauffeur / Opérateur</label>
            <select 
              className="form-control"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              required
              disabled={submitting}
            >
              <option value="">-- Sélectionner le chauffeur --</option>
              {activeDrivers.map(d => (
                <option key={d.id} value={d.id}>
                  {d.fullName} (CIN: {d.cin})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Quantité de Gasoil (Litres) *</label>
              <input 
                type="number" 
                className="form-control"
                step="0.1"
                min="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                disabled={submitting}
                style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kilométrage (km) *</label>
              <input 
                type="number" 
                className="form-control"
                min="0"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                required
                disabled={submitting}
                style={{ fontWeight: 700 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Date et Heure du plein</label>
            <input 
              type="datetime-local" 
              className="form-control"
              value={fillDateTime}
              onChange={(e) => setFillDateTime(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes / Observations</label>
            <textarea 
              className="form-control"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes éventuelles..."
              disabled={submitting}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Annuler
            </button>
            <button 
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ padding: '0.65rem 1.25rem', fontWeight: 700 }}
            >
              {submitting ? 'Validation...' : '✓ Confirmer & Mettre à jour la Citerne'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
