# Contraste pastel: Usuarios y navegacion

Fecha: 2026-10-30, America/Santiago.
Rama: `codex/mejora-vistas-admin-historial-reset`. Correccion local, sin commit,
push o despliegue. Complementa la revision de las cuatro vistas, no la sustituye.

## Causas

Las capturas recibidas muestran texto claro sobre un hover casi blanco:

- Usuarios: el hover nuevo de celdas era rgba transparente. El fondo blanco
  legacy de `.user-table tbody tr:hover` seguia debajo, por lo que la mezcla
  terminaba clara sin adaptar nombre, correo o iconos.
- Menu: Materialize resalta el li padre mediante hover, focus o clase active.
  El estilo CTQ solo cubria hover del enlace. El padre podia quedar gris claro
  y el enlace seguia blanco/amarillo; las clases white-text reforzaban el blanco.
- El primer control de contraste detecto tambien un estado transitorio real:
  el texto ya era oscuro mientras el background-color de Materialize seguia
  animando desde oscuro. Se elimina esa transicion de colores para no perder
  legibilidad durante el cambio, no solamente al terminar la animacion.

## Cambios acotados

- `src/index.css`: tres tokens CSS compartidos, sin cambiar colores base CTQ:
  `--ctq-pastel-blue: #d9eef6`, `--ctq-pastel-ink: #17324a`,
  `--ctq-pastel-muted: #40586b`. No son variables de entorno.
- `AdminUsersLayout.css`: hover y focus-within de fila/celdas con fondo celeste
  opaco y texto azul oscuro. Correo atenuado oscuro; se conservan diferencias
  semanticas de inactivo/deuda mediante rojo y amarillo oscuros sobre pastel.
- Estados e iconos habilitados adaptados al fondo claro: celeste, menta y
  amarillo pastel con tinta oscura. Sin alterar acciones, permisos o tooltips.
- `Navigation.css`: mismo pastel y tinta para li y enlace en hover, focus,
  focus-within, active y selected, tanto dropdown como sidenav. Divisor excluido;
  foco visible con contorno azul. No se cambia el ancho ni la apertura del menu.
- `Navigation.tsx`: se retira solo white-text de esos enlaces, manteniendo sus
  clases CTQ, rutas, condiciones de visibilidad y eventos existentes.
- No se anima fondo/color al alternar modos claro/oscuro; los botones de tabla
  conservan solo transicion de sombra. Sin modificaciones de negocio o API.

## Verificacion

Se amplia `tests/e2e/adminHistoryReset.mjs` sobre el build real, con Materialize
real y APIs de club simuladas bajo `.invalid`:

- Fila activa, nombre/correo largo, inactiva y pago pendiente: estado normal,
  hover y foco de boton, incluyendo nombre, correo, tipo, estado e iconos habilitados.
- Menu desktop/movil: hover y foco reales; clases active/selected simuladas
  explicitamente sobre el li para cubrir los estados del framework sin navegar
  o cambiar datos. Se espera la animacion de apertura, no la de hover eliminada.
- Se calcula contraste con luminancia sRGB y composicion alpha de los fondos
  renderizados. Umbral local >=4.5 para textos y, de manera mas exigente que
  un simple control visual, tambien para los iconos habilitados medidos.
- Los botones deshabilitados se excluyen de esta medicion: conservan su estado
  visual atenuado. No se declara una certificacion completa de accesibilidad.
- Se mantienen los recorridos anteriores de Usuarios/Historial/Reset/Ranking
  para verificar que el cambio visual no modifica permisos o solicitudes.

Matriz: Chromium y WebKit, 320x760, 390x844, 768x1024, 820x1180, 1024x768 y
1440x1000. Regresion adicional de las 13 vistas a 820/1440 px. Unitarias del
frontend: 295 aprobadas; lint, tipos y build verificados localmente.

Resultado final: 12 recorridos, 60 vistas medidas y 830 comprobaciones aprobadas.
Se midieron 912 muestras de fila/control y 48 de menu: minimo 5.4479:1 en filas
y 11.0024:1 en menu. La regresion adicional aprobo 52 vistas y 226 comprobaciones.

```sh
node --experimental-strip-types --test tests/*.test.ts tests/*.test.mjs
npm run lint
npx tsc -b
VITE_API_URL=https://api.ctq-fixture.invalid npm run build -- --outDir /private/tmp/ctq-pastel-contrast-dist --emptyOutDir
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ctq-playwright-browsers node tests/e2e/adminHistoryReset.mjs /private/tmp/ctq-pastel-contrast-dist /private/tmp/ctq-pastel-contrast-final /ruta/al/modulo/playwright/index.mjs
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ctq-playwright-browsers node tests/e2e/pageLayout.mjs /private/tmp/ctq-pastel-contrast-dist /private/tmp/ctq-pastel-contrast-regression /ruta/al/modulo/playwright/index.mjs 820,1440
git diff --check
```

Evidencia en `docs/evidence/pastel-contrast/`: `admin-history-reset.json` contiene
colores, ratios por fila/estado y menu, versiones, resultados y hashes SHA-256;
`page-layout.json` registra la regresion y `unit.tap` las pruebas unitarias.
Se conservan capturas representativas hover de filas y menu en desktop/movil/tablet.
Las evidencias de la revision anterior corresponden a su snapshot anterior;
los hashes actuales de esta correccion estan en este nuevo directorio.

- [Mediciones y resultados](evidence/pastel-contrast/admin-history-reset.json).
- [Fila resaltada, escritorio](evidence/pastel-contrast/users-hover-chromium-1440.png).
- [Menu resaltado, escritorio](evidence/pastel-contrast/menu-hover-chromium-1440.png).
- [Menu movil WebKit](evidence/pastel-contrast/menu-hover-webkit-390.png).

## Limites

Sin correos, pagos, modificaciones de socios o reservas reales; los transportes
de escritura son fixtures. Sin nuevas dependencias, cambios de backend ni
variables de entorno; `.env.example` no necesita cambios. Se conserva `.env`.
WebKit automatizado no certifica teclado/zoom/safe-area de iPhone/iPad fisicos.
