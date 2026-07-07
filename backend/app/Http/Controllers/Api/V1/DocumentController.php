<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AllocationResource;
use App\Http\Resources\DocumentTemplateResource;
use App\Http\Resources\GeneratedDocumentResource;
use App\Models\Allocation;
use App\Models\DocumentTemplate;
use App\Services\RealEstate\DocumentManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

class DocumentController extends Controller
{
    public function __construct(private readonly DocumentManagementService $documents)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'template_id' => ['sometimes', 'nullable', 'integer', 'exists:document_templates,id'],
        ]);

        $templates = $this->documents->activeTemplates();
        $payloadTemplates = ! empty($validated['template_id'])
            ? $templates->where('id', (int) $validated['template_id'])->values()
            : $templates;

        $query = Allocation::query()
            ->select([
                'id',
                'property_id',
                'client_id',
                'realtor_id',
                'total_amount',
                'amount_paid',
                'balance',
                'payment_plan',
                'payment_duration',
                'custom_duration_value',
                'custom_duration_unit',
                'status',
                'allocated_at',
                'notes',
                'created_at',
                'updated_at',
            ])
            ->with([
                'client:id,first_name,last_name,email,phone,realtor_id',
                'client.realtor:id,full_name,phone,email,company_name,status',
                'realtor:id,full_name,phone,email,company_name,status',
                'property:id,title,location,status,price,property_count,available_count,reserved_count,sold_count',
                'documentSettings:id,allocation_id,document_template_id,enabled',
                'generatedDocuments' => fn ($generatedDocuments) => $generatedDocuments
                    ->select([
                        'id',
                        'allocation_id',
                        'customer_id',
                        'document_template_id',
                        'document_type',
                        'document_name',
                        'generated_by',
                        'generated_at',
                        'file_name',
                        'created_at',
                        'updated_at',
                    ])
                    ->latest('generated_at')
                    ->latest('id'),
            ]);

        if (! empty($validated['search'])) {
            $search = trim($validated['search']);

            $query->where(function ($allocationQuery) use ($search): void {
                if (ctype_digit($search)) {
                    $allocationQuery->where('id', (int) $search)
                        ->orWhereHas('property', fn ($propertyQuery) => $propertyQuery->where('id', (int) $search));
                }

                $allocationQuery
                    ->orWhereHas('client', function ($clientQuery) use ($search): void {
                    $clientQuery->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                })
                    ->orWhereHas('property', function ($propertyQuery) use ($search): void {
                        $propertyQuery->where('title', 'like', "%{$search}%")
                            ->orWhere('location', 'like', "%{$search}%");
                    });
            });
        }

        $allocations = $query->latest('id')->paginate($validated['per_page'] ?? 15);

        return response()->json([
            'data' => [
                'templates' => DocumentTemplateResource::collection($templates),
                'allocations' => AllocationResource::collection($allocations->getCollection()),
                'documents' => $allocations->getCollection()->map(fn (Allocation $allocation) => $this->allocationPayload($allocation, $payloadTemplates))->values(),
            ],
            'meta' => [
                'current_page' => $allocations->currentPage(),
                'last_page' => $allocations->lastPage(),
                'per_page' => $allocations->perPage(),
                'total' => $allocations->total(),
            ],
        ]);
    }

    public function templatesIndex(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $this->documents->seedDefaultTemplatesIfMissing();

        $templates = DocumentTemplate::query()->latest()->paginate($validated['per_page'] ?? 15);

        return response()->json([
            'data' => [
                'templates' => DocumentTemplateResource::collection($templates->getCollection()),
                'meta' => [
                    'current_page' => $templates->currentPage(),
                    'last_page' => $templates->lastPage(),
                    'per_page' => $templates->perPage(),
                    'total' => $templates->total(),
                ],
            ],
        ]);
    }

    public function storeTemplate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:document_templates,slug'],
            'view_path' => ['required', 'string', 'max:255', $this->viewPathExistsRule()],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $template = DocumentTemplate::query()->create($validated);

        return response()->json([
            'message' => 'Template created successfully.',
            'data' => [
                'template' => new DocumentTemplateResource($template),
            ],
        ], 201);
    }

    public function updateTemplate(Request $request, DocumentTemplate $template): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', 'unique:document_templates,slug,'.$template->id],
            'view_path' => ['sometimes', 'string', 'max:255', $this->viewPathExistsRule()],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $template->fill($validated);
        $template->save();

        return response()->json([
            'message' => 'Template updated successfully.',
            'data' => [
                'template' => new DocumentTemplateResource($template->fresh()),
            ],
        ]);
    }

    public function destroyTemplate(DocumentTemplate $template): JsonResponse
    {
        $template->delete();

        return response()->json([
            'message' => 'Template deleted successfully.',
        ]);
    }

    public function show(Allocation $allocation): JsonResponse
    {
        $allocation->load([
            'client.realtor',
            'realtor',
            'property',
            'documentSettings:id,allocation_id,document_template_id,enabled',
            'generatedDocuments' => fn ($generatedDocuments) => $generatedDocuments
                ->select([
                    'id',
                    'allocation_id',
                    'customer_id',
                    'document_template_id',
                    'document_type',
                    'document_name',
                    'generated_by',
                    'generated_at',
                    'file_name',
                    'created_at',
                    'updated_at',
                ])
                ->latest('generated_at')
                ->latest('id'),
        ]);

        return response()->json([
            'data' => $this->allocationPayload($allocation, $this->documents->activeTemplates()),
        ]);
    }

    public function update(Request $request, Allocation $allocation): JsonResponse
    {
        $validated = $request->validate([
            'documents' => ['required', 'array'],
            'documents.*' => ['boolean'],
        ]);

        foreach ($validated['documents'] as $templateId => $enabled) {
            $template = DocumentTemplate::query()->where('is_active', true)->findOrFail($templateId);
            $this->documents->setEnabled($allocation, $template, (bool) $enabled, $request->user());
        }

        return $this->show($allocation->fresh());
    }

    public function generate(Request $request, Allocation $allocation, DocumentTemplate $template): JsonResponse
    {
        abort_unless($template->is_active, 404);
        abort_unless($this->documents->isEnabled($allocation, $template), 403, 'Document is not enabled for this allocation.');

        $document = $this->documents->generate($allocation, $template, $request->user());

        return response()->json([
            'message' => 'Document generated successfully.',
            'data' => [
                'document' => new GeneratedDocumentResource($document->load(['template', 'generator'])),
            ],
        ], 201);
    }

    public function view(Request $request, Allocation $allocation, DocumentTemplate $template): Response
    {
        abort_unless($template->is_active, 404);
        abort_unless($this->documents->isEnabled($allocation, $template), 403, 'Document is not enabled for this allocation.');

        $document = $this->documents->latestGenerated($allocation, $template)
            ?: $this->documents->generate($allocation, $template, $request->user());

        return response($document->content_html)
            ->header('Content-Type', 'text/html; charset=UTF-8');
    }

    public function download(Request $request, Allocation $allocation, DocumentTemplate $template): Response
    {
        abort_unless($template->is_active, 404);
        abort_unless($this->documents->isEnabled($allocation, $template), 403, 'Document is not enabled for this allocation.');

        $document = $this->documents->latestGenerated($allocation, $template)
            ?: $this->documents->generate($allocation, $template, $request->user());

        abort_unless(
            class_exists(\Barryvdh\DomPDF\Facade\Pdf::class),
            503,
            'PDF support is not installed. Please install barryvdh/laravel-dompdf.'
        );

        return \Barryvdh\DomPDF\Facade\Pdf::loadHTML($document->content_html)
            ->setPaper('a4')
            ->download($document->file_name);
    }

    private function allocationPayload(Allocation $allocation, $templates): array
    {
        return [
            'allocation' => new AllocationResource($allocation),
            'templates' => $templates->map(function (DocumentTemplate $template) use ($allocation) {
                $setting = $allocation->documentSettings->firstWhere('document_template_id', $template->id);
                $latest = $allocation->generatedDocuments
                    ->where('document_template_id', $template->id)
                    ->sortByDesc('generated_at')
                    ->first();

                return [
                    'template' => new DocumentTemplateResource($template),
                    'enabled' => (bool) $setting?->enabled,
                    'latest_document' => $latest ? new GeneratedDocumentResource($latest) : null,
                    'history' => GeneratedDocumentResource::collection(
                        $allocation->generatedDocuments
                            ->where('document_template_id', $template->id)
                            ->sortByDesc('generated_at')
                            ->values()
                    ),
                ];
            })->values(),
        ];
    }

    private function viewPathExistsRule(): callable
    {
        return function (string $attribute, mixed $value, callable $fail): void {
            if (! View::exists((string) $value)) {
                $fail('The selected '.$attribute.' does not exist.');
            }
        };
    }
}
