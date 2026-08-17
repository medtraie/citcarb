import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

interface TankReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TankReportModal: React.FC<TankReportModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { 
    tank, 
    tankMovements, 
    fuelFills, 
    vehicles, 
    drivers 
  } = useDataStore();

  const reportRef = useRef<HTMLDivElement>(null);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');
  const [pricePerLiter, setPricePerLiter] = useState<number>(13.50);

  if (!isOpen || !user || !tank) return null;

  // Preset Date Filters
  const applyPreset = (preset: '7days' | '30days' | 'month' | 'year' | 'all') => {
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
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  // Filter Tank Refills (Remplissages de la citerne)
  const filteredRefills = tankMovements.filter(m => {
    const isRefill = m.type === 'refill' || m.quantity > 0;
    const dateStr = (m.createdAt || '').split('T')[0];
    const matchDate = !dateStr || (dateStr >= startDate && dateStr <= endDate);
    return isRefill && matchDate;
  });

  // Filter Fuel Fills (Consommations & Sorties de gasoil aux véhicules)
  const filteredFills = fuelFills.filter(f => {
    const dateStr = (f.createdAt || '').split('T')[0];
    const matchDate = !dateStr || (dateStr >= startDate && dateStr <= endDate);
    const matchVeh = selectedVehicleId === 'all' || f.vehicleId === selectedVehicleId;
    return matchDate && matchVeh;
  });

  // KPI Calculations
  const totalRefillsCount = filteredRefills.length;
  const totalRefilledVolume = filteredRefills.reduce((sum, r) => sum + r.quantity, 0);
  const totalRefillCost = filteredRefills.reduce((sum, r) => sum + ((r.price || pricePerLiter) * r.quantity), 0);

  const totalFillsCount = filteredFills.length;
  const totalConsumedVolume = filteredFills.reduce((sum, f) => sum + f.quantity, 0);
  const totalConsumedCost = totalConsumedVolume * pricePerLiter;
  const totalAnomalies = filteredFills.filter(f => f.anomalyDetected).length;

  const currentTankVolume = tank.currentVolume;
  const currentTankCapacity = tank.capacity;
  const currentTankPercent = currentTankCapacity > 0 ? Math.round((currentTankVolume / currentTankCapacity) * 100) : 0;
  const currentStockValuation = currentTankVolume * pricePerLiter;

  const getVehicleLabel = (vehId?: string) => {
    if (!vehId) return 'Inconnu';
    const v = vehicles.find(veh => veh.id === vehId);
    return v ? `${v.brand} ${v.model} (${v.plateNumber})` : 'Véhicule Inconnu';
  };

  const getDriverLabel = (drvId?: string) => {
    if (!drvId) return 'Non assigné';
    const d = drivers.find(drv => drv.id === drvId);
    return d ? d.fullName : 'Non assigné';
  };

  // Vehicle Breakdown Aggregation
  const vehicleStatsMap: Record<string, { count: number; totalLiters: number; vehicleId: string }> = {};
  filteredFills.forEach(f => {
    if (!vehicleStatsMap[f.vehicleId]) {
      vehicleStatsMap[f.vehicleId] = { count: 0, totalLiters: 0, vehicleId: f.vehicleId };
    }
    vehicleStatsMap[f.vehicleId].count += 1;
    vehicleStatsMap[f.vehicleId].totalLiters += f.quantity;
  });

  const vehicleStatsList = Object.values(vehicleStatsMap).sort((a, b) => b.totalLiters - a.totalLiters);

  // PDF Export
  const exportPDF = async () => {
    if (!reportRef.current) return;
    setExportingPDF(true);

    try {
      reportRef.current.classList.add('pdf-export-active');

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        logging: false,
        useCORS: true
      });

      reportRef.current.classList.remove('pdf-export-active');

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

      pdf.save(`Rapport_Citerne_Gasoil_${startDate}_au_${endDate}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      if (reportRef.current) {
        reportRef.current.classList.remove('pdf-export-active');
      }
      setExportingPDF(false);
    }
  };

  // Excel Export
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Synthèse Citerne
    const summaryData = [
      { 'Indicateur': 'Capacité Totale Citerne (L)', 'Valeur': currentTankCapacity },
      { 'Indicateur': 'Stock Restant Actuel (L)', 'Valeur': currentTankVolume },
      { 'Indicateur': 'Pourcentage de Remplissage (%)', 'Valeur': `${currentTankPercent}%` },
      { 'Indicateur': 'Prix Unitaire du Litre (MAD)', 'Valeur': pricePerLiter },
      { 'Indicateur': 'Valeur Financière du Stock Restant (MAD)', 'Valeur': currentStockValuation },
      { 'Indicateur': 'Nombre de Ravitaillements (Remplissages Citerne)', 'Valeur': totalRefillsCount },
      { 'Indicateur': 'Volume Total Ravitaillé (L)', 'Valeur': totalRefilledVolume },
      { 'Indicateur': 'Nombre de Distributions (Pleins Véhicules)', 'Valeur': totalFillsCount },
      { 'Indicateur': 'Volume Total Consommé (L)', 'Valeur': totalConsumedVolume },
      { 'Indicateur': 'Coût Total Carburant Consommé (MAD)', 'Valeur': totalConsumedCost },
      { 'Indicateur': 'Anomalies de Consommation Détectées', 'Valeur': totalAnomalies }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Synthèse Citerne");

    // Sheet 2: Répartition par Véhicule
    const vehData = vehicleStatsList.map(item => {
      const v = vehicles.find(veh => veh.id === item.vehicleId);
      const share = totalConsumedVolume > 0 ? ((item.totalLiters / totalConsumedVolume) * 100).toFixed(1) : '0';
      const cost = item.totalLiters * pricePerLiter;
      return {
        'Immatriculation': v?.plateNumber || 'Inconnu',
        'Véhicule': v ? `${v.brand} ${v.model}` : 'Inconnu',
        'Catégorie': v?.type || '-',
        'Chauffeur': getDriverLabel(v?.driverId),
        'Nombre de Pleins': item.count,
        'Volume Consommé (L)': item.totalLiters,
        'Part de Consommation (%)': `${share}%`,
        'Coût Total (MAD)': cost
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vehData), "Consommation par Véhicule");

    // Sheet 3: Ravitaillements Citerne
    const refillData = filteredRefills.map(r => ({
      'Date & Heure': new Date(r.createdAt).toLocaleString('fr-FR'),
      'Quantité Ajoutée (L)': r.quantity,
      'Fournisseur': r.supplier || '-',
      'Prix Unitaire (MAD/L)': r.price || pricePerLiter,
      'Montant Total (MAD)': r.quantity * (r.price || pricePerLiter),
      'Bon de Livraison / Notes': r.notes || '-',
      'Opérateur': r.performedBy || 'Agent'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(refillData), "Ravitaillements Citerne");

    // Sheet 4: Détail des Consommations
    const fillData = filteredFills.map(f => ({
      'Date & Heure': new Date(f.createdAt).toLocaleString('fr-FR'),
      'Véhicule': getVehicleLabel(f.vehicleId),
      'Chauffeur': getDriverLabel(f.driverId),
      'Quantité (L)': f.quantity,
      'Compteur (km)': f.mileage,
      'Consommation (L/100km)': f.calculatedConsumption ? f.calculatedConsumption.toFixed(2) : '-',
      'Coût de l\'Opération (MAD)': f.quantity * pricePerLiter,
      'Anomalie': f.anomalyDetected ? `Oui (${f.anomalyType || 'Surconsommation'})` : 'Non'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fillData), "Détail Distributions");

    XLSX.writeFile(wb, `Rapport_Citerne_Gasoil_${startDate}_au_${endDate}.xlsx`);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100, overflowY: 'auto', padding: '1.5rem 1rem' }}>
      <div className="modal-content" style={{ maxWidth: '1050px', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: '1.75rem', gap: '1.25rem' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              Rapport Officiel de la Citerne Principale (Gasoil)
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Audit complet des mouvements, ravitaillements de citerne, distributions par véhicule et valorisation financière en MAD.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              className="btn btn-secondary"
              onClick={exportPDF}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.85rem' }}
              disabled={exportingPDF}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              {exportingPDF ? 'Génération...' : 'Télécharger PDF'}
            </button>

            <button 
              className="btn btn-primary"
              onClick={exportExcel}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--accent-green)', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              Excel
            </button>

            <button 
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', padding: '0 0.5rem', lineHeight: 1 }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ backgroundColor: 'var(--bg-input)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Période du</label>
                <input 
                  type="date" 
                  className="form-control" 
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Au</label>
                <input 
                  type="date" 
                  className="form-control" 
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Véhicule Cible</label>
                <select 
                  className="form-control"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', minWidth: '190px' }}
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                >
                  <option value="all">🚗 Tous les véhicules ({vehicles.length})</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.plateNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Prix du Litre (MAD)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <input 
                    type="number" 
                    step="0.05"
                    min="0"
                    className="form-control" 
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: '100px', fontWeight: 700 }}
                    value={pricePerLiter}
                    onChange={(e) => setPricePerLiter(parseFloat(e.target.value) || 0)}
                  />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>MAD/L</span>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => applyPreset('7days')}
                style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                7 Jours
              </button>
              <button 
                onClick={() => applyPreset('30days')}
                style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                30 Jours
              </button>
              <button 
                onClick={() => applyPreset('month')}
                style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Ce Mois
              </button>
              <button 
                onClick={() => applyPreset('all')}
                style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Tout l'historique
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Printable Report Container */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
          
          <div 
            ref={reportRef} 
            style={{
              padding: '2.5rem',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.75rem'
            }}
          >
            {/* Document Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid var(--border-color)', paddingBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.3rem' }}>
                  FUELFLOW FLEET MANAGEMENT 2026 • CONTRÔLE CITERNE & MOUVEMENTS
                </div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                  Rapport de Gestion & Mouvements de Citerne
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.4rem', margin: 0 }}>
                  Période: <strong>{new Date(startDate).toLocaleDateString('fr-FR')}</strong> au <strong>{new Date(endDate).toLocaleDateString('fr-FR')}</strong>
                  {selectedVehicleId !== 'all' && ` | Véhicule: ${getVehicleLabel(selectedVehicleId)}`}
                  {` | Tarif unitaire appliqué: ${pricePerLiter.toFixed(2)} MAD/L`}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)' }}>FuelFlow Systems</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Édité le: {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 700, marginTop: '0.2rem' }}>
                  ✓ Citerne Principale Certifiée
                </div>
              </div>
            </div>

            {/* 6 Key Executive KPI Cards */}
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>
                Synthèse Générale & Indicateurs Clés de la Citerne
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                
                {/* KPI 1: Stock Restant Actuel */}
                <div className="report-kpi-card" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', borderLeft: '5px solid var(--accent-cyan)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    STOCK RESTANT ACTUEL
                  </div>
                  <div className="report-kpi-val" style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                    {currentTankVolume.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>/ {currentTankCapacity.toLocaleString()} L</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{currentTankPercent}% Rempli</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Val: {currentStockValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })} MAD</span>
                  </div>
                </div>

                {/* KPI 2: Remplissages Citerne */}
                <div className="report-kpi-card" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', borderLeft: '5px solid var(--accent-green)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    REMPLISSAGES CITERNE
                  </div>
                  <div className="report-kpi-val" style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                    {totalRefillsCount} <span style={{ fontSize: '0.85rem', color: 'var(--accent-green)' }}>livraisons</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0 0' }}>
                    Total: +{totalRefilledVolume.toLocaleString()} L ({totalRefillCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} MAD)
                  </p>
                </div>

                {/* KPI 3: Consommation / Pleins Véhicules */}
                <div className="report-kpi-card" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', borderLeft: '5px solid var(--accent-orange)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    VOLUME DISTRIBUÉ
                  </div>
                  <div className="report-kpi-val" style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                    {totalConsumedVolume.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--accent-orange)' }}>L</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0 0' }}>
                    Sur {totalFillsCount} pleins de véhicules
                  </p>
                </div>

                {/* KPI 4: Coût Total Consommé en MAD */}
                <div className="report-kpi-card" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', borderLeft: '5px solid #2563EB' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    COÛT TOTAL CONSOMMÉ
                  </div>
                  <div className="report-kpi-val" style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                    {totalConsumedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style={{ fontSize: '0.85rem', color: '#2563EB' }}>MAD</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0 0' }}>
                    Base: {pricePerLiter.toFixed(2)} MAD / Litre
                  </p>
                </div>

              </div>
            </div>

            {/* Section 1: Synthèse et Répartition par Véhicule */}
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🚗 1. Répartition de la Consommation & Coût par Véhicule ({vehicleStatsList.length} véhicules servis)
              </h3>
              
              {vehicleStatsList.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune distribution de gasoil enregistrée sur cette période.</p>
              ) : (
                <table className="table" style={{ width: '100%', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr>
                      <th>Véhicule</th>
                      <th>Catégorie</th>
                      <th>Chauffeur Assigné</th>
                      <th>Nombre de Pleins</th>
                      <th>Volume Total (L)</th>
                      <th>Part (%)</th>
                      <th>Coût Estimé (MAD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicleStatsList.map(item => {
                      const v = vehicles.find(veh => veh.id === item.vehicleId);
                      const share = totalConsumedVolume > 0 ? ((item.totalLiters / totalConsumedVolume) * 100).toFixed(1) : '0';
                      const cost = item.totalLiters * pricePerLiter;
                      return (
                        <tr key={item.vehicleId}>
                          <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{v?.brand} {v?.model} ({v?.plateNumber || 'Inconnu'})</td>
                          <td>{v?.type || '-'}</td>
                          <td>{getDriverLabel(v?.driverId)}</td>
                          <td style={{ fontWeight: 700 }}>{item.count} fois</td>
                          <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{item.totalLiters.toLocaleString()} L</td>
                          <td style={{ fontWeight: 700, color: 'var(--accent-orange)' }}>{share}%</td>
                          <td style={{ fontWeight: 800, color: 'var(--accent-green)' }}>{cost.toLocaleString(undefined, { maximumFractionDigits: 2 })} MAD</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Section 2: Historique des Ravitaillements de la Citerne */}
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📥 2. Historique des Remplissages & Entrées de Carburant ({filteredRefills.length} opérations)
              </h3>

              {filteredRefills.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucun remplissage de citerne enregistré sur cette période.</p>
              ) : (
                <table className="table" style={{ width: '100%', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr>
                      <th>Date & Heure</th>
                      <th>Quantité Livrée (L)</th>
                      <th>Fournisseur</th>
                      <th>Prix Unitaire</th>
                      <th>Montant Total (MAD)</th>
                      <th>Bon / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRefills.map(r => {
                      const unitPrice = r.price || pricePerLiter;
                      const amount = r.quantity * unitPrice;
                      return (
                        <tr key={r.id}>
                          <td>{new Date(r.createdAt).toLocaleString('fr-FR')}</td>
                          <td style={{ fontWeight: 800, color: 'var(--accent-green)' }}>+{r.quantity.toLocaleString()} L</td>
                          <td style={{ fontWeight: 600 }}>{r.supplier || 'Fournisseur Standard'}</td>
                          <td>{unitPrice.toFixed(2)} MAD/L</td>
                          <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} MAD</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{r.notes || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Section 3: Journal Détaillé des Distributions aux Véhicules */}
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⛽ 3. Journal des Distributions de Gasoil aux Véhicules ({filteredFills.length} pleins)
              </h3>

              {filteredFills.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune distribution enregistrée pour cette sélection.</p>
              ) : (
                <table className="table" style={{ width: '100%', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr>
                      <th>Date & Heure</th>
                      <th>Véhicule</th>
                      <th>Chauffeur</th>
                      <th>Quantité</th>
                      <th>Compteur</th>
                      <th>Consommation</th>
                      <th>Coût Opération</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFills.map(f => {
                      const opCost = f.quantity * pricePerLiter;
                      return (
                        <tr key={f.id}>
                          <td>{new Date(f.createdAt).toLocaleString('fr-FR')}</td>
                          <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{getVehicleLabel(f.vehicleId)}</td>
                          <td>{getDriverLabel(f.driverId)}</td>
                          <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{f.quantity} L</td>
                          <td>{f.mileage.toLocaleString()} km</td>
                          <td>{f.calculatedConsumption ? `${f.calculatedConsumption.toFixed(1)} L/100` : '-'}</td>
                          <td style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{opCost.toFixed(2)} MAD</td>
                          <td>
                            {f.anomalyDetected ? (
                              <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.7rem' }}>⚠️ Anomalie</span>
                            ) : (
                              <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-green)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.7rem' }}>✓ Normal</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Signature & Cachet Officiel (Visible in PDF export) */}
            <div 
              className="report-signature-footer"
              style={{
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                borderTop: '2px solid var(--border-color)',
                paddingTop: '1.5rem',
                marginTop: '1.5rem'
              }}
            >
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Responsable de la Citerne & Direction de la Flotte</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Document officiel d'inventaire et suivi des hydrocarbures</div>
              </div>
              <div 
                className="report-sig-box"
                style={{
                  border: '1px dashed var(--border-color)',
                  borderRadius: '8px',
                  padding: '1rem 2rem',
                  textAlign: 'center',
                  minWidth: '220px',
                  backgroundColor: 'var(--bg-input)'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Signature & Cachet Officiel</div>
                <div style={{ height: '35px' }} />
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
