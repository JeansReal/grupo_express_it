frappe.ui.form.on("Stock Sales Invoice", {

	setup(frm) {
		frm.page.sidebar.toggle(false);
	},

	onload_post_render(frm) {
		frm.get_field("items").grid.set_multiple_add("policy_item", "price");
	},

	refresh(frm) {
		frm.add_custom_button(__('Agregar desde Poliza'), () => {});

		let dialog = new frappe.ui.form.MultiSelectDialog({
			doctype: 'Policy', target: frm, size: 'extra-large',
			add_filters_group: false,

			setters: {
				company: frm.doc.company,
			},
			columns: ['policy', 'date', 'item', 'qty', 'uom', 'unit_price'],

			get_query() {
				return {
					query: 'grupo_express_it.stock_management.doctype.stock_sales_invoice.stock_sales_invoice.get_policy_items',
					filters: {
						company: frm.doc.company
					}
				}
			},

			// allow_child_item_selection: true,
			// child_fieldname: "items",
			// child_columns: ["item", "uom", "qty", 'unit_price'],

			action: (selections, args) => {
				console.log(selections);
				console.log(args);
			}

		});

	},

	policy_item_selector(frm) {}
});
