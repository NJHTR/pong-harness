import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv from "ajv";

const schema = JSON.parse(await readFile(new URL("../host-wire.schema.json", import.meta.url), "utf8"));
const fixtures = JSON.parse(await readFile(new URL("./fixtures/host-wire.json", import.meta.url), "utf8"));
const ajv = new Ajv({ allErrors: true, strict: true });
const validators = Object.fromEntries(
  ["HostSnapshot", "HostEventBatch", "HostError", "StartRunRequest"].map((name) => [
    name,
    ajv.compile({ ...schema, $id: `${schema.$id}#${name}`, $ref: `#/definitions/${name}`, oneOf: undefined }),
  ]),
);

test("shared Host wire fixtures validate against their specific contracts", () => {
  for (const [name, sample] of [
    ["HostSnapshot", fixtures.snapshot],
    ["HostEventBatch", fixtures.eventBatch],
    ["HostError", fixtures.error],
    ["StartRunRequest", fixtures.startRunRequest],
  ]) {
    assert.equal(validators[name](sample), true, JSON.stringify(validators[name].errors));
  }
});

test("null and required fields are not treated as optional", () => {
  const missingFinishedAt = structuredClone(fixtures.snapshot);
  delete missingFinishedAt.runs[0].finishedAt;
  assert.equal(validators.HostSnapshot(missingFinishedAt), false);

  const missingNotificationLink = structuredClone(fixtures.snapshot);
  delete missingNotificationLink.notifications[0].runId;
  assert.equal(validators.HostSnapshot(missingNotificationLink), false);

  const extraField = { ...fixtures.error, internalStack: "private" };
  assert.equal(validators.HostError(extraField), false);
});

test("invalid states, event types and commands are rejected", () => {
  const badStatus = structuredClone(fixtures.snapshot);
  badStatus.runs[0].status = "outcome_unknown";
  assert.equal(validators.HostSnapshot(badStatus), false);

  const badEvent = structuredClone(fixtures.eventBatch);
  badEvent.events[0].eventType = "run.completed";
  assert.equal(validators.HostEventBatch(badEvent), false);

  assert.equal(validators.StartRunRequest({ ...fixtures.startRunRequest, entrypoint: "webhook" }), false);
  assert.equal(validators.StartRunRequest({ ...fixtures.startRunRequest, revision: -1 }), false);
  assert.equal(validators.StartRunRequest({ ...fixtures.startRunRequest, canvasId: "path-only" }), false);
});
