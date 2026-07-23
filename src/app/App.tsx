import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BUILT_IN_ACTIONS,
  DEFAULT_MODELS,
  LANGUAGES,
  STORAGE_KEYS,
  languageName,
} from "../shared/constants";
import {
  detectLanguage,
  fallbackTargetLanguage,
} from "../shared/language-detection";
import { loadPendingTask, loadSettings, saveSettings } from "../shared/storage";
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
  ProcessTaskMessage,
  ProviderId,
  RuntimeRequest,
  RuntimeResponse,
} from "../shared/types";
import { Icon } from "./Icon";
import { WordResult } from "./WordResult";

type View = "process" | "settings";

function makeId(): string {
  return crypto.randomUUID();
}

function providerLabel(provider: ProviderId): string {
  return provider === "openai" ? "OpenAI" : "Gemini";
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
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [autoRunTaskId, setAutoRunTaskId] = useState<string>();
  const [pendingDefaultTargetTaskId, setPendingDefaultTargetTaskId] =
    useState<string>();
  const generationPort = useRef<chrome.runtime.Port | undefined>(undefined);
  const activeRequestId = useRef<string | undefined>(undefined);
  const handledTaskIds = useRef(new Set<string>());

  useEffect(() => {
    const acceptTask = (task: PendingTask) => {
      if (!task.source || handledTaskIds.current.has(task.id)) return;
      setSource(task.source);
      setActionId(task.actionId ?? "translate");
      setResult("");
      setSwapText("");
      setError("");
      setView("process");
      setPendingDefaultTargetTaskId(task.id);
      if (task.autoRun) setAutoRunTaskId(task.id);
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
    if (!pendingDefaultTargetTaskId || !settings) return;

    if (settings.targetLanguage !== settings.defaultTargetLanguage) {
      const nextSettings = {
        ...settings,
        targetLanguage: settings.defaultTargetLanguage,
      };
      setSettings(nextSettings);
      void saveSettings(nextSettings);
    }
    setPendingDefaultTargetTaskId(undefined);
  }, [pendingDefaultTargetTaskId, settings]);

  const selectedCustomAction = settings?.customActions.find(
    (action) => `custom:${action.id}` === actionId,
  );
  const activeProvider =
    selectedCustomAction?.provider ?? settings?.provider ?? "openai";
  const activeModel =
    selectedCustomAction?.model ??
    settings?.providers[activeProvider].model ??
    DEFAULT_MODELS[activeProvider];

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
      settings.providers[activeProvider].apiKey.trim() &&
      activeModel.trim(),
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
      result,
      selectedCustomAction,
      settings,
      source,
    ],
  );

  useEffect(() => {
    if (
      !autoRunTaskId ||
      pendingDefaultTargetTaskId ||
      view !== "process" ||
      !canGenerate
    ) {
      return;
    }

    handledTaskIds.current.add(autoRunTaskId);
    setAutoRunTaskId(undefined);
    void chrome.storage.session.remove(STORAGE_KEYS.pendingTask);
    runGeneration();
  }, [
    autoRunTaskId,
    canGenerate,
    pendingDefaultTargetTaskId,
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
        <h1>{view === "settings" ? "Settings" : "LLM Translator"}</h1>
        {view === "process" && (
          <button
            className="icon-button"
            aria-label="Open settings"
            onClick={() => setView("settings")}
          >
            <Icon name="settings" />
          </button>
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
          onActionChange={executeAction}
          onCopy={copyResult}
          onDismissError={() => setError("")}
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
        />
      ) : (
        <SettingsView
          settings={settings}
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
  result: string;
  swapText: string;
  revision: string;
  detectedSourceLanguage?: string;
  wordMode: boolean;
  modelLocked: boolean;
  providerLocked: boolean;
  settings: AppSettings;
  source: string;
  onActionChange: (action: ActionId) => void;
  onCopy: () => void;
  onDismissError: () => void;
  onGenerate: () => void;
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
  result,
  swapText,
  revision,
  detectedSourceLanguage,
  wordMode,
  modelLocked,
  providerLocked,
  settings,
  source,
  onActionChange,
  onCopy,
  onDismissError,
  onGenerate,
  onOpenSettings,
  onRevisionChange,
  onRevise,
  onSettingsChange,
  onSourceChange,
  onStop,
}: ProcessViewProps) {
  const provider = settings.providers[activeProvider];
  const configured = Boolean(provider.apiKey.trim() && activeModel.trim());
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
              <p>Add an API key to start with the default model.</p>
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
                  {action.icon && <span aria-hidden="true">{action.icon}</span>}
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
            <span>{source.length.toLocaleString()} characters</span>
          </div>
          <textarea
            className="source-field"
            placeholder="Select text and use the context menu, or type here."
            value={source}
            onChange={(event) => onSourceChange(event.target.value)}
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
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
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
              <button className="icon-button small" aria-label="Copy result" onClick={onCopy}>
                <Icon name={copied ? "check" : "copy"} size={20} />
              </button>
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
              <button
                className="icon-button small"
                aria-label="Dismiss error"
                onClick={onDismissError}
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
              if (event.key === "Enter" && !event.shiftKey) {
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
        <p>Each instruction replaces the result. This is not a chat.</p>
      </footer>
    </>
  );
}

interface SettingsViewProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onSave: () => void;
}

function SettingsView({
  settings,
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
  const selectableModels = Array.from(
    new Set([
      DEFAULT_MODELS[provider],
      ...providerSettings.discoveredModels,
    ]),
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
    setLoadingModels(true);
    setModelError("");
    try {
      await saveSettings(settings);
      const request: RuntimeRequest = { type: "list-models", provider };
      const response = (await chrome.runtime.sendMessage(
        request,
      )) as RuntimeResponse;
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
        <div className="segmented-buttons" role="radiogroup" aria-label="Provider">
          {(["openai", "gemini"] as const).map((providerId) => (
            <button
              aria-checked={provider === providerId}
              className={provider === providerId ? "selected" : ""}
              key={providerId}
              onClick={() =>
                onSettingsChange({ ...settings, provider: providerId })
              }
              role="radio"
            >
              {provider === providerId && <Icon name="check" size={18} />}
              {providerLabel(providerId)}
            </button>
          ))}
        </div>

        <label className="outlined-field secret-field">
          <span>API key</span>
          <input
            type={showApiKey ? "text" : "password"}
            autoComplete="off"
            placeholder={provider === "openai" ? "sk-…" : "AI…"}
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
          Stored in this browser profile. Requests use the provider’s official API
          endpoint only.
        </p>

        <label className="outlined-field">
          <span>Model</span>
          <select
            value={providerSettings.model}
            onChange={(event) =>
              updateProvider(provider, { model: event.target.value })
            }
          >
            {selectableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
        <button
          className="outlined-button"
          disabled={!providerSettings.apiKey.trim() || loadingModels}
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

      <div className="settings-save-bar">
        {hasUnsavedAction && (
          <span>Add or clear the draft custom action before leaving.</span>
        )}
        <button className="filled-button" onClick={onSave}>
          Save settings
        </button>
      </div>
    </main>
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
  const actionModels = action.provider
    ? Array.from(
        new Set([
          DEFAULT_MODELS[action.provider],
          ...settings.providers[action.provider].discoveredModels,
        ]),
      )
    : [];

  return (
    <div className="custom-action-fields">
      <div className="custom-action-primary-fields">
        <label className="outlined-field icon-field">
          <span>Icon</span>
          <select
            value={action.icon}
            onChange={(event) => onChange({ icon: event.target.value })}
          >
            {["✨", "✍️", "🧠", "📋", "🔍", "💡", "🧹", "🧩"].map(
              (icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="outlined-field">
          <span>Name</span>
          <input
            placeholder="e.g. Make concise"
            value={action.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </label>
      </div>

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
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
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
