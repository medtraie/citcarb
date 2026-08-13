import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

export const ReportsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    fuelFills, 
    barrelMovements, 
    repairs,
    vehicles, 
    drivers, 
    barrels,
    fetchFuelFills, 
    fetchBarrelMovements,
    fetchRepairs,
    fetchVehicles,
    fetchDrivers,
    fetchBarrels
  } = useDataStore();

  const reportRef = useRef<HTMLDivElement>(null);

  // Filters
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFuelFills(user.ownerId);
      fetchBarrelMovements(user.ownerId);
      fetchRepairs(user.ownerId);
      fetchVehicles(user.ownerId);
      fetchDrivers(user.ownerId);
      fetchBarrels(user.ownerId);
    }
  }, [user]);

  if (!user) return null;

  // Filter lists based on selected dates
  const filteredFills = fuelFills.filter(f => {
    const dateStr = f.createdAt.split('T')[0];
    return dateStr >= startDate && dateStr <= endDate;
  });

  const filteredMovements = barrelMovements.filter(m => {
    const dateStr = m.createdAt.split('T')[0];
    return dateStr >= startDate && dateStr <= endDate;
  });

  const filteredRepairs = repairs.filter(r => {
    const dateStr = (r.startDate || r.createdAt).split('T')[0];
    return dateStr >= startDate && dateStr <= endDate;
  });

  // Calculate statistics
  const totalGasoil = filteredFills.reduce((sum, f) => sum + f.quantity, 0);
  const totalAnomalies = filteredFills.filter(f => f.anomalyDetected).length;

  const totalHydraulique = filteredMovements
    .filter(m => {
      const b = barrels.find(bar => bar.id === m.barrelId);
      return m.type === 'consume' && b?.type === 'hydraulique';
    })
    .reduce((sum, m) => sum + m.quantity, 0);

  const totalMotorOil = filteredMovements
    .filter(m => {
      const b = barrels.find(bar => bar.id === m.barrelId);
      return m.type === 'consume' && b?.type === 'motor_oil';
    })
    .reduce((sum, m) => sum + m.quantity, 0);

  const totalRepairCost = filteredRepairs.reduce((sum, r) => sum + (r.cost || 0), 0);

  const getVehicleLabel = (id: string) => {
    const v = vehicles.find(veh => veh.id === id);
    if (v) return `${v.brand} ${v.model} (${v.plateNumber})`;
    if (vehicles.length > 0) return `${vehicles[0].brand} ${vehicles[0].model} (${vehicles[0].plateNumber})`;
    return 'Véhicule Flotte';
  };

  const getDriverLabel = (id: string) => {
    const d = drivers.find(drv => drv.id === id);
    return d ? d.fullName : 'Chauffeur Non Spécifié';
  };

  const getBarrelName = (id: string) => {
    const b = barrels.find(bar => bar.id === id);
    return b ? b.name : 'Baril Huile';
  };

  const getBarrelTypeLabel = (id: string) => {
    const b = barrels.find(bar => bar.id === id);
    return b ? (b.type === 'hydraulique' ? 'Hydraulique' : 'Huile Moteur') : 'Huile / Fluide';
  };

  // Modern High-Contrast White Background PDF Export
  const exportPDF = async () => {
    if (!reportRef.current) return;
    setExportingPDF(true);

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width mm
      const pageHeight = 297; // A4 height mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Rapport_Executif_FuelFlow_${startDate}_au_${endDate}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setExportingPDF(false);
    }
  };

  // Excel Export with 3 sheets: Distributions, Huiles & Réparations
  const exportExcel = () => {
    // 1. Distributions Sheet Data
    const distData = filteredFills.map(f => ({
      'Date': new Date(f.createdAt).toLocaleString('fr-FR'),
      'Véhicule': getVehicleLabel(f.vehicleId),
      'Chauffeur': getDriverLabel(f.driverId),
      'Quantité (L)': f.quantity,
      'Kilométrage (km)': f.mileage,
      'Distance Parcourue (km)': f.distanceTraveled || '-',
      'Consommation (L/100km)': f.calculatedConsumption ? f.calculatedConsumption.toFixed(2) : '-',
      'Anomalie': f.anomalyDetected ? `Oui (${f.anomalyType})` : 'Non',
      'Observations': f.notes || ''
    }));

    // 2. Huiles Sheet Data
    const huilesData = filteredMovements.map(m => ({
      'Date': new Date(m.createdAt).toLocaleString('fr-FR'),
      'Nom du Baril': getBarrelName(m.barrelId),
      'Type d\'huile': getBarrelTypeLabel(m.barrelId),
      'Mouvement': m.type === 'refill' ? 'Remplissage' : 'Consommation',
      'Quantité (L)': m.quantity,
      'Véhicule Bénéficiaire': getVehicleLabel(m.vehicleId || ''),
      'Opérateur': m.performedBy || 'Agent',
      'Remarques': m.notes || ''
    }));

    // 3. Réparations Sheet Data
    const repairsData = filteredRepairs.map(r => ({
      'Date Début': r.startDate,
      'Date Fin': r.endDate || '-',
      'Véhicule': getVehicleLabel(r.vehicleId),
      'Type de Panne': r.type,
      'Priorité': r.priority === 'high' ? 'Urgent' : r.priority === 'medium' ? 'Moyenne' : 'Faible',
      'Statut': r.status === 'completed' ? 'Terminé' : r.status === 'in_progress' ? 'En cours' : 'En attente',
      'Coût (MAD)': r.cost || 0,
      'Prestataire / Garage': r.provider || '-',
      'Description': r.description,
      'Pièces Remplacées': r.partsReplaced || '-'
    }));

    const wb = XLSX.utils.book_new();

    const wsDist = XLSX.utils.json_to_sheet(distData);
    XLSX.utils.book_append_sheet(wb, wsDist, "Distributions Gasoil");

    const wsHuiles = XLSX.utils.json_to_sheet(huilesData);
    XLSX.utils.book_append_sheet(wb, wsHuiles, "Huiles & Fluides");

    const wsRepairs = XLSX.utils.json_to_sheet(repairsData);
    XLSX.utils.book_append_sheet(wb, wsRepairs, "Réparations & Pannes");

    XLSX.writeFile(wb, `Rapport_Complet_${startDate}_au_${endDate}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Date Filters Controls Card */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          Paramètres du Rapport Exécutif
        </h2>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Date de début</label>
            <input 
              type="date" 
              className="form-control" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Date de fin</label>
            <input 
              type="date" 
              className="form-control" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
            <button 
              className="btn btn-secondary"
              onClick={exportPDF}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)', fontWeight: 700 }}
              disabled={exportingPDF}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              {exportingPDF ? 'Génération PDF ultra-net...' : '📄 Exporter PDF (Fond Blanc Crisp)'}
            </button>

            <button 
              className="btn btn-primary"
              onClick={exportExcel}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--accent-green)', color: '#fff', fontWeight: 700 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              📊 Exporter Excel (3 Feuilles)
            </button>
          </div>
        </div>
      </div>

      {/* Printable Area - Modern 2026 Executive White Document */}
      <div 
        ref={reportRef} 
        style={{
          padding: '3rem',
          backgroundColor: '#ffffff',
          color: '#0F172A',
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2.25rem',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}
      >
        {/* Document Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '3px solid #0F172A', 
          paddingBottom: '1.5rem' 
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#0F172A',
                color: '#38BDF8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.4rem'
              }}>
                FF
              </div>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, color: '#0F172A', letterSpacing: '-0.5px' }}>
                  RAPPORT EXÉCUTIF DE GESTION
                </h1>
                <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0, fontWeight: 600 }}>
                  FuelFlow Fleet & Maintenance Intelligence 2026
                </p>
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{
              backgroundColor: '#F1F5F9',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Période du Rapport</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                {new Date(startDate).toLocaleDateString('fr-FR')} → {new Date(endDate).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        </div>

        {/* High-Contrast Executive KPI Widgets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
          
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', borderLeft: '4px solid #0284C7' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Gasoil Distribué</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0284C7', marginTop: '0.25rem' }}>
              {totalGasoil.toLocaleString()} <span style={{ fontSize: '1rem', color: '#475569' }}>L</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem', display: 'block' }}>Sur {filteredFills.length} plein(s)</span>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', borderLeft: '4px solid #D97706' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Huiles & Fluides</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#D97706', marginTop: '0.25rem' }}>
              {(totalHydraulique + totalMotorOil).toLocaleString()} <span style={{ fontSize: '1rem', color: '#475569' }}>L</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem', display: 'block' }}>Hydraulique & Moteur</span>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', borderLeft: '4px solid #DC2626' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Coût Réparations</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#DC2626', marginTop: '0.25rem' }}>
              {totalRepairCost.toLocaleString()} <span style={{ fontSize: '1rem', color: '#475569' }}>MAD</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem', display: 'block' }}>Sur {filteredRepairs.length} intervention(s)</span>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', borderLeft: totalAnomalies > 0 ? '4px solid #DC2626' : '4px solid #16A34A' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Anomalies Clic</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: totalAnomalies > 0 ? '#DC2626' : '#16A34A', marginTop: '0.25rem' }}>
              {totalAnomalies} <span style={{ fontSize: '1rem', color: '#475569' }}>alerte(s)</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: totalAnomalies > 0 ? '#DC2626' : '#16A34A', marginTop: '0.2rem', display: 'block', fontWeight: 700 }}>
              {totalAnomalies > 0 ? 'Surconsommation détectée' : 'Conformité 100%'}
            </span>
          </div>

        </div>

        {/* Section 1: Gasoil Distributions Table */}
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem', borderBottom: '2px solid #E2E8F0', paddingBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⛽ 1. Distributions de Gasoil ({filteredFills.length})</span>
            <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Total: {totalGasoil.toLocaleString()} L</span>
          </h2>

          {filteredFills.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#64748B', fontStyle: 'italic' }}>Aucun plein enregistrer sur cette période.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: '#0F172A', fontWeight: 800 }}>Date & Heure</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: '#0F172A', fontWeight: 800 }}>Véhicule</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: '#0F172A', fontWeight: 800 }}>Chauffeur</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right', color: '#0F172A', fontWeight: 800 }}>Quantité</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right', color: '#0F172A', fontWeight: 800 }}>Kilométrage</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right', color: '#0F172A', fontWeight: 800 }}>Consommation</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', color: '#0F172A', fontWeight: 800 }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredFills.map((f, idx) => (
                  <tr key={f.id} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '0.6rem 0.8rem', color: '#334155', fontWeight: 600 }}>{new Date(f.createdAt).toLocaleString('fr-FR')}</td>
                    <td style={{ padding: '0.6rem 0.8rem', color: '#0F172A', fontWeight: 800 }}>{getVehicleLabel(f.vehicleId)}</td>
                    <td style={{ padding: '0.6rem 0.8rem', color: '#334155' }}>{getDriverLabel(f.driverId)}</td>
                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: 900, color: '#0284C7' }}>{f.quantity} L</td>
                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', color: '#334155' }}>{f.mileage.toLocaleString()} km</td>
                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                      {f.calculatedConsumption ? `${f.calculatedConsumption.toFixed(1)} L/100` : '-'}
                    </td>
                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                      {f.anomalyDetected ? (
                        <span style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, border: '1px solid #FCA5A5' }}>
                          ⚠️ ANOMALIE
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, border: '1px solid #86EFAC' }}>
                          ✓ CONFORME
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 2: Repairs & Maintenance Table */}
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem', borderBottom: '2px solid #E2E8F0', paddingBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🔧 2. Interventions de Réparation & Pannes ({filteredRepairs.length})</span>
            <span style={{ fontSize: '0.85rem', color: '#DC2626', fontWeight: 800 }}>Coût Total: {totalRepairCost.toLocaleString()} MAD</span>
          </h2>

          {filteredRepairs.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#64748B', fontStyle: 'italic' }}>Aucune réparation enregistrée sur cette période.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: '#0F172A', fontWeight: 800 }}>Date Début</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: '#0F172A', fontWeight: 800 }}>Véhicule</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: '#0F172A', fontWeight: 800 }}>Type</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: '#0F172A', fontWeight: 800 }}>Description de la Panne</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: '#0F172A', fontWeight: 800 }}>Prestataire</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right', color: '#0F172A', fontWeight: 800 }}>Coût (MAD)</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', color: '#0F172A', fontWeight: 800 }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredRepairs.map((r, idx) => (
                  <tr key={r.id} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '0.6rem 0.8rem', color: '#334155', fontWeight: 600 }}>{r.startDate}</td>
                    <td style={{ padding: '0.6rem 0.8rem', color: '#0F172A', fontWeight: 800 }}>{getVehicleLabel(r.vehicleId)}</td>
                    <td style={{ padding: '0.6rem 0.8rem', color: '#475569', fontWeight: 700, textTransform: 'capitalize' }}>{r.type}</td>
                    <td style={{ padding: '0.6rem 0.8rem', color: '#0F172A', maxWidth: '250px' }}>
                      <div style={{ fontWeight: 600 }}>{r.description}</div>
                      {r.partsReplaced && <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Pièces: {r.partsReplaced}</div>}
                    </td>
                    <td style={{ padding: '0.6rem 0.8rem', color: '#334155' }}>{r.provider || '-'}</td>
                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: 900, color: '#DC2626' }}>
                      {(r.cost || 0).toLocaleString()} MAD
                    </td>
                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                      {r.status === 'completed' ? (
                        <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>✓ Terminé</span>
                      ) : r.status === 'in_progress' ? (
                        <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>🔧 En cours</span>
                      ) : (
                        <span style={{ backgroundColor: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>📥 En attente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 3: Oils & Fluids Table */}
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem', borderBottom: '2px solid #E2E8F0', paddingBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🛢️ 3. Mouvements d'Huiles & Fluides ({filteredMovements.length})</span>
            <span style={{ fontSize: '0.85rem', color: '#D97706', fontWeight: 700 }}>Total: {(totalHydraulique + totalMotorOil).toLocaleString()} L</span>
          </h2>

          {filteredMovements.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#64748B', fontStyle: 'italic' }}>Aucun mouvement d'huile enregistré sur cette période.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: '#0F172A', fontWeight: 800 }}>Date</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: '#0F172A', fontWeight: 800 }}>Baril</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: '#0F172A', fontWeight: 800 }}>Type</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: '#0F172A', fontWeight: 800 }}>Mouvement</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right', color: '#0F172A', fontWeight: 800 }}>Quantité</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: '#0F172A', fontWeight: 800 }}>Bénéficiaire</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((m, idx) => (
                  <tr key={m.id} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '0.6rem 0.8rem', color: '#334155', fontWeight: 600 }}>{new Date(m.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td style={{ padding: '0.6rem 0.8rem', color: '#0F172A', fontWeight: 800 }}>{getBarrelName(m.barrelId)}</td>
                    <td style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>{getBarrelTypeLabel(m.barrelId)}</td>
                    <td style={{ padding: '0.6rem 0.8rem', color: '#334155' }}>
                      {m.type === 'refill' ? 'Remplissage' : 'Consommation'}
                    </td>
                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: 900, color: m.type === 'refill' ? '#166534' : '#D97706' }}>
                      {m.type === 'refill' ? '+' : '-'}{m.quantity} L
                    </td>
                    <td style={{ padding: '0.6rem 0.8rem', color: '#0F172A', fontWeight: 700 }}>
                      {m.vehicleId ? getVehicleLabel(m.vehicleId) : 'Stock Général'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Signature */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderTop: '2px solid #E2E8F0',
          paddingTop: '1.5rem',
          marginTop: '1rem',
          fontSize: '0.8rem',
          color: '#64748B'
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: '#0F172A' }}>Généré automatiquement par FuelFlow Fleet Intelligence</p>
            <p style={{ margin: 0 }}>Document officiel certifié - Usage interne</p>
          </div>

          <div style={{ textAlign: 'center', border: '1px dashed #CBD5E1', padding: '0.75rem 2rem', borderRadius: '8px', backgroundColor: '#F8FAFC' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Cachet & Signature Gestionnaire</span>
            <div style={{ height: '35px' }}></div>
          </div>
        </div>

      </div>

    </div>
  );
};
