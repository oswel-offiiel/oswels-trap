/* =====================================================================
   🚂 LE TRAIN DE LA MORT — le dernier sur le toit gagne
   Version 1.4 : le GRAND train
   - 5 wagons de 6 × 6 cases (≈ 34 × 6), reliés par des attelages de
     3 cases de large, en quinconce (passage en haut, puis en bas…) ;
   - sur les toits : des CONTENEURS fixes, différents d'un wagon à
     l'autre (7 modèles, retournés au hasard à chaque manche, jamais
     de wagon bloqué). Ce sont des COUVERTS :
       · ils ARRÊTENT la barrière sur leur ligne (on est à l'abri derrière),
       · ils COUPENT le laser sur leur colonne,
       · ils protègent du VENT si on est collé derrière ;
   - A : sauter (par-dessus les barrières, les lasers, les poussées) ;
   - B : pousser ;
   - obstacles annoncés (bandeau + flèche + voix « À droite ! ») :
     barrière, lasers (ligne rouge sur le wagon visé avant le tir),
     trappes, bombes du drone, coups de vent, freinage, tunnel ;
   - les wagons de queue se DÉCROCHENT à 34, 56, 78 et 98 s (flèche
     « AVANCE ! » vers le wagon de devant) : le terrain rétrécit jusqu'au
     wagon de tête ; sur ce dernier wagon, les événements s'enchaînent
     (toutes les 1,8 s) et 8 s plus tard LE TOIT S'EFFONDRE : le tour
     du wagon clignote puis tombe, il ne reste que le centre ;
   - objets : 🥊 gant (poussée géante), ⚓ ancre (impossible à pousser),
     signalés par une flèche quand ils apparaissent ;
   - les éliminés pilotent le drone et lâchent des bombes.
   3 manches : 3 points au dernier sur le train, 1 par joueur poussé.
   ===================================================================== */
(function () {
  const CAR = 6, D = 6, NCAR = 5;               // un wagon = 6 cases de long, 6 de large
  const W = NCAR * CAR + (NCAR - 1);            // 34 cases (avec les 4 attelages)
  const SPEED = 14;                             // vitesse du décor (cases / s)
  const BAR_V = 10;                             // la barrière balaie le train (cases / s) : ~3,5 s de bout en bout
  const LASER_V = 3.4;                          // le laser traverse un wagon (cases / s)
  const BOX = 10;                               // code de case « conteneur » : solide, dessiné par le jeu
  const DETACH = [34, 56, 78, 98];              // les wagons de queue se décrochent (secondes de jeu)
  const carX = (k) => k * (CAR + 1);            // première case du wagon k (0 = le dernier, à gauche)
  const carOf = (x) => Math.floor(x / (CAR + 1));
  // les attelages : 3 cases de large, en quinconce (attelage j = entre le wagon j et le wagon j + 1)
  const PASS = [[2, 3, 4], [1, 2, 3], [2, 3, 4], [1, 2, 3]];
  // les modèles de conteneurs, en cases locales d'un wagon : [x, z, longueur, largeur]
  // règle : jamais de conteneur sur les colonnes 0 et 5 entre les lignes 1 et 4 (les entrées des attelages)
  const PATTERNS = [
    [[1, 1, 2, 1], [3, 4, 2, 1]],                         // slalom
    [[2, 2, 2, 2]],                                       // gros bloc au milieu
    [[1, 2, 4, 1]],                                       // couloir : deux allées
    [[1, 0, 2, 1], [3, 5, 2, 1], [3, 2, 1, 1]],           // rambardes au bord + une caisse
    [[2, 0, 1, 2], [3, 4, 1, 2]],                         // en travers : zigzag
    [[1, 1, 1, 1], [4, 1, 1, 1], [1, 4, 1, 1], [4, 4, 1, 1]],   // quatre piliers
    [[2, 1, 2, 1], [2, 2, 1, 1], [4, 4, 1, 1]],           // en L
  ];
  const BOX_COLORS = [0xb8352a, 0x2e6fb0, 0x2f8f4e, 0xd08a2a, 0x6a4fa0, 0x2f8f8f];
  const EVENTS = ['bar', 'bar', 'laser', 'trap', 'bombs', 'wind', 'brake', 'tunnel', 'laser'];
  // départs : [wagon, x local, z] selon le nombre de joueurs (mélangés à chaque manche)
  const SPOTS = {
    2: [[1, 3, 3], [3, 3, 3]],
    3: [[1, 3, 3], [2, 3, 3], [3, 3, 3]],
    4: [[1, 3, 1.5], [1, 3, 4.5], [3, 3, 1.5], [3, 3, 4.5]],
  };

  /* ---------- Géométries et matériaux partagés (créés une seule fois) ---------- */
  const C = {};
  function shared(A) {
    if (C.ok || A.headless) return C;
    C.ok = true;
    const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: A.lin(c), roughness: 0.6, metalness: 0.15 }, o));
    const basic = (c, op) => new THREE.MeshBasicMaterial({ color: A.lin(c), transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    C.barGeo = new THREE.BoxGeometry(0.3, 0.3, 1.0);            // un morceau de barrière (une ligne)
    C.barMat = std(0xffd23a, { emissive: A.lin(0xff7a1a), emissiveIntensity: 0.5 });
    C.postGeo = new THREE.BoxGeometry(0.2, 1.7, 0.2);           // les poteaux du portique
    C.postMat = std(0xffd23a, { emissive: A.lin(0xff7a1a), emissiveIntensity: 0.25, metalness: 0.3 });
    C.laserGeo = new THREE.BoxGeometry(1.0, 0.13, 0.13);        // un morceau de laser (une colonne)
    C.laserMat = basic(0xff2020, 0.9);
    C.prevGeo = new THREE.BoxGeometry(CAR, 0.04, 0.55);         // la ligne rouge qui annonce un laser
    C.prevMat = basic(0xff2020, 0.5);
    C.trapGeo = new THREE.BoxGeometry(0.9, 0.04, 0.9);
    C.trapMat = basic(0xff5533, 0.6);
    C.bombGeo = new THREE.SphereGeometry(0.25, 16, 12);
    C.bombMat = std(0x24262c, { metalness: 0.4, roughness: 0.5 });
    C.shadowGeo = new THREE.CircleGeometry(1.3, 28);
    C.shadowMat = basic(0xff2020, 0.35);
    // tôle ondulée des conteneurs (blanche : la couleur vient du matériau)
    C.boxTex = OT.Models.canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.22)'; for (let x = 2; x < w; x += 8) g.fillRect(x, 0, 3, h);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, w, 4); g.fillRect(0, h - 4, w, 4);
    });
    C.boxMats = {}; C.boxGeos = {};
    return C;
  }
  const mk = (geo, mat) => new THREE.Mesh(geo, mat);

  /* ---------- Les conteneurs d'une manche ---------- */
  function makeBoxes(A) {
    const list = [], cells = new Set();
    const order = A.shuffle(PATTERNS.map((p, i) => i));   // un modèle différent par wagon
    for (let k = 0; k < NCAR; k++) {
      const pat = PATTERNS[order[k % order.length]];
      const fx = Math.random() < 0.5, fz = Math.random() < 0.5;   // retourné au hasard
      for (const [lx, lz, w, d] of pat) {
        const x = carX(k) + (fx ? CAR - lx - w : lx), z = fz ? D - lz - d : lz;
        list.push({ x, z, w, d, k, col: A.pick(BOX_COLORS) });
        for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) cells.add((z + j) * W + x + i);
      }
    }
    return { list, cells };
  }
  function layoutOf(cells) {
    return (x, z) => {
      const k = Math.floor(x / (CAR + 1)), r = x % (CAR + 1);
      if (r === CAR) return PASS[k].includes(z) ? 0 : 3;   // attelage : un passage de 3 cases, du vide autour
      return cells.has(z * W + x) ? BOX : 0;
    };
  }
  // la case libre la plus proche d'un point d'un wagon
  function freeSpot(A, k, fx, fz) {
    let best = null, bd = 1e9;
    for (let x = carX(k); x < carX(k) + CAR; x++) for (let z = 0; z < D; z++) {
      if (A.grid.at(x, z) !== A.FLOOR) continue;
      const dd = Math.hypot(x + 0.5 - (carX(k) + fx), z + 0.5 - fz);
      if (dd < bd) { bd = dd; best = [x + 0.5, z + 0.5]; }
    }
    return best || [carX(k) + fx, fz];
  }
  const firstCar = (S) => NCAR - S.cars;          // le wagon de queue encore accroché

  OT.Arena.register({
    id: 'train', name: 'Le Train de la mort', icon: '🚂', color: '#ff5533', theme: 'train', music: 'train',
    tagline: 'Reste sur le toit du train. Pousse les autres dans le vide.',
    goal: 'Reste le DERNIER sur le toit du train : pousse les autres dans le vide !',
    howto: [
      'Bouge avec {move} sur le toit des 5 wagons.',
      '{a} : sauter par-dessus les barrières et les lasers.',
      '{b} : pousser. 🥊 gant = poussée géante, ⚓ ancre = impossible à pousser.',
      'Cache-toi derrière les conteneurs : ils arrêtent la barrière, le laser et le vent.',
    ],
    danger: 'Les wagons de queue se DÉCROCHENT un par un (toutes les ~22 s) : suis la flèche « AVANCE ! ».',
    win: '+3 points au dernier sur le train, +1 par joueur que tu fais tomber.',
    lose: 'Tombé ? Tu pilotes le drone et tu lâches des bombes avec {a}.',
    tuto: ['Déplace-toi : {move}', '{a} : sauter (barrières, lasers)', '{b} : pousser'],
    rules: [
      'B : pousser. Fais tomber les autres du train (+1 point par chute provoquée).',
      'A : sauter par-dessus les barrières et les lasers. Les conteneurs t\'abritent (barrière, laser, vent).',
      'Trappes, bombes, coups de vent, freinage, tunnel… et les wagons de queue se DÉCROCHENT un par un !',
      'Objets : 🥊 gant (poussée géante), ⚓ ancre (impossible à pousser). Les éliminés pilotent le drone.',
    ],
    controls: { a: 'Sauter (drone : lâcher une bombe)', b: 'Pousser' },
    rounds: 3, scoreName: 'points', maxRound: 135,
    // tout le train (+ la locomotive) ; la caméra cadre l'action et glisse vers l'avant quand il rétrécit
    view: () => ({ x0: -0.5, z0: -2, x1: W + 1, z1: D + 2 }),
    tilt: 36,
    camMin: 0.55,         // jamais moins de ~19 cases de long à l'écran : 4 joueurs lisibles, on voit venir la barrière
    stadium: false,       // le décor défile (on est sur un train) : pas de stade
    knockDrag: 3.0,
    botCompensate: true,  // les bots résistent au vent et au freinage (comme un humain)

    setup(A) { A.S.wins = A.fill(A.n, 0); },

    round(A) {
      const S = A.S;
      const bx = makeBoxes(A);
      S.boxes = bx.list;
      A.buildGrid(W, D, layoutOf(bx.cells), 'train', { outside: A.VOID, solid: [BOX] });
      S.cars = NCAR; S.nextEv = 4; S.evK = 0; S.detachI = 0; S.detach = null;
      S.bars = []; S.lasers = []; S.traps = []; S.bombs = []; S.wind = null; S.brake = 0; S.tunnel = 0; S.items = []; S.itemT = 7;
      S.scroll = 0; S.order = []; S.ended = false; S.warn = null; S.falling = null; S.collapsed = false;
      const spots = A.shuffle(SPOTS[Math.max(2, Math.min(4, A.n))]);
      A.players.forEach((P, i) => {
        const [k, fx, fz] = spots[i % spots.length];
        const [x, z] = freeSpot(A, k, fx, fz);
        A.place(P, x, z); P.face = Math.PI / 2;
        P.speed = 4.4; P.r = 0.3;
        P.data = { pushCool: 0, pushT: 0, glove: 0, anchorT: 0, pushes: 0, jumps: 0, droneCool: 2 };
      });
      buildScene(A);
    },

    bodies: true,
    knockThroughInv: false,
    speedMod(A, P) { return P.ghost ? 1.6 : (P.data.pushT > 0 ? 1.5 : 1); },
    grip(A, P) { return P.h > 0.05 ? 3 : 22; },
    drift(A, P) {
      if (P.ghost) return null;
      const S = A.S; let x = 0, z = 0;
      if (S.wind && !sheltered(A, P, S.wind.dir)) z += S.wind.dir * 3.0;
      if (S.brake > 0) x += 4.5;
      return x || z ? { x, z } : null;
    },
    safe(A, P) { return P.h > 0.05; },

    // pendant le compte à rebours et l'entraînement, le décor défile déjà
    idle(A, dt) { if (A.S) A.S.scroll = (A.S.scroll || 0) + SPEED * dt; },

    onFall(A, P) {
      const S = A.S;
      P.out = true;
      S.order.push(P.i);
      const by = P.lastHit && A.clock - P.lastHit.t < 3 && P.lastHit.by !== P ? P.lastHit.by : null;
      if (by) { A.point(by.i, 1); A.say(P.x, P.z, `Poussé par ${by.name} !`, by.css, 26); }
      else A.say(P.x, P.z, 'Tombé du train !', '#ffffff', 26);
      // après la chute, il devient pilote du drone
      if (A.alive().length >= 2) P.data.toDrone = 1.2;
    },

    update(A, dt) {
      const S = A.S;
      S.scroll += SPEED * dt;
      S.brake = Math.max(0, S.brake - dt); S.tunnel = Math.max(0, S.tunnel - dt);
      // événements annoncés (1,6 s d'avance : bandeau, flèche, ligne rouge pour les lasers)
      if (S.warn) { S.warn.t -= dt; if (S.warn.t <= 0) { startEvent(A, S.warn); S.warn = null; } }
      else {
        S.nextEv -= dt;
        if (S.nextEv <= 0) {
          const type = EVENTS[(S.evK++ * 5 + A.rint(0, 3)) % EVENTS.length];
          S.warn = prepareEvent(A, type); S.nextEv = S.cars === 1 ? 1.8 : Math.max(2.2, 4.8 - A.t * 0.03);   // dernier wagon : ça s'enchaîne
          announce(A, S.warn);
        }
      }
      // les wagons de queue se décrochent
      if (S.detachI < DETACH.length && S.cars > 1 && A.t > DETACH[S.detachI] - 4 && !S.detach) {
        const k = firstCar(S), last = S.cars === 2;
        S.detach = { k, t: 4, goal: freeSpot(A, k + 1, CAR / 2, D / 2) };
        if (last) { A.banner('DERNIER WAGON !', 'Tout le monde sur la tête du train !', '#ff5533', 2.4); A.announce('sudden'); }
        else A.banner('Le wagon de queue se décroche !', 'Avance vers la locomotive !', '#ff5533', 2.2);
        A.sfx('warn');
      }
      if (S.detach) {
        S.detach.t -= dt;
        if (Math.random() < dt * 20) A.burst(carX(S.detach.k) + CAR + 0.5, 0.2, A.rand(0.5, D - 0.5), 2, [0xffd23a, 0xff7a1a], 4);
        if (S.detach.t <= 0) {
          const k = S.detach.k;
          for (let x = carX(k); x <= carX(k) + CAR; x++) for (let z = 0; z < D; z++) A.setCell(x, z, A.VOID);
          if (S.carMeshes[k]) S.falling = { m: S.carMeshes[k], t: 0 };
          // les objets restés sur ce wagon partent avec lui
          for (const it of S.items) if (carOf(it.x) <= k) { it.dead = true; A.remove(it.mesh); }
          S.cars--; S.detachI++; S.detach = null;
          A.sfx('boom'); A.shake(0.5);
        }
      }
      // dernier wagon depuis 8 s : le tour du toit s'effondre (annoncé 2 s avant, définitif)
      if (S.cars === 1 && !S.collapsed && A.t > DETACH[DETACH.length - 1] + 8) {
        S.collapsed = true;
        const x0 = carX(NCAR - 1);
        for (let x = x0; x < x0 + CAR; x++) for (let z = 0; z < D; z++) {
          if ((x > x0 && x < x0 + CAR - 1 && z > 0 && z < D - 1) || A.grid.at(x, z) !== A.FLOOR) continue;
          const t = { x, z, t: -0.6, open: false, perm: true, mesh: null };
          if (!A.headless) { shared(A); t.mesh = mk(C.trapGeo, C.trapMat); t.mesh.position.set(x + 0.5, 0.03, z + 0.5); A.add(t.mesh); }
          S.traps.push(t);
        }
        A.banner('Le toit s\'effondre !', 'Reste au centre du wagon !', '#ff5533', 2); A.sfx('warn'); A.shake(0.3);
        for (const P of A.alive()) if (P.human) A.warn(P, P.x, P.z);
      }
      // joueurs : sauter, pousser, objets
      for (const P of A.players) {
        const d = P.data;
        if (d.toDrone > 0) {
          d.toDrone -= dt;
          if (d.toDrone <= 0) { A.place(P, (carX(firstCar(S)) + W) / 2, D / 2); P.ghost = true; P.noClip = true; P.out = true; P.alive = false; d.droneCool = 2.5; A.say(P.x, P.z, '🛸 ' + P.name + ' pilote le drone !', P.css, 26); }
          continue;
        }
        if (P.ghost) { droneUpdate(A, P, dt); continue; }
        if (!P.alive || P.out) continue;
        if (P.in.aP && P.h <= 0.02) { P.vh = 7.5; P.h = 0.01; d.jumps++; A.sfx('jump'); }
        d.pushCool = Math.max(0, d.pushCool - dt);
        if (P.in.bP && d.pushCool <= 0 && P.stun <= 0) {
          d.pushCool = 0.95; d.pushT = 0.1; d.armR = -1.6; d.armL = -1.6; d.armCd = 0.25;
          A.sfx('push');
          const pow = d.glove > 0 ? 13 : 7.5;
          for (const O of A.others(P)) {
            const dx = O.x - P.x, dz = O.z - P.z, dist = Math.hypot(dx, dz);
            if (dist > 1.05 || O.h > 0.5) continue;
            const ang = Math.abs(diffA(Math.atan2(dx, dz), P.face));
            if (ang > 1.0 && dist > 0.6) continue;
            if (A.knock(O, Math.sin(P.face) * 0.7 + dx / (dist || 1) * 0.3, Math.cos(P.face) * 0.7 + dz / (dist || 1) * 0.3, pow, 0.3, P)) { d.pushes++; A.stat(P.i, 'pushes', 1); A.sfx('hit'); A.burst(O.x, 0.6, O.z, 8, [0xffffff, P.color], 4); }
          }
          if (d.glove > 0) d.glove--;
        }
        if (d.armCd > 0) d.armCd -= dt; else { delete d.armR; delete d.armL; }
        for (const it of S.items) if (!it.dead && Math.hypot(it.x - P.x, it.z - P.z) < 0.6) {
          it.dead = true; A.remove(it.mesh);
          if (it.type === 'glove') { d.glove = 2; A.say(P.x, P.z, '🥊 Gant ! (2 poussées)', '#ffd28a', 24); }
          else { d.anchorT = 6; A.say(P.x, P.z, '⚓ Ancre !', '#5ad1ff', 24); }
          A.sfx('power'); A.voice('item', P);
        }
      }
      S.items = S.items.filter((i) => !i.dead);
      S.itemT -= dt;
      if (S.itemT <= 0 && S.items.length < 3) { S.itemT = 8; spawnItem(A); }
      // barrières : elles balaient le train de l'avant vers l'arrière ; un conteneur ARRÊTE sa ligne
      // jusqu'au bout du wagon (à l'attelage suivant, la barrière se reforme en entier)
      for (const b of S.bars) {
        b.x -= dt * BAR_V;
        const cx = Math.floor(b.x);
        if (cx >= 0 && cx < W && cx % (CAR + 1) === CAR && b.rows.some((r) => !r)) {
          for (let z = 0; z < D; z++) { b.rows[z] = true; if (b.seg[z]) b.seg[z].visible = true; }
        }
        let broke = false;
        for (let z = 0; z < D; z++) if (b.rows[z] && A.grid.at(cx, z) === BOX) {
          b.rows[z] = false; broke = true;
          if (b.seg[z]) b.seg[z].visible = false;
          A.burst(b.x + 0.4, 0.5, z + 0.5, 8, [0xffd23a, 0xffffff, 0x555555], 4);
        }
        if (broke) A.sfx('small');
        for (const P of A.alive()) {
          const r = Math.floor(P.z);
          if (r < 0 || r >= D || !b.rows[r]) continue;
          // un humain entend « Devant ! / À droite ! » juste avant qu'elle arrive sur lui (s'il n'est pas à l'abri)
          if (P.human && !b.warned[P.i] && b.x > P.x && (b.x - P.x) / BAR_V < 1.1 && barHits(A, b, P)) { b.warned[P.i] = true; A.warn(P, b.x, P.z); }
          if (Math.abs(P.x - b.x) < 0.35 && P.h < 0.45 && !P.data.barHit) { P.data.barHit = 0.5; A.knock(P, -1, A.rand(-0.3, 0.3), 6, 0.4, null); P.lastHit = null; A.say(P.x, P.z, 'BAM !', '#ffffff', 26); A.sfx('hit'); A.shake(0.2); }
        }
      }
      S.bars = S.bars.filter((b) => { if (b.x < -2) { removeAll(A, b.seg); removeAll(A, b.posts); return false; } return true; });
      // lasers : ils balaient un wagon en travers ; un conteneur COUPE sa colonne
      for (const l of S.lasers) {
        l.z += dt * LASER_V * l.dir;
        const cz = Math.floor(l.z);
        for (let c = 0; c < CAR; c++) if (l.cols[c] && A.grid.at(l.x0 + c, cz) === BOX) {
          l.cols[c] = false;
          if (l.seg[c]) l.seg[c].visible = false;
          A.burst(l.x0 + c + 0.5, 0.4, l.z, 6, [0xff2020, 0xffffff], 3);
        }
        for (const P of A.alive()) {
          const c = Math.floor(P.x) - l.x0;
          if (c < 0 || c >= CAR || !l.cols[c]) continue;
          const ahead = (P.z - l.z) * l.dir;
          if (P.human && !l.warned[P.i] && ahead > 0 && ahead / LASER_V < 1.1) { l.warned[P.i] = true; A.warn(P, P.x, l.z); }
          if (Math.abs(P.z - l.z) < 0.3 && P.h < 0.45 && !P.data.barHit) { P.data.barHit = 0.5; A.knock(P, 0, l.dir, 5.5, 0.5, null); A.say(P.x, P.z, '⚡ Zap !', '#ff5533', 24); A.sfx('zap'); }
        }
      }
      S.lasers = S.lasers.filter((l) => { if ((l.dir > 0 && l.z > D + 0.5) || (l.dir < 0 && l.z < -0.5)) { removeAll(A, l.seg); return false; } return true; });
      for (const P of A.players) if (P.data.barHit > 0) P.data.barHit = Math.max(0, P.data.barHit - dt);
      // trappes
      for (const t of S.traps) {
        t.t += dt;
        if (t.t > 1.4 && !t.open) {
          t.open = true;
          if (A.grid.at(t.x, t.z) === A.FLOOR) A.setCell(t.x, t.z, A.VOID); else t.skip = true;
          // effondrement définitif : l'objet posé là tombe aussi
          if (t.perm) for (const it of S.items) if (Math.floor(it.x) === t.x && Math.floor(it.z) === t.z) { it.dead = true; A.remove(it.mesh); A.burst(it.x, 0.3, it.z, 8, [0xffffff, 0x888888], 3); }
        }
        if (t.t > 4.2) { t.done = true; if (!t.skip && !t.perm && t.x >= carX(firstCar(S))) A.setCell(t.x, t.z, A.FLOOR); A.remove(t.mesh); }
      }
      S.traps = S.traps.filter((t) => !t.done);
      S.items = S.items.filter((i) => !i.dead);
      // bombes (drone)
      for (const b of S.bombs) {
        b.t += dt;
        if (b.t >= b.fuse && !b.done) {
          b.done = true; A.remove(b.mesh); A.remove(b.shadow);
          A.sfx('boom'); A.shake(0.35); A.burst(b.x, 0.4, b.z, 22, [0xff7a1a, 0xffd23a, 0x333333], 6, { up: 3 });
          for (const P of A.alive()) { const dd = Math.hypot(P.x - b.x, P.z - b.z); if (dd < 1.5 && P.h < 0.6) A.knock(P, P.x - b.x + 0.01, P.z - b.z, 10 - dd * 3, 0.4, b.by); }
        }
      }
      S.bombs = S.bombs.filter((b) => !b.done);
      if (S.wind) { S.wind.t -= dt; if (S.wind.t <= 0) S.wind = null; }
      // fin de la manche
      const live = A.alive();
      if (live.length <= 1 && !S.ended) {
        S.ended = true;
        if (live[0]) { S.wins[live[0].i]++; A.endRound({ points: { [live[0].i]: 3 }, text: `${live[0].name} est le dernier sur le train !`, sub: '+3 points', color: live[0].css }); }
        else A.endRound({ text: 'Plus personne sur le train !', color: '#ff5533' });
      }
    },

    timeoutRank(A) { const w = A.alive(); return { text: 'Terminus !', sub: w.map((p) => p.name).join(', ') + ' +1', points: Object.fromEntries(w.map((p) => [p.i, 1])) }; },

    // flèches d'objectif : le wagon de devant quand celui-ci va se décrocher, et les objets
    goals(A) {
      const S = A.S, out = [];
      if (!S || !S.items) return out;
      if (S.detach && S.detach.goal) out.push({ x: S.detach.goal[0], z: S.detach.goal[1], color: 0xff5533, label: 'AVANCE !', size: 1.15 });
      for (const it of S.items) if (!S.detach || carOf(it.x) > S.detach.k) out.push({ x: it.x, z: it.z, color: it.type === 'glove' ? 0xffb347 : 0x5ad1ff, label: it.type === 'glove' ? '🥊 GANT' : '⚓ ANCRE', size: 0.8, y: 0.3 });
      return out.slice(0, 4);
    },

    draw(A, dt, time) {
      const S = A.S;
      if (S.ground) { S.ground.map.offset.x = (S.scroll / S.groundTile) % 1; }
      if (S.rails) S.rails.map.offset.x = (S.scroll / 2) % 1;
      for (const p of S.poles || []) { p.position.x -= SPEED * dt; if (p.position.x < S.poleMin) p.position.x += S.poleLoop; }
      if (S.falling) { S.falling.t += dt; S.falling.m.position.x -= dt * (6 + S.falling.t * 8); S.falling.m.position.y -= dt * S.falling.t * 4; if (S.falling.t > 3) { A.remove(S.falling.m); S.falling = null; } }
      for (const b of S.bars) { for (const m of b.seg) m.position.x = b.x; for (const m of b.posts) m.position.x = b.x; }
      if (C.laserMat) C.laserMat.opacity = 0.7 + Math.sin(time * 40) * 0.25;
      for (const l of S.lasers) for (const m of l.seg) m.position.z = l.z;
      // la ligne rouge qui annonce un laser (sur le bord du wagon visé)
      if (S.prevs) S.prevs.forEach((m, k) => {
        const w = S.warn && S.warn.type === 'laser' ? S.warn.lasers[k] : null;
        m.visible = !!w;
        if (w) m.position.set(carX(w.k) + CAR / 2, 0.04, w.dir > 0 ? 0.3 : D - 0.3);
      });
      if (C.prevMat) C.prevMat.opacity = 0.3 + Math.abs(Math.sin(time * 9)) * 0.45;
      for (const t of S.traps) if (t.mesh) { t.mesh.visible = !t.open && (t.perm || Math.sin(time * 24) > 0); }   // effondrement : rouge fixe
      for (const b of S.bombs) { if (b.mesh) b.mesh.position.y = Math.max(0.3, 6 * (1 - b.t / b.fuse)); if (b.shadow) b.shadow.scale.setScalar(0.4 + b.t / b.fuse); }
      for (const it of S.items) if (it.mesh) { it.mesh.position.y = Math.sin(time * 3 + it.x) * 0.08; it.mesh.userData.lab.quaternion.copy(A.camera.quaternion); }
      if (S.arrow) { S.arrow.visible = !!S.warn && S.warn.type !== 'laser' && Math.sin(time * 16) > -0.2; S.arrow.quaternion.copy(A.camera.quaternion); }
      // tunnel : tout s'assombrit sauf autour des joueurs
      if (S.lights) {
        const dark = S.tunnel > 0;
        S.tunnelK = A.lerp(S.tunnelK || 0, dark ? 1 : 0, Math.min(1, dt * 5));
        A.root.parent.children.forEach((o) => { if (o.isHemisphereLight) o.intensity = 0.85 * (1 - S.tunnelK * 0.88); if (o.isDirectionalLight) o.intensity = 1.15 * (1 - S.tunnelK * 0.92); });
        S.lights.forEach((L, k) => { const P = A.players[k]; L.visible = S.tunnelK > 0.05 && P && P.alive && !P.out; if (P) L.position.set(P.x, 2.2, P.z); L.intensity = 1.6 * S.tunnelK; });
      }
      for (const P of A.players) if (P.ghost && P.data.cross) { P.data.cross.position.set(P.x, 0.08, P.z); P.data.cross.rotation.z += dt * 2; }
    },

    cleanup(A) {
      if (A.headless) return;
      A.root.parent.children.forEach((o) => { if (o.isHemisphereLight) o.intensity = 0.85; if (o.isDirectionalLight) o.intensity = 1.15; });
    },

    hud(A) {
      const S = A.S;
      const warnTxt = S.warn ? { bar: '⚠ BARRIÈRE : saute ou cache-toi derrière un conteneur !', laser: '⚠ LASER : saute !', trap: '⚠ Trappes !', bombs: '⚠ Le drone bombarde !', wind: '⚠ Coup de vent : abrite-toi !', brake: '⚠ Freinage !', tunnel: '⚠ Tunnel !' }[S.warn.type]
        : S.detach ? `⚠ Le wagon de queue se décroche dans ${Math.max(1, Math.ceil(S.detach.t))} s : AVANCE !` : '';
      return {
        timer: null, note: warnTxt,
        rows: A.players.map((P) => ({ i: P.i, txt: P.ghost ? '🛸' : P.out ? '✖' : `${P.data.glove ? '🥊' : ''}${P.data.anchorT > 0 ? '⚓' : ''}` })),
      };
    },
    rush(A) { return A.S.cars <= 2 ? 1.15 : 1; },
    stats(A, P) { const d = A.stats[P.i]; return [`${d.kills || 0} poussé${(d.kills || 0) > 1 ? 's' : ''} dans le vide`, `${d.pushes || 0} poussées`, `${d.falls || 0} chute${(d.falls || 0) > 1 ? 's' : ''}`]; },
    bonus(A, P) { return A.S.wins[P.i] ? [`Dernier sur le train ×${A.S.wins[P.i]}`] : []; },
    tiebreak(A, i) { return A.S.wins[i]; },

    /* ---------- LE BOT ---------- */
    bot(A, P, B, L) {
      const o = trainBot(A, P, B, L);
      if (o) o.risky = Math.random() < L.mistake * 0.5;   // un débutant oublie parfois de regarder où il marche
      return o;
    },
    // garde-fou vérifié en continu : on ne marche pas droit dans le vide
    botGuard(A, P, mx, mz, L, C2) {
      if (P.ghost || C2.risky) return [mx, mz];
      const m = Math.hypot(mx, mz) || 1;
      for (const k of [0.45, 0.8]) {
        const ax = P.x + (mx / m) * k, az = P.z + (mz / m) * k;
        if (A.grid.at(Math.floor(ax), Math.floor(az)) === A.VOID) {
          // on glisse le long du bord, ou on revient vers le milieu du wagon
          const sx = A.grid.at(Math.floor(P.x + (mx / m) * k), Math.floor(P.z)) === A.VOID ? 0 : mx;
          const sz = A.grid.at(Math.floor(P.x), Math.floor(P.z + (mz / m) * k)) === A.VOID ? 0 : mz;
          if (sx || sz) return [sx, sz];
          return [0, (D / 2 - P.z) * 0.6];
        }
      }
      return [mx, mz];
    },
  });

  /* ---------- Le cerveau du bot ---------- */
  function trainBot(A, P, B, L) {
    const S = A.S, d = P.data, G = A.grid;
    if (P.ghost) {
      // le drone vise de préférence quelqu'un qui n'est PAS à l'abri d'un conteneur
      const T = A.Bot.target(P, L);
      if (!T) return {};
      const o = A.Bot.dir(P, T.x + T.vx * 0.6, T.z + T.vz * 0.6);
      if (Math.hypot(T.x - P.x, T.z - P.z) < 0.7 && d.droneCool <= 0) o.tapA = true;
      return o;
    }
    if (!P.alive || P.out) return {};
    const out = {};
    // sauter : barrière ou laser qui arrive sur ma ligne / ma colonne (sauf si un conteneur me protège)
    const lead = L.react + 0.12;
    const row = Math.floor(P.z), col = Math.floor(P.x);
    for (const b of S.bars) { if (!barHits(A, b, P)) continue; const tt = (b.x - P.x) / BAR_V; if (tt > 0 && tt < lead + 0.12 && Math.random() < 0.55 + L.skill * 0.45) out.tapA = true; }
    for (const l of S.lasers) { const c = col - l.x0; if (c < 0 || c >= CAR || !l.cols[c]) continue; const dz = (P.z - l.z) * l.dir; if (dz > 0 && dz / LASER_V < lead + 0.1 && Math.random() < 0.55 + L.skill * 0.45) out.tapA = true; }
    // cases praticables : ni vide, ni conteneur, ni trappe qui va s'ouvrir
    const pass = (x, z) => G.at(x, z) !== A.VOID && !G.solid(x, z) && !S.traps.some((t) => t.x === x && t.z === z && t.t > 0.7);
    // où se placer : une case d'un wagon de l'avant, loin des bords, à l'abri si besoin
    const fc = firstCar(S) + (S.detach ? 1 : 0);
    const barComing = S.bars.length || (S.warn && S.warn.type === 'bar');
    const windDir = S.wind ? S.wind.dir : (S.warn && S.warn.type === 'wind' ? 0 : null);
    let best = null, bs = -1e9;
    for (let k = Math.min(NCAR - 1, fc); k < NCAR; k++) {
      for (let lx = 0; lx < CAR; lx++) for (let z = 0; z < D; z++) {
        const x = carX(k) + lx;
        if (!pass(x, z)) continue;
        const cx = x + 0.5, cz = z + 0.5;
        let s = -Math.hypot(cx - P.x, cz - P.z) * 0.45 + k * 0.6 * L.skill;
        const e = edgeCell(A, x, z);
        if (e <= 1) s -= (2 - e) * 1.4 * (0.4 + L.skill);
        if (S.traps.some((t) => Math.abs(t.x - x) <= 1 && Math.abs(t.z - z) <= 1)) s -= 5;
        for (const b of S.bombs) if (Math.hypot(b.x - cx, b.z - cz) < 1.8) s -= 8;
        for (const O of A.others(P)) if (Math.hypot(O.x - cx, O.z - cz) < 1.3) s -= 1.5 * (1 - L.aggro);
        // abri : un conteneur juste devant (barrière) ou contre le vent
        if (barComing && (G.at(x + 1, z) === BOX || G.at(x + 2, z) === BOX)) s += 2.2 * L.skill;
        if (windDir && (G.at(x, z - windDir) === BOX || G.at(x, z - 2 * windDir) === BOX)) s += 1.6 * L.skill;
        s += (Math.random() - 0.5) * (1 - L.skill) * 2;
        if (s > bs) { bs = s; best = [x, z]; }
      }
    }
    // jamais bloqué : si on n'avance plus alors qu'on veut aller loin, on se décale un instant
    const M = B.mem;
    if (!M.chkT || A.clock > M.chkT) {
      if (M.lx !== undefined && M.far && Math.hypot(P.x - M.lx, P.z - M.lz) < 0.25) M.unstuck = A.clock + 0.6;
      M.lx = P.x; M.lz = P.z; M.chkT = A.clock + 1.2;
    }
    if (M.unstuck > A.clock) {
      if (!M.uDir || M.uT < A.clock) { M.uDir = A.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]); M.uT = A.clock + 0.3; }
      const nx = Math.floor(P.x) + M.uDir[0], nz = Math.floor(P.z) + M.uDir[1];
      if (pass(nx, nz)) return Object.assign(out, A.Bot.toward(P, nx + 0.5, nz + 0.5, 0.1));
      M.uT = 0;
    }
    const [cx0, cz0] = A.Bot.cell(P);
    // pousser un adversaire proche, surtout s'il est près du vide
    const T = A.others(P).filter((O) => A.dist(O, P) < 3.4 && O.h < 0.3).sort((a, b) => (edgeDist(A, a) + A.dist(a, P) * 0.5) - (edgeDist(A, b) + A.dist(b, P) * 0.5))[0];
    if (!M.huntT || A.clock > M.huntT) { M.hunt = Math.random() < 0.2 + L.aggro * 0.6; M.huntT = A.clock + 1.5; }
    if (T && M.hunt && (edgeDist(A, T) < 2 || L.chaos || L.aggro > 0.5) && !(S.detach && carOf(T.x) <= S.detach.k && S.detach.t < 2)) {
      M.far = A.dist(T, P) > 1.2;
      if (A.dist(T, P) < 1.4) Object.assign(out, A.Bot.toward(P, T.x, T.z, 0.55));
      else {
        const tx = Math.floor(T.x), tz = Math.floor(T.z);
        const path = A.Bot.bfs(cx0, cz0, (x, z) => x === tx && z === tz, pass, 400);
        Object.assign(out, path && path.length ? A.Bot.follow(P, path) : A.Bot.toward(P, T.x, T.z, 0.55));
      }
      const ang = Math.abs(diffA(P.face, Math.atan2(T.x - P.x, T.z - P.z)));
      if (A.dist(T, P) < 1.0 && ang < 0.5 + L.aim && d.pushCool <= 0) out.tapB = true;
      // ne pas se jeter dans le vide en poussant
      if (edgeDist(A, P) < 0.6 && best) { delete out.path; return Object.assign(out, A.Bot.toward(P, best[0] + 0.5, best[1] + 0.5, 0.2)); }
      return out;
    }
    if (!best) return out;
    // aller à la case choisie par le plus court chemin (on contourne les conteneurs, on passe par les attelages)
    const [bx, bz] = best;
    M.far = Math.hypot(bx + 0.5 - P.x, bz + 0.5 - P.z) > 1.2;
    const path = A.Bot.bfs(cx0, cz0, (x, z) => x === bx && z === bz, pass, 400);
    if (path && path.length) return Object.assign(out, A.Bot.follow(P, path));
    return Object.assign(out, A.Bot.toward(P, bx + 0.5, bz + 0.5, 0.15));
  }

  function diffA(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
  // distance au vide le plus proche (dans les 4 directions)
  function edgeDist(A, P) {
    let m = 9;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let k = 0.3; k < 3; k += 0.3) { if (A.grid.at(Math.floor(P.x + dx * k), Math.floor(P.z + dz * k)) === A.VOID) { m = Math.min(m, k); break; } }
    }
    return m;
  }
  // la même chose pour une case : nombre de cases jusqu'au vide (0 = au bord)
  function edgeCell(A, x, z) {
    let m = 3;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 1; k <= 3; k++) if (A.grid.at(x + dx * k, z + dz * k) === A.VOID) { m = Math.min(m, k - 1); break; }
    return m;
  }
  // collé derrière un conteneur (du côté d'où vient le vent) : à l'abri
  function sheltered(A, P, dir) {
    const x = Math.floor(P.x), z = Math.floor(P.z);
    return A.grid.at(x, z - dir) === BOX || A.grid.at(x, z - 2 * dir) === BOX;
  }
  function removeAll(A, list) { for (const m of list) A.remove(m); }
  // la barrière va-t-elle toucher ce joueur ? (non s'il y a un conteneur devant lui sur son wagon)
  function barHits(A, b, P) {
    const row = Math.floor(P.z), px = Math.floor(P.x), bx = Math.floor(b.x);
    if (row < 0 || row >= D || b.x < P.x - 0.4) return false;
    let coupling = false;
    for (let x = px + 1; x <= Math.min(bx, W - 1); x++) {
      if (x % (CAR + 1) === CAR) { coupling = true; break; }         // la barrière se reformera ici
      if (A.grid.at(x, row) === BOX) return false;                   // un conteneur me couvre
    }
    return coupling || b.rows[row];
  }

  /* ---------- Les événements : préparés à l'annonce, déclenchés 1,6 s plus tard ---------- */
  function prepareEvent(A, type) {
    const S = A.S, w = { type, t: 1.6 };
    if (type === 'laser') {
      // 1 ou 2 lasers sur des wagons différents (2 tant que le train est long)
      const ks = A.shuffle(Array.from({ length: S.cars }, (_, i) => firstCar(S) + i)).filter((k) => !S.detach || k !== S.detach.k);
      w.lasers = ks.slice(0, S.cars >= 4 ? 2 : 1).map((k) => ({ k, dir: Math.random() < 0.5 ? 1 : -1 }));
    }
    return w;
  }
  function announce(A, w) {
    const S = A.S, type = w.type;
    const T = { bar: ['Barrière !', 'Saute (A) ou cache-toi derrière un conteneur'], laser: [w.lasers && w.lasers.length > 1 ? 'Lasers !' : 'Laser !', 'Saute (A) au bon moment'], trap: ['Trappes !', 'Le sol s\'ouvre'], bombs: ['Le drone bombarde !', 'Fuis les ombres rouges'], wind: ['Coup de vent !', 'Abrite-toi derrière un conteneur'], brake: ['Freinage !', 'Tout le monde glisse vers l\'avant'], tunnel: ['Tunnel !', 'Il va faire noir…'] }[type];
    A.banner(T[0], T[1], '#ff5533', 1.4);
    A.sfx('warn');
    if (S.arrow) { S.arrow.position.z = D / 2; }
  }
  function startEvent(A, w) {
    const S = A.S, type = w.type;
    shared(A);
    if (type === 'bar') {
      const b = { x: W + 1.5, rows: A.fill(D, true), seg: [], posts: [], warned: {} };
      if (!A.headless) {
        for (let z = 0; z < D; z++) { const m = mk(C.barGeo, C.barMat); m.position.set(b.x, 0.34, z + 0.5); m.castShadow = true; A.add(m); b.seg.push(m); }
        for (const z of [-0.5, D + 0.5]) { const p = mk(C.postGeo, C.postMat); p.position.set(b.x, 0.25, z); A.add(p); b.posts.push(p); }
      }
      S.bars.push(b);
    } else if (type === 'laser') {
      for (const q of w.lasers || []) {
        if (q.k < firstCar(S)) continue;              // ce wagon s'est décroché entre-temps
        const l = { x0: carX(q.k), z: q.dir > 0 ? -0.4 : D + 0.4, dir: q.dir, cols: A.fill(CAR, true), seg: [], warned: {} };
        if (!A.headless) for (let c = 0; c < CAR; c++) { const m = mk(C.laserGeo, C.laserMat); m.position.set(l.x0 + c + 0.5, 0.35, l.z); A.add(m); l.seg.push(m); }
        S.lasers.push(l);
      }
    } else if (type === 'trap') {
      const fc = firstCar(S) + (S.detach ? 1 : 0);
      for (let n = 0; n < 7; n++) {
        const k = A.rint(Math.min(NCAR - 1, fc), NCAR - 1);
        const x = carX(k) + A.rint(0, CAR - 1), z = A.rint(0, D - 1);
        if (A.grid.at(x, z) !== A.FLOOR || S.traps.some((t) => t.x === x && t.z === z)) continue;
        const t = { x, z, t: 0, open: false, mesh: null };
        if (!A.headless) { t.mesh = mk(C.trapGeo, C.trapMat); t.mesh.position.set(x + 0.5, 0.03, z + 0.5); A.add(t.mesh); }
        S.traps.push(t);
      }
    } else if (type === 'bombs') {
      const live = A.alive();
      for (let n = 0; n < 4; n++) {
        const T = live.length ? A.pick(live) : null;
        const x = T ? T.x + A.rand(-1, 1) : A.rand(carX(firstCar(S)), W), z = T ? T.z + A.rand(-0.8, 0.8) : A.rand(0, D);
        dropBomb(A, x, z, null, 1.3 + n * 0.25);
      }
    } else if (type === 'wind') { S.wind = { dir: Math.random() < 0.5 ? 1 : -1, t: 3.2 }; A.sfx('whoosh'); }
    else if (type === 'brake') { S.brake = 1.4; A.shake(0.3); }
    else if (type === 'tunnel') { S.tunnel = 6; }
  }
  function dropBomb(A, x, z, by, fuse) {
    const b = { x, z, t: 0, fuse, by, mesh: null, shadow: null };
    if (!A.headless) {
      shared(A);
      b.mesh = mk(C.bombGeo, C.bombMat); b.mesh.position.set(x, 6, z); b.mesh.castShadow = true; A.add(b.mesh);
      b.shadow = mk(C.shadowGeo, C.shadowMat); b.shadow.rotation.x = -Math.PI / 2; b.shadow.position.set(x, 0.03, z); A.add(b.shadow);
    }
    A.S.bombs.push(b);
    // « Attention ! / À gauche ! » pour un humain sous la bombe
    for (const P of A.alive()) if (P.human && Math.hypot(P.x - x, P.z - z) < 1.8) A.warn(P, x, z);
  }
  function droneUpdate(A, P, dt) {
    const d = P.data;
    P.x = A.clamp(P.x, carX(firstCar(A.S)) - 1, W); P.z = A.clamp(P.z, -0.5, D + 0.5);
    d.droneCool = Math.max(0, d.droneCool - dt);
    if (!d.cross && !A.headless) { d.cross = A.mesh('ring', 0.55, P.color, { basic: true }); A.add(d.cross); }
    if (P.in.aP && d.droneCool <= 0) { dropBomb(A, P.x, P.z, P, 1.1); d.droneCool = 4.5; A.sfx('whoosh'); }
  }
  function spawnItem(A) {
    const S = A.S;
    const lo = firstCar(S) + (S.detach ? 1 : 0);
    if (lo >= NCAR) return;
    // une case libre au hasard (pas sur un conteneur, pas sur un joueur)
    let x = -1, z = -1;
    for (let tries = 0; tries < 20; tries++) {
      const k = A.rint(lo, NCAR - 1), cx = carX(k) + A.rint(0, CAR - 1), cz = A.rint(0, D - 1);
      if (A.grid.at(cx, cz) !== A.FLOOR || A.alive().some((P) => Math.hypot(P.x - cx - 0.5, P.z - cz - 0.5) < 1.2)) continue;
      x = cx + 0.5; z = cz + 0.5; break;
    }
    if (x < 0) return;
    const type = Math.random() < 0.55 ? 'glove' : 'anchor';
    let mesh = null;
    if (!A.headless) {
      mesh = new THREE.Group();
      const lab = A.label(type === 'glove' ? '🥊' : '⚓', { size: 40, h: 0.6, bg: 'rgba(14,11,9,0.75)' }); lab.position.y = 0.8;
      const base = A.mesh('cyl', 0.3, type === 'glove' ? 0xff5533 : 0x5ad1ff, { h: 0.1, emissive: type === 'glove' ? 0xff5533 : 0x5ad1ff, ei: 0.4 }); base.position.y = 0.05;
      mesh.add(base, lab); mesh.userData.lab = lab; mesh.position.set(x, 0, z); A.add(mesh);
    }
    A.burst(x, 0.5, z, 10, [0xffffff, type === 'glove' ? 0xff5533 : 0x5ad1ff], 3, { up: 2 });
    A.sfx('pick');
    S.items.push({ x, z, type, mesh });
  }

  /* ---------- Le décor : le train, ses conteneurs, la campagne qui défile ---------- */
  function buildScene(A) {
    const S = A.S;
    S.carMeshes = [];
    if (A.headless) return;
    shared(A);
    const span = W + 70;                      // la campagne déborde largement du train
    // le sol qui défile
    const gt = OT.Models.canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#5a7a3a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) { g.fillStyle = Math.random() < 0.5 ? '#4f6d33' : '#6a8a44'; g.fillRect(Math.random() * w, Math.random() * h, 6, 3); }
      g.fillStyle = '#b8a27a'; g.fillRect(0, 50, w, 28);
    }, true);
    S.groundTile = 4;
    gt.repeat.set(span / S.groundTile, 60 / 4);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(span, 60), new THREE.MeshStandardMaterial({ map: gt, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(W / 2, -1.6, D / 2); ground.receiveShadow = true;
    A.add(ground); S.ground = ground.material;
    // les rails (une traverse toutes les 2 cases)
    const rt = OT.Models.canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#3a2a1e'; g.fillRect(0, 0, w, h); g.fillStyle = '#6a4a2e'; g.fillRect(8, 0, 16, h); g.fillRect(40, 0, 16, h); g.fillStyle = '#9aa2ab'; g.fillRect(0, 14, w, 6); g.fillRect(0, 44, w, 6); }, true);
    rt.repeat.set((W + 40) / 2, 1);
    const rails = new THREE.Mesh(new THREE.PlaneGeometry(W + 40, D * 0.7), new THREE.MeshStandardMaterial({ map: rt, roughness: 0.9 }));
    rails.rotation.x = -Math.PI / 2; rails.position.set(W / 2, -1.55, D / 2); A.add(rails); S.rails = rails.material;
    // poteaux et arbres de chaque côté (ils bouclent sur toute la longueur du train)
    S.poles = []; S.poleMin = -16;
    const n = Math.ceil((W + 34) / 7);
    S.poleLoop = n * 7;
    const poleGeo = new THREE.BoxGeometry(0.25, 3, 0.25), poleMat = new THREE.MeshStandardMaterial({ color: A.lin(0x6a4a2e), roughness: 0.8 });
    const treeGeo = new THREE.SphereGeometry(1.1, 12, 10), treeMat = new THREE.MeshStandardMaterial({ color: A.lin(0x3f6a2a), roughness: 1 });
    for (let k = 0; k < n; k++) {
      const p = mk(poleGeo, poleMat); p.castShadow = true; p.position.set(S.poleMin + 2 + k * 7, -0.1, k % 2 ? -2.8 : D + 2.8); A.add(p); S.poles.push(p);
      const tree = mk(treeGeo, treeMat); tree.castShadow = true; tree.position.set(S.poleMin + 5.5 + k * 7, -0.6, k % 2 ? D + 4.8 : -4.8); A.add(tree); S.poles.push(tree);
    }
    // les wagons (sous le toit) et leurs conteneurs : ils tombent ensemble quand le wagon se décroche
    const bodyGeo = new THREE.BoxGeometry(CAR, 1.3, D - 0.1), wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.2, 18);
    const bodyMat = [new THREE.MeshStandardMaterial({ color: A.lin(0x8a3a24), roughness: 0.6 }), new THREE.MeshStandardMaterial({ color: A.lin(0xb8352a), roughness: 0.6 })];
    const wheelMat = new THREE.MeshStandardMaterial({ color: A.lin(0x1a1a1a), roughness: 0.5, metalness: 0.4 });
    for (let k = 0; k < NCAR; k++) {
      const g = new THREE.Group();
      const body = mk(bodyGeo, bodyMat[k === NCAR - 1 ? 1 : 0]); body.receiveShadow = true;
      body.position.set(carX(k) + CAR / 2, -0.85, D / 2);
      g.add(body);
      for (const wx of [0.9, 1.8, CAR - 1.8, CAR - 0.9]) for (const wz of [-0.05, D + 0.05]) { const wh = mk(wheelGeo, wheelMat); wh.rotation.x = Math.PI / 2; wh.position.set(carX(k) + wx, -1.35, wz); g.add(wh); }
      for (const b of S.boxes) if (b.k === k) g.add(boxMesh(A, b));
      A.add(g); S.carMeshes[k] = g;
    }
    // la locomotive devant
    const loco = A.mesh('box', 3, 0x2a2d33, { h: 2.2, d: D - 0.2, metal: 0.5 }); loco.position.set(W + 1.6, -0.4, D / 2); A.add(loco);
    const chim = A.mesh('cyl', 0.45, 0x1a1a1a, { h: 1.2 }); chim.position.set(W + 2.4, 1.2, D / 2); A.add(chim);
    // la flèche d'alerte (à droite de l'écran : la barrière arrive de l'avant)
    const arrow = A.label('◀ !', { size: 50, h: 0.7, color: '#ff5533', border: '#ff5533' });
    arrow.position.set(W + 0.6, 1.4, D / 2); arrow.quaternion.copy(A.camera.quaternion); arrow.visible = false;
    A.add(arrow); S.arrow = arrow;
    // les lignes rouges qui annoncent les lasers (2 au plus)
    S.prevs = [0, 1].map(() => { const m = mk(C.prevGeo, C.prevMat); m.visible = false; A.add(m); return m; });
    // lumières du tunnel (une par joueur)
    S.lights = A.players.map((P) => { const L = new THREE.PointLight(P.color, 0, 6, 2); L.visible = false; A.add(L); return L; });
  }
  // un conteneur : une boîte en tôle ondulée + un liseré sombre sur le dessus
  function boxMesh(A, b) {
    const key = b.w + 'x' + b.d;
    const geo = C.boxGeos[key] || (C.boxGeos[key] = new THREE.BoxGeometry(b.w - 0.08, 1.0, b.d - 0.08));
    const mat = C.boxMats[b.col] || (C.boxMats[b.col] = new THREE.MeshStandardMaterial({ color: A.lin(b.col), map: C.boxTex, roughness: 0.55, metalness: 0.3 }));
    const m = mk(geo, mat);
    m.position.set(b.x + b.w / 2, 0.5, b.z + b.d / 2);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
})();
