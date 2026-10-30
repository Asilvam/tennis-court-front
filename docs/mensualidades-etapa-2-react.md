# Mensualidades: etapa 2 React

Fecha: 2026-10-29, America/Santiago. Estado: implementado y verificado localmente,
sin commit, push ni despliegue. Base frontend: `32bba18` en develop.
Depende del contrato backend local de etapa 1; publicar backend antes de frontend.

## Cambio y causa

El selector externo `Preparar cuotas hasta` solo se enviaba al abrir el registro
de pago. La habilitacion inicial enviaba unicamente startPeriod y el backend
preparaba el mes actual. Por eso elegir enero no implicaba generar cuatro meses.
El formulario normal exigia ademas un motivo reservado conceptualmente a una
decision excepcional. Se separaron generacion de deuda y recepcion de dinero.

## Uso administrativo

1. Abrir Mensualidades desde Usuarios o `Ver cuotas del socio` en el listado global.
2. Pulsar `Generar cuotas`. Sin inicio aprobado, seleccionar desde/hasta; con
   inicio ya registrado, solo hasta. El limite admin sigue siendo actual + 3.
3. Revisar meses e importes nuevos, total y cuotas existentes sin cambios.
   Octubre 2026 a enero 2027 inclusive representa cuatro meses.
4. Confirmar con SweetAlert2. No se exige motivo ni se registra dinero.
5. Para titular/cargas sin inicio, usar la seleccion familiar explicita. Un socio
   ya habilitado no se vuelve a habilitar. La generacion posterior individual
   afecta solo al socio de ese detalle, no silenciosamente a toda su familia.
6. Registrar el dinero recibido mediante `Registrar pago`, usando cuotas ya
   creadas, medio y comprobaciones actuales. Sin cuotas elegibles esta deshabilitado.
   Mercado Pago sigue su reconciliacion existente, sin modificaciones en esta etapa.

El historial muestra ingresos registrados, no cuotas recien creadas. Reinscripcion,
revision de vigencia y anulaciones conservan sus motivos y reglas excepcionales.
No se cambiaron bloqueo automatico, tareas mensuales, tarifas generales, portal
del socio, autenticacion del backend o configuracion productiva.

## Contratos consumidos

Prefijo `/membership-billing/admin`, JWT de administrador y validacion backend.

| Accion | HTTP / ruta | Datos |
| --- | --- | --- |
| Revisar alta individual | POST members/:id/enrollment/preview | startPeriod, throughPeriod |
| Confirmar alta | POST members/:id/enrollment | rango revisado, approvalHash, cabecera Idempotency-Key |
| Revisar faltantes | POST members/:id/dues/preview | throughPeriod |
| Crear faltantes | POST members/:id/dues | throughPeriod revisado, approvalHash, Idempotency-Key |
| Revisar familia/masivo | POST enrollment/preview | startPeriod, throughPeriod, familyMemberId si aplica |
| Confirmar familia/masivo | POST enrollment | rango revisado, IDs/huellas seleccionados; lotes estables de 10 |
| Abrir pago | GET members/:id | solo lectura, sin POST /dues ni generacion implicita |
| Reinscribir | POST members/:id/reenrollment[/preview] | mes actual; confirmacion con motivo y huella |

No se envian precios desde React para crear cuotas. El preview y el backend
determinan importe, estado y elegibilidad. Los motivos normales son automaticos
del backend; no se oculta una frase en React para eludir validaciones.

## Estados y responsive

- Cambiar rango invalida preview/seleccion; confirmar usa el rango devuelto por
  backend, no valores locales editados posteriormente.
- Single-flight evita dobles clics. Tras respuesta perdida o 5xx, se mantiene
  solicitud y clave exactas; reintentar no solicita otra revision ni otra clave.
- Se bloquean campos, cierre y navegacion durante envio/resultado incierto.
  Conflicto o rechazo definitivo 4xx exige nueva revision; 401 queda a cargo
  del cierre de sesion global. No se marca una cuota pagada por un timeout.
- Cuotas nuevas/existentes separadas; cero nuevas muestra total cero y resultado
  sin cambios. Abrir/cancelar un pago no genera deuda ni ingresos.
- Meses en espanol mediante el selector React existente. Sin input month nativo
  en esta ventana; historial sin filtro muestra `Todos los meses`.
- CSS propio en AdminMembershipPayments.css, colores CTQ conservados. Una
  columna y acciones apiladas en movil; controles de al menos 44/46 px.
- No se modifica viewport ni se deshabilita el zoom del usuario.

## Verificacion ejecutada

Node 22.22.2, Vite 7.3.7. Comandos desde el repositorio frontend:

```sh
node --experimental-strip-types --test tests/*.test.ts tests/*.test.mjs
npm run lint
npx tsc -b
VITE_API_URL=https://api.ctq-fixture.invalid npm run build -- --outDir /private/tmp/ctq-dues-stage2-dist
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ctq-playwright-browsers node tests/e2e/duesGeneration.mjs /private/tmp/ctq-dues-stage2-dist /private/tmp/ctq-dues-stage2-final /ruta/al/modulo/playwright/index.mjs
```

- Unitarias frontend: **257 aprobadas, 0 fallidas, 0 omitidas**. Incluyen altas,
  rangos, motivo excepcional, preservacion de identidad, conflictos y apertura
  de pago solo lectura; regresion de autenticacion, reservas y pagos existente.
- Lint, TypeScript y build: aprobados. Advertencia de build: salida temporal fuera
  del proyecto, prevista para la prueba aislada; no se modifico dist productivo.
- Navegador: **168 comprobaciones, 8 recorridos**, Chromium/WebKit a
  320/390/820/1440 px. Revision, cancelacion, generacion, historial, apertura de
  pago, cero nuevas, mes pagado, timeout tras escritura simulada, reintento exacto,
  carga a $50, titular a $180, omision del ya habilitado y 401 hacia login.
- Capturas y medicion DOM: sin overflow horizontal ni interseccion de los
  controles revisados. Inspeccion visual de preview movil WebKit y desktop Chromium.

Evidencia: [informe de navegador](evidence/dues-generation-stage2/dues-generation-ui.json),
[unitarias TAP](evidence/dues-generation-stage2/unit.tap).
El JSON contiene versiones de navegador, hashes SHA-256 de fuentes y requests
fixture sin token. Capturas representativas en el mismo directorio.

## Limites y entrega

La prueba de navegador usa el build real de React con una API simulada con estado;
no ejecuta Nest, transacciones Mongo, SMTP ni Mercado Pago. Su token/IDs pertenecen
solo a fixtures locales. No certifica integridad financiera real ni persistencia
Mongo. Las 883 pruebas backend de etapa 1 son evidencia separada, no una nueva
ejecucion integrada de esta etapa.

La etapa 3 debe unir React con Nest/JWT/Mongo desechable y completar la regresion
de flujos, concurrencia y proveedores simulados. Queda pendiente iPhone/iPad
fisico con teclado, scroll y area segura; emular WebKit no prueba esos detalles
del sistema operativo. Tampoco se verifico esta correccion en el sitio publicado.

No se agregaron variables ni dependencias, por lo que no corresponde cambiar
`.env.example`. Se preservaron `.env`, lockfile y cambios locales ajenos.
No se habilitaron socios reales, registraron pagos, generaron cuotas del club
ni iniciaron checkout/correos. Commit, push y despliegue requieren indicacion separada.
