# Correccion del menu tactil

Fecha local: 2026-11-01. Base frontend: `213ca57`. Estado: correccion local
validada automaticamente, sin push ni despliegue. Aceptacion en iPad fisico pendiente.

## Alcance autorizado

Ocultar el desplegable vacio antes del login y corregir los desvios reportados
al tocar Mi historial y Logout en iPad. Se conservan paleta, etiquetas, rutas,
SweetAlert2 y permisos por rol. No se cambian mensualidades ni datos del club.
No hay dependencias ni variables de entorno nuevas.

## Diagnostico reproducido

Materialize 1.0.0 registra `touchend` en el documento. En
`node_modules/materialize-css/js/dropdown.js`, `_handleDocumentClick` programa
`close()` con temporizador cero cuando `closeOnClick` es verdadero. La animacion
reduce el panel antes de que llegue un clic de compatibilidad tardio.

El toque nativo automatizado no reprodujo el error original. Una secuencia
controlada de `touchend`, espera de 40/80/180 ms y clic en las mismas coordenadas
si lo reprodujo: Mi historial alcanzo Admin reservas a 40 ms; Logout alcanzo la
tarjeta WhatsApp en las tres esperas. Los intentos de WhatsApp se interceptaron
sin enviar mensajes. Esto demuestra el mecanismo, no una captura de eventos del
iPad real ni el destino exacto de todos los casos reportados por el usuario.

## Cambios tecnicos

- `Navigation.tsx`: `closeOnClick: false`; cada enlace cierra explicitamente el
  dropdown desde su manejador de clic, conservando estable el destino hasta ese
  momento. Se conserva el cierre nativo por clic fuera del panel.
- Logout llama `preventDefault()` antes de limpiar la sesion y navegar al inicio,
  evitando que el enlace `#!` produzca otra navegacion.
- Se conserva la instancia en un ref y se cierra al perder autenticacion. El
  desmontaje destruye dropdown/sidenav y elimina el listener existente.
- El disparador y panel se ocultan sin autenticacion mediante `hidden` y CSS
  acotado. Siguen montados porque Materialize reubica el panel en el DOM; asi la
  instancia sigue disponible despues de iniciar sesion sin recargar la app.

## Repetir las pruebas

Desde el frontend original, con Node 22 y Playwright instalado externamente:

```bash
node --experimental-strip-types --test tests/*.test.*
node node_modules/typescript/bin/tsc -b --pretty false
node node_modules/eslint/bin/eslint.js .
VITE_API_URL=https://api.ctq-navigation.example.invalid node node_modules/vite/bin/vite.js build --outDir /private/tmp/ctq-menu-build
node tests/e2e/navigationInteraction.mjs /private/tmp/ctq-menu-build /private/tmp/ctq-menu-results /ruta/playwright/index.mjs
```

La variable se limita al proceso de compilacion; no editar `.env`.

## Entorno fisico y pendientes

El frontend temporal autorizado se actualiza en la misma URL
`http://192.168.1.106:57675/login`, sin reiniciar Mongo ni cambiar cuotas.
Mercado Pago permanece deshabilitado. El usuario debe refrescar esa URL local
y repetir Mi historial/Logout en iPad; el dominio productivo no contiene aun
esta correccion.

La revision fisica de mensualidades sigue abierta. Login fue confirmado por el
usuario. El HTTP por IP privada no dispone de `crypto.randomUUID` en los motores
probados, necesario para confirmar operaciones idempotentes. Queda pendiente
elegir un modo de prueba seguro para esas confirmaciones; no se agrega polyfill,
HTTPS local ni datos adicionales sin acuerdo. No es evidencia de ese problema
en el sitio productivo HTTPS.
