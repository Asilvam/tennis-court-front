import React, {useEffect, useState} from 'react';
import Swal from 'sweetalert2';
import M from 'materialize-css';
import axios from "axios";
import Select from 'react-select';
import {customStyles} from "../utils/customStyles.ts";

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
    role: string;
}

const AdminRegister: React.FC = () => {

    const initialEditUser: Register = {
        namePlayer: '',             // Empty string for player's name
        category: '',               // Empty string for category
        email: '',                  // Empty string for email
        cellular: '',               // Empty string for cellular number
        pwd: '',                    // Empty string for password
        statePlayer: false,         // Default state is inactive (false)
        emailVerified: false,       // Default email verification status is false
        updatePayment: false,       // Default payment update status is false
        verificationToken: '',      // Empty string for verification token
        points: '0',                // Default points as a string (can be '0' or '0 points')
        role: 'user'                // Default role is 'user'
    };

    const apiUrl = import.meta.env.VITE_API_URL;
    const [users, setUsers] = useState<Register[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>(''); // Add search term state
    const [editUser, setEditUser] = useState<Register>(initialEditUser); // State for editing user
    const [loading, setLoading] = useState(false);

    const categoryOptions = [
        {value: 'A', label: 'A'},
        {value: 'B', label: 'B'},
        {value: 'C', label: 'C'},
        {value: 'D', label: 'D'},
    ];

    const roleOptions = [
        {value: 'user', label: 'User'},
        {value: 'admin', label: 'Admin'},
    ];

    const fetchRegisters = async () => {
        setLoading(true);
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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRegisters();
        // Initialize Materialize Modal
        const modalElems = document.querySelectorAll('.modal');
        M.Modal.init(modalElems);
    }, []);

    const handleEdit = (user: Register) => {
        setEditUser({ ...user });
        const modal = document.getElementById('editModal');
        if (modal) {
            const instance = M.Modal.getInstance(modal) || M.Modal.init(modal);
            instance.open();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (editUser) {
            setEditUser({...editUser, [e.target.name]: e.target.value});
        }
    };

    const handleSave = async () => {
        if (editUser) {
            try {
                // console.log(editUser);
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
                const modal = document.getElementById('editModal');
                if (modal) {
                    const instance = M.Modal.getInstance(modal);
                    if (instance) instance.close();
                }
            } catch (error) {
                console.error('Error updating user:', error);
                Swal.fire('Error', 'Failed to update user.', 'error');
            } finally {
                fetchRegisters()
            }
        }
    };
    const filteredUsers = users.filter(user =>
        user.namePlayer.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
    ) : (
        <div className="container">
            {/*<h6 className="left-align">Register List</h6>*/}
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
                            <button className="btn green" onClick={() => handleEdit(user)}>
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
                    {/*<h5>Edit User</h5>*/}
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
                            {/*<div className="input-field">*/}
                            {/*    <input*/}
                            {/*        type="email"*/}
                            {/*        name="email"*/}
                            {/*        value={editUser.email}*/}
                            {/*        onChange={handleInputChange}*/}
                            {/*        disabled={true}*/}
                            {/*    />*/}
                            {/*    <label className="active">Email</label>*/}
                            {/*</div>*/}
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
                            <div className="input-field" style={{paddingTop: '5px'}}>
                                <Select
                                    name="role"
                                    value={roleOptions.find(option => option.value === editUser.role)}
                                    onChange={(selectedOption) => {
                                        if (selectedOption && 'value' in selectedOption) {
                                            setEditUser((prevState) => ({
                                                ...prevState,
                                                role: selectedOption.value // Use the selected value if valid
                                            }));
                                        } else {
                                            setEditUser((prevState) => ({
                                                ...prevState,
                                                role: 'user'  // Reset to empty if no option is selected
                                            }));
                                        }
                                    }}
                                    options={roleOptions}
                                    placeholder="Choose role"
                                    isSearchable
                                    className="react-select-container"
                                    classNamePrefix="react-select"
                                    styles={customStyles} // Apply custom styles here
                                />
                                <label className="active">Role</label>
                            </div>
                            {/* Category */}
                            <div className="input-field" style={{paddingTop: '5px'}}>
                                <Select
                                    name="category"
                                    value={categoryOptions.find(option => option.value === editUser.category)}
                                    onChange={(selectedOption) => {
                                        if (selectedOption && 'value' in selectedOption) {
                                            setEditUser((prevState) => ({
                                                ...prevState,
                                                category: selectedOption.value // Use the selected value if valid
                                            }));
                                        } else {
                                            setEditUser((prevState) => ({
                                                ...prevState,
                                                category: 'C'  // Reset to empty if no option is selected
                                            }));
                                        }
                                    }}
                                    options={categoryOptions}
                                    placeholder="Choose category"
                                    isSearchable
                                    className="react-select-container"
                                    classNamePrefix="react-select"
                                    styles={customStyles}
                                />
                                <label className="active">Category</label>
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
                            <div className="input-field">
                                <label>
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
                                    <span style={{marginLeft: '10px'}}>State Player</span>
                                </label>
                            </div>
                            {/* Update Payment */}
                            <div className="input-field" style={{marginLeft: '130px', marginBottom: '30px'}}>
                                <label>
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
                                    <span style={{marginLeft: '10px'}}>Update Payment</span>
                                </label>
                            </div>
                        </form>
                    )}
                </div>
                <div className="modal-footer"
                     style={{display: 'flex', justifyContent: 'flex-end', padding: '10px 30px'}}>
                    <button className="modal-close btn red" style={{marginRight: '15px'}}>
                        Cancel
                    </button>
                    <button className="btn green" onClick={handleSave}>Save</button>
                </div>

            </div>
        </div>
    );
};

export default AdminRegister;
