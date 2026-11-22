/**
 * SAGA Audio Feedback Synthesizer using Web Audio API
 * Generates pristine chimes, shutter sounds, and celebration chords with 0 external network requests.
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        this.ctx = new AudioCtx()
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume()
      }
      return this.ctx
    } catch {
      return null
    }
  }

  /**
   * Status change / notification dual-tone chime (E5 -> B5)
   */
  playNotificationChime(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(659.25, now) // E5
      osc.frequency.setValueAtTime(987.77, now + 0.12) // B5

      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.45)
    } catch {
      // AudioContext autoplay restrictions handled
    }
  }

  /**
   * Camera shutter click sound effect for photo capture proof
   */
  playCameraShutter(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime

      // Click 1 (Mirror flip)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'triangle'
      osc1.frequency.setValueAtTime(1400, now)
      gain1.gain.setValueAtTime(0.25, now)
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.05)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.05)

      // Click 2 (Shutter curtain)
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'square'
      osc2.frequency.setValueAtTime(450, now + 0.06)
      gain2.gain.setValueAtTime(0.15, now + 0.06)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.16)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.06)
      osc2.stop(now + 0.16)
    } catch {
      // Ignore
    }
  }

  /**
   * Joyful delivery celebration arpeggio (C5 -> E5 -> G5 -> C6)
   */
  playSuccessCelebration(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const noteStart = now + idx * 0.09

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, noteStart)

        gain.gain.setValueAtTime(0.2, noteStart)
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(noteStart)
        osc.stop(noteStart + 0.35)
      })
    } catch {
      // Ignore
    }
  }

  /**
   * Attention warning chime
   */
  playWarningAlert(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.setValueAtTime(330, now + 0.1)

      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.3)
    } catch {
      // Ignore
    }
  }

  /**
   * High-priority Restaurant Kitchen POS Bell Alert
   * Resonant triple harmonic chime (A5 -> D6 -> A6) resembling Zomato/Swiggy KDS alert
   */
  playKitchenBellAlert(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const bellPings = [880, 1174.66, 1760] // A5, D6, A6

      bellPings.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const startTime = now + idx * 0.14

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, startTime)

        gain.gain.setValueAtTime(0.35, startTime)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.65)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(startTime)
        osc.stop(startTime + 0.65)
      })
    } catch {
      // AudioContext autoplay restrictions handled
    }
  }
}

export const sounds = new SoundEffectsManager()
