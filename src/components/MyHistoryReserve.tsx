import React, {useEffect, useState} from 'react';
import axios from 'axios';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faTrash, faEye} from '@fortawesome/free-solid-svg-icons';
import {DateTime} from 'luxon';
import {getUserInfoFromLocalStorage} from '../utils/userUtils';
import {getTokenFromLocalStorage} from '../utils/tokenUtils';
import M from 'materialize-css';

interface Reservation {
    court: string;
    player2: string;
    player3?: string;
    player4?: string;
    dateToPlay: string;
    turn: string;
    state: boolean;
    visitName?: string;
    idCourtReserve: string;
}

const MyHistoryReserve: React.FC = () => {
    const [reserves, setReserves] = useState<Reservation[]>([]);
    const [selectedReserve, setSelectedReserve] = useState<Reservation | null>(null);
    const today = DateTime.now().startOf('day');
    const userInfo = getUserInfoFromLocalStorage();
    const token = getTokenFromLocalStorage();
    const [loading, setLoading] = useState(false);
    const namePlayer = userInfo?.name || '';
    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchReserves();
        const elems = document.querySelectorAll('.modal');
        M.Modal.init(elems);
    }, []);

    const fetchReserves = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${apiUrl}/court-reserve/history/${namePlayer}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setReserves(response.data);
        } catch (error) {
            console.error('Error fetching reservation data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await axios.delete(`${apiUrl}/court-reserve/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setReserves((prevReserves) => prevReserves.filter((reserve) => reserve.idCourtReserve !== id));
        } catch (error) {
            console.error('Error deleting reservation:', error);
        }
    };

    const openModal = (reserve: Reservation) => {
        setSelectedReserve(reserve);
        const modal = document.getElementById('reserveModal');
        if (modal) {
            const instance = M.Modal.getInstance(modal);
            if (instance) {
                instance.open();
            } else {
                // If the instance is not initialized, initialize it here
                const newInstance = M.Modal.init(modal);
                newInstance.open();
            }
        }
    };


    const closeModal = () => {
        setSelectedReserve(null);
    };

    return loading ? (
        <div className="preloader-wrapper active">
            <div className="spinner-layer spinner-green-only">
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
    ) :  (
        <div className="container mt-5">
            <h6>My History Reservations</h6>
            <table className="striped">
                <thead>
                <tr>
                    <th>Date</th>
                    <th>Court</th>
                    <th>Turn</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {reserves.map((reserve) => (
                    <tr key={reserve.idCourtReserve}>
                        <td>{reserve.dateToPlay}</td>
                        <td>{reserve.court}</td>
                        <td>{reserve.turn}</td>
                        <td>
                            <button className="btn green" onClick={() => openModal(reserve)}>
                                <FontAwesomeIcon icon={faEye}/> View
                            </button>
                            {DateTime.fromISO(reserve.dateToPlay) >= today && (
                                <button className="btn red" onClick={() => handleDelete(reserve.idCourtReserve)}>
                                    <FontAwesomeIcon icon={faTrash}/> Delete
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>

            {/* Materialize modal for viewing details */}
            <div id="reserveModal" className="modal">
                <div className="modal-content">
                    <h6>Reservation Details</h6>
                    {selectedReserve && (
                        <>
                            <p><strong>Player 1:</strong> {namePlayer}</p>
                            <p><strong>Player 2:</strong> {selectedReserve.player2}</p>
                            {selectedReserve.player3 && <p><strong>Player 3:</strong> {selectedReserve.player3}</p>}
                            {selectedReserve.player4 && <p><strong>Player 4:</strong> {selectedReserve.player4}</p>}
                            <p><strong>Date:</strong> {selectedReserve.dateToPlay}</p>
                            <p><strong>Court:</strong> {selectedReserve.court}</p>
                            <p><strong>Turn:</strong> {selectedReserve.turn}</p>
                            {selectedReserve.visitName &&
                                <p><strong>Visitor Name:</strong> {selectedReserve.visitName}</p>}
                        </>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="modal-close btn blue" onClick={closeModal}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default MyHistoryReserve;
