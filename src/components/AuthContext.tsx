// src/context/AuthContext.tsx
import React, { useState, useEffect, ReactNode } from 'react';
import { AuthContext, User } from './auth-context';
import axios from 'axios';
import { MembershipAccess } from '../utils/memberPayments';

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

    useEffect(() => {
        if (!token) return;
        let active = true;
        const refresh = async () => {
            try {
                const { data } = await axios.get<MembershipAccess>(`${import.meta.env.VITE_API_URL}/membership-billing/me/access`, {
                    headers: { Authorization: `Bearer ${token}` }, timeout: 15000,
                });
                if (active) setUser(previous => previous ? {
                    ...previous, name: data.name, role: data.role, financiallyRestricted: data.financiallyRestricted,
                } : previous);
            } catch { /* A transient outage must not erase the session; the backend still enforces permissions. */ }
        };
        void refresh();
        const interval = window.setInterval(refresh, 60000);
        window.addEventListener('focus', refresh);
        const intercept = axios.interceptors.response.use(response => response, error => {
            if (active && error.response?.data?.code === 'PAYMENTS_ONLY')
                setUser(previous => previous ? { ...previous, financiallyRestricted: true } : previous);
            return Promise.reject(error);
        });
        return () => { active = false; window.clearInterval(interval); window.removeEventListener('focus', refresh); axios.interceptors.response.eject(intercept); };
    }, [token]);

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
