# Etiquetas laterales de cancha y motivos

Fecha: 2026-11-04. Complementa el ajuste visual del tablero `5e4e268`.
Estado: implementado y validado localmente; sin push ni despliegue.
El commit asociado se identifica en el historial Git de este documento.

## Distribucion aprobada

- En movil, tablet y escritorio, las canchas ocupadas muestran Cancha 1,
  Cancha 2 o Cancha 3 como una sola cadena girada, de abajo hacia arriba,
  dentro de una franja lateral de 34px. No se apilan palabra y numero.
- La misma franja se aplica a singles, dobles, avisos y otros estados ocupados.
  El encuentro conserva dos columnas iguales a su derecha; el versus se centra
  en ese espacio, no en el ancho que incluye la franja.
- Motivo y emoji se ubican juntos a la derecha; el detalle queda debajo.
- Todas las canchas disponibles muestran el nombre completo horizontal y
  centrado, incluso en filas parcialmente ocupadas. Se conserva la distribucion
  compacta en una fila cuando las tres estan disponibles.
- Se reemplaza el diseno local anterior de etiqueta apilada en movil y titulo
  superior en escritorio, rechazado por el usuario antes de commit.

Ejemplo de contenido: Cancha 1 lateral, Clases, emoji de tenis y debajo Jose Christian Ordenes
Vegas. No se repite Clases ni el separador como prefijo del detalle.

## Implementacion

`src/components/Dashboard.tsx` agrega dos helpers de presentacion:

- `getCourtNotice` separa solo el primer ` - ` en motivos reconocidos. Preserva
  comas y guiones internos del detalle. Un aviso administrativo desconocido queda
  literal, sin inventar motivo o emoji. Campeonato incorpora el emoji de trofeo.
- `renderCourtName` conserva el nombre completo en `.court-label`, sin
  abreviaciones ni divisiones. La orientacion depende de la disponibilidad.

El mapa agrega modificadores de presentacion `court-card--match` y
`court-card--notice`. La disponibilidad, el flag administrativo y las cadenas
originales de la API no se modifican. Una cancha disponible no necesita analizar
jugadores, por lo que su contenido vacio no se usa como un partido.

`src/styles/Dashboard.css` usa un grid de 34px y una columna flexible para las
canchas ocupadas. `.court-content` agrupa el encuentro o el motivo/detalle.
`writing-mode: vertical-rl` y `rotate(180deg)` giran la etiqueta como un conjunto.
El padding horizontal del contenido es de 8px y el espacio entre equipos de 6px.
Los nombres largos siguen creciendo en altura, sin ellipsis
ni recortes. No se cambia la paleta ni la leyenda de siete estados.

No cambia backend, datos, pagos, permisos, horarios, reglas de reserva, contratos,
dependencias, `.env` o fotos.

## Reproduccion

```bash
node --test tests/dashboardStatus.test.mjs
node --experimental-strip-types --test tests/*.test.*
node node_modules/typescript/bin/tsc -b --pretty false
node node_modules/eslint/bin/eslint.js .
VITE_API_URL=https://api.ctq-dashboard.example.invalid node node_modules/vite/bin/vite.js build --outDir /private/tmp/ctq-court-labels-build
node tests/e2e/dashboardStatus.mjs /private/tmp/ctq-court-labels-build /private/tmp/ctq-court-labels-evidence /ruta/playwright/index.mjs
```

La variable es solo del proceso temporal de build; no editar `.env`.
