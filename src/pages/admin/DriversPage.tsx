import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { Driver, DriverStatus, DocumentConfig } from '../../types';

interface DocConfigCardProps {
  title: string;
  config: DocumentConfig;
  onChange: (updated: DocumentConfig) => void;
  accentColor?: string;
}

const DocConfigCard: React.FC<DocConfigCardProps> = ({ title, config, onChange, accentColor = 'var(--accent-cyan)' }) => {
  return (
    <div style={{
      backgroundColor: 'var(--bg-input)',
      border: '1px solid var(--border-color)',
      borderRadius: '10px',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      boxSizing: 'border-box'
    }}>
      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: accentColor, borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <span>📄</span> {title}
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>Date d'expiration</label>
        <input 
          type="date" 
          className="form-control"
          style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem', width: '100%' }}
          value={config.expirationDate || ''}
          onChange={(e) => onChange({ ...config, expirationDate: e.target.value })}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', whiteSpace: 'nowrap' }}>Intervalle (jours)</label>
          <input 
            type="number" 
            className="form-control"
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem', width: '100%' }}
            placeholder="365"
            min="1"
            value={config.intervalDays ?? 365}
            onChange={(e) => onChange({ ...config, intervalDays: Number(e.target.value) })}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', whiteSpace: 'nowrap' }}>Rappel (jours avant)</label>
          <input 
            type="number" 
            className="form-control"
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem', width: '100%' }}
            placeholder="30"
            min="1"
            value={config.reminderDaysBefore ?? 30}
            onChange={(e) => onChange({ ...config, reminderDaysBefore: Number(e.target.value) })}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem' }}>
        <input 
          type="checkbox" 
          id={`autoRenew_${title.replace(/[^a-zA-Z0-9]/g, '_')}`}
          style={{ width: '17px', height: '17px', cursor: 'pointer' }}
          checked={config.autoRenew || false}
          onChange={(e) => onChange({ ...config, autoRenew: e.target.checked })}
        />
        <label 
          htmlFor={`autoRenew_${title.replace(/[^a-zA-Z0-9]/g, '_')}`}
          style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-primary)', margin: 0, fontWeight: 500, userSelect: 'none' }}
        >
          Renouvellement automatique
        </label>
      </div>
    </div>
  );
};

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

  // Per-document configurations
  const [licenseConfig, setLicenseConfig] = useState<DocumentConfig>({ expirationDate: '', intervalDays: 365, reminderDaysBefore: 30, autoRenew: false });
  const [medicalConfig, setMedicalConfig] = useState<DocumentConfig>({ expirationDate: '', intervalDays: 365, reminderDaysBefore: 30, autoRenew: false });
  const [cardConfig, setCardConfig] = useState<DocumentConfig>({ expirationDate: '', intervalDays: 365, reminderDaysBefore: 30, autoRenew: false });
  const [adrConfig, setAdrConfig] = useState<DocumentConfig>({ expirationDate: '', intervalDays: 365, reminderDaysBefore: 30, autoRenew: false });

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
    setLicenseConfig({ expirationDate: '', intervalDays: 365, reminderDaysBefore: 30, autoRenew: false });
    setMedicalConfig({ expirationDate: '', intervalDays: 365, reminderDaysBefore: 30, autoRenew: false });
    setCardConfig({ expirationDate: '', intervalDays: 365, reminderDaysBefore: 30, autoRenew: false });
    setAdrConfig({ expirationDate: '', intervalDays: 365, reminderDaysBefore: 30, autoRenew: false });
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

    setLicenseConfig(d.licenseConfig || {
      expirationDate: d.licenseExpirationDate || '',
      intervalDays: d.intervalDays ?? 365,
      reminderDaysBefore: d.reminderDaysBefore ?? 30,
      autoRenew: d.autoRenew || false
    });
    setMedicalConfig(d.medicalCheckupConfig || {
      expirationDate: d.medicalCheckupExpirationDate || '',
      intervalDays: d.intervalDays ?? 365,
      reminderDaysBefore: d.reminderDaysBefore ?? 30,
      autoRenew: d.autoRenew || false
    });
    setCardConfig(d.professionalCardConfig || {
      expirationDate: d.professionalCardExpirationDate || '',
      intervalDays: d.intervalDays ?? 365,
      reminderDaysBefore: d.reminderDaysBefore ?? 30,
      autoRenew: d.autoRenew || false
    });
    setAdrConfig(d.adrTrainingConfig || {
      expirationDate: d.adrTrainingExpirationDate || '',
      intervalDays: d.intervalDays ?? 365,
      reminderDaysBefore: d.reminderDaysBefore ?? 30,
      autoRenew: d.autoRenew || false
    });

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
        licenseConfig,
        medicalCheckupConfig: medicalConfig,
        professionalCardConfig: cardConfig,
        adrTrainingConfig: adrConfig,
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

  const renderDocRow = (title: string, cfg?: DocumentConfig, fallbackDate?: string) => {
    const dateStr = cfg?.expirationDate || fallbackDate;
    if (!dateStr) return null;
    const expDate = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    const reminderDays = cfg?.reminderDaysBefore ?? 30;

    let badgeColor = 'var(--accent-green)';
    let badgeText = `Valide (${diffDays} j)`;

    if (diffDays < 0) {
      badgeColor = 'var(--accent-red)';
      badgeText = `Expiré (${Math.abs(diffDays)} j)`;
    } else if (diffDays <= reminderDays) {
      badgeColor = 'var(--accent-warning)';
      badgeText = `Expire dans ${diffDays} j`;
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.78rem' }}>
        <span><strong>{title}:</strong> {formatDate(dateStr)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: badgeColor, fontWeight: 700, fontSize: '0.72rem' }}>{badgeText}</span>
          {cfg?.autoRenew && (
            <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.15rem 0.35rem' }} title={`Renouvellement auto tous les ${cfg.intervalDays || 365} jours`}>
              ⚡ Auto ({cfg.intervalDays || 365}d)
            </span>
          )}
        </div>
      </div>
    );
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
                <th style={{ width: '38%' }}>Dates d'Expiration & Statuts</th>
                <th style={{ width: '10%' }}>Statut</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(d => {
                const hasPhone = d.phone && d.phone.length > 2 && d.phone !== d.cin;
                const hasCin = d.cin && d.cin.length > 1;
                const hasLicense = d.licenseNumber && d.licenseNumber.length > 1;
                const hasExpirations = d.licenseConfig?.expirationDate || d.licenseExpirationDate || 
                                       d.medicalCheckupConfig?.expirationDate || d.medicalCheckupExpirationDate || 
                                       d.professionalCardConfig?.expirationDate || d.professionalCardExpirationDate || 
                                       d.adrTrainingConfig?.expirationDate || d.adrTrainingExpirationDate;

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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {renderDocRow('Permis', d.licenseConfig, d.licenseExpirationDate)}
                          {renderDocRow('Visite Méd.', d.medicalCheckupConfig, d.medicalCheckupExpirationDate)}
                          {renderDocRow('Carte Pro', d.professionalCardConfig, d.professionalCardExpirationDate)}
                          {renderDocRow('ADR', d.adrTrainingConfig, d.adrTrainingExpirationDate)}
                        </div>
                      ) : (
                        <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Aucune date définie</span>
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
          <div className="modal-content" style={{ width: '95vw', maxWidth: '920px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem' }}>
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

            <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Section 1: Informations Générales */}
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-cyan)', marginBottom: '0.75rem' }}>1. Informations Générales</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
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
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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
              </div>

              {/* Section 2: Dates d'expiration, Rappels & Renouvellement par document */}
              <div>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-green)', marginBottom: '0.75rem' }}>
                  2. Dates d'expiration & Alertes par document
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1rem' }}>
                  <DocConfigCard 
                    title="Permis de conduire" 
                    config={licenseConfig} 
                    onChange={setLicenseConfig} 
                    accentColor="var(--accent-cyan)"
                  />
                  <DocConfigCard 
                    title="Visite médicale" 
                    config={medicalConfig} 
                    onChange={setMedicalConfig} 
                    accentColor="var(--accent-green)"
                  />
                  <DocConfigCard 
                    title="Carte professionnelle" 
                    config={cardConfig} 
                    onChange={setCardConfig} 
                    accentColor="var(--accent-warning)"
                  />
                  <DocConfigCard 
                    title="Formation ADR" 
                    config={adrConfig} 
                    onChange={setAdrConfig} 
                    accentColor="var(--accent-purple, #a855f7)"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
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
