import React from 'react';
import {useLocation} from 'react-router-dom';
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

    return (
        <div className="container mt-5">
                <div className="card-body">
                    <h5 className="card-title mb-4">
                        Court Reservation resume
                    </h5>

                    <p>
                        {' '}You have a reservation to play <br/>
                        {isDouble ? (
                            <strong>against {player3} and {player4}</strong>
                        ) : (
                            <strong>{player1} against {player2 || visitName}</strong>
                        )}
                    </p>

                    <p>
                        Date to play is <br/>
                        <FontAwesomeIcon icon={faCalendar} className="me-2"/>

                        {' '}<strong>{dateToPlay}</strong>
                    </p>

                    <p>
                        Turn is <br/>
                        <FontAwesomeIcon icon={faClock} className="me-2"/>
                        {' '}<strong>{turn}</strong>
                    </p>

                    <p>
                        Court to play <br/>
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2"/>
                        {' '}<strong>{court}</strong>
                    </p>

                    {isPaidNight && (
                        <div className="alert alert-info">
                            <FontAwesomeIcon icon={faTriangleExclamation}/>
                            {' '}<strong>Note:</strong> This time slot is paid.
                        </div>
                    )}

                    {!isVisit && (
                        <>
                            <p>
                                <FontAwesomeIcon icon={faClock} className="me-2"/>
                                {' '}Don't forget to update your ranking after the match.
                            </p>
                            <p>
                                Your court reservation ID and your reservation pass. <br/> it was send it for email
                            </p>
                        </>
                    )}

                    <div className="mt-4">
                        <p>We look forward to seeing you on the court!</p>
                        <p>Best regards,</p>
                        <p>Your Tennis Club</p>
                    </div>
                </div>
            </div>
    );
};

export default ReservationSummary;
