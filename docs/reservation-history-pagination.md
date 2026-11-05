# Historial de Reservas Paginado

Fecha: 2026-11-05. Cambio local, sin despliegue.

MyHistoryReserve ya no descarga el historial completo. Consume el nuevo endpoint
autenticado GET /court-reserve/my-history con page/pageSize, por defecto 1/25.
Ofrece 25/50/100, anterior/siguiente y rango del total, con el mismo control
visual de Usuarios/Reservas. No agrega filtros ni cambia las reglas de cancelar.

Los indicadores Reservas/Canceladas usan totales completos del backend, no el
array de la pagina actual. Orden y detalle se conservan. Una cancelacion mantiene
la pagina, recarga estado y actualiza el contador global de canceladas.

Pagina y tamano se guardan en URL; cambiar tamano reinicia a 1. Se normalizan los
valores invalidos antes de consultar y se acepta el ajuste de ultima pagina del
servidor. Recargas tienen spinner CTQ y controles bloqueados; las peticiones
obsoletas se abortan/ignoran. Los 401 siguen al limite global de sesion.

Se ajustaron fixtures de pruebas consumidoras al nuevo contrato, sin cambiar
la funcionalidad de esas otras pantallas. Regresion: 388 pruebas frontend,
TypeScript, ESLint y build aprobados. El arnes adminPagination cubre 191 controles
y 30 vistas Chromium/WebKit (Usuarios, Reservas e Historial), con anchos
320/390/700/820/1440. API ficticia de 61 reservas propias para la prueba visual.

Reportes, capturas y hashes: docs/evidence/reservation-history/. No certifica
dispositivos iOS fisicos ni reemplaza el arnes HTTP con MongoDB del backend.
Fuentes remotas se sustituyen durante la prueba de navegador.

[Contrato, consultas, seguridad y evidencia API del backend](../../tennis-app-backend/docs/reservation-history-pagination.md).

Requiere actualizar el backend compatible primero. No modifica .env, env.example,
pagos, permisos de cancelacion ni datos reales. Sin nuevas variables.

## Validacion del Commit

Se verifico una copia temporal del indice Git, excluyendo footer, configuracion,
lockfiles y otras mejoras locales pendientes. Esa copia tiene 377 pruebas
frontend aprobadas, TypeScript y build aprobados. Las 388 indicadas arriba
corresponden al workspace completo de la implementacion; no se incorporan los
tests ajenos para inflar el alcance del commit. Reporte del recorte verificado:
`docs/evidence/reservation-history/commit-validation.json`.
