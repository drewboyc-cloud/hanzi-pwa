interface Props {
  pinyin: string
  english: string
  onPinyinChange: (v: string) => void
  onEnglishChange: (v: string) => void
}

export function SearchBar({ pinyin, english, onPinyinChange, onEnglishChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-paper/40 text-xs font-medium">拼</span>
        <input
          type="search"
          value={pinyin}
          onChange={e => onPinyinChange(e.target.value)}
          placeholder="Pinyin — e.g. lao, ke, shi…"
          className="w-full bg-white/10 rounded-xl pl-8 pr-8 py-2.5 text-paper placeholder:text-paper/30 outline-none focus:ring-2 focus:ring-cinnabar"
        />
        {pinyin && (
          <button onClick={() => onPinyinChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-paper/50 text-xl leading-none">×</button>
        )}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-paper/40 text-xs font-medium">En</span>
        <input
          type="search"
          value={english}
          onChange={e => onEnglishChange(e.target.value)}
          placeholder="English — e.g. teacher, love…"
          className="w-full bg-white/10 rounded-xl pl-8 pr-8 py-2.5 text-paper placeholder:text-paper/30 outline-none focus:ring-2 focus:ring-gold"
        />
        {english && (
          <button onClick={() => onEnglishChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-paper/50 text-xl leading-none">×</button>
        )}
      </div>
    </div>
  )
}
