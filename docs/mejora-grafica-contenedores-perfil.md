# Mejora grafica: contenedores y Perfil

Fecha: 2026-10-29, America/Santiago. Rama: `codex/mejora-grafica`.
Estado: implementado y verificado localmente, sin commit, push ni despliegue.
Se preservaron los cambios pendientes de mensualidades y los ajustes locales ajenos.

## Alcance aprobado

Usar el contenedor de Inicio como limite de las vistas principales y adaptar
Perfil a escritorio, manteniendo la paleta CTQ y los comportamientos actuales.
No agregar filtros, graficos, datos, reglas de pagos o cambios de permisos.

### Plan ejecutado

- [x] Auditar anchos y reproducir Perfil con datos ficticios en movil/tablet/escritorio.
- [x] Centralizar limite y margenes, sin compartir el diseno interno de las pantallas.
- [x] Reorganizar Perfil en escritorio y conservar una columna en movil/tablet estrecha.
- [x] Verificar modalidades, nombre completo, foto, vacios, estilos y navegacion.
- [x] Guardar pruebas, capturas y hashes de fuentes; actualizar README.
- [ ] Aprobacion visual final del usuario y decision separada de commit/publicacion.
- [ ] Comprobacion manual en iPhone/iPad fisico, no sustituida por WebKit.

## Diagnostico

Inicio tenia maximo de 1120 px, con 1040 px entre 1024 y 1399.98 px; la zona de
contactos no seguia esa reduccion intermedia. Reservas permitia 1400 px y Usuarios
1300 px. Ranking, historial, categorias, resultados y mensualidades tenian otros
limites independientes. El resultado eran margenes y cabeceras desalineados.

Perfil mantenia una tarjeta de 760 px tanto en viewport 1440 como en 2068 px,
con categorias e historial apilados. En la revision previa, con dos categorias
singles, la seccion historial empezaba aproximadamente a y=818 px. La captura
usaba datos simulados y no demuestra el contenido de una cuenta real.

## Contenedor compartido

`src/index.css` define exclusivamente dos propiedades de layout:

| Propiedad | Base | Escritorio |
| --- | --- | --- |
| --ctq-page-max | 1120px | 1040px entre 1024 y 1399.98; 1120px desde 1400 |
| --ctq-page-gutter | 16px | 24px desde 1024 |

Son propiedades CSS, no variables de entorno. Cada ventana conserva su archivo
CSS, sus componentes y las reglas moviles que requieren margenes particulares.
En escritorio, los shells y su padding horizontal coinciden con Inicio.

Aplicado a Home (contenido/contactos), Navigation, Dashboard, AdminRegister,
AdminReserves, AdminMembershipPayments, MembershipPayments, Ranking,
MyHistoryReserve, MultipleBookingForm, MatchResult y MemberCategories, ademas
de PlayerProfile. Se ajusto tambien el padding heredado de `.admin-users-page`,
que sobreescribia el margen del contenedor de Usuarios.

No se hizo un reemplazo global de todos los max-width: modales, editores,
campos y elementos internos conservan sus limites. `AdminCategoriesPlayer.css`
es legado y no es el CSS que importa la ventana actual: se ajusto
`MemberCategories.css`, importado por el componente en uso.

## Perfil

- Contenedor exterior con el mismo limite de Inicio, sin tarjeta angosta de 760 px.
- Desde 1024 px: cabecera horizontal con avatar de 88 px; modo Singles/Dobles
  compacto; estadisticas en una franja y porcentaje de victorias al costado.
- CSS Grid de contenido: resumen a todo el ancho, categorias a la izquierda
  e historial a la derecha. Filas de historial con fecha/marcador, rival y estado.
- Se elimina el marco exterior de tarjeta en escritorio; los items repetidos
  conservan los colores actuales y usan radios de 6/8 px en la nueva distribucion.
- Bajo 1024 px: contenido en una columna. Se mantienen presentacion movil,
  nombre completo y salto de linea del correo/nombre sin truncarlos.
- Encabezados h1/h2 y controles de modalidad con tablist/tabpanel, aria-selected,
  foco unico de tabulacion y teclas izquierda/derecha/Home/End.
- Se conserva la logica de datos, conteos, puntos, historial y modo por defecto
  Dobles cuando no existen categorias singles.
- Corregidas dos rutas inexistentes del avatar inicial/de respaldo, reutilizando
  `/images/avatar-fantasma.png`, que ya existia; no se agregaron imagenes.
- La seleccion/guardado de foto mantiene el servicio y las validaciones actuales.
  Las pruebas de navegador seleccionan archivo local, pero no ejecutan el upload.

Ejemplo medido despues: a 1440 px el shell mide 1120 px y el contenido util va
de x=184 a x=1256. Categorias e historial empiezan ambos en y=409.5 px, en los
dos navegadores. Son coordenadas de la fixture concreta, no un limite fijo en CSS.

## Paleta conservada

Nota de revision posterior: la comprobacion de esta etapa valida tokens globales,
no todos los fondos locales. Reservas activas conservaba estilos claros heredados;
la omision se corrige con pruebas de celdas/hover/foco y CSS propio en
[Reservas activas](mejora-grafica-reservas-activas.md). La evidencia de esta etapa
permanece como registro de lo que efectivamente se verifico entonces.

No se modificaron los valores de colores existentes ni se introdujeron tonos.
Se mantienen fondo azul oscuro, texto claro, acento celeste y amarillo CTQ para
acciones principales. Estados de victoria/derrota conservan sus colores previos.
La prueba verifica los cuatro tokens base en cada ruta:

```text
--ctq-bg-top  #07152a
--ctq-text    #f8fafc
--ctq-accent  #7dd3fc
--ctq-yellow  #f4e85a
```

## Pruebas ejecutadas

Node 22.22.2 y Vite 7.3.7. Resultados finales:

- **262 pruebas frontend aprobadas**, 0 fallidas/omitidas. Incluye cinco pruebas
  nuevas de Perfil: endpoints solo lectura/nombre completo, modos, teclado,
  vacios/avatar y modo Dobles inicial. Servicios de foto mantienen su suite previa.
- Lint, TypeScript, build y `git diff --check`: aprobados.
- `pageLayout.mjs`: **156 casos de ruta/viewport y 704 comprobaciones**.
  Chromium y WebKit, 13 rutas/variantes, 390/820/1024/1280/1440/2068 px.
- `navigationLayout.mjs`: **22 casos y 120 comprobaciones**, incluidos los
  puntos 992/993 y 1399/1400 px, hasta 2560 px. Barra y menus siguen alineados.

El recorrido verifica ancho no mayor al Home, alineacion de shell/padding en
escritorio, ausencia de overflow horizontal de pagina y tokens de paleta.
Incluye datos en tablas/listados, Perfil vacio, solo Dobles, teclado, avatar
decodificado, seleccion de foto sin envio y regreso a Perfil desde Ranking
mediante navegacion SPA para detectar interferencia de CSS ya cargado.
Se esperan fuentes y cierre de loaders antes de medir/capturar.

```sh
node --experimental-strip-types --test tests/*.test.ts tests/*.test.mjs
npm run lint
npx tsc -b
VITE_API_URL=https://api.ctq-fixture.invalid npm run build -- --outDir /private/tmp/ctq-common-layout-delivery-dist
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ctq-playwright-browsers node tests/e2e/pageLayout.mjs /private/tmp/ctq-common-layout-delivery-dist /private/tmp/ctq-common-layout-delivery /ruta/al/modulo/playwright/index.mjs
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ctq-playwright-browsers node tests/e2e/navigationLayout.mjs /private/tmp/ctq-common-layout-delivery-dist /private/tmp/ctq-common-layout-navigation /ruta/al/modulo/playwright/index.mjs
git diff --check
```

Evidencia versionable en `docs/evidence/common-layout/`:

- [page-layout.json](evidence/common-layout/page-layout.json): resultados,
  coordenadas por ruta/viewport, versiones de navegador y hashes SHA-256 de fuentes.
- [navigation-layout.json](evidence/common-layout/navigation-layout.json): regresion de barra.
- [unit.tap](evidence/common-layout/unit.tap): salida real de las 262 pruebas.
- Capturas representativas de Perfil movil/tablet/escritorio y listados principales.

## Limites

Build real de React con respuestas de API simuladas; no Nest/Mongo ni servicios
productivos. No se crearon reservas/cuotas/pagos, no se enviaron correos ni fotos,
no se consultaron cuentas reales y no se modifico configuracion del club.
No se certifican teclado, safe areas o zoom de un dispositivo iOS fisico.

No hay nuevas dependencias ni configuracion: `.env.example` no requiere cambios.
La etapa integrada pendiente de mensualidades es otra entrega y no se declara
completada por estas pruebas graficas. Commit, push y despliegue siguen pendientes.
