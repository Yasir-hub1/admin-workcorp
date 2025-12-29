let audioCtx = null;
let unlocked = false;

export function initNotificationAudio() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      // Se reanuda en el gesto del usuario
      audioCtx.resume().catch(() => {});
    }
    unlocked = true;
    return true;
  } catch {
    return false;
  }
}

export function playNotificationSound({ volume = 0.25, frequency = 880, durationMs = 140 } = {}) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();

    // Si el navegador bloquea autoplay, simplemente no sonará hasta que se llame initNotificationAudio() con un gesto.
    if (audioCtx.state === 'suspended') {
      if (!unlocked) return;
      audioCtx.resume().catch(() => {});
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.value = frequency;

    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.02);
  } catch {
    // silent
  }
}


