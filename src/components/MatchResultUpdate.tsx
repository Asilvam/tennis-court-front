import React, { useState } from 'react';
import axios from 'axios';
import M from 'materialize-css';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faSpinner} from "@fortawesome/free-solid-svg-icons";
import Swal from 'sweetalert2';
import '../styles/Player.css';

interface PlayerData {
    email: string;
    points: string;
    category: string;
    cellular: string;
}

const MatchResultUpdate: React.FC = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    // const phoneAdmin = import.meta.env.VITE_PHONE_ADMIN;
    const [matchId, setMatchId] = useState('');
    const [matchPass, setMatchPass] = useState('');
    const [isValid, setIsValid] = useState(false);
    const [players, setPlayers] = useState<string[]>([]);
    const [isDoubles, setIsDoubles] = useState(false);
    const [result, setResult] = useState('');
    const [winner, setWinner] = useState('');
    const [loading, setLoading] = useState(false);
    const [dataUpdateRanking, setDataUpdateRanking] = useState(null);
    const [player1Data, setPlayer1Data] = useState<PlayerData|null>(null);
    const [player2Data, setPlayer2Data] = useState<PlayerData|null>(null);
    const [player3Data, setPlayer3Data] = useState<PlayerData|null>(null);
    const [player4Data, setPlayer4Data] = useState<PlayerData|null>(null);

    const handleError = (error: any) => {
        if (axios.isAxiosError(error)) {
            if (error.response) {
                // Detecta un error BadRequest (400)
                if (error.response.status === 400) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Solicitud inválida',
                        text: error.response.data.message || 'La solicitud enviada no es válida. Verifica los datos e inténtalo nuevamente.',
                    });
                } else {
                    // Otros errores en la respuesta del servidor
                    Swal.fire({
                        icon: 'error',
                        title: `Error ${error.response.status}`,
                        text: error.response.data.message || 'Ocurrió un problema en la solicitud.',
                    });
                }
            } else if (error.request) {
                // No hubo respuesta del servidor
                Swal.fire({
                    icon: 'warning',
                    title: 'Sin respuesta del servidor',
                    text: 'El servidor no respondió. Por favor, inténtalo más tarde.',
                });
            } else {
                // Error en la configuración de la solicitud
                Swal.fire({
                    icon: 'error',
                    title: 'Error en la solicitud',
                    text: error.message || 'Hubo un problema al enviar la solicitud.',
                });
            }
        } else {
            // Error genérico
            Swal.fire({
                icon: 'error',
                title: 'Error inesperado',
                text: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
            });
        }
    };


    const validateMatch = async () => {
        try {
            setLoading(true);
            const { data } = await axios.post(`${apiUrl}/match-ranking/validate-match`, {
                id: matchId,
                pass: matchPass,
            });
            setPlayers(data.players);
            setIsDoubles(data.isDouble);
            setIsValid(data.isValid);
            // console.log(data);
            setPlayer1Data(data.dataPlayers[0]);
            setPlayer2Data(data.dataPlayers[1]);
            if (isDoubles){
                setPlayer3Data(data.dataPlayers[2]);
                setPlayer4Data(data.dataPlayers[3]);
            }
            setDataUpdateRanking(() => data.players.map((player: string, index: number) => ({
                    player,
                    ...data.dataPlayers[index],
                }))
            );
            if (data.isValid) {
                const modal = document.getElementById('resultModal');
                if (modal) {
                    const instance = M.Modal.getInstance(modal);
                    if (instance) {
                        instance.open();
                    } else {
                        // If the instance is not initialized, initialize it here
                        const newInstance = M.Modal.init(modal);
                        newInstance.open();
                    }
                }
            }
        } catch (error:any) {
            console.error('Error in Validate Match component:', error);
            handleError(error);
        } finally {
            setLoading(false); // Stop loading spinner
        }
    };

    const handleSave = async () => {
        console.log(dataUpdateRanking);
        if (result && winner) {

            // await axios.post(`${apiUrl}/whatsapp/send`, {
            //     to: phoneAdmin,
            //     message: `Resultado guardado: ${result}, ${winner}, ${matchId}`
            // });

            // Here, you'd call a function to save the result
            console.log('Resultado guardado:', result, winner, matchId);

            const modal = document.getElementById('resultModal');
            if (modal) {
                const instance = M.Modal.getInstance(modal) || M.Modal.init(modal);
                instance.close();
            }

            Swal.fire({
                icon: 'success',
                title: 'Resultado guardado',
                text: `El resultado fue guardado con éxito para: ${winner}`,
                timer: 2000,
                showConfirmButton: false,
            });
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'Faltan Datos!',
                text: 'Por favor, ingresa el resultado y selecciona un ganador.',
            });
        }
    };

    return (
        <div className="container">
            <h6 className="mt-3">Ingresar Resultado Match</h6>
            <div className="mb-3">
                <label className="form-label">ID match</label>
                <input
                    type="text"
                    className="form-control"
                    value={matchId}
                    onChange={(e) => setMatchId(e.target.value)}
                    placeholder="Ingrese ID del partido"
                />
            </div>
            <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                    type="password"
                    className="form-control"
                    value={matchPass}
                    onChange={(e) => setMatchPass(e.target.value)}
                    placeholder="Ingrese clave del partido"
                />
            </div>
            <button className="btn btn-primary blue darken-4"
                    disabled={loading}
                    style={{marginTop: '20px'}}
                    onClick={validateMatch}>
                {loading ? (
                    <FontAwesomeIcon icon={faSpinner} spin fixedWidth/>
                ) : (
                'Validar'  )}
            </button>

            {/* Materialize modal for saving match result */}
            <div id="resultModal" className="modal" style={{maxWidth: '450px'}}>
                <div className="modal-content">
                    <h6><strong>Ingresar Resultados de Match</strong></h6>
                    {isDoubles
                        ? <p>{`${players[0]} & ${players[1]} vs ${players[2]} & ${players[3]}`}</p>
                        : <div className="player-container">
                            <div className="player-square">
                                <p className="player-name">{players[0]}</p>
                                <p className="player-serie">Serie: {player1Data?.category}</p>
                                <p className="player-points">Puntos: {player1Data?.points}</p>
                            </div>
                            <div className="vs">VS</div>
                            <div className="player-square">
                                <p className="player-name">{players[1]}</p>
                                <p className="player-serie">Serie: {player2Data?.category}</p>
                                <p className="player-points">Puntos: {player2Data?.points}</p>
                            </div>
                        </div>

                    }
                    <div className="mb-3">
                        <label className="form-label" style={{color: 'Black'}}>Ingresa marcadores de Set</label>
                        <input
                            type="text"
                            className="form-control"
                            value={result}
                            onChange={(e) => setResult(e.target.value)}
                            placeholder="Ejemplo: 6:4, 3:6, 7:6(3)"
                        />
                    </div>
                    <label className="form-label" style={{color:'Black'}}>Seleccionar Ganador</label>
                    <div>
                        {isDoubles ? (
                            <>
                                <div className="form-check" style={{marginTop:'10px'}}>
                                    {players[0] && players[1] &&(
                                        <label style={{color:'Black'}}>
                                    <input
                                        type="checkbox"
                                        className="filled-in"
                                        checked={winner === `${players[0]} & ${players[1]}`}
                                        onChange={() =>
                                            setWinner(`${players[0]} & ${players[1]}`)
                                        }
                                    />
                                       <span>{`${players[0]} & ${players[1]}`}</span>
                                        </label>
                                    )}
                                    {players[2] && players[3] &&(
                                        <label style={{color:'Black'}}>
                                    <input
                                        type="checkbox"
                                        className="filled-in"
                                        checked={winner === `${players[2]} & ${players[3]}`}
                                        onChange={() =>
                                            setWinner(`${players[2]} & ${players[3]}`)
                                        }
                                    />
                                      <span>{`${players[2]} & ${players[3]}`}</span>
                                        </label>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-check" style={{marginTop:'10px'}}>
                                    {/* Checkbox for Player 1 */}
                                    {players[0] && (
                                        <label style={{color:'Black'}}>
                                            <input
                                                type="checkbox"
                                                className="filled-in"
                                                checked={winner === players[0]} // Assuming 'winner' is the selected player
                                                onChange={() => setWinner(players[0])}
                                            />
                                            <span>{players[0]}</span>
                                        </label>
                                    )}

                                    {/* Checkbox for Player 2 */}
                                    {players[1] && (
                                        <label style={{marginLeft: '20px', color:'Black'}}>
                                            <input
                                                type="checkbox"
                                                className="filled-in"
                                                checked={winner === players[1]} // Assuming 'winner' is the selected player
                                                onChange={() => setWinner(players[1])}
                                            />
                                            <span>{players[1]}</span>
                                        </label>
                                    )}
                                </div>
                            </>

                        )}
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-primary blue darken-1" onClick={handleSave}>
                        Guardar
                    </button>
                    <button
                        className="btn btn-secondary modal-close blue darken-4"
                        style={{ marginLeft: "10px" }}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchResultUpdate;
