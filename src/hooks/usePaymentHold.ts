import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { getTokenFromLocalStorage } from '../utils/tokenUtils';

type Hold = { idCourtReserve: string; holdExpiresAt: string; serverNow: string };
type Slot = { court: string; dateToPlay?: string; turn?: string; isVisit: boolean };

export function usePaymentHold(enabled: boolean, slot: Slot) {
    const apiUrl = import.meta.env.VITE_API_URL;
    const token = getTokenFromLocalStorage();
    const [hold, setHold] = useState<Hold | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [now, setNow] = useState(Date.now());
    const request = useRef<Promise<Hold | null> | null>(null);
    const transition = useRef<Promise<void>>(Promise.resolve());
    const checkoutStarted = useRef(false);
    const clockOffset = useRef(0);
    const initialVisit = useRef(slot.isVisit);
    initialVisit.current = slot.isVisit;

    useEffect(() => {
        if (!enabled) { request.current = null; setHold(null); setLoading(false); setError(''); return; }
        let disposed = false;
        checkoutStarted.current = false;
        setLoading(true);
        setError('');
        setHold(null);
        const isVisit = initialVisit.current;
        // Wait for the previous slot's release; StrictMode must not create two holds.
        const pending = transition.current.then(() => {
            if (disposed) return null;
            return axios.post<Hold>(`${apiUrl}/court-reserve/holds`, {
                court: slot.court, dateToPlay: slot.dateToPlay, turn: slot.turn,
                isVisit, visitName: isVisit ? 'Visita' : undefined,
            }, { headers: { Authorization: `Bearer ${token}` } }).then(response => response.data);
        });
        request.current = pending;
        void pending.then(value => {
            if (!disposed && value) {
                clockOffset.current = Date.parse(value.serverNow) - Date.now();
                setHold(value); setNow(Date.now() + clockOffset.current);
            }
        }).catch(reason => {
            if (!disposed) setError(axios.isAxiosError(reason) ? String(reason.response?.data?.message || 'No se pudo retener el horario.') : 'No se pudo retener el horario.');
        }).finally(() => { if (!disposed) setLoading(false); });

        return () => {
            disposed = true;
            const keepCheckout = checkoutStarted.current;
            transition.current = pending.then(async value => {
                if (value && !keepCheckout) await axios.delete(`${apiUrl}/court-reserve/holds/${value.idCourtReserve}`, { headers: { Authorization: `Bearer ${token}` } });
            }).catch(() => { /* Expiration is the fallback after a lost connection. */ });
        };
    }, [enabled, slot.court, slot.dateToPlay, slot.turn, apiUrl, token]);

    useEffect(() => {
        if (!hold) return;
        const timer = window.setInterval(() => setNow(Date.now() + clockOffset.current), 1000);
        return () => window.clearInterval(timer);
    }, [hold]);

    const release = async () => {
        const value = await request.current?.catch(() => null);
        if (!value) { await transition.current; return; }
        await axios.delete(`${apiUrl}/court-reserve/holds/${value.idCourtReserve}`, { headers: { Authorization: `Bearer ${token}` } });
        setHold(null);
    };

    const remainingSeconds = hold ? Math.max(0, Math.ceil((Date.parse(hold.holdExpiresAt) - now) / 1000)) : 0;
    const remainingMs = () => hold ? Math.max(0, Date.parse(hold.holdExpiresAt) - Date.now() - clockOffset.current) : 0;
    return { hold, loading, error, remainingSeconds, remainingMs, release, checkoutStarted };
}
