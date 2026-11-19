// =====================================================================
//  "Corta el tubo": minijuego de vocabulario de soldadura en inglés
//  + explorador del glosario con tarjetas
// =====================================================================
import { TERMS, CATEGORIES } from './glossary.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rnd = (a, b) => a + Math.random() * (b - a);
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const KEY = 'soldador-vocab-v1';
const loadStats = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { best: 0, learned: {} }; } catch { return { best: 0, learned: {} }; } };
const saveStats = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sin almacenamiento */ } };

// Pronunciación en inglés
let enVoice = null;
function speakEn(text) {
  try {
    const ss = window.speechSynthesis; if (!ss) return;
    if (!enVoice) { const vs = ss.getVoices(); enVoice = vs.find(v => /en-US/i.test(v.lang) && /Google|Samantha|Aria|Jenny|Guy|Zira|David/i.test(v.name)) || vs.find(v => /^en/i.test(v.lang)) || null; }
    ss.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, '')); u.lang = 'en-US'; if (enVoice) u.voice = enVoice; u.rate = 0.92; ss.speak(u);
  } catch { /* sin voz */ }
}

export class VocabGame {
  constructor({ audio, onExit }) {
    this.audio = audio; this.onExit = onExit; this.stats = loadStats();
    this.mode = 'es2en'; this.cat = 'all';
    this.root = document.createElement('div'); this.root.id = 'vocab'; document.body.appendChild(this.root);
    this.A = (n, ...a) => { try { return this.audio?.[n]?.(...a); } catch { return null; } };
  }
  close() { cancelAnimationFrame(this.raf); this.unbind?.(); this.root.remove(); window.speechSynthesis?.cancel(); this.onExit?.(); }

  // ------------------------------------------------------------ menú
  menu() {
    cancelAnimationFrame(this.raf); this.unbind?.();
    const learned = Object.keys(this.stats.learned).length;
    this.root.innerHTML = `<div class="vmenu">
      <div class="vlogo">🔥 <span>CORTA EL TUBO</span></div>
      <h2>Inglés de soldadura</h2>
      <p>Los términos bajan dentro de tubos de acero. Mueve el soplete y <b>corta el tubo correcto</b> con clic (o con las teclas 1-4) antes de que llegue abajo. Si cortas el que no es, se quema y pierdes una vida.</p>
      <div class="vrow"><span class="vlab">Modo</span>
        <button class="btn small ${this.mode === 'es2en' ? 'primary' : ''}" data-mode="es2en">Español → Inglés</button>
        <button class="btn small ${this.mode === 'en2es' ? 'primary' : ''}" data-mode="en2es">Inglés → Español 🔊</button></div>
      <div class="vrow wrap"><span class="vlab">Tema</span>
        <button class="btn small ${this.cat === 'all' ? 'primary' : ''}" data-cat="all">Todos (${TERMS.length})</button>
        ${Object.entries(CATEGORIES).map(([k, v]) => `<button class="btn small ${this.cat === k ? 'primary' : ''}" data-cat="${k}">${v} (${TERMS.filter(t => t[2] === k).length})</button>`).join('')}</div>
      <div class="vrow big"><button class="btn primary" id="vplay">▶ Jugar</button><button class="btn" id="vexp">📖 Explorar glosario</button><button class="btn ghost" id="vback">← Volver al pueblo</button></div>
      <p class="vstat">Récord: <b>${this.stats.best}</b> · Términos dominados: <b>${learned}/${TERMS.length}</b></p></div>`;
    this.root.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { this.mode = b.dataset.mode; this.A('play', 'click'); this.menu(); });
    this.root.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { this.cat = b.dataset.cat; this.A('play', 'click'); this.menu(); });
    this.root.querySelector('#vplay').onclick = () => { this.A('play', 'ok'); this.play(); };
    this.root.querySelector('#vexp').onclick = () => { this.A('play', 'page'); this.explore(); };
    this.root.querySelector('#vback').onclick = () => this.close();
  }

  // ------------------------------------------------------------ glosario
  explore(q = '', cat = 'all') {
    cancelAnimationFrame(this.raf); this.unbind?.();
    const list = TERMS.map((t, i) => ({ t, i })).filter(({ t }) => (cat === 'all' || t[2] === cat) && (!q || (t[0] + ' ' + t[1] + ' ' + t[3]).toLowerCase().includes(q.toLowerCase())));
    this.root.innerHTML = `<div class="vexplore">
      <header><h2>📖 Glosario de soldadura</h2><input id="vq" placeholder="Buscar en inglés o español…" value="${esc(q)}"><button class="btn small" id="vmenu">← Menú</button></header>
      <div class="vchips"><button class="btn small ${cat === 'all' ? 'primary' : ''}" data-c="all">Todos</button>${Object.entries(CATEGORIES).map(([k, v]) => `<button class="btn small ${cat === k ? 'primary' : ''}" data-c="${k}">${v}</button>`).join('')}</div>
      <p class="vstat">Toca una tarjeta para voltearla · 🔊 para oír la pronunciación · ${list.length} términos</p>
      <div class="vgrid">${list.map(({ t, i }) => `<div class="vcard ${this.stats.learned[i] ? 'ok' : ''}" data-i="${i}"><div class="in">
        <div class="front"><span class="cat">${CATEGORIES[t[2]]}</span><b>${esc(t[0])}</b><button class="say" data-say="${i}">🔊</button></div>
        <div class="back"><b>${esc(t[1])}</b><p>${esc(t[3])}</p></div></div></div>`).join('')}</div></div>`;
    const qi = this.root.querySelector('#vq'); qi.oninput = () => { const v = qi.value; clearTimeout(this._qt); this._qt = setTimeout(() => { this.explore(v, cat); const n = this.root.querySelector('#vq'); n.focus(); n.setSelectionRange(v.length, v.length); }, 250); };
    this.root.querySelector('#vmenu').onclick = () => this.menu();
    this.root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => this.explore(q, b.dataset.c));
    this.root.querySelectorAll('.vcard').forEach(c => c.onclick = e => { if (e.target.dataset.say) return; c.classList.toggle('flip'); this.A('play', 'page'); });
    this.root.querySelectorAll('[data-say]').forEach(b => b.onclick = e => { e.stopPropagation(); speakEn(TERMS[+b.dataset.say][0]); });
  }

  // ------------------------------------------------------------ juego
  play() {
    this.root.innerHTML = `<canvas id="vcv"></canvas>
      <div class="vhud"><div class="vscore">0</div><div class="vlives"></div><div class="vlevel"></div><button class="btn small ghost" id="vquit">✕ Salir</button></div>
      <div class="vprompt"><div class="vq-label"></div><div class="vq-term"></div><div class="vq-def"></div></div>
      <div class="vfloat"></div>`;
    this.cv = this.root.querySelector('#vcv'); this.g = this.cv.getContext('2d'); window.__vocab = this;
    this.root.querySelector('#vquit').onclick = () => this.gameOver(true);
    const pool = this.cat === 'all' ? TERMS.map((t, i) => i) : TERMS.map((t, i) => i).filter(i => TERMS[i][2] === this.cat);
    Object.assign(this, { pool, deck: shuffle(pool), score: 0, lives: 3, level: 1, combo: 0, hits: 0, shots: 0, misses: [], tubes: [], parts: [], halves: [], pops: [], shake: 0, mx: innerWidth / 2, my: innerHeight * 0.45, fire: 0, t: 0, nextWave: 0.6, target: null, tx: null });
    this.resize(); this.bind(); this.renderHud();
    let last = performance.now();
    const loop = now => { const dt = Math.min(0.05, (now - last) / 1000); last = now; this.step(dt); this.draw(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  resize() { const d = Math.min(devicePixelRatio || 1, 2); this.W = innerWidth; this.H = innerHeight; this.cv.width = this.W * d; this.cv.height = this.H * d; this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px'; this.g.setTransform(d, 0, 0, d, 0, 0); this.lanes = this.W > 1150 ? 4 : 3; this.floor = this.H - 190; }

  bind() {
    const mv = e => { this.mx = e.clientX; this.my = e.clientY; };
    const md = e => { if (e.target.closest?.('button')) return; this.shoot(); };
    const kd = e => { const n = +e.key; if (n >= 1 && n <= this.lanes) { this.tx = this.laneX(n - 1); this.autoFire = true; } if (e.code === 'Space') { e.preventDefault(); this.shoot(); } if (e.code === 'Escape') this.gameOver(true); };
    const rs = () => this.resize();
    addEventListener('mousemove', mv); addEventListener('mousedown', md); addEventListener('keydown', kd); addEventListener('resize', rs);
    this.unbind = () => { removeEventListener('mousemove', mv); removeEventListener('mousedown', md); removeEventListener('keydown', kd); removeEventListener('resize', rs); this.unbind = null; };
  }

  laneX(i) { return this.W * (i + 0.5) / this.lanes; }
  label(i) { const t = TERMS[i]; return this.mode === 'es2en' ? t[0] : t[1]; }

  wave() {
    if (!this.deck.length) this.deck = shuffle(this.pool);
    const target = this.deck.pop(); this.target = target;
    const same = shuffle(this.pool.filter(i => i !== target && TERMS[i][2] === TERMS[target][2]));
    const other = shuffle(TERMS.map((t, i) => i).filter(i => i !== target && !same.includes(i)));
    const opts = shuffle([target, ...[...same, ...other].slice(0, this.lanes - 1)]);
    const speed = (38 + 7 * (this.level - 1)) * (this.H / 820);
    const g = this.g; g.font = '700 17px Inter, sans-serif';
    this.tubes = opts.map((id, lane) => {
      const text = this.label(id); const maxW = this.W / this.lanes - 36; let lines = [text];
      if (g.measureText(text).width > maxW - 40) { const words = text.split(' '); let best = 1, bd = 1e9; for (let k = 1; k < words.length; k++) { const a = words.slice(0, k).join(' '), b = words.slice(k).join(' '); const d = Math.abs(g.measureText(a).width - g.measureText(b).width); if (d < bd) { bd = d; best = k; } } lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')]; }
      const w = Math.min(maxW, Math.max(...lines.map(l => g.measureText(l).width)) + 56); const h = lines.length > 1 ? 66 : 46;
      return { id, lane, x: this.laneX(lane), y: -h - rnd(0, 140), w, h, lines, v: speed * rnd(0.9, 1.1), state: 'fall', heat: 0, wob: rnd(0, 6) };
    });
    const t = TERMS[target];
    this.root.querySelector('.vq-label').textContent = this.mode === 'es2en' ? 'Corta el tubo que dice en inglés:' : 'Corta el tubo con la traducción de:';
    this.root.querySelector('.vq-term').textContent = this.mode === 'es2en' ? t[1] : t[0];
    this.root.querySelector('.vq-def').textContent = t[3];
    if (this.mode === 'en2es') speakEn(t[0]);
    this.A('play', 'tick');
  }

  shoot() {
    if (this.fire > 0.05 || !this.tubes.length) return;
    this.fire = 0.28; this.shots++; this.A('play', 'tack');
    const tx = this.mx, ty = this.my + 62;
    const hit = this.tubes.find(t => t.state === 'fall' && Math.abs(tx - t.x) < t.w / 2 + 6 && Math.abs(ty - (t.y + t.h / 2)) < t.h / 2 + 14);
    for (let k = 0; k < 14; k++) this.parts.push({ x: tx, y: ty, vx: rnd(-120, 120), vy: rnd(-160, 40), life: rnd(0.2, 0.5), age: 0, c: [255, 190, 90] });
    if (!hit) return;
    if (hit.id === this.target) this.cut(hit); else this.burn(hit);
  }

  cut(t) {
    this.combo++; this.hits++;
    const mult = Math.min(5, 1 + Math.floor(this.combo / 3)); const bonus = Math.round(100 * mult + Math.max(0, (this.floor - t.y)) * 0.3 * this.level);
    this.score += bonus; this.stats.learned[t.id] = (this.stats.learned[t.id] || 0) + 1;
    t.state = 'cut';
    for (const side of [-1, 1]) this.halves.push({ x: t.x + side * t.w / 4, y: t.y + t.h / 2, w: t.w / 2, h: t.h, side, vx: side * rnd(60, 120), vy: rnd(-180, -100), rot: 0, vr: side * rnd(1.5, 3), life: 1.4, age: 0, text: t.lines, half: side });
    for (let k = 0; k < 70; k++) this.parts.push({ x: t.x, y: t.y + t.h / 2, vx: rnd(-260, 260), vy: rnd(-320, 60), life: rnd(0.3, 0.9), age: 0, c: [255, rnd(160, 230), rnd(60, 140)] });
    this.pops.push({ x: t.x, y: t.y, text: `+${bonus}${mult > 1 ? `  ×${mult}` : ''}`, age: 0, good: true });
    this.A('play', 'spark_test'); this.A('play', 'coin');
    const term = TERMS[t.id]; this.float(`✔ <b>${esc(term[0])}</b> = ${esc(term[1])}`, true);
    if (this.mode === 'es2en') speakEn(term[0]);
    this.tubes.forEach(o => { if (o !== t && o.state === 'fall') o.state = 'fade'; });
    if (this.hits % 8 === 0) { this.level++; this.pops.push({ x: this.W / 2, y: this.H * 0.35, text: `¡NIVEL ${this.level}!`, age: 0, big: true }); this.A('play', 'success'); }
    this.nextWave = 1.1; this.renderHud();
  }

  burn(t) {
    this.combo = 0; this.lives--; this.shake = 0.4; t.state = 'burn'; t.heat = 1;
    const term = TERMS[t.id]; this.misses.push(this.target);
    this.pops.push({ x: t.x, y: t.y, text: '✘', age: 0 });
    this.float(`✘ Ese tubo era <b>${esc(term[0])}</b> = ${esc(term[1])}`, false);
    this.A('play', 'error'); this.renderHud();
    if (this.lives <= 0) setTimeout(() => this.gameOver(), 900);
  }

  missed(t) {
    this.combo = 0; this.lives--; this.shake = 0.3; this.misses.push(this.target);
    const term = TERMS[this.target]; this.float(`⌛ Se te pasó: <b>${esc(term[0])}</b> = ${esc(term[1])}`, false);
    this.A('play', 'fail'); this.tubes.forEach(o => { o.state = 'fade'; }); this.nextWave = 1.4; this.renderHud();
    if (this.lives <= 0) setTimeout(() => this.gameOver(), 900);
  }

  float(html, good) { const f = this.root.querySelector('.vfloat'); if (!f) return; f.innerHTML = html; f.className = 'vfloat show ' + (good ? 'good' : 'bad'); clearTimeout(this._ft); this._ft = setTimeout(() => f.classList.remove('show'), 2600); }
  renderHud() {
    const q = s => this.root.querySelector(s); if (!q('.vscore')) return;
    q('.vscore').textContent = this.score.toLocaleString('es'); q('.vlives').textContent = '❤️'.repeat(Math.max(0, this.lives)) + '🖤'.repeat(Math.max(0, 3 - this.lives));
    q('.vlevel').textContent = `Nivel ${this.level}${this.combo >= 3 ? ` · 🔥 combo ${this.combo}` : ''}`;
  }

  step(dt) {
    this.t += dt; this.fire = Math.max(0, this.fire - dt); this.shake = Math.max(0, this.shake - dt);
    if (this.tx != null) { this.mx += (this.tx - this.mx) * Math.min(1, dt * 14); this.my += (this.floor * 0.55 - this.my) * Math.min(1, dt * 8); if (Math.abs(this.tx - this.mx) < 4) { this.tx = null; if (this.autoFire) { this.autoFire = false; const tgt = this.tubes.filter(t => t.state === 'fall' && Math.abs(t.x - this.mx) < 10).sort((a, b) => b.y - a.y)[0]; if (tgt) this.my = tgt.y + tgt.h / 2 - 62; this.shoot(); } } }
    if (this.lives > 0 && this.nextWave > 0) { this.nextWave -= dt; if (this.nextWave <= 0) this.wave(); }
    for (const t of this.tubes) {
      if (t.state === 'fall') { t.y += t.v * dt; if (t.y + t.h > this.floor) { if (t.id === this.target) { this.missed(t); break; } else t.state = 'fade'; } }
      else if (t.state === 'burn') { t.y += t.v * 3 * dt; t.heat = Math.max(0.3, t.heat - dt * 0.5); if (Math.random() < 0.5) this.parts.push({ x: t.x + rnd(-t.w / 2, t.w / 2), y: t.y + t.h / 2, vx: rnd(-40, 40), vy: rnd(-80, -20), life: 0.6, age: 0, c: [255, 120, 40] }); }
      else if (t.state === 'fade') { t.y += t.v * dt; t.alpha = (t.alpha ?? 1) - dt * 2.5; }
    }
    this.tubes = this.tubes.filter(t => !(t.state === 'cut' || (t.state === 'fade' && t.alpha <= 0) || t.y > this.H + 80));
    for (const h of this.halves) { h.age += dt; h.vy += 900 * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; }
    this.halves = this.halves.filter(h => h.age < h.life);
    for (const p of this.parts) { p.age += dt; p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.parts = this.parts.filter(p => p.age < p.life);
    for (const p of this.pops) p.age += dt; this.pops = this.pops.filter(p => p.age < 1.3);
  }

  // ------------------------------------------------------------ dibujo
  tube(g, x, y, w, h, heat = 0, alpha = 1, lines = null, clipSide = 0) {
    g.save(); g.globalAlpha = alpha;
    const r = h / 2;
    const grad = g.createLinearGradient(0, y, 0, y + h);
    const hot = c => `rgb(${Math.round(c[0] + (255 - c[0]) * heat)},${Math.round(c[1] * (1 - heat * 0.6) + 90 * heat)},${Math.round(c[2] * (1 - heat))})`;
    grad.addColorStop(0, hot([70, 76, 84])); grad.addColorStop(0.18, hot([205, 212, 220])); grad.addColorStop(0.42, hot([140, 148, 158])); grad.addColorStop(0.75, hot([62, 67, 74])); grad.addColorStop(1, hot([30, 33, 37]));
    g.fillStyle = grad; g.beginPath(); g.roundRect(x - w / 2, y, w, h, 6); g.fill();
    // extremos (bridas)
    for (const s of [-1, 1]) { if (clipSide === -s) continue; const ex = x + s * (w / 2 - 5); const eg = g.createLinearGradient(0, y - 3, 0, y + h + 3); eg.addColorStop(0, '#3a3e44'); eg.addColorStop(0.3, '#c7ccd2'); eg.addColorStop(1, '#2a2d31'); g.fillStyle = eg; g.fillRect(ex - 5, y - 3, 10, h + 6); }
    // brillo y suciedad
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x - w / 2 + 12, y + h * 0.16, w - 24, 2);
    if (heat > 0.05) { g.fillStyle = `rgba(255,${120 - heat * 60},20,${heat * 0.5})`; g.beginPath(); g.roundRect(x - w / 2, y, w, h, 6); g.fill(); }
    if (lines) { g.fillStyle = heat > 0.4 ? '#2a0a00' : '#101215'; g.font = '700 17px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, x, y + h / 2 + (i - (lines.length - 1) / 2) * 20)); }
    g.restore();
  }

  draw() {
    const g = this.g, W = this.W, H = this.H;
    g.save(); if (this.shake) g.translate(rnd(-6, 6) * this.shake * 2, rnd(-6, 6) * this.shake * 2);
    // fondo de taller
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#151719'); bg.addColorStop(1, '#0a0b0c'); g.fillStyle = bg; g.fillRect(-20, -20, W + 40, H + 40);
    g.strokeStyle = 'rgba(120,60,40,0.10)'; g.lineWidth = 2;
    for (let y = 0; y < H; y += 34) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (y / 34) % 2 ? 0 : 50; x < W; x += 100) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 34); g.stroke(); } }
    // conductos superiores
    for (let i = 0; i < this.lanes; i++) {
      const x = this.laneX(i); const cg = g.createLinearGradient(x - 60, 0, x + 60, 0); cg.addColorStop(0, '#2c3035'); cg.addColorStop(0.35, '#8a9098'); cg.addColorStop(0.6, '#4a4f56'); cg.addColorStop(1, '#1f2226');
      g.fillStyle = cg; g.fillRect(x - 60, -10, 120, 70); g.fillStyle = '#0c0d0e'; g.fillRect(x - 52, 52, 104, 10);
      g.fillStyle = 'rgba(255,170,60,0.85)'; g.font = '800 15px "Barlow Condensed", Inter'; g.textAlign = 'center'; g.fillText(String(i + 1), x, 36);
      g.strokeStyle = 'rgba(255,255,255,0.03)'; g.setLineDash([6, 10]); g.beginPath(); g.moveTo(x, 62); g.lineTo(x, this.floor); g.stroke(); g.setLineDash([]);
    }
    // piso / zona de chatarra
    const fg = g.createLinearGradient(0, this.floor, 0, this.floor + 20); fg.addColorStop(0, '#ff6a1a'); fg.addColorStop(1, 'rgba(255,106,26,0)'); g.fillStyle = fg; g.fillRect(0, this.floor, W, 20);
    g.fillStyle = 'rgba(255,106,26,0.9)'; g.fillRect(0, this.floor - 2, W, 2);
    // tubos
    for (const t of this.tubes) this.tube(g, t.x + Math.sin(this.t * 2 + t.wob) * 1.5, t.y, t.w, t.h, t.heat, t.alpha ?? 1, t.lines);
    for (const h of this.halves) { g.save(); g.translate(h.x, h.y); g.rotate(h.rot); g.globalAlpha = 1 - h.age / h.life; this.tube(g, 0, -h.h / 2, h.w, h.h, 0.6 * (1 - h.age), 1, null, h.half); const cx = h.half < 0 ? h.w / 2 : -h.w / 2; g.fillStyle = '#ffd27a'; g.shadowColor = '#ff8a1f'; g.shadowBlur = 18; g.fillRect(cx - 2, -h.h / 2, 4, h.h); g.restore(); }
    // chispas
    g.globalCompositeOperation = 'lighter';
    for (const p of this.parts) { const k = 1 - p.age / p.life; g.strokeStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${k})`; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025); g.stroke(); }
    g.globalCompositeOperation = 'source-over';
    // soplete
    this.drawTorch(g, this.mx, this.my);
    // textos flotantes
    for (const p of this.pops) { const k = p.age / 1.3; g.globalAlpha = 1 - k; g.fillStyle = p.big ? '#ffc35a' : p.good ? '#7dffa8' : '#ff6a5a'; g.font = `800 ${p.big ? 64 : 30}px "Barlow Condensed", Inter`; g.textAlign = 'center'; g.fillText(p.text, p.x, p.y - k * 60); g.globalAlpha = 1; }
    g.restore();
  }

  drawTorch(g, x, y) {
    g.save(); g.translate(x, y);
    // manguera
    g.strokeStyle = '#1b1b1b'; g.lineWidth = 8; g.beginPath(); g.moveTo(10, -30); g.bezierCurveTo(60, -80, 90, -40, 140, -140); g.stroke();
    g.strokeStyle = '#7a1a14'; g.lineWidth = 5; g.beginPath(); g.moveTo(4, -30); g.bezierCurveTo(50, -90, 70, -60, 120, -150); g.stroke();
    // cuerpo
    const bg = g.createLinearGradient(-8, 0, 8, 0); bg.addColorStop(0, '#6b5329'); bg.addColorStop(0.5, '#e2c27a'); bg.addColorStop(1, '#6b5329');
    g.fillStyle = bg; g.beginPath(); g.roundRect(-8, -60, 16, 70, 4); g.fill();
    g.fillStyle = '#3a3d41'; g.fillRect(-11, -20, 22, 10); g.fillStyle = '#b5281c'; g.beginPath(); g.arc(-14, -40, 5, 0, 7); g.fill(); g.fillStyle = '#1f6a2c'; g.beginPath(); g.arc(14, -40, 5, 0, 7); g.fill();
    const tg = g.createLinearGradient(-4, 0, 4, 0); tg.addColorStop(0, '#7a4a20'); tg.addColorStop(0.5, '#f0a060'); tg.addColorStop(1, '#7a4a20'); g.fillStyle = tg; g.beginPath(); g.moveTo(-6, 10); g.lineTo(6, 10); g.lineTo(3, 40); g.lineTo(-3, 40); g.fill();
    // llama
    const f = this.fire > 0 ? 1 : 0.35; const L = 18 + f * 28 + Math.random() * 4;
    g.globalCompositeOperation = 'lighter';
    let fl = g.createRadialGradient(0, 42, 1, 0, 42 + L * 0.5, L); fl.addColorStop(0, 'rgba(220,240,255,0.95)'); fl.addColorStop(0.35, 'rgba(90,150,255,0.8)'); fl.addColorStop(1, 'rgba(40,60,255,0)');
    g.fillStyle = fl; g.beginPath(); g.ellipse(0, 42 + L * 0.5, 6 + f * 4, L * 0.7, 0, 0, 7); g.fill();
    if (this.fire > 0) { g.fillStyle = 'rgba(255,200,120,0.5)'; g.beginPath(); g.arc(0, 62, 14 + Math.random() * 6, 0, 7); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    // mira
    g.strokeStyle = 'rgba(255,195,90,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 62, 10, 0, 7); g.stroke();
    g.restore();
  }

  gameOver(quit = false) {
    if (this.over) return; this.over = true;
    cancelAnimationFrame(this.raf); this.unbind?.(); window.speechSynthesis?.cancel();
    const newBest = this.score > this.stats.best; if (newBest) this.stats.best = this.score; saveStats(this.stats);
    this.A('play', quit ? 'page' : newBest ? 'success' : 'fail');
    const miss = [...new Set(this.misses)];
    const acc = this.shots ? Math.round(100 * this.hits / this.shots) : 0;
    this.root.innerHTML = `<div class="vmenu over">
      <h2>${quit ? 'Fin de la práctica' : '¡Se acabaron las vidas!'}</h2>
      <div class="vbig">${this.score.toLocaleString('es')}</div>
      <p class="vstat">${newBest ? '🏆 ¡Nuevo récord! · ' : `Récord: ${this.stats.best} · `}Nivel ${this.level} · ${this.hits} cortes correctos · precisión ${acc} %</p>
      ${miss.length ? `<h3>Repasa estos términos</h3><div class="vmiss">${miss.map(i => `<div class="vm"><button class="say" data-say="${i}">🔊</button><b>${esc(TERMS[i][0])}</b><span>${esc(TERMS[i][1])}</span><small>${esc(TERMS[i][3])}</small></div>`).join('')}</div>` : '<p>¡Sin errores!</p>'}
      <div class="vrow big"><button class="btn primary" id="vagain">↺ Otra vez</button><button class="btn" id="vexp">📖 Glosario</button><button class="btn ghost" id="vmenu">Menú</button></div></div>`;
    this.root.querySelectorAll('[data-say]').forEach(b => b.onclick = () => speakEn(TERMS[+b.dataset.say][0]));
    this.root.querySelector('#vagain').onclick = () => { this.over = false; this.play(); };
    this.root.querySelector('#vexp').onclick = () => { this.over = false; this.explore(); };
    this.root.querySelector('#vmenu').onclick = () => { this.over = false; this.menu(); };
  }
}
