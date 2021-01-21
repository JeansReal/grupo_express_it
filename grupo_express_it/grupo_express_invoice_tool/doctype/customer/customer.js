// Copyright (c) 2021, Agile Shift and contributors
// For license information, please see license.txt

frappe.ui.form.on('Customer', {
    onload: function (frm) {
        frm.set_query('item', 'pricing_rules', (doc) => {
            return {
                filters: {
                    item_name: ['not in', doc.pricing_rules.map(p => p.item)] // Only shows no added items
                }
            };
        });
    }
});

// Child Table
frappe.ui.form.on('Pricing Rule', {
    //TODO: Dynamically change the description based on type of margin
});
