/* =====================================================================
   🥔 PATATE CHAUDE — ne sois pas celui qui la tient quand elle explose
   v1.4 : GRAND STADE 27 × 19 (avant : 19 × 13)
   ---------------------------------------------------------------------
   LA DISPOSITION (symétrique : chaque départ vaut les autres)
   - deux TAPIS ROULANTS le long des bords haut (→) et bas (←) ;
   - deux paires de PORTAILS : bleu ⇄ orange aux milieux des côtés
     gauche/droit, vert ⇄ violet en haut/en bas au centre. On ressort de
     l'autre côté… et une bombe LANCÉE dedans aussi !
   - des ÎLOTS DE PILIERS (4 blocs 2 × 2, 4 barres, une croix au centre) :
     des couverts qui arrêtent les lancers, et autour desquels on tourne ;
   - la PATINOIRE : de la GLACE autour de la croix centrale, et 4 plaques
     près des îlots (on glisse : départs et virages très lents) ;
   - 6 CHAMPIGNONS-REBONDS (bumpers) : on les touche, on est éjecté
     (pratique pour fuir… ou pour se faire surprendre). Une bombe lancée
     ricoche dessus.
   LES RÈGLES
   - la bombe a une mèche SECRÈTE (12 à 20 s) : seules les 5 dernières
     secondes s'affichent ;
   - on la passe en touchant quelqu'un, ou en la LANÇANT (A) ;
   - pas de retour : impossible de la rendre pendant 1 s ;
   - un lancer raté (pilier, trop loin) revient comme un boomerang ;
   - une bombe qui tombe par terre continue de tourner, et si elle
     explose au sol, elle élimine tout le monde autour ;
   - B : sprint (et on bouscule) ;
   - les éliminés deviennent des fantômes qui ralentissent les vivants.
   Points par manche : survivant 3, deuxième 2, troisième 1.
   ===================================================================== */
(function () {
  const BELT_R = 10, BELT_L = 11, PORTAL = 12, ICE = 13, BUMPER = 14;
  // le plan du stade : # mur · . sol · > < tapis · ~ glace · o champignon · A/a et B/b portails
  const MAP = [
    '###########################',
    '#..>>>>>>>>>>>>>>>>>>>>>..#',
    '#.........................#',
    '#..o.....##..B..##.....o..#',
    '#....##~~.........~~##....#',
    '#....##~~.........~~##....#',
    '#.........................#',
    '#..#......~~~~~~~......#..#',
    '#..#......~~~#~~~......#..#',
    '#A......o.~~###~~.o......a#',
    '#..#......~~~#~~~......#..#',
    '#..#......~~~~~~~......#..#',
    '#.........................#',
    '#....##~~.........~~##....#',
    '#....##~~.........~~##....#',
    '#..o.....##..b..##.....o..#',
    '#.........................#',
    '#..<<<<<<<<<<<<<<<<<<<<<..#',
    '###########################',
  ];
  const W = MAP[0].length, D = MAP.length;          // 27 × 19
  const CODE = { '#': 1, '.': 0, '>': BELT_R, '<': BELT_L, '~': ICE, o: BUMPER, A: PORTAL, a: PORTAL, B: PORTAL, b: PORTAL };
  // les portails : position, partenaire, direction de sortie (vers l'intérieur), couleur
  const PORTALS = [];
  const BUMPERS = [];
  MAP.forEach((row, z) => [...row].forEach((ch, x) => {
    if (ch === 'o') BUMPERS.push([x, z]);
    const k = 'AaBb'.indexOf(ch);
    if (k >= 0) PORTALS[k] = { x, z, color: [0x5ad1ff, 0xff8a2b, 0x7dff5a, 0xb07cff][k], out: [[1, 0], [-1, 0], [0, 1], [0, -1]][k] };
  }));
  PORTALS.forEach((p, k) => { p.to = PORTALS[k ^ 1]; });
  // les départs : 2 joueurs en diagonale près du centre (duel : le porteur doit pouvoir rattraper l'autre),
  // 3 en triangle, 4 aux quatre coins (même distance entre voisins)
  const SPAWNS = { 2: [[9, 6], [17, 12]], 3: [[13, 5], [7, 15], [19, 15]], 4: [[7, 3], [19, 3], [7, 15], [19, 15]] };
  const BELT_SPEED = 2.4;
  const THROW_SPEED = 12.5, THROW_RANGE = 8.5;      // un peu plus loin qu'avant (le stade est grand)
  const ICE_GRIP = 2.4;                             // sur la glace : presque aucune adhérence
  const TOUCH = 0.85;                               // portée d'une « touche » (un bras : les corps se cognent à 0,64)
  const HOLDER_SPEED = 1.22, HOLDER_DASH = 1.6;     // le porteur court plus vite et sprinte plus souvent (grand stade : il doit pouvoir rattraper)
  const layout = (x, z) => (x < 0 || z < 0 || x >= W || z >= D ? 1 : CODE[MAP[z][x]]);

  /* ---------- Géométries / matériaux partagés (créés une fois) ---------- */
  const geo = {};
  const lin = (c) => new THREE.Color(c).convertSRGBToLinear();
  function shared() {
    if (geo.ready) return;
    geo.ready = true;
    geo.stem = new THREE.CylinderGeometry(0.15, 0.2, 0.34, 14);
    geo.cap = new THREE.SphereGeometry(0.44, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    geo.dot = new THREE.SphereGeometry(0.07, 8, 6);
    geo.base = new THREE.RingGeometry(0.42, 0.52, 28);
    geo.plane = new THREE.PlaneGeometry(1, 1);
    geo.stemMat = new THREE.MeshStandardMaterial({ color: lin(0xf6efe4), roughness: 0.6 });
    geo.capMat = new THREE.MeshStandardMaterial({ color: lin(0xff3d7f), emissive: lin(0xff3d7f), emissiveIntensity: 0.25, roughness: 0.35 });
    geo.dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    geo.baseMat = new THREE.MeshBasicMaterial({ color: lin(0xff3d7f), transparent: true, opacity: 0.75, toneMapped: false, side: THREE.DoubleSide, depthWrite: false });
    // le vernis de la glace : bleu clair translucide, quelques reflets blancs en biais, un liseré givré
    const iceTex = OT.Models.canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = 'rgba(214,244,255,0.42)'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3;
      for (const [a, b] of [[8, 30], [26, 52], [40, 60]]) { g.beginPath(); g.moveTo(a, h - 4); g.lineTo(b, 4 + a * 0.2); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
    });
    geo.iceMat = new THREE.MeshStandardMaterial({ map: iceTex, roughness: 0.08, metalness: 0.2, transparent: true, depthWrite: false });
    geo.num = {};     // les chiffres du compte à rebours (5…1), fabriqués une seule fois
  }

  let beltTex = null;
  function deco(A) {
    if (A.headless) return;
    shared();
    const G = A.grid;
    if (!beltTex) beltTex = OT.Models.canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = '#2f3a40'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffd23a';
      for (let i = 0; i < 2; i++) { g.beginPath(); const x0 = i * 32 + 6; g.moveTo(x0, 14); g.lineTo(x0 + 18, 32); g.lineTo(x0, 50); g.lineTo(x0 + 8, 32); g.closePath(); g.fill(); }
    }, true);
    // les tapis : une bande de 21 cases en haut (→) et en bas (←)
    for (const [z, dir] of [[1, 1], [D - 2, -1]]) {
      let x0 = 0, x1 = 0;
      for (let x = 0; x < W; x++) if (layout(x, z) === (dir > 0 ? BELT_R : BELT_L)) { if (!x0) x0 = x; x1 = x; }
      const len = x1 - x0 + 1;
      const t = beltTex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(len, 1);
      if (dir < 0) { t.center.set(0.5, 0.5); t.rotation = Math.PI; }
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.9), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(x0 + len / 2, 0.012, z + 0.5);
      A.add(m);
      A.S.belts.push({ tex: t, dir });
    }
    // les portails : un anneau qui tourne + un disque translucide, à la couleur de chaque bout
    PORTALS.forEach((p) => {
      const r = A.mesh('ring', 0.48, p.color, { basic: true });
      r.position.set(p.x + 0.5, 0.03, p.z + 0.5);
      const g = A.mesh('disc', 0.36, p.color, { basic: true, opacity: 0.35 });
      g.position.set(p.x + 0.5, 0.025, p.z + 0.5);
      A.add(r); A.add(g);
      A.S.portalMeshes.push(r);
    });
    // la glace : sol bleuté + un vernis brillant (un seul maillage instancié)
    const ice = [];
    const c = new THREE.Color();
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (layout(x, z) === ICE) {
      ice.push([x, z]);
      if (G.floorMesh) { c.set((x + z) % 2 ? 0x84cbf6 : 0x77c2f0).convertSRGBToLinear(); G.floorMesh.setColorAt(G.floorIdx[z * W + x], c); }
    }
    if (G.floorMesh) G.floorMesh.instanceColor.needsUpdate = true;
    const im = new THREE.InstancedMesh(geo.plane, geo.iceMat, ice.length);
    const dm = new THREE.Object3D();
    ice.forEach(([x, z], i) => { dm.position.set(x + 0.5, 0.015, z + 0.5); dm.rotation.set(-Math.PI / 2, 0, 0); dm.scale.setScalar(1); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); });
    A.add(im);
    A.S.iceCells = ice;
    // les champignons-rebonds : pied blanc, chapeau rose à pois, anneau au sol
    A.S.bumperMeshes = BUMPERS.map(([x, z]) => {
      const g = new THREE.Group();
      const stem = new THREE.Mesh(geo.stem, geo.stemMat); stem.position.y = 0.17; stem.castShadow = true;
      const cap = new THREE.Mesh(geo.cap, geo.capMat); cap.position.y = 0.3; cap.scale.set(1, 0.75, 1); cap.castShadow = true;
      for (let k = 0; k < 5; k++) { const d = new THREE.Mesh(geo.dot, geo.dotMat); const a = k * 1.256; d.position.set(Math.cos(a) * 0.26, 0.28, Math.sin(a) * 0.26); cap.add(d); }
      const top = new THREE.Mesh(geo.dot, geo.dotMat); top.position.y = 0.44; cap.add(top);
      const base = new THREE.Mesh(geo.base, geo.baseMat); base.rotation.x = -Math.PI / 2; base.position.y = 0.02;
      g.add(stem, cap, base);
      g.position.set(x + 0.5, 0, z + 0.5);
      A.add(g);
      return { g, cap };
    });
  }

  function bombMesh(A) {
    if (A.headless) return null;
    const g = new THREE.Group();
    const b = A.mesh('ball', 0.3, 0x24262c, { metal: 0.4, rough: 0.3 });
    const f = A.mesh('ball', 0.08, 0xffd23a, { basic: true });
    f.position.y = 0.36;
    g.add(b, f);
    g.userData = { b, f, lab: null, n: -1 };
    return g;
  }
  // l'étiquette d'un chiffre du compte à rebours (gardée en mémoire : pas de nouvelle texture à chaque seconde)
  function numLabel(A, n) {
    shared();
    return geo.num[n] || (geo.num[n] = A.label(String(n), { size: 56, h: 0.65, color: '#ff5533', border: '#ff5533' }));
  }

  OT.Arena.register({
    id: 'patate', name: 'Patate chaude', icon: '🥔', color: '#ff7a3a', theme: 'lab', music: 'labo',
    tagline: 'Refile la bombe avant qu\'elle explose… mais à qui ?',
    rules: [
      'Celui qui tient la bombe la passe en TOUCHANT quelqu\'un, ou en la lançant (A).',
      'La mèche est secrète : seules les 5 dernières secondes s\'affichent.',
      'Pas de retour pendant 1 s. Un lancer raté revient comme un boomerang… vers toi !',
      'Portails, glace qui glisse, champignons qui éjectent : sers-t\'en pour fuir (ou pour surprendre).',
      'Avec la bombe, tu cours plus vite. B : sprint. Les éliminés deviennent des fantômes qui ralentissent les vivants.',
    ],
    controls: { a: 'Lancer la bombe', b: 'Sprint (bouscule)' },
    // la fiche de présentation (1.4)
    goal: 'Ne tiens pas la bombe quand elle explose : refile-la à quelqu\'un !',
    howto: [
      'Bouge avec {move}. Touche quelqu\'un pour lui passer la bombe.',
      '{a} : lancer la bombe (un pilier la renvoie comme un boomerang).',
      '{b} : sprint, et tu bouscules ceux que tu croises.',
      'Portails, glace et champignons-rebonds : pour fuir… ou pour surprendre.',
    ],
    danger: 'La mèche est secrète : seules les 5 dernières secondes s\'affichent. Par terre, elle souffle tout autour !',
    win: 'Survis : 3 points au dernier debout, 2 au deuxième, 1 au troisième.',
    lose: 'Tenir la bombe quand elle explose, ou rester trop près d\'elle quand elle saute par terre.',
    tuto: ['Déplace-toi : {move}', '{a} : lancer la bombe (quand tu l\'as)', '{b} : sprint (et bouscule)'],
    rounds: 3, scoreName: 'points', maxRound: 150,
    view: () => ({ x0: 0, z0: 0, x1: W, z1: D }),
    tilt: 30,
    camMin: 0.6,          // la caméra suit l'action sans montrer moins que cette part de l'arène

    setup(A) { A.S.wins = A.fill(A.n, 0); },

    round(A) {
      const S = A.S;
      S.belts = []; S.portalMeshes = []; S.bumperMeshes = []; S.iceCells = []; S.bumpFx = BUMPERS.map(() => 0);
      A.buildGrid(W, D, layout, 'lab');
      const list = SPAWNS[Math.min(4, Math.max(2, A.n))].slice(0, A.n);
      const spots = A.shuffle(list);
      A.players.forEach((P, i) => {
        const [x, z] = spots[i % spots.length];
        A.place(P, x + 0.5, z + 0.5);
        P.face = Math.atan2(W / 2 - x, D / 2 - z);      // tourné vers le centre
        P.speed = 4.3; P.r = 0.32;
        P.data = { dashCool: 0, dashT: 0, portalCool: 0, held: 0, passes: 0, throws: 0, slowT: 0, ghostCool: 0, bumpT: 0 };
      });
      S.order = []; S.ended = false;   // ordre d'élimination
      S.holder = -1; S.noBack = null; S.fuse = 0; S.flying = null; S.free = null; S.nextT = 0.8; S.lastThrow = null;
      S.mesh = bombMesh(A); if (S.mesh) A.add(S.mesh);
      deco(A);
    },

    go(A) { giveNew(A); },

    // la glace : presque aucune adhérence (on glisse) ; les fantômes flottent
    grip(A, P) { return P.ghost ? 6 : onIce(A, P) ? ICE_GRIP : 22; },
    bodies: true,
    speedMod(A, P) {
      let k = 1;
      if (A.S.holder === P.i) k *= HOLDER_SPEED;          // l'adrénaline : avec la bombe, on court plus vite
      if (P.data.dashT > 0) k *= 2.3;
      if (P.data.slowT > 0) k *= 0.55;
      return k;
    },
    drift(A, P) {
      if (P.ghost || !A.grid || P.h > 0.05) return null;
      const c = A.grid.at(Math.floor(P.x), Math.floor(P.z));
      if (c === BELT_R) return { x: BELT_SPEED, z: 0 };
      if (c === BELT_L) return { x: -BELT_SPEED, z: 0 };
      return null;
    },

    onKill(A, P, cause, by) {
      const S = A.S;
      P.out = true;
      S.order.push(P.i);
      if (A.alive().length >= 1) { P.ghost = true; P.alive = false; P.noClip = false; }
    },

    update(A, dt) {
      const S = A.S;
      const live = A.alive();
      for (const P of A.players) {
        const d = P.data;
        if (P.ghost) {
          // fantôme : traverse les vivants et les ralentit
          P.x = A.clamp(P.x, 1, W - 1); P.z = A.clamp(P.z, 1, D - 1);
          if (d.ghostCool <= 0) for (const O of live) if (A.dist(P, O) < 0.6) { O.data.slowT = 0.8; d.ghostCool = 2.2; A.say(O.x, O.z, '👻 Brrr…', '#bfe6ff', 24); A.rumble(O, 0.2, 0.4, 150); break; }
          d.ghostCool = Math.max(0, d.ghostCool - dt);
          continue;
        }
        if (!P.alive || P.out) continue;
        // sprint
        if (P.in.bP && d.dashCool <= 0) { d.dashT = 0.25; d.dashCool = S.holder === P.i ? HOLDER_DASH : 2.5; A.sfx('whoosh'); }
        d.dashCool = Math.max(0, d.dashCool - dt);
        if (d.dashT > 0) for (const O of live) if (O !== P && A.dist(P, O) < 0.75 && !O.data.bumped) { A.knock(O, O.x - P.x, O.z - P.z, 7, 0.25, P); O.data.bumped = 0.3; A.sfx('push'); }
        if (d.bumped > 0) d.bumped = Math.max(0, d.bumped - dt); else d.bumped = 0;
        // portails (chaque paire relie ses deux bouts)
        d.portalCool = Math.max(0, d.portalCool - dt);
        if (d.portalCool <= 0) for (const p of PORTALS) {
          if (Math.hypot(P.x - p.x - 0.5, P.z - p.z - 0.5) < 0.42) {
            const q = p.to;
            A.place(P, q.x + 0.5 + q.out[0] * 0.9, q.z + 0.5 + q.out[1] * 0.9);
            P.vx = P.vz = 0; d.portalCool = 1.2;
            A.sfx('zap'); A.burst(p.x + 0.5, 0.5, p.z + 0.5, 12, [p.color, 0xffffff], 4); A.burst(P.x, 0.5, P.z, 12, [q.color, 0xffffff], 4);
            break;
          }
        }
        // champignons-rebonds : on est éjecté à l'opposé du centre du champignon (petit saut)
        if (d.bumpT <= 0 && P.h <= 0.05) BUMPERS.forEach(([bx, bz], k) => {
          const dx = P.x - bx - 0.5, dz = P.z - bz - 0.5, dd = Math.hypot(dx, dz);
          if (dd > 0.52) return;
          let nx = dx, nz = dz;
          if (dd < 0.05) { nx = -P.vx || 1; nz = -P.vz; }        // pile au centre : on repart d'où l'on vient
          A.knock(P, nx, nz, 11, 0.12, null);
          P.vh = 4.5; d.bumpT = 0.45;
          S.bumpFx[k] = 1;
          A.sfx('spring'); A.wave(bx + 0.5, bz + 0.5, 0xff3d7f, 1.4, 0.35);
          A.burst(bx + 0.5, 0.6, bz + 0.5, 10, [0xff3d7f, 0xffffff], 4, { up: 2 });
          A.rumble(P, 0.4, 0.3, 120);
        });
        if (S.holder === P.i) { d.held += dt; A.stat(P.i, 'held', dt); }
        // un humain : le porteur arrive (< 3 cases), ou une bombe par terre va sauter près de lui
        if (P.human && S.holder !== P.i) {
          const H = S.holder >= 0 ? A.players[S.holder] : null;
          const fb = S.free || S.flying;
          if (H && A.dist(H, P) < 3) A.warn(P, H.x, H.z);
          else if (fb && S.fuse < 2.5 && Math.hypot(fb.x - P.x, fb.z - P.z) < 3.5) A.warn(P, fb.x, fb.z);
        }
      }
      // la bombe
      if (S.holder >= 0) {
        const H = A.players[S.holder];
        S.fuse -= dt;
        if (S.noBack) { S.noBack.t -= dt; if (S.noBack.t <= 0) S.noBack = null; }
        // passer en touchant
        for (const O of live) {
          if (O === H || A.dist(H, O) > TOUCH) continue;
          if (S.noBack && S.noBack.from === O.i && S.noBack.to === H.i) continue;
          pass(A, H, O, 'touche');
          break;
        }
        // lancer
        if (S.holder >= 0 && H.in.aP && H.alive) {
          const a = H.face;
          S.flying = { x: H.x, z: H.z, vx: Math.sin(a) * THROW_SPEED, vz: Math.cos(a) * THROW_SPEED, d: 0, from: H.i, bumpCool: 0, portalCool: 0 };
          S.holder = -1; H.data.throws++; A.stat(H.i, 'throws', 1);
          A.sfx('whoosh');
        }
        if (S.fuse <= 0 && S.holder >= 0) explodeOn(A, A.players[S.holder]);
      } else if (S.flying) {
        const F = S.flying;
        S.fuse -= dt;
        const T = A.players[F.from];
        F.bumpCool = Math.max(0, F.bumpCool - dt); F.portalCool = Math.max(0, F.portalCool - dt);
        if (F.back) {
          // raté : la patate revient comme un boomerang vers son lanceur
          if (!T.alive || T.out) { F.back = false; F.vx = -F.vx; F.vz = -F.vz; }
          else { const dx = T.x - F.x, dz = T.z - F.z, dd = Math.hypot(dx, dz) || 1; F.vx = (dx / dd) * 10; F.vz = (dz / dd) * 10; }
        }
        const nx = F.x + F.vx * dt, nz = F.z + F.vz * dt;
        F.d += Math.hypot(F.vx, F.vz) * dt;
        if (!F.back && (A.grid.solid(Math.floor(nx), Math.floor(nz)) || F.d > THROW_RANGE)) { F.back = true; A.sfx('spring'); A.say(F.x, F.z, '↩ raté !', '#ffd28a', 24); }
        else {
          F.x = nx; F.z = nz;
          if (!F.back) flyTricks(A, F);
          const hit = live.find((O) => O.i !== F.from && Math.hypot(O.x - F.x, O.z - F.z) < 0.6);
          if (hit) { S.flying = null; take(A, hit, F.from, 'lancer'); }
          else if (F.back && Math.hypot(T.x - F.x, T.z - F.z) < 0.6) { S.flying = null; S.holder = T.i; S.noBack = null; A.say(T.x, T.z, '💣 Elle revient !', T.css, 24); A.sfx('hit'); }
        }
        if (S.fuse <= 0 && (S.flying || S.free)) explodeFloor(A);
      } else if (S.free) {
        S.fuse -= dt;
        const t = live.find((O) => Math.hypot(O.x - S.free.x, O.z - S.free.z) < 0.6 && (O.i !== (S.lastThrow && S.lastThrow.from) || A.clock - S.free.t0 > 0.5));
        if (t) { take(A, t, S.lastThrow ? S.lastThrow.from : -1, 'ramasse'); S.free = null; }
        else if (S.fuse <= 0) explodeFloor(A);
      } else if (S.nextT > 0) {
        S.nextT -= dt;
        if (S.nextT <= 0 && live.length >= 2) giveNew(A);
      }
      if (S.flying) S.lastThrow = { from: S.flying.from };
      // fin de la manche : un seul survivant
      if (live.length <= 1 && !S.ended) {
        S.ended = true;
        const pts = {};
        const ranks = live.map((p) => p.i).concat(S.order.slice().reverse());
        ranks.forEach((i, k) => { pts[i] = [3, 2, 1, 0][k] || 0; });
        if (live[0]) S.wins[live[0].i]++;
        A.endRound({ points: pts, text: live[0] ? `${live[0].name} survit !` : 'Tout le monde a sauté !', sub: '3 · 2 · 1 points', color: live[0] ? live[0].css : '#ff7a1a' });
      }
    },

    // flèche rouge au-dessus du porteur (ou sur la bombe quand elle est par terre ou en vol)
    goals(A) {
      const S = A.S;
      if (A.phase !== 'play') return [];
      if (S.holder >= 0) { const H = A.players[S.holder]; return [{ x: H.x, z: H.z, color: 0xff3b30, label: '💣', y: 1.05 + H.h }]; }
      const b = S.flying || S.free;
      return b ? [{ x: b.x, z: b.z, color: 0xff3b30, label: '💣', y: S.flying ? 0.8 : 0 }] : [];
    },

    draw(A, dt, time) {
      const S = A.S;
      for (const b of S.belts) b.tex.offset.x -= dt * BELT_SPEED / 2;
      S.portalMeshes.forEach((m, k) => { m.rotation.z += dt * (k % 2 ? -2 : 2); });
      // champignons : ils s'écrasent puis rebondissent quand on les touche
      S.bumperMeshes.forEach((m, k) => {
        const f = S.bumpFx[k];
        if (f > 0) S.bumpFx[k] = Math.max(0, f - dt * 3);
        const sq = f > 0 ? Math.sin(f * Math.PI * 3) * f * 0.45 : 0;
        m.cap.scale.set(1 + sq * 0.6, 0.75 * (1 - sq), 1 + sq * 0.6);
        m.g.position.y = Math.max(0, Math.sin(time * 3 + k) * 0.02);
      });
      // la glace scintille de temps en temps
      if (S.iceCells.length && Math.random() < dt * 3) { const [x, z] = A.pick(S.iceCells); A.burst(x + Math.random(), 0.05, z + Math.random(), 2, [0xffffff, 0xbfefff], 0.6, { grav: -0.5, life: 0.5, size: 0.7 }); }
      const M = S.mesh; if (!M) return;
      let x = null, z = null, y = 0.35;
      if (S.holder >= 0) { const H = A.players[S.holder]; x = H.x; z = H.z; y = 2.05 + H.h; }
      else if (S.flying) { x = S.flying.x; z = S.flying.z; y = 0.6 + Math.sin(Math.min(1, S.flying.d / THROW_RANGE) * Math.PI) * 1.4; }
      else if (S.free) { x = S.free.x; z = S.free.z; y = 0.3; }
      M.visible = x !== null;
      if (x === null) return;
      M.position.set(x, y, z);
      const hot = S.fuse < 5;
      const k = 1 + Math.sin(time * (hot ? 26 : 9)) * (hot ? 0.14 : 0.06);
      M.userData.b.scale.setScalar(k);
      M.userData.b.material.emissive && M.userData.b.material.emissive.setRGB(hot ? 0.4 + Math.sin(time * 20) * 0.3 : 0, 0, 0);
      M.userData.f.visible = Math.sin(time * 40) > -0.4;
      const n = Math.max(1, Math.ceil(S.fuse));
      if (hot && n !== M.userData.n) {
        M.userData.n = n;
        if (M.userData.lab) M.remove(M.userData.lab);
        const ref = numLabel(A, n);
        M.userData.lab = new THREE.Mesh(ref.geometry, ref.material); M.userData.lab.renderOrder = ref.renderOrder;
        M.userData.lab.position.y = 0.85; M.add(M.userData.lab);
        A.sfx('tick');
      }
      if (M.userData.lab) { M.userData.lab.visible = hot; M.userData.lab.quaternion.copy(A.camera.quaternion); }
      if (!hot) M.userData.n = -1;
    },

    hud(A) {
      const S = A.S;
      const H = S.holder >= 0 ? A.players[S.holder] : null;
      return {
        timer: null,
        note: S.fuse < 5 && (H || S.free || S.flying) ? `💥 ${Math.ceil(Math.max(0, S.fuse))}…` : H ? `La bombe est chez ${H.name}` : S.free ? 'La bombe est par terre !' : '',
        rows: A.players.map((P) => ({ i: P.i, txt: P.ghost ? '👻' : P.out ? '✖' : S.holder === P.i ? '💣' : '' })),
      };
    },
    rush(A) { return A.S.fuse < 5 ? 1.25 : 1; },

    stats(A, P) {
      const d = A.stats[P.i];
      return [`${d.passes || 0} passe${(d.passes || 0) > 1 ? 's' : ''}`, `${d.throws || 0} lancer${(d.throws || 0) > 1 ? 's' : ''}`, `bombe tenue ${Math.round(d.held || 0)} s`];
    },
    bonus(A, P) { return A.S.wins[P.i] ? [`Survivant ×${A.S.wins[P.i]}`] : []; },
    tiebreak(A, i) { return A.S.wins[i] * 100 - (A.stats[i].held || 0); },

    // garde-fou des bots (à chaque pas) : contourner les champignons quand on ne veut pas rebondir
    botGuard(A, P, mx, mz, L, C) {
      if (P.ghost || (L.chaos && Math.random() < 0.5) || P.bot.mem.useBump) return [mx, mz];
      const px = P.x + mx * 0.5, pz = P.z + mz * 0.5;
      for (const [bx, bz] of BUMPERS) {
        const dx = px - bx - 0.5, dz = pz - bz - 0.5, dd = Math.hypot(dx, dz);
        if (dd < 0.95 && dd > 0.001) { const k = (0.95 - dd) * 2.4; mx += (dx / dd) * k; mz += (dz / dd) * k; }
      }
      const n = Math.hypot(mx, mz); if (n > 1) { mx /= n; mz /= n; }
      return [mx, mz];
    },

    /* ---------- LE BOT ---------- */
    bot(A, P, B, L) {
      const S = A.S;
      if (P.ghost) {
        // fantôme : il gêne le vivant le plus proche qui n'a pas la bombe
        const T = A.Bot.target(P, L, (O) => O.i !== S.holder);
        return T ? A.Bot.dir(P, T.x, T.z) : {};
      }
      if (!P.alive || P.out) return {};
      const live = A.alive();
      B.mem.useBump = false;
      if (S.holder === P.i) {
        // je l'ai : je chasse
        let cands = live.filter((O) => O !== P && !(S.noBack && S.noBack.from === O.i));
        if (!cands.length) cands = live.filter((O) => O !== P);
        if (!cands.length) return {};
        // cible : la plus proche (en comptant les raccourcis par les portails) ; Chaos et agressifs préfèrent les humains
        const T = (L.chaos || L.aggro > 0.7) && cands.some((O) => O.human) && Math.random() < 0.6 ? A.Bot.nearest(P, cands.filter((O) => O.human)).o : A.Bot.nearest(P, cands, (O) => routeLen(P, O) / Math.max(0.1, A.dist(P, O))).o;
        const lead = 0.25 + L.skill * 0.25;
        const tx = T.x + T.vx * lead, tz = T.z + T.vz * lead;
        const d = A.dist(P, T);
        let out = A.Bot.dir(P, tx, tz);
        // un portail raccourcit beaucoup le chemin ? on le prend
        const via = portalShortcut(P, T, 4);
        if (via && L.skill > 0.4) out = A.Bot.toward(P, via.x + 0.5, via.z + 0.5, 0.02);
        // contourner un pilier : chemin sur la grille (en évitant les champignons)
        else if (blocked(A, P, T)) { const path = A.Bot.bfs(Math.floor(P.x), Math.floor(P.z), (x, z) => x === Math.floor(T.x) && z === Math.floor(T.z), (x, z) => !A.grid.solid(x, z) && A.grid.at(x, z) !== BUMPER); if (path) out = A.Bot.follow(P, path); }
        // lancer quand c'est bien aligné (et de plus en plus quand la mèche est courte)
        // viser : là où sera la cible quand la bombe arrivera (temps de vol), avec une tolérance
        // à la taille de la cible vue d'ici (plus elle est loin, plus il faut être précis)
        const fly = (d / THROW_SPEED) * (0.6 + 0.4 * L.skill);
        const ax = T.x + T.vx * fly, az = T.z + T.vz * fly;
        const aimErr = Math.abs(angleDiff(P.face, Math.atan2(ax - P.x, az - P.z)));
        const wantThrow = d > 1.4 && d < THROW_RANGE - 1.5 && aimErr < Math.atan2(0.55, d) + L.aim * 0.5 && !blockedXY(A, P.x, P.z, ax, az) && (S.fuse < 7 || Math.random() < 0.3 * L.aggro);
        if (wantThrow && Math.random() < 0.4 + L.skill * 0.5) out.tapA = true;
        if (d < 2.3 && P.data.dashCool <= 0 && Math.random() < 0.3 + L.skill * 0.4) out.tapB = true;   // sprint pour finir la poursuite
        return out;
      }
      // où est la bombe ?
      const H = S.holder >= 0 ? A.players[S.holder] : null;
      const bx = H ? H.x : S.flying ? S.flying.x : S.free ? S.free.x : null;
      const bz = H ? H.z : S.flying ? S.flying.z : S.free ? S.free.z : null;
      if (bx === null) {
        // personne ne l'a (entre deux bombes) : on s'écarte des autres
        const N = A.Bot.nearest(P, live.filter((O) => O !== P));
        return N && N.d < 4 ? A.Bot.away(P, N.o.x, N.o.z) : {};
      }
      const dh = Math.hypot(P.x - bx, P.z - bz);
      // le porteur est tout près et un portail aussi, qui mène loin de lui : on plonge dedans
      if (H && dh < 4.5 && L.skill > 0.4) {
        for (const p of PORTALS) {
          const dp = Math.hypot(P.x - p.x - 0.5, P.z - p.z - 0.5);
          const ex = p.to.x + 0.5 + p.to.out[0], ez = p.to.z + 0.5 + p.to.out[1];
          if (dp < 2.6 && dp < Math.hypot(H.x - p.x - 0.5, H.z - p.z - 0.5) && Math.hypot(ex - H.x, ez - H.z) > 8) return A.Bot.toward(P, p.x + 0.5, p.z + 0.5, 0.02);
        }
      }
      // fuir : on cherche le point le plus loin de la bombe, loin des murs et des coins
      let best = null, bs = -1e9;
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        for (const r of [1.6, 3.2]) {
          const x = P.x + Math.sin(a) * r, z = P.z + Math.cos(a) * r;
          if (x < 1.4 || z < 1.4 || x > W - 1.4 || z > D - 1.4) continue;
          if (A.grid.solid(Math.floor(x), Math.floor(z))) continue;
          if (A.hitsWall((P.x + x) / 2, (P.z + z) / 2, 0.3)) continue;
          const db = Math.hypot(x - bx, z - bz);
          const wall = Math.min(x - 1, z - 1, W - 1 - x, D - 1 - z);
          const crowd = live.filter((O) => O !== P && O.i !== S.holder).reduce((m, O) => m + Math.max(0, 2 - Math.hypot(O.x - x, O.z - z)), 0);
          const c = A.grid.at(Math.floor(x), Math.floor(z));
          const slip = c === ICE ? 0.8 * L.skill : 0;                       // la glace : on y contrôle mal sa course
          const cover = H && blockedXY(A, x, z, H.x, H.z) ? 1.2 * L.skill : 0;  // un pilier entre lui et moi : il ne peut pas lancer
          const s = db * (0.8 + L.skill * 0.4) + Math.min(wall, 3) * 0.8 - crowd * 0.6 - slip + cover + (Math.random() - 0.5) * (1 - L.skill) * 4;
          if (s > bs) { bs = s; best = [x, z]; }
        }
      }
      const out = best ? A.Bot.dir(P, best[0], best[1]) : A.Bot.dir(P, P.x + (P.x - bx), P.z + (P.z - bz));
      if (dh < 1.7 && P.data.dashCool <= 0 && Math.random() < 0.25 + L.skill * 0.5) out.tapB = true;
      return out;
    },
  });

  function angleDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
  function onIce(A, P) { return A.grid && P.h <= 0.05 && A.grid.at(Math.floor(P.x), Math.floor(P.z)) === ICE; }
  // un mur entre deux points ?
  function blockedXY(A, x0, z0, x1, z1) {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) * 3);
    for (let k = 1; k < n; k++) { const x = x0 + (x1 - x0) * k / n, z = z0 + (z1 - z0) * k / n; if (A.grid.solid(Math.floor(x), Math.floor(z))) return true; }
    return false;
  }
  function blocked(A, P, T) { return blockedXY(A, P.x, P.z, T.x, T.z); }
  // longueur d'un trajet vers T, en comptant les portails comme des raccourcis
  function routeLen(P, T) {
    let best = Math.hypot(T.x - P.x, T.z - P.z);
    for (const p of PORTALS) {
      const q = p.to, ex = q.x + 0.5 + q.out[0] * 0.9, ez = q.z + 0.5 + q.out[1] * 0.9;
      best = Math.min(best, Math.hypot(p.x + 0.5 - P.x, p.z + 0.5 - P.z) + Math.hypot(T.x - ex, T.z - ez) + 0.5);
    }
    return best;
  }
  // un portail qui fait gagner au moins « gain » cases pour atteindre T ?
  function portalShortcut(P, T, gain) {
    const direct = Math.hypot(T.x - P.x, T.z - P.z);
    let best = null, bl = direct - gain;
    for (const p of PORTALS) {
      const q = p.to, ex = q.x + 0.5 + q.out[0] * 0.9, ez = q.z + 0.5 + q.out[1] * 0.9;
      const l = Math.hypot(p.x + 0.5 - P.x, p.z + 0.5 - P.z) + Math.hypot(T.x - ex, T.z - ez);
      if (l < bl) { bl = l; best = p; }
    }
    return best;
  }
  // la bombe en vol : elle ricoche sur les champignons et passe par les portails
  function flyTricks(A, F) {
    if (F.bumpCool <= 0) for (const [bx, bz] of BUMPERS) {
      const nx = F.x - bx - 0.5, nz = F.z - bz - 0.5, dd = Math.hypot(nx, nz);
      if (dd > 0.5 || dd < 0.001) continue;
      // rebond : la vitesse est réfléchie sur la normale du champignon
      const ux = nx / dd, uz = nz / dd, dot = F.vx * ux + F.vz * uz;
      if (dot < 0) { F.vx -= 2 * dot * ux; F.vz -= 2 * dot * uz; }
      F.bumpCool = 0.25;
      A.sfx('spring'); A.burst(F.x, 0.6, F.z, 8, [0xff3d7f, 0xffffff], 3);
      A.say(F.x, F.z, 'Boing !', '#ff7ab0', 24);
      break;
    }
    if (F.portalCool <= 0) for (const p of PORTALS) {
      if (Math.hypot(F.x - p.x - 0.5, F.z - p.z - 0.5) > 0.45) continue;
      const q = p.to;
      F.x = q.x + 0.5 + q.out[0] * 0.6; F.z = q.z + 0.5 + q.out[1] * 0.6;
      // elle ressort en s'éloignant du portail d'arrivée
      const sp = Math.hypot(F.vx, F.vz);
      F.vx = q.out[0] * sp; F.vz = q.out[1] * sp;
      F.portalCool = 0.4;
      A.sfx('zap'); A.burst(p.x + 0.5, 0.6, p.z + 0.5, 10, [p.color, 0xffffff], 4); A.burst(F.x, 0.6, F.z, 10, [q.color, 0xffffff], 4);
      break;
    }
  }
  function giveNew(A) {
    const S = A.S;
    const live = A.alive();
    if (live.length < 2) return;
    const P = A.pick(live);
    S.fuse = A.rand(12, 20);           // grand stade : plus de raccourci de mèche à deux (le porteur doit traverser)
    S.holder = P.i; S.noBack = null; S.free = null; S.flying = null;
    A.banner(`${P.name} a la bombe !`, 'Refile-la vite…', P.css, 1.6);
    A.sfx('warn'); A.rumble(P, 0.6, 0.6, 250);
  }
  function pass(A, H, O, how) {
    const S = A.S;
    S.holder = O.i;
    S.noBack = { from: H.i, to: O.i, t: 1 };
    A.stat(H.i, 'passes', 1);
    A.knock(O, O.x - H.x, O.z - H.z, 3.5, 0, H);
    A.say(O.x, O.z, '💣 À toi !', O.css, 28);
    A.sfx('hit'); A.rumble(O, 0.6, 0.3, 160); A.rumble(H, 0.1, 0.3, 80);
  }
  function take(A, O, fromI, how) {
    const S = A.S;
    S.holder = O.i; S.free = null; S.flying = null;
    S.noBack = fromI >= 0 ? { from: fromI, to: O.i, t: 1 } : null;
    A.say(O.x, O.z, how === 'ramasse' ? '💣 Ramassée…' : '💣 Dans les mains !', O.css, 26);
    A.sfx('hit'); A.rumble(O, 0.6, 0.3, 160);
  }
  function explodeOn(A, P) {
    const S = A.S;
    S.holder = -1; S.nextT = 2.2;
    boomFx(A, P.x, P.z);
    for (const O of A.alive()) if (O !== P && A.dist(O, P) < 1.6) A.knock(O, O.x - P.x, O.z - P.z, 9, 0.3);
    A.kill(P, 'boom', null);
  }
  function explodeFloor(A) {
    const S = A.S;
    const x = S.flying ? S.flying.x : S.free.x, z = S.flying ? S.flying.z : S.free.z;
    const from = S.lastThrow ? A.players[S.lastThrow.from] : null;
    S.flying = null; S.free = null; S.nextT = 2.2;
    boomFx(A, x, z, true);
    const victims = A.alive().filter((O) => Math.hypot(O.x - x, O.z - z) < 2.2);
    for (const O of victims) A.kill(O, 'boom', from && from !== O ? from : null);
    if (!victims.length) A.say(x, z, 'Raté !', '#ffd28a', 30);
  }
  function boomFx(A, x, z, big) {
    A.shake(big ? 0.7 : 0.55);
    A.sfx('boom');
    A.burst(x, 0.8, z, big ? 50 : 34, [0xff5533, 0xffd23a, 0x333333, 0xffffff], big ? 9 : 7, { up: 4 });
    // l'onde de choc (anneaux du moteur, réutilisés)
    A.wave(x, z, 0xff7a1a, big ? 4.4 : 3.2, 0.5);
    A.wave(x, z, 0xffd23a, big ? 2.6 : 1.9, 0.35);
  }
})();
