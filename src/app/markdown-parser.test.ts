import assert from "node:assert/strict";
import test from "node:test";
import { inlineText, parseInline, parseMarkdown } from "./markdown-parser.ts";

test("parses headings and paragraphs", () => {
  const blocks = parseMarkdown("# Title\n\nSome text.\n");

  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[0], {
    type: "heading",
    level: 1,
    children: [{ type: "text", value: "Title" }],
  });
  assert.equal(blocks[1].type, "paragraph");
});

test("keeps single newlines inside a paragraph as line breaks", () => {
  const [block] = parseMarkdown("first line\nsecond line");

  assert.equal(block.type, "paragraph");
  assert.deepEqual(block.type === "paragraph" ? block.children : [], [
    { type: "text", value: "first line" },
    { type: "break" },
    { type: "text", value: "second line" },
  ]);
});

test("parses emphasis, strong, strike, and inline code", () => {
  const nodes = parseInline("**bold** *italic* ~~gone~~ `code`");

  assert.deepEqual(nodes[0], {
    type: "strong",
    children: [{ type: "text", value: "bold" }],
  });
  assert.deepEqual(nodes[2], {
    type: "emphasis",
    children: [{ type: "text", value: "italic" }],
  });
  assert.deepEqual(nodes[4], {
    type: "strike",
    children: [{ type: "text", value: "gone" }],
  });
  assert.deepEqual(nodes[6], { type: "code", value: "code" });
});

test("leaves unpaired markers and snake_case words alone", () => {
  assert.deepEqual(parseInline("2 * 3 * 4"), [
    { type: "text", value: "2 * 3 * 4" },
  ]);
  assert.deepEqual(parseInline("some_variable_name"), [
    { type: "text", value: "some_variable_name" },
  ]);
  assert.deepEqual(parseInline("\\*not emphasis\\*"), [
    { type: "text", value: "*not emphasis*" },
  ]);
});

test("does not treat text inside code spans as markup", () => {
  const nodes = parseInline("use `**literal**` here");

  assert.deepEqual(nodes[1], { type: "code", value: "**literal**" });
});

test("renders links and rejects unsafe destinations", () => {
  assert.deepEqual(parseInline("[docs](https://example.com/a)"), [
    {
      type: "link",
      href: "https://example.com/a",
      children: [{ type: "text", value: "docs" }],
    },
  ]);

  assert.deepEqual(parseInline("[click](javascript:alert(1))"), [
    { type: "text", value: "click" },
  ]);

  assert.deepEqual(parseInline("<https://example.com>"), [
    {
      type: "link",
      href: "https://example.com",
      children: [{ type: "text", value: "https://example.com" }],
    },
  ]);

  const bare = parseInline("see https://example.com/x now");
  assert.equal(bare[1].type, "link");
  assert.equal(bare[1].type === "link" ? bare[1].href : "", "https://example.com/x");
});

test("keeps raw HTML as literal text", () => {
  const [block] = parseMarkdown("<img src=x onerror=alert(1)>");

  assert.equal(block.type, "paragraph");
  assert.equal(
    inlineText(block.type === "paragraph" ? block.children : []),
    "<img src=x onerror=alert(1)>",
  );
});

test("parses fenced code blocks with a language", () => {
  const [block] = parseMarkdown("```ts\nconst a = 1;\n\nconst b = 2;\n```");

  assert.deepEqual(block, {
    type: "code",
    language: "ts",
    value: "const a = 1;\n\nconst b = 2;",
  });
});

test("renders an unterminated fence as code while streaming", () => {
  const [block] = parseMarkdown("```\npartial output");

  assert.deepEqual(block, { type: "code", language: "", value: "partial output" });
});

test("parses nested and ordered lists", () => {
  const [block] = parseMarkdown("- one\n- two\n  - nested\n");

  assert.equal(block.type, "list");
  if (block.type !== "list") return;
  assert.equal(block.ordered, false);
  assert.equal(block.items.length, 2);
  assert.equal(block.items[1].length, 2);
  assert.equal(block.items[1][1].type, "list");

  const [ordered] = parseMarkdown("3. third\n4. fourth");
  assert.equal(ordered.type, "list");
  if (ordered.type !== "list") return;
  assert.equal(ordered.ordered, true);
  assert.equal(ordered.start, 3);
  assert.equal(ordered.items.length, 2);
});

test("parses block quotes with nested blocks", () => {
  const [block] = parseMarkdown("> quoted line\n> - item");

  assert.equal(block.type, "blockquote");
  if (block.type !== "blockquote") return;
  assert.equal(block.children[0].type, "paragraph");
  assert.equal(block.children[1].type, "list");
});

test("parses pipe tables with alignments", () => {
  const [block] = parseMarkdown(
    ["| Term | Meaning |", "| :--- | ---: |", "| hola | hello |"].join("\n"),
  );

  assert.equal(block.type, "table");
  if (block.type !== "table") return;
  assert.deepEqual(block.alignments, ["left", "right"]);
  assert.deepEqual(block.header.map(inlineText), ["Term", "Meaning"]);
  assert.deepEqual(
    block.rows.map((row) => row.map(inlineText)),
    [["hola", "hello"]],
  );
});

test("parses thematic breaks", () => {
  assert.deepEqual(parseMarkdown("---"), [{ type: "divider" }]);
  assert.deepEqual(parseMarkdown("***"), [{ type: "divider" }]);
});

test("starts a new block when a list follows a paragraph without a blank line", () => {
  const blocks = parseMarkdown("Summary:\n- first\n- second");

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, "paragraph");
  assert.equal(blocks[1].type, "list");
});
