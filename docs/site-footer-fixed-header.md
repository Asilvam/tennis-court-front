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
Las instrucciones anteriores permiten usar cualquier directorio temporal nuevo.
