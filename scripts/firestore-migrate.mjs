import crypto from "node:crypto";
import fs from "node:fs";

const [
  backupFile,
  destinationProjectId,
  accessTokenFile,
  destinationDatabaseId = "(default)",
  migrationMode = "create-only",
] = process.argv.slice(2);

if (!backupFile || !destinationProjectId || !accessTokenFile) {
  console.error(
    "Usage: node scripts/firestore-migrate.mjs <backup-file> <destination-project-id> <access-token-file> [database-id]",
  );
  process.exit(1);
}

const backupText = fs.readFileSync(backupFile, "utf8");
const backup = JSON.parse(backupText);
const accessToken = fs.readFileSync(accessTokenFile, "utf8").trim();
const sourceProjectId = backup.source?.projectId;

if (!sourceProjectId) throw new Error("The backup does not identify its source project.");
if (sourceProjectId === destinationProjectId) {
  throw new Error("Migration refused: source and destination projects are the same.");
}
if (!accessToken) throw new Error("The access token file is empty.");
if (!["create-only", "replace-existing"].includes(migrationMode)) {
  throw new Error("Migration mode must be create-only or replace-existing.");
}

const legacyState = backup.collections?.settings?.find(
  (document) => document.id === "restaurant_state",
)?.data;
if (!legacyState) throw new Error("The legacy restaurant state was not found in the backup.");

const collectionFields = [
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
];

function cleanValue(value, key = "") {
  if (value === undefined) return undefined;
  if (key === "pin" || key === "password") return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => cleanValue(item)).filter((item) => item !== undefined);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([childKey, childValue]) => [childKey, cleanValue(childValue, childKey)])
        .filter(([, childValue]) => childValue !== undefined),
    );
  }
  return value;
}

function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Firestore cannot store a non-finite number.");
    return Number.isSafeInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (value && typeof value === "object") return { mapValue: { fields: encodeFields(value) } };
  throw new Error(`Unsupported Firestore value type: ${typeof value}`);
}

function encodeFields(data) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, encodeValue(value)]),
  );
}

function decodeValue(value) {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("stringValue" in value) return value.stringValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  throw new Error(`Unsupported Firestore value: ${Object.keys(value).join(", ")}`);
}

function decodeFields(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]),
  );
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function hashDocuments(documents) {
  const canonical = documents
    .map((document) => ({
      path: document.path,
      data: stableValue(document.data),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function assertDocumentId(id, collectionName) {
  if (typeof id !== "string" || !id || id.includes("/")) {
    throw new Error(`Invalid document ID in ${collectionName}.`);
  }
}

const documents = [];
for (const collectionName of collectionFields) {
  const entities = legacyState[collectionName] || [];
  if (!Array.isArray(entities)) {
    throw new Error(`Expected ${collectionName} to be an array.`);
  }
  for (const entity of entities) {
    assertDocumentId(entity.id, collectionName);
    documents.push({
      path: `${collectionName}/${entity.id}`,
      data: cleanValue(entity),
    });
  }
}

documents.push({
  path: "config/restaurant",
  data: {
    onlyViewMenuQr: Boolean(legacyState.onlyViewMenuQr),
  },
});

const sourceSha256 = crypto.createHash("sha256").update(backupText).digest("hex");
const sourceCounts = Object.fromEntries(
  collectionFields.map((name) => [name, (legacyState[name] || []).length]),
);
documents.push({
  path: "system/migration",
  data: {
    formatVersion: 1,
    sourceProjectId,
    sourceDatabaseId: backup.source?.databaseId || "(default)",
    sourceExportedAt: backup.exportedAt,
    sourceSha256,
    migratedAt: new Date().toISOString(),
    sourceCounts,
    credentialsMigrated: false,
  },
});

const databaseRoot = `projects/${destinationProjectId}/databases/${destinationDatabaseId}`;
const documentsRoot = `${databaseRoot}/documents`;

async function requestJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore request failed (${response.status}): ${body.slice(0, 500)}`);
  }
  return response.status === 204 ? null : response.json();
}

async function listCollectionDocuments(collectionName) {
  const result = [];
  let pageToken = "";
  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/${documentsRoot}/${encodeURIComponent(collectionName)}`,
    );
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await requestJson(url);
    result.push(
      ...(payload.documents || []).map((document) => ({
        name: document.name,
        path: document.name.split("/documents/")[1],
        data: decodeFields(document.fields || {}),
      })),
    );
    pageToken = payload.nextPageToken || "";
  } while (pageToken);
  return result;
}

if (migrationMode === "replace-existing") {
  const collectionsToReplace = [...collectionFields, "config", "system"];
  const existingDocuments = (
    await Promise.all(collectionsToReplace.map(listCollectionDocuments))
  ).flat();
  for (let offset = 0; offset < existingDocuments.length; offset += 400) {
    const batch = existingDocuments.slice(offset, offset + 400);
    await requestJson(
      `https://firestore.googleapis.com/v1/${databaseRoot}/documents:commit`,
      {
        method: "POST",
        body: JSON.stringify({
          writes: batch.map((document) => ({ delete: document.name })),
        }),
      },
    );
  }
}

for (let offset = 0; offset < documents.length; offset += 400) {
  const batch = documents.slice(offset, offset + 400);
  await requestJson(
    `https://firestore.googleapis.com/v1/${databaseRoot}/documents:commit`,
    {
      method: "POST",
      body: JSON.stringify({
        writes: batch.map((document) => ({
          update: {
            name: `${documentsRoot}/${document.path}`,
            fields: encodeFields(document.data),
          },
          ...(migrationMode === "create-only"
            ? { currentDocument: { exists: false } }
            : {}),
        })),
      }),
    },
  );
}

const expectedByCollection = new Map();
for (const document of documents) {
  const collectionName = document.path.split("/")[0];
  if (!expectedByCollection.has(collectionName)) expectedByCollection.set(collectionName, []);
  expectedByCollection.get(collectionName).push(document);
}

const verification = {};
for (const [collectionName, expected] of expectedByCollection) {
  const actual = await listCollectionDocuments(collectionName);
  const expectedHash = hashDocuments(expected);
  const actualHash = hashDocuments(actual);
  if (actual.length !== expected.length || actualHash !== expectedHash) {
    throw new Error(
      `Verification failed for ${collectionName}: expected ${expected.length}/${expectedHash}, got ${actual.length}/${actualHash}.`,
    );
  }
  verification[collectionName] = {
    documents: actual.length,
    sha256: actualHash,
  };
}

console.log(
  JSON.stringify(
    {
      sourceProjectId,
      destinationProjectId,
      sourceSha256,
      migrationMode,
      credentialsMigrated: false,
      verification,
    },
    null,
    2,
  ),
);
