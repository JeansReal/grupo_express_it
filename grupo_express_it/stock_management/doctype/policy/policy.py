from frappe.model.document import Document


class Policy(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF
		from grupo_express_it.stock_management.doctype.policy_cif_cost.policy_cif_cost import PolicyCIFCost
		from grupo_express_it.stock_management.doctype.policy_item.policy_item import PolicyItem
		from grupo_express_it.stock_management.doctype.policy_nationalization_cost.policy_nationalization_cost import PolicyNationalizationCost

		amended_from: DF.Link | None
		cif_costs: DF.Table[PolicyCIFCost]
		company: DF.Literal["", "Grupo SyM, S.A.", "Grupo Express, S.A.", "Importadora Internacional, S.A.", "Grupo de Importaciones Express, S.A."]
		exchange_rate: DF.Currency
		grand_total_nationalization: DF.Currency
		invoice: DF.Data | None
		items: DF.Table[PolicyItem]
		nationalization_costs: DF.Table[PolicyNationalizationCost]
		per_billed: DF.Percent
		policy: DF.Data
		posting_date: DF.Date
		provider: DF.Data | None
		status: DF.Literal["Draft", "Not Billed", "Partly Billed", "Fully Billed", "Cancelled"]
		total_cif: DF.Currency
		total_cost: DF.Currency
		total_customs_taxes: DF.Currency
		total_fob: DF.Currency
		total_freight: DF.Currency
		total_insurance: DF.Currency
		total_nationalization_costs: DF.Currency
		total_qty: DF.Float
	# end: auto-generated types

	def before_validate(self):
		# These are here for a final check before saving. THESE are the Most Important fields.
		# FIXME: How about the others. EG: policy_name: L - ##### - YYYY
		self.total_qty = self.total_cost = 0.00  # noqa type: ignore # FIXME

		for item in self.items:
			self.total_qty += item.qty           # Calculate Total QTY
			self.total_cost += item.total_price  # Calculate Total Cost

	def on_cancel(self):
		raise NotImplementedError('Por ahora no esta permitida la cancelacion.')

	def before_submit(self):
		""" At this point the document is no longer editable """
		self.per_billed = 0
		self.status = 'Not Billed'

		for item in self.items:
			item.actual_qty = item.qty           # At this exact moment all items are in stock
			item.stock_value = item.total_price
