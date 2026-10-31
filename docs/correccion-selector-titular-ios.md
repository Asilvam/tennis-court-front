# Selector de titular: teclado y viewport en administracion

Fecha de revision: 2026-10-30. Implementacion local, sin commit ni despliegue en esta tarea.

## Evidencia y diagnostico

La captura aportada muestra la lista de titulares desplazada hacia arriba mientras
Safari mantiene el teclado abierto. El campo de busqueda y el contexto del titular
quedan fuera de la zona util. No permite medir `visualViewport.scale`, por lo que
no se atribuye toda la imagen a zoom automatico.

El editor usaba `react-select` con `menuPortalTarget=document.body`, posicion fija
y colocacion automatica. Aunque el dialogo ya seguia `visualViewport`, esa lista
era un portal independiente del contenido desplazable del editor. Esta combinacion
no ofrece el mismo control del espacio visible que un selector contenido.

## Correccion aplicada

- Solo se cambia el selector **Titular asociado** en `AdminRegister.tsx`.
- Reutiliza `AdaptiveSelect`, `OptionPicker` y `useVisibleViewport`, existentes en
  reservas y Multi-booking; esos componentes compartidos no se modifican.
- En movil y tablet tactil, la busqueda reemplaza temporalmente el contenido del
  mismo dialogo de edicion: no hay dos dialogos superpuestos ni un portal de opciones
  fuera del editor.
- Titulo y buscador permanecen fijos; solo los resultados tienen scroll interno.
  El alto y posicion del dialogo responden al alto y offsets del viewport visible.
- Escritorio conserva el desplegable con busqueda. En tablet grande tactil, si
  el teclado reduce el espacio, el componente existente cambia al selector contenido
  y conserva la consulta escrita.
- Busqueda por nombre o correo, insensible a mayusculas y tildes; etiquetas completas
  y nombres largos pueden envolver sin desbordar horizontalmente.
- Entrada de busqueda de 16px, `type=search`, sin autocompletado de contactos;
  no se deshabilita el zoom accesible del navegador.
- Volver/Escape regresa al borrador sin guardar. Seleccionar modifica solo
  `titularId` del borrador; restaura el scroll del editor y enfoca el contenedor del
  selector con `preventScroll`, sin volver a abrir el teclado.
- Conserva la posibilidad de quitar la asociacion mediante un boton de icono con
  nombre accesible, tooltip y bloqueo durante guardado.
- CSS agregado exclusivamente a `AdminUsersLayout.css`, respetando variables CTQ.
  El estado de busqueda oculta las acciones del formulario, no las deja superpuestas.

## Contratos sin cambios

`titularOptions`, `validateMemberAssociation` y `buildAdminMemberUpdate` no se
modifican: se preserva la elegibilidad existente, la exclusion del propio socio,
orden por nombre, validacion de titular requerido y deteccion de cambios.

No hay persistencia al abrir, buscar, volver, seleccionar o quitar. Solo
**Actualizar** ejecuta el contrato existente:

```text
PATCH /register/admin/:email
Authorization: Bearer <sesion>
{ partnerType: "Carga", titularId: "<id>" }
```

Otros campos del borrador solo se agregan si fueron editados. Email sigue siendo
solo lectura. Se conserva SweetAlert2 y no se modifican backend, cuotas, permisos,
env, dependencias ni datos reales.

## Pruebas y evidencia

- **308 pruebas unitarias aprobadas**, incluidas siete nuevas del editor: opciones
  elegibles, query inicial, viewport, cancelacion/borrador, seleccion sin PATCH,
  guardado explicito, quitar con validacion, estado limpio al reabrir y bloqueo
  durante guardado. Algunos casos agrupan mas de una comprobacion.
- E2E especifico: **12 recorridos, 120 comprobaciones**, Chromium y WebKit en
  320, 390, 768, 820, 1024 y 1440px.
- El viewport visible se reduce artificialmente a 360px, desplazado 48px desde
  arriba. Se comprueba geometria de titulo, buscador y resultados, scroll propio,
  foco al volver, Escape, Shift+Tab, textos largos, tildes, correo, cero resultados
  y conservacion de la query en tablet grande.
- PATCH interceptado: solo tras Actualizar, con Bearer y el borrador esperado.
  Ninguna peticion se dirige a socios reales ni a servicios del club.
- Regresion movil de usuarios, historial, ranking y reset: **10 vistas y 140
  comprobaciones**, aprobadas en ambos motores.
- Lint, TypeScript y build aprobados. Advertencia esperada del build: el directorio
  temporal esta fuera del repositorio.
- [Resultados y hashes E2E](evidence/admin-titular-picker/admin-titular-picker.json),
  [regresion](evidence/admin-titular-picker/admin-history-reset.json) y
  [resumen unitario](evidence/admin-titular-picker/unit-summary.json).

Capturas de fixtures, no socios reales:

- [Movil WebKit, busqueda con viewport reducido](evidence/admin-titular-picker/search-webkit-390.png).
- [Tablet WebKit, busqueda contenida](evidence/admin-titular-picker/search-webkit-820.png).
- [Escritorio Chromium, desplegable](evidence/admin-titular-picker/desktop-chromium-1440.png).

Comandos desde el frontend, con Node 22:

```sh
npm run test:admin-titular
node --experimental-strip-types --test tests/*.test.ts tests/*.test.mjs
npm run lint
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --incremental false
VITE_API_URL=https://api.ctq-fixture.invalid npm run build -- --outDir /private/tmp/ctq-titular-picker-dist
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ctq-playwright-browsers node tests/e2e/adminTitularPicker.mjs /private/tmp/ctq-titular-picker-dist /private/tmp/ctq-titular-picker-verified /Users/alejandrosilvamonsalve/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs
```

## Limites de validacion

WebKit automatizado no es Safari en un iPhone/iPad fisico. La simulacion de
`visualViewport` no reproduce el teclado nativo, autofill, barras de Safari ni
todos los cambios de zoom/pan. Falta comprobar en el dispositivo de la captura:
abrir titular, escribir, desplazar resultados, seleccionar, volver y cerrar teclado,
en vertical/horizontal. No se afirma haber eliminado un zoom nativo no medido.
