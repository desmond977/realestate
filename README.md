# TerraOps

TerraOps is a real estate operations platform with a Laravel API backend and a React client/admin frontend. It manages clients, properties, allocations, payments, receipts, realtor relationships, notifications, and a self-service client portal.

## Architecture

- `backend/`: Laravel 10 API, Sanctum authentication, Eloquent models, service-layer business logic, mail notifications, migrations, factories, and feature tests.
- `frontend/`: React 19 + Vite app with admin/staff/accountant dashboards and a protected client portal.
- `backend/routes/api.php`: admin/staff/accountant API routes under `/api/v1`.
- `backend/routes/client.php`: client portal API routes under `/api/v1/client`.
- `frontend/src/api` and `frontend/src/services`: API clients.
- `frontend/src/pages`, `frontend/src/components`, `frontend/src/hooks`, `frontend/src/utils`: routed screens, reusable UI, shared hooks, and helpers.
- Rental properties and lease agreements are managed separately from sales properties and allocations through the Rental Management section.

## Roles and Permissions

- `admin`: manages users, company settings, clients, realtors, allocations, properties, payments, and receipts.
- `staff`: manages clients, realtors, allocations, and client activity. Staff cannot record payments or manage properties.
- `accountant`: views dashboard/property/receipt data and records payments.
- `client`: uses the client portal to view allocated properties, payments, balances, receipts, and profile details.
- Rental records are visible to admin, staff, and accountant users; only admins can create, edit, or delete them.

Route middleware is the primary permission boundary. Controllers should stay thin and avoid duplicating role checks unless a workflow has a narrower rule than its route group.

## Core Workflows

### Allocations

Allocations connect a client to a property and optional realtor. `AllocationService` validates inventory, reserves one available plot, creates the allocation, records initial payments when provided, and sends allocation notifications. Unpaid allocations reserve inventory; paid or part-paid allocations become active.

### Rentals

Rental agreements connect a client to a rental property, which may optionally reference an existing sales property. Rental property records and lease details use separate tables and do not change sales inventory or allocation status.

Rental payment periods are generated from each agreement's configured weekly, biweekly, monthly, quarterly, or annual frequency. Confirmed payment transactions are stored separately from sales payments, support partial balances and overdue tracking, and receive separate rental receipts. Admins and accountants can record rental payments; rental payment records are append-only to preserve their history.

### Service charges

Service charges are separately categorized liabilities tied to an active rental agreement, its property, and its tenant. Billing periods, billing dates, due dates, collections, and receipts use dedicated service-charge tables, separate from rent and sales. Admins and staff manage charges, admins manage categories, and admins or accountants record collections.

### Rental dashboard

The Rental Dashboard is available to admins, staff, and accountants. Its 30-day, 90-day, and 12-month filters apply to confirmed rental collections, payment history, and revenue trends. Outstanding rent is the current due or overdue balance (not future scheduled periods), and occupancy counts active agreements within their lease dates. Service-charge billing is grouped by billing date, collections by payment date, and outstanding balances reflect the current balance of charges billed in the selected range. Rental revenue and service-charge collections are aggregated from their separate confirmed-payment ledgers.

### Payments

`PaymentService` records payments against allocations, validates outstanding balances, updates allocation status and property inventory, and creates receipts for confirmed payments.

### Receipts

Receipts are generated from payments and exposed through both admin APIs and the client portal. `ReceiptDocumentService` builds printable receipt data with company branding and payment details.

### Notifications

Notification services send allocation, payment, receipt, and reminder emails. Monthly reminders are handled by the console command in `backend/app/Console/Commands`.

### Client Portal

Clients authenticate through `/api/v1/client/auth/*`. The portal exposes dashboard, properties, payments, balances, receipts, payment-proof submissions, profile, and company branding endpoints. Payment proof files are stored on the private local disk and served only through authenticated endpoints scoped to the client or an admin reviewer. Submissions remain separate from confirmed rental and service-charge payment ledgers until an admin reviews them.

### Payment approvals

Admins review pending, approved, and rejected client submissions in the Payment Approvals section. Approval validates the current balance, records the payment through the relevant rental or service-charge payment service, issues its receipt, and links that ledger entry to the source submission. Rejection requires a reason that remains visible in the client portal. Review actions are transactional and restricted to admins.

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
