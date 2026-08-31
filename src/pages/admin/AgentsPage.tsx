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
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

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
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de l'agent "${email}" ?`)) return;

    if (user?.ownerId === 'demo_admin_uid' || user?.email.endsWith('@demo.com')) {
      const nextAgents = agents.filter(a => a.id !== agentId);
      localStorage.setItem('fuel_flow_demo_agents', JSON.stringify(nextAgents));
      setAgents(nextAgents);
      if (selectedAgent?.id === agentId) setSelectedAgent(null);
      return;
    }

    try {
      const { error: delErr } = await supabase.from('profiles').delete().eq('id', agentId);
      if (delErr) throw delErr;
      if (selectedAgent?.id === agentId) setSelectedAgent(null);
      await fetchAgents();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression de l'agent.");
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const filteredAgents = agents.filter(a => 
    a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Page Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1.25rem',
        padding: '0.25rem 0'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 210, 255, 0.12)',
              border: '1px solid rgba(0, 210, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Gestion des Agents & Utilisateurs
              </h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                Administration des accès subordonnés, saisie de terrain et synchronisation directe de la flotte.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            className="btn"
            onClick={fetchAgents}
            disabled={loading}
            title="Actualiser la liste"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.65rem 1rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: loading ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s' }}><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            Actualiser
          </button>

          <button 
            className="btn btn-primary" 
            onClick={() => setIsAddModalOpen(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.6rem', 
              padding: '0.65rem 1.4rem', 
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(0, 210, 255, 0.25)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + Créer un Agent
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-3" style={{ gap: '1.25rem' }}>
        <div className="card" style={{ 
          padding: '1.5rem', 
          borderLeft: '4px solid var(--accent-cyan)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Agents Actifs
            </span>
            <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'rgba(0, 210, 255, 0.1)', color: 'var(--accent-cyan)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {agents.length} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>compte{agents.length > 1 ? 's' : ''}</span>
          </div>
          <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Liés au compte principal de votre citerne
          </div>
        </div>

        <div className="card" style={{ 
          padding: '1.5rem', 
          borderLeft: '4px solid var(--accent-green)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Synchronisation
            </span>
            <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-green)', marginBottom: '0.25rem' }}>
            100% Temps Réel
          </div>
          <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Partage instantané des pleins, stocks et barils
          </div>
        </div>

        <div className="card" style={{ 
          padding: '1.5rem', 
          borderLeft: '4px solid var(--accent-orange)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Niveau de Sécurité
            </span>
            <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-orange)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-orange)', marginBottom: '0.25rem' }}>
            Lecture & Saisie Seule
          </div>
          <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Suppression & modification d'anciens enregistrements verrouillées
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'var(--accent-red-glow)',
          color: 'var(--accent-red)',
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          fontSize: '0.9rem',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>{error}</span>
        </div>
      )}

      {/* Main Table Card */}
      <div className="card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
        
        {/* Table Toolbar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem', 
          flexWrap: 'wrap', 
          gap: '1rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Comptes Utilisateurs
            </h2>
            <span style={{ 
              backgroundColor: 'rgba(0, 210, 255, 0.1)', 
              color: 'var(--accent-cyan)', 
              padding: '0.2rem 0.6rem', 
              borderRadius: '12px', 
              fontSize: '0.8rem', 
              fontWeight: 700 
            }}>
              {filteredAgents.length}
            </span>
          </div>

          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <input 
              type="text" 
              className="form-control"
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                paddingLeft: '2.5rem', 
                paddingRight: searchQuery ? '2.5rem' : '1rem',
                fontSize: '0.875rem',
                borderRadius: '10px'
              }}
            />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(0, 210, 255, 0.2)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}></div>
            <div>Chargement des comptes agents...</div>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--bg-input)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {searchQuery ? 'Aucun agent ne correspond à votre recherche' : 'Aucun compte agent créé'}
            </h3>
            <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
              {searchQuery ? 'Essayez de modifier les termes de votre recherche.' : 'Créez votre premier compte subordonné pour permettre aux agents de terrain de saisir les pleins de carburant.'}
            </p>
            {!searchQuery && (
              <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                + Créer un compte Agent
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.75rem 1rem', width: '22%' }}>Agent / Utilisateur</th>
                  <th style={{ padding: '0.75rem 1rem', width: '22%' }}>E-mail de connexion</th>
                  <th style={{ padding: '0.75rem 1rem', width: '16%' }}>Rôle & Statut</th>
                  <th style={{ padding: '0.75rem 1rem', width: '28%' }}>Permissions & Accès</th>
                  <th style={{ padding: '0.75rem 1rem', width: '12%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map(a => (
                  <tr 
                    key={a.id}
                    style={{ 
                      backgroundColor: 'var(--bg-input)',
                      borderRadius: '12px',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    {/* User info */}
                    <td style={{ padding: '1rem', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          minWidth: '40px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(0, 210, 255, 0.15)',
                          color: 'var(--accent-cyan)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1rem',
                          border: '1px solid rgba(0, 210, 255, 0.25)'
                        }}>
                          {a.full_name ? a.full_name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            {a.full_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Subordonné à votre compte
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Email with copy button */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-card)', padding: '0.35rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                          {a.email}
                        </span>
                        <button 
                          onClick={() => handleCopyEmail(a.email)}
                          title="Copier l'email"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            color: copiedEmail === a.email ? 'var(--accent-green)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          {copiedEmail === a.email ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Role & Status */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
                        <span style={{ 
                          backgroundColor: 'rgba(0, 210, 255, 0.12)', 
                          color: 'var(--accent-cyan)', 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '20px', 
                          fontSize: '0.75rem', 
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          border: '1px solid rgba(0, 210, 255, 0.25)'
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle></svg>
                          Agent de Terrain
                        </span>
                        
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '5px', 
                          fontSize: '0.75rem', 
                          color: 'var(--accent-green)', 
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                          Actif & Synchronisé
                        </span>
                      </div>
                    </td>

                    {/* Permissions list */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.4rem' }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                            color: 'var(--accent-green)', 
                            padding: '3px 8px', 
                            borderRadius: '6px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                          }}>
                            ✓ Saisie Plein & Barils
                          </span>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            backgroundColor: 'rgba(0, 210, 255, 0.1)', 
                            color: 'var(--accent-cyan)', 
                            padding: '3px 8px', 
                            borderRadius: '6px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            border: '1px solid rgba(0, 210, 255, 0.2)'
                          }}>
                            ✓ Rapports PDF
                          </span>
                        </div>
                        <div>
                          <span style={{ 
                            fontSize: '0.72rem', 
                            backgroundColor: 'rgba(239, 68, 68, 0.08)', 
                            color: 'var(--accent-red)', 
                            padding: '2px 8px', 
                            borderRadius: '6px',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            🔒 Sans droit de suppression/édition
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '1rem', textAlign: 'right', borderTopRightRadius: '10px', borderBottomRightRadius: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                        <button 
                          className="btn"
                          style={{ 
                            padding: '0.4rem 0.75rem', 
                            fontSize: '0.8rem', 
                            backgroundColor: 'var(--bg-card)', 
                            border: '1px solid var(--border-color)', 
                            color: 'var(--text-primary)',
                            borderRadius: '8px'
                          }}
                          onClick={() => setSelectedAgent(a)}
                          title="Détails du compte"
                        >
                          Détails
                        </button>

                        <button 
                          className="btn btn-danger" 
                          style={{ 
                            padding: '0.4rem 0.75rem', 
                            fontSize: '0.8rem', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.35rem',
                            borderRadius: '8px'
                          }}
                          title="Supprimer ce compte"
                          onClick={() => handleDeleteAgent(a.id, a.email)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Agent Details Modal */}
      {selectedAgent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <button className="modal-close" onClick={() => setSelectedAgent(null)}>&times;</button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                backgroundColor: 'rgba(0, 210, 255, 0.15)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.3rem',
                border: '1px solid rgba(0, 210, 255, 0.25)'
              }}>
                {selectedAgent.full_name ? selectedAgent.full_name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedAgent.full_name}
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
                  {selectedAgent.email}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ backgroundColor: 'var(--bg-input)', padding: '1rem', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Statut & Rôle
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Agent de Saisie Terrain</span>
                  <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '0.85rem' }}>● Actif & Synchronisé</span>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-input)', padding: '1rem', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Permissions Accordées
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  <li>✓ Saisie rapide des pleins de gasoil (Citerne)</li>
                  <li>✓ Enregistrement de la consommation d'huile (Barils)</li>
                  <li>✓ Création de nouvelles réparations & révisions</li>
                  <li>✓ Consultation et export des rapports PDF</li>
                </ul>
              </div>

              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--accent-red)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Restrictions de Sécurité Appliquées
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Cet agent ne peut pas accéder aux modules stratégiques (Analytique Active IA, Véhicules, Chauffeurs) et ne possède aucun droit de modification ou de suppression sur les données enregistrées.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  className="btn" 
                  onClick={() => setSelectedAgent(null)}
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                >
                  Fermer
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteAgent(selectedAgent.id, selectedAgent.email)}
                >
                  Supprimer ce compte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
