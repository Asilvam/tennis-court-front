# Mejora grafica: barra de titulo

Fecha: 2026-10-29, America/Santiago.
Rama: `codex/mejora-grafica`, creada desde `develop` en `32bba18`.
Estado: cambio local, sin commit, push ni despliegue.

Este informe conserva la evidencia del primer ajuste. La continuacion centraliza
el ancho y los margenes de Navigation/Home junto con las demas vistas:
[contenedores y Perfil](mejora-grafica-contenedores-perfil.md). Sus pruebas nuevas
incluyen la regresion de esta barra y los hashes actuales.

## Alcance y causa

En escritorio, `.ctq-nav__wrapper` ocupaba el viewport completo y la marca
usaba posicion absoluta con margen adicional. El titulo y el menu quedaban
en extremos de pantalla, fuera del ancho del contenido de Home.

Se modifica exclusivamente `src/styles/Navigation.css` en runtime:

- Desde 993 px, centrar el wrapper y usar flex para marca/menu, sin posicion
  absoluta del titulo ni margen izquierdo adicional.
- Igualar el ancho de `.home-hero__content`: maximo 1120 px; 1040 px entre
  1024 y 1399.98 px. Mismo padding: 16 px antes de 1024 y 24 px desde 1024.
- El titulo alinea con el borde izquierdo del contenido util y el bloque menu
  con el derecho; el desplegable conserva su alineacion derecha existente.
- Fondo de barra de ancho completo, colores y altura existentes conservados.
- No cambiar reglas moviles <= 992 px ni permisos/rutas/acciones del menu.

Los cambios locales anteriores de mensualidades, `.env`, lockfile y archivos
generados permanecen intactos y sin incorporar a un commit. No se agregan
dependencias, variables, cambios backend ni configuracion de despliegue.

## Verificacion

Build Vite 7.3.7 aprobado, Node 22.22.2. Regresion frontend: 257 pruebas
aprobadas, 0 fallidas y 0 omitidas. Lint y `git diff --check` aprobados.

Prueba reproducible: `tests/e2e/navigationLayout.mjs`, ejecutada con build
real y API simulada para sesion/noticias; sin consultas al club ni escrituras.

```sh
VITE_API_URL=https://api.ctq-fixture.invalid npm run build -- --outDir /private/tmp/ctq-nav-layout-final
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ctq-playwright-browsers node tests/e2e/navigationLayout.mjs /private/tmp/ctq-nav-layout-final /private/tmp/ctq-nav-layout-delivery /ruta/al/modulo/playwright/index.mjs
node --experimental-strip-types --test tests/*.test.ts tests/*.test.mjs
npm run lint
git diff --check
```

Chromium y WebKit: 22 recorridos, 120 comprobaciones a 390, 820, 992, 993,
1024, 1280, 1399, 1400, 1440, 2068 y 2560 px. Se esperan fuentes y animaciones
antes de medir: igualdad geometrica de wrappers y margenes en escritorio,
desplegable dentro del contenedor, ausencia de overflow horizontal, titulo
sin solape visual con icono movil y funcionamiento del menu lateral.

[Evidencia JSON](evidence/navigation-layout/navigation-layout.json) incluye
hash SHA-256 del CSS, versiones de navegadores y coordenadas DOM por viewport.
Capturas representativas desktop/movil en el mismo directorio.

La emulacion WebKit no sustituye un iPhone/iPad fisico. El ajuste no se ha
comprobado en el sitio publicado porque no se ha desplegado.
