/**
 * Converts tone-number pinyin (lao2, ni3 hao3) to diacritic pinyin (láo, nǐ hǎo)
 * Returns { display: string, tone: number | null }
 */

const TONE_MAP: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à', 'a'],
  e: ['ē', 'é', 'ě', 'è', 'e'],
  i: ['ī', 'í', 'ǐ', 'ì', 'i'],
  o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
  u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
}

// Tone mark placement rules (standard pinyin rules):
// 1. If there is an 'a' or 'e', it takes the mark
// 2. If there is 'ou', 'o' takes the mark
// 3. Otherwise the last vowel takes the mark
function applyTone(syllable: string, tone: number): string {
  if (tone === 5) return syllable // neutral — no mark
  const idx = tone - 1

  // Replace ü written as v or u: (lv → lü)
  syllable = syllable.replace(/v/g, 'ü')

  // Rule 1: a or e
  for (const v of ['a', 'e']) {
    if (syllable.includes(v)) {
      return syllable.replace(v, TONE_MAP[v][idx])
    }
  }
  // Rule 2: ou → mark on o
  if (syllable.includes('ou')) {
    return syllable.replace('o', TONE_MAP['o'][idx])
  }
  // Rule 3: last vowel
  const vowels = ['ü', 'u', 'i', 'o']
  for (let i = syllable.length - 1; i >= 0; i--) {
    const ch = syllable[i]
    if (vowels.includes(ch)) {
      return syllable.slice(0, i) + TONE_MAP[ch][idx] + syllable.slice(i + 1)
    }
  }
  return syllable
}

/** Convert a single tone-number syllable like "lao2" → { text: "láo", tone: 2 } */
function convertSyllable(raw: string): { text: string; tone: number } {
  const match = raw.match(/^([a-züA-ZÜ]+)([1-5]?)$/)
  if (!match) return { text: raw, tone: 0 }
  const [, syllable, toneStr] = match
  const tone = toneStr ? parseInt(toneStr) : 5
  return { text: applyTone(syllable.toLowerCase(), tone), tone }
}

/** Convert full pinyin string "ni3 hao3" → [{ text: "nǐ", tone: 3 }, { text: "hǎo", tone: 3 }] */
export function parsePinyin(raw: string | null | undefined): { text: string; tone: number }[] {
  if (!raw) return []
  return raw.trim().split(/\s+/).map(convertSyllable)
}

/** Convert to plain diacritic string "ni3 hao3" → "nǐ hǎo" */
export function toDisplayPinyin(raw: string | null | undefined): string {
  return parsePinyin(raw).map(s => s.text).join(' ')
}
