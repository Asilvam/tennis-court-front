import React, {useState} from 'react';
import axios from 'axios';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faSpinner, faTrophy, faCheckCircle} from "@fortawesome/free-solid-svg-icons";
import Swal from 'sweetalert2';
import '../styles/MatchResult.css';

interface PlayerData {
    email: string;
    name: string;
    points: string;
    category: string;
    cellular: string;
}

interface ValidateMatchResponse {
    players: string[];
    isDouble: boolean;
    isValid: boolean;
    dataPlayers: PlayerData[];
}

const MatchResultUpdate: React.FC = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [matchId, setMatchId] = useState('');
    const [matchPass, setMatchPass] = useState('');
    const [isValid, setIsValid] = useState(false);
    const [players, setPlayers] = useState<string[]>([]);
    const [isDoubles, setIsDoubles] = useState(false);
    const [result, setResult] = useState('');
    const [dataWinner, setDataWinner] = useState<PlayerData[]>([]);
    const [dataLooser, setDataLooser] = useState<PlayerData[]>([]);
    const [loading, setLoading] = useState(false);
    const [dataUpdateRanking, setDataUpdateRanking] = useState(null);
    const [player1Data, setPlayer1Data] = useState<PlayerData | null>(null);
    const [player2Data, setPlayer2Data] = useState<PlayerData | null>(null);
    const [player3Data, setPlayer3Data] = useState<PlayerData | null>(null);
    const [player4Data, setPlayer4Data] = useState<PlayerData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const getPlayerInitials = (fullName?: string): string => {
        if (!fullName) return '';
        const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
        if (nameParts.length === 0) return '';

        const firstInitial = nameParts[0][0].toUpperCase() + '.';
        if (nameParts.length > 1) {
            const lastName = nameParts[nameParts.length - 1];
            if (lastName && lastName[0]) {
                const lastInitial = lastName[0].toUpperCase() + '.';
                return `${firstInitial} ${lastInitial}`;
            }
        }
        return firstInitial;
    };

    const handleError = (error: any) => {
        if (axios.isAxiosError(error)) {
            if (error.response) {
                if (error.response.status === 400) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Solicitud inválida',
                        text: error.response.data.message || 'La solicitud enviada no es válida.',
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: `Error ${error.response.status}`,
                        text: error.response.data.message || 'Ocurrió un problema en la solicitud.',
                    });
                }
            } else if (error.request) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Sin respuesta del servidor',
                    text: 'El servidor no respondió. Por favor, inténtalo más tarde.',
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error en la solicitud',
                    text: error.message || 'Hubo un problema al enviar la solicitud.',
                });
            }
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error inesperado',
                text: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
            });
        }
    };

    const validateMatch = async () => {
        if (!matchId || !matchPass) {
            Swal.fire({
                icon: 'warning',
                title: 'Datos incompletos',
                text: 'Por favor ingresa el ID y la clave del partido.',
            });
            return;
        }

        try {
            setLoading(true);
            const {data}: { data: ValidateMatchResponse } = await axios.post(`${apiUrl}/match-ranking/validate-match`, {
                id: matchId,
                pass: matchPass,
            });
            
            setPlayers(data.players);
            setIsDoubles(data.isDouble);
            setIsValid(data.isValid);

            setPlayer1Data(data.dataPlayers[0] || null);
            setPlayer2Data(data.dataPlayers[1] || null);

            if (data.isDouble) {
                setPlayer3Data(data.dataPlayers[2] || null);
                setPlayer4Data(data.dataPlayers[3] || null);
            } else {
                setPlayer3Data(null);
                setPlayer4Data(null);
            }

            setDataUpdateRanking(() => data.players.map((player: string, index: number) => ({
                    player,
                    ...(data.dataPlayers[index] || {}),
                }))
            );

            if (data.isValid) {
                setIsModalOpen(true);
            }
        } catch (error: any) {
            console.error('Error in Validate Match component:', error);
            handleError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (result && dataWinner.length > 0) {
            setLoading(true);
            try {
                await axios.post(`${apiUrl}/match-ranking`, {
                    matchId,
                    result,
                    winner: dataWinner,
                    looser: dataLooser,
                });

                setIsModalOpen(false);

                Swal.fire({
                    icon: 'success',
                    title: 'Resultado guardado',
                    text: `El resultado fue guardado con éxito`,
                    timer: 3000,
                    showConfirmButton: false,
                });
                
                // Reset fields
                setMatchId('');
                setMatchPass('');
                setIsValid(false);
                setPlayers([]);
                setResult('');
                setDataWinner([]);
                setDataLooser([]);
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

    const handleCloseModal = () => {
        setIsModalOpen(false);
        // Optional: Reset result/winner selection if cancelled?
        // setResult('');
        // setDataWinner([]);
    };

    return (
        <div className="match-result-container">
            <h5 className="match-result-title">Ingresar Resultado Match</h5>
            
            <div className="form-group">
                <label className="form-label">ID del Partido</label>
                <input
                    type="text"
                    className="form-input"
                    value={matchId}
                    onChange={(e) => setMatchId(e.target.value)}
                    placeholder="Ej: 12345"
                />
            </div>
            
            <div className="form-group">
                <label className="form-label">Clave del Partido</label>
                <input
                    type="password"
                    className="form-input"
                    value={matchPass}
                    onChange={(e) => setMatchPass(e.target.value)}
                    placeholder="••••••"
                />
            </div>
            
            <button 
                className="btn-validate"
                disabled={loading}
                onClick={validateMatch}
            >
                {loading ? (
                    <>
                        <FontAwesomeIcon icon={faSpinner} spin className="mr-2" style={{marginRight: '8px'}} />
                        Validando...
                    </>
                ) : (
                    'Validar Partido'
                )}
            </button>

            {/* Custom Modal for Result Entry */}
            {isModalOpen && (
                <div className="match-modal-overlay" onClick={handleCloseModal}>
                    <div className="match-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="match-modal-header">
                            <h5>Confirmar Resultado</h5>
                        </div>
                        
                        <div className="match-modal-body">
                            {/* Players VS Display */}
                            <div className="players-vs-container">
                                <div className="player-card-mini">
                                    <div className="player-avatar">
                                        {isDoubles ? <FontAwesomeIcon icon={faTrophy} /> : getPlayerInitials(players[0]).charAt(0)}
                                    </div>
                                    <div className="player-name">
                                        {isDoubles 
                                            ? `${getPlayerInitials(players[0])} & ${getPlayerInitials(players[1])}`
                                            : getPlayerInitials(players[0])
                                        }
                                    </div>
                                    <div className="player-stats">
                                        {player1Data?.category} | {player1Data?.points} pts
                                    </div>
                                </div>

                                <div className="vs-badge">VS</div>

                                <div className="player-card-mini">
                                    <div className="player-avatar">
                                        {isDoubles ? <FontAwesomeIcon icon={faTrophy} /> : (isDoubles ? getPlayerInitials(players[2]).charAt(0) : getPlayerInitials(players[1]).charAt(0))}
                                    </div>
                                    <div className="player-name">
                                        {isDoubles 
                                            ? `${getPlayerInitials(players[2])} & ${getPlayerInitials(players[3])}`
                                            : getPlayerInitials(players[1])
                                        }
                                    </div>
                                    <div className="player-stats">
                                        {isDoubles ? player3Data?.category : player2Data?.category} | {isDoubles ? player3Data?.points : player2Data?.points} pts
                                    </div>
                                </div>
                            </div>

                            {/* Result Input */}
                            <div className="form-group">
                                <label className="form-label">Marcador del Set</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={result}
                                    onChange={(e) => setResult(e.target.value)}
                                    placeholder="Ej: 6-4, 3-6, 7-6"
                                />
                            </div>

                            {/* Winner Selection */}
                            <div className="form-group">
                                <label className="form-label">Seleccionar Ganador</label>
                                <div className="winner-selection-group">
                                    {/* Option 1 */}
                                    <label className="winner-option">
                                        <input
                                            type="radio"
                                            name="winnerSelection"
                                            checked={dataWinner[0]?.email === (isDoubles ? player1Data?.email : player1Data?.email)}
                                            onChange={() => {
                                                if (isDoubles) {
                                                    if (player1Data && player2Data) setDataWinner([player1Data, player2Data]);
                                                    if (player3Data && player4Data) setDataLooser([player3Data, player4Data]);
                                                } else {
                                                    if (player1Data) setDataWinner([player1Data]);
                                                    if (player2Data) setDataLooser([player2Data]);
                                                }
                                            }}
                                        />
                                        <div className="winner-card">
                                            <span>
                                                {isDoubles 
                                                    ? `${getPlayerInitials(players[0])} & ${getPlayerInitials(players[1])}`
                                                    : getPlayerInitials(players[0])
                                                }
                                            </span>
                                        </div>
                                    </label>

                                    {/* Option 2 */}
                                    <label className="winner-option">
                                        <input
                                            type="radio"
                                            name="winnerSelection"
                                            checked={dataWinner[0]?.email === (isDoubles ? player3Data?.email : player2Data?.email)}
                                            onChange={() => {
                                                if (isDoubles) {
                                                    if (player3Data && player4Data) setDataWinner([player3Data, player4Data]);
                                                    if (player1Data && player2Data) setDataLooser([player1Data, player2Data]);
                                                } else {
                                                    if (player2Data) setDataWinner([player2Data]);
                                                    if (player1Data) setDataLooser([player1Data]);
                                                }
                                            }}
                                        />
                                        <div className="winner-card">
                                            <span>
                                                {isDoubles 
                                                    ? `${getPlayerInitials(players[2])} & ${getPlayerInitials(players[3])}`
                                                    : getPlayerInitials(players[1])
                                                }
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div className="match-modal-footer">
                            <button className="btn-cancel" onClick={handleCloseModal} disabled={loading}>
                                Cancelar
                            </button>
                            <button className="btn-save" onClick={handleSave} disabled={loading}>
                                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <><FontAwesomeIcon icon={faCheckCircle} /> Guardar Resultado</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MatchResultUpdate;
