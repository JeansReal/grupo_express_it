frappe.listview_settings['Sales Invoice'] = {
	hide_name_column: false,

	onload(listview) {
		listview.page.sidebar.toggle(false);
	}
}
