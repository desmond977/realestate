<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\RentalFrequency;
use App\Enums\RentalStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\RentalAgreementResource;
use App\Models\Client;
use App\Models\Property;
use App\Models\RentalAgreement;
use App\Models\RentalProperty;
use App\Services\RealEstate\RentalPaymentScheduleService;
use App\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RentalAgreementController extends Controller
{
    public function __construct(private readonly RentalPaymentScheduleService $paymentScheduleService) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(RentalStatus::manageableValues())],
            'rental_frequency' => ['sometimes', Rule::in(RentalFrequency::availableValues())],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $agreements = RentalAgreement::query()
            ->with(['rentalProperty.property', 'client'])
            ->when($validated['search'] ?? null, function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->whereHas('rentalProperty', function ($query) use ($search) {
                            $query->where('name', 'like', "%{$search}%")
                                ->orWhere('location', 'like', "%{$search}%")
                                ->orWhereHas('property', function ($query) use ($search) {
                                    $query->where('title', 'like', "%{$search}%")
                                        ->orWhere('location', 'like', "%{$search}%");
                                });
                        })
                        ->orWhereHas('client', function ($query) use ($search) {
                            $query->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%");
                        });
                });
            })
            ->when($validated['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when(
                $validated['rental_frequency'] ?? null,
                fn ($query, string $frequency) => $query->where('rental_frequency', $frequency)
            )
            ->latest()
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return RentalAgreementResource::collection($agreements);
    }

    public function formOptions(): JsonResponse
    {
        return response()->json([
            'data' => [
                'clients' => Client::query()
                    ->orderBy('first_name')
                    ->orderBy('last_name')
                    ->limit(100)
                    ->get(['id', 'first_name', 'last_name', 'email']),
                'properties' => Property::query()
                    ->orderBy('title')
                    ->limit(100)
                    ->get(['id', 'title', 'type', 'location']),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedData($request);
        $data['status'] = RentalStatus::Active->value;
        $agreement = DB::transaction(function () use ($data): RentalAgreement {
            Client::query()->whereKey($data['client_id'])->lockForUpdate()->firstOrFail();

            if ($this->hasConflictingAgreement($data)) {
                throw ValidationException::withMessages([
                    'property_id' => ['A rental agreement already exists for this client and property.'],
                ]);
            }

            $rentalProperty = RentalProperty::query()->create([
                'property_id' => $data['property_id'] ?? null,
                'name' => $data['property_name'] ?? null,
                'location' => $data['property_location'] ?? null,
                'description' => $data['property_description'] ?? null,
            ]);

            $agreement = $rentalProperty->agreements()->create($this->agreementData($data) + [
                'client_id' => $data['client_id'],
            ]);
            $this->paymentScheduleService->ensurePeriods($agreement);

            return $agreement;
        });

        return response()->json([
            'message' => 'Rental agreement created successfully.',
            'data' => [
                'rental' => new RentalAgreementResource($agreement->load(['rentalProperty.property', 'client'])),
            ],
        ], 201);
    }

    public function show(RentalAgreement $rental): JsonResponse
    {
        return response()->json([
            'data' => [
                'rental' => new RentalAgreementResource($rental->load(['rentalProperty.property', 'client'])),
            ],
        ]);
    }

    public function update(Request $request, RentalAgreement $rental): JsonResponse
    {
        $data = $this->validatedData($request, $rental);

        $termsChanged = (float) $rental->rental_amount !== (float) $data['rental_amount']
            || $rental->rental_frequency->value !== $data['rental_frequency']
            || $rental->lease_start_date->toDateString() !== $data['lease_start_date']
            || $rental->lease_end_date->toDateString() !== $data['lease_end_date'];

        if ($termsChanged && $rental->paymentPeriods()->whereHas('payments')->exists()) {
            throw ValidationException::withMessages([
                'rental_amount' => ['Lease terms cannot be changed after rental payments have been recorded.'],
            ]);
        }

        DB::transaction(function () use ($data, $rental, $termsChanged): void {
            Client::query()->whereKey($data['client_id'])->lockForUpdate()->firstOrFail();

            if ($this->hasConflictingAgreement($data, $rental->id)) {
                throw ValidationException::withMessages([
                    'property_id' => ['A rental agreement already exists for this client and property.'],
                ]);
            }

            if ($termsChanged) {
                $rental->paymentPeriods()->delete();
            }
            $rental->rentalProperty->update([
                'property_id' => $data['property_id'] ?? null,
                'name' => $data['property_name'] ?? null,
                'location' => $data['property_location'] ?? null,
                'description' => $data['property_description'] ?? null,
            ]);

            $rental->update($this->agreementData($data) + [
                'client_id' => $data['client_id'],
            ]);
            $this->paymentScheduleService->ensurePeriods($rental->fresh());
        });

        return response()->json([
            'message' => 'Rental agreement updated successfully.',
            'data' => [
                'rental' => new RentalAgreementResource($rental->fresh()->load(['rentalProperty.property', 'client'])),
            ],
        ]);
    }

    public function destroy(RentalAgreement $rental): JsonResponse
    {
        DB::transaction(function () use ($rental): void {
            $rentalProperty = $rental->rentalProperty;
            $rental->delete();

            if (! $rentalProperty->agreements()->exists()) {
                $rentalProperty->delete();
            }
        });

        return response()->json([
            'message' => 'Rental agreement deleted successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request, ?RentalAgreement $rental = null): array
    {
        $tenantId = app(TenantManager::class)->currentId();
        $tenantConstraint = static fn ($query) => $tenantId === null
            ? $query
            : $query->where('tenant_id', $tenantId);

        $data = $request->validate([
            'property_id' => [
                'nullable',
                'integer',
                Rule::exists('properties', 'id')->where($tenantConstraint)->whereNull('deleted_at'),
            ],
            'property_name' => ['nullable', 'string', 'max:255', 'required_without:property_id'],
            'property_location' => ['nullable', 'string', 'max:255', 'required_without:property_id'],
            'property_description' => ['nullable', 'string'],
            'client_id' => [
                'required',
                'integer',
                Rule::exists('clients', 'id')->where($tenantConstraint)->whereNull('deleted_at'),
            ],
            'rental_amount' => ['required', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'rental_frequency' => [
                'required',
                Rule::in(array_values(array_unique([
                    ...RentalFrequency::availableValues(),
                    ...($rental ? [$rental->rental_frequency->value] : []),
                ]))),
            ],
            'lease_start_date' => ['required', 'date'],
            'lease_end_date' => ['required', 'date', 'after_or_equal:lease_start_date'],
            'status' => $rental
                ? ['required', Rule::in(RentalStatus::manageableValues())]
                : ['sometimes', Rule::in(RentalStatus::manageableValues())],
            'notes' => ['nullable', 'string'],
        ]);

        if (empty($data['property_id']) && (empty($data['property_name']) || empty($data['property_location']))) {
            throw ValidationException::withMessages([
                'property_name' => ['Enter a property name and location or select an existing property.'],
                'property_location' => ['Enter a property name and location or select an existing property.'],
            ]);
        }

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function agreementData(array $data): array
    {
        return [
            'rental_amount' => $data['rental_amount'],
            'rental_frequency' => $data['rental_frequency'],
            'lease_start_date' => $data['lease_start_date'],
            'lease_end_date' => $data['lease_end_date'],
            'status' => $data['status'],
            'notes' => $data['notes'] ?? null,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function hasConflictingAgreement(array $data, ?int $exceptId = null): bool
    {
        return RentalAgreement::query()
            ->where('client_id', $data['client_id'])
            // Pending agreements generate rent periods too, so checking only active
            // agreements allowed a repeated create request to bill the same tenancy twice.
            ->whereNotIn('status', [RentalStatus::Terminated->value])
            ->whereDate('lease_start_date', '<=', $data['lease_end_date'])
            ->whereDate('lease_end_date', '>=', $data['lease_start_date'])
            ->when($exceptId, fn ($query) => $query->where('id', '!=', $exceptId))
            ->whereHas('rentalProperty', function ($query) use ($data): void {
                if (! empty($data['property_id'])) {
                    $query->where('property_id', $data['property_id']);

                    return;
                }

                $query->whereNull('property_id')
                    ->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower(trim($data['property_name']))])
                    ->whereRaw('LOWER(TRIM(location)) = ?', [mb_strtolower(trim($data['property_location']))]);
            })
            ->exists();
    }
}
