import emojis from "../assets/emojis.json" assert { type: "json" }

type EmojiMap = Record<string, string>
const map = emojis as EmojiMap

export function em(key: string): string {
  return map[key] ?? ""
}

export function emObj(
  key: string
): { id: string; name: string; animated?: boolean } | undefined {
  const raw = map[key]
  if (!raw) return undefined
  const m = raw.match(/^<(?<a>a)?:?(?<name>[a-zA-Z0-9_]+):(?<id>\d+)>$/)
  if (!m || !m.groups) return undefined
  return { id: m.groups.id, name: m.groups.name, animated: Boolean(m.groups.a) }
}
