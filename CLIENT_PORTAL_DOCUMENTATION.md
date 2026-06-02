# TerraOps Client Portal Documentation

## Overview

The Client Portal is a secure, self-service dashboard that allows clients to view and manage their real estate investments. Built with Laravel (API) and React (Frontend), it follows API-first architecture principles with scalable SaaS patterns.

## Architecture

### Backend (Laravel)

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/V1/Client/
│   │   │   ├── AuthController.php          # Client login/register/logout
│   │   │   ├── DashboardController.php     # Dashboard data
│   │   │   ├── PropertyController.php      # Client properties
│   │   │   ├── PaymentController.php       # Payment history
│   │   │   ├── ReceiptController.php       # Receipts & PDF download
│   │   │   ├── BalanceController.php       # Outstanding balances
│   │   │   └── ProfileController.php       # Profile management
│   │   ├── Middleware/
│   │   │   ├── EnsureClientRole.php        # Verify user is client
│   │   │   └── EnsureOwnership.php         # Verify resource ownership
│   │   └── Resources/
│   │       ├── ClientDashboardResource.php
│   │       ├── PropertyResource.php
│   │       ├── PaymentResource.php
│   │       ├── ReceiptResource.php
│   │       ├── AllocationResource.php
│   │       └── RealtorResource.php
│   ├── Models/
│   │   └── User.php                        # Updated with client methods
│   └── Services/
│       └── ClientDashboardService.php      # Business logic
├── routes/
│   ├── api.php                             # Main API routes
│   └── client.php                          # Client portal routes
└── resources/views/client/receipts/
    └── pdf.blade.php                       # Receipt PDF template
```

### Frontend (React)

```
frontend/src/
├── components/client/
│   ├── ClientDashboardLayout.jsx           # Main layout with sidebar
│   ├── ClientDashboardLayout.css
│   ├── ProtectedClientRoute.jsx            # Route protection
│   ├── SummaryCard.jsx                     # Dashboard summary cards
│   ├── PropertyCard.jsx                    # Property display card
│   ├── PaymentTable.jsx                    # Payments table
│   └── ReceiptList.jsx                     # Receipts list
├── context/
│   └── ClientContext.jsx                   # Auth state management
├── pages/client/
│   ├── ClientLoginPage.jsx                 # Login page
│   ├── ClientRegisterPage.jsx              # Registration page
│   ├── ClientDashboardPage.jsx             # Main dashboard
│   ├── ClientPropertiesPage.jsx            # Properties view
│   ├── ClientPaymentsPage.jsx              # Payment history
│   ├── ClientReceiptsPage.jsx              # Receipts view
│   ├── ClientBalancesPage.jsx              # Outstanding balances
│   └── ClientProfilePage.jsx               # Profile settings
└── services/
    └── clientApi.js                        # API service layer
```

## Authentication Strategy

### Single User Model with Role-Based Access

The system uses a single `users` table with a `role` column:
- `admin` - Full system access
- `staff` - Staff operations
- `accountant` - Financial operations
- `client` - Client portal access

### Middleware Protection

1. **EnsureClientRole**: Verifies the authenticated user has `client` role
2. **Ownership Checks**: Every API endpoint validates that clients only access their own data

### API Authentication

- Laravel Sanctum for token-based authentication
- Bearer token in Authorization header
- Token stored in localStorage on frontend

## API Endpoints

### Authentication
```
POST   /api/client/auth/login              # Client login
POST   /api/client/auth/register           # Client registration
POST   /api/client/auth/logout             # Logout (requires auth)
GET    /api/client/auth/profile            # Get profile
```

### Dashboard
```
GET    /api/client/dashboard               # Full dashboard data
GET    /api/client/dashboard/summary       # Summary only
```

### Properties
```
GET    /api/client/properties              # List allocated properties
GET    /api/client/properties/{id}         # Property details
```

### Payments
```
GET    /api/client/payments                # Payment history
GET    /api/client/payments/{id}           # Payment details
GET    /api/client/payments/upcoming/list  # Upcoming payments
GET    /api/client/payments/overdue/list   # Overdue payments
```

### Receipts
```
GET    /api/client/receipts                # List receipts
GET    /api/client/receipts/{id}           # Receipt details
GET    /api/client/receipts/{id}/download  # Download PDF
```

### Balances
```
GET    /api/client/balances                # Full balance breakdown
GET    /api/client/balances/summary        # Balance summary
```

### Profile
```
GET    /api/client/profile                 # Get profile
PUT    /api/client/profile                 # Update profile
PUT    /api/client/profile/password        # Change password
POST   /api/client/profile/image           # Upload profile image
DELETE /api/client/profile/image           # Delete profile image
```

## Security Features

### Client Data Isolation
- All queries filtered by `client_id`
- Middleware validates ownership before returning data
- Clients cannot access admin/staff routes

### Protected Routes
- All client endpoints require `auth:sanctum` middleware
- Additional `EnsureClientRole` middleware for client-only routes
- Frontend route protection with `ProtectedClientRoute`

### Input Validation
- All inputs validated on backend
- Password requirements enforced
- File upload restrictions

## Database Schema

### Users Table Updates
```sql
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'client';
ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULLABLE;
ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) NULLABLE;
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULLABLE;
```

### Client-Realtor Pivot Table
```sql
CREATE TABLE client_realtor (
    id BIGINT PRIMARY KEY,
    client_id BIGINT FOREIGN KEY,
    realtor_id BIGINT FOREIGN KEY,
    assigned_at TIMESTAMP,
    timestamps
);
```

## User Model Methods

```php
// Role checks
$user->isClient();
$user->isAdmin();
$user->isStaff();
$user->isAccountant();

// Relationships
$user->allocations();      // Allocations belonging to client
$user->properties();       // Properties through allocations
$user->payments();         // Payments made by client
$user->receipts();         // Receipts for client
$user->realtors();         // Assigned realtors

// Calculations
$user->totalPaid();        // Sum of completed payments
$user->outstandingBalance(); // Total - paid
$user->paymentProgress();  // Percentage paid
$user->hasOutstandingBalance(); // Boolean check
```

## Frontend Features

### Dashboard
- Summary cards (properties, paid, outstanding, progress)
- Recent payments table
- Recent receipts list
- Assigned realtor information
- Alert banners for overdue payments

### Properties
- Grid view of allocated properties
- Payment progress per property
- Property details (location, size, document type)
- Allocation status

### Payments
- Full payment history
- Filter by status (all, completed, pending, overdue)
- Status breakdown summary
- Download receipt links

### Receipts
- List of all receipts
- PDF download functionality
- Print option
- Transaction details

### Outstanding Balances
- Total outstanding amount
- Breakdown by property
- Payment progress per allocation
- Overdue amount highlighting

### Profile
- Update personal information
- Change password
- Upload profile image
- Account information display

## Mobile Responsiveness

All pages are fully responsive with:
- Mobile-optimized sidebar navigation
- Responsive data tables (cards on mobile)
- Touch-friendly buttons and inputs
- Adaptive grid layouts

## Future Enhancements

### Planned Features
1. **Online Payment Integration** - Pay directly from portal
2. **Push Notifications** - Payment reminders, updates
3. **Document Vault** - Store legal documents
4. **Maintenance Requests** - Submit property issues
5. **Multi-language Support** - Internationalization
6. **Mobile App** - React Native version

### Multi-tenancy Ready
The architecture supports future multi-tenancy:
- Client data isolated by `client_id`
- Middleware can be extended for company/tenant checks
- API structure supports tenant scoping

## Deployment

### Environment Variables
```env
# Backend
APP_URL=http://localhost:8000
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:3000

# Frontend
VITE_API_BASE_URL=http://localhost:8000/api
```

### Running the Application

1. **Backend Setup**
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan storage:link
php artisan serve
```

2. **Frontend Setup**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

3. **Access Client Portal**
- Login: http://localhost:5173/client/login
- Register: http://localhost:5173/client/register

## Testing

### Creating a Test Client

```php
// In tinker or seeder
User::create([
    'name' => 'Test Client',
    'email' => 'client@test.com',
    'password' => Hash::make('password123'),
    'role' => 'client',
    'phone' => 'Hello@Azubuikedesmond.com',
]);
```

### API Testing with cURL

```bash
# Login
curl -X POST http://localhost:8000/api/client/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client@test.com","password":"password123"}'

# Get Dashboard (use token from login)
curl http://localhost:8000/api/client/dashboard \
  -H "Authorization: Bearer {token}"
```

## Support

For technical support, contact:
- Email: Hello@Azubuikedesmond.com
- Phone: +2348104889570 

---

Built with Laravel 11 & React 18
Version: 1.0.0