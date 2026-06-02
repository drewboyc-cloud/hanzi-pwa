import { useEffect, useRef, useState } from 'react'
import HanziWriter from 'hanzi-writer'

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
      drawingColor: '#e63946',
      showCharacter: false,
      showOutline: true,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 300,
      // Load stroke data from our bundled local files
      charDataLoader: (char, onLoad, onError) => {
        fetch(`/hanzi-pwa/hanzi-data/${char}.json`)
          .then(r => {
            if (!r.ok) throw new Error('not found')
            return r.json()
          })
          .then(onLoad)
          .catch(() => onError?.())
      },
    })

    writerRef.current = writer

    // Show outline first, then mark ready
    writer.hideCharacter()
    setTimeout(() => setStatus('ready'), 800)

    return () => {
      writerRef.current = null
    }
  }, [char])

  function handleAnimate() {
    if (!writerRef.current) return
    setStatus('animating')
    writerRef.current.animateCharacter({
      onComplete: () => setStatus('ready'),
    })
  }

  function handleReplay() {
    handleAnimate()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Canvas area */}
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

      {/* Controls */}
      <div className="flex gap-3">
        {status === 'ready' && (
          <button onClick={handleAnimate} className="btn-primary px-6">
            ▶ Play stroke order
          </button>
        )}
        {status === 'animating' && (
          <button
            onClick={handleReplay}
            className="btn-ghost"
          >
            ↺ Replay
          </button>
        )}
      </div>

      <p className="text-paper/30 text-xs text-center">
        Strokes animate in the correct writing order
      </p>
    </div>
  )
}
