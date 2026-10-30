# Usuarios, Historial, Reset Pass y Ranking: revision responsive

Fecha: 2026-10-30, America/Santiago.
Rama: `codex/mejora-vistas-admin-historial-reset`, desde `07b43c5` de develop.
Estado: implementacion local; no integrada, sin commit, push ni despliegue.
Complemento posterior de contraste y evidencia actualizada:
[correccion-contraste-tabla-menu.md](correccion-contraste-tabla-menu.md).
El commit posterior de generacion de cuotas `1ec0bf6` no forma parte de esta rama.

## Diagnostico y alcance

Revision de los componentes y CSS previos:

- Usuarios compartia un CSS de mas de mil lineas con reglas antiguas de color
  claro y posteriores overrides oscuros. El encabezado y la tabla estaban en
  secciones con aspecto de tarjetas; escritorio solo tenia nombre/acciones.
- El editor seguia limitado a 560 px, con campos apilados y max-height 90vh;
  no usaba las medidas del viewport visual para el espacio disponible.
- Historial aplicaba nowrap a todas las celdas y scroll horizontal al contenedor,
  mostraba ano de dos digitos y solo la hora de inicio del turno. La anulacion
  se distinguia con opacidad/tachado en lugar de un estado de lectura explicita.
- Reset Pass tenia un maximo de 480 px, color ambar propio y tipografia clamp
  dependiente del ancho de pantalla. El CSS tambien es usado por la confirmacion
  publica, por lo que esa vista se incluyo en la regresion.

Se incorporo posteriormente Ranking a solicitud del usuario. El trabajo se limita
a estas cuatro vistas. No agrega endpoints, permisos, filtros,
campos editables, variables, dependencias, tarifas ni cambios de base de datos.
Se conservan `.env`, lockfile y archivos locales preexistentes.

## Usuarios

Runtime: `AdminRegister.tsx`; estilos nuevos acotados a la ventana en
`AdminUsersLayout.css`, importado despues de `AdminRegister.css`. No se borran
las reglas legacy compartidas que podrian necesitar otras pantallas.

- Encabezado sin tarjeta, h1 de 24 px, contador celeste y buscador de hasta 560 px.
- Desde 1024 px: nombre completo y correo, tipo, estado y cinco acciones.
  Todos son datos del GET existente; no se agregan consultas.
- Tablet: nombre/correo y acciones; se ocultan las columnas adicionales.
- Bajo 640 px: solo nombre y acciones en una fila. El nombre tiene un maximo
  visual de dos lineas, con el nombre completo en DOM/title/nombres accesibles.
  No se aplica el limite de dos lineas a escritorio.
- Acciones de 44x44 px en tablet/escritorio. En movil estrecho, 36x44 px,
  con separacion, para mantener las cinco acciones junto al nombre a 320 px.
  Es el compromiso explicito entre espacio y acciones existentes, no un menu nuevo.
- Se conserva busqueda inmediata por nombre, estado en URL, restauracion de
  scroll y restricciones de acciones para inactivos. Sin paginacion nueva.
- Estado visible reutiliza statePlayer/updatePayment: Inactivo/Pago pendiente/
  Activo. No representa un nuevo calculo de deuda de mensualidades.

Editor: dos columnas desde 640 px y una bajo ese ancho, hasta 800 px de ancho.
Inputs a 16 px con etiquetas estaticas; correo sigue readonly. Los selects,
opciones, asociaciones y payload PATCH siguen siendo los existentes.
Controles Activo/Pago al dia no cambian de semantica.

Se reutiliza `useVisibleViewport` para la posicion/altura disponible. El contenido
del dialogo tiene scroll interno y la pagina queda bloqueada mientras esta abierto.
Foco inicial en el dialogo sin abrir teclado automaticamente; Tab cicla dentro,
Escape cierra salvo guardado en curso y Cancelar devuelve foco al disparador.
Se guarda explicitamente el boton disparador: WebKit no garantiza que un toque
lo convierta en document.activeElement. Ese caso fallo en la primera prueba y
se corrigio antes de generar la evidencia final.

## Mi Historial

Runtime/estilos: `MyHistoryReserve.tsx` y `MyHistoryReserve.css`.

- Mismo contenedor maximo de Inicio. Cabecera con nombre de la sesion y contadores
  existentes, sin tarjeta envolvente ni indicadores anidados.
- Desde 768 px: tabla Fecha/Cancha/Turno/Estado/Acciones; fecha con ano completo,
  turno completo y botones de 44 px, colores CTQ calculados en navegador.
- Bajo 768 px: cada fila distribuye fecha, cancha, turno y estado; acciones a la
  derecha. No requiere scroll horizontal ni duplica la tabla en el DOM.
- Tabla con encabezados scope=col y roles explicitos para mantener la semantica
  cuando las filas cambian a CSS Grid. Estado cancelado con texto, no solo color.
- Detalle SweetAlert2 con nombres completos, turno completo y texto plano;
  se evita interpretar nombres de participantes como HTML. Sin emojis ni colores
  inline que reemplacen el tema global.

Contrato sin cambios: GET `/court-reserve/history/:name` y DELETE
`/court-reserve/:id`, ambos con el Bearer existente. Se conserva la condicion
previa de eliminacion para reservas activas futuras o del dia antes del turno,
calculada con Luxon en America/Santiago. El backend sigue siendo la autoridad.

Cancelar la confirmacion no borra ni recarga innecesariamente el historial.
Una ref sincrona impide duplicar confirmacion/DELETE en la instancia actual;
error mantiene la lista y libera las acciones. Tras 200 se relee el historial;
no se inventa localmente el resultado de la eliminacion. Sin reintento automatico.
El 401 se deja al cierre de sesion global; otros errores usan SweetAlert2.

## Reset Pass

Runtime: `ResetPassword.tsx`, estilos `ResetPassword.css`.

- Contenedor comun, titulo de 24 px y dos columnas desde 900 px: condiciones
  existentes a la izquierda y formulario a la derecha. No se estira el input
  de correo por todo el escritorio.
- Bajo 900 px: una columna con el formulario primero; las condiciones siguen
  visibles debajo. Boton principal amarillo CTQ, foco celeste e input de 16 px.
- El envio usa el spinner CTQ y bloquea correo/boton. Guardia sincrona frente a
  doble submit; error conserva el correo. Sin reintento automatico ni envio al montar.
- Se conserva validacion/normalizacion en `requestPasswordRecovery`, la politica
  publica de una solicitud por 24 horas y los avisos/plazo del enlace existentes.
- Admin: POST `/register/admin/resetpass` con Bearer. Publico: POST
  `/register/password-recovery` sin Bearer. No cambia SMTP, token o vigencia.
- Se retiran colores ambar inline de las alertas relacionadas del administrador,
  para heredar SweetAlert2 CTQ. Un 401 admin no muestra una alerta competidora.

El CSS compartido mantiene contenidas las vistas de confirmacion publica con
enlace invalido y token fixture valido; no se modifica `ConfirmPasswordReset.tsx`
ni su manejo de token en memoria/hash. No se confirma ninguna contrasena en E2E.

## Ranking

Runtime/estilos: `Ranking.tsx` y `Ranking.css`.

- Desde 1024 px: navegacion de categorias en columna de 224 px y tabla a la
  derecha. Bajo ese ancho: categorias arriba en tres columnas de tablet o dos
  bajo 640 px, sin scroll lateral de tabla o categorias.
- Tabla con posicion, avatar de tamano fijo, nombre completo y puntos alineados
  a la derecha. Colgroup fija metadatos y deja el resto para el nombre; palabras
  sin espacios pueden partirse sin invadir puntos.
- Se mantienen GET `/match-ranking/ranking`, orden numerico/alfabetico de
  categorias, exclusion exacta de Menores, orden de jugadores recibido, formato
  es-CL de puntos, seleccion inicial y marca Masters por rank <= 8.
- Solo el boton de categoria abre/cierra el panel. Tocar una fila ya no dispara
  el toggle del contenedor padre. Botones nativos con aria-expanded/controls
  y teclado Enter, sin nuevas consultas al cambiar de categoria.
- Imagen por defecto existente para perfil faltante o roto, sin bucle de reintento.
  Alt vacio porque el nombre ya es texto y encabezado de la fila.
- Estilos acotados a Ranking. La inspeccion de capturas detecto que Materialize
  aplicaba fondo rojo, altura/line-height de barra a nav; se resetean esos valores
  y se agrega una comprobacion de color calculado y etiquetas contenidas.
- Vistas de datos vacios y error sin tarjeta blanca ni jugadores ficticios.

## Verificacion

- 295 pruebas frontend aprobadas; incluye 13 nuevas de Historial/Reset y ocho
  de Ranking (orden, filtrado, limites Masters, interaccion y avatar).
- Matriz de navegador: Chromium y WebKit a 320x760, 390x844, 768x1024,
  820x1180, 1024x768 y 1440x1000. Se prueba tambien el editor a 390x420 como
  reduccion del area visible; se espera el frame de medicion del hook.
  Resultado: 12 recorridos, 60 capturas de medidas de vistas y 638 comprobaciones
  aprobadas. Las medidas incluyen la recuperacion publica; las capturas PNG
  se toman solo en los tamanos representativos 390/820/1440.
- Recorridos: usuarios/nombre largo/correo largo, busqueda/estado vacio,
  permisos visuales de inactivos, editor y select, cierre/retorno de foco,
  historial/detalle/cancelacion/DELETE simulado/estado vacio, reset pendiente/
  exito/error/401, recuperacion publica y confirmacion invalida/valida; Ranking
  con categorias, nombres largos, puntos, imagen rota, cambio/cierre de categoria
  y comprobaciones de contencion/color calculado del menu.
- Regresion adicional de contenedores de 13 vistas a 820/1440 px en ambos motores:
  52 vistas y 226 comprobaciones aprobadas.
- Lint, tipos, build y diff check. Resultados detallados en los JSON y TAP adjuntos.

```sh
npm run test:history-recovery-layout
npm run test:ranking-layout
node --experimental-strip-types --test tests/*.test.ts tests/*.test.mjs
npm run lint
npx tsc -b
VITE_API_URL=https://api.ctq-fixture.invalid npm run build -- --outDir /private/tmp/ctq-four-views-dist-final --emptyOutDir
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ctq-playwright-browsers node tests/e2e/adminHistoryReset.mjs /private/tmp/ctq-four-views-dist-final /private/tmp/ctq-four-views-evidence-final /ruta/al/modulo/playwright/index.mjs
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ctq-playwright-browsers node tests/e2e/pageLayout.mjs /private/tmp/ctq-four-views-dist-final /private/tmp/ctq-four-views-regression-final /ruta/al/modulo/playwright/index.mjs 820,1440
git diff --check
```

Evidencia en `docs/evidence/admin-history-reset/`: `admin-history-reset.json`
con comprobaciones, medidas y hashes SHA-256, `unit.tap`, `page-layout.json` y
capturas representativas de escritorio/movil/tablet. Los logs TAP conservan
resultados, normalizando solamente espacios finales de linea.

- [Resultados de las cuatro vistas](evidence/admin-history-reset/admin-history-reset.json).
- [Pruebas unitarias](evidence/admin-history-reset/unit.tap).
- [Regresion de contenedores](evidence/admin-history-reset/page-layout.json).
- Ranking en [escritorio](evidence/admin-history-reset/ranking-chromium-1440.png),
  [movil](evidence/admin-history-reset/ranking-webkit-390.png) y
  [tablet](evidence/admin-history-reset/ranking-webkit-820.png).
- [Usuarios escritorio](evidence/admin-history-reset/users-chromium-1440.png),
  [editor movil](evidence/admin-history-reset/editor-webkit-390.png),
  [Historial escritorio](evidence/admin-history-reset/history-chromium-1440.png) y
  [Reset Pass escritorio](evidence/admin-history-reset/reset-chromium-1440.png).

## Limites

Todas las llamadas de club y operaciones de escritura son fixtures `.invalid`.
No hubo correos, cambios de usuarios, eliminaciones o contrasenas reales.
No se inicio NestJS, Mongo, cron o SMTP, ni se publicaron cambios.
No es una prueba integrada del backend. WebKit local y resize de viewport no
certifican el teclado, safe-area o zoom de un iPhone/iPad fisico; ese QA sigue
pendiente. No se deshabilita el zoom del navegador.

Sin dependencias o variables nuevas: `.env.example` no requiere cambios.
