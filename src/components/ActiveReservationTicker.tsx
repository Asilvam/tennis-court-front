import React from 'react';
import { DateTime } from 'luxon';
import '../styles/ActiveReservationTicker.css';

interface ActiveReservationTickerProps {
    court: string;
    dateToPlay: string;
    turn: string;
}

const TIMEZONE = 'America/Santiago';

const formatReservationDay = (dateToPlay: string): string => {
    const today = DateTime.now().setZone(TIMEZONE).startOf('day');
    const reservationDate = DateTime.fromISO(dateToPlay, { zone: TIMEZONE }).startOf('day');
    const daysFromToday = Math.round(reservationDate.diff(today, 'days').days);

    if (daysFromToday === 0) return 'hoy';
    if (daysFromToday === 1) return 'mañana';

    return `el ${reservationDate.setLocale('es-CL').toFormat("cccc d 'de' LLLL")}`;
};

const ActiveReservationTicker: React.FC<ActiveReservationTickerProps> = ({
    court,
    dateToPlay,
    turn,
}) => {
    const [startTime, endTime] = turn.split('-').map(value => value.trim());
    const reservationDay = formatReservationDay(dateToPlay);
    const reminderText = `Recuerda: tienes la ${court} reservada ${reservationDay}, de ${startTime} a ${endTime}.`;

    const message = (
        <span className="ar-message">
            <span className="ar-icon" aria-hidden="true">🎾</span>
            Recuerda: tienes la <strong>{court}</strong> reservada <strong>{reservationDay}</strong>, de{' '}
            <strong>{startTime} a {endTime}</strong>.
        </span>
    );

    return (
        <div className="ar-wrapper" role="status" aria-live="polite" aria-label={reminderText}>
            <span className="ar-label">Reserva activa</span>
            <div className="ar-track" aria-hidden="true">
                <div className="ar-inner">
                    {message}
                    <span className="ar-mobile-copy">{message}</span>
                </div>
            </div>
        </div>
    );
};

export default ActiveReservationTicker;
