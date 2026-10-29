import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from './useAuth';

export function AuthSessionBoundary({ children }: { children: ReactNode }) {
    const { sessionEndReason, isAuthenticated, acknowledgeSessionEnd } = useAuth();
    const location = useLocation();
    useEffect(() => {
        if (!sessionEndReason || isAuthenticated) return;
        // Let the old view unmount and finish its error handlers before replacing its dialog.
        const timer = window.setTimeout(() => {
            void Swal.fire({
                icon: 'warning',
                title: sessionEndReason === 'inactive' ? 'Sesión cerrada por inactividad' : 'Tu sesión venció',
                text: 'Inicia sesión nuevamente para continuar.',
                confirmButtonText: 'Aceptar',
            });
            acknowledgeSessionEnd();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [sessionEndReason, isAuthenticated, acknowledgeSessionEnd]);

    if (sessionEndReason && !isAuthenticated && location.pathname !== '/login')
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    return <>{children}</>;
}
