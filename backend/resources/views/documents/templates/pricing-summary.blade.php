<div class="section">
    <h2>Allocation Pricing</h2>
    <div class="meta-grid">
        <div class="meta-row"><div class="meta-label">Original Property Price</div><div class="meta-value">{{ $data['original_price'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Promotional Discount</div><div class="meta-value">{{ ($data['discount_type'] ?? null) === 'percentage' ? $data['discount_value'].'%' : (($data['discount_type'] ?? null) === 'fixed' ? 'Fixed amount' : 'None') }}</div></div>
        <div class="meta-row"><div class="meta-label">Discount Amount</div><div class="meta-value">{{ $data['discount_amount'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Final Payable Amount</div><div class="meta-value">{{ $data['final_payable_amount'] }}</div></div>
    </div>
</div>
