import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import logger from '../utils/logger';
import AppLoader from './AppLoader';
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
                const response = await axios.get<Record<string, RankingPlayer[]>>(
                    `${apiUrl}/match-ranking/ranking`,
                );
                const sortedCategories = Object.keys(response.data)
                    .filter((category) => category.toLowerCase() !== 'menores')
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
                logger.error('Error fetching rankings:', err);
                setError('No se pudo cargar el ranking. Inténtalo de nuevo más tarde.');
            } finally {
                setLoading(false);
            }
        };

        fetchRankings();
    }, [apiUrl]);

    if (loading) {
        return <AppLoader text="Cargando Escalerilla..." />;
    }

    if (error) {
        return (
            <main className="ranking-wrapper">
                <h1 className="ranking-main-title">Escalerilla CTQ</h1>
                <p className="ranking-error" role="alert">
                    {error}
                </p>
            </main>
        );
    }

    return (
        <main className="ranking-wrapper">
            <header className="ranking-header-section">
                <h1 className="ranking-main-title">
                    <FontAwesomeIcon icon={faTrophy} className="title-icon" />
                    Escalerilla <span>CTQ</span>
                </h1>
                <span className="ranking-category-count">
                    {Object.keys(rankings || {}).length} categorías
                </span>
            </header>

            <div className="ranking-layout">
                <nav className="categories-grid" aria-label="Categorías del ranking">
                    {rankings &&
                        Object.keys(rankings).map((category) => (
                            <button
                                type="button"
                                key={category}
                                className={`category-card ${activeCategory === category ? 'active' : ''}`}
                                aria-expanded={activeCategory === category}
                                aria-controls="ranking-category-panel"
                                onClick={() =>
                                    setActiveCategory(activeCategory === category ? null : category)
                                }
                            >
                                <span className="category-header">
                                    <span className="category-info">
                                        <span className="category-name">{category}</span>
                                        <span className="category-label">
                                            {rankings[category].length} jugadores
                                        </span>
                                    </span>
                                    <FontAwesomeIcon
                                        icon={
                                            activeCategory === category
                                                ? faChevronUp
                                                : faChevronDown
                                        }
                                        className="toggle-icon"
                                    />
                                </span>
                            </button>
                        ))}
                </nav>
                <section
                    id="ranking-category-panel"
                    className="ranking-panel"
                    aria-labelledby="ranking-category-title"
                >
                    <header className="ranking-panel-header">
                        <h2 id="ranking-category-title">
                            {activeCategory || 'Sin categoría seleccionada'}
                        </h2>
                        {activeCategory && (
                            <span>{rankings?.[activeCategory].length} jugadores</span>
                        )}
                    </header>
                    {activeCategory && rankings?.[activeCategory].length ? (
                        <table
                            className="ranking-table"
                            aria-label={`Ranking de ${activeCategory}`}
                        >
                            <colgroup>
                                <col className="ranking-position" />
                                <col className="ranking-avatar-column" />
                                <col />
                                <col className="ranking-points" />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th scope="col" className="ranking-position">
                                        Pos.
                                    </th>
                                    <th scope="col" colSpan={2}>
                                        Jugador
                                    </th>
                                    <th scope="col" className="ranking-points">
                                        Puntos
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rankings[activeCategory].map((player) => (
                                    <tr
                                        key={player.id}
                                        className={`player-row ${player.rank <= 8 ? 'master-zone' : ''}`}
                                    >
                                        <td className="rank-indicator">
                                            <span className="rank-number">{player.rank}</span>
                                        </td>
                                        <td className="ranking-avatar-cell">
                                            <div className="player-avatar-wrapper">
                                                <img
                                                    src={
                                                        player.imageUrlProfile ||
                                                        '/images/avatar-fantasma.png'
                                                    }
                                                    alt=""
                                                    className="player-avatar"
                                                    onError={(event) => {
                                                        const fallback =
                                                            '/images/avatar-fantasma.png';
                                                        if (
                                                            !event.currentTarget.src.endsWith(
                                                                fallback,
                                                            )
                                                        )
                                                            event.currentTarget.src = fallback;
                                                    }}
                                                />
                                                {player.rank <= 8 && (
                                                    <span
                                                        className="master-badge"
                                                        title="Zona Masters"
                                                        aria-label="Zona Masters"
                                                    >
                                                        M
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <th scope="row" className="player-info">
                                            <span className="player-name">{player.nombre}</span>
                                        </th>
                                        <td className="player-score">
                                            <span className="points-value">
                                                {player.puntos.toLocaleString('es-CL')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="ranking-empty">
                            {activeCategory
                                ? 'Sin jugadores en esta categoría.'
                                : Object.keys(rankings || {}).length
                                  ? 'Sin categoría seleccionada.'
                                  : 'No hay categorías disponibles.'}
                        </p>
                    )}
                </section>
            </div>
        </main>
    );
};

export default Ranking;
