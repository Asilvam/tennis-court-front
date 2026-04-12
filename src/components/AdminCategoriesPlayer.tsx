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
            // Si el backend aún requiere matchType por esquema de DB, envía 'singles' por defecto
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
                // IMPORTANTE: Asegúrate que el backend tenga esta ruta sin el parámetro matchType.
                // Si el backend no ha cambiado, fallará.
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
            // Limpiamos el objeto para asegurar que el backend reciba lo que espera
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
        <div className="container admin-register-container" style={{ paddingBottom: '120px', minHeight: '100vh' }}>
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

            {/* Información del Jugador */}
            <div className="categories-card" style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div className="modal-header" style={{ width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, backgroundColor: '#eff6ff' }}>
                        <FontAwesomeIcon icon={faUser} style={{ fontSize: '1.5rem', color: '#3b82f6' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <h6 className="player-name" style={{ margin: 0, fontWeight: 700, color: '#1e3a8a', textAlign: 'left' }}>
                            {selectedPlayer ? selectedPlayer.label : 'Cargando...'}
                        </h6>
                        {selectedPlayer && (
                            <span className="player-email" style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500, wordBreak: 'break-all' }}>{selectedPlayer.value}</span>
                        )}
                    </div>
                </div>
            </div>

            {loadingCategories ? (
                <div className="center-align" style={{ padding: '40px' }}>
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
                    
                    {/* VISTA DESKTOP/TABLET */}
                    <div className="hide-on-small-only">
                        <div className="card admin-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '24px', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}>
                            <div className="table-wrapper">
                                <table className="highlight user-table" style={{ margin: 0 }}>
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
                                                        type="number"
                                                        className="browser-default points-input"
                                                        value={row.points}
                                                        disabled={!row.isActive}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => updatePoints(row.category, e.target.value)}
                                                        style={{ 
                                                            opacity: row.isActive ? 1 : 0.5, 
                                                            cursor: row.isActive ? 'text' : 'not-allowed',
                                                            width: '100px',
                                                            textAlign: 'center',
                                                            borderRadius: '6px',
                                                            border: '1px solid #cbd5e1',
                                                            padding: '4px',
                                                            fontWeight: 'bold'
                                                        }}
                                                    />
                                                </td>
                                                <td className="center-align state-td">
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
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
                                                        <span style={{ 
                                                            fontSize: '0.65rem', 
                                                            fontWeight: 800, 
                                                            color: row.isActive ? '#2e7d32' : '#9e9e9e',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {row.isActive ? 'Activa' : 'Inactiva'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="center-align actions-td">
                                                    <button className="btn-floating btn-small waves-effect waves-light red darken-2 btn-delete-compact" onClick={() => handleRemoveCategory(row.category)} title="Eliminar">
                                                        <FontAwesomeIcon icon={faTrashAlt} style={{ fontSize: '0.9rem' }} />
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
                            <div key={row.category} className="card admin-card" style={{ marginBottom: '16px', padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ background: '#e0e7ff', color: '#1e3a8a', padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800 }}>CAT</span>
                                        <h6 style={{ margin: 0, fontWeight: 700, color: '#1e3a8a' }}>{row.category}</h6>
                                    </div>
                                    <button 
                                        className="btn-floating btn-small waves-effect waves-light red darken-2"
                                        onClick={() => handleRemoveCategory(row.category)}
                                        style={{ width: '32px', height: '32px', minWidth: '32px' }}
                                    >
                                        <FontAwesomeIcon icon={faTrashAlt} style={{ fontSize: '0.8rem' }} />
                                    </button>
                                </div>
                                <div className="row" style={{ marginBottom: '0' }}>
                                    <div className="col s12" style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', color: '#64748b', fontWeight: 800, fontSize: '0.75rem', marginBottom: '8px' }}>PUNTOS DE RANKING</label>
                                        <input
                                            type="number"
                                            className="browser-default"
                                            value={row.points}
                                            disabled={!row.isActive}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => updatePoints(row.category, e.target.value)}
                                            style={{ width: '100%', height: '45px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontWeight: 700, fontSize: '1rem', background: row.isActive ? '#f8fafc' : '#e2e8f0', cursor: row.isActive ? 'text' : 'not-allowed', opacity: row.isActive ? 1 : 0.7, boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                                <div className="status-switch" style={{ 
                                    marginTop: '10px',
                                    padding: '12px',
                                    background: row.isActive ? '#f1f8e9' : '#f5f5f5',
                                    borderRadius: '8px',
                                    border: `1px solid ${row.isActive ? '#c5e1a5' : '#e0e0e0'}`,
                                    transition: 'all 0.2s ease'
                                }}>
                                    <label style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between', 
                                        width: '100%', 
                                        color: row.isActive ? '#2e7d32' : '#757575',
                                        fontWeight: 700, 
                                        fontSize: '0.85rem' 
                                    }}>
                                        <span>{row.isActive ? 'Categoría Activa' : 'Categoría Inactiva'}</span>
                                        <div className="switch" style={{ display: 'flex', alignItems: 'center' }}>
                                            <input type="checkbox" checked={row.isActive} onChange={(e) => toggleCategoryState(row.category, e.target.checked)} />
                                            <span className="lever" style={{ margin: 0 }}></span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Agregar Nueva Categoría */}
                    <div className="card admin-card" style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', marginTop: '24px', borderRadius: '12px', boxShadow: 'none' }}>
                        <div className="modal-form-section" style={{ margin: 0, padding: '24px' }}>
                            <p className="select-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '16px', color: '#334155', fontSize: '0.9rem' }}>
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
                    </div>

                    {/* Acciones */}
                    <div className="admin-modal-actions" style={{ marginTop: '40px', display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button className="admin-modal-btn-cancel" type="button" onClick={() => navigate(-1)} style={{ margin: 0, minWidth: '140px', flex: '1 1 auto' }}>
                            <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: '8px' }} />
                            Volver
                        </button>
                        <button
                            className="admin-modal-btn-submit"
                            type="button"
                            onClick={handleSavePoints}
                            disabled={!hasChanges || saving}
                            style={{ 
                                background: hasChanges ? '#1565c0' : '#94a3b8', 
                                borderColor: hasChanges ? '#1565c0' : '#94a3b8',
                                margin: 0,
                                minWidth: '140px',
                                flex: '1 1 auto'
                            }}
                        >
                            <FontAwesomeIcon icon={faSave} style={{ marginRight: '8px' }} />
                            {saving ? 'Guardando...' : 'Actualizar'}
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default AdminCategoriesPlayer;
