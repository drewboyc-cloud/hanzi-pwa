import { useState, useEffect } from 'react'
import { idb } from '../services/database'
import { api } from '../services/api'
import type { Character } from '../services/api'
import { DrawingCanvas } from './DrawingCanvas'
import { PinyinDisplay } from './PinyinDisplay'

interface Props {
  character: Character
  onBack: () => void
  onSaved?: () => void
}

export function CharacterDetail({ character, onBack, onSaved }: Props) {
  const [full, setFull] = useState<Character>(character)
  const [tab, setTab] = useState<'info' | 'practice'>('info')

  useEffect(() => {
    async function load() {
      const cached = await idb.getCharacterById(character.id)
      if (cached?.strokeOrderJson) { setFull(cached); return }
      try {
        const data = await api.getCharacter(character.id)
        setFull(data)
      } catch { /* keep base data */ }
    }
    load()
  }, [character.id, character])

  const hskColors: Record<number, string> = {
    1: 'bg-green-500', 2: 'bg-teal-500', 3: 'bg-blue-500',
    4: 'bg-purple-500', 5: 'bg-orange-500', 6: 'bg-red-500',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={onBack} className="btn-ghost text-xl">←</button>
        <div className="flex-1">
          <h2 className="text-paper/60 text-sm">Character Detail</h2>
        </div>
        {full.hskLevel && (
          <span className={`text-white text-xs px-2 py-0.5 rounded-full ${hskColors[full.hskLevel] ?? 'bg-gray-500'}`}>
            HSK {full.hskLevel}
          </span>
        )}
      </div>

      {/* Character hero — larger on detail screen */}
      <div className="flex items-center gap-6 px-6 py-6">
        {/* Big character */}
        <span className="text-[120px] font-hanzi leading-none shrink-0">{full.char}</span>

        <div className="flex flex-col gap-2">
          {/* Traditional form */}
          {full.traditional && full.traditional !== full.char && (
            <div className="text-paper/50 text-sm">
              Traditional: <span className="text-paper font-hanzi text-2xl ml-1">{full.traditional}</span>
            </div>
          )}

          {/* Pinyin — large with diacritics + tone number */}
          <PinyinDisplay raw={full.pinyin} size="lg" showNumber={true} />

          {/* English — larger and more readable */}
          <div className="text-paper/80 text-base leading-snug max-w-xs">{full.english}</div>

          {/* Meta */}
          <div className="flex gap-4 text-paper/40 text-sm mt-1">
            {full.strokeCount && <span>{full.strokeCount} strokes</span>}
            {full.radical && <span>Radical: {full.radical}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-4">
        {(['info', 'practice'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-base capitalize border-b-2 transition-colors ${
              tab === t ? 'border-cinnabar text-paper' : 'border-transparent text-paper/40'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'info' ? (
          <div className="px-4 py-4 space-y-3">
            <div className="card">
              <div className="text-paper/40 text-xs uppercase tracking-wider mb-2">Definition</div>
              <div className="text-paper text-base leading-relaxed">{full.english ?? '—'}</div>
            </div>
            {full.strokeCount && (
              <div className="card">
                <div className="text-paper/40 text-xs uppercase tracking-wider mb-2">Stroke Order</div>
                {full.strokeOrderJson ? (
                  <div className="text-paper/60 text-base">Stroke data available — switch to Practice tab to draw</div>
                ) : (
                  <div className="text-paper/40 text-base">Stroke data not available offline</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-4">
            <DrawingCanvas character={full} onSaved={onSaved} />
          </div>
        )}
      </div>
    </div>
  )
}
