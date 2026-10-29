# CTQ Cloudflare: validacion tecnica de la etapa 3

## Estado

Fecha: 2026-10-29, America/Santiago. Validacion ejecutada, con servicios
externos de pago y correo simulados. **El cierre funcional y el anuncio del
dominio siguen pendientes**, porque se encontro un aviso de pago de reservas
no respaldado por el backend. El usuario piloto si inicio sesion y su perfil
se verifico en produccion mediante navegacion de solo lectura.

Este informe complementa [el plan y la bitacora](mejora-ctq-cloudflare.md).
No autoriza corregir otros modulos, desplegar codigo, activar el proxy DNS,
crear nuevas APIs ni ejecutar cobros o envios SMTP reales.

## Entornos y alcance

| Capa | Verificacion |
| --- | --- |
| Dominio publicado | `https://ctq.serviciosasm.cl`, DNS-only y ACM verificados |
| Compatibilidad | Se conserva `https://app-tenis-qtro-2-be6b838be293.herokuapp.com` |
| Backend publicado | Se reusa sin cambios de codigo en esta etapa |
| Frontend de pruebas | Build del codigo local, en `/private/tmp/ctq-domain-stage3-dist` |
| API del build de pruebas | `https://api.ctq-fixture.invalid`, interceptada hacia NestJS en localhost |
| Base de pruebas | MongoDB 8, replica set `ctqDomainStage3`, puerto local 27289, almacenamiento temporal en RAM |
| Modelos | Register, cuotas, pagos, configuracion y auditoria reales, exclusivamente en bases fixture |
| Login | AuthService, bcrypt y JWT reales, cuentas `example.invalid` generadas en la base temporal |
| Pagos | MembershipMpService y transacciones reales en la base fixture; transporte al proveedor simulado |
| Correo | PasswordRecoveryService y plantilla reales, BackendEmail y guard/transporte del microservicio reales; `sendMail` simulado |

El arnes no inicia `AppModule`, no carga `.env` ni registra cron/workers del
club. Solo acepta una URI Mongo con host `127.0.0.1` y base con prefijo
`ctq_billing_test_`. Las llamadas salientes de axios se restringen al servicio
fixture `127.0.0.1:1`; las solicitudes del navegador a la API ficticia se
redirigen al servidor NestJS temporal. El checkout de Mercado Pago se sustituye
por una pagina de prueba, sin contactar al proveedor ni pedir datos de tarjeta.
Solo se permiten fuentes publicas adicionales de Google Fonts.

Las dos cuentas fixture usan tarifas $180/$50. Se crean y liquidan registros
**solo en el replica set temporal**, sin tocar a los usuarios piloto de Heroku.
Las contrasenas de prueba no son credenciales de cuentas reales. Tokens y
contrasenas no se incluyen en informes o capturas.

Los origenes CTQ y anterior se emulan al servir el bundle aislado en el navegador;
esa matriz no certifica TLS real ni usa la API publicada. DNS, TLS y CORS reales
se comprueban por separado, como en las etapas 1 y 2. La constatacion del hallazgo
de reservas si se hizo contra el bundle publicado, bloqueando sus APIs.

## Revisiones locales probadas

| Proyecto | HEAD local base |
| --- | --- |
| Frontend | `27f99cc3e33547336cb617a8917f647514fef96e` |
| Backend | `b6d8f4add1eb45d259065bb54af2bba4ff2ec6c4` |
| Mercado Pago | `df70dac5cb52e1f4fde3b3ccdfabaa0ecf0dfcba` |
| Correo | `3faf96ea183ebcbc36f610499a1456263e45d1a3` |

Estos HEAD no identifican por si solos todo el estado probado: existen cambios
locales sin commit, incluida la correccion de sesion del frontend y los casos
de prueba de URLs de la etapa 2. No se publicaron esos cambios en Heroku por
ejecutar esta validacion. No confundir el build fixture con el frontend en vivo.

## Regresion automatizada

| Proyecto | Resultado | Alcance |
| --- | --- | --- |
| Backend | 826 aprobadas, 54 suites, 0 omitidas | Suite completa con MongoDB local para integraciones |
| Frontend | 237 aprobadas, 0 omitidas | Suite completa de pruebas locales |
| Mercado Pago | 128 aprobadas, 8 suites, 0 omitidas | Suite completa, SDK/servicios simulados |
| Correo | 30 aprobadas, 7 suites, 0 omitidas | Suite completa, SMTP simulado |

Total: **1221 pruebas aprobadas**. Eso no significa ausencia de fallos de UX:
el hallazgo H1 no estaba cubierto por estas suites y fue detectado en navegador.

Comandos del backend, con el replica set temporal ya iniciado:

```bash
env \
  BILLING_TEST_MONGO_URI='mongodb://127.0.0.1:27289/ctq_billing_test_domain?replicaSet=ctqDomainStage3&directConnection=true' \
  RESULTS_TEST_MONGO_URI='mongodb://127.0.0.1:27289/ctq_results_test_domain?replicaSet=ctqDomainStage3&directConnection=true' \
  CATEGORY_TEST_MONGO_URI='mongodb://127.0.0.1:27289/ctq_category_test_domain?replicaSet=ctqDomainStage3&directConnection=true' \
  npm test -- --runInBand --silent --json --outputFile=/private/tmp/ctq-stage3-backend-tests.json
```

En frontend: `node --experimental-strip-types --test tests/*.test.ts tests/*.test.mjs`.
En pagos/correo: `npm test -- --runInBand --silent`.
No ejecutar integraciones con las URIs del club ni iniciar workers reales.

## Matriz E2E integrada

Estado de la matriz final: **96 puntos de control aprobados**, 16 por cada
combinacion de navegador/viewport. No se suman corridas diagnosticas incompletas.
Los seis recorridos terminaron sin errores de consola ni desbordamiento
horizontal en las vistas comprobadas. Lint, tipos y build local tambien aprobaron.

Evidencia filtrada y versionable:
[ctq-cloudflare-stage3.json](evidence/ctq-cloudflare-stage3.json). Incluye
resultados, HEAD base, hashes del bundle local y hallazgo publicado separado;
`releaseApproved` permanece en `false`.

Se cubren Chromium y WebKit en 390, 820 y 1440 px; WebKit no equivale a probar
un iPhone/iPad fisico. Son 16 puntos de control por combinacion:

1. Login de carga y acceso unicamente a su cuota de $50.
2. Login del titular, refresh y cuotas actuales $180/$50; sin adelantos en portal.
3. Backend rechaza administracion para socio, historial ajeno y adelanto no permitido.
4. Retorno mensual con `status=approved` falso no liquida cuotas.
5. Estado pendiente provisto por el backend se presenta como pendiente.
6. Cancelacion no produce una cuota pagada.
7. Preferencia cancelada pero aun vigente bloquea intentos solapados.
8. Aprobacion verificada simula el proveedor y liquida exactamente dos cuotas;
   callback repetido es idempotente. Un parametro `status=rejected` no revierte el pago.
9. Historial del socio refleja el registro confirmado.
10. Administrador consulta historial y detalle del socio con el ID de operacion fixture.
11. Login por el host anterior sigue operativo en la matriz aislada.
12. Solicitud de recuperacion, plantilla, transporte, enlace con fragmento y
    confirmacion funcionan; reabrir el enlace consumido es rechazado.
13. La nueva contrasena fixture autentica y la anterior deja de hacerlo.
14. Un enlace expirado es rechazado sin modificar la contrasena.
15. Invariantes financieros: solo registros fixture esperados, sin reservas ni
    llamadas a proveedores/SMTP reales; consola y desbordamiento horizontal verificados.
16. JWT vencido al volver al foco lleva al login y conserva identidad de intento.

Para probar el segundo intento tras cancelacion, se adelanta 61 minutos el
reloj financiero del servicio fixture. No se acorta el plazo de preferencias
en codigo/configuracion real ni se elimina el control de solapamiento.

El primer arnes navegaba desde la ruta posterior al login a administracion
antes de terminar su carga; WebKit cancelaba precargas de CSS. Se corrigio la
sincronizacion del arnes para esperar el render y las cargas antes de forzar
esa navegacion. No se modificaron estilos de la app ni se suprimieron errores
de consola para hacer pasar una prueba. La matriz final mantiene esas aserciones.

## H1: exito de pago de reservas sin verificar

**Estado: corregido y validado localmente por autorizacion posterior del usuario;
pendiente de despliegue y comprobacion publicada.**

Contrato, cambios, limites y evidencias de la correccion:
[correccion-retorno-reservas.md](correccion-retorno-reservas.md).
La evidencia original de este informe se conserva como constatacion historica,
no como descripcion del codigo local actualizado. No se declara cierre de etapa.

En la version publicada examinada de `src/pages/payment/PaymentSuccess.tsx`
(lineas 14-32 de aquella version), bastaba un `payment_id`
no vacio y `status=approved` para mostrar el SweetAlert **Pago confirmado** y
la afirmacion de que la reserva quedo confirmada. No hay consulta al backend
en ese componente que respalde la aprobacion.

Se reprodujo en los dos dominios publicados con un identificador ficticio,
sin sesion y con todas las APIs bloqueadas. Se observaron cero solicitudes de
API y cero escrituras de la prueba. Evidencias locales:

- `frontend-reservas-ctq/output/qa-ctq-published-findings.mjs`
- `frontend-reservas-ctq/output/ctq-stage3-published-findings.json`
- `frontend-reservas-ctq/output/ctq-stage3-published-reservation-finding.png`

Es un **exito visual falso**, no una demostracion de que un pago o una reserva
se hayan confirmado en BD. No se inyecto una operacion real ni se abrio un
checkout para reproducirlo. Es previo al dominio nuevo y no afecta de la misma
forma al retorno de mensualidades, que si consulta estado del backend.

El alcance se acordo posteriormente: consulta autenticada y exclusiva del
propietario, sin escrituras ni confianza en los parametros de resultado.
Se ejecutaron pruebas de URL falsificada, pendiente, red y acceso ajeno, entre
otros casos. Su informe y evidencias estan en el documento de correccion
enlazado arriba. No se creo un endpoint publico ni se desplego el cambio.

## Comprobacion autenticada en el sitio publicado

El usuario completo personalmente el login de `usuario test 1` en la pestaña
del nuevo dominio. Se observo la bienvenida de esa cuenta y se abrio **Mi Perfil**
desde su navegacion. `/profile` cargo el nombre del piloto y sus datos de
perfil/ranking/historial, sin errores visibles. La revision de codigo identifico
solicitudes GET para esa vista; no se editaron campos, fotos o resultados.

No se leyo/copio el JWT, no se extrajo una contrasena ni se fabrico una sesion
de produccion. No se abrio **Mis mensualidades** en vivo: su POST puede preparar
cuotas. Tampoco se inicio un checkout ni una reconciliacion real, que puede
escribir estado. Esos recorridos completos se comprobaron en el replica set
fixture, no contra los datos del club. Se omiten correo y puntajes reales del
piloto en este informe para no incorporar informacion personal innecesaria.

## Pendientes para cerrar y habilitar

- [x] Completar y registrar la matriz E2E final.
- [x] Acordar e implementar la correccion local de H1 con evidencia de pruebas.
- [ ] Desplegar y verificar la correccion de H1 antes de anunciar la direccion
  como plenamente validada para pagos.
- [x] Comprobacion autenticada de login/perfil en produccion con `usuario test 1`,
  iniciada por el usuario y observada mediante la UI, sin extraer credenciales.
- [ ] Acordar cualquier prueba real de checkout/envio. Abrir mensualidades
  puede generar cuotas; reconciliar pagos tambien escribe estado. No tratar
  esas acciones como una comprobacion de solo lectura.
- [ ] Gestionar por separado commit/push/despliegue de las correcciones locales
  pendientes, en especial sesion vencida. El cambio DNS no las publica.

No se anuncio el cierre ni se hizo una redireccion obligatoria del host
anterior. La entrega SMTP real y un cobro real necesitan intervencion/autorizacion;
las pruebas aisladas no certifican recepcion en una casilla ni el pago real.

## Artefactos y limpieza

Los arneses y capturas de esta maquina estan en
`frontend-reservas-ctq/output/`, en particular `qa-ctq-domain-stage3.cjs`,
`ctq-stage3-report.json` y `ctq-stage3-*-<engine>-<width>.png`.
El reporte de regresion filtrado se incorpora como evidencia documental al
cerrar la corrida final; no contiene tokens ni datos bancarios.

El arnes elimino su base fixture y cerro NestJS/navegadores; tras finalizar
todas las pruebas se detuvo `ctq-domain-stage3-20261029`. `--rm` retiro el
contenedor y su almacenamiento en RAM. No se borraron imagenes ni contenedores
ajenos, ni se uso un volumen con datos del club. El build temporal y los
reportes locales quedan como artefactos, sin servidores de prueba abiertos.
