import assert from "node:assert/strict";
import test from "node:test";
import { validateConnection, validateGraph } from "../src/runtime.ts";

const port = (overrides = {}) => ({
  portId: overrides.portId ?? "port",
  nodeId: overrides.nodeId ?? "node",
  name: overrides.name ?? "Port",
  direction: overrides.direction ?? "output",
  kind: overrides.kind ?? "data",
  valueType: overrides.valueType ?? "text",
  required: overrides.required ?? false,
  cardinality: overrides.cardinality ?? "many",
});

const node = (nodeId, inputs = [], outputs = []) => ({
  nodeId,
  canvasId: "canvas",
  definition: {
    definitionId: "test.node",
    version: "0.1.0",
    contentDigest: "sha256:test",
  },
  name: nodeId,
  category: "tool",
  config: {},
  inputs,
  outputs,
  enabled: true,
  position: { x: 0, y: 0 },
});

test("runtime connection accepts output-to-input ports of the same type", () => {
  const source = port({ portId: "out", nodeId: "source", direction: "output", kind: "data", valueType: "text" });
  const target = port({ portId: "in", nodeId: "target", direction: "input", kind: "data", valueType: "text", cardinality: "one", required: true });

  assert.deepEqual(validateConnection(source, target, "canvas", "canvas"), { valid: true });
});

test("runtime connection rejects input-to-input, cross-canvas and duplicate single-input edges", () => {
  const input = port({ portId: "in-a", nodeId: "source", direction: "input", kind: "data", valueType: "text" });
  const target = port({ portId: "in-b", nodeId: "target", direction: "input", kind: "data", valueType: "text", cardinality: "one" });
  assert.equal(validateConnection(input, target, "canvas", "canvas").reason, "same_direction");

  const output = port({ portId: "out", nodeId: "source", direction: "output", kind: "data", valueType: "text" });
  assert.equal(validateConnection(output, target, "canvas-a", "canvas-b").reason, "cross_canvas");
  assert.equal(validateConnection(output, target, "canvas", "canvas", true).reason, "input_already_connected");
});

test("workflow validation requires an enabled manually invocable default entrypoint", () => {
  const startOutput = port({ portId: "start-out", nodeId: "start", name: "Start", direction: "output", kind: "control", valueType: "any" });
  const graph = {
    schemaVersion: "1.0.0",
    nodes: [node("start", [], [startOutput])],
    edges: [],
    entrypoints: [{
      entrypointId: "entry-default",
      name: "Default",
      kind: "manual",
      targetNodeId: "start",
      manualInvocable: true,
      enabled: true,
    }],
    defaultEntrypointId: "entry-default",
    triggers: [],
  };

  assert.equal(validateGraph(graph, "workflow").valid, true);
  assert.equal(validateGraph({ ...graph, defaultEntrypointId: undefined }, "workflow").errors[0].code, "MANUAL_ENTRYPOINT_REQUIRED");
  assert.equal(validateGraph({
    ...graph,
    entrypoints: [{ ...graph.entrypoints[0], manualInvocable: false }],
  }, "workflow").errors[0].code, "DEFAULT_ENTRYPOINT_NOT_MANUAL");
});

test("callable and fragment graphs can omit a default entrypoint", () => {
  const graph = {
    schemaVersion: "1.0.0",
    nodes: [],
    edges: [],
    entrypoints: [],
    triggers: [],
  };

  assert.equal(validateGraph(graph, "callable").valid, true);
  assert.equal(validateGraph(graph, "fragment").valid, true);
  assert.equal(validateGraph(graph, "callable").warnings[0].code, "NO_DEFAULT_ENTRYPOINT");
});
