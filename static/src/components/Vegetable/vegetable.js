/** @odoo-module **/

import { Component, onWillStart, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

class VegetableUserDashboard extends Component {
    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.action = useService("action");

        this.state = useState({
            loading: true,
            submitting: false,
            // { id: quantity }
            selectedVegetables: {},
            dashboard: {
                current_user: "",
                address: "",
                available_vegetables: [],
                user_orders: [],
                summary: {
                    order_count: 0,
                    total_spent: 0,
                    total_due: 0,
                },
            },
        });

        onWillStart(async () => {
            await this.loadDashboard();
        });
    }

    async loadDashboard() {
        this.state.loading = true;
        try {
            this.state.dashboard = await this.orm.call("sale.order", "get_user_dashboard_data", []);
        } finally {
            this.state.loading = false;
        }
    }

    toggleVegetable(vegetableId, isChecked) {
        if (isChecked) {
            this.state.selectedVegetables[vegetableId] = 1;
        } else {
            delete this.state.selectedVegetables[vegetableId];
        }
    }

    updateQuantity(vegetableId, qty) {
        if (this.state.selectedVegetables[vegetableId] !== undefined) {
            this.state.selectedVegetables[vegetableId] = Math.max(0.1, parseFloat(qty) || 1);
        }
    }

    async createOrder() {
        const selectedIds = Object.keys(this.state.selectedVegetables);
        if (!selectedIds.length) {
            this.notification.add("Please select at least one vegetable.", { type: "warning" });
            return;
        }

        this.state.submitting = true;
        try {
            const lineData = selectedIds.map(id => ({
                id: parseInt(id),
                qty: this.state.selectedVegetables[id]
            }));

            const response = await this.orm.call("sale.order", "create_user_order", [lineData]);
            this.notification.add(response.message, {
                type: response.success ? "success" : "danger",
            });

            if (response.success) {
                this.state.selectedVegetables = {};
                await this.loadDashboard();
            }
        } finally {
            this.state.submitting = false;
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

    getStatusBadgeClass(status) {
        const classes = {
            draft: "bg-secondary",
            confirmed: "bg-info",
            in_process: "bg-primary",
            one_the_way: "bg-warning text-dark",
            delivered: "bg-success",
            cancelled: "bg-danger",
        };
        return `badge rounded-pill ${classes[status] || "bg-secondary"}`;
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
}

VegetableUserDashboard.template = "vegetable_house.UserDashboard";

registry.category("actions").add("vegetable_house_user_dashboard", VegetableUserDashboard);
