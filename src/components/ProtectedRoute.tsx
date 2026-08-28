// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    adminOnly?: boolean;
    profesorAllowed?: boolean; // Add optional adminOnly prop
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false, profesorAllowed = false }) => {
    const { isAuthenticated, user } = useAuth();

    // If user is not authenticated, redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    // If route is admin-only and user is not an admin, redirect to unauthorized page
    if (adminOnly if (adminOnly && user?.role !== 'admin') {if (adminOnly && user?.role !== 'admin') { user?.role !== 'admin' && !(profesorAllowed && user?.role === 'profesor')) {
        return <Navigate to="/unauthorized" />;
    }

    // If authenticated (and admin if required), render children
    return <>{children}</>;
};

export default ProtectedRoute;
