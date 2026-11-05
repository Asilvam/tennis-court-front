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
