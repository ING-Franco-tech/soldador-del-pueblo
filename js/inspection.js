import { DEFECT_NAMES } from './data.js';

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const num = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const list = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
const fmt = n => n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
const always = () => ({ ok: true, reason: '' });
const availability = (ok, reason) => ({ ok, reason: ok ? '' : reason });
const method = (id, name, icon, minutes, cost, description, applicable = always) =>
  ({ id, name, short: id, icon, minutes, cost, description, applicable });

export const INSPECTION_METHODS = {
  VT: method('VT', 'Inspección visual', '🔍', 3, 5, 'Revela discontinuidades visibles y cambios en el perfil del cordón. Requiere acceso e iluminación en la superficie.'),
  PT: method('PT', 'Líquidos penetrantes', '🧪', 15, 20, 'El revelador extrae el tinte retenido en discontinuidades abiertas a la superficie. Requiere una superficie limpia y no porosa.'),
  MT: method('MT', 'Partículas magnéticas', '🧲', 12, 30, 'Las partículas se acumulan en fugas del campo magnético causadas por discontinuidades superficiales o cercanas a la superficie.', r => availability(r?.material?.ferromagnetic === true, 'Se requiere un material ferromagnético.')),
  UT: method('UT', 'Ultrasonido', '📡', 20, 55, 'Los ecos localizan reflectores internos y permiten estimar su profundidad. En espesores pequeños se solapan los ecos.', r => availability(num(r?.thicknessMm) >= 6, 'El ultrasonido requiere un espesor de al menos 6 mm para una lectura fiable.')),
  RT: method('RT', 'Radiografía', '🎞', 35, 120, 'La película registra variaciones de espesor y densidad. La orientación puede ocultar discontinuidades planas.'),
  MACRO: method('MACRO', 'Macroataque (cupón)', '🔬', 25, 45, 'Ensayo destructivo sobre un cupón testigo o una sección cortada. Revela la geometría de fusión y permite medir la penetración.'),
  HIDRO: method('HIDRO', 'Prueba hidrostática', '💧', 15, 35, 'Una retención de presión con agua revela fugas. Solo se ofrece para juntas circunferenciales o piezas de acero inoxidable 316L.', r => availability(r?.joint === 'circunferencial' || r?.material?.id === 'ss316l', 'La prueba requiere una junta circunferencial o acero inoxidable 316L.')),
};

const vt = ['porosidad', 'socavado', 'perforacion', 'oxidacion', 'sobreespesor', 'concavidad', 'deformacion', 'crater', 'salpicaduras', 'sin_soldar', 'irregular', 'desalineacion_haz'];
const pt = ['grieta', 'porosidad', 'falta_fusion', 'crater', 'socavado', 'inclusion', 'perforacion', 'sin_soldar'];
const mt = ['grieta', 'falta_fusion', 'porosidad', 'inclusion', 'sin_soldar'];
const ut = ['falta_fusion', 'falta_penetracion', 'grieta', 'desalineacion_haz', 'sin_soldar', 'spiking'];
const rt = ['porosidad', 'inclusion', 'inclusion_tungsteno', 'falta_penetracion', 'perforacion', 'sin_soldar', 'spiking', 'desalineacion_haz', 'concavidad'];
const macro = ['falta_penetracion', 'desalineacion_haz', 'spiking', 'porosidad'];
const rules = {
  VT: (t, l, v) => t === 'sin_soldar' || t === 'perforacion' || l === 'superficial' && (vt.includes(t) || t === 'grieta' && v > .5),
  PT: (t, l) => l === 'superficial' && pt.includes(t),
  MT: (t, l, v) => (l === 'superficial' || l === 'interna' && v > .6) && mt.includes(t),
  UT: (t, l, v) => ut.includes(t) || v > .6 && ['porosidad', 'inclusion'].includes(t),
  RT: (t, l, v) => rt.includes(t) || v > .5 && ['grieta', 'falta_fusion'].includes(t),
  MACRO: (t, l, v, d) => (num(d.s0, 1) <= .5 && num(d.s1) >= .5) || v > .3 && macro.includes(t),
  HIDRO: (t, l, v) => ['perforacion', 'sin_soldar'].includes(t) || t === 'grieta' && v > .4 || ['porosidad', 'falta_penetracion'].includes(t) && v > .7,
};
const interval = d => [clamp(num(d.s0, .5)), clamp(num(d.s1, num(d.s0, .5)))];
const center = d => { const [a, b] = interval(d); return (a + b) / 2; };
const label = d => d.label || (Object.hasOwn(DEFECT_NAMES, d.type) ? DEFECT_NAMES[d.type] : 'Discontinuidad');
const length = r => Math.max(0, num(r?.lengthMm));
const thickness = r => Math.max(0, num(r?.thicknessMm));

function section(r) {
  const bin = list(r?.bins).reduce((best, b) =>
    Math.abs(num(b.s, 2) - .5) < Math.abs(num(best?.s, 2) - .5) ? b : best, null);
  const fraction = clamp(num(bin?.penetration));
  return { bin, fraction, mm: fraction * thickness(r) };
}

export function detect(methodId, result) {
  const defects = list(result?.defects);
  const methodInfo = Object.hasOwn(INSPECTION_METHODS, methodId) && INSPECTION_METHODS[methodId];
  const check = methodInfo ? methodInfo.applicable(result) : { ok: false, reason: 'Método de inspección desconocido.' };
  if (!check.ok) return { found: [], missed: defects, notes: [check.reason] };

  const found = [], missed = [];
  for (const d of defects) {
    const match = rules[methodId](d.type, d.location, num(d.severity), d);
    (match ? found : missed).push(d);
  }
  if (methodId === 'HIDRO') return {
    found, missed,
    notes: [found.length ? `FUGA DETECTADA · ${found.length} ${found.length === 1 ? 'indicación' : 'indicaciones'}` : 'SIN FUGAS'],
  };
  const notes = found.map(d => {
    const [a, b] = interval(d);
    return `${label(d)} · ${fmt(Math.abs(b - a) * length(result))} mm a ${fmt(center(d) * 100)} % de la longitud.`;
  });
  if (methodId === 'MACRO') {
    const { bin, mm, fraction } = section(result);
    notes.unshift(bin && thickness(result) > 0
      ? `Penetración en el centro: ${fmt(mm)} mm (${fraction >= .95 ? 'completa' : 'incompleta'}).`
      : 'Penetración sin datos de medición en el centro.');
  } else if (!notes.length) notes.push('Sin indicaciones detectadas.');
  return { found, missed, notes };
}

function randomFor(defects) {
  let seed = 2166136261;
  const key = defects.map(d => [d.id, d.type, d.s0, d.s1, d.severity, d.location].join('|')).join(';');
  for (const ch of key) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function line(c, points, color, width = 1) {
  c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}

function oval(c, x, y, rx, ry, color) {
  c.beginPath();
  c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2);
  c.fillStyle = color;
  c.fill();
}

function text(c, value, x, y, color = '#deebf3', size = 13, align = 'left', maxWidth) {
  c.fillStyle = color;
  c.font = `${size}px system-ui, sans-serif`;
  c.textAlign = align;
  c.textBaseline = 'alphabetic';
  if (maxWidth > 0) c.fillText(value, x, y, maxWidth);
  else c.fillText(value, x, y);
}

function gradient(c, y, height, stops) {
  const g = c.createLinearGradient(0, y, 0, y + height);
  for (const [position, color] of stops) g.addColorStop(position, color);
  return g;
}

function grain(c, random, x, y, w, h, count, brushed = false) {
  for (let i = 0; i < count; i++) {
    const px = random() * w, py = random() * h;
    c.fillStyle = random() < .5 ? 'rgba(255,255,255,.09)' : 'rgba(0,0,0,.13)';
    c.fillRect(x + px, y + py, Math.min(w - px, 1 + random() * (brushed ? 92 : 2)), brushed ? .65 : 1);
  }
}

function ruler(c, x, y, w, span, unit = 'mm') {
  line(c, [[x, y], [x + w, y]], '#69808f');
  for (let i = 0; i <= 10; i++) {
    const px = x + w * i / 10;
    line(c, [[px, y], [px, y + (i % 2 ? 4 : 8)]], '#90a6b4');
    if (!(i % 2)) text(c, fmt(span * i / 10), px, y + 23, '#b4c7d3', 11, 'center');
  }
  text(c, unit, x + w + 9, y + 23, '#b4c7d3', 11);
}

function surface(c, mode, r, found, random) {
  const film = mode === 'RT', visual = mode === 'VT';
  const x = 36, y = 65, w = 828, h = 218, cy = y + h * .51;
  const steel = ['a36', 's355'].includes(r?.material?.id);
  const aluminum = r?.material?.id === 'al6061';
  const reactive = ['ss316l', 'ti64'].includes(r?.material?.id);
  const base = /^#[0-9a-f]{6}$/i.test(r?.material?.color ?? '') ? r.material.color : '#8d969d';
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = film ? '#2d394a' : visual ? base : '#dadcda';
  c.fillRect(x, y, w, h);
  c.fillStyle = gradient(c, y, h, [[0, '#0007'], [.24, '#fff2'], [.52, '#ffffff03'], [.78, '#ffffff21'], [1, '#0008']]);
  c.fillRect(x, y, w, h);
  grain(c, random, x, y, w, h, 7200, visual);

  const bins = list(r?.bins);
  const mm = clamp(length(r) ? w / length(r) : 4, 1.1, 13);
  const samples = bins.map((b, i) => ({
    b, x: x + w * (i + .5) / bins.length,
    y: cy + clamp(num(b.lateral) * mm, -46, 46),
    half: clamp(num(b.beadWidthMm, 5) * mm * .5, 2, 61),
  }));
  const at = s => samples[Math.min(samples.length - 1, Math.floor(clamp(s) * samples.length))] || { y: cy, half: 13 };
  if (!film) line(c, [[x, cy], [x + w, cy]], visual ? '#161b20bd' : '#8e9492', 2);

  const step = w / Math.max(1, samples.length);
  const tint = clamp(num(r?.heatTint)) * (reactive ? 1 : .48);
  samples.forEach((p, i) => {
    if (p.b.welded === false) return;
    const next = samples[i + 1];
    const blend = next && next.b.welded !== false ? next : p;
    for (let offset = 0; offset < step; offset += 1) {
      const f = clamp(offset / step + .5);
      const yy = p.y + (blend.y - p.y) * (f - .5) * 2;
      const half = p.half + (blend.half - p.half) * (f - .5) * 2;
      const px = p.x - step / 2 + offset;
      if (visual) {
        const spread = half * (.4 + tint * .34) + 5;
        c.fillStyle = gradient(c, yy - half - spread, 2 * (half + spread), [
          [0, '#ffffff00'], [.09, `rgba(209,177,94,${tint * .7})`],
          [.18, `rgba(151,87,59,${tint * .85})`], [.25, `rgba(60,75,125,${tint})`],
          [.35, aluminum ? '#22252c85' : '#30353b63'], [.65, aluminum ? '#22252c85' : '#30353b63'],
          [.75, `rgba(60,75,125,${tint})`], [.82, `rgba(151,87,59,${tint * .85})`],
          [.91, `rgba(209,177,94,${tint * .7})`], [1, '#ffffff00'],
        ]);
        c.fillRect(px, yy - half - spread, 1.06, 2 * (half + spread));
      }
      const concave = num(p.b.reinforcementMm) < 0;
      const crown = clamp(.14 + num(p.b.reinforcementMm) * .16, .09, .65);
      const light = concave ? '#646c75' : `rgba(235,242,246,${crown})`;
      const metal = steel ? '#4c535a' : '#868d93';
      const stops = film
        ? [[0, '#566278'], [.22, '#8896a6'], [.52, '#a7b0bd'], [1, '#536177']]
        : visual ? [[0, '#30343a'], [.15, metal], [.4, metal], [.47, light], [.67, metal], [1, '#22272d']]
          : [[0, '#c0c6c4'], [.25, '#f2f2ec'], [.6, '#fbfaf4'], [1, '#acaeaa']];
      c.fillStyle = gradient(c, yy - half, half * 2, stops);
      c.fillRect(px, yy - half, 1.06, half * 2);
    }
  });

  if (visual) {
    for (let px = 4; px < w; px += 3.5 + random() * 3) {
      const p = at(px / w);
      if (!p.b || p.b.welded === false) continue;
      const half = p.half * .93, bend = 2 + Math.min(7, half * .2);
      c.beginPath();
      c.moveTo(x + px - bend, p.y - half);
      c.quadraticCurveTo(x + px + bend * 2, p.y, x + px - bend, p.y + half);
      c.strokeStyle = '#15191d68'; c.lineWidth = 1.4; c.stroke();
      c.translate(-1, 0); c.strokeStyle = '#f5fafa66'; c.lineWidth = .7; c.stroke(); c.translate(1, 0);
    }
  }
  grain(c, random, x, y, w, h, film ? 16000 : mode === 'MT' ? 11000 : 3700);
  if (film) {
    text(c, 'SDP  ·  PELÍCULA 01', x + 17, y + 28, '#d4deeb', 15);
    text(c, 'IQI', x + w - 25, y + h - 51, '#d0d8e6', 11, 'right');
    for (let i = 0; i < 6; i++) line(c, [[x + w - 122, y + h - 41 + 5 * i], [x + w - 24, y + h - 41 + 5 * i]], '#e2e8f1bc', 2.1 - i * .28);
  }

  found.forEach((d, index) => {
    const [a, b] = interval(d);
    const s = center(d), p = at(s), px = x + s * w;
    const run = Math.max(7, w * Math.abs(b - a)), strength = clamp(num(d.severity));
    const ink = mode === 'PT' ? '#9f1238' : film ? '#192637' : '#17191b';
    const toe = d.type === 'socavado' || d.type === 'falta_fusion';
    const py = p.y + (toe ? p.half * .86 : 0);
    const round = ['porosidad', 'perforacion', 'crater', 'salpicaduras', 'inclusion_tungsteno'].includes(d.type);
    if (round) {
      const cluster = ['porosidad', 'salpicaduras'].includes(d.type);
      const count = cluster ? 4 + Math.round(strength * 8) : 1;
      for (let i = 0; i < count; i++) {
        const qx = px + (cluster ? (random() - .5) * run : 0);
        const qy = py + (cluster ? (random() - .5) * p.half * 1.45 : 0);
        const radius = cluster ? 1.3 + random() * (1.5 + 3 * strength) : 4 + strength * 8;
        if (mode === 'PT') oval(c, qx, qy, radius * 2.2, radius * 1.65, '#dc386d37');
        if (visual) oval(c, qx, qy + 1, radius * 1.2, radius * .92, '#d4c7b480');
        oval(c, qx, qy, radius, radius * .78, d.type === 'inclusion_tungsteno' ? '#f7fbff' : ink);
        if (visual && d.type === 'salpicaduras') oval(c, qx - .5, qy - .75, radius * .68, radius * .53, '#aeb3b9');
      }
    } else {
      const points = Array.from({ length: 15 }, (_, i) => {
        const qx = px + run * (i / 14 - .5);
        const jitter = d.type === 'falta_penetracion' ? 0 : (random() - .5) * (d.type === 'grieta' ? 8 : 3);
        return [qx, py + jitter];
      });
      if (mode === 'PT') line(c, points, '#e34e794b', 11 + strength * 7);
      if (mode === 'MT') {
        for (const [qx, qy] of points) {
          for (let i = 0; i < 20; i++) oval(c, qx + (random() - .5) * (run / 13 + 3), qy + (random() - .5) * 10, .65, .55, '#16191db5');
        }
      }
      const band = ['oxidacion', 'concavidad', 'deformacion', 'sobreespesor'].includes(d.type);
      line(c, points, visual && d.type === 'oxidacion' ? '#38365791' : band ? ink + '72' : ink, band ? Math.max(4, p.half * .48) : d.type === 'grieta' ? 1.5 : 2 + strength * 3);
    }
    if (visual) {
      const my = y + 18 + index % 3 * 23;
      line(c, [[px, py - 4], [px, my + 8]], '#f7d291c0');
      oval(c, px, my, 9, 9, '#20272d');
      text(c, String(index + 1), px, my + 4, '#ffe0aa', 11, 'center');
    }
  });
  c.restore();
  ruler(c, x, 297, w, length(r));
  const legend = visual && found.length
    ? found.slice(0, 4).map((d, i) => `${i + 1}  ${label(d)}`).join('   ·   ') + (found.length > 4 ? `   ·   +${found.length - 4}` : '')
    : found.length ? `${found.length} indicaciones` : 'Sin indicaciones detectadas';
  text(c, legend, x, 350, '#e5cfaa', 12, 'left', w);
}

function ultrasound(c, r, found) {
  const y = 88, h = 190, left = 36, right = 459, w = 405;
  c.fillStyle = '#091917'; c.fillRect(left, y, w, h);
  c.fillStyle = '#101f30'; c.fillRect(right, y, w, h);
  text(c, 'A-SCAN · ECO Y PROFUNDIDAD', left, 73, '#a4e9c3');
  text(c, 'C-SCAN · POSICIÓN EN EL CORDÓN', right, 73, '#bbd6ed');
  for (let i = 0; i <= 10; i++) line(c, [[left + w * i / 10, y], [left + w * i / 10, y + h]], '#24463c');
  for (let i = 0; i <= 5; i++) line(c, [[left, y + h * i / 5], [left + w, y + h * i / 5]], '#24463c');
  const depth = d => d.location === 'raiz' ? .92 : d.location === 'superficial' ? .15 : .32 + center(d) * .43;
  const echoes = [[0, .93], [1, .63], ...found.map(d => [depth(d), .12 + clamp(num(d.severity)) * .64])];
  const trace = [], dac = [];
  for (let i = 0; i <= w; i++) {
    const s = i / w;
    let amp = .009 + .013 * Math.abs(Math.sin(i * 2.81) * Math.cos(i * .67));
    for (const [position, magnitude] of echoes) {
      const delta = (s - (.045 + .9 * position)) * 72;
      amp += Math.exp(-(delta ** 2)) * magnitude * (.38 + .62 * Math.abs(Math.cos(delta * 3.6)));
    }
    trace.push([left + i, y + h * (.95 - clamp(amp) * .87)]);
    dac.push([left + i, y + h * (.25 + .55 * (1 - Math.exp(-s * 2.5)))]);
  }
  line(c, dac, '#ff6057', 1.3);
  c.save(); c.shadowColor = '#66fb94'; c.shadowBlur = 6;
  line(c, trace, '#8affe0', 1.5); c.restore();
  text(c, 'DAC', left + w - 8, y + h * .73, '#ff766f', 11, 'right');
  text(c, 'Pared posterior', left + w - 10, y + 24, '#a4e9c3', 11, 'right');
  const bins = list(r?.bins);
  const colors = ['#182844', '#20456f', '#236b91', '#269390', '#4ca58a'];
  bins.forEach((b, i) => {
    const value = clamp(num(b.penetration));
    c.fillStyle = colors[Math.round(value * 4)];
    c.fillRect(right + w * i / bins.length, y + 50, w / bins.length + .3, 90);
  });
  found.forEach(d => {
    const px = right + center(d) * w;
    const [a, b] = interval(d);
    const py = y + 51 + 86 * depth(d);
    const g = c.createRadialGradient(px, py, 0, px, py, 12);
    g.addColorStop(0, '#f6e493'); g.addColorStop(.5, '#f5764bcc'); g.addColorStop(1, '#f5764b00');
    oval(c, px, py, 12, 12, g);
    line(c, [[right + a * w, py], [right + b * w, py]], '#ffc268', 2 + 3 * clamp(num(d.severity)));
  });
  ruler(c, left + w * .045, 297, w * .9, thickness(r));
  ruler(c, right, 297, w, length(r));
}

function crossSection(c, r, found, random) {
  const { bin, fraction, mm } = section(r);
  const x = 450, y = 122, h = 147, t = thickness(r);
  const fillet = r?.joint === 'filete', pipe = r?.joint === 'circunferencial', beam = r?.process === 'EBW';
  const half = beam ? clamp(num(bin?.beadWidthMm, 3) * 5, 14, 30) : clamp(num(bin?.beadWidthMm, 8) * 9, 35, 140);
  const plateHeight = fillet ? h - 55 : h;
  const pen = plateHeight * fraction;
  const crown = clamp(num(bin?.reinforcementMm) * 10, -18, 28);
  c.fillStyle = gradient(c, y - 70, h + 70, [[0, '#727c80'], [.35, '#bdc5c5'], [1, '#666e71']]);
  if (fillet) {
    c.fillRect(104, y + 55, 638, h - 55);
    c.fillRect(x - 90, y - 68, 90, 124);
  } else if (pipe) {
    c.beginPath(); c.moveTo(104, y + 32); c.quadraticCurveTo(x, y - 32, 742, y + 32);
    c.lineTo(742, y + h + 16); c.quadraticCurveTo(x, y + h - 16, 104, y + h + 16);
    c.closePath(); c.fill();
  } else c.fillRect(104, y, 638, h);

  const top = fillet ? y + 55 : y;
  const base = top + pen;
  if (!fillet) {
    const bevel = !pipe && t > 10 ? half * .85 : 2;
    line(c, [[x - bevel, top], [x - 2, y + h - 5], [x - 2, y + h]], '#454b4f', 1.5);
    line(c, [[x + bevel, top], [x + 2, y + h - 5], [x + 2, y + h]], '#454b4f', 1.5);
  }
  const fusion = (offset = 0) => {
    const a = half + offset, stem = half * .66 + offset * .36;
    c.beginPath();
    if (fillet) {
      c.moveTo(x - 2, top - a * .7);
      c.quadraticCurveTo(x + a * .37, top - crown * .5 - a * .23, x + a, top);
      c.quadraticCurveTo(x + a * .38, base, x, base);
      c.quadraticCurveTo(x - a * .22, top, x - 2, top - a * .7);
    } else {
      c.moveTo(x - a, top);
      c.quadraticCurveTo(x, top - 2 * crown, x + a, top);
      if (beam) {
        c.bezierCurveTo(x + stem, top + pen * .12, x + stem, base - pen * .13, x + stem * .74, base - pen * .04);
        c.quadraticCurveTo(x, base + pen * .04, x - stem * .74, base - pen * .04);
        c.bezierCurveTo(x - stem, base - pen * .13, x - stem, top + pen * .12, x - a, top);
      } else {
        c.bezierCurveTo(x + a * .78, top + pen * .67, x + a * .32, base, x, base);
        c.bezierCurveTo(x - a * .32, base, x - a * .78, top + pen * .67, x - a, top);
      }
    }
    c.closePath();
  };
  if (pen > 0 || crown > 0) {
    fusion(beam ? 8 : 19); c.fillStyle = '#927f65'; c.fill();
    fusion(); c.fillStyle = gradient(c, top - 32, h + 32, [[0, '#a7afb2'], [.38, '#60696d'], [1, '#333d42']]); c.fill();
    c.save(); c.clip();
    for (let i = 0; i < 80; i++) {
      const qx = x + (random() - .5) * half * (fillet ? 2.6 : 2.1);
      const qy = top + pen * random();
      line(c, [[qx, qy], [qx + (x - qx) * .28, qy - 11 - random() * 32]], i % 2 ? '#c1c8c44c' : '#18212674', .7);
    }
    c.restore();
  }
  grain(c, random, 104, y + (fillet ? 58 : pipe ? 33 : 0), 638, h - (fillet ? 58 : pipe ? 33 : 0), 6500);
  found.forEach((d, i) => {
    const side = i % 2 ? -1 : 1;
    const qx = x + side * Math.min(half * .42, 7 + 5 * i);
    if (d.type === 'porosidad') oval(c, qx, top + pen * (.21 + random() * .57), 3 + random() * 4, 4, '#202729');
    else if (d.type === 'socavado') oval(c, x + side * half, top + 2, 9, 4, '#222b30');
    else if (d.type === 'falta_penetracion') line(c, [[x, base], [x, Math.max(base + 5, y + h)]], '#151d23', 3);
    else {
      const qy = d.location === 'raiz' ? base : d.location === 'superficial' ? top : top + (base - top) * .56;
      line(c, [[qx - 6, qy - 3], [qx, qy + 2], [qx + 5, qy - 1]], '#202729', 2);
    }
  });
  if (pen > 0) {
    const ax = 775;
    for (const [yy, direction] of [[top, 1], [base, -1]]) {
      line(c, [[747, yy], [ax + 9, yy]], '#efd3a0');
      line(c, [[ax - 4, yy + 6 * direction], [ax, yy], [ax + 4, yy + 6 * direction]], '#efd3a0');
    }
    line(c, [[ax, top], [ax, base]], '#efd3a0');
  }
  text(c, `Penetración · ${bin && t ? fmt(mm) + ' mm' : 'sin medición'}`, 450, 344, '#efd3a0', 16, 'center');
  ruler(c, 104, 297, 638, 638 * t / plateHeight);
  text(c, fillet ? 'UNIÓN EN T' : pipe ? 'PARED DEL TUBO' : t > 10 ? 'JUNTA EN V' : 'JUNTA A TOPE', 104, 93, '#d2e0e8', 13);
}

function pressure(c, leak) {
  const x = 70, y = 115, w = 778, h = 160;
  const green = '#71ebaf', red = '#ff8480', ink = leak ? red : green;
  text(c, leak ? 'FUGA DETECTADA' : 'SIN FUGAS', 450, 89, ink, 27, 'center');
  c.fillStyle = '#132434'; c.fillRect(x, y, w, h);
  for (let i = 0; i <= 4; i++) {
    const py = y + h * i / 4;
    line(c, [[x, py], [x + w, py]], '#314655');
    text(c, `${100 - i * 25} %`, x - 7, py + 4, '#b7c9d7', 11, 'right');
  }
  const ramp = w / 6;
  const points = [[x, y + h], [x + ramp, y]];
  for (let i = 1; i <= 75; i++) {
    const f = i / 75;
    points.push([x + ramp + (w - ramp) * f, y + h * (leak ? .68 * (1 - Math.exp(-1.8 * f)) : 0)]);
  }
  line(c, [[x + ramp, y], [x + ramp, y + h]], '#7c96aa');
  line(c, points, ink, 3);
  ruler(c, x, 297, w, 12, 'min');
  text(c, 'Presión de prueba (%)', x, 102, '#b7c9d7', 12);
  text(c, 'Retención · 10 min', x + w, 346, '#b7c9d7', 12, 'right');
}

export function renderInspection(methodId, result, canvas) {
  const c = canvas?.getContext?.('2d');
  if (!c || !(canvas.width > 0 && canvas.height > 0)) return;
  const info = Object.hasOwn(INSPECTION_METHODS, methodId) ? INSPECTION_METHODS[methodId] : null;
  const reading = detect(methodId, result);
  c.save();
  try {
    c.setTransform(canvas.width / 900, 0, 0, canvas.height / 380, 0, 0);
    c.fillStyle = gradient(c, 0, 380, [[0, '#1d2c38'], [1, '#0e171f']]);
    c.fillRect(0, 0, 900, 380);
    text(c, info?.name || 'Inspección', 36, 34, '#f0f6fa', 20);
    text(c, [result?.material?.name, result?.process].filter(Boolean).join('  ·  '), 864, 34, '#aebfcc', 12, 'right', 435);
    line(c, [[36, 48], [864, 48]], '#455969');
    const random = randomFor(reading.found);
    if (!info?.applicable(result).ok) text(c, reading.notes[0], 450, 189, '#ffcf9a', 18, 'center', 828);
    else if (methodId === 'UT') ultrasound(c, result, reading.found);
    else if (methodId === 'MACRO') crossSection(c, result, reading.found, random);
    else if (methodId === 'HIDRO') pressure(c, reading.found.length > 0);
    else surface(c, methodId, result, reading.found, random);
  } finally {
    c.restore();
  }
}
