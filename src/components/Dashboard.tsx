import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import '../styles/Dashboard.css';
import axios from "axios";
import Modal from './Modal';
import Swal from "sweetalert2";
import { getTokenFromLocalStorage } from "../utils/tokenUtils.ts";
import { getUserInfoFromLocalStorage } from "../utils/userUtils.ts";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faClock, faChevronLeft, faChevronRight, faLightbulb } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import ResultsTicker from './ResultsTicker';
import ActiveReservationTicker from './ActiveReservationTicker';

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

const decodeJwtPayload = (token: string): { exp?: number } | null => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        return payload;
    } catch {
        return null;
    }
};

const isTokenExpired = (token: string): boolean => {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return true;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp <= nowInSeconds;
};

const renderCourtStatus = (status: string) => {
    if (!status.includes(',')) {
        return <span className="status-text">{status}</span>;
    }

    const players = status.split(',').map(player => player.trim()).filter(Boolean);

    if (players.length === 2) {
        return (
            <div className="status-matchup">
                <span className="status-player">{players[0]}</span>
                <span className="status-vs">vs</span>
                <span className="status-player">{players[1]}</span>
            </div>
        );
    }

    if (players.length === 4) {
        return (
            <div className="status-matchup status-matchup-doubles">
                <span className="status-team">{players[0]} / {players[1]}</span>
                <span className="status-vs">vs</span>
                <span className="status-team">{players[2]} / {players[3]}</span>
            </div>
        );
    }

    return <span className="status-text">{status}</span>;
};

const isExpiredSlot = (selectedDate: string, turn: string) => {
    const timezone = 'America/Santiago';
    const currentTime = DateTime.now().setZone(timezone);
    const playDate = DateTime.fromISO(selectedDate, { zone: timezone }).startOf('day');
    const today = currentTime.startOf('day');

    if (playDate < today) {
        return true;
    }

    if (!playDate.hasSame(today, 'day')) {
        return false;
    }

    const [start, end] = turn.split('-');
    const turnStartTime = DateTime.fromISO(`${selectedDate}T${start}`, { zone: timezone });
    let turnEndTime = DateTime.fromISO(`${selectedDate}T${end}`, { zone: timezone });

    if (turnEndTime <= turnStartTime) {
        turnEndTime = turnEndTime.plus({ days: 1 });
    }

    return currentTime >= turnEndTime;
};

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const userInfo = getUserInfoFromLocalStorage();
    const namePlayer = userInfo?.name || '';
    const userEmail = userInfo?.email || '';
    const isAdmin = userInfo?.role === 'admin';
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
    const blockedStatusCache = useRef<Record<string, boolean>>({});

    const forceLogoutToLogin = useCallback(async () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        await Swal.fire({
            icon: 'warning',
            title: 'Sesión expirada',
            text: 'Debes iniciar sesión nuevamente.',
            confirmButtonColor: '#1e88e5',
        });
        navigate('/login', { replace: true });
    }, [navigate]);

    let minDate = DateTime.now().toISODate();
    let maxDate = DateTime.now().plus({ days: 2 }).toISODate();
    if (isAdmin) {
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
        const newDate = DateTime.fromISO(selectedDate).plus({ days }).toISODate() ;
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
        (courtId: string, time: string, isPayed: boolean, available: boolean, _data: string, isBlockedByAdmin: boolean) => {
            if (isExpiredSlot(selectedDate, time)) {
                void Swal.fire({
                    icon: 'info',
                    title: 'Horario vencido',
                    showConfirmButton: false,
                    timer: 1000,
                    timerProgressBar: false,
                });
                return;
            }
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


    const getPlayersNames = useCallback(async () => {
        const playersNames = await axios.get(`${apiUrl}/register/names`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const namesWithoutMe = () => {
            return playersNames.data.filter((name: string) => name !== namePlayer);
        }
        setPlayersNames(namesWithoutMe);
    }, [apiUrl, namePlayer, token]);

    const getActiveReserves = useCallback(async () => {
        const url = `${apiUrl}/court-reserve/active/${namePlayer}`;
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const { data } = await axios.get(url, { headers });
            setActiveReserve(data);
        } catch (error) {
            console.error("Error fetching active reserves:", error);
            setActiveReserve(null);
        }
    }, [apiUrl, namePlayer, token]);

    // const getActiveNigthsLigths = async () => {
    //     const url = `${apiUrl}/register/active/${namePlayer}`;
    //     const headers = { Authorization: `Bearer ${token}` };
    //     try {
    //         const { data } = await axios.get(url, { headers });
    //         setActiveNigthsLigths(data);
    //     } catch (error) {
    //         console.error("Error fetching active reserves:", error);
    //         setActiveNigthsLigths(false);
    //     }
    // }

    const fetchData = useCallback(async () => {
        try {
            const response = await axios.get<CourtType[]>(`${apiUrl}/court-reserve/available/${selectedDate}`);
            if (!response.data) throw new Error('No data received');
            setTimeSlots(response.data);
        } catch (error) {
            console.error(error);
        }
    }, [apiUrl, selectedDate]);

    const getStateUser = useCallback(async (email: string): Promise<boolean> => {
        const cachedStatus = blockedStatusCache.current[email];
        if (typeof cachedStatus === 'boolean') {
            return cachedStatus;
        }

        try {
            const { data } = await axios.post(
                `${apiUrl}/auth/checkBlocked`,
                { email },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const isBlocked = typeof data === 'boolean' ? data : Boolean(data?.blocked);
            blockedStatusCache.current[email] = isBlocked;
            return isBlocked;
        } catch (error) {
            console.error('Error validando estado del usuario:', error);
            return false;
        }
    }, [apiUrl, token]);


    useEffect(() => {
        void getPlayersNames();
    }, [getPlayersNames]);

    useEffect(() => {
        const currentToken = getTokenFromLocalStorage();
        if (!currentToken || isTokenExpired(currentToken)) {
            void forceLogoutToLogin();
        }
    }, [forceLogoutToLogin]);

    useEffect(() => {
        const currentToken = getTokenFromLocalStorage();
        if (!currentToken || isTokenExpired(currentToken)) {
            void forceLogoutToLogin();
            return;
        }

        const loadDashboardData = async () => {
            if (!userEmail) {
                return;
            }

            const isBlocked = await getStateUser(userEmail);

            if (isBlocked) {
                localStorage.removeItem('token');
                localStorage.removeItem('userInfo');

                await Swal.fire({
                    icon: 'warning',
                    title: 'Usuario bloqueado',
                    text: 'Tu cuenta fue bloqueada. Debes iniciar sesión nuevamente.',
                    confirmButtonColor: '#1e88e5',
                });

                navigate('/login', { replace: true });
                return;
            }

            Swal.fire({
                title: 'Cargando...',
                text: 'Buscando horarios disponibles.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
            });

            await Promise.all([
                fetchData(),
                getActiveReserves(),
            ]);

            Swal.close();
        };

        void loadDashboardData();
    }, [fetchData, forceLogoutToLogin, getActiveReserves, getStateUser, navigate, selectedDate, userEmail]);


    return (
        <div className="dashboard-container">
            {/* Header Section */}
            <div className="dashboard-header">
                <p className="date-display">
                    <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                    {DateTime.fromISO(selectedDate).setLocale('es').toFormat('EEEE, d MMMM yyyy').replace(/^./, (str) => str.toUpperCase())}
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

            {/* Dashboard reminders */}
            <ResultsTicker />
            {activeReserve?.[0] && (
                <ActiveReservationTicker
                    court={activeReserve[0].court}
                    dateToPlay={activeReserve[0].dateToPlay}
                    turn={activeReserve[0].turn}
                />
            )}

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
                    const expiredTimeSlot = isExpiredSlot(selectedDate, timeSlot.time);
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
                                                    ${expiredTimeSlot ? 'expired' : ''}
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
                                        {!slot.available && renderCourtStatus(slot.data)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {isModalOpen && (
                <Modal
                    title="Reserva de Cancha"
                    isOpen={isModalOpen}
                    selectedTimeSlot={selectedTimeSlot}
                    playersNames={playersNames}
                    onClose={handleCloseModal}
                    onReservationCreated={async () => {
                        await Promise.all([fetchData(), getActiveReserves()]);
                    }}
                />
            )}
        </div>
    );
};

export default Dashboard;
