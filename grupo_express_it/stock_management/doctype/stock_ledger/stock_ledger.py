# Copyright (c) 2024, Agile Shift and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class StockLedger(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		actual_qty: DF.Float
		item: DF.Link | None
		posting_date: DF.Date | None
		qty_after_transaction: DF.Float
		uom: DF.Data | None
		valuation_rate: DF.Currency
		voucher_no: DF.DynamicLink | None
		voucher_type: DF.Link | None
	# end: auto-generated types
	pass
