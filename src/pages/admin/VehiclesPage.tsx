import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { Vehicle, VehicleStatus } from '../../types';

export const VehiclesPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    vehicles, 
    drivers, 
    fetchVehicles, 
    fetchDrivers, 
    addVehicle, 
    updateVehicle, 
    deleteVehicle,
    loading 
  } = useDataStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  // Form fields
  const [plateNumber, setPlateNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('Camionette');
  const [tonnage, setTonnage] = useState('3.5');
  const [year, setYear] = useState(new Date().getFullYear());
  const [currentMileage, setCurrentMileage] = useState('');
  const [avgConsumption, setAvgConsumption] = useState('');
  const [status, setStatus] = useState<VehicleStatus>('active');
  const [driverId, setDriverId] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchVehicles(user.ownerId);
      fetchDrivers(user.ownerId);
    }
  }, [user]);

  const openAddModal = () => {
    setEditingVehicle(null);
    setPlateNumber('');
    setBrand('');
    setModel('');
    setType('Camionette');
    setTonnage('3.5');
    setYear(new Date().getFullYear());
    setCurrentMileage('');
    setAvgConsumption('');
    setStatus('active');
    setDriverId('');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setPlateNumber(v.plateNumber);
    setBrand(v.brand);
    setModel(v.model);
    
    // Parse category and tonnage e.g. "Camionette (3.5T)" or "Fourgon" -> "Engins"
    let parsedType = v.type || 'Camionette';
    let parsedTonnage = '3.5';
    if (parsedType === 'Fourgon') parsedType = 'Engins';
    
    if (parsedType.includes('(') && parsedType.includes('T)')) {
      const match = parsedType.match(/(.*?)\s*\(([\d.]+)T\)/i);
      if (match) {
        parsedType = match[1].trim();
        parsedTonnage = match[2];
      }
    } else if (v.tonnage) {
      parsedTonnage = v.tonnage.toString();
    }
    setType(parsedType);
    setTonnage(parsedTonnage);
    setYear(v.year);
    setCurrentMileage(v.currentMileage.toString());
    setAvgConsumption(v.avgConsumption.toString());
    setStatus(v.status);
    setDriverId(v.driverId || '');
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    const mileageNum = parseFloat(currentMileage);
    const consNum = parseFloat(avgConsumption);

    if (isNaN(mileageNum) || mileageNum < 0) {
      setError('Veuillez entrer un kilométrage valide.');
      return;
    }

    if (isNaN(consNum) || consNum <= 0) {
      setError('Veuillez entrer une consommation moyenne valide.');
      return;
    }

    const finalType = type === 'Camionette' ? `${type} (${tonnage}T)` : type;
    const tonnageNum = type === 'Camionette' ? parseFloat(tonnage) : undefined;

    setSubmitting(true);
    try {
      if (editingVehicle) {
        await updateVehicle({
          ...editingVehicle,
          plateNumber,
          brand,
          model,
          type: finalType,
          tonnage: tonnageNum,
          year,
          currentMileage: mileageNum,
          avgConsumption: consNum,
          status,
          driverId: driverId || undefined,
        });
      } else {
        await addVehicle({
          plateNumber,
          brand,
          model,
          type: finalType,
          tonnage: tonnageNum,
          year,
          currentMileage: mileageNum,
          avgConsumption: consNum,
          status,
          driverId: driverId || undefined,
          ownerId: user.ownerId,
        });
      }
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const getDriverName = (dId?: string) => {
    if (!dId) return 'Non assigné';
    const d = drivers.find(drv => drv.id === dId);
    return d ? d.fullName : 'Non assigné';
  };

  const getStatusBadgeClass = (s: VehicleStatus) => {
    if (s === 'active') return 'badge badge-success';
    if (s === 'maintenance') return 'badge badge-warning';
    return 'badge badge-danger';
  };

  const getStatusLabel = (s: VehicleStatus) => {
    if (s === 'active') return 'Actif';
    if (s === 'maintenance') return 'En Maintenance';
    return 'Hors Service';
  };

  const transportVehicles = vehicles.filter(v => !v.type?.toLowerCase().includes('engin'));
  const enginVehicles = vehicles.filter(v => v.type?.toLowerCase().includes('engin'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Gestion de la Flotte & Engins de Chantier
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Total: {vehicles.length} véhicules et engins enregistrés
          </span>
        </div>
        <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Ajouter un Véhicule / Engin
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement...</div>
      ) : vehicles.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Aucun véhicule ou engin enregistré. Cliquez sur "+ Ajouter un Véhicule / Engin" pour commencer.
        </div>
      ) : (
        <>
          {/* Table 1: Flotte de Transport (Voitures, Camionettes, Camions, etc.) */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
              Flotte de Transport & Véhicules ({transportVehicles.length})
            </h3>
            
            {transportVehicles.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Aucun véhicule de transport enregistré.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Immatriculation</th>
                      <th>Marque & Modèle</th>
                      <th>Catégorie</th>
                      <th>Kilométrage</th>
                      <th>Cons. Moy. (L/100km)</th>
                      <th>Chauffeur</th>
                      <th>Statut</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transportVehicles.map(v => (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{v.plateNumber}</td>
                        <td style={{ fontWeight: 600 }}>{v.brand} {v.model} ({v.year})</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{v.type}</td>
                        <td>{v.currentMileage.toLocaleString()} km</td>
                        <td style={{ fontWeight: 600 }}>{v.avgConsumption} L/100km</td>
                        <td>{getDriverName(v.driverId)}</td>
                        <td>
                          <span className={getStatusBadgeClass(v.status)}>
                            {getStatusLabel(v.status)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                            onClick={() => openEditModal(v)}
                          >
                            Modifier
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Supprimer ce véhicule"
                            onClick={() => {
                              if (window.confirm(`Êtes-vous sûr de vouloir supprimer le véhicule ${v.plateNumber} ?`)) {
                                deleteVehicle(v.id, user!.ownerId);
                              }
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Table 2: Engins & Équipements de Chantier */}
          <div className="card" style={{ padding: '1.25rem', borderTop: '3px solid var(--accent-orange)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-orange)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
              Engins & Équipements de Chantier ({enginVehicles.length})
            </h3>
            
            {enginVehicles.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Aucun engin de chantier enregistré.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Identification / Matricule</th>
                      <th>Marque & Modèle</th>
                      <th>Catégorie</th>
                      <th>Kilométrage</th>
                      <th>Cons. Moy. (L/100km)</th>
                      <th>Conducteur / Opérateur</th>
                      <th>Statut</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enginVehicles.map(v => (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 700, color: 'var(--accent-orange)' }}>{v.plateNumber}</td>
                        <td style={{ fontWeight: 600 }}>{v.brand} {v.model} ({v.year})</td>
                        <td style={{ color: 'var(--text-secondary)' }}>Engins</td>
                        <td>{v.currentMileage.toLocaleString()} km</td>
                        <td style={{ fontWeight: 600 }}>{v.avgConsumption} L/100km</td>
                        <td>{getDriverName(v.driverId)}</td>
                        <td>
                          <span className={getStatusBadgeClass(v.status)}>
                            {getStatusLabel(v.status)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                            onClick={() => openEditModal(v)}
                          >
                            Modifier
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Supprimer cet engin"
                            onClick={() => {
                              if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'engin ${v.plateNumber} ?`)) {
                                deleteVehicle(v.id, user!.ownerId);
                              }
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setModalOpen(false)}>&times;</button>
            
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: 800 }}>{editingVehicle ? 'Modifier le Véhicule / Engin' : 'Nouveau Véhicule / Engin'}</h2>
            
            {error && (
              <div style={{
                backgroundColor: 'var(--accent-red-glow)',
                color: 'var(--accent-red)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Numéro d'immatriculation / Identification</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Ex: 12345-A-10 ou ENG-01"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Marque</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Ex: CAT, Dacia, JCB"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Modèle</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Ex: 320D, Logan, Master"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: type === 'Camionette' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Catégories</label>
                  <select 
                    className="form-control"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    required
                  >
                    <option value="Voiture">Voiture</option>
                    <option value="Camionette">Camionette</option>
                    <option value="Remorque">Remorque</option>
                    <option value="Engins">Engins</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                {type === 'Camionette' && (
                  <div className="form-group">
                    <label className="form-label">Tonnage (Tonne)</label>
                    <select 
                      className="form-control"
                      value={tonnage}
                      onChange={(e) => setTonnage(e.target.value)}
                      required
                    >
                      <option value="3.5">3.5 Tonnes</option>
                      <option value="7">7 Tonnes</option>
                      <option value="10">10 Tonnes</option>
                      <option value="14">14 Tonnes</option>
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Année de mise en circulation</label>
                  <input 
                    type="number" 
                    className="form-control"
                    min="1990"
                    max={new Date().getFullYear() + 1}
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Kilométrage actuel (km)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="Ex: 85000"
                    value={currentMileage}
                    onChange={(e) => setCurrentMileage(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Consommation moy. (L/100km)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="Ex: 6.5"
                    step="0.1"
                    value={avgConsumption}
                    onChange={(e) => setAvgConsumption(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Chauffeur Assigné (Optionnel)</label>
                <select 
                  className="form-control"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                >
                  <option value="">-- Aucun chauffeur --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Statut du véhicule</label>
                <select 
                  className="form-control"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                  required
                >
                  <option value="active">Actif</option>
                  <option value="maintenance">En Maintenance</option>
                  <option value="outOfService">Hors Service</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setModalOpen(false)}
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
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
