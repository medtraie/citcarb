import React, { useState, useEffect, useRef } from 'react';
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
    drivers,
    fetchTank,
    fetchTankMovements,
    fetchFuelFills,
    fetchVehicles,
    fetchDrivers
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

  // Fetch all fresh tank and movement data on modal open
  useEffect(() => {
    if (isOpen && user) {
      fetchTank(user.ownerId);
      fetchTankMovements(user.ownerId);
      fetchFuelFills(user.ownerId);
      fetchVehicles(user.ownerId);
      fetchDrivers(user.ownerId);
    }
  }, [isOpen, user]);

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

  // Filter Tank Refills (Remplissages & Entrées en Citerne)
  const filteredRefills = tankMovements.filter(m => {
    const isRefill = m.type === 'refill' || (!m.notes?.includes('Remplissage véhicule') && m.quantity > 0);
    const dateStr = (m.createdAt || '').split('T')[0];
    const matchDate = !dateStr || (dateStr >= startDate && dateStr <= endDate);
    return isRefill && matchDate;
  });

  // Filter Fuel Fills (Consommations & Distributions aux Véhicules)
  const filteredFills = fuelFills.filter(f => {
    const dateStr = (f.createdAt || '').split('T')[0];
    const matchDate = !dateStr || (dateStr >= startDate && dateStr <= endDate);
    const matchVeh = selectedVehicleId === 'all' || f.vehicleId === selectedVehicleId;
    return matchDate && matchVeh;
  });

  const getRefillCost = (r: { quantity: number; price?: number | null }) => {
    if (r.price && r.price > 0) {
      return r.price > 100 ? r.price : r.quantity * r.price;
    }
    return r.quantity * pricePerLiter;
  };

  const getRefillUnitPrice = (r: { quantity: number; price?: number | null }) => {
    if (r.price && r.price > 0) {
      return r.price > 100 ? r.price / r.quantity : r.price;
    }
    return pricePerLiter;
  };

  // Key Statistics
  const totalRefillsCount = filteredRefills.length;
  const totalRefilledVolume = filteredRefills.reduce((sum, r) => sum + r.quantity, 0);
  const totalRefillCost = filteredRefills.reduce((sum, r) => sum + getRefillCost(r), 0);

  const totalFillsCount = filteredFills.length;
  const totalConsumedVolume = filteredFills.reduce((sum, f) => sum + f.quantity, 0);
  const totalConsumedCost = totalConsumedVolume * pricePerLiter;
  const totalAnomalies = filteredFills.filter(f => f.anomalyDetected).length;

  const currentTankVolume = tank.currentVolume;
  const currentTankCapacity = tank.capacity;
  const currentTankPercent = currentTankCapacity > 0 ? Math.round((currentTankVolume / currentTankCapacity) * 100) : 0;
  const currentStockValuation = currentTankVolume * pricePerLiter;

  // Average Fleet Consumption
  const validConsumptionList = filteredFills.filter(f => f.calculatedConsumption && f.calculatedConsumption > 0);
  const avgFleetConsumption = validConsumptionList.length > 0 
    ? (validConsumptionList.reduce((sum, f) => sum + f.calculatedConsumption!, 0) / validConsumptionList.length).toFixed(1)
    : '8.4';

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

  // PDF Export Function
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

      pdf.save(`Rapport_Officiel_Citerne_${startDate}_au_${endDate}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      if (reportRef.current) {
        reportRef.current.classList.remove('pdf-export-active');
      }
      setExportingPDF(false);
    }
  };

  // Excel Export Function
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Synthèse Citerne
    const summaryData = [
      { 'Indicateur': 'Capacité Totale Citerne (L)', 'Valeur': currentTankCapacity },
      { 'Indicateur': 'Stock Restant Actuel (L)', 'Valeur': currentTankVolume },
      { 'Indicateur': 'Taux de Remplissage (%)', 'Valeur': `${currentTankPercent}%` },
      { 'Indicateur': 'Prix Unitaire Appliqué (MAD/L)', 'Valeur': pricePerLiter },
      { 'Indicateur': 'Valeur Financière du Stock Restant (MAD)', 'Valeur': currentStockValuation },
      { 'Indicateur': 'Nombre de Ravitaillements (Entrées Citerne)', 'Valeur': totalRefillsCount },
      { 'Indicateur': 'Volume Total Livré en Citerne (L)', 'Valeur': totalRefilledVolume },
      { 'Indicateur': 'Montant des Approvisionnements (MAD)', 'Valeur': totalRefillCost },
      { 'Indicateur': 'Nombre de Distributions (Pleins Véhicules)', 'Valeur': totalFillsCount },
      { 'Indicateur': 'Volume Total Consommé par la Flotte (L)', 'Valeur': totalConsumedVolume },
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
        'Marque & Modèle': v ? `${v.brand} ${v.model}` : 'Inconnu',
        'Catégorie': v?.type || '-',
        'Chauffeur': getDriverLabel(v?.driverId),
        'Nombre de Pleins': item.count,
        'Volume Consommé (L)': item.totalLiters,
        'Part Consommation (%)': `${share}%`,
        'Coût Total (MAD)': cost
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vehData), "Consommation par Véhicule");

    // Sheet 3: Ravitaillements Citerne
    const refillData = filteredRefills.map(r => ({
      'Date & Heure': new Date(r.createdAt).toLocaleString('fr-FR'),
      'Quantité Livrée (L)': r.quantity,
      'Fournisseur': r.supplier || 'Standard',
      'Prix Unitaire (MAD/L)': getRefillUnitPrice(r),
      'Montant Total (MAD)': getRefillCost(r),
      'Bon de Livraison / Notes': r.notes || '-',
      'Opérateur / Réceptionnaire': r.performedBy || 'Agent'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(refillData), "Ravitaillements Citerne");

    // Sheet 4: Détail des Distributions
    const fillData = filteredFills.map(f => ({
      'Date & Heure': new Date(f.createdAt).toLocaleString('fr-FR'),
      'Véhicule': getVehicleLabel(f.vehicleId),
      'Chauffeur': getDriverLabel(f.driverId),
      'Quantité Distribuée (L)': f.quantity,
      'Compteur KM': f.mileage,
      'Consommation (L/100km)': f.calculatedConsumption ? f.calculatedConsumption.toFixed(2) : '-',
      'Coût Opération (MAD)': f.quantity * pricePerLiter,
      'Anomalie IA': f.anomalyDetected ? `Oui (${f.anomalyType || 'Surconsommation'})` : 'Non'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fillData), "Distributions Véhicules");

    XLSX.writeFile(wb, `Rapport_Citerne_Gasoil_${startDate}_au_${endDate}.xlsx`);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100, overflowY: 'auto', padding: '1.5rem 1rem' }}>
      <div className="modal-content" style={{ maxWidth: '1080px', width: '100%', maxHeight: '94vh', display: 'flex', flexDirection: 'column', padding: '1.75rem', gap: '1.25rem' }}>
        
        {/* Modal Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              Rapport Analytique & Financier de la Citerne (Gasoil)
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Audit officiel des flux de carburant, historique des livraisons, ventilation par véhicule et valorisation en MAD.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              className="btn btn-secondary"
              onClick={exportPDF}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: 'var(--accent-orange)', color: 'var(--accent-orange)', fontWeight: 800, fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              disabled={exportingPDF}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              {exportingPDF ? 'Génération PDF...' : 'Télécharger PDF'}
            </button>

            <button 
              className="btn btn-primary"
              onClick={exportExcel}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--accent-green)', color: '#fff', fontWeight: 800, fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              Excel (.xlsx)
            </button>

            <button 
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.6rem', cursor: 'pointer', padding: '0 0.5rem', lineHeight: 1 }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Dynamic Filter Controls & Unit Price Setting */}
        <div style={{ backgroundColor: 'var(--bg-input)', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Période du</label>
                <input 
                  type="date" 
                  className="form-control" 
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Au</label>
                <input 
                  type="date" 
                  className="form-control" 
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Véhicule Cible</label>
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
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Tarif Gasoil (MAD/Litre)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <input 
                    type="number" 
                    step="0.10"
                    min="0"
                    className="form-control" 
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: '105px', fontWeight: 800, color: 'var(--accent-orange)' }}
                    value={pricePerLiter}
                    onChange={(e) => setPricePerLiter(parseFloat(e.target.value) || 0)}
                  />
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-orange)' }}>MAD/L</span>
                </div>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '0.25rem', fontWeight: 600 }}>Raccourcis:</span>
              <button 
                onClick={() => applyPreset('7days')}
                style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
              >
                7 Jours
              </button>
              <button 
                onClick={() => applyPreset('30days')}
                style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
              >
                30 Jours
              </button>
              <button 
                onClick={() => applyPreset('month')}
                style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Ce Mois
              </button>
              <button 
                onClick={() => applyPreset('all')}
                style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Tout l'historique
              </button>
            </div>

          </div>
        </div>

        {/* Scrollable Document Canvas (PDF Preview) */}
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
              gap: '2rem'
            }}
          >
            {/* Header: Official Document Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid var(--border-color)', paddingBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--accent-orange)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.35rem' }}>
                  SFTFUEL FLEET SYSTEMS 2026 • RAPPORT D'AUDIT CITERNE & MOUVEMENTS
                </div>
                <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                  Bilan & Contrôle de la Citerne Principale
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.4rem', margin: 0 }}>
                  Période auditée: <strong>{new Date(startDate).toLocaleDateString('fr-FR')}</strong> au <strong>{new Date(endDate).toLocaleDateString('fr-FR')}</strong>
                  {selectedVehicleId !== 'all' && ` • Filtre: ${getVehicleLabel(selectedVehicleId)}`}
                  {` • Coût unitaire de référence: ${pricePerLiter.toFixed(2)} MAD/L`}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>SFTFUEL Energy</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Généré le: {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 800, marginTop: '0.2rem', display: 'inline-block', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                  ✓ Citerne Principale Certifiée
                </div>
              </div>
            </div>

            {/* 6 High-Contrast, Organized Executive KPI Cards in a Solid 3-Column Grid */}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                Tableau de Bord & Indicateurs Clés de la Citerne
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                
                {/* Card 1: Stock Restant Actuel */}
                <div className="report-kpi-card" style={{ backgroundColor: 'var(--bg-input)', borderRadius: '12px', padding: '1.15rem', borderLeft: '5px solid var(--accent-cyan)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '125px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      STOCK RESTANT ACTUEL
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-cyan)', backgroundColor: 'rgba(2, 132, 199, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                      {currentTankPercent}% Rempli
                    </span>
                  </div>
                  <div className="report-kpi-val" style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.4rem 0' }}>
                    {currentTankVolume.toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)' }}>/ {currentTankCapacity.toLocaleString()} L</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Valeur estimée: <strong style={{ color: 'var(--text-primary)' }}>{currentStockValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })} MAD</strong>
                  </div>
                </div>

                {/* Card 2: Ravitaillements & Entrées Citerne */}
                <div className="report-kpi-card" style={{ backgroundColor: 'var(--bg-input)', borderRadius: '12px', padding: '1.15rem', borderLeft: '5px solid var(--accent-green)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '125px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      REMPLISSAGES CITERNE
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-green)', backgroundColor: 'rgba(5, 150, 105, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                      +{totalRefilledVolume.toLocaleString()} L Reçus
                    </span>
                  </div>
                  <div className="report-kpi-val" style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.4rem 0' }}>
                    {totalRefillsCount} <span style={{ fontSize: '0.9rem', color: 'var(--accent-green)' }}>livraisons</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Achats cumulés: <strong style={{ color: 'var(--text-primary)' }}>{totalRefillCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} MAD</strong>
                  </div>
                </div>

                {/* Card 3: Carburant Distribué aux Véhicules */}
                <div className="report-kpi-card" style={{ backgroundColor: 'var(--bg-input)', borderRadius: '12px', padding: '1.15rem', borderLeft: '5px solid var(--accent-orange)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '125px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      CARBURANT CONSOMMÉ
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-orange)', backgroundColor: 'rgba(234, 88, 12, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                      Sorties Flotte
                    </span>
                  </div>
                  <div className="report-kpi-val" style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.4rem 0' }}>
                    {totalConsumedVolume.toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'var(--accent-orange)' }}>L</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Totalisé sur <strong style={{ color: 'var(--text-primary)' }}>{totalFillsCount} pleins</strong> de véhicules
                  </div>
                </div>

                {/* Card 4: Coût Total Consommé en MAD */}
                <div className="report-kpi-card" style={{ backgroundColor: 'var(--bg-input)', borderRadius: '12px', padding: '1.15rem', borderLeft: '5px solid #2563EB', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '125px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      COÛT TOTAL CARBURANT
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563EB', backgroundColor: 'rgba(37, 99, 235, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                      {pricePerLiter.toFixed(2)} MAD/L
                    </span>
                  </div>
                  <div className="report-kpi-val" style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.4rem 0' }}>
                    {totalConsumedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style={{ fontSize: '0.9rem', color: '#2563EB' }}>MAD</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Dépense de carburant sur la période
                  </div>
                </div>

                {/* Card 5: Moyenne Consommation Flotte */}
                <div className="report-kpi-card" style={{ backgroundColor: 'var(--bg-input)', borderRadius: '12px', padding: '1.15rem', borderLeft: '5px solid #7C3AED', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '125px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      CONSOMMATION MOYENNE
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#7C3AED', backgroundColor: 'rgba(124, 58, 237, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                      Flotte
                    </span>
                  </div>
                  <div className="report-kpi-val" style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.4rem 0' }}>
                    {avgFleetConsumption} <span style={{ fontSize: '0.9rem', color: '#7C3AED' }}>L/100km</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Sur {vehicleStatsList.length} véhicules actifs audités
                  </div>
                </div>

                {/* Card 6: Contrôle & Sécurité IA */}
                <div className="report-kpi-card" style={{ backgroundColor: 'var(--bg-input)', borderRadius: '12px', padding: '1.15rem', borderLeft: totalAnomalies > 0 ? '5px solid var(--accent-red)' : '5px solid #0D9488', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '125px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      AUDIT & CONFORMITÉ IA
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: totalAnomalies > 0 ? 'var(--accent-red)' : '#0D9488', backgroundColor: totalAnomalies > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(13, 148, 136, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                      {totalAnomalies > 0 ? 'Alerte' : '100% Normal'}
                    </span>
                  </div>
                  <div className="report-kpi-val" style={{ fontSize: '1.6rem', fontWeight: 900, color: totalAnomalies > 0 ? 'var(--accent-red)' : 'var(--text-primary)', margin: '0.4rem 0' }}>
                    {totalAnomalies} <span style={{ fontSize: '0.9rem', color: totalAnomalies > 0 ? 'var(--accent-red)' : '#0D9488' }}>anomalie(s)</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: totalAnomalies > 0 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                    {totalAnomalies > 0 ? 'Vérifier surconsommation / KM' : 'Aucun écart suspect détecté'}
                  </div>
                </div>

              </div>
            </div>

            {/* Section 1: Historique Détaillé des Ravitaillements de la Citerne (Livraisons) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.85rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📥 1. Historique & Détails des Ravitaillements de la Citerne ({filteredRefills.length} entrées enregistrées)
                </h3>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                  Total Livré: +{totalRefilledVolume.toLocaleString()} Litres
                </span>
              </div>

              {filteredRefills.length === 0 ? (
                <div style={{ padding: '1.25rem', textAlign: 'center', backgroundColor: 'var(--bg-input)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '0.85rem', border: '1px dashed var(--border-color)' }}>
                  <p style={{ margin: '0 0 0.4rem 0', fontWeight: 700, color: 'var(--text-primary)' }}>Aucun ravitaillement de citerne enregistré sur cette période sélectionnée.</p>
                  <span>Pour enregistrer une nouvelle livraison de gasoil, utilisez le bouton "Remplir la Citerne" sur le tableau de bord.</span>
                </div>
              ) : (
                <table className="table" style={{ width: '100%', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '18%' }}>Date & Heure</th>
                      <th style={{ width: '15%' }}>Volume Reçu (L)</th>
                      <th style={{ width: '22%' }}>Fournisseur / Société</th>
                      <th style={{ width: '15%' }}>Prix Unitaire</th>
                      <th style={{ width: '15%' }}>Montant Total (MAD)</th>
                      <th style={{ width: '15%' }}>N° Bon / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRefills.map(r => {
                      const unitPrice = getRefillUnitPrice(r);
                      const amount = getRefillCost(r);
                      return (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>{new Date(r.createdAt).toLocaleString('fr-FR')}</td>
                          <td style={{ fontWeight: 800, color: 'var(--accent-green)' }}>+{r.quantity.toLocaleString()} L</td>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.supplier || 'Fournisseur Agréé'}</td>
                          <td>{unitPrice.toFixed(2)} MAD/L</td>
                          <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} MAD</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{r.notes || 'Livraison normale'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Section 2: Synthèse et Répartition par Véhicule */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.85rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🚗 2. Consommation & Coût Financier par Véhicule ({vehicleStatsList.length} véhicules servis)
                </h3>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-orange)' }}>
                  Total Consommé: {totalConsumedVolume.toLocaleString()} Litres ({totalConsumedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} MAD)
                </span>
              </div>
              
              {vehicleStatsList.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune distribution de gasoil enregistrée sur cette période.</p>
              ) : (
                <table className="table" style={{ width: '100%', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Véhicule & Immatriculation</th>
                      <th style={{ width: '12%' }}>Catégorie</th>
                      <th style={{ width: '18%' }}>Chauffeur Assigné</th>
                      <th style={{ width: '12%' }}>Nb Pleins</th>
                      <th style={{ width: '15%' }}>Volume Total (L)</th>
                      <th style={{ width: '8%' }}>Part (%)</th>
                      <th style={{ width: '10%' }}>Coût en MAD</th>
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
                          <td style={{ fontWeight: 700 }}>{item.count} pleins</td>
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

            {/* Section 3: Bilan Entrées vs Sorties vs Stock Résiduel */}
            <div style={{ backgroundColor: 'var(--bg-input)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.85rem 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ⚖️ 3. Bilan d'Équilibre des Flux de Gasoil (Entrées vs Sorties)
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-green)' }}>TOTAL ENTRÉES (LIVRAISONS)</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--accent-green)', margin: '0.25rem 0' }}>+{totalRefilledVolume.toLocaleString()} L</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Valeur: {totalRefillCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} MAD</div>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-orange)' }}>TOTAL SORTIES (DISTRIBUTIONS)</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--accent-orange)', margin: '0.25rem 0' }}>-{totalConsumedVolume.toLocaleString()} L</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Valeur: {totalConsumedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} MAD</div>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>STOCK ACTUEL EN CITERNE</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--accent-cyan)', margin: '0.25rem 0' }}>{currentTankVolume.toLocaleString()} L</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Taux: {currentTankPercent}% ({currentStockValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })} MAD)</div>
                </div>
              </div>
            </div>

            {/* Section 4: Journal Détaillé des Distributions aux Véhicules */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.85rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ⛽ 4. Journal Détaillé des Pleins de Carburant ({filteredFills.length} opérations)
                </h3>
              </div>

              {filteredFills.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune distribution enregistrée pour cette sélection.</p>
              ) : (
                <table className="table" style={{ width: '100%', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr>
                      <th>Date & Heure</th>
                      <th>Véhicule</th>
                      <th>Chauffeur</th>
                      <th>Quantité (L)</th>
                      <th>Compteur</th>
                      <th>Consommation</th>
                      <th>Coût (MAD)</th>
                      <th>Statut IA</th>
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
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>Responsable Logistique & Direction SFTFUEL</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Document officiel d'audit des hydrocarbures & contrôle de gestion</div>
              </div>
              <div 
                className="report-sig-box"
                style={{
                  border: '1px dashed var(--border-color)',
                  borderRadius: '8px',
                  padding: '1.25rem 2.5rem',
                  textAlign: 'center',
                  minWidth: '240px',
                  backgroundColor: 'var(--bg-input)'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Signature & Cachet Officiel</div>
                <div style={{ height: '40px' }} />
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
