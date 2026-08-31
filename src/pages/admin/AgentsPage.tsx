import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { AddAgentDialog } from '../../components/forms/AddAgentDialog';

interface AgentProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'agent';
  permissions: {
    can_refill: boolean;
    can_add_vehicle: boolean;
    can_add_driver: boolean;
    can_view_reports: boolean;
  };
  is_completed: boolean;
  created_at?: string;
}

export const AgentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAgents();
    }
  }, [user]);

  const fetchAgents = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    // Mode Démo / Offline
    if (user.ownerId === 'demo_admin_uid' || user.email.endsWith('@demo.com')) {
      const local = localStorage.getItem('fuel_flow_demo_agents');
      if (local) {
        setAgents(JSON.parse(local));
      } else {
        const defaultAgents: AgentProfile[] = [
          {
            id: 'demo_user12_uid',
            email: 'user12@gmail.com',
            full_name: 'Utilisateur / Agent',
            role: 'agent',
            permissions: { can_refill: true, can_add_vehicle: false, can_add_driver: false, can_view_reports: true },
            is_completed: true,
            created_at: new Date().toISOString()
          }
        ];
        localStorage.setItem('fuel_flow_demo_agents', JSON.stringify(defaultAgents));
        setAgents(defaultAgents);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('owner_id', user.ownerId || user.id)
        .eq('role', 'agent')
        .order('created_at', { ascending: false });

      if (err) throw err;

      const mappedAgents: AgentProfile[] = (data || []).map(a => {
        const defaultPerms = { can_refill: true, can_add_vehicle: false, can_add_driver: false, can_view_reports: true };
        let parsed = defaultPerms;
        if (a.permissions && typeof a.permissions === 'object') {
          parsed = { ...defaultPerms, ...a.permissions };
        }
        return {
          id: a.id,
          email: a.email || '',
          full_name: a.full_name || 'Utilisateur / Agent',
          role: 'agent',
          permissions: parsed,
          is_completed: a.is_completed ?? true,
          created_at: a.created_at
        };
      });

      setAgents(mappedAgents);
    } catch (err: any) {
      setError(err.message || 'Impossible de récupérer la liste des agents.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAgent = async (agentId: string, email: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le compte de l'agent "${email}" ?`)) return;

    if (user?.ownerId === 'demo_admin_uid' || user?.email.endsWith('@demo.com')) {
      const nextAgents = agents.filter(a => a.id !== agentId);
      localStorage.setItem('fuel_flow_demo_agents', JSON.stringify(nextAgents));
      setAgents(nextAgents);
      return;
    }

    try {
      const { error: delErr } = await supabase.from('profiles').delete().eq('id', agentId);
      if (delErr) throw delErr;
      await fetchAgents();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression de l'agent.");
    }
  };

  const filteredAgents = agents.filter(a => 
    a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            Gestion des Agents & Utilisateurs
          </h1>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Contrôle des comptes subordonnés, accès restreints et synchronisation en temps réel avec votre flotte.
          </span>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={() => setIsAddModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', fontWeight: 600 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          + Créer un Agent
        </button>
      </div>

      {/* KPI Info Cards */}
      <div className="grid grid-3">
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-cyan)' }}>
          <div className="card-header">
            <span className="card-title">Agents Assignés</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div className="card-value">{agents.length}</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Comptes actifs connectés à votre citerne</p>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-green)' }}>
          <div className="card-header">
            <span className="card-title">Synchronisation Flotte</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          </div>
          <div className="card-value" style={{ color: 'var(--accent-green)' }}>100% Temps Réel</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Partage instantané des niveaux et pleins</p>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-orange)' }}>
          <div className="card-header">
            <span className="card-title">Niveau de Sécurité</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <div className="card-value" style={{ color: 'var(--accent-orange)', fontSize: '1.4rem' }}>Lecture & Saisie</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Sections sensibles & suppression verrouillées</p>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'var(--accent-red-glow)',
          color: 'var(--accent-red)',
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          fontSize: '0.9rem',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          {error}
        </div>
      )}

      {/* Main Table Card */}
      <div className="card" style={{ padding: '1.5rem' }}>
        
        {/* Search Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-secondary)' }}>
            Liste des Comptes Utilisateurs ({filteredAgents.length})
          </h2>

          <div style={{ position: 'relative', width: '280px' }}>
            <input 
              type="text" 
              className="form-control"
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement des agents...</div>
        ) : filteredAgents.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {searchQuery ? 'Aucun agent ne correspond à votre recherche.' : 'Aucun compte agent créé pour le moment. Cliquez sur "+ Créer un Agent" pour commencer.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Nom & Utilisateur</th>
                  <th>E-mail de connexion</th>
                  <th>Rôle attribué</th>
                  <th>Permissions & Accès</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(56, 189, 248, 0.15)',
                          color: 'var(--accent-cyan)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem'
                        }}>
                          {a.full_name ? a.full_name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Subordonné à votre compte</div>
                        </div>
                      </div>
                    </td>
                    
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent-cyan)', backgroundColor: 'var(--bg-input)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {a.email}
                      </span>
                    </td>

                    <td>
                      <span style={{ 
                        backgroundColor: 'rgba(56, 189, 248, 0.12)', 
                        color: 'var(--accent-cyan)', 
                        padding: '0.25rem 0.65rem', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        border: '1px solid rgba(56, 189, 248, 0.25)'
                      }}>
                        Agent de Terrain
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', padding: '2px 8px', borderRadius: '4px' }}>
                          ✓ Saisie Plein & Barils
                        </span>
                        <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', padding: '2px 8px', borderRadius: '4px' }}>
                          ✓ Rapports PDF
                        </span>
                        <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', padding: '2px 8px', borderRadius: '4px' }}>
                          🔒 Sans suppression/édition
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                        Actif & Synchronisé
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        title="Supprimer ce compte"
                        onClick={() => handleDeleteAgent(a.id, a.email)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Agent Modal */}
      {isAddModalOpen && (
        <AddAgentDialog 
          isOpen={isAddModalOpen} 
          onClose={() => {
            setIsAddModalOpen(false);
            fetchAgents();
          }} 
        />
      )}

    </div>
  );
};
