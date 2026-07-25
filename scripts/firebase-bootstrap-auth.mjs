import fs from "node:fs";
import path from "node:path";

const [backupFile, projectId, accessTokenFile] = process.argv.slice(2);

if (!backupFile || !projectId || !accessTokenFile) {
  console.error(
    "Usage: node scripts/firebase-bootstrap-auth.mjs <backup-file> <project-id> <access-token-file>",
  );
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(backupFile, "utf8"));
const accessToken = fs.readFileSync(accessTokenFile, "utf8").trim();
const sourceProjectId = backup.source?.projectId;
const legacyState = backup.collections?.settings?.find(
  (document) => document.id === "restaurant_state",
)?.data;

if (!legacyState) throw new Error("The legacy restaurant state was not found.");
if (sourceProjectId === projectId) {
  throw new Error("Authentication bootstrap refused on the source production project.");
}

async function requestJson(url, init = {}, authorization = true) {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(authorization ? { Authorization: `Bearer ${accessToken}` } : {}),
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await response.text();
  const payload = body ? JSON.parse(body) : null;
  if (!response.ok) {
    const error = new Error(
      `Request failed (${response.status}): ${JSON.stringify(payload).slice(0, 500)}`,
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function enableService(serviceName) {
  const operation = await requestJson(
    `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${serviceName}:enable`,
    { method: "POST", body: "{}" },
  );
  if (!operation?.name || operation.name === "DONE_OPERATION" || operation.done) return;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const status = await requestJson(
      `https://serviceusage.googleapis.com/v1/${operation.name}`,
    );
    if (status.done) {
      if (status.error) throw new Error(`Could not enable ${serviceName}.`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out enabling ${serviceName}.`);
}

await enableService("identitytoolkit.googleapis.com");
await enableService("firebase.googleapis.com");

const apps = await requestJson(
  `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`,
);
let webApp = (apps.apps || []).find((app) => app.displayName === "Restaurant Hacienda Web");
if (!webApp) {
  const operation = await requestJson(
    `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`,
    {
      method: "POST",
      body: JSON.stringify({ displayName: "Restaurant Hacienda Web" }),
    },
  );
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const status = await requestJson(`https://firebase.googleapis.com/v1beta1/${operation.name}`);
    if (status.done) {
      if (status.error) throw new Error("Could not create the Firebase web app.");
      webApp = status.response;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
if (!webApp?.appId) throw new Error("The Firebase web app could not be resolved.");

const webConfig = await requestJson(
  `https://firebase.googleapis.com/v1beta1/${webApp.name}/config`,
);
if (!webConfig.apiKey) throw new Error("Firebase did not return a web API key.");

const authorizedDomains = [
  "localhost",
  `${projectId}.firebaseapp.com`,
  `${projectId}.web.app`,
  "restauranthaciendalebu.github.io",
];
const updateMask = [
  "signIn.email.enabled",
  "signIn.email.passwordRequired",
  "signIn.anonymous.enabled",
  "authorizedDomains",
].join(",");
const authConfigUrl =
  `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=${encodeURIComponent(updateMask)}`;
const authConfigBody = JSON.stringify({
  signIn: {
    email: { enabled: true, passwordRequired: true },
    anonymous: { enabled: true },
  },
  authorizedDomains,
});
try {
  await requestJson(authConfigUrl, { method: "PATCH", body: authConfigBody });
} catch (error) {
  if (error.status !== 404 || error.payload?.error?.message !== "CONFIGURATION_NOT_FOUND") {
    throw error;
  }
  await requestJson(
    `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/identityPlatform:initializeAuth`,
    { method: "POST", body: "{}" },
  );
  await requestJson(authConfigUrl, { method: "PATCH", body: authConfigBody });
}

function normalizeUsername(user) {
  const source = user.username || user.name.split("(")[0].trim().split(/\s+/)[0];
  return source
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isSafeInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (value && typeof value === "object") {
    return { mapValue: { fields: encodeFields(value) } };
  }
  throw new Error(`Unsupported value type: ${typeof value}`);
}

function encodeFields(data) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, encodeValue(value)]),
  );
}

const usernames = new Set();
const staff = [];
for (const user of legacyState.users || []) {
  const username = normalizeUsername(user);
  if (!username || usernames.has(username)) {
    throw new Error("Staff usernames are empty or duplicated.");
  }
  if (!/^\d{4}$/.test(String(user.pin || ""))) {
    throw new Error(`The legacy account ${user.id} does not have a valid four-digit PIN.`);
  }
  usernames.add(username);
  const email = `${username}@staff.restaurant-hacienda.local`;
  const password = `H!${user.pin}`;
  let authUser;
  try {
    authUser = await requestJson(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(webConfig.apiKey)}`,
      {
        method: "POST",
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
      false,
    );
  } catch (error) {
    const message = error.payload?.error?.message;
    if (message !== "EMAIL_EXISTS") throw error;
    authUser = await requestJson(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(webConfig.apiKey)}`,
      {
        method: "POST",
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
      false,
    );
  }
  staff.push({
    legacyId: user.id,
    authUid: authUser.localId,
    email,
    username,
    name: user.name,
    role: user.role,
    permissions: user.permissions || [],
  });
}

const databaseRoot = `projects/${projectId}/databases/(default)`;
const documentsRoot = `${databaseRoot}/documents`;
const writes = [];
for (const member of staff) {
  writes.push(
    {
      update: {
        name: `${documentsRoot}/users/${member.legacyId}`,
        fields: encodeFields({
          id: member.legacyId,
          authUid: member.authUid,
          username: member.username,
          name: member.name,
          role: member.role,
          permissions: member.permissions,
        }),
      },
    },
    {
      update: {
        name: `${documentsRoot}/access/${member.authUid}`,
        fields: encodeFields({
          userId: member.legacyId,
          role: member.role,
          permissions: member.permissions,
          active: true,
        }),
      },
    },
    {
      update: {
        name: `${documentsRoot}/staffDirectory/${member.legacyId}`,
        fields: encodeFields({
          id: member.legacyId,
          username: member.username,
          name: member.name,
          role: member.role,
        }),
      },
    },
  );
}
await requestJson(
  `https://firestore.googleapis.com/v1/${databaseRoot}/documents:commit`,
  {
    method: "POST",
    body: JSON.stringify({ writes }),
  },
);

const outputFile = path.join("backups", `${projectId}-web-config.json`);
fs.writeFileSync(outputFile, JSON.stringify(webConfig, null, 2), {
  encoding: "utf8",
  mode: 0o600,
});

console.log(
  JSON.stringify(
    {
      projectId,
      webAppId: webApp.appId,
      authProviders: ["emailPassword", "anonymous"],
      authorizedDomains,
      staffAccounts: staff.map(({ legacyId, authUid, username, role }) => ({
        legacyId,
        authUid,
        username,
        role,
      })),
      configFile: outputFile,
      credentialsStoredInFirestore: false,
    },
    null,
    2,
  ),
);
