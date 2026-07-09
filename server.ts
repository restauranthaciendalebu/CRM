import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { LocalDb } from "./server/db.js"; // Standard ES Modules syntax or tsx resolver
import { 
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
  Table,
  RestaurantState
} from "./src/types.js";

// Helper for ESM pathing
const __dirname = path.dirname(new URL(import.meta.url).pathname);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // Waiter notifications in-memory/JSON storage
  // We'll initialize it in DB if not exists or keep it locally on the server.
  // To make it persistent, let's just initialize a helper on LocalDb or keep an in-memory queue.
  let notifications: Array<{
    id: string;
    tableNumber: number;
    type: "CALL_WAITER" | "REQUEST_BILL" | "NEW_ORDER";
    createdAt: string;
    resolved: boolean;
    notes?: string;
  }> = [];

  // API ROUTES (Always FIRST)
  
  // 1. Full state endpoint
  app.get("/api/state", (req, res) => {
    try {
      const state = LocalDb.getState();
      res.json({
        ...state,
        notifications: notifications.filter(n => !n.resolved)
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 2. Authenticate PIN
  app.post("/api/auth/pin", (req, res) => {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: "PIN is required" });
    }
    const state = LocalDb.getState();
    const user = state.users.find(u => u.pin === pin);
    if (!user) {
      return res.status(401).json({ error: "PIN inválido" });
    }
    LocalDb.updateState(s => {
      if (!s.auditLogs) s.auditLogs = [];
      s.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        userId: user.id,
        userName: user.name,
        action: "Inicio de Sesión",
        details: `${user.name} inició sesión en el sistema.`,
        createdAt: new Date().toISOString()
      });
    });
    res.json(user);
  });

  // 3. Update table status or layout
  app.post("/api/tables", (req, res) => {
    const { tables } = req.body; // array of updated tables
    if (!tables || !Array.isArray(tables)) {
      return res.status(400).json({ error: "Invalid tables array" });
    }
    LocalDb.updateState(state => {
      state.tables = tables;
    });
    res.json({ success: true, tables: LocalDb.getState().tables });
  });

  // Update specific table status
  app.post("/api/tables/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }
    LocalDb.updateState(state => {
      const table = state.tables.find(t => t.id === id);
      if (table) {
        table.status = status as TableStatus;
      }
    });
    res.json({ success: true, tables: LocalDb.getState().tables });
  });

  // Open a free table
  app.post("/api/tables/:id/open", (req, res) => {
    const { id } = req.params;
    const { customerCount, waiterId } = req.body;

    const state = LocalDb.getState();
    const table = state.tables.find(t => t.id === id);
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }
    if (table.status === TableStatus.OCCUPIED) {
      return res.status(400).json({ error: "La mesa ya está ocupada" });
    }

    LocalDb.updateState(state => {
      if (!state.auditLogs) state.auditLogs = [];
      const t = state.tables.find(tbl => tbl.id === id);
      if (t) {
        t.status = TableStatus.OCCUPIED;
      }
      
      const waiter = state.users.find(u => u.id === waiterId);
      const waiterName = waiter ? waiter.name : "Mozo";
      
      // Create a blank pending/active order for this table
      const newOrderId = "o_" + Math.random().toString(36).substr(2, 9);
      const newOrder: Order = {
        id: newOrderId,
        tableId: id,
        waiterId: waiterId || null,
        status: OrderStatus.PREPARING, // Starts preparing directly if opened by waiter
        customerCount: customerCount || 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: []
      };
      state.orders.push(newOrder);

      state.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        userId: waiterId || undefined,
        userName: waiterName,
        action: "Mesa Abierta",
        details: `${waiterName} abrió la Mesa ${t ? t.number : "?"} para ${customerCount || 1} personas.`,
        createdAt: new Date().toISOString()
      });
    });

    res.json({ success: true, state: LocalDb.getState() });
  });

  // 4. Create Order / Add order from Customer QR (requires waiter approval)
  app.post("/api/orders", (req, res) => {
    const { tableId, items, customerCount, notes, customerPhone } = req.body;
    if (!tableId || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    let createdOrder: Order | null = null;

    LocalDb.updateState(state => {
      const table = state.tables.find(t => t.id === tableId);
      if (table) {
        table.status = TableStatus.OCCUPIED;
      }

      // Check if there is already an active order for this table
      let order = state.orders.find(o => o.tableId === tableId && o.status !== OrderStatus.CLOSED);
      
      if (order) {
        // Append items to existing order
        items.forEach(newItem => {
          const formattedItem: OrderItem = {
            id: "oi_" + Math.random().toString(36).substr(2, 9),
            productId: newItem.productId,
            quantity: newItem.quantity,
            notes: newItem.notes || "",
            status: OrderItemStatus.PENDING,
            selectedModifiers: newItem.selectedModifiers || [],
            tanda: newItem.tanda || 1
          };
          order!.items.push(formattedItem);
        });
        order.updatedAt = new Date().toISOString();
        createdOrder = order;
      } else {
        // Create new order (pending approval if from customer, otherwise active)
        const newOrderId = "o_" + Math.random().toString(36).substr(2, 9);
        const formattedItems: OrderItem[] = items.map(it => ({
          id: "oi_" + Math.random().toString(36).substr(2, 9),
          productId: it.productId,
          quantity: it.quantity,
          notes: it.notes || "",
          status: OrderItemStatus.PENDING,
          selectedModifiers: it.selectedModifiers || [],
          tanda: it.tanda || 1
        }));

        const isWaiter = req.body.isWaiter === true;

        const newOrder: Order = {
          id: newOrderId,
          tableId,
          waiterId: req.body.waiterId || null,
          status: isWaiter ? OrderStatus.PREPARING : OrderStatus.PENDING_APPROVAL,
          customerCount: customerCount || 1,
          notes: notes || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: formattedItems,
          customerPhone: customerPhone || undefined
        };
        state.orders.push(newOrder);
        createdOrder = newOrder;
      }

      // Add a notification for wait staff
      const tableNum = table ? table.number : 0;
      notifications.push({
        id: "nt_" + Math.random().toString(36).substr(2, 9),
        tableNumber: tableNum,
        type: "NEW_ORDER",
        createdAt: new Date().toISOString(),
        resolved: false,
        notes: `Nuevo pedido mesa ${tableNum}`
      });
    });

    res.json({ success: true, order: createdOrder });
  });

  // 5. Send order items to kitchen (moves them to preparing and deducts ingredients)
  app.post("/api/orders/:id/send-to-kitchen", (req, res) => {
    const { id } = req.params;
    let success = false;
    let errorMsg = "";

    LocalDb.updateState(state => {
      const order = state.orders.find(o => o.id === id);
      if (!order) {
        errorMsg = "Order not found";
        return;
      }

      // Find all PENDING items and send them to PREPARING
      let updatedCount = 0;
      order.items.forEach(item => {
        if (item.status === OrderItemStatus.PENDING) {
          item.status = OrderItemStatus.PREPARING;
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        // Deduct ingredients stock
        LocalDb.deductStockForOrder({
          ...order,
          items: order.items.filter(it => it.status === OrderItemStatus.PREPARING)
        }, state);

        order.status = OrderStatus.PREPARING;
        order.updatedAt = new Date().toISOString();
        success = true;
      } else {
        errorMsg = "No pending items to send to kitchen";
      }
    });

    if (!success) {
      return res.status(400).json({ error: errorMsg });
    }
    res.json({ success: true, order: LocalDb.getState().orders.find(o => o.id === id) });
  });

  // 6. Approve customer pending order
  app.post("/api/orders/:id/approve", (req, res) => {
    const { id } = req.params;
    const { waiterId } = req.body;

    LocalDb.updateState(state => {
      const order = state.orders.find(o => o.id === id);
      if (order) {
        order.status = OrderStatus.PREPARING;
        order.waiterId = waiterId;
        order.updatedAt = new Date().toISOString();
        
        // Mark pending items as preparing and deduct ingredients stock
        order.items.forEach(it => {
          if (it.status === OrderItemStatus.PENDING) {
            it.status = OrderItemStatus.PREPARING;
          }
        });
        
        LocalDb.deductStockForOrder(order, state);
      }
    });

    res.json({ success: true, order: LocalDb.getState().orders.find(o => o.id === id) });
  });

  // 7. Update kitchen item status (KDS actions)
  app.post("/api/orders/:id/items/:itemId/status", (req, res) => {
    const { id, itemId } = req.params;
    const { status } = req.body; // PENDING, PREPARING, READY, DELIVERED

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    LocalDb.updateState(state => {
      const order = state.orders.find(o => o.id === id);
      if (order) {
        const item = order.items.find(it => it.id === itemId);
        if (item) {
          item.status = status as OrderItemStatus;
          order.updatedAt = new Date().toISOString();
        }

        // Auto update order level status
        const allReady = order.items.every(it => it.status === OrderItemStatus.READY || it.status === OrderItemStatus.DELIVERED);
        const allDelivered = order.items.every(it => it.status === OrderItemStatus.DELIVERED);
        const anyPreparing = order.items.some(it => it.status === OrderItemStatus.PREPARING);

        if (allDelivered) {
          order.status = OrderStatus.DELIVERED;
        } else if (allReady) {
          order.status = OrderStatus.READY;
        } else if (anyPreparing) {
          order.status = OrderStatus.PREPARING;
        }
      }
    });

    res.json({ success: true, order: LocalDb.getState().orders.find(o => o.id === id) });
  });

  // 8. Call waiter & request bill notifications
  app.post("/api/notifications/call", (req, res) => {
    const { tableNumber, type, notes } = req.body; // type: 'CALL_WAITER' or 'REQUEST_BILL'
    if (!tableNumber || !type) {
      return res.status(400).json({ error: "Table number and type required" });
    }

    const id = "nt_" + Math.random().toString(36).substr(2, 9);
    const newNotif = {
      id,
      tableNumber: Number(tableNumber),
      type: type as "CALL_WAITER" | "REQUEST_BILL",
      createdAt: new Date().toISOString(),
      resolved: false,
      notes: notes || ""
    };
    notifications.push(newNotif);

    // If request bill, change table status to BILL_REQUESTED
    LocalDb.updateState(state => {
      const table = state.tables.find(t => t.number === Number(tableNumber));
      if (table && type === "REQUEST_BILL") {
        table.status = TableStatus.BILL_REQUESTED;
      }
    });

    res.json({ success: true, notification: newNotif });
  });

  // Resolve a notification
  app.post("/api/notifications/:id/resolve", (req, res) => {
    const { id } = req.params;
    const notif = notifications.find(n => n.id === id);
    if (notif) {
      notif.resolved = true;
    }
    res.json({ success: true, notifications: notifications.filter(n => !n.resolved) });
  });

  // 9. Close order & pay (supports splitting bill, records loyalty points)
  app.post("/api/orders/:id/close", (req, res) => {
    const { id } = req.params;
    const { payments, customerPhone, totalAmount, discount, tip } = req.body;

    if (!payments || !Array.isArray(payments)) {
      return res.status(400).json({ error: "Payments data is required" });
    }

    LocalDb.updateState(state => {
      const order = state.orders.find(o => o.id === id);
      if (!order) return;

      // Create Payment records
      payments.forEach(pay => {
        state.payments.push({
          id: "pay_" + Math.random().toString(36).substr(2, 9),
          orderId: id,
          amount: pay.amount,
          method: pay.method as PaymentMethod,
          tip: pay.tip || 0,
          discount: pay.discount || 0,
          createdAt: new Date().toISOString()
        });
      });

      order.status = OrderStatus.CLOSED;
      order.updatedAt = new Date().toISOString();

      // Free the table
      const table = state.tables.find(t => t.id === order.tableId);
      if (table) {
        table.status = TableStatus.FREE;
      }

      // Loyalty points management (Chile CLP format: 1 point per $100 CLP spent)
      if (customerPhone) {
        const customer = state.customers.find(c => c.phone === customerPhone);
        if (customer) {
          // Calculate points earned (1 point per 100 CLP of ticket total)
          const earnedPoints = Math.floor((totalAmount - (discount || 0)) / 100);
          if (earnedPoints > 0) {
            customer.points += earnedPoints;
            state.loyaltyTxs.push({
              id: "tx_" + Math.random().toString(36).substr(2, 9),
              customerId: customer.id,
              points: earnedPoints,
              type: LoyaltyTxType.EARNED,
              description: `Puntos ganados por consumo de Mesa ${table ? table.number : ""}`,
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    });

    res.json({ success: true, state: LocalDb.getState() });
  });

  // 10. Customer loyalty actions
  app.post("/api/customers", (req, res) => {
    const { name, phone, email, birthDate, allergies, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Nombre y teléfono son obligatorios" });
    }

    let customer: any = null;
    LocalDb.updateState(state => {
      const existing = state.customers.find(c => c.phone === phone);
      if (existing) {
        existing.name = name;
        existing.email = email || existing.email;
        existing.birthDate = birthDate || existing.birthDate;
        existing.allergies = allergies || existing.allergies;
        existing.notes = notes || existing.notes;
        customer = existing;
      } else {
        customer = {
          id: "cu_" + Math.random().toString(36).substr(2, 9),
          name,
          phone,
          email: email || "",
          birthDate: birthDate || "",
          allergies: allergies || [],
          points: 100, // 100 points signup bonus
          notes: notes || ""
        };
        state.customers.push(customer);
        state.loyaltyTxs.push({
          id: "tx_" + Math.random().toString(36).substr(2, 9),
          customerId: customer.id,
          points: 100,
          type: LoyaltyTxType.EARNED,
          description: "Bono de registro inicial de fidelización",
          createdAt: new Date().toISOString()
        });
      }
    });

    res.json({ success: true, customer });
  });

  // Redeem customer points
  app.post("/api/customers/:id/redeem", (req, res) => {
    const { id } = req.params;
    const { points, description } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({ error: "Points value must be greater than 0" });
    }

    let success = false;
    let errorMsg = "";

    LocalDb.updateState(state => {
      const customer = state.customers.find(c => c.id === id);
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
        points: points,
        type: LoyaltyTxType.REDEEMED,
        description: description || "Canje de productos",
        createdAt: new Date().toISOString()
      });
      success = true;
    });

    if (!success) {
      return res.status(400).json({ error: errorMsg });
    }
    res.json({ success: true, customer: LocalDb.getState().customers.find(c => c.id === id) });
  });

  // 11. Admin Menu & Category Actions
  app.post("/api/products", (req, res) => {
    const { id, name, description, price, imageUrl, categoryId, allergens, isAvailable, recipe } = req.body;
    if (!name || !price || !categoryId) {
      return res.status(400).json({ error: "Nombre, precio y categoría son obligatorios" });
    }

    let savedProduct: any = null;
    LocalDb.updateState(state => {
      if (id) {
        // Edit
        const prod = state.products.find(p => p.id === id);
        if (prod) {
          prod.name = name;
          prod.description = description;
          prod.price = Number(price);
          prod.imageUrl = imageUrl || prod.imageUrl;
          prod.categoryId = categoryId;
          prod.allergens = allergens || [];
          prod.isAvailable = isAvailable !== undefined ? isAvailable : prod.isAvailable;
          prod.recipe = recipe || prod.recipe || [];
          savedProduct = prod;
        }
      } else {
        // Add
        const newId = "p_" + Math.random().toString(36).substr(2, 9);
        savedProduct = {
          id: newId,
          name,
          description,
          price: Number(price),
          imageUrl: imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60",
          categoryId,
          allergens: allergens || [],
          isAvailable: isAvailable !== undefined ? isAvailable : true,
          recipe: recipe || []
        };
        state.products.push(savedProduct);
      }
    });

    res.json({ success: true, product: savedProduct });
  });

  // Disable/enable product instantly
  app.post("/api/products/:id/toggle-availability", (req, res) => {
    const { id } = req.params;
    let updated: any = null;
    LocalDb.updateState(state => {
      const prod = state.products.find(p => p.id === id);
      if (prod) {
        prod.isAvailable = !prod.isAvailable;
        updated = prod;
      }
    });
    res.json({ success: true, product: updated });
  });

  // 12. Admin Inventory management
  app.post("/api/ingredients", (req, res) => {
    const { id, name, stock, unit, minStock, operatorName } = req.body;
    if (!name || stock === undefined || !unit || minStock === undefined) {
      return res.status(400).json({ error: "Faltan campos del ingrediente" });
    }

    let savedIng: any = null;
    LocalDb.updateState(state => {
      if (!state.inventoryTransactions) state.inventoryTransactions = [];
      if (!state.auditLogs) state.auditLogs = [];

      const userName = operatorName || "Admin";

      if (id) {
        const ing = state.ingredients.find(i => i.id === id);
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
              createdAt: new Date().toISOString()
            });

            state.auditLogs.push({
              id: "audit_" + Math.random().toString(36).substr(2, 9),
              action: "Ajuste de Stock",
              details: `Se ajustó el stock de ${ing.name} de ${prevStock} a ${newStock} ${ing.unit} por ${userName}.`,
              createdAt: new Date().toISOString()
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
          createdAt: new Date().toISOString()
        });

        state.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substr(2, 9),
          action: "Ingrediente Creado",
          details: `Se creó el ingrediente ${name} con stock inicial de ${stock} ${unit} por ${userName}.`,
          createdAt: new Date().toISOString()
        });
      }
    });

    res.json({ success: true, ingredient: savedIng });
  });

  // 13. Reservations Management
  app.post("/api/reservations", (req, res) => {
    const { id, customerName, customerPhone, customerCount, dateTime, tableId, notes, status } = req.body;
    if (!customerName || !customerPhone || !customerCount || !dateTime) {
      return res.status(400).json({ error: "Nombre, teléfono, comensales y fecha/hora requeridos" });
    }

    let savedRes: any = null;
    LocalDb.updateState(state => {
      if (id) {
        const r = state.reservations.find(res => res.id === id);
        if (r) {
          r.customerName = customerName;
          r.customerPhone = customerPhone;
          r.customerCount = Number(customerCount);
          r.dateTime = dateTime;
          r.tableId = tableId || null;
          r.notes = notes;
          r.status = status || r.status;
          savedRes = r;

          // If status set to ARRIVED, assign table and set Table to occupied
          if (r.status === ReservationStatus.ARRIVED && r.tableId) {
            const table = state.tables.find(t => t.id === r.tableId);
            if (table) {
              table.status = TableStatus.OCCUPIED;
              
              // Automatically open table for this arrival
              const newOrder: Order = {
                id: "o_" + Math.random().toString(36).substr(2, 9),
                tableId: r.tableId,
                status: OrderStatus.PREPARING,
                customerCount: r.customerCount,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                items: [],
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
          tableId: tableId || undefined,
          notes: notes || "",
          status: status || ReservationStatus.PENDING
        };
        state.reservations.push(savedRes);
      }
    });

    res.json({ success: true, reservation: savedRes });
  });

  // Update Config: toggle Menu QR mode
  app.post("/api/admin/config/toggle-menu-qr", (req, res) => {
    const { onlyViewMenuQr, userName } = req.body;
    LocalDb.updateState(state => {
      state.onlyViewMenuQr = !!onlyViewMenuQr;
      if (!state.auditLogs) state.auditLogs = [];
      state.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        action: "Ajuste de Sistema",
        details: `Se cambió el modo de la mesa a ${onlyViewMenuQr ? "Solo Visualizar Menú QR" : "Comandas desde Mesa"} por ${userName || "Administrador"}.`,
        createdAt: new Date().toISOString()
      });
    });
    res.json({ success: true, state: LocalDb.getState() });
  });

  // 14. Shifts (Work sessions)
  app.post("/api/shifts/open", (req, res) => {
    const { userId, initialCash } = req.body;
    if (!userId || initialCash === undefined) {
      return res.status(400).json({ error: "Usuario y caja inicial requeridos" });
    }

    let openedShift: any = null;
    LocalDb.updateState(state => {
      if (!state.auditLogs) state.auditLogs = [];
      const user = state.users.find(u => u.id === userId);
      const userName = user ? user.name : "Mozo";

      // Close any previous open shifts
      state.shifts.forEach(sh => {
        if (sh.status === ShiftStatus.OPEN) {
          sh.status = ShiftStatus.CLOSED;
          sh.closedAt = new Date().toISOString();
          sh.finalCash = sh.finalCash || sh.initialCash;
        }
      });

      openedShift = {
        id: "sh_" + Math.random().toString(36).substr(2, 9),
        userId,
        openedAt: new Date().toISOString(),
        initialCash: Number(initialCash),
        status: ShiftStatus.OPEN
      };
      state.shifts.push(openedShift);

      state.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        userId,
        userName,
        action: "Apertura de Caja",
        details: `${userName} abrió un turno de caja con saldo inicial de $${Number(initialCash).toLocaleString("es-CL")}.`,
        createdAt: new Date().toISOString()
      });
    });

    res.json({ success: true, shift: openedShift });
  });

  app.post("/api/shifts/close", (req, res) => {
    const { id, finalCash } = req.body;
    if (!id || finalCash === undefined) {
      return res.status(400).json({ error: "ID de turno y arqueo final requeridos" });
    }

    let closedShift: any = null;
    LocalDb.updateState(state => {
      if (!state.auditLogs) state.auditLogs = [];
      const sh = state.shifts.find(s => s.id === id);
      if (sh) {
        sh.status = ShiftStatus.CLOSED;
        sh.closedAt = new Date().toISOString();
        sh.finalCash = Number(finalCash);
        closedShift = sh;

        const user = state.users.find(u => u.id === sh.userId);
        const userName = user ? user.name : "Usuario";

        state.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substr(2, 9),
          userId: sh.userId,
          userName,
          action: "Cierre de Caja",
          details: `${userName} cerró su turno de caja con un arqueo final de $${Number(finalCash).toLocaleString("es-CL")}.`,
          createdAt: new Date().toISOString()
        });
      }
    });

    res.json({ success: true, shift: closedShift });
  });

  // 15. Admin Backup Import
  app.post("/api/admin/db/import", (req, res) => {
    const { state } = req.body;
    if (!state || typeof state !== "object") {
      return res.status(400).json({ error: "Datos de respaldo inválidos" });
    }
    const required = ["users", "tables", "categories", "products", "ingredients", "orders", "customers"];
    const missing = required.filter(k => !state[k]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `La copia de respaldo no es válida. Faltan tablas: ${missing.join(", ")}` });
    }

    LocalDb.updateState(s => {
      Object.keys(state).forEach(key => {
        (s as any)[key] = state[key];
      });
      if (!s.auditLogs) s.auditLogs = [];
      s.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        action: "Restauración de Respaldo",
        details: "Se restauró una copia de respaldo completa de la base de datos de manera exitosa.",
        createdAt: new Date().toISOString()
      });
    });

    res.json({ success: true, state: LocalDb.getState() });
  });

  // 16. Void/Refund Order & Restore Stock
  app.post("/api/orders/:id/void", (req, res) => {
    const { id } = req.params;
    const { operatorName } = req.body;
    let success = false;
    let errorMsg = "";

    LocalDb.updateState(state => {
      if (!state.auditLogs) state.auditLogs = [];
      if (!state.inventoryTransactions) state.inventoryTransactions = [];

      const order = state.orders.find(o => o.id === id);
      if (!order) {
        errorMsg = "Pedido no encontrado";
        return;
      }

      if (order.status === OrderStatus.CLOSED) {
        state.payments = state.payments.filter(p => p.orderId !== id);

        if (order.customerPhone) {
          const customer = state.customers.find(c => c.phone === order.customerPhone);
          if (customer) {
            const earnedPoints = Math.floor((order.items.reduce((sum, it) => {
              const p = state.products.find(prod => prod.id === it.productId);
              return sum + (p ? p.price : 0) * it.quantity;
            }, 0)) / 100);
            if (earnedPoints > 0) {
              customer.points = Math.max(0, customer.points - earnedPoints);
              state.loyaltyTxs.push({
                id: "tx_" + Math.random().toString(36).substr(2, 9),
                customerId: customer.id,
                points: earnedPoints,
                type: LoyaltyTxType.REDEEMED,
                description: `Descuento por anulación de Pedido #${id}`,
                createdAt: new Date().toISOString()
              });
            }
          }
        }
      }

      order.items.forEach(item => {
        if (item.status !== OrderItemStatus.PENDING) {
          const product = state.products.find(p => p.id === item.productId);
          if (product && product.recipe) {
            product.recipe.forEach(recipeItem => {
              const ingredient = state.ingredients.find(i => i.id === recipeItem.ingredientId);
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
                  createdAt: new Date().toISOString()
                });
              }
            });
          }
        }
      });

      const table = state.tables.find(t => t.id === order.tableId);
      if (table) {
        table.status = TableStatus.FREE;
      }

      (order as any).voided = true;
      order.status = OrderStatus.CLOSED;

      state.auditLogs.push({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        action: "Pedido Anulado",
        details: `El pedido #${id} de Mesa ${table ? table.number : "?"} fue anulado por ${operatorName || "Administración"}. Se reembolsó el inventario.`,
        createdAt: new Date().toISOString()
      });

      success = true;
    });

    if (!success) {
      return res.status(400).json({ error: errorMsg });
    }
    res.json({ success: true, state: LocalDb.getState() });
  });

  // FRONTEND DEVELOPEMENT & ASSETS ROUTING
  if (process.env.NODE_ENV !== "production") {
    // Vite middleware setup
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind to 0.0.0.0 and listen
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
