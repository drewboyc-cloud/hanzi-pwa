import { useAudio } from '../hooks/useAudio'

interface Props {
  text: string        // hanzi to speak
  rate?: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function AudioButton({ text, rate, size = 'md', label }: Props) {
  const { speak, speaking, supported } = useAudio()

  if (!supported) return null

  const sizeClass = size === 'sm' ? 'text-base px-2 py-1' : size === 'lg' ? 'text-2xl px-4 py-2' : 'text-lg px-3 py-1.5'

  return (
    <button
      onClick={() => speak(text, rate)}
      className={`flex items-center gap-1.5 rounded-xl border transition-colors ${sizeClass} ${
        speaking
          ? 'border-cinnabar text-cinnabar bg-cinnabar/10'
          : 'border-white/20 text-paper/60 hover:text-paper hover:border-white/40'
      }`}
      aria-label={`Play pronunciation of ${text}`}
    >
      <span>{speaking ? '🔊' : '🔈'}</span>
      {label && <span className="text-sm">{label}</span>}
    </button>
  )
}
