// =====================================================================
//  Ejecución de la soldadura — controles simplificados + incidentes
//  · La antorcha sigue la junta sola.
//  · A/D (o ←/→, o la rueda): velocidad de avance.
//  · W/S: distancia / longitud de arco.   Espacio: varilla (TIG).
//  · F al final: rellenar el cráter.      EBW: ratón ↕ o A/D = seguir la junta, E = rampa.
// =====================================================================
import { PROCESSES, STANDOFF } from './data.js';
import { familyOf, paramHeat, speedWindow, rng } from './sim.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Execution {
  constructor(o) {
    Object.assign(this, o); // world, audio, voices, mission, pid, params, cons, prepDone, pos, hud, canvas, onDone, onFatal, runAction, attempt
    this.fam = familyOf(this.pid);
    this.auto = PROCESSES[this.pid].exec === 'auto' || this.fam === 'EBW';
    this.ctx = { cons: this.cons, prepDone: this.prepDone, params: this.params, pid: this.pid, fam: this.fam };
    this.pHeat = paramHeat(this.mission, this.pid, this.params, { cons: this.cons });
    this.sw = speedWindow(this.mission, this.pid, this.params, this.pos);
    this.vMid = (this.sw[0] + this.sw[1]) / 2;
    this.ts = this.mission.timeScale || 1;
    this.L = this.mission.lengthMm;
    this.passes = this.mission.passes || 1;
    this.diff = this.pos?.diff || 1;
    this.results = []; this.incidentLog = []; this.fired = new Set();
    this.rand = rng(this.mission.id + this.attempt + Date.now());
    this.keys = {};
    this._bind();
  }

  _bind() {
    this.onMove = e => { if (!this.running || this.paused || !this.auto) return; this.lat += (-e.movementY * (this.world.screenLateralSign || 1)) * (this.fam === 'EBW' ? 0.004 : 0.01); };
    this.onKey = e => {
      const down = e.type === 'keydown'; this.keys[e.code] = down;
      if (!down) return;
      if (['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'Escape' || e.code === 'KeyP') { if (this.running && !this.modal) this.paused ? this.resume() : this.pause(); return; }
      if (!this.running || this.paused || this.modal) return;
      if (e.code === 'KeyH') { this.helmet = !this.helmet; this.world.setHelmet(this.helmet); this.hudMsg(this.helmet ? 'Careta abajo' : '¡Careta arriba! No mires el arco'); }
      if (e.code === 'Space') { if (this.fam === 'TIG' || this.fam === 'OAW') this.dabQueued = true; }
      if (e.code === 'KeyE' && this.fam === 'EBW') this.slopeOut();
      if (e.code === 'KeyR' && this.fam === 'SMAW' && this.electrodeLeft < 0.25) this.changeElectrode();
    };
    this.onWheel = e => { if (this.running && !this.auto && !this.modal) { this.speedCmd = clamp(this.speedCmd - Math.sign(e.deltaY) * 0.06, 0.2, 2.2); e.preventDefault(); } };
    document.addEventListener('mousemove', this.onMove); document.addEventListener('keydown', this.onKey); document.addEventListener('keyup', this.onKey);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }
  dispose() {
    document.removeEventListener('mousemove', this.onMove); document.removeEventListener('keydown', this.onKey); document.removeEventListener('keyup', this.onKey);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.world.onFrame = null; this.audio?.arcStop?.();
  }

  // ------------------------------------------------------------------
  startPass(pass) {
    Object.assign(this, { pass, time: 0, s: 0, lat: 0, so: 1, samples: [], vEma: 0, speedCmd: 1, fatigue: 0, arc: false, dabQueued: false, dabFlash: 0, dabsWindow: [], craterHold: 0, endWait: 0, done: false, electrodeLeft: 1, slope: null, slopeAt: null, helmet: true, blow: 0, blowOn: false, wet: 0, wander: 0, wanderV: 0, drift: 0, driftPhase: this.rand() * 6, stuck: 0, endCrater: false });
    this.world.setHelmet(true);
    if (this.fam === 'SMAW' && this.cons?.electrodo === 'E7018' && !this.prepDone.has('horno') && !this.incidentLog.some(l => l.fixPrep === 'horno' && l.ok)) this.wet = 0.6;
    if (this.fam === 'EBW' || this.fam === 'AUTO') {
      const demag = this.prepDone.has('desmagnetizar'); const aligned = this.prepDone.has('alinearHaz') || this.fam === 'AUTO';
      this.driftAmp = this.fam === 'EBW' ? (demag ? 0.1 : 0.9) : 0.3;
      this.lat = aligned ? 0 : (this.rand() > 0.5 ? 1 : -1) * 0.7;
      this.hasSlope = this.fam === 'EBW';
    }
    this.world.beginPass(pass, this.mission.material, { process: this.pid, overlap: this.mission.overlap });
    this.world.setCameraMode('weld');
    this.world.weldState({ s: 0, arc: false });
    this.world.onFrame = dt => this.frame(dt);
    this.renderHud();
    this.countdown();
  }

  countdown() {
    this.running = false; let n = 3;
    const tick = () => {
      this.hudBig(n > 0 ? String(n) : '');
      if (n > 0) this.audio?.play?.('countdown');
      if (n-- > 0) setTimeout(tick, 600); else { this.running = true; this.checkIncidents(true); if (!this.modal) this.arcStart(); }
    };
    tick();
  }

  pause() { this.paused = true; this.arcStopNow(); this.hud.querySelector('.pause').classList.add('show'); }
  resume() { this.paused = false; this.hud.querySelector('.pause').classList.remove('show'); if (!this.done) this.arcStart(); }

  arcStart() { if (this.arc || this.done) return; this.arc = true; this.audio?.arcStart?.(this.pid); this.audio?.play?.('tack'); }
  arcStopNow() { if (!this.arc) return; this.arc = false; this.audio?.arcStop?.(); this.world.stopArc(); }

  slopeOut() {
    if (this.slope) return;
    const frac = this.s / this.L;
    if (frac < 1) { this.slope = 'early'; this.slopeAt = frac; this.hudMsg('Rampa de salida demasiado pronto'); }
    else { this.slope = 'ok'; this.hudMsg('Rampa de salida correcta ✔'); }
    this.arcStopNow(); this.finishPass();
  }
  changeElectrode() { this.arcStopNow(); this.audio?.play?.('electrode_change'); this.electrodeLeft = 1; this.so = 1; this.hudMsg('Electrodo nuevo'); setTimeout(() => this.arcStart(), 500); }

  // ------------------------------------------------------------------
  //  Incidentes
  // ------------------------------------------------------------------
  checkIncidents(atStart = false) {
    if (this.modal) return;
    for (const inc of this.mission.incidents || []) {
      if (this.fired.has(inc.id)) continue;
      if ((inc.pass ?? 0) !== this.pass) continue;
      let ok = false; try { ok = !!inc.when?.(this.ctx); } catch { ok = false; }
      if (!ok) continue;
      if (this.s / this.L < inc.at && !(atStart && inc.at <= 0.02)) continue;
      this.fired.add(inc.id); this.trigger(inc); return;
    }
  }

  trigger(inc) {
    this.modal = inc;
    if (inc.fx === 'arcblow') { this.blowOn = true; this.audio?.play?.('warning'); }
    if (inc.fx === 'wet') this.wet = 1;
    if (inc.fx === 'lel') this.audio?.play?.('alarm');
    if (inc.fx === 'stick') { this.arcStopNow(); this.audio?.play?.('error'); }
    if (inc.fx === 'tungsten') this.audio?.play?.('warning');
    const at = this.s / this.L;
    const show = () => {
      this.arcStopNow();
      const el = this.hud.querySelector('.incident');
      el.innerHTML = `<div class="card"><div class="tag">⚠ Incidente</div><h3>${esc(inc.title)}</h3><p>${esc(inc.text)}</p>
        <div class="opts">${inc.options.map((o, i) => `<button class="btn opt-btn" data-i="${i}">${esc(o.t)}</button>`).join('')}</div><div class="why"></div></div>`;
      el.classList.add('show');
      this.voices?.say?.(inc.title + '. ' + inc.text, 'maestro');
      el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
        const o = inc.options[+b.dataset.i];
        el.querySelectorAll('.opt-btn').forEach(x => x.disabled = true); b.classList.add(o.ok ? 'right' : 'wrong');
        el.querySelector('.why').innerHTML = `<p class="${o.ok ? 'good' : 'bad'}">${o.ok ? '✔' : '✘'} ${esc(o.why)}</p><button class="btn primary cont">Continuar</button>`;
        this.voices?.say?.(o.why, 'maestro');
        this.audio?.play?.(o.ok ? 'ok' : 'error');
        this.incidentLog.push({ id: inc.id, title: inc.title, ok: !!o.ok, partial: !!o.partial, why: o.why, at, fixPrep: o.fixPrep, defect: inc.defect });
        if (o.fatal) { el.querySelector('.cont').onclick = () => { el.classList.remove('show'); this.running = false; this.dispose(); this.onFatal?.(inc, o); }; return; }
        el.querySelector('.cont').onclick = async () => {
          el.classList.remove('show');
          if (o.anim && this.runAction) { this.world.setCameraMode('orbit', { reset: false }); this.hud.classList.add('dim'); await this.runAction(o.anim, { readout: o.anim === 'oven' ? '🔥 350 °C → 120 °C' : null, temps: [350, 120], gauss: [38, 3] }); this.hud.classList.remove('dim'); this.world.setCameraMode('weld'); }
          if (o.ok) { if (inc.fx === 'arcblow') this.blowOn = o.partial ? 'half' : false; if (inc.fx === 'wet') this.wet = 0; }
          if (inc.fx === 'stick') this.so = 1;
          this.modal = null; if (!this.done) this.arcStart();
        };
      });
    };
    if (inc.fx === 'arcblow' || inc.fx === 'wet') { this.hudMsg('⚠ ' + inc.title); setTimeout(show, 1500); } else show();
  }

  // ------------------------------------------------------------------
  frame(dt) {
    if (!this.running || this.paused || this.done) { this.updateHud(0, 1); return; }
    const showing = this.modal && this.hud.querySelector('.incident.show');
    if (showing) { this.updateHud(0, 1); return; }
    const fam = this.fam; this.time += dt;
    let ds = 0;
    if (this.auto) {
      if (this.arc) ds = this.vMid * this.ts * dt;
      this.drift = Math.sin(this.time * 0.9 + this.driftPhase) * this.driftAmp * Math.min(1, this.s / 30) + Math.sin(this.time * 2.7) * this.driftAmp * 0.25;
      if (this.keys.KeyA || this.keys.ArrowLeft) this.lat -= dt * (fam === 'EBW' ? 0.6 : 1.5);
      if (this.keys.KeyD || this.keys.ArrowRight) this.lat += dt * (fam === 'EBW' ? 0.6 : 1.5);
    } else {
      const acc = 0.9 * dt;
      if (this.keys.KeyD || this.keys.ArrowRight) this.speedCmd = clamp(this.speedCmd + acc, 0.2, 2.2);
      if (this.keys.KeyA || this.keys.ArrowLeft) this.speedCmd = clamp(this.speedCmd - acc, 0.2, 2.2);
      this.fatigue += ((this.rand() - 0.5) * 0.6 * this.diff - this.fatigue * 0.25) * dt;
      if (this.keys.KeyW || this.keys.ArrowUp) this.so = clamp(this.so - dt * 0.9, 0.2, 3);
      if (this.keys.KeyS || this.keys.ArrowDown) this.so = clamp(this.so + dt * 0.9, 0.2, 3);
      this.so = clamp(this.so + (this.rand() - 0.5) * dt * 0.35 * this.diff, 0.2, 3);
      if (fam === 'SMAW' && this.arc) { const burn = dt * this.ts / 40; this.electrodeLeft = Math.max(0, this.electrodeLeft - burn); this.so = clamp(this.so + burn * 8, 0.2, 3); if (this.electrodeLeft <= 0.02) { this.arcStopNow(); this.hudMsg('Electrodo gastado: pulsa R'); } }
      if (this.arc && this.s < this.L) ds = this.vMid * this.ts * dt * this.speedCmd * (1 + this.fatigue);
      this.wanderV += ((this.rand() - 0.5) * 2.4 - this.wander * 2) * dt; this.wander += this.wanderV * dt * 0.5;
    }
    const blowTarget = this.blowOn === true ? 1 : this.blowOn === 'half' ? 0.35 : 0; this.blow += (blowTarget - this.blow) * Math.min(1, dt * 2);
    const latEff = (this.auto ? this.lat + this.drift : this.wander * 0.25 * this.mission.exec.lateralTol * this.diff) + this.blow * this.mission.exec.lateralTol * 1.35;
    if (this.so < 0.35 && fam === 'SMAW' && this.arc) { this.stuck += dt; if (this.stuck > 0.4) { this.stuck = 0; this.arcStopNow(); this.audio?.play?.('error'); this.hudMsg('¡Se pegó el electrodo! Aléjalo con S'); this.so = 0.6; setTimeout(() => this.arcStart(), 700); } }
    this.s += ds;
    const vInst = ds / Math.max(1e-4, dt) / this.ts;
    if (this.arc) this.vEma += (vInst - this.vEma) * Math.min(1, dt * 4);
    let dab = false;
    if (this.dabQueued) { this.dabQueued = false; if (this.arc) { dab = true; this.dabFlash = 0.18; this.audio?.play?.('dab'); this.dabsWindow.push(this.s); } }
    this.dabFlash = Math.max(0, this.dabFlash - dt); this.dabsWindow = this.dabsWindow.filter(x => this.s - x < 12);
    const v = this.auto ? this.vMid : Math.max(0.05, this.vEma || this.vMid);
    let soEff = 1; if (fam === 'MIG') soEff = 1 - 0.3 * (this.so - 1); else if (!this.auto) soEff = 1 - 0.12 * (this.so - 1);
    const h = this.arc ? clamp(this.pHeat * (this.auto ? 1 : Math.pow(this.vMid / v, 0.85)) * soEff, 0, 3) : 0;
    let rScale;
    if ((fam === 'TIG' || fam === 'OAW') && this.mission.exec.dabEveryMm) { const ratio = (this.dabsWindow.length * this.mission.exec.dabEveryMm) / Math.max(4, Math.min(12, this.s)); rScale = clamp(0.25 + 0.75 * ratio, -0.4, 2.2); }
    else rScale = Math.pow(this.vMid / v, 0.5);
    this.wScale = clamp(Math.sqrt(Math.max(0.3, h)) * (1 + 0.15 * (this.so - 1)), 0.4, 1.8); this.rScale = clamp(rScale, -0.4, 2.2); this.h = h; this.latEff = latEff; this.dab = dab;
    if (this.arc) this.samples.push({ s: this.s, v, lat: latEff, so: this.so, arc: true, dab, ds });
    this.world.weldState(this.ws(this.arc));
    this.audio?.arcUpdate?.({ intensity: clamp(h / 1.3, 0, 1), standoff: this.so, speed: v / this.vMid, blow: this.blow, wet: this.wet });
    this.checkIncidents();
    if (this.auto) {
      const end = this.L * (1 + (this.mission.overlap || 0));
      if (!this.hasSlope && this.s >= this.L) { this.slope = 'ok'; this.arcStopNow(); this.finishPass(); }
      else if (this.s >= end + 2) { this.slope = 'none'; this.hudMsg('¡Corte brusco del haz sin rampa!'); this.arcStopNow(); this.finishPass(); }
    } else if (this.s >= this.L * 0.97) {
      this.hud.querySelector('.crater')?.classList.add('show');
      if (this.keys.KeyF && this.arc) { this.craterHold += dt; this.samples.push({ s: Math.min(this.s, this.L - 0.1), v: this.vMid * 0.3, lat: latEff, so: this.so, arc: true, dab: false, ds: 0.05 }); }
      if (this.s >= this.L) this.endWait += dt;
      if (this.craterHold > 0.45 || this.endWait > 1.8) { this.endCrater = this.craterHold < 0.45; this.arcStopNow(); this.finishPass(); }
    }
    this.updateHud(h, v / this.vMid);
  }

  ws(arc) {
    return { s: this.s, lateral: this.latEff || 0, standoff: this.so, arc, dab: this.dab || this.dabFlash > 0, heat: clamp(this.h || 1, 0.4, 1.6), slag: this.fam === 'SMAW' || this.pid === 'FCAW', electrodeLeft: this.electrodeLeft, wScale: this.wScale || 1, rScale: this.rScale ?? 1, blow: this.blow, wet: this.wet };
  }

  finishPass() {
    if (this.done) return; this.done = true;
    this.hud.querySelector('.crater')?.classList.remove('show');
    this.results.push({ samples: this.samples, slope: this.slope || (this.auto ? 'none' : null), slopeAt: this.slopeAt, endCrater: !!this.endCrater });
    this.world.stopArc(); this.world.hideTool();
    setTimeout(async () => {
      this.hud.classList.add('dim');
      await this.world.showcase(2.2);
      this.hud.classList.remove('dim');
      if (this.pass + 1 < this.passes) this.betweenPasses();
      else { this.running = false; this.onDone(this.results, this.incidentLog); }
    }, 500);
  }

  async betweenPasses() {
    this.running = false;
    const names = this.passNames();
    const slag = this.fam === 'SMAW' || this.pid === 'FCAW';
    const clean = this.prepDone.has('escoria') || slag;
    if (slag) { this.hud.classList.add('dim'); await this.runAction?.('hammer', { after: () => this.world.chipSlag() }); this.hud.classList.remove('dim'); }
    const ip = this.prepDone.has('interpass');
    const el = this.hud.querySelector('.between');
    el.innerHTML = `<div class="card"><h3>Pasada de ${names[this.pass].toLowerCase()} terminada</h3>
      <p>${clean ? '✔ Escoria picada y cordón cepillado.' : 'Cordón cepillado.'}</p>
      <p>${ip ? `🌡️ Temperatura entre pasadas: <b>${170 + 25 * this.pass} °C</b> (máx. 250 °C) ✔` : '🌡️ No tienes control de temperatura entre pasadas.'}</p>
      <button class="btn primary">Siguiente pasada: ${names[this.pass + 1].toLowerCase()}</button></div>`;
    el.classList.add('show');
    el.querySelector('button').onclick = () => { el.classList.remove('show'); this.startPass(this.pass + 1); };
  }
  passNames() { return this.mission.id === 'gasoducto' ? ['Raíz', 'Caliente y relleno'] : this.mission.id === 'glp' ? ['Raíz', 'Relleno y presentación'] : ['Raíz', 'Relleno', 'Presentación']; }

  // ------------------------------------------------------------------
  //  HUD
  // ------------------------------------------------------------------
  renderHud() {
    const fam = this.fam; const so = STANDOFF[fam]; const tig = fam === 'TIG' || fam === 'OAW';
    const ctl = this.auto
      ? (fam === 'EBW' ? `<span class="kbd">↕ ratón</span> o <span class="kbd">A</span><span class="kbd">D</span> corrige el haz sobre la junta · <span class="kbd">E</span> rampa de salida en la zona rayada · <span class="kbd">P</span> pausa` : `<span class="kbd">A</span><span class="kbd">D</span> seguir la junta · <span class="kbd">P</span> pausa`)
      : `<span class="kbd">A</span><span class="kbd">D</span> / rueda: velocidad · <span class="kbd">W</span><span class="kbd">S</span>: ${so.label.toLowerCase()}${tig ? ' · <span class="kbd">Espacio</span>: varilla' : ''}${fam === 'SMAW' ? ' · <span class="kbd">R</span>: electrodo nuevo' : ''} · <span class="kbd">F</span>: rellenar cráter al final · <span class="kbd">H</span> careta · <span class="kbd">P</span> pausa`;
    const names = this.passNames();
    this.hud.innerHTML = `
      <div class="hud-top"><div class="pass">${this.passes > 1 ? `Pasada ${this.pass + 1}/${this.passes}: ${names[this.pass]}` : PROCESSES[this.pid].name}${this.pos ? ` · ${this.pos.id}` : ''}</div>
        <div class="progress"><div class="bar"></div>${this.mission.overlap ? `<div class="zone" style="left:${100 / (1 + this.mission.overlap)}%"></div>` : ''}</div></div>
      <div class="gauges">
        ${this.auto ? '' : `<div class="gauge" data-g="speed"><label>Velocidad de avance</label><div class="track"><div class="ideal"></div><div class="needle"></div></div><span class="val"></span></div>
        <div class="gauge" data-g="so"><label>${so.label}</label><div class="track"><div class="ideal"></div><div class="needle"></div></div><span class="val"></span></div>`}
        ${this.auto ? '<div class="gauge" data-g="lat"><label>Posición sobre la junta</label><div class="track"><div class="ideal"></div><div class="needle"></div></div><span class="val"></span></div>' : ''}
        <div class="gauge" data-g="heat"><label>Aporte térmico</label><div class="track"><div class="ideal"></div><div class="needle"></div></div><span class="val"></span></div>
        ${tig ? '<div class="gauge" data-g="fill"><label>Relleno (varilla)</label><div class="track"><div class="ideal"></div><div class="needle"></div></div><span class="val"></span></div>' : ''}
        ${fam === 'SMAW' ? '<div class="gauge" data-g="elec"><label>Electrodo restante</label><div class="track"><div class="fillbar"></div></div><span class="val"></span></div>' : ''}
        ${fam === 'EBW' ? '<canvas class="scope" width="220" height="120"></canvas><div class="ebwread"></div>' : ''}
        <div class="tip"></div>
      </div>
      <div class="controls">${ctl}</div>
      <div class="big"></div><div class="msg"></div>
      <div class="crater">Llegaste al final: <b>mantén F</b> para rellenar el cráter</div>
      <div class="pause"><div><h2>Pausa</h2><p>Pulsa <b>P</b> o haz clic para seguir</p></div></div>
      <div class="incident"></div><div class="between"></div>`;
    this.hud.querySelector('.pause').onclick = () => this.resume();
    const setIdeal = (g, a, b, min, max) => { const el = this.hud.querySelector(`[data-g=${g}] .ideal`); if (el) { el.style.left = `${(a - min) / (max - min) * 100}%`; el.style.width = `${(b - a) / (max - min) * 100}%`; } };
    setIdeal('speed', this.sw[0] / this.vMid, this.sw[1] / this.vMid, 0, 2);
    setIdeal('so', 0.75, 1.3, 0, 3);
    const tol = this.mission.exec.lateralTol; this.latRange = Math.max(tol * 3, 1);
    setIdeal('lat', -tol, tol, -this.latRange, this.latRange);
    setIdeal('heat', 0.85, 1.2, 0, 2); setIdeal('fill', 0.7, 1.6, 0, 2.5);
  }

  setNeedle(g, v, min, max, text, bad) {
    const el = this.hud.querySelector(`[data-g=${g}]`); if (!el) return;
    const n = el.querySelector('.needle'); if (n) n.style.left = `${clamp((v - min) / (max - min), 0, 1) * 100}%`;
    el.querySelector('.val').textContent = text; el.classList.toggle('bad', !!bad);
  }

  updateHud(h, vr) {
    if (!this.hud.firstChild) return;
    const bar = this.hud.querySelector('.progress .bar'); if (bar) bar.style.width = `${clamp(this.s / (this.L * (1 + (this.mission.overlap || 0))), 0, 1) * 100}%`;
    let tip = '';
    if (!this.auto) {
      const lo = this.sw[0] / this.vMid, hi = this.sw[1] / this.vMid;
      this.setNeedle('speed', vr, 0, 2, `${(this.vEma || 0).toFixed(1)} mm/s`, this.arc && (vr < lo * 0.9 || vr > hi * 1.1));
      this.setNeedle('so', this.so, 0, 3, `${(STANDOFF[this.fam].ideal * this.so).toFixed(1)} mm`, this.so > 1.6 || this.so < 0.5);
      if (this.arc && this.s > 2) { if (vr < lo * 0.9) tip = 'Vas muy lento: acelera con D'; else if (vr > hi * 1.1) tip = 'Vas muy rápido: frena con A'; else if (this.so > 1.5) tip = this.fam === 'SMAW' ? 'Arco largo: baja el electrodo con W' : 'Muy lejos: acércate con W'; else if (this.so < 0.55) tip = 'Muy cerca: aléjate con S'; }
    }
    const tol = this.mission.exec.lateralTol; const lat = this.latEff ?? 0;
    this.setNeedle('lat', lat, -this.latRange, this.latRange, `${lat >= 0 ? '+' : ''}${lat.toFixed(2)} mm`, Math.abs(lat) > tol);
    this.setNeedle('heat', h, 0, 2, h ? `× ${h.toFixed(2)}` : '—', h && (h < 0.8 || h > 1.3));
    if (this.fam === 'TIG' || this.fam === 'OAW') { const ratio = (this.dabsWindow?.length || 0) * (this.mission.exec.dabEveryMm || 3) / Math.max(4, Math.min(12, this.s || 0)); this.setNeedle('fill', ratio, 0, 2.5, `${(ratio * 100).toFixed(0)} %`, this.arc && (ratio < 0.5 || ratio > 2.2)); if (this.arc && !tip && ratio < 0.5 && this.s > 6) tip = 'Falta material: toca Espacio para meter varilla'; }
    if (this.fam === 'SMAW') { const f = this.hud.querySelector('[data-g=elec] .fillbar'); if (f) f.style.width = `${this.electrodeLeft * 100}%`; const vv = this.hud.querySelector('[data-g=elec] .val'); if (vv) vv.textContent = `${Math.round(this.electrodeLeft * 350)} mm`; }
    if (this.blow > 0.3) tip = '⚠ El arco se desvía (soplo magnético)';
    if (this.wet > 0.3 && this.arc) tip = tip || '⚠ El electrodo escupe: ¿estará húmedo?';
    const t = this.hud.querySelector('.tip'); if (t) t.textContent = tip;
    if (this.fam === 'EBW') this.drawScope(lat);
  }

  drawScope(lat) {
    const c = this.hud.querySelector('.scope'); if (!c) return; const g = c.getContext('2d'); const W = c.width, H = c.height;
    g.fillStyle = '#04110a'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(80,255,140,0.15)'; for (let x = 0; x < W; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    const scale = 40; g.strokeStyle = '#d0d6dc'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    g.fillStyle = 'rgba(80,255,140,0.12)'; const tol = this.mission.exec.lateralTol; g.fillRect(0, H / 2 - tol * scale, W, tol * 2 * scale);
    const y = H / 2 - lat * scale; g.fillStyle = this.arc ? '#9fc4ff' : '#456'; g.shadowColor = '#9fc4ff'; g.shadowBlur = this.arc ? 12 : 0;
    g.beginPath(); g.arc(W * 0.6, clamp(y, 4, H - 4), 5, 0, 7); g.fill(); g.shadowBlur = 0;
    g.fillStyle = '#7dffa8'; g.font = '11px monospace'; g.fillText('CÁMARA DE SEGUIMIENTO DE JUNTA', 6, 12); g.fillText(`desvío ${lat.toFixed(2)} mm`, 6, H - 6);
    const r = this.hud.querySelector('.ebwread');
    if (r) r.innerHTML = `${this.params.kV} kV · ${this.params.mA} mA · ${(this.params.kV * this.params.mA / 1000).toFixed(1)} kW<br>Foco ${this.params.foc} mm · ${this.params.v} mm/s · Vacío ${this.params.vac} mbar`;
  }

  hudBig(t) { const b = this.hud.querySelector('.big'); if (b) b.textContent = t; }
  hudMsg(t) { const m = this.hud.querySelector('.msg'); if (!m) return; m.textContent = t; m.classList.add('show'); clearTimeout(this._mt); this._mt = setTimeout(() => m.classList.remove('show'), 2400); }
}
