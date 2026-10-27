export interface BillingPerson {
  id: string;
  name: string;
  email: string;
  memberType: string;
  active: boolean;
  enrolled: boolean;
  billingStartPeriod?: string;
  canReenroll?: boolean;
  billingPeriods?: { fromPeriod: string; throughPeriod?: string; approvedAt: string; reason: string }[];
}
export interface MembershipDue {
  id: string;
  beneficiaryId: string;
  period: string;
  dueAt: string;
  amount: number;
  status: 'OPEN' | 'PAID' | 'VOID' | 'ARCHIVED';
  pricingMode: 'TEST' | 'STANDARD';
}
export interface BillingContext {
  memberId: string;
  members: BillingPerson[];
  dues: MembershipDue[];
  billing?: { minimumStartPeriod: string; currentPeriod: string };
}
export interface BillingMemberRow extends BillingPerson {
  amount: number | null;
  status: string;
  pricingMode: string;
}
export interface BankDraft {
  method: 'BANK_TRANSFER' | 'BANK_DEPOSIT' | 'CASH';
  payerId: string;
  payerName: string;
  receivedDate: string;
  reference: string;
  amount: string;
  notes: string;
  verified: boolean;
}
export interface BankPaymentPayload {
  matchingReferenceVerified?: boolean;
  dueIds: string[];
  method: string;
  payerName: string;
  payerMemberId?: string;
  receivedDate: string;
  reference?: string;
  amount: number;
  notes: string;
  verified: true;
}
export interface BillingPayment {
  id: string;
  publicReference: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  paidAt: string;
  createdAt: string;
  confirmedAt?: string;
  payer: { name: string; memberId?: string };
  bank?: { reference: string; receivedAt: string };
  cash?: { receiptNumber: string; receivedAt: string };
  notes?: string;
  registeredBy: string;
  pricingMode: string;
  allocations: { beneficiaryId: string; name: string; period: string; amount: number }[];
  reversal?: { reason: string; reversedAt: string; actor: string };
  notificationStatus?: string;
  provider?: { paymentId: string; status: string; receivedAmount: number; currency: string };
  reviewReasons?: string[];
}

export const paymentMethodLabel = (method: string) =>
  ({
    BANK_TRANSFER: 'Transferencia bancaria',
    BANK_DEPOSIT: 'Depósito bancario',
    MERCADO_PAGO: 'Mercado Pago',
    CASH: 'Efectivo',
  })[method] || method;
export const paymentStatusLabel = (status: string) =>
  ({
    CONFIRMED: 'Pagado',
    REVERSED: 'Anulado',
    PENDING: 'Pendiente',
    REJECTED: 'Rechazado',
    REVIEW_REQUIRED: 'En revisión',
    CANCELLED: 'Cancelado',
    OPEN: 'Por pagar',
    PAID: 'Pagado',
    VOID: 'Sin cobro por baja',
    ARCHIVED: 'Histórico no exigible',
    NOT_GENERATED: 'Sin generar',
    NOT_ENROLLED: 'Sin inicio aprobado',
  })[status] || status;
export const billingMoney = (amount: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
export function billingToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (key: string) => parts.find((part) => part.type === key)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function advancePeriods(now = new Date()): string[] {
  const [year, month] = billingToday(now).slice(0, 7).split('-').map(Number);
  return Array.from({ length: 4 }, (_, index) =>
    new Date(Date.UTC(year, month - 1 + index, 1)).toISOString().slice(0, 7),
  );
}
export function billingPeriodLabel(period: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${period}-01T12:00:00Z`));
}
export function toggleDueSelection(
  dues: MembershipDue[],
  selected: string[],
  id: string,
): string[] {
  const target = dues.find((row) => row.id === id);
  if (!target || target.status !== 'OPEN') return selected;
  const next = new Set(selected);
  const removing = next.has(id);
  for (const row of dues) {
    if (row.beneficiaryId !== target.beneficiaryId || row.status !== 'OPEN') continue;
    if (removing && row.period >= target.period) next.delete(row.id);
    if (!removing && row.period <= target.period) next.add(row.id);
  }
  return [...next];
}
export function selectedDuesTotal(dues: MembershipDue[], selected: string[]): number {
  const ids = new Set(selected);
  return dues.filter(row => ids.has(row.id)).reduce((sum, row) => sum + row.amount, 0);
}

export function bankPaymentPayload(
  context: BillingContext,
  selected: string[],
  draft: BankDraft,
  now = new Date(),
): BankPaymentPayload {
  if (!selected.length || new Set(selected).size !== selected.length)
    throw new Error('Selecciona cuotas completas sin duplicados.');
  const rows = context.dues.filter((row) => selected.includes(row.id));
  if (rows.length !== selected.length || rows.some((row) => row.status !== 'OPEN'))
    throw new Error('Una cuota no está disponible. Recarga los datos.');
  const latest = advancePeriods(now).at(-1)!;
  for (const row of rows) {
    const person = context.members.find((person) => person.id === row.beneficiaryId);
    if (!person?.active || !person.enrolled)
      throw new Error('El socio necesita revisión administrativa antes de registrar cuotas.');
    if (
      row.period > latest ||
      context.dues.some(
        (older) =>
          older.beneficiaryId === row.beneficiaryId &&
          older.status === 'OPEN' &&
          older.period < row.period &&
          !selected.includes(older.id),
      )
    )
      throw new Error(
        'Selecciona meses consecutivos, desde el más antiguo y hasta tres meses futuros.',
      );
  }
  if (new Set(rows.map((row) => row.pricingMode)).size !== 1)
    throw new Error('No mezcles cuotas de prueba y generales en un pago.');
  const total = selectedDuesTotal(rows, selected);
  const amount = Number(draft.amount);
  if (
    !/^\d+$/.test(draft.amount) ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount !== total
  )
    throw new Error('El monto recibido debe coincidir exactamente con las cuotas seleccionadas.');
  if (!['BANK_TRANSFER', 'BANK_DEPOSIT', 'CASH'].includes(draft.method))
    throw new Error('Selecciona un medio de pago manual.');
  if (!draft.verified)
    throw new Error(draft.method === 'CASH' ? 'Confirma que recibiste el monto completo en efectivo.' : 'Confirma que verificaste el ingreso en la cuenta bancaria.');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.receivedDate) ||
    Number.isNaN(Date.parse(`${draft.receivedDate}T12:00:00Z`)) ||
    new Date(`${draft.receivedDate}T12:00:00Z`).toISOString().slice(0, 10) !== draft.receivedDate ||
    draft.receivedDate > billingToday(now)
  )
    throw new Error('Indica una fecha válida, no futura.');
  const payer = context.members.find((person) => person.id === draft.payerId);
  const payerName = payer?.name || draft.payerName.trim();
  if (!payerName || payerName.length > 140 || (draft.payerId && !payer))
    throw new Error('Identifica a la persona que realizó el pago.');
  if (draft.method !== 'CASH' && (!draft.reference?.trim() || draft.reference.trim().length > 120))
    throw new Error('Indica una referencia bancaria de hasta 120 caracteres.');
  if (draft.notes.length > 1000)
    throw new Error('La observación no puede superar 1000 caracteres.');
  return {
    dueIds: [...selected].sort(),
    method: draft.method,
    payerName,
    ...(payer ? { payerMemberId: payer.id } : {}),
    receivedDate: draft.receivedDate,
    ...(draft.method === 'CASH' ? {} : { reference: draft.reference.trim() }),
    amount,
    notes: draft.notes.trim(),
    verified: true,
  };
}
export function bankRequestIdentity(
  payload: BankPaymentPayload,
  previous?: { hash: string; key: string },
  createKey = () => crypto.randomUUID(),
) {
  const hash = JSON.stringify(payload);
  return previous?.hash === hash ? previous : { hash, key: createKey() };
}
