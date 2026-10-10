/* =====================================================================
   💣 BOUM ! — combat de bombes en vue de dessus
   v1.4 : GRAND STADE 23 × 17 (avant : 15 × 13)
   ---------------------------------------------------------------------
   LA DISPOSITION
   - bordure de murs, piliers fixes sur les cases (paire, paire) ;
   - 4 COINS DE DÉPART dégagés et symétriques : un « L » de 4 cases dans
     chaque direction + une petite niche → de quoi poser sa 1re bombe et
     se mettre à l'abri ;
   - au centre, la PLACE DE LA FORGE : un losange SANS piliers, au sol de
     plaques chaudes. On y traverse vite… mais rien n'y arrête une croix ;
   - 4 COULOIRS sans caisses y mènent (la colonne du milieu, et les deux
     lignes qui encadrent la place, d'un bord à l'autre) ;
   - ailleurs, des caisses (≈ 62 %, disposées en miroir pour que chaque
     coin ait les mêmes chances), parfois un bonus dessous.
   LES RÈGLES
   - la bombe explose après 2,5 s, en CROIX seulement ;
   - murs fixes (bloquent tout), caisses (cassées par l'explosion) ;
   - bonus : +1 bombe, portée, vitesse, télécommande, bombe traversante,
     coup de pied (pousser les bombes), et le malus « Rhume d'Oswel » ;
   - 2 MARTEAUX-PILONS géants (un « horizontal », un « vertical ») : chacun
     choisit une portion de ligne ou de colonne, la fait CLIGNOTER EN ROUGE
     ~1,3 s, puis l'écrase : joueurs aplatis (élimination, crédit à
     personne), caisses cassées (bonus possible), bombes qui sautent ;
   - un éliminé devient un FANTÔME qui tourne autour de l'arène et lance
     des mini-bombes ; s'il élimine quelqu'un, il revient en jeu ;
   - à 70 s, la Forge se referme : des blocs tombent en spirale (les
     prochaines cases rougeoient) et remplissent le stade en ~40 s. La
     flèche « CENTRE » montre la dernière zone sûre.
   3 manches : 3 points pour le survivant, 1 par élimination.
   ===================================================================== */
(function () {
  const W = 23, D = 17;                       // dimensions IMPAIRES : bordure et piliers sur les indices pairs
  const CX = 11, CZ = 8;                      // le centre de la place de la Forge
  const FUSE = 2.5, FLAME_T = 0.5;
  const SUDDEN = 70, FILL = 40;               // mort subite à 70 s ; la spirale remplit le stade en ~40 s
  const CRATES = 0.62, ITEM_P = 0.3;          // densité des caisses ; chance d'un bonus sous une caisse
  const HAMMER_WARN = 1.3;                    // le pilon prévient ~1,3 s avant de frapper
  const SWEEP = 0.45, SLAM = 0.12;            // la charge du pilon puis sa descente (l'impact est à la fin du clignotement)
  const SPAWNS = [[1, 1], [W - 2, D - 2], [W - 2, 1], [1, D - 2]];
  const ITEMS = {
    bomb:   { icon: '💣', name: '+1 bombe', color: 0x3a3f46, w: 24 },
    fire:   { icon: '🔥', name: 'Portée +1', color: 0xff7a1a, w: 26 },
    speed:  { icon: '👟', name: 'Vitesse', color: 0x3cff9a, w: 14 },
    kick:   { icon: '🦶', name: 'Coup de pied', color: 0xc98a3a, w: 10 },
    remote: { icon: '🎮', name: 'Télécommande', color: 0x5ad1ff, w: 7 },
    pierce: { icon: '⚡', name: 'Bombe traversante', color: 0xffd84a, w: 7 },
    rhume:  { icon: '🤧', name: "Rhume d'Oswel", color: 0x9cff5a, w: 8 },
  };
  const ITEM_LIST = Object.keys(ITEMS);
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const key = (x, z) => z * W + x;
  // la place de la Forge : un losange autour du centre (pas de piliers dedans)
  const inPlace = (x, z) => Math.abs(x - CX) + Math.abs(z - CZ) <= 4 && Math.abs(z - CZ) <= 3;
  const pillar = (x, z) => x % 2 === 0 && z % 2 === 0 && !(Math.abs(x - CX) + Math.abs(z - CZ) <= 4);
  // les couloirs sans caisses qui mènent à la place
  const inLane = (x, z) => !inPlace(x, z) && x >= 1 && z >= 1 && x <= W - 2 && z <= D - 2 && (x === CX || z === CZ - 1 || z === CZ + 1);
  // profondeur d'une case (0 = contre la bordure) : utile pour la spirale de la mort subite
  const depth = (x, z) => Math.min(x - 1, z - 1, W - 2 - x, D - 2 - z);
  // les deux marteaux-pilons : l'un frappe des LIGNES (barre le long de x), l'autre des COLONNES
  const HAMMERS = [
    { axis: 'row', L: 9, park: [W / 2, -3.1], first: 9 },       // garé au fond, derrière le mur du haut
    { axis: 'col', L: 7, park: [-3.2, D / 2], first: 13.5 },     // garé à gauche, derrière le couloir des fantômes
  ];

  /* ---------- Géométries et matériaux partagés (créés une seule fois) ---------- */
  const geo = {};
  function shared() {
    if (geo.ready) return geo;
    geo.ready = true;
    geo.box = new THREE.BoxGeometry(1, 1, 1);
    geo.plane = new THREE.PlaneGeometry(1, 1);
    geo.rod = new THREE.CylinderGeometry(0.11, 0.11, 1, 10);
    geo.disc = new THREE.CircleGeometry(0.45, 20);
    geo.fall = new THREE.BoxGeometry(0.98, 0.9, 0.98);
    geo.itemBase = new THREE.CylinderGeometry(0.36, 0.36, 0.12, 20);
    geo.torus = new THREE.TorusGeometry(0.98, 0.16, 6, 20);
    const lin = (c) => new THREE.Color(c).convertSRGBToLinear();
    geo.iron = new THREE.MeshStandardMaterial({ color: lin(0x5a6068), roughness: 0.4, metalness: 0.7 });
    geo.steel = new THREE.MeshStandardMaterial({ color: lin(0x8f8780), roughness: 0.3, metalness: 0.8 });
    geo.hot = new THREE.MeshBasicMaterial({ color: lin(0xff6a1a), toneMapped: false });
    geo.fallMat = new THREE.MeshStandardMaterial({ color: lin(0x7a6252), roughness: 0.6, metalness: 0.15 });
    geo.shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false });
    geo.strip = [0, 1].map(() => new THREE.MeshBasicMaterial({ color: lin(0xff2a14), transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false }));
    geo.spiralMat = new THREE.MeshBasicMaterial({ color: lin(0xff5a1a), transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    geo.bandMat = {};       // la bande colorée des bombes, une par couleur de joueur
    geo.itemMat = {};       // le socle des bonus, un par type
    geo.itemLab = {};       // l'étiquette des bonus, une par type (les objets la partagent)
    return geo;
  }

  // la bande « danger » (rayures jaunes et noires) d'un pilon : une texture répétée selon sa longueur
  function hazardMat(k, L) {
    shared();
    if (!geo.hazTex) geo.hazTex = OT.Models.canvasTex(64, 32, (g, w, h) => {
      g.fillStyle = '#1c1714'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffc21a';
      for (let i = -1; i < 3; i++) { g.beginPath(); g.moveTo(i * 32, h); g.lineTo(i * 32 + 16, h); g.lineTo(i * 32 + 32, 0); g.lineTo(i * 32 + 16, 0); g.closePath(); g.fill(); }
    }, true);
    geo.hazMat = geo.hazMat || [];
    if (!geo.hazMat[k]) {
      const t = geo.hazTex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(L * 1.5, 1);
      geo.hazMat[k] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, metalness: 0.2 });
    }
    return geo.hazMat[k];
  }

  function bombMesh(A, color, mini) {
    if (A.headless) return null;
    shared();
    const g = new THREE.Group();
    const r = mini ? 0.22 : 0.32;
    const body = new THREE.Mesh(geo.ball || (geo.ball = new THREE.SphereGeometry(1, 18, 14)), geo.bm || (geo.bm = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.35, metalness: 0.4 })));
    body.scale.setScalar(r); body.position.y = r; body.castShadow = true;
    const band = new THREE.Mesh(geo.torus, geo.bandMat[color] || (geo.bandMat[color] = new THREE.MeshBasicMaterial({ color: A.lin(color), toneMapped: false })));
    band.scale.setScalar(r); band.rotation.x = Math.PI / 2; band.position.y = r;
    const fuse = new THREE.Mesh(geo.fuse || (geo.fuse = new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6)), geo.fm || (geo.fm = new THREE.MeshStandardMaterial({ color: 0x8a7a5a })));
    fuse.position.y = r * 2 + 0.06;
    const spark = new THREE.Mesh(geo.spark || (geo.spark = new THREE.SphereGeometry(0.07, 8, 6)), geo.sm || (geo.sm = new THREE.MeshBasicMaterial({ color: 0xffd84a, toneMapped: false })));
    spark.position.y = r * 2 + 0.17;
    g.add(body, band, fuse, spark);
    g.userData = { body, spark, r };
    return g;
  }
  function flameMesh(A, x, z, center) {
    if (A.headless) return null;
    const m = new THREE.Mesh(geo.flame || (geo.flame = new THREE.BoxGeometry(0.96, 0.5, 0.96)), geo.flm || (geo.flm = new THREE.MeshBasicMaterial({ color: A.lin(0xff5a0a), toneMapped: false, transparent: true, opacity: 0.92 })));
    m.position.set(x + 0.5, 0.25, z + 0.5);
    const core = new THREE.Mesh(geo.flame, geo.flc || (geo.flc = new THREE.MeshBasicMaterial({ color: A.lin(0xffd23a), toneMapped: false })));
    core.scale.set(0.5, 1.15, 0.5);
    m.add(core);
    if (center) m.scale.set(1.1, 1.3, 1.1);
    A.add(m);
    return m;
  }
  function itemMesh(A, type) {
    if (A.headless) return null;
    shared();
    const T = ITEMS[type];
    const g = new THREE.Group();
    const base = new THREE.Mesh(geo.itemBase, geo.itemMat[type] || (geo.itemMat[type] = new THREE.MeshStandardMaterial({ color: A.lin(T.color), emissive: A.lin(T.color), emissiveIntensity: 0.35, roughness: 0.5, metalness: 0.1 })));
    base.position.y = 0.06; base.castShadow = true;
    // l'étiquette (canvas) est fabriquée une fois par type : chaque bonus en garde une copie légère
    const ref = geo.itemLab[type] || (geo.itemLab[type] = A.label(T.icon, { size: 40, h: 0.62, bg: 'rgba(14,11,9,0.75)', border: '#' + T.color.toString(16).padStart(6, '0') }));
    const lab = new THREE.Mesh(ref.geometry, ref.material); lab.renderOrder = ref.renderOrder;
    lab.position.y = 0.75;
    g.add(base, lab);
    g.userData.lab = lab;
    return g;
  }

  OT.Arena.register({
    id: 'boum', name: 'Boum !', icon: '💣', color: '#ffb020', theme: 'forge', music: 'boum',
    tagline: 'Pose des bombes, casse les caisses, sois le dernier debout.',
    rules: [
      'A : poser une bombe. Elle explose après 2,5 s, en croix.',
      'Les caisses cachent des bonus : 💣 🔥 👟 🦶 🎮 ⚡… et le 🤧 Rhume d\'Oswel (contagieux !).',
      'Gare aux marteaux-pilons : la ligne qui clignote en rouge va être écrasée !',
      'Éliminé ? Tu deviens un fantôme : lance des mini-bombes depuis le bord. Une élimination et tu reviens !',
      'À 70 s, la Forge se referme : file au centre. 3 points au survivant, 1 par élimination.',
    ],
    controls: { a: 'Poser une bombe (fantôme : lancer)', b: 'Télécommande : faire exploser' },
    // la fiche de présentation (1.4)
    goal: 'Fais sauter les autres et sois le dernier debout dans la Forge !',
    howto: [
      'Bouge avec {move} entre les piliers.',
      '{a} : poser une bombe. Elle explose en croix après 2,5 s : écarte-toi de la ligne !',
      'Casse les caisses : bonus 💣 🔥 👟 🦶 🎮 ⚡ (mais pas le 🤧).',
      '{b} : faire exploser ta bombe à distance (avec la télécommande 🎮).',
    ],
    danger: 'Les marteaux-pilons écrasent les cases qui clignotent en rouge. À 70 s, des blocs tombent en spirale.',
    win: 'Dernier debout : +3 points. Chaque élimination : +1 point.',
    lose: 'Une croix de feu, un coup de pilon ou un bloc sur la tête… et tu deviens un fantôme.',
    tuto: ['Déplace-toi : {move}', '{a} : poser une bombe (puis fuis la croix !)', '{b} : télécommande (avec le bonus 🎮)'],
    rounds: (n) => (n <= 2 ? 3 : 3),
    scoreName: 'points',
    maxRound: 140,
    view: () => ({ x0: -1, z0: -1, x1: W + 1, z1: D + 1 }),
    tilt: 28,
    camMin: 0.62,          // la caméra suit l'action sans montrer moins que cette part de l'arène

    setup(A) { A.S.wins = A.fill(A.n, 0); },

    round(A) {
      const S = A.S;
      S.bombs = []; S.flames = []; S.items = []; S.falling = []; S.danger = null;
      S.suddenK = 0; S.suddenT = 0; S.suddenDt = 0.16; S.spiral = []; S.sudden = false; S.endT = 0; S.invert = null;
      // les coins de départ : un « L » de 4 cases dans chaque direction + une niche (hors de la croix de sa 1re bombe)
      const keep = new Set();
      SPAWNS.forEach(([x, z]) => {
        const ix = x < W / 2 ? 1 : -1, iz = z < D / 2 ? 1 : -1;
        for (let k = 0; k < 4; k++) { keep.add(key(x + ix * k, z)); keep.add(key(x, z + iz * k)); }
        keep.add(key(x + 2 * ix, z + iz)); keep.add(key(x + ix, z + 2 * iz));
      });
      // les caisses sont tirées au sort sur un quart du stade puis recopiées en miroir : chaque coin a les mêmes chances
      const rnd = A.fill(Math.ceil(D / 2) * Math.ceil(W / 2), () => Math.random());
      const mirror = (x, z) => rnd[Math.min(z, D - 1 - z) * Math.ceil(W / 2) + Math.min(x, W - 1 - x)];
      const G = A.buildGrid(W, D, (x, z) => {
        if (x === 0 || z === 0 || x === W - 1 || z === D - 1) return A.WALL;
        if (pillar(x, z)) return A.WALL;
        if (keep.has(key(x, z)) || inLane(x, z)) return A.FLOOR;
        if (inPlace(x, z)) return mirror(x, z) < 0.12 ? A.CRATE : A.FLOOR;   // la place reste presque vide
        return mirror(x, z) < CRATES ? A.CRATE : A.FLOOR;
      }, 'forge');
      A.players.forEach((P, i) => {
        const [x, z] = SPAWNS[i % 4];
        A.place(P, x + 0.5, z + 0.5);
        P.face = x < W / 2 ? Math.PI / 2 : -Math.PI / 2;
        P.r = 0.3; P.speed = 3.7;
        P.data = { max: 1, range: 2, spd: 0, kick: false, remote: false, pierce: false, rhumeT: 0, rhume: null, ghostCool: 3, revived: false, active: 0, crates: 0, items: 0 };
      });
      // les marteaux-pilons (état logique, même sans rendu)
      S.hammers = HAMMERS.map((h, k) => ({ k, axis: h.axis, L: h.L, park: h.park, state: 'wait', t: 0, next: h.first, cells: [], set: new Set(), tx: h.park[0], tz: h.park[1], x: h.park[0], z: h.park[1], y: 2.4, mesh: null, strip: null }));
      S.spiralMarks = null; S.emblem = null;
      if (!A.headless) {
        shared();
        // bordure décorative (le « couloir des fantômes »)
        const ring = A.mesh('box', 1, 0x2a1d15, { h: 0.1, d: 1 });
        ring.scale.set(W + 2.6, 1, D + 2.6); ring.position.set(W / 2, -0.25, D / 2); ring.receiveShadow = true;
        A.add(ring);
        // la place de la Forge et ses couloirs : un sol différent (plaques chaudes / allées de fer)
        if (G.floorMesh) {
          const c = new THREE.Color();
          for (let z = 1; z < D - 1; z++) for (let x = 1; x < W - 1; x++) {
            let col = null;
            if (inPlace(x, z)) col = (x + z) % 2 ? 0x94563a : 0x844b31;
            else if (inLane(x, z)) col = (x + z) % 2 ? 0x56493f : 0x4e423a;
            if (col !== null) { c.set(col).convertSRGBToLinear(); G.floorMesh.setColorAt(G.floorIdx[z * W + x], c); }
          }
          G.floorMesh.instanceColor.needsUpdate = true;
        }
        // l'emblème de la Forge au centre de la place (un anneau rougeoyant qui pulse)
        S.emblem = A.mesh('ring', 1.55, 0xff7a1a, { basic: true, opacity: 0.4 });
        S.emblem.position.set(CX + 0.5, 0.025, CZ + 0.5);
        A.add(S.emblem);
        // les marteaux-pilons : une tête de fer (bas brûlant, bande jaune et noire « danger »),
        // deux courts pistons sur le dessus, et une bande rouge au sol pendant l'alerte
        for (const H of S.hammers) {
          const g = new THREE.Group();
          const row = H.axis === 'row', L = H.L;
          const sx = row ? L : 0.9, sz = row ? 0.9 : L;
          const head = new THREE.Mesh(geo.box, geo.iron); head.scale.set(sx, 0.7, sz); head.position.y = 0.45; head.castShadow = true;
          const face = new THREE.Mesh(geo.box, geo.hot); face.scale.set(sx - 0.06, 0.1, sz - 0.06); face.position.y = 0.06;
          const band = new THREE.Mesh(geo.box, hazardMat(H.k, L)); band.scale.set(sx + 0.03, 0.24, sz + 0.03); band.position.y = 0.5;
          g.add(head, face, band);
          for (const s of [-1, 1]) {
            const rod = new THREE.Mesh(geo.rod, geo.steel); rod.scale.set(1.6, 1.4, 1.6);
            rod.position.set(row ? s * (L / 2 - 1.2) : 0, 1.5, row ? 0 : s * (L / 2 - 1.2));
            g.add(rod);
          }
          g.position.set(H.x, H.y, H.z);
          A.add(g); H.mesh = g;
          // l'alerte : un « rideau » rouge translucide sur toute la portion (visible même sur les caisses)
          const strip = new THREE.Mesh(geo.box, geo.strip[H.k]);
          strip.scale.set(row ? L - 0.04 : 0.96, 0.9, row ? 0.96 : L - 0.04); strip.position.y = 0.45; strip.visible = false; strip.renderOrder = 3;
          A.add(strip); H.strip = strip;
        }
        // les prochaines cases de la spirale (mort subite) : des dalles qui rougeoient
        const sm = new THREE.InstancedMesh(geo.plane, geo.spiralMat, 14);
        const dm = new THREE.Object3D();
        dm.scale.setScalar(0); dm.updateMatrix();
        for (let k = 0; k < 14; k++) sm.setMatrixAt(k, dm.matrix);
        sm.frustumCulled = false;
        A.add(sm); S.spiralMarks = sm; S.spiralDummy = dm;
      }
    },

    blocks(A, cx, cz, P) {
      const b = A.S.bombs && A.S.bombs.find((o) => o.cx === cx && o.cz === cz && !o.dead);
      return !!(b && !b.pass.has(P ? P.i : -1));
    },

    speedMod(A, P) { return 1 + P.data.spd * 0.16 * (P.data.rhume === 'lent' ? 0 : 1) - (P.data.rhume === 'lent' ? 0.45 : 0); },

    onKill(A, P, cause, by) {
      const S = A.S;
      if (by && by !== P) A.point(by.i, 1);
      if (by && by.ghost && !by.data.revived && by !== P) {
        // le fantôme a eu quelqu'un : il revient !
        by.data.revived = true; by.data.reviveIn = 0.8; by.data.reviveFor = P.i;
        A.banner(`${by.name} revient d'entre les fantômes !`, `en éliminant ${P.name}`, by.css, 1.8);
      }
      P.out = true;
      // il devient un fantôme sur le bord
      if (A.alive().length >= 2 && !P.data.revivedOnce) {
        P.ghost = true; P.alive = false;
        P.data.ghostCool = 4;
        const side = edgePoint(P.x, P.z);
        P.ghostAt = side;
        A.say(P.x, P.z, '👻', P.css, 40);
      }
      if (by === P) A.say(P.x, P.z, 'Sa propre bombe !', '#ff7a1a', 26);
      if (cause === 'crush') A.say(P.x, P.z, 'Écrasé !', '#ff5533', 30);
    },

    update(A, dt) {
      const S = A.S, G = A.grid;
      // joueurs : bombes, bonus, rhume
      for (const P of A.players) {
        const d = P.data;
        if (P.ghost) { ghostUpdate(A, P, dt); continue; }
        if (!P.alive || P.out) continue;
        const cx = Math.floor(P.x), cz = Math.floor(P.z);
        // ramasser un bonus
        const it = S.items.find((o) => o.cx === cx && o.cz === cz);
        if (it) take(A, P, it);
        // poser une bombe
        let want = P.in.aP;
        if (d.rhume === 'eternue' && Math.random() < dt * 1.6) want = true;
        if (want) dropBomb(A, P, cx, cz);
        if (P.in.bP && d.remote) {
          const mine = S.bombs.filter((b) => b.owner === P && !b.dead).sort((a, b) => a.born - b.born)[0];
          if (mine) { mine.t = 0; A.sfx('tick'); }
        }
        // coup de pied : on marche dans une bombe → elle glisse
        if (d.kick && Math.hypot(P.in.mx, P.in.mz) > 0.5) {
          const dx = Math.abs(P.in.mx) > Math.abs(P.in.mz) ? Math.sign(P.in.mx) : 0, dz = dx ? 0 : Math.sign(P.in.mz);
          const fx = Math.floor(P.x + dx * 0.62), fz = Math.floor(P.z + dz * 0.62);
          const b = S.bombs.find((o) => o.cx === fx && o.cz === fz && !o.dead && !o.slide && !o.pass.has(P.i));
          if (b && (fx !== cx || fz !== cz)) { b.slide = [dx, dz]; b.kicker = P; A.sfx('push'); }
        }
        // rhume contagieux
        if (d.rhumeT > 0) {
          for (const O of A.others(P)) if (!O.data.rhumeT && !O.data.rhumeImmune && A.dist(P, O) < 0.7) { giveRhume(A, O, d.rhume); P.data.rhumeImmune = 1.5; }
          d.rhumeImmune = Math.max(0, (d.rhumeImmune || 0) - dt);
        } else if (d.rhume) { d.rhume = null; if (S.invert) S.invert[P.i] = 0; }
        if (S.invert && S.invert[P.i] > 0) S.invert[P.i] = d.rhumeT;
        // on quitte la case de sa bombe : elle devient solide pour nous
        for (const b of S.bombs) if (b.pass.has(P.i) && (Math.abs(P.x - (b.cx + 0.5)) > 0.5 + P.r * 0.92 || Math.abs(P.z - (b.cz + 0.5)) > 0.5 + P.r * 0.92)) b.pass.delete(P.i);
        // un humain dans une zone qui va être frappée : « Attention ! », « À gauche ! »…
        if (P.human) humanWarn(A, P, cx, cz);
      }
      // bombes
      for (const b of S.bombs) {
        if (b.dead) continue;
        if (b.flying) {
          b.ft += dt; const k = Math.min(1, b.ft / b.fd);
          b.x = A.lerp(b.sx, b.cx + 0.5, k); b.z = A.lerp(b.sz, b.cz + 0.5, k); b.y = Math.sin(k * Math.PI) * 2.2;
          if (k >= 1) { b.flying = false; b.y = 0; A.sfx('land'); }
          continue;
        }
        if (b.slide) {
          const nx = b.x + b.slide[0] * 8 * dt, nz = b.z + b.slide[1] * 8 * dt;
          const ncx = Math.floor(nx + b.slide[0] * 0.5), ncz = Math.floor(nz + b.slide[1] * 0.5);
          const blocked = G.solid(ncx, ncz) || S.bombs.some((o) => o !== b && !o.dead && o.cx === ncx && o.cz === ncz) || A.alive().some((P) => Math.floor(P.x) === ncx && Math.floor(P.z) === ncz && (ncx !== b.cx || ncz !== b.cz));
          if (blocked) { b.x = b.cx + 0.5; b.z = b.cz + 0.5; b.slide = null; }
          else { b.x = nx; b.z = nz; b.cx = Math.floor(b.x); b.cz = Math.floor(b.z); }
        }
        b.t -= dt;
        if (b.t <= 0) explode(A, b);
      }
      S.bombs = S.bombs.filter((b) => !b.dead);
      // flammes
      for (const f of S.flames) {
        f.t -= dt;
        for (const P of A.players) {
          if (!P.alive || P.out || P.ghost) continue;
          if (f.cells.has(key(Math.floor(P.x), Math.floor(P.z)))) A.kill(P, 'boom', f.owner);
        }
        for (const it of S.items) if (!it.dead && f.cells.has(key(it.cx, it.cz)) && it.born < f.born) { it.dead = true; A.remove(it.mesh); A.burst(it.cx + 0.5, 0.4, it.cz + 0.5, 6, [0x888888], 3); }
        if (f.t <= 0) f.meshes.forEach((m) => A.remove(m));
      }
      S.flames = S.flames.filter((f) => f.t > 0);
      S.items = S.items.filter((i) => !i.dead);
      // les marteaux-pilons
      for (const H of S.hammers) hammerStep(A, H, dt);
      // retour d'un fantôme
      for (const P of A.players) if (P.data.reviveIn > 0) {
        P.data.reviveIn -= dt;
        if (P.data.reviveIn <= 0) {
          const c = safeCell(A) || [CX, CZ];
          A.revive(P, c[0] + 0.5, c[1] + 0.5, 2.2);
          P.data.revivedOnce = true; P.data.reviveIn = 0; A.stat(P.i, 'revive', 1);
          if (P.data.sheet) { A.remove(P.data.sheet); P.data.sheet = null; }
          A.burst(P.x, 0.6, P.z, 24, [P.color, 0xffffff], 6, { up: 3 });
        }
      }
      // mort subite : la Forge se referme (spirale de l'extérieur vers le centre)
      if (A.t > SUDDEN) {
        if (!S.sudden) {
          S.sudden = true;
          // on ne garde que les cases encore libres : la vitesse est réglée pour tout remplir en ~40 s
          S.spiral = spiral().filter(([x, z]) => G.at(x, z) !== A.WALL);
          S.suddenDt = FILL / Math.max(1, S.spiral.length);
          S.suddenT = 0.8;          // un petit temps pour lire la bannière
          A.banner('La Forge se referme !', 'Des blocs tombent en spirale : file au CENTRE', '#ff5533', 2.4);
          A.sfx('warn'); A.announce('sudden'); A.shake(0.3);
        }
        S.suddenT -= dt;
        while (S.suddenT <= 0 && S.suddenK < S.spiral.length) {
          S.suddenT += S.suddenDt;
          const [x, z] = S.spiral[S.suddenK++];
          if (G.at(x, z) !== A.WALL) S.falling.push(Object.assign({ x, z, y: 5.5 }, fallMesh(A, x, z)));
        }
      }
      for (const f of S.falling) {
        f.y -= dt * 14;
        if (f.mesh) f.mesh.position.y = Math.max(0.45, f.y);
        if (f.y <= 0.5 && !f.done) {
          f.done = true;
          A.setCell(f.x, f.z, A.WALL);
          A.remove(f.mesh); A.remove(f.sh);
          A.shake(0.18); A.sfx('land');
          for (const P of A.alive()) if (!P.ghost && Math.floor(P.x) === f.x && Math.floor(P.z) === f.z) A.kill(P, 'crush', null);
          S.items = S.items.filter((i) => { if (i.cx === f.x && i.cz === f.z) { A.remove(i.mesh); return false; } return true; });
          for (const b of S.bombs) if (b.cx === f.x && b.cz === f.z) { b.dead = true; A.remove(b.mesh); if (b.owner && !b.mini) b.owner.data.active = Math.max(0, b.owner.data.active - 1); }
        }
      }
      S.falling = S.falling.filter((f) => !f.done);
      // fin de la manche
      const alive = A.players.filter((P) => P.alive && !P.out && !P.ghost);
      const pendingRevive = A.players.some((P) => P.data.reviveIn > 0);
      if (!pendingRevive && alive.length <= 1 && !S.endT) S.endT = 0.6;
      if (S.endT) {
        S.endT -= dt;
        if (S.endT <= 0) {
          const w = A.players.filter((P) => P.alive && !P.out && !P.ghost);
          if (w.length === 1) { S.wins[w[0].i]++; A.endRound({ points: { [w[0].i]: 3 }, text: `${w[0].name} survit !`, sub: '+3 points', color: w[0].css }); }
          else A.endRound({ text: 'Personne ne survit !', sub: 'Match nul', color: '#ff7a1a' });
        }
      }
    },

    timeoutRank(A) {
      const w = A.players.filter((P) => P.alive && !P.out && !P.ghost);
      return { text: 'Temps écoulé !', sub: w.map((p) => p.name).join(', ') + ' +1', points: Object.fromEntries(w.map((p) => [p.i, 1])) };
    },

    idle(A, dt) {},
    rush(A) { return A.S.sudden ? 1.18 : 1; },

    // flèches d'objectif : seulement pendant la mort subite, vers la dernière zone sûre
    goals(A) {
      if (A.phase !== 'play' || !A.S.sudden) return [];
      return [{ x: CX + 0.5, z: CZ + 0.5, color: 0xff5533, label: 'CENTRE', size: 1.15 }];
    },

    draw(A, dt, time) {
      const S = A.S;
      for (const b of S.bombs) if (b.mesh) {
        b.mesh.position.set(b.x, b.y || 0, b.z);
        const k = 1 + Math.sin(time * (b.t < 0.8 ? 30 : 10)) * 0.06 + (b.t < 0.8 ? 0.12 : 0);
        b.mesh.userData.body.scale.setScalar(b.mesh.userData.r * k);
        b.mesh.userData.spark.visible = Math.sin(time * 40) > -0.3;
      }
      for (const f of S.flames) for (const m of f.meshes) if (m) { const k = Math.max(0.05, f.t / FLAME_T); m.scale.y = 0.4 + k; m.material.opacity = 0.5 + k * 0.45; }
      for (const it of S.items) if (it.mesh) { it.mesh.rotation.y = 0; it.mesh.userData.lab.quaternion.copy(A.camera.quaternion); it.mesh.position.y = Math.sin(time * 4 + it.cx) * 0.06; }
      for (const P of A.players) {
        // le rhume : petites bulles vertes
        if (P.data.rhumeT > 0 && P.alive && Math.random() < 0.2) A.burst(P.x, 1.2, P.z, 1, [0x9cff5a], 1, { grav: -1, life: 0.6 });
      }
      if (S.emblem) S.emblem.material.opacity = (S.sudden ? 0.55 : 0.3) + Math.sin(time * (S.sudden ? 6 : 2)) * 0.12;
      // les marteaux-pilons : pendant l'alerte, ils s'alignent HORS du terrain (au bout de la ligne visée,
      // pour ne rien cacher de la bande rouge), puis foncent au-dessus d'elle et tombent d'un coup
      const ease = 1 - Math.exp(-dt * 9);
      for (const H of S.hammers || []) {
        if (!H.mesh) continue;
        const row = H.axis === 'row';
        // la place « alignée » : même x (ou même z) que la cible, mais garée hors du terrain
        const ax = row ? H.tx : H.park[0], az = row ? H.park[1] : H.tz;
        if (H.state === 'warn' && H.t <= SWEEP) {
          // la charge : glissade rapide vers la ligne, puis la frappe
          const k = Math.min(1, (SWEEP - H.t) / (SWEEP - SLAM)), e = k * k * (3 - 2 * k);
          H.x = A.lerp(ax, H.tx, e); H.z = A.lerp(az, H.tz, e);
          H.y = H.t > SLAM ? 2.6 : 2.6 * Math.pow(H.t / SLAM, 2);
        } else if (H.state === 'hold') { H.x = H.tx; H.z = H.tz; H.y = 0; }
        else {
          const tx = H.state === 'warn' ? ax : H.park[0], tz = H.state === 'warn' ? az : H.park[1];
          H.x += (tx - H.x) * ease; H.z += (tz - H.z) * ease;
          const ty = H.state === 'warn' ? 2.6 + Math.sin(time * 9) * 0.1 : 2.4;
          H.y += (ty - H.y) * Math.min(1, dt * 5);
        }
        H.mesh.position.set(H.x, H.y, H.z);
        // la bande rouge au sol : elle clignote de plus en plus vite
        H.strip.visible = H.state === 'warn';
        if (H.strip.visible) {
          const f = H.t < 0.5 ? 26 : 12;
          H.strip.material.opacity = 0.2 + (Math.sin(time * f) * 0.5 + 0.5) * 0.35;
          H.strip.position.set(H.tx, 0.45, H.tz);
        }
      }
      // mort subite : les prochaines cases de la spirale rougeoient
      if (S.spiralMarks) {
        const dm = S.spiralDummy;
        for (let k = 0; k < 14; k++) {
          const c = S.sudden ? S.spiral[S.suddenK + k] : null;
          if (c) { dm.position.set(c[0] + 0.5, 0.04, c[1] + 0.5); dm.rotation.set(-Math.PI / 2, 0, 0); dm.scale.setScalar(0.9); }
          else dm.scale.setScalar(0);
          dm.updateMatrix(); S.spiralMarks.setMatrixAt(k, dm.matrix);
        }
        S.spiralMarks.instanceMatrix.needsUpdate = true;
        geo.spiralMat.opacity = 0.3 + (Math.sin(time * 14) * 0.5 + 0.5) * 0.35;
      }
    },

    hud(A) {
      const S = A.S;
      const left = A.t < SUDDEN ? SUDDEN - A.t : null;
      const hit = (S.hammers || []).some((H) => H.state === 'warn');
      return {
        timer: left,
        note: A.t >= SUDDEN ? '⚠ La Forge se referme : au centre !' : hit ? '🔨 Le pilon va frapper : sors de la zone rouge !' : '',
        rows: A.players.map((P) => ({ i: P.i, txt: P.ghost ? '👻' : (P.out ? '✖' : `💣${P.data.max} 🔥${P.data.range}${P.data.kick ? ' 🦶' : ''}${P.data.remote ? ' 🎮' : ''}${P.data.pierce ? ' ⚡' : ''}${P.data.rhumeT > 0 ? ' 🤧' : ''}`) })),
      };
    },

    stats(A, P) {
      const s = A.stats[P.i];
      return [`${s.kills || 0} élimination${(s.kills || 0) > 1 ? 's' : ''}`, `${s.crates || 0} caisses`, `${s.items || 0} bonus`, `${s.bombs || 0} bombes`];
    },
    bonus(A, P) {
      const out = [];
      if (A.S.wins[P.i]) out.push(`Survivant ×${A.S.wins[P.i]}`);
      if (A.stats[P.i].revive) out.push('Revenu du royaume des fantômes');
      return out;
    },
    tiebreak(A, i) { return A.S.wins[i]; },

    // garde-fou des bots (appelé à chaque pas) : les ordres arrivent avec un temps de réaction, donc
    // un chemin peut commencer par des cases déjà dépassées. On saute directement à la case où l'on
    // est déjà, au lieu de revenir en arrière (demi-tour mortel devant une bombe ou un pilon).
    botGuard(A, P, mx, mz, L, C) {
      if (!C || !C.path || C.path.length < 2 || P.ghost) return [mx, mz];
      const cx = Math.floor(P.x), cz = Math.floor(P.z);
      let j = -1;
      for (let k = C.path.length - 1; k >= 1; k--) if (C.path[k][0] === cx && C.path[k][1] === cz) { j = k; break; }
      if (j < 1) return [mx, mz];
      C.path.splice(0, j);
      const [x, z] = C.path[0], dx = x + 0.5 - P.x, dz = z + 0.5 - P.z, d = Math.hypot(dx, dz);
      const k = C.path.length > 1 ? 1 : Math.min(1, d / 0.35);
      return d > 0.04 ? [(dx / d) * k, (dz / d) * k] : [0, 0];
    },

    /* ---------- LE BOT ---------- */
    bot(A, P, B, L) {
      if (P.ghost) return ghostBot(A, P, B, L);
      if (!P.alive || P.out) return {};
      const S = A.S, G = A.grid;
      const [cx, cz] = A.Bot.cell(P);
      const danger = dangerMap(A, null);        // bombes, flammes, pilons annoncés, blocs qui tombent
      const spd = P.speed * (1 + P.data.spd * 0.16);       // estimation prudente (sans le bonus de vitesse du moteur)
      const ignore = Math.random() < L.mistake * 0.3;     // erreur : il ne voit pas le danger
      const free = (x, z) => !G.solid(x, z) && !S.bombs.some((b) => b.cx === x && b.cz === z && !b.dead) && !S.falling.some((f) => f.x === x && f.z === z);
      const passSafe = (x, z) => free(x, z) && !(danger.has(key(x, z)) && danger.get(key(x, z)) < 0.25);
      // 1) en danger : fuir vers la case sûre la plus proche
      if (danger.has(key(cx, cz)) && !ignore) {
        const path = A.Bot.bfs(cx, cz, (x, z) => !danger.has(key(x, z)), (x, z) => passSafe(x, z));
        B.mem.why = 'flee' + (path ? path.length : 'X');
        if (path) return A.Bot.follow(P, path);
        // pas de case sûre : on va là où ça explosera le plus tard
        const late = A.Bot.bfs(cx, cz, (x, z) => danger.has(key(x, z)) && danger.get(key(x, z)) > danger.get(key(cx, cz)) + 0.4, (x, z) => free(x, z), 200);
        if (late) return A.Bot.follow(P, late);
      }
      // 1 bis) une bombe vient d'être décidée : on reste au centre de la case le temps que le geste
      // parte (temps de réaction), sinon elle tombe une case plus loin… parfois dans un cul-de-sac
      const hold = B.mem.hold;
      if (hold && A.clock < hold.until && !danger.has(key(cx, cz))) { B.mem.why = 'hold'; return A.Bot.toward(P, hold.x + 0.5, hold.z + 0.5, 0.05); }
      // 1 ter) mort subite : on rentre vers le centre avant que la spirale n'arrive
      if (S.sudden && S.suddenK < S.spiral.length) {
        const ring = depth(S.spiral[S.suddenK][0], S.spiral[S.suddenK][1]);
        if (depth(cx, cz) <= ring + 1) {
          const path = A.Bot.bfs(cx, cz, (x, z) => depth(x, z) >= ring + 2 && !danger.has(key(x, z)), (x, z) => passSafe(x, z), 600);
          if (path && path.length) { B.mem.why = 'inward'; return A.Bot.follow(P, path); }
        }
      }
      // 2) télécommande : un adversaire dans l'explosion d'une de mes bombes
      if (P.data.remote && !danger.has(key(cx, cz))) {
        for (const b of S.bombs) if (b.owner === P && !b.dead) {
          const cells = blast(A, b.cx, b.cz, b.range, b.pierce).cells;
          if (!cells.has(key(cx, cz)) && A.others(P).some((O) => cells.has(key(Math.floor(O.x), Math.floor(O.z))))) return { tapB: true };
        }
      }
      // 3) poser une bombe si ça casse une caisse ou vise quelqu'un, et qu'on peut s'enfuir.
      // En DEUX temps, comme un joueur qui s'arrête avant d'appuyer : d'abord « viser » (s'arrêter au
      // centre de la case), puis appuyer quand tous ses ordres précédents l'ont bien arrêté là (temps
      // de réaction) — sinon la bombe tombe une case plus loin que prévu, parfois dans un cul-de-sac.
      const canBomb = P.data.active < P.data.max && !S.bombs.some((b) => b.cx === cx && b.cz === cz && !b.dead);
      const centered = Math.abs(P.x - (cx + 0.5)) < 0.3 && Math.abs(P.z - (cz + 0.5)) < 0.3;
      const pl = B.mem.plan && B.mem.plan.x === cx && B.mem.plan.z === cz && A.clock < B.mem.plan.until ? B.mem.plan : null;
      const enemyInLine = !pl && A.others(P).some((O) => { const ox = Math.floor(O.x), oz = Math.floor(O.z); return blast(A, cx, cz, P.data.range, P.data.pierce).cells.has(key(ox, oz)) && (Math.random() < L.aggro + 0.2); });
      const crateNear = DIRS.some(([dx, dz]) => G.at(cx + dx, cz + dz) === A.CRATE);
      if (canBomb && (pl || (centered && (enemyInLine || (crateNear && Math.random() < 0.55 + L.skill * 0.4) || (L.chaos && Math.random() < 0.08))))) {
        const dz2 = dangerMap(A, { cx, cz, range: P.data.range, pierce: P.data.pierce, t: FUSE });
        const path = A.Bot.bfs(cx, cz, (x, z) => !dz2.has(key(x, z)), (x, z) => free(x, z) && !(dz2.has(key(x, z)) && dz2.get(key(x, z)) < 0.6));
        const okEscape = path && path.length / spd < FUSE - 0.5 - (1 - L.skill) * 0.4;
        if (okEscape || (pl && pl.risky) || Math.random() < L.mistake * 0.03) {
          if (pl && A.clock >= pl.ready && centered) {
            // c'est le moment : on appuie, et on reste là le temps que le geste parte
            B.mem.why = 'bomb' + (okEscape ? '' : '!'); B.mem.plan = null;
            B.mem.hold = { x: cx, z: cz, until: A.clock + L.react * 1.3 + 0.05 };
            return { tapA: true };
          }
          if (!pl) B.mem.plan = { x: cx, z: cz, ready: A.clock + L.react * 1.3 + 0.05, until: A.clock + L.react * 1.3 + 1.2, risky: !okEscape };
          B.mem.why = 'aim';
          return A.Bot.toward(P, cx + 0.5, cz + 0.5, 0.05);
        }
        B.mem.plan = null;
      }
      // 4) un bonus pas loin
      if (S.items.length) {
        const path = A.Bot.bfs(cx, cz, (x, z) => S.items.some((i) => i.cx === x && i.cz === z && (i.type !== 'rhume' || L.chaos || Math.random() < L.mistake)), (x, z) => passSafe(x, z) && !danger.has(key(x, z)), 500);
        if (path && path.length <= 9) { B.mem.why = 'item'; return A.Bot.follow(P, path); }
      }
      // 5) aller vers un adversaire (agressif) ou vers une caisse à casser
      const T = A.Bot.target(P, L, (O) => !O.ghost);
      const huntE = T && (Math.random() < L.aggro * 0.7 || !hasCrates(A) || A.t > 30);   // après 30 s, on chasse
      let path = null;
      if (huntE) {
        const tx = Math.floor(T.x), tz = Math.floor(T.z);
        path = A.Bot.bfs(cx, cz, (x, z) => (x === tx && Math.abs(z - tz) <= P.data.range) || (z === tz && Math.abs(x - tx) <= P.data.range), (x, z) => passSafe(x, z) && !danger.has(key(x, z)), 1200);
      }
      if (!path) path = A.Bot.bfs(cx, cz, (x, z) => DIRS.some(([dx, dz]) => G.at(x + dx, z + dz) === A.CRATE), (x, z) => passSafe(x, z) && !danger.has(key(x, z)), 1200);
      if (path && path.length) { B.mem.why = huntE ? 'hunt' : 'crate'; return A.Bot.follow(P, path); }
      B.mem.why = 'idle';
      // rien à faire : on se recentre dans sa case
      return A.Bot.toward(P, cx + 0.5, cz + 0.5, 0.1);
    },
  });

  /* ---------- Bombes et explosions ---------- */
  function dropBomb(A, P, cx, cz) {
    const S = A.S, d = P.data;
    if (d.active >= d.max) return;
    if (S.bombs.some((b) => b.cx === cx && b.cz === cz && !b.dead)) return;
    if (A.grid.solid(cx, cz)) return;
    const b = { cx, cz, x: cx + 0.5, z: cz + 0.5, y: 0, owner: P, t: d.remote ? 12 : FUSE, range: d.range, pierce: d.pierce, pass: new Set(), born: A.clock, mesh: bombMesh(A, P.color) };
    // tous ceux qui sont sur la case peuvent en sortir
    for (const O of A.players) if (O.alive && !O.out && Math.abs(O.x - b.x) < 0.5 + O.r && Math.abs(O.z - b.z) < 0.5 + O.r) b.pass.add(O.i);
    if (b.mesh) { b.mesh.position.set(b.x, 0, b.z); A.add(b.mesh); }
    S.bombs.push(b);
    d.active++;
    A.stat(P.i, 'bombs', 1);
    A.tone('triangle', 300, 200, 0.08, 0.12);
  }
  function blast(A, cx, cz, range, pierce) {
    const G = A.grid, cells = new Set([key(cx, cz)]), crates = [];
    for (const [dx, dz] of DIRS) {
      for (let k = 1; k <= range; k++) {
        const x = cx + dx * k, z = cz + dz * k;
        const c = G.at(x, z);
        if (c === A.WALL) break;
        cells.add(key(x, z));
        if (c === A.CRATE) { crates.push([x, z]); if (!pierce) break; }
      }
    }
    return { cells, crates };
  }
  function explode(A, b) {
    const S = A.S;
    if (b.dead) return;
    b.dead = true;
    A.remove(b.mesh);
    if (b.owner && !b.mini) b.owner.data.active = Math.max(0, b.owner.data.active - 1);
    const { cells, crates } = blast(A, b.cx, b.cz, b.range, b.pierce);
    A.wave(b.cx + 0.5, b.cz + 0.5, 0xffa040, 1.2 + b.range * 0.9, 0.5);   // onde de choc de l'explosion
    const f = { cells, t: FLAME_T, owner: b.owner, born: A.clock, meshes: [], org: b.cx + ',' + b.cz };
    for (const c of cells) f.meshes.push(flameMesh(A, c % W, Math.floor(c / W), c === key(b.cx, b.cz)));
    S.flames.push(f);
    for (const [x, z] of crates) breakCrate(A, x, z, b.owner);
    // réaction en chaîne
    for (const o of S.bombs) if (!o.dead && !o.flying && cells.has(key(o.cx, o.cz))) o.t = Math.min(o.t, 0.06);
    A.shake(b.mini ? 0.25 : 0.4);
    A.sfx(b.mini ? 'small' : 'boom');
    A.burst(b.x, 0.5, b.z, 16, [0xff7a1a, 0xffd28a, 0x333333], 7, { up: 3 });
    for (const P of A.players) if (P.alive && !P.out && !P.ghost && cells.has(key(Math.floor(P.x), Math.floor(P.z)))) A.rumble(P, 0.8, 0.5, 200);
  }
  // une caisse cassée (bombe ou pilon) : éclats, et parfois un bonus
  function breakCrate(A, x, z, owner) {
    A.setCell(x, z, A.FLOOR);
    if (owner) A.stat(owner.i, 'crates', 1);
    A.burst(x + 0.5, 0.5, z + 0.5, 10, [0xb0703a, 0x6a3a14, 0xffd28a], 5, { up: 2 });
    if (Math.random() < ITEM_P) spawnItem(A, x, z);
  }
  function spawnItem(A, x, z) {
    let tot = 0; for (const k of ITEM_LIST) tot += ITEMS[k].w;
    let r = Math.random() * tot, type = 'bomb';
    for (const k of ITEM_LIST) { r -= ITEMS[k].w; if (r <= 0) { type = k; break; } }
    const it = { cx: x, cz: z, type, born: A.clock + 0.01, mesh: itemMesh(A, type) };
    if (it.mesh) { it.mesh.position.set(x + 0.5, 0, z + 0.5); A.add(it.mesh); }
    A.S.items.push(it);
  }
  function take(A, P, it) {
    it.dead = true; A.remove(it.mesh);
    const d = P.data, T = ITEMS[it.type];
    A.stat(P.i, 'items', 1);
    switch (it.type) {
      case 'bomb': d.max = Math.min(8, d.max + 1); break;
      case 'fire': d.range = Math.min(9, d.range + 1); break;
      case 'speed': d.spd = Math.min(4, d.spd + 1); break;
      case 'kick': d.kick = true; break;
      case 'remote': d.remote = true; break;
      case 'pierce': d.pierce = true; break;
      case 'rhume': giveRhume(A, P); break;
    }
    if (it.type === 'rhume') { A.sfx('bad'); A.say(P.x, P.z, '🤧 Atchoum !', '#9cff5a', 30); }
    else { A.sfx('power'); A.say(P.x, P.z, T.icon + ' ' + T.name, '#ffd28a', 26); A.voice('item', P); }
    A.rumble(P, 0.2, 0.5, 120);
  }
  function giveRhume(A, P, kind) {
    const S = A.S;
    const k = kind || A.pick(['eternue', 'inverse', 'lent']);
    P.data.rhume = k; P.data.rhumeT = 8;
    if (k === 'inverse') { S.invert = S.invert || A.fill(A.n, 0); S.invert[P.i] = 8; }
    const txt = { eternue: 'tu éternues des bombes !', inverse: 'commandes inversées !', lent: 'tout mou…' }[k];
    if (!A.headless) A.say(P.x, P.z, '🤧 ' + txt, '#9cff5a', 24);
  }
  function hasCrates(A) { const G = A.grid; for (let i = 0; i < G.cells.length; i++) if (G.cells[i] === A.CRATE) return true; return false; }

  /* ---------- Les marteaux-pilons ----------
     attente → choix d'une portion de ligne/colonne → ALERTE (bande rouge qui clignote, ~1,3 s,
     la tête de fer vient planer au-dessus) → IMPACT (écrase, casse, fait sauter) → la tête remonte
     et repart se garer hors du terrain. */
  function hammerStep(A, H, dt) {
    const S = A.S;
    if (H.state === 'wait') {
      H.next -= dt;
      if (H.next <= 0) {
        if (pickTarget(A, H)) {
          H.state = 'warn'; H.t = HAMMER_WARN;
          // « clang-clang » d'alarme (deux notes graves)
          A.tone('square', 196, 196, 0.1, 0.08); A.tone('square', 147, 147, 0.16, 0.08, 0.13);
        } else H.next = 1.5;           // rien à frapper (fin de mort subite) : on réessaie plus tard
      }
    } else if (H.state === 'warn') {
      const t0 = H.t;
      H.t -= dt;
      if (t0 > SWEEP && H.t <= SWEEP) A.sfx('whoosh');      // il charge !
      if (H.t <= 0) { hammerImpact(A, H); H.state = 'hold'; H.t = 0.35; }
    } else if (H.state === 'hold') {
      H.t -= dt;
      if (H.t <= 0) { H.state = 'wait'; H.next = A.rand(6.5, 8.5) * Math.max(0.6, 1 - A.t / 140); H.cells = []; H.set.clear(); }   // de plus en plus souvent
    }
  }
  // choisir où frapper : une portion de couloir (ligne ou colonne impaire, jamais de pilier dedans).
  // Au début, une fois sur deux environ le pilon VISE un joueur (de plus en plus souvent ensuite) ;
  // sinon il préfère les caisses (il ouvre le terrain).
  function pickTarget(A, H) {
    const S = A.S, G = A.grid, row = H.axis === 'row';
    const live = A.players.filter((P) => P.alive && !P.out && !P.ghost);
    const other = S.hammers.find((o) => o !== H && o.state === 'warn');
    const aim = Math.random() < 0.4 + Math.min(0.4, A.t / 120);    // il vise de plus en plus les joueurs
    const nLines = row ? D : W, len = row ? W : D;
    // mort subite : le pilon ne frappe que loin de la spirale (on ne coince pas les joueurs entre les deux)
    const minDepth = S.sudden && S.suddenK < S.spiral.length ? depth(S.spiral[S.suddenK][0], S.spiral[S.suddenK][1]) + 2 : 0;
    let best = null, bs = -1e9;
    for (let line = 1; line < nLines - 1; line += 2) {
      for (let a = 1; a + H.L - 1 <= len - 2; a++) {
        let s = 0, ok = true;
        for (let k = 0; k < H.L && ok; k++) {
          const x = row ? a + k : line, z = row ? line : a + k;
          const c = G.at(x, z);
          if (c === A.WALL || depth(x, z) < minDepth) ok = false;   // mort subite : trop près des nouveaux murs
          else if (c === A.CRATE) s += aim ? 0.15 : 0.5;
          if (other && other.set.has(key(x, z))) s -= 2;  // pas deux pilons au même endroit
        }
        if (!ok) continue;
        if (aim) for (const P of live) {
          const px = Math.floor(P.x), pz = Math.floor(P.z);
          if (row ? pz === line && px >= a && px < a + H.L : px === line && pz >= a && pz < a + H.L) s += 3;
        }
        s += Math.random() * 3;
        if (s > bs) { bs = s; best = [line, a]; }
      }
    }
    if (!best) return false;
    const [line, a] = best;
    H.cells = []; H.set.clear();
    for (let k = 0; k < H.L; k++) { const x = row ? a + k : line, z = row ? line : a + k; H.cells.push([x, z]); H.set.add(key(x, z)); }
    H.tx = row ? a + H.L / 2 : line + 0.5;
    H.tz = row ? line + 0.5 : a + H.L / 2;
    return true;
  }
  function hammerImpact(A, H) {
    const S = A.S, G = A.grid;
    for (const [x, z] of H.cells) {
      if (G.at(x, z) === A.CRATE) breakCrate(A, x, z, null);
      // une bombe sous le pilon saute aussitôt (elle reste à son poseur)
      for (const b of S.bombs) if (!b.dead && !b.flying && b.cx === x && b.cz === z) b.t = Math.min(b.t, 0.05);
      A.burst(x + 0.5, 0.15, z + 0.5, 3, [0x9a8a7a, 0x5a4a3a, 0xffa040], 4, { up: 1.5, flat: true });
    }
    for (const P of A.players) if (P.alive && !P.out && !P.ghost && H.set.has(key(Math.floor(P.x), Math.floor(P.z)))) A.kill(P, 'crush', null);
    A.shake(0.55); A.hype(0.8);
    A.wave(H.tx, H.tz, 0xffb070, H.L * 0.55, 0.45);
    // gros « BOUM » métallique
    A.noise(0.3, 0.5, 500); A.tone('sine', 95, 35, 0.35, 0.45); A.tone('square', 620, 300, 0.08, 0.06);
  }

  // avertir un humain : pilon annoncé sur sa case, bombe qui va sauter sur lui, spirale qui arrive
  function humanWarn(A, P, cx, cz) {
    const S = A.S, k = key(cx, cz);
    for (const H of S.hammers) if (H.state === 'warn' && H.set.has(k)) { A.warn(P, cx + 0.5, cz + 0.5); return; }
    for (const b of S.bombs) {
      if (b.dead || b.flying || b.t > 1) continue;
      const near = (b.cx === cx && Math.abs(b.cz - cz) <= 2) || (b.cz === cz && Math.abs(b.cx - cx) <= 2);
      if ((near || b.t < 0.6) && blast(A, b.cx, b.cz, b.range, b.pierce).cells.has(k)) { A.warn(P, b.x, b.z); return; }
    }
    if (S.sudden) for (let j = 0; j < 8 && S.suddenK + j < S.spiral.length; j++) {
      const c = S.spiral[S.suddenK + j];
      if (c[0] === cx && c[1] === cz) { A.warn(P, cx + 0.5, cz + 0.5); return; }
    }
  }

  // carte du danger : case → temps avant le coup (explosions avec chaînes, pilons annoncés, spirale)
  function dangerMap(A, extra) {
    const S = A.S, m = new Map();
    const set = (c, t) => m.set(c, Math.min(m.has(c) ? m.get(c) : 99, t));
    const list = S.bombs.filter((b) => !b.dead).map((b) => ({ cx: b.cx, cz: b.cz, range: b.range, pierce: b.pierce, t: b.flying ? b.t + 0.2 : b.t }));
    if (extra) list.push(extra);
    // une bombe sous un pilon annoncé sautera au moment de l'impact
    for (const H of S.hammers || []) if (H.state === 'warn') for (const a of list) if (H.set.has(key(a.cx, a.cz))) a.t = Math.min(a.t, H.t);
    // propagation des chaînes
    for (let it = 0; it < 3; it++) for (const a of list) {
      const cells = blast(A, a.cx, a.cz, a.range, a.pierce).cells;
      for (const o of list) if (o !== a && o.t > a.t && cells.has(key(o.cx, o.cz))) o.t = a.t;
    }
    for (const a of list) for (const c of blast(A, a.cx, a.cz, a.range, a.pierce).cells) set(c, a.t);
    for (const f of S.flames) for (const c of f.cells) m.set(c, 0);
    for (const f of S.falling) m.set(key(f.x, f.z), 0.1);
    // les pilons annoncés
    for (const H of S.hammers || []) if (H.state === 'warn') for (const c of H.set) set(c, H.t);
    // mort subite : les prochaines cases de la spirale
    if (S.sudden) for (let k = 0; k < 12 && S.suddenK + k < S.spiral.length; k++) { const [x, z] = S.spiral[S.suddenK + k]; set(key(x, z), 0.15 + k * S.suddenDt); }
    return m;
  }
  function safeCell(A) {
    const S = A.S, G = A.grid, dm = dangerMap(A, null);
    const cands = [];
    for (let z = 1; z < D - 1; z++) for (let x = 1; x < W - 1; x++) {
      if (G.solid(x, z) || dm.has(key(x, z)) || S.bombs.some((b) => b.cx === x && b.cz === z)) continue;
      const near = A.alive().filter((P) => !P.ghost).reduce((m, P) => Math.min(m, Math.hypot(P.x - x - 0.5, P.z - z - 0.5)), 99);
      // mort subite : on revient plutôt vers le centre
      cands.push({ x, z, s: Math.min(near, 5) + Math.random() + (S.sudden ? depth(x, z) * 0.6 : 0) });
    }
    cands.sort((a, b) => b.s - a.s);
    return cands.length ? [cands[0].x, cands[0].z] : null;
  }
  function spiral() {
    const out = []; let x0 = 1, z0 = 1, x1 = W - 2, z1 = D - 2;
    while (x0 <= x1 && z0 <= z1) {
      for (let x = x0; x <= x1; x++) out.push([x, z0]);
      for (let z = z0 + 1; z <= z1; z++) out.push([x1, z]);
      if (z0 < z1) for (let x = x1 - 1; x >= x0; x--) out.push([x, z1]);
      if (x0 < x1) for (let z = z1 - 1; z > z0; z--) out.push([x0, z]);
      x0++; z0++; x1--; z1--;
    }
    return out;
  }
  // un bloc qui tombe (et son ombre au sol) : géométries et matériaux partagés
  function fallMesh(A, x, z) {
    if (A.headless) return { mesh: null, sh: null };
    shared();
    const m = new THREE.Mesh(geo.fall, geo.fallMat);
    m.position.set(x + 0.5, 5.5, z + 0.5); m.castShadow = true;
    const sh = new THREE.Mesh(geo.disc, geo.shadowMat);
    sh.rotation.x = -Math.PI / 2; sh.position.set(x + 0.5, 0.045, z + 0.5);
    A.add(sh); A.add(m);
    return { mesh: m, sh };
  }

  /* ---------- Les fantômes ---------- */
  // point le plus proche sur le couloir des fantômes (un rectangle autour de l'arène)
  function edgePoint(x, z) {
    const m = 0.5;
    const cands = [[x, -m], [x, D + m], [-m, z], [W + m, z]];
    let best = cands[0], bd = 1e9;
    for (const c of cands) { const d = Math.hypot(c[0] - x, c[1] - z); if (d < bd) { bd = d; best = c; } }
    return { x: Math.max(-m, Math.min(W + m, best[0])), z: Math.max(-m, Math.min(D + m, best[1])) };
  }
  function ghostUpdate(A, P, dt) {
    const d = P.data;
    P.noClip = true;
    // reste sur le couloir extérieur
    const m = 0.5;
    P.x = Math.max(-m, Math.min(W + m, P.x)); P.z = Math.max(-m, Math.min(D + m, P.z));
    if (P.x > -m + 0.01 && P.x < W + m - 0.01 && P.z > -m + 0.01 && P.z < D + m - 0.01) {
      const e = edgePoint(P.x, P.z); P.x = e.x; P.z = e.z;
    }
    d.ghostCool = Math.max(0, d.ghostCool - dt);
    if (P.in.aP && d.ghostCool <= 0 && !d.revived) {
      // lance une mini-bombe vers l'intérieur, à 3 cases du bord
      let tx, tz;
      if (P.z <= -m + 0.01) { tx = Math.floor(P.x); tz = 3; }
      else if (P.z >= D + m - 0.01) { tx = Math.floor(P.x); tz = D - 4; }
      else if (P.x <= -m + 0.01) { tx = 3; tz = Math.floor(P.z); }
      else { tx = W - 4; tz = Math.floor(P.z); }
      tx = Math.max(1, Math.min(W - 2, tx)); tz = Math.max(1, Math.min(D - 2, tz));
      // la case visée est un mur ? on prend la voisine libre
      if (A.grid.solid(tx, tz)) { const alt = DIRS.map(([dx, dz]) => [tx + dx, tz + dz]).find(([x, z]) => !A.grid.solid(x, z)); if (!alt) return; [tx, tz] = alt; }
      if (A.S.bombs.some((b) => b.cx === tx && b.cz === tz && !b.dead)) return;
      const b = { cx: tx, cz: tz, x: P.x, z: P.z, sx: P.x, sz: P.z, y: 0, owner: P, t: 1.9, range: 2, pierce: false, pass: new Set(), born: A.clock, mini: true, flying: true, ft: 0, fd: 0.6, mesh: bombMesh(A, P.color, true) };
      if (b.mesh) A.add(b.mesh);
      // tous ceux qui sont sur la case visée peuvent en sortir
      for (const O of A.players) if (O.alive && !O.out && Math.floor(O.x) === tx && Math.floor(O.z) === tz) b.pass.add(O.i);
      A.S.bombs.push(b);
      d.ghostCool = 7;
      A.sfx('whoosh');
    }
  }
  function ghostBot(A, P, B, L) {
    if (P.data.revived || P.data.reviveIn > 0) return {};
    const T = A.Bot.target(P, L, (O) => !O.ghost);
    if (!T) return {};
    // se placer en face de la cible (même colonne ou même ligne) sur le bord le plus proche
    const m = 0.5;
    const opts = [
      { x: T.x, z: -m, ok: Math.abs(Math.floor(T.z) - 3) <= 1 },
      { x: T.x, z: D + m, ok: Math.abs(Math.floor(T.z) - (D - 4)) <= 1 },
      { x: -m, z: T.z, ok: Math.abs(Math.floor(T.x) - 3) <= 1 },
      { x: W + m, z: T.z, ok: Math.abs(Math.floor(T.x) - (W - 4)) <= 1 },
    ];
    const best = opts.filter((o) => o.ok)[0] || opts.reduce((a, b) => (Math.hypot(a.x - P.x, a.z - P.z) < Math.hypot(b.x - P.x, b.z - P.z) ? a : b));
    const mv = A.Bot.toward(P, best.x, best.z, 0.2);
    const there = Math.hypot(best.x - P.x, best.z - P.z) < 0.6;
    return Object.assign(mv, { tapA: there && best.ok && P.data.ghostCool <= 0 });
  }
})();
