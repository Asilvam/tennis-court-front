# Usuarios y Reservas: Filtros y Paginacion

Fecha: 2026-11-05. Implementado localmente; sin despliegue.

## Flujo

Usuarios conserva busqueda rapida, ampliada a nombre y correo. Agrega Estado,
Tipo de socio y Permiso de reserva. Inactivo y bloqueo de reservas son conceptos
separados; los colores y textos de restriccion usan canReserve calculado por backend.
La edicion sigue usando el endpoint PATCH existente, sin registrar pagos.

Reservas agrega Fecha (proximas/hoy/manana/rango), Cancha, Jugador y Turno.
Solo consulta reservas activas, no historial. La busqueda incluye los participantes;
la columna existente sigue mostrando player1, sin agregar columnas nuevas.
Hoy/manana se convierten a fechas de America/Santiago con Luxon.

Ambas vistas muestran 25 filas por defecto, selector 25/50/100, rango y controles
anterior/siguiente. Busqueda de texto tras 300ms; filtros y tamano vuelven a pagina 1.
Filtros/pagina viven en URL y no se limpian al guardar o resetear un socio.
Pagos/Partidos conservan su retorno existente; Categorias ahora transporta tambien
el returnTo y scroll para regresar a la misma busqueda/pagina.

`useAdminDirectory` envia JWT, aborta solicitudes obsoletas, ignora respuestas
tardias y deja un indicador CTQ visible durante la recarga. Los 401 se dejan al
limite global de sesion; otros errores se presentan con SweetAlert2.
No se agregan esperas artificiales al elegir filtros o cambiar paginas.

El selector de titulares ya no depende del array de la pagina actual. Al abrir
edicion consulta candidatos por una ruta privada independiente, muestra loading
y preserva una asociacion anterior inactiva sin ofrecerla como nueva seleccion.

## Presentacion

`AdminDirectoryControls.tsx` comparte solo toolbar y paginacion. Reutiliza el
selector existente, iconos FontAwesome y el spinner CTQ. `AdminDirectory.css`
aplica la paleta y contraste existentes. En movil, busqueda permanece visible;
un boton de filtros con contador despliega controles en una columna. Sin cards
adicionales, cambios de tablas, header/footer o dimensiones de los botones de fila.

## Contrato y Despliegue

Requiere el backend compatible con `/admin-directory/members`, `/titulares`
y `/reserves`. No modifica consumidores de `/register` o `/court-reserve`.
Backend debe desplegarse primero; no se ha desplegado ninguno ni se agregan env.

Contrato y algoritmo de permisos:
[documento backend](../../tennis-app-backend/docs/admin-directory-filters.md).

## Evidencia y Limites

- 382 pruebas frontend aprobadas, sin fallidas ni omitidas.
- 6 unitarias nuevas de backend; regresion backend 726 aprobadas, 211 integraciones
  antiguas omitidas y no certificadas por esta tarea.
- 26 controles integrados Nest/JWT/MongoDB desechable y snapshots inalterados.
- 97 comprobaciones React contra ese backend, 8 vistas Chromium/WebKit a
  320/390/820/1440px; capturas inspeccionadas en movil y escritorio.
- Cero errores de runtime, escrituras de negocio o descargas de listados legados
  completos en la prueba de navegador. Sin SMTP, cobros o cuentas reales.
- Build, TypeScript y ESLint frontend aprobados. Fuentes remotas sustituidas;
  no certifica Material Icons ni dispositivos iOS fisicos.

Resultados y hashes en `docs/evidence/admin-directory/validation.json`, con el
reporte del navegador y capturas seleccionadas. La correccion posterior de la
ruta de eliminacion fue aprobada y se documenta en backend:
[autorizacion de cancelacion](../../tennis-app-backend/docs/reservation-cancellation-security.md).
No cambia las pruebas ni el alcance visual de este documento.

```bash
node --experimental-strip-types --test tests/*.test.*
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
node node_modules/eslint/bin/eslint.js .
```

La prueba conectada se ejecuta desde el arnes backend, que compila este frontend
con una URL ficticia limitada a ese proceso. No se edita `.env`.

## Ajuste de Alineacion de Paginacion

2026-11-05, posterior a la validacion conectada anterior. Alcance aprobado:
presentacion de la paginacion compartida por Usuarios y Reservas, sin cambios
de consultas, permisos, componentes de negocio ni selectores de otras pantallas.

El selector heredaba `flex-direction: column` de `.ap-field`, colocando su etiqueta
encima y desalineando cantidad/navegacion. `AdminDirectory.css` sobrescribe ese
estilo exclusivamente bajo `.ad-pagination`:

- Escritorio y tablet sobre 700px: cantidad a la izquierda; etiqueta, selector
  de 100px y navegacion a la derecha, centrados en una sola fila.
- Hasta 700px: grid de dos filas. Cantidad y selector de 88px arriba; navegacion
  a la derecha abajo. La etiqueta sigue alineada horizontalmente al selector.
- Se mantienen controles de 44x46px, valores 25/50/100, paleta CTQ y estados
  deshabilitados. Los contadores usan cifras tabulares para reducir movimientos.

Se agregan tres pruebas de contrato del componente de paginacion y el arnes
visual `tests/e2e/adminPagination.mjs`: dos motores (Chromium/WebKit), dos vistas,
cinco anchos (320/390/700/820/1440). Comprueba centros verticales, filas, limites,
ausencia de solapes y funcionamiento de 100 filas y siguiente pagina.
Esta prueba usa una API ficticia con 148 usuarios y 48 reservas; NO sustituye
las pruebas conectadas con MongoDB ni certifica dispositivos iOS fisicos.

Regresion frontend posterior al ajuste: 385 pruebas aprobadas. TypeScript, ESLint
y build aprobados. Reporte geometrico, capturas y hashes del ajuste en
`docs/evidence/admin-pagination/`. No modifica `.env` ni datos reales.

```bash
node --test tests/adminDirectoryPagination.test.mjs
VITE_API_URL=https://api.ctq-pagination.example.invalid node node_modules/vite/bin/vite.js build --outDir /private/tmp/ctq-pagination-validation/build
node tests/e2e/adminPagination.mjs /private/tmp/ctq-pagination-validation/build /private/tmp/ctq-pagination-validation/browser /ruta/playwright/index.mjs
```
