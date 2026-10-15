import React, { useEffect, useRef, useCallback } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

const InactivityLogout: React.FC = () => {
    const navigate = useNavigate();
    const { token, user, logout } = useAuth();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const inactivityTimeout = user?.role === 'admin' ? 60 * 60 * 1000 : 3 * 60 * 1000;

    const handleLogout = useCallback(() => {
        const tokenExists = !!localStorage.getItem('token');
        if (tokenExists) {
            logout();
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            Swal.fire({
                icon: 'warning',
                title: 'Sesión cerrada por inactividad',
                text: '¡Hasta pronto!',
                confirmButtonColor: '#1e88e5',
            }).then(() => {
                navigate('/');
            });
        }
    }, [navigate, logout]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (token) timerRef.current = setTimeout(handleLogout, inactivityTimeout);
    }, [handleLogout, inactivityTimeout, token]);

    useEffect(() => {
        if (!token) return;
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keydown', resetTimer);
        window.addEventListener('mousedown', resetTimer);
        window.addEventListener('touchstart', resetTimer);
        window.addEventListener('scroll', resetTimer);

        resetTimer();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
            window.removeEventListener('mousedown', resetTimer);
            window.removeEventListener('touchstart', resetTimer);
            window.removeEventListener('scroll', resetTimer);
        };
    }, [resetTimer, token]);

    return null;
};

export default InactivityLogout;
