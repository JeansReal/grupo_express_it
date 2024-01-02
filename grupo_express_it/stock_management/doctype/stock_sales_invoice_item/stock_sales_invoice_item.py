from frappe.model.document import Document


class StockSalesInvoiceItem(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		item: DF.Data
		parent: DF.Data
		parentfield: DF.Data
		parenttype: DF.Data
		policy: DF.Link | None
		policy_item: DF.Link | None
		price: DF.Currency
		qty: DF.Float
		total: DF.Currency
		uom: DF.Literal["", "Unidad", "Docenas", "Millar", "Gruesas", "Yardas", "Metros", "Rollo", "Set", "Paquetes", "Pieza", "KG", "Libras"]
	# end: auto-generated types
	pass
