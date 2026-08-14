import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

type ReportType = 'gasoil' | 'huile' | 'revision' | 'reparation' | 'global';

export const ReportsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    fuelFills, 
    barrelMovements, 
    repairs,
    revisions,
    vehicles, 
    drivers, 
    barrels,
    fetchFuelFills, 
    fetchBarrelMovements,
    fetchRepairs,
    fetchRevisions,
    fetchVehicles,
    fetchDrivers,
    fetchBarrels
  } = useDataStore();

  const reportRef = useRef<HTMLDivElement>(null);

  // Active Report Type Tab
  const [activeReportType, setActiveReportType] = useState<ReportType>('global');

  // Filters
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');

  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFuelFills(user.ownerId);
      fetchBarrelMovements(user.ownerId);
      fetchRepairs(user.ownerId);
      fetchRevisions(user.ownerId);
      fetchVehicles(user.ownerId);
      fetchDrivers(user.ownerId);
      fetchBarrels(user.ownerId);
    }
  }, [user]);

  if (!user) return null;

  // Preset date filters
  const applyPreset = (preset: '7days' | '30days' | 'month' | 'year') => {
    const now = new Date();
    if (preset === '7days') {
      const start = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '30days') {
      const start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'year') {
      const start = new Date(2026, 0, 1);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  // Filtered lists
  const filteredFills = fuelFills.filter(f => {
    const dateStr = f.createdAt.split('T')[0];
    const matchDate = dateStr >= startDate && dateStr <= endDate;
    const matchVeh = selectedVehicleId === 'all' || f.vehicleId === selectedVehicleId;
    return matchDate && matchVeh;
  });

  const filteredMovements = barrelMovements.filter(m => {
    const dateStr = m.createdAt.split('T')[0];
    const matchDate = dateStr >= startDate && dateStr <= endDate;
    const matchVeh = selectedVehicleId === 'all' || m.vehicleId === selectedVehicleId;
    return matchDate && matchVeh;
  });

  const filteredRepairs = repairs.filter(r => {
    const dateStr = (r.startDate || r.createdAt).split('T')[0];
    const matchDate = dateStr >= startDate && dateStr <= endDate;
    const matchVeh = selectedVehicleId === 'all' || r.vehicleId === selectedVehicleId;
    return matchDate && matchVeh;
  });

  const filteredRevisions = revisions.filter(rev => {
    const dateStr = (rev.createdAt || rev.lastDate || '').split('T')[0];
    const matchDate = !dateStr || (dateStr >= startDate && dateStr <= endDate);
    const matchVeh = selectedVehicleId === 'all' || rev.vehicleId === selectedVehicleId;
    return matchDate && matchVeh;
  });

  // Calculate statistics
  const totalGasoil = filteredFills.reduce((sum, f) => sum + (f.quantity || 0), 0);
  const totalAnomalies = filteredFills.filter(f => f.anomalyDetected).length;

  const totalHuiles = filteredMovements
    .filter(m => m.type === 'consume')
    .reduce((sum, m) => sum + (m.quantity || 0), 0);

  const totalRepairCost = filteredRepairs.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalRevisionCost = filteredRevisions.reduce((sum, rev) => sum + (rev.cost || 0), 0);

  const getVehicleLabel = (id?: string) => {
    if (!id) return 'Inconnu / Stock';
    const v = vehicles.find(veh => veh.id === id);
    return v ? `${v.brand} ${v.model} (${v.plateNumber})` : 'Inconnu';
  };

  const getDriverLabel = (id?: string) => {
    if (!id) return 'Inconnu';
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

  // High-contrast, clean 2026 Executive PDF Exporter
  const exportPDF = async () => {
    if (!reportRef.current) return;
    setExportingPDF(true);

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        logging: false,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
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

      const reportNameMap: Record<ReportType, string> = {
        gasoil: 'Gasoil',
        huile: 'Huiles_Fluides',
        revision: 'Revisions',
        reparation: 'Reparations',
        global: 'Executive_Global'
      };

      pdf.save(`Rapport_${reportNameMap[activeReportType]}_${startDate}_to_${endDate}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setExportingPDF(false);
    }
  };

  // Multi-Sheet Excel Exporter
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (activeReportType === 'gasoil' || activeReportType === 'global') {
      const distData = filteredFills.map(f => ({
        'Date': new Date(f.createdAt).toLocaleString('fr-FR'),
        'Véhicule': getVehicleLabel(f.vehicleId),
        'Chauffeur': getDriverLabel(f.driverId),
        'Quantité (L)': f.quantity,
        'Kilométrage (km)': f.mileage,
        'Consommation (L/100km)': f.calculatedConsumption ? f.calculatedConsumption.toFixed(2) : '-',
        'Anomalie': f.anomalyDetected ? `Oui (${f.anomalyType || 'Surconsommation'})` : 'Non'
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(distData), "Consommation Gasoil");
    }

    if (activeReportType === 'huile' || activeReportType === 'global') {
      const huilesData = filteredMovements.map(m => ({
        'Date': new Date(m.createdAt).toLocaleString('fr-FR'),
        'Baril': getBarrelName(m.barrelId),
        'Type': getBarrelTypeLabel(m.barrelId),
        'Opération': m.type === 'refill' ? 'Ravitaillement' : 'Consommation',
        'Quantité (L)': m.quantity,
        'Bénéficiaire': getVehicleLabel(m.vehicleId),
        'Opérateur': m.performedBy || 'Agent'
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(huilesData), "Huiles & Fluides");
    }

    if (activeReportType === 'revision' || activeReportType === 'global') {
      const revsData = filteredRevisions.map(r => ({
        'Véhicule': getVehicleLabel(r.vehicleId),
        'Catégorie': r.type.toUpperCase(),
        'Mode Suivi': r.mode === 'days' ? 'Par Jours' : 'Par Kilométrage',
        'Dernier Contrôle': r.lastDate || `${r.lastKm || 0} km`,
        'Proche Échéance': r.nextDueDate || `${r.nextDueKm || 0} km`,
        'Coût (MAD)': r.cost || 0,
        'Prestataire': r.provider || '-'
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(revsData), "Révisions & Entretiens");
    }

    if (activeReportType === 'reparation' || activeReportType === 'global') {
      const repairsData = filteredRepairs.map(r => ({
        'Date Début': r.startDate,
        'Véhicule': getVehicleLabel(r.vehicleId),
        'Type de Panne': r.type,
        'Priorité': r.priority,
        'Statut': r.status,
        'Coût (MAD)': r.cost || 0,
        'Garage / Prestataire': r.provider || '-',
        'Description': r.description,
        'Pièces Remplacées': r.partsReplaced || '-'
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(repairsData), "Réparations & Pannes");
    }

    XLSX.writeFile(wb, `Rapport_${activeReportType}_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            Centre d'Édition des Rapports 2026
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Génération de comptes-rendus analytiques, exports PDF haute résolution et fichiers Excel multi-feuilles.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary"
            onClick={exportPDF}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)', fontWeight: 700 }}
            disabled={exportingPDF}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            {exportingPDF ? 'Génération PDF...' : 'Télécharger PDF'}
          </button>

          <button 
            className="btn btn-primary"
            onClick={exportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--accent-green)', color: '#fff', fontWeight: 700 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            Exporter Excel
          </button>
        </div>
      </div>

      {/* 1. Report Type Selection Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        backgroundColor: 'var(--bg-card)',
        padding: '0.4rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveReportType('global')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeReportType === 'global' ? 'var(--bg-input)' : 'transparent',
            color: activeReportType === 'global' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: activeReportType === 'global' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          📊 Executive Global
        </button>

        <button
          onClick={() => setActiveReportType('gasoil')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeReportType === 'gasoil' ? 'var(--bg-input)' : 'transparent',
            color: activeReportType === 'gasoil' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: activeReportType === 'gasoil' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          ⛽ Consommation Gasoil
        </button>

        <button
          onClick={() => setActiveReportType('huile')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeReportType === 'huile' ? 'var(--bg-input)' : 'transparent',
            color: activeReportType === 'huile' ? 'var(--accent-orange)' : 'var(--text-secondary)',
            fontWeight: activeReportType === 'huile' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          🛢️ Consommation d'Huiles
        </button>

        <button
          onClick={() => setActiveReportType('revision')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeReportType === 'revision' ? 'var(--bg-input)' : 'transparent',
            color: activeReportType === 'revision' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: activeReportType === 'revision' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          🛠️ Révisions & Entretiens
        </button>

        <button
          onClick={() => setActiveReportType('reparation')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeReportType === 'reparation' ? 'var(--bg-input)' : 'transparent',
            color: activeReportType === 'reparation' ? 'var(--accent-orange)' : 'var(--text-secondary)',
            fontWeight: activeReportType === 'reparation' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          🔧 Réparations & Pannes
        </button>
      </div>

      {/* 2. Interactive Filter Bar (Date range & Vehicle) */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Période du</label>
              <input 
                type="date" 
                className="form-control" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Au</label>
              <input 
                type="date" 
                className="form-control" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Véhicule Cible</label>
              <select 
                className="form-control"
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                style={{ minWidth: '220px' }}
              >
                <option value="all">🚗 Tous les véhicules ({vehicles.length})</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} ({v.plateNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Date Presets */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', alignSelf: 'center', marginRight: '0.4rem', fontWeight: 600 }}>Périodes rapides:</span>
            <button 
              onClick={() => applyPreset('7days')}
              style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              7 Jours
            </button>
            <button 
              onClick={() => applyPreset('30days')}
              style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              30 Jours
            </button>
            <button 
              onClick={() => applyPreset('month')}
              style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Ce Mois
            </button>
            <button 
              onClick={() => applyPreset('year')}
              style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Année 2026
            </button>
          </div>

        </div>
      </div>

      {/* 3. Printable Executive Document Preview (Designed for high contrast, pure white background printing) */}
      <div 
        ref={reportRef} 
        style={{
          padding: '2.5rem',
          backgroundColor: '#FFFFFF',
          color: '#0F172A',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}
      >
        {/* Document Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #0F172A', paddingBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.3rem' }}>
              FUELFLOW FLEET MANAGEMENT 2026 • RAPPORT OFFICIEL
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
              {activeReportType === 'global' && 'Rapport Exécutif Global de la Flotte'}
              {activeReportType === 'gasoil' && 'Rapport de Consommation de Gasoil'}
              {activeReportType === 'huile' && "Rapport de Consommation d'Huiles & Fluides"}
              {activeReportType === 'revision' && 'Rapport des Révisions & Suivis Réglementaires'}
              {activeReportType === 'reparation' && 'Rapport des Réparations & Interventions d\'Urgence'}
            </h1>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginTop: '0.4rem', margin: 0 }}>
              Période d'analyse: <strong>{new Date(startDate).toLocaleDateString('fr-FR')}</strong> au <strong>{new Date(endDate).toLocaleDateString('fr-FR')}</strong>
              {selectedVehicleId !== 'all' && ` | Véhicule: ${getVehicleLabel(selectedVehicleId)}`}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A' }}>FuelFlow Systems</div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.2rem' }}>Généré le: {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
            <div style={{ fontSize: '0.75rem', color: '#0284C7', fontWeight: 700, marginTop: '0.2rem' }}>Édition Certifiée</div>
          </div>
        </div>

        {/* 4. KPI CARDS SECTION (Les cartes les KPI) */}
        <div>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>
            Indicateurs Clés de Performance (KPI Metrics)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
            
            {/* KPI Card 1 */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', borderLeft: '5px solid #0284C7' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                VOLUME GASOIL
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0F172A' }}>
                {totalGasoil.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#0284C7' }}>L</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: totalAnomalies > 0 ? '#DC2626' : '#059669', margin: '0.3rem 0 0 0', fontWeight: 600 }}>
                {totalAnomalies} anomalie(s) détectée(s)
              </p>
            </div>

            {/* KPI Card 2 */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', borderLeft: '5px solid #EA580C' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                HUILES & FLUIDES
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0F172A' }}>
                {totalHuiles.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#EA580C' }}>L</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0.3rem 0 0 0' }}>
                Consommé par les véhicules
              </p>
            </div>

            {/* KPI Card 3 */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', borderLeft: '5px solid #2563EB' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                BUDGET RÉVISIONS
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0F172A' }}>
                {totalRevisionCost.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#2563EB' }}>MAD</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0.3rem 0 0 0' }}>
                {filteredRevisions.length} opérations suivies
              </p>
            </div>

            {/* KPI Card 4 */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', borderLeft: '5px solid #DC2626' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                COÛT RÉPARATIONS
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0F172A' }}>
                {totalRepairCost.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#DC2626' }}>MAD</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#DC2626', margin: '0.3rem 0 0 0', fontWeight: 600 }}>
                {filteredRepairs.filter(r => r.priority === 'high').length} urgence(s) enregistrée(s)
              </p>
            </div>

          </div>
        </div>

        {/* 5. SECTIONS BASED ON ACTIVE REPORT TYPE */}

        {/* Section Gasoil */}
        {(activeReportType === 'gasoil' || activeReportType === 'global') && (
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: '1rem', borderBottom: '2px solid #E2E8F0', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⛽ 1. Relevé des Ravitaillements en Gasoil ({filteredFills.length} opérations)
            </h3>
            {filteredFills.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#64748B', fontStyle: 'italic' }}>Aucune consommation enregistrée pour cette période.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Date & Heure</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Véhicule</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Chauffeur</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Quantité</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Compteur</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Consommation</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Statut IA</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFills.map((f, i) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{new Date(f.createdAt).toLocaleString('fr-FR')}</td>
                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: '#0284C7' }}>{getVehicleLabel(f.vehicleId)}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{getDriverLabel(f.driverId)}</td>
                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 800, color: '#0F172A' }}>{f.quantity} L</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{f.mileage.toLocaleString()} km</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{f.calculatedConsumption ? `${f.calculatedConsumption.toFixed(1)} L/100` : '-'}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>
                        {f.anomalyDetected ? (
                          <span style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.7rem' }}>⚠️ Anomalie</span>
                        ) : (
                          <span style={{ backgroundColor: '#D1FAE5', color: '#059669', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.7rem' }}>✓ Normal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Section Huiles */}
        {(activeReportType === 'huile' || activeReportType === 'global') && (
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: '1rem', borderBottom: '2px solid #E2E8F0', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🛢️ 2. Mouvements d'Huiles & Fluides ({filteredMovements.length} opérations)
            </h3>
            {filteredMovements.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#64748B', fontStyle: 'italic' }}>Aucune consommation d'huile enregistrée pour cette période.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Date & Heure</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Baril</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Type</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Opération</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Quantité</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Véhicule Destinataire</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((m, i) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{new Date(m.createdAt).toLocaleString('fr-FR')}</td>
                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700 }}>{getBarrelName(m.barrelId)}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{getBarrelTypeLabel(m.barrelId)}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>
                        {m.type === 'refill' ? 'Ravitaillement' : 'Consommation'}
                      </td>
                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 800, color: m.type === 'refill' ? '#059669' : '#EA580C' }}>
                        {m.type === 'refill' ? '+' : '-'}{m.quantity} L
                      </td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{getVehicleLabel(m.vehicleId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Section Révisions */}
        {(activeReportType === 'revision' || activeReportType === 'global') && (
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: '1rem', borderBottom: '2px solid #E2E8F0', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🛠️ 3. Révisions & Suivis Réglementaires ({filteredRevisions.length} enregistrements)
            </h3>
            {filteredRevisions.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#64748B', fontStyle: 'italic' }}>Aucune révision répertoriée pour cette période.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Véhicule</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Catégorie</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Mode Suivi</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Dernier Contrôle</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Prochaine Échéance</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Coût (MAD)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRevisions.map((rev, i) => (
                    <tr key={rev.id} style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: '#0F172A' }}>{getVehicleLabel(rev.vehicleId)}</td>
                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>{rev.type}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{rev.mode === 'days' ? 'Par Jours' : 'Par Kilométrage'}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{rev.lastDate || `${rev.lastKm || 0} km`}</td>
                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: '#2563EB' }}>{rev.nextDueDate || `${rev.nextDueKm || 0} km`}</td>
                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 800 }}>{(rev.cost || 0).toLocaleString()} MAD</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Section Réparations */}
        {(activeReportType === 'reparation' || activeReportType === 'global') && (
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: '1rem', borderBottom: '2px solid #E2E8F0', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔧 4. Interventions de Réparation & Pannes ({filteredRepairs.length} interventions)
            </h3>
            {filteredRepairs.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#64748B', fontStyle: 'italic' }}>Aucune réparation enregistrée pour cette période.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Date Début</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Véhicule</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Type Panne</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Description</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Garage</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Coût (MAD)</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: '#475569' }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRepairs.map((rep, i) => (
                    <tr key={rep.id} style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{rep.startDate}</td>
                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: '#EA580C' }}>{getVehicleLabel(rep.vehicleId)}</td>
                      <td style={{ padding: '0.6rem 0.8rem', textTransform: 'capitalize' }}>{rep.type}</td>
                      <td style={{ padding: '0.6rem 0.8rem', maxWidth: '220px' }}>{rep.description}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{rep.provider || '-'}</td>
                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 800, color: '#0F172A' }}>{(rep.cost || 0).toLocaleString()} MAD</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>
                        {rep.status === 'completed' ? (
                          <span style={{ backgroundColor: '#D1FAE5', color: '#059669', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.7rem' }}>✅ Terminé</span>
                        ) : rep.status === 'in_progress' ? (
                          <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.7rem' }}>🔧 En cours</span>
                        ) : (
                          <span style={{ backgroundColor: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.7rem' }}>📥 En attente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Footer Signature Block for Official Reports */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderTop: '2px solid #E2E8F0',
          paddingTop: '1.5rem',
          marginTop: '1.5rem'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>Direction de la Flotte FuelFlow</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>Document officiel d'audit interne</div>
          </div>
          <div style={{
            border: '1px dashed #CBD5E1',
            borderRadius: '8px',
            padding: '1rem 2rem',
            textAlign: 'center',
            minWidth: '220px',
            backgroundColor: '#F8FAFC'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Signature & Cachet Officiel</div>
            <div style={{ height: '35px' }} />
          </div>
        </div>

      </div>

    </div>
  );
};
