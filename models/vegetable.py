from odoo import models, fields

class Vegetable(models.Model):
    _name="vegetable.house"
    _description="Vegetable House"

    name= fields.Char(string="Vegetable Name",required = True)
    image= fields.Binary(string="Image")
    description=fields.Text(string="Description")
    availibility=fields.Boolean(string="Availability",default=True)
    price_kg=fields.Float(string="Price per KG", digits=(10, 2), default=0.0)
    price_piece=fields.Float(string="Price per Piece", digits=(10, 2), default=0.0)


 