# Estados de carga y area segura

Fecha: 2026-11-02. Estado: implementado y verificado localmente; sin push
ni despliegue de estos cambios. Pendiente aceptacion en iPhone/iPad fisicos.

## Alcance solicitado

Corregir la falta de respuesta visible al habilitar mensualidades, revisar los
botones de la app y evitar que la cabecera invada el area de estado del iPhone.
Se conserva el spinner CTQ existente, la paleta y los mensajes SweetAlert2.
No se modifican tarifas, permisos, reglas de pago, endpoints, cron ni base de datos.
No se agregan dependencias ni variables de entorno.

## Diagnostico y correccion

En habilitacion masiva el spinner estaba arriba del formulario, lejos de la
confirmacion. El boton inferior conservaba su icono mientras la peticion seguia
pendiente. Ahora revisar y confirmar muestran el spinner dentro del control,
`aria-busy` y bloqueo durante la espera; el estado de progreso superior se conserva.
Los locks e identidades de reintento existentes no se sustituyen ni se reinician.

En generacion individual se mantiene tambien el estado busy si el formulario se
pliega mientras termina la actualizacion del contexto. Revisar vigencia muestra
spinner al aprobar. Registro bancario, anulacion, recarga, busqueda, consultas,
categorias, eliminacion de reserva y confirmacion de contrasena recibieron los
indicadores que faltaban, reutilizando sus estados existentes.

En historial de reservas el estado identifica la fila que se elimina; las otras
filas quedan bloqueadas pero no muestran falsamente que todas se estan borrando.
En reserva simple se distingue cierre/liberacion del horario de envio de reserva,
sin cambiar la operacion ni sus callbacks. La cancelacion conserva su guard para
evitar liberar dos veces el horario.

La cabecera reserva `env(safe-area-inset-top, 0px)`. Su alto total suma ese inset
a 56px en movil o 64px en pantallas mayores; el wrapper conserva su altura util.
No se agrega padding global ni se cambia el ancho o la paleta de las pantallas.

## Auditoria de acciones

La revision fue sobre los componentes del frontend. Un boton sin red, por
ejemplo abrir un formulario, elegir una categoria o volver, no lleva una espera
artificial. La carga inicial o de paginacion puede usar el indicador del panel
en vez de duplicarlo en todos los controles.

| Area | Acciones que esperan | Indicador asignado |
|---|---|---|
| Login y registro | Enviar credenciales o crear cuenta | Spinner existente en submit |
| Recuperacion de clave | Solicitar correo; confirmar clave | Spinner existente y spinner agregado al guardar |
| Inicio, menu, ranking | Navegar, cambiar vista o desplegar | Respuesta local; AppLoader para carga de vistas/datos |
| Dashboard | Consultar disponibilidad por fecha | SweetAlert2 con `showLoading` existente |
| Reserva simple | Enviar/pagar; cerrar/liberar horario | Loading modal existente y spinner del control activo |
| Multi-booking | Enviar reservas | Spinner existente en fase sending; confirmacion por SweetAlert2 |
| Perfil | Subir foto | Spinner existente; tabs Singles/Dobles son locales |
| Mi historial | Consultar; eliminar reserva | AppLoader y spinner en la fila seleccionada |
| Admin reservas | Consultar; eliminar reserva | AppLoader y spinner existentes |
| Admin usuarios | Guardar socio; reset de clave | Spinner existente y SweetAlert2 loading existente |
| Categorias | Guardar; recargar | Spinner agregado a guardar; panel loading existente al recargar |
| Resultados | Actualizar; guardar | Spinner agregado a actualizar y existente al guardar |
| Historial de partidos | Consultar/reintentar/paginar | Spinner en Consultar y panel loading existente |
| Admin mensualidades | Buscar, recargar, consultar socio, registrar/anular pago | Spinner de control o panel segun el flujo |
| Habilitacion/generacion/vigencia | Previsualizar, confirmar, reintentar | Spinner del boton y busy hasta finalizar |
| Automatizacion | Consultar o cambiar configuracion | Spinner con loading/busy, switches bloqueados durante espera |
| Portal mensualidades | Recargar, consultar pago, pagar, paginar | Spinners de recarga/consulta/checkout y panel de historial |
| Retornos de pago | Verificar estado | Spinner de pagina existente y de consulta manual de mensualidad |

El administrador de imagenes residual se elimino por autorizacion separada,
no se refactorizo. Ver [retirada del carrusel](retired-carousel.md).

## Reproduccion

```bash
node --experimental-strip-types --test tests/*.test.*
node node_modules/typescript/bin/tsc -b --pretty false
node node_modules/eslint/bin/eslint.js .
VITE_API_URL=https://api.ctq-loading.example.invalid node node_modules/vite/bin/vite.js build --outDir /private/tmp/ctq-loading-build
node tests/e2e/actionLoading.mjs /private/tmp/ctq-loading-build /private/tmp/ctq-loading-evidence /ruta/playwright/index.mjs
```

La variable solo aplica al proceso de build; no editar `.env`. Para la revision
manual usar el frontend local existente en `http://localhost:5173`. Antes de
cerrar la aceptacion fisica, verificar desde iPhone/iPad los controles con teclado,
cabecera/notch y esperas de habilitacion. Commit y despliegue requieren solicitud.
