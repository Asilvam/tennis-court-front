import React, {ChangeEvent, useEffect, useState} from 'react';
import M from 'materialize-css';
import Swal from 'sweetalert2';
import Select from "react-select";
import axios from "axios";

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
        court: 'Court '+selectedTimeSlot.courtId.toString(),
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
    const apiUrl = import.meta.env.VITE_API_URL;

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
            if (!formData.visitName) {
                isValid = false;
                console.log('Visit name must not be empty.');
            } else {
                try {
                    const visitNameTrimmed = validateText(formData.visitName);
                    setFormData((prevState) => ({
                        ...prevState,
                        visitName: visitNameTrimmed.toString(),
                    }));
                } catch (error) {
                    isValid = false;
                    console.log('Error with visit name validation:', error);
                }
            }
        }
        const { player2, player3, player4 } = formData;
        if (formData.isDouble) {
            if (formData.isVisit) {
                if (!player3 || !player4) {
                    isValid = false;
                    console.log('Player 3 and Player 4 must not be empty.');
                } else if (new Set([player3, player4]).size !== 2) {
                    isValid = false;
                    console.log('Player 3 and Player 4 must be distinct.');
                }
            }
            else {
                if (!player2 || !player3 || !player4) {
                    isValid = false;
                    console.log('Player 2, Player 3, and Player 4 must not be empty.');
                } else if (new Set([player2, player3, player4]).size !== 3) {
                    isValid = false;
                    console.log('Player 2, Player 3, and Player 4 must be distinct.');
                }
            }
        } else if (!player2 && !formData.isVisit) {
            isValid = false;
            console.log('Player 2 must not be empty.');
        }
        return isValid;
    };

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData((prevState) => ({
                ...prevState,
                [name]: checked, // Update with checkbox true/false value
            }));
            if (name  === 'isVisit') {
                // console.log('isVisit:', checked);
                setFormData((prevState) => ({
                    ...prevState,
                    player2: '', // Update with checkbox true/false value
                    isForRanking: false, // Update with checkbox true/false value
                }));
            }
            if (name  === 'isVisit' && !checked) {
                setFormData((prevState) => ({
                    ...prevState,
                    visitName: '', // Update with checkbox true/false value
                    isForRanking: true,
                }));
            }
            if (name === 'isDouble' && !checked) {
                setFormData((prevState) => ({
                    ...prevState,
                    player3: '', // Update with checkbox true/false value
                    player4: '', // Update with checkbox true/false value
                }));
            }
        } else {
            // Handle regular input fields (text, select, etc.)
            // console.log(name, value)
            setFormData((prevState) => ({
                ...prevState,
                [name]: value, // Update with new input value
            }));
        }
    };

    const handleReserve = async () => {
        if (validateForm()) {
            await Swal.fire({
                icon: 'success',
                title: 'Reservation Successful',
                text: 'Your reservation has been made!',
            });
            try {
                const response = await axios.post(`${apiUrl}/court-reserve`, formData);
                console.log('Reservation created successfully:', response.data);
                return response.data; // Return the response data as needed
            } catch (error) {
                console.error('Error creating reservation:', error);
                throw error; // Handle the error as necessary
            }
        }
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
                                value={formData.isVisit ? null : formattedPlayers.find(option => option.value === formData.player2)}
                                onChange={(selectedOption) =>
                                    setFormData((prevState) => ({
                                        ...prevState,
                                        player2: selectedOption ? selectedOption.value : ''  // Store the selected value or reset to empty
                                    }))
                                }
                                options={formattedPlayers}
                                placeholder="Select a player 2"
                                isSearchable
                                isDisabled={formData.isVisit} // Disable if 'isVisit' is true
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
                                        disabled={formData.isVisit} // Disable when isVisit is true
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