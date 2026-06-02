<?php

use App\Http\Controllers\Api\V1\AllocationController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\ClientController;
use App\Http\Controllers\Api\V1\CompanySettingController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\PropertyController;
use App\Http\Controllers\Api\V1\ReceiptController;
use App\Http\Controllers\Api\V1\RealtorController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::prefix('v1')->group(function () {
    // Client Portal Routes
    Route::prefix('client')->group(base_path('routes/client.php'));

    // Admin/Staff Routes
    Route::prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register'])->middleware('throttle:5,1');
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('me', [AuthController::class, 'me']);
            Route::patch('me', [AuthController::class, 'update']);
            Route::post('logout', [AuthController::class, 'logout']);
        });
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('dashboard', DashboardController::class)->middleware('role:admin,staff,accountant');
        Route::get('settings/company', [CompanySettingController::class, 'show'])->middleware('role:admin,staff,accountant');
        Route::put('settings/company', [CompanySettingController::class, 'update'])->middleware('role:admin');

        Route::get('allocations/form-options', [AllocationController::class, 'formOptions'])
            ->middleware('role:admin,staff,accountant');
        Route::apiResource('allocations', AllocationController::class)
            ->only(['index', 'store', 'show', 'update', 'destroy'])
            ->middleware('role:admin,staff,accountant');
        Route::get('clients/{client}/activity', [ClientController::class, 'activity'])->middleware('role:admin,staff');
        Route::apiResource('clients', ClientController::class)->middleware('role:admin,staff');
        Route::get('realtors/{realtor}/analytics', [RealtorController::class, 'analytics'])->middleware('role:admin,staff');
        Route::apiResource('realtors', RealtorController::class)->middleware('role:admin,staff');
        Route::apiResource('users', UserController::class)->middleware('role:admin');
        Route::apiResource('payments', PaymentController::class)
            ->only(['index', 'store', 'show'])
            ->middleware('role:admin,accountant');
        Route::apiResource('properties', PropertyController::class)
            ->only(['index', 'show'])
            ->middleware('role:admin,accountant');
        Route::apiResource('properties', PropertyController::class)
            ->only(['store', 'update', 'destroy'])
            ->middleware('role:admin');
        Route::get('receipts/{receipt}/document', [ReceiptController::class, 'document'])
            ->middleware('role:admin,staff,accountant');
        Route::apiResource('receipts', ReceiptController::class)
            ->only(['index', 'show'])
            ->middleware('role:admin,accountant');
    });
});
