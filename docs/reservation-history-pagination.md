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

[Contrato, consultas y seguridad del backend](../../tennis-app-backend/docs/reservation-history-pagination.md).

Requiere actualizar el backend compatible primero. No modifica .env, env.example,
pagos, permisos de cancelacion ni datos reales. Sin nuevas variables.
