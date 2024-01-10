frappe.listview_settings['Policy'] = {

	onload(listview) {
		listview.page.sidebar.toggle(false);
	},

	get_indicator: (doc) => [__(doc.status), {
		'Not Billed': 'orange',
		'Partly Billed': 'blue',
		'Fully Billed': 'green',
	}[doc.status], 'status,=,' + doc.status],

}
