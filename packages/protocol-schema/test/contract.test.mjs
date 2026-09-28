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

  const namedEntrypointRequest = {
    revision: fixtures.startRunRequest.revision,
    entrypointId: "canvas_citation:default",
    idempotencyKey: "named-entrypoint",
  };
  assert.equal(validators.StartRunRequest(namedEntrypointRequest), true);
  assert.equal(validators.StartRunRequest({ ...namedEntrypointRequest, entrypointId: "" }), false);
});

test("runtime values are typed per port and legacy node maps are rejected", () => {
  const legacyNodeValues = structuredClone(fixtures.snapshot);
  legacyNodeValues.runs[0].nodeValues = { "33333333-3333-4333-8333-333333333333": "legacy" };
  assert.equal(validators.HostSnapshot(legacyNodeValues), false);

  const wrongTextType = structuredClone(fixtures.snapshot);
  wrongTextType.runs[0].portValues["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"].value = 42;
  assert.equal(validators.HostSnapshot(wrongTextType), false);

  const artifactReference = structuredClone(fixtures.snapshot);
  artifactReference.runs[0].portValues["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"] = {
    type: "artifact_ref",
    artifactId: "artifact-1",
  };
  assert.equal(validators.HostSnapshot(artifactReference), true);
});

test("Run plan snapshots reject invalid cursors and mutable shapes", () => {
  const negativeCursor = structuredClone(fixtures.snapshot);
  negativeCursor.runs[0].executionCursor = -1;
  assert.equal(validators.HostSnapshot(negativeCursor), false);

  const duplicatePlanNode = structuredClone(fixtures.snapshot);
  duplicatePlanNode.runs[0].planSnapshot.nodeOrder.push(
    duplicatePlanNode.runs[0].planSnapshot.nodeOrder[0],
  );
  assert.equal(validators.HostSnapshot(duplicatePlanNode), false);

  const invalidDigest = structuredClone(fixtures.snapshot);
  invalidDigest.runs[0].planSnapshot.graphDigest = "sha256:not-a-digest";
  assert.equal(validators.HostSnapshot(invalidDigest), false);
});
