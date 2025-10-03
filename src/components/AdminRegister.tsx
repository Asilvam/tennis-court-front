import React, {useEffect, useState} from 'react';
import Swal from 'sweetalert2';
import M from 'materialize-css';
import axios from "axios";
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faSearch, faEdit } from '@fortawesome/free-solid-svg-icons';
import {customStyles} from "../utils/customStyles.ts";
import {PlayerCategory, categoryOptions, roleOptions} from "../constants/playerConstants.ts";
import '../styles/AdminRegister.css';

interface Register {
    namePlayer: string;
    category: PlayerCategory | '';
    email: string;
    cellular: string;
    pwd: string;
    statePlayer: boolean;
    emailVerified: boolean;
    updatePayment: boolean;
    verificationToken: string;
    points: string;
    role: string;
    isLigthNigth: boolean;
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
        role: 'user',                // Default role is 'user'
        isLigthNigth: false,
    };

    const apiUrl = import.meta.env.VITE_API_URL;
    const [users, setUsers] = useState<Register[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>(''); // Add search term state
    const [editUser, setEditUser] = useState<Register>(initialEditUser); // State for editing user
    const [loading, setLoading] = useState(false);

    const fetchRegisters = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${apiUrl}/register`);
            setUsers(response.data); // Axios automatically parses the JSON response
        } catch (error) {
            console.error('Error fetching registers:', error);
            let errorMessage;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                errorMessage = `Server responded with error: ${error.response.status} - ${error.response.data.message || error.response.statusText}`;
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            } else { // @ts-expect-error
                if (error.request) {
                                // The request was made but no response was received
                                errorMessage = 'No response received from the server';
                            } else {
                                // Something happened in setting up the request that triggered an Error
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-expect-error
                    errorMessage = error.message;
                            }
            }
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Failed to fetch registers!',
                footer: `<p>${errorMessage}</p>`,
            });
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
                Swal.fire('Success', `${editUser.namePlayer} informacion actualizada.`, 'success');
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
        <div className="container admin-register-container">
            <div className="card admin-card">
                <div className="search-wrapper">
                    <input
                        type="text"
                        placeholder="Buscar por nombre de jugador..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="table-wrapper">
                    <table className="highlight user-table">
                        <thead>
                        <tr>
                            <th>Nombre</th>
                            <th className="center-align">Acciones</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.email}>
                                <td className="name-cell">{user.namePlayer}</td>
                                <td className="action-cell">
                                    <button
                                        className="btn-floating btn-small waves-effect waves-light blue darken-4"
                                        onClick={() => handleEdit(user)}
                                    >
                                        <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={2} className="center-align">No se encontraron usuarios.</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            <div id="editModal" className="modal edit-modal">
                <div className="modal-content">
                    <div className="modal-header">
                        <FontAwesomeIcon icon={faEdit} />
                        <h5>Editar Usuario</h5>
                    </div>
                    <div className="modal-body">
                        {editUser && (
                            <form>
                                <div className="modal-form-section">
                                    <div className="input-field">
                                        <input id="namePlayer" type="text" name="namePlayer" value={editUser.namePlayer} onChange={handleInputChange} />
                                        <label htmlFor="namePlayer" className="active">Nombre</label>
                                    </div>
                                    <div className="input-field">
                                        <input id="cellular" type="text" name="cellular" value={editUser.cellular} onChange={handleInputChange} />
                                        <label htmlFor="cellular" className="active">Celular</label>
                                    </div>
                                </div>

                                <div className="modal-form-section">
                                    <div className="input-field">
                                        <input id="points" type="number" name="points" value={editUser.points} onChange={handleInputChange} />
                                        <label htmlFor="points" className="active">Puntos</label>
                                    </div>
                                    <div className="input-field">
                                        <p className="select-label">Rol</p>
                                        <Select
                                            name="role"
                                            value={roleOptions.find(option => option.value === editUser.role)}
                                            onChange={(selectedOption) => setEditUser(prev => ({ ...prev, role: selectedOption?.value || 'user' }))}
                                            options={roleOptions}
                                            styles={customStyles}
                                        />
                                    </div>
                                    <div className="input-field">
                                        <p className="select-label">Categoría</p>
                                        <Select
                                            name="category"
                                            value={categoryOptions.find(option => option.value === editUser.category)}
                                            onChange={(selectedOption) => setEditUser(prev => ({ ...prev, category: selectedOption?.value || '' }))}
                                            options={categoryOptions}
                                            styles={customStyles}
                                        />
                                    </div>
                                </div>

                                <div className="modal-form-section switch-group">
                                    <div className="switch">
                                        <label>
                                            Activo
                                            <input type="checkbox" name="statePlayer" checked={editUser.statePlayer} onChange={(e) => setEditUser({ ...editUser, statePlayer: e.target.checked })} />
                                            <span className="lever"></span>
                                        </label>
                                    </div>
                                    <div className="switch">
                                        <label>
                                            Pago al día
                                            <input type="checkbox" name="updatePayment" checked={editUser.updatePayment} onChange={(e) => setEditUser({ ...editUser, updatePayment: e.target.checked })} />
                                            <span className="lever"></span>
                                        </label>
                                    </div>
                                    <div className="switch">
                                        <label>
                                            Debe Luz?
                                            <input type="checkbox" name="isLigthNigth" checked={editUser.isLigthNigth} onChange={(e) => setEditUser({ ...editUser, isLigthNigth: e.target.checked })} />
                                            <span className="lever"></span>
                                        </label>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="modal-close btn-flat waves-effect waves-green">
                        Cancelar
                    </button>
                    <button className="btn waves-effect waves-light blue darken-4" onClick={handleSave}>Actualizar</button>
                </div>
            </div>
        </div>
    );
};

export default AdminRegister;
