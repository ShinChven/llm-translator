import type { GeneratedResult, GenerationRequest } from "../shared/types";
import { buildPrompts } from "./prompts";
import {
  extractPartialResult,
  parseFinalResult,
  RESULT_SCHEMA,
} from "./result-parser";
import { providerError, readSse } from "./sse";

const OPENAI_BASE_URL = "https://api.openai.com/v1";

export async function listOpenAIModels(apiKey: string): Promise<string[]> {
  const response = await fetch(`${OPENAI_BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw await providerError(response);

  const body = (await response.json()) as { data?: Array<{ id?: string }> };
  return (body.data ?? [])
    .map((model) => model.id)
    .filter((id): id is string => Boolean(id))
    .filter((id) => /^(gpt|o\d)/.test(id))
    .sort((a, b) => a.localeCompare(b));
}

export async function generateWithOpenAI(
  apiKey: string,
  request: GenerationRequest,
  signal: AbortSignal,
  onResult: (result: string) => void,
): Promise<GeneratedResult> {
  const prompts = buildPrompts(request);
  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: request.model,
      instructions: prompts.system,
      input: prompts.user,
      stream: true,
      text: {
        format: {
          type: "json_schema",
          name: "translation_result",
          strict: true,
          schema: RESULT_SCHEMA,
        },
      },
    }),
    signal,
  });

  if (!response.ok) throw await providerError(response);

  let raw = "";
  let providerFailure = "";
  await readSse(response, (data) => {
    if (data === "[DONE]") return;
    const event = JSON.parse(data) as {
      type?: string;
      delta?: string;
      error?: { message?: string };
    };
    if (event.type === "response.output_text.delta" && event.delta) {
      raw += event.delta;
      onResult(extractPartialResult(raw));
    }
    if (event.type === "error") {
      providerFailure = event.error?.message ?? "OpenAI generation failed.";
    }
  });

  if (providerFailure) throw new Error(providerFailure);
  const generatedResult = parseFinalResult(raw);
  onResult(generatedResult.result);
  return generatedResult;
}
