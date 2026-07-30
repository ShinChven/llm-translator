const TRADITIONAL_CHINESE_HINTS =
  /[萬與專業東絲兩嚴喪個豐臨為麗舉麼義烏樂喬習鄉書買亂爭於雲亞產畝親複觀見說這還進過開關時國會學體點應發後裡來們無將從長門問間電車馬風飛]/;

interface LatinProfile {
  /** Letters that are close to unique to this language among the Latin set. */
  signature?: RegExp;
  /** Letters this language shares with a handful of its neighbours. */
  accents?: RegExp;
  /** Frequent function words, the strongest signal for undecorated text. */
  words: ReadonlySet<string>;
}

/**
 * Ordered by how often the extension sees each language, because an exact
 * score tie resolves to the first entry.
 */
const LATIN_PROFILES: Array<[string, LatinProfile]> = [
  [
    "en",
    {
      words: new Set([
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
        "in",
        "of",
        "it",
      ]),
    },
  ],
  [
    "es",
    {
      signature: /[ñ¿¡]/gi,
      accents: /[áéíóúü]/gi,
      words: new Set([
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
        "está",
        "y",
        "del",
        "se",
      ]),
    },
  ],
  [
    "fr",
    {
      signature: /[œ]/gi,
      accents: /[àâæçéèêëîïôùûÿ]/gi,
      words: new Set([
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
        "du",
        "qui",
        "ce",
        "et",
      ]),
    },
  ],
  [
    "de",
    {
      signature: /[ß]/gi,
      accents: /[äöü]/gi,
      words: new Set([
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
        "sich",
        "auch",
        "dem",
        "ich",
        "sie",
        "wir",
        "wie",
        "war",
        "aber",
        "noch",
        "sind",
      ]),
    },
  ],
  [
    "pt",
    {
      signature: /[ãõ]/gi,
      accents: /[áâêôçéíóú]/gi,
      words: new Set([
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
        "do",
        "da",
        "são",
      ]),
    },
  ],
  [
    "it",
    {
      accents: /[àèéìòù]/gi,
      words: new Set([
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
        "di",
        "è",
        "nel",
      ]),
    },
  ],
  [
    "nl",
    {
      accents: /[éë]/gi,
      words: new Set([
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
        "te",
        "aan",
      ]),
    },
  ],
  [
    "pl",
    {
      signature: /[ąćęłńśźż]/gi,
      accents: /[ó]/gi,
      words: new Set([
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
        "są",
        "być",
      ]),
    },
  ],
  [
    "tr",
    {
      signature: /[ıİğ]/g,
      accents: /[şçöü]/gi,
      words: new Set([
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
    },
  ],
  [
    "ro",
    {
      signature: /[șț]/gi,
      accents: /[ăâîşţ]/gi,
      words: new Set([
        "și",
        "de",
        "la",
        "în",
        "cu",
        "nu",
        "este",
        "pentru",
        "care",
        "ca",
        "pe",
        "din",
        "mai",
        "sunt",
      ]),
    },
  ],
  [
    "cs",
    {
      signature: /[ěřůďťň]/gi,
      accents: /[áéíýóúčšž]/gi,
      words: new Set([
        "a",
        "je",
        "to",
        "se",
        "na",
        "že",
        "v",
        "s",
        "do",
        "ale",
        "jako",
        "pro",
        "být",
        "není",
        "který",
        "jsou",
        "také",
        "jen",
        "jsem",
      ]),
    },
  ],
  [
    "sk",
    {
      signature: /[ĺľŕô]/gi,
      accents: /[áéíýóúčšžťďň]/gi,
      words: new Set([
        "a",
        "je",
        "to",
        "sa",
        "na",
        "že",
        "v",
        "s",
        "do",
        "ale",
        "ako",
        "pre",
        "byť",
        "nie",
        "ktorý",
        "sú",
        "aj",
        "iba",
        "som",
      ]),
    },
  ],
  [
    "hu",
    {
      signature: /[őű]/gi,
      accents: /[áéíóöúü]/gi,
      words: new Set([
        "a",
        "az",
        "és",
        "hogy",
        "nem",
        "is",
        "de",
        "egy",
        "meg",
        "ki",
        "van",
        "már",
        "csak",
        "volt",
      ]),
    },
  ],
  [
    "sv",
    {
      accents: /[åäö]/gi,
      words: new Set([
        "och",
        "att",
        "det",
        "som",
        "en",
        "är",
        "för",
        "på",
        "med",
        "av",
        "inte",
        "den",
        "till",
        "har",
        "ett",
      ]),
    },
  ],
  [
    "da",
    {
      signature: /[æø]/gi,
      accents: /[å]/gi,
      words: new Set([
        "og",
        "at",
        "det",
        "som",
        "en",
        "er",
        "for",
        "på",
        "med",
        "af",
        "ikke",
        "den",
        "til",
        "har",
        "et",
        "jeg",
        "meget",
        "sådan",
      ]),
    },
  ],
  [
    "no",
    {
      signature: /[æø]/gi,
      accents: /[å]/gi,
      words: new Set([
        "og",
        "at",
        "det",
        "som",
        "en",
        "er",
        "for",
        "på",
        "med",
        "av",
        "ikke",
        "den",
        "til",
        "har",
        "eller",
        "å",
        "jeg",
        "mye",
      ]),
    },
  ],
  [
    "fi",
    {
      accents: /[äö]/gi,
      words: new Set([
        "ja",
        "on",
        "ei",
        "se",
        "että",
        "kuin",
        "mutta",
        "hän",
        "ne",
        "kun",
        "niin",
        "olla",
        "joka",
        "ovat",
      ]),
    },
  ],
  [
    "hr",
    {
      signature: /[ćđ]/gi,
      accents: /[čšž]/gi,
      words: new Set([
        "i",
        "je",
        "na",
        "se",
        "za",
        "da",
        "su",
        "od",
        "koji",
        "ali",
        "kao",
        "što",
        "nije",
      ]),
    },
  ],
  [
    "sl",
    {
      accents: /[čšž]/gi,
      words: new Set([
        "in",
        "je",
        "na",
        "se",
        "za",
        "da",
        "so",
        "od",
        "ki",
        "pa",
        "ali",
        "kot",
        "ni",
        "v",
        "to",
        "tudi",
        "lahko",
        "sem",
        "zelo",
      ]),
    },
  ],
  [
    "vi",
    {
      signature:
        /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/gi,
      words: new Set([
        "và",
        "của",
        "là",
        "các",
        "có",
        "được",
        "trong",
        "người",
        "không",
        "cho",
        "với",
        "này",
      ]),
    },
  ],
  [
    "id",
    {
      words: new Set([
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
        "karena",
        "bisa",
      ]),
    },
  ],
  [
    "ms",
    {
      words: new Set([
        "dan",
        "yang",
        "ini",
        "itu",
        "untuk",
        "dengan",
        "tidak",
        "dari",
        "pada",
        "ialah",
        "kerana",
        "boleh",
        "sahaja",
        "bahawa",
        "awak",
      ]),
    },
  ],
  [
    "ca",
    {
      accents: /[àèéíòóúç]/gi,
      words: new Set([
        "el",
        "la",
        "els",
        "les",
        "de",
        "que",
        "amb",
        "per",
        "una",
        "no",
        "és",
        "aquest",
        "això",
        "què",
        "són",
      ]),
    },
  ],
  [
    "et",
    {
      signature: /[õ]/gi,
      accents: /[äöü]/gi,
      words: new Set([
        "ja",
        "on",
        "ei",
        "see",
        "et",
        "kui",
        "aga",
        "ta",
        "oli",
        "ka",
        "nii",
        "või",
        "kes",
      ]),
    },
  ],
  [
    "lt",
    {
      signature: /[ėįųū]/gi,
      accents: /[ąčęšž]/gi,
      words: new Set([
        "ir",
        "yra",
        "su",
        "kad",
        "ne",
        "tai",
        "bet",
        "kaip",
        "nuo",
        "per",
        "arba",
        "buvo",
      ]),
    },
  ],
  [
    "lv",
    {
      signature: /[āēīūģķļņ]/gi,
      accents: /[čšž]/gi,
      words: new Set([
        "un",
        "ir",
        "ar",
        "ka",
        "nav",
        "bet",
        "kā",
        "no",
        "par",
        "tas",
        "vai",
        "tiek",
      ]),
    },
  ],
  [
    "is",
    {
      signature: /[þð]/gi,
      accents: /[áéíóúýæö]/gi,
      words: new Set([
        "og",
        "að",
        "er",
        "í",
        "á",
        "sem",
        "með",
        "ekki",
        "það",
        "við",
        "hann",
        "eru",
      ]),
    },
  ],
  [
    "cy",
    {
      signature: /[ŵŷ]/gi,
      words: new Set([
        "yn",
        "yr",
        "ar",
        "bod",
        "gyda",
        "mae",
        "ei",
        "wedi",
        "hyn",
        "sydd",
        "am",
        "ond",
      ]),
    },
  ],
  [
    "af",
    {
      words: new Set([
        "die",
        "en",
        "van",
        "het",
        "is",
        "nie",
        "vir",
        "met",
        "wat",
        "ook",
        "hulle",
        "word",
      ]),
    },
  ],
  [
    "sw",
    {
      words: new Set([
        "na",
        "ya",
        "wa",
        "kwa",
        "ni",
        "katika",
        "kama",
        "hii",
        "sio",
        "kuwa",
        "yake",
        "hiyo",
      ]),
    },
  ],
];

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

/** Distinct letters matched, so one repeated character cannot carry a language. */
function countDistinctMatches(text: string, pattern?: RegExp): number {
  if (!pattern) return 0;
  const matches = text.match(pattern);
  if (!matches) return 0;
  return new Set(matches.map((letter) => letter.toLocaleLowerCase())).size;
}

/**
 * Scores every candidate instead of returning the first language whose
 * diacritics appear. Most accented letters are shared — "ç" belongs to French,
 * Portuguese, Catalan and Turkish alike — so first-match ordering mislabels
 * ordinary text, and for Refine a mislabelled source becomes a translation.
 */
function detectLatinLanguage(text: string): string {
  const words = text.toLocaleLowerCase().match(/\p{L}+/gu) ?? [];

  const scores = LATIN_PROFILES.map(([language, profile]) => {
    const wordHits = words.reduce(
      (total, word) => total + (profile.words.has(word) ? 1 : 0),
      0,
    );

    return [
      language,
      Math.min(wordHits, 8) * 3 +
        Math.min(countDistinctMatches(text, profile.signature), 3) * 5 +
        Math.min(countDistinctMatches(text, profile.accents), 3),
    ] as const;
  });

  let best: (typeof scores)[number] = ["en", 0];
  for (const candidate of scores) {
    if (candidate[1] > best[1]) best = candidate;
  }

  return best[1] > 0 ? best[0] : "en";
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
