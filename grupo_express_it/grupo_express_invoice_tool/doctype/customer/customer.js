frappe.ui.form.on('Customer', {
	setup(frm) {
		frm.page.sidebar.toggle(false); // Hide Sidebar to better focus on the doc
	},

	onload(frm) {
		frm.set_query('item', 'pricing_rules', (doc) => {
			return {
				filters: {
					item_name: ['not in', doc.pricing_rules.map(p => p.item)], // Only shows no added items
					type: ['not in', ['Complemento']]
				}
			};
		});
	},

	refresh(frm) {
		frm.set_currency_labels(['valuation_rate'], 'USD', 'pricing_rules');
	}
});

// Child Table
frappe.ui.form.on('Pricing Rule', {
	//TODO: Dynamically change the description based on type of margin
});
