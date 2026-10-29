import React, { useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { AuthContext, User } from './auth-context';
import axios from 'axios';
import { MembershipAccess } from '../utils/memberPayments';
import { currentSessionUnauthorized, SessionEndReason, tokenExpiry } from '../utils/authSession';

interface Session { token: string | null; user: User | null; reason: SessionEndReason | null }

function restoreSession(): Session {
    const token = localStorage.getItem('token');
    if (!token) return { token: null, user: null, reason: null };
    try {
        const user = JSON.parse(localStorage.getItem('userInfo') || 'null');
        const expiry = tokenExpiry(token);
        if (expiry && expiry > Date.now() && user && typeof user.email === 'string')
            return { token, user, reason: null };
    } catch { /* An invalid cached session must not mount protected views. */ }
    return { token: null, user: null, reason: 'expired' };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session>(restoreSession);
    const { token, user, reason } = session;
    const currentToken = useRef(token);

    const logout = useCallback((reason?: SessionEndReason) => {
        currentToken.current = null;
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        setSession({ token: null, user: null, reason: reason || null });
    }, []);

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
        let expiryTimer: number;
        const isCurrent = () => active && currentToken.current === token;
        const expire = () => { if (isCurrent()) logout('expired'); };
        const checkExpiry = (): boolean => {
            const remaining = (tokenExpiry(token) || 0) - Date.now();
            if (remaining <= 0) { expire(); return false; }
            window.clearTimeout(expiryTimer);
            expiryTimer = window.setTimeout(checkExpiry, Math.min(remaining, 2147483647));
            return true;
        };
        const intercept = axios.interceptors.response.use(response => response, error => {
            if (isCurrent() && currentSessionUnauthorized(error, token, import.meta.env.VITE_API_URL)) expire();
            else if (isCurrent() && error.response?.data?.code === 'PAYMENTS_ONLY')
                setSession(previous => ({ ...previous, user: previous.user ? { ...previous.user, financiallyRestricted: true } : null }));
            return Promise.reject(error);
        });
        const refresh = async () => {
            if (!isCurrent() || !checkExpiry()) return;
            try {
                const { data } = await axios.get<MembershipAccess>(`${import.meta.env.VITE_API_URL}/membership-billing/me/access`, {
                    headers: { Authorization: `Bearer ${token}` }, timeout: 15000,
                });
                if (isCurrent()) setSession(previous => ({ ...previous, user: previous.user ? {
                    ...previous.user, name: data.name, role: data.role, financiallyRestricted: data.financiallyRestricted,
                } : null }));
            } catch { /* Network and service failures do not revoke authentication. */ }
        };
        const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
        void refresh();
        const interval = window.setInterval(refresh, 60000);
        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            active = false;
            window.clearTimeout(expiryTimer);
            window.clearInterval(interval);
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', onVisible);
            axios.interceptors.response.eject(intercept);
        };
    }, [token, logout]);

    const login = (userData: User, token: string) => {
        currentToken.current = token;
        setSession({ token, user: userData, reason: null });
    };
    const acknowledgeSessionEnd = useCallback(() => {
        setSession(previous => previous.reason ? { ...previous, reason: null } : previous);
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!token, user, token, login, logout, sessionEndReason: reason, acknowledgeSessionEnd }}>
            {children}
        </AuthContext.Provider>
    );
};
