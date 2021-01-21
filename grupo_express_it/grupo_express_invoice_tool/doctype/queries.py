import frappe


@frappe.whitelist(allow_guest=False)
@frappe.validate_and_sanitize_search_inputs
def items_with_pricing_rule_query(doctype, txt, searchfield, start, page_len, filters):
    """ This query the item name related to a customer """

    return frappe.db.sql("""select item from `tabPricing Rule`
        where parent = %(parent)s
            and item like %(txt)s
        order by idx desc
        limit %(start)s, %(page_len)s
    """, {
        'parent': filters.get('customer'),
        'txt': "%%%s%%" % txt,
        '_txt': txt.replace("%", ""),  # this is unused but leave it
        'start': start,
        'page_len': page_len
    })
