const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'

export interface Character {
  id: string
  char: string
  traditional: string | null
  pinyin: string | null
  english: string | null
  strokeCount: number | null
  radical: string | null
  hskLevel: number | null
  strokeOrderJson?: string
}

export interface SavedDrawing {
  id: number
  characterId: string
  char: string | null
  pinyin: string | null
  drawingData: string
  strokesCount: number | null
  confidenceScore: number | null
  createdAt: string
}

export interface CharactersResponse {
  characters: Character[]
  total: number
  page: number
  pages: number
  limit: number
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
}

export const api = {
  getCharacters: (params: { page?: number; limit?: number; search?: string; hsk?: number }) => {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.search) q.set('search', params.search)
    if (params.hsk) q.set('hsk', String(params.hsk))
    return get<CharactersResponse>(`/characters?${q}`)
  },

  getAllCharacters: () => get<Character[]>('/characters/all'),

  getCharacter: (id: string) => get<Character>(`/character/${encodeURIComponent(id)}`),

  saveDrawing: (data: { characterId: string; drawingData: string; strokesCount?: number; confidenceScore?: number }) =>
    post<SavedDrawing>('/save-drawing', data),

  getSavedDrawings: () => get<SavedDrawing[]>('/saved-drawings'),

  deleteDrawing: (id: number) => del(`/saved-drawings/${id}`),
}
