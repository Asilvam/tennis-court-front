import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faChevronLeft,
  faChevronRight,
  faEye,
  faMoneyBillTransfer,
  faRotateLeft,
  faRotateRight,
  faSearch,
  faSave,
} from '@fortawesome/free-solid-svg-icons';
import { LoadingSpinner } from './LoadingSpinner';
import { getTokenFromLocalStorage } from '../utils/tokenUtils';
import { useUnsavedEditorChanges } from '../hooks/useUnsavedCategoryChanges';
import { confirmDiscardCategoryChanges } from '../utils/categoryConfirmation';
import {
  advancePeriods,
  bankPaymentPayload,
  bankRequestIdentity,
  billingMoney,
  billingPeriodLabel,
  billingToday,
  paymentMethodLabel,
  paymentStatusLabel,
  selectedDuesTotal,
  toggleDueSelection,
} from '../utils/membershipPayments';
import type {
  BankDraft,
  BillingContext,
  BillingMemberRow,
  BillingPayment,
} from '../utils/membershipPayments';
import '../styles/AdminMembershipPayments.css';
import { MembershipBillingSelect } from './MembershipBillingSelect';
import { AdminMembershipMember } from './AdminMembershipMember';
import { membershipUsersReturn } from '../utils/membershipNavigation';

const endpoint = `${import.meta.env.VITE_API_URL}/membership-billing/admin`;
const auth = () => ({ Authorization: `Bearer ${getTokenFromLocalStorage()}` });
function failureText(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) return 'Tu sesión venció. Inicia sesión nuevamente.';
    if (error.response?.status === 403) return 'Se requiere un administrador activo.';
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string') return message;
    if (!error.response)
      return 'No se pudo confirmar la respuesta. Reintenta sin cambiar los datos o revisa el historial antes de registrar nuevamente.';
  }
  return error instanceof Error ? error.message : 'No se pudo completar la solicitud.';
}
const notice = (title: string, error: unknown) =>
  Swal.fire({ icon: 'error', title, text: failureText(error), confirmButtonText: 'Aceptar' });
const dateLabel = (date?: string) =>
  date
    ? new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago' }).format(new Date(date))
    : '—';

function BankPaymentForm({
  context,
  onSaved,
  onBack,
  backLabel = 'Volver a socios',
}: {
  context: BillingContext;
  onSaved: () => void;
  onBack: () => void;
  backLabel?: string;
}) {
  const initialDate = useRef(billingToday());
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState<Omit<BankDraft, 'amount'>>({
    method: 'BANK_TRANSFER',
    payerId: context.memberId,
    payerName: '',
    receivedDate: billingToday(),
    reference: '',
    notes: '',
    verified: false,
  });
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const request = useRef<{ key: string; hash: string }>();
  const reviewedReference = useRef<string>();
  const dirty =
    selected.length > 0 ||
    draft.method !== 'BANK_TRANSFER' ||
    draft.payerId !== context.memberId ||
    draft.receivedDate !== initialDate.current ||
    Boolean(draft.reference || draft.payerName || draft.notes || draft.verified);
  useUnsavedEditorChanges(dirty, saving, 'membership-payment');
  const total = selectedDuesTotal(context.dues, selected);
  const change = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  const back = async () => {
    if (!saving && (!dirty || (await confirmDiscardCategoryChanges('leave', 'membership-payment'))))
      onBack();
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    try {
      let payload = bankPaymentPayload(context, selected, { ...draft, amount: String(total) });
      const baseHash = JSON.stringify(payload);
      if (reviewedReference.current === baseHash)
        payload = { ...payload, matchingReferenceVerified: true };
      const quote = await axios.post<{ amount: number }>(
        `${endpoint}/quote`,
        { dueIds: payload.dueIds },
        { headers: auth() },
      );
      if (quote.data.amount !== payload.amount)
        throw new Error('Las cuotas cambiaron. Vuelve a consultar al socio antes de registrar.');
      const confirmation = await Swal.fire({
        icon: 'question',
        title: `Registrar ${billingMoney(payload.amount)}`,
        text: `${paymentMethodLabel(payload.method)} de ${payload.payerName}. Se marcarán ${selected.length} cuotas completas como pagadas.`,
        showCancelButton: true,
        confirmButtonText: 'Confirmar registro',
        cancelButtonText: 'Revisar',
        focusCancel: true,
        allowOutsideClick: false,
      });
      if (!confirmation.isConfirmed) return;
      const record = () => {
        request.current = bankRequestIdentity(payload, request.current);
        return axios.post<{ status: string; duplicate: boolean }>(`${endpoint}/payments`, payload, {
          headers: { ...auth(), 'Idempotency-Key': request.current.key },
          timeout: 30000,
        });
      };
      let result;
      try {
        result = await record();
      } catch (error) {
        if (!axios.isAxiosError(error) || error.response?.data?.code !== 'BANK_REFERENCE_REVIEW')
          throw error;
        const review = await Swal.fire({
          icon: 'warning',
          title: 'Referencia bancaria repetida',
          text: 'Ya existe otro pago con la misma referencia, fecha y monto. Confirma únicamente si verificaste un ingreso bancario distinto.',
          showCancelButton: true,
          confirmButtonText: 'Verifiqué otro ingreso',
          cancelButtonText: 'No registrar',
          focusCancel: true,
          allowOutsideClick: false,
        });
        if (!review.isConfirmed) return;
        reviewedReference.current = baseHash;
        payload = { ...payload, matchingReferenceVerified: true };
        result = await record();
      }
      await Swal.fire({
        icon: result.data.status === 'REVERSED' ? 'info' : 'success',
        title:
          result.data.status === 'REVERSED'
            ? 'El registro fue anulado'
            : result.data.duplicate
              ? 'Pago ya registrado'
              : 'Pago registrado',
        text:
          result.data.status === 'REVERSED'
            ? 'Revisa el historial antes de realizar otra operación.'
            : 'Las cuotas y el historial se actualizaron correctamente.',
        confirmButtonText: 'Ver historial',
      });
      onSaved();
    } catch (error) {
      await notice('No se pudo confirmar el registro', error);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };
  return (
    <section className="ap-editor">
      <div className="ap-editor-heading">
        <button
          type="button"
          className="ap-icon"
          title={backLabel}
          aria-label={backLabel}
          onClick={() => void back()}
          disabled={saving}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h2>{context.members[0]?.name}</h2>
      </div>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <fieldset disabled={saving}>
          <legend>Cuotas</legend>
          {context.members.map((person) => (
            <section className="ap-beneficiary" key={person.id}>
              <h3>
                {person.name}{' '}
                <span>{person.memberType === 'Familiar' ? 'Carga' : person.memberType}</span>
              </h3>
              {!person.enrolled || !person.active ? (
                <p className="ap-muted">
                  {!person.active
                    ? 'Cuenta inactiva; requiere revisión administrativa.'
                    : 'Inicio de facturación pendiente de aprobación.'}
                </p>
              ) : null}
              <div className="ap-due-list">
                {context.dues
                  .filter((row) => row.beneficiaryId === person.id)
                  .map((row) => (
                    <label className="ap-due" key={row.id}>
                      <input
                        type="checkbox"
                        checked={selected.includes(row.id)}
                        disabled={row.status !== 'OPEN' || !person.active || !person.enrolled}
                        onChange={() => {
                          setSelected((previous) =>
                            toggleDueSelection(context.dues, previous, row.id),
                          );
                          change('verified', false);
                        }}
                      />
                      <span>
                        {billingPeriodLabel(row.period)}
                        <small>
                          {row.status === 'PAID'
                            ? 'Pagado'
                            : `Hasta ${dateLabel(new Date(new Date(row.dueAt).getTime() - 1).toISOString())}`}
                        </small>
                      </span>
                      <strong>
                        {billingMoney(row.amount)}
                        {row.pricingMode === 'TEST' && <small className="ap-test">Prueba</small>}
                      </strong>
                    </label>
                  ))}
              </div>
            </section>
          ))}
          <div className="ap-total">
            <span>{selected.length} cuotas seleccionadas</span>
            <strong>{billingMoney(total)}</strong>
          </div>
          <div className="ap-form-grid">
            <MembershipBillingSelect
              label="Medio de pago"
              value={draft.method}
              options={[
                { value: 'BANK_TRANSFER', label: 'Transferencia bancaria' },
                { value: 'BANK_DEPOSIT', label: 'Depósito bancario' },
              ]}
              onChange={(value) => change('method', value as BankDraft['method'])}
              disabled={saving}
            />
            <MembershipBillingSelect
              label="Pagador"
              value={draft.payerId}
              options={[
                ...context.members.map((person) => ({ value: person.id, label: person.name })),
                { value: '', label: 'Otra persona' },
              ]}
              onChange={(value) => change('payerId', value)}
              disabled={saving}
            />
            {!draft.payerId && (
              <label>
                Nombre del pagador
                <input
                  value={draft.payerName}
                  maxLength={140}
                  autoComplete="off"
                  onChange={(event) => change('payerName', event.target.value)}
                />
              </label>
            )}
            <label>
              Fecha del ingreso
              <input
                type="date"
                value={draft.receivedDate}
                max={billingToday()}
                onChange={(event) => change('receivedDate', event.target.value)}
              />
            </label>
            <label>
              Monto recibido (CLP)
              <input
                type="text"
                value={String(total)}
                readOnly
              />
            </label>
            <label className="ap-wide">
              Referencia bancaria
              <input
                value={draft.reference}
                maxLength={120}
                autoComplete="off"
                onChange={(event) => change('reference', event.target.value)}
              />
            </label>
            <label className="ap-wide">
              Observación (opcional)
              <textarea
                value={draft.notes}
                maxLength={1000}
                rows={2}
                onChange={(event) => change('notes', event.target.value)}
              />
            </label>
          </div>
          <label className="ap-verification">
            <input
              type="checkbox"
              checked={draft.verified}
              onChange={(event) => change('verified', event.target.checked)}
            />
            <span>Verifiqué el ingreso de este monto en la cuenta bancaria.</span>
          </label>
        </fieldset>
        <div className="ap-form-actions">
          <button type="button" onClick={() => void back()} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="ap-primary" disabled={saving || !selected.length}>
            <FontAwesomeIcon icon={faSave} />
            {saving ? 'Registrando…' : 'Registrar pago'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function AdminMembershipPayments() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const memberId = params.get('memberId') || '';
  const returnTarget = membershipUsersReturn(location.state);
  const [view, setView] = useState<'dues' | 'history'>('dues');
  const [context, setContext] = useState<BillingContext | null>(null);
  const [memberDetails, setMemberDetails] = useState<BillingContext | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState(memberId ? '' : billingToday().slice(0, 7));
  const [through, setThrough] = useState(advancePeriods()[0]);
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [members, setMembers] = useState<BillingMemberRow[]>([]);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [reversing, setReversing] = useState(false);
  const reversalRequest = useRef<{ id: string; reason: string; key: string }>();
  const requestVersion = useRef(0);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const version = ++requestVersion.current;
      setLoading(true);
      setUnavailable(false);
      try {
        if (memberId) {
          if (!/^[a-f\d]{24}$/i.test(memberId)) throw new Error('Identificador de socio inválido.');
          const response = await axios.get<BillingContext>(
            `${endpoint}/members/${encodeURIComponent(memberId)}`,
            { headers: auth(), signal },
          );
          if (version === requestVersion.current && !signal?.aborted)
            setMemberDetails(response.data);
        }
        if (view === 'dues' && !memberId) {
          const response = await axios.get<{ items: BillingMemberRow[]; total: number }>(
            `${endpoint}/members`,
            { headers: auth(), params: { search, period, page }, signal },
          );
          if (version === requestVersion.current && !signal?.aborted) {
            setMembers(response.data.items);
            setTotal(response.data.total);
          }
        } else if (view === 'history') {
          const response = await axios.get<{ items: BillingPayment[]; total: number }>(
            `${endpoint}/payments`,
            {
              headers: auth(),
              params: {
                ...(period ? { period } : {}),
                ...(method ? { method } : {}),
                ...(status ? { status } : {}),
                ...(memberId ? { beneficiaryId: memberId } : {}),
                page,
              },
              signal,
            },
          );
          if (version === requestVersion.current && !signal?.aborted) {
            setPayments(response.data.items);
            setTotal(response.data.total);
          }
        }
      } catch (error) {
        if (!axios.isCancel(error) && version === requestVersion.current) {
          setUnavailable(true);
          await notice('No se pudieron cargar mensualidades', error);
        }
      } finally {
        if (version === requestVersion.current && !signal?.aborted) setLoading(false);
      }
    },
    [view, search, period, page, method, status, memberId],
  );
  useEffect(() => {
    if (memberId) window.scrollTo({ top: 0, behavior: 'instant' });
    setContext(null);
    setMemberDetails(null);
    setView('dues');
    setPage(1);
    setPeriod(memberId ? '' : billingToday().slice(0, 7));
    setDetail(null);
  }, [memberId]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const open = async (id: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await axios.post<BillingContext>(
        `${endpoint}/members/${id}/dues`,
        { throughPeriod: through },
        { headers: auth() },
      );
      setContext(response.data);
      if (memberId) setMemberDetails(response.data);
    } catch (error) {
      await notice('No se pudieron preparar las cuotas', error);
    } finally {
      setLoading(false);
    }
  };
  const reverse = async (payment: BillingPayment) => {
    if (reversing) return;
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Anular registro bancario',
      text: `Se reabrirán las cuotas de ${billingMoney(payment.amount)}. Esto no devuelve dinero al banco.`,
      input: 'textarea',
      inputLabel: 'Motivo de la corrección',
      inputValue: reversalRequest.current?.id === payment.id ? reversalRequest.current.reason : '',
      inputAttributes: { maxlength: '1000' },
      inputValidator: (value) =>
        value.trim().length >= 5 ? undefined : 'Escribe un motivo de al menos 5 caracteres.',
      showCancelButton: true,
      confirmButtonText: 'Confirmar anulación',
      cancelButtonText: 'Conservar registro',
      focusCancel: true,
      allowOutsideClick: false,
    });
    if (!result.isConfirmed) return;
    setReversing(true);
    try {
      const reason = String(result.value).trim();
      if (reversalRequest.current?.id !== payment.id || reversalRequest.current.reason !== reason)
        reversalRequest.current = { id: payment.id, reason, key: crypto.randomUUID() };
      await axios.post(
        `${endpoint}/payments/${payment.id}/reversal`,
        { reason },
        { headers: { ...auth(), 'Idempotency-Key': reversalRequest.current.key }, timeout: 30000 },
      );
      await Swal.fire({
        icon: 'success',
        title: 'Registro anulado',
        text: 'La corrección quedó auditada y las cuotas se reabrieron.',
        confirmButtonText: 'Aceptar',
      });
      await load();
    } catch (error) {
      await notice('No se pudo confirmar la anulación', error);
    } finally {
      setReversing(false);
    }
  };
  const changeView = (next: 'dues' | 'history') => {
    setView(next);
    if (next === 'dues' && !period && !memberId) setPeriod(billingToday().slice(0, 7));
    setPage(1);
    setDetail(null);
  };
  const person = memberDetails?.members.find((row) => row.id === memberId);
  return (
    <main className="admin-membership-payments">
      <header className="ap-header">
        <button
          type="button"
          className="ap-icon"
          aria-label="Volver a usuarios"
          title="Volver a usuarios"
          onClick={() => navigate(returnTarget.returnTo, { state: returnTarget.state })}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1>{memberId ? 'Mensualidades del socio' : 'Mensualidades CTQ'}</h1>
        {!context && (
          <button
            type="button"
            className="ap-icon ap-reload"
            aria-label="Actualizar mensualidades"
            title="Actualizar mensualidades"
            disabled={loading || reversing}
            onClick={() => void load()}
          >
            <FontAwesomeIcon icon={faRotateRight} />
          </button>
        )}
      </header>
      {person && !context && (
        <section className="ap-member-summary" aria-label="Datos del socio">
          <h2>{person.name}</h2>
          <p>{person.email}</p>
          <div>
            <span>{person.memberType === 'Familiar' ? 'Carga' : person.memberType}</span>
            <span className={`ap-status ap-status--${person.active ? 'PAID' : 'NOT_ENROLLED'}`}>
              {person.active ? 'Cuenta activa' : 'Cuenta inactiva'}
            </span>
          </div>
        </section>
      )}
      {context ? (
        <BankPaymentForm
          key={context.memberId}
          context={context}
          backLabel={memberId ? 'Volver al detalle del socio' : 'Volver a socios'}
          onBack={() => setContext(null)}
          onSaved={() => {
            setContext(null);
            changeView('history');
            if (view === 'history') void load();
          }}
        />
      ) : (
        <>
          <div className="ap-tabs" role="tablist" aria-label="Mensualidades">
            <button
              role="tab"
              aria-selected={view === 'dues'}
              onClick={() => changeView('dues')}
              disabled={reversing}
            >
              Cuotas
            </button>
            <button
              role="tab"
              aria-selected={view === 'history'}
              onClick={() => changeView('history')}
              disabled={reversing}
            >
              Historial de pagos
            </button>
          </div>
          <div className={`ap-filters${memberId && view === 'dues' ? ' ap-filters--member' : ''}`}>
            {view === 'dues' && !memberId && (
              <form
                className="ap-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  setPage(1);
                  setSearch(searchInput.trim());
                }}
              >
                <label>
                  Socio
                  <input
                    type="search"
                    value={searchInput}
                    placeholder="Nombre o correo"
                    onChange={(event) => setSearchInput(event.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  className="ap-icon"
                  aria-label="Buscar socio"
                  title="Buscar socio"
                  disabled={loading}
                >
                  <FontAwesomeIcon icon={faSearch} />
                </button>
              </form>
            )}
            {(view === 'history' || !memberId) && (
              <label>
                Mes
                <input
                  type="month"
                  value={period}
                  onChange={(event) => {
                    setPeriod(
                      event.target.value || (view === 'dues' ? billingToday().slice(0, 7) : ''),
                    );
                    setPage(1);
                  }}
                />
              </label>
            )}
            {view === 'dues' ? (
              <MembershipBillingSelect
                label="Preparar cuotas hasta"
                value={through}
                options={advancePeriods().map((value) => ({
                  value,
                  label: billingPeriodLabel(value),
                }))}
                onChange={setThrough}
                disabled={loading}
              />
            ) : (
              <>
                <MembershipBillingSelect
                  label="Medio"
                  value={method}
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'BANK_TRANSFER', label: 'Transferencia bancaria' },
                    { value: 'BANK_DEPOSIT', label: 'Depósito bancario' },
                    { value: 'MERCADO_PAGO', label: 'Mercado Pago' },
                  ]}
                  onChange={(value) => {
                    setMethod(value);
                    setPage(1);
                  }}
                  disabled={loading || reversing}
                />
                <MembershipBillingSelect
                  label="Estado"
                  value={status}
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'CONFIRMED', label: 'Pagado' },
                    { value: 'REVERSED', label: 'Anulado' },
                    { value: 'PENDING', label: 'Pendiente' },
                    { value: 'REVIEW_REQUIRED', label: 'En revisión' },
                  ]}
                  onChange={(value) => {
                    setStatus(value);
                    setPage(1);
                  }}
                  disabled={loading || reversing}
                />
              </>
            )}
          </div>
          {loading ? (
            <div className="ap-loading" role="status">
              <LoadingSpinner size={64} />
            </div>
          ) : unavailable ? (
            <div className="ap-empty">
              <p>Mensualidades no disponibles.</p>
              <button type="button" onClick={() => void load()}>
                <FontAwesomeIcon icon={faRotateRight} /> Reintentar
              </button>
            </div>
          ) : (
            <>
              {view === 'dues' ? (
                memberId && memberDetails ? (
                  <AdminMembershipMember
                    context={memberDetails}
                    onRegister={() => void open(memberId)}
                  />
                ) : (
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>Socio</th>
                        <th>Tipo</th>
                        <th>Monto</th>
                        <th>Estado</th>
                        <th>
                          <span className="ap-sr-only">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => (
                        <tr key={member.id}>
                          <td data-label="Socio">
                            <strong>{member.name}</strong>
                            <small>{member.email}</small>
                            {!member.active && <small>Cuenta inactiva</small>}
                          </td>
                          <td data-label="Tipo">
                            {member.memberType === 'Familiar' ? 'Carga' : member.memberType}
                          </td>
                          <td data-label="Monto">
                            {member.amount === null ? '—' : billingMoney(member.amount)}
                            {member.pricingMode === 'TEST' && (
                              <small className="ap-test">Prueba</small>
                            )}
                          </td>
                          <td data-label="Estado">
                            <span className={`ap-status ap-status--${member.status}`}>
                              {paymentStatusLabel(member.status)}
                            </span>
                          </td>
                          <td className="ap-row-actions">
                            <button
                              type="button"
                              className="ap-icon"
                              aria-label={`Registrar pago de ${member.name}`}
                              title="Registrar pago"
                              onClick={() => void open(member.id)}
                              disabled={!member.active || !member.enrolled}
                            >
                              <FontAwesomeIcon icon={faMoneyBillTransfer} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                <div className="ap-history">
                  {payments.map((payment) => (
                    <article className="ap-payment" key={payment.id}>
                      <div className="ap-payment-summary">
                        <div>
                          <strong>{payment.payer.name || 'Pagador externo'}</strong>
                          <small>
                            {dateLabel(payment.paidAt || payment.createdAt)} ·{' '}
                            {paymentMethodLabel(payment.method)}
                          </small>
                          <small>
                            {payment.allocations
                              .map((row) => `${row.name}: ${billingPeriodLabel(row.period)}`)
                              .join(' · ')}
                          </small>
                        </div>
                        <div className="ap-payment-amount">
                          <strong>{billingMoney(payment.amount)}</strong>
                          <span className={`ap-status ap-status--${payment.status}`}>
                            {paymentStatusLabel(payment.status)}
                          </span>
                          {payment.pricingMode === 'TEST' && (
                            <small className="ap-test">Prueba</small>
                          )}
                        </div>
                        <div className="ap-row-actions">
                          <button
                            type="button"
                            className="ap-icon"
                            title="Ver detalle del pago"
                            aria-label={`Ver detalle de ${payment.publicReference}`}
                            aria-expanded={detail === payment.id}
                            onClick={() => setDetail(detail === payment.id ? null : payment.id)}
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </button>
                          {payment.status === 'CONFIRMED' && payment.method !== 'MERCADO_PAGO' && (
                            <button
                              type="button"
                              className="ap-icon"
                              title="Anular registro bancario"
                              aria-label={`Anular registro de ${payment.payer.name}`}
                              disabled={reversing}
                              onClick={() => void reverse(payment)}
                            >
                              <FontAwesomeIcon icon={faRotateLeft} />
                            </button>
                          )}
                        </div>
                      </div>
                      {detail === payment.id && (
                        <div className="ap-payment-detail">
                          <dl>
                            <dt>Referencia CTQ</dt>
                            <dd>{payment.publicReference}</dd>
                            <dt>{payment.method === 'MERCADO_PAGO' ? 'Operación Mercado Pago' : 'Referencia bancaria'}</dt>
                            <dd>{payment.provider?.paymentId || payment.bank?.reference || '—'}</dd>
                            {payment.provider && <><dt>Estado del proveedor</dt><dd>{payment.provider.status}</dd><dt>Monto recibido</dt><dd>{billingMoney(payment.provider.receivedAmount)} {payment.provider.currency}</dd></>}
                            {!!payment.reviewReasons?.length && <><dt>Revisión necesaria</dt><dd>{payment.reviewReasons.join(', ')}</dd></>}
                            <dt>Registrado por</dt>
                            <dd>{payment.registeredBy}</dd>
                            <dt>Fecha de registro</dt>
                            <dd>{dateLabel(payment.confirmedAt || payment.createdAt)}</dd>
                            <dt>Aviso por correo</dt>
                            <dd>
                              {(
                                {
                                  PENDING: 'Pendiente',
                                  PROCESSING: 'En proceso',
                                  SENT: 'Enviado',
                                  FAILED: 'No enviado; revisar',
                                  CANCELLED: 'Cancelado',
                                } as Record<string, string>
                              )[payment.notificationStatus || ''] || 'No requerido'}
                            </dd>
                            {payment.notes && (
                              <>
                                <dt>Observación</dt>
                                <dd>{payment.notes}</dd>
                              </>
                            )}
                            {payment.reversal && (
                              <>
                                <dt>Anulación</dt>
                                <dd>
                                  {payment.reversal.reason}
                                  <br />
                                  {payment.reversal.actor} ·{' '}
                                  {dateLabel(payment.reversal.reversedAt)}
                                </dd>
                              </>
                            )}
                          </dl>
                          <ul>
                            {payment.allocations.map((row, index) => (
                              <li key={`${row.beneficiaryId}-${row.period}-${index}`}>
                                <span>
                                  {row.name} · {billingPeriodLabel(row.period)}
                                </span>
                                <strong>{billingMoney(row.amount)}</strong>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
              {total === 0 && !(memberId && view === 'dues') && (
                <p className="ap-empty">
                  {view === 'dues'
                    ? 'No se encontraron socios.'
                    : 'No hay pagos para estos filtros.'}
                </p>
              )}
              {!(memberId && view === 'dues') && (
                <footer className="ap-pagination">
                  <span>
                    {total} {view === 'dues' ? 'socios' : 'pagos'}
                  </span>
                  <button
                    type="button"
                    className="ap-icon"
                    aria-label="Página anterior"
                    title="Página anterior"
                    disabled={page === 1 || reversing}
                    onClick={() => setPage(page - 1)}
                  >
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>
                  <span>
                    {page} / {Math.max(1, Math.ceil(total / 20))}
                  </span>
                  <button
                    type="button"
                    className="ap-icon"
                    aria-label="Página siguiente"
                    title="Página siguiente"
                    disabled={page * 20 >= total || reversing}
                    onClick={() => setPage(page + 1)}
                  >
                    <FontAwesomeIcon icon={faChevronRight} />
                  </button>
                </footer>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
