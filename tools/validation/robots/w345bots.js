// Bots des Mondes 3, 4, 5 : uniquement des appuis de touches.
(function () {
  const { pilot, jump, walk } = window.W2;
  const T = () => OT.Game._dbg.time;
  // ---------- outils ----------
  const laserPh = (L) => (T() + L.phase) % L.period;
  const laserOffLeft = (L) => { const ph = laserPh(L), on = L.period * L.on; return ph < on ? 0 : L.period - ph; };
  const lasers = (R) => R.ents.laser || [];
  const laserAtX = (R, x) => lasers(R).find((L) => Math.abs((L.zone.x0 + L.zone.x1) / 2 - x) < 0.6);
  const pistonT = (ps) => (T() + ps.phase) % 1.9;
  // attendre en w puis traverser un laser vertical situé en lx quand il reste au moins `need` secondes éteint
  function passLaser(env, lx, w, need) {
    const L = laserAtX(env.R, lx + 0.5);
    const p = env.p;
    if (!L || p.x > lx + 1.05) return walk(env, lx + 2.2, 1);
    // temps nécessaire pour passer complètement le rayon depuis ici (en courant)
    const t = Math.max(0, lx + 1.05 - p.x) / 8 + 0.18;
    if (laserOffLeft(L) >= Math.max(need || 0, t) && !(laserPh(L) > L.period - 0.05)) return walk(env, lx + 2.2, 1);
    return walk(env, w, 0, 0.06);
  }
  // pistons : attendre juste avant, passer quand il vient de remonter
  function passPiston(env, px, w) {
    const ps = (env.R.ents.piston || []).find((q) => q.x === px);
    const p = env.p;
    if (!ps || p.x > px + 1.4) return walk(env, px + 2.4, 1);
    const t = pistonT(ps);
    const need = Math.max(0, px + 1.4 - p.x) / 8 + 0.12;
    // le piston est en haut entre t = 0 et 0,85 ; il retombe ensuite
    if (t < 0.85 - need && t > 0.02) return walk(env, px + 2.4, 1);
    if (p.x > px - 0.45 && p.x < px + 1.4) return walk(env, px + 2.4, 1);   // déjà dessous : on fonce
    return walk(env, w, 0, 0.06);
  }
  // blocs rose/bleu : faut-il un petit saut sur place avant de sauter vers `ch` ?
  // 'K' est solide quand ab = 0 ; un saut fait basculer : pour atterrir sur K il faut ab = 1 avant le saut.
  const needHop = (R, ch) => (ch === 'K' ? R.ab !== 1 : R.ab !== 0);
  function jumpToBlock(env, ch, tx, hold) {
    if (needHop(env.R, ch)) return jump(env, 0, env.p.x, 3, 0, true);
    return jump(env, Math.sign(tx - env.p.x) || 1, tx, hold || 40, 0);
  }
  const onCh = (env) => (env.p.standOn && env.p.standOn.ref && env.p.standOn.ref.ch) || '#';
  // ventilateur : rester dans la colonne jusqu'à la hauteur voulue, puis partir à droite
  function fanRide(env, cx, clearY, outX) {
    const p = env.p;
    if (p.y < clearY) return walk(env, cx, 0, 0.05);
    return walk(env, outX, 0);
  }
  // circulation : les voitures arrivent en face (de la droite) ; distance entre l'avant de la plus proche et nous
  function laneOf(env) { const p = env.p; return (env.R.ents.traffic || []).find((tr) => p.x > tr.x0 - 3 && p.x < tr.x1 + 0.6); }
  function carAhead(env, maxD) {
    const p = env.p, tr = laneOf(env); if (!tr || p.y > tr.y + 1.5) return null;
    let best = null;
    for (const c of tr.cars) {
      if (c.x + c.len < tr.x0 + 0.1 || c.x > tr.x1 + 6) continue;
      const d = c.x - (p.x + 0.33);
      if (d > -c.len - 0.66 && d < maxD && (best === null || d < best)) best = d;
    }
    return best;
  }
  function roadClear(env, from, to) {
    const tr = laneOf(env); if (!tr) return true;
    return !tr.cars.some((c) => c.x < to && c.x + c.len > from && c.x < tr.x1 + 6 && c.x + c.len > tr.x0);
  }
  // traverser une route : sauter les voitures, ou s'abriter sous un abribus (les voitures passent devant)
  function crossRoad(env, endX, shelters) {
    const p = env.p;
    if (!p.onGround) return {};
    const top = Math.round(p.y);
    if (top === 3) {   // sur le toit d'un abribus
      const sh = shelters.find((s) => p.x > s - 0.6 && p.x < s + 2.6);
      // repartir juste après le passage d'une voiture sous nous, quand la suivante est encore loin
      const tr = laneOf(env);
      const nearest = tr ? Math.min(99, ...tr.cars.filter((c) => c.x + c.len > p.x - 0.4 && c.x + c.len > tr.x0 && c.x < tr.x1 + 6).map((c) => c.x - (p.x + 0.33))) : 99;
      const edge = (sh !== undefined ? sh + 2.35 : p.x) - p.x;
      if (env.mem.leave === sh || nearest - edge > 4.0 + edge * 0.65) { env.mem.leave = sh; return walk(env, endX, 1); }
      return walk(env, sh !== undefined ? sh + 1.2 : p.x, 0, 0.15);
    }
    env.mem.leave = undefined;
    const under = shelters.find((s) => p.x - 0.3 >= s - 0.02 && p.x + 0.3 <= s + 2.02);
    if (under === undefined) env.mem.go = undefined;
    const d = carAhead(env, 30);
    if (under !== undefined) {
      // on repart juste après le passage d'une voiture, quand la suivante est encore loin
      if (d === null || d > 4.5 || env.mem.go === under) { env.mem.go = under; return walk(env, endX, 1); }
      return walk(env, under + 1, 0, 0.12);
    }
    const next = shelters.find((s) => s + 0.35 - p.x > 0 && s - p.x < 6);
    if (d !== null && d < 3.6) {
      // l'abribus est-il atteignable avant la voiture ?
      if (next !== undefined) {
        const tMe = Math.max(0, next + 0.36 - p.x) / 8.5, tCar = d / (5.5 + Math.max(0, p.vx));
        if (tMe < tCar - 0.08) return walk(env, next + 1, 1, 0.12);
        if (next - p.x < 4.2) return jump(env, 1, next + 1, 40, 0);   // sinon, on saute sur son toit
      }
      return jump(env, 1, undefined, 40, 1);
    }
    return walk(env, endX, 1);
  }
  // plateformes mobiles horizontales : de l'une à l'autre quand l'écart est petit
  function platHop(env, plats, edgeX, exitX, maxGap) {
    const p = env.p;
    const k = plats.findIndex((pl) => p.standOn && p.standOn.ref === pl);
    if (k < 0) {
      const first = plats[0];
      const w = walk(env, edgeX - 0.7, 0, 0.12);
      if (!w.stop && p.x < edgeX - 0.82) return w;
      return first.x - edgeX < 0.5 ? jump(env, 1, () => first.x + 1, 12, 0) : walk(env, edgeX - 0.7, 0, 0.12);
    }
    const cur = plats[k], nx = plats[k + 1];
    if (Math.abs(p.x - (cur.x + 1)) > 0.4) return walk(env, cur.x + 1, 0, 0.1);
    if (nx) return nx.x - (cur.x + 2) < (maxGap || 1.4) ? jump(env, 1, () => nx.x + 1, nx.y < cur.y ? 30 : 14, 0) : {};
    return exitX - (cur.x + 2) < 1.6 ? jump(env, 1, exitX + 1.2, 14, 0) : {};
  }
  const built = (R, g) => R.comp[g] && R.comp[g].built >= R.comp[g].n;
  // coop dans les niveaux rose/bleu : chacun son tour (les sauts de l'un font basculer les blocs de l'autre)
  window.seq = (pol) => (env, i) => {
    const ps = env.players;
    if (i === 1 && ps[0] && !ps[0].finished) return {};
    return pol(env, i);
  };
  window.W345 = { passLaser, passPiston, jumpToBlock, crossRoad, platHop, fanRide, built, carAhead };

  /* ========================= MONDE 3 ========================= */
  window.w31 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x;
    if (x < 16.6) return walk(env, 30);
    if (x < 18) return jump(env, 1, 23, 40, 0);
    if (x < 35.5) return walk(env, 36);
    if (x < 38) return passLaser(env, 37, 35.8, 0.4);
    if (x < 42) return passLaser(env, 41, 39.3, 0.4);
    if (x < 54.4) return walk(env, 60);
    if (x < 56 && p.y < 1.5) return jump(env, 1, 61, 40, 0);
    return walk(env, 66.5);
  };
  window.w32 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    const steps = [[9.7, 1, 12.8, 20], [13.6, 2, 16.6, 30], [17.6, 3, 20.6, 40], [21.6, 5, 24.9, 40], [24.3, 7, 28.6, 30], [29.6, 5, 32.6, 20], [33.6, 3, 36.6, 14], [37.6, 2, 41, 30]];
    if (x < 40) {
      for (const [tx0, top, tx, hold] of steps) {
        if (y === top && x <= tx0 + 1.5 && x >= tx0 - 2.5) { if (x < tx0 && top !== 7) return walk(env, tx0 + 0.15, 0, 0.08); return jump(env, 1, tx, hold, 0); }
      }
      return walk(env, x + 1);
    }
    // les lasers horizontaux
    if (x < 45.4) {
      const L = lasers(env.R).find((q) => q.zone.x0 === 46);
      if (x > 44.6 && laserOffLeft(L) > 0.9 && laserPh(L) > L.period * L.on + 0.02) return walk(env, 53, 1);
      return walk(env, 45.0, 0, 0.06);
    }
    if (x < 52.6) return walk(env, 53, 1);
    if (x < 53.4) {
      const L = lasers(env.R).find((q) => q.zone.x0 === 54 && q.on < 1);
      if (x > 52.6 && laserOffLeft(L) > 0.9 && laserPh(L) > L.period * L.on + 0.02) return walk(env, 61, 1);
      return walk(env, 53.0, 0, 0.06);
    }
    return walk(env, 70.5, 1);
  };
  window.w33 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    if (x < 33.6 && y === 1) return walk(env, 34, 1);
    if (x < 35 && y === 1) return jump(env, 1, 38.3, 40, 0);
    if (y === 3 && x < 38.4) return walk(env, 38.6, 0, 0.1);
    if (y === 3) return walk(env, 45, 1);
    if (x < 55.5) return walk(env, 56, 1);
    if (x < 58) return passLaser(env, 57, 55.8, 0.45);
    if (x < 62) return passLaser(env, 61, 59.3, 0.45);
    return walk(env, 67.5);
  };
  window.w34 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    if (x < 40 && y === 1 && x < 9) return x < 8.4 ? walk(env, 8.6, 0, 0.1) : jump(env, 1, 12, 12, 0, true);
    if (y === 4 && x < 15) return x < 13.3 ? walk(env, 13.5, 0, 0.1) : jump(env, 1, 18, 12, 0, true);
    if (y === 7 && x < 21) return x < 19.3 ? walk(env, 19.5, 0, 0.1) : jump(env, 1, 25, 8, 0, true);
    if (y === 9) return walk(env, 30);
    if (y === 7 && x > 28) return walk(env, 38);
    if (y === 4 && x > 34) return walk(env, 46);
    if (x < 45.6) return walk(env, 46);
    if (x < 48) return passPiston(env, 47, 45.8);
    if (x < 52) return passPiston(env, 51, 49.6);
    if (x < 56) return passPiston(env, 55, 53.6);
    return walk(env, 70.5);
  };
  window.w35 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    if (y === 1 && x < 8.9) return walk(env, 10);
    if (y === 1 && x < 9.6) return jump(env, 1, 13.8, 20, 0);
    if (y === 1 && x < 14.6 && x > 12.5) return x < 14.0 ? walk(env, 14.1, 0, 0.06) : jump(env, 1, 18.8, 30, 0);
    if (y === 1 && x < 19.6 && x > 17.5) return x < 19.0 ? walk(env, 19.1, 0, 0.06) : jump(env, 1, 23.8, 30, 0);
    if (y === 1 && x < 25 && x > 22.5) return x < 24.4 ? walk(env, 24.5, 0, 0.08) : jump(env, 1, 27.2, 40, 0);
    if (y === 3 && x < 31.3) return walk(env, 31.6, 0, 0.08);
    if (y === 3) return jump(env, 1, 35.2, 30, 0);
    if (x < 49.4) return walk(env, 50, 1);
    if (x < 50.5 && y === 1) return jump(env, 1, 53.2, 30, 0);
    if (x < 55) return passLaser(env, 54, 53.5, 0.5);
    if (x < 55.25) return walk(env, 55.35);
    if (x < 57 && y === 1) return jump(env, 1, 60, 40, 0);
    return walk(env, 66.5);
  };
  window.w36 = () => (env) => {
    const p = env.p, R = env.R; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    if (y === 1 && x < 4.6 && !(R.comp[0] && R.comp[0].t >= 0)) return x < 4.0 ? walk(env, 4.2, 0, 0.1) : jump(env, 1, 5.5, 8, 0);
    if (y === 2 && x < 6) return jump(env, 1, 7.4, 30, 0);
    if (y === 4) return walk(env, 10, 0);
    if (x < 10.4 && !built(R, 0)) return walk(env, 10.2, 0, 0.06);
    if (x < 28) return walk(env, 30.5);
    if (x < 30) return passLaser(env, 29, 28, 0.4);
    if (x < 33) return passLaser(env, 32, 30.5, 0.4);
    if (x < 36) return passLaser(env, 35, 33.5, 0.4);
    if (x < 43.5) return walk(env, 45);
    if (x < 46 && y === 1) return jump(env, 1, 49.2, 40, 0);
    if (y === 1 && x < 50.5) return built(R, 1) ? (x < 50.3 ? walk(env, 50.4, 0, 0.08) : jump(env, 1, 52.8, 40, 0)) : walk(env, 49.5, 0, 0.1);
    if (y === 3) return jump(env, 1, 55.8, 40, 0);
    if (y === 5) return jump(env, 1, 58.8, 40, 0);
    if (y === 7 && x < 60) return jump(env, 1, 62, 30, 0);
    return walk(env, 65.5);
  };
  window.w37 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    if (x < 28) {
      if (x < 9.5) return walk(env, 10);
      if (x < 10.4 && y === 1) return jump(env, 1, 12.8, 40, 0);
      if (x < 15.2) return passLaser(env, 14, 12.8, 0.45);
      return walk(env, 16.5);
    }
    if (x < 36.4) return walk(env, 40, 1);
    if (x < 38 && y === 1) return jump(env, 1, 41.5, 40, 0);
    if (x < 52.6) return walk(env, 53);
    if (x < 55) return passLaser(env, 54, 52.8, 0.45);
    return walk(env, 58.5);
  };
  window.w38 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    if (x < 16.5) return walk(env, 16.6);
    if (x < 16.9) { const L = laserAtX(env.R, 21.5); return laserOffLeft(L) > 1.0 ? walk(env, 30, 1) : walk(env, 16.6, 0, 0.05); }
    if (x < 31) return walk(env, 31.5, 1);
    if (x < 53.2) return walk(env, 60, 1);
    if (x < 54.5 && y === 1) return jump(env, 1, 57, 40, 0);
    if (x < 59) return passLaser(env, 58, 56.8, 0.45);
    return walk(env, 66.5);
  };
  window.w39 = () => (env) => {
    const p = env.p, R = env.R; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    if (x < 9.8 && !built(R, 0)) return walk(env, 9.3, 0, 0.06);
    if (x < 24.2 && y === 1) return walk(env, 24.5, 0, 0.1);
    if (x < 25 && y === 1) return jump(env, 1, 28, 18, 0, true);
    const L31 = laserAtX(R, 31.5), L41 = laserAtX(R, 41.5);
    if (y === 5 && x < 31) { if (x < 29.3) return walk(env, 29.5, 0, 0.08); return laserOffLeft(L31) > 1.1 ? jump(env, 1, 33.6, 16, 0, true) : {}; }
    if (y === 8) return walk(env, 37);
    if (y === 6 && x < 41) { if (x < 39.4) return walk(env, 39.6, 0, 0.08); return laserOffLeft(L41) > 0.9 ? walk(env, 47) : {}; }
    if (y === 4 && x > 42) return walk(env, 50);
    if (x < 60.8) return walk(env, 63);
    if (x < 62 && y === 1) return jump(env, 1, 64.5, 40, 0);
    if (x < 67) return passPiston(env, 66, 64.8);
    if (x < 70) return passPiston(env, 69, 67.6);
    return walk(env, 77.5);
  };
  // la Machine de l'Examen
  window.wExam = () => (env) => {
    const p = env.p, R = env.R, B = R.boss; const a = pilot(env); if (a) return a;
    if (!B || B.outro > 0) return {};
    for (const h of R.hazards) {
      if (h.type === 'sweep' && h.x > p.x && h.x - p.x < 1.9 && h.x - p.x > 0.5) return jump(env, 0, p.x, 40, 0, true);
      if (h.type === 'drop' && h.y > p.y + 1 && Math.abs(h.x - p.x) < 0.95) return { right: h.x < p.x, left: h.x >= p.x };
    }
    const pd = B.pads.find((q) => q.ok);
    if (!pd || B.wait > 0) return walk(env, p.x);
    return walk(env, pd.x + 1, 0, 0.3);
  };

  /* ========================= MONDE 4 ========================= */
  window.w41 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y), ch = onCh(env);
    if (x < 9.3 && y === 1) return walk(env, 9.4, 0, 0.1);
    if (x < 10 && y === 1) return jumpToBlock(env, 'Q', 13.0, 30);
    if (ch === 'Q' && x < 16) return jumpToBlock(env, 'K', 18, 30);
    if (ch === 'K' && x < 20) return jump(env, 1, 22.5, 30, 0);
    if (x < 25.6 && y === 1) return walk(env, 27);
    if (x < 26.3 && y === 1) return walk(env, 26.4, 0, 0.1);
    if (x < 27.5 && y === 1) return jumpToBlock(env, 'K', 28.8);
    if (ch === 'K' && y === 3) return jumpToBlock(env, 'Q', 31.8);
    if (ch === 'Q' && y === 5) return jumpToBlock(env, 'K', 34.8);
    if (ch === 'K' && y === 7) return jump(env, 1, 38, 30, 0);
    if (x < 46.9 && y === 1) return walk(env, 46.6);
    if (x < 52) return walk(env, 60);
    if (x < 57.5 && !p.onGround) return fanRide(env, 54.5, 8.0, 60);
    return walk(env, 66.5);
  };
  window.w42 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y), ch = onCh(env);
    if (x < 21) { if (x < 8.8) return walk(env, 9); if (x < 9.8 && y === 1) return jump(env, 1, 12.6, 30, 0); return walk(env, 14.5); }
    if (x < 45) {
      if (x < 25.6) return walk(env, 25.7, 0, 0.1);
      if (x < 26.5 && y === 1) return jump(env, 1, 29.4, 40, 0);
      if (y === 1 && x < 29.6) return x < 29.2 ? walk(env, 29.3, 0, 0.1) : jumpToBlock(env, 'Q', 30.8, 40);
      if (ch === 'Q') return jumpToBlock(env, 'K', 33.6, 40);
      if (ch === 'K') return walk(env, 34.6);
      return walk(env, 29.3);
    }
    if (x < 53) return walk(env, 60);
    if (x < 57.5 && !p.onGround) return fanRide(env, 54.5, 7.2, 60);
    return walk(env, 66.5);
  };
  window.w43 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    if (x < 10.6) {
      if (p.onGround && p.y < 1.2) return x < 7.4 ? walk(env, 20) : walk(env, 8.5, 0, 0.1);
      return fanRide(env, 8.5, 9.4, 14);
    }
    // nuages : on ne s'arrête jamais, on saute au bord
    const clouds = [[8, 15.4, 19.4], [9, 21.4, 25.2], [8, 27.4, 31.2], [7, 33.4, 37.6], [9, 51.4, 55.2], [7, 56.4, 60.2], [5, 61.4, 65.6]];
    for (const [top, edge, tx] of clouds) if (y === top && x > edge - 5 && x < edge + 0.7) return x < edge ? walk(env, edge + 3) : jump(env, 1, tx, 30, 0);
    if (x < 44) return walk(env, 44);
    return walk(env, 71.5);
  };
  window.w44 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y), ch = onCh(env);
    if (x < 9.3 && y === 1) return walk(env, 9.4, 0, 0.1);
    if (x < 10 && y === 1) return jumpToBlock(env, 'K', 11.8);
    const chain = [['K', 3, 'Q', 15.6], ['Q', 4, 'K', 19.6], ['K', 5, 'Q', 23.6], ['Q', 4, 'K', 27.6]];
    for (const [c, top, nc, tx] of chain) if (ch === c && y === top && x < tx - 1) return jumpToBlock(env, nc, tx);
    if (ch === 'K' && y === 3 && x > 26) return jump(env, 1, 32.2, 30, 0);
    if (x < 37.3 && y === 1) return walk(env, 37.4, 0, 0.1);
    if (x < 38 && y === 1) return jump(env, 1, 38.5, 12, 0);
    if (y === 2) return jump(env, 1, 41.4, 40, 0);
    if (y === 4 && x < 41.4) return walk(env, 41.5, 0, 0.1);
    if (y === 4) return walk(env, 50);
    if (x < 50.3) return walk(env, 50.4, 0, 0.1);
    if (x < 51.5 && y === 1) return jump(env, 1, 54.5, 40, 0);
    if (x < 62) return passLaser(env, 61, 59.8, 0.45);
    return walk(env, 66.5);
  };
  window.w45 = () => (env) => {
    const p = env.p, R = env.R; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    const plats = R.ents.plat || [];
    if (y <= 1 && x < 24) return platHop(env, plats, 10, 23);
    if (y === 1 && x < 27) return walk(env, 27);
    if (y === 8) {
      if (x < 34.3) return walk(env, 34.4, 0, 0.1);
      if (x < 35) return jump(env, 1, 37.6, 40, 0);
      if (x < 40.1) return walk(env, 46);
      if (x < 41) return jump(env, 1, 45.4, 40, 0);
      if (x < 45.9) return walk(env, 46.0, 0, 0.1);
      if (x < 46.5) return jump(env, 1, 49.6, 40, 0);
      if (x < 44.8) return walk(env, 44.9, 0, 0.1);
      if (x < 45.5) return jump(env, 1, 48.6, 30, 0);
      return walk(env, 53);
    }
    if (y === 10) return walk(env, 44.6);
    return walk(env, 66.5);
  };
  window.w46 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y), ch = onCh(env);
    if (x < 8.3 && y === 1) return walk(env, 8.4, 0, 0.1);
    if (x < 9 && y === 1) return jumpToBlock(env, 'Q', 11, 30);
    if (ch === 'Q' && x < 13) return jumpToBlock(env, 'K', 15, 30);
    if (ch === 'K' && x < 17) return jumpToBlock(env, 'Q', 19, 30);
    if (ch === 'Q' && x > 17) return jump(env, 1, 23.5, 30, 0);
    if (x < 24.5) return walk(env, 30);
    if (x < 28.6 && !p.onGround) return fanRide(env, 26.5, 7.0, 32);
    if (x < 37) return passLaser(env, 36, 34.8, 0.45);
    if (x < 40) return passLaser(env, 39, 37.5, 0.45);
    if (x < 43) return passLaser(env, 42, 40.5, 0.45);
    return walk(env, 69.5, 1);
  };
  window.w47 = () => (env) => {
    const p = env.p, R = env.R; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y), ch = onCh(env);
    if (x < 10.2 && !built(R, 0)) return walk(env, 9.3, 0, 0.06);
    if (x < 19.6) return walk(env, 20.5);
    if (x < 21.2 && !built(R, 1)) return walk(env, 20.5, 0, 0.06);
    if (x < 29.6) return walk(env, 30.5);
    if (x < 31.2 && !built(R, 2)) return walk(env, 30.5, 0, 0.06);
    if (x < 39.6) return walk(env, 40.5);
    if (x < 41.2 && !built(R, 3)) return walk(env, 40.5, 0, 0.06);
    if (x < 53.3 && y === 1) return walk(env, 53.4, 0, 0.1);
    if (x < 54 && y === 1) return jumpToBlock(env, 'K', 55.8);
    if (ch === 'K' && y === 3 && x < 58) return jumpToBlock(env, 'Q', 59.6);
    if (ch === 'Q' && y === 4) return jumpToBlock(env, 'K', 63.6);
    if (ch === 'K' && y === 3 && x > 62) return jump(env, 1, 66.5, 30, 0);
    return walk(env, 71.5);
  };
  window.w48 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y), ch = onCh(env);
    if (x < 14.8) return walk(env, 25);
    if (x < 15.5 && y === 1) return jump(env, 1, 20.5, 40, 0);
    if (x < 25.5) return walk(env, 35);
    if (x < 26.6 && y === 1) return jump(env, 1, 30.6, 40, 0);
    if (x < 32.8) return walk(env, 40);
    if (x < 33.6 && y === 1) return jump(env, 1, 36.2, 30, 0);
    if (x < 40.3 && y === 1) return walk(env, 40.4, 0, 0.1);
    if (x < 41 && y === 1) return jumpToBlock(env, 'Q', 44, 30);
    if (ch === 'Q' && x < 46.5) return jumpToBlock(env, 'K', 49, 30);
    if (ch === 'K' && x < 51.5) return jump(env, 1, 52.7, 14, 0);
    if (x < 53) return walk(env, 60);
    if (x < 58.6 && !p.onGround) return fanRide(env, 55.5, 8.0, 62);
    return walk(env, 68.5);
  };
  window.w49 = () => (env) => {
    const p = env.p, R = env.R; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y), ch = onCh(env);
    if (x < 10.3 && y === 1) return walk(env, 10.4, 0, 0.1);
    if (x < 11 && y === 1) return jumpToBlock(env, 'K', 12.8);
    if (ch === 'K' && y === 3) return jumpToBlock(env, 'Q', 16.8);
    if (ch === 'Q' && y === 5) return jumpToBlock(env, 'K', 20.8);
    if (ch === 'K' && y === 7) return jump(env, 1, 24, 30, 0);
    if (y === 7 && x < 28.4) return walk(env, 28.5, 0, 0.1);
    if (y === 7 && x < 29) return jump(env, 1, 31, 30, 0);
    if (y === 6 && x < 33) return x < 32.3 ? walk(env, 36) : jump(env, 1, 36, 30, 0);
    if (y === 7 && x > 34 && x < 38) return x < 37.3 ? walk(env, 41) : jump(env, 1, 41, 30, 0);
    if (y === 6 && x > 39 && x < 43) return x < 42.3 ? walk(env, 46) : jump(env, 1, 46.2, 30, 0);
    if (x < 49.6 && !built(R, 0)) return walk(env, 49.3, 0, 0.06);
    if (x < 59.6) return walk(env, 60);
    if (x < 62) return passLaser(env, 61, 59.8, 0.45);
    if (x < 65) return passLaser(env, 64, 62.5, 0.45);
    return walk(env, 79.5);
  };
  // Zeus
  window.wZeus = () => (env) => {
    const p = env.p, R = env.R, B = R.boss; const a = pilot(env); if (a) return a;
    if (!B || B.outro > 0) return {};
    const y = Math.round(p.y), ch = onCh(env), x = p.x;
    // les balles : sauter par-dessus si elles arrivent en roulant, sinon s'écarter
    for (const h of R.hazards) {
      if (h.type !== 'ball' || !p.onGround) continue;
      const dx = h.x - x, rel = h.vx - p.vx, coming = dx * rel < 0;
      if (Math.abs(dx) < 0.75 + Math.abs(rel) * 0.25 && coming && h.y < p.y + 1.3 && h.y > p.y - 0.5) return jump(env, Math.sign(dx), x + Math.sign(dx) * 1.6, 40, 0, true);
      if (Math.abs(dx) < 2.6 && Math.sign(-h.vx) === Math.sign(dx) && h.y < p.y + 1.3 && h.y > p.y - 0.5) return {};
      if (Math.abs(dx) < 1.2 && h.y > p.y + 1.3 && h.y < p.y + 4) return { right: dx < 0, left: dx >= 0, run: 1 };
    }
    // une balle qui va tomber sur nous pendant qu'on prépare un saut : attendre qu'elle passe
    if (B.phase === 1 && p.onGround) for (const h of R.hazards) if (h.type === 'ball' && Math.abs(h.x + h.vx * 0.4 - x) < 1.3 && h.y > p.y && h.y < p.y + 5) return {};
    if (B.phase === 1) {
      const left = B.bulbs.filter((b) => !b.taken);
      const b = left.find((q) => q.x < 17) || left[0];
      if (!b) return {};
      if (b.x < 17) {
        // gauche : sol → corniche A → bloc bleu → (bloc rose)
        if (y === 1) { const w = walk(env, 7.6, 0, 0.12); if (!w.stop) return w; return jump(env, -1, 6, 40, 0); }
        if (y === 3 && ch === '#') { if (x < 6.4) return walk(env, 6.5, 0, 0.1); return jumpToBlock(env, 'Q', 9, 40); }
        if (ch === 'Q' && y === 5) { if (b.x < 10) return jump(env, 0, 9, 40, 0, true); return jumpToBlock(env, 'K', 11.5, 40); }
        if (ch === 'K' && y === 7) return jump(env, 0, 11.5, 40, 0, true);
        return walk(env, 7.7);
      }
      if (y === 1) { const w = walk(env, 27.5, 0, 0.12); if (!w.stop) return w; return jump(env, 1, 29.5, 40, 0); }
      if (y === 3 && ch === '#') { if (x > 29.2) return walk(env, 29.0, 0, 0.1); return jumpToBlock(env, 'Q', 26, 40); }
      if (ch === 'Q' && y === 5) return jumpToBlock(env, 'K', 23.5, 40);
      if (ch === 'K' && y === 7) return jump(env, 0, 23.5, 40, 0, true);
      return walk(env, 27.5);
    }
    // phases 1 et 3 : lui sauter sur la tête
    if (y !== 1) return walk(env, x < 17 ? 7.8 : 27.2);
    if (B.phase === 2 && (B.state === 'aim' || B.state === 'dash')) return walk(env, x < B.x ? 7.8 : 27.2);
    const dx = B.x - x;
    if (B.stun > 0) return walk(env, B.x + (dx > 0 ? -3 : 3));
    if (Math.abs(dx) < 2.6 && Math.abs(dx) > 1.5 && B.y < 1.05) return jump(env, Math.sign(dx), () => B.x, 40, 0);
    if (Math.abs(dx) <= 1.5) return walk(env, x - Math.sign(dx) * 3);
    return walk(env, B.x - Math.sign(dx) * 2.2);
  };

  /* ========================= MONDE 5 ========================= */
  window.w51 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    if (x < 9) return walk(env, 9.5);
    if (x < 40) {
      // sur le toit d'un abribus : la pièce, puis on repart
      if (y === 3) { const sh = [18, 29].find((s0) => x > s0 - 0.6 && x < s0 + 2.6); const g = grabCoins(env, sh - 0.2, sh + 2.2); if (g) return g; return crossRoad(env, 41, [18, 29]); }
      const d = carAhead(env, 30);
      if (x < 17.6 && x > 15.4 && p.onGround) return jump(env, 1, 18.8, 40, 0);
      if (x < 28.4 && x > 26.4 && p.onGround) return jump(env, 1, 29.8, 40, 0);
      return crossRoad(env, 41, x < 18 ? [] : x < 29 ? [] : [29]);
    }
    if (x < 45.4) return walk(env, 45.5, 1);
    if (x < 54 && y === 1) return jump(env, 1, x + 2.5, 14, 1);
    if (x < 55.4) return walk(env, 56);
    if (x < 58) return passPiston(env, 57, 55.8);
    if (x < 61) return passPiston(env, 60, 58.6);
    return walk(env, 68.5);
  };
  window.w52 = () => (env) => {
    const p = env.p, R = env.R; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    const plats = (R.ents.plat || []).filter((pl) => pl.kind === 'M');
    const V = (R.ents.plat || []).find((pl) => pl.kind === 'V');
    if (x < 28 && (y <= 2)) return platHop(env, plats, 10, 28, 2.3);
    if (p.standOn && p.standOn.ref === V) return V.y + 0.5 > 5.1 ? walk(env, 37) : walk(env, 34);
    if (y === 1 && x < 34) { if (x > 32.6) return walk(env, 34); if (Math.abs(V.y + 0.5 - 1) < 0.12 && x > 31.6) return walk(env, 34); return walk(env, 32, 0, 0.06); }
    if (y === 5) return x < 42.4 ? walk(env, 42.5, 0, 0.1) : jump(env, 1, 47, 40, 0);
    if (x < 48.5) return walk(env, 49);
    if (x < 51) return passPiston(env, 50, 48.8);
    if (x < 54) return passPiston(env, 53, 51.6);
    if (x < 57) return passPiston(env, 56, 54.6);
    return walk(env, 70.5);
  };
  // ramasser les pièces juste au-dessus d'une surface : s'arrêter dessous et faire un petit saut
  function grabCoins(env, x0, x1) {
    const p = env.p;
    if (!p.onGround) return null;
    const c = (env.R.ents.coin || []).filter((q) => !q.taken && !q.hidden && q.x >= x0 && q.x <= x1 && q.y > p.y + 0.8 && q.y < p.y + 2.7).sort((a, b) => a.x - b.x)[0];
    if (!c) return null;
    if (Math.abs(p.x - c.x) > 0.22) return walk(env, c.x, 0, 0.12);
    return jump(env, 0, c.x, 12, 0, true);
  }
  window.grabCoins = grabCoins;
  window.w53 = () => (env) => {
    const p = env.p, R = env.R; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    const V = (R.ents.plat || []).find((pl) => pl.kind === 'V');
    if (x < 8) return walk(env, 8.5);
    if ((x < 26.2 && y <= 3) || (y === 3 && x < 28)) {
      // la route : de toit d'abribus en toit d'abribus (une pièce sur chacun)
      if (y === 3) {
        const sh = [14, 22].find((s0) => x > s0 - 0.6 && x < s0 + 2.6);
        const g = grabCoins(env, sh - 0.2, sh + 2.2); if (g) return g;
        if (sh === 14) return x < 15.7 ? walk(env, 15.8, 1, 0.1) : jump(env, 1, 22.9, 40, 1);
        return crossRoad(env, 28.5, [22]);
      }
      const d = carAhead(env, 30);
      if (x < 9) return walk(env, 9.5, 1);
      if (x < 13.4) { if (x > 11.2) return jump(env, 1, 14.8, 40, 0); return d !== null && d < 3.6 ? jump(env, 1, undefined, 40, 1) : walk(env, 11.5, 1, 0.15); }
      if (x < 21) { if (x > 19.6) return jump(env, 1, 22.8, 40, 0); return d !== null && d < 3.3 ? jump(env, 1, 22.8, 40, 1) : walk(env, 20, 1, 0.15); }
      return crossRoad(env, 28.5, [22]);
    }
    // le ressort : rester dessus jusqu'à passer au-dessus du toit, puis aller à droite
    if (x < 30.5 && x > 28.2 && p.y < 5.3 && !(y === 5)) return p.onGround && x < 29.2 ? walk(env, 29.4, 0, 0.08) : walk(env, 29.45, 0, 0.05);
    if (y === 1 && x < 29) { const g = grabCoins(env, 26, 28.2); if (g) return g; return walk(env, 29.4, 0, 0.08); }
    if (p.y > 5.2 && x < 32.2 && !p.onGround) return walk(env, 33);
    if (y === 5 && x < 38) { const g = grabCoins(env, 31, 37.5); if (g) return g; return walk(env, 39); }
    if (p.standOn && p.standOn.ref === V) return V.y + 0.5 > 5.1 ? walk(env, 44) : walk(env, 42);
    if (y === 1 && x < 42) { if (x > 40.6) return walk(env, 42); if (Math.abs(V.y + 0.5 - 1) < 0.12 && x > 39.6) return walk(env, 42); return walk(env, 40, 0, 0.06); }
    if (y === 5) { const g = grabCoins(env, 43, 48.5); if (g) return g; return x < 48.4 ? walk(env, 49) : walk(env, 50); }
    if (x < 52.2 && (x < 51.7 || Math.abs(p.vx) > 1.5)) return walk(env, 51.8, 0, 0.1);
    if (x < 53 && y === 1) return jump(env, 1, 56, 40, 0);
    if (x < 59) return passLaser(env, 58, 56.8, 0.45);
    return walk(env, 68.5);
  };
  window.w54 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    if (x < 12.4) return walk(env, 13);
    if (x < 13.5 && y === 1) return jump(env, 1, 17, 30, 0);
    if (x < 23.4) return walk(env, 24);
    if (x < 24.2 && y === 1) return jump(env, 1, 27, 40, 0);
    if (x < 36) return walk(env, 36.5);
    if (x < 58) return crossRoad(env, 59, [43, 51]);
    if (x < 60.6) return walk(env, 61);
    if (x < 61.5 && y === 1) return jump(env, 1, 64.2, 40, 0);
    return walk(env, 69.5);
  };
  window.w55 = () => (env) => {
    const p = env.p, R = env.R; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    if (x < 10.2 && !built(R, 0)) return walk(env, 9.3, 0, 0.06);
    if (x < 19.5) return walk(env, 20.5);
    if (x < 22.2 && !built(R, 1)) return walk(env, 21.3, 0, 0.06);
    if (x < 33.5) return walk(env, 34.5);
    if (y === 1 && x < 35.6) return built(R, 2) ? (x < 35.3 ? walk(env, 35.4, 0, 0.08) : jump(env, 1, 36.8, 14, 0)) : walk(env, 34.6, 0, 0.1);
    if (y === 2) return jump(env, 1, 39.8, 40, 0);
    if (y === 4) return jump(env, 1, 42.8, 40, 0);
    if (y === 6 && x < 44) return jump(env, 1, 46, 30, 0);
    if (y === 6) return x < 52.3 ? walk(env, 52.4, 0, 0.1) : jump(env, 1, 57.5, 40, 0);
    if (x < 58.5) return walk(env, 58.6);
    if (x < 70) return crossRoad(env, 71.5, []);
    return walk(env, 71.5);
  };
  window.w56 = () => (env) => {
    const p = env.p, R = env.R; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    if (x < 23) return walk(env, 24, x < 17 ? 1 : 0);
    if (x < 45) return crossRoad(env, 46, [31, 38]);
    const plats = R.ents.plat || [];
    if (x < 63) return platHop(env, plats, 50, 63);
    return walk(env, 71.5);
  };
  window.w57 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    if (x < 10) return walk(env, 9);
    if (x < 16) return passLaser(env, 15, 13.6, 0.45);
    if (x < 19) return passLaser(env, 18, 16.5, 0.45);
    if (x < 22) return passLaser(env, 21, 19.5, 0.45);
    if (x < 25) return walk(env, 24);
    if (x < 39.3 && y === 1) return walk(env, 39.4, 0, 0.1);
    if (x < 40 && y === 1) return jump(env, 1, 40.6, 40, 0);
    if (y === 3) return jump(env, 1, 44, 40, 0);
    if (y === 5) return x < 52.3 ? walk(env, 52.4, 0, 0.1) : jump(env, 1, 58.3, 40, 0);
    if (x < 70) return crossRoad(env, 71.5, []);
    return walk(env, 71.5);
  };
  window.w58 = () => (env) => {
    const p = env.p, R = env.R; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    if (x < 19) return walk(env, 20.3, 1);
    if (x < 21.2 && !built(R, 0)) return walk(env, 20.3, 0, 0.06);
    if (x < 35) return walk(env, 35.5);
    if (x < 38) return passPiston(env, 37, 35.8);
    if (x < 42) return passPiston(env, 41, 39.6);
    if (x < 52.6) return walk(env, 60, x > 47 ? 1 : 0);
    if (x < 54 && y === 1) return jump(env, 1, 61.5, 40, 1);
    if (x < 64) return passLaser(env, 63, 61.8, 0.45);
    return walk(env, 70.5);
  };
  window.w59 = () => (env) => {
    const p = env.p; const a = pilot(env); if (a) return a;
    const x = p.x, y = Math.round(p.y);
    if (x < 18.8) return walk(env, 19);
    if (x < 19.6 && y === 1) return jump(env, 1, 23.5, 30, 0);
    if (x < 24.6) return walk(env, 25.2, 1);
    if (x < 25.8 && y === 1) return jump(env, 1, 30.5, 40, 1);
    if (x < 39) return walk(env, 39.5);
    if (x < 56) return crossRoad(env, 57, [46, 53]);
    if (x < 60.8) return walk(env, 61);
    if (x < 61.6 && y === 1) return jump(env, 1, 65, 40, 0);
    return walk(env, 73.5);
  };
  // The Core : La Rumeur
  const SURF = { F: { top: 1, x0: 1, x1: 35 }, A: { top: 3, x0: 3, x1: 8 }, B: { top: 5, x0: 9, x1: 13 }, C: { top: 3, x0: 15, x1: 21 }, D: { top: 5, x0: 22, x1: 26 }, E: { top: 3, x0: 27, x1: 32 } };
  const LINKS = { F: ['A', 'C', 'E'], A: ['F', 'B'], B: ['A', 'C'], C: ['F', 'B', 'D'], D: ['C', 'E'], E: ['F', 'D'] };
  // points de départ et d'arrivée choisis pour ne jamais toucher une porte piégée
  const MOVES = {
    'F>A': [8.9, 7.3], 'A>F': [8.6, 9.5], 'A>B': [7.6, 9.8], 'B>A': [9.4, 7.3], 'B>C': [12.6, 15.8], 'C>B': [15.4, 12.6],
    'F>C': [14.1, 15.8], 'C>F': [21.6, 22.5], 'C>D': [20.6, 22.6], 'D>C': [22.4, 20.4], 'D>E': [25.6, 29.6], 'E>D': [27.4, 25.4], 'F>E': [26.1, 27.6], 'E>F': [32.6, 33.5],
  };
  function surfOf(p) {
    if (!p.onGround) return null;
    const t = Math.round(p.y);
    for (const k of 'ABCDE') { const s = SURF[k]; if (s.top === t && p.x >= s.x0 - 0.35 && p.x <= s.x1 + 0.35) return k; }
    return t === 1 ? 'F' : null;
  }
  function route(from, to) {
    const prev = { [from]: null }, q = [from];
    while (q.length) { const c = q.shift(); if (c === to) break; for (const n of LINKS[c]) if (!(n in prev)) { prev[n] = c; q.push(n); } }
    let c = to; const path = [];
    while (c && c !== from) { path.unshift(c); c = prev[c]; }
    return path[0];
  }
  function goTo(env, S, T2, x) {
    if (S === T2) return walk(env, x, 0, 0.12);
    const nx = route(S, T2);
    const [from, to] = MOVES[S + '>' + nx];
    if (Math.abs(env.p.x - from) > 0.15) return walk(env, from, 0, 0.1);
    if (nx === 'F') return walk(env, to, 0);
    return jump(env, Math.sign(to - from), to, 40, 0);
  }
  const surfAt = (x, y) => { let best = 'F'; for (const k of 'ABCDE') { const s = SURF[k]; if (x >= s.x0 && x <= s.x1 && s.top <= y && s.top > SURF[best].top) best = k; } return best; };
  window.wCore = () => (env) => {
    const p = env.p, R = env.R, B = R.boss; const a = pilot(env); if (a) return a;
    if (!B || B.outro > 0) return {};
    const S = surfOf(p); if (!S) return {};
    // sol du doute : ne pas rester sur une dalle qui va disparaître
    if (S === 'F') { const t = R.tiles[0][Math.floor(p.x)]; if (t && t.state === 'warn') { const d = (R.tiles[0][Math.floor(p.x) + 2] || {}).state === 'idle' ? 1 : -1; return { right: d > 0, left: d < 0, run: 1 }; } }
    if (B.phase === 0) {
      const d = B.doors.find((q) => q.real && q.mesh.visible); if (!d) return {};
      return goTo(env, S, surfAt(d.x, d.y + 0.1), d.x);
    }
    if (B.phase === 1) {
      const t = B.truths.find((q) => !q.taken); if (!t) return {};
      const T2 = surfAt(t.x, t.y - 0.5);
      if (S !== T2) return goTo(env, S, T2, t.x);
      if (Math.abs(p.x - t.x) > 0.25) return walk(env, t.x, 0, 0.12);
      return jump(env, 0, t.x, 20, 0, true);
    }
    // 1.5 — phase 4 (la confrontation) : attendre sur C ; quand elle est épuisée et descendue, sauter la toucher
    if (B.phase === 3) {
      if (S !== 'C') return goTo(env, S, 'C', 17.5);
      if (B.tired > 0 && B.y < 5.2) {
        if (Math.abs(p.x - B.x) > 0.3) return walk(env, B.x, 0, 0.2);
        return jump(env, 0, B.x, 40, 0, true);
      }
      return walk(env, 17.5, 0, 0.4);
    }
    // 1.5 — phase 4 (la confrontation) : attendre au milieu (plateforme C) ; quand elle est épuisée et descend, sauter la toucher
    if (B.phase === 3) {
      if (S !== 'C') return goTo(env, S, 'C', 17.5);
      if (B.tired > 0 && B.y < 5.4) {
        if (Math.abs(p.x - B.x) > 0.3) return walk(env, B.x, 0, 0.2);
        return jump(env, 0, B.x, 40, 0, true);
      }
      return walk(env, 17.5, 0, 0.4);
    }
    // phase 3 : les interrupteurs, puis la toucher
    if (B.shieldOff > 0 && B.y < 6) {
      if (S !== 'C') return goTo(env, S, 'C', 17.5);
      if (Math.abs(p.x - B.x) > 0.3) return walk(env, B.x, 0, 0.2);
      return jump(env, 0, B.x, 40, 0, true);
    }
    const next = B.switches.find((sw) => sw.onT <= 0.6);
    if (!next) return walk(env, p.x);
    if (S !== 'F') return goTo(env, S, 'F', next.x + 0.5);
    return walk(env, next.x + 0.5, 1, 0.2);
  };
})();
