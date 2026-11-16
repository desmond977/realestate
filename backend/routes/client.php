<?php

use App\Http\Controllers\Api\V1\Client\AuthController;
use App\Http\Controllers\Api\V1\Client\BalanceController;
use App\Http\Controllers\Api\V1\Client\DashboardController;
use App\Http\Controllers\Api\V1\Client\DocumentController;
use App\Http\Controllers\Api\V1\Client\PaymentController;
use App\Http\Controllers\Api\V1\Client\PaymentProofSubmissionController;
use App\Http\Controllers\Api\V1\Client\ProfileController;
use App\Http\Controllers\Api\V1\Client\PropertyController;
use App\Http\Controllers\Api\V1\Client\ReceiptController;
use App\Http\Controllers\Api\V1\Client\RentalPaymentController;
use App\Http\Controllers\Api\V1\Client\RentalPropertyController;
use App\Http\Controllers\Api\V1\PaystackClientPaymentController;
use App\Http\Controllers\Api\V1\Client\ServiceChargeController;
use App\Http\Middleware\EnsureRentalManagementEnabled;
use App\Http\Middleware\EnsureRealEstateManagementEnabled;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Client Portal API Routes
|--------------------------------------------------------------------------
|
| These routes are dedicated to the client portal. They are protected
| by auth:sanctum middleware to ensure only authenticated clients
| can access these endpoints.
|
*/

// Public routes (authentication)
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
});
Route::get('/branding', [AuthController::class, 'branding']);

// Protected client routes
Route::middleware(['auth:sanctum', 'client'])->group(function () {

    // Logout and profile
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/profile', [AuthController::class, 'profile']);

    // Dashboard
    Route::prefix('dashboard')->middleware(EnsureRealEstateManagementEnabled::class)->group(function () {
        Route::get('/', [DashboardController::class, 'index']);
        Route::get('/summary', [DashboardController::class, 'summary']);
    });

    // Properties
    Route::prefix('properties')->middleware(EnsureRealEstateManagementEnabled::class)->group(function () {
        Route::get('/', [PropertyController::class, 'index']);
        Route::get('/{allocationId}', [PropertyController::class, 'show']);
    });

    // Payments
    Route::prefix('payments')->middleware(EnsureRealEstateManagementEnabled::class)->group(function () {
        Route::get('/', [PaymentController::class, 'index']);
        Route::get('/upcoming/list', [PaymentController::class, 'upcoming']);
        Route::get('/overdue/list', [PaymentController::class, 'overdue']);
        Route::get('/{paymentId}', [PaymentController::class, 'show']);
    });

    Route::middleware(EnsureRentalManagementEnabled::class)->group(function () {
        Route::get('/rental-properties', [RentalPropertyController::class, 'index']);
        Route::get('/service-charges', [ServiceChargeController::class, 'index']);
        Route::get('/rent-payments', [RentalPaymentController::class, 'index']);
        Route::get('/paystack/availability', [PaystackClientPaymentController::class, 'availability']);
        Route::post('/paystack/checkout', [PaystackClientPaymentController::class, 'checkout'])->middleware('throttle:8,1');
        Route::get('/paystack/{reference}', [PaystackClientPaymentController::class, 'status'])->where('reference', 'TR-[A-Z0-9]+');

        Route::get('/payment-proof-submissions/options', [PaymentProofSubmissionController::class, 'options']);
        Route::get('/payment-proof-submissions', [PaymentProofSubmissionController::class, 'index']);
        Route::post('/payment-proof-submissions', [PaymentProofSubmissionController::class, 'store'])
            ->middleware('throttle:10,1');
        Route::get('/payment-proof-submissions/{submissionId}/proof', [PaymentProofSubmissionController::class, 'proof'])
            ->name('client.payment-proof-submissions.proof');
    });

    // Receipts
    Route::prefix('receipts')->middleware(EnsureRealEstateManagementEnabled::class)->group(function () {
        Route::get('/', [ReceiptController::class, 'index']);
        Route::get('/{receiptId}/download', [ReceiptController::class, 'downloadPdf']);
        Route::get('/{receiptId}/document', [ReceiptController::class, 'document']);
        Route::get('/{receiptId}', [ReceiptController::class, 'show']);
    });

    // Balances
    Route::prefix('balances')->middleware(EnsureRealEstateManagementEnabled::class)->group(function () {
        Route::get('/', [BalanceController::class, 'index']);
        Route::get('/summary', [BalanceController::class, 'summary']);
    });

    // Documents
    Route::prefix('documents')->middleware(EnsureRealEstateManagementEnabled::class)->group(function () {
        Route::get('/', [DocumentController::class, 'index']);
        Route::get('/allocations/{allocation}/templates/{template}/view', [DocumentController::class, 'view']);
    });

    // Profile
    Route::prefix('profile')->group(function () {
        Route::get('/', [ProfileController::class, 'show']);
        Route::put('/', [ProfileController::class, 'update']);
        Route::put('/password', [ProfileController::class, 'updatePassword']);
        Route::post('/image', [ProfileController::class, 'updateProfileImage']);
        Route::delete('/image', [ProfileController::class, 'deleteProfileImage']);
    });
});
