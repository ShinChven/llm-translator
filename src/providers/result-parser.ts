import type { GeneratedResult } from "../shared/types";

const RESULT_SCHEMA = {
  type: "object",
  properties: {
    result: { type: "string" },
    swapText: { type: "string" },
  },
  required: ["result", "swapText"],
  additionalProperties: false,
} as const;

export { RESULT_SCHEMA };

export function parseFinalResult(raw: string): GeneratedResult {
  const parsed = JSON.parse(raw) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("result" in parsed) ||
    typeof parsed.result !== "string" ||
    !("swapText" in parsed) ||
    typeof parsed.swapText !== "string"
  ) {
    throw new Error("The model returned an invalid result.");
  }
  return {
    result: parsed.result,
    swapText: parsed.swapText,
  };
}

export function extractPartialResult(raw: string): string {
  const match = /"result"\s*:\s*"/.exec(raw);
  if (!match) return "";

  const start = match.index + match[0].length;
  let value = "";
  let escaped = false;

  for (let index = start; index < raw.length; index += 1) {
    const character = raw[index];
    if (escaped) {
      switch (character) {
        case "n":
          value += "\n";
          break;
        case "r":
          value += "\r";
          break;
        case "t":
          value += "\t";
          break;
        case '"':
          value += '"';
          break;
        case "\\":
          value += "\\";
          break;
        default:
          value += character;
      }
      escaped = false;
      continue;
    }

    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') break;
    value += character;
  }

  return value;
}
