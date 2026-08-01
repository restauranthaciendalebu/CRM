import { RestaurantState } from "./types";

export const BACKUP_FORMAT_VERSION = 2;

const REQUIRED_COLLECTIONS = [
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
] as const;

const OPTIONAL_COLLECTIONS = [
  "auditLogs",
  "inventoryTransactions",
  "recoveryArchive",
] as const;

type BackupEnvelope = {
  formatVersion: number;
  application: "restaurant-hacienda";
  exportedAt: string;
  state: RestaurantState;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function validateCollection(name: string, value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error(`El respaldo no contiene una colección válida: ${name}.`);
  }
  if (value.length > 10000) {
    throw new Error(`La colección ${name} excede el máximo permitido.`);
  }

  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") {
      throw new Error(`La colección ${name} contiene un registro inválido.`);
    }
    const id = (item as { id?: unknown }).id;
    if (typeof id !== "string" || !id.trim() || id.length > 160) {
      throw new Error(`La colección ${name} contiene un identificador inválido.`);
    }
    if (ids.has(id)) {
      throw new Error(`La colección ${name} contiene el identificador duplicado ${id}.`);
    }
    ids.add(id);
  }
}

export function createBackupEnvelope(state: RestaurantState): BackupEnvelope {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    application: "restaurant-hacienda",
    exportedAt: new Date().toISOString(),
    state: clone(state),
  };
}

export function parseAndValidateBackup(payload: unknown): RestaurantState {
  if (!payload || typeof payload !== "object") {
    throw new Error("El archivo no contiene un respaldo válido.");
  }

  const candidate = payload as Partial<BackupEnvelope> & Partial<RestaurantState>;
  if ("formatVersion" in candidate) {
    if (
      candidate.formatVersion !== BACKUP_FORMAT_VERSION
      || candidate.application !== "restaurant-hacienda"
      || !candidate.state
    ) {
      throw new Error("El formato o la versión del respaldo no es compatible.");
    }
  }

  const rawState = ("state" in candidate ? candidate.state : candidate) as Partial<RestaurantState>;
  for (const collectionName of REQUIRED_COLLECTIONS) {
    validateCollection(collectionName, rawState[collectionName]);
  }
  for (const collectionName of OPTIONAL_COLLECTIONS) {
    const value = rawState[collectionName];
    if (value !== undefined) validateCollection(collectionName, value);
  }
  if (
    rawState.onlyViewMenuQr !== undefined
    && typeof rawState.onlyViewMenuQr !== "boolean"
  ) {
    throw new Error("La configuración del menú QR no es válida.");
  }
  if (rawState.businessDayStartHour !== undefined) {
    const hour = rawState.businessDayStartHour;
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      throw new Error("La hora de inicio de la jornada no es válida.");
    }
  }

  const state = clone(rawState) as RestaurantState;
  state.auditLogs = state.auditLogs || [];
  state.inventoryTransactions = state.inventoryTransactions || [];
  state.recoveryArchive = state.recoveryArchive || [];
  return state;
}

export function getBackupRecordCount(state: RestaurantState) {
  return [...REQUIRED_COLLECTIONS, ...OPTIONAL_COLLECTIONS]
    .reduce((total, key) => total + (state[key]?.length || 0), 0);
}
