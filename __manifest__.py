# -*- coding: utf-8 -*-
{
    'name' : 'Vegetable House',
    'version' : '1.2',
    'sequence': 10,
    'summary': 'Simple Vegetable Management',
    'description': """
    """,
    'depends': ['sale'],
    'data': [
        'security/ir.model.access.csv',
        'views/vegetable.xml',
        'views/sale_order.xml',
        
        
    ],
    
    'installable': True,
    'application': True,
   
    'assets': {
        'web.assets_backend': [
            'vegetable_house/static/src/components/Vegetable/Login/login.js',
            'vegetable_house/static/src/components/Vegetable/Login/login.xml',
            'vegetable_house/static/src/components/Vegetable/AdminDashboard/admin_dashboard.js',
            'vegetable_house/static/src/components/Vegetable/AdminDashboard/admin_dashboard.xml',
            'vegetable_house/static/src/components/Vegetable/vegetable.js',
            'vegetable_house/static/src/components/Vegetable/vegetable.xml',
        ],
        'web.assets_frontend': [
        ],
    },
    
}
