const TRADITIONAL_CHINESE_HINTS =
  /[萬與專業東絲兩嚴喪個豐臨為麗舉麼義烏樂喬習鄉書買亂爭於雲亞產畝親複觀見說這還進過開關時國會學體點應發後裡來們無將從長門問間電車馬風飛]/;

const LATIN_LANGUAGE_WORDS: Record<string, ReadonlySet<string>> = {
  en: new Set([
    "the",
    "and",
    "is",
    "are",
    "this",
    "that",
    "with",
    "for",
    "from",
    "you",
    "your",
    "not",
    "have",
    "will",
  ]),
  es: new Set([
    "el",
    "la",
    "los",
    "las",
    "de",
    "que",
    "en",
    "para",
    "con",
    "una",
    "por",
    "como",
    "pero",
    "esta",
  ]),
  fr: new Set([
    "le",
    "la",
    "les",
    "des",
    "une",
    "est",
    "dans",
    "pour",
    "avec",
    "que",
    "pas",
    "vous",
    "nous",
    "sur",
  ]),
  de: new Set([
    "der",
    "die",
    "das",
    "und",
    "ist",
    "nicht",
    "mit",
    "für",
    "auf",
    "ein",
    "eine",
    "den",
    "von",
    "zu",
  ]),
  it: new Set([
    "il",
    "lo",
    "la",
    "gli",
    "che",
    "per",
    "con",
    "una",
    "non",
    "sono",
    "del",
    "della",
    "come",
    "questo",
  ]),
  pt: new Set([
    "o",
    "a",
    "os",
    "as",
    "de",
    "que",
    "em",
    "para",
    "com",
    "uma",
    "não",
    "por",
    "como",
    "esta",
  ]),
  nl: new Set([
    "de",
    "het",
    "een",
    "en",
    "van",
    "voor",
    "met",
    "niet",
    "dat",
    "zijn",
    "op",
    "als",
    "ook",
    "dit",
  ]),
  pl: new Set([
    "i",
    "w",
    "na",
    "nie",
    "jest",
    "to",
    "z",
    "że",
    "dla",
    "się",
    "jak",
    "do",
    "oraz",
    "ten",
  ]),
  tr: new Set([
    "ve",
    "bir",
    "bu",
    "için",
    "ile",
    "de",
    "da",
    "değil",
    "olan",
    "olarak",
    "çok",
    "daha",
    "var",
    "ne",
  ]),
  id: new Set([
    "dan",
    "yang",
    "ini",
    "itu",
    "untuk",
    "dengan",
    "tidak",
    "dari",
    "pada",
    "adalah",
    "akan",
    "juga",
    "sebagai",
    "saya",
  ]),
};

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function detectLatinLanguage(text: string): string {
  if (/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(text)) {
    return "vi";
  }
  if (/[ıİğĞşŞçÇöÖüÜ]/.test(text)) return "tr";
  if (/[ñ¿¡]/i.test(text)) return "es";
  if (/[ąćęłńóśźż]/i.test(text)) return "pl";
  if (/[ãõáâêôç]/i.test(text)) return "pt";
  if (/[àâæçéèêëîïôœùûüÿ]/i.test(text)) return "fr";
  if (/[äöüß]/i.test(text)) return "de";
  if (/[ăâîșşțţ]/i.test(text)) return "ro";
  if (/[čďěňřšťůž]/i.test(text)) return "cs";
  if (/[áéíóöőúüű]/i.test(text)) return "hu";

  const words = text.toLocaleLowerCase().match(/\p{L}+/gu) ?? [];
  const scores = Object.entries(LATIN_LANGUAGE_WORDS).map(([language, known]) => [
    language,
    words.reduce((score, word) => score + (known.has(word) ? 1 : 0), 0),
  ] as const);
  scores.sort((left, right) => right[1] - left[1]);

  return scores[0]?.[1] > 0 ? scores[0][0] : "en";
}

export function detectLanguage(text: string): string {
  const sample = text.trim().slice(0, 2000);
  if (!sample) return "en";

  const scriptCandidates: Array<[string, number]> = [
    ["ja", countMatches(sample, /[\u3040-\u30ff]/g) * 3],
    ["ko", countMatches(sample, /[\uac00-\ud7af]/g) * 3],
    ["zh", countMatches(sample, /[\u3400-\u9fff]/g)],
    ["th", countMatches(sample, /[\u0e00-\u0e7f]/g) * 3],
    ["he", countMatches(sample, /[\u0590-\u05ff]/g) * 3],
    ["el", countMatches(sample, /[\u0370-\u03ff]/g) * 3],
    ["ka", countMatches(sample, /[\u10a0-\u10ff]/g) * 3],
    ["hy", countMatches(sample, /[\u0530-\u058f]/g) * 3],
    ["bn", countMatches(sample, /[\u0980-\u09ff]/g) * 3],
    ["gu", countMatches(sample, /[\u0a80-\u0aff]/g) * 3],
    ["pa", countMatches(sample, /[\u0a00-\u0a7f]/g) * 3],
    ["ta", countMatches(sample, /[\u0b80-\u0bff]/g) * 3],
    ["te", countMatches(sample, /[\u0c00-\u0c7f]/g) * 3],
    ["kn", countMatches(sample, /[\u0c80-\u0cff]/g) * 3],
    ["ml", countMatches(sample, /[\u0d00-\u0d7f]/g) * 3],
  ];

  if (/[\u0600-\u06ff]/.test(sample)) {
    if (/[پچژگک]/.test(sample)) return "fa";
    if (/[ٹڈڑںھہئے]/.test(sample)) return "ur";
    return "ar";
  }

  if (/[\u0900-\u097f]/.test(sample)) return "hi";

  if (/[\u0400-\u04ff]/.test(sample)) {
    if (/[ґєії]/i.test(sample)) return "uk";
    if (/[ъщ]/i.test(sample)) return "bg";
    return "ru";
  }

  scriptCandidates.sort((left, right) => right[1] - left[1]);
  const [script, score] = scriptCandidates[0];
  if (score > 0) {
    if (script === "zh") {
      return TRADITIONAL_CHINESE_HINTS.test(sample) ? "zh-TW" : "zh-CN";
    }
    return script;
  }

  return detectLatinLanguage(sample);
}

export function fallbackTargetLanguage(_sourceLanguage: string): string {
  return "en";
}
