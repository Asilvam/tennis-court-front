import React, { createContext, useState, ReactNode } from 'react';

// Define the user info type
interface UserInfo {
    name: string;
    email: string;
    role: string;
}

// Define the UserContext type
interface UserContextType {
    userInfo: UserInfo;
    setUserInfo: (userInfo: UserInfo) => void;
}

// Create the UserContext with an undefined initial value
export const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
    children: ReactNode;
}

// UserProvider to wrap your app
export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
    const [userInfo, setUserInfo] = useState<UserInfo>({
        name: '',
        email: '',
        role: ''
    });

    return (
        <UserContext.Provider value={{ userInfo, setUserInfo }}>
            {children}
        </UserContext.Provider>
    );
};
