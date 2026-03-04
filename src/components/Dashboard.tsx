import React, { useCallback, useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import '../styles/Dashboard.css';
import axios from "axios";
import Modal from './Modal';
import Swal from "sweetalert2";
import { getTokenFromLocalStorage } from "../utils/tokenUtils.ts";
import { getUserInfoFromLocalStorage } from "../utils/userUtils.ts";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faClock, faExclamationTriangle, faBolt, faChevronLeft, faChevronRight, faLightbulb } from '@fortawesome/free-solid-svg-icons';

interface CourtReserve {
    turn: string;
    court: string;
    dateToPlay: string;
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
    const [activeReserve, setActiveReserve] = useState<CourtReserve[] | null>(null);
    const [activeNigthsLigths, setActiveNigthsLigths] = useState<boolean>(false);

    let minDate = DateTime.now().toISODate();
    let maxDate = DateTime.now().plus({ days: 2 }).toISODate();
    if (userInfo?.role === 'admin') {
        minDate = DateTime.now().minus({ months: 2 }).toISODate();
        maxDate = DateTime.now().plus({ month: 2 }).toISODate();
    }

    const apiUrl = import.meta.env.VITE_API_URL;
    const token = getTokenFromLocalStorage();

    const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = event.target.value;
        if (newDate < minDate || newDate > maxDate) {
            Swal.fire({
                icon: 'error',
                title: 'Fecha Inválida',
                text: `Por favor seleccione fecha entre ${minDate} y ${maxDate}.`,
                confirmButtonColor: '#1e88e5',
            });
            return;
        }
        setSelectedDate(newDate);
        setSelectedTimeSlot(null);
    };

    const changeDateByDays = (days: number) => {
        const newDate = DateTime.fromISO(selectedDate).plus({ days }).toISODate();
        if (newDate >= minDate && newDate <= maxDate) {
            setSelectedDate(newDate);
            setSelectedTimeSlot(null);
        }
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
            if (isBlockedByAdmin) {
                /*                 Swal.fire({
                                    icon: 'info',
                                    title: 'Horario Bloqueado',
                                    html: `Motivo<br><strong>${data}</strong>`,
                                    confirmButtonColor: '#1e88e5',
                                }); */
                return;
            }
            // If the slot is not available, do nothing. The user can already see the details.
            if (!available) {
                return;
            }
            if (activeReserve) {
                Swal.fire({
                    icon: 'error',
                    title: 'Información',
                    text: 'Ya tienes una reserva activa.',
                    confirmButtonColor: '#1e88e5',
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

    const getActiveNigthsLigths = async () => {
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
        <div className="dashboard-container container">
            {/* Header Section */}
            <div className="dashboard-header">
                <p className="date-display">
                    <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                    {DateTime.now().toFormat('EEEE, d MMMM yyyy')}
                </p>

                {/* Date Navigation */}
                <div className="date-navigation">
                    <button
                        className="nav-btn"
                        onClick={() => changeDateByDays(-1)}
                        disabled={selectedDate <= minDate}
                    >
                        <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                    <div className="date-picker-wrapper">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={handleDateChange}
                            min={minDate}
                            max={maxDate}
                            className="date-input"
                        />
                    </div>
                    <button
                        className="nav-btn"
                        onClick={() => changeDateByDays(1)}
                        disabled={selectedDate >= maxDate}
                    >
                        <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                </div>
            </div>

            {/* Alerts Section */}
            <div className="alerts-section">
                {activeReserve && (
                    <div className="alert-card warning">
                        <div className="alert-icon">
                            <FontAwesomeIcon icon={faExclamationTriangle} />
                        </div>
                        <div className="alert-content">
                            <h6>¡Tienes una reserva activa!</h6>
                            <div className="reserve-details">
                                <span><strong>🏟️ Cancha:</strong> {activeReserve[0]?.court.replace('Cancha ', '')}</span>
                                <span><strong>📅 Fecha:</strong> {DateTime.fromISO(activeReserve[0]?.dateToPlay).toFormat('dd/MM')}</span>
                                <span><strong>⏰ Turno:</strong> {activeReserve[0]?.turn}</span>
                            </div>
                        </div>
                    </div>
                )}

                {activeNigthsLigths && (
                    <div className="alert-card danger">
                        <div className="alert-icon">
                            <FontAwesomeIcon icon={faBolt} />
                        </div>
                        <div className="alert-content">
                            <h6>Deuda de Luz Nocturna</h6>
                            <p>Tienes una deuda pendiente. Por favor contacta a tesorería.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend Section */}
            <div className="legend-bar">
                <div className="legend-item available"><span className="dot available"></span>Disponible</div>
                <div className="legend-item reserved"><span className="dot reserved"></span>Reservado</div>
                <div className="legend-item maintenance"><span className="dot maintenance"></span>Mantención</div>
                <div className="legend-item championship"><span className="dot championship"></span>Campeonato</div>
                <div className="legend-item class"><span className="dot class"></span>Clases</div>
                <div className="legend-item weather"><span className="dot weather"></span>Clima</div>
            </div>

            {/* Time Slots Grid */}
            <div className="slots-grid">
                {timeSlots.map((timeSlot, index) => {
                    const allAvailable = timeSlot.slots.every(slot => slot.available);
                    return (
                        <div key={index} className="time-row">
                            <div className="time-label">
                                <FontAwesomeIcon icon={faClock} className="mr-1" />
                                {timeSlot.time}
                                {timeSlot.slots.some(slot => slot.isPayed) && (
                                    <FontAwesomeIcon icon={faLightbulb} className="time-paid-icon" title="Turno con luz nocturna" />
                                )}
                            </div>
                            <div className={`courts-container ${allAvailable ? 'all-available' : ''}`}>
                                {timeSlot.slots.map((slot, idx) => (
                                    <div
                                        key={idx}
                                        className={`court-card ${slot.available ? 'available' : 'unavailable'} 
                                                    ${slot.isPayed ? 'paid' : ''} 
                                                    ${slot.data === 'Campeonato' ? 'championship' : ''}
                                                    ${slot.data === 'Mantencion' ? 'maintenance' : ''}
                                                    ${slot.data === 'Clases' ? 'class' : ''}
                                                    ${slot.data === 'Clima' ? 'weather' : ''}
                                                    ${slot.data === 'Reserva' ? 'reserved' : ''}`}
                                        onClick={() => handleTimeSlotClick(slot.court, timeSlot.time, slot.isPayed, slot.available, slot.data, slot.isBlockedByAdmin)}
                                    >
                                        <span className="court-name">
                                            {slot.court.replace('Cancha ', 'C')}
                                        </span>
                                        {!slot.available && <span className="status-text">{slot.data}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {isModalOpen && (
                <Modal
                    id="timeSlotModal"
                    title="Reserva de Cancha"
                    isOpen={isModalOpen}
                    selectedTimeSlot={selectedTimeSlot}
                    playersNames={playersNames}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};

export default Dashboard;