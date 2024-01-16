frappe.ui.form.on("Stock Sales Invoice", {

	setup(frm) {
		frm.page.sidebar.toggle(false);
	},

	before_load(frm) {
		if (frm.is_new()) {
			frm.clear_table("items"); // FIXME: Can we make table to be required, but empty at creation
		}

		frm.set_df_property("items", "cannot_add_rows", true);  // cannot add rows manually, only via policy_items_dialog
	},

	refresh(frm) {
		frm.add_custom_button('Agregar desde Poliza', () => frm.events.policy_items_dialog(frm));
		if (!frm.is_new()) {
			frm.add_custom_button('Actualizar Cantidad Disponible', () => frm.call('update_actual_qty', {for_update: true}, () => frappe.show_alert('Cantidades Actualizadas')));
		}
	},

	validate: async (frm) => {
		frm.doc.items.forEach((row) => {
			if (row.total === 0) {
				frappe.throw({message: `<b>Producto</b> en la fila <b>#${row.idx}</b>: Tiene valores en 0.`, title: __('Missing Values Required')});
			}
			if (row.price < row.unit_price) {
				frappe.throw(`<b>Producto</b> en la fila <b>#${row.idx}</b>: Precio de Venta <b>es menor</b> que el Precio de Costo.`);
			}
		});

		// This updates the UI without touching the DB. Throws error if QTY is not available else updates the fields along the form.save()
		await frm.call('update_actual_qty', {for_update: false}).then((r) => {
			frm.doc.items.forEach((row) => {
				if (row.qty > row.actual_qty) {
					frappe.throw(`<b>Producto</b> en la fila <b>#${row.idx}</b>: Cantidad a Facturar <b>es mayor</b> que la Cantidad Disponible.`);
				}
			});
		});
	},

	company(frm) {
		// Clear Table on Company Change(So we avoid inter-company items)
		frm.doc.subtotal = frm.doc.taxes = frm.doc.total = 0.00;
		frm.clear_table("items");

		refresh_many(['items', 'subtotal', 'taxes', 'total']);
	},

	// Custom METHODS
	policy_items_dialog(frm) {
		if (!frm.doc.company) {
			frappe.throw(__('Please select Company first'));
		}

		const dialog = new frappe.ui.form.MultiSelectDialog({
			doctype: 'Policy Item', target: frm, size: 'extra-large', add_filters_group: false, primary_action_label: 'Agregar Items',

			// setters holds the Doctype fields we want on the form. These are set in the get_primary_filters() method.
			setters: {actual_qty: null, unit_price: null, uom: null},

			// data_fields holds custom fields we want on the form. But without support for get_args_for_search
			data_fields: [
				{fieldtype: 'Column Break'},
				{
					fieldtype: 'Link', label: __('Policy'), fieldname: 'policy', options: 'Policy', bold: true,
					get_query: () => ({filters: {company: frm.doc.company, docstatus: 1, status: ["!=", "Fully Billed"]}})
				},
				{fieldtype: 'Section Break', hide_border: true},
				{fieldtype: 'DateRange', label: __('Policy Date'), fieldname: 'policy_date'},
				{fieldtype: 'Column Break'}
			],

			// columns to visualize in the table(These comes from the Query)
			columns: ['policy', 'date', 'item', 'actual_qty', 'uom', 'unit_price', 'stock_value'],

			// Override get_fields() method to reorder fields. So we can have data_fields after the first field
			get_fields() {
				let primary_fields = this.get_primary_filters(); // name + setters

				primary_fields.splice(1, 0, ...this.data_fields); // Insert data_fields after first field

				return [...primary_fields, ...this.get_result_fields(), ...this.get_child_selection_fields()]; // Same as Super
			},

			get_query() {
				return {
					query: 'grupo_express_it.stock_management.doctype.stock_sales_invoice.stock_sales_invoice.get_policy_items',
					filters: {
						company: frm.doc.company,
						policy: this.dialog.fields_dict['policy'].get_value(),
						policy_date: this.dialog.fields_dict['policy_date'].get_value()
					}
				}
			},

			action(selections, args) {
				if (selections.length === 0) {
					frappe.show_alert(__("Please select {0}", [this.doctype]));
					return;
				}

				this.results.forEach(item => {
					if (selections.includes(item.name)) {
						let unit_price = parseFloat(item.unit_price.replace(/[^\d.]/g, '')); // TODO: QUICK FIX

						frm.add_child('items', {
							policy: item.policy,
							policy_item: item.name,
							item: item.item,
							actual_qty: flt(item.actual_qty),
							unit_price: unit_price,
							uom: item.uom,
							price: unit_price * (1 + (frm.doc.profit_margin / 100)) // Suggested Sale Price
						});
					}
				});

				frm.refresh_field('items');
				dialog.dialog.hide(); // Close the Dialog from the MultiSelectDialog class
			}
		});
	},

	calculate_totals(frm, item_row) {
		// This calculates Items table totals, and Invoice Totals
		item_row.qty = flt(item_row.qty); // FIXES: the issue with Paste event -> Sanitize Fields. Invalid returns 0
		item_row.price = flt(item_row.price);

		item_row.total = item_row.qty * item_row.price; // Item Total

		frm.doc.subtotal = frm.get_sum('items', 'total'); // Sub Total
		frm.doc.taxes = frm.doc.subtotal * 0.15; // Taxes. I.V.A
		frm.doc.total = frm.doc.subtotal + frm.doc.taxes; // Total

		frm.refresh_fields(['items', 'subtotal', 'taxes', 'total']);
	}
});

frappe.ui.form.on("Stock Sales Invoice Item", {
	item: (frm, cdt, cdn) => locals[cdt][cdn].item = locals[cdt][cdn].item.trim(), // Sanitize Field if edited manually
	qty: (frm, cdt, cdn) => frm.events.calculate_totals(frm, locals[cdt][cdn]),
	price: (frm, cdt, cdn) => frm.events.calculate_totals(frm, locals[cdt][cdn])
});
