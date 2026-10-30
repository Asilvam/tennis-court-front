import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { DateTime } from 'luxon';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRotateRight, faCheck, faLock, faPen } from '@fortawesome/free-solid-svg-icons';
import { getTokenFromLocalStorage } from '../utils/tokenUtils';
import { confirmDiscardCategoryChanges } from '../utils/categoryConfirmation';
import { useUnsavedEditorChanges } from '../hooks/useUnsavedCategoryChanges';
import { LoadingSpinner } from './LoadingSpinner';
import { getUserInfoFromLocalStorage } from '../utils/userUtils';
import AdminMatchHistory from './AdminMatchHistory';
import '../styles/MatchResult.css';

interface Player {
    name: string;
    email: string;
    category: string | null;
    points: number | null;
}
interface PendingMatch {
    idCourtReserve: string;
    court: string;
    dateToPlay: string;
    turn: string;
    isDouble: boolean;
    isForRanking?: boolean;
    readOnly?: boolean;
    phase?: 'CURRENT' | 'AWAITING_RESULT' | 'RECORDED' | 'EXPIRED' | 'CANCELLED' | 'UNCONFIRMED' | 'FINISHED' | 'REVIEW_REQUIRED';
    rankingResultStatus?: 'PENDING' | 'RECORDED' | 'EXPIRED';
    players: Player[];
    canRegister: boolean;
    blockedCode: string | null;
    blockedReason: string | null;
    result?: { score: string | null; winners: string[] } | null;
}
interface Queue {
    matches: PendingMatch[];
    member: { name: string; email: string };
    totalPending: number;
    serverNow?: string;
}
interface PointChange {
    name: string;
    category: string;
    delta: number;
    after: number;
}
const scorePattern = /^\d{1,2}[:-]\d{1,2}(?:\(\d{1,2}\))?(?:,\s*\d{1,2}[:-]\d{1,2}(?:\(\d{1,2}\))?){0,2}$/;
const categoryLabel = (category: string | null) =>
    ({ '1': 'Primera', '2': 'Segunda', '3': 'Tercera', '4': 'Cuarta' }[category ?? ''] ?? category ?? 'Categoría por revisar');
const canEnterResult = (match: PendingMatch) => match.canRegister && match.isForRanking !== false
    && !match.readOnly && !match.result
    && !['RECORDED', 'EXPIRED', 'CANCELLED', 'UNCONFIRMED', 'FINISHED', 'REVIEW_REQUIRED'].includes(match.phase ?? '');

function errorMessage(error: unknown) {
    if (axios.isAxiosError(error)) {
        const message: unknown = error.response?.data?.message;
        if (Array.isArray(message)) return message.join(' ');
        if (typeof message === 'string') return message;
    }
    return 'No pudimos conectar con el servidor. Tu resultado no se ha descartado.';
}

const showNotice = (title: string, text: string, icon: 'info' | 'warning' | 'error' = 'info') =>
    Swal.fire({ title, text, icon, confirmButtonText: 'Entendido', allowOutsideClick: false });

export default function MatchResultUpdate() {
    const [params] = useSearchParams();
    const playerEmail = params.get('email') || '';
    const navigate = useNavigate();
    const location = useLocation();
    const adminReview = getUserInfoFromLocalStorage()?.role === 'admin' && Boolean(playerEmail);
    const [view, setView] = useState<'current' | 'history'>('current');
    const apiUrl = import.meta.env.VITE_API_URL;
    const token = getTokenFromLocalStorage();
    const [queue, setQueue] = useState<Queue | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [score, setScore] = useState('');
    const [winnerSide, setWinnerSide] = useState<'A' | 'B' | ''>('');
    const [saving, setSaving] = useState(false);
    const busy = useRef(false);
    const lastLoadError = useRef('');
    const input = useRef<HTMLInputElement>(null);
    const dirty = editingId !== null && (score !== '' || winnerSide !== '');
    useUnsavedEditorChanges(dirty, saving, 'match-result');

    useEffect(() => {
        if (adminReview) window.scrollTo({ top: 0, behavior: 'instant' });
    }, [adminReview, playerEmail]);

    const load = useCallback(async (signal?: AbortSignal, notify = true): Promise<string | null> => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get<Queue>(`${apiUrl}/match-ranking/pending`, {
                params: playerEmail ? { playerEmail } : undefined,
                headers: { Authorization: `Bearer ${token}` },
                signal,
            });
            if (!response.data || !Array.isArray(response.data.matches)) throw new Error('Invalid queue');
            const now = response.data.serverNow ? DateTime.fromISO(response.data.serverNow).setZone('America/Santiago') : DateTime.now().setZone('America/Santiago');
            const oldestDay = now.startOf('day').minus({ days: 2 });
            setQueue({ ...response.data, matches: response.data.matches.filter(match =>
                DateTime.fromISO(match.dateToPlay.slice(0, 10), { zone: 'America/Santiago' }) >= oldestDay
                && match.isForRanking !== false && !match.readOnly
                && !['CANCELLED', 'UNCONFIRMED', 'FINISHED'].includes(match.phase ?? '')
                && match.phase !== 'EXPIRED' && match.rankingResultStatus !== 'EXPIRED'
                && match.blockedCode !== 'RESULT_DEADLINE_EXPIRED') });
            lastLoadError.current = '';
            return null;
        } catch (failure) {
            if (axios.isCancel(failure) || signal?.aborted) return null;
            const message = errorMessage(failure);
            setError(message);
            if (notify && message !== lastLoadError.current && !Swal.isVisible()) {
                await showNotice('No pudimos cargar los partidos', message, 'error');
            }
            lastLoadError.current = message;
            return message;
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [apiUrl, playerEmail, token]);

    useEffect(() => {
        setQueue(null);
        setEditingId(null);
        setScore('');
        setWinnerSide('');
        lastLoadError.current = '';
        const controller = new AbortController();
        void load(controller.signal);
        return () => controller.abort();
    }, [load]);

    useEffect(() => {
        if (editingId || saving || view === 'history') return;
        const timer = window.setInterval(() => { if (!document.hidden && !Swal.isVisible()) void load(); }, 60000);
        return () => window.clearInterval(timer);
    }, [editingId, saving, load, view]);

    useEffect(() => {
        if (editingId) input.current?.focus({ preventScroll: true });
    }, [editingId]);

    const resetEditor = () => {
        setEditingId(null);
        setScore('');
        setWinnerSide('');
    };
    const refresh = async () => {
        if (busy.current || (dirty && !(await confirmDiscardCategoryChanges('reload', 'match-result')))) return;
        resetEditor();
        lastLoadError.current = '';
        await load();
    };
    const cancel = async () => {
        if (busy.current || (dirty && !(await confirmDiscardCategoryChanges('leave', 'match-result')))) return;
        resetEditor();
    };
    const changeView = async (next: 'current' | 'history') => {
        if (view === next) return true;
        if (busy.current || (dirty && !(await confirmDiscardCategoryChanges('leave', 'match-result')))) return false;
        resetEditor();
        setView(next);
        if (next === 'current') void load();
        return true;
    };
    const goBack = () => {
        if (busy.current) return;
        if (!adminReview) {
            if (typeof window.history.state?.idx === 'number' && window.history.state.idx > 0) navigate(-1);
            else navigate('/dashboard', { replace: true });
            return;
        }
        const origin = location.state as { returnTo?: unknown; returnScrollY?: unknown } | null;
        const returnTo = typeof origin?.returnTo === 'string' && /^\/adminregister(?:\?|$)/.test(origin.returnTo)
            ? origin.returnTo : '/adminregister';
        navigate(returnTo, { state: { adminUsersScrollY: origin?.returnScrollY } });
    };

    const save = async (match: PendingMatch) => {
        if (busy.current || !winnerSide || !scorePattern.test(score.trim()) || !canEnterResult(match)) return;
        busy.current = true;
        setSaving(true);
        const size = match.isDouble ? 2 : 1;
        const winners = match.players.slice(winnerSide === 'A' ? 0 : size, winnerSide === 'A' ? size : size * 2);
        try {
            const confirmation = await Swal.fire({
                icon: 'question',
                title: 'Confirmar resultado',
                text: `${winners.map(player => player.name).join(' y ')} gana. Marcador: ${score.trim()}. Se actualizarán los puntos de ambos ${match.isDouble ? 'equipos' : 'jugadores'}.`,
                showCancelButton: true,
                confirmButtonText: 'Guardar resultado',
                cancelButtonText: 'Revisar',
                focusCancel: true,
                allowOutsideClick: false,
            });
            if (!confirmation.isConfirmed) return;
            const { data } = await axios.post<{ pointChanges: PointChange[] }>(`${apiUrl}/match-ranking`, {
                matchId: match.idCourtReserve,
                result: score.trim(),
                winnerSide,
            }, { headers: { Authorization: `Bearer ${token}` } });
            resetEditor();
            const reloadError = await load(undefined, false);
            await Swal.fire({
                icon: 'success',
                title: 'Resultado guardado',
                text: (data.pointChanges?.map(change => `${change.name}: ${change.delta >= 0 ? '+' : ''}${change.delta} → ${change.after} pts (${categoryLabel(change.category)})`).join('\n') || 'Los puntos fueron actualizados.') +
                    (reloadError ? '\nEl resultado se guardó, pero no pudimos actualizar la lista de pendientes. Vuelve a actualizarla.' : ''),
                confirmButtonText: 'Entendido',
                allowOutsideClick: false,
            });
        } catch (failure) {
            const alreadySaved = axios.isAxiosError(failure) && failure.response?.data?.code === 'RESULT_ALREADY_REGISTERED';
            const expired = axios.isAxiosError(failure) && failure.response?.data?.code === 'RESULT_DEADLINE_EXPIRED';
            if (alreadySaved || expired) resetEditor();
            await Swal.fire({
                icon: alreadySaved || expired ? 'info' : 'error',
                title: expired ? 'Partido vencido · Sin puntos' : alreadySaved ? 'Resultado ya registrado' : 'No se guardó el resultado',
                text: errorMessage(failure),
                confirmButtonText: 'Entendido',
                allowOutsideClick: false,
            });
            if (axios.isAxiosError(failure) && failure.response?.status === 409) await load(undefined, false);
        } finally {
            busy.current = false;
            setSaving(false);
        }
    };

    return (
        <main className="results-page" aria-busy={loading || saving}>
            <button type="button" className="results-back results-secondary" onClick={goBack} disabled={saving}>
                <FontAwesomeIcon icon={faArrowLeft} /> {adminReview ? 'Volver a socios' : 'Volver'}
            </button>
            <header className="results-header">
                <div>
                    <p className="results-eyebrow">{adminReview ? 'CTQ · Partidos' : 'CTQ · Ranking'}</p>
                    <h1>{adminReview ? 'Partidos del socio' : 'Resultados'}</h1>
                    {(queue || adminReview) && <p className="results-member">{queue?.member.name || playerEmail}</p>}
                </div>
                {view === 'current' && <button type="button" className="results-refresh" onClick={() => void refresh()} disabled={loading || saving} aria-label="Actualizar pendientes" title="Actualizar pendientes">
                    <FontAwesomeIcon icon={faArrowRotateRight} />
                </button>}
            </header>
            {adminReview && <div className="results-tabs" role="tablist" aria-label="Vistas de partidos del socio">
                {(['current', 'history'] as const).map(tab => <button key={tab} id={`results-tab-${tab}`} type="button" role="tab" aria-selected={view === tab} aria-controls={`results-panel-${tab}`} tabIndex={view === tab ? 0 : -1} disabled={saving}
                    onClick={() => void changeView(tab)} onKeyDown={event => {
                        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                            event.preventDefault();
                            const next = event.key === 'Home' ? 'current' : event.key === 'End' ? 'history' : tab === 'current' ? 'history' : 'current';
                            void changeView(next).then(changed => document.getElementById(`results-tab-${changed ? next : view}`)?.focus());
                        }
                    }}>{tab === 'current' ? 'Partidos' : 'Historial'}</button>)}
            </div>}
            {adminReview && view === 'history' ? <div id="results-panel-history" role="tabpanel" aria-labelledby="results-tab-history">
                <AdminMatchHistory key={playerEmail} playerEmail={playerEmail} />
            </div> : <div id="results-panel-current" role={adminReview ? 'tabpanel' : undefined} aria-labelledby={adminReview ? 'results-tab-current' : undefined}>
            {!adminReview && <p className="results-rule">Partidos vigentes, hasta dos días atrás. Resultados pendientes en orden.</p>}
            {error && <button type="button" className="results-secondary results-message-action" onClick={() => void showNotice('No pudimos cargar los partidos', error, 'error')} disabled={saving}>Ver error de carga</button>}
            {loading && !queue && <div className="results-empty"><LoadingSpinner size={64} /></div>}
            {queue && queue.matches.length === 0 && <section className="results-empty"><FontAwesomeIcon icon={faCheck} /><h2>Sin partidos en esta ventana</h2></section>}
            <div className="results-queue">
                {queue?.matches.map((match, index) => {
                    const editing = editingId === match.idCourtReserve;
                    const recorded = match.phase === 'RECORDED' || Boolean(match.result);
                    const firstPending = queue.matches.findIndex(row => row.isForRanking !== false && !row.readOnly && row.phase !== 'RECORDED' && !row.result);
                    const size = match.isDouble ? 2 : 1;
                    const allowed = canEnterResult(match);
                    const date = DateTime.fromISO(match.dateToPlay.slice(0, 10)).setLocale('es').toFormat('dd LLL yyyy');
                    const sideName = (side: 'A' | 'B') => match.players.slice(side === 'A' ? 0 : size, side === 'A' ? size : size * 2).map(player => player.name).join(' y ');
                    const sideLabel = (side: 'A' | 'B') => `${match.isDouble ? 'Team' : 'Player'} ${side === 'A' ? 1 : 2}`;
                    return (
                        <section className={`results-match ${recorded ? 'results-match--recorded' : index === firstPending ? 'results-match--first' : ''}`} key={match.idCourtReserve} aria-labelledby={`match-title-${index}`}>
                            <div className="results-match-heading">
                                <span className="results-order">{recorded ? <FontAwesomeIcon icon={faCheck} /> : index + 1}</span>
                                <div>
                                    <h2 id={`match-title-${index}`}>{recorded ? 'Resultado registrado' : match.phase === 'CURRENT' || match.blockedCode === 'MATCH_NOT_FINISHED' ? 'Partido vigente' : index === firstPending ? 'Esperando resultado' : 'Siguiente partido'}</h2>
                                    <p>{date} · {match.turn} · Cancha {match.court.replace(/^Cancha\s*/i, '')} · {match.isDouble ? 'Dobles' : 'Singles'}{adminReview ? ` · ${match.isForRanking === false ? 'No ranking' : 'Ranking'}` : ''}</p>
                                </div>
                                {!allowed && !recorded && !match.readOnly && <FontAwesomeIcon icon={faLock} className="results-lock" title="Resultado bloqueado" />}
                            </div>
                            <div className="results-teams">
                                {(['A', 'B'] as const).map(side => <div className="results-team" key={side}>
                                    <span className="results-team-label">{sideLabel(side)}</span>
                                    {match.players.slice(side === 'A' ? 0 : size, side === 'A' ? size : size * 2).map(player => <div className="results-player" key={player.name}>
                                        <strong>{player.name}</strong>
                                        {!match.readOnly && match.isForRanking !== false && <span>{recorded && !player.category ? 'Categoría no disponible' : categoryLabel(player.category)} · {player.points === null ? recorded ? 'Puntos no disponibles' : 'Puntos por revisar' : `${player.points} pts${recorded ? ' al registrar' : ''}`}</span>}
                                    </div>)}
                                </div>)}
                            </div>
                            {recorded && <div className="results-recorded-result">
                                <span>Marcador</span>
                                <strong>{match.result?.score || 'Detalle no disponible'}</strong>
                                {Boolean(match.result?.winners?.length) && <p>{match.isDouble ? 'Ganadores' : 'Ganador'}: {match.result!.winners.join(' y ')}</p>}
                                <button type="button" className="results-secondary" disabled><FontAwesomeIcon icon={faCheck} /> Resultado ingresado</button>
                            </div>}
                            {!recorded && !match.readOnly && match.blockedReason && <button type="button" className="results-secondary results-message-action" disabled={saving} onClick={() => void showNotice('Resultado bloqueado', match.blockedReason!, match.blockedCode === 'RESULT_DEADLINE_EXPIRED' ? 'warning' : 'info')}>
                                <FontAwesomeIcon icon={faLock} /> Ver motivo del bloqueo
                            </button>}
                            {allowed && !editing && <button type="button" className="results-primary" disabled={saving || loading || editingId !== null} onClick={() => setEditingId(match.idCourtReserve)}>
                                <FontAwesomeIcon icon={faPen} /> Ingresar resultado
                            </button>}
                            {editing && !recorded && <form className="results-editor" onSubmit={event => { event.preventDefault(); void save(match); }}>
                                <label htmlFor="match-score">Marcador por sets</label>
                                <input id="match-score" ref={input} type="text" maxLength={64} placeholder="6:4, 6:3" value={score} onChange={event => setScore(event.target.value)} autoComplete="off" disabled={saving} aria-invalid={score !== '' && !scorePattern.test(score.trim())} />
                                {score !== '' && !scorePattern.test(score.trim()) && <button type="button" className="results-secondary results-message-action" disabled={saving} onClick={() => void showNotice('Marcador inválido', 'Ingresa los sets separados por coma, por ejemplo 6:4, 6:3.', 'warning').then(() => input.current?.focus({ preventScroll: true }))}>Revisar marcador</button>}
                                <fieldset disabled={saving}>
                                    <legend>{match.isDouble ? 'Equipo ganador' : 'Jugador ganador'}</legend>
                                    <div className="results-winner-options">
                                        {(['A', 'B'] as const).map(side => <label key={side} className={winnerSide === side ? 'is-selected' : ''}>
                                            <input type="radio" name="winner" value={side} checked={winnerSide === side} onChange={() => setWinnerSide(side)} />
                                            <span><strong>{sideLabel(side)}</strong>{sideName(side)}</span>
                                        </label>)}
                                    </div>
                                </fieldset>
                                <div className="results-editor-actions">
                                    <button type="button" className="results-secondary" onClick={() => void cancel()} disabled={saving}>Cancelar</button>
                                    <button type="submit" className="results-primary" disabled={saving || loading || !allowed || !winnerSide || !scorePattern.test(score.trim())}>
                                        {saving ? <LoadingSpinner size={24} label="Guardando resultado" /> : <FontAwesomeIcon icon={faCheck} />} {saving ? 'Guardando…' : 'Guardar resultado'}
                                    </button>
                                </div>
                            </form>}
                        </section>
                    );
                })}
            </div>
            </div>}
        </main>
    );
}
