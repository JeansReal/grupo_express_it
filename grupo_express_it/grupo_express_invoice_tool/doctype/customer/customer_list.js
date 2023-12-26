frappe.listview_settings['Customer'] = {
	hide_name_column: true,

	onload(listview) {
		listview.page.sidebar.toggle(false);
	}
}
