import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faCreditCard, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from './useAuth';
import { LoadingSpinner } from './LoadingSpinner';
import { MembershipBillingSelect } from './MembershipBillingSelect';
import { BillingContext, BillingPayment, billingMoney, billingPeriodLabel, billingToday, paymentMethodLabel, paymentStatusLabel, selectedDuesTotal, toggleDueSelection } from '../utils/membershipPayments';
import { legacyMembershipReturn, memberCheckoutIdentity, MemberPaymentState, MembershipAccess, membershipReference, safeMembershipCheckoutUrl, selectableMemberDues } from '../utils/memberPayments';
import '../styles/MembershipPayments.css';

interface PortalContext extends BillingContext { access: MembershipAccess; currentPeriod: string }
interface History { items: BillingPayment[]; total: number; pageSize: number }
const api = `${import.meta.env.VITE_API_URL}/membership-billing`;
const errorText = (error: unknown) => {
  const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
  return Array.isArray(message) ? message.join('. ') : typeof message === 'string' ? message : 'No se pudo completar la solicitud. Intenta nuevamente.';
};
const showError = (error: unknown) => Swal.fire({ icon: 'error', title: 'Mensualidades', text: errorText(error), confirmButtonText: 'Aceptar' });

export default function MembershipPayments() {
  const [params] = useSearchParams();
  const returned = legacyMembershipReturn(params);
  return returned ? <Navigate to={returned} replace /> : <MembershipPaymentsPortal />;
}

function MembershipPaymentsPortal() {
  const { token, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const storageKey = `ctq-membership-attempt:${user?.email}`;
  const rawReference = params.get('reference');
  const [reference, setReference] = useState(() => {
    const saved = sessionStorage.getItem(storageKey);
    return membershipReference(rawReference) ? rawReference : membershipReference(saved) ? saved : '';
  });
  const [context, setContext] = useState<PortalContext | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [tab, setTab] = useState('dues');
  const [beneficiary, setBeneficiary] = useState('');
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState<History>({ items: [], total: 0, pageSize: 20 });
  const [payment, setPayment] = useState<MemberPaymentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const requestIdentity = useRef<{ hash: string; key: string }>();
  const currentStatus = useRef('');
  const headers = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadHome = useCallback(async () => {
    const { data } = await axios.post<PortalContext>(`${api}/me/dues`, {}, { headers: headers(), timeout: 20000 });
    setContext(data);
    const eligible = data.members.filter(person => person.active && person.enrolled).map(person => person.id);
    const available = selectableMemberDues(data.dues, eligible, data.currentPeriod || billingToday().slice(0, 7));
    setSelected(previous => previous.filter(id => available.some(due => due.id === id)));
    return data;
  }, [headers]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    loadHome().catch(error => { if (active) void showError(error); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadHome]);

  const loadHistory = useCallback(async () => {
    const { data } = await axios.get<History>(`${api}/me/payments`, { params: { ...(beneficiary ? { beneficiaryId: beneficiary } : {}), page }, headers: headers(), timeout: 15000 });
    setHistory(data);
  }, [beneficiary, headers, page]);
  useEffect(() => {
    if (tab !== 'history') return;
    let active = true;
    setHistoryLoading(true);
    loadHistory().catch(error => { if (active) void showError(error); }).finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [loadHistory, tab]);

  useEffect(() => {
    if (!reference || !context?.access.mpEnabled) return;
    let active = true;
    const read = async () => {
      try {
        const { data } = await axios.get<MemberPaymentState>(`${api}/payments/${reference}`, { headers: headers(), timeout: 15000 });
        if (!active) return;
        setPayment(data);
        if (['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(data.status)) {
          requestIdentity.current = undefined;
          sessionStorage.removeItem(`${storageKey}:identity`);
        }
        if (data.status === 'CONFIRMED' && currentStatus.current !== 'CONFIRMED') {
          currentStatus.current = data.status;
          await loadHome();
          window.dispatchEvent(new Event('focus'));
          if (tab === 'history') await loadHistory();
          await Swal.fire({ icon: 'success', title: 'Pago confirmado', text: `Se registraron ${billingMoney(data.amount)} en tus mensualidades.`, confirmButtonText: 'Aceptar' });
        } else currentStatus.current = data.status;
      } catch (error) { if (active) { window.clearInterval(interval); void showError(error); } }
    };
    const interval = window.setInterval(() => { if (!['CONFIRMED', 'CANCELLED', 'REVIEW_REQUIRED'].includes(currentStatus.current)) void read(); }, 5000);
    void read();
    return () => { active = false; window.clearInterval(interval); };
  }, [context?.access.mpEnabled, headers, loadHistory, loadHome, reference, storageKey, tab]);

  const remember = (value: string) => {
    if (!membershipReference(value)) return;
    sessionStorage.setItem(storageKey, value);
    currentStatus.current = '';
    setPayment(null);
    setReference(value);
    setParams({ reference: value }, { replace: true });
  };
  const reconcile = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post<MemberPaymentState>(`${api}/payments/${reference}/reconcile`, {}, { headers: headers(), timeout: 20000 });
      setPayment(data);
      currentStatus.current = data.status;
      if (['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(data.status)) {
        requestIdentity.current = undefined;
        sessionStorage.removeItem(`${storageKey}:identity`);
      }
      await loadHome();
      if (data.status === 'CONFIRMED') window.dispatchEvent(new Event('focus'));
      await Swal.fire({ icon: data.status === 'CONFIRMED' ? 'success' : 'info', title: paymentStatusLabel(data.status), text: data.status === 'CONFIRMED' ? 'El pago está registrado.' : 'Consultamos la operación. La confirmación puede tardar unos instantes.', confirmButtonText: 'Aceptar' });
    } catch (error) { await showError(error); }
    finally { setBusy(false); }
  };
  const checkout = async () => {
    if (!context || busy || !selected.length) return;
    const total = selectedDuesTotal(context.dues, selected);
    const confirmation = await Swal.fire({ icon: 'question', title: 'Pagar mensualidades', text: `${selected.length} cuota(s) completas por ${billingMoney(total)}. Continuarás en Mercado Pago.`, showCancelButton: true, confirmButtonText: 'Continuar', cancelButtonText: 'Cancelar' });
    if (!confirmation.isConfirmed) return;
    setBusy(true);
    try {
      const stored = sessionStorage.getItem(`${storageKey}:identity`);
      if (!requestIdentity.current && stored) {
        try { const parsed = JSON.parse(stored); if (typeof parsed.hash === 'string' && typeof parsed.key === 'string') requestIdentity.current = parsed; } catch { /* Invalid local state is not payment evidence. */ }
      }
      requestIdentity.current = memberCheckoutIdentity(selected, requestIdentity.current);
      sessionStorage.setItem(`${storageKey}:identity`, JSON.stringify(requestIdentity.current));
      const { data } = await axios.post<MemberPaymentState>(`${api}/checkout`, { dueIds: [...selected].sort() }, { headers: { ...headers(), 'Idempotency-Key': requestIdentity.current.key }, timeout: 25000 });
      remember(data.reference);
      setPayment(data);
      const url = safeMembershipCheckoutUrl(data.initPoint);
      if (url) window.location.assign(url);
      else await Swal.fire({ icon: 'info', title: paymentStatusLabel(data.status), text: 'Consulta este intento antes de iniciar otro pago.', confirmButtonText: 'Aceptar' });
    } catch (error) {
      if (axios.isAxiosError(error) && membershipReference(error.response?.data?.reference)) remember(error.response?.data?.reference);
      await showError(error);
    } finally { setBusy(false); }
  };

  const eligible = context?.members.filter(person => person.active && person.enrolled).map(person => person.id) || [];
  const visibleDues = selectableMemberDues(context?.dues || [], eligible, context?.currentPeriod || billingToday().slice(0, 7));
  const total = selectedDuesTotal(context?.dues || [], selected);
  const resumeUrl = safeMembershipCheckoutUrl(payment?.initPoint);
  return <main className="member-payments" aria-busy={busy || loading}>
    <header className="mp-header">
      {!context?.access.financiallyRestricted && <Link to="/" className="mp-icon" aria-label="Volver al inicio" title="Volver al inicio"><FontAwesomeIcon icon={faArrowLeft} /></Link>}
      <div><h1>Mis mensualidades</h1><p>{user?.name}</p></div>
      <button className="mp-icon mp-refresh" title="Actualizar cuotas" aria-label="Actualizar cuotas" disabled={loading || busy} onClick={async () => { setLoading(true); try { await loadHome(); } catch (error) { await showError(error); } finally { setLoading(false); } }}><FontAwesomeIcon icon={faRotateRight} /></button>
    </header>
    {context?.access.financiallyRestricted && <p className="mp-access">{context.access.reason === 'OVERDUE_DUES' ? 'Tienes mensualidades vencidas. Tu acceso está limitado a pagos hasta regularizarlas.' : 'Tu acceso está limitado a pagos. Comunícate con administración para revisar tu habilitación.'}</p>}
    {reference && <section className="mp-attempt" aria-live="polite">
      <div><h2>{payment ? paymentStatusLabel(payment.status) : 'Consultando intento de pago'}</h2><p>{payment?.status === 'CONFIRMED' ? 'Mensualidades registradas.' : payment?.status === 'REVIEW_REQUIRED' ? 'La operación necesita revisión de administración. No vuelvas a pagar estas cuotas.' : payment?.status === 'CANCELLED' ? 'El intento fue cerrado sin pago confirmado.' : 'La confirmación depende de Mercado Pago. No repitas el pago si ya se realizó un cobro.'}</p><small>{reference}</small></div>
      {context?.access.mpEnabled && <div className="mp-attempt-actions"><button disabled={busy} onClick={reconcile}><FontAwesomeIcon icon={faRotateRight} /> Consultar pago</button>{resumeUrl && <a className="mp-button" href={resumeUrl}>Continuar pago <FontAwesomeIcon icon={faArrowRight} /></a>}</div>}
    </section>}
    <div className="mp-tabs" role="tablist" aria-label="Mensualidades"><button role="tab" id="mp-dues-tab" aria-controls="mp-dues-panel" aria-selected={tab === 'dues'} onClick={() => setTab('dues')}>Cuotas</button><button role="tab" id="mp-history-tab" aria-controls="mp-history-panel" aria-selected={tab === 'history'} onClick={() => setTab('history')}>Historial de pagos</button></div>
    {loading ? <div className="mp-loading"><LoadingSpinner size={56} /></div> : !context ? <p>No se pudieron cargar tus mensualidades. Vuelve a intentarlo con el botón actualizar.</p> : tab === 'dues' ? <section id="mp-dues-panel" role="tabpanel" aria-labelledby="mp-dues-tab">
      <div className="mp-filters"><span>Vencimiento: día 5 del mes siguiente</span></div>
      {context.members.map(person => <section className="mp-beneficiary" key={person.id}>
        <h2>{person.name} <small>{person.memberType}</small></h2>
        {!person.active || !person.enrolled ? <p>Requiere revisión administrativa antes de generar cuotas.</p> : <>
          <div className="mp-dues">{visibleDues.filter(due => due.beneficiaryId === person.id).map(due => <label className="mp-due" key={due.id}>
            <input type="checkbox" aria-label={`${person.name}, ${billingPeriodLabel(due.period)}`} checked={selected.includes(due.id)} disabled={busy} onChange={() => setSelected(previous => toggleDueSelection(visibleDues, previous, due.id))} />
            <span>{billingPeriodLabel(due.period)}{due.pricingMode === 'TEST' && <small className="mp-test">Prueba</small>}</span><strong>{billingMoney(due.amount)}</strong>
          </label>)}</div>
          {!visibleDues.some(due => due.beneficiaryId === person.id) && <p className="mp-empty">Sin cuotas por pagar en este período.</p>}
        </>}
      </section>)}
      <div className="mp-checkout"><div><span>{selected.length} cuota(s) seleccionadas</span><strong>{billingMoney(total)}</strong></div><button className="mp-primary" disabled={busy || !selected.length || !context.access.mpEnabled} onClick={checkout}>{busy ? <LoadingSpinner size={22} /> : <FontAwesomeIcon icon={faCreditCard} />} Pagar con Mercado Pago</button></div>
      {!context.access.mpEnabled && <p className="mp-empty">El pago en línea aún no está habilitado. Los pagos bancarios se registran con administración.</p>}
    </section> : <section id="mp-history-panel" role="tabpanel" aria-labelledby="mp-history-tab">
      <div className="mp-filters"><MembershipBillingSelect label="Socio" value={beneficiary || context.memberId} options={context.members.map(person => ({ value: person.id, label: person.name }))} onChange={id => { setBeneficiary(id); setPage(1); }} /></div>
      {historyLoading ? <div className="mp-loading"><LoadingSpinner size={48} /></div> : history.items.length ? history.items.map(item => <article className="mp-receipt" key={item.id}>
        <div className="mp-receipt-summary"><div><h2>{paymentMethodLabel(item.method)}</h2><small>{item.paidAt ? new Date(item.paidAt).toLocaleDateString('es-CL') : 'Sin confirmar'} · Pagador: {item.payer.name}</small></div><div><strong>{billingMoney(item.amount)}</strong><span className={`mp-status mp-status--${item.status}`}>{paymentStatusLabel(item.status)}</span></div></div>
        <details><summary>Detalle del pago</summary><p className="mp-reference">{item.publicReference}</p>{item.pricingMode === 'TEST' && <small className="mp-test">Tarifa de prueba</small>}<ul>{item.allocations.map((allocation, index) => <li key={`${allocation.beneficiaryId}-${allocation.period}-${index}`}><span>{context.members.find(person => person.id === allocation.beneficiaryId)?.name || 'Beneficiario'} · {billingPeriodLabel(allocation.period)}</span><strong>{billingMoney(allocation.amount)}</strong></li>)}</ul>{item.method === 'MERCADO_PAGO' && membershipReference(item.publicReference) && <button onClick={() => { remember(item.publicReference); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Consultar operación</button>}</details>
      </article>) : <p className="mp-empty">No hay pagos registrados.</p>}
      <div className="mp-pagination"><span>{history.total} registros</span><button className="mp-icon" aria-label="Página anterior" title="Página anterior" disabled={page === 1 || historyLoading} onClick={() => setPage(value => value - 1)}><FontAwesomeIcon icon={faArrowLeft} /></button><span>{page}</span><button className="mp-icon" aria-label="Página siguiente" title="Página siguiente" disabled={page * history.pageSize >= history.total || historyLoading} onClick={() => setPage(value => value + 1)}><FontAwesomeIcon icon={faArrowRight} /></button></div>
    </section>}
  </main>;
}
