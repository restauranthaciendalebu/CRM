import fs from "fs";
import path from "path";
import { 
  RestaurantState, 
  Role, 
  TableStatus, 
  OrderStatus, 
  OrderItemStatus, 
  LoyaltyTxType, 
  PromoType, 
  PaymentMethod, 
  ReservationStatus, 
  ShiftStatus,
  Order,
  OrderItem,
  Table
} from "../src/types";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "restaurant_db.json");

// Ensure data folder exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const initialData: RestaurantState = {
  users: [
    { id: "u1", pin: "1234", name: "Don Ricardo (Admin)", role: Role.ADMIN },
    { id: "u2", pin: "2222", name: "Juan (Mozo)", role: Role.WAITER },
    { id: "u3", pin: "3333", name: "Carlos (Cocina)", role: Role.KITCHEN },
  ],
  notifications: [],
  tables: [
    { id: "t1", number: 1, seats: 4, status: TableStatus.FREE, zone: "Salón Principal", x: 1, y: 1 },
    { id: "t2", number: 2, seats: 2, status: TableStatus.FREE, zone: "Salón Principal", x: 2, y: 1 },
    { id: "t3", number: 3, seats: 6, status: TableStatus.FREE, zone: "Salón Principal", x: 3, y: 1 },
    { id: "t4", number: 4, seats: 4, status: TableStatus.FREE, zone: "Salón Principal", x: 1, y: 2 },
    { id: "t5", number: 5, seats: 4, status: TableStatus.FREE, zone: "Salón Principal", x: 2, y: 2 },
    { id: "t6", number: 6, seats: 8, status: TableStatus.FREE, zone: "Salón Principal", x: 3, y: 2 },
    { id: "t7", number: 10, seats: 2, status: TableStatus.FREE, zone: "Terraza", x: 1, y: 1 },
    { id: "t8", number: 11, seats: 4, status: TableStatus.FREE, zone: "Terraza", x: 2, y: 1 },
    { id: "t9", number: 12, seats: 4, status: TableStatus.FREE, zone: "Terraza", x: 3, y: 1 },
    { id: "t10", number: 20, seats: 4, status: TableStatus.FREE, zone: "VIP", x: 1, y: 1 },
  ],
  categories: [
    { id: "c1", name: "Entradas", icon: "Soup" },
    { id: "c2", name: "Platos de Fondo", icon: "Utensils" },
    { id: "c3", name: "Bebidas y Tragos", icon: "Wine" },
    { id: "c4", name: "Postres", icon: "IceCream" },
  ],
  products: [
    // Entradas
    {
      id: "p1",
      name: "Empanadas de Pino",
      description: "Tradicional empanada chilena de carne picada a cuchillo, cebolla, huevo y aceituna.",
      price: 3500,
      imageUrl: "https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=600&auto=format&fit=crop&q=60",
      categoryId: "c1",
      allergens: ["Gluten", "Huevo"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i4", quantity: 150 }, // Cebolla
        { ingredientId: "i1", quantity: 50 },  // Carne (Lomo)
        { ingredientId: "i3", quantity: 0.5 }, // Huevo
      ],
    },
    {
      id: "p2",
      name: "Ceviche de Reineta",
      description: "Reineta fresca marinada en jugo de limón, cebolla morada, pimentón y cilantro.",
      price: 7900,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60",
      categoryId: "c1",
      allergens: ["Pescado"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i5", quantity: 200 }, // Reineta
        { ingredientId: "i6", quantity: 100 }, // Limón
        { ingredientId: "i4", quantity: 50 },  // Cebolla
      ],
    },
    {
      id: "p3",
      name: "Provoleta a la Plancha",
      description: "Queso provolone fundido con orégano fresco y un toque de aceite de oliva.",
      price: 5200,
      imageUrl: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=60",
      categoryId: "c1",
      allergens: ["Lácteos"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i7", quantity: 200 }, // Queso Provoleta
      ],
    },
    // Platos de Fondo
    {
      id: "p4",
      name: "Lomo a lo Pobre",
      description: "Corte de lomo vetado de 300g a la parrilla, papas fritas crujientes, cebolla caramelizada y dos huevos fritos.",
      price: 14900,
      imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=60",
      categoryId: "c2",
      allergens: ["Huevo"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i1", quantity: 300 }, // Lomo Vetado
        { ingredientId: "i2", quantity: 250 }, // Papas
        { ingredientId: "i3", quantity: 2 },   // Huevos
        { ingredientId: "i4", quantity: 100 }, // Cebolla
      ],
    },
    {
      id: "p5",
      name: "Pastel de Choclo",
      description: "Pastel tradicional horneado en greda con pino de carne, pollo, aceitunas, huevo duro y pasta de choclo tierno.",
      price: 11500,
      imageUrl: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=600&auto=format&fit=crop&q=60",
      categoryId: "c2",
      allergens: ["Gluten", "Lácteos", "Huevo"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i4", quantity: 150 }, // Cebolla
        { ingredientId: "i1", quantity: 100 }, // Carne (Lomo)
        { ingredientId: "i3", quantity: 0.5 }, // Huevo
      ],
    },
    {
      id: "p6",
      name: "Salmón con Papas Duquesas",
      description: "Filete de salmón a la plancha con salsa de mantequilla y finas hierbas, acompañado de papas duquesas caseras.",
      price: 15500,
      imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&auto=format&fit=crop&q=60",
      categoryId: "c2",
      allergens: ["Pescado", "Lácteos"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i2", quantity: 200 }, // Papas
      ],
    },
    // Bebidas y Tragos
    {
      id: "p7",
      name: "Pisco Sour Tradicional",
      description: "Preparado con pisco chileno de 35°, jugo de limón fresco de pica, jarabe de goma y amargo de angostura.",
      price: 4500,
      imageUrl: "https://images.unsplash.com/photo-1510626176961-4b57d4fbad03?w=600&auto=format&fit=crop&q=60",
      categoryId: "c3",
      allergens: ["Huevo"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i9", quantity: 100 }, // Pisco
        { ingredientId: "i6", quantity: 50 },  // Limón
        { ingredientId: "i3", quantity: 0.2 }, // Clara de huevo
      ],
    },
    {
      id: "p8",
      name: "Bebida Express Cola",
      description: "Lata de 350ml fría con rodaja de limón opcional.",
      price: 2200,
      imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=60",
      categoryId: "c3",
      allergens: [],
      isAvailable: true,
      recipe: [],
    },
    {
      id: "p9",
      name: "Cerveza Artesanal IPA",
      description: "Cerveza de elaboración local, con notas cítricas e intenso aroma a lúpulo.",
      price: 3800,
      imageUrl: "https://images.unsplash.com/photo-1608270176050-12ec0f5093b6?w=600&auto=format&fit=crop&q=60",
      categoryId: "c3",
      allergens: ["Gluten"],
      isAvailable: true,
      recipe: [],
    },
    // Postres
    {
      id: "p10",
      name: "Mote con Huesillo",
      description: "Refrescante postre tradicional chileno con dos grandes huesillos deshidratados en almíbar, mote de trigo moteado bien helado.",
      price: 3200,
      imageUrl: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&auto=format&fit=crop&q=60",
      categoryId: "c4",
      allergens: ["Gluten"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i10", quantity: 150 }, // Huesillo
      ],
    },
    {
      id: "p11",
      name: "Leche Asada Casera",
      description: "Leche horneada con huevos frescos y vainilla, cubierta de caramelo dorado.",
      price: 3500,
      imageUrl: "https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=600&auto=format&fit=crop&q=60",
      categoryId: "c4",
      allergens: ["Lácteos", "Huevo"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i3", quantity: 1.5 }, // Huevo
      ],
    },
    {
      id: "p12",
      name: "Celestino de Manjar",
      description: "Fino panqueque casero relleno de abundante manjar chileno, servido tibio con azúcar flor.",
      price: 4000,
      imageUrl: "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600&auto=format&fit=crop&q=60",
      categoryId: "c4",
      allergens: ["Gluten", "Lácteos", "Huevo"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i8", quantity: 100 }, // Manjar
        { ingredientId: "i3", quantity: 0.5 }, // Huevo
      ],
    },
  ],
  ingredients: [
    { id: "i1", name: "Lomo Vetado", stock: 12000, unit: "g", minStock: 3000 },
    { id: "i2", name: "Papas", stock: 35000, unit: "g", minStock: 8000 },
    { id: "i3", name: "Huevos", stock: 120, unit: "unidades", minStock: 24 },
    { id: "i4", name: "Cebolla", stock: 20000, unit: "g", minStock: 4000 },
    { id: "i5", name: "Reineta", stock: 6000, unit: "g", minStock: 1500 },
    { id: "i6", name: "Limón de Pica", stock: 10000, unit: "g", minStock: 2000 },
    { id: "i7", name: "Queso Provoleta", stock: 4000, unit: "g", minStock: 1000 },
    { id: "i8", name: "Manjar de Leche", stock: 5000, unit: "g", minStock: 1500 },
    { id: "i9", name: "Pisco 35°", stock: 8000, unit: "ml", minStock: 2000 },
    { id: "i10", name: "Huesillos Secos", stock: 7000, unit: "g", minStock: 1500 },
  ],
  orders: [],
  customers: [
    { id: "cu1", name: "María Teresa", phone: "+56911112222", email: "maria.teresa@gmail.com", birthDate: "1988-05-14", allergies: ["Lácteos"], points: 1200, notes: "Prefiere mesa en la terraza" },
    { id: "cu2", name: "Roberto Muñoz", phone: "+56922223333", email: "roberto.m@gmail.com", birthDate: "1992-11-23", allergies: [], points: 450, notes: "Cliente habitual, le gustan las carnes a punto" },
    { id: "cu3", name: "Clara González", phone: "+56933334444", email: "clara.g@gmail.com", birthDate: "1985-02-08", allergies: ["Gluten"], points: 80, notes: "Celíaca estricta, prestar atención" },
  ],
  loyaltyTxs: [
    { id: "tx1", customerId: "cu1", points: 1000, type: LoyaltyTxType.EARNED, description: "Carga inicial de bienvenida", createdAt: "2026-06-01T12:00:00Z" },
    { id: "tx2", customerId: "cu1", points: 200, type: LoyaltyTxType.EARNED, description: "Consumo ticket #3421", createdAt: "2026-06-20T21:30:00Z" },
    { id: "tx3", customerId: "cu2", points: 450, type: LoyaltyTxType.EARNED, description: "Consumo ticket #3450", createdAt: "2026-07-01T15:10:00Z" },
    { id: "tx4", customerId: "cu3", points: 80, type: LoyaltyTxType.EARNED, description: "Consumo ticket #3491", createdAt: "2026-07-05T13:45:00Z" },
  ],
  promotions: [
    { id: "pr1", name: "Descuento de Bienvenida", code: "BIENVENIDO", type: PromoType.DISCOUNT, value: 10, active: true, conditions: "Válido para primer consumo de cliente registrado." },
    { id: "pr2", name: "Día del Mozo", code: "DIADELMOZO", type: PromoType.DISCOUNT, value: 15, active: true, conditions: "Válido días de semana para pagos en efectivo." },
    { id: "pr3", name: "Doble de Puntos Martes", code: "PUNTOSX2", type: PromoType.POINTS_MULTIPLIER, value: 2, active: true, conditions: "Duplica los puntos acumulados por tus compras los días martes." },
  ],
  payments: [],
  reservations: [
    { id: "res1", customerName: "Andrés Silva", customerPhone: "+56944445555", customerCount: 4, dateTime: "2026-07-09T20:30:00", tableId: "t1", status: ReservationStatus.CONFIRMED, notes: "Cumpleaños, traer postre con vela" },
    { id: "res2", customerName: "Paula Jara", customerPhone: "+56955556666", customerCount: 2, dateTime: "2026-07-10T13:00:00", tableId: "t7", status: ReservationStatus.PENDING, notes: "Mesa al aire libre si es posible" },
  ],
  shifts: [],
  auditLogs: [],
  inventoryTransactions: [],
  onlyViewMenuQr: true,
};

export class LocalDb {
  private static loadState(): RestaurantState {
    try {
      if (!fs.existsSync(DB_FILE)) {
        this.saveState(initialData);
        return initialData;
      }
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw) as RestaurantState;
      // Ensure arrays exist
      if (!parsed.users) parsed.users = initialData.users;
      if (!parsed.tables) parsed.tables = initialData.tables;
      if (!parsed.categories) parsed.categories = initialData.categories;
      if (!parsed.products) parsed.products = initialData.products;
      if (!parsed.ingredients) parsed.ingredients = initialData.ingredients;
      if (!parsed.orders) parsed.orders = [];
      if (!parsed.customers) parsed.customers = initialData.customers;
      if (!parsed.loyaltyTxs) parsed.loyaltyTxs = initialData.loyaltyTxs;
      if (!parsed.promotions) parsed.promotions = initialData.promotions;
      if (!parsed.payments) parsed.payments = [];
      if (!parsed.reservations) parsed.reservations = initialData.reservations;
      if (!parsed.shifts) parsed.shifts = [];
      if (!parsed.notifications) parsed.notifications = [];
      if (!parsed.auditLogs) parsed.auditLogs = [];
      if (!parsed.inventoryTransactions) parsed.inventoryTransactions = [];
      if (parsed.onlyViewMenuQr === undefined) parsed.onlyViewMenuQr = true;
      return parsed;
    } catch (e) {
      console.error("Error loading restaurant DB, using initial data:", e);
      return initialData;
    }
  }

  private static saveState(state: RestaurantState) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
    } catch (e) {
      console.error("Error saving restaurant DB:", e);
    }
  }

  // API operations
  static getState(): RestaurantState {
    return this.loadState();
  }

  static updateState(modifier: (state: RestaurantState) => void): RestaurantState {
    const state = this.loadState();
    modifier(state);
    this.saveState(state);
    return state;
  }

  // Deduct ingredient stock based on ingredients used in order items
  static deductStockForOrder(order: Order, state: RestaurantState) {
    if (!state.inventoryTransactions) state.inventoryTransactions = [];
    for (const item of order.items) {
      const product = state.products.find(p => p.id === item.productId);
      if (!product || !product.recipe) continue;

      for (const recipeItem of product.recipe) {
        const ingredient = state.ingredients.find(i => i.id === recipeItem.ingredientId);
        if (ingredient) {
          const deductionQty = recipeItem.quantity * item.quantity;
          ingredient.stock = Math.max(0, ingredient.stock - deductionQty);
          
          state.inventoryTransactions.push({
            id: "tx_inv_" + Math.random().toString(36).substr(2, 9),
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            change: -deductionQty,
            type: "ORDER_DEDUCTION",
            referenceId: order.id,
            createdAt: new Date().toISOString()
          });
        }
      }
    }
  }
}
