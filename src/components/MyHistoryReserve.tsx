import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEye } from '@fortawesome/free-solid-svg-icons';
import { DateTime } from 'luxon';
import { getUserInfoFromLocalStorage } from '../utils/userUtils';
import { getTokenFromLocalStorage } from '../utils/tokenUtils';
import Swal from 'sweetalert2';
import AppLoader from './AppLoader';
import { LoadingSpinner } from './LoadingSpinner';
import { useSearchParams } from 'react-router-dom';
import { AdminDirectoryPagination } from './AdminDirectoryControls';
import { historyPagination } from '../utils/reservationHistory';
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
    const [history, setHistory] = useState({ items: [] as Reservation[], total: 0, cancelled: 0, page: 1, pageSize: 25, pages: 1 });
    const reserves = history.items;
    const [loading, setLoading] = useState(true);
    const [fetching, setFetching] = useState(true);
    const requestSequence = useRef(0);
    const invalidateRequests = useCallback(() => { requestSequence.current++; }, []);
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, pageSize } = historyPagination(searchParams);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const deleting = deletingId !== null;
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

    const setPagination = useCallback((key: string, value: string) => {
        setSearchParams(previous => {
            const next = new URLSearchParams(previous);
            if ((key === 'page' && value === '1') || (key === 'pageSize' && value === '25')) next.delete(key);
            else next.set(key, value);
            if (key === 'pageSize') next.delete('page');
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    const fetchReserves = useCallback(async (signal?: AbortSignal) => {
        const sequence = ++requestSequence.current;
        setFetching(true);
        try {
            const response = await axios.get<typeof history>(`${apiUrl}/court-reserve/my-history`, {
                params: { page, pageSize }, headers: { Authorization: `Bearer ${token}` }, signal, timeout: 15000,
            });
            if (signal?.aborted || sequence !== requestSequence.current) return;
            setHistory(response.data);
            if (response.data.page !== page) setPagination('page', String(response.data.page));
        } catch (error) {
            if (signal?.aborted || sequence !== requestSequence.current || axios.isCancel(error)) return;
            if (axios.isAxiosError(error) && error.response?.status === 401) return;
            await Swal.fire({
                icon: 'error',
                title: 'No se pudo cargar el historial',
                text: 'Inténtalo nuevamente más tarde.',
                confirmButtonText: 'Aceptar',
            });
        } finally {
            if (!signal?.aborted && sequence === requestSequence.current) {
                setLoading(false);
                setFetching(false);
            }
        }
    }, [apiUrl, token, page, pageSize, setPagination]);

    useEffect(() => {
        const controller = new AbortController();
        void fetchReserves(controller.signal);
        return () => { controller.abort(); invalidateRequests(); };
    }, [fetchReserves, invalidateRequests]);

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
        setDeletingId(id);
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
            setDeletingId(null);
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
                        <dd>{history.total}</dd>
                    </div>
                    <div>
                        <dt>Canceladas</dt>
                        <dd>{history.cancelled}</dd>
                    </div>
                </dl>
            </header>
            <div className="history-loading" role="status" aria-live="polite">
                {fetching && <><LoadingSpinner size={16} /><span>Actualizando historial...</span></>}
            </div>
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
                                                aria-busy={deletingId === reserve.idCourtReserve}
                                                disabled={deleting || fetching || !isOkToDelete(reserve)}
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
                                                {deletingId === reserve.idCourtReserve ? <LoadingSpinner size={24} label="Eliminando reserva" /> : <FontAwesomeIcon icon={faTrash} />}
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
            <AdminDirectoryPagination list={{ ...history, fetching: fetching || deleting, setParam: setPagination }} />
        </main>
    );
};

export default MyHistoryReserve;
