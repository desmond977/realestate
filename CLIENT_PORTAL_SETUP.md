# TerraOps Client Portal - Setup Guide
By Azubuike Desmond , Ditran Solutions @2026

## Overview

The Client Portal allows clients to securely log in and view their real estate information including properties, payments, receipts, and outstanding balances.

## Architecture

### Backend
- **Model**: Uses existing `Client` model (not User model)
- **Authentication**: Laravel Sanctum with Client model
- **Routes**: `/api/v1/client/*`
- **Controllers**: Located in `app/Http/Controllers/Api/V1/Client/`

### Frontend
- **Routes**: `/client/*`
- **Components**: Located in `frontend/src/components/client/`
- **Pages**: Located in `frontend/src/pages/client/`
- **Context**: `ClientContext` for auth state
- **API Service**: `clientApi.js`

## Setup Steps

### 1. Run Migrations

```bash
cd backend
php artisan migrate
```

This will:
- Add `password`, `profile_image`, and `remember_token` to `clients` table
- Create `client_realtor` pivot table

### 2. Configure Environment

Update `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:8000/api/v1/client
```

### 3. Start Servers

Backend:
```bash
cd backend
php artisan serve
```

Frontend:
```bash
cd frontend
npm run dev
```

### 4. Access Client Portal

- Login: http://localhost:5173/client/login
- Register: http://localhost:5173/client/register

## API Endpoints

### Authentication
```
POST   /api/v1/client/auth/login
POST   /api/v1/client/auth/register
POST   /api/v1/client/auth/logout
GET    /api/v1/client/auth/profile
```

### Dashboard
```
GET    /api/v1/client/dashboard
GET    /api/v1/client/dashboard/summary
```

### Properties
```
GET    /api/v1/client/properties
GET    /api/v1/client/properties/{id}
```

### Payments
```
GET    /api/v1/client/payments
GET    /api/v1/client/payments/{id}
GET    /api/v1/client/payments/upcoming/list
GET    /api/v1/client/payments/overdue/list
```

### Receipts
```
GET    /api/v1/client/receipts
GET    /api/v1/client/receipts/{id}
GET    /api/v1/client/receipts/{id}/download
```

### Balances
```
GET    /api/v1/client/balances
GET    /api/v1/client/balances/summary
```

### Profile
```
GET    /api/v1/client/profile
PUT    /api/v1/client/profile
PUT    /api/v1/client/profile/password
POST   /api/v1/client/profile/image
DELETE /api/v1/client/profile/image
```

## Creating Test Clients

### Via API
```bash
curl -X POST http://localhost:8000/api/v1/client/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "email": "client@test.com",
    "password": "password123",
    "password_confirmation": "password123",
    "phone": "08012345678"
  }'
```

### Via Tinker
```bash
cd backend
php artisan tinker
```

```php
App\Models\Client::create([
    'name' => 'Test Client',
    'email' => 'client@test.com',
    'password' => Hash::make('password123'),
    'phone' => '08012345678',
    'status' => 'active',
]);
```

## Security

- Clients can only access their own data
- All routes protected by `auth:sanctum` middleware
- Password hashing with Laravel's Hash facade
- CORS configured for frontend domain

## Key Files

### Backend
- `backend/app/Models/Client.php` - Client model with auth methods
- `backend/app/Http/Controllers/Api/V1/Client/` - Client controllers
- `backend/routes/client.php` - Client routes
- `backend/database/migrations/2024_01_15_100000_add_auth_fields_to_clients_table.php`

### Frontend
- `frontend/src/context/ClientContext.jsx` - Auth state
- `frontend/src/services/clientApi.js` - API service
- `frontend/src/pages/client/` - Client pages
- `frontend/src/components/client/` - Client components
- `frontend/src/App.jsx` - Route configuration

## Troubleshooting

### Migration Issues
If migrations fail, ensure the `clients` table exists:
```bash
php artisan migrate:status
```

### CORS Issues
Update `backend/config/cors.php`:
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['http://localhost:5173'],
```

### Auth Issues
Ensure Sanctum is configured:
```bash
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

## Support

For issues, contact Hello@Azubuikedesmond.com, 08104889570