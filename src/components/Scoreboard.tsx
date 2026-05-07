import { useState, useEffect } from "react";
import "materialize-css/dist/css/materialize.min.css";
import * as sweetalert2 from "sweetalert2";

type Score = "0" | "15" | "30" | "40" | "Ad";

type Player = {
    name: string;
    score: Score;
    games: number;
    sets: number;
    tiebreak: number;
};

type ScoreboardProps = {
    player1: string;
    player2: string;
};

const tennisScores: Score[] = ["0", "15", "30", "40"];

const Scoreboard: React.FC<ScoreboardProps> = ({ player1 , player2}) => {
    const initialPlayers: { p1: Player; p2: Player } = {
        p1: { name: player1, score: "0", games: 0, sets: 0, tiebreak: 0 },
        p2: { name: player2, score: "0", games: 0, sets: 0, tiebreak: 0 },
    };

    const [isResetEnabled, setIsResetEnabled] = useState<boolean>(false); // Estado para habilitar/deshabilitar
    const [isPlayer1Serving, setIsPlayer1Serving] = useState<boolean>(true); // true significa que Player 1 sirve
    const [TieBreakCheckEnabled, setTieBreakCheckEnabled] = useState(false);
    // const [isSuperTiebreakEnabled, setIsSuperTiebreakEnabled] = useState(false);
    const [isTieBreak, setIsTieBreak] = useState(false);

    const [players, setPlayers] = useState<{ p1: Player; p2: Player }>(initialPlayers);
    const [lastPressed, setLastPressed] = useState<string | null>(null);

    const [gameStartTime, setGameStartTime] = useState<Date | null>(new Date()); // Tiempo de inicio del juego
    const [pointStartTime, setPointStartTime] = useState<Date | null>(null); // Tiempo de inicio del punto
    const [totalTime, setTotalTime] = useState<number>(0); // Tiempo total

    const resetScores = () => {
        setPlayers(initialPlayers);
        setLastPressed(null);
        setGameStartTime(new Date());
        setPointStartTime(null);
        setTotalTime(0);
        setTieBreakCheckEnabled(false);
        // setIsSuperTiebreakEnabled(false);
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
    }, [gameStartTime, pointStartTime]);

    // Función para manejar la lógica de tie-break
    const handleTieBreakPoint = (player: Player, opponent: Player): void => {
        // Incrementamos solo el tie-break del jugador que ganó el punto.
        player.tiebreak++;

        // Condición para ganar el tie-break: al menos 7 puntos y diferencia de 2.
        if (player.tiebreak >= 7 && player.tiebreak - opponent.tiebreak >= 2) {
            // El jugador gana el tie-break, incrementa el contador de sets.
            player.sets++;

            // Reiniciamos los puntos de tie-break y games para ambos jugadores.
            player.tiebreak = 0;
            opponent.tiebreak = 0;
            player.games = 0;
            opponent.games = 0;

            // Se desactiva el modo tie-break.
            setIsTieBreak(false);
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

            if (isTieBreak) {
                handleTieBreakPoint(player, opponent);
            } else {
                // Lógica de puntaje normal del juego.
                if (player.score !== "Ad" && player.score !== "40") {
                    player.score = tennisScores[tennisScores.indexOf(player.score) + 1];
                } else if (player.score === "40" && opponent.score !== "Ad" && opponent.score !== "40") {
                    player.games++;
                    player.score = "0";
                    opponent.score = "0";
                } else if (player.score === "40" && opponent.score === "40") {
                    player.score = "Ad";
                } else if (player.score === "Ad") {
                    player.games++;
                    player.score = "0";
                    opponent.score = "0";
                } else if (opponent.score === "Ad") {
                    opponent.score = "40";
                }

                const isTieBreakStart = player.games === 6 && opponent.games === 6
                if (isTieBreakStart && TieBreakCheckEnabled) {
                    setIsTieBreak(true);
                    sweetalert2.default.fire({
                        title: "Tie-Break Activado",
                        icon: "info",
                    })
                }

                if (player.games >= 6 && player.games - opponent.games >= 2) {
                    player.sets++;
                    player.games = 0;
                    opponent.games = 0;
                }

                if (players.p1.sets >= 2 || players.p2.sets >= 2) {
                    const winner = players.p1.sets > players.p2.sets ? players.p1.name : players.p2.name;
                    sweetalert2.default.fire({
                        title: `¡${winner} ha ganado el partido!`,
                        icon: "success",
                    })
                    resetScores();
                }
            }
            // Cambiamos de servidor cuando ambos inician un nuevo game.
            if (player.score === "0" && opponent.score === "0") {
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
            const player = { ...prev[playerKey] };

            if ( isTieBreak) {
                handleTieBreakPointLost(player);
            } else {
                // Lógica normal: se retrocede en el arreglo de puntajes siempre que no sea "0"
                if (player.score !== "0") {
                    player.score = tennisScores[tennisScores.indexOf(player.score) - 1];
                }
            }

            return { ...prev, [playerKey]: player };
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
        <div className="container">
            <h5>Tennis Scoreboard</h5>

            {/* Tie Break Checkbox */}
            <div className="left-align" style={{marginBottom: "10px"}}>
                <div className="col s12 left-align">
                    <label>
                        <input
                            type="checkbox"
                            checked={TieBreakCheckEnabled}
                            onChange={() => {
                                // Bloquear el checkbox de Tie Break al marcarlo
                                if (!TieBreakCheckEnabled) {
                                    setTieBreakCheckEnabled(true);
                                }
                            }}
                            disabled={TieBreakCheckEnabled} // Deshabilitar el checkbox una vez marcado
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

            <table className="striped centered">
                <thead>
                <tr>
                    <th>Players</th>
                    <th>Games</th>
                    <th>Sets</th>
                    <th>Score</th>
                    {isTieBreak && TieBreakCheckEnabled && <th>TB</th>}
                </tr>
                </thead>
                <tbody>
                {["p1", "p2"].map((key) => (
                    <tr key={key}>
                        <td>
                            {players[key as "p1" | "p2"].name}
                            {/* Show "X" only if it’s that player's turn to serve */}
                            {((key === "p1" && isPlayer1Serving) || (key === "p2" && !isPlayer1Serving)) && (
                                <span style={{color: "black", fontWeight: "bold"}}> X</span>
                            )}
                        </td>
                        <td>{players[key as "p1" | "p2"].games}</td>
                        <td>{players[key as "p1" | "p2"].sets}</td>
                        <td>{players[key as "p1" | "p2"].score}</td>
                        {isTieBreak && TieBreakCheckEnabled &&
                            <td>
                                {isTieBreak && TieBreakCheckEnabled ? (
                                    players[key as "p1" | "p2"].tiebreak
                                ) : (
                                    "N/A"
                                )}
                            </td>}
                    </tr>
                ))}
                </tbody>
            </table>

            <div className="row center-align"
                 style={{marginTop: "20px", display: "flex", justifyContent: "center", gap: "20px"}}>
                {["p1", "p2"].map((key) => (
                    <div key={key}
                         style={{display: "flex", flexDirection: "column", alignItems: "center", gap: "10px"}}>
                        <button
                            onClick={() => pointWonBy(key as "p1" | "p2")}
                            className={`btn ${lastPressed === key ? "blue darken-3" : "blue lighten-3"}`}
                            style={{width: "125px", height: "125px", fontSize: "14px"}}
                        >
                            {players[key as "p1" | "p2"].name} +
                        </button>
                        <button
                            onClick={() => pointLostBy(key as "p1" | "p2")}
                            className={`btn ${lastPressed === key ? "red darken-3" : "red lighten-3"}`}
                            style={{width: "100px", height: "100px", fontSize: "14px"}}
                        >
                            {players[key as "p1" | "p2"].name} -
                        </button>
                    </div>
                ))}
            </div>

            <div className="center-align" style={{
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
                <button className="btn grey darken-3" style={{width: "100%"}}>
                    <strong>Total Time: </strong>
                    {formatTime(totalTime)}
                </button>
            </div>
            <div className={"center-align"} style={{marginTop: "20px"}}>
                <h6>Solo Partidos a 3 Sets</h6>
            </div>

        </div>

    );
};

export default Scoreboard;
