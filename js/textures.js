// =====================================================================
//  Texturas procedurales PBR (color, rugosidad, normal) generadas en canvas
// =====================================================================
import * as THREE from 'three';

function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Ruido de valor tileable
function makeNoise(seed, period) {
  const r = mulberry(seed); const P = period; const g = new Float32Array(P * P);
  for (let i = 0; i < P * P; i++) g[i] = r();
  const sm = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y); const xf = sm(x - xi), yf = sm(y - yi);
    const x0 = ((xi % P) + P) % P, y0 = ((yi % P) + P) % P, x1 = (x0 + 1) % P, y1 = (y0 + 1) % P;
    const a = g[y0 * P + x0], b = g[y0 * P + x1], c = g[y1 * P + x0], d = g[y1 * P + x1];
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

export function fbmField(size, { seed = 1, scale = 8, oct = 5, sx = 1, sy = 1 } = {}) {
  const out = new Float32Array(size * size);
  const noises = []; for (let o = 0; o < oct; o++) noises.push(makeNoise(seed + o * 101, Math.max(1, Math.round(scale * (1 << o)))));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0, amp = 0.5, tot = 0;
    for (let o = 0; o < oct; o++) { const f = scale * (1 << o); v += noises[o](x / size * f * sx, y / size * f * sy) * amp; tot += amp; amp *= 0.5; }
    out[y * size + x] = v / tot;
  }
  return out;
}

function canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }

function heightToNormal(h, size, strength = 2) {
  const c = canvas(size); const ctx = c.getContext('2d'); const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const l = h[y * size + ((x - 1 + size) % size)], r = h[y * size + ((x + 1) % size)];
    const u = h[((y - 1 + size) % size) * size + x], d = h[((y + 1) % size) * size + x];
    let nx = (l - r) * strength, ny = (u - d) * strength, nz = 1; const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
    const i = (y * size + x) * 4; img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return c;
}

function fieldToCanvas(f, size, fn) {
  const c = canvas(size); const ctx = c.getContext('2d'); const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) { const [r, g, b] = fn(f[i], i); img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0); return c;
}

function tex(c, { srgb = false, repeat = [1, 1], aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = aniso; t.needsUpdate = true;
  return t;
}

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const cache = {};
function cached(key, fn) { return cache[key] ||= fn(); }

// ---------------------------------------------------------------------
export function concreteSet() {
  return cached('concrete', () => {
    const S = 512; const f = fbmField(S, { seed: 7, scale: 6, oct: 6 }); const f2 = fbmField(S, { seed: 19, scale: 2, oct: 3 });
    const fine = fbmField(S, { seed: 3, scale: 64, oct: 2 });
    const col = fieldToCanvas(f, S, (v, i) => { const s = f2[i]; const base = mixc(hex('#7d7a74'), hex('#55524d'), v * 0.9); const st = s > 0.62 ? (s - 0.62) * 2.2 : 0; const c = mixc(base, hex('#35322e'), Math.min(0.7, st)); const n = (fine[i] - 0.5) * 30; return [c[0] + n, c[1] + n, c[2] + n]; });
    const ctx = col.getContext('2d'); const r = mulberry(5);
    ctx.strokeStyle = 'rgba(30,28,26,0.55)'; ctx.lineWidth = 1.2;
    for (let k = 0; k < 6; k++) { ctx.beginPath(); let x = r() * S, y = r() * S; ctx.moveTo(x, y); for (let j = 0; j < 30; j++) { x += (r() - 0.5) * 30; y += (r() - 0.3) * 18; ctx.lineTo(x, y); } ctx.stroke(); }
    for (let k = 0; k < 40; k++) { ctx.fillStyle = `rgba(20,18,16,${0.05 + r() * 0.08})`; ctx.beginPath(); ctx.arc(r() * S, r() * S, 4 + r() * 40, 0, 7); ctx.fill(); }
    const h = new Float32Array(S * S); for (let i = 0; i < S * S; i++) h[i] = f[i] * 0.4 + fine[i] * 0.6;
    const rough = fieldToCanvas(f2, S, v => { const g = 160 + v * 80; return [g, g, g]; });
    return { map: tex(col, { srgb: true, repeat: [4, 4] }), normalMap: tex(heightToNormal(h, S, 3), { repeat: [4, 4] }), roughnessMap: tex(rough, { repeat: [4, 4] }) };
  });
}

export function brickSet() {
  return cached('brick', () => {
    const S = 512; const c = canvas(S); const ctx = c.getContext('2d'); const r = mulberry(11);
    const noise = fbmField(256, { seed: 4, scale: 16, oct: 4 });
    const H = new Float32Array(S * S).fill(0.2);
    ctx.fillStyle = '#6d6862'; ctx.fillRect(0, 0, S, S);
    const bw = 64, bh = 26, m = 4;
    for (let row = 0; row < S / bh; row++) {
      const off = (row % 2) * bw / 2;
      for (let col = -1; col < S / bw + 1; col++) {
        const x = col * bw + off + m / 2, y = row * bh + m / 2, w = bw - m, h = bh - m;
        const base = mixc(hex('#8a3d2b'), hex('#5a2a20'), r()); const tint = mixc(base, hex('#a0624a'), r() * 0.3);
        ctx.fillStyle = `rgb(${tint.map(Math.round).join(',')})`; ctx.fillRect(x, y, w, h);
        for (let k = 0; k < 25; k++) { ctx.fillStyle = `rgba(${r() > 0.5 ? '30,15,10' : '190,140,110'},${r() * 0.15})`; ctx.fillRect(x + r() * w, y + r() * h, 2 + r() * 10, 1 + r() * 4); }
        for (let yy = Math.max(0, y | 0); yy < Math.min(S, y + h); yy++) for (let xx = Math.max(0, x | 0); xx < Math.min(S, x + w); xx++) H[yy * S + xx] = 0.8 + noise[((yy >> 2) & 255) * 256 + ((xx >> 2) & 255)] * 0.2;
      }
    }
    const img = ctx.getImageData(0, 0, S, S);
    for (let i = 0; i < S * S; i++) { const n = (noise[((i / S >> 1) & 255) * 256 + ((i % S >> 1) & 255)] - 0.5) * 40; img.data[i * 4] += n; img.data[i * 4 + 1] += n; img.data[i * 4 + 2] += n; }
    ctx.putImageData(img, 0, 0);
    // hollín de soldadura en la parte baja
    const g = ctx.createLinearGradient(0, S, 0, S * 0.4); g.addColorStop(0, 'rgba(20,18,16,0.55)'); g.addColorStop(1, 'rgba(20,18,16,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    return { map: tex(c, { srgb: true, repeat: [1.5, 0.6] }), normalMap: tex(heightToNormal(H, S, 4), { repeat: [1.5, 0.6] }) };
  });
}

// Acero con cascarilla de laminación + óxido + pintura opcional
export function millScaleSet(opts = {}) {
  const key = 'mill' + JSON.stringify(opts);
  return cached(key, () => {
    const S = 512; const f = fbmField(S, { seed: 21 + (opts.seed || 0), scale: 5, oct: 6 }); const rust = fbmField(S, { seed: 33 + (opts.seed || 0), scale: 3, oct: 5 }); const fine = fbmField(S, { seed: 9, scale: 48, oct: 2 });
    const paint = opts.paint ? hex(opts.paint) : null;
    const rustAmt = opts.rust ?? 0.5;
    const col = fieldToCanvas(f, S, (v, i) => {
      let c = mixc(hex('#2f3236'), hex('#4f5a66'), v);
      const ru = rust[i] - (1 - rustAmt * 0.6);
      if (paint) { const chip = rust[i] > 0.66 ? 1 : 0; c = chip ? c : mixc(paint, hex('#222222'), (1 - v) * 0.25); }
      if (ru > 0) c = mixc(c, mixc(hex('#7a3d16'), hex('#a2581f'), fine[i]), Math.min(1, ru * 3));
      const n = (fine[i] - 0.5) * 18; return [c[0] + n, c[1] + n, c[2] + n];
    });
    const rough = fieldToCanvas(rust, S, (v) => { const g = paint ? 150 + v * 60 : 140 + v * 100; return [g, g, g]; });
    const metal = fieldToCanvas(rust, S, (v) => { let g = paint ? (v > 0.66 ? 160 : 10) : 190 - Math.max(0, v - (1 - rustAmt * 0.6)) * 600; g = Math.max(0, Math.min(255, g)); return [g, g, g]; });
    const h = new Float32Array(S * S); for (let i = 0; i < S * S; i++) h[i] = f[i] * 0.3 + Math.max(0, rust[i] - 0.55) * 1.5 + fine[i] * 0.2;
    return { map: tex(col, { srgb: true }), roughnessMap: tex(rough), metalnessMap: tex(metal), normalMap: tex(heightToNormal(h, S, 2.5)) };
  });
}

// Metal cepillado / amolado / pulido
export function brushedSet(kind = 'brushed', seed = 1) {
  return cached('brushed' + kind + seed, () => {
    const S = 512;
    if (kind === 'ground') {
      const c = canvas(S); const ctx = c.getContext('2d'); const r = mulberry(seed);
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, S, S);
      for (let k = 0; k < 900; k++) { const cx = r() * S * 1.6 - S * 0.3, cy = r() * S * 1.6 - S * 0.3, rad = 60 + r() * 220; const a0 = r() * 6.28; ctx.strokeStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},0)`; ctx.strokeStyle = r() > 0.5 ? `rgba(255,255,255,${0.05 + r() * 0.12})` : `rgba(0,0,0,${0.05 + r() * 0.12})`; ctx.lineWidth = 0.5 + r() * 1.2; ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a0 + 0.2 + r() * 0.5); ctx.stroke(); }
      const data = ctx.getImageData(0, 0, S, S).data; const h = new Float32Array(S * S); for (let i = 0; i < S * S; i++) h[i] = data[i * 4] / 255;
      return { roughnessMap: tex(c), normalMap: tex(heightToNormal(h, S, 1.5)) };
    }
    if (kind === 'turned') {
      const c = canvas(S); const ctx = c.getContext('2d'); const r = mulberry(seed);
      ctx.fillStyle = '#7a7a7a'; ctx.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 1) { const g = 110 + r() * 40 + Math.sin(y * 0.9) * 12; ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(0, y, S, 1); }
      const data = ctx.getImageData(0, 0, S, S).data; const h = new Float32Array(S * S); for (let i = 0; i < S * S; i++) h[i] = data[i * 4] / 255;
      return { roughnessMap: tex(c), normalMap: tex(heightToNormal(h, S, 0.8)) };
    }
    const f = fbmField(S, { seed, scale: 2, oct: 6, sx: 40, sy: 0.5 });
    const fine = fbmField(S, { seed: seed + 5, scale: 4, oct: 3 });
    const rough = fieldToCanvas(f, S, (v, i) => { const g = 90 + v * 70 + fine[i] * 30; return [g, g, g]; });
    const h = new Float32Array(S * S); for (let i = 0; i < S * S; i++) h[i] = f[i];
    return { roughnessMap: tex(rough), normalMap: tex(heightToNormal(h, S, 1.2)) };
  });
}

// Mesa de soldadura con agujeros, rayones, salpicaduras y coloración
export function tableSet() {
  return cached('table', () => {
    const S = 768; const c = canvas(S); const ctx = c.getContext('2d'); const r = mulberry(77);
    const f = fbmField(256, { seed: 12, scale: 6, oct: 5 });
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const v = f[((y >> 2) & 255) * 256 + ((x >> 2) & 255)]; const cc = mixc(hex('#2a2c2f'), hex('#4a4d52'), v); const i = (y * S + x) * 4; img.data[i] = cc[0]; img.data[i + 1] = cc[1]; img.data[i + 2] = cc[2]; img.data[i + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    for (let k = 0; k < 500; k++) { ctx.strokeStyle = `rgba(200,205,210,${r() * 0.18})`; ctx.lineWidth = 0.5 + r(); ctx.beginPath(); const x = r() * S, y = r() * S, a = r() * 6.28, l = 10 + r() * 120; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
    for (let k = 0; k < 1500; k++) { const x = r() * S, y = r() * S, rr = 0.6 + r() * 2.5; ctx.fillStyle = `rgba(${90 + r() * 60},${80 + r() * 50},${70 + r() * 40},0.9)`; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill(); }
    for (let k = 0; k < 14; k++) { const x = r() * S, y = r() * S; const g = ctx.createRadialGradient(x, y, 2, x, y, 30 + r() * 60); g.addColorStop(0, 'rgba(60,80,140,0.35)'); g.addColorStop(0.5, 'rgba(140,100,40,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); }
    const H = new Float32Array(S * S).fill(1);
    const pitch = S / 8;
    for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < 8; gx++) {
      const cx = gx * pitch + pitch / 2, cy = gy * pitch + pitch / 2, rad = pitch * 0.14;
      const g = ctx.createRadialGradient(cx, cy, rad * 0.5, cx, cy, rad * 1.15); g.addColorStop(0, '#050505'); g.addColorStop(0.85, '#0a0a0a'); g.addColorStop(1, 'rgba(120,125,130,0.6)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rad * 1.15, 0, 7); ctx.fill();
      for (let y = Math.floor(cy - rad); y < cy + rad; y++) for (let x = Math.floor(cx - rad); x < cx + rad; x++) if ((x - cx) ** 2 + (y - cy) ** 2 < rad * rad) H[y * S + x] = 0;
    }
    const rough = canvas(S); const rc = rough.getContext('2d'); rc.drawImage(c, 0, 0); rc.globalCompositeOperation = 'difference'; rc.fillStyle = '#909090'; rc.fillRect(0, 0, S, S);
    return { map: tex(c, { srgb: true }), normalMap: tex(heightToNormal(H, S, 8)), roughnessMap: tex(rough) };
  });
}

export function cobbleSet() {
  return cached('cobble', () => {
    const S = 512; const c = canvas(S); const ctx = c.getContext('2d'); const r = mulberry(55);
    ctx.fillStyle = '#3a3631'; ctx.fillRect(0, 0, S, S);
    const H = new Float32Array(S * S).fill(0);
    const pts = []; for (let i = 0; i < 70; i++) pts.push([r() * S, r() * S, mixc(hex('#8f877a'), hex('#6e665b'), r())]);
    const img = ctx.getImageData(0, 0, S, S);
    for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) {
      let d1 = 1e9, d2 = 1e9, best = null;
      for (const p of pts) { let dx = Math.abs(p[0] - x); dx = Math.min(dx, S - dx); let dy = Math.abs(p[1] - y); dy = Math.min(dy, S - dy); const d = dx * dx + dy * dy; if (d < d1) { d2 = d1; d1 = d; best = p; } else if (d < d2) d2 = d; }
      const edge = Math.sqrt(d2) - Math.sqrt(d1); const i = (y * S + x) * 4;
      const hgt = Math.min(1, edge / 8); H[y * S + x] = Math.sqrt(hgt);
      const cc = edge < 1.6 ? hex('#3b3631') : mixc(best[2], hex('#4a443c'), (1 - hgt) * 0.35);
      img.data[i] = cc[0]; img.data[i + 1] = cc[1]; img.data[i + 2] = cc[2];
    }
    ctx.putImageData(img, 0, 0);
    return { map: tex(c, { srgb: true, repeat: [6, 6] }), normalMap: tex(heightToNormal(H, S, 5), { repeat: [6, 6] }) };
  });
}

export function radialGlow(inner = 'rgba(255,255,255,1)', mid = 'rgba(160,190,255,0.5)') {
  return cached('glow' + inner + mid, () => {
    const S = 256; const c = canvas(S); const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, inner); g.addColorStop(0.12, inner); g.addColorStop(0.3, mid); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
}

export function smokeTexture() {
  return cached('smoke', () => {
    const S = 128; const f = fbmField(S, { seed: 99, scale: 4, oct: 4 }); const c = canvas(S); const ctx = c.getContext('2d'); const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const d = Math.hypot(x - S / 2, y - S / 2) / (S / 2); const a = Math.max(0, 1 - d) ** 1.5 * f[y * S + x] * 1.6; const i = (y * S + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 200; img.data[i + 3] = Math.min(255, a * 255); }
    ctx.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); return t;
  });
}

export function panelTexture(lines, { w = 512, h = 256, bg = '#1d4f8a', fg = '#fff' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg; ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center';
  lines.forEach((l, i) => ctx.fillText(l, w / 2, 70 + i * 60));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
