# Distribucion de Tarjetas de Cancha

Fecha: 2026-11-04. Validado localmente, sin push ni despliegue.

## Diagnostico y Alcance Aprobado

Las filas usaban Flex con `flex: 1 1 0` y distintos paddings para canchas vacias
y ocupadas. El ancho exterior variaba segun la combinacion de estados.
En la corrida previa, Chromium a 1157px midio 240/260/260px en una fila mixta;
otras filas desplazaban los inicios de las columnas 2 y 3.

Cambios en `src/styles/Dashboard.css`:

- Desde 769px, `.courts-container` usa Grid y tres tracks
  `repeat(3, minmax(0, 1fr))`. Los paddings internos no alteran sus anchos.
- Entre 769 y 1023px, `.time-label` ocupa 152px en lugar de 190px,
  con padding horizontal de 8px, separacion de 4px y texto de 14px.
- Hasta 768px, se conserva la distribucion previa: canchas apiladas en filas
  mixtas y tres tarjetas compactas en una fila si todas estan disponibles.
- Las alturas siguen siendo flexibles. No se cambian paleta, emojis, nombres,
  etiquetas laterales ni reglas de reserva. Se conserva el recorte de esquinas.

## Limitacion Pendiente en Tablet

La verificacion visual a 820px muestra que tres columnas con horario lateral
todavia ofrecen poco ancho para algunos apellidos de dobles. No hay desborde
geometrico, pero los saltos internos de palabras no son satisfactorios.

Se propuso colocar el horario como banda superior en tablet, manteniendo las
tres canchas debajo. Esa alternativa NO esta aprobada ni implementada y no
forma parte de este commit. No se declara cerrada la revision UX de tablet.

## Reproduccion

```bash
node --experimental-strip-types --test tests/*.test.*
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
node node_modules/eslint/bin/eslint.js .
VITE_API_URL=https://api.ctq-dashboard.example.invalid node node_modules/vite/bin/vite.js build --outDir /private/tmp/ctq-court-grid-build
node tests/e2e/dashboardStatus.mjs /private/tmp/ctq-court-grid-build /private/tmp/ctq-court-grid-evidence /ruta/playwright/index.mjs
```

La variable solo aplica al proceso de build; no editar `.env`.
