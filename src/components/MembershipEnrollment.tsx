import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faClipboardCheck } from "@fortawesome/free-solid-svg-icons";
import { getTokenFromLocalStorage } from "../utils/tokenUtils";
import {
  billingMoney,
  billingPeriodLabel,
  billingToday,
  paymentStatusLabel,
} from "../utils/membershipPayments";
import { billingPeriodRange, shiftBillingPeriod } from "../utils/membershipPeriods";
import type { BillingContext } from "../utils/membershipPayments";
import { useUnsavedEditorChanges } from "../hooks/useUnsavedCategoryChanges";
import { LoadingSpinner } from "./LoadingSpinner";
import { MembershipBillingSelect } from "./MembershipBillingSelect";

interface Preview {
  memberId: string;
  name: string;
  startPeriod: string;
  throughPeriod: string;
  approvalHash: string;
  total: number;
  historical?: { id: string; period: string; amount: number }[];
  historicalTotal?: number;
  rows?: { period: string; amount: number; pricingMode: string }[];
  newRows?: { period: string; amount: number; pricingMode: string }[];
  existingRows?: { period: string; amount: number; status: string }[];
  excludedPeriods?: string[];
}
interface RequestIdentity {
  key: string;
  payload: { startPeriod?: string; throughPeriod?: string; approvalHash: string; reason?: string };
}

export function MembershipEnrollment({
  context,
  onSaved,
  onBusyChange,
}: {
  context: BillingContext;
  onSaved: () => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const person = context.members.find((row) => row.id === context.memberId);
  const reenroll = person?.canReenroll === true;
  const generate = !!person?.enrolled && !reenroll;
  const title = reenroll ? "Reinscribir socio" : "Generar cuotas";
  const current = context.billing?.currentPeriod || billingToday().slice(0, 7);
  const [expanded, setExpanded] = useState(false);
  const [startPeriod, setStartPeriod] = useState(current);
  const [throughPeriod, setThroughPeriod] = useState(current);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const submitting = useRef(false);
  const identity = useRef<RequestIdentity>();
  useUnsavedEditorChanges(false, busy || locked, "membership-payment");
  useEffect(() => {
    onBusyChange?.(busy || locked);
    return () => onBusyChange?.(false);
  }, [busy, locked, onBusyChange]);
  if (!person || (!person.active && !reenroll && person.enrolled)) return null;
  const base = `${import.meta.env.VITE_API_URL}/membership-billing/admin/members/${person.id}/${reenroll ? "reenrollment" : generate ? "dues" : "enrollment"}`;
  const headers = () => ({ Authorization: `Bearer ${getTokenFromLocalStorage()}` });
  const options = (first: string, last: string) =>
    billingPeriodRange(first, last).map((value) => ({ value, label: billingPeriodLabel(value) }));
  const failure = (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) return;
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
    if (submitting.current || locked || (!person.active && !reenroll)) return;
    submitting.current = true;
    setBusy(true);
    try {
      const { data } = await axios.post<Preview>(
        `${base}/preview`,
        reenroll
          ? { startPeriod: current }
          : generate
            ? { throughPeriod }
            : { startPeriod, throughPeriod },
        { headers: headers(), timeout: 15000 },
      );
      setPreview(data);
      identity.current = undefined;
    } catch (error) {
      setPreview(null);
      await failure(error);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const enroll = async () => {
    if (!preview || submitting.current || (!person.active && !reenroll)) return;
    if (reenroll && reason.trim().length < 5) {
      await Swal.fire({
        icon: "warning",
        title: "Motivo de reinscripción",
        text: "Indica un motivo de al menos 5 caracteres.",
        confirmButtonText: "Aceptar",
      });
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      if (!locked) {
        const rows = preview.newRows || preview.rows || [];
        const result = await Swal.fire({
          icon: "question",
          title,
          text: `${preview.name}: ${rows.length} cuota(s) nuevas, desde ${billingPeriodLabel(preview.startPeriod)} hasta ${billingPeriodLabel(preview.throughPeriod)}, por ${billingMoney(preview.total)}. Esto no registra un pago.${reenroll ? ` Las cuotas anteriores quedan como histórico no exigible, sin bloquear reservas (${billingMoney(preview.historicalTotal || 0)}).` : " Las cuotas existentes se conservan."}`,
          showCancelButton: true,
          confirmButtonText: reenroll ? "Reinscribir" : "Generar cuotas",
          cancelButtonText: "Revisar",
          focusCancel: true,
          allowOutsideClick: false,
        });
        if (!result.isConfirmed) return;
        identity.current = {
          key: crypto.randomUUID(),
          payload: {
            ...(!generate ? { startPeriod: preview.startPeriod } : {}),
            ...(!reenroll ? { throughPeriod: preview.throughPeriod } : {}),
            approvalHash: preview.approvalHash,
            ...(reenroll ? { reason: reason.trim() } : {}),
          },
        };
      }
      if (!identity.current) return;
      setLocked(true);
      await axios.post(base, identity.current.payload, {
        headers: { ...headers(), "Idempotency-Key": identity.current.key },
        timeout: 30000,
      });
      setLocked(false);
      setExpanded(false);
      setPreview(null);
      identity.current = undefined;
      await Swal.fire({
        icon: "success",
        title: reenroll ? "Reinscripción aprobada" : "Cuotas revisadas",
        text: reenroll
          ? "Nueva vigencia registrada. Las cuotas anteriores quedan como histórico no exigible. No se ha registrado ningún pago."
          : (preview.newRows || preview.rows || []).length
            ? "Las cuotas nuevas quedaron registradas y las existentes se conservaron. No se ha registrado ningún pago."
            : "No había cuotas nuevas para generar. Las existentes se conservaron. No se ha registrado ningún pago.",
        confirmButtonText: "Aceptar",
      });
      await onSaved();
    } catch (error) {
      // A lost/5xx response may follow a committed write: keep the exact request for retry.
      if (axios.isAxiosError(error) && error.response && error.response.status < 500) {
        setLocked(false);
        setPreview(null);
        identity.current = undefined;
      }
      await failure(error);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const rows = preview?.newRows || preview?.rows || [];
  return (
    <section className="ap-enrollment" aria-label={title}>
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
            {!generate && (
              <MembershipBillingSelect
                label="Desde el mes"
                value={reenroll ? current : startPeriod}
                options={options(
                  reenroll ? current : context.billing?.minimumStartPeriod || current,
                  current,
                )}
                disabled={busy || locked || reenroll}
                onChange={(value) => {
                  setStartPeriod(value);
                  setPreview(null);
                }}
              />
            )}
            {!reenroll && (
              <MembershipBillingSelect
                label="Hasta el mes"
                value={throughPeriod}
                options={options(current, shiftBillingPeriod(current, 3))}
                disabled={busy || locked}
                onChange={(value) => {
                  setThroughPeriod(value);
                  setPreview(null);
                }}
              />
            )}
            {reenroll && (
              <label>
                Motivo de reinscripción
                <input
                  value={reason}
                  minLength={5}
                  maxLength={1000}
                  disabled={busy || locked}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
            )}
          </div>
          {preview && (
            <div className="ap-enrollment-preview" aria-live="polite">
              <h3>Cuotas nuevas</h3>
              {rows.length ? (
                <ul>
                  {rows.map((row) => (
                    <li key={row.period}>
                      <span>
                        {billingPeriodLabel(row.period)}
                        {row.pricingMode === "TEST" && <small className="ap-test">Prueba</small>}
                      </span>
                      <strong>{billingMoney(row.amount)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ap-muted">No hay cuotas nuevas en este rango.</p>
              )}
              <div className="ap-total">
                <span>{rows.length} cuota(s) nuevas</span>
                <strong>{billingMoney(preview.total)}</strong>
              </div>
              {!!preview.existingRows?.length && (
                <details className="ap-existing-dues">
                  <summary>{preview.existingRows.length} cuota(s) existentes, sin cambios</summary>
                  <ul>
                    {preview.existingRows.map((row) => (
                      <li key={row.period}>
                        <span>
                          {billingPeriodLabel(row.period)} · {paymentStatusLabel(row.status)}
                        </span>
                        <strong>{billingMoney(row.amount)}</strong>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {!!preview.excludedPeriods?.length && (
                <p className="ap-muted">
                  Fuera de vigencia: {preview.excludedPeriods.map(billingPeriodLabel).join(", ")}.
                </p>
              )}
              {reenroll && !!preview.historical?.length && (
                <p className="ap-muted">
                  {preview.historical.length} cuota(s) anteriores por{" "}
                  {billingMoney(preview.historicalTotal || 0)} quedarán como histórico no exigible.
                </p>
              )}
            </div>
          )}
          {locked && !busy && (
            <p className="ap-muted" role="status">
              La respuesta no se confirmó. Reintenta la misma solicitud para evitar duplicados.
            </p>
          )}
          <div className="ap-form-actions ap-generation-actions">
            <button
              type="button"
              disabled={busy || locked}
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
                {locked
                  ? "Reintentar generación"
                  : reenroll
                    ? "Confirmar reinscripción"
                    : "Confirmar generación"}
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => void review()}>
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
