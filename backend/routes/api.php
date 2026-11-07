<?php

use App\Http\Controllers\Api\V1\AllocationController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\ClientController;
use App\Http\Controllers\Api\V1\CompanySettingController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DocumentController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\PaymentApprovalController;
use App\Http\Controllers\Api\V1\PropertyController;
use App\Http\Controllers\Api\V1\RealtorController;
use App\Http\Controllers\Api\V1\ReceiptController;
use App\Http\Controllers\Api\V1\RentalAgreementController;
use App\Http\Controllers\Api\V1\RentalDashboardController;
use App\Http\Controllers\Api\V1\RentalPaymentController;
use App\Http\Controllers\Api\V1\ServiceChargeCategoryController;
use App\Http\Controllers\Api\V1\ServiceChargeController;
use App\Http\Controllers\Api\V1\ServiceChargePaymentController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Middleware\EnsureRentalManagementEnabled;
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
        Route::get('rental-dashboard', RentalDashboardController::class)
            ->middleware(['role:admin,staff,accountant', EnsureRentalManagementEnabled::class]);
        Route::get('payment-approvals/{submission}/proof', [PaymentApprovalController::class, 'proof'])
            ->middleware(['role:admin', EnsureRentalManagementEnabled::class])
            ->name('admin.payment-approvals.proof');
        Route::get('payment-approvals', [PaymentApprovalController::class, 'index'])
            ->middleware(['role:admin', EnsureRentalManagementEnabled::class]);
        Route::post('payment-approvals/{submission}/approve', [PaymentApprovalController::class, 'approve'])
            ->middleware(['role:admin', EnsureRentalManagementEnabled::class]);
        Route::post('payment-approvals/{submission}/reject', [PaymentApprovalController::class, 'reject'])
            ->middleware(['role:admin', EnsureRentalManagementEnabled::class]);
        Route::get('settings/company', [CompanySettingController::class, 'show'])->middleware('role:admin,staff,accountant');
        Route::put('settings/company', [CompanySettingController::class, 'update'])->middleware('role:admin');

        Route::get('allocations/form-options', [AllocationController::class, 'formOptions'])
            ->middleware('role:admin,staff,accountant');
        Route::apiResource('allocations', AllocationController::class)
            ->only(['index', 'show'])
            ->middleware('role:admin,staff,accountant');
        Route::apiResource('allocations', AllocationController::class)
            ->only(['store', 'update', 'destroy'])
            ->middleware('role:admin');
        Route::get('clients/{client}/activity', [ClientController::class, 'activity'])->middleware('role:admin,staff,accountant');
        Route::apiResource('clients', ClientController::class)
            ->only(['index', 'show'])
            ->middleware('role:admin,staff,accountant');
        Route::apiResource('clients', ClientController::class)
            ->only(['store', 'update', 'destroy'])
            ->middleware('role:admin,staff');
        Route::get('realtors/{realtor}/analytics', [RealtorController::class, 'analytics'])->middleware('role:admin,staff');
        Route::apiResource('realtors', RealtorController::class)
            ->only(['index', 'show'])
            ->middleware('role:admin,staff,accountant');
        Route::apiResource('realtors', RealtorController::class)
            ->only(['store', 'update', 'destroy'])
            ->middleware('role:admin,staff');
        Route::apiResource('users', UserController::class)->middleware('role:admin');
        Route::apiResource('payments', PaymentController::class)
            ->only(['index', 'store', 'show'])
            ->middleware('role:admin,accountant');
        Route::apiResource('properties', PropertyController::class)
            ->only(['index', 'show'])
            ->middleware('role:admin,staff,accountant');
        Route::apiResource('properties', PropertyController::class)
            ->only(['store', 'update', 'destroy'])
            ->middleware('role:admin');
        Route::get('documents', [DocumentController::class, 'index'])->middleware('role:admin,staff,accountant');
        Route::get('document-templates', [DocumentController::class, 'templatesIndex'])->middleware('role:admin');
        Route::post('document-templates', [DocumentController::class, 'storeTemplate'])->middleware('role:admin');
        Route::patch('document-templates/{template}', [DocumentController::class, 'updateTemplate'])->middleware('role:admin');
        Route::delete('document-templates/{template}', [DocumentController::class, 'destroyTemplate'])->middleware('role:admin');
        Route::get('allocations/{allocation}/documents', [DocumentController::class, 'show'])->middleware('role:admin,staff,accountant');
        Route::patch('allocations/{allocation}/documents', [DocumentController::class, 'update'])->middleware('role:admin,staff,accountant');
        Route::post('allocations/{allocation}/documents/{template}/generate', [DocumentController::class, 'generate'])->middleware('role:admin,staff,accountant');
        Route::get('allocations/{allocation}/documents/{template}/view', [DocumentController::class, 'view'])->middleware('role:admin,staff,accountant');
        Route::get('allocations/{allocation}/documents/{template}/download', [DocumentController::class, 'download'])->middleware('role:admin,staff,accountant');
        Route::get('receipts/{receipt}/document', [ReceiptController::class, 'document'])
            ->middleware('role:admin,staff,accountant');
        Route::apiResource('receipts', ReceiptController::class)
            ->only(['index', 'show'])
            ->middleware('role:admin,staff,accountant');
        Route::get('rentals/form-options', [RentalAgreementController::class, 'formOptions'])
            ->middleware(['role:admin,staff,accountant', EnsureRentalManagementEnabled::class]);
        Route::apiResource('rentals', RentalAgreementController::class)
            ->only(['index', 'show'])
            ->middleware(['role:admin,staff,accountant', EnsureRentalManagementEnabled::class]);
        Route::apiResource('rentals', RentalAgreementController::class)
            ->only(['store', 'update', 'destroy'])
            ->middleware(['role:admin', EnsureRentalManagementEnabled::class]);
        Route::get('rental-payment-periods', [RentalPaymentController::class, 'index'])
            ->middleware(['role:admin,staff,accountant', EnsureRentalManagementEnabled::class]);
        Route::get('rental-payment-periods/{period}', [RentalPaymentController::class, 'show'])
            ->middleware(['role:admin,staff,accountant', EnsureRentalManagementEnabled::class]);
        Route::post('rental-payment-periods/{period}/payments', [RentalPaymentController::class, 'store'])
            ->middleware(['role:admin,accountant', EnsureRentalManagementEnabled::class]);
        Route::get('service-charge-categories', [ServiceChargeCategoryController::class, 'index'])
            ->middleware(['role:admin,staff,accountant', EnsureRentalManagementEnabled::class]);
        Route::post('service-charge-categories', [ServiceChargeCategoryController::class, 'store'])
            ->middleware(['role:admin', EnsureRentalManagementEnabled::class]);
        Route::put('service-charge-categories/{category}', [ServiceChargeCategoryController::class, 'update'])
            ->middleware(['role:admin', EnsureRentalManagementEnabled::class]);
        Route::delete('service-charge-categories/{category}', [ServiceChargeCategoryController::class, 'destroy'])
            ->middleware(['role:admin', EnsureRentalManagementEnabled::class]);
        Route::get('service-charges/form-options', [ServiceChargeController::class, 'formOptions'])
            ->middleware(['role:admin,staff,accountant', EnsureRentalManagementEnabled::class]);
        Route::get('service-charges', [ServiceChargeController::class, 'index'])
            ->middleware(['role:admin,staff,accountant', EnsureRentalManagementEnabled::class]);
        Route::post('service-charges', [ServiceChargeController::class, 'store'])
            ->middleware(['role:admin,staff', EnsureRentalManagementEnabled::class]);
        Route::get('service-charges/{serviceCharge}', [ServiceChargeController::class, 'show'])
            ->middleware(['role:admin,staff,accountant', EnsureRentalManagementEnabled::class]);
        Route::put('service-charges/{serviceCharge}', [ServiceChargeController::class, 'update'])
            ->middleware(['role:admin,staff', EnsureRentalManagementEnabled::class]);
        Route::delete('service-charges/{serviceCharge}', [ServiceChargeController::class, 'destroy'])
            ->middleware(['role:admin', EnsureRentalManagementEnabled::class]);
        Route::post('service-charges/{serviceCharge}/payments', [ServiceChargePaymentController::class, 'store'])
            ->middleware(['role:admin,accountant', EnsureRentalManagementEnabled::class]);
    });
});
