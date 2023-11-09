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

		cif_costs: DF.Table[PolicyCIFCost]
		company: DF.Literal["", "Grupo SyM, S.A.", "Grupo Express, S.A.", "Importadora Internacional, S.A.", "Grupo de Importaciones Express, S.A."]
		exchange_rate: DF.Currency
		grand_total_nationalization: DF.Currency
		invoice: DF.Data | None
		items: DF.Table[PolicyItem]
		nationalization_costs: DF.Table[PolicyNationalizationCost]
		policy: DF.Data
		posting_date: DF.Date | None
		provider: DF.Data | None
		total_cif: DF.Currency
		total_customs_taxes: DF.Currency
		total_fob: DF.Currency
		total_freight: DF.Currency
		total_insurance: DF.Currency
		total_nationalization_costs: DF.Currency
		total_qty: DF.Float
	# end: auto-generated types
	pass
