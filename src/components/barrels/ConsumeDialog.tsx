import React, { useState, useEffect } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { Barrel } from '../../types';

interface ConsumeDialogProps {
  barrel: Barrel;
  isOpen: boolean;
  onClose: () => void;
}

export const ConsumeDialog: React.FC<ConsumeDialogProps> = ({
  barrel,
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const { 
    vehicles, 
    drivers, 
    fetchVehicles, 
    fetchDrivers, 
    consumeFromBarrel 
  } = useDataStore();

  const getNowDateTimeLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [consumeDateTime, setConsumeDateTime] = useState(getNowDateTimeLocal());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchVehicles(user.ownerId);
      fetchDrivers(user.ownerId);
    }
  }, [isOpen, user]);

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

    if (qtyNum > barrel.currentVolume) {
      setError(`Quantité insuffisante dans le baril (${barrel.currentVolume}L disponible).`);
      return;
    }

    if (!vehicleId) {
      setError('Veuillez sélectionner un véhicule.');
      return;
    }

    if (!driverId) {
      setError('Veuillez sélectionner un chauffeur.');
      return;
    }

    setSubmitting(true);
    try {
      await consumeFromBarrel({
        barrelId: barrel.id,
        quantity: qtyNum,
        vehicleId,
        performedBy: user.id,
        ownerId: user.ownerId,
        notes: notes.trim() || undefined,
        createdAt: consumeDateTime ? new Date(consumeDateTime).toISOString() : undefined,
      });
      onClose();
      // Reset form
      setVehicleId('');
      setDriverId('');
      setQuantity('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVehicleChange = (newVehicleId: string) => {
    setVehicleId(newVehicleId);
    const targetVeh = vehicles.find(v => v.id === newVehicleId);
    if (targetVeh && targetVeh.driverId) {
      setDriverId(targetVeh.driverId);
    }
  };

  const activeVehicles = vehicles.filter(v => v.status === 'active');
  const activeDrivers = drivers.filter(d => d.status === 'active');
  const selectedVehicle = vehicles.find(v => v.id === vehicleId);
  const assignedDriver = selectedVehicle?.driverId ? drivers.find(d => d.id === selectedVehicle.driverId) : null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          Consommer l'huile / fluide
        </h2>
        
        <div style={{
          backgroundColor: 'var(--bg-input)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          borderLeft: '4px solid var(--accent-orange)'
        }}>
          <strong>Baril:</strong> {barrel.name} ({barrel.type === 'hydraulique' ? 'Hydraulique' : 'Huile Moteur'})<br/>
          <strong>Quantité restante:</strong> {barrel.currentVolume} / {barrel.capacity} L
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
            <label className="form-label">Véhicule / Engin Destinataire</label>
            <select 
              className="form-control"
              value={vehicleId}
              onChange={(e) => handleVehicleChange(e.target.value)}
              required
            >
              <option value="">-- Sélectionner un véhicule ou engin --</option>
              {activeVehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} ({v.plateNumber}) - {v.type} {v.driverId ? '👤' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Chauffeur / Opérateur</label>
              {assignedDriver && (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 600 }}>
                  ✓ Chauffeur attribué : {assignedDriver.fullName}
                </span>
              )}
            </div>
            <select 
              className="form-control"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              required
            >
              <option value="">-- Sélectionner un chauffeur / conducteur --</option>
              {activeDrivers.map(d => (
                <option key={d.id} value={d.id}>
                  {d.fullName} (CIN: {d.cin}){selectedVehicle?.driverId === d.id ? ' ⭐ (Assigné)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date et Heure de consommation</label>
            <input 
              type="datetime-local" 
              className="form-control"
              value={consumeDateTime}
              onChange={(e) => setConsumeDateTime(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Quantité (Litres)</label>
            <input 
              type="number" 
              className="form-control"
              placeholder="Ex: 5"
              step="0.1"
              min="0.1"
              max={barrel.currentVolume}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes (Optionnel)</label>
            <textarea 
              className="form-control"
              placeholder="Ex: Complément huile moteur..."
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
              style={{ flex: 1, backgroundColor: 'var(--accent-orange)', color: '#fff' }}
              disabled={submitting}
            >
              {submitting ? 'Enregistrement...' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
