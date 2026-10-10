// =====================================================================
// Vérificateur « TOUTES LES PIÈCES SONT ACCESSIBLES » (version 1.5)
//
// Pour le niveau en cours, il cherche tous les endroits où l'on peut se tenir
// (en partant du départ, de chaque début de zone et de chaque point de reprise),
// puis, depuis chacun, il essaie des actions de joueur (marcher, courir, sauter
// plus ou moins haut, plus ou moins loin, à gauche, à droite, sur place) avec la
// MÊME physique que le jeu (window.SIM, voir secbots.js) et les mêmes dangers.
// Une pièce compte comme accessible seulement si on la touche pendant une action
// qui se termine debout et en vie (une pièce qu'on n'attrape qu'en mourant est
// perdue : elle n'est pas « accessible »).
// Mode permissif pour les mécanismes : barrières ouvertes, balises fermées
// (blocs présents), ponts compilés construits, leviers dans les deux positions.
// Résultat : { total, ok: [i…], ko: [{ i, x, y }…], nodes }
// =====================================================================
(function () {
  const G = () => OT.Game._dbg;
  const PW = 0.66, PH = 0.9;

  // ab = l'état des blocs roses / bleus du Monde 4 (ils basculent à chaque saut) : il fait partie de « l'endroit »
  function mkState(R, x, y, ab) {
    return { x, y, vx: 0, vy: 0, g: false, coy: 0, cut: false, gs: 1, ab: ab === undefined ? R.ab || 0 : ab, jumping: false, jumpOut: false, jumpLag: 9,
      boostT: 0, standOn: null, fallen: {}, barrelT: new Map(), crushT: new Map(), chaseT: new Map(), standT: {}, dead: null, buf: 0,
      gateOpen: () => true };
  }
  // les actions essayées depuis un endroit (fonction k → commandes, durée max, « marche » = s'arrête au sol après n images)
  const ACTS = [];
  for (const d of [-1, 1]) {
    for (const n of [10, 28]) ACTS.push({ f: () => ({ right: d > 0, left: d < 0 }), walk: n });
    ACTS.push({ f: () => ({ right: d > 0, left: d < 0, run: 1 }), walk: 22 });
    for (const hold of [40, 12]) for (const air of [99, 12, 24, 34]) for (const run of [0, 1])
      ACTS.push({ f: (k) => ({ jumpP: k === 0, jump: k < hold, right: d > 0 && k < air, left: d < 0 && k < air, run }), jump: true });
    // marcher un peu, puis sauter (élan)
    ACTS.push({ f: (k) => ({ jumpP: k === 8, jump: k >= 8 && k < 48, right: d > 0, left: d < 0, run: 1 }), jump: true });
    // sauter, puis revenir en arrière en l'air (attraper une pièce au-dessus d'un bord)
    ACTS.push({ f: (k) => ({ jumpP: k === 0, jump: k < 40, right: (d > 0) === (k < 14), left: (d < 0) === (k < 14) }), jump: true });
  }
  for (const hold of [40, 16]) ACTS.push({ f: (k) => ({ jumpP: k === 0, jump: k < hold }), jump: true });
  // tout petits sauts (sous des pics au plafond) : on relâche SAUT presque tout de suite
  for (const hold of [2, 5]) for (const d of [-1, 0, 1]) ACTS.push({ f: (k) => ({ jumpP: k === 0, jump: k < hold, right: d > 0, left: d < 0 }), jump: true });
  // ventilateur / bulle d'apesanteur (Mondes 3 et 4) : un « pilote » va au milieu du courant d'air (ou de la
  // bulle), s'y laisse MONTER (dans la bulle : il saute), puis part sur le côté au bout de « wait » images.
  // (on ne peut pas « se tenir » dans un ventilateur : sans ce pilote, le vérificateur n'y entrait jamais)
  for (const wait of [20, 40, 60, 85, 115]) for (const d of [-1, 1]) for (const off of [0, 0.6, -0.6]) ACTS.push({ lift: true, jump: true, f: (k, s) => {
    const R = G().R;
    if (s.liftK === undefined) {
      let best = null, bd = 1e9;
      for (const f of R.ents.fan || []) { const cx = f.x + 0.5, dd = Math.abs(s.x - cx); if (dd < bd) { bd = dd; best = { cx, low: false }; } }
      for (const z of R.ents.lowg || []) { const cx = (z.x0 + z.x1) / 2, dd = Math.abs(s.x - cx); if (dd < bd) { bd = dd; best = { cx, low: true }; } }
      if (!best) return {};
      const cx = best.cx + off;
      if (Math.abs(s.x - cx) > 0.2 && k < 80) return { right: s.x < cx, left: s.x > cx };
      s.liftK = k; s.liftLow = best.low;
      return { jumpP: true, jump: true };
    }
    const j = k - s.liftK;
    return { jump: j < 30, right: d > 0 && j >= wait, left: d < 0 && j >= wait };
  } });
  // zone « battement » : des coups d'aile réguliers (appuis répétés sur SAUT en l'air)
  for (const per of [9, 13, 18]) for (const d of [-1, 0, 1]) ACTS.push({ f: (k) => ({ jumpP: k % per === 0, jump: true, right: d > 0, left: d < 0 }), jump: true, flap: true });
  // …et un « pilote » qui vise le milieu de l'ouverture du prochain tuyau (± un décalage pour balayer l'ouverture)
  for (const off of [-0.7, 0, 0.7]) ACTS.push({ flap: true, jump: true, f: (k, s) => {
    const R = G().R, B = R.def.build || {};
    const sec = (B.secs || []).find((q) => q.k === 'flappyPipes' && s.x > q.x0 - 1 && s.x < q.x1 + 1);
    if (!sec) return { right: true, jumpP: k === 0, jump: true };
    const next = sec.pipes.find((q) => q.x + 2 > s.x - 0.45);
    const ty = next ? Math.max(next.g0 + 0.15, Math.min(next.g1 + 1 - PH - 0.15, (next.g0 + next.g1 + 1) / 2 - PH / 2 + off)) : 1.6;
    const far = next && Math.abs(s.y - ty) > 0.9 && next.x - (s.x + PW / 2) < 1.4;
    const flap = !s.g && s.y < ty - 0.1 && s.vy < 1.2;
    return { right: !far, jumpP: k === 0 || flap, jump: true };
  } });

  // un pas de 1/60 s (deux demi-pas du moteur) + les RESSORTS et la clé à molette (game.js : « Ressorts et clé à molette »),
  // que la simulation des robots ne connaît pas : un ressort renvoie vers le haut (19), la clé projette en arrière
  function step(R, s, inp, t) {
    if (s.lock > 0) { s.lock -= 1 / 60; inp = {}; }
    window.SIM.simStep(R, s, inp, t, true); window.SIM.simStep(R, s, inp, t, false);
    for (const sp of R.ents.spring || []) {
      if (s.vy > 0) break;
      if (s.x + PW / 2 > sp.x + 0.12 && s.x - PW / 2 < sp.x + 0.88 && s.y < sp.y + 0.4 && s.y + PH > sp.y) {
        if (sp.wrench) { s.vy = 13; s.vx = -12; s.lock = 0.45; } else s.vy = 19;
        s.g = false; s.cut = true; s.coy = 0;
      }
    }
  }
  function coinReach(opt) {
    opt = opt || {};
    const d = G(), R = d.R, S = window.SIM, B = R.def.build || {};
    const coins = (R.ents.coin || []).map((c) => ({ i: c.i, x: c.x, y: c.inBox ? c.by + 1.0 : (c.by !== undefined ? c.by + 0.5 : c.y) }));
    // les objets de quête (version 1.5) : même règle que les pièces
    for (const q of R.qitems || []) coins.push({ i: 'q' + q.k, x: q.x, y: q.y, quest: true });
    coins.sort((a, b) => a.x - b.x);
    const got = new Set();
    // ---- mode permissif ----
    const restore = [];
    for (const g in R.tags || {}) { const T = R.tags[g]; restore.push(() => { T.closed = T._c; }); T._c = T.closed; T.closed = true; }
    for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) {
      const t = R.tiles[y] && R.tiles[y][x];
      if (t && t.ch === 'C' && t.state !== 'built') { const st = t.state; t.state = 'built'; restore.push(() => { t.state = st; }); }
    }
    const levSets = [Object.assign({}, R.lev || {})];
    if ((R.ents.lever || []).length) { const inv = {}; for (const l of R.ents.lever) inv[l.g] = !(R.lev && R.lev[l.g]); levSets.push(inv); }
    const lev0 = R.lev;
    // les caisses se poussent : on essaie aussi avec chaque caisse poussée contre le mur à sa droite
    const crates = (R.ents.crate || []).filter((c) => c.alive);
    const crateX0 = crates.map((c) => c.x);
    const crateWall = crates.map((c) => {
      let x = c.x + c.w;
      while (x < R.W - 1 && !S.tileSolidAt(R, Math.floor(x), Math.floor(c.y + 0.5), d.time, {})) x += 0.25;
      return Math.max(c.x, x - c.w);
    });
    // une caisse déplacée arrête le rayon des lasers à un autre endroit (même calcul que game.js)
    const lasers = (R.ents.laser || []).filter((L) => L.zone0);
    const zone0 = lasers.map((L) => Object.assign({}, L.zone));
    const cutLasers = () => {
      for (const L of lasers) {
        const z0 = L.zone0; Object.assign(L.zone, z0);
        let cut = null;
        for (const c of crates) if (c.alive && c.x < z0.x1 && c.x + c.w > z0.x0 && c.y < z0.y1 && c.y + c.h > z0.y0) {
          const v = L.horiz ? (L.from < 0 ? c.x : c.x + c.w) : (L.from < 0 ? c.y : c.y + c.h);
          if (cut === null || (L.from < 0 ? v < cut : v > cut)) cut = v;
        }
        if (cut !== null) {
          if (L.horiz) { if (L.from < 0) L.zone.x1 = cut; else L.zone.x0 = cut; }
          else { if (L.from < 0) L.zone.y1 = cut; else L.zone.y0 = cut; }
        }
      }
    };
    const variants = [];
    for (const LV of levSets) { variants.push({ LV, push: false }); if (crates.length) variants.push({ LV, push: true }); }
    const t00 = d.time + 0.05;
    let nodes = 0;
    try {
      for (const V of variants) {
        R.lev = Object.assign({}, V.LV);
        crates.forEach((c, k) => { c.x = V.push ? crateWall[k] : crateX0[k]; });
        cutLasers();
        // ---- les points de départ ----
        const seeds = [{ x: R.spawn.x + 0.5, y: R.spawn.y + 0.05 }];
        for (const zx of B.zonesX || []) seeds.push({ x: zx + 1.2, y: 1.05 });
        if (B.escape) seeds.push({ x: B.escape.to[0] + 0.5, y: B.escape.to[1] + 0.05 });
        if (B.approach) seeds.push({ x: B.approach.x0 + 1.2, y: 1.05 });
        for (const c of R.ents.cp || []) if (!c.fake) seeds.push({ x: c.x + 0.5, y: c.y + 0.05 });
        for (const dr of R.ents.door || []) if (dr.to && !dr.trap) seeds.push({ x: dr.to[0] + 0.5, y: dr.to[1] + 0.05 });
        const seen = new Set(), queue = [];
        const keyOf = (s) => Math.round(s.x * 2) + ',' + Math.round(s.y * 2) + (s.standOn && s.standOn.plat ? 'p' : '') + (R.hasAB ? '/' + s.ab : '');
        // (debout sur une plateforme qui bouge : on retient AUSSI l'heure, la plateforme n'est là qu'à ce moment)
        const push = (s, t) => {
          if (!s || !s.g) return;
          const k = keyOf(s);
          if (seen.has(k)) return;
          const pl = s.standOn && s.standOn.plat && s.standOn.ref && s.standOn.ref.auto ? s.standOn.ref : null;
          seen.add(k); queue.push({ x: s.x, y: s.y, ab: s.ab, plat: !!pl, per: pl ? (2 * Math.PI) / (pl.speed || 1) : 0, t: t === undefined ? t00 : t });
          if (opt.trace && s.x > opt.trace[0] && s.x < opt.trace[1]) (window.__TR = window.__TR || []).push(s.x.toFixed(2) + ',' + s.y.toFixed(2));
        };
        // on pose chaque point de départ (il tombe jusqu'au sol)
        for (const sd of seeds) {
          const s = mkState(R, sd.x, sd.y);
          for (let k = 0; k < 90 && !s.g; k++) { step(R, s, {}, t00 + k / 60); }
          if (s.g && !S.danger(R, t00, s.x, s.y, s)) push(s, t00);
        }
        const touch = (s, hit) => {
          for (const c of coins) {
            if (c.x < s.x - 0.7) continue;
            if (c.x > s.x + 0.7) break;
            if (Math.abs(s.x - c.x) < 0.6 && s.y < c.y + 0.35 && s.y + PH > c.y - 0.35) hit.push(c.i);
          }
        };
        const maxNodes = opt.maxNodes || 6000;
        const flapNear = (x) => (R.ents.flappy || []).some((f) => x > f.x0 - 4 && x < f.x1 + 1);
        const liftNear = (x) => (R.ents.fan || []).some((f) => Math.abs(x - (f.x + 0.5)) < 4) || (R.ents.lowg || []).some((z) => x > z.x0 - 4 && x < z.x1 + 4);
        while (queue.length && nodes < maxNodes) {
          const nd = queue.shift(); nodes++;
          // sur une plateforme qui bouge : on essaie de repartir à chaque moment de son trajet (un tour complet)
          let times = opt.times || [0, 0.9, 1.7];
          if (nd.plat && nd.per) { times = []; for (let u = 0; u < Math.min(7, nd.per); u += 0.45) times.push(u); }
          else {
            // à côté d'une plateforme qui bouge (ascenseur, palette) : on peut l'ATTENDRE → tous les moments de son trajet
            const near = (R.ents.plat || []).find((pl) => pl.auto && nd.x > Math.min(pl.x0, pl.x) - (pl.kind === 'M' ? pl.range + 3 : 3) && nd.x < Math.max(pl.x0, pl.x) + pl.w + (pl.kind === 'M' ? pl.range + 3 : 3) && Math.abs(nd.y - pl.y0) < (pl.kind === 'V' ? pl.range + 4 : 4));
            if (near) { const per = (2 * Math.PI) / (near.speed || 1); times = []; for (let u = 0; u < Math.min(7, per); u += 0.45) times.push(u); }
          }
          for (const toff of times) {
            let t0 = t00 + toff, ride = null;
            if (nd.plat) {
              // sur une plateforme qui bouge : on part de l'heure où on y était, on se laisse porter « toff » secondes
              ride = mkState(R, nd.x, nd.y, nd.ab);
              t0 = nd.t;
              step(R, ride, {}, t0);
              for (let k = 0; k < Math.round(toff * 60) && ride.g; k++) { t0 += 1 / 60; step(R, ride, {}, t0); if (S.danger(R, t0, ride.x, ride.y, ride)) { ride.g = false; break; } }
              if (!ride.g) continue;
            }
            for (const A of ACTS) {
              if (A.flap && !flapNear(nd.x)) continue;
              if (A.lift && !liftNear(nd.x)) continue;
              const s = ride ? Object.assign({}, ride, { fallen: Object.assign({}, ride.fallen), barrelT: new Map(ride.barrelT), crushT: new Map(ride.crushT), chaseT: new Map(ride.chaseT), standT: Object.assign({}, ride.standT) }) : mkState(R, nd.x, nd.y, nd.ab);
              // (une image au repos : on se pose)
              if (!ride) step(R, s, {}, t0);
              if (!s.g) continue;
              const hit = [];
              let left = false, ok = false, kEnd = 0;
              for (let k = 0; k < (A.flap || A.lift ? 320 : 170); k++) {
                kEnd = k;
                const t = t0 + (k + 1) / 60;
                const inp = A.f(k, s) || {};
                step(R, s, inp, t);
                if (s.dead) break;
                if (S.danger(R, t, s.x, s.y, s) || S.danger(R, t + 1 / 60, s.x, s.y, s)) break;
                touch(s, hit);
                if (!s.g) left = true;
                if (A.walk && k >= A.walk && s.g) { ok = true; break; }
                if (A.jump && left && s.g && k > 3) { ok = true; break; }
                if (s.y < -2) break;
              }
              if (!ok) continue;
              // l'endroit d'arrivée doit rester sûr un instant (on peut y repartir)
              let safe = true;
              // (le temps continue après l'arrivée)
              // (comme un joueur : il freine en poussant le stick dans l'autre sens s'il glisse encore)
              for (let j = 0; j < 10; j++) {
                const t = t0 + (kEnd + 2 + j) / 60, br = { left: s.vx > 0.6, right: s.vx < -0.6 };
                step(R, s, br, t);
                if (S.danger(R, t, s.x, s.y, s)) { safe = false; break; }
              }
              if (!safe) continue;
              hit.forEach((i) => got.add(i));
              push(s, t0 + (kEnd + 11) / 60);
            }
          }
        }
      }
    } finally {
      R.lev = lev0;
      crates.forEach((c, k) => { c.x = crateX0[k]; });
      lasers.forEach((L, k) => Object.assign(L.zone, zone0[k]));
      restore.forEach((f) => f());
    }
    const ko = coins.filter((c) => !got.has(c.i)).map((c) => ({ i: c.i, x: +c.x.toFixed(1), y: +c.y.toFixed(1), quest: !!c.quest }));
    return { total: coins.length, ok: [...got], ko, nodes };
  }
  window.coinReach = coinReach;
})();
