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
