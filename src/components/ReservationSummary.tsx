import React from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faIdBadge,
    faTrophy
} from '@fortawesome/free-solid-svg-icons';
import '../styles/ReservationSummary.css';
import {DateTime} from "luxon"; // Import new styles

const ReservationSummary: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate(); // Add useNavigate hook
    const {responseData} = location.state || {}; // Destructure formData from location.state

    // If formData doesn't exist, display a fallback message
    if (!responseData) {
        return (
            <div className="summary-page-container">
                <div className="summary-card">
                    <p className="summary-alert info"><FontAwesomeIcon icon={faIdBadge} className="me-2"/>
                    No reservation details available.
                    </p>
                </div>
            </div>
        );
    }

    const {
        isDouble,
        player1,
        player2,
        player3,
        player4,
        dateToPlay,
        turn,
        court,
        visitName,
        isForRanking
    } = responseData;

    // Function to navigate back to dashboard
    const handleBackToDashboard = () => {
        navigate('/dashboard'); // Replace with your dashboard route
    };

    return (
        <div className="summary-page-container">
            <div className="summary-card">
                <h5 className="summary-title">
                    ¡Reserva Confirmada!
                </h5>

                <div className="matchup-summary">
                    <div className="players">
                        {isDouble ? (
                            <>
                                <span>{player1} & {player2 || visitName}</span>
                                <div className="vs">VS</div>
                                <span>{player3} & {player4}</span>
                            </>
                        ) : (
                            <>
                                <span>{player1}</span>
                                <div className="vs">VS</div>
                                <span>{player2 || visitName}</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="details-grid">
                    <div className="detail-item">
                        <div className="text">Fecha <strong>🗓️ {DateTime.fromISO(dateToPlay).toFormat('dd/MM/yyyy')}</strong></div>
                    </div>
                    <div className="detail-item">
                        <div className="text">Turno <strong>⏰ {turn}</strong></div>
                    </div>
                    <div className="detail-item">
                        <div className="text">Cancha <strong>📍 {court}</strong></div>
                    </div>
                </div>

                {isForRanking && (
                    <div className="summary-alert ranking" style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', backgroundColor: '#fff3e0', borderRadius: '8px', border: '1px solid #ffe0b2' }}>
                        <FontAwesomeIcon icon={faTrophy} style={{ color: '#f57c00', fontSize: '1.2rem' }} />
                        <div className="summary-alert-content">
                            <p style={{ margin: 0, color: '#e65100', fontWeight: 700 }}>¡Actualiza tu Ranking!</p>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#5d4037' }}>Agrega tus resultados en <strong>Agregar Resultados</strong> de la APP.</p>
                        </div>
                    </div>
                )}

                <div className="closing-notes">
                    <p>¡Esperamos verte en la cancha!</p>
                    <p>Saludos cordiales,</p>
                    <p><strong>Club de Tenis Quintero</strong> 🎾</p>
                </div>

                <div className="summary-button-container">
                    <button className="btn btn-primary blue darken-4" onClick={handleBackToDashboard}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>

    )
        ;
};

export default ReservationSummary;
