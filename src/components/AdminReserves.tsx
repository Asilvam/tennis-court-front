import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
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

    // Fetch reserves data from the API
    const fetchReserves = async () => {
        try {
            const response = await axios.get<Reserve[]>(`${apiUrl}/court-reserve`); // Replace with actual endpoint
            setReserves(response.data);
        } catch (error) {
            console.error('Error fetching reserves:', error);
        } finally {
            setLoading(false);
        }
    };

    // Handle deletion of a reservation
    const handleDelete = async (reserveId: string) => {
        const confirm = await Swal.fire({
            title: 'Are you sure?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
        });

        if (confirm.isConfirmed) {
            try {
                await axios.delete(`${apiUrl}/court-reserve/${reserveId}`); // Replace with actual endpoint
                setReserves((prev) => prev.filter((reserve) => reserve.idCourtReserve !== reserveId));
                Swal.fire('Deleted!', 'The reservation has been deleted.', 'success');
            } catch (error) {
                console.error('Error deleting reservation:', error);
                Swal.fire('Error', 'Failed to delete the reservation.', 'error');
            }
        }
    };

    useEffect(() => {
        fetchReserves();
    }, []);

    // if (loading) return <p>Loading reservations...</p>;

    return loading ? (
        <AppLoader text="Cargando reservas..." />
    ) : (
        <div className="container admin-table-container">
            <h6>Admin actives Reservations</h6>
            {reserves.length === 0 ? (
                <p>No reservations available.</p>
            ) : (
                <table className="reserves-table-custom">
                    <thead>
                        <tr>
                            <th className="col-player1">Player 1</th>
                            <th>Date</th>
                            <th>Turn</th>
                            <th>Court</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reserves.map((reserve) => (
                            <tr key={reserve.idCourtReserve}>
                                <td className="col-player1">{reserve.player1}</td>
                                <td>{reserve.dateToPlay.slice(8, 10)}-{reserve.dateToPlay.slice(5, 7)}</td>
                                <td>{reserve.turn.split('-')[0]}</td>
                                <td>{reserve.court.split(' ')[1]}</td>
                                <td>
                                    <button className="btn red darken-4" onClick={() => handleDelete(reserve.idCourtReserve)}>
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default AdminReserves;
