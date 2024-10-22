interface UserInfo {
    name: string;
    email: string;
    role: 'admin' | 'user';
}

// Retrieve userInfo from localStorage
export const getUserInfoFromLocalStorage = (): string | null => {
    const userInfoDataString = localStorage.getItem('userInfo');
    if (userInfoDataString) {
        try {
            const userInfoData: UserInfo = JSON.parse(userInfoDataString);
            return userInfoData.role;
        } catch (error) {
            console.error('Error parsing userInfo from localStorage:', error);
            return null;
        }
    }
    return null;
};

// Set userInfo in localStorage
export const setUserInfoInLocalStorage = (userInfo: UserInfo): void => {
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    console.log('User Info set in localStorage');
};

// Check if userInfo exists in localStorage
export const existUserInfoInLocalStorage = (): boolean => !!localStorage.getItem('userInfo');

// Remove userInfo from localStorage
export const removeUserInfoFromLocalStorage = (): boolean => {
    if (localStorage.getItem('userInfo')) {
        localStorage.removeItem('userInfo');
        // console.log('userInfo removed from localStorage');
        return true;
    }
    return false;
};
