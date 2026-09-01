import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Authentication Routes */}
        <Route path="/signUp" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />

        {/* User / Student Dashboard */}
        <Route path="/user-dashboard" element={<UserDashboard />} />
        <Route path="/dsa_trackr" element={<Navigate to="/user-dashboard" replace />} />
        <Route path="/dashboard" element={<Navigate to="/user-dashboard" replace />} />

        {/* Admin Dashboard */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}