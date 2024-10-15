// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import {useAuth} from "./AuthContext.tsx";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { token } = useAuth();
    if (!token) {
        return <Navigate to="/login" />;
    }
    return children;
};

export default ProtectedRoute;