/* =====================================================================
   🏰 LE TRÉSOR — ouvre le coffre… si les autres te laissent faire
   Le grand donjon (29×21, version 1.4) :
   - au centre, le DONJON et ses 4 PORTES qui s'ouvrent et se ferment ;
   - à l'ouest et à l'est, deux SALLES (3 portes chacune) reliées par un
     PASSAGE SECRET : marcher sur les runes violettes d'une salle fait
     ressortir dans l'autre ;
   - au nord et au sud, deux HALLS où un GRAND BALANCIER (boule à pics)
     balaie le couloir : son couloir devient rouge ~1,3 s avant qu'il
     ne se décroche, puis il passe et repasse ; il assomme et projette ;
   - aux quatre coins, des antichambres (les départs) ;
   - des dalles à PICS aux portes et dans les couloirs (elles clignotent
     avant de sortir) ;
   - 7 emplacements de coffre : au centre, dans les salles, sous les
     balanciers (risqué : il faut ouvrir du bon côté !), devant les portes.
   Règles (inchangées) :
   - maintenir A devant le coffre fait monter « OUVERTURE : 72 % » ;
     à plusieurs devant le coffre, seul le plus avancé progresse, lentement ;
   - B : frapper (interrompt l'ouverture ; la progression baisse
     lentement) ;
   - coffre ouvert : 15 points + une gerbe de pièces (1 point chacune),
     puis un nouveau coffre apparaît ailleurs ;
   - objets : bouclier, mini-bombe, piège à mâchoires, éclair ;
   - « Alliance ! » : deux joueurs frappent le même ouvreur (+1 chacun) ;
     « Trahison ! » : frapper son allié juste après (+2).
   ===================================================================== */
(function () {
  const W = 29, D = 21, TIME = 150, OPEN = 4;     // ouverture plus rapide qu'avant (5 s) : le donjon est plus grand
  const GATE = 13, SPIKE = 14;
  const CX = Math.floor(W / 2), CZ = Math.floor(D / 2);     // la case du centre (14, 10)
  // les emplacements de coffre (le premier : au centre)
  const CHESTS = [[CX, CZ], [5, CZ], [W - 6, CZ], [CX, 2], [CX, D - 3], [CX, 5], [CX, D - 6]];
  const WHERE = ['au centre', 'dans la salle ouest', 'dans la salle est', 'sous le balancier nord', 'sous le balancier sud', 'devant la porte nord', 'devant la porte sud'];
  const ITEMS = {
    shield: { icon: '🛡️', name: 'Bouclier', color: 0x5ad1ff },
    bomb:   { icon: '💣', name: 'Mini-bombe', color: 0x3a3f46 },
    trap:   { icon: '🪤', name: 'Piège à mâchoires', color: 0xc98a3a },
    zap:    { icon: '⚡', name: 'Éclair', color: 0xffd23a },
  };
  /* ---------- La disposition : un quart du donjon, recopié en miroir ----------
     # mur · P pilier · G porte du donjon · ^ dalle à pics · T runes du passage secret
     (D : porte de salle, C : emplacement de coffre — des cases de sol, pour se repérer) */
  const Q = [
    '###############',
    '#.......#......',
    '#.......D......',
    '#....P..#......',
    '#.......###....',
    '#..........^...',
    '####^###.......',
    '#......#..####G',
    '#......#.^#....',
    '#..P...#..#.P..',
    '#.T..C.D..G....',
  ];
  const CODE = { '#': 1, P: 1, G: GATE, '^': SPIKE, '.': 0, D: 0, C: 0, T: 0 };
  function layout(x, z) { return CODE[Q[Math.min(z, D - 1 - z)][Math.min(x, W - 1 - x)]]; }
  const GATES = [[CX, 7], [CX, D - 8], [10, CZ], [W - 11, CZ]];
  const SPIKES = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (layout(x, z) === SPIKE) SPIKES.push([x, z]);
  // le passage secret : deux plaques de runes (salle ouest ↔ salle est)
  const TPS = [[2, CZ], [W - 3, CZ]];
  // les deux grands balanciers : pivot au-dessus du couloir, la boule balaie l'axe x
  // (danger : la boule est basse au milieu de sa course → rangées z0 et z0 + 1, cases x 11 à 17)
  // (pivot assez bas pour que, vue d'en haut, la boule reste au-dessus de son couloir)
  const PEND = { len: 3.0, top: 3.6, amp: 1.15, period: 2.4, rest: 6.5, warn: 1.3, swings: 2, head: 0.55, low: 1.5 };
  const PENDS = [{ x: W / 2, z: 2, z0: 1 }, { x: W / 2, z: D - 2, z0: D - 3 }];
  const PSTRIP = [11, W - 12];   // cases x couvertes par la boule quand elle est basse

  let coinGeo = null, coinMat = null, spikeGeo = null;

  OT.Arena.register({
    id: 'tresor', name: 'Le Trésor', icon: '🏰', color: '#b78cff', theme: 'nexus', music: 'tresor',
    tagline: 'Ouvre le coffre pendant que les autres essaient de t\'en empêcher.',
    goal: 'Ouvrir le plus de coffres (15 points chacun) et ramasser leurs pièces.',
    howto: [
      'Va au coffre (flèche violette) avec {move}.',
      'Maintiens {a} devant le coffre pour l\'ouvrir : 15 points + des pièces.',
      '{b} : frapper (interrompt l\'ouverture) ou utiliser ton objet.',
      'Les runes violettes : un passage secret d\'une salle à l\'autre !',
    ],
    danger: 'Les pics qui clignotent, les portes du donjon, et le grand balancier quand son couloir devient rouge !',
    win: 'Le plus de points au bout de 2 min 30.',
    lose: 'Assommé pendant l\'ouverture ? Un autre te pique le coffre.',
    tuto: ['Déplace-toi : {move}', '{a} (maintenu) : ouvrir le coffre', '{b} : frapper / utiliser l\'objet'],
    rules: [
      'Maintiens A devant le coffre pour l\'ouvrir. À plusieurs, seul celui qui est le plus avancé progresse… lentement.',
      'B : frapper. Un coup interrompt l\'ouverture. Coffre ouvert : 15 points + des pièces à ramasser.',
      'Deux joueurs frappent le même ouvreur : « Alliance ! ». Frapper son allié juste après : « Trahison ! » (+2).',
      'Gare aux pics, aux portes et aux grands balanciers (leur couloir rougit avant). Les runes violettes : passage secret !',
      'Objets : 🛡️ bouclier, 💣 mini-bombe, 🪤 piège, ⚡ éclair.',
    ],
    controls: { a: 'Ouvrir le coffre (maintenu) · ramasser', b: 'Frapper · utiliser l\'objet' },
    rounds: 1, scoreName: 'points', maxRound: TIME + 5,
    view: () => ({ x0: 0, z0: 0, x1: W, z1: D }),
    tilt: 31,
    camMin: 0.62,          // la caméra suit l'action sans montrer moins que cette part du donjon

    round(A) {
      const S = A.S;
      A.buildGrid(W, D, layout, 'nexus');
      S.gates = GATES.map(([x, z], k) => ({ x, z, open: true, t: k * 1.7, mesh: null }));
      S.spikes = SPIKES.map(([x, z], k) => ({ x, z, t: k * 0.9, on: false, mesh: null }));
      // les balanciers : décalés d'une demi-période (quand l'un se repose, l'autre se prépare)
      const cyc = PEND.rest + PEND.warn + PEND.period * PEND.swings;
      S.pends = PENDS.map((p, k) => ({ x: p.x, z: p.z, z0: p.z0, t: k * cyc / 2 - 3, st: 'rest', th: PEND.amp, hx: p.x + Math.sin(PEND.amp) * PEND.len, hy: PEND.top - Math.cos(PEND.amp) * PEND.len, mesh: null, n: 0 }));
      S.coins = []; S.boxes = []; S.boxT = 4; S.bombs = []; S.traps = [];
      S.chestAt = 0; S.prog = A.fill(A.n, 0); S.newT = 0; S.lastHits = []; S.allies = []; S.opened = A.fill(A.n, 0);
      S.tpDist = TPS.map(([x, z]) => distField(A, x, z));
      S.chest = makeChest(A, CHESTS[0]);
      const spots = [[2, 2], [W - 3, D - 3], [W - 3, 2], [2, D - 3]];
      A.players.forEach((P, i) => {
        A.place(P, spots[i][0] + 0.5, spots[i][1] + 0.5);
        P.speed = 4.5; P.r = 0.32;
        P.data = { cool: 0, item: null, shieldT: 0, hits: 0, betray: 0, ally: 0, coins: 0, opening: false, tpCd: 0, tpIn: -1, pend: 0, spk: 0 };
      });
      if (!A.headless) buildDecor(A);
    },

    blocks(A, cx, cz) { const g = A.S.gates && A.S.gates.find((o) => o.x === cx && o.z === cz); return !!(g && !g.open); },
    bodies: true,
    speedMod(A, P) { return P.data.opening ? 0.35 : 1; },

    update(A, dt) {
      const S = A.S;
      const left = TIME - A.t;
      // portes : ouvertes 6 s, fermées 3 s (décalées)
      for (const g of S.gates) {
        g.t += dt;
        const ph = g.t % 9;
        const want = ph < 6;
        if (want !== g.open) {
          if (!want && A.alive().some((P) => Math.floor(P.x) === g.x && Math.floor(P.z) === g.z)) continue;   // jamais sur quelqu'un
          g.open = want;
          A.sfx(want ? 'whoosh' : 'land');
        }
      }
      // pics : 2,4 s éteints, 0,8 s d'alerte, 1,2 s sortis
      for (const sp of S.spikes) {
        sp.t += dt;
        const ph = sp.t % 4.4;
        sp.warn = ph >= 2.4 && ph < 3.2; sp.on = ph >= 3.2;
        if (sp.on) for (const P of A.alive()) if (Math.floor(P.x) === sp.x && Math.floor(P.z) === sp.z && P.stun <= 0 && !(P.data.shieldT > 0)) { stun(A, P, null, 1.0, 'Aïe, les pics !'); A.knock(P, A.rand(-1, 1), A.rand(-1, 1), 5, 1.0); P.data.spk++; }
      }
      // les grands balanciers
      for (const pd of S.pends) pendUpdate(A, pd, dt);
      // objets
      S.boxT -= dt;
      if (S.boxT <= 0) { S.boxT = 7; spawnBox(A); }
      // nouveau coffre
      if (!S.chest && S.newT > 0) {
        S.newT -= dt;
        if (S.newT <= 0) {
          let k; do { k = A.rint(0, CHESTS.length - 1); } while (k === S.chestAt && CHESTS.length > 1);
          S.chestAt = k; S.chest = makeChest(A, CHESTS[k]);
          A.banner('Un nouveau coffre !', WHERE[k], '#b78cff', 1.5);
          A.sfx('rule');
        }
      }
      const C = S.chest;
      // qui est devant le coffre ?
      const near = C ? A.alive().filter((P) => Math.hypot(P.x - C.x, P.z - C.z) < 1.35) : [];
      const openers = near.filter((P) => P.in.a && P.stun <= 0);
      const contested = openers.length >= 2;
      // contesté : seul le plus avancé progresse, lentement
      const top = contested ? openers.reduce((b, P) => (S.prog[P.i] > S.prog[b.i] ? P : b), openers[0]) : null;
      if (C) C.contested = contested;
      for (const P of A.players) {
        const d = P.data;
        if (!P.alive || P.out) continue;
        d.cool = Math.max(0, d.cool - dt); d.tpCd = Math.max(0, d.tpCd - dt);
        // ouvrir
        d.opening = !!(C && P.in.a && near.includes(P) && P.stun <= 0);
        if (d.opening && (!contested || P === top)) {
          S.prog[P.i] += dt / OPEN * (contested ? 0.35 : 1);
          if (Math.random() < dt * 6) A.burst(C.x, 0.8, C.z, 1, [P.color, 0xffd23a], 2, { up: 1 });
          if (S.prog[P.i] >= 1) openChest(A, P);
        } else S.prog[P.i] = Math.max(0, S.prog[P.i] - dt * 0.03);
        if (d.opening) { d.armL = -1.4; d.armR = -1.4; } else { delete d.armL; if (d.cool <= 0.3) delete d.armR; }
        // frapper / utiliser l'objet
        if (P.in.bP && d.cool <= 0 && P.stun <= 0) {
          if (d.item) useItem(A, P);
          else punch(A, P);
        }
        // le passage secret
        secret(A, P);
        // pièces
        for (const c of S.coins) if (!c.dead && c.t > 0.4 && Math.hypot(c.x - P.x, c.z - P.z) < 0.55) { c.dead = true; A.remove(c.mesh); A.point(P.i, 1); d.coins++; A.sfx('coin'); }
        // ramasser un objet (si on n'en a pas déjà un)
        if (!d.item) for (const b of S.boxes) if (!b.dead && Math.hypot(b.x - P.x, b.z - P.z) < 0.6) {
          b.dead = true; A.remove(b.mesh); d.item = b.type;
          if (b.type === 'shield') { d.shieldT = 6; d.item = null; }
          A.sfx('power'); A.say(P.x, P.z, ITEMS[b.type].icon + ' ' + ITEMS[b.type].name, '#ffd28a', 26);
          A.voice('item', P);
          break;
        }
        // pièges à mâchoires
        for (const t of S.traps) if (!t.dead && t.owner !== P && Math.hypot(t.x - P.x, t.z - P.z) < 0.5) { t.dead = true; A.remove(t.mesh); stun(A, P, t.owner, 2, '🪤 Clac !'); }
      }
      S.boxes = S.boxes.filter((b) => !b.dead); S.traps = S.traps.filter((t) => !t.dead);
      // pièces qui retombent
      for (const c of S.coins) { if (c.dead) continue; c.t += dt; c.x += c.vx * dt; c.z += c.vz * dt; c.vx *= Math.exp(-3 * dt); c.vz *= Math.exp(-3 * dt); if (A.grid.solid(Math.floor(c.x), Math.floor(c.z))) { c.x -= c.vx * dt * 2; c.z -= c.vz * dt * 2; c.vx = c.vz = 0; } c.y = Math.max(0.25, c.y + c.vy * dt); c.vy -= 16 * dt; }
      S.coins = S.coins.filter((c) => !c.dead);
      // mini-bombes
      for (const b of S.bombs) {
        if (b.dead) continue;
        b.t += dt;
        const k = Math.min(1, b.t / 0.5);
        b.x = A.lerp(b.sx, b.tx, k); b.z = A.lerp(b.sz, b.tz, k); b.y = Math.sin(k * Math.PI) * 1.6;
        if (b.t > 1.1) {
          b.dead = true; A.remove(b.mesh);
          A.sfx('boom'); A.shake(0.4); A.burst(b.x, 0.5, b.z, 26, [0xff7a1a, 0xffd23a, 0x333333], 6, { up: 3 });
          for (const P of A.alive()) if (Math.hypot(P.x - b.x, P.z - b.z) < 1.7 && P !== b.owner) { A.knock(P, P.x - b.x, P.z - b.z, 8, 0); stun(A, P, b.owner, 1.1, '💥'); }
        }
      }
      S.bombs = S.bombs.filter((b) => !b.dead);
      // la couronne du leader
      if (!A.headless) {
        const best = Math.max(...A.score);
        const lead = best > 0 ? A.players.filter((P) => A.score[P.i] === best) : [];
        for (const P of A.players) {
          const has = lead.length === 1 && lead[0] === P;
          if (has && !P.data.crown) { P.data.crown = crownMesh(A); A.icon(P, P.data.crown); }
          else if (!has && P.data.crown) { A.icon(P, null); P.data.crown = null; }
        }
      }
      if (left <= 0) {
        const best = Math.max(...A.score), w = A.players.filter((P) => A.score[P.i] === best);
        A.endRound({ winners: w.map((P) => P.i), text: w.length > 1 ? 'Égalité !' : `${w[0].name} remporte le trésor !`, sub: `${best} points`, color: w[0].css });
      }
    },

    draw(A, dt, time) {
      const S = A.S;
      for (const g of S.gates) if (g.mesh) { const ty = g.open ? -0.5 : 0.45; g.mesh.position.y += (ty - g.mesh.position.y) * Math.min(1, dt * 10); }
      for (const sp of S.spikes) if (sp.mesh) {
        const s = sp.mesh.userData.sp; const ty = sp.on ? 0 : sp.warn ? -0.3 + Math.sin(time * 30) * 0.03 : -0.5; s.position.y += (ty - s.position.y) * Math.min(1, dt * 18);
        // la dalle rougit pendant l'alerte
        sp.mesh.userData.base.material = sp.warn || sp.on ? S.decor.spikeHot : S.decor.spikeCold;
      }
      const C = S.chest;
      if (C && C.mesh) {
        const best = A.players.reduce((b, P) => (S.prog[P.i] > (b ? S.prog[b.i] : 0) ? P : b), null);
        const pct = best ? Math.floor(S.prog[best.i] * 100) : 0;
        // la flèche dit « COFFRE » / « CONTESTÉ ! » ; le coffre, lui, affiche la progression
        const txt = pct > 0 ? `OUVERTURE : ${pct} %` : '';
        const key = txt + (best ? best.i : '');
        if (key !== C.key) {
          C.key = key; if (C.lab) { C.mesh.remove(C.lab); C.lab = null; }
          if (txt) { C.lab = A.label(txt, { size: 30, h: 0.45, color: best.css, border: best.css }); C.lab.position.y = 1.5; C.mesh.add(C.lab); }
        }
        if (C.lab) C.lab.quaternion.copy(A.camera.quaternion);
        C.lid.rotation.x = -Math.min(1, best ? S.prog[best.i] : 0) * 0.5 - (C.contested ? Math.abs(Math.sin(time * 12)) * 0.08 : 0);
        C.glow.material.opacity = 0.25 + Math.sin(time * 3) * 0.1;
      }
      for (const c of S.coins) if (c.mesh) { c.mesh.position.set(c.x, c.y, c.z); c.mesh.rotation.z = time * 4 + c.x; }
      for (const b of S.boxes) if (b.mesh) { b.mesh.position.y = Math.sin(time * 3 + b.x) * 0.08; b.mesh.userData.lab.quaternion.copy(A.camera.quaternion); }
      for (const b of S.bombs) if (b.mesh) b.mesh.position.set(b.x, b.y + 0.3, b.z);
      for (const P of A.players) {
        if (P.data.shieldT > 0 && !A.headless) {
          if (!P.shieldMesh) { P.shieldMesh = A.mesh('ball', 0.6, 0x5ad1ff, { basic: true, opacity: 0.25 }); A.add(P.shieldMesh); }
          P.shieldMesh.visible = true; P.shieldMesh.position.set(P.x, 0.6, P.z);
        } else if (P.shieldMesh) P.shieldMesh.visible = false;
      }
      drawDecor(A, dt, time);
    },

    // flèche violette sur le coffre (« CONTESTÉ ! » quand plusieurs l'ouvrent)
    goals(A) {
      const C = A.S.chest;
      return C ? [{ x: C.x, z: C.z, color: 0xb78cff, label: C.contested ? 'CONTESTÉ !' : 'COFFRE', y: 0.6 }] : [];
    },

    hud(A) {
      const S = A.S;
      const pw = S.pends && S.pends.some((p) => p.st === 'warn');
      return {
        timer: TIME - A.t,
        note: S.chest && S.chest.contested ? '⚔ Le coffre est contesté !' : pw ? '⚠ Le balancier se décroche !' : '',
        rows: A.players.map((P) => ({ i: P.i, txt: `${Math.floor(S.prog[P.i] * 100)}%${P.data.item ? ' ' + ITEMS[P.data.item].icon : ''}${P.data.shieldT > 0 ? ' 🛡️' : ''}` })),
      };
    },
    rush(A) { return TIME - A.t < 15 ? 1.2 : 1; },
    stats(A, P) {
      const d = P.data, S = A.S;
      return [`${S.opened[P.i]} coffre${S.opened[P.i] > 1 ? 's' : ''}`, `${d.coins} pièces`, `${d.hits} coups`, `${d.ally} alliance${d.ally > 1 ? 's' : ''}`, `${d.betray} trahison${d.betray > 1 ? 's' : ''}`];
    },
    bonus(A, P) { const o = []; if (P.data.betray) o.push('Traître ×' + P.data.betray); if (A.S.opened[P.i] >= 2) o.push('Pilleur de coffres'); return o; },
    tiebreak(A, i) { return A.S.opened[i]; },

    /* ---------- LE BOT ---------- */
    bot(A, P, B, L) {
      const S = A.S, d = P.data, C = S.chest;
      if (!P.alive || P.out) return {};
      const others = A.others(P);
      const [cx, cz] = A.Bot.cell(P);
      // 0) danger sous mes pieds (pics qui vont sortir, balancier qui va passer) : je sors
      if (danger(A, cx, cz, 0.9)) {
        const out = escape(A, P);
        if (out) return out;
      }
      // un objet en main : on l'utilise au bon moment
      if (d.item) {
        const opener = others.find((O) => O.data.opening);
        if (d.item === 'zap' && others.filter((O) => A.dist(O, P) < 2.5).length >= (L.skill > 0.8 ? 2 : 1)) return { tapB: true };
        if (d.item === 'bomb' && opener && A.dist(opener, P) < 5 && A.dist(opener, P) > 1.5) { const o = A.Bot.dir(P, opener.x, opener.z); if (Math.abs(diffA(P.face, Math.atan2(opener.x - P.x, opener.z - P.z))) < 0.3) o.tapB = true; return o; }
        if (d.item === 'trap' && C && Math.hypot(P.x - C.x, P.z - C.z) < 2.2 && Math.random() < 0.5) return { tapB: true };
      }
      if (C) {
        const opener = others.filter((O) => O.data.opening || S.prog[O.i] > 0.45).sort((a, b) => S.prog[b.i] - S.prog[a.i])[0];
        const dC = Math.hypot(P.x - C.x, P.z - C.z);
        const iOpen = dC < 1.25;
        const threat = others.filter((O) => A.dist(O, P) < 1.7);
        // je suis devant le coffre (et pas dans le couloir du balancier !)
        if (iOpen && !danger(A, cx, cz, 2)) {
          const leading = others.every((O) => S.prog[O.i] < S.prog[P.i] || Math.hypot(O.x - C.x, O.z - C.z) > 1.35);
          if (threat.length && (!leading || S.prog[P.i] < 0.5) && Math.random() < 0.12 + L.aggro * 0.25) {
            const T = threat[0];
            const o = A.Bot.dir(P, T.x, T.z);
            if (A.dist(T, P) < 1.15 && d.cool <= 0) o.tapB = true;
            return o;
          }
          if (opener && opener !== P && S.prog[opener.i] > S.prog[P.i] && A.dist(opener, P) < 1.6) { const o = A.Bot.dir(P, opener.x, opener.z); if (A.dist(opener, P) < 1.1) o.tapB = true; return o; }
          return { mx: 0, mz: 0, a: true };
        }
        // quelqu'un ouvre : on va le frapper (de préférence le leader)
        if (opener && (Math.random() < 0.55 + L.aggro * 0.4)) {
          const o = goTo(A, P, opener.x, opener.z);
          if (A.dist(opener, P) < 1.15 && d.cool <= 0) { o.tapB = true; }
          return o;
        }
        // trahison possible (Difficile, Chaos)
        if ((L.chaos || L.skill > 0.85) && Math.random() < 0.1) {
          const al = S.allies.find((a) => (a.a === P.i || a.b === P.i) && A.clock - a.t < 5);
          if (al) { const T = A.players[al.a === P.i ? al.b : al.a]; if (T.alive && A.dist(T, P) < 1.2) return { tapB: true }; }
        }
        // sinon : aller ouvrir, depuis une case sûre (sous le balancier : du bon côté)
        if (!opener || dC < 4) { const st = standSpot(A, P, C); return goTo(A, P, st[0], st[1]); }
      }
      // pièces et objets
      const coin = A.Bot.nearest(P, S.coins.filter((c) => !danger(A, Math.floor(c.x), Math.floor(c.z), 1.5)));
      if (coin && coin.d < 7) return goTo(A, P, coin.o.x, coin.o.z);
      const box = A.Bot.nearest(P, S.boxes);
      if (box && !d.item && box.d < 9) return goTo(A, P, box.o.x, box.o.z);
      return goTo(A, P, W / 2 + (P.i % 2 ? 4 : -4), D / 2 + (P.i < 2 ? -4 : 4));
    },
    // garde-fou à chaque pas : on n'entre pas sur une case qui va piquer ou être balayée
    // (même en courant après quelqu'un) ; le Facile se trompe parfois
    botGuard(A, P, mx, mz, L) {
      if (Math.random() < L.mistake * 0.02) return [mx, mz];
      const cx = Math.floor(P.x), cz = Math.floor(P.z);
      if (danger(A, cx, cz, 0.5)) return [mx, mz];          // déjà dessus : la fuite s'en occupe
      const nx = Math.floor(P.x + mx * 0.6), nz = Math.floor(P.z + mz * 0.6);
      if ((nx === cx && nz === cz) || !danger(A, nx, nz, 0.5)) return [mx, mz];
      if (nx !== cx && !danger(A, nx, cz, 0.5)) return [mx, 0];
      if (nz !== cz && !danger(A, cx, nz, 0.5)) return [0, mz];
      return [0, 0];
    },
  });

  function diffA(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

  /* ---------- Les bots : dangers, chemins, passage secret ---------- */
  const inStrip = (pd, x, z) => x >= PSTRIP[0] && x <= PSTRIP[1] && (z === pd.z0 || z === pd.z0 + 1);
  // la case est-elle dangereuse dans les « soon » prochaines secondes ? (pics, balancier)
  function danger(A, x, z, soon) {
    const S = A.S;
    for (const sp of S.spikes) if (sp.x === x && sp.z === z) { const ph = sp.t % 4.4; if (sp.on || sp.warn || (ph < 2.4 && 2.4 - ph < soon * 0.6)) return true; }
    for (const pd of S.pends) if (inStrip(pd, x, z) && (pd.st !== 'rest' || pd.t > PEND.rest - soon)) return true;
    return false;
  }
  function passable(A, x, z) {
    if (A.grid.solid(x, z)) return false;
    const g = A.S.gates.find((o) => o.x === x && o.z === z);
    if (g && !g.open) return false;
    if (danger(A, x, z, 1)) return false;
    // les runes : on ne marche dessus que pour les prendre exprès
    if (TPS.some(([tx, tz]) => tx === x && tz === z)) return false;
    return true;
  }
  // carte des distances (en cases) depuis une case, en évitant les murs (portes comprises)
  function distField(A, sx, sz) {
    const G = A.grid, f = new Int16Array(W * D).fill(-1);
    const q = [sz * W + sx]; f[q[0]] = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const c = q[qi], x = c % W, z = (c / W) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= W || nz >= D || G.solid(nx, nz)) continue;
        const ni = nz * W + nx;
        if (f[ni] >= 0) continue;
        f[ni] = f[c] + 1; q.push(ni);
      }
    }
    return f;
  }
  function goTo(A, P, x, z) {
    const S = A.S;
    const tx = Math.floor(x), tz = Math.floor(z);
    const [cx, cz] = A.Bot.cell(P);
    if (cx === tx && cz === tz) return A.Bot.toward(P, x, z, 0.1);
    const path = A.Bot.bfs(cx, cz, (gx, gz) => gx === tx && gz === tz, (gx, gz) => passable(A, gx, gz) || (gx === tx && gz === tz && !A.grid.solid(gx, gz)), 1000);
    // le passage secret : si « runes ici + ressortir là-bas » est nettement plus court
    if (P.data.tpCd <= 0 && P.data.tpIn < 0) {
      const here = cz * W + cx, there = tz * W + tx, direct = path ? path.length : 999;
      for (let k = 0; k < 2; k++) {
        const a = S.tpDist[k][here], b = S.tpDist[1 - k][there];
        if (a < 0 || b < 0 || a + b + 4 >= direct) continue;
        const [sx, sz] = TPS[k];
        if (a <= 1) return A.Bot.toward(P, sx + 0.5, sz + 0.5, 0.05);
        const p2 = A.Bot.bfs(cx, cz, (gx, gz) => gx === sx && gz === sz, (gx, gz) => passable(A, gx, gz) || (gx === sx && gz === sz), 1000);
        if (p2) return A.Bot.follow(P, p2);
      }
    }
    if (path) { if (path.length <= 1) return A.Bot.toward(P, x, z, 0.1); return A.Bot.follow(P, path); }
    // pas de chemin sûr pour l'instant (porte fermée, pics, balancier) : on attend sur place
    // si le chemin passe par un danger, sinon on y va tout droit
    const raw = A.Bot.bfs(cx, cz, (gx, gz) => gx === tx && gz === tz, (gx, gz) => !A.grid.solid(gx, gz) && !A.S.gates.some((o) => o.x === gx && o.z === gz && !o.open), 1000);
    if (raw) { const k = raw.findIndex(([gx, gz]) => danger(A, gx, gz, 1)); const cut = k < 0 ? raw : raw.slice(0, k); if (cut.length) return A.Bot.follow(P, cut); return { mx: 0, mz: 0 }; }
    return A.Bot.toward(P, x, z, 0.1);
  }
  // sortir d'une case dangereuse : la case sûre la plus proche
  function escape(A, P) {
    const [cx, cz] = A.Bot.cell(P);
    const path = A.Bot.bfs(cx, cz, (gx, gz) => !danger(A, gx, gz, 2.5) && !TPS.some(([tx, tz]) => tx === gx && tz === gz), (gx, gz) => !A.grid.solid(gx, gz) && !A.S.gates.some((o) => o.x === gx && o.z === gz && !o.open), 300);
    if (path && path.length) return A.Bot.follow(P, path.slice(0, 3));
    return null;
  }
  // où se placer pour ouvrir le coffre : une case voisine (ou le coffre lui-même) praticable et sans danger
  function standSpot(A, P, C) {
    const cx = Math.floor(C.x), cz = Math.floor(C.z);
    let best = null, bd = 1e9;
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = cx + dx, z = cz + dz;
      if (A.grid.solid(x, z) || A.S.gates.some((o) => o.x === x && o.z === z) || TPS.some(([tx, tz]) => tx === x && tz === z)) continue;
      // sous un balancier : on n'ouvre jamais depuis son couloir
      if (A.S.pends.some((pd) => inStrip(pd, x, z))) continue;
      const d = Math.hypot(x + 0.5 - P.x, z + 0.5 - P.z) + (dx || dz ? 0 : 0.6) + (P.i * 0.37 + dx * 0.21 + dz * 0.13) % 0.3;
      if (d < bd) { bd = d; best = [x + 0.5 - dx * 0.1, z + 0.5 - dz * 0.1]; }
    }
    return best || [C.x + (P.x < C.x ? -0.75 : 0.75), C.z];
  }

  /* ---------- Le passage secret : runes ouest ↔ runes est ---------- */
  function secret(A, P) {
    const d = P.data;
    if (d.tpIn >= 0) {   // on vient de ressortir : il faut d'abord quitter les runes
      const [ex, ez] = TPS[d.tpIn];
      if (Math.hypot(P.x - ex - 0.5, P.z - ez - 0.5) > 0.8) d.tpIn = -1;
      return;
    }
    if (d.tpCd > 0) return;
    for (let k = 0; k < 2; k++) {
      const [sx, sz] = TPS[k];
      if (Math.hypot(P.x - sx - 0.5, P.z - sz - 0.5) > 0.42) continue;
      const [ox, oz] = TPS[1 - k];
      A.burst(P.x, 0.6, P.z, 18, [0xb78cff, 0xff7ad1, 0xffffff], 4, { up: 3 });
      A.place(P, ox + 0.5, oz + 0.5);
      d.tpCd = 3; d.tpIn = 1 - k;
      A.burst(P.x, 0.6, P.z, 18, [0xb78cff, 0xff7ad1, 0xffffff], 4, { up: 4 });
      A.wave(P.x, P.z, 0xb78cff, 1.6, 0.45);
      A.sfx('zap'); A.tone('sine', 900, 300, 0.3, 0.1);
      A.say(P.x, P.z, '✨ Passage secret !', '#b78cff', 24);
      A.rumble(P, 0.3, 0.3, 120);
      if (A.S.decor) A.S.decor.tpFlash[0] = A.S.decor.tpFlash[1] = 1;
      return;
    }
  }

  /* ---------- Les grands balanciers ----------
     accroché (6,5 s) → ALERTE 1,3 s (couloir rouge, la chaîne grince, il tremble) →
     2 allers-retours (5,2 s) → raccroché au même endroit… puis on recommence. */
  function pendUpdate(A, pd, dt) {
    pd.t += dt;
    if (pd.st === 'rest') {
      pd.th = PEND.amp * (pd.side || 1);
      if (pd.t >= PEND.rest) {
        pd.st = 'warn'; pd.t = 0; pd.n++;
        if (!A.S.pendTold) { A.S.pendTold = true; A.banner('⚠ Le grand balancier !', 'Quand son couloir est rouge, ne restez pas dessous', '#ff7ad1', 2); }
        A.sfx('warn');
        // humains dans le couloir : « Devant ! », « À gauche ! »…
        for (const P of A.alive()) if (inStrip(pd, Math.floor(P.x), Math.floor(P.z))) A.warn(P, pd.x, pd.z);
      }
    } else if (pd.st === 'warn') {
      // il tremble au bout de sa chaîne
      pd.th = PEND.amp * (pd.side || 1) * (1 + Math.sin(pd.t * 40) * 0.02);
      if (Math.random() < dt * 8) A.tone('square', 180 + Math.random() * 60, 120, 0.06, 0.05);
      for (const P of A.alive()) if (inStrip(pd, Math.floor(P.x), Math.floor(P.z))) A.warn(P, pd.x, pd.z);
      if (pd.t >= PEND.warn) { pd.st = 'swing'; pd.t = 0; A.sfx('whoosh'); }
    } else {
      const ph = pd.t / PEND.period * Math.PI * 2;
      pd.th = PEND.amp * (pd.side || 1) * Math.cos(ph);
      // un « vouuu » à chaque passage au milieu
      const half = Math.floor(pd.t / (PEND.period / 2) + 0.5);
      if (half !== pd.half) { pd.half = half; if (half > 0) A.sfx('whoosh'); }
      if (pd.t >= PEND.period * PEND.swings) { pd.st = 'rest'; pd.t = 0; pd.side = pd.side || 1; }
    }
    // position de la boule
    pd.hx = pd.x + Math.sin(pd.th) * PEND.len;
    pd.hy = PEND.top - Math.cos(pd.th) * PEND.len;
    if (pd.st !== 'swing' || pd.hy > PEND.low) return;
    const vx = -Math.sin(pd.t / PEND.period * Math.PI * 2) * (pd.side || 1);   // sens du mouvement
    for (const P of A.alive()) {
      if (P.data.pendT > 0) continue;
      if (Math.hypot(P.x - pd.hx, P.z - pd.z) > PEND.head - 0.05 + P.r) continue;
      P.data.pendT = 0.9; P.data.pend++;
      const shield = P.data.shieldT > 0;
      A.knock(P, Math.sign(vx) || 1, (P.z - pd.z) * 0.6, shield ? 6 : 11, shield ? 0.2 : 0.3);
      stun(A, P, null, 1.0, shield ? null : '💫 BOUM !');
      A.sfx('boom'); A.shake(0.4); A.rumble(P, 0.9, 0.7, 300);
      A.burst(P.x, 0.9, P.z, 20, [0xff7ad1, 0xffffff, P.color], 6, { up: 3 });
      A.voice('hit', P, { p: 0.6 });
    }
  }

  function makeChest(A, [x, z]) {
    const C = { x: x + 0.5, z: z + 0.5, contested: false, key: '', mesh: null, lid: null, lab: null, glow: null };
    if (!A.headless) {
      const g = new THREE.Group();
      const body = A.mesh('box', 0.9, 0x8a5a2a, { h: 0.55, d: 0.65, rough: 0.6 }); body.position.y = 0.28;
      const band = A.mesh('box', 0.94, 0xffcc33, { h: 0.1, d: 0.69, metal: 0.8, rough: 0.3, emissive: 0x6a4500, ei: 0.4 }); band.position.y = 0.4;
      const lid = new THREE.Group(); lid.position.set(0, 0.56, -0.32);
      const lidM = A.mesh('box', 0.92, 0x9a6a32, { h: 0.18, d: 0.68 }); lidM.position.set(0, 0.09, 0.32); lid.add(lidM);
      const glow = A.mesh('disc', 1.1, 0xffd23a, { basic: true, opacity: 0.3 }); glow.position.y = 0.02;
      g.add(body, band, lid, glow);
      g.position.set(C.x, 0, C.z);
      A.add(g);
      C.mesh = g; C.lid = lid; C.glow = glow;
    }
    return C;
  }
  function openChest(A, P) {
    const S = A.S, C = S.chest;
    A.point(P.i, 15); S.opened[P.i]++;
    A.banner(`${P.name} ouvre le coffre !`, '+15 points · des pièces partout !', P.css, 2);
    A.sfx('power'); A.shake(0.35); A.rumble(P, 0.6, 0.8, 400);
    A.burst(C.x, 1, C.z, 40, [0xffd23a, 0xffffff, P.color], 7, { up: 4 });
    if (!A.headless && !coinGeo) { coinGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16); coinMat = new THREE.MeshStandardMaterial({ color: A.lin(0xffd23a), emissive: A.lin(0xb07800), emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.4 }); }
    for (let k = 0; k < 15; k++) {
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 3.5;
      const c = { x: C.x, z: C.z, y: 1, vy: 5 + Math.random() * 3, vx: Math.sin(a) * s, vz: Math.cos(a) * s, t: 0, mesh: null };
      if (!A.headless) { c.mesh = new THREE.Mesh(coinGeo, coinMat); c.mesh.rotation.x = Math.PI / 2; c.mesh.castShadow = true; A.add(c.mesh); }
      S.coins.push(c);
    }
    A.remove(C.mesh);
    S.chest = null; S.newT = 2.5;
    S.prog = A.fill(A.n, 0);
  }
  function stun(A, P, by, t, txt) {
    if (P.data.shieldT > 0) { A.say(P.x, P.z, '🛡️', '#5ad1ff', 28); return false; }
    P.stun = Math.max(P.stun, t);
    P.data.opening = false;
    if (txt) A.say(P.x, P.z, txt, '#ffd28a', 24);
    A.rumble(P, 0.5, 0.3, 160);
    return true;
  }
  function punch(A, P) {
    const S = A.S, d = P.data;
    d.cool = 1.0; d.armR = -1.9;
    A.sfx('push');
    for (const O of A.others(P)) {
      const dx = O.x - P.x, dz = O.z - P.z, dist = Math.hypot(dx, dz);
      if (dist > 1.25) continue;
      if (Math.abs(diffA(Math.atan2(dx, dz), P.face)) > 1.1 && dist > 0.6) continue;
      if (O.data.shieldT > 0) { A.say(O.x, O.z, '🛡️ Bloqué', '#5ad1ff', 24); continue; }
      if (O.data.guardT > 0) continue;   // juste frappé : un court répit
      O.data.guardT = 1.3;
      const wasOpening = O.data.opening || S.prog[O.i] > 0.3;
      A.knock(O, dx, dz, 6.5, 0.45, P);
      stun(A, O, P, 0.4);
      d.hits++; A.stat(P.i, 'hits', 1);
      A.sfx('hit');
      // trahison : frapper son allié juste après une alliance
      const al = S.allies.find((a) => ((a.a === P.i && a.b === O.i) || (a.b === P.i && a.a === O.i)) && A.clock - a.t < 6 && !a.done);
      if (al) { al.done = true; d.betray++; A.point(P.i, 2); A.banner('🗡️ Trahison !', `${P.name} frappe son allié ${O.name} (+2)`, P.css, 2); A.sfx('bad'); A.voice('traitor', O); continue; }
      // alliance : deux joueurs frappent le même ouvreur
      if (wasOpening) {
        const prev = S.lastHits.find((h) => h.target === O.i && h.by !== P.i && A.clock - h.t < 3);
        if (prev && !S.allies.some((a) => A.clock - a.t < 12 && ((a.a === prev.by && a.b === P.i) || (a.b === prev.by && a.a === P.i)))) {
          S.allies.push({ a: prev.by, b: P.i, t: A.clock });
          A.point(P.i, 1); A.point(prev.by, 1);
          d.ally++; A.players[prev.by].data.ally++;
          A.banner('🤝 Alliance !', `${A.players[prev.by].name} et ${P.name} contre ${O.name} (+1 chacun)`, '#3cff9a', 2);
        }
        S.lastHits.push({ target: O.i, by: P.i, t: A.clock });
        if (S.lastHits.length > 12) S.lastHits.shift();
      }
    }
  }
  function useItem(A, P) {
    const S = A.S, d = P.data, it = d.item;
    d.item = null; d.cool = 0.5;
    if (it === 'zap') {
      A.sfx('zap'); A.burst(P.x, 0.6, P.z, 30, [0xffd23a, 0xffffff], 7, { flat: true });
      for (const O of A.others(P)) if (A.dist(O, P) < 2.6) { stun(A, O, P, 1.2, '⚡'); A.knock(O, O.x - P.x, O.z - P.z, 5, 0); }
    } else if (it === 'bomb') {
      let tx = P.x + Math.sin(P.face) * 4.5, tz = P.z + Math.cos(P.face) * 4.5;
      tx = A.clamp(tx, 1.5, W - 1.5); tz = A.clamp(tz, 1.5, D - 1.5);
      const b = { sx: P.x, sz: P.z, tx, tz, x: P.x, z: P.z, y: 0, t: 0, owner: P, mesh: A.headless ? null : A.mesh('ball', 0.25, 0x24262c, { metal: 0.4 }) };
      if (b.mesh) A.add(b.mesh);
      S.bombs.push(b); A.sfx('whoosh');
    } else if (it === 'trap') {
      const t = { x: P.x, z: P.z, owner: P, mesh: null };
      if (!A.headless) { t.mesh = A.mesh('ring', 0.35, P.color, { basic: true }); t.mesh.position.set(P.x, 0.03, P.z); A.add(t.mesh); }
      S.traps.push(t); A.sfx('tick');
      A.say(P.x, P.z, '🪤 posé', P.css, 22);
    }
  }
  function spawnBox(A) {
    const S = A.S;
    if (S.boxes.length >= 3) return;
    let x, z, n = 0;
    do { x = A.rint(1, W - 2); z = A.rint(1, D - 2); n++; } while ((layout(x, z) !== 0 || TPS.some(([tx, tz]) => tx === x && tz === z) || S.pends.some((pd) => inStrip(pd, x, z)) || (S.chest && Math.hypot(x + 0.5 - S.chest.x, z + 0.5 - S.chest.z) < 2) || S.boxes.some((b) => Math.hypot(b.x - x - 0.5, b.z - z - 0.5) < 4)) && n < 120);
    const type = A.pick(Object.keys(ITEMS));
    const T = ITEMS[type];
    let mesh = null;
    if (!A.headless) {
      mesh = new THREE.Group();
      const base = A.mesh('box', 0.5, T.color, { emissive: T.color, ei: 0.4 }); base.position.y = 0.28;
      const lab = A.label(T.icon, { size: 40, h: 0.6, bg: 'rgba(14,11,9,0.75)' }); lab.position.y = 1.0;
      mesh.add(base, lab); mesh.userData.lab = lab;
      mesh.position.set(x + 0.5, 0, z + 0.5); A.add(mesh);
    }
    S.boxes.push({ x: x + 0.5, z: z + 0.5, type, mesh });
  }
  function crownMesh(A) {
    const g = new THREE.Group();
    const ring = A.mesh('cyl', 0.22, 0xffcc33, { h: 0.14, metal: 0.8, emissive: 0x8a6000, ei: 0.6 });
    g.add(ring);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const s = A.mesh('box', 0.08, 0xffcc33, { h: 0.18, metal: 0.8, emissive: 0x8a6000, ei: 0.6 }); s.position.set(Math.cos(a) * 0.19, 0.14, Math.sin(a) * 0.19); g.add(s); }
    return g;
  }

  /* ==================================================================
     LE DÉCOR (seulement avec rendu) : portes, pics, balanciers, runes
     du passage secret, quelques cristaux. Géométries partagées.
     ================================================================== */
  function buildDecor(A) {
    const S = A.S;
    const dec = S.decor = { tpRing: [], tpFlash: [0, 0], pend: [] };
    dec.spikeCold = new THREE.MeshStandardMaterial({ color: A.lin(0x2a2440), roughness: 0.7 });
    dec.spikeHot = new THREE.MeshBasicMaterial({ color: A.lin(0xff3a5a), toneMapped: false });
    if (!spikeGeo) spikeGeo = new THREE.ConeGeometry(0.1, 0.45, 6);
    for (const g of S.gates) {
      const m = A.mesh('box', 0.9, 0xff7ad1, { h: 0.9, emissive: 0xff7ad1, ei: 0.5, opacity: 0.85 });
      m.position.set(g.x + 0.5, 0.45, g.z + 0.5); A.add(m); g.mesh = m;
    }
    const baseGeo = new THREE.BoxGeometry(0.9, 0.06, 0.9);
    for (const sp of S.spikes) {
      const grp = new THREE.Group();
      const base = new THREE.Mesh(baseGeo, dec.spikeCold); base.position.y = 0.03; grp.add(base);
      const spikes = new THREE.Group();
      for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(spikeGeo, OT.Models.MAT.spike); c.position.set(-0.28 + i * 0.28, 0.22, -0.28 + k * 0.28); spikes.add(c); }
      grp.add(spikes); grp.userData.sp = spikes; grp.userData.base = base;
      grp.position.set(sp.x + 0.5, 0, sp.z + 0.5); A.add(grp); sp.mesh = grp;
    }
    // ----- les balanciers : poutre, chaîne, boule à pics, ombre, couloir rouge -----
    const beamMat = new THREE.MeshStandardMaterial({ color: A.lin(0x4a3a6a), roughness: 0.6, metalness: 0.4 });
    const chainMat = new THREE.MeshStandardMaterial({ color: A.lin(0x9a9aaa), metalness: 0.8, roughness: 0.3 });
    const ballMat = new THREE.MeshStandardMaterial({ color: A.lin(0x2a2a34), metalness: 0.7, roughness: 0.35, emissive: A.lin(0x3a0a2a), emissiveIntensity: 0.6 });
    const ballGeo = new THREE.IcosahedronGeometry(PEND.head * 0.85, 1);
    const pickGeo = new THREE.ConeGeometry(0.1, 0.38, 6);
    for (const pd of S.pends) {
      const o = {};
      // la poutre : deux poteaux contre les murs et une barre en haut
      // la poutre repose sur deux poteaux plantés dans les murs du hall (x 8 et x 20)
      const span = W - 1 - 2 * 8;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(span + 0.3, 0.22, 0.22), beamMat);
      beam.position.set(pd.x, PEND.top + 0.1, pd.z); A.add(beam);
      for (const px of [8.5, W - 8.5]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, PEND.top - 0.7, 0.24), beamMat);
        post.position.set(px, 0.9 + (PEND.top - 0.7) / 2, pd.z); post.castShadow = true; A.add(post);
      }
      const pivot = new THREE.Group(); pivot.position.set(pd.x, PEND.top, pd.z); A.add(pivot);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, PEND.len, 6), chainMat);
      chain.position.y = -PEND.len / 2; pivot.add(chain);
      const ball = new THREE.Group(); ball.position.y = -PEND.len; pivot.add(ball);
      const core = new THREE.Mesh(ballGeo, ballMat); core.castShadow = true; ball.add(core);
      for (let k = 0; k < 10; k++) {
        const c = new THREE.Mesh(pickGeo, OT.Models.MAT.spike || chainMat);
        const a = k * 2.4, b = Math.acos(1 - 2 * (k + 0.5) / 10);
        const v = new THREE.Vector3(Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a));
        c.position.copy(v).multiplyScalar(PEND.head * 0.85);
        c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
        ball.add(c);
      }
      // le couloir balayé : rouge pâle au repos, rouge vif qui clignote à l'alerte
      const strip = A.mesh('box', 1, 0xff3a5a, { h: 0.02, basic: true, opacity: 0.12 });
      strip.scale.set(PSTRIP[1] - PSTRIP[0] + 1, 1, 2); strip.position.set((PSTRIP[0] + PSTRIP[1] + 1) / 2, 0.025, pd.z0 + 1); A.add(strip);
      // l'ombre de la boule (plus nette quand elle est basse)
      const shadow = A.mesh('disc', 0.55, 0x000000, { basic: true, opacity: 0.4 });
      shadow.position.y = 0.03; A.add(shadow);
      Object.assign(o, { pivot, ball, strip, shadow });
      dec.pend.push(o);
    }
    // ----- le passage secret : des runes violettes qui tournent -----
    TPS.forEach(([x, z], k) => {
      const ring = A.mesh('ring', 0.5, 0xb78cff, { basic: true, opacity: 0.85 });
      ring.position.set(x + 0.5, 0.04, z + 0.5); A.add(ring);
      const inner = A.mesh('ring', 0.3, 0xff7ad1, { basic: true, opacity: 0.8 });
      inner.position.set(x + 0.5, 0.05, z + 0.5); A.add(inner);
      const disc = A.mesh('disc', 0.4, 0x2a1050, { basic: true, opacity: 0.8 });
      disc.position.set(x + 0.5, 0.03, z + 0.5); A.add(disc);
      const sign = A.label(k === 0 ? 'PASSAGE ⇄ EST' : 'OUEST ⇄ PASSAGE', { size: 22, h: 0.3, color: '#b78cff', border: '#b78cff' });
      sign.position.set(x + 0.5, 1.0, z + 0.5); A.add(sign);
      dec.tpRing.push({ ring, inner, sign });
    });
    // ----- quelques cristaux sur les piliers (ambiance) -----
    const crysGeo = new THREE.OctahedronGeometry(0.22, 0);
    const crysMat = new THREE.MeshBasicMaterial({ color: A.lin(0xff7ad1), toneMapped: false });
    dec.crys = [];
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      if (Q[Math.min(z, D - 1 - z)][Math.min(x, W - 1 - x)] !== 'P') continue;
      const c = new THREE.Mesh(crysGeo, crysMat); c.position.set(x + 0.5, 1.25, z + 0.5); A.add(c); dec.crys.push(c);
    }
  }
  function drawDecor(A, dt, time) {
    const S = A.S, dec = S.decor;
    if (!dec) return;
    S.pends.forEach((pd, k) => {
      const o = dec.pend[k];
      o.pivot.rotation.z = pd.th;           // rotation autour de z : la boule part vers +x quand th > 0
      o.shadow.position.x = pd.hx; o.shadow.position.z = pd.z;
      const low = Math.max(0, Math.min(1, (2.4 - pd.hy) / 1.8));
      o.shadow.scale.setScalar(0.6 + low * 0.6); o.shadow.material.opacity = 0.15 + low * 0.35;
      const hot = pd.st === 'warn' ? (Math.sin(time * 18) > 0 ? 0.55 : 0.2) : pd.st === 'swing' ? 0.32 : 0.1;
      o.strip.material.opacity = hot;
    });
    dec.tpRing.forEach((r, k) => {
      dec.tpFlash[k] = Math.max(0, dec.tpFlash[k] - dt * 2);
      const f = dec.tpFlash[k];
      r.ring.rotation.z = time * 1.5; r.inner.rotation.z = -time * 2.2;
      r.ring.scale.setScalar(1 + f * 0.6 + Math.sin(time * 3 + k) * 0.05);
      r.sign.quaternion.copy(A.camera.quaternion);
    });
    for (const c of dec.crys) { c.rotation.y = time * 1.2; c.position.y = 1.25 + Math.sin(time * 2 + c.position.x) * 0.06; }
  }
})();
