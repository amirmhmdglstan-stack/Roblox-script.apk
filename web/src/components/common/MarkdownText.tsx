import React from 'react';

// ============================================================
// Minimal, safe Markdown renderer (bold / italic / strike / code / links /
// headings / lists / fenced code blocks).
//
// It builds React nodes instead of using dangerouslySetInnerHTML, so raw
// HTML in AI answers or user descriptions can never execute. Everything the
// user writes that is NOT markdown is displayed as plain text.
//
// NOTE: no regex lookbehind is used anywhere — lookbehind (?<!…) is a syntax
// error on Safari < 16.4 / older iOS and would crash the bundle at parse time.
// ============================================================

/**
 * Inline token regex — the bold/italic/strike forks consume (and re-emit) one
 * boundary character so intraword markers like a*b*c stay plain text.
 * Groups: 1,2=bold(prefix,inner) 3,4=italic 5,6=strike 7=code 8=link
 */
const INLINE_PATTERN =
  /(^|[^\w])\*\*(?!\s)([^*\n]*?[^\s*])\*\*|(^|[^\w*])\*(?!\s)([^*\n]*?[^\s*])\*(?!\w)|(^|[^\w])~~(?!\s)([^~\n]*?[^\s~])~~|(`[^`\n]+`)|(\[[^\]\n]+\]\([^)\s]+\))/g;

const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let k = 0;
  let match: RegExpExecArray | null;

  INLINE_PATTERN.lastIndex = 0;
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const [, boldPrefix, boldInner, italicPrefix, italicInner, strikePrefix, strikeInner, codeTok, linkTok] =
      match;
    const key = `${keyPrefix}-i${k++}`;
    const prefix = boldPrefix ?? italicPrefix ?? strikePrefix ?? '';
    if (prefix) nodes.push(prefix);

    if (boldInner !== undefined) {
      nodes.push(
        <strong key={key} className="font-black text-white">
          {boldInner}
        </strong>
      );
    } else if (italicInner !== undefined) {
      nodes.push(
        <em key={key} className="italic">
          {italicInner}
        </em>
      );
    } else if (strikeInner !== undefined) {
      nodes.push(
        <span key={key} className="line-through opacity-75">
          {strikeInner}
        </span>
      );
    } else if (codeTok !== undefined) {
      nodes.push(
        <code
          key={key}
          dir="ltr"
          className="inline-block bg-dark-950/90 text-electric-300 border border-electric-500/25 rounded-md px-1.5 py-0.5 font-mono text-[0.85em] leading-snug"
        >
          {codeTok.slice(1, -1)}
        </code>
      );
    } else if (linkTok !== undefined) {
      const m = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(linkTok);
      const label = m?.[1] ?? linkTok;
      const url = m?.[2] ?? '';
      // Only allow web links — anything else renders as plain text (XSS-safe)
      if (/^(https?:\/\/|\/)/i.test(url)) {
        nodes.push(
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-electric-400 underline underline-offset-2 hover:text-electric-300 break-all"
          >
            {label}
          </a>
        );
      } else {
        nodes.push(label);
      }
    }

    lastIndex = INLINE_PATTERN.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
};

/** Joins paragraph lines with real line breaks, running inline parsing on each. */
const renderParagraph = (lines: string[], keyPrefix: string): React.ReactNode => (
  <p key={keyPrefix} className="my-1 first:mt-0 last:mb-0">
    {lines.map((line, idx) => (
      <React.Fragment key={`${keyPrefix}-l${idx}`}>
        {idx > 0 && <br />}
        {renderInline(line, `${keyPrefix}-l${idx}`)}
      </React.Fragment>
    ))}
  </p>
);

/** Block-level rendering for a text chunk that contains no fenced code block. */
const renderTextChunk = (chunk: string, keyPrefix: string): React.ReactNode[] => {
  const blocks: React.ReactNode[] = [];
  const lines = chunk.split('\n');

  let paragraph: string[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(renderParagraph(paragraph, `${keyPrefix}-p${key++}`));
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listItems.length > 0) {
      const items = listItems;
      blocks.push(
        <ul key={`${keyPrefix}-ul${key++}`} className="list-disc pr-5 my-1.5 space-y-1 marker:text-electric-400">
          {items.map((item, i) => (
            <li key={`${keyPrefix}-li${key}-${i}`}>{renderInline(item, `${keyPrefix}-li${i}`)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    const heading = /^\s*(#{1,3})\s+(.+)$/.exec(line);
    const listItem = /^\s*(?:[-*•+]|\d+[.)])\s+(.+)$/.exec(line);

    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const sizeClass = level === 1 ? 'text-[1.2em]' : level === 2 ? 'text-[1.1em]' : 'text-[1.05em]';
      blocks.push(
        <div key={`${keyPrefix}-h${key++}`} className={`font-black text-white ${sizeClass} mt-2 mb-1 first:mt-0`}>
          {renderInline(heading[2], `${keyPrefix}-h${key}`)}
        </div>
      );
    } else if (listItem) {
      flushParagraph();
      listItems.push(listItem[1]);
    } else if (line.trim() === '') {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  }

  flushParagraph();
  flushList();
  return blocks;
};

const renderMarkdown = (text: string): React.ReactNode[] => {
  // Split on ``` fences — every odd segment is a code block
  const segments = text.split(/```/);
  const blocks: React.ReactNode[] = [];

  segments.forEach((segment, index) => {
    if (index % 2 === 1) {
      // First line of the segment may be a language name (e.g. "lua") — drop it
      const code = segment.replace(/^[A-Za-z0-9#+_-]*\n/, '');
      blocks.push(
        <pre
          key={`md-code-${index}`}
          dir="ltr"
          className="my-2 bg-dark-950 border border-electric-500/25 rounded-xl p-3 text-[11px] sm:text-xs font-mono text-electric-300 overflow-x-auto text-left whitespace-pre-wrap break-words"
        >
          <code>{code.trim()}</code>
        </pre>
      );
    } else {
      blocks.push(...renderTextChunk(segment, `md-${index}`));
    }
  });

  return blocks;
};

interface MarkdownTextProps {
  text?: string | null;
  className?: string;
}

/** Renders lightweight markdown (bold/italic/code/links/lists/…) safely. */
export const MarkdownText: React.FC<MarkdownTextProps> = ({ text, className }) => {
  if (!text) return null;
  return <div className={className}>{renderMarkdown(text)}</div>;
};
