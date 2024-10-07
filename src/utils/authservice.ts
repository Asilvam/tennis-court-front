import axios from 'axios';

interface LoginResponse {
    token: string;
}

export const login = async (email: string, password: string): Promise<string> => {
    try {
        const response = await axios.post<LoginResponse>('/api/login', { email, password });
        return response.data.token; // Extract the token from the response
    } catch (error) {
        // Handle errors (e.g., show an error message to the user)
        console.error('Login failed', error);
        throw new Error('Login failed');
    }
};
