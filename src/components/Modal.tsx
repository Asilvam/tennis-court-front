import React, {ChangeEvent, useEffect, useState} from 'react';
import M from 'materialize-css';
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
    faMapMarkerAlt
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
    // const [idCourtReserve, setIdCourtReserve] = useState('');

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

    useEffect(() => {
        const modalElement = document.getElementById(id);
        if (modalElement) {
            const instance = M.Modal.init(modalElement, {
                onCloseEnd: onClose,
            });
            if (isOpen) {
                instance.open();
            } else {
                instance.close();
            }
            return () => instance.destroy();
        }
    }, [id, isOpen, onClose]);

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
                        // isForRanking: checked ? false : true,
                        visitName: checked ? 'Visita' : '', // Reset visitName when unchecked
                    };
                }
                if (name === 'isDouble' && !checked) {
                    return {
                        ...updatedState,
                        player3: '', // Reset player3 if isDouble is unchecked
                        player4: '', // Reset player4 if isDouble is unchecked
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
            throw error; // Propagar el error para manejarlo en handleReserve
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
        // setIdCourtReserve(response.data.idCourtReserve)
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

            // Determinar el tipo de pago y monto con if/else if para evitar cascadas
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

            // Si hay pago involucrado
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
                    const reserveId = await createTemporalReserve();
                    await handlePay(reserveId, amountToPay);
                    return;
                }
                // Si cancela, simplemente retornamos y no creamos reserva
                    return;
                }

            // Flujo normal sin pago
            await createReservation();
        } catch (error) {
            logger.error(error);
            Swal.close(); // Ensure the previous Swal is closed before opening a new one
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

    return (
        <div id={id} className="modal custom-modal">
            <div className="modal-content">
                <div className="modal-header">
                    <FontAwesomeIcon icon={faCalendarCheck} />
                    <h6>{title}</h6>
                </div>
                <div className="modal-body">
                    {selectedTimeSlot ? (
                        <>
                            <div className="reservation-details">
                                {/*{formData.isPaidNight && <p className="red-text paid-turn-warning">Recuerda que este turno es pagado</p>}*/}
                                <p><FontAwesomeIcon icon={faMapMarkerAlt} className="fa-icon" /> <strong>Cancha:</strong> &nbsp;{selectedTimeSlot.courtId.replace('Cancha ', '')}</p>
                                <p><FontAwesomeIcon icon={faCalendarCheck} className="fa-icon" /> <strong>Fecha:</strong> &nbsp;{selectedTimeSlot.date ? DateTime.fromISO(selectedTimeSlot.date).toFormat('dd-MM-yyyy') : ''}</p>
                                <p><FontAwesomeIcon icon={faClock} className="fa-icon" /> <strong>Turno:</strong> &nbsp;{selectedTimeSlot.time}</p>
                                <p><FontAwesomeIcon icon={faUser} className="fa-icon" /> <strong>Player 1:</strong> &nbsp;{selectedTimeSlot.player1}</p>
                            </div>
                            <div className="input-field col s12">
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
                                />
                            </div>

                            {/* Checkboxes */}
                            <div className="checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="isVisit"
                                        checked={formData.isVisit}
                                        onChange={handleChange}
                                    />
                                    <span><FontAwesomeIcon icon={faUser} /> Visita</span>
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        name="isDouble"
                                        checked={formData.isDouble}
                                        onChange={handleChange}
                                    />
                                    <span><FontAwesomeIcon icon={faUsers} /> Dobles</span>
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        name="isForRanking"
                                        checked={formData.isForRanking}
                                        onChange={handleChange}
                                        disabled={formData.isVisit}
                                    />
                                    <span>Valido Ranking</span>
                                </label>
                            </div>

                            {/*{formData.isVisit && (*/}
                            {/*    <div className="input-field">*/}
                            {/*        <input*/}
                            {/*            type="text"*/}
                            {/*            name="visitName"*/}
                            {/*            value={formData.visitName}*/}
                            {/*            onChange={handleChange}*/}
                            {/*            placeholder="Ingrese nombre de la visita"*/}
                            {/*        />*/}
                            {/*    </div>*/}
                            {/*)}*/}

                            {formData.isDouble && (
                                <>
                                    <div className="input-field col s12">
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
                                            placeholder="Selecciona un player 3"
                                            isSearchable
                                            menuPortalTarget={document.body}  // Attach the dropdown to the body to avoid modal overlap
                                            maxMenuHeight={160}               // Set max height (adjust for 5 players, typically around 200px)
                                            menuPlacement="bottom"              // Auto placement to decide whether to drop up or down
                                            styles={customStyles} // Apply custom styles here
                                        />
                                    </div>
                                    <div className="input-field col s12">
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
                                            placeholder="Selecciona un player 4"
                                            isSearchable
                                            menuPortalTarget={document.body}  // Attach the dropdown to the body to avoid modal overlap
                                            maxMenuHeight={160}               // Set max height for 5 players
                                            menuPlacement="bottom"              // Auto placement to adjust dropdown direction
                                            styles={customStyles} // Apply custom styles here
                                        />
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <p>No time slot selected</p>
                    )}
                </div>
            </div>
            <div className="modal-footer">
                <button
                    className="modal-close btn-flat waves-effect waves-green"
                    onClick={onClose}
                >
                    Cancelar
                </button>
                <button
                    className={`btn waves-effect waves-light ${formData.isPaidNight || formData.isVisit ? 'red darken-4' : 'blue darken-4'}`}
                    onClick={handleReserve}
                >
                    {formData.isPaidNight || formData.isVisit ? 'Pagar' : 'Reservar'}
                </button>
            </div>
        </div>
    );
};

export default Modal;
