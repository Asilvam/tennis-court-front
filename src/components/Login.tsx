import React, {useState} from 'react';
import axios from 'axios';
import {useAuth} from "./AuthContext.tsx";
import {useNavigate} from 'react-router-dom';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faSpinner} from "@fortawesome/free-solid-svg-icons";

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
    const {setToken} = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerateLoading(true);
        try {
            const response = await axios.post<LoginResponse>(apiUrl + '/auth/login', {username, password});
            const {accessToken, namePlayer, role} = response.data;
            setToken(accessToken);
            navigate('/dashboard', { state: { username, namePlayer, role } });
        } catch (err) {
            console.error(err)
            setError('Login failed');
        }
        setGenerateLoading(false);
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
                                    className="btn waves-effect waves-light"
                                    type="submit"
                                    disabled={generateLoading}
                                    style={{marginTop: '20px'}}
                                >
                                    {generateLoading && (
                                        <FontAwesomeIcon icon={faSpinner} spin fixedWidth/>
                                    )}{' '}
                                    Login
                                </button>
                            </div>
                            {error && <p className="red-text">{error}</p>}
                        </form>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default Login;
