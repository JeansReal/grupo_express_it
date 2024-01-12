frappe.listview_settings['Policy'] = {

	// If this is set, we can manipulate those two indicators status
	has_indicator_for_draft: true,
	has_indicator_for_cancelled: true,

	onload(listview) {
		listview.page.sidebar.toggle(false);
	},

	get_indicator: (doc) => [__(doc.status), {
		'Draft': 'red',
		'Not Billed': 'orange',
		'Partly Billed': 'yellow',
		'Fully Billed': 'green',
		'Cancelled': 'red',
	}[doc.status], 'status,=,' + doc.status],

}
