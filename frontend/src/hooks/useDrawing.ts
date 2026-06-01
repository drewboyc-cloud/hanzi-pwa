import { useRef, useState, useCallback, useEffect } from 'react'

export interface Stroke {
  points: { x: number; y: number }[]
}

export function useDrawing(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const currentStroke = useRef<Stroke | null>(null)
  const isDrawing = useRef(false)

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }, [canvasRef])

  const getPos = (e: TouchEvent | MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const redraw = useCallback((strokeList: Stroke[]) => {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#e63946'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    strokeList.forEach(stroke => {
      if (stroke.points.length < 2) return
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      stroke.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
      ctx.stroke()
    })
  }, [canvasRef, getCtx])

  const startStroke = useCallback((e: TouchEvent | MouseEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    isDrawing.current = true
    const pos = getPos(e, canvas)
    currentStroke.current = { points: [pos] }
  }, [canvasRef])

  const continueStroke = useCallback((e: TouchEvent | MouseEvent) => {
    e.preventDefault()
    if (!isDrawing.current || !currentStroke.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const pos = getPos(e, canvas)
    currentStroke.current.points.push(pos)
    redraw([...strokes, currentStroke.current])
  }, [canvasRef, strokes, redraw])

  const endStroke = useCallback(() => {
    if (!isDrawing.current || !currentStroke.current) return
    isDrawing.current = false
    const finished = currentStroke.current
    currentStroke.current = null
    setStrokes(prev => [...prev, finished])
  }, [])

  const undo = useCallback(() => {
    setStrokes(prev => {
      const next = prev.slice(0, -1)
      redraw(next)
      return next
    })
  }, [redraw])

  const clear = useCallback(() => {
    setStrokes([])
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [canvasRef, getCtx])

  const getImageData = useCallback((): string | null => {
    return canvasRef.current?.toDataURL('image/png') ?? null
  }, [canvasRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('touchstart', startStroke, { passive: false })
    canvas.addEventListener('touchmove', continueStroke, { passive: false })
    canvas.addEventListener('touchend', endStroke)
    canvas.addEventListener('mousedown', startStroke)
    canvas.addEventListener('mousemove', continueStroke)
    canvas.addEventListener('mouseup', endStroke)
    return () => {
      canvas.removeEventListener('touchstart', startStroke)
      canvas.removeEventListener('touchmove', continueStroke)
      canvas.removeEventListener('touchend', endStroke)
      canvas.removeEventListener('mousedown', startStroke)
      canvas.removeEventListener('mousemove', continueStroke)
      canvas.removeEventListener('mouseup', endStroke)
    }
  }, [canvasRef, startStroke, continueStroke, endStroke])

  return { strokes, undo, clear, getImageData }
}
