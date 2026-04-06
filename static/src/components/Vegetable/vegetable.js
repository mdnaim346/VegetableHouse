/** @odoo-module **/

import { Component, onWillStart, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

class VegetableUserDashboard extends Component {
    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");

        this.state = useState({
            loading: true,
            submitting: false,
            selectedVegetableIds: [],
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
        const selected = new Set(this.state.selectedVegetableIds);
        if (isChecked) {
            selected.add(vegetableId);
        } else {
            selected.delete(vegetableId);
        }
        this.state.selectedVegetableIds = [...selected];
    }

    async createOrder() {
        if (!this.state.selectedVegetableIds.length) {
            this.notification.add("Please select at least one vegetable.", { type: "warning" });
            return;
        }

        this.state.submitting = true;
        try {
            const response = await this.orm.call("sale.order", "create_user_order", [this.state.selectedVegetableIds]);
            this.notification.add(response.message, {
                type: response.success ? "success" : "danger",
            });

            if (response.success) {
                this.state.selectedVegetableIds = [];
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
}

VegetableUserDashboard.template = "vegetable_house.UserDashboard";

registry.category("actions").add("vegetable_house_user_dashboard", VegetableUserDashboard);
