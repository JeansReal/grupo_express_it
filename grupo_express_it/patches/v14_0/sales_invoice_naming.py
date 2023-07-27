import frappe


def execute():
	frappe.reload_doctype('Document Naming Rule')

	doc = frappe.get_doc({
		'doctype': 'Document Naming Rule',
		'document_type': 'Sales Invoice',
		'priority': 1,
		'prefix': 'Recibo No. ',
		'prefix_digits': 6,
		'counter': 0
	})

	doc.insert()
