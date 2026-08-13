import React, { useState, useEffect } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { Repair, RepairType, RepairPriority, RepairStatus } from '../../types';

interface AddRepairDialogProps {
  isOpen: boolean;
  onClose: () => void;
  repairToEdit?: Repair | null;
}

export const AddRepairDialog: React.FC<AddRepairDialogProps> = ({
  isOpen,
  onClose,
  repairToEdit
}) => {
  const { user } = useAuthStore();
  const { vehicles, fetchVehicles, addRepair, updateRepair } = useDataStore();

  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState<RepairType>('mecanique');
  const [priority, setPriority] = useState<RepairPriority>('medium');
  const [status, setStatus] = useState<RepairStatus>('in_progress');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');
  const [cost, setCost] = useState<number>(0);
  const [provider, setProvider] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [partsReplaced, setPartsReplaced] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchVehicles(user.ownerId);
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (repairToEdit) {
      setVehicleId(repairToEdit.vehicleId);
      setType(repairToEdit.type);
      setPriority(repairToEdit.priority);
      setStatus(repairToEdit.status);
      setStartDate(repairToEdit.startDate || new Date().toISOString().split('T')[0]);
      setEndDate(repairToEdit.endDate || '');
      setCost(repairToEdit.cost || 0);
      setProvider(repairToEdit.provider || '');
      setDescription(repairToEdit.description || '');
      setPartsReplaced(repairToEdit.partsReplaced || '');
    } else {
      setVehicleId(vehicles.length > 0 ? vehicles[0].id : '');
      setType('mecanique');
      setPriority('medium');
      setStatus('in_progress');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setCost(0);
      setProvider('');
      setDescription('');
      setPartsReplaced('');
    }
  }, [repairToEdit, isOpen, vehicles]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    if (!vehicleId) {
      setError('Veuillez sélectionner un véhicule.');
      return;
    }
    if (!description.trim()) {
      setError('Veuillez fournir une description de la panne.');
      return;
    }

    setSubmitting(true);
    try {
      if (repairToEdit) {
        await updateRepair({
          ...repairToEdit,
          vehicleId,
          type,
          priority,
          status,
          startDate,
          endDate: endDate || undefined,
          cost: Number(cost) || 0,
          provider: provider.trim() || undefined,
          description: description.trim(),
          partsReplaced: partsReplaced.trim() || undefined
        });
      } else {
        await addRepair({
          vehicleId,
          type,
          priority,
          status,
          startDate,
          endDate: endDate || undefined,
          cost: Number(cost) || 0,
          provider: provider.trim() || undefined,
          description: description.trim(),
          partsReplaced: partsReplaced.trim() || undefined,
          ownerId: user.ownerId,
          createdAt: new Date().toISOString()
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving repair:', err);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} disabled={submitting}>&times;</button>
        
        <h2 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" strokeWidth="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
          {repairToEdit ? 'Modifier la réparation' : 'Nouvelle Réparation & Panne'}
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
              <label className="form-label">Véhicule / Engin</label>
              <select 
                className="form-control"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
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
              <label className="form-label">Type de Panne</label>
              <select 
                className="form-control"
                value={type}
                onChange={(e) => setType(e.target.value as RepairType)}
                required
              >
                <option value="mecanique">Mécanique Moteur</option>
                <option value="electrique">Électrique & Batterie</option>
                <option value="freinage">Freinage & Sécurité</option>
                <option value="pneumatique">Pneumatique & Rues</option>
                <option value="hydraulique">Hydraulique & Vérins</option>
                <option value="carrosserie">Carrosserie & Tolerie</option>
                <option value="autre">Autre Intervention</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Niveau d'Urgence / Priorité</label>
              <select 
                className="form-control"
                value={priority}
                onChange={(e) => setPriority(e.target.value as RepairPriority)}
                required
              >
                <option value="low">🟢 Faible (Routine)</option>
                <option value="medium">🟠 Moyenne (Nécessite intervention)</option>
                <option value="high">🔴 Haute / URGENT (Véhicule immobilisé)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Statut Actuel</label>
              <select 
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value as RepairStatus)}
                required
              >
                <option value="pending">📥 En attente / Signalé</option>
                <option value="in_progress">🔧 En cours de réparation</option>
                <option value="completed">✅ Terminé / Clôturé</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Date de Début / Signalement</label>
              <input 
                type="date" 
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date de Fin (Optionnel)</label>
              <input 
                type="date" 
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Coût de la réparation (MAD)</label>
              <input 
                type="number" 
                className="form-control"
                placeholder="Ex: 1500"
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
                placeholder="Ex: Garage Central Pro..."
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description de la Panne & Diagnostic</label>
            <textarea 
              className="form-control"
              placeholder="Explication détaillée du problème ou des symptômes observés..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Pièces Remplacées / Fournitures (Optionnel)</label>
            <textarea 
              className="form-control"
              placeholder="Ex: Plaquettes de frein, Liquide de refroidissement, Filtre à huile..."
              rows={2}
              value={partsReplaced}
              onChange={(e) => setPartsReplaced(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
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
              {submitting ? 'Enregistrement...' : 'Enregistrer la Réparation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
