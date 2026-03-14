import emojis from './emojis.json' assert { type: 'json' }

type EmojiMention = string

function parseMention(m: string): { id?: string; name?: string; animated?: boolean } {
  const mt = m.match(/^<a?:([a-zA-Z0-9_~]+):(\d+)>$/)
  if (!mt) return {}
  return { name: mt[1], id: mt[2], animated: m.startsWith('<a:') }
}

export function em(key: string): EmojiMention {
  return (emojis as any)[key] ?? ''
}

export function emBtn(key: string): { id: string; name?: string; animated?: boolean } | null {
  const m = (emojis as any)[key]
  if (!m) return null
  const p = parseMention(m)
  if (!p.id) return null
  return { id: p.id, name: p.name, animated: p.animated }
}
