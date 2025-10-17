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
    dateToPlay: string;            // Date of the reservation in ISO format
}

interface TimeSlotType {
    court: string;
    available: boolean;
    isPayed: boolean;
    isBlockedByAdmin: boolean;
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
    const [activeReserve, setActiveReserve] = useState<CourtReserve | null>(null);
    const [activeNigthsLigths, setActiveNigthsLigths] = useState<boolean>(false);

    let minDate = DateTime.now().toISODate();
    let maxDate = DateTime.now().plus({days: 2}).toISODate();
    if (userInfo?.role==='admin') {
         minDate = DateTime.now().minus({ months: 2 }).toISODate();
         maxDate = DateTime.now().plus({month: 2}).toISODate();
    }

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

    const handleTimeSlotClick = useCallback(
        (courtId: string, time: string, isPayed: boolean, available: boolean, data: string, isBlockedByAdmin: boolean) => {
            if(isBlockedByAdmin) {
                Swal.fire({
                    icon: 'info',
                    title: 'Horario Bloqueado',
                    html: `Motivo<br><strong>${data}</strong>`,
                });
                return;
            }
            if (!available) {
                Swal.fire({
                    icon: 'info',
                    title: 'Detalle del Partido',
                    html: `Reservado Jugadores<br><strong>${data}</strong>`,
                });
                return;
            }
            if (activeReserve) {
                Swal.fire({
                    icon: 'error',
                    title: 'Información',
                    text: 'Ya tienes una reserva activa.',
                });
                return;
            }
            const timeSlot = { courtId, time, date: selectedDate, player1: namePlayer, isPayed };
            setSelectedTimeSlot(timeSlot);
            handleOpenModal(timeSlot);
        },
        [selectedDate, namePlayer, activeReserve]
    );


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
        const url = `${apiUrl}/court-reserve/active/${namePlayer}`;
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const { data } = await axios.get(url, { headers });
            setActiveReserve(data);
        } catch (error) {
            console.error("Error fetching active reserves:", error);
            setActiveReserve(null);
        }
    };

    const getActiveNigthsLigths = async () =>{
        const url = `${apiUrl}/register/active/${namePlayer}`;
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const { data } = await axios.get(url, { headers });
            setActiveNigthsLigths(data);
        } catch (error) {
            console.error("Error fetching active reserves:", error);
            setActiveNigthsLigths(false);
        }
    }

    const fetchData = async () => {
        try {
            const response = await axios.get<CourtType[]>(`${apiUrl}/court-reserve/available/${selectedDate}`);
            if (!response.data) throw new Error('No data received');
            setTimeSlots(response.data);
            // console.log('response.data-->', response.data )
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        getPlayersNames();
    }, []);

    useEffect(() => {
        const loadDashboardData = async () => {
            Swal.fire({
                title: 'Cargando...',
                text: 'Buscando horarios disponibles.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });
            await Promise.all([fetchData(), getActiveReserves(), getActiveNigthsLigths()]);
            Swal.close();
        };

        loadDashboardData();
    }, [selectedDate]);

    return (
        <div className="container">
            <div>
                <h6><strong>Hola, {namePlayer} </strong></h6>
                {activeReserve && (
                    <div className="active-reserve-alert" style={{
                        backgroundColor: '#fff3cd',
                        border: '2px solid #ffc107',
                        borderRadius: '8px',
                        padding: '15px',
                        margin: '15px 0',
                        boxShadow: '0 4px 8px rgba(255, 193, 7, 0.3)',
                        position: 'relative'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '10px'
                        }}>
                            <div style={{
                                backgroundColor: '#ffc107',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '10px',
                                fontSize: '18px'
                            }}>
                                ⚠️
                            </div>
                            <h6 style={{
                                margin: 0,
                                color: '#856404',
                                fontWeight: 'bold'
                            }}>
                                ¡Tienes una reserva activa!
                            </h6>
                        </div>
                        <div style={{
                            backgroundColor: '#ffffff',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '1px solid #ffeaa7'
                        }}>
                            <p style={{ margin: '5px 0', color: '#856404' }}>
                                <strong>🏟️ Cancha:</strong> {activeReserve[0]?.court.replace('Cancha ', '')}
                            </p>
                            <p style={{ margin: '5px 0', color: '#856404' }}>
                                <strong>📅 Fecha:</strong> {DateTime.fromISO(activeReserve[0]?.dateToPlay).toFormat('dd/MM/yyyy')}
                            </p>
                            <p style={{ margin: '5px 0', color: '#856404' }}>
                                <strong>⏰ Turno:</strong> {activeReserve[0]?.turn}
                            </p>
                        </div>
                    </div>
                )}
                {activeNigthsLigths && (
                    <div className="active-nights-lights-alert" style={{
                        backgroundColor: '#ffebee',
                        border: '2px solid #d32f2f',
                        borderRadius: '8px',
                        padding: '15px',
                        margin: '15px 0',
                        boxShadow: '0 4px 8px rgba(211, 47, 47, 0.2)',
                        color: '#b71c1c'
                    }}>
                        <strong>⚡ Aviso de deuda de luz nocturna</strong> <br /> En nuestros registros apareces con una deuda pendiente por uso de luz en horario nocturno. Por favor, comunícate con nuestra tesorera para regularizar tu situación.
                    </div>
                )}

                <div style={{display: 'flex', width: '100%', justifyContent: 'center'}}>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        min={minDate}
                        max={maxDate}
                        style={{
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            flex: '1',
                        }}
                    />
                </div>
                <div className="flex flex-col items-center">
                    {timeSlots.map((timeSlot, index) => (
                        <div key={index} className="time-slot-container"
                             style={{  width: '100%' }}
                        >
                            <div className="time-slot-time">{timeSlot.time}</div>
                            <div className="time-slot-courts">
                                {timeSlot.slots.map((slot, idx) => (
                                    <div
                                        key={idx}
                                        className={[
                                            'time-slot',
                                            slot.available ? 'available' : 'unavailable',
                                            slot.isPayed && 'paid',
                                            slot.data === 'Campeonato' && 'campeonato',
                                            slot.data === 'Mantencion' && 'mantencion',
                                            slot.data === 'Clases' && 'clases',
                                            slot.data === 'Clima' && 'clima',
                                            slot.data === 'Reserva' && 'reserva',
                                        ].filter(Boolean).join(' ')}
                                    >
                                        <div className="time-slot-court"
                                             onClick={() => handleTimeSlotClick(slot.court, timeSlot.time, slot.isPayed, slot.available, slot.data, slot.isBlockedByAdmin)}
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
    );
};

export default Dashboard;
