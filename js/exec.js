// =====================================================================
//  Ejecución de la soldadura: control del jugador, física en vivo y HUD
// =====================================================================
import { PROCESSES, STANDOFF } from './data.js';
import { familyOf, paramHeat, speedWindow, rng } from './sim.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Execution {
  constructor({ world, audio, mission, pid, params, cons, prepDone, hud, canvas, onDone, attempt = 0 }) {
    Object.assign(this, { world, audio, mission, pid, params, cons, prepDone, hud, canvas, onDone, attempt });
    this.fam = familyOf(pid);
    this.auto = PROCESSES[pid].exec === 'auto' || this.fam === 'EBW';
    this.ctx = { cons };
    this.pHeat = paramHeat(mission, pid, params, this.ctx);
    this.sw = speedWindow(mission, pid, params);
    this.vMid = (this.sw[0] + this.sw[1]) / 2;
    this.ts = mission.timeScale || 1;
    this.L = mission.lengthMm;
    this.passes = mission.passes || 1;
    this.results = [];
    this.rand = rng(mission.id + attempt + Date.now());
    this.keys = {};
    this._bind();
  }

  // ------------------------------------------------------------------
  _bind() {
    this.onMove = e => {
      if (!this.running || this.paused) return;
      const sx = this.world.screenTangentSign || 1, sy = this.world.screenLateralSign || 1;
      if (!this.auto) {
        const ds = (e.movementX * sx) / this.pxPerMm;
        this.pendingDs += ds;
        this.lat += (-e.movementY * sy) * 0.012;
      } else this.lat += (-e.movementY * sy) * (this.fam === 'EBW' ? 0.004 : 0.01);
    };
    this.onDown = e => { if (e.button === 0 && this.running && !this.paused) this.mouseArc = true; };
    this.onUp = e => { if (e.button === 0) this.mouseArc = false; };
    this.onKey = e => {
      const down = e.type === 'keydown'; this.keys[e.code] = down;
      if (!this.running) return;
      if (down && e.code === 'KeyH') { this.helmet = !this.helmet; this.world.setHelmet(this.helmet); this.hudMsg(this.helmet ? 'Careta bajada' : '¡Careta levantada! No mires el arco'); }
      if (down && e.code === 'Space') { e.preventDefault(); if (this.fam === 'TIG' || this.fam === 'OAW') this.dabQueued = true; }
      if (down && e.code === 'KeyE' && this.fam === 'EBW') this.slopeOut();
      if (down && e.code === 'KeyR' && this.fam === 'SMAW' && this.electrodeLeft < 0.2) this.changeElectrode();
    };
    this.onWheel = e => { if (this.running && !this.auto) { this.so = clamp(this.so + Math.sign(e.deltaY) * 0.06, 0.2, 3); e.preventDefault(); } };
    this.onLock = () => { const locked = document.pointerLockElement === this.canvas; if (!locked && this.running && !this.paused) this.pause(); };
    document.addEventListener('mousemove', this.onMove); document.addEventListener('mousedown', this.onDown); document.addEventListener('mouseup', this.onUp);
    document.addEventListener('keydown', this.onKey); document.addEventListener('keyup', this.onKey);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    document.addEventListener('pointerlockchange', this.onLock);
  }
  dispose() {
    document.removeEventListener('mousemove', this.onMove); document.removeEventListener('mousedown', this.onDown); document.removeEventListener('mouseup', this.onUp);
    document.removeEventListener('keydown', this.onKey); document.removeEventListener('keyup', this.onKey);
    this.canvas.removeEventListener('wheel', this.onWheel); document.removeEventListener('pointerlockchange', this.onLock);
    this.world.onFrame = null; this.audio.arcStop?.();
    if (document.pointerLockElement) document.exitPointerLock();
  }

  // ------------------------------------------------------------------
  startPass(pass) {
    this.pass = pass; this.time = 0; this.drift = 0; this.s = 0; this.lat = 0; this.so = 1; this.samples = []; this.vEma = 0; this.pendingDs = 0;
    this.mouseArc = false; this.arc = false; this.dabQueued = false; this.dabFlash = 0; this.dabsWindow = []; this.dwell = 0; this.done = false;
    this.electrodeLeft = 1; this.slope = null; this.slopeAt = null; this.helmet = true; this.world.setHelmet(true);
    this.tremor = { x: 0, v: 0 }; this.drift = 0; this.driftPhase = this.rand() * 6;
    this.pxPerMm = 110 / (this.vMid * this.ts);
    if (this.fam === 'EBW' || this.fam === 'AUTO') {
      const demag = this.prepDone.has('desmagnetizar'); const aligned = this.prepDone.has('alinearHaz') || this.fam === 'AUTO';
      this.driftAmp = this.fam === 'EBW' ? (demag ? 0.12 : 0.9) : 0.35;
      this.lat = aligned ? 0 : (this.rand() > 0.5 ? 1 : -1) * 0.7;
      this.hasSlope = this.fam === 'EBW';
    }
    this.world.beginPass(pass, this.mission.material, { process: this.pid, overlap: this.mission.overlap });
    this.world.setCameraMode('weld');
    this.world.weldState({ s: 0, lateral: this.lat, standoff: 1, arc: false, process: this.pid });
    this.world.onFrame = dt => this.frame(dt);
    this.renderHudStatic();
    this.countdown();
  }

  countdown() {
    this.running = false; let n = 3;
    const tick = () => {
      this.hudBig(n > 0 ? String(n) : (this.auto ? '¡Haz activo!' : '¡Suelda!'));
      this.audio.play?.('countdown');
      if (n-- > 0) setTimeout(tick, 650); else { setTimeout(() => this.hudBig(''), 600); this.running = true; this.t0 = performance.now(); if (this.auto) this.arcStart(); }
    };
    tick();
  }

  pause() { this.paused = true; this.arc && this.arcStopNow(); this.hud.querySelector('.pause').classList.add('show'); }
  resume() { this.paused = false; this.hud.querySelector('.pause').classList.remove('show'); try { this.canvas.requestPointerLock?.()?.catch?.(() => {}); } catch {} }

  arcStart() { if (this.arc) return; this.arc = true; this.audio.arcStart?.(this.pid); this.arcStarts = (this.arcStarts || 0) + 1; }
  arcStopNow() { if (!this.arc) return; this.arc = false; this.audio.arcStop?.(); this.world.stopArc(); }

  slopeOut() {
    if (this.slope) return;
    const frac = this.s / this.L;
    if (frac < 1) { this.slope = 'early'; this.slopeAt = frac; this.hudMsg('Rampa de salida demasiado pronto'); }
    else { this.slope = 'ok'; this.hudMsg('Rampa de salida correcta ✔'); }
    this.arcStopNow(); this.finishPass();
  }

  changeElectrode() { this.arcStopNow(); this.audio.play?.('electrode_change'); this.electrodeLeft = 1; this.hudMsg('Electrodo nuevo. Reanuda sobre el cráter anterior.'); }

  // ------------------------------------------------------------------
  frame(dt) {
    if (!this.running || this.paused || this.done) { this.updateHud(dt, 0, 1); return; }
    const fam = this.fam; let ds = 0;
    if (this.auto) {
      if (this.arc) ds = this.vMid * this.ts * dt; // velocidad programada
      this.drift = Math.sin(this.time * 0.9 + this.driftPhase) * this.driftAmp * Math.min(1, this.s / 30) + Math.sin(this.time * 2.7) * this.driftAmp * 0.25;
      if (this.keys.KeyA) this.lat -= dt * (fam === 'EBW' ? 0.6 : 1.5); if (this.keys.KeyD) this.lat += dt * (fam === 'EBW' ? 0.6 : 1.5);
    } else {
      this.arc ? null : null;
      const want = this.mouseArc && this.electrodeLeft > 0.02;
      if (want && !this.arc) { this.arcStart(); this.audio.play?.('tack'); }
      if (!want && this.arc) this.arcStopNow();
      ds = Math.max(0, this.pendingDs); this.pendingDs = 0;
      // temblor de la mano (paseo aleatorio suavizado)
      this.tremor.v += (this.rand() - 0.5) * 3.2 * dt - this.tremor.x * 1.5 * dt; this.tremor.x += this.tremor.v * dt;
      this.lat += this.tremor.v * dt * 0.9;
      if (this.keys.KeyW) this.so = clamp(this.so - dt * 0.8, 0.2, 3); if (this.keys.KeyS) this.so = clamp(this.so + dt * 0.8, 0.2, 3);
      if (fam === 'SMAW' && this.arc) { // el electrodo se consume: el arco se alarga
        const burn = dt * this.ts / 45; this.electrodeLeft = Math.max(0, this.electrodeLeft - burn); this.so = clamp(this.so + burn * 9.5, 0.2, 3);
        if (this.electrodeLeft <= 0.02) { this.arcStopNow(); this.hudMsg('Electrodo agotado: pulsa R para cambiarlo'); }
      }
      if (fam === 'MIG') this.so = clamp(this.so + (this.rand() - 0.5) * dt * 0.3, 0.2, 3);
    }
    this.time = (this.time || 0) + dt;
    const latEff = this.lat + (this.auto ? this.drift : 0);
    this.s += ds;
    const vInst = ds / Math.max(1e-4, dt) / this.ts;
    this.vEma += (vInst - this.vEma) * Math.min(1, dt * 4);
    // varilla TIG
    let dab = false;
    if (this.dabQueued) { this.dabQueued = false; if (this.arc) { dab = true; this.dabFlash = 0.18; this.audio.play?.('dab'); this.dabsWindow.push(this.s); } }
    this.dabFlash = Math.max(0, this.dabFlash - dt);
    this.dabsWindow = this.dabsWindow.filter(x => this.s - x < 12);
    // aporte térmico en vivo
    const v = this.auto ? this.vMid : Math.max(0.05, this.vEma);
    let soEff = 1; if (fam === 'MIG') soEff = 1 - 0.3 * (this.so - 1); else if (!this.auto) soEff = 1 - 0.12 * (this.so - 1);
    const h = this.arc ? clamp(this.pHeat * (this.auto ? 1 : Math.pow(this.vMid / v, 0.85)) * soEff, 0, 3) : 0;
    let rScale = 1;
    if (fam === 'TIG' && this.mission.exec.dabEveryMm) { const ratio = (this.dabsWindow.length * this.mission.exec.dabEveryMm) / Math.max(4, Math.min(12, this.s)); rScale = clamp(0.25 + 0.75 * ratio, -0.4, 2.2); }
    if (this.auto || fam === 'MIG' || fam === 'SMAW') rScale = Math.pow(this.vMid / v, 0.5);
    const wScale = clamp(Math.sqrt(Math.max(0.3, h)) * (1 + 0.15 * (this.so - 1)), 0.4, 1.8);
    this.samples.push({ s: this.s, v, lat: latEff, so: this.so, arc: this.arc, dab, ds });
    const slag = PROCESSES[this.pid].family === 'SMAW' || this.pid === 'FCAW';
    this.world.weldState({ s: this.s, lateral: latEff, standoff: this.so, arc: this.arc, dab: dab || this.dabFlash > 0, process: this.pid, heat: clamp(h, 0.4, 1.6), slag, electrodeLeft: this.electrodeLeft, wScale, rScale: clamp(rScale, -0.4, 2.2) });
    this.audio.arcUpdate?.({ intensity: clamp(h / 1.3, 0, 1), standoff: this.so, speed: v / this.vMid });
    this.liveH = h;
    // final de la pasada
    if (this.auto) {
      const end = this.L * (1 + (this.mission.overlap || 0));
      if (!this.hasSlope && this.s >= this.L) { this.slope = 'ok'; this.arcStopNow(); this.finishPass(); }
      else if (this.s >= end + 2) { this.slope = 'none'; this.hudMsg('¡Corte brusco del haz sin rampa!'); this.arcStopNow(); this.finishPass(); }
    } else if (this.s >= this.L * 0.985) {
      if (this.arc && vInst < this.vMid * 0.4) this.dwell += dt;
      if (!this.arc || this.dwell > 0.7 || this.s >= this.L * 1.04) { this.endCrater = this.dwell < 0.35; this.arcStopNow(); this.finishPass(); }
    }
    this.updateHud(dt, h, v / this.vMid);
  }

  finishPass() {
    if (this.done) return; this.done = true;
    this.results.push({ samples: this.samples, slope: this.slope || (this.auto ? 'none' : null), slopeAt: this.slopeAt, endCrater: !!this.endCrater, arcStarts: this.arcStarts || 0 });
    this.world.stopArc();
    setTimeout(() => {
      if (this.pass + 1 < this.passes) this.betweenPasses();
      else { this.running = false; if (document.pointerLockElement) document.exitPointerLock(); this.world.hideTool(); this.onDone(this.results); }
    }, 900);
  }

  betweenPasses() {
    this.running = false; if (document.pointerLockElement) document.exitPointerLock();
    const names = ['raíz', 'relleno', 'presentación'];
    const slagOk = this.prepDone.has('escoria'); const ip = this.prepDone.has('interpass');
    const el = this.hud.querySelector('.between');
    const temp = 120 + 70 * (this.pass + 1) + Math.round(this.rand() * 30);
    el.innerHTML = `<h3>Pasada de ${names[this.pass]} terminada</h3>
      <p>${slagOk ? '✔ Escoria retirada y arranques amolados.' : '✘ No se limpió la escoria entre pasadas.'}</p>
      <p>${ip ? `🌡️ Temperatura entre pasadas: <b>${temp} °C</b> (máx. 250 °C) ✔` : '🌡️ Sin control de temperatura entre pasadas.'}</p>
      <button class="btn primary">Siguiente pasada: ${names[this.pass + 1]}</button>`;
    el.classList.add('show');
    if (slagOk) { this.audio.play?.('slag_chip'); this.world.chipSlag(); }
    el.querySelector('button').onclick = () => { el.classList.remove('show'); try { this.canvas.requestPointerLock?.()?.catch?.(() => {}); } catch {} this.startPass(this.pass + 1); };
  }

  // ------------------------------------------------------------------
  //  HUD
  // ------------------------------------------------------------------
  renderHudStatic() {
    const fam = this.fam; const so = STANDOFF[fam];
    const ctl = this.auto
      ? (fam === 'EBW' ? `<b>Ratón ↕ o A/D</b>: corrige la posición del haz sobre la junta · <b>E</b>: rampa de salida (en la zona de solape) · <b>H</b>: careta`
        : `<b>Ratón ↕ o A/D</b>: seguimiento de la junta · <b>H</b>: careta`)
      : `<b>Mantén clic izquierdo</b>: arco · <b>Mueve el ratón →</b> para avanzar · <b>↕</b> centrar en la junta · <b>W/S o rueda</b>: ${so.label.toLowerCase()}${fam === 'TIG' || fam === 'OAW' ? ' · <b>Espacio</b>: aportar varilla' : ''}${fam === 'SMAW' ? ' · <b>R</b>: cambiar electrodo' : ''} · <b>H</b>: careta · al final, <b>detente un instante</b> para rellenar el cráter`;
    this.hud.innerHTML = `
      <div class="hud-top"><div class="pass">${this.passes > 1 ? `Pasada ${this.pass + 1}/${this.passes}` : PROCESSES[this.pid].name}</div>
        <div class="progress"><div class="bar"></div>${this.mission.overlap ? `<div class="zone" style="left:${100 / (1 + this.mission.overlap)}%"></div>` : ''}</div></div>
      <div class="gauges">
        ${this.auto ? '' : `<div class="gauge" data-g="speed"><label>Velocidad de avance</label><div class="track"><div class="ideal"></div><div class="needle"></div></div><span class="val"></span></div>
        <div class="gauge" data-g="so"><label>${so.label}</label><div class="track"><div class="ideal"></div><div class="needle"></div></div><span class="val"></span></div>`}
        <div class="gauge" data-g="lat"><label>Posición sobre la junta</label><div class="track center"><div class="ideal"></div><div class="needle"></div></div><span class="val"></span></div>
        <div class="gauge" data-g="heat"><label>Aporte térmico</label><div class="track"><div class="ideal"></div><div class="needle"></div></div><span class="val"></span></div>
        ${fam === 'TIG' || fam === 'OAW' ? '<div class="gauge" data-g="fill"><label>Relleno (varilla)</label><div class="track"><div class="ideal"></div><div class="needle"></div></div><span class="val"></span></div>' : ''}
        ${fam === 'SMAW' ? '<div class="gauge" data-g="elec"><label>Electrodo restante</label><div class="track"><div class="fillbar"></div></div><span class="val"></span></div>' : ''}
        ${fam === 'EBW' ? '<canvas class="scope" width="220" height="120"></canvas><div class="ebwread"></div>' : ''}
      </div>
      <div class="controls">${ctl}</div>
      <div class="big"></div><div class="msg"></div>
      <div class="pause"><div><h2>Pausa</h2><p>Haz clic para continuar soldando</p></div></div>
      <div class="between"></div>`;
    this.hud.querySelector('.pause').onclick = () => this.resume();
    const setIdeal = (g, a, b, min, max) => { const el = this.hud.querySelector(`[data-g=${g}] .ideal`); if (el) { el.style.left = `${(a - min) / (max - min) * 100}%`; el.style.width = `${(b - a) / (max - min) * 100}%`; } };
    setIdeal('speed', this.sw[0] / this.vMid, this.sw[1] / this.vMid, 0, 2);
    setIdeal('so', 0.75, 1.3, 0, 3);
    const tol = this.mission.exec.lateralTol; this.latRange = Math.max(tol * 3, 1);
    setIdeal('lat', -tol, tol, -this.latRange, this.latRange);
    setIdeal('heat', 0.85, 1.2, 0, 2);
    setIdeal('fill', 0.7, 1.6, 0, 2.5);
  }

  setNeedle(g, v, min, max, text, bad) {
    const el = this.hud.querySelector(`[data-g=${g}]`); if (!el) return;
    const n = el.querySelector('.needle'); if (n) n.style.left = `${clamp((v - min) / (max - min), 0, 1) * 100}%`;
    el.querySelector('.val').textContent = text; el.classList.toggle('bad', !!bad);
  }

  updateHud(dt, h, vr) {
    if (!this.hud.firstChild) return;
    const bar = this.hud.querySelector('.progress .bar'); if (bar) bar.style.width = `${clamp(this.s / (this.L * (1 + (this.mission.overlap || 0))), 0, 1) * 100}%`;
    const tol = this.mission.exec.lateralTol; const lat = this.lat + (this.auto ? this.drift : 0);
    if (!this.auto) {
      this.setNeedle('speed', vr, 0, 2, `${(this.vEma || 0).toFixed(1)} mm/s`, this.arc && (vr < this.sw[0] / this.vMid * 0.9 || vr > this.sw[1] / this.vMid * 1.1));
      const soMm = (STANDOFF[this.fam].ideal * this.so).toFixed(1);
      this.setNeedle('so', this.so, 0, 3, `${soMm} mm`, this.so > 1.6 || this.so < 0.5);
    }
    this.setNeedle('lat', lat, -this.latRange, this.latRange, `${lat >= 0 ? '+' : ''}${lat.toFixed(2)} mm`, Math.abs(lat) > tol);
    this.setNeedle('heat', h, 0, 2, h ? `× ${h.toFixed(2)}` : '—', h && (h < 0.8 || h > 1.3));
    if (this.fam === 'TIG' || this.fam === 'OAW') { const ratio = (this.dabsWindow?.length || 0) * (this.mission.exec.dabEveryMm || 3) / Math.max(4, Math.min(12, this.s || 0)); this.setNeedle('fill', ratio, 0, 2.5, `${(ratio * 100).toFixed(0)} %`, this.arc && (ratio < 0.5 || ratio > 2.2)); }
    if (this.fam === 'SMAW') { const f = this.hud.querySelector('[data-g=elec] .fillbar'); if (f) f.style.width = `${this.electrodeLeft * 100}%`; this.hud.querySelector('[data-g=elec] .val').textContent = `${Math.round(this.electrodeLeft * 350)} mm`; }
    if (this.fam === 'EBW') this.drawScope(lat);
  }

  drawScope(lat) {
    const c = this.hud.querySelector('.scope'); if (!c) return; const g = c.getContext('2d'); const W = c.width, H = c.height;
    g.fillStyle = '#04110a'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(80,255,140,0.15)'; for (let x = 0; x < W; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    const scale = 40; // px por mm
    g.strokeStyle = '#d0d6dc'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    g.fillStyle = 'rgba(80,255,140,0.12)'; const tol = this.mission.exec.lateralTol; g.fillRect(0, H / 2 - tol * scale, W, tol * 2 * scale);
    const y = H / 2 - lat * scale; g.fillStyle = this.arc ? '#9fc4ff' : '#456'; g.shadowColor = '#9fc4ff'; g.shadowBlur = this.arc ? 12 : 0;
    g.beginPath(); g.arc(W * 0.6, clamp(y, 4, H - 4), 5, 0, 7); g.fill(); g.shadowBlur = 0;
    g.fillStyle = '#7dffa8'; g.font = '11px monospace'; g.fillText('CÁMARA DE SEGUIMIENTO DE JUNTA', 6, 12); g.fillText(`desvío ${lat.toFixed(2)} mm`, 6, H - 6);
    const r = this.hud.querySelector('.ebwread');
    if (r) r.innerHTML = `${this.params.kV} kV · ${this.params.mA} mA · ${(this.params.kV * this.params.mA / 1000).toFixed(1)} kW<br>Foco ${this.params.foc} mm · ${this.params.v} mm/s · Vacío ${this.params.vac} mbar`;
  }

  hudBig(t) { const b = this.hud.querySelector('.big'); if (b) b.textContent = t; }
  hudMsg(t) { const m = this.hud.querySelector('.msg'); if (!m) return; m.textContent = t; m.classList.add('show'); clearTimeout(this._mt); this._mt = setTimeout(() => m.classList.remove('show'), 2200); }
}
