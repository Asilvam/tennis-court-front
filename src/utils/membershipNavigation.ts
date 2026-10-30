export function memberPaymentsRoute(id: string): string {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new Error('Identificador de socio inválido.');
  return `/adminpayments?memberId=${encodeURIComponent(id)}`;
}

export function membershipUsersReturn(state: unknown) {
  const source = state && typeof state === 'object' ? (state as Record<string, unknown>) : {};
  const returnTo =
    typeof source.returnTo === 'string' && /^\/adminregister(?:\?[^#]*)?$/.test(source.returnTo)
      ? source.returnTo
      : '/adminregister';
  const scrollY =
    typeof source.returnScrollY === 'number' && Number.isFinite(source.returnScrollY)
      ? Math.max(0, source.returnScrollY)
      : 0;
  return { returnTo, state: { adminUsersScrollY: scrollY } };
}
