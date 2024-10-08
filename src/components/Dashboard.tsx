import React, {useEffect, useState} from 'react';
import TimeSlot from './TimeSlot';
import {DateTime} from 'luxon';
import '../styles/Dashboard.css';
import axios from "axios";
import {useLocation} from "react-router-dom";
import Modal from './Modal';

interface TimeSlotType {
    time: string;
    available: boolean;
    isPayed: boolean;
}

interface CourtType {
    id: number;
    name: string;
    timeSlots: TimeSlotType[];
}

const Dashboard: React.FC = () => {
    const location = useLocation();
    const {namePlayer} = location.state || {};
    const [courts, setCourts] = useState<CourtType[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(DateTime.now().toISODate()); // Default to today's date
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
        courtId: number;
        time: string;
        date: string;
        player1: string;
        isPayed: boolean;
    } | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [playersNames, setPlayersNames] = useState<string[]>([]);

    const apiUrl = import.meta.env.VITE_API_URL;
    const token = localStorage.getItem('token');

    const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedDate(event.target.value); // Update the selected date based on user input
        setSelectedTimeSlot(null); // Clear selected time slot when switching dates
    };

    const handleOpenModal = (timeSlot: React.SetStateAction<{
        courtId: number;
        time: string;
        date: string;
        player1: string;
        isPayed:boolean;
    } | null>) => {
        setSelectedTimeSlot(timeSlot);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedTimeSlot(null);
    };

    const handleTimeSlotClick = (courtId: number, time: string, isPayed:boolean) => {
        setSelectedTimeSlot({courtId, time, date: selectedDate, player1: namePlayer, isPayed});
        handleOpenModal({courtId, time, date: selectedDate, player1: namePlayer, isPayed})
    };

    const getPlayersNames = async () => {
        const playersNames = await axios.get(`${apiUrl}/register/names`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const namesWithoutMe = () => {
            return playersNames.data.filter((name: string) => name !== namePlayer);
        }
        setPlayersNames(namesWithoutMe);
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get<CourtType[]>(`${apiUrl}/court-reserve/available/${selectedDate}`);
                if (!response.data) {
                    throw new Error('No data received');
                }
                getPlayersNames();
                setCourts(response.data);
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    console.error('Error fetching data:', error.message, error.response);
                } else {
                    console.error('Unexpected error:', (error as Error).message);
                }
            }
        };
        fetchData();
    }, [selectedDate]);

    return (
        <div className="container">
            <div className="app">
                <h3>Welcome, {namePlayer}!</h3>
                <div className="date-picker">
                    <label>Select a Date: </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        min={DateTime.now().toISODate()}
                        max={DateTime.now().plus({days: 2}).toISODate()}// Minimum date set to today
                    />
                </div>
                <div className="courts-container">
                    {courts.map((court) => (
                        <div key={court.id} className="court-row">
                            <h2>{court.name}</h2>
                            <div className="time-slots">
                                {court.timeSlots.map((slot) => (
                                    <TimeSlot
                                        key={slot.time}
                                        time={slot.time}
                                        available={slot.available}
                                        isPayed={slot.isPayed}
                                        onClick={() => handleTimeSlotClick(court.id, slot.time, slot.isPayed)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {selectedTimeSlot && (
                    <div>
                        <Modal
                            id="timeSlotModal"
                            title="Reserve Turn"
                            isOpen={isModalOpen}
                            selectedTimeSlot={selectedTimeSlot}
                            playersNames={playersNames}
                            onClose={handleCloseModal}
                        />
                    </div>
                )}
            </div>
        </div>
    )
        ;
};

export default Dashboard;
