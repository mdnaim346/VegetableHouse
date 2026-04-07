from odoo import api, fields, models


class Orders(models.Model):
    _inherit = "sale.order"

    user_id = fields.Many2one("res.users", string="Salesperson", default=lambda self: self.env.user)
    Vegetable_ids = fields.Many2many("vegetable.house", string="Vegetables")
    vegetable_line_ids = fields.One2many("vegetable.order.line", "order_id", string="Vegetable Order Lines")
    
    total_price = fields.Float(string="Total Price", compute="_compute_total_price")
    received_amount = fields.Float(string="Received Amount")
    due_amount = fields.Float(string="Due Amount", compute="_compute_due_amount")
    
    status = fields.Selection(
        [
            ("draft", "Draft"),
            ("confirmed", "Confirmed"),
            ("in_process", "In Process"),
            ("one_the_way", "On the Way"),
            ("delivered", "Delivered"),
            ("cancelled", "Cancelled"),
        ],
        string="Status",
        default="draft",
    )

    @api.depends("vegetable_line_ids.subtotal", "Vegetable_ids")
    def _compute_total_price(self):
        for order in self:
            # If we have lines, use line subtotals. Otherwise use the M2M sum (backward compatibility)
            if order.vegetable_line_ids:
                order.total_price = sum(order.vegetable_line_ids.mapped("subtotal"))
            else:
                total_price = 0.0
                for vegetable in order.Vegetable_ids:
                    total_price += vegetable.price_kg + vegetable.price_piece
                order.total_price = total_price

    @api.depends("total_price", "received_amount")
    def _compute_due_amount(self):
        for order in self:
            order.due_amount = order.total_price - order.received_amount

    @api.model
    def get_admin_dashboard_metrics(self):
        orders = self.search([])

        total_orders = len(orders)
        total_products = self.env["vegetable.house"].search_count([])
        total_sales = len(orders.filtered(lambda order: order.status == "delivered"))
        total_amount_collected = sum(orders.mapped("received_amount"))
        total_amount_due = sum(orders.mapped("due_amount"))
        total_sale_value = sum(orders.mapped("total_price"))

        recent_orders = orders.sorted(lambda order: order.create_date or order.id, reverse=True)[:5]

        return {
            "total_orders": total_orders,
            "total_products": total_products,
            "total_sales": total_sales,
            "total_amount_collected": total_amount_collected,
            "total_amount_due": total_amount_due,
            "total_sale_value": total_sale_value,
            "recent_orders": [
                {
                    "id": order.id,
                    "name": order.name,
                    "customer": order.partner_id.name or "Unknown",
                    "status": order.status,
                    "total_price": order.total_price,
                    "received_amount": order.received_amount,
                    "due_amount": order.due_amount,
                }
                for order in recent_orders
            ],
        }

    @api.model
    def get_user_dashboard_data(self):
        vegetables = self.env["vegetable.house"].search([("availibility", "=", True)])
        user_orders = self.search([("user_id", "=", self.env.user.id)], order="create_date desc, id desc", limit=5)

        return {
            "current_user": self.env.user.name,
            "address": self.env.user.address or "",
            "available_vegetables": [
                {
                    "id": vegetable.id,
                    "name": vegetable.name,
                    "description": vegetable.description or "",
                    "price_kg": vegetable.price_kg,
                    "price_piece": vegetable.price_piece,
                    "image_url": f"/web/image/vegetable.house/{vegetable.id}/image" if vegetable.image else False,
                }
                for vegetable in vegetables
            ],
            "user_orders": [
                {
                    "id": order.id,
                    "name": order.name,
                    "status": order.status,
                    "total_price": order.total_price,
                    "received_amount": order.received_amount,
                    "due_amount": order.due_amount,
                }
                for order in user_orders
            ],
            "summary": {
                "order_count": len(user_orders),
                "total_spent": sum(user_orders.mapped("total_price")),
                "total_due": sum(user_orders.mapped("due_amount")),
            },
        }

    @api.model
    def create_user_order(self, vegetable_data):
        """ Creates a new sale order with multiple lines (vegetables and quantities) """
        if not vegetable_data:
            return {"success": False, "message": "Please select at least one vegetable."}

        user = self.env.user
        partner = user.partner_id
        if not partner:
            return {"success": False, "message": "No customer partner found for the current user."}

        # Format input for One2many creation
        lines = []
        standard_lines = []
        for data in vegetable_data:
            veg_id = int(data.get('id'))
            qty = float(data.get('qty', 1.0))
            if qty <= 0: continue
            
            veg = self.env['vegetable.house'].browse(veg_id)
            if not veg.exists(): continue

            # Custom vegetable line
            lines.append((0, 0, {
                'vegetable_id': veg_id,
                'quantity': qty,
            }))

            # Standard Odoo line (for invoicing, etc)
            # Find a product. If no product_id on vegetable house, we can link a dummy one 
            # Or use a field. Let's assume there's no product mapping yet, so we'll skip 
            # the standard line for now unless we create one.
            # INSTEAD: We'll override _create_invoices to handle our custom lines if preferred,
            # but standard lines are better. 
            
            # Since we want invoicing to work, we MUST create standard order lines.
            # I will assume there is a product linked or we create a name/price.
            # Odoo's _create_invoices requires a product_id.
            
            # For this simple case, let's create a generic "Vegetable" product if it doesn't exist
            # or try to find a product named after the vegetable.
            # We use .sudo() because regular users don't have product creation rights.
            product = self.env['product.product'].sudo().search([('name', '=', veg.name)], limit=1)
            if not product:
                # Create a simple product on the fly if needed
                product = self.env['product.product'].sudo().create({
                    'name': veg.name,
                    'type': 'consu',
                    'list_price': veg.price_kg + veg.price_piece,
                })
            
            standard_lines.append((0, 0, {
                'product_id': product.id,
                'name': veg.name,
                'product_uom_qty': qty,
                'price_unit': veg.price_kg + veg.price_piece,
            }))

        if not lines:
            return {"success": False, "message": "No valid products or quantities selected."}

        order = self.create({
            "partner_id": partner.id,
            "user_id": user.id,
            "vegetable_line_ids": lines,
            "order_line": standard_lines, # Sync with standard Odoo lines
            "received_amount": 0.0,
            "status": "draft",
        })

        return {
            "success": True,
            "message": f"Order {order.name} created successfully.",
            "order_id": order.id,
        }

    @api.model
    def update_order_status(self, order_id, new_status):
        """ Update the status of a specific sale order """
        order = self.browse(int(order_id))
        if not order.exists():
            return {"success": False, "message": "Order not found."}
        
        # Validate status
        selection = self._fields['status'].selection
        valid_statuses = [s[0] for s in (selection if isinstance(selection, list) else selection(self))]
        if new_status not in valid_statuses:
            return {"success": False, "message": f"Invalid status: {new_status}"}

        order.write({"status": new_status})
        return {"success": True, "message": f"Order {order.name} updated to {new_status}."}


class VegetableOrderLine(models.Model):
    _name = "vegetable.order.line"
    _description = "Vegetable Order Line"

    order_id = fields.Many2one("sale.order", string="Order", ondelete="cascade")
    vegetable_id = fields.Many2one("vegetable.house", string="Vegetable", required=True)
    quantity = fields.Float(string="Quantity", default=1.0)
    subtotal = fields.Float(string="Subtotal", compute="_compute_subtotal")

    @api.depends("quantity", "vegetable_id.price_kg", "vegetable_id.price_piece")
    def _compute_subtotal(self):
        for line in self:
            # We follow the user's logic: Price is price_kg + price_piece (sum) multiplied by quantity
            # Or usually it's one of them. I'll stick to a simpler sum to match user's previous code.
            unit_price = line.vegetable_id.price_kg + line.vegetable_id.price_piece
            line.subtotal = unit_price * line.quantity
