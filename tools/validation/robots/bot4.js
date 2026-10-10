// Bots de test « honnêtes » : ils ne font QUE appuyer sur des touches (gauche, droite, saut, course).
// Aucune téléportation. Un niveau est validé quand la porte est atteinte (ou le boss battu).
(function () {
  const G = () => OT.Game._dbg;
  // ---------- outils ----------
  function surfTop(R, p) { return Math.round(p.y); }
  function under(R, p) { const y = Math.round(p.y) - 1; return R.grid[y] ? R.grid[y][Math.floor(p.x)] : null; }
  function platExtent(R, p) {
    const y = Math.round(p.y) - 1, row = R.grid[y]; if (!row) return null;
    let x0 = Math.floor(p.x), x1 = x0;
    if (!'#=E'.includes(row[x0])) return null;
    while (x0 > 0 && '#=E'.includes(row[x0 - 1])) x0--;
    while (x1 < row.length - 1 && '#=E'.includes(row[x1 + 1])) x1++;
    return { x0, x1: x1 + 1, y: y + 1 };
  }
  // ---------- exécution d'une liste d'étapes ----------
  // go:{x}  marcher jusqu'à x (au sol) ; jump:{dir, landY, stopX, hold} ; stay:{n} ; until:{fn}
  function runStep(s, env, st) {
    const { p } = env;
    st.t = (st.t || 0) + 1;
    if (s.go !== undefined) {
      const dx = s.go - p.x;
      if (Math.abs(dx) < (s.tol || 0.22) && Math.abs(p.vx) < 2.5 && p.onGround) return { done: true, inp: {} };
      if (st.t > 900) return { fail: true };
      const near = Math.abs(dx) < 0.9;
      return { inp: { right: dx > 0.05 && !(near && p.vx > 3.2), left: dx < -0.05 && !(near && p.vx < -3.2), run: s.run && !near ? 1 : 0 } };
    }
    if (s.jump !== undefined) {
      const dir = s.jump;
      if (st.t > 3 && p.onGround) {
        if (s.landY !== undefined && Math.abs(p.y - s.landY) > 0.12) return { fail: true };
        return { done: true, inp: {} };
      }
      if (st.t > 240) return { fail: true };
      let right = dir > 0, left = dir < 0;
      if (s.stopX !== undefined && (p.vy < 0 || (s.landY !== undefined && p.y > s.landY + 0.05)) && ((dir > 0 && p.x >= s.stopX) || (dir < 0 && p.x <= s.stopX))) { right = false; left = false; }
      return { inp: { right, left, jump: st.t < (s.hold || 40), jumpP: st.t === 1, run: s.run ? 1 : 0 } };
    }
    if (s.stay !== undefined) { if (st.t >= s.stay) return { done: true, inp: {} }; return { inp: {} }; }
    if (s.until) { const r = s.until(env, st); return r; }
    return { done: true, inp: {} };
  }
  // routeBot : plan(env) → liste d'étapes ; recalculée au départ, après une mort, ou quand key(env) change
  window.routeBot = function (plan, key, hook) {
    let steps = null, idx = 0, k0 = null, st = {}, fails = 0;
    return (env, i) => {
      const { p } = env;
      if (!p.alive) { steps = null; return {}; }
      const k = key ? key(env) : 0;
      if (steps === null || k !== k0) { steps = plan(env) || []; idx = 0; k0 = k; st = {}; }
      let inp = {};
      if (idx < steps.length) {
        const r = runStep(steps[idx], env, st);
        if (r.fail) { fails++; steps = plan(env) || []; idx = 0; st = {}; }
        else { inp = r.inp || {}; if (r.done) { idx++; st = {}; } }
      }
      if (hook) { const h = hook(env, i, inp); if (h) inp = Object.assign({}, inp, h); }
      return inp;
    };
  };
  // ---------- lancement d'un test ----------
  window.runLevel = function (idx, mode, policies, frames) {
    OT.UI.show(null);
    const who = [{ name: 'Bot1', skin: { color: 0x3d8bff, acc: 'aucun' }, collected: new Set() }, { name: 'Bot2', skin: { color: 0xff8a2b, acc: 'aucun' }, collected: new Set() }];
    OT.Game.play(mode, idx, who, false, window.TEST_WORLD || 1);
    OT.UI.show(null);
    while (OT.UI.dialogOpen) OT.UI._closeDialog();
    const d = G(), R = d.R;
    const log = []; let lastD = 0, f = 0;
    OT._onKill = (p, cause) => log.push(`J${p.i + 1} ${cause} x=${p.x.toFixed(1)} y=${p.y.toFixed(1)}` + (R.boss ? ` phase=${R.boss.phase}` : ''));
    const solid = (x, y) => { const c = R.grid[y] && R.grid[y][x]; if (c === '#' || c === 'E') return true; const t = R.tiles[y] && R.tiles[y][x]; if (!t) return false; if (c === '=') return t.state !== 'fallen'; if (c === '~') return t.state === 'idle'; return false; };
    const shared = {}; const mems = [{}, {}];
    OT.Game._sim(frames || 6000, (k, i) => {
      f = k;
      const p = d.players[i]; if (!p) return {};
      
      const pol = policies[i] || policies[0];
      return pol({ p, R, solid, k, i, shared, mem: mems[i], players: d.players, B: R.boss }, i) || {};
    });
    return { fini: R.done, morts: R.deaths, images: f, temps_s: +(f / 60).toFixed(1), pieces: R.picked.length + '/' + R.coinCount, joueurs: d.players.map((p) => [+p.x.toFixed(1), +p.y.toFixed(1)]), boss: R.boss ? { phase: R.boss.phase, boulons: R.boss.hits, coeur: R.boss.coreHits } : undefined, morts_detail: log.slice(0, 10) };
  };

  // ---------- comportements génériques ----------
  // avance vers la droite, saute les trous / murs / pics / caisses
  window.walker = function (extra) {
    const mem = [{}, {}];
    return (env, i) => {
      const { p, R, solid } = env; const m = mem[i];
      const ty = Math.round(p.y);
      let jt = null;
      if (p.onGround) {
        if (!solid(Math.floor(p.x + 0.45), ty - 1) && !(p.standOn && p.standOn.plat)) jt = 'full';
        if (solid(Math.floor(p.x + 0.7), ty)) jt = 'full';
        for (let dd = 0.4; dd <= 1.2; dd += 0.2) { const c = R.grid[ty] && R.grid[ty][Math.floor(p.x + dd)]; if (c === '^' || c === 'H') { const c2 = R.grid[ty][Math.floor(p.x + dd) + 1]; jt = jt || (c2 === '^' ? 'full' : 'short'); } }
        if (jt) m.hold = jt === 'full' ? 40 : 6;
      }
      if (m.hold > 0) m.hold--;
      let out = { right: true, jump: m.hold > 0, jumpP: !!jt };
      if (!p.onGround && p.vy < 0) {
        for (let y = Math.floor(p.y) - 1; y >= Math.max(1, Math.floor(p.y) - 3); y--) {
          const c = R.grid[y] && R.grid[y][Math.floor(p.x + 0.2)];
          if (c === '#' || c === '=' || c === 'E') { out.right = false; break; }
        }
      }
      if (extra) { const e = extra(env, i, out, m); if (e) { out = Object.assign(out, e); if (e.jumpP) m.hold = e.holdN || (e.short ? 6 : 40); if (e.jump === false) m.hold = 0; if (e.jump === undefined) out.jump = m.hold > 0 || !!e.jumpP; } }
      return out;
    };
  };
  // recule quand un bloc suspendu tombe
  window.ceilWalker = function (extra) {
    return walker((e, i, o, m) => {
      const tr = (e.R.ents.trigger || []).find((t) => t.act === 'ceiling' && t.fired);
      if (tr && e.R.falling.some((f) => !f.done)) return { right: false, left: true, jump: false, jumpP: false };
      if (extra) return extra(e, i, o, m);
    });
  };
})();
// ---------- Marcheur « malin » : il prévoit où il va retomber avant de sauter ----------
(function () {
  const GRAV = 34, JV = 13.2, MAXV = 7.2, ACC_AIR = 38, DT = 1 / 120;
  function solidAt(R, x, y) { const c = R.grid[y] && R.grid[y][x]; if (c === '#' || c === 'E') return true; const t = R.tiles[y] && R.tiles[y][x]; if (!t) return false; if (c === '=') return t.state !== 'fallen'; if (c === '~') return t.state === 'idle'; return false; }
  function dangerAt(R, x, y) {
    const tx = Math.floor(x), ty = Math.floor(y);
    for (const dx of [-0.3, 0, 0.3]) {
      const cx = Math.floor(x + dx);
      const c = R.grid[ty] && R.grid[ty][cx];
      if ((c === '^' || c === 'H') && y - ty < 0.6) return true;
      const ct = R.grid[Math.floor(y + 0.9)] && R.grid[Math.floor(y + 0.9)][cx];
      if (ct === 'W' && (y + 0.9) - Math.floor(y + 0.9) > 0.45) return true;
    }
    for (const sp of (R.ents.spring || [])) if (sp.wrench && Math.abs(sp.x + 0.5 - x) < 0.6 && Math.abs(sp.y - y) < 0.5) return true;
    for (const fp of (R.ents.fakepart || [])) if (!fp.taken && Math.abs(fp.x - x) < 0.8 && Math.abs(fp.y - (y + 0.45)) < 0.8) return true;
    for (const fd of (R.ents.fakedoor || [])) if (Math.abs(fd.x + 0.5 - x) < 0.5 && y < fd.y + 1.8 && y >= fd.y - 0.1) return true;
    return false;
  }
  // simule un saut ; renvoie {ok, x, y} du point d'atterrissage
  function predict(R, x0, y0, vx0, hold) {
    let x = x0, y = y0, vx = vx0, vy = JV, cut = false;
    for (let s = 0; s < 240; s++) {
      const frame = Math.floor(s / 2);
      vx = Math.min(MAXV, vx + ACC_AIR * DT);
      if (frame >= hold && vy > 0 && !cut) { vy *= 0.55; cut = true; }
      vy = Math.max(-22, vy - GRAV * DT);
      const nx = x + vx * DT, ny = y + vy * DT;
      // mur devant ?
      if (solidAt(R, Math.floor(nx + 0.33), Math.floor(ny + 0.1)) || solidAt(R, Math.floor(nx + 0.33), Math.floor(ny + 0.8))) { vx = 0; } else x = nx;
      // plafond
      if (vy > 0 && solidAt(R, Math.floor(x), Math.floor(ny + 0.9))) { vy = 0; } else y = ny;
      if (dangerAt(R, x, y)) return { ok: false };
      if (vy < 0) {
        const ty = Math.floor(y);
        if (y - ty < 0.25 && (solidAt(R, Math.floor(x - 0.25), ty - 1) || solidAt(R, Math.floor(x + 0.25), ty - 1)) && y > 0) {
          // atterrissage : pas de piège juste à côté
          if (dangerAt(R, x + 0.5, ty) || dangerAt(R, x - 0.2, ty)) return { ok: false, x, y: ty };
          const fl = R.grid[ty - 1] && R.grid[ty - 1][Math.floor(x)];
          if (fl === '~') return { ok: false, x, y: ty };
          return { ok: true, x, y: ty };
        }
      }
      if (y < -1) return { ok: false };
    }
    return { ok: false };
  }
  window.smartWalker = function (extra) {
    const mem = [{}, {}];
    return (env, i) => {
      const { p, R } = env; const m = mem[i];
      const ty = Math.round(p.y);
      let need = false;
      if (p.onGround) {
        // bord de corniche : s'il y a un sol juste en dessous (≤ 3 cases), on descend simplement en marchant
        const below = [1, 2, 3].some((d) => solidAt(R, Math.floor(p.x + 0.9), ty - 1 - d)) && !dangerAt(R, p.x + 0.9, ty - 1);
        if (!solidAt(R, Math.floor(p.x + 0.45), ty - 1) && !(p.standOn && p.standOn.plat) && !below) need = true;
        if (solidAt(R, Math.floor(p.x + 0.7), ty)) need = true;
        for (let dd = 0.35; dd <= 1.3; dd += 0.15) if (dangerAt(R, p.x + dd, ty + 0.05)) need = true;
        const under = R.grid[ty - 1] && R.grid[ty - 1][Math.floor(p.x)];
        if (under === '=') need = true;
        // la vraie porte est juste devant, sans piège entre les deux : on entre en marchant
        for (const d of (R.ents.door || [])) if (d.x === d.tx && d.x + 0.5 - p.x > 0 && d.x + 0.5 - p.x < 1.4 && Math.abs(d.y - p.y) < 0.1) need = false;
        if (need) {
          let best = 40;
          for (const h of [4, 7, 10, 14, 19, 26, 40]) { const r = predict(R, p.x, p.y, Math.max(p.vx, 3), h); if (r.ok && r.x > p.x + 0.6) { best = h; break; } }
          m.hold = best;
        }
      }
      if (m.hold > 0) m.hold--;
      let out = { right: true, jump: m.hold > 0, jumpP: need && p.onGround };
      if (extra) { const e = extra(env, i, out, m); if (e) { out = Object.assign(out, e); if (e.jumpP) m.hold = e.holdN || 40; if (e.jump === false) m.hold = 0; if (e.jump === undefined) out.jump = m.hold > 0 || !!e.jumpP; } }
      return out;
    };
  };
  window.smartCeil = function (extra) {
    return smartWalker((e, i, o, m) => {
      const tr = (e.R.ents.trigger || []).find((t) => t.act === 'ceiling' && t.fired);
      if (tr && e.R.falling.some((f) => !f.done)) return { right: false, left: true, jump: false, jumpP: false };
      if (extra) return extra(e, i, o, m);
    });
  };
  window._predict = predict;
})();
// pour les captures : jouer le niveau en cours jusqu'à une condition
window.playUntil = function (cond, policies, frames) {
  const d = OT.Game._dbg, R = d.R; const mems = [{}, {}]; const shared = {};
  const solid = (x, y) => { const c = R.grid[y] && R.grid[y][x]; if (c === '#' || c === 'E') return true; const t = R.tiles[y] && R.tiles[y][x]; if (!t) return false; if (c === '=') return t.state !== 'fallen'; if (c === '~') return t.state === 'idle'; return false; };
  let stop = false;
  OT.Game._sim(frames || 4000, (k, i) => {
    if (stop || cond(R)) { stop = true; return {}; }
    const p = d.players[i]; if (!p) return {};
    return (policies[i] || policies[0])({ p, R, solid, k, i, shared, mem: mems[i], players: d.players, B: R.boss }, i) || {};
  });
  while (OT.UI.dialogOpen) OT.UI._closeDialog();
};
