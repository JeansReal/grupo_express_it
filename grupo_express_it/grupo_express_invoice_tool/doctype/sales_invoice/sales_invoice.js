// Copyright (c) 2021, Agile Shift and contributors
// For license information, please see license.txt

function money_in_words(frm) {
    frappe.call({
        method: 'grupo_express_it.grupo_express_invoice_tool.doctype.sales_invoice.sales_invoice.money_in_words',
        args: {number: frm.doc.items[0].amount},
        callback: (r) => frm.doc.in_words = r.message,
        async: false
    });
}

function calculate_item_amount(frm, cdt, cdn, item_row = null) {
    if (!item_row) item_row = frappe.get_doc(cdt, cdn); // Getting item row being edited
    if (!item_row.item) return;                         // Exit if there is no item

    if (item_row.margin_type === 'Percentage') {
        item_row.amount = (item_row.invoiced_amount / 100) * item_row.margin_rate_or_amount;
    } else if (item_row.margin_type === 'Amount') {
        item_row.amount = (item_row.qty * item_row.margin_rate_or_amount)
    }

    money_in_words(frm);

    frm.refresh_fields(); // This finally refresh all the fields!
}

// Parent Doctype
frappe.ui.form.on('Sales Invoice', {
    onload: function (frm) {
        frm.set_currency_labels(['amount', 'invoiced_amount'], 'USD', 'items');

        frm.set_query('item', 'items', (doc) => {
            if (!doc.customer) { // Its more fastest to throw from here than server side code.
                frappe.throw(__('Please select the customer.') + ' ' + __('It is needed to fetch Item Details.'));
            }
            return {
                query: 'grupo_express_it.grupo_express_invoice_tool.doctype.queries.items_with_pricing_rule_query',
                filters: {customer: doc.customer},
            }
        });
    }
});

// Child Doctype
frappe.ui.form.on("Sales Invoice Item", {
    item: function (frm, cdt, cdn) {
        let item_row = frappe.get_doc(cdt, cdn); // Getting item row being edited

        if (!item_row.item) return; // Exit if there is no item

        frappe.db.get_value(
            'Pricing Rule',
            {'parent': frm.doc.customer, 'item': item_row.item},
            ['margin_type', 'margin_rate_or_amount'],
            (price_rule) => {
                item_row.margin_type = price_rule.margin_type;
                item_row.margin_rate_or_amount = price_rule.margin_rate_or_amount;
                calculate_item_amount(frm, cdt, cdn, item_row); // This calculates the item amount and the total.
            },
            'Customer'
        );
    },

    invoiced_amount: function (frm, cdt, cdn) {
        calculate_item_amount(frm, cdt, cdn);
    },

    qty: function (frm, cdt, cdn) {
        calculate_item_amount(frm, cdt, cdn);
    },

    // margin_type: function (frm) { // TODO: Make this Work?
    //     frm.set_df_property('margin_rate_or_amount', 'description', frm.doc.margin_type == 'Percentage' ? 'In Percentage %' : 'In Amount');
    // }
});
