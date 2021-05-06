frappe.listview_settings['Sales Invoice'] = {
    hide_name_column: true,

    before_render() {
        localStorage.show_sidebar = "false"
    }
}