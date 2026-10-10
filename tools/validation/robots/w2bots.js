// Bots du Monde 2 : ils ne font QU'appuyer sur des touches (gauche, droite, saut, course).
(function () {
  const T = () => OT.Game._dbg.time;
  // ---- pilote : gère le saut en l'air (direction, puis on vise une case en descendant) ----
  function pilot(env) {
    const p = env.p, m = env.mem;
    if (!p.onGround && m.air) {
      const a = m.air; a.n++;
      const inp = { jump: a.n < a.hold, run: a.run };
      const tx = typeof a.tx === 'function' ? a.tx(env) : a.tx;
      if (tx !== undefined && (p.vy < 0 || a.steer)) { const dx = tx - p.x; inp.right = dx > 0.08; inp.left = dx < -0.08; }
      else { inp.right = a.dir > 0; inp.left = a.dir < 0; }
      return inp;
    }
    if (p.onGround && m.air && m.air.n > 2) m.air = null;
    return null;   // au sol, ou en l'air sans saut en cours : c'est la politique du niveau qui décide
  }
  function jump(env, dir, tx, hold, run, steer) {
    if (!env.p.onGround) return { right: env.p.vx > 0.5, left: env.p.vx < -0.5 };   // on ne saute qu'au sol
    env.mem.air = { dir, tx, hold: hold === undefined ? 40 : hold, n: 0, run: run === undefined ? 1 : run, steer };
    return { jumpP: true, jump: true, right: dir > 0, left: dir < 0, run: env.mem.air.run };
  }
  function walk(env, x, run, tol) {
    const p = env.p, dx = x - p.x;
    if (Math.abs(dx) < (tol || 0.12)) return { stop: true };
    // freiner à temps (le frottement arrête le joueur en v² / 84 cases)
    if (p.onGround && Math.sign(p.vx) === Math.sign(dx) && Math.abs(dx) < (p.vx * p.vx) / (2 * ((OT.Game.PHYS && OT.Game.PHYS.FRICTION) || 42)) + 0.03) return {};
    return { right: dx > 0, left: dx < 0, run: run ? 1 : 0 };
  }
  const glitchPh = (R, x, y) => { const t = R.tiles[y][x]; return (T() + t.phase) % t.period; };
  window.W2 = { pilot, jump, walk };

  // ---------- 2-1 ----------
  window.w21 = () => (env) => {
    const p = env.p, R = env.R; const a = pilot(env); if (a) return a;
    const [A, B] = R.ents.plat;
    const x = p.x;
    if (x < 14.1) return walk(env, 20, 0);
    if (x < 15) return jump(env, 1, 19.6);
    if (x < 21.2) return walk(env, 30, 0);
    if (x < 22) return jump(env, 1, 26.5);
    if (x < 28.6 && !(p.standOn && p.standOn.plat)) { const w = walk(env, 28.3); if (!w.stop) return w; return A.x < 29.5 ? jump(env, 1, () => A.x + 1, 10, 0) : {}; }
    if (p.standOn && p.standOn.ref === A) { if (Math.abs(p.x - (A.x + 1)) > 0.4) return walk(env, A.x + 1); return B.x - (A.x + 2) < 1.6 ? jump(env, 1, () => B.x + 1, 14, 0) : {}; }
    if (p.standOn && p.standOn.ref === B) { if (Math.abs(p.x - (B.x + 1)) > 0.4) return walk(env, B.x + 1); return B.x + 2 > 40.4 ? jump(env, 1, 43.5, 14, 0) : {}; }
    if (x < 45.7) return walk(env, 50);
    if (x < 47 && p.y < 1.5) return jump(env, 1, 47.8, 10, 0);
    if (x < 58.9) return walk(env, 64);
    if (x < 60 && p.y < 1.5) return jump(env, 1, 62.5);
    return walk(env, 64);
  };
  // ---------- 2-2 ----------
  window.w22 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x;
    if (x < 15) { if (x < 8.9) return walk(env, 12); return jump(env, 1, 14); }
    if (x < 33) {
      if (x < 19.2) return walk(env, 24);
      if (x < 20 && p.y < 1.5) return jump(env, 1, 23.5);
      if (p.y < 1.5 && x < 23.6) return walk(env, 23.8);
      if (p.y < 1.5 && x < 25) return jump(env, 1, 27.2);
      if (p.y < 1.5 && x < 27.2) return walk(env, 27.4);
      if (p.y < 1.5) return jump(env, 1, 29.8);
      return walk(env, 31);
    }
    if (x < 51) {
      const ps = env.players;
      if (env.i === 1 && x < 37.5 && ps[0] && ps[0].x < 46.5 && !ps[0].finished) return walk(env, 36.6);
      if (env.i === 1 && x < 37.5 && env.R.tiles[0].slice(38, 46).some((t) => t && t.state !== 'idle')) return walk(env, 36.6);
      if (x < 46.6) return walk(env, 48, 1); return jump(env, 1, 51);
    }
    if (env.i === 1 && x < 58.5 && env.players[0] && !env.players[0].finished) return walk(env, 57.6);
    if (env.i === 1 && x < 58.5 && env.R.tiles[0].slice(59, 64).some((t) => t && t.state !== 'idle')) return walk(env, 57.6);
    return walk(env, 69, 1);
  };
  // ---------- 2-3 ----------
  window.w23 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = p.y;
    if (x < 26.3) return walk(env, 27);
    if (x < 27 && y < 1.5) return jump(env, 1, 29.8, 14, 0);
    if (x < 45.2 && y < 1.5) return walk(env, 46);
    if (x < 46.4 && y < 1.5) return jump(env, 1, 46.8, 12, 0);
    if (Math.abs(y - 2) < 0.1 && x < 48) return jump(env, 1, 49.8, 40, 0);
    if (Math.abs(y - 4) < 0.1 && x < 51) return jump(env, 1, 52.8, 40, 0);
    if (Math.abs(y - 6) < 0.1 && x < 54.2) return jump(env, 1, 56, 30, 0);
    return walk(env, 69);
  };
  // ---------- 2-4 ----------
  window.w24 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = p.y;
    if (x < 11.4) return walk(env, 30, 1);
    if (x < 13 && y < 1.5) return jump(env, 1, 17.5, 40, 1);
    if (x < 19.0 && y < 1.5) return walk(env, 30, 1);
    if (x < 20.5 && y < 1.5) return jump(env, 1, 25.6, 40, 1);
    if (x < 62) return walk(env, 75, 0);
    if (x < 66.2) return walk(env, 75, 0);
    if (x < 68 && y < 1.5) return jump(env, 1, 70.4, 14, 0);
    return walk(env, 70.5);
  };
  // ---------- 2-5 ----------
  window.w25 = (role) => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const ps = env.players, x = p.x, sh = env.shared;
    if (env.i === 1 && ps[0] && !ps[0].finished) {
      // J2 : ne jamais être sur un pont/des pics pendant que J1 saute ; on saute chacun son tour
      if (x < 30.3) return ps[0].x > 30 && !(ps[0].onGround && ps[0].x > 32.8 && ps[0].x < 35.8) ? walk(env, 29.5) : walk(env, 30.4);
      if (x < 31.2 && p.y < 1.5) return ps[0].onGround && ps[0].x > 32.8 && ps[0].x < 35.8 ? jump(env, 1, 33.6, 6, 0) : {};
      return walk(env, 68);
    }
    if (x < 30.3) return walk(env, 31);
    if (x < 31.2 && p.y < 1.5) return jump(env, 1, 34.4, 6, 0);
    if (ps[1] && x < 35.5 && ps[1].x < 33) return walk(env, 34.6);   // attendre J2 sur le bout de sol
    return walk(env, 68);
  };
  // ---------- 2-6 ----------
  window.w26 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = p.y;
    if (x < 24.2) return walk(env, 30);
    if (x < 25 && y < 1.5) return jump(env, 1, 25.8, 10, 0);
    if (x < 44.2) return walk(env, 50);
    if (x < 45 && y < 1.5) return jump(env, 1, 45.8, 10, 0);
    if (Math.abs(y - 2) < 0.1 && x < 47) return jump(env, 1, 48.6, 40, 0);
    if (x < 63.6) return walk(env, 70);
    if (x < 65 && y < 1.5) return jump(env, 1, 67.6, 40, 0);
    return walk(env, 68.5);
  };
  // ---------- 2-7 ----------
  window.w27 = () => (env) => {
    const p = env.p, R = env.R; const a = pilot(env); if (a) return a;
    const x = p.x, y = p.y, C = R.comp;
    const built = (g) => C[g] && C[g].built >= C[g].n;
    if (x < 10.2 && !built(0)) return walk(env, 9.3);
    if (x < 19) return walk(env, 20);
    if (x < 26.2 && !built(1)) return x < 24.9 ? walk(env, 25.3) : walk(env, 25.3);
    if (x < 37) return walk(env, 40);
    if (x < 42.3 && y < 1.5) return built(2) ? walk(env, 42.6) : walk(env, 42.3, 0, 0.05);
    if (x < 43 && y < 1.5) return built(2) ? jump(env, 1, 43.8, 10, 0) : {};
    if (Math.abs(y - 2) < 0.1 && x < 45.4) return jump(env, 1, 46.8, 40, 0);
    if (Math.abs(y - 4) < 0.1 && x < 48.4) return jump(env, 1, 49.8, 40, 0);
    if (Math.abs(y - 6) < 0.1 && x < 51) return jump(env, 1, 53, 30, 0);
    return walk(env, 61.5);
  };
  // ---------- 2-8 ----------
  window.w28 = () => (env) => {
    const p = env.p, R = env.R; const a = pilot(env); if (a) return a;
    const x = p.x, y = p.y;
    const pairs = [11, 15, 19, 23, 27];
    if (x < 32 && y > 0.5) {
      // sur le bord ou sur une paire de blocs glitch
      const k = pairs.findIndex((px) => x >= px - 0.2 && x <= px + 2.2);
      const nextX = k < 0 ? 11 : pairs[k + 1];
      if (k < 0) { const w = walk(env, 9.4); if (!w.stop) return w; }
      if (nextX === undefined) return jump(env, 1, 33.5, 40, 1);
      const ph = glitchPh(R, nextX, 0);
      const ok = ph < 0.9 || ph > 2.75;
      return ok ? jump(env, 1, nextX + 1.0, 40, 0) : {};
    }
    if (x < 45 && y < 1.5) return x < 44.0 ? walk(env, 50) : jump(env, 1, 45.8, 40, 0);
    if (Math.abs(y - 3) < 0.1 && x < 47) return jump(env, 1, 49.5, 40, 0);
    if (Math.abs(y - 5) < 0.1) return x < 57.1 ? walk(env, 58) : jump(env, 1, 64.6, 40, 0);
    if (x < 66.5) { if (x > 65.75) return walk(env, 71); const ph = glitchPh(R, 67, 1); if (ph > 1.8 && ph < 2.3 && x > 65.3) return walk(env, 71); return walk(env, 65.6); }
    return walk(env, 70.5);
  };
  // ---------- 2-9 ----------
  window.w29 = () => (env) => {
    const p = env.p, R = env.R; const a = pilot(env); if (a) return a;
    const [P1, P2, P3] = R.ents.plat;
    const top = (pl) => pl.y + 0.5;
    const on = (pl) => p.standOn && p.standOn.ref === pl;
    const x = p.x, y = p.y;
    if (on(P1)) return top(P1) > 6.1 ? walk(env, 10) : walk(env, 7);
    if (on(P2)) return top(P2) > 10.1 ? walk(env, 21) : walk(env, 18);
    if (on(P3)) return top(P3) > 14.1 ? walk(env, 35.5) : walk(env, 32);
    if (y < 1.5) { if (x > 5.6) return walk(env, 7); if (Math.abs(top(P1) - 1) < 0.1 && x > 5.0) return walk(env, 7); return walk(env, 5.3); }
    if (Math.abs(y - 6) < 0.1) {
      if (x < 13.2) return walk(env, 16);
      if (x < 14.2) return jump(env, 1, 15.5, 12, 0);
      if (Math.abs(top(P2) - 6) < 0.12 && x > 15.9) return walk(env, 18);
      return walk(env, 16.3, 0, 0.05);
    }
    if (Math.abs(y - 10) < 0.1) { if (Math.abs(top(P3) - 10) < 0.12 && x > 29.4) return walk(env, 32); return walk(env, 29.7, 0, 0.05); }
    return walk(env, 36.5);
  };

  // ---------- 2-10 : le Bug ----------
  const SURF = { F: { top: 1, x0: 1, x1: 35 }, A: { top: 3, x0: 4, x1: 8 }, B: { top: 5, x0: 10, x1: 14 }, C: { top: 3, x0: 16, x1: 20 }, D: { top: 5, x0: 22, x1: 26 }, E: { top: 3, x0: 28, x1: 32 } };
  const LINKS = { F: ['A', 'C', 'E'], A: ['F', 'B'], B: ['A', 'C'], C: ['F', 'B', 'D'], D: ['C', 'E'], E: ['F', 'D'] };
  function surfOf(p) {
    if (!p.onGround) return null;
    const t = Math.round(p.y);
    for (const k of 'ABCDE') { const s = SURF[k]; if (s.top === t && p.x >= s.x0 - 0.35 && p.x <= s.x1 + 0.35) return k; }
    return t === 1 ? 'F' : null;
  }
  function surfAt(x, y) {   // la surface juste sous un point (x, y)
    let best = 'F';
    for (const k of 'ABCDE') { const s = SURF[k]; if (x >= s.x0 && x <= s.x1 && s.top <= y && s.top > SURF[best].top) best = k; }
    return best;
  }
  function route(from, to) {
    const prev = { [from]: null }, q = [from];
    while (q.length) { const c = q.shift(); if (c === to) break; for (const n of LINKS[c]) if (!(n in prev)) { prev[n] = c; q.push(n); } }
    let c = to; const path = [];
    while (c && c !== from) { path.unshift(c); c = prev[c]; }
    return path[0];
  }
  // avance vers (tx) sur la surface S ; renvoie l'entrée ou null si arrivé
  function moveOn(env, S, tx) {
    const s = SURF[S]; const x = Math.max(s.x0 + 0.4, Math.min(s.x1 - 0.4, tx));
    const w = walk(env, x, 1, 0.25); return w.stop ? null : w;
  }
  function goSurface(env, from, to, wantX) {
    const p = env.p;
    if (from === to) return moveOn(env, to, wantX);
    const nx = route(from, to);
    const a = SURF[from], b = SURF[nx];
    const dir = b.x0 > a.x0 ? 1 : -1;
    if (b.top > a.top) {
      // monter : se placer au bord, puis sauter vers l'intérieur de la surface suivante
      let take;
      if (from === 'F') take = Math.abs(p.x - (b.x0 - 0.9)) < Math.abs(p.x - (b.x1 + 0.9)) ? b.x0 - 0.9 : b.x1 + 0.9;
      else take = dir > 0 ? a.x1 - 0.4 : a.x0 + 0.4;
      const d = take < b.x0 ? 1 : -1;
      const w = walk(env, take, 0, 0.18); if (!w.stop) return w;
      return jump(env, d, d > 0 ? b.x0 + 0.9 : b.x1 - 0.9, 40, 0);
    }
    // descendre : marcher hors du bord (vers le sol) ou sauter vers la plateforme plus basse
    if (nx === 'F') { const edge = Math.abs(p.x - a.x0) < Math.abs(p.x - a.x1) ? a.x0 - 0.6 : a.x1 + 0.6; return walk(env, edge, 0, 0.05); }
    const take = dir > 0 ? a.x1 - 0.4 : a.x0 + 0.4;
    const w = walk(env, take, 0, 0.18); if (!w.stop) return w;
    return jump(env, dir, dir > 0 ? b.x0 + 0.9 : b.x1 - 0.9, 20, 0);
  }
  window.wBug = () => (env) => {
    const p = env.p, R = env.R, B = R.boss; const a = pilot(env); if (a) return a;
    if (!B || B.outro > 0) return {};
    const S = surfOf(p); if (!S) return {};
    // éviter les blocs qui tombent
    for (const h of R.hazards) if (h.type === 'drop' && h.y > p.y && Math.abs(h.x - p.x) < 1.0) {
      const d = p.x < h.x ? -1 : 1; const s = SURF[S];
      const nx = p.x + d * 1.6;
      if (S === 'F' || (nx > s.x0 + 0.3 && nx < s.x1 - 0.3)) return { right: d > 0, left: d < 0, run: 1 };
      return { right: d < 0, left: d > 0, run: 1 };
    }
    if (B.phase === 0) {
      const tgt = surfAt(B.x, B.y - 0.8);
      if (S !== tgt) return goSurface(env, S, tgt, B.x) || {};
      if (tgt === 'F') return walk(env, B.x, 1, 0.05);
      const m = moveOn(env, S, B.x); if (m) return m;
      return jump(env, 0, B.x, 40, 0, true);
    }
    if (B.phase === 1) {
      // balayage : sauter quand il arrive sur notre ligne
      if (B.state === 'sweep' && Math.round(p.y) === B.sweepY && B.dir * (p.x - B.x) > 0 && Math.abs(p.x - B.x) < 2.7) return jump(env, 0, p.x, 40, 0, true);
      if (B.state === 'tele' && Math.round(p.y) === B.sweepY) return {};   // ne pas bouger : on saute au bon moment
      const spot = B.logSpots[B.logs]; if (!spot) return {};
      const tgt = surfAt(spot[0], spot[1] - 0.5);
      if (S !== tgt) return goSurface(env, S, tgt, spot[0]) || {};
      const m = moveOn(env, S, spot[0]); if (m) return m;
      return jump(env, 0, spot[0], 40, 0, true);
    }
    // phase 3 : attendre sur E ; quand il est sonné au mur de droite, descendre le toucher, puis remonter
    if (B.state === 'stun' && B.x > 30) {
      if (S === 'E') return walk(env, 33.8, 1, 0.05);
      if (S === 'F') return walk(env, B.x, 1, 0.05);
    }
    if (B.state === 'stun' && B.x < 5) {
      if (S === 'A') return walk(env, 3.4, 1, 0.05);
      if (S === 'F') return walk(env, B.x, 1, 0.05);
    }
    if (S === 'F' && p.x > 32.3) { const w = walk(env, 33.4, 0, 0.15); if (!w.stop) return w; return jump(env, -1, 30.5, 40, 0); }
    if (S === 'F' && p.x < 3.7) { const w = walk(env, 2.6, 0, 0.15); if (!w.stop) return w; return jump(env, 1, 5.5, 40, 0); }
    const home = p.x > 17.5 ? 'E' : 'A';
    if (S !== home) return goSurface(env, S, home, home === 'E' ? 30 : 5.5) || {};
    return moveOn(env, S, home === 'E' ? 30 : 5.5) || {};
  };
})();
