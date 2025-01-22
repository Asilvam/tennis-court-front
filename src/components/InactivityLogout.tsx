import React, { useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

const InactivityLogout: React.FC = () => {
    const navigate = useNavigate();

    const handleLogout = useCallback(() => {
        const tokenExists = !!localStorage.getItem('token'); // Example check for token existence
        if (tokenExists) {
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            Swal.fire({
                icon: 'warning',
                title: 'Logged out for inactivity',
                text: `see you soon!`,
            });
            navigate('/');
        }
    }, [navigate]);

    useEffect(() => {
        let timer: NodeJS.Timeout;

        const resetTimer = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(handleLogout, 3000000); // 5 minute inactivity
        };

        // Reset timer on user interaction
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keydown', resetTimer);

        resetTimer(); // Initialize timer

        return () => {
            clearTimeout(timer); // Cleanup on unmount
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
        };
    }, [handleLogout]);

    return null; // No UI elements, just logic for inactivity
};

export default InactivityLogout;
