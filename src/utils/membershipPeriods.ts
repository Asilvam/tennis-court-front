export function shiftBillingPeriod(period: string, offset: number): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || !Number.isInteger(offset))
    throw new Error("Mes de mensualidad inválido.");
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function billingPeriodRange(first: string, last: string): string[] {
  shiftBillingPeriod(first, 0);
  shiftBillingPeriod(last, 0);
  const periods: string[] = [];
  for (let period = first; period <= last; period = shiftBillingPeriod(period, 1)) {
    if (periods.length >= 1200) throw new Error("El rango de meses es demasiado amplio.");
    periods.push(period);
  }
  return periods;
}
