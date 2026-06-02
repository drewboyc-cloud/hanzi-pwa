import { useState } from 'react'
import { useCharacterDB } from './hooks/useIndexedDB'
import { useFavourites } from './hooks/useFavourites'
import { CharacterBrowser } from './components/CharacterBrowser'
import { CharacterDetail } from './components/CharacterDetail'
import { FavouritesScreen } from './components/FavouritesScreen'
import { WordDetail } from './components/WordDetail'
import { ToneGuide } from './components/ToneGuide'
import type { Character, Word } from './services/api'

type Tab = 'browse' | 'favourites'

export default function App() {
  const { ready, syncing, total } = useCharacterDB()
  const { favourites, favIds, toggle } = useFavourites()
  const [tab, setTab] = useState<Tab>('browse')
  const [selectedChar, setSelectedChar] = useState<Character | null>(null)
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)

  if (!ready) {
    return (
      <div className="flex flex-col h-full">
        <ToneGuide />
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <span className="text-6xl font-hanzi">汉</span>
          <p className="text-paper/60 text-lg">Hanzi Master</p>
          {syncing && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-cinnabar rounded-full animate-pulse" />
              </div>
              <p className="text-paper/40 text-sm">Downloading character database…</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Word Detail screen
  if (selectedWord) {
    return (
      <div className="flex flex-col h-full">
        <ToneGuide />
        <div className="flex-1 overflow-hidden">
          <WordDetail
            word={selectedWord}
            isFav={favIds.has(selectedWord.id)}
            onToggleFav={toggle}
            onBack={() => setSelectedWord(null)}
          />
        </div>
      </div>
    )
  }

  // Character Detail screen
  if (selectedChar) {
    return (
      <div className="flex flex-col h-full">
        <ToneGuide />
        <div className="flex-1 overflow-hidden">
          <CharacterDetail
            character={selectedChar}
            onBack={() => setSelectedChar(null)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ToneGuide />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-cinnabar font-hanzi">汉</span> Hanzi Master
        </h1>
        <span className="text-paper/30 text-xs">{total.toLocaleString()} chars</span>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {tab === 'browse' && (
          <CharacterBrowser
            onSelect={setSelectedChar}
            onSelectWord={setSelectedWord}
            favIds={favIds}
            onToggleFav={toggle}
          />
        )}
        {tab === 'favourites' && (
          <FavouritesScreen
            favourites={favourites}
            onToggleFav={toggle}
            onSelectWord={setSelectedWord}
          />
        )}
      </main>

      {/* Bottom nav */}
      <nav className="flex border-t border-white/10 safe-bottom">
        {([
          { id: 'browse', label: 'Browse', icon: '🔍' },
          { id: 'favourites', label: 'Favourites', icon: '★' },
        ] as { id: Tab; label: string; icon: string }[]).map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${
              tab === item.id ? 'text-cinnabar' : 'text-paper/40'
            }`}
          >
            <span className={item.id === 'favourites' ? 'text-2xl' : 'text-xl'}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
