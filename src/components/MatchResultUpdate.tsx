import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { DateTime } from 'luxon';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRotateRight, faCheck, faLock, faPen, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { getTokenFromLocalStorage } from '../utils/tokenUtils';
import { confirmDiscardCategoryChanges } from '../utils/categoryConfirmation';
import { useUnsavedEditorChanges } from '../hooks/useUnsavedCategoryChanges';
import { LoadingSpinner } from './LoadingSpinner';
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
    phase?: 'CURRENT' | 'AWAITING_RESULT';
    players: Player[];
    canRegister: boolean;
    blockedCode: string | null;
    blockedReason: string | null;
}
interface Queue {
    matches: PendingMatch[];
    member: { name: string; email: string };
    canReviewExpired: boolean;
    totalPending: number;
    hasOverflow: boolean;
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
            setQueue(response.data);
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
        if (editingId || saving) return;
        const timer = window.setInterval(() => { if (!document.hidden && !Swal.isVisible()) void load(); }, 60000);
        return () => window.clearInterval(timer);
    }, [editingId, saving, load]);

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
    const canReview = (match: PendingMatch) =>
        queue?.canReviewExpired === true && match.blockedCode === 'RESULT_DEADLINE_EXPIRED';
    const canSubmit = (match: PendingMatch) => match.canRegister || canReview(match);

    const save = async (match: PendingMatch) => {
        if (busy.current || !winnerSide || !scorePattern.test(score.trim()) || !canSubmit(match)) return;
        busy.current = true;
        setSaving(true);
        const size = match.isDouble ? 2 : 1;
        const winners = match.players.slice(winnerSide === 'A' ? 0 : size, winnerSide === 'A' ? size : size * 2);
        try {
            const confirmation = await Swal.fire({
                icon: canReview(match) ? 'warning' : 'question',
                title: canReview(match) ? 'Autorizar resultado vencido' : 'Confirmar resultado',
                text: `${winners.map(player => player.name).join(' y ')} gana. Marcador: ${score.trim()}. ${canReview(match) ? 'El plazo de dos días venció. Esta autorización administrativa quedará registrada. ' : ''}Se actualizarán los puntos de ambos lados.`,
                showCancelButton: true,
                confirmButtonText: canReview(match) ? 'Autorizar y guardar' : 'Guardar resultado',
                cancelButtonText: 'Revisar',
                focusCancel: true,
                allowOutsideClick: false,
            });
            if (!confirmation.isConfirmed) return;
            const { data } = await axios.post<{ pointChanges: PointChange[] }>(`${apiUrl}/match-ranking`, {
                matchId: match.idCourtReserve,
                result: score.trim(),
                winnerSide,
                ...(canReview(match) ? { allowExpired: true } : {}),
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
            if (alreadySaved) resetEditor();
            await Swal.fire({
                icon: alreadySaved ? 'info' : 'error',
                title: alreadySaved ? 'Resultado ya registrado' : 'No se guardó el resultado',
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
            <header className="results-header">
                <div>
                    <p className="results-eyebrow">CTQ · Ranking</p>
                    <h1>Resultados</h1>
                    {queue && <p className="results-member">{queue.member.name}</p>}
                </div>
                <button type="button" className="results-refresh" onClick={() => void refresh()} disabled={loading || saving} aria-label="Actualizar pendientes" title="Actualizar pendientes">
                    <FontAwesomeIcon icon={faArrowRotateRight} />
                </button>
            </header>
            <p className="results-rule">Primero el partido más antiguo. Hasta dos partidos de ranking por socio.</p>
            {error && <button type="button" className="results-secondary results-message-action" onClick={() => void showNotice('No pudimos cargar los partidos', error, 'error')} disabled={saving}>Ver error de carga</button>}
            {loading && !queue && <div className="results-empty"><LoadingSpinner size={64} /></div>}
            {queue?.hasOverflow && <button type="button" className="results-secondary results-message-action" disabled={saving} onClick={() => void showNotice('Pendientes históricos', `Hay ${queue.totalPending} partidos pendientes anteriores a este límite. Se muestran los dos más antiguos; registra sus resultados en orden o solicita revisión administrativa.`, 'warning')}>Ver pendientes históricos ({queue.totalPending})</button>}
            {queue && queue.matches.length === 0 && <section className="results-empty"><FontAwesomeIcon icon={faCheck} /><h2>Sin resultados pendientes</h2></section>}
            <div className="results-queue">
                {queue?.matches.map((match, index) => {
                    const editing = editingId === match.idCourtReserve;
                    const size = match.isDouble ? 2 : 1;
                    const allowed = canSubmit(match);
                    const date = DateTime.fromISO(match.dateToPlay.slice(0, 10)).setLocale('es').toFormat('dd LLL yyyy');
                    const sideName = (side: 'A' | 'B') => match.players.slice(side === 'A' ? 0 : size, side === 'A' ? size : size * 2).map(player => player.name).join(' y ');
                    return (
                        <section className={`results-match ${index === 0 ? 'results-match--first' : ''}`} key={match.idCourtReserve} aria-labelledby={`match-title-${index}`}>
                            <div className="results-match-heading">
                                <span className="results-order">{index + 1}</span>
                                <div>
                                    <h2 id={`match-title-${index}`}>{match.phase === 'CURRENT' || match.blockedCode === 'MATCH_NOT_FINISHED' ? 'Partido vigente' : index === 0 ? 'Esperando resultado' : 'Siguiente partido'}</h2>
                                    <p>{date} · {match.turn} · Cancha {match.court.replace(/^Cancha\s*/i, '')} · {match.isDouble ? 'Dobles' : 'Singles'}</p>
                                </div>
                                {!match.canRegister && <FontAwesomeIcon icon={faLock} className="results-lock" title="Resultado bloqueado" />}
                            </div>
                            <div className="results-teams">
                                {(['A', 'B'] as const).map(side => <div className="results-team" key={side}>
                                    <span className="results-team-label">Lado {side}</span>
                                    {match.players.slice(side === 'A' ? 0 : size, side === 'A' ? size : size * 2).map(player => <div className="results-player" key={player.email}>
                                        <strong>{player.name}</strong>
                                        <span>{categoryLabel(player.category)} · {player.points === null ? 'Puntos por revisar' : `${player.points} pts`}</span>
                                    </div>)}
                                </div>)}
                            </div>
                            {match.blockedReason && <button type="button" className="results-secondary results-message-action" disabled={saving} onClick={() => void showNotice('Resultado bloqueado', match.blockedReason!, match.blockedCode === 'RESULT_DEADLINE_EXPIRED' ? 'warning' : 'info')}>
                                <FontAwesomeIcon icon={canReview(match) ? faShieldHalved : faLock} /> Ver motivo del bloqueo
                            </button>}
                            {allowed && !editing && <button type="button" className="results-primary" disabled={saving || loading || editingId !== null} onClick={() => setEditingId(match.idCourtReserve)}>
                                <FontAwesomeIcon icon={canReview(match) ? faShieldHalved : faPen} /> {canReview(match) ? 'Revisar resultado vencido' : 'Ingresar resultado'}
                            </button>}
                            {editing && <form className="results-editor" onSubmit={event => { event.preventDefault(); void save(match); }}>
                                <label htmlFor="match-score">Marcador por sets</label>
                                <input id="match-score" ref={input} type="text" maxLength={64} placeholder="6:4, 6:3" value={score} onChange={event => setScore(event.target.value)} autoComplete="off" disabled={saving} aria-invalid={score !== '' && !scorePattern.test(score.trim())} />
                                {score !== '' && !scorePattern.test(score.trim()) && <button type="button" className="results-secondary results-message-action" disabled={saving} onClick={() => void showNotice('Marcador inválido', 'Ingresa los sets separados por coma, por ejemplo 6:4, 6:3.', 'warning').then(() => input.current?.focus({ preventScroll: true }))}>Revisar marcador</button>}
                                <fieldset disabled={saving}>
                                    <legend>Lado ganador</legend>
                                    <div className="results-winner-options">
                                        {(['A', 'B'] as const).map(side => <label key={side} className={winnerSide === side ? 'is-selected' : ''}>
                                            <input type="radio" name="winner" value={side} checked={winnerSide === side} onChange={() => setWinnerSide(side)} />
                                            <span><strong>Lado {side}</strong>{sideName(side)}</span>
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
        </main>
    );
}
