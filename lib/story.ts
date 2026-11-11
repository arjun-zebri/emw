/*
 * A vendor's story: what they write about their work, stored in vendors.story as one string per
 * block. A plain block is a paragraph (every story imported so far is only paragraphs), and a few
 * lightweight marks give it shape without letting it turn into a wall of text:
 *
 *   ## A short subheading          at most three, never the last block
 *   - an item                      a list, one item per line
 *   1. an item                     a numbered list
 *   **bold**  _italic_  ++underline++    inside any of them; a literal mark is stored escaped (\*)
 *
 * The rules are enforced in one place (normaliseStory) for the editor and the server alike, and
 * the vendor page renders the result with components/vendor/Story.tsx.
 */

export type Run = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };
export type Inline = Run[];
export type StoryBlock =
  | { type: "p"; content: Inline }
  | { type: "h"; text: string }
  | { type: "ul" | "ol"; items: Inline[] };

export const STORY_RULES = {
  maxChars: 2000,
  maxHeadings: 3,
  headingChars: 60,
  maxItems: 10,
  itemChars: 180,
  maxBlocks: 24,
} as const;

const tidy = (s: string) => s.replace(/[ \t ]+/g, " ").trim();

// Escaped markers stand in as private-use characters while a line is read.
const ESCAPES: [string, string][] = [
  ["\\*", "\uE000"],
  ["\\+", "\uE001"],
  ["\\_", "\uE002"],
];
const unescape = (t: string) => ESCAPES.reduce((s, [mark, hold]) => s.replaceAll(hold, mark.slice(1)), t);
// Italic underscores sit at word edges, so a handle like studio_name stays as written.
const MARK = /\*\*(.+?)\*\*|\+\+(.+?)\+\+|(?<![\p{L}\p{N}])_(.+?)_(?![\p{L}\p{N}])/u;

function runs(s: string, marks: Omit<Run, "text">, out: Inline) {
  let rest = s;
  for (let m = MARK.exec(rest); m; m = MARK.exec(rest)) {
    if (m.index) out.push({ text: unescape(rest.slice(0, m.index)), ...marks });
    if (m[1] !== undefined) runs(m[1], { ...marks, bold: true }, out);
    else if (m[2] !== undefined) runs(m[2], { ...marks, underline: true }, out);
    else runs(m[3], { ...marks, italic: true }, out);
    rest = rest.slice(m.index + m[0].length);
  }
  if (rest) out.push({ text: unescape(rest), ...marks });
  return out;
}

export function parseInline(s: string): Inline {
  return runs(ESCAPES.reduce((t, [mark, hold]) => t.replaceAll(mark, hold), s), {}, []).filter((r) => r.text);
}

export const inlineText = (c: Inline) => c.map((r) => r.text).join("");

const same = (a: Run, b: Run) => !!a.bold === !!b.bold && !!a.italic === !!b.italic && !!a.underline === !!b.underline;

// Only marks that would be read as marks are escaped, so ordinary text is stored as written.
const escapeMarks = (t: string) =>
  t
    .replace(/\*\*|\+\+/g, (m) => `\\${m[0]}\\${m[1]}`)
    .replace(/(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/gu, "\\_");

/** Runs back to their marks: neighbours with the same marks are joined, and spaces stay outside the marks. */
function inlineMarkdown(c: Inline) {
  const merged: Inline = [];
  for (const r of c) {
    const last = merged.at(-1);
    if (last && same(last, r)) last.text += r.text;
    else merged.push({ ...r });
  }
  return merged
    .map((r) => {
      const text = escapeMarks(r.text);
      const core = text.trim();
      if (!core || !(r.bold || r.italic || r.underline)) return text;
      const open = (r.bold ? "**" : "") + (r.underline ? "++" : "") + (r.italic ? "_" : "");
      const close = (r.italic ? "_" : "") + (r.underline ? "++" : "") + (r.bold ? "**" : "");
      const lead = text.match(/^\s*/)![0];
      const trail = text.match(/\s*$/)![0];
      return `${lead}${open}${core}${close}${trail}`;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** One stored block as structure. */
export function parseBlock(raw: string): StoryBlock {
  const lines = raw.split("\n").map(tidy).filter(Boolean);
  if (lines.length === 1 && lines[0].startsWith("## ")) return { type: "h", text: inlineText(parseInline(lines[0].slice(3))).trim() };
  if (lines.length && lines.every((l) => /^- /.test(l))) return { type: "ul", items: lines.map((l) => parseInline(l.slice(2))) };
  if (lines.length && lines.every((l) => /^\d+\. /.test(l))) return { type: "ol", items: lines.map((l) => parseInline(l.replace(/^\d+\. /, ""))) };
  return { type: "p", content: parseInline(lines.join(" ")) };
}

export function serialiseBlock(b: StoryBlock): string {
  if (b.type === "h") return `## ${escapeMarks(b.text)}`;
  if (b.type === "p") return inlineMarkdown(b.content);
  return b.items.map((i, n) => `${b.type === "ul" ? "-" : `${n + 1}.`} ${inlineMarkdown(i)}`).join("\n");
}

const blockText = (b: StoryBlock) => (b.type === "h" ? b.text : b.type === "p" ? inlineText(b.content) : b.items.map(inlineText).join(" "));

/** Plain length of a story, for counts and limits. */
export const storyLength = (blocks: StoryBlock[]) => blocks.reduce((n, b) => n + blockText(b).length, 0);

/**
 * Apply the house rules: no empty blocks, short subheadings (and few of them, never two in a row
 * or at the end), short lists of short items, nothing past the length limit.
 */
export function normaliseBlocks(input: StoryBlock[]): StoryBlock[] {
  let headings = 0;
  let chars = 0;
  const out: StoryBlock[] = [];
  for (const b of input) {
    if (out.length >= STORY_RULES.maxBlocks || chars >= STORY_RULES.maxChars) break;
    if (b.type === "h") {
      const text = tidy(b.text).slice(0, STORY_RULES.headingChars);
      if (!text) continue;
      if (headings >= STORY_RULES.maxHeadings || out.at(-1)?.type === "h") {
        out.push({ type: "p", content: [{ text }] });
      } else {
        out.push({ type: "h", text });
        headings++;
      }
    } else if (b.type === "p") {
      const content = b.content.map((r) => ({ ...r, text: r.text.replace(/\s+/g, " ") }));
      // A backslash left at the end of a paragraph is a slip (it sits just above Return), never meant.
      const end = content.at(-1);
      if (end) end.text = end.text.replace(/[\s\\]+$/, (t) => (t.includes("\\") ? "" : t));
      for (let i = content.length - 1; i >= 0; i--) if (!content[i].text) content.splice(i, 1);
      if (!inlineText(content).trim()) continue;
      out.push({ type: "p", content });
    } else {
      const items = b.items
        .map((i) => i.map((r) => ({ ...r, text: r.text.replace(/\s+/g, " ") })).filter((r) => r.text))
        .filter((i) => inlineText(i).trim())
        .slice(0, STORY_RULES.maxItems)
        .map((i) => clip(i, STORY_RULES.itemChars));
      if (items.length) out.push({ type: b.type, items });
    }
    chars += blockText(out.at(-1)!).length;
  }
  while (out.at(-1)?.type === "h") {
    const h = out.pop() as { type: "h"; text: string };
    out.push({ type: "p", content: [{ text: h.text }] });
    break;
  }
  return out;
}

function clip(c: Inline, max: number): Inline {
  let left = max;
  const out: Inline = [];
  for (const r of c) {
    if (left <= 0) break;
    out.push({ ...r, text: r.text.slice(0, left) });
    left -= r.text.length;
  }
  return out;
}

/** The stored form: one string per block, with the rules applied. */
export const normaliseStory = (blocks: string[]): string[] => normaliseBlocks(blocks.map(parseBlock)).map(serialiseBlock).filter(Boolean);

/** A story written as one string, blocks separated by blank lines (how the apply flow keeps it). */
export const splitStory = (story: string): string[] => story.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
