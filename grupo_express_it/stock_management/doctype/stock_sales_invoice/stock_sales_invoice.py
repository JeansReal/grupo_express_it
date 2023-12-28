import frappe
from frappe.model.document import Document


class StockSalesInvoice(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF
		from grupo_express_it.stock_management.doctype.stock_sales_invoice_item.stock_sales_invoice_item import StockSalesInvoiceItem

		amended_from: DF.Link | None
		company: DF.Literal["", "Grupo SyM, S.A.", "Grupo Express, S.A.", "Importadora Internacional, S.A.", "Grupo de Importaciones Express, S.A."]
		currency_exchange: DF.Currency
		items: DF.Table[StockSalesInvoiceItem]
		posting_date: DF.Date
		subtotal: DF.Currency
		taxes: DF.Currency
		total: DF.Currency
	# end: auto-generated types


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_policy_items(doctype, txt, searchfield, start, page_len, filters):
	"""Returns items to be used for calculating taxes and charges"""

	print(doctype)
	print(txt)
	print(searchfield)
	print(start, page_len)
	print(filters)

	policy = frappe.qb.DocType('Policy')
	policy_item = frappe.qb.DocType("Policy Item")

	sql = (
		frappe.qb.from_(policy_item)
		.inner_join(policy).on(policy.name == policy_item.parent)
		.where(policy.company == filters.get("company"))
		.where(policy_item.item.like(f"%{txt}%"))
		.orderby(policy.posting_date)
	).select(
		'name',
		policy.name.as_('policy'), policy.posting_date.as_('date'),
		'item', 'qty', 'uom', 'unit_price'
	)

	print(sql)

	return sql.run(as_dict=True)
