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
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace < 0 || lastBrace <= firstBrace) {
      throw new Error("The model returned invalid JSON.");
    }
    parsed = JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as unknown;
  }
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
  let result = parsed.result;
  let swapText = parsed.swapText;
  if (result.trim().startsWith("{") && /"result"\s*:/u.test(result)) {
    try {
      const nested = JSON.parse(result) as Record<string, unknown>;
      if (typeof nested.result === "string") {
        result = nested.result;
        if (typeof nested.swapText === "string") {
          swapText = nested.swapText;
        } else {
          swapText = result;
        }
      }
    } catch {
      // Ignore nesting parse failure and return original text
    }
  }
  return {
    result,
    swapText,
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
        case "u": {
          const hex = raw.slice(index + 1, index + 5);
          if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            value += String.fromCharCode(parseInt(hex, 16));
            index += 4;
          } else {
            value += "u";
          }
          break;
        }
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

  const trimmed = value.trim();
  if (trimmed.startsWith("{") && /"result"\s*:\s*"/.test(trimmed)) {
    const nested = extractPartialResult(trimmed);
    if (nested) return nested;
  }

  return value;
}
