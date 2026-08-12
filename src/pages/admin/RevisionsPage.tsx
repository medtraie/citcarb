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
    return v ? `${v.brand} ${v.model} (${v.plateNumber})` : 'Véhicule inconnu';
  };

  const getVehicleKm = (vId: string) => {
    const v = vehicles.find(veh => veh.id === vId);
    return v ? v.currentMileage : 0;
  };

  // Filter revisions
  const filteredRevisions = revisions.filter(r => {
    const vehicleName = getVehicleLabel(r.vehicleId).toLowerCase();
    const matchesSearch = vehicleName.includes(searchTerm.toLowerCase()) || (r.provider || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Monday start
  };

  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth(); // 0-11
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const prevMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  };
  const nextMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
  };
  const resetToToday = () => {
    setCalendarDate(new Date(2026, 7, 1));
  };

  // Calculate total costs for analytics
  const totalCost = revisions.reduce((sum, r) => sum + (r.cost || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Gestion des Révisions
          </h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-secondary)',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              🔄 Total: {totalCount}
            </span>

            <span style={{
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              color: '#F59E0B',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              border: '1px solid rgba(245, 158, 11, 0.3)'
            }}>
              À faire: {dueSoonCount}
            </span>

            <span style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#EF4444',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              En retard: {overdueCount}
            </span>
          </div>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => {
            setRevisionToEdit(null);
            setIsAddModalOpen(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--accent-cyan)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          + Nouvelle révision
        </button>
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
            backgroundColor: activeTab === 'list' ? '#1E293B' : 'transparent',
            color: activeTab === 'list' ? '#fff' : 'var(--text-secondary)',
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
            backgroundColor: activeTab === 'calendar' ? '#1E293B' : 'transparent',
            color: activeTab === 'calendar' ? '#fff' : 'var(--text-secondary)',
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
            backgroundColor: activeTab === 'analytics' ? '#1E293B' : 'transparent',
            color: activeTab === 'analytics' ? '#fff' : 'var(--text-secondary)',
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
                style={{ paddingLeft: '1rem', height: '40px' }}
              />
            </div>

            <select 
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '180px', height: '40px' }}
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
              style={{ width: '200px', height: '40px' }}
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', minWidth: '160px', textAlign: 'center' }}>
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
            {/* Days of week header */}
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day, idx) => (
              <div key={idx} style={{
                backgroundColor: '#0F172A',
                padding: '0.75rem',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                {day}
              </div>
            ))}

            {/* Empty slots for first week offset */}
            {Array.from({ length: firstDay }).map((_, idx) => (
              <div key={`empty-${idx}`} style={{ backgroundColor: 'var(--bg-card)', minHeight: '100px', opacity: 0.3 }} />
            ))}

            {/* Calendar Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              
              // Find revisions due on this day
              const dayRevisions = revisions.filter(r => r.nextDueDate === dateStr);
              const isToday = dayNum === 12 && currentMonth === 7 && currentYear === 2026; // Current local time in demo

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
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontWeight: isToday ? 800 : 600,
                      fontSize: '0.85rem',
                      color: isToday ? 'var(--accent-cyan)' : '#fff',
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

                  {/* Day items */}
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

      {/* Tab 3: ANALYTICS VIEW */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-cyan)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Budget Total Révisions</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}>
                {totalCost.toLocaleString()} MAD
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10B981' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Taux de Conformité</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981', marginTop: '0.5rem' }}>
                {totalCount > 0 ? Math.round(((totalCount - overdueCount) / totalCount) * 100) : 100}%
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #F59E0B' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Entretiens Imminents (15j / 1000km)</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F59E0B', marginTop: '0.5rem' }}>
                {dueSoonCount} révisions
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #EF4444' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Révisions en Retard</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#EF4444', marginTop: '0.5rem' }}>
                {overdueCount} révisions
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem' }}>
              Répartition des Coûts par Type de Révision
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(['vidange', 'assurance', 'visite_technique', 'vignette', 'tachygraphe', 'autre'] as RevisionType[]).map(t => {
                const subCost = revisions.filter(r => r.type === t).reduce((sum, r) => sum + (r.cost || 0), 0);
                const percent = totalCost > 0 ? Math.round((subCost / totalCost) * 100) : 0;
                const badge = getTypeBadgeStyle(t);

                return (
                  <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, color: badge.color }}>{getTypeLabel(t)}</span>
                      <span style={{ fontWeight: 700, color: '#fff' }}>{subCost.toLocaleString()} MAD ({percent}%)</span>
                    </div>
                    <div style={{ height: '8px', width: '100%', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${percent}%`, backgroundColor: badge.color, borderRadius: '4px', transition: 'width 0.5s ease-in-out' }} />
                    </div>
                  </div>
                );
              })}
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
