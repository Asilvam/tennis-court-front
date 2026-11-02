# Editar usuario: filas alineadas y titular debajo del tipo

Fecha: 2026-10-31. Implementacion local sobre `develop`, sin despliegue.

## Solicitud y causa

En escritorio, Tipo de socio quedaba mas abajo que Correo porque los campos de
identidad ocupaban dos filas del grid y Rol/Tipo pertenecian a bloques apilados.
Sus alturas se distribuian independientemente.

## Cambio

- `AdminRegister.tsx` identifica cada campo con una clase de layout.
- `AdminUsersLayout.css` utiliza areas compartidas: Nombre/Rol, Correo/Tipo de
  socio y Celular/Titular asociado. Los textos de las etiquetas comparten altura
  de linea y espaciado; no se agrega una altura fija para compensar el desfase.
- Los contenedores existentes usan `display: contents` y no introducen paneles
  o tarjetas nuevas. Se mantienen colores, tokens CTQ y controles existentes.
- Por debajo de 640px, una sola columna mantiene el orden Nombre, Correo,
  Celular, Rol, Tipo, Titular y acciones. El modal conserva desplazamiento interno.
- Al elegir Carga aparece el campo de titular justo debajo de Tipo. No se abre
  el teclado automaticamente ni se guarda la asociacion al cambiar el selector.
- La lista ofrece titulares con `statePlayer` activo, excluyendo al socio editado.
  Esto no agrega una condicion de pago ni de deuda para ser titular.
- Si el borrador conserva un titular no disponible en esa lista, se muestra su
  nombre/correo con `no vigente`. No se elimina ni reasigna silenciosamente.
- Se conserva `AdaptiveSelect`/`OptionPicker`, busqueda y comportamiento del
  teclado de la [correccion anterior](correccion-selector-titular-ios.md).

Los helpers de asociacion y el contrato de PATCH del backend no se modifican.
Solo Actualizar envia los campos cambiados, con JWT. No se cambia la logica de
Activo, Pago al dia, mensualidades, generacion de cuotas ni bloqueo financiero.

## Validacion

- 310 pruebas unitarias aprobadas, sin fallos ni omitidas.
- Dos casos nuevos: titulares activos con asociacion inactiva preservada, y
  aparicion/desaparicion del titular al cambiar el tipo sin guardar.
- TypeScript, ESLint y build Vite aprobados.
- 12 escenarios Playwright: Chromium y WebKit en 320, 390, 768, 820, 1024 y
  1440px; 186 comprobaciones aprobadas.
- Se verifican alineacion, orden, ausencia de overflow horizontal, cambio de
  tipo, seleccion, teclado simulado, foco y un unico PATCH explicito con JWT.
- Datos de prueba y APIs interceptadas `.invalid`, sin datos ni escrituras reales.
  La reduccion de `visualViewport` es simulada, no certifica Safari fisico.

Evidencias:

- [Resumen unitario y herramientas](evidence/admin-member-layout/validation.json).
- [Casos E2E, geometria y hashes](evidence/admin-member-layout/browser-validation.json).
- [Escritorio Chromium 1440px](evidence/admin-member-layout/editor-carga-chromium-1440.png).
- [Tablet WebKit 820px](evidence/admin-member-layout/editor-carga-webkit-820.png).
- [Movil WebKit 390px](evidence/admin-member-layout/editor-carga-webkit-390.png).

El servidor de desarrollo existente respondio en
`http://127.0.0.1:5183/adminregister`. No se modificaron `.env`, credenciales,
base de datos, variables de Heroku ni archivos de otros proyectos en esta tarea.
