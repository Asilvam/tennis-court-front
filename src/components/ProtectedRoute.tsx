// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useUser } from './UserContext'; // Assuming UserContext provides user information

interface ProtectedRouteProps {
    children: React.ReactNode;
    adminOnly?: boolean; // Add optional adminOnly prop
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
    const { token } = useAuth(); // Assuming token exists in useAuth
    const { userInfo } = useUser(); // Assuming userInfo contains the role

    // If user is not authenticated, redirect to login
    if (!token) {
        return <Navigate to="/login" />;
    }

    // If route is admin-only and user is not an admin, redirect to unauthorized page
    if (adminOnly && userInfo.role !== 'admin') {
        return <Navigate to="/unauthorized" />;
    }

    // If authenticated (and admin if required), render children
    return <>{children}</>;
};

export default ProtectedRoute;
