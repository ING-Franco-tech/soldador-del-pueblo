const characters = {
  nino: [1.7, 1.08],
  senora: [1.15, .92, 'female'],
  ingeniera: [1.2, 1, 'female'],
  maestro: [.65, .9, 'male'],
  capitana: [1.05, 1.02, 'female'],
  aurelio: [.85, .95, 'male'],
  operario: [.95, 1.05, 'male'],
  inspector: [.8, .98, 'male'],
};

const locales = ['es-co', 'es-419', 'es-us', 'es-mx', 'es-es'];
const names = {
  female: /\b(?:sabina|paulina|helena|laura|elvira|female|mujer|dalia|salome|paloma)\b|google espanol de estados unidos/,
  male: /\b(?:jorge|pablo|raul|diego|gonzalo|alvaro|male|hombre)\b/,
};

function clean(text) {
  const entities = { amp: '&', quot: '"', apos: "'", nbsp: ' ', lt: '<', gt: '>' };
  return String(text ?? '')
    .replace(/&(?:#(x[\da-f]+|\d+)|([a-z]+));/gi, (match, code, entity) => {
      if (!code) return Object.hasOwn(entities, entity.toLowerCase()) ? entities[entity.toLowerCase()] : match;
      const point = /^x/i.test(code) ? parseInt(code.slice(1), 16) : Number(code);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
    })
    .replace(/<!--[\s\S]*?-->|<\/?[a-z][^>]*>/gi, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\bhttps?:\/\/\S+/gi, ' ')
    .replace(/[\x60*_~]|^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/[\d#*]\uFE0F?\u20E3|[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\u200D\uFE0E\uFE0F\u{E0020}-\u{E007F}]/gu, '')
    .replace(/\u20E3/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function localeRank(voice) {
  const language = voice.lang.toLowerCase().replace(/_/g, '-');
  const preferred = locales.indexOf(language);
  return preferred < 0 ? locales.length : preferred;
}

function pickVoice(voices, gender) {
  const spanish = voices.filter(voice => /^es(?:[-_]|$)/i.test(voice.lang));
  spanish.sort((a, b) => localeRank(a) - localeRank(b));
  const hint = names[gender];
  return spanish.find(voice => hint?.test(
    voice.name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  )) ?? spanish[0];
}

export class Voices {
  constructor() {
    this._enabled = true;
    this._current = null;
  }

  get supported() {
    return typeof globalThis.speechSynthesis?.speak === 'function'
      && typeof globalThis.SpeechSynthesisUtterance === 'function';
  }

  get enabled() {
    return this._enabled;
  }

  setEnabled(value) {
    this._enabled = Boolean(value);
    if (!this._enabled) this.stop();
  }

  say(text, character, opts) {
    this.stop();
    if (!this._enabled || !this.supported) return Promise.resolve();
    const spoken = clean(text);
    if (!spoken) return Promise.resolve();

    const synth = globalThis.speechSynthesis;
    const [pitch, rate, gender] = Object.hasOwn(characters, character) ? characters[character] : [1, 1];
    const utterance = new globalThis.SpeechSynthesisUtterance(spoken);
    utterance.lang = 'es-CO';
    utterance.pitch = pitch;
    utterance.rate = rate;
    if (Number.isFinite(opts?.volume)) utterance.volume = Math.max(0, Math.min(1, opts.volume));

    return new Promise(resolve => {
      let loadTimer;
      let started = false;
      const finish = () => {
        clearTimeout(loadTimer);
        synth.removeEventListener?.('voiceschanged', onVoicesChanged);
        utterance.onend = utterance.onerror = null;
        if (this._current?.finish === finish) this._current = null;
        resolve();
      };
      const speak = voices => {
        if (started || this._current?.finish !== finish) return;
        started = true;
        clearTimeout(loadTimer);
        synth.removeEventListener?.('voiceschanged', onVoicesChanged);
        const selected = pickVoice(voices, gender);
        if (selected) {
          utterance.voice = selected;
          utterance.lang = selected.lang;
        }
        try { synth.speak(utterance); } catch { finish(); }
      };
      const getVoices = () => synth.getVoices?.() ?? [];
      const onVoicesChanged = () => {
        const voices = getVoices();
        if (voices.length) speak(voices);
      };
      this._current = { synth, finish };
      utterance.onend = utterance.onerror = finish;
      const voices = getVoices();
      if (voices.length) {
        speak(voices);
      } else {
        synth.addEventListener?.('voiceschanged', onVoicesChanged);
        loadTimer = setTimeout(() => speak(getVoices()), 250);
      }
    });
  }

  stop() {
    const current = this._current;
    if (!current) return;
    current.finish();
    current.synth.cancel();
  }
}
