import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { confirmPasswordRecovery, readPasswordResetToken } from '../utils/passwordRecovery';
import '../styles/ResetPassword.css';

const ConfirmPasswordReset = () => {
    // Keep the token only in this component's memory, never in localStorage.
    const [token, setToken] = useState(() => readPasswordResetToken(window.location.hash));
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const [complete, setComplete] = useState(false);
    const [error, setError] = useState('');
    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        window.history.replaceState(window.history.state, '', window.location.pathname);
        const policy = document.createElement('meta');
        policy.name = 'referrer';
        policy.content = 'no-referrer';
        document.head.appendChild(policy);
        return () => policy.remove();
    }, []);

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (loading || complete) return;
        setLoading(true);
        setError('');
        try {
            await confirmPasswordRecovery(apiUrl, token, password, confirmation);
            setComplete(true);
            setToken('');
            setPassword('');
            setConfirmation('');
        } catch (failure: unknown) {
            const message = axios.isAxiosError(failure)
                ? failure.response?.status === 400 ? 'El enlace no es válido o ha vencido. Solicita uno nuevo.' : 'No se pudo guardar el cambio. Inténtalo nuevamente más tarde.'
                : failure instanceof Error ? failure.message : 'No se pudo guardar el cambio.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reset-password-container">
            <div className="password-recovery-eyebrow"><span aria-hidden="true">⚠</span> Seguridad de tu cuenta</div>
            <h3>Restablecer contraseña</h3>
            {complete ? <>
                <p role="status">Contraseña actualizada. Puedes iniciar sesión con tu nueva contraseña.</p>
                <Link to="/login">Ir a iniciar sesión</Link>
            </> : !token ? <>
                <p role="alert">El enlace no es válido. Solicita uno nuevo.</p>
                <Link to="/recuperar-contrasena">Recuperar contraseña</Link>
            </> : <>
                <div className="password-recovery-warning">
                    <strong>Vas a cambiar tu contraseña</strong>
                    <p>Al confirmar, la contraseña anterior dejará de funcionar. El enlace solo puede utilizarse una vez y vence según el plazo indicado en tu correo.</p>
                    <p>El formulario público permite una solicitud cada 24 horas. Si necesitas otro enlace antes, comunícate con administración.</p>
                </div>
                <form onSubmit={submit}>
                    <div className="form-group">
                        <label htmlFor="new-password">Nueva contraseña</label>
                        <input id="new-password" type="password" autoComplete="new-password" minLength={6} maxLength={72} value={password} onChange={event => setPassword(event.target.value)} disabled={loading} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirm-password">Confirmar contraseña</label>
                        <input id="confirm-password" type="password" autoComplete="new-password" minLength={6} maxLength={72} value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={loading} required />
                    </div>
                    {error && <p role="alert">{error}</p>}
                    <button className="submit-button" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar nueva contraseña'}</button>
                </form>
                <p><Link to="/recuperar-contrasena">Solicitar otro enlace</Link></p>
            </>}
        </div>
    );
};

export default ConfirmPasswordReset;
