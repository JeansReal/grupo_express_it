// Copyright (c) 2021, Agile Shift and contributors
// For license information, please see license.txt

frappe.ui.form.on('Customer', {
    setup: function (frm) {
        $('.layout-side-section').hide(); // Little Trick to work better
    },

    onload: function (frm) {
        frm.set_query('item', 'pricing_rules', (doc) => {
            return {
                filters: {
                    item_name: ['not in', doc.pricing_rules.map(p => p.item)], // Only shows no added items
                    type: ['not in', ['Complemento']]
                }
            };
        });

        // frm.set_currency_labels(['valuation_rate'], 'USD', 'pricing_rules');
    }
});

// Child Table
frappe.ui.form.on('Pricing Rule', {
    //TODO: Dynamically change the description based on type of margin
});
