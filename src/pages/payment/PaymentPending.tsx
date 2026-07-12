import React from 'react';
import { useNavigate } from 'react-router-dom';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import PaymentStatusPage from './PaymentStatusPage';

const PaymentPending: React.FC = () => {
    const navigate = useNavigate();

    const handleReturn = () => {
        navigate('/dashboard', { replace: true });
    };

    return (
        <PaymentStatusPage
            status="pending"
            icon={faClock}
            eyebrow="Pago pendiente"
            title="Estamos esperando la confirmación"
            description="Mercado Pago todavía está procesando la transacción."
            secondaryText="Te enviaremos un correo cuando el pago quede confirmado."
            actionLabel="Volver al dashboard"
            onAction={handleReturn}
        />
    );
};

export default PaymentPending;
