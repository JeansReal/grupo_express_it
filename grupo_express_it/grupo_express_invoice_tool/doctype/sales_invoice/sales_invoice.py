import frappe
from frappe.model.document import Document
from frappe.utils import in_words


class SalesInvoice(Document):
    pass


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
