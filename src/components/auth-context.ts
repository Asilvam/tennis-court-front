import { createContext } from 'react';
import { SessionEndReason } from '../utils/authSession';

export interface User {
    name: string;
    email: string;
    role: string;
    financiallyRestricted?: boolean;
}

export interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    login: (userData: User, token: string) => void;
    logout: (reason?: SessionEndReason) => void;
    sessionEndReason: SessionEndReason | null;
    acknowledgeSessionEnd: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
