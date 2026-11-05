# Selector de titular: teclado y viewport en administracion

Fecha de revision: 2026-10-30. Implementacion local, sin commit ni despliegue en esta tarea.

## Diagnostico

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

## Limites de validacion

WebKit automatizado no es Safari en un iPhone/iPad fisico. La simulacion de
`visualViewport` no reproduce el teclado nativo, autofill, barras de Safari ni
todos los cambios de zoom/pan. Falta comprobar en el dispositivo de la captura:
abrir titular, escribir, desplazar resultados, seleccionar, volver y cerrar teclado,
en vertical/horizontal. No se afirma haber eliminado un zoom nativo no medido.
