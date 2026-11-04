# Recorte de franjas laterales de eventos

Fecha: 2026-11-04. Validacion local, sin push ni despliegue.
El commit asociado se identifica en el historial Git de este documento.

## Diagnostico

El script aportado `aplicar_tarjetas_eventos.py` asigno fondos opacos a
`.court-name` en Mantencion, Campeonato, Clases y Clima. La franja hija no
hereda el radio de 16px del padre: sin recorte, su fondo rectangular pinta
fuera de las esquinas redondeadas. Ademas, el reemplazo retiro el anterior
`overflow: hidden` especifico de Mantencion.

Los colores y emojis del script ya estaban modificados en el arbol local al
iniciar esta correccion. Se conservan; no se ejecuto ni modifico el script.

## Cambio Acotado

Se agrega solamente `overflow: hidden` a `.court-card:not(.available)` en
`src/styles/Dashboard.css`. El navegador recorta el contenido descendiente
conforme al radio existente de la tarjeta. No se modifica el radio, ancho de
franja, orientacion, tipografia, paleta, leyenda, altura ni contenido del aviso.
Las canchas vacias conservan sus estilos y accion de reserva.

Sin cambios de backend, reglas de reserva, contratos, dependencias o entorno.
Los demas cambios locales permanecen intactos. El usuario autorizo incluir en
el mismo commit los colores, emojis y el script original, sin modificarlo.

El script es una transformacion unica de una revision anterior, no una tarea
de inicio ni una migracion recurrente. Sus reemplazos exactos no coinciden con
el codigo ya transformado: no debe ejecutarse nuevamente en esta revision.
SHA-256 de la copia original incluida:
`9f67866b38202cadddab198b8e1ba026f9fdb5a2fd981293fff02f5773a395a7`.

## Pruebas y Evidencia

Esta seccion conserva la corrida del recorte previa al ajuste de columnas.
La validacion final del conjunto esta en [distribucion de tarjetas](dashboard-court-distribution.md).

- Prueba de regresion: falla antes del cambio por ausencia de recorte y pasa
  despues. Se incorpora a `tests/dashboardStatus.test.mjs`: 13 casos focalizados.
- Suite frontend: 360 pruebas aprobadas, ninguna fallida u omitida.
- Vite build, TypeScript de la aplicacion y ESLint aprobados con Node 22.19.0.
- `tests/e2e/dashboardStatus.mjs`: 315 comprobaciones en 16 vistas Chromium/WebKit,
  anchos 320, 390, 430, 768, 820, 1024, 1157 y 1440px. Verifica recorte y radio
  computados, texto completo, nombres, equipos, ausencia de solapes y apertura
  del formulario de una cancha disponible. APIs ficticias, sin datos reales.
- Analisis de pixeles de 32 capturas de Mantencion/Clima: 96 aserciones.
  En cada captura se muestrean `(2,2)`, `(2,alto-3)` y `(4,floor(alto/2))`.
  Las dos esquinas no contienen el color de franja y el centro si lo conserva.
  Colores esperados RGB: Mantencion `[87,65,38]`, Clima `[53,76,104]`.
  Se utilizo Sharp del runtime de herramientas, sin instalar dependencias.
- Inspeccion visual de Clases en WebKit 390px y Clima en Chromium 1157px.
- Cero errores JavaScript, escrituras de negocio o solicitudes inesperadas.

Evidencia seleccionada en `docs/evidence/dashboard-event-corners/`:
`validation.json`, `browser-validation.json`, `pixel-validation.json` y capturas.
Las pruebas usan fuentes remotas sustituidas por CSS vacio; no equivalen a
certificacion de Safari en dispositivos fisicos ni de iconos de fuentes remotas.

## Reproduccion

```bash
node --test tests/dashboardStatus.test.mjs
node --experimental-strip-types --test tests/*.test.*
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
node node_modules/eslint/bin/eslint.js .
VITE_API_URL=https://api.ctq-dashboard.example.invalid node node_modules/vite/bin/vite.js build --outDir /private/tmp/ctq-event-corners-build
node tests/e2e/dashboardStatus.mjs /private/tmp/ctq-event-corners-build /private/tmp/ctq-event-corners-evidence /ruta/playwright/index.mjs
```

La variable se limita al proceso de compilacion; no se modifica `.env`.
