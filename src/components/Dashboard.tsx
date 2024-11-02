import React, {useCallback, useEffect, useState} from 'react';
import {DateTime} from 'luxon';
import '../styles/Dashboard.css';
import axios from "axios";
import Modal from './Modal';
import Swal from "sweetalert2";
import {getTokenFromLocalStorage} from "../utils/tokenUtils.ts";
import {getUserInfoFromLocalStorage} from "../utils/userUtils.ts";
import '../styles/Reserves.css';

interface CourtReserve {
    player1: string;              // Primary player (required)
    player2?: string;             // Optional second player
    player3?: string;             // Optional third player for doubles
    player4?: string;             // Optional fourth player for doubles
    isDouble: boolean;            // Indicates if the reservation is for doubles
    isVisit: boolean;             // Indicates if the reservation involves a visitor
    visitName?: string;           // Optional visitor name
}

interface TimeSlotType {
    court: string;
    available: boolean;
    isPayed: boolean;
    data: string;
}

interface CourtType {
    time: string;
    slots: TimeSlotType[];
}

const Dashboard: React.FC = () => {
    const userInfo = getUserInfoFromLocalStorage();
    const namePlayer = userInfo?.name || '';
    const [timeSlots, setTimeSlots] = useState<CourtType[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(DateTime.now().toISODate());
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
        courtId: string;
        time: string;
        date: string;
        player1: string | undefined;
        isPayed: boolean;
    } | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [playersNames, setPlayersNames] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeReserve, setActiveReserve] = useState<CourtReserve | null>(null);
    const minDate = DateTime.now().toISODate();
    const maxDate = DateTime.now().plus({days: 2}).toISODate();

    const apiUrl = import.meta.env.VITE_API_URL;
    const token = getTokenFromLocalStorage();

    const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedDate = event.target.value;
        if (selectedDate < minDate || selectedDate > maxDate) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Date',
                text: `Por favor seleccione fecha entre ${minDate} y ${maxDate}.`,
            });
            return; // Stop further execution
        }
        setSelectedDate(selectedDate); // Update the selected date
        setSelectedTimeSlot(null); // Clear selected time slot when switching dates
    };

    const handleOpenModal = (timeSlot: React.SetStateAction<{
        courtId: string;
        time: string;
        date: string;
        player1: string | undefined;
        isPayed: boolean;
    } | null>) => {
        setSelectedTimeSlot(timeSlot);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedTimeSlot(null);
    };

    const handleTimeSlotClick = useCallback((courtId: string, time: string, isPayed: boolean, available: boolean, data: string) => {
        if (!available) {
            Swal.fire({
                icon: 'info',
                title: 'Informacion Partido',
                html: `Reservado Jugadores</br><strong>${data}</strong>`,
            });
            return; // Stop further execution
        }
        if (activeReserve){
            Swal.fire({
                icon: 'error',
                title: 'Informacion',
                text: 'Ya tienes una reserva activa',
            });
            return; // Stop further execution
        }
        setSelectedTimeSlot({courtId, time, date: selectedDate, player1: namePlayer, isPayed});
        handleOpenModal({courtId, time, date: selectedDate, player1: namePlayer, isPayed});
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

    const getActiveReserves = async () => {
        try {
            const reserves = await axios.get(`${apiUrl}/court-reserve/active/${namePlayer}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setActiveReserve(reserves.data);
        } catch (error){
            console.log(error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get<CourtType[]>(`${apiUrl}/court-reserve/available/${selectedDate}`);
            if (!response.data) throw new Error('No data received');
            setTimeSlots(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getPlayersNames();
        getActiveReserves()
    }, []);

    useEffect(() => {
        // console.log('modal changed:', isModalOpen);
        fetchData();
    }, [selectedDate]);

    return loading ? (
        <div className="preloader-wrapper active">
            <div className="spinner-layer spinner-green-only">
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
    ) : (
        <div className="container">
            <div className="app">
                <h6><strong>Hola, {namePlayer} </strong></h6>
                {activeReserve && <p className="red-text">Recuerda, tienes reservas activas.</p>}
                <div className="date-picker">
                    <label>Selecciona una fecha: </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        min={minDate}
                        max={maxDate}// Minimum date set to today
                    />
                </div>
                <div className="flex flex-col items-center">
                    {timeSlots.map((timeSlot, index) => (
                        <div key={index} className="time-slot-container">
                            <div className="time-slot-time">{timeSlot.time}</div>
                            <div className="time-slot-courts">
                                {timeSlot.slots.map((slot, idx) => (
                                    <div
                                        key={idx}
                                        className={`time-slot ${slot.available ? 'available' : 'unavailable'} ${slot.isPayed ? 'paid' : ''}`}
                                    >
                                        <div className="time-slot-court"
                                             onClick={() => handleTimeSlotClick(slot.court, timeSlot.time, slot.isPayed, slot.available, slot.data)}
                                        >{slot.court}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {isModalOpen && (
                    <div>
                        <Modal
                            id="timeSlotModal"
                            title="Reserva de Cancha"
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
