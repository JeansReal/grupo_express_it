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

		new frappe.ui.form.MultiSelectDialog({
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
			columns: ['policy', 'date', 'item', 'qty', 'uom', 'unit_price'],

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
				console.log(selections);
				console.log(args);
			}
		});
	}

});
