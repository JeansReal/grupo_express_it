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
		frm.add_custom_button(__('Agregar desde Poliza'), () => frm.events.policy_items_dialog(frm));
	},

	// Custom METHOD
	policy_items_dialog(frm) {
		if (!frm.doc.company) {
			frappe.throw(__('Please select Company first'));
		}

		const dialog = new frappe.ui.form.MultiSelectDialog({
			doctype: 'Policy Item', target: frm, size: 'extra-large', add_filters_group: false,
			primary_action_label: __('Add Items'),

			// setters holds the Doctype fields we want on the form. These are set in the get_primary_filters() method.
			setters: {qty: null, unit_price: null, uom: null},

			// data_fields holds custom fields we want on the form. But without support for get_args_for_search
			data_fields: [
				{fieldtype: 'Column Break'},
				{
					fieldtype: 'Link', label: __('Policy'), fieldname: 'policy', options: 'Policy', bold: true,
					get_query: () => ({filters: {company: frm.doc.company}})
				},
				{fieldtype: 'Section Break', hide_border: true},
				{fieldtype: 'DateRange', label: __('Policy Date'), fieldname: 'policy_date'},
				{fieldtype: 'Column Break'}
			],

			// columns to visualize on as table
			columns: ['policy', 'date', 'item', 'qty', 'uom', 'unit_price', 'total_price'],

			// Override get_fields() method to reorder fields
			get_fields() {
				let primary_fields = this.get_primary_filters(); // name + setters

				primary_fields.splice(1, 0, ...this.data_fields); // Insert custom fields after first field

				return [...primary_fields, ...this.get_result_fields(), ...this.get_child_selection_fields()];
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
							item: item.item.trim(), // Sanitize Field(if it comes bad from policy)
							available_qty: item.qty,
							unit_price: unit_price,
							uom: item.uom,
							price: unit_price * (1 + (frm.doc.profit_margin / 100)) // Sugested Sale Price
						});
					}
				});

				frm.refresh_field('items');
				dialog.dialog.hide(); // Close the Dialog from the MultiSelectDialog class
			}
		});
	},

	// Custom METHODS
	calculate_totals(frm, item_row) {
		// This calculates Items table totals, and Invoice Totals

		if (item_row.qty > item_row.available_qty) {
			frappe.throw('La cantidad no puede ser mayor a la cantidad disponible');
		}

		if (item_row.price < item_row.unit_price) {
			frappe.show_alert({message: `El precio del item #${item_row.idx}: ${item_row.item}. Es menor que el costo.`, indicator: 'red'});
		}

		item_row.total = item_row.qty * item_row.price; // Item Total

		frm.doc.subtotal = frm.get_sum('items', 'total'); // Sub Total
		frm.doc.taxes = frm.doc.subtotal * 0.15; // Taxes. I.V.A
		frm.doc.total = frm.doc.subtotal + frm.doc.taxes; // Total

		frm.refresh_fields(['items', 'subtotal', 'taxes', 'total']);
	}

});

frappe.ui.form.on("Stock Sales Invoice Item", {

	item: (frm, cdt, cdn) => locals[cdt][cdn].item = locals[cdt][cdn].item.trim(), // Sanitize Field
	qty: (frm, cdt, cdn) => frm.events.calculate_totals(frm, locals[cdt][cdn]),
	price: (frm, cdt, cdn) => frm.events.calculate_totals(frm, locals[cdt][cdn]),

});
