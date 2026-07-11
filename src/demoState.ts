import {
  RestaurantState,
  TableStatus,
  OrderStatus,
  Role,
} from "./types";

export const DEMO_STATE: RestaurantState = {
  "users": [
    {
      "pin": "2222",
      "role": "WAITER",
      "name": "Juan (Mozo)",
      "id": "u1"
    },
    {
      "name": "Carlos (Cocina)",
      "id": "u2",
      "pin": "3333",
      "role": "KITCHEN"
    },
    {
      "name": "Don Ricardo (Admin)",
      "id": "u3",
      "pin": "1234",
      "role": "ADMIN"
    }
  ],
  "reservations": [],
  "tables": [
    {
      "zone": "Salón Principal",
      "id": "t1",
      "seats": 2,
      "y": 10,
      "status": "FREE",
      "x": 10,
      "number": 1
    },
    {
      "seats": 4,
      "zone": "Salón Principal",
      "id": "t2",
      "status": "FREE",
      "x": 30,
      "y": 10,
      "number": 2
    },
    {
      "id": "t3",
      "zone": "Salón Principal",
      "seats": 4,
      "number": 3,
      "x": 50,
      "status": "FREE",
      "y": 10
    },
    {
      "number": 4,
      "status": "FREE",
      "y": 40,
      "x": 10,
      "seats": 6,
      "id": "t4",
      "zone": "Terraza"
    },
    {
      "y": 40,
      "x": 30,
      "status": "FREE",
      "number": 5,
      "zone": "Terraza",
      "id": "t5",
      "seats": 2
    },
    {
      "zone": "VIP",
      "id": "t6",
      "seats": 8,
      "status": "FREE",
      "y": 40,
      "x": 65,
      "number": 6
    },
    {
      "zone": "Salón Principal",
      "id": "t7",
      "seats": 4,
      "number": 7,
      "status": "FREE",
      "y": 10,
      "x": 70
    },
    {
      "id": "t8",
      "zone": "Terraza",
      "seats": 2,
      "x": 50,
      "y": 40,
      "status": "FREE",
      "number": 8
    }
  ],
  "ingredients": [
    {
      "unit": "g",
      "minStock": 500,
      "id": "i1",
      "stock": 4200,
      "name": "Queso Artesanal"
    },
    {
      "unit": "g",
      "minStock": 400,
      "name": "Embutidos Ibéricos",
      "stock": 2600,
      "id": "i2"
    },
    {
      "unit": "g",
      "minStock": 500,
      "id": "i3",
      "stock": 3000,
      "name": "Corvina Fresca"
    },
    {
      "unit": "g",
      "minStock": 600,
      "id": "i4",
      "name": "Lomo Fino",
      "stock": 5100
    },
    {
      "name": "Papas Rústicas",
      "stock": 9550,
      "id": "i5",
      "minStock": 1000,
      "unit": "g"
    },
    {
      "stock": 2400,
      "name": "Pasta Fresca",
      "id": "i6",
      "minStock": 300,
      "unit": "g"
    },
    {
      "minStock": 400,
      "unit": "g",
      "id": "i7",
      "stock": 2700,
      "name": "Salmón Atlántico"
    },
    {
      "id": "i8",
      "name": "Mascarpone",
      "stock": 1700,
      "unit": "g",
      "minStock": 200
    },
    {
      "name": "Arroz Arborio",
      "stock": 5000,
      "id": "i9",
      "minStock": 500,
      "unit": "g"
    }
  ],
  "loyaltyTxs": [],
  "products": [
    {
      "categoryId": "cat_especialidades",
      "isAvailable": true,
      "price": 12000,
      "allergens": [
        "Mariscos",
        "Lácteos"
      ],
      "recipe": [],
      "requiresKitchen": true,
      "name": "Camarones de Hierro al Ajo de Hacienda",
      "id": "p_esp1",
      "imageUrl": "https://images.unsplash.com/photo-1559737558-2f4a72700288?w=400&q=80",
      "description": "Camarones flambeados y sellados en hierro, apagados con vino reserva y terminados con ajo confitado, mantequilla avellanada y hierbas frescas."
    },
    {
      "name": "Ceviche Hacienda",
      "id": "p_esp2",
      "imageUrl": "https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=400&q=80",
      "description": "Pulpo, salmón, atún y camarón ecuatoriano con leche de tigre de la casa, palta y láminas de camote frito.",
      "price": 13500,
      "isAvailable": true,
      "categoryId": "cat_especialidades",
      "allergens": [
        "Pescado",
        "Mariscos"
      ],
      "requiresKitchen": true,
      "recipe": []
    },
    {
      "description": "Machas gratinadas con mantequilla al merkén, vino blanco y queso mantecoso y un toque de limón sutil.",
      "imageUrl": "https://images.unsplash.com/photo-1608797178974-15b35a61d121?w=400&q=80",
      "id": "p_esp3",
      "name": "Machas al estilo Hacienda",
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [
        "Mariscos",
        "Lácteos"
      ],
      "categoryId": "cat_especialidades",
      "price": 17000,
      "isAvailable": true
    },
    {
      "id": "p_esp4",
      "name": "Camarones Hacienda",
      "description": "Camarón ecuatoriano flameados terminados con mantequilla al merkén, tomate cherry confitado y albahaca fresca.",
      "imageUrl": "https://images.unsplash.com/photo-1559737558-2f4a72700288?w=400&q=80",
      "price": 12000,
      "categoryId": "cat_especialidades",
      "isAvailable": true,
      "allergens": [
        "Mariscos",
        "Lácteos"
      ],
      "requiresKitchen": true,
      "recipe": []
    },
    {
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Pescado",
        "Mariscos",
        "Lácteos"
      ],
      "categoryId": "cat_especialidades",
      "price": 18500,
      "isAvailable": true,
      "imageUrl": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80",
      "description": "Salmón sellado con ajo confitado y mantequilla, acompañado de cremoso de arroz con camarones.",
      "name": "Salmón finca",
      "id": "p_esp5"
    },
    {
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Pescado",
        "Gluten"
      ],
      "price": 14500,
      "isAvailable": true,
      "categoryId": "cat_especialidades",
      "description": "Merluza sellada en mantequilla avellanada con papas fritas al romesco y espárragos grillados.",
      "imageUrl": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80",
      "id": "p_esp6",
      "name": "Dominio de merluza al romesco"
    },
    {
      "description": "Congrio con salsa de marisco acompañado con puré de habas y hortalizas frescas al limón.",
      "imageUrl": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80",
      "id": "p_esp7",
      "name": "Congrio aposento",
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [
        "Pescado",
        "Mariscos"
      ],
      "categoryId": "cat_especialidades",
      "price": 19000,
      "isAvailable": true
    },
    {
      "categoryId": "cat_especialidades",
      "price": 17500,
      "isAvailable": true,
      "allergens": [
        "Mariscos"
      ],
      "requiresKitchen": true,
      "recipe": [],
      "name": "Pulpo solar",
      "id": "p_esp8",
      "imageUrl": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80",
      "description": "Pulpo grillado con mantequilla al merkén, puré de camote y verduras salteadas de temporada."
    },
    {
      "allergens": [
        "Lácteos"
      ],
      "recipe": [],
      "requiresKitchen": true,
      "price": 16000,
      "isAvailable": true,
      "categoryId": "cat_especialidades",
      "id": "p_esp9",
      "name": "Lomo liso Estancia",
      "description": "Lomo liso grillado, tomate asado y chimichurri hacienda acompañado de pastelera de choclo.",
      "imageUrl": "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80"
    },
    {
      "imageUrl": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80",
      "description": "Corte de costilla de vacuno preparado en cocción muy lenta, acompañado de pastelera de choclo y toques de albahaca.",
      "name": "Asado de Tira a cocción lenta",
      "id": "p_esp10",
      "categoryId": "cat_especialidades",
      "price": 19000,
      "isAvailable": true,
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Lácteos"
      ]
    },
    {
      "name": "Costillar de cerdo caramelizado",
      "id": "p_esp11",
      "imageUrl": "https://images.unsplash.com/photo-1543353071-10c8ba85a904?w=400&q=80",
      "description": "Costillar de cerdo preparado a cocción lenta caramelizado y acompañado de papas cuña y crema ácida.",
      "categoryId": "cat_especialidades",
      "isAvailable": true,
      "price": 13500,
      "allergens": [
        "Lácteos"
      ],
      "recipe": [],
      "requiresKitchen": true
    },
    {
      "imageUrl": "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&q=80",
      "description": "Arroz rizzoteado en una deliciosa y cremosa salsa de champiñones.",
      "name": "Risotto de champiñones",
      "id": "p_esp12",
      "categoryId": "cat_especialidades",
      "price": 11500,
      "isAvailable": true,
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Lácteos"
      ]
    },
    {
      "allergens": [
        "Mariscos",
        "Lácteos"
      ],
      "recipe": [],
      "requiresKitchen": true,
      "categoryId": "cat_especialidades",
      "price": 12500,
      "isAvailable": true,
      "name": "Risotto de camarón",
      "id": "p_esp13",
      "imageUrl": "https://images.unsplash.com/photo-1559737558-2f4a72700288?w=400&q=80",
      "description": "Arroz rizzoteado en una salsa de marisco con camarón ecuatoriano salteados en mantequilla con vino blanco y queso mantecoso."
    },
    {
      "id": "p_esp14",
      "name": "Fetuccini al pesto",
      "description": "Fetuccini cocidos con laurel y aceite de oliva, en una salsa verde acompañada de pechuga de pollo.",
      "imageUrl": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&q=80",
      "isAvailable": true,
      "categoryId": "cat_especialidades",
      "price": 11500,
      "allergens": [
        "Gluten",
        "Lácteos"
      ],
      "requiresKitchen": true,
      "recipe": []
    },
    {
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Gluten",
        "Mariscos"
      ],
      "price": 13000,
      "isAvailable": true,
      "categoryId": "cat_especialidades",
      "description": "Fetuccini cocido con laurel y aceite de oliva acompañado de camarones ecuatorianos.",
      "imageUrl": "https://images.unsplash.com/photo-1559737558-2f4a72700288?w=400&q=80",
      "id": "p_esp15",
      "name": "Fetuccini al camarón"
    },
    {
      "name": "Mariscal caliente",
      "id": "p_esp16",
      "imageUrl": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80",
      "description": "Mariscos surtidos calientes preparados al estilo de la casa.",
      "allergens": [
        "Mariscos"
      ],
      "recipe": [],
      "requiresKitchen": true,
      "price": 8000,
      "isAvailable": true,
      "categoryId": "cat_especialidades"
    },
    {
      "categoryId": "cat_especialidades",
      "isAvailable": true,
      "price": 12000,
      "allergens": [
        "Mariscos",
        "Pescado"
      ],
      "recipe": [],
      "requiresKitchen": true,
      "id": "p_esp17",
      "name": "Paila marina",
      "description": "Sopa tradicional de mariscos y pescados de la zona.",
      "imageUrl": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80"
    },
    {
      "imageUrl": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80",
      "description": "Guiso cremoso de jaiba gratinado con queso.",
      "name": "Chupe de jaiva",
      "id": "p_esp18",
      "categoryId": "cat_especialidades",
      "isAvailable": true,
      "price": 9000,
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [
        "Mariscos",
        "Lácteos",
        "Gluten"
      ]
    },
    {
      "description": "Guiso cremoso de locos picados gratinado con queso.",
      "imageUrl": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80",
      "id": "p_esp19",
      "name": "Chupe de locos",
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Mariscos",
        "Lácteos",
        "Gluten"
      ],
      "categoryId": "cat_especialidades",
      "price": 13000,
      "isAvailable": true
    },
    {
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Mariscos",
        "Pescado"
      ],
      "isAvailable": true,
      "price": 18000,
      "categoryId": "cat_especialidades",
      "description": "Selección premium de mariscos y pescados fríos para compartir.",
      "imageUrl": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80",
      "id": "p_esp20",
      "name": "Jardín marino"
    },
    {
      "isAvailable": true,
      "categoryId": "cat_carnes",
      "price": 12000,
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [],
      "description": "Corte de carne de vacuno con cebolla caramelizada, huevo y papas fritas.",
      "imageUrl": "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80",
      "id": "p_car1",
      "name": "Bistec a lo pobre"
    },
    {
      "allergens": [],
      "recipe": [],
      "requiresKitchen": true,
      "categoryId": "cat_carnes",
      "isAvailable": true,
      "price": 10000,
      "id": "p_car2",
      "name": "Bistec con agregado",
      "description": "Acompañamiento a elección: Arroz, papas fritas, tallarines o puré de camote.",
      "imageUrl": "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80"
    },
    {
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [],
      "categoryId": "cat_carnes",
      "isAvailable": true,
      "price": 8000,
      "description": "Carne de vacuno acompañado de tomate y palta.",
      "imageUrl": "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80",
      "id": "p_car3",
      "name": "Churrasco al plato"
    },
    {
      "allergens": [],
      "recipe": [],
      "requiresKitchen": true,
      "categoryId": "cat_carnes",
      "isAvailable": true,
      "price": 14500,
      "id": "p_car4",
      "name": "Lomo a lo pobre",
      "description": "Corte de lomo liso con papas fritas, cebolla caramelizada y huevo frito.",
      "imageUrl": "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80"
    },
    {
      "name": "Lomo con agregado",
      "id": "p_car5",
      "imageUrl": "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80",
      "description": "Acompañamiento a elección: Arroz, papas fritas, tallarines o puré de camote.",
      "isAvailable": true,
      "price": 13500,
      "categoryId": "cat_carnes",
      "allergens": [],
      "requiresKitchen": true,
      "recipe": []
    },
    {
      "name": "Pechuga a lo pobre",
      "id": "p_car6",
      "imageUrl": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
      "description": "Pechuga de pollo a la plancha con cebolla caramelizada, papas fritas y huevo.",
      "allergens": [],
      "recipe": [],
      "requiresKitchen": true,
      "isAvailable": true,
      "price": 9500,
      "categoryId": "cat_carnes"
    },
    {
      "categoryId": "cat_carnes",
      "isAvailable": true,
      "price": 8000,
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [],
      "imageUrl": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
      "description": "Acompañamiento a elección: Arroz, papas fritas, tallarines o puré de camote.",
      "name": "Pechuga con agregado",
      "id": "p_car7"
    },
    {
      "categoryId": "cat_carnes",
      "isAvailable": true,
      "price": 14500,
      "allergens": [
        "Lácteos"
      ],
      "recipe": [],
      "requiresKitchen": true,
      "id": "p_car8",
      "name": "Lomo con salsa de champiñón",
      "description": "Lomo bañado en salsa de champiñones con arroz, papas fritas, tallarines o puré de camote.",
      "imageUrl": "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80"
    },
    {
      "price": 12000,
      "isAvailable": true,
      "categoryId": "cat_carnes",
      "allergens": [
        "Lácteos"
      ],
      "recipe": [],
      "requiresKitchen": true,
      "name": "Pechuga en salsa de champiñones",
      "id": "p_car9",
      "imageUrl": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
      "description": "Pechuga bañada en salsa de champiñones con arroz, papas fritas, tallarines o puré de camote."
    },
    {
      "allergens": [
        "Gluten"
      ],
      "requiresKitchen": true,
      "recipe": [],
      "price": 13000,
      "isAvailable": true,
      "categoryId": "cat_carnes",
      "name": "Lomo saltado",
      "id": "p_car10",
      "imageUrl": "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80",
      "description": "Tiras de lomo liso salteados con verduras frescas, acompañado de arroz y papas fritas."
    },
    {
      "categoryId": "cat_carnes",
      "price": 10000,
      "isAvailable": true,
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Gluten"
      ],
      "imageUrl": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
      "description": "Tiras de pollo salteados con verduras frescas, acompañado de arroz y papas fritas.",
      "name": "Pollo saltado",
      "id": "p_car11"
    },
    {
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Gluten"
      ],
      "categoryId": "cat_carnes",
      "isAvailable": true,
      "price": 45000,
      "imageUrl": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80",
      "description": "4 cortes de lomo, 3 trozos de pollo, 3 chuletas de cerdo y 4 longanizas. Acompañada de papas cocidas, pebre, sopaipillas y ensalada.",
      "name": "Parrilla (4 a 5 personas) básica",
      "id": "p_car12"
    },
    {
      "imageUrl": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80",
      "description": "4 cortes de lomo, 3 trozos de pollo, 3 chuletas de cerdo, 4 longanizas y 4 chunchules. Acompañada de papas cocidas, pebre, sopaipillas y ensalada.",
      "name": "Parrilla (4 a 5 personas) con chunchules",
      "id": "p_car13",
      "categoryId": "cat_carnes",
      "price": 49000,
      "isAvailable": true,
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [
        "Gluten"
      ]
    },
    {
      "description": "2 cortes de lomo, 2 trozos de pollo, 2 chuletas de cerdo y 2 longanizas. Acompañada de papas cocidas, pebre, sopaipillas y ensalada.",
      "imageUrl": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80",
      "id": "p_car14",
      "name": "Parrilla (2 personas) básica",
      "categoryId": "cat_carnes",
      "price": 34000,
      "isAvailable": true,
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [
        "Gluten"
      ]
    },
    {
      "imageUrl": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80",
      "description": "2 cortes de lomo, 2 trozos de pollo, 2 chuletas de cerdo, 2 longanizas y 2 chunchules. Acompañada de papas cocidas, pebre, sopaipillas y ensalada.",
      "name": "Parrilla Especial con chunchules (2 personas)",
      "id": "p_car15",
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [
        "Gluten"
      ],
      "price": 37000,
      "isAvailable": true,
      "categoryId": "cat_carnes"
    },
    {
      "categoryId": "cat_menu_ejecutivo",
      "price": 7000,
      "isAvailable": true,
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Gluten"
      ],
      "imageUrl": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
      "description": "Tiras de pollo salteadas con cebollín en salsa de soya.",
      "name": "Pollo mongoliano",
      "id": "p_exec1"
    },
    {
      "name": "Carne mongoliana",
      "id": "p_exec2",
      "imageUrl": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80",
      "description": "Tiras de carne de vacuno salteadas con cebollín en salsa de soya.",
      "price": 7500,
      "categoryId": "cat_menu_ejecutivo",
      "isAvailable": true,
      "allergens": [
        "Gluten"
      ],
      "recipe": [],
      "requiresKitchen": true
    },
    {
      "description": "Chuleta de cerdo asada a la plancha.",
      "imageUrl": "https://images.unsplash.com/photo-1543353071-10c8ba85a904?w=400&q=80",
      "id": "p_exec3",
      "name": "Chuleta a la plancha",
      "price": 7000,
      "categoryId": "cat_menu_ejecutivo",
      "isAvailable": true,
      "requiresKitchen": true,
      "recipe": [],
      "allergens": []
    },
    {
      "isAvailable": true,
      "price": 7000,
      "categoryId": "cat_menu_ejecutivo",
      "allergens": [],
      "recipe": [],
      "requiresKitchen": true,
      "name": "Chuleta agridulce",
      "id": "p_exec4",
      "imageUrl": "https://images.unsplash.com/photo-1543353071-10c8ba85a904?w=400&q=80",
      "description": "Chuleta de cerdo bañada en salsa agridulce especial."
    },
    {
      "isAvailable": true,
      "categoryId": "cat_menu_ejecutivo",
      "price": 8000,
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Lácteos"
      ],
      "description": "Filete de pollo bañado en crema de leche y especias.",
      "imageUrl": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
      "id": "p_exec5",
      "name": "Pollo a la crema"
    },
    {
      "id": "p_exec6",
      "name": "Cremoso de champiñón con palta",
      "description": "Guiso cremoso de champiñones servido con palta.",
      "imageUrl": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80",
      "allergens": [
        "Lácteos"
      ],
      "requiresKitchen": true,
      "recipe": [],
      "price": 8500,
      "isAvailable": true,
      "categoryId": "cat_menu_ejecutivo"
    },
    {
      "categoryId": "cat_menu_ejecutivo",
      "isAvailable": true,
      "price": 8500,
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [
        "Mariscos",
        "Lácteos"
      ],
      "imageUrl": "https://images.unsplash.com/photo-1559737558-2f4a72700288?w=400&q=80",
      "description": "Guiso cremoso de camarones acompañado de verduras de temporada salteadas.",
      "name": "Cremoso de camarones y verduras salteadas",
      "id": "p_exec7"
    },
    {
      "description": "200 gr de carne de vacuno con queso fundido. Acompañado de papas fritas.",
      "imageUrl": "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400&q=80",
      "id": "p_snd1",
      "name": "Barros luco",
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [
        "Gluten",
        "Lácteos"
      ],
      "categoryId": "cat_sandwichs",
      "price": 6000,
      "isAvailable": true
    },
    {
      "description": "200 gr de carne de vacuno, palta, tomate y mayonesa. Acompañado de papas fritas.",
      "imageUrl": "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400&q=80",
      "id": "p_snd2",
      "name": "Sándwich Italiano",
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [
        "Gluten"
      ],
      "categoryId": "cat_sandwichs",
      "price": 6000,
      "isAvailable": true
    },
    {
      "allergens": [
        "Gluten"
      ],
      "recipe": [],
      "requiresKitchen": true,
      "price": 7000,
      "isAvailable": true,
      "categoryId": "cat_sandwichs",
      "name": "Sándwich Chacarero",
      "id": "p_snd3",
      "imageUrl": "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400&q=80",
      "description": "200 gr de carne de vacuno, tomate, poroto verde y ají verde. Acompañado de papas fritas."
    },
    {
      "description": "Filete de pollo a la plancha desmenuzado con mayonesa. Acompañado de papas fritas.",
      "imageUrl": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
      "id": "p_snd4",
      "name": "Sándwich Ave mayo",
      "categoryId": "cat_sandwichs",
      "isAvailable": true,
      "price": 5500,
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [
        "Gluten"
      ]
    },
    {
      "allergens": [
        "Gluten"
      ],
      "recipe": [],
      "requiresKitchen": true,
      "categoryId": "cat_sandwichs",
      "price": 5500,
      "isAvailable": true,
      "name": "Sándwich Ave italiano",
      "id": "p_snd5",
      "imageUrl": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
      "description": "Filete de pollo a la plancha, tomate, palta y mayonesa. Acompañado de papas fritas."
    },
    {
      "allergens": [
        "Gluten",
        "Lácteos"
      ],
      "recipe": [],
      "requiresKitchen": true,
      "price": 6500,
      "isAvailable": true,
      "categoryId": "cat_sandwichs",
      "name": "Sándwich Campesino",
      "id": "p_snd6",
      "imageUrl": "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400&q=80",
      "description": "Filete de pollo, queso fundido, champiñones y choclo. Acompañado de papas fritas."
    },
    {
      "id": "p_snd7",
      "name": "Pichanga para 2 personas",
      "description": "Base de papas fritas cubierta con trozos de carne de vacuno, pollo, cerdo, salchicha, tomate, palta, huevo duro y queso fundido.",
      "imageUrl": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80",
      "allergens": [
        "Lácteos"
      ],
      "recipe": [],
      "requiresKitchen": true,
      "isAvailable": true,
      "price": 12000,
      "categoryId": "cat_sandwichs"
    },
    {
      "isAvailable": true,
      "categoryId": "cat_sandwichs",
      "price": 22000,
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Lácteos"
      ],
      "description": "Base de papas fritas cubierta con trozos de carne de vacuno, pollo, cerdo, salchicha, tomate, palta, huevo duro y queso fundido.",
      "imageUrl": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80",
      "id": "p_snd8",
      "name": "Pichanga para 4 personas"
    },
    {
      "id": "p_snd9",
      "name": "Pichanga mar y tierra",
      "description": "Base de papas fritas cubierta con trozos de carne de vacuno, pollo, camarones, pulpo, aros de calamar, palta, pimentones, cebolla morada y queso fundido.",
      "imageUrl": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80",
      "categoryId": "cat_sandwichs",
      "isAvailable": true,
      "price": 14000,
      "allergens": [
        "Mariscos",
        "Lácteos"
      ],
      "requiresKitchen": true,
      "recipe": []
    },
    {
      "price": 12000,
      "categoryId": "cat_sandwichs",
      "isAvailable": true,
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [],
      "description": "Base de papas fritas cubierta con trozos de carne de vacuno, pollo, salchicha, cebolla caramelizada y huevo frito.",
      "imageUrl": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80",
      "id": "p_snd10",
      "name": "Chorrillana para 2 personas"
    },
    {
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [],
      "isAvailable": true,
      "categoryId": "cat_sandwichs",
      "price": 22000,
      "imageUrl": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80",
      "description": "Base de papas fritas cubierta con trozos de carne de vacuno, pollo, salchicha, cebolla caramelizada y huevo frito.",
      "name": "Chorrillana para 4 personas",
      "id": "p_snd11"
    },
    {
      "id": "p_snd12",
      "name": "Completo Italiano",
      "description": "Pan de completo, vienesa, tomate, palta y mayonesa.",
      "imageUrl": "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400&q=80",
      "categoryId": "cat_sandwichs",
      "price": 2500,
      "isAvailable": true,
      "allergens": [
        "Gluten"
      ],
      "recipe": [],
      "requiresKitchen": true
    },
    {
      "isAvailable": true,
      "categoryId": "cat_sandwichs",
      "price": 2000,
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [
        "Gluten"
      ],
      "description": "Pan de completo, vienesa, chucrut, salsa americana y mayonesa.",
      "imageUrl": "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=400&q=80",
      "id": "p_snd13",
      "name": "Completo Chucrut"
    },
    {
      "imageUrl": "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=400&q=80",
      "description": "Pan de completo, vienesa, tomate, palta, chucrut, salsa americana y mayonesa.",
      "name": "Completo Dinámico",
      "id": "p_snd14",
      "categoryId": "cat_sandwichs",
      "price": 3000,
      "isAvailable": true,
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [
        "Gluten"
      ]
    },
    {
      "imageUrl": "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=400&q=80",
      "description": "Pan de completo, vienesa, palta y mayonesa.",
      "name": "Completo Especial palta",
      "id": "p_snd15",
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Gluten"
      ],
      "price": 2500,
      "isAvailable": true,
      "categoryId": "cat_sandwichs"
    },
    {
      "allergens": [],
      "requiresKitchen": true,
      "recipe": [],
      "isAvailable": true,
      "price": 3000,
      "categoryId": "cat_ensaladas",
      "name": "Papas Fritas Medianas",
      "id": "p_sal1",
      "imageUrl": "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&q=80",
      "description": "Porción mediana de papas fritas crujientes."
    },
    {
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [],
      "price": 5000,
      "categoryId": "cat_ensaladas",
      "isAvailable": true,
      "description": "Porción familiar de papas fritas crujientes.",
      "imageUrl": "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&q=80",
      "id": "p_sal2",
      "name": "Papas Fritas Grandes"
    },
    {
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Gluten",
        "Lácteos"
      ],
      "isAvailable": true,
      "price": 8500,
      "categoryId": "cat_ensaladas",
      "description": "Ensalada césar tradicional, con lechuga fresca, crutones, queso parmesano y trozos de pollo a la plancha.",
      "imageUrl": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
      "id": "p_sal3",
      "name": "Ensalada César pollo"
    },
    {
      "id": "p_sal4",
      "name": "Ensalada César camarón",
      "description": "Ensalada césar tradicional, con lechuga fresca, crutones, queso parmesano y camarones ecuatorianos salteados.",
      "imageUrl": "https://images.unsplash.com/photo-1559737558-2f4a72700288?w=400&q=80",
      "allergens": [
        "Gluten",
        "Lácteos",
        "Mariscos"
      ],
      "recipe": [],
      "requiresKitchen": true,
      "isAvailable": true,
      "price": 9900,
      "categoryId": "cat_ensaladas"
    },
    {
      "isAvailable": true,
      "price": 5000,
      "categoryId": "cat_ensaladas",
      "allergens": [],
      "recipe": [],
      "requiresKitchen": true,
      "name": "Ensalada mixta",
      "id": "p_sal5",
      "imageUrl": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
      "description": "Ensalada fresca surtida de la estación."
    },
    {
      "id": "p_trg1",
      "name": "Pisco sour",
      "description": "Preparación de la casa con pisco chileno, limón y jarabe de goma.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "price": 3500,
      "categoryId": "cat_tragos",
      "isAvailable": true,
      "allergens": [],
      "recipe": [],
      "requiresKitchen": true
    },
    {
      "categoryId": "cat_tragos",
      "price": 4000,
      "isAvailable": true,
      "allergens": [],
      "requiresKitchen": true,
      "recipe": [],
      "name": "Pisco sour sabores",
      "id": "p_trg2",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "description": "Sabores variados según temporada."
    },
    {
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 5500,
      "allergens": [],
      "requiresKitchen": true,
      "recipe": [],
      "name": "Whisky sour",
      "id": "p_trg3",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "description": "Whisky, jugo de limón y jarabe de goma."
    },
    {
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 3500,
      "allergens": [],
      "recipe": [],
      "requiresKitchen": true,
      "name": "Amaretto sour",
      "id": "p_trg4",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "description": "Licor de almendras Amaretto, jugo de limón y jarabe de goma."
    },
    {
      "name": "Tropical gin",
      "id": "p_trg5",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "description": "Gin mezclado con bebida energizante tropical o frutas.",
      "allergens": [],
      "requiresKitchen": true,
      "recipe": [],
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 6000
    },
    {
      "id": "p_trg6",
      "name": "Tropical gin sabores",
      "description": "Variedad de sabores tropicales.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "categoryId": "cat_tragos",
      "isAvailable": true,
      "price": 6000,
      "allergens": [],
      "requiresKitchen": true,
      "recipe": []
    },
    {
      "categoryId": "cat_tragos",
      "price": 5000,
      "isAvailable": true,
      "allergens": [],
      "recipe": [],
      "requiresKitchen": true,
      "id": "p_trg7",
      "name": "Mojito clásico",
      "description": "Ron blanco, menta fresca, limón de pica, azúcar de caña y agua gasificada.",
      "imageUrl": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80"
    },
    {
      "categoryId": "cat_tragos",
      "isAvailable": true,
      "price": 5500,
      "allergens": [],
      "recipe": [],
      "requiresKitchen": true,
      "id": "p_trg8",
      "name": "Mojito Frambuesa",
      "description": "Mojito con frambuesas frescas.",
      "imageUrl": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80"
    },
    {
      "id": "p_trg9",
      "name": "Mojito Maracuyá",
      "description": "Mojito con pulpa de maracuyá.",
      "imageUrl": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80",
      "allergens": [],
      "requiresKitchen": true,
      "recipe": [],
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 5500
    },
    {
      "allergens": [],
      "recipe": [],
      "requiresKitchen": true,
      "price": 5500,
      "categoryId": "cat_tragos",
      "isAvailable": true,
      "name": "Mojito Frutilla",
      "id": "p_trg10",
      "imageUrl": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80",
      "description": "Mojito con frutillas frescas."
    },
    {
      "imageUrl": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80",
      "description": "Mojito con arándanos frescos.",
      "name": "Mojito Arándano",
      "id": "p_trg11",
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [],
      "price": 5500,
      "isAvailable": true,
      "categoryId": "cat_tragos"
    },
    {
      "allergens": [],
      "recipe": [],
      "requiresKitchen": true,
      "price": 6000,
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "id": "p_trg12",
      "name": "Ramazzotti rosato tonic",
      "description": "Aperitivo Ramazzotti Rosato con agua tónica.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80"
    },
    {
      "allergens": [],
      "requiresKitchen": true,
      "recipe": [],
      "categoryId": "cat_tragos",
      "price": 6000,
      "isAvailable": true,
      "name": "Ramazzotti violetto",
      "id": "p_trg13",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "description": "Aperitivo Ramazzotti Violetto con tónica."
    },
    {
      "description": "Aperol, espumante Prosecco y un toque de agua con gas.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "id": "p_trg14",
      "name": "Aperol Spritz",
      "isAvailable": true,
      "price": 5500,
      "categoryId": "cat_tragos",
      "requiresKitchen": true,
      "recipe": [],
      "allergens": []
    },
    {
      "price": 6000,
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [],
      "description": "Ginebra y vermut seco con aceituna.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "id": "p_trg15",
      "name": "Martini Dry"
    },
    {
      "price": 5500,
      "categoryId": "cat_tragos",
      "isAvailable": true,
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Lácteos"
      ],
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "description": "Ron blanco, crema de coco y jugo de piña.",
      "name": "Piña colada",
      "id": "p_trg16"
    },
    {
      "isAvailable": true,
      "price": 5000,
      "categoryId": "cat_tragos",
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [],
      "description": "Cachaça brasileña, limón y azúcar de caña machacada.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "id": "p_trg17",
      "name": "Caipiriña"
    },
    {
      "description": "Vodka, limón y azúcar de caña machacada.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "id": "p_trg18",
      "name": "Caipiroska",
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 5000,
      "recipe": [],
      "requiresKitchen": true,
      "allergens": []
    },
    {
      "description": "Tequila, triple sec y jugo de limón fresco.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "id": "p_trg19",
      "name": "Tequila Margarita",
      "categoryId": "cat_tragos",
      "isAvailable": true,
      "price": 5000,
      "recipe": [],
      "requiresKitchen": true,
      "allergens": []
    },
    {
      "isAvailable": true,
      "price": 5000,
      "categoryId": "cat_tragos",
      "allergens": [],
      "recipe": [],
      "requiresKitchen": true,
      "id": "p_trg20",
      "name": "Tequila blue",
      "description": "Tequila con licor Blue Curaçao y limón.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80"
    },
    {
      "description": "Mezcla tradicional de pisco chileno y Drambuie.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "id": "p_trg21",
      "name": "Clavo oxidado",
      "price": 7500,
      "categoryId": "cat_tragos",
      "isAvailable": true,
      "recipe": [],
      "requiresKitchen": true,
      "allergens": []
    },
    {
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "description": "Pisco Mistral Nobel con un toque de manzana verde.",
      "name": "Nobel apple sour",
      "id": "p_trg22",
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [],
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 4500
    },
    {
      "price": 5000,
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Lácteos"
      ],
      "description": "Vodka, licor de café y crema de leche.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "id": "p_trg23",
      "name": "Ruso blanco"
    },
    {
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "description": "Vodka y licor de café.",
      "name": "Ruso negro",
      "id": "p_trg24",
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 4500,
      "recipe": [],
      "requiresKitchen": true,
      "allergens": []
    },
    {
      "allergens": [
        "Huevo"
      ],
      "requiresKitchen": true,
      "recipe": [],
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 5000,
      "name": "Pisco sour peruano",
      "id": "p_trg25",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "description": "Pisco peruano, jarabe de goma, jugo de limón y clara de huevo."
    },
    {
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [
        "Huevo"
      ],
      "categoryId": "cat_tragos",
      "price": 5000,
      "isAvailable": true,
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "description": "Cóctel tradicional de oporto, coñac, yema de huevo y canela.",
      "name": "La vaina",
      "id": "p_trg26"
    },
    {
      "description": "Mojito clásico servido con una cerveza Corona invertida.",
      "imageUrl": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80",
      "id": "p_trg27",
      "name": "Mojito corona",
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Gluten"
      ],
      "price": 7500,
      "isAvailable": true,
      "categoryId": "cat_tragos"
    },
    {
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [],
      "price": 5000,
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "description": "Mezcla de destilados y jugos naturales de frutas de estación.",
      "imageUrl": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
      "id": "p_trg28",
      "name": "Primavera Cóctel"
    },
    {
      "price": 5000,
      "categoryId": "cat_tragos",
      "isAvailable": true,
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [],
      "description": "Vodka, Blue Curaçao y bebida de limón.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "id": "p_trg29",
      "name": "Laguna azul"
    },
    {
      "categoryId": "cat_tragos",
      "price": 5000,
      "isAvailable": true,
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [],
      "description": "Preparación de pisco oscuro y gaseosas oscuras.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "id": "p_trg30",
      "name": "Darkita clásico"
    },
    {
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [],
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 6000,
      "description": "Ron con hielo picado y fruta a elección (frutilla, piña, etc.).",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "id": "p_trg31",
      "name": "Daikiri Sabores"
    },
    {
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [],
      "isAvailable": true,
      "price": 5000,
      "categoryId": "cat_tragos",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "description": "Tequila, jugo de naranja y granadina.",
      "name": "Tequila Sunrise",
      "id": "p_trg32"
    },
    {
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 5500,
      "requiresKitchen": true,
      "recipe": [],
      "allergens": [],
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "description": "Gin, jugo de limón, azúcar y agua con gas.",
      "name": "Tom collins",
      "id": "p_trg33"
    },
    {
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "description": "Corto de Gin con mezcla cítrica.",
      "name": "Shot collins",
      "id": "p_trg34",
      "isAvailable": true,
      "price": 6000,
      "categoryId": "cat_tragos",
      "requiresKitchen": true,
      "recipe": [],
      "allergens": []
    },
    {
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Lácteos"
      ],
      "categoryId": "cat_tragos",
      "isAvailable": true,
      "price": 5000,
      "description": "Baileys, Amaretto y crema de leche.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "id": "p_trg35",
      "name": "Orgasmo cóctel"
    },
    {
      "id": "p_trg36",
      "name": "Cosmopolitan",
      "description": "Vodka, triple sec, jugo de arándanos y jugo de limón fresco.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "allergens": [],
      "requiresKitchen": true,
      "recipe": [],
      "categoryId": "cat_tragos",
      "isAvailable": true,
      "price": 5000
    },
    {
      "allergens": [
        "Gluten"
      ],
      "recipe": [],
      "requiresKitchen": false,
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 2500,
      "name": "Cerveza Corona",
      "id": "p_trg37",
      "imageUrl": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80",
      "description": "Cerveza rubia embotellada de 355ml."
    },
    {
      "name": "Cerveza Miller",
      "id": "p_trg38",
      "imageUrl": "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=400&q=80",
      "description": "Cerveza Miller en botella de 355ml.",
      "categoryId": "cat_tragos",
      "price": 2500,
      "isAvailable": true,
      "allergens": [
        "Gluten"
      ],
      "requiresKitchen": false,
      "recipe": []
    },
    {
      "name": "Cerveza Austral calafate",
      "id": "p_trg39",
      "imageUrl": "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=400&q=80",
      "description": "Cerveza regional de especialidad con notas de calafate.",
      "allergens": [
        "Gluten"
      ],
      "requiresKitchen": false,
      "recipe": [],
      "price": 3500,
      "categoryId": "cat_tragos",
      "isAvailable": true
    },
    {
      "isAvailable": true,
      "price": 2500,
      "categoryId": "cat_tragos",
      "requiresKitchen": false,
      "recipe": [],
      "allergens": [
        "Gluten"
      ],
      "imageUrl": "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=400&q=80",
      "description": "Heineken 0.0 embotellada.",
      "name": "Cerveza Heineken sin alcohol",
      "id": "p_trg40"
    },
    {
      "description": "Vaso shopero de Kunstmann Torobayo de barril.",
      "imageUrl": "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=400&q=80",
      "id": "p_trg41",
      "name": "Cerveza Kunstmann torobayo Shop",
      "requiresKitchen": false,
      "recipe": [],
      "allergens": [
        "Gluten"
      ],
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 6000
    },
    {
      "name": "Cerveza Escudo Shop",
      "id": "p_trg42",
      "imageUrl": "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=400&q=80",
      "description": "Vaso shopero de Cerveza Escudo.",
      "allergens": [
        "Gluten"
      ],
      "recipe": [],
      "requiresKitchen": false,
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 4000
    },
    {
      "id": "p_trg43",
      "name": "Cerveza Royal Shop",
      "description": "Vaso shopero de Cerveza Royal Guard.",
      "imageUrl": "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=400&q=80",
      "allergens": [
        "Gluten"
      ],
      "requiresKitchen": false,
      "recipe": [],
      "isAvailable": true,
      "price": 5000,
      "categoryId": "cat_tragos"
    },
    {
      "categoryId": "cat_tragos",
      "isAvailable": true,
      "price": 5500,
      "allergens": [],
      "recipe": [],
      "requiresKitchen": false,
      "name": "Licor Jägermeister (corto)",
      "id": "p_trg44",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
      "description": "Licor alemán de hierbas digestivas sin bebida."
    },
    {
      "price": 7000,
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "allergens": [
        "Lácteos"
      ],
      "recipe": [],
      "requiresKitchen": false,
      "id": "p_trg45",
      "name": "Licor Baileys (corto)",
      "description": "Crema de licor irlandés sin bebida.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80"
    },
    {
      "allergens": [],
      "requiresKitchen": false,
      "recipe": [],
      "price": 6500,
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "id": "p_trg46",
      "name": "Licor Drambuie (corto)",
      "description": "Licor escocés de whisky y miel sin bebida.",
      "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80"
    },
    {
      "name": "Whisky Johnnie Walker red",
      "id": "p_trg47",
      "imageUrl": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80",
      "description": "Whisky Red Label sin bebida.",
      "allergens": [],
      "requiresKitchen": false,
      "recipe": [],
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 5000
    },
    {
      "description": "Whisky Black Label sin bebida.",
      "imageUrl": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80",
      "id": "p_trg48",
      "name": "Whisky Johnnie Walker Black",
      "categoryId": "cat_tragos",
      "price": 8000,
      "isAvailable": true,
      "recipe": [],
      "requiresKitchen": false,
      "allergens": []
    },
    {
      "allergens": [],
      "requiresKitchen": false,
      "recipe": [],
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 7000,
      "id": "p_trg49",
      "name": "Whisky Johnnie Walker Blonde",
      "description": "Whisky Johnnie Walker Blonde sin bebida.",
      "imageUrl": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80"
    },
    {
      "isAvailable": true,
      "price": 5000,
      "categoryId": "cat_tragos",
      "allergens": [],
      "recipe": [],
      "requiresKitchen": false,
      "name": "Whisky Ballantines Finest",
      "id": "p_trg50",
      "imageUrl": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80",
      "description": "Whisky Ballantines Finest sin bebida."
    },
    {
      "imageUrl": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80",
      "description": "Whisky Chivas Regal 12 años sin bebida.",
      "name": "Whisky Chivas Regal 12",
      "id": "p_trg51",
      "recipe": [],
      "requiresKitchen": false,
      "allergens": [],
      "categoryId": "cat_tragos",
      "price": 8000,
      "isAvailable": true
    },
    {
      "name": "Whisky Jack Daniels N7",
      "id": "p_trg52",
      "imageUrl": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80",
      "description": "Whisky Jack Daniels N7 sin bebida.",
      "allergens": [],
      "requiresKitchen": false,
      "recipe": [],
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 8000
    },
    {
      "requiresKitchen": false,
      "recipe": [],
      "allergens": [],
      "price": 8000,
      "categoryId": "cat_tragos",
      "isAvailable": true,
      "imageUrl": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80",
      "description": "Whisky Jack Daniels Honey con toque de miel sin bebida.",
      "name": "Whisky Jack Daniels Honey",
      "id": "p_trg53"
    },
    {
      "description": "Whisky Jack Daniels Gentleman Jack premium sin bebida.",
      "imageUrl": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80",
      "id": "p_trg54",
      "name": "Whisky Jack Daniels Gentleman",
      "categoryId": "cat_tragos",
      "isAvailable": true,
      "price": 9500,
      "recipe": [],
      "requiresKitchen": false,
      "allergens": []
    },
    {
      "description": "Pisco Mistral 35 grados sin bebida.",
      "imageUrl": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80",
      "id": "p_trg55",
      "name": "Pisco Mistral 35°",
      "price": 3500,
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "requiresKitchen": false,
      "recipe": [],
      "allergens": []
    },
    {
      "recipe": [],
      "requiresKitchen": false,
      "allergens": [],
      "categoryId": "cat_tragos",
      "price": 4500,
      "isAvailable": true,
      "imageUrl": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80",
      "description": "Pisco de guarda Mistral Nobel sin bebida.",
      "name": "Pisco Mistral Nobel 40°",
      "id": "p_trg56"
    },
    {
      "description": "Pisco saborizado de guarda Mistral Nobel Apple sin bebida.",
      "imageUrl": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80",
      "id": "p_trg57",
      "name": "Pisco Mistral Nobel Apple",
      "requiresKitchen": false,
      "recipe": [],
      "allergens": [],
      "price": 4500,
      "categoryId": "cat_tragos",
      "isAvailable": true
    },
    {
      "name": "Pisco Alto del Carmen 35°",
      "id": "p_trg58",
      "imageUrl": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80",
      "description": "Pisco Alto del Carmen 35 grados sin bebida.",
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 3500,
      "allergens": [],
      "requiresKitchen": false,
      "recipe": []
    },
    {
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 4500,
      "requiresKitchen": false,
      "recipe": [],
      "allergens": [],
      "imageUrl": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80",
      "description": "Ron caribeño de reserva sin bebida.",
      "name": "Ron Havana Club Añejo Reserva",
      "id": "p_trg59"
    },
    {
      "name": "Ron Barceló Añejo",
      "id": "p_trg60",
      "imageUrl": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80",
      "description": "Ron dominicano sin bebida.",
      "isAvailable": true,
      "categoryId": "cat_tragos",
      "price": 4000,
      "allergens": [],
      "requiresKitchen": false,
      "recipe": []
    },
    {
      "price": 5500,
      "categoryId": "cat_tragos",
      "isAvailable": true,
      "requiresKitchen": false,
      "recipe": [],
      "allergens": [],
      "description": "Ron de guarda nicaragüense sin bebida.",
      "imageUrl": "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80",
      "id": "p_trg61",
      "name": "Ron Flor de Caña 5 años"
    },
    {
      "description": "Jugos de fruta de estación natural (preparados al instante).",
      "imageUrl": "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&q=80",
      "id": "p_beb1",
      "name": "Jugo Variedad natural",
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [],
      "categoryId": "cat_bebidas",
      "isAvailable": true,
      "price": 2500
    },
    {
      "name": "Bebida Variedad",
      "id": "p_beb2",
      "imageUrl": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80",
      "description": "Bebidas gaseosas individuales en lata (coca-cola, fanta, sprite, etc.).",
      "allergens": [],
      "recipe": [],
      "requiresKitchen": false,
      "price": 2000,
      "isAvailable": true,
      "categoryId": "cat_bebidas"
    },
    {
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [],
      "categoryId": "cat_bebidas",
      "price": 3800,
      "isAvailable": true,
      "imageUrl": "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&q=80",
      "description": "Variedad de limonadas: Frambuesa jengibre, Limonada jengibre, Frutilla jengibre o Arándano jengibre.",
      "name": "Limonadas de especialidad",
      "id": "p_beb3"
    },
    {
      "categoryId": "cat_bebidas",
      "price": 2000,
      "isAvailable": true,
      "allergens": [],
      "recipe": [],
      "requiresKitchen": true,
      "id": "p_beb4",
      "name": "Café Juan Valdez Sabores",
      "description": "Café premium de variedad con notas de sabores.",
      "imageUrl": "https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=400&q=80"
    },
    {
      "categoryId": "cat_bebidas",
      "price": 1000,
      "isAvailable": true,
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [],
      "imageUrl": "https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=400&q=80",
      "description": "Tazas de té en infusión.",
      "name": "Té Caliente",
      "id": "p_beb5"
    },
    {
      "id": "p_beb6",
      "name": "Milo Caliente",
      "description": "Taza de leche con chocolate Milo.",
      "imageUrl": "https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=400&q=80",
      "allergens": [
        "Lácteos"
      ],
      "recipe": [],
      "requiresKitchen": true,
      "categoryId": "cat_bebidas",
      "isAvailable": true,
      "price": 2000
    },
    {
      "isAvailable": true,
      "price": 4000,
      "categoryId": "cat_postres",
      "allergens": [
        "Lácteos",
        "Huevo"
      ],
      "requiresKitchen": true,
      "recipe": [],
      "name": "Creme Brûlée",
      "id": "p_pst1",
      "imageUrl": "https://images.unsplash.com/photo-1516685018646-549198525c1b?w=400&q=80",
      "description": "Clásica crema quemada aromatizada con vainilla natural."
    },
    {
      "price": 3500,
      "categoryId": "cat_postres",
      "isAvailable": true,
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Lácteos",
        "Gluten",
        "Huevo"
      ],
      "imageUrl": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80",
      "description": "Postre frío italiano a base de mascarpone y café de especialidad.",
      "name": "Tiramisú casero",
      "id": "p_pst2"
    },
    {
      "imageUrl": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80",
      "description": "Panqueque relleno con abundante manjar y azúcar flor.",
      "name": "Celestino",
      "id": "p_pst3",
      "recipe": [],
      "requiresKitchen": true,
      "allergens": [
        "Lácteos",
        "Gluten",
        "Huevo"
      ],
      "categoryId": "cat_postres",
      "isAvailable": true,
      "price": 3900
    }
  ],
  "auditLogs": [
    {
      "userName": "Juan (Mozo)",
      "createdAt": "2026-07-11T19:04:41.080Z",
      "userId": "u1",
      "details": "Juan (Mozo) inició sesión en el sistema.",
      "action": "Inicio de Sesión",
      "id": "audit_7ugwezeab"
    },
    {
      "id": "audit_bjt721xax",
      "userId": "u1",
      "details": "Juan (Mozo) abrió un turno de caja con saldo inicial de $50.000.",
      "action": "Apertura de Caja",
      "createdAt": "2026-07-11T19:06:22.467Z",
      "userName": "Juan (Mozo)"
    },
    {
      "createdAt": "2026-07-11T19:06:35.980Z",
      "userName": "Juan (Mozo)",
      "id": "audit_15a1x1x5l",
      "userId": "u1",
      "action": "Mesa Abierta",
      "details": "Juan (Mozo) abrió la Mesa 1 para 8 personas."
    },
    {
      "action": "Inicio de Sesión",
      "userId": "u1",
      "details": "Juan (Mozo) inició sesión en el sistema.",
      "id": "audit_9t6m18qhg",
      "userName": "Juan (Mozo)",
      "createdAt": "2026-07-11T19:07:24.754Z"
    },
    {
      "action": "Inicio de Sesión",
      "details": "Juan (Mozo) inició sesión en el sistema.",
      "userId": "u1",
      "id": "audit_q82djf1iu",
      "userName": "Juan (Mozo)",
      "createdAt": "2026-07-11T19:20:39.562Z"
    },
    {
      "userId": "u3",
      "action": "Inicio de Sesión",
      "details": "Don Ricardo (Admin) inició sesión en el sistema.",
      "id": "audit_92jfaxg1a",
      "userName": "Don Ricardo (Admin)",
      "createdAt": "2026-07-11T19:23:10.909Z"
    }
  ],
  "shifts": [
    {
      "status": "OPEN",
      "initialCash": 50000,
      "userId": "u1",
      "openedAt": "2026-07-11T19:06:22.461Z",
      "id": "sh_2zsa9t7na"
    }
  ],
  "categories": [
    {
      "name": "Platos de la Casa",
      "id": "cat_especialidades",
      "icon": "Utensils"
    },
    {
      "icon": "Beef",
      "name": "Carnes y Parrilladas",
      "id": "cat_carnes"
    },
    {
      "id": "cat_menu_ejecutivo",
      "name": "Menú Ejecutivo",
      "icon": "ChefHat"
    },
    {
      "icon": "Sandwich",
      "name": "Sándwiches y Pichangas",
      "id": "cat_sandwichs"
    },
    {
      "id": "cat_ensaladas",
      "name": "Ensaladas y Papas",
      "icon": "Salad"
    },
    {
      "name": "Tragos y Aperitivos",
      "id": "cat_tragos",
      "icon": "Wine"
    },
    {
      "icon": "Coffee",
      "name": "Bebidas y Cafetería",
      "id": "cat_bebidas"
    },
    {
      "id": "cat_postres",
      "name": "Postres",
      "icon": "Cake"
    }
  ],
  "customers": [
    {
      "birthDate": "1985-03-15",
      "allergies": [
        "Gluten"
      ],
      "phone": "+56912345678",
      "name": "María González",
      "email": "maria@email.com",
      "id": "c1",
      "points": 1250,
      "notes": "Cliente frecuente, prefiere mesa ventana"
    },
    {
      "phone": "+56987654321",
      "allergies": [],
      "points": 380,
      "email": "roberto@email.com",
      "id": "c2",
      "name": "Roberto Silva"
    },
    {
      "allergies": [
        "Mariscos"
      ],
      "phone": "+56911223344",
      "id": "c3",
      "name": "Valentina Morales",
      "notes": "Alergia severa a mariscos",
      "points": 2100
    },
    {
      "phone": "+56942826505",
      "allergies": [],
      "birthDate": "",
      "notes": "",
      "points": 100,
      "id": "cu_msm7ykw7j",
      "email": "",
      "name": "Ivan Santos"
    }
  ],
  "inventoryTransactions": [
    {
      "referenceId": "o_lbsnmwz6j",
      "type": "ORDER_DEDUCTION",
      "createdAt": "2026-07-11T19:09:12.845Z",
      "ingredientName": "Queso Artesanal",
      "ingredientId": "i1",
      "change": -200,
      "id": "tx_inv_9rd22ab1c"
    },
    {
      "id": "tx_inv_w5pyx9xgq",
      "change": -100,
      "ingredientId": "i2",
      "ingredientName": "Embutidos Ibéricos",
      "type": "ORDER_DEDUCTION",
      "createdAt": "2026-07-11T19:09:12.845Z",
      "referenceId": "o_lbsnmwz6j"
    },
    {
      "change": -250,
      "id": "tx_inv_xk2qx11qm",
      "ingredientName": "Corvina Fresca",
      "ingredientId": "i3",
      "type": "ORDER_DEDUCTION",
      "createdAt": "2026-07-11T19:09:12.845Z",
      "referenceId": "o_lbsnmwz6j"
    },
    {
      "createdAt": "2026-07-11T19:09:12.845Z",
      "type": "ORDER_DEDUCTION",
      "referenceId": "o_lbsnmwz6j",
      "id": "tx_inv_kfodnjyh6",
      "change": -300,
      "ingredientId": "i4",
      "ingredientName": "Lomo Fino"
    },
    {
      "ingredientId": "i5",
      "ingredientName": "Papas Rústicas",
      "id": "tx_inv_y98lmi67x",
      "change": -150,
      "referenceId": "o_lbsnmwz6j",
      "type": "ORDER_DEDUCTION",
      "createdAt": "2026-07-11T19:09:12.845Z"
    },
    {
      "ingredientId": "i6",
      "ingredientName": "Pasta Fresca",
      "id": "tx_inv_phkglo7kh",
      "change": -200,
      "referenceId": "o_lbsnmwz6j",
      "createdAt": "2026-07-11T19:09:12.845Z",
      "type": "ORDER_DEDUCTION"
    },
    {
      "referenceId": "o_lbsnmwz6j",
      "type": "ORDER_DEDUCTION",
      "createdAt": "2026-07-11T19:09:12.845Z",
      "ingredientId": "i7",
      "ingredientName": "Salmón Atlántico",
      "id": "tx_inv_0pln9wu9f",
      "change": -200
    },
    {
      "ingredientId": "i8",
      "ingredientName": "Mascarpone",
      "id": "tx_inv_sa9bjc8v3",
      "change": -150,
      "referenceId": "o_lbsnmwz6j",
      "createdAt": "2026-07-11T19:09:12.845Z",
      "type": "ORDER_DEDUCTION"
    },
    {
      "referenceId": "o_lbsnmwz6j",
      "createdAt": "2026-07-11T19:20:25.121Z",
      "type": "ORDER_DEDUCTION",
      "ingredientId": "i1",
      "ingredientName": "Queso Artesanal",
      "id": "tx_inv_czxj3bx5z",
      "change": -200
    },
    {
      "createdAt": "2026-07-11T19:20:25.121Z",
      "type": "ORDER_DEDUCTION",
      "referenceId": "o_lbsnmwz6j",
      "id": "tx_inv_a59asml3x",
      "change": -100,
      "ingredientId": "i2",
      "ingredientName": "Embutidos Ibéricos"
    },
    {
      "change": -250,
      "id": "tx_inv_34j7xtv5y",
      "ingredientName": "Corvina Fresca",
      "ingredientId": "i3",
      "type": "ORDER_DEDUCTION",
      "createdAt": "2026-07-11T19:20:25.121Z",
      "referenceId": "o_lbsnmwz6j"
    },
    {
      "referenceId": "o_lbsnmwz6j",
      "type": "ORDER_DEDUCTION",
      "createdAt": "2026-07-11T19:20:25.121Z",
      "ingredientId": "i4",
      "ingredientName": "Lomo Fino",
      "id": "tx_inv_vmeuhuevk",
      "change": -300
    },
    {
      "referenceId": "o_lbsnmwz6j",
      "type": "ORDER_DEDUCTION",
      "createdAt": "2026-07-11T19:20:25.121Z",
      "ingredientId": "i5",
      "ingredientName": "Papas Rústicas",
      "id": "tx_inv_mhwo5uzft",
      "change": -150
    },
    {
      "ingredientId": "i6",
      "ingredientName": "Pasta Fresca",
      "id": "tx_inv_0nm6vnxqk",
      "change": -200,
      "referenceId": "o_lbsnmwz6j",
      "type": "ORDER_DEDUCTION",
      "createdAt": "2026-07-11T19:20:25.121Z"
    },
    {
      "id": "tx_inv_isyh5jo0k",
      "change": -200,
      "ingredientId": "i7",
      "ingredientName": "Salmón Atlántico",
      "type": "ORDER_DEDUCTION",
      "createdAt": "2026-07-11T19:20:25.121Z",
      "referenceId": "o_lbsnmwz6j"
    },
    {
      "change": -150,
      "id": "tx_inv_yw1l388te",
      "ingredientName": "Mascarpone",
      "ingredientId": "i8",
      "createdAt": "2026-07-11T19:20:25.121Z",
      "type": "ORDER_DEDUCTION",
      "referenceId": "o_lbsnmwz6j"
    }
  ],
  "payments": [
    {
      "id": "pay_kn4ovb37c",
      "orderId": "o_lbsnmwz6j",
      "tip": 20520,
      "amount": 225720,
      "discount": 0,
      "createdAt": "2026-07-11T19:21:07.108Z",
      "method": "CASH"
    }
  ],
  "onlyViewMenuQr": false,
  "notifications": [],
  "orders": [],
  "promotions": [
    {
      "active": true,
      "type": "DISCOUNT",
      "conditions": "Primera visita",
      "value": 10,
      "code": "HACIENDA10",
      "name": "Descuento Bienvenida",
      "id": "pr1"
    },
    {
      "id": "pr2",
      "value": 0,
      "conditions": "Lunes a miércoles",
      "code": "POSTRE2X1",
      "name": "2x1 en Postres",
      "type": "TWO_FOR_ONE",
      "active": true
    }
  ]
} as any as RestaurantState;
