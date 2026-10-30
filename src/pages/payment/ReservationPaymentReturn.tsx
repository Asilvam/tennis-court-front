import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { faCheckCircle, faClock } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../components/useAuth';
import { reservationReturnReference, reservationReturnStatus } from '../../utils/reservationPaymentReturn';
import PaymentStatusPage from './PaymentStatusPage';

type State = 'VERIFYING' | 'CONFIRMED' | 'REVIEW' | 'WAITING' | 'UNAVAILABLE';

export default function ReservationPaymentReturn() {
    const [params] = useSearchParams();
    const reference = reservationReturnReference(params);
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [state, setState] = useState<State>('VERIFYING');
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        let reads = 0;
        setState('VERIFYING');
        const verify = async () => {
            if (!reference || !token) { setState('UNAVAILABLE'); return; }
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/mp/reservations/${encodeURIComponent(reference)}/status`, {
                    headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, timeout: 8000,
                });
                if (controller.signal.aborted) return;
                const result = reservationReturnStatus(response.data, reference);
                if (result === 'WAITING' && ++reads < 4) {
                    timer = setTimeout(() => { void verify(); }, 2500);
                    return;
                }
                setState(result);
                if (result === 'CONFIRMED') void Swal.fire({
                    icon: 'success', title: 'Reserva confirmada',
                    text: 'El sistema registró el pago aprobado y confirmó tu reserva.', confirmButtonText: 'Aceptar',
                });
            } catch {
                if (!controller.signal.aborted) setState('UNAVAILABLE');
            }
        };
        void verify();
        return () => { controller.abort(); clearTimeout(timer); };
    }, [reference, token, attempt]);

    const confirmed = state === 'CONFIRMED';
    const verifying = state === 'VERIFYING';
    const title = {
        VERIFYING: 'Verificando tu pago', CONFIRMED: 'Reserva confirmada',
        REVIEW: 'Pago recibido, reserva en revisión', WAITING: 'Confirmación pendiente',
        UNAVAILABLE: 'No pudimos verificar la reserva',
    }[state];
    const description = {
        VERIFYING: 'Estamos consultando el estado registrado en el sistema.',
        CONFIRMED: 'El pago aprobado está registrado y tu reserva está activa.',
        REVIEW: 'El pago está registrado, pero el club debe revisar la reserva antes de confirmarla.',
        WAITING: 'El sistema aún no tiene una confirmación de pago y reserva. Esto no significa que el cobro haya fallado.',
        UNAVAILABLE: reference ? 'No fue posible consultar esta reserva con tu cuenta. Puedes volver a verificar o contactar al club.'
            : 'Este enlace no contiene una referencia válida. Revisa tu historial o contacta al club.',
    }[state];
    return <PaymentStatusPage
        status={verifying ? 'processing' : confirmed ? 'success' : 'pending'}
        icon={confirmed ? faCheckCircle : faClock}
        eyebrow="Pago de reserva" title={title} description={description}
        secondaryText={!confirmed && !verifying ? 'No realices otro pago mientras se aclara el estado de esta operación.' : undefined}
        actionLabel={!verifying && !confirmed && reference ? 'Volver a verificar' : undefined}
        onAction={() => setAttempt(value => value + 1)}
        secondaryActionLabel={user?.financiallyRestricted ? 'Ir a mensualidades' : 'Volver al dashboard'}
        onSecondaryAction={() => navigate(user?.financiallyRestricted ? '/monthlypayments' : '/dashboard', { replace: true })}
    />;
}
