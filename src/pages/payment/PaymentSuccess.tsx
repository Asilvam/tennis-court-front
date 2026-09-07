import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import PaymentStatusPage from './PaymentStatusPage';

const PaymentSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(true);

    useEffect(() => {
        const processPayment = async () => {
            const paymentId = searchParams.get('payment_id');
            const status = searchParams.get('status');

            if (!paymentId || status !== 'approved') {
                await Swal.fire({
                    icon: 'error',
                    title: 'Pago no procesado',
                    text: 'No pudimos validar la aprobación del pago.',
                    confirmButtonText: 'Volver al dashboard',
                });
                navigate('/dashboard', { replace: true });
                return;
            }
            if (status === 'approved') {
                setIsProcessing(false);
                await Swal.fire({
                    icon: 'success',
                    title: 'Pago confirmado',
                    text: 'Tu reserva quedó confirmada correctamente.',
                    confirmButtonText: 'Volver al dashboard',
                });
                navigate('/dashboard', { replace: true });
                return;
            } else {
                throw new Error('Pago no aprobado');
            }

        };
        processPayment();
    }, [searchParams, navigate]);

    return isProcessing ? (
        <PaymentStatusPage
            status="processing"
            eyebrow="Procesando pago"
            title="Validando tu pago"
            description="Estamos confirmando la transacción con Mercado Pago. Esto puede tardar unos segundos."
        />
    ) : (
        <PaymentStatusPage
            status="success"
            icon={faCheckCircle}
            eyebrow="Pago aprobado"
            title="Reserva confirmada"
            description="El pago fue procesado correctamente y tu reserva ya está activa."
        />
    );
};

export default PaymentSuccess;
