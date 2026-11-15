/* ==========================================================================
   sim3d.js — Simulatore 3D WebGL Antropomorfo dell'Architettura Cognitiva (CLT + CTML)
   Zero dipendenze esterne | Testa 3D traslucida Fresnel WebGL1 con fallback Canvas2D
   ========================================================================== */
(function () {
  "use strict";

  const PRESETS = {
    optimal: {
      name: "Equilibrio Ottimale (UDL + CTML)",
      complexity: 5,
      expertise: 55,
      extraneous: 10,
      modality: 85,
      scaffolding: 35,
      caption:
        "Carico estraneo quasi azzerato e doppi canali bilanciati (occhi + orecchie): il carico intrinseco è gestibile e resta ampio margine per il carico rilevante (costruzione di schemi in MLT)."
    },
    novice_aspirin: {
      name: "Novizio: Acido Acetilsalicilico (6 sub-schemi)",
      complexity: 9,
      expertise: 10,
      extraneous: 20,
      modality: 45,
      scaffolding: 20,
      caption:
        "Come nell'esempio di Bonaiuti sull'acido acetilsalicilico, per un novizio la formula chimica attiva 6+ elementi separati nella Memoria di Lavoro prefrontale, saturando i 4±1 slot."
    },
    expert_aspirin: {
      name: "Esperto: Acido Acetilsalicilico (1 singolo chunk)",
      complexity: 9,
      expertise: 95,
      extraneous: 10,
      modality: 75,
      scaffolding: 10,
      caption:
        "Il docente o chimico esperto richiama dalla rete occipitale MLT un singolo schema dorato automatizzato ('Aspirina'): l'alta complessità oggettiva produce carico intrinseco bassissimo."
    },
    split_overload: {
      name: "Sovraccarico Estraneo (Split-Attention + Ridondanza)",
      complexity: 6,
      expertise: 35,
      extraneous: 85,
      modality: 10,
      scaffolding: 40,
      caption:
        "Testo lontano dalle figure, audio identico al testo su schermata densa ed elementi decorativi saturano la corteccia prefrontale di rosso: il carico rilevante crolla a zero."
    },
    modality_gain: {
      name: "Effetto Modalità (Voce + Diagramma Integrati)",
      complexity: 7,
      expertise: 30,
      extraneous: 15,
      modality: 95,
      scaffolding: 55,
      caption:
        "Suddividere l'informazione tra canale visivo (occhi → Taccuino Visuo-Spaziale) e canale uditivo (orecchie → Ciclo Fonologico) decomprime la Memoria di Lavoro."
    },
    expertise_reversal: {
      name: "Expertise Reversal Paradox (Esperto + Eccessivo Scaffolding)",
      complexity: 5,
      expertise: 92,
      extraneous: 12,
      modality: 50,
      scaffolding: 95,
      caption:
        "Principio di Kalyuga et al. (2003): aiuti elementari passo-passo indispensabili per il novizio interferiscono con gli schemi consolidati dell'esperto generando carico estraneo!"
    },
    underload: {
      name: "Sottoutilizzo Cognitivo (Cognitive Underload)",
      complexity: 1,
      expertise: 80,
      extraneous: 8,
      modality: 50,
      scaffolding: 10,
      caption:
        "Come avverte Landriscina (2007), un compito troppo elementare lascia inattiva la Memoria di Lavoro: nessuno sforzo generativo, noia e deriva attentiva."
    }
  };

  const CAMERAS = {
    overview: { yaw: -0.56, pitch: 0.20, dist: 12.6 },
    channels: { yaw: -1.08, pitch: 0.16, dist: 10.6 },
    wm: { yaw: -0.14, pitch: 0.24, dist: 8.6 },
    mlt: { yaw: 0.68, pitch: 0.25, dist: 9.2 }
  };

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function gaussian(x, mu, sigma) {
    const d = (x - mu) / sigma;
    return Math.exp(-d * d);
  }

  // Matrix helpers (Float32Array column-major)
  function mat4Perspective(fovRad, aspect, near, far) {
    const f = 1.0 / Math.tan(fovRad / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  }

  function mat4LookAt(eye, center, up) {
    let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
    let len = Math.hypot(zx, zy, zz) || 1;
    zx /= len; zy /= len; zz /= len;
    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz) || 1;
    xx /= len; xy /= len; xz /= len;
    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;
    return new Float32Array([
      xx, yx, zx, 0,
      xy, yy, zy, 0,
      xz, yz, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
      -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
      1
    ]);
  }

  function mat4Mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        o[c * 4 + r] =
          a[r] * b[c * 4] +
          a[4 + r] * b[c * 4 + 1] +
          a[8 + r] * b[c * 4 + 2] +
          a[12 + r] * b[c * 4 + 3];
      }
    }
    return o;
  }

  function mat4TRS(tx, ty, tz, sx, sy, sz, rotY) {
    const cy = Math.cos(rotY || 0), syr = Math.sin(rotY || 0);
    return new Float32Array([
      cy * sx, 0, -syr * sx, 0,
      0, sy, 0, 0,
      syr * sz, 0, cy * sz, 0,
      tx, ty, tz, 1
    ]);
  }

  function projectPoint(vp, x, y, z, width, height) {
    const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
    const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
    const cz = vp[2] * x + vp[6] * y + vp[10] * z + vp[14];
    const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    if (cw <= 0.01) return null;
    const ndcx = cx / cw, ndcy = cy / cw, ndcz = cz / cw;
    return {
      x: (ndcx * 0.5 + 0.5) * width,
      y: (-ndcy * 0.5 + 0.5) * height,
      z: ndcz
    };
  }

  function computeSmoothNormals(positions, indices) {
    const normals = new Float32Array(positions.length);
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;
      const ux = positions[i1] - positions[i0];
      const uy = positions[i1 + 1] - positions[i0 + 1];
      const uz = positions[i1 + 2] - positions[i0 + 2];
      const vx = positions[i2] - positions[i0];
      const vy = positions[i2 + 1] - positions[i0 + 1];
      const vz = positions[i2 + 2] - positions[i0 + 2];
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      normals[i0] += nx; normals[i0 + 1] += ny; normals[i0 + 2] += nz;
      normals[i1] += nx; normals[i1 + 1] += ny; normals[i1 + 2] += nz;
      normals[i2] += nx; normals[i2 + 1] += ny; normals[i2 + 2] += nz;
    }
    for (let i = 0; i < normals.length; i += 3) {
      const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
      normals[i] /= l;
      normals[i + 1] /= l;
      normals[i + 2] /= l;
    }
    return normals;
  }

  function createCubeMesh() {
    const p = [
      -0.5, -0.5, 0.5,  0.5, -0.5, 0.5,  0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,
      0.5, -0.5, -0.5,  -0.5, -0.5, -0.5,  -0.5, 0.5, -0.5,  0.5, 0.5, -0.5,
      -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,  0.5, 0.5, -0.5,  -0.5, 0.5, -0.5,
      -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5, 0.5,  -0.5, -0.5, 0.5,
      0.5, -0.5, 0.5,  0.5, -0.5, -0.5,  0.5, 0.5, -0.5,  0.5, 0.5, 0.5,
      -0.5, -0.5, -0.5,  -0.5, -0.5, 0.5,  -0.5, 0.5, 0.5,  -0.5, 0.5, -0.5
    ];
    const n = [
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
      0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
      0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
      -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
    ];
    const idx = [];
    for (let f = 0; f < 6; f++) {
      const o = f * 4;
      idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
    return { positions: new Float32Array(p), normals: new Float32Array(n), indices: new Uint16Array(idx) };
  }

  function createOctaMesh() {
    const v = [
      [0, 0.65, 0], [0.55, 0, 0], [0, 0, 0.55],
      [-0.55, 0, 0], [0, 0, -0.55], [0, -0.65, 0]
    ];
    const faces = [
      [0, 2, 1], [0, 1, 4], [0, 4, 3], [0, 3, 2],
      [5, 1, 2], [5, 4, 1], [5, 3, 4], [5, 2, 3]
    ];
    const pos = [], norm = [], idx = [];
    let k = 0;
    for (const [ia, ib, ic] of faces) {
      const a = v[ia], b = v[ib], c = v[ic];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      pos.push(...a, ...b, ...c);
      norm.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
      idx.push(k, k + 1, k + 2);
      k += 3;
    }
    return { positions: new Float32Array(pos), normals: new Float32Array(norm), indices: new Uint16Array(idx) };
  }

  function createSphereMesh(rings, segs) {
    const pos = [], idx = [];
    for (let r = 0; r <= rings; r++) {
      const v = r / rings;
      const phi = v * Math.PI;
      const y = Math.cos(phi) * 0.5;
      const rad = Math.sin(phi) * 0.5;
      for (let s = 0; s <= segs; s++) {
        const u = s / segs;
        const a = u * Math.PI * 2;
        pos.push(-Math.cos(a) * rad, y, Math.sin(a) * rad);
      }
    }
    const stride = segs + 1;
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < segs; s++) {
        const i0 = r * stride + s;
        const i1 = i0 + 1;
        const i2 = (r + 1) * stride + s;
        const i3 = i2 + 1;
        idx.push(i0, i2, i1, i1, i2, i3);
      }
    }
    const positions = new Float32Array(pos);
    const indices = new Uint16Array(idx);
    return { positions, normals: computeSmoothNormals(positions, indices), indices };
  }

  function createTorusMesh(majorR, minorR, majorSegs, minorSegs) {
    // Ring lies in X-Y plane, hole facing +/- Z (ideal for cranial bottleneck & ears)
    const pos = [], idx = [];
    for (let i = 0; i <= majorSegs; i++) {
      const theta = (i / majorSegs) * Math.PI * 2;
      const ct = Math.cos(theta), st = Math.sin(theta);
      for (let j = 0; j <= minorSegs; j++) {
        const phi = (j / minorSegs) * Math.PI * 2;
        const cp = Math.cos(phi), sp = Math.sin(phi);
        const r = majorR + minorR * cp;
        pos.push(r * ct, r * st, minorR * sp);
      }
    }
    const stride = minorSegs + 1;
    for (let i = 0; i < majorSegs; i++) {
      for (let j = 0; j < minorSegs; j++) {
        const a = i * stride + j;
        const b = (i + 1) * stride + j;
        const c = (i + 1) * stride + j + 1;
        const d = i * stride + j + 1;
        idx.push(a, b, d, b, c, d);
      }
    }
    const positions = new Float32Array(pos);
    const indices = new Uint16Array(idx);
    return { positions, normals: computeSmoothNormals(positions, indices), indices };
  }

  // Parametric Human Head & Cranium Sculpt (-X is face front, +X is occiput, +Z is left ear)
  function evalHeadSurfacePoint(v, a) {
    // v in [0, 1] from bottom of upper neck (y = -1.52) to cranial apex (y = +2.85)
    const y = lerp(-1.52, 2.85, v);
    const absA = Math.abs(Math.atan2(Math.sin(a), Math.cos(a))); // 0 at nose midline, pi at nape

    // Base anteroposterior offset shifts smoothly back inside the occipital vault
    let cx = 0.42 + 0.34 * smoothstep(-1.4, 1.1, y) - 0.14 * smoothstep(1.8, 2.85, y);

    // Radii profile along height (neck -> jaw -> temples/cheek -> cranial vault -> crown)
    const domeU = clamp((y - 0.65) / 2.2, 0, 1);
    const domeFactor = Math.sqrt(Math.max(0.0025, 1 - Math.pow(domeU, 1.92)));

    let rxFront = lerp(0.95, 2.28, smoothstep(-1.52, 0.68, y)) * domeFactor;
    let rxBack = lerp(0.95, 2.58, smoothstep(-1.52, 0.85, y)) * domeFactor;
    let rz = lerp(0.88, 1.98, smoothstep(-1.52, 0.95, y)) * domeFactor;

    // Gentle tapering under jawline before cheeks expand
    const jawTaper = smoothstep(-1.55, -0.82, y);
    rxFront *= lerp(0.68, 1.0, jawTaper);

    const cosA = Math.cos(a);
    const baseRx = cosA >= 0 ? rxFront : rxBack;
    let x = cx - cosA * baseRx;
    let z = Math.sin(a) * rz;

    // Sculpted anatomical facial features facing -X:
    const midlineMask = gaussian(absA, 0, 0.34);
    const widerFaceMask = gaussian(absA, 0, 0.72);

    // 1. Chin & defined lower jaw (-X protrusion around y = -0.96)
    const chinBump = 0.56 * gaussian(y, -0.98, 0.25) * gaussian(absA, 0, 0.42);
    const jawAngle = 0.22 * gaussian(y, -0.92, 0.28) * gaussian(absA, 1.38, 0.45);

    // 2. Mouth / upper lip curve & cheekbone prominence
    const lipBump = 0.20 * gaussian(y, -0.48, 0.14) * gaussian(absA, 0, 0.30);
    const cheekBump = 0.24 * gaussian(y, -0.02, 0.26) * gaussian(absA, 0.68, 0.32);

    // 3. Nose bridge & tip (clear recognizable profile nose facing -X!)
    const noseTip = 0.68 * gaussian(y, -0.02, 0.20) * gaussian(absA, 0, 0.21);
    const noseBridge = 0.34 * gaussian(y, 0.28, 0.26) * gaussian(absA, 0, 0.19);

    // 4. Orbital eye sockets (concavity under brow) & prominent supraorbital brow ridge
    const eyeSocket = -0.22 * gaussian(y, 0.42, 0.17) * gaussian(absA, 0.42, 0.22);
    const browRidge = 0.24 * gaussian(y, 0.68, 0.16) * widerFaceMask;

    // 5. Rounded forehead fullness & gentle occipital curve
    const foreheadPush = 0.26 * gaussian(y, 1.25, 0.44) * widerFaceMask;
    const occiputCurve = 0.22 * gaussian(y, 0.65, 0.55) * gaussian(absA, Math.PI, 0.72);

    // Apply displacements outward along local face/cranium radial
    x -= (chinBump + lipBump + noseTip + noseBridge + eyeSocket + browRidge + foreheadPush) * Math.max(0, cosA);
    x += occiputCurve;
    z += Math.sign(Math.sin(a) || 1) * (cheekBump * 0.75 + jawAngle * 0.85);

    // Tighten neck slightly below jaw at back & front sides
    if (y < -1.1) {
      const neckPinch = 1 - 0.16 * smoothstep(-1.1, -1.52, y) * (1 - midlineMask * 0.4);
      z *= neckPinch;
    }

    return [x, y, z];
  }

  function createHeadShellMesh() {
    const rings = 30;
    const segs = 40;
    const pos = [];
    const idx = [];
    for (let r = 0; r <= rings; r++) {
      const v = r / rings;
      for (let s = 0; s <= segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        const pt = evalHeadSurfacePoint(v, a);
        pos.push(pt[0], pt[1], pt[2]);
      }
    }
    const stride = segs + 1;
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < segs; s++) {
        const i0 = r * stride + s;
        const i1 = i0 + 1;
        const i2 = (r + 1) * stride + s;
        const i3 = i2 + 1;
        // Outward CCW winding verified for dir=(-cos(a), sin(a))
        idx.push(i0, i1, i2, i1, i3, i2);
      }
    }
    const positions = new Float32Array(pos);
    const indices = new Uint16Array(idx);
    return {
      positions,
      normals: computeSmoothNormals(positions, indices),
      indices,
      profileCurve: Array.from({ length: rings + 1 }, (_, r) => {
        const pFront = evalHeadSurfacePoint(r / rings, 0);
        const pBack = evalHeadSurfacePoint(r / rings, Math.PI);
        return { front: pFront, back: pBack };
      })
    };
  }

  function createNeckBustMesh() {
    // Solid anatomical neck & upper-shoulder pedestal grounding the translucent head
    const rings = 12;
    const segs = 32;
    const pos = [];
    const idx = [];
    for (let r = 0; r <= rings; r++) {
      const v = r / rings; // 0 = base collar (y = -2.55), 1 = jaw underside (y = -1.46)
      const y = lerp(-2.55, -1.46, v);
      const flare = Math.pow(1 - v, 2.1);
      const rx = lerp(0.92, 1.95, flare);
      const rz = lerp(0.84, 2.35, flare);
      const cx = lerp(0.42, 0.56, 1 - v);
      for (let s = 0; s <= segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        pos.push(cx - Math.cos(a) * rx, y, Math.sin(a) * rz);
      }
    }
    const stride = segs + 1;
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < segs; s++) {
        const i0 = r * stride + s;
        const i1 = i0 + 1;
        const i2 = (r + 1) * stride + s;
        const i3 = i2 + 1;
        idx.push(i0, i1, i2, i1, i3, i2);
      }
    }
    const positions = new Float32Array(pos);
    const indices = new Uint16Array(idx);
    return { positions, normals: computeSmoothNormals(positions, indices), indices };
  }

  function initSim3D() {
    const canvas = document.getElementById("sim3d-canvas");
    if (!canvas) return;

    const statusBadge = document.getElementById("sim3d-status-badge");
    const scenarioDesc = document.getElementById("sim3d-scenario-desc");
    const toggleBtn = document.getElementById("sim3d-toggle-anim");
    const modeTag = document.getElementById("sim3d-engine-mode");

    const slComplex = document.getElementById("sim3d-complexity");
    const slExpert = document.getElementById("sim3d-expertise");
    const slExtra = document.getElementById("sim3d-extraneous");
    const slModal = document.getElementById("sim3d-modality");
    const slScaff = document.getElementById("sim3d-scaffolding");

    const outComplex = document.getElementById("val-complexity");
    const outExpert = document.getElementById("val-expertise");
    const outExtra = document.getElementById("val-extraneous");
    const outModal = document.getElementById("val-modality");
    const outScaff = document.getElementById("val-scaffolding");

    const wmTotalEl = document.getElementById("metric-wm-total");
    const segIntEl = document.getElementById("wm-seg-int");
    const segExtEl = document.getElementById("wm-seg-ext");
    const segGerEl = document.getElementById("wm-seg-ger");
    const mIntEl = document.getElementById("metric-int");
    const mExtEl = document.getElementById("metric-ext");
    const mGerEl = document.getElementById("metric-ger");
    const mChunksEl = document.getElementById("metric-chunks");

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const state = {
      complexity: 5,
      expertise: 55,
      extraneous: 10,
      modality: 85,
      scaffolding: 35,
      paused: reduceMotion,
      time: 0,
      yaw: CAMERAS.overview.yaw,
      pitch: CAMERAS.overview.pitch,
      dist: CAMERAS.overview.dist,
      targetYaw: CAMERAS.overview.yaw,
      targetPitch: CAMERAS.overview.pitch,
      targetDist: CAMERAS.overview.dist,
      dragging: false,
      lastX: 0,
      lastY: 0,
      renderer: "webgl"
    };

    const metrics = {
      intrinsic: 35,
      extraneous: 10,
      germane: 40,
      total: 85,
      overflow: 0,
      chunks: 4,
      cogState: "optimal"
    };

    function syncToggleButton() {
      if (!toggleBtn) return;
      toggleBtn.textContent = state.paused ? "Riprendi animazione" : "Pausa animazione";
      toggleBtn.setAttribute("aria-pressed", String(!state.paused));
    }

    function computeCognitiveMetrics() {
      const expFactor = 1 - (state.expertise / 100) * 0.78;
      const chunks = Math.max(1, Math.round(state.complexity * expFactor));
      const modalityGain = (state.modality / 100) * 14;

      const rawIntrinsic = clamp((chunks / 7) * 68 - modalityGain * 0.45, 8, 86);
      const expertiseReversalPenalty =
        state.expertise > 60 && state.scaffolding > 45
          ? ((state.expertise - 60) / 40) * ((state.scaffolding - 45) / 55) * 42
          : 0;
      const dualModalityPenalty = state.modality < 30 ? (30 - state.modality) * 0.45 : 0;
      const rawExtraneous = clamp(state.extraneous * 0.78 + expertiseReversalPenalty + dualModalityPenalty, 4, 96);

      const scaffoldingHelp =
        state.expertise < 65 ? (state.scaffolding / 100) * 18 : 0;
      const freeCapacity = Math.max(0, 100 - (rawIntrinsic + rawExtraneous - scaffoldingHelp * 0.4));

      let germane = 0;
      if (state.complexity <= 2 && state.expertise >= 65) {
        germane = Math.min(18, freeCapacity * 0.25);
      } else {
        germane = clamp(freeCapacity * (0.62 + (state.modality / 100) * 0.25), 0, 56);
      }

      const rawLoad = rawIntrinsic + rawExtraneous;
      const overflow = Math.max(0, rawLoad - 100);
      const totalUsed = Math.min(115, Math.round(rawIntrinsic + rawExtraneous + germane));

      metrics.intrinsic = Math.round(rawIntrinsic);
      metrics.extraneous = Math.round(rawExtraneous);
      metrics.germane = Math.round(germane);
      metrics.overflow = Math.round(overflow);
      metrics.total = totalUsed;
      metrics.chunks = chunks;

      if (overflow > 0 || rawLoad >= 92 || rawExtraneous >= 52) {
        metrics.cogState = "overload";
      } else if (rawIntrinsic + germane < 30) {
        metrics.cogState = "underload";
      } else if (rawLoad >= 75) {
        metrics.cogState = "tight";
      } else {
        metrics.cogState = "optimal";
      }
    }

    function syncReadout() {
      computeCognitiveMetrics();
      if (outComplex) outComplex.textContent = `${state.complexity} / 10`;
      if (outExpert) outExpert.textContent = `${state.expertise}%`;
      if (outExtra) outExtra.textContent = `${state.extraneous}%`;
      if (outModal) outModal.textContent = `${state.modality}%`;
      if (outScaff) outScaff.textContent = `${state.scaffolding}%`;

      if (wmTotalEl) {
        wmTotalEl.textContent =
          metrics.overflow > 0 ? `OVERLOAD (${100 + metrics.overflow}%)` : `${metrics.total}% / 100%`;
      }
      const norm = Math.max(100, metrics.intrinsic + metrics.extraneous + metrics.germane);
      if (segIntEl) segIntEl.style.width = `${((metrics.intrinsic / norm) * 100).toFixed(1)}%`;
      if (segExtEl) segExtEl.style.width = `${((metrics.extraneous / norm) * 100).toFixed(1)}%`;
      if (segGerEl) segGerEl.style.width = `${((metrics.germane / norm) * 100).toFixed(1)}%`;

      if (mIntEl) mIntEl.textContent = `${metrics.intrinsic}%`;
      if (mExtEl) mExtEl.textContent = `${metrics.extraneous}%`;
      if (mGerEl) mGerEl.textContent = `${metrics.germane}%`;
      if (mChunksEl) mChunksEl.textContent = `${metrics.chunks} ${metrics.chunks === 1 ? "chunk" : "chunks"}`;

      if (statusBadge) {
        statusBadge.setAttribute("data-state", metrics.cogState);
        const labels = {
          optimal: "Equilibrio Generativo Ottimale",
          tight: "Zona Limite della Memoria di Lavoro",
          overload: "Sovraccarico Cognitivo (Overload!)",
          underload: "Sottoutilizzo Cognitivo (Noia / Underload)"
        };
        statusBadge.textContent = labels[metrics.cogState];
      }
    }

    function applyPreset(key) {
      const p = PRESETS[key];
      if (!p) return;
      state.complexity = p.complexity;
      state.expertise = p.expertise;
      state.extraneous = p.extraneous;
      state.modality = p.modality;
      state.scaffolding = p.scaffolding;

      if (slComplex) slComplex.value = String(p.complexity);
      if (slExpert) slExpert.value = String(p.expertise);
      if (slExtra) slExtra.value = String(p.extraneous);
      if (slModal) slModal.value = String(p.modality);
      if (slScaff) slScaff.value = String(p.scaffolding);
      if (scenarioDesc) scenarioDesc.textContent = p.caption;

      document.querySelectorAll(".preset-btn[data-preset]").forEach((btn) => {
        btn.classList.toggle("is-active", btn.getAttribute("data-preset") === key);
      });
      syncReadout();
    }

    const sliders = [
      [slComplex, "complexity"],
      [slExpert, "expertise"],
      [slExtra, "extraneous"],
      [slModal, "modality"],
      [slScaff, "scaffolding"]
    ];
    sliders.forEach(([el, prop]) => {
      if (!el) return;
      el.addEventListener("input", () => {
        state[prop] = Number(el.value);
        document.querySelectorAll(".preset-btn[data-preset]").forEach((b) => b.classList.remove("is-active"));
        if (scenarioDesc) {
          scenarioDesc.textContent =
            "Parametri personalizzati: osserva nella testa 3D come l'expertise comprime gli schemi occipitali mentre il carico estraneo satura la corteccia prefrontale.";
        }
        syncReadout();
      });
    });

    document.querySelectorAll(".preset-btn[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => applyPreset(btn.getAttribute("data-preset")));
    });

    document.querySelectorAll(".cam-btn[data-cam]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-cam");
        const c = CAMERAS[key];
        if (!c) return;
        state.targetYaw = c.yaw;
        state.targetPitch = c.pitch;
        state.targetDist = c.dist;
        document.querySelectorAll(".cam-btn[data-cam]").forEach((b) => {
          b.classList.toggle("is-active", b === btn);
        });
      });
    });

    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        state.paused = !state.paused;
        syncToggleButton();
      });
    }

    canvas.addEventListener("keydown", (e) => {
      let handled = true;
      if (e.key === "ArrowLeft") state.targetYaw -= 0.14;
      else if (e.key === "ArrowRight") state.targetYaw += 0.14;
      else if (e.key === "ArrowUp") state.targetPitch = clamp(state.targetPitch + 0.1, -0.2, 1.25);
      else if (e.key === "ArrowDown") state.targetPitch = clamp(state.targetPitch - 0.1, -0.2, 1.25);
      else if (e.key === "+" || e.key === "=") state.targetDist = clamp(state.targetDist - 1.0, 6.2, 18.5);
      else if (e.key === "-" || e.key === "_") state.targetDist = clamp(state.targetDist + 1.0, 6.2, 18.5);
      else if (e.key === "0" || e.key === "r" || e.key === "R") {
        const c = CAMERAS.overview;
        state.targetYaw = c.yaw;
        state.targetPitch = c.pitch;
        state.targetDist = c.dist;
        document.querySelectorAll(".cam-btn[data-cam]").forEach((b) => {
          b.classList.toggle("is-active", b.getAttribute("data-cam") === "overview");
        });
      } else {
        handled = false;
      }
      if (handled) {
        e.preventDefault();
        renderFrame(0);
      }
    });

    canvas.addEventListener("pointerdown", (e) => {
      state.dragging = true;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!state.dragging) return;
      const dx = e.clientX - state.lastX;
      const dy = e.clientY - state.lastY;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      state.targetYaw += dx * 0.0075;
      state.targetPitch = clamp(state.targetPitch + dy * 0.006, -0.2, 1.25);
    });
    canvas.addEventListener("pointerup", () => { state.dragging = false; });
    canvas.addEventListener("pointercancel", () => { state.dragging = false; });
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        state.targetDist = clamp(state.targetDist + e.deltaY * 0.01, 6.2, 18.5);
      },
      { passive: false }
    );

    // Floating Zone Pins aligned to anatomical cranial landmarks
    const pinDefs = [
      { id: "pin-sensory", x: -3.2, y: 0.95, z: 1.05 },
      { id: "pin-bottleneck", x: -1.15, y: 1.95, z: 0.45 },
      { id: "pin-wm", x: 0.3, y: 2.55, z: 0.0 },
      { id: "pin-mlt", x: 2.35, y: 1.95, z: -0.2 }
    ];
    const pinEls = {};
    pinDefs.forEach((p) => {
      pinEls[p.id] = document.getElementById(p.id);
    });

    const headMeshData = createHeadShellMesh();
    const bustMeshData = createNeckBustMesh();

    function buildSceneItems(t) {
      const opaque = [];
      const translucent = [];
      const overloadFlag = metrics.cogState === "overload";

      // 1. Sculpted Anthropomorphic Neck Bust & Cranial Floor Base
      opaque.push({
        kind: "bust",
        pos: [0, 0, 0],
        scale: [1, 1, 1],
        color: overloadFlag ? [0.24, 0.19, 0.29] : [0.16, 0.25, 0.40],
        rotY: 0
      });
      // Circular base plinth below bust
      opaque.push({
        kind: "cube",
        pos: [0.5, -2.62, 0],
        scale: [4.2, 0.18, 4.6],
        color: [0.11, 0.17, 0.28],
        rotY: 0
      });
      // Internal cranial floor tray supporting frontal WM & posterior MLT
      opaque.push({
        kind: "cube",
        pos: [0.3, -0.75, 0],
        scale: [2.2, 0.14, 1.85],
        color: [0.15, 0.24, 0.39],
        rotY: 0
      });
      opaque.push({
        kind: "cube",
        pos: [2.05, -0.75, 0],
        scale: [1.45, 0.14, 1.75],
        color: [0.14, 0.30, 0.33],
        rotY: 0
      });

      // 2. Anatomical Sensory Organs: Eyes (Visual Channel) & Ears (Auditory Channel)
      const visLoadRatio = clamp(1 - state.modality / 130, 0.25, 1);
      const audLoadRatio = clamp(state.modality / 100, 0.15, 1);

      // Left & Right Eyes embedded cleanly inside orbital sockets
      [-0.64, 0.64].forEach((ez) => {
        opaque.push({ kind: "sphere", pos: [-1.64, 0.42, ez], scale: [0.40, 0.36, 0.36], color: [0.90, 0.95, 0.99], rotY: 0 });
        opaque.push({ kind: "sphere", pos: [-1.79, 0.42, ez], scale: [0.21, 0.21, 0.21], color: [0.08, 0.80, 0.58], rotY: 0 });
        // Optic nerve tract running from back of eye toward prefrontal WM
        opaque.push({ kind: "cube", pos: [-1.14, 0.32, ez * 0.78], scale: [0.90, 0.08, 0.08], color: [0.10, 0.68, 0.48], rotY: 0 });
      });

      // Left & Right Ear Acoustic Couplers (on cranial sides +/- Z)
      [-2.02, 2.02].forEach((ez, sideIdx) => {
        opaque.push({ kind: "torus", pos: [0.30, 0.08, ez], scale: [0.95, 1.25, 0.95], color: [0.24, 0.68, 0.96], rotY: 0 });
        opaque.push({ kind: "sphere", pos: [0.30, 0.08, ez * 0.96], scale: [0.26, 0.32, 0.18], color: [0.38, 0.80, 1.0], rotY: 0 });
        // Temporal auditory bridge inward toward WM
        const sign = sideIdx === 0 ? -1 : 1;
        opaque.push({ kind: "cube", pos: [0.30, 0.05, sign * 1.45], scale: [0.12, 0.08, 1.05], color: [0.22, 0.62, 0.94], rotY: 0 });
      });

      // Visual Stream Packets entering from outside directly into both Eyes
      const visPackets = 5;
      for (let i = 0; i < visPackets; i++) {
        const u = (t * 0.45 + i / visPackets) % 1;
        const px = lerp(-4.85, -1.78, u);
        const eyeSide = i % 2 === 0 ? 0.64 : -0.64;
        const py = 0.42 + Math.sin(u * Math.PI * 2 + t * 2) * 0.09;
        const sz = 0.17 + visLoadRatio * 0.14;
        opaque.push({ kind: "octa", pos: [px, py, eyeSide], scale: [sz, sz, sz], color: [0.15, 0.88, 0.62], rotY: t * 1.4 + i });
      }

      // Auditory Stream Wave Packets entering from sides into Left & Right Ears
      const audPackets = Math.max(2, Math.round(audLoadRatio * 6));
      for (let i = 0; i < audPackets; i++) {
        const u = (t * 0.50 + i / audPackets) % 1;
        const sign = i % 2 === 0 ? 1 : -1;
        const pz = lerp(sign * 4.1, sign * 2.08, u);
        const px = lerp(-0.6, 0.30, u);
        const py = 0.08 + Math.cos(u * Math.PI * 2 + t * 2.4) * 0.11;
        opaque.push({ kind: "octa", pos: [px, py, pz], scale: [0.21, 0.21, 0.21], color: [0.35, 0.76, 1.0], rotY: -t * 1.5 + i });
      }

      // 3. Prefrontal Attentive Bottleneck Ring (Collo di Bottiglia 4 ± 1 behind forehead)
      const gateColor = overloadFlag ? [0.95, 0.25, 0.25] : [0.35, 0.80, 0.98];
      opaque.push({
        kind: "torus",
        pos: [-0.95, 0.30, 0],
        scale: [1.55, 1.55, 1.15],
        color: gateColor,
        rotY: Math.PI / 2
      });

      // 4. Working Memory 8 Active Slots inside Prefrontal / Central Cranial Cavity
      const totalSlots = 8;
      const intFill = (metrics.intrinsic / 100) * totalSlots;
      const extFill = (metrics.extraneous / 100) * totalSlots;
      const gerFill = (metrics.germane / 100) * totalSlots;
      const intCount = Math.min(totalSlots, Math.round(intFill));
      const extCount = Math.min(totalSlots - intCount, Math.round(extFill));
      const gerCount = Math.min(totalSlots - intCount - extCount, Math.round(gerFill));
      const extOverflowSlots = Math.max(0, Math.round(intFill + extFill) - totalSlots);

      for (let idx = 0; idx < totalSlots; idx++) {
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        const sx = -0.45 + col * 0.50;
        const sz = row === 0 ? -0.48 : 0.48;

        opaque.push({ kind: "cube", pos: [sx, -0.60, sz], scale: [0.40, 0.12, 0.40], color: [0.28, 0.38, 0.56], rotY: 0 });

        let blockType = "empty";
        if (idx < intCount) blockType = "intrinsic";
        else if (idx < intCount + extCount) blockType = "extraneous";
        else if (idx < intCount + extCount + gerCount) blockType = "germane";

        if (blockType === "intrinsic") {
          const h = 0.88 + Math.sin(t * 2 + idx) * 0.04;
          opaque.push({ kind: "cube", pos: [sx, -0.52 + h * 0.5, sz], scale: [0.34, h, 0.34], color: [0.94, 0.58, 0.12], rotY: 0 });
        } else if (blockType === "extraneous") {
          const jitter = overloadFlag ? Math.sin(t * 14 + idx * 2) * 0.04 : 0;
          const h = 1.08;
          opaque.push({ kind: "cube", pos: [sx + jitter, -0.52 + h * 0.5, sz], scale: [0.36, h, 0.36], color: [0.90, 0.22, 0.22], rotY: t * 0.4 + idx });
        } else if (blockType === "germane") {
          const h = 0.96 + Math.sin(t * 3 + idx) * 0.05;
          opaque.push({ kind: "cube", pos: [sx, -0.52 + h * 0.5, sz], scale: [0.33, h, 0.33], color: [0.08, 0.78, 0.52], rotY: 0 });
        } else {
          opaque.push({ kind: "cube", pos: [sx, -0.44, sz], scale: [0.28, 0.18, 0.28], color: [0.20, 0.28, 0.42], rotY: 0 });
        }

        if (extOverflowSlots > 0 && idx >= totalSlots - extOverflowSlots) {
          opaque.push({
            kind: "cube",
            pos: [sx, 0.78 + Math.sin(t * 8 + idx) * 0.06, sz],
            scale: [0.30, 0.22, 0.30],
            color: [0.98, 0.26, 0.26],
            rotY: t * 1.4 + idx
          });
        }
      }

      // Cognitive Overload Warning Sparks escaping cranial vault above head
      if (metrics.overflow > 2) {
        const extraCubes = Math.min(5, Math.ceil(metrics.overflow / 12));
        for (let k = 0; k < extraCubes; k++) {
          const ang = t * 1.9 + k * 1.25;
          opaque.push({
            kind: "octa",
            pos: [0.3 + Math.cos(ang) * 0.95, 1.65 + Math.sin(t * 4 + k) * 0.25, Math.sin(ang) * 0.85],
            scale: [0.28, 0.28, 0.28],
            color: [0.98, 0.30, 0.30],
            rotY: t * 3 + k
          });
        }
      }

      // 5. Germane Bridge Impulses (WM -> Occipital MLT Consolidation)
      const bridgeCount = metrics.germane > 8 ? Math.max(1, Math.round(metrics.germane / 14)) : 0;
      for (let b = 0; b < bridgeCount; b++) {
        const u = (t * 0.55 + b / Math.max(1, bridgeCount)) % 1;
        const bx = lerp(1.05, 2.0, u);
        const by = 0.2 + Math.sin(u * Math.PI) * 0.65;
        opaque.push({ kind: "octa", pos: [bx, by, 0], scale: [0.18, 0.18, 0.18], color: [0.24, 0.96, 0.68], rotY: t * 2.5 });
      }

      // 6. Long-Term Memory (MLT) Schema Lattice inside Occipital Cortex (+X)
      const expRatio = state.expertise / 100;
      const numNodes = 12;
      for (let n = 0; n < numNodes; n++) {
        const layer = Math.floor(n / 4);
        const idx = n % 4;
        const angle = idx * (Math.PI / 2) + layer * 0.45 + (expRatio > 0.4 ? t * 0.18 : 0);
        const spread = lerp(0.75, 0.38, expRatio);
        const nx = 2.05 + Math.cos(angle) * spread;
        const ny = -0.10 + layer * lerp(0.58, 0.40, expRatio) + Math.sin(t * 1.4 + n) * 0.03;
        const nz = Math.sin(angle) * spread;
        const nodeCol =
          expRatio > 0.65
            ? [0.98, 0.80, 0.22]
            : expRatio > 0.35
            ? [0.25, 0.84, 0.74]
            : [0.42, 0.54, 0.74];
        const nScale = lerp(0.18, 0.28, expRatio);
        opaque.push({
          kind: expRatio > 0.5 ? "octa" : "cube",
          pos: [nx, ny, nz],
          scale: [nScale, nScale, nScale],
          color: nodeCol,
          rotY: t * 0.6 + n
        });
      }

      if (expRatio >= 0.45) {
        const coreSz = lerp(0.24, 0.48, expRatio);
        opaque.push({ kind: "octa", pos: [2.05, 0.38, 0], scale: [coreSz, coreSz, coreSz], color: [1.0, 0.86, 0.30], rotY: -t * 0.8 });
      }

      // 7. Outer Translucent Anthropomorphic Cranium & Facial Shell (Fresnel Hologram)
      const shellCol = overloadFlag
        ? [0.95, 0.36, 0.34]
        : metrics.cogState === "underload"
        ? [0.42, 0.54, 0.72]
        : [0.30, 0.74, 0.96];
      translucent.push({
        kind: "head",
        pos: [0, 0, 0],
        scale: [1, 1, 1],
        color: shellCol,
        rotY: 0,
        alpha: 0.14,
        fresnel: 1.0
      });

      return { opaque, translucent };
    }

    // Try WebGL1 initialization
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false });
    let glReady = false;
    let glProg, glLocs;
    const glMeshes = {};

    if (gl) {
      try {
        const vsSrc = `
          attribute vec3 aPos;
          attribute vec3 aNorm;
          uniform mat4 uMVP;
          uniform mat4 uModel;
          uniform vec3 uInvScaleSq;
          varying vec3 vNorm;
          varying vec3 vPos;
          void main() {
            vec4 world = uModel * vec4(aPos, 1.0);
            vPos = world.xyz;
            vNorm = normalize(mat3(uModel) * (aNorm * uInvScaleSq));
            gl_Position = uMVP * vec4(aPos, 1.0);
          }
        `;
        const fsSrc = `
          precision mediump float;
          varying vec3 vNorm;
          varying vec3 vPos;
          uniform vec3 uColor;
          uniform vec3 uEyePos;
          uniform float uAlpha;
          uniform float uFresnel;
          void main() {
            vec3 n = normalize(vNorm);
            if (!gl_FrontFacing) n = -n;
            vec3 lightDir = normalize(vec3(-0.45, 0.85, 0.55));
            float diff = max(dot(n, lightDir), 0.0);
            vec3 viewDir = normalize(uEyePos - vPos);
            float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 2.15);
            if (uFresnel > 0.5) {
              vec3 rimTint = mix(uColor, vec3(0.75, 0.92, 1.0), rim * 0.55);
              vec3 col = rimTint * (0.36 + diff * 0.45 + rim * 1.15);
              float a = clamp(uAlpha + rim * 0.58, 0.08, 0.86);
              gl_FragColor = vec4(col, a);
            } else {
              float backRim = max(dot(n, normalize(vec3(0.6, 0.3, -0.5))), 0.0) * 0.25;
              vec3 col = uColor * (0.40 + diff * 0.65 + backRim + rim * 0.14);
              gl_FragColor = vec4(col, 1.0);
            }
          }
        `;
        function compile(type, src) {
          const s = gl.createShader(type);
          gl.shaderSource(s, src);
          gl.compileShader(s);
          if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
          return s;
        }
        const prog = gl.createProgram();
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));

        function uploadMesh(m) {
          const pb = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, pb);
          gl.bufferData(gl.ARRAY_BUFFER, m.positions, gl.STATIC_DRAW);
          const nb = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, nb);
          gl.bufferData(gl.ARRAY_BUFFER, m.normals, gl.STATIC_DRAW);
          const ib = gl.createBuffer();
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.indices, gl.STATIC_DRAW);
          return { pb, nb, ib, count: m.indices.length };
        }

        glProg = prog;
        glMeshes.cube = uploadMesh(createCubeMesh());
        glMeshes.octa = uploadMesh(createOctaMesh());
        glMeshes.sphere = uploadMesh(createSphereMesh(12, 16));
        glMeshes.torus = uploadMesh(createTorusMesh(0.50, 0.10, 24, 12));
        glMeshes.head = uploadMesh(headMeshData);
        glMeshes.bust = uploadMesh(bustMeshData);

        glLocs = {
          aPos: gl.getAttribLocation(prog, "aPos"),
          aNorm: gl.getAttribLocation(prog, "aNorm"),
          uMVP: gl.getUniformLocation(prog, "uMVP"),
          uModel: gl.getUniformLocation(prog, "uModel"),
          uInvScaleSq: gl.getUniformLocation(prog, "uInvScaleSq"),
          uColor: gl.getUniformLocation(prog, "uColor"),
          uEyePos: gl.getUniformLocation(prog, "uEyePos"),
          uAlpha: gl.getUniformLocation(prog, "uAlpha"),
          uFresnel: gl.getUniformLocation(prog, "uFresnel")
        };
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        glReady = true;
        if (modeTag) modeTag.textContent = "Motore 3D: Testa WebGL Hardware";
      } catch (err) {
        glReady = false;
      }
    }

    let ctx2d = null;
    if (!glReady) {
      state.renderer = "canvas2d";
      ctx2d = canvas.getContext("2d");
      if (modeTag) modeTag.textContent = "Motore 3D: Testa Isometrica Canvas2D";
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(120, Math.round(rect.width * dpr));
      const h = Math.max(180, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    const hudTopEl = canvas.parentElement ? canvas.parentElement.querySelector(".sim3d-hud-top") : null;

    function updatePinOverlay(vp, width, height) {
      const minY = hudTopEl ? Math.max(58, hudTopEl.offsetTop + hudTopEl.offsetHeight + 14) : 58;
      const placed = [];
      const padX = 6;
      const padY = 5;

      pinDefs.forEach((p) => {
        const el = pinEls[p.id];
        if (!el) return;
        const proj = projectPoint(vp, p.x, p.y, p.z, width, height);
        if (!proj || proj.z > 1 || proj.x < -40 || proj.x > width + 40 || proj.y < -30 || proj.y > height + 30) {
          el.style.opacity = "0";
          el.style.transform = "translate(-9999px, -9999px)";
        } else {
          const elW = Math.min(width - 12, el.offsetWidth || 120);
          const elH = el.offsetHeight || 22;
          const halfW = elW * 0.5 + 6;
          const halfH = elH * 0.5;
          const minCy = minY + halfH;
          const maxCy = Math.max(minCy, height - halfH - 8);
          let cx = clamp(proj.x, halfW, Math.max(halfW, width - halfW));
          let cy = clamp(proj.y, minCy, maxCy);

          for (let attempt = 0; attempt < 8; attempt++) {
            const box = {
              left: cx - elW * 0.5,
              right: cx + elW * 0.5,
              top: cy - halfH,
              bottom: cy + halfH
            };
            const hit = placed.find((b) =>
              box.left < b.right + padX &&
              box.right > b.left - padX &&
              box.top < b.bottom + padY &&
              box.bottom > b.top - padY
            );
            if (!hit) break;
            const downCy = hit.bottom + halfH + padY;
            const upCy = hit.top - halfH - padY;
            if (downCy <= maxCy) {
              cy = downCy;
            } else if (upCy >= minCy) {
              cy = upCy;
            } else {
              const shiftRight = hit.right + elW * 0.5 + padX;
              const shiftLeft = hit.left - elW * 0.5 - padX;
              if (shiftRight <= width - halfW) cx = shiftRight;
              else if (shiftLeft >= halfW) cx = shiftLeft;
              else cy = clamp(downCy, minCy, maxCy);
            }
          }

          placed.push({
            left: cx - elW * 0.5,
            right: cx + elW * 0.5,
            top: cy - halfH,
            bottom: cy + halfH
          });
          el.style.opacity = "1";
          el.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) translate(-50%, -50%)`;
        }
      });
    }

    function renderFrame(dt) {
      if (!state.paused) state.time += dt;
      state.yaw = lerp(state.yaw, state.targetYaw, 0.12);
      state.pitch = lerp(state.pitch, state.targetPitch, 0.12);
      state.dist = lerp(state.dist, state.targetDist, 0.12);

      resizeCanvas();
      const w = canvas.width, h = canvas.height;
      const cssW = canvas.clientWidth || 640, cssH = canvas.clientHeight || 420;
      const aspect = w / Math.max(1, h);
      const effectiveDist = aspect < 1.15
        ? state.dist * clamp(1.15 / Math.max(0.55, aspect), 1.0, 1.65)
        : state.dist;

      const eye = [
        Math.sin(state.yaw) * Math.cos(state.pitch) * effectiveDist + 0.1,
        Math.sin(state.pitch) * effectiveDist + 0.25,
        Math.cos(state.yaw) * Math.cos(state.pitch) * effectiveDist
      ];
      const proj = mat4Perspective(0.62, aspect, 0.1, 100);
      const view = mat4LookAt(eye, [0.1, 0.02, 0], [0, 1, 0]);
      const vp = mat4Mul(proj, view);
      const scene = buildSceneItems(state.time);

      if (glReady && gl) {
        gl.viewport(0, 0, w, h);
        gl.clearColor(0.051, 0.082, 0.149, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(glProg);
        gl.uniform3fv(glLocs.uEyePos, eye);

        let boundKind = "";
        function drawItem(it) {
          const buf = glMeshes[it.kind] || glMeshes.cube;
          if (it.kind !== boundKind) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buf.pb);
            gl.enableVertexAttribArray(glLocs.aPos);
            gl.vertexAttribPointer(glLocs.aPos, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, buf.nb);
            gl.enableVertexAttribArray(glLocs.aNorm);
            gl.vertexAttribPointer(glLocs.aNorm, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.ib);
            boundKind = it.kind;
          }
          const model = mat4TRS(it.pos[0], it.pos[1], it.pos[2], it.scale[0], it.scale[1], it.scale[2], it.rotY);
          const mvp = mat4Mul(vp, model);
          const sx = Math.max(0.01, it.scale[0]);
          const sy = Math.max(0.01, it.scale[1]);
          const sz = Math.max(0.01, it.scale[2]);
          gl.uniformMatrix4fv(glLocs.uModel, false, model);
          gl.uniformMatrix4fv(glLocs.uMVP, false, mvp);
          gl.uniform3f(glLocs.uInvScaleSq, 1 / (sx * sx), 1 / (sy * sy), 1 / (sz * sz));
          gl.uniform3fv(glLocs.uColor, it.color);
          gl.uniform1f(glLocs.uAlpha, it.alpha !== undefined ? it.alpha : 1.0);
          gl.uniform1f(glLocs.uFresnel, it.fresnel || 0.0);
          gl.drawElements(gl.TRIANGLES, buf.count, gl.UNSIGNED_SHORT, 0);
        }

        // Pass 1: Opaque internal cognitive architecture & anatomical bust
        gl.disable(gl.BLEND);
        gl.depthMask(true);
        gl.cullFace(gl.BACK);
        for (const it of scene.opaque) {
          drawItem(it);
        }

        // Pass 2: Translucent Fresnel human head & cranium (back faces then front faces)
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        for (const it of scene.translucent) {
          gl.cullFace(gl.FRONT);
          drawItem(it);
          gl.cullFace(gl.BACK);
          drawItem(it);
        }
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      } else if (ctx2d) {
        ctx2d.fillStyle = "#0d1526";
        ctx2d.fillRect(0, 0, w, h);

        // Draw projected sagittal silhouette of the human head behind & framing internal cognitive cubes
        if (headMeshData.profileCurve && headMeshData.profileCurve.length > 2) {
          const polyPts = [];
          for (let i = 0; i < headMeshData.profileCurve.length; i++) {
            const pr = projectPoint(vp, ...headMeshData.profileCurve[i].front, w, h);
            if (pr) polyPts.push(pr);
          }
          for (let i = headMeshData.profileCurve.length - 1; i >= 0; i--) {
            const pr = projectPoint(vp, ...headMeshData.profileCurve[i].back, w, h);
            if (pr) polyPts.push(pr);
          }
          if (polyPts.length > 4) {
            ctx2d.beginPath();
            ctx2d.moveTo(polyPts[0].x, polyPts[0].y);
            for (let i = 1; i < polyPts.length; i++) ctx2d.lineTo(polyPts[i].x, polyPts[i].y);
            ctx2d.closePath();
            ctx2d.fillStyle = metrics.cogState === "overload" ? "rgba(239, 68, 68, 0.14)" : "rgba(56, 189, 248, 0.13)";
            ctx2d.fill();
            ctx2d.strokeStyle = metrics.cogState === "overload" ? "rgba(248, 113, 113, 0.72)" : "rgba(125, 211, 252, 0.72)";
            ctx2d.lineWidth = 2.2;
            ctx2d.stroke();
          }
        }

        const sorted = scene.opaque
          .filter((it) => it.kind !== "bust")
          .map((it) => {
            const pr = projectPoint(vp, it.pos[0], it.pos[1], it.pos[2], w, h);
            const dist = Math.hypot(eye[0] - it.pos[0], eye[1] - it.pos[1], eye[2] - it.pos[2]);
            return { it, pr, dist };
          })
          .filter((x) => x.pr !== null)
          .sort((a, b) => b.dist - a.dist);

        for (const { it, pr, dist } of sorted) {
          const persp = (h * 0.92) / Math.max(2.5, dist);
          const rw = Math.max(6, it.scale[0] * persp);
          const rh = Math.max(6, it.scale[1] * persp);
          const bevel = Math.min(16, Math.max(2, it.scale[2] * persp * 0.28));
          const x = pr.x - rw * 0.5;
          const y = pr.y - rh * 0.5;
          const r = Math.round(it.color[0] * 255);
          const g = Math.round(it.color[1] * 255);
          const b = Math.round(it.color[2] * 255);

          if (it.kind === "sphere" || it.kind === "torus") {
            const rad = Math.max(5, Math.max(rw, rh) * 0.45);
            ctx2d.beginPath();
            ctx2d.arc(pr.x, pr.y, rad, 0, Math.PI * 2);
            if (it.kind === "torus") {
              ctx2d.strokeStyle = `rgb(${r},${g},${b})`;
              ctx2d.lineWidth = Math.max(3, rad * 0.26);
              ctx2d.stroke();
            } else {
              ctx2d.fillStyle = `rgb(${r},${g},${b})`;
              ctx2d.fill();
            }
          } else if (it.kind === "octa") {
            const rad = Math.max(5, (rw + rh) * 0.34);
            ctx2d.beginPath();
            ctx2d.moveTo(pr.x, pr.y - rad);
            ctx2d.lineTo(pr.x + rad, pr.y);
            ctx2d.lineTo(pr.x, pr.y + rad);
            ctx2d.lineTo(pr.x - rad, pr.y);
            ctx2d.closePath();
            ctx2d.fillStyle = `rgb(${Math.min(255, r + 24)},${Math.min(255, g + 24)},${Math.min(255, b + 24)})`;
            ctx2d.fill();
            ctx2d.strokeStyle = "rgba(255,255,255,0.35)";
            ctx2d.stroke();
          } else {
            ctx2d.fillStyle = `rgb(${r},${g},${b})`;
            ctx2d.fillRect(x, y, rw, rh);
            ctx2d.beginPath();
            ctx2d.moveTo(x, y);
            ctx2d.lineTo(x + bevel * 0.7, y - bevel * 0.55);
            ctx2d.lineTo(x + rw + bevel * 0.7, y - bevel * 0.55);
            ctx2d.lineTo(x + rw, y);
            ctx2d.closePath();
            ctx2d.fillStyle = `rgb(${Math.min(255, Math.round(r * 1.22))},${Math.min(255, Math.round(g * 1.22))},${Math.min(255, Math.round(b * 1.22))})`;
            ctx2d.fill();
          }
        }
      }

      updatePinOverlay(vp, cssW, cssH);
    }

    applyPreset("optimal");
    let lastTs = performance.now();
    function tick(now) {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      renderFrame(dt);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSim3D);
  } else {
    initSim3D();
  }
})();
