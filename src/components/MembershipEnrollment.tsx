import { useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faClipboardCheck } from "@fortawesome/free-solid-svg-icons";
import { getTokenFromLocalStorage } from "../utils/tokenUtils";
import { billingMoney, billingPeriodLabel, billingToday } from "../utils/membershipPayments";
import type { BillingContext } from "../utils/membershipPayments";
import { LoadingSpinner } from "./LoadingSpinner";

interface Preview {
  memberId: string;
  name: string;
  memberType: string;
  startPeriod: string;
  throughPeriod: string;
  approvalHash: string;
  total: number;
  historical?: { id: string; period: string; amount: number }[];
  historicalTotal?: number;
  rows: { period: string; amount: number; pricingMode: string }[];
}

export function MembershipEnrollment({
  context,
  onSaved,
}: {
  context: BillingContext;
  onSaved: () => void | Promise<void>;
}) {
  const person = context.members.find((row) => row.id === context.memberId);
  const reenroll = person?.canReenroll === true;
  const title = reenroll ? "Reinscribir socio" : "Habilitar mensualidades";
  const [expanded, setExpanded] = useState(false);
  const [startPeriod, setStartPeriod] = useState(
    context.billing?.currentPeriod || billingToday().slice(0, 7),
  );
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const identity = useRef<{ hash: string; key: string }>();
  if (!person || (person.enrolled && !reenroll)) return null;
  const base = `${import.meta.env.VITE_API_URL}/membership-billing/admin/members/${person.id}/${reenroll ? "reenrollment" : "enrollment"}`;
  const headers = () => ({ Authorization: `Bearer ${getTokenFromLocalStorage()}` });
  const failure = (error: unknown) => {
    const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
    return Swal.fire({
      icon: "error",
      title,
      text: Array.isArray(message)
        ? message.join(". ")
        : typeof message === "string"
          ? message
          : "No se pudo confirmar la solicitud. Reintenta sin cambiar los datos.",
      confirmButtonText: "Aceptar",
    });
  };
  const review = async () => {
    if (busy || !startPeriod) return;
    setBusy(true);
    try {
      const { data } = await axios.post<Preview>(
        `${base}/preview`,
        { startPeriod },
        { headers: headers(), timeout: 15000 },
      );
      setPreview(data);
    } catch (error) {
      setPreview(null);
      await failure(error);
    } finally {
      setBusy(false);
    }
  };
  const enroll = async () => {
    if (!preview || submitting.current) return;
    if (reason.trim().length < 5) {
      await Swal.fire({
        icon: "warning",
        title: "Motivo de habilitación",
        text: "Indica un motivo de al menos 5 caracteres.",
        confirmButtonText: "Aceptar",
      });
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const result = await Swal.fire({
        icon: "question",
        title,
        text: `${preview.name}: ${preview.rows.length} cuota(s), desde ${billingPeriodLabel(preview.startPeriod)}, por ${billingMoney(preview.total)}. Esto no registra un pago.${reenroll ? ` Las cuotas anteriores quedan como histórico no exigible, sin bloquear reservas (${billingMoney(preview.historicalTotal || 0)}).` : ""}`,
        showCancelButton: true,
        confirmButtonText: reenroll ? "Reinscribir" : "Habilitar",
        cancelButtonText: "Revisar",
        focusCancel: true,
        allowOutsideClick: false,
      });
      if (!result.isConfirmed) return;
      const payload = {
        startPeriod: preview.startPeriod,
        approvalHash: preview.approvalHash,
        reason: reason.trim(),
      };
      const hash = JSON.stringify(payload);
      if (identity.current?.hash !== hash) identity.current = { hash, key: crypto.randomUUID() };
      await axios.post(base, payload, {
        headers: { ...headers(), "Idempotency-Key": identity.current.key },
        timeout: 30000,
      });
      await Swal.fire({
        icon: "success",
        title: reenroll ? "Reinscripción aprobada" : "Mensualidades habilitadas",
        text: reenroll
          ? "Nueva vigencia registrada. Las cuotas anteriores quedan como histórico no exigible. No se ha registrado ningún pago."
          : "El inicio y las cuotas quedaron registrados. No se ha registrado ningún pago.",
        confirmButtonText: "Aceptar",
      });
      setExpanded(false);
      await onSaved();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) setPreview(null);
      await failure(error);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="ap-enrollment" aria-label="Habilitación de mensualidades">
      {!expanded ? (
        <button
          type="button"
          className="ap-primary"
          disabled={!person.active && !reenroll}
          onClick={() => setExpanded(true)}
        >
          <FontAwesomeIcon icon={faCheck} /> {title}
        </button>
      ) : (
        <>
          <div className="ap-form-grid">
            <label>
              Inicio de facturación
              <input
                type="month"
                min={
                  reenroll ? context.billing?.currentPeriod : context.billing?.minimumStartPeriod
                }
                max={context.billing?.currentPeriod || billingToday().slice(0, 7)}
                value={startPeriod}
                disabled={busy || reenroll}
                onChange={(event) => {
                  setStartPeriod(event.target.value);
                  setPreview(null);
                }}
              />
            </label>
            <label>
              {reenroll ? "Motivo de reinscripción" : "Motivo de habilitación"}
              <input
                value={reason}
                minLength={5}
                maxLength={1000}
                disabled={busy}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          </div>
          {preview && (
            <div className="ap-enrollment-preview" aria-live="polite">
              <h3>Cuotas por preparar</h3>
              <ul>
                {preview.rows.map((row) => (
                  <li key={row.period}>
                    <span>
                      {billingPeriodLabel(row.period)}
                      {row.pricingMode === "TEST" && <small className="ap-test">Prueba</small>}
                    </span>
                    <strong>{billingMoney(row.amount)}</strong>
                  </li>
                ))}
              </ul>
              <div className="ap-total">
                <span>{preview.rows.length} cuota(s)</span>
                <strong>{billingMoney(preview.total)}</strong>
              </div>
              {reenroll && !!preview.historical?.length && (
                <p className="ap-muted">
                  {preview.historical.length} cuota(s) anteriores por{" "}
                  {billingMoney(preview.historicalTotal || 0)} quedarán como histórico no exigible.
                </p>
              )}
            </div>
          )}
          <div className="ap-form-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setExpanded(false);
                setPreview(null);
              }}
            >
              Cancelar
            </button>
            {preview ? (
              <button
                type="button"
                className="ap-primary"
                disabled={busy}
                onClick={() => void enroll()}
              >
                {busy ? <LoadingSpinner size={20} /> : <FontAwesomeIcon icon={faCheck} />}{" "}
                {reenroll ? "Confirmar reinscripción" : "Confirmar habilitación"}
              </button>
            ) : (
              <button type="button" disabled={busy || !startPeriod} onClick={() => void review()}>
                {busy ? <LoadingSpinner size={20} /> : <FontAwesomeIcon icon={faClipboardCheck} />}{" "}
                Revisar cuotas
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
