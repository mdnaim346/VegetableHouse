from odoo import api, models, fields


class Users(models.Model):
    _inherit = "res.users"

    address = fields.Text(string='Address')

    @api.model
    def register_vegetable_user(self, name, login, email, password, address):
        """
        Create a new internal (non-admin) Odoo user.
        Called from the OWL Register form via orm.call().
        Uses sudo() so that the registration doesn't fail due to 
        the current user's (public/limited) permissions.
        """
        if not name or not login or not email or not password:
            return {'success': False, 'message': 'All required fields must be filled.'}

        # Check for duplicate username (login)
        existing_login = self.sudo().search([('login', '=', login)], limit=1)
        if existing_login:
            return {'success': False, 'message': 'Username already taken. Please choose another.'}

        # Check for duplicate email
        existing_email = self.sudo().search([('email', '=', email)], limit=1)
        if existing_email:
            return {'success': False, 'message': 'Email address is already registered.'}

        try:
            # Basic groups for a vegetable user:
            # 1. Internal User (base access)
            # 2. Sales / User: Own Documents Only (for sale.order access)
            internal_group = self.env.ref('base.group_user')
            sales_user_group = self.env.ref('sales_team.group_sale_salesman')

            group_ids = [internal_group.id]
            if sales_user_group:
                group_ids.append(sales_user_group.id)

            # Create the new user with sudo
            new_user = self.sudo().create({
                'name': name,
                'login': login,
                'email': email,
                'password': password,
                'address': address or '',
                'groups_id': [(6, 0, group_ids)],
            })

            return {
                'success': True,
                'message': f'Account created! Welcome, {name}. Please sign in.',
                'user_id': new_user.id,
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Could not create account: {str(e)}',
            }