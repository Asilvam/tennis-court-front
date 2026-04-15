import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { customStyles } from '../utils/customStyles';
import { categoryOptions } from '../constants/playerConstants';
import Select, { SingleValue, StylesConfig } from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faArrowLeft, faSave, faPlusCircle, faTrashAlt, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import '../styles/AdminRegister.css';

type CategoryOption = { value: string; label: string };

interface PlayerCategoryPoints {
    id?: string;
    playerEmail: string;
    category: string;
    points: number;
    isActive?: boolean;
}

interface PlayerOption {
    value: string; // email
    label: string; // name
}

const AdminCategoriesPlayer: React.FC = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedEmail = searchParams.get('email');

    const [players, setPlayers] = useState<PlayerOption[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerOption | null>(null);
    const [categories, setCategories] = useState<PlayerCategoryPoints[]>([]);
    const [originalCategories, setOriginalCategories] = useState<PlayerCategoryPoints[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [saving, setSaving] = useState(false);

    const modalSelectStyles: StylesConfig<CategoryOption, false> = {
        ...customStyles,
        menuPortal: (base) => ({ ...base, zIndex: 1200 }),
        menu: (base) => ({ ...base, zIndex: 1200 }),
    };

    useEffect(() => {
        const loadPlayers = async () => {
            setLoadingPlayers(true);
            try {
                const { data } = await axios.get(`${apiUrl}/register`);
                const options: PlayerOption[] = (data ?? []).map((u: { email: string; namePlayer: string }) => ({
                    value: u.email,
                    label: u.namePlayer,
                }));
                setPlayers(options);

                if (preselectedEmail) {
                    const match = options.find((o) => o.value === preselectedEmail);
                    if (match) setSelectedPlayer(match);
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo cargar la lista de jugadores.', 'error');
            } finally {
                setLoadingPlayers(false);
            }
        };
        void loadPlayers();
    }, [apiUrl, preselectedEmail]);

    const loadCategories = async () => {
        if (!selectedPlayer) return;
        setLoadingCategories(true);
        try {
            const { data } = await axios.get<PlayerCategoryPoints[]>(
                `${apiUrl}/player-category-points/${selectedPlayer.value}`
            );
            setCategories(data ?? []);
            setOriginalCategories(JSON.parse(JSON.stringify(data ?? [])));
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron cargar las categorías.', 'error');
        } finally {
            setLoadingCategories(false);
        }
    };

    useEffect(() => {
        void loadCategories();
    }, [selectedPlayer]);

    const hasChanges = useMemo(() => {
        return JSON.stringify(categories) !== JSON.stringify(originalCategories);
    }, [categories, originalCategories]);

    const updatePoints = (category: string, value: string) => {
        const parsed = value === '' ? 0 : Number(value);
        setCategories((prev) =>
            prev.map((row) =>
                row.category === category
                    ? { ...row, points: parsed }
                    : row
            )
        );
    };

    const toggleCategoryState = (category: string, isActive: boolean) => {
        setCategories((prev) =>
            prev.map((row) =>
                row.category === category
                    ? { ...row, isActive } : row
            )
        );
    };

    const handleAddCategory = async (opt: SingleValue<CategoryOption>) => {
        if (!opt || !selectedPlayer) return;
        try {
            setSaving(true);
            await axios.post(`${apiUrl}/player-category-points/${selectedPlayer.value}/add-category`, {
                category: opt.value
            });
            await loadCategories();
            Swal.fire('Éxito', 'Categoría vinculada.', 'success');
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo vincular la categoría.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveCategory = async (category: string) => {
        if (!selectedPlayer) return;
        const result = await Swal.fire({
            title: '¿Remover categoría?',
            text: `Se eliminarán los puntos de ${category}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, remover'
        });

        if (result.isConfirmed) {
            try {
                setSaving(true);
                await axios.delete(`${apiUrl}/player-category-points/${selectedPlayer.value}/${category}`);
                await loadCategories();
                Swal.fire('Removida', 'Categoría eliminada.', 'success');
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo remover.', 'error');
            } finally {
                setSaving(false);
            }
        }
    };

    const handleSavePoints = async () => {
        if (!selectedPlayer) return;
        setSaving(true);
        try {
            const payload = categories.map(c => ({
                category: c.category,
                points: c.points,
                isActive: c.isActive
            }));

            await axios.put(`${apiUrl}/player-category-points/${selectedPlayer.value}/points`, {
                categories: payload,
            });
            setOriginalCategories(structuredClone(categories));
            Swal.fire('Éxito', 'Cambios guardados.', 'success');
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron guardar los cambios.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container admin-register-container">
            {/* ── Hero ──────────────────────────────────────────────────── */}
            <div className="admin-register-hero">
                <div>
                    <h4>Administrar Categorías y Puntos</h4>
                    <p>Gestiona el nivel competitivo y puntos de ranking.</p>
                </div>
                <div className="admin-register-badge hide-on-small-only">
                    <FontAwesomeIcon icon={faLayerGroup} />
                    <span>{categories.length} Categorías</span>
                </div>
            </div>

            {/* ── Jugador seleccionado ───────────────────────────────────── */}
            <div className="player-info-card">
                <div className="player-info-avatar">
                    <FontAwesomeIcon icon={faUser} />
                </div>
                <div className="player-info-details">
                    <span className="player-info-name">
                        {selectedPlayer ? selectedPlayer.label : 'Cargando...'}
                    </span>
                    {selectedPlayer && (
                        <span className="player-info-email">{selectedPlayer.value}</span>
                    )}
                </div>
            </div>

            {/* ── Contenido ─────────────────────────────────────────────── */}
            {loadingCategories ? (
                <div className="center-align categories-loader">
                    <div className="preloader-wrapper active">
                        <div className="spinner-layer spinner-blue-only">
                            <div className="circle-clipper left"><div className="circle"></div></div>
                            <div className="gap-patch"><div className="circle"></div></div>
                            <div className="circle-clipper right"><div className="circle"></div></div>
                        </div>
                    </div>
                </div>
            ) : selectedPlayer ? (
                <div className="animate-fade-in">

                    {/* VISTA DESKTOP */}
                    <div className="hide-on-small-only">
                        <div className="card admin-card categories-table-card">
                            <div className="table-wrapper">
                                <table className="highlight user-table">
                                    <thead>
                                        <tr>
                                            <th className="category-th">Categoría</th>
                                            <th className="points-th right-align">Puntos Ranking</th>
                                            <th className="center-align state-th">Estado</th>
                                            <th className="center-align actions-th">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categories.map((row) => (
                                            <tr key={row.category}>
                                                <td className="category-td">
                                                    <div className="category-label-group">
                                                        <span className="category-badge">CAT</span>
                                                        <span className="category-name">{row.category}</span>
                                                    </div>
                                                </td>
                                                <td className="points-td right-align">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        className={`browser-default points-input${!row.isActive ? ' points-input--disabled' : ''}`}
                                                        value={row.points}
                                                        disabled={!row.isActive}
                                                        onChange={(e) => updatePoints(row.category, e.target.value)}
                                                    />
                                                </td>
                                                <td className="center-align state-td">
                                                    <div className="state-switch-cell">
                                                        <div className="switch">
                                                            <label>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={row.isActive}
                                                                    onChange={(e) => toggleCategoryState(row.category, e.target.checked)}
                                                                />
                                                                <span className="lever"></span>
                                                            </label>
                                                        </div>
                                                        <span className={`state-label${row.isActive ? ' state-label--active' : ''}`}>
                                                            {row.isActive ? 'Activa' : 'Inactiva'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="center-align actions-td">
                                                    <button
                                                        className="btn-floating btn-small waves-effect waves-light red darken-2 btn-delete-compact"
                                                        onClick={() => handleRemoveCategory(row.category)}
                                                        title="Eliminar"
                                                    >
                                                        <FontAwesomeIcon icon={faTrashAlt} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* VISTA MOBILE */}
                    <div className="show-on-small hide-on-med-and-up">
                        {categories.map((row) => (
                            <div key={row.category} className="category-mobile-card">
                                <div className="category-mobile-header">
                                    <div className="category-label-group">
                                        <span className="category-badge">CAT</span>
                                        <span className="category-name">{row.category}</span>
                                    </div>
                                    <button
                                        className="btn-delete-mobile"
                                        onClick={() => handleRemoveCategory(row.category)}
                                    >
                                        <FontAwesomeIcon icon={faTrashAlt} />
                                    </button>
                                </div>

                                <div className="category-mobile-points">
                                    <label className="category-mobile-points-label">Puntos de Ranking</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        className={`browser-default category-mobile-points-input${!row.isActive ? ' points-input--disabled' : ''}`}
                                        value={row.points}
                                        disabled={!row.isActive}
                                        onChange={(e) => updatePoints(row.category, e.target.value)}
                                    />
                                </div>

                                <div className={`category-mobile-status${row.isActive ? ' category-mobile-status--active' : ''}`}>
                                    <label className="status-switch">
                                        <span className={row.isActive ? 'status-label--active' : 'status-label--inactive'}>
                                            {row.isActive ? 'Categoría Activa' : 'Categoría Inactiva'}
                                        </span>
                                        <div className="switch">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={row.isActive}
                                                    onChange={(e) => toggleCategoryState(row.category, e.target.checked)}
                                                />
                                                <span className="lever"></span>
                                            </label>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Agregar categoría ──────────────────────────────── */}
                    <div className="add-category-section">
                        <p className="add-category-label">
                            <FontAwesomeIcon icon={faPlusCircle} />
                            Añadir una nueva categoría al jugador
                        </p>
                        <Select<CategoryOption, false>
                            options={categoryOptions}
                            onChange={handleAddCategory}
                            styles={modalSelectStyles}
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            menuPosition="fixed"
                            menuPlacement="top"
                            maxMenuHeight={180}
                            placeholder="Agregar categoría..."
                        />
                    </div>

                    {/* ── Acciones ───────────────────────────────────────── */}
                    <div className="profile-actions">
                        <button
                            className="admin-modal-btn-cancel"
                            type="button"
                            onClick={() => navigate(-1)}
                        >
                            <FontAwesomeIcon icon={faArrowLeft} />
                            Volver
                        </button>
                        <button
                            className={`admin-modal-btn-submit${!hasChanges ? ' admin-modal-btn-submit--disabled' : ''}`}
                            type="button"
                            onClick={handleSavePoints}
                            disabled={!hasChanges || saving}
                        >
                            <FontAwesomeIcon icon={faSave} />
                            {saving ? 'Guardando...' : 'Actualizar'}
                        </button>
                    </div>

                </div>
            ) : null}
        </div>
    );
};

export default AdminCategoriesPlayer;
