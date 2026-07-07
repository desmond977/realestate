<?php

namespace App\Http\Controllers\Api\V1\Client;

use App\Http\Controllers\Controller;
use App\Http\Resources\AllocationResource;
use App\Http\Resources\DocumentTemplateResource;
use App\Http\Resources\GeneratedDocumentResource;
use App\Models\Allocation;
use App\Models\DocumentTemplate;
use App\Services\RealEstate\DocumentManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DocumentController extends Controller
{
    public function __construct(private readonly DocumentManagementService $documents)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $client = $request->user();
        $allocations = $client->allocations()
            ->with(['property', 'documentSettings.template', 'generatedDocuments.template'])
            ->latest()
            ->get();

        return response()->json([
            'documents' => $allocations->map(fn (Allocation $allocation) => [
                'allocation' => new AllocationResource($allocation),
                'documents' => $allocation->documentSettings
                    ->filter(fn ($setting) => $setting->enabled && $setting->template?->is_active)
                    ->map(function ($setting) use ($allocation) {
                        $latest = $allocation->generatedDocuments
                            ->where('document_template_id', $setting->document_template_id)
                            ->sortByDesc('generated_at')
                            ->first();

                        return [
                            'template' => new DocumentTemplateResource($setting->template),
                            'latest_document' => $latest ? new GeneratedDocumentResource($latest) : null,
                        ];
                    })
                    ->values(),
            ])->values(),
        ]);
    }

    public function view(Request $request, Allocation $allocation, DocumentTemplate $template): Response
    {
        abort_unless((int) $allocation->client_id === (int) $request->user()->id, 403);
        abort_unless($template->is_active && $this->documents->isEnabled($allocation, $template), 404);

        $document = $this->documents->latestGenerated($allocation, $template);
        abort_unless($document, 404, 'Document has not been generated yet.');

        return response($document->content_html)
            ->header('Content-Type', 'text/html; charset=UTF-8');
    }
}
