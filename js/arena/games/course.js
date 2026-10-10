/* =====================================================================
   🏃 LE DERNIER ARRIVÉ — une course dont les règles changent
   Version 1.4 : le GRAND parcours (42 × 21)
   - aller toucher la PORTE à droite, puis revenir à l'ARRIVÉE à gauche ;
   - 3 cloisons (z = 5, 10, 15) → 4 couloirs ; leurs passages changent à
     chaque manche (les couloirs 1 et 4 sont le miroir l'un de l'autre :
     départs équitables) ;
   - 2 canaux : le 1er a ses ponts (2 cases) dans les couloirs du BORD,
     le 2e dans les couloirs du MILIEU → il faut changer de couloir… ou
     prendre un RACCOURCI risqué :
       · les TREMPLINS (jaunes) au bout d'une jetée étroite, au-dessus du
         canal, dans les couloirs sans pont : plus court, mais un coup
         d'épaule sur la jetée (ou en l'air) et c'est le plongeon ;
       · les PASSAGES ÉTROITS le long de l'eau, à travers les cloisons,
         juste à côté des canaux ;
   - des piliers (en miroir), 6 drapeaux de reprise sur toute la longueur ;
   - toutes les 6 s : « ⚠ NOUVELLE RÈGLE » (sol qui disparaît, vitesse ×2,
     vent, commandes inversées, murs qui sortent du sol, portes qui se
     ferment, lasers, ponts qui glissent, zones interdites… et « la sortie
     a déménagé ») ; chaque règle qui bouche des cases vérifie qu'il reste
     TOUJOURS un chemin (pour la course ET pour chaque coureur) ;
   - A : coup d'épaule (petit sprint qui pousse les autres, même à l'eau) ;
   - une chute : retour au dernier drapeau.
   3 manches : 4, 2, 1 points ; le DERNIER ARRIVÉ marque 0.
   ===================================================================== */
(function () {
  const W = 42, D = 21, LIMIT = 75;
  const WALLS = [5, 10, 15];                         // les cloisons (lignes z)
  const X0 = 3, X1 = W - 4;                          // elles vont de x = 3 à x = 38 (départ et bande de la porte libres)
  const CANALS = [[13, 14], [27, 28]];
  const isCanal = (x) => CANALS.some((c) => c.includes(x));
  // les ponts (2 cases de large) : canal 1 dans les couloirs du bord, canal 2 dans ceux du milieu
  const BRIDGES = [{ c: 0, base: 2, amp: 2.2, ph: 0 }, { c: 0, base: 17, amp: 2.2, ph: Math.PI }, { c: 1, base: 7, amp: 1.5, ph: 0 }, { c: 1, base: 12, amp: 1.5, ph: Math.PI }];
  // les tremplins : une jetée (2 cases, de l'eau de chaque côté) puis le saut au-dessus du canal
  const JUMPS = [{ c: 0, z: 8 }, { c: 0, z: 12 }, { c: 1, z: 2 }, { c: 1, z: 18 }];
  // les passages étroits le long de l'eau (ouvertures de cloison collées au canal)
  const BANKS = [[12, 5], [15, 5], [12, 15], [15, 15], [26, 5], [29, 5], [26, 15], [29, 15]];
  const FLAGS = [2, 9, 18, 23, 33, 38];
  const SECTIONS = [[4, 9], [17, 23], [31, 36]];      // où l'on ouvre les passages des cloisons
  const RISE = 12;                                    // code de case : mur ou porte surgi (solide, dessiné par le jeu)
  const BRIDGE_W = 1.4;                               // vitesse d'oscillation des ponts (une oscillation ≈ 4,5 s)
  const RULES = ['sol', 'vitesse', 'vent', 'inverse', 'murs', 'portes', 'lasers', 'ponts', 'zones'];
  const RULE_TXT = {
    sol: ['Le sol disparaît !', 'Évite les cases qui clignotent'],
    vitesse: ['Vitesse ×2 !', 'Attention aux virages'],
    vent: ['Coup de vent !', 'Tout le monde dérive'],
    inverse: ['Commandes inversées !', 'Gauche = droite…'],
    murs: ['Des murs sortent du sol !', 'Cherche un autre chemin'],
    portes: ['Les portes se ferment !', 'Certains passages sont bouchés'],
    lasers: ['Lasers !', 'Passe quand ils s\'éteignent'],
    ponts: ['Les ponts glissent !', 'Saute au bon moment'],
    zones: ['Zones interdites !', 'Sors des cercles rouges'],
    troll: ['La SORTIE a déménagé !', 'Suis la flèche verte…'],
  };
  // départs (z) selon le nombre de joueurs, symétriques autour de la cloison du milieu
  const STARTS = { 2: [8, 13], 3: [5.5, 10.5, 15.5], 4: [3, 8, 13, 18] };

  /* ---------- Géométries et matériaux partagés (créés une seule fois) ---------- */
  const C = {};
  function shared(A) {
    if (C.ok || A.headless) return C;
    C.ok = true;
    const basic = (c, op) => new THREE.MeshBasicMaterial({ color: A.lin(c), transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    C.blinkGeo = new THREE.BoxGeometry(0.92, 0.03, 0.92); C.blinkMat = basic(0xff5533, 0.55);
    C.wallGeo = new THREE.BoxGeometry(0.96, 0.9, 0.96);
    C.wallMat = new THREE.MeshStandardMaterial({ color: A.lin(0x7a5a44), roughness: 0.7, metalness: 0.2, emissive: A.lin(0x401808), emissiveIntensity: 0.4 });
    C.gateMat = new THREE.MeshStandardMaterial({ color: A.lin(0xd8402a), roughness: 0.5, metalness: 0.3, emissive: A.lin(0x601000), emissiveIntensity: 0.5 });
    C.laserGeo = new THREE.BoxGeometry(0.16, 0.55, D - 2); C.laserOn = basic(0xff2020, 0.95); C.laserOff = basic(0xff2020, 0.2);
    C.zoneGeo = new THREE.CircleGeometry(1.4, 28);
    C.poleGeo = new THREE.BoxGeometry(0.08, 1.2, 0.08); C.flagGeo = new THREE.BoxGeometry(0.5, 0.3, 0.05);
    C.flagMat = new THREE.MeshStandardMaterial({ color: A.lin(0xffd23a), emissive: A.lin(0xffd23a), emissiveIntensity: 0.4, roughness: 0.5 });
    C.chkGeo = new THREE.BoxGeometry(0.98, 0.03, 0.98); C.chkMat = basic(0xffffff, 0.55);
    C.waterMat = new THREE.MeshStandardMaterial({ color: A.lin(0x2f7fb0), emissive: A.lin(0x0a3050), emissiveIntensity: 0.5, transparent: true, opacity: 0.85, roughness: 0.3 });
    C.bridgeMat = new THREE.MeshStandardMaterial({ color: A.lin(0x8a5a2a), roughness: 0.8 });
    // le tremplin : une rampe jaune à chevrons noirs, inclinée vers le canal
    C.padTex = OT.Models.canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = '#ffd23a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1a1a1a';
      for (const x0 of [6, 30]) { g.beginPath(); g.moveTo(x0, 8); g.lineTo(x0 + 14, h / 2); g.lineTo(x0, h - 8); g.lineTo(x0 + 8, h - 8); g.lineTo(x0 + 22, h / 2); g.lineTo(x0 + 8, 8); g.closePath(); g.fill(); }
    });
    C.padGeo = new THREE.BoxGeometry(0.94, 0.14, 0.9);
    C.padMat = new THREE.MeshStandardMaterial({ map: C.padTex, roughness: 0.5, emissive: A.lin(0x553300), emissiveIntensity: 0.35 });
    return C;
  }
  const mk = (geo, mat) => new THREE.Mesh(geo, mat);

  /* ---------- Le plan d'une manche ---------- */
  function makeLayout(A) {
    const S = A.S;
    const cells = new Uint8Array(W * D);
    const set = (x, z, v) => { if (x >= 0 && z >= 0 && x < W && z < D) cells[z * W + x] = v; };
    const at = (x, z) => cells[z * W + x];
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) set(x, z, x === 0 || z === 0 || x === W - 1 || z === D - 1 ? 1 : 0);
    // les cloisons
    for (const wz of WALLS) for (let x = X0; x <= X1; x++) set(x, wz, 1);
    // leurs passages : un par tronçon (parfois 2 cases), en miroir pour les cloisons 5 et 15
    const openings = {};
    const pickOpen = () => SECTIONS.map(([a, b]) => { const x = A.rint(a, b - 1); return Math.random() < 0.5 ? [x, x + 1] : [x]; }).flat();
    openings[5] = openings[15] = pickOpen(); openings[10] = pickOpen();
    for (const wz of WALLS) for (const x of openings[wz]) set(x, wz, 0);
    // les passages étroits le long de l'eau
    for (const [x, z] of BANKS) set(x, z, 0);
    // les canaux (ils coupent tout, cloisons comprises) et leurs ponts
    for (const cn of CANALS) for (const x of cn) for (let z = 1; z < D - 1; z++) set(x, z, 3);
    for (const b of BRIDGES) for (const x of CANALS[b.c]) for (let k = 0; k < 2; k++) set(x, b.base + k, 0);
    // les tremplins : la jetée (de l'eau de chaque côté), le tremplin au bord, de chaque côté du canal
    S.pads = []; S.jumpCells = new Set(); S.jetty = new Set(); S.inlets = [];
    for (const j of JUMPS) {
      const [cx0, cx1] = CANALS[j.c];
      for (const [px, dir, back] of [[cx0 - 1, 1, cx0 - 2], [cx1 + 1, -1, cx1 + 2]]) {
        S.pads.push({ x: px, z: j.z, dir });
        for (const x of [px, back]) { S.jetty.add(j.z * W + x); for (const dz of [-1, 1]) { set(x, j.z + dz, 3); S.inlets.push([x, j.z + dz]); } }
      }
      for (const x of CANALS[j.c]) S.jumpCells.add(j.z * W + x);
    }
    // les piliers : 4 paires en miroir, jamais devant une jetée ni dans un passage
    const cand = [];
    for (const [a, b] of [[5, 10], [18, 23], [32, 37]]) for (let x = a; x <= b; x++) for (const z of [2, 3, 7, 8]) {
      if (z === 2 && ((x >= 21 && x <= 24) || (x >= 31 && x <= 34))) continue;    // devant les jetées du canal 2
      if (z === 8 && ((x >= 8 && x <= 10) || (x >= 17 && x <= 20))) continue;     // devant les jetées du canal 1
      cand.push([x, z]);
    }
    S.pillars = [];
    for (const [x, z] of A.shuffle(cand)) {
      if (S.pillars.length >= 8) break;
      if (S.pillars.some(([px, pz]) => Math.abs(px - x) + Math.abs(pz - z) < 4)) continue;
      if (at(x, z) !== 0 || at(x, D - 1 - z) !== 0) continue;
      set(x, z, 1); set(x, D - 1 - z, 1); S.pillars.push([x, z], [x, D - 1 - z]);
    }
    S.openings = openings;
    return (x, z) => cells[z * W + x];
  }

  OT.Arena.register({
    id: 'course', name: 'Le Dernier Arrivé', icon: '🏃', color: '#3cff9a', theme: 'forge', music: 'course',
    tagline: 'Une course où les règles changent toutes les 6 secondes. Ne sois pas le dernier !',
    goal: 'Touche la PORTE à droite, reviens à l\'ARRIVÉE à gauche… et surtout, ne sois pas le dernier !',
    howto: [
      'Bouge avec {move} : va toucher la PORTE (flèche verte), puis reviens à gauche.',
      '{a} : coup d\'épaule, un petit sprint qui pousse les autres (même dans l\'eau !).',
      'Raccourcis : les TREMPLINS jaunes sautent le canal, les passages étroits longent l\'eau.',
      'Toutes les 6 s, une NOUVELLE RÈGLE : lis le bandeau en haut !',
    ],
    danger: 'Les canaux, les règles qui changent… et la sortie qui déménage sans prévenir !',
    win: '4, 2 puis 1 point selon l\'ordre d\'arrivée.',
    lose: 'Le DERNIER ARRIVÉ marque 0. Une chute te ramène au dernier drapeau.',
    tuto: ['Déplace-toi : {move}', '{a} : coup d\'épaule (petit sprint qui pousse)'],
    rules: [
      'Va toucher la porte à droite, puis reviens à l\'ARRIVÉE à gauche (aller-retour !).',
      'Toutes les 6 s : NOUVELLE RÈGLE ! Sol qui disparaît, vitesse ×2, vent, commandes inversées, murs, lasers…',
      'A : coup d\'épaule. Pousse les autres, même dans le canal ! Tremplins et passages au bord de l\'eau : plus courts, plus risqués.',
      'Points : 4, 2, 1… et 0 pour le DERNIER ARRIVÉ. Une chute te ramène au dernier drapeau.',
    ],
    controls: { a: 'Coup d\'épaule' },
    rounds: 3, scoreName: 'points', maxRound: LIMIT + 3,
    view: () => ({ x0: 0, z0: 0, x1: W, z1: D }),
    // juste après le troll, la caméra s'élargit 2,5 s pour montrer où la porte est partie
    focus(A) { const S = A.S; return S && S.trolled && A.t - S.trollAt < 2.5 ? [{ x: W - 1.5, z: (S.finish.z0 + S.finish.z1) / 2 }] : null; },
    tilt: 32,
    camMin: 0.5,           // la caméra suit l'action sans montrer moins de la moitié du parcours
    knockDrag: 4,
    botCompensate: true,   // les bots résistent au vent et aux ponts qui glissent

    setup(A) { A.S.wins = A.fill(A.n, 0); A.S.lasts = A.fill(A.n, 0); },

    round(A) {
      const S = A.S;
      const lay = makeLayout(A);
      A.buildGrid(W, D, lay, 'forge', { solid: [RISE] });
      S.order = []; S.ended = false; S.ruleT = 4; S.rule = null; S.ruleLeft = 0; S.ruleK = 0; S.trolled = false; S.announced = false; S.lastRule = null;
      S.finish = { z0: 1, z1: D - 1 }; S.firstTurn = false; S.invert = null;
      S.blink = []; S.risen = []; S.lasers = []; S.zones = []; S.speedX = 1; S.wind = null; S.bridgeMove = 0;
      S.bridges = BRIDGES.map((b) => ({ xs: CANALS[b.c], z: b.base, base: b.base, amp: b.amp, ph: b.ph, v: 0 }));
      S.pool = [];
      const starts = A.shuffle(STARTS[Math.max(2, Math.min(4, A.n))]);
      A.players.forEach((P, i) => {
        const z = starts[i % starts.length];
        A.place(P, 1.5, z); P.face = Math.PI / 2;
        P.speed = 4.6; P.r = 0.3;
        P.data = { flag: 2, leg: 0, done: false, dashCool: 0, dashT: 0, pref: z, bumps: 0, falls: 0, padT: 0 };
      });
      buildScene(A);
    },

    bodies: true,
    speedMod(A, P) { return (A.S.speedX || 1) * (P.data.dashT > 0 ? 2.3 : 1); },
    drift(A, P) {
      const S = A.S;
      let x = 0, z = 0;
      if (S.wind) z += S.wind.dir * 2.4;
      // sur un pont qui glisse : on est emporté
      if (S.bridgeMove > 0 && P.h <= 0.05 && isCanal(Math.floor(P.x))) for (const b of S.bridges) if (b.xs.includes(Math.floor(P.x)) && Math.floor(P.z) >= b.z && Math.floor(P.z) <= b.z + 1) z += b.v || 0;
      return x || z ? { x, z } : null;
    },
    grip(A, P) { return P.h > 0.05 ? 3 : (A.S.speedX > 1 ? 8 : 22); },
    safe(A, P) { return P.h > 0.05; },     // en l'air (tremplin), on ne tombe pas dans l'eau
    onLand(A, P) { if (P.data.flying) { P.data.flying = false; A.burst(P.x, 0.1, P.z, 8, [0xd8c8a8, 0xffffff], 3, { flat: true }); A.sfx('land'); } },

    onFall(A, P) {
      P.data.falls++; P.data.flying = false;
      P.data.respawn = 1.2;
      const by = P.lastHit && A.clock - P.lastHit.t < 2.5 && P.lastHit.by !== P ? P.lastHit.by : null;
      if (by) A.say(P.x, P.z, `Poussé par ${by.name} !`, by.css, 24);
      else A.say(P.x, P.z, 'Plouf !', '#5ad1ff', 24);
    },

    update(A, dt) {
      const S = A.S;
      // les règles
      if (S.rule && (S.ruleLeft -= dt) <= 0) endRule(A);
      S.ruleT -= dt;
      if (S.ruleT <= 1 && !S.announced) {
        S.announced = true;
        let r = RULES[(S.ruleK + A.rint(0, RULES.length - 1)) % RULES.length];
        // le troll : la sortie déménage quand des coureurs approchent de la porte
        if (!S.trolled && A.players.some((P) => !P.data.done && !P.data.leg && P.x > W * 0.7) && Math.random() < 0.6) r = 'troll';
        if (r === S.lastRule) r = RULES[(RULES.indexOf(r) + 3) % RULES.length];
        S.next = r;
        A.banner('⚠ NOUVELLE RÈGLE', RULE_TXT[r][0], '#ffd23a', 1.3);
        A.sfx('rule');
      }
      if (S.ruleT <= 0) { S.announced = false; S.ruleT = 6; S.ruleK++; if (S.rule) endRule(A); startRule(A, S.next); }
      // sol qui clignote puis disparaît
      for (const b of S.blink) { b.t += dt; if (b.t > 1 && !b.gone) { b.gone = true; if (A.grid.at(b.x, b.z) === 0) A.setCell(b.x, b.z, A.VOID); else b.skip = true; } }
      // ponts qui glissent : exactement une oscillation (ils reviennent tout seuls à leur place à la fin)
      if (S.bridgeMove > 0) {
        S.bridgeMove -= dt;
        const u = (A.t - S.bridgeT0) * BRIDGE_W;
        const nz = S.bridges.map((b) => A.clamp(Math.round(b.base + Math.sin(u + b.ph) * b.amp), 1, D - 3));
        S.bridges.forEach((b) => { b.v = Math.cos(u + b.ph) * BRIDGE_W * b.amp; });
        if (nz.some((z, k) => z !== S.bridges[k].z)) { setBridges(A, false); S.bridges.forEach((b, k) => { b.z = nz[k]; }); setBridges(A, true); }
        if (S.bridgeMove <= 0) { setBridges(A, false); for (const b of S.bridges) { b.z = b.base; b.v = 0; } setBridges(A, true); }
      }
      // lasers : ils RENVOIENT en arrière (dans le sens contraire de ta course)
      for (const l of S.lasers) {
        l.t += dt; l.on = (l.t % 2.2) < 1.1;
        if (l.on) for (const P of A.alive()) if (Math.abs(P.x - (l.x + 0.5)) < 0.35 && !P.data.done && !(P.data.zapCd > 0)) { P.data.zapCd = 0.8; A.knock(P, P.data.leg ? 1 : -1, 0, 7.5, 0.5, null); A.say(P.x, P.z, '⚡ Renvoyé !', '#ff5533', 24); A.sfx('zap'); }
      }
      // zones interdites
      for (const z of S.zones) {
        z.t += dt;
        if (z.t > 1.2 && !z.fired) {
          z.fired = true;
          A.sfx('zap'); A.burst(z.x, 0.3, z.z, 20, [0xff2020, 0xffffff], 5, { flat: true });
          for (const P of A.alive()) if (Math.hypot(P.x - z.x, P.z - z.z) < 1.4 && !P.data.done) { A.knock(P, P.x - z.x + 0.01, P.z - z.z, 7, 0.8, null); A.say(P.x, P.z, 'Zone interdite !', '#ff5533', 22); }
        }
      }
      for (const P of A.players) if (P.data.zapCd > 0) P.data.zapCd -= dt;
      // joueurs
      for (const P of A.players) {
        const d = P.data;
        if (d.respawn > 0) {
          d.respawn -= dt;
          if (d.respawn <= 0) { const fx = d.flag; A.revive(P, fx + 0.5, nearestLane(A, fx, P.z), 1.2); }
          continue;
        }
        if (!P.alive || P.out || d.done) continue;
        d.dashCool = Math.max(0, d.dashCool - dt);
        if (P.in.aP && d.dashCool <= 0) { d.dashT = 0.2; d.dashCool = 1.5; A.sfx('whoosh'); }
        if (d.dashT > 0) for (const O of A.others(P)) if (!O.data.done && A.dist(O, P) < 0.75 && !(O.data.bumpCd > 0)) { O.data.bumpCd = 0.4; const dx = O.x - P.x, dz = O.z - P.z; A.knock(O, dx + Math.sin(P.face) * 0.5, dz + Math.cos(P.face) * 0.5, 7, 0.35, P); d.bumps++; A.stat(P.i, 'bumps', 1); A.sfx('hit'); }
        if (O_bump(P)) P.data.bumpCd -= dt;
        // tremplin : on y arrive en courant vers le canal → envol par-dessus l'eau
        if (P.h <= 0.02 && !(d.padT > 0)) {
          const cx = Math.floor(P.x), cz = Math.floor(P.z);
          for (const pd of S.pads) if (pd.x === cx && pd.z === cz && P.vx * pd.dir > 1) {
            P.vh = 8; P.h = 0.01; P.kx = pd.dir * 6.5; P.kz *= 0.3; d.padT = 0.8; d.flying = true;
            A.sfx('spring'); A.burst(P.x, 0.2, P.z, 10, [0xffd23a, 0xffffff], 4, { up: 2 });
            if (P.anim) P.anim.play('jump');
            break;
          }
        }
        // drapeaux (dans le sens de la course)
        for (const fx of FLAGS) {
          if (d.leg === 0 && fx > d.flag && P.x > fx + 0.5) { d.flag = fx; A.sfx('tick'); }
          if (d.leg === 1 && fx < d.flag && P.x < fx + 0.5) { d.flag = fx; A.sfx('tick'); }
        }
        // la porte de droite : demi-tour !
        if (d.leg === 0 && P.x > W - 2.4 && P.z >= S.finish.z0 && P.z <= S.finish.z1) {
          d.leg = 1; d.flag = FLAGS[FLAGS.length - 1]; d.half = A.t;
          A.say(P.x, P.z, 'Demi-tour !', P.css, 30); A.sfx('ok'); A.rumble(P, 0.2, 0.4, 120);
          if (!S.firstTurn) { S.firstTurn = true; A.banner(`${P.name} touche la porte !`, 'Retour à l\'arrivée, à gauche', P.css, 1.4); }
        }
        // arrivée (à gauche, au retour)
        if (d.leg === 1 && P.x < 2.4) {
          d.done = true; S.order.push(P.i);
          const place = S.order.length;
          A.say(P.x, P.z, ['1er !', '2e !', '3e !', '4e'][place - 1], P.css, 34);
          A.sfx(place === 1 ? 'power' : 'ok'); A.rumble(P, 0.3, 0.6, 200);
          P.alive = false; P.out = true;
          A.burst(P.x, 0.8, P.z, 24, [P.color, 0x3cff9a, 0xffffff], 6, { up: 3 });
        }
      }
      // fin de la manche : il ne reste qu'un joueur, ou le temps
      const left = A.players.filter((P) => !P.data.done);
      if (!S.ended && (left.length <= 1 || A.t >= LIMIT)) {
        S.ended = true;
        const prog = (P) => (P.data.leg ? W + (W - P.x) : P.x);
        const rest = left.slice().sort((a, b) => prog(b) - prog(a)).map((P) => P.i);
        const ranking = S.order.concat(rest);
        const pts = {}; const table = [4, 2, 1, 0];
        ranking.forEach((i, k) => { pts[i] = k === ranking.length - 1 ? 0 : table[k]; });
        const last = A.players[ranking[ranking.length - 1]];
        S.lasts[last.i]++;
        if (ranking.length) S.wins[ranking[0]]++;
        A.endRound({ points: pts, text: `${last.name} est le DERNIER ARRIVÉ !`, sub: `${A.players[ranking[0]].name} gagne la manche`, color: last.css });
      }
    },

    // flèches : la PORTE (là où elle est vraiment, même après le troll) et l'ARRIVÉE dès le premier demi-tour
    goals(A) {
      const S = A.S, out = [];
      if (!S || !S.finish) return out;
      if (A.players.some((P) => !P.data.done && !P.data.leg)) out.push({ x: W - 1.5, z: (S.finish.z0 + S.finish.z1) / 2, color: 0x3cff9a, label: 'PORTE', size: 1.2 });
      if (S.firstTurn) out.push({ x: 1.5, z: D / 2, color: 0xffffff, label: 'ARRIVÉE', size: 1.2 });
      return out;
    },

    draw(A, dt, time) {
      const S = A.S;
      if (S.arr) S.arr.quaternion.copy(A.camera.quaternion);
      if (S.door) { const zc = (S.finish.z0 + S.finish.z1) / 2; S.door.position.z += (zc - S.door.position.z) * Math.min(1, dt * 4); }
      if (S.line) { S.line.scale.z = S.finish.z1 - S.finish.z0; S.line.position.z = (S.finish.z0 + S.finish.z1) / 2; S.line.material.opacity = 0.3 + Math.sin(time * 4) * 0.15; }
      if (S.bridgeMeshes) S.bridgeMeshes.forEach((m, k) => { m.position.z += (S.bridges[k].z + 1 - m.position.z) * Math.min(1, dt * 12); });
      if (C.waterMat) C.waterMat.emissiveIntensity = 0.4 + Math.sin(time * 2) * 0.1;
      for (const b of S.blink) if (b.mesh) { b.mesh.visible = !b.gone && Math.sin(time * 26) > 0; }
      for (const l of S.lasers) if (l.mesh) { l.mesh.visible = l.on || Math.sin(time * 30) > 0.6; l.mesh.material = l.on ? C.laserOn : C.laserOff; }
      for (const z of S.zones) if (z.mesh) { z.mesh.material.opacity = z.fired ? Math.max(0, 0.6 - (z.t - 1.2) * 2) : 0.25 + Math.abs(Math.sin(time * (6 + z.t * 10))) * 0.4; }
      // murs et portes qui sortent du sol (ou y rentrent)
      for (const m of S.pool) if (m.visible) {
        const u = m.userData; u.k = Math.min(1, u.k + dt * (u.down ? -4 : 5));
        m.position.y = -0.5 + u.k * 0.95;
        if (u.down && u.k <= 0) m.visible = false;
      }
      if (C.padMat) C.padMat.emissiveIntensity = 0.3 + Math.abs(Math.sin(time * 3)) * 0.3;   // les tremplins brillent doucement
    },

    hud(A) {
      const S = A.S;
      return {
        timer: LIMIT - A.t,
        note: S.rule ? `RÈGLE : ${RULE_TXT[S.rule][0]}` : '',
        rows: A.players.map((P) => ({ i: P.i, fin: P.data.done, txt: P.data.done ? ['🥇', '🥈', '🥉', '4ᵉ'][A.S.order.indexOf(P.i)] : `${P.data.leg ? '⬅' : '➡'} ${Math.round(Math.max(0, Math.min(1, (P.data.leg ? W + (W - P.x) : P.x) / (2 * W - 3))) * 100)}%` })),
      };
    },
    rush(A) { return A.S.speedX > 1 ? 1.25 : (LIMIT - A.t < 15 ? 1.15 : 1); },
    stats(A, P) { const d = A.stats[P.i]; return [`${A.S.wins[P.i]} manche${A.S.wins[P.i] > 1 ? 's' : ''} gagnée${A.S.wins[P.i] > 1 ? 's' : ''}`, `${d.bumps || 0} coups d'épaule`, `${d.falls || 0} chute${(d.falls || 0) > 1 ? 's' : ''}`]; },
    bonus(A, P) { const o = []; if (A.S.lasts[P.i]) o.push(`Dernier arrivé ×${A.S.lasts[P.i]}`); return o; },
    tiebreak(A, i) { return A.S.wins[i] * 10 - A.S.lasts[i]; },

    /* ---------- LE BOT ---------- */
    bot(A, P, B, L) {
      const o = courseBot(A, P, B, L);
      if (o) o.risky = Math.random() < L.mistake * 0.5;   // un débutant oublie parfois de regarder où il marche
      return o;
    },
    // garde-fou vérifié à chaque pas : pas un pas dans l'eau (sauf le saut d'un tremplin voulu),
    // et les commandes inversées, que le bot finit par comprendre (plus ou moins vite selon son niveau)
    botGuard(A, P, mx, mz, L, C2) {
      const S = A.S;
      const adapted = S.invert && A.clock - (S.invertAt || 0) > 0.5 + (1 - L.skill) * 2.5;
      let ax = S.invert && !adapted ? -mx : mx, az = S.invert && !adapted ? -mz : mz;   // le mouvement RÉEL
      if (!C2.risky && P.h <= 0.05) {
        const wet = (x, z) => A.grid.at(Math.floor(x), Math.floor(z)) === A.VOID && !S.jumpCells.has(Math.floor(z) * W + Math.floor(x));
        const m = Math.hypot(ax, az) || 1;
        for (const k of [0.42, 0.75]) {
          if (!wet(P.x + (ax / m) * k, P.z + (az / m) * k)) continue;
          // on glisse le long du bord (on garde la composante qui ne mène pas à l'eau)
          const sx = wet(P.x + (ax / m) * k, P.z) ? 0 : ax, sz = wet(P.x, P.z + (az / m) * k) ? 0 : az;
          ax = sx; az = sz; break;
        }
      }
      // commandes inversées : le moteur inverse ce qu'on renvoie (le bot adapté compense, l'autre subit)
      return S.invert ? [-ax, -az] : [ax, az];
    },
  });

  /* ---------- Le cerveau du bot ---------- */
  function courseBot(A, P, B, L) {
    const S = A.S, d = P.data;
    if (!P.alive || P.out || d.done) return {};
    // en plein vol (tremplin) : on continue tout droit, on verra à l'atterrissage
    if (P.h > 0.05 && d.flying) return A.Bot.toward(P, P.x + Math.sign(P.kx || P.vx || 1) * 4, P.z, 0.2);
    const [cx, cz] = A.Bot.cell(P);
    const G = A.grid;
    const jumpCost = 2.5 + (1 - L.skill) * 10 + (S.invert ? 40 : 0) + (S.wind ? 4 : 0) + (S.speedX > 1 ? 3 : 0);
    const danger = (x, z) => {
      const i = z * W + x;
      if (G.solid(x, z)) return Infinity;
      if (G.at(x, z) === A.VOID) return S.jumpCells.has(i) ? jumpCost : Infinity;   // le saut d'un tremplin
      let c = 1;
      if (S.blink.some((b) => b.x === x && b.z === z && !b.gone)) c += L.skill > 0.5 ? 40 : 3;
      for (const l of S.lasers) if (l.x === x) c += l.on ? 6 * L.skill : 1;
      for (const zz of S.zones) if (!zz.fired && Math.hypot(x + 0.5 - zz.x, z + 0.5 - zz.z) < 1.6) c += 20 * L.skill;
      if (isCanal(x) && S.bridgeMove > 0) { if (L.skill >= 0.5 && !isCanal(cx)) return Infinity; c += 4; }   // un bon bot attend (ou prend un tremplin)
      if (S.jetty.has(i)) c += 0.5 + (A.others(P).some((O) => Math.hypot(O.x - x - 0.5, O.z - z - 0.5) < 1.2) ? 4 * L.skill : 0);
      c += Math.abs(z + 0.5 - d.pref) * 0.06 * (1 + L.skill);    // chaque bot a son couloir préféré
      return c;
    };
    const goal = d.leg === 0 ? (x, z) => x >= W - 2 && z >= S.finish.z0 && z < S.finish.z1 : (x) => x <= 1;
    const path = A.Bot.dijkstra(cx, cz, goal, danger, 4000);
    let out;
    // le chemin passe par un tremplin tout proche : on s'engage EN LIGNE DROITE jusqu'à l'autre rive
    // (la décision arrive avec le temps de réaction : un chemin « case par case » ferait demi-tour en l'air)
    const j = path ? path.slice(0, 5).findIndex(([x, z]) => S.jumpCells.has(z * W + x)) : -1;
    if (j >= 0) {
      const [jx, jz] = path[j], cn = CANALS.find((c) => c.includes(jx));
      const dir = j > 0 ? Math.sign(jx - path[j - 1][0]) : Math.sign(jx + 0.5 - P.x);
      out = A.Bot.toward(P, dir > 0 ? cn[1] + 3.5 : cn[0] - 2.5, jz + 0.5, 0.2);
    } else if (path && path.length) out = A.Bot.follow(P, trim(P, path, L));
    else out = d.leg === 0 ? A.Bot.toward(P, W - 1, (S.finish.z0 + S.finish.z1) / 2, 0.2) : A.Bot.toward(P, 1, P.z, 0.2);
    // coup d'épaule : un adversaire juste devant ou à côté (jamais en arrivant sur une jetée)
    const T = A.others(P).find((O) => !O.data.done && A.dist(O, P) < 1.0);
    if (T && d.dashCool <= 0 && Math.random() < 0.15 + L.aggro * 0.5) out.tapA = true;
    // jamais bloqué : si on n'avance plus, on se décale un instant
    const M = B.mem;
    if (!M.chkT || A.clock > M.chkT) {
      if (M.lx !== undefined && Math.hypot(P.x - M.lx, P.z - M.lz) < 0.3 && P.stun <= 0) M.unstuck = A.clock + 0.5;
      M.lx = P.x; M.lz = P.z; M.chkT = A.clock + 1.3;
    }
    if (M.unstuck > A.clock) {
      const dirs = A.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      for (const [dx, dz] of dirs) { const nx = cx + dx, nz = cz + dz; if (!G.solid(nx, nz) && G.at(nx, nz) !== A.VOID) return A.Bot.toward(P, nx + 0.5, nz + 0.5, 0.1); }
    }
    return out;
  }

  function O_bump(P) { return P.data.bumpCd > 0; }
  // la décision d'un bot s'applique après son temps de réaction : on retire du chemin les cases
  // qu'il aura déjà dépassées à ce moment-là (sinon il revient en arrière pour les « toucher »)
  // (seulement en ligne droite : on ne coupe jamais un virage, l'eau n'est jamais loin)
  function trim(P, path, L) {
    const qx = P.x + P.vx * L.react * 0.8, qz = P.z + P.vz * L.react * 0.8;
    const cx = Math.floor(P.x), cz = Math.floor(P.z);
    let best = 0, bd = 1e9;
    for (let i = 0; i < Math.min(path.length, 3); i++) {
      const [x, z] = path[i];
      if (x !== cx && z !== cz) break;                   // ce n'est plus la même ligne droite
      const dd = Math.hypot(x + 0.5 - qx, z + 0.5 - qz); if (dd < bd) { bd = dd; best = i; }
    }
    return path.slice(best);
  }
  // une case où l'on peut marcher (ni mur, ni vide, ni case qui va disparaître)
  function walkable(A, x, z, extra) {
    if (A.grid.solid(x, z) || A.grid.at(x, z) === A.VOID) return false;
    return !(extra && extra.has(z * W + x));
  }
  // il reste TOUJOURS un chemin à pied : de l'arrivée à la porte, et pour chaque coureur vers son but
  function pathOK(A, extra) {
    const S = A.S;
    const pass = (x, z) => walkable(A, x, z, extra);
    const door = (x, z) => x >= W - 2 && z >= S.finish.z0 && z < S.finish.z1;
    const home = (x) => x <= 2;
    if (!A.Bot.bfs(1, 10, door, pass, 3000)) return false;
    for (const P of A.players) {
      if (!P.alive || P.out || P.data.done || P.data.respawn > 0) continue;
      const cx = Math.floor(P.x), cz = Math.floor(P.z);
      if (!pass(cx, cz)) continue;                     // en l'air au-dessus du canal : il retombera sur une rive
      if (!A.Bot.bfs(cx, cz, P.data.leg ? home : door, pass, 3000)) return false;
    }
    return true;
  }
  function nearestLane(A, x, z) {
    let best = D / 2, bd = 99;
    for (let lz = 1; lz < D - 1; lz++) {
      if (!walkable(A, x, lz) || A.S.pads.some((p) => p.x === x && p.z === lz)) continue;
      if (Math.abs(lz + 0.5 - z) < bd) { bd = Math.abs(lz + 0.5 - z); best = lz + 0.5; }
    }
    return best;
  }
  function setBridges(A, on) { for (const b of A.S.bridges) for (const x of b.xs) for (let k = 0; k < 2; k++) A.setCell(x, b.z + k, on ? A.FLOOR : A.VOID); }
  // un mur (ou une porte rouge) qui sort du sol : maillages réutilisés d'une règle à l'autre
  function rise(A, x, z, gate) {
    A.setCell(x, z, RISE);
    const r = { x, z, mesh: null };
    if (!A.headless) {
      shared(A);
      let m = A.S.pool.find((o) => !o.visible);
      if (!m) { m = mk(C.wallGeo, C.wallMat); m.castShadow = true; A.add(m); A.S.pool.push(m); }
      m.material = gate ? C.gateMat : C.wallMat;
      m.position.set(x + 0.5, -0.5, z + 0.5); m.visible = true; m.userData.k = 0; m.userData.down = false;
      r.mesh = m;
      A.burst(x + 0.5, 0.2, z + 0.5, 5, [0x8a7060, 0xffd28a], 2.5);
    }
    A.S.risen.push(r);
  }
  // cases interdites aux règles qui bouchent : canaux et rives, tremplins, jetées, départ et bande de la porte
  function keepFree(A, x, z) {
    const S = A.S;
    if (x < 4 || x > W - 5 || z < 1 || z > D - 2) return true;
    if (CANALS.some(([a, b]) => x >= a - 1 && x <= b + 1)) return true;
    return S.jetty.has(z * W + x);
  }
  function startRule(A, r) {
    const S = A.S;
    S.rule = r; S.ruleLeft = 5; S.lastRule = r;
    const G = A.grid;
    if (r === 'sol') {
      const extra = new Set();
      for (let n = 0; n < 40 && extra.size < 26; n++) {
        const x = A.rint(4, W - 5), z = A.rint(1, D - 2);
        if (G.at(x, z) !== 0 || isCanal(x) || S.jetty.has(z * W + x) || extra.has(z * W + x)) continue;
        extra.add(z * W + x);
        if (!pathOK(A, extra)) { extra.delete(z * W + x); continue; }
        const b = { x, z, t: 0, gone: false, mesh: null };
        if (!A.headless) { shared(A); b.mesh = mk(C.blinkGeo, C.blinkMat); b.mesh.position.set(x + 0.5, 0.02, z + 0.5); A.add(b.mesh); }
        S.blink.push(b);
      }
    } else if (r === 'vitesse') S.speedX = 1.9;
    else if (r === 'vent') S.wind = { dir: Math.random() < 0.5 ? 1 : -1 };
    else if (r === 'inverse') { S.invert = A.fill(A.n, 4.2); S.invertAt = A.clock; }
    else if (r === 'murs') {
      for (let n = 0; n < 40 && S.risen.length < 20; n++) {
        const x = A.rint(4, W - 5), z = A.rint(1, D - 2);
        if (G.at(x, z) !== 0 || keepFree(A, x, z)) continue;
        if (A.alive().some((P) => Math.abs(P.x - x - 0.5) < 1.3 && Math.abs(P.z - z - 0.5) < 1.3)) continue;
        if (!pathOK(A, new Set([z * W + x]))) continue;
        rise(A, x, z, false);
      }
      A.shake(0.25);
    } else if (r === 'portes') {
      // on ferme une bonne partie des passages des cloisons (passages étroits compris)
      for (const wz of WALLS) for (let x = X0; x <= X1; x++) {
        if (G.at(x, wz) !== 0 || Math.random() > 0.6) continue;
        if (A.alive().some((P) => Math.abs(P.x - x - 0.5) < 0.9 && Math.abs(P.z - wz - 0.5) < 0.9)) continue;
        if (!pathOK(A, new Set([wz * W + x]))) continue;
        rise(A, x, wz, true);
      }
    } else if (r === 'lasers') {
      // un laser par tronçon (avant le canal 1, entre les canaux, après le canal 2)
      SECTIONS.forEach(([a, b], n) => {
        const l = { x: A.rint(a + 1, b), t: n * 0.73, on: false, mesh: null };
        if (!A.headless) { shared(A); l.mesh = mk(C.laserGeo, C.laserOff); l.mesh.position.set(l.x + 0.5, 0.3, D / 2); A.add(l.mesh); }
        S.lasers.push(l);
      });
    } else if (r === 'ponts') { S.bridgeMove = Math.PI * 2 / BRIDGE_W; S.bridgeT0 = A.t; }
    else if (r === 'zones') {
      const live = A.alive().filter((P) => !P.data.done);
      for (let n = 0; n < 4; n++) {
        const T = live.length ? live[n % live.length] : null;
        const z = { x: T ? T.x + A.rand(-1.2, 1.2) : A.rand(4, W - 4), z: T ? T.z + A.rand(-1, 1) : A.rand(2, D - 2), t: 0, fired: false, mesh: null };
        if (!A.headless) { shared(A); z.mesh = mk(C.zoneGeo, new THREE.MeshBasicMaterial({ color: A.lin(0xff2020), transparent: true, opacity: 0.4, toneMapped: false, depthWrite: false })); z.mesh.rotation.x = -Math.PI / 2; z.mesh.position.set(z.x, 0.03, z.z); A.add(z.mesh); }
        S.zones.push(z);
      }
      for (const P of live) if (P.human) { const z = S.zones.find((q) => Math.hypot(q.x - P.x, q.z - P.z) < 2); if (z) A.warn(P, z.x, z.z); }
    } else if (r === 'troll') {
      S.trolled = true; S.trollAt = A.t;
      S.finish = Math.random() < 0.5 ? { z0: 1, z1: 7 } : { z0: D - 7, z1: D - 1 };   // en haut ou en bas (miroir)
      S.ruleLeft = 0.1;
      A.sfx('bad');
    }
  }
  function endRule(A) {
    const S = A.S, r = S.rule;
    S.rule = null;
    if (r === 'sol') { for (const b of S.blink) { if (b.gone && !b.skip) A.setCell(b.x, b.z, A.FLOOR); A.remove(b.mesh); } S.blink = []; }
    else if (r === 'vitesse') S.speedX = 1;
    else if (r === 'vent') S.wind = null;
    else if (r === 'inverse') S.invert = null;
    else if (r === 'murs' || r === 'portes') { for (const w of S.risen) { A.setCell(w.x, w.z, A.FLOOR); if (w.mesh) w.mesh.userData.down = true; } S.risen = []; }
    else if (r === 'lasers') { for (const l of S.lasers) A.remove(l.mesh); S.lasers = []; }
    else if (r === 'zones') { for (const z of S.zones) { A.remove(z.mesh); if (z.mesh) z.mesh.material.dispose(); } S.zones = []; }
  }

  /* ---------- Le décor : porte, arrivée, drapeaux, eau, ponts, tremplins ---------- */
  function buildScene(A) {
    const S = A.S;
    if (A.headless) return;
    shared(A);
    // la SORTIE
    const door = OT.Models.door ? OT.Models.door('SORTIE') : null;
    if (door) { door.rotation.y = -Math.PI / 2; door.scale.setScalar(1.2); door.position.set(W - 1.2, 0, D / 2); A.add(door); S.door = door; }
    // l'ARRIVÉE à gauche (damier)
    for (let z = 1; z < D - 1; z++) for (let x = 1; x < 3; x++) { if ((x + z) % 2) continue; const c = mk(C.chkGeo, C.chkMat); c.position.set(x + 0.5, 0.015, z + 0.5); A.add(c); }
    const arr = A.label('ARRIVÉE', { size: 34, h: 0.5, color: '#ffffff', border: '#3cff9a' }); arr.position.set(1.8, 1.2, 0.6); A.add(arr); S.arr = arr;
    const line = A.mesh('box', 1, 0x3cff9a, { h: 0.04, basic: true, opacity: 0.4 }); line.scale.set(2, 1, D - 2); line.position.set(W - 2, 0.02, D / 2); A.add(line); S.line = line;
    // les drapeaux de reprise, en haut ET en bas (on les voit même quand la caméra s'approche)
    for (const x of FLAGS.slice(1)) for (const z of [0.5, D - 0.5]) {
      const f = mk(C.poleGeo, C.flagMat); f.position.set(x + 0.5, 1.5, z); A.add(f);
      const c = mk(C.flagGeo, C.flagMat); c.position.set(x + 0.75, 1.95, z); A.add(c);
    }
    // l'eau des canaux et des petites criques des jetées (juste au-dessus du sol du stade, à y = -0,06)
    for (const cn of CANALS) { const w = mk(new THREE.BoxGeometry(2, 0.02, D - 2), C.waterMat); w.position.set(cn[0] + 1, -0.035, D / 2); A.add(w); }
    const inletGeo = new THREE.BoxGeometry(1, 0.02, 1);
    for (const [x, z] of S.inlets) { const w = mk(inletGeo, C.waterMat); w.position.set(x + 0.5, -0.035, z + 0.5); A.add(w); }
    // les ponts (2 cases de large)
    const bGeo = new THREE.BoxGeometry(2, 0.2, 1.95);
    S.bridgeMeshes = S.bridges.map((b) => { const m = mk(bGeo, C.bridgeMat); m.position.set(b.xs[0] + 1, -0.08, b.z + 1); A.add(m); return m; });
    // les tremplins : rampe jaune inclinée vers le canal (les chevrons montrent le sens du saut)
    for (const pd of S.pads) {
      const m = mk(C.padGeo, C.padMat); m.position.set(pd.x + 0.5, 0.1, pd.z + 0.5);
      m.rotation.set(0, pd.dir > 0 ? 0 : Math.PI, 0.22); m.receiveShadow = true;
      A.add(m);
    }
  }
})();
