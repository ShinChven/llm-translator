import {
  PROVIDER_DEFINITIONS,
  type ProviderDefinition,
} from "../shared/constants";
import type {
  GeneratedResult,
  GenerationRequest,
  ProviderId,
  ProviderSettings,
} from "../shared/types";
import {
  generateWithAnthropic,
  listAnthropicModels,
} from "./anthropic";
import { generateWithGemini, listGeminiModels } from "./gemini";
import {
  generateOpenAICompatible,
  listOpenAICompatibleModels,
  type OpenAICompatibleConfig,
} from "./openai-compatible";
import { generateWithOpenAI, listOpenAIModels } from "./openai";

interface ProviderAdapter {
  definition: ProviderDefinition;
  listModels: (settings: ProviderSettings) => Promise<string[]>;
  generate: (
    settings: ProviderSettings,
    request: GenerationRequest,
    signal: AbortSignal,
    onResult: (result: string) => void,
  ) => Promise<GeneratedResult>;
}

const GROK_CONFIG: OpenAICompatibleConfig = {
  baseUrl: PROVIDER_DEFINITIONS.grok.endpoint!,
  modelsPath: "language-models",
  structuredOutput: "json-schema",
};

const OPENROUTER_CONFIG: OpenAICompatibleConfig = {
  baseUrl: PROVIDER_DEFINITIONS.openrouter.endpoint!,
  modelsQuery: { supported_parameters: "structured_outputs" },
  structuredOutput: "json-schema",
  extraHeaders: { "X-OpenRouter-Title": "LLM Translator" },
  extraBody: { provider: { require_parameters: true } },
};

function liteLlmConfig(settings: ProviderSettings): OpenAICompatibleConfig {
  return {
    baseUrl: settings.baseUrl,
    structuredOutput: "prompt",
  };
}

const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
  openai: {
    definition: PROVIDER_DEFINITIONS.openai,
    listModels: (settings) => listOpenAIModels(settings.apiKey.trim()),
    generate: (settings, request, signal, onResult) =>
      generateWithOpenAI(
        settings.apiKey.trim(),
        request,
        signal,
        onResult,
      ),
  },
  gemini: {
    definition: PROVIDER_DEFINITIONS.gemini,
    listModels: (settings) => listGeminiModels(settings.apiKey.trim()),
    generate: (settings, request, signal, onResult) =>
      generateWithGemini(
        settings.apiKey.trim(),
        request,
        signal,
        onResult,
      ),
  },
  claude: {
    definition: PROVIDER_DEFINITIONS.claude,
    listModels: listAnthropicModels,
    generate: generateWithAnthropic,
  },
  grok: {
    definition: PROVIDER_DEFINITIONS.grok,
    listModels: (settings) =>
      listOpenAICompatibleModels(settings, GROK_CONFIG),
    generate: (settings, request, signal, onResult) =>
      generateOpenAICompatible(
        settings,
        request,
        GROK_CONFIG,
        signal,
        onResult,
      ),
  },
  openrouter: {
    definition: PROVIDER_DEFINITIONS.openrouter,
    listModels: (settings) =>
      listOpenAICompatibleModels(settings, OPENROUTER_CONFIG),
    generate: (settings, request, signal, onResult) =>
      generateOpenAICompatible(
        settings,
        request,
        OPENROUTER_CONFIG,
        signal,
        onResult,
      ),
  },
  litellm: {
    definition: PROVIDER_DEFINITIONS.litellm,
    listModels: (settings) =>
      listOpenAICompatibleModels(settings, liteLlmConfig(settings)),
    generate: (settings, request, signal, onResult) =>
      generateOpenAICompatible(
        settings,
        request,
        liteLlmConfig(settings),
        signal,
        onResult,
      ),
  },
};

function validateConnection(
  provider: ProviderId,
  settings: ProviderSettings,
  requireModel: boolean,
): void {
  const definition = ADAPTERS[provider].definition;
  if (definition.apiKeyRequired && !settings.apiKey.trim()) {
    throw new Error(`Add a ${definition.label} API key in Settings.`);
  }
  if (definition.configurableBaseUrl && !settings.baseUrl.trim()) {
    throw new Error("Add a LiteLLM Base URL in Settings.");
  }
  if (requireModel && !settings.model.trim()) {
    throw new Error(`Choose a ${definition.label} model.`);
  }
}

export async function listProviderModels(
  provider: ProviderId,
  settings: ProviderSettings,
): Promise<string[]> {
  validateConnection(provider, settings, false);
  return ADAPTERS[provider].listModels(settings);
}

export async function generateWithProvider(
  provider: ProviderId,
  settings: ProviderSettings,
  request: GenerationRequest,
  signal: AbortSignal,
  onResult: (result: string) => void,
): Promise<GeneratedResult> {
  validateConnection(provider, settings, true);
  return ADAPTERS[provider].generate(
    settings,
    request,
    signal,
    onResult,
  );
}
