Playwright measure script

Instrucciones rápidas

1. Instalar dependencias (en la raíz del repo):

   npm install --save-dev playwright

2. Instalar navegadores necesarios:

   npx playwright install chromium

3. Ejecutar el script:

   node scripts/measure-requests/playwright-measure.js --appUrl=http://localhost:5173 --output=measure.json

Opciones:
- --appUrl: URL donde corre la app (por defecto http://localhost:5173)
- --output: nombre del archivo JSON de salida (por defecto measure-requests.json)
- --iterations: cuántas veces repetir el flujo (por defecto 1)

Salida:
- JSON con resumen por endpoint (ruta normalizada), conteos y lista raw de requests capturadas.
