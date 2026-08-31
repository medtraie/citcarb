import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { VehiclesPage } from './pages/admin/VehiclesPage';
import { DriversPage } from './pages/admin/DriversPage';
import { BarrelsPage } from './pages/admin/BarrelsPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { ActiveAnalyticsPage } from './pages/admin/ActiveAnalyticsPage';
import { RevisionsPage } from './pages/admin/RevisionsPage';
import { RepairsPage } from './pages/admin/RepairsPage';
import { AgentsPage } from './pages/admin/AgentsPage';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import { AccountsPage } from './pages/manager/AccountsPage';
import { AgentDashboard } from './pages/agent/AgentDashboard';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { useAuthStore } from './store/authStore';

export const App: React.FC = () => {
  const { user } = useAuthStore();

  const getRedirectPath = () => {
    if (!user) return '/login';
    return '/admin';
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes Layout */}
        <Route element={<AppLayout />}>
          
          {/* Main Dashboard (Admin & Agent/User) */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'agent', 'responsable']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Admin-Only Sections (Hidden and Protected from User/Agent) */}
          <Route 
            path="/admin/analytics" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ActiveAnalyticsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/vehicles" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <VehiclesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/drivers" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DriversPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/agents" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AgentsPage />
              </ProtectedRoute>
            } 
          />

          {/* Shared Operations (Admin & Agent/User) */}
          <Route 
            path="/admin/barrels" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'agent', 'responsable']}>
                <BarrelsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/revisions" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'agent', 'responsable']}>
                <RevisionsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/repairs" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'agent', 'responsable']}>
                <RepairsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/reports" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'agent', 'responsable']}>
                <ReportsPage />
              </ProtectedRoute>
            } 
          />

          {/* Agent Quick Entry */}
          <Route 
            path="/agent" 
            element={
              <ProtectedRoute allowedRoles={['agent', 'admin', 'responsable']}>
                <AgentDashboard />
              </ProtectedRoute>
            } 
          />

        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to={getRedirectPath()} replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
