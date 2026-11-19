// =====================================================================
//  Mundo 3D: render PBR, entornos, piezas, antorchas, cordón y efectos
//  Unidades del mundo: metros. Piezas y cordón: milímetros (escala 0.001)
// =====================================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sky } from 'three/addons/objects/Sky.js';
import * as TX from './textures.js';

const V3 = THREE.Vector3;
const TABLE_Y = 0.9;

// ---------------------------------------------------------------------
//  Caminos de soldadura (en mm, coordenadas locales de la pieza)
// ---------------------------------------------------------------------
function linearPath(start, t, n, length) {
  t = t.clone().normalize(); n = n.clone().normalize();
  const b = new V3().crossVectors(t, n).normalize();
  return { length, circ: false, frame: s => ({ p: start.clone().addScaledVector(t, s), t: t.clone(), n: n.clone(), b: b.clone() }) };
}
function circPath(x0, R, theta0, length, dir = -1) {
  const path = {
    length, circ: true, R,
    theta: s => theta0 + dir * s / R,
    frame(s) {
      const th = path.theta(s);
      const n = new V3(0, Math.sin(th), Math.cos(th));
      const p = n.clone().multiplyScalar(R); p.x = x0;
      const t = new V3(0, Math.cos(th), -Math.sin(th)).multiplyScalar(dir);
      const b = new V3().crossVectors(t, n).normalize();
      return { p, n, t, b };
    },
  };
  return path;
}

// ---------------------------------------------------------------------
//  Materiales
// ---------------------------------------------------------------------
function std(o) { return new THREE.MeshStandardMaterial(o); }
function phys(o) { return new THREE.MeshPhysicalMaterial(o); }

function metalMaterial(id, state = 'raw') {
  switch (id) {
    case 'al6061': { const b = TX.brushedSet('brushed', 3); return std({ color: '#c8cbd0', metalness: 1, roughness: 0.42, roughnessMap: b.roughnessMap, normalMap: b.normalMap, normalScale: new THREE.Vector2(0.25, 0.25) }); }
    case 'ss316l': { const b = TX.brushedSet('brushed', 8); return std({ color: '#d4d7db', metalness: 1, roughness: 0.2, roughnessMap: b.roughnessMap, normalMap: b.normalMap, normalScale: new THREE.Vector2(0.15, 0.15) }); }
    case 'ti64': { const b = TX.brushedSet('turned', 5); return std({ color: '#a9acaf', metalness: 1, roughness: 0.34, roughnessMap: b.roughnessMap, normalMap: b.normalMap, normalScale: new THREE.Vector2(0.3, 0.3) }); }
    default: {
      if (state === 'clean') { const g = TX.brushedSet('ground', 4); return std({ color: '#a7abb0', metalness: 1, roughness: 0.38, roughnessMap: g.roughnessMap, normalMap: g.normalMap, normalScale: new THREE.Vector2(0.4, 0.4) }); }
      const m = TX.millScaleSet({ rust: id === 's355' ? 0.25 : 0.6, seed: id === 's355' ? 2 : 0 });
      return std({ color: '#ffffff', map: m.map, roughnessMap: m.roughnessMap, metalnessMap: m.metalnessMap, metalness: 1, roughness: 1, normalMap: m.normalMap });
    }
  }
}

const BEAD_COLORS = {
  al6061: { metal: '#d9dce0', slag: '#d9dce0', rough: 0.32, tint: ['#3a3a3a', '#6b6b6b', '#9a9a9a'] },
  a36: { metal: '#8d9298', slag: '#2a241d', rough: 0.35, tint: ['#3a2f55', '#5b4630', '#6b6a6a'] },
  s355: { metal: '#8d9298', slag: '#2a241d', rough: 0.35, tint: ['#3a2f55', '#5b4630', '#6b6a6a'] },
  ss316l: { metal: '#cfd3d8', slag: '#cfd3d8', rough: 0.22, tint: ['#d4b25a', '#9b5a3c', '#4a5ea8'] },
  ti64: { metal: '#d8dbde', slag: '#d8dbde', rough: 0.25, tint: ['#d8c27a', '#7a4fa0', '#5a7ab8'] },
};

// ---------------------------------------------------------------------
//  Cordón de soldadura con ondulaciones, temperatura y coloración
// ---------------------------------------------------------------------
class Bead {
  constructor(parent, path, opts) {
    this.path = path; this.o = opts; // {base:'flat'|'fillet', pow, ripple, matId, slag, tau}
    this.M = 15; this.max = Math.min(2400, Math.ceil(path.length * (1 + (opts.overlap || 0)) / 0.25) + 4);
    this.count = 0; this.lastS = -1e9; this.times = new Float32Array(this.max); this.peak = new Float32Array(this.max);
    const vN = this.max * this.M;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(vN * 3); this.col = new Float32Array(vN * 3); this.temp = new Float32Array(vN); this.ys = new Float32Array(vN);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aTemp', new THREE.BufferAttribute(this.temp, 1).setUsage(THREE.DynamicDrawUsage));
    const n0 = new Float32Array(vN * 3); for (let i = 1; i < n0.length; i += 3) n0[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(n0, 3));
    const idx = new Uint32Array((this.max - 1) * (this.M - 1) * 6); let k = 0;
    for (let i = 0; i < this.max - 1; i++) for (let j = 0; j < this.M - 1; j++) {
      const a = i * this.M + j, b = a + 1, c = a + this.M, d = c + 1;
      idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
    }
    g.setIndex(new THREE.BufferAttribute(idx, 1)); g.setDrawRange(0, 0);
    this.geo = g;
    const bc = BEAD_COLORS[opts.matId] || BEAD_COLORS.a36;
    this.metalColor = new THREE.Color(bc.metal); this.slagColor = new THREE.Color(bc.slag);
    const mat = std({ vertexColors: true, metalness: 0.95, roughness: bc.rough });
    mat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTemp;\nvarying float vTemp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTemp = aTemp;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying float vTemp;
vec3 blackbody(float t){ t=clamp(t,0.0,1.0);
  vec3 c = mix(vec3(0.0), vec3(0.55,0.03,0.0), smoothstep(0.08,0.3,t));
  c = mix(c, vec3(1.0,0.28,0.02), smoothstep(0.3,0.55,t));
  c = mix(c, vec3(1.0,0.72,0.25), smoothstep(0.55,0.8,t));
  c = mix(c, vec3(1.0,0.97,0.9), smoothstep(0.8,1.0,t));
  return c * (0.5 + 5.0*pow(t,3.0)); }`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.12, smoothstep(0.55,0.85,vTemp));')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += blackbody(vTemp);');
    };
    this.mesh = new THREE.Mesh(g, mat); this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    parent.add(this.mesh);
    // Coloración térmica a ambos lados
    this.TM = 8; const tN = this.max * this.TM;
    const tg = new THREE.BufferGeometry(); this.tpos = new Float32Array(tN * 3); this.tcol = new Float32Array(tN * 4);
    tg.setAttribute('position', new THREE.BufferAttribute(this.tpos, 3).setUsage(THREE.DynamicDrawUsage));
    tg.setAttribute('color', new THREE.BufferAttribute(this.tcol, 4).setUsage(THREE.DynamicDrawUsage));
    const tn0 = new Float32Array(tN * 3); for (let i = 1; i < tn0.length; i += 3) tn0[i] = 1; tg.setAttribute('normal', new THREE.BufferAttribute(tn0, 3));
    const tidx = []; for (let i = 0; i < this.max - 1; i++) for (let j = 0; j < this.TM - 1; j++) { if (j === 3) continue; const a = i * this.TM + j, b = a + 1, c = a + this.TM, d = c + 1; tidx.push(a, c, b, b, c, d); }
    tg.setIndex(tidx); tg.setDrawRange(0, 0); this.tgeo = tg;
    this.tint = new THREE.Mesh(tg, std({ vertexColors: true, transparent: true, depthWrite: false, metalness: 0.6, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.tint.frustumCulled = false; parent.add(this.tint);
    this.tintColors = (bc.tint || []).map(c => new THREE.Color(c)); this.tintLevel = opts.tintLevel ?? 0.4;
    this.normalTick = 0;
  }
  base(y) { return this.o.base === 'fillet' ? Math.abs(y) : 0; }
  add(s, { w, r, lat = 0, now, slag = false }) {
    if (s - this.lastS < 0.25 || this.count >= this.max) return;
    this.lastS = s;
    const i = this.count++; const { p, n, b } = this.path.frame(s);
    const M = this.M, ripple = this.o.ripple ?? 1.4, pw = this.o.pow ?? 0.6;
    const ramp = Math.min(1, (s - (this.firstS ??= s)) / 1.5 + 0.35);
    w *= ramp;
    const col = slag ? this.slagColor : this.metalColor;
    for (let j = 0; j < M; j++) {
      let y, h;
      if (j === 0 || j === M - 1) { y = (j === 0 ? -1 : 1) * w * 0.52; h = this.base(y) - 0.35; }
      else { const u = (j - 1) / (M - 3) * 2 - 1; y = u * w / 2; const prof = Math.pow(Math.max(0, 1 - u * u), pw); h = this.base(y) + r * prof * (1 + 0.07 * Math.sin(2 * Math.PI * (s + 0.9 * Math.abs(y)) / ripple)) + (r < 0 ? 0 : 0.05); }
      const v = i * M + j; const yy = y + lat;
      this.pos[v * 3] = p.x + b.x * yy + n.x * h; this.pos[v * 3 + 1] = p.y + b.y * yy + n.y * h; this.pos[v * 3 + 2] = p.z + b.z * yy + n.z * h;
      const shade = 0.9 + 0.1 * Math.sin(s * 3.1 + j);
      this.col[v * 3] = col.r * shade; this.col[v * 3 + 1] = col.g * shade; this.col[v * 3 + 2] = col.b * shade;
      this.ys[v] = (y / (w / 2 + 1e-6)); this.temp[v] = 1;
    }
    this.times[i] = now; this.peak[i] = 1;
    // coloración térmica
    const TM = this.TM; const ext = [0.03, 0.8, 1.8, 3.0];
    for (let j = 0; j < TM; j++) {
      const side = j < 4 ? -1 : 1; const kk = j < 4 ? 3 - j : j - 4; const y = side * (w / 2 + ext[kk] * w * 0.6) + lat * 0.5;
      const v = i * TM + j; const h = this.base(y) + 0.04;
      this.tpos[v * 3] = p.x + b.x * y + n.x * h; this.tpos[v * 3 + 1] = p.y + b.y * y + n.y * h; this.tpos[v * 3 + 2] = p.z + b.z * y + n.z * h;
      this.setTint(v, kk);
    }
    this.geo.setDrawRange(0, Math.max(0, (this.count - 1) * (M - 1) * 6));
    this.tgeo.setDrawRange(0, Math.max(0, (this.count - 1) * (TM - 1 - 1) * 6 + 0));
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
    this.tgeo.attributes.position.needsUpdate = true; this.tgeo.attributes.color.needsUpdate = true;
  }
  setTint(v, kk) {
    const L = this.tintLevel; const cs = this.tintColors; const c = cs[Math.min(cs.length - 1, kk)] || new THREE.Color('#333');
    const a = [0.9, 0.7, 0.45, 0.0][kk] * L;
    this.tcol[v * 4] = c.r; this.tcol[v * 4 + 1] = c.g; this.tcol[v * 4 + 2] = c.b; this.tcol[v * 4 + 3] = a;
  }
  retint(level, colors) {
    this.tintLevel = level; if (colors) this.tintColors = colors.map(c => new THREE.Color(c));
    for (let i = 0; i < this.count; i++) for (let j = 0; j < this.TM; j++) this.setTint(i * this.TM + j, j < 4 ? 3 - j : j - 4);
    this.tgeo.attributes.color.needsUpdate = true;
  }
  fixNormals() {
    this.geo.computeVertexNormals();
    const nr = this.geo.attributes.normal.array; const n = this.count * this.M;
    for (let i = 0; i < n; i++) {
      const x = nr[i * 3], y = nr[i * 3 + 1], z = nr[i * 3 + 2];
      if (!(x * x + y * y + z * z > 1e-8)) { nr[i * 3] = 0; nr[i * 3 + 1] = 1; nr[i * 3 + 2] = 0; }
    }
    this.geo.attributes.normal.needsUpdate = true;
    this.tgeo.computeVertexNormals();
    const tn = this.tgeo.attributes.normal.array;
    for (let i = 0; i < tn.length; i += 3) if (!(tn[i] * tn[i] + tn[i + 1] * tn[i + 1] + tn[i + 2] * tn[i + 2] > 1e-8)) { tn[i] = 0; tn[i + 1] = 1; tn[i + 2] = 0; }
    this.tgeo.attributes.normal.needsUpdate = true;
  }
  chip() { // quitar escoria
    for (let i = 0; i < this.count * this.M; i++) { const sh = 0.92 + 0.08 * Math.random(); this.col[i * 3] = this.metalColor.r * sh; this.col[i * 3 + 1] = this.metalColor.g * sh; this.col[i * 3 + 2] = this.metalColor.b * sh; }
    this.geo.attributes.color.needsUpdate = true;
  }
  update(now, tau) {
    let any = false;
    for (let i = this.coolFrom || 0; i < this.count; i++) {
      const T = Math.exp(-(now - this.times[i]) / tau);
      if (T < 0.02 && i === (this.coolFrom || 0)) { this.coolFrom = i + 1; for (let j = 0; j < this.M; j++) this.temp[i * this.M + j] = 0; any = true; continue; }
      for (let j = 0; j < this.M; j++) { const y = this.ys[i * this.M + j]; this.temp[i * this.M + j] = T * (1 - 0.3 * y * y); }
      any = true;
    }
    if (any) this.geo.attributes.aTemp.needsUpdate = true;
    if (++this.normalTick % 4 === 0 && this.count > 2) this.fixNormals();
  }
  dispose() { this.mesh.parent?.remove(this.mesh); this.tint.parent?.remove(this.tint); this.geo.dispose(); this.tgeo.dispose(); }
}

// ---------------------------------------------------------------------
//  Chispas (estelas), salpicaduras y humo
// ---------------------------------------------------------------------
class Sparks {
  constructor(scene, max = 900) {
    this.max = max; this.n = 0;
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3); this.life = new Float32Array(max); this.age = new Float32Array(max); this.prev = new Float32Array(max * 3);
    this.tint = new Float32Array(max * 3).fill(1); this.fork = new Float32Array(max);
    const g = new THREE.BufferGeometry(); this.lp = new Float32Array(max * 6); this.lc = new Float32Array(max * 6);
    g.setAttribute('position', new THREE.BufferAttribute(this.lp, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.lc, 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    this.mesh.frustumCulled = false; scene.add(this.mesh); this.floorY = 0;
    this.floors = [];
  }
  emit(pos, count, { speed = 2.5, up = 0.6, spread = 1, dir = null, life = [0.3, 1.1], tint = null, forks = 0 } = {}) {
    for (let k = 0; k < count; k++) {
      let i = this.n < this.max ? this.n++ : Math.floor(Math.random() * this.max);
      this.tint[i * 3] = tint ? tint[0] : 1; this.tint[i * 3 + 1] = tint ? tint[1] : 1; this.tint[i * 3 + 2] = tint ? tint[2] : 1; this.fork[i] = forks;
      this.p[i * 3] = pos.x; this.p[i * 3 + 1] = pos.y; this.p[i * 3 + 2] = pos.z;
      this.prev[i * 3] = pos.x; this.prev[i * 3 + 1] = pos.y; this.prev[i * 3 + 2] = pos.z;
      const a = Math.random() * Math.PI * 2, e = Math.random() * spread; const sp = speed * (0.3 + Math.random());
      let vx = Math.cos(a) * e, vz = Math.sin(a) * e, vy = up + Math.random() * 0.8;
      if (dir) { vx += dir.x; vy += dir.y; vz += dir.z; }
      const l = Math.hypot(vx, vy, vz) || 1;
      this.v[i * 3] = vx / l * sp; this.v[i * 3 + 1] = vy / l * sp; this.v[i * 3 + 2] = vz / l * sp;
      this.life[i] = life[0] + Math.random() * (life[1] - life[0]); this.age[i] = 0;
    }
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.age[i] >= this.life[i]) { this.lp.fill(0, i * 6, i * 6 + 6); this.lc.fill(0, i * 6, i * 6 + 6); continue; }
      this.age[i] += dt;
      this.prev[i * 3] = this.p[i * 3]; this.prev[i * 3 + 1] = this.p[i * 3 + 1]; this.prev[i * 3 + 2] = this.p[i * 3 + 2];
      this.v[i * 3 + 1] -= 9.8 * dt; const drag = 1 - 0.6 * dt;
      this.v[i * 3] *= drag; this.v[i * 3 + 1] *= drag; this.v[i * 3 + 2] *= drag;
      this.p[i * 3] += this.v[i * 3] * dt; this.p[i * 3 + 1] += this.v[i * 3 + 1] * dt; this.p[i * 3 + 2] += this.v[i * 3 + 2] * dt;
      const fy = this.floorAt(this.p[i * 3], this.p[i * 3 + 2]);
      if (this.p[i * 3 + 1] < fy && this.v[i * 3 + 1] < 0) { this.p[i * 3 + 1] = fy; this.v[i * 3 + 1] *= -0.35; this.v[i * 3] *= 0.6; this.v[i * 3 + 2] *= 0.6; }
      const t = this.age[i] / this.life[i]; const k = 1 - t;
      if (this.fork[i] && t > 0.45 && Math.random() < this.fork[i] * dt * 6) { this._fp ??= new V3(); this._fp.set(this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2]); this.emit(this._fp, 4, { speed: 0.8, up: 0, spread: 1, life: [0.08, 0.2], tint: [this.tint[i * 3], this.tint[i * 3 + 1], this.tint[i * 3 + 2]] }); this.fork[i] = 0; }
      const tr = this.tint[i * 3], tg = this.tint[i * 3 + 1], tb = this.tint[i * 3 + 2];
      const r = (4 * k + 0.5) * tr, gg = (3.2 * k * k + 0.15) * tg, bb = (1.6 * k * k * k + (tb > 0.9 && tg > 0.9 ? 1.5 * k : 0)) * tb;
      const stretch = 0.018 / Math.max(dt, 0.008);
      const hx = this.p[i * 3], hy = this.p[i * 3 + 1], hz = this.p[i * 3 + 2];
      this.lp[i * 6] = hx; this.lp[i * 6 + 1] = hy; this.lp[i * 6 + 2] = hz;
      this.lp[i * 6 + 3] = hx - (hx - this.prev[i * 3]) * stretch; this.lp[i * 6 + 4] = hy - (hy - this.prev[i * 3 + 1]) * stretch; this.lp[i * 6 + 5] = hz - (hz - this.prev[i * 3 + 2]) * stretch;
      this.lc[i * 6] = r; this.lc[i * 6 + 1] = gg; this.lc[i * 6 + 2] = bb; this.lc[i * 6 + 3] = r * 0.15; this.lc[i * 6 + 4] = gg * 0.05; this.lc[i * 6 + 5] = 0;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true; this.mesh.geometry.attributes.color.needsUpdate = true;
  }
  floorAt(x, z) { let y = this.floorY; for (const f of this.floors) if (x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1) y = Math.max(y, f.y); return y; }
  clear() { this.n = 0; this.lp.fill(0); this.lc.fill(0); }
}

class Smoke {
  constructor(scene, max = 70) {
    this.items = []; const tex = TX.smokeTexture();
    for (let i = 0; i < max; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xb8b4ae, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; scene.add(m); this.items.push({ m, age: 0, life: 0, v: new V3() }); }
    this.i = 0;
  }
  emit(pos, density = 1) {
    const it = this.items[this.i++ % this.items.length]; it.m.position.copy(pos); it.age = 0; it.life = 2 + Math.random() * 2; it.v.set((Math.random() - 0.5) * 0.03, 0.06 + Math.random() * 0.05, (Math.random() - 0.5) * 0.03); it.m.visible = true; it.d = density; it.m.material.rotation = Math.random() * 6;
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.m.visible) continue; it.age += dt; if (it.age > it.life) { it.m.visible = false; continue; }
      const t = it.age / it.life; it.m.position.addScaledVector(it.v, dt); it.v.x += (Math.random() - 0.5) * 0.02 * dt;
      const s = 0.02 + t * 0.18; it.m.scale.set(s, s, s); it.m.material.opacity = Math.sin(Math.PI * t) * 0.18 * it.d;
    }
  }
}

// ---------------------------------------------------------------------
//  Viñeta + grano + ligera aberración
// ---------------------------------------------------------------------
const FilmShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vig: { value: 0.35 }, grain: { value: 0.035 }, helmet: { value: 0 }, flash: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, vig, grain, helmet, flash; varying vec2 vUv;
  float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))+time*7.0)*43758.5453); }
  void main(){
    vec2 c = vUv-0.5; float d = length(c);
    vec3 col; col.r = texture2D(tDiffuse, vUv + c*0.0018).r; col.g = texture2D(tDiffuse, vUv).g; col.b = texture2D(tDiffuse, vUv - c*0.0018).b;
    col *= 1.0 - vig * smoothstep(0.25, 0.85, d);
    col += (rnd(vUv*1000.0)-0.5)*grain;
    // filtro de careta (verde sombra 11)
    col = mix(col, col*vec3(0.55,1.0,0.45), helmet*0.75);
    col *= 1.0 - helmet * 0.9 * smoothstep(0.28, 0.5, max(abs(c.x)*0.8, abs(c.y)*1.35));
    col = mix(col, vec3(1.0,0.98,0.95), flash);
    gl_FragColor = vec4(col,1.0);
  }`,
};

// ---------------------------------------------------------------------
export class World {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    RectAreaLightUniformsLib.init();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.005, 200);
    this.camera.position.set(0.6, 1.4, 1.0);
    this.controls = new OrbitControls(this.camera, canvas); this.controls.enableDamping = true; this.controls.target.set(0, TABLE_Y, 0);
    this.controls.minDistance = 0.08; this.controls.maxDistance = 4;
    this.pmrem = new THREE.PMREMGenerator(r);
    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.3, 0.35, 1.0); this.composer.addPass(this.bloom);
    this.film = new ShaderPass(FilmShader); this.composer.addPass(this.film);
    this.composer.addPass(new OutputPass());
    this.envRoot = new THREE.Group(); this.scene.add(this.envRoot);
    this.sparks = new Sparks(this.scene); this.smoke = new Smoke(this.scene);
    this.clock = new THREE.Clock(); this.time = 0;
    this.camMode = 'orbit'; this.camTarget = new V3(); this.camPos = new V3();
    this.helmet = false; this.helmetAmt = 0; this.flash = 0; this.arcOn = false; this.arcLevel = 0;
    this.beads = []; this.onFrame = null;
    this._buildArc();
    window.addEventListener('resize', () => this.resize()); this.resize();
    r.setAnimationLoop(() => this._loop());
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false); this.composer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.bloom.resolution.set(w / 2, h / 2);
  }

  // =================================================================
  //  Entornos
  // =================================================================
  clearEnv() {
    for (const c of [...this.envRoot.children]) { this.envRoot.remove(c); c.traverse?.(o => { o.geometry?.dispose?.(); }); }
    this.scene.fog = null; this.scene.background = null; this.sparks.floors = [];
  }

  setEnvironment(kind) {
    if (this.envKind === kind) return; this.envKind = kind;
    this.clearEnv();
    if (kind === 'exterior') this._exterior(); else if (kind === 'campo') this._field(); else if (kind === 'camara') this._chamber(); else this._workshop(kind === 'industrial');
    this._buildMachine(kind); this._buildOven(kind);
  }

  _workshop(industrial) {
    const E = this.envRoot;
    const env = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = env; this.scene.environmentIntensity = 0.35; this.scene.background = new THREE.Color('#0d0e10');
    this.scene.fog = new THREE.Fog('#0d0e10', 6, 16);
    const c = TX.concreteSet();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), std({ map: c.map, normalMap: c.normalMap, roughnessMap: c.roughnessMap, roughness: 1, metalness: 0 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; E.add(floor);
    const br = TX.brickSet();
    const wallMat = industrial ? std({ color: '#d9dcdc', roughness: 0.35, metalness: 0 }) : std({ map: br.map, normalMap: br.normalMap, roughness: 0.9 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.2), wallMat); back.position.set(0, 2.1, -2.2); back.receiveShadow = true; E.add(back);
    const left = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.2), wallMat); left.rotation.y = Math.PI / 2; left.position.set(-3.5, 2.1, 0); left.receiveShadow = true; E.add(left);
    if (industrial) { // azulejo de lechería
      const tiles = document.createElement('canvas'); tiles.width = tiles.height = 512; const tc = tiles.getContext('2d'); tc.fillStyle = '#e8eceb'; tc.fillRect(0, 0, 512, 512); tc.strokeStyle = '#9aa3a2'; tc.lineWidth = 3; for (let i = 0; i <= 512; i += 64) { tc.beginPath(); tc.moveTo(i, 0); tc.lineTo(i, 512); tc.stroke(); tc.beginPath(); tc.moveTo(0, i); tc.lineTo(512, i); tc.stroke(); }
      const tt = new THREE.CanvasTexture(tiles); tt.colorSpace = THREE.SRGBColorSpace; tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(12, 4); wallMat.map = tt; wallMat.needsUpdate = true;
      // tanque de leche al fondo
      const ss = metalMaterial('ss316l');
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 64), ss); tank.position.set(-1.6, 1.4, -1.2); tank.castShadow = true; E.add(tank);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), ss); dome.position.set(-1.6, 2.5, -1.2); E.add(dome);
      for (const a of [0, 2.1, 4.2]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 16), ss); leg.position.set(-1.6 + Math.cos(a) * 0.7, 0.2, -1.2 + Math.sin(a) * 0.7); E.add(leg); }
      const pipeMat = metalMaterial('ss316l');
      const curve = new THREE.CatmullRomCurve3([new V3(-0.75, 0.6, -1.0), new V3(-0.3, 0.6, -0.9), new V3(0.2, 1.0, -1.6), new V3(2.5, 1.0, -1.8)]);
      const pipe = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.019, 24), pipeMat); pipe.castShadow = true; E.add(pipe);
    }
    // ventana con luz cálida
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), std({ color: '#000', emissive: '#ffdcb0', emissiveIntensity: 2.2 })); win.position.set(-3.49, 2.2, -0.6); win.rotation.y = Math.PI / 2; E.add(win);
    const sun = new THREE.DirectionalLight('#ffd6a6', 1.8); sun.position.set(-4, 4.5, -0.4); sun.target.position.set(0, TABLE_Y, 0); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -2; sun.shadow.camera.right = 2; sun.shadow.camera.top = 2; sun.shadow.camera.bottom = -2; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.01;
    E.add(sun, sun.target);
    // fluorescentes
    for (const x of [-1.2, 1.2]) {
      const tube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.1), std({ color: '#222', emissive: '#e8f0ff', emissiveIntensity: 3 })); tube.position.set(x, 3.2, 0); E.add(tube);
      const ra = new THREE.RectAreaLight('#e6eeff', 3.5, 1.2, 0.12); ra.position.set(x, 3.18, 0); ra.lookAt(x, 0, 0); E.add(ra);
    }
    const key = new THREE.SpotLight('#fff1dc', 25, 6, 0.6, 0.6, 2); key.position.set(0.8, 2.6, 1.0); key.target.position.set(0, TABLE_Y, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.005; E.add(key, key.target);
    E.add(new THREE.HemisphereLight('#bfc8d6', '#2a2520', 0.25));
    this._table(E);
    this._props(E, industrial);
    this.sparks.floorY = 0; this.sparks.floors = [{ x0: -0.75, x1: 0.75, z0: -0.45, z1: 0.45, y: TABLE_Y }];
  }

  _table(E0) {
    const E = new THREE.Group(); E0.add(E); this.table = E;
    const t = TX.tableSet();
    const top = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.04, 0.9, 3, 0.004), std({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, metalness: 0.9, roughness: 1 }));
    top.position.set(0, TABLE_Y - 0.02, 0); top.receiveShadow = true; top.castShadow = true; E.add(top);
    const legMat = std({ color: '#2b2d30', metalness: 0.8, roughness: 0.55 });
    for (const [x, z] of [[-0.68, -0.38], [0.68, -0.38], [-0.68, 0.38], [0.68, 0.38]]) { const l = new THREE.Mesh(new RoundedBoxGeometry(0.06, TABLE_Y - 0.04, 0.06, 2, 0.006), legMat); l.position.set(x, (TABLE_Y - 0.04) / 2, z); l.castShadow = true; E.add(l); }
    const shelf = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.02, 0.8, 2, 0.004), legMat); shelf.position.set(0, 0.2, 0); shelf.receiveShadow = true; E.add(shelf);
  }

  _props(E, industrial) {
    // Equipo de soldadura
    const blue = std({ color: '#1f4f8e', metalness: 0.3, roughness: 0.45 });
    const mach = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.42, 0.6, 4, 0.02), blue); mach.position.set(1.05, 0.21, -0.1); mach.castShadow = true; mach.receiveShadow = true; E.add(mach);
    const pc = document.createElement('canvas'); pc.width = 512; pc.height = 512; const g = pc.getContext('2d');
    g.fillStyle = '#16181b'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#0b2a12'; g.fillRect(60, 50, 240, 110); g.fillStyle = '#46ff7a'; g.font = 'bold 84px monospace'; g.fillText('120A', 72, 135);
    g.fillStyle = '#ddd'; g.font = 'bold 34px Arial'; g.fillText('WELD-PRO 3000', 60, 230); g.font = '24px Arial'; g.fillText('TIG AC/DC · MMA · MIG', 60, 270);
    g.fillStyle = '#c00'; g.beginPath(); g.arc(400, 110, 40, 0, 7); g.fill();
    const pt = new THREE.CanvasTexture(pc); pt.colorSpace = THREE.SRGBColorSpace;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), std({ map: pt, roughness: 0.4, emissiveMap: pt, emissive: '#ffffff', emissiveIntensity: 0.25 })); panel.position.set(0.879, 0.25, -0.1); panel.rotation.y = -Math.PI / 2; E.add(panel);
    for (const z of [-0.2, 0.0]) { const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.025, 32), std({ color: '#111', roughness: 0.4 })); knob.rotation.z = Math.PI / 2; knob.position.set(0.865, 0.12, z); E.add(knob); }
    // Botellas de gas
    const bottle = (x, z, shoulder) => {
      const grp = new THREE.Group(); const bm = std({ color: '#5f6366', metalness: 0.4, roughness: 0.45 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.25, 48), bm); body.position.y = 0.625; body.castShadow = true;
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.11, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: shoulder, metalness: 0.3, roughness: 0.4 })); top.position.y = 1.25; top.castShadow = true;
      const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.08, 16), std({ color: '#b08d57', metalness: 1, roughness: 0.3 })); valve.position.y = 1.39;
      const reg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 32), std({ color: '#b08d57', metalness: 1, roughness: 0.25 })); reg.rotation.x = Math.PI / 2; reg.position.set(0, 1.43, 0.03);
      const gauge = new THREE.Mesh(new THREE.CircleGeometry(0.03, 32), std({ color: '#f4f1e8', roughness: 0.3 })); gauge.position.set(0, 1.43, 0.041);
      grp.add(body, top, valve, reg, gauge); grp.position.set(x, 0, z); E.add(grp);
    };
    bottle(1.45, -0.6, '#2d6a3a'); bottle(1.7, -0.4, '#8a8f93');
    // Cortina de soldadura
    const cur = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.9, 40, 1), std({ color: '#b3200e', transparent: true, opacity: 0.82, roughness: 0.55, side: THREE.DoubleSide, emissive: '#3a0500', emissiveIntensity: 0.2 }));
    const pa = cur.geometry.attributes.position; for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * 9) * 0.03); cur.geometry.computeVertexNormals();
    cur.position.set(2.1, 1.05, 0.2); cur.rotation.y = -Math.PI / 2.4; E.add(cur);
    // Estantería con cajas y casco
    const shelfMat = std({ color: '#3a3d40', metalness: 0.7, roughness: 0.5 });
    for (const y of [0.4, 0.9, 1.4]) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.025, 0.4), shelfMat); s.position.set(-1.6, y, -1.95); s.castShadow = s.receiveShadow = true; E.add(s); }
    const boxCols = ['#9c7a52', '#8a6a45', '#a8865c', '#7d6143', '#5b5f63'];
    for (let i = 0; i < 8; i++) { const b = new THREE.Mesh(new RoundedBoxGeometry(0.18 + Math.random() * 0.1, 0.12 + Math.random() * 0.1, 0.25, 2, 0.01), std({ color: boxCols[i % 5], roughness: 0.92, ...(i % 5 === 4 ? { metalness: 0.6, roughness: 0.5 } : {}) })); b.position.set(-2.05 + (i % 4) * 0.28, [0.4, 0.9][i >> 2] + 0.08, -1.92); b.castShadow = true; E.add(b); }
    // Amoladora
    const grinder = new THREE.Group();
    const gb = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.26, 32), std({ color: '#c7a313', roughness: 0.5 })); gb.rotation.z = Math.PI / 2;
    const gh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 32), std({ color: '#333', metalness: 0.8, roughness: 0.4 })); gh.position.x = 0.15;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.0575, 0.0575, 0.006, 48), std({ color: '#5a5550', roughness: 0.9 })); disc.position.set(0.15, -0.035, 0);
    grinder.add(gb, gh, disc); grinder.position.set(0.5, TABLE_Y + 0.035, -0.3); grinder.rotation.y = 0.5; grinder.traverse(o => o.castShadow = true); E.add(grinder);
    // Martillo de escoria
    const hm = new THREE.Group(); const hh = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.25, 16), std({ color: '#7a1a14', roughness: 0.6 })); hh.rotation.z = Math.PI / 2;
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.012, 0.13), std({ color: '#666', metalness: 0.9, roughness: 0.4 })); hd.position.x = 0.13; hm.add(hh, hd); hm.position.set(0.55, TABLE_Y + 0.012, 0.3); hm.rotation.y = -0.3; E.add(hm);
    // Cable de pinza (curva)
    const cable = new THREE.CatmullRomCurve3([new V3(0.88, 0.35, 0.05), new V3(0.9, 0.05, 0.4), new V3(0.6, 0.02, 0.7), new V3(0.3, 0.3, 0.5), new V3(0.4, TABLE_Y + 0.01, 0.35)]);
    E.add(Object.assign(new THREE.Mesh(new THREE.TubeGeometry(cable, 80, 0.008, 12), std({ color: '#111', roughness: 0.6 })), { castShadow: true }));
  }

  _exterior() {
    const E = this.envRoot;
    const sky = new Sky(); sky.scale.setScalar(450000);
    const u = sky.material.uniforms; u.turbidity.value = 6; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.85;
    const sunDir = new V3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(68), THREE.MathUtils.degToRad(200)); u.sunPosition.value.copy(sunDir);
    const skyScene = new THREE.Scene(); skyScene.add(sky);
    this.scene.environment = this.pmrem.fromScene(skyScene).texture; this.scene.environmentIntensity = 0.8;
    E.add(sky); this.scene.fog = new THREE.FogExp2('#b9c4cf', 0.035);
    const cb = TX.cobbleSet();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), std({ map: cb.map, normalMap: cb.normalMap, roughness: 0.9 }));
    ground.material.map.repeat.set(90, 90); ground.material.normalMap.repeat.set(90, 90);
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; E.add(ground);
    const sun = new THREE.DirectionalLight('#ffe7c4', 3.2); sun.position.copy(sunDir).multiplyScalar(10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 30 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.01; sun.target.position.set(0, 0, 0);
    E.add(sun, sun.target, new THREE.HemisphereLight('#cfe0ff', '#5a4f40', 0.6));
    // Pedestales de hormigón y marquesina
    const conc = TX.concreteSet(); const concMat = std({ map: conc.map, normalMap: conc.normalMap, roughness: 0.95 });
    const paint = TX.millScaleSet({ paint: '#2f5d3a', rust: 0.7, seed: 4 });
    const colMat = std({ map: paint.map, roughnessMap: paint.roughnessMap, metalnessMap: paint.metalnessMap, metalness: 1, roughness: 1, normalMap: paint.normalMap });
    const spots = [[-2.4, -2.0], [2.4, -2.0], [2.4, 0.0]];
    for (const [x, z] of spots) {
      const ped = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.3, 0.5, 3, 0.02), concMat); ped.position.set(x, 0.15, z); ped.castShadow = ped.receiveShadow = true; E.add(ped);
      const col = this._heb(2.6, colMat); col.position.set(x, 0.315, z); E.add(col);
    }
    const ped0 = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.3, 0.5, 3, 0.02), concMat); ped0.position.set(0, 0.15, 0); ped0.castShadow = ped0.receiveShadow = true; E.add(ped0);
    // techo
    const roofC = document.createElement('canvas'); roofC.width = 256; roofC.height = 256; const rc = roofC.getContext('2d');
    for (let x = 0; x < 256; x++) { const v = 128 + Math.sin(x / 256 * Math.PI * 16) * 127; rc.fillStyle = `rgb(${v},${v},${v})`; rc.fillRect(x, 0, 1, 256); }
    const h = new Float32Array(256 * 256); const d = rc.getImageData(0, 0, 256, 256).data; for (let i = 0; i < h.length; i++) h[i] = d[i * 4] / 255;
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), std({ color: '#3d6a4a', metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }));
    roof.rotation.x = -Math.PI / 2 + 0.08; roof.position.set(0, 2.95, -1.0); roof.castShadow = true; roof.receiveShadow = true; E.add(roof);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 0.08), colMat); beam.position.set(0, 2.85, 0); beam.castShadow = true; E.add(beam);
    const beam2 = beam.clone(); beam2.position.z = -2.0; E.add(beam2);
    // Puestos del mercado
    const wood = std({ color: '#8a5a33', roughness: 0.8 });
    const fruitCols = ['#e8731a', '#c2141b', '#f2c218', '#4f9a2a'];
    for (let k = 0; k < 3; k++) {
      const stall = new THREE.Group(); const tb = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.05, 0.7, 2, 0.01), wood); tb.position.y = 0.8; stall.add(tb);
      for (const [x, z] of [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), wood); l.position.set(x, 0.4, z); stall.add(l); }
      for (let c = 0; c < 3; c++) {
        const crate = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.14, 0.3, 2, 0.01), std({ color: '#b98b5a', roughness: 0.85 })); crate.position.set(-0.45 + c * 0.45, 0.9, 0); stall.add(crate);
        const fc = fruitCols[(c + k) % 4]; const fm = phys({ color: fc, roughness: 0.35, clearcoat: 0.6 });
        for (let f = 0; f < 18; f++) { const fr = new THREE.Mesh(new THREE.SphereGeometry(0.035 + Math.random() * 0.01, 20, 14), fm); fr.position.set(-0.45 + c * 0.45 + (Math.random() - 0.5) * 0.3, 0.99 + Math.random() * 0.03, (Math.random() - 0.5) * 0.2); fr.scale.y = 0.9; stall.add(fr); }
      }
      stall.traverse(o => { o.castShadow = o.receiveShadow = true; });
      stall.position.set(-1.4 + k * 1.6, 0, -1.4); E.add(stall);
    }
    // Fachadas al fondo
    const plaster = ['#d8c7a6', '#c99a6e', '#e2d9c8', '#b8a07a'];
    for (let i = 0; i < 7; i++) {
      const w = 3 + Math.random() * 2, hh = 5 + Math.random() * 3;
      const house = new THREE.Mesh(new THREE.BoxGeometry(w, hh, 3), std({ color: plaster[i % 4], roughness: 0.9 })); house.position.set(-12 + i * 4, hh / 2, -9 - Math.random() * 2); house.castShadow = house.receiveShadow = true; E.add(house);
      const rf = new THREE.Mesh(new THREE.ConeGeometry(w * 0.8, 1.6, 4), std({ color: '#8b3a24', roughness: 0.8 })); rf.rotation.y = Math.PI / 4; rf.position.set(house.position.x, hh + 0.8, house.position.z); rf.scale.z = 0.7; E.add(rf);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { const wn = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1), std({ color: '#1a2430', metalness: 0.6, roughness: 0.15 })); wn.position.set(house.position.x - w / 4 + c * w / 2, 1.8 + r * 2.2, house.position.z + 1.51); E.add(wn); }
    }
    this.sparks.floorY = 0; this.sparks.floors = [{ x0: -0.25, x1: 0.25, z0: -0.25, z1: 0.25, y: 0.3 }];
  }

  _heb(height, mat, withPlate = true) {
    const g = new THREE.Group();
    const fl = new THREE.BoxGeometry(160, height * 1000, 13);
    const f1 = new THREE.Mesh(fl, mat); f1.position.set(0, height * 500 + 15, 73.5);
    const f2 = new THREE.Mesh(fl, mat); f2.position.set(0, height * 500 + 15, -73.5);
    const web = new THREE.Mesh(new THREE.BoxGeometry(8, height * 1000, 134), mat); web.position.set(0, height * 500 + 15, 0);
    g.add(f1, f2, web);
    if (withPlate) { const pl = new THREE.Mesh(new RoundedBoxGeometry(300, 15, 300, 2, 1.5), mat); pl.position.y = 7.5; g.add(pl); }
    g.traverse(o => { o.castShadow = o.receiveShadow = true; }); g.scale.setScalar(0.001);
    return g;
  }

  _chamber() {
    const E = this.envRoot;
    const env = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = env; this.scene.environmentIntensity = 0.55; this.scene.background = new THREE.Color('#050607');
    const b = TX.brushedSet('brushed', 11);
    const steel = std({ color: '#bfc3c7', metalness: 1, roughness: 0.3, roughnessMap: b.roughnessMap, normalMap: b.normalMap, side: THREE.BackSide });
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.6, 96, 1, true), steel); shell.rotation.z = Math.PI / 2; shell.position.y = 1.0; shell.receiveShadow = true; E.add(shell);
    const endCap = new THREE.Mesh(new THREE.CircleGeometry(1.1, 96), std({ color: '#9da2a7', metalness: 1, roughness: 0.35, roughnessMap: b.roughnessMap })); endCap.position.set(-1.3, 1.0, 0); endCap.rotation.y = Math.PI / 2; E.add(endCap);
    for (let x = -1.2; x <= 1.21; x += 0.4) { const ring = new THREE.Mesh(new THREE.TorusGeometry(1.09, 0.025, 12, 96), std({ color: '#8d9297', metalness: 1, roughness: 0.35 })); ring.rotation.y = Math.PI / 2; ring.position.set(x, 1.0, 0); E.add(ring); }
    // Suelo de rejilla
    const gc = document.createElement('canvas'); gc.width = gc.height = 256; const g2 = gc.getContext('2d'); g2.fillStyle = '#000'; g2.fillRect(0, 0, 256, 256); g2.fillStyle = '#fff'; for (let i = 0; i < 256; i += 32) { g2.fillRect(i, 0, 6, 256); g2.fillRect(0, i, 256, 6); }
    const gt = new THREE.CanvasTexture(gc); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(12, 6);
    const grate = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), std({ color: '#777', metalness: 1, roughness: 0.4, alphaMap: gt, transparent: false, alphaTest: 0.5, side: THREE.DoubleSide })); grate.rotation.x = -Math.PI / 2; grate.position.y = 0.32; E.add(grate);
    // Cañón de electrones
    const gunMat = std({ color: '#c9ccd0', metalness: 1, roughness: 0.25 });
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.7, 64), gunMat); gun.position.set(0, 1.85, 0); E.add(gun);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.11, 0.18, 64), gunMat); cone.position.set(0, 1.41, 0); E.add(cone);
    for (const y of [1.6, 1.72]) { const coil = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.018, 16, 64), std({ color: '#b5651d', metalness: 1, roughness: 0.35 })); coil.rotation.x = Math.PI / 2; coil.position.set(0, y, 0); E.add(coil); }
    this.gunTip = new V3(0, 1.32, 0);
    // Mirilla y luces LED
    const port = new THREE.Mesh(new THREE.CircleGeometry(0.16, 64), std({ color: '#0a1520', metalness: 0.3, roughness: 0.05, emissive: '#10304a', emissiveIntensity: 0.6 })); port.position.set(1.29, 1.1, 0); port.rotation.y = -Math.PI / 2; E.add(port);
    for (const z of [-0.6, 0.6]) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 0.04), std({ color: '#111', emissive: '#dfe9ff', emissiveIntensity: 1.5 })); led.position.set(0, 1.85, z); E.add(led);
      const ra = new THREE.RectAreaLight('#dfe9ff', 6, 1.6, 0.05); ra.position.set(0, 1.84, z); ra.lookAt(0, 1.0, 0); E.add(ra);
    }
    const key = new THREE.SpotLight('#e8f0ff', 12, 3, 0.7, 0.5, 2); key.position.set(0.6, 1.8, 0.7); key.target.position.set(0, 1.0, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0002; E.add(key, key.target);
    // Posicionador giratorio (mandril)
    const chuck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 64), std({ color: '#2d3034', metalness: 0.9, roughness: 0.4 })); chuck.rotation.z = Math.PI / 2; chuck.position.set(-0.2, 1.0, 0); E.add(chuck);
    const motor = new THREE.Mesh(new RoundedBoxGeometry(0.25, 0.3, 0.3, 3, 0.02), std({ color: '#2b5b8a', metalness: 0.3, roughness: 0.5 })); motor.position.set(-0.4, 0.95, 0); motor.castShadow = true; E.add(motor);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.12, 32), gunMat); tail.rotation.z = Math.PI / 2; tail.position.set(0.21, 1.0, 0); E.add(tail);
    const tstock = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.4, 0.2, 3, 0.01), std({ color: '#2b5b8a', metalness: 0.3, roughness: 0.5 })); tstock.position.set(0.32, 0.8, 0); E.add(tstock);
    this.sparks.floorY = 0.32; this.sparks.floors = [];
  }

  // =================================================================
  //  Campo abierto (gasoducto)
  // =================================================================
  _field() {
    const E = this.envRoot;
    const sky = new Sky(); sky.scale.setScalar(450000);
    const u = sky.material.uniforms; u.turbidity.value = 4; u.rayleigh.value = 1.2; u.mieCoefficient.value = 0.003; u.mieDirectionalG.value = 0.8;
    const sunDir = new V3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(55), THREE.MathUtils.degToRad(140)); u.sunPosition.value.copy(sunDir);
    const skyScene = new THREE.Scene(); skyScene.add(sky);
    this.scene.environment = this.pmrem.fromScene(skyScene).texture; this.scene.environmentIntensity = 0.9;
    E.add(sky); this.scene.fog = new THREE.FogExp2('#c3cdd6', 0.018);
    const c = TX.concreteSet();
    const rep = (t, x, y) => { const k = t.clone(); k.needsUpdate = true; k.repeat.set(x, y); return k; };
    const dirtMat = std({ map: rep(c.map, 24, 2), normalMap: rep(c.normalMap, 24, 2), color: '#8a7350', roughness: 1 });
    const grassMat = std({ map: rep(c.map, 40, 40), normalMap: rep(c.normalMap, 40, 40), color: '#5f7d3a', roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), grassMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; E.add(ground);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(60, 4), dirtMat); strip.rotation.x = -Math.PI / 2; strip.position.y = 0.005; strip.receiveShadow = true; E.add(strip);
    const ditch = new THREE.Mesh(new THREE.BoxGeometry(60, 0.02, 0.9), std({ color: '#4a3b28', roughness: 1 })); ditch.position.set(0, 0.012, -1.0); E.add(ditch);
    const sun = new THREE.DirectionalLight('#fff1d6', 3.0); sun.position.copy(sunDir).multiplyScalar(10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 30 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.01;
    E.add(sun, sun.target, new THREE.HemisphereLight('#d6e6ff', '#4f5a30', 0.7));
    // colinas y árboles lejanos
    for (let i = 0; i < 9; i++) { const h = new THREE.Mesh(new THREE.SphereGeometry(12 + Math.random() * 10, 32, 16), std({ color: i % 2 ? '#5d7a3c' : '#6e8a45', roughness: 1 })); h.scale.y = 0.35; h.position.set(-50 + i * 13, -2, -45 - Math.random() * 10); E.add(h); }
    for (let i = 0; i < 26; i++) {
      const t = new THREE.Group(); const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.6, 8), std({ color: '#5a4030', roughness: 1 })); trunk.position.y = 0.8;
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + Math.random() * 0.5, 4), std({ color: ['#3f6b2c', '#4d7a33', '#355e27'][i % 3], roughness: 0.95, map: c.map })); crown.position.y = 2.1; crown.scale.y = 1.2;
      t.add(trunk, crown); t.position.set(-30 + Math.random() * 60, 0, (Math.random() > 0.5 ? -1 : 1) * (6 + Math.random() * 14)); t.traverse(o => { o.castShadow = true; }); E.add(t);
    }
    // polines de madera
    for (const x of [-0.9, 0.9]) { const sk = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.32, 0.5, 2, 0.01), std({ color: '#7a5634', roughness: 0.95 })); sk.position.set(x, 0.16, 0); sk.castShadow = sk.receiveShadow = true; E.add(sk); }
    // tubos apilados al fondo
    for (let k = 0; k < 5; k++) { const pp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 6, 32, 1, true), std({ color: '#1d1f22', roughness: 0.6, side: THREE.DoubleSide })); pp.rotation.z = Math.PI / 2; pp.position.set(-1 + (k % 3) * 0.0, 0.11 + Math.floor(k / 3) * 0.2, -3.2 - (k % 3) * 0.23); pp.castShadow = true; E.add(pp); }
    this.sparks.floorY = 0; this.sparks.floors = [];
  }

  // =================================================================
  //  Máquina de soldar con display y perillas
  // =================================================================
  _buildMachine(kind) {
    const g = new THREE.Group(); const field = kind === 'exterior' || kind === 'campo'; const ebw = kind === 'camara';
    const bodyCol = field ? '#d6a21e' : ebw ? '#cfd3d6' : '#1f4f8e';
    const W = field ? 0.7 : 0.42, H = field ? 0.55 : 0.36, D = field ? 0.5 : 0.55;
    const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 4, 0.02), std({ color: bodyCol, metalness: 0.35, roughness: 0.45 })); body.position.y = H / 2; body.castShadow = body.receiveShadow = true; g.add(body);
    if (!field && !ebw) { // carrito
      const cart = new THREE.Mesh(new RoundedBoxGeometry(W + 0.06, 0.03, D + 0.06, 2, 0.01), std({ color: '#2b2d30', metalness: 0.7, roughness: 0.5 })); cart.position.y = -0.015; g.add(cart);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 20), std({ color: '#111' })); w.rotation.z = Math.PI / 2; w.position.set(x * W / 2, -0.07, z * D / 2.2); g.add(w); }
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.03), std({ color: '#2b2d30' })); leg.position.set(0, -0.3, -D / 2); g.add(leg);
    }
    if (field) { const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 16), std({ color: '#333', metalness: 0.8, roughness: 0.4 })); ex.position.set(W * 0.3, H + 0.2, -D * 0.2); g.add(ex); }
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 300; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.86, H * 0.5), std({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 0.3 }));
    panel.position.set(0, H * 0.68, D / 2 + 0.002); g.add(panel);
    const knobs = [];
    for (let i = 0; i < 4; i++) {
      const k = new THREE.Group(); const kb = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.025, 32), std({ color: '#111', roughness: 0.4 })); kb.rotation.x = Math.PI / 2; k.add(kb);
      const mk = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.018, 0.004), std({ color: '#ff7a1a', emissive: '#ff7a1a', emissiveIntensity: 0.6 })); mk.position.set(0, 0.012, 0.014); k.add(mk);
      k.position.set(-W * 0.33 + i * W * 0.22, H * 0.22, D / 2 + 0.012); g.add(k); knobs.push(k);
    }
    for (const x of [-W * 0.38, W * 0.38]) { const term = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 16), std({ color: '#c0392b', roughness: 0.5 })); term.rotation.x = Math.PI / 2; term.position.set(x, H * 0.08, D / 2 + 0.015); g.add(term); }
    const pos = { taller: [0.95, 0.12, 0.42, -0.5], industrial: [0.95, 0.12, 0.42, -0.5], exterior: [-0.95, 0, 0.45, 0.9], campo: [-1.2, 0, 0.9, 0.7], camara: [0.75, 0.32, 0.55, -0.9] }[kind] || [0.95, 0.12, 0.42, -0.5];
    g.position.set(pos[0], pos[1] + (kind === 'taller' || kind === 'industrial' ? 0.07 : 0), pos[2]); g.rotation.y = pos[3];
    this.envRoot.add(g);
    this.machine = { group: g, canvas: cv, tex, knobs, W, H, D, title: field ? 'MOTOSOLDADOR 400' : ebw ? 'EBW CONTROL 60 kV' : 'WELD-PRO 3000' };
    this.setMachine({ lines: ['LISTO'], knobs: [0.4, 0.5, 0.5, 0.5] });
  }

  setMachine({ lines = [], knobs = null, big = null } = {}) {
    const M = this.machine; if (!M) return; const g = M.canvas.getContext('2d');
    g.fillStyle = '#121416'; g.fillRect(0, 0, 512, 300);
    g.fillStyle = '#0a2412'; g.fillRect(24, 50, 464, 170);
    g.fillStyle = '#d7dde3'; g.font = 'bold 28px Arial'; g.fillText(M.title, 24, 36);
    g.fillStyle = '#5dff8f'; g.font = 'bold 64px monospace'; if (big) g.fillText(big, 40, 125);
    g.font = 'bold 26px monospace'; lines.slice(0, big ? 3 : 5).forEach((l, i) => g.fillText(l, 40, (big ? 165 : 90) + i * 32));
    g.fillStyle = '#888'; g.font = '20px Arial'; ['A', 'V/Pol', 'Gas', '—'].forEach((t, i) => g.fillText(t, 70 + i * 112, 285));
    M.tex.needsUpdate = true;
    if (knobs) knobs.forEach((f, i) => { if (M.knobs[i] && f != null) M.knobs[i].userData.target = (-0.75 + 1.5 * f) * Math.PI; });
  }

  focusMachine() {
    const M = this.machine; if (!M) return;
    const front = new V3(0, M.H * 0.5, 0).applyMatrix4(M.group.matrixWorld);
    const dir = new V3(0, 0, 1).applyQuaternion(M.group.quaternion);
    this.setCameraMode('orbit', { reset: false }); this._flyTo(front.clone().addScaledVector(dir, 0.75).add(new V3(0, 0.22, 0)), front);
  }

  // =================================================================
  //  Horno de electrodos
  // =================================================================
  _buildOven(kind) {
    if (kind === 'camara') { this.oven = null; return; }
    const g = new THREE.Group(); const portable = kind === 'exterior' || kind === 'campo';
    const steel = std({ color: portable ? '#2d2f33' : '#6f7479', metalness: 0.6, roughness: 0.45 });
    let door;
    if (portable) {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.5, 32), steel); body.rotation.z = Math.PI / 2; body.position.y = 0.09; body.castShadow = true; g.add(body);
      door = new THREE.Group(); const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.03, 32), std({ color: '#b5281c', roughness: 0.5 })); lid.rotation.z = Math.PI / 2; lid.position.set(0, 0, 0.0); door.add(lid);
      door.position.set(0.265, 0.09, 0); g.add(door);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 8, 24, Math.PI), std({ color: '#111' })); handle.position.set(0, 0.17, 0); g.add(handle);
      g.position.set(0.42, 0, 0.42);
    } else {
      const body = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.34, 0.36, 3, 0.015), steel); body.position.y = 0.17; body.castShadow = true; g.add(body);
      door = new THREE.Group(); const dp = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.26, 0.02, 2, 0.006), std({ color: '#53585e', metalness: 0.6, roughness: 0.4 })); dp.position.set(0.15, 0, 0); door.add(dp);
      const hd = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), std({ color: '#111' })); hd.position.set(0.27, 0, 0.02); door.add(hd);
      door.position.set(-0.18, 0.16, 0.185); g.add(door);
      g.position.set(-0.45, TABLE_Y, -0.28);
      if (kind === 'industrial' || kind === 'taller') g.position.y = TABLE_Y;
    }
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.045), std({ map: tex, emissiveMap: tex, emissive: '#fff', emissiveIntensity: 0.8 }));
    if (portable) { disp.position.set(0, 0.12, 0.077); } else disp.position.set(0.12, 0.3, 0.181);
    g.add(disp);
    // electrodos
    const bundle = new THREE.Group(); for (let i = 0; i < 10; i++) { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.35, 8), std({ color: '#b8ae9a', roughness: 0.9 })); e.rotation.z = Math.PI / 2; e.position.set(0, (i % 3) * 0.007, Math.floor(i / 3) * 0.007); bundle.add(e); }
    bundle.visible = false; this.envRoot.add(bundle);
    this.envRoot.add(g); this.oven = { group: g, door, tex, cv, bundle, portable };
    this.setOvenDisplay('---');
  }
  setOvenDisplay(t) { const O = this.oven; if (!O) return; const g = O.cv.getContext('2d'); g.fillStyle = '#100'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#ff4030'; g.font = 'bold 64px monospace'; g.fillText(t, 14, 72); O.tex.needsUpdate = true; }

  // =================================================================
  //  Piezas por misión (con bisel y posición elegidos)
  // =================================================================
  loadPiece(mission, design = {}) {
    if (this.piece) { this.scene.remove(this.piece.root); this.beads.forEach(b => b.dispose()); this.beads = []; }
    const root = new THREE.Group(); const orient = new THREE.Group(); const spin = new THREE.Group(); const grp = new THREE.Group();
    grp.scale.setScalar(0.001); root.add(orient); orient.add(spin); spin.add(grp);
    const P = { root, orient, spin, grp, paths: [], profiles: [], rotate: false, focus: new V3(), cleanables: [], design };
    const mat = metalMaterial(mission.material === 'x52' || mission.material === 'sa516' ? 'a36' : mission.material);
    const add = (m, parent = grp) => { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
    const posO = design.pos?.orient || 'asis';
    const geom = design.bevel?.geom;
    if (this.table) this.table.visible = mission.piece !== 'tank';
    switch (mission.piece) {
      case 'bike': {
        root.position.set(0, TABLE_Y + 0.13, 0);
        const R = 19, wall = 1.6;
        const paint = phys({ color: '#b3121b', metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 });
        const tubeBetween = (a, b, r, m) => { const d = new V3().subVectors(b, a); const L = d.length(); const geo = new THREE.CylinderGeometry(r, r, L, 64, 1, true); const mm = add(new THREE.Mesh(geo, m)); mm.position.copy(a).add(b).multiplyScalar(0.5); mm.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); return mm; };
        tubeBetween(new V3(-280, 0, 0), new V3(-28, 0, 0), R, paint); tubeBetween(new V3(28, 0, 0), new V3(260, 0, 0), R, paint);
        P.cleanables.push(tubeBetween(new V3(-28, 0, 0), new V3(-0.4, 0, 0), R, mat), tubeBetween(new V3(0.4, 0, 0), new V3(28, 0, 0), R, mat));
        const inner = add(new THREE.Mesh(new THREE.CylinderGeometry(R - wall, R - wall, 56, 48, 1, true), std({ color: '#222', side: THREE.BackSide, roughness: 0.8 }))); inner.rotation.z = Math.PI / 2;
        const crack = add(new THREE.Mesh(new THREE.TorusGeometry(R + 0.05, 0.35, 8, 96), std({ color: '#050505', roughness: 1 }))); crack.rotation.y = Math.PI / 2;
        const bb = new V3(-280, 0, 0), ht0 = new V3(260, 0, 0), ht1 = new V3(215, 150, 0), st1 = new V3(-330, 380, 0);
        tubeBetween(bb, st1, 16, paint); tubeBetween(ht0.clone().add(new V3(15, -40, 0)), ht1.clone().add(new V3(-10, 40, 0)), 22, paint); tubeBetween(st1, ht1, 17, paint);
        const bbShell = add(new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 70, 48), paint)); bbShell.rotation.x = Math.PI / 2; bbShell.position.copy(bb);
        const dc = document.createElement('canvas'); dc.width = 512; dc.height = 128; const dg = dc.getContext('2d'); dg.fillStyle = '#fff'; dg.font = 'italic bold 86px Arial'; dg.fillText('BMX·RAYO', 20, 95);
        const dt = new THREE.CanvasTexture(dc); dt.colorSpace = THREE.SRGBColorSpace;
        const decal = add(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.2, R + 0.2, 150, 48, 1, true, -0.5, 1.0), std({ map: dt, transparent: true, roughness: 0.3 }))); decal.rotation.z = Math.PI / 2; decal.position.x = 140;
        const jig = std({ color: '#2e6fb0', metalness: 0.5, roughness: 0.4 });
        for (const x of [-180, 180]) { const post = add(new THREE.Mesh(new RoundedBoxGeometry(40, 110, 60, 2, 3), jig), root); post.scale.setScalar(0.001); post.position.set(x / 1000, -0.075, 0); const cl = add(new THREE.Mesh(new THREE.TorusGeometry(R + 4, 4, 12, 48), std({ color: '#888', metalness: 1, roughness: 0.3 })), root); cl.scale.setScalar(0.001); cl.rotation.y = Math.PI / 2; cl.position.x = x / 1000; }
        P.rotate = posO === 'roll';
        P.paths.push(circPath(0, R, P.rotate ? Math.PI / 2 : Math.PI / 2 + 1.6, mission.lengthMm, P.rotate ? -1 : -1));
        if (posO === 'fixed') P.paths[0] = circPath(0, R, -Math.PI / 2, mission.lengthMm, 1);
        if (posO === 'overhead') P.paths[0] = circPath(0, R, -Math.PI / 2 - 0.8, mission.lengthMm, 1);
        P.profiles.push({ base: 'flat', w: 6, r: 1.2, pow: 0.55, ripple: 1.3 });
        P.focus.set(0, TABLE_Y + 0.13, 0); P.viewDist = 0.45;
        break;
      }
      case 'column': {
        root.position.set(0, 0.3, 0);
        const paint = TX.millScaleSet({ paint: '#2f5d3a', rust: 0.7, seed: 4 });
        const cm = std({ map: paint.map, roughnessMap: paint.roughnessMap, metalnessMap: paint.metalnessMap, metalness: 1, roughness: 1, normalMap: paint.normalMap });
        const heb = this._heb(2.55, cm, false); heb.scale.setScalar(1); grp.add(heb);
        const plate = add(new THREE.Mesh(new RoundedBoxGeometry(300, 15, 300, 2, 1.5), metalMaterial('a36'))); plate.position.y = 7.5;
        for (const [x, z] of [[-120, -120], [120, -120], [-120, 120], [120, 120]]) { const bolt = add(new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 30, 6), std({ color: '#444', metalness: 0.9, roughness: 0.5 }))); bolt.position.set(x, 20, z); }
        const stripA = add(new THREE.Mesh(new THREE.BoxGeometry(160, 0.6, 30), metalMaterial('a36'))); stripA.position.set(0, 15.3, 95);
        const stripB = add(new THREE.Mesh(new THREE.BoxGeometry(160, 30, 0.6), cm)); stripB.position.set(0, 30, 80.3);
        P.cleanables.push(stripA, stripB);
        P.paths.push(linearPath(new V3(-55, 15, 80), new V3(1, 0, 0), new V3(0, 1, 1), mission.lengthMm));
        P.profiles.push({ base: 'fillet', w: 10, r: 1.6, pow: 0.7, ripple: 2.2 });
        P.focus.set(0, 0.33, 0.08); P.viewDist = 0.6;
        break;
      }
      case 'bridge': {
        const T = 25, W = 150, L = 160;
        const g = geom || { type: 'V', angle: 60, land: 2, gap: 2.5 };
        const half = g.gap / 2, tanA = Math.tan(THREE.MathUtils.degToRad((g.angle || 60) / 2)), land = g.land ?? 2;
        const shape = (sgn) => {
          const s = new THREE.Shape(); const pts = [];
          if (g.type === 'I') pts.push([half, 0], [half, T]);
          else if (g.type === 'X') { const hb = (T - land) / 2; pts.push([half + hb * tanA, 0], [half, hb], [half, hb + land], [half + hb * tanA, T]); }
          else pts.push([half, 0], [half, land], [half + (T - land) * tanA, T]);
          pts.push([W, T], [W, 0]);
          s.moveTo(sgn * pts[0][0], pts[0][1]); for (const [x, y] of pts.slice(1)) s.lineTo(sgn * x, y); s.lineTo(sgn * pts[0][0], pts[0][1]); return s;
        };
        for (const sgn of [-1, 1]) {
          const geo = new THREE.ExtrudeGeometry(shape(sgn), { depth: L, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2 });
          geo.translate(0, 0, -L / 2); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 160, uv.getY(i) / 160);
          const m = add(new THREE.Mesh(geo, metalMaterial('s355'))); m.rotation.y = Math.PI / 2;
        }
        if (g.type !== 'X') { const back = add(new THREE.Mesh(new RoundedBoxGeometry(L, 6, 24, 2, 1), std({ color: '#d8cdb5', roughness: 0.95 }))); back.position.set(0, -3, 0); }
        const width = y => g.type === 'I' ? g.gap + 2 : g.type === 'X' ? 2 * (half + Math.abs(y - T / 2) * tanA) : 2 * (half + Math.max(0, y - land) * tanA);
        const levels = [{ y: 0.5, top: 6 }, { y: 6, top: 16.5 }, { y: 16.5, top: T + 2 }];
        for (const lv of levels) { P.paths.push(linearPath(new V3(-40, lv.y, 0), new V3(1, 0, 0), new V3(0, 1, 0), mission.lengthMm)); P.profiles.push({ base: 'flat', w: Math.max(6, width(lv.top - 1) + (lv.top > T ? 3 : 1)), r: lv.top - lv.y, pow: lv.y < 1 ? 0.5 : 0.17, ripple: 2.6 }); }
        // posición: 1G sobre la mesa, 3G / 2G / 4G en un posicionador
        const raised = posO !== 'flat';
        root.position.set(0, TABLE_Y + (raised ? 0.24 : 0.006), 0);
        if (posO === 'vertical') orient.rotation.z = Math.PI / 2;
        if (posO === 'horizontal') orient.rotation.x = -Math.PI / 2;
        if (posO === 'overhead') orient.rotation.x = Math.PI;
        if (raised) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.24, 20), std({ color: '#2b2d30', metalness: 0.8, roughness: 0.4 })); post.position.set(-0.2, -0.12, -0.12); post.castShadow = true; root.add(post); const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.2), post.material); arm.position.set(-0.2, 0, -0.05); root.add(arm); }
        P.focus.set(0, TABLE_Y + (raised ? 0.24 : 0.02), 0); P.viewDist = 0.5;
        break;
      }
      case 'pipe': {
        root.position.set(0, TABLE_Y + 0.11, 0);
        const R = 19.05, wall = 2;
        for (const sgn of [-1, 1]) {
          const tube = add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, 240, 96, 1, true), mat)); tube.rotation.z = Math.PI / 2; tube.position.x = sgn * 120.4;
          const inn = add(new THREE.Mesh(new THREE.CylinderGeometry(R - wall, R - wall, 240, 64, 1, true), std({ color: '#888', metalness: 1, roughness: 0.3, side: THREE.BackSide }))); inn.rotation.z = Math.PI / 2; inn.position.x = sgn * 120.4;
          const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.6, R + 0.6, 30, 48), std({ color: '#2a5fbf', roughness: 0.6 }))); cap.rotation.z = Math.PI / 2; cap.position.x = sgn * 236; cap.visible = false; P.caps = P.caps || []; P.caps.push(cap);
          const roll = new THREE.Group();
          for (const z of [-14, 14]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 20, 32), std({ color: '#333', metalness: 0.8, roughness: 0.4 })); w.rotation.z = Math.PI / 2; w.position.set(0, -R - 3, z); w.castShadow = true; roll.add(w); }
          const base = new THREE.Mesh(new RoundedBoxGeometry(40, 90, 60, 2, 3), std({ color: '#2e6fb0', metalness: 0.5, roughness: 0.4 })); base.position.y = -R - 55; base.castShadow = true; roll.add(base);
          roll.scale.setScalar(0.001); roll.position.x = sgn * 0.15; root.add(roll);
        }
        const ring = add(new THREE.Mesh(new THREE.TorusGeometry(R + 0.1, 0.25, 8, 96), std({ color: '#111', roughness: 1 }))); ring.rotation.y = Math.PI / 2;
        P.rotate = posO === 'roll';
        P.paths.push(posO === 'roll' ? circPath(0, R, Math.PI / 2, mission.lengthMm) : circPath(0, R, -Math.PI / 2, mission.lengthMm, 1));
        if (posO === 'tilt45') orient.rotation.z = Math.PI / 4;
        P.profiles.push({ base: 'flat', w: 5.5, r: 0.9, pow: 0.5, ripple: 1.1 });
        P.focus.set(0, TABLE_Y + 0.11, 0); P.viewDist = 0.4;
        break;
      }
      case 'gasline': {
        root.position.set(0, 0.32 + 0.11, 0);
        const R = 109.5, wall = 8.2, g = geom || { type: 'V', angle: 60, land: 1.6, gap: 1.6 };
        const tanA = Math.tan(THREE.MathUtils.degToRad((g.angle || 60) / 2)), half = g.gap / 2, land = g.land ?? 1.6;
        const coat = std({ color: '#141516', roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide });
        const steel = metalMaterial('a36'); steel.side = THREE.DoubleSide;
        for (const sgn of [-1, 1]) {
          const prof = [[R - wall, half], [R - wall + land, half], [R, half + (wall - land) * tanA], [R, 60], [R, 60.01], [R + 1.5, 60.5], [R + 1.5, 1300], [R - wall, 1300]];
          const pts = prof.map(([r, x]) => new THREE.Vector2(r, x)); if (sgn > 0) {}
          const geo = new THREE.LatheGeometry(pts, 128); const m = new THREE.Mesh(geo, [steel]);
          // material por zonas: acero desnudo cerca del bisel y recubrimiento después
          const bare = new THREE.Mesh(new THREE.LatheGeometry(prof.slice(0, 4).map(([r, x]) => new THREE.Vector2(r, x)), 128), steel);
          const coated = new THREE.Mesh(new THREE.LatheGeometry(prof.slice(4, 7).map(([r, x]) => new THREE.Vector2(r, x)), 128), coat);
          const innerW = new THREE.Mesh(new THREE.CylinderGeometry(R - wall, R - wall, 1300 - half, 96, 1, true), std({ color: '#2a2b2d', roughness: 0.8, side: THREE.BackSide }));
          innerW.position.y = (1300 + half) / 2;
          const holder = new THREE.Group(); holder.add(bare, coated, innerW); holder.rotation.z = sgn > 0 ? -Math.PI / 2 : Math.PI / 2;
          holder.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } }); grp.add(holder);
          P.cleanables.push(bare);
          // estampado
          if (sgn > 0) { const sc = document.createElement('canvas'); sc.width = 512; sc.height = 64; const sg = sc.getContext('2d'); sg.fillStyle = '#e8e8e8'; sg.font = 'bold 40px Arial'; sg.fillText('API 5L X52 PSL2  8 5/8" x 0.322"', 6, 46); const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
            const lab = new THREE.Mesh(new THREE.CylinderGeometry(R + 1.6, R + 1.6, 400, 48, 1, true, -0.3, 0.6), std({ map: st, transparent: true, roughness: 0.6 })); lab.rotation.z = -Math.PI / 2; lab.position.x = 500; grp.add(lab); }
        }
        // grapa de alineación externa
        const clampMat = std({ color: '#9a3a1a', metalness: 0.6, roughness: 0.5 });
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; const bar = new THREE.Mesh(new THREE.BoxGeometry(160, 10, 10), clampMat); bar.position.set(0, Math.cos(a) * (R + 14), Math.sin(a) * (R + 14)); bar.visible = false; grp.add(bar); (P.clampBars ||= []).push(bar); }
        const desc = design.pos?.id !== '5G-A';
        const rr = R - wall + land + 1.5;
        P.paths.push(desc ? circPath(0, rr, Math.PI / 2, mission.lengthMm * rr / R, -1) : circPath(0, rr, -Math.PI / 2, mission.lengthMm * rr / R, 1));
        P.paths.push(desc ? circPath(0, R - 0.5, Math.PI / 2, mission.lengthMm, -1) : circPath(0, R - 0.5, -Math.PI / 2, mission.lengthMm, 1));
        P.paths[1].frontFace = true; P.paths[0].frontFace = true;
        P.profiles.push({ base: 'flat', w: 5, r: 2.5, pow: 0.5, ripple: 2 }, { base: 'flat', w: g.gap + 2 * (wall - land) * tanA + 3, r: 2, pow: 0.45, ripple: 2.4 });
        P.focus.set(0, 0.43, 0); P.viewDist = 0.8;
        break;
      }
      case 'tank': {
        const R = 500, Lt = 2600;
        root.position.set(0, 0.25 + R / 1000, 0);
        const paint = std({ color: '#d4d5cf', roughness: 0.62, metalness: 0.05 });
        const shell = add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, Lt, 128, 1, true), paint), grp); shell.rotation.z = Math.PI / 2;
        for (const sgn of [-1, 1]) { const head = add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 32, 0, Math.PI * 2, 0, Math.PI / 2), paint)); head.scale.set(1, 0.5, 1); head.rotation.z = -sgn * Math.PI / 2; head.position.x = sgn * Lt / 2; }
        const seam = add(new THREE.Mesh(new THREE.TorusGeometry(R + 0.8, 2.2, 8, 256), std({ color: '#b8b9b4', roughness: 0.6, metalness: 0.3 }))); seam.rotation.y = Math.PI / 2;
        const thetaC = posO === 'horizontal' ? 0.25 : posO === 'overhead' ? -Math.PI / 2 : Math.PI / 2;
        P.zoneTheta = thetaC;
        const segPath = circPath(0, R + 0.5, thetaC + 60 / R, 120, -1);
        const segCurve = new THREE.CatmullRomCurve3(Array.from({ length: 21 }, (_, k) => segPath.frame(k / 20 * 120).p));
        const crackLine = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 21 }, (_, k) => segPath.frame(40 + k / 20 * 40).p)), 20, 0.7, 6), std({ color: '#0a0a0a', roughness: 1 })));
        const groove = add(new THREE.Mesh(new THREE.TubeGeometry(segCurve, 40, 4.5, 10), std({ color: '#2b2a28', metalness: 0.7, roughness: 0.5 }))); groove.visible = false;
        P.groove = groove; P.crackLine = crackLine;
        // placa ASME
        const pc = document.createElement('canvas'); pc.width = 512; pc.height = 256; const pg = pc.getContext('2d'); pg.fillStyle = '#c9c2a8'; pg.fillRect(0, 0, 512, 256); pg.fillStyle = '#222'; pg.font = 'bold 34px Arial'; pg.fillText('ASME  Ⓤ  SA-516-70', 20, 60); pg.font = '28px Arial'; pg.fillText('MAWP 250 psi @ 65 °C', 20, 110); pg.fillText('GLP · 2000 L · 10 mm', 20, 155); pg.fillText('Año 2009 · S/N 44871', 20, 200);
        const pt = new THREE.CanvasTexture(pc); pt.colorSpace = THREE.SRGBColorSpace; const plate = add(new THREE.Mesh(new THREE.PlaneGeometry(160, 80), std({ map: pt, metalness: 0.6, roughness: 0.4 }))); plate.position.set(-700, 0, R + 2);
        const valve = add(new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 60, 24), std({ color: '#b08d57', metalness: 1, roughness: 0.3 }))); valve.position.set(600, R + 30, 0);
        const manway = add(new THREE.Mesh(new THREE.CylinderGeometry(60, 60, 30, 32), std({ color: '#cfd0cc', roughness: 0.5 }))); manway.position.set(-600, R + 10, 0); P.manway = new V3(-600, R + 40, 0);
        // rodillos giratorios
        const rollerMat = std({ color: '#2d6a9e', metalness: 0.4, roughness: 0.5 });
        for (const x of [-0.8, 0.8]) for (const z of [-0.32, 0.32]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 32), std({ color: '#222', metalness: 0.6, roughness: 0.5 })); w.rotation.z = Math.PI / 2; w.position.set(x, -R / 1000 - 0.02 + 0.07, z); w.castShadow = true; root.add(w); }
        for (const x of [-0.8, 0.8]) { const base = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.12, 0.85, 2, 0.01), rollerMat); base.position.set(x, -R / 1000 - 0.19, 0); base.castShadow = true; root.add(base); }
        P.rotate = posO === 'roll';
        P.paths.push(circPath(0, R + 1, thetaC + 60 / R, mission.lengthMm, -1), circPath(0, R + 3, thetaC + 60 / R, mission.lengthMm, -1));
        P.profiles.push({ base: 'flat', w: 8, r: 2, pow: 0.5, ripple: 2 }, { base: 'flat', w: 14, r: 2.2, pow: 0.45, ripple: 2.5 });
        P.focus.set(0, 0.25 + R / 1000, 0); P.viewDist = 1.6;
        if (P.rotate) P.spin.rotation.x = 0;
        break;
      }
      case 'drum': {
        root.position.set(0, 1.0, 0);
        const R = mission.lengthMm / (2 * Math.PI);
        const prof = (sgn) => { const pts = []; const rIn = R - 12; const L = 70; const ps = [[rIn, 0], [R, 0], [R, 8], [R + 2, 12], [R + 2, 30], [R + 14, 34], [R + 14, 44], [R + 2, 48], [R, L], [rIn + 6, L], [rIn + 6, 20], [rIn, 16], [rIn, 0]]; for (const [r, x] of ps) pts.push(new THREE.Vector2(r, sgn * x + sgn * 0.05)); if (sgn < 0) pts.reverse(); return pts; };
        for (const sgn of [-1, 1]) { const m = new THREE.Mesh(new THREE.LatheGeometry(prof(sgn), 160), mat); m.rotation.z = -Math.PI / 2; m.castShadow = m.receiveShadow = true; grp.add(m); }
        const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.05, 0.15, 8, 160), std({ color: '#1a1a1a', roughness: 1 })); ring.rotation.y = Math.PI / 2; grp.add(ring);
        P.paths.push(circPath(0, R, Math.PI / 2, mission.lengthMm));
        P.profiles.push({ base: 'flat', w: 2.6, r: 0.45, pow: 0.6, ripple: 0.7 });
        P.rotate = true; P.focus.set(0, 1.0 + R * 0.001, 0); P.viewDist = 0.35;
        break;
      }
    }
    this.scene.add(root); this.piece = P; this.mission = mission;
    root.updateMatrixWorld(true);
    return P;
  }

  setCleaned(clean, matId) {
    if (!this.piece) return;
    for (const m of this.piece.cleanables) {
      if (!clean) continue;
      if (['a36', 's355', 'x52', 'sa516'].includes(matId)) { m.material = metalMaterial('a36', 'clean'); m.visible = true; }
      else if (matId === 'al6061') m.material = std({ color: '#dfe2e6', metalness: 1, roughness: 0.3, ...TX.brushedSet('ground', 6) });
    }
  }
  showCaps(on) { (this.piece?.caps || []).forEach(c => c.visible = on); }
  showClamp(on) { (this.piece?.clampBars || []).forEach(c => c.visible = on); }

  // =================================================================
  //  Herramientas de soldadura
  // =================================================================
  setTool(pid, matId) {
    if (this.tool) { this.scene.remove(this.tool); this.tool = null; }
    if (this.beam) { this.scene.remove(this.beam); this.beam = null; }
    if (this.rod) { this.scene.remove(this.rod); this.rod = null; }
    this.electrode = null; this.jaw = null; this.flame = null;
    const g = new THREE.Group(); const inner = new THREE.Group(); inner.scale.setScalar(0.001); g.add(inner);
    const black = std({ color: '#151515', roughness: 0.55 }); const copper = std({ color: '#b87333', metalness: 1, roughness: 0.3 }); const brass = std({ color: '#b08d57', metalness: 1, roughness: 0.3 });
    const lathe = (pts, m) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 48), m);
    this.toolKind = PROC_TOOL[pid] || 'mig';
    switch (this.toolKind) {
      case 'tig': {
        const tung = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 22, 16), std({ color: '#9a9ea3', metalness: 1, roughness: 0.25 })); tung.position.y = 11; inner.add(tung);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.2, 16), tung.material); tip.rotation.x = Math.PI; tip.position.y = -1.1; inner.add(tip);
        inner.add(lathe([[3, 4], [4.2, 4], [6.5, 12], [7.5, 22], [7.5, 24], [3, 24]], std({ color: '#d68e82', roughness: 0.85 })));
        const head = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 46, 32), black); head.position.y = 46; inner.add(head);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 55, 32), black); cap.position.y = 95; inner.add(cap);
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 120, 32), std({ color: '#2a2a2a', roughness: 0.75 })); handle.rotation.z = Math.PI / 2.6; handle.position.set(55, 60, 0); inner.add(handle);
        const rodCol = ['a36', 's355', 'x52', 'sa516'].includes(matId) ? '#b87333' : '#c8ccd0';
        const rod = new THREE.Group(); const rm = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.32, 12), std({ color: rodCol, metalness: 1, roughness: 0.3 })); rm.position.y = 0.16; rod.add(rm); this.rod = rod; rod.visible = false; this.scene.add(rod);
        this.toolTip = 2.0; break;
      }
      case 'stinger': {
        const el = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 300, 16), std({ color: '#b8ae9a', roughness: 0.9 })); el.position.y = 150; inner.add(el); this.electrode = el;
        const tipm = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3, 12), std({ color: '#555', metalness: 1, roughness: 0.4 })); inner.add(tipm);
        const jaw = new THREE.Group(); const j1 = new THREE.Mesh(new RoundedBoxGeometry(30, 70, 30, 2, 4), std({ color: '#b5281c', roughness: 0.5 })); j1.position.set(0, 35, 0); jaw.add(j1);
        const hdl = new THREE.Mesh(new THREE.CylinderGeometry(13, 15, 150, 24), black); hdl.position.set(0, 140, 0); jaw.add(hdl);
        jaw.position.y = 300; jaw.rotation.z = 0.9; jaw.position.x = 20; inner.add(jaw); this.jaw = jaw;
        this.toolTip = 0; break;
      }
      case 'oaw': {
        inner.add(lathe([[1, 0], [3, 0], [4, 40], [5, 120], [1, 120]], copper));
        const body = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 180, 24), brass); body.position.set(60, 180, 0); body.rotation.z = 0.7; inner.add(body);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(2, 10, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.8, 3), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); flame.rotation.x = Math.PI; flame.position.y = -5; inner.add(flame); this.flame = flame;
        this.toolTip = 3; break;
      }
      case 'ebw': case 'laser': case 'saw': {
        if (this.toolKind !== 'ebw') { inner.add(lathe([[5, 0], [12, 0], [25, 60], [25, 220], [5, 220]], std({ color: '#d0d3d6', metalness: 1, roughness: 0.25 }))); this.toolTip = 8; }
        const bm = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12, 1, true), new THREE.MeshBasicMaterial({ color: this.toolKind === 'laser' ? new THREE.Color(4, 0.6, 0.3) : new THREE.Color(1.6, 2.2, 6), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
        this.beam = bm; bm.visible = false; this.scene.add(bm);
        if (this.toolKind === 'ebw') { this.toolTip = 0; g.visible = false; }
        break;
      }
      default: {
        inner.add(lathe([[6.5, 0], [8, 0], [9.5, 25], [9.5, 55], [6.5, 55]], brass));
        inner.add(lathe([[0.6, -2], [2.5, -1], [3, 15], [0.6, 15]], copper));
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6, 8), std({ color: '#b87333', metalness: 1, roughness: 0.3 })); wire.position.y = -4; inner.add(wire);
        const neck = new THREE.CatmullRomCurve3([new V3(0, 55, 0), new V3(0, 110, 0), new V3(40, 160, 0), new V3(110, 185, 0)]); inner.add(new THREE.Mesh(new THREE.TubeGeometry(neck, 32, 8, 16), black));
        const hdl = new THREE.Mesh(new THREE.CylinderGeometry(15, 13, 130, 24), std({ color: '#c8102e', roughness: 0.5 })); hdl.position.set(170, 205, 0); hdl.rotation.z = Math.PI / 2.4; inner.add(hdl);
        this.toolTip = 8; break;
      }
    }
    inner.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.tool = g; this.scene.add(g); g.visible = false;
  }

  _buildArc() {
    this.arcLight = new THREE.PointLight('#cfe0ff', 0, 3, 2); this.arcLight.castShadow = true; this.arcLight.shadow.mapSize.set(512, 512); this.arcLight.shadow.bias = -0.002; this.arcLight.shadow.camera.near = 0.003;
    this.scene.add(this.arcLight);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.radialGlow(), color: new THREE.Color(4, 4.4, 5), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, transparent: true }));
    this.glow.visible = false; this.scene.add(this.glow);
    this.glow2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.radialGlow('rgba(255,255,255,1)', 'rgba(120,160,255,0.35)'), color: new THREE.Color(1.5, 1.7, 2.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
    this.glow2.visible = false; this.scene.add(this.glow2);
    this.labelBox = document.createElement('div'); this.labelBox.className = 'labels3d'; document.body.appendChild(this.labelBox); this.labels = [];
    this.tweens = [];
  }

  // Marco de soldadura en coordenadas del mundo
  frameWorld(pass, s, setSpin = true) {
    const P = this.piece; const path = P.paths[pass] || P.paths[0];
    if (P.rotate && setSpin && path.theta) P.spin.rotation.x = path.theta(s) - Math.PI / 2 - (P.zoneTheta !== undefined ? P.zoneTheta - Math.PI / 2 : 0);
    P.root.updateMatrixWorld(true);
    const f = path.frame(s); const M = P.grp.matrixWorld;
    const p = f.p.clone().applyMatrix4(M); const nm = new THREE.Matrix3().getNormalMatrix(M);
    return { p, n: f.n.clone().applyMatrix3(nm).normalize(), t: f.t.clone().applyMatrix3(nm).normalize(), b: f.b.clone().applyMatrix3(nm).normalize(), local: f };
  }
  jointFrame(u, pass = 0) { const L = (this.piece.paths[pass] || this.piece.paths[0]).length; return this.frameWorld(pass, u * L, false); }

  beginPass(pass, matId, opts = {}) {
    const P = this.piece; const prof = P.profiles[pass];
    const tintLevel = { ss316l: 0.55, ti64: opts.process === 'EBW' ? 0.0 : 0.6, al6061: 0.5 }[matId] ?? 0.35;
    const bead = new Bead(P.grp, P.paths[pass], { ...prof, matId: ['x52', 'sa516'].includes(matId) ? 'a36' : matId, tintLevel, overlap: opts.overlap || 0 });
    this.sideFlip = undefined;
    this.beads.push(bead); this.curBead = bead; this.curPass = pass; this.tau = { al6061: 1.1, a36: 2.6, s355: 3.2, ss316l: 2.4, ti64: 1.6, x52: 2.4, sa516: 2.6 }[matId] || 2;
    if (this.tool) this.tool.visible = this.toolKind !== 'ebw';
    return bead;
  }

  // Estado de soldadura en cada fotograma
  weldState({ s, lateral = 0, standoff = 1, arc = false, dab = false, heat = 1, slag = false, electrodeLeft = 1, wScale = 1, rScale = 1, blow = 0, wet = 0 }) {
    const P = this.piece; if (!P) return;
    const prof = P.profiles[this.curPass] || P.profiles[0];
    const len = P.paths[this.curPass].length; const ov = this.mission.overlap || 0;
    const f = this.frameWorld(this.curPass, P.paths[this.curPass].circ ? Math.max(0, s) : Math.min(len, Math.max(0, s)));
    const tipPos = f.p.clone().addScaledVector(f.b, lateral * 0.001);
    if (prof.base === 'fillet') tipPos.addScaledVector(f.n, 0.0005);
    const dir = f.n.clone().multiplyScalar(Math.cos(0.26)).addScaledVector(f.t, -Math.sin(0.26)).normalize();
    const so = (STANDOFF_MM[this.toolKind] || 3) * standoff * 0.001;
    if (this.tool) {
      this.tool.position.copy(tipPos).addScaledVector(dir, so + (this.toolTip || 0) * 0.001);
      this.tool.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir);
      if (this.electrode) { const L = Math.max(30, 300 * electrodeLeft); this.electrode.scale.y = L / 300; this.electrode.position.y = L / 2; this.jaw.position.y = L; }
    }
    if (this.rod) {
      const front = tipPos.clone().addScaledVector(f.t, 0.004 - (dab ? 0.003 : 0)).addScaledVector(f.n, dab ? 0.0008 : 0.003);
      const rdir = f.n.clone().multiplyScalar(0.35).addScaledVector(f.t, 0.94).normalize();
      this.rod.position.copy(front); this.rod.quaternion.setFromUnitVectors(new V3(0, 1, 0), rdir); this.rod.visible = true;
    }
    const arcPos = tipPos.clone().addScaledVector(f.n, so * 0.4).addScaledVector(f.t, -blow * 0.005);
    this.arcOn = arc;
    if (this.beam) {
      this.beam.visible = arc;
      if (arc) { const from = this.toolKind === 'ebw' ? this.gunTip.clone() : this.tool.position.clone(); const to = tipPos.clone(); const d = new V3().subVectors(to, from); const L = d.length(); this.beam.position.copy(from).add(to).multiplyScalar(0.5); this.beam.scale.set(0.0006, L, 0.0006); this.beam.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); }
    }
    const k = this.toolKind; const col = ARC_COLOR[k] || ARC_COLOR.mig;
    if (arc) {
      const flick = 0.75 + Math.random() * 0.5 * (k === 'stinger' ? 1.4 : k === 'tig' ? 0.3 : 1) + blow * Math.random();
      this.arcLight.position.copy(arcPos).addScaledVector(f.n, 0.012); this.arcLight.color.set(col.light); this.arcLight.intensity = col.int * flick * heat;
      this.glow.visible = this.glow2.visible = true; this.glow.position.copy(arcPos); this.glow2.position.copy(arcPos);
      const gs = col.size * (0.85 + Math.random() * 0.3) * (0.7 + 0.3 * standoff) * (1 + blow * 0.6); this.glow.scale.set(gs * (1 + blow), gs, gs); this.glow2.scale.set(gs * 2.5, gs * 2.5, gs * 2.5); this.glow.material.color.copy(col.glow);
      if (s >= 0 && s <= len * (1 + ov)) this.curBead.add(Math.min(s, len * (1 + ov)), { w: prof.w * wScale, r: prof.r * rScale, lat: lateral, now: this.time, slag });
      const sp = SPARK[k] || SPARK.mig; const rate = sp.rate * (1 + wet * 2 + blow * 1.5);
      const n = Math.random() < Math.min(1, rate * 0.06) ? Math.ceil(rate * (0.5 + Math.random()) * (standoff > 1.4 ? 1.8 : 1)) : 0;
      const sdir = f.n.clone().multiplyScalar(0.6).addScaledVector(f.t, -0.3 - blow * 1.5);
      if (n) this.sparks.emit(arcPos, n, { speed: sp.speed * (1 + wet * 0.5), up: 0.4, spread: 1.2, dir: sdir });
      if (sp.smoke && Math.random() < sp.smoke * (1 + wet)) this.smoke.emit(arcPos.clone().addScaledVector(f.n, 0.01), sp.smoke * 2 * (1 + wet));
    } else { this.arcLight.intensity = 0; this.glow.visible = this.glow2.visible = false; }
    this.lastFrame = f; this.lastTip = tipPos;
  }

  stopArc() { this.arcOn = false; this.arcLight.intensity = 0; this.glow.visible = this.glow2.visible = false; if (this.beam) this.beam.visible = false; }
  hideTool() { if (this.tool) this.tool.visible = false; if (this.rod) this.rod.visible = false; this.stopArc(); }
  chipSlag() { this.beads.forEach(b => b.chip()); }
  retintAll(level, colors) { this.beads.forEach(b => b.retint(level, colors)); }
  setHelmet(on) { this.helmet = on; }

  // =================================================================
  //  Etiquetas 3D, animaciones y cámara
  // =================================================================
  label(text, pos, ms = 2500, cls = '') {
    const el = document.createElement('div'); el.className = 'lbl3d ' + cls; el.textContent = text; this.labelBox.appendChild(el);
    const L = { el, pos: pos.clone(), until: ms ? performance.now() + ms : Infinity }; this.labels.push(L); return L;
  }
  clearLabels() { this.labels.forEach(l => l.el.remove()); this.labels = []; }
  _updateLabels() {
    const now = performance.now(); const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.labels = this.labels.filter(L => { if (now > L.until) { L.el.remove(); return false; } const v = L.pos.clone().project(this.camera); L.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -130%)`; L.el.style.opacity = v.z < 1 ? 1 : 0; return true; });
  }
  tween(fn) { return new Promise(res => this.tweens.push({ fn, res, t: 0 })); }
  _flyTo(pos, target, dur = 0.9) {
    const p0 = this.camera.position.clone(), t0 = this.controls.target.clone();
    return this.tween((dt, T) => { const k = Math.min(1, T / dur); const e = k * k * (3 - 2 * k); this.camera.position.lerpVectors(p0, pos, e); this.controls.target.lerpVectors(t0, target, e); return k >= 1; });
  }
  focusJoint(u = 0.5, dist = null) {
    const f = this.jointFrame(u); const d = dist ?? Math.max(0.32, Math.min(0.6, (this.piece.viewDist || 0.5) * 0.85));
    let side = f.b.clone(); if (side.z + side.y * 0.5 < 0) side.negate();
    const pos = f.p.clone().addScaledVector(f.n, d * 0.5).addScaledVector(side, d * 0.55).addScaledVector(f.t, d * 0.45).add(new V3(0, d * 0.25, d * 0.25));
    this.setCameraMode('orbit', { reset: false });
    return this._flyTo(pos, f.p.clone());
  }
  showcase(dur = 2.2) {
    const f = this.jointFrame(0.5, this.curPass || 0); const c = f.p.clone(); const r = Math.min(0.3, (this.piece.viewDist || 0.5) * 0.45);
    this.setCameraMode('orbit', { reset: false }); this.controls.target.copy(c);
    const a0 = Math.random() * 6;
    return this.tween((dt, T) => { const a = a0 + T * 0.6; this.camera.position.set(c.x + Math.cos(a) * r, c.y + r * 0.7, c.z + Math.sin(a) * r); this.controls.target.copy(c); return T >= dur; });
  }

  setCameraMode(mode, opts = {}) {
    this.camMode = mode; const P = this.piece;
    if (mode === 'orbit') {
      this.controls.enabled = true;
      if (P && opts.reset !== false) { const d = P.viewDist || 0.6; this.controls.target.copy(P.focus); this.camera.position.copy(P.focus).add(new V3(d * 0.75, d * 0.55, d * 0.95)); }
    } else if (mode === 'weld') { this.controls.enabled = false; this.camLerp = 0; }
  }

  _weldCamera(dt) {
    const f = this.lastFrame; if (!f) return;
    const P = this.piece; const zoom = this.weldZoom || 1;
    let side = f.b.clone(); if (side.z + side.x * 0.3 + side.y * 0.5 < 0) side.negate();
    if (this.sideFlip === -1) side.negate();
    const target = this.lastTip.clone().addScaledVector(f.t, 0.006);
    const up = new V3(0, 1, 0);
    const fillet = (P.profiles[this.curPass] || P.profiles[0]).base === 'fillet';
    const pos = fillet ? this.lastTip.clone().addScaledVector(f.n, 0.12 * zoom).addScaledVector(f.t, -0.07 * zoom).addScaledVector(up, 0.03 * zoom)
      : this.lastTip.clone().addScaledVector(f.n, 0.075 * zoom).addScaledVector(side, 0.1 * zoom).addScaledVector(f.t, -0.045 * zoom).addScaledVector(up, 0.03 * zoom);
    if (P.rotate && (this.mission.piece === 'drum')) pos.copy(this.lastTip).add(new V3(0.05, 0.08, 0.16 * (this.sideFlip || 1)).multiplyScalar(zoom));
    if (![pos.x, pos.y, pos.z, target.x, target.y, target.z].every(Number.isFinite)) return;
    if (![this.camPos.x, this.camPos.y, this.camPos.z, this.camTarget.x].every(Number.isFinite)) this.camLerp = 0;
    const a = 1 - Math.exp(-dt * 4);
    this.camPos.lerp(pos, this.camLerp === 0 ? 1 : a); this.camTarget.lerp(target, this.camLerp === 0 ? 1 : a); this.camLerp = 1;
    this.camera.position.copy(this.camPos); this.camera.lookAt(this.camTarget);
    const a0 = this.lastTip.clone().project(this.camera), a1 = this.lastTip.clone().addScaledVector(f.t, 0.01).project(this.camera);
    this.screenTangentSign = Math.sign(a1.x - a0.x) || 1;
    if (this.sideFlip === undefined) { if (this.screenTangentSign < 0) { this.sideFlip = -1; this.camLerp = 0; } else this.sideFlip = 1; }
    const b0 = this.lastTip.clone().addScaledVector(f.b, 0.01).project(this.camera);
    this.screenLateralSign = Math.sign(b0.y - a0.y) || 1;
  }

  _loop() {
    const dt = Math.min(0.05, this.clock.getDelta()); this.time += dt;
    if (this.onFrame) this.onFrame(dt);
    if (this.tweens.length) this.tweens = this.tweens.filter(tw => { tw.t += dt; let done = false; try { done = tw.fn(dt, tw.t); } catch (e) { console.error(e); done = true; } if (done) tw.res(); return !done; });
    if (this.camMode === 'weld') this._weldCamera(dt); else this.controls.update();
    const helmetTarget = this.helmet && this.arcOn && this.toolKind !== 'ebw' ? 1 : 0; this.helmetAmt += (helmetTarget - this.helmetAmt) * Math.min(1, dt * 18);
    const flashTarget = !this.helmet && this.arcOn && this.toolKind !== 'ebw' ? 0.5 : 0; this.flash += (flashTarget - this.flash) * Math.min(1, dt * 10);
    this.renderer.toneMappingExposure = this.baseExposure() * (1 - 0.35 * this.helmetAmt);
    this.film.uniforms.helmet.value = this.helmetAmt * 0.55; this.film.uniforms.flash.value = this.flash; this.film.uniforms.time.value = this.time;
    this.bloom.strength = 0.28 + 0.22 * (this.arcOn ? 1 : 0);
    for (const b of this.beads) b.update(this.time, this.tau || 2);
    if (this.machine) this.machine.knobs.forEach(k => { const t = k.userData.target ?? 0; k.rotation.z += (-t - k.rotation.z) * Math.min(1, dt * 8); });
    this.sparks.update(dt); this.smoke.update(dt);
    if (this.flame) this.flame.visible = this.arcOn;
    this._updateLabels();
    this.composer.render(dt);
  }
  baseExposure() { return this.envKind === 'exterior' || this.envKind === 'campo' ? 0.75 : this.envKind === 'camara' ? 0.95 : 1.0; }
}

function g2(geom) { return geom?.type === 'I' ? '#3a1d10' : '#1a1a1a'; }

const PROC_TOOL = { SMAW: 'stinger', GMAW: 'mig', FCAW: 'mig', GTAW_DC: 'tig', GTAW_AC: 'tig', OAW: 'oaw', SAW: 'saw', LBW: 'laser', EBW: 'ebw' };
const STANDOFF_MM = { tig: 2.5, mig: 15, stinger: 3.2, oaw: 4, ebw: 0, laser: 0, saw: 0 };
const ARC_COLOR = {
  tig: { light: '#c9d8ff', int: 1.2, size: 0.008, glow: new THREE.Color(3.5, 4, 6) },
  mig: { light: '#e8eaff', int: 2, size: 0.011, glow: new THREE.Color(5, 5, 6) },
  stinger: { light: '#fff0d8', int: 2.2, size: 0.013, glow: new THREE.Color(6, 5, 4) },
  oaw: { light: '#ffd8a0', int: 0.8, size: 0.008, glow: new THREE.Color(3, 2.6, 4) },
  ebw: { light: '#bcd0ff', int: 0.3, size: 0.006, glow: new THREE.Color(3, 3.5, 7) },
  laser: { light: '#ffd0c0', int: 1, size: 0.006, glow: new THREE.Color(6, 4, 3) },
  saw: { light: '#ffb060', int: 1.5, size: 0.01, glow: new THREE.Color(2, 1, 0.4) },
};
const SPARK = { tig: { rate: 2, speed: 1, smoke: 0.02 }, mig: { rate: 26, speed: 2.6, smoke: 0.25 }, stinger: { rate: 36, speed: 2.8, smoke: 0.5 }, oaw: { rate: 4, speed: 1.2, smoke: 0.05 }, ebw: { rate: 3, speed: 1.5, smoke: 0 }, laser: { rate: 8, speed: 2, smoke: 0.05 }, saw: { rate: 0, speed: 0, smoke: 0.1 } };
export { V3, TABLE_Y, std };
