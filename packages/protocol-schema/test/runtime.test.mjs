import assert from "node:assert/strict";
import test from "node:test";
import { compileExecutionPlan, validateConnection, validateGraph } from "../src/runtime.ts";

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

test("runtime validation rejects self-loop edges", () => {
  const output = port({ portId: "out", nodeId: "node", direction: "output", kind: "control", valueType: "any" });
  const input = port({ portId: "in", nodeId: "node", direction: "input", kind: "control", valueType: "any" });
  const graph = {
    schemaVersion: "1.0.0",
    nodes: [node("node", [input], [output])],
    edges: [{
      edgeId: "self-loop",
      canvasId: "canvas",
      source: { nodeId: "node", portId: "out" },
      target: { nodeId: "node", portId: "in" },
      kind: "control",
      enabled: true,
    }],
    entrypoints: [],
    triggers: [],
  };

  assert.equal(validateGraph(graph, "fragment").errors[0].code, "SELF_LOOP");
});

test("execution plan compilation produces deterministic graph VM instructions", () => {
  const startOutput = port({ portId: "start-out", nodeId: "start", name: "Start", direction: "output", kind: "control", valueType: "any" });
  const taskInput = port({ portId: "task-in", nodeId: "task", name: "Start", direction: "input", kind: "control", valueType: "any", required: true });
  const taskOutput = port({ portId: "task-out", nodeId: "task", name: "Result", direction: "output", kind: "data", valueType: "text" });
  const outputInput = port({ portId: "output-in", nodeId: "output", name: "Input", direction: "input", kind: "data", valueType: "text", required: true, cardinality: "one" });
  const graph = {
    schemaVersion: "1.0.0",
    nodes: [
      { ...node("start", [], [startOutput]), category: "trigger" },
      { ...node("task", [taskInput], [taskOutput]), category: "agent" },
      { ...node("output", [outputInput], []), category: "output" },
    ],
    edges: [
      {
        edgeId: "control-edge",
        canvasId: "canvas",
        source: { nodeId: "start", portId: "start-out" },
        target: { nodeId: "task", portId: "task-in" },
        kind: "control",
        enabled: true,
      },
      {
        edgeId: "data-edge",
        canvasId: "canvas",
        source: { nodeId: "task", portId: "task-out" },
        target: { nodeId: "output", portId: "output-in" },
        kind: "data",
        enabled: true,
      },
    ],
    entrypoints: [{
      entrypointId: "manual",
      name: "Manual",
      kind: "manual",
      targetNodeId: "start",
      manualInvocable: true,
      enabled: true,
    }],
    defaultEntrypointId: "manual",
    triggers: [],
  };

  const compiled = compileExecutionPlan(graph, "workflow");
  assert.equal(compiled.valid, true);
  assert.deepEqual(compiled.plan?.nodeOrder, ["start", "task", "output"]);
  assert.deepEqual(compiled.plan?.instructions.map((instruction) => instruction.op), [
    "enter",
    "dispatch_node",
    "route_control",
    "dispatch_node",
    "route_data",
    "dispatch_node",
    "return",
  ]);
  assert.equal(compiled.plan?.effectSummary.hasExternalEffects, true);
  assert.deepEqual(compiled.plan?.effectSummary.edgeKinds, ["control", "data"]);
});
