import time

import fitz

import frappe
from frappe.model.document import Document
from frappe.utils import in_words

class SalesInvoice(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF
		from grupo_express_it.grupo_express_invoice_tool.doctype.sales_invoice_item.sales_invoice_item import SalesInvoiceItem

		customer: DF.Link
		customer_name: DF.Data | None
		in_words: DF.Data | None
		items: DF.Table[SalesInvoiceItem]
		posting_date: DF.Date | None
		posting_time: DF.Time | None
		total: DF.Currency
		whatsapp: DF.Check
	# end: auto-generated types
	pass

@frappe.whitelist(allow_guest=False)
def send_sales_invoice(doc_name: str, items_length: int) -> None:
	frappe.publish_progress(1, title="Enviando factura por WhatsApp", doctype='Sales Invoice', docname=doc_name, description='Generando PDF...')

	pdf_bytes = frappe.get_print('Sales Invoice', doc_name, print_format='Sales Invoice WhatsApp', as_pdf=True, pdf_options={
		'page-width': '210mm',      # A4 default width
    	'page-height': f"{145 + (items_length * 17)}mm"# A4 Default Height 297mm | 130mm header/footer space
	}, pdf_generator='wkhtmltopdf') # 130mm for 1 item

	pdf = fitz.open(stream=pdf_bytes, filetype='pdf')

	image_files = []
	total_pages = len(pdf)

	for i, page in enumerate(pdf, start=1):
		pix = page.get_pixmap(dpi=200)
		image_bytes = pix.tobytes('jpg')

		file = frappe.new_doc(
			doctype='File',
			attached_to_doctype='Sales Invoice',
			attached_to_name=doc_name,
			file_name=f"{doc_name}_page_{i}.jpg", # Frappe automatically append a unique hash if file with same name exists
			file_type='JPG',
			is_private=False,
			content=image_bytes
		).insert(ignore_permissions=True)

		image_files.append(file.file_url)
		progress = int((i / total_pages) * 50)
		frappe.publish_progress(progress, title="Enviando factura por WhatsApp", doctype='Sales Invoice', docname=doc_name, description=f"Creando imagen {i}/{total_pages}")
		time.sleep(0.25)

	for i, img_url in enumerate(image_files, start=1):
		frappe.new_doc(
			doctype='WhatsApp Message',
			label=f"Factura {doc_name}. Página {i}",
			type='Outgoing',
			to=frappe.local.conf.whatsapp_number,  # Get from site config
			content_type='image',

			use_template=True,
			# message_type='Template',
			template='sales_invoice_whatsapp_notification-es',
			# template_parameters=[
			# 	{"type": "text", "text": "Clothing Center"},
			# 	{"type": "text", "text": doc_name},
			# 	{"type": "text", "text": "C$ 1,850.00"}
			# ],
			attach=img_url,
			message=f'{doc_name} página {i}.',
			reference_doctype='Sales Invoice',
			reference_name=doc_name,
		).insert(ignore_permissions=True)

		progress = 50 + int((i / total_pages) * 50)
		frappe.publish_progress(progress, title="Enviando factura por WhatsApp", doctype='Sales Invoice', docname=doc_name, description=f"Enviando imagen {i}/{total_pages}")
		time.sleep(0.25)

	frappe.db.set_value('Sales Invoice', doc_name, 'whatsapp', True, update_modified=False) # Mark as sent


@frappe.whitelist(allow_guest=False)
def money_in_words(number) -> str:
	whole, _, fraction = number.partition('.')  # Split the number and the fraction. Even if number is integer

	out = '{0} dólares'.format(in_words(whole)[:-1] if whole[-1:] == '1' else in_words(whole))  # Ends with 1 then trim last char

	if fraction and fraction[:2] not in ['0', '00']:  # same as float(number).is_integer(). check if 2 first digits are zeros
		out += ' con {0}/100'.format(fraction[:2] + '0' if len(fraction[:2]) == 1 else fraction[:2])  # Fraction is one digit add a zero

	return out.capitalize()


@frappe.whitelist(allow_guest=False)
@frappe.validate_and_sanitize_search_inputs
def items_with_pricing_rule_query(doctype, txt, searchfield, start, page_len, filters):
	""" This query the item name related to a customer """

	return frappe.db.sql(
		"""select item
		   from `tabPricing Rule`
		   where parent = %(parent)s and item like %(txt)s
		   order by idx desc
		   limit %(start)s, %(page_len)s
		""", {
			'parent': filters.get('customer'),
			'txt': "%%%s%%" % txt,
			'_txt': txt.replace("%", ""),  # this is unused but leave it
			'start': start,
			'page_len': page_len
		})
