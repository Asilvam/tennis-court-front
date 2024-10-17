import React, {useCallback, useContext, useEffect, useState} from 'react';
import TimeSlot from './TimeSlot';
import {DateTime} from 'luxon';
import '../styles/Dashboard.css';
import axios from "axios";
import Modal from './Modal';
import badge from '/badge.svg';
import Swal from "sweetalert2";
import {UserContext} from "./UserContext.tsx";

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
    const userContext = useContext(UserContext);
    const namePlayer = userContext?.userInfo.name;
    const [courts, setCourts] = useState<CourtType[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(DateTime.now().toISODate()); // Default to today's date
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
        courtId: number;
        time: string;
        date: string;
        player1: string|undefined;
        isPayed: boolean;
    } | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [playersNames, setPlayersNames] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const minDate = DateTime.now().toISODate();
    const maxDate = DateTime.now().plus({ days: 2 }).toISODate();

    const apiUrl = import.meta.env.VITE_API_URL;
    const token = localStorage.getItem('token');

    const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedDate = event.target.value;

        if (selectedDate < minDate || selectedDate > maxDate) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Date',
                text: `Please select a date between ${minDate} and ${maxDate}.`,
            });
            return; // Stop further execution
        }

        setSelectedDate(selectedDate); // Update the selected date
        setSelectedTimeSlot(null); // Clear selected time slot when switching dates
    };

    const handleOpenModal = (timeSlot: React.SetStateAction<{
        courtId: number;
        time: string;
        date: string;
        player1: string|undefined;
        isPayed:boolean;
    } | null>) => {
        setSelectedTimeSlot(timeSlot);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedTimeSlot(null);
    };

    const handleTimeSlotClick = useCallback((courtId: number, time: string, isPayed: boolean) => {
        setSelectedTimeSlot({ courtId, time, date: selectedDate, player1: namePlayer, isPayed });
        handleOpenModal({ courtId, time, date: selectedDate, player1: namePlayer, isPayed });
    }, [selectedDate, namePlayer]);

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

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get<CourtType[]>(`${apiUrl}/court-reserve/available/${selectedDate}`);
            if (!response.data) throw new Error('No data received');
            setCourts(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getPlayersNames();
    }, []);

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    return loading ? (
        <div className="preloader-wrapper active">
            <div className="spinner-layer spinner-blue-only">
                <div className="circle-clipper left">
                    <div className="circle"></div>
                </div>
                <div className="gap-patch">
                    <div className="circle"></div>
                </div>
                <div className="circle-clipper right">
                    <div className="circle"></div>
                </div>
            </div>
        </div>
    )  :(
        <div className="container">
            <div className="app">
                <h3>Welcome, {namePlayer}!</h3>
                <div className="date-picker">
                    <label>Select a Date: </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        min={minDate}
                        max={maxDate}// Minimum date set to today
                    />
                </div>
                <div className="courts-container">
                    {courts.map((court) => (
                        <div key={court.id} className="court-row">
                            <h2>
                                <img src={badge} alt="Court Icon"
                                     style={{width: '24px', height: '24px', marginRight: '8px'}}/> {court.name}
                            </h2>
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
                {isModalOpen && (
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
