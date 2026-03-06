import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { Toaster } from './components/ui/sonner';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DonorDashboard from './pages/DonorDashboard';
import ReceiverDashboard from './pages/ReceiverDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import MetricsPage from './pages/MetricsPage';
import { Loader2 } from 'lucide-react';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFF0] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#228B22]" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  
  return children;
};

// Public Route (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFF0] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#228B22]" />
      </div>
    );
  }
  
  if (user) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  
  return children;
};

// Layout with Navbar
const DashboardLayout = ({ children }) => {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={
        <PublicRoute>
          <LandingPage />
        </PublicRoute>
      } />
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      } />
      
      {/* Donor Routes */}
      <Route path="/donor" element={
        <ProtectedRoute allowedRoles={['donor']}>
          <DashboardLayout>
            <DonorDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/donor/donations" element={
        <ProtectedRoute allowedRoles={['donor']}>
          <DashboardLayout>
            <DonorDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      {/* Receiver Routes */}
      <Route path="/receiver" element={
        <ProtectedRoute allowedRoles={['receiver']}>
          <DashboardLayout>
            <ReceiverDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/receiver/available" element={
        <ProtectedRoute allowedRoles={['receiver']}>
          <DashboardLayout>
            <ReceiverDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      {/* Volunteer Routes */}
      <Route path="/volunteer" element={
        <ProtectedRoute allowedRoles={['volunteer']}>
          <DashboardLayout>
            <VolunteerDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/volunteer/assignments" element={
        <ProtectedRoute allowedRoles={['volunteer']}>
          <DashboardLayout>
            <VolunteerDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardLayout>
            <AdminDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardLayout>
            <AdminDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/analytics" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardLayout>
            <AdminDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      {/* Metrics - accessible to all logged in users */}
      <Route path="/metrics" element={
        <ProtectedRoute>
          <DashboardLayout>
            <MetricsPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="App">
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
