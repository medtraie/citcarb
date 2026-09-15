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

  // Core Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cin, setCin] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [status, setStatus] = useState<DriverStatus>('active');

  // Dates d'expiration fields
  const [licenseExpirationDate, setLicenseExpirationDate] = useState('');
  const [medicalCheckupExpirationDate, setMedicalCheckupExpirationDate] = useState('');
  const [professionalCardExpirationDate, setProfessionalCardExpirationDate] = useState('');
  const [adrTrainingExpirationDate, setAdrTrainingExpirationDate] = useState('');

  // Alert Settings & Auto-Renew
  const [alertMode, setAlertMode] = useState<'days'>('days');
  const [intervalDays, setIntervalDays] = useState<number>(365);
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(30);
  const [autoRenew, setAutoRenew] = useState<boolean>(false);

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
    setLicenseExpirationDate('');
    setMedicalCheckupExpirationDate('');
    setProfessionalCardExpirationDate('');
    setAdrTrainingExpirationDate('');
    setAlertMode('days');
    setIntervalDays(365);
    setReminderDaysBefore(30);
    setAutoRenew(false);
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
    setLicenseExpirationDate(d.licenseExpirationDate || '');
    setMedicalCheckupExpirationDate(d.medicalCheckupExpirationDate || '');
    setProfessionalCardExpirationDate(d.professionalCardExpirationDate || '');
    setAdrTrainingExpirationDate(d.adrTrainingExpirationDate || '');
    setAlertMode(d.alertMode || 'days');
    setIntervalDays(d.intervalDays ?? 365);
    setReminderDaysBefore(d.reminderDaysBefore ?? 30);
    setAutoRenew(d.autoRenew || false);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setSubmitting(true);
    try {
      const driverData = {
        fullName,
        phone,
        cin,
        licenseNumber,
        status,
        licenseExpirationDate: licenseExpirationDate || undefined,
        medicalCheckupExpirationDate: medicalCheckupExpirationDate || undefined,
        professionalCardExpirationDate: professionalCardExpirationDate || undefined,
        adrTrainingExpirationDate: adrTrainingExpirationDate || undefined,
        alertMode,
        intervalDays: Number(intervalDays) || 365,
        reminderDaysBefore: Number(reminderDaysBefore) || 30,
        autoRenew,
      };

      if (editingDriver) {
        await updateDriver({
          ...editingDriver,
          ...driverData,
        });
      } else {
        await addDriver({
          ...driverData,
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR');
  };

  const getExpirationBadge = (dateStr?: string, reminderDays: number = 30) => {
    if (!dateStr) return null;
    const expDate = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return <span style={{ color: 'var(--accent-red)', fontWeight: 700, fontSize: '0.72rem', marginLeft: '4px' }}>Expiré ({Math.abs(diffDays)} j)</span>;
    } else if (diffDays <= reminderDays) {
      return <span style={{ color: 'var(--accent-warning)', fontWeight: 700, fontSize: '0.72rem', marginLeft: '4px' }}>Expire dans {diffDays} j</span>;
    }
    return <span style={{ color: 'var(--accent-green)', fontSize: '0.72rem', marginLeft: '4px' }}>Valide ({diffDays} j)</span>;
  };

  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Liste des chauffeurs ({drivers.length} conducteurs)
        </h2>
        {user.role === 'admin' && (
          <button className="btn btn-primary" onClick={openAddModal}>
            + Ajouter un Chauffeur
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement...</div>
      ) : drivers.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Aucun chauffeur enregistré. Cliquez sur "+ Ajouter un Chauffeur" pour commencer.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Chauffeur & Contact</th>
                <th style={{ width: '18%' }}>CIN & N° Permis</th>
                <th style={{ width: '28%' }}>Dates d'Expiration</th>
                <th style={{ width: '15%' }}>Renouvellement & Alertes</th>
                <th style={{ width: '8%' }}>Statut</th>
                <th style={{ width: '9%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(d => {
                const hasPhone = d.phone && d.phone.length > 2 && d.phone !== d.cin;
                const hasCin = d.cin && d.cin.length > 1;
                const hasLicense = d.licenseNumber && d.licenseNumber.length > 1;
                const hasExpirations = d.licenseExpirationDate || d.medicalCheckupExpirationDate || d.professionalCardExpirationDate || d.adrTrainingExpirationDate;

                return (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{d.fullName}</div>
                      {hasPhone && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          📞 {d.phone}
                        </div>
                      )}
                    </td>
                    <td>
                      {hasCin && <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-primary)' }}>CIN: <strong>{d.cin}</strong></div>}
                      {hasLicense && <div style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)', fontSize: '0.8rem', marginTop: '2px' }}>Permis: <strong>{d.licenseNumber}</strong></div>}
                      {!hasCin && !hasLicense && <span style={{ opacity: 0.5 }}>-</span>}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {hasExpirations ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {d.licenseExpirationDate && (
                            <div><strong>Permis:</strong> {formatDate(d.licenseExpirationDate)} {getExpirationBadge(d.licenseExpirationDate, d.reminderDaysBefore)}</div>
                          )}
                          {d.medicalCheckupExpirationDate && (
                            <div><strong>Visite Méd.:</strong> {formatDate(d.medicalCheckupExpirationDate)} {getExpirationBadge(d.medicalCheckupExpirationDate, d.reminderDaysBefore)}</div>
                          )}
                          {d.professionalCardExpirationDate && (
                            <div><strong>Carte Pro:</strong> {formatDate(d.professionalCardExpirationDate)} {getExpirationBadge(d.professionalCardExpirationDate, d.reminderDaysBefore)}</div>
                          )}
                          {d.adrTrainingExpirationDate && (
                            <div><strong>ADR:</strong> {formatDate(d.adrTrainingExpirationDate)} {getExpirationBadge(d.adrTrainingExpirationDate, d.reminderDaysBefore)}</div>
                          )}
                        </div>
                      ) : (
                        <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Aucune date définie</span>
                      )}
                    </td>
                    <td>
                      {d.autoRenew ? (
                        <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}>
                          ⚡ Auto ({d.intervalDays || 365} j)
                        </span>
                      ) : (
                        <span className="badge" style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', opacity: 0.8, backgroundColor: 'var(--bg-input)' }}>
                          Manuel (Rappel: {d.reminderDaysBefore || 30} j)
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(d.status)}>
                        {getStatusLabel(d.status)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {user.role === 'admin' && (
                          <>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                              onClick={() => openEditModal(d)}
                            >
                              Modifier
                            </button>
                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', cursor: 'pointer' }}
                              title="Supprimer ce chauffeur"
                              onClick={() => {
                                if (window.confirm(`Êtes-vous sûr de vouloir supprimer le chauffeur ${d.fullName} ?`)) {
                                  deleteDriver(d.id, user!.ownerId);
                                }
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
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

            <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Section 1: Informations Générales */}
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', marginBottom: '0.75rem' }}>1. Informations Générales</h4>
                
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
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

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
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
              </div>

              {/* Section 2: Dates d'expiration */}
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-green)', marginBottom: '0.75rem' }}>2. Dates d'expiration</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Permis de conduire</label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={licenseExpirationDate}
                      onChange={(e) => setLicenseExpirationDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Visite médicale</label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={medicalCheckupExpirationDate}
                      onChange={(e) => setMedicalCheckupExpirationDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Carte professionnelle</label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={professionalCardExpirationDate}
                      onChange={(e) => setProfessionalCardExpirationDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Formation ADR</label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={adrTrainingExpirationDate}
                      onChange={(e) => setAdrTrainingExpirationDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Mode d'alerte, Intervalle & Renouvellement */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-purple, #a855f7)', marginBottom: '0.75rem' }}>3. Mode d'alerte & Renouvellement automatique</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Mode d'alerte</label>
                    <select 
                      className="form-control"
                      value={alertMode}
                      onChange={(e) => setAlertMode(e.target.value as 'days')}
                    >
                      <option value="days">Par jours</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Intervalle (jours)</label>
                    <input 
                      type="number" 
                      className="form-control"
                      placeholder="Ex: 365"
                      min="1"
                      value={intervalDays}
                      onChange={(e) => setIntervalDays(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Créer un rappel lorsqu'il reste (jours)</label>
                  <input 
                    type="number" 
                    className="form-control"
                    placeholder="Ex: 30"
                    min="1"
                    value={reminderDaysBefore}
                    onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
                  />
                </div>

                <div style={{ 
                  backgroundColor: 'var(--bg-input)', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <input 
                    type="checkbox" 
                    id="autoRenew"
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    checked={autoRenew}
                    onChange={(e) => setAutoRenew(e.target.checked)}
                  />
                  <label htmlFor="autoRenew" style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>
                    Renouveler automatiquement après l'expiration <br/>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                      Si cette option est activée, le renouvellement des dates d'expiration se fait automatiquement selon l'intervalle configuré.
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
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

