import React, { useState } from 'react';
import axios from 'axios';
import M from 'materialize-css';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faSpinner} from "@fortawesome/free-solid-svg-icons";

const MatchResultUpdate: React.FC = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [matchId, setMatchId] = useState('');
    const [matchPass, setMatchPass] = useState('');
    const [isValid, setIsValid] = useState(false);
    const [players, setPlayers] = useState<string[]>([]);
    const [isDoubles, setIsDoubles] = useState(false);
    const [result, setResult] = useState('');
    const [winner, setWinner] = useState('');
    const [generateLoading, setGenerateLoading] = useState(false);

    const validateMatch = async () => {
        setGenerateLoading(true);
        try {
            const { data } = await axios.post(`${apiUrl}/match-ranking/validate-match`, {
                id: matchId,
                pass: matchPass,
            });
            setPlayers(data.players);
            setIsDoubles(data.isDouble);
            setIsValid(data.isValid);

            if (isValid) {
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
        } catch (error) {
            console.error('Error al validar el partido:', error);
        } finally {
            setGenerateLoading(false); // Stop loading spinner
        }
    };

    const handleSave = () => {
        if (result && winner) {
            // Here, you'd call a function to save the result
            console.log('Resultado guardado:', result, winner);
            const modal = document.getElementById('resultModal');
            if (modal) {
                const instance = M.Modal.getInstance(modal);
                if (instance) {
                    instance.close();
                } else {
                    // If the instance is not initialized, initialize it here
                    const newInstance = M.Modal.init(modal);
                    newInstance.close();
                }
            }
        } else {
            alert('Por favor, ingresa el resultado y selecciona un ganador.');
        }
    };

    return (
        <div className="container">
            <h6 className="mt-3">Actualizar Resultado</h6>
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
                    disabled={generateLoading}
                    style={{marginTop: '20px'}}
                    onClick={validateMatch}>
                {generateLoading ? (
                    <FontAwesomeIcon icon={faSpinner} spin fixedWidth/>
                ) : (
                'Validar'  )}
            </button>

            {/* Materialize modal for saving match result */}
            <div id="resultModal" className="modal">
                <div className="modal-content">
                    <h6><strong>Resultado</strong></h6>
                    {isDoubles
                        ? <p>{`${players[0]} & ${players[1]} vs ${players[2]} & ${players[3]}`}</p>
                        : <p>{`${players[0]} vs ${players[1]}`} </p> }
                        <div className="mb-3">
                        <label className="form-label" style={{color:'Black'}}>Ingresa marcadores de Set</label>
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
