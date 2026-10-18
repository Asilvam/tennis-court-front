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
  if (!value.startsWith('/monthlypayments?') && !value.startsWith('/monthlypayments/return?')) return '/';
  try {
    const url = new URL(value, 'https://ctq.invalid');
    const reference = url.searchParams.get('reference');
    if (url.origin !== 'https://ctq.invalid' || !membershipReference(reference)) return '/';
    if (url.pathname === '/monthlypayments/return') return `/monthlypayments/return?reference=${reference}`;
    return url.pathname === '/monthlypayments'
      ? legacyMembershipReturn(url.searchParams) || `/monthlypayments?reference=${reference}` : '/';
  } catch { return '/'; }
}

export function legacyMembershipReturn(params: URLSearchParams): string | null {
  const reference = params.get('reference');
  const returned = ['payment_id', 'collection_id', 'collection_status', 'status', 'preference_id'].some(key => params.has(key));
  return returned && membershipReference(reference) ? `/monthlypayments/return?reference=${reference}` : null;
}

export const membershipSessionPath = (path: string) => path === '/monthlypayments' || path === '/monthlypayments/return';

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
