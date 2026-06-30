import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

interface AddAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddAgentDialog: React.FC<AddAgentDialogProps> = ({ isOpen, onClose }) => {
  const { addAgent } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setSubmitting(true);
    try {
      await addAgent(email, password);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setEmail('');
        setPassword('');
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'ajout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <button className="modal-close" onClick={onClose} disabled={submitting}>&times;</button>
        
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
          Créer un compte Agent
        </h2>

        {success ? (
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: 'var(--accent-green)',
            padding: '1rem',
            borderRadius: '8px',
            textAlign: 'center',
            marginBottom: '1rem',
            fontWeight: 500
          }}>
            Compte agent créé avec succès !
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {error && (
              <div style={{
                backgroundColor: 'var(--accent-red-glow)',
                color: 'var(--accent-red)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email de l'agent</label>
              <input 
                type="email" 
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@example.com"
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mot de passe provisoire</label>
              <input 
                type="password" 
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                required
                disabled={submitting}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ marginTop: '1rem', padding: '0.75rem', display: 'flex', justifyContent: 'center' }}
              disabled={submitting}
            >
              {submitting ? 'Création en cours...' : 'Créer l\'Agent'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
