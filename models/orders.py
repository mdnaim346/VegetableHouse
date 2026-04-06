from odoo import models, fields, api

class Orders(models.Model):
    _inherit="sale.order"
    

    user_id = fields.Many2one('res.users', string='Salesperson', default=lambda self: self.env.user)
    Vegetable_ids= fields.Many2many('vegetable.house', string='Vegetables')
    total_price = fields.Float(string='Total Price', compute='_compute_total_price')
    received_amount = fields.Float(string='Received Amount')
    due_amount = fields.Float(string='Due Amount', compute='_compute_due_amount')
    status= fields.Selection([
        ('draft', 'Draft'),
        ('confirmed', 'Confirmed'),
        ('in_process', 'In Process'),
        ('one_the_way', 'On the Way'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled')
    ], string='Status', default='draft')
    


    @api.depends('Vegetable_ids.price_kg', 'Vegetable_ids.price_piece')
    def _compute_total_price(self):
        for order in self:
            total_price = 0.0
            for vegetable in order.Vegetable_ids:
                total_price += vegetable.price_kg + vegetable.price_piece
            order.total_price = total_price

    @api.depends('total_price', 'received_amount')
    def _compute_due_amount(self):
        for order in self:
            order.due_amount = order.total_price - order.received_amount

    @api.model
    def get_admin_dashboard_metrics(self):
        orders = self.search([])

        total_orders = len(orders)
        total_sales = len(orders.filtered(lambda order: order.status == 'delivered'))
        total_amount_collected = sum(orders.mapped('received_amount'))
        total_amount_due = sum(orders.mapped('due_amount'))
        total_sale_value = sum(orders.mapped('total_price'))

        recent_orders = orders.sorted(lambda order: order.create_date or order.id, reverse=True)[:5]

        return {
            'total_orders': total_orders,
            'total_sales': total_sales,
            'total_amount_collected': total_amount_collected,
            'total_amount_due': total_amount_due,
            'total_sale_value': total_sale_value,
            'recent_orders': [
                {
                    'id': order.id,
                    'name': order.name,
                    'customer': order.partner_id.name or 'Unknown',
                    'status': order.status,
                    'total_price': order.total_price,
                    'received_amount': order.received_amount,
                    'due_amount': order.due_amount,
                }
                for order in recent_orders
            ],
        }
