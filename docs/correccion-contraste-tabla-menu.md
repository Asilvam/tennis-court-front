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

## Limites

Sin correos, pagos, modificaciones de socios o reservas reales; los transportes
de escritura son fixtures. Sin nuevas dependencias, cambios de backend ni
variables de entorno; `.env.example` no necesita cambios. Se conserva `.env`.
WebKit automatizado no certifica teclado/zoom/safe-area de iPhone/iPad fisicos.
