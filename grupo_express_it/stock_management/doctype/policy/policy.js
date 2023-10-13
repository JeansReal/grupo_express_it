frappe.ui.form.on('Policy', {

	setup(frm) {
		frm.page.sidebar.toggle(false); // Hide Sidebar to better focus on the doc
	},

	before_load(frm) {},
	refresh(frm) {

		// TODO: DELETE ALL THIS
		frm.set_df_property('company', 'hidden', true);
		frm.set_df_property('section_break_m8ye', 'hidden', true);
		cur_frm.fields_dict['section_break_tcxra'].head.prepend('' +
			'<button class="btn btn-default btn-danger" onclick="location.reload();">Recalcular</button>');
	},
	onload_post_render(frm) {},

	exchange_rate: (frm) => frm.events.calculate_items_totals(frm), // Recalculate on Exchange Rate

	calculate_items_totals(frm, cdt = null, cdn = null) {

		if (cdt === 'Policy Item' && cdn) {
			let row = locals[cdt][cdn];
			row.fob_total_price = row.qty * row.fob_unit_price; // Calculate Row FOB

			frm.doc.total_qty = frm.get_sum('items', 'qty');              // Calculate Total QTY
			frm.doc.total_fob = frm.get_sum('items', 'fob_total_price');  // Calculate Total FOB
			console.log('Event comes from: ' + cdt);
		}

		if (!frm.doc.total_freight || !frm.doc.total_insurance) {
			return;
		}

		(frm.doc.items || []).forEach((row) => {
			console.log(frm.doc.total_freight);
			console.log(frm.doc.total_fob);
			console.log(row.total_price);

			row.freight_cost = frm.doc.total_freight / frm.doc.total_fob * row.fob_total_price; // Calculate Freight
			row.insurance_cost = frm.doc.total_insurance / frm.doc.total_fob * row.fob_total_price; // Calculate Insurance
			row.cif_total_usd = row.fob_total_price + row.freight_cost + row.insurance_cost; // Calculate CIF

			row.cif_total_nio = row.cif_total_usd * frm.doc.exchange_rate; // Calculate CIF in NIO
			row.total_price = row.cif_total_nio + row.customs_taxes + row.nationalization_total;
			row.unit_price = row.total_price / row.qty; // Calculate CIF in NIO
		});

		frm.refresh_fields(['items', 'total_fob']);
	},

});

frappe.ui.form.on("Policy Item", {
	items_remove: (frm) => frm.events.calculate_items_totals(frm),
	qty: (frm, cdt, cdn) => frm.events.calculate_items_totals(frm, cdt, cdn),
	fob_unit_price: (frm, cdt, cdn) => frm.events.calculate_items_totals(frm, cdt, cdn)
});

function calculate_cif_costs(frm, cdt, cdn) {

}

frappe.ui.form.on('Policy CIF Cost', {
	cif_costs_remove(frm) {
		frm.doc.total_freight = frm.doc.total_insurance = 0; // Reset this to count




	},
	type(frm, cdt, cdn) {


		(frm.doc.cif_costs || []).forEach((row) => {
			(row.type === 'Flete') ? frm.doc.total_freight += row.amount_usd : frm.doc.total_insurance += row.amount_usd;
		});

		frm.refresh_fields(['total_freight', 'total_insurance']);

		frm.events.calculate_items_totals(frm, cdt, cdn);
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
		frm.doc.total_customs_taxes = frm.doc.total_nationalization_costs = 0;

		(frm.doc.nationalization_costs || []).forEach(row => {
			(row.type === 'Impuestos Aduaneros') ? frm.doc.total_customs_taxes += row.amount_nio : frm.doc.total_nationalization_costs += row.amount_nio;
		});

		frm.refresh_fields(['total_customs_taxes', 'total_nationalization_costs']);
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
// 104 . Not working properly for all fields
