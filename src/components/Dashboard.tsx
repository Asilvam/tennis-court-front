import React, {useCallback, useContext, useEffect, useState} from 'react';
import TimeSlot from './TimeSlot';
import {DateTime} from 'luxon';
import '../styles/Dashboard.css';
import axios from "axios";
import Modal from './Modal';
import badge from '/badge.svg';
import Swal from "sweetalert2";
import {UserContext} from "./UserContext.tsx";
import {getTokenFromLocalStorage} from "../utils/tokenUtils.ts";

interface CourtReserve {
    player1: string;              // Primary player (required)
    player2?: string;             // Optional second player
    player3?: string;             // Optional third player for doubles
    player4?: string;             // Optional fourth player for doubles
    isDouble: boolean;            // Indicates if the reservation is for doubles
    isVisit: boolean;             // Indicates if the reservation involves a visitor
    visitName?: string;           // Optional visitor name
}

interface TimeSlotType {
    time: string;
    available: boolean;
    isPayed: boolean;
    data: CourtReserve;
}

interface CourtType {
    id: number;
    name: string;
    timeSlots: TimeSlotType[];
}

const Dashboard: React.FC = () => {
    const userContext = useContext(UserContext);
    const namePlayer = userContext?.userInfo.name;
    const [courts, setCourts] = useState<CourtType[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(DateTime.now().toISODate());
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
        courtId: number;
        time: string;
        date: string;
        player1: string | undefined;
        isPayed: boolean;
    } | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [playersNames, setPlayersNames] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeReserve, setActiveReserve] = useState<CourtReserve | null>(null);
    const minDate = DateTime.now().toISODate();
    const maxDate = DateTime.now().plus({days: 2}).toISODate();

    const apiUrl = import.meta.env.VITE_API_URL;
    const token = getTokenFromLocalStorage();

    const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedDate = event.target.value;
        if (selectedDate < minDate || selectedDate > maxDate) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Date',
                text: `Please select a date between ${minDate} and ${maxDate}.`,
            });
            return; // Stop further execution
        }
        setSelectedDate(selectedDate); // Update the selected date
        setSelectedTimeSlot(null); // Clear selected time slot when switching dates
    };

    const handleOpenModal = (timeSlot: React.SetStateAction<{
        courtId: number;
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

    const handleTimeSlotClick = useCallback((courtId: number, time: string, isPayed: boolean, available: boolean, data: CourtReserve) => {
        if (!available) {
            const {player1, player2, player3, player4, isDouble, isVisit, visitName} = data;
            let playerInfo: string;
            if (isDouble) {
                playerInfo = `${player1} ${player2 ? player2 : ''}<br>vs<br>${player3 ? player3 : 'N/A'} ${player4 ? player4 : 'N/A'}`;
            } else {
                if (isVisit) {
                    playerInfo = `${player1}<br>vs<br>${visitName ? visitName : 'Visitor'}`;
                } else {
                    playerInfo = `${player1}<br>vs<br>${player2 ? player2 : 'N/A'}`;
                }
            }
            Swal.fire({
                icon: 'info',
                title: 'Match Information',
                html: `<strong>${playerInfo}</strong>`,
            });
            return; // Stop further execution
        }
        setSelectedTimeSlot({courtId, time, date: selectedDate, player1: namePlayer, isPayed});
        handleOpenModal({courtId, time, date: selectedDate, player1: namePlayer, isPayed});
    }, [selectedDate, namePlayer]);

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
        try {
            const reserves = await axios.get(`${apiUrl}/court-reserve/active/${namePlayer}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setActiveReserve(reserves.data);
            // console.log('reserves.data-->', reserves.data);
        } catch (error){
            console.log(error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get<CourtType[]>(`${apiUrl}/court-reserve/available/${selectedDate}`);
            if (!response.data) throw new Error('No data received');
            setCourts(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getPlayersNames();
        getActiveReserves()
    }, []);

    useEffect(() => {
        // console.log('modal changed:', isModalOpen);
        fetchData();
    }, [selectedDate]);

    return loading ? (
        <div className="preloader-wrapper active">
            <div className="spinner-layer spinner-blue-only">
                <div className="circle-clipper left">
                    <div className="circle"></div>
                </div>
                <div className="gap-patch">
                    <div className="circle"></div>
                </div>
                <div className="circle-clipper right">
                    <div className="circle"></div>
                </div>
            </div>
        </div>
    ) : (
        <div className="container">
            <div className="app">
                <h4>Welcome, {namePlayer}!</h4>
                {activeReserve && <p className="red-text">Remember you have actives reserves</p>}
                <div className="date-picker">
                    <label>Select a Date: </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        min={minDate}
                        max={maxDate}// Minimum date set to today
                    />
                </div>
                <div className="courts-container">
                    {courts.map((court) => (
                        <div key={court.id} className="court-row">
                            <h5>
                                <img src={badge} alt="Court Icon"
                                     style={{width: '20px', height: '20px', marginRight: '8px'}}/> {court.name}
                            </h5>
                            <div className="time-slots">
                                {court.timeSlots.map((slot) => (
                                    <TimeSlot
                                        key={slot.time}
                                        time={slot.time}
                                        available={slot.available}
                                        isPayed={slot.isPayed}
                                        onClick={() => handleTimeSlotClick(court.id, slot.time, slot.isPayed, slot.available, slot.data)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {isModalOpen && (
                    <div>
                        <Modal
                            id="timeSlotModal"
                            title="Reserve Turn"
                            isOpen={isModalOpen}
                            selectedTimeSlot={selectedTimeSlot}
                            playersNames={playersNames}
                            onClose={handleCloseModal}
                        />
                    </div>
                )}
            </div>
        </div>
    )
        ;
};

export default Dashboard;
