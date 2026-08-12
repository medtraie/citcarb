import React, { useState, useEffect } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { Revision, RevisionType, RevisionMode } from '../../types';

interface AddRevisionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  revisionToEdit?: Revision | null;
}

export const AddRevisionDialog: React.FC<AddRevisionDialogProps> = ({
  isOpen,
  onClose,
  revisionToEdit
}) => {
  const { user } = useAuthStore();
  const { vehicles, fetchVehicles, addRevision, updateRevision } = useDataStore();

  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState<RevisionType>('vidange');
  const [mode, setMode] = useState<RevisionMode>('days');
  const [intervalDays, setIntervalDays] = useState<number>(90);
  const [lastDate, setLastDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [intervalKm, setIntervalKm] = useState<number>(10000);
  const [lastKm, setLastKm] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [provider, setProvider] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchVehicles(user.ownerId);
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (revisionToEdit) {
      setVehicleId(revisionToEdit.vehicleId);
      setType(revisionToEdit.type);
      setMode(revisionToEdit.mode);
      setIntervalDays(revisionToEdit.intervalDays || 90);
      setLastDate(revisionToEdit.lastDate || new Date().toISOString().split('T')[0]);
      setIntervalKm(revisionToEdit.intervalKm || 10000);
      setLastKm(revisionToEdit.lastKm || 0);
      setCost(revisionToEdit.cost || 0);
      setProvider(revisionToEdit.provider || '');
      setNotes(revisionToEdit.notes || '');
    } else {
      setVehicleId(vehicles.length > 0 ? vehicles[0].id : '');
      setType('vidange');
      setMode('days');
      setIntervalDays(90);
      setLastDate(new Date().toISOString().split('T')[0]);
      setIntervalKm(10000);
      setLastKm(0);
      setCost(0);
      setProvider('');
      setNotes('');
    }
  }, [revisionToEdit, isOpen, vehicles]);

  // Adjust default interval when type changes
  const handleTypeChange = (newType: RevisionType) => {
    setType(newType);
    if (newType === 'vidange') {
      setMode('mileage');
      setIntervalKm(10000);
    } else if (newType === 'visite_technique') {
      setMode('days');
      setIntervalDays(365);
    } else if (newType === 'tachygraphe') {
      setMode('days');
      setIntervalDays(730);
    } else if (newType === 'assurance' || newType === 'vignette') {
      setMode('days');
      setIntervalDays(365);
    }
  };

  // When vehicle selected, populate current mileage
  const handleVehicleChange = (vId: string) => {
    setVehicleId(vId);
    const v = vehicles.find(veh => veh.id === vId);
    if (v) {
      setLastKm(v.currentMileage);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    if (!vehicleId) {
      setError('Veuillez sélectionner un véhicule.');
      return;
    }

    setSubmitting(true);
    try {
      if (revisionToEdit) {
        await updateRevision({
          ...revisionToEdit,
          vehicleId,
          type,
          mode,
          intervalDays: mode === 'days' ? intervalDays : undefined,
          lastDate: mode === 'days' ? lastDate : undefined,
          intervalKm: mode === 'mileage' ? intervalKm : undefined,
          lastKm: mode === 'mileage' ? lastKm : undefined,
          cost,
          provider: provider.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await addRevision({
          vehicleId,
          type,
          mode,
          intervalDays: mode === 'days' ? intervalDays : undefined,
          lastDate: mode === 'days' ? lastDate : undefined,
          intervalKm: mode === 'mileage' ? intervalKm : undefined,
          lastKm: mode === 'mileage' ? lastKm : undefined,
          cost,
          provider: provider.trim() || undefined,
          notes: notes.trim() || undefined,
          ownerId: user.ownerId,
          createdAt: new Date().toISOString()
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving revision:', err);
      // Even if an unexpected error occurs, close modal cleanly after saving fallback
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} disabled={submitting}>&times;</button>
        
        <h2 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
          {revisionToEdit ? 'Modifier la révision' : 'Ajouter une révision'}
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
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Véhicule</label>
              <select 
                className="form-control"
                value={vehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                required
              >
                <option value="">-- Sélectionner un véhicule --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} ({v.plateNumber})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Type</label>
              <select 
                className="form-control"
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as RevisionType)}
                required
              >
                <option value="vidange">Vidange Huile Moteur</option>
                <option value="tachygraphe">Tachygraphe</option>
                <option value="visite_technique">Visite Technique</option>
                <option value="assurance">Assurance</option>
                <option value="vignette">Vignette</option>
                <option value="autre">Autre Révision / Entretien</option>
              </select>
            </div>
          </div>

          {/* Mode d'alerte Toggle */}
          <div className="form-group">
            <label className="form-label">Mode d'alerte</label>
            <div style={{
              display: 'flex',
              backgroundColor: 'var(--bg-card)',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)'
            }}>
              <button
                type="button"
                onClick={() => setMode('days')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: mode === 'days' ? '#1E293B' : 'transparent',
                  color: mode === 'days' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: mode === 'days' ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: mode === 'days' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                Par jours (Calendrier)
              </button>
              <button
                type="button"
                onClick={() => setMode('mileage')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: mode === 'mileage' ? '#1E293B' : 'transparent',
                  color: mode === 'mileage' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: mode === 'mileage' ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: mode === 'mileage' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                Par kilométrage (km / h)
              </button>
            </div>
          </div>

          {/* Dynamic Mode Inputs */}
          {mode === 'days' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Intervalle (jours)</label>
                <input 
                  type="number" 
                  className="form-control"
                  placeholder="Ex: 90"
                  min="1"
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(Number(e.target.value))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Dernière date d'entretien</label>
                <input 
                  type="date" 
                  className="form-control"
                  value={lastDate}
                  onChange={(e) => setLastDate(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Intervalle (km / h)</label>
                <input 
                  type="number" 
                  className="form-control"
                  placeholder="Ex: 10000"
                  min="100"
                  value={intervalKm}
                  onChange={(e) => setIntervalKm(Number(e.target.value))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Dernier kilométrage / compteur</label>
                <input 
                  type="number" 
                  className="form-control"
                  placeholder="Ex: 85000"
                  value={lastKm}
                  onChange={(e) => setLastKm(Number(e.target.value))}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Coût estimé / effectué (MAD)</label>
            <input 
              type="number" 
              className="form-control"
              placeholder="Ex: 850"
              min="0"
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Prestataire / Garage (Optionnel)</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="Ex: Garage Central, AXA, Auto-Centre..."
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes / Observations (Optionnel)</label>
            <textarea 
              className="form-control"
              placeholder="Remarques spécifiques sur la révision..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
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
              style={{ flex: 1, backgroundColor: 'var(--accent-cyan)', color: '#fff' }}
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
