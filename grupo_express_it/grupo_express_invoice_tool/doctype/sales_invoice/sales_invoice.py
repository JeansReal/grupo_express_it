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
def send_sales_invoice(doc_name: str, customer_name: str, mode: str = 'pdf') -> None:
	pdf_bytes = frappe.get_print('Sales Invoice', doc_name, print_format='Sales Invoice WhatsApp', as_pdf=True, pdf_options={}, pdf_generator='wkhtmltopdf') # 130mm for 1 item

	def save_file(file_bytes, file_name: str) -> str:
		file = frappe.new_doc(
			doctype='File',
			attached_to_doctype='Sales Invoice',
			attached_to_name=doc_name,
			file_name=file_name,  # Frappe automatically append a unique hash if file with same name exists
			file_type=mode, # JPG or PDF
			is_private=False,
			content=file_bytes
		).insert(ignore_permissions=True)

		return file.file_url

	def send_whatsapp_message(file_bytes, file_name: str, label: str) -> None:
		file_url = save_file(file_bytes, file_name)

		frappe.new_doc(
			doctype='WhatsApp Message',
			label=label,
			type='Outgoing',
			to=frappe.local.conf.whatsapp_number,  # Get from site config
			content_type='document' if mode == 'pdf' else 'image',
			use_template=True,
			# message_type='Template',
			template='sales_invoice_whatsapp_notification-es',
			# template_parameters=[],
			filename=file_name,
			attach=file_url,
			#message=f"Hola, {customer_name}\n\n{doc_name} página {i}.\nAdjunto la Imagen",
			reference_doctype='Sales Invoice',
			reference_name=doc_name,
		).insert(ignore_permissions=True)

	if mode == 'pdf':
		send_whatsapp_message(pdf_bytes, f"{doc_name} - {customer_name}.pdf", f"{doc_name} PDF") # Generate and save PDF, Then return file URL and send message
	elif mode == 'jpg':
		import fitz
		pdf = fitz.open(stream=pdf_bytes, filetype='pdf')

		for i, page in enumerate(pdf, start=1):
			pix = page.get_pixmap(dpi=210)
			image_bytes = pix.tobytes('jpg')

			send_whatsapp_message(image_bytes, f"{doc_name}. Página {i}.jpg", f"{doc_name}. Página {i} JPG")  # Send each page as image
	else:
		frappe.throw('Modo no válido. Use "pdf" o "jpg".')

	frappe.msgprint('Enviado correctamente por WhatsApp', 'Exito', indicator='green')

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
