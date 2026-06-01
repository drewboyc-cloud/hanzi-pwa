interface Props {
  value: string
  onChange: (v: string) => void
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="relative">
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search pinyin or English…"
        className="w-full bg-white/10 rounded-xl px-4 py-2.5 text-paper placeholder:text-paper/40 outline-none focus:ring-2 focus:ring-cinnabar"
      />
      {!value && (
        <p className="mt-1.5 text-paper/35 text-xs px-1">
          Search one syllable at a time — e.g. <span className="text-paper/55">lao</span> for 老, <span className="text-paper/55">shi</span> for 师, or <span className="text-paper/55">teacher</span> in English
        </p>
      )}
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-paper/50 text-xl leading-none"
        >
          ×
        </button>
      )}
    </div>
  )
}
