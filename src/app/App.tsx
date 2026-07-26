import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AUTHOR,
  BUILT_IN_ACTIONS,
  DEFAULT_MODELS,
  LANGUAGES,
  LICENSE,
  PROVIDER_DEFINITIONS,
  PROVIDER_IDS,
  REPOSITORY_URL,
  SPEECH_PROVIDER_DEFINITIONS,
  SPEECH_PROVIDER_IDS,
  STORAGE_KEYS,
  SUMMARY_LENGTH_OPTIONS,
  THEME_OPTIONS,
  extensionVersion,
  languageName,
  providerLabel,
  randomSpeechTestPhrase,
  speechProviderLabel,
} from "../shared/constants";
import { isSpeechProviderReady } from "../providers/speech";
import {
  GEMINI_VOICES,
  OPENAI_VOICES,
  VOICE_GENDER_LABELS,
  browserVoiceGender,
  groupVoicesByGender,
} from "../shared/voices";
import {
  detectLanguage,
  fallbackTargetLanguage,
} from "../shared/language-detection";
import { loadPendingTask, loadSettings, saveSettings } from "../shared/storage";
import { providerOriginPattern } from "../shared/provider-url";
import { isSingleWord } from "../shared/text-mode";
import type {
  ActionId,
  ActionOutputFormat,
  AppSettings,
  CustomAction,
  GenerationPortEvent,
  GenerationPortMessage,
  GenerationRequest,
  PendingTask,
  PageContentResponse,
  ProcessTaskMessage,
  ProviderId,
  RuntimeRequest,
  ModelListResponse,
} from "../shared/types";
import { Icon } from "./Icon";
import { ShareMenu } from "./ShareMenu";
import { SpeakButton } from "./SpeakButton";
import { useBrowserVoices, useSpeaker, type Speaker } from "./use-speech";
import { WordResult } from "./WordResult";

type View = "process" | "settings";

const PAGE_ACCESS_ORIGINS = ["http://*/*", "https://*/*"];

const ActionEmojiPicker = lazy(() =>
  import("./ActionEmojiPicker").then((module) => ({
    default: module.ActionEmojiPicker,
  })),
);

function makeId(): string {
  return crypto.randomUUID();
}

type EditableCustomAction = Omit<CustomAction, "id">;

function emptyCustomAction(): EditableCustomAction {
  return {
    name: "",
    icon: "✨",
    rolePrompt: "",
    commandPrompt: "",
    outputFormat: "text",
  };
}

export function App() {
  const [view, setView] = useState<View>("process");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [source, setSource] = useState("");
  const [result, setResult] = useState("");
  const [swapText, setSwapText] = useState("");
  const [actionId, setActionId] = useState<ActionId>("translate");
  const [revision, setRevision] = useState("");
  const [busy, setBusy] = useState(false);
  const [readingPage, setReadingPage] = useState(false);
  const [error, setError] = useState("");
  const [pageAccessRequired, setPageAccessRequired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoRunTaskId, setAutoRunTaskId] = useState<string>();
  const [pendingTaskInitializationId, setPendingTaskInitializationId] =
    useState<string>();
  const generationPort = useRef<chrome.runtime.Port | undefined>(undefined);
  const activeRequestId = useRef<string | undefined>(undefined);
  const handledTaskIds = useRef(new Set<string>());
  const speaker = useSpeaker(settings);
  const playSpeech = speaker.play;

  const theme = settings?.theme;
  useEffect(() => {
    if (!theme || theme === "system") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  useEffect(() => {
    const acceptTask = (task: PendingTask) => {
      if (handledTaskIds.current.has(task.id)) return;
      handledTaskIds.current.add(task.id);
      activeRequestId.current = undefined;
      generationPort.current?.disconnect();
      generationPort.current = undefined;
      setBusy(false);
      setSource(task.source);
      setActionId(task.actionId ?? "translate");
      setResult("");
      setSwapText("");
      setRevision("");
      setError("");
      setView("process");
      setPendingTaskInitializationId(task.id);
      setAutoRunTaskId(task.autoRun ? task.id : undefined);
      void chrome.storage.session.remove(STORAGE_KEYS.pendingTask);
    };

    void Promise.all([loadSettings(), loadPendingTask()]).then(
      ([storedSettings, pendingTask]) => {
        setSettings(storedSettings);
        if (pendingTask) acceptTask(pendingTask);
      },
    );

    const onStorageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== "session") return;
      const task = changes[STORAGE_KEYS.pendingTask]?.newValue as
        | PendingTask
        | undefined;
      if (task) acceptTask(task);
    };

    const onRuntimeMessage = (message: ProcessTaskMessage) => {
      if (message.type === "process-task") acceptTask(message.task);
    };

    chrome.storage.onChanged.addListener(onStorageChanged);
    chrome.runtime.onMessage.addListener(onRuntimeMessage);
    return () => {
      chrome.storage.onChanged.removeListener(onStorageChanged);
      chrome.runtime.onMessage.removeListener(onRuntimeMessage);
    };
  }, []);

  useEffect(
    () => () => {
      generationPort.current?.disconnect();
    },
    [],
  );

  useEffect(() => {
    if (!pendingTaskInitializationId || !settings) return;

    if (
      settings.sourceLanguage !== "auto" ||
      settings.targetLanguage !== settings.defaultTargetLanguage
    ) {
      const nextSettings = {
        ...settings,
        sourceLanguage: "auto",
        targetLanguage: settings.defaultTargetLanguage,
      };
      setSettings(nextSettings);
      void saveSettings(nextSettings);
    }
    setPendingTaskInitializationId(undefined);
  }, [pendingTaskInitializationId, settings]);

  const selectedCustomAction = settings?.customActions.find(
    (action) => `custom:${action.id}` === actionId,
  );
  const activeProvider =
    selectedCustomAction?.provider ?? settings?.provider ?? "openai";
  const activeModel =
    selectedCustomAction?.model ??
    settings?.providers[activeProvider].model ??
    DEFAULT_MODELS[activeProvider];
  const activeProviderDefinition = PROVIDER_DEFINITIONS[activeProvider];
  const activeProviderSettings = settings?.providers[activeProvider];
  const activeProviderConfigured = Boolean(
    activeProviderSettings &&
      (!activeProviderDefinition.apiKeyRequired ||
        activeProviderSettings.apiKey.trim()) &&
      (!activeProviderDefinition.configurableBaseUrl ||
        activeProviderSettings.baseUrl.trim()) &&
      activeModel.trim(),
  );

  const detectedSourceLanguage = useMemo(() => {
    if (settings?.sourceLanguage !== "auto" || !source.trim()) return undefined;
    return detectLanguage(source);
  }, [settings?.sourceLanguage, source]);

  const effectiveSourceLanguage =
    settings?.sourceLanguage === "auto"
      ? detectedSourceLanguage
      : settings?.sourceLanguage;

  const effectiveTargetLanguage =
    actionId === "translate" &&
    effectiveSourceLanguage &&
    settings?.targetLanguage === effectiveSourceLanguage
      ? fallbackTargetLanguage(effectiveSourceLanguage)
      : settings?.targetLanguage;

  const wordMode = Boolean(
    actionId === "translate" &&
      effectiveSourceLanguage &&
      isSingleWord(source, effectiveSourceLanguage),
  );

  useEffect(() => {
    if (
      !settings ||
      actionId !== "translate" ||
      !effectiveSourceLanguage ||
      !effectiveTargetLanguage ||
      settings.targetLanguage === effectiveTargetLanguage
    ) {
      return;
    }

    const nextSettings = {
      ...settings,
      targetLanguage: effectiveTargetLanguage,
    };
    setSettings(nextSettings);
    void saveSettings(nextSettings);
  }, [
    actionId,
    effectiveSourceLanguage,
    effectiveTargetLanguage,
    settings,
  ]);

  const canGenerate = Boolean(
    settings &&
      source.trim() &&
      effectiveSourceLanguage &&
      effectiveTargetLanguage &&
      activeProviderConfigured,
  );

  const runGeneration = useCallback(
    (revisionInstruction?: string) => {
      if (!settings || !source.trim()) return;

      generationPort.current?.disconnect();
      const port = chrome.runtime.connect({ name: "generation" });
      generationPort.current = port;
      const requestId = makeId();
      activeRequestId.current = requestId;
      setBusy(true);
      setError("");
      if (!revisionInstruction) {
        setResult("");
        setSwapText("");
      }

      const request: GenerationRequest = {
        requestId,
        provider: activeProvider,
        model: activeModel.trim(),
        actionId,
        customRolePrompt: selectedCustomAction?.rolePrompt,
        customCommandPrompt: selectedCustomAction?.commandPrompt,
        customOutputFormat: selectedCustomAction?.outputFormat,
        sourceLanguage: effectiveSourceLanguage ?? settings.sourceLanguage,
        targetLanguage: effectiveTargetLanguage ?? settings.targetLanguage,
        summaryLength:
          actionId === "summarize" ? settings.summaryLength : undefined,
        summaryInstruction:
          actionId === "summarize"
            ? settings.summaryInstruction.trim()
            : undefined,
        source: source.trim(),
        currentResult: revisionInstruction ? result : undefined,
        revisionInstruction,
      };

      port.onMessage.addListener((event: GenerationPortEvent) => {
        if (event.requestId !== activeRequestId.current) return;
        if (event.type === "delta" || event.type === "complete") {
          setResult(event.result);
        }
        if (event.type === "complete") {
          setSwapText(event.swapText);
          setBusy(false);
          setRevision("");
          if (settings.speech.autoPlayResult) {
            playSpeech(
              "result",
              event.result,
              actionId === "polish"
                ? effectiveSourceLanguage
                : effectiveTargetLanguage,
            );
          }
          port.disconnect();
        }
        if (event.type === "error") {
          setBusy(false);
          setError(event.message);
          port.disconnect();
        }
      });

      const message: GenerationPortMessage = { type: "generate", request };
      port.postMessage(message);
    },
    [
      actionId,
      activeModel,
      activeProvider,
      effectiveSourceLanguage,
      effectiveTargetLanguage,
      activeProviderDefinition,
      activeProviderSettings,
      result,
      selectedCustomAction,
      settings,
      playSpeech,
      source,
    ],
  );

  useEffect(() => {
    if (
      !autoRunTaskId ||
      pendingTaskInitializationId ||
      view !== "process" ||
      !canGenerate
    ) {
      return;
    }

    setAutoRunTaskId(undefined);
    runGeneration();
  }, [
    autoRunTaskId,
    canGenerate,
    pendingTaskInitializationId,
    runGeneration,
    view,
  ]);

  const stopGeneration = () => {
    const requestId = activeRequestId.current;
    if (requestId && generationPort.current) {
      const message: GenerationPortMessage = { type: "cancel", requestId };
      generationPort.current.postMessage(message);
      generationPort.current.disconnect();
    }
    setBusy(false);
  };

  const updateSettings = (next: AppSettings) => {
    setSettings(next);
    void saveSettings(next);
  };

  const updateProcessSettings = (next: AppSettings) => {
    updateSettings(next);
    if (source.trim()) {
      setAutoRunTaskId(makeId());
    }
  };

  const copyResult = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const executeAction = (nextActionId: ActionId) => {
    setActionId(nextActionId);
    if (source.trim()) {
      setAutoRunTaskId(makeId());
    }
  };

  const readAndSummarizeCurrentPage = async () => {
    const request: RuntimeRequest = { type: "read-page-content" };
    const response = (await chrome.runtime.sendMessage(
      request,
    )) as PageContentResponse | undefined;
    if (!response) {
      throw new Error(
        "No response from the background service worker. Reload the extension in chrome://extensions.",
      );
    }
    if (!response.ok) {
      setPageAccessRequired(response.code === "page-access-required");
      throw new Error(response.error);
    }

    setPageAccessRequired(false);
    setSource(response.content);
    setActionId("summarize");
    setResult("");
    setSwapText("");
    setRevision("");
    setAutoRunTaskId(makeId());
    setView("process");
  };

  const summarizeCurrentPage = () => {
    setReadingPage(true);
    setPageAccessRequired(false);
    setError("");
    void readAndSummarizeCurrentPage()
      .catch((error) =>
        setError(
          error instanceof Error ? error.message : "Could not read this page.",
        ),
      )
      .finally(() => setReadingPage(false));
  };

  const grantPageAccessAndRetry = () => {
    let authorization: Promise<boolean>;
    try {
      // Start the permission request synchronously inside this click gesture.
      authorization = chrome.permissions.request({
        origins: PAGE_ACCESS_ORIGINS,
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not request page access.",
      );
      return;
    }

    setReadingPage(true);
    setError("");
    void authorization
      .then((granted) => {
        if (!granted) {
          throw new Error(
            "Page access was not granted. Reopen the extension on this page to use temporary access.",
          );
        }
        return readAndSummarizeCurrentPage();
      })
      .catch((error) =>
        setError(
          error instanceof Error ? error.message : "Could not read this page.",
        ),
      )
      .finally(() => setReadingPage(false));
  };

  if (!settings) {
    return (
      <div className="loading-screen" aria-label="Loading">
        <div className="circular-progress" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="top-app-bar">
        {view === "settings" ? (
          <button
            className="icon-button"
            aria-label="Back to translator"
            onClick={() => setView("process")}
          >
            <Icon name="arrow-back" />
          </button>
        ) : (
          <div className="brand-mark" aria-hidden="true">
            <Icon name="translate" />
          </div>
        )}
        <h1>
          {view === "settings" ? (
            "Settings"
          ) : (
            <a
              className="repository-link"
              href={REPOSITORY_URL}
              rel="noreferrer"
              target="_blank"
              title="Open the project on GitHub"
            >
              LLM Translator
            </a>
          )}
        </h1>
        {view === "process" && (
          <div className="header-actions">
            <button
              className="icon-button"
              aria-label={
                readingPage
                  ? "Reading current page"
                  : "Summarize current page"
              }
              title={`Summarize current page · ${settings.summaryLength} · ${languageName(settings.targetLanguage)}`}
              disabled={busy || readingPage || !activeProviderConfigured}
              onClick={summarizeCurrentPage}
            >
              <Icon name="article" />
            </button>
            <button
              className="icon-button"
              aria-label="Open settings"
              onClick={() => setView("settings")}
            >
              <Icon name="settings" />
            </button>
          </div>
        )}
      </header>

      {view === "process" ? (
        <ProcessView
          actionId={actionId}
          activeModel={activeModel}
          activeProvider={activeProvider}
          busy={busy}
          canGenerate={canGenerate}
          copied={copied}
          error={error}
          pageAccessRequired={pageAccessRequired}
          onActionChange={executeAction}
          onCopy={copyResult}
          onDismissError={() => {
            setError("");
            setPageAccessRequired(false);
          }}
          onGrantPageAccess={grantPageAccessAndRetry}
          onGenerate={() => runGeneration()}
          onOpenSettings={() => setView("settings")}
          onRevisionChange={setRevision}
          onRevise={() => {
            const instruction = revision.trim();
            if (instruction && result) runGeneration(instruction);
          }}
          onSettingsChange={updateProcessSettings}
          onSourceChange={(value) => {
            setSource(value);
            setResult("");
            setSwapText("");
          }}
          onStop={stopGeneration}
          result={result}
          swapText={swapText}
          revision={revision}
          detectedSourceLanguage={detectedSourceLanguage}
          wordMode={wordMode}
          settings={settings}
          modelLocked={Boolean(selectedCustomAction?.model)}
          providerLocked={Boolean(selectedCustomAction?.provider)}
          source={source}
          speaker={speaker}
        />
      ) : (
        <SettingsView
          settings={settings}
          speaker={speaker}
          onSettingsChange={setSettings}
          onSave={async () => {
            await saveSettings(settings);
            setView("process");
          }}
        />
      )}
    </div>
  );
}

interface ProcessViewProps {
  actionId: ActionId;
  activeModel: string;
  activeProvider: ProviderId;
  busy: boolean;
  canGenerate: boolean;
  copied: boolean;
  error: string;
  pageAccessRequired: boolean;
  result: string;
  swapText: string;
  revision: string;
  detectedSourceLanguage?: string;
  wordMode: boolean;
  modelLocked: boolean;
  providerLocked: boolean;
  settings: AppSettings;
  source: string;
  speaker: Speaker;
  onActionChange: (action: ActionId) => void;
  onCopy: () => void;
  onDismissError: () => void;
  onGenerate: () => void;
  onGrantPageAccess: () => void;
  onOpenSettings: () => void;
  onRevisionChange: (value: string) => void;
  onRevise: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  onSourceChange: (value: string) => void;
  onStop: () => void;
}

function ProcessView({
  actionId,
  activeModel,
  activeProvider,
  busy,
  canGenerate,
  copied,
  error,
  pageAccessRequired,
  result,
  swapText,
  revision,
  detectedSourceLanguage,
  wordMode,
  modelLocked,
  providerLocked,
  settings,
  source,
  speaker,
  onActionChange,
  onCopy,
  onDismissError,
  onGenerate,
  onGrantPageAccess,
  onOpenSettings,
  onRevisionChange,
  onRevise,
  onSettingsChange,
  onSourceChange,
  onStop,
}: ProcessViewProps) {
  const provider = settings.providers[activeProvider];
  const providerDefinition = PROVIDER_DEFINITIONS[activeProvider];
  const configured = Boolean(
    (!providerDefinition.apiKeyRequired || provider.apiKey.trim()) &&
      (!providerDefinition.configurableBaseUrl || provider.baseUrl.trim()) &&
      activeModel.trim(),
  );
  const modelOptions = Array.from(
    new Set(
      [activeModel, ...provider.discoveredModels].filter(
        (model): model is string => Boolean(model.trim()),
      ),
    ),
  );
  const resolvedSourceLanguage =
    settings.sourceLanguage === "auto"
      ? detectedSourceLanguage
      : settings.sourceLanguage;
  const displayedTargetLanguage =
    actionId === "polish"
      ? resolvedSourceLanguage ?? settings.targetLanguage
      : settings.targetLanguage;

  const swapLanguages = () => {
    const reversedSource = (wordMode ? swapText : result).trim();
    if (!resolvedSourceLanguage || !reversedSource || busy) return;

    onSourceChange(reversedSource);
    onSettingsChange({
      ...settings,
      sourceLanguage: settings.targetLanguage,
      targetLanguage: resolvedSourceLanguage,
    });
  };

  return (
    <>
      <main className="process-content">
        {!configured && (
          <section className="setup-card" aria-label="Provider setup required">
            <div>
              <strong>Connect a model provider</strong>
              <p>
                {providerDefinition.configurableBaseUrl
                  ? "Add a LiteLLM endpoint and discover a model."
                  : "Add an API key to start with the default model."}
              </p>
            </div>
            <button className="text-button" onClick={onOpenSettings}>
              Set up
            </button>
          </section>
        )}

        <section aria-labelledby="action-heading">
          <div className="section-heading">
            <h2 id="action-heading">Action</h2>
            <span>
              {providerLabel(activeProvider)}
              {(providerLocked || modelLocked) && " · Action override"}
            </span>
          </div>
          <div className="chip-row">
            {BUILT_IN_ACTIONS.map((action) => (
              <button
                className={`filter-chip ${actionId === action.id ? "selected" : ""}`}
                key={action.id}
                onClick={() => onActionChange(action.id)}
              >
                {actionId === action.id && <Icon name="check" size={18} />}
                <span className="action-emoji" aria-hidden="true">
                  {action.icon}
                </span>
                {action.label}
              </button>
            ))}
            {settings.customActions.map((action) => {
              const id = `custom:${action.id}` as const;
              return (
                <button
                  className={`filter-chip ${actionId === id ? "selected" : ""}`}
                  key={action.id}
                  onClick={() => onActionChange(id)}
                >
                  {actionId === id && <Icon name="check" size={18} />}
                  {action.icon && (
                    <span className="action-emoji" aria-hidden="true">
                      {action.icon}
                    </span>
                  )}
                  {action.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="language-controls" aria-label="Languages">
          <label className="select-field">
            <span>From</span>
            <select
              value={settings.sourceLanguage}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  sourceLanguage: event.target.value,
                })
              }
            >
              {LANGUAGES.map(([value, label]) => (
                <option key={value} value={value}>
                  {value === "auto" && detectedSourceLanguage
                    ? `Detected: ${languageName(detectedSourceLanguage)}`
                    : label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="icon-button tonal"
            aria-label="Translate the result back to the source language"
            title="Translate the result back"
            disabled={
              busy ||
              actionId !== "translate" ||
              !(wordMode ? swapText.trim() : result.trim()) ||
              (settings.sourceLanguage === "auto" && !detectedSourceLanguage)
            }
            onClick={swapLanguages}
          >
            <Icon name="swap" />
          </button>
          <label className="select-field">
            <span>To</span>
            <select
              disabled={actionId === "polish"}
              value={displayedTargetLanguage}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  targetLanguage: event.target.value,
                })
              }
            >
              {LANGUAGES.filter(([value]) => value !== "auto").map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>
        </section>

        <section className="text-section" aria-labelledby="source-heading">
          <div className="section-heading">
            <h2 id="source-heading">Source</h2>
            <div className="heading-actions">
              <span>{source.length.toLocaleString()} characters</span>
              <SpeakButton
                id="source"
                label="the source text"
                language={resolvedSourceLanguage}
                speaker={speaker}
                text={source}
              />
            </div>
          </div>
          <textarea
            className="source-field"
            placeholder="Select text and use the context menu, or type here."
            value={source}
            onChange={(event) => onSourceChange(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.altKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                if (canGenerate && !busy) onGenerate();
              }
            }}
          />
          <div className="source-provider-controls">
            <label className="select-field">
              <span>Provider</span>
              <select
                disabled={providerLocked}
                value={activeProvider}
                onChange={(event) =>
                  onSettingsChange({
                    ...settings,
                    provider: event.target.value as ProviderId,
                  })
                }
              >
                {PROVIDER_IDS.map((providerId) => (
                  <option key={providerId} value={providerId}>
                    {providerLabel(providerId)}
                  </option>
                ))}
              </select>
            </label>
            <label className="select-field">
              <span>Model</span>
              <select
                disabled={modelLocked}
                value={activeModel}
                onChange={(event) =>
                  onSettingsChange({
                    ...settings,
                    providers: {
                      ...settings.providers,
                      [activeProvider]: {
                        ...provider,
                        model: event.target.value,
                      },
                    },
                  })
                }
              >
                <option value="" disabled>
                  {modelOptions.length > 0
                    ? "Select a model"
                    : "Configure models in Settings"}
                </option>
                {modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>
            {busy ? (
              <button className="filled-button danger" onClick={onStop}>
                <Icon name="stop" size={18} />
                Stop
              </button>
            ) : (
              <button
                className="filled-button"
                disabled={!canGenerate}
                onClick={onGenerate}
              >
                <Icon name="translate" size={18} />
                Run
              </button>
            )}
          </div>
        </section>

        <section className="text-section result-section" aria-labelledby="result-heading">
          <div className="section-heading">
            <h2 id="result-heading">
              Result
              {wordMode && <span className="mode-badge">Word mode</span>}
            </h2>
            {result && (
              <div className="result-actions">
                <SpeakButton
                  id="result"
                  label="the result"
                  language={displayedTargetLanguage}
                  speaker={speaker}
                  text={result}
                />
                <ShareMenu result={result} />
                <button
                  className="icon-button small"
                  aria-label="Copy result"
                  title="Copy result"
                  onClick={onCopy}
                >
                  <Icon name={copied ? "check" : "copy"} size={20} />
                </button>
              </div>
            )}
          </div>
          <div
            className={`result-surface ${result ? "has-result" : ""} ${busy ? "generating" : ""}`}
            aria-live="polite"
            aria-busy={busy}
          >
            {result ? (
              wordMode ? <WordResult result={result} /> : <pre>{result}</pre>
            ) : busy ? (
              <div className="result-placeholder">
                <div className="linear-progress" />
                <p>Generating result…</p>
              </div>
            ) : (
              <div className="result-placeholder">
                <Icon name="translate" size={32} />
                <p>Your transformed text will appear here.</p>
              </div>
            )}
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <div className="error-actions">
                {pageAccessRequired && (
                  <button
                    className="text-button compact"
                    onClick={onGrantPageAccess}
                  >
                    Grant access and retry
                  </button>
                )}
                <button
                  className="icon-button small"
                  aria-label="Dismiss error"
                  onClick={onDismissError}
                >
                  <Icon name="close" size={20} />
                </button>
              </div>
            </div>
          )}
          {speaker.error && (
            <div className="error-banner" role="alert">
              <span>{speaker.error}</span>
              <button
                className="icon-button small"
                aria-label="Dismiss speech error"
                onClick={speaker.dismissError}
              >
                <Icon name="close" size={20} />
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="revision-composer">
        <label htmlFor="revision-input">Refine this result</label>
        <div className="composer-row">
          <textarea
            id="revision-input"
            rows={1}
            placeholder="e.g. Make it shorter and more formal"
            disabled={!result || busy}
            value={revision}
            onChange={(event) => onRevisionChange(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.altKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                if (revision.trim() && result && !busy) onRevise();
              }
            }}
          />
          <button
            className="send-button"
            aria-label="Apply instruction"
            disabled={!revision.trim() || !result || busy}
            onClick={onRevise}
          >
            <Icon name="send" size={20} />
          </button>
        </div>
      </footer>
    </>
  );
}

interface SettingsViewProps {
  settings: AppSettings;
  speaker: Speaker;
  onSettingsChange: (settings: AppSettings) => void;
  onSave: () => void | Promise<void>;
}

function SettingsView({
  settings,
  speaker,
  onSettingsChange,
  onSave,
}: SettingsViewProps) {
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [draftAction, setDraftAction] =
    useState<EditableCustomAction>(emptyCustomAction);
  const provider = settings.provider;
  const providerSettings = settings.providers[provider];
  const providerDefinition = PROVIDER_DEFINITIONS[provider];
  const selectableModels = Array.from(
    new Set(
      [
        DEFAULT_MODELS[provider],
        ...providerSettings.discoveredModels,
      ].filter(Boolean),
    ),
  );

  const updateProvider = (
    providerId: ProviderId,
    patch: Partial<AppSettings["providers"][ProviderId]>,
  ) => {
    onSettingsChange({
      ...settings,
      providers: {
        ...settings.providers,
        [providerId]: {
          ...settings.providers[providerId],
          ...patch,
        },
      },
    });
  };

  const discoverModels = async () => {
    let authorization: Promise<boolean> = Promise.resolve(true);
    try {
      if (provider === "litellm") {
        authorization = chrome.permissions.request({
          origins: [providerOriginPattern(providerSettings.baseUrl)],
        });
      }
    } catch (error) {
      setModelError(
        error instanceof Error ? error.message : "Invalid LiteLLM Base URL.",
      );
      return;
    }

    setLoadingModels(true);
    setModelError("");
    try {
      if (!(await authorization)) {
        throw new Error("LiteLLM endpoint access was not granted.");
      }
      await saveSettings(settings);
      const request: RuntimeRequest = { type: "list-models", provider };
      const response = (await chrome.runtime.sendMessage(
        request,
      )) as ModelListResponse | undefined;
      if (!response) {
        throw new Error(
          "No response from background service worker. Please reload the extension in chrome://extensions.",
        );
      }
      if (!response.ok) throw new Error(response.error);
      updateProvider(provider, { discoveredModels: response.models });
    } catch (error) {
      setModelError(
        error instanceof Error ? error.message : "Could not discover models.",
      );
    } finally {
      setLoadingModels(false);
    }
  };

  const saveProviderSettings = () => {
    let authorization: Promise<boolean> = Promise.resolve(true);
    try {
      if (provider === "litellm") {
        authorization = chrome.permissions.request({
          origins: [providerOriginPattern(providerSettings.baseUrl)],
        });
      }
    } catch (error) {
      setModelError(
        error instanceof Error ? error.message : "Invalid LiteLLM Base URL.",
      );
      return;
    }

    setModelError("");
    void authorization
      .then((granted) => {
        if (!granted) {
          throw new Error("LiteLLM endpoint access was not granted.");
        }
        return onSave();
      })
      .catch((error) =>
        setModelError(
          error instanceof Error ? error.message : "Could not save settings.",
        ),
      );
  };

  const addCustomAction = () => {
    const name = draftAction.name.trim();
    const commandPrompt = draftAction.commandPrompt.trim();
    if (!name || !commandPrompt) return;
    const action: CustomAction = {
      ...draftAction,
      id: makeId(),
      name,
      commandPrompt,
    };
    onSettingsChange({
      ...settings,
      customActions: [...settings.customActions, action],
    });
    setDraftAction(emptyCustomAction());
  };

  const updateCustomAction = (
    id: string,
    patch: Partial<EditableCustomAction>,
  ) => {
    onSettingsChange({
      ...settings,
      customActions: settings.customActions.map((action) =>
        action.id === id ? { ...action, ...patch } : action,
      ),
    });
  };

  const moveCustomAction = (index: number, offset: -1 | 1) => {
    const destination = index + offset;
    if (destination < 0 || destination >= settings.customActions.length) return;
    const actions = [...settings.customActions];
    [actions[index], actions[destination]] = [
      actions[destination],
      actions[index],
    ];
    onSettingsChange({ ...settings, customActions: actions });
  };

  const hasUnsavedAction =
    draftAction.name.trim() ||
    draftAction.rolePrompt.trim() ||
    draftAction.commandPrompt.trim();

  return (
    <main className="settings-content">
      <section className="settings-section" aria-labelledby="provider-heading">
        <h2 id="provider-heading">Model provider</h2>
        <div className="provider-grid" role="radiogroup" aria-label="Provider">
          {PROVIDER_IDS.map((providerId) => (
            <button
              aria-checked={provider === providerId}
              className={provider === providerId ? "selected" : ""}
              key={providerId}
              onClick={() => {
                setModelError("");
                setShowApiKey(false);
                onSettingsChange({ ...settings, provider: providerId });
              }}
              role="radio"
            >
              {provider === providerId && <Icon name="check" size={18} />}
              {providerLabel(providerId)}
            </button>
          ))}
        </div>

        {providerDefinition.configurableBaseUrl && (
          <>
            <label className="outlined-field">
              <span>Base URL</span>
              <input
                inputMode="url"
                placeholder="http://localhost:4000/v1"
                value={providerSettings.baseUrl}
                onChange={(event) =>
                  updateProvider(provider, { baseUrl: event.target.value })
                }
              />
            </label>
            <p className="supporting-text">
              Use the OpenAI-compatible LiteLLM Proxy base URL, including its
              API prefix. Chrome asks for access only to this host.
            </p>
          </>
        )}

        <label className="outlined-field secret-field">
          <span>
            API key{providerDefinition.apiKeyRequired ? "" : " · optional"}
          </span>
          <input
            type={showApiKey ? "text" : "password"}
            autoComplete="off"
            placeholder={providerDefinition.apiKeyPlaceholder}
            value={providerSettings.apiKey}
            onChange={(event) =>
              updateProvider(provider, { apiKey: event.target.value })
            }
          />
          <button
            className="icon-button small secret-reveal"
            type="button"
            aria-label={showApiKey ? "Hide API key" : "Reveal API key"}
            aria-pressed={showApiKey}
            onClick={() => setShowApiKey((visible) => !visible)}
          >
            <Icon
              name={showApiKey ? "visibility-off" : "visibility"}
              size={20}
            />
          </button>
        </label>
        <p className="supporting-text">
          {providerDefinition.endpoint
            ? `Stored in this browser profile. Requests go only to ${providerDefinition.endpoint}.`
            : "Stored in this browser profile and sent only to the configured LiteLLM host."}
        </p>

        <label className="outlined-field">
          <span>Model</span>
          <select
            value={providerSettings.model}
            onChange={(event) =>
              updateProvider(provider, { model: event.target.value })
            }
          >
            {!providerSettings.model && (
              <option value="" disabled>
                Discover and select a model
              </option>
            )}
            {selectableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
        <button
          className="outlined-button"
          disabled={
            loadingModels ||
            (providerDefinition.apiKeyRequired &&
              !providerSettings.apiKey.trim()) ||
            (providerDefinition.configurableBaseUrl &&
              !providerSettings.baseUrl.trim())
          }
          onClick={discoverModels}
        >
          {loadingModels ? "Discovering…" : "Discover available models"}
        </button>
        {modelError && (
          <p className="field-error" role="alert">
            {modelError}
          </p>
        )}
        {providerSettings.discoveredModels.length > 0 && (
          <p className="supporting-text">
            Found {providerSettings.discoveredModels.length} compatible models.
          </p>
        )}
      </section>

      <section className="settings-section" aria-labelledby="language-heading">
        <h2 id="language-heading">Language</h2>
        <label className="outlined-field">
          <span>Default target language</span>
          <select
            value={settings.defaultTargetLanguage}
            onChange={(event) =>
              onSettingsChange({
                ...settings,
                defaultTargetLanguage: event.target.value,
                targetLanguage: event.target.value,
              })
            }
          >
            {LANGUAGES.filter(([value]) => value !== "auto").map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </label>
        <p className="supporting-text">
          New context-menu translations start with this target. Changing the
          target on the main screen affects only the current task.
        </p>
      </section>

      <section className="settings-section" aria-labelledby="summary-heading">
        <h2 id="summary-heading">Page summary</h2>
        <p className="section-description">
          Choose how much detail to include when summarizing the current page.
          The summary uses the target language selected in the panel.
        </p>
        <div
          className="provider-grid summary-length-grid"
          role="radiogroup"
          aria-label="Summary length"
        >
          {SUMMARY_LENGTH_OPTIONS.map((option) => (
            <button
              aria-checked={settings.summaryLength === option.id}
              className={settings.summaryLength === option.id ? "selected" : ""}
              key={option.id}
              onClick={() =>
                onSettingsChange({ ...settings, summaryLength: option.id })
              }
              role="radio"
              title={option.description}
            >
              {settings.summaryLength === option.id && (
                <Icon name="check" size={18} />
              )}
              {option.label}
            </button>
          ))}
        </div>
        <p className="supporting-text">
          Automatic playback follows “Automatically speak results” under
          Text-to-speech.
        </p>
        <label className="outlined-field">
          <span>Custom instruction · optional</span>
          <textarea
            maxLength={2000}
            placeholder="e.g. Start with a one-sentence takeaway, then list key facts and risks in bullet points."
            rows={4}
            value={settings.summaryInstruction}
            onChange={(event) =>
              onSettingsChange({
                ...settings,
                summaryInstruction: event.target.value,
              })
            }
          />
        </label>
        <p className="supporting-text">
          Controls the summary’s tone, structure, and emphasis. The selected
          length and target language still apply.
        </p>
      </section>

      <section className="settings-section" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading">Appearance</h2>
        <div
          className="provider-grid theme-grid"
          role="radiogroup"
          aria-label="Theme"
        >
          {THEME_OPTIONS.map((option) => (
            <button
              aria-checked={settings.theme === option.id}
              className={settings.theme === option.id ? "selected" : ""}
              key={option.id}
              onClick={() => onSettingsChange({ ...settings, theme: option.id })}
              role="radio"
            >
              {settings.theme === option.id && <Icon name="check" size={18} />}
              {option.label}
            </button>
          ))}
        </div>
        <p className="supporting-text">
          System follows Chrome's light or dark setting. Light and dark pin the
          panel regardless of it.
        </p>
      </section>

      <SpeechSettingsSection
        settings={settings}
        speaker={speaker}
        onSettingsChange={onSettingsChange}
      />

      <section className="settings-section" aria-labelledby="custom-actions-heading">
        <h2 id="custom-actions-heading">Custom actions</h2>
        <p className="section-description">
          Add reusable transformations. Their output uses the same single result
          pane.
        </p>

        <div className="custom-action-list">
          {settings.customActions.map((action, index) => (
            <article className="custom-action-card" key={action.id}>
              <CustomActionFields
                action={action}
                settings={settings}
                onChange={(patch) => updateCustomAction(action.id, patch)}
              />
              <div className="custom-action-controls">
                <button
                  className="text-button compact"
                  disabled={index === 0}
                  onClick={() => moveCustomAction(index, -1)}
                >
                  Up
                </button>
                <button
                  className="text-button compact"
                  disabled={index === settings.customActions.length - 1}
                  onClick={() => moveCustomAction(index, 1)}
                >
                  Down
                </button>
                <button
                  className="icon-button small"
                  aria-label={`Delete ${action.name}`}
                  onClick={() =>
                    onSettingsChange({
                      ...settings,
                      customActions: settings.customActions.filter(
                        (item) => item.id !== action.id,
                      ),
                    })
                  }
                >
                  <Icon name="close" size={20} />
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="new-action-card">
          <h3>Create action</h3>
          <CustomActionFields
            action={draftAction}
            settings={settings}
            onChange={(patch) =>
              setDraftAction((current) => ({ ...current, ...patch }))
            }
          />
          <button
            className="tonal-button"
            disabled={
              !draftAction.name.trim() || !draftAction.commandPrompt.trim()
            }
            onClick={addCustomAction}
          >
            Add action
          </button>
        </div>
      </section>

      <section className="settings-section about-section" aria-labelledby="about-heading">
        <h2 id="about-heading">About</h2>
        <p className="supporting-text">LLM Translator {extensionVersion()}</p>
        <p className="supporting-text">
          By {AUTHOR.name} ·{" "}
          <a href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</a>
        </p>
        <p className="supporting-text">
          <a href={LICENSE.url} rel="noreferrer" target="_blank">
            {LICENSE.name}
          </a>{" "}
          ·{" "}
          <a href={REPOSITORY_URL} rel="noreferrer" target="_blank">
            View on GitHub
          </a>
        </p>
      </section>

      <div className="settings-save-bar">
        {hasUnsavedAction && (
          <span>Add or clear the draft custom action before leaving.</span>
        )}
        <button className="filled-button" onClick={saveProviderSettings}>
          Save settings
        </button>
      </div>
    </main>
  );
}

interface SpeechSettingsSectionProps {
  settings: AppSettings;
  speaker: Speaker;
  onSettingsChange: (settings: AppSettings) => void;
}

function SpeechSettingsSection({
  settings,
  speaker,
  onSettingsChange,
}: SpeechSettingsSectionProps) {
  const browserVoices = useBrowserVoices();
  const speechProvider = settings.speech.provider;
  const definition = SPEECH_PROVIDER_DEFINITIONS[speechProvider];
  const voice = settings.speech.providers[speechProvider].voice;

  const selectVoice = (nextVoice: string) => {
    onSettingsChange({
      ...settings,
      speech: {
        ...settings.speech,
        providers: {
          ...settings.speech.providers,
          [speechProvider]: { voice: nextVoice },
        },
      },
    });
  };

  const testing = speaker.activeId === "speech-test";

  return (
    <section className="settings-section" aria-labelledby="speech-heading">
      <h2 id="speech-heading">Text-to-speech</h2>
      <p className="section-description">
        Powers the speak buttons on the source and result panes. This engine is
        chosen separately from the text model provider.
      </p>

      <label className="settings-toggle">
        <span>
          <strong>Automatically speak results</strong>
          <small>Start text-to-speech when a result finishes generating.</small>
        </span>
        <input
          checked={settings.speech.autoPlayResult}
          onChange={(event) =>
            onSettingsChange({
              ...settings,
              speech: {
                ...settings.speech,
                autoPlayResult: event.target.checked,
              },
            })
          }
          role="switch"
          type="checkbox"
        />
      </label>

      <div className="provider-grid" role="radiogroup" aria-label="Speech engine">
        {SPEECH_PROVIDER_IDS.map((providerId) => {
          const available = isSpeechProviderReady(providerId, settings);
          const credential =
            SPEECH_PROVIDER_DEFINITIONS[providerId].credentialProvider;
          return (
            <button
              aria-checked={speechProvider === providerId}
              className={speechProvider === providerId ? "selected" : ""}
              disabled={!available}
              key={providerId}
              role="radio"
              title={
                available || !credential
                  ? undefined
                  : `Add your ${providerLabel(credential)} API key above to enable this engine.`
              }
              onClick={() => {
                speaker.stop();
                onSettingsChange({
                  ...settings,
                  speech: { ...settings.speech, provider: providerId },
                });
              }}
            >
              {speechProvider === providerId && <Icon name="check" size={18} />}
              {speechProviderLabel(providerId)}
            </button>
          );
        })}
      </div>
      <p className="supporting-text">{definition.description}</p>

      <label className="outlined-field">
        <span>Voice</span>
        <select value={voice} onChange={(event) => selectVoice(event.target.value)}>
          {speechProvider === "webspeech" ? (
            <>
              <option value="">Browser default for the text language</option>
              {groupVoicesByGender(browserVoices, (item) =>
                browserVoiceGender(item.name),
              ).map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((item) => (
                    <option key={item.voiceURI} value={item.voiceURI}>
                      {item.name} · {item.lang}
                    </option>
                  ))}
                </optgroup>
              ))}
            </>
          ) : (
            groupVoicesByGender(
              speechProvider === "gemini" ? GEMINI_VOICES : OPENAI_VOICES,
              (item) => item.gender,
            ).map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id}
                    {item.gender && ` · ${VOICE_GENDER_LABELS[item.gender]}`}
                    {item.character && ` · ${item.character}`}
                  </option>
                ))}
              </optgroup>
            ))
          )}
        </select>
      </label>
      {speechProvider === "webspeech" && browserVoices.length === 0 && (
        <p className="supporting-text">
          Chrome has not reported any voices yet. Reopen the panel if the list
          stays empty.
        </p>
      )}
      <p className="supporting-text">
        Voices are grouped by gender. No provider publishes this as data, so the
        grouping is approximate — preview a voice to confirm.
      </p>
      {definition.model && (
        <p className="supporting-text">Model: {definition.model}</p>
      )}

      <button
        className="outlined-button"
        disabled={!speaker.ready}
        onClick={() =>
          speaker.toggle("speech-test", randomSpeechTestPhrase(), "en-US")
        }
      >
        {testing
          ? speaker.pending
            ? "Generating…"
            : "Stop preview"
          : "Test this voice"}
      </button>
      {speaker.error && (
        <p className="field-error" role="alert">
          {speaker.error}
        </p>
      )}
    </section>
  );
}

interface CustomActionFieldsProps {
  action: EditableCustomAction;
  settings: AppSettings;
  onChange: (patch: Partial<EditableCustomAction>) => void;
}

function CustomActionFields({
  action,
  settings,
  onChange,
}: CustomActionFieldsProps) {
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  useEffect(() => {
    if (!emojiPickerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEmojiPickerOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [emojiPickerOpen]);

  const actionModels = action.provider
    ? Array.from(
        new Set(
          [
            DEFAULT_MODELS[action.provider],
            ...settings.providers[action.provider].discoveredModels,
          ].filter(Boolean),
        ),
      )
    : [];

  return (
    <div className="custom-action-fields">
      <div className="custom-action-primary-fields">
        <div className="emoji-field">
          <label className="outlined-field">
            <span>Icon</span>
            <input
              aria-label="Action emoji"
              inputMode="text"
              placeholder="✨"
              value={action.icon}
              onChange={(event) => onChange({ icon: event.target.value })}
            />
          </label>
          <button
            aria-expanded={emojiPickerOpen}
            aria-haspopup="dialog"
            aria-label="Choose action emoji"
            className="emoji-picker-button"
            title="Choose emoji"
            type="button"
            onClick={() => setEmojiPickerOpen(true)}
          >
            <span aria-hidden="true">{action.icon || "🙂"}</span>
          </button>
        </div>
        <label className="outlined-field">
          <span>Name</span>
          <input
            placeholder="e.g. Make concise"
            value={action.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </label>
      </div>

      {emojiPickerOpen && (
        <div
          className="emoji-picker-scrim"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setEmojiPickerOpen(false);
            }
          }}
        >
          <section
            aria-label="Choose action emoji"
            aria-modal="true"
            className="emoji-picker-dialog"
            role="dialog"
          >
            <div className="emoji-picker-heading">
              <strong>Choose emoji</strong>
              <button
                aria-label="Close emoji picker"
                className="icon-button small"
                type="button"
                onClick={() => setEmojiPickerOpen(false)}
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <Suspense
              fallback={
                <div className="emoji-picker-loading">Loading emoji…</div>
              }
            >
              <ActionEmojiPicker
                onSelect={(emoji) => {
                  onChange({ icon: emoji });
                  setEmojiPickerOpen(false);
                }}
              />
            </Suspense>
            <p>
              Uses your system emoji font. You can also paste any emoji into
              the Icon field.
            </p>
          </section>
        </div>
      )}

      <label className="outlined-field">
        <span>Role prompt · optional</span>
        <textarea
          rows={3}
          placeholder="You are an expert technical editor."
          value={action.rolePrompt}
          onChange={(event) => onChange({ rolePrompt: event.target.value })}
        />
      </label>

      <label className="outlined-field">
        <span>Command prompt</span>
        <textarea
          rows={4}
          placeholder="Rewrite ${text} from ${sourceLang} for a ${targetLang} reader."
          value={action.commandPrompt}
          onChange={(event) => onChange({ commandPrompt: event.target.value })}
        />
      </label>
      <p className="action-placeholders">
        Variables: <code>{"${text}"}</code>, <code>{"${sourceLang}"}</code>,{" "}
        <code>{"${targetLang}"}</code>. Source text is appended automatically
        when <code>{"${text}"}</code> is not used.
      </p>

      <div className="custom-action-option-fields">
        <label className="outlined-field">
          <span>Output</span>
          <select
            value={action.outputFormat}
            onChange={(event) =>
              onChange({
                outputFormat: event.target.value as ActionOutputFormat,
              })
            }
          >
            <option value="text">Plain text</option>
            <option value="markdown">Markdown</option>
            <option value="latex">LaTeX</option>
          </select>
        </label>
        <label className="outlined-field">
          <span>Provider override</span>
          <select
            value={action.provider ?? ""}
            onChange={(event) => {
              const provider = event.target.value as ProviderId | "";
              onChange({
                provider: provider || undefined,
                model: undefined,
              });
            }}
          >
            <option value="">Use global</option>
            {PROVIDER_IDS.map((providerId) => (
              <option key={providerId} value={providerId}>
                {providerLabel(providerId)}
              </option>
            ))}
          </select>
        </label>
        {action.provider && (
          <label className="outlined-field">
            <span>Model override</span>
            <select
              value={action.model ?? ""}
              onChange={(event) =>
                onChange({ model: event.target.value || undefined })
              }
            >
              <option value="">Use provider selection</option>
              {actionModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
