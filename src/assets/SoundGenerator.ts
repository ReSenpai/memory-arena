import Phaser from 'phaser'

type ToneParams = {
  type: OscillatorType
  freqStart: number
  freqEnd: number
  duration: number
  volume: number
}

function generateTone(
  ctx: AudioContext,
  params: ToneParams,
): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const length = Math.floor(sampleRate * params.duration)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    const progress = i / length
    const freq =
      params.freqStart + (params.freqEnd - params.freqStart) * progress

    // Envelope — fade out at the end
    const envelope = 1 - progress

    let sample = 0
    const phase = (2 * Math.PI * freq * t) % (2 * Math.PI)
    switch (params.type) {
      case 'sine':
        sample = Math.sin(phase)
        break
      case 'square':
        sample = Math.sin(phase) > 0 ? 1 : -1
        break
      case 'sawtooth':
        sample = 2 * ((freq * t) % 1) - 1
        break
      case 'triangle': {
        const p = (freq * t) % 1
        sample = 4 * Math.abs(p - 0.5) - 1
        break
      }
    }

    data[i] = sample * envelope * params.volume
  }
  return buffer
}

function generateArpeggio(
  ctx: AudioContext,
  notes: number[],
  noteDuration: number,
  volume: number,
): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const totalLength = Math.floor(sampleRate * noteDuration * notes.length)
  const buffer = ctx.createBuffer(1, totalLength, sampleRate)
  const data = buffer.getChannelData(0)
  const samplesPerNote = Math.floor(sampleRate * noteDuration)

  for (let n = 0; n < notes.length; n++) {
    const freq = notes[n]
    for (let i = 0; i < samplesPerNote; i++) {
      const idx = n * samplesPerNote + i
      if (idx >= totalLength) break
      const t = i / sampleRate
      const envelope = 1 - i / samplesPerNote
      data[idx] = Math.sin(2 * Math.PI * freq * t) * envelope * volume
    }
  }
  return buffer
}

export function generateSounds(scene: Phaser.Scene): void {
  const ctx = new AudioContext()

  const sounds: Record<string, AudioBuffer> = {
    'sfx-place': generateTone(ctx, {
      type: 'sine',
      freqStart: 440,
      freqEnd: 880,
      duration: 0.12,
      volume: 0.3,
    }),
    'sfx-free': generateTone(ctx, {
      type: 'sine',
      freqStart: 660,
      freqEnd: 330,
      duration: 0.15,
      volume: 0.3,
    }),
    'sfx-error': generateTone(ctx, {
      type: 'square',
      freqStart: 200,
      freqEnd: 200,
      duration: 0.2,
      volume: 0.15,
    }),
    'sfx-garbage': generateTone(ctx, {
      type: 'sawtooth',
      freqStart: 100,
      freqEnd: 50,
      duration: 0.3,
      volume: 0.2,
    }),
    'sfx-tick': generateTone(ctx, {
      type: 'sine',
      freqStart: 1000,
      freqEnd: 1000,
      duration: 0.03,
      volume: 0.08,
    }),
    'sfx-drag': generateTone(ctx, {
      type: 'sine',
      freqStart: 500,
      freqEnd: 500,
      duration: 0.05,
      volume: 0.15,
    }),
    'sfx-win': generateArpeggio(ctx, [523, 659, 784, 1047], 0.12, 0.3),
    'sfx-lose': generateArpeggio(ctx, [784, 659, 523], 0.15, 0.25),
  }

  for (const [key, buffer] of Object.entries(sounds)) {
    scene.cache.audio.add(key, buffer)
  }

  // Phaser's WebAudioSoundManager нуждается в decode.
  // Добавляем буферы напрямую через cache, sound manager подхватит.
  // Для HTML5Audio fallback используем base64 — но web audio предпочтителен.
  for (const key of Object.keys(sounds)) {
    scene.sound.add(key)
  }

  void ctx.close()
}
