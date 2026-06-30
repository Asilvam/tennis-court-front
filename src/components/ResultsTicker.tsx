import React from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import '../styles/ResultsTicker.css';

interface Player {
    name?: string;
    email?: string;
}

interface MatchResult {
    _id: string;
    matchId: string;
    result: string;
    winner: Player[];
    looser: Player[];
    createdAt: string;
}

const getNames = (players: Player[]): string =>
    players.map(p => p.name || p.email || '?').join(' / ');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const ResultsTicker: React.FC = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    
    const { data: results = [] } = useQuery<MatchResult[]>({
        queryKey: ['match-ranking'],
        queryFn: async () => {
            const res = await axios.get<MatchResult[]>(`${apiUrl}/match-ranking`);
            const cutoff = Date.now() - SEVEN_DAYS_MS;
            return res.data.filter(r => new Date(r.createdAt).getTime() >= cutoff);
        },
        staleTime: 60000, // 1 minuto
    });

    if (results.length === 0) return null;

    const items = [...results, ...results];
    const duration = Math.max(20, results.length * 4);

    return (
        <div className="rt-wrapper" style={{ '--rt-duration': `${duration}s` } as React.CSSProperties}>
            <span className="rt-label">Resultados</span>
            <div className="rt-track">
                <div className="rt-inner">
                    {items.map((r, i) => (
                        <span key={`${r._id}-${i}`} className="rt-item">
                            🏆 <span className="rt-winner">{getNames(r.winner)}</span>
                            <span className="rt-sep">vs</span>
                            <span className="rt-looser">{getNames(r.looser)}</span>
                            <span className="rt-sep">·</span>
                            <span className="rt-result">{r.result}</span>
                            <span className="rt-sep">|</span>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ResultsTicker;
