# LLM Translator

A Chrome Manifest V3 extension for translating and transforming selected text in
the browser side panel.

The product specification lives in [`docs/`](./docs/README.md). The
`nextai-translator/` directory is a reference project only; the extension in this
repository is an independent implementation.

## Implemented foundation

- Chrome context-menu entry for selected text.
- Chrome side-panel interface with Source above Result.
- Single-result revision flow. Revision instructions replace the result and do
  not create a conversation.
- Built-in Translate, Polish, Summarize, What, How, and Why actions.
- Custom actions with create, edit, reorder, and delete controls.
- OpenAI, Gemini, Claude, Grok, and OpenRouter using fixed official API
  endpoints, plus a configurable self-hosted LiteLLM Proxy provider.
- Provider model discovery with provider-specific defaults.
- Strict structured output with visible `result` text and internal exchange text.
- Streaming result updates.
- Material Design 3 light and dark themes.

## Develop

Requirements:

- Node.js 22 or newer.
- Chrome 116 or newer.

Install and build:

```bash
npm install
npm run build
```

For rebuilds while editing:

```bash
npm run dev
```

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the generated `dist/` directory.
5. Open the extension from Chrome's toolbar, or select text on a page and use
   **Translate** from the context menu.
6. Open **Settings**, add an OpenAI or Gemini API key, and optionally discover
   additional available models.

API keys are stored in `chrome.storage.local` for the current browser profile.
The five hosted providers use only their fixed official API domains. LiteLLM is
the sole provider with a configurable Base URL; Chrome requests optional access
only to the configured LiteLLM host when the user saves or discovers models.

## Commands

```bash
npm run typecheck
npm run build
```

## Releases

GitHub Actions publishes a release whenever a `vMAJOR.MINOR.PATCH` tag is
pushed. The workflow:

1. Verifies that the tag matches `package.json`, `package-lock.json`, and
   `public/manifest.json`.
2. Installs locked dependencies and builds the extension.
3. Packages the contents of `dist/` as
   `llm-translator-VERSION-chrome.zip`.
4. Generates `SHA256SUMS.txt`.
5. Creates a GitHub Release with generated release notes and both assets.

For example, after setting all project versions to `0.1.0`:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Prerelease tags such as `v0.2.0-beta.1` create a GitHub prerelease.
`package.json` and `package-lock.json` use the complete prerelease version,
while Chrome's `manifest.json` uses the numeric core version (`0.2.0`).

## Current implementation scope

This build establishes the complete processing path and provider abstraction.
The broader product requirements also specify history, OCR, text-to-speech,
vocabulary, and rich Markdown/LaTeX rendering. Those modules are intentionally
separate from the initial processing foundation and are tracked in the product
documents.
