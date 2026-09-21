import type { ReactNode } from "react";

function safeHref(raw: string) {
  const href = raw.trim();
  if (/^(https?:\/\/|mailto:)/i.test(href) || href.startsWith("/")) return href;
  return null;
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\n]+\))/g;
  const out: ReactNode[] = [];
  let last = 0;
  let index = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;

    if (token.startsWith("`")) {
      out.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      out.push(<strong key={key}>{inline(token.slice(2, -2), `${key}-strong`)}</strong>);
    } else if (token.startsWith("*")) {
      out.push(<em key={key}>{inline(token.slice(1, -1), `${key}-em`)}</em>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const href = link ? safeHref(link[2]) : null;
      if (link && href) {
        const external = /^https?:\/\//i.test(href);
        out.push(<a key={key} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{inline(link[1], `${key}-link`)}</a>);
      } else {
        out.push(token);
      }
    }
    last = start + token.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

function isSpecial(line: string) {
  return /^\s*```/.test(line) || /^#{1,4}\s+/.test(line) || /^>\s?/.test(line) || /^\s*[-+*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line);
}

export function MarkdownMessage({ content }: { content: string }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }

    const fence = line.match(/^\s*```\s*([\w-]+)?\s*$/);
    if (fence) {
      const language = fence[1] ?? "";
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      if (i < lines.length) i += 1;
      blocks.push(<pre key={`code-${blocks.length}`}><code data-language={language || undefined}>{code.join("\n")}</code></pre>);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const children = inline(heading[2], `h-${i}`);
      if (level === 1) blocks.push(<h2 key={`h-${i}`}>{children}</h2>);
      else if (level === 2) blocks.push(<h3 key={`h-${i}`}>{children}</h3>);
      else blocks.push(<h4 key={`h-${i}`}>{children}</h4>);
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(<blockquote key={`quote-${blocks.length}`}>{inline(quote.join(" "), `quote-${i}`)}</blockquote>);
      continue;
    }

    if (/^\s*[-+*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-+*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-+*]\s+/, ""));
      blocks.push(<ul key={`ul-${blocks.length}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item, `ul-${i}-${itemIndex}`)}</li>)}</ul>);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, ""));
      blocks.push(<ol key={`ol-${blocks.length}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item, `ol-${i}-${itemIndex}`)}</li>)}</ol>);
      continue;
    }

    const paragraph: string[] = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() && !isSpecial(lines[i])) paragraph.push(lines[i++].trim());
    blocks.push(<p key={`p-${blocks.length}`}>{inline(paragraph.join(" "), `p-${i}`)}</p>);
  }

  return <div className="markdown-message">{blocks}</div>;
}
