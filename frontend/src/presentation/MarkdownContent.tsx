import type { ReactNode } from 'react';

function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const position = match.index ?? 0;
    if (position > last) parts.push(text.slice(last, position));
    const token = match[0];
    if (token.startsWith('**')) parts.push(<strong key={position}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) parts.push(<code key={position} className="rounded bg-slate-100 px-1">{token.slice(1, -1)}</code>);
    else if (token.startsWith('[')) {
      const [, label, url] = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/) || [];
      parts.push(url && /^https?:\/\//i.test(url)
        ? <a key={position} href={url} target="_blank" rel="noreferrer" className="text-orange-700 underline">{label}</a>
        : token);
    } else parts.push(<em key={position}>{token.slice(1, -1)}</em>);
    last = position + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function MarkdownContent({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const elements: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    if (/^```/.test(line)) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) code.push(lines[index++]);
      index += 1;
      elements.push(<pre key={index} className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-white"><code>{code.join('\n')}</code></pre>);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const size = heading[1].length <= 2 ? 'text-xl' : 'text-base';
      elements.push(<h3 key={index} className={`mt-5 font-black text-slate-900 ${size}`}>{inline(heading[2])}</h3>);
      index += 1; continue;
    }
    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: ReactNode[] = [];
      while (index < lines.length && (/^\s*[-*+]\s+/.test(lines[index]) || /^\s*\d+\.\s+/.test(lines[index]))) {
        items.push(<li key={index}>{inline(lines[index].replace(/^\s*(?:[-*+]|\d+\.)\s+/, ''))}</li>);
        index += 1;
      }
      elements.push(ordered ? <ol key={index} className="ml-5 list-decimal space-y-1">{items}</ol> : <ul key={index} className="ml-5 list-disc space-y-1">{items}</ul>);
      continue;
    }
    if (/^>\s?/.test(line)) {
      elements.push(<blockquote key={index} className="border-l-4 border-orange-300 pl-4 text-slate-600">{inline(line.replace(/^>\s?/, ''))}</blockquote>);
      index += 1; continue;
    }
    if (line.includes('|') && index + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1])) {
      const cells = (row: string) => row.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
      const header = cells(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) rows.push(cells(lines[index++]));
      elements.push(<div key={index} className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead><tr>{header.map((cell, i) => <th key={i} className="border border-slate-200 bg-slate-50 p-2">{inline(cell)}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="border border-slate-200 p-2">{inline(cell)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,6}\s|```|>|\s*[-*+]\s|\s*\d+\.\s)/.test(lines[index])) paragraph.push(lines[index++]);
    elements.push(<p key={index} className="leading-7 text-slate-700">{inline(paragraph.join(' '))}</p>);
  }
  return <div className="space-y-3 break-words text-sm">{elements}</div>;
}
