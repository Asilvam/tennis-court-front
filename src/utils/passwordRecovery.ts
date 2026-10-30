import axios from 'axios';

export const PASSWORD_RECOVERY_MESSAGE = 'Si el correo pertenece a una cuenta activa y no solicitaste recuperación en las últimas 24 horas, recibirás un enlace para restablecer tu contraseña. Revisa también tu carpeta de spam.';
export const ADMIN_PASSWORD_RECOVERY_MESSAGE = 'Si el correo pertenece a una cuenta activa, recibirá un enlace de un solo uso que vence en 24 horas. Revisa también la carpeta de spam.';

export function readPasswordResetToken(hash: string): string {
    if (!hash.startsWith('#')) return '';
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const tokens = params.getAll('token');
    return tokens.length === 1 && /^[a-f0-9]{64}$/.test(tokens[0]) ? tokens[0] : '';
}

export function validateResetPasswords(password: string, confirmation: string): void {
    if (password.length < 6 || new TextEncoder().encode(password).length > 72) {
        throw new Error('La contraseña debe tener al menos 6 caracteres y un máximo de 72 bytes.');
    }
    if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
}

export async function requestPasswordRecovery(
    apiUrl: string,
    email: string,
    options: { admin?: boolean; token?: string | null } = {},
    client: Pick<typeof axios, 'post'> = axios,
): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Ingresa un correo electrónico válido.');
    if (options.admin && !options.token?.trim()) throw new Error('Debes iniciar sesión como administrador.');
    const config = options.admin ? { headers: { Authorization: `Bearer ${options.token}` } } : undefined;
    await client.post(`${apiUrl}/register/${options.admin ? 'admin/resetpass' : 'password-recovery'}`, { email: normalizedEmail }, config);
}

export async function confirmPasswordRecovery(
    apiUrl: string,
    token: string,
    password: string,
    confirmation: string,
    client: Pick<typeof axios, 'post'> = axios,
): Promise<void> {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('El enlace no es válido. Solicita uno nuevo.');
    validateResetPasswords(password, confirmation);
    await client.post(`${apiUrl}/register/password-recovery/confirm`, { token, password, passwordConfirmation: confirmation });
}
