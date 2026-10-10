/* =====================================================================
   OSWEL'S TRAP — arena/core.js
   Le MOTEUR des mini-jeux de la Soirée OSWEL, en vue de dessus.
   ---------------------------------------------------------------------
   - une scène 3D à part (le renderer est celui du jeu), caméra fixe
     qui montre toute l'arène, légère inclinaison ;
   - des joueurs (humains ou bots) qui se déplacent sur un plan (x, z),
     avec chocs, poussées, sauts, chutes ;
   - un quadrillage (sol, murs, caisses, trous) partagé par les jeux ;
   - les manches, le compte à rebours, la fin de manche, les résultats ;
   - les bots : ils passent par les MÊMES commandes que les humains
     (joystick + boutons A et B), avec un temps de réaction et des
     erreurs selon leur niveau (Facile, Normal, Difficile, Chaos).
   Chaque mini-jeu est décrit dans arena/games/*.js et s'enregistre
   avec OT.Arena.register({...}).
   Version 1.4 :
   - ENTRAÎNEMENT (phase « tuto ») : avant la 1re manche, 4 secondes pour
     essayer les commandes (def.tuto = les consignes), sans risque (on ne
     peut pas tomber), puis tout le monde revient à sa place et 3, 2, 1, GO ;
   - OBJECTIFS VISIBLES : def.goals(A) → [{ x, z, color, label }] = des
     flèches qui rebondissent au-dessus de ce qu'il faut atteindre ;
   - VOIX : l'annonceur (3, 2, 1, partez !) et de petites réactions des
     personnages (A.voice('ko', P), A.warn(P, x, z) → « À gauche ! »…).
   ===================================================================== */
window.OT = window.OT || {};

OT.Arena = (function () {
  const STEP = 1 / 60;
  // version 1.2.1 : tout le monde va 25 % plus vite (humains ET bots : l'équilibre entre joueurs ne change pas)
  const SPEED_MUL = 1.25;
  const BASE_SPEED = 4.6;                       // vitesse de base (chaque mini-jeu peut la régler, × SPEED_MUL)
  const BASE_GRIP = 24;                         // accroche au sol : démarrage et arrêt quasi immédiats (avant : 16)
  const HERO_SCALE = 1.2;                        // les personnages, bien visibles
  const CHARS = ['oswel', 'meka', 'byte', 'nexa'];
  const GAMES = {};
  const ORDER = [];
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const fill = (n, v) => Array.from({ length: n }, () => (typeof v === 'function' ? v() : v));
  const hexCss = (c) => '#' + (c >>> 0).toString(16).padStart(6, '0');
  // les couleurs sont données « comme à l'écran » (sRGB) : on les convertit pour l'éclairage
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear();

  /* ---------- Les niveaux des bots ---------- */
  const LEVELS = {
    facile:    { id: 'facile', name: 'Facile', react: 0.5, think: 0.2, jitter: 0.45, mistake: 0.22, aggro: 0.3, aim: 0.35, skill: 0.3, coin: 0.5 },
    normal:    { id: 'normal', name: 'Normal', react: 0.3, think: 0.11, jitter: 0.18, mistake: 0.08, aggro: 0.55, aim: 0.16, skill: 0.6, coin: 1 },
    difficile: { id: 'difficile', name: 'Difficile', react: 0.13, think: 0.06, jitter: 0.04, mistake: 0.02, aggro: 0.75, aim: 0.05, skill: 0.92, coin: 1.5 },
    chaos:     { id: 'chaos', name: 'Chaos', react: 0.15, think: 0.07, jitter: 0.3, mistake: 0.12, aggro: 1, aim: 0.12, skill: 0.7, chaos: true, coin: 1.5 },
  };

  /* ---------- Les ambiances (couleurs des arènes) ---------- */
  const THEMES = {
    forge:   { bg: 0x140d0a, floorA: 0x6e5848, floorB: 0x614d3e, line: '#33251a', wall: 0x3f3631, wallTop: 0x5c4f46, crate: 0xd0853a, crateBand: 0x5a2c0c, hemi: [0xffe3c4, 0x3a2418, 0.8], sun: [0xffd8a8, 1.15], accent: 0xff8a2b },
    lab:     { bg: 0x0d1f24, floorA: 0xcfe6e4, floorB: 0xb7d6d3, line: '#7fb1ad', wall: 0x5f8f8c, wallTop: 0x9fd9d6, crate: 0x7aa7c2, crateBand: 0x2f5a73, hemi: [0xe8fbff, 0x1d3b40, 0.85], sun: [0xffffff, 1.0], accent: 0x3cff9a },
    city:    { bg: 0x1a1220, floorA: 0x5d5f66, floorB: 0x52545a, line: '#3a3c42', wall: 0x8a6a5a, wallTop: 0xb08a72, crate: 0xc98a3a, crateBand: 0x7a4f1a, hemi: [0xffe8d0, 0x241a2a, 0.8], sun: [0xffc898, 1.1], accent: 0xffcc33 },
    nexus:   { bg: 0x0a0418, floorA: 0x3b2a5a, floorB: 0x33244f, line: '#7a5ac8', wall: 0x5a3f8a, wallTop: 0xb78cff, crate: 0x8e5bd6, crateBand: 0x3a1f6a, hemi: [0xf0e0ff, 0x1a0a2a, 0.85], sun: [0xe8d8ff, 1.0], accent: 0xff7ad1 },
    machine: { bg: 0x101214, floorA: 0x4a4f55, floorB: 0x42464c, line: '#2a2d31', wall: 0x6a6f76, wallTop: 0x8f959c, crate: 0x8a7a3a, crateBand: 0x4a3f14, hemi: [0xf2f2ff, 0x1a1a20, 0.8], sun: [0xfff0d8, 1.05], accent: 0xffcc33 },
    piege:   { bg: 0x0c1410, floorA: 0x4f6b4a, floorB: 0x46613f, line: '#26361f', wall: 0x5a5448, wallTop: 0x8a8070, crate: 0x8a6a3a, crateBand: 0x4a3414, hemi: [0xeaffdc, 0x14200f, 0.8], sun: [0xfff2d0, 1.1], accent: 0x3cff9a },
    train:   { bg: 0x2a3a1a, floorA: 0x7a4a2a, floorB: 0x6d4124, line: '#3a2414', wall: 0x3a3f46, wallTop: 0x5a6068, crate: 0xa0703a, crateBand: 0x5a3a14, hemi: [0xfff2dc, 0x2a2010, 0.85], sun: [0xfff0d0, 1.15], accent: 0xff5533 },
  };

  /* ---------- État du moteur ---------- */
  let scene = null, camera = null, root = null, world = null, hemi = null, sun = null, fx = null;
  let A = null;                 // la partie en cours (un mini-jeu)
  let active = false, paused = false;
  let acc = 0, time = 0;
  let shakeAmt = 0;
  const camBase = new THREE.Vector3(), camLook = new THREE.Vector3();
  let onDone = null;            // appelé à la fin du mini-jeu avec le résumé
  let stadium = null;           // le stade autour de l'arène (gradins, public, écrans…)
  const waves = [];             // ondes de choc au sol
  const floaters = [];
  const marks = [];             // les flèches d'objectif (def.goals)
  let headless = false;         // tests : pas de rendu

  function setup() {
    if (scene) return;
    OT.Models.mats();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 300);
    hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.8);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
    scene.add(sun); scene.add(sun.target);
    root = new THREE.Group(); scene.add(root);
    world = new THREE.Group(); scene.add(world);
    fx = makeParticles(500);
    scene.add(fx.mesh);
  }

  /* ---------- Particules : un seul InstancedMesh ---------- */
  function makeParticles(n) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), n);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    mesh.frustumCulled = false;
    const list = []; const dummy = new THREE.Object3D(); const col = new THREE.Color();
    for (let i = 0; i < n; i++) { list.push({ t: 0, life: 0 }); dummy.scale.setScalar(0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }
    let k = 0;
    return {
      mesh,
      burst(x, y, z, count, colors, speed, o = {}) {
        if (headless) return;
        colors = [].concat(colors);
        for (let c = 0; c < count; c++) {
          const p = list[k]; const idx = k; k = (k + 1) % n;
          const a = Math.random() * TAU, el = Math.random() * (o.flat ? 0.3 : 1.2);
          const v = speed * (0.4 + Math.random() * 0.8);
          p.x = x; p.y = y; p.z = z;
          p.vx = Math.cos(a) * Math.cos(el) * v; p.vz = Math.sin(a) * Math.cos(el) * v; p.vy = Math.sin(el) * v + (o.up || 0);
          p.t = 0; p.life = (o.life || 0.6) * (0.6 + Math.random() * 0.6); p.g = o.grav !== undefined ? o.grav : 14; p.s = (o.size || 1) * (0.6 + Math.random() * 0.8);
          col.set(colors[c % colors.length]); mesh.setColorAt(idx, col);
        }
        mesh.instanceColor.needsUpdate = true;
      },
      update(dt) {
        for (let i = 0; i < n; i++) {
          const p = list[i];
          if (p.t >= p.life) continue;
          p.t += dt;
          p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
          const k2 = p.t >= p.life ? 0 : (1 - p.t / p.life) * p.s;
          dummy.position.set(p.x, p.y, p.z); dummy.scale.setScalar(k2); dummy.rotation.set(p.t * 6, p.t * 4, 0); dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      },
      clear() { for (const p of list) p.t = p.life = 0; this.update(0); },
    };
  }

  /* ---------- Textures du sol ---------- */
  const texCache = {};
  function floorTex(theme) {
    if (texCache[theme]) return texCache[theme];
    const T = THEMES[theme];
    const t = OT.Models.canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      g.strokeStyle = T.line; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
      g.globalAlpha = 0.18; g.fillStyle = T.line;
      for (let i = 0; i < 6; i++) g.fillRect((i * 17) % 54 + 4, (i * 29) % 50 + 6, 5, 2);
      g.globalAlpha = 1;
    });
    return (texCache[theme] = t);
  }

  /* ==================================================================
     LE QUADRILLAGE : 0 sol · 1 mur · 2 caisse · 3 vide (trou)
     Les jeux peuvent ajouter leurs propres codes (≥ 10) : ils sont
     traités comme du sol par défaut, solides si grid.solidCodes les liste.
     ================================================================== */
  const FLOOR = 0, WALL = 1, CRATE = 2, VOID = 3;
  function makeGrid(w, d, fn, theme, opts = {}) {
    const T = THEMES[theme] || THEMES.forge;
    const G = { w, d, cells: new Uint8Array(w * d), theme, floorIdx: new Int32Array(w * d).fill(-1), crates: {}, solidCodes: new Set([WALL, CRATE].concat(opts.solid || [])), wallH: opts.wallH || 0.9 };
    for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) G.cells[z * w + x] = fn(x, z);
    G.at = (x, z) => (x < 0 || z < 0 || x >= w || z >= d ? (opts.outside !== undefined ? opts.outside : WALL) : G.cells[z * w + x]);
    G.solid = (x, z) => G.solidCodes.has(G.at(x, z));
    G.inside = (x, z) => x >= 0 && z >= 0 && x < w && z < d;
    if (!headless) {
      // sol : une instance par case (cachée pour les trous)
      const nFloor = w * d;
      const fm = new THREE.MeshStandardMaterial({ map: floorTex(theme), roughness: 0.85, metalness: 0.05 });
      const floor = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.2, 1), fm, nFloor);
      floor.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(nFloor * 3), 3);
      floor.receiveShadow = true;
      const dm = new THREE.Object3D(), c = new THREE.Color();
      let k = 0;
      for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) {
        G.floorIdx[z * w + x] = k;
        dm.position.set(x + 0.5, -0.1, z + 0.5); dm.scale.setScalar(1); dm.updateMatrix();
        floor.setMatrixAt(k, dm.matrix);
        c.set((x + z) % 2 ? T.floorA : T.floorB).convertSRGBToLinear(); floor.setColorAt(k, c);
        k++;
      }
      G.floorMesh = floor; world.add(floor);
      // murs : une instance par mur
      const walls = [];
      for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) if (G.cells[z * w + x] === WALL) walls.push([x, z]);
      const wm = [new THREE.MeshStandardMaterial({ color: lin(T.wall), roughness: 0.7, metalness: 0.2 }), new THREE.MeshStandardMaterial({ color: lin(T.wallTop), roughness: 0.6, metalness: 0.2 })];
      const wg = new THREE.BoxGeometry(1, G.wallH, 1);
      // faces : +x -x +y -y +z -z → le dessus (+y) d'une autre couleur
      wg.clearGroups(); wg.addGroup(0, 12, 0); wg.addGroup(12, 6, 1); wg.addGroup(18, 18, 0);
      const wall = new THREE.InstancedMesh(wg, wm, Math.max(1, walls.length));
      walls.forEach(([x, z], i) => { dm.position.set(x + 0.5, G.wallH / 2, z + 0.5); dm.updateMatrix(); wall.setMatrixAt(i, dm.matrix); });
      wall.count = walls.length;
      wall.castShadow = true; wall.receiveShadow = true;
      G.wallMesh = wall; world.add(wall);
      G.dummy = dm;
      for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) {
        const v = G.cells[z * w + x];
        if (v === CRATE) addCrate(G, x, z);
        if (v === VOID) hideFloor(G, x, z, true);
      }
    }
    return G;
  }
  function hideFloor(G, x, z, hide) {
    if (headless || !G.floorMesh) return;
    const k = G.floorIdx[z * G.w + x]; if (k < 0) return;
    G.dummy.position.set(x + 0.5, -0.1, z + 0.5); G.dummy.scale.setScalar(hide ? 0 : 1); G.dummy.updateMatrix();
    G.floorMesh.setMatrixAt(k, G.dummy.matrix); G.floorMesh.instanceMatrix.needsUpdate = true;
  }
  const crateGeo = () => crateGeo.g || (crateGeo.g = new THREE.BoxGeometry(0.86, 0.78, 0.86));
  function addCrate(G, x, z) {
    if (headless) return;
    const T = THEMES[G.theme] || THEMES.forge;
    const g = new THREE.Group();
    const m = new THREE.Mesh(crateGeo(), G.crateMat || (G.crateMat = new THREE.MeshStandardMaterial({ color: lin(T.crate), roughness: 0.75 })));
    m.position.y = 0.39; m.castShadow = true; m.receiveShadow = true;
    const band = new THREE.Mesh(G.bandGeo || (G.bandGeo = new THREE.BoxGeometry(0.9, 0.12, 0.9)), G.bandMat || (G.bandMat = new THREE.MeshStandardMaterial({ color: lin(T.crateBand), roughness: 0.6 })));
    band.position.y = 0.55;
    const band2 = band.clone(); band2.position.y = 0.2;
    g.add(m, band, band2);
    g.position.set(x + 0.5, 0, z + 0.5);
    world.add(g);
    G.crates[z * G.w + x] = g;
  }
  function setCell(G, x, z, v) {
    if (!G.inside(x, z)) return;
    const i = z * G.w + x, old = G.cells[i];
    if (old === v) return;
    G.cells[i] = v;
    if (old === CRATE && G.crates[i]) { world.remove(G.crates[i]); delete G.crates[i]; }
    if (v === CRATE) addCrate(G, x, z);
    if (old === VOID) hideFloor(G, x, z, false);
    if (v === VOID) hideFloor(G, x, z, true);
    if (v === WALL && !headless) {
      // nouveau mur (mort subite…) : un bloc à part
      const T = THEMES[G.theme] || THEMES.forge;
      // une seule géométrie et un seul matériau pour tous les nouveaux murs de l'arène (1.4 : mort subite = des centaines de blocs)
      if (!G.xwGeo) { G.xwGeo = new THREE.BoxGeometry(1, G.wallH, 1); G.xwMat = new THREE.MeshStandardMaterial({ color: lin(T.wallTop), roughness: 0.7, metalness: 0.2 }); }
      const b = new THREE.Mesh(G.xwGeo, G.xwMat);
      b.position.set(x + 0.5, G.wallH / 2, z + 0.5); b.castShadow = true;
      world.add(b);
      (G.extraWalls = G.extraWalls || {})[i] = b;
    } else if (old === WALL && G.extraWalls && G.extraWalls[i]) { world.remove(G.extraWalls[i]); delete G.extraWalls[i]; }
  }

  /* ==================================================================
     LES JOUEURS
     ================================================================== */
  function makePlayer(spec, i) {
    const P = {
      i, name: spec.name, color: spec.color, css: hexCss(spec.color), skin: spec.skin || { color: spec.color, acc: 'aucun', gad: 'aucun' },
      human: !!spec.human, dev: spec.dev || null, level: LEVELS[spec.level] || LEVELS.normal, profileId: spec.profileId || null,
      x: 0, z: 0, vx: 0, vz: 0, kx: 0, kz: 0, r: 0.32, face: 0, h: 0, vh: 0,
      speed: BASE_SPEED, alive: true, out: false, stun: 0, inv: 0, falling: 0, slow: 1,
      in: { mx: 0, mz: 0, a: false, b: false, aP: false, bP: false, aR: false, bR: false }, pa: false, pb: false,
      walk: 0, data: {}, bot: null,
      char: spec.char || (spec.skin && spec.skin.char) || CHARS[i % CHARS.length],
    };
    if (!P.human) P.bot = { q: [], next: 0, mem: {}, cur: { mx: 0, mz: 0, a: false, b: false }, jit: 0, jitT: 0, path: null };
    if (!headless) {
      const g = new THREE.Group();
      const hero = OT.Models.hero(Object.assign({}, P.skin, { color: P.color, char: spec.char || (spec.skin && spec.skin.char) || CHARS[i % CHARS.length] }), { marker: false });
      hero.scale.setScalar(HERO_SCALE);
      P.anim = OT.Anim ? OT.Anim.create(hero) : null;
      P.topY = (hero.userData.height || 1.25) * HERO_SCALE;
      g.add(hero);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.47, 28), new THREE.MeshBasicMaterial({ color: P.color, toneMapped: false, transparent: true, opacity: 0.95, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.025;
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.36, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02;
      const tag = OT.Models.label(P.name.length > 12 ? P.name.slice(0, 11) + '…' : P.name, { size: 28, h: 0.42, color: P.css, border: P.css, key: 'P' + (i + 1), keyBg: P.css });   // P1 à P4 au-dessus de chacun
      tag.position.y = P.topY + 0.35;
      P.mesh = g; P.hero = hero; P.ring = ring; P.shadow = shadow; P.tag = tag;
      root.add(g); root.add(ring); root.add(shadow); root.add(tag);
      if (P.skin.gad && hero.userData.gadTick) P.gadTick = hero.userData.gadTick;
    }
    return P;
  }
  function removePlayers() {
    if (!A || headless) return;
    for (const P of A.players) { [P.mesh, P.ring, P.shadow, P.tag, P.icon, P.sheet].forEach((o) => o && root.remove(o)); }
  }

  /* ---------- Déplacements et collisions ---------- */
  // le joueur est un carré de demi-côté r pour les murs (glisse bien dans les couloirs)
  function hitsWall(G, x, z, r, P) {
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r - 1e-6), z0 = Math.floor(z - r), z1 = Math.floor(z + r - 1e-6);
    const tuto = A.phase === 'tuto';
    for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) {
      if (G.solid(xx, zz)) return true;
      if (tuto && G.at(xx, zz) === VOID) return true;       // entraînement : impossible de tomber
      if (A.def.blocks && A.def.blocks(A, xx, zz, P)) return true;
    }
    return false;
  }
  function moveP(P, dx, dz) {
    const G = A.grid;
    if (!G || P.ghost || P.noClip) { P.x += dx; P.z += dz; return { bx: false, bz: false }; }
    const r = P.r * 0.92;
    let bx = false, bz = false;
    if (dx) { if (!hitsWall(G, P.x + dx, P.z, r, P)) P.x += dx; else bx = true; }
    if (dz) { if (!hitsWall(G, P.x, P.z + dz, r, P)) P.z += dz; else bz = true; }
    // aide dans les couloirs : bloqué contre un coin, on glisse vers le centre du passage
    if (bx && Math.abs(dz) < Math.abs(dx) * 0.8) {
      const cz = Math.floor(P.z) + 0.5, off = P.z - cz;
      if (Math.abs(off) > 0.02 && Math.abs(off) < 0.45 && !hitsWall(G, P.x + Math.sign(dx) * 0.05, cz, r, P)) P.z -= Math.sign(off) * Math.min(Math.abs(off), Math.abs(dx) * 1.1);
    }
    if (bz && Math.abs(dx) < Math.abs(dz) * 0.8) {
      const cx = Math.floor(P.x) + 0.5, off = P.x - cx;
      if (Math.abs(off) > 0.02 && Math.abs(off) < 0.45 && !hitsWall(G, cx, P.z + Math.sign(dz) * 0.05, r, P)) P.x -= Math.sign(off) * Math.min(Math.abs(off), Math.abs(dz) * 1.1);
    }
    return { bx, bz };
  }

  /* ==================================================================
     LES BOTS : même commandes que les humains, avec réaction et erreurs
     ================================================================== */
  function botInput(P, dt) {
    const B = P.bot, L = P.level;
    B.next -= dt;
    if (B.next <= 0) {
      B.next = L.think * (0.7 + Math.random() * 0.6);
      let want = { mx: 0, mz: 0, a: false, b: false };
      try { want = Object.assign(want, A.def.bot ? A.def.bot(A, P, B, L) || {} : {}); } catch (e) { if (!A.botErr) { A.botErr = true; console.error('bot', e); } }
      // erreurs : hésitation (Facile), coups de folie (Chaos)
      if (Math.random() < L.mistake * 0.04) want = { mx: Math.random() * 2 - 1, mz: Math.random() * 2 - 1, a: L.chaos && Math.random() < 0.3, b: false };
      B.q.push({ t: A.clock + L.react * (0.75 + Math.random() * 0.5), w: want });
    }
    while (B.q.length && B.q[0].t <= A.clock) {
      const w = B.q.shift().w;
      B.cur = w;
      if (w.tapA) B.tapA = true;
      if (w.tapB) B.tapB = true;
    }
    // trajectoire un peu tremblante selon le niveau
    B.jitT -= dt;
    if (B.jitT <= 0) { B.jitT = 0.3 + Math.random() * 0.5; B.jit = (Math.random() * 2 - 1) * L.jitter; }
    let { mx, mz } = B.cur;
    // la DÉCISION arrive avec un temps de réaction, mais le pilotage vers la cible
    // se fait en continu (comme un humain qui regarde où il va)
    const C = B.cur;
    if (C.path && C.path.length) {
      let [x, z] = C.path[0];
      if (C.path.length > 1 && Math.abs(P.x - (x + 0.5)) < 0.22 && Math.abs(P.z - (z + 0.5)) < 0.22) { C.path.shift(); [x, z] = C.path[0]; }
      const dx = x + 0.5 - P.x, dz = z + 0.5 - P.z, d = Math.hypot(dx, dz);
      const k = C.path.length > 1 ? 1 : Math.min(1, d / 0.35);
      mx = d > 0.04 ? (dx / d) * k : 0; mz = d > 0.04 ? (dz / d) * k : 0;
    } else if (C.go) {
      // C.from : piloter autre chose que le personnage (ex. : un curseur), même principe
      const o = C.from ? C.from(P) : P;
      const dx = C.go[0] - o.x, dz = C.go[1] - o.z, d = Math.hypot(dx, dz);
      const k = Math.min(1, d / (C.slow || 0.4));
      mx = d > (C.stop || 0.04) ? (dx / d) * k : 0; mz = d > (C.stop || 0.04) ? (dz / d) * k : 0;
    }
    // contre le vent / un tapis : on pousse le joystick un peu à contre-courant (comme un humain)
    if (A.def.botCompensate && A.def.drift && (C.path || C.go) && (mx || mz) && P.alive) {
      const e = A.def.drift(A, P);
      if (e) {
        const sp = Math.max(0.5, P.speed * SPEED_MUL * P.slow * (A.def.speedMod ? A.def.speedMod(A, P) : 1));
        mx -= e.x / sp; mz -= e.z / sp;
        const n = Math.hypot(mx, mz); if (n > 1) { mx /= n; mz /= n; }
      }
    }
    // garde-fou du jeu (ex. : ne pas marcher dans le vide), vérifié à chaque pas
    if (A.def.botGuard && (mx || mz)) { const g = A.def.botGuard(A, P, mx, mz, L, C); mx = g[0]; mz = g[1]; }
    const m = Math.hypot(mx, mz);
    if (m > 0.01) {
      const j = C.path || C.go ? B.jit * 0.5 : B.jit;
      const c = Math.cos(j), s = Math.sin(j);
      const nx = mx * c - mz * s, nz = mx * s + mz * c;
      const k = Math.min(1, m) / m;
      mx = nx * k; mz = nz * k;
    }
    const out = { mx, mz, a: !!B.cur.a || !!B.tapA, b: !!B.cur.b || !!B.tapB };
    B.tapA = false; B.tapB = false;
    return out;
  }

  // Outils pour les bots
  const Bot = {
    // direction vers un point (normalisée)
    // aller vers un point (le moteur pilote en continu, en ralentissant à l'arrivée)
    toward(P, x, z, stop = 0.06) { return { go: [x, z], stop }; },
    // direction brute (fuite, poursuite…)
    dir(P, x, z) { const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz) || 1; return { mx: dx / d, mz: dz / d }; },
    away(P, x, z) { const dx = P.x - x, dz = P.z - z, d = Math.hypot(dx, dz) || 1; return { mx: dx / d, mz: dz / d }; },
    // plus court chemin sur le quadrillage (BFS) ; pass(x,z) = case praticable ; goal(x,z) = vrai sur une case but
    // renvoie la liste des cases depuis la case suivante jusqu'au but, ou null
    bfs(sx, sz, goal, pass, maxN = 2500) {
      const G = A.grid; if (!G) return null;
      const W = G.w, start = sz * W + sx;
      const prev = new Int32Array(W * G.d).fill(-2);
      prev[start] = -1;
      const q = [start]; let qi = 0, found = -1;
      while (qi < q.length && qi < maxN) {
        const c = q[qi++], x = c % W, z = (c / W) | 0;
        if (c !== start && goal(x, z)) { found = c; break; }
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, nz = z + dz;
          if (nx < 0 || nz < 0 || nx >= W || nz >= G.d) continue;
          const ni = nz * W + nx;
          if (prev[ni] !== -2) continue;
          if (!pass(nx, nz)) continue;
          prev[ni] = c; q.push(ni);
        }
      }
      if (found < 0) return goal(sx, sz) ? [] : null;
      const path = [];
      for (let c = found; c !== start && c >= 0; c = prev[c]) path.unshift([c % W, (c / W) | 0]);
      return path;
    },
    // plus court chemin pondéré (Dijkstra) : cost(x,z) = coût d'entrée dans la case (Infinity = interdit)
    dijkstra(sx, sz, goal, cost, maxN = 4000) {
      const G = A.grid; if (!G) return null;
      const W = G.w, N = W * G.d, start = sz * W + sx;
      const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
      dist[start] = 0;
      const heap = [[0, start]];
      const push = (it) => { heap.push(it); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
      let found = -1, n = 0;
      while (heap.length && n++ < maxN) {
        const [d0, c] = pop();
        if (done[c]) continue; done[c] = 1;
        const x = c % W, z = (c / W) | 0;
        if (c !== start && goal(x, z)) { found = c; break; }
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, nz = z + dz;
          if (nx < 0 || nz < 0 || nx >= W || nz >= G.d) continue;
          const ni = nz * W + nx;
          if (done[ni]) continue;
          const k = cost(nx, nz);
          if (!(k < Infinity)) continue;
          const nd = d0 + k;
          if (nd < dist[ni]) { dist[ni] = nd; prev[ni] = c; push([nd, ni]); }
        }
      }
      if (found < 0) return null;
      const path = [];
      for (let c = found; c !== start && c >= 0; c = prev[c]) path.unshift([c % W, (c / W) | 0]);
      return path;
    },
    // suivre un chemin de cases (le moteur passe d'un centre de case au suivant)
    follow(P, path) {
      if (!path || !path.length) return { mx: 0, mz: 0 };
      return { path: path.map((c) => [c[0], c[1]]) };
    },
    cell(P) { return [Math.floor(P.x), Math.floor(P.z)]; },
    nearest(P, list, f) {
      let best = null, bd = 1e9;
      for (const o of list) { const d = Math.hypot(o.x - P.x, o.z - P.z) * (f ? f(o) : 1); if (d < bd) { bd = d; best = o; } }
      return best ? { o: best, d: bd } : null;
    },
    // un adversaire à viser : les bots Chaos et agressifs préfèrent les humains
    target(P, L, filter) {
      const list = A.players.filter((o) => o !== P && o.alive && !o.out && (!filter || filter(o)));
      if (!list.length) return null;
      return Bot.nearest(P, list, (o) => (o.human && L.aggro > 0.6 ? 0.75 : 1) * (0.85 + Math.random() * 0.3)).o;
    },
  };

  /* ==================================================================
     L'API donnée aux mini-jeux
     ================================================================== */
  const api = {
    THEMES, FLOOR, WALL, CRATE, VOID, Bot, clamp, lerp, fill, lin,
    get scene() { return world; },
    get root() { return root; },
    get camera() { return camera; },
    get headless() { return headless; },
    rand: (a = 0, b = 1) => a + Math.random() * (b - a),
    rint: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
    pick: (list) => list[Math.floor(Math.random() * list.length)],
    shuffle(list) { const l = list.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; },
    buildGrid(w, d, fn, theme, opts) { A.grid = makeGrid(w, d, fn, theme || A.def.theme, opts); return A.grid; },
    setCell(x, z, v) { setCell(A.grid, x, z, v); },
    cellAt(x, z) { return A.grid ? A.grid.at(Math.floor(x), Math.floor(z)) : FLOOR; },
    add(o) { if (!headless && o) world.add(o); return o; },
    remove(o) { if (!headless && o && o.parent) o.parent.remove(o); },
    place(P, x, z) { P.x = x; P.z = z; P.vx = P.vz = P.kx = P.kz = 0; P.h = 0; P.vh = 0; P.falling = 0; },
    alive() { return A.players.filter((p) => p.alive && !p.out); },
    others(P) { return A.players.filter((p) => p !== P && p.alive && !p.out); },
    dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); },
    // pousser un joueur : direction (dx, dz), puissance en cases/s, étourdi pendant stun s
    knock(P, dx, dz, power, stun = 0, by = null) {
      if (!P.alive || P.out) return false;
      if (P.inv > 0 && !A.def.knockThroughInv) return false;
      if (P.data.anchorT > 0) power *= 0.15;
      const d = Math.hypot(dx, dz) || 1;
      P.kx += (dx / d) * power; P.kz += (dz / d) * power;
      P.stun = Math.max(P.stun, stun);
      if (by) P.lastHit = { by, t: A.clock };
      if (P.anim && power > 3) P.anim.play('hit');
      api.rumble(P, 0.45, 0.2, 140);
      if (power > 6 && by && by !== P) voiceOf('hit', P, { p: 0.35 });
      return true;
    },
    // élimination (ou perte de vie) : le jeu décide de la suite dans onKill
    kill(P, cause, by) {
      if (!P.alive || P.out) return false;
      if (P.inv > 0 && cause !== 'force') return false;
      P.alive = false; P.deadT = 0;
      if (P.anim) { P.anim.play('death'); P.dyingT = 0.55; }
      if (by === undefined && P.lastHit && A.clock - P.lastHit.t < 2.5) by = P.lastHit.by;
      if (by && by !== P) api.stat(by.i, 'kills', 1);
      api.stat(P.i, 'deaths', 1);
      if (by && by !== P) voiceOf('ko', by); else voiceOf('out', P, { p: 0.7 });
      api.rumble(P, 0.9, 0.6, 320);
      if (OT.Light && P.dev && P.dev.startsWith('pad:')) { /* lumière : géré par Light.flash sur l'index du joueur */ }
      api.burst(P.x, 0.6, P.z, 22, [P.color, 0xffffff, 0x222222], 6, { up: 3 });
      api.sfx('die');
      if (A.def.onKill) A.def.onKill(A, P, cause, by || null); else P.out = true;
      if (!headless && P.mesh) P.mesh.visible = !P.out && P.alive;
      return true;
    },
    revive(P, x, z, inv = 1.5) {
      P.alive = true; P.out = false; P.ghost = false; P.stun = 0; P.inv = inv; P.falling = 0;
      api.place(P, x, z);
      if (!headless && P.mesh) { P.mesh.visible = true; P.hero.scale.setScalar(HERO_SCALE); }
      P.dyingT = 0;
    },
    stat(i, k, v = 1) { const s = A.stats[i]; s[k] = (s[k] || 0) + v; },
    point(i, v) { A.score[i] += v; },
    // texte qui monte au-dessus de l'arène
    say(x, z, text, color = '#ffffff', size = 34) {
      if (headless) return;
      const m = OT.Models.label(text, { size, h: size / 80, color, border: color });
      m.position.set(x, 1.9, z);
      root.add(m);
      floaters.push({ m, t: 0, life: 1.4 });
      if (floaters.length > 24) { const f = floaters.shift(); root.remove(f.m); }
    },
    burst(x, y, z, n, colors, speed, o) { if (fx) fx.burst(x, y, z, n, colors, speed, o); },
    shake(a) { shakeAmt = Math.max(shakeAmt, a); if (stadium) stadium.hype(Math.min(1.2, a)); },
    // le public s'enflamme (0 à 1,4)
    hype(v) { if (stadium) stadium.hype(v); },
    // onde de choc au sol (explosion, chute, gros coup)
    wave(x, z, color, size = 2, life = 0.5) {
      if (headless) return;
      let r = waves.find((o) => !o.on);
      if (!r) {
        if (waves.length >= 16) r = waves[0];
        else {
          const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
          m.rotation.x = -Math.PI / 2; root.add(m); r = { m }; waves.push(r);
        }
      }
      Object.assign(r, { on: true, t: 0, life, size });
      r.m.material.color.set(color); r.m.position.set(x, 0.08, z); r.m.visible = true; r.m.scale.setScalar(0.01);
    },
    // baisser / rétablir la lumière de l'arène (k = 1 : normal)
    dim(k) {
      if (headless || !A) return;
      const T = THEMES[A.def.theme] || THEMES.forge;
      hemi.intensity = T.hemi[2] * k; sun.intensity = T.sun[1] * k;
    },
    banner(text, sub, color, dur = 2) { if (OT.ArenaUI) OT.ArenaUI.banner(text, sub, color, dur); },
    // ---- les voix (1.4) ----
    // petite réaction du personnage d'un joueur : A.voice('ko', P) → réplique « mg_ko » (voir repliques.js)
    voice(kind, P, o = {}) { return voiceOf(kind, P, o); },
    // « À gauche ! », « Derrière ! »… : où est le danger, vu depuis la caméra (seulement pour les humains)
    warn(P, x, z, o = {}) { return warnOf(P, x, z, o); },
    // l'annonceur du stade : A.announce('go')
    announce(id, o) { return announce(id, o); },
    rumble(P, s, w, ms) { if (P && P.human && P.dev) OT.Input.rumbleDev(P.dev, s, w, ms); },
    sfx(name, x) { if (!headless) SFX[name] && SFX[name](x); },
    tone: (...a) => !headless && OT.Sound.tone && OT.Sound.tone(...a),
    noise: (...a) => !headless && OT.Sound.noise && OT.Sound.noise(...a),
    // fin de manche : points = { i: pts } (ajoutés au score), text = phrase affichée
    endRound(res = {}) {
      if (A.phase !== 'play') return;
      A.phase = 'roundEnd'; A.endT = 0; A.roundRes = res;
      if (res.points) for (const i in res.points) A.score[i] += res.points[i];
      if (!headless) stageRoundEnd(res);
      api.banner(res.text || 'Fin de la manche', res.sub || '', res.color || '#ffd28a', 2.4);
      if (stadium) stadium.hype(1.3);
      api.sfx('round');
    },
    // petite icône 3D au-dessus d'un joueur (bombe, couronne…)
    icon(P, obj) {
      if (headless) return;
      if (P.icon) root.remove(P.icon);
      P.icon = obj || null;
      if (obj) root.add(obj);
    },
    // un objet simple : cylindre, boule, boîte
    mesh(kind, size, color, o = {}) {
      if (headless) return null;
      let geo;
      if (kind === 'ball') geo = new THREE.SphereGeometry(size, 16, 12);
      else if (kind === 'cyl') geo = new THREE.CylinderGeometry(size, size, o.h || 0.2, 20);
      else if (kind === 'box') geo = new THREE.BoxGeometry(size, o.h || size, o.d || size);
      else if (kind === 'ring') { geo = new THREE.RingGeometry(size * 0.8, size, 32); }
      else if (kind === 'disc') geo = new THREE.CircleGeometry(size, 28);
      const col = o.raw ? color : lin(color);
      const mat = o.basic ? new THREE.MeshBasicMaterial({ color: col, transparent: !!o.opacity, opacity: o.opacity || 1, toneMapped: false, side: THREE.DoubleSide, depthWrite: o.opacity ? false : true })
        : new THREE.MeshStandardMaterial({ color: col, roughness: o.rough !== undefined ? o.rough : 0.5, metalness: o.metal || 0.1, emissive: o.emissive ? lin(o.emissive) : 0x000000, emissiveIntensity: o.ei || 1, transparent: !!o.opacity, opacity: o.opacity || 1 });
      const m = new THREE.Mesh(geo, mat);
      if (kind === 'ring' || kind === 'disc') m.rotation.x = -Math.PI / 2;
      m.castShadow = !o.noShadow && !o.basic;
      return m;
    },
    label(text, o) { return headless ? null : OT.Models.label(text, o); },
    // les joueurs se bloquent entre eux (repoussés doucement)
    separate(list, push = 1) {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.h > 0.5 || b.h > 0.5) continue;
        const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = a.r + b.r;
        if (d > 0 && d < m) {
          const k = ((m - d) / d) * 0.5 * push;
          moveP(a, -dx * k, -dz * k); moveP(b, dx * k, dz * k);
        }
      }
    },
    moveP: (P, dx, dz) => moveP(P, dx, dz),
    hitsWall: (x, z, r) => (A.grid ? hitsWall(A.grid, x, z, r) : false),
  };

  /* ---------- Les voix des mini-jeux (1.4) ----------
     Courtes, jamais en rafale (OT.Dialogue.bark gère délais et variantes), plus rares pour les
     bots. Le texte s'affiche dans une bulle au-dessus du joueur (si les sous-titres sont actifs),
     pas en bas de l'écran : à 4 joueurs, on voit tout de suite QUI parle. */
  const subsOn = () => !OT.settings || OT.settings.subtitles !== false;
  function voiceOf(kind, P, o = {}) {
    if (headless || !P || !A || !OT.Dialogue) return null;
    const D = OT.Dialogue, B = D.BARKS['mg_' + kind];
    if (!B) return null;
    const p = (o.p !== undefined ? o.p : 1) * B.p * (P.human ? 1 : 0.45);
    const c = D.bark('mg_' + kind, P.char || 'oswel', { p, subtitle: false, priority: o.priority || B.prio || 1, force: o.force, rate: 1.06 });
    if (c && c.ln && subsOn() && P.mesh) api.say(P.x, P.z, '💬 ' + c.ln.text, P.css, 24);
    return c;
  }
  function warnOf(P, x, z, o = {}) {
    if (headless || !A || !P || !P.human || !P.alive || P.out) return null;
    A.warnT = A.warnT || {};
    if (A.clock - (A.warnT[P.i] === undefined ? -99 : A.warnT[P.i]) < (o.cd || 3.5)) return null;
    const yaw = CV.yaw || 0, dx = x - P.x, dz = z - P.z;
    const r = dx * Math.cos(yaw) - dz * Math.sin(yaw), f = -dx * Math.sin(yaw) - dz * Math.cos(yaw);
    const kind = Math.hypot(dx, dz) < 0.7 ? 'warn' : Math.abs(r) > Math.abs(f) * 1.2 ? (r > 0 ? 'right' : 'left') : (f > 0 ? 'front' : 'back');
    const c = voiceOf(kind, P, { p: 1, priority: 1 });
    if (c) A.warnT[P.i] = A.clock;
    return c;
  }
  function announce(id, o = {}) {
    if (headless || !OT.Dialogue || !OT.Dialogue.LINES['mg_' + id]) return null;
    return OT.Dialogue.playDialogue('mg_' + id, Object.assign({ priority: 2, subtitle: false }, o));
  }

  /* ---------- Sons communs ---------- */
  const SFX = {
    die: () => { OT.Sound.noise(0.35, 0.4, 900); OT.Sound.tone('sawtooth', 320, 50, 0.4, 0.16); },
    round: () => [523, 659, 784].forEach((f, i) => OT.Sound.tone('triangle', f, f, 0.18, 0.15, i * 0.09)),
    hit: () => { OT.Sound.tone('square', 220, 90, 0.14, 0.2); OT.Sound.noise(0.1, 0.25, 2200); },
    push: () => { OT.Sound.noise(0.12, 0.25, 900); OT.Sound.tone('triangle', 260, 140, 0.12, 0.15); },
    pick: () => { OT.Sound.tone('square', 988, 988, 0.05, 0.07); OT.Sound.tone('square', 1319, 1319, 0.09, 0.07, 0.05); },
    power: () => [660, 880, 1320].forEach((f, i) => OT.Sound.tone('triangle', f, f, 0.1, 0.14, i * 0.05)),
    boom: () => { OT.Sound.noise(0.5, 0.55, 600); OT.Sound.tone('sine', 120, 30, 0.5, 0.4); },
    small: () => { OT.Sound.noise(0.2, 0.3, 1200); OT.Sound.tone('sine', 200, 60, 0.2, 0.2); },
    jump: () => OT.Sound.tone('square', 300, 620, 0.1, 0.08),
    land: () => OT.Sound.tone('sine', 140, 60, 0.08, 0.15),
    tick: () => OT.Sound.tone('square', 1400, 1400, 0.03, 0.06),
    warn: () => { OT.Sound.tone('square', 880, 880, 0.08, 0.1); OT.Sound.tone('square', 660, 660, 0.1, 0.1, 0.1); },
    rule: () => { [392, 523, 659, 880].forEach((f, i) => OT.Sound.tone('square', f, f, 0.08, 0.09, i * 0.06)); },
    coin: () => OT.Sound.coin(),
    bad: () => OT.Sound.bad(),
    ok: () => OT.Sound.ok(),
    whoosh: () => OT.Sound.whoosh(),
    zap: () => OT.Sound.zap(),
    spring: () => OT.Sound.spring(),
    go: () => { OT.Sound.tone('square', 784, 784, 0.25, 0.14); OT.Sound.tone('square', 1046, 1046, 0.35, 0.12, 0.08); },
    count: () => OT.Sound.tone('square', 523, 523, 0.12, 0.12),
  };

  /* ==================================================================
     DÉROULEMENT D'UNE PARTIE (un mini-jeu)
     ================================================================== */
  function start(id, specs, opts = {}, done) {
    setup();
    stop(true);
    const def = GAMES[id];
    if (!def) throw new Error('mini-jeu inconnu : ' + id);
    headless = !!opts.headless;
    A = Object.create(api);
    Object.assign(A, {
      def, opts, n: specs.length, round: 0, rounds: typeof def.rounds === 'function' ? def.rounds(specs.length) : def.rounds || 1,
      score: fill(specs.length, 0), stats: fill(specs.length, () => ({})), clock: 0, t: 0, phase: 'count', countT: 0, S: {},
      grid: null,
    });
    A.players = specs.map((s, i) => makePlayer(s, i));
    if (!headless && OT.Dialogue && OT.Dialogue.preloadChars) OT.Dialogue.preloadChars(['annonceur'].concat(A.players.map((P) => P.char)));
    onDone = done || null;
    active = true; paused = false; acc = 0;
    if (!headless) {
      const T = THEMES[def.theme] || THEMES.forge;
      scene.background = lin(T.bg);
      scene.fog = new THREE.Fog(lin(T.bg), 55, 150);   // profondeur : le fond du stade se fond dans la nuit
      hemi.color.set(T.hemi[0]); hemi.groundColor.set(T.hemi[1]); hemi.intensity = T.hemi[2];
      sun.color.set(T.sun[0]); sun.intensity = T.sun[1];
      if (OT.Light) A.players.forEach((P) => { if (P.human && P.dev && P.dev.startsWith('pad:')) { const g = OT.Input.pads().findIndex((q) => 'pad:' + q.index === P.dev); if (g >= 0) OT.Light.set(g, P.color); } });
      if (OT.Music) OT.Music.play(def.music || 'party');
      if (OT.Cam) { OT.Cam.reset(); OT.Cam.setActive(true); OT.Cam.setLimits({ yaw: [-0.6, 0.6], pitch: [-0.3, 0.3], zoom: [0.78, 1.45] }); }
      if (OT.ArenaUI) OT.ArenaUI.enter(A);
    }
    if (def.setup) def.setup(A);
    beginRound();
    return A;
  }

  function clearWorld() {
    if (headless) return;
    while (world.children.length) world.remove(world.children[0]);
    floaters.forEach((f) => root.remove(f.m)); floaters.length = 0;
    waves.forEach((r) => { r.on = false; r.m.visible = false; });
    if (fx) fx.clear();
  }

  function beginRound() {
    A.round++;
    A.t = 0; A.phase = 'count'; A.countT = A.opts.fastStart ? 0.05 : 3.2; A.lastCount = 4;
    A.roundRes = null;
    clearWorld();
    A.grid = null;
    for (const P of A.players) {
      P.alive = true; P.out = false; P.ghost = false; P.stun = 0; P.inv = 0; P.falling = 0; P.h = 0; P.vh = 0;
      P.vx = P.vz = P.kx = P.kz = 0; P.slow = 1; P.data = {}; P.lastHit = null; P.noClip = false;
      if (P.bot) { P.bot.mem = {}; P.bot.q = []; P.bot.cur = { mx: 0, mz: 0, a: false, b: false }; P.bot.path = null; }
      if (!headless && P.mesh) { P.mesh.visible = true; P.hero.scale.setScalar(HERO_SCALE); P.hero.position.y = 0; }
      P.dyingT = 0;
      if (P.anim) { P.anim.loop(null); P.anim.state.one = null; }
      api.icon(P, null);
    }
    A.def.round(A);
    // ENTRAÎNEMENT : avant la 1re manche, s'il y a au moins un humain
    const hints = A.round === 1 && !headless && !A.opts.fastStart && A.opts.tuto !== false && A.players.some((P) => P.human) ? tutoHints(A) : null;
    if (hints && hints.length) {
      A.phase = 'tuto'; A.tutoT = A.tutoMax = A.def.tutoTime || 4.5;
      A.tuto = { list: hints, spawn: A.players.map((P) => [P.x, P.z, P.face]), prog: A.players.map(() => ({ move: 0, a: false, b: false })) };
    }
    if (!headless) {
      CV.focus = null;
      // le stade : construit une fois par partie, l'écran géant annonce la manche
      if (!stadium && OT.ArenaStadium && A.def.stadium !== false) { stadium = OT.ArenaStadium.build(fullBox(), A.def.theme, A.def); scene.add(stadium.group); }
      if (stadium) { stadium.title(['SOIRÉE OSWEL', `${A.def.icon || ''} ${A.def.name}`, A.rounds > 1 ? `Manche ${A.round} / ${A.rounds}` : 'Manche unique']); stadium.hype(0.6); }
      // début de manche : vue large qui tourne puis plonge vers les joueurs
      if (OT.Cam) { OT.Cam.hold(null); OT.Cam.cine({ zoom: 1.4, yaw: (A.round % 2 ? 0.5 : -0.5), pitch: 0.18, dur: 2.2 }); }
      fitCamera();
      if (OT.ArenaUI) OT.ArenaUI.roundStart(A);
      if (A.phase === 'tuto' && OT.ArenaUI && OT.ArenaUI.tuto) { OT.ArenaUI.tuto(A); announce('tuto'); }
    }
  }

  /* ---------- L'entraînement (phase « tuto ») ----------
     def.tuto : liste de consignes (« Déplace-toi : {move} », « {a} : poser une bombe »…),
     ou une fonction (A) → liste, ou false pour passer. Par défaut : bouger + les boutons. */
  function tutoHints(A) {
    const d = A.def;
    let t = typeof d.tuto === 'function' ? d.tuto(A) : d.tuto;
    if (t === false) return null;
    if (!t) { t = ['Déplace-toi : {move}']; if (d.controls && d.controls.a) t.push('{a} : ' + d.controls.a); if (d.controls && d.controls.b) t.push('{b} : ' + d.controls.b); }
    return t;
  }
  function tutoStep(dt) {
    const T = A.tuto;
    A.tutoT -= dt;
    physics(dt, false);
    if (A.def.idle) A.def.idle(A, dt);
    for (const P of A.players) {
      if (!P.human) continue;
      const g = T.prog[P.i];
      g.move += Math.hypot(P.vx, P.vz) * dt;
      for (const k of ['a', 'b']) if (P.in[k + 'P']) {
        g[k] = true;
        api.sfx('pick'); api.rumble(P, 0.25, 0.3, 90);
        if (P.mesh) api.say(P.x, P.z, '✓ ' + (k === 'a' ? 'A' : 'B'), P.css, 28);
        if (P.anim) P.anim.play(k === 'a' ? 'jump' : 'hit');
        if (A.def.tutoAct) A.def.tutoAct(A, P, k);
      }
    }
    const hum = A.players.filter((P) => P.human);
    const needB = !!(A.def.controls && A.def.controls.b);
    const all = hum.every((P) => { const g = T.prog[P.i]; return g.move > 1.2 && g.a && (g.b || !needB); });
    if (A.tutoT <= 0 || (all && A.tutoMax - A.tutoT > 2)) endTuto();
  }
  function endTuto() {
    // tout le monde revient à sa place de départ, puis 3, 2, 1, GO
    A.players.forEach((P, i) => {
      const sp = A.tuto.spawn[i];
      api.place(P, sp[0], sp[1]); P.face = sp[2];
      if (!headless) api.burst(P.x, 0.5, P.z, 10, [P.color, 0xffffff], 3, { up: 2 });
    });
    A.phase = 'count'; A.countT = 3.2; A.lastCount = 4;
    api.sfx('whoosh');
    if (OT.ArenaUI && OT.ArenaUI.tutoEnd) OT.ArenaUI.tutoEnd(A);
  }

  // fin de manche : les gagnants dansent, la caméra s'approche d'eux et se balance
  function stageRoundEnd(res) {
    let win = res.winners;
    if (!win && res.points) { const v = Object.values(res.points); const best = Math.max(...v); if (best > 0) win = Object.keys(res.points).filter((i) => res.points[i] === best).map(Number); }
    const W = (win || []).map((i) => A.players[i]).filter((P) => P && P.mesh && ((P.alive && !P.out) || P.ghost));
    for (const P of A.players) {
      if (!P.anim || !P.alive || P.out) continue;
      if (W.includes(P)) { P.anim.emote(); P.anim.loop('victory'); P.anim.expr('happy', 3); }
      else if (win) { P.anim.loop('defeat'); P.anim.expr('sad', 3); }
    }
    if (W.length) {
      voiceOf('win', W[0], { p: 1 });
      CV.focus = W;
      W.forEach((P) => api.burst(P.x, 1.6, P.z, 26, [P.color, 0xffd23f, 0xffffff], 6, { up: 5 }));
      if (OT.Cam) OT.Cam.hold({ pitch: 0.1, swing: 0.32, freq: 0.9 });
    }
  }

  /* ---------- Caméra dynamique ----------
     Elle cadre l'ACTION (les joueurs en vie + ce que le jeu signale avec def.focus),
     sans jamais descendre sous une part minimale de l'arène (def.camMin, 0,66 par défaut)
     pour qu'on voie toujours ce qui arrive. Le joueur peut la tourner et zoomer
     (OT.Cam : stick droit, L2/R2, souris, doigts). Zoom arrière = toute l'arène. */
  const CV = { cx: 0, cz: 0, dist: 20, snap: true, focus: null };
  const tmpV = new THREE.Vector3();
  function fullBox() {
    const G = A.grid;
    return A.def.view ? A.def.view(A) : { x0: 0, z0: 0, x1: G ? G.w : 20, z1: G ? G.d : 12 };
  }
  function actionBox(F, zoomOut) {
    const pts = [];
    const list = CV.focus || A.players.filter((P) => (P.alive && !P.out) || P.ghost);
    for (const P of list) pts.push(P.x, P.z);
    if (!CV.focus && A.def.focus) for (const q of A.def.focus(A) || []) if (q && isFinite(q.x) && isFinite(q.z)) pts.push(q.x, q.z);
    const fw = F.x1 - F.x0, fd = F.z1 - F.z0;
    if (!pts.length) return F;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let k = 0; k < pts.length; k += 2) { x0 = Math.min(x0, pts[k]); x1 = Math.max(x1, pts[k]); z0 = Math.min(z0, pts[k + 1]); z1 = Math.max(z1, pts[k + 1]); }
    x0 -= 3.2; x1 += 3.2; z0 -= 2.4; z1 += 2.4;
    // jamais plus petit qu'une part de l'arène (sur le gagnant : on peut s'approcher davantage)
    const frac = CV.focus ? 0.28 : (A.def.camMin !== undefined ? A.def.camMin : 0.66);
    const mw = Math.max(7, fw * frac), md = Math.max(5, fd * frac);
    if (x1 - x0 < mw) { const c = (x0 + x1) / 2; x0 = c - mw / 2; x1 = c + mw / 2; }
    if (z1 - z0 < md) { const c = (z0 + z1) / 2; z0 = c - md / 2; z1 = c + md / 2; }
    // on reste dans l'arène (on glisse la boîte)
    const fit = (a, b, lo, hi) => { if (b - a >= hi - lo) return [lo, hi]; if (a < lo) return [lo, lo + (b - a)]; if (b > hi) return [hi - (b - a), hi]; return [a, b]; };
    [x0, x1] = fit(x0, x1, F.x0, F.x1); [z0, z1] = fit(z0, z1, F.z0, F.z1);
    // zoom arrière (L2, molette, pincer) : la boîte s'ouvre jusqu'à toute l'arène
    const u = clamp(zoomOut, 0, 1);
    return { x0: lerp(x0, F.x0, u), x1: lerp(x1, F.x1, u), z0: lerp(z0, F.z0, u), z1: lerp(z1, F.z1, u) };
  }
  function camPos(cx, cz, dist, tilt, yaw, out) {
    const h = Math.sin(tilt) * dist;
    return out.set(cx + Math.sin(yaw) * h, Math.cos(tilt) * dist, cz + Math.cos(yaw) * h);
  }
  // distance pour que la boîte tienne à l'écran (sous le bandeau du haut)
  function fitDistance(b, tilt, yaw) {
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    let lo = 3, hi = 140;
    for (let it = 0; it < 22; it++) {
      const dist = (lo + hi) / 2;
      camPos(cx, cz, dist, tilt, yaw, camera.position);
      camera.lookAt(cx, 0, cz);
      camera.updateMatrixWorld();
      let ok = true;
      for (let q = 0; q < 8 && ok; q++) {
        tmpV.set(q & 1 ? b.x1 + 0.3 : b.x0 - 0.3, q & 4 ? 1.7 : 0, q & 2 ? b.z1 + 0.3 : b.z0 - 0.3).project(camera);
        if (tmpV.x < -0.96 || tmpV.x > 0.96 || tmpV.y < -0.93 || tmpV.y > 0.8) ok = false;
      }
      if (ok) hi = dist; else lo = dist;
    }
    return hi;
  }
  const baseTilt = () => ((A.def.tilt !== undefined ? A.def.tilt : 30) + 6) * Math.PI / 180;
  function camView() {
    const V = OT.Cam ? OT.Cam.view() : { yaw: 0, pitch: 0, zoom: 1 };
    return { yaw: V.yaw, tilt: clamp(baseTilt() - V.pitch, 0.25, 1.05), zoom: V.zoom };
  }
  function updateCam(dt) {
    const V = camView();
    const F = fullBox();
    const b = actionBox(F, (V.zoom - 1) / 0.32);
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const d = fitDistance(b, V.tilt, V.yaw) * (V.zoom < 1 ? V.zoom : 1 + Math.max(0, V.zoom - 1.32));
    const k = CV.snap ? 1 : 1 - Math.exp(-dt * 3.8);   // suit vite l'action, sans à-coups
    CV.snap = false;
    CV.cx += (cx - CV.cx) * k; CV.cz += (cz - CV.cz) * k; CV.dist += (d - CV.dist) * k;
    camPos(CV.cx, CV.cz, CV.dist, V.tilt, V.yaw, camBase);
    camLook.set(CV.cx, 0, CV.cz);
    CV.yaw = V.yaw;
  }
  // à chaque manche : la caméra se recale, les ombres couvrent toute l'arène
  function fitCamera() {
    const b = fullBox();
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    camera.aspect = aspect; camera.fov = 40; camera.updateProjectionMatrix();
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const span = Math.max(b.x1 - b.x0, b.z1 - b.z0) * 0.75 + 4;
    sun.position.set(cx - 6, 22, cz + 10); sun.target.position.set(cx, 0, cz);
    const sc = sun.shadow.camera; sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.near = 1; sc.far = 70; sc.updateProjectionMatrix();
    CV.snap = true;
    updateCam(0);
    camera.position.copy(camBase); camera.lookAt(camLook);
    // grands stades (1.4) : le brouillard commence derrière l'arène, jamais dessus
    if (scene.fog) { const far = fitDistance(b, camView().tilt, 0); scene.fog.near = Math.max(55, far * 1.15); scene.fog.far = scene.fog.near + 95; }
  }

  /* ---------- Une image ---------- */
  function frame(dt) {
    if (!active || !A) return;
    time += dt;
    if (!paused) {
      readHumans();
      acc += Math.min(dt, 0.1);
      let n = 0;
      while (acc >= STEP && n < 5) { step(STEP); acc -= STEP; n++; if (!active) return; }
    }
    if (!headless) draw(dt);
  }

  // humains : lecture des commandes une fois par image (les fronts « appuyé » sont gardés jusqu'au prochain pas)
  function readHumans() {
    for (const P of A.players) {
      if (!P.human) continue;
      const s = OT.Input.arenaState(P.dev);
      // les déplacements suivent la caméra quand on l'a tournée (haut = vers le fond de l'écran)
      const yw = CV.yaw || 0;
      if (Math.abs(yw) > 0.02 && (s.mx || s.mz)) { const c = Math.cos(yw), sn = Math.sin(yw), mx = s.mx, mz = s.mz; s.mx = mx * c + mz * sn; s.mz = -mx * sn + mz * c; }
      if (s.pause && !P.pp && A.phase !== 'done' && OT.ArenaUI) { P.pp = true; OT.ArenaUI.pause(P); return; }
      P.pp = s.pause;
      P.raw = s;
      if (s.a && !P.pa) P.edgeA = true;
      if (s.b && !P.pb) P.edgeB = true;
      if (!s.a && P.pa) P.relA = true;
      if (!s.b && P.pb) P.relB = true;
      P.pa = s.a; P.pb = s.b;
    }
  }

  function step(dt) {
    A.clock += dt;
    // entrées
    for (const P of A.players) {
      let s;
      if (P.human) {
        s = P.raw || { mx: 0, mz: 0, a: false, b: false };
        P.in = { mx: s.mx, mz: s.mz, a: s.a, b: s.b, aP: !!P.edgeA, bP: !!P.edgeB, aR: !!P.relA, bR: !!P.relB };
        P.edgeA = P.edgeB = P.relA = P.relB = false;
      } else if (A.opts.inputFn) {
        s = A.opts.inputFn(A, P) || {};
        const pa = P.in.a, pb = P.in.b;
        P.in = { mx: s.mx || 0, mz: s.mz || 0, a: !!s.a, b: !!s.b, aP: !!s.a && !pa, bP: !!s.b && !pb, aR: !s.a && pa, bR: !s.b && pb };
      } else {
        s = (A.phase === 'play') ? botInput(P, dt) : { mx: 0, mz: 0, a: false, b: false };
        const pa = P.in.a, pb = P.in.b;
        P.in = { mx: s.mx, mz: s.mz, a: s.a, b: s.b, aP: s.a && !pa, bP: s.b && !pb, aR: !s.a && pa, bR: !s.b && pb };
      }
      if (A.S.invert && A.S.invert[P.i] > 0) { P.in.mx = -P.in.mx; P.in.mz = -P.in.mz; }
    }
    if (A.phase === 'tuto') { tutoStep(dt); return; }
    if (A.phase === 'count') {
      A.countT -= dt;
      const c = Math.ceil(A.countT);
      if (c !== A.lastCount && c >= 0) {
        A.lastCount = c; if (!headless && OT.ArenaUI) OT.ArenaUI.count(c, A); api.sfx(c > 0 ? 'count' : 'go');
        // l'annonceur : 3, 2, 1, partez ! (manches suivantes : « Manche 2 ! » puis « Partez ! »)
        if (A.round === 1) announce(['go', 'un', 'deux', 'trois'][c]);
        else if (c === 3) announce(A.round >= A.rounds ? 'derniere' : 'manche' + A.round);
        else if (c === 0) announce('go');
        if (c === 0) { api.hype(1); for (const P of A.players) api.rumble(P, 0.35, 0.5, 160); }
      }
      if (A.countT <= 0) { A.phase = 'play'; if (A.def.go) A.def.go(A); }
      // pendant le compte à rebours on ne bouge pas, mais l'arène s'anime
      if (A.def.idle) A.def.idle(A, dt);
      return;
    }
    if (A.phase === 'roundEnd') {
      A.endT += dt;
      if (A.def.idle) A.def.idle(A, dt);
      physics(dt, true);
      if (A.endT > 2.6) {
        if (A.round >= A.rounds || (A.def.matchOver && A.def.matchOver(A))) finish();
        else beginRound();
      }
      return;
    }
    if (A.phase !== 'play') return;
    A.t += dt;
    physics(dt, false);
    A.def.update(A, dt);
    // délai max de sécurité (une partie ne doit jamais rester bloquée)
    const lim = (A.def.maxRound || 240);
    if (A.phase === 'play' && A.t > lim) {
      const ranking = A.def.timeoutRank ? A.def.timeoutRank(A) : null;
      api.endRound(ranking || { text: 'Temps écoulé !' });
    }
  }

  // mouvement de base commun : vitesse voulue, poussées, saut, chute
  function physics(dt, frozen) {
    const def = A.def;
    for (const P of A.players) {
      P.stun = Math.max(0, P.stun - dt);
      P.inv = Math.max(0, P.inv - dt);
      for (const k in P.data) if (k.endsWith('T') && typeof P.data[k] === 'number' && P.data[k] > 0) P.data[k] = Math.max(0, P.data[k] - dt);
      if (!P.alive && !P.ghost) {
        if (P.falling > 0) { P.falling += dt; }
        continue;
      }
      if (P.out && !P.ghost) continue;
      const free = !frozen && P.stun <= 0 && !(def.lockMove && def.lockMove(A, P));
      let sp = P.speed * SPEED_MUL * P.slow * (def.speedMod ? def.speedMod(A, P) : 1);
      let mx = free ? P.in.mx : 0, mz = free ? P.in.mz : 0;
      const m = Math.hypot(mx, mz);
      if (m > 1) { mx /= m; mz /= m; }
      const grip = def.grip ? def.grip(A, P) : BASE_GRIP;
      P.vx = lerp(P.vx, mx * sp, Math.min(1, grip * dt));
      P.vz = lerp(P.vz, mz * sp, Math.min(1, grip * dt));
      if (m > 0.2) P.face = Math.atan2(mx, mz);
      // poussées (décroissent)
      const kd = Math.exp(-(def.knockDrag || 5) * dt);
      P.kx *= kd; P.kz *= kd;
      if (Math.abs(P.kx) < 0.02) P.kx = 0; if (Math.abs(P.kz) < 0.02) P.kz = 0;
      const ext = def.drift ? def.drift(A, P) : null;
      let dx = (P.vx + P.kx + (ext ? ext.x : 0)) * dt, dz = (P.vz + P.kz + (ext ? ext.z : 0)) * dt;
      const hit = moveP(P, dx, dz);
      if (hit.bx) P.kx *= -0.3; if (hit.bz) P.kz *= -0.3;
      // saut
      if (P.h > 0 || P.vh > 0) {
        P.vh -= 24 * dt; P.h += P.vh * dt;
        if (P.h <= 0) { P.h = 0; P.vh = 0; if (def.onLand) def.onLand(A, P); }
      }
      P.walk += Math.hypot(P.vx, P.vz) * dt * 2.6;
      // le vide : on tombe (sauf en l'air)
      if (A.grid && P.h <= 0.01 && !P.ghost && P.alive && A.grid.at(Math.floor(P.x), Math.floor(P.z)) === VOID && !(def.safe && def.safe(A, P))) {
        P.alive = false; P.falling = 0.001; P.deadT = 0;
        api.sfx('whoosh'); api.wave(P.x, P.z, P.color, 1.6, 0.45);
        api.rumble(P, 0.7, 0.5, 300);
        if (P.lastHit && A.clock - P.lastHit.t < 3 && P.lastHit.by !== P) api.stat(P.lastHit.by.i, 'kills', 1);
        api.stat(P.i, 'falls', 1);
        if (def.onFall) def.onFall(A, P); else { P.out = true; }
      }
    }
    if (def.bodies !== false && !frozen) api.separate(A.players.filter((p) => p.alive && !p.out && !p.ghost), 1);
  }

  /* ---------- Affichage ---------- */
  function draw(dt) {
    for (const P of A.players) {
      if (!P.mesh) continue;
      const show = (P.alive && !P.out) || P.falling > 0 || P.ghost || P.dyingT > 0;
      P.mesh.visible = show;
      P.ring.visible = P.alive && !P.out && !P.ghost && P.falling <= 0;
      P.shadow.visible = P.ring.visible;
      P.tag.visible = !P.out || P.ghost;
      let y = P.h;
      if (P.falling > 0) { y = -P.falling * P.falling * 9; P.hero.scale.setScalar(Math.max(0.05, HERO_SCALE - P.falling * 0.9)); }
      P.mesh.position.set(P.x, y, P.z);
      let rot = P.face;
      P.mesh.rotation.y += ((rot - P.mesh.rotation.y + Math.PI * 3) % TAU - Math.PI) * Math.min(1, dt * 14);
      P.ring.position.set(P.x, 0.03, P.z);
      P.shadow.position.set(P.x, 0.02, P.z);
      P.shadow.scale.setScalar(Math.max(0.4, 1 - P.h * 0.25));
      P.tag.position.set(P.x, P.topY + 0.35 + y, P.z);
      P.tag.quaternion.copy(camera.quaternion);
      if (P.icon) { P.icon.position.set(P.x, P.topY + 0.75 + y + Math.sin(time * 5) * 0.05, P.z); }
      if (P.anim) {
        const sp = Math.hypot(P.vx, P.vz);
        P.anim.update(dt, { speed: Math.min(1.3, sp / (BASE_SPEED * SPEED_MUL)), ground: P.h <= 0.05, vy: P.vh, stun: P.stun > 0 && P.alive, armL: P.data.armL, armR: P.data.armR, face: P.data.face });
      }
      if (P.dyingT > 0) P.dyingT -= dt;
      // étourdi : il tourne sur lui-même ; invincible : il clignote
      if (P.stun > 0) P.hero.rotation.y += dt * 14; else P.hero.rotation.y *= 0.8;
      P.hero.visible = !(P.inv > 0 && Math.sin(time * 30) > 0.3) || P.ghost;
      if (P.ghost) P.hero.position.y = 0.5 + Math.sin(time * 3 + P.i) * 0.15; else P.hero.position.y = 0;
      // fantôme : un drap blanc transparent par-dessus
      if (P.ghost && !P.sheet) {
        P.sheet = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
        root.add(P.sheet);
      }
      if (P.sheet) { P.sheet.visible = !!P.ghost; if (P.ghost) P.sheet.position.set(P.x, 1.0 + Math.sin(time * 3 + P.i) * 0.15 + y, P.z); }
      if (P.gadTick) P.gadTick(time);
    }
    if (A.def.draw) A.def.draw(A, dt, time);
    updateMarks(time);
    if (A.phase === 'tuto' && OT.ArenaUI && OT.ArenaUI.tutoUpdate) OT.ArenaUI.tutoUpdate(A);
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i]; f.t += dt;
      f.m.position.y += dt * 0.9;
      f.m.quaternion.copy(camera.quaternion);
      f.m.material.opacity = Math.min(1, (f.life - f.t) * 2);
      if (f.t > f.life) { root.remove(f.m); floaters.splice(i, 1); }
    }
    fx.update(dt);
    if (stadium) stadium.update(dt);
    for (const r of waves) {
      if (!r.on) continue;
      r.t += dt; const k = r.t / r.life;
      if (k >= 1) { r.on = false; r.m.visible = false; continue; }
      r.m.scale.setScalar(0.1 + (1 - (1 - k) * (1 - k)) * r.size); r.m.material.opacity = (1 - k) * 0.9;
    }
    if (OT.Music) { const r = A.def.rush && A.phase === 'play' ? A.def.rush(A) : 1; if (OT.Music.rush !== r) OT.Music.rush = r; }
    shakeAmt = Math.max(0, shakeAmt - dt * 1.8);
    const s = shakeAmt * shakeAmt * 0.6;
    updateCam(dt);
    camera.position.set(camBase.x + (Math.random() - 0.5) * s, camBase.y + (Math.random() - 0.5) * s, camBase.z + (Math.random() - 0.5) * s);
    camera.lookAt(camLook);
    if (OT.ArenaUI) OT.ArenaUI.hud(A);
  }

  /* ---------- Les flèches d'objectif (def.goals) ----------
     Une flèche qui rebondit + un anneau au sol, à la couleur demandée, avec une étiquette
     facultative (« COFFRE », « SORTIE », « TON COFFRE »…). */
  function makeMark() {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.95, depthTest: false });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.6, 4), mat);
    cone.rotation.x = Math.PI; cone.renderOrder = 5;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 36), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    g.add(cone); root.add(g); root.add(ring);
    return { g, cone, ring, lab: null, text: '', col: -1 };
  }
  function updateMarks(time) {
    let list = [];
    if (A.def.goals && (A.phase === 'play' || A.phase === 'tuto' || A.phase === 'count')) { try { list = A.def.goals(A) || []; } catch (e) { list = []; } }
    const n = Math.max(list.length, marks.length);
    for (let k = 0; k < n; k++) {
      const q = list[k];
      let m = marks[k];
      if (!q || !isFinite(q.x) || !isFinite(q.z)) { if (m) { m.g.visible = false; m.ring.visible = false; } continue; }
      if (!m) { m = makeMark(); marks.push(m); }
      const col = typeof q.color === 'string' ? parseInt(q.color.replace('#', ''), 16) : (q.color !== undefined ? q.color : 0xffd23a);
      if (m.col !== col) { m.col = col; m.cone.material.color.setHex(col); m.ring.material.color.setHex(col); }
      const bob = Math.sin(time * 4 + k) * 0.22, y0 = (q.y || 0) + 2.3;
      m.g.visible = true; m.ring.visible = q.ring !== false;
      m.g.position.set(q.x, y0 + bob, q.z);
      const s = q.size || 1; m.g.scale.setScalar(s);
      m.ring.position.set(q.x, 0.05, q.z); m.ring.scale.setScalar(s * (1 + Math.sin(time * 5 + k) * 0.12) * (q.r || 1));
      if ((q.label || '') !== m.text) {
        if (m.lab) { m.g.remove(m.lab); m.lab = null; }
        m.text = q.label || '';
        if (m.text) { const css = '#' + col.toString(16).padStart(6, '0'); m.lab = OT.Models.label(m.text, { size: 26, h: 0.36, color: css, border: css }); m.lab.position.y = 0.62; m.g.add(m.lab); }
      }
      if (m.lab) m.lab.quaternion.copy(camera.quaternion);
    }
  }
  function hideMarks() { for (const m of marks) { m.g.visible = false; m.ring.visible = false; } }

  function render(renderer) {
    if (!active || headless) return;
    const w = window.innerWidth, h = window.innerHeight;
    if (Math.abs(camera.aspect - w / h) > 0.001) { fitCamera(); }
    const ex = renderer.toneMappingExposure;
    renderer.toneMappingExposure = A && A.def.exposure ? A.def.exposure : 0.92;
    renderer.render(scene, camera);
    renderer.toneMappingExposure = ex;
  }

  /* ---------- Fin du mini-jeu : le résumé pour l'écran des résultats ---------- */
  function finish() {
    A.phase = 'done';
    const def = A.def;
    const order = A.players.map((P) => P.i).sort((a, b) => (A.score[b] - A.score[a]) || ((def.tiebreak ? def.tiebreak(A, b) - def.tiebreak(A, a) : 0)) || ((A.stats[b].kills || 0) - (A.stats[a].kills || 0)));
    // places (ex aequo possibles)
    const place = {};
    order.forEach((i, k) => { const prev = order[k - 1]; place[i] = k > 0 && A.score[i] === A.score[prev] && (!def.tiebreak || def.tiebreak(A, i) === def.tiebreak(A, prev)) ? place[prev] : k; });
    const rows = order.map((i) => {
      const P = A.players[i], st = A.stats[i];
      return {
        i, name: P.name, color: P.color, css: P.css, human: P.human, profileId: P.profileId, level: P.level.id, dev: P.dev,
        place: place[i], score: A.score[i], elim: st.kills || 0,
        bonus: def.bonus ? def.bonus(A, P) : [], lines: def.stats ? def.stats(A, P) : [],
      };
    });
    const summary = { id: def.id, name: def.name, icon: def.icon, rows, scoreName: def.scoreName || 'points', elimName: def.elimName || 'élim.' };
    // jeu en équipe : tout le monde gagne (ou perd) ensemble
    // (réussite : le classement normal ; échec : tout le monde au même rang, sauf si le jeu donne ses places)
    if (def.teamResult) {
      const T = def.teamResult(A);
      for (const r of rows) {
        if (T.places) r.place = T.places[r.i];
        else if (!T.ok) { r.place = Math.min(3, Math.max(0, A.n - 1)); r.medal = '💥'; }
        if (T.medals && T.medals[r.i]) r.medal = T.medals[r.i];
      }
      rows.sort((x, y) => x.place - y.place);
      summary.team = T;
    }
    const cb = onDone;
    if (headless) { active = false; }
    if (cb) cb(summary);
    return summary;
  }

  function stop(silent) {
    if (A && !headless) { removePlayers(); clearWorld(); hideMarks(); if (OT.Cam) { OT.Cam.hold(null); OT.Cam.setActive(false); } }
    if (OT.ArenaUI && OT.ArenaUI.tutoEnd) OT.ArenaUI.tutoEnd(null);
    if (stadium) { scene.remove(stadium.group); stadium.dispose(); stadium = null; }
    if (A && A.def.cleanup) A.def.cleanup(A);
    A = null; active = false; paused = false;
    if (OT.Music) OT.Music.rush = 1;
    if (!silent && OT.ArenaUI) OT.ArenaUI.leave();
  }

  // tests : simuler n pas sans affichage
  function sim(n) {
    for (let k = 0; k < n && active && A && A.phase !== 'done'; k++) step(STEP);
    return A;
  }

  return {
    LEVELS, THEMES, Bot, STEP,
    register(def) {
      def.rounds = def.rounds || 1;
      GAMES[def.id] = def;
      if (!ORDER.includes(def.id)) ORDER.push(def.id);
    },
    get games() { return GAMES; },
    get order() { return ORDER.slice(); },
    get active() { return active; },
    get paused() { return paused; },
    set paused(v) { paused = v; acc = 0; if (!v && A) A.players.forEach((P) => { P.pa = true; P.pb = true; P.pp = true; }); },
    get match() { return A; },
    start, stop, frame, render, sim, announce, tutoHints: (a) => tutoHints(a || A),
    refit() { if (A && !headless) fitCamera(); },
    restartRound() { if (A) { A.round--; beginRound(); } },
  };
})();
