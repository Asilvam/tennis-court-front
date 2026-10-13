import axios from 'axios';

export async function updateProfileImage(
    apiUrl: string,
    email: string,
    file: Blob,
    token: string | null,
    client: Pick<typeof axios, 'post' | 'patch'> = axios,
): Promise<string> {
    if (!token?.trim() || !email.trim()) {
        throw new Error('Debes iniciar sesión para actualizar tu foto.');
    }
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const formData = new FormData();
    formData.append('image', file);
    const response = await client.post(`${apiUrl}/register/profile`, formData, config);
    const imageUrlProfile: unknown = response.data?.imageUrl;
    if (typeof imageUrlProfile !== 'string' || !imageUrlProfile.trim()) {
        throw new Error('El servidor no devolvió una imagen válida.');
    }
    await client.patch(`${apiUrl}/register/${encodeURIComponent(email)}`, { imageUrlProfile }, config);
    return imageUrlProfile;
}
