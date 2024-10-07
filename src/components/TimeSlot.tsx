import React from 'react';
import '../styles/TimeSlot.css';

interface TimeSlotProps {
    time: string;
    available: boolean;
    isPayed: boolean;
    onClick: (time: string) => void;
}

const TimeSlot: React.FC<TimeSlotProps> = ({ time, available, isPayed, onClick }) => {
    return (
        <div
            className={`time-slot ${available ? 'available' : 'unavailable'} ${available && isPayed ? 'night' : ''}`}
            onClick={available ? () => onClick(time) : undefined}
        >
            {time}
        </div>
    );
};

export default TimeSlot;
