import { auth, db } from "./firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
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
  Table,
  Customer,
  User,
  RecoveryRecord,
  RecoverableCollection,
} from "./types";
import { DEMO_STATE } from "./demoState";
import { isDirectServiceProduct } from "./orderUtils";
import { recalculateOrderStatus, restoreOrderItemStock } from "./orderItemMutationUtils";
import { createTable, ensureMinimumTables } from "./tableUtils";
import { getRemainingBalance } from "./billingUtils";
import { parseAndValidateBackup } from "./backupUtils";
import { shouldArchiveEntityChange } from "./recoveryUtils";

// Cache local of the database state
let currentCachedState: RestaurantState | null = null;
let currentClientState: RestaurantState | null = null;
let currentClientStateJson = "";
let stateListeners: ((state: RestaurantState) => void)[] = [];
let firestoreUnsubscribers: Array<() => void> = [];
let subscriptionGeneration = 0;
let canReadRecoveryArchive = false;

const COLLECTION_FIELDS = [
  "users",
  "tables",
  "categories",
  "products",
  "ingredients",
  "orders",
  "customers",
  "loyaltyTxs",
  "promotions",
  "payments",
  "reservations",
  "shifts",
  "notifications",
  "auditLogs",
  "inventoryTransactions",
  "recoveryArchive",
] as const;
type CollectionField = typeof COLLECTION_FIELDS[number];

const PUBLIC_COLLECTIONS = ["tables", "categories", "products"] as const;
const WAITER_COLLECTIONS = COLLECTION_FIELDS.filter((field) => field !== "recoveryArchive");
const KITCHEN_COLLECTIONS: CollectionField[] = [
  "users",
  "tables",
  "categories",
  "products",
  "ingredients",
  "orders",
  "notifications",
  "auditLogs",
  "inventoryTransactions",
  "promotions",
];
const RECOVERABLE_COLLECTIONS = new Set<RecoverableCollection>([
  "users",
  "tables",
  "categories",
  "products",
  "ingredients",
  "orders",
  "customers",
  "loyaltyTxs",
  "promotions",
  "payments",
  "reservations",
  "shifts",
  "notifications",
]);

function createEmptyState(): RestaurantState {
  return {
    users: [],
    tables: [],
    categories: [],
    products: [],
    ingredients: [],
    orders: [],
    customers: [],
    loyaltyTxs: [],
    promotions: [],
    payments: [],
    reservations: [],
    shifts: [],
    notifications: [],
    auditLogs: [],
    inventoryTransactions: [],
    recoveryArchive: [],
    onlyViewMenuQr: false,
  };
}

function cloneState(state: RestaurantState): RestaurantState {
  return JSON.parse(JSON.stringify(state)) as RestaurantState;
}

function ensureStateArrays(state: RestaurantState) {
  for (const field of COLLECTION_FIELDS) {
    if (!Array.isArray(state[field])) (state as any)[field] = [];
  }
}

// Helper function to dynamically subscribe to Firestore changes in real-time
export function subscribeToState(callback: (state: RestaurantState) => void) {
  stateListeners.push(callback);
  if (currentClientState) {
    callback(currentClientState);
  }
  return () => {
    stateListeners = stateListeners.filter(l => l !== callback);
  };
}

function publishState(state: RestaurantState, authoritative = true) {
  // Optimistic UI updates must never replace the Firestore-backed source used
  // by updateState, or the transaction will think the change already happened.
  if (authoritative) currentCachedState = state;
  const clientStateJson = JSON.stringify(
    state,
    (key, value) => (key === "pin" || key === "password") ? "" : value
  );
  if (clientStateJson === currentClientStateJson) return;

  currentClientStateJson = clientStateJson;
  currentClientState = JSON.parse(clientStateJson) as RestaurantState;
  stateListeners.forEach(listener => listener(currentClientState!));
}

// Applies a small UI-only change while the server transaction is in flight.
// The next Firestore snapshot remains the source of truth.
export function applyLocalStateUpdate(mutator: (state: RestaurantState) => void) {
  if (!currentCachedState) return;
  const nextState = JSON.parse(JSON.stringify(currentCachedState)) as RestaurantState;
  mutator(nextState);
  publishState(nextState, false);
}

async function getReadableCollections(): Promise<readonly CollectionField[]> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) {
    canReadRecoveryArchive = false;
    return PUBLIC_COLLECTIONS;
  }
  const accessSnapshot = await getDoc(doc(db, "access", currentUser.uid));
  const role = accessSnapshot.data()?.role as Role | undefined;
  canReadRecoveryArchive = role === Role.ADMIN;
  if (role === Role.ADMIN) return COLLECTION_FIELDS;
  if (role === Role.WAITER) return WAITER_COLLECTIONS;
  if (role === Role.KITCHEN) return KITCHEN_COLLECTIONS;
  return PUBLIC_COLLECTIONS;
}

export async function refreshStateFromServer() {
  if (!currentCachedState) return;
  const next = cloneState(currentCachedState);
  const fields = await getReadableCollections();
  await Promise.all(fields.map(async (field) => {
    const snapshot = await getDocs(collection(db, field));
    (next as any)[field] = snapshot.docs.map((item) => item.data());
  }));
  const configSnapshot = await getDoc(doc(db, "config", "restaurant"));
  if (configSnapshot.exists()) {
    next.onlyViewMenuQr = Boolean(configSnapshot.data().onlyViewMenuQr);
  }
  currentCachedState = next;
  publishState(next);
}

async function startFirestoreSubscriptions() {
  const generation = ++subscriptionGeneration;
  firestoreUnsubscribers.forEach((unsubscribe) => unsubscribe());
  firestoreUnsubscribers = [];
  const next = createEmptyState();
  const currentUser = auth.currentUser;
  const isStaff = Boolean(currentUser && !currentUser.isAnonymous);
  const readableFields = await getReadableCollections();
  if (generation !== subscriptionGeneration) return;
  const required = new Set<string>([...PUBLIC_COLLECTIONS, "staffDirectory", "config"]);
  if (isStaff) readableFields.forEach((field) => required.add(field));
  if (currentUser?.isAnonymous) required.add("orders");
  const loaded = new Set<string>();

  const commit = (name: string) => {
    loaded.add(name);
    if ([...required].every((entry) => loaded.has(entry))) {
      currentCachedState = next;
      publishState(next);
    }
  };

  for (const field of PUBLIC_COLLECTIONS) {
    firestoreUnsubscribers.push(onSnapshot(collection(db, field), (snapshot) => {
      (next as any)[field] = snapshot.docs.map((item) => item.data());
      commit(field);
    }, (error) => {
      console.error(`No se pudo leer ${field}`, error);
      commit(field);
    }));
  }

  firestoreUnsubscribers.push(onSnapshot(collection(db, "staffDirectory"), (snapshot) => {
    if (!isStaff) {
      next.users = snapshot.docs.map((item) => item.data() as User);
    }
    commit("staffDirectory");
  }, (error) => {
    console.error("No se pudo leer el directorio de personal", error);
    commit("staffDirectory");
  }));

  firestoreUnsubscribers.push(onSnapshot(doc(db, "config", "restaurant"), (snapshot) => {
    next.onlyViewMenuQr = Boolean(snapshot.data()?.onlyViewMenuQr);
    commit("config");
  }, (error) => {
    console.error("No se pudo leer la configuración", error);
    commit("config");
  }));

  if (isStaff) {
    for (const field of readableFields) {
      if ((PUBLIC_COLLECTIONS as readonly string[]).includes(field)) {
        commit(field);
        continue;
      }
      firestoreUnsubscribers.push(onSnapshot(collection(db, field), (snapshot) => {
        (next as any)[field] = snapshot.docs.map((item) => item.data());
        commit(field);
      }, (error) => {
        console.error(`No se pudo leer ${field}`, error);
        commit(field);
      }));
    }
  } else if (currentUser?.isAnonymous) {
    const ownOrders = query(
      collection(db, "orders"),
      where("customerUid", "==", currentUser.uid),
    );
    firestoreUnsubscribers.push(onSnapshot(ownOrders, (snapshot) => {
      next.orders = snapshot.docs.map((item) => item.data() as Order);
      commit("orders");
    }, (error) => {
      console.error("No se pudieron leer los pedidos del cliente", error);
      commit("orders");
    }));
  }
}

onAuthStateChanged(auth, (user) => {
  void startFirestoreSubscriptions();
  if (!user && new URLSearchParams(window.location.search).has("mesa")) {
    void signInAnonymously(auth);
  }
});

type StateChange = {
  field: CollectionField;
  id: string;
  before?: any;
  after?: any;
};

function shouldArchiveChange(change: StateChange) {
  if (!RECOVERABLE_COLLECTIONS.has(change.field as RecoverableCollection)) {
    return false;
  }
  return shouldArchiveEntityChange(
    change.field as RecoverableCollection,
    change.before,
    change.after,
  );
}

function createRecoveryRecord(change: StateChange): RecoveryRecord {
  return {
    id: `recovery_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
    collection: change.field as RecoverableCollection,
    documentId: change.id,
    operation: change.after ? "UPDATE" : "DELETE",
    snapshot: JSON.parse(JSON.stringify(change.before)),
    createdAt: new Date().toISOString(),
    actorUid: auth.currentUser?.uid,
  };
}

function diffState(before: RestaurantState, after: RestaurantState): StateChange[] {
  const changes: StateChange[] = [];
  for (const field of COLLECTION_FIELDS) {
    const beforeById = new Map<string, any>(
      ((before[field] || []) as any[]).map((item): [string, any] => [item.id, item]),
    );
    const afterById = new Map<string, any>(
      ((after[field] || []) as any[]).map((item): [string, any] => [item.id, item]),
    );
    const ids = new Set([...beforeById.keys(), ...afterById.keys()]);
    for (const id of ids) {
      const previous = beforeById.get(id);
      const next = afterById.get(id);
      if (JSON.stringify(previous) !== JSON.stringify(next)) {
        changes.push({ field, id, before: previous, after: next });
      }
    }
  }
  return changes;
}

function replaceEntity(state: RestaurantState, field: CollectionField, id: string, data?: any) {
  const entities = [...((state[field] || []) as any[])];
  const index = entities.findIndex((item) => item.id === id);
  if (data && index >= 0) entities[index] = data;
  else if (data) entities.push(data);
  else if (index >= 0) entities.splice(index, 1);
  (state as any)[field] = entities;
}

// Atomic transaction helper for mutating state safely
async function updateState(mutator: (state: RestaurantState) => void): Promise<RestaurantState> {
  if (!auth.currentUser) throw new Error("Debes iniciar sesión para realizar esta acción.");
  const base = cloneState(currentCachedState || createEmptyState());
  ensureStateArrays(base);
  const preliminary = cloneState(base);
  mutator(preliminary);
  const preliminaryChanges = diffState(base, preliminary);

  const updatedState = await runTransaction(db, async (transaction) => {
    const existingChanges = preliminaryChanges.filter((change) => change.before);
    const refs = existingChanges.map((change) => doc(db, change.field, change.id));
    const snapshots = await Promise.all(refs.map((reference) => transaction.get(reference)));
    const remoteBase = cloneState(base);
    snapshots.forEach((snapshot, index) => {
      const change = existingChanges[index];
      replaceEntity(remoteBase, change.field, change.id, snapshot.exists() ? snapshot.data() : undefined);
    });

    const candidate = cloneState(remoteBase);
    mutator(candidate);
    const finalChanges = diffState(remoteBase, candidate);
    const recoveryRecords = finalChanges
      .filter(shouldArchiveChange)
      .map(createRecoveryRecord);
    const readPaths = new Set(existingChanges.map((change) => `${change.field}/${change.id}`));
    for (const change of finalChanges) {
      const path = `${change.field}/${change.id}`;
      if (change.before && !readPaths.has(path)) {
        throw new Error("Los datos cambiaron mientras se guardaba. Intenta nuevamente.");
      }
      const reference = doc(db, change.field, change.id);
      if (change.after) {
        transaction.set(reference, JSON.parse(JSON.stringify(change.after)));
      } else {
        transaction.delete(reference);
      }
    }
    for (const recoveryRecord of recoveryRecords) {
      transaction.set(
        doc(db, "recoveryArchive", recoveryRecord.id),
        JSON.parse(JSON.stringify(recoveryRecord)),
      );
    }
    if (remoteBase.onlyViewMenuQr !== candidate.onlyViewMenuQr) {
      transaction.set(doc(db, "config", "restaurant"), {
        onlyViewMenuQr: Boolean(candidate.onlyViewMenuQr),
      });
    }
    if (canReadRecoveryArchive) {
      candidate.recoveryArchive = [
        ...(candidate.recoveryArchive || []),
        ...recoveryRecords,
      ];
    }
    return candidate;
  });

  publishState(updatedState);
  return updatedState;
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
function sanitizeForClient<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (key, value) => (key === "pin" || key === "password") ? "" : value));
}

function normalizeUsername(value: string) {
  return value.trim().toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function legacyUsername(user: { name: string; username?: string }) {
  return normalizeUsername(user.username || user.name.split("(")[0].trim().split(/\s+/)[0]);
}

function createResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(sanitizeForClient(data)), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function authPassword(value: string) {
  return /^\d{4}$/.test(value) ? `H!${value}` : value;
}

function authEmail(username: string) {
  return `${normalizeUsername(username).replace(/[^a-z0-9._-]/g, "")}@staff.restaurant-hacienda.local`;
}

async function assertCurrentAdmin() {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) throw new Error("Acceso no autorizado.");
  const accessSnapshot = await getDoc(doc(db, "access", currentUser.uid));
  if (!accessSnapshot.exists() || accessSnapshot.data().active !== true || accessSnapshot.data().role !== Role.ADMIN) {
    throw new Error("Solo un administrador puede gestionar el personal.");
  }
}

async function provisionStaffAccount(username: string, pin: string) {
  await assertCurrentAdmin();
  const apiKey = auth.app.options.apiKey;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: authEmail(username),
        password: authPassword(pin),
        returnSecureToken: false,
      }),
    },
  );
  const payload = await response.json();
  if (!response.ok) {
    if (payload?.error?.message === "EMAIL_EXISTS") {
      throw new Error("Ese nombre de usuario ya tiene una cuenta de acceso.");
    }
    throw new Error("No se pudo crear la cuenta de acceso.");
  }
  return String(payload.localId);
}

export async function signOutCurrentUser() {
  await signOut(auth);
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
        return createResponse({ error: "La información aún se está cargando." }, 503);
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
      return createResponse(
        { error: "Selecciona tu usuario en la pantalla principal e ingresa tu clave." },
        400,
      );
    }

    // Firebase Auth enforces remote throttling and keeps credentials out of Firestore.
    if (path === "/api/auth/login" && method === "POST") {
      const { username, password } = body;
      if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
        return createResponse({ error: "Ingresa usuario y contraseña" }, 401);
      }

      const normalizedInput = normalizeUsername(username);
      const credential = await signInWithEmailAndPassword(
        auth,
        authEmail(normalizedInput),
        authPassword(password),
      );
      const accessSnapshot = await getDoc(doc(db, "access", credential.user.uid));
      if (!accessSnapshot.exists() || accessSnapshot.data().active !== true) {
        await signOut(auth);
        return createResponse({ error: "Esta cuenta no está autorizada." }, 403);
      }
      const profileSnapshot = await getDoc(
        doc(db, "users", String(accessSnapshot.data().userId)),
      );
      if (!profileSnapshot.exists()) {
        await signOut(auth);
        return createResponse({ error: "No se encontró el perfil del usuario." }, 403);
      }
      const user = profileSnapshot.data() as User;
      void updateState(s => {
        if (!s.auditLogs) s.auditLogs = [];
        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          userId: user.id,
          userName: user.name,
          action: "Inicio de Sesión",
          details: `${user.name} inició sesión en el sistema.`,
          createdAt: new Date().toISOString()
        });
      }).catch((error) => console.error("No se pudo guardar la auditoría de inicio de sesión", error));

      return createResponse({ ...user, pin: "", password: "" });
    }

    // 3. Update tables
    if (path === "/api/tables/ensure-defaults" && method === "POST") {
      const updated = await updateState(s => {
        s.tables = ensureMinimumTables(s.tables);
      });
      return createResponse({ success: true, tables: updated.tables });
    }

    if (path === "/api/tables/add" && method === "POST") {
      const zone = typeof body.zone === "string" ? body.zone.trim() : "";
      const seats = Number(body.seats);
      const operatorName = typeof body.operatorName === "string" && body.operatorName.trim()
        ? body.operatorName.trim()
        : "Personal";
      if (!zone || !Number.isInteger(seats) || seats < 1 || seats > 30) {
        return createResponse({ error: "Zona o cantidad de asientos inválida." }, 400);
      }

      let newTable: Table | null = null;
      await updateState(s => {
        newTable = createTable(s.tables, zone, seats);
        s.tables.push(newTable);
        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          userName: operatorName,
          action: "Mesa Agregada",
          details: `${operatorName} agregó la Mesa ${newTable.number} en ${zone}, con ${seats} asientos.`,
          createdAt: new Date().toISOString(),
        });
      });
      return createResponse({ success: true, table: newTable });
    }

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
          customerCount: customerCount || 2,
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
          details: `${waiterName} abrió la Mesa ${table.number} para ${customerCount || 2} personas.`,
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

        const isWaiter = body.isWaiter === true;

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
            customerPhone: customerPhone || undefined,
            customerUid: !isWaiter && auth.currentUser?.isAnonymous
              ? auth.currentUser.uid
              : undefined
          };
          s.orders.push(newOrder);
          createdOrder = newOrder;
        }

        // Only notify for QR/customer orders, not when waiter adds items directly
        if (!isWaiter) {
          const tableNum = table ? table.number : 0;
          s.notifications.push({
            id: "nt_" + Math.random().toString(36).substring(2, 11),
            tableNumber: tableNum,
            type: "NEW_ORDER",
            createdAt: new Date().toISOString(),
            resolved: false,
            notes: `Nuevo pedido mesa ${tableNum}`,
            requesterUid: auth.currentUser?.uid
          });
        }
      });

      return createResponse({ success: true, order: createdOrder });
    }

    const customerCountMatch = path.match(/^\/api\/orders\/([^\/]+)\/customer-count$/);
    if (customerCountMatch && method === "POST") {
      const orderId = customerCountMatch[1];
      const customerCount = Number(body.customerCount);
      if (!Number.isInteger(customerCount) || customerCount < 1 || customerCount > 30) {
        return createResponse({ error: "La cantidad de comensales debe estar entre 1 y 30." }, 400);
      }

      let errorMsg = "";
      const updated = await updateState(s => {
        const order = s.orders.find(o => o.id === orderId && o.status !== OrderStatus.CLOSED);
        if (!order) {
          errorMsg = "Comanda activa no encontrada.";
          return;
        }
        const previousCount = order.customerCount;
        order.customerCount = customerCount;
        order.updatedAt = new Date().toISOString();
        const user = s.users.find(candidate => candidate.id === body.userId);
        const table = s.tables.find(candidate => candidate.id === order.tableId);
        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          userId: user?.id,
          userName: user?.name || "Mozo",
          action: "Comensales Actualizados",
          details: `Mesa ${table?.number || "?"}: ${previousCount} a ${customerCount} comensales.`,
          createdAt: new Date().toISOString(),
        });
      });
      if (errorMsg) return createResponse({ error: errorMsg }, 404);
      return createResponse({ success: true, order: updated.orders.find(o => o.id === orderId) });
    }

    const deleteOrderItemMatch = path.match(/^\/api\/orders\/([^\/]+)\/items\/([^\/]+)$/);
    if (deleteOrderItemMatch && method === "DELETE") {
      const orderId = deleteOrderItemMatch[1];
      const itemId = deleteOrderItemMatch[2];
      let errorMsg = "";
      const updated = await updateState(s => {
        const order = s.orders.find(o => o.id === orderId && o.status !== OrderStatus.CLOSED);
        if (!order) {
          errorMsg = "Comanda activa no encontrada.";
          return;
        }
        const item = order.items.find(candidate => candidate.id === itemId);
        if (!item) {
          errorMsg = "Ítem no encontrado.";
          return;
        }
        if (s.payments.some(payment => payment.orderId === orderId)) {
          errorMsg = "No se puede modificar una comanda que ya tiene pagos o boletas emitidas.";
          return;
        }
        const changeReason = typeof body.changeReason === "string" ? body.changeReason.trim() : "";
        if (item.status !== OrderItemStatus.PENDING && !changeReason) {
          errorMsg = "Debes indicar el motivo para eliminar un ítem enviado o servido.";
          return;
        }
        const removedQuantity = body.removeAll !== true && item.quantity > 1 ? 1 : item.quantity;
        const product = s.products.find(candidate => candidate.id === item.productId);
        restoreOrderItemStock(item, removedQuantity, order.id, s);
        if (removedQuantity < item.quantity) item.quantity -= removedQuantity;
        else order.items = order.items.filter(candidate => candidate.id !== itemId);
        const now = new Date().toISOString();
        order.updatedAt = now;
        recalculateOrderStatus(order);
        const user = s.users.find(candidate => candidate.id === body.userId);
        const table = s.tables.find(candidate => candidate.id === order.tableId);
        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          userId: user?.id,
          userName: user?.name || "Mozo",
          action: "Ítem Eliminado",
          details: `Mesa ${table?.number || "?"}: se eliminó ${removedQuantity}x ${product?.name || "producto"} (${item.status}). Motivo: ${changeReason || "Corrección antes de cocina"}.`,
          createdAt: now,
        });
      });
      if (errorMsg) return createResponse({ error: errorMsg }, 400);
      return createResponse({ success: true, order: updated.orders.find(o => o.id === orderId) });
    }

    if (deleteOrderItemMatch && method === "PUT") {
      const orderId = deleteOrderItemMatch[1];
      const itemId = deleteOrderItemMatch[2];
      const quantity = Number(body.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return createResponse({ error: "La cantidad debe estar entre 1 y 99." }, 400);
      }
      let errorMsg = "";
      const updated = await updateState(s => {
        const order = s.orders.find(o => o.id === orderId && o.status !== OrderStatus.CLOSED);
        if (!order) {
          errorMsg = "Comanda activa no encontrada.";
          return;
        }
        if (s.payments.some(payment => payment.orderId === orderId)) {
          errorMsg = "No se puede modificar una comanda que ya tiene pagos o boletas emitidas.";
          return;
        }
        const item = order.items.find(candidate => candidate.id === itemId);
        const newProduct = s.products.find(candidate => candidate.id === body.productId);
        if (!item || !newProduct) {
          errorMsg = !item ? "Ítem no encontrado." : "Producto no encontrado.";
          return;
        }

        const changeReason = typeof body.changeReason === "string" ? body.changeReason.trim() : "";
        if (item.status !== OrderItemStatus.PENDING && !changeReason) {
          errorMsg = "Debes indicar el motivo para cambiar un ítem enviado o servido.";
          return;
        }
        const previousItem: OrderItem = { ...item, selectedModifiers: [...(item.selectedModifiers || [])] };
        const previousProduct = s.products.find(candidate => candidate.id === previousItem.productId);
        const wasPending = previousItem.status === OrderItemStatus.PENDING;
        restoreOrderItemStock(previousItem, previousItem.quantity, order.id, s);

        item.productId = newProduct.id;
        item.quantity = quantity;
        item.notes = typeof body.notes === "string" ? body.notes : "";
        item.selectedModifiers = Array.isArray(body.selectedModifiers) ? body.selectedModifiers : [];
        item.tanda = Number(body.tanda) || 1;
        const now = new Date().toISOString();
        if (wasPending) {
          item.status = OrderItemStatus.PENDING;
        } else if (isDirectServiceProduct(newProduct)) {
          item.status = OrderItemStatus.READY;
        } else {
          item.status = OrderItemStatus.PREPARING;
          deductStockForOrder({ ...order, items: [item] }, s);
          order.kitchenSentAt = now;
        }
        order.updatedAt = now;
        recalculateOrderStatus(order);
        const user = s.users.find(candidate => candidate.id === body.userId);
        const table = s.tables.find(candidate => candidate.id === order.tableId);
        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          userId: user?.id,
          userName: user?.name || "Mozo",
          action: "Ítem Cambiado",
          details: `Mesa ${table?.number || "?"}: ${previousItem.quantity}x ${previousProduct?.name || "producto"} fue cambiado por ${quantity}x ${newProduct.name}. Motivo: ${changeReason || "Corrección antes de cocina"}.`,
          createdAt: now,
        });
      });
      if (errorMsg) return createResponse({ error: errorMsg }, 400);
      return createResponse({ success: true, order: updated.orders.find(o => o.id === orderId) });
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
        const sentItemIds = new Set<string>();
        order.items.forEach(item => {
          if (item.status === OrderItemStatus.PENDING) {
            // Check if product requires kitchen preparation
            const product = s.products.find(p => p.id === item.productId);
            if (isDirectServiceProduct(product)) {
              // Beverages/items served directly → skip kitchen, mark as READY
              item.status = OrderItemStatus.READY;
            } else {
              item.status = OrderItemStatus.PREPARING;
              sentItemIds.add(item.id);
            }
            updatedCount++;
          }
        });

        if (updatedCount > 0) {
          const now = new Date().toISOString();
          deductStockForOrder({
            ...order,
            items: order.items.filter(it => sentItemIds.has(it.id))
          }, s);

          const hasKitchenQueueItems = order.items.some(item =>
            item.status === OrderItemStatus.SENT_TO_KITCHEN || item.status === OrderItemStatus.RECEIVED
          );
          const hasPreparingItems = order.items.some(item => item.status === OrderItemStatus.PREPARING);
          const allItemsReady = order.items.length > 0 && order.items.every(item =>
            item.status === OrderItemStatus.READY || item.status === OrderItemStatus.DELIVERED
          );
          order.status = allItemsReady
            ? OrderStatus.READY
            : hasPreparingItems
            ? OrderStatus.PREPARING
            : hasKitchenQueueItems
            ? OrderStatus.PENDING_KITCHEN
            : order.status;
          order.kitchenSentAt = now;
          order.updatedAt = now;
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
          const now = new Date().toISOString();
          order.waiterId = waiterId;
          order.updatedAt = now;
          const kitchenItemIds = new Set<string>();
          order.items.forEach(it => {
            if (it.status === OrderItemStatus.PENDING) {
              const product = s.products.find(p => p.id === it.productId);
              if (isDirectServiceProduct(product)) {
                it.status = OrderItemStatus.READY;
              } else {
                it.status = OrderItemStatus.PREPARING;
                kitchenItemIds.add(it.id);
              }
            }
          });

          const hasKitchenQueueItems = order.items.some(item =>
            item.status === OrderItemStatus.SENT_TO_KITCHEN || item.status === OrderItemStatus.RECEIVED
          );
          const hasPreparingItems = order.items.some(item => item.status === OrderItemStatus.PREPARING);
          const allItemsReady = order.items.length > 0 && order.items.every(item =>
            item.status === OrderItemStatus.READY || item.status === OrderItemStatus.DELIVERED
          );
          order.status = allItemsReady
            ? OrderStatus.READY
            : hasPreparingItems
            ? OrderStatus.PREPARING
            : hasKitchenQueueItems
            ? OrderStatus.PENDING_KITCHEN
            : order.status;
          if (kitchenItemIds.size > 0) order.kitchenSentAt = now;

          deductStockForOrder({
            ...order,
            items: order.items.filter(item => kitchenItemIds.has(item.id)),
          }, s);
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
            const product = s.products.find(p => p.id === item.productId);
            const requestedStatus = status as OrderItemStatus;
            const normalizedStatus = requestedStatus === OrderItemStatus.SENT_TO_KITCHEN ||
              requestedStatus === OrderItemStatus.RECEIVED
              ? OrderItemStatus.PREPARING
              : requestedStatus;
            item.status = isDirectServiceProduct(product) && normalizedStatus === OrderItemStatus.PREPARING
              ? OrderItemStatus.READY
              : normalizedStatus;
            order.updatedAt = new Date().toISOString();
          }

          const allReady = order.items.every(it => it.status === OrderItemStatus.READY || it.status === OrderItemStatus.DELIVERED);
          const allDelivered = order.items.every(it => it.status === OrderItemStatus.DELIVERED);
          const anyCooking = order.items.some(it =>
            it.status === OrderItemStatus.SENT_TO_KITCHEN ||
            it.status === OrderItemStatus.RECEIVED ||
            it.status === OrderItemStatus.PREPARING
          );

          if (allDelivered) {
            order.status = OrderStatus.DELIVERED;
          } else if (allReady) {
            order.status = OrderStatus.READY;
          } else if (anyCooking) {
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
        notes: notes || "",
        requesterUid: auth.currentUser?.uid
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
      let errorMsg = "";
      let createdPayments: Array<{
        id: string;
        orderId: string;
        amount: number;
        method: PaymentMethod;
        tip: number;
        discount: number;
        createdAt: string;
        creditCustomerId?: string;
        creditCustomerName?: string;
      }> = [];
      let remainingBalance = 0;
      let orderClosed = false;

      const updated = await updateState(s => {
        const order = s.orders.find(o => o.id === id);
        if (!order) {
          errorMsg = "Orden no encontrada";
          return;
        }
        if (!order.items.length || order.items.some(item =>
          item.status !== OrderItemStatus.READY && item.status !== OrderItemStatus.DELIVERED
        )) {
          errorMsg = "No se puede cobrar hasta que todos los pedidos salgan de cocina";
          return;
        }

        const requestedPayments = Array.isArray(payments) ? payments : [];
        const requestedTotal = requestedPayments.reduce((sum: number, pay: any) => sum + Number(pay.amount || 0), 0);
        const proposedSubtotal = Math.max(0, Math.round(Number(totalAmount) || 0));
        const proposedDiscount = Math.max(0, Math.round(Number(discount) || 0));
        const proposedTip = Math.max(0, Math.round(Number(tip) || 0));
        const proposedBillingTotal = proposedSubtotal - proposedDiscount + proposedTip;
        const billingTotal = order.billingTotal ?? proposedBillingTotal;
        const alreadyPaid = s.payments
          .filter(payment => payment.orderId === id)
          .reduce((sum, payment) => sum + payment.amount, 0);
        const balanceBeforePayment = getRemainingBalance(billingTotal, alreadyPaid);

        if (balanceBeforePayment <= 0 || order.status === OrderStatus.CLOSED) {
          errorMsg = "Esta mesa ya se encuentra pagada por completo. Se ha evitado un cobro duplicado.";
          return;
        }
        if (requestedPayments.length !== 1) {
          errorMsg = "Cada cobro debe registrar un solo pago. Actualiza la aplicación e intenta nuevamente";
          return;
        }
        if (billingTotal <= 0 || !Number.isFinite(requestedTotal) || requestedTotal <= 0) {
          errorMsg = "Ingresa un monto de pago válido";
          return;
        }
        if (requestedPayments.some((pay: any) => !Number.isFinite(Number(pay.amount)) || Number(pay.amount) <= 0)) {
          errorMsg = "Todos los pagos deben tener un monto válido";
          return;
        }
        if (requestedTotal > balanceBeforePayment) {
          errorMsg = `El pago supera el saldo pendiente de $${balanceBeforePayment.toLocaleString("es-CL")}`;
          return;
        }

        const accountPayment = requestedPayments.find((pay: any) => pay.method === PaymentMethod.ACCOUNT);
        let accountCustomer: Customer | null = null;
        if (accountPayment) {
          accountCustomer = s.customers.find(c => c.id === accountPayment.creditCustomerId || c.phone === customerPhone) || null;
          if (!accountCustomer || !accountCustomer.isCreditAuthorized) {
            errorMsg = "La cuenta seleccionada no está autorizada para crédito";
            return;
          }
          order.customerPhone = accountCustomer.phone;
        }

        if (order.billingTotal === undefined) {
          order.billingSubtotal = proposedSubtotal;
          order.billingDiscount = proposedDiscount;
          order.billingTip = proposedTip;
          order.billingTotal = proposedBillingTotal;
        }

        createdPayments = [];
        const paymentCreatedAt = new Date().toISOString();
        requestedPayments.forEach((pay: any) => {
          const creditCustomer = pay.method === PaymentMethod.ACCOUNT ? accountCustomer : null;
          const payment = {
            id: "pay_" + Math.random().toString(36).substring(2, 11),
            orderId: id,
            amount: pay.amount,
            method: pay.method as PaymentMethod,
            tip: pay.tip || 0,
            discount: pay.discount || 0,
            createdAt: paymentCreatedAt
          };
          if (creditCustomer) {
            Object.assign(payment, {
              creditCustomerId: creditCustomer.id,
              creditCustomerName: creditCustomer.name,
            });
          }
          s.payments.push(payment);
          createdPayments.push(payment);
        });

        remainingBalance = getRemainingBalance(billingTotal, alreadyPaid + requestedTotal);
        orderClosed = remainingBalance === 0;
        order.updatedAt = paymentCreatedAt;

        const table = s.tables.find(t => t.id === order.tableId);
        if (orderClosed) {
          order.status = OrderStatus.CLOSED;
          if (table) table.status = TableStatus.FREE;

          const loyaltyPhone = accountCustomer?.phone || customerPhone || order.customerPhone;
          if (loyaltyPhone) {
            const customer = s.customers.find(c => c.phone === loyaltyPhone);
            if (customer) {
              const earnedPoints = Math.floor(((order.billingSubtotal || proposedSubtotal) - (order.billingDiscount || 0)) / 100);
              if (earnedPoints > 0) {
                customer.points += earnedPoints;
                s.loyaltyTxs.push({
                  id: "tx_" + Math.random().toString(36).substring(2, 11),
                  customerId: customer.id,
                  points: earnedPoints,
                  type: LoyaltyTxType.EARNED,
                  description: `Puntos ganados por consumo de Mesa ${table ? table.number : ""}`,
                  createdAt: paymentCreatedAt
                });
              }
            }
          }
        }
      });

      if (errorMsg) {
        return createResponse({ error: errorMsg }, 400);
      }
      return createResponse({
        success: true,
        state: updated,
        payments: createdPayments,
        remaining: remainingBalance,
        closed: orderClosed,
      });
    }

    // 10. Customer loyalty actions
    if (path === "/api/customers" && method === "POST") {
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
        creditAuthorizedBy,
      } = body;
      let customer: any = null;

      await updateState(s => {
        const existing = s.customers.find(c => c.phone === phone);
        if (existing) {
          existing.name = name;
          existing.email = email || existing.email;
          existing.birthDate = birthDate || existing.birthDate;
          existing.allergies = allergies || existing.allergies;
          existing.notes = notes || existing.notes;
          if (typeof isCreditAuthorized === "boolean") {
            existing.isCreditAuthorized = isCreditAuthorized;
            existing.creditAuthorizedAt = isCreditAuthorized ? new Date().toISOString() : "";
            existing.creditAuthorizedBy = isCreditAuthorized ? (creditAuthorizedBy || "Administrador") : "";
          }
          if (creditLabel) existing.creditLabel = creditLabel;
          if (typeof creditLimit === "number") existing.creditLimit = creditLimit;
          if (typeof creditNotes === "string") existing.creditNotes = creditNotes;
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
            notes: notes || "",
            isCreditAuthorized: !!isCreditAuthorized,
            creditLabel: creditLabel || "CUSTOMER",
            creditLimit: Number(creditLimit || 0),
            creditNotes: creditNotes || "",
            creditAuthorizedBy: isCreditAuthorized ? (creditAuthorizedBy || "Administrador") : "",
            creditAuthorizedAt: isCreditAuthorized ? new Date().toISOString() : ""
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
      const { id, name, description, price, imageUrl, categoryId, allergens, isAvailable, isRecommended, recipe, operatorName } = body;
      let savedProduct: any = null;
      let errorMsg = "";

      await updateState(s => {
        if (!s.auditLogs) s.auditLogs = [];

        if (id) {
          const prod = s.products.find(p => p.id === id);
          if (prod) {
            const prevPrice = prod.price;
            prod.name = name;
            prod.description = description;
            prod.price = Number(price);
            prod.imageUrl = imageUrl || prod.imageUrl;
            prod.categoryId = categoryId;
            prod.allergens = allergens || [];
            prod.isAvailable = isAvailable !== undefined ? isAvailable : prod.isAvailable;
            prod.isRecommended = !!isRecommended;
            prod.recipe = recipe || prod.recipe || [];
            savedProduct = prod;

            s.auditLogs.push({
              id: "audit_" + Math.random().toString(36).substring(2, 11),
              action: "Producto Modificado",
              details: `Se modificó el producto "${name}" (Precio anterior: $${prevPrice.toLocaleString("es-CL")} -> Nuevo precio: $${Number(price).toLocaleString("es-CL")}) por ${operatorName || "Administrador"}.`,
              createdAt: new Date().toISOString()
            });
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
            isRecommended: !!isRecommended,
            recipe: recipe || []
          };
          s.products.push(savedProduct);

          s.auditLogs.push({
            id: "audit_" + Math.random().toString(36).substring(2, 11),
            action: "Producto Creado",
            details: `Se creó el producto "${name}" con precio $${Number(price).toLocaleString("es-CL")} en categoría "${s.categories.find(c => c.id === categoryId)?.name || categoryId}" por ${operatorName || "Administrador"}.`,
            createdAt: new Date().toISOString()
          });
        }
      });

      if (errorMsg) {
        return createResponse({ error: errorMsg }, 400);
      }
      return createResponse({ success: true, product: savedProduct });
    }

    // Toggle product availability
    const productToggleMatch = path.match(/^\/api\/products\/([^\/]+)\/toggle-availability$/);
    if (productToggleMatch && method === "POST") {
      const id = productToggleMatch[1];
      const { operatorName } = body;
      let updatedProd: any = null;
      await updateState(s => {
        if (!s.auditLogs) s.auditLogs = [];
        const prod = s.products.find(p => p.id === id);
        if (prod) {
          prod.isAvailable = !prod.isAvailable;
          updatedProd = prod;

          s.auditLogs.push({
            id: "audit_" + Math.random().toString(36).substring(2, 11),
            action: "Estado de Producto",
            details: `Se cambió el estado del producto "${prod.name}" a ${prod.isAvailable ? "Activo" : "Pausado"} por ${operatorName || "Administrador"}.`,
            createdAt: new Date().toISOString()
          });
        }
      });
      return createResponse({ success: true, product: updatedProd });
    }

    // 11.5 Admin User/Staff Management
    if (path === "/api/users" && method === "GET") {
      const state = currentCachedState || DEMO_STATE;
      return createResponse(state.users);
    }

    if (path === "/api/users" && method === "POST") {
      const { id, name, username, pin, role, permissions, operatorName } = body;
      let savedUser: any = null;
      let errorMsg = "";
      const normalizedUsername = normalizeUsername(username || "");
      const existingUser = id
        ? (currentCachedState?.users || []).find((user) => user.id === id)
        : undefined;
      if (!name?.trim() || !normalizedUsername) {
        return createResponse({ error: "Nombre y usuario son obligatorios." }, 400);
      }
      if (existingUser && normalizedUsername !== normalizeUsername(existingUser.username || legacyUsername(existingUser))) {
        return createResponse({ error: "El nombre de usuario no se puede cambiar después de crear la cuenta." }, 400);
      }
      if (!id && !/^\d{4}$/.test(pin || "")) {
        return createResponse({ error: "La clave debe tener exactamente 4 números." }, 400);
      }
      const provisionedAuthUid = id ? existingUser?.authUid : await provisionStaffAccount(normalizedUsername, pin);

      await updateState(s => {
        if (!s.auditLogs) s.auditLogs = [];

        const duplicateUsername = normalizedUsername
          ? s.users.find(u => normalizeUsername(u.username || legacyUsername(u)) === normalizedUsername && u.id !== id)
          : null;
        if (duplicateUsername) {
          errorMsg = `El usuario ${username} ya está siendo utilizado.`;
          return;
        }

        if (id) {
          const user = s.users.find(u => u.id === id);
          if (user) {
            const prevName = user.name;
            const prevRole = user.role;
            const prevPermissions = user.permissions || [];

            user.name = name;
            user.username = normalizedUsername;
            user.role = role;
            user.permissions = permissions || [];
            savedUser = user;

            s.auditLogs.push({
              id: "audit_" + Math.random().toString(36).substring(2, 11),
              action: "Personal Modificado",
              details: `Se modificó el perfil de "${prevName}" (ahora: "${name}", Rol: ${prevRole} -> ${role}, Permisos: [${prevPermissions.join(", ")}] -> [${(permissions || []).join(", ")}]) por ${operatorName || "Administrador"}.`,
              createdAt: new Date().toISOString()
            });
          }
        } else {
          const newId = "u_" + Math.random().toString(36).substring(2, 11);
          savedUser = {
            id: newId,
            authUid: provisionedAuthUid,
            name,
            username: normalizedUsername,
            role,
            permissions: permissions || []
          };
          s.users.push(savedUser);

          s.auditLogs.push({
            id: "audit_" + Math.random().toString(36).substring(2, 11),
            action: "Personal Creado",
            details: `Se creó el perfil de "${name}" con Rol: ${role}, Permisos: [${(permissions || []).join(", ")}] por ${operatorName || "Administrador"}.`,
            createdAt: new Date().toISOString()
          });
        }
      });

      if (errorMsg) {
        return createResponse({ error: errorMsg }, 400);
      }
      if (!savedUser?.authUid) {
        return createResponse({ error: "La cuenta no tiene una identidad de acceso válida." }, 400);
      }
      await Promise.all([
        setDoc(doc(db, "access", savedUser.authUid), {
          userId: savedUser.id,
          role: savedUser.role,
          permissions: savedUser.permissions || [],
          active: true,
        }),
        setDoc(doc(db, "staffDirectory", savedUser.id), {
          id: savedUser.id,
          username: savedUser.username,
          name: savedUser.name,
          role: savedUser.role,
        }),
      ]);
      return createResponse({ success: true, user: savedUser });
    }

    const userDeleteMatch = path.match(/^\/api\/users\/([^\/]+)\/delete$/);
    if (userDeleteMatch && method === "POST") {
      const id = userDeleteMatch[1];
      const { operatorName } = body;
      let errorMsg = "";
      let deletedUser: User | undefined;

      await updateState(s => {
        if (!s.auditLogs) s.auditLogs = [];
        const index = s.users.findIndex(u => u.id === id);
        if (index !== -1) {
          const user = s.users[index];
          deletedUser = { ...user };
          s.users.splice(index, 1);

          s.auditLogs.push({
            id: "audit_" + Math.random().toString(36).substring(2, 11),
            action: "Personal Eliminado",
            details: `Se eliminó el perfil de "${user.name}" (Rol: ${user.role}) por ${operatorName || "Administrador"}.`,
            createdAt: new Date().toISOString()
          });
        } else {
          errorMsg = "Usuario no encontrado";
        }
      });

      if (errorMsg) {
        return createResponse({ error: errorMsg }, 404);
      }
      if (deletedUser?.authUid) {
        await setDoc(doc(db, "access", deletedUser.authUid), {
          userId: deletedUser.id,
          role: deletedUser.role,
          permissions: deletedUser.permissions || [],
          active: false,
        });
      }
      if (deletedUser) await deleteDoc(doc(db, "staffDirectory", deletedUser.id));
      return createResponse({ success: true });
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
      const { id, customerName, customerPhone, customerCount, dateTime, tableId, notes, status, advancePayment, advancePaymentMethod, items } = body;
      let savedRes: any = null;

      await updateState(s => {
        if (id) {
          const r = s.reservations.find(res => res.id === id);
          if (r) {
            r.customerName = customerName;
            r.customerPhone = customerPhone || "";
            r.customerCount = Number(customerCount) || 1;
            r.dateTime = dateTime;
            r.tableId = tableId || r.tableId;
            r.notes = notes || "";
            r.status = status || r.status;
            if (advancePayment !== undefined) r.advancePayment = Number(advancePayment) || 0;
            if (advancePaymentMethod !== undefined) r.advancePaymentMethod = advancePaymentMethod;
            if (items !== undefined) r.items = items;
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
                  items: Array.isArray(r.items) ? r.items.map((it: any) => ({
                    ...it,
                    id: "item_" + Math.random().toString(36).substring(2, 11),
                    status: OrderItemStatus.SENT_TO_KITCHEN
                  })) : [],
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
            customerPhone: customerPhone || "",
            customerCount: Number(customerCount) || 1,
            dateTime,
            tableId: tableId || undefined,
            notes: notes || "",
            status: status || ReservationStatus.PENDING,
            advancePayment: Number(advancePayment) || 0,
            advancePaymentMethod: advancePaymentMethod || undefined,
            items: items || []
          };
          s.reservations.push(savedRes);

          // Set table to RESERVED if a tableId was provided
          if (tableId) {
            const table = s.tables.find(t => t.id === tableId);
            if (table && table.status === TableStatus.FREE) {
              table.status = TableStatus.RESERVED;
            }
          }
        }
      });

      return createResponse({ success: true, reservation: savedRes });
    }

    // Cancel / delete a reservation
    if (path.match(/^\/api\/reservations\/[^/]+$/) && method === "DELETE") {
      const resId = path.split("/").pop()!;
      let found = false;

      await updateState(s => {
        const idx = s.reservations.findIndex(r => r.id === resId);
        if (idx !== -1) {
          const reservation = s.reservations[idx];
          if (reservation.tableId) {
            const table = s.tables.find(t => t.id === reservation.tableId);
            if (table && table.status === TableStatus.RESERVED) {
              table.status = TableStatus.FREE;
            }
          }
          reservation.status = ReservationStatus.CANCELLED;
          found = true;
        }
      });

      if (!found) {
        return createResponse({ error: "Reserva no encontrada" }, 404);
      }
      return createResponse({ success: true });
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

    const recoveryRestoreMatch = path.match(/^\/api\/admin\/recovery\/([^\/]+)\/restore$/);
    if (recoveryRestoreMatch && method === "POST") {
      await assertCurrentAdmin();
      const recoveryId = recoveryRestoreMatch[1];
      let restoredRecord: RecoveryRecord | undefined;
      const updated = await updateState(s => {
        const record = (s.recoveryArchive || []).find(candidate => candidate.id === recoveryId);
        if (!record) return;
        restoredRecord = record;
        const records = [...((s as any)[record.collection] || [])];
        const existingIndex = records.findIndex((item: { id?: string }) => item.id === record.documentId);
        const snapshot = JSON.parse(JSON.stringify(record.snapshot));
        if (existingIndex >= 0) records[existingIndex] = snapshot;
        else records.push(snapshot);
        (s as any)[record.collection] = records;
        s.auditLogs = s.auditLogs || [];
        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          userName: typeof body.operatorName === "string" ? body.operatorName : "Administrador",
          action: "Registro Recuperado",
          details: `Se restauró ${record.collection}/${record.documentId} desde la papelera protegida.`,
          createdAt: new Date().toISOString(),
        });
      });
      if (!restoredRecord) return createResponse({ error: "Copia de recuperación no encontrada." }, 404);
      return createResponse({
        success: true,
        restored: `${restoredRecord.collection}/${restoredRecord.documentId}`,
        state: updated,
      });
    }

    // 15. Import Backup DB
    if (path === "/api/admin/db/import" && method === "POST") {
      await assertCurrentAdmin();
      const importedState = parseAndValidateBackup(body.backup ?? body.state);
      if (importedState.users.some(user => !user.authUid)) {
        return createResponse({
          error: "El respaldo contiene usuarios antiguos sin identidad de acceso y no se puede restaurar de forma segura.",
        }, 400);
      }
      const projected = cloneState(currentCachedState || createEmptyState());
      for (const field of COLLECTION_FIELDS) {
        if (field === "auditLogs" || field === "recoveryArchive") continue;
        (projected as any)[field] = cloneState(importedState)[field] || [];
      }
      projected.onlyViewMenuQr = Boolean(importedState.onlyViewMenuQr);
      const projectedChanges = diffState(currentCachedState || createEmptyState(), projected);
      const projectedArchives = projectedChanges.filter(shouldArchiveChange).length;
      if (projectedChanges.length + projectedArchives > 450) {
        return createResponse({
          error: "El respaldo es demasiado grande para restaurarlo de forma segura desde el navegador. Usa la herramienta administrativa de migración.",
        }, 400);
      }

      const updated = await updateState(s => {
        for (const field of COLLECTION_FIELDS) {
          if (field === "auditLogs" || field === "recoveryArchive") continue;
          (s as any)[field] = cloneState(importedState)[field] || [];
        }
        s.onlyViewMenuQr = Boolean(importedState.onlyViewMenuQr);
        s.auditLogs = s.auditLogs || [];
        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          action: "Restauración de Respaldo",
          details: "Se restauró una copia validada. La auditoría y la papelera anteriores se conservaron.",
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
    if (error?.code === "auth/invalid-credential" || error?.code === "auth/invalid-login-credentials") {
      return createResponse({ error: "Usuario o contraseña incorrectos" }, 401);
    }
    if (error?.code === "auth/too-many-requests") {
      return createResponse({ error: "Demasiados intentos. Espera unos minutos e intenta nuevamente." }, 429);
    }
    return createResponse({ error: error.message || "Error interno del servidor simulado" }, 500);
  }
}
