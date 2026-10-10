/* =====================================================================
   🧲 CHAOS MAGNÉTIQUE — attire, colle, envoie
   Le grand plateau du labo (25×19, version 1.4), au-dessus du vide :
   - un GRAND TROU au centre et deux trous plus petits (ouest, est) ;
   - des BORNES (12) pour se cacher des objets lancés ;
   - les bords : en partie protégés par des RAMBARDES (murets bas), en
     partie OUVERTS (liseré rouge = on peut tomber) ; coins arrondis ;
   - 4 PYLÔNES MAGNÉTIQUES au milieu des bords : régulièrement, l'un
     d'eux clignote ~1,6 s (flèche, anneau au sol, bourdonnement), puis
     pendant 3,6 s il ASPIRE vers lui les objets et les joueurs (entre
     toi et lui, il y a peut-être un trou…), puis DÉCHARGE : il renvoie
     ce qui s'est collé à lui ;
   - « LE LABO S'EFFONDRE ! » (1 min 15, 1 min 40, 2 min 05) : la couronne
     extérieure du plateau clignote en rouge, puis tombe case par case
     (le plateau rétrécit : les manches restent courtes).
   Règles (inchangées) :
   - A maintenu : ATTIRER (les objets et les joueurs devant toi ;
     un objet attiré se colle à toi) ;
   - B : REPOUSSER (lance l'objet tenu et projette ce qui est devant) ;
   - une jauge d'énergie empêche d'en abuser ;
   - caisses, boules métalliques et gros blocs (12) : un objet rapide
     renverse les joueurs ; tomber dans le vide coûte une vie ;
   - « Inversion de polarité ! » : A et B s'échangent pendant 8 s ;
   - les éliminés deviennent des fantômes qui lâchent une onde.
   3 vies : le dernier debout gagne (+3), +1 par chute provoquée.
   Au bout de 2 min 30 : ceux qui ont le plus de vies gagnent (+3).
   ===================================================================== */
(function () {
  const W = 25, D = 19, TIME = 150;   // 2 min 30 (avant : 3 min) : le plateau finit par s'effondrer
  const TAU = Math.PI * 2;
  const RAIL = 10, PYLON = 11;          // codes propres à ce jeu (solides) : rambarde, pylône
  /* ---------- La disposition : un quart du plateau, recopié en miroir ----------
     v vide · . sol · = rambarde · # borne · P pylône (le quart va de x 0 à 12 et de z 0 à 9) */
  const Q = [
    'vv.......===P',
    'v............',
    '.............',
    '.............',
    '....#....#...',
    '.............',
    '.............',
    '=......#...vv',
    '=..vvv....vvv',
    'P..vvv....vvv',
  ];
  const CODE = { v: 3, '.': 0, '=': RAIL, '#': 1, P: PYLON };
  function layout(x, z) { return CODE[Q[Math.min(z, D - 1 - z)][Math.min(x, W - 1 - x)]]; }
  // les pylônes (nord, sud, ouest, est) et leur réglage : portée (cases), alerte, durée, force
  const PYLONS = [[12, 0], [12, D - 1], [0, 9], [W - 1, 9]];
  const PY = { range: 10, warn: 1.6, on: 3.6, pull: 2.8, base: 1.2 };
  const KINDS = {
    crate: { m: 2, r: 0.42, fric: 3.2, color: 0xc98a3a, name: 'caisse' },
    ball:  { m: 1, r: 0.34, fric: 0.9, color: 0x9aa2ab, name: 'boule' },
    block: { m: 3.5, r: 0.5, fric: 5, color: 0x5f6870, name: 'bloc' },
  };
  // 12 emplacements d'objets, symétriques
  const SPOTS = [[6, 2], [W - 7, 2], [6, D - 3], [W - 7, D - 3], [12, 4], [12, D - 5], [8, 9], [W - 9, 9], [3, 6], [W - 4, 6], [3, D - 7], [W - 4, D - 7]];

  function objMesh(A, k) {
    if (A.headless) return null;
    const K = KINDS[k];
    let m;
    if (k === 'ball') m = A.mesh('ball', K.r, K.color, { metal: 0.85, rough: 0.2 });
    else if (k === 'crate') { m = A.mesh('box', K.r * 1.8, K.color, { rough: 0.7 }); const b = A.mesh('box', K.r * 1.85, 0x6a3a14, { h: 0.12 }); b.position.y = 0.1; m.add(b); }
    else m = A.mesh('box', K.r * 1.9, K.color, { metal: 0.6, rough: 0.4 });
    A.add(m);
    return m;
  }

  OT.Arena.register({
    id: 'magnet', name: 'Chaos magnétique', icon: '🧲', color: '#5ad1ff', theme: 'lab', music: 'labo',
    tagline: 'Attire les objets, colle-les, envoie-les sur les autres.',
    goal: 'Faire tomber les autres dans le vide et rester le dernier debout.',
    howto: [
      'Maintiens {a} pour ATTIRER : un objet attiré se colle à toi.',
      '{b} : REPOUSSER. Lance l\'objet tenu et projette ce qui est devant toi.',
      'Une jauge d\'énergie limite les pouvoirs. Cache-toi derrière les bornes !',
      'Inversion de polarité : {a} et {b} s\'échangent pendant 8 s.',
    ],
    danger: 'Le vide (trous, bords sans rambarde), les PYLÔNES (quand l\'un clignote, il va tout aspirer) et, à la fin, le bord qui s\'effondre !',
    win: 'Dernier debout : +3 points. Chaque chute provoquée : +1.',
    lose: 'Trois chutes et tu deviens un fantôme (tu peux encore lâcher des ondes).',
    tuto: ['Déplace-toi : {move}', '{a} (maintenu) : attirer', '{b} : repousser / lancer'],
    rules: [
      'A maintenu : ATTIRER. Un objet attiré se colle à toi. Les joueurs aussi se font tirer !',
      'B : REPOUSSER. Lance l\'objet tenu, et projette tout ce qui est devant toi.',
      'Tomber dans le vide coûte une vie (3 vies). Une jauge d\'énergie limite les pouvoirs.',
      'Quand un pylône clignote, il va tout aspirer vers lui : éloigne-toi des trous ! Les rambardes protègent une partie des bords.',
      'Toutes les 25 s : « Inversion de polarité ! » A et B s\'échangent pendant 8 s.',
      'À 1 min 15, 1 min 40 et 2 min 05 : le labo s\'effondre ! Le bord du plateau clignote puis tombe.',
    ],
    controls: { a: 'Attirer (maintenu)', b: 'Repousser / lancer' },
    rounds: 1, scoreName: 'points', maxRound: TIME + 5,
    view: () => ({ x0: -0.5, z0: -0.5, x1: W + 0.5, z1: D + 0.5 }),
    tilt: 31,
    camMin: 0.66,          // la caméra suit l'action sans montrer moins que cette part du plateau
    knockDrag: 2.6,        // grand plateau : les chocs portent un peu plus loin qu'avant (3,4)
    botCompensate: true,   // les bots poussent contre l'aspiration des pylônes (chemins et « aller vers »)

    round(A) {
      const S = A.S;
      A.buildGrid(W, D, layout, 'lab', { outside: A.VOID, solid: [RAIL, PYLON] });
      S.objs = []; S.inv = false; S.invT = 25; S.respawn = [];
      // les pylônes : au repos, puis alerte, puis ils aspirent (jamais deux fois de suite le même)
      S.py = { st: 'idle', t: 13, k: -1, n: 0, hum: 0, crack: 0, told: false };
      // l'effondrement : trois vagues (la couronne extérieure, puis la suivante, puis encore la suivante)
      S.cr = { list: [], warn: new Set(), waves: [75, 100, 125], wi: 0, dirty: true };
      const kinds = ['crate', 'crate', 'crate', 'crate', 'ball', 'ball', 'ball', 'ball', 'ball', 'block', 'block', 'block'];
      const spots = A.shuffle(SPOTS);
      kinds.forEach((k, i) => addObj(A, k, spots[i][0] + 0.5, spots[i][1] + 0.5));
      const ps = [[2, 2], [W - 3, D - 3], [W - 3, 2], [2, D - 3]];
      A.players.forEach((P, i) => {
        A.place(P, ps[i][0] + 0.5, ps[i][1] + 0.5);
        P.speed = 4.4; P.r = 0.32;
        P.data = { lives: 3, energy: 1, held: null, cool: 0, pulls: 0, throws: 0, hitBy: 0, pulling: false, waveCool: 3 };
      });
      if (!A.headless) buildDecor(A);
    },

    bodies: true,
    speedMod(A, P) { const h = P.data.held; return h ? (h.kind === 'block' ? 0.6 : 0.8) : 1; },
    safe(A, P) { return false; },
    // l'aspiration du pylône allumé (pour les joueurs : ajoutée à leur déplacement par le moteur)
    drift(A, P) { return A.phase === 'play' ? pyPull(A, P.x, P.z, P) : null; },

    onFall(A, P) { loseLife(A, P, 'fall'); },
    onKill(A, P) { loseLife(A, P, 'hit'); },

    update(A, dt) {
      const S = A.S;
      // inversion de polarité
      S.invT -= dt;
      if (S.invT <= 0) {
        S.inv = !S.inv; S.invT = S.inv ? 8 : 25;
        A.banner(S.inv ? 'Inversion de polarité !' : 'Polarité normale', S.inv ? 'A repousse, B attire' : 'A attire, B repousse', '#5ad1ff', 1.8);
        A.sfx(S.inv ? 'warn' : 'ok');
      }
      // les pylônes magnétiques
      pyUpdate(A, dt);
      // le labo s'effondre
      crumbleUpdate(A, dt);
      // retours en jeu
      for (const r of S.respawn) {
        r.t -= dt;
        if (r.t <= 0 && !r.done) {
          r.done = true;
          const P = A.players[r.i];
          const c = safeSpot(A);
          A.revive(P, c[0], c[1], 1.6);
          P.data.energy = 1;
        }
      }
      S.respawn = S.respawn.filter((r) => !r.done);
      const live = A.alive();
      for (const P of A.players) {
        const d = P.data;
        if (P.ghost) { ghost(A, P, dt); continue; }
        if (!P.alive || P.out) { if (d.held) { d.held.holder = null; d.held = null; } continue; }
        d.cool = Math.max(0, d.cool - dt);
        const pullBtn = S.inv ? P.in.b : P.in.a;
        const pushBtn = S.inv ? P.in.aP : P.in.bP;
        d.pulling = pullBtn && d.energy > 0.02 && P.stun <= 0;
        if (d.pulling) {
          d.energy = Math.max(0, d.energy - dt * 0.32);
          pull(A, P, dt);
        } else d.energy = Math.min(1, d.energy + dt * 0.24);
        if (pushBtn && d.cool <= 0 && P.stun <= 0) {
          if (d.energy >= 0.22 || d.held) { push(A, P); d.energy = Math.max(0, d.energy - 0.28); d.cool = 0.45; }
          else { A.say(P.x, P.z, 'Plus d\'énergie !', '#5ad1ff', 22); d.cool = 0.4; }
        }
        // l'objet tenu suit devant soi
        if (d.held) {
          const o = d.held;
          o.x = P.x + Math.sin(P.face) * (0.55 + o.K.r); o.z = P.z + Math.cos(P.face) * (0.55 + o.K.r);
          o.vx = P.vx; o.vz = P.vz;
          if (P.stun > 0) { o.holder = null; d.held = null; }
        }
        d.armL = d.pulling || d.held ? -1.5 : undefined; d.armR = d.armL;
        if (d.armL === undefined) { delete d.armL; delete d.armR; }
      }
      // les objets
      for (const o of S.objs) {
        if (o.falling) { o.fy -= dt * (6 + o.ft * 12); o.ft += dt; if (o.ft > 1.4) { o.falling = false; o.t = 2.5; o.gone = true; } continue; }
        if (o.gone) { o.t -= dt; if (o.t <= 0) { const c = safeSpot(A); o.x = c[0]; o.z = c[1]; o.vx = o.vz = 0; o.gone = false; o.drop = 1; o.thrower = null; } continue; }
        if (o.drop > 0) o.drop = Math.max(0, o.drop - dt * 2);
        if (o.holder) continue;
        const nx = o.x + o.vx * dt, nz = o.z + o.vz * dt;
        if (A.grid.solid(Math.floor(nx), Math.floor(o.z))) { o.vx *= -0.6; } else o.x = nx;
        if (A.grid.solid(Math.floor(o.x), Math.floor(nz))) { o.vz *= -0.6; } else o.z = nz;
        const fr = Math.exp(-o.K.fric * dt);
        o.vx *= fr; o.vz *= fr;
        const sp = Math.hypot(o.vx, o.vz);
        if (sp < 0.05) { o.vx = o.vz = 0; }
        if (sp < 2) o.thrower = sp < 0.6 ? null : o.thrower;
        // dans le vide
        if (A.grid.at(Math.floor(o.x), Math.floor(o.z)) === A.VOID) { o.falling = true; o.ft = 0; o.fy = 0; A.sfx('whoosh'); continue; }
        // choc avec un joueur
        if (sp > 3) for (const P of live) {
          if (P === o.thrower && sp < 9) continue;
          if (P.data.held === o) continue;
          const dd = Math.hypot(P.x - o.x, P.z - o.z);
          if (dd < P.r + o.K.r) {
            // un objet LANCÉ assomme ; un objet qui glisse tout seul (aspiré par un pylône, décharge) bouscule seulement
            const pow = Math.min(14, sp * (0.55 + o.K.m * 0.18)) * (o.thrower ? 1 : 0.6);
            if (A.knock(P, o.vx / sp + (P.x - o.x) * 0.3, o.vz / sp + (P.z - o.z) * 0.3, pow, o.thrower ? 0.45 : 0, o.thrower || null)) {
              A.sfx('hit'); A.shake(0.2); A.burst(P.x, 0.6, P.z, 10, [0xffffff, o.K.color], 5);
              if (o.thrower) { A.stat(o.thrower.i, 'hits', 1); }
              if (P.data.held) { P.data.held.holder = null; P.data.held = null; }
            }
            o.vx *= 0.35; o.vz *= 0.35;
          }
        }
      }
      // les objets se cognent entre eux
      for (let i = 0; i < S.objs.length; i++) for (let j = i + 1; j < S.objs.length; j++) {
        const a = S.objs[i], b = S.objs[j];
        if (a.gone || b.gone || a.falling || b.falling || a.holder || b.holder) continue;
        const dx = b.x - a.x, dz = b.z - a.z, dd = Math.hypot(dx, dz), m = a.K.r + b.K.r;
        if (dd > 0 && dd < m) {
          const nx = dx / dd, nz = dz / dd, push = (m - dd) / 2;
          a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
          const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
          if (rv < 0) { const j2 = -1.6 * rv / (1 / a.K.m + 1 / b.K.m); a.vx -= j2 * nx / a.K.m; a.vz -= j2 * nz / a.K.m; b.vx += j2 * nx / b.K.m; b.vz += j2 * nz / b.K.m; if (Math.abs(rv) > 3) A.sfx('land'); }
        }
      }
      // fin : un seul survivant, ou le temps
      const standing = A.players.filter((P) => P.data.lives > 0);
      if (standing.length <= 1 && !S.ended) {
        S.ended = true; S.py.st = 'idle'; S.py.t = 99;
        const w = standing[0];
        if (w) A.point(w.i, 3);
        A.endRound({ winners: w ? [w.i] : [], text: w ? `${w.name} reste debout !` : 'Personne !', sub: w ? '+3 points' : '', color: w ? w.css : '#5ad1ff' });
      } else if (A.t >= TIME && !S.ended) {
        S.ended = true; S.py.st = 'idle'; S.py.t = 99;
        const best = Math.max(...standing.map((P) => P.data.lives));
        const w = standing.filter((P) => P.data.lives === best);
        w.forEach((P) => A.point(P.i, 3));
        A.endRound({ winners: w.map((P) => P.i), text: 'Temps écoulé !', sub: w.map((p) => p.name).join(', ') + ' +3', color: w[0].css });
      }
    },

    draw(A, dt, time) {
      const S = A.S;
      for (const o of S.objs) if (o.mesh) {
        o.mesh.visible = !o.gone;
        const y = o.falling ? o.fy : (o.drop > 0 ? o.drop * 4 : 0);
        o.mesh.position.set(o.x, o.K.r + y + (o.holder ? 0.35 : 0), o.z);
        if (o.kind === 'ball') { o.mesh.rotation.x += o.vz * dt / o.K.r; o.mesh.rotation.z -= o.vx * dt / o.K.r; }
        else if (o.holder) o.mesh.rotation.y = o.holder.face;
        // l'objet lancé brille à la couleur du lanceur
        if (o.mesh.material.emissive) o.mesh.material.emissive.set(o.thrower && Math.hypot(o.vx, o.vz) > 3 ? A.lin(o.thrower.color) : 0x000000);
      }
      if (S.beams) S.beams.forEach((c, k) => {
        const P = A.players[k];
        c.visible = !!(P && P.alive && !P.out && P.data.pulling);
        if (c.visible) { c.position.set(P.x + Math.sin(P.face) * 3, 0.6, P.z + Math.cos(P.face) * 3); c.rotation.set(-Math.PI / 2, P.face, 0, 'YXZ'); c.material.opacity = 0.12 + Math.sin(time * 20) * 0.05; }
      });
      drawDecor(A, dt, time);
    },

    // flèche sur le pylône qui va s'allumer (ou qui aspire)
    goals(A) {
      const Y = A.S.py;
      if (!Y || Y.st === 'idle' || Y.k < 0) return [];
      const [px, pz] = PYLONS[Y.k];
      return [{ x: px + 0.5, z: pz + 0.5, color: 0x5ad1ff, label: Y.st === 'warn' ? 'PYLÔNE !' : 'AIMANT !', y: 1.4 }];
    },

    hud(A) {
      const S = A.S, Y = S.py;
      return {
        timer: TIME - A.t,
        note: S.cr && S.cr.warn.size ? '💥 Le bord s\'effondre : vers le centre !' : Y && Y.st === 'warn' ? '⚡ Un pylône va s\'allumer : loin des trous !' : Y && Y.st === 'on' ? '🧲 Le pylône aspire tout !' : S.inv ? '🔄 Polarité inversée : A repousse, B attire' : '',
        rows: A.players.map((P) => ({ i: P.i, txt: P.ghost ? '👻' : `${'♥'.repeat(Math.max(0, P.data.lives))} ⚡${Math.round(P.data.energy * 100)}%` })),
      };
    },
    rush(A) { return A.S.inv ? 1.15 : 1; },
    stats(A, P) { const d = A.stats[P.i]; return [`${d.kills || 0} chute${(d.kills || 0) > 1 ? 's' : ''} provoquée${(d.kills || 0) > 1 ? 's' : ''}`, `${d.hits || 0} objets dans le mille`, `${d.throws || 0} lancers`, `${P.data.lives} vie${P.data.lives > 1 ? 's' : ''} restante${P.data.lives > 1 ? 's' : ''}`]; },
    bonus(A, P) { return (A.stats[P.i].hits || 0) >= 4 ? ['Tireur d\'élite'] : []; },
    tiebreak(A, i) { return A.players[i].data.lives * 10 + (A.stats[i].kills || 0); },

    /* ---------- LE BOT ---------- */
    bot(A, P, B, L) {
      const out = botMain(A, P, B, L) || {};
      // pylône allumé : pour les ordres « directs » (viser, tirer), on pousse aussi contre l'aspiration
      // (les chemins et les « aller vers » sont compensés par le moteur : botCompensate)
      const e = !P.ghost && P.alive && !P.out ? pyPull(A, P.x, P.z, P) : null;
      if (e && !out.path && !out.go) {
        const sp = speedOf(A, P);
        out.mx = (out.mx || 0) - e.x / sp; out.mz = (out.mz || 0) - e.z / sp;
        const n = Math.hypot(out.mx, out.mz); if (n > 1) { out.mx /= n; out.mz /= n; }
      }
      return out;
    },
    // garde-fou à chaque pas : où serai-je dans un instant (joystick + aspiration + poussée) ? Pas dans le vide !
    botGuard(A, P, mx, mz, L, C) {
      if (P.ghost) return [mx, mz];
      const e = pyPull(A, P.x, P.z, P);
      if (!e && Math.random() < L.mistake * 0.02) return [mx, mz];
      // (les bons bots sentent aussi la poussée qu'ils subissent ; les autres beaucoup moins)
      const sp = speedOf(A, P), n = e ? 5 : 2, h = 0.08, kk = 0.5 * L.skill * L.skill;
      let x = P.x, z = P.z;
      for (let s = 1; s <= n; s++) {
        x += (mx * sp + (e ? e.x : 0) + P.kx * kk) * h; z += (mz * sp + (e ? e.z : 0) + P.kz * kk) * h;
        if (voidNear(A, x, z, 0.22)) { const m = Math.hypot(mx, mz) || 1; return bestDir(A, P, [mx / m, mz / m]) || [mx, mz]; }
      }
      return [mx, mz];
    },
  });

  function diffA(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
  const speedOf = (A, P) => Math.max(0.5, P.speed * 1.25 * P.slow * (P.data.held ? (P.data.held.kind === 'block' ? 0.6 : 0.8) : 1));

  /* ---------- Les pylônes magnétiques ----------
     au repos (10 à 13 s) → ALERTE 1,6 s (il clignote, bourdonne, flèche + anneau au sol) →
     il ASPIRE 3,6 s : objets et joueurs à moins de 10 cases glissent vers lui →
     DÉCHARGE : il renvoie tout ce qui s'est collé à lui. */
  function pyPull(A, x, z, P) {
    const Y = A.S.py;
    if (!Y || Y.st !== 'on') return null;
    if (P && (P.ghost || !P.alive || P.out || P.h > 0.3)) return null;
    const [px, pz] = PYLONS[Y.k];
    const dx = px + 0.5 - x, dz = pz + 0.5 - z, d = Math.hypot(dx, dz);
    if (d > PY.range || d < 0.7) return null;
    const s = PY.base + PY.pull * (1 - d / PY.range);
    return { x: dx / d * s, z: dz / d * s };
  }
  function pyUpdate(A, dt) {
    const S = A.S, Y = S.py;
    if (S.ended) return;
    Y.t -= dt;
    if (Y.st === 'idle') {
      if (Y.t > 0) return;
      let k; do { k = A.rint(0, PYLONS.length - 1); } while (k === Y.k);
      Y.k = k; Y.st = 'warn'; Y.t = PY.warn; Y.n++; Y.hum = 0;
      if (!Y.told) { Y.told = true; A.banner('⚡ Pylône magnétique !', 'Quand il clignote, il va tout aspirer : loin des trous !', '#5ad1ff', 2.2); }
      A.sfx('warn');                         // (la flèche « PYLÔNE ! » le montre : voir goals)
      return;
    }
    const [px, pz] = PYLONS[Y.k];
    if (Y.st === 'warn') {
      // bourdonnement qui monte
      Y.hum -= dt;
      if (Y.hum <= 0) { Y.hum = 0.22; const f = 180 + (1 - Y.t / PY.warn) * 260; A.tone('sawtooth', f, f * 1.05, 0.2, 0.05); }
      // les humains à portée : « Derrière ! », « À droite ! »…
      for (const P of A.alive()) if (Math.hypot(P.x - px - 0.5, P.z - pz - 0.5) < PY.range) A.warn(P, px + 0.5, pz + 0.5);
      if (Y.t <= 0) { Y.st = 'on'; Y.t = PY.on; A.sfx('zap'); A.shake(0.25); A.wave(px + 0.5, pz + 0.5, 0x5ad1ff, 4, 0.6); }
      return;
    }
    // il aspire les objets (les joueurs : voir drift)
    for (const o of S.objs) {
      if (o.holder || o.gone || o.falling) continue;
      const dx = px + 0.5 - o.x, dz = pz + 0.5 - o.z, d = Math.hypot(dx, dz);
      if (d > PY.range + 1 || d < 0.05) continue;
      const f = 18 / o.K.m * (1 - d / (PY.range + 1) * 0.5);
      o.vx += dx / d * f * dt; o.vz += dz / d * f * dt;
      const sp = Math.hypot(o.vx, o.vz), mx = 6.5;
      if (sp > mx) { o.vx *= mx / sp; o.vz *= mx / sp; }
      if (d < 1.4) { const fr = Math.exp(-6 * dt); o.vx *= fr; o.vz *= fr; }   // collé au pylône
    }
    Y.crack -= dt;
    if (Y.crack <= 0) { Y.crack = 0.18 + Math.random() * 0.2; A.noise(0.06, 0.12, 3000); }
    if (Y.t <= 0) { Y.st = 'idle'; Y.t = A.rand(10, 13); discharge(A, px + 0.5, pz + 0.5); }
  }

  // fin de l'aspiration : DÉCHARGE ! Le pylône renvoie ce qui s'est collé à lui (objets, joueurs trop près)
  function discharge(A, x, z) {
    A.sfx('boom'); A.shake(0.3); A.wave(x, z, 0x9ff0ff, 3.5, 0.5);
    A.burst(x, 1.5, z, 24, [0x9ff0ff, 0xffffff, 0x5ad1ff], 7, { up: 2 });
    A.say(x, z, '💥 Décharge !', '#9ff0ff', 30);
    for (const o of A.S.objs) {
      if (o.holder || o.gone || o.falling) continue;
      const dx = o.x - x, dz = o.z - z, d = Math.hypot(dx, dz);
      if (d > 3.6 || d < 0.01) continue;
      const v = (10 - d * 1.5) / Math.pow(o.K.m, 0.4);
      o.vx = dx / d * v + (Math.random() - 0.5) * 2; o.vz = dz / d * v + (Math.random() - 0.5) * 2; o.thrower = null;
    }
    for (const P of A.alive()) {
      if (P.ghost) continue;
      const d = Math.hypot(P.x - x, P.z - z);
      if (d < 2.8) A.knock(P, P.x - x, P.z - z, 7.5 - d * 1.5, 0.2, null);
    }
  }

  /* ---------- « Le labo s'effondre ! » ----------
     Chaque vague prend une couronne du plateau (la plus à l'extérieur d'abord) : les cases
     clignotent 1,8 s puis tombent, l'une après l'autre, en ~6 s. Les pylônes restent debout. */
  function crumbleUpdate(A, dt) {
    const S = A.S, C = S.cr;
    if (S.ended) return;
    if (C.wi < C.waves.length && A.t >= C.waves[C.wi]) {
      const ring = C.wi; C.wi++;
      const cells = [];
      for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
        const v = A.grid.at(x, z);
        if ((v === 0 || v === RAIL) && Math.min(x, W - 1 - x, z, D - 1 - z) === ring) cells.push([x, z]);
      }
      A.shuffle(cells).forEach(([x, z], i, all) => C.list.push({ x, z, fall: A.t + 2 + i * 6 / all.length, warned: false }));
      if (ring === 0) { A.announce('sudden'); A.banner('💥 Le labo s\'effondre !', 'Le bord du plateau va tomber : vers le centre !', '#ff5a5a', 2.4); }
      else A.banner('💥 Ça s\'effondre encore !', 'Le plateau rétrécit…', '#ff5a5a', 2);
      A.sfx('boom'); A.shake(0.5); A.hype(1.2);
    }
    for (const c of C.list) {
      const key = c.z * W + c.x;
      if (!c.warned && A.t >= c.fall - 1.8) { c.warned = true; C.warn.add(key); C.dirty = true; }
      if (A.t < c.fall) continue;
      c.done = true; C.warn.delete(key); C.dirty = true;
      if (A.grid.at(c.x, c.z) === RAIL && S.decor) hideRail(S.decor, key);
      A.setCell(c.x, c.z, A.VOID);
      A.burst(c.x + 0.5, 0, c.z + 0.5, 6, [0xcfe6e4, 0x7fb1ad, 0x5f8f8c], 3, { up: 1 });
      if (Math.random() < 0.3) A.sfx('small');
    }
    C.list = C.list.filter((c) => !c.done);
  }

  /* ---------- Les bots : le vide, les pylônes ---------- */
  // du vide… ou une case qui va s'effondrer (pour les bots, c'est pareil)
  function isVoid(A, x, z) { return A.grid.at(x, z) === A.VOID || (A.S.cr && A.S.cr.warn.has(z * W + x)); }
  function voidNear(A, x, z, m) {
    const f = Math.floor;
    return isVoid(A, f(x), f(z)) || isVoid(A, f(x - m), f(z - m)) || isVoid(A, f(x + m), f(z - m)) || isVoid(A, f(x - m), f(z + m)) || isVoid(A, f(x + m), f(z + m));
  }
  // distance au vide le plus proche (les rambardes et bornes arrêtent la recherche : derrière, on est protégé)
  function edgeAt(A, x, z) {
    let m = 9;
    for (let a = 0; a < 8; a++) {
      const dx = Math.sin(a * Math.PI / 4), dz = Math.cos(a * Math.PI / 4);
      for (let k = 0.4; k < 4; k += 0.4) {
        if (isVoid(A, Math.floor(x + dx * k), Math.floor(z + dz * k))) { m = Math.min(m, k); break; }
        if (A.grid.solid(Math.floor(x + dx * k), Math.floor(z + dz * k))) break;
      }
    }
    return m;
  }
  function edge(A, P) { return edgeAt(A, P.x, P.z); }
  // la meilleure direction pour ne pas tomber : on simule ~0,9 s (joystick + aspiration) dans 16 directions
  function bestDir(A, P, prefer) {
    const sp = speedOf(A, P);
    let best = null, bs = -1e9;
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * TAU, jx = Math.sin(a), jz = Math.cos(a);
      let x = P.x, z = P.z, ok = 0;
      for (let s = 1; s <= 6; s++) {
        const e = pyPull(A, x, z) || { x: 0, z: 0 };
        const nx = x + (jx * sp + e.x) * 0.15, nz = z + (jz * sp + e.z) * 0.15;
        if (A.grid.solid(Math.floor(nx), Math.floor(nz))) { ok += 1.5; break; }   // contre un mur : on ne tombe pas
        x = nx; z = nz;
        if (voidNear(A, x, z, 0.3)) break;
        ok++;
      }
      const score = ok * 10 + Math.min(4, edgeAt(A, x, z)) * 2 + (prefer ? (jx * prefer[0] + jz * prefer[1]) * 3 : 0);
      if (score > bs) { bs = score; best = [jx, jz]; }
    }
    return best;
  }
  function botMain(A, P, B, L) {
    const S = A.S, d = P.data;
    if (P.ghost) {
      const T = A.Bot.target(P, L);
      if (!T) return {};
      const o = A.Bot.dir(P, T.x, T.z);
      if (A.dist(P, T) < 1.4 && d.waveCool <= 0) o.tapA = true;
      return o;
    }
    if (!P.alive || P.out) return {};
    const pull = (on) => (S.inv ? { b: on } : { a: on });
    const push = () => (S.inv ? { tapA: true } : { tapB: true });
    const out = {};
    // un pylône va aspirer (ou aspire) et il y a du vide entre lui et moi : je m'écarte de la ligne
    const Y = S.py;
    if (Y && Y.k >= 0 && (Y.st === 'on' || (Y.st === 'warn' && Y.t < 1.3 + L.skill * 0.3))) {
      const [px, pz] = PYLONS[Y.k];
      const dx = px + 0.5 - P.x, dz = pz + 0.5 - P.z, dd = Math.hypot(dx, dz);
      if (dd < PY.range + 0.5) {
        let risk = false;
        for (let k = 0.4; k < Math.min(3.8, dd - 0.8); k += 0.35) if (isVoid(A, Math.floor(P.x + dx / dd * k), Math.floor(P.z + dz / dd * k))) { risk = true; break; }
        if (risk && Math.random() > L.mistake * 0.5) { const b = bestDir(A, P, [-dx / dd, -dz / dd]); if (b) return { mx: b[0], mz: b[1] }; }
      }
    }
    // esquiver un objet qui fonce sur moi
    for (const o of S.objs) {
      if (o.holder || o.gone) continue;
      const sp = Math.hypot(o.vx, o.vz);
      if (sp < 4 || o.thrower === P) continue;
      const rx = P.x - o.x, rz = P.z - o.z;
      const along = (rx * o.vx + rz * o.vz) / sp;
      if (along <= 0) continue;
      const perp = Math.abs(rx * o.vz - rz * o.vx) / sp;
      if (perp < 0.9 && along / sp < 0.6 && Math.random() < 0.3 + L.skill * 0.7) {
        const sx = -o.vz / sp, sz = o.vx / sp, s = (rx * sx + rz * sz) >= 0 ? 1 : -1;
        return { mx: sx * s, mz: sz * s };
      }
    }
    const enemies = A.others(P);
    // je tiens un objet : je vise
    if (d.held) {
      // de préférence quelqu'un de proche… et près du vide
      const T = enemies.sort((a, b) => (A.dist(a, P) + edge(A, a) * 1.5) - (A.dist(b, P) + edge(A, b) * 1.5))[0];
      if (!T) return {};
      const ang = Math.atan2(T.x - P.x, T.z - P.z);
      const err = Math.abs(diffA(P.face, ang));
      const o = Object.assign(out, { mx: Math.sin(ang) * 0.35, mz: Math.cos(ang) * 0.35 });
      if (A.dist(T, P) < 7.5 && err < 0.16 + L.aim) Object.assign(o, push());
      // trop loin : on se rapproche (en passant par le sol)
      if (A.dist(T, P) > 8) return goSafe(A, P, T.x, T.z);
      return o;
    }
    // un adversaire près du vide, à portée : on le repousse
    const T = enemies.filter((O) => A.dist(O, P) < 3.2 && edge(A, O) < 2.8).sort((a, b) => edge(A, a) - edge(A, b))[0];
    if (T && d.energy > 0.3 && Math.random() < 0.35 + L.aggro * 0.6) {
      const ang = Math.atan2(T.x - P.x, T.z - P.z);
      const o = { mx: Math.sin(ang) * 0.3, mz: Math.cos(ang) * 0.3 };
      if (Math.abs(diffA(P.face, ang)) < 0.35 + L.aim) Object.assign(o, push());
      return o;
    }
    // aller chercher un objet et l'attirer
    const free = S.objs.filter((o) => !o.holder && !o.gone && !o.falling && Math.hypot(o.vx, o.vz) < 3);
    const tgt = A.Bot.nearest(P, free, (o) => (o.kind === 'block' ? 1.3 : 1));
    if (tgt && d.energy > 0.35) {
      const o = tgt.o, ang = Math.atan2(o.x - P.x, o.z - P.z);
      if (tgt.d < 5.5) {
        const face = Math.abs(diffA(P.face, ang)) < 0.4;
        return Object.assign({ mx: Math.sin(ang) * (face ? 0.15 : 0.6), mz: Math.cos(ang) * (face ? 0.15 : 0.6) }, face ? pull(true) : {});
      }
      return goSafe(A, P, o.x, o.z);
    }
    // sinon : se placer loin des bords, pas trop près des autres
    return goSafe(A, P, W / 2 + (P.i % 2 ? 5.5 : -5.5), D / 2 + (P.i < 2 ? -4 : 4));
  }
  function goSafe(A, P, x, z) {
    const [cx, cz] = A.Bot.cell(P);
    const tx = Math.floor(x), tz = Math.floor(z);
    const path = A.Bot.bfs(cx, cz, (gx, gz) => gx === tx && gz === tz, (gx, gz) => A.grid.at(gx, gz) === 0 && !A.S.cr.warn.has(gz * W + gx), 700);
    return path && path.length > 1 ? A.Bot.follow(P, path) : A.Bot.toward(P, x, z, 0.2);
  }
  function addObj(A, kind, x, z) {
    const o = { kind, K: KINDS[kind], x, z, vx: 0, vz: 0, holder: null, thrower: null, gone: false, falling: false, drop: 0, t: 0, mesh: objMesh(A, kind) };
    A.S.objs.push(o);
    return o;
  }
  // une case sûre pour réapparaître : du sol, pas collée au vide, loin des autres
  function safeSpot(A) {
    for (let n = 0; n < 80; n++) {
      const x = A.rint(2, W - 3), z = A.rint(2, D - 3);
      if (A.grid.at(x, z) !== 0 || A.S.cr.warn.has(z * W + x)) continue;
      if (voidNear(A, x + 0.5, z + 0.5, 1.1)) continue;
      if (A.alive().some((P) => Math.hypot(P.x - x - 0.5, P.z - z - 0.5) < 1.5)) continue;
      return [x + 0.5, z + 0.5];
    }
    return [6.5, 6.5];
  }
  function inCone(P, x, z, range, half) {
    const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz);
    if (d > range || d < 0.05) return false;
    return Math.abs(diffA(Math.atan2(dx, dz), P.face)) < half;
  }
  function pull(A, P, dt) {
    const S = A.S, d = P.data;
    if (d.held) return;
    for (const o of S.objs) {
      if (o.holder || o.gone || o.falling || !inCone(P, o.x, o.z, 6.5, 0.6)) continue;
      const dx = P.x - o.x, dz = P.z - o.z, dd = Math.hypot(dx, dz);
      if (dd < 0.55 + o.K.r + 0.2) { o.holder = P; d.held = o; o.thrower = null; d.pulls++; A.sfx('tick'); A.rumble(P, 0.3, 0.2, 80); break; }
      const f = 22 / o.K.m;
      o.vx += (dx / dd) * f * dt; o.vz += (dz / dd) * f * dt;
      const sp = Math.hypot(o.vx, o.vz), mx = 7.5;
      if (sp > mx) { o.vx *= mx / sp; o.vz *= mx / sp; }
    }
    for (const O of A.others(P)) {
      if (!inCone(P, O.x, O.z, 5.5, 0.5)) continue;
      const dx = P.x - O.x, dz = P.z - O.z, dd = Math.hypot(dx, dz);
      if (dd < 1) continue;
      O.kx += (dx / dd) * 9 * dt; O.kz += (dz / dd) * 9 * dt;
      O.lastHit = { by: P, t: A.clock };
    }
  }
  function push(A, P) {
    const S = A.S, d = P.data;
    A.sfx('push'); A.burst(P.x + Math.sin(P.face) * 0.8, 0.6, P.z + Math.cos(P.face) * 0.8, 14, [0x5ad1ff, 0xffffff, P.color], 6, { flat: true });
    if (d.held) {
      const o = d.held; d.held = null; o.holder = null;
      const v = 16 / Math.pow(o.K.m, 0.35);
      o.vx = Math.sin(P.face) * v; o.vz = Math.cos(P.face) * v; o.thrower = P;
      o.x = P.x + Math.sin(P.face) * (0.6 + o.K.r); o.z = P.z + Math.cos(P.face) * (0.6 + o.K.r);
      A.stat(P.i, 'throws', 1);
      return;
    }
    for (const o of S.objs) {
      if (o.holder || o.gone || o.falling || !inCone(P, o.x, o.z, 4.5, 0.75)) continue;
      const dx = o.x - P.x, dz = o.z - P.z, dd = Math.hypot(dx, dz) || 1;
      const v = (14 - dd * 1.5) / Math.pow(o.K.m, 0.5);
      o.vx += (dx / dd) * v; o.vz += (dz / dd) * v; o.thrower = P;
    }
    for (const O of A.others(P)) {
      if (!inCone(P, O.x, O.z, 3.6, 0.75)) continue;
      const dd = A.dist(O, P);
      A.knock(O, O.x - P.x, O.z - P.z, 9 - dd * 1.4, 0.2, P);
      if (O.data.held) { O.data.held.holder = null; O.data.held = null; }
    }
  }
  function loseLife(A, P, why) {
    const S = A.S, d = P.data;
    d.lives--;
    const by = P.lastHit && A.clock - P.lastHit.t < 3 && P.lastHit.by !== P ? P.lastHit.by : null;
    if (by) { A.point(by.i, 1); A.say(P.x, P.z, `+1 ${by.name}`, by.css, 26); }
    if (d.held) { d.held.holder = null; d.held = null; }
    if (d.lives > 0) { P.out = false; S.respawn.push({ i: P.i, t: 1.4 }); A.say(P.x, P.z, `${'♥'.repeat(d.lives)}`, '#ff5a5a', 30); }
    else {
      P.out = true;
      A.banner(`${P.name} est éliminé !`, 'Il devient un fantôme…', P.css, 1.6);
      P.data.toGhost = 1.2;
    }
  }
  function ghost(A, P, dt) {
    const d = P.data;
    P.x = A.clamp(P.x, 0.5, W - 0.5); P.z = A.clamp(P.z, 0.5, D - 0.5);
    d.waveCool = Math.max(0, d.waveCool - dt);
    if (P.in.aP && d.waveCool <= 0) {
      d.waveCool = 6;
      A.sfx('zap'); A.burst(P.x, 0.5, P.z, 20, [0xffffff, 0xbfe6ff], 5, { flat: true });
      for (const O of A.alive()) { const dd = A.dist(O, P); if (dd < 1.8) A.knock(O, O.x - P.x + 0.01, O.z - P.z, 6.5 - dd * 1.5, 0.15, P); }
    }
  }

  /* ==================================================================
     LE DÉCOR (seulement avec rendu) : socle du plateau, rambardes,
     liseré rouge des bords dangereux, bornes, pylônes (anneau de portée,
     ondes qui se resserrent, éclairs vers ce qu'ils aspirent).
     Maillages « instanciés » pour les rambardes et le liseré.
     ================================================================== */
  function buildDecor(A) {
    const S = A.S;
    const dec = S.decor = { py: [], beams: [], ripples: [], range: null };
    // le plateau flotte au-dessus d'un gouffre
    const under = A.mesh('box', 1, 0x0a1518, { h: 2 }); under.scale.set(W - 0.2, 1, D - 0.2); under.position.set(W / 2, -1.6, D / 2); A.add(under);
    S.beams = A.players.map((P) => { const c = new THREE.Mesh(new THREE.ConeGeometry(1.8, 6, 20, 1, true), new THREE.MeshBasicMaterial({ color: A.lin(P.color), transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })); c.rotation.x = Math.PI / 2; c.visible = false; A.add(c); return c; });
    const dm = new THREE.Object3D();
    // ----- les rambardes : muret + barre jaune -----
    const rails = [];
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (A.grid.at(x, z) === RAIL) rails.push([x, z]);
    const rBase = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.32, 0.42), new THREE.MeshStandardMaterial({ color: A.lin(0x5f8f8c), roughness: 0.6, metalness: 0.3 }), rails.length);
    const rBar = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.09, 0.09), new THREE.MeshStandardMaterial({ color: A.lin(0xffcc33), roughness: 0.4, metalness: 0.5 }), rails.length);
    const rPost = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.3, 0.07), new THREE.MeshStandardMaterial({ color: A.lin(0x9fd9d6), metalness: 0.6 }), rails.length * 2);
    dec.rails = { base: rBase, bar: rBar, post: rPost, idx: {} };
    rails.forEach(([x, z], i) => {
      dec.rails.idx[z * W + x] = i;
      const alongZ = x === 0 || x === W - 1;                 // rambarde des petits côtés : orientée selon z
      dm.rotation.set(0, alongZ ? Math.PI / 2 : 0, 0); dm.scale.setScalar(1);
      dm.position.set(x + 0.5, 0.16, z + 0.5); dm.updateMatrix(); rBase.setMatrixAt(i, dm.matrix);
      dm.position.set(x + 0.5, 0.62, z + 0.5); dm.updateMatrix(); rBar.setMatrixAt(i, dm.matrix);
      for (let k = 0; k < 2; k++) {
        const o = -0.35 + k * 0.7;
        dm.position.set(x + 0.5 + (alongZ ? 0 : o), 0.47, z + 0.5 + (alongZ ? o : 0)); dm.updateMatrix(); rPost.setMatrixAt(i * 2 + k, dm.matrix);
      }
    });
    [rBase, rBar, rPost].forEach((m) => { m.castShadow = true; m.receiveShadow = true; A.add(m); });
    // ----- le liseré rouge : chaque bord de case qui donne sur le vide (recalculé quand le plateau s'effondre) -----
    dec.hz = new THREE.InstancedMesh(new THREE.BoxGeometry(0.96, 0.02, 0.09), new THREE.MeshBasicMaterial({ color: A.lin(0xff3a3a), toneMapped: false, transparent: true, opacity: 0.85 }), 700);
    dec.hz.frustumCulled = false; A.add(dec.hz);
    // ----- les cases qui vont s'effondrer : une dalle rouge qui clignote -----
    dec.cr = new THREE.InstancedMesh(new THREE.BoxGeometry(0.96, 0.03, 0.96), new THREE.MeshBasicMaterial({ color: A.lin(0xff3a2a), toneMapped: false, transparent: true, opacity: 0.6, depthWrite: false }), 200);
    dec.cr.count = 0; dec.cr.frustumCulled = false; A.add(dec.cr);
    dec.dm = dm;
    // ----- les pylônes : socle, colonne, bobines de cuivre, sphère qui s'allume -----
    const baseGeo = new THREE.BoxGeometry(0.95, 0.5, 0.95), colGeo = new THREE.CylinderGeometry(0.2, 0.26, 2.4, 12);
    const coilGeo = new THREE.TorusGeometry(0.36, 0.06, 8, 20), topGeo = new THREE.SphereGeometry(0.34, 16, 12);
    const metal = new THREE.MeshStandardMaterial({ color: A.lin(0x4a5f66), metalness: 0.7, roughness: 0.35 });
    const copper = new THREE.MeshStandardMaterial({ color: A.lin(0xd07a3a), metalness: 0.8, roughness: 0.3, emissive: A.lin(0x3a1a08), emissiveIntensity: 0.5 });
    PYLONS.forEach(([x, z]) => {
      const g = new THREE.Group(); g.position.set(x + 0.5, 0, z + 0.5);
      const base = new THREE.Mesh(baseGeo, metal); base.position.y = 0.25; base.castShadow = true;
      const col = new THREE.Mesh(colGeo, metal); col.position.y = 1.7; col.castShadow = true;
      g.add(base, col);
      for (const y of [1.0, 1.55, 2.1]) { const c = new THREE.Mesh(coilGeo, copper); c.rotation.x = Math.PI / 2; c.position.y = y; g.add(c); }
      const glow = new THREE.MeshBasicMaterial({ color: A.lin(0x1f4a5a), toneMapped: false });
      const top = new THREE.Mesh(topGeo, glow); top.position.y = 3.05; g.add(top);
      A.add(g);
      dec.py.push({ g, top, glow });
    });
    // l'anneau de portée et les ondes qui se resserrent (un seul jeu, déplacé sur le pylône actif)
    const range = new THREE.Mesh(new THREE.RingGeometry(PY.range - 0.14, PY.range, 72), new THREE.MeshBasicMaterial({ color: A.lin(0x5ad1ff), toneMapped: false, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
    range.rotation.x = -Math.PI / 2; range.visible = false; A.add(range); dec.range = range;
    const ripGeo = new THREE.RingGeometry(0.93, 1, 56);
    for (let k = 0; k < 3; k++) {
      const r = new THREE.Mesh(ripGeo, new THREE.MeshBasicMaterial({ color: A.lin(0x9ff0ff), toneMapped: false, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      r.rotation.x = -Math.PI / 2; r.visible = false; A.add(r); dec.ripples.push(r);
    }
    // les éclairs : quelques fins cylindres réutilisés vers ce qui est aspiré
    const beamGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 5);
    for (let k = 0; k < 8; k++) {
      const b = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: A.lin(0x9ff0ff), toneMapped: false, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
      b.visible = false; A.add(b); dec.beams.push(b);
    }
    dec.up = new THREE.Vector3(0, 1, 0); dec.v = new THREE.Vector3();
  }
  // une rambarde qui tombe avec sa case
  function hideRail(dec, key) {
    const R = dec.rails, i = R.idx[key];
    if (i === undefined) return;
    const dm = dec.dm; dm.position.set(0, -50, 0); dm.scale.setScalar(0.001); dm.updateMatrix();
    R.base.setMatrixAt(i, dm.matrix); R.bar.setMatrixAt(i, dm.matrix); R.post.setMatrixAt(i * 2, dm.matrix); R.post.setMatrixAt(i * 2 + 1, dm.matrix);
    R.base.instanceMatrix.needsUpdate = R.bar.instanceMatrix.needsUpdate = R.post.instanceMatrix.needsUpdate = true;
    dm.scale.setScalar(1);
  }
  // liseré rouge + dalles qui clignotent : recalculés seulement quand une case change
  function rebuildEdges(A, dec) {
    const dm = dec.dm, C = A.S.cr;
    let n = 0;
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      if (A.grid.at(x, z) !== 0) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (A.grid.at(x + dx, z + dz) !== A.VOID || n >= 700) continue;
        dm.rotation.set(0, dx ? Math.PI / 2 : 0, 0);
        dm.position.set(x + 0.5 + dx * 0.44, 0.015, z + 0.5 + dz * 0.44); dm.updateMatrix(); dec.hz.setMatrixAt(n++, dm.matrix);
      }
    }
    dec.hz.count = n; dec.hz.instanceMatrix.needsUpdate = true;
    let k = 0;
    dm.rotation.set(0, 0, 0);
    for (const key of C.warn) { if (k >= 200) break; dm.position.set(key % W + 0.5, 0.03, Math.floor(key / W) + 0.5); dm.updateMatrix(); dec.cr.setMatrixAt(k++, dm.matrix); }
    dec.cr.count = k; dec.cr.instanceMatrix.needsUpdate = true;
  }
  function drawDecor(A, dt, time) {
    const S = A.S, dec = S.decor, Y = S.py;
    if (!dec) return;
    if (S.cr.dirty) { S.cr.dirty = false; rebuildEdges(A, dec); }
    dec.cr.material.opacity = 0.25 + (Math.sin(time * 14) > 0 ? 0.45 : 0);
    dec.py.forEach((p, k) => {
      const act = Y.k === k && Y.st !== 'idle';
      const col = !act ? 0x1f4a5a : Y.st === 'warn' ? (Math.sin(time * 22) > 0 ? 0xffe14a : 0x5ad1ff) : (Math.sin(time * 40) > -0.3 ? 0xbff8ff : 0x5ad1ff);
      p.glow.color.setHex(col);
      p.top.scale.setScalar(act ? 1.15 + Math.sin(time * 18) * 0.12 : 1);
      p.g.position.x = PYLONS[k][0] + 0.5 + (act && Y.st === 'warn' ? Math.sin(time * 60) * 0.03 : 0);
    });
    const on = Y.st !== 'idle' && Y.k >= 0;
    dec.range.visible = on;
    if (on) {
      const [px, pz] = PYLONS[Y.k];
      dec.range.position.set(px + 0.5, 0.05, pz + 0.5);
      dec.range.material.opacity = Y.st === 'warn' ? (Math.sin(time * 16) > 0 ? 0.6 : 0.15) : 0.35;
      // les ondes se resserrent vers le pylône pendant qu'il aspire
      dec.ripples.forEach((r, k) => {
        r.visible = Y.st === 'on';
        if (!r.visible) return;
        const u = ((time * 0.9 + k / 3) % 1);
        r.scale.setScalar(PY.range * (1 - u) + 0.6);
        r.position.set(px + 0.5, 0.06, pz + 0.5);
        r.material.opacity = 0.4 * u;
      });
    } else dec.ripples.forEach((r) => { r.visible = false; });
    // les éclairs vers les joueurs et les objets aspirés
    let n = 0;
    if (Y.st === 'on') {
      const [px, pz] = PYLONS[Y.k];
      const sx = px + 0.5, sy = 3.05, sz = pz + 0.5;
      const list = [];
      for (const P of A.players) if (P.alive && !P.out && !P.ghost && Math.hypot(P.x - sx, P.z - sz) < PY.range) list.push([P.x, 0.8, P.z]);
      for (const o of S.objs) if (!o.gone && !o.falling && !o.holder && Math.hypot(o.x - sx, o.z - sz) < PY.range) list.push([o.x, o.K.r, o.z]);
      for (const [tx, ty, tz] of list) {
        if (n >= dec.beams.length) break;
        const b = dec.beams[n++];
        dec.v.set(tx - sx, ty - sy, tz - sz);
        const len = dec.v.length();
        b.visible = true;
        b.position.set((sx + tx) / 2, (sy + ty) / 2, (sz + tz) / 2);
        b.scale.set(1, len, 1);
        b.quaternion.setFromUnitVectors(dec.up, dec.v.normalize());
        b.material.opacity = 0.35 + Math.random() * 0.45;
      }
    }
    for (let k = n; k < dec.beams.length; k++) dec.beams[k].visible = false;
  }

  // le passage en fantôme se fait dans update (après la chute)
  const def = OT.Arena.games.magnet;
  const upd = def.update;
  def.update = function (A, dt) {
    for (const P of A.players) if (P.data.toGhost > 0) {
      P.data.toGhost -= dt;
      if (P.data.toGhost <= 0) { A.place(P, W / 2, 1.5); P.ghost = true; P.noClip = true; P.alive = false; P.out = true; }
    }
    upd.call(this, A, dt);
  };
})();
