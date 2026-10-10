window.runBot = function (idx, mode, cfg) {
  OT.UI.show(null);
  const who = [{ name: 'Bot', skin: { color: 0x3d8bff, acc: 'aucun' }, collected: new Set() }, { name: 'Bot2', skin: { color: 0xff8a2b, acc: 'aucun' }, collected: new Set() }];
  OT.Game.play(mode, idx, who); OT.UI.show(null);
  for (let i = 0; i < 30 && OT.UI.dialogOpen; i++) document.getElementById('dialog').dispatchEvent(new PointerEvent('pointerdown'));
  const d = OT.Game._dbg, R = d.R;
  if (cfg.setup) cfg.setup(d);
  const solid = (x, y) => { const c = R.grid[y] && R.grid[y][x]; if (c === '#' || c === 'E') return true; const t = R.tiles[y] && R.tiles[y][x]; if (!t) return false; if (c === '=') return t.state !== 'fallen'; if (c === '~') return t.state === 'idle'; return false; };
  const log = []; let lastDeaths = 0; let frames = 0;
  const mem = [{}, {}];
  OT.Game._sim(cfg.frames || 3600, (k, i) => {
    frames = k;
    const p = d.players[i]; if (!p) return {};
    if (R.deaths !== lastDeaths) { lastDeaths = R.deaths; log.push('mort@' + k + ' x=' + p.x.toFixed(1) + ' y=' + p.y.toFixed(1)); }
    return cfg.policy({ p, R, solid, k, mem: mem[i], players: d.players }, i);
  });
  return { state: OT.Game.state, deaths: R.deaths, done: R.done, frames, picked: R.picked.length + '/' + R.coinCount, players: d.players.map(p => [+p.x.toFixed(1), +p.y.toFixed(1), p.alive, p.finished]), log: log.slice(0, 8), boss: R.boss ? { phase: R.boss.phase, hits: R.boss.hits } : null };
};
// Bot générique : avance, saute aux trous et aux murs (saut complet), et par-dessus les pics isolés (petit saut)
window.edgeBot = function (extra, opts = {}) {
  return (env, i) => {
    const { p, R, solid, mem } = env;
    const ty = Math.round(p.y);
    let jumpType = null;
    if (p.onGround) {
      const front = Math.floor(p.x + 0.45);
      if (!solid(front, ty - 1) && !(p.standOn && p.standOn.plat)) jumpType = 'full';
      if (solid(Math.floor(p.x + 0.7), ty)) jumpType = 'full';
      for (let dd = 0.4; dd <= 1.2; dd += 0.2) { const c = R.grid[ty] && R.grid[ty][Math.floor(p.x + dd)]; if (c === '^' || c === 'H') { const c2 = R.grid[ty][Math.floor(p.x + dd) + 1]; jumpType = jumpType || (c2 === '^' ? 'full' : 'short'); } }
      const under = R.grid[ty - 1] && R.grid[ty - 1][Math.floor(p.x)];
      if (under === '=') { mem.onCr = (mem.onCr || 0) + 1; const nxt = R.grid[ty - 1][Math.floor(p.x + 0.7)]; if (nxt !== '=' || mem.onCr >= 14) jumpType = 'full'; } else mem.onCr = 0;
      if (jumpType) { mem.hold = jumpType === 'full' ? 40 : 6; }
    }
    if (mem.hold > 0) mem.hold--;
    let out = { right: true, jump: mem.hold > 0, jumpP: !!jumpType, run: opts.run || (R.grid[ty - 1] && R.grid[ty - 1][Math.floor(p.x)] === '=') ? 1 : 0 };
    if (!p.onGround && p.vy < 0) {
      // en descente : si une plateforme est juste dessous, on arrête d'avancer pour atterrir dessus
      for (let y = Math.floor(p.y) - 1; y >= Math.max(1, Math.floor(p.y) - 3); y--) {
        const c = R.grid[y] && R.grid[y][Math.floor(p.x + 0.2)];
        if (c === '#' || c === '=' || c === 'E') { out.right = false; break; }
      }
    }
    if (extra) { const e = extra(env, i, out); if (e) { out = Object.assign(out, e); if (e.jumpP) mem.hold = e.holdN || (e.short ? 6 : 40); if (e.jump === false) mem.hold = 0; if (e.jump === undefined) out.jump = mem.hold > 0 || !!e.jumpP; } }
    return out;
  };
};
window.platBot = function () {
  return edgeBot((e) => {
    const p = e.p, R = e.R;
    if (p.onGround && p.standOn && p.standOn.plat) {
      const pl = p.standOn.ref;
      const atMax = pl.x >= pl.x0 + pl.range - 0.05;
      if (!atMax) return pl.kind === 'm' ? { right: false, left: true, jump: false, jumpP: false } : { right: true, jump: false, jumpP: false };
      return { right: true, jump: true, jumpP: true };
    }
    const maxEnd = Math.max(...(R.ents.plat || []).map((pl) => pl.x + pl.w));
    if (p.onGround) { const on = p.standOn && p.standOn.plat ? p.standOn.ref : null; e.mem.fromLast = !!on && !(R.ents.plat || []).some((pl) => pl.x0 > on.x0); }
    const moreAhead = !e.mem.fromLast;
    if (!p.onGround && p.x < maxEnd + 1 && moreAhead) {
      const over = (R.ents.plat || []).some((pl) => p.x > pl.x + 0.3 && p.x < pl.x + pl.w - 0.3) || [Math.floor(p.y) - 1, Math.floor(p.y) - 2].some((y) => y >= 1 && R.grid[y] && R.grid[y][Math.floor(p.x)] === '#');
      return { right: !over, left: false };
    }
    const ty = Math.round(p.y);
    if (p.onGround && !e.solid(Math.floor(p.x + 0.45), ty - 1)) {
      const near = (R.ents.plat || []).some((pl) => pl.x < p.x + 4.2 && pl.x > p.x - 0.5);
      if (!near) return { right: false, jump: false, jumpP: false, left: false };
      return { right: true, jump: true, jumpP: true };
    }
  });
};
window.pistonBot = function () {
  return edgeBot((e) => {
    const p = e.p, t0 = OT.Game._dbg.time, T = 1.9;
    const ps = e.R.ents.piston.filter((q) => q.x + 0.5 > p.x - 0.9).sort((a, b) => a.x - b.x);
    if (!ps.length) return;
    // groupe de pistons qui tombent ensemble
    const first = ps[0]; const grp = ps.filter((q) => q.phase === first.phase && q.x - first.x < 4);
    const under = first.x + 0.5 < p.x + 0.3;
    if (under) return { right: true, run: 1 };
    const dist = grp[grp.length - 1].x + 1.5 - p.x;
    if (first.x + 0.5 - p.x < 2.4) {
      const t = (t0 + first.phase) % T;
      const need = dist / 9.5 + 0.08;
      if (t + need < 0.85 || t > 1.85 - 0.02) return { right: true, run: 1 };
      return { right: false, left: false };
    }
  });
};
window.elecBot = function () {
  return edgeBot((e) => {
    const p = e.p, R = e.R, t0 = OT.Game._dbg.time;
    if (p.x > 6.9 && p.x < 7.3 && p.onGround) return { jumpP: true, short: true };
    if (!p.onGround) return { run: 1 };
    const ty = Math.round(p.y);
    const row = R.grid[ty - 1];
    if (row[Math.floor(p.x)] === 'E') return { run: 1 };
    // distance jusqu'au prochain sol électrique
    let xE = -1; for (let x = Math.floor(p.x); x < Math.floor(p.x) + 6; x++) if (row[x] === 'E') { xE = x; break; }
    if (xE < 0) return { run: 1 };
    let n = 0; while (row[xE + n] === 'E') n++;
    const dE = xE - (p.x + 0.33 - 0.15);
    const stop = (p.vx * p.vx) / 120 + 0.25;
    const need = (dE + n + 0.6) / 9.7 + 0.12;
    const c = t0 % 2.6;
    const ok = (c > 1.3 && c + need < 2.6) || R.powerOffT > need;
    if (ok) return { run: 1 };
    if (dE < stop + 0.6) return { right: false, left: p.vx > 0.5, jumpP: false, jump: false };
    return { run: 0 };
  });
};
window.platBot2 = function () {
  const base = platBot();
  return (env, i) => {
    const o = base(env, i);
    const p = env.p, R = env.R;
    if (!p.onGround && p.vy < 0) {
      const ty = Math.round(p.y);
      const ground = [Math.floor(p.y) - 1, Math.floor(p.y) - 2].some((y) => y >= 1 && R.grid[y] && R.grid[y][Math.floor(p.x)] === '#');
      if (ground) { o.right = false; o.left = true; }
    }
    return o;
  };
};
window.ceilBot = function (extra) {
  return edgeBot((e, i, o) => {
    const R = e.R, p = e.p;
    const tr = (R.ents.trigger || []).find((t) => t.act === 'ceiling');
    const pending = R.falling.some((f) => !f.done);
    if (tr && tr.fired && pending) return { right: false, left: true, jump: false, jumpP: false };
    if (extra) return extra(e, i, o);
  });
};
