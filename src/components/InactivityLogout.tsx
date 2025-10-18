import React, { useEffect, useRef, useCallback } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

const InactivityLogout: React.FC = () => {
    const navigate = useNavigate();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const handleLogout = useCallback(() => {
        const tokenExists = !!localStorage.getItem('token');
        if (tokenExists) {
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            Swal.fire({
                icon: 'warning',
                title: 'Sesión cerrada por inactividad',
                text: '¡Hasta pronto!',
            }).then(() => {
                navigate('/');
            });
        }
    }, [navigate]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(handleLogout, 180000); // 30 segundos para pruebas
    }, [handleLogout]);

    useEffect(() => {
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
    }, [resetTimer]);

    return null;
};

export default InactivityLogout;
