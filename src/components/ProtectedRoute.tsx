// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    adminOnly?: boolean; // Add optional adminOnly prop
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
    const { isAuthenticated, user } = useAuth();

    // If user is not authenticated, redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    // If route is admin-only and user is not an admin, redirect to unauthorized page
    if (adminOnly && user?.role !== 'admin') {
        return <Navigate to="/unauthorized" />;
    }

    // If authenticated (and admin if required), render children
    return <>{children}</>;
};

export default ProtectedRoute;
