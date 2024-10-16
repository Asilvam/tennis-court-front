import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import axios from "axios";

// Function to convert VAPID public key from base64 to UInt8Array
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

// Function to subscribe user to push notifications
const subscribeUserToPush = async () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const apiVapidPublicKey = import.meta.env.VITE_API_URL_VAPID_PUBLIC_KEY;
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(apiVapidPublicKey), // Replace with your VAPID public key
        });

        await axios.post(`${apiUrl}/notifications/subscribe`, subscription, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('User subscribed to push notifications:', subscription);
    } catch (error) {
        console.error('Failed to subscribe the user to push notifications:', error);
    }
};

// Function to register the service worker and subscribe to push notifications
const registerServiceWorkerAndSubscribe = () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
                console.log('Service Worker registered with scope:', registration.scope);
                subscribeUserToPush();
            })
            .catch((error) => {
                console.error('Service Worker registration failed:', error);
            });
    }
};

const Main: React.FC = () => {
    useEffect(() => {
        registerServiceWorkerAndSubscribe();
    }, []);

    return <App />;
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<Main />);
