import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEye } from '@fortawesome/free-solid-svg-icons';
import { DateTime } from 'luxon';
import { getUserInfoFromLocalStorage } from '../utils/userUtils';
import { getTokenFromLocalStorage } from '../utils/tokenUtils';
import Swal from 'sweetalert2';
import AppLoader from './AppLoader';
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
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const deletingRef = useRef(false);
    const namePlayer = getUserInfoFromLocalStorage()?.name || '';
    const token = getTokenFromLocalStorage();
    const apiUrl = import.meta.env.VITE_API_URL;
    const timezone = 'America/Santiago';
    const currentTime = DateTime.now().setZone(timezone);
    const today = currentTime.startOf('day');

    const isOkToDelete = (reserve: Reservation): boolean => {
        if (!reserve.state) return false;
        const [start] = reserve.turn.split('-');
        const startTime = DateTime.fromFormat(start, 'HH:mm', { zone: timezone });
        const reservationDate = DateTime.fromISO(reserve.dateToPlay, { zone: timezone });
        return (
            (reservationDate.hasSame(today, 'day') && currentTime < startTime) ||
            reservationDate > today
        );
    };

    const fetchReserves = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${apiUrl}/court-reserve/history/${namePlayer}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setReserves(response.data);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) return;
            await Swal.fire({
                icon: 'error',
                title: 'No se pudo cargar el historial',
                text: 'Inténtalo nuevamente más tarde.',
                confirmButtonText: 'Aceptar',
            });
        } finally {
            setLoading(false);
        }
    }, [apiUrl, namePlayer, token]);

    useEffect(() => {
        void fetchReserves();
    }, [fetchReserves]);

    const handleView = (reserve: Reservation) => {
        void Swal.fire({
            icon: 'info',
            title: 'Detalle de la reserva',
            text: [
                `Player 1: ${reserve.player1}`,
                `Player 2: ${reserve.player2}`,
                ...(reserve.player3 ? [`Player 3: ${reserve.player3}`] : []),
                ...(reserve.player4 ? [`Player 4: ${reserve.player4}`] : []),
                `Fecha: ${DateTime.fromISO(reserve.dateToPlay).toFormat('dd/MM/yyyy')}`,
                `Cancha: ${reserve.court.replace(/\D/g, '')}`,
                `Turno: ${reserve.turn}`,
                `Estado: ${reserve.state ? 'Confirmada' : 'Cancelada'}`,
                ...(reserve.visitName ? [`Visita: ${reserve.visitName}`] : []),
            ].join('\n'),
            customClass: { popup: 'history-detail-popup' },
            confirmButtonText: 'Cerrar',
        });
    };

    const handleDelete = async (id: string) => {
        if (deletingRef.current) return;
        deletingRef.current = true;
        setDeleting(true);
        try {
            const result = await Swal.fire({
                title: '¿Eliminar reserva?',
                text: 'Esta acción cancelará tu reserva.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Eliminar',
                cancelButtonText: 'Volver',
                focusCancel: true,
                allowOutsideClick: false,
            });
            if (!result.isConfirmed) return;
            const response = await axios.delete(`${apiUrl}/court-reserve/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.status === 200) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Reserva eliminada',
                    text: 'Tu reserva ha sido eliminada.',
                    confirmButtonText: 'Aceptar',
                });
                await fetchReserves();
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) return;
            await Swal.fire({
                icon: 'error',
                title: 'No se pudo eliminar la reserva',
                text: 'Revisa tu historial antes de volver a intentarlo.',
                confirmButtonText: 'Aceptar',
            });
        } finally {
            deletingRef.current = false;
            setDeleting(false);
        }
    };

    if (loading) return <AppLoader text="Cargando tu historial..." />;

    return (
        <main className="history-page">
            <header className="history-header">
                <div>
                    <h1 className="history-title">Mi historial de reservas</h1>
                    <p className="history-subtitle">{namePlayer}</p>
                </div>
                <dl className="history-kpis">
                    <div>
                        <dt>Reservas</dt>
                        <dd>{reserves.length}</dd>
                    </div>
                    <div>
                        <dt>Canceladas</dt>
                        <dd>{reserves.filter((reserve) => !reserve.state).length}</dd>
                    </div>
                </dl>
            </header>
            {reserves.length > 0 ? (
                <div className="history-table-wrap">
                    <table
                        className="history-table"
                        role="table"
                        aria-label="Historial de reservas"
                    >
                        <thead role="rowgroup">
                            <tr role="row">
                                <th scope="col">Fecha</th>
                                <th scope="col">Cancha</th>
                                <th scope="col">Turno</th>
                                <th scope="col">Estado</th>
                                <th scope="col" className="history-action-heading">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody role="rowgroup">
                            {reserves.map((reserve) => {
                                const date = DateTime.fromISO(reserve.dateToPlay).toFormat(
                                    'dd/MM/yyyy',
                                );
                                return (
                                    <tr
                                        role="row"
                                        key={reserve.idCourtReserve}
                                        className={!reserve.state ? 'history-row-canceled' : ''}
                                    >
                                        <td role="cell" className="history-date">
                                            <time dateTime={reserve.dateToPlay}>{date}</time>
                                        </td>
                                        <td role="cell" className="history-court">
                                            Cancha {reserve.court.replace(/\D/g, '')}
                                        </td>
                                        <td role="cell" className="history-turn">
                                            {reserve.turn}
                                        </td>
                                        <td role="cell" className="history-state">
                                            <span
                                                className={`history-status-chip ${reserve.state ? 'ok' : 'cancel'}`}
                                            >
                                                {reserve.state ? 'Confirmada' : 'Cancelada'}
                                            </span>
                                        </td>
                                        <td role="cell" className="history-row-actions">
                                            <button
                                                type="button"
                                                className="history-btn history-view-btn"
                                                onClick={() => handleView(reserve)}
                                                title="Ver detalle"
                                                aria-label={`Ver reserva del ${date}, ${reserve.court}`}
                                            >
                                                <FontAwesomeIcon icon={faEye} />
                                            </button>
                                            <button
                                                type="button"
                                                className="history-btn history-delete-btn"
                                                disabled={deleting || !isOkToDelete(reserve)}
                                                onClick={() =>
                                                    void handleDelete(reserve.idCourtReserve)
                                                }
                                                title={
                                                    isOkToDelete(reserve)
                                                        ? 'Eliminar reserva'
                                                        : 'No se puede eliminar'
                                                }
                                                aria-label={`Eliminar reserva del ${date}, ${reserve.court}`}
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="history-empty">
                    <h2>No tienes reservas</h2>
                    <p>Cuando realices una reserva, aparecerá aquí.</p>
                </div>
            )}
        </main>
    );
};

export default MyHistoryReserve;
