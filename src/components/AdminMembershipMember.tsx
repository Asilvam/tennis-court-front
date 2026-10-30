import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoneyBillTransfer } from "@fortawesome/free-solid-svg-icons";
import { billingMoney, billingPeriodLabel, paymentStatusLabel } from "../utils/membershipPayments";
import type { BillingContext } from "../utils/membershipPayments";
import { MembershipEnrollment } from "./MembershipEnrollment";
import { MembershipBatchEnrollment } from "./MembershipBatchEnrollment";
import { MembershipHistoryReview } from "./MembershipHistoryReview";

export function AdminMembershipMember({
  context,
  onRegister,
  onChanged,
  onBusyChange,
  busy = false,
}: {
  context: BillingContext;
  onRegister: () => void;
  onChanged?: () => void | Promise<void>;
  onBusyChange?: (value: boolean) => void;
  busy?: boolean;
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
          disabled={
            !person.active ||
            !person.enrolled ||
            busy ||
            !context.dues.some(
              (row) =>
                row.status === "OPEN" &&
                context.members.some(
                  (member) => member.id === row.beneficiaryId && member.active && member.enrolled,
                ),
            )
          }
        >
          <FontAwesomeIcon icon={faMoneyBillTransfer} /> Registrar pago
        </button>
      </div>
      {(person.enrolled || context.members.length === 1 || person.canReenroll) && (
        <MembershipEnrollment
          key={person.id}
          context={context}
          onSaved={onChanged || (() => {})}
          onBusyChange={onBusyChange}
        />
      )}
      {context.members.length > 1 &&
        !person.canReenroll &&
        context.members.some((row) => row.active && !row.enrolled) && (
          <MembershipBatchEnrollment
            key={`family-${person.id}`}
            familyMemberId={person.id}
            currentPeriod={context.billing?.currentPeriod}
            onSaved={onChanged || (() => {})}
            onBusyChange={onBusyChange}
          />
        )}
      {person.historyReviewAvailable && (
        <MembershipHistoryReview
          memberId={person.id}
          onSaved={onChanged || (() => {})}
          onBusyChange={onBusyChange}
        />
      )}
      {!!person.billingPeriods?.length && (
        <details className="ap-membership-periods">
          <summary>Vigencia de mensualidades</summary>
          <ul>
            {person.billingPeriods.map((interval) => (
              <li key={interval.fromPeriod}>
                <strong>
                  {billingPeriodLabel(interval.fromPeriod)}
                  {interval.throughPeriod
                    ? ` a ${billingPeriodLabel(interval.throughPeriod)}`
                    : " en adelante"}
                </strong>
                <small>
                  {new Date(interval.approvedAt).toLocaleDateString("es-CL")} · {interval.reason}
                </small>
              </li>
            ))}
          </ul>
        </details>
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
                  {new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago" }).format(
                    new Date(new Date(row.dueAt).getTime() - 1),
                  )}
                </td>
                <td data-label="Monto">
                  {billingMoney(row.amount)}
                  {row.pricingMode === "TEST" && <small className="ap-test">Prueba</small>}
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
      ) : person.enrolled ? (
        <p className="ap-empty">No hay cuotas generadas para este socio.</p>
      ) : null}
    </section>
  );
}
