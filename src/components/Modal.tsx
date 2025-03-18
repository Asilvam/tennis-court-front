import React, {ChangeEvent, useEffect, useState} from 'react';
import M from 'materialize-css';
import Swal from 'sweetalert2';
import Select from "react-select";
import axios from "axios";
import {useNavigate} from "react-router-dom";
import {DateTime} from "luxon";
import {customStyles} from "../utils/customStyles.ts";
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
        isVisit: false,
        visitName: '',
        isForRanking: true,
        isDouble: false,
    };

    const [formData, setFormData] = useState<ReserveFormData>(initialFormData);
    const apiUrl = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
    const timezone = 'America/Santiago'; // Chile timezone
    const currentTime = DateTime.now().setZone(timezone);
    const today = currentTime.startOf('day');

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

    const validateText = (input: string): string | Error => {
        const hasInvalidChars = /[^a-zA-Z\s]/.test(input);
        if (hasInvalidChars) {
            throw new Error('The text contains numbers or special characters.');
        }
        let trimmedText = input.trim();
        trimmedText = trimmedText.replace(/\s+/g, ' ');
        return trimmedText;
    }

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
        if (formData.isVisit) {
            if (!formData.visitName) {
                isValid = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'nombre de la visita no puede ser en blanco!',
                });
            } else {
                try {
                    const visitNameTrimmed = validateText(formData.visitName);
                    setFormData((prevState) => ({
                        ...prevState,
                        visitName: visitNameTrimmed.toString(),
                    }));
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (error:any) {
                    isValid = false;
                    Swal.fire({
                        icon: 'error',
                        title: 'Validation Error',
                        text: 'Error with visit name validation: ' + error.message,
                    });
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
                        text: 'Player 2, Player 3, y Player 4 no debe en blanco.',
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
                        isForRanking: checked ? false : true,
                        visitName: checked ? updatedState.visitName : '', // Reset visitName when unchecked
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

    const handleReserve = async () => {
        if (!validateForm()) {
            return;
        }
        try {
            Swal.fire({
                title: 'Processing Reservation',
                text: 'Procesando Reserva...',
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading(); // Display the default spinner from SweetAlert2
                },
            });
            // console.log(formData);
            logger.info(formData);
            const response = await axios.post(`${apiUrl}/court-reserve`, formData);
            if (response.status === 200 || response.status === 201) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Reserva Lista',
                    text: 'Tu reserva esta lista!',
                });
                navigate('/summary', { state: { formData } });
            } else {
                throw new Error('Unexpected response status');
            }
        } catch (error) {
            // console.log(error);
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
        } finally {
            onClose(); // Trigger any modal close functionality
        }
    };

    return (
        <div id={id} className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-content">
                <h6><strong> {title} </strong></h6>
                {selectedTimeSlot ? (
                    <div >
                        {formData.isPaidNight && <p className="red-text">Recuerda que este turno es pagado</p>}
                        <div>
                            <p>
                                <strong> {selectedTimeSlot.courtId} </strong> <br/>
                                <strong>Fecha:</strong> {selectedTimeSlot.date} <br/>
                                <strong>Turno:</strong> {selectedTimeSlot.time} <br/>
                                <strong>Player 1:</strong> {selectedTimeSlot.player1}
                            </p>
                        </div>
                        <div className="input-field col s12">
                            <Select
                                value={formData.isVisit ? null : formattedPlayers.find(option => option.value === formData.player2)}
                                onChange={(selectedOption) => {
                                    if (selectedOption && 'value' in selectedOption) {
                                        setFormData((prevState) => ({
                                            ...prevState,
                                            player2: selectedOption.value  // Store the selected value if it exists
                                        }));
                                    } else {
                                        setFormData((prevState) => ({
                                            ...prevState,
                                            player2: ''  // Reset to empty if no option is selected
                                        }));
                                    }
                                }}
                                options={formattedPlayers}
                                placeholder="Selecciona un player 2"
                                isSearchable
                                isDisabled={formData.isVisit} // Disable if 'isVisit' is true
                                menuPortalTarget={document.body}  // Attach the dropdown to the body to avoid modal overlap
                                maxMenuHeight={160}               // Set max height (adjust for 5 players, typically around 200px)
                                menuPlacement="bottom"              // Auto placement to decide whether to drop up or down
                                styles={customStyles} // Apply custom styles here
                            />
                        </div>
                        <div className="input-field-checked col s12">
                            <p>
                                <label>
                                    <input
                                        type="checkbox"
                                        name="isVisit"
                                        checked={formData.isVisit}
                                        onChange={handleChange}
                                    />
                                    <span>Visita</span>
                                </label>
                            </p>
                            {formData.isVisit && (
                                <div className="input-field">
                                    <input
                                        type="text"
                                        name="visitName"
                                        value={formData.visitName}
                                        onChange={handleChange}
                                        placeholder="Ingrese nombre de la visita"
                                    />
                                </div>
                            )}
                            <p>
                                <label>
                                    <input
                                        type="checkbox"
                                        name="isDouble"
                                        checked={formData.isDouble}
                                        onChange={handleChange}
                                    />
                                    <span>Dobles</span>
                                </label>
                            </p>
                            {/* Mostrar campos para Player 3 y Player 4 si se selecciona "Play Double" */}
                            {formData.isDouble && (
                                <>
                                    <div className="input-field col s12">
                                        <Select
                                            value={formattedPlayers.find(option => option.value === formData.player3)}
                                            onChange={(selectedOption) => {
                                                if (selectedOption && 'value' in selectedOption) {
                                                    setFormData((prevState) => ({
                                                        ...prevState,
                                                        player3: selectedOption.value  // Store the selected value if it exists
                                                    }));
                                                } else {
                                                    setFormData((prevState) => ({
                                                        ...prevState,
                                                        player3: ''  // Reset to empty if no option is selected
                                                    }));
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
                                                    setFormData((prevState) => ({
                                                        ...prevState,
                                                        player4: selectedOption.value  // Store the selected value if it exists
                                                    }));
                                                } else {
                                                    setFormData((prevState) => ({
                                                        ...prevState,
                                                        player4: ''  // Reset to empty if no option is selected
                                                    }));
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
                            <p>
                                <label>
                                    <input
                                        type="checkbox"
                                        name="isForRanking"
                                        checked={formData.isForRanking}
                                        onChange={handleChange}
                                        disabled={formData.isVisit} // Disable when isVisit is true
                                    />
                                    <span>Es por Ranking</span>
                                </label>
                            </p>
                        </div>
                    </div>
                ) : (
                    <p>No time slot selected</p>
                )}
            </div>
            <div className="modal-footer">
                <button
                    className="modal-close btn waves-effect waves-light blue darken-4"
                    onClick={handleReserve}
                >
                    Reservar
                </button>
                <button
                    className="modal-close btn waves-effect waves-light blue darken-1"
                    onClick={onClose}
                    style={{marginLeft: '20px'}}
                >
                    Cancelar
                </button>
            </div>

        </div>
    );
};

export default Modal;