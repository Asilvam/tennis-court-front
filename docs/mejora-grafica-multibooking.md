# Multi-booking: distribucion responsive y confirmacion

Fecha: 2026-10-30, America/Santiago. Rama: `codex/mejora-grafica`.
Estado: implementado y validado localmente. Sin commit, push o despliegue.

## Diagnostico comprobado

La revision anterior se hizo con el build real y acceso simulado, sin enviar
reservas. El registro original esta en
[review-before.json](evidence/multibooking/review-before.json).

- Un detalle de 80 caracteres sin espacios llevaba el ancho del documento a
  716 px en pantallas de 320 y 390 px. La fila del motivo no podia contraerse.
- En escritorio la configuracion seguia en una columna; no aprovechaba el
  contenedor compartido con Inicio.
- El calendario mostraba el mes en ingles y no marcaba las fechas ya elegidas:
  no recibia la seleccion multiple del estado React.
- La apertura de fechas era un div no enfocable; quitar fechas usaba spans sin
  semantica de boton. El indicador condicional de los checkboxes cambiaba su
  geometria al marcar. Space tambien podia desplazar la pagina.
- El envio masivo comenzaba sin una confirmacion previa de las combinaciones.

## Alcance y ejecucion

1. Se sustituyo la distribucion de una columna por dos secciones sin tarjetas
   anidadas y un resumen comun. Se mantiene el ancho maximo/gutter de Inicio.
2. Se sincronizaron fechas y calendario, se cambiaron controles simulados por
   controles nativos y se incorporo la confirmacion aprobada con SweetAlert2.
3. Se ejecutaron pruebas unitarias, recorridos responsive y regresion de las
   otras vistas. Se revisaron capturas y estilos computados, no solo tokens CSS.

Runtime modificado: `src/components/MultipleBookingForm.tsx` y su archivo
`src/styles/MultipleBookingForm.css`. No se modifican backend, permisos,
Mercado Pago, correo, mensualidades o datos del club en esta entrega.
Los cambios anteriores del working tree se conservan.

## Distribucion y paleta

| Ancho | Disposicion |
| --- | --- |
| Desde 1024 px | Canchas/fechas a la izquierda; turnos/motivo a la derecha |
| Menos de 1024 px | Secciones apiladas; tres columnas de turnos cuando caben |
| Hasta 640 px | Turnos en dos columnas; acciones de ancho completo |
| Hasta 360 px | Checkbox y texto de cancha apilados en un objetivo estable |

Se usan `--ctq-page-max`, `--ctq-page-gutter`, `--ctq-text`,
`--ctq-text-muted`, `--ctq-accent`, `--ctq-accent-deep`,
`--ctq-surface-bottom`, `--ctq-border-soft` y `--ctq-yellow` existentes.
Seleccion celeste, accion principal y fechas seleccionadas amarillas, texto
oscuro sobre amarillo. El hover no elimina el contraste de las fechas elegidas.
No se altera la paleta global; CSS acotado a los prefijos mbf-.

`minmax(0, 1fr)`, `min-width: 0` y `overflow-wrap: anywhere` permiten partir el
motivo sin ensanchar el documento. El detalle tiene fuente de 16 px y borde
propio; `browser-default` evita que Materialize lo convierta en un input de linea.
No se deshabilita el zoom accesible del navegador.

## Controles y calendario

- Checkboxes nativos dentro de labels: Space funciona sin scroll accidental;
  no se inserta un icono que cambie el ancho al seleccionar. Objetivos de 48 px
  o mas; quitar fechas y controles de calendario tienen al menos 44 px.
- Apertura de fechas con boton/ref tipados. Calendario en espanol y
  `selectsMultiple`/`selectedDates` sincronizados; fechas ordenadas y sin duplicados.
- Cada fecha puede quitarse con un boton cuyo nombre incluye la fecha completa;
  el foco vuelve al selector sin desplazar la pagina. Boton Listo para cerrar.
- El calendario conserva los colores CTQ tambien al pasar el cursor. Se limita
  el popper al viewport; `shift({ padding: 8, crossAxis: true })` evita que quede
  cortado cuando no hay suficiente espacio a un lado del disparador.
- Motivo mantiene el selector adaptativo existente y su retorno de foco. Abrir
  motivo cierra el calendario; el profesor conserva su nombre completo fijo.

Se declaran directamente `date-fns@4.1.0` (locale espanol) y
`@floating-ui/react@0.27.20` (shift). Ya estaban instalados como dependencias
del `react-datepicker@8.10.0` usado en la prueba. No se incorpora otro motor de
calendario ni se descarga una libreria para esta correccion. Se deja intacto
el `package-lock.json` local preexistente no versionado.

## Contrato y estados de envio

Se conserva POST `${VITE_API_URL}/booking/multiple`, Bearer y JSON:

```json
{
  "courts": ["Cancha 1"],
  "dates": ["2026-11-01"],
  "turns": ["08:15-10:00"],
  "motive": "Campeonato - Final CTQ"
}
```

Mismas tres canchas, ocho turnos, motivos existentes, maximo 10 fechas,
maximo 100 combinaciones, detalle opcional de 80 caracteres y rechazo de
fechas pasadas. No se cambian roles ni controles de autorizacion del servidor.

Flujo: seleccion -> validaciones -> resumen SweetAlert2 -> confirmacion -> POST.
El resumen usa texto plano con total, canchas, fechas, turnos y motivo, sin
inyectar HTML del usuario. Revisar cancela sin POST y conserva el borrador.

Una ref sincrona bloquea doble clic antes del primer render. Estados
`confirming` y `sending` deshabilitan formulario y Cancelar; el guard existente
evita navegacion interna durante la operacion. Spinner CTQ solo durante envio.
Payload copiado antes de confirmar, timeout 30 segundos, sin reintento automatico.
Exito limpia seleccion; error conserva datos y pide revisar las reservas antes
de reenviar. Un 401 se deja al cierre de sesion global, sin alerta local competidora.

Esto evita duplicar una solicitud activa en esta instancia del formulario;
no ofrece idempotencia entre recargas ni confirma si un timeout dejo reservas
persistidas. Esas garantias requieren soporte y verificacion del backend.

## Verificacion y evidencia

Node 22.22.2, Vite 7.3.7; suite del working tree completo, incluyendo las
mejoras anteriores pendientes:

- **280 pruebas unitarias aprobadas**, 0 fallidas/omitidas; 12 nuevas de Multi-booking.
- **12 recorridos y 288 comprobaciones E2E**: Chromium y WebKit a 320x760,
  390x844, 820x1024, 1024x768, 1440x1000 y 820x500.
- Regresion de 13 vistas, dos motores, 820/1440 px:
  **52 vistas y 226 comprobaciones** de contenedores/alineacion/paleta.
- Lint, TypeScript, build y `git diff --check` aprobados.

Los E2E comprueban ancho con detalle sin espacios, layout de columnas, estabilidad
de checkboxes, teclado, calendario visible y espanol, contraste de todas las
fechas seleccionadas incluso en hover, borde del input, resumen cartesiano,
cancelacion, error simulado, guardia de doble clic, POST exacto y Bearer,
limites de fechas/reservas, profesor y redireccion al login ante 401.

```sh
npm run test:multibooking
node --experimental-strip-types --test tests/*.test.ts tests/*.test.mjs
npm run lint
npx tsc -b
VITE_API_URL=https://api.ctq-fixture.invalid npm run build -- --outDir /private/tmp/ctq-multibooking-dist-final --emptyOutDir
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ctq-playwright-browsers node tests/e2e/multibooking.mjs /private/tmp/ctq-multibooking-dist-final /private/tmp/ctq-multibooking-evidence /ruta/al/modulo/playwright/index.mjs
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ctq-playwright-browsers node tests/e2e/pageLayout.mjs /private/tmp/ctq-multibooking-dist-final /private/tmp/ctq-layout-regression-multibooking /ruta/al/modulo/playwright/index.mjs 820,1440
git diff --check
```

Evidencia versionable en `docs/evidence/multibooking/`:

- [multibooking.json](evidence/multibooking/multibooking.json): comprobaciones,
  geometria, versiones de navegadores, payloads ficticios sin token y hashes SHA-256.
- [unit.tap](evidence/multibooking/unit.tap): salida real de las 280 pruebas.
- [page-layout.json](evidence/multibooking/page-layout.json): regresion de vistas.
- [Escritorio](evidence/multibooking/form-chromium-1440x1000.png),
  [movil](evidence/multibooking/form-webkit-390x844.png),
  [tablet](evidence/multibooking/form-webkit-820x1024.png) y
  [calendario horizontal](evidence/multibooking/calendar-webkit-820x500.png).

## Limites y publicacion

Las APIs de club/reservas son fixtures `.invalid`; ninguna reserva fue creada
en la base real. No se inicio el backend ni sus tareas programadas. No es un E2E
integrado contra NestJS ni certifica teclado/zoom de Safari en iPhone/iPad fisico;
esa comprobacion sigue pendiente antes de cerrar QA en dispositivos reales.

No hay variables de entorno nuevas, por lo que `.env.example` no cambia.
Se reutiliza exclusivamente `VITE_API_URL`. Sin commit/push/despliegue en este paso.
