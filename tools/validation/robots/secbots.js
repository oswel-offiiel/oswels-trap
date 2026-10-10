// =====================================================================
// Robot de validation des grands niveaux (version 1.3).
// Il n'appuie QUE sur des touches (gauche, droite, saut, course, action).
// Pour décider, il « imagine » les secondes qui viennent : il simule sa propre
// physique (mêmes réglages que le jeu) et les pièges (mêmes formules que le jeu),
// essaie plusieurs actions (marcher, courir, sauter plus ou moins loin, attendre,
// reculer) et choisit la plus sûre qui avance le plus.
// =====================================================================
(function () {
  const G = () => OT.Game._dbg;
  const P = OT.Game.PHYS;
  const MAX_V = P.MAX_V, RUN = P.RUN_MUL, ACC_G = P.ACC_GROUND, ACC_A = P.ACC_AIR, FRIC = P.FRICTION, TURN = P.TURN_BOOST, GRAV = P.GRAV, JV = P.JUMP_V;
  const MAX_FALL = -22, PW = 0.66, PH = 0.9, DT = 1 / 120;
  const ov = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const box = (x, y) => ({ x0: x - PW / 2, y0: y, x1: x + PW / 2, y1: y + PH });
  const mod = (a, n) => ((a % n) + n) % n;
  // version 1.5 : les nouveaux pièges, mécanismes coop, poursuites… ajoutent leurs règles pour le robot
  // dans des fichiers « secbots_*.js » (chargés APRÈS celui-ci) :
  //   SECBOT_EXT.tileSolid.push((R, x, y, t, s, tile) => vrai / faux / undefined)   tuile solide au temps t ?
  //   SECBOT_EXT.solids.push((R, b, t, s, out) => …)                               ajouter des boîtes solides
  //   SECBOT_EXT.danger.push((R, t, x, y, s, m, b, bm) => 'raison' ou null)         danger au temps t ?
  //   SECBOT_EXT.step.push((R, s, inp, t, first) => …)                             effets imaginés (déclencheurs…)
  //   SECBOT_EXT.sections['nomDeSection'] = (env, sec, mem, outils) => commandes    robot particulier d'une section
  //   SECBOT_EXT.oneByOne.push('nomDeSection')                                     coop : un joueur après l'autre
  const XB = () => (window.SECBOT_EXT = window.SECBOT_EXT || { tileSolid: [], solids: [], danger: [], step: [], sections: {}, oneByOne: [] });
  XB();

  // ---------- solides (au temps t, pour l'état imaginé s) ----------
  function tileSolidAt(R, x, y, t, s) {
    if (x < 0 || x >= R.W || y < 0 || y >= R.H) return false;
    const c = R.grid[y][x];
    if (c === '#' || c === 'E') return true;
    const tl = R.tiles[y][x];
    if (!tl) return false;
    if (tl.ext) {   // version 1.5 : tuile d'un module (règle du robot, sinon l'état actuel du jeu)
      for (const f of XB().tileSolid) { const r = f(R, x, y, t, s, tl); if (r !== undefined) return !!r; }
      try { return !!tl.ext.solid(tl, OT.Game.api); } catch (e) { return false; }
    }
    switch (tl.ch) {
      case '=': return tl.state !== 'fallen' && !(s.fallen && s.fallen[x + ',' + y]);
      case '~': return tl.state === 'idle' && !(s.dropped && Math.abs(x - s.dropped) < 6);
      case 'X': { const ph = mod(t + tl.phase, tl.period); return ph < tl.period * 0.6; }
      case 'T': { const T = R.tags[tl.group]; return !!T && (T.closed || T.t - (t - G().time) > 0 || (s.tagT && s.tagT[tl.group] > t)); }
      case 'R': case 'Y': case '<': case '>': case 'Z': case 'G': case '{': case '}': return true;
      case 'P': return !s.jumping && (s.jumpLag === undefined || s.jumpLag > 0.08);   // le pont revient 0,08 s après l'atterrissage
      case 'C': return tl.state === 'built' || (s.compT !== undefined && R.comp[tl.cg] && R.comp[tl.cg].t >= 0 && (R.comp[tl.cg].t + (t - G().time)) > 0.35 + tl.order * (R.comp[tl.cg].rate || 0.3) + 0.05);
      case 'D': return tl.state !== 'open';
      case 'K': return s.ab === 0 || R.blackout > 0;
      case 'Q': return s.ab === 1 || R.blackout > 0;
      case 'B': return tl.state !== 'broken';
      case 'N': return !!(R.lev && R.lev[tl.lg]) !== !!tl.inv;
    }
    return false;
  }
  function platsAt(R, t) {
    const out = [];
    for (const pl of R.ents.plat || []) {
      if (pl.kind === 'V') out.push({ x0: pl.x, x1: pl.x + pl.w, y1: pl.y0 + (1 - Math.cos((t + pl.phase) * pl.speed)) / 2 * pl.range + pl.h, y0: pl.y0 + (1 - Math.cos((t + pl.phase) * pl.speed)) / 2 * pl.range, ref: pl });
      else if (pl.kind === 'M') { const x = pl.x0 + Math.sin((t + pl.phase) * pl.speed) * pl.range; out.push({ x0: x, x1: x + pl.w, y0: pl.y, y1: pl.y + pl.h, ref: pl, v: Math.cos((t + pl.phase) * pl.speed) * pl.speed * pl.range }); }
      else out.push({ x0: pl.x, x1: pl.x + pl.w, y0: pl.y, y1: pl.y + pl.h, ref: pl });
    }
    return out;
  }
  function solidsNear(R, b, t, s) {
    const out = [];
    for (let y = Math.floor(b.y0) - 1; y <= Math.floor(b.y1) + 1; y++) for (let x = Math.floor(b.x0) - 1; x <= Math.floor(b.x1) + 1; x++)
      if (tileSolidAt(R, x, y, t, s)) out.push({ x0: x, y0: y, x1: x + 1, y1: y + 1, ref: R.tiles[y] && R.tiles[y][x], tx: x, ty: y });
    for (const gt of R.ents.gate || []) {
      let open = gt.open;
      if (s.gateOpen && s.gateOpen(gt, t)) open = 1;
      if (open < 0.6) { const oy = open * gt.h; out.push({ x0: gt.x + 0.05, y0: gt.y + oy, x1: gt.x + 0.95, y1: gt.y + gt.h + oy, gate: gt }); }
    }
    for (const pl of platsAt(R, t)) if (pl.x0 < b.x1 + 2 && pl.x1 > b.x0 - 2) out.push(Object.assign({ plat: true }, pl));
    for (const c of R.ents.crate || []) if (c.alive) out.push({ x0: c.x, y0: c.y, x1: c.x + c.w, y1: c.y + c.h, crate: c });
    for (const k of R.ents.crusher || []) out.push({ x0: k.x, y0: k.y, x1: k.x + k.w, y1: k.y + k.h, plat: true, crusher: k });
    // version 1.5 : solides des modules (état actuel), puis les règles « imaginées » des robots des modules
    for (const [name, d] of R.extSolid || []) { try { d.solids(R.ents[name], b, out, null, OT.Game.api); } catch (e) {} }
    for (const f of XB().solids) f(R, b, t, s, out);
    return out;
  }
  const inZ = (R, x, y, kind) => (R.ents.zone || []).find((z) => z.kind === kind && x > z.x0 && x < z.x1 && y + 0.45 > z.y0 && y + 0.45 < z.y1);

  // ---------- dangers (au temps t, joueur centré en x, pieds en y) ----------
  const PIST = (tt) => (tt < 0.85 ? 0 : tt < 0.97 ? Math.pow((tt - 0.85) / 0.12, 2) : tt < 1.37 ? 1 : 1 - (tt - 1.37) / 0.53);
  function danger(R, t, x, y, s, m) {
    m = m || 0.06;
    const b = box(x, y), bm = { x0: b.x0 - m, x1: b.x1 + m, y0: b.y0 - m, y1: b.y1 + m };
    if (y < -2.5 || (s.gs < 0 && y > R.H + 1)) return 'fall';
    if (s.back) return 'back';
    // tuiles dangereuses
    for (let ty = Math.floor(b.y0) - 1; ty <= Math.floor(b.y1) + 1; ty++) for (let tx = Math.floor(b.x0); tx <= Math.floor(b.x1); tx++) {
      const c = R.grid[ty] && R.grid[ty][tx];
      if (c === '^' && ov(bm, { x0: tx + 0.1, y0: ty, x1: tx + 0.9, y1: ty + 0.52 })) return 'spike';
      if (c === 'W' && ov(bm, { x0: tx + 0.1, y0: ty + 0.48, x1: tx + 0.9, y1: ty + 1 })) return 'spikeW';
      if (c === 'A' && ov(bm, { x0: tx + 0.05, y0: ty, x1: tx + 0.95, y1: ty + 0.5 })) return 'acid';
      const tl = R.tiles[ty] && R.tiles[ty][tx];
      if (tl && tl.ch === 'J' && s.jumpOut && ov(bm, { x0: tx + 0.1, y0: ty, x1: tx + 0.9, y1: ty + 0.55 })) return 'jspike';
      if (tl && tl.ch === 'H' && tl.state !== 'idle' && ov(bm, { x0: tx + 0.1, y0: ty, x1: tx + 0.9, y1: ty + 0.55 })) return 'crate';
    }
    // sol électrique (comme le jeu : pieds à moins de 0,12 de la surface, même en l'air)
    { const ty = Math.round(y) - 1;
      if (Math.abs(y - (ty + 1)) < 0.16) for (let tx = Math.floor(x - 0.33 + 0.15) ; tx <= Math.floor(x + 0.33 - 0.15); tx++) {
        const c = R.grid[ty] && R.grid[ty][tx];
        if (c === 'E' && R.hasElec && (mod(t, 2.6) < 1.3 || mod(t + 0.06, 2.6) < 1.3) && !(R.powerOffT - (t - G().time) > 0.05)) return 'elec';
      } }
    // sol brûlant / sol piégé sous les pieds
    if (s.g) {
      const ty = Math.round(y) - 1;
      for (let tx = Math.floor(x - 0.33 + 0.15); tx <= Math.floor(x + 0.33 - 0.15); tx++) {
        const tl = R.tiles[ty] && R.tiles[ty][tx];
        if (tl && tl.ch === 'Z' && tl.hg) { const hg = tl.hg; if (mod(t + hg.phase, hg.period) >= hg.period - (hg.hot || 0.9) - 0.08) return 'heat'; }
        if (tl && tl.ch === '~' && R.meta[tx + ',' + ty] && R.meta[tx + ',' + ty].hint) return 'trapfloor';
      }
    }
    // lasers
    for (const L of R.ents.laser || []) {
      const on = mod(t + L.phase, L.period) < L.period * L.on && !(R.blackout > 0) && !(L.lv !== undefined && (!!R.lev[L.lv] !== !!L.inv));
      const pre = mod(t + L.phase + 0.12, L.period) < L.period * L.on;
      if ((on || pre) && ov(bm, L.zone)) return 'laser';
    }
    // pistons
    for (const ps of R.ents.piston || []) {
      const f = PIST(mod(t + ps.phase, 1.9)), f2 = PIST(mod(t + ps.phase + 0.1, 1.9));
      const ff = Math.max(f, f2);
      if (ff > 0.04) { const yb = ps.top + (ps.bottom - ps.top) * ff - 0.08; if (ov(bm, { x0: ps.x + 0.06, y0: yb, x1: ps.x + 0.94, y1: yb + 1 + 3 })) return 'piston'; }
    }
    // marteaux
    for (const hm of R.ents.hammer || []) for (const dt of [0, 0.06]) {
      const a = hm.amp * Math.sin((2 * Math.PI * (t + dt)) / hm.period + hm.phase);
      const hx = hm.px + Math.sin(a) * hm.len, hy = hm.py - Math.cos(a) * hm.len;
      if (ov(bm, { x0: hx - 0.55, y0: hy - 0.4, x1: hx + 0.55, y1: hy + 0.4 })) return 'hammer';
    }
    // scies
    for (const sw of R.ents.saw || []) {
      if (sw.lv !== undefined && (!!R.lev[sw.lv] !== !!sw.inv)) { if (circle(b, sw.x, sw.y, sw.r * 0.86 + m)) return 'saw'; continue; }
      for (const dt of [0, 0.05]) {
        let sx, sy; const tt = t + dt;
        if (sw.ring) { const a = (tt * sw.speed) / sw.ring.rad + sw.phase; sx = sw.ring.cx + Math.cos(a) * sw.ring.rad; sy = sw.ring.cy + Math.sin(a) * sw.ring.rad; }
        else { const u = mod(tt * sw.speed + sw.phase * sw.len, 2 * sw.len), d = u < sw.len ? u : 2 * sw.len - u, k = d / sw.len; sx = sw.a[0] + (sw.b[0] - sw.a[0]) * k; sy = sw.a[1] + (sw.b[1] - sw.a[1]) * k; }
        if (circle(b, sx, sy, sw.r * 0.86 + m + 0.05)) return 'saw';
      }
    }
    // lances / piques
    for (const sp of R.ents.spear || []) for (const dt of [0, 0.08]) {
      const tt = mod(t + dt + sp.phase, sp.period);
      let ext = 0; if (tt < 0.09) ext = (tt / 0.09) * sp.len; else if (tt < 0.6) ext = sp.len; else if (tt < 0.9) ext = (1 - (tt - 0.6) / 0.3) * sp.len;
      if (ext <= 0.25) continue;
      const z = sp.vert ? { x0: sp.x + 0.12, x1: sp.x + 0.88, y0: Math.min(sp.y, sp.y + sp.dir * ext), y1: Math.max(sp.y, sp.y + sp.dir * ext) }
        : { x0: Math.min(sp.x, sp.x + sp.dir * ext), x1: Math.max(sp.x, sp.x + sp.dir * ext), y0: sp.y + 0.32, y1: sp.y + 0.68 };
      if (ov(bm, z)) return 'spear';
    }
    // murs qui se referment
    for (const pr of R.ents.press || []) for (const dt of [0, 0.1]) {
      const tt = mod(t + dt + pr.phase, pr.period);
      let f = 0; if (tt < 0.14) f = tt / 0.14; else if (tt < 0.55) f = 1; else if (tt < 0.95) f = 1 - (tt - 0.55) / 0.4;
      if (f > 0.7 && ov(bm, { x0: pr.x, y0: pr.y, x1: pr.x + pr.gap, y1: pr.y + pr.h })) return 'press';
    }
    // faux drapeaux, fausses pièces
    for (const c of R.ents.cp || []) if (c.fake && !c.fired && Math.abs(x - (c.x + 0.5)) < 0.6 + m && Math.abs(y - c.y) < 1.5) return 'fakecp';
    for (const c of R.ents.fakecoin || []) if (!c.taken && Math.abs(x - c.x) < 0.6 + m && y < c.y + 0.35 && y + PH > c.y - 0.35) return 'fakecoin';
    // circulation (même formule que le jeu)
    for (const tr of R.ents.traffic || []) {
      if (Math.abs(y - tr.y) < 0.3 && tr.shelters.some((sh) => x - 0.3 >= sh.x0 - 0.05 && x + 0.3 <= sh.x1 + 0.05)) continue;
      const span = tr.x1 - tr.x0, per = span + Math.max(...tr.cars.map((c) => c.len)) + 6 + 3;
      for (const c of tr.cars) for (const dt of [0, 0.1]) {
        let u = mod(-Math.abs((t + dt) * tr.speed) + c.off, per); u = per - u;
        const cx = tr.speed > 0 ? tr.x0 - 6 - c.len + u : tr.x1 + 6 - u;
        const zone = { x0: Math.max(cx + 0.1, tr.x0), y0: tr.y, x1: Math.min(cx + c.len - 0.1, tr.x1), y1: tr.y + c.h };
        if (zone.x1 > zone.x0 && ov(bm, zone)) return 'car';
      }
    }
    // tirs des tourelles (déjà tirés + à venir)
    for (const sh of R.shots || []) { const sx = sh.x + sh.vx * (t - G().time); if (Math.abs(sx - sh.x) < sh.range && circle(b, sx, sh.y, 0.17 + m + 0.05)) return 'shot'; }
    for (const tu of R.ents.turret || []) {
      const now = G().time;
      for (let n = 0; n < 4; n++) {
        const tf = now - mod(now + tu.phase, tu.period) + tu.period * (n + 1);   // instants des prochains tirs
        if (tf > t) break;
        const sx = tu.x + 0.5 + tu.dir * 0.9 + tu.dir * tu.speed * (t - tf);
        if (Math.abs(sx - tu.x) > tu.range) continue;
        if (circle(b, sx, tu.y + 0.45, 0.17 + m + 0.05)) return 'shot';
      }
    }
    // bidons : explosion
    for (const br of R.ents.barrel || []) {
      if (br.state === 'gone') continue;
      const tb = br.state === 'fuse' ? G().time + br.t : (s.barrelT && s.barrelT.get(br));
      if (tb !== undefined && t > tb - 0.08 && t < tb + 0.12 && Math.hypot(x - br.x, y + 0.45 - (br.y + 0.5)) < 1.75 + 0.3) return 'boom';
    }
    // écraseurs
    for (const k of R.ents.crusher || []) {
      const tf = s.crushT && s.crushT.get(k);
      let ky = k.y;
      if (k.state === 'fall' || k.state === 'arm' || tf !== undefined) {
        const t0 = k.state === 'arm' ? G().time + k.t : k.state === 'fall' ? G().time : tf + 0.42;
        if (t > t0) { const d = 35 * (t - t0) * (t - t0); ky = Math.max(k.floor, (k.state === 'fall' ? k.y : k.y0) - d); }
        if (t > t0 - 0.02 && ky > k.floor + 0.02 && ov(bm, { x0: k.x + 0.04, y0: ky, x1: k.x + k.w - 0.04, y1: ky + k.h })) return 'crush';
      }
      if ((k.state === 'down' || k.state === 'rise') && ov(b, { x0: k.x, y0: k.y, x1: k.x + k.w, y1: k.y + k.h })) return 'crushwall';
    }
    // poursuite
    for (const c of R.ents.chase || []) {
      if (c.done) continue;
      let front = null;
      if (c.on) front = c.front + c.speed * (t - G().time);
      else if (s.chaseT && s.chaseT.get(c) !== undefined) front = c.x0 - 3 + c.speed * Math.max(0, t - s.chaseT.get(c) - 0.4);
      if (front !== null && x - 0.3 < front + 0.4) return 'chase';
    }
    for (const f of XB().danger) { const w = f(R, t, x, y, s, m, b, bm); if (w) return w; }   // version 1.5
    return null;
  }
  function circle(b, cx, cy, r) { const nx = Math.max(b.x0, Math.min(cx, b.x1)), ny = Math.max(b.y0, Math.min(cy, b.y1)); return Math.hypot(nx - cx, ny - cy) < r; }

  // ---------- la physique imaginée (mêmes formules que updatePlayer / movePlayer) ----------
  function cloneS(s) { return Object.assign({}, s, { fallen: s.fallen ? Object.assign({}, s.fallen) : null, barrelT: s.barrelT ? new Map(s.barrelT) : new Map(), crushT: s.crushT ? new Map(s.crushT) : new Map(), chaseT: s.chaseT ? new Map(s.chaseT) : new Map(), standT: Object.assign({}, s.standT || {}) }); }
  function stateOf(env) {
    const p = env.p, R = env.R;
    return { x: p.x, y: p.y, vx: p.vx, vy: p.vy, g: p.onGround, coy: p.coyote || 0, cut: p.cut, gs: p.gs || 1, ab: R.ab, jumping: !p.onGround && p.jumped, jumpOut: R.jumping || R.jumpLag < 0.2, jumpLag: R.jumpLag,
      boostT: p.boostT || 0, standOn: p.standOn, fallen: {}, barrelT: new Map(), crushT: new Map(), chaseT: new Map(), standT: {}, dead: null, buf: 0 };
  }
  function simStep(R, s, inp, t, first) {
    const dt = DT;
    if (s.dead) return;
    const run = 1 + (RUN - 1) * (inp.run ? 1 : 0);
    let dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (inZ(R, s.x, s.y, 'invert')) dir = -dir;
    const flip = inZ(R, s.x, s.y, 'flip'), gs = flip ? -1 : 1;
    if (gs !== s.gs) { s.gs = gs; s.g = false; s.coy = 0; }
    const wind = inZ(R, s.x, s.y, 'wind');
    const on = s.g && s.standOn;
    const ch = on && on.ref && on.ref.ch;
    const ice = ch === 'R', goo = ch === 'G';
    let target = dir * MAX_V * run * (ice ? 1.2 : 1) * (goo ? 0.42 : 1);
    if (wind) target += wind.power;
    let acc = s.g ? (ice ? (dir ? 9 : 2.2) : (dir ? ACC_G : FRIC)) : ACC_A;
    if (dir && !ice && s.g && s.vx * dir < 0) acc *= TURN;
    s.boostT = Math.max(0, s.boostT - dt);
    if (s.boostT <= 0) { if (s.vx < target) s.vx = Math.min(target, s.vx + acc * dt); else if (s.vx > target) s.vx = Math.max(target, s.vx - acc * dt); }
    s.coy = s.g ? 0.09 : s.coy - dt;
    if (first && inp.jumpP) s.buf = 0.12; else s.buf -= dt;
    if (s.buf > 0 && s.coy > 0) {
      s.vy = JV * gs * (goo ? 0.74 : 1); s.buf = 0; s.coy = 0; s.cut = false; s.jumping = true;
      if (R.hasAB) s.ab ^= 1;
      // (l'élan de la plateforme vaut 0 au moment du saut dans le jeu : la plateforme a bougé au sous-pas précédent)
      s.g = false;
    }
    if (!inp.jump && s.vy * gs > 0 && !s.cut) { s.vy *= 0.55; s.cut = true; }
    let gz = 1;
    for (const z of R.ents.lowg || []) if (s.x > z.x0 && s.x < z.x1 && s.y + 0.45 > z.y0 && s.y + 0.45 < z.y1) gz = 0.38;
    if (inZ(R, s.x, s.y, 'heavy')) gz *= 1.8;
    if (gs > 0) s.vy = Math.max(gz < 1 ? -9 : MAX_FALL, s.vy - GRAV * gz * dt); else s.vy = Math.min(gz < 1 ? 9 : -MAX_FALL, s.vy + GRAV * gz * dt);
    for (const f of R.ents.fan || []) if (s.x > f.x - 0.5 && s.x < f.x + 1.5 && s.y >= f.y - 0.2 && s.y < f.y + f.h) { s.vy = Math.min(s.vy + f.power * dt, 8.5); s.cut = true; }
    // portée par une plateforme / un tapis
    // portée par une plateforme : dans le jeu, la plateforme fait tout son mouvement de l'image au 1er sous-pas,
    // et le joueur le reçoit au 2e sous-pas (s'il est encore debout dessus)
    if (!first && s.g && s.standOn && s.standOn.plat && !s.standOn.crusher) {
      const pl = platsAt(R, t).find((q) => q.ref === s.standOn.ref);
      const pl0 = platsAt(R, t - 1 / 60).find((q) => q.ref === s.standOn.ref);
      if (pl && pl0) { s.x += pl.x0 - pl0.x0; if (s.vy <= 0) s.y += pl.y0 - pl0.y0; }
    }
    if (on && on.ref && on.ref.dir && (ch === '<' || ch === '>')) s.x += on.ref.dir * 3.4 * dt;
    // déplacement + collisions
    const steps = Math.ceil(Math.max(Math.abs(s.vx), Math.abs(s.vy)) * dt / 0.2) || 1;
    for (let k = 0; k < steps; k++) move(R, s, dt / steps, first ? t - 1 / 60 : t);
    if (s.g) s.jumping = false;
    // ressort
    if (s.g && gs > 0 && s.standOn && s.standOn.ref && s.standOn.ref.ch === 'Y') { s.vy = 15.5; s.g = false; s.cut = true; s.jumping = false; }
    // tapis accélérateur
    if (s.g && s.standOn && s.standOn.ref && (s.standOn.ref.ch === '}' || s.standOn.ref.ch === '{') && s.boostT <= 0.05) { s.vx = (s.standOn.ref.ch === '}' ? 1 : -1) * 15.5; s.boostT = 0.42; }
    // blocs rouillés : debout trop longtemps = il tombe
    if (s.g && s.standOn && s.standOn.ref && s.standOn.ref.ch === '=' && s.standOn.ref.state === 'idle') {
      const key = s.standOn.tx + ',' + s.standOn.ty;
      s.standT[key] = (s.standT[key] || 0) + dt;
      if (s.standT[key] > (s.standOn.ref.delay || R.crumbleDelay || 0.3) + 0.02) s.fallen[key] = true;
    }
    // pics-événements (Monde 2)
    s.jumpLag = s.jumping ? 0 : (s.jumpLag === undefined ? 9 : s.jumpLag) + dt; s.jumpOut = s.jumping || s.jumpLag < 0.3;
    // déclencheurs que l'on imagine : bidons, écraseurs, poursuite, sol piégé
    for (const br of R.ents.barrel || []) if (br.state === 'idle' && !s.barrelT.has(br) && Math.abs(s.x - br.x) < 1.25 && Math.abs(s.y - br.y) < 1.4) s.barrelT.set(br, t + 0.95);
    for (const k of R.ents.crusher || []) if (k.state === 'idle' && !s.crushT.has(k) && s.x + PW / 2 > k.x - 0.15 && s.x - PW / 2 < k.x + k.w + 0.15 && s.y < k.y && s.y >= k.floor - 0.6) s.crushT.set(k, t);
    for (const c of R.ents.chase || []) if (!c.on && !c.done && !s.chaseT.has(c) && s.x > c.x0 + 1) s.chaseT.set(c, t);
    for (const tr of R.ents.trigger || []) if (!tr.fired && tr.act === 'drop' && s.x >= tr.x && Math.abs(s.y - tr.y) < 4) s.dropped = tr.x;
    // portails (même test que le jeu) : un portail qui renvoie en arrière est un piège
    s.pcool = Math.max(0, (s.pcool || 0) - dt);
    if (!s.pcool) for (const pt of R.ents.portal || []) if (Math.abs(s.x - pt.x) < 0.45 && s.y < pt.y + 1.4 && s.y + PH > pt.y + 0.2) {
      if (pt.tx < pt.x - 1.5) s.back = true;
      s.x = pt.tx + Math.sign(s.vx || 1) * 0.6; s.y = pt.ty; s.pcool = 0.5; s.standOn = null; break;
    }
    // liens (Monde 2)
    for (const l of R.ents.link || []) if (Math.abs(s.x - l.x) < 0.55 && s.y < l.y + 0.5 && s.y + PH > l.y - 0.5 && !s.lcool) {
      if (!l.good && l.tx < l.x) s.back = true;
      s.x = l.tx + 0.5; s.y = l.ty; s.vx = 0; s.vy = 0; s.lcool = 0.7; break;
    }
    s.lcool = Math.max(0, (s.lcool || 0) - dt);
    for (const f of XB().step) f(R, s, inp, t, first);   // version 1.5
  }
  function move(R, s, dt, t) {
    const prevStand = s.standOn;
    s.standOn = null;
    s.x += s.vx * dt;
    let b = box(s.x, s.y);
    for (const so of solidsNear(R, b, t, s)) {
      if (!ov(b, so)) continue;
      if (so.plat && s.vy <= 0 && b.y0 >= so.y1 - 0.4) continue;
      if (so.crate) { s.vx = Math.max(-3.4, Math.min(3.4, s.vx)); }
      if (s.vx > 0) s.x = so.x0 - PW / 2 - 1e-4; else if (s.vx < 0) s.x = so.x1 + PW / 2 + 1e-4;
      s.vx = so.crate ? s.vx : 0; b = box(s.x, s.y);
    }
    const was = s.g; s.g = false;
    s.y += s.vy * dt;
    b = box(s.x, s.y);
    for (const so of solidsNear(R, b, t, s)) {
      if (!ov(b, so)) continue;
      if (s.gs > 0 ? s.vy <= 0 : s.vy >= 0) { s.y = s.gs > 0 ? so.y1 : so.y0 - PH - 1e-4; s.vy = 0; s.g = true; s.standOn = so; }
      else { s.y = s.gs > 0 ? so.y0 - PH - 1e-4 : so.y1; s.vy = 0; }
      b = box(s.x, s.y);
    }
  }

  // ---------- imaginer une suite d'actions ----------
  // seq : fonction (k) → commande au k-ième 1/60 s ; renvoie { ok, x, y, g, frames }
  function imagine(env, seq, frames, idleAfter) {
    const R = env.R, t0 = G().time;
    const s = stateOf(env);
    let k; const traj = window.DBG_TRAJ ? [] : null;
    for (k = 0; k < frames; k++) {
      const inp = seq(k, s) || {};
      for (let j = 0; j < 2; j++) simStep(R, s, inp, t0 + k / 60, j === 0);
      if (traj) traj.push([+s.x.toFixed(3), +s.y.toFixed(3), +s.vx.toFixed(2)]);
      // le monde de l'image k est calculé au temps t0 + k/60 : on vérifie cet instant et le suivant
      const why = danger(R, t0 + k / 60, s.x, s.y, s) || danger(R, t0 + (k + 1) / 60, s.x, s.y, s);
      if (why) return { ok: false, why, x: s.x, k };
    }
    // ensuite : on reste immobile un moment (l'endroit d'arrivée doit être sûr)
    for (let j = 0; j < (idleAfter || 0); j++) {
      for (let q = 0; q < 2; q++) simStep(R, s, {}, t0 + (k + j) / 60, q === 0);
      const why = danger(R, t0 + (k + j) / 60, s.x, s.y, s) || danger(R, t0 + (k + j + 1) / 60, s.x, s.y, s);
      if (why) return { ok: false, why: 'idle-' + why, x: s.x, k: k + j, late: true };
    }
    return { ok: true, x: s.x, y: s.y, g: s.g, s, traj };
  }
  window.SIM = { imagine, danger, stateOf, simStep, tileSolidAt, solidsNear };

  // ---------- le robot « prudent » : il essaie plusieurs actions et garde la meilleure ----------
  const JUMPS = [];
  for (const hold of [40, 16, 8]) for (const rf of [70, 40, 26, 16, 9]) for (const run of [1, 0]) JUMPS.push({ hold, rf, run });
  function planner(env, goalX, opts) {
    opts = opts || {};
    const p = env.p, m = env.mem;
    // en l'air : on rejoue le plan choisi au sol
    if (m.plan && m.planK < m.plan.n) {
      const k = m.planK++;
      if (!p.onGround || (k < 3 && m.plan.jump)) return m.plan.f(k, stateOf(env));
    }
    m.plan = null;
    // en l'air sans plan (ressort, ventilateur…) : on choisit seulement la direction
    if (!p.onGround) {
      let bestA = null;
      for (const dir of [1, 0, -1]) for (const run of [1, 0]) {
        const f = () => ({ right: dir > 0, left: dir < 0, run });
        const r = imagine(env, f, 60, 30);
        if (!r.ok) continue;
        const prog = (r.x - p.x) * (goalX >= p.x ? 1 : -1);
        if (!bestA || prog > bestA.prog) bestA = { f, prog };
      }
      if (bestA) { m.plan = { f: bestA.f, n: 12, jump: false }; m.planK = 1; return bestA.f(); }
      return {};
    }
    const dirG = goalX >= p.x ? 1 : -1;
    const R = env.R;
    const floaty = (R.ents.lowg || []).some((z) => p.x > z.x0 - 8 && p.x < z.x1 + 2) || (R.ents.fan || []).some((f) => Math.abs(p.x - f.x) < 8);
    const H = opts.horizon || (floaty ? 110 : 54), idle = opts.idle === undefined ? 50 : opts.idle;
    const cands = [];
    // marcher / courir vers le but
    for (const run of opts.noRun ? [0] : [1, 0]) cands.push({ name: 'walk' + run, f: (k, s) => ({ right: dirG > 0 && s.x < goalX, left: dirG < 0 && s.x > goalX, run }), n: H, prefer: 0.3 });
    // sauts variés
    for (const j of JUMPS) cands.push({ name: `jump${j.hold}/${j.rf}/${j.run}`, f: (k) => ({ jump: k < j.hold, jumpP: k === 0, right: dirG > 0 && k < j.rf, left: dirG < 0 && k < j.rf, run: j.run }), n: H });
    // marcher un peu, PUIS sauter (tapis accélérateur, élan, bord de plateforme…)
    if (!opts.noLate) for (const d of [5, 10, 16, 24]) for (const rf of [70, 30]) cands.push({ name: `late${d}/${rf}`, f: (k) => ({ jump: k >= d && k < d + 40, jumpP: k === d, right: dirG > 0 && k < d + rf, left: dirG < 0 && k < d + rf, run: 1 }), n: H + d, jump: true });
    // près d'une zone « commandes inversées » : on essaie aussi les commandes à l'envers
    if ((R.ents.zone || []).some((z) => z.kind === 'invert' && p.x > z.x0 - 6 && p.x < z.x1 + 1)) {
      const sw = (f) => (k, s) => { const o = Object.assign({}, f(k, s)); const r = o.right; o.right = o.left; o.left = r; return o; };
      cands.slice().forEach((c) => cands.push({ name: c.name + '~', f: sw(c.f), n: c.n, prefer: c.prefer }));
    }
    let best = null;
    for (const c of cands) {
      const r = imagine(env, c.f, c.n, idle);
      if (!r.ok) continue;
      const prog = (r.x - p.x) * dirG + (c.prefer || 0);
      if (!best || prog > best.prog + 0.01) best = { c, prog, r };
    }
    if (best && best.prog > 0.25) {
      m.plan = { f: best.c.f, n: best.c.n, jump: /^(jump|late)/.test(best.c.name) }; m.planK = 1;   // rejoué en l'air (on ne change pas d'avis en plein saut)
      if (window.DBG_TRAJ) window.DBG_TRAJ.push({ k: env.k, i: env.i, name: best.c.name, t: G().time, traj: best.r.traj });
      m.last = best.c.name;
      return best.c.f(0, stateOf(env));
    }
    // rien ne fait avancer sans danger : attendre (si l'endroit est sûr) ou reculer
    const wait = imagine(env, () => ({}), 40, 0);
    m.last = 'wait';
    if (wait.ok) return {};
    for (const back of [{ left: dirG > 0, right: dirG < 0 }, { left: dirG > 0, right: dirG < 0, run: 1 }]) {
      const r = imagine(env, () => back, 30, 10);
      if (r.ok) { m.last = 'back'; return back; }
    }
    // dernier recours : un saut sur place
    return { jumpP: true, jump: true };
  }
  window.planner = planner;

  // ---------- robots particuliers (puzzles) ----------
  const W2 = window.W2;
  const walkTo = (env, x, run) => W2.walk(env, x, run, 0.15);
  const SB = {};
  const ONE_BY_ONE = new Set(['jumpEvents', 'kqHop']);
  SB.crateBtn = (env, sec, m) => {
    const p = env.p, R = env.R;
    const cr = (R.ents.crate || []).find((c) => Math.abs(c.x0 - sec.cx - 0.02) < 0.1);
    const btn = (R.ents.button || []).find((b) => b.x === sec.bx);
    if (!cr || !btn) return planner(env, sec.x1);
    if (cr.x < btn.x + 0.02 && !btn.pressed) {
      // pousser : on se met derrière la caisse et on avance jusqu'à ce qu'elle couvre le bouton
      if (p.x > cr.x) return planner(env, cr.x - 1);
      return { right: cr.x + 0.02 < btn.x + 0.04 };
    }
    return planner(env, sec.x1 + 0.5);
  };
  SB.crateStep = (env, sec) => {
    const p = env.p, R = env.R;
    const cr = (R.ents.crate || []).find((c) => Math.abs(c.x0 - sec.cx - 0.02) < 0.1);
    if (!cr) return planner(env, sec.x1);
    if (p.y > 3.5) return planner(env, sec.x1 + 0.5);
    if (cr.x + cr.w < sec.wall - 0.05) { if (p.x > cr.x) return W2.jump(env, -1, cr.x - 0.8, 40, 0); return { right: true }; }
    // la caisse est contre le mur : on monte dessus puis sur la corniche
    if (p.y < 1.5) { if (p.x < cr.x - 1.0) return { right: true }; return W2.jump(env, 1, cr.x + 0.5, 40, 0, true); }
    return W2.jump(env, 1, sec.wall + 1.5, 40, 1);
  };
  SB.levers = (env, sec, m) => {
    const p = env.p, R = env.R;
    const g = Object.keys(R.lev || {})[0];
    const on = (gg) => !!R.lev[gg];
    const lv1 = (R.ents.lever || []).find((l) => l.x === sec.l1), lv2 = (R.ents.lever || []).find((l) => l.x === sec.l2);
    if (!lv1) return planner(env, sec.x1);
    if (p.x < sec.b0 - 0.3) {
      if (!on(lv1.g)) { if (Math.abs(p.x - (lv1.x + 0.5)) > 0.3) return walkTo(env, lv1.x + 0.5); return m.useCool-- > 0 ? {} : (m.useCool = 20, { talkP: true }); }
      return planner(env, sec.b1 + 2);
    }
    if (p.x < sec.gx - 1 && on(lv2.g)) { if (Math.abs(p.x - (lv2.x + 0.5)) > 0.3) return walkTo(env, lv2.x + 0.5); return m.useCool-- > 0 ? {} : (m.useCool = 20, { talkP: true }); }
    return planner(env, sec.x1 + 0.5);
  };
  // blocs roses / bleus : si les bleus (Q) sont déjà « allumés » au départ, un petit saut sur place
  // remet la bonne parité (sinon le premier saut les éteindrait sous nos pieds)
  SB.kqHop = (env, sec, m) => {
    const p = env.p, R = env.R;
    if (m.parity) { if (!p.onGround) return {}; m.parity = false; }
    if (p.onGround && p.x < sec.q1 - 0.3 && Math.abs(p.y - 1) < 0.05 && R.ab === 1) {
      if (Math.abs(p.vx) > 0.2) return {};
      m.parity = true; return { jumpP: true, jump: true };
    }
    return planner(env, sec.x1 + 0.5);
  };
  // gravité inversée : avant de redescendre (fin de la zone), on attend que les tirs d'une
  // tourelle plus loin soient passés (on retombe juste devant elle)
  SB.flipRoom = (env, sec, m) => {
    const p = env.p, R = env.R;
    if ((p.gs || 1) < 0 && p.onGround && p.x > sec.z1 - 4 && p.x < sec.z1 + 0.2) {
      const xl = sec.z1 + 1;
      const bad = (R.shots || []).some((s) => s.y < 2.6 && s.vx < 0 && s.x > xl - 1.5 && (s.x - xl) / -s.vx < 1.9);
      if (bad) { const w = walkTo(env, sec.z1 - 3); return w.stop ? {} : w; }
    }
    return planner(env, sec.x1 + 0.5);
  };
  // les ponts « événement saut » : on y arrive en MARCHANT (un saut juste avant les ferait disparaître)
  SB.jumpEvents = (env, sec, m) => {
    const p = env.p, R = env.R;
    if (p.x < sec.br1 + 0.5) {
      if (!p.onGround) return {};
      if (p.x < sec.br0 - 0.3 && !R.bridgeOn) return {};
      return { right: true, run: 0 };
    }
    return planner(env, sec.x1 + 0.5);
  };
  // le ventilateur : se placer dans le souffle, se laisser monter, puis glisser sur la corniche
  SB.fanLift = (env, sec) => {
    const p = env.p;
    if (p.x < sec.ledge + 0.2 && p.y < sec.top - 0.5) {
      const fx = sec.fan + 0.5;
      if (Math.abs(p.x - fx) > 0.25) { const w = walkTo(env, fx); return w.stop ? {} : w; }
      return {};
    }
    return planner(env, sec.x1 + 0.5);
  };
  SB.wireCeil = (env, sec, m) => {
    const p = env.p, R = env.R;
    const tr = (R.ents.trigger || []).find((t) => t.x === sec.wx);
    if (tr && !tr.fired) { if (p.x < sec.wx + 0.6) return { right: true }; }
    if (tr && tr.fired && R.falling.some((f) => !f.done)) return walkTo(env, sec.wx - 0.2);
    if (tr && tr.fired && (tr.t || 0) < 1.4) return walkTo(env, sec.wx - 0.2);
    return planner(env, sec.x1 + 0.5);
  };
  SB.tags = (env, sec, m) => {
    const p = env.p, R = env.R, T = R.tags[sec.g];
    if (T && !T.closed && T.t <= 0.3 && p.x < sec.b0) { const w = W2.walk(env, sec.t0 + 0.5, 0, 0.25); return w.stop ? {} : w; }
    return planner(env, sec.x1 + 0.5);
  };
  SB.compileBridge = (env, sec) => {
    const p = env.p, R = env.R;
    const cb = (R.ents.compile || []).find((c) => c.x === sec.btn);
    const C = cb && R.comp[cb.g];
    if (cb && !cb.pressed) return walkTo(env, sec.btn + 0.5);
    if (C && C.built < C.n) return walkTo(env, sec.btn + 0.5);
    return planner(env, sec.x1 + 0.5);
  };
  // liens / portails : on entre dans le bon (s'il a été dépassé sans téléportation, on revient dessus)
  const pickBot = (env, sec) => {
    const p = env.p, gx = sec.good + 0.5;
    if (p.x < sec.out - 0.5 && p.x > gx + 0.3 && p.onGround) { const w = W2.walk(env, gx, 0, 0.05); return w.stop ? { left: true } : w; }
    return planner(env, p.x < gx ? gx + 0.2 : sec.x1 + 2);
  };
  SB.linkPick = pickBot; SB.portalPick = pickBot;
  SB.portalPickOld = (env, sec) => {
    const p = env.p;
    if (p.x < sec.trap + 1.6) return planner(env, sec.trap + 1.5);
    if (p.x < sec.good + 0.5 && p.x < sec.out) return W2.walk(env, sec.good + 0.55, 0, 0.05).stop ? { right: true } : W2.walk(env, sec.good + 0.55, 0, 0.05);
    return planner(env, sec.x1 + 0.5);
  };
  SB.doorTrio = (env, sec) => planner(env, sec.x1 + 3);
  // caisse bouclier : pousser jusqu'à la marche, monter sur la caisse, puis sur la marche
  SB.crateShield = (env, sec) => {
    const p = env.p, R = env.R;
    const cr = (R.ents.crate || []).find((c) => Math.abs(c.x0 - sec.cx - 0.02) < 0.1);
    if (p.y > 2.5 || p.x > sec.step) return planner(env, sec.x1 + 2);
    if (!cr || !cr.alive) return planner(env, sec.x1 + 2);
    if (cr.x + cr.w < sec.step - 0.05) return { right: true };          // on pousse (le rayon s'arrête sur la caisse)
    if (p.y < 1.5) { if (Math.abs(p.vx) > 0.5) return {}; return W2.jump(env, 1, cr.x + 0.45, 40, 0); }
    return W2.jump(env, 1, sec.step + 1.5, 40, 0);
  };
  // tour : on suit les corniches en zigzag, puis on passe par-dessus le mur
  SB.tower = (env, sec, m) => {
    const p = env.p, L = sec.ledges;
    if ((p.y >= sec.top - 0.1 && p.x > sec.wall - 4) || p.x > sec.wall + 0.6) return planner(env, sec.x1 + 3);
    if (!p.onGround) return {};
    let idx = -1;
    for (let k = L.length - 1; k >= 0; k--) if (Math.abs(p.y - L[k].y) < 0.25 && p.x > L[k].x0 - 0.4 && p.x < L[k].x1 + 0.4) { idx = k; break; }
    if (idx < 0) return planner(env, sec.x0 + 1);
    const cur = L[idx], nx = L[idx + 1];
    if (!nx) return planner(env, sec.x1 + 3);
    const goRight = (nx.x0 + nx.x1) / 2 > p.x;
    // on se place au bord de la corniche actuelle, du côté de la suivante, sans être dessous
    const edge = goRight ? Math.min(cur.x1 - 0.45, nx.x0 - 0.45) : Math.max(cur.x0 + 0.45, nx.x1 + 0.45);
    if (Math.abs(p.x - edge) > 0.2) { const w = W2.walk(env, edge, 0, 0.15); return w.stop ? {} : w; }
    if (Math.abs(p.vx) > 0.6) return {};
    return W2.jump(env, goRight ? 1 : -1, (nx.x0 + nx.x1) / 2, 40, 0);
  };

  // ---------- le robot complet : zone 1 = robot d'origine ; ensuite les sections ----------
  window.extBot = function (orig) {
    // version 1.5 : robots particuliers des sections ajoutées par les modules
    for (const k in XB().sections) if (!SB[k]) SB[k] = (env, sec, m) => XB().sections[k](env, sec, m, { planner, imagine, walkTo, W2, stateOf });
    for (const k of XB().oneByOne) ONE_BY_ONE.add(k);
    return (env, i) => {
      const R = env.R, p = env.p, B = R.def.build;
      // version 1.5 : pendant un combat de boss, le robot évite d'abord les attaques annoncées (secbots_boss.js)
      if (R.boss && !R.escape && !R.bossWait && XB().bossDodge) { const d = XB().bossDodge(env, i); if (d) return d; }
      if (!B.secs || !B.zonesX || p.x < B.zonesX[0] - 0.5) {
        if (!orig) return planner(env, B.zonesX ? B.zonesX[0] : R.W);
        if (!B.zonesX) return orig(env, i);
        // le robot d'origine ne voit que la zone 1 (ses repères : plateformes, lasers… de son niveau)
        const W0 = B.zonesX[0];
        if (!env.R1 || env.R1.base !== R) {
          const R1 = Object.create(R); R1.base = R; R1.ents = {};
          const ex = (e) => (e.x0 !== undefined ? e.x0 : e.x !== undefined ? e.x : e.zone ? e.zone.x0 : e.px !== undefined ? e.px : 0);
          for (const k in R.ents) R1.ents[k] = R.ents[k].filter((e) => ex(e) < W0);
          env.R1 = R1;
        }
        return orig(Object.assign({}, env, { R: env.R1 }), i);
      }
      const m = env.mem;
      const air = W2.pilot(env); if (air) return air;     // saut lancé par un robot particulier : on le guide
      const sec = B.secs.find((s) => p.x >= s.x0 - 0.01 && p.x < s.x1) || B.secs.find((s) => s.x0 > p.x);
      if (!sec) return planner(env, R.W);
      if (m.secK !== sec.x0) { m.secK = sec.x0; m.plan = null; }
      // coop : pendant que le 1er joueur traverse une section « un par un », le 2e attend sans sauter
      // …et le 1er attend (sans sauter) que le 2e ait fini de traverser
      if (env.i === 0 && p.onGround) {
        const p2 = env.players[1];
        if (p2 && p2 !== p && p2.alive && !p2.finished) {
          // (la section du 2e joueur, ou celle qu'il va aborder dans moins de 4 cases)
          let s2 = B.secs.find((q) => p2.x >= q.x0 - 0.01 && p2.x < q.x1);
          if (!(s2 && ONE_BY_ONE.has(s2.k))) s2 = B.secs.find((q) => q.x0 > p2.x && q.x0 - p2.x < 4);
          if (s2 && ONE_BY_ONE.has(s2.k) && p.x >= s2.x1 - 0.5 && p.x < s2.x1 + 60) return {};
        }
      }
      if (env.i === 1) {
        const p1 = env.players[0];
        if (p1 && p1 !== p && p1.alive && !p1.finished) {
          const s1 = B.secs.find((q) => p1.x >= q.x0 - 0.01 && p1.x < q.x1);
          if (s1 && ONE_BY_ONE.has(s1.k) && p.x < s1.x0 + 0.5 && p.onGround) {
            if (p.x < s1.x0 - 3) { const r = planner(env, s1.x0 - 0.6, { noJumpIfOk: true }); if (!r.jumpP) return r; return {}; }
            return {};
          }
        }
      }
      // en coop, certaines sections se passent l'un après l'autre (les sauts de l'un font disparaître le pont de l'autre)
      if (ONE_BY_ONE.has(sec.k)) {
        const p1 = env.players[0];
        // (…et tant que le 1er est en l'air : un saut, même loin, fait tout basculer)
        if (env.i === 1 && p1 && p1 !== p && p1.alive && !p1.finished && (p1.x < sec.x1 || !p1.onGround) && p.onGround) { const w = W2.walk(env, sec.x0 - 0.6, 0, 0.3); return w.stop ? {} : w; }
      }
      // juste avant un pont « événement saut » : on n'y saute pas dessus
      const nxt = B.secs[B.secs.indexOf(sec) + 1];
      if (nxt && nxt.k === 'jumpEvents' && p.onGround && p.x > nxt.x0 - 3 && Math.abs(p.y - 1) < 0.05) return SB.jumpEvents(env, nxt, m) || {};
      if (SB[sec.k]) return SB[sec.k](env, sec, m) || {};
      if (sec.k === 'gate' || sec.k === 'exit') return W2.walk(env, sec.dx + 0.5, 0, 0.1).stop ? {} : W2.walk(env, sec.dx + 0.5, 0, 0.1);
      const next = B.secs[B.secs.indexOf(sec) + 1];
      return planner(env, next && (next.k === 'gate' || next.k === 'exit') ? next.dx + 0.5 : sec.x1 + 3);
    };
  };
})();
