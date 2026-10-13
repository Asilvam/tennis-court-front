import React, { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import { getTokenFromLocalStorage } from '../utils/tokenUtils';
import { ADMIN_PASSWORD_RECOVERY_MESSAGE, PASSWORD_RECOVERY_MESSAGE, requestPasswordRecovery } from '../utils/passwordRecovery';
import '../styles/ResetPassword.css';

const ResetPassword = ({ adminRequest = false }: { adminRequest?: boolean }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL;

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (loading) return;
        setLoading(true);

        try {
            await requestPasswordRecovery(apiUrl, email, { admin: adminRequest, token: adminRequest ? getTokenFromLocalStorage() : undefined });
            await Swal.fire({ icon: 'warning', title: 'Solicitud recibida', text: adminRequest ? ADMIN_PASSWORD_RECOVERY_MESSAGE : PASSWORD_RECOVERY_MESSAGE, confirmButtonColor: '#fbbf24', customClass: { popup: 'password-recovery-popup' } });
            setEmail('');
        } catch (error: unknown) {
            const message = axios.isAxiosError(error) ? 'No se pudo procesar la solicitud. Inténtalo nuevamente más tarde.'
                : error instanceof Error ? error.message : 'No se pudo procesar la solicitud.';
            await Swal.fire({ icon: 'error', title: 'Error', text: message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reset-password-container">
            <div className="password-recovery-eyebrow"><span aria-hidden="true">⚠</span> Seguridad de tu cuenta</div>
            <h3>{adminRequest ? 'Solicitar restablecimiento' : 'Recuperar contraseña'}</h3>
            <p>Envía un enlace para elegir una nueva contraseña. La contraseña actual seguirá funcionando hasta confirmar el cambio.</p>
            <div className="password-recovery-warning">
                <strong>Antes de continuar</strong>
                <p>{adminRequest ? 'Como administrador puedes solicitar otro enlace sin esperar 24 horas. El enlace nuevo invalida el anterior.' : 'Solo se permite una solicitud cada 24 horas, incluso si falla el envío.'} El correo debe pertenecer a una cuenta activa del club.</p>
                <p>El enlace vence en {adminRequest ? '24 horas' : '15 minutos'}. Solicítalo solo si necesitas cambiar tu contraseña y tienes acceso a ese correo.</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email-input">Correo Electrónico</label>
                    <input
                        id="email-input"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ejemplo@correo.com"
                        disabled={loading}
                        required
                    />
                </div>

                <button type="submit" className="submit-button" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>
            </form>

            {!adminRequest && <p><Link to="/login">Volver a iniciar sesión</Link></p>}
        </div>
    );
};

export default ResetPassword;
