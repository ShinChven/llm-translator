# LLM Translator Product Requirements

> Version: 1.0  
> Product type: Chrome browser extension

## 1. Product Overview

LLM Translator translates, polishes, summarizes, and explains text from web pages. Users submit selected text through the browser context menu, and all operations and results are presented in the Chrome side panel.

The user interface follows Material Design 3. Component selection, layout, tokens, states, motion, and accessibility are defined in the [Material Design 3 UI Specification](./material-design-3-ui.md).

The side panel uses a single-result workspace:

- The workspace always contains one primary result pane.
- The initial processed result appears in the primary result pane.
- Users revise the current result through an instruction box at the bottom.
- Every successful revision replaces the content of the same result pane.
- Revisions do not create chat bubbles or a conversation transcript.

## 2. Entry Points

### 2.1 Context Menu

The browser context menu contains one extension entry:

- When text is selected: `Process “%s” in Translator`.
- When no text is selected: `Open LLM Translator`.

When the user selects the menu item, the extension:

1. Opens or focuses the side panel in the current browser window.
2. Sets the selected text as the source text of the current task.
3. Resets the source language to automatic detection, detects the selected text, applies the configured default target language with the English fallback rule, and starts processing with the current provider and model.
4. Displays the generated result in the primary result pane.

Selecting text does not trigger the extension interface. The extension does not display selection buttons, bubbles, or translation overlays on the web page.

### 2.2 Extension Icon

Clicking the extension icon in the browser toolbar opens or focuses the side panel.

The side panel preserves the current task. When no task exists, it displays an empty workspace where the user can type or paste source text.

### 2.3 Editable Areas

The context menu can read selected text from regular page content, input fields, text areas, and editable regions.

The extension reads only content explicitly selected by the user. It does not automatically read an entire input field or page.

## 3. Side Panel

### 3.1 Navigation

The side panel contains the following pages:

1. **Process**
   - Run text actions.
   - View and revise the current result.
2. **History**
   - View, search, and restore processed items.
3. **Vocabulary**
   - Manage saved words and generated learning content.
4. **Settings**
   - Manage providers, models, actions, and display preferences.

### 3.2 Process Page Layout

The Process page contains the following areas from top to bottom:

1. Header
   - Product name.
   - Current provider and model.
   - History, Vocabulary, and Settings entry points.
2. Action bar
   - Current action.
   - Shortcuts for frequently used actions.
   - More Actions menu.
3. Parameter bar
   - Source language.
   - Swap languages.
   - Target or output language.
   - Parameters specific to the current action.
4. Source section
   - Displays the current task source above the result.
   - Uses an editable multiline source field.
   - Provides character or token count and OCR import.
   - Allows the current action to be rerun after editing the source.
5. Result toolbar
   - Regenerate.
   - Stop.
   - Share.
   - Copy.
   - Read aloud.
   - Save.
   - Clear.
6. Primary result pane
   - Displays the only result for the current task.
   - Displays streaming generation status.
   - Supports plain text, Markdown, and LaTeX.

The Share control appears immediately before Copy and opens a compact platform menu. It supports X, Threads, Facebook, LinkedIn, Truth Social, Reddit, and the operating system share sheet when available. Sharing includes only the result text and never includes the source-page URL. Platforms that accept text receive a prefilled result or excerpt. For platform web composers that cannot receive text directly, the complete result is copied to the clipboard for pasting. When a platform limits post length, the complete result is also copied before an excerpt is opened.
7. Bottom revision area
   - Fixed to the bottom of the side panel.
   - Accepts a new revision instruction for the current result.
   - Supports Submit and Stop.

The Source section always appears above the primary result pane. The primary result pane receives most of the available vertical space and scrolls independently. The bottom revision area remains visible below the result.

Source text and revision instructions are separate inputs:

- Source text is the input to the selected text action.
- A revision instruction describes how to change the current result.
- Editing Source text does not change the result until the user reruns the action.
- Submitting a revision instruction transforms the current result and does not replace Source text.

### 3.3 Empty Workspace

When no source text exists, the Source section displays an empty multiline field. The Result section below it displays an empty state, and the bottom revision area is disabled. The user can type or paste text, select an action, and run it.

In the Source field, Enter runs the selected action. In the bottom revision
field, Enter applies the current instruction. Shift+Enter and Alt+Enter insert
a line break in either field. Enter does not submit while an input method
editor is composing text.

After the initial generation completes:

- The source text remains in the Source section above the result.
- The generated text appears in the Result section below the source.
- The bottom revision area becomes available.

## 4. Text Actions

### 4.1 Built-in Actions

The extension provides the following built-in actions:

1. **Translate**
   - Converts the source text into the target language.
2. **Polish**
   - Improves grammar, clarity, fluency, and tone.
3. **Summarize**
   - Extracts key information and produces a concise summary.
4. **What**
   - Explains what the source is and what it means in the target language.
5. **How**
   - Explains how the source works, is used, or is implemented in the target language.
6. **Why**
   - Explains the source's reasons, purpose, motivation, or tradeoffs in the target language.

Built-in actions appear in the action bar. When space is limited, less frequently used actions move into the More Actions menu.

### 4.2 Translate

The Translate action supports:

- Automatic source-language detection.
- Automatic dictionary-style word mode for a single source word.
- Manual source-language selection.
- Target-language selection.
- Swapping the source and target languages.
- Remembering the most recently used target language.
- Configuring a default target language.
- Streaming the translated result.

The result contains only the translated text.

When the source contains a single word, Translate switches to word mode. The result includes the dictionary form, pronunciation or transliteration, common senses with parts of speech, at least three bilingual examples, and a concise etymology. Word-mode output is rendered as a structured dictionary entry with visually distinct meaning, example, and etymology sections. If structured parsing is unavailable while a result is streaming or because a provider returns an unexpected shape, the complete result remains visible as plain text. The information remains in the single result pane and is not presented as a conversation. Language exchange uses one primary translated word as the next source and never moves the complete dictionary explanation into the source field.

When the source and target languages are the same, the interface prompts the user to select a different target language.

### 4.3 Polish

The Polish action improves the clarity, concision, coherence, and naturalness of the source while preserving its language.

The result contains only the complete polished text.

### 4.4 Summarize

The Summarize action produces a concise summary in the target language.

### 4.5 What

The What action explains what the source is, what it means, and its essential content. The complete result is written in the selected target language.

### 4.6 How

The How action explains how the source works, is used, is performed, or is implemented. It focuses on mechanisms, process, and important steps. The complete result is written in the selected target language.

### 4.7 Why

The Why action explains why the source exists, matters, behaves in a particular way, or was designed that way. It focuses on reasons, purpose, motivation, and tradeoffs. The complete result is written in the selected target language.

## 5. Custom Actions

Users can create, edit, reorder, and delete custom actions.

Each custom action contains:

- Name.
- Icon selected from the complete Unicode emoji picker or entered directly.
- Role prompt.
- Command prompt.
- Output format.
- Optional provider override.
- Optional model override.
- Reasoning toggle and reasoning level.

Command prompts support the following variables:

- `${text}`: Current source text.
- `${sourceLang}`: Source language.
- `${targetLang}`: Target language.

Supported output formats:

- Plain text.
- Markdown.
- LaTeX.

A custom action can use the global provider and model or define its own provider and model.

The emoji picker uses native Unicode characters rendered by the operating
system emoji font. It supports search, categories, skin tones, and the complete
emoji catalog bundled with the extension. The Icon field also accepts pasted
emoji so characters newly supported by the operating system remain usable.

Built-in actions can be reordered and can override provider, model, and reasoning settings. Built-in actions are always retained.

Built-in actions use fixed default emoji:

- Translate: 🌐
- Polish: ✨
- Summarize: 📝
- What: ❓
- How: 🛠️
- Why: 💡

## 6. Revising the Current Result

### 6.1 Bottom Revision Area

The bottom revision area applies one revision to the current text in the primary result pane.

The instruction box:

- Starts as a single line and expands with its content.
- Uses the placeholder: `Describe how you want to revise the current result…`.
- Submits with `Enter`.
- Inserts a line break with `Shift + Enter`.
- Replaces the Submit button with a Stop button while generating.

The bottom revision area is available only when a result exists.

### 6.2 Revision Flow

When the user submits a revision instruction, the extension:

1. Keeps the current result visible and intact.
2. Generates a new result using the current result, the new instruction, the current action, and language constraints.
3. Displays generation status in the same primary result pane.
4. Replaces the current result after generation succeeds.
5. Clears the instruction box.
6. Keeps the original result and instruction text when generation fails.

Each revision uses only:

- The current result.
- The current revision instruction.
- The current action.
- The current source and target languages.
- The current output format.

The extension does not send previous revision instructions, previous results, or role messages as conversation history.

### 6.3 Single-Result Rules

The Process page follows these rules:

- Initial generation writes to the primary result pane.
- A revision writes to the same primary result pane.
- Regeneration writes to the same primary result pane.
- Rerunning after switching actions writes to the same primary result pane.
- The page does not display user messages, AI messages, or response cards.
- The page does not display multiple result versions at the same time.

## 7. Model Output Rules

### 7.1 Output Content

The model generates only the target text required by the current action.

The primary result pane does not display:

- Confirmation phrases.
- Greetings.
- Revision notes.
- Explanations of the revision request.
- Direct answers to questions in the revision request.
- JSON wrappers.
- JSON inside Markdown code fences.
- Status fields or debugging information.

When a revision cannot be applied reliably, the model returns the current result unchanged. The interface detects the unchanged result and displays a status message.

### 7.2 Revision Prompt

Revision requests are wrapped in a fixed text-transformation instruction:

```text
Role: You are a constrained text transformation engine, not a chat assistant.
Task: Revise the current result strictly according to the current instruction.
Rules:
1. Generate only the complete revised target text.
2. Do not answer questions contained in the instruction.
3. Do not explain the revision process.
4. Preserve the specified target language, output format, and purpose.
5. If the instruction cannot be applied reliably, return the current result unchanged.

Current result: ...
Current instruction: ...
Source language: ...
Target language: ...
Action: ...
Output format: ...
```

### 7.3 Structured Output

The model returns the following structure:

```json
{
  "result": "Complete target text",
  "swapText": "Text used when exchanging source and target"
}
```

The output schema is:

```json
{
  "type": "object",
  "properties": {
    "result": {
      "type": "string"
    },
    "swapText": {
      "type": "string"
    }
  },
  "required": ["result", "swapText"],
  "additionalProperties": false
}
```

Output handling follows these rules:

- When the provider and model support native structured output, the extension uses the native schema constraint.
- Otherwise, the prompt requests the same JSON structure.
- The extension displays only `result`. `swapText` is internal metadata used by language exchange.
- For ordinary transformations, `swapText` equals `result`.
- For word mode, `swapText` contains one primary target-language translation without dictionary details.
- Output that cannot be parsed or does not satisfy the schema does not update the current result.
- Invalid output preserves the current result and provides Retry and Change Model actions.
- When safe incremental parsing is available, `result` streams into the primary result pane.
- Otherwise, the extension updates the pane only after the complete response passes validation.

When a model supports randomness controls, text-processing requests use the lowest randomness setting.

## 8. Languages

The extension supports at least 55 languages.

Language capabilities include:

- Automatic source-language detection.
- Searchable source- and target-language lists.
- Recently used languages.
- A configurable default target language.
- Each new context-menu translation resets the source language to automatic detection, regardless of the language used by the previous task.
- Each new context-menu translation starts with the configured default target language.
- Changing the target language in the process view affects the current task without changing the default.
- When automatic source detection matches the default target language, the task target falls back to English.
- Swapping source and target languages.
- Right-to-left text direction where applicable.
- Language parameters for Translate, Polish, Summarize, and custom actions.

Users can select a language-detection method. If detection fails, the source remains set to automatic detection and the user can select it manually.

## 9. Word Lookup

When the source is identified as a word or short phrase, the result pane enables word-lookup content:

- Phonetic transcription.
- Part of speech.
- Definitions.
- Common usage.
- Examples.
- Source and result pronunciation.
- Save to Vocabulary.

Users can open word details from text in the result. Word details remain in the side panel, and closing the details returns to the current result.

Users can enable automatic saving. When enabled, completing a word lookup writes the word and its lookup result to Vocabulary.

## 10. Images and OCR

Users can upload an image in the side panel and extract its text.

The OCR flow:

1. Select or drop an image.
2. Display recognition progress.
3. Set the recognized text as the current source.
4. Process the recognized text with the current action, languages, provider, and model.
5. Display the final result in the primary result pane.

Users can edit the recognized source text before model processing.

## 11. Text-to-Speech

The extension can generate speech for:

- Source text.
- The current Result.
- A selected word or short phrase.

Revision instructions are never included in speech generation.

Text-to-speech uses a separate speech provider and speech model configuration. Changing the text-generation provider does not automatically change the speech provider.

Supported speech providers:

| Speech provider | Service | Authentication | Default |
| --- | --- | --- | --- |
| Browser | Web Speech API (`speechSynthesis`) | None | Yes |
| Gemini | Gemini API TTS | Reuses the configured Gemini API key | |
| OpenAI | OpenAI Speech API | Reuses the configured OpenAI API key | |

Official speech endpoints:

| Speech provider | Official endpoint |
| --- | --- |
| Browser | Local to Chrome; no network request |
| Gemini | `https://generativelanguage.googleapis.com` (`:streamGenerateContent`) |
| OpenAI | `https://api.openai.com/v1/audio/speech` |

A cloud engine is selectable only while its provider has an API key; otherwise its option is disabled. Each engine uses one fixed speech model, so no speech-model discovery is required:

| Speech provider | Speech model |
| --- | --- |
| Gemini | `gemini-3.1-flash-tts-preview` |
| OpenAI | `gpt-4o-mini-tts` |

### 11.1 Streaming Playback

Both cloud engines stream 16-bit mono PCM and are played chunk by chunk rather than after the clip is complete, which is what keeps time-to-first-sound low. Gemini delivers base64 PCM over server-sent events; OpenAI delivers headerless PCM over a chunked response, requested as `response_format: "pcm"`.

Each chunk is decoded on arrival and scheduled back to back on the Web Audio clock. The audio context is created at the stream's own sample rate so that nothing is resampled. If the network stalls, the next chunk is scheduled just ahead of the clock rather than in the past. Because a network chunk can split a 16-bit sample, an odd trailing byte is carried into the next chunk instead of being discarded.

Model identifiers are unversioned aliases so that provider snapshot rotations do not require a release.

Implemented text-to-speech capabilities:

- Play and stop, from the Source pane and the Result pane.
- Speech-provider selection, independent of the text provider.
- Voice selection per provider, with the choice remembered for each provider separately.
- Voice preview, using a randomly chosen test phrase.
- Voices grouped and labelled by gender. No provider publishes gender as data, so the labels are curated and presented as approximate. Voices that cannot be classified, such as the novelty system voices, are grouped separately rather than guessed at.

Not yet implemented:

- Pause.
- Reading-progress highlighting. Only the browser engine can support this, because the cloud engines return audio without word timestamps.
- Speaking-style instructions.
- Volume and speech-rate control.
- A saved default voice for each language.

Speech behavior:

- The generated audio recites the selected Source or Result content.
- Only one item plays at a time. Starting one stops the other.
- Stop cancels pending speech generation and playback.
- Changing the speech provider or voice stops any current playback.
- A failed speech request does not change Source or Result.
- The extension does not automatically switch to another speech provider after a failure.

Planned but not yet implemented:

- Markdown formatting markers are removed before synthesis.
- Code blocks and content marked as non-spoken are excluded.
- Long text is processed as ordered segments and played continuously.
- The interface identifies generated speech as AI-generated.

Generated audio from a cloud engine is assembled into a WAV clip as it streams and cached in memory, keyed by speech provider, speech model, voice, and exact text. Replaying the same text with the same voice reuses the cached audio and issues no new request. The cache holds up to 50 MB and evicts least-recently-used entries beyond that. It is discarded when the side panel closes.

Generated audio is temporary and is not stored in History.

## 12. Vocabulary

### 12.1 Saving Words

Users can add words to Vocabulary and remove saved words.

Words can be saved manually or automatically.

Each vocabulary item contains:

- Word.
- Language.
- Definition and notes.
- Created time.
- Updated time.
- Review count.

### 12.2 Browsing and Review

Vocabulary supports:

- Viewing all saved words.
- Selecting a word to view details.
- Random word review.
- Reading the word and notes aloud.
- Copying content.
- Deleting a word.

### 12.3 Learning Content Generation

Users can select a group of saved words and generate learning content.

Available content types:

- Story.
- News brief.
- Sports bulletin.
- Lyrics.
- Poem.

Generated content uses the selected words naturally and highlights them in the result.

### 12.4 Export

Users can export Vocabulary as a CSV file.

## 13. History

Every successful processing operation saves a local history item. A successful revision updates the history item associated with the current task.

A history item contains:

- Created and updated times.
- Source text.
- Final result.
- Action.
- Source and target languages.
- Provider.
- Model.
- Favorite state.
- Word-lookup state.
- Character or token count.

History supports:

- Keyword search.
- Filtering by action.
- Showing favorites only.
- Copying the source or result.
- Adding or removing a favorite.
- Restoring an item to the Process page.
- Deleting one item.
- Clearing all items.

Restoring a history item also restores its source, result, action, languages, provider, and model.

## 14. Providers and Models

### 14.1 Providers

The extension supports:

1. OpenAI
2. Gemini
3. Claude
4. Grok
5. OpenRouter
6. LiteLLM

Provider configuration:

| Provider | Configuration |
| --- | --- |
| OpenAI | API key |
| Gemini | API key |
| Claude | API key |
| Grok | API key |
| OpenRouter | API key |
| LiteLLM | Base URL and optional proxy API key |

Users can configure multiple providers and select one as the current provider.

The provider endpoints are fixed:

| Provider | Official service endpoint |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta` |
| Claude | `https://api.anthropic.com/v1` |
| Grok | `https://api.x.ai/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |

OpenAI, Gemini, Claude, Grok, and OpenRouter do not provide a custom base URL, proxy URL, or compatible-service endpoint setting. Their API resource paths and versions are managed by the extension.

LiteLLM is a self-hosted gateway and therefore requires a configurable OpenAI-compatible Base URL. The default is `http://localhost:4000/v1`. Chrome requests an optional host permission for only the configured host when the user saves the configuration or discovers models. LiteLLM Base URL configuration does not alter or proxy any other provider.

### 14.2 Connection Test

Each provider includes a connection test.

The connection test displays:

- Success or failure.
- Test time.
- Availability of the current model.
- A recoverable error description.

### 14.3 Model Discovery

Users can discover models available to the current provider and account.

The model selector supports:

- Refreshing the model list.
- Searching for a model.
- Selecting a discovered model.
- Displaying the model ID.
- Displaying the model name and description.
- Displaying the most recent discovery time.
- Retaining the most recent successful model cache.

### 14.4 Default Models

Each provider has a built-in default text model:

- OpenAI: `gpt-5.6-luna`
- Gemini: `gemini-3.5-flash-lite`
- Claude: `claude-haiku-4-5`
- Grok: `grok-latest`
- OpenRouter: `openrouter/auto`
- LiteLLM: no universal default; the user discovers and selects a model exposed by the configured proxy.

Users can select the default model or another model returned by provider discovery. Arbitrary model IDs cannot be entered.

### 14.5 Per-Action Models

Each action can:

- Use the global provider and model.
- Override the provider.
- Override the model.
- Enable reasoning when supported by the model.
- Select low, medium, or high reasoning effort.

When the current action changes, the interface displays the provider and model that the action will use.

## 15. Result Rendering and Operations

The primary result pane supports:

- Plain-text paragraphs.
- Markdown headings, lists, block quotes, links, and code blocks.
- LaTeX formulas.
- Right-to-left text direction.
- Streaming cursor.
- Generation status.
- Error status.
- Text selection.
- Copying the complete result.
- Word details.
- Reading-progress highlighting.

Copy copies only the target text. It excludes status information, prompts, and structured-output wrappers.

## 16. Settings

### 16.1 General

General settings include:

- Interface language.
- Default action.
- Default target language.
- Language-detection method.
- Current provider.
- Current model.
- LiteLLM Base URL and optional proxy key.
- Per-action provider and model overrides.
- Reasoning toggle.
- Automatic vocabulary saving.
- Theme.
- Result font size.
- Interface font size.
- Icon size.

Available themes:

- Light.
- Dark.
- Follow system.

### 16.2 Text-to-Speech

Text-to-speech settings include:

- Speech provider: OpenAI or Gemini.
- Speech model.
- Discover speech models.
- Select a discovered speech model.
- Default voice by language.
- Speaking-style instruction.
- Volume.
- Speech rate.
- Preview voice.
- Display model availability or Preview status.

### 16.3 History and Data

Data settings include:

- Clear History.
- Clear Vocabulary.
- Clear the model cache.
- Remove credentials for a selected provider.
- Clear all local data.

## 17. Task States

The current task can have the following states:

| State | Display and available operations |
| --- | --- |
| Empty | Type or paste source text |
| Draft | Edit the source, select an action, and run |
| Awaiting configuration | Open provider settings |
| Recognizing image | Display OCR progress and Stop |
| Initial generation | Display generation progress and Stop |
| Revision generation | Display generation progress and Stop |
| Completed | Revise, copy, read aloud, save, and regenerate |
| Stopped | Preserve usable content and retry |
| Failed | Preserve the source and current result, display the error, and retry |

When the user stops generation:

- Initial generation preserves the generated content and marks it as incomplete.
- Revision generation continues displaying the complete pre-revision result.
- The revision instruction remains editable.

## 18. Error Handling

The extension distinguishes the following errors:

| Error | Recovery |
| --- | --- |
| Provider not configured | Open Settings |
| Invalid credentials | Edit credentials and test the connection |
| Insufficient permissions | Check provider permissions |
| Model missing or unavailable | Discover models and select an available model |
| Rate limit | Retry later or switch provider |
| Insufficient quota | Check quota or switch provider |
| Network failure | Retry and check the internet connection or official provider status |
| Content too long | Shorten the source or current result |
| OCR failure | Use another image and recognize it again |
| Speech provider not configured | Configure the selected speech provider |
| Speech model unavailable | Discover and select another speech model |
| Speech generation failed | Retry or select another configured speech provider |
| Invalid output format | Preserve the current result and retry |
| Interrupted generation | Preserve or restore existing content and retry |

Error details include:

- A concise description.
- Recovery actions.
- Expandable status code.
- Provider request ID.
- Redacted raw error.

## 19. Local Data

The extension stores the following data locally:

- Provider configuration.
- Model selection and model cache.
- Action configuration.
- Current task.
- History.
- Vocabulary.
- Display and text-to-speech preferences.

API keys and authentication data are not written to:

- History.
- Vocabulary.
- Error details.
- Exported files.
- Page content.

Generated speech audio is not persisted in History or local data.

Users can delete individual data categories or clear all local data.

## 20. Acceptance Criteria

### 20.1 Entry Points

- Selecting text does not display extension UI on the page.
- Clicking the context-menu item opens the side panel with the complete selected text.
- The user can open an empty side panel without selected text.
- Clicking the extension icon opens or focuses the side panel.

### 20.2 Single-Result Workspace

- The Process page always contains one primary result pane.
- The Source section always appears above the Result section.
- The bottom revision area always appears below the Result section.
- Source text and revision instructions remain separate inputs with separate labels and behavior.
- Initial generation, regeneration, and revision update the same result pane.
- The bottom revision area remains visible.
- Submitting a revision does not add chat bubbles or response cards.
- Revision requests do not include previous conversation history.

### 20.3 Model Output

- The primary result pane displays only target text.
- Confirmation phrases, explanations, chat responses, and JSON wrappers do not enter the result pane.
- Invalid structured output does not overwrite the existing result.
- Models without native structured output still use the common output-validation flow.

### 20.4 Actions

- Translate, Polish, Summarize, What, How, and Why can run independently.
- Users can create, edit, reorder, and delete custom actions.
- Each action can select an output format, provider, and model.

### 20.5 Providers and Models

- Settings displays OpenAI, Gemini, Claude, Grok, OpenRouter, and LiteLLM.
- OpenAI requests use `https://api.openai.com/v1`.
- Gemini requests use `https://generativelanguage.googleapis.com/v1beta`.
- Claude requests use `https://api.anthropic.com/v1`.
- Grok requests use `https://api.x.ai/v1`.
- OpenRouter requests use `https://openrouter.ai/api/v1`.
- LiteLLM requests use only the user-configured and runtime-authorized Base URL.
- Settings exposes a Base URL only for LiteLLM; hosted providers remain fixed to their official endpoints.
- Each provider supports a connection test.
- Each provider supports model discovery.
- Users can select the provider default or a discovered model.
- Failed model discovery preserves the existing model configuration.

### 20.6 Supporting Capabilities

- Images can be converted to source text with OCR and processed by an action.
- Source, Result, and selected words can be read aloud.
- Speech can be generated through OpenAI or Gemini.
- Speech provider and model are configured independently from the text provider and model.
- Revision instructions are never synthesized.
- Failed speech generation does not modify Source or Result.
- Words can be saved, reviewed, and exported.
- History can be searched, filtered, favorited, restored, and deleted.
- Plain text, Markdown, and LaTeX results render correctly.

### 20.7 Visual Design

- All screens use the Material Design 3 component and token system.
- Light, dark, hover, focus, pressed, disabled, loading, and error states use defined semantic color roles.
- Interactive targets are at least 48 by 48 CSS pixels.
- The layout remains usable from 320 CSS pixels through the full resizable Chrome side-panel width.
- The primary result pane remains the dominant surface at every supported width.
