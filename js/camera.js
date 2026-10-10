/* =====================================================================
   OSWEL'S TRAP — camera.js
   La CAMÉRA que le joueur contrôle (histoire, arènes, personnalisation).
   ---------------------------------------------------------------------
   Elle ne place pas la caméra elle-même : elle donne trois réglages
   lissés que chaque mode applique à sa propre caméra :
     yaw   = tourner autour (gauche / droite)
     pitch = monter / descendre l'angle
     zoom  = s'approcher (< 1) ou s'éloigner (> 1)
   Commandes :
     - manette : stick droit (tourner), R2 (zoom avant), L2 (zoom arrière)
     - pavé tactile PS4 en « mode direct » : glisser = tourner
     - souris : glisser (clic gauche ou droit) = tourner, molette = zoom,
       double-clic = recentrer
     - écran tactile : un doigt = tourner, deux doigts = pincer pour zoomer,
       double tap = recentrer
   Douceur : accélération, inertie, limites, retour automatique.
   Cinématiques : cine() (un mouvement qui revient tout seul au jeu),
   hold() (un cadrage tenu, par exemple sur le gagnant).
   ===================================================================== */
window.OT = window.OT || {};

OT.Cam = (function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const S = {
    yaw: 0, pitch: 0, zoom: 1,          // valeurs affichées (lissées)
    ty: 0, tp: 0, tz: 1,                // cibles demandées par le joueur
    vy: 0, vp: 0,                       // inertie
    lastIn: -99, t: 0,
    lim: { yaw: [-0.5, 0.5], pitch: [-0.2, 0.35], zoom: [0.6, 1.6] },
    cine: null, hold: null, punch: 0, active: false,
  };
  const cfg = () => OT.settings || {};
  const sens = () => cfg().camSens || 1;
  const touched = () => { S.lastIn = S.t; };

  /* ---------- Manettes : stick droit, L2 / R2, pavé tactile ---------- */
  const tpPrev = {};
  function padInput(dt) {
    if (!OT.Input || !OT.Input.pads) return;
    const trig = cfg().camTriggers !== 'run';
    for (const g of OT.Input.pads()) {
      let rx = g.axes[2] || 0, ry = g.axes[3] || 0;
      const m = Math.hypot(rx, ry);
      if (m < 0.18) { rx = 0; ry = 0; } else { const k = Math.min(1, (m - 0.18) / 0.72) / m; rx *= k; ry *= k; }
      if (rx || ry) {
        // accélération douce : plus le stick est poussé, plus ça tourne vite (courbe)
        S.vy += -Math.sign(rx) * rx * rx * 9 * sens() * dt;
        S.vp += Math.sign(ry) * ry * ry * 6 * sens() * dt * (cfg().camInvert ? -1 : 1);
        touched();
      }
      if (trig) {
        const l2 = g.buttons[6] ? g.buttons[6].value || (g.buttons[6].pressed ? 1 : 0) : 0;
        const r2 = g.buttons[7] ? g.buttons[7].value || (g.buttons[7].pressed ? 1 : 0) : 0;
        if (r2 > 0.08) { S.tz *= Math.exp(-dt * 1.5 * r2); touched(); }
        if (l2 > 0.08) { S.tz *= Math.exp(dt * 1.5 * l2); touched(); }
      }
    }
    // pavé tactile de la PS4 (seulement en mode direct : le navigateur ne donne pas la position du doigt)
    if (OT.Light && OT.Light.touches) OT.Light.touches().forEach((T, k) => {
      const f = T && T[0];
      const pv = tpPrev[k];
      if (f && f.down) {
        if (pv && pv.down) {
          const dx = f.x - pv.x, dy = f.y - pv.y;
          S.ty += -dx * 2.6 * sens(); S.tp += dy * 1.4 * sens() * (cfg().camInvert ? -1 : 1);
          // deux doigts : écarter / rapprocher = zoom (si la manette donne les deux doigts)
          const g2 = T[1], p2 = pv.f2;
          if (g2 && g2.down && p2) {
            const d0 = Math.hypot(pv.x - p2.x, pv.y - p2.y), d1 = Math.hypot(f.x - g2.x, f.y - g2.y);
            if (d0 > 0.02 && d1 > 0.02) S.tz *= d0 / d1;
          }
          touched();
        }
        tpPrev[k] = { down: true, x: f.x, y: f.y, f2: T[1] && T[1].down ? { x: T[1].x, y: T[1].y } : null };
      } else tpPrev[k] = null;
    });
  }

  /* ---------- Doigts et souris ---------- */
  const ptr = new Map();
  let pinch = null, lastTap = 0;
  function begin(id, x, y, kind) {
    ptr.set(id, { x, y, kind });
    if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: S.tz }; }
    if (kind === 'touch' && ptr.size === 1) { const now = performance.now(); if (now - lastTap < 280) recenter(); lastTap = now; }
  }
  function move(id, x, y) {
    const p = ptr.get(id);
    if (!p) return;
    const dx = x - p.x, dy = y - p.y;
    p.x = x; p.y = y;
    if (ptr.size >= 2 && pinch) {
      const [a, b] = [...ptr.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.d > 10 && d > 10) S.tz = clamp(pinch.z * (pinch.d / d), S.lim.zoom[0], S.lim.zoom[1]);
      touched();
      return;
    }
    const k = 0.0055 * sens();
    S.ty += -dx * k; S.tp += dy * k * 0.7 * (cfg().camInvert ? -1 : 1);
    touched();
  }
  function end(id) { ptr.delete(id); if (ptr.size < 2) pinch = null; }
  function wheel(dy) { S.tz *= Math.exp(clamp(dy, -200, 200) * 0.0012); touched(); }
  function recenter() { S.ty = 0; S.tp = 0; S.tz = 1; S.vy = S.vp = 0; }

  // la page est « en jeu » quand aucun écran de menu n'est ouvert
  const inGame = () => S.active && !document.querySelector('.screen:not([hidden])');
  function attach(el) {
    el.addEventListener('pointerdown', (e) => {
      if (!inGame()) return;
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
      begin(e.pointerId, e.clientX, e.clientY, e.pointerType);
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
    });
    el.addEventListener('pointermove', (e) => { if (ptr.has(e.pointerId)) move(e.pointerId, e.clientX, e.clientY); });
    const up = (e) => end(e.pointerId);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    el.addEventListener('dblclick', () => { if (inGame()) recenter(); });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey) { e.preventDefault(); return; }       // jamais de zoom du navigateur
      if (inGame()) { e.preventDefault(); wheel(e.deltaY); }
    }, { passive: false });
  }

  /* ---------- Mise à jour (une fois par image) ---------- */
  function update(dt) {
    S.t += dt;
    if (inGame()) padInput(dt);
    // inertie (le stick pousse une vitesse, qui retombe doucement)
    S.ty += S.vy * dt; S.tp += S.vp * dt;
    const fr = Math.exp(-dt * 7);
    S.vy *= fr; S.vp *= fr;
    // limites
    S.ty = clamp(S.ty, S.lim.yaw[0], S.lim.yaw[1]);
    S.tp = clamp(S.tp, S.lim.pitch[0], S.lim.pitch[1]);
    S.tz = clamp(S.tz, S.lim.zoom[0], S.lim.zoom[1]);
    // retour automatique de l'angle (le zoom choisi reste)
    if (cfg().camRecenter !== false && S.t - S.lastIn > 2.6 && !ptr.size) {
      const k = 1 - Math.exp(-dt * 1.3);
      S.ty -= S.ty * k; S.tp -= S.tp * k;
    }
    const k = 1 - Math.exp(-dt * 9);
    S.yaw += (S.ty - S.yaw) * k; S.pitch += (S.tp - S.pitch) * k; S.zoom += (S.tz - S.zoom) * (1 - Math.exp(-dt * 6));
    if (S.cine) { S.cine.t += dt; if (S.cine.t >= S.cine.dur) S.cine = null; }
    S.punch = Math.max(0, S.punch - dt * 0.6);
  }
  // ce que la caméra du mode doit utiliser (avec les cinématiques par-dessus)
  function view() {
    let yaw = S.yaw, pitch = S.pitch, zoom = S.zoom;
    if (S.cine) {
      const c = S.cine, k = Math.max(0, 1 - c.t / c.dur);
      const e = k * k * (3 - 2 * k);           // on revient en douceur
      yaw += c.yaw * e; pitch += c.pitch * e; zoom *= 1 + (c.zoom - 1) * e;
    }
    if (S.hold) {
      // le cadrage tenu arrive en douceur (0,6 s), puis tourne (spin) ou se balance (swing)
      const h = S.hold, ht = S.t - h.t0, e = Math.min(1, ht / 0.6), ee = e * e * (3 - 2 * e);
      yaw += (h.yaw || 0) * ee; pitch += (h.pitch || 0) * ee; zoom *= 1 + ((h.zoom || 1) - 1) * ee;
      if (h.spin) yaw += ht * h.spin;
      if (h.swing) yaw += Math.sin(ht * (h.freq || 0.55)) * h.swing;
    }
    zoom *= 1 - S.punch;
    return { yaw, pitch, zoom, focus: S.hold && S.hold.focus };
  }

  return {
    S, update, view, attach, begin, move, end, wheel, recenter,
    // limites propres à chaque mode
    setLimits(l) { Object.assign(S.lim, l); },
    // à l'entrée d'un mode : on repart d'une caméra neutre
    reset() { recenter(); S.yaw = S.pitch = 0; S.zoom = 1; S.cine = null; S.hold = null; S.punch = 0; ptr.clear(); pinch = null; },
    setActive(v) { S.active = !!v; },
    cine(o) { S.cine = { yaw: o.yaw || 0, pitch: o.pitch || 0, zoom: o.zoom || 1, t: 0, dur: o.dur || 1.5 }; },
    hold(o) { S.hold = o ? Object.assign({ t0: S.t }, o) : null; },
    punch(v) { S.punch = Math.max(S.punch, v); },
    get busy() { return ptr.size > 0; },
  };
})();
