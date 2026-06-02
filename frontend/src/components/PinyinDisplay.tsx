import { parsePinyin } from '../services/pinyin'

const TONE_COLORS = ['', 'text-sky-400', 'text-green-400', 'text-yellow-400', 'text-cinnabar', 'text-paper/50']

interface Props {
  raw: string | null | undefined
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show tone number superscript */
  showNumber?: boolean
}

export function PinyinDisplay({ raw, size = 'md', showNumber = true }: Props) {
  const syllables = parsePinyin(raw)
  if (!syllables.length) return null

  const textSize = size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-3xl' : 'text-lg'
  const supSize = size === 'sm' ? 'text-[8px]' : size === 'lg' ? 'text-sm' : 'text-[10px]'

  return (
    <span className="inline-flex items-baseline gap-1 flex-wrap">
      {syllables.map((s, i) => (
        <span key={i} className="inline-flex items-start">
          <span className={`${textSize} font-medium ${TONE_COLORS[s.tone] ?? ''}`}>
            {s.text}
          </span>
          {showNumber && s.tone > 0 && (
            <sup className={`${supSize} ${TONE_COLORS[s.tone] ?? ''} opacity-70 leading-none ml-0.5`}>
              {s.tone}
            </sup>
          )}
        </span>
      ))}
    </span>
  )
}
