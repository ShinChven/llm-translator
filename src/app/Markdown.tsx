import { Fragment, useMemo, type JSX, type ReactNode } from "react";
import { parseMarkdown, type BlockNode, type InlineNode } from "./markdown-parser";

interface MarkdownProps {
  text: string;
  className?: string;
}

/**
 * Renders Markdown as React elements. Nothing is inserted through
 * `dangerouslySetInnerHTML`, so model output cannot inject markup.
 */
export function Markdown({ text, className }: MarkdownProps) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  return (
    <div className={className ? `markdown ${className}` : "markdown"}>
      {renderBlocks(blocks)}
    </div>
  );
}

function renderBlocks(blocks: BlockNode[]): ReactNode {
  return blocks.map((block, index) => (
    <Fragment key={index}>{renderBlock(block)}</Fragment>
  ));
}

function renderBlock(block: BlockNode): ReactNode {
  switch (block.type) {
    case "paragraph":
      return <p>{renderInline(block.children)}</p>;
    case "heading": {
      const Heading = `h${Math.min(block.level + 2, 6)}` as keyof JSX.IntrinsicElements;
      return (
        <Heading className={`markdown-heading level-${block.level}`}>
          {renderInline(block.children)}
        </Heading>
      );
    }
    case "code":
      return (
        <div className="markdown-code-block">
          {block.language && (
            <div className="markdown-code-language">{block.language}</div>
          )}
          <pre className="markdown-code">
            <code>{block.value}</code>
          </pre>
        </div>
      );
    case "blockquote":
      return <blockquote>{renderBlocks(block.children)}</blockquote>;
    case "list": {
      const items = block.items.map((item, index) => (
        <li key={index}>{renderItem(item)}</li>
      ));
      return block.ordered ? (
        <ol start={block.start === 1 ? undefined : block.start}>{items}</ol>
      ) : (
        <ul>{items}</ul>
      );
    }
    case "table":
      return (
        <div className="markdown-table-scroll">
          <table>
            <thead>
              <tr>
                {block.header.map((cell, index) => (
                  <th key={index} style={{ textAlign: block.alignments[index] }}>
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      style={{ textAlign: block.alignments[cellIndex] }}
                    >
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "divider":
      return <hr />;
  }
}

/**
 * A tight item — one whose text is not separated from its children by blank
 * lines — renders without a paragraph wrapper, so the list stays compact.
 */
function renderItem(blocks: BlockNode[]): ReactNode {
  const paragraphs = blocks.filter((block) => block.type === "paragraph").length;
  if (paragraphs > 1) return renderBlocks(blocks);

  return blocks.map((block, index) => (
    <Fragment key={index}>
      {block.type === "paragraph" ? renderInline(block.children) : renderBlock(block)}
    </Fragment>
  ));
}

function renderInline(nodes: InlineNode[]): ReactNode {
  return nodes.map((node, index) => (
    <Fragment key={index}>{renderInlineNode(node)}</Fragment>
  ));
}

function renderInlineNode(node: InlineNode): ReactNode {
  switch (node.type) {
    case "text":
      return node.value;
    case "break":
      return <br />;
    case "code":
      return <code>{node.value}</code>;
    case "strong":
      return <strong>{renderInline(node.children)}</strong>;
    case "emphasis":
      return <em>{renderInline(node.children)}</em>;
    case "strike":
      return <del>{renderInline(node.children)}</del>;
    case "link":
      return (
        <a href={node.href} target="_blank" rel="noreferrer noopener">
          {renderInline(node.children)}
        </a>
      );
  }
}
