import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const [projectId, outputFile, serviceAccountPath, databaseId = "(default)"] = process.argv.slice(2);

if (!projectId || !outputFile || !serviceAccountPath) {
  console.error("Usage: node scripts/firestore-backup.mjs <project-id> <output-file> <service-account-json> [database-id]");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
if (serviceAccount.project_id !== projectId) {
  throw new Error(`The credential belongs to ${serviceAccount.project_id}, not ${projectId}.`);
}

const encodeJwtPart = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const unsignedToken = [
    encodeJwtPart({ alg: "RS256", typ: "JWT" }),
    encodeJwtPart({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ].join(".");
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(unsignedToken), serviceAccount.private_key)
    .toString("base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedToken}.${signature}`,
    }),
  });
  if (!response.ok) throw new Error(`OAuth failed with HTTP ${response.status}.`);
  const payload = await response.json();
  return payload.access_token;
}

function decodeValue(value) {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("stringValue" in value) return value.stringValue;
  if ("bytesValue" in value) return { __firestoreBytes: value.bytesValue };
  if ("referenceValue" in value) return { __firestoreReference: value.referenceValue };
  if ("geoPointValue" in value) return { __firestoreGeoPoint: value.geoPointValue };
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  throw new Error(`Unsupported Firestore value: ${Object.keys(value).join(", ")}`);
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

async function requestJson(url, accessToken, init = {}) {
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
    throw new Error(`Firestore request failed (${response.status}): ${body.slice(0, 300)}`);
  }
  return response.json();
}

async function listRootCollections(accessToken) {
  const names = [];
  let pageToken = "";
  do {
    const payload = await requestJson(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${encodeURIComponent(databaseId)}/documents:listCollectionIds`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({ pageSize: 1000, ...(pageToken ? { pageToken } : {}) }),
      },
    );
    names.push(...(payload.collectionIds || []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);
  return names.sort();
}

async function listCollectionDocuments(collectionId, accessToken) {
  const documents = [];
  let pageToken = "";
  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${encodeURIComponent(databaseId)}/documents/${encodeURIComponent(collectionId)}`,
    );
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await requestJson(url, accessToken);
    documents.push(...(payload.documents || []).map((document) => ({
      id: document.name.split("/").pop(),
      path: document.name.split("/documents/")[1],
      data: decodeFields(document.fields || {}),
      createTime: document.createTime,
      updateTime: document.updateTime,
    })));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);
  return documents;
}

const accessToken = await getAccessToken();
const collectionIds = await listRootCollections(accessToken);
const collections = {};
for (const collectionId of collectionIds) {
  collections[collectionId] = await listCollectionDocuments(collectionId, accessToken);
}

const requiredCollections = ["users", "tables", "products", "access", "staffDirectory"];
const missingCollections = requiredCollections.filter(
  (collectionId) => !Array.isArray(collections[collectionId]) || collections[collectionId].length === 0,
);
if (missingCollections.length > 0) {
  throw new Error(
    `Backup validation failed. Missing current collections: ${missingCollections.join(", ")}.`,
  );
}

const backup = {
  formatVersion: 2,
  backupType: "firestore-collections",
  source: {
    projectId,
    databaseId,
  },
  exportedAt: new Date().toISOString(),
  collections,
};
const serialized = JSON.stringify(backup, null, 2);
const sha256 = crypto.createHash("sha256").update(serialized).digest("hex");
const manifest = {
  exportedAt: backup.exportedAt,
  projectId,
  databaseId,
  sha256,
  bytes: Buffer.byteLength(serialized),
  collections: Object.fromEntries(
    Object.entries(collections).map(([name, documents]) => [name, documents.length]),
  ),
};

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, serialized, { encoding: "utf8", mode: 0o600 });
fs.writeFileSync(`${outputFile}.manifest.json`, JSON.stringify(manifest, null, 2), {
  encoding: "utf8",
  mode: 0o600,
});

const verification = JSON.parse(fs.readFileSync(outputFile, "utf8"));
if (Object.keys(verification.collections).length !== collectionIds.length) {
  throw new Error("Backup verification failed after writing the file.");
}

console.log(JSON.stringify(manifest, null, 2));
