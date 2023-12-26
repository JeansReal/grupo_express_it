frappe.ui.form.on("Stock Sales Invoice", {

	setup(frm) {
		frm.page.sidebar.toggle(false);
	},

	onload_post_render(frm) {
		frm.get_field("items").grid.set_multiple_add("policy_item", "price");
	},

	refresh(frm) {
		frm.add_custom_button('Get Items From Policy', () => {

		});
	},

	policy_item_selector(frm) {

	}

});
