/** @odoo-module **/

import { Component, onWillStart, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

class VegetableAdminDashboard extends Component {
    setup() {
        this.orm = useService("orm");
        this.action = useService("action");
        this.notification = useService("notification");

        this.state = useState({
            loading: true,
            isAdmin: true,
            statusChanging: false,
            metrics: {
                total_orders: 0,
                total_products: 0,
                total_sales: 0,
                total_amount_collected: 0,
                total_amount_due: 0,
                total_sale_value: 0,
                recent_orders: [],
            },
            statusOptions: [
                { id: "draft", label: "Draft" },
                { id: "confirmed", label: "Confirmed" },
                { id: "in_process", label: "In Process" },
                { id: "one_the_way", label: "On the Way" },
                { id: "delivered", label: "Delivered" },
                { id: "cancelled", label: "Cancelled" },
            ],
        });

        onWillStart(async () => {
            // Security guard: redirect non-admins to the User Dashboard
            const isAdmin = await this.orm.call(
                "res.users",
                "has_group",
                ["base.group_system"]
            );
            if (!isAdmin) {
                await this.action.doAction("vegetable_house_user_dashboard");
                return;
            }
            this.state.isAdmin = true;
            await this.loadDashboard();
        });
    }

    async changeStatus(orderId, newStatus) {
        this.state.statusChanging = true;
        try {
            const result = await this.orm.call("sale.order", "update_order_status", [orderId, newStatus]);
            if (result.success) {
                this.notification.add(result.message, { type: "success" });
                await this.loadDashboard();
            } else {
                this.notification.add(result.message, { type: "danger" });
            }
        } finally {
            this.state.statusChanging = false;
        }
    }

    async createInvoice(orderId) {
        this.state.statusChanging = true;
        try {
            const result = await this.orm.call("sale.order", "create_order_invoice", [orderId]);
            if (result.success) {
                this.notification.add(result.message, { type: "success" });
                await this.loadDashboard();
            } else {
                this.notification.add(result.message, { type: "warning" });
            }
        } finally {
            this.state.statusChanging = false;
        }
    }

    async viewInvoice(orderId) {
        await this.action.doAction({
            type: "ir.actions.act_window",
            res_model: "account.move",
            name: "Order Invoices",
            view_mode: "list,form",
            views: [[false, "list"], [false, "form"]],
            domain: [["line_ids.sale_line_ids.order_id", "=", orderId]],
            target: "current",
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

    openOrder(orderId) {
        this.action.doAction({
            type: "ir.actions.act_window",
            res_model: "sale.order",
            res_id: orderId,
            views: [[false, "form"]],
            target: "current",
        });
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
            context: { active_test: false },
        });
    }
}

VegetableAdminDashboard.template = "vegetable_house.AdminDashboard";

registry.category("actions").add("vegetable_house_admin_dashboard", VegetableAdminDashboard);
