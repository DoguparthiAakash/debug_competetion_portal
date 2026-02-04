import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import LandingPage from './pages/LandingPage';
import RegistrationPage from './pages/RegistrationPage';
import ContestPage from './pages/ContestPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

/* ══════════════════════════════════════════════════════════
   PROTECTED ROUTE - Redirects to login if not authenticated
   ══════════════════════════════════════════════════════════ */
function ProtectedRoute({ children }) {
  const token = sessionStorage.getItem('adminToken');

  console.log('[ProtectedRoute] Checking auth...', {
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'null'
  });

  if (!token) {
    console.log('[ProtectedRoute] No token found, redirecting to /admin');
    return <Navigate to="/admin" replace />;
  }

  console.log('[ProtectedRoute] Token found, rendering dashboard');
  return children;
}

/* ══════════════════════════════════════════════════════════
   ADMIN ROUTE - Redirects to dashboard if already authenticated
   ══════════════════════════════════════════════════════════ */
function AdminRoute({ children }) {
  const token = sessionStorage.getItem('adminToken');

  console.log('[AdminRoute] Checking auth...', {
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'null'
  });

  if (token) {
    console.log('[AdminRoute] Token found, redirecting to /admin/dashboard');
    return <Navigate to="/admin/dashboard" replace />;
  }

  console.log('[AdminRoute] No token, showing login page');
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Student Flow ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/contest" element={<ContestPage />} />

        {/* ── Admin Flow ── */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminLogin />
          </AdminRoute>
        } />
        <Route path="/admin/dashboard" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
