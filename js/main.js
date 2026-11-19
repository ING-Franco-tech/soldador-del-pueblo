// =====================================================================
//  Soldador del Pueblo — flujo del juego e interfaz
//  Hecho por J. Gabriel Franco e Ing. J. Fernando Sarmiento
// =====================================================================
import { World } from './world.js';
import { WeldAudio } from './audio.js';
import { Voices } from './voice.js';
import { runAction } from './actions.js';
import { INSPECTION_METHODS, detect, renderInspection } from './inspection.js';
import { MATERIALS, MATERIAL_TESTS, PROCESSES, MISSIONS, STAGES, DEFECT_NAMES, STANDOFF, CREDITS } from './data.js';
import * as S from './sim.js';
import { Execution } from './exec.js';

const $ = (s, el = document) => el.querySelector(s);
const ui = $('#ui'), hud = $('#hud'), canvas = $('#gl');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const world = new World(canvas);
const audio = new WeldAudio();
const voices = new Voices();
const A = (fn, ...a) => { try { return audio[fn]?.(...a); } catch (e) { console.warn(e); } };
const say = (text, who) => { try { return voices.say?.(text, who); } catch { return null; } };
const act = (kind, opts = {}) => runAction(world, audio, kind, { material: st?.mission?.material, ...opts });

// ------------------------------------------------------------ guardado
const SAVE_KEY = 'soldador-del-pueblo-v2';
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || null; } catch { return null; } }
let save = loadSave() || { unlocked: 1, stars: {}, best: {}, coins: 0, voices: true };
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* sin almacenamiento */ } }
voices.setEnabled?.(save.voices !== false);

function toast(t, ms = 2600) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), ms); }

// barra superior fija: voces y sonido
const topbar = document.createElement('div'); topbar.className = 'topbar';
topbar.innerHTML = `<button class="btn small ghost" id="tvoz"></button><button class="btn small ghost" id="tsnd"></button>`;
document.body.appendChild(topbar);
const paintTop = () => { $('#tvoz').textContent = save.voices !== false ? '🗣️ Voces: sí' : '🗣️ Voces: no'; $('#tsnd').textContent = audio._mutedFlag ? '🔇 Sonido' : '🔊 Sonido'; };
$('#tvoz').onclick = () => { save.voices = save.voices === false; voices.setEnabled?.(save.voices); if (!save.voices) voices.stop?.(); persist(); paintTop(); };
$('#tsnd').onclick = () => { audio._mutedFlag = !audio._mutedFlag; A('setMuted', audio._mutedFlag); paintTop(); };
paintTop();

// ============================================================ PORTADA
function showTitle() {
  setScene(MISSIONS[0]);
  world.controls.autoRotate = true; world.controls.autoRotateSpeed = 0.5;
  ui.innerHTML = `<div class="title">
    <h1>Soldador<span>del Pueblo</span></h1>
    <p>Siete casos reales de taller: identifica el metal, resuelve el análisis técnico, escoge proceso, consumibles, bisel y posición, prepara la junta, ajusta la máquina, suelda resolviendo los problemas que aparezcan y demuestra con ensayos que tu trabajo es seguro.</p>
    <div class="row"><button class="btn primary" id="play">${save.unlocked > 1 ? 'Continuar' : 'Empezar'}</button>
    ${save.unlocked > 1 ? '<button class="btn ghost" id="reset">Nueva partida</button>' : ''}</div>
    <small>Recomendado: auriculares y pantalla completa (F11)</small>
    <div class="credits">${esc(CREDITS)}</div></div>`;
  $('#play').onclick = async () => { await audio.resume?.(); A('play', 'ok'); showMap(); };
  const r = $('#reset'); if (r) r.onclick = () => { if (confirm('¿Borrar el progreso y empezar de nuevo?')) { save = { unlocked: 1, stars: {}, best: {}, coins: 0, voices: save.voices }; persist(); showTitle(); } };
}

let sceneKey = null;
function setScene(m, design = {}) {
  world.setEnvironment(m.env);
  const key = m.id + JSON.stringify([design.pos?.id, design.bevel?.id]);
  if (sceneKey !== key) { world.loadPiece(m, design); sceneKey = key; }
  world.setCameraMode('orbit');
  A('startAmbient', m.ambient);
}

// ============================================================ MAPA
function showMap() {
  hud.classList.remove('on'); voices.stop?.(); world.clearLabels();
  const shown = MISSIONS[Math.min(save.unlocked, MISSIONS.length) - 1];
  setScene(shown); world.controls.autoRotate = true;
  ui.innerHTML = `<div class="map"><header><h2>El pueblo · Encargos</h2><div class="wallet">🪙 ${save.coins.toLocaleString('es')} monedas</div></header>
    <div class="cards">${MISSIONS.map(m => {
      const locked = m.n > save.unlocked; const stv = save.stars[m.id] || 0;
      return `<div class="card ${locked ? 'locked' : ''}" data-id="${m.id}">
        <div class="num">Caso ${m.n}</div><h3>${esc(m.title)}</h3><div class="place">📍 ${esc(m.place)}</div>
        <div><span class="tag">${MATERIALS[m.material].short} · ${m.thicknessMm} mm</span></div>
        <div class="who"><span class="av">${m.client.avatar}</span><div><b>${esc(m.client.name)}</b><br><span class="place">${esc(m.client.role)}</span></div></div>
        <div class="stars">${'★'.repeat(stv)}${'☆'.repeat(3 - stv)}</div></div>`;
    }).join('')}</div><div class="credits">${esc(CREDITS)}</div></div>`;
  ui.querySelectorAll('.card').forEach(c => {
    c.onmouseenter = () => { const m = MISSIONS.find(x => x.id === c.dataset.id); if (m.n <= save.unlocked) { setScene(m); world.controls.autoRotate = true; } };
    c.onclick = () => { const m = MISSIONS.find(x => x.id === c.dataset.id); if (m.n > save.unlocked) { A('play', 'error'); toast('Completa el caso anterior para desbloquearlo'); return; } A('play', 'click'); startMission(m); };
  });
}

// ============================================================ MISIÓN
let st = null;
const STEP_IDS = ['intro', 'diag', 'calc', 'proc', 'cons', 'design', 'prep', 'param', 'exec', 'insp', 'report'];
const STEP_NAMES = { intro: 'Encargo', diag: 'Diagnóstico', calc: 'Análisis', proc: 'Proceso', cons: 'Consumibles', design: 'Junta y posición', prep: 'Preparación', param: 'Máquina', exec: 'Soldar', insp: 'Inspección', report: 'Informe' };

function startMission(m) {
  sceneKey = null; setScene(m); world.controls.autoRotate = false; world.clearLabels();
  st = { mission: m, step: 'intro', tests: new Set(), testRes: {}, material: null, pid: null, cons: {}, prepDone: new Set(), minutes: 0, params: {}, execs: [], attempts: 0, rejections: [], methods: [], detected: new Map(), dialogIdx: 0, answers: [], qIdx: 0, design: {}, incidentLog: [] };
  render();
}

function go(step) { st.step = step; A('play', 'page'); voices.stop?.(); render(); }

function speaker(who) { const m = st.mission; return who === 'mentor' ? { av: '👴', name: 'Maestro Tomás', role: 'Su mentor, 40 años soldando', voice: 'maestro', mentor: true } : { av: m.client.avatar, name: m.client.name, role: m.client.role, voice: m.client.voice }; }

function frame(inner, { title, sub, foot = '', dialog = null }) {
  const idx = STEP_IDS.indexOf(st.step);
  ui.innerHTML = `<div class="mission">
    <div class="stepper"><button class="btn small ghost back">← Pueblo</button>
      ${STEP_IDS.map((s, i) => `<span class="st ${i < idx ? 'done' : ''} ${i === idx ? 'cur' : ''}">${i + 1}. ${STEP_NAMES[s]}</span>`).join('')}
      <span class="mtitle">${esc(st.mission.title)}</span></div>
    ${dialog ? `<div class="dialog ${dialog.mentor ? 'mentor' : ''}"><div class="av">${dialog.av}</div><div><div class="name">${esc(dialog.name)}</div><div class="role">${esc(dialog.role)}</div><div class="txt">${dialog.html}</div></div></div>` : ''}
    <div class="side"><div class="head"><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><div class="body">${inner}</div><div class="foot">${foot}</div></div>
    <div class="hint3d">🖱️ Arrastra para girar la pieza · rueda para acercar</div></div>`;
  $('.back', ui).onclick = () => { if (confirm('¿Abandonar este caso?')) showMap(); };
}

const mentorDialog = () => ({ av: '👴', name: 'Maestro Tomás', role: 'Su mentor', html: esc(st.mission.mentor), mentor: true });
const fichaHtml = m => `<table class="ficha">${(m.ficha || []).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`;
let busy = false;
async function busyRun(fn) { if (busy) return; busy = true; ui.classList.add('busy'); try { await fn(); } finally { busy = false; ui.classList.remove('busy'); } }

function render() {
  const m = st.mission;
  switch (st.step) {
    // ---------------------------------------------------------------- encargo
    case 'intro': {
      const line = m.intro[Math.min(st.dialogIdx, m.intro.length - 1)]; const sp = speaker(line.who);
      frame(`<div class="group-label">Ficha técnica</div>${fichaHtml(m)}
        <div class="group-label">Criterio de aceptación</div><div class="acc">${esc(m.acceptance)}</div>
        <div class="group-label">Cómo se evalúa</div><p class="note">${STAGES.map(s => `${s.name} ${s.weight} %`).join(' · ')}</p>`,
        { title: 'Nuevo caso', sub: `${esc(m.client.name)} · ${esc(m.client.role)}`, foot: `<button class="btn ghost" id="more">${st.dialogIdx < m.intro.length - 1 ? 'Siguiente ›' : '↺ Repetir'}</button><button class="btn primary" id="ok">Aceptar el trabajo</button>`,
          dialog: { ...sp, html: esc(line.text) } });
      say(line.text, sp.voice);
      $('#more').onclick = () => { st.dialogIdx = st.dialogIdx < m.intro.length - 1 ? st.dialogIdx + 1 : 0; A('play', 'page'); render(); };
      $('#ok').onclick = () => go('diag');
      break;
    }
    // ---------------------------------------------------------------- diagnóstico
    case 'diag': {
      const mat = MATERIALS[m.material];
      frame(`<div class="group-label">Pruebas (se hacen sobre la pieza)</div>
        ${MATERIAL_TESTS.map(t => `<button class="opt ${st.tests.has(t.id) ? 'done' : ''}" data-test="${t.id}"><b>${t.icon} ${t.name}</b></button>${st.tests.has(t.id) ? `<div class="testres">${esc(mat.tests[t.id])}</div>` : ''}`).join('')}
        <div class="group-label">¿Qué material es?</div>
        ${Object.values(MATERIALS).map(x => `<button class="opt ${st.material === x.id ? 'sel' : ''}" data-mat="${x.id}"><b>${esc(x.name)}</b></button>`).join('')}`,
        { title: 'Diagnóstico', sub: 'Antes de escoger nada, identifique el metal. Mire cada prueba en la pieza.', foot: `<span class="timecost">Pruebas: ${st.tests.size}/5</span><button class="btn primary" id="ok" ${st.material ? '' : 'disabled'}>Confirmar material</button>` });
      ui.querySelectorAll('[data-test]').forEach(b => b.onclick = () => busyRun(async () => {
        const id = b.dataset.test; if (st.tests.has(id)) return;
        if (id === 'iman') await act('magnet', { ferro: mat.ferromagnetic });
        else if (id === 'chispa') await act('spark', { spark: mat.spark });
        else if (id === 'peso') { A('play', 'clamp'); await world.focusJoint(0.5); world.label(`⚖️ ≈ ${String(mat.density).replace('.', ',')} g/cm³`, world.jointFrame(0.5).p.clone().add(new world.camera.position.constructor(0, 0.05, 0)), 3000, 'good'); }
        else if (id === 'aspecto') await act('look');
        else if (id === 'documento') { A('play', 'page'); showDoc(m, mat); }
        st.tests.add(id); render();
      }));
      ui.querySelectorAll('[data-mat]').forEach(b => b.onclick = () => { st.material = b.dataset.mat; A('play', 'click'); render(); });
      $('#ok').onclick = () => go('calc');
      break;
    }
    // ---------------------------------------------------------------- análisis técnico (tipo parcial)
    case 'calc': {
      const qs = m.questions || []; const i = Math.min(st.qIdx, qs.length - 1); const q = qs[i]; const ans = st.answers[i];
      frame(`<div class="group-label">Pregunta ${i + 1} de ${qs.length}</div><p class="qtext">${esc(q.q)}</p>
        ${q.options.map((o, k) => `<button class="opt ${ans === k ? (k === q.answer ? 'right' : 'wrong') : ''} ${ans != null && k === q.answer ? 'right' : ''}" data-a="${k}" ${ans != null ? 'disabled' : ''}><b>${String.fromCharCode(65 + k)}. ${esc(o)}</b></button>`).join('')}
        ${ans != null ? `<div class="explain ${ans === q.answer ? 'good' : 'bad'}">${ans === q.answer ? '✔ Correcto.' : '✘ No.'} ${esc(q.explain)}</div>` : ''}
        <div class="group-label">Datos del caso</div>${fichaHtml(m)}`,
        { title: 'Análisis técnico', sub: 'Como en el parcial: antes de soldar, el ingeniero hace las cuentas.', foot: `<span class="timecost">${st.answers.filter((a, k) => a === qs[k].answer).length} correctas</span><button class="btn primary" id="ok" ${ans == null ? 'disabled' : ''}>${i < qs.length - 1 ? 'Siguiente pregunta' : 'Continuar'}</button>` });
      ui.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { st.answers[i] = +b.dataset.a; const good = st.answers[i] === q.answer; A('play', good ? 'ok' : 'error'); say((good ? 'Correcto. ' : 'No. ') + q.explain, 'maestro'); render(); });
      $('#ok').onclick = () => { if (i < qs.length - 1) { st.qIdx++; render(); } else go('proc'); };
      break;
    }
    // ---------------------------------------------------------------- proceso
    case 'proc': {
      frame(Object.values(PROCESSES).map(p => `<button class="opt ${st.pid === p.id ? 'sel' : ''}" data-p="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.desc)}</span></button>`).join(''),
        { title: 'Proceso de soldadura', sub: `${esc(MATERIALS[st.material].name)} · ${m.thicknessMm} mm · unión ${m.joint}. Piense en el espesor, el sitio y lo que exige el cliente.`,
          foot: `<button class="btn ghost" id="tip">💡 Consejo</button><button class="btn primary" id="ok" ${st.pid ? '' : 'disabled'}>Escoger proceso</button>`, dialog: st.tip ? mentorDialog() : null });
      ui.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { st.pid = b.dataset.p; A('play', 'click'); render(); });
      $('#tip').onclick = () => { st.tip = !st.tip; if (st.tip) say(m.mentor, 'maestro'); render(); };
      $('#ok').onclick = () => { st.cons = {}; st.params = S.defaultParams(st.pid); world.setTool(st.pid, m.material); go('cons'); };
      break;
    }
    // ---------------------------------------------------------------- consumibles
    case 'cons': {
      const groups = S.consumableGroups(m, st.pid);
      frame(groups.map(g => `<div class="group-label">${esc(g.label)}</div>${g.options.map(o => `<button class="opt ${st.cons[g.id] === o.id ? 'sel' : ''}" data-g="${g.id}" data-o="${o.id}"><b>${esc(o.name)}</b></button>`).join('')}`).join(''),
        { title: 'Consumibles', sub: `${esc(PROCESSES[st.pid].name)} sobre ${esc(MATERIALS[st.material].name)}.`, foot: `<span></span><button class="btn primary" id="ok" ${groups.every(g => st.cons[g.id]) ? '' : 'disabled'}>Confirmar</button>`, dialog: st.tip ? mentorDialog() : null });
      ui.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { st.cons[b.dataset.g] = b.dataset.o; A('play', 'click'); render(); });
      $('#ok').onclick = () => go('design');
      break;
    }
    // ---------------------------------------------------------------- junta y posición
    case 'design': {
      const d = m.design || {};
      frame(`<p class="note">${esc(d.note || '')}</p>
        ${d.bevels ? `<div class="group-label">Preparación de bordes</div>${d.bevels.map(b => `<button class="opt ${st.design.bevel?.id === b.id ? 'sel' : ''}" data-bev="${b.id}"><b>${esc(b.name)}</b></button>`).join('')}` : ''}
        <div class="group-label">Posición de soldadura (¿se puede girar?)</div>
        ${(d.positions || []).map(p => `<button class="opt ${st.design.pos?.id === p.id ? 'sel' : ''}" data-pos="${p.id}"><b>${esc(p.name)}</b></button>`).join('')}
        <p class="note">La pieza en 3D cambia con tu elección: gírala con el ratón para verla.</p>`,
        { title: 'Junta y posición', sub: 'Bisel, separación, talón… y cómo se va a colocar la pieza.', foot: `<span></span><button class="btn primary" id="ok" ${st.design.pos && (!d.bevels || st.design.bevel) ? '' : 'disabled'}>Confirmar diseño</button>`, dialog: st.tip ? mentorDialog() : null });
      const apply = () => { sceneKey = null; setScene(m, st.design); world.setTool(st.pid, m.material); if ([...st.prepDone].length) world.setCleaned(true, m.material); };
      ui.querySelectorAll('[data-bev]').forEach(b => b.onclick = () => { st.design.bevel = d.bevels.find(x => x.id === b.dataset.bev); A('play', 'click'); apply(); render(); });
      ui.querySelectorAll('[data-pos]').forEach(b => b.onclick = () => { st.design.pos = d.positions.find(x => x.id === b.dataset.pos); A('play', 'clamp'); apply(); render(); });
      $('#ok').onclick = () => go('prep');
      break;
    }
    // ---------------------------------------------------------------- preparación
    case 'prep': {
      frame(`<p class="note">Cada acción se hace en la pieza. Ojo: algunas cosas que parecen útiles la dañan, y el orden importa.</p>
        ${m.prep.map(it => `<button class="opt ${st.prepDone.has(it.id) ? 'done' : ''}" data-prep="${it.id}"><b>${st.prepDone.has(it.id) ? '✔ ' : ''}${esc(it.label)}</b>${it.detail ? `<span>${esc(it.detail)}</span>` : ''}<span class="timecost">⏱ ${it.minutes || 1} min</span></button>`).join('')}`,
        { title: 'Preparación', sub: 'La mitad de una buena soldadura se hace antes de prender el arco.', foot: `<span class="timecost">Tiempo: ${st.minutes} min</span><button class="btn primary" id="ok">Preparación lista</button>`, dialog: st.tip ? mentorDialog() : null });
      ui.querySelectorAll('[data-prep]').forEach(b => b.onclick = () => busyRun(async () => {
        const it = m.prep.find(x => x.id === b.dataset.prep); if (st.prepDone.has(it.id)) return;
        // reglas de orden en el tanque de GLP
        if (m.id === 'glp') {
          if (it.id === 'lel' && !(st.prepDone.has('ventear') && st.prepDone.has('inertizar'))) { await act('detector', { alarm: true }); toast('📟 LEL 38 %: todavía hay vapores. Primero ventear, lavar e inertizar.', 4000); say('Todavía hay vapores de propano. Primero ventee, lave e inertice.', 'maestro'); return; }
          if (it.id === 'permiso' && !st.prepDone.has('lel')) { A('play', 'error'); toast('Sin medición de LEL no se firma el permiso de trabajo en caliente.', 3500); return; }
          if (it.id === 'ranurar' && !st.prepDone.has('permiso')) { A('play', 'error'); toast('El arco-aire es trabajo en caliente: primero el permiso firmado.', 3500); say('El arco aire también es trabajo en caliente. Primero el permiso.', 'maestro'); return; }
        }
        const opts = { readout: it.readout, after: it.cleans ? () => world.setCleaned(true, m.material) : null };
        if (it.anim === 'oven') opts.temps = it.id === 'hornoCel' ? [120, 0] : st.mission.id === 'glp' ? [120, 0] : [350, 120];
        if (it.anim === 'detector') opts.alarm = false;
        if (it.anim === 'demag') opts.gauss = m.id === 'avion' ? [2.1, 0.3] : [38, 4];
        if (it.anim === 'purge') { opts.gas = 'O₂'; opts.target = m.id === 'glp' ? 30000 : 35; }
        if (it.anim === 'clamp' && m.id === 'gasoducto') opts.after = () => world.showClamp(true);
        if (it.id === 'ranurar' && world.piece?.groove) opts.after = () => { world.piece.groove.visible = true; world.piece.crackLine.visible = false; };
        await act(it.anim || 'gauge', opts);
        st.prepDone.add(it.id); st.minutes += it.minutes || 1; render();
      }));
      $('#ok').onclick = () => go('param');
      break;
    }
    // ---------------------------------------------------------------- parámetros (en la máquina)
    case 'param': {
      const defs = S.paramDefsFor(st.pid); const fam = S.familyOf(st.pid);
      const info = () => {
        const p = st.params;
        if (fam === 'EBW') return `Potencia del haz: <b>${(p.kV * p.mA / 1000).toFixed(2)} kW</b> · Energía lineal: <b>${(p.kV * p.mA / p.v / 1000).toFixed(2)} kJ/mm</b>`;
        if (fam === 'TIG') return `Potencia aprox.: <b>${((10 + 0.04 * p.I) * p.I / 1000).toFixed(2)} kW</b> (V ≈ ${(10 + 0.04 * p.I).toFixed(1)} V)`;
        if (fam === 'SMAW') return `Potencia aprox.: <b>${((20 + 0.04 * p.I) * p.I / 1000).toFixed(2)} kW</b> · Polaridad: <b>${esc(p.pol)}</b>`;
        if (fam === 'MIG') return `Corriente estimada: <b>${Math.round(30 + 18 * p.wfs)} A</b> · Potencia ≈ <b>${(p.V * (30 + 18 * p.wfs) / 1000).toFixed(2)} kW</b>`;
        return '';
      };
      const toMachine = () => {
        const p = st.params; const knobs = defs.map(d => d.options ? d.options.indexOf(p[d.id]) / Math.max(1, d.options.length - 1) : (p[d.id] - d.min) / (d.max - d.min));
        const big = fam === 'EBW' ? `${p.kV}kV ${p.mA}mA` : fam === 'MIG' ? `${p.V}V` : p.I != null ? `${p.I} A` : '';
        world.setMachine({ big, lines: defs.filter(d => !(fam !== 'EBW' && d.id === 'I') && !(fam === 'MIG' && d.id === 'V')).map(d => `${d.label.slice(0, 14)}: ${p[d.id]} ${d.unit}`), knobs });
      };
      frame(defs.map(d => d.options
        ? `<div class="param"><div class="lab"><span>${d.label}</span></div><div class="seg">${d.options.map(o => `<button class="btn small ${st.params[d.id] === o ? 'primary' : ''}" data-opt="${d.id}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`
        : `<div class="param"><div class="lab"><span>${d.label}</span><b><span data-v="${d.id}">${st.params[d.id]}</span> ${d.unit}</b></div><input type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${st.params[d.id]}" data-pp="${d.id}"></div>`).join('')
        + `<div class="acc" id="pinfo">${info()}</div><p class="note">${fam === 'EBW' || fam === 'AUTO' ? 'En procesos mecanizados la velocidad es un parámetro de la máquina.' : 'La velocidad de avance la manejas tú al soldar.'} Mira el display y las perillas de la máquina.</p>`,
        { title: 'Ajustar la máquina', sub: `${esc(PROCESSES[st.pid].name)} · ${m.thicknessMm} mm de ${esc(MATERIALS[st.material].short)}`, foot: `<span></span><button class="btn primary" id="ok">Fijar parámetros</button>`, dialog: st.tip ? mentorDialog() : null });
      if (!st.machineFocused) { world.focusMachine(); st.machineFocused = true; }
      toMachine();
      ui.querySelectorAll('[data-pp]').forEach(inp => inp.oninput = () => {
        const d = defs.find(x => x.id === inp.dataset.pp); st.params[d.id] = +inp.value;
        const v = $(`[data-v="${d.id}"]`, ui); if (v) v.textContent = st.params[d.id]; $('#pinfo', ui).innerHTML = info(); toMachine();
        if (!inp._t || performance.now() - inp._t > 90) { A('play', 'click'); inp._t = performance.now(); }
      });
      ui.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { st.params[b.dataset.opt] = b.dataset.v; A('play', 'clamp'); render(); });
      $('#ok').onclick = () => { A('play', 'ok'); st.machineFocused = false; world.setCameraMode('orbit'); go('exec'); };
      break;
    }
    // ---------------------------------------------------------------- ejecución
    case 'exec': {
      const fam = S.familyOf(st.pid); const auto = PROCESSES[st.pid].exec === 'auto' || fam === 'EBW';
      const sw = S.speedWindow(m, st.pid, st.params, st.design.pos);
      const howto = auto
        ? `<p>La máquina avanza sola a ${st.params.v ?? '—'} mm/s. Tú vigilas la <b>cámara de seguimiento</b> y corriges el haz con el <b>ratón ↕</b> o <span class="kbd">A</span>/<span class="kbd">D</span>.</p>
           ${fam === 'EBW' ? `<p>Al cerrar la vuelta empieza la <b>zona de solape</b> (rayada). Pulsa <span class="kbd">E</span> ahí para la <b>rampa de salida</b>.</p>` : ''}`
        : `<p>La antorcha sigue la junta sola. Tú controlas:</p>
           <ul class="keys"><li><span class="kbd">A</span><span class="kbd">D</span> o la rueda: <b>velocidad de avance</b> (objetivo ${sw[0].toFixed(1)}–${sw[1].toFixed(1)} mm/s)</li>
           <li><span class="kbd">W</span><span class="kbd">S</span>: <b>${(STANDOFF[fam]?.label || 'distancia').toLowerCase()}</b>${fam === 'SMAW' ? ' (el electrodo se gasta: hay que irlo bajando)' : ''}</li>
           ${fam === 'TIG' || fam === 'OAW' ? '<li><span class="kbd">Espacio</span>: meter varilla al charco a ritmo constante</li>' : ''}
           <li><span class="kbd">F</span> al final: rellenar el cráter</li></ul>
           <p>Pueden aparecer <b>problemas</b> (soplo de arco, electrodo húmedo, tungsteno contaminado…). Cuando pasen, el juego se detiene y decides qué hacer.</p>`;
      frame(`${howto}<p class="note">Posición: <b>${esc(st.design.pos?.name || '—')}</b>${st.design.bevel ? ` · Bisel: ${esc(st.design.bevel.name)}` : ''}</p>
        ${st.attempts ? `<div class="acc">Reparación nº ${st.attempts}: la soldadura anterior se pulió por completo.</div>` : ''}`,
        { title: 'A soldar', sub: `${esc(PROCESSES[st.pid].name)}${m.passes > 1 ? ` · ${m.passes} pasadas` : ''}`, foot: `<span></span><button class="btn primary" id="ok">${auto ? 'Activar la máquina' : 'Bajar la careta y soldar'}</button>` });
      $('#ok').onclick = () => runExecution();
      break;
    }
    case 'insp': renderInspectionStage(); break;
    case 'report': renderReport(); break;
  }
}

function showDoc(m, mat) {
  const d = document.createElement('div'); d.className = 'docsheet';
  d.innerHTML = `<div class="paper"><div class="stamp">${esc(m.place)}</div><h3>Documento de la pieza</h3><p>${esc(mat.tests.documento)}</p>${fichaHtml(m)}<button class="btn primary">Cerrar</button></div>`;
  document.body.appendChild(d); d.querySelector('button').onclick = () => d.remove();
}

// ============================================================ EJECUCIÓN
async function runExecution() {
  const m = st.mission;
  ui.innerHTML = ''; hud.classList.add('on'); world.clearLabels();
  if (S.familyOf(st.pid) === 'EBW') { A('play', 'pump_down'); toast(`Bombeando la cámara hasta ${st.params.vac} mbar…`, 2600); await new Promise(r => setTimeout(r, 2600)); }
  const ex = new Execution({ world, audio, voices, mission: m, pid: st.pid, params: st.params, cons: st.cons, prepDone: st.prepDone, pos: st.design.pos, hud, canvas, attempt: st.attempts,
    runAction: (k, o) => act(k, o),
    onFatal: () => { hud.classList.remove('on'); hud.innerHTML = ''; st.fatal = true; A('play', 'fail'); finishMission(); },
    onDone: (results, log) => {
      ex.dispose(); hud.classList.remove('on'); hud.innerHTML = '';
      st.execs = results; st.incidentLog = log;
      const slag = PROCESSES[st.pid].family === 'SMAW' || st.pid === 'FCAW';
      const after = () => {
        st.result = S.buildResult(st);
        world.retintAll(st.result.heatTint * (m.material === 'ss316l' || m.material === 'ti64' ? 1 : 0.6));
        world.setCameraMode('orbit', { reset: false }); world.controls.target.copy(world.piece.focus);
        A('play', 'ok'); go('insp');
      };
      if (slag) { toast('Picas la escoria y cepillas el cordón…'); act('hammer', { after: () => world.chipSlag() }).then(after); } else after();
    } });
  st.exec = ex; ex.startPass(0);
}

// ============================================================ INSPECCIÓN
function renderInspectionStage() {
  const m = st.mission, r = st.result; const done = st.methods;
  ui.innerHTML = `<div class="mission"><div class="stepper"><span class="mtitle" style="margin-left:0">Inspección · ${esc(m.title)}</span></div></div>
    <div class="inspect"><div class="methods">
      <div class="acc"><b>Criterio de aceptación</b><br>${esc(m.acceptance)}</div>
      ${Object.values(INSPECTION_METHODS).map(x => { const ap = safeApp(x, r); const d = done.includes(x.id);
        return `<div class="mcheck ${st.selMethods?.has(x.id) || d ? 'sel' : ''} ${ap.ok ? '' : 'na'}" data-m="${x.id}"><div class="ic">${x.icon || '🔎'}</div><div><b>${esc(x.name)}${d ? ' ✔' : ''}</b><p>${esc(x.description || '')}</p><p>⏱ ${x.minutes ?? '?'} min · 🪙 ${x.cost ?? '?'}${ap.ok ? '' : ` · ⚠ ${esc(ap.reason || 'No aplicable')}`}</p></div></div>`; }).join('')}
      <button class="btn primary" id="run" style="width:100%">Hacer los ensayos seleccionados</button>
    </div>
    <div class="view"><div class="tabs">${done.map(id => `<button class="btn small ${st.tab === id ? 'primary' : ''}" data-tab="${id}">${esc(INSPECTION_METHODS[id]?.name || id)}</button>`).join('')}</div>
      ${done.length ? `<canvas id="ndt" width="1100" height="440"></canvas><div class="findings" id="find"></div>` : `<p class="note">Escoge los ensayos adecuados para esta unión y este material. Piensa qué defectos puede esconder la soldadura y qué método los encuentra.</p>`}
      <div class="decision">${st.rejections.length ? `<span class="note">Reparaciones: ${st.rejections.length}</span>` : ''}
        <button class="btn primary" id="approve">✅ Aprobar y entregar</button>
        ${st.attempts < 2 ? '<button class="btn" id="reject">🔁 Rechazar: pulir y volver a soldar</button>' : '<span class="note">Ya no quedan reparaciones.</span>'}
        <button class="btn ghost" id="peek">👁️ Ver el cordón en 3D</button></div></div></div>`;
  st.selMethods ||= new Set();
  ui.querySelectorAll('[data-m]').forEach(el => el.onclick = () => { const id = el.dataset.m; if (done.includes(id)) return; st.selMethods.has(id) ? st.selMethods.delete(id) : st.selMethods.add(id); A('play', 'click'); renderInspectionStage(); });
  $('#run').onclick = () => { const sel = [...st.selMethods].filter(id => !done.includes(id)); if (!sel.length) { toast('Selecciona al menos un ensayo'); return; } done.push(...sel); st.tab = sel[0]; A('play', 'ok'); st.selMethods.clear(); renderInspectionStage(); };
  ui.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; renderInspectionStage(); });
  if (done.length) {
    const id = st.tab || done[0]; const res = safeDetect(id, r);
    for (const d of res.found || []) st.detected.set(d.id, d);
    try { renderInspection(id, r, $('#ndt')); } catch (e) { console.error(e); }
    $('#find').innerHTML = `<b>${esc(INSPECTION_METHODS[id]?.name || id)}:</b> ${(res.found || []).length ? `${res.found.length} indicación(es).` : 'sin indicaciones registrables.'}<br>${(res.notes || []).map(n => `• ${esc(n)}`).join('<br>')}`;
  }
  $('#approve').onclick = () => { A('play', 'ok'); finishMission(); };
  const rj = $('#reject'); if (rj) rj.onclick = () => {
    const crit = r.defects.filter(d => S.isCritical(m, d)).length;
    st.rejections.push({ correct: crit > 0 }); st.attempts++; st.methods = []; st.detected = new Map(); st.tab = null;
    sceneKey = null; setScene(m, st.design); world.setTool(st.pid, m.material); world.setCleaned(true, m.material);
    busyRun(async () => { await act('grind', {}); go('exec'); });
  };
  $('#peek').onclick = () => { const v = $('.inspect'); v.style.display = 'none'; world.focusJoint(0.5); toast('Gira con el ratón. Clic en "Volver" para regresar.', 2500); const bk = document.createElement('button'); bk.className = 'btn primary backbtn'; bk.textContent = '← Volver a los ensayos'; document.body.appendChild(bk); bk.onclick = () => { v.style.display = ''; bk.remove(); }; };
}
function safeApp(x, r) { try { return x.applicable ? x.applicable(r) : { ok: true }; } catch { return { ok: true }; } }
function safeDetect(id, r) { try { return detect(id, r) || { found: [], notes: [] }; } catch (e) { console.error(e); return { found: [], notes: ['Error en el ensayo'] }; } }

// ============================================================ INFORME
function finishMission() {
  const m = st.mission;
  const ctx = { cons: st.cons };
  const scores = {
    diag: S.scoreDiag(m, st.material, st.tests),
    calc: S.scoreCalc(m, st.answers),
    proc: S.scoreProcess(m, st.pid),
    cons: S.scoreCons(m, st.pid, st.cons),
    design: S.scoreDesign(m, st.design.pos, st.design.bevel),
    prep: S.scorePrep(m, ctx, st.prepDone),
    param: S.scoreParams(m, st.pid, st.params, ctx),
  };
  if (st.fatal) {
    scores.exec = { score: 0, notes: [{ good: false, text: 'Se prendió el arco con vapores combustibles dentro del recipiente.' }] };
    scores.insp = { score: 0, notes: [{ good: false, text: 'No hubo inspección: hubo un accidente.' }] };
    st.final = { scores, fin: { total: 0, stars: 0, outcome: 'catastrophe' }, criticals: [], reward: 0 };
    save.stars[m.id] = Math.max(save.stars[m.id] || 0, 0); persist(); go('report'); return;
  }
  const r = st.result;
  scores.exec = S.scoreExec(m, r, Object.assign([...st.execs], { incidentLog: st.incidentLog }));
  if (scores.proc.score < 30) { scores.param.score = Math.min(scores.param.score, 30); scores.param.notes.push({ good: false, text: 'Unos parámetros correctos no compensan un proceso inadecuado.' }); }
  if (st.attempts) { scores.exec.score = Math.max(0, scores.exec.score - 5 * st.attempts); scores.exec.notes.push({ good: false, text: `Fueron necesarias ${st.attempts} reparación(es).` }); }
  const insp = S.scoreInspection(m, st.methods, [...st.detected.values()], 'aprobar', r);
  for (const rj of st.rejections) { insp.score = Math.max(0, Math.min(100, insp.score + (rj.correct ? 8 : -12))); insp.notes.push({ good: rj.correct, text: rj.correct ? 'Rechazaste a tiempo una soldadura defectuosa: así se trabaja.' : 'Rechazaste una soldadura que cumplía: reparación innecesaria.' }); }
  scores.insp = insp;
  const criticals = r.defects.filter(d => S.isCritical(m, d));
  const fin = S.finalScore(scores, true, criticals.length);
  const reward = fin.outcome === 'ok' ? Math.round(m.reward * (0.4 + 0.2 * fin.stars)) : 0;
  if (fin.outcome === 'ok' && fin.stars > 0) save.unlocked = Math.max(save.unlocked, m.n + 1);
  save.stars[m.id] = Math.max(save.stars[m.id] || 0, fin.stars); save.best[m.id] = Math.max(save.best[m.id] || 0, fin.total); save.coins += reward; persist();
  st.final = { scores, fin, criticals, reward };
  A('play', fin.outcome === 'ok' && fin.stars ? 'success' : 'fail'); if (reward) setTimeout(() => A('play', 'coin'), 700);
  go('report');
}

function renderReport() {
  const m = st.mission, r = st.result; const { scores, fin, reward } = st.final;
  const ok = fin.outcome === 'ok' && fin.stars > 0;
  const story = fin.outcome === 'catastrophe' ? m.catastropheStory : fin.outcome === 'fail' ? m.failStory : (fin.stars ? m.successStory : 'La pieza aguanta, pero el trabajo no alcanza el nivel que esperaba el cliente. Hay que repetirlo.');
  say(story, fin.outcome === 'ok' ? m.client.voice : 'maestro');
  const L = m.lengthMm;
  ui.innerHTML = `<div class="mission"><div class="stepper"><span class="mtitle" style="margin-left:0">Informe · ${esc(m.title)}</span></div></div>
  <div class="report">
    <div class="top"><div class="score">${fin.total}</div><div><div class="bigstars">${'★'.repeat(fin.stars)}${'☆'.repeat(3 - fin.stars)}</div>
      <div class="cond" style="font-size:22px">${fin.outcome === 'catastrophe' ? 'ACCIDENTE: SE SOLDÓ SIN DESGASIFICAR' : fin.outcome === 'fail' ? 'ENTREGASTE UNA SOLDADURA DEFECTUOSA' : ok ? '¡TRABAJO ENTREGADO!' : 'TRABAJO INSUFICIENTE'}</div>
      <div class="note">${reward ? `+${reward} monedas` : 'Sin pago'}${st.methods.length ? ` · Ensayos: ${st.methods.join(', ')}` : ''}</div></div></div>
    <p class="story ${fin.outcome !== 'ok' ? 'bad' : ok ? 'good' : ''}">${m.client.avatar} ${esc(story)}</p>
    <div class="grid">${STAGES.map(s => { const sc = scores[s.id] || { score: 0, notes: [] }; return `<div class="stage"><h4><span>${s.name} <span class="note">(${s.weight} %)</span></span><span>${Math.round(sc.score)}</span></h4><div class="meter"><div style="width:${sc.score}%"></div></div><ul>${sc.notes.map(n => `<li class="${n.good ? 'g' : 'b'}">${esc(n.text)}</li>`).join('')}</ul></div>`; }).join('')}</div>
    ${r ? `<h3 style="margin-top:26px">Lo que realmente había en la soldadura</h3>
    ${r.defects.length ? `<table class="def"><tr><th>#</th><th>Defecto</th><th>Ubicación</th><th>Posición</th><th>Severidad</th><th>¿Rechazable?</th><th>¿Lo detectaste?</th></tr>
      ${r.defects.map(d => `<tr><td>${d.id}</td><td>${esc(d.label || DEFECT_NAMES[d.type])}</td><td>${d.location}</td><td>${Math.round(d.s0 * L)}–${Math.round(d.s1 * L)} mm</td><td>${Math.round(d.severity * 100)} %</td>
      <td>${S.isCritical(m, d) ? '<span class="pill crit">Sí</span>' : '<span class="pill">No</span>'}</td><td>${st.detected.has(d.id) ? '<span class="pill ok">Sí</span>' : '<span class="pill">No</span>'}</td></tr>`).join('')}</table>`
      : '<p class="story good">Ningún defecto. Soldadura de libro.</p>'}` : ''}
    <div style="display:flex;gap:10px;margin-top:22px;align-items:center"><button class="btn primary" id="map">Volver al pueblo</button><button class="btn" id="again">Repetir caso</button><span class="credits inline">${esc(CREDITS)}</span></div>
  </div>`;
  $('#map').onclick = () => showMap();
  $('#again').onclick = () => startMission(m);
}

// ============================================================ arranque
showTitle();
setTimeout(() => $('#loading').classList.add('hide'), 600);
window.__dbg = { world, get st() { return st; }, audio, voices };
// Atajo de pruebas (consola)
window.__dbg.quick = (id, o = {}) => {
  const m = MISSIONS.find(x => x.id === id); startMission(m);
  st.tests = new Set(o.tests || ['iman']); st.material = o.material || m.material; st.pid = o.pid; st.answers = o.answers || (m.questions || []).map(q => q.answer);
  st.design = { pos: o.pos ? m.design.positions.find(p => p.id === o.pos) : m.design.positions[0], bevel: o.bevel ? m.design.bevels?.find(b => b.id === o.bevel) : m.design.bevels?.[0] };
  sceneKey = null; setScene(m, st.design); world.setTool(st.pid, m.material);
  st.cons = o.cons || {}; st.prepDone = new Set(o.prep || []); world.setCleaned(true, m.material);
  st.params = { ...S.defaultParams(st.pid), ...(o.params || {}) }; go(o.step || 'exec');
};
