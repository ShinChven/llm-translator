import { Markdown } from "./Markdown";

interface WordSense {
  partOfSpeech?: string;
  definition: string;
}

interface WordExample {
  source: string;
  translation?: string;
}

interface ParsedWordResult {
  word: string;
  pronunciation?: string;
  senses: WordSense[];
  examples: WordExample[];
  etymology?: string;
}

type SectionName =
  | "word"
  | "pronunciation"
  | "senses"
  | "examples"
  | "etymology";

const SECTION_NAMES: Record<string, SectionName> = {
  WORD: "word",
  PRONUNCIATION: "pronunciation",
  SENSES: "senses",
  EXAMPLES: "examples",
  ETYMOLOGY: "etymology",
};

function sectionName(line: string): SectionName | undefined {
  const normalized = line
    .replace(/^[\s#>*-]+/u, "")
    .replace(/\*\*/gu, "")
    .replace(/:$/u, "")
    .trim()
    .toLocaleUpperCase();
  return SECTION_NAMES[normalized];
}

function cleanListMarker(line: string): string {
  return line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/u, "").trim();
}

function parseSenses(lines: string[]): WordSense[] {
  return lines
    .map(cleanListMarker)
    .filter(Boolean)
    .map((line) => {
      const bracketed = line.match(/^\[([^\]]+)\]\s*(.+)$/u);
      if (bracketed) {
        return {
          partOfSpeech: bracketed[1].trim(),
          definition: bracketed[2].trim(),
        };
      }

      const labelled = line.match(/^([^:]{1,24}):\s+(.+)$/u);
      if (labelled) {
        return {
          partOfSpeech: labelled[1].trim(),
          definition: labelled[2].trim(),
        };
      }

      return { definition: line };
    });
}

function splitExampleLine(line: string): WordExample | undefined {
  const parts = line.split(/\s+(?:→|=>|—|–)\s+/u);
  if (parts.length < 2) return undefined;
  return {
    source: parts[0].trim(),
    translation: parts.slice(1).join(" ").trim(),
  };
}

function parseExamples(lines: string[]): WordExample[] {
  const groups: string[][] = [];
  let current: string[] | undefined;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const numbered = line.match(/^\d+[.)]\s*(.+)$/u);
    if (numbered) {
      current = [numbered[1].trim()];
      groups.push(current);
      continue;
    }

    if (!current) {
      current = [cleanListMarker(line)];
      groups.push(current);
    } else {
      current.push(cleanListMarker(line));
    }
  }

  if (groups.length === 1 && groups[0].length > 3) {
    const flatLines = groups[0];
    groups.length = 0;
    for (let index = 0; index < flatLines.length; index += 2) {
      groups.push(flatLines.slice(index, index + 2));
    }
  }

  return groups
    .map((group) => {
      const inline = splitExampleLine(group[0]);
      if (inline && group.length === 1) return inline;
      return {
        source: group[0],
        translation:
          group.length > 1 ? group.slice(1).join(" ").trim() : undefined,
      };
    })
    .filter((example) => example.source);
}

function parseWordResult(result: string): ParsedWordResult | undefined {
  const sections: Record<SectionName, string[]> = {
    word: [],
    pronunciation: [],
    senses: [],
    examples: [],
    etymology: [],
  };
  let currentSection: SectionName | undefined;
  let recognizedSections = 0;

  for (const line of result.replace(/\r\n?/gu, "\n").split("\n")) {
    const nextSection = sectionName(line);
    if (nextSection) {
      currentSection = nextSection;
      recognizedSections += 1;
      continue;
    }
    if (currentSection) sections[currentSection].push(line);
  }

  const word = sections.word.map((line) => line.trim()).filter(Boolean).join(" ");
  if (!word || recognizedSections < 2) return undefined;

  return {
    word,
    pronunciation:
      sections.pronunciation
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ") || undefined,
    senses: parseSenses(sections.senses),
    examples: parseExamples(sections.examples),
    etymology:
      sections.etymology
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ") || undefined,
  };
}

export function WordResult({ result }: { result: string }) {
  const entry = parseWordResult(result);

  if (!entry) return <Markdown className="result-markdown" text={result} />;

  return (
    <article className="word-result">
      <header className="word-hero">
        <div className="word-title">{entry.word}</div>
        {entry.pronunciation && (
          <div className="word-pronunciation">{entry.pronunciation}</div>
        )}
      </header>

      {entry.senses.length > 0 && (
        <section className="dictionary-section">
          <h3>Meanings</h3>
          <ol className="sense-list">
            {entry.senses.map((sense, index) => (
              <li key={`${sense.definition}-${index}`}>
                {sense.partOfSpeech && (
                  <span className="part-of-speech">{sense.partOfSpeech}</span>
                )}
                <span>{sense.definition}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {entry.examples.length > 0 && (
        <section className="dictionary-section">
          <h3>Examples</h3>
          <ol className="example-list">
            {entry.examples.map((example, index) => (
              <li key={`${example.source}-${index}`}>
                <div>{example.source}</div>
                {example.translation && <p>{example.translation}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {entry.etymology && (
        <section className="dictionary-section etymology">
          <h3>Etymology</h3>
          <p>{entry.etymology}</p>
        </section>
      )}
    </article>
  );
}
