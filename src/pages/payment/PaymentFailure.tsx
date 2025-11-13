import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';

const PaymentFailure: React.FC = () => {
    const navigate = useNavigate();

    const handleRetry = () => {
        navigate('/dashboard');
    };

    return (
        <div className="container center-align" style={{ marginTop: '100px' }}>
            <FontAwesomeIcon icon={faTimesCircle} size="4x" color="#f44336" />
            <h4>Pago Fallido</h4>
            <p>Tu pago no pudo ser procesado</p>
            <button
                className="btn blue darken-4 waves-effect waves-light"
                onClick={handleRetry}
                style={{ marginTop: '20px' }}
            >
                Cerrar
            </button>
        </div>
    );
};

export default PaymentFailure;
