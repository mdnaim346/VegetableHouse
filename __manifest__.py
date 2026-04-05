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
            
            
        ],
        'web.assets_frontend': [
           
        ],
        
    },
    
}
