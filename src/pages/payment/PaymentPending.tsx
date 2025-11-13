import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';

const PaymentPending: React.FC = () => {
    const navigate = useNavigate();

    const handleReturn = () => {
        navigate('/dashboard');
    };

    return (
        <div className="container center-align" style={{ marginTop: '100px' }}>
            <FontAwesomeIcon icon={faClock} size="4x" color="#ff9800" />
            <h4>Pago Pendiente</h4>
            <p>Tu pago está siendo procesado</p>
            <p>Recibirás una confirmación cuando se complete</p>
            <button
                className="btn blue darken-4 waves-effect waves-light"
                onClick={handleReturn}
                style={{ marginTop: '20px' }}
            >
                Volver al calendario
            </button>
        </div>
    );
};

export default PaymentPending;
