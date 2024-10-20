import React, {useEffect, useState} from 'react';
import Swal from 'sweetalert2';
import M from 'materialize-css';
import axios from "axios";

interface Register {
    namePlayer: string;
    category: string;
    email: string;
    cellular: string;
    pwd: string;
    statePlayer: boolean;
    emailVerified: boolean;
    updatePayment: boolean;
    verificationToken: string;
    points: string;
    role: 'admin' | 'user';
}

const AdminRegister: React.FC = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [users, setUsers] = useState<Register[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>(''); // Add search term state
    const [editUser, setEditUser] = useState<Register | null>(null); // State for editing user

    useEffect(() => {
        const fetchRegisters = async () => {
            try {
                const response = await fetch(`${apiUrl}/register`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                setUsers(data); // Assuming data is an array of users
            } catch (error) {
                console.error('Error fetching registers:', error);
                Swal.fire('Error', 'Failed to fetch registers', 'error');
            }
        };
        fetchRegisters();

        // Initialize Materialize Modal
        const modalElems = document.querySelectorAll('.modal');
        M.Modal.init(modalElems);
    }, []);

    const handleEdit = (user: Register) => {
        setEditUser({...user}); // Clone user info for editing
        const modal = M.Modal.getInstance(document.getElementById('editModal')!);
        modal.open(); // Open the modal
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (editUser) {
            setEditUser({...editUser, [e.target.name]: e.target.value});
        }
    };

    const handleSave = async () => {
        if (editUser) {
            try {
                console.log(editUser);
                const response = await axios.patch(
                    `${apiUrl}/register/${editUser.email}`, // Using email to identify the user
                    editUser, // The updated user data
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (response.status !== 200) {
                    throw new Error('Failed to update user.');
                }

                Swal.fire('Success', `${editUser.namePlayer}'s information has been updated.`, 'success');

                // Close the modal after a successful update
                const modal = M.Modal.getInstance(document.getElementById('editModal')!);
                modal.close();
            } catch (error) {
                console.error('Error updating user:', error);
                Swal.fire('Error', 'Failed to update user.', 'error');
            }
        }
    };
    // Filter users based on search term
    const filteredUsers = users.filter(user =>
        user.namePlayer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container">
            <h4 className="left-align">Register List</h4>
            {/* Search Input */}
            <div className="input-field">
                <input
                    type="text"
                    placeholder="Search by name player"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)} // Update search term
                />
                <label></label>
            </div>

            {/* User List Table */}
            <table className="striped">
                <thead>
                <tr>
                    <th>Name Player</th>
                    <th>Email</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {filteredUsers.map(user => (
                    <tr key={user.email}>
                        <td>{user.namePlayer}</td>
                        <td>{user.email}</td>
                        <td>
                            <button className="btn yellow" onClick={() => handleEdit(user)}>
                                Edit
                            </button>
                        </td>
                    </tr>
                ))}
                {filteredUsers.length === 0 && (
                    <tr>
                        <td colSpan={5} className="center-align">No users found</td>
                    </tr>
                )}
                </tbody>
            </table>

            {/* Edit Modal */}
            <div id="editModal" className="modal">
                <div className="modal-content">
                    <h4>Edit User</h4>
                    {editUser && (
                        <form>
                            {/* Name Player */}
                            <div className="input-field">
                                <input
                                    type="text"
                                    name="namePlayer"
                                    value={editUser.namePlayer}
                                    onChange={handleInputChange}
                                />
                                <label className="active">Name Player</label>
                            </div>

                            {/* Email */}
                            <div className="input-field">
                                <input
                                    type="email"
                                    name="email"
                                    value={editUser.email}
                                    onChange={handleInputChange}
                                />
                                <label className="active">Email</label>
                            </div>

                            {/* Cellular */}
                            <div className="input-field">
                                <input
                                    type="text"
                                    name="cellular"
                                    value={editUser.cellular}
                                    onChange={handleInputChange}
                                />
                                <label className="active">Cellular</label>
                            </div>

                            {/* Role */}
                            <div className="input-field"
                            >
                                <select
                                    name="role"
                                    value={editUser.role}
                                    onChange={handleInputChange}
                                    className="browser-default"
                                >
                                    <option value="" disabled>
                                        Choose role
                                    </option>
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <label className="active">Role</label>
                            </div>

                            {/* Category */}
                            <div className="input-field"
                                 style={{marginTop: '10px'}}>
                                <select
                                    name="category"
                                    value={editUser.category}
                                    onChange={handleInputChange}
                                    className="browser-default"
                                >
                                    <option value="" disabled>
                                        Choose category
                                    </option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                </select>
                                <label className="active">Category
                                </label>
                            </div>

                            {/* Points */}
                            <div className="input-field">
                                <input
                                    type="number"
                                    name="points"
                                    value={editUser.points}
                                    onChange={handleInputChange}
                                />
                                <label className="active">Points</label>
                            </div>

                            {/* State Player */}
                            <div className="input-field" style={{ marginTop: '10px' }}>
                                <label style={{ display: 'flex', alignItems: 'left' }}>
                                    <input
                                        type="checkbox"
                                        name="statePlayer"
                                        checked={editUser.statePlayer}
                                        onChange={(e) =>
                                            setEditUser({
                                                ...editUser,
                                                statePlayer: e.target.checked,
                                            })
                                        }
                                    />
                                    <span style={{ marginLeft: '10px' }}>State Player</span>
                                </label>
                            </div>

                            {/* Update Payment */}
                            <div className="input-field" style={{ marginTop: '60px' }}>
                                <label style={{ display: 'flex', alignItems: 'right' }}>
                                    <input
                                        type="checkbox"
                                        name="updatePayment"
                                        checked={editUser.updatePayment}
                                        onChange={(e) =>
                                            setEditUser({
                                                ...editUser,
                                                updatePayment: e.target.checked,
                                            })
                                        }
                                    />
                                    <span style={{ marginLeft: '10px' }}>Update Payment</span>
                                </label>
                            </div>

                        </form>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="modal-close btn red"
                            style={{marginRight: '20px'}}
                    >Cancel
                    </button>
                    <button className="btn green" onClick={handleSave}>Save</button>
                </div>
            </div>
        </div>
    );
};

export default AdminRegister;
