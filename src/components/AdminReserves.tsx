import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import AppLoader from './AppLoader';
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

    const fetchReserves = async () => {
        try {
            const response = await axios.get<Reserve[]>(`${apiUrl}/court-reserve`);
            setReserves(response.data);
        } catch (error) {
            console.error('Error fetching reserves:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reserveId: string) => {
        const confirm = await Swal.fire({
            title: '¿Eliminar reserva?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });

        if (confirm.isConfirmed) {
            try {
                await axios.delete(`${apiUrl}/court-reserve/${reserveId}`);
                setReserves(prev => prev.filter(r => r.idCourtReserve !== reserveId));
                Swal.fire({ icon: 'success', title: 'Eliminada', text: 'La reserva fue eliminada correctamente.', confirmButtonColor: '#1565c0' });
            } catch (error) {
                console.error('Error deleting reservation:', error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar la reserva.', confirmButtonColor: '#dc2626' });
            }
        }
    };

    useEffect(() => {
        fetchReserves();
    }, []);

    if (loading) return <AppLoader text="Cargando reservas..." />;

    return (
        <div className="ar-container">
            {/* Hero */}
            <div className="ar-hero">
                <div className="ar-hero-text">
                    <h2>Reservas Activas</h2>
                    <p>Gestión y eliminación de reservas de cancha</p>
                </div>
                {reserves.length > 0 && (
                    <span className="ar-hero-badge">{reserves.length} reserva{reserves.length !== 1 ? 's' : ''}</span>
                )}
            </div>

            {/* Card */}
            <div className="ar-card">
                {reserves.length === 0 ? (
                    <div className="ar-empty">
                        <span className="ar-empty-icon">📭</span>
                        No hay reservas activas.
                    </div>
                ) : (
                    <div className="ar-table-wrapper">
                        <table className="ar-table">
                            <thead>
                                <tr>
                                    <th>Jugador</th>
                                    <th>Fecha</th>
                                    <th>Turno</th>
                                    <th>Cancha</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reserves.map(reserve => (
                                    <tr key={reserve.idCourtReserve}>
                                        <td>{reserve.player1}</td>
                                        <td>
                                            {reserve.dateToPlay.slice(8, 10)}-{reserve.dateToPlay.slice(5, 7)}
                                        </td>
                                        <td>{reserve.turn.split('-')[0]}</td>
                                        <td>{reserve.court.split(' ')[1]}</td>
                                        <td>
                                            <button
                                                className="ar-btn-delete"
                                                onClick={() => handleDelete(reserve.idCourtReserve)}
                                                title="Eliminar reserva"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminReserves;
