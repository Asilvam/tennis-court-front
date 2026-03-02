import React, {ChangeEvent, useEffect, useState} from 'react';
import Swal from 'sweetalert2';
import Select from "react-select";
import axios from "axios";
import {useNavigate} from "react-router-dom";
import {DateTime} from "luxon";
import {customStyles} from "../utils/customStyles.ts";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarCheck,
    faClock,
    faUser,
    faUsers,
    faMapMarkerAlt,
    faTimes,
    faMoneyBillWave,
    faTrophy
} from '@fortawesome/free-solid-svg-icons';
import '../styles/Modal.css';
import logger from '../utils/logger';

interface ModalProps {
    id: string;
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

const Modal: React.FC<ModalProps> = ({id, title, isOpen, selectedTimeSlot, playersNames, onClose}) => {

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
    const apiUrl = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
    const timezone = 'America/Santiago'; // Chile timezone
    const currentTime = DateTime.now().setZone(timezone);
    const today = currentTime.startOf('day');

    // Actualizar el formulario cuando cambia el slot seleccionado
    useEffect(() => {
        if (selectedTimeSlot) {
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

    // Removed Materialize Modal init logic as we are controlling visibility via CSS/React state

    const formattedPlayers = playersNames.map(player => ({
        value: player,
        label: player
    }));

    const validateForm = () => {
        let isValid = true;
        if (formData.turn) {
            if (formData.dateToPlay != null) {
                const reservationDate = DateTime.fromISO(formData.dateToPlay, {zone: timezone});
                const isToday = reservationDate.hasSame(today, 'day');
                if (isToday) {
                    const [start, end] = formData.turn.split('-');
                    const startTime = DateTime.fromFormat(start, 'HH:mm', { zone: timezone });
                    const endTime = DateTime.fromFormat(end, 'HH:mm', { zone: timezone });
                    const isWithinTimeRange = (currentTime >= startTime && currentTime < endTime) || currentTime < startTime;
                    if (!isWithinTimeRange) {
                        isValid = false;
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Este horario, ya no esta disponible.',
                        });
                    }
                }
            }
        }
        const {player2, player3, player4} = formData;
        if (formData.isDouble) {
            if (formData.isVisit) {
                if (!player3 || !player4) {
                    isValid = false;
                    Swal.fire({
                        icon: 'error',
                        title: 'Error Players',
                        text: 'Player 3 y player 4 no pueden ser en blanco',
                    });
                } else if (new Set([player3, player4]).size !== 2) {
                    isValid = false;
                    Swal.fire({
                        icon: 'error',
                        title: 'Error Players',
                        text: 'Player 3 y Player 4 deben ser distintos.',
                    });
                }
            } else {
                if (!player2 || !player3 || !player4) {
                    isValid = false;
                    Swal.fire({
                        icon: 'error',
                        title: 'Error Players',
                        text: 'Player 2, Player 3, y Player 4 no pueden ser blanco.',
                    });
                } else if (new Set([player2, player3, player4]).size !== 3) {
                    isValid = false;
                    Swal.fire({
                        icon: 'error',
                        title: 'Error Players',
                        text: 'Player 2, Player 3, y Player 4 deben ser distintos.',
                    });
                }
            }
        } else if (!player2 && !formData.isVisit) {
            isValid = false;
            Swal.fire({
                icon: 'error',
                title: 'Error Player',
                text: 'Player 2 no puede ser en blanco.',
            });
        }

        return isValid;
    };

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const {checked} = e.target as HTMLInputElement;
        const { name, value, type } = e.target;
        setFormData((prevState) => {
            const updatedState = { ...prevState, [name]: type === 'checkbox' ? checked : value };
            if (type === 'checkbox') {
                if (name === 'isVisit') {
                    return {
                        ...updatedState,
                        player2: checked ? '' : updatedState.player2,
                        visitName: checked ? 'Visita' : '',
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

            const response = await axios.post(`${apiUrl}/mp/init-point`, {
                courtId: formData.court,
                date: formData.dateToPlay,
                time: formData.turn,
                player1: formData.player1,
                amount: amountToPay,
                idCourtReserve: reserveId,
            });
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
            await Swal.fire({
                icon: 'success',
                title: 'Reserva Lista',
                text: 'Tu reserva está lista!',
            });
            navigate('/summary', { state: { responseData: response.data } });
        }
    };

    const createTemporalReserve= async ()=>{
        const response = await axios.post(`${apiUrl}/court-reserve`, formData);
        return response.data.idCourtReserve;
    }

    const handleReserve = async () => {
        if (!validateForm()) {
            return;
        }
        try {
            let amountToPay = 0;
            let title = '';
            let text = '';

            if (formData.isPaidNight && formData.isVisit) {
                amountToPay = 11000;
                title = 'Visita y Reserva nocturna Pagada';
                text = "Este turno requiere pago de $11000. ¿Deseas continuar?";
            } else if (formData.isPaidNight) {
                amountToPay = 4000;
                title = 'Turno Pagado';
                text = "Este turno requiere pago de $4000. ¿Deseas continuar?";
            } else if (formData.isVisit) {
                amountToPay = 7000;
                title = 'Visita Pagada';
                text = "Este turno requiere pago de $7000. ¿Deseas continuar?";
            }

            if (amountToPay > 0) {
                const result = await Swal.fire({
                    title: title,
                    text: text,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, pagar ahora',
                    cancelButtonText: 'Cancelar'
                });
                if (result.isConfirmed) {
                    Swal.fire({
                        title: 'Creando reserva...',
                        text: 'Preparando tu pago...',
                        showConfirmButton: false,
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading(),
                    });
                    const reserveId = await createTemporalReserve();
                    await handlePay(reserveId, amountToPay);
                    return;
                }
                return;
            }

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
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Network Error',
                        text: 'Error de Red',
                    });
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Unexpected Error',
                    text: 'Un error inesperado ha ocurrido. Intente mas tarde.',
                });
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header-modern">
                    <div className="header-title">
                        <FontAwesomeIcon icon={faCalendarCheck} className="header-icon" />
                        <h3>{title}</h3>
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                
                <div className="modal-body-modern">
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
                                <label className="input-label">Oponente (Player 2)</label>
                                <Select
                                    value={formData.isVisit ? null : formattedPlayers.find(option => option.value === formData.player2)}
                                    onChange={(selectedOption) => {
                                        if (selectedOption && 'value' in selectedOption) {
                                            setFormData((prevState) => ({ ...prevState, player2: selectedOption.value }));
                                        } else {
                                            setFormData((prevState) => ({ ...prevState, player2: '' }));
                                        }
                                    }}
                                    options={formattedPlayers}
                                    placeholder={formData.isDouble ? "Selecciona Player 2" : "Selecciona un oponente"}
                                    isSearchable
                                    isDisabled={formData.isVisit}
                                    menuPortalTarget={document.body}
                                    maxMenuHeight={160}
                                    menuPlacement="auto"
                                    styles={customStyles}
                                    className="react-select-container"
                                    classNamePrefix="react-select"
                                />
                            </div>

                            <div className="options-grid">
                                <label className={`option-card ${formData.isVisit ? 'active' : ''}`}>
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
                                
                                <label className={`option-card ${formData.isDouble ? 'active' : ''}`}>
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
                                
                                <label className={`option-card ${formData.isForRanking ? 'active' : ''} ${formData.isVisit ? 'disabled' : ''}`}>
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
                                        <label className="input-label">Player 3</label>
                                        <Select
                                            value={formattedPlayers.find(option => option.value === formData.player3)}
                                            onChange={(selectedOption) => {
                                                if (selectedOption && 'value' in selectedOption) {
                                                    setFormData((prevState) => ({ ...prevState, player3: selectedOption.value }));
                                                } else {
                                                    setFormData((prevState) => ({ ...prevState, player3: '' }));
                                                }
                                            }}
                                            options={formattedPlayers}
                                            placeholder="Selecciona Player 3"
                                            isSearchable
                                            menuPortalTarget={document.body}
                                            maxMenuHeight={160}
                                            menuPlacement="top"
                                            styles={customStyles}
                                        />
                                    </div>
                                    <div className="form-section">
                                        <label className="input-label">Player 4</label>
                                        <Select
                                            value={formattedPlayers.find(option => option.value === formData.player4)}
                                            onChange={(selectedOption) => {
                                                if (selectedOption && 'value' in selectedOption) {
                                                    setFormData((prevState) => ({ ...prevState, player4: selectedOption.value }));
                                                } else {
                                                    setFormData((prevState) => ({ ...prevState, player4: '' }));
                                                }
                                            }}
                                            options={formattedPlayers}
                                            placeholder="Selecciona Player 4"
                                            isSearchable
                                            menuPortalTarget={document.body}
                                            maxMenuHeight={160}
                                            menuPlacement="top"
                                            styles={customStyles}
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
                    <button className="btn-cancel" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        className={`btn-confirm ${formData.isPaidNight || formData.isVisit ? 'btn-pay' : 'btn-reserve'}`}
                        onClick={handleReserve}
                    >
                        {formData.isPaidNight || formData.isVisit ? (
                            <>
                                <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" /> Pagar
                            </>
                        ) : (
                            'Confirmar Reserva'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
