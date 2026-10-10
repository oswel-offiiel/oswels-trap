/* =====================================================================
   🚧 PIÈGE-MOI SI TU PEUX — construis tes pièges, puis survis-y
   PHASE 1 — CONSTRUCTION (22 s, puis 17 s) : chaque joueur déplace un
   curseur à sa couleur et pose ses pièges (A : poser, B : changer).
   PHASE 2 — SURVIE (50 s max) : traverser l'atelier jusqu'à la SORTIE.
   B : sauter (par-dessus trous, mines, plaques), A : coup d'épaule.
   Les pièges RESTENT d'une manche à l'autre : c'est de pire en pire.
   Points : arrivée 4/3/2/1 · +1 par victime de tes pièges · −1 si tu
   tombes dans ton propre piège. Revanche : celui qui a le moins marqué
   pendant la manche a un piège de plus à la suivante.
   ---------------------------------------------------------------------
   v1.4 — LE GRAND ATELIER (36 × 17, avant 28 × 13) :
   - 4 couloirs de départ répartis sur toute la hauteur (à 2 et 3 joueurs,
     les places restent symétriques autour du milieu) ;
   - 3 cloisons avec passages (4, puis 3, puis 3 passages) → 3 drapeaux
     de reprise, et 14 piliers qui coupent les lignes droites ;
   - TAPIS ROULANTS (élément fixe) : un « express » au milieu de la
     2e salle, et deux sur les côtés de la dernière salle. Ils poussent
     vers la SORTIE (+3 cases/s) : plus rapides… mais impossible de
     freiner sur une mine ou une plaque posée dessus ! Ils ne marchent
     pas en l'air (un saut sur un tapis = on garde sa vitesse normale) ;
   - 4 pièges par manche et par joueur (avant 3), jusqu'à 7 points de
     victimes par manche (avant 6).
   Plan (# mur, > tapis roulant, S départ, E sortie) :
       x 0         1         2         3
         012345678901234567890123456789012345
     z 3 #SS....#..#......#.......>>>>>>..EE#
     z 8 #.....#...#>>>>>>............#...EE#
     z13 #SS....#..#......#.......>>>>>>..EE#
   ===================================================================== */
(function () {
  const W = 36, D = 17, MID = 8, RUN = 50, BX0 = 4, BX1 = W - 6;   // zone de construction : x de 4 à 30
  // couloirs de départ selon le nombre de joueurs (toujours symétriques autour du milieu z = 8)
  const LANES = { 1: [8], 2: [6, 10], 3: [3, 8, 13], 4: [3, 6, 10, 13] };
  const ALL_LANES = [3, 6, 8, 10, 13];
  const lanesFor = (n) => LANES[Math.max(1, Math.min(4, n))];
  // trois cloisons avec des passages (les bons endroits pour piéger…) et des piliers
  const GAPS = { 10: [2, 6, 10, 14], 17: [4, 8, 12], 24: [3, 8, 13] };
  const PILLARS = [[7, 3], [7, 13], [6, 8], [13, 4], [13, 12], [15, 6], [15, 10], [20, 6], [20, 10], [21, 2], [21, 14], [27, 6], [27, 10], [29, 8]];
  // les tapis roulants : ils poussent vers la droite (vers la SORTIE)
  const BELTS = [{ z: 8, x0: 11, x1: 16 }, { z: 3, x0: 25, x1: 30 }, { z: 13, x0: 25, x1: 30 }];
  const BELT_V = 3.0;                                      // cases par seconde
  const BELT_AT = new Set();
  for (const b of BELTS) for (let x = b.x0; x <= b.x1; x++) BELT_AT.add(b.z * W + x);
  const PER_ROUND = 4;                                    // pièges par manche et par joueur
  const CAP = 7;                                          // points de pièges max par manche et par joueur
  const CURSOR_V = 8.5;                                   // vitesse du curseur (grande zone)
  const TYPES = {
    mine:   { icon: '💣', name: 'Mine' },
    trou:   { icon: '🕳', name: 'Trou' },
    laser:  { icon: '🔴', name: 'Laser' },
    mur:    { icon: '🧱', name: 'Mur' },
    plaque: { icon: '🟫', name: 'Plaque fragile' },
    vent:   { icon: '🌀', name: 'Ventilateur' },
    elec:   { icon: '⚡', name: 'Sol électrique' },
  };
  const TLIST = Object.keys(TYPES);
  const MEDAL = ['🥇', '🥈', '🥉', '4ᵉ'];

  const base = (x, z) => (x === 0 || z === 0 || x === W - 1 || z === D - 1 || PILLARS.some(([px, pz]) => px === x && pz === z) || (GAPS[x] && !GAPS[x].includes(z)) ? 1 : 0);
  const CHECK = Object.keys(GAPS).map((g) => +g + 1);     // les drapeaux, juste après les cloisons (x = 11, 18, 25)
  const nearGap = (x) => Object.keys(GAPS).some((g) => Math.abs(x - g) <= 1);
  const onBelt = (x, z) => BELT_AT.has(z * W + x);
  const laserOn = (S, t, ahead = 0) => ((S.tc + ahead + t.ph) % 2.4) < 1.0;
  const elecOn = (S, t, ahead = 0) => ((S.tc + ahead + t.ph) % 2.6) < 0.9;
  let beltTex = null;                                     // texture des tapis (créée une seule fois)

  OT.Arena.register({
    id: 'piege', name: 'Piège-moi si tu peux', icon: '🚧', color: '#3cff9a', theme: 'piege', music: 'piege',
    tagline: 'Pose tes pièges… puis traverse l\'atelier sans tomber dedans !',
    rules: [
      'PHASE 1 — CONSTRUCTION : déplace ton curseur, A pour poser un piège, B pour changer de piège (4 par manche).',
      'PHASE 2 — SURVIE : traverse jusqu\'à la SORTIE à droite. B : sauter (trous, mines, plaques), A : coup d\'épaule. Les tapis roulants poussent vers la sortie.',
      '7 pièges : mine cachée, trou, laser, mur, plaque fragile, ventilateur, sol électrique. Ils RESTENT d\'une manche à l\'autre !',
      'Arrivée 4, 3, 2, 1 pts · +1 par victime de tes pièges · −1 si tu tombes dans ton propre piège.',
    ],
    // la fiche de présentation (v1.4)
    goal: 'Pose tes pièges, puis traverse l\'atelier jusqu\'à la SORTIE sans tomber dedans.',
    howto: [
      'Construction : déplace ton curseur avec {move}, {a} pose un piège, {b} change de piège.',
      'Survie : fonce vers la SORTIE à droite. Les 🚩 drapeaux te servent de point de reprise.',
      '{b} : sauter par-dessus trous, mines et plaques · {a} : coup d\'épaule.',
      'Les tapis roulants ⏩ vont plus vite… mais on ne freine pas dessus !',
    ],
    danger: 'Les pièges RESTENT d\'une manche à l\'autre, et les mines deviennent invisibles pendant la course.',
    win: 'Sortie : 4, 3, 2, 1 pts · +1 pt par victime de tes pièges.',
    lose: '−1 si tu tombes dans ton propre piège. Une chute = retour au dernier drapeau.',
    tuto: false,          // la phase de construction sert déjà d'entraînement
    controls: { a: 'Poser / coup d\'épaule', b: 'Changer de piège / sauter' },
    rounds: 3, scoreName: 'points', maxRound: 110,
    view: () => ({ x0: 0, z0: 0, x1: W, z1: D }),
    tilt: 34,
    camMin: 0.6,          // la caméra suit l'action sans montrer moins que cette part de l'atelier
    // construction : la caméra montre toute la zone où l'on pose les pièges
    focus(A) { return A.S.mode === 'build' ? [{ x: BX0, z: 0.5 }, { x: BX1 + 1, z: D - 0.5 }].concat(A.players.map(cursorOf)) : null; },
    knockDrag: 4.5,
    botCompensate: true,

    // flèches d'objectif (survie) : la SORTIE + le prochain drapeau de chacun (humains d'abord)
    goals(A) {
      const S = A.S;
      if (S.mode === 'build' || S.ended) return [];
      const out = [{ x: W - 2, z: MID + 0.5, color: 0x3cff9a, label: 'SORTIE', size: 1.25 }];
      const run = A.players.filter((P) => !P.data.done && !(P.data.respawnIn > 0));
      const hum = run.filter((P) => P.human);
      const seen = new Set();
      for (const P of hum.length ? hum : run) {
        const cp = CHECK.find((c) => P.data.cp < c + 0.5);
        if (cp === undefined) continue;
        // la flèche se pose dans le passage de la cloison le plus proche du joueur
        const gz = GAPS[cp - 1].slice().sort((a, b) => Math.abs(a + 0.5 - P.z) - Math.abs(b + 0.5 - P.z))[0];
        const key = cp + ':' + gz;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ x: cp - 0.5, z: gz + 0.5, color: hum.length > 1 ? P.color : 0xffd23a, label: '🚩', size: 0.85 });
        if (out.length >= 5) break;
      }
      return out;
    },

    setup(A) {
      const S = A.S;
      S.traps = []; S.nextId = 1; S.version = 0; S.prevScore = A.fill(A.n, 0);
      S.wins = A.fill(A.n, 0); S.revUsed = A.fill(A.n, 0);
    },

    round(A) {
      const S = A.S;
      A.buildGrid(W, D, base, 'piege');
      // la revanche : le joueur qui a le moins marqué pendant la manche précédente
      S.revenge = -1;
      if (A.round > 1) {
        const gain = A.players.map((P) => A.score[P.i] - S.prevScore[P.i]);
        const min = Math.min(...gain);
        const lows = A.players.filter((P) => gain[P.i] === min);
        if (lows.length < A.n) { S.revenge = A.pick(lows).i; S.revUsed[S.revenge]++; }
      }
      S.prevScore = A.score.slice();
      // les pièges des manches précédentes sont toujours là
      for (const t of S.traps) applyCell(A, t);
      reindex(A);
      Object.assign(S, { mode: 'build', buildT: A.round === 1 ? 22 : 17, rt: 0, tc: 0, lim: RUN, order: [], ended: false, lastCall: false, cd: {}, gain: A.fill(A.n, 0), selfLoss: A.fill(A.n, 0), roundVictims: A.fill(A.n, 0), allDoneAt: null, version: S.version + 1 });
      const lanes = lanesFor(A.n);
      A.players.forEach((P, i) => {
        const lane = lanes[i % lanes.length];
        A.place(P, 1.5, lane + 0.5); P.speed = 4.4; P.r = 0.3; P.face = Math.PI / 2;
        // les curseurs partent dans la 2e ou la 3e salle, à la hauteur de leur couloir
        P.data = { left: PER_ROUND + (S.revenge === P.i ? 1 : 0), type: TLIST[(i + (A.round - 1) * 2) % TLIST.length], cx: i % 2 ? 20.5 : 13.5, cz: lane + 0.5, done: false, falls: 0, cp: 1.5, lane };
      });
      if (!A.headless) buildScene(A);
    },

    go(A) {
      const S = A.S;
      const rev = S.revenge >= 0 ? A.players[S.revenge] : null;
      A.banner('PHASE 1 : CONSTRUCTION', rev ? `Revanche : ${rev.name} a un piège de plus !` : `${PER_ROUND} pièges chacun · A : poser · B : changer de piège`, rev ? rev.css : '#ffd23a', 2.2);
    },

    lockMove(A) { return A.S.mode !== 'run'; },
    speedMod(A, P) { return P.data.dashT > 0 ? 2.2 : 1; },
    // le vent des ventilateurs (vers la gauche) et les tapis roulants (vers la droite, seulement au sol)
    drift(A, P) {
      const S = A.S;
      if (S.mode !== 'run') return null;
      const cx = Math.floor(P.x), cz = Math.floor(P.z), k = cz * W + cx;
      let x = 0;
      if (S.wind && S.wind.has(k)) x -= 2.8;
      if (P.h < 0.05 && BELT_AT.has(k) && A.grid.at(cx, cz) === A.FLOOR) x += BELT_V;
      return x ? { x, z: 0 } : null;
    },

    onFall(A, P) {
      const S = A.S, cx = Math.floor(P.x), cz = Math.floor(P.z);
      const t = S.traps.find((q) => q.x === cx && q.z === cz && (q.type === 'trou' || q.type === 'plaque'));
      if (t) credit(A, t, P);
      P.data.falls++; P.data.respawnIn = 1.3; P.data.fz = P.z;
      A.say(P.x, P.z, P.data.cp > 2 ? 'Retour au drapeau !' : 'Retour au départ !', P.css, 22);
    },

    update(A, dt) {
      const S = A.S;
      S.tc += dt;
      if (S.mode === 'build') return updBuild(A, dt);
      if (S.mode === 'ready') { S.readyT -= dt; if (S.readyT <= 0) { S.mode = 'run'; A.sfx('go'); } return; }
      updRun(A, dt);
    },

    draw(A, dt, time) { drawAll(A, dt, time); },

    hud(A) {
      const S = A.S;
      if (S.mode === 'build') {
        return {
          timer: S.buildT, note: 'PHASE 1 · CONSTRUCTION — A : poser · B : changer de piège',
          rows: A.players.map((P) => ({ i: P.i, txt: P.data.left > 0 ? ` ${TYPES[P.data.type].icon}×${P.data.left}` : ' ✔' })),
        };
      }
      return {
        timer: S.mode === 'run' ? S.lim - S.rt : RUN, note: 'PHASE 2 · SURVIE — B : sauter · A : coup d\'épaule',
        rows: A.players.map((P) => ({ i: P.i, fin: P.data.done, txt: P.data.done ? ' ' + MEDAL[S.order.indexOf(P.i)] : P.data.respawnIn > 0 ? ' 💀' : ` ${Math.round(Math.max(0, Math.min(1, (P.x - 1.5) / (W - 4.1))) * 100)}%` })),
      };
    },
    rush(A) { const S = A.S; return S.mode === 'run' && S.lim - S.rt < 10 ? 1.15 : 1; },
    timeoutRank() { return { text: 'Temps écoulé !' }; },

    stats(A, P) {
      const s = A.stats[P.i], v = s.victims || 0, a = s.arrivals || 0;
      return [`${v} victime${v > 1 ? 's' : ''} piégée${v > 1 ? 's' : ''}`, `Piégé ${s.trapped || 0} fois`, `${a}/${A.rounds} arrivée${a > 1 ? 's' : ''}`];
    },
    bonus(A, P) {
      const o = [], s = A.stats[P.i];
      const best = A.S.traps.filter((t) => t.owner === P.i).sort((a, b) => b.victims - a.victims)[0];
      if (best && best.victims >= 2) o.push(`Meilleur piège : ${TYPES[best.type].name} (${best.victims} victimes)`);
      if (s.self) o.push(`Pris à son propre piège ×${s.self}`);
      if (A.S.revUsed[P.i]) o.push('Revanche');
      return o;
    },
    tiebreak(A, i) { return (A.stats[i].arrivals || 0) * 10 + (A.stats[i].victims || 0); },

    /* ---------- LES BOTS : curseur puis course, avec les mêmes boutons ---------- */
    bot(A, P, B, L) {
      const S = A.S;
      if (S.mode === 'build') return botBuild(A, P, B, L);
      if (S.mode === 'run') return botRun(A, P, B, L);
      return {};
    },
    botGuard(A, P, mx, mz, L, C) {
      // en course : ne pas marcher dans un trou (sauf distraction)
      if (A.S.mode !== 'run' || P.h > 0.05 || (C && C.careless)) return [mx, mz];
      const G = A.grid, la = 0.42;
      const bad = (x, z) => G.at(Math.floor(x), Math.floor(z)) === A.VOID;
      if (!bad(P.x + mx * la, P.z + mz * la)) return [mx, mz];
      if (!bad(P.x + mx * la, P.z)) return [mx, 0];
      if (!bad(P.x, P.z + mz * la)) return [0, mz];
      return [0, 0];
    },
  });

  /* ==================================================================
     LES PIÈGES
     ================================================================== */
  function applyCell(A, t) {
    if (t.type === 'mur') A.setCell(t.x, t.z, A.WALL);
    if (t.type === 'trou') A.setCell(t.x, t.z, A.VOID);
    if (t.type === 'plaque') { t.state = 'ok'; t.t = 0; }
    if (t.type === 'mine') { t.armed = true; t.hidden = false; t.re = 0; }
  }

  // les cases où chaque piège agit
  function reindex(A) {
    const S = A.S, G = A.grid;
    S.ground = new Map(); S.beam = new Map(); S.wind = new Map();
    const add = (m, x, z, t) => {
      if (!G.inside(x, z) || G.solid(x, z)) return false;
      const k = z * W + x;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(t);
      return true;
    };
    for (const t of S.traps) {
      t.cells = [];
      if (t.type === 'mine' || t.type === 'plaque') { add(S.ground, t.x, t.z, t); t.cells.push([t.x, t.z]); }
      else if (t.type === 'elec') { for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) if (G.at(t.x + dx, t.z + dz) !== A.VOID && add(S.ground, t.x + dx, t.z + dz, t)) t.cells.push([t.x + dx, t.z + dz]); }
      else if (t.type === 'laser') {
        add(S.beam, t.x, t.z, t); t.cells.push([t.x, t.z]);
        for (const s of [-1, 1]) for (let k = 1; k <= 2; k++) { const z = t.z + s * k; if (!add(S.beam, t.x, z, t)) break; t.cells.push([t.x, z]); }
      } else if (t.type === 'vent') { for (let x = t.x - 3; x <= t.x; x++) for (let z = t.z - 1; z <= t.z + 1; z++) if (add(S.wind, x, z, t)) t.cells.push([x, z]); }
    }
  }

  // un chemin doit toujours exister entre le DÉPART (au milieu de la hauteur) et la SORTIE
  function pathOK(A, bx, bz) {
    const G = A.grid;
    return !!A.Bot.bfs(1, MID, (gx) => gx >= W - 3, (gx, gz) => !(gx === bx && gz === bz) && !G.solid(gx, gz) && G.at(gx, gz) !== A.VOID, 6000);
  }

  // null si on peut poser ici, sinon la raison
  function canPlace(A, type, x, z) {
    const S = A.S, G = A.grid;
    if (x < BX0 || x > BX1 || z < 1 || z > D - 2) return 'Hors zone';
    if (G.at(x, z) !== A.FLOOR) return 'Case occupée';
    if (S.traps.some((t) => t.x === x && t.z === z)) return 'Déjà un piège ici';
    if (type === 'elec') { for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) if (G.at(x + dx, z + dz) !== A.FLOOR) return 'Pas assez de place'; }
    if ((type === 'mur' || type === 'trou') && !pathOK(A, x, z)) return 'Il faut laisser un passage !';
    return null;
  }

  function tryPlace(A, P) {
    const S = A.S, d = P.data, x = Math.floor(d.cx), z = Math.floor(d.cz);
    const why = canPlace(A, d.type, x, z);
    if (why) {
      A.sfx('bad'); A.say(x + 0.5, z + 0.5, why, '#ff6b5a', 22);
      if (P.bot) { P.bot.mem.plan = null; (P.bot.mem.bad = P.bot.mem.bad || {})[z * W + x] = 1; }
      return;
    }
    const t = { id: S.nextId++, type: d.type, owner: P.i, x, z, round: A.round, ph: Math.random() * 2.6, victims: 0 };
    S.traps.push(t);
    applyCell(A, t); reindex(A); S.version++;
    d.left--; A.stat(P.i, 'placed', 1);
    A.sfx('pick'); A.rumble(P, 0.2, 0.3, 80);
    A.burst(x + 0.5, 0.3, z + 0.5, 12, [P.color, 0xffffff], 3, { flat: true });
    if (!A.headless) { makeTrapMesh(A, t); for (const q of S.traps) if (q.type === 'laser' && q !== t && q.g && q.span !== spanOf(q)) makeTrapMesh(A, q); }
    if (P.bot) { P.bot.mem.plan = null; P.bot.mem.waitPlan = A.clock + A.rand(0.2, 0.8) * (1.6 - P.level.skill); }
  }

  // une victime ! (+1 au propriétaire, −1 si c'est son propre piège)
  function credit(A, t, V) {
    const S = A.S, key = t.id + ':' + V.i;
    if (S.cd[key] > A.clock) return;
    S.cd[key] = A.clock + 4;
    const O = A.players[t.owner];
    A.rumble(V, 0.6, 0.4, 200);
    if (O === V) {
      A.stat(O.i, 'self', 1);
      if ((S.selfLoss[O.i] = (S.selfLoss[O.i] || 0) + 1) > 3) return;   // −3 au maximum par manche
      A.point(O.i, -1); S.gain[O.i]--;
      A.say(V.x, V.z, 'Pris à son propre piège ! −1', O.css, 24); A.sfx('bad');
      return;
    }
    A.stat(V.i, 'trapped', 1);
    t.victims++; S.roundVictims[O.i]++;
    if (S.gain[O.i] >= CAP) return;
    S.gain[O.i]++;
    A.point(O.i, 1); A.stat(O.i, 'kills', 1); A.stat(O.i, 'victims', 1);
    A.say(V.x, V.z, `${TYPES[t.type].icon} +1 ${O.name}`, O.css, 22);
  }

  function explode(A, t) {
    t.armed = false; t.re = 5; t.hidden = false;
    A.sfx('boom'); A.shake(0.45);
    A.burst(t.x + 0.5, 0.4, t.z + 0.5, 26, [0xff5a1a, 0xffd23a, 0x333333], 6, { up: 3 });
    for (const P of A.alive()) {
      if (P.data.done || P.h > 0.6 || P.inv > 0) continue;
      const dx = P.x - (t.x + 0.5), dz = P.z - (t.z + 0.5);
      if (Math.hypot(dx, dz) > 1.3) continue;
      A.knock(P, dx * 0.6 - 1, dz * 0.6 + A.rand(-0.3, 0.3), 9, 0.8, null);
      credit(A, t, P);
    }
    // ceux qui l'ont vue s'en souviendront (plus ou moins)
    for (const P of A.players) if (P.bot && P.bot.mem.known && Math.random() < 0.5 + P.level.skill * 0.5) P.bot.mem.known.add(t.id);
  }

  /* ==================================================================
     PHASE 1 : CONSTRUCTION
     ================================================================== */
  function updBuild(A, dt) {
    const S = A.S;
    S.buildT -= dt;
    for (const P of A.players) {
      const d = P.data;
      d.cx = A.clamp(d.cx + P.in.mx * CURSOR_V * dt, BX0 + 0.01, BX1 + 0.99);
      d.cz = A.clamp(d.cz + P.in.mz * CURSOR_V * dt, 1.01, D - 1.01);
      if (d.left <= 0) continue;
      if (P.in.bP) { d.type = TLIST[(TLIST.indexOf(d.type) + 1) % TLIST.length]; A.sfx('tick'); }
      if (P.in.aP) tryPlace(A, P);
    }
    const allDone = A.players.every((P) => P.data.left <= 0);
    if (allDone && S.allDoneAt === null) S.allDoneAt = A.t + 0.8;
    if (S.buildT <= 0 || (allDone && A.t >= S.allDoneAt)) startRun(A);
  }

  function startRun(A) {
    const S = A.S;
    S.mode = 'ready'; S.readyT = 1.6; S.rt = 0;
    const lost = A.players.filter((P) => P.data.left > 0);
    for (const P of A.players) {
      P.data.left = 0;
      if (!P.bot) continue;
      const B = P.bot;
      B.mem.plan = null; B.mem.known = new Set();
      // chacun se souvient de SES mines ; celles des autres, selon le niveau (et moins bien si elles sont anciennes)
      for (const t of S.traps) if (t.type === 'mine') {
        const p = t.owner === P.i ? 0.95 : (t.round === A.round ? P.level.skill * 0.8 : P.level.skill * 0.5);
        if (Math.random() < p) B.mem.known.add(t.id);
      }
    }
    for (const t of S.traps) if (t.type === 'mine') { t.hidden = true; A.burst(t.x + 0.5, 0.3, t.z + 0.5, 6, [0x9aa5a0, 0xffffff], 2, { flat: true }); }
    A.banner('PHASE 2 : SURVIE !', lost.length ? 'Les mines disparaissent… (pièges non posés : perdus)' : 'Les mines disparaissent… Traverse jusqu\'à la SORTIE !', '#3cff9a', 1.8);
    A.sfx('warn');
    // 1re manche : on montre les tapis roulants
    if (A.round === 1) for (const b of BELTS) A.say((b.x0 + b.x1 + 1) / 2, b.z + 0.5, '⏩ Tapis roulant', '#ffd23a', 22);
  }

  /* ==================================================================
     PHASE 2 : SURVIE
     ================================================================== */
  function updRun(A, dt) {
    const S = A.S;
    S.rt += dt;
    // pièges qui vivent tout seuls
    for (const t of S.traps) {
      if (t.type === 'mine' && !t.armed) { t.re -= dt; if (t.re <= 0) { t.armed = true; t.hidden = true; } }
      if (t.type === 'plaque') {
        if (t.state === 'crack') {
          t.t += dt;
          if (t.t > 0.45) { t.state = 'gone'; t.t = 0; A.setCell(t.x, t.z, A.VOID); A.sfx('small'); A.burst(t.x + 0.5, 0.1, t.z + 0.5, 14, [0xb59a6a, 0x3a2a14], 3); }
        } else if (t.state === 'gone') {
          t.t += dt;
          if (t.t > 3) { t.state = 'ok'; t.t = 0; A.setCell(t.x, t.z, A.FLOOR); }
        }
      }
    }
    for (const P of A.players) {
      const d = P.data;
      if (d.respawnIn > 0) { d.respawnIn -= dt; if (d.respawnIn <= 0) respawn(A, P); continue; }
      if (!P.alive || P.out || d.done) continue;
      // B : sauter · A : coup d'épaule
      if (P.in.bP && P.h <= 0.01 && !(d.jumpCdT > 0) && P.stun <= 0) { P.vh = 7.2; d.jumpCdT = 0.75; A.sfx('jump'); }
      if (P.in.aP && !(d.dashCdT > 0) && P.stun <= 0) { d.dashT = 0.18; d.dashCdT = 1.4; A.sfx('whoosh'); }
      if (d.dashT > 0) for (const O of A.others(P)) {
        if (O.data.done || A.dist(O, P) > 0.75 || O.data.bumpT > 0) continue;
        O.data.bumpT = 0.4;
        A.knock(O, O.x - P.x + Math.sin(P.face) * 0.5, O.z - P.z + Math.cos(P.face) * 0.5, 7, 0.35, P);
        A.stat(P.i, 'bumps', 1); A.sfx('hit');
      }
      const k = Math.floor(P.z) * W + Math.floor(P.x);
      if (P.h < 0.05) for (const t of S.ground.get(k) || []) {
        if (t.type === 'mine' && t.armed) explode(A, t);
        else if (t.type === 'plaque' && t.state === 'ok') { t.state = 'crack'; t.t = 0; A.sfx('tick'); A.say(t.x + 0.5, t.z + 0.5, 'Crac…', '#ffd28a', 22); A.warn(P, t.x + 0.5, t.z + 0.5); }
        else if (t.type === 'elec' && elecOn(S, t) && !(d.zapT > 0) && P.inv <= 0) {
          d.zapT = 2.2; P.stun = Math.max(P.stun, 0.9);
          A.knock(P, -1, A.rand(-0.5, 0.5), 4.5, 0.9, null);   // la décharge te rejette hors de la plaque
          credit(A, t, P); A.sfx('zap'); A.burst(P.x, 0.5, P.z, 12, [0xffe14a, 0xffffff], 4);
        }
      }
      for (const t of S.beam.get(k) || []) {
        // un humain sur un rayon qui va se rallumer (il clignote) : « Attention ! »
        if (P.human && !laserOn(S, t) && laserOn(S, t, 0.4)) A.warn(P, t.x + 0.5, t.z + 0.5);
        if (!laserOn(S, t) || d.zapT > 0 || P.inv > 0) continue;
        d.zapT = 0.9;
        A.knock(P, -1, A.rand(-0.4, 0.4), 6.5, 0.45, null);
        credit(A, t, P); A.sfx('zap'); A.burst(P.x, 0.7, P.z, 10, [0xff2020, 0xffffff], 4);
      }
      // drapeaux : après chaque cloison, on ne repart plus du départ
      for (const cp of CHECK) if (P.x > cp + 0.2 && d.cp < cp + 0.5) { d.cp = cp + 0.5; A.say(P.x, P.z, '🚩 Drapeau !', P.css, 22); A.sfx('tick'); }
      // la SORTIE
      if (P.x >= W - 2.6) {
        d.done = true; S.order.push(P.i);
        const place = S.order.length, pts = [4, 3, 2, 1][place - 1] || 0;
        A.point(P.i, pts); A.stat(P.i, 'arrivals', 1);
        if (place === 1) S.wins[P.i]++;
        A.say(P.x, P.z, `${['1er', '2e', '3e', '4e'][place - 1] || 'Sorti'} ! +${pts}`, P.css, 32);
        A.sfx(place === 1 ? 'power' : 'ok'); A.rumble(P, 0.3, 0.6, 200);
        A.burst(P.x, 0.8, P.z, 24, [P.color, 0x3cff9a, 0xffffff], 6, { up: 3 });
        P.alive = false; P.out = true;
      }
    }
    // fin : tout le monde est sorti, ou le temps ; le dernier a 8 s de sursis
    const left = A.players.filter((P) => !P.data.done);
    if (!S.lastCall && A.n > 1 && left.length === 1 && S.lim - S.rt > 8) {
      S.lastCall = true; S.lim = S.rt + 8;
      A.banner(`${left[0].name} : 8 s pour sortir !`, 'Tous les autres sont dehors', left[0].css, 1.6);
    }
    if (!S.ended && (left.length === 0 || S.rt >= S.lim)) {
      S.ended = true;
      for (const t of S.traps) if (t.type === 'mine') t.hidden = false;   // on révèle les mines
      const best = A.players.slice().sort((a, b) => S.roundVictims[b.i] - S.roundVictims[a.i])[0];
      const nv = S.roundVictims[best.i];
      const first = S.order.length ? A.players[S.order[0]] : null;
      A.endRound({
        winners: first ? [first.i] : [],
        text: first ? `${first.name} s'en sort en premier !` : 'Personne n\'est sorti !',
        sub: nv > 0 ? `Piégeur de la manche : ${best.name} (${nv} victime${nv > 1 ? 's' : ''})` : '',
        color: first ? first.css : '#ff6b5a',
      });
    }
  }

  // on repart du dernier drapeau, sur une case sans piège ni tapis, près de l'endroit de la chute
  function respawn(A, P) {
    const S = A.S, G = A.grid, d = P.data;
    let cx = Math.floor(d.cp);
    const clean = (z) => G.at(cx, z) === A.FLOOR && !onBelt(cx, z) && !(S.ground.get(z * W + cx) || []).length && !S.beam.has(z * W + cx) && !S.wind.has(z * W + cx);
    let zs = [];
    for (let z = 1; z < D - 1; z++) if (clean(z)) zs.push(z);
    if (!zs.length) { cx = 1; zs = ALL_LANES.slice(); }
    const busy = (z) => A.players.some((O) => O !== P && O.alive && !O.out && Math.abs(O.x - cx - 0.5) < 0.8 && Math.abs(O.z - z - 0.5) < 0.8);
    const fz = d.fz !== undefined ? d.fz : MID + 0.5;
    zs.sort((a, b) => (busy(a) - busy(b)) || (Math.abs(a + 0.5 - fz) - Math.abs(b + 0.5 - fz)));
    A.revive(P, cx + 0.5, zs[0] + 0.5, 1.0);
    P.face = Math.PI / 2;
  }

  /* ==================================================================
     LES BOTS
     ================================================================== */
  const cursorOf = (P) => ({ x: P.data.cx, z: P.data.cz });
  function wpick(A, w) {
    let s = 0; for (const k in w) s += w[k];
    let r = Math.random() * s;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return TLIST[0];
  }
  function choosePlan(A, P, L) {
    const S = A.S, G = A.grid, M = P.bot.mem, bad = M.bad || {};
    const route = A.Bot.bfs(1, A.pick(ALL_LANES), (gx) => gx >= W - 3, (gx, gz) => !G.solid(gx, gz) && G.at(gx, gz) !== A.VOID, 6000) || [];
    const onRoute = route.filter(([x]) => x >= BX0 && x <= BX1);
    const smart = Math.random() < L.skill;
    const weights = smart ? { mine: 3, trou: 2.5, laser: 2, mur: 1.2, plaque: 2, vent: 1.5, elec: 2 } : { mine: 1, trou: 1, laser: 1, mur: 1, plaque: 1, vent: 1, elec: 1 };
    for (let tries = 0; tries < 40; tries++) {
      const type = wpick(A, weights);
      let x, z;
      if (smart && onRoute.length) {
        // combo : un trou juste derrière une mine, un laser ou un ventilateur (ils renvoient vers la gauche)
        if (type === 'trou' && Math.random() < L.skill * 0.6) {
          const src = S.traps.filter((t) => t.type === 'mine' || t.type === 'laser' || t.type === 'vent');
          if (src.length) { const s = A.pick(src); x = s.x - A.rint(1, s.type === 'vent' ? 3 : 2); z = s.z + A.rint(-1, 1); }
        }
        // sur un tapis roulant, on ne freine pas : mine, plaque ou trou au bout du tapis
        if (x === undefined && (type === 'mine' || type === 'plaque' || type === 'trou') && Math.random() < 0.25 + L.skill * 0.2) {
          const b = A.pick(BELTS); x = Math.min(BX1, b.x1 - A.rint(0, 2)); z = b.z;
        }
        if (x === undefined) {
          // de préférence près d'un passage des cloisons (tout le monde doit y passer)
          const choke = onRoute.filter(([cx]) => nearGap(cx));
          const c = A.pick(choke.length && Math.random() < 0.3 + L.skill * 0.4 ? choke : onRoute);
          x = c[0]; z = c[1] + (type === 'laser' || type === 'vent' ? A.rint(-1, 1) : 0);
        }
      } else { x = A.rint(BX0, BX1); z = A.rint(1, D - 2); }
      if (bad[z * W + x] || canPlace(A, type, x, z)) continue;
      return { type, x, z };
    }
    return null;
  }

  function botBuild(A, P, B, L) {
    const d = P.data, M = B.mem;
    if (d.left <= 0 || M.waitPlan > A.clock) return {};
    let plan = M.plan;
    if (plan && canPlace(A, plan.type, plan.x, plan.z)) plan = null;
    if (!plan) { plan = M.plan = choosePlan(A, P, L); if (!plan) return {}; }
    const out = { go: [plan.x + 0.5, plan.z + 0.5], from: cursorOf, stop: 0.06, slow: 0.7 };
    if (d.type !== plan.type) {
      if (!(M.waitB > A.clock)) { out.tapB = true; M.waitB = A.clock + L.react * 1.3 + 0.1; }
    } else if (Math.floor(d.cx) === plan.x && Math.floor(d.cz) === plan.z && Math.hypot(d.cx - plan.x - 0.5, d.cz - plan.z - 0.5) < 0.4) {
      if (!(M.waitA > A.clock)) { out.tapA = true; M.waitA = A.clock + L.react * 1.3 + 0.2; }
    }
    return out;
  }

  function botRun(A, P, B, L) {
    const S = A.S, d = P.data, G = A.grid;
    if (!P.alive || P.out || d.done || d.respawnIn > 0) return {};
    const known = B.mem.known || new Set();
    const sees = (t) => t.type === 'mine' && t.armed && (known.has(t.id) || !t.hidden);
    const cost = (x, z) => {
      if (G.solid(x, z) || G.at(x, z) === A.VOID) return Infinity;
      const k = z * W + x;
      let c = BELT_AT.has(k) ? 0.85 : 1;            // le tapis roulant : un peu plus rapide
      for (const t of S.ground.get(k) || []) {
        if (sees(t)) c += 30;
        else if (t.type === 'mine' && !t.armed) c += 4;
        else if (t.type === 'plaque') c += t.state === 'ok' ? 3 + 12 * L.skill : 30;
        else if (t.type === 'elec') c += 1.5 + 5 * L.skill;
      }
      if (S.beam.has(k)) c += 1.5 + 4 * L.skill;
      if (S.wind.has(k)) c += 1 + 1.5 * L.skill;
      return c;
    };
    const [cx, cz] = A.Bot.cell(P);
    let path = A.Bot.dijkstra(cx, cz, (x) => x >= W - 3, cost, 6000);
    // coincé entre des trous (plaques effondrées, trou + mur…) : on accepte de SAUTER par-dessus un trou
    if (!path || !path.length) path = A.Bot.dijkstra(cx, cz, (x) => x >= W - 3, (x, z) => (G.at(x, z) === A.VOID ? 20 : cost(x, z)), 6000);
    if (!path || !path.length) return A.Bot.toward(P, W - 1.5, P.z, 0.2);
    const out = A.Bot.follow(P, path);
    out.careless = Math.random() < L.mistake;
    const [nx, nz] = path[0], nk = nz * W + nx, ck = cz * W + cx;
    if (G.at(nx, nz) === A.VOID) {
      if (Math.hypot(nx + 0.5 - P.x, nz + 0.5 - P.z) < 1.15 && !(d.jumpCdT > 0) && P.h <= 0.01) out.tapB = true;
      return out;
    }
    // attendre que le laser ou le sol électrique s'éteigne
    const ahead = 0.3 + L.react * 0.6;
    const zap = (k) => (S.beam.get(k) || []).some((t) => laserOn(S, t) || laserOn(S, t, ahead)) || (S.ground.get(k) || []).some((t) => t.type === 'elec' && (elecOn(S, t) || elecOn(S, t, ahead)));
    const mine = (k) => [].concat(S.beam.get(k) || [], S.ground.get(k) || []).some((t) => t.owner === P.i);
    if (zap(nk) && !zap(ck) && (mine(nk) || Math.random() < 0.3 + L.skill * 0.7)) return { go: [cx + 0.5, cz + 0.5], stop: 0.1, careless: out.careless };
    // sauter par-dessus une mine connue ou une plaque fragile
    const jumpy = (k) => (S.ground.get(k) || []).some((t) => sees(t) || (t.type === 'plaque' && t.state === 'ok'));
    const ddist = Math.hypot(nx + 0.5 - P.x, nz + 0.5 - P.z);
    // sur un tapis on arrive plus vite : on saute un peu plus tôt
    const early = BELT_AT.has(ck) ? 1.35 : 1.0;
    if (jumpy(nk) && ddist < early && !(d.jumpCdT > 0) && Math.random() < 0.2 + L.skill * 0.8) out.tapB = true;
    // coup d'épaule
    const T = A.others(P).find((O) => !O.data.done && A.dist(O, P) < 0.9);
    if (T && !(d.dashCdT > 0) && Math.random() < 0.08 + L.aggro * 0.3) out.tapA = true;
    return out;
  }

  /* ==================================================================
     L'AFFICHAGE
     ================================================================== */
  function frame(A, w, d, color, op = 0.95, th = 0.07) {
    const g = new THREE.Group();
    const a = A.mesh('box', w, color, { h: 0.04, d: th, basic: true, opacity: op }); a.position.z = -d / 2 + th / 2;
    const b = a.clone(); b.position.z = d / 2 - th / 2;
    const c = A.mesh('box', th, color, { h: 0.04, d, basic: true, opacity: op }); c.position.x = -w / 2 + th / 2;
    const e = c.clone(); e.position.x = w / 2 - th / 2;
    g.add(a, b, c, e);
    return g;
  }
  const spanOf = (t) => t.cells.map((c) => c[1]).join(',');

  // les tapis roulants : une plaque par case (cachée si un trou ou un mur la remplace),
  // toutes avec la MÊME texture de chevrons qui défile (une seule géométrie, un seul matériau)
  function buildBelts(A) {
    const S = A.S;
    if (!beltTex) {
      beltTex = OT.Models.canvasTex(64, 64, (g, w, h) => {
        g.fillStyle = '#26282c'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#34373c'; for (let y = 4; y < h; y += 12) g.fillRect(0, y, w, 3);
        g.strokeStyle = '#ffc53a'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(18, 14); g.lineTo(42, 32); g.lineTo(18, 50); g.stroke();
      }, true);
    }
    const geo = new THREE.PlaneGeometry(1, 0.86);
    const mat = new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.7, metalness: 0.2, emissive: 0xffffff, emissiveMap: beltTex, emissiveIntensity: 0.18 });
    const railGeo = new THREE.BoxGeometry(1, 0.08, 0.07);
    const railMat = new THREE.MeshStandardMaterial({ color: A.lin(0x6a6f76), roughness: 0.5, metalness: 0.5 });
    S.belts = [];
    for (const b of BELTS) for (let x = b.x0; x <= b.x1; x++) {
      const g = new THREE.Group();
      const p = new THREE.Mesh(geo, mat); p.rotation.x = -Math.PI / 2; p.position.y = 0.025; p.receiveShadow = true;
      const r1 = new THREE.Mesh(railGeo, railMat); r1.position.set(0, 0.04, -0.465);
      const r2 = new THREE.Mesh(railGeo, railMat); r2.position.set(0, 0.04, 0.465);
      g.add(p, r1, r2); g.position.set(x + 0.5, 0, b.z + 0.5);
      A.add(g);
      S.belts.push({ g, x, z: b.z });
    }
  }

  function buildScene(A) {
    const S = A.S;
    // DÉPART (avec un rond par couloir), zone de construction, SORTIE
    const st = A.mesh('box', 2, 0x3cff9a, { h: 0.02, d: D - 2, basic: true, opacity: 0.16 }); st.position.set(2, 0.012, D / 2); A.add(st);
    const dep = A.label('DÉPART', { size: 30, h: 0.44, color: '#ffffff', border: '#3cff9a' }); dep.position.set(2, 1.15, 0.7); A.add(dep); S.dep = dep;
    for (const P of A.players) { const r = A.mesh('ring', 0.45, P.color, { basic: true, opacity: 0.75 }); r.position.set(1.5, 0.03, P.data.lane + 0.5); A.add(r); }
    for (const cp of CHECK) {
      const ln = A.mesh('box', 0.1, 0x3cff9a, { h: 0.02, d: D - 2, basic: true, opacity: 0.35 }); ln.position.set(cp + 0.05, 0.02, D / 2); A.add(ln);
      for (const fz of [0.55, D - 0.55]) { const pole = A.mesh('box', 0.06, 0xdddddd, { h: 1.2 }); pole.position.set(cp + 0.2, A.grid.wallH + 0.6, fz); const fl = A.mesh('box', 0.45, 0x3cff9a, { h: 0.28, d: 0.04, emissive: 0x3cff9a, ei: 0.4 }); fl.position.set(cp + 0.44, A.grid.wallH + 1.05, fz); A.add(pole); A.add(fl); }
    }
    const zone = A.mesh('box', BX1 - BX0 + 1, 0xffd23a, { h: 0.02, d: D - 2, basic: true, opacity: 0.07 }); zone.position.set((BX0 + BX1 + 1) / 2, 0.012, D / 2); A.add(zone);
    const zf = frame(A, BX1 - BX0 + 1, D - 2, 0xffd23a, 0.5, 0.06); zf.position.set((BX0 + BX1 + 1) / 2, 0.02, D / 2); A.add(zf);
    S.zone = [zone, zf];
    for (let z = 1; z < D - 1; z++) for (let x = W - 3; x < W - 1; x++) { if ((x + z) % 2) continue; const c = A.mesh('box', 0.98, 0xffffff, { h: 0.03, basic: true, opacity: 0.5 }); c.position.set(x + 0.5, 0.015, z + 0.5); A.add(c); }
    const door = OT.Models.door ? OT.Models.door('SORTIE') : null;
    if (door) { door.rotation.y = -Math.PI / 2; door.scale.setScalar(1.25); door.position.set(W - 1.2, 0, D / 2); A.add(door); }
    buildBelts(A);
    // les pièges déjà posés
    for (const t of S.traps) { t.g = null; makeTrapMesh(A, t); }
    // les curseurs
    for (const P of A.players) {
      const g = new THREE.Group();
      const f = frame(A, 1.0, 1.0, P.color, 1, 0.1); f.position.y = 0.06;
      const f2 = frame(A, 1.2, 1.2, P.color, 0.45, 0.05); f2.position.y = 0.05;
      g.add(f, f2);
      g.position.set(P.data.cx, 0, P.data.cz);
      A.add(g);
      P.data.cur = { g, f, lab: null, type: null, valid: null, key: '' };
    }
  }

  function makeTrapMesh(A, t) {
    if (A.headless) return;
    if (t.g) A.remove(t.g);
    const col = A.players[t.owner].color, g = new THREE.Group(), Q = {};
    g.position.set(t.x + 0.5, 0, t.z + 0.5);
    if (t.type === 'mine') {
      const b = A.mesh('cyl', 0.27, 0x2a2a2a, { h: 0.1, metal: 0.4 }); b.position.y = 0.07;
      const top = A.mesh('cyl', 0.15, 0x5a5a5a, { h: 0.06 }); top.position.y = 0.14;
      const led = A.mesh('ball', 0.07, 0xff2020, { emissive: 0xff2020, ei: 1.5 }); led.position.y = 0.19;
      const ring = A.mesh('ring', 0.42, col, { basic: true, opacity: 0.9 }); ring.position.y = 0.045;
      g.add(b, top, led, ring); Q.led = led;
    } else if (t.type === 'trou') {
      const pit = A.mesh('box', 1, 0x060606, { h: 0.9, noShadow: true }); pit.position.y = -0.55;
      const f = frame(A, 1, 1, col); f.position.y = 0.02;
      g.add(pit, f);
    } else if (t.type === 'laser') {
      const zs = t.cells.map((c) => c[1]), z0 = Math.min(...zs), z1 = Math.max(...zs) + 1;
      const o0 = z0 - (t.z + 0.5), o1 = z1 - (t.z + 0.5);
      for (const [oz, s] of [[o0, 1], [o1, -1]]) { const p = A.mesh('box', 0.24, col, { h: 0.8, d: 0.2 }); p.position.set(0, 0.4, oz + s * 0.1); g.add(p); const tip = A.mesh('ball', 0.07, 0xff2020, { emissive: 0xff2020, ei: 1.2 }); tip.position.set(0, 0.5, oz + s * 0.22); g.add(tip); }
      const beam = A.mesh('box', 0.07, 0xff2a2a, { h: 0.07, d: o1 - o0 - 0.4, basic: true, opacity: 0.95 }); beam.position.set(0, 0.5, (o0 + o1) / 2);
      const glow = A.mesh('box', 0.22, 0xff4040, { h: 0.22, d: o1 - o0 - 0.4, basic: true, opacity: 0.25 }); glow.position.copy(beam.position);
      g.add(beam, glow); Q.beam = beam; Q.glow = glow;
      t.span = spanOf(t);
    } else if (t.type === 'mur') {
      const stripe = A.mesh('box', 0.94, col, { h: 0.06, basic: true }); stripe.position.y = A.grid.wallH + 0.03;
      g.add(stripe);
    } else if (t.type === 'plaque') {
      const plate = A.mesh('box', 0.94, 0xb59a6a, { h: 0.06, rough: 0.9 }); plate.position.y = 0.05;
      const c1 = A.mesh('box', 0.8, 0x3a2a14, { h: 0.065, d: 0.05 }); c1.rotation.y = 0.6; c1.position.y = 0.055;
      const c2 = A.mesh('box', 0.5, 0x3a2a14, { h: 0.065, d: 0.05 }); c2.rotation.y = -0.9; c2.position.set(0.12, 0.055, 0.1);
      const pit = A.mesh('box', 1, 0x060606, { h: 0.9, noShadow: true }); pit.position.y = -0.55; pit.visible = false;
      const f = frame(A, 1, 1, col); f.position.y = 0.09;
      g.add(plate, c1, c2, pit, f); Q.plate = [plate, c1, c2]; Q.pit = pit;
    } else if (t.type === 'vent') {
      const post = A.mesh('box', 0.3, 0x6a6f76, { h: 0.45, metal: 0.4 }); post.position.y = 0.22;
      const cage = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.04, 6, 22), new THREE.MeshStandardMaterial({ color: A.lin(col), roughness: 0.5 }));
      cage.rotation.y = Math.PI / 2; cage.position.set(-0.12, 0.66, 0);
      const hub = new THREE.Group(); hub.position.set(-0.12, 0.66, 0);
      for (let k = 0; k < 3; k++) { const bl = A.mesh('box', 0.04, 0xe8eef4, { h: 0.56, d: 0.13 }); bl.rotation.x = (k * Math.PI) / 3; hub.add(bl); }
      const zone = A.mesh('box', 4, 0xcfefff, { h: 0.02, d: 3, basic: true, opacity: 0.1 }); zone.position.set(-1.5, 0.045, 0);
      const zf = frame(A, 4, 3, col, 0.45, 0.05); zf.position.set(-1.5, 0.05, 0);
      const streaks = [];
      for (let k = 0; k < 5; k++) { const s = A.mesh('box', 0.6, 0xffffff, { h: 0.03, d: 0.03, basic: true, opacity: 0.55 }); s.userData.o = Math.random() * 4; s.userData.z = A.rand(-1.3, 1.3); s.userData.y = A.rand(0.2, 0.9); streaks.push(s); g.add(s); }
      g.add(post, cage, hub, zone, zf); Q.hub = hub; Q.streaks = streaks;
    } else if (t.type === 'elec') {
      const plate = A.mesh('box', 1.94, 0x35435e, { h: 0.04, d: 1.94, metal: 0.6, rough: 0.4, emissive: 0xffe14a, ei: 0 }); plate.position.set(0.5, 0.04, 0.5);
      const l1 = A.mesh('box', 1.8, 0x7a6a2a, { h: 0.045, d: 0.05 }); l1.position.set(0.5, 0.045, 0.5);
      const l2 = A.mesh('box', 0.05, 0x7a6a2a, { h: 0.045, d: 1.8 }); l2.position.set(0.5, 0.045, 0.5);
      const f = frame(A, 2, 2, col); f.position.set(0.5, 0.07, 0.5);
      g.add(plate, l1, l2, f); Q.plate = plate;
    }
    t.g = g; t.q = Q;
    A.add(g);
  }

  function drawAll(A, dt, time) {
    const S = A.S, cam = A.camera, G = A.grid;
    if (S.dep) S.dep.quaternion.copy(cam.quaternion);
    if (S.zone) S.zone.forEach((m) => (m.visible = S.mode === 'build'));
    // tapis roulants : les chevrons défilent (pendant la course) ; une case devenue trou ou mur disparaît
    if (beltTex) beltTex.offset.x = S.mode === 'run' && A.phase === 'play' ? -((S.rt * BELT_V) % 1) : beltTex.offset.x;
    if (S.belts) for (const b of S.belts) b.g.visible = G.at(b.x, b.z) === A.FLOOR;
    // curseurs
    for (const P of A.players) {
      const d = P.data, C = d.cur;
      if (!C) continue;
      const on = S.mode === 'build' && A.phase !== 'roundEnd' && d.left > 0;
      C.g.visible = on;
      if (C.lab) C.lab.visible = on;
      if (!on) continue;
      const x = Math.floor(d.cx), z = Math.floor(d.cz);
      C.g.position.x += (x + 0.5 - C.g.position.x) * Math.min(1, dt * 22);
      C.g.position.z += (z + 0.5 - C.g.position.z) * Math.min(1, dt * 22);
      C.g.position.y = 0.02 + Math.sin(time * 6 + P.i) * 0.02;
      if (C.type !== d.type) {
        C.type = d.type;
        if (C.lab) A.remove(C.lab);
        C.lab = A.label(`${TYPES[d.type].icon} ${TYPES[d.type].name}`, { size: 22, h: 0.3, color: P.css, border: P.css });
        A.add(C.lab);
      }
      C.lab.position.set(C.g.position.x, 1.0, C.g.position.z - 0.15);
      C.lab.quaternion.copy(cam.quaternion);
      const key = `${x},${z},${d.type},${S.version}`;
      if (C.key !== key) {
        C.key = key;
        const ok = !canPlace(A, d.type, x, z);
        if (ok !== C.valid) { C.valid = ok; const c = A.lin(ok ? P.color : 0xff2a2a); C.f.children.forEach((m) => m.material.color.copy(c)); }
      }
    }
    // pièges
    for (const t of S.traps) {
      const Q = t.q;
      if (!Q || !t.g) continue;
      if (t.type === 'mine') {
        t.g.visible = !(S.mode !== 'build' && t.hidden && !S.ended);
        if (Q.led) Q.led.visible = !t.armed ? Math.sin(time * 18) > 0 : Math.sin(time * 4 + t.id) > -0.2;
      } else if (t.type === 'laser') {
        const on = laserOn(S, t), soon = !on && laserOn(S, t, 0.35);
        Q.beam.visible = on || (soon && Math.sin(time * 40) > 0);
        Q.beam.material.opacity = on ? 0.95 : 0.4;
        Q.glow.visible = on;
      } else if (t.type === 'plaque') {
        const gone = t.state === 'gone';
        Q.plate.forEach((m) => { m.visible = !gone; });
        Q.pit.visible = gone;
        t.g.position.x = t.x + 0.5 + (t.state === 'crack' ? Math.sin(time * 70) * 0.04 : 0);
      } else if (t.type === 'vent') {
        Q.hub.rotation.x = time * 14;
        for (const s of Q.streaks) { const u = (s.userData.o + time * 3.3) % 4; s.position.set(-u, s.userData.y, s.userData.z); s.material.opacity = 0.55 * Math.min(1, u, 4 - u); }
      } else if (t.type === 'elec') {
        const on = elecOn(S, t), soon = !on && elecOn(S, t, 0.35);
        Q.plate.material.emissiveIntensity = on ? 1.2 + Math.sin(time * 50) * 0.4 : soon ? 0.25 : 0.04;
        if (on && Math.random() < dt * 10) A.burst(t.x + 0.5 + Math.random(), 0.1, t.z + 0.5 + Math.random(), 3, [0xffe14a, 0xffffff], 3);
      }
    }
  }
})();
