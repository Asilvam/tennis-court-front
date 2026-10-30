# Mejora CTQ Cloudflare: dominio del frontend en Heroku

## 1. Control del documento

| Campo | Valor |
| --- | --- |
| Fecha de ejecucion de la etapa 1 | 2026-10-29, zona America/Santiago |
| Repositorio propietario del informe | `tennis-court-front` |
| Rama local al redactar | `develop` |
| Dominio acordado | `https://ctq.serviciosasm.cl` |
| Alcance autorizado y ejecutado | Etapas 1 y 2 completadas; pruebas tecnicas de etapa 3 ejecutadas |
| Etapa 3 | Cierre pendiente del hallazgo de reservas; login/perfil del piloto verificados |

Este documento es la bitacora tecnica y el plan de trabajo. Las comprobaciones
son observaciones de la fecha indicada, no un monitor permanente. La rama local
no implica commit, push ni despliegue; consultar Git para conocer su publicacion.

## 2. Objetivo y decisiones

Publicar el frontend React/Vite existente bajo el dominio del club, sin mover
su alojamiento ni modificar la logica de socios, reservas, ranking o pagos.

- React continua en Heroku, app `app-tenis-qtro-2`.
- Cloudflare administra la zona DNS `serviciosasm.cl`.
- Se utiliza `ctq.serviciosasm.cl`, no `www.serviciosasm.cl`.
- No se crea un Worker, Pages, Tunnel ni proxy personalizado.
- El registro queda en **Solo DNS**, con `proxied: false`.
- HTTPS lo termina Heroku con su certificado administrado por ACM.
- Se conserva la direccion anterior para compatibilidad y recuperacion.
- No se agregan variables de entorno, secretos, tablas ni migraciones de datos.

Con Solo DNS, Cloudflare resuelve el nombre pero **no esta en el camino HTTP**:

```text
Consulta DNS: navegador -> DNS publico -> CNAME administrado en Cloudflare

Solicitud web:
navegador -- HTTPS, Host: ctq.serviciosasm.cl --> router de Heroku
                                                 |
                                                 v
                                     app-tenis-qtro-2 / React
                                                 |
                      solicitudes del navegador al backend existente
```

El dominio es un alias de acceso a la misma app, no una redireccion HTTP a
`herokuapp.com`. La barra del navegador conserva `ctq.serviciosasm.cl`.
Cloudflare no aporta cache HTTP/WAF de proxy a este registro mientras siga
en Solo DNS. Activar ese proxy requiere una decision posterior y revisar TLS,
validacion/renovacion ACM y cache de contenido autenticado; no forma parte del plan aprobado.

## 3. Inventario de componentes

| Componente | App o repositorio | Tratamiento |
| --- | --- | --- |
| Frontend | Heroku `app-tenis-qtro-2`, repo `tennis-court-front` | Nuevo dominio; mismo alojamiento y codigo desplegado |
| DNS | Cloudflare, zona `serviciosasm.cl` | Solo nuevo CNAME `ctq` |
| Backend NestJS | Heroku `app-tenis-qtro-backend-2`, repo `tennis-app-backend` | Sin cambios en etapa 1; revisar CORS y URL de reset en etapa 2 |
| Mercado Pago | Heroku `mercadopago-service-ctq-2`, repo `mercadopago-microservice` | Sin cambios en etapa 1; retornos en etapa 2 |
| Correo | Heroku `email-service-ctq-2`, repo `email-send-microservice` | Mantener transporte y credenciales; validar enlaces recibidos |

Direccion original conservada:
`https://app-tenis-qtro-2-be6b838be293.herokuapp.com`.

Backend conservado:
`https://app-tenis-qtro-backend-2-dc5629e092b9.herokuapp.com`.

## 4. Resumen de etapas

| Etapa | Estado documentado | Entregable | Criterio de cierre |
| --- | --- | --- | --- |
| 1. Dominio, DNS y HTTPS | Completada | Dominio registrado, CNAME y certificado | DNS correcto, `Cert issued`, HTTPS valido y rutas equivalentes |
| 2. Compatibilidad y enlaces | Completada el 2026-10-29 | Configuracion reutilizada y documentada por proyecto | CORS validado sin cookies, nuevas URLs verificadas y servicios internos intactos |
| 3. Pruebas integradas y habilitacion | Pruebas ejecutadas, cierre pendiente | 1221 pruebas + 96 controles E2E; piloto login/perfil verificado | Resolver H1 y decidir pruebas reales/uso antes de aprobar cierre |

## 5. Etapa 1: ejecucion realizada

### 5.1 Estado previo comprobado

- La zona ya usaba `arturo.ns.cloudflare.com` y `gracie.ns.cloudflare.com`.
- `ctq.serviciosasm.cl` devolvia `NXDOMAIN` y la consulta autenticada de
  Cloudflare para ese nombre devolvia una lista vacia.
- Heroku tenia solo el dominio `herokuapp.com` de la app.
- ACM estaba deshabilitado en el frontend.
- No existia un registro `ctq` que hubiera que reemplazar.

### 5.2 Acciones aplicadas

1. Registrar el dominio personalizado en la app existente:

   ```bash
   heroku domains:add ctq.serviciosasm.cl --app app-tenis-qtro-2
   ```

2. Habilitar ACM:

   ```bash
   heroku certs:auto:enable --app app-tenis-qtro-2
   ```

3. Crear un CNAME usando el destino confirmado por `heroku domains`:

   | Propiedad | Valor aplicado |
   | --- | --- |
   | Tipo | `CNAME` |
   | Nombre completo | `ctq.serviciosasm.cl` |
   | Nombre en la zona | `ctq` |
   | Destino | `pacific-egret-i6kljf65rjgfb4ofdfrzwloo.herokudns.com` |
   | TTL | Automatico (`ttl: 1` en API; el DNS autoritativo respondio 300 segundos) |
   | Proxy | Desactivado (`proxied: false`) |
   | ID del registro creado | `bf90af07f40faa41560c34730a04e8aa` |
   | Comentario | `CTQ frontend on Heroku; DNS-only for Heroku ACM.` |

4. Solicitar una unica nueva validacion ACM despues de confirmar propagacion:

   ```bash
   heroku certs:auto:refresh --app app-tenis-qtro-2
   ```

Estos son comandos historicos, **no instrucciones para repetir el alta**.
En una futura intervencion se consulta primero el estado y se preservan los
registros existentes. No se apunta el CNAME directamente al host `herokuapp.com`.

### 5.3 Incidencia resuelta

ACM ejecuto su primera validacion antes de publicarse el CNAME y mostro
`Failing: Unable to resolve DNS for ctq.serviciosasm.cl`. La primera prueba TLS
fallo durante esa emision; no se omitio la validacion del certificado.

Tras confirmar el registro en DNS autoritativo, Cloudflare Public DNS y Google
Public DNS, se solicito el refresh. El estado avanzo a `DNS Verified` y finalmente
a `Cert issued`. No se deshabilito/re-habilito ACM para forzar el proceso, ni se
habilito el proxy de Cloudflare como solucion alternativa.

### 5.4 Evidencia de cierre

| Comprobacion | Resultado observado |
| --- | --- |
| Consulta autenticada de Cloudflare | Un CNAME exacto, destino correcto, proxy desactivado |
| DNS autoritativo | CNAME correcto en `arturo.ns.cloudflare.com` |
| DNS publico | CNAME correcto en `1.1.1.1` y `8.8.8.8` |
| Heroku | Dominio personalizado agregado; dominio original conservado |
| ACM | `Cert issued`; renovacion automatica programada |
| Certificado | Let's Encrypt, emisor `YR2`, CN y SAN `ctq.serviciosasm.cl` |
| Vigencia observada | Desde 2026-10-29 hasta 2027-01-27 |
| Verificacion TLS | `curl` y Node TLS aceptaron certificado/hostname; sin `-k` ni excepciones |
| URL original | HTTPS 200, sin retirarla ni redirigirla |

Las siguientes rutas devolvieron HTTP 200 **sobre HTTPS**:

- `/`
- `/login`
- `/monthlypayments`
- `/restablecer-contrasena`

El HTML servido coincidio con el del frontend original. SHA-256 observado:

```text
07e614a8333e934b008e9cda1bccd36563db07f4dfbd60e8b05e3bad4153b03a
```

Esto verifica enrutamiento SPA y TLS. Un 200 de `/monthlypayments` entrega el
HTML de React: **no demuestra login, permisos, cuotas ni pagos correctos**.
No se inicio sesion, registro un pago ni envio un correo durante estas pruebas.
Las comprobaciones HTTP iniciales fueron anonimas; no enviar credenciales por HTTP.

### 5.5 Archivos y limites

- `README.md`: resumen operativo, configuracion, verificaciones y este enlace.
- `.env.example` del frontend: comentarios sobre el dominio, sin nuevos valores.
- Este informe tecnico: plan, bitacora, evidencia, tareas y recuperacion.
- No hubo commit, push, build ni despliegue de codigo por la etapa 1.
- No cambiaron variables reales de Heroku ni archivos `.env` por esta etapa.
- No se modificaron `www`, otros registros DNS, SSL global de la zona, backend,
  pagos, correo, base de datos ni credenciales.

La correccion global de sesion/JWT realizada anteriormente sigue como trabajo
local separado. El cambio de dominio no la publico ni actualizo el codigo que
estaba desplegado en Heroku. No atribuir esas mejoras al nuevo certificado.

## 6. Etapa 2: compatibilidad ejecutada

Autorizada y ejecutada el 2026-10-29. Las URLs siguientes quedaron aplicadas en
Heroku y se verificaron mediante lecturas individuales, sin exportar secretos.
Los cambios son de configuracion, pruebas y documentacion; no hubo despliegue
de codigo ni escrituras financieras provocadas por las pruebas.

### 6.1 Revision previa

- [x] Leer solo las variables de URL involucradas y registrar sus valores previos
  para recuperacion, sin exportar configuraciones completas ni secretos.
- [x] Confirmar nuevamente DNS, certificado y disponibilidad del dominio original.
- [x] Separar cualquier despliegue de codigo del ajuste de URLs de servicios.
- [x] Inventariar referencias al host anterior, clasificando frontend, API,
  webhooks y enlaces historicos; no hacer un reemplazo global de cadenas.

### 6.2 Frontend

- [x] Mantener `VITE_API_URL` apuntando al backend actual de Heroku.
- [x] Verificar rutas directas, renderizado del login y origen de peticiones API.
- [x] Conservar referencias de pago y parametros de retorno; no confirmar pagos
  basandose en la URL del navegador.
- [x] Revisar el alta de socios: `PlayerForm.tsx` construye `urlEmail` con
  `${VITE_API_URL}/auth`; el enlace de verificacion apunta al backend y no debe
  cambiarse al frontend solo por contener un dominio.
- [x] Actualizar README y `.env.example` sin agregar un `VITE_FRONTEND_URL`
  redundante ni incluir secretos.

### 6.3 Backend NestJS

- [x] Comprobar CORS real con `Origin: https://ctq.serviciosasm.cl`, incluidos
  preflight, `Authorization` e `Idempotency-Key`.
- [x] Revisar la configuracion local actual en `src/main.ts`: usa
  `origin: '*'` y `credentials: true`. No dar por compatibles las solicitudes
  con credenciales: requieren un origen explicito permitido. Confirmar tambien
  la configuracion desplegada y el uso real de cookies/`withCredentials`.
- [x] Resolver si hace falta ajustar CORS: no fue necesario para el flujo
  actual JWT sin cookies. La configuracion se conserva; no se agrega variable,
  allowlist ni despliegue. Su endurecimiento para cookies/origenes restringidos
  queda como cambio independiente, no como una garantia de esta etapa.
- [x] Actualizar la variable **existente** `PASSWORD_RESET_FRONTEND_URL` a
  `https://ctq.serviciosasm.cl/restablecer-contrasena`.
- [x] Conservar la ruta y el token en fragmento `#token=...`, el plazo de 24 horas,
  el uso unico y las demas reglas existentes de recuperacion.
- [x] Actualizar README y el valor sugerido Prod en `.env.example`; mantener
  `http://localhost:5173/restablecer-contrasena` como ejemplo local.

### 6.4 Mercado Pago

Se actualizaron juntas exclusivamente estas variables existentes:

| Variable | Valor objetivo de produccion |
| --- | --- |
| `MP_SUCCESS_URL` | `https://ctq.serviciosasm.cl/payment/success` |
| `MP_FAILURE_URL` | `https://ctq.serviciosasm.cl/payment/failure` |
| `MP_PENDING_URL` | `https://ctq.serviciosasm.cl/payment/pending` |

- [x] Validar estas rutas en preferencias simuladas de luz/visitas, sin crear
  preferencias reales. El recorrido real de checkout queda para etapa 3.
- [x] Confirmar el comportamiento del codigo de mensualidades: en
  `src/mercadopago/mercadopago.service.ts` se deriva
  `/monthlypayments/return` del origen de `MP_SUCCESS_URL` y se conserva
  `reference`. No crear una variable exclusiva para este dominio.
- [x] Mantener preferencias ya emitidas: pueden conservar retornos al host
  anterior. No alterarlas ni regenerarlas masivamente por esta mejora.
- [x] No cambiar `BACKEND_URL`, `NOTIFICATION_URL`, tokens de Mercado Pago,
  claves internas, firma de webhooks, importes ni estados de pagos.
- [x] Actualizar README y los comentarios Prod de `.env.example`, conservando
  los ejemplos locales. Corregir cualquier comentario antiguo que omita
  `/return`, segun el comportamiento del codigo, no al reves.

### 6.5 Correo

- [x] Verificar con mocks que el backend entrega el nuevo enlace con fragmento
  intacto y que el mailer recibe HTML/texto sin modificarlo. La entrega a un
  destinatario real queda para etapa 3; no se envio un correo real aqui.
- [x] Conservar configuracion SMTP, remitente y credenciales.
- [x] Revisar plantillas: las de backend reciben el enlace como parametro; el
  transporte de correo no construye un dominio nuevo.
- [x] Actualizar README del servicio y comentarios de `.env.example`.
  Modificar `.env.example` solo si realmente corresponde; no crear una URL
  de frontend en correo cuando el backend ya construye el enlace.

### 6.6 Cierre de etapa 2

Valores contrastados, README/ejemplos actualizados en los cuatro repositorios y
pruebas unitarias relevantes aprobadas. Las config vars se aplicaron en Heroku,
reiniciando los dynos con su codigo ya desplegado. No fue solo una edicion de
ejemplos locales ni se publico trabajo local pendiente.

### 6.7 Bitacora de configuracion aplicada

| App | Variable | Valor previo | Valor aplicado | Release de configuracion |
| --- | --- | --- | --- | --- |
| `app-tenis-qtro-backend-2` | `PASSWORD_RESET_FRONTEND_URL` | `https://app-tenis-qtro-2-be6b838be293.herokuapp.com/restablecer-contrasena` | `https://ctq.serviciosasm.cl/restablecer-contrasena` | `v66` |
| `mercadopago-service-ctq-2` | `MP_SUCCESS_URL` | `https://app-tenis-qtro-2-be6b838be293.herokuapp.com/payment/success` | `https://ctq.serviciosasm.cl/payment/success` | `v37` |
| `mercadopago-service-ctq-2` | `MP_FAILURE_URL` | `https://app-tenis-qtro-2-be6b838be293.herokuapp.com/payment/failure` | `https://ctq.serviciosasm.cl/payment/failure` | `v37` |
| `mercadopago-service-ctq-2` | `MP_PENDING_URL` | `https://app-tenis-qtro-2-be6b838be293.herokuapp.com/payment/pending` | `https://ctq.serviciosasm.cl/payment/pending` | `v37` |

Se leyeron nuevamente las cuatro variables para comprobar los valores. Tambien
se verificaron sin cambios las URLs publicas `VITE_API_URL`, `BACKEND_URL` y
`NOTIFICATION_URL`. No se leyeron ni rotaron tokens de pago/SMTP para esta tarea.
No hubo nueva release de codigo ni cambios de configuracion en frontend/correo.

Salud despues del cambio: HTTP 200 en backend `/healthz`, servicio de pagos `/`
y correo `/email/health`. Las cinco rutas de destino configuradas devolvieron
HTTP 200 con TLS normal y el mismo hash de HTML de la etapa 1. Esto comprueba
disponibilidad/routing, no confirmacion de un pago o entrega de un correo.

### 6.8 Pruebas realizadas y limites

| Proyecto | Comando | Resultado |
| --- | --- | --- |
| Frontend | `node --experimental-strip-types --test tests/*.test.ts tests/*.test.mjs` | 237 aprobadas |
| Backend | `npm test -- --runInBand password-recovery transactional-email membership-access.guard auth.service jwt.strategy --silent` | 103 aprobadas, 6 suites; seleccion enfocada, no toda la suite |
| Mercado Pago | `npm test -- --runInBand --silent` | 128 aprobadas, 8 suites |
| Correo | `npm test -- --runInBand --silent` | 30 aprobadas, 7 suites |

Casos nuevos: reset publico/administrativo con URL CTQ, fragmento y TTL
conservados; enlace preservado en plantilla y transporte SMTP simulado;
preferencias simuladas de reserva/mensualidad con dominio nuevo, importe,
metadata, referencia y webhook intactos; compatibilidad del host anterior.

Prueba de navegador de solo lectura:
`frontend-reservas-ctq/output/qa-ctq-domain-stage2.mjs`, ejecutada con Playwright
del runtime local, no como dependencia nueva de la aplicacion. Primero completo
Chrome; se instalo WebKit en la cache temporal y se repitio el conjunto entero.
Resultado final: **8 casos aprobados**, Chromium/WebKit por dos dominios por
viewports 390/1440 px. Capturas en el mismo directorio `output/` con prefijo
`ctq-stage2-`. La cache temporal puede necesitar reinstalacion en otra sesion.

El login real renderizo en cada caso. Desde cada pagina se hizo un GET a
`/membership-billing/me/access` con `credentials: 'omit'`, un JWT fixture
intencionalmente invalido e `Idempotency-Key`. El navegador pudo leer el 401
esperado, sin errores CORS, cookies, sesiones reales ni datos privados. Las
solicitudes distintas de GET/HEAD/OPTIONS se bloquearon en esta prueba y no
se observaron intentos de escritura. El 401 esperado es evidencia de transporte,
no de autenticacion exitosa. No se abrio una preferencia ni se envio reset real.

Se conserva la advertencia CORS: el backend responde `Access-Control-Allow-Origin:
*` y `Access-Control-Allow-Credentials: true`. Esto funciona para el flujo sin
cookies comprobado, pero no permite afirmar soporte de `credentials: 'include'`
ni una politica de origenes restringidos. No se endurecio esa politica aqui.

El cierre de etapa 2 no certifica las pruebas autenticadas, entrega de correo ni
checkout real de la etapa 3. Las pruebas de frontend locales tampoco demuestran
que la correccion JWT pendiente este publicada en el frontend de Heroku.

## 7. Etapa 3: pruebas integradas, cierre pendiente

Autorizada y validada tecnicamente el 2026-10-29. Bitacora y resultados detallados en
[Validacion tecnica de etapa 3](ctq-cloudflare-stage3-validacion.md). Se encontro
un aviso falso de aprobacion en el retorno de reservas del frontend publicado;
no fue causado por Cloudflare y no se corrigio sin acordar alcance adicional.
No confundir la ejecucion de pruebas con aprobar el cierre de la etapa.
La matriz final aprobo 96 controles aislados en Chromium/WebKit (390/820/1440 px),
y la regresion suma 1221 pruebas aprobadas. El piloto inicio sesion por si mismo
y su perfil se reviso en la UI publicada, sin abrir operaciones financieras.

### 7.1 Matriz de pruebas

| Nivel | Casos a cubrir | Criterio |
| --- | --- | --- |
| Infraestructura | CNAME, proxy, ACM y SAN | Destino exacto, Solo DNS, TLS verificado |
| Unitarias | Construccion/validacion de URLs | Dominio nuevo y rutas correctas; rechazo de destinos no permitidos |
| Unitarias | CORS, si se modifica | Preflight y origenes autorizados/no autorizados |
| Regresion | JWT, sesion y permisos | Sin nuevos cierres por red, bypass de permisos ni confirmaciones de pago en cliente |
| E2E | Login y navegacion | Carga directa/refresh de rutas y sesion valida en el nuevo origen |
| E2E | Mensualidades y administracion | Cuotas/historial accesibles segun rol, sin escrituras financieras inesperadas |
| E2E | Retornos de pago | Exito, pendiente y cancelacion; referencia intacta y consulta al backend |
| E2E | Recuperacion | Enlace correcto, fragmento conservado, validez y consumo unico en entorno aislado |
| Compatibilidad | Enlaces anteriores | Host antiguo operativo, sin redireccion forzada ni referencias perdidas |

- [x] Ejecutar unitarias relevantes y registrar comandos, cantidades, resultado
  y revision de codigo probada. Las pruebas previas de sesion no sustituyen
  estas verificaciones del dominio nuevo.
- [x] Ejecutar E2E en Chromium y WebKit, con viewport movil, tablet y escritorio;
  revisar recargas, solapes, consola, CORS y recursos con HTTPS.
- [x] Probar primero con APIs/servicios aislados y usuarios fixture.
- [x] No ejecutar pruebas de produccion que escriban sin autorizacion
  explicita y usar solo `usuario test 1` / `usuario test 2`. Si se autoriza un
  cobro real, conservar tarifas de prueba $180 titular y $50 carga; nunca cobrar
  automaticamente como consecuencia de abrir una ruta o comprobar TLS.
- [x] No cambiar contrasenas reales, enviar correos masivos ni afectar otros socios
  para certificar la migracion del dominio.
- [x] Documentar evidencias sin tokens, contrasenas, claves API o datos bancarios.
- [ ] Aprobar el dominio como direccion anunciada del club solo al cerrar los
  criterios anteriores. No activar redireccion obligatoria del host anterior
  ni el proxy de Cloudflare como tarea implicita.

## 8. Operacion y diagnostico

Comandos de solo lectura para futuras comprobaciones:

```bash
heroku domains --app app-tenis-qtro-2
heroku certs:auto --app app-tenis-qtro-2
cf dns records list --zone serviciosasm.cl --name ctq.serviciosasm.cl
dig @arturo.ns.cloudflare.com ctq.serviciosasm.cl CNAME +short
dig @1.1.1.1 ctq.serviciosasm.cl CNAME +short
dig @8.8.8.8 ctq.serviciosasm.cl CNAME +short
curl -I https://ctq.serviciosasm.cl/login
```

| Sintoma | Revision inicial | Evitar |
| --- | --- | --- |
| NXDOMAIN o destino inesperado | Registro exacto, delegacion y cache DNS | Sobrescribir otros registros o usar IP fija de Heroku |
| TLS invalido | ACM, CN/SAN, vigencia y CNAME | `curl -k`, login por HTTP o deshabilitar ACM repetidamente |
| HTML 200, API falla | CORS, JWT y URL real de backend | Confundir SPA fallback con exito funcional |
| Vuelve al host anterior al pagar | Retorno de la preferencia y config vigente al crearla | Repetir un cobro o editar un pago confirmado |
| No aparece sesion/intento anterior | Cambio de origen y estado confirmado en backend | Copiar tokens entre dominios o asumir que no hubo pago |

ACM gestiona la renovacion; revisar el estado si llega una alerta o cambia DNS.
Mantener proxy desactivado hasta una evaluacion independiente. No aplicar
reglas de cache global ni desactivar seguridad como remedio para una falla de
la app. El uso exclusivo de HTTPS y cualquier redireccion HTTP->HTTPS deben
validarse en su alcance propio; no se configuro una redireccion nueva en etapa 1.

## 9. Recuperacion y reversibilidad

1. Conservar operativa la URL original y comunicarla si el dominio nuevo falla.
2. Diagnosticar DNS/TLS antes de modificar configuracion de pagos o usuarios.
3. Si despues de la etapa 2 se revierte el dominio de retornos, restaurar solo
   las variables de URL previamente registradas; las preferencias historicas
   pueden seguir utilizando el destino con que fueron creadas.
4. No borrar el dominio nuevo mientras haya enlaces publicados que dependan
   de el sin acordar primero como se atenderan esos enlaces.
5. Un retiro de infraestructura requiere autorizacion: eliminar unicamente el
   CNAME `ctq` verificado por nombre/ID y el dominio personalizado de la app.
   No eliminar `www`, la zona completa, certificados ajenos ni servicios.

## 10. Correccion posterior autorizada: retorno de reservas

2026-10-29: el usuario aprobo corregir, planificar y documentar H1. Se implemento
consulta privada por propietario y retorno compartido sin confiar en parametros
del proveedor. Validacion local: 1215 pruebas de regresion y 96 controles HTTP/
navegador aprobados; no incluye cobros ni entrega de correo real. Contrato,
plan ejecutado, archivos, limites y hashes/capturas en
[correccion-retorno-reservas.md](correccion-retorno-reservas.md).
No hay variables nuevas. El usuario autoriza posteriormente el commit de los
cambios; no autoriza push ni despliegue. Consultar Git para las revisiones finales.
El cierre publicado sigue pendiente; el cambio DNS no publica el codigo local.

## 11. Referencias

- [Dominios personalizados en Heroku](https://devcenter.heroku.com/articles/custom-domains)
- [Certificados automaticos y diagnostico ACM](https://devcenter.heroku.com/articles/automated-certificate-management)
- [CLI oficial de Cloudflare](https://developers.cloudflare.com/cf/get-started/)
- [Proxy DNS de Cloudflare](https://developers.cloudflare.com/dns/proxy-status/)
- [TLS Full (strict), solo para una futura evaluacion del proxy](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)
