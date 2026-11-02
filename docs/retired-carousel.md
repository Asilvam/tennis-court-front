# Retirada del administrador de imagenes

Fecha: 2026-11-02. Alcance aprobado: eliminar del frontend la pantalla residual
del carrusel, no cambiar su diseno ni eliminar datos o servicios del backend.

## Diagnostico

El componente `ImageUploadForm` no tenia acceso desde Navigation, pero conservaba
una ruta privada `/items` para administradores. Esa pantalla consultaba
`/info-items`, permitia subir imagenes y eliminar registros.

Home no consume esa API: alterna los recursos estaticos
`/images/new_logo_ctq.png` y `/images/logo_circ_ctq.jpeg`. Su codigo y esos recursos
no se modificaron para esta retirada.

## Cambios realizados

- Se elimina el import lazy y la ruta de `src/App.tsx`.
- Se eliminan `src/components/ImageUploadForm.tsx` y su CSS exclusivo
  `src/styles/ImageUploadForm.css`.
- Se retira la ruta del listado del README.
- Se retiran el fixture y el escenario de imagenes del recorrido de loading
  en desarrollo `tests/e2e/actionLoading.mjs`.
- La URL antigua pasa a la ruta comodin existente, que muestra NotFound. No se
  agrega un redirect, una pantalla nueva ni otro permiso.

No se modifica backend, almacenamiento de imagenes, base de datos, `.env`,
dependencias ni la carga de fotos del perfil. No se realiza push o despliegue.

## Evidencia

`tests/retiredCarousel.test.mjs` contiene tres pruebas: ausencia de import/ruta,
ausencia del componente/CSS y conservacion de ambas imagenes del inicio.

```bash
node --test tests/retiredCarousel.test.mjs
node --experimental-strip-types --test tests/*.test.*
node node_modules/typescript/bin/tsc -b --pretty false
node node_modules/eslint/bin/eslint.js .
```

La regresion local completa pasa 345 pruebas, cero fallidas u omitidas. Build
Vite, TypeScript y ESLint verificados en Node 22.19.0. Ese total incluye cambios
locales de loading pendientes, no 345 pruebas exclusivas de esta eliminacion.
[Resumen verificable](evidence/retired-carousel/validation.json).

La validacion final del trabajo de loading sigue separada: el intento de navegador
anterior quedo incompleto por un comando de emulacion de safe-area no soportado
por el navegador instalado. No se declara aprobado ese recorrido completo ni
la revision fisica en iPhone/iPad por retirar esta pantalla.
