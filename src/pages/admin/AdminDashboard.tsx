import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { TankVisualization } from '../../components/tank/TankVisualization';
import { BarrelCard } from '../../components/barrels/BarrelCard';
import { FuelFillForm } from '../../components/forms/FuelFillForm';
import { TankRefillForm } from '../../components/forms/TankRefillForm';
import { AddAgentDialog } from '../../components/forms/AddAgentDialog';
import { EditTankDialog } from '../../components/forms/EditTankDialog';
import { ConsumeDialog } from '../../components/barrels/ConsumeDialog';
import { RefillDialog } from '../../components/barrels/RefillDialog';
import { Barrel } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    tank, 
    barrels, 
    fuelFills, 
    vehicles, 
    drivers, 
    fetchDashboardData, 
    loading,
    updateTank,
    deleteTank
  } = useDataStore();

  const [fuelFillOpen, setFuelFillOpen] = useState(false);
  const [tankRefillOpen, setTankRefillOpen] = useState(false);
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [editTankOpen, setEditTankOpen] = useState(false);
  const [selectedConsumeBarrel, setSelectedConsumeBarrel] = useState<Barrel | null>(null);
  const [selectedRefillBarrel, setSelectedRefillBarrel] = useState<Barrel | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData(user.ownerId);
    }
  }, [user]);

  if (!user) return null;

  const handleDeleteTank = async (tankId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette citerne ? Cette action est irréversible.")) {
      try {
        await deleteTank(tankId, user!.ownerId);
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  // Calculate quick stats
  const totalFuelQuantity = fuelFills.reduce((sum, fill) => sum + fill.quantity, 0);
  const totalAnomalies = fuelFills.filter(fill => fill.anomalyDetected).length;
  const activeVehiclesCount = vehicles.filter(v => v.status === 'active').length;

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVehicleLabel = (vehId: string) => {
    const v = vehicles.find(veh => veh.id === vehId);
    return v ? `${v.brand} ${v.model} (${v.plateNumber})` : 'Véhicule inconnu';
  };

  const getDriverLabel = (drvId: string) => {
    const d = drivers.find(drv => drv.id === drvId);
    return d ? d.fullName : 'Chauffeur inconnu';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Action Buttons Row */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          className="btn btn-primary"
          onClick={() => setFuelFillOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 22v-4h18v4H3z M12 2v12 M7 8h10" /></svg>
          Enregistrer un plein de Gasoil
        </button>

        <button 
          className="btn btn-secondary"
          onClick={() => setTankRefillOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          Remplir la Citerne
        </button>

        <button 
          className="btn btn-secondary"
          onClick={() => setAddAgentOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
          Créer un Agent
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-3">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Volume de Carburant Distribué</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </div>
          <div className="card-value">{totalFuelQuantity.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sur {fuelFills.length} ravitaillements</p>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Véhicules Actifs</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
          </div>
          <div className="card-value">{activeVehiclesCount} / {vehicles.length}</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Flotte de transport active</p>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Anomalies Détectées</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <div className={`card-value ${totalAnomalies > 0 ? 'pulse-warn' : ''}`} style={{ color: totalAnomalies > 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
            {totalAnomalies}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Consommation ou kilométrages suspects</p>
        </div>
      </div>

      {/* Main Visuals & Logs Grid */}
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        
        {/* Left Side: Citerne visualization */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>
              Niveau de Citerne Principal (Gasoil)
            </h2>
            {tank && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn-icon"
                  onClick={() => setEditTankOpen(true)}
                  title="Modifier la citerne"
                  style={{ color: 'var(--accent-cyan)', background: 'transparent', border: 'none' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button
                  className="btn-icon"
                  onClick={() => handleDeleteTank(tank.id)}
                  title="Supprimer la citerne"
                  style={{ color: 'var(--accent-red)', background: 'transparent', border: 'none' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            )}
          </div>
          {tank ? (
            <TankVisualization 
              capacity={tank.capacity}
              currentVolume={tank.currentVolume}
              alertThreshold={tank.alertThreshold}
              width={200}
              height={300}
            />
          ) : (
            <div style={{ color: 'var(--text-secondary)' }}>Aucune citerne trouvée</div>
          )}
        </div>

        {/* Right Side: Oil Barrels (two types) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>
            Barils de Fluides & Huiles
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

      {/* Recent Activity Log */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
          Historique des 5 Derniers Pleins
        </h2>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement...</div>
        ) : fuelFills.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Aucun plein enregistré</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Véhicule</th>
                  <th>Chauffeur</th>
                  <th>Quantité</th>
                  <th>Kilométrage</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {fuelFills.slice(0, 5).map(f => (
                  <tr key={f.id}>
                    <td style={{ fontSize: '0.85rem' }}>{formatDate(f.createdAt)}</td>
                    <td style={{ fontWeight: 600 }}>{getVehicleLabel(f.vehicleId)}</td>
                    <td>{getDriverLabel(f.driverId)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{f.quantity} L</td>
                    <td>{f.mileage.toLocaleString()} km</td>
                    <td>
                      {f.anomalyDetected ? (
                        <span className="badge badge-danger" title={f.anomalyType || 'Anomaly'}>Anomalie</span>
                      ) : (
                        <span className="badge badge-success">Normal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog Modals */}
      {fuelFillOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setFuelFillOpen(false)}>&times;</button>
            <FuelFillForm 
              onSuccess={() => setFuelFillOpen(false)}
              onCancel={() => setFuelFillOpen(false)}
            />
          </div>
        </div>
      )}

      {tankRefillOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setTankRefillOpen(false)}>&times;</button>
            <TankRefillForm 
              onSuccess={() => setTankRefillOpen(false)}
              onCancel={() => setTankRefillOpen(false)}
            />
          </div>
        </div>
      )}

      {editTankOpen && tank && (
        <EditTankDialog
          isOpen={editTankOpen}
          onClose={() => setEditTankOpen(false)}
          tank={tank}
          onSave={async (updatedTank) => {
            await updateTank(updatedTank);
          }}
        />
      )}

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

      <AddAgentDialog 
        isOpen={addAgentOpen}
        onClose={() => setAddAgentOpen(false)}
      />

    </div>
  );
};
