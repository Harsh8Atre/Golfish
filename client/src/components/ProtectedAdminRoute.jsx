import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedAdminRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to normal dashboard if not an admin
  if (user.role !== 'ADMIN' && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Proceed to admin nested routes
  return <Outlet />;
};

export default ProtectedAdminRoute;
