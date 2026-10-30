export interface PaymentRates {
    currency: 'CLP';
    nightAmount: number;
    visitAmount: number;
    nightVisitAmount: number;
}

export function getReservationPaymentAmount(rates: unknown, isPaidNight: boolean, isVisit: boolean): number {
    if (!isPaidNight && !isVisit) return 0;

    if (!rates || typeof rates !== 'object') {
        throw new Error('No se pudieron obtener las tarifas de pago. Intenta nuevamente.');
    }
    const values = rates as Record<string, unknown>;
    const amounts = [values.nightAmount, values.visitAmount, values.nightVisitAmount];
    if (values.currency !== 'CLP' || amounts.some(amount => typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0)) {
        throw new Error('Las tarifas recibidas no son válidas. Intenta nuevamente más tarde.');
    }

    const validRates = rates as PaymentRates;
    return isPaidNight && isVisit ? validRates.nightVisitAmount : isPaidNight ? validRates.nightAmount : validRates.visitAmount;
}
