import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { getTokenFromLocalStorage } from '../utils/tokenUtils';

type Settings = {
  generationEnabled: boolean;
  autoBlockEnabled: boolean;
  terminationEnabled: boolean;
  migrationReviewed: boolean;
  revision: string;
};
type Setting = 'generation' | 'autoBlock';
const endpoint = `${import.meta.env.VITE_API_URL}/membership-billing/admin/automation/settings`;
const headers = () => ({ Authorization: `Bearer ${getTokenFromLocalStorage()}` });
const controls: { setting: Setting; key: 'generationEnabled' | 'autoBlockEnabled'; label: string }[] = [
  { setting: 'generation', key: 'generationEnabled', label: 'Generación recurrente de cuotas' },
  { setting: 'autoBlock', key: 'autoBlockEnabled', label: 'Bloqueo de reservas por mora' },
];

export function MembershipAutomationSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setUnavailable(false);
    try {
      const response = await axios.get<Settings>(endpoint, { headers: headers(), signal, timeout: 20000 });
      if (!signal?.aborted && mounted.current) setSettings(response.data);
    } catch (error) {
      if (!axios.isCancel(error) && mounted.current) {
        setSettings(null);
        setUnavailable(true);
      }
    } finally {
      if (!signal?.aborted && mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void load(controller.signal);
    return () => { mounted.current = false; controller.abort(); };
  }, [load]);

  const change = async (setting: Setting, enabled: boolean) => {
    if (!settings || loading || locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const text = setting === 'generation'
        ? enabled
          ? 'Se habilita el proceso recurrente para socios vigentes con inicio aprobado. No se ejecuta una generación masiva inmediata.'
          : 'Se pausa el proceso recurrente. La generación manual y bajo demanda siguen disponibles. No se borran cuotas ni pagos.'
        : enabled
          ? 'Los socios con cuotas vencidas no podrán crear reservas. Podrán iniciar sesión y consultar la app. Los administradores están exentos de este bloqueo por deuda.'
          : 'Se desactiva el bloqueo automático por deuda. No elimina deuda ni modifica restricciones manuales o cuentas inactivas.';
      const result = await Swal.fire({
        icon: 'warning',
        title: `${enabled ? 'Activar' : 'Desactivar'} ${setting === 'generation' ? 'generación recurrente' : 'bloqueo por mora'}`,
        text,
        showCancelButton: true,
        confirmButtonText: enabled ? 'Activar' : 'Desactivar',
        cancelButtonText: 'Cancelar',
        focusCancel: true,
        allowOutsideClick: false,
      });
      if (!result.isConfirmed || !mounted.current) return;
      const response = await axios.post<Settings>(endpoint, {
        setting, enabled, revision: settings.revision,
      }, { headers: headers(), timeout: 20000 });
      if (!mounted.current) return;
      setSettings(response.data);
      await Swal.fire({
        icon: 'success', title: 'Configuración actualizada',
        text: 'El cambio quedó registrado en la auditoría. No se modificaron cuotas ni pagos.',
        confirmButtonText: 'Aceptar',
      });
    } catch (error) {
      if (!mounted.current) return;
      // Re-read after an uncertain response or conflict; never silently retry a global change.
      await load();
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      await Swal.fire({
        icon: 'error', title: 'No se pudo confirmar el cambio',
        text: typeof message === 'string' ? message : 'Revisa el estado actualizado antes de volver a confirmar.',
        confirmButtonText: 'Aceptar',
      });
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <section className="ap-automation" aria-labelledby="ap-automation-title" aria-busy={loading || busy}>
      <div className="ap-automation-heading">
        <h2 id="ap-automation-title">Automatización global</h2>
        <button type="button" className="ap-icon" title="Actualizar automatización" aria-label="Actualizar automatización"
          disabled={loading || busy} onClick={() => void load()}>
          <FontAwesomeIcon icon={faRotateRight} />
        </button>
      </div>
      {unavailable && <p role="status" className="ap-muted">No se pudo consultar la configuración.</p>}
      {settings && !settings.migrationReviewed && <p className="ap-muted">Revisión de migración pendiente. Puedes solicitar la activación; el servidor validará los requisitos antes de aplicarla.</p>}
      <p className="ap-muted">Estos controles son independientes. La generación manual de cuotas y el registro manual de pagos siguen disponibles con la automatización activada o desactivada.</p>
      <div className="ap-automation-controls">
        {controls.map(({ setting, key, label }) => (
          <label className="ap-automation-control" key={setting}>
            <span>{label}<small>{loading ? 'Consultando...' : settings ? settings[key] ? 'Activado' : 'Desactivado' : 'Sin confirmar'}</small></span>
            <input type="checkbox" role="switch" aria-label={label} checked={settings?.[key] === true}
              disabled={loading || busy || !settings}
              onChange={(event) => void change(setting, event.target.checked)} />
            <span className="ap-automation-lever lever" aria-hidden="true" />
          </label>
        ))}
      </div>
    </section>
  );
}
