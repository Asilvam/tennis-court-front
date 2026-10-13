# Tennis Court Front — Club de Tenis Quintero

Frontend web application for **Club de Tenis Quintero (CTQ)** — a platform that allows club members to manage court reservations, track match results, and participate in a category-based ranking ladder (Escalerilla CTQ). Admins can manage users, schedules, and club content.

---

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
- Auto-logout after 60 minutes of inactivity or on JWT expiry

### Admins
- Full user management: edit data, roles, payment status, block/unblock accounts
- Assign and manage ranking categories and points per player
- Bulk-block court slots across multiple courts and dates
- View and delete all active reservations
- Manage homepage image carousel (upload/delete with title and text)
- Trigger password reset emails for any user
- Extended date navigation window (2 months back and forward)

---

## Routes

| Path | Component | Access |
|---|---|---|
| `/` | Home | Public |
| `/login` | Login | Public |
| `/register` | PlayerForm | Public |
| `/summary` | ReservationSummary | Public |
| `/ranking` | Ranking | Public |
| `/dashboard` | Dashboard | Auth required |
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
