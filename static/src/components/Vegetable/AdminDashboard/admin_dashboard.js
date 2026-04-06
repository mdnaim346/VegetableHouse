/** @odoo-module **/

import { Component, onWillStart, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

class VegetableAdminDashboard extends Component {
    setup() {
        this.orm = useService("orm");
        this.action = useService("action");

        this.state = useState({
            loading: true,
            metrics: {
                total_orders: 0,
                total_products: 0,
                total_sales: 0,
                total_amount_collected: 0,
                total_amount_due: 0,
                total_sale_value: 0,
                recent_orders: [],
            },
        });

        onWillStart(async () => {
            await this.loadDashboard();
        });
    }

    async loadDashboard() {
        this.state.loading = true;
        try {
            const metrics = await this.orm.call("sale.order", "get_admin_dashboard_metrics", []);
            this.state.metrics = metrics;
        } finally {
            this.state.loading = false;
        }
    }

    formatCurrency(amount) {
        return `$${(amount || 0).toFixed(2)}`;
    }

    getStatusLabel(status) {
        const labels = {
            draft: "Draft",
            confirmed: "Confirmed",
            in_process: "In Process",
            one_the_way: "On The Way",
            delivered: "Delivered",
            cancelled: "Cancelled",
        };
        return labels[status] || status;
    }

    getStatusClass(status) {
        return `o_vh_status_badge o_vh_status_${status || "draft"}`;
    }

    openOrders() {
        this.action.doAction({
            type: "ir.actions.act_window",
            name: "Orders",
            res_model: "sale.order",
            views: [
                [false, "list"],
                [false, "form"],
            ],
            target: "current",
        });
    }
}

VegetableAdminDashboard.template = "vegetable_house.AdminDashboard";

registry.category("actions").add("vegetable_house_admin_dashboard", VegetableAdminDashboard);
