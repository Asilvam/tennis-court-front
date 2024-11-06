import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

interface Reserve {
    idCourtReserve: string;
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
            <h6>Admin actives Reservations</h6>
            {reserves.length === 0 ? (
                <p>No reservations available.</p>
            ) : (
                <table>
                    <thead>
                    <tr>
                        <th>Player 1</th>
                        <th>Date</th>
                        <th>Turn</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {reserves.map((reserve) => (
                        <tr key={reserve.idCourtReserve}>
                            <td>{reserve.player1}</td>
                            <td>{reserve.dateToPlay}</td>
                            <td>{reserve.turn}</td>
                            <td>
                                <button
                                    onClick={() => handleDelete(reserve.idCourtReserve)}
                                    className="btn btn-danger blue darken-1"
                                >
                                    Delete
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
