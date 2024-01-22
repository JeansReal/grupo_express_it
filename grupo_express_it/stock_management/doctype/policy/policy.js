frappe.ui.form.on('Policy', {

	setup(frm) {
		frm.page.sidebar.toggle(false);
	},

	before_load(frm) {
		if (frm.is_new()) {  // Adding default Rows
			frm.add_child('cif_costs', {type: 'Flete'});
			frm.add_child('cif_costs', {type: 'Seguro'});
			frm.add_child('nationalization_costs', {type: 'Impuestos Aduaneros'});
			frm.add_child('nationalization_costs', {type: 'Nacionalizacion'});
		}
	},

	validate(frm) {
		frm.doc.items.forEach((row) => {
			if (row.unit_price === 0) { // Unit Price is like compare against 'qty' or 'fob_unit_price'
				frappe.throw({message: `<b>Producto</b> en la fila <b>#${row.idx}</b>: Tiene valores en 0.`, title: __('Missing Values Required')});
			}
		});
		if (frm.doc.total_cif <= 0 || frm.doc.grand_total_nationalization <= 0) {
			frappe.throw({message: `<b>Costos CIF</b> o <b>Costos de Nacionalizacion</b>: Tiene valores en 0.`, title: __('Missing Values Required')});
		}
	},

	// Sanitize Fields
	policy: (frm) => {
		frm.doc.policy = frm.doc.policy.trim().replace(/^.*?(\d+).*$/, 'L - $1'); // L - #####
		frm.refresh_field('policy');
	},
	invoice: (frm) => frm.events.sanitize_string_field(frm.doc,'invoice'),
	provider: (frm) => frm.events.sanitize_string_field(frm.doc,'provider'),

	exchange_rate: (frm) => {
		(frm.doc.cif_costs).forEach((row) => {
			row.exchange_rate = frm.doc.exchange_rate;           // Update Exchange Rate in CIF Costs rows
			row.amount_nio = row.amount_usd * row.exchange_rate; // Recalculate Amount in NIO
		});

		frm.events.calculate_items_totals(frm);  // Recalculate on Exchange Rate Change
		frm.refresh_field('cif_costs');               // Refresh Amount in NIO in CIF Table
	},

	// START Custom Functions
	sanitize_string_field(doc, field, child = false) {
		doc[field] = doc[field].trim().replace(/\s+/g, ' '); // Remove Extra Spaces
		if (!child) cur_frm.refresh_field(field);                                  // If not Child refresh field(doc)
	},

	calculate_items_totals(frm, item_row = null) {
		if (item_row) {
			item_row.qty = flt(item_row.qty); // FIXES: the issue with Paste event -> Sanitize Fields. Invalid returns 0
			item_row.fob_unit_price = flt(item_row.fob_unit_price);

			item_row.fob_total_price = item_row.qty * item_row.fob_unit_price; // Calculate Item Row Total FOB Price

			frm.doc.total_qty = frm.get_sum('items', 'qty');              // Calculate Total QTY
			frm.doc.total_fob = frm.get_sum('items', 'fob_total_price');  // Calculate Total FOB

			refresh_many(['total_qty', 'total_fob']); // Refresh Total Fields -> cur_frm.refresh_field on a loop
		}

		if (frm.doc.items.length > 0) {
			// Pre-calculate factors to be used in row calculations. If any of the divisors is zero, the factor is zero
			const freightFactor = frm.doc.total_freight / frm.doc.total_fob || 0;
			const insuranceFactor = frm.doc.total_insurance / frm.doc.total_fob || 0;
			const customsTaxesFactor = frm.doc.total_customs_taxes / (frm.doc.total_fob + frm.doc.total_cif) || 0;
			const nationalizationFactor = frm.doc.total_nationalization_costs / (frm.doc.total_fob + frm.doc.total_cif) || 0;

			(frm.doc.items).forEach((row) => {
				row.freight_cost = freightFactor * row.fob_total_price;     // Calculate Freight
				row.insurance_cost = insuranceFactor * row.fob_total_price; // Calculate Insurance

				row.cif_total_usd = row.fob_total_price + row.freight_cost + row.insurance_cost; // Calculate CIF
				row.cif_total_nio = row.cif_total_usd * (frm.doc.exchange_rate || 0.00);         // Calculate CIF in NIO

				row.customs_taxes = customsTaxesFactor * row.cif_total_usd;                 // Calculate Customs Taxes
				row.nationalization_total = nationalizationFactor * row.cif_total_usd;      // Calculate Nationalization

				row.total_price = row.cif_total_nio + row.customs_taxes + row.nationalization_total; // Calculate Total Price
				row.unit_price = row.total_price / row.qty || 0.00;									 // Calculate Unit Price
			});

			frm.doc.total_cost = frm.get_sum('items', 'total_price') || 0.00; // Calculate Total Cost
		} else {
			frm.doc.total_cost = 0.00; // Reset Total Cost
		}

		refresh_many(['items', 'total_cost']); // Always Refresh. Even when its empty. So we can clear the footer. See grid_make_footer()
	},

	calculate_table_totals(frm, table, table_field, frm_total_field, child_type_to_frm_mapping) {
		// First Calculate Totals by Type. This creates a Object with frm.doc properties. // TODO: No fallback to avoid errors
		let results = (frm.doc[table] || []).reduce((acc, row) => {
			acc[frm_total_field] += row[table_field] || 0; // Total is the sum of the table fields. Avoid extra loop: frm.get_sum('cif_costs', 'amount_usd');
			acc[child_type_to_frm_mapping[row.type]] = (acc[child_type_to_frm_mapping[row.type]] || 0) + (row[table_field] || 0);
			return acc;
		}, {[frm_total_field]: 0});

		Object.assign(frm.doc, results); // Assign the results to the form doc(frm_total_field + child_type_to_frm_mapping)

		frm.events.calculate_items_totals(frm);  // We Must Recalculate Items Totals
		refresh_many([table, frm_total_field, ...Object.values(child_type_to_frm_mapping)]); // Finally Refresh all
	},

	calculate_cif_costs(frm, item_row = null) {
		if (item_row) {
			item_row.amount_usd = flt(item_row.amount_usd);                  // FIXES: the issue with Paste event -> Sanitize Fields. Invalid returns 0
			item_row.amount_nio = item_row.amount_usd * item_row.exchange_rate; // Recalculate Amount in NIO. Has no effect on Totals
		}
		frm.events.calculate_table_totals(frm, 'cif_costs', 'amount_usd', 'total_cif', {'Flete': 'total_freight', 'Seguro': 'total_insurance'});
	},

	calculate_nationalization_costs(frm, item_row = null) {
		if (item_row) {
			item_row.amount_usd = flt(item_row.amount_usd);  // FIXES: the issue with Paste event -> Sanitize Fields. Invalid returns 0
			item_row.exchange_rate = flt(item_row.exchange_rate);

			item_row.amount_nio = (item_row.amount_usd * item_row.exchange_rate) || flt(item_row.amount_nio); // Calculate Amount in NIO
		}

		frm.events.calculate_table_totals(frm, 'nationalization_costs', 'amount_nio', 'grand_total_nationalization',
			{'Impuestos Aduaneros': 'total_customs_taxes', 'Nacionalizacion': 'total_nationalization_costs'}
		);
	}
});

frappe.ui.form.on("Policy Item", {
	items_remove: (frm) => frm.events.calculate_items_totals(frm, 'item_removed'), // FIXME: Quick Fix
	item: (frm, cdt, cdn) => frm.events.sanitize_string_field(locals[cdt][cdn], 'item', true),
	qty: (frm, cdt, cdn) => frm.events.calculate_items_totals(frm, locals[cdt][cdn]),
	fob_unit_price: (frm, cdt, cdn) => frm.events.calculate_items_totals(frm, locals[cdt][cdn])
});

frappe.ui.form.on('Policy CIF Cost', {
	cif_costs_remove: (frm) => frm.events.calculate_cif_costs(frm),
	cif_costs_add: (frm, cdt, cdn) => {
		locals[cdt][cdn].exchange_rate = frm.doc.exchange_rate; // Set Exchange Rate on Row Add
		frm.refresh_field('cif_costs');  // FIXME: Optimize, Only Update Row
	},

	provider: (frm, cdt, cdn) => frm.events.sanitize_string_field(locals[cdt][cdn], 'provider', true),
	description: (frm, cdt, cdn) => frm.events.sanitize_string_field(locals[cdt][cdn], 'description', true),

	type: (frm) => frm.events.calculate_cif_costs(frm),
	amount_usd: (frm, cdt, cdn) => frm.events.calculate_cif_costs(frm, locals[cdt][cdn]) // Recalculate Totals(CIF and Items)
});

frappe.ui.form.on('Policy Nationalization Cost', {
	nationalization_costs_remove: (frm) => frm.events.calculate_nationalization_costs(frm),

	provider: (frm, cdt, cdn) => frm.events.sanitize_string_field(locals[cdt][cdn], 'provider', true),
	description: (frm, cdt, cdn) => frm.events.sanitize_string_field(locals[cdt][cdn], 'description', true),
	reference: (frm, cdt, cdn) => frm.events.sanitize_string_field(locals[cdt][cdn], 'reference', true),

	type: (frm) => frm.events.calculate_nationalization_costs(frm),
	amount_usd: (frm, cdt, cdn) => frm.trigger('amount_nio', cdt, cdn),
	exchange_rate: (frm, cdt, cdn) => frm.trigger('amount_nio', cdt, cdn),
	amount_nio: (frm, cdt, cdn) => frm.events.calculate_nationalization_costs(frm, locals[cdt][cdn]) // Recalculate Item Fields and Form Totals
});
// 160
