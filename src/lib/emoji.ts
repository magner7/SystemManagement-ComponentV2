import emojis from "../assets/emojis.json" assert { type: "json" };

export type EmojiLookup = Record<string, string>;

const map = emojis as EmojiLookup;

export function em(name: string): string {
  return map[name] || "";
}

export type ParsedEmoji = { id?: string; name?: string; animated?: boolean };

export function parseEmoji(str: string): ParsedEmoji | null {
  const m = str.match(/^<(a?):([^:>]+):([0-9]+)>$/);
  if (!m) return null;
  return { animated: m[1] === "a", name: m[2], id: m[3] };
}

export function emData(name: string): ParsedEmoji | null {
  const s = em(name);
  return s ? parseEmoji(s) : null;
}
