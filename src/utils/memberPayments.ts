import type { MembershipDue } from './membershipPayments';

export const membershipReference = (value: string | null): value is string =>
  !!value && /^membership-[a-f\d-]{36}$/i.test(value);

export function safeMembershipCheckoutUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      /^(www\.|sandbox\.)?mercadopago\.(cl|com|com\.ar|com\.br)$/.test(url.hostname)
      ? url.href : null;
  } catch { return null; }
}

export function memberCheckoutIdentity(ids: string[], previous?: { hash: string; key: string }, create = () => crypto.randomUUID()) {
  const hash = JSON.stringify([...new Set(ids)].sort());
  return previous?.hash === hash ? previous : { hash, key: create() };
}

export function paymentLoginReturn(value: unknown): string {
  if (typeof value !== 'string') return '/';
  if (value === '/monthlypayments') return value;
  if (!value.startsWith('/monthlypayments?')) return '/';
  try {
    const url = new URL(value, 'https://ctq.invalid');
    const reference = url.searchParams.get('reference');
    return url.origin === 'https://ctq.invalid' && url.pathname === '/monthlypayments' && membershipReference(reference)
      ? `/monthlypayments?reference=${reference}` : '/';
  } catch { return '/'; }
}

export function selectableMemberDues(dues: MembershipDue[], beneficiaryIds: string[], through: string) {
  return dues.filter(row => row.status === 'OPEN' && beneficiaryIds.includes(row.beneficiaryId) && row.period <= through);
}

export interface MembershipAccess {
  financiallyRestricted: boolean;
  reason: string | null;
  mpEnabled: boolean;
  name: string;
  role: string;
  memberId: string;
}
export interface MemberPaymentState {
  reference: string;
  status: string;
  amount: number;
  initPoint: string | null;
  providerPaymentId: string | null;
  checkoutStatus: string;
  allocations: { beneficiaryId: string; name: string; period: string; amount: number }[];
}
