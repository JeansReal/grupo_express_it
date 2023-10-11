frappe.ui.form.on('Policy', {

	setup(frm) {
		frm.page.sidebar.toggle(false); // Hide Sidebar to better focus on the doc
	},

	before_load(frm) {},

	onload_post_render(frm) {
		frm.set_currency_labels(['exchange_rate'], 'COR');
	},

	refresh(frm) {},

	calculate_fob(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		row.fob_total_price = row.qty * row.fob_unit_price; // Calculate Row FOB

		frm.events.calculate_freight_insurance_cif(frm, cdt, cdn);
	},

	calculate_freight_insurance_cif(frm) {

		frm.doc.total_fob = frm.get_sum('items', 'fob_total_price');  // Calculate Total FOB

		(frm.doc.items || []).forEach(row => {
			row.freight_cost = frm.doc.total_freight / frm.doc.total_fob * row.fob_total_price; // Calculate Freight
			row.insurance_cost = frm.doc.total_insurance / frm.doc.total_fob * row.fob_total_price; // Calculate Insurance
			row.cif_total_usd = row.fob_total_price + row.freight_cost + row.insurance_cost; // Calculate CIF

			console.log(row)
		});



		frm.refresh_fields(['items', 'total_fob']);
	}

});

frappe.ui.form.on("Policy Item", {
	items_remove(frm, cdt, cdn) {
		frm.events.calculate_freight_insurance_cif(frm)

		console.log(frm.doc.items);
	},
	qty: (frm, cdt, cdn) => {
		frm.doc.total_qty = frm.get_sum('items', 'qty'); // Calculate Total QTY
		frm.events.calculate_fob(frm, cdt, cdn); // Calculate FOBs
	},
	fob_unit_price: (frm, cdt, cdn) => frm.events.calculate_fob(frm, cdt, cdn) // Calculate FOBs
});

frappe.ui.form.on('Policy CIF Cost', {
	type(frm, cdt, cdn) {
		frm.doc.total_freight = frm.doc.total_insurance = 0; // Reset this to count

		(frm.doc.cif_costs || []).forEach(row => {
			(row.type === 'Flete') ? frm.doc.total_freight += row.amount_usd : frm.doc.total_insurance += row.amount_usd;
		});

		frm.refresh_fields(['total_freight', 'total_insurance']);

		frm.events.calculate_freight_insurance_cif(frm, cdt, cdn);
	},
	amount_usd: (frm, cdt, cdn) => {
		frm.doc.total_cif = frm.get_sum('cif_costs', 'amount_usd');
		frm.trigger('type', cdt, cdn);          // Recalculate Totals
		frm.trigger('exchange_rate', cdt, cdn); // Recalculate Amount in NIO
	},
	exchange_rate: (frm, cdt, cdn) => {
		let row = locals[cdt][cdn];
		row.amount_nio = row.amount_usd * row.exchange_rate;

		frm.refresh_field('cif_costs');
	}
});

frappe.ui.form.on('Policy Nationalization Cost', {
	type(frm, cdt, cdn) {
		frm.doc.total_customs_taxes = 0;

		(frm.doc.nationalization_costs || []).forEach(row => {
			(row.type === 'Impuestos Aduaneros') ? frm.doc.total_customs_taxes += row.amount_nio : '';
		});

		frm.refresh_fields(['total_customs_taxes']);
	},
	amount_usd: (frm, cdt, cdn) => {
		frm.trigger('exchange_rate', cdt, cdn); // Recalculate Amount in NIO
	},
	exchange_rate: (frm, cdt, cdn) => {
		let row = locals[cdt][cdn];
		row.amount_nio = row.amount_usd * row.exchange_rate;

		frm.trigger('type', cdt, cdn);          // Recalculate Totals
		frm.refresh_field('nationalization_costs');
	}
}); // 172 | 174 | 135 | 142 -> 139 -> 151
