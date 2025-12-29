let voiceUnlocked = false;

export function initNotificationVoice() {
  // SpeechSynthesis no necesita unlock siempre, pero algunos navegadores pueden restringir audio sin gesto.
  voiceUnlocked = true;
}

export function speakNotificationReminder(text, { lang = 'es-ES', rate = 1.02, pitch = 1, volume = 1 } = {}) {
  try {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return false;
    if (!voiceUnlocked) return false;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Cancelar cola para evitar solapamientos
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}


