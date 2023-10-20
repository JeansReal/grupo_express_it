import GridRow from "../../../../frappe/frappe/public/js/frappe/form/grid_row";

frappe.ui.form.ControlTable = class ControlTable extends frappe.ui.form.ControlTable {

	make() {
		super.make();

		if (!['Policy Item', 'Policy CIF Cost', 'Policy Nationalization Cost'].includes(this.df.options))
			return; // No Personalization. Default controller

		this.refresh_input = this.control_refresh_input_append_footer; // Override Control Function

		// Override Grid Functions See: frappe/frappe/public/js/frappe/form/grid.js
		this.grid.df.on_setup = this.df_on_setup; // At execution the grid fields are not yet set. Only html elements
		this.grid.make_head = this.grid_make_head; // Override to Remove: configure_columns from header and header_search
		this.grid.setup_visible_columns = this.grid_setup_visible_columns; // Override Visible Columns Limit of 11
	}

	control_refresh_input_append_footer() {
		super.refresh_input(); // Call Super of the ControlTable
		this.grid_make_footer.call(this.grid); // We Use call to set the context to the grid
	}

	df_on_setup(grid) {
		grid.grid_pagination.page_length = 75; // Increase Pagination
		grid.form_grid.find('.grid-heading-row').addClass('disable-click'); // Disable Click on Header. See CSS for check
		grid.form_grid.append('<div class="grid-footer-row bold disable-click"></div>'); // Make Footer Row for totals
	}

	grid_make_head() {
		if (this.prevent_build) return;

		if (this.header_row) {
			$(this.parent).find('.grid-heading-row .grid-row').remove(); // Remove to redraw
		}

		this.header_row = new GridRow({
			parent: $(this.parent).find('.grid-heading-row'),
			docfields: this.docfields,
			grid: this
		});
	}

	grid_setup_visible_columns() {
		this.df.in_place_edit = true; // To Hide the Edit Icon FIXME: This Runs many times. More than needed!

		if (this.visible_columns && this.visible_columns.length > 0) return; // Just Run Once per Grid

		// TODO: Optimize Using: for of this.docfields. With or without Logical (AND OR) Assignment. Setting the Array Length
		this.visible_columns = this.docfields.map(df => [df, df.columns]);
		this.total_columns = this.docfields
			.filter((df) => frappe.model.is_numeric_field(df.fieldtype) && !['exchange_rate', 'fob_unit_price', 'unit_price'].includes(df.fieldname))
			.map(df => df.fieldname);
	}

	grid_make_footer() {
		if (this.prevent_build) return; // See grid.make_head(). if (this.data.length === 0) return -> Avoided

		if (this.footer_row) {
			this.form_grid.find(".grid-footer-row .grid-row").remove(); // Remove to redraw. Created on df_on_setup()
		}

		this.footer_row = new GridRow({
			parent: this.form_grid.find('.grid-footer-row'),
			parent_df: {}, // Hack, avoid call to: grid_row.js -> set_docfields -> frappe.meta.make_docfield_copy_for
			docfields: this.docfields,
			grid: this,
			doc: this.data.reduce((acc, d) => {
				this.total_columns.forEach((df) => {
					acc[df] = (acc[df] || 0) + (d[df] || 0); // TODO: Improve here the: (property || 0)
				});
				return acc;
			}, {idx: ''}) // If this.data.length is empty. the column gets 0 for values. Which is ok!
		});
	}

}
