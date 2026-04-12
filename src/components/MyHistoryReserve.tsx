import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEye } from '@fortawesome/free-solid-svg-icons';
// import {faTrash, faEye, faPencilAlt} from '@fortawesome/free-solid-svg-icons';
import { DateTime } from 'luxon';
import { getUserInfoFromLocalStorage } from '../utils/userUtils';
import { getTokenFromLocalStorage } from '../utils/tokenUtils';
import M from 'materialize-css';
import Swal from 'sweetalert2';
// import logger from "../utils/logger.ts";

import '../styles/MyHistoryReserve.css';

interface Reservation {
    court: string;
    player1: string;
    player2: string;
    player3?: string;
    player4?: string;
    dateToPlay: string;
    turn: string;
    state: boolean;
    visitName?: string;
    idCourtReserve: string;
    passCourtReserve?: string;
    isForRanking: boolean;
}

const MyHistoryReserve: React.FC = () => {
    const [reserves, setReserves] = useState<Reservation[]>([]);
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

    const isOkToDelete = (reserve: Reservation): boolean => {
        if (!reserve.state) {
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

    const handleView = (reserve: Reservation) => {
        const courtNumber = reserve.court.replace(/\D/g, '');
        const isCanceled = !reserve.state;

        const details = `
    <div class="left-align swal-details">
      <p>👤 <strong>Player 1:</strong> ${reserve.player1}</p>
      <p>👤 <strong>Player 2:</strong> ${reserve.player2}</p>
      ${reserve.player3 ? `<p>👤 <strong>Player 3:</strong> ${reserve.player3}</p>` : ''}
      ${reserve.player4 ? `<p>👤 <strong>Player 4:</strong> ${reserve.player4}</p>` : ''}
      <hr>
      <p>📅 <strong>Fecha:</strong> ${DateTime.fromISO(reserve.dateToPlay).toFormat('dd-MM-yy')}</p>
      <p>🏟️ <strong>Cancha:</strong> ${courtNumber}</p>
      <p>⏰ <strong>Turno:</strong> ${reserve.turn.split('-')[0]}</p>
      ${isCanceled ? `<p class="red-text">🚫 <strong>Estado:</strong> Reserva cancelada.</p>` : ''}
      ${reserve.visitName ? `<p>🚶‍♂️ <strong>Visita:</strong> ${reserve.visitName}</p>` : ''}
    </div>
  `;

        Swal.fire({
            icon: 'info',
            title: 'Detalle Reserva',
            html: details,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#1a237e', // Azul rey para el botón
        });
    };

    // const handleEdit = () => {
    //     Swal.fire({
    //         icon: 'info',
    //         title: 'En Desarrollo',
    //         text: 'La funcionalidad para editar la reserva aún no está implementada.',
    //         confirmButtonText: 'Entendido',
    //     });
    // };

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

    const extractNumber = (text: string): number | null => {
        const match = text.match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
    };

    const upcomingReserves = reserves.filter(r => isOkToDelete(r)).length;
    const canceledReserves = reserves.filter(r => !r.state).length;

    if (loading) {
        return (
            <div className="history-loading">
                <div className="preloader-wrapper active">
                    <div className="spinner-layer spinner-blue-only">
                        <div className="circle-clipper left"><div className="circle"></div></div>
                        <div className="gap-patch"><div className="circle"></div></div>
                        <div className="circle-clipper right"><div className="circle"></div></div>
                    </div>
                </div>
                <p className="history-loading-text">Cargando tu historial...</p>
            </div>
        );
    }

    return (
        <div className="history-page">
            <div className="history-card">
                <div className="history-card-content">
                    <div className="history-header">
                        <div>
                            <h5 className="history-title">Mi Historial de Reservas</h5>
                            <p className="history-subtitle">Revisa y gestiona tus partidos pasados y futuros.</p>
                        </div>
                    </div>

                    <div className="history-kpis">
                        <div className="history-kpi">Total Reservas: <strong>{reserves.length}</strong></div>
                        <div className="history-kpi">Próximas: <strong>{upcomingReserves}</strong></div>
                        <div className="history-kpi">Canceladas: <strong>{canceledReserves}</strong></div>
                    </div>

                    {reserves.length > 0 ? (
                        <div className="history-table-wrap">
                            <table className="history-table striped">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Cancha</th>
                                        <th>Turno</th>
                                        <th className="center-align">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reserves.map((reserve) => (
                                        <tr key={reserve.idCourtReserve} className={!reserve.state ? 'history-row-canceled' : ''}>
                                            <td>{DateTime.fromISO(reserve.dateToPlay).toFormat('dd-MM-yy')}</td>
                                            <td className="center-align">{extractNumber(reserve.court)}</td>
                                            <td>{reserve.turn.split('-')[0]}</td>

                                            <td className="center-align">
                                                <button className="btn-floating btn-small waves-effect waves-light blue history-btn"
                                                    onClick={() => handleView(reserve)} title="Ver detalle">
                                                    <FontAwesomeIcon icon={faEye} />
                                                </button>
                                                {isOkToDelete(reserve) ? (
                                                    <button
                                                        className="btn-floating btn-small waves-effect waves-light red darken-4 history-btn"
                                                        onClick={() => handleDelete(reserve.idCourtReserve)}
                                                        title="Eliminar reserva">
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn-floating btn-small waves-effect waves-light history-btn"
                                                        disabled title="No se puede eliminar">
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="history-empty">
                            <h6>No tienes reservas</h6>
                            <p>Cuando realices una reserva, aparecerá aquí.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyHistoryReserve;
