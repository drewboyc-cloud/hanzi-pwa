const TONES = [
  { num: '1', mark: 'ā', label: 'flat', color: 'text-sky-400', symbol: '–' },
  { num: '2', mark: 'á', label: 'rising', color: 'text-green-400', symbol: '/' },
  { num: '3', mark: 'ǎ', label: 'dip', color: 'text-yellow-400', symbol: '∨' },
  { num: '4', mark: 'à', label: 'falling', color: 'text-cinnabar', symbol: '\\' },
  { num: '5', mark: 'a', label: 'neutral', color: 'text-paper/40', symbol: '·' },
]

export function ToneGuide() {
  return (
    <div className="flex items-center justify-center gap-1 px-3 py-1.5 bg-white/5 border-b border-white/10 overflow-x-auto">
      {TONES.map((t, i) => (
        <div key={t.num} className="flex items-center gap-1">
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="text-paper/40 text-[11px]">{t.num}</span>
            <span className={`text-[13px] font-bold ${t.color}`}>{t.mark}</span>
            <span className="text-paper/30 text-[10px]">{t.label}</span>
          </div>
          {i < TONES.length - 1 && <span className="text-paper/15 text-xs mx-1">|</span>}
        </div>
      ))}
    </div>
  )
}
