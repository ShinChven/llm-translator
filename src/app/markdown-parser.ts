export type InlineNode =
  | { type: "text"; value: string }
  | { type: "break" }
  | { type: "code"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "emphasis"; children: InlineNode[] }
  | { type: "strike"; children: InlineNode[] }
  | { type: "link"; href: string; children: InlineNode[] };

export type TableAlignment = "left" | "center" | "right" | undefined;

export type BlockNode =
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "heading"; level: number; children: InlineNode[] }
  | { type: "code"; language: string; value: string }
  | { type: "blockquote"; children: BlockNode[] }
  | { type: "list"; ordered: boolean; start: number; items: BlockNode[][] }
  | {
      type: "table";
      alignments: TableAlignment[];
      header: InlineNode[][];
      rows: InlineNode[][][];
    }
  | { type: "divider" };

const ESCAPABLE = /[\\`*_{}[\]()#+\-.!>~|]/u;
const HEADING = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/u;
const FENCE = /^( {0,3})(`{3,}|~{3,})\s*([^`]*)$/u;
const DIVIDER = /^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/u;
const QUOTE = /^ {0,3}> ?/u;
const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])(\s+|$)(.*)$/u;
const TABLE_DELIMITER = /^ {0,3}\|?(?:\s*:?-+:?\s*\|)+\s*:?-*:?\s*\|?\s*$/u;
const SAFE_SCHEME = /^(?:https?|mailto|tel):/iu;
const BARE_URL = /^https?:\/\/[^\s<>()[\]]+[^\s<>()[\]".,;:!?]/u;

/**
 * Parses a Markdown document into blocks. The parser covers the subset that
 * language models actually emit — headings, lists, quotes, fenced code, pipe
 * tables, and inline emphasis, code, and links — and treats anything it does
 * not recognize as literal text, so raw HTML never reaches the DOM.
 */
export function parseMarkdown(markdown: string): BlockNode[] {
  const lines = markdown.replace(/\r\n?/gu, "\n").split("\n");
  return parseBlocks(lines);
}

function parseBlocks(lines: string[]): BlockNode[] {
  const blocks: BlockNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const [, indent, marker, language] = fence;
      const closing = new RegExp(`^ {0,3}${marker[0]}{${marker.length},}\\s*$`, "u");
      const content: string[] = [];
      index += 1;
      while (index < lines.length && !closing.test(lines[index])) {
        content.push(stripIndent(lines[index], indent.length));
        index += 1;
      }
      // An unterminated fence still renders as code so streaming output does
      // not flicker between paragraph and code block.
      if (index < lines.length) index += 1;
      blocks.push({
        type: "code",
        language: language.trim(),
        value: content.join("\n"),
      });
      continue;
    }

    if (DIVIDER.test(line)) {
      blocks.push({ type: "divider" });
      index += 1;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        children: parseInline(heading[2]),
      });
      index += 1;
      continue;
    }

    if (QUOTE.test(line)) {
      const quoted: string[] = [];
      while (index < lines.length && QUOTE.test(lines[index])) {
        quoted.push(lines[index].replace(QUOTE, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", children: parseBlocks(quoted) });
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const [list, next] = parseList(lines, index);
      blocks.push(list);
      index = next;
      continue;
    }

    if (
      line.includes("|") &&
      index + 1 < lines.length &&
      TABLE_DELIMITER.test(lines[index + 1])
    ) {
      const table = parseTable(lines, index);
      if (table) {
        blocks.push(table[0]);
        index = table[1];
        continue;
      }
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      const current = lines[index];
      if (
        paragraph.length &&
        (FENCE.test(current) ||
          DIVIDER.test(current) ||
          HEADING.test(current) ||
          QUOTE.test(current) ||
          LIST_ITEM.test(current))
      ) {
        break;
      }
      paragraph.push(current.trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", children: parseInline(paragraph.join("\n")) });
  }

  return blocks;
}

function stripIndent(line: string, width: number): string {
  let removed = 0;
  let index = 0;
  while (index < line.length && removed < width && /[ \t]/u.test(line[index])) {
    removed += line[index] === "\t" ? 4 : 1;
    index += 1;
  }
  return line.slice(index);
}

function parseList(lines: string[], start: number): [BlockNode, number] {
  const first = LIST_ITEM.exec(lines[start])!;
  const ordered = /\d/u.test(first[2]);
  const listIndent = first[1].length;
  const items: BlockNode[][] = [];
  let buffer: string[] = [];
  let contentIndent = first[1].length + first[2].length + (first[3] || " ").length;
  let index = start;

  const flush = () => {
    if (buffer.length) items.push(parseBlocks(buffer));
    buffer = [];
  };

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      // A blank line ends the list unless the next line continues an item.
      const next = lines[index + 1];
      if (
        next?.trim() &&
        !LIST_ITEM.test(next) &&
        indentWidth(next) < contentIndent
      ) {
        break;
      }
      if (!next?.trim() && index + 1 >= lines.length) break;
      buffer.push("");
      index += 1;
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item && item[1].length <= listIndent) {
      if (ordered !== /\d/u.test(item[2])) break;
      flush();
      contentIndent = item[1].length + item[2].length + (item[3] || " ").length;
      buffer.push(item[4]);
      index += 1;
      continue;
    }

    if (indentWidth(line) >= contentIndent || item) {
      buffer.push(stripIndent(line, contentIndent));
      index += 1;
      continue;
    }

    if (
      buffer.length &&
      buffer[buffer.length - 1].trim() &&
      !DIVIDER.test(line) &&
      !HEADING.test(line) &&
      !QUOTE.test(line) &&
      !FENCE.test(line)
    ) {
      // Lazy continuation of the item's paragraph.
      buffer.push(line.trim());
      index += 1;
      continue;
    }

    break;
  }

  flush();

  while (buffer.length && !buffer[buffer.length - 1].trim()) buffer.pop();

  const startNumber = ordered ? Number.parseInt(first[2], 10) || 1 : 1;
  return [{ type: "list", ordered, start: startNumber, items }, index];
}

function indentWidth(line: string): number {
  let width = 0;
  for (const char of line) {
    if (char === " ") width += 1;
    else if (char === "\t") width += 4;
    else break;
  }
  return width;
}

function parseTable(
  lines: string[],
  start: number,
): [BlockNode, number] | undefined {
  const header = splitRow(lines[start]);
  const alignments = splitRow(lines[start + 1]).map<TableAlignment>((cell) => {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    if (left) return "left";
    return undefined;
  });

  if (!header.length || header.length !== alignments.length) return undefined;

  const rows: InlineNode[][][] = [];
  let index = start + 2;
  while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
    const cells = splitRow(lines[index]);
    rows.push(
      Array.from({ length: header.length }, (_unused, column) =>
        parseInline(cells[column] ?? ""),
      ),
    );
    index += 1;
  }

  return [
    {
      type: "table",
      alignments,
      header: header.map(parseInline),
      rows,
    },
    index,
  ];
}

function splitRow(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let index = 0;
  const trimmed = line.trim().replace(/^\|/u, "").replace(/(?<!\\)\|$/u, "");

  while (index < trimmed.length) {
    const char = trimmed[index];
    if (char === "\\" && trimmed[index + 1] === "|") {
      cell += "|";
      index += 2;
      continue;
    }
    if (char === "|") {
      cells.push(cell.trim());
      cell = "";
      index += 1;
      continue;
    }
    cell += char;
    index += 1;
  }
  cells.push(cell.trim());
  return cells;
}

const EMPHASIS_MARKERS = ["***", "___", "**", "__", "~~", "*", "_"] as const;

export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let buffer = "";
  let index = 0;

  const flush = () => {
    if (buffer) nodes.push({ type: "text", value: buffer });
    buffer = "";
  };

  while (index < text.length) {
    const char = text[index];

    if (char === "\\" && ESCAPABLE.test(text[index + 1] ?? "")) {
      buffer += text[index + 1];
      index += 2;
      continue;
    }

    if (char === "\n") {
      buffer = buffer.replace(/[ \t]+$/u, "");
      flush();
      nodes.push({ type: "break" });
      index += 1;
      continue;
    }

    if (char === "`") {
      const code = readCode(text, index);
      if (code) {
        flush();
        nodes.push(code[0]);
        index = code[1];
        continue;
      }
    }

    if (char === "[" || (char === "!" && text[index + 1] === "[")) {
      const link = readLink(text, index);
      if (link) {
        flush();
        nodes.push(...link[0]);
        index = link[1];
        continue;
      }
    }

    if (char === "<") {
      const end = text.indexOf(">", index + 1);
      const inner = end === -1 ? "" : text.slice(index + 1, end);
      if (inner && !/\s/u.test(inner) && SAFE_SCHEME.test(inner)) {
        flush();
        nodes.push({
          type: "link",
          href: inner,
          children: [{ type: "text", value: inner }],
        });
        index = end + 1;
        continue;
      }
    }

    if (
      (char === "h" || char === "H") &&
      isBoundary(text[index - 1]) &&
      BARE_URL.test(text.slice(index))
    ) {
      const url = BARE_URL.exec(text.slice(index))![0];
      flush();
      nodes.push({
        type: "link",
        href: url,
        children: [{ type: "text", value: url }],
      });
      index += url.length;
      continue;
    }

    const emphasis = readEmphasis(text, index);
    if (emphasis) {
      flush();
      nodes.push(emphasis[0]);
      index = emphasis[1];
      continue;
    }

    buffer += char;
    index += 1;
  }

  flush();
  return nodes;
}

function readCode(text: string, start: number): [InlineNode, number] | undefined {
  let length = 0;
  while (text[start + length] === "`") length += 1;
  const marker = "`".repeat(length);

  let search = start + length;
  let close = -1;
  while (search < text.length) {
    const found = text.indexOf(marker, search);
    if (found === -1) break;
    let end = found + length;
    if (text[end] === "`") {
      while (text[end] === "`") end += 1;
      search = end;
      continue;
    }
    close = found;
    break;
  }

  if (close === -1) return undefined;

  let value = text.slice(start + length, close).replace(/\n/gu, " ");
  if (value.length > 2 && value.startsWith(" ") && value.endsWith(" ")) {
    value = value.slice(1, -1);
  }
  return [{ type: "code", value }, close + length];
}

function readLink(
  text: string,
  start: number,
): [InlineNode[], number] | undefined {
  const image = text[start] === "!";
  const labelStart = image ? start + 2 : start + 1;
  let depth = 1;
  let index = labelStart;

  while (index < text.length && depth > 0) {
    const char = text[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;
    index += 1;
  }

  if (depth !== 0 || text[index] !== "(") return undefined;

  const label = text.slice(labelStart, index - 1);
  let cursor = index + 1;
  let destination = "";
  depth = 1;

  while (cursor < text.length) {
    const char = text[cursor];
    if (char === "\\") {
      destination += text[cursor + 1] ?? "";
      cursor += 2;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) break;
    }
    if (char === "\n") return undefined;
    destination += char;
    cursor += 1;
  }

  if (depth !== 0) return undefined;

  const href = safeHref(destination.trim().replace(/\s+["'(].*$/u, ""));
  const children = parseInline(label);
  const end = cursor + 1;

  if (!href) {
    // Unsupported or unsafe destination: keep the visible label as plain text.
    return [children, end];
  }

  // Images render as links: the side panel never loads remote media.
  return [
    [
      {
        type: "link",
        href,
        children: children.length ? children : [{ type: "text", value: href }],
      },
    ],
    end,
  ];
}

function safeHref(destination: string): string | undefined {
  const value = destination.trim();
  if (!value) return undefined;
  if (SAFE_SCHEME.test(value)) return value;
  if (/^[a-z][a-z0-9+.-]*:/iu.test(value)) return undefined;
  if (value.startsWith("//")) return `https:${value}`;
  if (/^www\./iu.test(value)) return `https://${value}`;
  return undefined;
}

function isBoundary(char: string | undefined): boolean {
  return char === undefined || /[\s(<[]/u.test(char);
}

function readEmphasis(
  text: string,
  start: number,
): [InlineNode, number] | undefined {
  const marker = EMPHASIS_MARKERS.find((candidate) =>
    text.startsWith(candidate, start),
  );
  if (!marker) return undefined;

  const after = text[start + marker.length];
  if (!after || /\s/u.test(after)) return undefined;
  if (marker[0] === "_" && /[\p{L}\p{N}]/u.test(text[start - 1] ?? "")) {
    return undefined;
  }

  let index = start + marker.length;
  while (index < text.length) {
    if (text[index] === "\\") {
      index += 2;
      continue;
    }
    if (text.startsWith(marker, index)) {
      const before = text[index - 1];
      const next = text[index + marker.length];
      const closes =
        before !== undefined &&
        !/\s/u.test(before) &&
        (marker[0] !== "_" || !/[\p{L}\p{N}]/u.test(next ?? ""));
      if (closes) {
        const inner = parseInline(text.slice(start + marker.length, index));
        const end = index + marker.length;
        if (marker === "***" || marker === "___") {
          return [
            { type: "strong", children: [{ type: "emphasis", children: inner }] },
            end,
          ];
        }
        if (marker === "**" || marker === "__") {
          return [{ type: "strong", children: inner }, end];
        }
        if (marker === "~~") {
          return [{ type: "strike", children: inner }, end];
        }
        return [{ type: "emphasis", children: inner }, end];
      }
    }
    index += 1;
  }

  return undefined;
}

/** Flattens inline nodes back to their visible text. */
export function inlineText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
        case "code":
          return node.value;
        case "break":
          return "\n";
        default:
          return inlineText(node.children);
      }
    })
    .join("");
}
