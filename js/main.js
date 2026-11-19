// =====================================================================
//  Soldador del Pueblo — flujo del juego e interfaz
// =====================================================================
import { World } from './world.js';
import { WeldAudio } from './audio.js';
import { INSPECTION_METHODS, detect, renderInspection } from './inspection.js';
import { MATERIALS, MATERIAL_TESTS, PROCESSES, MISSIONS, STAGES, DEFECT_NAMES, STANDOFF } from './data.js';
import * as S from './sim.js';
import { Execution } from './exec.js';

const $ = (s, el = document) => el.querySelector(s);
const ui = $('#ui'), hud = $('#hud'), canvas = $('#gl');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const world = new World(canvas);
const audio = new WeldAudio();
const A = (fn, ...a) => { try { audio[fn]?.(...a); } catch (e) { console.warn(e); } };

// ------------------------------------------------------------ guardado
const SAVE_KEY = 'soldador-del-pueblo-v1';
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || null; } catch { return null; } }
let save = loadSave() || { unlocked: 1, stars: {}, best: {}, coins: 0 };
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* sin almacenamiento */ } }

function toast(t, ms = 2400) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), ms); }

// ============================================================ PORTADA
function showTitle() {
  setScene(MISSIONS[0]);
  world.controls.autoRotate = true; world.controls.autoRotateSpeed = 0.5;
  ui.innerHTML = `<div class="title">
    <h1>Soldador<span>del Pueblo</span></h1>
    <p>Diagnostica el material, elige el proceso correcto, prepara la junta, ajusta los parámetros, suelda con tu propia mano y demuestra con ensayos que tu trabajo es seguro. Desde la bici de Mateo hasta el motor de un avión soldado con <b>haz de electrones</b>.</p>
    <div class="row"><button class="btn primary" id="play">${save.unlocked > 1 ? 'Continuar' : 'Empezar'}</button>
    ${save.unlocked > 1 ? '<button class="btn ghost" id="reset">Nueva partida</button>' : ''}</div>
    <small>Recomendado: ratón y auriculares · Pantalla completa con F11</small></div>`;
  $('#play').onclick = async () => { await audio.resume?.(); A('play', 'ok'); showMap(); };
  const r = $('#reset'); if (r) r.onclick = () => { if (confirm('¿Borrar el progreso y empezar de nuevo?')) { save = { unlocked: 1, stars: {}, best: {}, coins: 0 }; persist(); showTitle(); } };
}

let sceneKey = null;
function setScene(m) {
  world.setEnvironment(m.env);
  if (sceneKey !== m.id) { world.loadPiece(m); sceneKey = m.id; }
  world.setCameraMode('orbit');
  A('startAmbient', m.ambient);
}

// ============================================================ MAPA
function showMap() {
  hud.classList.remove('on');
  const shown = MISSIONS[Math.min(save.unlocked, MISSIONS.length) - 1];
  setScene(shown); world.controls.autoRotate = true;
  ui.innerHTML = `<div class="map"><header><h2>El pueblo · Encargos</h2><div class="wallet">🪙 ${save.coins.toLocaleString('es')} monedas</div></header>
    <div class="cards">${MISSIONS.map(m => {
      const locked = m.n > save.unlocked; const st = save.stars[m.id] || 0;
      return `<div class="card ${locked ? 'locked' : ''}" data-id="${m.id}">
        <div class="num">Encargo ${m.n}</div><h3>${esc(m.title)}</h3><div class="place">📍 ${esc(m.place)}</div>
        <div><span class="tag">${MATERIALS[m.material].short} · ${m.thicknessMm} mm</span></div>
        <div class="who"><span class="av">${m.client.avatar}</span><div><b>${esc(m.client.name)}</b><br><span class="place">${esc(m.client.role)}</span></div></div>
        <div class="stars">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</div></div>`;
    }).join('')}</div></div>`;
  ui.querySelectorAll('.card').forEach(c => {
    c.onmouseenter = () => { const m = MISSIONS.find(x => x.id === c.dataset.id); if (m.n <= save.unlocked) { setScene(m); world.controls.autoRotate = true; } };
    c.onclick = () => { const m = MISSIONS.find(x => x.id === c.dataset.id); if (m.n > save.unlocked) { A('play', 'error'); toast('Completa el encargo anterior para desbloquearlo'); return; } A('play', 'click'); startMission(m); };
  });
}

// ============================================================ MISIÓN
let st = null;
const STEP_IDS = ['intro', 'diag', 'proc', 'cons', 'prep', 'param', 'exec', 'insp', 'report'];
const STEP_NAMES = { intro: 'Encargo', diag: 'Diagnóstico', proc: 'Proceso', cons: 'Consumibles', prep: 'Preparación', param: 'Parámetros', exec: 'Ejecución', insp: 'Inspección', report: 'Informe' };

function startMission(m) {
  sceneKey = null; setScene(m); world.controls.autoRotate = false;
  world.setCameraMode('orbit');
  st = { mission: m, step: 'intro', tests: new Set(), material: null, pid: null, cons: {}, prepDone: new Set(), minutes: 0, params: {}, execs: [], attempts: 0, rejections: [], methods: [], detected: new Map(), dialogIdx: 0 };
  render();
}

function go(step) { st.step = step; A('play', 'page'); render(); }

function frame(inner, { title, sub, foot = '', dialog = null }) {
  const idx = STEP_IDS.indexOf(st.step);
  ui.innerHTML = `<div class="mission">
    <div class="stepper"><button class="btn small ghost back">← Pueblo</button>
      ${STEP_IDS.map((s, i) => `<span class="st ${i < idx ? 'done' : ''} ${i === idx ? 'cur' : ''}">${i + 1}. ${STEP_NAMES[s]}</span>`).join('')}
      <span class="mtitle">${esc(st.mission.title)}</span></div>
    ${dialog ? `<div class="dialog ${dialog.mentor ? 'mentor' : ''}"><div class="av">${dialog.av}</div><div><div class="name">${esc(dialog.name)}</div><div class="role">${esc(dialog.role)}</div><div class="txt">${dialog.html}</div></div></div>` : ''}
    <div class="side"><div class="head"><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><div class="body">${inner}</div><div class="foot">${foot}</div></div>
    <div class="hint3d">🖱️ Arrastra para girar · rueda para acercar</div></div>`;
  $('.back', ui).onclick = () => { if (confirm('¿Abandonar este encargo?')) showMap(); };
}

const mentorDialog = () => ({ av: '👴', name: 'Maestro Tomás', role: 'Tu mentor, 40 años soldando', html: esc(st.mission.mentor), mentor: true });

function render() {
  const m = st.mission;
  switch (st.step) {
    // ---------------------------------------------------------------- encargo
    case 'intro': {
      const line = m.intro[Math.min(st.dialogIdx, m.intro.length - 1)];
      frame(`<div class="group-label">El trabajo</div>
        <p class="note">📍 ${esc(m.place)}<br>🔩 Unión ${m.joint}${m.passes > 1 ? `, ${m.passes} pasadas` : ''}<br>📏 Longitud de soldadura: ${m.lengthMm} mm</p>
        <div class="group-label">Criterio de aceptación</div><div class="acc">${esc(m.acceptance)}</div>
        <div class="group-label">Cómo se evalúa</div>
        <p class="note">${STAGES.map(s => `${s.name} ${s.weight}%`).join(' · ')}</p>
        <p class="note">Nadie te dirá si aciertas hasta el informe final. Igual que en el taller: el metal no perdona.</p>`,
        { title: 'Nuevo encargo', sub: `${m.client.name} — ${m.client.role}`, foot: `<button class="btn ghost" id="more">${st.dialogIdx < m.intro.length - 1 ? 'Seguir escuchando ›' : 'Volver a escuchar'}</button><button class="btn primary" id="ok">Aceptar el encargo</button>`,
          dialog: { av: m.client.avatar, name: m.client.name, role: m.client.role, html: esc(line) } });
      $('#more').onclick = () => { st.dialogIdx = st.dialogIdx < m.intro.length - 1 ? st.dialogIdx + 1 : 0; A('play', 'page'); render(); };
      $('#ok').onclick = () => go('diag');
      break;
    }
    // ---------------------------------------------------------------- diagnóstico
    case 'diag': {
      const mat = MATERIALS[m.material];
      frame(`<div class="group-label">Pruebas de identificación</div>
        ${MATERIAL_TESTS.map(t => `<button class="opt ${st.tests.has(t.id) ? 'done' : ''}" data-test="${t.id}"><b>${t.icon} ${t.name}</b></button>${st.tests.has(t.id) ? `<div class="testres">${esc(mat.tests[t.id])}</div>` : ''}`).join('')}
        <div class="group-label">¿Qué material es?</div>
        ${Object.values(MATERIALS).map(x => `<button class="opt ${st.material === x.id ? 'sel' : ''}" data-mat="${x.id}"><b>${esc(x.name)}</b></button>`).join('')}`,
        { title: 'Diagnóstico', sub: 'Antes de elegir nada, identifica qué metal tienes delante. Cada prueba da una pista.', foot: `<span class="timecost">Pruebas: ${st.tests.size}/5</span><button class="btn primary" id="ok" ${st.material ? '' : 'disabled'}>Confirmar material</button>`, dialog: null });
      ui.querySelectorAll('[data-test]').forEach(b => b.onclick = () => {
        const t = MATERIAL_TESTS.find(x => x.id === b.dataset.test); if (st.tests.has(t.id)) return;
        st.tests.add(t.id); A('play', t.sfx); if (t.id === 'chispa') world.grindFX(1.3); render();
      });
      ui.querySelectorAll('[data-mat]').forEach(b => b.onclick = () => { st.material = b.dataset.mat; A('play', 'click'); render(); });
      $('#ok').onclick = () => go('proc');
      break;
    }
    // ---------------------------------------------------------------- proceso
    case 'proc': {
      frame(Object.values(PROCESSES).map(p => `<button class="opt ${st.pid === p.id ? 'sel' : ''}" data-p="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.desc)}</span></button>`).join(''),
        { title: 'Proceso de soldadura', sub: `Material: ${esc(MATERIALS[st.material].name)} · ${m.thicknessMm} mm · unión ${m.joint}. Piensa en el espesor, el entorno y lo que exige el cliente.`,
          foot: `<button class="btn ghost" id="tip">💡 Consejo</button><button class="btn primary" id="ok" ${st.pid ? '' : 'disabled'}>Elegir proceso</button>`, dialog: st.tip ? mentorDialog() : null });
      ui.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { st.pid = b.dataset.p; A('play', 'click'); render(); });
      $('#tip').onclick = () => { st.tip = !st.tip; render(); };
      $('#ok').onclick = () => { st.cons = {}; st.params = S.defaultParams(st.pid); world.setTool(st.pid, m.material); go('cons'); };
      break;
    }
    // ---------------------------------------------------------------- consumibles
    case 'cons': {
      const groups = S.consumableGroups(m, st.pid);
      frame(groups.map(g => `<div class="group-label">${esc(g.label)}</div>${g.options.map(o => `<button class="opt ${st.cons[g.id] === o.id ? 'sel' : ''}" data-g="${g.id}" data-o="${o.id}"><b>${esc(o.name)}</b></button>`).join('')}`).join(''),
        { title: 'Consumibles', sub: `${esc(PROCESSES[st.pid].name)} sobre ${esc(MATERIALS[st.material].name)}.`, foot: `<span></span><button class="btn primary" id="ok" ${groups.every(g => st.cons[g.id]) ? '' : 'disabled'}>Confirmar</button>`, dialog: st.tip ? mentorDialog() : null });
      ui.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { st.cons[b.dataset.g] = b.dataset.o; A('play', 'click'); render(); });
      $('#ok').onclick = () => go('prep');
      break;
    }
    // ---------------------------------------------------------------- preparación
    case 'prep': {
      frame(`<p class="note">Elige qué haces antes de soldar. No todo lo que parece útil lo es: algunas acciones dañan la pieza. Cada acción consume tiempo.</p>
        ${m.prep.map(it => `<button class="opt ${st.prepDone.has(it.id) ? 'done' : ''}" data-prep="${it.id}"><b>${st.prepDone.has(it.id) ? '✔ ' : ''}${esc(it.label)}</b>${it.detail ? `<span>${esc(it.detail)}</span>` : ''}<span class="timecost">⏱ ${it.minutes || 1} min</span></button>`).join('')}`,
        { title: 'Preparación', sub: 'Limpieza, ajuste, fijación, temperatura… La mitad de una buena soldadura se hace antes de encender el arco.', foot: `<span class="timecost">Tiempo invertido: ${st.minutes} min</span><button class="btn primary" id="ok">Preparación terminada</button>`, dialog: st.tip ? mentorDialog() : null });
      ui.querySelectorAll('[data-prep]').forEach(b => b.onclick = () => {
        const it = m.prep.find(x => x.id === b.dataset.prep); if (st.prepDone.has(it.id)) return;
        st.prepDone.add(it.id); st.minutes += it.minutes || 1; A('play', it.sfx || 'click');
        if (it.sfx === 'grinder') world.grindFX(1.6);
        if (it.cleans) world.setCleaned(true, m.material);
        render();
      });
      $('#ok').onclick = () => go('param');
      break;
    }
    // ---------------------------------------------------------------- parámetros
    case 'param': {
      const defs = S.paramDefsFor(st.pid);
      const info = () => {
        const p = st.params; const fam = S.familyOf(st.pid);
        if (fam === 'EBW') return `Potencia del haz: <b>${(p.kV * p.mA / 1000).toFixed(2)} kW</b> · Energía lineal: <b>${(p.kV * p.mA / p.v / 1000).toFixed(2)} kJ/mm</b>`;
        if (fam === 'TIG') return `Potencia de arco aprox.: <b>${((10 + 0.04 * p.I) * p.I / 1000).toFixed(2)} kW</b> (V ≈ ${(10 + 0.04 * p.I).toFixed(1)} V)`;
        if (fam === 'SMAW') return `Potencia de arco aprox.: <b>${((20 + 0.04 * p.I) * p.I / 1000).toFixed(2)} kW</b>`;
        if (fam === 'MIG') return `Corriente estimada: <b>${Math.round(30 + 18 * p.wfs)} A</b> · Potencia ≈ <b>${(p.V * (30 + 18 * p.wfs) / 1000).toFixed(2)} kW</b>`;
        return '';
      };
      frame(defs.map(d => d.options
        ? `<div class="param"><div class="lab"><span>${d.label}</span></div><select data-pp="${d.id}">${d.options.map(o => `<option ${st.params[d.id] === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`
        : `<div class="param"><div class="lab"><span>${d.label}</span><b><span data-v="${d.id}">${st.params[d.id]}</span> ${d.unit}</b></div><input type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${st.params[d.id]}" data-pp="${d.id}"></div>`).join('')
        + `<div class="acc" id="pinfo">${info()}</div><p class="note">${S.familyOf(st.pid) === 'EBW' || S.familyOf(st.pid) === 'AUTO' ? 'En procesos mecanizados la velocidad de avance es un parámetro de la máquina.' : 'La velocidad de avance la pondrás tú con la mano durante la ejecución.'}</p>`,
        { title: 'Parámetros', sub: `${esc(PROCESSES[st.pid].name)} · ${m.thicknessMm} mm de ${esc(MATERIALS[st.material].short)}`, foot: `<span></span><button class="btn primary" id="ok">Fijar parámetros</button>`, dialog: st.tip ? mentorDialog() : null });
      ui.querySelectorAll('[data-pp]').forEach(inp => inp.oninput = () => {
        const d = defs.find(x => x.id === inp.dataset.pp); st.params[d.id] = d.options ? inp.value : +inp.value;
        const v = $(`[data-v="${d.id}"]`, ui); if (v) v.textContent = st.params[d.id]; $('#pinfo', ui).innerHTML = info();
      });
      $('#ok').onclick = () => { A('play', 'ok'); go('exec'); };
      break;
    }
    // ---------------------------------------------------------------- ejecución
    case 'exec': {
      const fam = S.familyOf(st.pid); const auto = PROCESSES[st.pid].exec === 'auto' || fam === 'EBW';
      const sw = S.speedWindow(m, st.pid, st.params);
      const howto = auto
        ? `<p>Proceso mecanizado: la máquina avanza sola a ${st.params.v ?? '—'} mm/s.</p>
           <p>Tu trabajo: vigilar la <b>cámara de seguimiento</b> y mantener el haz sobre la junta moviendo el <b>ratón ↕</b> o con <span class="kbd">A</span>/<span class="kbd">D</span>.</p>
           ${fam === 'EBW' ? `<p>Al completar la vuelta empieza la <b>zona de solape</b> (rayada en la barra). Pulsa <span class="kbd">E</span> dentro de esa zona para la <b>rampa de salida</b> del haz. Si no lo haces, el keyhole colapsa y deja un cráter.</p>` : ''}`
        : `<p>Mantén pulsado el <b>clic izquierdo</b> para encender el arco y <b>mueve el ratón hacia la derecha</b> para avanzar. Ritmo objetivo: <b>${sw[0]}–${sw[1]} mm/s</b>.</p>
           <p>Corrige la <b>posición sobre la junta</b> con el ratón ↕ (tu mano tiembla un poco, como en la vida real).</p>
           <p><span class="kbd">W</span>/<span class="kbd">S</span> o la rueda: ${STANDOFF[fam]?.label?.toLowerCase() || 'distancia'}. ${fam === 'SMAW' ? 'El electrodo se consume y el arco se alarga: acércalo continuamente.' : ''}</p>
           ${fam === 'TIG' || fam === 'OAW' ? '<p><span class="kbd">Espacio</span>: aporta varilla al charco a un ritmo constante. Sin varilla el cordón queda hundido; demasiada, frío.</p>' : ''}
           <p>Al llegar al final, <b>detente un instante</b> antes de soltar para rellenar el cráter.</p>`;
      frame(`${howto}<p><span class="kbd">H</span>: careta (no mires el arco sin ella) · <span class="kbd">Esc</span>: pausa</p>
        ${st.attempts ? `<div class="acc">Intento de reparación nº ${st.attempts}. La soldadura anterior se amoló por completo.</div>` : ''}`,
        { title: 'Ejecución', sub: `${esc(PROCESSES[st.pid].name)}${m.passes > 1 ? ` · ${m.passes} pasadas: raíz, relleno y presentación` : ''}`, foot: `<span></span><button class="btn primary" id="ok">${auto ? 'Activar la máquina' : 'Bajar la careta y soldar'}</button>`, dialog: st.tip ? mentorDialog() : null });
      $('#ok').onclick = () => runExecution();
      break;
    }
    case 'insp': renderInspectionStage(); break;
    case 'report': renderReport(); break;
  }
}

// ============================================================ EJECUCIÓN
async function runExecution() {
  const m = st.mission;
  ui.innerHTML = ''; hud.classList.add('on');
  if (S.familyOf(st.pid) === 'EBW') { A('play', 'pump_down'); toast(`Bombeando la cámara hasta ${st.params.vac} mbar…`, 2600); await new Promise(r => setTimeout(r, 2600)); }
  try { canvas.requestPointerLock?.()?.catch?.(() => {}); } catch {}
  const ex = new Execution({ world, audio, mission: m, pid: st.pid, params: st.params, cons: st.cons, prepDone: st.prepDone, hud, canvas, attempt: st.attempts,
    onDone: (results) => {
      ex.dispose(); hud.classList.remove('on'); hud.innerHTML = '';
      st.execs = results;
      if (PROCESSES[st.pid].family === 'SMAW' || st.pid === 'FCAW') { A('play', 'slag_chip'); world.chipSlag(); toast('Picas la escoria y cepillas el cordón…'); }
      st.result = S.buildResult(st);
      world.retintAll(st.result.heatTint * (m.material === 'ss316l' || m.material === 'ti64' ? 1 : 0.6));
      world.setCameraMode('orbit', { reset: false });
      const P = world.piece; world.controls.target.copy(P.focus);
      setTimeout(() => { A('play', 'ok'); go('insp'); }, 500);
    } });
  st.exec = ex; ex.startPass(0);
}

// ============================================================ INSPECCIÓN
function renderInspectionStage() {
  const m = st.mission, r = st.result;
  const done = st.methods;
  ui.innerHTML = `<div class="mission"><div class="stepper"><span class="mtitle" style="margin-left:0">Inspección · ${esc(m.title)}</span></div></div>
    <div class="inspect"><div class="methods">
      <div class="acc"><b>Criterio de aceptación</b><br>${esc(m.acceptance)}</div>
      ${Object.values(INSPECTION_METHODS).map(x => { const ap = safeApp(x, r); const d = done.includes(x.id);
        return `<div class="mcheck ${st.selMethods?.has(x.id) || d ? 'sel' : ''} ${ap.ok ? '' : 'na'}" data-m="${x.id}"><div class="ic">${x.icon || '🔎'}</div><div><b>${esc(x.name)}${d ? ' ✔' : ''}</b><p>${esc(x.description || '')}</p><p>⏱ ${x.minutes ?? '?'} min · 🪙 ${x.cost ?? '?'}${ap.ok ? '' : ` · ⚠ ${esc(ap.reason || 'No aplicable')}`}</p></div></div>`; }).join('')}
      <button class="btn primary" id="run" style="width:100%">Realizar ensayos seleccionados</button>
    </div>
    <div class="view"><div class="tabs">${done.map(id => `<button class="btn small ${st.tab === id ? 'primary' : ''}" data-tab="${id}">${esc(INSPECTION_METHODS[id]?.name || id)}</button>`).join('')}</div>
      ${done.length ? `<canvas id="ndt" width="1100" height="440"></canvas><div class="findings" id="find"></div>` : `<p class="note">Selecciona los ensayos que consideres adecuados para esta unión y este material. Piensa qué defectos puede ocultar la soldadura y qué método los encuentra. Puedes observar el cordón en 3D detrás de este panel… o confiar en los ensayos.</p>`}
      <div class="decision">${st.rejections.length ? `<span class="note">Reparaciones realizadas: ${st.rejections.length}</span>` : ''}
        <button class="btn primary" id="approve">✅ Aprobar y entregar al cliente</button>
        ${st.attempts < 2 ? '<button class="btn" id="reject">🔁 Rechazar: amolar y volver a soldar</button>' : '<span class="note">Ya no quedan intentos de reparación.</span>'}
        <button class="btn ghost" id="peek">👁️ Ver la pieza en 3D</button></div></div></div>`;
  st.selMethods ||= new Set();
  ui.querySelectorAll('[data-m]').forEach(el => el.onclick = () => {
    const id = el.dataset.m; if (done.includes(id)) return;
    st.selMethods.has(id) ? st.selMethods.delete(id) : st.selMethods.add(id); A('play', 'click'); renderInspectionStage();
  });
  $('#run').onclick = () => {
    const sel = [...st.selMethods].filter(id => !done.includes(id)); if (!sel.length) { toast('Selecciona al menos un ensayo'); return; }
    for (const id of sel) { done.push(id); st.methodsCost = (st.methodsCost || 0) + (INSPECTION_METHODS[id]?.cost || 0); }
    st.tab = sel[0]; A('play', 'ok'); st.selMethods.clear(); renderInspectionStage();
  };
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
    st.rejections.push({ correct: crit > 0 });
    st.attempts++; st.methods = []; st.detected = new Map(); st.tab = null;
    sceneKey = null; setScene(m); world.setTool(st.pid, m.material); if ([...st.prepDone].some(id => m.prep.find(p => p.id === id)?.cleans)) world.setCleaned(true, m.material);
    A('play', 'grinder'); go('exec');
  };
  $('#peek').onclick = () => { const v = $('.inspect'); v.style.display = 'none'; toast('Haz clic en cualquier parte para volver al informe de ensayos', 2500); setTimeout(() => document.addEventListener('click', () => { v.style.display = ''; }, { once: true }), 50); };
}

function safeApp(x, r) { try { return x.applicable ? x.applicable(r) : { ok: true }; } catch { return { ok: true }; } }
function safeDetect(id, r) { try { return detect(id, r) || { found: [], notes: [] }; } catch (e) { console.error(e); return { found: [], notes: ['Error en el ensayo'] }; } }

// ============================================================ INFORME
function finishMission() {
  const m = st.mission, r = st.result;
  const ctx = { cons: st.cons };
  const scores = {
    diag: S.scoreDiag(m, st.material, st.tests),
    proc: S.scoreProcess(m, st.pid),
    cons: S.scoreCons(m, st.pid, st.cons),
    prep: S.scorePrep(m, ctx, st.prepDone),
    param: S.scoreParams(m, st.pid, st.params, ctx),
    exec: S.scoreExec(m, r, st.execs),
  };
  if (scores.proc.score < 30) { scores.param.score = Math.min(scores.param.score, 30); scores.param.notes.push({ good: false, text: 'Unos parámetros correctos no compensan un proceso inadecuado para la pieza.' }); }
  if (st.attempts) { scores.exec.score = Math.max(0, scores.exec.score - 5 * st.attempts); scores.exec.notes.push({ good: false, text: `Fueron necesarias ${st.attempts} reparación(es).` }); }
  const insp = S.scoreInspection(m, st.methods, [...st.detected.values()], 'aprobar', r);
  for (const rj of st.rejections) { insp.score = Math.max(0, Math.min(100, insp.score + (rj.correct ? 8 : -12))); insp.notes.push({ good: rj.correct, text: rj.correct ? 'Rechazaste a tiempo una soldadura defectuosa: así se trabaja.' : 'Rechazaste una soldadura que cumplía: reparación innecesaria.' }); }
  scores.insp = insp;
  const criticals = r.defects.filter(d => S.isCritical(m, d));
  const fin = S.finalScore(scores, true, criticals.length);
  const reward = fin.outcome === 'ok' ? Math.round(m.reward * (0.4 + 0.2 * fin.stars)) : 0;
  if (fin.outcome === 'ok' && fin.stars > 0) { save.unlocked = Math.max(save.unlocked, m.n + 1); }
  save.stars[m.id] = Math.max(save.stars[m.id] || 0, fin.stars); save.best[m.id] = Math.max(save.best[m.id] || 0, fin.total); save.coins += reward; persist();
  st.final = { scores, fin, criticals, reward };
  A('play', fin.outcome === 'ok' && fin.stars ? 'success' : 'fail'); if (reward) setTimeout(() => A('play', 'coin'), 700);
  go('report');
}

function renderReport() {
  const m = st.mission, r = st.result; const { scores, fin, criticals, reward } = st.final;
  const ok = fin.outcome === 'ok' && fin.stars > 0;
  const story = fin.outcome === 'fail' ? m.failStory : (fin.stars ? m.successStory : 'La pieza aguanta, pero el trabajo no alcanza el nivel que el cliente esperaba. Habrá que repetirlo.');
  const L = m.lengthMm;
  ui.innerHTML = `<div class="mission"><div class="stepper"><span class="mtitle" style="margin-left:0">Informe · ${esc(m.title)}</span></div></div>
  <div class="report">
    <div class="top"><div class="score">${fin.total}</div><div><div class="bigstars">${'★'.repeat(fin.stars)}${'☆'.repeat(3 - fin.stars)}</div>
      <div class="cond" style="font-size:22px">${fin.outcome === 'fail' ? 'ENTREGASTE UNA SOLDADURA DEFECTUOSA' : ok ? '¡TRABAJO ENTREGADO!' : 'TRABAJO INSUFICIENTE'}</div>
      <div class="note">${reward ? `+${reward} monedas` : 'Sin pago'} · Ensayos: ${st.methods.length ? st.methods.join(', ') : 'ninguno'}</div></div></div>
    <p class="story ${fin.outcome === 'fail' ? 'bad' : ok ? 'good' : ''}">${m.client.avatar} ${esc(story)}</p>
    <div class="grid">${STAGES.map(s => { const sc = scores[s.id]; return `<div class="stage"><h4><span>${s.name} <span class="note">(${s.weight}%)</span></span><span>${Math.round(sc.score)}</span></h4><div class="meter"><div style="width:${sc.score}%"></div></div><ul>${sc.notes.map(n => `<li class="${n.good ? 'g' : 'b'}">${esc(n.text)}</li>`).join('')}</ul></div>`; }).join('')}</div>
    <h3 style="margin-top:26px">Lo que realmente había en la soldadura</h3>
    ${r.defects.length ? `<table class="def"><tr><th>#</th><th>Defecto</th><th>Ubicación</th><th>Posición</th><th>Severidad</th><th>¿Rechazable?</th><th>¿Lo detectaste?</th></tr>
      ${r.defects.map(d => `<tr><td>${d.id}</td><td>${esc(d.label || DEFECT_NAMES[d.type])}</td><td>${d.location}</td><td>${Math.round(d.s0 * L)}–${Math.round(d.s1 * L)} mm</td><td>${Math.round(d.severity * 100)} %</td>
      <td>${S.isCritical(m, d) ? '<span class="pill crit">Sí</span>' : '<span class="pill">No</span>'}</td><td>${st.detected.has(d.id) ? '<span class="pill ok">Sí</span>' : '<span class="pill">No</span>'}</td></tr>`).join('')}</table>`
      : '<p class="story good">Ningún defecto. Soldadura de libro.</p>'}
    <div style="display:flex;gap:10px;margin-top:22px"><button class="btn primary" id="map">Volver al pueblo</button><button class="btn" id="again">Repetir encargo</button></div>
  </div>`;
  $('#map').onclick = () => showMap();
  $('#again').onclick = () => startMission(m);
}

// ============================================================ arranque
window.addEventListener('keydown', e => { if (e.code === 'KeyM' && !hud.classList.contains('on')) { const mu = !audio._mutedFlag; audio._mutedFlag = mu; A('setMuted', mu); toast(mu ? 'Sonido silenciado' : 'Sonido activado'); } });
showTitle();
setTimeout(() => $('#loading').classList.add('hide'), 600);
window.__dbg = { world, get st() { return st; } };
// Atajo de pruebas (consola): __dbg.quick('avion', {...})
window.__dbg.quick = (id, o = {}) => {
  const m = MISSIONS.find(x => x.id === id); startMission(m);
  st.tests = new Set(o.tests || ['iman']); st.material = o.material || m.material; st.pid = o.pid; world.setTool(st.pid, m.material);
  st.cons = o.cons || {}; st.prepDone = new Set(o.prep || []); if ([...st.prepDone].some(p => m.prep.find(x => x.id === p)?.cleans)) world.setCleaned(true, m.material);
  st.params = { ...S.defaultParams(st.pid), ...(o.params || {}) }; go('exec');
};
