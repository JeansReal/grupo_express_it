frappe.ui.form.on('Policy', {
	setup(frm) {
		frm.page.sidebar.toggle(false); // Hide Sidebar to better focus on the doc
	},

	onload(frm) {
		frm.set_currency_labels(['total'], 'USD');
	},

	refresh(frm) {
		frm.set_currency_labels(['rate', 'amount'], 'USD', 'items');
	},

	calculate_totals(frm) {
		frm.doc.total_qty = frm.get_sum('items', 'qty');
		frm.doc.total = frm.get_sum('items', 'amount');
		refresh_many(['total_qty', 'total']);
	},

	calculate_row_amount_and_totals(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		row.amount = row.qty * row.rate; // Calculating Amount Field on Row
		frm.events.calculate_totals(frm) // Calculating Totals
		refresh_field('amount', cdn, 'items'); // Refresh 'amount' field on 'items' Table
	}
});

frappe.ui.form.on("Policy Item", {

	items_remove(frm) {
		frm.events.calculate_totals(frm);
	},

	qty(frm, cdt, cdn) {
		frm.events.calculate_row_amount_and_totals(frm, cdt, cdn);
	},

	rate(frm, cdt, cdn) {
		frm.events.calculate_row_amount_and_totals(frm, cdt, cdn);
	}

});
