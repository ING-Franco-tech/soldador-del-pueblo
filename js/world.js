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
    const g = new THREE.BufferGeometry(); this.lp = new Float32Array(max * 6); this.lc = new Float32Array(max * 6);
    g.setAttribute('position', new THREE.BufferAttribute(this.lp, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.lc, 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    this.mesh.frustumCulled = false; scene.add(this.mesh); this.floorY = 0;
    this.floors = [];
  }
  emit(pos, count, { speed = 2.5, up = 0.6, spread = 1, dir = null, life = [0.3, 1.1] } = {}) {
    for (let k = 0; k < count; k++) {
      let i = this.n < this.max ? this.n++ : Math.floor(Math.random() * this.max);
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
      const r = 4 * k + 0.5, gg = (3.2 * k * k + 0.15), bb = 1.6 * k * k * k;
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
    if (kind === 'exterior') this._exterior(); else if (kind === 'camara') this._chamber(); else this._workshop(kind === 'industrial');
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

  _table(E) {
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
  //  Piezas por misión
  // =================================================================
  loadPiece(mission) {
    if (this.piece) { this.scene.remove(this.piece.root); this.beads.forEach(b => b.dispose()); this.beads = []; }
    const root = new THREE.Group(); const grp = new THREE.Group(); grp.scale.setScalar(0.001); root.add(grp);
    const P = { root, grp, paths: [], profiles: [], rotate: false, focus: new V3(), cleanables: [] };
    const mat = metalMaterial(mission.material);
    const add = (m, parent = grp) => { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
    switch (mission.piece) {
      case 'bike': {
        root.position.set(0, TABLE_Y + 0.13, 0);
        const R = 19, wall = 1.6;
        const paint = phys({ color: '#b3121b', metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 });
        const tubeBetween = (a, b, r, m) => { const d = new V3().subVectors(b, a); const L = d.length(); const geo = new THREE.CylinderGeometry(r, r, L, 64, 1, true); const mm = add(new THREE.Mesh(geo, m)); mm.position.copy(a).add(b).multiplyScalar(0.5); mm.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); return mm; };
        // tubo diagonal con zona sin pintura
        tubeBetween(new V3(-280, 0, 0), new V3(-28, 0, 0), R, paint); tubeBetween(new V3(28, 0, 0), new V3(260, 0, 0), R, paint);
        const bareL = tubeBetween(new V3(-28, 0, 0), new V3(-0.4, 0, 0), R, mat); const bareR = tubeBetween(new V3(0.4, 0, 0), new V3(28, 0, 0), R, mat);
        P.cleanables.push(bareL, bareR);
        const inner = add(new THREE.Mesh(new THREE.CylinderGeometry(R - wall, R - wall, 56, 48, 1, true), std({ color: '#222', side: THREE.BackSide, roughness: 0.8 }))); inner.rotation.z = Math.PI / 2;
        // grieta oscura
        const crack = add(new THREE.Mesh(new THREE.TorusGeometry(R + 0.05, 0.35, 8, 96), std({ color: '#050505', roughness: 1 }))); crack.rotation.y = Math.PI / 2;
        // resto del cuadro
        const bb = new V3(-280, 0, 0), ht0 = new V3(260, 0, 0), ht1 = new V3(215, 150, 0), st1 = new V3(-330, 380, 0);
        tubeBetween(bb, st1, 16, paint); tubeBetween(ht0.clone().add(new V3(15, -40, 0)), ht1.clone().add(new V3(-10, 40, 0)), 22, paint); tubeBetween(st1, ht1, 17, paint);
        const bbShell = add(new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 70, 48), paint)); bbShell.rotation.x = Math.PI / 2; bbShell.position.copy(bb);
        // pegatina
        const dc = document.createElement('canvas'); dc.width = 512; dc.height = 128; const dg = dc.getContext('2d'); dg.fillStyle = '#fff'; dg.font = 'italic bold 86px Arial'; dg.fillText('BMX·RAYO', 20, 95);
        const dt = new THREE.CanvasTexture(dc); dt.colorSpace = THREE.SRGBColorSpace;
        const decal = add(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.2, R + 0.2, 150, 48, 1, true, -0.5, 1.0), std({ map: dt, transparent: true, roughness: 0.3 }))); decal.rotation.z = Math.PI / 2; decal.position.x = 140;
        // plantilla / soportes
        const jig = std({ color: '#2e6fb0', metalness: 0.5, roughness: 0.4 });
        for (const x of [-180, 180]) { const post = add(new THREE.Mesh(new RoundedBoxGeometry(40, 110, 60, 2, 3), jig)); post.position.set(x, -75, 0); const cl = add(new THREE.Mesh(new THREE.TorusGeometry(R + 4, 4, 12, 48, Math.PI), std({ color: '#888', metalness: 1, roughness: 0.3 }))); cl.rotation.y = Math.PI / 2; cl.position.x = x; }
        P.paths.push(circPath(0, R, Math.PI / 2 + 1.6, mission.lengthMm));
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
        // zona a limpiar (franja junto a la unión)
        const stripA = add(new THREE.Mesh(new THREE.BoxGeometry(160, 0.6, 30), metalMaterial('a36'))); stripA.position.set(0, 15.3, 95);
        const stripB = add(new THREE.Mesh(new THREE.BoxGeometry(160, 30, 0.6), cm)); stripB.position.set(0, 30, 80.3);
        P.cleanables.push(stripA, stripB);
        // el camión dejó la columna doblada: separación visible
        P.paths.push(linearPath(new V3(-55, 15, 80), new V3(1, 0, 0), new V3(0, 1, 1), mission.lengthMm));
        P.profiles.push({ base: 'fillet', w: 10, r: 1.6, pow: 0.7, ripple: 2.2 });
        P.focus.set(0, 0.33, 0.08); P.viewDist = 0.6;
        break;
      }
      case 'bridge': {
        root.position.set(0, TABLE_Y + 0.006, 0);
        const T = 25, g = 2.5, land = 2, half = g / 2, top = half + (T - land) * Math.tan(Math.PI / 6), W = 170, L = 160;
        const shape = (sgn) => { const s = new THREE.Shape(); s.moveTo(sgn * half, 0); s.lineTo(sgn * half, land); s.lineTo(sgn * top, T); s.lineTo(sgn * W, T); s.lineTo(sgn * W, 0); s.lineTo(sgn * half, 0); return s; };
        for (const sgn of [-1, 1]) {
          const geo = new THREE.ExtrudeGeometry(shape(sgn), { depth: L, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 2 });
          geo.translate(0, 0, -L / 2);
          const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 160, uv.getY(i) / 160);
          const m = add(new THREE.Mesh(geo, metalMaterial('s355'))); m.rotation.y = Math.PI / 2;
        }
        const back = add(new THREE.Mesh(new RoundedBoxGeometry(L, 6, 24, 2, 1), std({ color: '#d8cdb5', roughness: 0.95 }))); back.position.set(0, -3, 0);
        const bevA = add(new THREE.Mesh(new THREE.PlaneGeometry(L, 26.5), metalMaterial('a36'))); // caras del bisel (limpias)
        bevA.position.set(0, (land + T) / 2, -(half + top) / 2 - 0.15); bevA.rotation.x = -(Math.PI / 2 - Math.PI / 6) * 0 - Math.PI / 6; bevA.rotation.y = 0; bevA.visible = false;
        P.cleanables.push(bevA);
        const tops = [{ y: 0.5, w: 7, r: 3.2, pow: 0.5 }, { y: 6, w: 2 * (half + 9.5 * Math.tan(Math.PI / 6)) + 2, r: 10.5, pow: 0.18 }, { y: 16.5, w: 2 * (top) + 4, r: 10.8, pow: 0.16 }];
        for (const tp of tops) { P.paths.push(linearPath(new V3(-40, tp.y, 0), new V3(1, 0, 0), new V3(0, 1, 0), mission.lengthMm)); P.profiles.push({ base: 'flat', w: tp.w, r: tp.r, pow: tp.pow, ripple: 2.6 }); }
        P.focus.set(0, TABLE_Y + 0.02, 0); P.viewDist = 0.5;
        break;
      }
      case 'pipe': {
        root.position.set(0, TABLE_Y + 0.11, 0);
        const R = 19.05, wall = 2;
        for (const sgn of [-1, 1]) {
          const tube = add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, 240, 96, 1, true), mat)); tube.rotation.z = Math.PI / 2; tube.position.x = sgn * 120.4;
          const inn = add(new THREE.Mesh(new THREE.CylinderGeometry(R - wall, R - wall, 240, 64, 1, true), std({ color: '#888', metalness: 1, roughness: 0.3, side: THREE.BackSide }))); inn.rotation.z = Math.PI / 2; inn.position.x = sgn * 120.4;
          const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.6, R + 0.6, 30, 48), std({ color: '#2a5fbf', roughness: 0.6 }))); cap.rotation.z = Math.PI / 2; cap.position.x = sgn * 236;
          const roll = add(new THREE.Group());
          for (const z of [-14, 14]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 20, 32), std({ color: '#333', metalness: 0.8, roughness: 0.4 })); w.rotation.z = Math.PI / 2; w.position.set(0, -R - 3, z); w.castShadow = true; roll.add(w); }
          const base = new THREE.Mesh(new RoundedBoxGeometry(40, 90, 60, 2, 3), std({ color: '#2e6fb0', metalness: 0.5, roughness: 0.4 })); base.position.y = -R - 55; base.castShadow = true; roll.add(base);
          roll.position.x = sgn * 150;
        }
        const hose = new THREE.CatmullRomCurve3([new V3(251, 0, 0), new V3(290, -20, 30), new V3(320, -100, 60), new V3(360, -110, 120)]);
        add(new THREE.Mesh(new THREE.TubeGeometry(hose, 40, 4, 12), std({ color: '#1d1d1d', roughness: 0.6 })));
        const ring = add(new THREE.Mesh(new THREE.TorusGeometry(R + 0.1, 0.25, 8, 96), std({ color: '#111', roughness: 1 }))); ring.rotation.y = Math.PI / 2;
        P.paths.push(circPath(0, R, Math.PI / 2, mission.lengthMm));
        P.profiles.push({ base: 'flat', w: 5.5, r: 0.9, pow: 0.5, ripple: 1.1 });
        P.focus.set(0, TABLE_Y + 0.11, 0); P.viewDist = 0.4;
        break;
      }
      case 'drum': {
        root.position.set(0, 1.0, 0);
        const R = mission.lengthMm / (2 * Math.PI);
        const prof = (sgn) => { const pts = []; const rIn = R - 12; const L = 70; const ps = [[rIn, 0], [R, 0], [R, 8], [R + 2, 12], [R + 2, 30], [R + 14, 34], [R + 14, 44], [R + 2, 48], [R, L], [rIn + 6, L], [rIn + 6, 20], [rIn, 16], [rIn, 0]]; for (const [r, x] of ps) pts.push(new THREE.Vector2(r, sgn * x + sgn * 0.05)); if (sgn < 0) pts.reverse(); return pts; };
        P.spin = new THREE.Group(); grp.add(P.spin);
        for (const sgn of [-1, 1]) { const m = new THREE.Mesh(new THREE.LatheGeometry(prof(sgn), 160), mat); m.rotation.z = -Math.PI / 2; m.castShadow = m.receiveShadow = true; P.spin.add(m); }
        const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.05, 0.15, 8, 160), std({ color: '#1a1a1a', roughness: 1 })); ring.rotation.y = Math.PI / 2; P.spin.add(ring);
        // marcas de punteo a 90°
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
      if (clean) { if (matId === 'a36' || matId === 's355') { m.material = metalMaterial('a36', 'clean'); m.visible = true; } else if (matId === 'al6061') m.material = std({ color: '#dfe2e6', metalness: 1, roughness: 0.3, ...TX.brushedSet('ground', 6) }); }
    }
  }

  // =================================================================
  //  Herramientas
  // =================================================================
  setTool(pid, matId) {
    if (this.tool) { this.scene.remove(this.tool); this.tool = null; }
    if (this.beam) { this.scene.remove(this.beam); this.beam = null; }
    if (this.rod) { this.scene.remove(this.rod); this.rod = null; }
    const g = new THREE.Group(); const inner = new THREE.Group(); inner.scale.setScalar(0.001); g.add(inner);
    const black = std({ color: '#151515', roughness: 0.55 }); const copper = std({ color: '#b87333', metalness: 1, roughness: 0.3 }); const brass = std({ color: '#b08d57', metalness: 1, roughness: 0.3 });
    const lathe = (pts, m) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 48), m);
    this.toolKind = PROC_TOOL[pid] || 'mig';
    switch (this.toolKind) {
      case 'tig': {
        const tung = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 22, 16), std({ color: '#9a9ea3', metalness: 1, roughness: 0.25 })); tung.position.y = 11 - 0.0; inner.add(tung);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.2, 16), tung.material); tip.rotation.x = Math.PI; tip.position.y = -1.1 + 0; inner.add(tip); tung.position.y = 11;
        const cup = lathe([[3, 4], [4.2, 4], [6.5, 12], [7.5, 22], [7.5, 24], [3, 24]], std({ color: '#d68e82', roughness: 0.85 })); inner.add(cup);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 46, 32), black); head.position.y = 46; inner.add(head);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 55, 32), black); cap.position.y = 95; inner.add(cap);
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 120, 32), std({ color: '#2a2a2a', roughness: 0.75 })); handle.rotation.z = Math.PI / 2.6; handle.position.set(55, 60, 0); inner.add(handle);
        // varilla de aporte
        const rodCol = matId === 'a36' || matId === 's355' ? '#b87333' : '#c8ccd0';
        const rod = new THREE.Group(); const rm = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.32, 12), std({ color: rodCol, metalness: 1, roughness: 0.3 })); rm.position.y = 0.16; rod.add(rm); this.rod = rod; this.scene.add(rod);
        this.toolTip = 2.0; break;
      }
      case 'stinger': {
        const el = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 300, 16), std({ color: '#b8ae9a', roughness: 0.9 })); el.position.y = 150; inner.add(el); this.electrode = el;
        const tipm = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3, 12), std({ color: '#555', metalness: 1, roughness: 0.4 })); tipm.position.y = 0; inner.add(tipm); this.electrodeTip = tipm;
        const jaw = new THREE.Group(); const j1 = new THREE.Mesh(new RoundedBoxGeometry(30, 70, 30, 2, 4), std({ color: '#b5281c', roughness: 0.5 })); j1.position.set(0, 35, 0); jaw.add(j1);
        const hdl = new THREE.Mesh(new THREE.CylinderGeometry(13, 15, 150, 24), black); hdl.position.set(0, 140, 0); jaw.add(hdl);
        jaw.position.y = 300; jaw.rotation.z = 0.9; jaw.position.x = 20; inner.add(jaw); this.jaw = jaw;
        this.toolTip = 0; break;
      }
      case 'oaw': {
        const tipT = lathe([[1, 0], [3, 0], [4, 40], [5, 120], [1, 120]], copper); inner.add(tipT);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 180, 24), brass); body.position.set(60, 180, 0); body.rotation.z = 0.7; inner.add(body);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(2, 10, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.8, 3), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); flame.rotation.x = Math.PI; flame.position.y = -5; inner.add(flame); this.flame = flame;
        this.toolTip = 3; break;
      }
      case 'ebw': case 'laser': case 'saw': {
        if (this.toolKind !== 'ebw') { const head = lathe([[5, 0], [12, 0], [25, 60], [25, 220], [5, 220]], std({ color: '#d0d3d6', metalness: 1, roughness: 0.25 })); inner.add(head); this.toolTip = 8; }
        const bm = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12, 1, true), new THREE.MeshBasicMaterial({ color: this.toolKind === 'laser' ? new THREE.Color(4, 0.6, 0.3) : new THREE.Color(1.6, 2.2, 6), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
        this.beam = bm; bm.visible = false; this.scene.add(bm);
        if (this.toolKind === 'ebw') { this.toolTip = 0; g.visible = false; }
        break;
      }
      default: { // MIG / FCAW
        const nz = lathe([[6.5, 0], [8, 0], [9.5, 25], [9.5, 55], [6.5, 55]], brass); inner.add(nz);
        const ct = lathe([[0.6, -2], [2.5, -1], [3, 15], [0.6, 15]], copper); inner.add(ct);
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6, 8), std({ color: '#b87333', metalness: 1, roughness: 0.3 })); wire.position.y = -4; inner.add(wire);
        const neck = new THREE.CatmullRomCurve3([new V3(0, 55, 0), new V3(0, 110, 0), new V3(40, 160, 0), new V3(110, 185, 0)]); inner.add(new THREE.Mesh(new THREE.TubeGeometry(neck, 32, 8, 16), black));
        const hdl = new THREE.Mesh(new THREE.CylinderGeometry(15, 13, 130, 24), std({ color: '#c8102e', roughness: 0.5 })); hdl.position.set(170, 205, 0); hdl.rotation.z = Math.PI / 2.4; inner.add(hdl);
        this.toolTip = 8; break;
      }
    }
    inner.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.tool = g; this.scene.add(g); g.visible = false;
  }

  // =================================================================
  //  Arco: luz, resplandor
  // =================================================================
  _buildArc() {
    this.arcLight = new THREE.PointLight('#cfe0ff', 0, 3, 2); this.arcLight.castShadow = true; this.arcLight.shadow.mapSize.set(512, 512); this.arcLight.shadow.bias = -0.002; this.arcLight.shadow.camera.near = 0.003;
    this.scene.add(this.arcLight);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.radialGlow(), color: new THREE.Color(4, 4.4, 5), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, transparent: true }));
    this.glow.visible = false; this.scene.add(this.glow);
    this.glow2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.radialGlow('rgba(255,255,255,1)', 'rgba(120,160,255,0.35)'), color: new THREE.Color(1.5, 1.7, 2.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
    this.glow2.visible = false; this.scene.add(this.glow2);
  }

  // Coloca la herramienta según el marco de soldadura
  frameWorld(pass, s) {
    const P = this.piece; const path = P.paths[pass];
    if (P.rotate && P.spin) { const th = path.theta(s); P.spin.rotation.x = th - Math.PI / 2; }
    P.root.updateMatrixWorld(true);
    const f = path.frame(s); const M = (P.spin && P.rotate ? P.spin : P.grp).matrixWorld;
    const p = f.p.clone().applyMatrix4(M);
    const nm = new THREE.Matrix3().getNormalMatrix(M);
    return { p, n: f.n.clone().applyMatrix3(nm).normalize(), t: f.t.clone().applyMatrix3(nm).normalize(), b: f.b.clone().applyMatrix3(nm).normalize(), local: f };
  }

  beginPass(pass, matId, opts = {}) {
    const P = this.piece; const prof = P.profiles[pass];
    const parent = P.rotate && P.spin ? P.spin : P.grp;
    const tintLevel = { ss316l: 0.55, ti64: opts.process === 'EBW' ? 0.0 : 0.6, al6061: 0.5, a36: 0.35, s355: 0.35 }[matId] ?? 0.4;
    const bead = new Bead(parent, P.paths[pass], { ...prof, matId, tintLevel, overlap: opts.overlap || 0 });
    this.sideFlip = undefined;
    this.beads.push(bead); this.curBead = bead; this.curPass = pass; this.tau = { al6061: 1.1, a36: 2.6, s355: 3.2, ss316l: 2.4, ti64: 1.6 }[matId] || 2;
    if (this.tool) this.tool.visible = this.toolKind !== 'ebw';
    return bead;
  }

  // Estado de soldadura en cada fotograma
  weldState({ s, lateral = 0, standoff = 1, arc = false, dab = false, process, heat = 1, slag = false, electrodeLeft = 1, wScale = 1, rScale = 1 }) {
    const P = this.piece; if (!P) return;
    const prof = P.profiles[this.curPass] || P.profiles[0];
    const len = P.paths[this.curPass].length;
    const sw = Math.max(0, s);
    const f = this.frameWorld(this.curPass, P.paths[this.curPass].circ ? sw : Math.min(len, sw));
    const lat = f.b.clone().multiplyScalar(lateral * 0.001);
    const tipPos = f.p.clone().add(lat);
    if (prof.base === 'fillet') tipPos.addScaledVector(f.n, 0.0005);
    // orientación: inclinada 15° hacia atrás del avance (empuje/arrastre)
    const dir = f.n.clone().multiplyScalar(Math.cos(0.26)).addScaledVector(f.t, -Math.sin(0.26)).normalize();
    const so = (STANDOFF_MM[this.toolKind] || 3) * standoff * 0.001;
    if (this.tool) {
      this.tool.position.copy(tipPos).addScaledVector(dir, so + (this.toolTip || 0) * 0.001);
      this.tool.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir);
      if (this.electrode) { const L = Math.max(30, 300 * electrodeLeft); this.electrode.scale.y = L / 300; this.electrode.position.y = L / 2; this.jaw.position.y = L; }
    }
    if (this.rod) { // varilla TIG por delante
      const front = tipPos.clone().addScaledVector(f.t, 0.004 - (dab ? 0.003 : 0)).addScaledVector(f.n, dab ? 0.0008 : 0.003);
      const rdir = f.n.clone().multiplyScalar(0.35).addScaledVector(f.t, 0.94).normalize();
      this.rod.position.copy(front); this.rod.quaternion.setFromUnitVectors(new V3(0, 1, 0), rdir); this.rod.visible = true;
    }
    const arcPos = tipPos.clone().addScaledVector(f.n, so * 0.4);
    this.arcOn = arc;
    if (this.beam) {
      this.beam.visible = arc;
      if (arc) { const from = this.toolKind === 'ebw' ? this.gunTip.clone() : this.tool.position.clone(); const to = tipPos.clone(); const d = new V3().subVectors(to, from); const L = d.length(); this.beam.position.copy(from).add(to).multiplyScalar(0.5); this.beam.scale.set(0.0006, L, 0.0006); this.beam.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); }
    }
    // luz/resplandor
    const k = this.toolKind; const col = ARC_COLOR[k] || ARC_COLOR.mig;
    if (arc) {
      const flick = 0.75 + Math.random() * 0.5 * (k === 'stinger' ? 1.4 : k === 'tig' ? 0.3 : 1);
      this.arcLight.position.copy(arcPos).addScaledVector(f.n, 0.012); this.arcLight.color.set(col.light); this.arcLight.intensity = col.int * flick * heat;
      this.glow.visible = this.glow2.visible = true; this.glow.position.copy(arcPos); this.glow2.position.copy(arcPos);
      const gs = col.size * (0.85 + Math.random() * 0.3) * (0.7 + 0.3 * standoff); this.glow.scale.set(gs, gs, gs); this.glow2.scale.set(gs * 2.5, gs * 2.5, gs * 2.5); this.glow.material.color.copy(col.glow);
      // cordón
      if (s >= 0 && (s <= len * (1 + (this.mission.overlap || 0)))) this.curBead.add(Math.min(s, len * (1 + (this.mission.overlap || 0))), { w: prof.w * wScale, r: prof.r * rScale, lat: lateral, now: this.time, slag });
      // chispas y humo
      const sp = SPARK[k] || SPARK.mig; const n = Math.random() < sp.rate * 0.06 ? Math.ceil(sp.rate * (0.5 + Math.random()) * (standoff > 1.4 ? 1.8 : 1)) : 0;
      if (n) this.sparks.emit(arcPos, n, { speed: sp.speed, up: 0.4, spread: 1.2, dir: f.n.clone().multiplyScalar(0.6).addScaledVector(f.t, -0.3) });
      if (sp.smoke && Math.random() < sp.smoke) this.smoke.emit(arcPos.clone().addScaledVector(f.n, 0.01), sp.smoke * 2);
    } else { this.arcLight.intensity = 0; this.glow.visible = this.glow2.visible = false; }
    this.lastFrame = f; this.lastTip = tipPos;
  }

  stopArc() { this.arcOn = false; this.arcLight.intensity = 0; this.glow.visible = this.glow2.visible = false; if (this.beam) this.beam.visible = false; }
  hideTool() { if (this.tool) this.tool.visible = false; if (this.rod) this.rod.visible = false; this.stopArc(); }

  grindFX(duration = 1.4, sparkDir = null) {
    if (!this.piece) return; const f = this.frameWorld(0, (this.piece.paths[0].length) * 0.5);
    const end = this.time + duration; const p = f.p.clone();
    const dir = sparkDir || f.t.clone().multiplyScalar(-1).addScaledVector(f.n, 0.3);
    this._grind = { end, p, dir };
  }

  chipSlag() { this.beads.forEach(b => b.chip()); }
  retintAll(level, colors) { this.beads.forEach(b => b.retint(level, colors)); }

  setHelmet(on) { this.helmet = on; }

  // =================================================================
  //  Cámara
  // =================================================================
  setCameraMode(mode, opts = {}) {
    this.camMode = mode; const P = this.piece;
    if (mode === 'orbit') {
      this.controls.enabled = true;
      if (P) { const d = P.viewDist || 0.6; this.controls.target.copy(P.focus); if (opts.reset !== false) this.camera.position.copy(P.focus).add(new V3(d * 0.75, d * 0.55, d * 0.95)); }
    } else if (mode === 'weld') { this.controls.enabled = false; this.camLerp = 0; }
  }

  _weldCamera(dt) {
    const f = this.lastFrame; if (!f) return;
    const P = this.piece;
    let side = f.b.clone(); if (side.z + side.x * 0.3 + side.y * 0.5 < 0) side.negate();
    if (P.rotate) side.set(0.35, 0, 1).normalize();
    if (this.sideFlip === -1) side.negate();
    const zoom = this.weldZoom || 1;
    const target = this.lastTip.clone().addScaledVector(f.t, 0.008);
    const pos = this.lastTip.clone().addScaledVector(f.n, 0.07 * zoom).addScaledVector(side, 0.11 * zoom).addScaledVector(f.t, -0.03 * zoom);
    if (P.rotate) { pos.copy(this.lastTip).add(new V3(0.05, 0.08, 0.16 * (this.sideFlip || 1)).multiplyScalar(zoom)); }
    if (![pos.x, pos.y, pos.z, target.x, target.y, target.z].every(Number.isFinite)) { if (!this._nanLogged) { this._nanLogged = true; console.warn('weldCam NaN', this.lastTip, f); } return; }
    if (![this.camPos.x, this.camPos.y, this.camPos.z, this.camTarget.x].every(Number.isFinite)) this.camLerp = 0;
    const a = 1 - Math.exp(-dt * 5);
    this.camPos.lerp(pos, this.camLerp === 0 ? 1 : a); this.camTarget.lerp(target, this.camLerp === 0 ? 1 : a); this.camLerp = 1;
    this.camera.position.copy(this.camPos); this.camera.lookAt(this.camTarget);
    // dirección del avance en pantalla (para mapear el ratón)
    const a0 = this.lastTip.clone().project(this.camera), a1 = this.lastTip.clone().addScaledVector(f.t, 0.01).project(this.camera);
    this.screenTangentSign = Math.sign(a1.x - a0.x) || 1;
    if (this.sideFlip === undefined) { if (this.screenTangentSign < 0) { this.sideFlip = -1; this.camLerp = 0; } else this.sideFlip = 1; }
    const b0 = this.lastTip.clone().addScaledVector(f.b, 0.01).project(this.camera);
    this.screenLateralSign = Math.sign(b0.y - a0.y) || 1;
  }

  // =================================================================
  _loop() {
    const dt = Math.min(0.05, this.clock.getDelta()); this.time += dt;
    if (this.onFrame) this.onFrame(dt);
    if (this.camMode === 'weld') this._weldCamera(dt); else this.controls.update();
    // casco: exposición y filtro
    const helmetTarget = this.helmet && this.arcOn && this.toolKind !== 'ebw' ? 1 : 0; this.helmetAmt += (helmetTarget - this.helmetAmt) * Math.min(1, dt * 18);
    const flashTarget = !this.helmet && this.arcOn && this.toolKind !== 'ebw' ? 0.55 : 0; this.flash += (flashTarget - this.flash) * Math.min(1, dt * 10);
    this.renderer.toneMappingExposure = this.baseExposure() * (1 - 0.55 * this.helmetAmt);
    this.film.uniforms.helmet.value = this.helmetAmt; this.film.uniforms.flash.value = this.flash; this.film.uniforms.time.value = this.time;
    this.bloom.strength = 0.28 + 0.22 * (this.arcOn ? 1 : 0);
    for (const b of this.beads) b.update(this.time, this.tau || 2);
    if (this._grind && this.time < this._grind.end) { this.sparks.emit(this._grind.p, 6, { speed: 4, up: 0.2, spread: 0.5, dir: this._grind.dir, life: [0.3, 0.9] }); this.arcLight.position.copy(this._grind.p); this.arcLight.color.set('#ffb070'); this.arcLight.intensity = 0.6 + Math.random() * 0.6; }
    else if (this._grind) { this._grind = null; if (!this.arcOn) this.arcLight.intensity = 0; }
    this.sparks.update(dt); this.smoke.update(dt);
    if (this.flame) this.flame.visible = this.arcOn;
    this.composer.render(dt);
  }
  baseExposure() { return this.envKind === 'exterior' ? 0.75 : this.envKind === 'camara' ? 0.95 : 1.0; }
}

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
const SPARK = { tig: { rate: 2, speed: 1, smoke: 0.02 }, mig: { rate: 22, speed: 2.6, smoke: 0.25 }, stinger: { rate: 30, speed: 2.8, smoke: 0.5 }, oaw: { rate: 4, speed: 1.2, smoke: 0.05 }, ebw: { rate: 3, speed: 1.5, smoke: 0 }, laser: { rate: 8, speed: 2, smoke: 0.05 }, saw: { rate: 0, speed: 0, smoke: 0.1 } };
