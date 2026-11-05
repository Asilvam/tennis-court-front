# Controles globales en Mensualidades CTQ

Fecha: 2026-11-01. Estado: implementacion local; sin despliegue ni activacion real.

## Interfaz y contrato

`AdminMembershipPayments.tsx` monta `MembershipAutomationSettings.tsx` solo con
`!memberId && !context`: configuracion GLOBAL, no opciones de un socio individual.
Dos switches accesibles (`role=switch`, nombre y estado), con CTQ azul/celeste,
estados legibles, foco visible y ancho minimo tactil 44px. En movil se apilan;
en tablet/escritorio dos columnas. CSS en `AdminMembershipPayments.css`.

- Generacion recurrente -> backend `automation.enabled`.
- Bloqueo de reservas por mora -> backend `autoBlockEnabled`.
- No se cambia `automation.terminationEnabled`, ni pagos o cuotas existentes.

GET autenticado a `/membership-billing/admin/automation/settings`, independiente
de la busqueda/paginacion de socios. POST al mismo endpoint con un campo logico
`setting`, booleano `enabled` y `revision` recibida del servidor. El backend
verifica rol/actividad actuales y migracion revisada para activar, sin nuevas env.

Confirmaciones y errores de guardado usan SweetAlert2. No hay cambios optimistas
visuales antes de la respuesta. Ref impide duplicar dialogos/envios; ambos switches
se bloquean durante confirmacion/envio. Cancelar no envia nada. Conflicto o timeout
relee configuracion y exige una nueva decision; no reenvia automaticamente.
Error de lectura muestra estado no confirmado y switches no editables, con
reintento mediante icono de actualizar. Las solicitudes tienen limite de 20s.

Actualizacion aprobada de etapa 2: la confirmacion al apagar generacion indica
que solo queda disponible la generacion manual administrativa. Consultar el portal
o cotizar ya no emite meses. No cambia las reglas de los switches ni los pagos.
Ver [implementacion coordinada](../../tennis-app-backend/docs/membership-generation-stage-2.md).

La correccion adicional de Habilitar socios hace reversible la seleccion global
de pendientes, expone aria-pressed y no selecciona casos no elegibles.

## Ajuste de acceso a los controles (2026-11-01)

La revision de migracion pendiente ya no deshabilita los interruptores en React.
El administrador puede abrir la confirmacion y solicitar el cambio. El backend
conserva su validacion de migracion: si rechaza la activacion, se vuelve a leer
el estado y se muestra el motivo sin activar visualmente el control.
Durante carga, confirmacion/envio o falta de configuracion confiable se conserva
el bloqueo temporal de los controles.

Un texto visible aclara que generacion manual y registro manual de pagos son
independientes del estado de los dos interruptores. No se modifico configuracion
real, aprobacion de migracion ni backend como parte de este ajuste.
