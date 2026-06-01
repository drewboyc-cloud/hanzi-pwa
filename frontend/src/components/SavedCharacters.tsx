import { useState, useEffect } from 'react'
import { api } from '../services/api'
import type { SavedDrawing } from '../services/api'

export function SavedCharacters() {
  const [drawings, setDrawings] = useState<SavedDrawing[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      setDrawings(await api.getSavedDrawings())
    } catch {
      // Offline — show empty state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: number) {
    await api.deleteDrawing(id)
    setDrawings(d => d.filter(x => x.id !== id))
  }

  if (loading) return <div className="flex items-center justify-center h-32 text-paper/40">Loading…</div>

  if (drawings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-paper/40 gap-2 px-8 text-center">
        <span className="text-5xl">✍️</span>
        <p className="text-lg">No saved drawings yet</p>
        <p className="text-sm">Practice a character and tap Save to keep your work here</p>
      </div>
    )
  }

  return (
    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto">
      {drawings.map(d => (
        <div key={d.id} className="card relative group">
          <img
            src={d.drawingData}
            alt={d.char ?? ''}
            className="w-full aspect-square object-contain rounded-xl bg-white/5"
          />
          <div className="mt-2 flex items-center justify-between">
            <div>
              <span className="text-2xl font-hanzi leading-none">{d.char}</span>
              <p className="text-paper/50 text-xs">{d.pinyin}</p>
            </div>
            {d.confidenceScore != null && (
              <span className={`text-xs font-medium ${d.confidenceScore >= 70 ? 'text-green-400' : 'text-cinnabar'}`}>
                {Math.round(d.confidenceScore)}%
              </span>
            )}
          </div>
          <button
            onClick={() => handleDelete(d.id)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/50 text-white rounded-full w-6 h-6 text-xs transition-opacity"
          >
            ×
          </button>
          <p className="text-paper/30 text-[10px] mt-1">
            {new Date(d.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  )
}
