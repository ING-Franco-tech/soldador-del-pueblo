// =====================================================================
//  Simulación metalúrgica simplificada y evaluación del proceso
// =====================================================================
import { MATERIALS, PROCESSES, PARAM_DEFS, MISSIONS, STAGES, DEFECT_NAMES } from './data.js';

export const familyOf = pid => PROCESSES[pid]?.family || 'MIG';

export function rng(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  s = s || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mid = w => (w[0] + w[1]) / 2;

// ---------------------------------------------------------------------
export function paramDefsFor(pid) {
  return (PARAM_DEFS[familyOf(pid)] || []).filter(p => !p.onlyFor || p.onlyFor.includes(pid));
}

// Ventanas de parámetros: las de la misión o unas genéricas razonables.
export function paramWindows(mission, pid, ctx) {
  const fam = familyOf(pid);
  const base = { ...(mission.params?.[fam] || {}) };
  const hint = mission.paramHints?.[fam]?.(ctx);
  if (hint) Object.assign(base, hint);
  const out = {};
  for (const d of paramDefsFor(pid)) {
    if (base[d.id]) { out[d.id] = base[d.id]; continue; }
    if (d.options) { out[d.id] = { ideal: [d.def], ok: [] }; continue; }
    const span = (d.max - d.min);
    out[d.id] = { ideal: [d.def - span * 0.06, d.def + span * 0.06], ok: [d.def - span * 0.14, d.def + span * 0.14] };
  }
  return out;
}

export function defaultParams(pid) {
  const o = {};
  for (const d of paramDefsFor(pid)) o[d.id] = d.def;
  return o;
}

export function consumableGroups(mission, pid) {
  const fam = familyOf(pid);
  const key = fam === 'AUTO' ? (pid === 'LBW' ? 'LBW' : 'AUTO') : fam;
  const g = mission.consumables?.[key] || mission.consumables?.[fam];
  if (g) return g;
  return [{ id: 'generico', label: 'Consumible', options: [
    { id: 'std', name: `Consumible estándar para ${PROCESSES[pid].name.split('—')[0].trim()}`, score: 50, why: 'No hay un consumible específico preparado para este proceso en este trabajo.' },
  ] }];
}

export function speedWindow(mission, pid, params, pos) {
  const fam = familyOf(pid);
  if (fam === 'EBW' || fam === 'AUTO') { const v = params?.v ?? 10; return [v * 0.97, v * 1.03]; }
  const w = mission.exec.speed?.[fam] || [3, 5]; const k = pos?.speedMul || 1;
  return [w[0] * k, w[1] * k];
}

// ---------------------------------------------------------------------
export function scoreCalc(mission, answers) {
  const qs = mission.questions || []; if (!qs.length) return { score: 100, notes: [] };
  let ok = 0; const notes = [];
  qs.forEach((q, i) => { const a = answers[i]; const good = a === q.answer; if (good) ok++;
    notes.push({ good, text: `${q.q.split('?')[0]}? → ${good ? 'Correcto' : `Respuesta correcta: ${q.options[q.answer]}`}. ${q.explain}` }); });
  return { score: 100 * ok / qs.length, notes };
}

export function scoreDesign(mission, pos, bevel) {
  const notes = []; const d = mission.design || {}; let sum = 0, n = 0;
  if (d.positions?.length) {
    const best = d.positions.reduce((a, b) => (b.score > a.score ? b : a));
    sum += pos?.score ?? 0; n++;
    notes.push({ good: (pos?.score ?? 0) >= 80, text: `Posición ${pos?.name || '—'}: ${pos?.why || ''}` });
    if (pos && pos.score < 100) notes.push({ good: true, text: `Mejor: ${best.name}. ${best.why}` });
  }
  if (d.bevels?.length) {
    const best = d.bevels.reduce((a, b) => (b.score > a.score ? b : a));
    sum += bevel?.score ?? 0; n++;
    notes.push({ good: (bevel?.score ?? 0) >= 80, text: `Preparación de bordes: ${bevel?.name || '—'}. ${bevel?.why || ''}` });
    if (bevel && bevel.score < 100) notes.push({ good: true, text: `Mejor: ${best.name}. ${best.why}` });
  }
  return { score: n ? sum / n : 100, notes };
}

// ---------------------------------------------------------------------
//  Puntuaciones por etapa (0–100) con explicaciones
// ---------------------------------------------------------------------
export function scoreDiag(mission, chosenMaterial, testsDone) {
  const ok = chosenMaterial === mission.material;
  const notes = [];
  if (ok) notes.push({ good: true, text: `Identificaste correctamente el material: ${MATERIALS[mission.material].name}.` });
  else notes.push({ good: false, text: `El material era ${MATERIALS[mission.material].name}, no ${MATERIALS[chosenMaterial]?.name || '—'}. ${testsDone.size < 2 ? 'Haz más pruebas antes de decidir.' : ''}` });
  if (ok && testsDone.size === 0) notes.push({ good: false, text: 'Acertaste sin hacer ninguna prueba: en un taller real hay que verificar, no adivinar.' });
  const score = ok ? (testsDone.size === 0 ? 70 : 100) : 0;
  return { score, notes };
}

export function scoreProcess(mission, pid) {
  const p = mission.processes.find(x => x.id === pid);
  const best = mission.processes.reduce((a, b) => (b.score > a.score ? b : a));
  const notes = [{ good: p.score >= 80, text: p.why }];
  if (p.score < 100) notes.push({ good: true, text: `La mejor elección: ${PROCESSES[best.id].name}. ${best.why}` });
  return { score: p.score, notes };
}

export function scoreCons(mission, pid, cons) {
  const groups = consumableGroups(mission, pid);
  let sum = 0; const notes = [];
  for (const g of groups) {
    const o = g.options.find(x => x.id === cons[g.id]) || g.options[0];
    sum += o.score;
    notes.push({ good: o.score >= 80, text: `${g.label}: ${o.name} — ${o.why}` });
    if (o.score < 80) {
      const best = g.options.reduce((a, b) => (b.score > a.score ? b : a));
      notes.push({ good: true, text: `Mejor opción: ${best.name}. ${best.why}` });
    }
  }
  return { score: groups.length ? sum / groups.length : 50, notes };
}

export function prepRequired(item, ctx) {
  if (item.kind !== 'required') return false;
  return item.requiredIf ? !!item.requiredIf(ctx) : true;
}

export function scorePrep(mission, ctx, done) {
  let req = 0, reqDone = 0, harm = 0, good = 0; const notes = [];
  for (const it of mission.prep) {
    const isReq = prepRequired(it, ctx);
    const did = done.has(it.id);
    if (isReq) { req++; if (did) { reqDone++; notes.push({ good: true, text: `✔ ${it.label}` }); } else notes.push({ good: false, text: `Faltó: ${it.label}. ${it.why}` }); }
    else if (it.kind === 'harmful' && did) { harm++; notes.push({ good: false, text: `No debiste: ${it.label}. ${it.why}` }); }
    else if (it.kind === 'good' && did) { good++; notes.push({ good: true, text: `Buena práctica: ${it.label}. ${it.why}` }); }
    else if (it.kind === 'neutral' && did) notes.push({ good: true, text: `${it.label}: ${it.why}` });
  }
  const score = clamp((req ? (reqDone / req) * 95 : 95) + good * 5 - harm * 25, 0, 100);
  return { score, notes };
}

function inWin(v, w) { if (!w || !w.length) return false; return typeof w[0] === 'string' ? w.includes(v) : v >= w[0] && v <= w[1]; }

export function scoreParams(mission, pid, params, ctx) {
  const wins = paramWindows(mission, pid, ctx);
  const notes = []; let sum = 0, n = 0;
  for (const d of paramDefsFor(pid)) {
    const w = wins[d.id]; const v = params[d.id];
    let s;
    if (inWin(v, w.ideal)) { s = 100; notes.push({ good: true, text: `${d.label}: ${v} ${d.unit} — en la ventana ideal.` }); }
    else if (inWin(v, w.ok)) { s = 65; notes.push({ good: true, text: `${d.label}: ${v} ${d.unit} — aceptable (ideal ${fmtWin(w.ideal, d)}).` }); }
    else { s = 10; notes.push({ good: false, text: `${d.label}: ${v} ${d.unit} — fuera de rango (ideal ${fmtWin(w.ideal, d)}).` }); }
    sum += s; n++;
  }
  return { score: n ? sum / n : 50, notes };
}

export function fmtWin(w, d) {
  if (!w) return '';
  if (typeof w[0] === 'string') return w.join(' / ');
  return `${+w[0].toFixed(1)}–${+w[1].toFixed(1)} ${d.unit}`;
}

// Factor de aporte térmico de los parámetros (1 = ideal)
export function paramHeat(mission, pid, params, ctx) {
  const wins = paramWindows(mission, pid, ctx);
  let h = 1;
  for (const d of paramDefsFor(pid)) {
    if (!d.heat || d.options) continue;
    const m = mid(wins[d.id].ideal);
    h *= Math.pow(clamp(params[d.id], 0.01, 1e6) / m, d.heat);
  }
  return h;
}

// Problemas de parámetros fuera de la ventana aceptable
function paramIssues(mission, pid, params, ctx) {
  const wins = paramWindows(mission, pid, ctx);
  const list = [];
  for (const d of paramDefsFor(pid)) {
    const w = wins[d.id]; const v = params[d.id];
    if (d.id === 'vac') {
      const idx = d.options.indexOf(v);
      if (idx <= 0) list.push({ type: 'oxidacion', label: 'Vacío pobre: titanio contaminado', location: 'superficial', sev: 0.95 }, { type: 'porosidad', label: 'Porosidad por gases residuales', location: 'interna', sev: 0.8 });
      else if (idx === 1) list.push({ type: 'oxidacion', label: 'Vacío insuficiente: coloración', location: 'superficial', sev: 0.6 }, { type: 'porosidad', label: 'Porosidad por gases residuales', location: 'interna', sev: 0.45 });
      else if (idx === 2) list.push({ type: 'oxidacion', label: 'Ligera coloración paja', location: 'superficial', sev: 0.15 });
      continue;
    }
    if (d.options && w.bad && w.bad[v]) { list.push({ ...w.bad[v] }); continue; }
    if (d.options || !d.issues) continue;
    const ok = w.ok?.length ? w.ok : w.ideal;
    if (v < ok[0] && d.issues.low) list.push({ ...d.issues.low, sev: clamp((ok[0] - v) / (ok[1] - ok[0] + 1e-6) + 0.35, 0.3, 1) });
    if (v > ok[1] && d.issues.high) list.push({ ...d.issues.high, sev: clamp((v - ok[1]) / (ok[1] - ok[0] + 1e-6) + 0.35, 0.3, 1) });
  }
  return list;
}

// ---------------------------------------------------------------------
//  Construcción del resultado físico a partir de la ejecución
// ---------------------------------------------------------------------
const BEAD = { bici: [6, 1.2], mercado: [10, 2.2], puente: [16, 2.0], lecheria: [5.5, 0.9], avion: [2.6, 0.5] };

export function buildResult(st) {
  const { mission, pid, params, cons, prepDone, execs } = st;
  const ctx = { cons };
  const mat = MATERIALS[mission.material];
  const fam = familyOf(pid);
  const t = mission.thicknessMm;
  const N = 60;
  const rand = rng(mission.id + pid + JSON.stringify(params) + (execs?.length || 0));
  const pHeat = paramHeat(mission, pid, params, ctx);
  const sw = speedWindow(mission, pid, params, st.pos);
  const vMid = mid(sw);
  const [w0, r0] = BEAD[mission.id] || [8, 1.5];
  const tol = mission.exec.lateralTol;
  const fullPen = mission.joint !== 'filete';
  const defects = [];
  const add = (type, s0, s1, sev, location, label) => defects.push({ type, s0: clamp(s0, 0, 1), s1: clamp(s1, 0, 1), severity: clamp(sev, 0, 1), location, label: label || DEFECT_NAMES[type] });

  const passes = execs.map(e => e.samples);
  const binsPerPass = passes.map((samples, pi) => {
    const L = mission.lengthMm;
    const bins = Array.from({ length: N }, (_, i) => ({ s: (i + 0.5) / N, n: 0, speed: 0, sp2: 0, lat: 0, latMax: 0, so: 0, dabs: 0, mm: 0 }));
    for (const smp of samples) {
      if (!smp.arc) continue;
      const sNorm = smp.s / L;
      if (sNorm < 0 || sNorm >= 1) continue;
      const b = bins[Math.min(N - 1, Math.floor(sNorm * N))];
      b.n++; b.speed += smp.v; b.sp2 += smp.v * smp.v; b.lat += smp.lat; b.latMax = Math.max(b.latMax, Math.abs(smp.lat)); b.so += smp.so; b.mm += smp.ds || 0; if (smp.dab) b.dabs++;
    }
    // ritmo de varilla suavizado en una ventana de ~3 toques
    const win = Math.max(1, Math.round((3 * (mission.exec.dabEveryMm || 3)) / (L / N) / 2));
    const dabSm = bins.map((_, i) => { let d = 0, mm = 0; for (let k = Math.max(0, i - win); k <= Math.min(N - 1, i + win); k++) { d += bins[k].dabs; mm += bins[k].mm; } return { d, mm }; });
    return bins.map((b, bi) => {
      if (b.n < 2 || b.mm < (L / N) * 0.35) return { s: b.s, welded: false, h: 0, lateral: 0, beadWidthMm: 0, reinforcementMm: 0, penetration: 0, pass: pi };
      const v = Math.max(0.05, b.speed / b.n);
      const sd = Math.sqrt(Math.max(0, b.sp2 / b.n - v * v));
      const so = b.so / b.n;
      let soEff = 1;
      if (fam === 'MIG') soEff = 1 - 0.3 * (so - 1);
      else if (fam === 'TIG' || fam === 'SMAW' || fam === 'OAW') soEff = 1 - 0.12 * (so - 1);
      const vFactor = (fam === 'EBW' || fam === 'AUTO') ? 1 : Math.pow(vMid / v, 0.85);
      const h = clamp(pHeat * vFactor * soEff, 0, 3);
      let dabRatio = 1;
      if (fam === 'TIG' && mission.exec.dabEveryMm) dabRatio = (dabSm[bi].d * mission.exec.dabEveryMm) / Math.max(0.1, dabSm[bi].mm);
      let reinf = r0 * Math.pow(vMid / v, 0.5) * (fam === 'TIG' ? clamp(0.25 + 0.75 * dabRatio, -0.3, 2.2) : 1);
      if (fam === 'TIG' && dabRatio < 0.35) reinf = -r0 * 0.4;
      return { s: b.s, welded: true, h, v, sd, so, dabRatio, lateral: b.lat / b.n, latMax: b.latMax, beadWidthMm: w0 * Math.sqrt(h) * (1 + 0.15 * (so - 1)), reinforcementMm: reinf, penetration: clamp(h * (fullPen ? 1.02 : 0.6), 0, 1.3), pass: pi };
    });
  });

  // Combinar pasadas: la raíz manda en penetración; la última en la superficie
  const bins = binsPerPass[binsPerPass.length - 1].map((b, i) => {
    const root = binsPerPass[0][i];
    const welded = binsPerPass.every(p => p[i].welded);
    return { ...b, welded, penetration: root.welded ? root.penetration : 0 };
  });

  // --- Defectos por tramo, generados por la ejecución -----------------
  const runDefects = (pBins, pi) => {
    const isRoot = pi === 0, isCap = pi === passes.length - 1;
    const locIn = passes.length > 1 && !isCap ? 'interna' : 'interna';
    pBins.forEach((b, i) => {
      const s0 = i / N, s1 = (i + 1) / N;
      if (!b.welded) { add('sin_soldar', s0, s1, 1, isCap ? 'superficial' : 'interna'); return; }
      if (b.h < 0.72) add('falta_fusion', s0, s1, (0.72 - b.h) / 0.3 + 0.3, locIn);
      if (fullPen && isRoot && b.h < 0.86) add('falta_penetracion', s0, s1, (0.86 - b.h) / 0.3 + 0.3, 'raiz');
      if (t <= 3 && b.h > 1.42) add('perforacion', s0, s1, (b.h - 1.42) / 0.3 + 0.4, 'superficial');
      else if (b.h > 1.3 && isCap) add('socavado', s0, s1, (b.h - 1.3) / 0.3 + 0.3, 'superficial');
      if (b.h > 1.6 && t <= 3) add('deformacion', s0, s1, 0.5, 'superficial');
      if (fam === 'EBW' && b.h > 1.35) add('spiking', s0, s1, (b.h - 1.35) / 0.3 + 0.3, 'raiz');
      const lat = Math.max(Math.abs(b.lateral), b.latMax * 0.8);
      if (lat > tol) add(fam === 'EBW' || fam === 'AUTO' ? 'desalineacion_haz' : 'falta_fusion', s0, s1, (lat - tol) / tol + 0.35, 'interna', fam === 'EBW' ? 'Haz fuera de la junta' : 'Falta de fusión lateral (antorcha fuera de la junta)');
      if (fam === 'TIG' || fam === 'SMAW' || fam === 'MIG' || fam === 'OAW') {
        if (b.so > 1.75) add('porosidad', s0, s1, (b.so - 1.75) / 0.8 + 0.35, 'interna', 'Porosidad por arco largo');
        if (fam === 'SMAW' && b.so > 1.6) add('salpicaduras', s0, s1, 0.4, 'superficial');
        if (fam === 'TIG' && b.so < 0.42) add('inclusion_tungsteno', s0, s1, 0.7, 'interna');
        if (fam === 'SMAW' && b.so < 0.4) add('inclusion', s0, s1, 0.5, 'interna', 'Electrodo pegado: escoria atrapada');
        if (b.v > 0 && b.sd / b.v > 0.45) add('irregular', s0, s1, 0.3, 'superficial');
      }
      if (fam === 'TIG' && isCap && mission.exec.dabEveryMm) {
        if (b.dabRatio < 0.45) add('concavidad', s0, s1, (0.45 - b.dabRatio) + 0.35, 'superficial', 'Falta de relleno (poca varilla)');
        else if (b.dabRatio > 2.4) add('falta_fusion', s0, s1, 0.4, 'superficial', 'Solape frío (exceso de varilla)');
      }
    });
  };
  binsPerPass.forEach((pb, pi) => runDefects(pb, pi));

  // --- Defectos globales: preparación, consumibles, proceso, parámetros
  const scatter = (d, count) => {
    for (let k = 0; k < count; k++) {
      const c = 0.08 + rand() * 0.84; const len = 0.03 + rand() * 0.1 * (d.sev || 0.5);
      add(d.type, c - len / 2, c + len / 2, (d.sev ?? 0.6) * (0.75 + rand() * 0.35), d.location || 'interna', d.label);
    }
  };
  const log = st.incidentLog || [];
  const fixed = new Set(log.filter(l => l.ok && l.fixPrep).map(l => l.fixPrep));
  for (const it of mission.prep) {
    const did = prepDone.has(it.id);
    if (!did && prepRequired(it, ctx) && it.missing && !it.effect && !fixed.has(it.id)) scatter(it.missing, it.missing.type === 'deformacion' ? 1 : 2);
    if (did && it.kind === 'harmful' && it.defect) scatter(it.defect, 2);
  }
  for (const g of consumableGroups(mission, pid)) {
    const o = g.options.find(x => x.id === cons[g.id]);
    if (o?.defect) scatter(o.defect, 2);
  }
  const proc = mission.processes.find(p => p.id === pid);
  for (const f of proc.forced || []) scatter(f, 2);
  if (proc.score < 30 && !(proc.forced || []).length) scatter({ type: 'falta_fusion', label: 'Proceso inadecuado para la pieza', location: 'interna', sev: 0.7 }, 2);
  for (const iss of paramIssues(mission, pid, params, ctx)) scatter(iss, iss.type === 'oxidacion' ? 1 : 2);
  if (st.bevel?.defect) scatter(st.bevel.defect, 2);
  if (st.pos && st.pos.score < 30) scatter({ type: 'falta_fusion', label: `Posición inadecuada (${st.pos.id})`, location: 'interna', sev: 0.5 }, 2);
  for (const l of log) {
    const d = l.defect; if (!d) continue;
    if (!l.ok) add(d.type, l.at, Math.min(1, l.at + 0.35), d.sev, d.location, d.label);
    else if (l.partial) add(d.type, l.at, Math.min(1, l.at + 0.12), d.sev * 0.5, d.location, d.label);
    else if (l.fixPrep && l.at > 0.05) add(d.type, 0, l.at, d.sev * 0.6, d.location, d.label);
  }

  // EBW: rampa de salida y cupón
  const last = execs[execs.length - 1];
  if (fam === 'EBW' || fam === 'AUTO') {
    if (last.slope === 'none') add('crater', 0.97, 1, 0.85, 'superficial', 'Cráter/agujero de keyhole al cortar el haz sin rampa');
    else if (last.slope === 'early') add('sin_soldar', clamp(last.slopeAt, 0, 1), 1, 0.9, 'interna', 'Tramo final sin solape (rampa demasiado pronto)');
  }
  if (fam === 'SMAW' || fam === 'TIG' || fam === 'MIG') {
    if (last.endCrater) add('crater', 0.96, 1, 0.45, 'superficial', 'Cráter final sin rellenar');
  }

  // Coloración (heat tint)
  let heatTint = 0.15;
  if (mat.id === 'ss316l') heatTint = 0.25 + Math.max(0, avg(bins.map(b => b.h)) - 1) * 0.8;
  if (mat.id === 'ti64') heatTint = fam === 'EBW' ? 0.02 : 0.6;
  for (const d of defects) if (d.type === 'oxidacion') heatTint = Math.max(heatTint, 0.3 + d.severity * 0.7);
  heatTint = clamp(heatTint, 0, 1);

  const merged = mergeDefects(defects);
  return {
    material: { id: mat.id, name: mat.name, ferromagnetic: mat.ferromagnetic, color: mat.color },
    process: pid, thicknessMm: t, joint: mission.joint, lengthMm: mission.lengthMm, passes: passes.length,
    heatTint, bins, defects: merged,
  };
}

const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

function mergeDefects(list) {
  const byKey = {};
  for (const d of list) (byKey[d.type + '|' + d.location + '|' + d.label] ||= []).push(d);
  const out = [];
  for (const arr of Object.values(byKey)) {
    arr.sort((a, b) => a.s0 - b.s0);
    let cur = null;
    for (const d of arr) {
      if (cur && d.s0 <= cur.s1 + 0.02) { cur.s1 = Math.max(cur.s1, d.s1); cur.severity = Math.max(cur.severity, d.severity); }
      else { if (cur) out.push(cur); cur = { ...d }; }
    }
    if (cur) out.push(cur);
  }
  out.forEach((d, i) => d.id = i + 1);
  return out.sort((a, b) => a.s0 - b.s0);
}

// ---------------------------------------------------------------------
export function isCritical(mission, d) {
  if (!mission.critical.includes(d.type)) return false;
  if (d.type === 'porosidad') return d.severity > (mission.id === 'avion' ? 0.25 : 0.45);
  if (d.type === 'oxidacion') return d.severity > 0.3;
  if (d.type === 'deformacion') return d.severity > 0.45;
  if (d.type === 'socavado') return d.severity > 0.6;
  return d.severity > 0.2;
}

export function scoreExec(mission, result, execs) {
  const execTypes = ['sin_soldar', 'falta_fusion', 'falta_penetracion', 'perforacion', 'socavado', 'desalineacion_haz', 'spiking', 'concavidad', 'irregular', 'inclusion_tungsteno', 'crater', 'salpicaduras'];
  const bins = result.bins;
  let bad = 0;
  for (const b of bins) {
    if (!b.welded) { bad += 1; continue; }
    let pen = 0;
    if (b.h < 0.8 || b.h > 1.3) pen += 0.6; else if (b.h < 0.9 || b.h > 1.15) pen += 0.25;
    if (Math.abs(b.lateral) > mission.exec.lateralTol) pen += 0.5;
    if (b.so && (b.so > 1.6 || b.so < 0.5)) pen += 0.3;
    bad += Math.min(1, pen);
  }
  let score = 100 * (1 - bad / bins.length);
  const notes = [];
  const hs = bins.filter(b => b.welded).map(b => b.h);
  const hAvg = avg(hs);
  if (bins.some(b => !b.welded)) notes.push({ good: false, text: 'Quedaron tramos sin soldar: completa toda la junta.' });
  if (hAvg < 0.85) notes.push({ good: false, text: 'Aporte de calor bajo: avanzaste demasiado rápido o con poca energía → falta de fusión/penetración.' });
  else if (hAvg > 1.2) notes.push({ good: false, text: 'Aporte de calor alto: avanzaste demasiado lento o con mucha energía → socavado, perforación o deformación.' });
  else notes.push({ good: true, text: `Aporte térmico medio correcto (factor ${hAvg.toFixed(2)}).` });
  const latBad = bins.filter(b => b.welded && Math.abs(b.lateral) > mission.exec.lateralTol).length;
  if (latBad) notes.push({ good: false, text: `${latBad} tramos fuera de la junta (tolerancia ±${mission.exec.lateralTol} mm).` });
  else notes.push({ good: true, text: 'Mantuviste el arco/haz centrado sobre la junta.' });
  const last = execs[execs.length - 1];
  if (last.slope === 'ok') notes.push({ good: true, text: 'Rampa de salida del haz ejecutada en la zona de solape.' });
  if (last.slope === 'none') { score -= 15; notes.push({ good: false, text: 'No hiciste la rampa de salida: el keyhole colapsó dejando un cráter.' }); }
  if (last.slope === 'early') { score -= 15; notes.push({ good: false, text: 'Rampa de salida demasiado pronto: la circunferencia no quedó cerrada.' }); }
  if (last.endCrater) notes.push({ good: false, text: 'No rellenaste el cráter final (mantén la antorcha un instante al terminar).' });
  for (const l of execs.incidentLog || []) {
    if (l.ok && !l.partial) notes.push({ good: true, text: `Incidente "${l.title}": bien resuelto. ${l.why}` });
    else if (l.ok) { score -= 5; notes.push({ good: true, text: `Incidente "${l.title}": solución parcial. ${l.why}` }); }
    else { score -= 20; notes.push({ good: false, text: `Incidente "${l.title}": mal resuelto. ${l.why}` }); }
  }
  if (last.interpassViol) { score -= 10; notes.push({ good: false, text: 'Iniciaste una pasada con la pieza por encima de 250 °C.' }); }
  const execDefects = result.defects.filter(d => execTypes.includes(d.type)).length;
  if (!execDefects) notes.push({ good: true, text: 'Ejecución limpia: sin defectos atribuibles a la técnica.' });
  return { score: clamp(score, 0, 100), notes };
}

export function scoreInspection(mission, methods, detected, decision, result) {
  const notes = [];
  const best = mission.ndt.best, waste = mission.ndt.waste;
  const cov = best.filter(m => methods.includes(m)).length / best.length;
  const wasted = methods.filter(m => waste.includes(m));
  const criticals = result.defects.filter(d => isCritical(mission, d));
  const foundIds = new Set(detected.map(d => d.id));
  const critFound = criticals.filter(d => foundIds.has(d.id));
  const critHidden = criticals.filter(d => !foundIds.has(d.id));
  let score = 55 * cov - 10 * wasted.length;
  notes.push({ good: cov === 1, text: cov === 1 ? `Elegiste los ensayos adecuados (${best.join(' + ')}).` : `Ensayos recomendados: ${best.join(' + ')}. ${mission.ndt.notes}` });
  if (wasted.length) notes.push({ good: false, text: `Ensayos poco útiles aquí: ${wasted.join(', ')} (tiempo y dinero perdidos).` });
  if (decision === 'aprobar') {
    if (critFound.length) { notes.push({ good: false, text: `Aprobaste la pieza aun cuando tus propios ensayos mostraron ${critFound.length} defecto(s) rechazable(s).` }); }
    else if (critHidden.length) { score += 10; notes.push({ good: false, text: `Había ${critHidden.length} defecto(s) rechazable(s) que tus ensayos no podían detectar.` }); }
    else { score += 45; notes.push({ good: true, text: 'Decisión correcta: la soldadura cumple el criterio de aceptación.' }); }
  } else {
    if (criticals.length) { score += 45; notes.push({ good: true, text: 'Decisión correcta: rechazar y reparar una soldadura defectuosa.' }); }
    else { score += 20; notes.push({ good: false, text: 'Rechazaste una soldadura aceptable: reparar innecesariamente cuesta tiempo y puede empeorarla.' }); }
  }
  return { score: clamp(score, 0, 100), notes, criticals, critFound, critHidden };
}

export function finalScore(stageScores, delivered, criticalsDelivered) {
  let total = 0;
  for (const s of STAGES) total += (stageScores[s.id]?.score ?? 0) * s.weight / 100;
  let outcome = 'ok';
  if (delivered && criticalsDelivered > 0) { outcome = 'fail'; total = Math.min(total, 40); }
  const stars = outcome === 'fail' ? 0 : total >= 85 ? 3 : total >= 65 ? 2 : total >= 45 ? 1 : 0;
  return { total: Math.round(total), stars, outcome };
}

export { MISSIONS };
