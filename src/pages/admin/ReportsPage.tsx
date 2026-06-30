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
    vehicles, 
    drivers, 
    barrels,
    fetchFuelFills, 
    fetchBarrelMovements,
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

  const getVehicleLabel = (id: string) => {
    const v = vehicles.find(veh => veh.id === id);
    return v ? `${v.brand} ${v.model} (${v.plateNumber})` : 'Inconnu';
  };

  const getDriverLabel = (id: string) => {
    const d = drivers.find(drv => drv.id === id);
    return d ? d.fullName : 'Inconnu';
  };

  const getBarrelName = (id: string) => {
    const b = barrels.find(bar => bar.id === id);
    return b ? b.name : 'Inconnu';
  };

  const getBarrelTypeLabel = (id: string) => {
    const b = barrels.find(bar => bar.id === id);
    return b ? (b.type === 'hydraulique' ? 'Hydraulique' : 'Huile Moteur') : 'Inconnu';
  };

  // PDF Export
  const exportPDF = async () => {
    if (!reportRef.current) return;
    setExportingPDF(true);

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#0b0f19',
        logging: false,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 size width
      const pageHeight = 297;
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

      pdf.save(`Rapport_FuelFlow_${startDate}_to_${endDate}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setExportingPDF(false);
    }
  };

  // Excel Export with 2 sheets: Distributions & Huiles
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
      'Type de Mouvement': m.type === 'refill' ? 'Remplissage' : 'Consommation',
      'Quantité (L)': m.quantity,
      'Véhicule Bénéficiaire': getVehicleLabel(m.vehicleId || ''),
      'Opérateur': m.performedBy || 'Agent',
      'Remarques': m.notes || ''
    }));

    const wb = XLSX.utils.book_new();

    // Create distributions worksheet
    const wsDist = XLSX.utils.json_to_sheet(distData);
    XLSX.utils.book_append_sheet(wb, wsDist, "Distributions");

    // Create oil/fluids worksheet
    const wsHuiles = XLSX.utils.json_to_sheet(huilesData);
    XLSX.utils.book_append_sheet(wb, wsHuiles, "Huiles");

    // Save Excel file
    XLSX.writeFile(wb, `Rapport_Consommation_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Date Filters Controls Card */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Filtrer les rapports
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
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
              disabled={exportingPDF}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              {exportingPDF ? 'Exportation PDF...' : 'Exporter PDF'}
            </button>

            <button 
              className="btn btn-primary"
              onClick={exportExcel}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--accent-green)', color: '#fff' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              Exporter Excel
            </button>
          </div>
        </div>
      </div>

      {/* Printable Area - Formatted beautiful report review */}
      <div 
        ref={reportRef} 
        style={{
          padding: '2.5rem',
          backgroundColor: '#0b0f19',
          color: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #fff, var(--accent-cyan))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Rapport de Consommation FuelFlow
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Période du {new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>FuelFlow Web</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Généré le {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Gasoil Total
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {totalGasoil.toLocaleString()} L
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Distribué à la flotte</p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Huile Hydraulique
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-orange)' }}>
              {totalHydraulique.toLocaleString()} L
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Consommé par les véhicules</p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Huile Moteur
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-orange)' }}>
              {totalMotorOil.toLocaleString()} L
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Consommé par les véhicules</p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Anomalies Clic
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: totalAnomalies > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
              {totalAnomalies}
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Alerte de surconsommation</p>
          </div>
        </div>

        {/* Details: Distributions */}
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
            Détail des Distributions de Gasoil
          </h3>
          {filteredFills.length === 0 ? (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Aucune donnée pour cette période.</p>
          ) : (
            <div className="table-responsive" style={{ border: 'none', backgroundColor: 'transparent' }}>
              <table className="table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'transparent' }}>
                    <th style={{ padding: '0.5rem 1rem' }}>Date</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Véhicule</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Chauffeur</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Quantité</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Kilométrage</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Consommation</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFills.map(f => (
                    <tr key={f.id}>
                      <td style={{ padding: '0.75rem 1rem' }}>{new Date(f.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{getVehicleLabel(f.vehicleId)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{getDriverLabel(f.driverId)}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{f.quantity} L</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{f.mileage.toLocaleString()} km</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{f.calculatedConsumption ? `${f.calculatedConsumption.toFixed(1)} L/100` : '-'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {f.anomalyDetected ? (
                          <span className="badge badge-danger" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>Anomalie</span>
                        ) : (
                          <span className="badge badge-success" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>Ok</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Details: Huiles */}
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
            Consommation des Huiles & Fluides
          </h3>
          {filteredMovements.length === 0 ? (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Aucune donnée pour cette période.</p>
          ) : (
            <div className="table-responsive" style={{ border: 'none', backgroundColor: 'transparent' }}>
              <table className="table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'transparent' }}>
                    <th style={{ padding: '0.5rem 1rem' }}>Date</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Baril</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Type</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Mouvement</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Quantité</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Bénéficiaire</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map(m => (
                    <tr key={m.id}>
                      <td style={{ padding: '0.75rem 1rem' }}>{new Date(m.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{getBarrelName(m.barrelId)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{getBarrelTypeLabel(m.barrelId)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {m.type === 'refill' ? 'Remplissage' : 'Consommation'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: m.type === 'refill' ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                        {m.type === 'refill' ? '+' : '-'}{m.quantity} L
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>{m.vehicleId ? getVehicleLabel(m.vehicleId) : 'Stock'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
