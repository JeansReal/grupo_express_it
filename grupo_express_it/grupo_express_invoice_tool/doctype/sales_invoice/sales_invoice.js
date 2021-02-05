// Copyright (c) 2021, Agile Shift and contributors
// For license information, please see license.txt

function calculate_invoice_total_and_words(frm) {
    // Set new 'total' and 'in_words' fields. // TODO: Delete the if (frm.doc.total) ?
    frm.doc.total = frm.get_sum('items', 'amount'); // Using built-in function: get_sum(). avoid frm.set_value()

    if (frm.doc.total) { // If the amount is valid and not zero.
        frappe.call({
            method: 'grupo_express_it.grupo_express_invoice_tool.doctype.sales_invoice.sales_invoice.money_in_words',
            args: {number: frm.doc.total},
            callback: (r) => frm.doc.in_words = r.message,
            async: false
        });
    } else {
        frm.doc.in_words = '';
    }

    frm.refresh_fields(); // This finally refresh all the fields!
}

function calculate_item_amount(frm, cdt, cdn, item_row = null) {
    // TODO: Make some option to dont recalculate if the same value is set OR if a field not used for calculation is set
    if (!item_row) item_row = frappe.get_doc(cdt, cdn); // Getting item row being edited
    if (!item_row.item) return; // If the item has been deleted.

    if (item_row.margin_type === 'Sobre Factura' && item_row.invoiced_amount) {
        item_row.amount = (item_row.invoiced_amount / 100) * item_row.margin_rate_or_amount;
    } else if (item_row.margin_type === 'Cantidad Fija' && item_row.qty) {
        item_row.amount = (item_row.qty * item_row.margin_rate_or_amount);
    } else if (item_row.margin_type === 'Valoracion' && item_row.qty) {
        item_row.invoiced_amount = item_row.qty * item_row.valuation_rate;  // Calculate the invoice from valuation.
        item_row.amount = (item_row.invoiced_amount / 100) * item_row.margin_rate_or_amount;
    } else {
        return;
    }

    calculate_invoice_total_and_words(frm);  // Recalculate the total because we have updated the items amount.
}

// Parent Doctype
frappe.ui.form.on('Sales Invoice', {
    onload: function (frm) {
        frm.set_query('item', 'items', (doc) => {
            if (!doc.customer) { // Its more fastest to throw from here than server side code.
                frappe.throw(__('Please select the customer.') + ' ' + __('It is needed to fetch Item Details.'));
            }

            if (cur_frm.doc.items.map(item => item.item_type).includes('Contenedor')) { // Is a invoice for a container
                return {
                    filters: {type: 'Complemento'}
                }
            }

            return {
                query: 'grupo_express_it.grupo_express_invoice_tool.doctype.queries.items_with_pricing_rule_query',
                filters: {customer: doc.customer},
            }
        });

        frm.set_currency_labels(['total', 'in_words'], 'USD');
        frm.set_currency_labels(['amount', 'invoiced_amount', 'valuation_rate'], 'USD', 'items');
    }
});

// Child Doctype
frappe.ui.form.on("Sales Invoice Item", {

    items_remove: function (frm) {
        calculate_invoice_total_and_words(frm);
    },

    item: function (frm, cdt, cdn) {
        let item_row = frappe.get_doc(cdt, cdn); // Getting item row being edited

        if (!item_row.item) return; // Exit if there is no item

        frappe.db.get_value(
            'Pricing Rule',
            {'parent': frm.doc.customer, 'item': item_row.item},
            ['uom', 'margin_type', 'margin_rate_or_amount', 'valuation_rate'],
            (price_rule) => {
                item_row.uom = price_rule.uom;
                item_row.margin_type = price_rule.margin_type;
                item_row.margin_rate_or_amount = price_rule.margin_rate_or_amount;
                item_row.valuation_rate = price_rule.valuation_rate;
                frm.refresh_field('items'); // Refreshing the values in grid.

                console.log("Querying for unnecesary data!");

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
