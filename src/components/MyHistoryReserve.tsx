import React, {useEffect, useState} from 'react';
import axios from 'axios';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faTrash, faEye} from '@fortawesome/free-solid-svg-icons';
import {DateTime} from 'luxon';
import {getUserInfoFromLocalStorage} from '../utils/userUtils';
import {getTokenFromLocalStorage} from '../utils/tokenUtils';
import M from 'materialize-css';
import Swal from 'sweetalert2';

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
    const userInfo = getUserInfoFromLocalStorage();
    const token = getTokenFromLocalStorage();
    const [loading, setLoading] = useState(false);
    const namePlayer = userInfo?.name || '';
    const apiUrl = import.meta.env.VITE_API_URL;
    const timezone = 'America/Santiago'; // Chile timezone
    const currentTime = DateTime.now().setZone(timezone); // Current time in the specified timezone
    const today = currentTime.startOf('day');

    useEffect(() => {
        fetchReserves();
        const elems = document.querySelectorAll('.modal');
        M.Modal.init(elems);
    }, []);

    const isOkToDelete = (reserve: Reservation) : boolean => {
        if (!reserve.state){
            return false;
        }
        const [start] = reserve.turn.split('-');
        const startTime = DateTime.fromFormat(start, 'HH:mm', { zone: timezone });
        const reservationDate = DateTime.fromISO(reserve.dateToPlay, { zone: timezone });
        const isToday = reservationDate.hasSame(today, 'day');
        const isBeforeTimeRange = currentTime < startTime;
        const isFutureDate = reservationDate > today;
        return (isToday && isBeforeTimeRange) || isFutureDate;
    }

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
            const result = await Swal.fire({
                title: 'Estas seguro?',
                text: 'Deseas eliminar tu reserva?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'SI',
                cancelButtonText: 'NO',
            });
            if (result.isConfirmed) {
                const response = await axios.delete(`${apiUrl}/court-reserve/${id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (response.status === 200) {
                    // Show a success message if deletion is successful
                    Swal.fire({
                        icon: 'success',
                        title: 'Eliminada!',
                        text: 'Tu reserva ha sido eliminada',
                        confirmButtonText: 'OK',
                    });
                }
            }
        } catch (error) {
            console.error('Error annulling reservation:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'There was an error annulling the reservation. Please try again.',
                confirmButtonText: 'OK',
            });
        } finally {
            fetchReserves();
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

    const extractNumber = (text: string): number | null => {
        const match = text.match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
    };

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
    ) :  (
        <div className="container">
            <h6><strong>Historial de reservas </strong></h6>
            <table className="striped">
                <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Cancha</th>
                    <th>Turno</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {reserves.map((reserve) => (
                    <tr key={reserve.idCourtReserve}>
                        <td>
                            {`${reserve.dateToPlay.slice(8, 10)}-${reserve.dateToPlay.slice(5, 7)}-${reserve.dateToPlay.slice(2, 4)}`}
                        </td>
                        <td className="center-align">{extractNumber(reserve.court)}</td>
                        <td>{reserve.turn.split('-')[0]}</td>
                        <td>
                            <button className="btn blue darken-1" onClick={() => openModal(reserve)}>
                                <FontAwesomeIcon icon={faEye}/>
                            </button>
                            {isOkToDelete(reserve)  && (
                                <button className="btn red darken-4" onClick={() => handleDelete(reserve.idCourtReserve)}>
                                    <FontAwesomeIcon icon={faTrash}/>
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
                    <h6><strong>Detalle Reserva</strong></h6>
                    {selectedReserve && (
                        <>
                            <p><strong>Player 1:</strong> {namePlayer}</p>
                            <p><strong>Player 2:</strong> {selectedReserve.player2}</p>
                            {selectedReserve.player3 && <p><strong>Player 3:</strong> {selectedReserve.player3}</p>}
                            {selectedReserve.player4 && <p><strong>Player 4:</strong> {selectedReserve.player4}</p>}
                            <p><strong>Fecha:</strong> {`${selectedReserve.dateToPlay.slice(8, 10)}-${selectedReserve.dateToPlay.slice(5, 7)}-${selectedReserve.dateToPlay.slice(2, 4)}`}</p>
                            <p><strong>Cancha:</strong> {selectedReserve.court.replace(/\D/g, '')}</p>
                            <p><strong>Turno:</strong> {selectedReserve.turn.split('-')[0]}</p>
                            {selectedReserve.visitName &&
                                <p><strong>Visitor Name:</strong> {selectedReserve.visitName}</p>}
                            {!selectedReserve.state &&
                                <p><strong>Estado reserva:</strong> Esta reserva fue cancelada.</p>}
                        </>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="modal-close btn blue darken-1" onClick={closeModal}>Cerrar</button>
                </div>
            </div>
        </div>
    );
};

export default MyHistoryReserve;
