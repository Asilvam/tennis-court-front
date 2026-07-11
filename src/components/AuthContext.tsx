// src/context/AuthContext.tsx
import React, { useState, useEffect, ReactNode } from 'react';
import { AuthContext, User } from './auth-context';

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
