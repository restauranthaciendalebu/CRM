import {
  RestaurantState,
  TableStatus,
  OrderStatus,
  OrderItemStatus,
  LoyaltyTxType,
  PromoType,
  PaymentMethod,
  ReservationStatus,
  ShiftStatus,
  Role,
} from "./types";

export const DEMO_STATE: RestaurantState = {
  users: [
    { id: "u1", pin: "2222", name: "Juan (Mozo)", role: Role.WAITER },
    { id: "u2", pin: "3333", name: "Carlos (Cocina)", role: Role.KITCHEN },
    { id: "u3", pin: "1234", name: "Don Ricardo (Admin)", role: Role.ADMIN },
  ],
  tables: [
    { id: "t1", number: 1, seats: 2, status: TableStatus.FREE, zone: "Salón Principal", x: 10, y: 10 },
    { id: "t2", number: 2, seats: 4, status: TableStatus.OCCUPIED, zone: "Salón Principal", x: 30, y: 10 },
    { id: "t3", number: 3, seats: 4, status: TableStatus.FREE, zone: "Salón Principal", x: 50, y: 10 },
    { id: "t4", number: 4, seats: 6, status: TableStatus.RESERVED, zone: "Terraza", x: 10, y: 40 },
    { id: "t5", number: 5, seats: 2, status: TableStatus.FREE, zone: "Terraza", x: 30, y: 40 },
    { id: "t6", number: 6, seats: 8, status: TableStatus.OCCUPIED, zone: "VIP", x: 65, y: 40 },
    { id: "t7", number: 7, seats: 4, status: TableStatus.FREE, zone: "Salón Principal", x: 70, y: 10 },
    { id: "t8", number: 8, seats: 2, status: TableStatus.BILL_REQUESTED, zone: "Terraza", x: 50, y: 40 },
  ],
  categories: [
    { id: "cat1", name: "Entradas", icon: "Salad" },
    { id: "cat2", name: "Platos Principales", icon: "UtensilsCrossed" },
    { id: "cat3", name: "Postres", icon: "Cake" },
    { id: "cat4", name: "Bebidas", icon: "Wine" },
    { id: "cat5", name: "Carnes", icon: "Beef" },
    { id: "cat6", name: "Pescados", icon: "Fish" },
  ],
  products: [
    {
      id: "p1", name: "Tabla de Quesos y Embutidos", categoryId: "cat1",
      description: "Selección de quesos artesanales y embutidos ibéricos con mermelada y pan tostado",
      price: 14900, allergens: ["Lácteos", "Gluten"], isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=400&q=80",
      recipe: [{ ingredientId: "i1", quantity: 200 }, { ingredientId: "i2", quantity: 100 }],
    },
    {
      id: "p2", name: "Ceviche de Corvina", categoryId: "cat1",
      description: "Corvina fresca marinada en limón con cebolla morada, cilantro y ají amarillo",
      price: 12900, allergens: ["Mariscos"], isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=400&q=80",
      recipe: [{ ingredientId: "i3", quantity: 250 }],
    },
    {
      id: "p3", name: "Lomo a la Parrilla", categoryId: "cat5",
      description: "300g de lomo fino a la parrilla con chimichurri casero, papas rústicas y ensalada verde",
      price: 24900, allergens: [], isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80",
      recipe: [{ ingredientId: "i4", quantity: 300 }, { ingredientId: "i5", quantity: 150 }],
    },
    {
      id: "p4", name: "Pasta Hacienda", categoryId: "cat2",
      description: "Tagliatelle fresca con salsa de hongos silvestres, trufa negra y parmesano",
      price: 16900, allergens: ["Gluten", "Lácteos", "Huevo"], isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&q=80",
      recipe: [{ ingredientId: "i6", quantity: 200 }],
    },
    {
      id: "p5", name: "Salmón a la Plancha", categoryId: "cat6",
      description: "Filete de salmón atlántico con mantequilla de limón, alcaparras y arroz basmati",
      price: 19900, allergens: ["Pescado", "Lácteos"], isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80",
      recipe: [{ ingredientId: "i7", quantity: 200 }],
    },
    {
      id: "p6", name: "Tiramisú Clásico", categoryId: "cat3",
      description: "Receta tradicional italiana con mascarpone, café espresso y bizcochos Savoiardi",
      price: 7900, allergens: ["Lácteos", "Gluten", "Huevo"], isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80",
      recipe: [{ ingredientId: "i8", quantity: 150 }],
    },
    {
      id: "p7", name: "Vino Tinto Reserva", categoryId: "cat4",
      description: "Copa de vino tinto Reserva, notas de frutos rojos y roble",
      price: 6900, allergens: ["Sulfitos"], isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80",
      recipe: [],
    },
    {
      id: "p8", name: "Agua Mineral", categoryId: "cat4",
      description: "Agua mineral natural o con gas 500ml",
      price: 2500, allergens: [], isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80",
      recipe: [],
    },
    {
      id: "p9", name: "Risotto de Hongos", categoryId: "cat2",
      description: "Arroz Arborio cremoso con mezcla de hongos silvestres, vino blanco y parmesano",
      price: 15900, allergens: ["Lácteos"], isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&q=80",
      recipe: [{ ingredientId: "i9", quantity: 200 }],
    },
    {
      id: "p10", name: "Brownie con Helado", categoryId: "cat3",
      description: "Brownie de chocolate belga caliente con bola de helado de vainilla y salsa de caramelo",
      price: 6900, allergens: ["Gluten", "Lácteos", "Huevo"], isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400&q=80",
      recipe: [],
    },
  ],
  ingredients: [
    { id: "i1", name: "Queso Artesanal", stock: 5000, unit: "g", minStock: 500 },
    { id: "i2", name: "Embutidos Ibéricos", stock: 3000, unit: "g", minStock: 400 },
    { id: "i3", name: "Corvina Fresca", stock: 4000, unit: "g", minStock: 500 },
    { id: "i4", name: "Lomo Fino", stock: 6000, unit: "g", minStock: 600 },
    { id: "i5", name: "Papas Rústicas", stock: 10000, unit: "g", minStock: 1000 },
    { id: "i6", name: "Pasta Fresca", stock: 3000, unit: "g", minStock: 300 },
    { id: "i7", name: "Salmón Atlántico", stock: 3500, unit: "g", minStock: 400 },
    { id: "i8", name: "Mascarpone", stock: 2000, unit: "g", minStock: 200 },
    { id: "i9", name: "Arroz Arborio", stock: 5000, unit: "g", minStock: 500 },
  ],
  orders: [
    {
      id: "o1", tableId: "t2", waiterId: "u1",
      status: OrderStatus.PREPARING,
      customerCount: 3, createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 60000).toISOString(),
      items: [
        { id: "oi1", productId: "p1", quantity: 1, status: OrderItemStatus.READY, selectedModifiers: [] },
        { id: "oi2", productId: "p3", quantity: 2, status: OrderItemStatus.PREPARING, selectedModifiers: [] },
        { id: "oi3", productId: "p7", quantity: 3, status: OrderItemStatus.DELIVERED, selectedModifiers: [] },
      ],
    },
    {
      id: "o2", tableId: "t6", waiterId: "u1",
      status: OrderStatus.PENDING_KITCHEN,
      customerCount: 5, createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
      items: [
        { id: "oi4", productId: "p9", quantity: 2, status: OrderItemStatus.PENDING, selectedModifiers: [] },
        { id: "oi5", productId: "p5", quantity: 3, status: OrderItemStatus.PENDING, selectedModifiers: [] },
        { id: "oi6", productId: "p8", quantity: 5, status: OrderItemStatus.DELIVERED, selectedModifiers: [] },
      ],
    },
  ],
  customers: [
    {
      id: "c1", name: "María González", phone: "+56912345678",
      email: "maria@email.com", birthDate: "1985-03-15",
      allergies: ["Gluten"], points: 1250, notes: "Cliente frecuente, prefiere mesa ventana",
    },
    {
      id: "c2", name: "Roberto Silva", phone: "+56987654321",
      email: "roberto@email.com", points: 380, allergies: [],
    },
    {
      id: "c3", name: "Valentina Morales", phone: "+56911223344",
      points: 2100, allergies: ["Mariscos"], notes: "Alergia severa a mariscos",
    },
  ],
  loyaltyTxs: [
    {
      id: "lt1", customerId: "c1", points: 250, type: LoyaltyTxType.EARNED,
      description: "Compra mesa 3 - $62.000", createdAt: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    },
    {
      id: "lt2", customerId: "c3", points: 500, type: LoyaltyTxType.EARNED,
      description: "Compra mesa 6 - $125.000", createdAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    },
    {
      id: "lt3", customerId: "c1", points: -200, type: LoyaltyTxType.REDEEMED,
      description: "Canje descuento $2.000", createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    },
  ],
  promotions: [
    {
      id: "pr1", name: "Descuento Bienvenida", code: "HACIENDA10",
      type: PromoType.DISCOUNT, value: 10, active: true, conditions: "Primera visita",
    },
    {
      id: "pr2", name: "2x1 en Postres", code: "POSTRE2X1",
      type: PromoType.TWO_FOR_ONE, value: 0, active: true, conditions: "Lunes a miércoles",
    },
  ],
  payments: [
    {
      id: "pay1", orderId: "o1", amount: 62700, method: PaymentMethod.CREDIT,
      tip: 6270, discount: 0, createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    },
  ],
  reservations: [
    {
      id: "r1", customerName: "Pedro Fuentes", customerPhone: "+56933445566",
      customerCount: 6, dateTime: new Date(Date.now() + 2 * 3600000).toISOString(),
      tableId: "t4", notes: "Cumpleaños, solicitan decoración especial",
      status: ReservationStatus.CONFIRMED,
    },
    {
      id: "r2", customerName: "Sofía Ramírez", customerPhone: "+56944556677",
      customerCount: 2, dateTime: new Date(Date.now() + 5 * 3600000).toISOString(),
      status: ReservationStatus.PENDING,
    },
  ],
  shifts: [
    {
      id: "sh1", userId: "u3",
      openedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
      initialCash: 100000, status: ShiftStatus.OPEN,
    },
  ],
  notifications: [],
  auditLogs: [
    {
      id: "al1", userId: "u3", userName: "Admin Hacienda",
      action: "SHIFT_OPEN", details: "Caja aperturada con $100.000",
      createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    },
  ],
  inventoryTransactions: [],
  onlyViewMenuQr: false,
};
