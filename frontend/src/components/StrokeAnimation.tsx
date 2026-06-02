import { useEffect, useRef, useState } from 'react'
import HanziWriter from 'hanzi-writer'
import { getStrokeData } from '../services/strokeData'

interface Props {
  char: string
}

export function StrokeAnimation({ char }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const writerRef = useRef<HanziWriter | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'animating' | 'error'>('loading')

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''
    setStatus('loading')

    const writer = HanziWriter.create(containerRef.current, char, {
      width: 280,
      height: 280,
      padding: 20,
      strokeColor: '#e63946',
      radicalColor: '#f4a261',
      outlineColor: 'rgba(255,255,255,0.1)',
      showCharacter: false,
      showOutline: true,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 300,
      // Load from bundled all-strokes.json — works fully offline
      charDataLoader: (char, onLoad, onError) => {
        getStrokeData(char)
          .then(data => {
            if (data) onLoad(data as Parameters<typeof onLoad>[0])
            else onError?.()
          })
          .catch(() => onError?.())
      },
    })

    writerRef.current = writer
    writer.hideCharacter()
    setTimeout(() => setStatus('ready'), 600)

    return () => { writerRef.current = null }
  }, [char])

  function handleAnimate() {
    if (!writerRef.current) return
    setStatus('animating')
    writerRef.current.animateCharacter({
      onComplete: () => setStatus('ready'),
    })
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative rounded-2xl border border-white/20 bg-ink overflow-hidden" style={{ width: 280, height: 280 }}>
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center text-paper/30 text-sm">
            Loading strokes…
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center text-paper/30 text-sm px-4 text-center">
            Stroke data not available for this character
          </div>
        )}
        <div ref={containerRef} />
      </div>

      <div className="flex gap-3">
        {(status === 'ready' || status === 'animating') && (
          <button onClick={handleAnimate} className="btn-primary px-6">
            {status === 'animating' ? '↺ Replay' : '▶ Play stroke order'}
          </button>
        )}
      </div>

      <p className="text-paper/30 text-xs text-center">
        Strokes animate in the correct writing order
      </p>
    </div>
  )
}
