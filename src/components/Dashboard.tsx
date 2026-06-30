import React, { useCallback, useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import '../styles/Dashboard.css';
import axios from "axios";
import { useQuery } from '@tanstack/react-query';
import Modal from './Modal';
import Swal from "sweetalert2";
import { getTokenFromLocalStorage } from "../utils/tokenUtils.ts";
import { getUserInfoFromLocalStorage } from "../utils/userUtils.ts";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faClock, faExclamationTriangle, faChevronLeft, faChevronRight, faLightbulb } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import ResultsTicker from './ResultsTicker';

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

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const userInfo = getUserInfoFromLocalStorage();
    const namePlayer = userInfo?.name || '';
    // timeSlots is now provided by React Query (availableQuery)
    const [selectedDate, setSelectedDate] = useState<string>(DateTime.now().toISODate());
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
        courtId: string;
        time: string;
        date: string;
        player1: string | undefined;
        isPayed: boolean;
    } | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);
    // playersNames will be read directly from playersNamesQuery.data

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

    // handleTimeSlotClick moved below so it can safely reference query results


    // React Query: playersNames and active reserves
    const playersNamesQuery = useQuery({
        queryKey: ['playersNames'],
        queryFn: async () => {
            const res = await axios.get(`${apiUrl}/register/names`, { headers: { Authorization: `Bearer ${token}` } });
            return Array.isArray(res.data) ? res.data.filter((n: string) => n !== namePlayer) : [];
        },
        enabled: !!token,
    });

    const activeReservesQuery = useQuery({
        queryKey: ['activeReserves', namePlayer],
        queryFn: async () => {
            const url = `${apiUrl}/court-reserve/active/${namePlayer}`;
            const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
            return data;
        },
        enabled: !!namePlayer && !!token,
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });

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

    const availableQuery = useQuery({
        queryKey: ['available', selectedDate],
        queryFn: async () => {
            const response = await axios.get<CourtType[]>(`${apiUrl}/court-reserve/available/${selectedDate}`);
            return response.data || [];
        },
        enabled: !!selectedDate,
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    // handleTimeSlotClick references activeReservesQuery at runtime to decide whether to allow creating a new reservation
    const handleTimeSlotClick = useCallback(
        (courtId: string, time: string, isPayed: boolean, available: boolean, data: string, isBlockedByAdmin: boolean) => {
            if (isBlockedByAdmin) return;
            if (!available) return;
            const hasActive = (activeReservesQuery?.data && activeReservesQuery.data.length > 0) || false;
            if (hasActive) {
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
        [selectedDate, namePlayer, activeReservesQuery?.data]
    );

    // checkBlocked as a cached query to avoid re-checking on every date change
    const checkBlockedQuery = useQuery({
        queryKey: ['checkBlocked', userInfo?.email],
        queryFn: async () => {
            if (!userInfo?.email) return false;
            try {
                const { data } = await axios.post(
                    `${apiUrl}/auth/checkBlocked`,
                    { email: userInfo.email },
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                return typeof data === 'boolean' ? data : Boolean(data?.blocked);
            } catch (error) {
                console.error('Error validando estado del usuario:', error);
                return false;
            }
        },
        enabled: !!userInfo?.email && !!token,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
    });


    // playersNamesQuery.data will be used directly where needed

    useEffect(() => {
        const currentToken = getTokenFromLocalStorage();
        if (!currentToken || isTokenExpired(currentToken)) {
            void forceLogoutToLogin();
        }
    }, [forceLogoutToLogin]);

    // Show loading modal while any of the important queries are loading
    useEffect(() => {
        const anyLoading = availableQuery?.isLoading || activeReservesQuery?.isLoading || playersNamesQuery?.isLoading;
        if (anyLoading) {
            Swal.fire({
                title: 'Cargando...',
                text: 'Buscando horarios disponibles.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
            });
        } else {
            Swal.close();
        }
    }, [availableQuery?.isLoading, activeReservesQuery?.isLoading, playersNamesQuery?.isLoading]);

    useEffect(() => {
        const currentToken = getTokenFromLocalStorage();
        if (!currentToken || isTokenExpired(currentToken)) {
            void forceLogoutToLogin();
            return;
        }

        // Use cached query value to decide whether to logout the user
        const isBlocked = checkBlockedQuery.data;
        if (isBlocked) {
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');

            (async () => {
                await Swal.fire({
                    icon: 'warning',
                    title: 'Usuario bloqueado',
                    text: 'Tu cuenta fue bloqueada. Debes iniciar sesión nuevamente.',
                    confirmButtonColor: '#1e88e5',
                });
                navigate('/login', { replace: true });
            })();
        }
    }, [selectedDate, userInfo?.email, forceLogoutToLogin, checkBlockedQuery.data, navigate]);


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

            {/* Alerts Section */}
            <ResultsTicker />
            <div className="alerts-section">
                {(activeReservesQuery.data && activeReservesQuery.data.length > 0) && (
                    <div className="alert-card warning">
                        <div className="alert-icon">
                            <FontAwesomeIcon icon={faExclamationTriangle} />
                        </div>
                        <div className="alert-content">
                            <h6>¡Tienes una reserva activa!</h6>
                            <div className="reserve-details">
                                 <span><strong>🏟️ Cancha:</strong> {activeReservesQuery.data[0]?.court.replace('Cancha ', '')}</span>
                                 <span><strong>📅 Fecha:</strong> {DateTime.fromISO(activeReservesQuery.data[0]?.dateToPlay).toFormat('dd/MM')}</span>
                                 <span><strong>⏰ Turno:</strong> {activeReservesQuery.data[0]?.turn}</span>
                            </div>
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
            {(availableQuery.data || []).map((timeSlot, index) => {
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
                    playersNames={(playersNamesQuery.data as string[]) || []}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};

export default Dashboard;
