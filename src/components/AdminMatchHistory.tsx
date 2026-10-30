import { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { DateTime } from 'luxon';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { getTokenFromLocalStorage } from '../utils/tokenUtils';
import { LoadingSpinner } from './LoadingSpinner';

interface HistoryMatch {
    idCourtReserve: string;
    court: string;
    dateToPlay: string;
    turn: string;
    isDouble: boolean;
    isForRanking?: boolean;
    players: string[];
    status: 'RECORDED' | 'EXPIRED' | 'CURRENT' | 'AWAITING_RESULT' | 'REVIEW_REQUIRED' | 'CANCELLED' | 'UNCONFIRMED' | 'FINISHED';
    result: { score: string | null; winners: string[] } | null;
}
interface HistoryPage {
    matches: HistoryMatch[];
    member: { name: string; email: string };
    total: number;
    page: number;
    totalPages: number;
}
const statusLabel = {
    RECORDED: 'Con resultado',
    EXPIRED: 'Vencido sin resultado',
    CURRENT: 'Vigente',
    AWAITING_RESULT: 'Esperando resultado',
    REVIEW_REQUIRED: 'Datos por revisar',
    CANCELLED: 'Cancelada',
    UNCONFIRMED: 'Sin confirmar',
    FINISHED: 'Finalizado',
};

export default function AdminMatchHistory({ playerEmail }: { playerEmail: string }) {
    const today = DateTime.now().setZone('America/Santiago').toISODate()!;
    const [from, setFrom] = useState(() => DateTime.fromISO(today).minus({ days: 29 }).toISODate()!);
    const [to, setTo] = useState('');
    const [request, setRequest] = useState(() => ({ from, to, page: 1 }));
    const [history, setHistory] = useState<HistoryPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const apiUrl = import.meta.env.VITE_API_URL;
    const token = getTokenFromLocalStorage();

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setHistory(null);
        setError(false);
        void axios.get<HistoryPage>(`${apiUrl}/match-ranking/admin/history`, {
            params: { playerEmail, ...request, to: request.to || undefined },
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
        }).then(({ data }) => {
            if (controller.signal.aborted) return;
            if (!Array.isArray(data?.matches)) throw new Error('Invalid history');
            setHistory(data);
        }).catch((failure: unknown) => {
            if (controller.signal.aborted || axios.isCancel(failure)) return;
            setError(true);
            const message: unknown = axios.isAxiosError(failure) ? failure.response?.data?.message : null;
            void Swal.fire({
                icon: 'error', title: 'No pudimos cargar el historial',
                text: typeof message === 'string' ? message : 'Intenta consultar nuevamente.',
                confirmButtonText: 'Entendido', allowOutsideClick: false,
            });
        }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [apiUrl, token, playerEmail, request]);

    const search = async () => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !DateTime.fromISO(from).isValid
            || (to !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(to) || !DateTime.fromISO(to).isValid || from > to))) {
            await Swal.fire({ icon: 'warning', title: 'Revisa las fechas', text: 'Selecciona un rango válido.', confirmButtonText: 'Entendido' });
            return;
        }
        setRequest({ from, to, page: 1 });
    };

    return (
        <section aria-label="Historial de partidos" aria-busy={loading}>
            <form className="results-history-filters" noValidate onSubmit={event => { event.preventDefault(); void search(); }}>
                <label htmlFor="history-from">Desde<input id="history-from" type="date" value={from} onChange={event => setFrom(event.target.value)} disabled={loading} /></label>
                <label htmlFor="history-to">Hasta<input id="history-to" type="date" value={to} onChange={event => setTo(event.target.value)} disabled={loading} /></label>
                <button type="submit" className="results-primary" disabled={loading}><FontAwesomeIcon icon={faMagnifyingGlass} /> Consultar</button>
            </form>
            {loading && <div className="results-empty"><LoadingSpinner size={64} /></div>}
            {error && <button type="button" className="results-secondary" onClick={() => setRequest({ ...request })}>Reintentar consulta</button>}
            {history && <>
                <p className="results-history-summary">{history.total} {history.total === 1 ? 'partido' : 'partidos'} · Solo lectura</p>
                {history.matches.length === 0 && <div className="results-empty"><h2>Sin partidos en este período</h2></div>}
                <div className="results-queue">
                    {history.matches.map(match => <section className="results-match results-history-match" key={match.idCourtReserve}>
                        <div className="results-history-heading">
                            <h2>{DateTime.fromISO(match.dateToPlay.slice(0, 10)).setLocale('es').toFormat('dd LLL yyyy')}</h2>
                            <span className={`results-status results-status--${match.status.toLowerCase()}`}>{statusLabel[match.status] ?? 'Datos por revisar'}</span>
                        </div>
                        <p className="results-history-meta">{match.turn} · Cancha {match.court.replace(/^Cancha\s*/i, '')} · {match.isDouble ? 'Dobles' : 'Singles'} · {match.isForRanking === false ? 'No ranking' : 'Ranking'}</p>
                        <div className="results-teams">
                            {[0, 1].map(side => {
                                const size = match.isDouble ? 2 : 1;
                                return <div className="results-team" key={side}>
                                    <span className="results-team-label">{match.isDouble ? 'Team' : 'Player'} {side + 1}</span>
                                    {match.players.slice(side * size, (side + 1) * size).map((name, index) => <div className="results-player" key={index}><strong>{name}</strong></div>)}
                                </div>;
                            })}
                        </div>
                        {match.result && <div className="results-recorded-result">
                            <span>Marcador</span><strong>{match.result?.score || 'Detalle no disponible'}</strong>
                            {Boolean(match.result?.winners.length) && <p>{match.isDouble ? 'Ganadores' : 'Ganador'}: {match.result!.winners.join(' y ')}</p>}
                        </div>}
                    </section>)}
                </div>
                {history.totalPages > 1 && <nav className="results-history-pagination" aria-label="Páginas del historial">
                    <button type="button" className="results-secondary" title="Página anterior" aria-label="Página anterior" disabled={loading || history.page <= 1} onClick={() => setRequest({ ...request, page: history.page - 1 })}><FontAwesomeIcon icon={faArrowLeft} /></button>
                    <span>Página {history.page} de {history.totalPages}</span>
                    <button type="button" className="results-secondary" title="Página siguiente" aria-label="Página siguiente" disabled={loading || history.page >= history.totalPages} onClick={() => setRequest({ ...request, page: history.page + 1 })}><FontAwesomeIcon icon={faArrowRight} /></button>
                </nav>}
            </>}
        </section>
    );
}
