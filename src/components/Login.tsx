import React, {useState} from 'react';
import axios from 'axios';
import {useAuth} from "./AuthContext.tsx";
import {Link, useNavigate} from 'react-router-dom';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faSpinner} from "@fortawesome/free-solid-svg-icons";
import Swal from 'sweetalert2';

export interface LoginResponse {
    accessToken: string;
    username: string;
    namePlayer: string;
    role: string;
}

const Login: React.FC = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<never | null>(null);
    const [generateLoading, setGenerateLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerateLoading(true);
        try {
            const response = await axios.post<LoginResponse>(`${apiUrl}/auth/login`, {username, password});
            const { accessToken, namePlayer, role } = response.data;
            login({ name: namePlayer, email: username, role }, accessToken);
            await Swal.fire({
                title: 'Login OK',
                text: `Bienvenido(a) ${namePlayer}!`,
                icon: 'success',
            });
            navigate('/');
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                // Handle AxiosError specifically
                if (error.response) {
                    // Server responded with a status code outside the range of 2xx
                    console.log('Response data:', error.response.data);
                    console.log('Response status:', error.response.status);
                    setError(error.response.data.message);
                }
            }
        } finally {
            setGenerateLoading(false); // Stop loading spinner
        }
    };

    return (
        <div className="row">
            <div className="col s12 m6 offset-m3">
                <div className="card">
                    <div className="card-content">
                        <h3 className="left-align">Login</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="input-field">
                                <label htmlFor="email">Email:</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                            <div className="input-field">
                                <label htmlFor="password">Password:</label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <div className="left-align">
                                <button
                                    className="btn waves-effect waves-light blue darken-4"
                                    type="submit"
                                    disabled={generateLoading}
                                    style={{marginTop: '20px'}}
                                >
                                    {generateLoading ? (
                                        <FontAwesomeIcon icon={faSpinner} spin fixedWidth/>
                                    ) : (
                                        'Login'
                                    )}
                                </button>

                            </div>
                            {error && <p className="red-text">{error}</p>}
                        </form>
                        <div className="card-content">
                            <div className="row">
                            <div className="col s12">
                                    <h6>¡Bienvenido a Club de Tenis Quintero APP!</h6>
                                    <p>Para acceder a nuestros servicios, por favor inicia sesión en tu cuenta.</p>
                                    <p>Si aún no tienes una cuenta, puedes <Link to="/register">registrarte</Link> para convertirte en miembro de nuestro club.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default Login;
