import React, { useState } from 'react';
import Swal from 'sweetalert2';
import '../styles/TennisScore.css';

interface SetScore {
    p1Games: number;
    p2Games: number;
}

interface MatchState {
    setsWonP1: number;
    setsWonP2: number;
    sets: SetScore[];
    p1Points: number;
    p2Points: number;
    isTiebreak: boolean;
    tbPointsP1: number;
    tbPointsP2: number;
    tbPointsTotal: number;
    tbStartingServer: 1 | 2;
    server: 1 | 2;
    bestOf: 3 | 5;
    isMatchOver: boolean;
    finalSetMode: 'normal' | 'superTB' | null;
    superTiebreakActive: boolean;
}

const TennisScoreboard: React.FC = () => {
    const [player1, setPlayer1] = useState<string>('Jugador 1');
    const [player2, setPlayer2] = useState<string>('Jugador 2');
    const [playerHeader, setPlayerHeader] = useState<string>('Torneo Local Salem Pichara');

    const [setsWonP1, setSetsWonP1] = useState<number>(0);
    const [setsWonP2, setSetsWonP2] = useState<number>(0);
    const [sets, setSets] = useState<SetScore[]>([{ p1Games: 0, p2Games: 0 }]);

    const pointValues = ['0', '15', '30', '40'];
    const [p1Points, setP1Points] = useState<number>(0);
    const [p2Points, setP2Points] = useState<number>(0);

    const [isTiebreak, setIsTiebreak] = useState<boolean>(false);
    const [tbPointsP1, setTbPointsP1] = useState<number>(0);
    const [tbPointsP2, setTbPointsP2] = useState<number>(0);
    const [tbPointsTotal, setTbPointsTotal] = useState<number>(0);
    const [tbStartingServer, setTbStartingServer] = useState<1 | 2>(1);

    const [server, setServer] = useState<1 | 2>(1);

    const [bestOf, setBestOf] = useState<3 | 5>(3);
    const [isMatchOver, setIsMatchOver] = useState<boolean>(false);
    const [finalSetMode, setFinalSetMode] = useState<'normal' | 'superTB' | null>(null);
    const [superTiebreakActive, setSuperTiebreakActive] = useState<boolean>(false);

    const [history, setHistory] = useState<MatchState[]>([]);

    const currentSetIdx = sets.length - 1;

    const saveHistory = () => {
        setHistory((prevHistory) => [
            ...prevHistory,
            {
                setsWonP1,
                setsWonP2,
                sets: sets.map(set => ({ ...set })),
                p1Points,
                p2Points,
                isTiebreak,
                tbPointsP1,
                tbPointsP2,
                tbPointsTotal,
                tbStartingServer,
                server,
                bestOf,
                isMatchOver,
                finalSetMode,
                superTiebreakActive,
            },
        ]);
    };

    const undoLastAction = () => {
        if (history.length === 0) return;

        const previousStates = [...history];
        const lastState = previousStates.pop();

        if (lastState) {
            setSetsWonP1(lastState.setsWonP1);
            setSetsWonP2(lastState.setsWonP2);
            setSets(lastState.sets);
            setP1Points(lastState.p1Points);
            setP2Points(lastState.p2Points);
            setIsTiebreak(lastState.isTiebreak);
            setTbPointsP1(lastState.tbPointsP1);
            setTbPointsP2(lastState.tbPointsP2);
            setTbPointsTotal(lastState.tbPointsTotal);
            setTbStartingServer(lastState.tbStartingServer);
            setServer(lastState.server);
            setBestOf(lastState.bestOf);
            setIsMatchOver(lastState.isMatchOver);
            setFinalSetMode(lastState.finalSetMode);
            setSuperTiebreakActive(lastState.superTiebreakActive);
            setHistory(previousStates);
        }
    };

    const setsToWin = Math.ceil(bestOf / 2);

    const resetPoints = () => {
        setP1Points(0);
        setP2Points(0);
    };

    const resetTiebreak = () => {
        setIsTiebreak(false);
        setTbPointsP1(0);
        setTbPointsP2(0);
        setTbPointsTotal(0);
        setTbStartingServer(server);
    };

    const getPointDisplay = (player: 1 | 2) => {
        const p1 = p1Points;
        const p2 = p2Points;
        if (p1 >= 3 && p2 >= 3) {
            if (p1 === p2) return '40';
            const leader = p1 > p2 ? 1 : 2;
            return player === leader ? 'Ad' : '40';
        }
        const value = player === 1 ? p1 : p2;
        return pointValues[Math.min(value, 3)];
    };

    const handleSetWin = async (player: 1 | 2, updatedSets: SetScore[]) => {
        const nextSetsWonP1 = player === 1 ? setsWonP1 + 1 : setsWonP1;
        const nextSetsWonP2 = player === 2 ? setsWonP2 + 1 : setsWonP2;

        setSetsWonP1(nextSetsWonP1);
        setSetsWonP2(nextSetsWonP2);
        resetPoints();
        resetTiebreak();
        setSuperTiebreakActive(false);

        if (nextSetsWonP1 >= setsToWin || nextSetsWonP2 >= setsToWin) {
            setSets(updatedSets);
            setIsMatchOver(true);
            setFinalSetMode(null);
            Swal.fire({
                title: 'Partido finalizado',
                text: `Ganador: ${player === 1 ? player1 : player2}`,
                icon: 'success',
                confirmButtonColor: '#2e7d32',
                background: '#1a1a1a',
                color: '#ffffff'
            });
            return;
        }

        if (nextSetsWonP1 === setsToWin - 1 && nextSetsWonP2 === setsToWin - 1) {
            const result = await Swal.fire({
                title: 'Definición del partido',
                text: '¿Cómo desea jugar el set final?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#2e7d32',
                cancelButtonColor: '#5cc8ff',
                confirmButtonText: 'Set normal (TB a 7)',
                cancelButtonText: 'Super TB a 10',
                background: '#1a1a1a',
                color: '#ffffff'
            });

            if (result.isConfirmed) {
                setFinalSetMode('normal');
                setSets([...updatedSets, { p1Games: 0, p2Games: 0 }]);
                return;
            }

            if (result.dismiss === Swal.DismissReason.cancel) {
                const startingServer = server;
                setFinalSetMode('superTB');
                setSuperTiebreakActive(true);
                setIsTiebreak(true);
                setTbPointsP1(0);
                setTbPointsP2(0);
                setTbPointsTotal(0);
                setTbStartingServer(startingServer);
                setServer(startingServer);
                setSets([...updatedSets, { p1Games: 0, p2Games: 0 }]);
                return;
            }
        }

        setFinalSetMode(null);
        setSets([...updatedSets, { p1Games: 0, p2Games: 0 }]);
    };

    const handleGameWin = async (player: 1 | 2) => {
        const newSets = sets.map(set => ({ ...set }));
        if (player === 1) newSets[currentSetIdx].p1Games += 1;
        else newSets[currentSetIdx].p2Games += 1;

        const p1Games = newSets[currentSetIdx].p1Games;
        const p2Games = newSets[currentSetIdx].p2Games;
        const nextServer = server === 1 ? 2 : 1;

        resetPoints();
        setSets(newSets);
        setServer(nextServer);

        if ((p1Games >= 6 || p2Games >= 6) && Math.abs(p1Games - p2Games) >= 2) {
            await handleSetWin(player, newSets);
            return;
        }

        if (p1Games === 6 && p2Games === 6) {
            setIsTiebreak(true);
            setTbPointsP1(0);
            setTbPointsP2(0);
            setTbPointsTotal(0);
            setTbStartingServer(nextServer);
        }
    };

    const handleTiebreakPoint = async (player: 1 | 2) => {
        const tbTarget = superTiebreakActive ? 10 : 7;
        const nextTbPointsP1 = tbPointsP1 + (player === 1 ? 1 : 0);
        const nextTbPointsP2 = tbPointsP2 + (player === 2 ? 1 : 0);
        const nextTbTotal = tbPointsTotal + 1;

        setTbPointsP1(nextTbPointsP1);
        setTbPointsP2(nextTbPointsP2);
        setTbPointsTotal(nextTbTotal);

        if (nextTbTotal === 1) {
            setServer(tbStartingServer === 1 ? 2 : 1);
        } else if (nextTbTotal > 1 && nextTbTotal % 2 === 1) {
            setServer((prev) => (prev === 1 ? 2 : 1));
        }

        if ((nextTbPointsP1 >= tbTarget || nextTbPointsP2 >= tbTarget) && Math.abs(nextTbPointsP1 - nextTbPointsP2) >= 2) {
            const newSets = sets.map(set => ({ ...set }));

            if (superTiebreakActive) {
                newSets[currentSetIdx].p1Games = nextTbPointsP1;
                newSets[currentSetIdx].p2Games = nextTbPointsP2;
            } else {
                if (player === 1) newSets[currentSetIdx].p1Games += 1;
                else newSets[currentSetIdx].p2Games += 1;
            }

            setServer(tbStartingServer === 1 ? 2 : 1);
            await handleSetWin(player, newSets);
        }
    };

    const addPoint = async (player: 1 | 2) => {
        if (isMatchOver) return;
        saveHistory();
        if (isTiebreak) {
            await handleTiebreakPoint(player);
            return;
        }

        const nextP1Points = p1Points + (player === 1 ? 1 : 0);
        const nextP2Points = p2Points + (player === 2 ? 1 : 0);

        if ((nextP1Points >= 4 || nextP2Points >= 4) && Math.abs(nextP1Points - nextP2Points) >= 2) {
            await handleGameWin(player);
            return;
        }

        setP1Points(nextP1Points);
        setP2Points(nextP2Points);
    };
    const toggleBestOf = async () => {
        const isPristine =
            sets.length === 1 &&
            sets[0].p1Games === 0 &&
            sets[0].p2Games === 0 &&
            setsWonP1 === 0 &&
            setsWonP2 === 0 &&
            p1Points === 0 &&
            p2Points === 0 &&
            tbPointsP1 === 0 &&
            tbPointsP2 === 0 &&
            !isTiebreak;

        if (!isPristine) {
            const result = await Swal.fire({
                title: 'Cambiar formato',
                text: 'Cambiar el formato reiniciará el partido actual. ¿Desea continuar?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#2e7d32',
                cancelButtonColor: '#616161',
                confirmButtonText: 'Cambiar y reiniciar',
                cancelButtonText: 'Cancelar',
                background: '#1a1a1a',
                color: '#ffffff'
            });

            if (!result.isConfirmed) return;
        }

        setBestOf((prev) => (prev === 3 ? 5 : 3));
        setSetsWonP1(0);
        setSetsWonP2(0);
        setSets([{ p1Games: 0, p2Games: 0 }]);
        resetPoints();
        resetTiebreak();
        setServer(1);
        setTbStartingServer(1);
        setIsMatchOver(false);
        setFinalSetMode(null);
        setSuperTiebreakActive(false);
        setHistory([]);
    };

    const getControlLabel = (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return 'Control';

        const formatName = (segment: string) => {
            const tokens = segment.trim().split(/\s+/).filter(Boolean);
            if (tokens.length === 0) return '';
            const first = tokens[0];
            const last = tokens.length > 1 ? tokens[tokens.length - 1] : tokens[0];
            return `${first[0].toUpperCase()} ${last}`;
        };

        const segments = trimmed.split(/\s*-\s*/).filter(Boolean);
        const label = segments.map(formatName).filter(Boolean).join(' - ');
        const prefix = segments.length > 1 ? 'Ctrl' : 'Control';
        return label ? `${prefix} ${label}` : 'Control';
    };

    return (
        <div className="container tennis-scoreboard-container">
            <div className="card z-depth-3 scoreboard-card">
                <div className="card-content">

                    <div className="scoreboard-header">
                        <span className="scoreboard-title">Club de tenis Quintero</span>
                    </div>

                    <div className="scoreboard-action-bar">
                        <div className="undo-group">
                            <button className="btn-floating waves-effect waves-light grey darken-3 undo-btn" onClick={undoLastAction} disabled={history.length === 0} title="Deshacer última acción">
                                <i className="material-icons">undo</i>
                            </button>
                            {isTiebreak && (
                                <span className="status-pill">
                                    {tbPointsTotal > 0 && tbPointsTotal % 6 === 0
                                        ? 'Cambio de lado'
                                        : (superTiebreakActive ? 'SUPER TB' : 'TIEBREAK')}
                                </span>
                            )}
                        </div>
                        <div className="format-group">
                            <button
                                className="btn waves-effect waves-light light-blue darken-3 format-btn"
                                onClick={toggleBestOf}
                            >
                                {bestOf === 3 ? 'Mejor de 3' : 'Mejor de 5'}
                            </button>
                        </div>
                    </div>

                    <div className="row score-row">
                        <div className="col s12 score-table-wrap">
                            <table className="highlight centered tennis-table">
                                <thead>
                                <tr>
                                    <th className="player-col">
                                        <div
                                            contentEditable={true}
                                            suppressContentEditableWarning={true}
                                            onBlur={(e) => setPlayerHeader(e.currentTarget.textContent || '')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    e.currentTarget.blur();
                                                }
                                            }}
                                            className="table-header-editable"
                                            aria-label="Titulo de columna jugador"
                                        >
                                            {playerHeader}
                                        </div>
                                    </th>
                                    <th>Sets</th>
                                    {sets.map((_, i) => <th key={i}>S{i + 1}</th>)}
                                    <th className="points-col">Puntos</th>
                                </tr>
                                </thead>
                                <tbody>
                                {/* Fila Jugador 1 */}
                                <tr>
                                    <td className="player-cell">
                                        <div className="player-cell-inner">
                                                <span
                                                    className={`serving-indicator ${server === 1 ? 'active' : ''}`}
                                                    title="Jugador al saque"
                                                >
                                                    🎾
                                                </span>
                                            <input type="text" value={player1} onChange={(e) => setPlayer1(e.target.value)} className="player-input" />
                                        </div>
                                    </td>
                                    <td className="sets-won">
                                        <span className="set-count">{setsWonP1}</span>
                                    </td>
                                    {sets.map((set, i) => (
                                        <td key={i} className={i === currentSetIdx ? 'current-set' : 'past-set'}>{set.p1Games}</td>
                                    ))}
                                    <td className={`current-points ${isTiebreak ? 'tb-points' : ''}`}>
                                        {isTiebreak ? tbPointsP1 : getPointDisplay(1)}
                                    </td>
                                </tr>

                                {/* Fila Jugador 2 */}
                                <tr>
                                    <td className="player-cell">
                                        <div className="player-cell-inner">
                                                <span
                                                    className={`serving-indicator ${server === 2 ? 'active' : ''}`}
                                                    title="Jugador al saque"
                                                >
                                                    🎾
                                                </span>
                                            <input type="text" value={player2} onChange={(e) => setPlayer2(e.target.value)} className="player-input" />
                                        </div>
                                    </td>
                                    <td className="sets-won">
                                        <span className="set-count">{setsWonP2}</span>
                                    </td>
                                    {sets.map((set, i) => (
                                        <td key={i} className={i === currentSetIdx ? 'current-set' : 'past-set'}>{set.p2Games}</td>
                                    ))}
                                    <td className={`current-points ${isTiebreak ? 'tb-points' : ''}`}>
                                        {isTiebreak ? tbPointsP2 : getPointDisplay(2)}
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Controles de Juego */}
                    <div className="row controls-row center-align">
                        <div className="col s12 m6 control-group">
                            <div className="control-header">
                                <h6>{getControlLabel(player1)}</h6>
                                <button className="btn light-blue darken-3 control-btn" onClick={() => void addPoint(1)} disabled={isMatchOver}>
                                    {isTiebreak ? '+ Punto TB' : 'Punto'}
                                </button>
                            </div>
                        </div>

                        <div className="col s12 m6 control-group">
                            <div className="control-header">
                                <h6>{getControlLabel(player2)}</h6>
                                <button className="btn light-blue darken-3 control-btn" onClick={() => void addPoint(2)} disabled={isMatchOver}>
                                    {isTiebreak ? '+ Punto TB' : 'Punto'}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default TennisScoreboard;
