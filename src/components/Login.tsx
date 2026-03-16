import React, {useState} from 'react';
import axios from 'axios';
import {useAuth} from "./AuthContext.tsx";
import {Link, useNavigate} from 'react-router-dom';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faSpinner, faUserCircle, faEnvelope, faLock} from "@fortawesome/free-solid-svg-icons";
import Swal from 'sweetalert2';
import '../styles/Login.css';

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
    const [error, setError] = useState<string | null>(null);
    const [generateLoading, setGenerateLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerateLoading(true);
        setError(null); // Clear previous errors
        try {
            const response = await axios.post<LoginResponse>(`${apiUrl}/auth/login`, {username, password});
            const { accessToken, namePlayer, role } = response.data;
            login({ name: namePlayer, email: username, role }, accessToken);
            
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer)
                    toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            })

            Toast.fire({
                icon: 'success',
                title: `¡Bienvenido(a) ${namePlayer}!`
            })
            
            navigate('/');
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    setError(error.response.data.message || 'Credenciales inválidas');
                } else {
                    setError('Error de conexión. Intente más tarde.');
                }
            } else {
                setError('Ocurrió un error inesperado.');
            }
        } finally {
            setGenerateLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <FontAwesomeIcon icon={faUserCircle} className="login-icon" />
                    <h3>Iniciar Sesión</h3>
                    <p>Accede a tu cuenta del Club</p>
                </div>
                
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="email">
                            <FontAwesomeIcon icon={faEnvelope} className="mr-2" style={{marginRight: '8px'}} />
                            Correo Electrónico
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="ejemplo@correo.com"
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password">
                            <FontAwesomeIcon icon={faLock} className="mr-2" style={{marginRight: '8px'}} />
                            Contraseña
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <button
                        className="login-btn"
                        type="submit"
                        disabled={generateLoading}
                    >
                        {generateLoading ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" style={{marginRight: '8px'}} />
                                Procesando...
                            </>
                        ) : (
                            'Ingresar'
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <h6>¿Nuevo en el Club?</h6>
                    <p>Regístrate para reservar canchas y participar en torneos.</p>
                    <Link to="/register">Crear una cuenta</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
