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
    if (user.role === 'admin') return '/admin';
    if (user.role === 'responsable') return '/manager';
    return '/agent';
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes Layout */}
        <Route element={<AppLayout />}>
          
          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/analytics" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'responsable']}>
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
            path="/admin/barrels" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <BarrelsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/revisions" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'responsable']}>
                <RevisionsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/repairs" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'responsable']}>
                <RepairsPage />
              </ProtectedRoute>
            } 
          />

          {/* Shared Reports (Admin & Manager) */}
          <Route 
            path="/admin/reports" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'responsable']}>
                <ReportsPage />
              </ProtectedRoute>
            } 
          />

          {/* Manager Routes */}
          <Route 
            path="/manager" 
            element={
              <ProtectedRoute allowedRoles={['responsable']}>
                <ManagerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/manager/accounts" 
            element={
              <ProtectedRoute allowedRoles={['responsable']}>
                <AccountsPage />
              </ProtectedRoute>
            } 
          />

          {/* Agent Routes */}
          <Route 
            path="/agent" 
            element={
              <ProtectedRoute allowedRoles={['agent']}>
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
