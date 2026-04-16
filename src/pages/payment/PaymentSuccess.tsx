import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import AppLoader from '../../components/AppLoader';

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
                    text: 'El pago no fue aprobado',
                });
                return;
            }
            if (status === 'approved') {
                setIsProcessing(false);
                await Swal.fire({
                    icon: 'success',
                    title: '¡Pago Exitoso!',
                    text: 'Tu reserva ha sido confirmada',
                });
                navigate('/dashboard');
                return;
            } else {
                throw new Error('Pago no aprobado');
            }

        };
        processPayment();
    }, [searchParams, navigate]);

    return (
        <div className="container center-align" style={{ marginTop: '100px' }}>
            {isProcessing ? (
                <AppLoader text="Validando pago..." size="4x" />
            ) : (
                <>
                    <FontAwesomeIcon icon={faCheckCircle} size="4x" color="#4caf50" />
                    <h4>¡Pago procesado con éxito!</h4>
                </>
            )}
        </div>
    );
};

export default PaymentSuccess;
