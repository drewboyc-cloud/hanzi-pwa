import { useRef, useEffect } from 'react'
import { useDrawing } from '../hooks/useDrawing'
import { scoreStrokes } from '../hooks/useStrokeRecognition'
import type { Character } from '../services/api'
import { api } from '../services/api'

interface Props {
  character: Character
  onSaved?: () => void
}

const CANVAS_SIZE = 300

export function DrawingCanvas({ character, onSaved }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { strokes, undo, clear, getImageData } = useDrawing(canvasRef)

  // Draw reference grid lines (like practice paper)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    // Cross lines
    ctx.beginPath()
    ctx.moveTo(CANVAS_SIZE / 2, 0)
    ctx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE)
    ctx.moveTo(0, CANVAS_SIZE / 2)
    ctx.lineTo(CANVAS_SIZE, CANVAS_SIZE / 2)
    // Diagonal guides
    ctx.moveTo(0, 0)
    ctx.lineTo(CANVAS_SIZE, CANVAS_SIZE)
    ctx.moveTo(CANVAS_SIZE, 0)
    ctx.lineTo(0, CANVAS_SIZE)
    ctx.stroke()
  }, [])

  const score = scoreStrokes(strokes, character.strokeOrderJson)
  const passed = score >= 70

  async function handleSave() {
    const img = getImageData()
    if (!img) return
    await api.saveDrawing({
      characterId: character.id,
      drawingData: img,
      strokesCount: strokes.length,
      confidenceScore: score,
    })
    clear()
    onSaved?.()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Reference character ghost */}
      <div className="relative">
        <span className="absolute inset-0 flex items-center justify-center text-[200px] font-hanzi text-white/5 select-none pointer-events-none leading-none">
          {character.char}
        </span>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="rounded-2xl border border-white/20 bg-ink"
          style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
        />
      </div>

      {/* Stroke count hint */}
      <div className="text-paper/50 text-sm">
        {strokes.length} stroke{strokes.length !== 1 ? 's' : ''} drawn
        {character.strokeCount ? ` · reference: ${character.strokeCount}` : ''}
      </div>

      {/* Score bar */}
      {strokes.length > 0 && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-paper/50 mb-1">
            <span>Confidence</span>
            <span className={passed ? 'text-green-400' : 'text-cinnabar'}>{score}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${passed ? 'bg-green-400' : 'bg-cinnabar'}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        <button onClick={undo} disabled={strokes.length === 0} className="btn-ghost disabled:opacity-30">
          ↩ Undo
        </button>
        <button onClick={clear} disabled={strokes.length === 0} className="btn-ghost disabled:opacity-30">
          Clear
        </button>
        <button
          onClick={handleSave}
          disabled={strokes.length === 0}
          className="btn-primary disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  )
}
