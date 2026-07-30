# LLM Translator Material Design 3 UI Specification

> Version: 1.0  
> Design system: Material Design 3  
> Primary surface: Chrome side panel

## 1. Design Direction

LLM Translator uses Material Design 3 with a compact, productivity-focused visual language.

The interface follows these principles:

- The current result is the visual center of the application.
- The revision field is a tool for transforming the result, not a chat composer.
- Tonal surfaces establish hierarchy before shadows.
- Controls use Material 3 compact density for a desktop browser side panel. Primary controls remain 38–44 pixels high, while secondary icon controls may use 34–40-pixel visual containers with accessible labels and focus states.
- Labels describe actions directly and do not use conversational language.
- The same component hierarchy works in light and dark color schemes.

## 2. Responsive Frame

The Chrome side panel is resizable. The interface supports:

| Width | Layout |
| --- | --- |
| 320–399 px | Compact controls, icon-only secondary actions, horizontally scrolling action chips |
| 400–599 px | Standard controls, selective text labels, two-column rows where space permits |
| 600 px and above | Expanded result toolbar, wider dialogs, and two-column Settings fields |

The page uses:

- A minimum supported width of 320 CSS pixels.
- A small top app bar.
- One scrollable content region.
- A docked revision area at the bottom of the Process page.
- 12-pixel horizontal page padding at compact and medium widths.
- 24-pixel horizontal page padding at 600 pixels and above.
- A 4-pixel base spacing grid.

The application does not use a persistent navigation rail. Primary navigation opens from the top app bar as a modal navigation drawer so the result pane retains the available width.

## 3. Primary Process Screen

### 3.1 Layout

```text
┌──────────────────────────────────────┐
│ ☰  LLM Translator          model  ⚙ │  Small top app bar
├──────────────────────────────────────┤
│ [Translate] [Refine] [Summarize]  › │  Filter chips
│ [Auto       ] ⇄ [English          ] │  Language controls
├──────────────────────────────────────┤
│ Source                               │
│ ┌──────────────────────────────────┐ │
│ │ Selected or pasted source text   │ │
│ │ remains editable here.           │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ Result                       ⟳  ⧉  ⋮ │  Result header
│                                      │
│ Translated or processed text fills   │
│ the primary scrollable surface.      │
│                                      │
│                                      │
├──────────────────────────────────────┤
│ Describe how you want to revise…  ➤ │  Docked revision area
└──────────────────────────────────────┘
```

### 3.2 Top App Bar

Use the M3 small top app bar.

Content:

- Leading menu icon.
- Title: `LLM Translator`.
- Current model shortcut.
- Settings icon button.

Behavior:

- The menu button opens the modal navigation drawer.
- The model shortcut opens the provider and model menu.
- The title truncates before action buttons.
- The app bar remains visible while the result scrolls.

Tokens:

- Height: 52 px.
- Background: `surface`.
- Foreground: `onSurface`.
- Bottom divider: `outlineVariant` at 1 px only after content scrolls beneath it.

### 3.3 Action Selector

Use a horizontally scrolling row of M3 filter chips.

Visible actions:

- Translate.
- Refine.
- Summarize.
- What.
- How.
- Why.
- User-created custom actions.

Rules:

- Exactly one action is selected.
- The selected action uses `secondaryContainer` and `onSecondaryContainer`.
- Unselected actions use the outlined filter-chip style.
- The final control is a More icon button when all actions do not fit.
- Reordering actions in Settings controls their order in this row.

### 3.4 Language Controls

Use two exposed dropdown menu fields with an icon button between them:

- Source language.
- Swap languages.
- Target language.

Compact behavior:

- Each field can display a short language name or code.
- The source-language field displays `Auto` when automatic detection is active.
- The Swap icon button uses a 38-by-38-pixel compact visual container.
- The fields share the available row width equally.

The row is hidden for actions that do not use language parameters.

### 3.5 Source Surface

The Source surface always appears above the Result surface.

Appearance:

- Section label: `Source`.
- M3 outlined multiline text field.
- Field label: `Source text`.
- Text color: `onSurface`.
- Minimum visible height: 112 px in the current implementation, with user resizing available.
- Maximum visible height: 160 px before internal scrolling.
- Supporting row for detected language and character or token count.
- OCR import icon button in the supporting row.
- Internal spacing: 12 px.

Behavior:

- Selected, pasted, typed, or OCR-recognized text appears in this field.
- The field remains visible after the result is generated.
- Editing the field does not immediately change the current result.
- A `Run again` filled tonal button appears when the source differs from the source used for the current result.
- Running again processes the Source field through the selected action and replaces the Result.

The Source field is never used for revision instructions.

### 3.6 Result Surface

The primary result appears in a large M3 surface container.

Appearance:

- Container color: `surfaceContainerLow`.
- Text color: `onSurface`.
- Shape: 14-pixel corner radius.
- Internal padding: 14 px.
- No default shadow.
- The empty surface uses a compact 92-pixel minimum height.
- A populated surface follows the content height so the Process page owns vertical scrolling.

Result header:

- Leading label: `Result`.
- Optional status text.
- Regenerate icon button.
- Share icon button with a compact platform menu.
- Copy icon button.
- Overflow icon button.

Overflow actions:

- Read aloud.
- Save to Vocabulary when applicable.
- Clear.

Content:

- Body text uses the M3 Body Large role.
- Markdown headings use Title Large, Title Medium, and Title Small roles.
- Code uses a monospace font on `surfaceContainerHighest`.
- Links use `primary`.
- Text selection uses the browser selection color derived from `primaryContainer`.

### 3.7 Docked Revision Area

The revision area remains fixed below the Result surface at the bottom of the Process page.

Appearance:

- Background: `surfaceContainer`.
- Top divider: `outlineVariant`.
- Padding: 7–8 px vertically and 12 px horizontally.
- Elevation: level 2 only when result content scrolls behind it.

Input:

- M3 outlined text field.
- Label: `Revise result`.
- Placeholder: `Describe how you want to revise the current result…`.
- One visible line by default.
- Maximum visible height: 120 px before internal scrolling.
- Supporting text appears only for errors or keyboard guidance.

Submit:

- Filled icon button with the Send Material Symbol.
- Accessible label: `Apply revision`.
- Disabled when the field is empty or no result exists.
- Replaced by a Stop filled tonal icon button during generation.

The submitted instruction never appears as a message bubble.

The revision field is not a source editor:

- It accepts only an instruction for transforming the current Result.
- Submitting it does not change the Source field.
- It is disabled until a valid Result exists.
- Its label, container, and fixed bottom position visually distinguish it from Source.

### 3.8 Audio Playback

Selecting `Read aloud` opens a compact playback row inside the Result header or directly below the Source field when Source is the playback target.

The playback row contains:

- AI-generated audio label.
- Play or Pause icon button.
- Stop icon button.
- Linear playback progress.
- Elapsed and total time.
- Voice name.

While speech audio is being generated:

- Show a linear progress indicator.
- Disable repeated Read Aloud actions for the same target.
- Keep Source, Result, and the revision field unchanged.

The playback row is associated with either Source or Result. It never uses text from the revision field.

## 4. Empty, Loading, and Result States

### 4.1 Empty State

The empty Process page uses:

- Action and language controls.
- The Source field in its normal position above Result.
- Source placeholder: `Paste text, or select text on a page and open it from the context menu.`
- Filled `Run` button associated with Source.
- Text button: `Import image`.
- An empty Result surface below Source.
- A centered Translate Material Symbol in a `secondaryContainer` circular container inside the empty Result surface.
- Result title: `Your result will appear here`.
- A disabled revision field below Result.

### 4.2 Initial Generation

During initial generation:

- Show a linear progress indicator directly below the result header.
- Stream validated result text into the result pane.
- Replace Regenerate with Stop.
- Disable action and language changes.
- Keep Copy disabled until valid result text exists.

### 4.3 Revision Generation

During revision generation:

- Preserve the existing result visually until validated replacement content is available.
- Show status text: `Revising…`.
- Show a linear progress indicator.
- Replace the revision Submit button with Stop.
- Keep the current instruction in the field.

After success:

- Replace the result in place.
- Clear the revision instruction.
- Announce `Result updated` through an ARIA live region.

### 4.4 Empty Revision

The revision Submit button is disabled when:

- No result exists.
- The instruction contains only whitespace.
- Another operation is already starting.

### 4.5 Error State

Use an inline M3 error container inside the result surface.

Content:

- Error icon.
- Short error title.
- One-sentence recovery guidance.
- Filled tonal `Retry` button.
- Text button for the relevant recovery action, such as `Change model`.
- Expandable `Technical details`.

Colors:

- Container: `errorContainer`.
- Content: `onErrorContainer`.

An error does not remove the previous valid result.

## 5. Navigation

### 5.1 Modal Navigation Drawer

The top-left menu opens a modal navigation drawer.

Destinations:

- Process.
- History.
- Vocabulary.
- Custom Actions.
- Settings.

Drawer content:

- Product icon and name.
- Navigation destinations.
- Current provider and model summary at the bottom.

Use Material Symbols and M3 navigation-drawer active indicators. The active destination uses `secondaryContainer`.

### 5.2 Secondary Pages

History, Vocabulary, Custom Actions, and Settings use:

- A small top app bar.
- Back or menu navigation.
- Page title.
- Optional trailing page action.
- One vertically scrolling content area.

The docked revision area appears only on the Process page.

## 6. History Screen

Layout:

1. Small top app bar with title `History` and Clear action.
2. M3 search bar.
3. Filter chips for action and Favorites.
4. History list.

Each history item uses an M3 elevated or filled card with:

- Source excerpt.
- Result excerpt.
- Action, language pair, provider, model, and time.
- Favorite icon button.
- Overflow menu.

Item actions:

- Open.
- Copy source.
- Copy result.
- Add or remove favorite.
- Delete.

Selecting the card restores the item on the Process page.

Empty state:

- History Material Symbol.
- Title: `No history yet`.
- Body: `Completed results will appear here.`

## 7. Vocabulary Screen

Layout:

1. Small top app bar with title `Vocabulary` and Export action.
2. Search bar.
3. Filter chips.
4. Vocabulary list.
5. Extended FAB: `Generate practice`.

Each word row includes:

- Word and phonetic transcription.
- Short definition.
- Language and review count.
- Read-aloud icon button.
- Overflow menu.

Word details use a full-height page within the side panel rather than a floating desktop dialog.

Practice-content selection uses checkboxes and a bottom action bar. Generated practice content opens in the primary result pane on the Process page.

## 8. Custom Actions Screen

### 8.1 Action List

The Custom Actions page contains:

- Small top app bar with title `Custom actions`.
- Add icon button.
- Reorderable list of actions.

Each list item contains:

- Drag handle.
- Action icon.
- Name.
- Output format.
- Provider and model override summary.
- Overflow menu.

Built-in actions display a `Built-in` assist chip and do not provide Delete.

### 8.2 Action Editor

Use a full-height side-panel page.

Fields:

- Name: filled text field.
- Icon: searchable Unicode emoji picker rendered with the system emoji font,
  plus a directly editable emoji field.
- Role prompt: outlined multiline text field.
- Command prompt: outlined multiline text field.
- Output format: segmented button.
- Provider: exposed dropdown menu.
- Model: exposed dropdown menu populated by the default and discovered models.
- Reasoning: switch.
- Reasoning effort: segmented button.

The bottom action bar contains:

- Text button: `Cancel`.
- Filled button: `Save action`.

Validation appears inline using M3 error text and `error` color roles.

## 9. Settings Screen

Settings uses grouped M3 list sections rather than a single long form.

Sections:

1. Provider and model.
2. Actions.
3. Language.
4. Appearance.
5. Text-to-speech.
6. History and data.

Each row includes:

- Leading icon.
- Label.
- Supporting text.
- Trailing value, switch, or chevron.

Destructive actions use `error` and require an M3 basic confirmation dialog.

### 9.1 Text-to-Speech Settings

The Text-to-Speech settings page contains:

- Speech provider: exposed dropdown menu with OpenAI and Gemini.
- Speech model: exposed dropdown menu populated by supported discovered models.
- Discover Models icon button.
- Voice: exposed dropdown menu.
- Speaking style: outlined text field, shown only when supported.
- Speech rate: slider, shown only when supported.
- Volume: slider.
- `Preview voice`: filled tonal button.
- Model status: assist chip such as `Available`, `Preview`, or `Unavailable`.

Speech provider and model fields are visually separated from the text provider and model fields. Changing one set does not modify the other.

When credentials are missing, the page shows an inline error container with a `Configure provider` action.

## 10. Provider and Model Screen

Use M3 secondary tabs:

- OpenAI.
- Gemini.
- Claude.
- Grok.
- OpenRouter.
- LiteLLM.

Provider form:

- Hosted-provider API key: outlined password field with visibility toggle.
- Hosted-provider official endpoint: read-only supporting text.
- LiteLLM Base URL: outlined URL field followed by an optional proxy API-key field.
- LiteLLM endpoint authorization: requested from Chrome when saving or discovering models.
- Connection state: inline status row.
- `Test connection`: filled tonal button.

Displayed endpoints:

- OpenAI: `https://api.openai.com/v1`.
- Gemini: `https://generativelanguage.googleapis.com/v1beta`.
- Claude: `https://api.anthropic.com/v1`.
- Grok: `https://api.x.ai/v1`.
- OpenRouter: `https://openrouter.ai/api/v1`.

The form exposes a Base URL only when LiteLLM is selected. No hosted provider exposes a custom endpoint or proxy field.

Model selector:

- Exposed dropdown menu.
- Refresh icon button.
- Discovered models listed with name, ID, and supporting description.
- The provider default remains available before discovery.
- Last discovery time appears as supporting text.

The selected model uses a check icon. Model-discovery failure uses an inline error container while preserving the selected model.

## 11. OCR Flow

Image import opens an M3 basic dialog or full-height page according to available width.

The flow contains:

- Drag-and-drop area using `surfaceContainerHigh`.
- `Choose image` filled tonal button.
- Image preview.
- Linear OCR progress indicator.
- Editable recognized-text field.
- `Use text` filled button.

At widths below 400 px, use a full-height page instead of a dialog.

## 12. Component Mapping

| Product element | Material Design 3 component |
| --- | --- |
| Application header | Small top app bar |
| Primary navigation | Modal navigation drawer |
| Text actions | Filter chips |
| Language selection | Exposed dropdown menu |
| Source editor | Outlined multiline text field |
| Result | Surface container |
| Revision input | Outlined text field |
| Apply revision | Filled icon button |
| Speech provider and model | Exposed dropdown menus |
| Speech rate and volume | Sliders |
| Audio playback | Icon buttons and linear progress indicator |
| Secondary actions | Standard icon buttons |
| Provider selection | Secondary tabs |
| Model selection | Exposed dropdown menu |
| Action output format | Segmented button |
| Reasoning setting | Switch and segmented button |
| History and vocabulary entries | Filled or elevated cards and lists |
| Add custom action | FAB or top-app-bar action |
| Loading | Linear progress indicator |
| Short feedback | Snackbar |
| Recoverable error | Inline error container |
| Destructive confirmation | Basic dialog |
| Contextual actions | Menu |

## 13. Color System

Use Material Design 3 semantic color roles. The initial brand seed is `#6750A4`.

Required roles:

- `primary` / `onPrimary`.
- `primaryContainer` / `onPrimaryContainer`.
- `secondary` / `onSecondary`.
- `secondaryContainer` / `onSecondaryContainer`.
- `tertiary` / `onTertiary`.
- `surface`, `surfaceDim`, and `surfaceBright`.
- `surfaceContainerLowest` through `surfaceContainerHighest`.
- `onSurface` and `onSurfaceVariant`.
- `outline` and `outlineVariant`.
- `error`, `onError`, `errorContainer`, and `onErrorContainer`.
- `inverseSurface` and `inverseOnSurface`.

Light and dark schemes use the same semantic roles. Components never use fixed light-only or dark-only foreground colors.

Provider identity colors may appear only in small provider icons. They do not replace semantic colors for controls, text, focus, selection, or errors.

## 14. Typography

Primary typeface:

- `Roboto`, followed by the platform sans-serif fallback stack.

Monospace typeface:

- `Roboto Mono`, followed by the platform monospace fallback stack.

Used M3 type roles:

| Role | Usage |
| --- | --- |
| Title Large | Secondary page titles |
| Title Medium | Result headings and card titles |
| Title Small | Section headings |
| Body Large | Result and source text |
| Body Medium | Supporting content and settings descriptions |
| Label Large | Buttons and prominent controls |
| Label Medium | Chips, metadata, and compact status text |
| Label Small | Character counts and timestamps |

Display typography is not used in the side panel.

## 15. Shape, Elevation, and Spacing

Shape tokens:

| Token | Radius | Usage |
| --- | --- | --- |
| Extra small | 4 px | Tooltips and compact code labels |
| Small | 8 px | Menus and compact controls |
| Medium | 12 px | Text fields and cards |
| Large | 16 px | Result surface and dialogs |
| Extra large | 28 px | Navigation drawer and large empty-state containers |
| Full | 999 px | Chips, FABs, and circular icon buttons |

Elevation:

- Level 0 for the base page and result surface.
- Level 1 for cards that must separate from the page.
- Level 2 for the docked revision area while content scrolls behind it.
- Level 3 for menus and the modal navigation drawer.
- Level 5 for modal dialogs.

Spacing:

- 4 px between tightly related icon and label content.
- 8 px between controls in the same group.
- 12 px inside compact containers.
- 16 px standard page and card padding.
- 24 px between major page sections.

## 16. Icons

Use Material Symbols Rounded.

Standard size:

- 20 px inside compact controls.
- 24 px for top app bar and navigation actions.

Required icons include:

- Menu.
- Translate.
- Auto Awesome or Edit for Refine.
- Summarize.
- Analytics.
- Code.
- Swap Horiz.
- Refresh.
- Content Copy.
- Volume Up.
- Stop.
- Send.
- History.
- Bookmarks.
- Settings.
- Add.
- More Vert.
- Upload File.
- Error.

Every icon-only button has an accessible label and tooltip.

## 17. Interaction States

All interactive components define:

- Enabled.
- Hovered.
- Focused.
- Pressed.
- Disabled.
- Loading where applicable.
- Error where applicable.

Use M3 state layers based on the component foreground color.

Keyboard focus:

- Always visible.
- At least 2 px thick.
- Uses a high-contrast `primary` or `onSurface` outline.
- Does not depend on box shadow alone.

The selected state never relies on color alone; it also uses an icon, shape, label, or control state.

## 18. Motion

Motion supports continuity without making the interface feel conversational.

Transitions:

- Drawer enter and exit: M3 emphasized easing.
- Source dirty-state and Run Again appearance: standard easing.
- Result replacement: 150–200 ms crossfade after validation.
- Error and status appearance: short fade and vertical shift.
- Chip selection: state-layer and container-color transition.

Do not animate result text as chat bubbles. Streaming text may reveal progressively without moving the result container.

Respect `prefers-reduced-motion` by removing nonessential movement and using immediate state changes or short fades.

## 19. Accessibility

Requirements:

- Minimum interactive target: 48 by 48 CSS pixels.
- Text and controls meet WCAG AA contrast.
- Body text can scale to 200% without horizontal page scrolling at 320 px.
- Every field has a persistent label.
- Supporting and error text is programmatically associated with its field.
- Icon-only buttons have accessible names and tooltips.
- Status changes use a polite ARIA live region.
- Errors use text and icons in addition to color.
- Keyboard navigation follows the visual order.
- Focus moves to a restored page heading after navigation.
- Focus returns to the triggering control after closing menus and dialogs.
- In Source, `Enter` runs the selected action.
- In the revision field, `Enter` applies the instruction.
- In either field, `Shift + Enter` or `Alt + Enter` inserts a line break.
- Enter does not submit while an input method editor is composing text.
- Reading order remains logical when the side panel is resized.

## 20. Material Design 3 Acceptance Criteria

- Every visible control maps to an M3 component or documented M3-compatible pattern.
- Components consume semantic color, typography, shape, elevation, and state tokens.
- No component uses a fixed color when an M3 semantic role is available.
- The Process page remains usable at 320 px wide.
- Source always appears above Result.
- The revision field always appears below Result.
- Source and revision instructions use separate fields, labels, state, and submission behavior.
- The result pane remains the dominant surface at every supported width.
- The docked revision area never becomes a chat transcript.
- Navigation does not permanently reduce the Process page width.
- Hover, focus, pressed, disabled, loading, and error states are visually distinct.
- Light and dark themes preserve hierarchy and contrast.
- Keyboard and screen-reader users can complete the full translate-and-revise workflow.
- OpenAI and Gemini speech settings use the same M3 component hierarchy.
- Audio generation and playback never alter the Source, Result, or revision field.

## 21. References

- [Material Design 3](https://m3.material.io/)
- [Material Design 3 layout guidance](https://m3.material.io/foundations/layout/understanding-layout/overview)
- [Material Design 3 components](https://m3.material.io/components)
- [Material Design 3 color roles](https://m3.material.io/styles/color/roles)
- [Material Design 3 typography](https://m3.material.io/styles/typography/overview)
- [Material Design 3 interaction states](https://m3.material.io/foundations/interaction/states/overview)
- [OpenAI speech generation](https://platform.openai.com/docs/api-reference/audio/createSpeech)
- [Gemini API text-to-speech generation](https://ai.google.dev/gemini-api/docs/speech-generation)
