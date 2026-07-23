# LLM Translator Provider Architecture

> Version: 1.0
> Scope: Text-generation providers

## 1. Design Goals

The provider layer must:

- Keep provider-specific HTTP details out of the side-panel UI and background
  task flow.
- Preserve one generation contract for initial actions and result revisions.
- Support model discovery without arbitrary model-ID entry.
- Stream only the `result` field into the single Result pane.
- Validate the final `{ result, swapText }` object before completing a task.
- Keep hosted-provider endpoints fixed.
- Grant access to a self-hosted LiteLLM endpoint only after explicit runtime
  authorization.
- Allow a new provider to be added without adding another conditional branch to
  the background service worker.

## 2. Layers

### 2.1 Shared provider definitions

`src/shared/constants.ts` owns:

- Stable provider IDs.
- Display labels.
- Default model IDs.
- API-key requirements and placeholders.
- Fixed official endpoints.
- Whether a provider exposes a configurable Base URL.

The UI and storage layer use this metadata and do not duplicate provider lists.

### 2.2 Provider registry

`src/providers/registry.ts` maps every provider ID to one adapter with two
operations:

```ts
listModels(settings): Promise<string[]>
generate(settings, request, signal, onResult): Promise<GeneratedResult>
```

The background service worker calls only `listProviderModels` and
`generateWithProvider`. It does not select provider implementations itself.

### 2.3 Protocol adapters

| Provider | Protocol adapter | Generation endpoint |
| --- | --- | --- |
| OpenAI | OpenAI Responses | `/responses` |
| Gemini | Gemini GenerateContent | `/models/{model}:streamGenerateContent` |
| Claude | Anthropic Messages | `/messages` |
| Grok | OpenAI-compatible Chat Completions | `/chat/completions` |
| OpenRouter | OpenAI-compatible Chat Completions | `/chat/completions` |
| LiteLLM | OpenAI-compatible Chat Completions | `/chat/completions` |

Grok, OpenRouter, and LiteLLM share the OpenAI-compatible transport
implementation while retaining separate registry configuration.

## 3. Unified Generation Contract

Every adapter receives the same `GenerationRequest` and prompt pair. Every
adapter returns:

```json
{
  "result": "complete visible output",
  "swapText": "text used by source/target exchange"
}
```

Rules:

- `result` is the only text rendered to the Result pane.
- `swapText` equals `result` for normal transformations.
- Word mode returns one primary lexical translation in `swapText`.
- Streaming parsers extract only the partial `result` value.
- Completion is accepted only after local JSON parsing and shape validation.
- Provider wrappers, Markdown code fences, or leading text are removed only as
  a compatibility fallback; the visible value is never taken from unvalidated
  output.

## 4. Structured Output Strategy

| Provider | Enforcement |
| --- | --- |
| OpenAI | Native JSON Schema through Responses |
| Gemini | Native JSON Schema through `responseJsonSchema` |
| Claude | Native JSON Schema through `output_config.format` |
| Grok | Native JSON Schema through `response_format` |
| OpenRouter | Native JSON Schema; discovery filters compatible models and routing requires supported parameters |
| LiteLLM | Deterministic prompt plus local validation |

LiteLLM can route to models with different capabilities. The extension therefore
does not assume that every LiteLLM deployment supports a specific structured
output parameter. A LiteLLM administrator can expose only models that reliably
follow the common output contract.

## 5. Model Discovery

Model discovery is provider-owned:

- OpenAI filters the account model list to text-generation model families.
- Gemini retains models supporting `generateContent`.
- Claude reads the paginated Models API.
- Grok reads the language-model list and exposes both canonical IDs and
  provider aliases.
- OpenRouter requests text models supporting structured outputs.
- LiteLLM reads the configured proxy's OpenAI-compatible Models endpoint.

The provider default remains selectable before discovery, except LiteLLM,
which has no universal default. LiteLLM must discover at least one configured
proxy model before it can generate.

Arbitrary model-ID entry is not supported.

## 6. Settings and Migration

Settings store one uniform record per provider:

```ts
{
  apiKey: string;
  baseUrl: string;
  model: string;
  discoveredModels: string[];
}
```

`baseUrl` is used only for LiteLLM. It remains empty and ignored for hosted
providers.

Storage loading merges every known provider with defaults. Existing OpenAI and
Gemini credentials, selected models, discovered model caches, language
settings, and custom actions survive migration to the expanded provider set.
Unknown stored provider IDs are discarded safely.

## 7. Endpoint Security

Required host permissions contain only:

- `api.openai.com`
- `generativelanguage.googleapis.com`
- `api.anthropic.com`
- `api.x.ai`
- `openrouter.ai`

LiteLLM uses `optional_host_permissions`. The Settings page derives a Chrome
match pattern from the configured HTTP or HTTPS URL and requests access during
Save or model discovery. The background service worker verifies that this
permission exists before model discovery or generation.

URLs containing embedded usernames or passwords are rejected. API keys belong
in the API-key field.

## 8. Adding Another Provider

Adding a provider requires:

1. Add its ID, defaults, and metadata to the shared provider definitions.
2. Add its default storage record.
3. Implement or configure an adapter.
4. Register the adapter.
5. Add only the minimum required host permission.
6. Document its endpoint, authentication, discovery behavior, and structured
   output level.
7. Verify model discovery, streaming, cancellation, word-mode exchange,
   revision replacement, storage migration, and production build.

No background routing branch or duplicated UI option should be added.
