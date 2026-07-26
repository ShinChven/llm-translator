import { languageName } from "../shared/constants";
import { isSingleWord } from "../shared/text-mode";
import type { GenerationRequest } from "../shared/types";

const ACTION_INSTRUCTIONS: Record<string, string> = {
  translate:
    "Translate the source accurately. Preserve meaning, tone, formatting, names, numbers, and code.",
  polish:
    "Polish the source for clarity, fluency, grammar, and natural expression without changing its meaning. Do not translate it.",
  summarize:
    "Summarize the source concisely while retaining its important facts and conclusions.",
  what:
    "Explain what the source is, what it means, and its essential content. Be direct and concrete.",
  how:
    "Explain how the source works, is used, is performed, or is implemented. Focus on process, mechanism, and important steps.",
  why:
    "Explain why the source exists, matters, behaves this way, or was designed this way. Focus on reasons, purpose, motivation, and tradeoffs.",
};

const SUMMARY_LENGTH_INSTRUCTIONS = {
  short:
    "Keep the summary brief: one compact paragraph or up to 3 bullet points.",
  medium:
    "Give a balanced summary with the main idea, key facts, and conclusions in roughly 5 to 8 bullet points or equivalent prose.",
  long:
    "Give a detailed plain-text summary covering the main argument, important facts, supporting context, and conclusions without unnecessary repetition. Use short headings and bullet points when helpful.",
} as const;

const SUMMARY_FORMAT_INSTRUCTION =
  "Return the summary as readable prose or bullet points inside result. Never encode the summary as JSON, XML, YAML, or a key-value object.";

export function buildPrompts(request: GenerationRequest): {
  system: string;
  user: string;
} {
  const system = [
    "You are a deterministic text transformation engine.",
    "Never chat with the user.",
    "Never add acknowledgements, prefaces, explanations, offers, or follow-up questions unless the requested transformation itself requires explanatory content.",
    'Return exactly one JSON object matching {"result":"string","swapText":"string"}.',
    "The result field must contain directly the finished transformed text without any nested JSON objects.",
    "Unless a later instruction defines a special swapText value, swapText must exactly equal result.",
  ].join(" ");

  if (request.revisionInstruction && request.currentResult !== undefined) {
    return {
      system,
      user: [
        "Revise CURRENT RESULT according to REVISION INSTRUCTION.",
        "Treat the instruction as an editing command, not as a message to answer.",
        "Return the complete revised text, not a diff.",
        "Preserve the language of CURRENT RESULT unless REVISION INSTRUCTION explicitly requests another language.",
        "",
        "ORIGINAL SOURCE:",
        request.source,
        "",
        "CURRENT RESULT:",
        request.currentResult,
        "",
        "REVISION INSTRUCTION:",
        request.revisionInstruction,
      ].join("\n"),
    };
  }

  if (request.actionId.startsWith("custom:")) {
    const variables: Record<string, string> = {
      sourceLang: languageName(request.sourceLanguage),
      targetLang: languageName(request.targetLanguage),
      text: request.source,
    };
    const interpolate = (template: string) =>
      template.replace(
        /\$\{(sourceLang|targetLang|text)\}/g,
        (_match, variable: string) => variables[variable] ?? "",
      );
    const roleTemplate = request.customRolePrompt ?? "";
    const commandTemplate = request.customCommandPrompt ?? "";
    const injectSource =
      !roleTemplate.includes("${text}") && !commandTemplate.includes("${text}");
    const outputFormat = request.customOutputFormat ?? "text";

    return {
      system: [
        system,
        interpolate(roleTemplate),
        outputFormat === "markdown"
          ? "Format result as Markdown."
          : outputFormat === "latex"
            ? "Format result as LaTeX."
            : "Format result as plain text.",
      ]
        .filter(Boolean)
        .join(" "),
      user: [
        interpolate(commandTemplate),
        injectSource ? `SOURCE:\n${request.source}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
  }

  const actionInstruction =
    request.actionId === "summarize"
      ? [
          ACTION_INSTRUCTIONS.summarize,
          SUMMARY_LENGTH_INSTRUCTIONS[request.summaryLength ?? "medium"],
          SUMMARY_FORMAT_INSTRUCTION,
          request.summaryInstruction?.trim()
            ? `Follow this user-defined summary style instruction: ${request.summaryInstruction.trim()}`
            : "",
        ].join(" ")
      : (ACTION_INSTRUCTIONS[request.actionId] ??
        ACTION_INSTRUCTIONS.translate);

  const wordMode =
    request.actionId === "translate" &&
    isSingleWord(request.source, request.sourceLanguage);

  if (wordMode) {
    return {
      system,
      user: [
        "Perform a dictionary lookup for the source word, not an ordinary sentence translation.",
        `Source language: ${languageName(request.sourceLanguage)}.`,
        `Explanation and meaning language: ${languageName(request.targetLanguage)}.`,
        "Cover the useful common senses of the word rather than returning only one translation.",
        "Set swapText to exactly one most common target-language translation of the source word. It must contain only that translated word or short lexical equivalent, with no pronunciation, labels, punctuation, alternatives, examples, or explanation.",
        "If the input is inflected, show its dictionary form. If it appears misspelled, state the most likely correction.",
        "Return plain text in exactly this section order:",
        "",
        "WORD",
        "<source word> (<dictionary form, only when different>)",
        "",
        "PRONUNCIATION",
        "<IPA, phonetic notation, or useful transliteration>",
        "",
        "SENSES",
        "- [<part of speech>] <meaning in the target language>",
        "<repeat for each useful common sense>",
        "",
        "EXAMPLES",
        "1. <example in the source language>",
        "<translation in the target language>",
        "<provide at least three natural examples>",
        "",
        "ETYMOLOGY",
        "<concise etymology in the target language>",
        "",
        "SOURCE WORD:",
        request.source,
      ].join("\n"),
    };
  }

  const targetLanguageAction = ["summarize", "what", "how", "why"].includes(
    request.actionId,
  );
  const languageInstructions =
    request.actionId === "polish"
      ? [
          `Source language: ${languageName(request.sourceLanguage)}.`,
          `Output language: ${languageName(request.sourceLanguage)}.`,
          "The output must remain in the source language. Do not translate the source into any other language.",
        ]
      : targetLanguageAction
        ? [
            `Source language: ${languageName(request.sourceLanguage)}.`,
            `Output language: ${languageName(request.targetLanguage)}.`,
            "The entire result must be written in the target language.",
          ]
        : [
          `Source language: ${languageName(request.sourceLanguage)}.`,
          `Target language: ${languageName(request.targetLanguage)}.`,
          ];

  return {
    system,
    user: [
      actionInstruction,
      ...languageInstructions,
      "",
      "SOURCE:",
      request.source,
    ].join("\n"),
  };
}
