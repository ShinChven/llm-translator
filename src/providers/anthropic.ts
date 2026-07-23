import type {
  GeneratedResult,
  GenerationRequest,
  ProviderSettings,
} from "../shared/types";
import { buildPrompts } from "./prompts";
import {
  extractPartialResult,
  parseFinalResult,
  RESULT_SCHEMA,
} from "./result-parser";
import { providerError, readSse } from "./sse";

const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";

function headers(apiKey: string): Record<string, string> {
  return {
    "x-api-key": apiKey,
    "anthropic-version": ANTHROPIC_VERSION,
    "Content-Type": "application/json",
  };
}

export async function listAnthropicModels(
  settings: ProviderSettings,
): Promise<string[]> {
  const models: string[] = [];
  let afterId: string | undefined;

  for (let page = 0; page < 10; page += 1) {
    const url = new URL(`${ANTHROPIC_BASE_URL}/models`);
    url.searchParams.set("limit", "100");
    if (afterId) url.searchParams.set("after_id", afterId);

    const response = await fetch(url, {
      headers: headers(settings.apiKey.trim()),
    });
    if (!response.ok) throw await providerError(response);

    const body = (await response.json()) as {
      data?: Array<{ id?: string }>;
      has_more?: boolean;
      last_id?: string;
    };
    models.push(
      ...(body.data ?? [])
        .map((model) => model.id?.trim())
        .filter((id): id is string => Boolean(id)),
    );

    if (!body.has_more || !body.last_id) break;
    afterId = body.last_id;
  }

  return Array.from(new Set(models)).sort((left, right) =>
    left.localeCompare(right),
  );
}

export async function generateWithAnthropic(
  settings: ProviderSettings,
  request: GenerationRequest,
  signal: AbortSignal,
  onResult: (result: string) => void,
): Promise<GeneratedResult> {
  const prompts = buildPrompts(request);
  const response = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
    method: "POST",
    headers: headers(settings.apiKey.trim()),
    body: JSON.stringify({
      model: request.model,
      max_tokens: 8192,
      temperature: 0,
      stream: true,
      system: prompts.system,
      messages: [{ role: "user", content: prompts.user }],
      output_config: {
        format: {
          type: "json_schema",
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
    const event = JSON.parse(data) as {
      type?: string;
      delta?: { type?: string; text?: string };
      error?: { message?: string };
    };

    if (
      event.type === "content_block_delta" &&
      event.delta?.type === "text_delta" &&
      event.delta.text
    ) {
      raw += event.delta.text;
      onResult(extractPartialResult(raw));
    }
    if (event.type === "error") {
      providerFailure =
        event.error?.message ?? "Claude generation failed.";
    }
  });

  if (providerFailure) throw new Error(providerFailure);
  const generatedResult = parseFinalResult(raw);
  onResult(generatedResult.result);
  return generatedResult;
}
