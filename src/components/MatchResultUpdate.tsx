import React, {useState} from 'react';
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

// Interfaz para la respuesta de validateMatch (opcional pero recomendado)
interface ValidateMatchResponse {
    players: string[];
    isDouble: boolean;
    isValid: boolean;
    dataPlayers: PlayerData[];
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
    const [dataWinner, setDataWinner] = useState<PlayerData[]>([]);
    const [loading, setLoading] = useState(false);
    const [dataUpdateRanking, setDataUpdateRanking] = useState(null);
    const [player1Data, setPlayer1Data] = useState<PlayerData | null>(null);
    const [player2Data, setPlayer2Data] = useState<PlayerData | null>(null);
    const [player3Data, setPlayer3Data] = useState<PlayerData | null>(null);
    const [player4Data, setPlayer4Data] = useState<PlayerData | null>(null);

    const isPlayerAmin = (fullName?: string): boolean | undefined => {
        return fullName?.toLowerCase().includes('kafati');
    };

    const getPlayerInitials = (fullName?: string): string => {
        if (!fullName) return '';
        const nameParts = fullName.trim().split(' ').filter(part => part.length > 0); // Filtra partes vacías
        if (nameParts.length === 0) return '';

        const firstInitial = nameParts[0][0].toUpperCase() + '.';
        if (nameParts.length > 1) {
            const lastName = nameParts[nameParts.length - 1];
            if (lastName && lastName[0]) { // Asegura que el apellido no esté vacío
                const lastInitial = lastName[0].toUpperCase() + '.';
                return `${firstInitial} ${lastInitial}`;
            }
        }
        return firstInitial; // Solo la primera inicial si no hay apellido o es un solo nombre
    };


    const handleError = (error) => {
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
            const {data}: { data: ValidateMatchResponse } = await axios.post(`${apiUrl}/match-ranking/validate-match`, {
                id: matchId,
                pass: matchPass,
            });
            setPlayers(data.players);
            setIsDoubles(data.isDouble); // Usar data.isDouble de la respuesta
            setIsValid(data.isValid);

            setPlayer1Data(data.dataPlayers[0] || null); // Asegurar null si no existe
            setPlayer2Data(data.dataPlayers[1] || null);

            if (data.isDouble) { // Usar data.isDouble de la respuesta
                setPlayer3Data(data.dataPlayers[2] || null);
                setPlayer4Data(data.dataPlayers[3] || null);
            } else {
                setPlayer3Data(null); // Limpiar si no es dobles
                setPlayer4Data(null);
            }

            setDataUpdateRanking(() => data.players.map((player: string, index: number) => ({
                    player,
                    ...(data.dataPlayers[index] || {}), // Asegurar objeto vacío si no hay datos
                }))
            );

            if (data.isValid) {
                const modal = document.getElementById('resultModal');
                if (modal) {
                    const instance = M.Modal.getInstance(modal) || M.Modal.init(modal);
                    instance.open();
                }
            }
        } catch (error: any) {
            console.error('Error in Validate Match component:', error);
            handleError(error);
        } finally {
            setLoading(false); // Stop loading spinner
        }
    };

    const handleSave = async () => {
        console.log('emailWinner:', dataWinner)
        if (
            result && dataWinner) {
            setLoading(true);
            try {
                await axios.post(`${apiUrl}/match-ranking`, {
                    matchId,
                    result,
                    winner: dataWinner,
                });

                console.log('Resultado guardado (simulado):', result, dataWinner, matchId);

                const modal = document.getElementById('resultModal');
                if (modal) {
                    const instance = M.Modal.getInstance(modal) || M.Modal.init(modal);
                    instance.close();
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Resultado guardado',
                    text: `El resultado fue guardado con éxito`,
                    timer: 3000,
                    showConfirmButton: false,
                });
                // Resetear campos
                setMatchId('');
                setMatchPass('');
                setIsValid(false);
                setPlayers([]);
                setResult('');
                setDataWinner([]);
                setPlayer1Data(null);
                setPlayer2Data(null);
                setPlayer3Data(null);
                setPlayer4Data(null);
                setDataUpdateRanking(null);

            } catch (error) {
                console.error('Error saving match result:', error);
                handleError(error);
            } finally {
                setLoading(false);
            }
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
                    'Validar')}
            </button>

            {/* Materialize modal for saving match result */}
            <div id="resultModal" className="modal" style={{maxWidth: '550px'}}>
                <div className="modal-content">
                    {/*<h6><strong>Ingresar Resultados de Match</strong></h6>*/}
                    {isDoubles
                        ?
                        <p>{`${getPlayerInitials(players[0])} & ${getPlayerInitials(players[1])} vs ${getPlayerInitials(players[2])} & ${getPlayerInitials(players[3])}`}</p>
                           : <div className="player-container">
                                {/* Tarjeta del Jugador 1 */}
                                <div className="player-square player-one">
                                    <div className="player-info-header">
                                        <div className={`player-photo-mock ${isPlayerAmin(players[0]) ? 'is-amin' : ''}`}></div>
                                        <p className="player-name">{getPlayerInitials(players[0])}</p>
                                    </div>
                                    <div className="player-details">
                                        <p className="player-serie">Serie: {player1Data?.category}</p>
                                        <p className="player-points">Puntos: {player1Data?.points}</p>
                                    </div>
                                </div>

                                {/* "VS" como elemento central y de acento */}
                                <div className="vs">VS</div>

                                {/* Tarjeta del Jugador 2 */}
                                <div className="player-square player-two">
                                    <div className="player-info-header">
                                        <div className={`player-photo-mock ${isPlayerAmin(players[1]) ? 'is-amin' : ''}`}></div>
                                        <p className="player-name">{getPlayerInitials(players[1])}</p>
                                    </div>
                                    <div className="player-details">
                                        <p className="player-serie">Serie: {player2Data?.category}</p>
                                        <p className="player-points">Puntos: {player2Data?.points}</p>
                                    </div>
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
                    <label className="form-label" style={{color: 'Black'}}>Seleccionar Ganador</label>
                    <div>
                        {isDoubles ? (

                            <>
                                <div className="form-check" style={{marginTop: '10px'}}>
                                    {players[0] && players[1] && (
                                        <label style={{color: 'Black', marginRight: '15px'}}>
                                            <input
                                                type="radio"
                                                name="winnerSelection"
                                                className="with-gap"
                                                // Comprueba si el primer ganador en el array es player1Data
                                                checked={dataWinner[0]?.email === player1Data?.email}
                                                onChange={() => {
                                                    // Asigna un array con los dos jugadores si existen
                                                    if (player1Data && player2Data) {
                                                        setDataWinner([player1Data, player2Data]);
                                                    }
                                                }}
                                            />
                                            <span>{`${getPlayerInitials(players[0])} & ${getPlayerInitials(players[1])}`}</span>
                                        </label>
                                    )}
                                    {players[2] && players[3] && (
                                        <label style={{color: 'Black'}}>
                                            <input
                                                type="radio"
                                                name="winnerSelection"
                                                className="with-gap"
                                                // Comprueba si el primer ganador en el array es player3Data
                                                checked={dataWinner[0]?.email === player3Data?.email}
                                                onChange={() => {
                                                    // Asigna un array con los dos jugadores si existen
                                                    if (player3Data && player4Data) {
                                                        setDataWinner([player3Data, player4Data]);
                                                    }
                                                }}
                                            />
                                            <span>{`${getPlayerInitials(players[2])} & ${getPlayerInitials(players[3])}`}</span>
                                        </label>
                                    )}
                                </div>

                            </>
                        ) : (
                            <>
                                <div className="form-check" style={{marginTop: '10px'}}>
                                    {players[0] && (
                                        <label style={{color: 'Black', marginRight: '15px'}}>
                                            <input
                                                type="radio"
                                                name="winnerSelection"
                                                className="with-gap"
                                                checked={dataWinner[0]?.email === player1Data?.email}
                                                // Asigna un array con el jugador si existe
                                                onChange={() => player1Data && setDataWinner([player1Data])}
                                            />
                                            <span>{getPlayerInitials(players[0])}</span>
                                        </label>
                                    )}
                                    {players[1] && (
                                        <label style={{color: 'Black'}}>
                                            <input
                                                type="radio"
                                                name="winnerSelection"
                                                className="with-gap"
                                                // La comprobación también debe ser sobre el primer elemento del array
                                                checked={dataWinner[0]?.email === player2Data?.email}
                                                // Asigna un array con el jugador si existe
                                                onChange={() => player2Data && setDataWinner([player2Data])}
                                            />
                                            <span>{getPlayerInitials(players[1])}</span>
                                        </label>
                                    )}
                                </div>

                            </>

                        )}
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-primary blue darken-1" onClick={handleSave} disabled={loading}>
                        {loading ? <FontAwesomeIcon icon={faSpinner} spin/> : 'Guardar'}
                    </button>
                    <button
                        className="btn btn-secondary modal-close blue darken-4"
                        style={{marginLeft: "10px"}}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchResultUpdate;