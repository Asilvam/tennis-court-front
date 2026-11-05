# Reservas activas: paleta CTQ y tabla responsive

Fecha: 2026-10-29, America/Santiago. Rama: `codex/mejora-grafica`.
Estado: implementado y validado localmente, sin commit, push ni despliegue.

## Causa y alcance

`AdminReserves.css` conservaba un encabezado azul intenso, fondo blanco de tabla,
texto oscuro y numerosas declaraciones duplicadas con `!important`. Las columnas
tenian anchos muy pequenos, nombre limitado y min-width de tabla de 360 px.
El componente mostraba solo el inicio del turno y fecha sin ano.

La prueba anterior de layout verificaba tokens globales de color, no el color
renderizado de las celdas. Por eso no detecto estos estilos locales ajenos a CTQ.
Esta entrega corrige el CSS y agrega verificaciones de estilos computados reales.

Solo se modifican en runtime `AdminReserves.tsx` y `AdminReserves.css`.
No hay cambios de consultas/backend, filtros, orden, reglas de negocio o permisos.
Se preservan el contenedor comun de Inicio, los cambios pendientes de otras vistas
y los archivos locales ajenos.

## Cambios visuales

- Cabecera sin tarjeta azul brillante: titulo claro, descripcion atenuada,
  separador y contador celeste, con la paleta existente del sitio.
- Tabla con cabecera `--ctq-surface-top`, celdas `--ctq-surface-bottom`, texto
  `--ctq-text`, titulos `--ctq-accent` y bordes `--ctq-border-soft`.
- Hover oscuro y celeste tenue, sin recuperar el fondo blanco anterior.
- Boton de papelera con el rojo suave ya usado por estados destructivos del
  sitio (`#fca5a5`), objetivo fijo 44x44 px y foco celeste visible.
- Se eliminan reglas duplicadas, colores claros anteriores, Inter forzado y
  los `!important`; el archivo propio usa selectores con prefijo ar-.
- No se modifica la paleta global ni se agregan colores de marca.

## Distribucion de datos

| Ancho | Presentacion |
| --- | --- |
| Desde 1024 px | Cinco columnas; nombre usa el espacio restante, metadatos y accion tienen anchos estables |
| 768 a 1023.98 px | Tabla con padding y columnas de metadatos mas compactos; sigue leyendo en una fila |
| Bajo 768 px | Cada reserva: nombre y papelera arriba, fecha/turno/cancha en una segunda linea con etiquetas |

Nombres completos sin ellipsis ni altura limitada; palabras largas pueden partirse
para no desplazar metadatos. Fecha con ano y elemento time; turno completo y
nombre completo de la cancha, sin recortar la hora final. No se requiere scroll
horizontal de tabla o pagina en los tamanos comprobados.

Se conserva una sola tabla DOM para todos los tamanos, con encabezados scope=col,
caption mediante aria-label y roles explicitos para conservar la semantica al
reordenar filas con CSS Grid. En movil, los encabezados permanecen disponibles
para tecnologia asistiva y las etiquetas de cada dato son visibles.

## Accion existente de eliminar

Mismo DELETE `/court-reserve/:id` y cabecera Bearer existentes. No se agrega
ninguna operacion ni reintento automatico. La confirmacion sigue siendo SweetAlert2.

- Nombre accesible de cada boton incluye jugador, fecha y turno.
- Confirmacion con foco inicial en Cancelar y sin cierre accidental al tocar fuera.
- Guardia sincrona frente a doble clic; botones deshabilitados durante el envio.
- Spinner CTQ existente durante eliminacion; no cambia el tamano del boton.
- Solo se quita la fila tras respuesta exitosa. Error conserva la fila y libera
  las acciones. Cancelar no envia DELETE.
- Se quitan colores inline antiguos de las alertas para heredar la paleta global
  CTQ; confirmacion principal amarilla, mensajes de exito/error conservados.

## Limites

Se usa el build real de React, pero toda API de reservas y eliminacion esta
simulada bajo un dominio `.invalid`. No se borraron reservas reales, ni se
consultaron cuentas del club, backend productivo o proveedores. No es una
prueba integrada de autorizacion Nest/Mongo ni una certificacion iPhone/iPad fisico.

Sin nuevas dependencias o variables de entorno; `.env.example` no requiere
cambios. No se ha publicado esta correccion y no se altero el alcance pendiente
de mensualidades.
