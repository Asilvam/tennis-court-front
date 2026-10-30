# Tennis Court Front — Club de Tenis Quintero

Frontend web application for **Club de Tenis Quintero (CTQ)** — a platform that allows club members to manage court reservations, track match results, and participate in a category-based ranking ladder (Escalerilla CTQ). Admins can manage users, schedules, and club content.

---

## Correccion del retorno de reservas (2026-10-29)

Especificacion, contrato, plan y evidencias en
[correccion-retorno-reservas.md](docs/correccion-retorno-reservas.md).
Los tres retornos `/payment/{success,failure,pending}` requieren sesion y
consultan el estado persistido por propietario; la URL no confirma el pago.
Cambio local, pendiente de commit/despliegue y validacion publicada.
Sin variables de entorno nuevas; se reutiliza `VITE_API_URL`.

## Identidad del sitio: favicon y vista previa

Implementado localmente: titulo `Club de Tenis Quintero`, idioma `es-CL`,
favicon ICO/PNG, icono iOS y metadatos Open Graph estaticos en `index.html`.
Imagen publica prevista para compartir: `/images/ctq-compartir-v1.png`,
1200 x 630, derivada del logo existente sin redibujarlo.
Informe tecnico, procedencia de activos, hashes, etapas y resultados:
[plan-identidad-web-ctq.md](docs/plan-identidad-web-ctq.md).

Validacion local: 251 pruebas, 55 controles HTTP/navegador, lint, tipos y build
aprobados. No esta desplegado y aun no se ha comprobado una miniatura real de
WhatsApp ni un acceso directo en un iPhone/iPad fisico.
No requiere variables nuevas ni cambios en backend, correo o Mercado Pago;
`parse5` es solo una dependencia de desarrollo para validar HTML estructurado.

```bash
npm run test:site-metadata
```

Para renovar los activos, conservar las fuentes, generar un nombre versionado,
actualizar referencias y pruebas y registrar hashes nuevos. El generador
`scripts/build-site-identity.mjs` recibe la ruta al modulo `sharp` del runtime
de herramientas; no agrega ese modulo al bundle de la aplicacion.

Barra superior alineada al contenido en escritorio: alcance, rama y evidencia
en [mejora-grafica-barra-titulo.md](docs/mejora-grafica-barra-titulo.md).
Continuacion: contenedor comun para las vistas principales y Perfil adaptado a
escritorio, conservando paleta CTQ. Implementacion, pruebas y capturas en
[mejora-grafica-contenedores-perfil.md](docs/mejora-grafica-contenedores-perfil.md).
Correccion de colores locales y tabla responsive de Reservas activas, con pruebas
de los colores renderizados:
[mejora-grafica-reservas-activas.md](docs/mejora-grafica-reservas-activas.md).
Multi-booking: distribucion escritorio/movil, calendario multiple en espanol y
confirmacion SweetAlert2, con pruebas y evidencia tecnica:
[mejora-grafica-multibooking.md](docs/mejora-grafica-multibooking.md).
Usuarios, Mi historial, Reset Pass y Ranking: distribucion de escritorio, adaptacion
movil/tablet, contratos conservados y evidencia de pruebas en
[mejora-vistas-usuarios-historial-reset.md](docs/mejora-vistas-usuarios-historial-reset.md).
Correccion posterior de hover/foco pastel y contraste de texto en filas y menu:
[correccion-contraste-tabla-menu.md](docs/correccion-contraste-tabla-menu.md).

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 (functional components + hooks) |
| Language | TypeScript 5.6 |
| Build tool | Vite 7 |
| Routing | React Router DOM v6 |
| State management | React Context API (`AuthContext`) + local `useState` |
| HTTP client | Axios |
| Authentication | JWT stored in `localStorage`, decoded with `jwt-decode` |
| UI library | Materialize CSS 1.0 |
| Icons | FontAwesome 6 + React Icons |
| Alerts | SweetAlert2 |
| Date/time | Luxon (`America/Santiago` timezone) |
| Payments | Mercado Pago (via backend redirect) |
| Deployment | Heroku (`serve -s dist`) |
| Node version | 22.x |

---

## Features

### Members (authenticated users)
- Visual daily court availability grid (up to 2 days ahead)
- Book singles or doubles slots, with optional "for ranking" flag
- Invite guest visitors
- Pay for night-time slots and visitors via Mercado Pago, using rates fetched from the backend (`GET /mp/rates`)
- View and cancel reservations via personal history
- Submit match results (score + winner) for ranking-tracked reservations
- View the Escalerilla CTQ — a category-based player ladder
- Upload and manage profile photo
- Auto-logout after 3 minutes of inactivity (60 minutes for admins), or on JWT expiry

### Session Expiration

Expired/malformed cached JWTs never mount protected views. JWT expiry is checked by a timer and again on focus/visibility changes. A `401` from this backend using the current session token clears authentication and redirects immediately to `/login`, with one SweetAlert2 notice; it does not wait for acknowledgement or an unsaved-editor confirmation. Inactivity uses the same login flow without advance warnings. JWT lifetime remains determined by the backend, independently of the inactivity limit.

Network failures, `403`, `429`, `5xx`, login credential errors, third-party responses and late denials from a previous login do not revoke the current session. Existing payment attempt references/idempotency data in `sessionStorage` are preserved; signing in does not retry or confirm a payment. Password recovery remains accessible after the expiry notice. No new environment variables are required.

Session regression tests are included in `npm run test:membership-payments` and `npm run test:inactivity`.

### Admins

Member editing includes Titular/Carga and a searchable titular selector for cargas. The association uses the member's stable `_id`, not their name or email. Existing Familiar records display as Carga without a mass migration; unrelated edits preserve their stored type. Changes are submitted to `PATCH /register/admin/:email` with the admin JWT and only changed editable fields. Coordinate deployment with the compatible backend. Editing this association is separate from initial billing enrollment and recording payments; see **Monthly Membership Payments** below for that workflow. It requires no new Mercado Pago, email-service or environment configuration.

Run selection and payload-validation tests:
```bash
npm run test:member-editing
```

Profile-photo upload (`POST /register/profile`) and saving (`PATCH /register/:email`) both send the session JWT. The backend allows only the authenticated user's own name, cellular and photo through the profile route; permissions and payment flags require the admin route. Public signup already sends only the allowed basic fields and remains unauthenticated. Older frontends without JWT headers cannot update photos once backend protection is enabled.

Run isolated photo-request tests (mocked HTTP, no uploads or real accounts):

```bash
npm run test:profile-image
```

### Password recovery

The login links to public `/recuperar-contrasena`. It requests a one-use email link through `POST /register/password-recovery`; users do not need a session and must wait 24 hours between accepted requests, including after mail-delivery failure. Existing admin reset controls use `POST /register/admin/resetpass` with the admin JWT and have no time limit. Both require an active existing member (`statePlayer=true`); inactive or unknown accounts receive no recovery email. Role-specific generic messages never expose a generated password or guarantee mail delivery. These screens use the login's dark surfaces with amber warning accents and explain the effect before submission.

Public `/restablecer-contrasena` reads the token from `#token=...`, clears the fragment, keeps the token only in component memory and submits matching passwords to `POST /register/password-recovery/confirm`. Reloading the cleaned page requires reopening the original email link. Public-request links expire after fifteen minutes; admin-request links (including Admin users) expire after 24 hours. The backend decides validity, and the email displays it. Both are one-use links; the shared confirmation form refers to the expiry stated in the email. Buttons show loading and disable submissions. No automatic login is performed; by explicit choice, already-issued JWT sessions remain valid until expiry.

The backend needs `PASSWORD_RESET_FRONTEND_URL=http://localhost:5173/restablecer-contrasena` locally and the matching HTTPS frontend URL in production. No new frontend variables, Mercado Pago changes or email-microservice API changes are required. Coordinate backend/frontend publication; the new frontend request path cannot trigger the immediate-password reset behavior of an older backend.

```bash
npm run test:password-recovery
```

- Full user management: edit data, roles, payment status, block/unblock accounts
- Assign and manage ranking categories and points per player
- Bulk-block court slots across multiple courts and dates
- View and delete all active reservations
- Manage homepage image carousel (upload/delete with title and text)
- Trigger password reset emails for any user
- Extended date navigation window (2 months back and forward)

---

## Monthly Membership Payments

Members use **Mis mensualidades** (`/monthlypayments`) for arrears, the current month and payment history. A titular may also select linked cargas. Mercado Pago results are verified by the backend; returning to the app never confirms money by itself.

Admins enter **Administrar usuarios → Pagos del socio** or **Mensualidades CTQ** (`/adminpayments`). The new stage 1 is implemented and tested locally, not deployed automatically:

- **Habilitar mensualidades** approves an active member's initial billing month after **Revisar cuotas**, a reason and SweetAlert2 confirmation. It creates open dues, not a payment; it cannot replace existing financial history.
- The member detail shows approved billing periods. Inactive gaps are excluded when an interval history exists; automatic closure and re-enrollment remain stage 2.
- **Registrar pago** accepts bank transfer, bank deposit or **Efectivo**. Totals equal full selected dues, oldest first. Cash requires confirmation of full receipt, no bank reference; the backend generates its folio and identifies the receiving admin.
- History distinguishes methods and shows bank reference, cash folio or Mercado Pago operation. Reversing a manual record preserves evidence and reopens only its dues; it does not refund money and cannot modify Mercado Pago payments.
- Only active admins can approve enrollment or record payments. Inactive beneficiaries remain disabled. Backend checks are authoritative.

Stage 2 adds **Reinscribir socio** in the existing detail for validated automatic terminations. It previews the current quota and the previous unpaid quotas that become non-collectible history. Confirmation preserves real payments and opens a new validity period without requiring previous debt. `VOID` displays as **Sin cobro por baja** and `ARCHIVED` as **Histórico no exigible**; neither is selectable for payment or represents money received.

Manual/family enrollment uses **Habilitar titular y cargas** with individual selection; global **Habilitar socios** previews eligible, already enabled and review-only members. Already enabled members are never reset by a later batch. Requests are split into stable blocks of 10 and uncertain responses retry the same payload/key. **Revisar vigencia** explicitly approves a valid old baseline without creating dues, changing payments or reenrolling the member. These workflows are implemented and tested locally; no production enrollments are implied. See backend `docs/membership-billing-manual-batch.md`.

Operational rules and the three-stage plan are documented in the backend README under **Mensualidades CTQ**, `docs/membership-billing-enrollment-cash-stage-1.md` and `docs/membership-billing-lifecycle-stage-2.md`. Stage 2 is implemented locally; automation is disabled by default and requires separate stage 3 approval. No frontend flags, new environment variables, general activation or deployment were added.

```bash
npm run test:membership-payments
```

## Routes

| Path | Component | Access |
|---|---|---|
| `/` | Home | Public |
| `/login` | Login | Public |
| `/recuperar-contrasena` | ResetPassword | Public |
| `/restablecer-contrasena` | ConfirmPasswordReset | Public, recovery link required to confirm |
| `/register` | PlayerForm | Public |
| `/summary` | ReservationSummary | Public |
| `/ranking` | Ranking | Public |
| `/dashboard` | Dashboard | Auth required |
| `/monthlypayments` | MembershipPayments | Auth required; available to active payments-only sessions |
| `/monthlypayments/return` | MembershipPaymentReturn | Auth required; server-verified outcome |
| `/adminpayments` | AdminMembershipPayments | Active admin only; optional memberId for individual detail |
| `/profile` | PlayerProfile | Auth required |
| `/myhistory` | MyHistoryReserve | Auth required |
| `/updatematch` | MatchResultUpdate | Auth required |
| `/adminregister` | AdminRegister | Admin only |
| `/items` | ImageUploadForm | Admin only |
| `/adminreserves` | AdminReserves | Admin only |
| `/multibooking` | MultipleBookingForm | Admin only |
| `/resetpassword` | ResetPassword | Admin only |
| `/admincategories` | AdminCategoriesPlayer | Admin only |
| `/payment/success` | PaymentSuccess | Public |
| `/payment/failure` | PaymentFailure | Public |
| `/payment/pending` | PaymentPending | Public |
| `*` | NotFound | Public |

---

## Getting Started

### Requirements
- Node 22.x
- npm 10.x

### Install dependencies
```bash
npm install
```

### Configure environment
Create a `.env` file in the project root:
```env
VITE_API_URL=http://localhost:3500
```

> The backend REST API must be running at the URL defined in `VITE_API_URL`.

### Reservation payment rates

Before confirming a paid booking, the frontend reads `GET /mp/rates` from `VITE_API_URL` and displays the applicable CLP amount. The backend configures the night, visitor and combined rates through `MP_NIGHT_AMOUNT`, `MP_VISIT_AMOUNT` and `MP_NIGHT_VISIT_AMOUNT`; the frontend has no hardcoded fallback. If rates cannot be loaded or are invalid, no payment reservation is created. Free bookings do not require this request.

Deploy the backend endpoint before deploying this frontend change. Mercado Pago and the email service require no changes for this feature.

### Two-minute payment holds

Opening a night booking modal, or selecting a visitor for a daytime booking, acquires an authenticated backend hold for two minutes. The countdown uses the server's deadline; selecting players or starting checkout does not reset it. Cancelling before checkout releases it; after checkout starts, the backend reconciles payment before releasing the slot and keeps it blocked while payment remains in progress. The calendar refreshes every five seconds and marks pending slots unavailable. Rates still come from `GET /mp/rates`.

This hold integration requires matching backend and Mercado Pago changes. Publish Mercado Pago support first, then coordinate backend and frontend deployment: `POST /mp/init-point` now requires JWT. It adds no frontend environment variables and does not change the email service API. The existing payment return screens have not been redesigned in this stage.

Run isolated hook lifecycle tests (mocked React effect scheduling and HTTP, no real reservations):
```bash
npm run test:payment-holds
```

Run rate-selection and validation tests with Node 22:
```bash
npm run test:payment-rates
```

### Run development server
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Preview production build locally
```bash
npm run preview
```

### Serve built output (production / Heroku)
```bash
npm run start
```

---

## Project Structure

```
src/
├── components/       # All UI components (24 total)
├── styles/           # Per-component CSS files
├── utils/            # Helpers (token, user info, logger)
├── constants/        # Enums (PlayerCategory, etc.)
├── App.tsx           # Root component and route definitions
└── main.tsx          # Entry point
```

---

## Deployment

The app is deployed on **Heroku** using the `Procfile`:
```
web: npm run start
```

Build the project with `npm run build` and deploy the `dist/` folder via `serve`.

### Custom Domain: ctq.serviciosasm.cl

Technical report and detailed three-stage plan (Spanish):
[Mejora CTQ Cloudflare](docs/mejora-ctq-cloudflare.md). Includes executed changes,
DNS/TLS evidence, pending tasks by repository, test criteria and rollback.

Stage 1 completed on 2026-10-29: domain, DNS and TLS verified. React remains hosted by Heroku app
`app-tenis-qtro-2`; Cloudflare only manages DNS. No Worker, Pages deployment,
code release or environment variable changes are required for this stage.

| Setting | Value |
| --- | --- |
| Custom frontend URL | `https://ctq.serviciosasm.cl` |
| Existing frontend URL, kept operational | `https://app-tenis-qtro-2-be6b838be293.herokuapp.com` |
| Cloudflare DNS zone | `serviciosasm.cl` |
| DNS record | `CNAME ctq` |
| Heroku DNS target | `pacific-egret-i6kljf65rjgfb4ofdfrzwloo.herokudns.com` |
| TTL / proxy | Automatic / DNS only (`proxied: false`) |
| TLS | Heroku ACM enabled; `Cert issued`, Let's Encrypt, hostname verified |

Verification on 2026-10-29: authoritative Cloudflare DNS, `1.1.1.1` and
`8.8.8.8` resolve the exact CNAME. HTTPS requests to `/`, `/login`,
`/monthlypayments` and `/restablecer-contrasena` return the same application
HTML as the original Heroku address (HTTP 200, matching SHA-256). TLS checks
passed with normal certificate verification, including the exact hostname/SAN.
The issued certificate expires on 2027-01-27 and Heroku scheduled automatic
renewal; recheck live ACM status rather than treating these dates as current.
This checks routing/TLS only, not authenticated API/payment behavior. No
credentials were sent over HTTP. ACM initially reported `Unable to resolve DNS`
because it ran before the record existed; one refresh after public DNS
propagation resolved it. Do not bypass certificate errors or sign in over HTTP.

The CNAME must use the target returned by `heroku domains`, not the
`herokuapp.com` address. Heroku also registers `ctq.serviciosasm.cl` as a custom
domain so it can route that Host header to this app. Keep DNS-only mode during
certificate issuance and renewal; enabling the Cloudflare proxy is a separate
decision and must include TLS/ACM renewal checks. No zone-wide SSL settings or
other DNS records are changed by this setup.

Read-only verification:

```bash
heroku domains --app app-tenis-qtro-2
heroku certs:auto --app app-tenis-qtro-2
cf dns records list --zone serviciosasm.cl --name ctq.serviciosasm.cl
dig @arturo.ns.cloudflare.com ctq.serviciosasm.cl CNAME +short
curl -I https://ctq.serviciosasm.cl/login
```

Stage 2 completed on 2026-10-29: the backend password-reset URL and all three
Mercado Pago return URLs now use the custom domain in Heroku. Config releases:
backend `v66`, Mercado Pago `v37`; no code deployment. Monthly returns derive
`/monthlypayments/return?reference=...` from `MP_SUCCESS_URL` as before.
`VITE_API_URL`, webhooks, internal service URLs and payment credentials remain
unchanged. No frontend config change, new variable or email-service restart.

Browser CORS checks passed in Chromium/WebKit from both domains at 390/1440 px
(8 read-only cases), using a deliberately invalid fixture JWT and no cookies.
Both origins render the login and expose the expected API 401 without CORS
errors. Existing wildcard CORS was not changed: this verifies the current
cookie-free JWT flow, not credentialed cookie support or origin restriction.
Unit regression: frontend 237, backend focused 103, Mercado Pago 128, mail 30.
External payment providers, database writes and SMTP were mocked in unit tests;
no live checkout, payment, reset request or email was generated for this stage.

Stage 3 technical tests ran on 2026-10-29: 1221 regression tests passed across
the four projects and 96 integrated checkpoints passed on Chromium/WebKit in
mobile/tablet/desktop viewports, with real local NestJS/JWT/Mongo transactions
and simulated provider/SMTP transports. The user signed in to the published
domain as test 1 and the profile was checked read-only. No live payment, reset,
mail delivery or financial portal write was initiated by the validation.

Stage 3 closure is **not approved**: the published reservation success page can
announce an unverified payment from URL parameters alone (pre-existing behavior
on both domains). Existing payment links may still return to the old frontend,
which remains available; there is no forced redirect. Local session corrections
are still separate from deployed code.
See the [stage 3 validation report](docs/ctq-cloudflare-stage3-validacion.md)
and [filtered evidence](docs/evidence/ctq-cloudflare-stage3.json) for cases,
limitations, the reservation finding and remaining approval decisions.

Browser storage is origin-specific: members must sign in again at the new
domain, and attempts stored under the old origin are not copied automatically.
Do not retry a payment simply because that local attempt is not visible.

Rollback: keep using the original Heroku URL. If the new address must be removed,
coordinate that decision before deleting only the `ctq` CNAME and its matching
Heroku custom domain. Do not alter `www`, the zone's other records, existing
certificates or backend/payment services.
