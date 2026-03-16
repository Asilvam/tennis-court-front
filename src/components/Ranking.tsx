import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faTrophy, faMedal, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import logger from '../utils/logger';
import '../styles/Ranking.css';

interface RankingPlayer {
    id: string;
    nombre: string;
    puntos: number;
    categoria: string;
    rank: number;
    imageUrlProfile?: string;
}

const Ranking: React.FC = () => {
    const [rankings, setRankings] = useState<Record<string, RankingPlayer[]> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const fetchRankings = async () => {
            try {
                const response = await axios.get<Record<string, RankingPlayer[]>>(`${apiUrl}/match-ranking/ranking`);
                const sortedCategories = Object.keys(response.data)
                    .filter(category => category.toLowerCase() !== 'menores')
                    .sort((a, b) => {
                        const aIsNum = !isNaN(Number(a));
                        const bIsNum = !isNaN(Number(b));
                        if (aIsNum && bIsNum) return Number(a) - Number(b);
                        if (aIsNum) return -1;
                        if (bIsNum) return 1;
                        return a.localeCompare(b);
                    });

                const sortedRankings: Record<string, RankingPlayer[]> = {};
                for (const category of sortedCategories) {
                    sortedRankings[category] = response.data[category];
                }

                setRankings(sortedRankings);
                if (sortedCategories.length > 0) {
                    setActiveCategory(sortedCategories[0]);
                }
            } catch (err) {
                logger.error("Error fetching rankings:", err);
                setError("No se pudo cargar el ranking. Inténtalo de nuevo más tarde.");
            } finally {
                setLoading(false);
            }
        };

        fetchRankings();
    }, [apiUrl]);

    const getMedalColor = (rank: number): string | undefined => {
        if (rank === 1) return '#FFD700'; // Gold
        if (rank === 2) return '#C0C0C0'; // Silver
        if (rank === 3) return '#CD7F32'; // Bronze
        return undefined;
    };

    if (loading) {
        return (
            <div className="center-loader">
                <FontAwesomeIcon icon={faSpinner} spin size="3x" className="blue-text" />
                <p>Cargando Escalerilla...</p>
            </div>
        );
    }

    if (error) {
        return <div className="container center-align red-text glass-card error-container">{error}</div>;
    }

    return (
        <div className="ranking-wrapper">
            <div className="ranking-header-section">
                <h4 className="ranking-main-title">
                    <FontAwesomeIcon icon={faTrophy} className="title-icon" />
                    Escalerilla <span>CTQ</span>
                </h4>
                <p className="ranking-subtitle">Ranking actualizado por categoría</p>
            </div>

            <div className="categories-grid">
                {rankings && Object.keys(rankings).map((category) => (
                    <div
                        key={category}
                        className={`category-card glass-card ${activeCategory === category ? 'active' : ''}`}
                        onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                    >
                        <div className="category-header">
                            <div className="category-info">
                                <span className="category-label">Categoría</span>
                                <h3 className="category-name">{category}</h3>
                            </div>
                            <FontAwesomeIcon
                                icon={activeCategory === category ? faChevronUp : faChevronDown}
                                className="toggle-icon"
                            />
                        </div>

                        {activeCategory === category && (
                            <div className="category-content animate-in">
                                <div className="ranking-list">
                                    {rankings[category].map((player) => {
                                        const medalColor = getMedalColor(player.rank);
                                        return (
                                            <div key={player.id} className={`player-row ${player.rank <= 3 ? 'top-three' : ''}`}>
                                                <div className="rank-indicator">
                                                    {medalColor ? (
                                                        <FontAwesomeIcon icon={faMedal} style={{ color: medalColor }} className="medal-icon" />
                                                    ) : (
                                                        <span className="rank-number">{player.rank}</span>
                                                    )}
                                                </div>

                                                <div className="player-avatar-wrapper">
                                                    <img
                                                        src={player.imageUrlProfile || '/images/avatar-fantasma.png'}
                                                        alt={player.nombre}
                                                        className="player-avatar"
                                                    />
                                                    {player.rank <= 3 && <div className="rank-badge" style={{ backgroundColor: medalColor }}>{player.rank}</div>}
                                                </div>

                                                <div className="player-info">
                                                    <span className="player-name">{player.nombre}</span>
                                                </div>

                                                <div className="player-score">
                                                    <span className="points-value">{player.puntos.toLocaleString('es-CL')}</span>
                                                    <span className="points-label">PTS</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Ranking;