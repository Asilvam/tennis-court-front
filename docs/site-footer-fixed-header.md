# Pie Global y Cabecera Persistente

Fecha: 2026-11-04. Implementacion local; sin despliegue.

## Alcance Aprobado

- Pie global en todas las vistas, con nombre del club, ano actual, version e
  identificador de compilacion. Sin enlaces ni contactos adicionales.
- Cabecera visible durante el desplazamiento, tanto en escritorio como en movil.
- Paleta y ancho maximo existentes; sin nuevas variables configurables,
  dependencias, permisos, endpoints o cambios de backend.

## Identidad de Compilacion

`vite.config.ts` lee `package.json` con el parser JSON de Node y resuelve los
metadatos mediante `scripts/buildInfo.ts`:

1. Prioridad a `SOURCE_VERSION`, dato que Heroku proporciona durante la fase
   de compilacion de buildpacks clasicos. No requiere crear una Config Var.
2. En ausencia de un SHA valido, consulta `git rev-parse HEAD` en el directorio
   del proyecto con `execFileSync`, sin shell.
3. Si ambas fuentes faltan, muestra **Compilacion sin identificador**. No falla
   el build ni inventa un commit.

Solo se aceptan cadenas hexadecimales de 7 a 40 caracteres; se muestran los
primeros siete en minusculas. Vite inserta un objeto con `version` y `revision`
mediante `__CTQ_BUILD_INFO__`. No expone `process.env`, rutas locales ni secretos.
No se agregan variables `VITE_*`, `.env.example` o requisitos de configuracion.

Referencia primaria de plataforma:
[Heroku Buildpack API: compile](https://devcenter.heroku.com/articles/buildpack-api#bin-compile-summary).

El identificador representa la revision fuente, no un checksum del bundle ni un
numero de release Heroku. En desarrollo se agrega **Local** usando el indicador
nativo `import.meta.env.DEV`. El SHA local corresponde a HEAD y no incluye las
ediciones sin commit. El ano se evalua en el navegador, no se congela al compilar.
Un nuevo commit requiere reiniciar Vite o recompilar para renovar el identificador.

## Estructura y Estilos

- `src/components/Footer.tsx` se monta una sola vez en `App.tsx`, despues del
  contenido de rutas, fuera de `Suspense` y las restricciones de cada ruta.
- `.app-shell` usa flex vertical y altura minima de viewport, pero el contenido
  usa `flex: 0 0 auto`: no crece para empujar el pie al fondo. El pie sigue
  inmediatamente la altura natural de cada vista. No es un pie fijo superpuesto.
- Se retiran las alturas minimas de pantalla de `.home-page` y `.home-hero`
  que dejaban relleno bajo los contactos o dentro de la portada en tablet.
  No se alteran dimensiones de imagenes, formularios ni otras vistas.
- Ajuste posterior solicitado: Inicio conserva 24px de padding inferior entre
  sus contactos y el pie. Es una separacion acotada, no altura de viewport.
- `src/styles/Footer.css` reutiliza colores, `--ctq-page-max` y gutters del sitio.
  Permite saltos entre metadatos en pantallas estrechas e incluye el safe area
  inferior de iPhone.
- `.ctq-nav` utiliza `position: sticky`, `top: 0` y `z-index: 990`. Permanece
  visible al hacer scroll, conserva su espacio natural y el safe area superior.
  No necesita offsets duplicados ni padding manual sobre cada pantalla.
- El nivel 990 queda por debajo de sidenav/overlay de Materialize y de modales
  y SweetAlert2 existentes. No se cambian acciones ni permisos de los menus.

## Validacion

- Once pruebas unitarias nuevas: resolucion de metadatos, SHA de plataforma,
  fallback Git, ausencia de Git, datos invalidos, footer, ano, modo local y
  montaje global, ausencia de relleno por altura forzada y separacion de 24px
  en Inicio. Suite completa: 373
  aprobadas, ninguna omitida o fallida.
- TypeScript de aplicacion y configuracion Vite, ESLint y build aprobados con
  Node 22.19.0.
- Build adicional con `SOURCE_VERSION` ficticio: se comprobo que el bundle
  contiene `abcdef1` y la version del paquete, sin modificar `.env`.
- Chromium y WebKit a 320, 390, 600, 820, 1024 y 1440px: 48 vistas y 314
  comprobaciones iniciales, con Home, Login, ruta no encontrada y Dashboard
  autenticado. Tras ajustar la altura natural del pie, la corrida final conserva
  las 48 vistas y suma 386 comprobaciones.
- Se mide que la cabecera conserva su posicion al hacer scroll y su espacio
  inicial, que el footer no tapa el contenido ni desborda, y que el SHA/version
  aparecen en el build de produccion. Se comprueba ademas que el pie sigue
  inmediatamente el contenido, que Inicio reserva solo 24px tras sus contactos y que
  una pagina corta no empuja el pie al fondo de la pantalla. Se comprueban Mi historial y cierre de
  sesion desde el menu tras desplazarse, con tacto hasta 1024px y raton a 1440px.
- Cero errores JavaScript o escrituras de negocio. APIs y sesion ficticias;
  sin tocar socios, reservas, pagos, correos o configuracion real.

Los resultados geometricos y capturas estan en `docs/evidence/site-shell/`.
Las fuentes remotas estan sustituidas por contenido vacio: las capturas muestran
el texto alternativo de Material Icons; no certifican la fuente del icono.
No equivalen a aceptacion en iPhone/iPad fisicos ni a despliegue en Heroku.
No se modifico el comportamiento de autenticacion o la eleccion de su destino
publico al cerrar sesion; las pruebas solo verifican que la sesion se limpia
y que el footer permanece disponible en la pantalla publica resultante.

Actualizacion 2026-11-05: commit separado autorizado tras aceptacion visual del
usuario. Las 373 pruebas corresponden a la corrida historica del footer; la
regresion actual incluye tambien listados e historial y suma 388 aprobadas.
Se excluyen .env, lockfiles y los trabajos pendientes de mensualidades/Node24.

## Reproduccion

```bash
node --experimental-strip-types --test tests/*.test.*
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.node.json
node node_modules/eslint/bin/eslint.js .
VITE_API_URL=https://api.ctq-shell.example.invalid node node_modules/vite/bin/vite.js build --outDir /private/tmp/ctq-site-shell-build
node tests/e2e/siteShell.mjs /private/tmp/ctq-site-shell-build /private/tmp/ctq-site-shell-evidence /ruta/playwright/index.mjs
```

La URL ficticia se limita al proceso temporal de build. No editar `.env`.
La evidencia final corresponde al build temporal `ctq-site-shell-gap-build`;
las instrucciones anteriores permiten reproducirlo con cualquier directorio nuevo.
