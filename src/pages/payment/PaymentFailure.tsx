import React from 'react';
import { useNavigate } from 'react-router-dom';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import PaymentStatusPage from './PaymentStatusPage';

const PaymentFailure: React.FC = () => {
    const navigate = useNavigate();

    const handleRetry = () => {
        navigate('/dashboard', { replace: true });
    };

    return (
        <PaymentStatusPage
            status="failure"
            icon={faTimesCircle}
            eyebrow="Pago rechazado"
            title="No pudimos procesar el pago"
            description="La reserva no fue confirmada y la cancha volvió a quedar disponible."
            secondaryText="Puedes realizar una nueva reserva o intentar con otro medio de pago."
            actionLabel="Volver al dashboard"
            onAction={handleRetry}
        />
    );
};

export default PaymentFailure;
