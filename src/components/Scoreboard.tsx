import { useState, useEffect } from "react";
import "materialize-css/dist/css/materialize.min.css";
import "../styles/Scoreboard.css";
import * as sweetalert2 from "sweetalert2";

type Score = "0" | "15" | "30" | "40" | "Ad";

type Player = {
    name: string;
    score: Score;
    games: number;
    sets: number;
    tiebreak: number;
    lastSet: string | null;
};

type ScoreboardProps = {
    player1: string;
    player2: string;
};

const tennisScores: Score[] = ["0", "15", "30", "40"];

const Scoreboard: React.FC<ScoreboardProps> = ({ player1, player2 }) => {
    const initialPlayers: { p1: Player; p2: Player } = {
        p1: { name: player1, score: "0", games: 0, sets: 0, tiebreak: 0, lastSet: null },
        p2: { name: player2, score: "0", games: 0, sets: 0, tiebreak: 0, lastSet: null },
    };

    const [isResetEnabled, setIsResetEnabled] = useState<boolean>(false); // Estado para habilitar/deshabilitar
    const [isPlayer1Serving, setIsPlayer1Serving] = useState<boolean>(true); // true significa que Player 1 sirve
    const [tieBreakEnabled, setTieBreakEnabled] = useState(false);
    // const [isSuperTiebreakEnabled, setIsSuperTiebreakEnabled] = useState(false);
    const [isTieBreak, setIsTieBreak] = useState(false);
    const [tieBreakStartServer, setTieBreakStartServer] = useState<boolean | null>(null);

    const [players, setPlayers] = useState<{ p1: Player; p2: Player }>(initialPlayers);
    const [lastPressed, setLastPressed] = useState<string | null>(null);

    const [gameStartTime, setGameStartTime] = useState<Date | null>(new Date()); // Tiempo de inicio del juego
    const [totalTime, setTotalTime] = useState<number>(0); // Tiempo total

    const resetScores = () => {
        setPlayers(initialPlayers);
        setLastPressed(null);
        setGameStartTime(new Date());
        setTotalTime(0);
        setTieBreakEnabled(false);
        // setIsSuperTiebreakEnabled(false);
        setIsTieBreak(false);
        setTieBreakStartServer(null);
        setIsPlayer1Serving(true);
    };

    useEffect(() => {
        let totalTimer: NodeJS.Timeout;

        if (gameStartTime) {
            totalTimer = setInterval(() => {
                setTotalTime(Math.floor((new Date().getTime() - gameStartTime.getTime()) / 1000)); // Tiempo total en segundos
            }, 1000);
        }

        return () => {
            clearInterval(totalTimer);
        };
    }, [gameStartTime]);

    const getTieBreakServer = (startServerIsP1: boolean, pointsPlayed: number): boolean => {
        if (pointsPlayed === 0) {
            return startServerIsP1;
        }

        const block = Math.floor((pointsPlayed - 1) / 2);
        return block % 2 === 0 ? !startServerIsP1 : startServerIsP1;
    };

    const setLastSetResult = (
        winner: Player,
        loser: Player,
        winnerGames: number,
        loserGames: number,
        winnerTb?: number,
        loserTb?: number
    ) => {
        const hasTieBreakScore = typeof winnerTb === "number" && typeof loserTb === "number";
        const winnerSuffix = hasTieBreakScore ? ` (${winnerTb}-${loserTb})` : "";
        const loserSuffix = hasTieBreakScore ? ` (${loserTb}-${winnerTb})` : "";

        winner.lastSet = `${winnerGames}-${loserGames}${winnerSuffix}`;
        loser.lastSet = `${loserGames}-${winnerGames}${loserSuffix}`;
    };

    // Función para manejar la lógica de tie-break
    const handleTieBreakPoint = (player: Player, opponent: Player): void => {
        // Incrementamos solo el tie-break del jugador que ganó el punto.
        player.tiebreak++;

        // Condición para ganar el tie-break: al menos 7 puntos y diferencia de 2.
        if (player.tiebreak >= 7 && player.tiebreak - opponent.tiebreak >= 2) {
            // El jugador gana el tie-break, incrementa el contador de sets.
            player.sets++;
            setLastSetResult(player, opponent, 7, 6, player.tiebreak, opponent.tiebreak);

            // Reiniciamos los puntos de tie-break y games para ambos jugadores.
            player.tiebreak = 0;
            opponent.tiebreak = 0;
            player.games = 0;
            opponent.games = 0;

            // Se desactiva el modo tie-break.
            setIsTieBreak(false);
            setTieBreakStartServer(null);
            if (tieBreakStartServer !== null) {
                setIsPlayer1Serving(!tieBreakStartServer);
            }
        } else {
            // Verificamos si es momento de cambiar de lado.
            const totalPoints = player.tiebreak + opponent.tiebreak;
            if (totalPoints > 0 && totalPoints % 6 === 0) {
                console.log("Cambio de lado");
                // Aquí se puede implementar la lógica para cambiar de lado.
            }
        }
    };

    const pointWonBy = (playerKey: "p1" | "p2") => {
        setPlayers((prev) => {
            const opponentKey = playerKey === "p1" ? "p2" : "p1";
            const player = { ...prev[playerKey] };
            const opponent = { ...prev[opponentKey] };
            let gameFinished = false;
            let setFinished = false;

            if (isTieBreak) {
                handleTieBreakPoint(player, opponent);
                setFinished = player.sets !== prev[playerKey].sets;
                if (player.sets >= 2 || opponent.sets >= 2) {
                    const winner = player.sets > opponent.sets ? player.name : opponent.name;
                    sweetalert2.default.fire({
                        title: `¡${winner} ha ganado el partido!`,
                        icon: "success",
                    })
                    resetScores();
                }
            } else {
                // Lógica de puntaje normal del juego.
                if (player.score !== "Ad" && player.score !== "40") {
                    player.score = tennisScores[tennisScores.indexOf(player.score) + 1];
                } else if (player.score === "40" && opponent.score !== "Ad" && opponent.score !== "40") {
                    player.games++;
                    player.score = "0";
                    opponent.score = "0";
                    gameFinished = true;
                } else if (player.score === "40" && opponent.score === "40") {
                    player.score = "Ad";
                } else if (player.score === "Ad") {
                    player.games++;
                    player.score = "0";
                    opponent.score = "0";
                    gameFinished = true;
                } else if (opponent.score === "Ad") {
                    opponent.score = "40";
                }

                const isTieBreakStart = player.games === 6 && opponent.games === 6
                if (isTieBreakStart && tieBreakEnabled) {
                    setIsTieBreak(true);
                    setTieBreakStartServer(isPlayer1Serving);
                    sweetalert2.default.fire({
                        title: "Tie-Break Activado",
                        icon: "info",
                    })
                }

                if (player.games >= 6 && player.games - opponent.games >= 2) {
                    player.sets++;
                    setLastSetResult(player, opponent, player.games, opponent.games);
                    player.games = 0;
                    opponent.games = 0;
                    setFinished = true;
                }

                if (player.sets >= 2 || opponent.sets >= 2) {
                    const winner = player.sets > opponent.sets ? player.name : opponent.name;
                    sweetalert2.default.fire({
                        title: `¡${winner} ha ganado el partido!`,
                        icon: "success",
                    })
                    resetScores();
                }
            }
            // Cambiamos de servidor cuando ambos inician un nuevo game.
            if (gameFinished && !isTieBreak && !setFinished) {
                setIsPlayer1Serving((prev) => !prev);
            }
            return { ...prev, [playerKey]: player, [opponentKey]: opponent };
        });
        setLastPressed(playerKey);
    };

    const handleTieBreakPointLost = (player: Player): void => {
        // Disminuye el puntaje de tie-break sin bajar de 0
        if (player.tiebreak > 0) {
            player.tiebreak--;
        }
        // Aquí se podría agregar lógica adicional (por ejemplo, revertir cambio de lado)
    };

    const pointLostBy = (playerKey: "p1" | "p2") => {
        setPlayers((prev) => {
            const opponentKey = playerKey === "p1" ? "p2" : "p1";
            const player = { ...prev[playerKey] };
            const opponent = { ...prev[opponentKey] };

            if (isTieBreak) {
                handleTieBreakPointLost(player);
            } else {
                // Lógica normal: se retrocede en el arreglo de puntajes siempre que no sea "0"
                if (player.score !== "0") {
                    player.score = tennisScores[tennisScores.indexOf(player.score) - 1];
                }
            }

            return { ...prev, [playerKey]: player, [opponentKey]: opponent };
        });
        setLastPressed(playerKey);
    };

    const formatTime = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };


    return (
        <div className="scoreboard-page">
            <div className="scoreboard-shell">
                <div className="scoreboard-header">
                    <h5 className="scoreboard-title">Tennis Scoreboard</h5>
                    <span className="scoreboard-chip">Best of 3 sets</span>
                </div>
                <div className="scoreboard-chips">
                    <span className={`scoreboard-chip ${tieBreakEnabled ? "scoreboard-chip--active" : ""}`}>
                        Tiebreak: {tieBreakEnabled ? "Enabled" : "Off"}
                    </span>
                    {isTieBreak && tieBreakEnabled && (
                        <span className="scoreboard-chip scoreboard-chip--live">Tiebreak Active</span>
                    )}
                </div>

            {/* Tie Break Checkbox */}
            <div className="left-align" style={{marginBottom: "10px"}}>
                <div className="col s12 left-align">
                    <label>
                        <input
                            type="checkbox"
                            checked={tieBreakEnabled}
                            onChange={() => {
                                // Bloquear el checkbox de Tie Break al marcarlo
                                if (!tieBreakEnabled) {
                                    setTieBreakEnabled(true);
                                }
                            }}
                            disabled={tieBreakEnabled} // Deshabilitar el checkbox una vez marcado
                        />
                        <span>Tiebreak</span>
                    </label>
                </div>
            </div>

            {/* Super Tie Break Checkbox */}
            {/*<div className="left-align" style={{ marginBottom: "20px" }}>*/}
            {/*    <div className="col s12 left-align">*/}
            {/*        <label>*/}
            {/*            <input*/}
            {/*                type="checkbox"*/}
            {/*                checked={isSuperTiebreakEnabled}*/}
            {/*                onChange={() => {*/}
            {/*                    // Bloquear el checkbox de Super Tie Break al marcarlo*/}
            {/*                    if (!isSuperTiebreakEnabled) {*/}
            {/*                        setIsSuperTiebreakEnabled(true);*/}
            {/*                    }*/}
            {/*                }}*/}
            {/*                disabled={isSuperTiebreakEnabled} // Deshabilitar el checkbox una vez marcado*/}
            {/*            />*/}
            {/*            <span>Super Tiebreak</span>*/}
            {/*        </label>*/}
            {/*    </div>*/}
            {/*</div>*/}

                <div className="scoreboard-card">
                    <table className="striped centered scoreboard-table">
                        <thead>
                        <tr>
                            <th>Players</th>
                            <th>Games</th>
                            <th>Sets</th>
                            <th>Score</th>
                            <th>Last Set</th>
                            {isTieBreak && tieBreakEnabled && <th>TB</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {["p1", "p2"].map((key) => (
                            <tr key={key}>
                                <td>
                                    <div className="scoreboard-player">
                                        {(() => {
                                            const pointsPlayed = players.p1.tiebreak + players.p2.tiebreak;
                                            const isTieBreakServer = isTieBreak && tieBreakStartServer !== null
                                                ? getTieBreakServer(tieBreakStartServer, pointsPlayed)
                                                : isPlayer1Serving;
                                            const isServing = key === "p1" ? isTieBreakServer : !isTieBreakServer;
                                            return isServing ? (
                                                <span className="scoreboard-service-ball" title="Serving" />
                                            ) : (
                                                <span className="scoreboard-service-placeholder" />
                                            );
                                        })()}
                                        <span>{players[key as "p1" | "p2"].name}</span>
                                    </div>
                                </td>
                                <td className="scoreboard-games">{players[key as "p1" | "p2"].games}</td>
                                <td className="scoreboard-sets">{players[key as "p1" | "p2"].sets}</td>
                                <td className="scoreboard-score">{players[key as "p1" | "p2"].score}</td>
                                <td>{players[key as "p1" | "p2"].lastSet ?? "—"}</td>
                                {isTieBreak && tieBreakEnabled &&
                                    <td>
                                        {isTieBreak && tieBreakEnabled ? (
                                            <span className="scoreboard-tb">{players[key as "p1" | "p2"].tiebreak}</span>
                                        ) : (
                                            "N/A"
                                        )}
                                    </td>}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                <div className="row scoreboard-actions">
                    {["p1", "p2"].map((key) => (
                        <div key={key} className="col s12 m6" style={{marginBottom: "16px"}}>
                            <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: "10px"}}>
                                <button
                                    onClick={() => pointWonBy(key as "p1" | "p2")}
                                    className={`btn waves-effect waves-light scoreboard-btn scoreboard-btn--primary ${lastPressed === key ? "blue darken-3" : "blue lighten-3"}`}
                                    aria-label={`${players[key as "p1" | "p2"].name} wins point`}
                                >
                                    {players[key as "p1" | "p2"].name} +
                                </button>
                                <button
                                    onClick={() => pointLostBy(key as "p1" | "p2")}
                                    className={`btn waves-effect waves-light scoreboard-btn scoreboard-btn--secondary ${lastPressed === key ? "red darken-3" : "red lighten-3"}`}
                                    aria-label={`${players[key as "p1" | "p2"].name} loses point`}
                                >
                                    {players[key as "p1" | "p2"].name} -
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="center-align scoreboard-reset" style={{
                    marginTop: "40px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "20px"
                }}>
                    <button
                        onClick={resetScores}
                        className="btn red darken-3"
                        style={{width: "100%"}}
                        disabled={!isResetEnabled} // Disable the button if not enabled
                    >
                        RESET ALL
                    </button>
                    <label>
                        <input
                            type="checkbox"
                            checked={isResetEnabled}
                            onChange={() => setIsResetEnabled(!isResetEnabled)} // Toggle the state
                        />
                        <span>Enable Reset</span>
                    </label>
                </div>

                <div className="center-align" style={{marginTop: "20px"}}>
                    <div className="scoreboard-time">
                        <strong>Total Time: </strong>
                        {formatTime(totalTime)}
                    </div>
                </div>
            </div>
        </div>

    );
};

export default Scoreboard;
