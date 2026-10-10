/* =====================================================================
   🪙 VOLE-MOI ÇA ! — ramasse, cache, vole
   La grande place d'OSWEL City (29×19, version 1.4) :
   - 4 COFFRES (3×3) dans les coins, chacun dans une niche à deux
     entrées (une vers le marché, une vers la voie du tram) ;
   - au centre, la FONTAINE, entourée de kiosques et d'arbres ;
   - en haut et en bas, le MARCHÉ : des étals qui forment des ruelles
     (routes alternatives, couverts pour semer un poursuivant) ;
   - deux VOIES DE TRAM (nord et sud) traversent toute la place : les
     feux et la voie clignotent ~1,6 s, puis le TRAM passe à toute
     vitesse ; il bouscule ceux qui sont dessus et leur fait lâcher
     une partie du sac (il renverse même le Percepteur !) ;
   - deux BOUCHES D'ÉGOUT reliées (ouest ↔ est) : on entre dans l'une,
     on ressort de l'autre (raccourci, fuite) ;
   Règles (inchangées) :
   - le SAC alourdit : plus il est plein, plus on est lent ;
   - A : coup de sac → la victime lâche 30 % de son sac par terre ;
   - B : sprint ;
   - rester dans son coffre dépose les pièces à l'abri ;
   - bonus : vitesse, bouclier, ×2, aimant, pied-de-biche (piller les
     coffres des autres) ;
   - événements : pluies de pièces, pièces géantes, le Percepteur, le tram.
   Le plus de pièces (sac + coffre) au bout de 2 minutes gagne.
   ===================================================================== */
(function () {
  const W = 29, D = 19, TIME = 120;
  // codes de cases propres à ce jeu (tous solides) : on les dessine nous-mêmes
  const FOUNT = 11, STALL = 12, KIOSK = 13, TREE = 14;
  const BANKS = [[1, 1], [W - 4, D - 4], [W - 4, 1], [1, D - 4]];   // coin haut-gauche de chaque coffre (3×3)
  // les deux voies du tram : 2 rangées chacune (z0 et z0 + 1), axe au milieu
  const LANES = [{ z0: 5, zc: 6 }, { z0: 12, zc: 13 }];
  const TRAM = { L: 4.2, half: 0.82, speed: 15, warn: 1.6 };       // longueur, demi-largeur, cases/s, alerte (s)
  // les bouches d'égout (reliées entre elles)
  const SEWERS = [[6, 9], [W - 7, 9]];
  const BONUS = {
    speed:  { icon: '⚡', name: 'Vitesse', color: 0x3cff9a, t: 8 },
    shield: { icon: '🛡️', name: 'Bouclier', color: 0x5ad1ff, t: 10 },
    double: { icon: '✖2', name: 'Pièces ×2', color: 0xffd23a, t: 8 },
    magnet: { icon: '🧲', name: 'Aimant', color: 0xff5a5a, t: 8 },
    crow:   { icon: '🦝', name: 'Pied-de-biche', color: 0xb78cff, t: 9 },
  };
  const inBank = (k, x, z) => { const [bx, bz] = BANKS[k]; return x >= bx && x < bx + 3 && z >= bz && z < bz + 3; };
  const bankOf = (A, x, z) => { for (let k = 0; k < A.n; k++) if (inBank(k, Math.floor(x), Math.floor(z))) return k; return -1; };
  const laneOf = (z) => { const r = Math.floor(z); for (let k = 0; k < LANES.length; k++) if (r === LANES[k].z0 || r === LANES[k].z0 + 1) return k; return -1; };

  /* ---------- La disposition : un quart de la place, recopié en miroir ----------
     # mur · b coffre · s étal · k kiosque · t arbre · F fontaine · = voie du tram · M égout
     (le quart va de x 0 à 14 et de z 0 à 9 ; la place est symétrique : départs équitables) */
  const Q = [
    '###############',
    '#bbb#..........',
    '#bbb#.sss.ss.s.',
    '#bbb..sss.ss...',
    '#.##...........',
    '===============',
    '===============',
    '#..........t...',
    '#..k.....kk..FF',
    '#.....M......FF',
  ];
  const CODE = { '#': 1, b: 0, '.': 0, '=': 0, M: 0, s: STALL, k: KIOSK, t: TREE, F: FOUNT };
  function layout(x, z) { return CODE[Q[Math.min(z, D - 1 - z)][Math.min(x, W - 1 - x)]]; }

  let coinGeo = null, coinMat = null;
  function coinMesh(A, big) {
    if (A.headless) return null;
    if (!coinGeo) { coinGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16); coinMat = new THREE.MeshStandardMaterial({ color: A.lin(0xffd23a), emissive: A.lin(0xb07800), emissiveIntensity: 0.9, metalness: 0.35, roughness: 0.35 }); }
    const m = new THREE.Mesh(coinGeo, coinMat);
    m.rotation.x = Math.PI / 2; m.castShadow = true;
    if (big) m.scale.setScalar(2.2);
    A.add(m);
    return m;
  }

  OT.Arena.register({
    id: 'vole', name: 'Vole-moi ça !', icon: '🪙', color: '#ffd24a', theme: 'city', music: 'ville',
    tagline: 'Ramasse des pièces, mets-les à l\'abri… et vole celles des autres.',
    goal: 'Être le plus riche (sac + coffre) au bout de 2 minutes.',
    howto: [
      'Ramasse les pièces avec {move} : plus ton sac est plein, plus tu es lent.',
      '{a} : coup de sac, la victime lâche 30 % de ses pièces. {b} : sprint.',
      'Reste dans ton coffre (ton coin) pour mettre ton sac à l\'abri.',
      'Bouche d\'égout : entre dans l\'une, ressors de l\'autre !',
    ],
    danger: 'Quand une voie clignote, le TRAM arrive : sors-en ou il te vide le sac ! Gare aussi au Percepteur.',
    win: 'Le plus de pièces (sac + coffre) à la fin.',
    lose: 'Un sac plein qui traîne, c\'est des pièces pour les autres : dépose souvent !',
    tuto: ['Déplace-toi : {move}', '{a} : coup de sac', '{b} : sprint'],
    rules: [
      'Ramasse les pièces. Plus ton sac est plein, plus tu es lent !',
      'A : coup de sac. La victime lâche 30 % de son sac par terre, pour tout le monde.',
      'Reste dans ton coffre (ton coin, à ta couleur) pour mettre tes pièces à l\'abri.',
      'Quand la voie clignote, le tram arrive : il vide les sacs ! Les égouts relient l\'ouest et l\'est.',
      'Bonus : ⚡ vitesse, 🛡️ bouclier, ✖2, 🧲 aimant, 🦝 pied-de-biche pour piller les coffres. Gare au Percepteur !',
    ],
    controls: { a: 'Coup de sac', b: 'Sprint' },
    rounds: 1, scoreName: 'pièces', maxRound: TIME + 5,
    view: () => ({ x0: 0, z0: 0, x1: W, z1: D }),
    tilt: 31,
    camMin: 0.62,          // la caméra suit l'action sans montrer moins que cette part de la place

    round(A) {
      const S = A.S;
      A.buildGrid(W, D, layout, 'city', { solid: [FOUNT, STALL, KIOSK, TREE] });
      S.coins = []; S.boxes = []; S.wave = 1.5; S.boxT = 5;
      S.events = { rain1: false, giant1: false, tax: false, giant2: false, rain2: false };
      S.tax = null; S.bankMesh = [];
      // le tram : au repos, puis alerte, puis il passe (les voies alternent)
      S.tram = { st: 'idle', t: 17, lane: A.rint(0, 1), dir: 1, x: -99, hit: {}, n: 0, bell: 0 };
      // distances (en cases) depuis chaque bouche d'égout : pour que les bots sachent quand prendre le raccourci
      S.sewDist = SEWERS.map(([sx, sz]) => distField(A, sx, sz));
      A.players.forEach((P, i) => {
        const [bx, bz] = BANKS[i];
        A.place(P, bx + 1.5, bz + 1.5);
        P.speed = 4.6; P.r = 0.32;
        P.data = { bag: 0, safe: 0, cool: 0, dashCool: 0, dashT: 0, depCd: 0, shield: 0, buffT: {}, hits: 0, stolen: 0, lost: 0, picked: 0, sewCd: 0, sewIn: -1, tram: 0 };
      });
      if (!A.headless) buildDecor(A);
    },

    blocks(A, cx, cz, P) { return false; },
    bodies: true,
    speedMod(A, P) {
      const d = P.data;
      let k = Math.max(0.52, 1 - d.bag * 0.012);
      if (d.buffT.speed > 0) k *= 1.4;
      if (d.dashT > 0) k *= 2.1;
      return k;
    },

    update(A, dt) {
      const S = A.S;
      const left = TIME - A.t;
      // pièces : petites vagues régulières (plus grosses : la place est deux fois plus grande), et des événements
      S.wave -= dt;
      if (S.wave <= 0) { S.wave = 3.2; for (let k = 0; k < 7; k++) dropCoin(A, null, null, 1); }
      if (!S.events.rain1 && A.t > 32) { S.events.rain1 = true; rain(A, 40); }
      if (!S.events.giant1 && A.t > 48) { S.events.giant1 = true; giant(A); }
      if (!S.events.tax && A.t > 64) { S.events.tax = true; startTax(A); }
      if (!S.events.giant2 && A.t > 86) { S.events.giant2 = true; giant(A); }
      if (!S.events.rain2 && A.t > 97) { S.events.rain2 = true; rain(A, 45); }
      // bonus
      S.boxT -= dt;
      if (S.boxT <= 0) { S.boxT = 7; spawnBox(A); }
      // le tram
      tramUpdate(A, dt);
      for (const P of A.players) {
        const d = P.data;
        if (!P.alive || P.out) continue;
        for (const k in d.buffT) d.buffT[k] = Math.max(0, d.buffT[k] - dt);
        d.cool = Math.max(0, d.cool - dt); d.dashCool = Math.max(0, d.dashCool - dt); d.sewCd = Math.max(0, d.sewCd - dt);
        if (P.in.bP && d.dashCool <= 0) { d.dashT = 0.22; d.dashCool = 2.2; A.sfx('whoosh'); }
        // coup de sac
        if (P.in.aP && d.cool <= 0) {
          d.cool = 0.65;
          P.data.armR = -2.2; P.data.swingCd = 0.2;
          A.sfx('push');
          for (const O of A.others(P)) {
            const dx = O.x - P.x, dz = O.z - P.z, dist = Math.hypot(dx, dz);
            if (dist > 1.2) continue;
            const ang = Math.abs(diffA(Math.atan2(dx, dz), P.face));
            if (ang > 1.1 && dist > 0.55) continue;
            hit(A, P, O);
          }
        }
        if (d.swingCd > 0) d.swingCd -= dt; else delete P.data.armR;
        // ramasser
        const mag = d.buffT.magnet > 0 ? 3.6 : 0;
        for (const c of S.coins) {
          if (c.dead || c.t < c.wait) continue;
          const dd = Math.hypot(c.x - P.x, c.z - P.z);
          if (mag && dd < mag && dd > 0.4) { c.x += (P.x - c.x) / dd * 7 * dt; c.z += (P.z - c.z) / dd * 7 * dt; }
          if (dd < 0.55) {
            c.dead = true; A.remove(c.mesh);
            const v = c.v * (d.buffT.double > 0 ? 2 : 1);
            d.bag += v; d.picked += v; A.stat(P.i, 'picked', v);
            A.sfx('coin');
            if (c.v >= 10) { A.say(P.x, P.z, `+${v} !`, '#ffd23a', 34); A.voice('item', P); }
          }
        }
        // déposer dans son coffre
        const bk = bankOf(A, P.x, P.z);
        if (bk === P.i && d.bag > 0) {
          d.depCd -= dt;
          if (d.depCd <= 0) { d.depCd = 1 / 7; d.bag--; d.safe++; A.tone('triangle', 700 + (d.safe % 8) * 40, 900, 0.05, 0.06); }
        } else d.depCd = 0;
        // piller un coffre (pied-de-biche)
        if (bk >= 0 && bk !== P.i && d.buffT.crow > 0) {
          const V = A.players[bk];
          d.robCd = (d.robCd || 0) - dt;
          if (d.robCd <= 0 && V.data.safe > 0) { d.robCd = 0.25; V.data.safe--; d.bag++; d.stolen++; A.stat(P.i, 'stolen', 1); A.sfx('coin'); if (Math.random() < 0.15) A.say(P.x, P.z, '🦝 Cambriolage !', '#b78cff', 26); }
        }
        // les bouches d'égout : on entre dans l'une, on ressort de l'autre
        sewer(A, P);
        // bonus
        for (const b of S.boxes) if (!b.dead && Math.hypot(b.x - P.x, b.z - P.z) < 0.6) {
          b.dead = true; A.remove(b.mesh);
          const T = BONUS[b.type];
          if (b.type === 'shield') d.shield = 1;
          d.buffT[b.type] = T.t;
          A.sfx('power'); A.say(P.x, P.z, T.icon + ' ' + T.name, '#ffd28a', 26);
          A.voice('item', P);
        }
      }
      S.boxes = S.boxes.filter((b) => !b.dead);
      // les pièces qui volent retombent
      for (const c of S.coins) {
        if (c.dead) continue;
        c.t += dt;
        if (c.vx || c.vz) {
          const nx = c.x + c.vx * dt, nz = c.z + c.vz * dt;
          if (!A.grid.solid(Math.floor(nx), Math.floor(nz)) && nx > 0.3 && nx < W - 0.3) { c.x = nx; c.z = nz; } else { c.vx *= -0.4; c.vz *= -0.4; }
          c.vx *= Math.exp(-4 * dt); c.vz *= Math.exp(-4 * dt);
          if (Math.abs(c.vx) + Math.abs(c.vz) < 0.1) c.vx = c.vz = 0;
        }
        c.y = Math.max(0.25, c.y + c.vy * dt); c.vy -= 18 * dt; if (c.y <= 0.25) c.vy = 0;
      }
      S.coins = S.coins.filter((c) => !c.dead);
      // le Percepteur
      if (S.tax) taxUpdate(A, dt);
      if (left <= 0) {
        const tot = A.players.map((P) => P.data.bag + P.data.safe);
        A.players.forEach((P) => { A.score[P.i] = tot[P.i]; });
        const best = Math.max(...tot), w = A.players.filter((P) => tot[P.i] === best);
        A.endRound({ winners: w.map((P) => P.i), text: w.length > 1 ? 'Égalité !' : `${w[0].name} est le plus riche !`, sub: `${best} pièces`, color: w[0].css });
      }
    },

    draw(A, dt, time) {
      const S = A.S;
      for (const c of S.coins) if (c.mesh) { c.mesh.position.set(c.x, c.y + Math.sin(time * 4 + c.x) * 0.05, c.z); c.mesh.rotation.z = time * 3 + c.x; }
      for (const b of S.boxes) if (b.mesh) { b.mesh.position.y = Math.sin(time * 3 + b.x) * 0.08; b.mesh.userData.lab.quaternion.copy(A.camera.quaternion); }
      for (const P of A.players) {
        const B = S.bankMesh[P.i];
        if (B && B.val !== P.data.safe) {
          B.val = P.data.safe; A.remove(B.lab);
          B.lab = A.label('🏦 ' + B.val, { size: 30, h: 0.42, color: P.css, border: P.css });
          B.lab.position.set(B.bx + 1.5, 1.1, B.bz + 1.5); A.add(B.lab);
        }
        if (B) B.lab.quaternion.copy(A.camera.quaternion);
        // le sac : une petite bourse qui grossit sur le dos
        if (!P.bagMesh && !A.headless) { P.bagMesh = A.mesh('ball', 0.2, 0xc98a3a, { rough: 0.8 }); A.add(P.bagMesh); }
        if (P.bagMesh) {
          const s = Math.min(2.2, 0.6 + P.data.bag * 0.04);
          P.bagMesh.scale.setScalar(s);
          P.bagMesh.visible = P.data.bag > 0 && P.alive;
          P.bagMesh.position.set(P.x - Math.sin(P.face) * 0.3, 0.55 + s * 0.12, P.z - Math.cos(P.face) * 0.3);
        }
        if (P.data.shield && !A.headless) {
          if (!P.shieldMesh) { P.shieldMesh = A.mesh('ball', 0.6, 0x5ad1ff, { basic: true, opacity: 0.25 }); A.add(P.shieldMesh); }
          P.shieldMesh.visible = true; P.shieldMesh.position.set(P.x, 0.6, P.z);
        } else if (P.shieldMesh) P.shieldMesh.visible = false;
      }
      if (S.tax && S.tax.mesh) { S.tax.mesh.position.set(S.tax.x, 0, S.tax.z); S.tax.mesh.rotation.y = S.tax.face + (S.tax.stunT > 0 ? time * 14 : 0); S.tax.lab.position.set(S.tax.x, 2.1, S.tax.z); S.tax.lab.quaternion.copy(A.camera.quaternion); }
      drawDecor(A, dt, time);
    },

    // flèches d'objectif : ton coffre quand ton sac est bien rempli, la pièce géante
    goals(A) {
      const S = A.S, out = [];
      if (!S.coins) return out;
      for (const P of A.players) {
        if (!P.human || !P.alive || P.out || P.data.bag < 8 || bankOf(A, P.x, P.z) === P.i) continue;
        const [bx, bz] = BANKS[P.i];
        out.push({ x: bx + 1.5, z: bz + 1.5, color: P.color, label: 'TON COFFRE' });
      }
      const g = S.coins.find((c) => !c.dead && c.v >= 10);
      if (g) out.push({ x: g.x, z: g.z, color: 0xffd23a, label: '+10' });
      return out;
    },

    hud(A) {
      const S = A.S, T = S.tram;
      return {
        timer: TIME - A.t,
        note: T && T.st === 'warn' ? '🚋 Le tram arrive ! Sortez de la voie !' : S.tax ? '🎩 Le Percepteur est là !' : '',
        rows: A.players.map((P) => ({ i: P.i, txt: `👜${P.data.bag} 🏦${P.data.safe}${Object.keys(P.data.buffT).filter((k) => P.data.buffT[k] > 0).map((k) => ' ' + BONUS[k].icon).join('')}` })),
      };
    },
    rush(A) { return TIME - A.t < 15 ? 1.2 : 1; },

    stats(A, P) {
      const d = P.data;
      return [`${d.safe} au coffre`, `${d.bag} dans le sac`, `${d.hits} coups réussis`, `${d.stolen} volées`, `${d.lost} perdues`];
    },
    bonus(A, P) { const out = []; if (P.data.stolen >= 5) out.push('Cambrioleur'); if (P.data.hits >= 6) out.push('Coup de sac en or'); return out; },
    tiebreak(A, i) { return A.players[i].data.safe; },

    /* ---------- LE BOT ---------- */
    bot(A, P, B, L) {
      const S = A.S, d = P.data;
      const left = TIME - A.t;
      const bk = BANKS[P.i];
      const home = [bk[0] + 1.5, bk[1] + 1.5];
      const enemies = A.others(P);
      const threat = enemies.filter((O) => A.dist(O, P) < 2.2);
      // 0) le tram arrive sur ma voie : je sors par le côté le plus proche
      const esc = tramEscape(A, P);
      if (esc) { if (d.dashCool <= 0 && S.tram.st === 'go' && Math.random() < L.skill) esc.tapB = true; return esc; }
      // 1) mettre le sac à l'abri (la place est grande : on rentre un peu plus tôt quand on est loin)
      const far = Math.hypot(P.x - home[0], P.z - home[1]);
      const limit = L.id === 'facile' ? 26 : L.id === 'chaos' ? 40 : 14 + (threat.length ? -4 : 6) - far * 0.15;
      if (d.bag > 0 && (d.bag >= limit || left < 8 + far * 0.25 + d.bag * 0.15 || (S.tax && d.bag > 8))) {
        if (bankOf(A, P.x, P.z) === P.i) return A.Bot.toward(P, home[0], home[1], 0.3);
        const out = goTo(A, P, home[0], home[1]);
        if (threat.length && d.dashCool <= 0 && Math.random() < L.skill) out.tapB = true;
        return out;
      }
      // 2) pied-de-biche : piller le coffre le plus riche
      if (d.buffT.crow > 1.5) {
        const rich = enemies.slice().sort((a, b) => b.data.safe - a.data.safe)[0];
        if (rich && rich.data.safe >= 4) { const [rx, rz] = BANKS[rich.i]; return goTo(A, P, rx + 1.5, rz + 1.5); }
      }
      // 3) attaquer un sac bien rempli à portée
      const prey = enemies.filter((O) => O.data.bag >= 4 && !(O.inv > 0) && A.dist(O, P) < 5.5 && !laneDanger(A, O.z)).sort((a, b) => b.data.bag / (A.dist(a, P) + 1) - a.data.bag / (A.dist(b, P) + 1))[0];
      if (prey && (Math.random() < L.aggro || L.chaos)) {
        const dd = A.dist(prey, P);
        const out = A.Bot.dir(P, prey.x + prey.vx * 0.2, prey.z + prey.vz * 0.2);
        if (dd < 1.0) out.tapA = true;
        else if (dd < 2.6 && d.dashCool <= 0 && Math.random() < L.skill * 0.6) out.tapB = true;
        return out;
      }
      // 4) un bonus pas loin
      const box = A.Bot.nearest(P, S.boxes.filter((b) => !laneDanger(A, b.z)));
      if (box && box.d < 7) return goTo(A, P, box.o.x, box.o.z);
      // 5) ramasser : la pièce la plus intéressante (valeur / distance, pas trop près des autres, pas sur la voie du tram)
      let best = null, bs = -1;
      for (const c of S.coins) {
        if (c.t < c.wait * 0.5 || laneDanger(A, c.z)) continue;
        const dd = Math.hypot(c.x - P.x, c.z - P.z);
        const rival = enemies.reduce((m, O) => Math.min(m, Math.hypot(c.x - O.x, c.z - O.z)), 99);
        const s = c.v / (dd + 1) * (rival < dd * 0.7 ? 0.5 : 1) * (0.8 + Math.random() * 0.4 * (1 - L.skill));
        if (s > bs) { bs = s; best = c; }
      }
      if (best) return goTo(A, P, best.x, best.z);
      return goTo(A, P, W / 2 + (P.i % 2 ? 5 : -5), D / 2 + (P.i < 2 ? -2 : 2));
    },
    // garde-fou : on n'entre pas sur une voie qui clignote (le Facile se trompe parfois)
    botGuard(A, P, mx, mz, L) {
      if (Math.random() < L.mistake * 0.02) return [mx, mz];
      const T = A.S.tram;
      if (!T || T.st === 'idle') return [mx, mz];
      const lz = LANES[T.lane];
      const inLane = (z) => { const r = Math.floor(z); return r === lz.z0 || r === lz.z0 + 1; };
      if (inLane(P.z)) return [mx, mz];
      if (inLane(P.z + mz * 0.6)) return [mx, 0];
      return [mx, mz];
    },
  });

  function diffA(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

  /* ---------- Les bots : chemins (avec les égouts) et danger du tram ---------- */
  // une voie est dangereuse quand ses feux clignotent ou que le tram roule dessus
  function laneDanger(A, z) {
    const T = A.S.tram;
    if (!T || T.st === 'idle') return false;
    return laneOf(z) === T.lane;
  }
  // carte des distances (en cases) depuis une case, en évitant les murs
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
    const pass = (gx, gz) => !A.grid.solid(gx, gz) && !laneDanger(A, gz);
    if (Math.abs(tx - cx) + Math.abs(tz - cz) <= 1 || !A.grid.solid(tx, tz) && clearLine(A, P, x, z)) return A.Bot.toward(P, x, z, 0.1);
    const path = A.Bot.bfs(cx, cz, (gx, gz) => gx === tx && gz === tz, pass, 900);
    // raccourci par les égouts : si « entrer ici + ressortir là-bas » est nettement plus court
    if (P.data.sewCd <= 0 && S.sewDist) {
      const here = cz * W + cx, there = tz * W + tx;
      const direct = path ? path.length : 999;
      for (let k = 0; k < 2; k++) {
        const a = S.sewDist[k][here], b = S.sewDist[1 - k][there];
        if (a < 0 || b < 0) continue;
        if (a + b + 3 < direct) {
          const [sx, sz] = SEWERS[k];
          if (a <= 1) return A.Bot.toward(P, sx + 0.5, sz + 0.5, 0.05);
          const p2 = A.Bot.bfs(cx, cz, (gx, gz) => gx === sx && gz === sz, pass, 900);
          if (p2) return A.Bot.follow(P, p2);
        }
      }
    }
    if (path) return A.Bot.follow(P, path);
    // pas de chemin : le tram coupe la route → on s'approche quand même et on attend au bord de la voie
    if (S.tram && S.tram.st !== 'idle') {
      const p3 = A.Bot.bfs(cx, cz, (gx, gz) => gx === tx && gz === tz, (gx, gz) => !A.grid.solid(gx, gz), 900);
      if (p3) { const k = p3.findIndex(([gx, gz]) => laneDanger(A, gz)); const cut = k < 0 ? p3 : p3.slice(0, k); if (cut.length) return A.Bot.follow(P, cut); }
      return { mx: 0, mz: 0 };
    }
    return A.Bot.toward(P, x, z, 0.1);
  }
  function clearLine(A, P, x, z) {
    const n = Math.ceil(Math.hypot(x - P.x, z - P.z) * 3);
    for (let k = 1; k <= n; k++) { const px = P.x + (x - P.x) * k / n, pz = P.z + (z - P.z) * k / n; if (A.hitsWall(px, pz, 0.32) || laneDanger(A, pz)) return false; }
    return true;
  }
  // sur une voie qui va être balayée : rejoindre la rangée libre la plus proche
  function tramEscape(A, P) {
    const T = A.S.tram;
    if (!T || T.st === 'idle') return null;
    const lz = LANES[T.lane];
    const r = Math.floor(P.z);
    if (r !== lz.z0 && r !== lz.z0 + 1) return null;
    // le tram est déjà passé à ma hauteur : plus de danger
    if (T.st === 'go' && (T.dir > 0 ? T.x - TRAM.L / 2 > P.x + 0.5 : T.x + TRAM.L / 2 < P.x - 0.5)) return null;
    const cx = Math.floor(P.x);
    const up = lz.z0 - 1, down = lz.z0 + 2;
    const options = [[up, Math.abs(P.z - (up + 0.5))], [down, Math.abs(P.z - (down + 0.5))]].sort((a, b) => a[1] - b[1]);
    for (const [row] of options) {
      for (const ox of [0, 1, -1, 2, -2]) {
        if (!A.grid.solid(cx + ox, row) && cx + ox > 0 && cx + ox < W - 1) return A.Bot.toward(P, cx + ox + 0.5, row + 0.5, 0.05);
      }
    }
    return A.Bot.toward(P, P.x, options[0][0] + 0.5, 0.05);
  }

  function freeCell(A) {
    for (let k = 0; k < 80; k++) {
      const x = A.rint(1, W - 2), z = A.rint(1, D - 2);
      if (A.grid.solid(x, z)) continue;
      if (BANKS.some((_, i) => inBank(i, x, z))) continue;
      if (SEWERS.some(([sx, sz]) => sx === x && sz === z)) continue;
      return [x, z];
    }
    return [Math.floor(W / 2), 3];
  }
  function dropCoin(A, x, z, v) {
    if (x === null || x === undefined) { const c = freeCell(A); x = c[0] + 0.3 + Math.random() * 0.4; z = c[1] + 0.3 + Math.random() * 0.4; }
    const c = { x, z, y: 3 + Math.random() * 2, vy: 0, vx: 0, vz: 0, v, t: 0, wait: 0, mesh: coinMesh(A, v >= 10) };
    A.S.coins.push(c);
    return c;
  }
  function rain(A, n) {
    A.banner('Pluie de pièces !', 'Ramassez tout !', '#ffd23a', 1.8);
    A.sfx('power');
    for (let k = 0; k < n; k++) dropCoin(A, null, null, 1);
  }
  function giant(A) {
    // la pièce géante tombe loin des coffres (ni dans une niche, ni sur une voie)
    let c = freeCell(A);
    for (let k = 0; k < 30 && (laneOf(c[1]) >= 0 || c[1] < 4 || c[1] > D - 5); k++) c = freeCell(A);
    dropCoin(A, c[0] + 0.5, c[1] + 0.5, 10);
    A.banner('La pièce géante !', 'Elle vaut 10… mais elle pèse lourd', '#ffd23a', 2);
    A.sfx('power');
  }
  function spawnBox(A) {
    const S = A.S;
    if (S.boxes.length >= 3) return;
    const [x, z] = freeCell(A);
    const type = A.pick(Object.keys(BONUS));
    const T = BONUS[type];
    let mesh = null;
    if (!A.headless) {
      mesh = new THREE.Group();
      const base = A.mesh('box', 0.55, T.color, { emissive: T.color, ei: 0.4 });
      base.position.y = 0.3;
      const lab = A.label(T.icon, { size: 40, h: 0.6, bg: 'rgba(14,11,9,0.75)' });
      lab.position.y = 1.05;
      mesh.add(base, lab); mesh.userData.lab = lab;
      mesh.position.set(x + 0.5, 0, z + 0.5);
      A.add(mesh);
    }
    S.boxes.push({ x: x + 0.5, z: z + 0.5, type, mesh });
  }
  // des pièces qui giclent d'un joueur (coup de sac, tram)
  function spill(A, O, n, dirX, dirZ) {
    for (let k = 0; k < n; k++) {
      let a = Math.random() * Math.PI * 2;
      if (dirX || dirZ) a = Math.atan2(dirX, dirZ) + (Math.random() - 0.5) * 1.8;
      const s = 2.5 + Math.random() * 3;
      const c = dropCoin(A, O.x, O.z, 1);
      c.y = 0.8; c.vy = 5 + Math.random() * 3; c.vx = Math.sin(a) * s; c.vz = Math.cos(a) * s; c.wait = 0.35;
    }
  }
  function hit(A, P, O) {
    const d = O.data;
    if (O.inv > 0) return;
    if (d.shield) { d.shield = 0; d.buffT.shield = 0; A.say(O.x, O.z, '🛡️ Bloqué !', '#5ad1ff', 26); A.sfx('zap'); O.inv = 0.6; return; }
    P.data.hits++; A.stat(P.i, 'hits', 1);
    A.knock(O, O.x - P.x, O.z - P.z, 6, 0.35, P);
    O.inv = 0.8;
    A.sfx('hit');
    const n = d.bag > 0 ? Math.max(1, Math.min(12, Math.round(d.bag * 0.3))) : 0;
    if (!n) { A.say(O.x, O.z, 'Sac vide !', '#ffffff', 22); return; }
    d.bag -= n; d.lost += n;
    if (P.data.buffT.crow > 0) {   // pied-de-biche : ça va directement dans notre sac
      P.data.bag += n; P.data.stolen += n; A.stat(P.i, 'stolen', n);
      A.say(O.x, O.z, `🦝 -${n}`, '#b78cff', 28);
      return;
    }
    A.say(O.x, O.z, `-${n}`, '#ff5533', 30);
    spill(A, O, n);
  }

  /* ---------- Les bouches d'égout ----------
     On marche sur une plaque : plouf, on ressort par l'autre (2,5 s avant de pouvoir replonger,
     et il faut d'abord quitter la plaque de sortie). */
  function sewer(A, P) {
    const d = P.data;
    if (d.sewIn >= 0) {   // on vient de ressortir : il faut s'écarter de la plaque
      const [ex, ez] = SEWERS[d.sewIn];
      if (Math.hypot(P.x - ex - 0.5, P.z - ez - 0.5) > 0.8) d.sewIn = -1;
      return;
    }
    if (d.sewCd > 0) return;
    for (let k = 0; k < 2; k++) {
      const [sx, sz] = SEWERS[k];
      if (Math.hypot(P.x - sx - 0.5, P.z - sz - 0.5) > 0.42) continue;
      const [ox, oz] = SEWERS[1 - k];
      A.burst(P.x, 0.3, P.z, 16, [0x6ad1a0, 0x2a6a4a, 0xffffff], 4, { up: 3 });
      A.place(P, ox + 0.5, oz + 0.5);
      d.sewCd = 2.5; d.sewIn = 1 - k;
      A.burst(P.x, 0.3, P.z, 16, [0x6ad1a0, 0x2a6a4a, 0xffffff], 4, { up: 4 });
      A.wave(P.x, P.z, 0x6ad1a0, 1.4, 0.4);
      A.sfx('whoosh'); A.tone('sine', 300, 90, 0.25, 0.12); A.tone('sine', 180, 420, 0.2, 0.1, 0.18);
      A.say(P.x, P.z, '🕳️ Plouf !', '#6ad1a0', 24);
      A.rumble(P, 0.3, 0.3, 120);
      if (A.S.decor) A.S.decor.sewFlash[k] = A.S.decor.sewFlash[1 - k] = 1;
      return;
    }
  }

  /* ---------- Le tram ----------
     au repos (13 à 17 s) → ALERTE 1,6 s (feux rouges + voie qui clignote + cloche) → il traverse la place.
     Les voies alternent (nord, sud), le sens est tiré au sort. */
  function tramUpdate(A, dt) {
    const S = A.S, T = S.tram;
    if (T.st === 'idle') {
      T.t -= dt;
      if (T.t <= 0 && TIME - A.t > 4) {
        T.st = 'warn'; T.t = TRAM.warn; T.lane = 1 - T.lane; T.dir = Math.random() < 0.5 ? 1 : -1; T.bell = 0; T.n++;
        const lz = LANES[T.lane];
        if (T.n === 1) A.banner('🚋 Attention au tram !', 'Quand la voie clignote, sortez-en !', '#ff5533', 2);
        A.say(T.dir > 0 ? 1.5 : W - 1.5, lz.zc, T.dir > 0 ? '🚋 →' : '← 🚋', '#ff5533', 34);
      }
      return;
    }
    const lz = LANES[T.lane];
    if (T.st === 'warn') {
      T.t -= dt;
      // la cloche : ding-ding
      T.bell -= dt;
      if (T.bell <= 0) { T.bell = 0.5; A.tone('triangle', 1250, 1250, 0.12, 0.11); A.tone('triangle', 1050, 1050, 0.16, 0.1, 0.13); }
      // les humains sur la voie : « À gauche ! », « Derrière ! »…
      const ex = T.dir > 0 ? 0 : W;
      for (const P of A.alive()) if (laneOf(P.z) === T.lane) A.warn(P, ex, lz.zc);
      if (T.t <= 0) {
        T.st = 'go'; T.hit = {};
        T.x = T.dir > 0 ? -TRAM.L / 2 : W + TRAM.L / 2;
        A.sfx('whoosh'); A.noise(1.6, 0.25, 500); A.tone('sawtooth', 140, 90, 1.4, 0.06);
      }
      return;
    }
    // il roule
    T.x += T.dir * TRAM.speed * dt;
    const x0 = T.x - TRAM.L / 2, x1 = T.x + TRAM.L / 2;
    for (const P of A.alive()) {
      if (T.hit[P.i]) continue;
      if (P.x + P.r < x0 || P.x - P.r > x1 || Math.abs(P.z - lz.zc) > TRAM.half + P.r) continue;
      T.hit[P.i] = true;
      tramHit(A, P, T, lz);
    }
    // les pièces sur la voie sont chassées sur le côté
    for (const c of S.coins) {
      if (c.dead || c.y > 1.2 || c.x < x0 - 0.2 || c.x > x1 + 0.2 || Math.abs(c.z - lz.zc) > TRAM.half + 0.2) continue;
      const side = c.z >= lz.zc ? 1 : -1;
      c.vz = side * (5 + Math.random() * 3); c.vx = T.dir * (3 + Math.random() * 3); c.vy = 4 + Math.random() * 2; c.y = Math.max(c.y, 0.5);
    }
    // le Percepteur aussi !
    const X = S.tax;
    if (X && !X.tramHit && X.x > x0 - 0.3 && X.x < x1 + 0.3 && Math.abs(X.z - lz.zc) < TRAM.half + 0.3) {
      X.tramHit = true; X.stunT = 1.8;
      const side = X.z >= lz.zc ? 1 : -1;
      X.kx = T.dir * 5; X.kz = side * 9;
      A.say(X.x, X.z, '🚋 Le Percepteur est renversé !', '#ffd23a', 28);
      A.sfx('hit'); A.shake(0.3); A.burst(X.x, 0.8, X.z, 20, [0x24262c, 0xffffff, 0xff5533], 6, { up: 3 });
    }
    if (T.dir > 0 ? x0 > W + 0.5 : x1 < -0.5) { T.st = 'idle'; T.t = A.rand(13, 17); if (X) X.tramHit = false; }
  }
  function tramHit(A, P, T, lz) {
    const d = P.data;
    let side = P.z >= lz.zc ? 1 : -1;
    if (Math.abs(P.z - lz.zc) < 0.05) side = Math.random() < 0.5 ? 1 : -1;
    // bousculé hors de la voie (même invincible un instant : on sort quand même de la voie)
    if (!A.knock(P, T.dir * 0.55, side, 11, 0.55, null)) { P.kx += T.dir * 5; P.kz += side * 9; P.stun = Math.max(P.stun, 0.35); }
    d.tram++; A.stat(P.i, 'tram', 1);
    A.sfx('hit'); A.sfx('small'); A.shake(0.35); A.rumble(P, 0.8, 0.6, 260);
    A.burst(P.x, 0.7, P.z, 18, [0xffcc33, 0xffffff, P.color], 6, { up: 3 });
    A.voice('hit', P, { p: 0.6 });
    if (d.shield) { d.shield = 0; d.buffT.shield = 0; A.say(P.x, P.z, '🛡️ Ouf !', '#5ad1ff', 26); return; }
    const n = d.bag > 0 ? Math.max(1, Math.min(15, Math.round(d.bag * 0.35))) : 0;
    if (!n) { A.say(P.x, P.z, '🚋 Bing !', '#ffcc33', 26); return; }
    d.bag -= n; d.lost += n;
    A.say(P.x, P.z, `🚋 -${n}`, '#ff5533', 32);
    spill(A, P, n, T.dir * 0.4, side);
  }

  /* ---------- Le Percepteur : il prend 20 % du sac des plus riches ----------
     Il suit les rues (chemin sur le quadrillage) ; il ne connaît pas les égouts. */
  function startTax(A) {
    const S = A.S;
    let c = freeCell(A);
    for (let k = 0; k < 20 && laneOf(c[1]) >= 0; k++) c = freeCell(A);
    S.tax = { x: c[0] + 0.5, z: c[1] + 0.5, face: 0, t: 26, cool: 0, mesh: null, lab: null, path: null, pathT: 0, stunT: 0, kx: 0, kz: 0, tramHit: false };
    if (!A.headless) {
      S.tax.mesh = OT.Models.hero({ color: 0x24262c, acc: 'lunettes', gad: 'mallette' }, { marker: false });
      S.tax.mesh.scale.setScalar(1.05);
      A.add(S.tax.mesh);
      S.tax.lab = A.label('🎩 Le Percepteur', { size: 28, h: 0.4, color: '#ffffff', border: '#ff5533' });
      A.add(S.tax.lab);
    }
    A.banner('Le Percepteur arrive !', 'Impôt sur les sacs pleins : 20 %', '#ff5533', 2.2);
    A.sfx('warn');
  }
  function taxUpdate(A, dt) {
    const S = A.S, T = S.tax;
    T.t -= dt; T.cool = Math.max(0, T.cool - dt);
    if (T.t <= 0) { A.remove(T.mesh); A.remove(T.lab); S.tax = null; A.say(W / 2, D / 2, 'Le Percepteur s\'en va…', '#ffffff', 26); return; }
    // renversé par le tram : il glisse et tourne sur lui-même
    if (T.stunT > 0) {
      T.stunT -= dt;
      const nx = T.x + T.kx * dt, nz = T.z + T.kz * dt;
      if (!A.hitsWall(nx, T.z, 0.3)) T.x = nx; else T.kx *= -0.3;
      if (!A.hitsWall(T.x, nz, 0.3)) T.z = nz; else T.kz *= -0.3;
      T.kx *= Math.exp(-4 * dt); T.kz *= Math.exp(-4 * dt);
      return;
    }
    const rich = A.alive().filter((P) => P.data.bag > 0 && bankOf(A, P.x, P.z) < 0).sort((a, b) => b.data.bag - a.data.bag)[0];
    if (!rich) return;
    const dx = rich.x - T.x, dz = rich.z - T.z, d = Math.hypot(dx, dz) || 1;
    // direction : tout droit si la rue est libre, sinon il suit le chemin le plus court
    let gx = rich.x, gz = rich.z;
    T.pathT -= dt;
    if (d > 1.2 && !clearFor(A, T.x, T.z, rich.x, rich.z)) {
      if (T.pathT <= 0 || !T.path || !T.path.length) {
        T.pathT = 0.35;
        const tx = Math.floor(rich.x), tz = Math.floor(rich.z);
        T.path = A.Bot.bfs(Math.floor(T.x), Math.floor(T.z), (x, z) => x === tx && z === tz, (x, z) => !A.grid.solid(x, z), 900);
      }
      if (T.path && T.path.length) {
        let [px, pz] = T.path[0];
        if (T.path.length > 1 && Math.abs(T.x - px - 0.5) < 0.2 && Math.abs(T.z - pz - 0.5) < 0.2) { T.path.shift(); [px, pz] = T.path[0]; }
        gx = px + 0.5; gz = pz + 0.5;
      }
    } else T.path = null;
    const mx = gx - T.x, mz = gz - T.z, m = Math.hypot(mx, mz) || 1;
    const nx = T.x + mx / m * 3.5 * dt, nz = T.z + mz / m * 3.5 * dt;
    if (!A.hitsWall(nx, T.z, 0.3)) T.x = nx;
    if (!A.hitsWall(T.x, nz, 0.3)) T.z = nz;
    T.face = Math.atan2(mx, mz);
    if (d < 0.7 && T.cool <= 0) {
      const n = Math.max(1, Math.round(rich.data.bag * 0.2));
      rich.data.bag -= n; rich.data.lost += n; T.cool = 1.5;
      A.say(rich.x, rich.z, `🎩 Impôt : -${n}`, '#ff5533', 28);
      A.sfx('bad'); A.rumble(rich, 0.4, 0.4, 200);
    }
  }
  function clearFor(A, x, z, tx, tz) {
    const n = Math.ceil(Math.hypot(tx - x, tz - z) * 3);
    for (let k = 1; k <= n; k++) if (A.hitsWall(x + (tx - x) * k / n, z + (tz - z) * k / n, 0.3)) return false;
    return true;
  }

  /* ==================================================================
     LE DÉCOR (seulement avec rendu) : coffres, fontaine, étals,
     kiosques, arbres, voies et feux du tram, le tram, les égouts.
     Les géométries sont partagées ; les étals et kiosques sont des
     maillages « instanciés » (un seul objet pour toutes les cases).
     ================================================================== */
  const GEO = {};
  function geo(k, make) { return GEO[k] || (GEO[k] = make()); }
  function std(A, color, o = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color: A.lin(color), roughness: 0.7, metalness: 0.1 }, o)); }
  function basic(A, color, opacity = 1) { return new THREE.MeshBasicMaterial({ color: A.lin(color), toneMapped: false, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }); }

  function buildDecor(A) {
    const S = A.S;
    const dec = S.decor = { lanes: [], lights: [], sewRing: [], sewFlash: [0, 0], fountain: null, water: null, tram: null };
    // ----- les coffres (dans leur niche) -----
    A.players.forEach((P, i) => {
      const [bx, bz] = BANKS[i];
      const m = A.mesh('box', 1, P.color, { h: 0.04, opacity: 0.32, basic: true, raw: false });
      m.scale.set(3, 1, 3); m.position.set(bx + 1.5, 0.02, bz + 1.5); A.add(m);
      const safe = A.mesh('box', 0.7, 0x3a3f46, { h: 0.6, metal: 0.6 });
      const cx = bx + (bx < W / 2 ? 0.5 : 2.5), cz = bz + (bz < D / 2 ? 0.5 : 2.5);
      safe.position.set(cx, 0.3, cz); A.add(safe);
      const door = A.mesh('cyl', 0.16, P.color, { h: 0.05, basic: true });
      door.rotation.x = Math.PI / 2; door.position.set(cx, 0.35, cz + (cz < D / 2 ? 0.36 : -0.36)); A.add(door);
      const lab = A.label('🏦 0', { size: 30, h: 0.42, color: P.css, border: P.css });
      lab.position.set(bx + 1.5, 1.1, bz + 1.5); A.add(lab);
      S.bankMesh[i] = { lab, val: 0, bx, bz };
    });
    // ----- les cases spéciales : on les compte pour les maillages instanciés -----
    const cells = { [STALL]: [], [KIOSK]: [], [TREE]: [] };
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { const v = A.grid.at(x, z); if (cells[v]) cells[v].push([x, z]); }
    const dm = new THREE.Object3D(), col = new THREE.Color();
    // étals : comptoir en bois + auvent coloré (une couleur par étal) + fruits
    const stalls = cells[STALL];
    const group = stallGroups(A, stalls);
    const awnCols = [0xe8473a, 0xffcc33, 0x3d8bff, 0x34c26b, 0xff8a2b, 0xb78cff];
    const counter = new THREE.InstancedMesh(geo('counter', () => new THREE.BoxGeometry(0.98, 0.78, 0.98)), std(A, 0x8a5a32, { roughness: 0.8 }), stalls.length);
    const awning = new THREE.InstancedMesh(geo('awning', () => new THREE.BoxGeometry(1.06, 0.08, 0.6)), new THREE.MeshStandardMaterial({ roughness: 0.6 }), stalls.length);
    const fruit = new THREE.InstancedMesh(geo('fruit', () => new THREE.SphereGeometry(0.13, 8, 6)), new THREE.MeshStandardMaterial({ roughness: 0.5 }), stalls.length * 3);
    const post = new THREE.InstancedMesh(geo('post', () => new THREE.BoxGeometry(0.06, 0.5, 0.06)), std(A, 0x5a3a20), stalls.length * 2);
    const fruitCols = [0xff6a1a, 0x9ad62a, 0xe8302a, 0xffd23a];
    stalls.forEach(([x, z], i) => {
      dm.position.set(x + 0.5, 0.39, z + 0.5); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.updateMatrix(); counter.setMatrixAt(i, dm.matrix);
      // l'auvent couvre l'arrière de l'étal (côté bord de la place) et penche vers l'extérieur :
      // on voit toujours le comptoir et les fruits
      const tiltDir = z < D / 2 ? -1 : 1;
      dm.position.set(x + 0.5, 1.3, z + 0.5 + tiltDir * 0.24); dm.rotation.set(tiltDir * 0.3, 0, 0); dm.updateMatrix(); awning.setMatrixAt(i, dm.matrix);
      awning.setColorAt(i, col.set(awnCols[group[i] % awnCols.length]).convertSRGBToLinear());
      for (let k = 0; k < 3; k++) {
        dm.position.set(x + 0.22 + k * 0.28, 0.86, z + 0.5 + (k % 2 ? 0.18 : -0.12)); dm.rotation.set(0, 0, 0); dm.updateMatrix();
        fruit.setMatrixAt(i * 3 + k, dm.matrix); fruit.setColorAt(i * 3 + k, col.set(fruitCols[(x + z + k) % fruitCols.length]).convertSRGBToLinear());
      }
      for (let k = 0; k < 2; k++) { dm.position.set(x + 0.08 + k * 0.84, 1.02, z + 0.5 + tiltDir * 0.42); dm.rotation.set(0, 0, 0); dm.updateMatrix(); post.setMatrixAt(i * 2 + k, dm.matrix); }
    });
    [counter, awning, fruit, post].forEach((m) => { m.castShadow = true; m.receiveShadow = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; A.add(m); });
    // kiosques à journaux : un petit pavillon vert et rouge
    const ks = cells[KIOSK];
    const kBody = new THREE.InstancedMesh(geo('kbody', () => new THREE.BoxGeometry(0.9, 1.0, 0.9)), std(A, 0x2f8a7a), ks.length);
    const kRoof = new THREE.InstancedMesh(geo('kroof', () => new THREE.ConeGeometry(0.78, 0.45, 4)), std(A, 0xc0392b, { roughness: 0.5 }), ks.length);
    const kSign = new THREE.InstancedMesh(geo('ksign', () => new THREE.BoxGeometry(0.92, 0.18, 0.92)), std(A, 0xffe3a0, { emissive: A.lin(0x6a5020), emissiveIntensity: 0.6 }), ks.length);
    ks.forEach(([x, z], i) => {
      dm.rotation.set(0, 0, 0); dm.scale.setScalar(1);
      dm.position.set(x + 0.5, 0.5, z + 0.5); dm.updateMatrix(); kBody.setMatrixAt(i, dm.matrix);
      dm.position.set(x + 0.5, 0.82, z + 0.5); dm.updateMatrix(); kSign.setMatrixAt(i, dm.matrix);
      dm.position.set(x + 0.5, 1.23, z + 0.5); dm.rotation.set(0, Math.PI / 4, 0); dm.updateMatrix(); kRoof.setMatrixAt(i, dm.matrix);
    });
    [kBody, kRoof, kSign].forEach((m) => { m.castShadow = true; m.receiveShadow = true; A.add(m); });
    // arbres : bac, tronc, feuillage
    for (const [x, z] of cells[TREE]) {
      const pot = new THREE.Mesh(geo('pot', () => new THREE.BoxGeometry(0.9, 0.4, 0.9)), dec.potMat || (dec.potMat = std(A, 0x6a6f76)));
      pot.position.set(x + 0.5, 0.2, z + 0.5); pot.castShadow = true; pot.receiveShadow = true; A.add(pot);
      const trunk = new THREE.Mesh(geo('trunk', () => new THREE.CylinderGeometry(0.08, 0.11, 0.9, 7)), dec.trunkMat || (dec.trunkMat = std(A, 0x6a4020)));
      trunk.position.set(x + 0.5, 0.8, z + 0.5); trunk.castShadow = true; A.add(trunk);
      const leaf = new THREE.Mesh(geo('leaf', () => new THREE.IcosahedronGeometry(0.5, 0)), dec.leafMat || (dec.leafMat = std(A, 0x3f9a3a, { roughness: 0.8, flatShading: true })));
      leaf.position.set(x + 0.5, 1.4, z + 0.5); leaf.castShadow = true; A.add(leaf);
    }
    // ----- la fontaine (3×3 au centre) : bassin, eau, colonne, vasque -----
    const fx = W / 2, fz = D / 2;
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.62, 0.6, 8), std(A, 0xb8a990, { roughness: 0.85 }));
    basin.rotation.y = Math.PI / 8; basin.position.set(fx, 0.3, fz); basin.castShadow = true; basin.receiveShadow = true; A.add(basin);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.38, 0.05, 8), new THREE.MeshStandardMaterial({ color: A.lin(0x3ab4e8), emissive: A.lin(0x0a4a7a), emissiveIntensity: 0.7, roughness: 0.15, metalness: 0.3 }));
    water.rotation.y = Math.PI / 8; water.position.set(fx, 0.56, fz); A.add(water);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.2, 10), std(A, 0xd8c9a8));
    column.position.set(fx, 0.9, fz); column.castShadow = true; A.add(column);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.25, 0.25, 12), std(A, 0xd8c9a8));
    bowl.position.set(fx, 1.5, fz); bowl.castShadow = true; A.add(bowl);
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 18), std(A, 0xffd23a, { emissive: A.lin(0xb07800), emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.3 }));
    coin.rotation.x = Math.PI / 2; coin.position.set(fx, 2.0, fz); A.add(coin);
    dec.water = water; dec.fcoin = coin; dec.splash = 0;
    // ----- les voies du tram : bitume, rails, bords jaunes, voile rouge d'alerte, feux -----
    const asphalt = std(A, 0x34363c, { roughness: 0.95 });
    const railMat = std(A, 0xb8c0c8, { metalness: 0.8, roughness: 0.3 });
    const edgeMat = basic(A, 0xffcc33, 0.85);
    const poleMat = std(A, 0x2a2c30, { metalness: 0.5 });
    for (const lz of LANES) {
      const L = { warn: null, lights: [] };
      const strip = new THREE.Mesh(geo('strip', () => new THREE.BoxGeometry(1, 0.02, 1)), asphalt);
      strip.scale.set(W, 1, 2); strip.position.set(W / 2, 0.012, lz.zc); strip.receiveShadow = true; A.add(strip);
      for (const o of [-0.45, 0.45]) {
        const rail = new THREE.Mesh(geo('rail', () => new THREE.BoxGeometry(1, 0.05, 0.08)), railMat);
        rail.scale.x = W; rail.position.set(W / 2, 0.04, lz.zc + o); A.add(rail);
      }
      // bords en pointillés jaunes
      for (const o of [-0.97, 0.97]) for (let x = 0.5; x < W; x += 1.5) {
        const e = new THREE.Mesh(geo('dash', () => new THREE.BoxGeometry(0.8, 0.01, 0.07)), edgeMat);
        e.position.set(x + 0.4, 0.03, lz.zc + o); A.add(e);
      }
      // le voile rouge qui clignote pendant l'alerte
      const warn = new THREE.Mesh(geo('strip', null), basic(A, 0xff2a1a, 0.4));
      warn.scale.set(W, 1, 2); warn.position.set(W / 2, 0.06, lz.zc); warn.visible = false; A.add(warn);
      L.warn = warn;
      // les feux : un poteau de chaque côté de chaque entrée (sur les murs du bord)
      for (const ex of [0.5, W - 0.5]) for (const ez of [lz.z0 - 0.5, lz.z0 + 2.5]) {
        const pole = new THREE.Mesh(geo('pole', () => new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6)), poleMat);
        pole.position.set(ex, 1.4, ez); A.add(pole);
        const bulb = new THREE.Mesh(geo('bulb', () => new THREE.SphereGeometry(0.17, 10, 8)), basic(A, 0x551010));
        bulb.position.set(ex, 2.05, ez); A.add(bulb);
        L.lights.push(bulb);
      }
      dec.lanes.push(L);
    }
    // ----- le tram : un seul, qui sert à chaque passage -----
    const tram = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(TRAM.L, 1.0, 1.55), std(A, 0xffcc33, { roughness: 0.45 }));
    body.position.y = 0.8; body.castShadow = true;
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(TRAM.L + 0.04, 0.28, 1.59), std(A, 0xc0392b));
    skirt.position.y = 0.35;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(TRAM.L - 0.5, 0.36, 1.6), std(A, 0x18263a, { emissive: A.lin(0x2a4a6a), emissiveIntensity: 0.5, roughness: 0.2 }));
    glass.position.y = 1.0;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 1.4), std(A, 0x18263a, { emissive: A.lin(0x2a4a6a), emissiveIntensity: 0.5 }));
    nose.position.set(TRAM.L / 2 + 0.02, 1.0, 0);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(TRAM.L - 0.3, 0.14, 1.3), std(A, 0xe8e8e8));
    roof.position.y = 1.37;
    const panto = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.06), poleMat);
    panto.position.set(0, 1.65, 0); panto.rotation.z = 0.5;
    tram.add(body, skirt, glass, nose, roof, panto);
    for (const oz of [-0.5, 0.5]) { const hl = new THREE.Mesh(geo('hl', () => new THREE.BoxGeometry(0.06, 0.16, 0.26)), basic(A, 0xfff2c0)); hl.position.set(TRAM.L / 2 + 0.05, 0.5, oz); tram.add(hl); }
    // l'étiquette est à part (le tram tourne selon son sens : elle, elle regarde toujours la caméra)
    const lab = A.label('🚋 TRAM', { size: 30, h: 0.42, color: '#ffcc33', border: '#ff5533' });
    lab.visible = false; A.add(lab);
    tram.visible = false; tram.userData.lab = lab;
    A.add(tram); dec.tram = tram;
    // ----- les bouches d'égout : plaque, anneau qui pulse, panneau -----
    SEWERS.forEach(([sx, sz], k) => {
      const plate = new THREE.Mesh(geo('plate', () => new THREE.CylinderGeometry(0.42, 0.42, 0.05, 20)), dec.plateMat || (dec.plateMat = std(A, 0x2a2e34, { metalness: 0.7, roughness: 0.4 })));
      plate.position.set(sx + 0.5, 0.03, sz + 0.5); plate.receiveShadow = true; A.add(plate);
      for (let b = -1; b <= 1; b++) { const bar = new THREE.Mesh(geo('bar', () => new THREE.BoxGeometry(0.62, 0.02, 0.06)), dec.barMat || (dec.barMat = std(A, 0x15171a))); bar.position.set(sx + 0.5, 0.065, sz + 0.5 + b * 0.18); A.add(bar); }
      const ring = A.mesh('ring', 0.55, 0x6ad1a0, { basic: true, opacity: 0.7 });
      ring.position.set(sx + 0.5, 0.05, sz + 0.5); A.add(ring); dec.sewRing.push(ring);
      const sign = A.label(k === 0 ? 'ÉGOUT ⇄ EST' : 'OUEST ⇄ ÉGOUT', { size: 22, h: 0.3, color: '#6ad1a0', border: '#6ad1a0' });
      sign.position.set(sx + 0.5, 0.95, sz + 0.5); A.add(sign); ring.userData.sign = sign;
    });
  }
  // numéro d'étal (cases voisines = même étal, même couleur d'auvent)
  function stallGroups(A, list) {
    const id = new Map(); let n = 0;
    const key = (x, z) => z * W + x;
    const set = new Set(list.map(([x, z]) => key(x, z)));
    list.forEach(([x, z]) => {
      if (id.has(key(x, z))) return;
      const q = [[x, z]]; id.set(key(x, z), n);
      while (q.length) {
        const [cx, cz] = q.pop();
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = key(cx + dx, cz + dz); if (set.has(k) && !id.has(k)) { id.set(k, n); q.push([cx + dx, cz + dz]); } }
      }
      n++;
    });
    return list.map(([x, z]) => id.get(key(x, z)));
  }
  function drawDecor(A, dt, time) {
    const S = A.S, dec = S.decor;
    if (!dec) return;
    const T = S.tram;
    // la fontaine : l'eau ondule, une pièce dorée tourne au sommet, quelques gouttes
    dec.water.position.y = 0.56 + Math.sin(time * 2) * 0.015;
    dec.fcoin.rotation.z = time * 2;
    dec.splash -= dt;
    if (dec.splash <= 0) { dec.splash = 0.35; A.burst(W / 2 + (Math.random() - 0.5) * 0.6, 1.6, D / 2 + (Math.random() - 0.5) * 0.6, 3, [0x8ad8ff, 0xffffff], 1.6, { up: 2, life: 0.7, size: 0.7 }); }
    // les voies : voile rouge qui clignote + feux, pendant l'alerte et le passage
    dec.lanes.forEach((L, k) => {
      const on = T && T.lane === k && T.st !== 'idle';
      const blink = on && (T.st === 'go' || Math.sin(time * 16) > 0);
      L.warn.visible = !!blink;
      if (on) L.warn.material.opacity = T.st === 'go' ? 0.28 : 0.42;
      for (const b of L.lights) b.material.color.setHex(blink ? 0xff3a2a : 0x551010);
    });
    // le tram
    const tr = dec.tram, tl = tr.userData.lab;
    // on le cache dès qu'il est dans les gradins
    tr.visible = !!(T && T.st === 'go') && T.x > -TRAM.L / 2 - 0.1 && T.x < W + TRAM.L / 2 + 0.1;
    tl.visible = tr.visible && T.x > 1 && T.x < W - 1;
    if (tr.visible) {
      tr.position.set(T.x, Math.abs(Math.sin(time * 30)) * 0.03, LANES[T.lane].zc);
      tr.rotation.y = T.dir > 0 ? 0 : Math.PI;
      tl.position.set(T.x, 2.3, LANES[T.lane].zc);
      tl.quaternion.copy(A.camera.quaternion);
    }
    // les égouts : l'anneau pulse, et brille quand quelqu'un passe
    dec.sewRing.forEach((r, k) => {
      dec.sewFlash[k] = Math.max(0, dec.sewFlash[k] - dt * 2);
      const f = dec.sewFlash[k];
      r.scale.setScalar(1 + Math.sin(time * 3 + k * 3) * 0.08 + f * 0.6);
      r.material.opacity = 0.45 + f * 0.5;
      r.userData.sign.quaternion.copy(A.camera.quaternion);
    });
  }
})();
