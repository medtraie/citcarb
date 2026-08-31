import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { AddRevisionDialog } from '../../components/revisions/AddRevisionDialog';
import { Revision, RevisionType, RevisionStatus } from '../../types';

export const RevisionsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    revisions, 
    vehicles, 
    fetchRevisions, 
    fetchVehicles, 
    deleteRevision, 
    completeRevision,
    loading 
  } = useDataStore();

  const [activeTab, setActiveTab] = useState<'list' | 'calendar' | 'analytics'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [revisionToEdit, setRevisionToEdit] = useState<Revision | null>(null);

  // Analytics Interactive Controls
  const [analyticsVehicleFilter, setAnalyticsVehicleFilter] = useState<string>('all');
  const [analyticsTypeFilter, setAnalyticsTypeFilter] = useState<string>('all');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<string>('all');

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date(2026, 7, 1)); // August 2026

  useEffect(() => {
    if (user) {
      fetchRevisions(user.ownerId);
      fetchVehicles(user.ownerId);
    }
  }, [user]);

  if (!user) return null;

  // Metric counts
  const totalCount = revisions.length;
  const dueSoonCount = revisions.filter(r => r.status === 'due_soon').length;
  const overdueCount = revisions.filter(r => r.status === 'overdue').length;

  const getTypeLabel = (t: RevisionType) => {
    switch (t) {
      case 'vidange': return 'Vidange Huile';
      case 'tachygraphe': return 'Tachygraphe';
      case 'visite_technique': return 'Visite technique';
      case 'assurance': return 'Assurance';
      case 'vignette': return 'Vignette';
      default: return 'Autre Révision';
    }
  };

  const getTypeBadgeStyle = (t: RevisionType) => {
    switch (t) {
      case 'vidange': return { bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' };
      case 'tachygraphe': return { bg: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', border: 'rgba(168, 85, 247, 0.3)' };
      case 'visite_technique': return { bg: 'rgba(236, 72, 153, 0.15)', color: '#F472B6', border: 'rgba(236, 72, 153, 0.3)' };
      case 'assurance': return { bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'vignette': return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: 'rgba(16, 185, 129, 0.3)' };
      default: return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94A3B8', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  const getStatusBadge = (s: RevisionStatus) => {
    if (s === 'overdue') {
      return (
        <span className="badge badge-danger" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
          En retard
        </span>
      );
    }
    if (s === 'due_soon') {
      return (
        <span className="badge badge-warning" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
          À faire
        </span>
      );
    }
    return (
      <span className="badge badge-success" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
        Conforme
      </span>
    );
  };

  const getVehicleLabel = (vId: string) => {
    const v = vehicles.find(veh => veh.id === vId);
    if (v) return `${v.brand} ${v.model} (${v.plateNumber})`;
    if (vehicles.length > 0) {
      const fallbackV = vehicles[0];
      return `${fallbackV.brand} ${fallbackV.model} (${fallbackV.plateNumber})`;
    }
    return 'HYUNDAI H100 (10543A73)';
  };

  const getVehicleKm = (vId: string) => {
    const v = vehicles.find(veh => veh.id === vId);
    if (v) return v.currentMileage;
    if (vehicles.length > 0) return vehicles[0].currentMileage;
    return 0;
  };

  // Filter revisions for List
  const filteredRevisions = revisions.filter(r => {
    const vehicleName = getVehicleLabel(r.vehicleId).toLowerCase();
    const matchesSearch = vehicleName.includes(searchTerm.toLowerCase()) || (r.provider || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Analytics Filtered Revisions
  const analyticsRevisions = revisions.filter(r => {
    const matchesVeh = analyticsVehicleFilter === 'all' || r.vehicleId === analyticsVehicleFilter;
    const matchesType = analyticsTypeFilter === 'all' || r.type === analyticsTypeFilter;
    return matchesVeh && matchesType;
  });

  // Analytics Math
  const analyticsTotalCost = analyticsRevisions.reduce((sum, r) => sum + (r.cost || 0), 0);
  const analyticsAvgCost = analyticsRevisions.length > 0 ? Math.round(analyticsTotalCost / analyticsRevisions.length) : 0;
  const analyticsOverdueCount = analyticsRevisions.filter(r => r.status === 'overdue').length;
  const analyticsDueSoonCount = analyticsRevisions.filter(r => r.status === 'due_soon').length;
  const analyticsUpToDateCount = analyticsRevisions.filter(r => r.status === 'up_to_date').length;
  const analyticsComplianceRate = analyticsRevisions.length > 0 ? Math.round((analyticsUpToDateCount / analyticsRevisions.length) * 100) : 100;

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const prevMonth = () => setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
  const resetToToday = () => setCalendarDate(new Date(2026, 7, 1));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Gestion des Révisions
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
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                border: '1px solid var(--border-color)',
                cursor: 'pointer'
              }}
            >
              🔄 Total: {totalCount}
            </button>

            <button 
              onClick={() => setStatusFilter(statusFilter === 'due_soon' ? 'all' : 'due_soon')}
              style={{
                backgroundColor: statusFilter === 'due_soon' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.15)',
                color: 'var(--accent-orange)',
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: '1px solid rgba(245, 158, 11, 0.4)',
                cursor: 'pointer'
              }}
            >
              À faire: {dueSoonCount}
            </button>

            <button 
              onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
              style={{
                backgroundColor: statusFilter === 'overdue' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.15)',
                color: 'var(--accent-red)',
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: '1px solid rgba(239, 68, 68, 0.4)',
                cursor: 'pointer'
              }}
            >
              En retard: {overdueCount}
            </button>
          </div>
        </div>

        {user.role === 'admin' && (
          <button 
            className="btn btn-primary"
            onClick={() => {
              setRevisionToEdit(null);
              setIsAddModalOpen(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--accent-cyan)', color: '#fff' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Nouvelle révision
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
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
          📋 Liste
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'calendar' ? 'var(--bg-input)' : 'transparent',
            color: activeTab === 'calendar' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'calendar' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          📅 Calendrier
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
          📈 Analytique
        </button>
      </div>

      {/* Tab 1: LIST VIEW */}
      {activeTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Filters Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto',
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
                placeholder="🔍 Rechercher par véhicule ou garage..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '1rem', width: '100%' }}
              />
            </div>

            <select 
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: '170px' }}
            >
              <option value="all">Tous les statuts</option>
              <option value="due_soon">À faire (Urgent)</option>
              <option value="overdue">En retard</option>
              <option value="up_to_date">Conforme (À jour)</option>
            </select>

            <select 
              className="form-control"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ minWidth: '190px' }}
            >
              <option value="all">Tous les types</option>
              <option value="vidange">Vidange Huile</option>
              <option value="tachygraphe">Tachygraphe</option>
              <option value="visite_technique">Visite technique</option>
              <option value="assurance">Assurance</option>
              <option value="vignette">Vignette</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement...</div>
          ) : filteredRevisions.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Aucune révision trouvée. Cliquez sur "+ Nouvelle révision" pour en ajouter une.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Véhicule</th>
                    <th>Type</th>
                    <th>Mode</th>
                    <th>Dernier Entretien</th>
                    <th>Actuel</th>
                    <th>Prochaine échéance</th>
                    <th>Écart / Rappel</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRevisions.map(r => {
                    const badge = getTypeBadgeStyle(r.type);
                    const vehKm = getVehicleKm(r.vehicleId);

                    let ecartStr = '-';
                    if (r.mode === 'days' && r.nextDueDate) {
                      const due = new Date(r.nextDueDate).getTime();
                      const now = new Date().getTime();
                      const days = Math.ceil((due - now) / (1000 * 3600 * 24));
                      ecartStr = days < 0 ? `${Math.abs(days)}j de retard` : `${days}j restants`;
                    } else if (r.mode === 'mileage' && r.nextDueKm) {
                      const diffKm = r.nextDueKm - vehKm;
                      ecartStr = diffKm < 0 ? `${Math.abs(diffKm)} km dépassé` : `${diffKm} km restants`;
                    }

                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                          {getVehicleLabel(r.vehicleId)}
                        </td>
                        <td>
                          <span style={{
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            {getTypeLabel(r.type)}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {r.mode === 'days' ? 'Par jours' : 'Par kilométrage'}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {r.mode === 'days' ? (r.lastDate || '-') : `${(r.lastKm || 0).toLocaleString()} km`}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {r.mode === 'days' ? 'Aujourd\'hui' : `${vehKm.toLocaleString()} km`}
                        </td>
                        <td style={{ fontWeight: 700, color: r.status === 'overdue' ? '#EF4444' : r.status === 'due_soon' ? '#F59E0B' : 'var(--text-primary)' }}>
                          {r.mode === 'days' ? (r.nextDueDate || '-') : `${(r.nextDueKm || 0).toLocaleString()} km`}
                        </td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 600, color: r.status === 'overdue' ? '#EF4444' : r.status === 'due_soon' ? '#F59E0B' : 'var(--accent-green)' }}>
                          {ecartStr}
                        </td>
                        <td>{getStatusBadge(r.status)}</td>
                        <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button 
                            className="btn btn-success" 
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                            title="Marquer comme effectué"
                            onClick={() => {
                              if (window.confirm('Marquer cette révision comme effectuée ? La prochaine date/compteur sera automatiquement calculée.')) {
                                completeRevision(r.id, user.ownerId);
                              }
                            }}
                          >
                            ✓ Valider
                          </button>

                          {user.role === 'admin' && (
                            <>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                onClick={() => {
                                  setRevisionToEdit(r);
                                  setIsAddModalOpen(true);
                                }}
                              >
                                Modifier
                              </button>

                              <button 
                                className="btn btn-danger" 
                                style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--accent-red)', color: 'var(--accent-red)' }}
                                onClick={() => {
                                  if (window.confirm('Êtes-vous sûr de vouloir supprimer cette révision ?')) {
                                    deleteRevision(r.id, user.ownerId);
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

      {/* Tab 2: CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Calendar Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button 
                onClick={prevMonth}
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                &lt;
              </button>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', minWidth: '160px', textAlign: 'center' }}>
                {monthNames[currentMonth]} {currentYear}
              </h3>
              <button 
                onClick={nextMonth}
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                &gt;
              </button>
            </div>

            <button 
              onClick={resetToToday}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              Aujourd'hui
            </button>
          </div>

          {/* Calendar Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            backgroundColor: 'var(--border-color)',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--border-color)'
          }}>
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day, idx) => (
              <div key={idx} style={{
                backgroundColor: 'var(--bg-input)',
                padding: '0.75rem',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                {day}
              </div>
            ))}

            {Array.from({ length: firstDay }).map((_, idx) => (
              <div key={`empty-${idx}`} style={{ backgroundColor: 'var(--bg-card)', minHeight: '100px', opacity: 0.3 }} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayRevisions = revisions.filter(r => r.nextDueDate === dateStr);
              const isToday = dayNum === 12 && currentMonth === 7 && currentYear === 2026;

              return (
                <div key={`day-${dayNum}`} style={{
                  backgroundColor: isToday ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-card)',
                  border: isToday ? '1px solid var(--accent-cyan)' : 'none',
                  minHeight: '110px',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontWeight: isToday ? 800 : 600,
                      fontSize: '0.85rem',
                      color: isToday ? 'var(--accent-cyan)' : 'var(--text-primary)',
                      backgroundColor: isToday ? 'var(--accent-cyan-glow)' : 'transparent',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {dayNum}
                    </span>
                  </div>

                  {dayRevisions.map(rev => {
                    const badge = getTypeBadgeStyle(rev.type);
                    return (
                      <div 
                        key={rev.id}
                        onClick={() => {
                          setRevisionToEdit(rev);
                          setIsAddModalOpen(true);
                        }}
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          borderRadius: '6px',
                          padding: '0.25rem 0.4rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={`${getTypeLabel(rev.type)} - ${getVehicleLabel(rev.vehicleId)}`}
                      >
                        • {getTypeLabel(rev.type)} ({vehicles.find(v => v.id === rev.vehicleId)?.plateNumber})
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Tab 3: INTERACTIVE ANALYTICS VIEW */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Interactive Filters Bar */}
          <div className="card" style={{
            padding: '1rem 1.25rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: '4px solid var(--accent-cyan)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                Filtres Analytiques Télémétriques
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Filtrer par Véhicule:</span>
                <select 
                  className="form-control" 
                  value={analyticsVehicleFilter}
                  onChange={(e) => setAnalyticsVehicleFilter(e.target.value)}
                  style={{ minWidth: '200px' }}
                >
                  <option value="all">🚗 Tous les véhicules ({vehicles.length})</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.plateNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Période:</span>
                <select 
                  className="form-control" 
                  value={analyticsPeriod}
                  onChange={(e) => setAnalyticsPeriod(e.target.value)}
                  style={{ minWidth: '150px' }}
                >
                  <option value="all">📅 Tout l'historique</option>
                  <option value="30days">30 derniers jours</option>
                  <option value="6months">6 derniers mois</option>
                  <option value="year2026">Année 2026</option>
                </select>
              </div>
            </div>
          </div>

          {/* Interactive Category Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Filtrer par catégorie:</span>
            <button
              onClick={() => setAnalyticsTypeFilter('all')}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: analyticsTypeFilter === 'all' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                backgroundColor: analyticsTypeFilter === 'all' ? 'var(--accent-cyan-glow)' : 'var(--bg-card)',
                color: analyticsTypeFilter === 'all' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Toutes les catégories
            </button>
            {(['vidange', 'visite_technique', 'tachygraphe', 'assurance', 'vignette', 'autre'] as RevisionType[]).map(t => {
              const style = getTypeBadgeStyle(t);
              const isSelected = analyticsTypeFilter === t;
              return (
                <button
                  key={t}
                  onClick={() => setAnalyticsTypeFilter(isSelected ? 'all' : t)}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: `1px solid ${isSelected ? style.color : style.border}`,
                    backgroundColor: isSelected ? style.bg : 'var(--bg-card)',
                    color: isSelected ? style.color : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {getTypeLabel(t)}
                </button>
              );
            })}
          </div>

          {/* Key KPI Widgets Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-cyan)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>CUMUL DES COÛTS (MAD)</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
                {analyticsTotalCost.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--accent-cyan)' }}>MAD</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                Sur {analyticsRevisions.length} révisions analysées
              </span>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3B82F6' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>COÛT MOYEN / RÉVISION</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3B82F6', marginTop: '0.4rem' }}>
                {analyticsAvgCost.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>MAD</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                Moyenne globale par véhicule
              </span>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10B981' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SCORE DE CONFORMITÉ</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10B981', marginTop: '0.4rem' }}>
                {analyticsComplianceRate}%
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
                <div style={{ width: `${analyticsComplianceRate}%`, height: '100%', backgroundColor: '#10B981', borderRadius: '3px' }} />
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #EF4444' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>URGENCES & RETARDS</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#EF4444', marginTop: '0.4rem' }}>
                {analyticsOverdueCount + analyticsDueSoonCount} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>action(s)</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '0.25rem', display: 'block', fontWeight: 600 }}>
                {analyticsOverdueCount} en retard | {analyticsDueSoonCount} à faire
              </span>
            </div>

          </div>

          {/* Interactive Cost Distribution Chart & Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
            
            {/* Chart 1: Cost breakdown by category */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5"><rect x="3" y="12" width="4" height="9"></rect><rect x="10" y="7" width="4" height="14"></rect><rect x="17" y="3" width="4" height="18"></rect></svg>
                Répartition Financière par Type de Révision
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {(['vidange', 'assurance', 'visite_technique', 'vignette', 'tachygraphe', 'autre'] as RevisionType[]).map(t => {
                  const subCost = analyticsRevisions.filter(r => r.type === t).reduce((sum, r) => sum + (r.cost || 0), 0);
                  const count = analyticsRevisions.filter(r => r.type === t).length;
                  const percent = analyticsTotalCost > 0 ? Math.round((subCost / analyticsTotalCost) * 100) : 0;
                  const style = getTypeBadgeStyle(t);

                  return (
                    <div 
                      key={t}
                      onClick={() => setAnalyticsTypeFilter(analyticsTypeFilter === t ? 'all' : t)}
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.4rem',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        backgroundColor: analyticsTypeFilter === t ? 'rgba(255,255,255,0.05)' : 'transparent',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 700, color: style.color, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: style.color, display: 'inline-block' }} />
                          {getTypeLabel(t)} <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>({count} révision{count > 1 ? 's' : ''})</span>
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
                          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: `0 0 10px ${style.color}40`
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Cost Breakdown per Vehicle */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                Dépenses par Véhicule
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {vehicles.map(v => {
                  const vehRevisions = analyticsRevisions.filter(r => r.vehicleId === v.id);
                  const vehCost = vehRevisions.reduce((sum, r) => sum + (r.cost || 0), 0);
                  const vehPercent = analyticsTotalCost > 0 ? Math.round((vehCost / analyticsTotalCost) * 100) : 0;

                  return (
                    <div 
                      key={v.id}
                      onClick={() => setAnalyticsVehicleFilter(analyticsVehicleFilter === v.id ? 'all' : v.id)}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '10px',
                        backgroundColor: analyticsVehicleFilter === v.id ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-input)',
                        border: analyticsVehicleFilter === v.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                          {v.brand} {v.model} ({v.plateNumber})
                        </span>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                          {vehCost.toLocaleString()} MAD
                        </span>
                      </div>
                      
                      <div style={{ height: '6px', backgroundColor: 'var(--bg-card)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${vehPercent}%`, height: '100%', backgroundColor: 'var(--accent-cyan)', borderRadius: '3px' }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                        <span>{vehRevisions.length} révision(s) enregistrée(s)</span>
                        <span>{vehPercent}% du budget</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Add / Edit Revision Dialog */}
      <AddRevisionDialog 
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setRevisionToEdit(null);
        }}
        revisionToEdit={revisionToEdit}
      />

    </div>
  );
};
