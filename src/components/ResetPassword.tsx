import React, { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2'; // 1. Importar SweetAlert2
import '../styles/ResetPassword.css';

const ResetPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    // 2. El estado 'feedback' ya no es necesario, lo he eliminado.

    const apiUrl = import.meta.env.VITE_API_URL;

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!email) {
            // 3. Reemplazar el feedback con SweetAlert2 para validaciones
            Swal.fire({
                icon: 'warning',
                title: 'Campo Requerido',
                text: 'Por favor, ingresa un correo electrónico.',
            });
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post(`${apiUrl}/register/resetpass`, { email });

            if (response.data.success) {
                // 4. Usar SweetAlert2 para el mensaje de éxito
                Swal.fire({
                    icon: 'success',
                    title: '¡Enviado!',
                    text: 'Se ha enviado un correo con la nueva contraseña al usuario.',
                    timer: 2500,
                    showConfirmButton: false,
                });
                setEmail(''); // Limpia el campo de email si fue exitoso
            } else {
                // 5. Usar SweetAlert2 para mostrar errores controlados del backend
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: response.data.message || 'No se pudo completar la solicitud.',
                });
            }

        } catch (error) {
            console.error('Error al intentar restablecer la contraseña:', error);
            // 6. Usar SweetAlert2 para errores de conexión o inesperados
            Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                text: 'No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reset-password-container">
            <h3>Restablecer Contraseña</h3>
            <p>Ingresa el correo del usuario para enviarle una nueva contraseña.</p>

            <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                    <label htmlFor="email-input">Correo Electrónico</label>
                    <input
                        id="email-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ejemplo@correo.com"
                        disabled={loading}
                        required
                    />
                </div>

                <button type="submit" className="submit-button" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar Correo'}
                </button>
            </form>

            {/* 7. El div para mostrar el feedback ha sido eliminado */}
        </div>
    );
};

export default ResetPassword;