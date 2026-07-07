<?php

namespace Tests\Feature;

use App\Models\Allocation;
use App\Models\Client;
use App\Models\DocumentTemplate;
use App\Models\GeneratedDocument;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DocumentManagementApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_enable_generate_regenerate_and_view_document_history(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $template = DocumentTemplate::query()->create([
            'name' => 'Offer Letter',
            'slug' => 'offer-letter',
            'view_path' => 'documents.templates.offer',
            'is_active' => true,
        ]);

        $client = Client::factory()->create([
            'first_name' => 'Ada',
            'last_name' => 'Okafor',
            'email' => 'ada@example.com',
        ]);
        $property = Property::factory()->create([
            'title' => 'Lekki Garden Plot',
            'location' => 'Lekki',
        ]);
        $allocation = Allocation::factory()->create([
            'client_id' => $client->id,
            'property_id' => $property->id,
            'payment_duration' => '3_months',
            'amount_paid' => 2500000,
            'balance' => 7500000,
        ]);

        $this->postJson("/api/v1/allocations/{$allocation->id}/documents/{$template->id}/generate")
            ->assertForbidden();

        $this->patchJson("/api/v1/allocations/{$allocation->id}/documents", [
            'documents' => [
                $template->id => true,
            ],
        ])->assertOk()
            ->assertJsonPath('data.templates.0.enabled', true);

        $this->postJson("/api/v1/allocations/{$allocation->id}/documents/{$template->id}/generate")
            ->assertCreated()
            ->assertJsonPath('data.document.document_name', 'Offer Letter')
            ->assertJsonPath('data.document.document_type', 'offer-letter');

        $firstDocument = GeneratedDocument::query()->firstOrFail();
        $this->assertStringContainsString('Ada Okafor', $firstDocument->content_html);
        $this->assertStringContainsString('Lekki Garden Plot', $firstDocument->content_html);
        $this->assertSame('3 Months', $firstDocument->data_snapshot['payment_duration']);

        $allocation->forceFill([
            'amount_paid' => 5000000,
            'balance' => 5000000,
            'payment_duration' => '6_months',
        ])->save();

        $this->postJson("/api/v1/allocations/{$allocation->id}/documents/{$template->id}/generate")
            ->assertCreated();

        $this->assertDatabaseCount('generated_documents', 2);
        $this->assertSame('3 Months', $firstDocument->fresh()->data_snapshot['payment_duration']);

        $this->getJson("/api/v1/allocations/{$allocation->id}/documents")
            ->assertOk()
            ->assertJsonCount(2, 'data.templates.0.history')
            ->assertJsonPath('data.templates.0.history.0.document_name', 'Offer Letter');

        $this->get("/api/v1/allocations/{$allocation->id}/documents/{$template->id}/view")
            ->assertOk()
            ->assertSee('Offer Letter', false)
            ->assertSee('Ada Okafor', false)
            ->assertSee('6 Months', false);

        $this->get("/api/v1/allocations/{$allocation->id}/documents/{$template->id}/download")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->deleteJson("/api/v1/document-templates/{$template->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Template deleted successfully.');

        $this->assertSoftDeleted('document_templates', ['id' => $template->id]);
        $this->assertDatabaseCount('generated_documents', 2);
        $this->assertSame('Offer Letter', GeneratedDocument::query()->firstOrFail()->template?->name);
    }

    public function test_admin_can_manage_templates_and_list_documents_with_search_pagination(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $template = DocumentTemplate::query()->create([
            'name' => 'Offer Letter',
            'slug' => 'offer-letter',
            'view_path' => 'documents.templates.offer',
            'is_active' => true,
        ]);

        $adaClient = Client::factory()->create(['first_name' => 'Ada', 'last_name' => 'Okafor']);
        $bolaClient = Client::factory()->create(['first_name' => 'Bola', 'last_name' => 'Akin']);
        $adaProperty = Property::factory()->create(['title' => 'Lekki Garden Plot']);
        $bolaProperty = Property::factory()->create(['title' => 'Victoria Island Estate']);

        Allocation::factory()->create(['client_id' => $adaClient->id, 'property_id' => $adaProperty->id]);
        Allocation::factory()->create(['client_id' => $bolaClient->id, 'property_id' => $bolaProperty->id]);

        $this->getJson('/api/v1/document-templates')
            ->assertOk()
            ->assertJsonStructure(['data' => ['templates', 'meta']]);

        $this->postJson('/api/v1/document-templates', [
            'name' => 'Custom Letter',
            'slug' => 'custom-letter',
            'view_path' => 'documents.templates.offer',
            'description' => 'Custom test template',
            'is_active' => true,
        ])->assertCreated()
            ->assertJsonPath('data.template.name', 'Custom Letter')
            ->assertJsonPath('data.template.view_path', 'documents.templates.offer');

        $this->postJson('/api/v1/document-templates', [
            'name' => 'Broken Letter',
            'slug' => 'broken-letter',
            'view_path' => 'documents.templates.missing',
            'is_active' => true,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['view_path']);

        $this->patchJson("/api/v1/document-templates/{$template->id}", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.template.is_active', false);

        $this->getJson('/api/v1/documents?search=Ada&per_page=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonCount(1, 'data.documents');
    }

    public function test_documents_index_seed_default_templates_when_none_exist(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        DocumentTemplate::query()->delete();

        $this->getJson('/api/v1/documents?per_page=5')
            ->assertOk()
            ->assertJsonPath('data.templates.0.name', 'Offer Letter')
            ->assertJsonPath('data.templates.0.slug', 'offer-letter');
    }

    public function test_documents_index_uses_lightweight_queries_for_list_payload(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $template = DocumentTemplate::query()->create([
            'name' => 'Offer Letter',
            'slug' => 'offer-letter',
            'view_path' => 'documents.templates.offer',
            'is_active' => true,
        ]);

        $client = Client::factory()->create(['first_name' => 'Ada', 'last_name' => 'Okafor']);
        $property = Property::factory()->create(['title' => 'Lekki Garden Plot', 'location' => 'Lekki']);
        $allocation = Allocation::factory()->create([
            'client_id' => $client->id,
            'property_id' => $property->id,
        ]);

        GeneratedDocument::query()->create([
            'allocation_id' => $allocation->id,
            'customer_id' => $client->id,
            'document_template_id' => $template->id,
            'document_type' => $template->slug,
            'document_name' => $template->name,
            'generated_by' => $admin->id,
            'generated_at' => now(),
            'file_name' => 'offer.pdf',
            'data_snapshot' => ['customer_name' => 'Ada Okafor'],
            'content_html' => str_repeat('<p>Heavy document HTML</p>', 100),
        ]);

        $queries = [];
        DB::listen(function ($query) use (&$queries): void {
            $queries[] = strtolower($query->sql);
        });

        $this->getJson("/api/v1/documents?per_page=15&template_id={$template->id}&search=Ada")
            ->assertOk()
            ->assertJsonCount(1, 'data.documents')
            ->assertJsonCount(1, 'data.documents.0.templates')
            ->assertJsonMissing(['content_html' => str_repeat('<p>Heavy document HTML</p>', 100)]);

        $sql = implode(' ', $queries);

        $this->assertStringNotContainsString('plot_number', $sql);
        $this->assertStringNotContainsString('content_html', $sql);
        $this->assertStringNotContainsString('data_snapshot', $sql);
    }

    public function test_non_admin_cannot_manage_documents(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));

        $template = DocumentTemplate::query()->create([
            'name' => 'Agreement Letter',
            'slug' => 'agreement-letter',
            'view_path' => 'documents.templates.agreement',
            'is_active' => true,
        ]);
        $allocation = Allocation::factory()->create();

        $this->getJson('/api/v1/documents')->assertForbidden();
        $this->patchJson("/api/v1/allocations/{$allocation->id}/documents", [
            'documents' => [$template->id => true],
        ])->assertForbidden();
        $this->postJson("/api/v1/allocations/{$allocation->id}/documents/{$template->id}/generate")
            ->assertForbidden();
    }

    public function test_client_only_sees_enabled_generated_documents_for_their_allocations(): void
    {
        $template = DocumentTemplate::query()->create([
            'name' => 'Processing Letter',
            'slug' => 'processing-letter',
            'view_path' => 'documents.templates.processing',
            'is_active' => true,
        ]);

        $client = Client::factory()->create();
        $otherClient = Client::factory()->create();
        $allocation = Allocation::factory()->create(['client_id' => $client->id]);
        $otherAllocation = Allocation::factory()->create(['client_id' => $otherClient->id]);
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/allocations/{$allocation->id}/documents", [
            'documents' => [$template->id => true],
        ])->assertOk();
        $this->postJson("/api/v1/allocations/{$allocation->id}/documents/{$template->id}/generate")
            ->assertCreated();

        $this->patchJson("/api/v1/allocations/{$otherAllocation->id}/documents", [
            'documents' => [$template->id => true],
        ])->assertOk();
        $this->postJson("/api/v1/allocations/{$otherAllocation->id}/documents/{$template->id}/generate")
            ->assertCreated();

        Sanctum::actingAs($client);

        $this->getJson('/api/v1/client/documents')
            ->assertOk()
            ->assertJsonCount(1, 'documents')
            ->assertJsonPath('documents.0.allocation.id', $allocation->id)
            ->assertJsonCount(1, 'documents.0.documents');

        $this->get("/api/v1/client/documents/allocations/{$allocation->id}/templates/{$template->id}/view")
            ->assertOk()
            ->assertSee('Processing Letter', false);

        $this->get("/api/v1/client/documents/allocations/{$otherAllocation->id}/templates/{$template->id}/view")
            ->assertForbidden();
    }
}
