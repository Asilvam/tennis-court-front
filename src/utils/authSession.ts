import { jwtDecode } from 'jwt-decode';

export type SessionEndReason = 'expired' | 'inactive';

export function tokenExpiry(token: string): number | null {
    try {
        const { exp } = jwtDecode<{ exp?: number }>(token);
        return typeof exp === 'number' && Number.isFinite(exp * 1000) && exp > 0 ? exp * 1000 : null;
    } catch {
        return null;
    }
}

export function currentSessionUnauthorized(error: unknown, token: string, api: string): boolean {
    const failure = error as {
        response?: { status?: number };
        config?: { url?: string; baseURL?: string; headers?: Record<string, unknown> & { get?: (name: string) => unknown } };
    };
    if (failure?.response?.status !== 401 || !failure.config?.url || !api) return false;
    try {
        const base = new URL(api, window.location.origin);
        const requestedUrl = failure.config.baseURL && !/^([a-z][a-z\d+.-]*:)?\/\//i.test(failure.config.url)
            ? `${failure.config.baseURL.replace(/\/$/, '')}/${failure.config.url.replace(/^\//, '')}` : failure.config.url;
        const request = new URL(requestedUrl, window.location.origin);
        const prefix = base.pathname.replace(/\/$/, '');
        if (request.origin !== base.origin || (prefix && request.pathname !== prefix && !request.pathname.startsWith(`${prefix}/`))) return false;
        if (/\/auth\/login\/?$/.test(request.pathname)) return false;
        const headers = failure.config.headers;
        const bearer = typeof headers?.get === 'function' ? headers.get('Authorization') :
            Object.entries(headers || {}).find(([name]) => name.toLowerCase() === 'authorization')?.[1];
        return bearer === `Bearer ${token}`;
    } catch {
        return false;
    }
}
