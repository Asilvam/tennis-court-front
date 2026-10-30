# Plan tecnico: creacion de cuotas mensuales

Fecha: 2026-10-29, America/Santiago.
Estado: etapas 1 backend y 2 React implementadas y validadas localmente;
etapa 3 integrada/fisica pendiente.
Sin cambios de datos del club, configuracion productiva o despliegues.
Frontend base: `32bba18` (miniatura CTQ ya versionada, sin push).
Backend de referencia: `2fc86e9`; no modificar ajustes locales ajenos.

## Objetivo y evidencia

Separar claramente la creacion de cuotas y el registro de dinero recibido.
El rango de meses elegido debe coincidir con la revision y la confirmacion;
la operacion habitual no debe exigir un motivo libre al administrador.

Diagnostico previo y evidencia de seis recorridos en Chromium/WebKit, a
390/820/1440 px:
[revision-habilitacion-mensualidades.md](revision-habilitacion-mensualidades.md).
Se reprodujo la seleccion hasta enero con una sola fila en la revision y
el motivo obligatorio. Las APIs fueron simuladas y no se habilitaron socios.
El desbordamiento nativo de mes de las capturas del iPhone no se reprodujo
localmente: queda pendiente de verificacion fisica, no se considera resuelto.

## Flujo propuesto

1. Administrador entra al detalle del socio, pestana Cuotas.
2. Pulsa `Generar cuotas`; esta accion no abre el registro de un pago.
3. Si falta el inicio, elige mes de inicio y mes hasta el que preparar cuotas.
   Si ya esta habilitado, se conserva su inicio/vigencia y elige hasta cuando
   completar los periodos faltantes; no puede cambiar el inicio con este flujo.
4. Revisa meses, beneficiarios, importes, total de cuotas nuevas y cuotas que
   ya existen. Ejemplo: octubre a enero inclusive son cuatro meses, no uno.
5. Confirma con SweetAlert2. El backend crea solo los registros faltantes y,
   si corresponde, establece la vigencia inicial; no registra dinero.
6. La tabla se actualiza con cuotas por pagar. `Registrar pago` es independiente:
   el administrador selecciona cuotas existentes, medio, recepcion completa y
   datos del comprobante segun las reglas actuales.

Sin cuotas nuevas, mostrar un resultado sin cambios, no una falsa generacion
ni un pago. Sin cuotas abiertas, Registrar pago permanece deshabilitado.
El historial sigue mostrando pagos, no la lista de cuotas generadas.

## Reglas que se conservan

- Admin: periodos permitidos por vigencia, hasta el mes actual mas tres futuros.
  El limite es relativo al calendario de America/Santiago, no a una fecha fija.
- Socio: atrasados y actual, sin permitir adelantos desde su portal.
- Tarifas vigentes por tipo/tarifa de prueba; no cambiar precios ni sumar abonos
  parciales. En pruebas aisladas usar titular $180 y carga $50.
- Cuentas inactivas: no generar meses nuevos. Bajas y reinscripciones conservan
  sus reglas, meses no cobrables e historico no exigible.
- No sustituir cuotas pagadas, anular pagos ni reescribir aprobaciones anteriores.
- No cambiar el bloqueo automatico, vencimiento, tareas mensuales o acceso a
  reservas como parte implicita de esta mejora.
- No crear cuotas por ver el detalle, cambiar una pestana, filtrar historial
  o abrir Registrar pago. La generacion manual debe ser una accion explicita.
- La preparacion automatica existente de cada mes continua funcionando sin
  requerir un clic de admin; debe coexistir sin duplicados con la generacion manual.

## Etapa 1: contrato y backend

### Reutilizacion y alcance

Reutilizar socios/vigencias existentes, `membership_dues`, pagos y auditoria.
No crear tablas/colecciones, modelos paralelos ni variables de entorno.
Reutilizar `initialEnrollmentPlan`, `prepareDuesInSession`, politicas de
vigencia/precios, transacciones e indices unicos; evitar implementar otro
calendario o motor de cuotas para esta pantalla.

Archivos principales:

- `billing-enrollment.policy.ts`: permitir rango explicito en alta inicial.
- `billing-admin.service.ts` / `billing-admin.controller.ts`: preview,
  confirmacion, auditoria y carga de detalle sin preparacion implicita.
- DTOs de alta/generacion: rango validado y aprobacion de la revision.
- `membership-billing.service.ts`: reutilizar generacion y condiciones de
  vigencia; no ampliar efectos especiales de reinscripcion a una alta normal.

### Contratos propuestos

| Operacion | Reutilizar / ajustar | Entrada y comportamiento |
| --- | --- | --- |
| Revision inicial | `POST members/:id/enrollment/preview` | startPeriod + throughPeriod; solo lectura, sin vigencia/cuotas nuevas |
| Confirmacion inicial | `POST members/:id/enrollment` | Mismo rango + approvalHash + Idempotency-Key; alta inicial y cuotas atomicas |
| Revision posterior | `POST members/:id/dues/preview`, nuevo endpoint acotado propuesto | Socio ya habilitado; throughPeriod, cuotas nuevas/existentes e importes, sin escribir |
| Confirmacion posterior | `POST members/:id/dues`, existente | Rango revisado, huella y clave de reintento; crear solo faltantes |
| Abrir registro de pago | `GET members/:id`, existente | Leer cuotas; nunca generar meses como efecto de abrir el formulario |
| Quote / pago manual | Endpoints existentes | Usar IDs de cuotas existentes; no alterar la liquidacion o Mercado Pago |

El endpoint adicional fue implementado localmente en la etapa 1, reutilizando
las politicas y transacciones existentes. Revisa cuotas aun inexistentes sin
escribir; el quote actual por IDs no cubre ese caso. Todavia no esta desplegado.

La respuesta de revision debe distinguir `newRows`, `existingRows`, los
periodos no elegibles si corresponde y sus totales. Cuatro meses elegidos
pueden representar menos de cuatro cuotas nuevas si algunas ya existen;
la pantalla debe mostrar ambas cantidades, sin prometer duplicarlas.

### Auditoria, concurrencia y compatibilidad

- Alta/generacion normal: codigo de operacion, administrador autenticado, fecha,
  beneficiarios, rango y cuotas afectadas. Razon de sistema automatica, creada
  por backend; no enviar desde React una frase escondida para superar MinLength.
- Separar validacion inicial y reinscripcion: hoy comparten DTO/metodo. Mantener
  los motivos de reinscripcion, anulacion y excepciones; no volverlos opcionales
  por un cambio global del DTO.
- La huella incluye seleccion de socios, rango, tipos/titular, estado relevante,
  cuotas existentes y precios. Si cambian entre revision y confirmacion: 409 y
  nueva revision, sin creacion parcial.
- Validar permisos, estado activo y vigencia nuevamente dentro de transaccion.
  Conservar el indice por beneficiario/mes y serializacion existente; concurrentes
  o generador automatico no deben producir duplicados ni pisar pagos.
- Misma clave/misma solicitud devuelve el resultado previo; otra solicitud con
  la misma clave se rechaza. Guardar el rango concreto: un reintento despues
  del cambio de mes no debe extenderlo silenciosamente.
- Cargas: indicar expresamente los beneficiarios afectados, reutilizando la
  seleccion familiar existente. No habilitar otras cargas por una accion que
  visualmente solo confirme al socio, ni reemplazar aprobaciones previas del masivo.
- Compatibilidad: inventariar clientes actuales de POST /dues y de enrollment.
  No exigir campos nuevos sin estrategia de transicion. Para alta antigua sin
  throughPeriod, el comportamiento por defecto puede conservar mes actual,
  pero el cliente nuevo siempre envia rango explicito y la huella validada.
  Definir compatibilidad de huellas/claves antes de publicar; no habilitar un
  bypass para solicitudes nuevas sin revisar. No agregar flags de entorno.

Salida de etapa 1: contratos y politicas aprobados, unitarias e integracion
Mongo fixture verdes; ningun cambio de API publicado ni datos reales tocados.

## Etapa 2: React y experiencia responsive

- Sustituir el selector desconectado y el alta dispersa por un editor de
  generacion con rango y revision juntos. La interfaz no debe prometer un
  periodo que luego no envia al backend.
- Para socio ya habilitado, mostrar inicio/vigencia registrados sin permitir
  una migracion/reinscripcion accidental. Revisar meses faltantes hasta el limite.
- Quitar motivo libre del alta/generacion normal; conservar los formularios
  excepcionales y su validacion.
- `Registrar pago` solo carga contexto con GET y cuotas existentes. La revision
  de meses no debe estar escondida en ese boton. Generar no debe abrir checkout
  ni registrar un pago bancario/efectivo.
- Invalidar preview al cambiar rango o beneficiarios; confirmar con los mismos
  datos revisados. Bloquear doble clic y navegacion incompatible durante el envio.
- Si hay timeout, conservar clave y solicitud, no asumir error financiero ni
  generar otro intento distinto. Sesion vencida sigue el login global.
- Reactivar/recargar la tabla al completar la operacion; eliminar mensajes vacios
  redundantes mientras se revisan cuotas. Confirmaciones siempre con SweetAlert2.
- Respetar colores y patrones CTQ; ajustes propios en AdminMembershipPayments.css.
- Movil: una columna, campos con ancho contenido y fuente de al menos 16 px,
  accion primaria clara y resumen cercano. Usar el selector existente con meses
  en espanol si el input month nativo sigue fallando; no modificar viewport ni
  desactivar zoom del usuario para esconder el problema.
- Historial: filtro de mes comprensible cuando no hay seleccion; no confundir
  cero pagos con fallo en la creacion de cuotas. Probar foco/scroll y formularios
  completos, no solo el estado inicial.
- Cabecera/zona segura iOS: investigar y ajustar solo donde se reproduzca. No
  ampliar el trabajo a un rediseno global de navegacion sin justificacion.

Archivos principales: AdminMembershipPayments.tsx, AdminMembershipMember.tsx,
MembershipEnrollment.tsx, integracion familiar donde corresponda, tipos/helpers
de mensualidades y CSS de esta ventana. No reutilizar estilos de otra pantalla
solo por su nombre ni alterar el portal para permitir adelantos al socio.

Salida de etapa 2: flujo real conectado con contratos de etapa 1, sin motivos
rutinarios y sin preparacion oculta al registrar pago, con unitarias de React.

## Etapa 3: regresion, E2E y documentacion de entrega

| Caso | Resultado esperado | Nivel |
| --- | --- | --- |
| Inicio y fin en mes actual | Una cuota y auditoria automatica, ningun pago | Unitarias + Mongo |
| Octubre a enero, reloj en octubre | Cuatro periodos en revision; mismas cuotas al confirmar | Unitarias + Mongo + E2E |
| Ya existen dos de esos meses | Dos existentes + dos nuevas; sin sobrescribir | Mongo + E2E |
| Hasta mes actual +4, rango invertido o anterior al inicio permitido | Rechazo sin escrituras | DTO/politica + HTTP |
| Generacion normal sin motivo | Permitida; actor/fecha/rango auditados por backend | Servicio + HTTP |
| Reinscripcion/anulacion sin motivo | Mantiene su rechazo actual | Regresion |
| Cuenta inactiva / periodos fuera de vigencia | Sin deuda nueva ni reapertura indebida | Mongo |
| Titular/carga / cambio de tipo mientras se revisa | Precio autorizado o conflicto; sin sobreescribir pagados | Mongo + E2E |
| Pago confirmado, historico no exigible, mes inactivo | Conservar importes/estado e historial | Mongo |
| Doble clic, timeout, reintento o concurrencia con generador mensual | Una operacion efectiva, sin cuotas duplicadas | Mongo + E2E |
| Cambio de mes, precio, vigencia o seleccion tras preview | Conflicto o resultado idempotente previo, nunca rango extendido | Unitarias + Mongo |
| Generar cuotas y luego abrir historial | No aparecen como pagos; sigue el registro correcto de cuotas | E2E |
| Abrir/cancelar formulario de pago | Solo lectura de cuotas, sin generacion ni ingresos | HTTP + E2E |
| Registro efectivo/transferencia/deposito y reconciliacion MP existentes | Sin regresiones de importes, auditoria e idempotencia | Suites existentes |
| No admin o intento de adelantar desde socio | Rechazado por backend | HTTP/JWT |
| Formularios en 390/820/1440, Chromium/WebKit | Sin solapes, saltos de contenido ni perdida de foco observada | E2E + capturas |
| iPhone/iPad real con teclado y Safari | Verificar overflow, foco, scroll y area segura; no dar por simulado | Manual autorizada |

Las bases de prueba son desechables, solo localhost y replica set para
transacciones. Usar fixtures equivalentes a usuario test 1/test 2 con precios
180/50; no modificar cuentas piloto reales sin nueva autorizacion. SDK de
Mercado Pago y correo simulados: no realizar cobros, enviar correos o habilitar
socios del club para hacer pasar el E2E.

Guardar evidencia nueva: comandos y versiones, informes de unitarias, estado
de BD fixture antes/despues, traza de requests, hashes de codigo y capturas
sin datos personales. No reutilizar las 251 pruebas de miniatura como prueba
de esta correccion ni afirmar que la revision anterior ya valido persistencia.

Actualizar el tema de mensualidades del README de frontend/backend con flujo,
contratos y mantenimiento. `.env.example` solo si cambia configuracion; este
plan no preve variables nuevas. Documentar lo ejecutado, lo simulado y lo que
sigue pendiente en equipo fisico y sitio publicado.

Salida de etapa 3: reporte tecnico de la correccion, suites aprobadas y limites
explicitos. Solicitar commit/push/despliegue por separado; primero backend y
luego frontend con compatibilidad confirmada. No activar bloqueos ni hacer una
generacion masiva al publicar esta mejora.

## Estado y decisiones de inicio

- [x] Diagnostico y evidencia de la confusion actual.
- [x] Plan en tres etapas con impacto, contratos y pruebas.
- [x] Aprobar alcance de etapa 1: rango coherente, auditoria automatica normal
  y separacion efectiva entre generar cuotas y registrar ingresos.
- [x] Implementar y verificar etapa 1 de contratos/backend.
- [x] Implementar y verificar etapa 2 de React con unitarias y API simulada.
- [ ] Verificar etapa 3 de flujo completo con Nest/Mongo y regresion integrada.
- [ ] Autorizar publicacion y completar comprobacion fisica/publicada.

La etapa 1 esta implementada sin commit ni despliegue. El plan y la revision
de cuotas permanecen separados del commit `32bba18` de identidad visual.

## Ejecucion de etapa 1 (2026-10-29)

- Alta inicial individual/familiar acepta throughPeriod y conserva el limite
  de actual mas tres; omitirlo conserva la compatibilidad del mes actual.
- Backend crea razon automatica normal cuando falta texto. DTOs separados
  mantienen motivo obligatorio y rango excepcional intacto en reinscripcion.
- Nuevo POST members/:id/dues/preview de solo lectura; confirmacion revisada
  reutiliza POST members/:id/dues con approvalHash e Idempotency-Key.
- Preview distingue cuotas nuevas, existentes y meses fuera de vigencia.
  Se probaron pagos/historico conservados, concurrencia, cambio de mes y rollback.
- Contrato legacy sin approvalHash permanece disponible para el frontend
  anterior; retirarlo o dejar de usarlo en la pantalla corresponde a etapa 2.
- Resultado real: 883 pruebas backend aprobadas, 56 suites, 0 omitidas; HTTP/JWT
  y MongoDB fixture reales, proveedores externos simulados. Tipos y lint
  enfocado aprobados. No se ejecutaron cobros ni cambios de socios reales.

Informe y hashes en el backend:
`docs/membership-dues-generation-stage-1.md` y
`docs/evidence/dues-generation-stage1/validation.json`.
Al terminar la etapa 1 no se habia modificado React. La eliminacion del motivo
visible, el rango conectado y los ajustes responsive se ejecutaron despues,
en la etapa 2 descrita abajo.

## Ejecucion de etapa 2 (2026-10-29)

- Editor individual: rango, preview y confirmacion conectados. Alta normal sin
  motivo; generacion posterior conserva inicio/vigencia y usa approvalHash.
- Editor familiar/masivo: rango explicito en revision y confirmacion, seleccion
  de beneficiarios y omision de habilitados; sin motivo rutinario.
- Registrar pago solo consulta GET members/:id. Ya no llama al POST legacy de
  generacion; no abre formulario sin cuotas existentes elegibles.
- Selectores de meses en espanol, reutilizando MembershipBillingSelect;
  eliminados input month nativos de esta pantalla y selector externo desconectado.
- Reintentos inciertos conservan payload y clave; deshabilitan edicion/cancelacion
  y navegacion mientras se resuelve la operacion. Se conserva el login global 401.
- 257 pruebas frontend aprobadas, lint y TypeScript sin errores, build aprobado.
- 168 comprobaciones aprobadas en Chromium/WebKit, 320/390/820/1440 px;
  API con estado simulada, sin Nest/Mongo, cobros o datos reales.

Informe tecnico y evidencia:
[mensualidades-etapa-2-react.md](mensualidades-etapa-2-react.md).
Estos resultados no cierran etapa 3 ni certifican Safari en dispositivos fisicos.
