import type {
  GeneratedResult,
  GenerationRequest,
  ProviderSettings,
} from "../shared/types";
import { normalizeProviderBaseUrl } from "../shared/provider-url";
import { buildPrompts } from "./prompts";
import {
  extractPartialResult,
  parseFinalResult,
  RESULT_SCHEMA,
} from "./result-parser";
import { providerError, readSse } from "./sse";

export interface OpenAICompatibleConfig {
  baseUrl: string;
  modelsPath?: string;
  modelsQuery?: Record<string, string>;
  structuredOutput: "json-schema" | "prompt";
  extraHeaders?: Record<string, string>;
  extraBody?: Record<string, unknown>;
}

function headers(
  settings: ProviderSettings,
  extraHeaders?: Record<string, string>,
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(settings.apiKey.trim()
      ? { Authorization: `Bearer ${settings.apiKey.trim()}` }
      : {}),
    ...extraHeaders,
  };
}

function endpoint(baseUrl: string, path: string): string {
  return `${normalizeProviderBaseUrl(baseUrl)}/${path.replace(/^\/+/u, "")}`;
}

export async function listOpenAICompatibleModels(
  settings: ProviderSettings,
  config: OpenAICompatibleConfig,
): Promise<string[]> {
  const url = new URL(
    endpoint(config.baseUrl, config.modelsPath ?? "models"),
  );
  for (const [name, value] of Object.entries(config.modelsQuery ?? {})) {
    url.searchParams.set(name, value);
  }

  const response = await fetch(url, {
    headers: headers(settings, config.extraHeaders),
  });
  if (!response.ok) throw await providerError(response);

  const body = (await response.json()) as {
    data?: Array<{ id?: string; aliases?: string[] }>;
    models?: Array<{ id?: string; aliases?: string[] }>;
  };
  const models = body.data ?? body.models ?? [];
  return Array.from(
    new Set(
      models
        .flatMap((model) => [model.id, ...(model.aliases ?? [])])
        .map((id) => id?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

export async function generateOpenAICompatible(
  settings: ProviderSettings,
  request: GenerationRequest,
  config: OpenAICompatibleConfig,
  signal: AbortSignal,
  onResult: (result: string) => void,
): Promise<GeneratedResult> {
  const prompts = buildPrompts(request);
  const responseFormat =
    config.structuredOutput === "json-schema"
      ? {
          type: "json_schema",
          json_schema: {
            name: "translation_result",
            strict: true,
            schema: RESULT_SCHEMA,
          },
        }
      : undefined;

  const response = await fetch(endpoint(config.baseUrl, "chat/completions"), {
    method: "POST",
    headers: headers(settings, config.extraHeaders),
    body: JSON.stringify({
      model: request.model,
      messages: [
        { role: "system", content: prompts.system },
        { role: "user", content: prompts.user },
      ],
      stream: true,
      temperature: 0,
      max_tokens: 8192,
      ...(responseFormat ? { response_format: responseFormat } : {}),
      ...config.extraBody,
    }),
    signal,
  });

  if (!response.ok) throw await providerError(response);

  let raw = "";
  let providerFailure = "";
  await readSse(response, (data) => {
    if (data === "[DONE]") return;
    const chunk = JSON.parse(data) as {
      choices?: Array<{
        delta?: {
          content?:
            | string
            | Array<{ type?: string; text?: string }>;
        };
      }>;
      error?: { message?: string };
    };
    if (chunk.error?.message) {
      providerFailure = chunk.error.message;
      return;
    }

    const content = chunk.choices?.[0]?.delta?.content;
    if (typeof content === "string") {
      raw += content;
    } else if (Array.isArray(content)) {
      raw += content.map((part) => part.text ?? "").join("");
    }
    onResult(extractPartialResult(raw));
  });

  if (providerFailure) throw new Error(providerFailure);
  const generatedResult = parseFinalResult(raw);
  onResult(generatedResult.result);
  return generatedResult;
}
