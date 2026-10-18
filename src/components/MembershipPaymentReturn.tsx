import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCheckCircle, faClock, faExclamationCircle, faRotateRight, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from './useAuth';
import { LoadingSpinner } from './LoadingSpinner';
import { MemberPaymentState, membershipReference } from '../utils/memberPayments';
import { billingMoney } from '../utils/membershipPayments';
import { membershipReturnView, readMembershipReturn } from '../utils/membershipReturn';
import '../styles/MembershipPaymentReturn.css';

const api = `${import.meta.env.VITE_API_URL}/membership-billing`;

export default function MembershipPaymentReturn() {
  const { token, user } = useAuth();
  const email = user?.email;
  const [params] = useSearchParams();
  const reference = params.get('reference');
  const valid = membershipReference(reference);
  const [payment, setPayment] = useState<MemberPaymentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let polls = 0;
    setLoading(true);
    setFailed(false);
    const check = async (reconcile: boolean) => {
      try {
        if (!membershipReference(reference)) throw new Error('El enlace no contiene una referencia de mensualidad válida.');
        const headers = { Authorization: `Bearer ${token}` };
        const state = await readMembershipReturn(reference, {
          state: async () => (await axios.get<MemberPaymentState>(`${api}/payments/${reference}`, { headers, timeout: 15000 })).data,
          reconcile: async () => (await axios.post<MemberPaymentState>(`${api}/payments/${reference}/reconcile`, {}, { headers, timeout: 20000 })).data,
        }, reconcile);
        if (!active) return;
        if (['CONFIRMED', 'CANCELLED'].includes(state.status)) {
          const key = `ctq-membership-attempt:${email}`;
          if (sessionStorage.getItem(key) === reference) {
            sessionStorage.removeItem(key);
            sessionStorage.removeItem(`${key}:identity`);
          }
          if (state.status === 'CONFIRMED') window.dispatchEvent(new Event('focus'));
        }
        setPayment(state);
        setLoading(false);
        if (state.status === 'PENDING' && polls++ < 12) timer = setTimeout(() => void check(false), 5000);
      } catch {
        if (!active) return;
        setLoading(false);
        setFailed(true);
        void Swal.fire({ icon: 'error', title: 'No pudimos verificar el pago',
          text: membershipReference(reference) ? 'No se confirmó el estado de esta operación. Consulta nuevamente antes de volver a pagar.' : 'El enlace no contiene una referencia de mensualidad válida.',
          confirmButtonText: 'Aceptar' });
      }
    };
    void check(true);
    return () => { active = false; clearTimeout(timer); };
  }, [reference, token, email, refresh]);

  const view = loading
    ? { tone: 'neutral', title: 'Verificando tu pago', description: 'Estamos consultando el estado de tu mensualidad.' }
    : failed || !payment
      ? { tone: 'warning', title: 'Estado del pago sin verificar', description: 'No podemos confirmar el resultado en este momento. No realices otro pago si ya recibiste un cobro.' }
      : membershipReturnView(payment);
  const icon = view.tone === 'success' ? faCheckCircle : view.tone === 'danger' ? faTimesCircle : view.tone === 'warning' ? faExclamationCircle : faClock;

  return <main className="membership-return" aria-busy={loading}>
    <header><h1>Resultado de mensualidad</h1></header>
    <section className={`mpr-result mpr-result--${view.tone}`} aria-live="polite" aria-atomic="true">
      <div className="mpr-symbol" aria-hidden={!loading}>{loading ? <LoadingSpinner size={72} label="Verificando mensualidad" /> : <FontAwesomeIcon icon={icon} />}</div>
      <h2>{view.title}</h2>
      <p>{view.description}</p>
      {!loading && !failed && payment && <strong className="mpr-amount">{billingMoney(payment.amount)}</strong>}
      {valid && <small className="mpr-reference">{reference}</small>}
    </section>
    <div className="mpr-actions">
      <Link to="/monthlypayments" className="mpr-primary"><FontAwesomeIcon icon={faArrowLeft} />Volver a mis mensualidades</Link>
      {valid && payment?.status !== 'CONFIRMED' && <button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}><FontAwesomeIcon icon={faRotateRight} />Consultar estado</button>}
    </div>
  </main>;
}
