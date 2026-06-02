import { useState } from 'react'
import type { Word } from '../services/api'
import { PinyinDisplay } from './PinyinDisplay'
import { StrokeAnimation } from './StrokeAnimation'
import { AudioButton } from './AudioButton'

interface Props {
  word: Word
  isFav: boolean
  onToggleFav: (word: Word) => void
  onBack: () => void
}

export function WordDetail({ word, isFav, onToggleFav, onBack }: Props) {
  // Split word into individual characters
  const chars = word.simplified.split('')
  // Split pinyin syllables to pair with each character
  const pinyinSyllables = word.pinyin?.trim().split(/\s+/) ?? []

  const [activeStroke, setActiveStroke] = useState<number | null>(null)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={onBack} className="btn-ghost text-xl">←</button>
        <div className="flex-1">
          <h2 className="text-paper/60 text-sm">Word Detail</h2>
        </div>
        <button
          onClick={() => onToggleFav(word)}
          className={`text-2xl transition-colors ${isFav ? 'text-gold' : 'text-paper/20'}`}
          aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
        >
          {isFav ? '★' : '☆'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero — big hanzi + pinyin + audio */}
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-6xl font-hanzi leading-none mb-3">{word.simplified}</div>
              <PinyinDisplay raw={word.pinyin} size="lg" showNumber={true} />
              <p className="text-paper/70 text-base mt-2 leading-snug">{word.english}</p>
              {word.traditional && word.traditional !== word.simplified && (
                <p className="text-paper/40 text-sm mt-1 font-hanzi">
                  Traditional: {word.traditional}
                </p>
              )}
            </div>
            {/* Speak whole word */}
            <AudioButton text={word.simplified} size="lg" label="Play" />
          </div>
        </div>

        {/* Individual characters */}
        <div className="px-4 py-4">
          <div className="text-paper/40 text-xs uppercase tracking-wider mb-3">
            Characters in this word
          </div>
          <div className="flex flex-col gap-3">
            {chars.map((ch, i) => (
              <div key={i} className="card">
                <div className="flex items-center gap-4">
                  {/* Character */}
                  <span className="text-5xl font-hanzi leading-none w-14 text-center shrink-0">
                    {ch}
                  </span>
                  {/* Pinyin + meaning */}
                  <div className="flex-1 min-w-0">
                    {pinyinSyllables[i] && (
                      <PinyinDisplay raw={pinyinSyllables[i]} size="md" showNumber={true} />
                    )}
                  </div>
                  {/* Audio for this character */}
                  <AudioButton text={ch} size="sm" />
                  {/* Toggle stroke animation */}
                  <button
                    onClick={() => setActiveStroke(activeStroke === i ? null : i)}
                    className={`text-sm px-3 py-1.5 rounded-xl border transition-colors ${
                      activeStroke === i
                        ? 'border-cinnabar text-cinnabar bg-cinnabar/10'
                        : 'border-white/20 text-paper/50 hover:border-white/40'
                    }`}
                  >
                    ✍️
                  </button>
                </div>

                {/* Stroke animation — expands inline */}
                {activeStroke === i && (
                  <div className="mt-4 flex justify-center">
                    <StrokeAnimation char={ch} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
