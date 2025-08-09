// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// 1. Define la estructura del objeto de usuario que usaremos en toda la app
export interface User {
    name: string;
    email: string;
    role: string;
    // Puedes agregar más campos que vengan del backend aquí
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    login: (userData: User, token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    const [user, setUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('userInfo');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            localStorage.setItem('userInfo', JSON.stringify(user));
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
        }
    }, [token, user]);

    const login = (userData: User, token: string) => {
        setUser(userData);
        setToken(token);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!token, user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
