import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { FuelFillForm } from '../../components/forms/FuelFillForm';
import { ConsumeDialog } from '../../components/barrels/ConsumeDialog';
import { Barrel } from '../../types';

export const AgentDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    barrels, 
    fuelFills, 
    barrelMovements,
    fetchBarrels, 
    fetchFuelFills,
    fetchBarrelMovements,
    fetchVehicles,
    fetchDrivers,
    loading 
  } = useDataStore();

  const [fuelFillOpen, setFuelFillOpen] = useState(false);
  const [selectedBarrel, setSelectedBarrel] = useState<Barrel | null>(null);

  useEffect(() => {
    if (user) {
      fetchBarrels(user.ownerId);
      fetchFuelFills(user.ownerId);
      fetchBarrelMovements(user.ownerId);
      fetchVehicles(user.ownerId);
      fetchDrivers(user.ownerId);
    }
  }, [user]);

  if (!user) return null;

  const handleOpenConsume = (type: 'hydraulique' | 'motor_oil') => {
    const target = barrels.find(b => b.type === type);
    if (target) {
      setSelectedBarrel(target);
    } else {
      alert(`Aucun baril de type ${type === 'hydraulique' ? 'Hydraulique' : 'Huile Moteur'} n'est configuré.`);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Filter fuel fills performed by current agent
  const recentFills = fuelFills
    .filter(f => f.performedBy === user.id)
    .slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      
      {/* Welcome banner card */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(0, 210, 255, 0.05) 100%)',
        padding: '2rem',
        borderLeft: '5px solid var(--accent-cyan)'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Bonjour, {user.fullName} !
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Sélectionnez une opération ci-dessous pour enregistrer une distribution de gasoil ou de fluides.
        </p>
      </div>

      {/* Main Action Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        
        {/* Gasoil Action */}
        <div 
          onClick={() => setFuelFillOpen(true)}
          style={{
            cursor: 'pointer',
            border: '2px dashed var(--accent-cyan)',
            backgroundColor: 'rgba(0, 210, 255, 0.02)',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.backgroundColor = 'rgba(0, 210, 255, 0.05)';
            e.currentTarget.style.borderColor = 'var(--accent-cyan)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.backgroundColor = 'rgba(0, 210, 255, 0.02)';
            e.currentTarget.style.borderColor = 'rgba(0, 210, 255, 0.4)';
          }}
        >
          <div style={{
            backgroundColor: 'var(--accent-cyan-glow)',
            color: 'var(--accent-cyan)',
            padding: '16px',
            borderRadius: '50%',
            display: 'flex'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 22v-4h18v4H3z M12 2v12 M7 8h10" /></svg>
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Enregistrer un Plein Gasoil</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Distribution directe depuis la citerne principale</p>
          </div>
        </div>

        {/* Hydraulique Action */}
        <div 
          onClick={() => handleOpenConsume('hydraulique')}
          style={{
            cursor: 'pointer',
            border: '2px dashed var(--accent-orange)',
            backgroundColor: 'rgba(253, 126, 20, 0.02)',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.backgroundColor = 'rgba(253, 126, 20, 0.05)';
            e.currentTarget.style.borderColor = 'var(--accent-orange)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.backgroundColor = 'rgba(253, 126, 20, 0.02)';
            e.currentTarget.style.borderColor = 'rgba(253, 126, 20, 0.4)';
          }}
        >
          <div style={{
            backgroundColor: 'var(--accent-orange-glow)',
            color: 'var(--accent-orange)',
            padding: '16px',
            borderRadius: '50%',
            display: 'flex'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path></svg>
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Consommer Huile Hydraulique</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sélectionner un véhicule et un chauffeur</p>
          </div>
        </div>

        {/* Engine Oil Action */}
        <div 
          onClick={() => handleOpenConsume('motor_oil')}
          style={{
            cursor: 'pointer',
            border: '2px dashed var(--accent-orange)',
            backgroundColor: 'rgba(253, 126, 20, 0.02)',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.backgroundColor = 'rgba(253, 126, 20, 0.05)';
            e.currentTarget.style.borderColor = 'var(--accent-orange)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.backgroundColor = 'rgba(253, 126, 20, 0.02)';
            e.currentTarget.style.borderColor = 'rgba(253, 126, 20, 0.4)';
          }}
        >
          <div style={{
            backgroundColor: 'var(--accent-orange-glow)',
            color: 'var(--accent-orange)',
            padding: '16px',
            borderRadius: '50%',
            display: 'flex'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path></svg>
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Consommer Huile Moteur</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sélectionner un véhicule et un chauffeur</p>
          </div>
        </div>

      </div>

      {/* Agent's activity history */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Vos dernières saisies de la journée
        </h2>
        
        {loading ? (
          <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement...</p>
        ) : recentFills.length === 0 ? (
          <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Aucun plein enregistré aujourd'hui.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentFills.map(f => (
              <div 
                key={f.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: '10px',
                  borderLeft: `4px solid ${f.anomalyDetected ? 'var(--accent-red)' : 'var(--accent-cyan)'}`
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(f.createdAt)}</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    Quantité de gasoil distribuée: {f.quantity} L
                  </div>
                  {f.anomalyDetected && (
                    <span style={{ color: 'var(--accent-red)', fontSize: '0.75rem', fontWeight: 600 }}>
                      ⚠️ {f.anomalyType}
                    </span>
                  )}
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Compteur: {f.mileage.toLocaleString()} km
                </div>
              </div>
            ))}
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

      {selectedBarrel && (
        <ConsumeDialog 
          barrel={selectedBarrel}
          isOpen={!!selectedBarrel}
          onClose={() => setSelectedBarrel(null)}
        />
      )}

    </div>
  );
};
