from frappe.model.document import Document


class StockSalesInvoice(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		company: DF.Literal["", "Grupo Express, S.A.", "Grupo SyM, S.A.", "Importadora Internacional, S.A."]
	# end: auto-generated types
	pass
