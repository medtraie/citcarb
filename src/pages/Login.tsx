import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import logoImg from '../assets/logo.png';

export const Login: React.FC = () => {
  const { user, login, loading, error, checkSession } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect
  useEffect(() => {
    const checkUser = async () => {
      const activeUser = await checkSession();
      if (activeUser) {
        redirectUser(activeUser.role);
      }
    };
    checkUser();
  }, []);

  const redirectUser = (role: string) => {
    const from = (location.state as any)?.from?.pathname;
    if (from) {
      navigate(from, { replace: true });
      return;
    }
    navigate('/admin');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('Veuillez entrer votre adresse e-mail.');
      return;
    }

    if (!password) {
      setLocalError('Veuillez entrer votre mot de passe.');
      return;
    }

    try {
      const loggedUser = await login(email, password);
      redirectUser(loggedUser.role);
    } catch (err: any) {
      setLocalError(err.message || 'Authentification échouée. Veuillez réessayer.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Visual glowing design backgrounds */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        right: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 210, 255, 0.08) 0%, rgba(0,0,0,0) 70%)',
        zIndex: 1
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        left: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(253, 126, 20, 0.05) 0%, rgba(0,0,0,0) 70%)',
        zIndex: 1
      }} />

      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem 2rem',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
        zIndex: 10,
        textAlign: 'center',
        backdropFilter: 'blur(8px)'
      }}>
        <img 
          src={logoImg} 
          alt="FuelFlow Logo" 
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '16px',
            objectFit: 'cover',
            marginBottom: '1rem',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
          }}
        />
        
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem', color: '#fff' }}>
          FuelFlow
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Système de Gestion de Carburant & Fluides
        </p>

        {(localError || error) && (
          <div style={{
            backgroundColor: 'var(--accent-red-glow)',
            color: 'var(--accent-red)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            fontWeight: 500,
            textAlign: 'left',
            border: '1px solid rgba(239, 68, 68, 0.15)'
          }}>
            {localError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label className="form-label">Adresse E-mail</label>
            <input 
              type="email" 
              className="form-control"
              placeholder="votre.email@fuelleflow.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Mot de passe</label>
            </div>
            <input 
              type="password" 
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}>
          Mode Démo : <strong>admin@demo.com</strong> | <strong>responsable@demo.com</strong> | <strong>agent@demo.com</strong>
        </div>
      </div>
    </div>
  );
};
