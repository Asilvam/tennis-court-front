import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTrophy, faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import Swal from 'sweetalert2';
import { DateTime } from 'luxon';
import { getUserInfoFromLocalStorage } from '../utils/userUtils';
import { getTokenFromLocalStorage } from '../utils/tokenUtils';
import '../styles/MatchResult.css';

interface PlayerData {
    email: string;
    name: string;
    cellular: string;
    categories: [{category :string, points: number, isActive: boolean}]
}

interface ValidateMatchResponse {
    players: string[];
    isDouble: boolean;
    isValid: boolean;
    dataPlayers: PlayerData[];
}

interface Reservation {
    court: string;
    player1: string;
    player2: string;
    player3?: string;
    player4?: string;
    dateToPlay: string;
    turn: string;
    state: boolean;
    visitName?: string;
    idCourtReserve: string;
    passCourtReserve?: string;
    isForRanking: boolean;
    resultMatchUpdated?: boolean;
}

const MatchResultUpdate: React.FC = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const userInfo = getUserInfoFromLocalStorage();
    const token = getTokenFromLocalStorage();
    const namePlayer = userInfo?.name || '';
    const [matchId, setMatchId] = useState('');
    const [players, setPlayers] = useState<string[]>([]);
    const [isDoubles, setIsDoubles] = useState(false);
    const [result, setResult] = useState('');
    const [dataWinner, setDataWinner] = useState<PlayerData[]>([]);
    const [dataLooser, setDataLooser] = useState<PlayerData[]>([]);
    const [loading, setLoading] = useState(false);
    // Solo se utiliza el setter por ahora, para eventualmente guardar info de ranking.
    // Ignoramos el valor para evitar warnings de variable no usada.
    const [, setDataUpdateRanking] = useState<unknown | null>(null);
    const [player1Data, setPlayer1Data] = useState<PlayerData | null>(null);
    const [player2Data, setPlayer2Data] = useState<PlayerData | null>(null);
    const [player3Data, setPlayer3Data] = useState<PlayerData | null>(null);
    const [player4Data, setPlayer4Data] = useState<PlayerData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [reserves, setReserves] = useState<Reservation[]>([]);
    const [loadingReserves, setLoadingReserves] = useState(false);

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

    // Devuelve las categorías relevantes para este partido, según sea singles o dobles.
    const getCategoriesForMatch = (player: PlayerData | null, isDoublesMatch: boolean) => {
        if (!player || !Array.isArray(player.categories)) return [];

        return player.categories.filter((cat) => {
            const name = (cat.category || '').toLowerCase();
            const isDoubleCat = name.includes('dobles');
            return isDoublesMatch ? isDoubleCat : !isDoubleCat;
        });
    };

    // Construye el texto a mostrar con todas las categorías activas (opción B).
    const buildCategoryDisplay = (player: PlayerData | null, isDoublesMatch: boolean): string => {
        const filtered = getCategoriesForMatch(player, isDoublesMatch);
        if (filtered.length === 0) return '-';

        const actives = filtered.filter((c) => c.isActive);
        const categoriesToUse = actives.length > 0 ? actives : filtered;

        return categoriesToUse
            .map((c) => `${c.category} (${c.points} pts)`)
            .join(' / ');
    };

    const handleError = (error: unknown) => {
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

    const fetchReserves = async () => {
        if (!namePlayer || !token) return;

        setLoadingReserves(true);
        try {
            const response = await axios.get<Reservation[]>(`${apiUrl}/court-reserve/isForRankingHistory/${namePlayer}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setReserves(response.data);
        } catch (error) {
            console.error('Error fetching ranking reservations:', error);
            handleError(error);
        } finally {
            setLoadingReserves(false);
        }
    };

    useEffect(() => {
        fetchReserves();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openMatchFromReserve = async (reserve: Reservation) => {
        if (!reserve.idCourtReserve || !reserve.passCourtReserve) {
            Swal.fire({
                icon: 'error',
                title: 'Datos incompletos del partido',
                text: 'No se encontró la información necesaria para validar este partido.',
            });
            return;
        }

        try {
            setLoading(true);
            const { data }: { data: ValidateMatchResponse } = await axios.post(`${apiUrl}/match-ranking/validate-match`, {
                id: reserve.idCourtReserve,
                pass: reserve.passCourtReserve,
            });

            setMatchId(reserve.idCourtReserve);
            setPlayers(data.players);
            setIsDoubles(data.isDouble);

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
                setResult('');
                setDataWinner([]);
                setDataLooser([]);
                setIsModalOpen(true);
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Partido no válido',
                    text: 'Este partido no es válido para actualizar resultado.',
                });
            }
        } catch (error) {
            console.error('Error validating match from reserve:', error);
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
                setPlayers([]);
                setResult('');
                setDataWinner([]);
                setDataLooser([]);
                setPlayer1Data(null);
                setPlayer2Data(null);
                setPlayer3Data(null);
                setPlayer4Data(null);
                setDataUpdateRanking(null);

                // Refresh pending matches list
                fetchReserves();

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

    // Preparar textos de categorías/puntos para cada jugador según singles/dobles.
    const player1Stats = buildCategoryDisplay(player1Data, isDoubles);
    const player2Stats = buildCategoryDisplay(player2Data, isDoubles);
    const player3Stats = buildCategoryDisplay(player3Data, isDoubles);

    return (
        <div className="match-result-container">
            <h5 className="match-result-title">Ingresar Resultado Match</h5>

            <p className="match-result-subtitle">
                Selecciona uno de tus partidos de ranking (últimos 2 días) para ingresar el resultado.
            </p>

            {loadingReserves ? (
                <div className="match-result-loading">
                    <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                    <p>Cargando tus partidos de ranking...</p>
                </div>
            ) : reserves.length === 0 ? (
                <div className="match-result-empty">
                    <h6>No tienes partidos de ranking pendientes</h6>
                    <p>Solo se muestran partidos de los últimos 2 días sin resultado ingresado.</p>
                </div>
            ) : (
                <div className="match-result-table-wrapper">
                    <table className="match-result-table striped">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Cancha</th>
                                <th>Turno</th>
                                <th>Jugadores</th>
                                <th className="center-align">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reserves.map((reserve) => (
                                <tr key={reserve.idCourtReserve}>
                                    <td>{DateTime.fromISO(reserve.dateToPlay).toFormat('dd-MM-yy')}</td>
                                    <td className="center-align">{reserve.court.replace(/\D/g, '')}</td>
                                    <td>{reserve.turn.split('-')[0]}</td>
                                    <td>
                                        {[reserve.player1, reserve.player2, reserve.player3, reserve.player4]
                                            .filter(Boolean)
                                            .join(' / ')}
                                    </td>
                                    <td className="center-align">
                                        <button
                                            className="btn-validate"
                                            disabled={loading}
                                            onClick={() => openMatchFromReserve(reserve)}
                                        >
                                            {loading ? (
                                                <>
                                                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" style={{ marginRight: '8px' }} />
                                                    Abriendo...
                                                </>
                                            ) : (
                                                'Ingresar resultado'
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

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
                                        {player1Stats}
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
                                        {isDoubles ? player3Stats : player2Stats}
                                    </div>
                                </div>
                            </div>

                            {/* Result Input */}
                            <div className="form-group">
                                <label className="form-label">Marcador final</label>
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
