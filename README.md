# TerraOps

TerraOps is a real estate operations platform with a Laravel API backend and a React client/admin frontend. It manages clients, properties, allocations, payments, receipts, realtor relationships, notifications, and a self-service client portal.

## Architecture

- `backend/`: Laravel 10 API, Sanctum authentication, Eloquent models, service-layer business logic, mail notifications, migrations, factories, and feature tests.
- `frontend/`: React 19 + Vite app with admin/staff/accountant dashboards and a protected client portal.
- `backend/routes/api.php`: admin/staff/accountant API routes under `/api/v1`.
- `backend/routes/client.php`: client portal API routes under `/api/v1/client`.
- `frontend/src/api` and `frontend/src/services`: API clients.
- `frontend/src/pages`, `frontend/src/components`, `frontend/src/hooks`, `frontend/src/utils`: routed screens, reusable UI, shared hooks, and helpers.

## Roles and Permissions

- `admin`: manages users, company settings, clients, realtors, allocations, properties, payments, and receipts.
- `staff`: manages clients, realtors, allocations, and client activity. Staff cannot record payments or manage properties.
- `accountant`: views dashboard/property/receipt data and records payments.
- `client`: uses the client portal to view allocated properties, payments, balances, receipts, and profile details.

Route middleware is the primary permission boundary. Controllers should stay thin and avoid duplicating role checks unless a workflow has a narrower rule than its route group.

## Core Workflows

### Allocations

Allocations connect a client to a property and optional realtor. `AllocationService` validates inventory, reserves one available plot, creates the allocation, records initial payments when provided, and sends allocation notifications. Unpaid allocations reserve inventory; paid or part-paid allocations become active.

### Payments

`PaymentService` records payments against allocations, validates outstanding balances, updates allocation status and property inventory, and creates receipts for confirmed payments.

### Receipts

Receipts are generated from payments and exposed through both admin APIs and the client portal. `ReceiptDocumentService` builds printable receipt data with company branding and payment details.

### Notifications

Notification services send allocation, payment, receipt, and reminder emails. Monthly reminders are handled by the console command in `backend/app/Console/Commands`.

### Client Portal

Clients authenticate through `/api/v1/client/auth/*`. The portal exposes dashboard, properties, payments, balances, receipts, profile, and company branding endpoints. Frontend pages live under `frontend/src/pages/client`.

## Development

Backend:

```bash
cd backend
composer install
php artisan migrate
php artisan test
composer audit
```

Frontend:

```bash
cd frontend
npm install
npm run lint
npm run build
npm audit
```

## Maintenance Guidelines

- Keep controllers focused on request validation, service calls, and responses.
- Put allocation, payment, receipt, notification, and inventory rules in services.
- Keep React pages focused; extract repeated modal/form/table logic when files become hard to scan.
- Keep migrations ordered so a fresh SQLite test database can run from zero.
- Remove starter/demo assets and unused routes as soon as features are retired.
- Run lint, build, backend tests, and dependency audits before release.

