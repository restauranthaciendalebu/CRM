// server.ts
import express from "express";
import path2 from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// server/db.ts
import fs from "fs";
import path from "path";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// src/tableUtils.ts
var DEFAULT_TABLE_COUNT = 12;
function nextTableNumber(tables) {
  return tables.reduce((highest, table) => Math.max(highest, table.number), 0) + 1;
}
function createNumberedTable(tables, number, zone, seats) {
  const preferredId = `t${number}`;
  const id = tables.some((table) => table.id === preferredId) ? `t_${number}_${Math.random().toString(36).slice(2, 8)}` : preferredId;
  return {
    id,
    number,
    seats,
    status: "FREE" /* FREE */,
    zone,
    x: (number - 1) % 4 * 20 + 10,
    y: Math.floor((number - 1) / 4) * 30 + 10
  };
}
function createTable(tables, zone = "Sal\xF3n Principal", seats = 4) {
  return createNumberedTable(tables, nextTableNumber(tables), zone, seats);
}
function ensureMinimumTables(tables, minimum = DEFAULT_TABLE_COUNT) {
  const completed = [...tables];
  while (completed.length < minimum) {
    const usedNumbers = new Set(completed.map((table) => table.number));
    let number = 1;
    while (usedNumbers.has(number)) number++;
    completed.push(createNumberedTable(completed, number, "Sal\xF3n Principal", 4));
  }
  return completed.sort((a, b) => a.number - b.number);
}

// server/db.ts
var DB_DIR = path.join(process.cwd(), "data");
var DB_FILE = path.join(DB_DIR, "restaurant_db.json");
var FIRESTORE_STATE_DOC_PATH = process.env.FIRESTORE_STATE_DOC_PATH || "settings/restaurant_state";
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
var initialData = {
  users: [
    { id: "u1", pin: "1234", name: "Don Ricardo (Admin)", role: "ADMIN" /* ADMIN */ },
    { id: "u2", pin: "2222", name: "Juan (Mozo)", role: "WAITER" /* WAITER */ },
    { id: "u3", pin: "3333", name: "Carlos (Cocina)", role: "KITCHEN" /* KITCHEN */ }
  ],
  notifications: [],
  tables: ensureMinimumTables([
    { id: "t1", number: 1, seats: 4, status: "FREE" /* FREE */, zone: "Sal\xF3n Principal", x: 1, y: 1 },
    { id: "t2", number: 2, seats: 2, status: "FREE" /* FREE */, zone: "Sal\xF3n Principal", x: 2, y: 1 },
    { id: "t3", number: 3, seats: 6, status: "FREE" /* FREE */, zone: "Sal\xF3n Principal", x: 3, y: 1 },
    { id: "t4", number: 4, seats: 4, status: "FREE" /* FREE */, zone: "Sal\xF3n Principal", x: 1, y: 2 },
    { id: "t5", number: 5, seats: 4, status: "FREE" /* FREE */, zone: "Sal\xF3n Principal", x: 2, y: 2 },
    { id: "t6", number: 6, seats: 8, status: "FREE" /* FREE */, zone: "Sal\xF3n Principal", x: 3, y: 2 },
    { id: "t7", number: 10, seats: 2, status: "FREE" /* FREE */, zone: "Terraza", x: 1, y: 1 },
    { id: "t8", number: 11, seats: 4, status: "FREE" /* FREE */, zone: "Terraza", x: 2, y: 1 },
    { id: "t9", number: 12, seats: 4, status: "FREE" /* FREE */, zone: "Terraza", x: 3, y: 1 },
    { id: "t10", number: 20, seats: 4, status: "FREE" /* FREE */, zone: "VIP", x: 1, y: 1 }
  ]),
  categories: [
    { id: "c1", name: "Entradas", icon: "Soup" },
    { id: "c2", name: "Platos de Fondo", icon: "Utensils" },
    { id: "c3", name: "Bebidas y Tragos", icon: "Wine" },
    { id: "c4", name: "Postres", icon: "IceCream" }
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
        { ingredientId: "i4", quantity: 150 },
        // Cebolla
        { ingredientId: "i1", quantity: 50 },
        // Carne (Lomo)
        { ingredientId: "i3", quantity: 0.5 }
        // Huevo
      ]
    },
    {
      id: "p2",
      name: "Ceviche de Reineta",
      description: "Reineta fresca marinada en jugo de lim\xF3n, cebolla morada, piment\xF3n y cilantro.",
      price: 7900,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60",
      categoryId: "c1",
      allergens: ["Pescado"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i5", quantity: 200 },
        // Reineta
        { ingredientId: "i6", quantity: 100 },
        // Limón
        { ingredientId: "i4", quantity: 50 }
        // Cebolla
      ]
    },
    {
      id: "p3",
      name: "Provoleta a la Plancha",
      description: "Queso provolone fundido con or\xE9gano fresco y un toque de aceite de oliva.",
      price: 5200,
      imageUrl: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=60",
      categoryId: "c1",
      allergens: ["L\xE1cteos"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i7", quantity: 200 }
        // Queso Provoleta
      ]
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
        { ingredientId: "i1", quantity: 300 },
        // Lomo Vetado
        { ingredientId: "i2", quantity: 250 },
        // Papas
        { ingredientId: "i3", quantity: 2 },
        // Huevos
        { ingredientId: "i4", quantity: 100 }
        // Cebolla
      ]
    },
    {
      id: "p5",
      name: "Pastel de Choclo",
      description: "Pastel tradicional horneado en greda con pino de carne, pollo, aceitunas, huevo duro y pasta de choclo tierno.",
      price: 11500,
      imageUrl: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=600&auto=format&fit=crop&q=60",
      categoryId: "c2",
      allergens: ["Gluten", "L\xE1cteos", "Huevo"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i4", quantity: 150 },
        // Cebolla
        { ingredientId: "i1", quantity: 100 },
        // Carne (Lomo)
        { ingredientId: "i3", quantity: 0.5 }
        // Huevo
      ]
    },
    {
      id: "p6",
      name: "Salm\xF3n con Papas Duquesas",
      description: "Filete de salm\xF3n a la plancha con salsa de mantequilla y finas hierbas, acompa\xF1ado de papas duquesas caseras.",
      price: 15500,
      imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&auto=format&fit=crop&q=60",
      categoryId: "c2",
      allergens: ["Pescado", "L\xE1cteos"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i2", quantity: 200 }
        // Papas
      ]
    },
    // Bebidas y Tragos
    {
      id: "p7",
      name: "Pisco Sour Tradicional",
      description: "Preparado con pisco chileno de 35\xB0, jugo de lim\xF3n fresco de pica, jarabe de goma y amargo de angostura.",
      price: 4500,
      imageUrl: "https://images.unsplash.com/photo-1510626176961-4b57d4fbad03?w=600&auto=format&fit=crop&q=60",
      categoryId: "c3",
      allergens: ["Huevo"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i9", quantity: 100 },
        // Pisco
        { ingredientId: "i6", quantity: 50 },
        // Limón
        { ingredientId: "i3", quantity: 0.2 }
        // Clara de huevo
      ]
    },
    {
      id: "p8",
      name: "Bebida Express Cola",
      description: "Lata de 350ml fr\xEDa con rodaja de lim\xF3n opcional.",
      price: 2200,
      imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=60",
      categoryId: "c3",
      allergens: [],
      isAvailable: true,
      recipe: []
    },
    {
      id: "p9",
      name: "Cerveza Artesanal IPA",
      description: "Cerveza de elaboraci\xF3n local, con notas c\xEDtricas e intenso aroma a l\xFApulo.",
      price: 3800,
      imageUrl: "https://images.unsplash.com/photo-1608270176050-12ec0f5093b6?w=600&auto=format&fit=crop&q=60",
      categoryId: "c3",
      allergens: ["Gluten"],
      isAvailable: true,
      recipe: []
    },
    // Postres
    {
      id: "p10",
      name: "Mote con Huesillo",
      description: "Refrescante postre tradicional chileno con dos grandes huesillos deshidratados en alm\xEDbar, mote de trigo moteado bien helado.",
      price: 3200,
      imageUrl: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&auto=format&fit=crop&q=60",
      categoryId: "c4",
      allergens: ["Gluten"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i10", quantity: 150 }
        // Huesillo
      ]
    },
    {
      id: "p11",
      name: "Leche Asada Casera",
      description: "Leche horneada con huevos frescos y vainilla, cubierta de caramelo dorado.",
      price: 3500,
      imageUrl: "https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=600&auto=format&fit=crop&q=60",
      categoryId: "c4",
      allergens: ["L\xE1cteos", "Huevo"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i3", quantity: 1.5 }
        // Huevo
      ]
    },
    {
      id: "p12",
      name: "Celestino de Manjar",
      description: "Fino panqueque casero relleno de abundante manjar chileno, servido tibio con az\xFAcar flor.",
      price: 4e3,
      imageUrl: "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600&auto=format&fit=crop&q=60",
      categoryId: "c4",
      allergens: ["Gluten", "L\xE1cteos", "Huevo"],
      isAvailable: true,
      recipe: [
        { ingredientId: "i8", quantity: 100 },
        // Manjar
        { ingredientId: "i3", quantity: 0.5 }
        // Huevo
      ]
    }
  ],
  ingredients: [
    { id: "i1", name: "Lomo Vetado", stock: 12e3, unit: "g", minStock: 3e3 },
    { id: "i2", name: "Papas", stock: 35e3, unit: "g", minStock: 8e3 },
    { id: "i3", name: "Huevos", stock: 120, unit: "unidades", minStock: 24 },
    { id: "i4", name: "Cebolla", stock: 2e4, unit: "g", minStock: 4e3 },
    { id: "i5", name: "Reineta", stock: 6e3, unit: "g", minStock: 1500 },
    { id: "i6", name: "Lim\xF3n de Pica", stock: 1e4, unit: "g", minStock: 2e3 },
    { id: "i7", name: "Queso Provoleta", stock: 4e3, unit: "g", minStock: 1e3 },
    { id: "i8", name: "Manjar de Leche", stock: 5e3, unit: "g", minStock: 1500 },
    { id: "i9", name: "Pisco 35\xB0", stock: 8e3, unit: "ml", minStock: 2e3 },
    { id: "i10", name: "Huesillos Secos", stock: 7e3, unit: "g", minStock: 1500 }
  ],
  orders: [],
  customers: [
    { id: "cu1", name: "Mar\xEDa Teresa", phone: "+56911112222", email: "maria.teresa@gmail.com", birthDate: "1988-05-14", allergies: ["L\xE1cteos"], points: 1200, notes: "Prefiere mesa en la terraza" },
    { id: "cu2", name: "Roberto Mu\xF1oz", phone: "+56922223333", email: "roberto.m@gmail.com", birthDate: "1992-11-23", allergies: [], points: 450, notes: "Cliente habitual, le gustan las carnes a punto" },
    { id: "cu3", name: "Clara Gonz\xE1lez", phone: "+56933334444", email: "clara.g@gmail.com", birthDate: "1985-02-08", allergies: ["Gluten"], points: 80, notes: "Cel\xEDaca estricta, prestar atenci\xF3n" }
  ],
  loyaltyTxs: [
    { id: "tx1", customerId: "cu1", points: 1e3, type: "EARNED" /* EARNED */, description: "Carga inicial de bienvenida", createdAt: "2026-06-01T12:00:00Z" },
    { id: "tx2", customerId: "cu1", points: 200, type: "EARNED" /* EARNED */, description: "Consumo ticket #3421", createdAt: "2026-06-20T21:30:00Z" },
    { id: "tx3", customerId: "cu2", points: 450, type: "EARNED" /* EARNED */, description: "Consumo ticket #3450", createdAt: "2026-07-01T15:10:00Z" },
    { id: "tx4", customerId: "cu3", points: 80, type: "EARNED" /* EARNED */, description: "Consumo ticket #3491", createdAt: "2026-07-05T13:45:00Z" }
  ],
  promotions: [
    { id: "pr1", name: "Descuento de Bienvenida", code: "BIENVENIDO", type: "DISCOUNT" /* DISCOUNT */, value: 10, active: true, conditions: "V\xE1lido para primer consumo de cliente registrado." },
    { id: "pr2", name: "D\xEDa del Mozo", code: "DIADELMOZO", type: "DISCOUNT" /* DISCOUNT */, value: 15, active: true, conditions: "V\xE1lido d\xEDas de semana para pagos en efectivo." },
    { id: "pr3", name: "Doble de Puntos Martes", code: "PUNTOSX2", type: "POINTS_MULTIPLIER" /* POINTS_MULTIPLIER */, value: 2, active: true, conditions: "Duplica los puntos acumulados por tus compras los d\xEDas martes." }
  ],
  payments: [],
  reservations: [
    { id: "res1", customerName: "Andr\xE9s Silva", customerPhone: "+56944445555", customerCount: 4, dateTime: "2026-07-09T20:30:00", tableId: "t1", status: "CONFIRMED" /* CONFIRMED */, notes: "Cumplea\xF1os, traer postre con vela" },
    { id: "res2", customerName: "Paula Jara", customerPhone: "+56955556666", customerCount: 2, dateTime: "2026-07-10T13:00:00", tableId: "t7", status: "PENDING" /* PENDING */, notes: "Mesa al aire libre si es posible" }
  ],
  shifts: [],
  auditLogs: [],
  inventoryTransactions: [],
  onlyViewMenuQr: true
};
var LocalDb = class {
  static {
    this.initialized = false;
  }
  static {
    this.stateCache = null;
  }
  static {
    this.remoteDoc = null;
  }
  static async init() {
    if (this.initialized) return;
    this.initialized = true;
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const shouldUseFirestore = process.env.FIRESTORE_ADMIN_ENABLED === "true" || !!serviceAccountPath;
    if (!shouldUseFirestore) {
      return;
    }
    try {
      if (!getApps().length) {
        if (serviceAccountPath) {
          const rawServiceAccount = fs.readFileSync(serviceAccountPath, "utf-8");
          const serviceAccount = JSON.parse(rawServiceAccount);
          initializeApp({ credential: cert(serviceAccount) });
        } else {
          initializeApp({ credential: applicationDefault() });
        }
      }
      this.remoteDoc = getFirestore().doc(FIRESTORE_STATE_DOC_PATH);
      const snap = await this.remoteDoc.get();
      if (snap.exists) {
        this.stateCache = this.normalizeState(snap.data());
      } else {
        this.stateCache = this.cloneState(initialData);
        await this.remoteDoc.set(this.stateCache);
      }
      console.log(`Firestore Admin store enabled at ${FIRESTORE_STATE_DOC_PATH}`);
    } catch (e) {
      console.error("Firestore Admin store failed to initialize, falling back to local JSON DB:", e);
      this.remoteDoc = null;
      this.stateCache = null;
    }
  }
  static cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }
  static normalizeState(state) {
    if (!state.users) state.users = initialData.users;
    if (!state.tables) state.tables = initialData.tables;
    if (!state.categories) state.categories = initialData.categories;
    if (!state.products) state.products = initialData.products;
    if (!state.ingredients) state.ingredients = initialData.ingredients;
    if (!state.orders) state.orders = [];
    if (!state.customers) state.customers = initialData.customers;
    if (!state.loyaltyTxs) state.loyaltyTxs = initialData.loyaltyTxs;
    if (!state.promotions) state.promotions = initialData.promotions;
    if (!state.payments) state.payments = [];
    if (!state.reservations) state.reservations = initialData.reservations;
    if (!state.shifts) state.shifts = [];
    if (!state.notifications) state.notifications = [];
    if (!state.auditLogs) state.auditLogs = [];
    if (!state.inventoryTransactions) state.inventoryTransactions = [];
    if (state.onlyViewMenuQr === void 0) state.onlyViewMenuQr = true;
    return state;
  }
  static loadState() {
    if (this.stateCache) {
      return this.cloneState(this.stateCache);
    }
    const backupDir = path.join(path.dirname(DB_FILE), "backups");
    const backupFile = path.join(backupDir, "restaurant_db_backup.json");
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          return this.normalizeState(parsed);
        }
      }
      if (fs.existsSync(backupFile)) {
        const rawBackup = fs.readFileSync(backupFile, "utf-8");
        if (rawBackup.trim()) {
          console.warn("Restoring database state from safety backup file...");
          const parsedBackup = JSON.parse(rawBackup);
          return this.normalizeState(parsedBackup);
        }
      }
      console.log("No existing database file found. Initializing new state...");
      return this.cloneState(initialData);
    } catch (e) {
      console.error("Error loading primary DB file, trying backup:", e);
      if (fs.existsSync(backupFile)) {
        try {
          const rawBackup = fs.readFileSync(backupFile, "utf-8");
          if (rawBackup.trim()) {
            return this.normalizeState(JSON.parse(rawBackup));
          }
        } catch (backupErr) {
          console.error("Failed to load backup file as well:", backupErr);
        }
      }
      return this.cloneState(initialData);
    }
  }
  static saveState(state) {
    this.stateCache = this.cloneState(state);
    if (this.remoteDoc) {
      try {
        const firestore = getFirestore();
        void this.remoteDoc.set(this.stateCache).catch((e) => {
          console.error("Error saving restaurant DB to Firestore:", e);
        });
        if (state.payments && state.payments.length > 0) {
          state.payments.forEach((payment) => {
            void firestore.collection("payments").doc(payment.id).set(payment).catch(() => {
            });
          });
        }
        if (state.orders && state.orders.length > 0) {
          state.orders.forEach((order) => {
            void firestore.collection("orders").doc(order.id).set(order).catch(() => {
            });
          });
        }
        if (state.users && state.users.length > 0) {
          state.users.forEach((user) => {
            void firestore.collection("users").doc(user.id).set(user).catch(() => {
            });
          });
        }
        if (state.reservations && state.reservations.length > 0) {
          state.reservations.forEach((res) => {
            void firestore.collection("reservations").doc(res.id).set(res).catch(() => {
            });
          });
        }
      } catch (e) {
        console.error("Error performing multi-collection write in Firestore Admin:", e);
      }
      return;
    }
    try {
      const dbDir = path.dirname(DB_FILE);
      const backupDir = path.join(dbDir, "backups");
      const collectionsDir = path.join(dbDir, "collections");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      if (!fs.existsSync(collectionsDir)) {
        fs.mkdirSync(collectionsDir, { recursive: true });
      }
      const tempFile = DB_FILE + ".tmp";
      const jsonContent = JSON.stringify(state, null, 2);
      fs.writeFileSync(tempFile, jsonContent, "utf-8");
      fs.renameSync(tempFile, DB_FILE);
      const backupFile = path.join(backupDir, "restaurant_db_backup.json");
      fs.writeFileSync(backupFile, jsonContent, "utf-8");
      fs.writeFileSync(path.join(collectionsDir, "payments.json"), JSON.stringify(state.payments || [], null, 2), "utf-8");
      fs.writeFileSync(path.join(collectionsDir, "orders.json"), JSON.stringify(state.orders || [], null, 2), "utf-8");
      fs.writeFileSync(path.join(collectionsDir, "users.json"), JSON.stringify(state.users || [], null, 2), "utf-8");
      fs.writeFileSync(path.join(collectionsDir, "reservations.json"), JSON.stringify(state.reservations || [], null, 2), "utf-8");
      fs.writeFileSync(path.join(collectionsDir, "tables.json"), JSON.stringify(state.tables || [], null, 2), "utf-8");
      fs.writeFileSync(path.join(collectionsDir, "products.json"), JSON.stringify(state.products || [], null, 2), "utf-8");
    } catch (e) {
      console.error("Error saving restaurant DB:", e);
    }
  }
  // API operations
  static getState() {
    return this.cloneState(this.loadState());
  }
  static updateState(modifier) {
    const state = this.loadState();
    modifier(state);
    this.saveState(state);
    return this.cloneState(state);
  }
  // Deduct ingredient stock based on ingredients used in order items
  static deductStockForOrder(order, state) {
    if (!state.inventoryTransactions) state.inventoryTransactions = [];
    for (const item of order.items) {
      const product = state.products.find((p) => p.id === item.productId);
      if (!product || !product.recipe) continue;
      for (const recipeItem of product.recipe) {
        const ingredient = state.ingredients.find((i) => i.id === recipeItem.ingredientId);
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
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      }
    }
  }
};

// src/orderUtils.ts
var DIRECT_SERVICE_CATEGORY_IDS = /* @__PURE__ */ new Set(["c3", "cat_tragos", "cat_bebidas"]);
function isDirectServiceProduct(product) {
  return Boolean(
    product && (product.requiresKitchen === false || DIRECT_SERVICE_CATEGORY_IDS.has(product.categoryId))
  );
}

// src/orderItemMutationUtils.ts
var isCookingStatus = (status) => status === "SENT_TO_KITCHEN" /* SENT_TO_KITCHEN */ || status === "RECEIVED" /* RECEIVED */ || status === "PREPARING" /* PREPARING */;
function itemHadStockDeducted(item, state) {
  const product = state.products.find((candidate) => candidate.id === item.productId);
  return item.status !== "PENDING" /* PENDING */ && !isDirectServiceProduct(product);
}
function restoreOrderItemStock(item, quantity, orderId, state) {
  if (!itemHadStockDeducted(item, state)) return;
  const product = state.products.find((candidate) => candidate.id === item.productId);
  if (!product?.recipe) return;
  if (!state.inventoryTransactions) state.inventoryTransactions = [];
  for (const recipeItem of product.recipe) {
    const ingredient = state.ingredients.find((candidate) => candidate.id === recipeItem.ingredientId);
    if (!ingredient) continue;
    const restoredQuantity = recipeItem.quantity * quantity;
    ingredient.stock += restoredQuantity;
    state.inventoryTransactions.push({
      id: "tx_inv_" + Math.random().toString(36).substring(2, 11),
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      change: restoredQuantity,
      type: "ITEM_CHANGE_RESTORE",
      referenceId: orderId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
function recalculateOrderStatus(order) {
  if (order.items.length === 0) {
    order.status = "PREPARING" /* PREPARING */;
    return;
  }
  if (order.items.every((item) => item.status === "DELIVERED" /* DELIVERED */)) {
    order.status = "DELIVERED" /* DELIVERED */;
    return;
  }
  if (order.items.every(
    (item) => item.status === "READY" /* READY */ || item.status === "DELIVERED" /* DELIVERED */
  )) {
    order.status = "READY" /* READY */;
    return;
  }
  if (order.items.some((item) => isCookingStatus(item.status))) {
    order.status = "PREPARING" /* PREPARING */;
    return;
  }
  order.status = "PREPARING" /* PREPARING */;
}

// src/billingUtils.ts
function getRemainingBalance(accountTotal, paidAmount) {
  return Math.max(0, Math.round(accountTotal) - Math.round(paidAmount));
}

// server.ts
dotenv.config({ path: ".env.local" });
dotenv.config();
var __dirname = path2.dirname(new URL(import.meta.url).pathname);
async function startServer() {
  await LocalDb.init();
  const app = express();
  const PORT = 3e3;
  let authFailureCount = 0;
  let authLockedUntil = 0;
  const AUTH_MAX_FAILED_ATTEMPTS = 5;
  const AUTH_LOCK_MS = 5 * 60 * 1e3;
  const getAuthLockError = () => {
    const now = Date.now();
    if (authLockedUntil <= now) return "";
    const seconds = Math.ceil((authLockedUntil - now) / 1e3);
    return `Demasiados intentos fallidos. Intenta nuevamente en ${seconds} segundos.`;
  };
  const recordAuthFailure = () => {
    authFailureCount++;
    if (authFailureCount >= AUTH_MAX_FAILED_ATTEMPTS) {
      authLockedUntil = Date.now() + AUTH_LOCK_MS;
      authFailureCount = 0;
    }
  };
  const clearAuthFailures = () => {
    authFailureCount = 0;
    authLockedUntil = 0;
  };
  const sanitizeForClient = (data) => {
    return JSON.parse(JSON.stringify(data, (key, value) => key === "pin" ? "" : value));
  };
  app.use(express.json());
  let notifications = [];
  app.get("/api/state", (req, res) => {
    try {
      const state = LocalDb.getState();
      res.json(sanitizeForClient({
        ...state,
        notifications: notifications.filter((n) => !n.resolved)
      }));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/auth/pin", (req, res) => {
    const { pin } = req.body;
    const lockError = getAuthLockError();
    if (lockError) {
      return res.status(429).json({ error: lockError });
    }
    if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
      recordAuthFailure();
      return res.status(401).json({ error: "PIN inv\xE1lido" });
    }
    const state = LocalDb.getState();
    const user = state.users.find((u) => u.pin === pin);
    if (!user) {
      recordAuthFailure();
      return res.status(401).json({ error: "PIN inv\xE1lido" });
    }
    clearAuthFailures();
    LocalDb.updateState((s) => {
      if (!s.auditLogs) s.auditLogs = [];
      s.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        userId: user.id,
        userName: user.name,
        action: "Inicio de Sesi\xF3n",
        details: `${user.name} inici\xF3 sesi\xF3n en el sistema.`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    res.json({ ...user, pin: "" });
  });
  app.post("/api/tables/ensure-defaults", (req, res) => {
    LocalDb.updateState((state) => {
      state.tables = ensureMinimumTables(state.tables);
    });
    res.json({ success: true, tables: LocalDb.getState().tables });
  });
  app.post("/api/tables/add", (req, res) => {
    const zone = typeof req.body.zone === "string" ? req.body.zone.trim() : "";
    const seats = Number(req.body.seats);
    const operatorName = typeof req.body.operatorName === "string" && req.body.operatorName.trim() ? req.body.operatorName.trim() : "Personal";
    if (!zone || !Number.isInteger(seats) || seats < 1 || seats > 30) {
      return res.status(400).json({ error: "Zona o cantidad de asientos inv\xE1lida." });
    }
    let newTable = null;
    LocalDb.updateState((state) => {
      newTable = createTable(state.tables, zone, seats);
      state.tables.push(newTable);
      if (!state.auditLogs) state.auditLogs = [];
      state.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substring(2, 11),
        userName: operatorName,
        action: "Mesa Agregada",
        details: `${operatorName} agreg\xF3 la Mesa ${newTable.number} en ${zone}, con ${seats} asientos.`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    res.json({ success: true, table: newTable });
  });
  app.post("/api/tables", (req, res) => {
    const { tables } = req.body;
    if (!tables || !Array.isArray(tables)) {
      return res.status(400).json({ error: "Invalid tables array" });
    }
    LocalDb.updateState((state) => {
      state.tables = tables;
    });
    res.json({ success: true, tables: LocalDb.getState().tables });
  });
  app.post("/api/tables/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }
    LocalDb.updateState((state) => {
      const table = state.tables.find((t) => t.id === id);
      if (table) {
        table.status = status;
      }
    });
    res.json({ success: true, tables: LocalDb.getState().tables });
  });
  app.post("/api/tables/:id/open", (req, res) => {
    const { id } = req.params;
    const { customerCount, waiterId } = req.body;
    const state = LocalDb.getState();
    const table = state.tables.find((t) => t.id === id);
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }
    if (table.status === "OCCUPIED" /* OCCUPIED */) {
      return res.status(400).json({ error: "La mesa ya est\xE1 ocupada" });
    }
    LocalDb.updateState((state2) => {
      if (!state2.auditLogs) state2.auditLogs = [];
      const t = state2.tables.find((tbl) => tbl.id === id);
      if (t) {
        t.status = "OCCUPIED" /* OCCUPIED */;
      }
      const waiter = state2.users.find((u) => u.id === waiterId);
      const waiterName = waiter ? waiter.name : "Mozo";
      const newOrderId = "o_" + Math.random().toString(36).substr(2, 9);
      const newOrder = {
        id: newOrderId,
        tableId: id,
        waiterId: waiterId || null,
        status: "PREPARING" /* PREPARING */,
        // Starts preparing directly if opened by waiter
        customerCount: customerCount || 2,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        items: []
      };
      state2.orders.push(newOrder);
      state2.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        userId: waiterId || void 0,
        userName: waiterName,
        action: "Mesa Abierta",
        details: `${waiterName} abri\xF3 la Mesa ${t ? t.number : "?"} para ${customerCount || 2} personas.`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    res.json(sanitizeForClient({ success: true, state: LocalDb.getState() }));
  });
  app.post("/api/orders", (req, res) => {
    const { tableId, items, customerCount, notes, customerPhone } = req.body;
    if (!tableId || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }
    let createdOrder = null;
    LocalDb.updateState((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (table) {
        table.status = "OCCUPIED" /* OCCUPIED */;
      }
      let order = state.orders.find((o) => o.tableId === tableId && o.status !== "CLOSED" /* CLOSED */);
      if (order) {
        items.forEach((newItem) => {
          const formattedItem = {
            id: "oi_" + Math.random().toString(36).substr(2, 9),
            productId: newItem.productId,
            quantity: newItem.quantity,
            notes: newItem.notes || "",
            status: "PENDING" /* PENDING */,
            selectedModifiers: newItem.selectedModifiers || [],
            tanda: newItem.tanda || 1
          };
          order.items.push(formattedItem);
        });
        order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        createdOrder = order;
      } else {
        const newOrderId = "o_" + Math.random().toString(36).substr(2, 9);
        const formattedItems = items.map((it) => ({
          id: "oi_" + Math.random().toString(36).substr(2, 9),
          productId: it.productId,
          quantity: it.quantity,
          notes: it.notes || "",
          status: "PENDING" /* PENDING */,
          selectedModifiers: it.selectedModifiers || [],
          tanda: it.tanda || 1
        }));
        const isWaiter = req.body.isWaiter === true;
        const newOrder = {
          id: newOrderId,
          tableId,
          waiterId: req.body.waiterId || null,
          status: "PREPARING" /* PREPARING */,
          customerCount: customerCount || 1,
          notes: notes || "",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          items: formattedItems,
          customerPhone: customerPhone || void 0
        };
        state.orders.push(newOrder);
        createdOrder = newOrder;
      }
      const tableNum = table ? table.number : 0;
      notifications.push({
        id: "nt_" + Math.random().toString(36).substr(2, 9),
        tableNumber: tableNum,
        type: "NEW_ORDER",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        resolved: false,
        notes: `Nuevo pedido mesa ${tableNum}`
      });
    });
    res.json({ success: true, order: createdOrder });
  });
  app.post("/api/orders/:id/customer-count", (req, res) => {
    const { id } = req.params;
    const customerCount = Number(req.body.customerCount);
    if (!Number.isInteger(customerCount) || customerCount < 1 || customerCount > 30) {
      return res.status(400).json({ error: "La cantidad de comensales debe estar entre 1 y 30." });
    }
    let errorMsg = "";
    LocalDb.updateState((state) => {
      const order = state.orders.find((candidate) => candidate.id === id && candidate.status !== "CLOSED" /* CLOSED */);
      if (!order) {
        errorMsg = "Comanda activa no encontrada.";
        return;
      }
      const previousCount = order.customerCount;
      order.customerCount = customerCount;
      order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      const user = state.users.find((candidate) => candidate.id === req.body.userId);
      const table = state.tables.find((candidate) => candidate.id === order.tableId);
      state.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        userId: user?.id,
        userName: user?.name || "Mozo",
        action: "Comensales Actualizados",
        details: `Mesa ${table?.number || "?"}: ${previousCount} a ${customerCount} comensales.`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    if (errorMsg) return res.status(404).json({ error: errorMsg });
    res.json({ success: true, order: LocalDb.getState().orders.find((candidate) => candidate.id === id) });
  });
  app.delete("/api/orders/:id/items/:itemId", (req, res) => {
    const { id, itemId } = req.params;
    let errorMsg = "";
    LocalDb.updateState((state) => {
      const order = state.orders.find((candidate) => candidate.id === id && candidate.status !== "CLOSED" /* CLOSED */);
      if (!order) {
        errorMsg = "Comanda activa no encontrada.";
        return;
      }
      const item = order.items.find((candidate) => candidate.id === itemId);
      if (!item) {
        errorMsg = "\xCDtem no encontrado.";
        return;
      }
      if (state.payments.some((payment) => payment.orderId === id)) {
        errorMsg = "No se puede modificar una comanda que ya tiene pagos o boletas emitidas.";
        return;
      }
      const changeReason = typeof req.body.changeReason === "string" ? req.body.changeReason.trim() : "";
      if (item.status !== "PENDING" /* PENDING */ && !changeReason) {
        errorMsg = "Debes indicar el motivo para eliminar un \xEDtem enviado o servido.";
        return;
      }
      const removedQuantity = req.body.removeAll !== true && item.quantity > 1 ? 1 : item.quantity;
      const product = state.products.find((candidate) => candidate.id === item.productId);
      restoreOrderItemStock(item, removedQuantity, order.id, state);
      if (removedQuantity < item.quantity) item.quantity -= removedQuantity;
      else order.items = order.items.filter((candidate) => candidate.id !== itemId);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      order.updatedAt = now;
      recalculateOrderStatus(order);
      const user = state.users.find((candidate) => candidate.id === req.body.userId);
      const table = state.tables.find((candidate) => candidate.id === order.tableId);
      state.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        userId: user?.id,
        userName: user?.name || "Mozo",
        action: "\xCDtem Eliminado",
        details: `Mesa ${table?.number || "?"}: se elimin\xF3 ${removedQuantity}x ${product?.name || "producto"} (${item.status}). Motivo: ${changeReason || "Correcci\xF3n antes de cocina"}.`,
        createdAt: now
      });
    });
    if (errorMsg) return res.status(400).json({ error: errorMsg });
    res.json({ success: true, order: LocalDb.getState().orders.find((candidate) => candidate.id === id) });
  });
  app.put("/api/orders/:id/items/:itemId", (req, res) => {
    const { id, itemId } = req.params;
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ error: "La cantidad debe estar entre 1 y 99." });
    }
    let errorMsg = "";
    LocalDb.updateState((state) => {
      const order = state.orders.find((candidate) => candidate.id === id && candidate.status !== "CLOSED" /* CLOSED */);
      if (!order) {
        errorMsg = "Comanda activa no encontrada.";
        return;
      }
      if (state.payments.some((payment) => payment.orderId === id)) {
        errorMsg = "No se puede modificar una comanda que ya tiene pagos o boletas emitidas.";
        return;
      }
      const item = order.items.find((candidate) => candidate.id === itemId);
      const newProduct = state.products.find((candidate) => candidate.id === req.body.productId);
      if (!item || !newProduct) {
        errorMsg = !item ? "\xCDtem no encontrado." : "Producto no encontrado.";
        return;
      }
      const changeReason = typeof req.body.changeReason === "string" ? req.body.changeReason.trim() : "";
      if (item.status !== "PENDING" /* PENDING */ && !changeReason) {
        errorMsg = "Debes indicar el motivo para cambiar un \xEDtem enviado o servido.";
        return;
      }
      const previousItem = { ...item, selectedModifiers: [...item.selectedModifiers || []] };
      const previousProduct = state.products.find((candidate) => candidate.id === previousItem.productId);
      const wasPending = previousItem.status === "PENDING" /* PENDING */;
      restoreOrderItemStock(previousItem, previousItem.quantity, order.id, state);
      item.productId = newProduct.id;
      item.quantity = quantity;
      item.notes = typeof req.body.notes === "string" ? req.body.notes : "";
      item.selectedModifiers = Array.isArray(req.body.selectedModifiers) ? req.body.selectedModifiers : [];
      item.tanda = Number(req.body.tanda) || 1;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (wasPending) {
        item.status = "PENDING" /* PENDING */;
      } else if (isDirectServiceProduct(newProduct)) {
        item.status = "READY" /* READY */;
      } else {
        item.status = "PREPARING" /* PREPARING */;
        LocalDb.deductStockForOrder({ ...order, items: [item] }, state);
        order.kitchenSentAt = now;
      }
      order.updatedAt = now;
      recalculateOrderStatus(order);
      const user = state.users.find((candidate) => candidate.id === req.body.userId);
      const table = state.tables.find((candidate) => candidate.id === order.tableId);
      state.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        userId: user?.id,
        userName: user?.name || "Mozo",
        action: "\xCDtem Cambiado",
        details: `Mesa ${table?.number || "?"}: ${previousItem.quantity}x ${previousProduct?.name || "producto"} fue cambiado por ${quantity}x ${newProduct.name}. Motivo: ${changeReason || "Correcci\xF3n antes de cocina"}.`,
        createdAt: now
      });
    });
    if (errorMsg) return res.status(400).json({ error: errorMsg });
    res.json({ success: true, order: LocalDb.getState().orders.find((candidate) => candidate.id === id) });
  });
  app.post("/api/orders/:id/send-to-kitchen", (req, res) => {
    const { id } = req.params;
    let success = false;
    let errorMsg = "";
    LocalDb.updateState((state) => {
      const order = state.orders.find((o) => o.id === id);
      if (!order) {
        errorMsg = "Order not found";
        return;
      }
      let updatedCount = 0;
      const sentItemIds = /* @__PURE__ */ new Set();
      order.items.forEach((item) => {
        if (item.status === "PENDING" /* PENDING */) {
          const product = state.products.find((candidate) => candidate.id === item.productId);
          if (isDirectServiceProduct(product)) {
            item.status = "READY" /* READY */;
          } else {
            item.status = "SENT_TO_KITCHEN" /* SENT_TO_KITCHEN */;
            sentItemIds.add(item.id);
          }
          updatedCount++;
        }
      });
      if (updatedCount > 0) {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        LocalDb.deductStockForOrder({
          ...order,
          items: order.items.filter((it) => sentItemIds.has(it.id))
        }, state);
        order.status = sentItemIds.size > 0 ? "PENDING_KITCHEN" /* PENDING_KITCHEN */ : "READY" /* READY */;
        order.kitchenSentAt = now;
        order.updatedAt = now;
        success = true;
      } else {
        errorMsg = "No pending items to send to kitchen";
      }
    });
    if (!success) {
      return res.status(400).json({ error: errorMsg });
    }
    res.json({ success: true, order: LocalDb.getState().orders.find((o) => o.id === id) });
  });
  app.post("/api/orders/:id/approve", (req, res) => {
    const { id } = req.params;
    const { waiterId } = req.body;
    LocalDb.updateState((state) => {
      const order = state.orders.find((o) => o.id === id);
      if (order) {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        order.waiterId = waiterId;
        order.updatedAt = now;
        const kitchenItemIds = /* @__PURE__ */ new Set();
        order.items.forEach((it) => {
          if (it.status === "PENDING" /* PENDING */) {
            const product = state.products.find((candidate) => candidate.id === it.productId);
            if (isDirectServiceProduct(product)) {
              it.status = "READY" /* READY */;
            } else {
              it.status = "SENT_TO_KITCHEN" /* SENT_TO_KITCHEN */;
              kitchenItemIds.add(it.id);
            }
          }
        });
        order.status = kitchenItemIds.size > 0 ? "PENDING_KITCHEN" /* PENDING_KITCHEN */ : "READY" /* READY */;
        if (kitchenItemIds.size > 0) order.kitchenSentAt = now;
        LocalDb.deductStockForOrder({
          ...order,
          items: order.items.filter((item) => kitchenItemIds.has(item.id))
        }, state);
      }
    });
    res.json({ success: true, order: LocalDb.getState().orders.find((o) => o.id === id) });
  });
  app.post("/api/orders/:id/items/:itemId/status", (req, res) => {
    const { id, itemId } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }
    LocalDb.updateState((state) => {
      const order = state.orders.find((o) => o.id === id);
      if (order) {
        const item = order.items.find((it) => it.id === itemId);
        if (item) {
          const product = state.products.find((candidate) => candidate.id === item.productId);
          const requestedStatus = status;
          item.status = isDirectServiceProduct(product) && (requestedStatus === "SENT_TO_KITCHEN" /* SENT_TO_KITCHEN */ || requestedStatus === "RECEIVED" /* RECEIVED */ || requestedStatus === "PREPARING" /* PREPARING */) ? "READY" /* READY */ : requestedStatus;
          order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        }
        const allReady = order.items.every((it) => it.status === "READY" /* READY */ || it.status === "DELIVERED" /* DELIVERED */);
        const allDelivered = order.items.every((it) => it.status === "DELIVERED" /* DELIVERED */);
        const anyPreparing = order.items.some((it) => it.status === "PREPARING" /* PREPARING */);
        const anyKitchenQueue = order.items.some(
          (it) => it.status === "SENT_TO_KITCHEN" /* SENT_TO_KITCHEN */ || it.status === "RECEIVED" /* RECEIVED */
        );
        if (allDelivered) {
          order.status = "DELIVERED" /* DELIVERED */;
        } else if (allReady) {
          order.status = "READY" /* READY */;
        } else if (anyPreparing) {
          order.status = "PREPARING" /* PREPARING */;
        } else if (anyKitchenQueue) {
          order.status = "PENDING_KITCHEN" /* PENDING_KITCHEN */;
        }
      }
    });
    res.json({ success: true, order: LocalDb.getState().orders.find((o) => o.id === id) });
  });
  app.post("/api/notifications/call", (req, res) => {
    const { tableNumber, type, notes } = req.body;
    if (!tableNumber || !type) {
      return res.status(400).json({ error: "Table number and type required" });
    }
    const id = "nt_" + Math.random().toString(36).substr(2, 9);
    const newNotif = {
      id,
      tableNumber: Number(tableNumber),
      type,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      resolved: false,
      notes: notes || ""
    };
    notifications.push(newNotif);
    LocalDb.updateState((state) => {
      const table = state.tables.find((t) => t.number === Number(tableNumber));
      if (table && type === "REQUEST_BILL") {
        table.status = "BILL_REQUESTED" /* BILL_REQUESTED */;
      }
    });
    res.json({ success: true, notification: newNotif });
  });
  app.post("/api/notifications/:id/resolve", (req, res) => {
    const { id } = req.params;
    const notif = notifications.find((n) => n.id === id);
    if (notif) {
      notif.resolved = true;
    }
    res.json({ success: true, notifications: notifications.filter((n) => !n.resolved) });
  });
  app.post("/api/orders/:id/close", (req, res) => {
    const { id } = req.params;
    const { payments, customerPhone, totalAmount, discount, tip } = req.body;
    if (!payments || !Array.isArray(payments)) {
      return res.status(400).json({ error: "Payments data is required" });
    }
    let errorMsg = "";
    let createdPayments = [];
    let remainingBalance = 0;
    let orderClosed = false;
    LocalDb.updateState((state) => {
      const order = state.orders.find((o) => o.id === id);
      if (!order) {
        errorMsg = "Orden no encontrada";
        return;
      }
      if (!order.items.length || order.items.some(
        (item) => item.status !== "READY" /* READY */ && item.status !== "DELIVERED" /* DELIVERED */
      )) {
        errorMsg = "No se puede cobrar hasta que todos los pedidos salgan de cocina";
        return;
      }
      const requestedTotal = payments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
      const proposedSubtotal = Math.max(0, Math.round(Number(totalAmount) || 0));
      const proposedDiscount = Math.max(0, Math.round(Number(discount) || 0));
      const proposedTip = Math.max(0, Math.round(Number(tip) || 0));
      const proposedBillingTotal = proposedSubtotal - proposedDiscount + proposedTip;
      const billingTotal = order.billingTotal ?? proposedBillingTotal;
      const alreadyPaid = state.payments.filter((payment) => payment.orderId === id).reduce((sum, payment) => sum + payment.amount, 0);
      const balanceBeforePayment = getRemainingBalance(billingTotal, alreadyPaid);
      if (balanceBeforePayment <= 0 || order.status === "CLOSED" /* CLOSED */) {
        errorMsg = "Esta mesa ya se encuentra pagada por completo. Se ha evitado un cobro duplicado.";
        return;
      }
      if (payments.length !== 1) {
        errorMsg = "Cada cobro debe registrar un solo pago. Actualiza la aplicaci\xF3n e intenta nuevamente";
        return;
      }
      if (billingTotal <= 0 || !Number.isFinite(requestedTotal) || requestedTotal <= 0) {
        errorMsg = "Ingresa un monto de pago v\xE1lido";
        return;
      }
      if (payments.some((pay) => !Number.isFinite(Number(pay.amount)) || Number(pay.amount) <= 0)) {
        errorMsg = "Todos los pagos deben tener un monto v\xE1lido";
        return;
      }
      if (requestedTotal > balanceBeforePayment) {
        errorMsg = `El pago supera el saldo pendiente de $${balanceBeforePayment.toLocaleString("es-CL")}`;
        return;
      }
      const accountPayment = payments.find((pay) => pay.method === "ACCOUNT" /* ACCOUNT */);
      let accountCustomer = null;
      if (accountPayment) {
        accountCustomer = state.customers.find((c) => c.id === accountPayment.creditCustomerId || c.phone === customerPhone) || null;
        if (!accountCustomer || !accountCustomer.isCreditAuthorized) {
          errorMsg = "La cuenta seleccionada no est\xE1 autorizada para cr\xE9dito";
          return;
        }
        order.customerPhone = accountCustomer.phone;
      }
      if (order.billingTotal === void 0) {
        order.billingSubtotal = proposedSubtotal;
        order.billingDiscount = proposedDiscount;
        order.billingTip = proposedTip;
        order.billingTotal = proposedBillingTotal;
      }
      const paymentCreatedAt = (/* @__PURE__ */ new Date()).toISOString();
      payments.forEach((pay) => {
        const creditCustomer = pay.method === "ACCOUNT" /* ACCOUNT */ ? accountCustomer : null;
        const payment = {
          id: "pay_" + Math.random().toString(36).substr(2, 9),
          orderId: id,
          amount: pay.amount,
          method: pay.method,
          tip: pay.tip || 0,
          discount: pay.discount || 0,
          createdAt: paymentCreatedAt
        };
        if (creditCustomer) {
          Object.assign(payment, {
            creditCustomerId: creditCustomer.id,
            creditCustomerName: creditCustomer.name
          });
        }
        state.payments.push(payment);
        createdPayments.push(payment);
      });
      remainingBalance = getRemainingBalance(billingTotal, alreadyPaid + requestedTotal);
      orderClosed = remainingBalance === 0;
      order.updatedAt = paymentCreatedAt;
      const table = state.tables.find((t) => t.id === order.tableId);
      if (orderClosed) {
        order.status = "CLOSED" /* CLOSED */;
        if (table) table.status = "FREE" /* FREE */;
        const loyaltyPhone = accountCustomer?.phone || customerPhone || order.customerPhone;
        if (loyaltyPhone) {
          const customer = state.customers.find((c) => c.phone === loyaltyPhone);
          if (customer) {
            const earnedPoints = Math.floor(((order.billingSubtotal || proposedSubtotal) - (order.billingDiscount || 0)) / 100);
            if (earnedPoints > 0) {
              customer.points += earnedPoints;
              state.loyaltyTxs.push({
                id: "tx_" + Math.random().toString(36).substr(2, 9),
                customerId: customer.id,
                points: earnedPoints,
                type: "EARNED" /* EARNED */,
                description: `Puntos ganados por consumo de Mesa ${table ? table.number : ""}`,
                createdAt: paymentCreatedAt
              });
            }
          }
        }
      }
    });
    if (errorMsg) {
      return res.status(400).json({ error: errorMsg });
    }
    res.json(sanitizeForClient({
      success: true,
      state: LocalDb.getState(),
      payments: createdPayments,
      remaining: remainingBalance,
      closed: orderClosed
    }));
  });
  app.post("/api/customers", (req, res) => {
    const {
      name,
      phone,
      email,
      birthDate,
      allergies,
      notes,
      isCreditAuthorized,
      creditLabel,
      creditLimit,
      creditNotes,
      creditAuthorizedBy
    } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Nombre y tel\xE9fono son obligatorios" });
    }
    let customer = null;
    LocalDb.updateState((state) => {
      const existing = state.customers.find((c) => c.phone === phone);
      if (existing) {
        existing.name = name;
        existing.email = email || existing.email;
        existing.birthDate = birthDate || existing.birthDate;
        existing.allergies = allergies || existing.allergies;
        existing.notes = notes || existing.notes;
        if (typeof isCreditAuthorized === "boolean") {
          existing.isCreditAuthorized = isCreditAuthorized;
          existing.creditAuthorizedAt = isCreditAuthorized ? (/* @__PURE__ */ new Date()).toISOString() : "";
          existing.creditAuthorizedBy = isCreditAuthorized ? creditAuthorizedBy || "Administrador" : "";
        }
        if (creditLabel) existing.creditLabel = creditLabel;
        if (typeof creditLimit === "number") existing.creditLimit = creditLimit;
        if (typeof creditNotes === "string") existing.creditNotes = creditNotes;
        customer = existing;
      } else {
        customer = {
          id: "cu_" + Math.random().toString(36).substr(2, 9),
          name,
          phone,
          email: email || "",
          birthDate: birthDate || "",
          allergies: allergies || [],
          points: 100,
          // 100 points signup bonus
          notes: notes || "",
          isCreditAuthorized: !!isCreditAuthorized,
          creditLabel: creditLabel || "CUSTOMER",
          creditLimit: Number(creditLimit || 0),
          creditNotes: creditNotes || "",
          creditAuthorizedBy: isCreditAuthorized ? creditAuthorizedBy || "Administrador" : "",
          creditAuthorizedAt: isCreditAuthorized ? (/* @__PURE__ */ new Date()).toISOString() : ""
        };
        state.customers.push(customer);
        state.loyaltyTxs.push({
          id: "tx_" + Math.random().toString(36).substr(2, 9),
          customerId: customer.id,
          points: 100,
          type: "EARNED" /* EARNED */,
          description: "Bono de registro inicial de fidelizaci\xF3n",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    });
    res.json({ success: true, customer });
  });
  app.post("/api/customers/:id/redeem", (req, res) => {
    const { id } = req.params;
    const { points, description } = req.body;
    if (!points || points <= 0) {
      return res.status(400).json({ error: "Points value must be greater than 0" });
    }
    let success = false;
    let errorMsg = "";
    LocalDb.updateState((state) => {
      const customer = state.customers.find((c) => c.id === id);
      if (!customer) {
        errorMsg = "Customer not found";
        return;
      }
      if (customer.points < points) {
        errorMsg = `Puntos insuficientes. Tiene ${customer.points} e intenta canjear ${points}.`;
        return;
      }
      customer.points -= points;
      state.loyaltyTxs.push({
        id: "tx_" + Math.random().toString(36).substr(2, 9),
        customerId: id,
        points,
        type: "REDEEMED" /* REDEEMED */,
        description: description || "Canje de productos",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      success = true;
    });
    if (!success) {
      return res.status(400).json({ error: errorMsg });
    }
    res.json({ success: true, customer: LocalDb.getState().customers.find((c) => c.id === id) });
  });
  app.post("/api/products", (req, res) => {
    const { id, name, description, price, imageUrl, categoryId, allergens, isAvailable, isRecommended, recipe } = req.body;
    if (!name || !price || !categoryId) {
      return res.status(400).json({ error: "Nombre, precio y categor\xEDa son obligatorios" });
    }
    let savedProduct = null;
    let errorMsg = "";
    LocalDb.updateState((state) => {
      if (id) {
        const prod = state.products.find((p) => p.id === id);
        if (prod) {
          prod.name = name;
          prod.description = description;
          prod.price = Number(price);
          prod.imageUrl = imageUrl || prod.imageUrl;
          prod.categoryId = categoryId;
          prod.allergens = allergens || [];
          prod.isAvailable = isAvailable !== void 0 ? isAvailable : prod.isAvailable;
          prod.isRecommended = !!isRecommended;
          prod.recipe = recipe || prod.recipe || [];
          savedProduct = prod;
        }
      } else {
        const newId = "p_" + Math.random().toString(36).substr(2, 9);
        savedProduct = {
          id: newId,
          name,
          description,
          price: Number(price),
          imageUrl: imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60",
          categoryId,
          allergens: allergens || [],
          isAvailable: isAvailable !== void 0 ? isAvailable : true,
          isRecommended: !!isRecommended,
          recipe: recipe || []
        };
        state.products.push(savedProduct);
      }
    });
    if (errorMsg) {
      return res.status(400).json({ error: errorMsg });
    }
    res.json({ success: true, product: savedProduct });
  });
  app.post("/api/products/:id/toggle-availability", (req, res) => {
    const { id } = req.params;
    let updated = null;
    LocalDb.updateState((state) => {
      const prod = state.products.find((p) => p.id === id);
      if (prod) {
        prod.isAvailable = !prod.isAvailable;
        updated = prod;
      }
    });
    res.json({ success: true, product: updated });
  });
  app.get("/api/users", (req, res) => {
    res.json(sanitizeForClient(LocalDb.getState().users));
  });
  app.post("/api/users", (req, res) => {
    const { id, name, pin, role, permissions, operatorName } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: "Nombre y rol son obligatorios." });
    }
    let savedUser = null;
    let errorMsg = "";
    LocalDb.updateState((state) => {
      if (!state.auditLogs) state.auditLogs = [];
      const shouldUpdatePin = typeof pin === "string" && pin.length > 0;
      if (!id && !/^\d{4}$/.test(pin || "")) {
        errorMsg = "El PIN debe ser de exactamente 4 n\xFAmeros.";
        return;
      }
      if (id && shouldUpdatePin && !/^\d{4}$/.test(pin)) {
        errorMsg = "El PIN debe ser de exactamente 4 n\xFAmeros.";
        return;
      }
      const duplicate = shouldUpdatePin ? state.users.find((u) => u.pin === pin && u.id !== id) : null;
      if (duplicate) {
        errorMsg = `El PIN ${pin} ya est\xE1 siendo utilizado por ${duplicate.name}.`;
        return;
      }
      if (id) {
        const user = state.users.find((u) => u.id === id);
        if (!user) {
          errorMsg = "Usuario no encontrado.";
          return;
        }
        const prevName = user.name;
        const prevRole = user.role;
        const prevPermissions = user.permissions || [];
        user.name = name;
        if (shouldUpdatePin) {
          user.pin = pin;
        }
        user.role = role;
        user.permissions = permissions || [];
        savedUser = user;
        state.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substr(2, 9),
          action: "Personal Modificado",
          details: `Se modific\xF3 el perfil de "${prevName}" (ahora: "${name}", Rol: ${prevRole} -> ${role}, Permisos: [${prevPermissions.join(", ")}] -> [${(permissions || []).join(", ")}]) por ${operatorName || "Administrador"}.`,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } else {
        savedUser = {
          id: "u_" + Math.random().toString(36).substr(2, 9),
          name,
          pin,
          role,
          permissions: permissions || []
        };
        state.users.push(savedUser);
        state.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substr(2, 9),
          action: "Personal Creado",
          details: `Se cre\xF3 el perfil de "${name}" con Rol: ${role}, Permisos: [${(permissions || []).join(", ")}] por ${operatorName || "Administrador"}.`,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    });
    if (errorMsg) {
      return res.status(400).json({ error: errorMsg });
    }
    res.json(sanitizeForClient({ success: true, user: savedUser }));
  });
  app.post("/api/users/:id/delete", (req, res) => {
    const { id } = req.params;
    const { operatorName } = req.body;
    let errorMsg = "";
    LocalDb.updateState((state) => {
      if (!state.auditLogs) state.auditLogs = [];
      const index = state.users.findIndex((u) => u.id === id);
      if (index === -1) {
        errorMsg = "Usuario no encontrado";
        return;
      }
      const user = state.users[index];
      state.users.splice(index, 1);
      state.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        action: "Personal Eliminado",
        details: `Se elimin\xF3 el perfil de "${user.name}" (Rol: ${user.role}) por ${operatorName || "Administrador"}.`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    if (errorMsg) {
      return res.status(404).json({ error: errorMsg });
    }
    res.json({ success: true });
  });
  app.post("/api/ingredients", (req, res) => {
    const { id, name, stock, unit, minStock, operatorName } = req.body;
    if (!name || stock === void 0 || !unit || minStock === void 0) {
      return res.status(400).json({ error: "Faltan campos del ingrediente" });
    }
    let savedIng = null;
    LocalDb.updateState((state) => {
      if (!state.inventoryTransactions) state.inventoryTransactions = [];
      if (!state.auditLogs) state.auditLogs = [];
      const userName = operatorName || "Admin";
      if (id) {
        const ing = state.ingredients.find((i) => i.id === id);
        if (ing) {
          const prevStock = ing.stock;
          const newStock = Number(stock);
          const diff = newStock - prevStock;
          ing.name = name;
          ing.stock = newStock;
          ing.unit = unit;
          ing.minStock = Number(minStock);
          savedIng = ing;
          if (diff !== 0) {
            state.inventoryTransactions.push({
              id: "tx_inv_" + Math.random().toString(36).substr(2, 9),
              ingredientId: ing.id,
              ingredientName: ing.name,
              change: diff,
              type: diff > 0 ? "MANUAL_ADDITION" : "MANUAL_SUBTRACTION",
              createdAt: (/* @__PURE__ */ new Date()).toISOString()
            });
            state.auditLogs.push({
              id: "audit_" + Math.random().toString(36).substr(2, 9),
              action: "Ajuste de Stock",
              details: `Se ajust\xF3 el stock de ${ing.name} de ${prevStock} a ${newStock} ${ing.unit} por ${userName}.`,
              createdAt: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        }
      } else {
        const newId = "i_" + Math.random().toString(36).substr(2, 9);
        savedIng = {
          id: newId,
          name,
          stock: Number(stock),
          unit,
          minStock: Number(minStock)
        };
        state.ingredients.push(savedIng);
        state.inventoryTransactions.push({
          id: "tx_inv_" + Math.random().toString(36).substr(2, 9),
          ingredientId: newId,
          ingredientName: name,
          change: Number(stock),
          type: "MANUAL_ADDITION",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        state.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substr(2, 9),
          action: "Ingrediente Creado",
          details: `Se cre\xF3 el ingrediente ${name} con stock inicial de ${stock} ${unit} por ${userName}.`,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    });
    res.json({ success: true, ingredient: savedIng });
  });
  app.post("/api/reservations", (req, res) => {
    const { id, customerName, customerPhone, customerCount, dateTime, tableId, notes, status, advancePayment, advancePaymentMethod, items } = req.body;
    if (!customerName || !dateTime) {
      return res.status(400).json({ error: "Nombre y fecha/hora requeridos" });
    }
    let savedRes = null;
    LocalDb.updateState((state) => {
      if (id) {
        const r = state.reservations.find((res2) => res2.id === id);
        if (r) {
          r.customerName = customerName;
          r.customerPhone = customerPhone;
          r.customerCount = Number(customerCount);
          r.dateTime = dateTime;
          r.tableId = tableId || r.tableId;
          r.notes = notes;
          r.status = status || r.status;
          if (advancePayment !== void 0) r.advancePayment = Number(advancePayment) || 0;
          if (advancePaymentMethod !== void 0) r.advancePaymentMethod = advancePaymentMethod;
          if (items !== void 0) r.items = items;
          savedRes = r;
          if (r.status === "ARRIVED" /* ARRIVED */ && r.tableId) {
            const table = state.tables.find((t) => t.id === r.tableId);
            if (table) {
              table.status = "OCCUPIED" /* OCCUPIED */;
              const newOrder = {
                id: "o_" + Math.random().toString(36).substr(2, 9),
                tableId: r.tableId,
                status: "PREPARING" /* PREPARING */,
                customerCount: r.customerCount,
                createdAt: (/* @__PURE__ */ new Date()).toISOString(),
                updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
                items: Array.isArray(r.items) ? r.items.map((it) => ({
                  ...it,
                  id: "item_" + Math.random().toString(36).substr(2, 9),
                  status: "SENT_TO_KITCHEN" /* SENT_TO_KITCHEN */
                })) : [],
                customerPhone: r.customerPhone
              };
              state.orders.push(newOrder);
            }
          }
        }
      } else {
        const newId = "res_" + Math.random().toString(36).substr(2, 9);
        savedRes = {
          id: newId,
          customerName,
          customerPhone,
          customerCount: Number(customerCount),
          dateTime,
          tableId: tableId || void 0,
          notes: notes || "",
          status: status || "PENDING" /* PENDING */,
          advancePayment: Number(advancePayment) || 0,
          advancePaymentMethod: advancePaymentMethod || void 0,
          items: items || []
        };
        state.reservations.push(savedRes);
        if (tableId) {
          const table = state.tables.find((t) => t.id === tableId);
          if (table && table.status === "FREE" /* FREE */) {
            table.status = "RESERVED" /* RESERVED */;
          }
        }
      }
    });
    res.json({ success: true, reservation: savedRes });
  });
  app.delete("/api/reservations/:id", (req, res) => {
    const { id } = req.params;
    let found = false;
    LocalDb.updateState((state) => {
      const idx = state.reservations.findIndex((r) => r.id === id);
      if (idx !== -1) {
        const reservation = state.reservations[idx];
        if (reservation.tableId) {
          const table = state.tables.find((t) => t.id === reservation.tableId);
          if (table && table.status === "RESERVED" /* RESERVED */) {
            table.status = "FREE" /* FREE */;
          }
        }
        reservation.status = "CANCELLED" /* CANCELLED */;
        found = true;
      }
    });
    if (!found) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }
    res.json({ success: true });
  });
  app.post("/api/admin/config/toggle-menu-qr", (req, res) => {
    const { onlyViewMenuQr, userName } = req.body;
    LocalDb.updateState((state) => {
      state.onlyViewMenuQr = !!onlyViewMenuQr;
      if (!state.auditLogs) state.auditLogs = [];
      state.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        action: "Ajuste de Sistema",
        details: `Se cambi\xF3 el modo de la mesa a ${onlyViewMenuQr ? "Solo Visualizar Men\xFA QR" : "Comandas desde Mesa"} por ${userName || "Administrador"}.`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    res.json(sanitizeForClient({ success: true, state: LocalDb.getState() }));
  });
  app.post("/api/shifts/open", (req, res) => {
    const { userId, initialCash } = req.body;
    if (!userId || initialCash === void 0) {
      return res.status(400).json({ error: "Usuario y caja inicial requeridos" });
    }
    let openedShift = null;
    LocalDb.updateState((state) => {
      if (!state.auditLogs) state.auditLogs = [];
      const user = state.users.find((u) => u.id === userId);
      const userName = user ? user.name : "Mozo";
      state.shifts.forEach((sh) => {
        if (sh.status === "OPEN" /* OPEN */) {
          sh.status = "CLOSED" /* CLOSED */;
          sh.closedAt = (/* @__PURE__ */ new Date()).toISOString();
          sh.finalCash = sh.finalCash || sh.initialCash;
        }
      });
      openedShift = {
        id: "sh_" + Math.random().toString(36).substr(2, 9),
        userId,
        openedAt: (/* @__PURE__ */ new Date()).toISOString(),
        initialCash: Number(initialCash),
        status: "OPEN" /* OPEN */
      };
      state.shifts.push(openedShift);
      state.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        userId,
        userName,
        action: "Apertura de Caja",
        details: `${userName} abri\xF3 un turno de caja con saldo inicial de $${Number(initialCash).toLocaleString("es-CL")}.`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    res.json({ success: true, shift: openedShift });
  });
  app.post("/api/shifts/close", (req, res) => {
    const { id, finalCash } = req.body;
    if (!id || finalCash === void 0) {
      return res.status(400).json({ error: "ID de turno y arqueo final requeridos" });
    }
    let closedShift = null;
    LocalDb.updateState((state) => {
      if (!state.auditLogs) state.auditLogs = [];
      const sh = state.shifts.find((s) => s.id === id);
      if (sh) {
        sh.status = "CLOSED" /* CLOSED */;
        sh.closedAt = (/* @__PURE__ */ new Date()).toISOString();
        sh.finalCash = Number(finalCash);
        closedShift = sh;
        const user = state.users.find((u) => u.id === sh.userId);
        const userName = user ? user.name : "Usuario";
        state.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substr(2, 9),
          userId: sh.userId,
          userName,
          action: "Cierre de Caja",
          details: `${userName} cerr\xF3 su turno de caja con un arqueo final de $${Number(finalCash).toLocaleString("es-CL")}.`,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    });
    res.json({ success: true, shift: closedShift });
  });
  app.post("/api/admin/db/import", (req, res) => {
    const { state } = req.body;
    if (!state || typeof state !== "object") {
      return res.status(400).json({ error: "Datos de respaldo inv\xE1lidos" });
    }
    const required = ["users", "tables", "categories", "products", "ingredients", "orders", "customers"];
    const missing = required.filter((k) => !state[k]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `La copia de respaldo no es v\xE1lida. Faltan tablas: ${missing.join(", ")}` });
    }
    LocalDb.updateState((s) => {
      Object.keys(state).forEach((key) => {
        s[key] = state[key];
      });
      if (!s.auditLogs) s.auditLogs = [];
      s.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        action: "Restauraci\xF3n de Respaldo",
        details: "Se restaur\xF3 una copia de respaldo completa de la base de datos de manera exitosa.",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    res.json(sanitizeForClient({ success: true, state: LocalDb.getState() }));
  });
  app.post("/api/orders/:id/void", (req, res) => {
    const { id } = req.params;
    const { operatorName } = req.body;
    let success = false;
    let errorMsg = "";
    LocalDb.updateState((state) => {
      if (!state.auditLogs) state.auditLogs = [];
      if (!state.inventoryTransactions) state.inventoryTransactions = [];
      const order = state.orders.find((o) => o.id === id);
      if (!order) {
        errorMsg = "Pedido no encontrado";
        return;
      }
      if (order.status === "CLOSED" /* CLOSED */) {
        state.payments = state.payments.filter((p) => p.orderId !== id);
        if (order.customerPhone) {
          const customer = state.customers.find((c) => c.phone === order.customerPhone);
          if (customer) {
            const earnedPoints = Math.floor(order.items.reduce((sum, it) => {
              const p = state.products.find((prod) => prod.id === it.productId);
              return sum + (p ? p.price : 0) * it.quantity;
            }, 0) / 100);
            if (earnedPoints > 0) {
              customer.points = Math.max(0, customer.points - earnedPoints);
              state.loyaltyTxs.push({
                id: "tx_" + Math.random().toString(36).substr(2, 9),
                customerId: customer.id,
                points: earnedPoints,
                type: "REDEEMED" /* REDEEMED */,
                description: `Descuento por anulaci\xF3n de Pedido #${id}`,
                createdAt: (/* @__PURE__ */ new Date()).toISOString()
              });
            }
          }
        }
      }
      order.items.forEach((item) => {
        if (item.status !== "PENDING" /* PENDING */) {
          const product = state.products.find((p) => p.id === item.productId);
          if (product && product.recipe) {
            product.recipe.forEach((recipeItem) => {
              const ingredient = state.ingredients.find((i) => i.id === recipeItem.ingredientId);
              if (ingredient) {
                const qtyToRestore = recipeItem.quantity * item.quantity;
                ingredient.stock += qtyToRestore;
                state.inventoryTransactions.push({
                  id: "tx_inv_" + Math.random().toString(36).substr(2, 9),
                  ingredientId: ingredient.id,
                  ingredientName: ingredient.name,
                  change: qtyToRestore,
                  type: "VOID_RESTORE",
                  referenceId: id,
                  createdAt: (/* @__PURE__ */ new Date()).toISOString()
                });
              }
            });
          }
        }
      });
      const table = state.tables.find((t) => t.id === order.tableId);
      if (table) {
        table.status = "FREE" /* FREE */;
      }
      order.voided = true;
      order.status = "CLOSED" /* CLOSED */;
      state.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        action: "Pedido Anulado",
        details: `El pedido #${id} de Mesa ${table ? table.number : "?"} fue anulado por ${operatorName || "Administraci\xF3n"}. Se reembols\xF3 el inventario.`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      success = true;
    });
    if (!success) {
      return res.status(400).json({ error: errorMsg });
    }
    res.json(sanitizeForClient({ success: true, state: LocalDb.getState() }));
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path2.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path2.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.mjs.map
