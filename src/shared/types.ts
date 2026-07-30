export type ProviderId =
  | "openai"
  | "gemini"
  | "claude"
  | "grok"
  | "openrouter"
  | "litellm";

export type SpeechProviderId = "webspeech" | "gemini" | "openai";

export type BuiltInActionId =
  | "translate"
  | "refine"
  | "summarize"
  | "what"
  | "how"
  | "why";

export type ActionId = BuiltInActionId | `custom:${string}`;

export interface ProviderSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  discoveredModels: string[];
}

export type ThemePreference = "system" | "light" | "dark";

export type SummaryLength = "short" | "medium" | "long";

export type ActionOutputFormat = "text" | "markdown" | "latex";

export interface CustomAction {
  id: string;
  name: string;
  icon: string;
  rolePrompt: string;
  commandPrompt: string;
  outputFormat: ActionOutputFormat;
  provider?: ProviderId;
  model?: string;
}

export interface SpeechProviderSettings {
  voice: string;
}

export interface SpeechSettings {
  autoPlayResult: boolean;
  provider: SpeechProviderId;
  providers: Record<SpeechProviderId, SpeechProviderSettings>;
}

export interface AppSettings {
  provider: ProviderId;
  theme: ThemePreference;
  sourceLanguage: string;
  targetLanguage: string;
  defaultTargetLanguage: string;
  summaryLength: SummaryLength;
  summaryInstruction: string;
  providers: Record<ProviderId, ProviderSettings>;
  customActions: CustomAction[];
  speech: SpeechSettings;
}

export interface PendingTask {
  id: string;
  source: string;
  createdAt: number;
  autoRun: boolean;
  actionId: ActionId;
  pageUrl?: string;
  pageTitle?: string;
}

export interface GenerationRequest {
  requestId: string;
  provider: ProviderId;
  model: string;
  actionId: ActionId;
  customRolePrompt?: string;
  customCommandPrompt?: string;
  customOutputFormat?: ActionOutputFormat;
  sourceLanguage: string;
  /**
   * True when sourceLanguage came from the local heuristic rather than an
   * explicit choice, so the prompt can let the model decide for itself.
   */
  sourceLanguageAutoDetected?: boolean;
  targetLanguage: string;
  summaryLength?: SummaryLength;
  summaryInstruction?: string;
  source: string;
  currentResult?: string;
  revisionInstruction?: string;
}

export interface GeneratedResult {
  result: string;
  swapText: string;
}

export type GenerationPortMessage =
  | { type: "generate"; request: GenerationRequest }
  | { type: "cancel"; requestId: string };

export type GenerationPortEvent =
  | { type: "started"; requestId: string }
  | { type: "delta"; requestId: string; result: string }
  | {
      type: "complete";
      requestId: string;
      result: string;
      swapText: string;
    }
  | { type: "error"; requestId: string; message: string };

export type RuntimeRequest =
  | {
      type: "list-models";
      provider: ProviderId;
    }
  | {
      type: "read-page-content";
    };

export type ProcessTaskMessage = {
  type: "process-task";
  task: PendingTask;
};

export type ModelListResponse =
  | { ok: true; models: string[] }
  | { ok: false; error: string };

export type PageContentErrorCode =
  | "page-access-required"
  | "unsupported-page"
  | "no-readable-content"
  | "read-failed";

export type PageContentResponse =
  | { ok: true; content: string; title: string }
  | { ok: false; code: PageContentErrorCode; error: string };
