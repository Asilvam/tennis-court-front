# Revision tecnica: habilitacion de mensualidades

Fecha: 2026-10-29, America/Santiago. Estado: diagnostico y propuesta;
sin cambios de logica, cuotas, pagos, configuracion o datos del club.

## Hallazgos

### 1. El selector de meses no interviene en la habilitacion inicial

El usuario selecciona `Preparar cuotas hasta: enero de 2027`, pero
`MembershipEnrollment.review()` envia solo `{ startPeriod: '2026-10' }`
a `POST /membership-billing/admin/members/:id/enrollment/preview`.
El componente no recibe el estado `through` de la pantalla principal.

El backend `initialEnrollmentPlan()` genera desde startPeriod hasta el mes
actual (`periodsBetween(startPeriod, monthAt(now))`). Con inicio octubre y
reloj octubre, devuelve una fila. La confirmacion envia startPeriod,
approvalHash y reason; tampoco incluye throughPeriod.

El selector pertenece a otra operacion: `AdminMembershipPayments.open()`
envia `{ throughPeriod: through }` a `POST .../members/:id/dues`, y se ejecuta
al pulsar `Registrar pago`. Este boton esta deshabilitado para el socio aun
no habilitado. La seleccion hasta enero no es una promesa que el flujo de
habilitacion pueda cumplir: es un defecto de relacion entre controles y accion.
La confusion ocurre tanto en escritorio como en movil, no es solo responsive.

Referencias:

- `src/components/AdminMembershipPayments.tsx`: estado through, open y selector.
- `src/components/MembershipEnrollment.tsx`: review y enroll.
- Backend `src/membership-billing/billing-enrollment.policy.ts`: initialEnrollmentPlan.
- Backend `src/membership-billing/dto/enroll-membership.dto.ts`: contrato actual.

### 2. El motivo es auditoria de alta, no requisito del pago

La habilitacion actual no solo crea filas de cuotas. Tambien registra el
inicio de facturacion, baseline de migracion, intervalo de vigencia y evento
de auditoria. Por ese diseno se exigio una razon administrativa.

Actualmente es obligatoria en tres capas: validacion del frontend (minimo 5),
DTO con MinLength(5) y `BillingAdminService.enroll()` con comprobacion del
texto recortado. Se persiste en billingPeriods, auditoria y requestHash de
idempotencia. No se puede simplemente quitar el campo del frontend: el backend
seguiria rechazando la solicitud.

La necesidad de trazabilidad no implica que el administrador deba escribir
un motivo libre en cada generacion normal. Es posible conservar actor, fecha,
periodos, tipo de operacion y razon automatica en backend; esto requiere un
cambio de contrato deliberado, no el envio oculto de texto desde React.

La habilitacion inicial y la reinscripcion comparten DTO/metodo. Cualquier
simplificacion debe distinguirlas de anulaciones, ajustes o revisiones de
historial, sin eliminar motivos de esos flujos por accidente.

### 3. Se mezclan crear cuotas y registrar un ingreso

La preparacion de meses futuros esta ligada a abrir el formulario de pago.
La pantalla invita a usar Registrar pago para preparar registros aunque no
se haya recibido dinero. Recomendacion: separar ambas acciones visibles.

Crear cuotas no registra un pago. Por eso el historial vacio de las capturas
no demuestra que fallo la habilitacion: ese historial muestra ingresos, no
cuotas por cobrar. El aviso de exito espera Aceptar antes de ejecutar onSaved
y refrescar el detalle; la tabla de fondo puede seguir vacia durante el aviso.
No se detecto una perdida de cuotas ni se inspecciono la BD del socio real.

## Revision visual

Se revisaron Chromium y WebKit en 390, 820 y 1440 px (seis recorridos), con
cuenta admin y socio ficticios. Se inspeccionaron formulario, preview y
historial, sin confirmar una habilitacion ni registrar pagos.

| Observacion | Estado |
| --- | --- |
| Hasta enero visible, preview solo octubre | Reproducido en los seis recorridos |
| Aviso obligatorio por motivo vacio | Reproducido; no se envio la confirmacion |
| Controles sin conexion ocupan espacio antes de poder usarlos | Confirmado por estructura y capturas |
| En movil, confirmar habilitacion ocupa dos lineas junto a cancelar | Reproducido a 390 px |
| Mensajes pendientes/sin cuotas duplican informacion durante el alta | Visible en el montaje local |
| Fecha sale del ancho en capturas de iPhone del usuario | Observada en adjuntos; no reproducida en WebKit local |
| Documento/formulario local desborda horizontalmente | No: ancho 390/820/1440 igual al viewport |
| Input de mes local a 390 px | x=12, ancho=366, borde derecho=378, fuente=16px |
| Cabecera bajo la barra de estado del iPhone | Visible en adjuntos; sin reproduccion fisica ni causa certificada |

No atribuir el desbordamiento a una fuente pequena sin evidencia: el CSS
actual ya usa 16px en inputs. El control nativo de mes, la escala/viewport y
la zona segura requieren prueba en iPhone real. WebKit de escritorio, aun
con isMobile, no reproduce teclado, barra de estado y chrome de Safari iOS.

## Propuesta para decidir antes de implementar

1. Accion explicita `Generar cuotas`, sin depender de Registrar pago.
2. Elegir un rango coherente: desde octubre hasta enero debe mostrar cuatro
   cuotas en la revision, y confirmar exactamente ese rango. Mantener el
   limite administrativo ya acordado de mes actual mas tres futuros; no
   extender ese permiso al portal del socio.
3. En la primera generacion, el backend establece la vigencia si procede y
   audita automaticamente el alta normal. No pedir un motivo libre obligatorio
   para esa operacion rutinaria. Conservar controles administrativos de
   reinscripcion, anulaciones y excepciones hasta acordar su tratamiento.
4. Conservar cuotas/pagos existentes, generar solo periodos faltantes, reintentos
   idempotentes y rechazo de cambios de rango/tarifa tras la revision.
5. Registrar pago como accion separada: elegir cuotas ya generadas y medio,
   confirmar recepcion completa, sin preparar meses como efecto oculto.
6. Movil: rango y resumen juntos, botones con jerarquia clara, sin mensajes de
   estado duplicados y controles de mes contenidos. Revisar tambien historial,
   cabecera y zona segura; no redisenar toda la navegacion sin necesidad.

No se aprobo ni implemento aun este cambio de flujo. Alternativa de menor
alcance: ocultar el selector hasta que la habilitacion inicial termine; eso
evita la promesa falsa, pero mantiene dos operaciones y no simplifica por si
solo la generacion posterior. La recomendacion principal es separar cuotas e
ingresos y hacer que la seleccion de periodos corresponda a la accion visible.

## Evidencias y limites

- [Informe de los seis recorridos](evidence/enrollment-review/review.json).
- [Hashes del codigo inspeccionado y build](evidence/enrollment-review/sources.json).
- [Movil WebKit: enero seleccionado / una cuota](evidence/enrollment-review/preview-webkit-390.png).
- [Escritorio Chromium: mismo desacople](evidence/enrollment-review/preview-chromium-1440.png).
- [Historial movil vacio](evidence/enrollment-review/history-webkit-390.png).

El arnes local esta en `frontend-reservas-ctq/output/review-membership-enrollment.cjs`.
Usa el build aislado `/private/tmp/ctq-site-identity-dist`, respuestas API
simuladas y JWT fixture que nunca se envia al club. El POST de preview recibe
una respuesta ficticia; prueba que el frontend omite el rango, no que el
backend real haya generado una cuota. El comportamiento de backend se
contrasto leyendo su politica y DTO actuales, sin ejecutar escrituras.

Solo se permitieron consultas GET y POST a la preview simulada. No se pulso
confirmacion con motivo valido, ni se invocaron endpoints de alta o cobro.
Los navegadores se cerraron al finalizar. No se modifico codigo de aplicacion
ni se repitio una suite financiera: esta entrega es diagnostico, no correccion.
Las capturas guardadas contienen personas ficticias; no se copiaron a Git los
datos personales de las imagenes originales del usuario.

La implementacion posterior debe probar rango unico/varios meses, mes actual
mas tres futuros, titular/carga, aprobaciones previas, inactivos, operaciones
concurrentes, reintentos, auditoria sin texto libre y distincion entre cuotas y
pagos. Acompanarla con unitarias backend/frontend, integracion Mongo fixture
y E2E en movil/escritorio; no probar generacion contra socios reales sin permiso.
