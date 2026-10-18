import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBillTransfer } from '@fortawesome/free-solid-svg-icons';
import { billingMoney, billingPeriodLabel, paymentStatusLabel } from '../utils/membershipPayments';
import type { BillingContext } from '../utils/membershipPayments';

export function AdminMembershipMember({
  context,
  onRegister,
}: {
  context: BillingContext;
  onRegister: () => void;
}) {
  const person = context.members.find((row) => row.id === context.memberId);
  if (!person) return null;
  const dues = context.dues.filter((row) => row.beneficiaryId === person.id);
  return (
    <section className="ap-member-dues" aria-label="Cuotas del socio">
      <div className="ap-section-heading">
        <h2>Cuotas del socio</h2>
        <button
          type="button"
          className="ap-primary"
          onClick={onRegister}
          disabled={!person.active || !person.enrolled}
        >
          <FontAwesomeIcon icon={faMoneyBillTransfer} /> Registrar pago
        </button>
      </div>
      {!person.enrolled && (
        <p className="ap-muted">Inicio de facturación pendiente de aprobación.</p>
      )}
      {dues.length ? (
        <table className="ap-table ap-dues-table">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Vencimiento</th>
              <th>Monto</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {dues.map((row) => (
              <tr key={row.id}>
                <td data-label="Mes">
                  <strong>{billingPeriodLabel(row.period)}</strong>
                </td>
                <td data-label="Vencimiento">
                  {new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago' }).format(
                    new Date(new Date(row.dueAt).getTime() - 1),
                  )}
                </td>
                <td data-label="Monto">
                  {billingMoney(row.amount)}
                  {row.pricingMode === 'TEST' && <small className="ap-test">Prueba</small>}
                </td>
                <td data-label="Estado">
                  <span className={`ap-status ap-status--${row.status}`}>
                    {paymentStatusLabel(row.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="ap-empty">No hay cuotas generadas para este socio.</p>
      )}
    </section>
  );
}
