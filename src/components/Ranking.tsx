import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import M from 'materialize-css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faTrophy } from '@fortawesome/free-solid-svg-icons';
import logger from '../utils/logger';
import '../styles/Ranking.css';

interface RankingPlayer {
    id: string;
    nombre: string;
    puntos: number;
    categoria: string;
    rank: number;
    profileImageUrl?: string;
}

const Ranking: React.FC = () => {
    const [rankings, setRankings] = useState<Record<string, RankingPlayer[]> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const collapsibleRef = useRef<HTMLUListElement>(null);

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const fetchRankings = async () => {
            try {
                const response = await axios.get<Record<string, RankingPlayer[]>>(`${apiUrl}/match-ranking/ranking`);
                // Ordenar las categorías numéricamente y luego las demás
                const sortedCategories = Object.keys(response.data)
                    .filter(category => category.toLowerCase() !== 'menores') // Excluir la categoría "Menores"
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
            } catch (err) {
                logger.error("Error fetching rankings:", err);
                setError("No se pudo cargar el ranking. Inténtalo de nuevo más tarde.");
            } finally {
                setLoading(false);
            }
        };

        fetchRankings();
    }, [apiUrl]);

    useEffect(() => {
        // Inicializar el collapsible de Materialize una vez que los datos están cargados
        if (rankings && collapsibleRef.current) {
            M.Collapsible.init(collapsibleRef.current);
        }
    }, [rankings]);

    if (loading) {
        return <div className="container center-align" style={{ padding: "50px" }}><FontAwesomeIcon icon={faSpinner} spin size="3x" /></div>;
    }

    if (error) {
        return <div className="container center-align red-text" style={{ padding: "50px" }}>{error}</div>;
    }

    return (
        <div className="container ranking-container">
            <h4><FontAwesomeIcon icon={faTrophy} /> Escalerilla CTQ</h4>
            <ul className="collapsible popout" ref={collapsibleRef}>
                {rankings && Object.keys(rankings).map((category, index) => (
                    <li key={category}>
                        <div className={`collapsible-header ${index === 0 ? 'active' : ''}`}>
                             Categoria {category}
                        </div>
                        <div className="collapsible-body">
                            <table className="striped highlight responsive-table ranking-table">
                                <thead>
                                <tr>
                                    <th className="center-align">Rank</th>
                                    <th className="center-align"></th>
                                    <th colSpan={2}>Jugador</th>
                                    <th className="center-align">Puntos</th>
                                </tr>
                                </thead>
                                <tbody>
                                {rankings[category].map((player) => (
                                    <tr key={player.id} className={player.rank <= 8 ? 'top-player-row' : ''}>
                                        <td className="center-align rank-cell">{player.rank}</td>
                                        <td className="avatar-cell">
                                            <img
                                                src={player.profileImageUrl || '/images/avatar-fantasma.png'}
                                                alt={player.nombre}
                                                className="avatar-image"
                                            />
                                        </td>
                                        <td className="player-name-cell">{player.nombre}</td>
                                        <td className="center-align points-cell">{player.puntos.toLocaleString('es-CL')}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Ranking;