import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faTrash } from '@fortawesome/free-solid-svg-icons';
import AppLoader from './AppLoader';
import { LoadingSpinner } from './LoadingSpinner';
import '../styles/AdminReserves.css';

interface Reserve {
    idCourtReserve: string;
    court: string;
    player1: string;
    dateToPlay: string;
    turn: string;
    state: boolean;
}

const AdminReserves: React.FC = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [reserves, setReserves] = useState<Reserve[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const deleting = useRef(false);

    const fetchReserves = useCallback(async () => {
        try {
            const response = await axios.get<Reserve[]>(`${apiUrl}/court-reserve`);
            setReserves(response.data);
        } catch (error) {
            console.error('Error fetching reserves:', error);
        } finally {
            setLoading(false);
        }
    }, [apiUrl]);

    const handleDelete = async (reserveId: string) => {
        if (deleting.current) return;
        deleting.current = true;
        try {
            const confirm = await Swal.fire({
                title: '¿Eliminar reserva?',
                text: 'Esta acción no se puede deshacer.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
                focusCancel: true,
                allowOutsideClick: false,
            });

            if (confirm.isConfirmed) {
                setDeletingId(reserveId);
                try {
                    await axios.delete(`${apiUrl}/court-reserve/${reserveId}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                    });
                    setReserves((prev) => prev.filter((r) => r.idCourtReserve !== reserveId));
                    await Swal.fire({
                        icon: 'success',
                        title: 'Eliminada',
                        text: 'La reserva fue eliminada correctamente.',
                        confirmButtonText: 'Aceptar',
                    });
                } catch (error) {
                    console.error('Error deleting reservation:', error);
                    await Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo eliminar la reserva.',
                        confirmButtonText: 'Aceptar',
                    });
                }
            }
        } finally {
            deleting.current = false;
            setDeletingId(null);
        }
    };

    useEffect(() => {
        void fetchReserves();
    }, [fetchReserves]);

    if (loading) return <AppLoader text="Cargando reservas..." />;

    return (
        <main className="ar-container" aria-busy={deletingId !== null}>
            {/* Hero */}
            <div className="ar-hero">
                <div className="ar-hero-text">
                    <h1>Reservas activas</h1>
                    <p>Gestión y eliminación de reservas de cancha</p>
                </div>
                {reserves.length > 0 && (
                    <span className="ar-hero-badge">
                        {reserves.length} reserva{reserves.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Card */}
            <div className="ar-card">
                {reserves.length === 0 ? (
                    <div className="ar-empty">
                        <FontAwesomeIcon icon={faCalendarAlt} className="ar-empty-icon" />
                        No hay reservas activas.
                    </div>
                ) : (
                    <div className="ar-table-wrapper">
                        <table className="ar-table" role="table" aria-label="Reservas activas">
                            <thead role="rowgroup">
                                <tr role="row">
                                    <th scope="col" role="columnheader">
                                        Jugador
                                    </th>
                                    <th scope="col" role="columnheader">
                                        Fecha
                                    </th>
                                    <th scope="col" role="columnheader">
                                        Turno
                                    </th>
                                    <th scope="col" role="columnheader">
                                        Cancha
                                    </th>
                                    <th scope="col" role="columnheader">
                                        <span className="ar-sr-only">Acciones</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody role="rowgroup">
                                {reserves.map((reserve) => (
                                    <tr key={reserve.idCourtReserve} role="row">
                                        <td className="ar-cell-player" role="cell">
                                            <span className="ar-player-name">
                                                {reserve.player1}
                                            </span>
                                        </td>
                                        <td className="ar-cell-date" data-label="Fecha" role="cell">
                                            <time dateTime={reserve.dateToPlay.slice(0, 10)}>
                                                {reserve.dateToPlay.slice(8, 10)}-
                                                {reserve.dateToPlay.slice(5, 7)}-
                                                {reserve.dateToPlay.slice(0, 4)}
                                            </time>
                                        </td>
                                        <td className="ar-cell-turn" data-label="Turno" role="cell">
                                            {reserve.turn}
                                        </td>
                                        <td
                                            className="ar-cell-court"
                                            data-label="Cancha"
                                            role="cell"
                                        >
                                            {reserve.court}
                                        </td>
                                        <td className="ar-cell-action" role="cell">
                                            <button
                                                type="button"
                                                className="ar-btn-delete"
                                                onClick={() => handleDelete(reserve.idCourtReserve)}
                                                title="Eliminar reserva"
                                                aria-label={`Eliminar reserva de ${reserve.player1}, ${reserve.dateToPlay.slice(0, 10)}, ${reserve.turn}`}
                                                disabled={deletingId !== null}
                                            >
                                                {deletingId === reserve.idCourtReserve ? (
                                                    <LoadingSpinner size={18} />
                                                ) : (
                                                    <FontAwesomeIcon icon={faTrash} />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    );
};

export default AdminReserves;
