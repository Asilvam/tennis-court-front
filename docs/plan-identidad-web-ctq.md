# CTQ: plan tecnico de favicon y vista previa al compartir

Fecha: 2026-10-29, America/Santiago.
Estado: etapas 1 y 2 implementadas y validadas localmente; etapa 3 pendiente.
Repositorio: tennis-court-front, rama develop.
Revision base: `934499a5dc30cb3dd28e0c2aa78a4f394478a4c9`.

## 1. Alcance

Identificar el frontend con la marca CTQ en dos superficies:

1. Pestana/favoritos del navegador, con favicon del club.
2. Vista previa al compartir el enlace publico, con imagen, titulo y descripcion
   explicitos. Agregar tambien el icono PNG para guardar el acceso en iPhone/iPad.

No se implementa PWA, instalacion, notificaciones, redireccion de dominio, SEO
dinamico por socio, SSR, cambios de diseno de las pantallas ni servicios nuevos.
No se cambian backend, Mercado Pago, correo, DNS o variables de entorno.
La ejecucion de las etapas locales fue autorizada con posterioridad al plan.
El usuario autoriza posteriormente el commit de esta mejora; consultar Git para
su revision final. Push, despliegue y comprobacion real de WhatsApp no realizados.

## 2. Evidencia del estado inicial

Inspeccion local: `index.html`, `public/`, referencias en `src/` y `public/sw.js`.
La revision HTTP anterior del sitio publicado observo el mismo titulo y los
mismos dos enlaces de favicon. No se certifica una miniatura de WhatsApp real:
no se envio un mensaje ni se inspecciono su cache.

| Elemento | Evidencia observada | Consecuencia |
| --- | --- | --- |
| Titulo | `Tennis App` en index.html | No identifica al club |
| Idioma | `<html lang="en">` | No coincide con el contenido en espanol |
| Favicon | `/icon.svg` y `/tennis_ball_fill_icon.svg`, ambos `rel="icon"` | Dos alternativas genericas, sin identidad CTQ explicita |
| Open Graph | Sin `og:title`, `og:description`, `og:image` ni `og:url` | Vista previa no controlada por la aplicacion |
| Icono iOS | Sin `apple-touch-icon` | No se define un acceso directo con identidad CTQ |
| Logo horizontal | `public/images/new_logo_ctq.png`, PNG real, 1536 x 1024 | Fuente ya utilizada en Home y revisada visualmente |
| Sello circular | `public/images/logo_circ_ctq.jpeg`, JPEG real, 567 x 568 | Fuente alternativa para iconografia pequena |
| Archivo icon.png | Firma RIFF/WebP, 1024 x 1024; no es PNG | No reutilizar como PNG ni copiar solo cambiando extension |
| Service worker | Maneja push/clic; no tiene manejador fetch ni cache de recursos | No requiere ajustes para publicar estos archivos |

Comandos de inspeccion, sin escrituras:

```bash
cat index.html
rg -n 'og:|twitter:|apple-touch-icon|manifest|favicon|rel=.icon' index.html public src
file public/images/new_logo_ctq.png public/images/logo_circ_ctq.jpeg public/icon.png
rg -n 'icon\.svg|tennis_ball_fill_icon|icon\.png|new_logo_ctq|logo_circ_ctq' src public/sw.js
shasum -a 256 index.html public/images/new_logo_ctq.png public/images/logo_circ_ctq.jpeg public/icon.png
```

SHA-256 del estado observado:

| Archivo | SHA-256 |
| --- | --- |
| index.html | `864b77baa78cda4355441d2f273094570077885675b9507fcb04370d4da8f211` |
| new_logo_ctq.png | `9338cbe3ddef0fddc6f441d73047956dccd719a8a71cfa5616b6081238577c6d` |
| logo_circ_ctq.jpeg | `50010ec380a62635556e70d2884ce5c6929ba9f08bfbc24cc37d95fa91b3d73b` |
| icon.png | `66ce678ece554cdfd43cb618a0faa73207c73b646947c597f2bb3eeb63e1a857` |

Estos hashes identifican el diagnostico, no activos nuevos ni una implementacion
ya probada. Se preservan los originales y los cambios locales ajenos a la tarea.

## 3. Diseno y contrato implementados

### Identidad visual

- Favicon: emblema central reconocible del logo CTQ (pelota y olas), sin intentar
  comprimir el texto institucional completo a 16 px. No redibujar ni inventar
  otro escudo; validar visualmente la derivacion antes de adoptarla.
- Vista previa: logo horizontal existente, completo y sin deformacion, sobre
  fondo claro y con margenes. Mantener azul, celeste y amarillo de la marca.
- Imagen propuesta: 1200 x 630 px. Es un formato de composicion elegido para
  esta entrega, no una garantia de recorte identico en todas las plataformas.
- Sin fotos de socios, informacion de cuenta, datos de reservas, montos o
  estados de pago. Un mismo recurso institucional para todo el sitio.

### Recursos nuevos

| Ruta publica | Formato / uso |
| --- | --- |
| `/ctq-favicon-v1.ico` | ICO con tamanos 16, 32 y 48 px, compatibilidad de navegador |
| `/ctq-favicon-v1-32.png` | PNG real, 32 x 32, alternativa declarada con sizes |
| `/ctq-apple-touch-v1.png` | PNG real, 180 x 180, acceso directo iOS |
| `/images/ctq-compartir-v1.png` | PNG real, 1200 x 630, imagen institucional compartida |

Nombres versionados para distinguirlos de los iconos anteriores y facilitar
diagnostico de cache. No sobrescribir ni borrar `icon.png`, los SVG anteriores
o las fuentes del logo; primero se sustituyen sus referencias en index.html.
No prometer invalidacion instantanea de caches externas por cambiar el archivo.

### Metadatos estaticos

| Campo | Valor implementado |
| --- | --- |
| html lang | `es-CL` |
| title / og:title | `Club de Tenis Quintero` |
| description / og:description | `Reservas de canchas, ranking y mensualidades del Club de Tenis Quintero.` |
| og:type | `website` |
| og:site_name | `Club de Tenis Quintero` |
| og:locale | `es_CL` |
| og:url | `https://ctq.serviciosasm.cl/` |
| og:image | `https://ctq.serviciosasm.cl/images/ctq-compartir-v1.png` |
| og:image:type | `image/png` |
| og:image:width / height | `1200` / `630` |
| og:image:alt | `Logo del Club de Tenis Quintero` |

Los metadatos deben estar en el HTML inicial de `index.html`, no depender de
React, login o una API. Open Graph define sus propiedades en el head del HTML;
se implementara conforme a su [especificacion oficial](https://ogp.me/).
El icono iOS se declarara mediante `apple-touch-icon`, conforme a la
[documentacion de Apple](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html).

Las URLs absolutas apuntan al dominio publico principal. El host Heroku sigue
funcionando; al compartirlo puede identificar el sitio principal mediante esos
metadatos, sin hacer una redireccion HTTP ni cambiar los retornos de pago.
Las rutas privadas de la SPA conservaran una vista previa institucional generica;
no se tomaran nombres, tokens ni parametros del enlace para construirla.

## 4. Etapas y criterios de salida

### Etapa 1: preparar activos

- [x] Crear los recursos derivados de los logos existentes, conservando originales.
- [x] Verificar firma binaria, dimensiones y transparencia/fondo de cada archivo.
- [x] Revisar el favicon a 16/32/48 px y la imagen horizontal a diferentes anchos.
- [x] Registrar archivos fuente, transformacion aplicada y hashes de salida.

Salida: activos listos, legibles y con identidad CTQ, sin cambios en pantallas.

### Etapa 2: integrar y probar localmente

- [x] Sustituir los dos favicons genericos por el conjunto coherente CTQ.
- [x] Integrar titulo, idioma, descripcion, Open Graph e icono de acceso iOS.
- [x] Crear `tests/siteMetadata.test.mjs` con verificaciones estructuradas del
  HTML y recursos; incorporarlo a un comando de pruebas del proyecto.
- [x] Actualizar README con rutas, valores y procedimiento para futuras renovaciones.
- [x] Ejecutar pruebas, lint, tipos y build. Registrar resultados reales, no esperados.
- [x] Probar el build en Chromium y WebKit a 390, 820 y 1440 px, conservando
  capturas locales y evidencias de respuestas de recursos.

Salida: HTML inicial correcto y activos publicos accesibles sin autenticacion.
Sin cambios de comportamiento en login, reservas o mensualidades.

### Etapa 3: publicar y validar externamente

- [ ] Solicitar commit/push/despliegue de frontend, sin tocar otros servicios.
- [ ] Verificar HTML y activos HTTPS del dominio CTQ y del host alternativo Heroku.
- [ ] Confirmar HTTP 200, Content-Type real y ausencia de fallback HTML al pedir
  una imagen. Repetir con JavaScript desactivado y cabecera de crawler.
- [ ] Comprobar pestaña/favoritos y acceso iOS; distinguir WebKit emulado de equipo fisico.
- [ ] Compartir el enlace publico en WhatsApp con intervencion del usuario y
  guardar evidencia, ocultando conversaciones/datos personales.
- [ ] Documentar si una plataforma conserva miniatura antigua por cache; no dar
  por aprobada su actualizacion hasta observarla realmente.

Salida: evidencia publicada y prueba real de compartir diferenciadas de la QA
local. Esta etapa no esta autorizada por pedir solo el plan.

## 5. Matriz de pruebas prevista

| Tipo | Verificacion | Evidencia prevista |
| --- | --- | --- |
| Unitarias/contrato | Titulo, idioma, descripcion, propiedades OG y valores unicos | Informe del runner |
| Seguridad de metadatos | Sin tokens, correo personal, IDs de pago ni contenido privado | Aserciones sobre HTML inicial |
| Recursos | ICO/PNG validos, tamanos correctos y archivos existentes | Firmas/dimensiones y SHA-256 |
| Integracion build | Rutas publicas resuelven al archivo, no index.html | HTTP, Content-Type y cuerpo |
| Navegador | Titulo y enlaces de iconos cargados; logo legible, sin errores de recursos | Chromium/WebKit y capturas |
| Regresion | Suite frontend, lint, tsc y build sin regresiones atribuibles | Logs y resumen |
| Externa | Vista previa real de enlace en WhatsApp y acceso directo iOS | Captura manual anonimizada y fecha |

Una emulacion grafica de tarjeta no demuestra que WhatsApp haya actualizado
su vista previa. Simular un User-Agent comprueba entrega del HTML, no el
comportamiento completo del rastreador ni sus caches. No se garantiza que
todas las redes representen la tarjeta con el mismo tamano o composicion.

## 6. Impacto y mantenimiento

Archivos implicados: `index.html`, nuevos recursos de `public/`, test de
metadatos, script de pruebas en `package.json`, README y este documento.
No se agregan dependencias de runtime ni variables `.env`; `.env.example`
permanece igual porque el cambio no incorpora configuracion nueva.

Al renovar la marca, generar una version nueva del conjunto, actualizar
referencias/expectativas de prueba y registrar hashes/capturas. Al cambiar de
dominio principal, actualizar y probar las URLs OG absolutas. No incorporar
hostnames dinamicos ni otra variable de entorno para esta entrega.

Si un recurso falla, conservar las fuentes y revisar respuesta HTTP, MIME,
dimensiones, rutas del build y cache antes de tocar DNS, autenticacion o APIs.
La restauracion se limita al HTML y activos de esta mejora; no requiere
rollback de pagos ni cambios de datos del club.

## 7. Estado de ejecucion

- Diagnostico y evidencia local: completados.
- Plan tecnico: documentado.
- Activos nuevos, metadatos y pruebas: implementados y validados localmente.
- Commit de esta mejora: autorizado posteriormente; revision final en Git.
- Push, despliegue y comprobacion real de WhatsApp: no realizados.

## 8. Implementacion y procedencia de recursos

Generador reproducible: `scripts/build-site-identity.mjs`. Solo genera los
cuatro archivos nuevos y su informe, sin sobrescribir fuentes ni iconos legacy.
Se uso `sharp 0.35.5` / `libvips 8.18.7` del runtime de herramientas, fuera
de las dependencias de la aplicacion. No se genero ni redibujo la identidad
mediante IA: se conservo la tipografia y el contenido raster de los originales.

El emblema se recorta de `logo_circ_ctq.jpeg` con rectangulo
`left=132, top=132, width=304, height=304` y mascara circular de centro
`152,152`, radio `148`, para excluir el aro y sus letras. Se redimensiona
con margen, sobre fondo `#f8f8f6`, y se exporta en PNG. El ICO empaqueta
los PNG 16/32/48 con su directorio de offsets; los navegadores decodificaron
los marcos y las pruebas verificaron sus dimensiones e integridad.

La imagen social usa `new_logo_ctq.png`, redimensionado a `1200x630` mediante
`fit=cover`, centrado. Se recorta espacio exterior de la imagen, no el logo
ni el texto institucional. El PNG pesa 743112 bytes; no se convierte en una
captura de una cuenta ni incluye datos dinamicos. Fuentes originales y el
`icon.png` legacy conservaron sus hashes iniciales.

Informe de activos con formatos, tamanos y SHA-256:
[assets.json](evidence/site-identity/assets.json).
Una primera extraccion mostraba fragmentos del aro exterior en sus esquinas;
se corrigio antes de la validacion final. No se usa esa version como evidencia.

`index.html` contiene el titulo, metadatos e iconos antes de cargar React.
No se agrega Helmet, SSR, API de imagenes ni configuracion por ambiente.
La alternativa ICO y la PNG corresponden a la misma familia; ya no compiten
los dos SVG genericos. El service worker y los originales se dejan intactos.

Se incorpora `parse5 8.0.1` exclusivamente a devDependencies para que las
pruebas inspeccionen un arbol HTML, no expresiones regulares sobre etiquetas.
El comando `test:site-metadata` ejecuta los diez casos nuevos. La instalacion
se hizo sin scripts ni escritura del package-lock local previo. El primer
proceso de instalacion aviso que el shell tenia Node 26; la validacion final
se realizo con Node 22.22.2 y npm 10.9.7, compatibles con package.json.
La resolucion de las versiones ya permitidas por el proyecto produjo Vite
7.3.7 en este entorno; no se cambiaron los rangos existentes para esa herramienta.

## 9. Resultados y evidencias de validacion local

| Comprobacion | Resultado real |
| --- | --- |
| Regresion completa frontend | 251 aprobadas, 0 fallos, 0 omitidas; incluye 10 nuevas |
| Lint | `npm run lint`, salida 0 |
| Tipos | `npx tsc -b --noEmit`, salida 0 |
| Build fixture | Vite 7.3.7, salida 0; API ficticia, sin llamadas al club |
| HTTP / navegadores | 55 controles aprobados |
| Cambios | `git diff --check`, salida 0 |
| Frontend local existente | `/login` en 127.0.0.1:5183 devuelve HTML actualizado, HTTP 200 |
| Publicacion / WhatsApp real | No ejecutadas; siguen pendientes |

Evidencia versionable:

- [validation.json](evidence/site-identity/validation.json): resumen, versiones,
  hashes de fuentes, informe TAP, build y capturas.
- [browser-http.json](evidence/site-identity/browser-http.json): los 55 controles
  y respuestas HTTP observadas, sin tokens ni cuentas reales.
- [Activos en movil/WebKit](evidence/site-identity/assets-webkit-390.png).
- [Activos en escritorio/Chromium](evidence/site-identity/assets-chromium-1440.png).
- [Login existente en movil/WebKit](evidence/site-identity/login-webkit-390.png).

Los primeros dos montajes son hojas de inspeccion de activos, no tarjetas
capturadas en WhatsApp. La captura de login comprueba que el cambio de head
no sustituye el diseno de la aplicacion. El navegador headless no captura su
barra de pestanas: se comprobaron las referencias, entrega binaria y capacidad
de decodificacion del icono, no una foto del favicon en la interfaz de Safari.

El arnes `tests/e2e/siteMetadata.mjs` levanta un servidor efimero con
`serve-handler`, usando la misma regla SPA de `serve -s`. Comprueba 12 respuestas
HTML (4 rutas x 3 User-Agent), 4 recursos por GET/HEAD, 36 controles en la matriz
de navegador, 2 verificaciones sin JavaScript y 1 invariante sin escrituras:
55 controles en total. Los User-Agent son simulados, no rastreadores reales.

La matriz emula los origenes CTQ y Heroku anterior, con Chromium 156.0.8078.48
y WebKit 26.5, a 390/820/1440 px. Se verifican titulo, idioma y OG, dimensiones
de los cuatro formatos, pixeles azules/amarillos no vacios, ausencia de
desbordamiento horizontal y errores JavaScript. Las rutas privadas con query
fixture no se reflejan en los metadatos. Respuestas de imagen son PNG/ICO,
con hashes esperados, no HTML de fallback.

APIs y proveedores externos bloqueados; solo se permiten fuentes publicas
de Google. Materialize se sirve desde node_modules. No se efectuan login,
pagos, reservas, correos o escrituras en la BD. Al terminar se cerraron los
navegadores y el servidor HTTP efimero. El servidor Vite existente se conserva;
no se inicia backend ni se cambian DNS o configuraciones de Heroku.

## 10. Reproduccion y pendientes

Ejecutar con Node 22 / npm 10 desde el frontend. El generador y el E2E reciben
rutas de herramientas como argumentos; no son variables nuevas de la app.

```bash
node scripts/build-site-identity.mjs /ruta/al/runtime/node_modules/sharp/dist/index.mjs
npm run test:site-metadata
node --experimental-strip-types --test tests/*.test.ts tests/*.test.mjs
npm run lint
npx tsc -b --noEmit
env VITE_API_URL=https://api.ctq-fixture.invalid npm run build -- --outDir /tmp/ctq-site-identity-dist
node tests/e2e/siteMetadata.mjs /tmp/ctq-site-identity-dist /tmp/ctq-site-identity-evidence /ruta/al/runtime/node_modules/playwright/index.mjs
```

WebKit debe estar instalado en el runtime de Playwright; la ruta de Chrome
del arnes corresponde a macOS. Si se usa una carpeta de navegadores distinta,
configurar el runtime de pruebas, no el `.env` de la aplicacion. Fuentes y
assets se verifican contra sus hashes; regenerarlos exige registrar la nueva
evidencia y volver a ejecutar las pruebas.

Informes originales en esta maquina: `/private/tmp/ctq-identity-front-tests.tap`
y `/private/tmp/ctq-site-identity-evidence/site-metadata-e2e.json`. El resumen
versionable conserva hashes, controles y tres capturas representativas.
El build se genero en `/private/tmp/ctq-site-identity-dist` y no se publico.

Queda autorizar commit/push/despliegue del frontend y completar la etapa 3:
HTTP/MIME publicados, favicon en navegador real, acceso directo en iPhone/iPad
y vista previa observada en WhatsApp. Una cache antigua no prueba que el HTML
actual este mal, pero tampoco se da su renovacion por comprobada sin observarla.
