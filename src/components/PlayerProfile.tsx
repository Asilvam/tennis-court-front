import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSpinner,
    faPenToSquare,
    faTrophy,
    faRankingStar,
    faStar,
    faUser,
    faUserGroup,
    faCheckCircle,
    faTimesCircle,
    faCalendarAlt,
} from '@fortawesome/free-solid-svg-icons';
import '../styles/PlayerProfile.css';
import logger from '../utils/logger.ts';
import { getUserInfoFromLocalStorage } from '../utils/userUtils.ts';
import AppLoader from './AppLoader';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface PlayerProfileData {
    namePlayer: string;
    email: string;
    category: string;
    points: number;
    imageUrlProfile?: string;
}

interface RankingPlayer {
    id: string;
    nombre: string;
    puntos: number;
    categoria: string;
    rank: number;
    cellular: string;
}

interface CategoryRank {
    category: string;
    points: number;
    rank: number | string;
    isActive: boolean;
}

interface MatchResult {
    id: string;
    jugadorId: string;
    fecha: string;
    rival: string;
    score: string;
    ganador: boolean;
    isDouble: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatRivalName = (fullName: string): string => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return fullName;
    const firstInitial = parts[0][0].toUpperCase() + '.';
    if (parts.length > 1) {
        const lastName = parts[parts.length - 1];
        return `${firstInitial} ${lastName}`;
    }
    return firstInitial;
};

const formatDate = (dateStr: string): string => {
    try {
        const [year, month, day] = dateStr.split('-');
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
    } catch {
        return dateStr;
    }
};

const isDoublesCategory = (cat: string): boolean =>
    cat.toLowerCase().includes('doble');

// ─── Component ────────────────────────────────────────────────────────────────

const PlayerProfile: React.FC = () => {
    const userInfo = getUserInfoFromLocalStorage();
    const emailPlayer = userInfo?.email || '';
    const apiUrl = import.meta.env.VITE_API_URL;
    const queryClient = useQueryClient();

    // Image state
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>('/images/profile-avatar.png');
    const [uploading, setUploading] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState<'singles' | 'doubles'>('singles');

    // ─── Fetch Queries using React Query ─────────────────────────────────────
    
    const { data: player, isLoading: profileLoading, error: profileError } = useQuery<PlayerProfileData>({
        queryKey: ['profile', emailPlayer],
        queryFn: async () => {
            const res = await axios.get<PlayerProfileData>(`${apiUrl}/register/profile/${emailPlayer}`);
            return res.data;
        },
        staleTime: 30000,
        enabled: !!emailPlayer,
    });

    const { data: rankingData, isLoading: rankingLoading, error: rankingError } = useQuery<Record<string, RankingPlayer[]>>({
        queryKey: ['ranking'],
        queryFn: async () => {
            const res = await axios.get<Record<string, RankingPlayer[]>>(`${apiUrl}/match-ranking/ranking`);
            return res.data;
        },
        staleTime: 30000,
    });

    const { data: matchHistory = [], isLoading: historyLoading, error: historyError } = useQuery<MatchResult[]>({
        queryKey: ['history', emailPlayer],
        queryFn: async () => {
            const res = await axios.get<MatchResult[]>(`${apiUrl}/match-ranking/history/${emailPlayer}`);
            return res.data || [];
        },
        staleTime: 30000,
        enabled: !!emailPlayer,
    });

    // ─── Local State Sync ───────────────────────────────────────────────────

    // Sync imagePreview with player image when loaded
    useEffect(() => {
        if (player?.imageUrlProfile) {
            setImagePreview(player.imageUrlProfile);
        } else {
            setImagePreview('/images/profile-avatar.png');
        }
    }, [player?.imageUrlProfile]);

    // Handle Errors
    useEffect(() => {
        const error = profileError || rankingError || historyError;
        if (error) {
            logger.error('Error fetching player profile data:', error);
            Swal.fire('Error', 'No se pudo cargar la información del perfil.', 'error');
        }
    }, [profileError, rankingError, historyError]);

    // Derived Categories Rank
    const allCategories = useMemo<CategoryRank[]>(() => {
        if (!rankingData) return [];
        const cats: CategoryRank[] = [];

        Object.entries(rankingData).forEach(([categoryName, players]) => {
            const found = players.find(p => p.id === emailPlayer);
            if (found) {
                cats.push({
                    category: categoryName,
                    points: found.puntos,
                    rank: found.rank,
                    isActive: true,
                });
            }
        });
        return cats;
    }, [rankingData, emailPlayer]);

    // Default tab setup on load
    useEffect(() => {
        if (allCategories.length > 0) {
            const hasSingles = allCategories.some(c => !isDoublesCategory(c.category));
            if (!hasSingles) {
                setActiveTab('doubles');
            }
        }
    }, [allCategories]);

    const loading = profileLoading || rankingLoading || historyLoading;

    // ─── Image upload ────────────────────────────────────────────────────────

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleImageUpload = async () => {
        if (!imageFile) {
            Swal.fire('Atención', 'Por favor, selecciona una imagen primero.', 'warning');
            return;
        }
        if (imageFile.size > 10 * 1024 * 1024) {
            Swal.fire('Ohhh', 'Archivo muy grande, máximo 10 mb.', 'error');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('image', imageFile);

        try {
            const cloudinaryResponse = await axios.post(`${apiUrl}/register/profile`, formData);
            const imageUrlProfile: string = cloudinaryResponse.data.imageUrl;

            await axios.patch(`${apiUrl}/register/${emailPlayer}`, { imageUrlProfile });
            
            await queryClient.invalidateQueries({ queryKey: ['profile', emailPlayer] });
            Swal.fire('¡Éxito!', 'Tu foto de perfil ha sido actualizada.', 'success');
            setImageFile(null);
        } catch (error) {
            logger.error('Error uploading image:', error);
            Swal.fire('Error', 'Hubo un problema al subir tu imagen. Intenta de nuevo.', 'error');
        } finally {
            setUploading(false);
        }
    };

    // ─── Derived stats ───────────────────────────────────────────────────────

    const singlesCategories = allCategories.filter(c => !isDoublesCategory(c.category));
    const doublesCategories = allCategories.filter(c => isDoublesCategory(c.category));
    const activeCategories = activeTab === 'singles' ? singlesCategories : doublesCategories;

    const filteredHistory = matchHistory.filter(m =>
        activeTab === 'singles' ? !m.isDouble : m.isDouble
    );
    const played = filteredHistory.length;
    const won = filteredHistory.filter(m => m.ganador).length;
    const lost = played - won;
    const winRate = played > 0 ? Math.round((won / played) * 100) : 0;

    // ─── Render ──────────────────────────────────────────────────────────────

    if (loading) {
        return <AppLoader text="Cargando perfil..." />;
    }

    if (!player) {
        return <AppLoader text="No se encontró información del jugador." />;
    }

    return (
        <div className="profile-container">
            <div className="profile-card">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="profile-header">
                    <div className="profile-image-wrapper">
                        <img
                            src={imagePreview || '/images/fantasma-avatar.png'}
                            alt="Perfil"
                            className="profile-image"
                        />
                        <label htmlFor="file-upload" className="edit-icon">
                            <FontAwesomeIcon icon={faPenToSquare} />
                        </label>
                        <input
                            id="file-upload"
                            type="file"
                            onChange={handleFileChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                    </div>
                    <div className="profile-header-info">
                        <h2>{player.namePlayer}</h2>
                        <p className="player-email">{player.email}</p>

                        {imageFile && (
                            <button
                                onClick={handleImageUpload}
                                disabled={uploading}
                                className="save-btn"
                            >
                                {uploading
                                    ? <><FontAwesomeIcon icon={faSpinner} spin /> Subiendo...</>
                                    : 'Guardar Foto'}
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Tabs ───────────────────────────────────────────────── */}
                <div className="profile-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'singles' ? 'active' : ''}`}
                        onClick={() => setActiveTab('singles')}
                    >
                        <FontAwesomeIcon icon={faUser} />
                        Singles
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'doubles' ? 'active' : ''}`}
                        onClick={() => setActiveTab('doubles')}
                    >
                        <FontAwesomeIcon icon={faUserGroup} />
                        Dobles
                    </button>
                </div>

                {/* ── Stats ──────────────────────────────────────────────── */}
                <div className="profile-section">
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon-wrapper neutral">
                                <FontAwesomeIcon icon={faCalendarAlt} />
                            </div>
                            <span className="stat-number">{played}</span>
                            <span className="stat-label">Jugados</span>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon-wrapper win">
                                <FontAwesomeIcon icon={faCheckCircle} />
                            </div>
                            <span className="stat-number won">{won}</span>
                            <span className="stat-label">Ganados</span>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon-wrapper loss">
                                <FontAwesomeIcon icon={faTimesCircle} />
                            </div>
                            <span className="stat-number lost">{lost}</span>
                            <span className="stat-label">Perdidos</span>
                        </div>
                    </div>

                    {played > 0 && (
                        <div className="winrate-container">
                            <div className="winrate-header">
                                <span className="winrate-label">Win Rate</span>
                                <span className="winrate-value">{winRate}%</span>
                            </div>
                            <div className="winrate-track">
                                <div
                                    className="winrate-fill"
                                    style={{ width: `${winRate}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Categorías ─────────────────────────────────────────── */}
                <div className="profile-section">
                    <h4 className="section-title">
                        <FontAwesomeIcon icon={faTrophy} />
                        {activeTab === 'singles' ? 'Categorías Singles' : 'Categorías Dobles'}
                    </h4>

                    {activeCategories.length === 0 ? (
                        <p className="empty-state">Sin categorías en este modo.</p>
                    ) : (
                        <div className="pp-categories-grid">
                            {activeCategories.map(cat => (
                                <div key={cat.category} className={`pp-category-card ${cat.isActive ? 'active' : 'inactive'}`}>
                                    <div className="pp-category-name-wrapper">
                                        <span className="pp-category-label-text">Categoría</span>
                                        <div className="pp-category-name">{cat.category}</div>
                                    </div>
                                    <div className="pp-category-stats">
                                        <div className="pp-category-rank">
                                            <FontAwesomeIcon icon={faRankingStar} />
                                            <span className="pp-stat-detail-label">Ranking</span>
                                            <span className="pp-stat-detail-value">#{cat.rank}</span>
                                        </div>
                                        <div className="pp-category-points">
                                            <FontAwesomeIcon icon={faStar} />
                                            <span className="pp-stat-detail-label">Puntos</span>
                                            <span className="pp-stat-detail-value">{cat.points.toLocaleString('es-CL')}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Historial de partidos ──────────────────────────────── */}
                <div className="profile-section">
                    <h4 className="section-title">
                        <FontAwesomeIcon icon={faCalendarAlt} />
                        Historial de Partidos
                    </h4>

                    {filteredHistory.length === 0 ? (
                        <p className="empty-state">Sin partidos registrados.</p>
                    ) : (
                        <div className="match-history-list">
                            {filteredHistory.map(match => (
                                <div key={match.id} className={`match-row ${match.ganador ? 'win' : 'loss'}`}>
                                    <div className="match-date">{formatDate(match.fecha)}</div>
                                    <div className="match-rival">
                                        vs <strong>{formatRivalName(match.rival)}</strong>
                                    </div>
                                    <div className="match-score">
                                        {match.score !== 'N/A' ? match.score : '—'}
                                    </div>
                                    <div className={`match-result-pill ${match.ganador ? 'win' : 'loss'}`}>
                                        {match.ganador ? 'Ganado' : 'Perdido'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default PlayerProfile;
