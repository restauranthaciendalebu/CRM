import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot, runTransaction } from "firebase/firestore";
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
} from "./types";
import { DEMO_STATE } from "./demoState";

const STATE_DOC_REF = doc(db, "settings", "restaurant_state");

// Cache local of the database state
let currentCachedState: RestaurantState | null = null;
let stateListeners: ((state: RestaurantState) => void)[] = [];

// Helper function to dynamically subscribe to Firestore changes in real-time
export function subscribeToState(callback: (state: RestaurantState) => void) {
  stateListeners.push(callback);
  if (currentCachedState) {
    callback(currentCachedState);
  }
  return () => {
    stateListeners = stateListeners.filter(l => l !== callback);
  };
}

// Automatically listen to firestore state document in real time
onSnapshot(STATE_DOC_REF, async (docSnap) => {
  if (docSnap.exists()) {
    const data = docSnap.data() as RestaurantState;
    currentCachedState = data;
    stateListeners.forEach(listener => listener(data));
  } else {
    // Database hasn't been initialized yet. Save the default initial state
    console.log("No remote state found, initializing Firestore with default schema...");
    await setDoc(STATE_DOC_REF, DEMO_STATE);
  }
});

// Atomic transaction helper for mutating state safely
async function updateState(mutator: (state: RestaurantState) => void): Promise<RestaurantState> {
  return await runTransaction(db, async (transaction) => {
    const sfDoc = await transaction.get(STATE_DOC_REF);
    let state: RestaurantState;
    if (!sfDoc.exists()) {
      state = JSON.parse(JSON.stringify(DEMO_STATE));
    } else {
      state = sfDoc.data() as RestaurantState;
    }
    
    // Ensure all required fields exist
    if (!state.users) state.users = [];
    if (!state.tables) state.tables = [];
    if (!state.categories) state.categories = [];
    if (!state.products) state.products = [];
    if (!state.ingredients) state.ingredients = [];
    if (!state.orders) state.orders = [];
    if (!state.customers) state.customers = [];
    if (!state.loyaltyTxs) state.loyaltyTxs = [];
    if (!state.promotions) state.promotions = [];
    if (!state.payments) state.payments = [];
    if (!state.reservations) state.reservations = [];
    if (!state.shifts) state.shifts = [];
    if (!state.notifications) state.notifications = [];
    if (!state.auditLogs) state.auditLogs = [];
    if (!state.inventoryTransactions) state.inventoryTransactions = [];

    // Apply the mutator logic
    mutator(state);

    // Save back to firestore
    transaction.set(STATE_DOC_REF, state);
    return state;
  });
}

// Deduct ingredient stock based on ingredients used in order items
function deductStockForOrder(order: Order, state: RestaurantState) {
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
          id: "tx_inv_" + Math.random().toString(36).substring(2, 11),
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

// Local mock response helper
function createResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

// Intercept window.fetch and routing calls to simulate server
export async function handleLocalApiRequest(url: string, init?: RequestInit): Promise<Response> {
  const method = init?.method || "GET";
  const body = init?.body ? JSON.parse(init.body as string) : {};

  // Normalize path (remove base CRM path if exists)
  const path = url.replace(/^(https?:\/\/[^\/]+)?(\/CRM)?/, "");

  try {
    // 1. Get state
    if (path === "/api/state" && method === "GET") {
      if (!currentCachedState) {
        // Wait a bit for initial snapshot or fetch once
        const snap = await getDoc(STATE_DOC_REF);
        if (snap.exists()) {
          currentCachedState = snap.data() as RestaurantState;
        } else {
          await setDoc(STATE_DOC_REF, DEMO_STATE);
          currentCachedState = DEMO_STATE;
        }
      }
      // Return unresolved notifications only to waitstaff
      const state = {
        ...currentCachedState,
        notifications: currentCachedState!.notifications ? currentCachedState!.notifications.filter(n => !n.resolved) : []
      };
      return createResponse(state);
    }

    // 2. Auth PIN
    if (path === "/api/auth/pin" && method === "POST") {
      const { pin } = body;
      const state = currentCachedState || DEMO_STATE;
      const user = state.users.find(u => u.pin === pin);
      if (!user) {
        return createResponse({ error: "PIN inválido" }, 401);
      }
      await updateState(s => {
        if (!s.auditLogs) s.auditLogs = [];
        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          userId: user.id,
          userName: user.name,
          action: "Inicio de Sesión",
          details: `${user.name} inició sesión en el sistema.`,
          createdAt: new Date().toISOString()
        });
      });
      return createResponse(user);
    }

    // 3. Update tables
    if (path === "/api/tables" && method === "POST") {
      const { tables } = body;
      const updated = await updateState(s => {
        s.tables = tables;
      });
      return createResponse({ success: true, tables: updated.tables });
    }

    // Update specific table status
    const tableStatusMatch = path.match(/^\/api\/tables\/([^\/]+)\/status$/);
    if (tableStatusMatch && method === "POST") {
      const id = tableStatusMatch[1];
      const { status } = body;
      const updated = await updateState(s => {
        const table = s.tables.find(t => t.id === id);
        if (table) {
          table.status = status as TableStatus;
        }
      });
      return createResponse({ success: true, tables: updated.tables });
    }

    // Open a free table
    const tableOpenMatch = path.match(/^\/api\/tables\/([^\/]+)\/open$/);
    if (tableOpenMatch && method === "POST") {
      const id = tableOpenMatch[1];
      const { customerCount, waiterId } = body;

      let errorMsg = "";
      const updated = await updateState(s => {
        const table = s.tables.find(t => t.id === id);
        if (!table) {
          errorMsg = "Mesa no encontrada";
          return;
        }
        if (table.status === TableStatus.OCCUPIED) {
          errorMsg = "La mesa ya está ocupada";
          return;
        }
        table.status = TableStatus.OCCUPIED;
        
        const waiter = s.users.find(u => u.id === waiterId);
        const waiterName = waiter ? waiter.name : "Mozo";
        
        const newOrderId = "o_" + Math.random().toString(36).substring(2, 11);
        const newOrder: Order = {
          id: newOrderId,
          tableId: id,
          waiterId: waiterId || null,
          status: OrderStatus.PREPARING,
          customerCount: customerCount || 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: []
        };
        s.orders.push(newOrder);

        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          userId: waiterId || undefined,
          userName: waiterName,
          action: "Mesa Abierta",
          details: `${waiterName} abrió la Mesa ${table.number} para ${customerCount || 1} personas.`,
          createdAt: new Date().toISOString()
        });
      });

      if (errorMsg) {
        return createResponse({ error: errorMsg }, 400);
      }
      return createResponse({ success: true, state: updated });
    }

    // 4. Create Order / Add order from Customer QR
    if (path === "/api/orders" && method === "POST") {
      const { tableId, items, customerCount, notes, customerPhone } = body;
      let createdOrder: Order | null = null;

      await updateState(s => {
        const table = s.tables.find(t => t.id === tableId);
        if (table) {
          table.status = TableStatus.OCCUPIED;
        }

        let order = s.orders.find(o => o.tableId === tableId && o.status !== OrderStatus.CLOSED);
        if (order) {
          items.forEach((newItem: any) => {
            const formattedItem: OrderItem = {
              id: "oi_" + Math.random().toString(36).substring(2, 11),
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
          const newOrderId = "o_" + Math.random().toString(36).substring(2, 11);
          const formattedItems: OrderItem[] = items.map((it: any) => ({
            id: "oi_" + Math.random().toString(36).substring(2, 11),
            productId: it.productId,
            quantity: it.quantity,
            notes: it.notes || "",
            status: OrderItemStatus.PENDING,
            selectedModifiers: it.selectedModifiers || [],
            tanda: it.tanda || 1
          }));

          const isWaiter = body.isWaiter === true;

          const newOrder: Order = {
            id: newOrderId,
            tableId,
            waiterId: body.waiterId || null,
            status: isWaiter ? OrderStatus.PREPARING : OrderStatus.PENDING_APPROVAL,
            customerCount: customerCount || 1,
            notes: notes || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: formattedItems,
            customerPhone: customerPhone || undefined
          };
          s.orders.push(newOrder);
          createdOrder = newOrder;
        }

        const tableNum = table ? table.number : 0;
        s.notifications.push({
          id: "nt_" + Math.random().toString(36).substring(2, 11),
          tableNumber: tableNum,
          type: "NEW_ORDER",
          createdAt: new Date().toISOString(),
          resolved: false,
          notes: `Nuevo pedido mesa ${tableNum}`
        });
      });

      return createResponse({ success: true, order: createdOrder });
    }

    // 5. Send order items to kitchen
    const sendToKitchenMatch = path.match(/^\/api\/orders\/([^\/]+)\/send-to-kitchen$/);
    if (sendToKitchenMatch && method === "POST") {
      const id = sendToKitchenMatch[1];
      let errorMsg = "";

      const updated = await updateState(s => {
        const order = s.orders.find(o => o.id === id);
        if (!order) {
          errorMsg = "Order not found";
          return;
        }

        let updatedCount = 0;
        order.items.forEach(item => {
          if (item.status === OrderItemStatus.PENDING) {
            item.status = OrderItemStatus.PREPARING;
            updatedCount++;
          }
        });

        if (updatedCount > 0) {
          deductStockForOrder({
            ...order,
            items: order.items.filter(it => it.status === OrderItemStatus.PREPARING)
          }, s);

          order.status = OrderStatus.PREPARING;
          order.updatedAt = new Date().toISOString();
        } else {
          errorMsg = "No pending items to send to kitchen";
        }
      });

      if (errorMsg) {
        return createResponse({ error: errorMsg }, 400);
      }
      return createResponse({ success: true, order: updated.orders.find(o => o.id === id) });
    }

    // 6. Approve customer pending order
    const orderApproveMatch = path.match(/^\/api\/orders\/([^\/]+)\/approve$/);
    if (orderApproveMatch && method === "POST") {
      const id = orderApproveMatch[1];
      const { waiterId } = body;

      const updated = await updateState(s => {
        const order = s.orders.find(o => o.id === id);
        if (order) {
          order.status = OrderStatus.PREPARING;
          order.waiterId = waiterId;
          order.updatedAt = new Date().toISOString();
          
          order.items.forEach(it => {
            if (it.status === OrderItemStatus.PENDING) {
              it.status = OrderItemStatus.PREPARING;
            }
          });
          
          deductStockForOrder(order, s);
        }
      });
      return createResponse({ success: true, order: updated.orders.find(o => o.id === id) });
    }

    // 7. Update kitchen item status
    const itemStatusMatch = path.match(/^\/api\/orders\/([^\/]+)\/items\/([^\/]+)\/status$/);
    if (itemStatusMatch && method === "POST") {
      const { 0: _, 1: id, 2: itemId } = itemStatusMatch;
      const { status } = body;

      const updated = await updateState(s => {
        const order = s.orders.find(o => o.id === id);
        if (order) {
          const item = order.items.find(it => it.id === itemId);
          if (item) {
            item.status = status as OrderItemStatus;
            order.updatedAt = new Date().toISOString();
          }

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
      return createResponse({ success: true, order: updated.orders.find(o => o.id === id) });
    }

    // 8. Call waiter notifications
    if (path === "/api/notifications/call" && method === "POST") {
      const { tableNumber, type, notes } = body;
      const notifId = "nt_" + Math.random().toString(36).substring(2, 11);
      const newNotif = {
        id: notifId,
        tableNumber: Number(tableNumber),
        type: type as "CALL_WAITER" | "REQUEST_BILL",
        createdAt: new Date().toISOString(),
        resolved: false,
        notes: notes || ""
      };

      await updateState(s => {
        s.notifications.push(newNotif);
        const table = s.tables.find(t => t.number === Number(tableNumber));
        if (table && type === "REQUEST_BILL") {
          table.status = TableStatus.BILL_REQUESTED;
        }
      });

      return createResponse({ success: true, notification: newNotif });
    }

    // Resolve notification
    const notifResolveMatch = path.match(/^\/api\/notifications\/([^\/]+)\/resolve$/);
    if (notifResolveMatch && method === "POST") {
      const id = notifResolveMatch[1];
      const updated = await updateState(s => {
        const notif = s.notifications.find(n => n.id === id);
        if (notif) {
          notif.resolved = true;
        }
      });
      return createResponse({ success: true, notifications: updated.notifications.filter(n => !n.resolved) });
    }

    // 9. Close order & pay
    const orderCloseMatch = path.match(/^\/api\/orders\/([^\/]+)\/close$/);
    if (orderCloseMatch && method === "POST") {
      const id = orderCloseMatch[1];
      const { payments, customerPhone, totalAmount, discount, tip } = body;

      const updated = await updateState(s => {
        const order = s.orders.find(o => o.id === id);
        if (!order) return;

        payments.forEach((pay: any) => {
          s.payments.push({
            id: "pay_" + Math.random().toString(36).substring(2, 11),
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

        const table = s.tables.find(t => t.id === order.tableId);
        if (table) {
          table.status = TableStatus.FREE;
        }

        if (customerPhone) {
          const customer = s.customers.find(c => c.phone === customerPhone);
          if (customer) {
            const earnedPoints = Math.floor((totalAmount - (discount || 0)) / 100);
            if (earnedPoints > 0) {
              customer.points += earnedPoints;
              s.loyaltyTxs.push({
                id: "tx_" + Math.random().toString(36).substring(2, 11),
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

      return createResponse({ success: true, state: updated });
    }

    // 10. Customer loyalty actions
    if (path === "/api/customers" && method === "POST") {
      const { name, phone, email, birthDate, allergies, notes } = body;
      let customer: any = null;

      await updateState(s => {
        const existing = s.customers.find(c => c.phone === phone);
        if (existing) {
          existing.name = name;
          existing.email = email || existing.email;
          existing.birthDate = birthDate || existing.birthDate;
          existing.allergies = allergies || existing.allergies;
          existing.notes = notes || existing.notes;
          customer = existing;
        } else {
          customer = {
            id: "cu_" + Math.random().toString(36).substring(2, 11),
            name,
            phone,
            email: email || "",
            birthDate: birthDate || "",
            allergies: allergies || [],
            points: 100,
            notes: notes || ""
          };
          s.customers.push(customer);
          s.loyaltyTxs.push({
            id: "tx_" + Math.random().toString(36).substring(2, 11),
            customerId: customer.id,
            points: 100,
            type: LoyaltyTxType.EARNED,
            description: "Bono de registro inicial de fidelización",
            createdAt: new Date().toISOString()
          });
        }
      });

      return createResponse({ success: true, customer });
    }

    // Redeem customer points
    const customerRedeemMatch = path.match(/^\/api\/customers\/([^\/]+)\/redeem$/);
    if (customerRedeemMatch && method === "POST") {
      const id = customerRedeemMatch[1];
      const { points, description } = body;

      let errorMsg = "";
      const updated = await updateState(s => {
        const customer = s.customers.find(c => c.id === id);
        if (!customer) {
          errorMsg = "Cliente no encontrado";
          return;
        }
        if (customer.points < points) {
          errorMsg = `Puntos insuficientes. Tiene ${customer.points} e intenta canjear ${points}.`;
          return;
        }

        customer.points -= points;
        s.loyaltyTxs.push({
          id: "tx_" + Math.random().toString(36).substring(2, 11),
          customerId: id,
          points: points,
          type: LoyaltyTxType.REDEEMED,
          description: description || "Canje de productos",
          createdAt: new Date().toISOString()
        });
      });

      if (errorMsg) {
        return createResponse({ error: errorMsg }, 400);
      }
      return createResponse({ success: true, customer: updated.customers.find(c => c.id === id) });
    }

    // 11. Admin Menu & Category Actions
    if (path === "/api/products" && method === "POST") {
      const { id, name, description, price, imageUrl, categoryId, allergens, isAvailable, recipe } = body;
      let savedProduct: any = null;

      await updateState(s => {
        if (id) {
          const prod = s.products.find(p => p.id === id);
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
          const newId = "p_" + Math.random().toString(36).substring(2, 11);
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
          s.products.push(savedProduct);
        }
      });

      return createResponse({ success: true, product: savedProduct });
    }

    // Toggle product availability
    const productToggleMatch = path.match(/^\/api\/products\/([^\/]+)\/toggle-availability$/);
    if (productToggleMatch && method === "POST") {
      const id = productToggleMatch[1];
      let updatedProd: any = null;
      await updateState(s => {
        const prod = s.products.find(p => p.id === id);
        if (prod) {
          prod.isAvailable = !prod.isAvailable;
          updatedProd = prod;
        }
      });
      return createResponse({ success: true, product: updatedProd });
    }

    // 12. Admin Inventory management
    if (path === "/api/ingredients" && method === "POST") {
      const { id, name, stock, unit, minStock, operatorName } = body;
      let savedIng: any = null;

      await updateState(s => {
        const userName = operatorName || "Admin";

        if (id) {
          const ing = s.ingredients.find(i => i.id === id);
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
              s.inventoryTransactions.push({
                id: "tx_inv_" + Math.random().toString(36).substring(2, 11),
                ingredientId: ing.id,
                ingredientName: ing.name,
                change: diff,
                type: diff > 0 ? "MANUAL_ADDITION" : "MANUAL_SUBTRACTION",
                createdAt: new Date().toISOString()
              });

              s.auditLogs.push({
                id: "audit_" + Math.random().toString(36).substring(2, 11),
                action: "Ajuste de Stock",
                details: `Se ajustó el stock de ${ing.name} de ${prevStock} a ${newStock} ${ing.unit} por ${userName}.`,
                createdAt: new Date().toISOString()
              });
            }
          }
        } else {
          const newId = "i_" + Math.random().toString(36).substring(2, 11);
          savedIng = {
            id: newId,
            name,
            stock: Number(stock),
            unit,
            minStock: Number(minStock)
          };
          s.ingredients.push(savedIng);

          s.inventoryTransactions.push({
            id: "tx_inv_" + Math.random().toString(36).substring(2, 11),
            ingredientId: newId,
            ingredientName: name,
            change: Number(stock),
            type: "MANUAL_ADDITION",
            createdAt: new Date().toISOString()
          });

          s.auditLogs.push({
            id: "audit_" + Math.random().toString(36).substring(2, 11),
            action: "Ingrediente Creado",
            details: `Se creó el ingrediente ${name} con stock inicial de ${stock} ${unit} por ${userName}.`,
            createdAt: new Date().toISOString()
          });
        }
      });

      return createResponse({ success: true, ingredient: savedIng });
    }

    // 13. Reservations Management
    if (path === "/api/reservations" && method === "POST") {
      const { id, customerName, customerPhone, customerCount, dateTime, tableId, notes, status } = body;
      let savedRes: any = null;

      await updateState(s => {
        if (id) {
          const r = s.reservations.find(res => res.id === id);
          if (r) {
            r.customerName = customerName;
            r.customerPhone = customerPhone;
            r.customerCount = Number(customerCount);
            r.dateTime = dateTime;
            r.tableId = tableId || null;
            r.notes = notes;
            r.status = status || r.status;
            savedRes = r;

            if (r.status === ReservationStatus.ARRIVED && r.tableId) {
              const table = s.tables.find(t => t.id === r.tableId);
              if (table) {
                table.status = TableStatus.OCCUPIED;
                const newOrder: Order = {
                  id: "o_" + Math.random().toString(36).substring(2, 11),
                  tableId: r.tableId,
                  status: OrderStatus.PREPARING,
                  customerCount: r.customerCount,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  items: [],
                  customerPhone: r.customerPhone
                };
                s.orders.push(newOrder);
              }
            }
          }
        } else {
          const newId = "res_" + Math.random().toString(36).substring(2, 11);
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
          s.reservations.push(savedRes);
        }
      });

      return createResponse({ success: true, reservation: savedRes });
    }

    // Update Config QR Mode
    if (path === "/api/admin/config/toggle-menu-qr" && method === "POST") {
      const { onlyViewMenuQr, userName } = body;
      const updated = await updateState(s => {
        s.onlyViewMenuQr = !!onlyViewMenuQr;
        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          action: "Ajuste de Sistema",
          details: `Se cambió el modo de la mesa a ${onlyViewMenuQr ? "Solo Visualizar Menú QR" : "Comandas desde Mesa"} por ${userName || "Administrador"}.`,
          createdAt: new Date().toISOString()
        });
      });
      return createResponse({ success: true, state: updated });
    }

    // 14. Shifts
    if (path === "/api/shifts/open" && method === "POST") {
      const { userId, initialCash } = body;
      let openedShift: any = null;

      await updateState(s => {
        const user = s.users.find(u => u.id === userId);
        const userName = user ? user.name : "Mozo";

        s.shifts.forEach(sh => {
          if (sh.status === ShiftStatus.OPEN) {
            sh.status = ShiftStatus.CLOSED;
            sh.closedAt = new Date().toISOString();
            sh.finalCash = sh.finalCash || sh.initialCash;
          }
        });

        openedShift = {
          id: "sh_" + Math.random().toString(36).substring(2, 11),
          userId,
          openedAt: new Date().toISOString(),
          initialCash: Number(initialCash),
          status: ShiftStatus.OPEN
        };
        s.shifts.push(openedShift);

        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          userId,
          userName,
          action: "Apertura de Caja",
          details: `${userName} abrió un turno de caja con saldo inicial de $${Number(initialCash).toLocaleString("es-CL")}.`,
          createdAt: new Date().toISOString()
        });
      });

      return createResponse({ success: true, shift: openedShift });
    }

    if (path === "/api/shifts/close" && method === "POST") {
      const { id, finalCash } = body;
      let closedShift: any = null;

      await updateState(s => {
        const sh = s.shifts.find(s => s.id === id);
        if (sh) {
          sh.status = ShiftStatus.CLOSED;
          sh.closedAt = new Date().toISOString();
          sh.finalCash = Number(finalCash);
          closedShift = sh;

          const user = s.users.find(u => u.id === sh.userId);
          const userName = user ? user.name : "Usuario";

          s.auditLogs.push({
            id: "audit_" + Math.random().toString(36).substring(2, 11),
            userId: sh.userId,
            userName,
            action: "Cierre de Caja",
            details: `${userName} cerró su turno de caja con un arqueo final de $${Number(finalCash).toLocaleString("es-CL")}.`,
            createdAt: new Date().toISOString()
          });
        }
      });

      return createResponse({ success: true, shift: closedShift });
    }

    // 15. Import Backup DB
    if (path === "/api/admin/db/import" && method === "POST") {
      const { state: importedState } = body;
      const updated = await updateState(s => {
        Object.keys(importedState).forEach(key => {
          (s as any)[key] = importedState[key];
        });
        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          action: "Restauración de Respaldo",
          details: "Se restauró una copia de respaldo completa de la base de datos de manera exitosa.",
          createdAt: new Date().toISOString()
        });
      });
      return createResponse({ success: true, state: updated });
    }

    // 16. Void Order
    const orderVoidMatch = path.match(/^\/api\/orders\/([^\/]+)\/void$/);
    if (orderVoidMatch && method === "POST") {
      const id = orderVoidMatch[1];
      const { operatorName } = body;

      let errorMsg = "";
      const updated = await updateState(s => {
        const order = s.orders.find(o => o.id === id);
        if (!order) {
          errorMsg = "Pedido no encontrado";
          return;
        }

        if (order.status === OrderStatus.CLOSED) {
          s.payments = s.payments.filter(p => p.orderId !== id);

          if (order.customerPhone) {
            const customer = s.customers.find(c => c.phone === order.customerPhone);
            if (customer) {
              const earnedPoints = Math.floor((order.items.reduce((sum, it) => {
                const p = s.products.find(prod => prod.id === it.productId);
                return sum + (p ? p.price : 0) * it.quantity;
              }, 0)) / 100);
              if (earnedPoints > 0) {
                customer.points = Math.max(0, customer.points - earnedPoints);
                s.loyaltyTxs.push({
                  id: "tx_" + Math.random().toString(36).substring(2, 11),
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
            const product = s.products.find(p => p.id === item.productId);
            if (product && product.recipe) {
              product.recipe.forEach(recipeItem => {
                const ingredient = s.ingredients.find(i => i.id === recipeItem.ingredientId);
                if (ingredient) {
                  const qtyToRestore = recipeItem.quantity * item.quantity;
                  ingredient.stock += qtyToRestore;

                  s.inventoryTransactions.push({
                    id: "tx_inv_" + Math.random().toString(36).substring(2, 11),
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

        const table = s.tables.find(t => t.id === order.tableId);
        if (table) {
          table.status = TableStatus.FREE;
        }

        (order as any).voided = true;
        order.status = OrderStatus.CLOSED;

        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          action: "Pedido Anulado",
          details: `El pedido #${id} de Mesa ${table ? table.number : "?"} fue anulado por ${operatorName || "Administración"}. Se reembolsó el inventario.`,
          createdAt: new Date().toISOString()
        });
      });

      if (errorMsg) {
        return createResponse({ error: errorMsg }, 400);
      }
      return createResponse({ success: true, state: updated });
    }

    return createResponse({ error: "Ruta de API no encontrada" }, 404);
  } catch (error: any) {
    console.error("API Mock Intercept Error: ", error);
    return createResponse({ error: error.message || "Error interno del servidor simulado" }, 500);
  }
}
