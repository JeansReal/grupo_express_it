from frappe.model.document import Document


class StockSalesInvoice(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF
		from grupo_express_it.stock_management.doctype.stock_sales_invoice_item.stock_sales_invoice_item import StockSalesInvoiceItem

		company: DF.Literal["", "Grupo Express, S.A.", "Grupo SyM, S.A.", "Importadora Internacional, S.A."]
		currency_exchange: DF.Currency
		items: DF.Table[StockSalesInvoiceItem]
		posting_date: DF.Date
	# end: auto-generated types
	pass
