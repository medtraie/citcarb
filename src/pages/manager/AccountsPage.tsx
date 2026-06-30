import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

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
}

export const AccountsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite Agent Form Fields
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [canRefill, setCanRefill] = useState(true);
  const [canViewReports, setCanViewReports] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAgents();
    }
  }, [user]);

  const fetchAgents = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    if (user.ownerId === 'demo_admin_uid') {
      // Load mock agents from localStorage
      const local = localStorage.getItem('fuel_flow_demo_agents');
      if (local) {
        setAgents(JSON.parse(local));
      } else {
        const defaultAgents: AgentProfile[] = [
          {
            id: 'demo_agent_uid',
            email: 'agent@demo.com',
            full_name: 'Agent de Carburant',
            role: 'agent',
            permissions: { can_refill: true, can_add_vehicle: false, can_add_driver: false, can_view_reports: false },
            is_completed: true
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
        .eq('owner_id', user.ownerId)
        .eq('role', 'agent')
        .order('full_name');

      if (err) throw err;

      const mappedAgents: AgentProfile[] = (data || []).map(a => {
        const defaultPerms = { can_refill: true, can_add_vehicle: false, can_add_driver: false, can_view_reports: false };
        let parsed = defaultPerms;
        if (a.permissions && typeof a.permissions === 'object') {
          parsed = { ...defaultPerms, ...a.permissions };
        }
        return {
          id: a.id,
          email: a.email || '',
          full_name: a.full_name || 'Nouveau Membre',
          role: 'agent',
          permissions: parsed,
          is_completed: a.is_completed ?? true
        };
      });

      setAgents(mappedAgents);
    } catch (err: any) {
      setError(err.message || 'Impossible de récupérer la liste des agents.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (agentId: string, permissionKey: keyof AgentProfile['permissions']) => {
    if (!user) return;

    const updatedAgents = agents.map(a => {
      if (a.id === agentId) {
        const nextPerms = {
          ...a.permissions,
          [permissionKey]: !a.permissions[permissionKey]
        };
        return { ...a, permissions: nextPerms };
      }
      return a;
    });

    setAgents(updatedAgents);

    if (user.ownerId === 'demo_admin_uid') {
      localStorage.setItem('fuel_flow_demo_agents', JSON.stringify(updatedAgents));
      return;
    }

    try {
      const targetAgent = updatedAgents.find(a => a.id === agentId);
      if (targetAgent) {
        const { error: patchErr } = await supabase
          .from('profiles')
          .update({ permissions: targetAgent.permissions })
          .eq('id', agentId);
        
        if (patchErr) throw patchErr;
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour des permissions.');
      fetchAgents(); // Rollback
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSubmitting(true);

    const lowercaseEmail = email.trim().toLowerCase();

    if (user.ownerId === 'demo_admin_uid') {
      const newAgent: AgentProfile = {
        id: `demo_agent_${Date.now()}`,
        email: lowercaseEmail,
        full_name: fullName,
        role: 'agent',
        permissions: {
          can_refill: canRefill,
          can_add_vehicle: false,
          can_add_driver: false,
          can_view_reports: canViewReports
        },
        is_completed: true
      };

      const nextAgents = [...agents, newAgent];
      localStorage.setItem('fuel_flow_demo_agents', JSON.stringify(nextAgents));
      setAgents(nextAgents);
      setModalOpen(false);
      setSubmitting(false);
      setEmail('');
      setFullName('');
      return;
    }

    try {
      // Create profile in Supabase profiles table.
      // Wait, in real Supabase, users are invited via Auth, but creating a placeholder profile allows them to login or complete sign up.
      // Let's create the row in profiles table.
      const payload = {
        id: 'agent_' + Date.now().toString(36), // Temporary id, will sync on auth login if needed, or standard insert
        email: lowercaseEmail,
        full_name: fullName,
        role: 'agent',
        owner_id: user.ownerId,
        is_completed: false,
        permissions: {
          can_refill: canRefill,
          can_add_vehicle: false,
          can_add_driver: false,
          can_view_reports: canViewReports
        }
      };

      const { error: insErr } = await supabase.from('profiles').insert(payload);
      if (insErr) throw insErr;

      await fetchAgents();
      setModalOpen(false);
      setEmail('');
      setFullName('');
    } catch (err: any) {
      setError(err.message || 'Impossible d\'ajouter l\'agent. Vérifiez l\'adresse e-mail.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet agent ?')) return;

    if (user?.ownerId === 'demo_admin_uid') {
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
      setError(err.message || 'Erreur lors de la suppression de l\'agent.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Gestion des comptes agents ({agents.length} agents)
        </h2>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Créer un compte Agent
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'var(--accent-red-glow)',
          color: 'var(--accent-red)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          fontSize: '0.875rem',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement...</div>
      ) : agents.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Aucun agent de saisie configuré pour le moment.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Nom Complet</th>
                <th>E-mail</th>
                <th style={{ textAlign: 'center' }}>Peut Distribuer</th>
                <th style={{ textAlign: 'center' }}>Peut Voir Rapports</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.full_name}</td>
                  <td>{a.email}</td>
                  
                  {/* Can Refill / Saisie checkbox */}
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={a.permissions.can_refill}
                      onChange={() => handleTogglePermission(a.id, 'can_refill')}
                      style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--accent-cyan)' }}
                    />
                  </td>

                  {/* Can View Reports checkbox */}
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={a.permissions.can_view_reports}
                      onChange={() => handleTogglePermission(a.id, 'can_view_reports')}
                      style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--accent-cyan)' }}
                    />
                  </td>

                  {/* Actions column */}
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                      onClick={() => handleDeleteAgent(a.id)}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setModalOpen(false)}>&times;</button>
            
            <h2>Nouveau profil Agent</h2>
            
            <form onSubmit={handleInviteSubmit} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Nom Complet</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Ex: Omar Chafik"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Adresse E-mail</label>
                <input 
                  type="email" 
                  className="form-control"
                  placeholder="Ex: omar.chafik@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', margin: '1.5rem 0 0.75rem' }}>
                Permissions initiales
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="checkbox" 
                    checked={canRefill} 
                    onChange={(e) => setCanRefill(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-cyan)' }}
                  />
                  Autoriser la saisie des pleins et consommations
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="checkbox" 
                    checked={canViewReports} 
                    onChange={(e) => setCanViewReports(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-cyan)' }}
                  />
                  Autoriser la consultation des rapports Excel/PDF
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setModalOpen(false)}
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  {submitting ? 'Création...' : 'Créer le profil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
