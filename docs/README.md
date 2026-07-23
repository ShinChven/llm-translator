# LLM Translator Documentation

LLM Translator is a browser extension for translating and processing text in the Chrome side panel.

Product documentation:

- [Product Requirements](./functional-design.md): Complete requirements for entry points, the side panel, text actions, result revision, providers, models, OCR, text-to-speech, vocabulary, history, and settings.
- [Material Design 3 UI Specification](./material-design-3-ui.md): Layout, components, tokens, screen designs, interaction states, responsive behavior, and accessibility requirements.

Core capabilities:

1. Submit selected text from the browser context menu.
2. Complete all tasks in the Chrome side panel.
3. Use a single result pane for the initial result and all subsequent revisions.
4. Revise the current result through a bottom instruction box.
5. Support OpenAI and Gemini.
6. Support model discovery with provider-specific default models.
7. Connect only to the official API endpoints for each provider.
8. Generate speech with OpenAI TTS or Gemini TTS.
