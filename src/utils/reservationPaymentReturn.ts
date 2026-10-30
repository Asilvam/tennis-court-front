export const reservationReturnPath = (path: string) => /^\/payment\/(success|failure|pending)$/.test(path);

export function reservationReturnReference(params: URLSearchParams): string | null {
    const explicit = params.get('reservation');
    const legacy = params.get('external_reference');
    if (params.getAll('reservation').length > 1 || params.getAll('external_reference').length > 1) return null;
    if (explicit && legacy && explicit !== legacy) return null;
    const id = explicit || legacy;
    return id && /^[a-z\d_-]{1,80}$/i.test(id) && !['null', 'undefined'].includes(id) ? id : null;
}

export function reservationReturnStatus(value: unknown, id: string): 'CONFIRMED' | 'REVIEW' | 'WAITING' {
    const data = value as { reservationId?: unknown; status?: unknown } | null;
    if (data?.reservationId !== id || !['CONFIRMED', 'REVIEW', 'WAITING'].includes(String(data.status)))
        throw new Error('Respuesta de verificacion no valida');
    return data.status as 'CONFIRMED' | 'REVIEW' | 'WAITING';
}
