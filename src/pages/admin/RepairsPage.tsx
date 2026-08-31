import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { AddRepairDialog } from '../../components/repairs/AddRepairDialog';
import { Repair, RepairType, RepairPriority, RepairStatus } from '../../types';

export const RepairsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    repairs, 
    vehicles, 
    fetchRepairs, 
    fetchVehicles, 
    deleteRepair, 
    updateRepair,
    completeRepair,
    loading 
  } = useDataStore();

  const [activeTab, setActiveTab] = useState<'list' | 'kanban' | 'analytics'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [repairToEdit, setRepairToEdit] = useState<Repair | null>(null);

  // Analytics Filters
  const [analyticsVehicleFilter, setAnalyticsVehicleFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchRepairs(user.ownerId);
      fetchVehicles(user.ownerId);
    }
  }, [user]);

  if (!user) return null;

  // Metric counts
  const totalCount = repairs.length;
  const inProgressCount = repairs.filter(r => r.status === 'in_progress').length;
  const pendingCount = repairs.filter(r => r.status === 'pending').length;
  const completedCount = repairs.filter(r => r.status === 'completed').length;
  const totalCost = repairs.reduce((sum, r) => sum + (r.cost || 0), 0);

  const getTypeLabel = (t: RepairType) => {
    switch (t) {
      case 'mecanique': return 'Mécanique';
      case 'electrique': return 'Électrique';
      case 'freinage': return 'Freinage';
      case 'pneumatique': return 'Pneumatique';
      case 'hydraulique': return 'Hydraulique';
      case 'carrosserie': return 'Carrosserie';
      default: return 'Autre';
    }
  };

  const getTypeBadgeStyle = (t: RepairType) => {
    switch (t) {
      case 'mecanique': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' };
      case 'electrique': return { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' };
      case 'freinage': return { bg: 'rgba(236, 72, 153, 0.15)', color: '#F472B6', border: 'rgba(236, 72, 153, 0.3)' };
      case 'pneumatique': return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: 'rgba(16, 185, 129, 0.3)' };
      case 'hydraulique': return { bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' };
      case 'carrosserie': return { bg: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', border: 'rgba(168, 85, 247, 0.3)' };
      default: return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94A3B8', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  const getPriorityBadge = (p: RepairPriority) => {
    if (p === 'high') {
      return (
        <span className="badge badge-danger" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
          🚨 URGENT / Haute
        </span>
      );
    }
    if (p === 'medium') {
      return (
        <span className="badge badge-warning" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
          🟠 Moyenne
        </span>
      );
    }
    return (
      <span className="badge badge-success" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        🟢 Faible
      </span>
    );
  };

  const getStatusBadge = (s: RepairStatus) => {
    if (s === 'pending') {
      return (
        <span style={{ 
          backgroundColor: 'rgba(148, 163, 184, 0.15)', 
          color: '#CBD5E1', 
          border: '1px solid rgba(148, 163, 184, 0.3)', 
          padding: '0.35rem 0.75rem', 
          borderRadius: '20px', 
          fontSize: '0.75rem', 
          fontWeight: 600,
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}>
          📥 En attente
        </span>
      );
    }
    if (s === 'in_progress') {
      return (
        <span style={{ 
          backgroundColor: 'rgba(245, 158, 11, 0.2)', 
          color: '#F59E0B', 
          border: '1px solid rgba(245, 158, 11, 0.4)', 
          padding: '0.35rem 0.75rem', 
          borderRadius: '20px', 
          fontSize: '0.75rem', 
          fontWeight: 700,
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}>
          🔧 En cours
        </span>
      );
    }
    return (
      <span style={{ 
        backgroundColor: 'rgba(16, 185, 129, 0.2)', 
        color: '#10B981', 
        border: '1px solid rgba(16, 185, 129, 0.4)', 
        padding: '0.35rem 0.75rem', 
        borderRadius: '20px', 
        fontSize: '0.75rem', 
        fontWeight: 700,
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem'
      }}>
        ✅ Terminé
      </span>
    );
  };

  const getVehicleLabel = (vId: string) => {
    const v = vehicles.find(veh => veh.id === vId);
    if (v) return `${v.brand} ${v.model} (${v.plateNumber})`;
    if (vehicles.length > 0) return `${vehicles[0].brand} ${vehicles[0].model} (${vehicles[0].plateNumber})`;
    return 'HYUNDAI H100 (10543A73)';
  };

  // Filter repairs for List
  const filteredRepairs = repairs.filter(r => {
    const vehicleName = getVehicleLabel(r.vehicleId).toLowerCase();
    const matchesSearch = vehicleName.includes(searchTerm.toLowerCase()) || 
                          (r.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.provider || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || r.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesType && matchesPriority;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" strokeWidth="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
            Gestion des Réparations & Pannes
          </h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              onClick={() => setStatusFilter('all')}
              style={{
                backgroundColor: statusFilter === 'all' ? 'var(--bg-hover)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: '1px solid var(--border-color)',
                cursor: 'pointer'
              }}
            >
              🛠️ Total: {totalCount}
            </button>

            <button 
              onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
              style={{
                backgroundColor: statusFilter === 'in_progress' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.15)',
                color: 'var(--accent-orange)',
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: '1px solid rgba(245, 158, 11, 0.4)',
                cursor: 'pointer'
              }}
            >
              🔧 En cours: {inProgressCount}
            </button>

            <button 
              onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
              style={{
                backgroundColor: statusFilter === 'pending' ? 'var(--bg-hover)' : 'var(--bg-card)',
                color: 'var(--text-secondary)',
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: '1px solid var(--border-color)',
                cursor: 'pointer'
              }}
            >
              📥 En attente: {pendingCount}
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setRepairToEdit(null);
                setIsAddModalOpen(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--accent-orange)', color: '#fff' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              + Nouvelle Réparation
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        backgroundColor: 'var(--bg-card)',
        padding: '0.35rem',
        borderRadius: '12px',
        width: 'fit-content',
        border: '1px solid var(--border-color)'
      }}>
        <button
          onClick={() => setActiveTab('list')}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'list' ? 'var(--bg-input)' : 'transparent',
            color: activeTab === 'list' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'list' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          📋 Liste des Réparations
        </button>
        <button
          onClick={() => setActiveTab('kanban')}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'kanban' ? 'var(--bg-input)' : 'transparent',
            color: activeTab === 'kanban' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'kanban' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          📊 Tableau Kanban
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'analytics' ? 'var(--bg-input)' : 'transparent',
            color: activeTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'analytics' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          📈 Coûts & Analytique
        </button>
      </div>

      {/* Tab 1: LIST VIEW */}
      {activeTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Filters Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto auto',
            gap: '1rem',
            backgroundColor: 'var(--bg-card)',
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="form-control"
                placeholder="🔍 Rechercher par véhicule, description ou garage..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '1rem', width: '100%' }}
              />
            </div>

            <select 
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: '160px' }}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">📥 En attente</option>
              <option value="in_progress">🔧 En cours</option>
              <option value="completed">✅ Terminé</option>
            </select>

            <select 
              className="form-control"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{ minWidth: '160px' }}
            >
              <option value="all">Toutes priorités</option>
              <option value="high">🚨 Urgent / Haute</option>
              <option value="medium">🟠 Moyenne</option>
              <option value="low">🟢 Faible</option>
            </select>

            <select 
              className="form-control"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ minWidth: '170px' }}
            >
              <option value="all">Tous les types</option>
              <option value="mecanique">Mécanique</option>
              <option value="electrique">Électrique</option>
              <option value="freinage">Freinage</option>
              <option value="pneumatique">Pneumatique</option>
              <option value="hydraulique">Hydraulique</option>
              <option value="carrosserie">Carrosserie</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement...</div>
          ) : filteredRepairs.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Aucune réparation enregistrée. Cliquez sur "+ Nouvelle Réparation" pour commencer.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Véhicule</th>
                    <th>Type</th>
                    <th>Priorité</th>
                    <th>Description de la Panne</th>
                    <th>Prestataire</th>
                    <th>Coût (MAD)</th>
                    <th>Date Début</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRepairs.map(rep => {
                    const typeStyle = getTypeBadgeStyle(rep.type);

                    return (
                      <tr key={rep.id}>
                        <td style={{ fontWeight: 700, color: 'var(--accent-orange)' }}>
                          {getVehicleLabel(rep.vehicleId)}
                        </td>
                        <td>
                          <span style={{
                            backgroundColor: typeStyle.bg,
                            color: typeStyle.color,
                            border: `1px solid ${typeStyle.border}`,
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            {getTypeLabel(rep.type)}
                          </span>
                        </td>
                        <td>{getPriorityBadge(rep.priority)}</td>
                        <td style={{ maxWidth: '280px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                            {rep.description}
                          </div>
                          {rep.partsReplaced && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              🔩 Pièces: {rep.partsReplaced}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {rep.provider || '-'}
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                          {(rep.cost || 0).toLocaleString()} MAD
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {rep.startDate}
                        </td>
                        <td>{getStatusBadge(rep.status)}</td>
                        <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          {rep.status !== 'completed' && (
                            <button 
                              className="btn btn-success" 
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                              title="Marquer comme réparée"
                              onClick={() => {
                                if (window.confirm('Clôturer et marquer cette réparation comme terminée ?')) {
                                  completeRepair(rep.id, user.ownerId);
                                }
                              }}
                            >
                              ✓ Terminer
                            </button>
                          )}

                          {user.role === 'admin' && (
                            <>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                onClick={() => {
                                  setRepairToEdit(rep);
                                  setIsAddModalOpen(true);
                                }}
                              >
                                Modifier
                              </button>

                              <button 
                                className="btn btn-danger" 
                                style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--accent-red)', color: 'var(--accent-red)' }}
                                onClick={() => {
                                  if (window.confirm('Êtes-vous sûr de vouloir supprimer cette réparation ?')) {
                                    deleteRepair(rep.id, user.ownerId);
                                  }
                                }}
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* Tab 2: KANBAN BOARD */}
      {activeTab === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          
          {/* Column 1: Pending */}
          <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-input)', borderTop: '4px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                📥 En attente ({repairs.filter(r => r.status === 'pending').length})
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Signalées</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '300px' }}>
              {repairs.filter(r => r.status === 'pending').map(rep => (
                <div key={rep.id} style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-orange)' }}>
                      {getVehicleLabel(rep.vehicleId)}
                    </span>
                    {getPriorityBadge(rep.priority)}
                  </div>
                  
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>
                    {rep.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>💰 {rep.cost ? rep.cost.toLocaleString() + ' MAD' : 'Coût N/A'}</span>
                    <span>📅 {rep.startDate}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <button 
                      onClick={() => updateRepair({ ...rep, status: 'in_progress' })}
                      style={{ flex: 1, padding: '0.35rem', borderRadius: '6px', border: '1px solid #F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-orange)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      → Démarrer 🔧
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-input)', borderTop: '4px solid #F59E0B' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                🔧 En cours ({repairs.filter(r => r.status === 'in_progress').length})
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#F59E0B', fontWeight: 600 }}>Au garage</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '300px' }}>
              {repairs.filter(r => r.status === 'in_progress').map(rep => (
                <div key={rep.id} style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-orange)' }}>
                      {getVehicleLabel(rep.vehicleId)}
                    </span>
                    {getPriorityBadge(rep.priority)}
                  </div>
                  
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>
                    {rep.description}
                  </p>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    🏢 Garage: {rep.provider || 'Non spécifié'}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>💰 {rep.cost ? rep.cost.toLocaleString() + ' MAD' : 'N/A'}</span>
                    <span>📅 Début: {rep.startDate}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <button 
                      onClick={() => completeRepair(rep.id, user.ownerId)}
                      style={{ flex: 1, padding: '0.35rem', borderRadius: '6px', border: '1px solid #10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      ✓ Clôturer Réparation
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-input)', borderTop: '4px solid #10B981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                ✅ Terminées ({repairs.filter(r => r.status === 'completed').length})
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>Rétablies</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '300px' }}>
              {repairs.filter(r => r.status === 'completed').map(rep => (
                <div key={rep.id} style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  opacity: 0.9
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-orange)' }}>
                      {getVehicleLabel(rep.vehicleId)}
                    </span>
                    {getStatusBadge(rep.status)}
                  </div>
                  
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {rep.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>💰 {rep.cost.toLocaleString()} MAD</span>
                    <span>📅 Fin: {rep.endDate || rep.startDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Tab 3: ANALYTICS VIEW */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Key KPI Widgets Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-orange)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>CUMUL DES RÉPARATIONS (MAD)</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
                {totalCost.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--accent-orange)' }}>MAD</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                Sur {repairs.length} réparations enregistrées
              </span>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #EF4444' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>PANNES URGENTES</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#EF4444', marginTop: '0.4rem' }}>
                {repairs.filter(r => r.priority === 'high').length} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>urgence(s)</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '0.25rem', display: 'block', fontWeight: 600 }}>
                Priorité absolue immobilisée
              </span>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #F59E0B' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>COÛT MOYEN / PANNE</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F59E0B', marginTop: '0.4rem' }}>
                {repairs.length > 0 ? Math.round(totalCost / repairs.length).toLocaleString() : 0} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>MAD</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                Dépense moyenne par intervention
              </span>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10B981' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TAUX DE RÉSOLUTION</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10B981', marginTop: '0.4rem' }}>
                {repairs.length > 0 ? Math.round((completedCount / repairs.length) * 100) : 100}%
              </div>
              <span style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '0.25rem', display: 'block', fontWeight: 600 }}>
                {completedCount} réparées sur {repairs.length}
              </span>
            </div>

          </div>

          {/* Breakdown Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
            
            {/* Chart 1: Breakdown by repair type */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" strokeWidth="2.5"><rect x="3" y="12" width="4" height="9"></rect><rect x="10" y="7" width="4" height="14"></rect><rect x="17" y="3" width="4" height="18"></rect></svg>
                Répartition des Dépenses par Type de Panne
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {(['mecanique', 'electrique', 'freinage', 'hydraulique', 'pneumatique', 'carrosserie', 'autre'] as RepairType[]).map(t => {
                  const subCost = repairs.filter(r => r.type === t).reduce((sum, r) => sum + (r.cost || 0), 0);
                  const count = repairs.filter(r => r.type === t).length;
                  const percent = totalCost > 0 ? Math.round((subCost / totalCost) * 100) : 0;
                  const style = getTypeBadgeStyle(t);

                  return (
                    <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 700, color: style.color, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: style.color, display: 'inline-block' }} />
                          {getTypeLabel(t)} <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>({count} intervention{count > 1 ? 's' : ''})</span>
                        </span>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                          {subCost.toLocaleString()} MAD <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>({percent}%)</span>
                        </span>
                      </div>
                      
                      <div style={{ height: '10px', width: '100%', backgroundColor: 'var(--bg-input)', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${percent}%`, 
                          backgroundColor: style.color, 
                          borderRadius: '5px',
                          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Repair cost per vehicle */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                Véhicules les Plus Réparés
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {vehicles.map(v => {
                  const vehRepairs = repairs.filter(r => r.vehicleId === v.id);
                  const vehCost = vehRepairs.reduce((sum, r) => sum + (r.cost || 0), 0);
                  const vehPercent = totalCost > 0 ? Math.round((vehCost / totalCost) * 100) : 0;

                  return (
                    <div 
                      key={v.id}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-orange)' }}>
                          {v.brand} {v.model} ({v.plateNumber})
                        </span>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                          {vehCost.toLocaleString()} MAD
                        </span>
                      </div>
                      
                      <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${vehPercent}%`, height: '100%', backgroundColor: 'var(--accent-orange)', borderRadius: '3px' }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                        <span>{vehRepairs.length} panne(s) réparée(s)</span>
                        <span>{vehPercent}% du budget réparation</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Add / Edit Repair Dialog */}
      <AddRepairDialog 
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setRepairToEdit(null);
        }}
        repairToEdit={repairToEdit}
      />

    </div>
  );
};
