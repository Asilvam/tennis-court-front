# Análisis: llamadas al backend (tennis-court-front)

Fecha: 2026-05-31

Repositorio: tennis-court-front

Resumen ejecutivo
- Objetivo: identificar qué llamadas HTTP realiza el frontend, cuándo se disparan (mount, eventos, cambios de estado, polling), detectar llamadas redundantes/duplicadas y proponer medidas inmediatas y de mediano plazo para reducir la carga sobre el backend.
- Alcance: análisis estático del frontend (solo lectura). Incluye evidencia por archivos y líneas, lista de endpoints detectados y recomendaciones priorizadas.

Hallazgos principales

1) Componentes que generan llamadas en mount o con alta frecuencia
- Dashboard (src/components/Dashboard.tsx)
  - Llamadas detectadas: GET /register/names, GET /court-reserve/available/:date, GET /court-reserve/active/:name, POST /auth/checkBlocked
  - Dónde: getPlayersNames (useEffect), fetchData (useEffect dependiente de selectedDate), loadDashboardData llama Promise.all([fetchData(), getActiveReserves()]) lo que dispara múltiples requests al montar y cuando cambia la fecha.

- PlayerProfile (src/components/PlayerProfile.tsx)
  - Llamadas detectadas (Promise.all en mount): GET /register/profile/:email, GET /match-ranking/ranking, GET /match-ranking/history/:email
  - Riesgo: cada vista de perfil dispara 3 requests paralelos sin cache de cliente.

- NewsTicker (src/components/NewsTicker.tsx) y ResultsTicker (src/components/ResultsTicker.tsx)
  - Llamadas en mount: GET /news-ctq (NewsTicker), GET /match-ranking (ResultsTicker)
  - Ambos no usan cache ni revalidación controlada; si el componente está en un layout compartido generan llamadas por cada tab/instancia.

- Home e ImageUploadForm
  - Ambos llaman GET /info-items en mount. Pueden generar duplicados cuando admin y home están activos o al remontar componentes.

2) Operaciones que pueden generar duplicación o efecto de ráfaga
- Modal / flujo de reserva (src/components/Modal.tsx)
  - POST /court-reserve (createReservation / createTemporalReserve) y POST /mp/init-point
  - Riesgo: flujo de pago crea reserva temporal y luego inicia pago; si hay reintentos o problemas de red podrían crearse duplicados.

- InactivityLogout (src/components/InactivityLogout.tsx)
  - setTimeout(handleLogout, 180000) // 30 segundos (comentado como pruebas)
  - Riesgo: valor de testing activo en producción puede forzar re-autenticaciones y llamadas de login/perfil.

Top endpoints detectados (por frecuencia aparente en el frontend)
1. GET /court-reserve/available/:date
2. GET /register/names
3. GET /register/profile/:email
4. GET /match-ranking/ranking
5. GET /match-ranking/history/:email
6. GET /match-ranking
7. GET /info-items
8. GET /news-ctq
9. POST /court-reserve
10. POST /mp/init-point
11. POST /auth/checkBlocked

Evidencia (archivos y líneas relevantes)
- src/components/Dashboard.tsx — uso de axios.get en getPlayersNames, fetchData y useEffect que llama loadDashboardData (líneas relevantes en el archivo: llamadas alrededor de las líneas 162, 198–206, 228–284).
- src/components/PlayerProfile.tsx — Promise.all con 3 GET en mount (aprox. líneas 110–158).
- src/components/NewsTicker.tsx — axios.get(`${apiUrl}/news-ctq`) en useEffect (líneas ~48–85).
- src/components/ResultsTicker.tsx — axios.get(`${apiUrl}/match-ranking`) en useEffect (líneas ~28–36).
- src/components/Home.tsx — fetchItems llama GET `${apiUrl}/info-items` (líneas ~40–66).
- src/components/ImageUploadForm.tsx — fetchItems llama GET `${apiUrl}/info-items` y POST upload (líneas ~25–34, ~63–74).
- src/components/Modal.tsx — POST `${apiUrl}/court-reserve` y POST `${apiUrl}/mp/init-point` (líneas ~217, ~242, ~256).
- src/components/InactivityLogout.tsx — setTimeout(handleLogout, 180000) (línea ~27).

Diagnóstico rápido (causas probables)
- Muchos GETs se realizan en el montaje (useEffect) sin caching cliente. Sin un cache centralizado o react-query/SWR, cada instancia del componente hará su propia request.
- Vistas que lanzan varias peticiones paralelas (Promise.all) incrementan el número global de requests por vista.
- No hay deduplicación de peticiones: si varios componentes piden la misma ruta simultáneamente, la app genera múltiples requests en paralelo.
- No se detectó polling agresivo (setInterval) aparte del timeout de inactividad; eso reduce una fuente común de saturación.

Recomendaciones priorizadas

Acciones inmediatas (bajo esfuerzo — alto impacto)
1. Implementar cache simple para GETs frecuentes
   - Opción rápida: wrapper sobre axios que cachee respuestas GET en memoria por un TTL (ej. 30–120s) para rutas: /info-items, /news-ctq, /match-ranking, /register/names.
   - Resultado esperado: reducir llamadas duplicadas al abrir múltiples vistas o al refrescar componentes compartidos.

2. Dedupe de peticiones concurrentes
   - Implementar un mapa de promesas compartidas (key = método+url+params). Si existe la promesa, devolverla en vez de lanzar otra request.

3. Corregir timeouts de pruebas
   - Revisar InactivityLogout: 180000 ms (30s) está marcado como prueba. Ajustar a un valor de producción (p. ej. 30 minutos) o deshabilitar la funcionalidad en entornos de desarrollo.

Mediano plazo (mediano esfuerzo)
1. Migrar a @tanstack/react-query (React Query) o SWR
   - Ventajas: cache configurables (staleTime/cacheTime), refetch controlado, deduping integrado y retries configurables.

2. Consolidar llamadas críticas en backend o proveer endpoints compuestos
   - Por ejemplo: un endpoint que devuelva perfil + ranking + history si la vista PlayerProfile siempre los solicita juntos.

3. Revisar idempotencia en endpoints de reserva/pago
   - Asegurar que crear reservas temporales y pagos no creen duplicados ante reintentos de red o refrescos del usuario.

Largo plazo (mayor esfuerzo)
1. Instrumentación / Telemetría
   - Añadir métricas (Prometheus) o APM (Datadog/NewRelic) y tracing (OpenTelemetry) para contar requests por endpoint, identificar p95/p99 latencias y patrones de reintento.

2. Cache a nivel de CDN y ETag
   - Backend: habilitar Cache-Control, ETag/If-None-Match para GETs que lo permitan.

Comandos útiles para medición (ejecutar en staging / servidor)
- Buscar en repo (ejemplo, ripgrep):
  - rg -n "fetch\\(" --hidden
  - rg -n "axios\." --hidden
  - rg -n "useEffect\\(" --hidden
  - rg -n "setInterval\\(|setTimeout\\(" --hidden
  - rg -n "react-query|useQuery|SWR" --hidden

- Logs de backend (access.log):
  - awk '{print $7}' /path/to/access.log | sort | uniq -c | sort -nr
  - awk '{print $7, $9}' /path/to/access.log | sort | uniq -c | sort -nr

Pruebas automatizadas sugeridas
- Script Playwright (sugerido): abrir Dashboard (cambiar fecha varias veces), abrir PlayerProfile, abrir Home; contar número de requests por endpoint y registrar latencias. Puedo generar el script si lo deseás.

Fase 1: Acciones Implementadas (2026-05-31)
1. **Infraestructura e Integración Base**:
   - `@tanstack/react-query` está integrado en el proyecto.
   - [src/queryClient.ts] configurado con `staleTime: 30000`, `refetchOnWindowFocus: true`, `refetchOnReconnect: true`, y `retry: 1`.
   - `App.tsx` envuelve la app con `<QueryClientProvider client={queryClient}>`.
2. **Migración de Tickers clave**:
   - **`NewsTicker.tsx`**: ahora usa `useQuery` con clave `['news-ctq']` y `staleTime: 60000`.
   - **`ResultsTicker.tsx`**: ahora usa `useQuery` con clave `['match-ranking']` y `staleTime: 60000`.
3. **Refactorización de PlayerProfile**:
   - **`PlayerProfile.tsx`**: reemplazado Promise.all por 3 queries independientes (`['profile', email]`, `['ranking']`, `['history', email]`) con `staleTime: 30000`.
   - Se usa `queryClient.invalidateQueries` tras subir la foto para refrescar datos del perfil de inmediato.

Fase 2: Acciones Implementadas (2026-06-01)
1. **Migración Completa y Alineación de Dashboard (`Dashboard.tsx`)**:
   - Totalmente migrado a React Query. Se utiliza `useQuery` para `activeReservesQuery`, `availableQuery` y `checkBlockedQuery`.
   - Actualización del parámetro deprecado `cacheTime` por **`gcTime`** (Garbage Collection Time) de acuerdo con los lineamientos oficiales de React Query v5.
2. **Sincronización Absoluta de Caché (Invalidaciones)**:
   - Conectamos todos los flujos de creación/eliminación para limpiar el caché de la aplicación en el momento exacto en que ocurre una acción en la base de datos:
     * **`Modal.tsx`**: Invalida `['available']` y `['activeReserves']` tras crear una reserva con éxito.
     * **`MyHistoryReserve.tsx`**: Invalida `['available']` y `['activeReserves']` tras cancelar un turno.
     * **`AdminReserves.tsx`**: Invalida `['available']` y `['activeReserves']` tras eliminar un turno administrativamente.
     * **`PaymentSuccess.tsx`**: Invalida `['available']` y `['activeReserves']` al recibir y verificar la aprobación del pago de Mercado Pago.
3. **Ajuste del Timeout de Sesión**:
   - **`InactivityLogout.tsx`**: Ajustado el timeout por inactividad de 3 minutos a **5 minutos** (300,000 ms) para ofrecer una navegación más fluida y evitar cierres de sesión repetitivos.
4. **Verificación de Compilación**:
   - Se ejecutó `npm run build` en el frontend, resultando en una compilación exitosa y sin errores de TypeScript de ningún tipo.

Resumen de medición local (Playwright)
- Ejecuté el script de medición localmente contra `http://localhost:5173` con 10 iteraciones.
- Se detectaron 2 endpoints invocados por cada carga: `/news-ctq` y `/info-items` (20 requests totales; 10 de cada endpoint).
- Resultados guardados en `measure.json` en la raíz del repo.

Próximos pasos y plan de pruebas sugerido
1. **Pruebas Locales (Flujo de Red y Caché)**:
   - Iniciar el servidor local ejecutando `npm run dev`.
   - Abrir la consola del navegador (Chrome DevTools -> pestaña Network) y realizar los siguientes pasos de prueba:
     * **Paso A**: Cargar la página `Home` y verificar que las llamadas a los tickers `/news-ctq` y `/match-ranking` se realicen una sola vez.
     * **Paso B**: Navegar al perfil del jugador (`PlayerProfile`). Se deben disparar las 3 llamadas iniciales.
     * **Paso C**: Cambiar a otras vistas y volver a ingresar al Perfil en menos de 30 segundos. Confirmar en la consola de red que **no se realiza ninguna llamada nueva**, ya que los datos se sirven instantáneamente del caché.
     * **Paso D**: Modificar la foto de perfil y validar que la llamada de actualización del perfil se dispare correctamente en segundo plano, refrescando la UI.
     * **Paso E**: Reservar un turno en el Dashboard y corroborar que el turno se muestra bloqueado y el banner de reserva activa aparece de inmediato al retornar.
     * **Paso F**: Cancelar el turno en "Mi Historial" y confirmar que el banner desaparece y el horario queda liberado instantáneamente en el Dashboard.
     * **Paso G**: Permanecer inactivo por más de 3 minutos y verificar que la sesión ya no se cierra (debe expirar exactamente a los 5 minutos).
2. **Optimización de Endpoints Compuestos en Backend**:
   - De ser posible, consolidar peticiones múltiples en el servidor para reducir los tiempos de respuesta p95.

--
Documento actualizado tras la implementación exitosa de las Fases 1 y 2 de la migración progresiva a React Query.
