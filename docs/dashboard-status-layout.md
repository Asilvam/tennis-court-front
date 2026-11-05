# Tablero: avisos, dobles y leyenda

Fecha: 2026-11-04. Estado: implementado y validado localmente; sin push
ni despliegue. La emulacion no sustituye aceptacion en dispositivos fisicos.

## Solicitud y limites

Mejorar la ubicacion y lectura de avisos largos y partidos de dobles en movil,
y ordenar los siete estados de la leyenda de escritorio. Se conservan paleta,
datos, horarios, disponibilidad, permisos, nombres recibidos y reglas de reserva.
No se modifica mensualidades, backend, APIs, base de datos, dependencias ni env.

## Diagnostico

- `.status-text` usaba 0.75rem y opacidad reducida; en movil compartia una fila
  flexible sin una columna definida para el codigo de cancha.
- Los dos jugadores de un equipo se concatenaban con `/`; el flex wrapping podia
  separar el versus o mezclar visualmente los equipos.
- La leyenda usaba `auto-fill` con un minimo de 140px por opcion. En el ancho de
  la captura cabian seis opciones, dejando Clima solo en una segunda fila.
- Durante la inspeccion de capturas se detecto que las tarjetas moviles con
  `flex: 1` podian encogerse a su minimo, dejando salir textos. Las primeras
  comprobaciones del viewport no detectaban contenido fuera de su tarjeta.

## Cambios tecnicos

`src/components/Dashboard.tsx`:

- Cada equipo de dobles contiene dos spans de jugador en un grupo separado,
  con etiquetas accesibles Team 1/Team 2. El versus es un elemento independiente.
- Se preservan los nombres exactamente como llegan: no se abrevia ni cambia
  el orden de las parejas. Si la API envia abreviaciones, siguen abreviadas.
- `renderCourtStatus` recibe `isBlockedByAdmin`, ya existente. Un aviso bloqueado
  con comas no se interpreta como dos o cuatro jugadores. No cambia el flag ni
  la elegibilidad de reserva; solo como se presenta el texto.

`src/styles/Dashboard.css`:

- Avisos y nombres a 14px, interlineado legible, saltos normales y
  `overflow-wrap: anywhere` para palabras largas, sin ellipsis o texto oculto.
- En movil, codigo de cancha en columna de 28px y contenido en la restante.
  Las tarjetas usan altura intrinseca (`flex: 0 0 auto`) y no se comprimen sobre
  las siguientes. Las tres canchas disponibles conservan su fila compacta.
- En dobles movil el codigo queda arriba y el encuentro ocupa todo el ancho
  inferior, sin descontarle la columna del codigo. Dos columnas iguales de
  equipo, con los nombres centrados dentro de cada columna, y un versus fijo
  de 32x28px en el centro de la tarjeta tanto en movil como en escritorio.
- Leyenda en siete columnas de contenido desde 1024px, cuatro/tres opciones
  entre 769 y 1023px, y dos columnas hasta 768px. Ningun color fue sustituido.

## Reproduccion

```bash
node --test tests/dashboardStatus.test.mjs
node --experimental-strip-types --test tests/*.test.*
node node_modules/typescript/bin/tsc -b --pretty false
node node_modules/eslint/bin/eslint.js .
VITE_API_URL=https://api.ctq-dashboard.example.invalid node node_modules/vite/bin/vite.js build --outDir /private/tmp/ctq-dashboard-build
node tests/e2e/dashboardStatus.mjs /private/tmp/ctq-dashboard-build /private/tmp/ctq-dashboard-evidence /ruta/playwright/index.mjs
```

La variable solo aplica al proceso temporal de build; no editar `.env`.
