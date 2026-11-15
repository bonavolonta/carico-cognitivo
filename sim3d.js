/* ==========================================================================
   sim3d.js — Simulatore 3D WebGL dell'Architettura Cognitiva e Carico (CLT + CTML)
   Zero dipendenze esterne | WebGL1 Phong 3D con fallback automatico Canvas2D 3D
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
        "Carico estraneo quasi azzerato e doppi canali bilanciati: il carico intrinseco è gestibile e resta ampio margine per il carico rilevante (costruzione di schemi)."
    },
    novice_aspirin: {
      name: "Novizio: Acido Acetilsalicilico (6 sub-schemi)",
      complexity: 9,
      expertise: 10,
      extraneous: 20,
      modality: 45,
      scaffolding: 20,
      caption:
        "Come nell'esempio di Bonaiuti (Slide 39), per un novizio la formula chimica attiva 6+ elementi separati in WM simultaneamente, rischiando il sovraccarico."
    },
    expert_aspirin: {
      name: "Esperto: Acido Acetilsalicilico (1 singolo chunk)",
      complexity: 9,
      expertise: 95,
      extraneous: 10,
      modality: 75,
      scaffolding: 10,
      caption:
        "Il docente o chimico esperto richiama dall'archivio MLT un singolo schema automatizzato ('Aspirina'): l'alta complessità oggettiva produce carico intrinseco bassissimo."
    },
    split_overload: {
      name: "Sovraccarico Estraneo (Split-Attention + Ridondanza)",
      complexity: 6,
      expertise: 35,
      extraneous: 85,
      modality: 10,
      scaffolding: 40,
      caption:
        "Testo lontano dalle figure, audio identico al testo su slide densa ed elementi decorativi saturano la WM di rosso: il carico rilevante crolla a zero."
    },
    modality_gain: {
      name: "Effetto Modalità (Voce + Diagramma Integrati)",
      complexity: 7,
      expertise: 30,
      extraneous: 15,
      modality: 95,
      scaffolding: 55,
      caption:
        "Suddividere l'informazione tra Taccuino Visuo-Spaziale (diagramma) e Ciclo Fonologico (narrazione sintetica) decomprime la Memoria di Lavoro."
    },
    expertise_reversal: {
      name: "Expertise Reversal Paradox (Esperto + Eccessivo Scaffolding)",
      complexity: 5,
      expertise: 92,
      extraneous: 12,
      modality: 50,
      scaffolding: 95,
      caption:
        "Principio di Kalyuga et al. (2003): aiuti elementari passo-passo indispensabili per il novizio interferiscono con gli schemi dell'esperto generando carico estraneo!"
    },
    underload: {
      name: "Sottoutilizzo Cognitivo (Cognitive Underload)",
      complexity: 1,
      expertise: 80,
      extraneous: 8,
      modality: 50,
      scaffolding: 10,
      caption:
        "Come avverte Landriscina (2007), un compito troppo elementare lascia inattiva la WM: nessuno sforzo generativo, noia e deriva attentiva."
    }
  };

  const CAMERAS = {
    overview: { yaw: -0.34, pitch: 0.42, dist: 14.5 },
    wm: { yaw: 0.02, pitch: 0.34, dist: 9.2 },
    channels: { yaw: -0.78, pitch: 0.35, dist: 11.4 },
    mlt: { yaw: 0.68, pitch: 0.38, dist: 11.2 }
  };

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
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

  function createCubeMesh() {
    // 24 vertices (4 per face) with crisp face normals
    const p = [
      // +Z
      -0.5, -0.5, 0.5,  0.5, -0.5, 0.5,  0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,
      // -Z
      0.5, -0.5, -0.5,  -0.5, -0.5, -0.5,  -0.5, 0.5, -0.5,  0.5, 0.5, -0.5,
      // +Y
      -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,  0.5, 0.5, -0.5,  -0.5, 0.5, -0.5,
      // -Y
      -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5, 0.5,  -0.5, -0.5, 0.5,
      // +X
      0.5, -0.5, 0.5,  0.5, -0.5, -0.5,  0.5, 0.5, -0.5,  0.5, 0.5, 0.5,
      // -X
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
    return {
      positions: new Float32Array(p),
      normals: new Float32Array(n),
      indices: new Uint16Array(idx)
    };
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
    return {
      positions: new Float32Array(pos),
      normals: new Float32Array(norm),
      indices: new Uint16Array(idx)
    };
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

    const segInt = document.getElementById("wm-seg-int");
    const segExt = document.getElementById("wm-seg-ext");
    const segGer = document.getElementById("wm-seg-ger");

    const mTotal = document.getElementById("metric-wm-total");
    const mChunks = document.getElementById("metric-wm-chunks");
    const mGermane = document.getElementById("metric-wm-germane");
    const mReversal = document.getElementById("metric-wm-reversal");

    const prefersReduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const state = {
      complexity: 5,
      expertise: 55,
      extraneous: 10,
      modality: 85,
      scaffolding: 35,
      paused: prefersReduced,
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

    // Update toggle button text respecting WCAG 2.2.2 (label reflects next action, no aria-pressed)
    function syncToggleButton() {
      if (!toggleBtn) return;
      toggleBtn.textContent = state.paused ? "Riprendi animazione" : "Pausa animazione";
    }
    syncToggleButton();

    function computeCognitiveMetrics() {
      // Expertise compresses interactive elements via schema chunking in MLT
      const schemaCompression = 1 - (state.expertise / 100) * 0.72;
      // Scaffolding helps novices reduce intrinsic load, BUT high scaffolding for experts triggers Expertise Reversal!
      const noviceFactor = clamp((65 - state.expertise) / 65, 0, 1);
      const expertFactor = clamp((state.expertise - 60) / 40, 0, 1);
      const scaffoldingRelief = (state.scaffolding / 100) * noviceFactor * 26;
      const reversalPenalty = (state.scaffolding / 100) * expertFactor * 42;

      // Dual-channel Modality Principle relieves visual single-channel congestion
      const visualCongestion = clamp((55 - state.modality) / 55, 0, 1) * 18;

      const rawIntrinsic = clamp(state.complexity * 9.5 * schemaCompression - scaffoldingRelief, 8, 92);
      const rawExtraneous = clamp(state.extraneous * 0.78 + reversalPenalty + visualCongestion, 0, 88);
      const usedBeforeGermane = rawIntrinsic + rawExtraneous;
      const remaining = Math.max(0, 100 - usedBeforeGermane);

      let germane = 0;
      if (usedBeforeGermane >= 100) {
        germane = 0;
      } else if (usedBeforeGermane < 22) {
        germane = Math.min(remaining, 12 + state.complexity * 2);
      } else {
        germane = Math.min(remaining, 36 - reversalPenalty * 0.25);
      }
      germane = Math.max(0, germane);

      const totalLoad = rawIntrinsic + rawExtraneous + germane;
      const activeChunks = Math.max(1, (rawIntrinsic + rawExtraneous) / 14.5).toFixed(1);

      let cogState = "optimal";
      let statusLabel = "Equilibrio Generativo Ottimale";
      if (usedBeforeGermane > 98) {
        cogState = "overload";
        statusLabel = reversalPenalty > 20
          ? "Sovraccarico da Expertise Reversal!"
          : "Sovraccarico Cognitivo (WM Satura)";
      } else if (usedBeforeGermane >= 82) {
        cogState = "warning";
        statusLabel = "Rischio Saturazione WM (Quasi Piena)";
      } else if (totalLoad < 32) {
        cogState = "underload";
        statusLabel = "Sottoutilizzo (Cognitive Underload)";
      } else if (reversalPenalty > 22) {
        cogState = "overload";
        statusLabel = "Interferenza Expertise Reversal";
      }

      return {
        intrinsic: rawIntrinsic,
        extraneous: rawExtraneous,
        germane,
        total: totalLoad,
        overflow: Math.max(0, usedBeforeGermane - 100),
        activeChunks,
        reversalPenalty,
        cogState,
        statusLabel
      };
    }

    let metrics = computeCognitiveMetrics();

    function syncReadout() {
      metrics = computeCognitiveMetrics();
      if (outComplex) outComplex.textContent = state.complexity + " / 10";
      if (outExpert) outExpert.textContent = state.expertise + "%";
      if (outExtra) outExtra.textContent = state.extraneous + "%";
      if (outModal) outModal.textContent = state.modality + "%";
      if (outScaff) outScaff.textContent = state.scaffolding + "%";

      if (statusBadge) {
        statusBadge.textContent = metrics.statusLabel;
        statusBadge.setAttribute("data-state", metrics.cogState);
      }

      const normScale = Math.max(100, metrics.intrinsic + metrics.extraneous + metrics.germane);
      if (segInt) segInt.style.width = ((metrics.intrinsic / normScale) * 100).toFixed(1) + "%";
      if (segExt) segExt.style.width = ((metrics.extraneous / normScale) * 100).toFixed(1) + "%";
      if (segGer) segGer.style.width = ((metrics.germane / normScale) * 100).toFixed(1) + "%";

      if (mTotal) {
        mTotal.textContent = Math.round(metrics.intrinsic + metrics.extraneous) + "% (Int+Est)";
      }
      if (mChunks) mChunks.textContent = metrics.activeChunks + " / 4±1 attivi";
      if (mGermane) mGermane.textContent = Math.round(metrics.germane) + "%";
      if (mReversal) {
        mReversal.textContent =
          metrics.reversalPenalty > 18
            ? "Alto (+" + Math.round(metrics.reversalPenalty) + "% est.)"
            : metrics.reversalPenalty > 8
            ? "Moderato"
            : "Assente";
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

      document.querySelectorAll(".preset-btn[data-preset]").forEach((b) => {
        b.classList.toggle("is-active", b.getAttribute("data-preset") === key);
      });
      syncReadout();
    }

    // Bind sliders & presets
    [
      [slComplex, "complexity"],
      [slExpert, "expertise"],
      [slExtra, "extraneous"],
      [slModal, "modality"],
      [slScaff, "scaffolding"]
    ].forEach(([el, prop]) => {
      if (!el) return;
      el.addEventListener("input", () => {
        state[prop] = Number(el.value);
        document.querySelectorAll(".preset-btn[data-preset]").forEach((b) => b.classList.remove("is-active"));
        if (scenarioDesc) {
          scenarioDesc.textContent =
            "Parametri personalizzati: osserva in 3D come l'expertise comprime gli schemi mentre il carico estraneo sottrae spazio al germane.";
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

    // Mouse / Touch orbit controls
    canvas.addEventListener("keydown", (e) => {
      let handled = true;
      if (e.key === "ArrowLeft") state.targetYaw -= 0.14;
      else if (e.key === "ArrowRight") state.targetYaw += 0.14;
      else if (e.key === "ArrowUp") state.targetPitch = clamp(state.targetPitch + 0.1, 0.12, 1.35);
      else if (e.key === "ArrowDown") state.targetPitch = clamp(state.targetPitch - 0.1, 0.12, 1.35);
      else if (e.key === "+" || e.key === "=") state.targetDist = clamp(state.targetDist - 1.0, 6.8, 22);
      else if (e.key === "-" || e.key === "_") state.targetDist = clamp(state.targetDist + 1.0, 6.8, 22);
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
      state.targetPitch = clamp(state.targetPitch + dy * 0.006, 0.12, 1.35);
    });
    canvas.addEventListener("pointerup", () => { state.dragging = false; });
    canvas.addEventListener("pointercancel", () => { state.dragging = false; });
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        state.targetDist = clamp(state.targetDist + e.deltaY * 0.01, 6.8, 22);
      },
      { passive: false }
    );

    // Floating Zone Pins (DOM overlay positioned via 3D->2D projection)
    const pinDefs = [
      { id: "pin-sensory", x: -4.1, y: 1.75, z: 0 },
      { id: "pin-bottleneck", x: -2.4, y: 2.35, z: 0 },
      { id: "pin-wm", x: 0.4, y: 2.65, z: 0 },
      { id: "pin-mlt", x: 4.9, y: 2.8, z: 0 }
    ];
    const pinEls = {};
    pinDefs.forEach((p) => {
      pinEls[p.id] = document.getElementById(p.id);
    });

    function buildSceneItems(t) {
      const items = [];
      // 1. Structural base plates (Sensory | Bottleneck | Working Memory | MLT)
      items.push({ kind: "cube", pos: [-5.3, -1.15, 0], scale: [2.7, 0.25, 3.8], color: [0.16, 0.24, 0.39], rotY: 0 });
      items.push({ kind: "cube", pos: [0.4, -1.15, 0], scale: [4.5, 0.25, 4.2], color: [0.18, 0.29, 0.49], rotY: 0 });
      items.push({ kind: "cube", pos: [4.9, -1.15, 0], scale: [3.2, 0.25, 4.2], color: [0.14, 0.32, 0.34], rotY: 0 });

      // 2. Dual Sensory Channel Rails (Mayer CTML): Visual (Emerald) + Auditory (Cyan/Blue)
      const visLoadRatio = clamp(1 - state.modality / 130, 0.25, 1);
      const audLoadRatio = clamp(state.modality / 100, 0.15, 1);
      items.push({ kind: "cube", pos: [-4.1, -0.35, 1.05], scale: [4.4, 0.16, 0.52], color: [0.07, 0.65, 0.45], rotY: 0 });
      items.push({ kind: "cube", pos: [-4.1, -0.35, -1.05], scale: [4.4, 0.16, 0.52], color: [0.18, 0.52, 0.94], rotY: 0 });

      // Incoming visual & auditory data packets
      const visPackets = 5;
      for (let i = 0; i < visPackets; i++) {
        const u = ((t * 0.42 + i / visPackets) % 1);
        const px = lerp(-6.1, -2.2, u);
        const py = -0.05 + Math.sin(u * Math.PI * 2 + t * 2) * 0.08;
        const sz = 0.22 + visLoadRatio * 0.18;
        items.push({ kind: "octa", pos: [px, py, 1.05], scale: [sz, sz, sz], color: [0.15, 0.85, 0.6], rotY: t * 1.4 + i });
      }
      const audPackets = Math.max(1, Math.round(audLoadRatio * 5));
      for (let i = 0; i < audPackets; i++) {
        const u = ((t * 0.48 + i / audPackets + 0.15) % 1);
        const px = lerp(-6.1, -2.2, u);
        const py = -0.05 + Math.cos(u * Math.PI * 2 + t * 2) * 0.08;
        items.push({ kind: "octa", pos: [px, py, -1.05], scale: [0.28, 0.28, 0.28], color: [0.32, 0.72, 1.0], rotY: -t * 1.5 + i });
      }

      // 3. Attentive Bottleneck Pillars (4 ± 1 Cognitive Funnel)
      const overloadFlag = metrics.cogState === "overload";
      const gateColor = overloadFlag ? [0.92, 0.25, 0.25] : [0.35, 0.76, 0.98];
      items.push({ kind: "cube", pos: [-2.35, 0.45, 1.5], scale: [0.35, 3.0, 0.4], color: gateColor, rotY: 0 });
      items.push({ kind: "cube", pos: [-2.35, 0.45, -1.5], scale: [0.35, 3.0, 0.4], color: gateColor, rotY: 0 });
      items.push({ kind: "cube", pos: [-2.35, 1.9, 0], scale: [0.35, 0.28, 3.4], color: gateColor, rotY: 0 });

      // 4. Working Memory 8 Active Slots Workbench (4x2 Grid)
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
        const sx = -1.15 + col * 1.03;
        const sz = row === 0 ? -0.95 : 0.95;

        // Slot base pedestal
        items.push({ kind: "cube", pos: [sx, -0.92, sz], scale: [0.76, 0.16, 0.76], color: [0.28, 0.37, 0.54], rotY: 0 });

        let blockType = "empty";
        if (idx < intCount) blockType = "intrinsic";
        else if (idx < intCount + extCount) blockType = "extraneous";
        else if (idx < intCount + extCount + gerCount) blockType = "germane";

        if (blockType === "intrinsic") {
          const h = 1.25 + Math.sin(t * 2 + idx) * 0.04;
          items.push({ kind: "cube", pos: [sx, -0.8 + h * 0.5, sz], scale: [0.64, h, 0.64], color: [0.93, 0.57, 0.12], rotY: 0 });
        } else if (blockType === "extraneous") {
          const jitter = overloadFlag ? Math.sin(t * 14 + idx * 2) * 0.06 : 0;
          const h = 1.55;
          items.push({ kind: "cube", pos: [sx + jitter, -0.8 + h * 0.5, sz], scale: [0.68, h, 0.68], color: [0.89, 0.22, 0.22], rotY: t * 0.4 + idx });
        } else if (blockType === "germane") {
          const h = 1.35 + Math.sin(t * 3 + idx) * 0.06;
          items.push({ kind: "cube", pos: [sx, -0.8 + h * 0.5, sz], scale: [0.62, h, 0.62], color: [0.08, 0.76, 0.52], rotY: 0 });
        } else {
          // Dim empty translucent slot marker
          items.push({ kind: "cube", pos: [sx, -0.65, sz], scale: [0.56, 0.3, 0.56], color: [0.2, 0.27, 0.4], rotY: 0 });
        }

        // Red overflow warning cap stacked on overflowing slots
        if (extOverflowSlots > 0 && idx >= totalSlots - extOverflowSlots) {
          items.push({
            kind: "cube",
            pos: [sx, 1.05 + Math.sin(t * 8 + idx) * 0.08, sz],
            scale: [0.54, 0.32, 0.54],
            color: [0.96, 0.24, 0.24],
            rotY: t * 1.4 + idx
          });
        }
      }

      // Overflow warning cubes floating above WM when overloaded
      if (metrics.overflow > 2) {
        const extraCubes = Math.min(5, Math.ceil(metrics.overflow / 12));
        for (let k = 0; k < extraCubes; k++) {
          const ang = t * 1.9 + k * 1.25;
          items.push({
            kind: "octa",
            pos: [0.4 + Math.cos(ang) * 1.7, 1.55 + Math.sin(t * 4 + k) * 0.22, Math.sin(ang) * 1.4],
            scale: [0.42, 0.42, 0.42],
            color: [0.98, 0.3, 0.3],
            rotY: t * 3 + k
          });
        }
      }

      // 5. Germane Bridge Pulses (WM -> MLT Schema Consolidation)
      const bridgeCount = metrics.germane > 8 ? Math.max(1, Math.round(metrics.germane / 14)) : 0;
      for (let b = 0; b < bridgeCount; b++) {
        const u = ((t * 0.55 + b / Math.max(1, bridgeCount)) % 1);
        const bx = lerp(2.2, 4.4, u);
        const by = 0.2 + Math.sin(u * Math.PI) * 0.9;
        items.push({ kind: "octa", pos: [bx, by, 0], scale: [0.26, 0.26, 0.26], color: [0.22, 0.95, 0.66], rotY: t * 2.5 });
      }

      // 6. Long-Term Memory (MLT) 3D Schema Lattice
      // Low expertise -> scattered disconnected cubes; High expertise -> tight integrated golden crystal chunks!
      const expRatio = state.expertise / 100;
      const numNodes = 12;
      for (let n = 0; n < numNodes; n++) {
        const layer = Math.floor(n / 4);
        const idx = n % 4;
        const angle = idx * (Math.PI / 2) + layer * 0.45 + (expRatio > 0.4 ? t * 0.18 : 0);
        const spread = lerp(1.35, 0.65, expRatio);
        const nx = 4.9 + Math.cos(angle) * spread;
        const ny = -0.3 + layer * lerp(0.95, 0.62, expRatio) + Math.sin(t * 1.4 + n) * 0.04;
        const nz = Math.sin(angle) * spread;
        const nodeCol =
          expRatio > 0.65
            ? [0.96, 0.78, 0.22] // golden automated schemas
            : expRatio > 0.35
            ? [0.25, 0.82, 0.72]
            : [0.42, 0.53, 0.72]; // fragmented novice nodes
        const nScale = lerp(0.26, 0.42, expRatio);
        items.push({
          kind: expRatio > 0.5 ? "octa" : "cube",
          pos: [nx, ny, nz],
          scale: [nScale, nScale, nScale],
          color: nodeCol,
          rotY: t * 0.6 + n
        });
      }

      // Golden MLT core hub when expertise >= 45%
      if (expRatio >= 0.45) {
        const coreSz = lerp(0.35, 0.72, expRatio);
        items.push({ kind: "octa", pos: [4.9, 0.45, 0], scale: [coreSz, coreSz, coreSz], color: [1.0, 0.84, 0.28], rotY: -t * 0.8 });
      }

      return items;
    }

    // Try WebGL1 initialization first
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false });
    let glReady = false;
    let glProg, glCubeBuf, glOctaBuf, glLocs;

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
          void main() {
            vec3 n = normalize(vNorm);
            vec3 lightDir = normalize(vec3(0.45, 0.85, 0.55));
            float diff = max(dot(n, lightDir), 0.0);
            float rim = max(dot(n, normalize(vec3(-0.6, 0.3, -0.5))), 0.0) * 0.25;
            vec3 col = uColor * (0.38 + diff * 0.68 + rim);
            gl_FragColor = vec4(col, 1.0);
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
        glCubeBuf = uploadMesh(createCubeMesh());
        glOctaBuf = uploadMesh(createOctaMesh());
        glLocs = {
          aPos: gl.getAttribLocation(prog, "aPos"),
          aNorm: gl.getAttribLocation(prog, "aNorm"),
          uMVP: gl.getUniformLocation(prog, "uMVP"),
          uModel: gl.getUniformLocation(prog, "uModel"),
          uInvScaleSq: gl.getUniformLocation(prog, "uInvScaleSq"),
          uColor: gl.getUniformLocation(prog, "uColor")
        };
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        glReady = true;
        if (modeTag) modeTag.textContent = "Motore 3D: WebGL Hardware";
      } catch (err) {
        glReady = false;
      }
    }

    let ctx2d = null;
    if (!glReady) {
      state.renderer = "canvas2d";
      ctx2d = canvas.getContext("2d");
      if (modeTag) modeTag.textContent = "Motore 3D: Proiezione Isometrica Canvas2D";
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

          // Resolve 2D overlap against already-placed pins so labels never pile up on narrow screens
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
              // Nudge horizontally if vertical band is tight
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
        Math.sin(state.yaw) * Math.cos(state.pitch) * effectiveDist,
        Math.sin(state.pitch) * effectiveDist + 0.6,
        Math.cos(state.yaw) * Math.cos(state.pitch) * effectiveDist
      ];
      const proj = mat4Perspective(0.68, aspect, 0.1, 100);
      const view = mat4LookAt(eye, [0.2, 0.25, 0], [0, 1, 0]);
      const vp = mat4Mul(proj, view);
      const items = buildSceneItems(state.time);

      if (glReady && gl) {
        gl.viewport(0, 0, w, h);
        gl.clearColor(0.051, 0.082, 0.149, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(glProg);

        let boundKind = "";
        for (const it of items) {
          if (it.kind !== boundKind) {
            const buf = it.kind === "octa" ? glOctaBuf : glCubeBuf;
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
          const count = it.kind === "octa" ? glOctaBuf.count : glCubeBuf.count;
          gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
        }
      } else if (ctx2d) {
        ctx2d.fillStyle = "#0d1526";
        ctx2d.fillRect(0, 0, w, h);
        // Perspective-scaled shaded 3D isometric fallback
        const sorted = items
          .map((it) => {
            const pr = projectPoint(vp, it.pos[0], it.pos[1], it.pos[2], w, h);
            const dist = Math.hypot(eye[0] - it.pos[0], eye[1] - it.pos[1], eye[2] - it.pos[2]);
            return { it, pr, dist };
          })
          .filter((x) => x.pr !== null)
          .sort((a, b) => b.dist - a.dist);

        for (const { it, pr, dist } of sorted) {
          const persp = (h * 0.92) / Math.max(2.5, dist);
          const rw = Math.max(8, it.scale[0] * persp);
          const rh = Math.max(6, it.scale[1] * persp);
          const bevel = Math.min(18, Math.max(3, it.scale[2] * persp * 0.28));
          const x = pr.x - rw * 0.5;
          const y = pr.y - rh * 0.5;
          const r = Math.round(it.color[0] * 255);
          const g = Math.round(it.color[1] * 255);
          const b = Math.round(it.color[2] * 255);

          if (it.kind === "octa") {
            const rad = Math.max(6, (rw + rh) * 0.28);
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
            // Front face
            ctx2d.fillStyle = `rgb(${r},${g},${b})`;
            ctx2d.fillRect(x, y, rw, rh);
            // Top shaded face
            ctx2d.beginPath();
            ctx2d.moveTo(x, y);
            ctx2d.lineTo(x + bevel * 0.7, y - bevel * 0.55);
            ctx2d.lineTo(x + rw + bevel * 0.7, y - bevel * 0.55);
            ctx2d.lineTo(x + rw, y);
            ctx2d.closePath();
            ctx2d.fillStyle = `rgb(${Math.min(255, Math.round(r * 1.22))},${Math.min(255, Math.round(g * 1.22))},${Math.min(255, Math.round(b * 1.22))})`;
            ctx2d.fill();
            // Right shaded face
            ctx2d.beginPath();
            ctx2d.moveTo(x + rw, y);
            ctx2d.lineTo(x + rw + bevel * 0.7, y - bevel * 0.55);
            ctx2d.lineTo(x + rw + bevel * 0.7, y + rh - bevel * 0.55);
            ctx2d.lineTo(x + rw, y + rh);
            ctx2d.closePath();
            ctx2d.fillStyle = `rgb(${Math.round(r * 0.72)},${Math.round(g * 0.72)},${Math.round(b * 0.72)})`;
            ctx2d.fill();
            ctx2d.strokeStyle = "rgba(255,255,255,0.18)";
            ctx2d.lineWidth = 1;
            ctx2d.strokeRect(x, y, rw, rh);
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
