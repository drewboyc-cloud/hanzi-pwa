/**
 * Web Speech API hook for Mandarin Chinese TTS.
 * Passes raw hanzi to the engine so iOS handles:
 *  - Tone sandhi (3rd+3rd → 2nd+3rd, 一 variations etc.)
 *  - Polyphonic characters (行 in 银行 vs 行走)
 *  - Natural prosody
 * Voice: prefers female native Mandarin (Ting-Ting / Meijia on iOS)
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const PREF_VOICES = ['Ting-Ting', 'Meijia', 'Sinji']  // iOS female Mandarin voices

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  // 1. Try preferred female voices by name
  for (const name of PREF_VOICES) {
    const v = voices.find(v => v.name.includes(name))
    if (v) return v
  }
  // 2. Any zh-CN / zh-TW voice
  const zh = voices.find(v => v.lang.startsWith('zh'))
  return zh ?? null
}

export function useAudio() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    if (!window.speechSynthesis) return
    setSupported(true)

    function loadVoices() {
      voiceRef.current = pickVoice()
    }
    loadVoices()
    // Voices load asynchronously on some browsers
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [])

  const speak = useCallback((text: string, rate = 0.85) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'zh-CN'
    utt.rate = rate        // slightly slower for learning
    utt.pitch = 1.0

    if (voiceRef.current) utt.voice = voiceRef.current

    utt.onstart = () => setSpeaking(true)
    utt.onend = () => setSpeaking(false)
    utt.onerror = () => setSpeaking(false)

    window.speechSynthesis.speak(utt)
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }, [])

  return { speak, stop, speaking, supported }
}
