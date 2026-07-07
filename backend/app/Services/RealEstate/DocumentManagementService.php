<?php

namespace App\Services\RealEstate;

use App\Models\Allocation;
use App\Models\AllocationDocument;
use App\Models\CompanySetting;
use App\Models\DocumentTemplate;
use App\Models\GeneratedDocument;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class DocumentManagementService
{
    public const DEFAULT_TEMPLATES = [
        ['name' => 'Offer Letter', 'slug' => 'offer-letter', 'view_path' => 'documents.templates.offer'],
        ['name' => 'Agreement Letter', 'slug' => 'agreement-letter', 'view_path' => 'documents.templates.agreement'],
        ['name' => 'Processing Letter', 'slug' => 'processing-letter', 'view_path' => 'documents.templates.processing'],
        ['name' => 'Work Initialized Letter', 'slug' => 'work-initialized-letter', 'view_path' => 'documents.templates.work-initialized'],
    ];

    /**
     * @return Collection<int, DocumentTemplate>
     */
    public function activeTemplates(): Collection
    {
        $this->seedDefaultTemplatesIfMissing();

        return DocumentTemplate::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->get();
    }

    public function seedDefaultTemplatesIfMissing(): void
    {
        if (DocumentTemplate::withTrashed()->exists()) {
            return;
        }

        foreach (self::DEFAULT_TEMPLATES as $template) {
            DocumentTemplate::query()->create([
                ...$template,
                'is_active' => true,
            ]);
        }
    }

    public function setEnabled(Allocation $allocation, DocumentTemplate $template, bool $enabled, ?User $user): AllocationDocument
    {
        return AllocationDocument::query()->updateOrCreate(
            [
                'allocation_id' => $allocation->id,
                'document_template_id' => $template->id,
            ],
            [
                'enabled' => $enabled,
                'enabled_by' => $user?->id,
            ]
        );
    }

    public function isEnabled(Allocation $allocation, DocumentTemplate $template): bool
    {
        return AllocationDocument::query()
            ->where('allocation_id', $allocation->id)
            ->where('document_template_id', $template->id)
            ->where('enabled', true)
            ->exists();
    }

    public function latestGenerated(Allocation $allocation, DocumentTemplate $template): ?GeneratedDocument
    {
        return GeneratedDocument::query()
            ->where('allocation_id', $allocation->id)
            ->where('document_template_id', $template->id)
            ->latest('generated_at')
            ->latest('id')
            ->first();
    }

    public function generate(Allocation $allocation, DocumentTemplate $template, ?User $user): GeneratedDocument
    {
        $allocation->loadMissing(['client.realtor', 'realtor', 'property', 'payments.receipt']);

        $data = $this->data($allocation, $template, $user);
        $html = view($template->view_path, ['data' => $data])->render();

        return GeneratedDocument::query()->create([
            'allocation_id' => $allocation->id,
            'customer_id' => $allocation->client_id,
            'document_template_id' => $template->id,
            'document_type' => $template->slug,
            'document_name' => $template->name,
            'generated_by' => $user?->id,
            'generated_at' => now(),
            'file_name' => $this->fileName($template, $allocation),
            'data_snapshot' => $data,
            'content_html' => $html,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function data(Allocation $allocation, DocumentTemplate $template, ?User $user): array
    {
        $company = CompanySetting::query()->first();
        $client = $allocation->client;
        $property = $allocation->property;
        $latestPayment = $allocation->payments->sortByDesc('paid_at')->first();

        return [
            'document_title' => $template->name,
            'customer_name' => $client?->full_name,
            'phone' => $client?->phone,
            'email' => $client?->email,
            'address' => $client?->address,
            'allocation_number' => sprintf('ALLOC-%06d', $allocation->id),
            'plot_number' => $property?->plot_number ?? $property?->id,
            'estate' => $property?->location,
            'property_name' => $property?->title,
            'property_location' => $property?->location,
            'allocation_date' => $allocation->allocated_at?->format('M d, Y'),
            'payment_amount' => number_format((float) ($latestPayment?->amount ?? $allocation->amount_paid), 2),
            'amount_paid' => number_format((float) $allocation->amount_paid, 2),
            'balance' => number_format((float) $allocation->balance, 2),
            'payment_duration' => $allocation->paymentDurationLabel(),
            'next_payment_due' => $this->nextDueDate($allocation)?->format('M d, Y'),
            'company_name' => $company?->company_name ?: 'Terra Ops',
            'company_email' => $company?->company_email,
            'company_phone' => $company?->company_phone,
            'company_address' => $company?->company_address,
            'today_date' => now()->format('M d, Y'),
            'generated_by' => $user?->name,
        ];
    }

    public function nextDueDate(Allocation $allocation): ?Carbon
    {
        $interval = $allocation->paymentDurationInterval();

        if (($interval['value'] ?? 0) <= 0 || ! $allocation->allocated_at) {
            return null;
        }

        return match ($interval['unit']) {
            'days' => $allocation->allocated_at->copy()->addDays($interval['value']),
            'weeks' => $allocation->allocated_at->copy()->addWeeks($interval['value']),
            'months' => $allocation->allocated_at->copy()->addMonths($interval['value']),
            'years' => $allocation->allocated_at->copy()->addYears($interval['value']),
            default => null,
        };
    }

    public function fileName(DocumentTemplate $template, Allocation $allocation, string $extension = 'pdf'): string
    {
        $name = Str::of($template->name.' '.$allocation->client?->full_name)
            ->replaceMatches('/[^A-Za-z0-9]+/', '_')
            ->trim('_');

        return $name.'.'.$extension;
    }
}
