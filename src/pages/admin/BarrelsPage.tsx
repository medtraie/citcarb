import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { BarrelCard } from '../../components/barrels/BarrelCard';
import { ConsumeDialog } from '../../components/barrels/ConsumeDialog';
import { RefillDialog } from '../../components/barrels/RefillDialog';
import { AddBarrelDialog } from '../../components/barrels/AddBarrelDialog';
import { Barrel } from '../../types';

export const BarrelsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    barrels, 
    barrelMovements, 
    vehicles, 
    fetchBarrels, 
    fetchBarrelMovements, 
    fetchVehicles, 
    addBarrel,
    deleteBarrel,
    loading 
  } = useDataStore();

  const [selectedConsumeBarrel, setSelectedConsumeBarrel] = useState<Barrel | null>(null);
  const [selectedRefillBarrel, setSelectedRefillBarrel] = useState<Barrel | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBarrels(user.ownerId);
      fetchBarrelMovements(user.ownerId);
      fetchVehicles(user.ownerId);
    }
  }, [user]);

  if (!user) return null;

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBarrelName = (bId: string) => {
    const b = barrels.find(bar => bar.id === bId);
    return b ? b.name : 'Baril inconnu';
  };

  const getVehiclePlate = (vId?: string) => {
    if (!vId) return '-';
    const v = vehicles.find(veh => veh.id === vId);
    return v ? `${v.brand} ${v.model} (${v.plateNumber})` : 'Véhicule inconnu';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Cards Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
            Statut des Barils d'Huile
          </h2>
          <button 
            className="btn btn-primary"
            onClick={() => setIsAddDialogOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Ajouter un baril
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          {barrels.map(b => (
            <div key={b.id} style={{ flex: '1 1 240px', maxWidth: '300px' }}>
              <BarrelCard 
                barrel={b} 
                onConsume={() => setSelectedConsumeBarrel(b)}
                onRefill={() => setSelectedRefillBarrel(b)}
                onDelete={() => {
                  if (window.confirm(`Êtes-vous sûr de vouloir supprimer le baril "${b.name}" ?`)) {
                    deleteBarrel(b.id, user.ownerId);
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Movements Log Section */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Historique des Mouvements de Fluides (Huiles & Hydraulique)
        </h2>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement...</div>
        ) : barrelMovements.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Aucun mouvement enregistré</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Baril</th>
                  <th>Type d'Opération</th>
                  <th>Quantité</th>
                  <th>Véhicule Destinataire</th>
                  <th>Opérateur</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {barrelMovements.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontSize: '0.85rem' }}>{formatDate(m.createdAt)}</td>
                    <td style={{ fontWeight: 600 }}>{getBarrelName(m.barrelId)}</td>
                    <td>
                      {m.type === 'refill' ? (
                        <span className="badge badge-success">Ravitaillement</span>
                      ) : (
                        <span className="badge badge-warning" style={{ backgroundColor: 'rgba(253, 126, 20, 0.12)', color: 'var(--accent-orange)' }}>Consommation</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: m.type === 'refill' ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                      {m.type === 'refill' ? '+' : '-'}{m.quantity} L
                    </td>
                    <td>{getVehiclePlate(m.vehicleId)}</td>
                    <td>{m.performedBy || 'Agent'}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

      <AddBarrelDialog 
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={addBarrel}
        ownerId={user.ownerId}
      />

    </div>
  );
};
