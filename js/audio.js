const clamp = (value, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, value));
const number = (value, fallback) => Number.isFinite(value) ? value : fallback;
const tau = Math.PI * 2;

const arcs = {
  SMAW: [120, .10, 3100, .20],
  GMAW: [115, .045, 4200, .18, 110],
  FCAW: [105, .055, 3500, .22, 98],
  GTAW_DC: [120, .025, 4800, .15],
  GTAW_AC: [60, .09, 4500, .17],
  EBW: [5300, .008, 2100, .085],
  OAW: [0, 0, 4400, .27],
  LBW: [140, .024, 4600, .13],
  SAW: [100, .049, 1800, .11],
};

const ambients = {
  taller: [60, .026, 530, .11],
  exterior: [0, 0, 390, .32],
  campo: [42, .044, 320, .55],
  industrial: [57, .052, 410, .19],
  camara_vacio: [50, .072, 230, .14],
};

const actionTime = {
  grinder: 1.6, wire_brush: .75, torch: 1.5, cutting_torch: 1.5,
  purge_gas: 1.3, vacuum_pump: 2, oven_hum: 2, drill: 1.3, rag: .9,
};

const cues = {
  ok: [[523, 0, .11], [784, .075, .16]],
  error: [[196, 0, .13], [147, .095, .2]],
  success: [[523, 0, .24], [659, .11, .24], [784, .22, .24], [1047, .36, .4]],
  fail: [[196, 0, .25], [147, .14, .32], [98, .28, .32]],
  oven_beep: [[2480, 0, .10], [2480, .19, .10]],
  countdown: [[880, 0, .13]],
  alarm: Array.from({ length: 8 }, (_, i) => [i % 2 ? 2700 : 3100, i * .125, .085]),
  warning: [[1318, 0, .15], [988, .10, .23]],
};

const random = () => Math.random() * 2 - 1;
const interval = rate => -Math.log(1 - Math.random()) / rate;
const noop = () => {};

export class WeldAudio {
  constructor() {
    this.context = null;
    this.masterLevel = .75;
    this.muted = false;
    this.ambient = null;
    this.arc = null;
    this.buffers = new Map();
    this.voices = new Set();
  }

  async resume() {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return;
    try {
      if (!this.context || this.context.state === 'closed') {
        for (const voice of this.voices) this._dispose(voice);
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
        wet.gain.value = .12;
        this.mix.connect(this.master);
        this.mix.connect(reverb).connect(wet).connect(this.master);
        this.master.connect(compressor).connect(ctx.destination);
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
    const voice = { output, nodes: [output], sources: new Set() };
    this.voices.add(voice);
    return voice;
  }

  _node(voice, node) {
    voice.nodes.push(node);
    return node;
  }

  _start(voice, source, when, end, offset = 0) {
    voice.sources.add(source);
    source.onended = () => {
      source.onended = null;
      source.disconnect();
      voice.sources.delete(source);
      if (voice.sources.size === 0) this._dispose(voice);

    };
    if (offset) source.start(when, offset); else source.start(when);
    if (end !== undefined) {
      voice.ends ??= new WeakMap();
      voice.ends.set(source, end);
      source.stop(end);
    }
    return source;
  }

  _stop(voice, fade) {
    if (!voice || voice.stopping || !this.voices.has(voice)) return;
    voice.stopping = true;
    clearInterval(voice.timer);
    if (this.context.state === 'closed') { this._dispose(voice); return; }
    const now = this.context.currentTime;
    const gain = voice.output.gain;
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
    else {
      const current = gain.value;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(current, now);
    }
    gain.linearRampToValueAtTime(0, now + fade);
    for (const source of voice.sources) source.stop(Math.min(voice.ends?.get(source) ?? Infinity, now + fade + .018));
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
    this._start(voice, source, start, end, Math.random() * Math.max(0, buffer.duration - (end === undefined ? 0 : end - start)));
    return { source, filter, gain };
  }

  _white() {
    return this._buffer('ruido', 5, () => Math.random() * 2 - 1);
  }


  _dispose(voice) {
    clearInterval(voice.timer);
    for (const source of voice.sources) {
      source.onended = null;
      source.disconnect();
    }
    voice.sources.clear();
    for (const node of voice.nodes) node.disconnect();
    this.voices.delete(voice);
  }

  _ready() {
    return this.context && this.context.state !== 'closed';
  }

  _tone(voice, start, frequency, level, type = 'sine', duration, end = frequency) {
    return this._osc(voice, voice.output, frequency, end, level, type,
      start, duration === undefined ? undefined : start + duration);
  }

  _air(voice, start, type, frequency, level, duration, attack = .008, release = .10, destination = voice.output) {
    const end = duration === undefined ? undefined : start + duration;
    const layer = this._noise(voice, this._white(), type, frequency, level, start, end, destination);
    if (end !== undefined) {
      const gain = layer.gain.gain;
      gain.setValueAtTime(.0001, start);
      gain.exponentialRampToValueAtTime(level, start + Math.min(attack, duration * .4));
      gain.setValueAtTime(level, end - Math.min(release, duration * .55));
      gain.exponentialRampToValueAtTime(.0001, end);
    }
    return layer;
  }

  _modulate(voice, start, layer, rate, depth, duration) {
    return this._osc(voice, layer.gain.gain, rate, rate, depth, 'sine',
      start, duration === undefined ? undefined : start + duration);
  }

  _texture(key, seconds, sample) {
    return this._buffer(key, seconds, (t, rate, i) =>
      sample(t, rate, i) * Math.min(1, t * 180, (seconds - t) * 180));
  }

  _crackle(key, frequency, periodic, decay) {
    let next = 0;
    let energy = 0;
    const seconds = 6;
    const falloff = Math.exp(-1 / (this.context.sampleRate * decay));
    return this._texture(key, seconds, t => {
      if (t >= next) {
        energy += periodic ? .65 + Math.random() * .35 : .17 + Math.random() ** 2 * .65;
        next = t + (periodic ? (1 + .16 * random()) / frequency : interval(frequency));
      }
      energy *= falloff;
      return Math.min(1, energy) * random();
    });
  }

  _roar(voice, start, cutting, duration, destination = voice.output) {
    let eddy = 0;
    let target = 0;
    let next = 0;
    const turbulence = this._texture('torch turbulence', 8, (t, rate) => {
      if (t >= next) {
        target = random();
        next = t + .045 + Math.random() * .32;
      }
      eddy += (target - eddy) / (.055 * rate);
      return random() * (.70 + .28 * eddy);
    });
    const end = duration === undefined ? undefined : start + duration;
    const body = this._noise(voice, turbulence, 'lowpass', cutting ? 940 : 690, 1.12, start, end, destination);
    this._modulate(voice, start, body, 2.1, .13, duration);
    this._modulate(voice, start, body, 3.73, .08, duration);
    const hiss = this._air(voice, start, 'highpass', cutting ? 2900 : 4400,
      cutting ? .38 : .27, duration, .09, .13, destination);
    if (cutting) {
      const slag = this._crackle('slag spray', 68, false, .002);
      this._noise(voice, slag, 'highpass', 2400, .6, start,
        duration === undefined ? undefined : start + duration);
    }
    return hiss;
  }

  _motor(voice, start, f, level, duration, end = f) {
    this._tone(voice, start, f, level, 'sine', duration, end);
    this._tone(voice, start, 2 * f, level * .44, 'triangle', duration, 2 * end);
    this._tone(voice, start, 3 * f, level * .24, 'sine', duration, 3 * end);
  }

  _action(voice, name, start, duration, level = 1) {
    const end = duration === undefined ? undefined : start + duration;
    switch (name) {
      case 'grinder':
      case 'drill': {
        const grinder = name === 'grinder';
        const f = grinder ? 188 : 133;
        this._motor(voice, start, f, .20 * level, duration);
        this._tone(voice, start, f * (grinder ? 7 : 5), .046 * level, 'sine', duration);
        let pressure = .75;
        let target = pressure;
        let next = 0;
        const scrape = this._texture('scrape', 7, (t, rate) => {
          if (t >= next) {
            target = .35 + .65 * Math.random();
            next = t + .025 + Math.random() * .19;
          }
          pressure += (target - pressure) / (.027 * rate);
          const load = Math.sin(tau * 7.3 * t + 1.7 * Math.sin(tau * .67 * t));
          return random() * pressure * (.32 + .68 * (.5 + .5 * load) ** 1.8);
        });
        this._noise(voice, scrape, 'highpass', grinder ? 1300 : 850, .78 * level, start, end);
        break;
      }
      case 'wire_brush':
      case 'rag': {
        const brush = name === 'wire_brush';
        const strokes = this._texture(name, 7, t => {
          const phase = tau * (brush ? 4.6 : 1.9) * t + .4 * Math.sin(tau * .81 * t);
          const stroke = Math.max(0, Math.sin(phase)) ** 1.6;
          const grit = brush ? .68 + .32 * Math.sin(tau * 73 * t + 11 * Math.sin(t * 13)) : 1;
          return random() * stroke * grit;
        });
        this._noise(voice, strokes, brush ? 'highpass' : 'bandpass',
          brush ? 2200 : 680, (brush ? .78 : .19) * level, start, end);
        break;
      }
      case 'torch':
      case 'cutting_torch':
        this._roar(voice, start, name === 'cutting_torch', duration);
        break;
      case 'purge_gas':
        this._air(voice, start, 'bandpass', 4100, .24 * level, duration, .1, .20);
        break;
      case 'vacuum_pump':
      case 'oven_hum': {
        const pump = name === 'vacuum_pump';
        this._motor(voice, start, pump ? 49 : 60, (pump ? .15 : .08) * level, duration);
        const rumble = this._air(voice, start, 'lowpass', pump ? 380 : 230,
          (pump ? .31 : .14) * level, duration, .23, .24);
        if (pump) this._modulate(voice, start, rumble, 18, .08 * level, duration);
        break;
      }
    }
  }

  loop(name) {
    if (!this._ready() || !Object.hasOwn(actionTime, name)) return noop;
    const voice = this._voice();
    const now = this.context.currentTime;
    voice.output.gain.setValueAtTime(0, now);
    voice.output.gain.linearRampToValueAtTime(.82, now + .085);
    this._action(voice, name, now);
    return () => this._stop(voice, .12);
  }

  _murmur() {
    return this._texture('murmur', 13, t => {
      const syllables = Math.max(0, Math.sin(tau * 4.2 * t + 1.8 * Math.sin(tau * .71 * t)));
      const phrase = Math.max(0, Math.sin(tau * .32 * t));
      const vowels = Math.sin(tau * 137 * t + 2.8 * Math.sin(tau * .91 * t));
      return syllables * phrase * (.50 * vowels + .30 * vowels ** 3 + .20 * random());
    });
  }

  startAmbient(kind) {
    if (!this._ready() || !Object.hasOwn(ambients, kind) || this.ambient?.kind === kind) return;
    this.stopAmbient();
    const voice = this._voice();
    voice.kind = kind;
    this.ambient = voice;
    const now = this.context.currentTime;
    const [frequency, hum, cutoff, level] = ambients[kind];
    voice.output.gain.setValueAtTime(0, now);
    voice.output.gain.linearRampToValueAtTime(1, now + 1.2);
    if (frequency) this._motor(voice, now, frequency, hum);
    const air = this._air(voice, now, 'lowpass', cutoff, level);
    if (kind === 'campo' || kind === 'exterior') {
      this._modulate(voice, now, air, .27, level * .40);
      this._modulate(voice, now, air, .113, level * .27);
    }
    if (kind === 'taller' || kind === 'exterior') {
      this._noise(voice, this._murmur(), 'bandpass', kind === 'taller' ? 780 : 430,
        kind === 'taller' ? .054 : .034, now);
    }
    if (kind === 'taller' || kind === 'exterior' || kind === 'industrial') {
      const detail = this._texture(kind, 21, t => {
        if (kind === 'industrial') {
          const cycle = Math.sin(Math.PI * clamp((t - 3) / 13)) ** .7;
          return cycle * (.55 * Math.sin(tau * 83 * t + .9 * Math.sin(tau * 8 * t)) + .42 * random());
        }
        let sound = 0;
        const times = kind === 'taller' ? [4.4, 12.1, 12.38, 18.8] : [2.8, 3.05, 9.4, 15.6, 15.86, 16.1];
        for (const at of times) {
          const age = t - at;
          if (age < 0 || age >= .24) continue;
          sound += kind === 'taller'
            ? Math.exp(-age * 25) * (.64 * Math.sin(tau * 1047 * age) + .31 * Math.sin(tau * 1768 * age))
            : Math.sin(Math.PI * age / .24) ** 3 * Math.sin(tau * (2850 * age - 1900 * age ** 2));
        }
        return sound;
      });
      this._noise(voice, detail, 'lowpass', kind === 'industrial' ? 720 : 4400,
        kind === 'industrial' ? .14 : .075, now);
    }
    if (kind === 'camara_vacio') this._action(voice, 'vacuum_pump', now, undefined, .42);
  }

  stopAmbient() {
    this._stop(this.ambient, 1.2);
    this.ambient = null;
  }

  arcStart(process) {
    if (!this._ready()) return;
    const key = Object.hasOwn(arcs, process) ? process : 'GMAW';
    if (this.arc?.key === key) return;
    this.arcStop();
    const voice = this._voice();
    const now = this.context.currentTime;
    const [frequency, hum, cutoff, hiss, shortCircuitRate] = arcs[key];
    Object.assign(voice, { key, frequency, cutoff, hiss, shortCircuitRate });
    this.arc = voice;
    voice.output.gain.setValueAtTime(0, now);
    voice.output.gain.linearRampToValueAtTime(.70, now + .024);
    const texture = this._node(voice, this.context.createGain());
    texture.connect(voice.output);
    voice.texture = texture.gain;
    voice.flutter = this._osc(voice, texture.gain, 9, 9, 0, 'sine', now);
    voice.flutterDepth = voice.nodes.at(-1).gain;
    if (key === 'OAW') {
      voice.air = this._roar(voice, now, false, undefined, texture);
    } else {
      voice.air = this._noise(voice, this._white(), 'bandpass', cutoff, hiss, now, undefined, texture);
      voice.tone = this._tone(voice, now, frequency, hum, key === 'GTAW_AC' ? 'triangle' : 'sine');
    }
    if (key === 'GTAW_AC') {
      this._tone(voice, now, 180, .032);
      this._tone(voice, now, 120, .061);
    }
    if (key.startsWith('GTAW')) this._air(voice, now, 'highpass', 6500, .062);
    if (key === 'EBW') this._motor(voice, now, 49, .049);
    if (key === 'SMAW' || shortCircuitRate) {
      const rate = shortCircuitRate || 850;
      const buffer = this._crackle(key, rate, Boolean(shortCircuitRate), .0014);
      voice.crackle = this._noise(voice, buffer, 'bandpass', 2900, shortCircuitRate ? .95 : 1.2,
        now, undefined, texture);
      voice.popFilter = this._node(voice, this.context.createBiquadFilter());
      voice.popFilter.type = 'bandpass';
      voice.popFilter.frequency.value = 2850;
      voice.popFilter.connect(texture);
      voice.popAt = now + .035;
      voice.popRate = shortCircuitRate ? 3 : 8;
      voice.popLevel = shortCircuitRate ? .10 : .64;
      const grain = this._buffer('droplet', .19, t =>
        random() * Math.exp(-((t * 68) % 1) * 4) * Math.min(1, ((t * 68) % 1) * 17));
      voice.timer = setInterval(() => this._schedulePops(voice, grain), 32);
      this._schedulePops(voice, grain);
    }
  }

  _schedulePops(voice, grain) {
    if (this.context.state === 'closed') { this._dispose(voice); return; }
    if (this.context.state !== 'running') return;
    const now = this.context.currentTime;
    voice.popAt = Math.max(voice.popAt, now + .005);
    while (voice.popAt < now + .105) {
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      const at = voice.popAt;
      source.buffer = grain;
      source.playbackRate.value = 1 + .3 * random();
      gain.gain.setValueAtTime(voice.popLevel * (.25 + .75 * Math.random() ** 2), at);
      gain.gain.exponentialRampToValueAtTime(.0001, at + .014);
      source.connect(gain).connect(voice.popFilter);
      this._start(voice, source, at, at + .016, Math.floor(Math.random() * 9) / 68);
      const ended = source.onended;
      source.onended = () => { gain.disconnect(); ended(); };
      voice.popAt += interval(voice.popRate);
    }
  }

  arcUpdate(options) {
    const voice = this.arc;
    if (!voice || !this._ready()) return;
    const intensity = clamp(number(options?.intensity, 1));
    const standoff = number(options?.standoff, 1);
    const speed = clamp(number(options?.speed, 1), .15, 3);
    const long = clamp((standoff - 1.25) / 1.2);
    const short = clamp((.95 - standoff) / .65);
    const blow = clamp(number(options?.blow, 0));
    const wet = clamp(number(options?.wet, 0));
    const smooth = (param, target) => this._smooth(param, target, .04);
    smooth(voice.output.gain, .80 * intensity ** .7 * (1 + .24 * long));
    smooth(voice.air.gain.gain, voice.hiss * (1 + .75 * long + .65 * blow));
    smooth(voice.air.filter.frequency, voice.cutoff * (1 + .3 * long - .62 * short));
    smooth(voice.flutter.frequency, 6 + 8 * blow);
    smooth(voice.flutterDepth, .55 * blow + .26 * short);
    if (voice.key === 'EBW') smooth(voice.tone.frequency, voice.frequency * (.90 + .23 * intensity));
    if (voice.crackle) {
      const mig = Boolean(voice.shortCircuitRate);
      smooth(voice.crackle.source.playbackRate, mig
        ? clamp(1 + .06 * (speed - 1) - .08 * short, 90 / voice.shortCircuitRate, 130 / voice.shortCircuitRate)
        : clamp(.65 + .55 * intensity + .27 * wet - .31 * short, 300 / 850, 1500 / 850));
      smooth(voice.crackle.filter.frequency, 2900 * (1 + .36 * long - .71 * short));
      smooth(voice.crackle.gain.gain, (mig ? .95 : 1.2) * (1 - .48 * short - .30 * long + .24 * wet));
      voice.popRate = mig ? 3 + 14 * long : 3 + 5 * intensity + 4 * long + 22 * wet;
      voice.popLevel = (mig ? .095 : .57) + .78 * long + 1.5 * wet;
      smooth(voice.popFilter.frequency, 2850 + 1650 * long - 1700 * short);
    }
  }

  arcStop() {
    this._stop(this.arc, .075);
    this.arc = null;
  }

  _impact(voice, start, size, level, ring = 1) {
    this._air(voice, start, 'bandpass', 3300 * size, .68 * level, .025, .001, .02);
    this._tone(voice, start, 166 * size, .26 * level, 'sine', .064, 112 * size);
    for (const [frequency, amplitude, decay] of [
      [817, .24, .21], [1463, .17, .16], [2371, .10, .11], [4039, .07, .075], [5617, .045, .05],
    ]) {
      this._tone(voice, start, frequency * size, amplitude * level, 'sine', decay * ring);
    }
  }

  play(name, opts) {
    if (!this._ready()) return;
    const supported = ['hammer', 'slag_chip', 'magnet_click', 'magnet_none', 'clamp', 'door',
      'pump_down', 'vent_hiss', 'water_hiss', 'click', 'tack', 'dab', 'electrode_change', 'page', 'coin', 'spark_test'];
    if (!Object.hasOwn(cues, name) && !Object.hasOwn(actionTime, name) && !supported.includes(name)) return;
    const voice = this._voice();
    const now = this.context.currentTime;
    voice.output.gain.value = clamp(number(opts?.volume, 1));
    if (Object.hasOwn(cues, name)) {
      for (const [frequency, offset, duration] of cues[name]) {
        this._tone(voice, now + offset, frequency, .14, name === 'alarm' ? 'triangle' : 'sine', duration);
      }
      return;
    }
    if (Object.hasOwn(actionTime, name) || name === 'spark_test') {
      const duration = name === 'spark_test' ? 1.2 : actionTime[name];
      voice.output.gain.setValueAtTime(0, now);
      voice.output.gain.linearRampToValueAtTime(clamp(number(opts?.volume, 1)), now + .08);
      voice.output.gain.setValueAtTime(clamp(number(opts?.volume, 1)), now + duration - .17);
      voice.output.gain.linearRampToValueAtTime(0, now + duration);
      this._action(voice, name === 'spark_test' ? 'grinder' : name, now, duration);
      return;
    }
    switch (name) {
      case 'hammer':
        this._impact(voice, now, 1, .95, 1.5);
        break;
      case 'slag_chip':
        this._impact(voice, now, 1.25, .69);
        for (const offset of [.04, .071, .122, .19]) {
          this._impact(voice, now + offset, 1.35 + Math.random() * .65, .20 - offset * .65, .65);
        }
        break;
      case 'magnet_click':
        this._impact(voice, now, .76, .92, .38);
        this._impact(voice, now + .007, 1.32, .33, .35);
        break;
      case 'magnet_none':
        this._air(voice, now, 'lowpass', 530, .38, .047);
        this._tone(voice, now, 160, .15, 'sine', .051, 91);
        break;
      case 'clamp':
      case 'electrode_change':
        for (const offset of [0, .055, .092]) this._impact(voice, now + offset, 1.32, .34, .39);
        this._impact(voice, now + .17, name === 'clamp' ? .68 : 1.1, .72, .62);
        break;
      case 'door':
        this._tone(voice, now, 340, .083, 'triangle', .52, 196);
        this._tone(voice, now + .025, 917, .044, 'sine', .48, 527);
        this._air(voice, now, 'bandpass', 440, .52, .51, .11, .12);
        this._impact(voice, now + .51, .51, 1.14, .79);
        break;
      case 'pump_down':
        this._motor(voice, now, 31, .23, 2.8, 61);
        this._air(voice, now, 'lowpass', 380, .66, 2.8, .32, .75);
        break;
      case 'vent_hiss':
        this._air(voice, now, 'bandpass', 3100, .68, 1.35, .05, .87);
        break;
      case 'water_hiss': {
        const steam = this._air(voice, now, 'highpass', 3300, .76, 1.45, .016, 1.08);
        this._modulate(voice, now, steam, 46, .055, .90);
        this._air(voice, now, 'bandpass', 1050, .43, .34, .009, .28);
        break;
      }
      case 'tack':
      case 'dab':
        this._air(voice, now, 'highpass', name === 'tack' ? 2600 : 4900,
          name === 'tack' ? .90 : .42, name === 'tack' ? .17 : .074, .001, .08);
        if (name === 'tack') this._tone(voice, now, 120, .15, 'sine', .12);
        break;
      case 'page':
        this._air(voice, now, 'bandpass', 1700, .35, .28, .042, .18);
        this._air(voice, now + .081, 'highpass', 3200, .23, .095, .02, .05);
        break;
      case 'coin':
        this._impact(voice, now, 2.1, .41, 1.55);
        this._impact(voice, now + .13, 2.0, .19, 1.1);
        break;
      case 'click':
        this._impact(voice, now, 1.1, .26, .23);
        break;
    }
  }
}
