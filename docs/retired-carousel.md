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
