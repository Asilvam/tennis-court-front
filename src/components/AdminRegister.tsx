import React, {useCallback, useEffect, useMemo, useState} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import axios from "axios";
import Select, { SingleValue, StylesConfig } from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faKey, faLayerGroup, faMagnifyingGlass, faSpinner, faUsersGear } from '@fortawesome/free-solid-svg-icons';
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

let adminUsersCache: Register[] | null = null;

const AdminRegister: React.FC = () => {

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

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
    const [users, setUsers] = useState<Register[]>(() => adminUsersCache ?? []);
    const [searchTerm, setSearchTerm] = useState<string>(() => searchParams.get('search') ?? '');
    const [editUser, setEditUser] = useState<Register>(initialEditUser); // State for editing user
    const [originalEditUser, setOriginalEditUser] = useState<Register | null>(null);
    const [loading, setLoading] = useState(() => adminUsersCache === null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const modalSelectStyles: StylesConfig<SelectOption, false> = {
        ...customStyles,
        control: (base, state) => ({
            ...base,
            minHeight: '46px',
            height: '46px',
            background: 'rgba(255, 255, 255, 0.07)',
            borderColor: state.isFocused ? 'var(--ctq-accent)' : 'rgba(148, 163, 184, 0.24)',
            borderRadius: '10px',
            boxShadow: state.isFocused ? '0 0 0 3px rgba(125, 211, 252, 0.14)' : 'none',
            color: 'var(--ctq-text)',
            cursor: 'pointer',
            '&:hover': {
                borderColor: 'rgba(125, 211, 252, 0.5)',
            },
        }),
        singleValue: (base) => ({
            ...base,
            color: 'var(--ctq-text)',
        }),
        valueContainer: (base) => ({
            ...base,
            height: '46px',
            padding: '0 12px',
        }),
        input: (base) => ({
            ...base,
            color: 'var(--ctq-text)',
        }),
        dropdownIndicator: (base) => ({
            ...base,
            color: 'var(--ctq-text-muted)',
        }),
        indicatorsContainer: (base) => ({
            ...base,
            height: '46px',
        }),
        menu: (base) => ({
            ...base,
            zIndex: 10000,
            background: 'var(--ctq-accent-deep)',
            border: '1px solid var(--ctq-border-soft)',
            borderRadius: '10px',
            overflow: 'hidden',
        }),
        option: (base, state) => ({
            ...base,
            background: state.isSelected
                ? 'rgba(125, 211, 252, 0.18)'
                : state.isFocused
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'transparent',
            color: state.isSelected ? 'var(--ctq-accent)' : 'var(--ctq-text)',
            cursor: 'pointer',
        }),
        menuPortal: (base) => ({
            ...base,
            zIndex: 10000,
        }),
    };

    const fetchRegisters = useCallback(async () => {
        if (adminUsersCache === null) {
            setLoading(true);
        }
        try {
            const response = await axios.get(`${apiUrl}/register`);
            adminUsersCache = response.data;
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

    const updateSearchTerm = (value: string) => {
        setSearchTerm(value);

        const nextParams = new URLSearchParams(searchParams);
        if (value.trim()) {
            nextParams.set('search', value);
        } else {
            nextParams.delete('search');
        }
        setSearchParams(nextParams, { replace: true });
    };

    useEffect(() => {
        fetchRegisters();
    }, [fetchRegisters]);

    const handleEdit = (user: Register) => {
        setEditUser({ ...user });
        setOriginalEditUser({ ...user });
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setOriginalEditUser(null);
    };

    const hasChanges = useMemo(() => {
        if (!originalEditUser) {
            return false;
        }

        return (
            editUser.namePlayer !== originalEditUser.namePlayer ||
            editUser.cellular !== originalEditUser.cellular ||
            editUser.role !== originalEditUser.role ||
            editUser.statePlayer !== originalEditUser.statePlayer ||
            editUser.updatePayment !== originalEditUser.updatePayment
        );
    }, [editUser, originalEditUser]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (editUser) {
            if (e.target.name === 'email') {
                return;
            }
            setEditUser(prev => ({ ...prev, [e.target.name]: e.target.value }));
        }
    };

    const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;

        if (name !== 'statePlayer' && name !== 'updatePayment') {
            return;
        }

        setEditUser(prev => ({ ...prev, [name]: checked }));
    };

    const handleSave = async () => {
        if (editUser) {
            if (!hasChanges || isSaving) {
                return;
            }

            setIsSaving(true);
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
                updateSearchTerm('');
                handleCloseEditModal();
            } catch (error) {
                console.error('Error updating user:', error);
                Swal.fire('Error', 'Failed to update user.', 'error');
            } finally {
                try {
                    await fetchRegisters();
                } finally {
                    setIsSaving(false);
                }
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
            updateSearchTerm('');
            Swal.fire('Enviado ✓', `Se envió el correo de restablecimiento a ${user.email}.`, 'success');
        } catch (error) {
            console.error('Error resetting password:', error);
            Swal.fire('Error', 'No se pudo enviar el correo de restablecimiento.', 'error');
        }
    };

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredUsers = users.filter(user =>
        user.namePlayer.toLowerCase().includes(normalizedSearch)
    );

    return loading ? (
        <div className="admin-users-loader">
            <AppLoader text="Cargando usuarios..." />
        </div>
    ) : (
        <div className="container admin-register-container admin-users-page">
            <div className="admin-register-hero">
                <div>
                    <h4>Administración de usuarios</h4>
                    <p>Gestiona la información, el acceso y las categorías de los jugadores.</p>
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
                        className="browser-default"
                        placeholder="Buscar por nombre de jugador..."
                        aria-label="Buscar usuarios por nombre"
                        value={searchTerm}
                        onChange={e => updateSearchTerm(e.target.value)}
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
                                <td
                                    className={`name-cell ${
                                        !user.statePlayer
                                            ? 'name-cell--inactive'
                                            : !user.updatePayment
                                                ? 'name-cell--payment-due'
                                                : ''
                                    }`}
                                    title={!user.statePlayer ? 'Usuario inactivo' : !user.updatePayment ? 'Pago pendiente' : 'Usuario activo'}
                                >
                                    {user.namePlayer}
                                </td>
                                <td className="action-cell">
                                    <button
                                        type="button"
                                        className="btn-floating btn-small waves-effect waves-light blue darken-4 action-edit-btn"
                                        onClick={() => handleEdit(user)}
                                        title="Editar usuario"
                                        aria-label={`Editar a ${user.namePlayer}`}
                                    >
                                        <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-floating btn-small waves-effect waves-light action-categories-btn"
                                        onClick={() => navigate(`/admincategories?email=${encodeURIComponent(user.email)}`)}
                                        disabled={!user.statePlayer}
                                        title={user.statePlayer ? 'Administrar categorías' : 'Disponible al activar el usuario'}
                                        aria-label={`Administrar categorías de ${user.namePlayer}`}
                                    >
                                        <FontAwesomeIcon icon={faLayerGroup} />
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-floating btn-small waves-effect waves-light action-reset-btn"
                                        onClick={() => handleResetPassword(user)}
                                        disabled={!user.statePlayer}
                                        title={user.statePlayer ? 'Resetear contraseña' : 'Disponible al activar el usuario'}
                                        aria-label={`Restablecer contraseña de ${user.namePlayer}`}
                                    >
                                        <FontAwesomeIcon icon={faKey} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={2} className="admin-users-empty">No encontramos usuarios con esa búsqueda.</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="edit-modal-backdrop" onClick={isSaving ? undefined : handleCloseEditModal}>
                    <div id="editModal" className="modal edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-user-title" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header">
                                <FontAwesomeIcon icon={faEdit} />
                                <h5 id="edit-user-title">Editar usuario</h5>
                            </div>
                            <div className="modal-body">
                                {editUser && (
                                    <form>
                                        <div className="modal-form-section">
                                            <div className="input-field">
                                                <input id="namePlayer" type="text" name="namePlayer" value={editUser.namePlayer} onChange={handleInputChange} disabled={isSaving} />
                                                <label htmlFor="namePlayer" className="active">Nombre</label>
                                            </div>
                                            <div className="input-field">
                                                <input id="email" type="email" name="email" value={editUser.email} readOnly className="readonly-input" />
                                                <label htmlFor="email" className="active">Correo</label>
                                            </div>
                                            <div className="input-field">
                                                <input id="cellular" type="text" name="cellular" value={editUser.cellular} onChange={handleInputChange} disabled={isSaving} />
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
                                                    isSearchable={false}
                                                    isClearable={false}
                                                    isDisabled={isSaving}
                                                    blurInputOnSelect
                                                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                                    menuPosition="fixed"
                                                    menuPlacement="auto"
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
                                                    <input type="checkbox" name="statePlayer" checked={editUser.statePlayer} onChange={handleSwitchChange} disabled={isSaving} />
                                                    <span className="lever"></span>
                                                </label>
                                            </div>
                                            <div className="switch status-switch">
                                                <label>
                                                    Pago al día
                                                    <input type="checkbox" name="updatePayment" checked={editUser.updatePayment} onChange={handleSwitchChange} disabled={isSaving} />
                                                    <span className="lever"></span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="admin-modal-actions">
                                            <button className="btn-flat waves-effect waves-light cancel-btn admin-modal-btn-cancel" type="button" onClick={handleCloseEditModal} disabled={isSaving}>
                                                Cancelar
                                            </button>
                                            <button className="btn waves-effect waves-light save-btn admin-modal-btn-submit" type="button" onClick={handleSave} disabled={!hasChanges || isSaving} aria-busy={isSaving}>
                                                {isSaving ? <><FontAwesomeIcon icon={faSpinner} spin /> Actualizando...</> : 'Actualizar'}
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
