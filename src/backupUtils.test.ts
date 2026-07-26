import assert from "node:assert/strict";
import test from "node:test";
import { createBackupEnvelope, parseAndValidateBackup } from "./backupUtils";
import { DEMO_STATE } from "./demoState";

test("creates and validates a versioned backup envelope", () => {
  const envelope = createBackupEnvelope(DEMO_STATE);
  const restored = parseAndValidateBackup(envelope);

  assert.equal(envelope.formatVersion, 2);
  assert.equal(restored.tables.length, DEMO_STATE.tables.length);
  assert.deepEqual(restored.orders, DEMO_STATE.orders);
});

test("accepts legacy raw state backups", () => {
  const restored = parseAndValidateBackup(DEMO_STATE);
  assert.equal(restored.products.length, DEMO_STATE.products.length);
  assert.deepEqual(restored.recoveryArchive, []);
});

test("rejects backups with missing or duplicated critical records", () => {
  const missingOrders = { ...DEMO_STATE, orders: undefined };
  assert.throws(
    () => parseAndValidateBackup(missingOrders),
    /orders/,
  );

  const duplicatedTables = {
    ...DEMO_STATE,
    tables: [DEMO_STATE.tables[0], DEMO_STATE.tables[0]],
  };
  assert.throws(
    () => parseAndValidateBackup(duplicatedTables),
    /duplicado/,
  );
});
