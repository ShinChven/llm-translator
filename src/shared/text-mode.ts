export function isSingleWord(text: string, language: string): boolean {
  const normalized = text.trim();
  if (!normalized || normalized.length > 64 || normalized.includes("\n")) {
    return false;
  }

  if (typeof Intl.Segmenter !== "function") {
    return normalized.split(/\s+/u).length === 1;
  }

  const segmenter = new Intl.Segmenter(language, { granularity: "word" });
  const wordSegments = Array.from(segmenter.segment(normalized)).filter(
    (segment) => segment.isWordLike,
  );

  return wordSegments.length === 1;
}
