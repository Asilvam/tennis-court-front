import React from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faCalendar,
    faClock,
    faMapMarkerAlt,
    faIdBadge,
    faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';

const ReservationSummary: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate(); // Add useNavigate hook
    const {formData} = location.state || {}; // Destructure formData from location.state

    // If formData doesn't exist, display a fallback message
    if (!formData) {
        return (
            <div className="container mt-5">
                <div className="alert alert-warning">
                    <FontAwesomeIcon icon={faIdBadge} className="me-2"/>
                    No reservation details available.
                </div>
            </div>
        );
    }

    // Destructure formData fields to simplify JSX usage
    const {
        isDouble,
        player1,
        player2,
        player3,
        player4,
        dateToPlay,
        turn,
        court,
        isPaidNight,
        isVisit,
        visitName,
    } = formData;

    // Function to navigate back to dashboard
    const handleBackToDashboard = () => {
        navigate('/dashboard'); // Replace with your dashboard route
    };

    return (
        <div className="container mt-5">
            <div className="card-body">
                <h5 className="card-title mb-4">
                    Resumen de Reserva de Cancha
                </h5>

                <p>
                    {' '}Tienes una reserva para jugar <br/>
                    {isDouble ? (
                        <>
                            <strong>{player1} con {player2 || visitName}</strong> <br/>
                            <strong>contra {player3} y {player4}</strong>
                        </>
                    ) : (
                        <strong>{player1} contra {player2 || visitName}</strong>
                    )}
                </p>
                <p>
                    La fecha para jugar es <br/>
                    <FontAwesomeIcon icon={faCalendar} className="me-2"/>

                    {' '}<strong>{dateToPlay}</strong>
                </p>

                <p>
                    El turno es <br/>
                    <FontAwesomeIcon icon={faClock} className="me-2"/>
                    {' '}<strong>{turn}</strong>
                </p>

                <p>
                    La cancha asignada es <br/>
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2"/>
                    {' '}<strong>{court}</strong>
                </p>

                {isPaidNight && (
                    <div className="alert alert-info">
                        <FontAwesomeIcon icon={faTriangleExclamation}/>
                        {' '}<strong>Nota:</strong> Este turno es de pago.
                    </div>
                )}

                {!isVisit && (
                    <>
                        <p>
                            <FontAwesomeIcon icon={faClock} className="me-2"/>
                            {' '}No olvides actualizar tu ranking después del partido.
                        </p>
                        <p>
                            Tu ID de reserva de cancha y tu pase de reserva <br/> fueron enviados por correo
                            electrónico.
                        </p>
                    </>
                )}

                <div className="mt-4">
                    <p>¡Esperamos verte en la cancha!</p>
                    <p>Saludos cordiales,</p>
                    <p>Tu Club de Tenis</p>
                </div>
                {/* Botón para regresar al panel */}
                <div className="mt-4">
                    <button className="btn btn-primary" onClick={handleBackToDashboard}>
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>

    )
        ;
};

export default ReservationSummary;
