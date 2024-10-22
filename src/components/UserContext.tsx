import React, {createContext, useState, ReactNode, useEffect, useContext} from 'react';

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

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
    const [userInfo, setUserInfo] = useState<UserInfo>(() => {
        const storedUserInfo = localStorage.getItem('userInfo');
        return storedUserInfo ? JSON.parse(storedUserInfo) : { name: '', email: '', role: '' };
    });

    useEffect(() => {
        // Store user info in local storage whenever it changes
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
    }, [userInfo]);

    return (
        <UserContext.Provider value={{ userInfo, setUserInfo }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = (): UserContextType => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
