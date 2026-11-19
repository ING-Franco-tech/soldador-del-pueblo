const clamp = (value, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, value));
const number = (value, fallback) => Number.isFinite(value) ? value : fallback;
const tau = Math.PI * 2;

const arcs = {
  SMAW:     { tone: 82, buzz: .045, hiss: .25, cutoff: 2450, sparks: .62, rate: 0 },
  GMAW:     { tone: 108, buzz: .085, hiss: .24, cutoff: 2950, sparks: .42, rate: 108 },
  FCAW:     { tone: 96, buzz: .092, hiss: .29, cutoff: 2350, sparks: .50, rate: 96 },
  GTAW_AC:  { tone: 60, buzz: .076, hiss: .20, cutoff: 3950, sparks: 0 },
  GTAW_DC:  { tone: 138, buzz: .014, hiss: .16, cutoff: 3400, sparks: 0 },
  EBW:      { tone: 2680, buzz: .022, hiss: .076, cutoff: 1580, sparks: 0 },
  OAW:      { tone: 74, buzz: .022, hiss: .36, cutoff: 820, sparks: 0 },
  LBW:      { tone: 310, buzz: .023, hiss: .13, cutoff: 4450, sparks: 0 },
  SAW:      { tone: 101, buzz: .042, hiss: .12, cutoff: 1100, sparks: 0 },
};

const ambients = {
  taller: { hum: 60, octave: 120, tone: .032, air: .09, cutoff: 480, detail: 'clink' },
  exterior: { hum: 103, octave: 187, tone: .008, air: .15, cutoff: 390, detail: 'bird' },
  industrial: { hum: 45, octave: 91, tone: .052, air: .13, cutoff: 270, detail: 'compressor' },
  camara_vacio: { hum: 50, octave: 100, tone: .065, air: .083, cutoff: 155 },
};

// Capas tonales: frecuencia inicial, frecuencia final, nivel, forma y duración.
const effects = {
  click: { time: .05, tones: [[950, 490, .09, 'triangle', .038]], noise: [.13, 2900, 'bandpass'] },
  ok: { time: .23, notes: [[523, 0, .13], [784, .075, .15]] },
  error: { time: .24, tones: [[235, 126, .14, 'triangle', .22], [170, 99, .043, 'sawtooth', .14]] },
  grinder: { time: 1.6, attack: .13, fade: .29, tones: [[390, 1220, .095, 'sawtooth'], [960, 2620, .032, 'triangle']], noise: [.39, 2800, 'bandpass', 47, .49] },
  wire_brush: { time: .58, noise: [.34, 3100, 'bandpass', 11, .93] },
  tack: { time: .22, tones: [[120, 75, .085, 'triangle', .14]], noise: [.42, 2200, 'highpass', 76, .66] },
  clamp: { time: .25, tones: [[620, 545, .13, 'triangle', .10], [155, 75, .14, 'sine', .19]], noise: [.19, 1400, 'bandpass', 19, .8] },
  magnet_click: { time: .14, tones: [[1730, 1605, .10, 'sine', .089], [355, 175, .12, 'triangle', .08]], noise: [.13, 4200, 'bandpass'] },
  slag_chip: { time: .39, tones: [[1495, 1380, .11, 'sine', .22], [2085, 2010, .064, 'sine', .17]], noise: [.31, 3000, 'highpass', 18, .93] },
  pump_down: { time: 3, attack: .45, fade: .35, tones: [[30, 67, .16, 'triangle'], [60, 133, .075, 'sawtooth'], [88, 201, .032, 'sine']], noise: [.22, 240, 'lowpass', 19, .30] },
  vent_hiss: { time: 1.1, attack: .06, fade: .64, noise: [.39, 2770, 'bandpass', 7, .17] },
  success: { time: .79, notes: [[523.25, 0, .30], [659.25, .11, .31], [783.99, .22, .34], [1046.5, .36, .42]] },
  fail: { time: .57, tones: [[134, 65, .23, 'triangle'], [85, 44, .125, 'sine', .45]], noise: [.09, 420, 'lowpass'] },
  dab: { time: .10, noise: [.26, 3850, 'bandpass', 82, .62] },
  electrode_change: { time: .39, tones: [[1100, 930, .10, 'triangle', .13], [514, 434, .07, 'sine', .32]], noise: [.20, 2200, 'bandpass', 15, .80] },
  page: { time: .34, attack: .04, noise: [.21, 1300, 'bandpass', 28, .52] },
  hammer: { time: .48, tones: [[231, 171, .19, 'triangle', .21], [995, 980, .13, 'sine', .42], [1672, 1647, .09, 'sine', .28]], noise: [.38, 1700, 'bandpass', 0, 0, .065] },
  coin: { time: .40, tones: [[2360, 2280, .15, 'sine', .33], [3648, 3490, .075, 'sine', .19]] },
  door: { time: .62, tones: [[394, 170, .095, 'triangle', .30], [113, 49, .18, 'sine', .32]], noise: [.29, 570, 'lowpass', 14, .55] },
  countdown: { time: .13, tones: [[880, 880, .15, 'sine']] },
};

export class WeldAudio {
  constructor() {
    this.context = null;
    this.masterLevel = .75;
    this.muted = false;
    this.ambient = null;
    this.arc = null;
    this.buffers = new Map();
  }

  async resume() {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return;
    try {
      if (!this.context || this.context.state === 'closed') {
        const ctx = new Audio();
        this.context = ctx;
        this.buffers.clear();
        this.ambient = this.arc = null;
        this.mix = ctx.createGain();
        this.master = ctx.createGain();
        this.master.gain.value = this.muted ? 0 : this.masterLevel;
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -19;
        compressor.knee.value = 20;
        compressor.ratio.value = 3;
        compressor.attack.value = .008;
        compressor.release.value = .17;

        const reverb = ctx.createConvolver();
        const size = Math.ceil(ctx.sampleRate * .38);
        const impulse = ctx.createBuffer(2, size, ctx.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
          const data = impulse.getChannelData(channel);
          const start = Math.floor(ctx.sampleRate * (.011 + channel * .004));
          for (let i = start; i < size; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / size) ** 3.3;
          }
          data[start] += .65;
        }
        reverb.buffer = impulse;
        const wet = ctx.createGain();
        wet.gain.value = .15;
        this.mix.connect(compressor);
        this.mix.connect(reverb).connect(wet).connect(compressor);
        compressor.connect(this.master).connect(ctx.destination);
      }
      if (this.context.state !== 'running') await this.context.resume();
    } catch {
      // El navegador puede posponer el audio hasta el siguiente gesto.
    }
  }

  setMaster(value) {
    this.masterLevel = clamp(number(value, this.masterLevel));
    this._masterUpdate();
  }

  setMuted(value) {
    this.muted = Boolean(value);
    this._masterUpdate();
  }

  _masterUpdate() {
    if (this.master && this.context?.state !== 'closed') {
      this._smooth(this.master.gain, this.muted ? 0 : this.masterLevel, .028);
    }
  }

  _smooth(param, value, time) {
    param.setTargetAtTime(value, this.context.currentTime, time);
  }

  _voice() {
    const output = this.context.createGain();
    output.connect(this.mix);
    return { output, nodes: [output], sources: new Set() };
  }

  _node(voice, node) {
    voice.nodes.push(node);
    return node;
  }

  _start(voice, source, when, end) {
    voice.sources.add(source);
    source.onended = () => {
      source.onended = null;
      source.disconnect();
      voice.sources.delete(source);
      if (voice.sources.size === 0) {
        for (const node of voice.nodes) node.disconnect();
      }
    };
    source.start(when);
    if (end !== undefined) source.stop(end);
    return source;
  }

  _stop(voice, fade) {
    if (!voice) return;
    const now = this.context.currentTime;
    const gain = voice.output.gain;
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
    else {
      const current = gain.value;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(current, now);
    }
    gain.linearRampToValueAtTime(0, now + fade);
    for (const source of voice.sources) source.stop(now + fade + .018);
  }

  _osc(voice, destination, frequency, endFrequency, amplitude, type, start, end, attack = .006) {
    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (end !== undefined && endFrequency !== frequency) {
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + (end - start) * .62);
    }
    const gain = this._node(voice, this.context.createGain());
    if (end === undefined) gain.gain.value = amplitude;
    else {
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(amplitude, start + Math.min(attack, (end - start) * .35));
      gain.gain.exponentialRampToValueAtTime(.0001, end);
    }
    oscillator.connect(gain).connect(destination);
    this._start(voice, oscillator, start, end);
    return oscillator;
  }

  _buffer(key, duration, sample) {
    if (this.buffers.has(key)) return this.buffers.get(key);
    const rate = this.context.sampleRate;
    const frames = Math.ceil(rate * duration);
    const buffer = this.context.createBuffer(1, frames, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = sample(i / rate, rate, i);
    this.buffers.set(key, buffer);
    return buffer;
  }

  _noise(voice, buffer, type, frequency, level, start, end, destination = voice.output) {
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = end === undefined;
    const filter = this._node(voice, this.context.createBiquadFilter());
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = type === 'bandpass' ? .85 : .42;
    const gain = this._node(voice, this.context.createGain());
    gain.gain.value = level;
    source.connect(filter).connect(gain).connect(destination);
    this._start(voice, source, start, end);
    return { source, filter, gain };
  }

  _white() {
    return this._buffer('ruido', 5, () => Math.random() * 2 - 1);
  }

  _ambientDetail(kind) {
    return this._buffer('ambiente:' + kind, 23, t => {
      if (kind === 'bird') {
        let chirps = 0;
        for (const at of [2.1, 2.39, 2.73, 11.3, 11.55, 12.1, 19.7, 20.05]) {
          const u = (t - at) / .18;
          if (u > 0 && u < 1) chirps += Math.sin(Math.PI * u) ** 2 * Math.sin(tau * (.18 * (1670 * u + 835 * u * u)));
        }
        return .48 * chirps + .14 * Math.sin(tau * 192 * t + 3 * Math.sin(tau * 3.3 * t)) * Math.sin(Math.PI * t / 23) ** 3;
      }
      if (kind === 'compressor') {
        const envelope = Math.sin(Math.PI * clamp((t - 4) / 13)) ** 2;
        return envelope * (.49 * Math.sin(tau * 71 * t + 2 * Math.sin(tau * 2.1 * t)) + .33 * (Math.random() * 2 - 1));
      }
      let ring = 0;
      for (const at of [5.7, 15.2, 15.39]) {
        const u = t - at;
        if (u >= 0 && u < .42) ring += Math.exp(-u * 17) * (Math.sin(tau * 870 * u) + .55 * Math.sin(tau * 1437 * u));
      }
      return ring * .6;
    });
  }

  startAmbient(kind) {
    if (!this.context || this.context.state === 'closed' || !Object.hasOwn(ambients, kind) || this.ambient?.kind === kind) return;
    this.stopAmbient();
    const cfg = ambients[kind];
    const now = this.context.currentTime;
    const voice = this._voice();
    voice.kind = kind;
    this.ambient = voice;
    voice.output.gain.setValueAtTime(0, now);
    voice.output.gain.linearRampToValueAtTime(1, now + 1);
    this._osc(voice, voice.output, cfg.hum, cfg.hum, cfg.tone, 'sine', now);
    this._osc(voice, voice.output, cfg.octave, cfg.octave, cfg.tone * .38, 'triangle', now);
    const air = this._noise(voice, this._white(), 'lowpass', cfg.cutoff, cfg.air, now);
    const movement = kind === 'exterior' ? .05 : .018;
    this._osc(voice, air.gain.gain, kind === 'exterior' ? .21 : .63, 0, movement, 'sine', now);
    if (cfg.detail) {
      const cutoff = cfg.detail === 'compressor' ? 480 : 4300;
      this._noise(voice, this._ambientDetail(cfg.detail), 'lowpass', cutoff, cfg.detail === 'bird' ? .044 : .064, now);
    }
  }

  stopAmbient() {
    this._stop(this.ambient, 1);
    this.ambient = null;
  }

  _crackle(key, rate) {
    let next = 0, energy = 0;
    return this._buffer('arco:' + key, 4, (t, sampleRate) => {
      if (t >= next) {
        energy = .3 + Math.random() * .7;
        next = t + (rate ? (.91 + Math.random() * .18) / rate : .005 + Math.random() ** 2 * .042);
      }
      energy *= Math.exp(-1 / (sampleRate * (rate ? .0013 : .0024)));
      const edge = Math.min(1, t * 150, (4 - t) * 150);
      return (Math.random() * 2 - 1) * energy * edge;
    });
  }

  arcStart(process) {
    if (!this.context || this.context.state === 'closed') return;
    const key = Object.hasOwn(arcs, process) ? process : 'GMAW';
    if (this.arc?.key === key) return;
    this.arcStop();
    const cfg = arcs[key];
    const now = this.context.currentTime;
    const voice = this._voice();
    Object.assign(voice, { key, cfg });
    this.arc = voice;
    voice.output.gain.setValueAtTime(0, now);
    this._smooth(voice.output.gain, .56, .018);
    voice.hiss = this._noise(voice, this._white(), key === 'OAW' ? 'lowpass' : 'bandpass', cfg.cutoff, cfg.hiss, now);
    voice.tone = this._osc(voice, voice.output, cfg.tone, cfg.tone, cfg.buzz, key === 'EBW' ? 'sine' : 'triangle', now);
    if (key === 'GTAW_AC' || key === 'EBW') {
      const harmonic = key === 'EBW' ? 47 : 120;
      this._osc(voice, voice.output, harmonic, harmonic, key === 'EBW' ? .063 : .051, 'sine', now);
    }
    if (cfg.sparks > 0) {
      voice.sparks = this._noise(voice, this._crackle(key, cfg.rate), 'bandpass', 2150, cfg.sparks, now);
      if (cfg.rate) voice.pops = this._noise(voice, this._crackle('SMAW', 0), 'bandpass', 3100, .018, now);
      if (cfg.rate) {
        const pulse = this.context.createOscillator();
        pulse.type = 'sine';
        pulse.frequency.value = cfg.rate;
        const depth = this._node(voice, this.context.createGain());
        depth.gain.value = .065;
        pulse.connect(depth).connect(voice.hiss.gain.gain);
        this._start(voice, pulse, now);
      }
    }
  }

  arcUpdate(options) {
    const v = this.arc;
    if (!v || this.context.state === 'closed') return;
    const intensity = clamp(number(options?.intensity, 1));
    const stretch = clamp(number(options?.standoff, 1) - 1, -.6, 2);
    const speed = clamp(number(options?.speed, 1), .15, 3);
    const long = Math.max(0, stretch);
    this._smooth(v.output.gain, .70 * intensity ** .72 * (1 + .19 * long), .038);
    this._smooth(v.hiss.gain.gain, v.cfg.hiss * (1 + .38 * long), .038);
    this._smooth(v.hiss.filter.frequency, v.cfg.cutoff * (1 + .28 * long + .09 * (speed - 1)), .048);
    this._smooth(v.tone.frequency, v.cfg.tone * (1 + .025 * (speed - 1) - .035 * stretch), .064);
    if (v.sparks) {
      this._smooth(v.sparks.gain.gain, v.cfg.sparks * (v.pops ? 1 - .29 * long : 1 + .43 * long), .04);
      this._smooth(v.sparks.filter.frequency, 2150 + long * 680, .055);
      this._smooth(v.sparks.source.playbackRate, clamp(.97 + .13 * (speed - 1) + .08 * stretch, .83, 1.14), .065);
    }
    if (v.pops) this._smooth(v.pops.gain.gain, .018 + .31 * long, .038);
  }

  arcStop() {
    this._stop(this.arc, .09);
    this.arc = null;
  }

  play(name) {
    if (!this.context || this.context.state === 'closed' || !Object.hasOwn(effects, name)) return;
    const effect = effects[name];
    const voice = this._voice();
    const now = this.context.currentTime;
    for (const [f0, f1, level, shape, duration] of effect.tones || []) {
      this._osc(voice, voice.output, f0, f1, level, shape, now, now + (duration ?? effect.time), effect.attack ?? .005);
    }
    for (const [f, offset, duration] of effect.notes || []) {
      const start = now + offset;
      this._osc(voice, voice.output, f, f, .145, 'sine', start, start + duration);
      this._osc(voice, voice.output, f * 2.01, f * 2, .035, 'sine', start, start + duration * .46);
    }
    if (effect.noise) {
      const [level, frequency, type, pulse = 0, depth = 0, duration = effect.time] = effect.noise;
      const buffer = pulse ? this._buffer('efecto:' + name, effect.time, t =>
        (Math.random() * 2 - 1) * (1 - depth * (.5 + .5 * Math.cos(tau * pulse * t + .7 * Math.sin(t * 21))))) : this._white();
      const end = now + duration;
      const { gain } = this._noise(voice, buffer, type, frequency, 0, now, end);
      const attack = Math.min(effect.attack ?? .005, duration * .43);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(level, now + attack);
      if (effect.fade) gain.gain.setValueAtTime(level * .86, Math.max(now + attack, end - effect.fade));
      gain.gain.exponentialRampToValueAtTime(.0001, end);
    }
  }
}
