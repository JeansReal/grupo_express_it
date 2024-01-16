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
			if (row.unit_price === 0) {
				frappe.throw({message: `<b>Producto</b> en la fila <b>#${row.idx}</b>: Tiene valores en 0.`, title: __('Missing Values Required')});
			}
		});
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
			row.exchange_rate = frm.doc.exchange_rate; // Update Exchange Rate in CIF Costs
			frm.events.calculate_exchange_rate(frm, 'cif_costs', row); // Recalculate Amount in NIO
		});

		frm.events.calculate_items_totals(frm);  // Recalculate on Exchange Rate Change
	},

	// START Custom Functions
	sanitize_string_field(doc, field, child = false) {
		doc[field] = doc[field].trim().replace(/\s+/g, ' '); // Remove Extra Spaces
		if (!child) cur_frm.refresh_field(field);                                  // If not Child refresh field(doc)
	},

	calculate_exchange_rate(frm, table, table_row) {
		table_row.amount_nio = table_row.amount_usd * table_row.exchange_rate;
		frm.refresh_field(table);  // FIXME: Optimize, Only Update Row
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

	calculate_table_totals(frm, table, table_amount, frm_total_field, child_type_to_frm_mapping) {
		Object.values(child_type_to_frm_mapping).forEach(field => frm.doc[field] = 0); // Reset the totals to recalculate

		// First Calculate Totals by Type || No fallback to avoid errors. User Must Select a Type
		(frm.doc[table] || []).forEach((row) => {
			if (child_type_to_frm_mapping.hasOwnProperty(row.type)) { // If the row Type is included in the Options
				frm.doc[child_type_to_frm_mapping[row.type]] += row[table_amount]; // Sum the selected field into parent doc
			}
		});

		// Total Comes from the Sum of the fields. Zero if no items in Table. Avoid extra loop: frm.get_sum('cif_costs', 'amount_usd');
		frm.doc[frm_total_field] = Object.values(child_type_to_frm_mapping).reduce((acc, field) => acc + frm.doc[field], 0);

		frm.refresh_fields([frm_total_field, ...Object.keys(child_type_to_frm_mapping)]);

		frm.events.calculate_items_totals(frm);  // We Must Recalculate Items Totals
	},

	calculate_cif_costs(frm) {
		frm.events.calculate_table_totals(frm, 'cif_costs', 'amount_usd', 'total_cif',
			{'Flete': 'total_freight', 'Seguro': 'total_insurance'}
		);
	},

	calculate_nationalization_costs(frm) {
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
	amount_usd: (frm, cdt, cdn) => {
		frm.events.calculate_cif_costs(frm);    // Recalculate Totals(CIF and Items)
		frm.trigger('exchange_rate', cdt, cdn); // Recalculate Amount in NIO
	},
	exchange_rate: (frm, cdt, cdn) => frm.events.calculate_exchange_rate(frm, 'cif_costs', locals[cdt][cdn]) // Recalculate Amount in NIO. Has no effect on Totals
});

frappe.ui.form.on('Policy Nationalization Cost', {
	nationalization_costs_remove: (frm) => frm.events.calculate_nationalization_costs(frm),

	provider: (frm, cdt, cdn) => frm.events.sanitize_string_field(locals[cdt][cdn], 'provider', true),
	description: (frm, cdt, cdn) => frm.events.sanitize_string_field(locals[cdt][cdn], 'description', true),
	reference: (frm, cdt, cdn) => frm.events.sanitize_string_field(locals[cdt][cdn], 'reference', true),

	type: (frm) => frm.events.calculate_nationalization_costs(frm),
	amount_usd: (frm, cdt, cdn) => frm.trigger('exchange_rate', cdt, cdn), // Recalculate Amount in NIO
	exchange_rate: (frm, cdt, cdn) => {
		frm.events.calculate_exchange_rate(frm, 'nationalization_costs', locals[cdt][cdn]);
		frm.events.calculate_nationalization_costs(frm); // Recalculate Totals
	},
	amount_nio: (frm) => frm.events.calculate_nationalization_costs(frm)
});
