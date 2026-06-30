import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Helper to determine title based on path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/admin/vehicles')) return 'Gestion des Véhicules';
    if (path.startsWith('/admin/drivers')) return 'Gestion des Chauffeurs';
    if (path.startsWith('/admin/barrels')) return 'Gestion des Barils d\'Huile';
    if (path.startsWith('/admin/reports')) return 'Rapports et Analyses';
    if (path.startsWith('/manager/accounts')) return 'Gestion des Comptes Agents';
    if (path.startsWith('/admin')) return 'Tableau de bord Admin';
    if (path.startsWith('/manager')) return 'Tableau de bord Manager';
    if (path.startsWith('/agent')) return 'Saisie Rapide Agent';
    return 'FuelFlow';
  };

  return (
    <div className="app-container">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      {/* Mobile background overlay when sidebar is open */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 98,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      <main className="main-content">
        <Navbar 
          title={getPageTitle()} 
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)} 
        />
        
        {/* Render nested routes */}
        <Outlet />
      </main>
    </div>
  );
};
