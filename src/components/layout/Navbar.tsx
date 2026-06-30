import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { supabase } from '../../lib/supabase';
import { AppNotification } from '../../types';

interface NavbarProps {
  title: string;
  onMenuToggle: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ title, onMenuToggle }) => {
  const { user } = useAuthStore();
  const { 
    notifications, 
    fetchNotifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead 
  } = useDataStore();
  
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch initial notifications
  useEffect(() => {
    if (user) {
      fetchNotifications(user.ownerId);
    }
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user || user.ownerId === 'demo_admin_uid') return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `owner_id=eq.${user.ownerId}`
        },
        (payload) => {
          const newNot = payload.new as any;
          // Refresh list to pull latest
          fetchNotifications(user.ownerId);
          
          // Browser Notification API
          if (Notification.permission === 'granted') {
            new Notification(newNot.title, { body: newNot.message });
          }
        }
      )
      .subscribe();

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Close panel on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = async () => {
    if (user) {
      await markAllNotificationsAsRead(user.ownerId);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    });
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'low_stock':
        return (
          <div style={{ backgroundColor: 'var(--accent-orange-glow)', color: 'var(--accent-orange)', padding: '6px', borderRadius: '50%', display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
        );
      case 'consumption_anomaly':
        return (
          <div style={{ backgroundColor: 'var(--accent-red-glow)', color: 'var(--accent-red)', padding: '6px', borderRadius: '50%', display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
        );
      default:
        return (
          <div style={{ backgroundColor: 'var(--accent-cyan-glow)', color: 'var(--accent-cyan)', padding: '6px', borderRadius: '50%', display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
        );
    }
  };

  return (
    <header style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={onMenuToggle}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '1.5rem',
            cursor: 'pointer',
            display: 'none',
          }}
          className="mobile-nav-toggle"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{title}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }} ref={panelRef}>
        <div 
          onClick={() => setPanelOpen(!panelOpen)}
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.2s'
          }}
          className="notification-bell-container"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </div>

        {panelOpen && (
          <div style={{
            position: 'absolute',
            top: '55px',
            right: 0,
            width: '360px',
            maxHeight: '450px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 200,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(36, 53, 85, 0.2)'
            }}>
              <span style={{ fontWeight: 600 }}>Notifications</span>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Aucune notification.
                </div>
              ) : (
                notifications.map(n => (
                  <div 
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      backgroundColor: n.isRead ? 'transparent' : 'rgba(0, 210, 255, 0.04)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-input)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = n.isRead ? 'transparent' : 'rgba(0, 210, 255, 0.04)'}
                  >
                    {getIconForType(n.type)}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: n.isRead ? 500 : 700, color: 'var(--text-primary)' }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {n.message}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {formatDate(n.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
