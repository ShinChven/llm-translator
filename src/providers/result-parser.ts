import type { GeneratedResult } from "../shared/types";

const RESULT_SCHEMA = {
  type: "object",
  properties: {
    result: {
      type: "string",
      description:
        "The complete finished text. It may contain readable prose, bullet points, Markdown, or LaTeX when requested, but it must not contain serialized JSON, XML, YAML, or another data wrapper.",
    },
    swapText: {
      type: "string",
      description:
        "Text used internally when swapping languages. For ordinary transformations, it must exactly equal result.",
    },
  },
  required: ["result", "swapText"],
  additionalProperties: false,
} as const;

export { RESULT_SCHEMA };

function humanizeJsonKey(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return words ? `${words[0].toUpperCase()}${words.slice(1)}` : "";
}

function indentContinuation(value: string): string {
  return value.replace(/\n/g, "\n  ");
}

function formatStructuredValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map(formatStructuredValue)
      .filter(Boolean)
      .map((item) => `- ${indentContinuation(item)}`)
      .join("\n");
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>)
      .flatMap(([key, entryValue]) => {
        const content = formatStructuredValue(entryValue);
        if (!content) return [];
        const heading = humanizeJsonKey(key);
        return heading ? `${heading}\n${content}` : content;
      })
      .join("\n\n");
  }
  return "";
}

function formatNestedJson(value: string): string | undefined {
  const trimmed = value.trim();
  if (
    (!trimmed.startsWith("{") || !trimmed.endsWith("}")) &&
    (!trimmed.startsWith("[") || !trimmed.endsWith("]"))
  ) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (
      (typeof parsed !== "object" || parsed === null) &&
      !Array.isArray(parsed)
    ) {
      return undefined;
    }
    return formatStructuredValue(parsed) || undefined;
  } catch {
    return undefined;
  }
}

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
  const formattedNestedResult = formatNestedJson(result);
  if (formattedNestedResult) {
    result = formattedNestedResult;
    swapText = result;
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
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return formatNestedJson(trimmed) ?? "";
  }

  return value;
}
