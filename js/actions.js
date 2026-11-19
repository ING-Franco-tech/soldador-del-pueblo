// =====================================================================
//  Acciones visibles en 3D: imán, pulidora, soplete, horno, cepillo…
// =====================================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V3 = THREE.Vector3;
const std = o => new THREE.MeshStandardMaterial(o);
const ease = k => k * k * (3 - 2 * k);
const steel = () => std({ color: '#8f959b', metalness: 1, roughness: 0.35 });

// ---------------------------------------------------------------- modelos
function magnet() {
  const g = new THREE.Group();
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.008, 16, 40, Math.PI), std({ color: '#c0261b', roughness: 0.4 })); arc.rotation.z = Math.PI; arc.position.y = 0.035; g.add(arc);
  for (const x of [-0.022, 0.022]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.03, 0.016), std({ color: '#c0261b', roughness: 0.4 })); leg.position.set(x, 0.02, 0); g.add(leg); const tip = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.008, 0.016), steel()); tip.position.set(x, 0.002, 0); g.add(tip); }
  return g;
}
function grinder() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.24, 32), std({ color: '#2c6db5', roughness: 0.5 })); body.rotation.z = Math.PI / 2; body.position.set(-0.13, 0.06, 0); g.add(body);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 24), std({ color: '#3a3d41', metalness: 0.8, roughness: 0.4 })); head.position.set(0, 0.06, 0); g.add(head);
  const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.012, 40, 1, true, 0, Math.PI), std({ color: '#666', metalness: 0.8, roughness: 0.4, side: THREE.DoubleSide })); guard.position.set(0, 0.03, 0); g.add(guard);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.0575, 0.0575, 0.005, 48), std({ color: '#4c4741', roughness: 0.95 })); disc.position.set(0, 0.025, 0); g.add(disc); g.userData.disc = disc;
  const side = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 12), std({ color: '#111' })); side.position.set(0, 0.06, 0.06); side.rotation.x = Math.PI / 2; g.add(side);
  return g;
}
function brush() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.02, 0.03, 2, 0.008), std({ color: '#8a5a33', roughness: 0.8 })); handle.position.set(-0.08, 0.025, 0); g.add(handle);
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.03), std({ color: '#8a5a33', roughness: 0.8 })); block.position.set(0.05, 0.02, 0); g.add(block);
  const bristles = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.014, 0.026), std({ color: '#c9ced3', metalness: 1, roughness: 0.6 })); bristles.position.set(0.05, 0.007, 0); g.add(bristles);
  return g;
}
function rag() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 2), std({ color: '#e8e4da', roughness: 1, flatShading: true }));
  const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (1 + Math.random() * 0.3), p.getY(i) * 0.45 * (1 + Math.random() * 0.3), p.getZ(i) * (1 + Math.random() * 0.3)); m.geometry.computeVertexNormals();
  m.position.y = 0.012; g.add(m); return g;
}
function flameCone(len, rad, col, op) { return new THREE.Mesh(new THREE.ConeGeometry(rad, len, 20, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); }
function torch(cutting = false) {
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 16), std({ color: '#b08d57', metalness: 1, roughness: 0.3 })); tube.position.set(0, 0.16, 0); g.add(tube);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(cutting ? 0.006 : 0.012, 0.009, 0.03, 20), std({ color: '#b87333', metalness: 1, roughness: 0.3 })); tip.position.set(0, 0.015, 0); g.add(tip);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 16), std({ color: '#3a3d41', metalness: 0.7, roughness: 0.4 })); handle.position.set(0, 0.36, 0); g.add(handle);
  const inner = flameCone(cutting ? 0.012 : 0.02, cutting ? 0.002 : 0.005, new THREE.Color(0.6, 1.2, 4), 0.9); inner.rotation.x = Math.PI; inner.position.y = -0.008; g.add(inner);
  const outer = flameCone(cutting ? 0.035 : 0.06, cutting ? 0.006 : 0.016, new THREE.Color(0.5, 0.6, 2.2), 0.35); outer.rotation.x = Math.PI; outer.position.y = cutting ? -0.017 : -0.03; g.add(outer);
  g.userData.flames = [inner, outer]; return g;
}
function clampTool() {
  const g = new THREE.Group(); const m = std({ color: '#c9a227', metalness: 0.6, roughness: 0.45 });
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.007, 10, 30, Math.PI * 1.3), m); frame.rotation.z = Math.PI * 0.35; g.add(frame);
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.06, 12), steel()); screw.position.set(0.035, -0.02, 0); g.add(screw);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 16), steel()); pad.position.set(0.035, -0.05, 0); g.add(pad);
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.04, 8), steel()); t.rotation.z = Math.PI / 2; t.position.set(0.035, 0.012, 0); g.add(t); g.userData.screw = t;
  return g;
}
function drill() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.14, 0.05, 3, 0.01), std({ color: '#d6a21e', roughness: 0.5 })); body.position.set(0, 0.12, 0); g.add(body);
  const grip = new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.1, 0.035, 2, 0.008), std({ color: '#222', roughness: 0.6 })); grip.position.set(-0.04, 0.07, 0); grip.rotation.z = 0.3; g.add(grip);
  const chuck = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.03, 16), std({ color: '#333', metalness: 0.9, roughness: 0.3 })); chuck.position.set(0, 0.04, 0); g.add(chuck);
  const bit = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.035, 8), steel()); bit.position.set(0, 0.012, 0); g.add(bit); g.userData.bit = bit;
  return g;
}
function gauge() {
  const g = new THREE.Group(); const m = steel();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.0015, 0.012), m); blade.position.set(0.04, 0.002, 0); g.add(blade);
  const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.06, 0.012), m); blade2.position.set(-0.01, 0.03, 0); g.add(blade2);
  return g;
}
function probe() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.08, 0.02, 2, 0.006), std({ color: '#e0b030', roughness: 0.5 })); body.position.set(0, 0.11, 0); g.add(body);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.02), std({ color: '#103010', emissive: '#40ff80', emissiveIntensity: 0.6 })); screen.position.set(0, 0.125, 0.0105); g.add(screen);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.07, 8), steel()); rod.position.set(0, 0.035, 0); g.add(rod);
  return g;
}
function detector() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.12, 0.04, 3, 0.01), std({ color: '#f2c200', roughness: 0.5 })); body.position.set(0, 0.16, 0); g.add(body);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.03), std({ color: '#101810', emissive: '#80ffa0', emissiveIntensity: 0.6 })); screen.position.set(0, 0.18, 0.021); g.add(screen); g.userData.screen = screen;
  const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.16, 8), std({ color: '#222' })); hose.position.set(0, 0.06, 0); g.add(hose);
  return g;
}
function coil() {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 16, 48), std({ color: '#b5651d', metalness: 1, roughness: 0.35 })); t.rotation.y = Math.PI / 2; g.add(t);
  return g;
}
function hammer() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.007, 0.22, 12), std({ color: '#7a1a14', roughness: 0.6 })); handle.position.set(0, 0.11, 0); g.add(handle);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.11), steel()); head.position.set(0, 0.006, 0); g.add(head);
  return g;
}

// ---------------------------------------------------------------- helpers
function place(tool, f, h = 0.003) {
  tool.position.copy(f.p).addScaledVector(f.n, h);
  const m = new THREE.Matrix4().makeBasis(f.t, f.n, f.b); tool.quaternion.setFromRotationMatrix(m);
}
async function approach(world, tool, f, h, dur = 0.5, from = 0.15) {
  const start = f.p.clone().addScaledVector(f.n, from).add(new V3(0, 0.05, 0));
  const end = f.p.clone().addScaledVector(f.n, h);
  const m = new THREE.Matrix4().makeBasis(f.t, f.n, f.b); tool.quaternion.setFromRotationMatrix(m);
  await world.tween((dt, T) => { const k = Math.min(1, T / dur); tool.position.lerpVectors(start, end, ease(k)); return k >= 1; });
}
async function leave(world, tool, dur = 0.45) {
  const s = tool.position.clone(); const e = s.clone().add(new V3(0, 0.15, 0.05));
  await world.tween((dt, T) => { const k = Math.min(1, T / dur); tool.position.lerpVectors(s, e, ease(k)); return k >= 1; });
  world.scene.remove(tool);
}
function along(world, tool, { u0 = 0.15, u1 = 0.85, dur = 2, h = 0.003, passes = 1, wobble = 0, onStep = null }) {
  return world.tween((dt, T) => {
    const k = Math.min(1, T / dur); let q = k * passes; const back = Math.floor(q) % 2 === 1; q = q - Math.floor(q); if (back) q = 1 - q;
    const u = u0 + (u1 - u0) * q; const f = world.jointFrame(u);
    place(tool, f, h + Math.abs(Math.sin(T * 25)) * wobble);
    onStep?.(f, dt, T);
    return k >= 1;
  });
}
const wait = (world, s) => world.tween((dt, T) => T >= s);

// ---------------------------------------------------------------- acciones
export async function runAction(world, audio, kind, opts = {}) {
  const A = (fn, ...a) => { try { return audio?.[fn]?.(...a); } catch { return null; } };
  const loop = name => A('loop', name) || (() => {});
  const P = world.piece; if (!P) return;
  world.clearLabels();
  if (kind !== 'oven' && kind !== 'look' && kind !== 'machine') await world.focusJoint(opts.u ?? 0.5);
  const f = world.jointFrame(opts.u ?? 0.5);
  const readout = (txt, cls) => txt && world.label(txt, f.p.clone().addScaledVector(f.n, 0.06), 3200, cls);

  switch (kind) {
    case 'magnet': {
      const t = magnet(); world.scene.add(t);
      if (opts.ferro) {
        await approach(world, t, f, 0.025, 0.5);
        await world.tween((dt, T) => { const k = Math.min(1, T / 0.12); t.position.copy(f.p).addScaledVector(f.n, 0.025 - 0.024 * k * k); return k >= 1; });
        A('play', 'magnet_click'); world.label('🧲 ¡Se pega!', f.p.clone().addScaledVector(f.n, 0.07), 2600, 'good');
        await wait(world, 0.8);
        await world.tween((dt, T) => { t.position.copy(f.p).addScaledVector(f.n, 0.001 + Math.sin(T * 40) * 0.0006); return T > 0.45; });
      } else {
        await approach(world, t, f, 0.002, 0.6); A('play', 'magnet_none'); world.label('🧲 No se pega', f.p.clone().addScaledVector(f.n, 0.07), 2600, 'bad');
        await world.tween((dt, T) => { t.position.addScaledVector(f.t, dt * 0.08); t.position.addScaledVector(f.n, -dt * 0.02); return T > 0.5; });
      }
      await leave(world, t); break;
    }
    case 'spark': {
      const t = grinder(); world.scene.add(t); const e = world.jointFrame(0.92);
      await approach(world, t, e, 0.0, 0.5); const stop = loop('grinder'); A('play', 'spark_test');
      const sp = opts.spark || {};
      if (sp.none) world.label('Sin chispas', e.p.clone().addScaledVector(e.n, 0.08), 2600);
      await world.tween((dt, T) => {
        t.userData.disc.rotation.y += dt * 60;
        if (!sp.none) world.sparks.emit(e.p, Math.ceil(7 * (sp.len || 1)), { speed: 3.5 * (sp.len || 1), up: 0.1, spread: 0.35, dir: e.t.clone().multiplyScalar(-1).add(new V3(0, -0.1, 0)), life: [0.25 * (sp.len || 1), 0.75 * (sp.len || 1)], tint: sp.color, forks: sp.forks || 0 });
        return T > 2.2;
      });
      stop(); await leave(world, t); break;
    }
    case 'grind': case 'cut': {
      const cutting = kind === 'cut'; const t = cutting ? torch(true) : grinder(); world.scene.add(t);
      await approach(world, t, world.jointFrame(0.15), cutting ? 0.012 : 0.0, 0.5);
      const stop = loop(cutting ? 'cutting_torch' : 'grinder');
      await along(world, t, { dur: cutting ? 3 : 2.6, h: cutting ? 0.012 : 0.0, passes: cutting ? 1 : 2, onStep: (fr, dt) => {
        if (!cutting) t.userData.disc.rotation.y += dt * 60; else t.userData.flames.forEach(fl => fl.scale.setScalar(0.85 + Math.random() * 0.3));
        world.sparks.emit(fr.p, cutting ? 5 : 6, { speed: cutting ? 1.8 : 3.5, up: cutting ? -0.4 : 0.1, spread: 0.4, dir: cutting ? new V3(0, -1, 0) : fr.t.clone().multiplyScalar(-1), life: [0.2, 0.7], tint: opts.material === 'al6061' ? [0.6, 0.6, 0.6] : null });
      } });
      stop(); if (opts.after) opts.after(); await leave(world, t); break;
    }
    case 'brush': case 'rag': {
      const t = kind === 'brush' ? brush() : rag(); world.scene.add(t);
      await approach(world, t, world.jointFrame(0.2), 0.001, 0.45);
      const stop = loop(kind === 'brush' ? 'wire_brush' : 'rag');
      await along(world, t, { u0: 0.15, u1: 0.85, dur: 2.2, h: 0.001, passes: 5, wobble: kind === 'brush' ? 0.002 : 0 });
      stop(); if (opts.after) opts.after(); await leave(world, t); break;
    }
    case 'torch': {
      const t = torch(false); world.scene.add(t);
      await approach(world, t, world.jointFrame(0.15), 0.05, 0.5); const stop = loop('torch');
      await along(world, t, { dur: 3, h: 0.05, passes: 3, onStep: () => t.userData.flames.forEach(fl => fl.scale.set(0.9 + Math.random() * 0.2, 0.9 + Math.random() * 0.25, 0.9 + Math.random() * 0.2)) });
      stop(); await leave(world, t); readout(opts.readout, 'warm'); await wait(world, 1); break;
    }
    case 'water': {
      A('play', 'water_hiss');
      await world.tween((dt, T) => { const fr = world.jointFrame(0.2 + T / 1.6 * 0.6); world.sparks.emit(fr.p.clone().addScaledVector(fr.n, 0.08), 6, { speed: 1, up: -1, spread: 0.3, dir: fr.n.clone().multiplyScalar(-1), life: [0.2, 0.4], tint: [0.08, 0.15, 0.4] }); if (Math.random() < 0.3) world.smoke.emit(fr.p, 2); return T > 1.6; });
      readout(opts.readout); break;
    }
    case 'clamp': {
      const t = clampTool(); world.scene.add(t); const e = world.jointFrame(0.85);
      await approach(world, t, e, 0.05, 0.5);
      A('play', 'clamp'); await world.tween((dt, T) => { t.userData.screw.rotation.x += dt * 12; return T > 0.9; });
      if (opts.after) opts.after();
      await wait(world, 0.4); await leave(world, t); readout(opts.readout); break;
    }
    case 'drill': {
      const t = drill(); world.scene.add(t); const stop = loop('drill');
      for (const u of [0.35, 0.65]) { const e = world.jointFrame(u); await approach(world, t, e, 0.002, 0.35, 0.08); await world.tween((dt, T) => { t.userData.bit.rotation.y += dt * 80; world.sparks.emit(e.p, 1, { speed: 0.5, life: [0.1, 0.3], tint: [0.7, 0.7, 0.7] }); return T > 0.7; }); }
      stop(); await leave(world, t); break;
    }
    case 'gauge': case 'thermo': {
      const t = kind === 'gauge' ? gauge() : probe(); world.scene.add(t);
      await approach(world, t, f, 0.001, 0.5); A('play', 'click'); readout(opts.readout || '✔', 'good'); await wait(world, 1.2); await leave(world, t); break;
    }
    case 'tack': {
      for (const u of [0.1, 0.4, 0.7, 0.95]) {
        const e = world.jointFrame(u); A('play', 'tack');
        world.glow.visible = true; world.glow.position.copy(e.p); world.glow.scale.setScalar(0.012); world.arcLight.position.copy(e.p).addScaledVector(e.n, 0.01); world.arcLight.intensity = 1.5;
        world.sparks.emit(e.p, 12, { speed: 2, up: 0.4 });
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 12, 8), std({ color: '#8d9298', metalness: 0.9, roughness: 0.35, emissive: '#ff6a10', emissiveIntensity: 1.5 })); dot.scale.set(1.4, 0.45, 1); dot.position.copy(e.p); dot.quaternion.setFromUnitVectors(new V3(0, 1, 0), e.n); world.scene.add(dot); (world.tackDots ||= []).push(dot);
        await wait(world, 0.18); world.glow.visible = false; world.arcLight.intensity = 0; await wait(world, 0.25);
        world.tween((dt, T) => { dot.material.emissiveIntensity = Math.max(0, 1.5 - T); return T > 1.5; });
      }
      break;
    }
    case 'hammer': {
      const t = hammer(); world.scene.add(t);
      for (const u of [0.25, 0.5, 0.75]) {
        const e = world.jointFrame(u, world.curPass || 0); place(t, e, 0.004);
        await world.tween((dt, T) => { const k = Math.min(1, T / 0.22); t.rotation.z = Math.sin(k * Math.PI) * 0.9; return k >= 1; });
        A('play', 'slag_chip'); world.sparks.emit(e.p, 6, { speed: 0.8, up: 0.8, spread: 0.6, life: [0.3, 0.6], tint: [0.12, 0.1, 0.08] });
      }
      if (opts.after) opts.after(); await leave(world, t); break;
    }
    case 'purge': {
      world.showCaps?.(true); const stop = loop('purge_gas');
      const L = world.label('O₂: 20 900 ppm', f.p.clone().addScaledVector(f.n, 0.06), 0, 'good');
      const target = opts.target ?? 35;
      await world.tween((dt, T) => { const v = Math.round(20900 * Math.exp(-T * 2.6) + target); L.el.textContent = (opts.gas || 'O₂') + ': ' + v.toLocaleString('es') + ' ppm'; return T > 2.4; });
      stop(); await wait(world, 0.9); world.clearLabels(); readout(opts.readout, 'good'); break;
    }
    case 'demag': {
      const t = coil(); world.scene.add(t); const stop = loop('oven_hum');
      const L = world.label('🧲 —', f.p.clone().addScaledVector(f.n, 0.07), 0);
      await approach(world, t, world.jointFrame(0.15), 0.0, 0.4);
      const [g0, g1] = opts.gauss || [38, 4];
      await along(world, t, { dur: 2.4, h: 0.0, onStep: (fr, dt, T) => { L.el.textContent = `🧲 ${(g0 + (g1 - g0) * Math.min(1, T / 2.4)).toFixed(1)} G`; t.quaternion.setFromUnitVectors(new V3(1, 0, 0), fr.t); } });
      stop(); world.clearLabels(); await leave(world, t); readout(opts.readout, 'good'); break;
    }
    case 'detector': {
      const t = detector(); world.scene.add(t);
      const mw = P.manway ? P.manway.clone().applyMatrix4(P.grp.matrixWorld) : f.p.clone();
      const fr = { p: mw, n: new V3(0, 1, 0), t: new V3(1, 0, 0), b: new V3(0, 0, 1) };
      await world._flyTo(mw.clone().add(new V3(0.5, 0.35, 0.8)), mw);
      await approach(world, t, fr, 0.05, 0.5);
      if (opts.alarm) { A('play', 'alarm'); world.label('📟 LEL 38 % — ¡ALARMA!', mw.clone().add(new V3(0, 0.3, 0)), 3500, 'bad'); t.userData.screen.material.emissive.set('#ff3030'); }
      else { A('play', 'ok'); world.label(opts.readout || '📟 LEL 0 %', mw.clone().add(new V3(0, 0.3, 0)), 3200, 'good'); }
      await wait(world, 1.5); await leave(world, t); break;
    }
    case 'oven': {
      const O = world.oven; if (!O) break;
      const c = new V3(); O.group.getWorldPosition(c);
      await world._flyTo(c.clone().add(O.portable ? new V3(0.42, 0.36, 0.62) : new V3(0.35, 0.3, 0.6)), c.clone().add(new V3(0, O.portable ? 0.08 : 0.12, 0)));
      A('play', 'door'); const axis = O.portable ? 'z' : 'y';
      await world.tween((dt, T) => { const k = Math.min(1, T / 0.5); O.door.rotation[axis] = (O.portable ? 1.6 : -1.7) * ease(k); return k >= 1; });
      const b = O.bundle; b.visible = true; const dp = new V3(); O.door.getWorldPosition(dp);
      const start = dp.clone().add(new V3(0.35, 0.05, 0.25)); const end = O.portable ? dp.clone().add(new V3(-0.15, 0, 0)) : c.clone().add(new V3(0, 0.15, 0.05));
      await world.tween((dt, T) => { const k = Math.min(1, T / 0.8); b.position.lerpVectors(start, end, ease(k)); return k >= 1; });
      b.visible = false; A('play', 'door');
      await world.tween((dt, T) => { const k = Math.min(1, T / 0.4); O.door.rotation[axis] = (O.portable ? 1.6 : -1.7) * (1 - ease(k)); return k >= 1; });
      const stop = loop('oven_hum'); const temps = opts.temps || [350, 120];
      await world.tween((dt, T) => { const k = Math.min(1, T / 2); const v = Math.round(25 + (temps[0] - 25) * ease(k)); world.setOvenDisplay(v + '°C'); return k >= 1; });
      A('play', 'oven_beep'); world.label(opts.readout || `🔥 ${temps[0]} °C`, c.clone().add(new V3(0, 0.45, 0)), 2800, 'warm');
      if (temps[1]) { await wait(world, 0.8); await world.tween((dt, T) => { const k = Math.min(1, T / 1.2); world.setOvenDisplay(Math.round(temps[0] + (temps[1] - temps[0]) * k) + '°C'); return k >= 1; }); }
      stop(); await wait(world, 0.6); break;
    }
    case 'look': {
      await world.focusJoint(0.5, 0.12); await wait(world, 1.2); break;
    }
    default: await wait(world, 0.4);
  }
}
