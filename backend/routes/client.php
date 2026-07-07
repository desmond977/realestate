<?php

use App\Http\Controllers\Api\V1\Client\AuthController;
use App\Http\Controllers\Api\V1\Client\BalanceController;
use App\Http\Controllers\Api\V1\Client\DashboardController;
use App\Http\Controllers\Api\V1\Client\DocumentController;
use App\Http\Controllers\Api\V1\Client\PaymentController;
use App\Http\Controllers\Api\V1\Client\ProfileController;
use App\Http\Controllers\Api\V1\Client\PropertyController;
use App\Http\Controllers\Api\V1\Client\ReceiptController;
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
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
});
Route::get('/branding', [AuthController::class, 'branding']);

// Protected client routes
Route::middleware(['auth:sanctum', 'client'])->group(function () {

    // Logout and profile
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/profile', [AuthController::class, 'profile']);

    // Dashboard
    Route::prefix('dashboard')->group(function () {
        Route::get('/', [DashboardController::class, 'index']);
        Route::get('/summary', [DashboardController::class, 'summary']);
    });

    // Properties
    Route::prefix('properties')->group(function () {
        Route::get('/', [PropertyController::class, 'index']);
        Route::get('/{allocationId}', [PropertyController::class, 'show']);
    });

    // Payments
    Route::prefix('payments')->group(function () {
        Route::get('/', [PaymentController::class, 'index']);
        Route::get('/upcoming/list', [PaymentController::class, 'upcoming']);
        Route::get('/overdue/list', [PaymentController::class, 'overdue']);
        Route::get('/{paymentId}', [PaymentController::class, 'show']);
    });

    // Receipts
    Route::prefix('receipts')->group(function () {
        Route::get('/', [ReceiptController::class, 'index']);
        Route::get('/{receiptId}/download', [ReceiptController::class, 'downloadPdf']);
        Route::get('/{receiptId}/document', [ReceiptController::class, 'document']);
        Route::get('/{receiptId}', [ReceiptController::class, 'show']);
    });

    // Balances
    Route::prefix('balances')->group(function () {
        Route::get('/', [BalanceController::class, 'index']);
        Route::get('/summary', [BalanceController::class, 'summary']);
    });

    // Documents
    Route::prefix('documents')->group(function () {
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
