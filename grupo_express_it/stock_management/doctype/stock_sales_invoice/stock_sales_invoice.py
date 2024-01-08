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
		invoice_no: DF.Data
		items: DF.Table[StockSalesInvoiceItem]
		posting_date: DF.Date
		profit_margin: DF.Percent
		subtotal: DF.Currency
		taxes: DF.Currency
		total: DF.Currency
	# end: auto-generated types


@frappe.whitelist(methods=['GET'])
@frappe.validate_and_sanitize_search_inputs
def get_policy_items(doctype, txt, searchfield, start, page_len, filters, as_dict):
	"""Returns items to be used for calculating taxes and charges"""
	# TODO: Implement start and page_len

	policy = frappe.qb.DocType('Policy')
	policy_item = frappe.qb.DocType(doctype)  # We can use the hardcoded doctype string

	# TODO: total_price need to be the available stock qty * unit_price
	sql_query = (
		frappe.qb.from_(policy_item)
		.inner_join(policy).on(policy.name == policy_item.parent)
		.select('name', policy.name.as_('policy'), policy.posting_date.as_('date'), 'item', 'qty', 'uom', 'unit_price', 'total_price')
		.where(policy.company == filters['company'])  # Mandatory. Will throw if not present
		.orderby(policy.posting_date, policy_item.qty)
		.limit(page_len).offset(start)
	)

	# TODO: This can be simplified? maybe a Dict. Something like a mapping
	if txt:
		sql_query = sql_query.where(policy_item.item.like(f"%{txt}%"))
	if policy_field := filters.get('policy'):
		sql_query = sql_query.where(policy.name == policy_field)
	if policy_date_field := filters.get('policy_date'):
		sql_query = sql_query.where(policy.posting_date.between(*policy_date_field))
	if uom_field := filters.get('uom'):
		sql_query = sql_query.where(policy_item.uom == uom_field)
	if qty_field := filters.get('qty'):
		sql_query = sql_query.where(policy_item.qty >= qty_field)  # TODO: check if this is correct or even necessary
	if unit_price_field := filters.get('unit_price'):
		sql_query = sql_query.where(policy_item.unit_price <= unit_price_field)

	results = sql_query.run(as_dict=as_dict)

	for result in results:  # TODO: We can optimize this by formatting directly from SQL
		result['qty'] = frappe.utils.fmt_money(result['qty'], precision=2)
		result['unit_price'] = frappe.utils.fmt_money(result['unit_price'], precision=2, currency='NIO')
		result['total_price'] = frappe.utils.fmt_money(result['total_price'], precision=2, currency='NIO')

	return results
