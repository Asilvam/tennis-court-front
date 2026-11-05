import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';
import logger from '../utils/logger';
import AppLoader from './AppLoader';
import '../styles/MembershipBillingSelect.css';
import '../styles/Ranking.css';

interface RankingPlayer {
    id: string;
    nombre: string;
    puntos: number;
    categoria: string;
    rank: number;
    imageUrlProfile?: string;
}

const categoryNames: Record<string, string> = {
    '1': 'Primera',
    '2': 'Segunda',
    '3': 'Tercera',
    '4': 'Cuarta',
};
const categoryName = (category: string) => categoryNames[category] || category;
const hasMasters = (category: string) => ['1', '2', '3', '4', 'Damas'].includes(category);
const isJuniorCategory = (category: string) => category.startsWith('Menores - ');
const initials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return [parts[0]?.[0], parts.length > 1 ? parts[parts.length - 1][0] : '']
        .join('')
        .toLocaleUpperCase('es-CL');
};

const Ranking: React.FC = () => {
    const [rankings, setRankings] = useState<Record<string, RankingPlayer[]> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [failedAvatars, setFailedAvatars] = useState<Set<string>>(() => new Set());

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

    const categories = Object.keys(rankings || {});
    const categoryGroups = [
        {
            label: 'Categorías',
            items: categories.filter((category) => !isJuniorCategory(category)),
        },
        { label: 'Menores', items: categories.filter(isJuniorCategory) },
    ].filter((group) => group.items.length);
    const mastersCategory = activeCategory !== null && hasMasters(activeCategory);

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
                <div className="ranking-category-picker">
                    <label htmlFor="ranking-category-select">Categoría</label>
                    <Select
                        inputId="ranking-category-select"
                        instanceId="ranking-category"
                        className="ap-select"
                        classNamePrefix="ap-select"
                        classNames={{ menuPortal: () => 'ranking-category-menu' }}
                        theme={(theme) => ({
                            ...theme,
                            spacing: { ...theme.spacing, controlHeight: 48 },
                        })}
                        unstyled
                        isSearchable={false}
                        isDisabled={!categories.length}
                        options={categoryGroups.map((group) => ({
                            label: group.label,
                            options: group.items.map((category) => ({
                                value: category,
                                label: `${categoryName(category).replace(/^Menores - /, '')} · ${rankings?.[category].length} jugadores`,
                            })),
                        }))}
                        value={
                            activeCategory
                                ? {
                                      value: activeCategory,
                                      label: `${categoryName(activeCategory).replace(/^Menores - /, '')} · ${rankings?.[activeCategory].length} jugadores`,
                                  }
                                : null
                        }
                        onChange={(option) => {
                            if (option) setActiveCategory(option.value);
                        }}
                        menuPortalTarget={
                            typeof document !== 'undefined' ? document.body : undefined
                        }
                        menuPosition="fixed"
                        menuPlacement="auto"
                        menuShouldScrollIntoView={false}
                        maxMenuHeight={240}
                        noOptionsMessage={() => 'Sin categorías'}
                        placeholder="Sin categorías"
                    />
                </div>
                <nav className="categories-grid" aria-label="Categorías del ranking">
                    {categoryGroups.map((group) => (
                        <div className="ranking-category-group" key={group.label}>
                            <h2>{group.label}</h2>
                            {group.items.map((category) => (
                                <button
                                    type="button"
                                    key={category}
                                    className={`category-card ${activeCategory === category ? 'active' : ''}`}
                                    aria-pressed={activeCategory === category}
                                    aria-controls="ranking-category-panel"
                                    onClick={() => setActiveCategory(category)}
                                >
                                    <span className="category-header">
                                        <span className="category-info">
                                            <span className="category-name">
                                                {categoryName(category).replace(/^Menores - /, '')}
                                            </span>
                                            <span
                                                className="category-label"
                                                aria-label={`${rankings?.[category].length} jugadores`}
                                            >
                                                {rankings?.[category].length}
                                            </span>
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>
                <section
                    id="ranking-category-panel"
                    className="ranking-panel"
                    aria-labelledby="ranking-category-title"
                >
                    <header className="ranking-panel-header">
                        <h2 id="ranking-category-title">
                            {activeCategory
                                ? categoryName(activeCategory)
                                : 'Sin categoría seleccionada'}
                        </h2>
                        {activeCategory && (
                            <span>{rankings?.[activeCategory].length} jugadores</span>
                        )}
                    </header>
                    {activeCategory && rankings?.[activeCategory].length ? (
                        <>
                            <table
                                className="ranking-table"
                                aria-label={`Ranking de ${categoryName(activeCategory)}`}
                                aria-describedby={
                                    mastersCategory ? 'ranking-master-legend' : undefined
                                }
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
                                            className={`player-row ${player.rank <= 3 ? 'ranking-top-three' : ''} ${mastersCategory && player.rank <= 8 ? 'master-zone' : ''} ${mastersCategory && player.rank === 8 && rankings[activeCategory].some((row) => row.rank > 8) ? 'master-cutoff' : ''}`}
                                        >
                                            <td className="rank-indicator">
                                                <span className="rank-number">{player.rank}</span>
                                            </td>
                                            <td className="ranking-avatar-cell">
                                                <div className="player-avatar-wrapper">
                                                    {player.imageUrlProfile &&
                                                    !player.imageUrlProfile.endsWith(
                                                        '/images/avatar-fantasma.png',
                                                    ) &&
                                                    !failedAvatars.has(player.id) ? (
                                                        <img
                                                            src={player.imageUrlProfile}
                                                            alt=""
                                                            className="player-avatar"
                                                            onError={() => {
                                                                setFailedAvatars((previous) =>
                                                                    new Set(previous).add(
                                                                        player.id,
                                                                    ),
                                                                );
                                                            }}
                                                        />
                                                    ) : (
                                                        <span
                                                            className="player-avatar player-avatar-initials"
                                                            aria-hidden="true"
                                                        >
                                                            {initials(player.nombre)}
                                                        </span>
                                                    )}
                                                    {mastersCategory && player.rank <= 8 && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="master-badge"
                                                                aria-label={`${player.nombre}: en zona de clasificación al Máster`}
                                                                aria-describedby={`ranking-master-tooltip-${player.rank}`}
                                                            >
                                                                M
                                                            </button>
                                                            <span
                                                                className="ranking-master-tooltip"
                                                                id={`ranking-master-tooltip-${player.rank}`}
                                                                role="tooltip"
                                                            >
                                                                En zona de clasificación al Máster
                                                            </span>
                                                        </>
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
                            {mastersCategory && (
                                <p className="ranking-master-legend" id="ranking-master-legend">
                                    <span className="ranking-master-key" aria-hidden="true">
                                        M
                                    </span>
                                    <span>
                                        Los primeros 8 jugadores clasifican al Máster de la
                                        categoría.
                                    </span>
                                </p>
                            )}
                        </>
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
