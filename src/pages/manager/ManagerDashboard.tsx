import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { TankVisualization } from '../../components/tank/TankVisualization';
import { BarrelCard } from '../../components/barrels/BarrelCard';
import { ConsumeDialog } from '../../components/barrels/ConsumeDialog';
import { RefillDialog } from '../../components/barrels/RefillDialog';
import { Link } from 'react-router-dom';
import { Barrel } from '../../types';

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    tank, 
    barrels, 
    fuelFills, 
    vehicles, 
    fetchDashboardData, 
    loading 
  } = useDataStore();

  const [selectedConsumeBarrel, setSelectedConsumeBarrel] = useState<Barrel | null>(null);
  const [selectedRefillBarrel, setSelectedRefillBarrel] = useState<Barrel | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData(user.ownerId);
    }
  }, [user]);

  if (!user) return null;

  const totalFuelQuantity = fuelFills.reduce((sum, fill) => sum + fill.quantity, 0);
  const totalAnomalies = fuelFills.filter(fill => fill.anomalyDetected).length;
  const activeVehiclesCount = vehicles.filter(v => v.status === 'active').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Quick Access Actions Row */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link 
          to="/manager/accounts" 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M20 8v6"></path><path d="M23 11h-6"></path></svg>
          Gérer les Comptes Agents
        </Link>
        <Link 
          to="/admin/reports" 
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          Exporter le Résumé de Consommation
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-3">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Volume de gasoil distribué</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </div>
          <div className="card-value">{totalFuelQuantity.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Historique global de la flotte</p>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Véhicules Actifs</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
          </div>
          <div className="card-value">{activeVehiclesCount} / {vehicles.length}</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Véhicules opérationnels</p>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Anomalies de Consommation</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path 
                d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" 
                fill="rgba(245, 158, 11, 0.18)" 
                stroke="#F59E0B" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              <line x1="12" y1="9" x2="12" y2="13.5" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="12" cy="17" r="1.25" fill="#F59E0B" />
            </svg>
          </div>
          <div className={`card-value ${totalAnomalies > 0 ? 'pulse-warn' : ''}`} style={{ color: totalAnomalies > 0 ? '#F59E0B' : 'var(--text-primary)' }}>
            {totalAnomalies}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Alertes surconsommation</p>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        
        {/* Left Card: Citerne Level */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1.5rem', alignSelf: 'start' }}>
            Niveau de Citerne Principal (Gasoil)
          </h2>
          {tank ? (
            <TankVisualization 
              capacity={tank.capacity}
              currentVolume={tank.currentVolume}
              alertThreshold={tank.alertThreshold}
              width={200}
              height={280}
            />
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>Citerne non connectée</p>
          )}
        </div>

        {/* Right Card: Oils Barrels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
            Niveaux des Barils d'Huile
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {barrels.map(b => (
              <BarrelCard 
                key={b.id} 
                barrel={b} 
                onConsume={() => setSelectedConsumeBarrel(b)}
                onRefill={() => setSelectedRefillBarrel(b)}
              />
            ))}
          </div>
        </div>

      </div>

      {selectedConsumeBarrel && (
        <ConsumeDialog 
          barrel={selectedConsumeBarrel}
          isOpen={!!selectedConsumeBarrel}
          onClose={() => setSelectedConsumeBarrel(null)}
        />
      )}

      {selectedRefillBarrel && (
        <RefillDialog 
          barrel={selectedRefillBarrel}
          isOpen={!!selectedRefillBarrel}
          onClose={() => setSelectedRefillBarrel(null)}
        />
      )}

    </div>
  );
};
