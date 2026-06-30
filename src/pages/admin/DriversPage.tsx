import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { Driver, DriverStatus } from '../../types';

export const DriversPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    drivers, 
    fetchDrivers, 
    addDriver, 
    updateDriver, 
    deleteDriver,
    loading 
  } = useDataStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cin, setCin] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [status, setStatus] = useState<DriverStatus>('active');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDrivers(user.ownerId);
    }
  }, [user]);

  const openAddModal = () => {
    setEditingDriver(null);
    setFullName('');
    setPhone('');
    setCin('');
    setLicenseNumber('');
    setStatus('active');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (d: Driver) => {
    setEditingDriver(d);
    setFullName(d.fullName);
    setPhone(d.phone);
    setCin(d.cin);
    setLicenseNumber(d.licenseNumber);
    setStatus(d.status);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setSubmitting(true);
    try {
      if (editingDriver) {
        await updateDriver({
          ...editingDriver,
          fullName,
          phone,
          cin,
          licenseNumber,
          status,
        });
      } else {
        await addDriver({
          fullName,
          phone,
          cin,
          licenseNumber,
          status,
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

  const getStatusBadgeClass = (s: DriverStatus) => {
    if (s === 'active') return 'badge badge-success';
    if (s === 'suspended') return 'badge badge-warning';
    return 'badge badge-danger';
  };

  const getStatusLabel = (s: DriverStatus) => {
    if (s === 'active') return 'Actif';
    if (s === 'suspended') return 'Suspendu';
    return 'Inactif';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Liste des chauffeurs ({drivers.length} conducteurs)
        </h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Ajouter un Chauffeur
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement...</div>
      ) : drivers.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Aucun chauffeur enregistré. Cliquez sur "+ Ajouter un Chauffeur" pour commencer.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Nom Complet</th>
                <th>Téléphone</th>
                <th>CIN</th>
                <th>N° de Permis</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.fullName}</td>
                  <td>{d.phone}</td>
                  <td style={{ fontFamily: 'monospace' }}>{d.cin}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{d.licenseNumber}</td>
                  <td>
                    <span className={getStatusBadgeClass(d.status)}>
                      {getStatusLabel(d.status)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                      onClick={() => openEditModal(d)}
                    >
                      Modifier
                    </button>
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      title="Supprimer ce chauffeur"
                      onClick={() => {
                        if (window.confirm(`Êtes-vous sûr de vouloir supprimer le chauffeur ${d.fullName} ?`)) {
                          deleteDriver(d.id, user!.ownerId);
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

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setModalOpen(false)}>&times;</button>
            
            <h2>{editingDriver ? 'Modifier le Chauffeur' : 'Nouveau Chauffeur'}</h2>
            
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
                <label className="form-label">Nom Complet</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Ex: Ahmed El Mansouri"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Numéro de Téléphone</label>
                <input 
                  type="tel" 
                  className="form-control"
                  placeholder="Ex: 0661234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">CIN (Carte d'identité)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Ex: AB123456"
                    value={cin}
                    onChange={(e) => setCin(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Numéro de Permis</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Ex: PERM-9988"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Statut</label>
                <select 
                  className="form-control"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DriverStatus)}
                  required
                >
                  <option value="active">Actif</option>
                  <option value="suspended">Suspendu</option>
                  <option value="inactive">Inactif</option>
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
