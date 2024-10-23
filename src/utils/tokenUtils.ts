// Define a type for your token data
interface TokenData {
    token: string;
}
// Retrieve token from localStorage
const getTokenFromLocalStorage = (): string | null => {
    const tokenDataString = localStorage.getItem('token');
    if (tokenDataString) {
        // const tokenData: TokenData = JSON.parse(tokenDataString);
        console.log('Token retrieved from localStorage');
        return tokenDataString;
    }
    return null;
};
// Set token in localStorage
const setTokenInLocalStorage = (token: string): void => {
    const tokenData: TokenData = { token };
    localStorage.setItem('token', JSON.stringify(tokenData));
    console.log('Token set in localStorage');
};

const existTokenInLocalStorage = (): boolean => !!localStorage.getItem('token');

// Remove token from localStorage
const removeTokenFromLocalStorage = (): boolean => {
    if (localStorage.getItem('token')) {
        localStorage.removeItem('token');
        // console.log('Token removed from localStorage');
        return true;
    }
        return false;
};

export { getTokenFromLocalStorage, setTokenInLocalStorage, removeTokenFromLocalStorage,  existTokenInLocalStorage };
