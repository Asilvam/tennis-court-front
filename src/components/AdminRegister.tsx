import React, {useCallback, useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import axios from "axios";
import Select, { SingleValue, StylesConfig } from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faKey, faLayerGroup, faMagnifyingGlass, faUsersGear } from '@fortawesome/free-solid-svg-icons';
import {customStyles} from "../utils/customStyles.ts";
import {roleOptions} from "../constants/playerConstants.ts";
import AppLoader from './AppLoader';
import '../styles/AdminRegister.css';

interface Register {
    namePlayer: string;
    // category: PlayerCategory | '';
    email: string;
    cellular: string;
    pwd: string;
    statePlayer: boolean;
    emailVerified: boolean;
    updatePayment: boolean;
    verificationToken: string;
    // points: string;
    role: string;
}

interface SelectOption {
    value: string;
    label: string;
}

const AdminRegister: React.FC = () => {

    const navigate = useNavigate();

    const initialEditUser: Register = {
        namePlayer: '',             // Empty string for player's name
        // category: '',               // Empty string for category
        email: '',                  // Empty string for email
        cellular: '',               // Empty string for cellular number
        pwd: '',                    // Empty string for password
        statePlayer: false,         // Default state is inactive (false)
        emailVerified: false,       // Default email verification status is false
        updatePayment: false,       // Default payment update status is false
        verificationToken: '',      // Empty string for verification token
        // points: '0',                // Default points as a string (can be '0' or '0 points')
        role: 'user',                // Default role is 'user'
    };

    const apiUrl = import.meta.env.VITE_API_URL;
    const [users, setUsers] = useState<Register[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>(''); // Add search term state
    const [editUser, setEditUser] = useState<Register>(initialEditUser); // State for editing user
    const [loading, setLoading] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const modalSelectStyles: StylesConfig<SelectOption, false> = {
        ...customStyles,
        menuPortal: (base) => ({
            ...base,
            zIndex: 1200,
        }),
        menu: (base) => ({
            ...base,
            zIndex: 1200,
        }),
    };

    const fetchRegisters = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${apiUrl}/register`);
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching registers:', error);
            let errorMessage;
            if (error.response) {
                errorMessage = `Server responded with error: ${error.response.status} - ${error.response.data.message || error.response.statusText}`;
            } else {
                if (error.request) {
                    errorMessage = 'No response received from the server';
                } else {
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
    }, [apiUrl]);

    useEffect(() => {
        fetchRegisters();
    }, [fetchRegisters]);

    const handleEdit = (user: Register) => {
        setEditUser({ ...user });
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (editUser) {
            if (e.target.name === 'email') {
                return;
            }
            setEditUser({...editUser, [e.target.name]: e.target.value});
        }
    };

    const handleSave = async () => {
        if (editUser) {
            try {
                const response = await axios.patch(
                    `${apiUrl}/register/${editUser.email}`,
                    editUser,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (response.status !== 200) {
                    Swal.fire('Error', 'No se pudo actualizar el usuario.', 'error');
                    return;
                }

                Swal.fire('Success', `${editUser.namePlayer} informacion actualizada.`, 'success');
                setSearchTerm('');
                handleCloseEditModal();
            } catch (error) {
                console.error('Error updating user:', error);
                Swal.fire('Error', 'Failed to update user.', 'error');
            } finally {
                fetchRegisters();
            }
        }
    };
    const handleResetPassword = async (user: Register) => {
        const result = await Swal.fire({
            title: '¿Resetear contraseña?',
            html: `Se enviará un correo de restablecimiento a <strong>${user.email}</strong>.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d97706',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, resetear',
            cancelButtonText: 'Cancelar',
        });

        if (!result.isConfirmed) return;

        Swal.fire({
            title: 'Enviando...',
            text: 'Procesando solicitud de restablecimiento.',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        try {
            await axios.post(`${apiUrl}/register/resetpass`, { email: user.email });
            setSearchTerm('');
            Swal.fire('Enviado ✓', `Se envió el correo de restablecimiento a ${user.email}.`, 'success');
        } catch (error) {
            console.error('Error resetting password:', error);
            Swal.fire('Error', 'No se pudo enviar el correo de restablecimiento.', 'error');
        }
    };

    const filteredUsers = users.filter(user =>
        user.namePlayer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return loading ? (
        <AppLoader text="Cargando usuarios..." />
    ) : (
        <div className="container admin-register-container">
            <div className="admin-register-hero">
                <div>
                    <h4>Administracion de Usuarios</h4>
                    <p>Gestiona datos, estado y categoria de cada jugador.</p>
                </div>
                <div className="admin-register-badge">
                    <FontAwesomeIcon icon={faUsersGear} />
                    <span>{filteredUsers.length} usuarios</span>
                </div>
            </div>

            <div className="card admin-card">
                <div className="search-wrapper">
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre de jugador..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                            }
                        }}
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
                                        type="button"
                                        className="btn-floating btn-small waves-effect waves-light blue darken-4 action-edit-btn"
                                        onClick={() => handleEdit(user)}
                                        title="Editar usuario"
                                    >
                                        <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-floating btn-small waves-effect waves-light action-categories-btn"
                                        onClick={() => navigate(`/admincategories?email=${encodeURIComponent(user.email)}`)}
                                        title="Administrar categorías"
                                    >
                                        <FontAwesomeIcon icon={faLayerGroup} />
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-floating btn-small waves-effect waves-light action-reset-btn"
                                        onClick={() => handleResetPassword(user)}
                                        title="Resetear contraseña"
                                    >
                                        <FontAwesomeIcon icon={faKey} />
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
            {isEditModalOpen && (
                <div className="edit-modal-backdrop" onClick={handleCloseEditModal}>
                    <div id="editModal" className="modal edit-modal" onClick={(e) => e.stopPropagation()}>
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
                                                <input id="email" type="email" name="email" value={editUser.email} readOnly className="readonly-input" />
                                                <label htmlFor="email" className="active">Correo</label>
                                            </div>
                                            <div className="input-field">
                                                <input id="cellular" type="text" name="cellular" value={editUser.cellular} onChange={handleInputChange} />
                                                <label htmlFor="cellular" className="active">Celular</label>
                                            </div>
                                        </div>

                                        <div className="modal-form-section">
                                            {/*<div className="input-field">*/}
                                            {/*    <input id="points" type="number" name="points" value={editUser.points} onChange={handleInputChange} />*/}
                                            {/*    <label htmlFor="points" className="active">Puntos</label>*/}
                                            {/*</div>*/}
                                            <div className="input-field">
                                                <p className="select-label">Rol</p>
                                                <Select<SelectOption, false>
                                                    name="role"
                                                    value={roleOptions.find(option => option.value === editUser.role)}
                                                    onChange={(selectedOption: SingleValue<SelectOption>) =>
                                                        setEditUser(prev => ({ ...prev, role: selectedOption?.value || 'user' }))
                                                    }
                                                    options={roleOptions}
                                                    styles={modalSelectStyles}
                                                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                                    menuPosition="fixed"
                                                    menuPlacement="top"
                                                    maxMenuHeight={180}
                                                />
                                            </div>
                                            {/*<div className="input-field">*/}
                                            {/*    <p className="select-label">Categoría</p>*/}
                                            {/*    <Select<SelectOption, false>*/}
                                            {/*        name="category"*/}
                                            {/*        value={categoryOptions.find(option => option.value === editUser.category)}*/}
                                            {/*        onChange={(selectedOption: SingleValue<SelectOption>) =>*/}
                                            {/*            setEditUser(prev => ({ ...prev, category: (selectedOption?.value as PlayerCategory) || '' }))*/}
                                            {/*        }*/}
                                            {/*        options={categoryOptions}*/}
                                            {/*        styles={modalSelectStyles}*/}
                                            {/*        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}*/}
                                            {/*        menuPosition="fixed"*/}
                                            {/*        menuPlacement="top"*/}
                                            {/*        maxMenuHeight={180}*/}
                                            {/*    />*/}
                                            {/*</div>*/}
                                        </div>

                                        <div className="modal-form-section switch-group">
                                            <div className="switch status-switch">
                                                <label>
                                                    Activo
                                                    <input type="checkbox" name="statePlayer" checked={editUser.statePlayer} onChange={(e) => setEditUser({ ...editUser, statePlayer: e.target.checked })} />
                                                    <span className="lever"></span>
                                                </label>
                                            </div>
                                            <div className="switch status-switch">
                                                <label>
                                                    Pago al día
                                                    <input type="checkbox" name="updatePayment" checked={editUser.updatePayment} onChange={(e) => setEditUser({ ...editUser, updatePayment: e.target.checked })} />
                                                    <span className="lever"></span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="admin-modal-actions">
                                            <button className="btn-flat waves-effect waves-light cancel-btn admin-modal-btn-cancel" type="button" onClick={handleCloseEditModal}>
                                                Cancelar
                                            </button>
                                            <button className="btn waves-effect waves-light save-btn admin-modal-btn-submit" type="button" onClick={handleSave}>
                                                Actualizar
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRegister;
