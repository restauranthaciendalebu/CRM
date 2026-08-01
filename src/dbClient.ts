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
  Product,
  DAILY_MENU_CATEGORY_ID,
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
import { DEFAULT_BUSINESS_DAY_START_HOUR, normalizeBusinessDayStartHour } from "./businessDayUtils";

// Minimum gap required between two reservations on the same table, so a
// table can't be double-booked for overlapping dining windows.
const RESERVATION_CONFLICT_WINDOW_MS = 90 * 60 * 1000;

// Circuit breaker for full-collection resyncs. A full resync re-reads every
// document of every collection, so it must never run in a tight loop nor
// while Firestore is already refusing requests.
const QUOTA_COOLDOWN_MS = 2 * 60 * 1000;
const FULL_RESYNC_MIN_INTERVAL_MS = 30 * 1000;
let quotaBlockedUntil = 0;
let lastFullResyncAt = 0;

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

// Append-only history: written from every screen, but only ever read back in
// the admin reports. Left out of the operational screens' subscriptions —
// they grow without bound, so subscribing a phone to them means the whole
// history is re-downloaded on every single sign-in, getting slower each day.
// Writes still work: updateState diffs against the local cache, and appending
// to an empty one produces exactly the new documents.
const HISTORY_ONLY_COLLECTIONS: CollectionField[] = [
  "auditLogs",
  "inventoryTransactions",
  "loyaltyTxs",
  "recoveryArchive",
];

const WAITER_COLLECTIONS = COLLECTION_FIELDS.filter(
  (field) => !HISTORY_ONLY_COLLECTIONS.includes(field),
);
const KITCHEN_COLLECTIONS: CollectionField[] = [
  "users",
  "tables",
  "categories",
  "products",
  "ingredients",
  "orders",
  "notifications",
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
    businessDayStartHour: DEFAULT_BUSINESS_DAY_START_HOUR,
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

// Discards a UI-only overlay left by applyLocalStateUpdate after the action it
// previewed turned out to fail, re-publishing the authoritative cached state.
// applyLocalStateUpdate never touches that cache, so this needs zero reads —
// it replaces a full-database resync that used to run on every failed action.
export function revertLocalStateUpdate() {
  if (!currentCachedState) return;
  publishState(currentCachedState, true);
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

// Full resync: re-reads every document of every readable collection. This is
// expensive and deliberately rate-limited — it is a recovery tool, not
// something to run on the failure path of an ordinary action.
export async function refreshStateFromServer() {
  if (!currentCachedState) return;
  const now = Date.now();
  if (now < quotaBlockedUntil) {
    console.warn("Resync completo omitido: Firestore está rechazando peticiones por cuota.");
    return;
  }
  if (now - lastFullResyncAt < FULL_RESYNC_MIN_INTERVAL_MS) return;
  lastFullResyncAt = now;
  const next = cloneState(currentCachedState);
  const fields = await getReadableCollections();
  await Promise.all(fields.map(async (field) => {
    const snapshot = await getDocs(collection(db, field));
    (next as any)[field] = snapshot.docs.map((item) => item.data());
  }));
  const configSnapshot = await getDoc(doc(db, "config", "restaurant"));
  if (configSnapshot.exists()) {
    next.onlyViewMenuQr = Boolean(configSnapshot.data().onlyViewMenuQr);
    next.dailyMenuChoiceGroups = configSnapshot.data().dailyMenuChoiceGroups || [];
    next.businessDayStartHour = normalizeBusinessDayStartHour(configSnapshot.data().businessDayStartHour);
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
  let initialLoadDone = false;

  // During initial load, wait for every required collection before publishing
  // so we never show partial/empty data. After that, each snapshot merges only
  // the field that actually changed into the current authoritative state —
  // republishing the whole shared `next` object instead would clobber a
  // fresher field (e.g. an order just advanced optimistically) with whatever
  // stale value `next` still holds for it, because that field's own listener
  // hasn't fired yet. That clobber-then-catch-up is what shows up as a status
  // visibly reverting for a moment before jumping forward again.
  const commit = (name: string) => {
    loaded.add(name);
    if (initialLoadDone) {
      const merged = cloneState(currentCachedState || next);
      (merged as any)[name] = (next as any)[name];
      currentCachedState = merged;
      publishState(merged);
      return;
    }
    if ([...required].every((entry) => loaded.has(entry))) {
      initialLoadDone = true;
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
    next.dailyMenuChoiceGroups = snapshot.data()?.dailyMenuChoiceGroups || [];
    next.businessDayStartHour = normalizeBusinessDayStartHour(snapshot.data()?.businessDayStartHour);
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
        if (field === "notifications") {
          const allNotifs = snapshot.docs.map((item) => item.data() as any);
          const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
          (next as any)[field] = allNotifs.filter(n => !n.resolved && n.createdAt > twelveHoursAgo);
        } else {
          (next as any)[field] = snapshot.docs.map((item) => item.data());
        }
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

function sanitizeSnapshot(data: any): any {
  if (!data) return data;
  try {
    const clone = JSON.parse(JSON.stringify(data));
    if (clone.imageUrl && typeof clone.imageUrl === "string" && clone.imageUrl.length > 500) {
      clone.imageUrl = clone.imageUrl.substring(0, 500) + "...[truncated]";
    }
    return clone;
  } catch {
    return null;
  }
}

function createRecoveryRecord(change: StateChange): RecoveryRecord {
  return {
    id: `recovery_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
    collection: change.field as RecoverableCollection,
    documentId: change.id,
    operation: change.after ? "UPDATE" : "DELETE",
    snapshot: sanitizeSnapshot(change.before),
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

// Undoes an optimistic update whose write failed, touching only the documents
// that update actually changed — normally one or two.
//
// Where possible each one is re-read, because the most common failure is
// contention: the write lost a race to another device, which means the remote
// document genuinely moved on and the value we held before is already stale.
// When that read isn't available (quota exhausted, offline) or the mutation
// spanned an unusually large number of documents, it falls back to the
// pre-mutation values already in memory, which costs nothing.
const MAX_ROLLBACK_READS = 10;

async function rollbackFailedChanges(changes: StateChange[], base: RestaurantState) {
  const next = cloneState(currentCachedState || base);
  const canRead = Date.now() >= quotaBlockedUntil && changes.length <= MAX_ROLLBACK_READS;

  const restored = await Promise.all(changes.map(async (change) => {
    if (!canRead) return change.before;
    try {
      const snapshot = await getDoc(doc(db, change.field, change.id));
      return snapshot.exists() ? snapshot.data() : undefined;
    } catch {
      return change.before;
    }
  }));

  changes.forEach((change, index) => {
    replaceEntity(next, change.field, change.id, restored[index]);
  });
  publishState(next, true);
}

// Atomic transaction helper for mutating state safely
async function updateState(mutator: (state: RestaurantState) => void): Promise<RestaurantState> {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.warn("No se pudo autenticar anónimamente:", e);
    }
  }
  const base = cloneState(currentCachedState || createEmptyState());
  ensureStateArrays(base);

  // ⚡ INSTANT AUTHORITATIVE UI: Update local cache & React immediately (< 5ms)
  const optimisticState = cloneState(base);
  mutator(optimisticState);
  publishState(optimisticState, true);

  const preliminaryChanges = diffState(base, optimisticState);

  let updatedState: RestaurantState;
  try {
    updatedState = await runTransaction(db, async (transaction) => {
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
      // One document holds every config field, so always write the whole set.
      // Writing just the changed key would blank the others, since this is a
      // full set() rather than a merge.
      const configChanged =
        remoteBase.onlyViewMenuQr !== candidate.onlyViewMenuQr ||
        normalizeBusinessDayStartHour(remoteBase.businessDayStartHour) !==
          normalizeBusinessDayStartHour(candidate.businessDayStartHour) ||
        JSON.stringify(remoteBase.dailyMenuChoiceGroups || []) !==
          JSON.stringify(candidate.dailyMenuChoiceGroups || []);
      if (configChanged) {
        transaction.set(doc(db, "config", "restaurant"), {
          onlyViewMenuQr: Boolean(candidate.onlyViewMenuQr),
          businessDayStartHour: normalizeBusinessDayStartHour(candidate.businessDayStartHour),
          dailyMenuChoiceGroups: JSON.parse(
            JSON.stringify(candidate.dailyMenuChoiceGroups || []),
          ),
        });
      }
      return candidate;
    });
  } catch (error: any) {
    const errorMsg = String(error?.message || error?.code || error || "");
    const isQuotaOrNetError =
      error?.code === "resource-exhausted" ||
      error?.code === "unavailable" ||
      errorMsg.toLowerCase().includes("quota") ||
      errorMsg.toLowerCase().includes("exhausted") ||
      errorMsg.toLowerCase().includes("limit");

    if (isQuotaOrNetError) {
      console.warn("⚠️ Firestore quota superada. Guardando actualización en memoria local:", error);
      // Stop any full-collection resync for a while. Those re-read every
      // document, so running them while the quota is already exhausted is
      // what turns one failure into a cascade of them.
      quotaBlockedUntil = Date.now() + QUOTA_COOLDOWN_MS;
      publishState(optimisticState, true);
      return optimisticState;
    }

    // The write never landed, so undo the entities we optimistically published
    // above — reading back only those specific documents. Recovering from a
    // failure by re-reading the entire database is precisely what amplified a
    // single error into an outage.
    await rollbackFailedChanges(preliminaryChanges, base);
    throw error;
  }

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

// Staff sign in from phones and tablets on restaurant wifi, where a single
// request dropping is routine. Firebase surfaces that as
// auth/network-request-failed and gives up, so retry briefly before telling
// the user anything — one lost packet shouldn't read as a failed login.
const AUTH_RETRY_DELAYS_MS = [400, 1200];

function isTransientAuthError(error: any) {
  return error?.code === "auth/network-request-failed"
    || error?.code === "auth/timeout"
    || error?.code === "auth/internal-error";
}

async function signInWithRetry(email: string, password: string) {
  let lastError: any;
  for (let attempt = 0; attempt <= AUTH_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      lastError = error;
      // A wrong password must fail immediately — only retry connection faults.
      if (!isTransientAuthError(error) || attempt === AUTH_RETRY_DELAYS_MS.length) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, AUTH_RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastError;
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
      const { pin } = body;
      if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
        return createResponse({ error: "PIN inválido" }, 401);
      }
      const state = currentCachedState || DEMO_STATE;
      const user = state.users.find(u => u.pin === pin);
      if (!user) {
        return createResponse({ error: "PIN inválido" }, 401);
      }
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("No se pudo iniciar sesión anónima:", e);
        }
      }
      void updateState(s => {
        if (!s.auditLogs) s.auditLogs = [];
        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          userId: user.id,
          userName: user.name,
          action: "Inicio de Sesión",
          details: `${user.name} inició sesión en el sistema con PIN.`,
          createdAt: new Date().toISOString()
        });
      }).catch((err) => console.error("Error auditLog PIN:", err));

      return createResponse({ ...user, pin: "", password: "" });
    }

    // Firebase Auth enforces remote throttling and keeps credentials out of Firestore.
    if (path === "/api/auth/login" && method === "POST") {
      const { username, password } = body;
      if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
        return createResponse({ error: "Ingresa usuario y contraseña" }, 401);
      }

      const normalizedInput = normalizeUsername(username);
      const credential = await signInWithRetry(
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
      let targetOrder: Order | null = null;

      const updated = await updateState(s => {
        const table = s.tables.find(t => t.id === id);
        if (!table) {
          errorMsg = "Mesa no encontrada";
          return;
        }

        table.status = TableStatus.OCCUPIED;
        
        const waiter = s.users.find(u => u.id === waiterId);
        const waiterName = waiter ? waiter.name : "Mozo";
        const guests = Number(customerCount) || 2;

        let existingOrder = s.orders.find(o => o.tableId === id && o.status !== OrderStatus.CLOSED);
        if (!existingOrder) {
          const newOrderId = "o_" + Math.random().toString(36).substring(2, 11);
          existingOrder = {
            id: newOrderId,
            tableId: id,
            waiterId: waiterId || null,
            status: OrderStatus.PREPARING,
            customerCount: guests,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: []
          };
          s.orders.push(existingOrder);
        } else {
          existingOrder.customerCount = guests;
          if (waiterId) existingOrder.waiterId = waiterId;
        }
        targetOrder = existingOrder;

        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          userId: waiterId || undefined,
          userName: waiterName,
          action: "Mesa Abierta",
          details: `${waiterName} abrió la Mesa ${table.number} para ${guests} personas.`,
          createdAt: new Date().toISOString()
        });
      });

      if (errorMsg) {
        return createResponse({ error: errorMsg }, 400);
      }
      return createResponse({ success: true, order: targetOrder, state: updated });
    }

    // Free a table opened by mistake, or where the party left before ordering.
    // Restricted to orders with nothing on them: once something has been
    // ordered the table has to be billed, or voided by an admin, so real
    // consumption can never be wiped out by this shortcut.
    const tableReleaseMatch = path.match(/^\/api\/tables\/([^\/]+)\/release$/);
    if (tableReleaseMatch && method === "POST") {
      const id = tableReleaseMatch[1];
      const { operatorName } = body;
      let errorMsg = "";

      await updateState(s => {
        const table = s.tables.find(t => t.id === id);
        if (!table) {
          errorMsg = "Mesa no encontrada";
          return;
        }

        const openOrders = s.orders.filter(o => o.tableId === id && o.status !== OrderStatus.CLOSED);
        const withItems = openOrders.find(o => o.items.length > 0);
        if (withItems) {
          errorMsg = "Esta mesa ya tiene platos pedidos. Cóbrala para cerrarla, o pide a administración que anule el pedido.";
          return;
        }

        const now = new Date().toISOString();
        openOrders.forEach(order => {
          order.status = OrderStatus.CLOSED;
          order.voided = true;
          order.updatedAt = now;
        });

        table.status = TableStatus.FREE;

        if (!s.auditLogs) s.auditLogs = [];
        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          action: "Mesa Liberada",
          details: `${operatorName || "Personal"} liberó la Mesa ${table.number} sin consumo (los comensales se retiraron sin pedir).`,
          createdAt: now,
        });
      });

      if (errorMsg) {
        return createResponse({ error: errorMsg }, 400);
      }
      return createResponse({ success: true });
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
            status: OrderStatus.PREPARING,
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
      const sentItemIds = new Set<string>();

      const updated = await updateState(s => {
        const order = s.orders.find(o => o.id === id);
        if (!order) {
          errorMsg = "Order not found";
          return;
        }

        let updatedCount = 0;
        order.items.forEach(item => {
          if (item.status === OrderItemStatus.PENDING || item.status === OrderItemStatus.SENT_TO_KITCHEN || item.status === OrderItemStatus.RECEIVED) {
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

      // Stock deduction runs as its own transaction so contention on a shared
      // ingredient document never slows down or fails the order status change.
      if (sentItemIds.size > 0) {
        void updateState(s2 => {
          const order2 = s2.orders.find(o => o.id === id);
          if (!order2) return;
          deductStockForOrder({
            ...order2,
            items: order2.items.filter(it => sentItemIds.has(it.id)),
          }, s2);
        }).catch(err => console.error("No se pudo descontar el stock del pedido", err));
      }

      return createResponse({ success: true, order: updated.orders.find(o => o.id === id) });
    }

    // 6. Approve customer pending order
    const orderApproveMatch = path.match(/^\/api\/orders\/([^\/]+)\/approve$/);
    if (orderApproveMatch && method === "POST") {
      const id = orderApproveMatch[1];
      const { waiterId } = body;
      const kitchenItemIds = new Set<string>();

      const updated = await updateState(s => {
        const order = s.orders.find(o => o.id === id);
        if (order) {
          const now = new Date().toISOString();
          order.waiterId = waiterId;
          order.updatedAt = now;
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
        }
      });

      // Stock deduction runs as its own transaction so contention on a shared
      // ingredient document never slows down or fails the order approval.
      if (kitchenItemIds.size > 0) {
        void updateState(s2 => {
          const order2 = s2.orders.find(o => o.id === id);
          if (!order2) return;
          deductStockForOrder({
            ...order2,
            items: order2.items.filter(item => kitchenItemIds.has(item.id)),
          }, s2);
        }).catch(err => console.error("No se pudo descontar el stock del pedido", err));
      }

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
      const parsedTableNumber = Number(tableNumber) || 1;
      const notifType = (type || "CALL_WAITER") as "CALL_WAITER" | "REQUEST_BILL";
      let existingNotif: any = null;

      await updateState(s => {
        if (!s.notifications) s.notifications = [];
        // Deduplicate: check if there's ALREADY an unresolved notification for this table and type
        const existing = s.notifications.find(
          n => n.tableNumber === parsedTableNumber && n.type === notifType && !n.resolved
        );

        if (existing) {
          existing.createdAt = new Date().toISOString();
          if (notes) existing.notes = notes;
          existingNotif = existing;
        } else {
          const notifId = "nt_" + Math.random().toString(36).substring(2, 11);
          const newNotif = {
            id: notifId,
            tableNumber: parsedTableNumber,
            type: notifType,
            createdAt: new Date().toISOString(),
            resolved: false,
            notes: notes || "",
            requesterUid: auth.currentUser?.uid
          };
          s.notifications.push(newNotif);
          existingNotif = newNotif;
        }

        const table = s.tables.find(t => t.number === parsedTableNumber);
        if (table && notifType === "REQUEST_BILL") {
          table.status = TableStatus.BILL_REQUESTED;
        }
      });

      return createResponse({ success: true, notification: existingNotif });
    }

    // Resolve notification
    const notifResolveMatch = path.match(/^\/api\/notifications\/([^\/]+)\/resolve$/);
    if (notifResolveMatch && method === "POST") {
      const id = notifResolveMatch[1];
      await resolveNotificationDirectly(id);
      const updated = await updateState(s => {
        if (!s.notifications) s.notifications = [];
        const targetNotif = s.notifications.find(n => n.id === id);
        const targetTable = targetNotif?.tableNumber;

        // Resolve target notification and ALL other unresolved notifications for the same table
        s.notifications.forEach(n => {
          if (n.id === id || (targetTable && n.tableNumber === targetTable)) {
            n.resolved = true;
          }
        });
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
      let loyaltyPhoneToCredit: string | undefined;
      let loyaltyPointsToCredit = 0;
      let loyaltyTableNumber: number | undefined;

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

        if (order.status === OrderStatus.CLOSED) {
          errorMsg = "Esta mesa ya se encuentra pagada por completo. Se ha evitado un cobro duplicado.";
          return;
        }
        if (balanceBeforePayment <= 0) {
          // Fully paid but never finalised — refusing outright used to strand
          // the table forever, because billing is the only thing that closes
          // an order and the charge button disables itself at $0. Close it
          // out instead, without recording another payment.
          const paidTable = s.tables.find(t => t.id === order.tableId);
          order.status = OrderStatus.CLOSED;
          order.updatedAt = new Date().toISOString();
          if (paidTable) paidTable.status = TableStatus.FREE;
          orderClosed = true;
          remainingBalance = 0;
          if (!s.auditLogs) s.auditLogs = [];
          s.auditLogs.push({
            id: "audit_" + Math.random().toString(36).substring(2, 11),
            action: "Mesa Cerrada",
            details: `Se cerró la Mesa ${paidTable ? paidTable.number : "?"}, que ya estaba pagada por completo, sin registrar un nuevo cobro.`,
            createdAt: new Date().toISOString(),
          });
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
          loyaltyTableNumber = table?.number;

          const loyaltyPhone = accountCustomer?.phone || customerPhone || order.customerPhone;
          if (loyaltyPhone) {
            const customer = s.customers.find(c => c.phone === loyaltyPhone);
            if (customer) {
              const earnedPoints = Math.floor(((order.billingSubtotal || proposedSubtotal) - (order.billingDiscount || 0)) / 100);
              if (earnedPoints > 0) {
                loyaltyPhoneToCredit = loyaltyPhone;
                loyaltyPointsToCredit = earnedPoints;
              }
            }
          }
        }
      });

      if (errorMsg) {
        return createResponse({ error: errorMsg }, 400);
      }

      // Loyalty crediting runs as its own transaction, separate from the
      // customer/tables/orders/payments write above, so it can never slow
      // down or block the payment confirmation the waiter is waiting on.
      if (loyaltyPhoneToCredit && loyaltyPointsToCredit > 0) {
        const phone = loyaltyPhoneToCredit;
        const points = loyaltyPointsToCredit;
        void updateState(s2 => {
          const customer = s2.customers.find(c => c.phone === phone);
          if (!customer) return;
          customer.points += points;
          s2.loyaltyTxs.push({
            id: "tx_" + Math.random().toString(36).substring(2, 11),
            customerId: customer.id,
            points,
            type: LoyaltyTxType.EARNED,
            description: `Puntos ganados por consumo de Mesa ${loyaltyTableNumber ?? ""}`,
            createdAt: new Date().toISOString(),
          });
        }).catch(err => console.error("No se pudieron acreditar los puntos de fidelidad", err));
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

      if (!Number.isFinite(points) || !Number.isInteger(points) || points <= 0) {
        return createResponse({ error: "La cantidad de puntos a canjear debe ser un entero positivo." }, 400);
      }

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
      const { id, name, description, price, publicServicePrice, imageUrl, categoryId, allergens, isAvailable, isRecommended, recipe, operatorName } = body;
      let savedProduct: any = null;
      let errorMsg = "";

      // Optional second rate; absent or zero means the dish has a single price.
      const normalizedPublicServicePrice =
        publicServicePrice === undefined || publicServicePrice === null || publicServicePrice === ""
          ? undefined
          : Math.max(0, Math.round(Number(publicServicePrice) || 0)) || undefined;

      const cleanImageUrl = imageUrl && imageUrl.startsWith("data:image/") && imageUrl.length > 30000
        ? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60"
        : (imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60");

      try {
        await updateState(s => {
          if (!s.auditLogs) s.auditLogs = [];

          if (id) {
            const prod = s.products.find(p => p.id === id);
            if (prod) {
              const prevPrice = prod.price;
              if (name) prod.name = name;
              if (description !== undefined) prod.description = description;
              prod.price = Number(price);
              if (normalizedPublicServicePrice === undefined) {
                delete prod.publicServicePrice;
              } else {
                prod.publicServicePrice = normalizedPublicServicePrice;
              }
              prod.imageUrl = cleanImageUrl;
              if (categoryId) prod.categoryId = categoryId;
              if (allergens) prod.allergens = allergens;
              prod.isAvailable = isAvailable !== undefined ? isAvailable : prod.isAvailable;
              prod.isRecommended = !!isRecommended;
              if (recipe) prod.recipe = recipe;
              savedProduct = prod;

              s.auditLogs.push({
                id: "audit_" + Math.random().toString(36).substring(2, 11),
                action: "Producto Modificado",
                details: `Se modificó el producto "${name || prod.name}" (Precio anterior: $${prevPrice.toLocaleString("es-CL")} -> Nuevo precio: $${Number(price).toLocaleString("es-CL")}) por ${operatorName || "Administrador"}.`,
                createdAt: new Date().toISOString()
              });
            }
          } else {
            const newId = "p_" + Math.random().toString(36).substring(2, 11);
            savedProduct = {
              id: newId,
              name: name || "Producto Nuevo",
              description: description || "",
              price: Number(price) || 0,
              imageUrl: cleanImageUrl,
              categoryId: categoryId || "c1",
              allergens: allergens || [],
              isAvailable: isAvailable !== undefined ? isAvailable : true,
              isRecommended: !!isRecommended,
              recipe: recipe || [],
              ...(normalizedPublicServicePrice !== undefined
                ? { publicServicePrice: normalizedPublicServicePrice }
                : {}),
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
      } catch (e: any) {
        console.warn("Product price update fallback executed:", e);
        if (currentCachedState) {
          const prod = currentCachedState.products.find(p => p.id === id);
          if (prod) {
            prod.price = Number(price);
            if (name) prod.name = name;
            savedProduct = prod;
          }
          publishState(currentCachedState);
        }
      }

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

    const productDeleteMatch = path.match(/^\/api\/products\/([^\/]+)\/delete$/);
    if (productDeleteMatch && method === "POST") {
      const id = productDeleteMatch[1];
      const { operatorName } = body;
      let errorMsg = "";
      let deletedProduct: Product | undefined;

      await updateState(s => {
        const index = s.products.findIndex(p => p.id === id);
        if (index === -1) {
          errorMsg = "Producto no encontrado";
          return;
        }
        const product = s.products[index];

        // Past receipts and sales reports resolve item names and prices by
        // looking the product up here. Deleting one that was ever ordered
        // would silently blank those line items and undercount revenue, so
        // that case is refused — pausing already hides it from the menu.
        const timesOrdered = s.orders.reduce(
          (count, order) => count + order.items.filter(item => item.productId === id).length,
          0,
        );
        if (timesOrdered > 0) {
          errorMsg = `No se puede eliminar "${product.name}": aparece en ${timesOrdered} pedido(s) del historial y las boletas quedarían incompletas. Pausa el producto para sacarlo de la carta sin perder los registros.`;
          return;
        }

        deletedProduct = { ...product };

        if (!s.recoveryArchive) s.recoveryArchive = [];
        const recoveryId = `recovery_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        s.recoveryArchive.push({
          id: recoveryId,
          collection: "products",
          documentId: product.id,
          operation: "DELETE",
          snapshot: sanitizeSnapshot(product),
          createdAt: new Date().toISOString(),
          actorUid: auth.currentUser?.uid,
        });

        s.products.splice(index, 1);

        if (!s.auditLogs) s.auditLogs = [];
        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          action: "Producto Eliminado",
          details: `Se eliminó el producto "${product.name}" por ${operatorName || "Administrador"}. Se puede restaurar desde Auditoría & Backups.`,
          createdAt: new Date().toISOString()
        });
      });

      if (errorMsg) {
        return createResponse({ error: errorMsg }, 400);
      }
      return createResponse({ success: true, product: deletedProduct });
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
      if (!customerName || !dateTime) {
        return createResponse({ error: "Nombre y fecha/hora requeridos" }, 400);
      }
      let savedRes: any = null;
      let errorMsg = "";

      await updateState(s => {
        const targetTableId = tableId || (id ? s.reservations.find(res => res.id === id)?.tableId : undefined);
        if (targetTableId) {
          const conflict = s.reservations.find(res =>
            res.id !== id &&
            res.tableId === targetTableId &&
            res.status !== ReservationStatus.CANCELLED &&
            res.status !== ReservationStatus.ARRIVED &&
            Math.abs(new Date(res.dateTime).getTime() - new Date(dateTime).getTime()) < RESERVATION_CONFLICT_WINDOW_MS
          );
          if (conflict) {
            errorMsg = `Esa mesa ya tiene una reserva a horario cercano (${new Date(conflict.dateTime).toLocaleString("es-CL")}, a nombre de ${conflict.customerName}).`;
            return;
          }
        }

        if (id) {
          const r = s.reservations.find(res => res.id === id);
          if (r) {
            r.customerName = customerName;
            r.customerPhone = customerPhone || "";
            r.customerCount = Math.max(1, Number(customerCount) || 1);
            r.dateTime = dateTime;
            r.tableId = tableId || r.tableId;
            r.notes = notes || "";
            r.status = status || r.status;
            if (advancePayment !== undefined) r.advancePayment = Math.max(0, Math.round(Number(advancePayment) || 0));
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
            customerCount: Math.max(1, Number(customerCount) || 1),
            dateTime,
            tableId: tableId || undefined,
            notes: notes || "",
            status: status || ReservationStatus.PENDING,
            advancePayment: Math.max(0, Math.round(Number(advancePayment) || 0)),
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

      if (errorMsg) {
        return createResponse({ error: errorMsg }, 400);
      }
      return createResponse({ success: true, reservation: savedRes });
    }

    // Cancel / delete a reservation
    if (path.match(/^\/api\/reservations\/[^/]+$/) && method === "DELETE") {
      const resId = path.split("/").pop()!;
      const depositAction = body.depositAction as "REFUNDED" | "FORFEITED" | undefined;
      let found = false;
      let errorMsg = "";

      await updateState(s => {
        const idx = s.reservations.findIndex(r => r.id === resId);
        if (idx === -1) return;
        const reservation = s.reservations[idx];
        const hasDeposit = (reservation.advancePayment || 0) > 0;
        if (hasDeposit && depositAction !== "REFUNDED" && depositAction !== "FORFEITED") {
          errorMsg = "Indica si el abono fue devuelto o retenido para cancelar la reserva.";
          return;
        }

        if (reservation.tableId) {
          const table = s.tables.find(t => t.id === reservation.tableId);
          if (table && table.status === TableStatus.RESERVED) {
            table.status = TableStatus.FREE;
          }
        }
        reservation.status = ReservationStatus.CANCELLED;
        found = true;

        if (!s.auditLogs) s.auditLogs = [];
        if (hasDeposit && depositAction === "FORFEITED") {
          if (!s.payments) s.payments = [];
          s.payments.push({
            id: "pay_" + Math.random().toString(36).substring(2, 11),
            reservationId: reservation.id,
            amount: reservation.advancePayment || 0,
            method: reservation.advancePaymentMethod || PaymentMethod.CASH,
            tip: 0,
            discount: 0,
            description: `Abono no reembolsado — reserva no ejecutada de ${reservation.customerName}`,
            createdAt: new Date().toISOString(),
          });
          s.auditLogs.push({
            id: "audit_" + Math.random().toString(36).substring(2, 11),
            action: "Reserva Cancelada",
            details: `Reserva de ${reservation.customerName} cancelada. El abono de $${(reservation.advancePayment || 0).toLocaleString("es-CL")} quedó como ingreso del restaurante.`,
            createdAt: new Date().toISOString(),
          });
        } else if (hasDeposit && depositAction === "REFUNDED") {
          s.auditLogs.push({
            id: "audit_" + Math.random().toString(36).substring(2, 11),
            action: "Reserva Cancelada",
            details: `Reserva de ${reservation.customerName} cancelada. El abono de $${(reservation.advancePayment || 0).toLocaleString("es-CL")} fue devuelto al cliente.`,
            createdAt: new Date().toISOString(),
          });
        } else {
          s.auditLogs.push({
            id: "audit_" + Math.random().toString(36).substring(2, 11),
            action: "Reserva Cancelada",
            details: `Reserva de ${reservation.customerName} cancelada.`,
            createdAt: new Date().toISOString(),
          });
        }
      });

      if (errorMsg) {
        return createResponse({ error: errorMsg }, 400);
      }
      if (!found) {
        return createResponse({ error: "Reserva no encontrada" }, 404);
      }
      return createResponse({ success: true });
    }

    // One-time setup: the app has no category editor, so the daily-menu
    // category has to be created for it. Also seeds any dishes still missing,
    // matching on name so it can be re-run safely to add later additions.
    if (path === "/api/admin/daily-menu/setup" && method === "POST") {
      const { dishes, price, publicServicePrice, operatorName } = body;
      const basePrice = Math.max(0, Math.round(Number(price) || 0));
      const reducedPrice = Math.max(0, Math.round(Number(publicServicePrice) || 0));
      if (!Array.isArray(dishes) || basePrice <= 0) {
        return createResponse({ error: "Faltan los platos o el precio base." }, 400);
      }

      let createdCategory = false;
      let createdCount = 0;

      await updateState(s => {
        if (!s.categories.some(c => c.id === DAILY_MENU_CATEGORY_ID)) {
          s.categories.push({
            id: DAILY_MENU_CATEGORY_ID,
            name: "Menú del Día",
            icon: "UtensilsCrossed",
          });
          createdCategory = true;
        }

        const existingNames = new Set(
          s.products
            .filter(p => p.categoryId === DAILY_MENU_CATEGORY_ID)
            .map(p => p.name.trim().toLocaleLowerCase()),
        );

        for (const raw of dishes) {
          const name = String(raw || "").trim();
          if (!name || existingNames.has(name.toLocaleLowerCase())) continue;
          existingNames.add(name.toLocaleLowerCase());
          s.products.push({
            id: "p_" + Math.random().toString(36).substring(2, 11),
            name,
            description: "",
            price: basePrice,
            ...(reducedPrice > 0 ? { publicServicePrice: reducedPrice } : {}),
            imageUrl: "",
            categoryId: DAILY_MENU_CATEGORY_ID,
            allergens: [],
            // Start switched off: staff decides each day what is actually on.
            isAvailable: false,
            isRecommended: false,
            recipe: [],
          });
          createdCount++;
        }

        if (createdCategory || createdCount > 0) {
          if (!s.auditLogs) s.auditLogs = [];
          s.auditLogs.push({
            id: "audit_" + Math.random().toString(36).substring(2, 11),
            action: "Menú del Día",
            details: `Se preparó el menú del día (${createdCategory ? "categoría creada, " : ""}${createdCount} plato(s) agregado(s)) por ${operatorName || "Administrador"}.`,
            createdAt: new Date().toISOString(),
          });
        }
      });

      return createResponse({ success: true, createdCategory, createdCount });
    }

    // Daily-menu accompaniment options (consomé, ensalada, jugo…)
    if (path === "/api/admin/config/daily-menu-choices" && method === "POST") {
      const { groups, operatorName } = body;
      if (!Array.isArray(groups)) {
        return createResponse({ error: "Formato de opciones inválido." }, 400);
      }
      const cleanGroups = groups
        .map((group: any) => ({
          id: typeof group?.id === "string" && group.id ? group.id : "grp_" + Math.random().toString(36).substring(2, 11),
          name: String(group?.name || "").trim(),
          options: Array.isArray(group?.options)
            ? group.options.map((option: any) => String(option || "").trim()).filter(Boolean)
            : [],
        }))
        .filter((group) => group.name);

      await updateState(s => {
        s.dailyMenuChoiceGroups = cleanGroups;
        if (!s.auditLogs) s.auditLogs = [];
        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          action: "Ajuste de Sistema",
          details: `Se actualizaron las opciones del menú del día (${cleanGroups.map(g => g.name).join(", ") || "sin grupos"}) por ${operatorName || "Administrador"}.`,
          createdAt: new Date().toISOString(),
        });
      });
      return createResponse({ success: true, groups: cleanGroups });
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

    // Update the hour at which one business day hands over to the next, so a
    // night that runs late is still counted on the night it started.
    if (path === "/api/admin/config/business-day-start" && method === "POST") {
      const { businessDayStartHour, userName } = body;
      const requested = Number(businessDayStartHour);
      if (!Number.isInteger(requested) || requested < 0 || requested > 23) {
        return createResponse({ error: "La hora de corte debe ser un número entero entre 0 y 23" }, 400);
      }
      const updated = await updateState(s => {
        s.businessDayStartHour = requested;
        if (!s.auditLogs) s.auditLogs = [];
        s.auditLogs.push({
          id: "audit_" + Math.random().toString(36).substring(2, 11),
          action: "Ajuste de Sistema",
          details: `Se cambió el inicio de la jornada a las ${requested}:00 por ${userName || "Administrador"}. Los reportes ahora cuentan de ${requested}:00 a ${requested}:00 del día siguiente.`,
          createdAt: new Date().toISOString()
        });
      });
      return createResponse({ success: true, state: updated });
    }

    // 14. Shifts
    if (path === "/api/shifts/open" && method === "POST") {
      const { userId, initialCash } = body;
      if (!userId || !Number.isFinite(Number(initialCash)) || Number(initialCash) < 0) {
        return createResponse({ error: "Usuario y caja inicial válida (número no negativo) son requeridos" }, 400);
      }
      let openedShift: any = null;

      await updateState(s => {
        const user = s.users.find(u => u.id === userId);
        const userName = user ? user.name : "Mozo";

        // Only auto-close a stale shift left open by this SAME user — never
        // someone else's, or opening a shift would silently wipe out a
        // coworker's real cash reconciliation with a fabricated final count.
        s.shifts.forEach(sh => {
          if (sh.status === ShiftStatus.OPEN && sh.userId === userId) {
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
      if (!id || !Number.isFinite(Number(finalCash)) || Number(finalCash) < 0) {
        return createResponse({ error: "ID de turno y arqueo final válido (número no negativo) son requeridos" }, 400);
      }
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
      projected.businessDayStartHour = normalizeBusinessDayStartHour(importedState.businessDayStartHour);
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
        s.businessDayStartHour = normalizeBusinessDayStartHour(importedState.businessDayStartHour);
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
              // Reverse the exact points earned at closing time (stored on the
              // order), not a recomputation from today's catalog prices — those
              // may have changed since the sale and would over/under-claw points.
              const earnedPoints = Math.floor(((order.billingSubtotal || 0) - (order.billingDiscount || 0)) / 100);
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

        order.voided = true;
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
    if (isTransientAuthError(error)) {
      return createResponse(
        { error: "Sin conexión con el servidor. Revisa el internet del local y vuelve a intentar." },
        503,
      );
    }
    return createResponse({ error: error.message || "Error interno del servidor simulado" }, 500);
  }
}

export async function resolveNotificationDirectly(notifId: string, tableNumber?: number) {
  try {
    if (currentCachedState?.notifications) {
      const targetNotif = currentCachedState.notifications.find(n => n.id === notifId);
      const tblNum = tableNumber || targetNotif?.tableNumber;

      const toResolve = currentCachedState.notifications.filter(
        n => n.id === notifId || (tblNum && n.tableNumber === tblNum)
      );

      toResolve.forEach(n => { n.resolved = true; });
      currentCachedState.notifications = currentCachedState.notifications.filter(n => !n.resolved);
      publishState(currentCachedState);

      for (const n of toResolve) {
        try {
          await setDoc(doc(db, "notifications", n.id), { resolved: true }, { merge: true });
        } catch {
          try {
            await deleteDoc(doc(db, "notifications", n.id));
          } catch {}
        }
      }
    }
  } catch (err) {
    console.error("Error in resolveNotificationDirectly:", err);
  }
}
