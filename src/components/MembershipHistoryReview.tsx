import { useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faClipboardCheck } from "@fortawesome/free-solid-svg-icons";
import { getTokenFromLocalStorage } from "../utils/tokenUtils";
import { billingPeriodLabel } from "../utils/membershipPayments";
import { LoadingSpinner } from "./LoadingSpinner";

interface HistoryPlan {
  memberId: string;
  name: string;
  startPeriod: string;
  approvalHash: string;
  dues: unknown[];
  payments: unknown[];
}
export function MembershipHistoryReview({
  memberId,
  onSaved,
  onBusyChange,
}: {
  memberId: string;
  onSaved: () => void | Promise<void>;
  onBusyChange?: (value: boolean) => void;
}) {
  const [plan, setPlan] = useState<HistoryPlan | null>(null),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false);
  const submitting = useRef(false),
    identity = useRef<{ hash: string; key: string }>();
  const api = `${import.meta.env.VITE_API_URL}/membership-billing/admin/members/${memberId}/billing-history`;
  const headers = () => ({ Authorization: `Bearer ${getTokenFromLocalStorage()}` });
  const working = (value: boolean) => {
    setBusy(value);
    onBusyChange?.(value);
  };
  const fail = (error: unknown) => {
    const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
    return Swal.fire({
      icon: "error",
      title: "Revisar vigencia",
      text:
        typeof message === "string"
          ? message
          : "No se pudo confirmar la revisión. Reintenta sin cambiar los datos.",
      confirmButtonText: "Aceptar",
    });
  };
  const review = async () => {
    if (submitting.current) return;
    submitting.current = true;
    working(true);
    try {
      const { data } = await axios.get<HistoryPlan>(`${api}/preview`, {
        headers: headers(),
        timeout: 20000,
      });
      setPlan(data);
    } catch (error) {
      await fail(error);
    } finally {
      submitting.current = false;
      working(false);
    }
  };
  const approve = async () => {
    if (!plan || submitting.current) return;
    if (reason.trim().length < 5) {
      await Swal.fire({
        icon: "warning",
        title: "Motivo de revisión",
        text: "Indica al menos 5 caracteres.",
        confirmButtonText: "Aceptar",
      });
      return;
    }
    submitting.current = true;
    working(true);
    try {
      const answer = await Swal.fire({
        icon: "question",
        title: "Completar vigencia anterior",
        text: `${plan.name}: desde ${billingPeriodLabel(plan.startPeriod)}. Se conservan ${plan.dues.length} cuotas y ${plan.payments.length} pagos. No se generan ni archivan cuotas y no es una reinscripción.`,
        showCancelButton: true,
        confirmButtonText: "Aprobar vigencia",
        cancelButtonText: "Revisar",
        focusCancel: true,
        allowOutsideClick: false,
      });
      if (!answer.isConfirmed) return;
      const payload = { approvalHash: plan.approvalHash, reason: reason.trim() },
        hash = JSON.stringify(payload);
      if (identity.current?.hash !== hash) identity.current = { hash, key: crypto.randomUUID() };
      await axios.post(api, payload, {
        headers: { ...headers(), "Idempotency-Key": identity.current.key },
        timeout: 30000,
      });
      await Swal.fire({
        icon: "success",
        title: "Vigencia registrada",
        text: "El inicio, las cuotas y los pagos anteriores se conservaron.",
        confirmButtonText: "Aceptar",
      });
      setPlan(null);
      await onSaved();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) setPlan(null);
      await fail(error);
    } finally {
      submitting.current = false;
      working(false);
    }
  };
  return (
    <section className="ap-enrollment" aria-label="Revisar vigencia anterior">
      {!plan ? (
        <button type="button" disabled={busy} onClick={() => void review()}>
          {busy ? <LoadingSpinner size={20} /> : <FontAwesomeIcon icon={faClipboardCheck} />}{" "}
          Revisar vigencia
        </button>
      ) : (
        <>
          <h3>Vigencia desde {billingPeriodLabel(plan.startPeriod)}</h3>
          <p className="ap-muted">
            {plan.dues.length} cuotas y {plan.payments.length} pagos conservados.
          </p>
          <label className="ap-field">
            Motivo de revisión
            <input
              value={reason}
              minLength={5}
              maxLength={1000}
              disabled={busy}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <div className="ap-form-actions">
            <button type="button" disabled={busy} onClick={() => setPlan(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="ap-primary"
              disabled={busy}
              onClick={() => void approve()}
            >
              <FontAwesomeIcon icon={faCheck} /> Aprobar vigencia
            </button>
          </div>
        </>
      )}
    </section>
  );
}
