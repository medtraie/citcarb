import React, { useState, useEffect } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';

interface FuelFillFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const FuelFillForm: React.FC<FuelFillFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const { user } = useAuthStore();
  const { vehicles, drivers, fetchVehicles, fetchDrivers, addFuelFill, tank } = useDataStore();

  const getNowDateTimeLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [mileage, setMileage] = useState('');
  const [fillDateTime, setFillDateTime] = useState(getNowDateTimeLocal());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchVehicles(user.ownerId);
      fetchDrivers(user.ownerId);
    }
  }, [user]);

  const selectedVehicle = vehicles.find(v => v.id === vehicleId);
  const isEngin = selectedVehicle?.type?.toLowerCase().includes('engin');

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

    if (tank && qty > tank.currentVolume) {
      setError(`Quantité demandée (${qty}L) dépasse le stock actuel de la citerne (${tank.currentVolume}L).`);
      return;
    }

    if (isNaN(mil) || mil < 0) {
      setError(isEngin ? 'Veuillez entrer un nombre d\'heures valide.' : 'Veuillez entrer un kilométrage valide.');
      return;
    }

    if (selectedVehicle && mil <= selectedVehicle.currentMileage) {
      setError(isEngin 
        ? `Les heures saisies (${mil} h) doivent être supérieures aux heures actuelles de l'engin (${selectedVehicle.currentMileage} h).`
        : `Le kilométrage saisi (${mil} km) doit être supérieur au kilométrage actuel du véhicule (${selectedVehicle.currentMileage} km).`
      );
      return;
    }

    setSubmitting(true);
    try {
      await addFuelFill({
        vehicleId,
        driverId,
        quantity: qty,
        mileage: mil,
        notes: notes.trim() || undefined,
        performedBy: user.id,
        ownerId: user.ownerId,
        createdAt: fillDateTime ? new Date(fillDateTime).toISOString() : undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement du plein.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeVehicles = vehicles.filter(v => v.status === 'active');
  const activeDrivers = drivers.filter(d => d.status === 'active');

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2"><path d="M3 22v-4h18v4H3z M12 2v12 M7 8h10" /></svg>
        Nouveau plein de gasoil
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

      <div className="form-group">
        <label className="form-label">Véhicule / Engin</label>
        <select 
          className="form-control"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          required
        >
          <option value="">-- Sélectionner le véhicule ou engin --</option>
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
        >
          <option value="">-- Sélectionner le chauffeur / conducteur --</option>
          {activeDrivers.map(d => (
            <option key={d.id} value={d.id}>
              {d.fullName} (CIN: {d.cin})
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Date et Heure du plein</label>
        <input 
          type="datetime-local" 
          className="form-control"
          value={fillDateTime}
          onChange={(e) => setFillDateTime(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Quantité (Litres)</label>
        <input 
          type="number" 
          className="form-control"
          placeholder="Quantité de carburant"
          min="1"
          step="0.1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          {isEngin ? "Heures d'utilisation / Compteur (h)" : "Kilométrage actuel (km)"}
        </label>
        <input 
          type="number" 
          className="form-control"
          placeholder={isEngin ? "Nombre d'heures au compteur (Ex: 4500 h)" : "Kilométrage du compteur (Ex: 85000 km)"}
          min="1"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
          required
        />
        {selectedVehicle && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
            {isEngin 
              ? `Dernières heures enregistrées: ${selectedVehicle.currentMileage} h`
              : `Dernier kilométrage enregistré: ${selectedVehicle.currentMileage} km`}
          </span>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Notes / Observations</label>
        <textarea 
          className="form-control"
          placeholder="Remarques éventuelles..."
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
          style={{ flex: 1 }}
          disabled={submitting}
        >
          {submitting ? 'Enregistrement...' : 'Confirmer'}
        </button>
      </div>
    </form>
  );
};
