import assert from "node:assert/strict";
import test from "node:test";
import { extractPartialResult, parseFinalResult } from "./result-parser.ts";

test("keeps an ordinary text result unchanged", () => {
  const generated = parseFinalResult(
    JSON.stringify({
      result: "A concise summary.",
      swapText: "A concise summary.",
    }),
  );

  assert.deepEqual(generated, {
    result: "A concise summary.",
    swapText: "A concise summary.",
  });
});

test("formats a nested summary object as readable text", () => {
  const nestedSummary = JSON.stringify({
    mainArgument: "The main idea.",
    importantFacts: ["First fact.", "Second fact."],
    conclusions: ["The conclusion."],
  });
  const generated = parseFinalResult(
    JSON.stringify({
      result: nestedSummary,
      swapText: nestedSummary,
    }),
  );

  assert.equal(
    generated.result,
    [
      "Main Argument",
      "The main idea.",
      "",
      "Important Facts",
      "- First fact.",
      "- Second fact.",
      "",
      "Conclusions",
      "- The conclusion.",
    ].join("\n"),
  );
  assert.equal(generated.swapText, generated.result);
});

test("does not stream an incomplete nested object as raw JSON", () => {
  const partial =
    '{"result":"{\\"mainArgument\\":\\"The main idea.\\",\\"importantFacts\\":[\\"First fact.\\"';

  assert.equal(extractPartialResult(partial), "");
});

test("formats a complete nested object during streaming", () => {
  const nestedSummary = JSON.stringify({
    mainArgument: "The main idea.",
    importantFacts: ["First fact."],
  });
  const raw = JSON.stringify({
    result: nestedSummary,
    swapText: nestedSummary,
  });

  assert.equal(
    extractPartialResult(raw),
    [
      "Main Argument",
      "The main idea.",
      "",
      "Important Facts",
      "- First fact.",
    ].join("\n"),
  );
});
