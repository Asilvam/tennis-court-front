import { useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faClipboardCheck, faUserCheck } from "@fortawesome/free-solid-svg-icons";
import { getTokenFromLocalStorage } from "../utils/tokenUtils";
import { billingMoney, billingPeriodLabel, billingToday } from "../utils/membershipPayments";
import { LoadingSpinner } from "./LoadingSpinner";

interface Candidate {
  memberId: string;
  name: string;
  memberType: string;
  status: "ELIGIBLE" | "ALREADY_ENABLED" | "REVIEW_REQUIRED";
  reason: string;
  plan?: { approvalHash: string; total: number; rows: { period: string; amount: number }[] };
}
interface Preview {
  startPeriod: string;
  minimumStartPeriod: string;
  currentPeriod: string;
  items: Candidate[];
}
interface Result {
  counts: { enrolled: number; skipped: number; reviewRequired: number; errors: number };
  results: { memberId: string; outcome: string; message: string }[];
}
interface Payload {
  startPeriod: string;
  reason: string;
  items: { memberId: string; approvalHash: string }[];
}
const labels = {
  ELIGIBLE: "Pendiente",
  ALREADY_ENABLED: "Ya habilitado",
  REVIEW_REQUIRED: "Requiere revisión",
};

export function MembershipBatchEnrollment({
  familyMemberId,
  currentPeriod,
  onSaved,
  onBusyChange,
  onReview,
}: {
  familyMemberId?: string;
  currentPeriod?: string;
  onSaved: () => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  onReview?: (memberId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false),
    [period, setPeriod] = useState(currentPeriod || billingToday().slice(0, 7));
  const [reason, setReason] = useState(""),
    [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [locked, setLocked] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const submitting = useRef(false),
    request = useRef<{ hash: string; key: string; payload: Payload }>();
  const api = `${import.meta.env.VITE_API_URL}/membership-billing/admin/enrollment`;
  const headers = () => ({ Authorization: `Bearer ${getTokenFromLocalStorage()}` });
  const title = familyMemberId ? "Habilitar titular y cargas" : "Habilitar socios";
  const working = (value: boolean) => {
    setBusy(value);
    onBusyChange?.(value);
  };
  const failure = (error: unknown) => {
    const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
    return Swal.fire({
      icon: "error",
      title,
      text:
        typeof message === "string"
          ? message
          : "No se pudo confirmar la solicitud. Reintenta el mismo lote.",
      confirmButtonText: "Aceptar",
    });
  };
  const review = async () => {
    if (submitting.current) return;
    submitting.current = true;
    working(true);
    setExpanded(true);
    try {
      const { data } = await axios.post<Preview>(
        `${api}/preview`,
        { startPeriod: period, ...(familyMemberId ? { familyMemberId } : {}) },
        { headers: headers(), timeout: 30000 },
      );
      setPreview(data);
      setSelected([]);
      setResult(null);
      setLocked(false);
      request.current = undefined;
    } catch (error) {
      await failure(error);
    } finally {
      submitting.current = false;
      working(false);
    }
  };
  const chosen =
    preview?.items.filter((row) => selected.includes(row.memberId) && row.status === "ELIGIBLE") ||
    [];
  const total = chosen.reduce((sum, row) => sum + (row.plan?.total || 0), 0);
  const apply = async () => {
    if (submitting.current || (!locked && !chosen.length)) return;
    if (!locked && reason.trim().length < 5) {
      await Swal.fire({
        icon: "warning",
        title: "Motivo de habilitación",
        text: "Indica un motivo de al menos 5 caracteres.",
        confirmButtonText: "Aceptar",
      });
      return;
    }
    submitting.current = true;
    working(true);
    try {
      if (!locked) {
        const answer = await Swal.fire({
          icon: "question",
          title: "Confirmar habilitación",
          text: `${chosen.length} socio(s), desde ${billingPeriodLabel(period)}, cuotas por ${billingMoney(total)}. Los ya habilitados se omiten. Esto no registra pagos ni reactiva cuentas inactivas.`,
          showCancelButton: true,
          confirmButtonText: "Habilitar seleccionados",
          cancelButtonText: "Revisar",
          focusCancel: true,
          allowOutsideClick: false,
        });
        if (!answer.isConfirmed) return;
        const payload = {
          startPeriod: period,
          reason: reason.trim(),
          items: chosen
            .map((row) => ({ memberId: row.memberId, approvalHash: row.plan!.approvalHash }))
            .sort((a, b) => a.memberId.localeCompare(b.memberId)),
        };
        const hash = JSON.stringify(payload);
        if (request.current?.hash !== hash)
          request.current = { hash, key: crypto.randomUUID(), payload };
      }
      if (!request.current) return;
      setLocked(true);
      const data: Result = {
        counts: { enrolled: 0, skipped: 0, reviewRequired: 0, errors: 0 },
        results: [],
      };
      for (let offset = 0; offset < request.current.payload.items.length; offset += 10) {
        const response = await axios.post<Result>(
          api,
          {
            ...request.current.payload,
            items: request.current.payload.items.slice(offset, offset + 10),
          },
          {
            headers: { ...headers(), "Idempotency-Key": `${request.current.key}_${offset / 10}` },
            timeout: 30000,
          },
        );
        for (const key of Object.keys(data.counts) as (keyof Result["counts"])[])
          data.counts[key] += response.data.counts[key];
        data.results.push(...response.data.results);
        setResult({ counts: { ...data.counts }, results: [...data.results] });
      }
      await Swal.fire({
        icon: data.counts.errors || data.counts.reviewRequired ? "warning" : "success",
        title: "Resultado de habilitación",
        text: `Habilitados: ${data.counts.enrolled}. Omitidos: ${data.counts.skipped}. Requieren revisión: ${data.counts.reviewRequired}. Sin confirmar: ${data.counts.errors}.`,
        confirmButtonText: "Aceptar",
      });
      if (!data.counts.errors) {
        setLocked(false);
        setExpanded(false);
        await onSaved();
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setLocked(false);
        setPreview(null);
      }
      await failure(error);
    } finally {
      submitting.current = false;
      working(false);
    }
  };
  const outcomes = new Map(result?.results.map((row) => [row.memberId, row]) || []);
  const outcomeLabels: Record<string, string> = {
    ENROLLED: "Habilitado",
    SKIPPED: "Omitido",
    REVIEW_REQUIRED: "Requiere revisión",
    ERROR: "Sin confirmar",
  };
  return (
    <section className="ap-enrollment ap-batch" aria-label={title}>
      {!expanded ? (
        <button type="button" disabled={busy} onClick={() => void review()}>
          <FontAwesomeIcon icon={faUserCheck} /> {title}
        </button>
      ) : (
        <>
          <h2>{title}</h2>
          <div className="ap-form-grid">
            <label>
              Inicio de facturación
              <input
                type="month"
                value={period}
                min={preview?.minimumStartPeriod}
                max={currentPeriod || billingToday().slice(0, 7)}
                disabled={busy || locked}
                onChange={(event) => {
                  setPeriod(event.target.value);
                  setPreview(null);
                  setSelected([]);
                }}
              />
            </label>
            <label>
              Motivo de habilitación
              <input
                value={reason}
                minLength={5}
                maxLength={1000}
                disabled={busy || locked}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          </div>
          {busy && <LoadingSpinner size={24} />}
          {preview && (
            <>
              <div className="ap-batch-tools">
                <button
                  type="button"
                  disabled={busy || locked}
                  onClick={() =>
                    setSelected(
                      preview.items
                        .filter((row) => row.status === "ELIGIBLE")
                        .map((row) => row.memberId),
                    )
                  }
                >
                  <FontAwesomeIcon icon={faCheck} /> Seleccionar pendientes
                </button>
                <span>{selected.length} seleccionado(s)</span>
              </div>
              <ul className="ap-batch-list">
                {preview.items.map((row) => (
                  <li key={row.memberId}>
                    <label className="ap-batch-person">
                      <input
                        type="checkbox"
                        checked={selected.includes(row.memberId)}
                        disabled={busy || locked || row.status !== "ELIGIBLE"}
                        onChange={() =>
                          setSelected((ids) =>
                            ids.includes(row.memberId)
                              ? ids.filter((id) => id !== row.memberId)
                              : [...ids, row.memberId],
                          )
                        }
                      />
                      <span>
                        <strong>{row.name}</strong>
                        <small>{row.memberType === "Familiar" ? "Carga" : row.memberType}</small>
                      </span>
                    </label>
                    <div className="ap-batch-state">
                      <span>
                        {outcomeLabels[outcomes.get(row.memberId)?.outcome || ""] ||
                          labels[row.status]}
                      </span>
                      <small>{outcomes.get(row.memberId)?.message || row.reason}</small>
                      {row.status === "REVIEW_REQUIRED" && onReview && (
                        <button
                          type="button"
                          className="ap-icon"
                          title="Revisar socio"
                          aria-label={`Revisar a ${row.name}`}
                          disabled={busy || locked}
                          onClick={() => onReview(row.memberId)}
                        >
                          <FontAwesomeIcon icon={faClipboardCheck} />
                        </button>
                      )}
                    </div>
                    <strong className="ap-batch-amount">
                      {row.plan ? billingMoney(row.plan.total) : "—"}
                    </strong>
                  </li>
                ))}
              </ul>
              <div className="ap-total">
                <span>Cuotas seleccionadas</span>
                <strong>{billingMoney(total)}</strong>
              </div>
            </>
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
              Cerrar
            </button>
            {!preview ? (
              <button type="button" disabled={busy || !period} onClick={() => void review()}>
                <FontAwesomeIcon icon={faClipboardCheck} /> Revisar socios
              </button>
            ) : (
              <button
                type="button"
                className="ap-primary"
                disabled={busy || (!locked && !chosen.length)}
                onClick={() => void apply()}
              >
                <FontAwesomeIcon icon={faCheck} />{" "}
                {locked ? "Reintentar mismo lote" : "Confirmar habilitación"}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
