import assert from "node:assert/strict";
import test from "node:test";
import { supportsTemperature } from "./anthropic-models.ts";

test("sends temperature to the models that still accept it", () => {
  for (const model of [
    "claude-haiku-4-5",
    "claude-haiku-4-5-20251001",
    "claude-opus-4-6",
    "claude-opus-4-5-20251101",
    "claude-opus-4-1",
    "claude-sonnet-4-6",
    "claude-sonnet-4-5",
    "claude-3-5-sonnet-20241022",
  ]) {
    assert.equal(supportsTemperature(model), true, model);
  }
});

test("omits temperature for the models that reject it with a 400", () => {
  for (const model of [
    "claude-opus-4-7",
    "claude-opus-4-8",
    "claude-opus-5",
    "claude-sonnet-5",
    "claude-fable-5",
    "claude-mythos-5",
  ]) {
    assert.equal(supportsTemperature(model), false, model);
  }
});

test("omits temperature for an unrecognised model rather than risking a 400", () => {
  assert.equal(supportsTemperature("claude-opus-9"), false);
  assert.equal(supportsTemperature("some-other-model"), false);
  assert.equal(supportsTemperature(""), false);
});

test("does not mistake a longer version number for an allowed one", () => {
  assert.equal(supportsTemperature("claude-opus-4-59"), false);
  assert.equal(supportsTemperature("claude-sonnet-4-70"), false);
});

test("tolerates the surrounding whitespace and casing a typed model id may carry", () => {
  assert.equal(supportsTemperature("  Claude-Haiku-4-5  "), true);
  assert.equal(supportsTemperature("  claude-opus-5 "), false);
});
