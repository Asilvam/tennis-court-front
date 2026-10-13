import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { DateTime } from "luxon";
import { customStyles } from "../utils/customStyles.ts";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarCheck,
    faClock,
    faUser,
    faUsers,
    faMapMarkerAlt,
    faTimes,
    faTrophy
} from '@fortawesome/free-solid-svg-icons';
import '../styles/Modal.css';
import logger from '../utils/logger';
import { AdaptiveSelect, type SelectOption } from './AdaptiveSelect';
import { OptionPicker } from './OptionPicker';
import { useVisibleViewport } from '../hooks/useVisibleViewport';
import { getReservationPaymentAmount } from '../utils/paymentRates';
import { usePaymentHold } from '../hooks/usePaymentHold';
import { getTokenFromLocalStorage } from '../utils/tokenUtils';

type PlayerField = 'player2' | 'player3' | 'player4';
const playerInputIds = { player2: 'reservation-player-2', player3: 'reservation-player-3', player4: 'reservation-player-4' };

interface ModalProps {
    title: string;
    isOpen: boolean;
    selectedTimeSlot: {
        courtId: string;
        date: string;
        time: string;
        player1: string | undefined;
        isPayed: boolean;
    } | null;
    playersNames: string[];
    onClose: () => void;
    onReservationCreated?: () => Promise<void> | void;
}

interface ReserveFormData {
    court: string;
    player1: string | undefined;
    player2: string;
    player3: string;
    player4: string;
    dateToPlay: string | undefined;
    turn: string | undefined;
    isPaidNight: boolean | undefined;
    wasPaidNight: boolean | undefined;
    isVisit: boolean;
    visitName: string;
    isDouble: boolean;
    isForRanking: boolean;
}

const Modal: React.FC<ModalProps> = ({
    title,
    isOpen,
    selectedTimeSlot,
    playersNames,
    onClose,
    onReservationCreated,
}) => {

    const initialFormData: ReserveFormData = {
        court: '' + selectedTimeSlot?.courtId,
        player1: selectedTimeSlot?.player1,
        player2: '',
        player3: '',
        player4: '',
        dateToPlay: selectedTimeSlot?.date,
        turn: selectedTimeSlot?.time,
        isPaidNight: selectedTimeSlot?.isPayed,
        wasPaidNight: !selectedTimeSlot?.isPayed,
        isVisit: false,
        visitName: '',
        isForRanking: false,
        isDouble: false,
    };

    const [formData, setFormData] = useState<ReserveFormData>(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submissionInProgress = useRef(false);
    const visibleViewport = useVisibleViewport(isOpen);
    const [activePicker, setActivePicker] = useState<{ field: PlayerField; query: string } | null>(null);
    const body = useRef<HTMLDivElement>(null);
    const savedScroll = useRef(0);
    const apiUrl = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
    const timezone = 'America/Santiago'; // Chile timezone
    const currentTime = DateTime.now().setZone(timezone);
    const today = currentTime.startOf('day');
    const requiresPayment = Boolean(formData.isPaidNight || formData.isVisit);
    const paymentHold = usePaymentHold(isOpen && requiresPayment, {
        court: formData.court, dateToPlay: formData.dateToPlay, turn: formData.turn, isVisit: formData.isVisit,
    });

    const closeReservation = async () => {
        if (submissionInProgress.current) return;
        submissionInProgress.current = true;
        setIsSubmitting(true);
        try {
            await paymentHold.release();
            onClose();
            await onReservationCreated?.();
        } catch {
            await Swal.fire({ icon: 'warning', title: 'No pudimos liberar el horario', text: 'La retención se liberará por vencimiento después de verificar el pago.' });
        } finally {
            submissionInProgress.current = false;
            setIsSubmitting(false);
        }
    };

    // Actualizar el formulario cuando cambia el slot seleccionado
    useEffect(() => {
        if (selectedTimeSlot) {
            setActivePicker(null);
            setFormData({
                court: '' + selectedTimeSlot.courtId,
                player1: selectedTimeSlot.player1,
                player2: '',
                player3: '',
                player4: '',
                dateToPlay: selectedTimeSlot.date,
                turn: selectedTimeSlot.time,
                isPaidNight: selectedTimeSlot.isPayed,
                wasPaidNight: !selectedTimeSlot.isPayed,
                isVisit: false,
                visitName: '',
                isForRanking: false,
                isDouble: false,
            });
        }
    }, [selectedTimeSlot]);

    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    const formattedPlayers = playersNames.map(player => ({
        value: player,
        label: player
    }));

    const openPlayerPicker = (field: PlayerField, query: string) => {
        savedScroll.current = body.current?.scrollTop ?? 0;
        setActivePicker({ field, query });
    };
    const closePlayerPicker = () => {
        const field = activePicker?.field;
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setActivePicker(null);
        requestAnimationFrame(() => {
            if (body.current) body.current.scrollTop = savedScroll.current;
            if (field) document.getElementById(`${playerInputIds[field]}-trigger`)?.focus({ preventScroll: true });
        });
    };
    const choosePlayer = (option: SelectOption) => {
        if (!activePicker) return;
        setFormData(previous => ({ ...previous, [activePicker.field]: option.value }));
        closePlayerPicker();
    };

    const validateForm = () => {
        let isValid = true;
        if (formData.turn) {
            if (formData.dateToPlay != null) {
                const reservationDate = DateTime.fromISO(formData.dateToPlay, { zone: timezone });
                const isToday = reservationDate.hasSame(today, 'day');
                if (isToday) {
                    const [start, end] = formData.turn.split('-');
                    const startTime = DateTime.fromISO(`${formData.dateToPlay}T${start}`, { zone: timezone });
                    let endTime = DateTime.fromISO(`${formData.dateToPlay}T${end}`, { zone: timezone });

                    if (endTime <= startTime) {
                        endTime = endTime.plus({ days: 1 });
                    }

                    if (currentTime >= endTime) {
                        isValid = false;
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Este horario, ya no esta disponible.',
                            confirmButtonColor: '#1e88e5',
                        });
                    }
                }
            }
        }
        const { player2, player3, player4 } = formData;
        if (formData.isDouble) {
            if (formData.isVisit) {
                if (!player3 || !player4) {
                    isValid = false;
                    Swal.fire({
                        icon: 'error',
                        title: 'Error Players',
                        text: 'Player 3 y player 4 no pueden ser en blanco',
                        confirmButtonColor: '#1e88e5',
                    });
                } else if (new Set([player3, player4]).size !== 2) {
                    isValid = false;
                    Swal.fire({
                        icon: 'error',
                        title: 'Error Players',
                        text: 'Player 3 y Player 4 deben ser distintos.',
                        confirmButtonColor: '#1e88e5',
                    });
                }
            } else {
                if (!player2 || !player3 || !player4) {
                    isValid = false;
                    Swal.fire({
                        icon: 'error',
                        title: 'Error Players',
                        text: 'Player 2, Player 3, y Player 4 no pueden ser blanco.',
                        confirmButtonColor: '#1e88e5',
                    });
                } else if (new Set([player2, player3, player4]).size !== 3) {
                    isValid = false;
                    Swal.fire({
                        icon: 'error',
                        title: 'Error Players',
                        text: 'Player 2, Player 3, y Player 4 deben ser distintos.',
                        confirmButtonColor: '#1e88e5',
                    });
                }
            }
        } else if (!player2 && !formData.isVisit) {
            isValid = false;
            Swal.fire({
                icon: 'error',
                title: 'Error Player',
                text: 'Player 2 no puede ser en blanco.',
                confirmButtonColor: '#1e88e5',
            });
        }

        return isValid;
    };

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { checked } = e.target as HTMLInputElement;
        const { name, value, type } = e.target;
        setFormData((prevState) => {
            const updatedState = { ...prevState, [name]: type === 'checkbox' ? checked : value };
            if (type === 'checkbox') {
                if (name === 'isVisit') {
                    return {
                        ...updatedState,
                        player2: checked ? '' : updatedState.player2,
                        visitName: checked ? 'Visita' : '',
                        isForRanking: checked ? false : updatedState.isForRanking,
                    };
                }
                if (name === 'isDouble' && !checked) {
                    return {
                        ...updatedState,
                        player3: '',
                        player4: '',
                    };
                }
            }
            return updatedState;
        });
    };

    const handlePay = async (reserveId: string, amountToPay: number) => {
        try {
            Swal.fire({
                title: 'Procesando pago...',
                text: 'Redirigiendo a Mercado Pago...',
                showConfirmButton: false,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
            });

            paymentHold.checkoutStarted.current = true;
            const response = await axios.post(`${apiUrl}/mp/init-point`, {
                courtId: formData.court,
                date: formData.dateToPlay,
                time: formData.turn,
                player1: formData.player1,
                amount: amountToPay,
                idCourtReserve: reserveId,
            }, { headers: { Authorization: `Bearer ${getTokenFromLocalStorage()}` } });
            logger.debug(response);
            window.location.href = response.data.initPoint;
        } catch (error) {
            logger.error('Error creating payment:', error);
            throw error;
        }
    };

    const createReservation = async () => {
        Swal.fire({
            title: 'Procesando...',
            text: 'Creando tu reserva...',
            showConfirmButton: false,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
        });

        const response = await axios.post(`${apiUrl}/court-reserve`, formData);

        if (response.status === 200 || response.status === 201) {
            const reservation = response.data;
            const summary = document.createElement('div');
            summary.className = 'swal-reservation-summary';

            const intro = document.createElement('p');
            intro.className = 'swal-reservation-intro';
            intro.textContent = 'Tu reserva quedó registrada correctamente.';
            summary.appendChild(intro);

            const details = document.createElement('div');
            details.className = 'swal-reservation-grid';

            const reservationDetails = [
                {
                    label: 'Fecha',
                    value: DateTime.fromISO(reservation.dateToPlay).setLocale('es-CL').toFormat('dd/MM/yyyy'),
                },
                { label: 'Horario', value: reservation.turn },
                { label: 'Cancha', value: reservation.court },
            ];

            reservationDetails.forEach(({ label, value }) => {
                const item = document.createElement('div');
                item.className = 'swal-reservation-item';

                const itemLabel = document.createElement('span');
                itemLabel.className = 'swal-reservation-label';
                itemLabel.textContent = label;

                const itemValue = document.createElement('strong');
                itemValue.className = 'swal-reservation-value';
                itemValue.textContent = value;

                item.append(itemLabel, itemValue);
                details.appendChild(item);
            });

            summary.appendChild(details);

            const firstTeam = reservation.isDouble
                ? [reservation.player1, reservation.player2 || reservation.visitName].filter(Boolean).join(' / ')
                : reservation.player1;
            const secondTeam = reservation.isDouble
                ? [reservation.player3, reservation.player4].filter(Boolean).join(' / ')
                : reservation.player2 || reservation.visitName;

            if (firstTeam && secondTeam) {
                const matchup = document.createElement('p');
                matchup.className = 'swal-reservation-matchup';
                matchup.textContent = `${firstTeam}  vs  ${secondTeam}`;
                summary.appendChild(matchup);
            }

            await Swal.fire({
                icon: 'success',
                title: '¡Reserva confirmada!',
                html: summary,
                confirmButtonText: 'Volver al dashboard',
                allowOutsideClick: false,
            });
            onClose();
            await onReservationCreated?.();
            navigate('/dashboard', { replace: true });
        }
    };

    const handleReserve = async () => {
        if (submissionInProgress.current || !validateForm()) {
            return;
        }
        submissionInProgress.current = true;
        setIsSubmitting(true);
        try {
            if (formData.isPaidNight || formData.isVisit) {
                Swal.fire({
                    title: 'Consultando tarifa...',
                    text: 'Obteniendo el importe desde el backend.',
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading(),
                });
                const response = await axios.get(`${apiUrl}/mp/rates`, { timeout: 10_000 });
                const amountToPay = getReservationPaymentAmount(response.data, Boolean(formData.isPaidNight), formData.isVisit);
                const formattedAmount = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amountToPay);
                const title = formData.isPaidNight && formData.isVisit
                    ? 'Visita y Reserva nocturna Pagada'
                    : formData.isPaidNight ? 'Turno Pagado' : 'Visita Pagada';
                const hold = paymentHold.hold;
                if (!hold || paymentHold.remainingSeconds <= 0) throw new Error('La retención venció o no está disponible. Cierra el modal y vuelve a seleccionar el horario.');
                if (!paymentHold.checkoutStarted.current) {
                    await axios.patch(`${apiUrl}/court-reserve/holds/${hold.idCourtReserve}`, formData, {
                        headers: { Authorization: `Bearer ${getTokenFromLocalStorage()}` },
                    });
                }
                const result = await Swal.fire({
                    title: title,
                    text: `Este turno requiere pago de ${formattedAmount}. ¿Deseas continuar?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, pagar ahora',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#1e88e5',
                    timer: paymentHold.remainingMs(),
                    timerProgressBar: true,
                });
                if (result.isConfirmed) {
                    Swal.fire({
                        title: 'Creando reserva...',
                        text: 'Preparando tu pago...',
                        showConfirmButton: false,
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading(),
                    });
                    await handlePay(hold.idCourtReserve, amountToPay);
                    return;
                }
                await paymentHold.release();
                onClose();
                await onReservationCreated?.();
                return;
            }

            await paymentHold.release();
            await createReservation();
        } catch (error) {
            logger.error(error);
            Swal.close();
            if (axios.isAxiosError(error)) {
                if (error.response && error.response.data && error.response.data.message) {
                    const { message } = error.response.data;
                    Swal.fire({
                        icon: 'error',
                        title: 'Reservation Error',
                        text: message || 'There was an issue with your reservation. Please try again.',
                        confirmButtonColor: '#1e88e5',
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Network Error',
                        text: 'Error de Red',
                        confirmButtonColor: '#1e88e5',
                    });
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Unexpected Error',
                    text: error instanceof Error ? error.message : 'Un error inesperado ha ocurrido. Intente mas tarde.',
                    confirmButtonColor: '#1e88e5',
                });
            }
        } finally {
            submissionInProgress.current = false;
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="modal-overlay"
            onClick={activePicker ? closePlayerPicker : () => void closeReservation()}
            style={visibleViewport ? {
                top: visibleViewport.top,
                left: visibleViewport.left,
                right: 'auto',
                bottom: 'auto',
                width: visibleViewport.width,
                height: visibleViewport.height,
            } : undefined}
        >
            <div
                className={`modal-container${activePicker ? ' modal-container--picking' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label={activePicker ? 'Elegir jugador' : title}
                onClick={(e) => e.stopPropagation()}
            >
                {activePicker ? (
                    <OptionPicker
                        key={activePicker.field}
                        id="reservation-player-search"
                        title={activePicker.field === 'player2' && !formData.isDouble ? 'Elegir oponente' : `Elegir jugador ${activePicker.field.slice(-1)}`}
                        placeholder="Buscar jugador"
                        options={formattedPlayers}
                        value={formData[activePicker.field]}
                        initialQuery={activePicker.query}
                        onSelect={choosePlayer}
                        onCancel={closePlayerPicker}
                    />
                ) : (
                <>
                <div className="modal-header-modern">
                    <div className="header-title">
                        <FontAwesomeIcon icon={faCalendarCheck} className="header-icon" />
                        <h3>{title}</h3>
                    </div>
                    <button className="close-button" onClick={() => void closeReservation()} disabled={isSubmitting}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                <div ref={body} className="modal-body-modern">
                    {requiresPayment && (
                        <p className="payment-hold-notice" role="status">
                            {paymentHold.loading ? 'Reteniendo horario…' : paymentHold.error || (
                                paymentHold.remainingSeconds > 0
                                    ? `⏳ Horario retenido: ${Math.floor(paymentHold.remainingSeconds / 60)}:${String(paymentHold.remainingSeconds % 60).padStart(2, '0')} restantes.`
                                    : 'La retención venció. Cierra y vuelve a seleccionar el horario.'
                            )}
                        </p>
                    )}
                    {selectedTimeSlot ? (
                        <>
                            <div className="reservation-summary-card">
                                <div className="summary-item">
                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="summary-icon" />
                                    <div>
                                        <span className="label">Cancha</span>
                                        <span className="value">{selectedTimeSlot.courtId.replace('Cancha ', '')}</span>
                                    </div>
                                </div>
                                <div className="summary-item">
                                    <FontAwesomeIcon icon={faCalendarCheck} className="summary-icon" />
                                    <div>
                                        <span className="label">Fecha</span>
                                        <span className="value">{selectedTimeSlot.date ? DateTime.fromISO(selectedTimeSlot.date).toFormat('dd/MM') : ''}</span>
                                    </div>
                                </div>
                                <div className="summary-item">
                                    <FontAwesomeIcon icon={faClock} className="summary-icon" />
                                    <div>
                                        <span className="label">Hora</span>
                                        <span className="value">{selectedTimeSlot.time}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <label className="input-label" htmlFor="reservation-player-2">Oponente (Player 2)</label>
                                <AdaptiveSelect
                                    inputId="reservation-player-2"
                                    label="Oponente (Player 2)"
                                    viewport={visibleViewport}
                                    onOpenPicker={query => openPlayerPicker('player2', query)}
                                    value={formData.isVisit ? null : formattedPlayers.find(option => option.value === formData.player2) ?? null}
                                    onChange={(selectedOption) => {
                                        if (selectedOption && 'value' in selectedOption) {
                                            setFormData((prevState) => ({ ...prevState, player2: selectedOption.value }));
                                        } else {
                                            setFormData((prevState) => ({ ...prevState, player2: '' }));
                                        }
                                    }}
                                    options={formattedPlayers}
                                    placeholder={formData.isDouble ? "Selecciona Player 2" : "Selecciona un oponente"}
                                    isDisabled={formData.isVisit}
                                    styles={customStyles}
                                    classNamePrefix="react-select"
                                />
                            </div>

                            <div className="options-grid">
                                <label className={`option-card option-card--yellow ${formData.isVisit ? 'active' : ''}`}>
                                    <input
                                        type="checkbox"
                                        name="isVisit"
                                        checked={formData.isVisit}
                                        onChange={handleChange}
                                    />
                                    <div className="option-content">
                                        <FontAwesomeIcon icon={faUser} className="option-icon" />
                                        <span>Visita</span>
                                    </div>
                                </label>

                                <label className={`option-card option-card--yellow ${formData.isDouble ? 'active' : ''}`}>
                                    <input
                                        type="checkbox"
                                        name="isDouble"
                                        checked={formData.isDouble}
                                        onChange={handleChange}
                                    />
                                    <div className="option-content">
                                        <FontAwesomeIcon icon={faUsers} className="option-icon" />
                                        <span>Dobles</span>
                                    </div>
                                </label>

                                <label className={`option-card option-card--yellow ${formData.isForRanking ? 'active' : ''} ${formData.isVisit ? 'disabled' : ''}`}>
                                    <input
                                        type="checkbox"
                                        name="isForRanking"
                                        checked={formData.isForRanking}
                                        onChange={handleChange}
                                        disabled={formData.isVisit}
                                    />
                                    <div className="option-content">
                                        <FontAwesomeIcon icon={faTrophy} className="option-icon" />
                                        <span>Ranking</span>
                                    </div>
                                </label>
                            </div>

                            {formData.isDouble && (
                                <div className="doubles-section">
                                    <div className="form-section">
                                        <label className="input-label" htmlFor="reservation-player-3">Player 3</label>
                                        <AdaptiveSelect
                                            inputId="reservation-player-3"
                                            label="Player 3"
                                            viewport={visibleViewport}
                                            onOpenPicker={query => openPlayerPicker('player3', query)}
                                            value={formattedPlayers.find(option => option.value === formData.player3) ?? null}
                                            onChange={(selectedOption) => {
                                                if (selectedOption && 'value' in selectedOption) {
                                                    setFormData((prevState) => ({ ...prevState, player3: selectedOption.value }));
                                                } else {
                                                    setFormData((prevState) => ({ ...prevState, player3: '' }));
                                                }
                                            }}
                                            options={formattedPlayers}
                                            placeholder="Selecciona Player 3"
                                            styles={customStyles}
                                            classNamePrefix="react-select"
                                        />
                                    </div>
                                    <div className="form-section">
                                        <label className="input-label" htmlFor="reservation-player-4">Player 4</label>
                                        <AdaptiveSelect
                                            inputId="reservation-player-4"
                                            label="Player 4"
                                            viewport={visibleViewport}
                                            onOpenPicker={query => openPlayerPicker('player4', query)}
                                            value={formattedPlayers.find(option => option.value === formData.player4) ?? null}
                                            onChange={(selectedOption) => {
                                                if (selectedOption && 'value' in selectedOption) {
                                                    setFormData((prevState) => ({ ...prevState, player4: selectedOption.value }));
                                                } else {
                                                    setFormData((prevState) => ({ ...prevState, player4: '' }));
                                                }
                                            }}
                                            options={formattedPlayers}
                                            placeholder="Selecciona Player 4"
                                            styles={customStyles}
                                            classNamePrefix="react-select"
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <p>No time slot selected</p>
                    )}
                </div>

                <div className="modal-footer-modern">
                    <button className="btn-cancel" onClick={() => void closeReservation()} disabled={isSubmitting}>
                        Cancelar
                    </button>
                    <button
                        className={`btn-confirm ${formData.isPaidNight || formData.isVisit ? 'btn-pay' : 'btn-reserve'}`}
                        onClick={handleReserve}
                        disabled={isSubmitting || (requiresPayment && (paymentHold.loading || !paymentHold.hold || paymentHold.remainingSeconds <= 0))}
                    >
                        {isSubmitting ? 'Procesando...' : formData.isPaidNight || formData.isVisit ? (
                            <>
                                Pagar
                            </>
                        ) : (
                            'Confirmar Reserva'
                        )}
                    </button>
                </div>
                </>
                )}
            </div>
        </div>
    );
};

export default Modal;
