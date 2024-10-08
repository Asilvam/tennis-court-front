import React, {ChangeEvent, useEffect, useState} from 'react';
import M from 'materialize-css';
import Swal from 'sweetalert2';
import Select from "react-select";

interface ModalProps {
    id: string;
    title: string;
    isOpen: boolean;
    selectedTimeSlot: {
        courtId: number;
        date: string;
        time: string;
        player1: string;
        isPayed: boolean;
    };
    playersNames: string[];
    onClose: () => void;
}

interface ReserveFormData {
    court: string;
    player1: string;
    player2: string;
    player3: string;
    player4: string;
    dateToPlay: string;
    turn: string;
    isPaidNight: boolean;
    isVisit: boolean;
    visitName: string;
    isDouble: boolean;
    isForRanking: boolean;
}

const Modal: React.FC<ModalProps> = ({id, title, isOpen, selectedTimeSlot, playersNames, onClose}) => {
    const initialFormData: ReserveFormData = {
        court: selectedTimeSlot.courtId.toString(),
        player1: selectedTimeSlot.player1,
        player2: '',
        player3: '',
        player4: '',
        dateToPlay: selectedTimeSlot.date,
        turn: selectedTimeSlot.time,
        isPaidNight: selectedTimeSlot.isPayed,
        isVisit: false,
        visitName: '',
        isForRanking: true,
        isDouble: false,
    };

    const [formData, setFormData] = useState<ReserveFormData>(initialFormData);

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
        if (formData.isVisit) {
            if (formData.visitName === '') {
                isValid = false;
                console.log('Visit name, must not be empty.');
            } else {
                const visitNameTrimmed = validateText(formData.visitName);
                if (visitNameTrimmed instanceof Error) {
                    isValid = false;
                } else if (visitNameTrimmed) {
                    setFormData((prevState) => ({
                        ...prevState,
                        visitName: visitNameTrimmed.toString(),
                    }));
                }
            }
        }
        const {player2, player3, player4} = formData;
        if (formData.isDouble && formData.isVisit) {
            if (!player3 || !player4) {
                isValid = false;
                console.log('Player 3, and Player 4 must not be empty.');
            } else {
                const playersSet = new Set([player3, player4]);
                if (playersSet.size !== 2) {
                    isValid = false;
                    console.log('Player 3, and Player 4 must be distinct.');
                }
            }
        } else if (formData.isDouble) {
            if (!player2 || !player3 || !player4) {
                isValid = false;
                console.log('Player 2, Player 3, and Player 4 must not be empty.');
            } else {
                const playersSet = new Set([player2, player3, player4]);
                if (playersSet.size !== 3) {
                    isValid = false;
                    console.log('Player2, Player 3, and Player 4 must be distinct.');
                }
            }
        } else if (!player2 && !formData.isVisit) {
            isValid = false;
            console.log('Player 2,must not be empty.');
        }
        return isValid;
    };


    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | any,
        field?: string
    ) => {
        // Check if it's a select change from react-select (i.e., when an object is passed instead of an event)
        if (field) {
            setFormData((prevState) => ({
                ...prevState,
                [field]: e.value, // React-select provides the selected option as an object
            }));
        } else {
            const {name, value, type} = e.target;
            if (type === 'checkbox') {
                const {checked} = e.target as HTMLInputElement;
                setFormData((prevState) => ({
                    ...prevState,
                    [name]: checked,
                    // If 'isVisit' is checked, reset player2 to an empty string
                    ...(name === 'isVisit' && checked ? {player2: ''} : {}),
                    // If 'isVisit' is unchecked, reset visitName to an empty string
                    ...(name === 'isVisit' && !checked ? {visitName: ''} : {}),
                }));
            } else {
                setFormData((prevState) => ({
                    ...prevState,
                    [name]: value,
                }));
            }
        }
    };

    const handleReserve = () => {
        if (validateForm()) {
            Swal.fire({
                icon: 'success',
                title: 'Reservation Successful',
                text: 'Your reservation has been made!',
            });
        }
        // Add your reservation logic here...
        onClose(); // Close the modal after successful reservation
    };

    return (
        <div id={id} className="modal">
            <div className="modal-content">
                <h5>{title}</h5>
                {selectedTimeSlot ? (
                    <div className="container">
                        {formData.isPaidNight && <p className="red-text">Remember this turn is paid</p>}
                        <div>
                            <p>
                                <strong>Court:</strong> {selectedTimeSlot.courtId} <br/>
                                <strong>Date:</strong> {selectedTimeSlot.date} <br/>
                                <strong>Turn:</strong> {selectedTimeSlot.time} <br/>
                                <strong>Player 1:</strong> {selectedTimeSlot.player1}
                            </p>
                        </div>
                        <div className="input-field col s12">
                            <Select
                                value={formattedPlayers.find(option => option.value === formData.player2)}
                                onChange={(selectedOption) =>
                                    setFormData((prevState) => ({
                                        ...prevState,
                                        player2: selectedOption ? selectedOption.value : ''  // Store the selected value
                                    }))
                                }
                                options={formattedPlayers}
                                placeholder="Select a player 2"
                                isSearchable
                                isDisabled={formData.isVisit}
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
                                    <span>Visit</span>
                                </label>
                            </p>
                            {formData.isVisit && (
                                <div className="input-field">
                                    <input
                                        type="text"
                                        name="visitName"
                                        value={formData.visitName}
                                        onChange={handleChange}
                                        placeholder="Enter visit name"
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
                                    <span>Play Double</span>
                                </label>
                            </p>
                            {/* Mostrar campos para Player 3 y Player 4 si se selecciona "Play Double" */}
                            {formData.isDouble && (
                                <>
                                    <div className="input-field col s12">
                                        <Select
                                            value={formattedPlayers.find(option => option.value === formData.player3)}
                                            onChange={(selectedOption) =>
                                                setFormData((prevState) => ({
                                                    ...prevState,
                                                    player3: selectedOption ? selectedOption.value : ''  // Store the selected value
                                                }))
                                            }
                                            options={formattedPlayers}
                                            placeholder="Select a player 3"
                                            isSearchable
                                        />
                                    </div>
                                    <div className="input-field col s12">
                                        <Select
                                            value={formattedPlayers.find(option => option.value === formData.player4)}
                                            onChange={(selectedOption) =>
                                                setFormData((prevState) => ({
                                                    ...prevState,
                                                    player4: selectedOption ? selectedOption.value : ''  // Store the selected value
                                                }))
                                            }
                                            options={formattedPlayers}
                                            placeholder="Select a player 4"
                                            isSearchable
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
                                    />
                                    <span>Is for Ranking</span>
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
                    className="modal-close btn waves-effect waves-light"
                    onClick={handleReserve}
                >
                    Reserve
                </button>
                <button
                    className="modal-close btn waves-effect waves-light"
                    style={{marginLeft: '20px'}} // Add margin here
                    onClick={onClose}
                >
                    Cancel
                </button>
            </div>

        </div>
    );
};

export default Modal;
