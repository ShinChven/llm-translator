import type { GeneratedResult, GenerationRequest } from "../shared/types";
import { buildPrompts } from "./prompts";
import {
  extractPartialResult,
  parseFinalResult,
  RESULT_SCHEMA,
} from "./result-parser";
import { providerError, readSse } from "./sse";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export async function listGeminiModels(apiKey: string): Promise<string[]> {
  const response = await fetch(`${GEMINI_BASE_URL}/models`, {
    headers: { "x-goog-api-key": apiKey },
  });
  if (!response.ok) throw await providerError(response);

  const body = (await response.json()) as {
    models?: Array<{
      name?: string;
      supportedGenerationMethods?: string[];
    }>;
  };

  return (body.models ?? [])
    .filter((model) =>
      model.supportedGenerationMethods?.includes("generateContent"),
    )
    .map((model) => model.name?.replace(/^models\//, ""))
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b));
}

export async function generateWithGemini(
  apiKey: string,
  request: GenerationRequest,
  signal: AbortSignal,
  onResult: (result: string) => void,
): Promise<GeneratedResult> {
  const prompts = buildPrompts(request);
  const model = encodeURIComponent(request.model.replace(/^models\//, ""));
  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${model}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompts.system }] },
        contents: [{ role: "user", parts: [{ text: prompts.user }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: RESULT_SCHEMA,
          temperature: 0,
        },
      }),
      signal,
    },
  );

  if (!response.ok) throw await providerError(response);

  let raw = "";
  await readSse(response, (data) => {
    const chunk = JSON.parse(data) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      error?: { message?: string };
    };
    if (chunk.error?.message) throw new Error(chunk.error.message);
    for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
      if (part.text) raw += part.text;
    }
    onResult(extractPartialResult(raw));
  });

  const generatedResult = parseFinalResult(raw);
  onResult(generatedResult.result);
  return generatedResult;
}
