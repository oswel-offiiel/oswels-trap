/* =====================================================================
   OSWEL'S TRAP — game.js  (version 4)
   Le MOTEUR du jeu :
     1. Rendu 3D (Three.js) : décor, blocs, personnages, particules
     2. Construction d'un niveau à partir des données (data.js)
     3. Physique des joueurs (gravité, saut, collisions)
     4. Pièges et mécanismes
     5. Le boss : le Gardien de la Forge
     6. Caméra 2.5D et boucle de jeu
   Règle d'or (comme Level Devil) : quand on meurt, TOUT le niveau
   revient à son état d'origine et on recommence depuis le début.
   ===================================================================== */

window.OT = window.OT || {};

OT.Game = (function () {
  /* ------------------------------------------------------------------
     Réglages de physique et de difficulté
     ------------------------------------------------------------------ */
  const GRAV = 34;            // gravité (tuiles / s²)
  const JUMP_V = 13.2;        // vitesse de saut → environ 2,5 tuiles de haut (une marche de 2 cases passe avec de la marge)
  // Vitesses d'origine (les niveaux sont réglés dessus). Version 1.2.1 : le temps du jeu suit enfin
  // le temps réel (plus de ralenti quand l'ordinateur peine), le stick à fond = vitesse de course,
  // et les demi-tours sont beaucoup plus réactifs.
  const MAX_V = 7.2;          // vitesse normale (clavier, tactile, stick à moitié) — les niveaux sont réglés dessus
  const RUN_MUL = 1.35;       // vitesse maximale = 9,7 tuiles / s (□, Maj, bouton COURIR, stick à fond)
  const ACC_GROUND = 60, ACC_AIR = 38, FRICTION = 42;
  const TURN_BOOST = 1.3;     // demi-tour au sol : on freine et on repart beaucoup plus vite
  const SPEED_SCALE = MAX_V / 7.2;   // les rivaux (courses) accélèrent d'autant : même équilibre qu'avant
  const MAX_FALL = -22;
  const COYOTE = 0.09;        // on peut encore sauter juste après avoir quitté un bord
  const JUMP_BUFFER = 0.12;   // un saut appuyé un peu trop tôt est mémorisé
  const PW = 0.66, PH = 0.9;  // taille d'un joueur (boîte de collision)
  const CRUMBLE_DELAY = 0.3;  // temps avant qu'un bloc rouillé s'effondre
  const PISTON_T = 1.9;       // cycle des pistons (s)
  const ELEC_HALF = 1.3;      // courant allumé 1,3 s, coupé 1,3 s
  const SOLO_BUTTON = 3.0;    // en solo, un bouton reste actif 3 s
  const SOLO_SWITCH = 3.2;    // en solo (et en versus), l'interrupteur coupe le courant 3,2 s
  const SOLO_SHIELD = 4.5;    // boss : le bouclier reste coupé 4,5 s quand on est seul
  const TAG_TIME = 5;         // Monde 2 : une balise ouvrante reste active 5 s
  // Mode facile : plus de temps sur les boutons, interrupteurs, balises, blocs rouillés
  const easy = () => OT.settings && OT.settings.difficulty === 'facile';
  // En coop, le Monde 1 est pensé pour s'entraider (boutons et interrupteurs très courts) ;
  // à partir du Monde 2, ils durent aussi longtemps qu'en solo.
  const coopShort = () => mode === 'coop' && worldId === 1;
  const ez = (v) => (easy() ? v * 1.5 : v);

  const M = OT.Models;
  // version 1.5 : les « prises » des modules (pièges 3.0, gadgets, coop, écran partagé, étoiles…)
  // — voir js/extensions.js. Si le fichier manque, une version vide garde le jeu fonctionnel.
  const EXT = OT.GameExt || { types: {}, tiles: {}, hooks: {}, run() {}, any() { return false; }, has() { return false; }, safe(w, f, d) { try { return f(); } catch (e) { return d; } }, warn() {} };
  let renderer, scene, camera, canvas;
  let sun, hemi, rim, lampA;
  let R = null;               // le niveau en cours
  let players = [];
  let mode = 'solo';
  let levelIndex = 0;
  let worldId = 1;             // monde en cours (1 = La Forge, 2 = Le Code…)
  const WD = () => OT.WORLD_DATA[worldId] || OT.WORLD_DATA[1];
  let state = 'idle';         // 'idle' | 'play' | 'dialog' | 'pause' | 'done'
  let time = 0;
  // (1.5, voix) les phrases que des boss / personnages disent dans une BULLE (pas dans un dialogue) : listées ici
  // pour que l'outil des voix (tools/voix/generer.py, via OT.Dialogue.collectAll) leur fabrique leur voix
  OT.STORY_EXTRA = (OT.STORY_EXTRA || []).concat([
    ['gardien', 'MON ÉQUILIBRE… !'], ['gardien', 'ENCORE.'],
    ['zeus', 'Pff… pff…'], ['zeus', 'Aïe ! Pas mal.'], ['zeus', 'Encore ?!'], ['zeus', 'D\'accord, d\'accord !'],
    ['rumeur', 'On t\'a menti…'], ['rumeur', 'Je… je n\'ai plus de mots…'], ['rumeur', 'Psst… tu as oublié une pièce.'],
    ['winblack', 'BLACKOUT.'], ['valdes', 'Je t\'avais prévenu… BLACKOUT TOTAL !'], ['valdes', 'Courant coupé ! Les blocs tiennent 7 secondes. Fonce !'],
  ]);
  // version 1.5 : pouvoir COMPILER de Tony (js/pouvoirs.js) — un piège « compilé » est FIGÉ 2 s :
  //   FZ(e) = vrai pendant qu'il est figé (il ne bouge plus et ne blesse plus) ;
  //   TT(e) = SON horloge : l'heure du jeu moins le temps passé figé (il reprend exactement là où il s'était arrêté).
  const FZ = (e) => e.frzT > 0;
  const TT = (e) => time - (e.fz || 0);
  let shake = 0;
  let who = [];               // infos des joueurs : nom, apparence, pièces déjà prises
  const cam = { x: 0, y: 4, z: 16 };
  const score = [0, 0];
  let particles;
  // Mode FÊTE (multijoueur local, 2 à 4 joueurs) : l'activité en cours (party.js) et ses appareils
  let PM = null;              // la définition de l'activité (règles, crochets)
  let partyDevs = [];         // appareil de chaque joueur : 'kb0', 'kb1', 'pad:0'…
  const party = () => mode === 'party' && R && R.party;
  const bubbles = [];

  /* ==================================================================
     1. RENDU 3D
     ================================================================== */
  function init(cv) {
    canvas = cv;
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;   // couleurs plus douces et propres
    renderer.toneMappingExposure = 1.0;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 220);

    hemi = new THREE.HemisphereLight(0xffe3c4, 0x1c120d, 0.75);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffe6c8, 1.15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    scene.add(sun); scene.add(sun.target);
    rim = new THREE.DirectionalLight(0xff9a50, 0.7);   // lumière de forge par derrière
    rim.position.set(6, 4, -10);
    scene.add(rim);
    lampA = new THREE.PointLight(0xffa860, 0.9, 16, 2);
    scene.add(lampA);

    M.mats();
    particles = makeParticles(320);
    scene.add(particles.mesh);

    window.addEventListener('resize', resize);
    resize();
    applyQuality();
    if (OT.Cam) OT.Cam.attach(canvas);
    requestAnimationFrame(loop);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function applyQuality() {
    const sh = OT.settings ? OT.settings.shadows : true;
    sun.castShadow = sh;
    renderer.shadowMap.enabled = sh;
    scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => (m.needsUpdate = true)); });
  }

  /* ---------- Particules : un seul InstancedMesh pour toutes ---------- */
  /* --- Ondes de choc : un anneau lumineux qui s'élargit (chute, porte, pièce, atterrissage) --- */
  const rings = [];
  function shock(x, y, color, size = 1.6, life = 0.45, flat = false) {
    if (!scene) return;
    let r = rings.find((o) => !o.on);
    if (!r) {
      if (rings.length >= 14) r = rings[0];
      else {
        const m = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
        scene.add(m); r = { m }; rings.push(r);
      }
    }
    Object.assign(r, { on: true, t: 0, life, size });
    r.m.material.color.set(color); r.m.position.set(x, y, 0.15); r.m.rotation.set(flat ? -Math.PI / 2 : 0, 0, 0); r.m.visible = true; r.m.scale.setScalar(0.01);
  }
  function updateShock(dt) {
    for (const r of rings) {
      if (!r.on) continue;
      r.t += dt; const k = r.t / r.life;
      if (k >= 1) { r.on = false; r.m.visible = false; continue; }
      const e = 1 - (1 - k) * (1 - k), s = 0.15 + e * r.size;
      r.m.scale.setScalar(s); r.m.material.opacity = (1 - k) * 0.85;
    }
  }

  function makeParticles(n) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), n);
    mesh.frustumCulled = false;
    const list = [];
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      list.push({ life: 0 });
      dummy.scale.set(0, 0, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, col.set(0xffffff));
    }
    let cursor = 0;
    return {
      mesh,
      burst(x, y, count, color, speed = 6, opts = {}) {
        for (let k = 0; k < count; k++) {
          const p = list[cursor]; const i = cursor;
          cursor = (cursor + 1) % n;
          const a = Math.random() * Math.PI * 2, sp = speed * (0.3 + Math.random() * 0.7);
          p.x = x; p.y = y; p.z = (Math.random() - 0.5);
          p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp + (opts.up || 0); p.vz = (Math.random() - 0.5) * 4;
          p.life = p.max = opts.life || 0.4 + Math.random() * 0.5;
          p.s = opts.size || 0.6 + Math.random() * 0.8;
          p.g = opts.grav === undefined ? 1 : opts.grav;
          mesh.setColorAt(i, col.set(Array.isArray(color) ? color[k % color.length] : color));
        }
        mesh.instanceColor.needsUpdate = true;
      },
      update(dt) {
        for (let i = 0; i < n; i++) {
          const p = list[i];
          if (p.life <= 0) continue;
          p.life -= dt;
          p.vy -= 20 * p.g * dt;
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          const s = Math.max(0, p.life / p.max) * p.s;
          dummy.position.set(p.x, p.y, p.z); dummy.scale.set(s, s, s);
          dummy.rotation.set(p.life * 7, p.life * 5, 0);
          dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      },
    };
  }

  /* ==================================================================
     2. CONSTRUCTION D'UN NIVEAU
     ================================================================== */
  function clearLevel() {
    if (OT.Dialogue) { OT.Dialogue.stop(); }   // changement de scène : on coupe la voix en cours
    if (R) EXT.run('clear', PX);                // version 1.5 : les modules nettoient leur interface
    slow.t = 0; slow.scale = 1; wscale.t = 0; wscale.scale = 1;   // ralenti / Time Break coupés
    if (R && R.group) {
      scene.remove(R.group);
      // version 1.3 : on libère aussi les textures propres au niveau (étiquettes, fenêtres, décors…)
      // — les textures partagées (M.TEX, matériaux communs) restent ; une texture libérée par erreur
      // serait simplement renvoyée à la carte graphique à sa prochaine utilisation.
      const shared = new Set(Object.values(M.TEX));
      for (const m of Object.values(M.MAT)) for (const k of ['map', 'emissiveMap', 'alphaMap']) if (m && m[k]) shared.add(m[k]);
      const done = new Set();
      R.group.traverse((o) => {
        if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of mats) for (const k of ['map', 'emissiveMap', 'alphaMap']) {
          const t = m[k];
          if (t && t.isTexture && !shared.has(t) && !done.has(t) && !(t.userData && t.userData.shared)) { done.add(t); t.dispose(); }
        }
      });
    }
    bubbles.forEach((b) => b.el.remove());
    bubbles.length = 0;
    R = null;
  }

  function buildLevel(idx, arena) {
    restoreLights();
    clearLevel();
    const MAT = M.mats();
    const wd = WD();
    const def = arena || wd.levels[idx];     // arena : une arène du mode fête (party.js)
    const B = def.build;
    const theme = (arena && arena.theme) || wd.theme || 'forge';
    // matériaux selon le thème du monde
    const TM = ({
      code: { plate: MAT.codePlate, top: MAT.codeTop, rust: MAT.corrupt },
      lab: { plate: MAT.labPlate, top: MAT.labTop, rust: MAT.labCrack },
      nexus: { plate: MAT.nexPlate, top: MAT.nexTop, rust: MAT.cloud },
      city: { plate: MAT.cityPlate, top: MAT.cityTop, rust: MAT.scaffold },
    })[theme] || { plate: MAT.plate, top: MAT.top, rust: MAT.rust };
    applyThemeLights(theme);
    const W = B.w, H = B.h;
    const group = new THREE.Group();
    scene.add(group);

    R = {
      def, idx, W, H, group, theme, TM, world: worldId,
      meta: B.meta || {}, tags: {}, comp: {},
      marks: [], ghostRec: [], ghostRun: null, ghostI: 0, cpOn: false, cpState: null,
      rival: null, styleSwapped: false,
      jumping: false, jumpLag: 9, bridgeOn: true, attemptT: 0, linkCool: 0,
      ab: 0, hasAB: false, beltMats: null, onMats: null,
      tiles: [], grid: B.grid.map((row) => row.slice()),
      ents: {}, falling: [], hazards: [],
      powerOffT: 0, powered: false, hasPart: false,
      deaths: 0, timer: 0,
      spawn: { x: B.spawn.x, y: B.spawn.y },
      boss: null, done: false, winner: -1,
      picked: [],                // pièces ramassées pendant cet essai : [{i, by}]
      // version 1.5 : statistiques du niveau (étoiles, debug) et place libre pour les modules
      stats: { deathsBy: [0, 0, 0, 0], bossDeaths: 0, chaseDeaths: 0, solved: 0, toSolve: 0, shields: 0 },
      ext: {},
    };
    for (let y = 0; y < H; y++) R.tiles.push(new Array(W).fill(null));
    R.heatGroups = null; R.gooTiles = []; R.gooCount = 0; R.lev0 = {}; R.shots = []; R.camz = []; R.gateQ = [];

    /* --- Blocs fixes : on fusionne les rangées de '#' pour un rendu propre --- */
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        const c = R.grid[y][x];
        if (c === '#' || c === 'E') {
          let x1 = x;
          while (x1 + 1 < W && R.grid[y][x1 + 1] === c) x1++;
          const n = x1 - x + 1;
          const mat = c === 'E' ? [MAT.elec, MAT.elec] : [TM.plate, TM.top];
          const m = new THREE.Mesh(M.slabGeo(n), mat);
          m.geometry.userData.shared = true;
          m.position.set(x, y, 0);
          m.castShadow = true; m.receiveShadow = true;
          group.add(m);
          x = x1 + 1;
        } else {
          if (('=~HhvofXTRYJPC<>AKQDBZGN{}'.includes(c) || EXT.tiles[c]) && c !== ' ') R.tiles[y][x] = makeSpecialTile(c, x, y, group);
          x++;
        }
      }
    }
    // Pics (au sol et au plafond) : InstancedMesh, plusieurs rangées en profondeur
    const spikes = [], ceil = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (R.grid[y][x] === '^') spikes.push([x, y]); if (R.grid[y][x] === 'W') ceil.push([x, y]); }
    const cone = new THREE.ConeGeometry(0.17, 0.62, 6);
    const dummy = new THREE.Object3D();
    function spikeField(list, down) {
      if (!list.length) return;
      const zs = [-0.6, 0, 0.6];
      const m = new THREE.InstancedMesh(cone, MAT.spike, list.length * zs.length * 2);
      let i = 0;
      for (const [x, y] of list) for (const z of zs) for (const dx of [0.27, 0.73]) {
        dummy.position.set(x + dx, down ? y + 0.69 : y + 0.31, z);
        dummy.rotation.set(down ? Math.PI : 0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix(); m.setMatrixAt(i++, dummy.matrix);
      }
      m.castShadow = true;
      group.add(m);
      // plaque d'acier sous les pics
      for (const [x, y] of list) {
        const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 1.8), MAT.dark);
        base.position.set(x + 0.5, down ? y + 0.96 : y + 0.04, 0);
        base.receiveShadow = true;
        group.add(base);
      }
    }
    spikeField(spikes, false);
    spikeField(ceil, true);
    R.hasElec = B.grid.some((row) => row.includes('E'));

    ({ code: buildCodeBackdrop, lab: buildLabBackdrop, nexus: buildNexusBackdrop, city: buildCityBackdrop }[theme] || buildBackdrop)(group, W, H, idx);

    /* --- Entités --- */
    const E = R.ents;
    const push = (type, o) => { (E[type] = E[type] || []).push(o); return o; };
    R.coinCount = 0;
    // version 1.5 : la fabrication d'une entité est une fonction (les modules peuvent en ajouter
    // après coup avec X.addEnt, et les types inconnus sont demandés aux extensions)
    const makeEnt = (e) => {
      switch (e.type) {
        case 'npc': push('npc', makeNPC(e, group)); break;
        case 'rumeur': push('rumeur', makeNPC({ x: e.x, y: e.y, id: 'rumeur', text: e.text }, group)); break;
        case 'sign': push('sign', makeSign(e, group)); break;
        case 'door': push('door', makeDoor(e, group, false)); break;
        case 'fakedoor': push('fakedoor', makeDoor(e, group, true)); break;
        case 'trigger': push('trigger', makeTrigger(e, group)); break;
        case 'spring': push('spring', makeSpring(e, group, false)); break;
        case 'wrench': push('spring', makeSpring(e, group, true)); break;
        case 'button': push('button', makeButton(e, group)); break;
        case 'gate': push('gate', makeGate(e, group)); break;
        case 'switch': push('switch', makeSwitch(e, group)); break;
        case 'part': push('part', makePart(e, group, false)); break;
        case 'fakepart': push('fakepart', makePart(e, group, true)); break;
        case 'coin': push('coin', makeCoin(e, group, R.coinCount++)); break;
        case 'plat': push('plat', makePlat(e, group)); break;
        case 'piston': push('piston', makePiston(e, group, H)); break;
        case 'booth': push('booth', makeBooth(e, group)); break;
        case 'tagopen': push('tagopen', makeTagPickup(e, group, true)); break;
        case 'tagclose': push('tagclose', makeTagPickup(e, group, false)); break;
        case 'link': push('link', makeLink(e, group)); break;
        case 'compile': push('compile', makeCompile(e, group)); break;
        case 'rival': if (mode !== 'versus') R.rival = makeRival(e, group); break;
        case 'laser': push('laser', makeLaser(e, group)); break;
        case 'lowg': push('lowg', makeLowG(e, group)); break;
        case 'fan': push('fan', makeFan(e, group)); break;
        case 'portal': push('portal', makePortal(e, group)); break;
        case 'traffic': push('traffic', makeTraffic(e, group, B.grid)); break;
        // version 1.3
        case 'cp': push('cp', makeCP(e, group)); break;
        case 'saw': push('saw', makeSaw(e, group)); break;
        case 'hammer': push('hammer', makeHammer(e, group)); break;
        case 'crusher': push('crusher', makeCrusher(e, group)); break;
        case 'spear': push('spear', makeSpear(e, group)); break;
        case 'turret': push('turret', makeTurret(e, group)); break;
        case 'barrel': push('barrel', makeBarrel(e, group)); break;
        case 'zone': push('zone', makeZone(e, group)); break;
        case 'chase': push('chase', makeChase(e, group)); break;
        case 'crate': push('crate', makeCrate(e, group)); break;
        case 'lever': push('lever', makeLever(e, group)); break;
        case 'press': push('press', makePress(e, group)); break;
        case 'fakecoin': push('fakecoin', makeFakeCoin(e, group)); break;
        case 'linger': push('linger', Object.assign({ fired: false, t: 0 }, e)); break;
        case 'camz': (R.camz = R.camz || []).push({ x0: e.x0, x1: e.x1, z: e.z || 1, yb: e.yb || 0 }); break;
        default: {
          // version 1.5 : un type ajouté par un module (js/pieges3.js, js/coop.js, js/gadgets.js…)
          const d = EXT.types[e.type];
          if (d && d.make) {
            const o = EXT.safe('make ' + e.type, () => d.make(e, group, PX), null);
            if (o) { if (!o.type) o.type = e.type; return push(e.type, o); }
          }
        }
      }
      return null;
    };
    R.makeEnt = makeEnt;
    for (const e of B.ents) makeEnt(e);
    R.lev = Object.assign({}, R.lev0 || {});
    R.zones = 1 + (E.door || []).filter((d) => d.to && !d.trap).length + (B.escape ? 1 : 0);
    R.zone = 1;
    // version 1.3 : largeur de l'arène du boss (la fuite est ajoutée à droite, hors de l'arène)
    R.AW = B.escape && B.zonesX ? B.zonesX[0] : R.W;
    R.bossWait = !!(def.boss && B.approach);   // l'antichambre : le boss attend qu'on entre dans l'arène
    R.cpAt = null; R.cpAtSave = null;
    // Monde 2 : groupes de balises et blocs à compiler
    for (const k in R.meta) { const m = R.meta[k]; if (m.group !== undefined) R.tags[m.group] = R.tags[m.group] || { active: false, closed: false, t: 0 }; if (m.order !== undefined) { const C = R.comp[m.cg || 0] = R.comp[m.cg || 0] || { t: -1, n: 0, built: 0, said: false }; C.n = Math.max(C.n, m.order + 1); } }
    // Drapeau du mode facile
    if (easy() && B.cp && mode !== 'versus') R.cpFlag = makeCheckpointFlag(B.cp, group);
    // Marques de mort (croix rouges) et fantôme
    R.markGroup = new THREE.Group(); group.add(R.markGroup);
    R.hasAB = B.grid.some((row) => row.includes('K') || row.includes('Q'));
    if (def.boss === 'bug') R.boss = makeBug(group);
    else if (def.boss === 'exam') R.boss = makeExam(group);
    else if (def.boss === 'zeus') R.boss = makeZeus(group);
    else if (def.boss === 'rumeur') R.boss = makeRumeurBoss(group);
    else if (def.boss) R.boss = makeBoss(group);
    // version 1.5 : les modules complètent le niveau (gadgets, secrets, mécanismes coop…)
    R.building = true;
    EXT.run('build', R, PX);
    R.building = false;
    extLists();
    return R;
  }
  // version 1.5 : la liste des types de modules présents dans ce niveau (pour ne pas tout parcourir)
  function extLists() {
    R.extUpd = []; R.extSolid = [];
    for (const name in EXT.types) {
      if (!R.ents[name]) continue;
      const d = EXT.types[name];
      if (d.update) R.extUpd.push([name, d]);
      if (d.solids) R.extSolid.push([name, d]);
    }
  }

  /* --- Tuiles spéciales --- */
  function makeSpecialTile(c, x, y, group) {
    const MAT = M.MAT;
    const t = { ch: c, ch0: c, x, y, state: 'idle', t: 0, oy: 0, vy: 0, mesh: null };
    const TM = R.TM, meta = R.meta[x + ',' + y] || {};
    if (EXT.tiles[c]) {
      // version 1.5 : une tuile d'un module (js/pieges3.js…) : il fabrique lui-même son mesh
      t.ext = EXT.tiles[c]; t.meta = meta;
      EXT.safe('tile ' + c, () => t.ext.make(t, PX));
      if (!t.mesh) t.mesh = new THREE.Group();
      t.mesh.position.set(x, y, 0);
      group.add(t.mesh);
      return t;
    }
    if (c === '=') { t.mesh = new THREE.Mesh(M.slabGeo(1), [TM.rust, TM.rust]); if (meta.delay) t.delay = meta.delay; }
    else if (c === '~') {
      t.mesh = new THREE.Mesh(M.slabGeo(1), [TM.plate, TM.top]);
      if (meta.hint) {   // version 1.3 : une fine fissure sur le dessus (l'indice d'un sol piégé)
        const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.06), new THREE.MeshBasicMaterial({ color: 0x120c08, transparent: true, opacity: 0.7, depthWrite: false }));
        crack.rotation.x = -Math.PI / 2; crack.rotation.z = 0.35 + ((x * 7) % 5) * 0.12; crack.position.set(0.5, 1.012, 0.2 - (x % 3) * 0.2); t.mesh.add(crack);
      }
    }
    else if (c === 'X') {
      // bloc qui apparaît / disparaît en rythme : glitch dans le Code, ailleurs une plaque lumineuse du monde
      const xm = R.theme === 'code' || !R.theme ? MAT.glitch.clone() : (() => {
        const col = { forge: 0xffa040, lab: 0x7fffe8, nexus: 0xc78bff, city: 0xffd23f }[R.theme] || 0x2ff3ff;
        return new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, transparent: true, opacity: 0.85, roughness: 0.3 });
      })();
      t.mesh = new THREE.Mesh(M.slabGeo(1), xm); t.phase = meta.phase || 0; t.period = meta.period || 2.4; t.on = true;
    }
    else if (c === 'Z') {
      // sol brûlant : toutes les tuiles d'un même rythme partagent un matériau (il rougeoit avant de brûler)
      R.heatGroups = R.heatGroups || [];
      const per = meta.period || 3, ph = meta.phase || 0;
      let hg = R.heatGroups.find((g) => g.period === per && g.phase === ph);
      if (!hg) { hg = { period: per, phase: ph, hot: meta.hot || 0.9, tiles: [], mat: new THREE.MeshStandardMaterial({ color: 0x3a2a22, emissive: 0xff5a10, emissiveIntensity: 0, roughness: 0.6, metalness: 0.4 }) }; R.heatGroups.push(hg); }
      hg.tiles.push(t); t.hg = hg;
      t.mesh = new THREE.Mesh(M.slabGeo(1), [TM.plate, hg.mat]);
      const grill = new THREE.Mesh(geo13().box, MAT.dark); grill.scale.set(0.9, 0.04, 1.5); grill.position.set(0.5, 1.01, 0); t.mesh.add(grill);
    }
    else if (c === 'G') { const MT = mats13(); t.mesh = new THREE.Mesh(M.slabGeo(1), [MT.gooSide, MT.goo]); R.gooTiles.push(t); R.gooCount++; }
    else if (c === '}' || c === '{') { const MT = mats13(); t.mesh = new THREE.Mesh(M.slabGeo(1), [MAT.dark, c === '}' ? MT.boost : MT.boostL]); }
    else if (c === 'N') {
      const col = LEV_COL[(meta.lg || 0) % LEV_COL.length];
      t.mesh = new THREE.Mesh(M.slabGeo(1), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.5, transparent: true, opacity: 0.9, roughness: 0.35 }));
      t.lg = meta.lg || 0; t.inv = !!meta.inv;
    }
    else if (c === 'T') { t.mesh = new THREE.Mesh(M.slabGeo(1, 0.6), MAT.tag.clone()); t.group = meta.group; t.mesh.position.y = 0.4; }
    else if (c === 'R') t.mesh = new THREE.Mesh(M.slabGeo(1), [MAT.iceSide, MAT.ice]);
    else if (c === 'Y') t.mesh = new THREE.Mesh(M.slabGeo(1), [MAT.bounceSide, MAT.bounce]);
    else if (c === 'P') { t.mesh = new THREE.Mesh(M.slabGeo(1, 0.4), MAT.bridge.clone()); }
    else if (c === 'C') { t.mesh = new THREE.Mesh(M.slabGeo(1), MAT.compiled.clone()); t.order = meta.order || 0; t.cg = meta.cg || 0; t.mesh.visible = false; }
    else if (c === '<' || c === '>') {
      // tapis roulant (Monde 3) : une texture qui défile dans le sens du tapis
      if (!R.beltMats) {
        const mk = () => { const m = MAT.belt.clone(); m.map = MAT.belt.map.clone(); m.map.needsUpdate = true; m.emissiveMap = m.map; return m; };
        R.beltMats = { '<': mk(), '>': mk() };
        R.beltMats['<'].map.repeat.x = -1;
      }
      t.mesh = new THREE.Mesh(M.slabGeo(1), [MAT.beltSide, R.beltMats[c]]);
      t.dir = c === '>' ? 1 : -1;
    }
    else if (c === 'A') {
      // acide (Monde 3) : un bassin vert, mortel
      t.mesh = new THREE.Group();
      const liq = new THREE.Mesh(new THREE.BoxGeometry(1, 0.55, 1.7), MAT.acid); liq.position.set(0.5, 0.27, 0);
      t.mesh.add(liq); t.liq = liq;
    }
    else if (c === 'D') {
      // sol du doute (boss final) : il peut disparaître
      t.mesh = new THREE.Mesh(M.slabGeo(1), [TM.plate.clone(), TM.top]);
    }
    else if (c === 'B') {
      // caisse en bois cassable (activité « Boum ! ») : une bombe la détruit
      t.mesh = new THREE.Group();
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.96, 1.2), crateMat());
      crate.position.set(0.5, 0.48, 0);
      t.mesh.add(crate);
    }
    else if (c === 'K' || c === 'Q') {
      // blocs rose / bleu (Monde 4) : chaque saut change lesquels existent
      if (!R.onMats) R.onMats = { K: MAT.onA.clone(), Q: MAT.onB.clone() };
      t.mesh = new THREE.Mesh(M.slabGeo(1), R.onMats[c]);
    }
    else if (c === 'J') {
      // pics « événement » : cachés dans le sol, ils sortent quand quelqu'un saute
      t.mesh = new THREE.Group();
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 1.6), MAT.dark); slot.position.set(0.5, 0.03, 0);
      const sp = new THREE.Group();
      for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) { const cn = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 6), MAT.spike); cn.position.set(0.27 + i * 0.46, 0.3, -0.6 + k * 0.6); sp.add(cn); }
      sp.scale.y = 0.05; t.mesh.add(slot, sp); t.spikes = sp;
    }
    else if (c === 'f') {
      // faux sol : fissuré dans la Forge ; ailleurs, il ressemble exactement au vrai sol
      const crack = R.theme === 'forge' ? new THREE.MeshStandardMaterial({ map: M.TEX.crack, roughness: 0.55, metalness: 0.45 }) : TM.plate;
      t.mesh = new THREE.Mesh(M.slabGeo(1), [crack, R.theme === 'forge' ? MAT.top : TM.top]);
    } else if (c === 'v') {
      t.mesh = new THREE.Group();
      const b = new THREE.Mesh(M.slabGeo(1, 1, 1.6), [MAT.plate, MAT.top]);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 20), MAT.steel);
      chain.position.set(0.5, 10.9, 0);
      t.mesh.add(b, chain);
    } else if (c === 'o') {
      // faux mur : en Monde 2 il ressemble exactement à un vrai bloc
      const code = R.theme === 'code';
      const fm = new THREE.MeshStandardMaterial({ map: code ? M.TEX.codePlate : M.TEX.fake, emissiveMap: code ? M.TEX.codePlate : null, emissive: code ? 0xffffff : 0x000000, emissiveIntensity: code ? 0.35 : 0, roughness: 0.55, metalness: 0.4, transparent: true });
      t.mesh = new THREE.Mesh(M.slabGeo(1), [fm, new THREE.MeshStandardMaterial({ map: code ? M.TEX.codeTop : M.TEX.top, transparent: true })]);
      t.fadeMats = t.mesh.material;
    } else if (c === 'H' || c === 'h') {
      // La caisse à outils : 'H' cache des pics, 'h' cache une pièce (elles sont IDENTIQUES)
      t.mesh = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.42, 0.6), MAT.red);
      box.position.set(0.5, 0.21, 0); box.castShadow = true;
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.62), new THREE.MeshStandardMaterial({ color: 0xa82a1d, roughness: 0.5 }));
      lid.position.set(0.5, 0.44, 0);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 12, Math.PI), MAT.steel);
      handle.position.set(0.5, 0.47, 0);
      const sp = new THREE.Group();
      for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) {
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.6, 6), MAT.spike);
        s.position.set(0.2 + i * 0.3, 0.3, -0.25 + k * 0.5); sp.add(s);
      }
      sp.scale.y = 0.01; sp.visible = false;
      t.mesh.add(box, lid, handle, sp);
      t.spikes = sp; t.box = box; t.lid = lid; t.handle = handle;
    }
    t.mesh.position.set(x, y + (c === 'T' ? 0.4 : 0), 0);
    t.mesh.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    group.add(t.mesh);
    return t;
  }

  /* --- Décor de fond : à l'intérieur de l'ordinateur (Monde 2) --- */
  function buildCodeBackdrop(group, W, H, idx) {
    const bg = new THREE.Color(0x050a1e).lerp(new THREE.Color(0x14061e), idx / 9);
    scene.background = bg;
    scene.fog = new THREE.Fog(bg, 24, 70);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(W + 120, H + 60), new THREE.MeshBasicMaterial({ map: M.TEX.codeSky, fog: false, toneMapped: false, depthWrite: false }));
    sky.position.set(W / 2, H / 2 + 4, -26); group.add(sky);
    // grille lumineuse au fond
    const grid = new THREE.GridHelper(W + 60, Math.round((W + 60) / 2), 0x2ff3ff, 0x123a6a);
    grid.rotation.x = Math.PI / 2; grid.position.set(W / 2, H / 2, -7); grid.material.transparent = true; grid.material.opacity = 0.35;
    group.add(grid);
    // fenêtres de code qui flottent
    R.gears = [];
    const lines = [['<!DOCTYPE html>', '<body>', '  <h1>Bonjour</h1>', '</body>'], ['p { color: cyan; }', '.porte { display: none; }'], ['if (saut) {', '  pics.sortent();', '} else {', '  pont.apparait();', '}'], ['> npm start', 'ERREUR ligne 42', '> réessaie…'], ['function compile() {', '  return projet;', '}']];
    const cols = ['#2ff3ff', '#ff7ad1', '#ffe66d', '#9dff8a'];
    const n = 3 + Math.floor(W / 20);
    for (let i = 0; i < n; i++) {
      const L2 = lines[i % lines.length];
      const tex = M.canvasTex(512, 64 + L2.length * 40, (g, cw, ch) => {
        g.fillStyle = 'rgba(6,14,40,0.85)'; g.fillRect(0, 0, cw, ch);
        g.fillStyle = '#1d3a7a'; g.fillRect(0, 0, cw, 30);
        ['#ff5a5a', '#ffe66d', '#3cff9a'].forEach((c2, k) => { g.fillStyle = c2; g.beginPath(); g.arc(18 + k * 22, 15, 6, 0, 7); g.fill(); });
        g.font = '700 26px monospace';
        L2.forEach((l, k) => { g.fillStyle = cols[(k + i) % cols.length]; g.fillText(l, 20, 64 + k * 40); });
        g.strokeStyle = '#2ff3ff'; g.lineWidth = 4; g.strokeRect(2, 2, cw - 4, ch - 4);
      });
      const w = 5, h = w * (64 + L2.length * 40) / 512;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.75, toneMapped: false, depthWrite: false }));
      win.position.set((i + 0.5) * (W / n) + (Math.random() - 0.5) * 3, H * 0.45 + (Math.random() - 0.5) * H * 0.5, -9 - Math.random() * 5);
      win.userData.speed = 0; win.userData.bob = Math.random() * 6;
      group.add(win); R.gears.push(win);
    }
    // pixels qui montent (au lieu des braises)
    const np = Math.min(400, W * 5);
    const pos = new Float32Array(np * 3);
    for (let i = 0; i < np; i++) { pos[i * 3] = Math.random() * W; pos[i * 3 + 1] = Math.random() * (H + 4); pos[i * 3 + 2] = -5 + Math.random() * 4; }
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    R.embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: 0x2ff3ff, size: 0.11, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    R.embers.userData.H = H + 4; group.add(R.embers);
    // lumières néon
    R.bulbs = [];
    for (let x = 6; x < W; x += 12) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: x % 24 ? 0x2ff3ff : 0xff3fb4, emissive: x % 24 ? 0x2ff3ff : 0xff3fb4, emissiveIntensity: 1.6 }));
      b.position.set(x, H - 1.4, -1.5); group.add(b); R.bulbs.push(b);
    }
  }

  /* --- Monde 2 : balises, liens, bouton COMPILER, rival --- */
  function makeTagPickup(e, group, open) {
    const lab = M.label(e.label, { size: 40, h: 0.5, color: open ? '#2fffa0' : '#ff7ad1', bg: 'rgba(6,14,40,0.9)', border: open ? '#2fffa0' : '#ff7ad1' });
    lab.position.set(e.x + 0.5, e.y + 0.6, 0.3);
    group.add(lab);
    return { x: e.x + 0.5, y: e.y + 0.6, g: e.g, mesh: lab, open, label: e.label, time: e.time };
  }
  function makeLink(e, group) {
    const lab = M.label(e.label, { size: 34, h: 0.42, color: '#7fb8ff', bg: 'rgba(6,14,40,0.9)', border: '#7fb8ff' });
    lab.position.set(e.x + 0.5, e.y + 0.6, 0.3);
    const line = new THREE.Mesh(new THREE.BoxGeometry(lab.geometry.parameters.width * 0.8, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0x7fb8ff, toneMapped: false }));
    line.position.set(e.x + 0.5, e.y + 0.36, 0.32);
    group.add(lab, line);
    return { x: e.x + 0.5, y: e.y + 0.6, tx: e.tx, ty: e.ty, good: e.good, mesh: lab, cool: 0 };
  }
  function makeCompile(e, group) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.9), M.MAT.dark);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.12, 20), new THREE.MeshStandardMaterial({ color: 0x3aff3a, emissive: 0x1a8a1a, emissiveIntensity: 0.8 }));
    cap.position.y = 0.1;
    const lab = M.label(e.label || 'COMPILER', { size: 26, h: 0.26, color: '#9dff8a', bg: 'rgba(6,14,40,0.9)' });
    lab.position.set(0, 0.9, 0.2);
    g.add(base, cap, lab);
    g.position.set(e.x + 0.5, e.y + 0.04, 0);
    group.add(g);
    return { x: e.x, y: e.y, g: e.g || 0, say: e.say, done: e.done, rate: e.rate, mesh: g, cap, pressed: false };
  }
  function makeRival(e, group) {
    const ch = OT.CHARACTERS[e.name] || OT.CHARACTERS.yannick;
    // la « copie » du rival : son vrai visage (l'IA a une tête-écran), en transparent
    const mesh = OT.Chars && OT.Chars.build
      ? (e.name === 'ia' ? M.hero({ char: 'byte', color: ch.color, acc: 'aucun' }, { marker: false }) : OT.Chars.build('npc', { color: ch.color, npc: ch, acc: 'aucun', gad: 'aucun' }, { marker: false }))
      : M.hero({ color: ch.color, acc: 'casquette' }, { marker: false });
    mesh.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; } });
    const tag = M.label(ch.name + ' (copie)', { size: 24, h: 0.22, color: '#ff8a8a', bg: 'rgba(14,11,9,0.7)' });
    tag.position.set(0, 1.65, 0.2); mesh.add(tag);
    mesh.userData.tag = tag;
    group.add(mesh);
    // chemin : liste de cases [x, y] (y = rangée des pieds) ; on vise le centre des cases
    const path = (e.path && e.path.length ? e.path : [[R.spawn.x, R.spawn.y], [R.W - 3, R.spawn.y]]).map(([x, y]) => [x + 0.5, y]);
    return { path, i: 0, x: path[0][0], y: path[0][1], face: 1, speed: (e.speed || 5) * SPEED_SCALE, mesh, done: false, name: ch.name, walk: 0 };
  }
  function makeCheckpointFlag(cp, group) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 8), M.MAT.steel); pole.position.y = 0.85;
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.04), new THREE.MeshStandardMaterial({ color: 0x777777 }));
    flag.position.set(0.34, 1.45, 0);
    g.add(pole, flag);
    g.position.set(cp.x + 0.5, cp.y, -0.4);
    group.add(g);
    return { x: cp.x, y: cp.y, mesh: g, flag };
  }


  /* ==================================================================
     MONDES 3, 4, 5 : lasers, apesanteur, ventilateurs, portails, circulation
     ================================================================== */
  function makeLaser(e, group) {
    const horiz = e.y0 === e.y1;
    const len = horiz ? Math.abs(e.x1 - e.x0) : Math.abs(e.y1 - e.y0);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(horiz ? len : 0.12, horiz ? 0.12 : len, 0.12), M.MAT.laser.clone());
    const cx = horiz ? (e.x0 + e.x1) / 2 : e.x0 + 0.5, cy = horiz ? e.y0 + 0.5 : (e.y0 + e.y1) / 2;
    beam.position.set(cx, cy, 0);
    const em = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.5), M.MAT.dark);
    const em2 = em.clone();
    if (horiz) { em.position.set(Math.min(e.x0, e.x1) - 0.2, cy, 0); em2.position.set(Math.max(e.x0, e.x1) + 0.2, cy, 0); }
    else { em.position.set(cx, Math.min(e.y0, e.y1) - 0.2, 0); em2.position.set(cx, Math.max(e.y0, e.y1) + 0.2, 0); }
    group.add(beam, em, em2);
    const zone = horiz ? { x0: Math.min(e.x0, e.x1), x1: Math.max(e.x0, e.x1), y0: cy - 0.16, y1: cy + 0.16 } : { x0: cx - 0.16, x1: cx + 0.16, y0: Math.min(e.y0, e.y1), y1: Math.max(e.y0, e.y1) };
    return { beam, zone, zone0: Object.assign({}, zone), horiz, cx, cy, len, period: e.period || 2.4, phase: e.phase || 0, on: e.on === undefined ? 0.5 : e.on, active: false, lv: e.lv, inv: !!e.inv, from: e.from || -1, always: e.on === 1 };
  }
  function makeLowG(e, group) {
    const w = e.x1 - e.x0, h = e.y1 - e.y0;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.6), new THREE.MeshBasicMaterial({ color: 0x8fffe8, transparent: true, opacity: 0.08, depthWrite: false, toneMapped: false }));
    m.position.set(e.x0 + w / 2, e.y0 + h / 2, 0);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x8fffe8, transparent: true, opacity: 0.5 }));
    m.add(edge);
    const lab = M.label('APESANTEUR', { size: 22, h: 0.22, color: '#8fffe8', bg: 'rgba(8,30,34,0.8)' });
    lab.position.set(0, h / 2 - 0.25, 0.85); m.add(lab);
    group.add(m);
    return { x0: e.x0, x1: e.x1, y0: e.y0, y1: e.y1, mesh: m };
  }
  function makeFan(e, group) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.25, 20), M.MAT.dark); base.position.set(0.5, 0.12, 0);
    const blades = M.gear(0.7, 4, M.MAT.steel, 0.08); blades.rotation.x = Math.PI / 2; blades.position.set(0.5, 0.27, 0);
    const col = new THREE.Mesh(new THREE.BoxGeometry(2, e.h, 1.2), new THREE.MeshBasicMaterial({ color: 0xbff7ff, transparent: true, opacity: 0.07, depthWrite: false, toneMapped: false }));
    col.position.set(0.5, e.h / 2, 0);
    g.add(base, blades, col);
    g.position.set(e.x, e.y, 0);
    group.add(g);
    return { x: e.x, y: e.y, h: e.h, power: e.power || 70, blades };
  }
  function makePortal(e, group) {
    const col = e.color || 0x3fd8ff;
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 10, 32), new THREE.MeshBasicMaterial({ color: col, toneMapped: false }));
    ring.scale.y = 1.55;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.52, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, toneMapped: false, depthWrite: false }));
    disc.scale.y = 1.55;
    g.add(ring, disc);
    g.position.set(e.x + 0.5, e.y + 0.85, 0.1);
    if (e.label) { const lab = M.label(e.label, { size: 26, h: 0.26, color: '#ffffff', bg: 'rgba(20,8,40,0.85)', border: '#' + new THREE.Color(col).getHexString() }); lab.position.set(0, 1.25, 0.1); g.add(lab); }
    group.add(g);
    return { x: e.x + 0.5, y: e.y, tx: e.tx + 0.5, ty: e.ty, mesh: g, ring, disc, cool: 0, trap: !!e.trap };
  }
  function makeTraffic(e, group, grid) {
    const cars = (e.cars || [{ off: 0, len: 2, h: 0.9 }]).map((c, k) => {
      const g = new THREE.Group();
      const colors = [0xd8392b, 0x2b6fb5, 0xf2c230, 0x34c26b, 0xeeeeee];
      const body = new THREE.Mesh(new THREE.BoxGeometry(c.len, c.h * 0.7, 1.3), new THREE.MeshStandardMaterial({ color: c.color || colors[k % colors.length], roughness: 0.4, metalness: 0.3 }));
      body.position.set(c.len / 2, c.h * 0.45, 0);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(c.len * 0.5, c.h * 0.35, 1.1), new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.1, metalness: 0.5 }));
      cab.position.set(c.len * (e.speed > 0 ? 0.55 : 0.45), c.h * 0.95, 0);
      const wheelG = new THREE.CylinderGeometry(0.2, 0.2, 1.4, 12);
      const w1 = new THREE.Mesh(wheelG, M.MAT.dark); w1.rotation.x = Math.PI / 2; w1.position.set(0.4, 0.2, 0);
      const w2 = w1.clone(); w2.position.x = c.len - 0.4;
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.3), new THREE.MeshBasicMaterial({ color: 0xfff2b0, toneMapped: false }));
      lamp.position.set(e.speed > 0 ? c.len : 0, c.h * 0.45, 0.45);
      g.add(body, cab, w1, w2, lamp);
      g.traverse((o) => (o.castShadow = true));
      group.add(g);
      return { off: c.off, len: c.len, h: c.h, mesh: g, x: 0, near: false };
    });
    // la chaussée (asphalte + pointillés) et un feu tricolore à chaque bout : on voit où roulent les voitures
    const span = e.x1 - e.x0;
    const road = new THREE.Mesh(new THREE.BoxGeometry(span, 0.04, 1.5), new THREE.MeshStandardMaterial({ color: 0x15151b, roughness: 0.95 }));
    road.position.set(e.x0 + span / 2, e.y + 0.02, 0); road.receiveShadow = true; group.add(road);
    const dashM = new THREE.MeshBasicMaterial({ color: 0xf2e6c0 }), dashG = new THREE.BoxGeometry(0.7, 0.05, 0.08);
    for (let x = e.x0 + 0.6; x < e.x1 - 0.5; x += 1.6) { const d = new THREE.Mesh(dashG, dashM); d.position.set(x + 0.35, e.y + 0.03, 0); group.add(d); }
    const lamps = [];
    for (const ex of [e.x0, e.x1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), M.MAT.steel); pole.position.set(ex, e.y + 1.1, -0.95);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.2), M.MAT.dark); box.position.set(ex, e.y + 2.3, -0.95);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0x2fe070, toneMapped: false })); lamp.position.set(ex, e.y + 2.5, -0.83);
      const lamp2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0x3a2a10, toneMapped: false })); lamp2.position.set(ex, e.y + 2.1, -0.83);
      group.add(pole, box, lamp, lamp2);
      lamps.push({ x: ex, red: lamp, amber: lamp2 });
    }
    // les abribus : un toit (les blocs au-dessus de la route), une vitre au fond, un panneau BUS.
    // Dessous, on est sur le trottoir : les voitures passent devant sans nous toucher.
    const shelters = [];
    const row = grid && grid[e.y + 1];
    if (row) for (let x = Math.ceil(e.x0); x < e.x1; x++) {
      if (row[x] !== '#' || (row[x - 1] === '#' && x - 1 >= e.x0)) continue;
      let x2 = x; while (row[x2 + 1] === '#' && x2 + 1 < e.x1) x2++;
      shelters.push({ x0: x, x1: x2 + 1 });
      const w = x2 + 1 - x;
      const glass = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.95, 0.05), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.35, roughness: 0.1 }));
      glass.position.set(x + w / 2, e.y + 0.5, -1.25); group.add(glass);
      for (const px of [x + 0.08, x + w - 0.08]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, 0.08), M.MAT.steel); post.position.set(px, e.y + 0.5, -0.75); group.add(post); }
      const bus = M.label('BUS', { size: 26, h: 0.3, color: '#ffffff', bg: 'rgba(30,90,200,0.95)' });
      bus.position.set(x + w / 2, e.y + 1.5, 0.93); group.add(bus);   // sur la façade du toit
    }
    return { y: e.y, x0: e.x0, x1: e.x1, speed: e.speed, cars, shelters, lamps };
  }
  // un joueur debout sous un abribus est sur le trottoir : les voitures ne le touchent pas
  function underShelter(p) {
    for (const tr of R.ents.traffic || []) {
      if (Math.abs(p.y - tr.y) > 0.3) continue;
      for (const s of tr.shelters) if (p.x - 0.3 >= s.x0 - 0.05 && p.x + 0.3 <= s.x1 + 0.05) return true;
    }
    return false;
  }

  function updateNewStuff(alive, dt) {
    if (R.blackout > 0) R.blackout = Math.max(0, R.blackout - dt);
    if (R.blackoutTotal > 0) R.blackoutTotal = Math.max(0, R.blackoutTotal - dt);
    // blocs roses / bleus
    if (R.onMats) {
      const K = R.onMats.K, Q = R.onMats.Q;
      // BLACKOUT de Win Black : tous les blocs solides, sans courant (éteints), ils grésillent avant le retour du courant
      const bo = R.blackout > 0, warn = bo && R.blackout < 1.5 && Math.sin(time * 30) > 0;
      const k = R.ab === 0 || bo, q = R.ab === 1 || bo;
      K.opacity += ((k ? 1 : 0.16) - K.opacity) * Math.min(1, dt * 20); K.emissiveIntensity = bo ? (warn ? 0.7 : 0.02) : k ? 0.6 : 0.1;
      Q.opacity += ((q ? 1 : 0.16) - Q.opacity) * Math.min(1, dt * 20); Q.emissiveIntensity = bo ? (warn ? 0.7 : 0.02) : q ? 0.6 : 0.1;
      K.depthWrite = k; Q.depthWrite = q;
    }
    // tapis roulants (la texture défile)
    if (R.beltMats) { R.beltMats['>'].map.offset.x -= dt * 1.7; R.beltMats['<'].map.offset.x -= dt * 1.7; }
    // acide
    for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) {
      const t = R.tiles[y][x];
      if (!t || t.ch !== 'A') continue;
      t.liq.position.y = 0.27 + Math.sin(time * 3 + x) * 0.02;
      if (Math.random() < 0.01) particles.burst(x + 0.5, y + 0.6, 1, 0xb6ff3a, 1, { grav: -0.3, life: 0.6, size: 0.8 });
      const zone = { x0: x + 0.05, y0: y, x1: x + 0.95, y1: y + 0.5 };
      for (const p of alive) if (overlap(pbox(p), zone)) { particles.burst(p.x, p.y + 0.3, 14, [0xb6ff3a, 0x2f8a00], 5, { up: 2 }); kill(p, 'acid'); }
    }
    // lasers
    for (const L of R.ents.laser || []) {
      const ph = (TT(L) + L.phase) % L.period, onLen = L.period * L.on;   // (1.5 : TT = son horloge, figée par COMPILER)
      let on = ph < onLen && !(R.blackout > 0) && !(R.blackoutTotal > 0);   // BLACKOUT : plus de courant
      if (L.lv !== undefined && levOn(L.lv, L.inv)) on = false;               // version 1.3 : coupé par un levier
      // version 1.3 : une caisse sur le trajet arrête le rayon (on s'abrite derrière)
      if (R.ents.crate) {
        const z0 = L.zone0; Object.assign(L.zone, z0);
        let cut = null;
        for (const c of R.ents.crate) if (c.alive && overlap(crateBox(c), z0)) {
          const v = L.horiz ? (L.from < 0 ? c.x : c.x + c.w) : (L.from < 0 ? c.y : c.y + c.h);
          if (cut === null || (L.from < 0 ? v < cut : v > cut)) cut = v;
        }
        if (cut !== null) {
          if (L.horiz) { if (L.from < 0) L.zone.x1 = cut; else L.zone.x0 = cut; }
          else { if (L.from < 0) L.zone.y1 = cut; else L.zone.y0 = cut; }
        }
        const l2 = L.horiz ? Math.max(0.01, L.zone.x1 - L.zone.x0) : Math.max(0.01, L.zone.y1 - L.zone.y0);
        L.cutK = l2 / L.len;
        if (L.horiz) L.beam.position.x = (L.zone.x0 + L.zone.x1) / 2; else L.beam.position.y = (L.zone.y0 + L.zone.y1) / 2;
      }
      const warn = !on && ph > L.period - 0.4;
      if (on && !L.active) for (const p of alive) if (Math.abs(p.x - (L.zone.x0 + L.zone.x1) / 2) < 4) OT.Input.rumble(p.i, 0, 0.2, 60);
      L.active = on;
      L.beam.visible = on || (warn && Math.sin(time * 40) > 0);
      L.beam.material.opacity = on ? 0.95 : 0.3;
      L.beam.scale.set((on ? 1 : 0.4) * (L.horiz ? (L.cutK || 1) : 1), (on ? 1 : 0.4) * (L.horiz ? 1 : (L.cutK || 1)), 1);
      if (on && !FZ(L)) for (const p of alive) if (overlap(pbox(p), L.zone)) { OT.Sound.zap(); kill(p, 'laser'); }
    }
    // bulles d'apesanteur
    for (const z of R.ents.lowg || []) if (Math.random() < 0.15) particles.burst(z.x0 + Math.random() * (z.x1 - z.x0), z.y0 + 0.2, 1, 0x8fffe8, 0.6, { grav: -0.15, life: 1.4, size: 0.7 });
    // ventilateurs
    for (const f of R.ents.fan || []) {
      f.blades.rotation.y += dt * 18;
      if (Math.random() < 0.5) particles.burst(f.x - 0.3 + Math.random() * 1.6, f.y + 0.4, 1, 0xdff9ff, 0.5, { grav: -0.9, life: 0.8, size: 0.6 });
    }
    // portails : on entre d'un côté, on ressort de l'autre en gardant son élan
    for (const pt of R.ents.portal || []) {
      pt.ring.rotation.z += dt * (pt.trap ? -2 : 2);
      // l'indice d'un portail piège : il vacille et tourne à l'envers
      if (pt.trap) pt.disc.material.opacity = Math.sin(time * 9 + pt.x) > 0.75 ? 0.08 : 0.35;
      for (const p of alive) {
        if ((p.portalCool || 0) > 0) continue;
        if (Math.abs(p.x - pt.x) < 0.45 && p.y < pt.y + 1.4 && p.y + p.h > pt.y + 0.2) {
          particles.burst(p.x, p.y + 0.5, 12, [0x3fd8ff, 0xff7ad1, 0xffffff], 5, { grav: 0, life: 0.4 });
          p.x = pt.tx + Math.sign(p.vx || p.face) * 0.6; p.y = pt.ty;
          p.portalCool = 0.5; p.standOn = null;
          particles.burst(p.x, p.y + 0.5, 12, [0x3fd8ff, 0xff7ad1, 0xffffff], 5, { grav: 0, life: 0.4 });
          OT.Sound.whoosh(); OT.Input.rumble(p.i, 0, 0.4, 100);
          heroOnce(pt.trap || pt.tx < pt.x - 1.5 ? 'h_portal_trap' : 'h_portal', p);
        }
      }
    }
    for (const p of players) p.portalCool = Math.max(0, (p.portalCool || 0) - dt);
    // circulation (Monde 5) : les voitures arrivent d'une rue de côté (au fond, on les voit venir),
    // tournent sur la route, la traversent, puis repartent au fond. On saute par-dessus, ou on s'abrite.
    const APPROACH = 6, LEAVE = 3;
    for (const tr of R.ents.traffic || []) {
      const span = tr.x1 - tr.x0, per = span + Math.max(...tr.cars.map((c) => c.len)) + APPROACH + LEAVE;   // même période : l'écart entre voitures ne change jamais
      let warn = false;
      for (const c of tr.cars) {
        let u = ((-Math.abs(TT(tr) * tr.speed) + c.off) % per + per) % per;
        u = per - u;
        c.x = tr.speed > 0 ? tr.x0 - APPROACH - c.len + u : tr.x1 + APPROACH - u;
        // distance hors de la route, côté entrée (e1) et côté sortie (e0)
        const e1 = tr.speed > 0 ? tr.x0 - (c.x + c.len) : c.x - tr.x1;
        const e0 = tr.speed > 0 ? c.x - tr.x1 : tr.x0 - (c.x + c.len);
        const out = Math.max(e1, e0, 0);
        const z = -Math.min(2.6, out * 0.9);
        if (e1 > 0 && e1 < APPROACH - 0.5) warn = true;
        c.mesh.position.set(c.x, tr.y, z);
        c.mesh.rotation.y = out > 0 && out < 3 ? (e1 > 0 ? 1 : -1) * Math.sign(tr.speed) * 0.35 * Math.min(1, out) : 0;
        c.mesh.visible = e1 < APPROACH - 0.2 && e0 < LEAVE - 0.2;
        const zone = { x0: Math.max(c.x + 0.1, tr.x0), y0: tr.y, x1: Math.min(c.x + c.len - 0.1, tr.x1), y1: tr.y + c.h };
        if (!c.mesh.visible || z < -0.3 || zone.x1 <= zone.x0) { c.near = false; continue; }
        for (const p of alive) {
          if (overlap(pbox(p), zone) && !underShelter(p) && !FZ(tr)) { OT.Sound.boom(); particles.burst(p.x, p.y + 0.5, 20, [p.color, 0xffffff], 8, { up: 2 }); kill(p, 'crush'); }
          const near = Math.abs(p.x - (c.x + c.len / 2)) < c.len / 2 + 1.5 && Math.abs(p.y - tr.y) < 2;
          if (near && !c.near) OT.Input.rumble(p.i, 0.25, 0.25, 140);
          c.near = near;
        }
      }
      // le feu de l'entrée clignote en orange quand une voiture arrive
      const entry = tr.lamps[tr.speed > 0 ? 0 : 1];
      if (entry) {
        const blink = warn && Math.floor(time * 6) % 2 === 0;
        entry.amber.material.color.setHex(blink ? 0xffb020 : 0x3a2a10);
        entry.red.material.color.setHex(warn ? 0x0a3018 : 0x2fe070);
      }
    }
  }

  /* --- Lumières selon le monde --- */
  function applyThemeLights(theme) {
    const L = {
      forge: [0xffe3c4, 0x1c120d, 0.75, 0xffe6c8, 1.15, 0xff9a50, 0.7, 0xffa860],
      code: [0xd6e6ff, 0x0b1022, 0.75, 0xeef4ff, 1.05, 0x2ff3ff, 0.6, 0x9fc8ff],
      lab: [0xf2fbff, 0x2c4448, 0.95, 0xffffff, 1.1, 0x7fffe8, 0.5, 0xc8fbff],
      nexus: [0xe6d1ff, 0x1a0a30, 0.8, 0xffe0ff, 0.95, 0xff7ad1, 0.8, 0xc6a2ff],
      city: [0xffe0c0, 0x2a1a20, 0.85, 0xffc890, 1.15, 0xff7a3a, 0.8, 0xffd28a],
    }[theme] || null;
    if (!L) return;
    hemi.color.set(L[0]); hemi.groundColor.set(L[1]); hemi.intensity = L[2];
    sun.color.set(L[3]); sun.intensity = L[4];
    rim.color.set(L[5]); rim.intensity = L[6];
    lampA.color.set(L[7]);
  }

  /* --- Décors de fond des Mondes 3, 4, 5 --- */
  function backdropSky(group, W, H, tex, bgHex, fogNear) {
    const bg = new THREE.Color(bgHex);
    scene.background = bg;
    scene.fog = new THREE.Fog(bg, fogNear || 24, 72);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(W + 120, H + 60), new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false, depthWrite: false }));
    sky.position.set(W / 2, H / 2 + 4, -26); group.add(sky);
  }
  function floaters(group, W, H, color, size) {
    const n = Math.min(400, W * 5);
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = Math.random() * W; pos[i * 3 + 1] = Math.random() * (H + 4); pos[i * 3 + 2] = -5 + Math.random() * 4; }
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    R.embers = new THREE.Points(eg, new THREE.PointsMaterial({ color, size: size || 0.09, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    R.embers.userData.H = H + 4; group.add(R.embers);
  }
  function buildLabBackdrop(group, W, H, idx) {
    backdropSky(group, W, H, M.TEX.labSky, new THREE.Color(0x10262c).lerp(new THREE.Color(0x0c1a2a), idx / 9).getHex(), 26);
    // mur carrelé
    const wt = M.TEX.labPlate.clone(); wt.needsUpdate = true; wt.repeat.set((W + 40) / 2, (H + 16) / 2);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(W + 40, H + 16), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.6, color: 0x9fb8bc }));
    wall.position.set(W / 2, H / 2, -6.5); group.add(wall);
    // grands tubes à essai et ballons de verre avec du liquide coloré
    R.gears = [];
    const liquids = [0x3cff9a, 0xff5ab4, 0x5ad1ff, 0xffd23a];
    for (let i = 0; i < 3 + Math.floor(W / 14); i++) {
      const x = (i + 0.5) * (W / (3 + Math.floor(W / 14))) + (Math.random() - 0.5) * 3;
      const h = 3 + Math.random() * 4, r = 0.5 + Math.random() * 0.5;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20, 1, true), M.MAT.glass);
      tube.position.set(x, h / 2, -4.5);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, h * 0.55, 20), new THREE.MeshStandardMaterial({ color: liquids[i % 4], emissive: liquids[i % 4], emissiveIntensity: 0.5, transparent: true, opacity: 0.75 }));
      liq.position.set(x, h * 0.28, -4.5);
      group.add(tube, liq);
    }
    // molécules qui tournent au loin
    for (let i = 0; i < 3 + Math.floor(idx / 3); i++) {
      const mol = new THREE.Group();
      const atom = new THREE.SphereGeometry(0.35, 14, 10);
      const cols = [0xff5a5a, 0xffffff, 0x5a8aff];
      const pts = [[0, 0, 0], [1.1, 0.6, 0], [-1.1, 0.6, 0], [0, -1.2, 0.3]];
      pts.forEach((pp, k) => { const a = new THREE.Mesh(atom, new THREE.MeshStandardMaterial({ color: cols[k % 3], roughness: 0.3 })); a.position.set(...pp); mol.add(a); if (k) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, Math.hypot(...pp)), M.MAT.steel); b.position.set(pp[0] / 2, pp[1] / 2, pp[2] / 2); b.lookAt(pp[0], pp[1], pp[2]); b.rotateX(Math.PI / 2); mol.add(b); } });
      mol.position.set((i + 0.5) * (W / (3 + Math.floor(idx / 3))), H * 0.6 + (Math.random() - 0.5) * H * 0.4, -12 - Math.random() * 6);
      mol.scale.setScalar(1.4 + Math.random());
      mol.userData.speed = 0.3 + Math.random() * 0.3;
      group.add(mol); R.gears.push(mol);
    }
    floaters(group, W, H, 0x8fffe8, 0.08);
    R.bulbs = [];
    for (let x = 6; x < W; x += 12) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdffcff, emissiveIntensity: 1.6 }));
      b.position.set(x, H - 1.3, -1.5); group.add(b); R.bulbs.push(b);
    }
  }
  function buildNexusBackdrop(group, W, H, idx) {
    backdropSky(group, W, H, M.TEX.nexSky, new THREE.Color(0x0c0420).lerp(new THREE.Color(0x200a2a), idx / 9).getHex(), 28);
    // îles qui flottent et réseau de nœuds lumineux reliés
    R.gears = [];
    const nodes = [];
    for (let i = 0; i < 6 + Math.floor(W / 10); i++) {
      const p = new THREE.Vector3(Math.random() * (W + 20) - 10, Math.random() * (H + 6), -10 - Math.random() * 10);
      nodes.push(p);
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.16 + Math.random() * 0.2, 10, 8), new THREE.MeshBasicMaterial({ color: [0xff7ad1, 0x5ad1ff, 0xc78bff][i % 3], toneMapped: false }));
      s.position.copy(p); group.add(s);
    }
    const pts = [];
    nodes.forEach((a, i) => { const b = nodes[(i * 7 + 3) % nodes.length], c = nodes[(i + 1) % nodes.length]; pts.push(a, b, a, c); });
    const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xb78cff, transparent: true, opacity: 0.35 }));
    group.add(lines);
    for (let i = 0; i < 3 + Math.floor(W / 20); i++) {
      const isl = new THREE.Group();
      const rock = new THREE.Mesh(new THREE.ConeGeometry(2 + Math.random() * 2, 3 + Math.random() * 2, 7), new THREE.MeshStandardMaterial({ color: 0x2a1a4a, roughness: 0.8 }));
      rock.rotation.x = Math.PI;
      const grass = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 7), new THREE.MeshStandardMaterial({ color: 0x7a4fd6, emissive: 0x3a1a8a, emissiveIntensity: 0.4 }));
      grass.position.y = 1.6;
      isl.add(rock, grass);
      isl.position.set((i + 0.5) * (W / (3 + Math.floor(W / 20))), H * 0.5 + (Math.random() - 0.3) * H * 0.5, -16 - Math.random() * 6);
      isl.userData.speed = 0; isl.userData.bob = Math.random() * 6;
      group.add(isl); R.gears.push(isl);
    }
    floaters(group, W, H, 0xffd2ff, 0.1);
    R.bulbs = [];
  }
  function buildCityBackdrop(group, W, H, idx) {
    backdropSky(group, W, H, M.TEX.citySky, new THREE.Color(0x2a1428).lerp(new THREE.Color(0x140c1e), idx / 9).getHex(), 30);
    // la ville : immeubles éclairés (Douala au coucher du soleil), grues de chantier
    R.gears = [];
    const winTex = M.TEX.windows;
    // version 1.3 (grands niveaux) : les immeubles partagent une boîte et quelques matériaux
    // (avant : une texture + un matériau par immeuble, soit des centaines sur un long niveau)
    const box = new THREE.BoxGeometry(1, 1, 2), mats = {};
    const matFor = (layer, rx, ry) => {
      const key = layer + ':' + rx + ':' + ry;
      if (!mats[key]) {
        const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
        mats[key] = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: layer ? 0.22 : 0.3, roughness: 0.8, color: layer ? 0x4a4250 : 0x7a7080 });
      }
      return mats[key];
    };
    for (let layer = 0; layer < 2; layer++) {
      const z = layer ? -21 : -12;
      for (let x = -12; x < W + 12; x += (layer ? 3 : 5) + Math.random() * 4) {
        const rx = 1 + Math.floor(Math.random() * 3), ry = (layer ? 3 : 1) + Math.floor(Math.random() * (layer ? 5 : 3));
        const w = rx * 1.6 * (0.9 + Math.random() * 0.2), h = ry * 3 * (0.9 + Math.random() * 0.2);
        const b = new THREE.Mesh(box, matFor(layer, rx, ry));
        b.scale.set(w, h, 1);
        b.position.set(x, h / 2 - 1, z);
        group.add(b);
      }
    }
    for (let i = 0; i < 2 + Math.floor(W / 30); i++) {
      const cr = new THREE.Group();
      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.4, 16, 0.4), M.MAT.scaffold); mast.position.y = 8;
      const jib = new THREE.Mesh(new THREE.BoxGeometry(10, 0.35, 0.35), M.MAT.scaffold); jib.position.set(2.5, 16, 0);
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 5), M.MAT.dark); cable.position.set(6, 13.5, 0);
      cr.add(mast, jib, cable);
      cr.position.set((i + 0.6) * (W / (2 + Math.floor(W / 30))), -1, -13);
      group.add(cr);
    }
    floaters(group, W, H, 0xffc890, 0.07);
    R.bulbs = [];
    for (let x = 4; x < W; x += 10) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2), M.MAT.dark); pole.position.set(x, 1.6, -2.2);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), MAT_LAMP()); lamp.position.set(x, 3.25, -2.2);
      group.add(pole, lamp); R.bulbs.push(lamp);
    }
  }
  let _lampMat = null;
  function MAT_LAMP() { return _lampMat || (_lampMat = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffc860, emissiveIntensity: 1.6 })); }

  /* --- Décor de fond : la forge --- */
  function buildBackdrop(group, W, H, idx) {
    const MAT = M.MAT;
    const k = idx / 9;  // l'atelier devient plus fantastique niveau après niveau
    const bg = new THREE.Color(0x120c0a).lerp(new THREE.Color(0x1a0d14), k);
    scene.background = bg;
    scene.fog = new THREE.Fog(bg, 24, 70);
    // ciel dégradé tout au fond
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(W + 120, H + 60), new THREE.MeshBasicMaterial({ map: M.TEX.forgeSky, fog: false, toneMapped: false, depthWrite: false }));
    sky.position.set(W / 2, H / 2 + 4, -26);
    group.add(sky);
    // mur de grands panneaux
    const wallTex = M.TEX.wall.clone(); wallTex.needsUpdate = true;
    wallTex.repeat.set((W + 40) / 3, (H + 16) / 3);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(W + 40, H + 16), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95, metalness: 0.1 }));
    wall.position.set(W / 2, H / 2, -6.5);
    wall.receiveShadow = false;   // pas d'ombres géantes sur le mur du fond
    group.add(wall);
    // poutres verticales régulières (rythme propre)
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x1c1512, roughness: 0.7, metalness: 0.5 });
    for (let x = 0; x < W + 8; x += 8) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.5, H + 12, 0.5), beamMat);
      beam.position.set(x - 2, H / 2, -6.1);
      group.add(beam);
    }
    // grands engrenages lointains, sombres, dans le brouillard
    R.gears = [];
    const nGears = 3 + Math.floor(idx / 2);
    for (let i = 0; i < nGears; i++) {
      const r = 1.6 + Math.random() * (1.4 + idx * 0.3);
      const gm = new THREE.MeshStandardMaterial({ color: i % 2 ? 0x6e5232 : 0x4a4038, metalness: 0.8, roughness: 0.45 });
      const gr = M.gear(r, 10 + Math.floor(r * 4), gm, 0.4);
      gr.position.set((i + 0.5) * (W / nGears) + (Math.random() - 0.5) * 4, H * 0.55 + (Math.random() - 0.5) * H * 0.6, -14 - Math.random() * 6);
      gr.userData.speed = (i % 2 ? -1 : 1) * (0.15 + Math.random() * 0.3) / r;
      group.add(gr); R.gears.push(gr);
    }
    // rayons de lumière depuis le haut
    for (let i = 0; i < Math.ceil(W / 18); i++) {
      const shaft = new THREE.Mesh(new THREE.PlaneGeometry(3.2, H + 6), new THREE.MeshBasicMaterial({ map: M.TEX.shaft, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      shaft.position.set(9 + i * 18, H / 2 + 1, -4.5);
      shaft.rotation.z = -0.22;
      group.add(shaft);
    }
    // braises qui montent (ambiance forge)
    const n = Math.min(400, W * 5);
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = Math.random() * W; pos[i * 3 + 1] = Math.random() * (H + 4); pos[i * 3 + 2] = -5 + Math.random() * 4; }
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    R.embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xff9a40, size: 0.09, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    R.embers.userData.H = H + 4;
    group.add(R.embers);
    // lampes d'atelier
    R.bulbs = [];
    for (let x = 6; x < W; x += 12) {
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.3, 16, 1, true), MAT.dark);
      shade.position.set(x, H - 1.5, -1.5);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), MAT.glowOrange);
      b.position.set(x, H - 1.65, -1.5);
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2), MAT.dark);
      wire.position.set(x, H - 0.8, -1.5);
      group.add(shade, b, wire); R.bulbs.push(b);
    }
  }

  /* --- Entités --- */
  function makeNPC(e, group) {
    const ch = OT.CHARACTERS[e.id];
    let m;
    if (ch.char && OT.Chars) {
      // un personnage JOUABLE croisé dans l'histoire (ex. God Love) : son vrai modèle, animé
      m = new THREE.Group();
      const hero = M.hero({ char: ch.char, color: ch.color, acc: 'aucun', gad: 'aucun' }, { marker: false });
      m.add(hero);
      const name = M.label(ch.name, { size: 26, h: 0.24, color: '#f3ead9', bg: 'rgba(14,11,9,0.72)' });
      name.position.set(0, (hero.userData.height || 1.3) + 0.3, 0.3); m.add(name);
      m.userData = { body: hero, head: new THREE.Object3D(), name, anim: OT.Anim ? OT.Anim.create(hero) : null, hero };
    } else m = M.person(ch);
    m.position.set(e.x + 0.5, e.y, -0.85);
    m.rotation.y = 0.35;
    if (e.id === 'rumeur') {
      const q = M.label('?', { bg: 'none', color: '#b78cff', size: 56, h: 0.5 });
      q.position.set(0, 2.0, 0.2); m.add(q); m.userData.q = q;
    }
    group.add(m);
    return { id: e.id, talk: e.talk || e.id, x: e.x + 0.5, y: e.y, mesh: m, prompt: null, promptKey: '', text: e.text, saidT: 0 };
  }

  function makeSign(e, group) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.15, 0.08), M.MAT.dark);
    post.position.y = 0.57;
    // écran de diagnostic : texte vert sur fond noir
    const lab = M.label(e.text, { size: 30, h: 0.32, color: '#7dffb0', bg: 'rgba(6,14,10,0.95)', border: '#2e6b45' });
    lab.position.set(0, 1.32, 0.06);
    g.add(post, lab);
    g.position.set(e.x + 0.5, e.y, -0.95);
    group.add(g);
    return { x: e.x, mesh: g };
  }

  function makeDoor(e, group, fake) {
    const g = M.door(e.label);
    g.position.set(e.x + 0.5, e.y, -0.5);
    group.add(g);
    // couleur de la lumière : vert = sortie, bleu = porte de zone (point de reprise), rouge pâle = porte piège
    const col = e.to ? (e.trap ? 0xff8a5a : 0x5fd4ff) : 0x3cff9a;
    const light = new THREE.PointLight(col, 0.7, 5, 2);
    light.position.set(0, 1.2, 1.2);
    g.add(light);
    if (e.to && !e.trap) {
      const tag = M.label(e.zoneN ? `ZONE ${e.zoneN} ➜` : 'SUITE ➜', { size: 22, h: 0.2, color: '#5fd4ff', bg: 'rgba(6,14,30,0.85)', border: '#5fd4ff' });
      tag.position.set(0, 2.22, 0.34); g.add(tag);
    }
    return { x: e.x, y: e.y, ox: e.x, oy: e.y, tx: e.x, mesh: g, needsPart: !!e.needsPart, needsCoins: e.needsCoins || 0, fake, light, portal: g.userData.portal, portalTex: g.userData.portalTex, hops: e.hops || null, hopI: 0, hopT: 0, sayT: 0,
      to: e.to || null, trap: !!e.trap, arena: !!e.arena, zoneSay: e.zoneSay || null, zoneN: e.zoneN || 0, zoneName: e.zoneName || '', zoneGoal: e.zoneGoal || '' };
  }

  function makeSpring(e, group, wrench) {
    const MAT = M.MAT;
    const g = new THREE.Group();
    if (wrench) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.09, 0.15), MAT.steel);
      handle.position.set(0, 0.07, 0); handle.rotation.y = 0.3;
      const jaw = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.05, 6, 12, 4.5), MAT.steel);
      jaw.rotation.x = Math.PI / 2; jaw.position.set(0.4, 0.07, 0.12);
      g.add(handle, jaw);
    } else {
      const coil = new THREE.Mesh(new THREE.TorusKnotGeometry(0.2, 0.045, 40, 6, 1, 6), MAT.steel);
      coil.scale.y = 0.6; coil.position.y = 0.18;
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), MAT.red);
      top.position.y = 0.38;
      g.add(coil, top);
    }
    g.position.set(e.x + 0.5, e.y, 0);
    g.traverse((o) => (o.castShadow = true));
    group.add(g);
    return { x: e.x, y: e.y, mesh: g, wrench, t: 0 };
  }

  function makeButton(e, group) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.9), M.MAT.dark);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.12, 20), M.MAT.red.clone());
    cap.position.y = 0.1;
    const g = new THREE.Group(); g.add(base, cap);
    g.position.set(e.x + 0.5, e.y + 0.04, 0);
    group.add(g);
    return { x: e.x, y: e.y, mesh: g, cap, hold: 0, pressed: false, long: !!e.long, time: e.time || 0, g: e.g };
  }

  function makeGate(e, group) {
    const h = e.y1 - e.y + 1;
    const tex = M.TEX.stripe.clone(); tex.needsUpdate = true; tex.repeat.set(1, h);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 1.8), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 }));
    m.position.set(e.x + 0.5, e.y + h / 2, 0);
    m.castShadow = true;
    group.add(m);
    return { x: e.x, y: e.y, h, mesh: m, open: 0, all: !!e.all, lv: e.lv, inv: !!e.inv, g: e.g };
  }

  function makeSwitch(e, group) {
    const MAT = M.MAT;
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.4), MAT.dark);
    base.position.y = 0.25;
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.07), MAT.steel);
    lever.position.set(0, 0.6, 0.1); lever.rotation.z = 0.5;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), MAT.red);
    knob.position.set(0, 0.25, 0); lever.add(knob);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xff3020, emissiveIntensity: 1 }));
    lamp.position.set(0.25, 0.4, 0.22);
    g.add(base, lever, lamp);
    g.position.set(e.x + 0.5, e.y, -0.3);
    group.add(g);
    return { x: e.x, y: e.y, fake: e.fake, mesh: g, lever, lamp, pressed: false };
  }

  function makePart(e, group, fake) {
    const MAT = M.MAT;
    const g = new THREE.Group();
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 18), MAT.brass);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 18), MAT.steel); ring.rotation.x = Math.PI / 2; ring.position.y = 0.1;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 10), MAT.steel); rod.position.y = -0.38;
    g.add(piston, ring, rod);
    g.position.set(e.x + 0.5, e.y + 0.6, 0);
    group.add(g);
    const light = new THREE.PointLight(0xffc860, 0.8, 4, 2);
    g.add(light);
    return { x: e.x + 0.5, y: e.y + 0.6, mesh: g, taken: false, fake };
  }

  function makeCoin(e, group, index) {
    const ghost = who[0] && who[0].collected && who[0].collected.has(index);
    const g = M.coin(ghost);
    g.position.set(e.x + 0.5, e.y + 0.5, 0);
    group.add(g);
    const c = { i: index, x: e.x + 0.5, y: e.y + 0.5, mesh: g, taken: false, ghost, inBox: !!e.inBox, hidden: !!e.inBox, bx: e.x, by: e.y };
    if (c.inBox) g.visible = false;   // cachée dans la caisse jusqu'à ce qu'elle s'ouvre
    return c;
  }

  function makePlat(e, group) {
    const MAT = M.MAT;
    const auto = e.kind === 'M' || e.kind === 'V';
    const g = new THREE.Group();
    let gr;
    if (R.theme === 'code' && auto) {
      // Monde 2 : une petite fenêtre de logiciel qui bouge toute seule
      const top = new THREE.Mesh(M.slabGeo(2, 0.5, 1.6), [MAT.codePlate, MAT.codeTop]);
      top.castShadow = true; top.receiveShadow = true;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2, 0.14, 0.05), new THREE.MeshBasicMaterial({ color: 0x2ff3ff, toneMapped: false }));
      bar.position.set(1, 0.44, 0.83);
      const lab = M.label(e.kind === 'V' ? 'fenêtre ⇅' : 'fenêtre ⇆', { size: 20, h: 0.16, color: '#bfefff', bg: 'none' });
      lab.position.set(1, 0.22, 0.84);
      gr = new THREE.Object3D();
      g.add(top, bar, lab, gr);
    } else if (auto && (R.theme === 'city' || R.theme === 'nexus' || R.theme === 'lab')) {
      // Mondes 3-5 : palette de chantier suspendue (ville), cristal (Nexus), plateau (labo)
      const top = new THREE.Mesh(M.slabGeo(2, 0.5, 1.6), [R.TM.rust, R.TM.top]);
      top.castShadow = true; top.receiveShadow = true;
      g.add(top);
      if (R.theme === 'city' && e.kind === 'M') {
        [0.15, 1.85].forEach((cx) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 30), MAT.dark); c.position.set(cx, 15.5, 0); g.add(c); });
      }
      gr = new THREE.Object3D(); g.add(gr);
    } else {
      const mat = e.kind === 'n' ? MAT.platN : MAT.platM;
      const top = new THREE.Mesh(M.slabGeo(2, 0.5, 1.6), mat);
      top.castShadow = true; top.receiveShadow = true;
      gr = M.gear(0.32, 8, mat, 0.2); gr.position.set(1, -0.3, 0.6);
      g.add(top, gr);
      // flèches pour rappeler le sens : grise = inverse, dorée = même sens
      if (!auto) {
        const arrow = M.label(e.kind === 'n' ? '⇄ même sens' : '⇆ inverse', { size: 20, h: 0.16, color: e.kind === 'n' ? '#3a2a00' : '#1d2329', bg: 'none' });
        arrow.position.set(1, 0.25, 0.87);
        g.add(arrow);
      }
    }
    group.add(g);
    const p = { kind: e.kind, auto, x0: e.x, x: e.x, y: e.y + 0.5, y0: e.y + 0.5, w: 2, h: 0.5, range: e.range || 3, speed: e.speed || (e.kind === 'V' ? 1.1 : 1.4), phase: e.phase || 0, dx: 0, dy: 0, v: 0, mesh: g, gear: gr };
    g.position.set(p.x, p.y, 0);
    return p;
  }

  function makePiston(e, group, H) {
    const MAT = M.MAT;
    const g = new THREE.Group();
    const head = new THREE.Mesh(M.slabGeo(1, 1, 1.6), [R.TM.plate, R.TM.top]);
    head.castShadow = true;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 1.7), MAT.stripe);
    plate.position.set(0.5, 0.06, 0);
    head.add(plate);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1, 12), MAT.steel);
    g.add(head, rod);
    group.add(g);
    const PH = e.h || H, top = e.top !== undefined ? e.top : PH - 3, bottom = e.bottom !== undefined ? e.bottom : 1;
    return { x: e.x, phase: e.phase, top, bottom, yb: top, mesh: g, head, rod, H: PH, warned: false, slammed: false };
  }

  function makeBooth(e, group) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1.3, 0.6), M.MAT.dark);
    box.position.y = 0.65;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), M.MAT.glowGreen);
    screen.position.set(0, 0.9, 0.31);
    const lab = M.label('BOÎTIER DE COMMANDE', { size: 22, h: 0.2 });
    lab.position.set(0, 1.55, 0.3);
    g.add(box, screen, lab);
    g.position.set(e.x + 1, e.y, -1.1);
    group.add(g);
    return { x0: e.x, x1: e.x1 + 1, y: e.y };
  }

  /* ==================================================================
     VERSION 1.3 — GRANDS NIVEAUX
     Points de reprise (tous les modes), portes de zone, caméra par zone,
     et de nouveaux pièges. Règle d'or : CHAQUE piège a un indice
     (bruit, lumière, vibration, mouvement, rail visible…), pour que le
     joueur puisse se dire « j'aurais dû le voir ».
     ================================================================== */
  let G13 = null;   // géométries partagées entre tous les pièges (créées une seule fois)
  function geo13() {
    if (G13) return G13;
    const sh = (g) => { g.userData.shared = true; return g; };
    G13 = {
      disc: sh(new THREE.CylinderGeometry(1, 1, 0.1, 28)),
      tooth: sh(new THREE.ConeGeometry(0.09, 0.24, 4)),
      box: sh(new THREE.BoxGeometry(1, 1, 1)),
      cyl: sh(new THREE.CylinderGeometry(1, 1, 1, 14)),
      sphere: sh(new THREE.SphereGeometry(1, 14, 10)),
      cone: sh(new THREE.ConeGeometry(1, 1, 8)),
      ring: sh(new THREE.TorusGeometry(1, 0.03, 6, 48)),
    };
    return G13;
  }
  let M13 = null;   // matériaux partagés
  function mats13() {
    if (M13) return M13;
    const tex = M.canvasTex(128, 32, (g, w, h) => {   // flèches d'un tapis accélérateur
      g.fillStyle = '#1b2a40'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#5fd4ff';
      for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x + 6, 6); g.lineTo(x + 22, h / 2); g.lineTo(x + 6, h - 6); g.lineTo(x + 12, h / 2); g.closePath(); g.fill(); }
    }, true);
    const goo = M.canvasTex(64, 32, (g, w, h) => {
      g.fillStyle = '#6a2fb0'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(200,140,255,0.55)';
      for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 0, 7); g.fill(); }
    }, true);
    const barrel = M.canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = '#b8261c'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffd23f'; g.fillRect(0, h * 0.42, w, h * 0.16);
      g.fillStyle = '#1a1a1a'; for (let x = -16; x < w; x += 12) { g.beginPath(); g.moveTo(x, h * 0.42); g.lineTo(x + 6, h * 0.42); g.lineTo(x + 14, h * 0.58); g.lineTo(x + 8, h * 0.58); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 4, w, 3); g.fillRect(0, h - 7, w, 3);
    });
    M13 = {
      boost: new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.5 }),
      boostL: null,
      goo: new THREE.MeshStandardMaterial({ map: goo, emissiveMap: goo, emissive: 0x6a2fb0, emissiveIntensity: 0.35, roughness: 0.2 }),
      gooSide: new THREE.MeshStandardMaterial({ color: 0x3a1a5a, roughness: 0.6 }),
      barrel: new THREE.MeshStandardMaterial({ map: barrel, roughness: 0.5, metalness: 0.3 }),
      hazard: M.MAT.stripe,
      glowRed: new THREE.MeshBasicMaterial({ color: 0xff3020, toneMapped: false }),
      shot: new THREE.MeshBasicMaterial({ color: 0xff5a3a, toneMapped: false }),
      faint: new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.18, depthWrite: false, toneMapped: false }),
    };
    const t2 = tex.clone(); t2.needsUpdate = true; t2.repeat.x = -1;
    M13.boostL = new THREE.MeshStandardMaterial({ map: t2, emissiveMap: t2, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.5 });
    return M13;
  }
  // un joueur est-il dans une zone spéciale (inversion, gravité inversée, vent…) ?
  function inZone(p, kind) {
    for (const z of R.ents.zone || []) if (z.kind === kind && p.x > z.x0 && p.x < z.x1 && p.y + 0.45 > z.y0 && p.y + 0.45 < z.y1) return z;
    return null;
  }
  const levOn = (g, inv) => !!(R.lev && R.lev[g]) !== !!inv;
  const near = (p, x, y, r) => Math.abs(p.x - x) < r && Math.abs(p.y + 0.45 - y) < r;
  const nearest = (x, y) => { let d = 1e9; for (const p of players) if (p.alive && !p.finished) d = Math.min(d, Math.hypot(p.x - x, p.y + 0.45 - y)); return d; };

  /* --- Point de reprise : un drapeau avec une petite lampe (le faux n'en a pas, et son mât est tordu) --- */
  function makeCP(e, group) {
    const G = geo13();
    const g = new THREE.Group();
    const base = new THREE.Mesh(G.cyl, M.MAT.dark); base.scale.set(0.34, 0.12, 0.34); base.position.y = 0.06;
    const pole = new THREE.Mesh(G.cyl, M.MAT.steel); pole.scale.set(0.05, 2.1, 0.05); pole.position.y = 1.05;
    const fm = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, side: THREE.DoubleSide, emissive: 0x000000 });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), fm); flag.position.set(0.42, 1.78, 0);
    const piv = new THREE.Group(); piv.position.y = 0; piv.add(pole, flag);
    g.add(base, piv);
    let lamp = null;
    if (!e.fake) {
      lamp = new THREE.Mesh(G.sphere, new THREE.MeshBasicMaterial({ color: 0xffb020, toneMapped: false }));
      lamp.scale.setScalar(0.1); lamp.position.y = 2.2; piv.add(lamp);
    } else { piv.rotation.z = 0.07; flag.scale.set(0.8, 0.85, 1); }
    g.position.set(e.x + 0.5, e.y, -0.55);
    group.add(g);
    return { x: e.x, y: e.y, mesh: g, flag, lamp, fm, fake: !!e.fake, act: e.act || 'drop', fired: false };
  }
  function setCheckpoint(x, y) {
    R.cpAt = { x, y };
    R.cpAtSave = { hasPart: R.hasPart, picked: R.picked.slice() };
  }
  function cpFx(x, y, p) {
    OT.Sound.cp(); if (p) OT.Input.rumble(p.i, 0, 0.35, 120);
    // 1.5 : après au moins 3 chutes sur ce passage, le héros savoure (sinon la petite réaction habituelle)
    const hard = (R.cpDeaths || 0) >= 3; R.cpDeaths = 0;
    if (p) setTimeout(() => { if (R && state === 'play') heroBark(hard ? 'h_success' : 'checkpoint', p); }, 500);
    particles.burst(x + 0.5, y + 1.8, 16, [0x3cff9a, 0xffffff], 4, { up: 1, life: 0.5 });
    shock(x + 0.5, y + 1.2, 0x3cff9a, 1.8, 0.45);
    bubble(x + 0.5, y + 2.8, 'Point de reprise !', 2, '#3cff9a');
  }
  // l'endroit où ce joueur réapparaît
  function spawnFor(p) {
    if (mode === 'versus' && p && p.cp) return p.cp;
    if (R.cpAt) return R.cpAt;
    if (R.cpOn && R.cpFlag) return { x: R.cpFlag.x, y: R.cpFlag.y };
    return R.spawn;
  }

  /* --- Scie circulaire : on voit toujours son rail (ou son cercle) au mur ; elle siffle quand on approche --- */
  function makeSaw(e, group) {
    const G = geo13(), r = e.r || 0.6;
    const g = new THREE.Group(), spin = new THREE.Group();
    const disc = new THREE.Mesh(G.disc, M.MAT.steel); disc.rotation.x = Math.PI / 2; disc.scale.set(r, 1, r);
    const hub = new THREE.Mesh(G.cyl, M.MAT.red); hub.rotation.x = Math.PI / 2; hub.scale.set(r * 0.28, 0.18, r * 0.28);
    spin.add(disc, hub);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, t = new THREE.Mesh(G.tooth, M.MAT.steel);
      t.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); t.rotation.z = a - Math.PI / 2; spin.add(t);
    }
    g.add(spin); group.add(g);
    const s = { r, mesh: g, spin, speed: e.speed || 3, phase: e.phase || 0, lv: e.lv, inv: e.inv, sndT: 0, x: 0, y: 0 };
    if (e.ring) {
      s.ring = { cx: e.x0 + 0.5, cy: e.y0 + 0.5, rad: e.rad || 2 };
      const tr = new THREE.Mesh(G.ring, M.MAT.dark); tr.scale.set(s.ring.rad, s.ring.rad, 3); tr.position.set(s.ring.cx, s.ring.cy, -0.45); group.add(tr);
      const piv = new THREE.Mesh(G.cyl, M.MAT.dark); piv.rotation.x = Math.PI / 2; piv.scale.set(0.12, 0.3, 0.12); piv.position.set(s.ring.cx, s.ring.cy, -0.4); group.add(piv);
    } else {
      s.a = [e.x0 + 0.5, e.y0 + 0.5]; s.b = [e.x1 + 0.5, e.y1 + 0.5];
      s.len = Math.max(0.01, Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]));
      const rail = new THREE.Mesh(G.box, M.MAT.dark);
      rail.scale.set(s.len + 0.3, 0.12, 0.1); rail.position.set((s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2, -0.45);
      rail.rotation.z = Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]); group.add(rail);
      const slot = new THREE.Mesh(G.box, M13 ? M13.faint : mats13().faint);
      slot.scale.set(s.len + 0.3, 0.04, 0.02); slot.position.set(rail.position.x, rail.position.y, -0.39); slot.rotation.z = rail.rotation.z; group.add(slot);
    }
    sawPos(s);
    return s;
  }
  function sawPos(s) {
    const time = TT(s);   // 1.5 : l'horloge de CETTE scie (figée par COMPILER)
    if (s.ring) { const a = (time * s.speed) / s.ring.rad + s.phase; s.x = s.ring.cx + Math.cos(a) * s.ring.rad; s.y = s.ring.cy + Math.sin(a) * s.ring.rad; }
    else {
      const u = ((time * s.speed + s.phase * s.len) % (2 * s.len) + 2 * s.len) % (2 * s.len), d = u < s.len ? u : 2 * s.len - u, k = d / s.len;
      s.x = s.a[0] + (s.b[0] - s.a[0]) * k; s.y = s.a[1] + (s.b[1] - s.a[1]) * k;
    }
  }
  // distance entre le centre d'un disque et la boîte d'un joueur
  function circleHits(p, cx, cy, r) {
    const b = pbox(p), nx = Math.max(b.x0, Math.min(cx, b.x1)), ny = Math.max(b.y0, Math.min(cy, b.y1));
    return Math.hypot(nx - cx, ny - cy) < r;
  }

  /* --- Marteau-pendule : son arc est tracé au mur ; il grince à chaque aller-retour --- */
  function makeHammer(e, group) {
    const G = geo13(), len = e.len || 3, amp = e.amp || 1.05;
    const piv = new THREE.Group(); piv.position.set(e.x + 0.5, e.y + 0.5, 0.15);
    const bracket = new THREE.Mesh(G.box, M.MAT.dark); bracket.scale.set(0.6, 0.3, 0.6); bracket.position.set(e.x + 0.5, e.y + 0.75, 0.15);
    const arm = new THREE.Group(); piv.add(arm);
    const rod = new THREE.Mesh(G.box, M.MAT.steel); rod.scale.set(0.12, len, 0.12); rod.position.y = -len / 2; arm.add(rod);
    const head = new THREE.Mesh(G.box, M.MAT.dark); head.scale.set(1.1, 0.72, 1.2); head.position.y = -len; arm.add(head);
    const band = new THREE.Mesh(G.box, M.MAT.stripe); band.scale.set(1.12, 0.22, 1.22); band.position.y = -len; arm.add(band);
    const cap = new THREE.Mesh(G.cyl, M.MAT.steel); cap.rotation.x = Math.PI / 2; cap.scale.set(0.14, 0.4, 0.14); piv.add(cap);
    // l'arc tracé au mur (l'indice)
    const arc = new THREE.Mesh(new THREE.RingGeometry(len - 0.05, len + 0.05, 32, 1, -Math.PI / 2 - amp, amp * 2), mats13().faint);
    arc.position.set(e.x + 0.5, e.y + 0.5, -0.5);
    group.add(piv, bracket, arc);
    return { px: e.x + 0.5, py: e.y + 0.5, len, amp, period: e.period || 2.6, phase: e.phase || 0, arm, hx: 0, hy: 0, lastS: 0 };
  }

  /* --- Écraseur : un bloc suspendu qui tremble (tic tic tic) puis tombe quand on passe dessous --- */
  function makeCrusher(e, group) {
    const w = e.w || 1, h = e.h || 1, G = geo13();
    const g = new THREE.Group();
    const body = new THREE.Mesh(M.slabGeo(w, h, 1.6), [R.TM.plate, R.TM.top]); body.castShadow = true;
    const teeth = new THREE.Mesh(G.box, M.MAT.stripe); teeth.scale.set(w, 0.16, 1.62); teeth.position.set(w / 2, 0.08, 0);
    const eyeM = new THREE.MeshBasicMaterial({ color: 0x401010, toneMapped: false });
    const eyes = [0.3, 0.7].map((f) => { const m = new THREE.Mesh(G.box, eyeM); m.scale.set(0.16, 0.12, 0.05); m.position.set(w * f, h * 0.6, 0.82); return m; });
    g.add(body, teeth, ...eyes);
    for (const cx of [0.15, w - 0.15]) { const c = new THREE.Mesh(G.cyl, M.MAT.dark); c.scale.set(0.03, 12, 0.03); c.position.set(cx, h + 6, 0); g.add(c); }
    g.position.set(e.x, e.y, 0); group.add(g);
    // l'ombre rouge au sol apparaît quand il s'arme
    const floor = groundBelow(e.x + w / 2, e.y - 0.01);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.95, 1.4), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.set(e.x + w / 2, floor + 0.02, 0); group.add(shadow);
    return { x: e.x, y: e.y, y0: e.y, w, h, floor, state: 'idle', t: 0, vy: 0, dx: 0, dy: 0, v: 0, auto: true, crusher: true, mesh: g, eyeM, shadow, tickT: 0, wait: e.wait || 0.7 };
  }

  /* --- Lances murales : les pointes dépassent un instant (clic) juste avant de jaillir --- */
  function makeSpear(e, group) {
    const G = geo13(), dir = e.dir || 1, len = e.len || 1.7;
    if (e.vert) {
      // pique qui sort du sol (ou du plafond si dir = -1) : la fente au sol est l'indice
      const slot = new THREE.Mesh(G.box, new THREE.MeshBasicMaterial({ color: 0x120c0a })); slot.scale.set(0.8, 0.02, 1.2);
      slot.position.set(e.x + 0.5, e.y + (dir > 0 ? 0.012 : -0.012), 0); group.add(slot);
      const sp = new THREE.Group();
      for (const xx of [0.25, 0.5, 0.75]) for (const z of [-0.4, 0.4]) {
        const shaft = new THREE.Mesh(G.cyl, M.MAT.steel); shaft.scale.set(0.035, len, 0.035); shaft.position.set(xx - 0.5, -dir * len / 2, z);
        const tip = new THREE.Mesh(G.cone, M.MAT.spike); tip.scale.set(0.08, 0.26, 0.08); if (dir < 0) tip.rotation.z = Math.PI; tip.position.set(xx - 0.5, dir * 0.1, z);
        sp.add(shaft, tip);
      }
      sp.position.set(e.x + 0.5, e.y, 0); group.add(sp);
      return { x: e.x, y: e.y, dir, len, period: e.period || 2.4, phase: e.phase || 0, sp, ext: 0, warned: false, vert: true };
    }
    const plate = new THREE.Mesh(G.box, M.MAT.dark); plate.scale.set(0.08, 0.7, 1.4); plate.position.set(e.x - dir * 0.04, e.y + 0.5, 0); group.add(plate);
    const holes = new THREE.Mesh(G.box, new THREE.MeshBasicMaterial({ color: 0x120c0a })); holes.scale.set(0.02, 0.2, 1.1); holes.position.set(e.x + dir * 0.01, e.y + 0.5, 0); group.add(holes);
    const sp = new THREE.Group();
    for (const z of [-0.45, 0, 0.45]) {
      const shaft = new THREE.Mesh(G.cyl, M.MAT.steel); shaft.scale.set(0.04, len, 0.04); shaft.rotation.z = Math.PI / 2; shaft.position.set(-dir * len / 2, 0, z);
      const tip = new THREE.Mesh(G.cone, M.MAT.spike); tip.scale.set(0.09, 0.28, 0.09); tip.rotation.z = -dir * Math.PI / 2; tip.position.set(dir * 0.1, 0, z);
      sp.add(shaft, tip);
    }
    sp.position.set(e.x, e.y + 0.5, 0); group.add(sp);
    return { x: e.x, y: e.y, dir, len, period: e.period || 2.4, phase: e.phase || 0, sp, ext: 0, warned: false };
  }

  /* --- Tourelle : son œil rougit et bipe avant chaque tir --- */
  function makeTurret(e, group) {
    const G = geo13(), dir = e.dir || 1;
    const g = new THREE.Group();
    const base = new THREE.Mesh(G.box, M.MAT.dark); base.scale.set(0.8, 0.6, 0.8); base.position.y = 0.3;
    const barrel = new THREE.Mesh(G.cyl, M.MAT.steel); barrel.scale.set(0.11, 0.6, 0.11); barrel.rotation.z = Math.PI / 2; barrel.position.set(dir * 0.5, 0.45, 0);
    const eyeM = new THREE.MeshBasicMaterial({ color: 0x501010, toneMapped: false });
    const eye = new THREE.Mesh(G.sphere, eyeM); eye.scale.setScalar(0.12); eye.position.set(dir * 0.2, 0.62, 0.38);
    g.add(base, barrel, eye); g.position.set(e.x + 0.5, e.y, 0); group.add(g);
    return { x: e.x, y: e.y, dir, period: e.period || 2.2, phase: e.phase || 0, speed: e.speed || 7, range: e.range || 18, eyeM, beeped: false, last: 0 };
  }

  /* --- Bidon explosif : quand on s'approche, sa mèche s'allume (grésillement, étincelles), puis BOUM --- */
  function makeBarrel(e, group) {
    const G = geo13();
    const g = new THREE.Group();
    const b = new THREE.Mesh(G.cyl, mats13().barrel); b.scale.set(0.36, 0.86, 0.36); b.position.y = 0.43; b.castShadow = true;
    const lid = new THREE.Mesh(G.cyl, M.MAT.dark); lid.scale.set(0.37, 0.05, 0.37); lid.position.y = 0.87;
    const fuse = new THREE.Mesh(G.cyl, M.MAT.dark); fuse.scale.set(0.02, 0.22, 0.02); fuse.position.set(0.12, 0.98, 0);
    g.add(b, lid, fuse); g.position.set(e.x + 0.5, e.y, 0); group.add(g);
    return { x: e.x + 0.5, y: e.y, mesh: g, state: 'idle', t: 0 };
  }

  /* --- Zones : inversion des commandes, gravité inversée, gravité forte, vent (toujours affichées) --- */
  const ZONE_LOOK = {
    invert: { color: 0xff5fd1, text: '⇄ COMMANDES INVERSÉES' },
    flip: { color: 0x5fd4ff, text: '⇅ GRAVITÉ INVERSÉE' },
    heavy: { color: 0xff6a3a, text: 'GRAVITÉ ×1,8' },
    wind: { color: 0xdff9ff, text: 'VENT' },
  };
  function makeZone(e, group) {
    const look = ZONE_LOOK[e.kind] || ZONE_LOOK.wind;
    const w = e.x1 - e.x0, h = e.y1 - e.y0;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.6), new THREE.MeshBasicMaterial({ color: look.color, transparent: true, opacity: 0.07, depthWrite: false, toneMapped: false }));
    m.position.set(e.x0 + w / 2, e.y0 + h / 2, 0);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: look.color, transparent: true, opacity: 0.55 })));
    const txt = e.kind === 'wind' ? (e.power > 0 ? 'VENT →' : '← VENT') : look.text;
    const lab = M.label(txt, { size: 30, h: 0.32, color: '#' + new THREE.Color(look.color).getHexString(), bg: 'rgba(10,10,20,0.8)', border: '#' + new THREE.Color(look.color).getHexString() });
    lab.position.set(0, Math.min(h / 2 - 0.3, 2.6 - h / 2), 0.85); m.add(lab);
    group.add(m);
    return { kind: e.kind, x0: e.x0, x1: e.x1, y0: e.y0, y1: e.y1, power: e.power || 4, mesh: m, color: look.color };
  }

  /* --- Poursuite : un mur de lave (ou de virus, ou l'effondrement) qui avance. Alarme + caméra qui recule --- */
  function makeChase(e, group) {
    const y0 = e.y0 || 0, y1 = e.y1 || R.H - 1, h = y1 - y0;
    const col = e.kind === 'virus' ? 0xff2a6a : e.kind === 'collapse' ? 0x8a6a4a : e.kind === 'acid' ? 0x7cff3a : 0xff6a1a;
    const g = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.2, h, 2.2), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: e.kind === 'collapse' ? 0.2 : 1.4, transparent: true, opacity: 0.85 }));
    wall.position.set(-0.6, y0 + h / 2, 0);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3, h), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    glow.position.set(0.6, y0 + h / 2, 1.2);
    g.add(wall, glow); g.visible = false; group.add(g);
    return { x0: e.x0, x1: e.x1, y0, y1, speed: e.speed || 6.2, kind: e.kind || 'lava', mesh: g, col, on: false, done: false, front: e.x0 - 3, t: 0 };
  }

  /* --- Caisse à pousser : on la pousse en marchant contre elle ; on peut monter dessus ;
         elle appuie sur les boutons et arrête les lasers. --- */
  function makeCrate(e, group) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo13().box, crateMat()); m.scale.set(0.96, 0.96, 1.2); m.position.set(0.48, 0.48, 0); m.castShadow = true; m.receiveShadow = true;
    g.add(m); group.add(g);
    const c = { x0: e.x + 0.02, y0: e.y, x: e.x + 0.02, y: e.y, w: 0.96, h: 0.96, vx: 0, vy: 0, mesh: g, alive: true, ground: false, crate: true };
    g.position.set(c.x, c.y, 0);
    return c;
  }
  const crateBox = (c) => ({ x0: c.x, y0: c.y, x1: c.x + c.w, y1: c.y + c.h });
  // solides qui arrêtent une caisse (tuiles, barrières, plateformes, autres caisses, écraseurs)
  function crateSolids(c, b) {
    const out = [];
    const x0 = Math.floor(b.x0) - 1, x1 = Math.floor(b.x1) + 1, y0 = Math.floor(b.y0) - 1, y1 = Math.floor(b.y1) + 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tileSolid(x, y)) out.push({ x0: x, y0: y, x1: x + 1, y1: y + 1, ref: R.tiles[y] ? R.tiles[y][x] : null });
    for (const gt of R.ents.gate || []) if (gt.open < 0.6) { const oy = gt.open * gt.h; out.push({ x0: gt.x + 0.05, y0: gt.y + oy, x1: gt.x + 0.95, y1: gt.y + gt.h + oy }); }
    for (const pl of R.ents.plat || []) out.push({ x0: pl.x, y0: pl.y, x1: pl.x + pl.w, y1: pl.y + pl.h, ref: pl, plat: true });
    for (const o of R.ents.crate || []) if (o !== c && o.alive) out.push(Object.assign(crateBox(o), { ref: o }));
    for (const k of R.ents.crusher || []) out.push({ x0: k.x, y0: k.y, x1: k.x + k.w, y1: k.y + k.h, ref: k, plat: true });
    return out;
  }
  // déplace la caisse de dx (au plus) sans entrer dans un solide ; renvoie le déplacement réel
  function crateTryMove(c, dx) {
    const ox = c.x;
    let nx = c.x + dx;
    const b = { x0: Math.min(c.x, nx), y0: c.y + 0.02, x1: Math.max(c.x, nx) + c.w, y1: c.y + c.h - 0.02 };
    for (const s of crateSolids(c, b)) {
      if (!(b.y0 < s.y1 && b.y1 > s.y0)) continue;
      if (dx > 0 && s.x0 >= ox + c.w - 1e-3 && nx + c.w > s.x0) nx = s.x0 - c.w - 1e-4;
      if (dx < 0 && s.x1 <= ox + 1e-3 && nx < s.x1) nx = s.x1 + 1e-4;
    }
    c.x = nx;
    return nx - ox;
  }
  function updateCrates(dt) {
    for (const c of R.ents.crate || []) {
      if (!c.alive) continue;
      // portée par une plateforme ou un tapis roulant
      if (c.ground && c.on) {
        if (c.on.plat && c.on.ref.dx) crateTryMove(c, c.on.ref.dx);
        if (c.on.ref && c.on.ref.dir && (c.on.ref.ch === '<' || c.on.ref.ch === '>')) crateTryMove(c, c.on.ref.dir * 3.4 * dt);
      }
      c.vy = Math.max(MAX_FALL, c.vy - GRAV * dt);
      let ny = c.y + c.vy * dt;
      c.ground = false; c.on = null;
      const b = { x0: c.x + 0.02, y0: Math.min(c.y, ny), x1: c.x + c.w - 0.02, y1: Math.max(c.y, ny) + c.h };
      for (const s of crateSolids(c, b)) {
        if (!(b.x0 < s.x1 && b.x1 > s.x0)) continue;
        if (c.vy <= 0 && s.y1 <= c.y + 1e-3 && ny < s.y1) { ny = s.y1; c.vy = 0; c.ground = true; c.on = s; }
        else if (c.vy > 0 && s.y0 >= c.y + c.h - 1e-3 && ny + c.h > s.y0) { ny = s.y0 - c.h; c.vy = 0; }
      }
      c.y = ny;
      // l'acide ou le vide détruisent la caisse (elle revient quand on recommence)
      const ty = Math.floor(c.y + 0.1), tx = Math.floor(c.x + c.w / 2);
      if (c.y < -3 || (R.tiles[ty] && R.tiles[ty][tx] && R.tiles[ty][tx].ch === 'A')) {
        c.alive = false; c.mesh.visible = false;
        particles.burst(c.x + 0.5, c.y + 0.5, 14, [0xb5793a, 0x7a4a1e], 5, { up: 2 });
        OT.Sound.crumble();
      }
      c.mesh.position.set(c.x, c.y, 0);
    }
  }

  /* --- Levier : on l'actionne avec le bouton Action. Il ouvre / ferme les barrières et blocs de son groupe --- */
  const LEV_COL = [0xffd23f, 0x5fd4ff, 0xff5fa2, 0x3cff9a];
  function makeLever(e, group) {
    const G = geo13(), col = LEV_COL[(e.g || 0) % LEV_COL.length];
    const g = new THREE.Group();
    const base = new THREE.Mesh(G.box, M.MAT.dark); base.scale.set(0.7, 0.3, 0.5); base.position.y = 0.15;
    const stick = new THREE.Group(); stick.position.set(0, 0.28, 0);
    const rod = new THREE.Mesh(G.cyl, M.MAT.steel); rod.scale.set(0.045, 0.6, 0.045); rod.position.y = 0.3;
    const knob = new THREE.Mesh(G.sphere, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.5 })); knob.scale.setScalar(0.11); knob.position.y = 0.62;
    stick.add(rod, knob);
    const lamp = new THREE.Mesh(G.sphere, new THREE.MeshBasicMaterial({ color: col, toneMapped: false })); lamp.scale.setScalar(0.06); lamp.position.set(0.26, 0.32, 0.22);
    g.add(base, stick, lamp); g.position.set(e.x + 0.5, e.y, -0.2); group.add(g);
    if (!R.lev0) R.lev0 = {};
    if (R.lev0[e.g] === undefined) R.lev0[e.g] = !!e.init;
    return { x: e.x, y: e.y, g: e.g, mesh: g, stick, lamp, col, cool: 0, prompt: null, promptKey: '' };
  }
  const leverNear = (p) => (R.ents.lever || []).find((l) => Math.abs(p.x - (l.x + 0.5)) < 0.9 && Math.abs(p.y - l.y) < 1.1);

  /* --- Murs qui se referment : lumières jaunes et sifflement avant de claquer --- */
  function makePress(e, group) {
    const G = geo13(), h = e.h || 2, gap = e.gap || 2;
    const mk = () => { const s = new THREE.Mesh(M.slabGeo(1, h, 1.6), [R.TM.plate, R.TM.top]); s.castShadow = true; group.add(s); return s; };
    const L = mk(), Rr = mk();
    const lampM = new THREE.MeshBasicMaterial({ color: 0x3a2a08, toneMapped: false });
    const lamps = [e.x - 0.2, e.x + gap + 0.2].map((x) => { const l = new THREE.Mesh(G.sphere, lampM); l.scale.setScalar(0.1); l.position.set(x, e.y + h + 0.25, 0.6); group.add(l); return l; });
    return { x: e.x, y: e.y, h, gap, period: e.period || 2.8, phase: e.phase || 0, L, R: Rr, lampM, lamps, f: 0, warned: false };
  }

  function updateTraps(alive, dt) {
    const MT = mats13();
    // points de reprise
    for (const c of R.ents.cp || []) {
      c.flag.rotation.y = Math.sin(time * 3 + c.x) * 0.25;
      if (c.fake) {
        if (c.fired) continue;
        const p = alive.find((q) => Math.abs(q.x - (c.x + 0.5)) < 0.6 && Math.abs(q.y - c.y) < 1.5);
        if (p) { c.fired = true; fireTrigger({ x: c.x - 2, y: c.y, act: c.act }); bubble(c.x + 0.5, c.y + 2.8, 'Faux drapeau ! Il n\'avait pas de lampe…', 2.6, '#ff5533'); OT.Sound.bad(); heroBark('fake', p); }
        continue;
      }
      if (c.zi === undefined) c.zi = zoneIdx(c.x);
      for (const p of alive) {
        // (seulement dans SA zone : chez les boss, l'antichambre est plus loin à droite que la fuite)
        if (p.x < c.x + 0.3 || Math.abs(p.y - c.y) > 3 || zoneIdx(p.x) !== c.zi) continue;
        if (mode === 'versus') { if (!p.cp || p.cp.x < c.x) { p.cp = { x: c.x, y: c.y }; cpFx(c.x, c.y, p); EXT.run('cpReached', c, p, PX); } }
        else if (!R.cpAt || R.cpAt.x < c.x) { setCheckpoint(c.x, c.y); cpFx(c.x, c.y, p); EXT.run('cpReached', c, p, PX); }
      }
      const lit = mode === 'versus' ? players.some((p) => p.cp && p.cp.x >= c.x) : !!(R.cpAt && R.cpAt.x >= c.x);
      c.fm.color.setHex(lit ? 0x3cff9a : 0x8a8f96);
      if (c.lamp) c.lamp.material.color.setHex(lit ? 0x3cff9a : Math.sin(time * 4) > 0 ? 0xffb020 : 0x7a4a08);
    }
    // portes de zone : on attend que toute l'équipe soit entrée, puis on passe ensemble
    if (R.gateQ && R.gateQ.length) {
      for (const q of R.gateQ) q.t -= dt;
      const ready = R.gateQ.filter((q) => q.t <= 0);
      R.gateQ = R.gateQ.filter((q) => q.t > 0);
      for (const q of ready) gateTeleport(q.list, q.d);
    }
    // scies
    for (const s of R.ents.saw || []) {
      const stop = (s.lv !== undefined && levOn(s.lv, s.inv)) || FZ(s);   // (1.5 : ou COMPILÉE par Tony)
      if (!stop) { sawPos(s); s.spin.rotation.z -= dt * 16; }
      s.mesh.position.set(s.x, s.y, 0.05);
      if (FZ(s)) continue;
      for (const p of alive) if (circleHits(p, s.x, s.y, s.r * 0.86)) { particles.burst(p.x, p.y + 0.5, 16, [0xffd28a, 0xffffff], 7, { up: 2 }); kill(p, 'saw'); }
      // 1.5 : la lame est passée à un cheveu (et on est vivant) → « C'était moins une ! »
        else if (!stop && circleHits(p, s.x, s.y, s.r * 0.86 + 0.32) && !(p.nearT > 0)) { p.nearT = 8; heroBark('h_nearmiss', p); }
      const d = nearest(s.x, s.y);
      if (!stop && d < 5.5) { s.sndT -= dt; if (s.sndT <= 0) { OT.Sound.saw(Math.max(0.2, 1 - d / 5.5)); s.sndT = 0.32; } }
    }
    // marteaux
    for (const hm of R.ents.hammer || []) {
      const w = (2 * Math.PI * TT(hm)) / hm.period + hm.phase;
      const a = hm.amp * Math.sin(w);
      hm.arm.rotation.z = a;
      hm.hx = hm.px + Math.sin(a) * hm.len; hm.hy = hm.py - Math.cos(a) * hm.len;
      const zone = { x0: hm.hx - 0.5, y0: hm.hy - 0.36, x1: hm.hx + 0.5, y1: hm.hy + 0.36 };
      if (!FZ(hm)) for (const p of alive) if (overlap(pbox(p), zone)) { OT.Sound.slam(); kill(p, 'crush'); }
      const sgn = Math.sign(Math.cos(w));
      if (sgn !== hm.lastS) { hm.lastS = sgn; const d = nearest(hm.px, hm.py - hm.len); if (d < 7) OT.Sound.creak(Math.max(0.25, 1 - d / 7)); }
    }
    // écraseurs
    for (const k of R.ents.crusher || []) {
      if (FZ(k)) { k.dy = 0; continue; }   // 1.5 : COMPILÉ par Tony — il reste où il est
      const y0 = k.y;
      if (k.state === 'idle') {
        const under = alive.some((p) => p.x + p.w / 2 > k.x - 0.15 && p.x - p.w / 2 < k.x + k.w + 0.15 && p.y < k.y && p.y >= k.floor - 0.6);
        if (under) { k.state = 'arm'; k.t = 0.42; k.tickT = 0; }
        k.eyeM.color.setHex(0x401010);
      } else if (k.state === 'arm') {
        k.t -= dt; k.tickT -= dt;
        if (k.tickT <= 0) { OT.Sound.tick(); k.tickT = 0.1; }
        k.mesh.position.x = k.x + Math.sin(time * 80) * 0.04;
        k.eyeM.color.setHex(0xff2a2a);
        if (Math.random() < 0.4) particles.burst(k.x + Math.random() * k.w, k.y, 1, 0x9c8f80, 1, { life: 0.4, size: 0.7 });
        if (k.t <= 0) { k.state = 'fall'; k.vy = 0; k.mesh.position.x = k.x; }
      } else if (k.state === 'fall') {
        k.vy -= 70 * dt; k.y = Math.max(k.floor, k.y + k.vy * dt);
        const zone = { x0: k.x + 0.04, y0: k.y, x1: k.x + k.w - 0.04, y1: k.y + k.h };
        for (const p of alive) if (overlap(pbox(p), zone)) kill(p, 'crush');
        if (k.y <= k.floor) {
          k.state = 'down'; k.t = k.wait;
          OT.Sound.slam(); shake = Math.max(shake, 0.2);
          particles.burst(k.x + k.w / 2, k.floor + 0.1, 14, [0x9c8f80, 0x5d5148], 5, { up: 2 });
          for (const p of alive) if (Math.abs(p.x - (k.x + k.w / 2)) < 5) OT.Input.rumble(p.i, 0.6, 0.2, 140);
        }
      } else if (k.state === 'down') { k.t -= dt; if (k.t <= 0) k.state = 'rise'; }
      else if (k.state === 'rise') { k.y = Math.min(k.y0, k.y + 2.4 * dt); if (k.y >= k.y0) { k.state = 'cool'; k.t = 0.45; } }
      else if (k.state === 'cool') { k.t -= dt; if (k.t <= 0) k.state = 'idle'; }
      k.dy = k.y - y0;
      k.mesh.position.y = k.y;
      k.shadow.material.opacity = k.state === 'arm' ? 0.35 + Math.sin(time * 30) * 0.15 : k.state === 'fall' ? 0.5 : 0;
    }
    // lances
    for (const s of R.ents.spear || []) {
      const t = ((TT(s) + s.phase) % s.period + s.period) % s.period;
      let ext = 0;
      if (t < 0.09) ext = (t / 0.09) * s.len; else if (t < 0.6) ext = s.len; else if (t < 0.9) ext = (1 - (t - 0.6) / 0.3) * s.len;
      else if (t > s.period - 0.5 && t < s.period - 0.12) ext = 0.16;      // les pointes dépassent : l'indice
      if (t > s.period - 0.5 && !s.warned) { s.warned = true; if (nearest(s.x, s.y + 0.5) < 6) OT.Sound.tick(0.8); }
      if (t < 0.5) s.warned = false;
      s.ext = ext;
      if (s.vert) {
        s.sp.position.y = s.y + s.dir * ext;
        if (ext > 0.25 && !FZ(s)) {
          const ya = s.y, yb = s.y + s.dir * ext;
          const zone = { x0: s.x + 0.12, x1: s.x + 0.88, y0: Math.min(ya, yb), y1: Math.max(ya, yb) };
          for (const p of alive) if (overlap(pbox(p), zone)) kill(p, 'spike');
        }
        continue;
      }
      s.sp.position.x = s.x + s.dir * ext;
      if (ext > 0.25 && !FZ(s)) {
        const xa = s.x, xb = s.x + s.dir * ext;
        const zone = { x0: Math.min(xa, xb), x1: Math.max(xa, xb), y0: s.y + 0.32, y1: s.y + 0.68 };
        for (const p of alive) if (overlap(pbox(p), zone)) kill(p, 'spike');
      }
    }
    // tourelles et leurs tirs
    R.shots = R.shots || [];
    for (const tu of R.ents.turret || []) {
      const t = ((TT(tu) + tu.phase) % tu.period + tu.period) % tu.period;
      const charge = t > tu.period - 0.55;
      tu.eyeM.color.setHex(charge ? (Math.sin(time * 40) > 0 ? 0xff3020 : 0xffb0a0) : 0x501010);
      if (charge && !tu.beeped) { tu.beeped = true; if (nearest(tu.x, tu.y) < 9) OT.Sound.tick(0.7); }
      if (t < tu.last) {   // le cycle vient de recommencer : on tire
        tu.beeped = false;
        const m = new THREE.Mesh(geo13().sphere, MT.shot); m.scale.setScalar(0.17);
        const sx = tu.x + 0.5 + tu.dir * 0.9, sy = tu.y + 0.45;
        m.position.set(sx, sy, 0); R.group.add(m);
        R.shots.push({ x: sx, y: sy, vx: tu.dir * tu.speed, d: 0, range: tu.range, mesh: m });
        if (nearest(tu.x, tu.y) < 10) OT.Sound.zap();
      }
      tu.last = t;
    }
    for (const s of R.shots) {
      const st = s.vx * dt; s.x += st; s.d += Math.abs(st); s.mesh.position.x = s.x;
      if (s.d > s.range || tileSolid(Math.floor(s.x), Math.floor(s.y))) s.dead = true;
      for (const c of R.ents.crate || []) if (c.alive && overlap({ x0: s.x - 0.1, y0: s.y - 0.1, x1: s.x + 0.1, y1: s.y + 0.1 }, crateBox(c))) s.dead = true;
      for (const b of R.ents.barrel || []) if (b.state === 'idle' && Math.abs(s.x - b.x) < 0.45 && s.y > b.y && s.y < b.y + 0.95) { b.state = 'fuse'; b.t = 0.15; s.dead = true; }
      for (const p of alive) if (circleHits(p, s.x, s.y, 0.17)) { s.dead = true; kill(p, 'zap'); }
      if (s.dead) { particles.burst(s.x, s.y, 5, [0xff5a3a, 0xffd28a], 3, { grav: 0, life: 0.25 }); R.group.remove(s.mesh); }
    }
    R.shots = R.shots.filter((s) => !s.dead);
    // bidons explosifs
    for (const b of R.ents.barrel || []) {
      if (b.state === 'gone' || FZ(b)) continue;   // (1.5 : un bidon COMPILÉ ne s'allume pas)
      if (b.state === 'idle') {
        if (alive.some((p) => Math.abs(p.x - b.x) < 1.25 && Math.abs(p.y - b.y) < 1.4)) { b.state = 'fuse'; b.t = 0.95; OT.Sound.fuse(); }
      } else if (b.state === 'fuse') {
        b.t -= dt;
        b.mesh.scale.setScalar(1 + Math.max(0, 0.95 - b.t) * 0.12);
        if (Math.random() < 0.7) particles.burst(b.x + 0.12, b.y + 1.1, 1, [0xffd23f, 0xff7a1a], 2, { up: 1, life: 0.3, size: 0.6 });
        if (b.t <= 0) explode(b, alive);
      }
    }
    // zones : petites particules pour qu'on les remarque
    for (const z of R.ents.zone || []) {
      if (Math.random() < 0.12) {
        const x = z.x0 + Math.random() * (z.x1 - z.x0), y = z.y0 + Math.random() * (z.y1 - z.y0);
        if (z.kind === 'wind') particles.burst(x, y, 1, 0xdff9ff, 0.4, { grav: 0, life: 0.6, size: 0.5 });
        else if (z.kind === 'flip') particles.burst(x, y, 1, z.color, 0.6, { grav: -0.25, life: 0.9, size: 0.6 });
        else particles.burst(x, y, 1, z.color, 0.6, { grav: 0, life: 0.6, size: 0.55 });
      }
    }
    // poursuite
    for (const c of R.ents.chase || []) {
      if (c.done) continue;
      if (!c.on) {
        if (alive.some((p) => p.x > c.x0 + 1 && p.x < c.x1 + 4)) {   // (seulement dans SA zone : les boss ont d'autres zones plus loin)
          c.on = true; c.t = 0; c.front = c.x0 - 3; c.mesh.visible = true;
          OT.Sound.alarm(); OT.Input.rumble(-1, 0.6, 0.6, 400); shake = Math.max(shake, 0.3);
          R.camPull = 1.6;
          { const who = alive.find((p) => p.x > c.x0 + 1) || alive[0]; setTimeout(() => { if (R && state === 'play' && !(OT.Dialogue && OT.Dialogue.speaking)) heroBark('chase', who, { force: true }); }, 900); }
          bubble(c.x0 + 6, c.y0 + 4, c.kind === 'virus' ? 'VIRUS DÉTECTÉ ! COURS !' : c.kind === 'collapse' ? 'Tout s\'effondre ! COURS !' : c.kind === 'acid' ? 'L\'ACIDE DÉBORDE ! COURS !' : 'LA LAVE ARRIVE ! COURS !', 2.6, '#' + new THREE.Color(c.col).getHexString());
        }
        continue;
      }
      if (FZ(c)) continue;   // 1.5 : le mur est COMPILÉ (Tony) : il attend 2 s
      c.t += dt;
      c.front += c.speed * Math.min(1, c.t / 0.8) * dt;
      c.mesh.position.x = c.front;
      if (Math.random() < 0.8) particles.burst(c.front, c.y0 + Math.random() * (c.y1 - c.y0), 1, [c.col, 0xffd28a], 3, { up: 1, life: 0.5 });
      for (const p of alive) if (p.x - 0.3 < c.front && p.x > c.x0 - 6 && p.x < c.x1 + 4) kill(p, c.kind === 'virus' ? 'zap' : 'chase');
      // effondrement : le sol piégé tombe derrière le mur
      for (let y = c.y0; y <= c.y1; y++) for (let x = Math.max(0, Math.floor(c.front - 2)); x < Math.floor(c.front); x++) {
        const t = R.tiles[y] && R.tiles[y][x];
        if (t && t.ch === '~' && t.state === 'idle') { t.state = 'drop'; t.vy = 1; t.oy = 0; t.t = 0; }
      }
      if (Math.floor(time * 2) !== Math.floor((time - dt) * 2) && nearest(c.front, c.y0 + 1) < 14) { OT.Sound.crumble(); for (const p of alive) OT.Input.rumble(p.i, 0.25, 0.1, 90); }
      if (c.front >= c.x1) { c.done = true; c.mesh.visible = false; }
    }
    // caisses
    updateCrates(dt);
    // leviers
    for (const l of R.ents.lever || []) {
      l.cool = Math.max(0, l.cool - dt);
      const nearP = alive.find((p) => Math.abs(p.x - (l.x + 0.5)) < 0.9 && Math.abs(p.y - l.y) < 1.1);
      setPrompt(l, nearP, 'Actionner', l.mesh, 0, 1.4, 0.4);
      if (nearP && nearP.useT > 0 && l.cool <= 0) {
        nearP.useT = 0; l.cool = 0.35;
        R.lev[l.g] = !R.lev[l.g];
        OT.Sound.clang(); OT.Input.rumble(nearP.i, 0.3, 0.3, 90);
        heroOnce('h_lever', nearP);
        EXT.run('mechanism', 'lever', l, nearP, PX);   // 1.5 : les quêtes écoutent les mécanismes
        if (nearP.anim) nearP.anim.play('interact');
        particles.burst(l.x + 0.5, l.y + 0.9, 8, [l.col, 0xffffff], 3, { up: 1, life: 0.3 });
      }
      const on = !!R.lev[l.g];
      l.stick.rotation.z += ((on ? -0.6 : 0.6) - l.stick.rotation.z) * Math.min(1, dt * 14);
      l.lamp.visible = on || Math.sin(time * 5) > 0;
    }
    // murs qui se referment
    for (const pr of R.ents.press || []) {
      const t = ((TT(pr) + pr.phase) % pr.period + pr.period) % pr.period;
      let f = 0;
      if (t < 0.14) f = t / 0.14; else if (t < 0.55) f = 1; else if (t < 0.95) f = 1 - (t - 0.55) / 0.4;
      const warn = t > pr.period - 0.6;
      pr.lampM.color.setHex(warn ? (Math.sin(time * 30) > 0 ? 0xffd23f : 0x3a2a08) : f > 0 ? 0xff3020 : 0x3a2a08);
      if (warn && !pr.warned) { pr.warned = true; if (nearest(pr.x + pr.gap / 2, pr.y + 1) < 7) OT.Sound.sizzle(0.6); }
      if (t < 0.5) pr.warned = false;
      pr.f = f;
      const half = pr.gap / 2;
      pr.L.position.set(pr.x - 1 + f * half, pr.y, 0); pr.R.position.set(pr.x + pr.gap - f * half, pr.y, 0);
      if (f > 0.8 && !FZ(pr)) {
        const zone = { x0: pr.x + 0.05, y0: pr.y, x1: pr.x + pr.gap - 0.05, y1: pr.y + pr.h };
        for (const p of alive) if (overlap(pbox(p), zone)) { OT.Sound.slam(); kill(p, 'crush'); }
      }
    }
    // « ne traîne pas ici » : le sol s'énerve si on reste trop longtemps (tic tic de plus en plus vite)
    for (const lg of R.ents.linger || []) {
      if (lg.fired) continue;
      const inside = alive.filter((p) => p.x > lg.x0 && p.x < lg.x1 + 1 && Math.abs(p.y - lg.y) < 2.5);
      lg.t = inside.length ? (lg.t || 0) + dt : Math.max(0, (lg.t || 0) - dt * 2);
      const lim = lg.time || 3.5;
      if (lg.t > 0.8) { lg.tickT = (lg.tickT || 0) - dt; if (lg.tickT <= 0) { OT.Sound.tick(); lg.tickT = Math.max(0.07, 0.45 * (1 - lg.t / lim)); } }
      if (lg.t > lim) { lg.fired = true; fireTrigger({ x: lg.x0 + 1, y: lg.y, act: lg.act || 'drop' }); bubble((lg.x0 + lg.x1) / 2, lg.y + 3, 'Il ne fallait pas traîner…', 2.4, '#ff5533'); }
    }
    // sol brûlant, gelée, tapis accélérateurs (matériaux partagés par groupe de tuiles)
    if (R.heatGroups) for (const hg of R.heatGroups) {
      const t = ((time + hg.phase) % hg.period + hg.period) % hg.period, hot0 = hg.period - (hg.hot || 0.9);
      hg.hotNow = t >= hot0; const warm = !hg.hotNow && t > hot0 - 0.75;
      const k = hg.hotNow ? 1 : warm ? (t - (hot0 - 0.75)) / 0.75 : 0;
      hg.mat.emissive.setRGB(1, 0.35 + 0.25 * k, 0.05); hg.mat.emissiveIntensity = hg.hotNow ? 1.6 + Math.sin(time * 30) * 0.3 : k * 0.9;
      if (warm && !hg.said) { hg.said = true; const d = hg.tiles.reduce((m, tt) => Math.min(m, nearest(tt.x + 0.5, tt.y + 1)), 1e9); if (d < 5) OT.Sound.sizzle(Math.max(0.3, 1 - d / 5)); }
      if (!warm && !hg.hotNow) hg.said = false;
      if ((warm || hg.hotNow) && Math.random() < 0.35) { const tt = hg.tiles[Math.floor(Math.random() * hg.tiles.length)]; particles.burst(tt.x + Math.random(), tt.y + 1.05, 1, hg.hotNow ? [0xff7a1a, 0xffd23f] : 0x9c8f80, 1, { grav: -0.4, life: 0.6, size: 0.7 }); }
    }
    for (const p of alive) {
      if (!p.onGround || !p.standOn || !p.standOn.ref) continue;
      const t = p.standOn.ref;
      if (t.ch === 'Z' && t.hg && t.hg.hotNow) { particles.burst(p.x, p.y + 0.3, 14, [0xff7a1a, 0xffd23f], 5, { up: 2 }); kill(p, 'burn'); }
      if ((t.ch === '}' || t.ch === '{') && (p.boostT || 0) <= 0.05) {
        const dir = t.ch === '}' ? 1 : -1;
        p.vx = dir * 15.5; p.boostT = 0.42; p.face = dir;
        OT.Sound.whoosh(); OT.Input.rumble(p.i, 0, 0.3, 80);
        particles.burst(p.x, p.y + 0.2, 6, [0x5fd4ff, 0xffffff], 4, { grav: 0, life: 0.3 });
      }
    }
    if (R.gooCount && Math.random() < 0.08) { const g = R.gooTiles[Math.floor(Math.random() * R.gooTiles.length)]; particles.burst(g.x + Math.random(), g.y + 1.02, 1, 0xc88cff, 0.6, { grav: -0.2, life: 0.8, size: 0.7 }); }
    // fausses pièces : elles ne flottent pas et tournent à l'envers (l'indice)
    for (const c of R.ents.fakecoin || []) {
      if (c.taken) continue;
      c.mesh.rotation.y = -time * 2.4;
      for (const p of alive) if (Math.abs(p.x - c.x) < 0.6 && p.y < c.y + 0.35 && p.y + p.h > c.y - 0.35) {
        c.taken = true; c.mesh.visible = false;
        OT.Sound.bad(); OT.Input.rumble(p.i, 0.4, 0.2, 120);
        particles.burst(c.x, c.y, 10, [0x8a6a2a, 0x4a3a1a], 4, { up: 1 });
        bubble(c.x, c.y + 1.6, 'Fausse pièce ! Elle ne flottait pas…', 2.4, '#ffb020');
        heroBark('fake', p);
        fireTrigger({ x: c.x - 2.5, y: c.y - 1, act: c.act });
        break;
      }
    }
  }
  function explode(b, alive) {
    b.state = 'gone'; b.mesh.visible = false;
    OT.Sound.boom(); shake = Math.max(shake, 0.4);
    particles.burst(b.x, b.y + 0.5, 34, [0xff7a1a, 0xffd23f, 0x333333, 0xffffff], 10, { up: 3 });
    shock(b.x, b.y + 0.5, 0xffa040, 3.2, 0.5);
    for (const p of alive) {
      if (Math.hypot(p.x - b.x, p.y + 0.45 - (b.y + 0.5)) < 1.75) kill(p, 'boom');
      else if (Math.abs(p.x - b.x) < 6) OT.Input.rumble(p.i, 0.7, 0.4, 200);
    }
    for (const o of R.ents.barrel || []) if (o.state === 'idle' && Math.hypot(o.x - b.x, o.y - b.y) < 2.6) { o.state = 'fuse'; o.t = 0.22; }
    for (const c of R.ents.crate || []) if (c.alive && Math.hypot(c.x + 0.5 - b.x, c.y + 0.5 - (b.y + 0.5)) < 1.8) { c.alive = false; c.mesh.visible = false; particles.burst(c.x + 0.5, c.y + 0.5, 12, [0xb5793a, 0x7a4a1e], 6, { up: 2 }); }
    // les blocs rouillés autour cèdent
    for (let y = Math.floor(b.y) - 1; y <= Math.floor(b.y) + 1; y++) for (let x = Math.floor(b.x) - 2; x <= Math.floor(b.x) + 2; x++) {
      const t = R.tiles[y] && R.tiles[y][x];
      if (t && t.ch === '=' && t.state === 'idle') { t.state = 'shake'; t.t = 0.05; }
    }
  }
  // porte de zone : téléporte l'équipe au début de la zone suivante (et y place le point de reprise)
  function gateTeleport(list, d) {
    const to = d.to;
    list.forEach((p, k) => {
      p.finished = false; p.gateAt = null;
      p.x = to[0] + 0.5 + k * 0.9; p.y = to[1]; p.vx = 0; p.vy = 0; p.standOn = null; p.embedded = [];
      p.mesh.visible = true; p.hideT = 0; p.gs = 1;
      if (p.anim) { p.anim.loop(null); p.anim.state.one = null; }
      particles.burst(p.x, p.y + 0.6, 18, [0x5fd4ff, 0xffffff, p.color], 5, { up: 1 });
      if (mode === 'versus') p.cp = { x: to[0], y: to[1] };
    });
    if (mode !== 'versus') setCheckpoint(to[0], to[1]);
    shock(to[0] + 0.5, to[1] + 1, 0x5fd4ff, 2.6, 0.5);
    OT.Sound.gate(); OT.Input.rumble(-1, 0.2, 0.5, 160);
    const n = d.zoneN || (R.zone || 1) + 1;
    if (n > (R.zone || 1)) {
      R.zone = n;
      if (OT.UI.zone && !d.arena) OT.UI.zone(n, R.zones, d.zoneName || '', d.zoneGoal || '');   // (l'arène a déjà sa barre de boss)
      // version 1.4 : quelqu'un parle en entrant dans la zone (la Rumeur, un ami…), sinon une petite réaction
      if (OT.Dialogue && !d.arena) {
        if (d.zoneSay) { const z = d.zoneSay; setTimeout(() => { if (R && state === 'play') OT.Dialogue.say(z[0], z[1], { priority: 2 }); }, 1300); }
        else setTimeout(() => { if (R && state === 'play') heroBark('zone'); }, 1500);
      }
    }
    if (d.arena && R.bossWait) bossBegin();
  }
  // après une chute : tous les nouveaux pièges reviennent à leur état d'origine
  function resetTraps() {
    for (const c of R.ents.cp || []) c.fired = false;
    for (const k of R.ents.crusher || []) { k.state = 'idle'; k.y = k.y0; k.vy = 0; k.dy = 0; k.mesh.position.set(k.x, k.y, 0); k.shadow.material.opacity = 0; }
    for (const b of R.ents.barrel || []) { b.state = 'idle'; b.t = 0; b.mesh.visible = true; b.mesh.scale.setScalar(1); }
    for (const c of R.ents.chase || []) { c.on = false; c.done = false; c.front = c.x0 - 3; c.mesh.visible = false; }
    for (const c of R.ents.crate || []) { c.x = c.x0; c.y = c.y0; c.vx = 0; c.vy = 0; c.alive = true; c.mesh.visible = true; c.mesh.position.set(c.x, c.y, 0); }
    for (const c of R.ents.fakecoin || []) { c.taken = false; c.mesh.visible = true; }
    for (const l of R.ents.linger || []) { l.fired = false; l.t = 0; }
    for (const s of R.shots || []) R.group.remove(s.mesh);
    R.shots = [];
    R.lev = Object.assign({}, R.lev0 || {});
    R.gateQ = [];
    R.camPull = 0;
  }
  // déclencheur : invisible (comme avant) ou fil tendu bien visible (version 1.3)
  function makeTrigger(e, group) {
    const tr = Object.assign({ fired: false, t: 0 }, e);
    if (e.wire) {
      const G = geo13(), h = e.h || 0.35;
      const line = new THREE.Mesh(G.box, new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.85, toneMapped: false }));
      line.scale.set(0.035, h, 1.5); line.position.set(e.x + 0.1, e.y + h / 2 + 0.05, 0);
      const posts = [-0.78, 0.78].map((z) => { const m = new THREE.Mesh(G.box, M.MAT.dark); m.scale.set(0.12, h + 0.15, 0.12); m.position.set(e.x + 0.1, e.y + (h + 0.15) / 2, z); return m; });
      group.add(line, ...posts);
      tr.wireMesh = line;
    }
    return tr;
  }
  // fausse pièce : même forme, mais elle ne flotte pas, tourne à l'envers et brille moins
  function makeFakeCoin(e, group) {
    const g = M.coin(false);
    g.traverse((o) => { if (o.material) { o.material = o.material.clone(); if (o.material.color) o.material.color.multiplyScalar(0.82); if (o.material.emissiveIntensity !== undefined) o.material.emissiveIntensity *= 0.35; } });
    g.position.set(e.x + 0.5, e.y + 0.42, 0);
    group.add(g);
    return { x: e.x + 0.5, y: e.y + 0.42, mesh: g, act: e.act || 'drop', taken: false };
  }

  /* ==================================================================
     3. LE BOSS : le Gardien de la Forge
     ================================================================== */
  function makeBoss(group) {
    const MAT = M.MAT;
    const g = new THREE.Group();
    const torso = new THREE.Mesh(M.slabGeo(5, 5, 2.4), [MAT.plate, MAT.top]);
    torso.position.set(-2.5, 1, 0); torso.castShadow = true;
    const head = new THREE.Mesh(M.slabGeo(2.6, 1.6, 2), [MAT.dark, MAT.dark]);
    head.position.set(-1.3, 6.1, 0); head.castShadow = true;
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffb060, emissive: 0xff7a1a, emissiveIntensity: 2.4 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), eyeMat);
    const eyeR = eyeL.clone();
    eyeL.position.set(-0.6, 7.0, 1.0); eyeR.position.set(0.6, 7.0, 1.0);
    const arm = new THREE.Group();
    const a1 = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.6, 0.6), MAT.stripe); a1.position.x = -2.2;
    const fist = new THREE.Mesh(M.slabGeo(1.2, 1.2, 1.2), [MAT.dark, MAT.dark]); fist.position.set(-5.2, -0.6, 0);
    arm.add(a1, fist);
    arm.position.set(-1.8, 5.2, 1.3);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffd28a, emissive: 0xff9a2a, emissiveIntensity: 2 }));
    core.position.set(-2.6, 3.0, 0.8);   // à hauteur de saut depuis le sol
    const shield = new THREE.Mesh(new THREE.SphereGeometry(0.95, 24, 16), MAT.glowBlue.clone());
    shield.position.copy(core.position);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.8), new THREE.MeshBasicMaterial({ color: 0x9fe7ff, toneMapped: false }));
    screen.position.set(0, 3.5, 1.25); screen.visible = false;
    [-2.2, 2.2].forEach((sx) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 16), MAT.brass); s.position.set(sx, 6.4, 0); g.add(s); });
    g.add(torso, head, eyeL, eyeR, arm, core, shield, screen);
    g.position.set(32, 0, -0.2);
    group.add(g);
    const B = {
      g, torso, head, eyeMat, arm, core, shield, screen,
      box: { x0: 29.2, y0: 1, x1: 35, y1: 7.7 },
      phase: 0, hits: 0, coreHits: 0,
      // 4 boulons de plus en plus haut : le 1er depuis le sol, les 3 derniers depuis la marche F
      bolts: [{ x: 28.5, y: 2.4 }, { x: 28.5, y: 4.0 }, { x: 28.5, y: 6.4 }, { x: 28.5, y: 7.6 }],
      boltMesh: null, attackT: 2.2, attackN: 0, slamAnim: 0, warned: false,
      motors: [], realMotor: 0, shieldOffT: 0, sparkT: 2, gearT: 1.2,
      outro: 0, kneel: 0, told: [], smokeT: 0,
      // version 1.5 : écrasement, forge qui s'embrase, bras qui balaie, enchaînement de près, déséquilibre
      slamT: 4.2, fireT: 2.6, sweepT: 3.6, closeT: 0, comboT: 0, comboCool: 0, stagger: 0,
    };
    const bolt = new THREE.Group();
    const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 6), new THREE.MeshBasicMaterial({ color: 0xff8a1a, toneMapped: false }));
    bm.rotation.x = Math.PI / 2; bolt.add(bm);
    const bcore = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.36, 12), new THREE.MeshBasicMaterial({ color: 0x3a1a00, toneMapped: false }));
    bcore.rotation.x = Math.PI / 2; bolt.add(bcore);
    const bring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.8, toneMapped: false }));
    bolt.add(bring); bolt.userData.ring = bring;
    group.add(bolt); B.boltMesh = bolt;
    // 4 moteurs, chacun juste au-dessus d'une marche (ou du sol) : on les touche en sautant
    // placés assez haut pour qu'on ne les touche pas par accident en montant sur les marches
    [[6.5, 4.9], [11.5, 6.9], [19, 2.7], [21, 6.9]].forEach(([x, y], i) => {
      const m = new THREE.Group();
      const block = new THREE.Mesh(M.slabGeo(0.9, 0.7, 0.9), [MAT.plate, MAT.top]); block.position.set(-0.45, -0.35, 0);
      const fan = M.gear(0.3, 8, MAT.brass, 0.15); fan.position.z = 0.55;
      m.add(block, fan);
      const q = M.label('?', { size: 44, h: 0.5, color: '#ffd28a', bg: 'rgba(14,11,9,0.85)' });
      q.position.set(0, 0.8, 0.5); m.add(q);
      m.position.set(x, y, 0); m.visible = false;
      group.add(m);
      B.motors.push({ x, y, mesh: m, fan, alive: true, i });
    });
    B.realMotor = Math.floor(Math.random() * B.motors.length);
    // Flèches qui montrent quoi faire (toujours visibles, par-dessus tout)
    const mk = (text, bg, color) => {
      const g2 = new THREE.Group();
      const lab = M.label(text, { size: 36, h: 0.5, color, bg });
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.36, 4), new THREE.MeshBasicMaterial({ color: bg, toneMapped: false }));
      arrow.rotation.x = Math.PI; arrow.position.y = -0.42;
      g2.add(lab, arrow);
      g2.traverse((o) => { if (o.material) { o.material.depthTest = false; o.renderOrder = 20; } });
      g2.visible = false;
      group.add(g2);
      return g2;
    };
    B.markHit = mk('FRAPPE ICI', '#ffd28a', '#1a120c');
    B.markHit.scale.setScalar(1.35); B.shield.visible = false;
    B.markSwitch = mk('COUPE LE BOUCLIER', '#3cff9a', '#08200f');
    return B;
  }

  /* ==================================================================
     4. LES JOUEURS
     ================================================================== */
  function makePlayers() {
    players.forEach((p) => { if (p.mesh) scene.remove(p.mesh); });
    players = [];
    const n = mode === 'party' ? who.length : mode === 'solo' ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const info = who[i] || { name: i ? "L'Écho" : 'Oswel', skin: { color: i ? 0xff8a2b : 0x3d8bff, acc: 'aucun' } };
      const mesh = M.hero(info.skin);
      const tag = M.label(info.name, { size: 24, h: 0.22, color: '#' + new THREE.Color(info.skin.color).getHexString(), bg: 'rgba(14,11,9,0.7)' });
      tag.position.set(0, (mesh.userData.height || 1.25) + 0.42, 0.2);
      mesh.add(tag);
      mesh.userData.tag = tag;
      scene.add(mesh);
      players.push({
        i, mesh, color: info.skin.color, name: info.name, skin: info.skin, char: info.skin.char || 'oswel',
        x: 0, y: 0, vx: 0, vy: 0, w: PW, h: PH,
        onGround: false, coyote: 0, jumpBuf: 0, cut: false,
        standOn: null, alive: true, deadT: 0, finished: false,
        face: 1, squash: 1, ctrlLock: 0, landV: 0, drive: 0, walk: 0, blink: 2,
        embedded: [], jumped: false,
        stun: 0, stompCool: 0, inv: 0, out: false,   // mode fête : étourdi, invincible, éliminé
        anim: OT.Anim ? OT.Anim.create(mesh) : null, dying: 0, hideT: 0,
      });
    }
    placePlayers();
  }

  function placePlayers(onlyP) {
    // point de reprise (version 1.3) ou drapeau du mode facile, sinon le départ
    for (const p of players) {
      if (onlyP && p !== onlyP) continue;
      const sp = spawnFor(p);
      if (party() && p.out) continue;   // éliminé : il regarde la fin de la manche
      p.x = sp.x + 0.5 + (p.i === 1 ? -0.9 : 0);
      if (p.x < 1.4) p.x = sp.x + 0.5 + 0.9 * p.i;
      p.y = sp.y;
      if (party()) {
        // chaque activité choisit où réapparaître (sinon : les points de départ de l'arène)
        const at = (PM.spawn && PM.spawn(R.party, PX, p)) || (R.def.spawns ? R.def.spawns[p.i % R.def.spawns.length] : [sp.x + 0.9 * p.i, sp.y]);
        p.x = at[0] + 0.5; p.y = at[1];
      }
      p.vx = 0; p.vy = 0; p.stun = 0;
      p.alive = true; p.deadT = 0; p.finished = false; p.standOn = null; p.ctrlLock = 0; p.drive = 0;
      p.jumped = false; p.embedded = []; p.gs = 1; p.boostT = 0; p.pushing = 0;
      p.mesh.visible = true; p.dying = 0; p.hideT = 0;
      if (p.anim) { p.anim.loop(null); p.anim.state.one = null; }
      particles.burst(p.x, p.y + 0.5, 10, [p.color, 0xffffff], 3, { grav: -0.3, life: 0.5 });
    }
  }

  /* ==================================================================
     5. COLLISIONS
     ================================================================== */
  function pbox(p) { return { x0: p.x - p.w / 2, y0: p.y, x1: p.x + p.w / 2, y1: p.y + p.h }; }
  function overlap(a, b) { return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0; }

  /* ---------- Bouton d'action : entrer dans une porte, ouvrir une caisse ---------- */
  const doorZone = (d) => ({ x0: d.x - 0.05, y0: d.y, x1: d.x + 1.05, y1: d.y + 1.8 });
  const crateNear = (p, x, y) => Math.abs(p.x - (x + 0.5)) < 1.0 && Math.abs(p.y - y) < 1.2;
  function crateAt(p) {
    const cx = Math.floor(p.x), cy = Math.floor(p.y + 0.01);
    for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
      const t = R.tiles[y] && R.tiles[y][x];
      if (t && (t.ch === 'H' || t.ch === 'h') && t.state === 'idle' && crateNear(p, x, y)) return t;
    }
    return null;
  }
  // y a-t-il une porte ou une caisse à portée ? (sinon le bouton sert à parler)
  function usableNear(p) {
    const b = pbox(p);
    for (const d of [...(R.ents.door || []), ...(R.ents.fakedoor || [])]) if (d.x === (d.tx === undefined ? d.x : d.tx) && overlap(b, doorZone(d))) return true;
    if (R.ents.lever && leverNear(p)) return true;
    return !!crateAt(p);
  }
  // la touche à afficher pour ce joueur (manette, clavier ou tactile)
  function actKey(p) {
    if (party() && OT.Input.actLabel) return OT.Input.actLabel(partyDevs[p.i]);
    return OT.Input.talkHint(p.i);
  }
  // petite étiquette « △ Entrer » / « E Ouvrir » au-dessus d'une porte ou d'une caisse
  function setPrompt(o, p, verb, holder, px, py, pz) {
    if (!p) { if (o.prompt) o.prompt.visible = false; return; }
    const key = actKey(p);
    if (key + verb !== o.promptKey) {
      if (o.prompt && o.prompt.parent) o.prompt.parent.remove(o.prompt);
      o.prompt = key === 'ACTION'
        ? M.label('ACTION : ' + verb.toLowerCase(), { size: 30, h: 0.32, color: '#9dffc8', border: '#3cff9a' })
        : M.label(verb, { key, size: 30, h: 0.32, color: '#9dffc8', border: '#3cff9a' });
      o.prompt.position.set(px, py, pz);
      holder.add(o.prompt);
      o.promptKey = key + verb;
    }
    o.prompt.visible = true;
  }

  // bois des caisses cassables : planches + croisillon, dessinés une seule fois
  let _crateMat = null;
  function crateMat() {
    if (_crateMat) return _crateMat;
    const tex = M.canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#b5793a'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#7a4a1e'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
      g.lineWidth = 9; g.beginPath(); g.moveTo(10, 10); g.lineTo(w - 10, h - 10); g.moveTo(w - 10, 10); g.lineTo(10, h - 10); g.stroke();
      g.strokeStyle = 'rgba(80,45,15,0.35)'; g.lineWidth = 2;
      for (let y = 22; y < h; y += 22) { g.beginPath(); g.moveTo(10, y); g.lineTo(w - 10, y); g.stroke(); }
    });
    _crateMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
    return _crateMat;
  }
  function tileSolid(x, y) {
    if (x < 0 || x >= R.W || y < 0 || y >= R.H) return false;
    const c = R.grid[y][x];
    if (c === '#' || c === 'E') return true;
    const t = R.tiles[y][x];
    if (!t) return false;
    if (t.ext) { try { return !!t.ext.solid(t, PX); } catch (e) { EXT.warn('solid ' + t.ch, e); return false; } }
    switch (t.ch) {
      case '=': return t.state !== 'fallen';
      case '~': return t.state === 'idle';
      case 'X': return t.on;                       // bloc glitch : seulement quand il est allumé
      case 'T': return tagActive(t.group);          // balise : seulement quand <div> est ouverte
      case 'R': case 'Y': return true;              // styles glace / ressort
      case 'P': return R.bridgeOn;                  // pont : seulement si personne ne saute
      case 'C': return t.state === 'built';         // bloc compilé
      case '<': case '>': return true;              // tapis roulants
      case 'D': return t.state !== 'open';          // sol du doute (boss final)
      case 'K': return R.ab === 0 || R.blackout > 0;   // bloc rose : quand on n'a pas encore « basculé » (ou BLACKOUT)
      case 'Q': return R.ab === 1 || R.blackout > 0;   // bloc bleu : après un saut (ou BLACKOUT)
      case 'B': return t.state !== 'broken';        // caisse cassable (activité Boum !)
      case 'Z': case 'G': case '{': case '}': return true;   // sol brûlant, gelée, tapis accélérateurs
      case 'N': return levOn(t.lg, t.inv);          // bloc de levier
    }
    return false;   // 'o', 'f', 'H', 'h', 'J' ne sont PAS solides (c'est le piège !)
  }
  function tagActive(g) { const T = R.tags[g]; return !!T && (T.closed || T.t > 0); }
  // Blocs qui peuvent APPARAÎTRE sur un joueur : s'il est déjà dedans, il les traverse
  const APPEARING = 'XTPCKQN';

  // p (facultatif) = le joueur qui bouge : un module peut ajouter des murs pour un seul joueur
  function solidsNear(b, p) {
    const out = [];
    const x0 = Math.floor(b.x0) - 1, x1 = Math.floor(b.x1) + 1;
    const y0 = Math.floor(b.y0) - 1, y1 = Math.floor(b.y1) + 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (tileSolid(x, y)) out.push({ x0: x, y0: y, x1: x + 1, y1: y + 1, ref: R.tiles[y] ? R.tiles[y][x] : null });
    }
    for (const gt of R.ents.gate || []) if (gt.open < 0.6) { const oy = gt.open * gt.h; out.push({ x0: gt.x + 0.05, y0: gt.y + oy, x1: gt.x + 0.95, y1: gt.y + gt.h + oy, ref: gt }); }
    for (const pl of R.ents.plat || []) out.push({ x0: pl.x, y0: pl.y, x1: pl.x + pl.w, y1: pl.y + pl.h, ref: pl, plat: true });
    for (const k of R.ents.crusher || []) if (k.x < b.x1 + 2 && k.x + k.w > b.x0 - 2) out.push({ x0: k.x, y0: k.y, x1: k.x + k.w, y1: k.y + k.h, ref: k, plat: true });
    for (const c of R.ents.crate || []) if (c.alive && c.x < b.x1 + 2 && c.x + c.w > b.x0 - 2) out.push({ x0: c.x, y0: c.y, x1: c.x + c.w, y1: c.y + c.h, ref: c, crate: true });
    if (R.boss && R.boss.box) out.push(Object.assign({ ref: R.boss }, R.boss.box));
    if (R.bfxSolids && R.bfxSolids.length) for (const sb of R.bfxSolids) out.push(sb);   // poing planté d'un boss (on peut monter dessus)
    // version 1.5 : murs, plateformes et portes des modules
    if (R.extSolid) for (let i = 0; i < R.extSolid.length; i++) {
      const [name, d] = R.extSolid[i];
      try { d.solids(R.ents[name], b, out, p || null, PX); } catch (e) { EXT.warn('solids ' + name, e); }
    }
    if (EXT.has('solids')) EXT.run('solids', b, out, p || null, PX);
    return out;
  }

  function embeddedIn(p) {
    const b = pbox(p), out = [];
    for (const s of solidsNear(b, p)) if (s.ref && s.ref.ch && APPEARING.includes(s.ref.ch) && overlap(b, s)) out.push(s.ref);
    return out;
  }
  function movePlayer(p, dt) {
    p.standOn = null;
    p.x += p.vx * dt;
    let b = pbox(p);
    const skip = p.embedded;
    const pass = p.passSolid;   // version 1.5 : gadget PHASE (on traverse certains obstacles)
    for (const s of solidsNear(b, p)) {
      if (skip.length && skip.includes(s.ref)) continue;
      if (!overlap(b, s)) continue;
      if (pass && pass(s)) continue;
      // une plateforme (ascenseur) qui monte sous nos pieds : la passe verticale nous soulève, on ne nous pousse pas de côté
      if (s.plat && p.vy <= 0 && b.y0 >= s.y1 - 0.4) continue;
      // une caisse : on la pousse (elle avance si rien ne la bloque)
      if (s.crate && p.vx !== 0 && b.y0 < s.y1 - 0.3 && b.y1 > s.y0 + 0.2) {
        const want = p.vx > 0 ? b.x1 - s.x0 + 1e-4 : b.x0 - s.x1 - 1e-4;
        const moved = crateTryMove(s.ref, want);
        p.pushing = 0.12;
        if (Math.abs(moved - want) < 1e-5) continue;
        s.x0 = s.ref.x; s.x1 = s.ref.x + s.ref.w;
        if (!overlap(b, s)) continue;
      }
      if (p.vx > 0) p.x = s.x0 - p.w / 2 - 1e-4;
      else if (p.vx < 0) p.x = s.x1 + p.w / 2 + 1e-4;
      else p.x += (p.x < (s.x0 + s.x1) / 2 ? -1 : 1) * 0.02;
      p.vx = 0; b = pbox(p);
    }
    const wasGround = p.onGround;
    p.onGround = false;
    p.y += p.vy * dt;
    b = pbox(p);
    const gs = p.gs || 1;   // gravité inversée : on « tombe » vers le haut et on marche sous les plafonds
    for (const s of solidsNear(b, p)) {
      if (skip.length && skip.includes(s.ref)) continue;
      if (!overlap(b, s)) continue;
      if (pass && pass(s)) continue;
      if (gs > 0 ? p.vy <= 0 : p.vy >= 0) {
        p.y = gs > 0 ? s.y1 : s.y0 - p.h - 1e-4;
        if (!wasGround) p.landV = Math.abs(p.vy);
        p.vy = 0; p.onGround = true; p.standOn = s;
      } else { p.y = gs > 0 ? s.y0 - p.h - 1e-4 : s.y1; p.vy = 0; }
      b = pbox(p);
    }
  }

  /* ==================================================================
     6. MISE À JOUR
     ================================================================== */
  function updatePlayer(p, inp, dt) {
    if (!p.alive || p.finished) return;
    inp = inp || {};
    // version 1.5 : gadgets, laisse de la coop… (ils peuvent régler p.speedMul, p.passSolid…)
    if (EXT.has('playerUpdate')) EXT.run('playerUpdate', p, inp, dt, PX);
    if (!p.alive || p.finished) return;
    const run = 1 + (RUN_MUL - 1) * Math.min(1, inp.run || 0);
    // vitesse demandée : stick analogique (0,3 = lent … 1 = normal … 1,3 = à fond) ou course (□ / Maj)
    const want = Math.max(run > 1 ? run : 0, inp.analog || 1);
    let dir = 0;
    if (p.nearT > 0) p.nearT -= dt;
    if (p.ctrlLock > 0) p.ctrlLock -= dt;
    else dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    // version 1.3 : zones (commandes inversées, gravité inversée / forte, vent)
    const zInv = R.ents.zone ? inZone(p, 'invert') : null;
    if (zInv) dir = -dir;
    if (zInv && !p.wasInv) heroOnce('h_invert', p);
    p.wasInv = !!zInv;
    const zFlip = R.ents.zone ? inZone(p, 'flip') : null;
    const gs = zFlip ? -1 : 1;
    if (gs !== (p.gs || 1)) { p.gs = gs; p.onGround = false; p.coyote = 0; p.standOn = null; OT.Sound.whoosh(); OT.Input.rumble(p.i, 0.2, 0.3, 100); if (gs < 0) heroOnce('h_flip', p); }
    const zWind = R.ents.zone ? inZone(p, 'wind') : null;
    // Debout sur une plateforme-machine : le joystick PILOTE la machine
    const plat = p.onGround && p.standOn && p.standOn.plat ? p.standOn.ref : null;
    const driving = plat && !plat.auto && !R.boothActive;
    p.drive = driving ? dir * MAX_V * run : 0;
    // Monde 2 : style « glace » → on glisse (on accélère et on freine très mal)
    const ice = p.onGround && p.standOn && p.standOn.ref && p.standOn.ref.ch === 'R';
    const goo = p.onGround && p.standOn && p.standOn.ref && p.standOn.ref.ch === 'G';   // gelée : on avance lentement
    p.pushing = Math.max(0, (p.pushing || 0) - dt);
    let target = driving ? 0 : dir * MAX_V * want * (ice ? 1.2 : 1) * (goo ? 0.42 : 1) * (p.speedMul || 1);
    if (p.pushing > 0 && !driving) target = Math.max(-3.4, Math.min(3.4, target));      // pousser une caisse, c'est lourd
    if (zWind) target += zWind.power;
    let acc = p.onGround ? (ice ? (dir ? 9 : 2.2) : (dir && !driving ? ACC_GROUND : FRICTION)) : ACC_AIR;
    // changement de direction : réponse immédiate (sauf sur la glace, faite pour glisser)
    if (dir && !ice && p.onGround && p.vx * dir < 0) acc *= TURN_BOOST;
    p.boostT = Math.max(0, (p.boostT || 0) - dt);
    if (p.ctrlLock <= 0 && p.boostT <= 0) {
      if (p.vx < target) p.vx = Math.min(target, p.vx + acc * dt);
      else if (p.vx > target) p.vx = Math.max(target, p.vx - acc * dt);
    }
    if (dir) p.face = dir;

    if (p.onGround) p.coyote = COYOTE; else p.coyote -= dt;
    if (inp.jumpP) p.jumpBuf = JUMP_BUFFER; else p.jumpBuf -= dt;
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = JUMP_V * gs * (goo ? 0.74 : 1); p.jumpBuf = 0; p.coyote = 0; p.cut = false;
      p.jumped = true;   // Monde 2 : un vrai saut est un « événement » (pics J, ponts P)
      // Monde 4 : chaque saut fait basculer les blocs roses et bleus
      if (R.hasAB) { R.ab ^= 1; OT.Sound.click(); OT.Input.rumble(-1, 0, 0.15, 40); }
      if (plat) p.vx += (plat.v || 0) * 0.6 + (driving ? dir * MAX_V * 0.35 : 0);
      p.onGround = false; p.squash = 1.22;
      if (p.anim) p.anim.play('jump');
      OT.Sound.jump(); OT.Input.rumble(p.i, 0, 0.12, 40);
      particles.burst(p.x, p.y, 5, 0xbfb3a5, 2.5, { up: 1, life: 0.35, size: 0.7 });
    } else if (p.jumpBuf > 0 && inp.jumpP && !p.onGround && EXT.has('airJump') && EXT.any('airJump', p, PX)) {
      // version 1.5 : saut en l'air autorisé par un module (gadget DOUBLE SAUT)
      p.vy = (p.airJumpV || JUMP_V * 0.92) * gs; p.airJumpV = 0; p.jumpBuf = 0; p.coyote = 0; p.cut = false; p.jumped = true;   // (1.5 : un module peut régler la force : zone « battement »)
      if (R.hasAB) { R.ab ^= 1; OT.Sound.click(); }
      p.squash = 1.25;
      if (p.anim) p.anim.play('jump');
      OT.Sound.jump(); OT.Input.rumble(p.i, 0.1, 0.2, 60);
      particles.burst(p.x, p.y + 0.1, 10, [0xbfe0ff, 0xffffff], 3, { grav: 0.2, life: 0.4, size: 0.8 });
      shock(p.x, p.y + 0.05, 0xbfe0ff, 0.9, 0.3, true);
    }
    if (!inp.jump && p.vy * gs > 0 && !p.cut) { p.vy *= 0.55; p.cut = true; }
    // Monde 3 : bulle d'apesanteur (gravité réduite) · Monde 4 : ventilateurs qui soulèvent
    const gz = zoneGravity(p) * (R.ents.zone && inZone(p, 'heavy') ? 1.8 : 1);
    if (gs > 0) p.vy = Math.max(gz < 1 ? -9 : MAX_FALL, p.vy - GRAV * gz * dt);
    else p.vy = Math.min(gz < 1 ? 9 : -MAX_FALL, p.vy + GRAV * gz * dt);
    for (const f of R.ents.fan || []) if (p.x > f.x - 0.5 && p.x < f.x + 1.5 && p.y >= f.y - 0.2 && p.y < f.y + f.h) {
      p.vy = Math.min(p.vy + f.power * dt, 8.5); p.cut = true;
      if (Math.random() < 0.08) OT.Input.rumble(p.i, 0, 0.1, 40);
    }

    if (p.standOn && p.standOn.plat && p.standOn.ref) {   // (1.5 : un solide d'un module peut ne pas avoir de « ref »)
      const carry = p.standOn.ref.dx || 0;
      p.x += carry;
      const b = pbox(p);
      for (const s of solidsNear(b, p)) if (!s.plat && overlap(b, s)) { p.x -= carry; break; }
      // ascenseur : on monte et on descend avec lui
      if (p.standOn.ref.dy && p.vy <= 0) p.y += p.standOn.ref.dy;
    }
    // Monde 3 : tapis roulant → il nous emporte
    if (p.onGround && p.standOn && p.standOn.ref && p.standOn.ref.dir && (p.standOn.ref.ch === '<' || p.standOn.ref.ch === '>')) {
      const carry = p.standOn.ref.dir * 3.4 * dt;
      p.x += carry;
      const b = pbox(p);
      for (const s of solidsNear(b, p)) if (overlap(b, s)) { p.x -= carry; break; }
    }
    p.embedded = embeddedIn(p);
    const steps = Math.ceil(Math.max(Math.abs(p.vx), Math.abs(p.vy)) * dt / 0.2) || 1;
    for (let k = 0; k < steps; k++) movePlayer(p, dt / steps);
    if (p.onGround) p.jumped = false;
    // Monde 2 : style « ressort » → on rebondit dès qu'on le touche
    if (p.onGround && gs > 0 && p.standOn && p.standOn.ref && p.standOn.ref.ch === 'Y') {
      p.vy = 15.5; p.onGround = false; p.cut = true; p.squash = 1.3; p.jumped = false;
      OT.Sound.spring(); OT.Input.rumble(p.i, 0.3, 0.5, 110);
      heroOnce('h_spring', p);
      particles.burst(p.x, p.y, 6, [0x3a7bff, 0xbfe0ff], 3, { up: 1, life: 0.35 });
    }

    if (p.landV > 0) {
      if (p.landV > 8) {
        OT.Sound.land();
        OT.Input.rumble(p.i, Math.min(0.5, p.landV / 40), 0.2, 60);
        particles.burst(p.x, p.y, 6, 0x9c8f80, 3, { up: 1, life: 0.4, size: 0.8 });
        if (p.landV > 14) shock(p.x, p.y + 0.03, 0xd8c8b0, 0.9, 0.3, true);   // gros atterrissage : poussière en anneau
        p.squash = 0.75;
        if (p.anim) p.anim.play('land');
      }
      p.landV = 0;
    }
    if (p.y < -3 || (gs < 0 && p.y > R.H + 1.5)) kill(p, 'fall');
  }

  function zoneGravity(p) {
    for (const z of R.ents.lowg || []) if (p.x > z.x0 && p.x < z.x1 && p.y + 0.45 > z.y0 && p.y + 0.45 < z.y1) return 0.38;
    return 1;
  }

  function kill(p, cause) {
    if (!p.alive || p.finished || state !== 'play') return;
    if (party() && (R.party.countdown > 0 || (p.inv > 0 && cause !== 'fall'))) return;
    if (R.boss && R.boss.outro > 0 && !R.escape) return;
    // version 1.5 : un module peut annuler cette mort (gadget BOUCLIER, PHASE…)
    if (EXT.has('beforeKill') && EXT.any('beforeKill', p, cause, PX)) return;
    p.alive = false;
    p.deadT = 0.65;   // on repart vite : « Encore une fois ! »
    // petite animation de chute (le personnage tournoie puis disparaît)
    if (p.anim && cause !== 'fall') { p.anim.play('death'); p.dying = 0.5; } else p.mesh.visible = false;
    R.deaths++;
    R.lastCause = cause;
    if (R.stats) { R.stats.deathsBy[p.i] = (R.stats.deathsBy[p.i] || 0) + 1; if (R.boss && !R.bossWait && !R.escape && !(R.boss.outro > 0)) { R.stats.bossDeaths++; if (R.stats.bossDeaths % 3 === 0) setTimeout(() => combatEvent('fail'), 1200); } if ((R.ents.chase || []).some((c) => c.on && !c.done) || R.escape) R.stats.chaseDeaths++; }
    EXT.run('kill', p, cause, PX);
    // 1.5 : le héros réagit à la cause PRÉCISE (pics, scie, laser…), sinon la réaction générale
    const dk = 'death_' + cause;
    heroBark(cause === 'fall' ? 'fall' : (OT.Dialogue && OT.Dialogue.BARKS[dk] ? dk : 'death'), p);
    R.cpDeaths = (R.cpDeaths || 0) + 1;   // chutes depuis le dernier point de reprise (pour « Enfin ! »)
    R.barkRetry = p;
    if (OT._onKill) OT._onKill(p, cause);   // utilisé seulement par les tests automatiques
    addMark(p.x, p.y);
    if (OT.Light) OT.Light.flash(p.i, 0xff0000, 0.6, 0x000000);
    if (!party()) OT.Save.addDeath();
    OT.Sound.death();
    OT.Input.rumble(p.i, 1, 1, 380);
    shake = Math.max(shake, party() ? 0.2 : 0.35);
    if (OT.Cam && !party()) OT.Cam.punch(0.08);
    if (!party()) OT.UI.flash();
    particles.burst(p.x, p.y + 0.45, 26, [p.color, 0xffffff, 0x2a2a2a], 9, { up: 3 });
    shock(p.x, p.y + 0.5, 0xffffff, 2.2, 0.4);
    if (cause === 'zap') particles.burst(p.x, p.y + 0.5, 14, 0x7fd0ff, 10, { grav: 0 });
    // Mode fête : l'activité décide (réapparaître dans X secondes, ou éliminé)
    if (party()) {
      const d = PM.onKill ? PM.onKill(R.party, PX, p, cause) : 1.2;
      if (d === null || d === undefined || d < 0) { p.out = true; p.deadT = 1e9; } else p.deadT = d;
      return;
    }
    // En solo / coop : un seul tombe, toute l'équipe recommence
    // version 1.5 : la coop peut garder le partenaire en vie (il continue, l'autre revient près de lui)
    if (mode !== 'versus' && !(EXT.has('noTeamDeath') && EXT.any('noTeamDeath', p, cause, PX)))
      for (const o of players) if (o !== p && o.alive && !o.finished) { o.alive = false; o.deadT = 0.65; }
    OT.UI.hud(hudData());
  }

  /* --- Remise à zéro COMPLÈTE du niveau (état d'origine) --- */
  function resetAttempt() {
    // BLACKOUT de Win Black : le courant revient, on peut lui reparler
    R.blackout = 0; R.blackoutTotal = 0; restoreLights();
    for (const n of R.ents.npc || []) n.talks = 0;
    for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) {
      const t = R.tiles[y][x];
      if (!t) continue;
      t.state = 'idle'; t.t = 0; t.oy = 0; t.vy = 0;
      t.mesh.position.set(t.x, t.y + (t.ch0 === 'T' ? 0.4 : 0), 0);
      t.mesh.rotation.set(0, 0, 0);
      t.mesh.visible = true;
      if (t.ch0 === 'H' || t.ch0 === 'h') { t.spikes.visible = false; t.spikes.scale.y = 0.01; t.box.visible = t.lid.visible = t.handle.visible = true; if (t.prompt) t.prompt.visible = false; }
      if (t.fadeMats) t.fadeMats.forEach((m) => (m.opacity = 1));
      if (t.ch !== t.ch0) setStyle(t, t.ch0);       // le styliste remet le CSS d'origine
      if (t.ch0 === 'C') t.mesh.visible = false;
      if (t.ch0 === 'J') t.spikes.scale.y = 0.05;
      if (t.ch0 === 'X') t.on = true;
      if (t.ext && t.ext.reset) EXT.safe('reset ' + t.ch0, () => t.ext.reset(t, PX));
    }
    R.falling.length = 0;
    for (const tr of R.ents.trigger || []) { tr.fired = false; tr.t = 0; }
    for (const d of R.ents.door || []) { d.x = d.ox; d.tx = d.ox; d.y = d.oy; d.hopI = 0; d.mesh.position.set(d.x + 0.5, d.y, -0.5); }
    for (const n of R.ents.rumeur || []) n.saidT = 0;
    for (const pl of R.ents.plat || []) { pl.x = pl.x0; pl.y = pl.y0; pl.dx = 0; pl.dy = 0; pl.v = 0; pl.mesh.position.set(pl.x, pl.y, 0); }
    for (const bt of R.ents.button || []) { bt.hold = 0; bt.pressed = false; }
    for (const gt of R.ents.gate || []) { gt.open = 0; gt.mesh.position.y = gt.y + gt.h / 2; }
    for (const sw of R.ents.switch || []) sw.pressed = false;
    for (const s of R.ents.spring || []) s.t = 0;
    for (const pt of [...(R.ents.part || []), ...(R.ents.fakepart || [])]) { pt.taken = false; pt.mesh.visible = true; }
    for (const c of R.ents.coin || []) { c.taken = false; c.hidden = c.inBox; c.mesh.visible = !c.inBox; c.y = c.by + 0.5; if (c.home) { c.home = null; c.x = c.bx + 0.5; c.mesh.position.x = c.x; } }
    for (const g in R.tags) { R.tags[g].t = 0; R.tags[g].closed = false; }
    for (const tp of R.ents.tagclose || []) tp.done = false;
    for (const l of R.ents.link || []) l.cool = 0;
    for (const cb of R.ents.compile || []) { cb.pressed = false; cb.cap.position.y = 0.1; }
    for (const g in R.comp) Object.assign(R.comp[g], { t: -1, built: 0, said: false, rate: 0 });
    R.jumping = false; R.jumpLag = 9; R.bridgeOn = true;
    R.ab = 0;
    for (const pt of R.ents.portal || []) pt.cool = 0;
    players.forEach((p) => (p.portalCool = 0));
    R.styleSwapped = false;
    if (R.rival) { R.rival.i = 0; R.rival.x = R.rival.path[0][0]; R.rival.y = R.rival.path[0][1]; R.rival.done = false; R.rival.said = false; }
    R.picked.length = 0;
    R.hasPart = false;
    R.powerOffT = 0;
    R.hazards.forEach((h) => { R.group.remove(h.mesh); if (h.shadow) R.group.remove(h.shadow); });
    R.hazards.length = 0;
    clearBfx();
    if (R.boss && !R.escape && !R.bossWait) bossOps(R.boss).reset(R.boss);
    resetTraps();
    // Point de reprise (ou drapeau du mode facile) : on garde ce qui avait été obtenu avant
    const save = R.cpAt ? R.cpAtSave : R.cpOn ? R.cpState : null;
    if (save) {
      if (save.hasPart) { R.hasPart = true; for (const pt of R.ents.part || []) { pt.taken = true; pt.mesh.visible = false; } }
      for (const pk of save.picked) {
        const c = (R.ents.coin || []).find((k) => k.i === pk.i);
        if (c) { c.taken = true; c.mesh.visible = false; R.picked.push(pk); }
      }
    }
    // Fantôme : l'essai raté devient le fantôme du prochain essai (solo)
    if (mode === 'solo' && R.ghostRec.length > 20) { R.ghostRun = R.ghostRec; }
    R.ghostRec = [];
    R.attemptT = 0;
    OT.Sound.setHum(0);
    // version 1.5 : les pièges et mécanismes des modules reviennent aussi à leur état d'origine
    for (const name in EXT.types) {
      const d = EXT.types[name];
      if (d.reset && R.ents[name]) EXT.safe('reset ' + name, () => d.reset(R.ents[name], PX));
    }
    EXT.run('reset', PX);
  }

  /* --- Marques de mort : une croix rouge là où on est tombé (reste pendant toute la session du niveau) --- */
  let markGeo = null, markMat = null;
  function addMark(x, y) {
    if (!R.markGroup) return;
    if (!markGeo) {
      markGeo = new THREE.BoxGeometry(0.5, 0.09, 0.04); markGeo.userData.shared = true;
      markMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.75, toneMapped: false, depthWrite: false });
    }
    const g = new THREE.Group();
    const a = new THREE.Mesh(markGeo, markMat); a.rotation.z = Math.PI / 4;
    const b = new THREE.Mesh(markGeo, markMat); b.rotation.z = -Math.PI / 4;
    g.add(a, b);
    g.position.set(x, Math.max(0.3, y + 0.45), 0.95);
    R.markGroup.add(g);
    R.marks.push(g);
    if (R.marks.length > 60) R.markGroup.remove(R.marks.shift());
  }

  /* --- Le styliste : glace ⇄ ressort --- */
  function setStyle(t, ch) {
    const MAT = M.MAT;
    t.ch = ch;
    t.mesh.material = ch === 'R' ? [MAT.iceSide, MAT.ice] : [MAT.bounceSide, MAT.bounce];
  }

  function updateWorld(dt) {
    const alive = players.filter((p) => p.alive && !p.finished);
    const versus = mode === 'versus' || mode === 'party';

    /* Plateformes-machines liées */
    const booth = (R.ents.booth || [])[0];
    const inBooth = booth ? alive.filter((p) => p.x >= booth.x0 && p.x <= booth.x1 && p.y >= booth.y - 0.1 && p.y < booth.y + 2) : [];
    R.boothActive = inBooth.length > 0;
    let cmd = 0;
    if (R.boothActive) cmd = inBooth.reduce((s, p) => s + p.vx, 0) / inBooth.length;
    else { const d = alive.filter((p) => p.drive); if (d.length) cmd = d.reduce((s, p) => s + p.drive, 0) / d.length; }
    // Personne ne pilote depuis 1,5 s ? Les plateformes reviennent doucement à leur place
    // (sinon, en coop, le 2e joueur resterait bloqué une fois le 1er passé).
    const driving = R.boothActive || alive.some((p) => p.drive || (p.onGround && p.standOn && p.standOn.plat && p.standOn.ref && !p.standOn.ref.auto));
    R.platIdle = driving ? 0 : (R.platIdle || 0) + dt;
    for (const pl of R.ents.plat || []) {
      if (pl.kind === 'V') {
        // ascenseur (Monde 2) : monte et descend tout seul
        const ny = pl.y0 + (1 - Math.cos((TT(pl) + pl.phase) * pl.speed)) / 2 * pl.range;
        pl.dy = ny - pl.y; pl.dx = 0; pl.v = 0; pl.y = ny;
        pl.mesh.position.y = pl.y;
        continue;
      }
      let v = pl.kind === 'M' ? (pl.x0 + Math.sin((TT(pl) + pl.phase) * pl.speed) * pl.range - pl.x) / dt : (pl.kind === 'm' ? -1 : 1) * cmd;
      if (!pl.auto && R.platIdle > 1.5) v = Math.max(-2.5, Math.min(2.5, (pl.x0 - pl.x) * 2));
      let nx = Math.max(pl.x0 - pl.range, Math.min(pl.x0 + pl.range, pl.x + v * dt));
      pl.dx = nx - pl.x; pl.v = pl.dx / dt; pl.x = nx;
      pl.mesh.position.x = pl.x;
      pl.gear.rotation.z -= pl.dx * 2;
    }

    /* Monde 2 : « événement saut » → les pics J sortent, les ponts P disparaissent */
    const jumpingNow = alive.some((p) => p.jumped && !p.onGround);
    if (jumpingNow) R.jumpLag = 0; else R.jumpLag += dt;
    R.jumping = jumpingNow;
    R.bridgeOn = !jumpingNow && R.jumpLag > 0.08;
    R.linkCool = Math.max(0, R.linkCool - dt);

    /* Boutons et barrière */
    let anyBtn = false, allBtn = (R.ents.button || []).length > 0;
    for (const bt of R.ents.button || []) {
      const zone = { x0: bt.x + 0.1, y0: bt.y - 0.05, x1: bt.x + 0.9, y1: bt.y + 0.3 };
      // (1.5 : le CLONE de Tony — pouvoir Copier-coller — peut rester debout sur le bouton à sa place)
      if (bt.ghostT > 0) bt.ghostT -= dt;
      const on = alive.some((p) => overlap(pbox(p), zone)) || (R.ents.crate || []).some((c) => c.alive && overlap(crateBox(c), zone)) || bt.ghostT > 0;
      if (on && !bt.pressed) { OT.Sound.click(); alive.forEach((p) => overlap(pbox(p), zone) && OT.Input.rumble(p.i, 0, 0.25, 60)); }
      bt.pressed = on;
      if (on) bt.hold = bt.time ? ez(bt.time) : coopShort() && !bt.long ? 0.25 : ez(SOLO_BUTTON); else bt.hold -= dt;
      // bouton chronométré (porte qui se referme) : tic-tac pendant que la porte est ouverte
      if (bt.time && !on && bt.hold > 0 && Math.floor(bt.hold * 4) !== Math.floor((bt.hold + dt) * 4)) OT.Sound.tick(0.6);
      bt.cap.position.y = on ? 0.03 : 0.1;
      bt.cap.material.color.set(bt.hold > 0 ? 0x3cff9a : 0xd23a2a);
      if (bt.hold > 0) anyBtn = true; else allBtn = false;
    }
    for (const gt of R.ents.gate || []) {
      const zone = { x0: gt.x, y0: gt.y, x1: gt.x + 1, y1: gt.y + gt.h };
      const blocked = alive.some((p) => overlap(pbox(p), zone));
      const before = gt.open;
      // gate « all » (Monde 2, « si… et… ») : TOUS les boutons doivent être actifs
      // version 1.3 : barrière de levier (lv) ou liée à ses propres boutons (g)
      let want = gt.all ? allBtn : anyBtn;
      if (gt.lv !== undefined) want = levOn(gt.lv, gt.inv);
      else if (gt.g !== undefined) want = (R.ents.button || []).some((bt) => bt.g === gt.g && bt.hold > 0);
      else if ((R.ents.button || []).some((bt) => bt.g !== undefined)) want = (R.ents.button || []).some((bt) => bt.g === undefined && bt.hold > 0) || (gt.all && allBtn);
      gt.open = Math.max(0, Math.min(1, gt.open + Math.sign((want || blocked ? 1 : 0) - gt.open) * dt * 3.5));
      if (before > 0 && gt.open === 0) { OT.Sound.slam(); OT.Input.rumble(-1, 0.4, 0.1, 120); }
      gt.mesh.position.y = gt.y + gt.h / 2 + gt.open * (gt.h - 0.4);
    }

    /* Électricité */
    if (R.hasElec) {
      R.powerOffT -= dt;
      for (const sw of R.ents.switch || []) {
        const zone = { x0: sw.x + 0.15, y0: sw.y, x1: sw.x + 0.85, y1: sw.y + (sw.fake ? 0.45 : 0.8) };
        const touching = alive.filter((p) => overlap(pbox(p), zone));
        if (sw.fake && touching.length) { touching.forEach((p) => { OT.Sound.zap(); kill(p, 'zap'); }); continue; }
        // (1.5 : le CLONE de Tony appuie à sa place sur un vrai interrupteur)
        if (sw.ghostT > 0) { sw.ghostT -= dt; if (!sw.fake) R.powerOffT = Math.max(R.powerOffT, coopShort() ? 0.3 : ez(SOLO_SWITCH)); }
        if (touching.length) {
          if (!sw.pressed) { OT.Sound.click(); touching.forEach((p) => OT.Input.rumble(p.i, 0.2, 0.3, 80)); }
          R.powerOffT = Math.max(R.powerOffT, coopShort() ? 0.3 : ez(SOLO_SWITCH));
        }
        sw.pressed = touching.length > 0;
        sw.lever.rotation.z = sw.pressed || R.powerOffT > 0 ? -0.5 : 0.5;
      }
      const phase = time % (ELEC_HALF * 2);
      const wasOn = R.powered;
      R.powered = phase < ELEC_HALF && R.powerOffT <= 0;
      const warn = !R.powered && R.powerOffT <= 0 && phase > ELEC_HALF * 2 - 0.3;
      M.MAT.elec.emissiveIntensity = R.powered ? 1.8 + Math.sin(time * 40) * 0.4 : (warn ? (Math.sin(time * 50) > 0 ? 0.7 : 0) : 0);
      for (const sw of R.ents.switch || []) sw.lamp.material.color.set(R.powerOffT > 0 ? 0x3cff9a : 0xff3020);
      if (R.powered && !wasOn) for (const p of alive) if (nearElec(p, 2)) OT.Input.rumble(p.i, 0, 0.35, 120);
      if (warn) for (const p of alive) if (nearElec(p, 1.5) && Math.random() < 0.15) OT.Input.rumble(p.i, 0, 0.15, 40);
      if (R.powered) {
        for (const p of alive) {
          const x0 = Math.floor(p.x - p.w / 2 + 0.15), x1 = Math.floor(p.x + p.w / 2 - 0.15);
          const ty = Math.round(p.y) - 1;
          if (Math.abs(p.y - (ty + 1)) < 0.12) for (let x = x0; x <= x1; x++) if (R.grid[ty] && R.grid[ty][x] === 'E') { OT.Sound.zap(); kill(p, 'zap'); break; }
        }
        if (Math.random() < 0.35) {
          const e = R.elecSample || (R.elecSample = collectElec());
          const s = e[Math.floor(Math.random() * e.length)];
          if (s) particles.burst(s[0] + Math.random(), s[1] + 1.05, 1, 0x9fd8ff, 3, { grav: 0, life: 0.2, size: 0.6 });
        }
      }
    }

    /* Tuiles spéciales */
    for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) {
      const t = R.tiles[y][x];
      if (!t) continue;
      if (t.ch === '=') {
        if (FZ(t) && t.state !== 'fallen') continue;   // 1.5 : bloc COMPILÉ (Tony) — il tient bon 2 s
        if (t.state === 'idle' && R.standCrumble) {
          // Sol de lave : le bloc ne cède que si quelqu'un RESTE dessus (on peut marcher dessus sans le casser)
          const on = alive.find((p) => p.onGround && p.standOn && p.standOn.ref === t);
          if (on && !(party() && R.party.countdown > 0)) {
            t.standT = (t.standT || 0) + dt;
            t.mesh.position.x = x + (t.standT > R.crumbleDelay * 0.5 ? Math.sin(time * 50) * 0.03 : 0);
            if (t.standT > R.crumbleDelay) { t.state = 'shake'; t.t = 0.4; OT.Sound.crumble(); OT.Input.rumble(on.i, 0.1, 0.35, 150); }
          } else { t.standT = Math.max(0, (t.standT || 0) - dt); t.mesh.position.x = x; }
        } else if (t.state === 'idle') {
          for (const p of alive) if (p.onGround && p.standOn && p.standOn.ref === t && !(party() && R.party.countdown > 0)) { t.state = 'shake'; t.t = ez(t.delay || R.crumbleDelay || CRUMBLE_DELAY); OT.Sound.crumble(); OT.Input.rumble(p.i, 0.1, 0.35, 150); heroOnce('h_crumble', p); }
        } else if (t.state === 'shake') {
          t.t -= dt;
          t.mesh.position.x = x + Math.sin(time * 70) * 0.05;
          if (t.t <= 0) { t.state = 'fallen'; t.t = 3; t.vy = 0; particles.burst(x + 0.5, y + 0.5, 8, 0x8a4b22, 4); }
        } else if (t.state === 'fallen') {
          t.t -= dt; t.vy -= 30 * dt; t.oy += t.vy * dt;
          t.mesh.position.set(x, y + t.oy, 0);
          t.mesh.visible = t.oy > -12;
          if (t.t <= 0 && !R.noRestore) {
            const zone = { x0: x, y0: y, x1: x + 1, y1: y + 1 };
            if (!players.some((p) => p.alive && overlap(pbox(p), zone))) { t.state = 'idle'; t.oy = 0; t.vy = 0; t.mesh.visible = true; t.mesh.position.set(x, y, 0); }
          }
        }
      } else if (t.ch === '~' && t.state === 'drop') {
        // 1.5 : sol piégé COMPILÉ (Tony) : il refuse de tomber tant qu'il est figé
        if (FZ(t)) { t.state = 'idle'; t.oy = 0; t.vy = 0; t.t = 0; t.mesh.visible = true; t.mesh.position.set(x, y, 0); t.mesh.rotation.set(0, 0, 0); continue; }
        t.vy -= 30 * dt; t.oy += t.vy * dt; t.t += dt;
        t.mesh.position.y = y + t.oy;
        t.mesh.rotation.z = t.oy * 0.04;
        if (t.oy < -14) t.mesh.visible = false;
        if (versus && t.t > 3.5) { t.state = 'idle'; t.oy = 0; t.vy = 0; t.t = 0; t.mesh.visible = true; t.mesh.position.set(x, y, 0); t.mesh.rotation.set(0, 0, 0); }
      } else if (t.ch === 'H' || t.ch === 'h') {
        if (t.state === 'idle') {
          // on ouvre une caisse avec le bouton d'action : piégée = elle mord, bonne = une pièce
          const near = alive.filter((p) => crateNear(p, x, y));
          setPrompt(t, near[0], 'Ouvrir', t.mesh, 0.5, 1.15, 0.45);
          // indice pour les observateurs : une caisse piégée frémit de temps en temps
          if (t.ch === 'H') { const k = (time + x * 0.37) % 4.2; t.mesh.rotation.z = k < 0.3 ? Math.sin(k * 70) * 0.035 : 0; }
          const p = near.find((q) => q.useT > 0);
          if (p) {
            p.useT = 0;
            t.state = 'open'; t.mesh.rotation.z = 0;
            if (p.anim) p.anim.play('interact');
            if (t.prompt) t.prompt.visible = false;
            t.lid.visible = t.handle.visible = false;
            particles.burst(x + 0.5, y + 0.5, 10, [0xd23a2a, 0xa82a1d], 5, { up: 2 });
            if (t.ch === 'H') {
              t.box.visible = false; t.spikes.visible = true;
              OT.Sound.slam(); OT.Input.rumble(p.i, 0.5, 0.2, 120);
              bubble(x + 0.5, y + 2.2, 'Caisse piégée !', 2.2, '#ff5533');
              kill(p, 'spike');
            } else {
              // bonne caisse : une pièce en sort et file vers celui qui l'a ouverte
              OT.Sound.part(); OT.Input.rumble(p.i, 0, 0.2, 60);
              if (p.anim) p.anim.expr('surprised', 0.9);
              const c = (R.ents.coin || []).find((k) => k.inBox && k.bx === x && k.by === y);
              if (c && !c.taken) { c.hidden = false; c.mesh.visible = true; c.y = y + 1.0; c.home = p; c.homeT = 0; }
            }
          }
        } else if (t.ch === 'H') {
          t.spikes.scale.y = Math.min(1, t.spikes.scale.y + dt * 14);
          const zone = { x0: x + 0.1, y0: y, x1: x + 0.9, y1: y + 0.55 };
          for (const p of alive) if (overlap(pbox(p), zone)) kill(p, 'spike');
        }
      } else if (t.ch === 'X') {
        // bloc glitch : allumé 60 % du temps, clignote 0,45 s avant de s'éteindre
        const ph = (TT(t) + t.phase) % t.period, onLen = t.period * 0.6;
        let want = ph < onLen;
        if (want && !t.on) {
          const zone = { x0: x, y0: y, x1: x + 1, y1: y + 1 };
          if (players.some((p) => p.alive && overlap(pbox(p), zone))) want = false;   // il n'apparaît pas sur quelqu'un
        }
        t.on = want;
        const warn = want && ph > onLen - 0.45;
        t.mesh.material.opacity = !want ? 0.12 : warn ? (Math.sin(time * 40) > 0 ? 0.9 : 0.25) : 0.9;
        t.mesh.material.emissiveIntensity = want ? 0.6 : 0.1;
      } else if (t.ch === 'T') {
        const act = tagActive(t.group), T = R.tags[t.group];
        const blink = act && !T.closed && T.t < 1.2;
        t.mesh.material.opacity = !act ? 0.14 : blink ? (Math.sin(time * 30) > 0 ? 0.95 : 0.3) : 0.95;
        t.mesh.material.emissiveIntensity = act ? (T.closed ? 0.5 : 0.9) : 0.1;
      } else if (t.ch === 'P') {
        t.mesh.material.opacity += ((R.bridgeOn ? 0.92 : 0.1) - t.mesh.material.opacity) * Math.min(1, dt * 18);
      } else if (t.ch === 'J') {
        const out = R.jumping || R.jumpLag < 0.2;
        t.spikes.scale.y += ((out ? 1 : 0.05) - t.spikes.scale.y) * Math.min(1, dt * 22);
        if (t.spikes.scale.y > 0.6) {
          const zone = { x0: x + 0.1, y0: y, x1: x + 0.9, y1: y + 0.55 };
          for (const p of alive) if (overlap(pbox(p), zone)) kill(p, 'spike');
        }
      } else if (t.ch === 'C') {
        const CG = R.comp[t.cg];
        if (t.state !== 'built' && CG && CG.t >= 0 && CG.t > 0.35 + t.order * (CG.rate || 0.3)) {
          const zone = { x0: x, y0: y, x1: x + 1, y1: y + 1 };
          if (!players.some((p) => p.alive && overlap(pbox(p), zone))) {
            t.state = 'built'; t.mesh.visible = true; CG.built++;
            OT.Sound.click();
            particles.burst(x + 0.5, y + 0.5, 8, [0x9dff8a, 0x3aff3a], 3, { grav: 0, life: 0.4 });
          }
        }
      } else if (t.ch === 'N') {
        const sol = levOn(t.lg, t.inv);
        t.mesh.material.opacity += ((sol ? 0.92 : 0.13) - t.mesh.material.opacity) * Math.min(1, dt * 16);
        t.mesh.material.emissiveIntensity = sol ? 0.55 : 0.1;
      } else if (t.ch === 'o') {
        const zone = { x0: x - 0.3, y0: y, x1: x + 1.3, y1: y + 1 };
        const inside = alive.some((p) => overlap(pbox(p), zone));
        t.fadeMats.forEach((m) => { m.opacity += ((inside ? 0.25 : 1) - m.opacity) * Math.min(1, dt * 8); });
      } else if (t.ext) {
        if (t.ext.update) { try { t.ext.update(t, alive, dt, PX); } catch (e) { EXT.warn('update ' + t.ch, e); } }
      } else if (t.ch === 'f') {
        // faux sol : il s'enfonce un peu quand on passe dessus
        const zone = { x0: x, y0: y + 1, x1: x + 1, y1: y + 2 };
        const on = alive.some((p) => overlap(pbox(p), zone));
        t.mesh.position.y += ((on ? y - 0.15 : y) - t.mesh.position.y) * Math.min(1, dt * 10);
      }
    }

    /* Pics fixes (sol et plafond) */
    for (const p of alive) {
      const b = pbox(p);
      for (let y = Math.floor(b.y0) - 1; y <= Math.floor(b.y1) + 1; y++) for (let x = Math.floor(b.x0); x <= Math.floor(b.x1); x++) {
        const c = R.grid[y] && R.grid[y][x];
        if (c === '^' && overlap(b, { x0: x + 0.1, y0: y, x1: x + 0.9, y1: y + 0.52 })) kill(p, 'spike');
        if (c === 'W' && overlap(b, { x0: x + 0.1, y0: y + 0.48, x1: x + 0.9, y1: y + 1 })) kill(p, 'spike');
      }
    }

    /* Déclencheurs */
    for (const tr of R.ents.trigger || []) {
      if (tr.fired) {
        tr.t += dt;
        if (versus && tr.t > 4 && tr.act !== 'doorRun' && tr.act !== 'swap' && !alive.some((p) => Math.abs(p.x - tr.x) < 3)) { tr.fired = false; tr.t = 0; }
        continue;
      }
      if (tr.wireMesh) tr.wireMesh.visible = true;
      if (tr.zi === undefined) tr.zi = zoneIdx(tr.x);
      if (!alive.some((p) => p.x >= tr.x && Math.abs(p.y - tr.y) < 4 && zoneIdx(p.x) === tr.zi)) continue;
      if (EXT.has('blockTrigger') && EXT.any('blockTrigger', tr, alive, PX)) continue;   // version 1.5 (coop)
      tr.fired = true; tr.t = 0;
      if (tr.wireMesh) { tr.wireMesh.visible = false; OT.Sound.click(); particles.burst(tr.x, tr.y + 0.2, 6, 0xff3a2a, 2, { life: 0.3 }); }
      fireTrigger(tr);
    }
    for (const d of R.ents.door || []) {
      if (d.x !== d.tx) {
        const step = Math.sign(d.tx - d.x) * Math.min(Math.abs(d.tx - d.x), 16 * dt);
        d.x += step;
        d.mesh.position.x = d.x + 0.5;
        d.mesh.rotation.z = Math.sin(time * 30) * 0.05;
        if (Math.random() < 0.5) particles.burst(d.x + 0.5, d.y + 0.1, 1, 0x9c8f80, 2, { up: 1, life: 0.3 });
      } else d.mesh.rotation.z = 0;
    }
    for (const f of R.falling) {
      if (f.done) {
        f.t += dt;
        if (versus && f.t > 4) { f.restore = true; }
        continue;
      }
      if (FZ(f.tile)) continue;   // 1.5 : bloc COMPILÉ en pleine chute : il reste suspendu
      f.vy -= 30 * dt; f.y += f.vy * dt;
      f.tile.mesh.position.y = f.y;
      const zone = { x0: f.x + 0.05, y0: f.y, x1: f.x + 0.95, y1: f.y + 1 };
      for (const p of alive) if (overlap(pbox(p), zone)) kill(p, 'crush');
      if (tileSolid(f.x, Math.floor(f.y)) || f.y < -5) {
        f.done = true; f.t = 0; f.tile.mesh.visible = false;
        particles.burst(f.x + 0.5, Math.ceil(f.y), 14, [0x5d5148, 0x8a7a6b], 6, { up: 2 });
        OT.Sound.slam(); OT.Input.rumble(-1, 0.6, 0.2, 160);
        shake = Math.max(shake, 0.18);
      }
    }
    if (versus) for (let i = R.falling.length - 1; i >= 0; i--) {
      const f = R.falling[i];
      if (f.restore) { f.tile.state = 'idle'; f.tile.mesh.visible = true; f.tile.mesh.position.set(f.tile.x, f.tile.y, 0); R.falling.splice(i, 1); }
    }

    /* Ressorts et clé à molette */
    for (const s of R.ents.spring || []) {
      const zone = { x0: s.x + 0.12, y0: s.y, x1: s.x + 0.88, y1: s.y + 0.4 };
      for (const p of alive) {
        if (p.vy <= 0 && overlap(pbox(p), zone)) {
          if (s.wrench) { p.vy = 13; p.vx = -12; p.ctrlLock = 0.45; } else p.vy = 19;
          p.onGround = false; p.cut = true; s.t = 0.25;
          OT.Sound.spring(); OT.Input.rumble(p.i, 0.4, 0.6, 140);
        }
      }
      s.t -= dt;
      s.mesh.scale.y = s.t > 0 ? 1.6 : 1;
      if (s.wrench) s.mesh.rotation.z = s.t > 0 ? 0.6 : 0;
    }

    for (const ps of R.ents.piston || []) updatePiston(ps, alive);

    /* Pièces (monnaie) */
    for (const c of R.ents.coin || []) {
      if (c.taken || c.hidden) continue;
      if (c.home) {
        // pièce sortie d'une caisse : elle saute puis rejoint celui qui a ouvert
        c.homeT += dt;
        const h = c.home;
        if (c.homeT > 0.25 && h.alive && !h.finished) {
          const k = Math.min(1, dt * 9);
          c.x += (h.x - c.x) * k; c.y += (h.y + h.h * 0.5 - c.y) * k;
        } else c.y += dt * 2;
        c.mesh.position.x = c.x;
      }
      c.mesh.rotation.y = time * 3 + c.i;
      c.mesh.position.y = c.y + Math.sin(time * 3 + c.i) * 0.06;
      for (const p of alive) {
        if (Math.abs(p.x - c.x) < 0.6 && p.y < c.y + 0.35 && p.y + p.h > c.y - 0.35) {
          c.taken = true; c.mesh.visible = false;
          R.picked.push({ i: c.i, by: p.i });
          if (p.anim) p.anim.play('pickup');
          OT.Sound.coin(); OT.Input.rumble(p.i, 0, 0.2, 40);
          particles.burst(c.x, c.y, 8, c.ghost ? [0x9fc8ff] : [0xffd24a, 0xfff2b0], 4, { grav: 0.3, life: 0.4 });
          shock(c.x, c.y, c.ghost ? 0x9fc8ff : 0xffd24a, 0.8, 0.3);
          EXT.run('coinTaken', c, p, PX);
          break;
        }
      }
    }

    /* La vraie pièce défectueuse (vibre de plus en plus fort) et la fausse (explose) */
    for (const pt of R.ents.part || []) {
      if (pt.taken) continue;
      pt.mesh.rotation.y += dt * 2;
      pt.mesh.position.y = pt.y + Math.sin(time * 3) * 0.08;
      let hum = 0;
      for (const p of alive) {
        const d = Math.hypot(p.x - pt.x, p.y + 0.45 - pt.y);
        if (d < 0.8) {
          pt.taken = true; R.hasPart = true; pt.mesh.visible = false;
          OT.Sound.part(); OT.Input.rumble(-1, 0.5, 0.8, 300);
          particles.burst(pt.x, pt.y, 20, [0xffd28a, 0xc8963e], 6);
          bubble(pt.x, pt.y + 1, 'Pièce trouvée ! La porte peut s\'ouvrir.', 3, '#ffd28a');
          break;
        }
        const k = Math.max(0, 1 - d / 16);
        hum = Math.max(hum, k);
        p.partPulse = (p.partPulse || 0) - dt;
        if (k > 0 && p.partPulse <= 0) { OT.Input.rumble(p.i, k > 0.7 ? (k - 0.7) * 2 : 0, k * 0.9, 180); p.partPulse = 0.5 - k * 0.3; }
      }
      OT.Sound.setHum(pt.taken ? 0 : hum * hum);
    }
    for (const pt of R.ents.fakepart || []) {
      if (pt.taken) continue;
      pt.mesh.rotation.y += dt * 2;
      pt.mesh.position.y = pt.y + Math.sin(time * 3) * 0.08;
      for (const p of alive) if (Math.hypot(p.x - pt.x, p.y + 0.45 - pt.y) < 0.75) {
        pt.taken = true; pt.mesh.visible = false;
        OT.Sound.boom();
        particles.burst(pt.x, pt.y, 30, [0xff7a1a, 0xffd28a, 0x333333], 10, { up: 2 });
        bubble(pt.x, pt.y + 1.4, 'Fausse pièce ! Elle ne vibrait pas…', 2.6, '#ff7a1a');
        kill(p, 'boom');
      }
    }

    /* Portes */
    for (const d of R.ents.door || []) {
      d.portalTex.offset.y = (time * 0.4) % 1;
      const locked = (d.needsPart && !R.hasPart) || (d.needsCoins && R.picked.length < d.needsCoins);
      d.portal.material.color.set(locked ? 0xff8866 : 0xffffff);
      d.sayT = Math.max(0, d.sayT - dt);
      if (d.x !== d.tx) continue;   // une porte qui s'enfuit ne se laisse pas attraper
      // Monde 2 : « Erreur 404 » — la porte saute ailleurs quand on s'approche
      if (d.hops && d.hopI < d.hops.length && alive.some((p) => Math.abs(p.x - (d.x + 0.5)) < 2.6 && Math.abs(p.y - d.y) < 2.5)) {
        const [hx, hy] = d.hops[d.hopI++];
        particles.burst(d.x + 0.5, d.y + 1, 22, [0x2ff3ff, 0xff3fb4, 0xffffff], 6, { up: 1 });
        bubble(d.x, d.y + 2.8, d.hopI < d.hops.length ? 'Erreur 404 : la porte a déménagé !' : 'Erreur 404… bon, d\'accord, je reste là.', 2.4, '#ff3fb4');
        d.x = d.tx = hx; d.y = hy;
        d.mesh.position.set(hx + 0.5, hy, -0.5);
        particles.burst(hx + 0.5, hy + 1, 22, [0x2ff3ff, 0xff3fb4], 6, { up: 1 });
        OT.Sound.whoosh(); OT.Input.rumble(-1, 0.2, 0.4, 150);
        continue;
      }
      const zone = doorZone(d);
      const near = alive.filter((p) => overlap(pbox(p), zone));
      setPrompt(d, near[0], 'Entrer', d.mesh, 0, 3.0, 0.6);
      for (const p of near) {
        // il faut appuyer sur le bouton d'action pour entrer
        if (!(p.useT > 0)) continue;
        p.useT = 0;
        if (d.needsCoins && R.picked.length < d.needsCoins) {
          // Monde 5 : « le client paie à la livraison » — il faut assez de pièces
          p.vx = p.x < d.x + 0.5 ? -7 : 7; p.vy = 6; p.ctrlLock = 0.3;
          d.sayT = 2; OT.Sound.bad(); bubble(d.x, d.y + 2.8, `Il manque ${d.needsCoins - R.picked.length} pièce(s) pour ouvrir.`, 2.2, '#ffcc33');
          OT.Input.rumble(p.i, 0.3, 0, 120);
          continue;
        }
        if (d.needsPart && !R.hasPart) {
          OT.Sound.boom();
          particles.burst(d.x + 0.5, d.y + 1, 30, [0xff7a1a, 0xffd28a, 0x333333], 10, { up: 2 });
          bubble(d.x, d.y + 2.8, 'Il manque une pièce !', 2.5, '#ff7a1a');
          kill(p, 'boom');
          continue;
        }
        if (d.prompt) d.prompt.visible = false;
        enterDoor(p, d);
      }
    }
    for (const d of R.ents.fakedoor || []) {
      // l'indice des fausses portes : leur tourbillon tourne à l'envers et leur lumière vacille parfois
      d.portalTex.offset.y = ((-time * 0.4) % 1 + 1) % 1;
      d.light.intensity = Math.sin(time * 7 + d.x * 1.7) > 0.93 ? 0.08 : 0.7;
      const zone = doorZone(d);
      const near = alive.filter((p) => overlap(pbox(p), zone));
      setPrompt(d, near[0], 'Entrer', d.mesh, 0, 3.0, 0.6);
      for (const p of near) if (p.useT > 0) {
        p.useT = 0;
        OT.Sound.slam();
        particles.burst(d.x + 0.5, d.y + 0.5, 24, [0xd8dde3, 0xff3020], 9, { up: 3 });
        bubble(d.x, d.y + 2.8, "Ce n'était pas la vraie porte…", 2.6, '#ff5533');
        kill(p, 'spike');
      }
    }

    updateCodeStuff(alive, dt);
    updateNewStuff(alive, dt);
    updateTraps(alive, dt);
    // version 1.5 : pièges, mécanismes et gadgets des modules
    if (R.extUpd) for (let i = 0; i < R.extUpd.length; i++) {
      const [name, d] = R.extUpd[i];
      try { d.update(R.ents[name], alive, dt, PX); } catch (e) { EXT.warn('update ' + name, e); }
    }
    if (EXT.has('update')) EXT.run('update', alive, dt, PX);
    if (!R) return;

    /* Mode facile : drapeau de reprise */
    if (R.cpFlag && !R.cpOn) {
      const f = R.cpFlag;
      if (alive.some((p) => p.x >= f.x + 0.2 && Math.abs(p.y - f.y) < 2.5)) {
        R.cpOn = true;
        R.cpState = { hasPart: R.hasPart, picked: R.picked.slice() };
        f.flag.material.color.set(0x3cff9a);
        OT.Sound.ok(); OT.Input.rumble(-1, 0, 0.3, 120);
        bubble(f.x + 0.5, f.y + 2.4, 'Drapeau atteint : tu repartiras d\'ici.', 2.4, '#3cff9a');
      }
    }
    if (R.cpFlag) R.cpFlag.flag.rotation.y = Math.sin(time * 3) * 0.3;

    /* Personnages : nom + touche pour parler */
    for (const n of R.ents.npc || []) {
      const near = alive.find((p) => Math.abs(p.x - n.x) < 1.05 && Math.abs(p.y - n.y) < 1.5);
      if (near) {
        const key = OT.Input.talkHint(near.i);
        if (key !== n.promptKey) {
          if (n.prompt) n.mesh.remove(n.prompt);
          n.prompt = key === 'ACTION'
            ? M.label('ACTION : parler', { size: 30, h: 0.32, color: '#ffd28a', border: '#ffd28a' })
            : M.label('Parler', { key, size: 30, h: 0.32, color: '#ffd28a', border: '#ffd28a' });
          n.prompt.position.set(0, 2.0, 0.4);
          n.mesh.add(n.prompt);
          n.promptKey = key;
        }
        n.prompt.visible = true;
        n.mesh.rotation.y = near.x < n.x ? -0.45 : 0.45;
      } else if (n.prompt) n.prompt.visible = false;
      n.mesh.userData.head.position.y = 1.15 + Math.sin(time * 2 + n.x) * 0.015;
      if (n.mesh.userData.tickNpc) n.mesh.userData.tickNpc(time, dt);
      // personnage jouable croisé : il vit (petites animations) et salue quand on arrive
      const an = n.mesh.userData.anim;
      if (an && Math.abs(n.x - cam.x) < 26) {   // loin de la caméra : on ne l'anime pas (performance)
        if (near && !n.waved) { an.play('wave'); n.waved = true; } else if (!near) n.waved = false;
        an.update(dt, { speed: 0, ground: true });
      }
    }
    for (const n of R.ents.rumeur || []) {
      n.saidT -= dt;
      const near = alive.find((p) => Math.abs(p.x - n.x) < 2.6 && Math.abs(p.y - n.y) < 2);
      if (near && n.saidT <= 0) { bubble(n.x, n.y + 2.5, n.text, 3.6, '#b78cff', 'La Rumeur'); n.saidT = 9; OT.Sound.talk(); }
      n.mesh.userData.q.position.y = 2.0 + Math.sin(time * 3) * 0.1;
    }

    if (R.boss && !R.bossWait) bossOps(R.boss).update(R.boss, alive, dt);
    if (R.bfx && R.bfx.length) updateBossFx(alive, dt);   // version 1.5 : attaques annoncées des boss
    if (party()) partyTick(alive, dt);
    else if (alive.length) { updateSecrets(alive); updateSectionBarks(alive); }
  }

  /* --- Monde 2 : balises, liens, bouton COMPILER, rival --- */
  function touches(p, x, y, rx = 0.6, ry = 0.45) { return Math.abs(p.x - x) < rx && p.y < y + ry && p.y + p.h > y - ry; }
  function updateCodeStuff(alive, dt) {
    // <div> : active les blocs de sa balise pendant quelques secondes
    for (const tp of R.ents.tagopen || []) {
      tp.mesh.position.y = tp.y + Math.sin(time * 3 + tp.x) * 0.05;
      const T = R.tags[tp.g];
      if (!T || T.closed) continue;
      for (const p of alive) if (touches(p, tp.x, tp.y)) {
        if (T.t <= 0) {
          OT.Sound.ok(); OT.Input.rumble(p.i, 0, 0.3, 80);
          particles.burst(tp.x, tp.y, 10, [0x2fffa0, 0xffffff], 4, { grav: 0, life: 0.4 });
        }
        T.t = ez(tp.time || TAG_TIME);
        break;
      }
    }
    for (const g in R.tags) {
      const T = R.tags[g];
      if (T.closed || T.t <= 0) continue;
      T.t -= dt;
      if (T.t <= 0) { OT.Sound.click(); for (const p of alive) OT.Input.rumble(p.i, 0.3, 0, 90); }
      else if (T.t < 1.2 && Math.floor(T.t * 5) !== Math.floor((T.t + dt) * 5)) for (const p of alive) OT.Input.rumble(p.i, 0, 0.12, 30);
    }
    // </div> : ferme la balise → ses blocs restent pour de bon
    for (const tp of R.ents.tagclose || []) {
      if (tp.done) continue;
      tp.mesh.position.y = tp.y + Math.sin(time * 3 + tp.x) * 0.05;
      tp.cool = Math.max(0, (tp.cool || 0) - dt);
      for (const p of alive) if (touches(p, tp.x, tp.y)) {
        if (tagActive(tp.g)) {
          R.tags[tp.g].closed = true; tp.done = true; tp.mesh.visible = false;
          OT.Sound.door(); OT.Input.rumble(-1, 0.2, 0.5, 160);
          particles.burst(tp.x, tp.y, 16, [0xff7ad1, 0x2fffa0, 0xffffff], 5, { grav: 0 });
          bubble(tp.x, tp.y + 1.6, 'Balise fermée : les blocs restent !', 2.4, '#2fffa0');
        } else if (tp.cool <= 0) {
          tp.cool = 2.5;
          bubble(tp.x, tp.y + 1.6, 'On ne ferme pas une balise qui n\'est pas ouverte…', 2.4, '#ff7ad1');
        }
        break;
      }
    }
    // Liens : on est téléporté vers la page visée (attention aux fautes de frappe !)
    for (const l of R.ents.link || []) {
      if (R.linkCool > 0) break;
      for (const p of alive) if (touches(p, l.x, l.y, 0.55, 0.5)) {
        particles.burst(p.x, p.y + 0.5, 14, [0x7fb8ff, 0xffffff], 5, { grav: 0, life: 0.4 });
        p.x = l.tx + 0.5; p.y = l.ty; p.vx = 0; p.vy = 0; p.jumped = false; p.standOn = null;
        particles.burst(p.x, p.y + 0.5, 14, [0x7fb8ff, 0xffffff], 5, { grav: 0, life: 0.4 });
        OT.Sound.whoosh(); OT.Input.rumble(p.i, 0, 0.5, 120);
        R.linkCool = 0.7;
        break;
      }
    }
    // Bouton COMPILER (ou « appel de fonction ») : les blocs C de son groupe apparaissent un par un
    for (const cb of R.ents.compile || []) {
      if (cb.pressed) continue;
      const zone = { x0: cb.x + 0.1, y0: cb.y - 0.05, x1: cb.x + 0.9, y1: cb.y + 0.3 };
      const p = alive.find((q) => overlap(pbox(q), zone));
      if (!p) continue;
      cb.pressed = true; cb.cap.position.y = 0.03;
      const C = R.comp[cb.g];
      if (C) { if (C.t < 0) C.t = 0; C.rate = Math.min(C.rate || 9, cb.rate || 0.3); }
      OT.Sound.click(); OT.Input.rumble(p.i, 0, 0.4, 100);
      bubble(cb.x + 0.5, cb.y + 2.2, cb.say || 'Compilation en cours…', 2, '#9dff8a');
    }
    for (const g in R.comp) {
      const C = R.comp[g];
      if (C.t < 0) continue;
      C.t += dt;
      if (C.built >= C.n && !C.said) {
        C.said = true;
        const cb = (R.ents.compile || []).find((k) => String(k.g) === String(g));
        if (cb) bubble(cb.x + 0.5, cb.y + 2.2, cb.done || 'Compilation réussie : 0 erreur.', 2.4, '#9dff8a');
        OT.Sound.door();
      }
    }
    // Le rival (une copie de Yannick) fait la course jusqu'à la porte
    const rv = R.rival;
    if (rv) {
      if (!rv.done) {
        let step = rv.speed * dt;
        while (step > 0 && rv.i < rv.path.length - 1) {
          const [tx, ty] = rv.path[rv.i + 1];
          const dx = tx - rv.x, dy = ty - rv.y, d = Math.hypot(dx, dy);
          if (dx) rv.face = Math.sign(dx);
          if (d <= step) { rv.x = tx; rv.y = ty; rv.i++; step -= d; } else { rv.x += (dx / d) * step; rv.y += (dy / d) * step; step = 0; }
        }
        if (rv.i >= rv.path.length - 1) {
          rv.done = true;
          bubble(rv.x, rv.y + 2.6, '« Trop lent, Oswel ! »', 2.6, '#ff8a8a', rv.name);
          OT.Sound.bad();
        }
      }
      rv.mesh.position.set(rv.x, rv.y, -0.35);
      rv.mesh.visible = !rv.done;
    }
  }

  function nearElec(p, r) {
    const ty = Math.round(p.y) - 1;
    for (let x = Math.floor(p.x - r); x <= Math.floor(p.x + r); x++) if (R.grid[ty] && R.grid[ty][x] === 'E') return true;
    return false;
  }
  function collectElec() { const o = []; for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) if (R.grid[y][x] === 'E') o.push([x, y]); return o; }

  function fireTrigger(tr) {
    if (tr.act === 'drop') {
      for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) {
        const t = R.tiles[y][x];
        if (t && t.ch === '~' && t.state === 'idle' && Math.abs(x - tr.x) < 6) { t.state = 'drop'; t.vy = 2; t.oy = 0; t.t = 0; }
      }
      OT.Sound.crumble(); OT.Input.rumble(-1, 0.7, 0.4, 220);
      shake = Math.max(shake, 0.15);
    } else if (tr.act === 'ceiling') {
      for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) {
        const t = R.tiles[y][x];
        if (t && t.ch === 'v' && t.state === 'idle' && !FZ(t) && Math.abs(x - tr.x) < 7) { t.state = 'fall'; R.falling.push({ x, y, vy: 0, tile: t, done: false, t: 0 }); }
      }
      OT.Sound.crumble(); OT.Input.rumble(-1, 0.3, 0.6, 200);
    } else if (tr.act === 'swap') {
      // Le styliste change le CSS : la glace devient ressort, le ressort devient glace (dans SA zone seulement)
      const [za, zb] = zoneRange(tr.x);
      for (let y = 0; y < R.H; y++) for (let x = za; x < zb; x++) {
        const t = R.tiles[y][x];
        if (t && (t.ch === 'R' || t.ch === 'Y')) setStyle(t, t.ch === 'R' ? 'Y' : 'R');
      }
      R.styleSwapped = !R.styleSwapped;
      bubble(tr.x, tr.y + 3, 'Le styliste a changé le CSS !', 2.4, '#ff7ad1');
      OT.Sound.whoosh(); OT.Input.rumble(-1, 0.3, 0.3, 160);
      particles.burst(tr.x, tr.y + 1, 18, [0xff5a6a, 0x3a7bff, 0xffffff], 6, { up: 1 });
    } else if (tr.act === 'doorRun') {
      const d = (R.ents.door || []).reduce((a, b) => (!a || Math.abs(b.x - tr.x) < Math.abs(a.x - tr.x) ? b : a), null);
      if (d) {
        d.tx = tr.to;
        OT.Sound.whoosh();
        bubble(d.x, d.y + 2.8, 'La porte s\'enfuit !', 2.2, '#3cff9a');
        OT.Input.rumble(-1, 0.2, 0.5, 300);
      }
    }
  }

  // les limites de la zone (version 1.3) qui contient la colonne x
  // numéro de la zone (dans l'espace) où se trouve x : 0 = le niveau d'origine
  function zoneIdx(x) {
    const zx = (R.def.build && R.def.build.zonesX) || [];
    let k = 0;
    for (const z of zx) if (x >= z) k++;
    return k;
  }
  function zoneRange(x) {
    const zx = (R.def.build && R.def.build.zonesX) || [];
    let a = 0, b = R.W;
    for (const z of zx) { if (z <= x) a = z; else { b = z; break; } }
    return [a, b];
  }
  function updatePiston(ps, alive) {
    const T = PISTON_T;
    const t = (TT(ps) + ps.phase) % T;
    let f;
    if (t < 0.85) f = 0;
    else if (t < 0.97) f = Math.pow((t - 0.85) / 0.12, 2);
    else if (t < 1.37) f = 1;
    else f = 1 - (t - 1.37) / 0.53;
    ps.yb = ps.top + (ps.bottom - ps.top) * f;
    const warn = t > 0.6 && t < 0.85;
    ps.head.position.set(warn ? Math.sin(time * 70) * 0.04 : 0, ps.yb, 0);
    const rodLen = Math.max(0.1, ps.H - 1 - (ps.yb + 1));
    ps.rod.scale.y = rodLen;
    ps.rod.position.set(0.5, ps.yb + 1 + rodLen / 2, 0);
    ps.mesh.position.x = ps.x;
    if (warn && !ps.warned) {
      ps.warned = true;
      for (const p of alive) if (Math.abs(p.x - (ps.x + 0.5)) < 1.8) OT.Input.rumble(p.i, 0, 0.35, 90);
    }
    if (t < 0.6) { ps.warned = false; ps.slammed = false; }
    if (f >= 1 && !ps.slammed) {
      ps.slammed = true;
      let near = false;
      for (const p of alive) if (Math.abs(p.x - (ps.x + 0.5)) < 3) { OT.Input.rumble(p.i, 0.5, 0.15, 100); near = true; }
      if (near) { OT.Sound.slam(); shake = Math.max(shake, 0.08); particles.burst(ps.x + 0.5, ps.bottom + 0.05, 6, 0x9c8f80, 3, { up: 1 }); }
    }
    if (f > 0.05 && !FZ(ps)) {
      const zone = { x0: ps.x + 0.06, y0: ps.yb, x1: ps.x + 0.94, y1: ps.yb + 1 };
      for (const p of alive) if (overlap(pbox(p), zone)) kill(p, 'crush');
    }
  }

  function enterDoor(p, d) {
    if (p.finished) return;
    if (d.to) { gateEnter(p, d); return; }
    p.finished = true;
    R.doorAt = d;
    if (p.anim) { p.anim.play('door'); p.hideT = 0.3; } else p.mesh.visible = false;
    OT.Sound.door();
    particles.burst(d.x + 0.5, d.y + 1, 16, [0x3cff9a, p.color], 5, { up: 1 });
    shock(d.x + 0.5, d.y + 1, 0x3cff9a, 2.6, 0.55);
    [0, 140, 280].forEach((ms) => setTimeout(() => OT.Input.rumble(p.i, 0.2, 0.6, 90), ms));
    if (party()) { if (PM.onDoor) PM.onDoor(R.party, PX, p); return; }
    if (mode === 'versus') { score[p.i]++; finishLevel(p.i); return; }
    if (players.every((o) => o.finished)) finishLevel(-1);
    else bubble(d.x, d.y + 2.8, 'On attend ' + players.find((o) => !o.finished).name + '…', 2.5, '#3cff9a');
  }

  // porte de zone (version 1.3) : on passe dans la zone suivante ; en équipe, on s'attend
  function gateEnter(p, d) {
    if (d.trap) {   // porte piège : elle renvoie en arrière (sa lumière était rouge pâle…)
      particles.burst(d.x + 0.5, d.y + 1, 16, [0xff8a5a, 0xffffff], 5, { up: 1 });
      OT.Sound.bad(); bubble(d.x, d.y + 2.8, 'Retour en arrière !', 2.2, '#ff8a5a'); heroBark('fake', p);
      p.x = d.to[0] + 0.5; p.y = d.to[1]; p.vx = 0; p.vy = 0; p.standOn = null;
      particles.burst(p.x, p.y + 0.5, 16, [0xff8a5a, 0xffffff], 5, { up: 1 });
      return;
    }
    p.finished = true; p.gateAt = d;
    if (p.anim) { p.anim.play('door'); p.hideT = 0.3; } else p.mesh.visible = false;
    OT.Sound.door();
    particles.burst(d.x + 0.5, d.y + 1, 16, [0x5fd4ff, p.color], 5, { up: 1 });
    shock(d.x + 0.5, d.y + 1, 0x5fd4ff, 2.2, 0.5);
    OT.Input.rumble(p.i, 0.2, 0.5, 90);
    // la course contre la copie du rival se joue jusqu'à cette porte
    if (R.rival && !R.rival.done) { R.rival.beaten = true; R.rival.done = true; bubble(R.rival.x, R.rival.y + 2.4, '« Pas mal… »', 2, '#ff8a8a', R.rival.name); }
    if (mode === 'versus') { R.gateQ.push({ list: [p], d, t: 0.35 }); return; }
    const waiting = players.filter((o) => !o.finished);
    if (!waiting.length) R.gateQ.push({ list: players.filter((o) => o.gateAt === d), d, t: 0.35 });
    else bubble(d.x, d.y + 2.8, 'On attend ' + waiting[0].name + '…', 2.5, '#5fd4ff');
  }

  function finishLevel(winner) {
    if (R.done) return;
    R.done = true; R.winner = winner;
    state = 'done';
    OT.Sound.setHum(0);
    if (OT.Light) players.forEach((p) => OT.Light.flash(p.i, 0x00ff66, 1.4));
    stageVictory(winner);
    const info = {
      world: worldId, index: levelIndex, def: R.def, mode, winner, score: score.slice(),
      deaths: R.deaths, time: R.timer, isBoss: !!R.def.boss,
      picked: R.picked.slice(), coinCount: R.coinCount,
      easy: easy(), speed: gameSpeed(), rival: R.rival ? { name: R.rival.name, beaten: !!R.rival.beaten || !R.rival.done } : null,
      // version 1.5 : statistiques pour les étoiles (morts par joueur, morts pendant le boss…)
      stats: Object.assign({}, R.stats), plan: R.def.plan || null,
    };
    EXT.run('finish', info, PX);
    // version 1.4 : la mémoire narrative (« Tu te souviens de la Forge ? »)
    if (R.def.remember && OT.Dialogue && mode !== 'versus') OT.Dialogue.remember(R.def.remember);
    // on laisse voir la célébration un instant avant l'écran des résultats
    const go = () => OT.UI.levelComplete(info);
    if (OT.Dialogue && R.def.endStory && mode !== 'versus' && !OT.Game._testing) {
      // un boss : la conclusion de l'histoire, en vrai dialogue, avant les résultats
      const lines = R.def.endStory;
      setTimeout(() => { if (OT.UI.dialogOpen) go(); else OT.UI.dialog(lines, go); }, 1300);
    } else {
      setTimeout(go, 1500);
      // après un niveau : une ou deux répliques, en voix et sous-titres (sans rien bloquer)
      const out = R.def.outro;
      if (OT.Dialogue && mode !== 'versus') {
        if (out && out.length) {
          const next = (k) => { if (k >= out.length) return; OT.Dialogue.say(out[k][0], out[k][1], { priority: 2, onEnd: () => setTimeout(() => next(k + 1), 250) }); };
          setTimeout(() => next(0), 350);
        } else heroBark('victory', players.find((p) => p.i === winner) || players[0], { force: true });
      }
    }
  }

  /* --- Le boss --- */
  function resetBossPhase(B) {
    // on recommence la PHASE en cours depuis son début
    B.hits = 0; B.coreHits = 0; B.shieldOffT = 0; B.coreCool = 0;
    B.attackT = 2.2; B.attackN = 0; B.gearT = 1.2; B.sparkT = 2; B.warned = false;
    B.slamT = 4.2; B.fireT = 2.6; B.sweepT = 3.6; B.closeT = 0; B.comboT = 0; B.comboCool = 0; B.stagger = 0; B.fireWave = null;
    clearBfx();
    B.motors.forEach((m) => { m.alive = true; m.mesh.visible = B.phase === 1; });
    B.realMotor = Math.floor(Math.random() * B.motors.length);
    B.core.visible = true;
  }

  // version 1.3 : l'arène change avec les phases du boss (lumière d'alarme orange, puis rouge qui pulse)
  function arenaMood(ph) {
    if (!R) return;
    if (R.moodBase === undefined) R.moodBase = { c: rim.color.getHex(), i: rim.intensity };
    R.mood = ph;
    if (ph <= 0) { rim.color.setHex(R.moodBase.c); rim.intensity = R.moodBase.i; }
    else if (ph === 1) { rim.color.setHex(0xff8a2a); rim.intensity = R.moodBase.i * 1.3; }
    else rim.color.setHex(0xff2a2a);
    // version 1.4 : le héros réagit au changement de phase (s'il n'y a pas d'explication en cours)
    if (ph > 0 && ph < 3) { const R0 = R; setTimeout(() => { if (R === R0 && state === 'play' && !OT.UI.dialogOpen) heroBark('boss_phase'); }, 2600); }
  }
  function bossPhase(B, ph) {
    B.phase = ph; arenaMood(ph);
    const P = OT.BOSS_TEXT.phases[ph];
    if (ph > 0) combatCine(ph === 2 ? 'final' : 'phase', { title: ph === 2 ? 'LE DERNIER REMPART' : 'LA FORGE S\'EMBRASE', sub: `Phase ${ph + 1}/3 · ${P.name}` });
    if (ph === 2) setTimeout(() => combatEvent('final'), 2600);
    bubble(30, 8.6, P.say, 3.2, '#ff9a2a', 'Le Gardien');
    OT.Input.rumble(-1, 0.9, 0.9, 500);
    OT.Sound.boom();
    shake = 0.5;
    R.hazards.forEach((h) => { R.group.remove(h.mesh); if (h.shadow) R.group.remove(h.shadow); });
    R.hazards.length = 0;
    resetBossPhase(B);
    OT.UI.bossBar({ name: 'Le Gardien de la Forge', phase: ph + 1, of: 3, label: P.name, help: P.help });
    // Oncle Patou explique la phase (une seule fois par partie). La phase 1 est expliquée dans l'intro.
    if (ph > 0 && !B.told[ph] && P.tell) {
      B.told[ph] = true;
      state = 'dialog';
      OT.UI.dialog(P.tell, () => { if (state === 'dialog') state = 'play'; });
    }
  }

  function spawnWave() {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 2), M.MAT.glowOrange);
    m.position.set(28.5, 1.35, 0);
    R.group.add(m);
    R.hazards.push({ type: 'wave', x: 28.5, y: 1.35, r: 0.3, t: 0, mesh: m });
  }

  function updateBoss(B, alive, dt) {
    B.torso.scale.y = 1 + Math.sin(time * 2) * 0.01;
    if (B.outro > 0) {
      B.outro += dt;
      B.kneel = Math.min(1, B.kneel + dt * 0.5);
      B.g.position.y = -B.kneel * 1.6;
      B.g.rotation.x = B.kneel * 0.25;
      B.eyeMat.emissiveIntensity = 2.4 - B.kneel * 1.8;
      B.screen.visible = B.outro > 1.4;
      if (B.screen.visible) B.screen.material.color.setHSL(0.55, 0.8, 0.6 + Math.sin(time * 6) * 0.1);
      if (B.outro > 4.2 && !R.done) bossDone();
      return;
    }
    for (const h of R.hazards) {
      if (h.dead) continue;   // déjà éteint (ex. étincelle coupée avec le courant) : ne touche plus personne
      h.t += dt;
      if (h.type === 'wave') { h.x -= 10 * dt; h.mesh.position.x = h.x; h.mesh.scale.y = 1 + Math.sin(h.t * 20) * 0.15; }
      if (h.type === 'gear') {
        if (h.t > 0.7) { h.vy -= 40 * dt; h.y += h.vy * dt; }
        h.mesh.position.set(h.x, h.y, 0); h.mesh.rotation.z += dt * 6;
        h.shadow.visible = h.t < 0.7 || h.y > 2;
        if (tileSolid(Math.floor(h.x), Math.floor(h.y - 0.4)) || h.y < -2) { h.dead = true; particles.burst(h.x, h.y, 10, [0xc8963e, 0x8b939c], 5, { up: 2 }); OT.Sound.slam(); OT.Input.rumble(-1, 0.3, 0.1, 80); }
      }
      if (h.type === 'spark') { h.x += h.vx * dt; h.y += h.vy * dt; h.mesh.position.set(h.x, h.y, 0); if (h.t > 5) h.dead = true; }
      const zone = { x0: h.x - h.r, y0: h.y - h.r, x1: h.x + h.r, y1: h.y + h.r };
      if (h.type === 'wave') { zone.y0 = 1; zone.y1 = 1.7; zone.x0 = h.x - 0.3; zone.x1 = h.x + 0.3; if (h.x < 1) h.dead = true; }
      if (h.type !== 'gear' || h.t > 0.7) for (const p of alive) if (overlap(pbox(p), zone)) kill(p, h.type === 'spark' ? 'zap' : 'crush');
    }
    for (let i = R.hazards.length - 1; i >= 0; i--) if (R.hazards[i].dead) { R.group.remove(R.hazards[i].mesh); if (R.hazards[i].shadow) R.group.remove(R.hazards[i].shadow); R.hazards.splice(i, 1); }
    B.slamAnim = Math.max(0, B.slamAnim - dt * 2.5);
    B.arm.rotation.z = -B.slamAnim * 0.9;
    const bob = Math.sin(time * 5) * 0.12;
    B.markHit.visible = false; B.markSwitch.visible = false;
    if (B.phase === 0) { const bt = B.bolts[Math.min(B.hits, 3)]; B.markHit.visible = true; B.markHit.position.set(bt.x, bt.y + 1.05 + bob, 1); }
    if (B.phase === 2) {
      const sw0 = (R.ents.switch || [])[0];
      if (B.shieldOffT > 0) { B.markHit.visible = true; B.markHit.position.set(29.4, 4.6 + bob, 1.4); }
      else if (sw0) { B.markSwitch.visible = true; B.markSwitch.position.set(sw0.x + 0.5, 2.2 + bob, 1); }
    }

    // ---------- version 1.5 : les nouvelles attaques du Gardien (toutes annoncées) ----------
    const nearX = (fb) => { const t = nearestPlayer(alive, 20); return t ? t.x : fb; };
    B.stagger = Math.max(0, B.stagger - dt);
    // ÉCRASEMENT VERTICAL (phases 1 et 3) : marque rouge au sol 1 s avant ; le poing reste planté 1,6 s (on peut monter dessus)
    if (B.phase !== 1) {
      // phase 3 : pendant la fenêtre de contre (bouclier coupé), il ne frappe pas — le joueur doit pouvoir courir au cœur
      if (B.phase === 2 && B.shieldOffT > 0) B.slamT = Math.max(B.slamT, 1.6);
      B.slamT -= dt;
      if (B.slamT <= 0 && alive.length && !(B.phase === 0 && B.attackT < 0.9)) {
        B.slamT = B.phase === 0 ? 5.2 : 4.6;
        const x = Math.max(2.5, Math.min(25.5, Math.round(nearX(14)) + 0.5));
        B.slamAnim = 1;
        combatEvent('nouveau:slam');
        fxSlam(x, 2, { warn: 1.0, stay: 1.6, onImpact: (h, miss) => {
          // phase 3 : un écrasement RATÉ le déséquilibre → son bouclier tombe tout seul (la fenêtre pour frapper le cœur)
          if (B.phase === 2 && miss && B.outro <= 0) {
            B.stagger = 2.6; B.shieldOffT = Math.max(B.shieldOffT, 2.6);
            combatEvent('weak'); bubble(30, 9, 'MON ÉQUILIBRE… !', 1.8, '#ff9a2a', 'Le Gardien');
          }
        } });
      }
    }
    // LA FORGE S'EMBRASE (phase 2) : une bande du sol rougeoie 1 s, puis brûle 1,4 s (les marches restent sûres)
    if (B.phase === 1) {
      B.fireT -= dt;
      if (B.fireT <= 0 && alive.length) {
        B.fireT = 3.1;
        combatEvent('nouveau:fire');
        const tx = Math.random() < 0.6 ? nearX(14) : 3 + Math.random() * 22;
        const x0 = Math.max(1, Math.min(24, Math.round(tx) - 2));
        fxStrip(x0, x0 + 4, { warn: 1.0, act: 1.4 });
      }
    }
    // la vague de feu de l'attaque spéciale (phase 3, après le 1er coup au cœur)
    if (B.fireWave && B.outro <= 0) {
      B.fireWave.t -= dt;
      if (B.fireWave.t <= 0) {
        // des bandes de 2,6 cases séparées par des passages SÛRS de 1,4 case (on peut aussi monter sur une marche)
        const x0 = 2 + B.fireWave.i * 4;
        fxStrip(x0, x0 + 2.6, { warn: 1.2, act: 0.7 });
        B.fireWave.i++; B.fireWave.t = 0.45;
        if (B.fireWave.i >= 6) B.fireWave = null;
      }
    }
    // LE DERNIER REMPART (phase 3) : le bras balaie le bas de l'arène (ligne rouge 0,9 s avant) — on saute
    if (B.phase === 2 && B.stagger <= 0 && B.outro <= 0 && !B.fireWave) {
      B.sweepT -= dt;
      if (B.sweepT <= 0) {
        B.sweepT = 4.4; B.slamAnim = 1;
        combatEvent('nouveau:sweep');
        fxLance(28.4, 1.4, -10, { warn: 0.9, w: 0.8, h: 0.75, lane: true, cause: 'crush', mat: bfxMats().fire });
      }
      // ENCHAÎNEMENT : rester collé à lui (bouclier allumé) plus de 1,6 s → ses yeux clignotent 0,6 s, puis une onde part tout près
      const close = B.shieldOffT <= 0 && alive.some((q) => q.x > 24.5 && q.y < 2.4);
      B.closeT = close ? B.closeT + dt : 0;
      B.comboCool = Math.max(0, B.comboCool - dt);
      if (B.closeT > 1.6 && B.comboT <= 0 && B.comboCool <= 0) { B.comboT = 0.6; combatEvent('nouveau:combo'); OT.Input.rumble(-1, 0, 0.4, 150); }
      if (B.comboT > 0) {
        B.comboT -= dt; B.eyeMat.emissiveIntensity = 2.4 + Math.sin(time * 50) * 2;
        if (B.comboT <= 0) { B.slamAnim = 1; spawnWave(); OT.Sound.slam(); shake = Math.max(shake, 0.25); B.closeT = 0; B.comboCool = 3; }
      }
    }

    if (B.phase === 0) {
      // PHASE 1 — DÉMONTER : 4 boulons, ondes de choc doubles
      const bolt = B.bolts[B.hits];
      B.boltMesh.visible = true;
      B.boltMesh.position.set(bolt.x, bolt.y, 0.6);
      B.boltMesh.children[0].rotation.y += dt * 3;
      const pulse = 1 + 0.25 * Math.sin(time * 6);
      B.boltMesh.userData.ring.scale.setScalar(pulse);
      B.shield.visible = false;
      const zone = { x0: bolt.x - 0.45, y0: bolt.y - 0.45, x1: bolt.x + 0.45, y1: bolt.y + 0.45 };
      for (const p of alive) if (overlap(pbox(p), zone)) {
        B.hits++;
        OT.Sound.hit(); OT.Input.rumble(-1, 0.8, 0.7, 220); shake = 0.3;
        particles.burst(bolt.x, bolt.y, 20, [0xffa040, 0xffffff], 7);
        p.vx = -8; p.vy = 8; p.ctrlLock = 0.3;
        OT.UI.bossBar({ name: 'Le Gardien de la Forge', phase: 1, of: 3, label: `Démonter · ${B.hits}/4`, help: OT.BOSS_TEXT.phases[0].help, sub: B.hits / 4 });
        if (B.hits < B.bolts.length) combatEvent('hurt');
        if (B.hits >= B.bolts.length) { B.boltMesh.visible = false; bossPhase(B, 1); return; }
        break;
      }
      B.attackT -= dt;
      if (B.attackT < 0.5) B.eyeMat.emissiveIntensity = 2.4 + Math.sin(time * 40) * 1.5;
      if (B.attackT < 0.5 && !B.warned) { B.warned = true; OT.Input.rumble(-1, 0, 0.3, 120); }
      if (B.attackT <= 0) {
        B.attackN++;
        B.attackT = 2.0; B.warned = false; B.slamAnim = 1;
        OT.Sound.slam(); OT.Input.rumble(-1, 0.8, 0.3, 250); shake = 0.25;
        spawnWave();
        if (B.attackN % 2 === 0) setTimeout(() => { if (R && R.boss === B && B.phase === 0 && state === 'play') spawnWave(); }, 450);
      }
    } else if (B.phase === 1) {
      // PHASE 2 — ÉCOUTER : un seul vrai moteur parmi quatre
      B.boltMesh.visible = false;
      B.shield.visible = false;
      const real = B.motors[B.realMotor];
      B.smokeT -= dt;
      if (B.smokeT <= 0 && real.alive) { B.smokeT = 0.18; particles.burst(real.x + (Math.random() - 0.5) * 0.3, real.y + 0.45, 1, [0xbfb3a5, 0x8a8078], 1.2, { grav: -0.35, life: 0.9, size: 1.3 }); }
      let hum = 0;
      for (const m of B.motors) {
        if (!m.alive) continue;
        m.fan.rotation.z += dt * 6;
        m.mesh.position.y = m.y + Math.sin(time * 4 + m.i) * 0.05;
        const zone = { x0: m.x - 0.5, y0: m.y - 0.4, x1: m.x + 0.5, y1: m.y + 0.4 };
        for (const p of alive) {
          if (!overlap(pbox(p), zone)) continue;
          if (m === real) {
            OT.Sound.hit(); OT.Input.rumble(-1, 1, 1, 400); shake = 0.4;
            particles.burst(m.x, m.y, 30, [0xffd28a, 0xffffff], 8);
            m.alive = false; m.mesh.visible = false;
            OT.Sound.setHum(0);
            bossPhase(B, 2); return;
          }
          OT.Sound.boom(); particles.burst(m.x, m.y, 26, [0xff7a1a, 0x333333], 9, { up: 2 });
          m.alive = false; m.mesh.visible = false;
          bubble(m.x, m.y + 1.5, 'Faux moteur !', 2, '#ff7a1a');
          kill(p, 'boom');
        }
      }
      for (const p of alive) {
        const d = Math.hypot(p.x - real.x, p.y - real.y);
        const k = Math.max(0, 1 - d / 14);
        hum = Math.max(hum, k);
        p.partPulse = (p.partPulse || 0) - dt;
        if (k > 0 && p.partPulse <= 0) { OT.Input.rumble(p.i, k > 0.75 ? (k - 0.75) * 3 : 0, k, 160); p.partPulse = 0.45 - k * 0.3; }
      }
      OT.Sound.setHum(hum * hum);
      B.gearT -= dt;
      if (B.gearT <= 0) {
        B.gearT = 1.25;
        const x = 2 + Math.random() * 25.5;
        const m = M.gear(0.42, 8, M.MAT.brass, 0.25); m.position.set(x, 10.5, 0);
        const sh = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.6 }));
        sh.rotation.x = -Math.PI / 2;
        sh.position.set(x, groundBelow(x, 10) + 0.03, 0.3);
        R.group.add(m, sh);
        R.hazards.push({ type: 'gear', x, y: 10.5, vy: 0, r: 0.4, t: 0, mesh: m, shadow: sh });
      }
    } else if (B.phase === 2) {
      // PHASE 3 — COMPRENDRE : couper le courant, frapper le cœur 2 fois
      const sw = (R.ents.switch || [])[0];
      if (sw) {
        const zone = { x0: sw.x + 0.1, y0: sw.y, x1: sw.x + 0.9, y1: sw.y + 0.8 };
        const on = alive.some((p) => overlap(pbox(p), zone));
        if (on) { if (!sw.pressed) { OT.Sound.click(); OT.Input.rumble(-1, 0.2, 0.4, 100); } B.shieldOffT = Math.max(B.shieldOffT, mode === 'coop' ? 0.4 : ez(SOLO_SHIELD)); }
        sw.pressed = on;
        sw.lever.rotation.z = B.shieldOffT > 0 ? -0.5 : 0.5;
        sw.lamp.material.color.set(B.shieldOffT > 0 ? 0x3cff9a : 0xff3020);
      }
      B.shieldOffT -= dt;
      B.coreCool = Math.max(0, (B.coreCool || 0) - dt);
      const shieldOn = B.shieldOffT <= 0;
      B.shield.visible = shieldOn;
      B.shield.scale.setScalar(1 + Math.sin(time * 8) * 0.04);
      B.core.material.emissiveIntensity = 2 + Math.sin(time * 6) * 0.8;
      const cp = new THREE.Vector3(); B.core.getWorldPosition(cp);
      const zone = { x0: cp.x - 0.6, y0: cp.y - 0.6, x1: cp.x + 0.6, y1: cp.y + 0.6 };
      for (const p of alive) {
        if (!overlap(pbox(p), zone)) continue;
        if (B.coreCool > 0) continue;   // juste après un coup : ni nouveau coup, ni décharge (le joueur est repoussé)
        if (shieldOn) { OT.Sound.zap(); kill(p, 'zap'); continue; }
        B.coreCool = 1.2;
        B.coreHits++;
        OT.Sound.hit(); OT.Input.rumble(-1, 1, 1, 500); shake = 0.5;
        particles.burst(cp.x, cp.y, 30, [0xffd28a, 0xff7a1a, 0xffffff], 10, { up: 2 });
        p.vx = -9; p.vy = 9; p.ctrlLock = 0.35;
        B.shieldOffT = 0;
        combatCine('critique');
        if (B.coreHits < 2) {
          combatEvent('near');
          bubble(30, 9, 'ENCORE.', 2, '#ff9a2a', 'Le Gardien');
          // 1.5 : ATTAQUE SPÉCIALE — « la forge entière m'obéit » : le sol prend feu par vagues, de gauche à droite
          // (chaque bande clignote d'abord 1,2 s ; entre les bandes et sur les marches, on est à l'abri ; chaque bande ne brûle que 0,7 s)
          B.fireWave = { i: 0, t: 1.6 };
          setTimeout(() => { if (R && R.boss === B && B.outro <= 0) { combatCine('special', { title: 'LA FORGE S\'EMBRASE', sub: 'Monte sur une marche !' }); combatEvent('special'); } }, 1100);
          OT.UI.bossBar({ name: 'Le Gardien de la Forge', phase: 3, of: 3, label: 'Comprendre · 1/2', help: 'Encore un coup ! Recoupe le bouclier à l\'interrupteur, puis touche le cœur.', sub: 0.5 });
          break;
        }
        OT.Sound.boom();
        B.core.visible = false; B.shield.visible = false;
        R.hazards.forEach((h) => { R.group.remove(h.mesh); if (h.shadow) R.group.remove(h.shadow); });
        R.hazards.length = 0;
        bubble(30, 9, OT.BOSS_TEXT.end, 4, '#ff9a2a', 'Le Gardien');
        OT.UI.bossBar(null);
        clearBfx();
        combatCine('victoire', { sub: 'Le Gardien de la Forge' });
        setTimeout(() => combatEvent('relief'), 1800);
        B.outro = 0.01;
        return;
      }
      // Étincelles : seulement quand le bouclier est allumé (couper le courant arrête aussi les tirs).
      // Le cœur clignote 0,4 s avant chaque tir, et ne vise pas un joueur collé à lui.
      if (shieldOn) B.sparkT -= dt; else B.sparkT = Math.max(B.sparkT, 1.0);
      // 1.5 : couper le courant éteint AUSSI les étincelles déjà en vol (sinon une étincelle tirée juste avant
      // pouvait tuer le joueur qui court enfin vers le cœur : injuste)
      if (!shieldOn) for (const h of R.hazards) if (h.type === 'spark' && !h.dead) { h.dead = true; particles.burst(h.x, h.y, 4, [0x7ad7ff, 0xffffff], 2); }
      if (shieldOn && B.sparkT < 0.4) B.core.material.emissiveIntensity = 4 + Math.sin(time * 50) * 2;
      const targets = alive.filter((q) => Math.hypot(q.x - cp.x, q.y + 0.5 - cp.y) > 3.5);
      if (B.sparkT <= 0 && targets.length) {
        B.sparkT = B.coreHits ? 1.0 : 1.3;
        const tgt = targets[Math.floor(Math.random() * targets.length)];
        const dx = tgt.x - cp.x, dy = tgt.y + 0.5 - cp.y, l = Math.hypot(dx, dy) || 1;
        const sp = B.coreHits ? 6 : 5;
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), M.MAT.glowBlue);
        m.position.copy(cp); R.group.add(m);
        R.hazards.push({ type: 'spark', x: cp.x, y: cp.y, vx: (dx / l) * sp, vy: (dy / l) * sp, r: 0.22, t: 0, mesh: m });
        OT.Sound.zap();
      }
    }
  }

  function groundBelow(x, fromY) {
    for (let y = Math.floor(fromY); y >= 0; y--) if (tileSolid(Math.floor(x), y)) return y + 1;
    return 0;
  }

  /* ==================================================================
     3 bis. LE BOSS DU MONDE 2 : le Bug
     Phase 1 « Essayer »  : on le frappe… il se téléporte. Taper au hasard ne sert à rien.
     Phase 2 « Chercher » : ramasser les 3 LOGS (les traces de l'erreur) en évitant ses balayages.
     Phase 3 « Corriger » : il fonce, se cogne au mur, reste sonné : on applique un correctif (3 fois).
     ================================================================== */
  function makeMarker(group, text, bg, color) {
    const g2 = new THREE.Group();
    const lab = M.label(text, { size: 36, h: 0.5, color, bg });
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.36, 4), new THREE.MeshBasicMaterial({ color: bg, toneMapped: false }));
    arrow.rotation.x = Math.PI; arrow.position.y = -0.42;
    g2.add(lab, arrow);
    g2.traverse((o) => { if (o.material) { o.material.depthTest = false; o.renderOrder = 20; } });
    g2.visible = false;
    group.add(g2);
    return g2;
  }
  function makeBug(group) {
    const g = M.bug();
    group.add(g);
    const B = {
      kind: 'bug', g, cubes: g.userData.cubes, eyes: g.userData.eyes,
      x: 17.5, y: 4.6, tx: 17.5, ty: 4.6,
      phase: 0, tries: 0, logs: 0, patches: 0,
      // positions où il se pose en phase 1 (toutes atteignables d'un saut)
      anchors: [[2.5, 2.4], [5.5, 5.4], [11.5, 7.4], [17.5, 5.4], [23.5, 7.4], [29.5, 5.4], [33, 2.4]],
      anchorI: 3,
      // les 3 traces de l'erreur (phase 2)
      logSpots: [[5.5, 4.7], [23.5, 6.7], [11.5, 6.7]],
      logText: ['LOG 1 : erreur ligne 42', 'LOG 2 : variable « porte » vide', 'LOG 3 : oubli de fermer </div>'],
      state: 'idle', stateT: 0, dropT: 1.5, dashT: 2.2, dir: 1, sweepY: 1, speed: 13,
      hurtCool: 0, told: [], outro: 0,
    };
    B.logMeshes = B.logText.map((t, i) => {
      const lab = M.label('LOG ' + (i + 1) + '/3', { size: 34, h: 0.42, color: '#ffe66d', bg: 'rgba(40,10,10,0.92)', border: '#ffe66d' });
      lab.visible = false; group.add(lab); return lab;
    });
    B.markHit = makeMarker(group, 'FRAPPE ICI ?', '#ff2a3a', '#ffffff');
    B.markFix = makeMarker(group, 'CORRIGE-LE !', '#3cff9a', '#08200f');
    B.markLog = makeMarker(group, 'RAMASSE LE LOG', '#ffe66d', '#2a1a00');
    // barre rouge qui annonce un balayage (phase 2)
    B.bar = new THREE.Mesh(new THREE.PlaneGeometry(34, 1.1), new THREE.MeshBasicMaterial({ color: 0xff2a3a, transparent: true, opacity: 0.25, toneMapped: false, depthWrite: false }));
    B.bar.visible = false; group.add(B.bar);
    B.barArrow = M.label('→', { size: 60, h: 0.8, color: '#ff2a3a', bg: 'none' });
    B.barArrow.visible = false; group.add(B.barArrow);
    g.position.set(B.x, B.y, 0.2);
    // ---- version 1.5 ----
    // l'OMBRE du vrai Bug (les clones et l'écho n'en ont pas : c'est l'indice pour les reconnaître)
    B.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 18), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
    B.shadow.rotation.x = -Math.PI / 2; B.shadow.scale.y = 0.6; group.add(B.shadow);
    // deux CLONES (phase 1) / un ÉCHO (phase 3) : transparents, ils clignotent, sans ombre, inoffensifs
    const cm = [0xff2a3a, 0x2ff3ff, 0xff3fb4].map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5, toneMapped: false, depthWrite: false }));
    const cg = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    B.clones = [0, 1].map((k) => {
      const c = new THREE.Group();
      for (let i = 0; i < 16; i++) {
        const m = new THREE.Mesh(cg, cm[i % 3]);
        const a = (i / 16) * Math.PI * 2, r = 0.25 + (i % 4) * 0.14;
        m.position.set(Math.cos(a) * r, ((i * 7) % 11) / 11 - 0.5, Math.sin(a) * r * 0.5);
        m.scale.setScalar(0.6 + (i % 3) * 0.25); c.add(m);
      }
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.05), cm[1]);
      const e1 = eye.clone(); e1.position.set(-0.18, 0.15, 0.5); eye.position.set(0.18, 0.15, 0.5); c.add(eye, e1);
      c.visible = false; group.add(c);
      const mk = makeMarker(group, 'FRAPPE ICI ?', '#ff2a3a', '#ffffff');
      return { g: c, mk, x: 0, y: 0, on: false, dir: 1, k };
    });
    B.shotT = 3.2; B.colT = 2.4; B.splitDone = 0; B.echoOn = false;
    return B;
  }
  // version 1.5 : place les deux clones sur deux autres points d'ancrage (jamais sur le vrai)
  function bugClones(B, show) {
    const used = [B.anchorI];
    for (const c of B.clones) {
      c.on = show;
      c.g.visible = show;
      if (!show) { c.mk.visible = false; continue; }
      let k; do { k = Math.floor(Math.random() * B.anchors.length); } while (used.includes(k));
      used.push(k);
      c.x = B.anchors[k][0]; c.y = B.anchors[k][1];
      particles.burst(c.x, c.y, 10, [0x2ff3ff, 0xff3fb4], 4);
    }
  }
  function resetBugPhase(B) {
    if (B.phase === 0) { B.tries = 0; B.anchorI = 3; }
    if (B.phase === 1) B.logs = 0;
    if (B.phase === 2) { B.patches = 0; B.speed = 13; }
    const a = B.phase === 2 ? [17.5, 1.6] : B.anchors[B.anchorI];
    B.x = B.tx = a[0]; B.y = B.ty = a[1];
    B.state = B.phase === 2 ? 'aim' : 'idle'; B.stateT = B.phase === 2 ? 1.4 : 0;
    B.dropT = 1.5; B.dashT = 2.2; B.hurtCool = 0;
    B.logMeshes.forEach((m) => (m.visible = false));
    B.bar.visible = false; B.barArrow.visible = false;
    B.g.scale.setScalar(1); B.g.visible = true;
    // 1.5 : on efface clones, écho, attaques annoncées ; on remet les minuteries
    if (B.clones) bugClones(B, false);
    B.shotT = 3.2; B.colT = 2.4; B.echoOn = false; B.splitPend = false;
    if (B.phase === 2) B.splitDone = 0;
    clearBfx();
    bugBar(B);
  }
  function bugBar(B) {
    const T = WD().bossText;
    const P = T.phases[B.phase];
    const sub = B.phase === 0 ? B.tries / 3 : B.phase === 1 ? B.logs / 3 : B.patches / 3;
    const n = B.phase === 0 ? B.tries : B.phase === 1 ? B.logs : B.patches;
    OT.UI.bossBar({ name: T.name, phase: B.phase + 1, of: 3, label: `${P.name} · ${n}/3`, help: P.help, sub });
  }
  function bugPhase(B, ph) {
    const T = WD().bossText;
    B.phase = ph; arenaMood(ph);
    clearBfx();
    if (ph > 0) { combatCine(ph === 2 ? 'final' : 'phase', { title: ph === 2 ? 'SURCHARGE DU SYSTÈME' : 'CORRUPTION', sub: `Phase ${ph + 1}/3 · ${T.phases[ph].name}` }); if (ph === 2) setTimeout(() => combatEvent('final'), 2600); }
    const P = T.phases[ph];
    bubble(B.x, B.y + 2, P.say, 3.2, '#ff2a3a', T.name);
    OT.Input.rumble(-1, 0.9, 0.9, 500);
    OT.Sound.boom();
    shake = 0.5;
    R.hazards.forEach((h) => { R.group.remove(h.mesh); if (h.shadow) R.group.remove(h.shadow); });
    R.hazards.length = 0;
    resetBugPhase(B);
    if (ph > 0 && !B.told[ph] && P.tell) {
      B.told[ph] = true;
      state = 'dialog';
      OT.UI.dialog(P.tell, () => { if (state === 'dialog') state = 'play'; });
    }
  }
  function spawnDrop(x) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshBasicMaterial({ color: 0xff2a3a, toneMapped: false }));
    const lab = M.label('!', { size: 40, h: 0.4, color: '#ffffff', bg: 'none' }); lab.position.z = 0.36; m.add(lab);
    m.position.set(x, 11, 0);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.6 }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(x, groundBelow(x, 10) + 0.03, 0.3);
    R.group.add(m, sh);
    R.hazards.push({ type: 'drop', x, y: 11, vy: 0, r: 0.35, t: 0, mesh: m, shadow: sh });
  }
  function updateBug(B, alive, dt) {
    const T = WD().bossText;
    B.cubes.forEach((c, i) => {
      const h = c.userData.home;
      const jit = B.state === 'aim' || B.state === 'tele' ? 0.14 : 0.05;
      c.position.set(h.x + Math.sin(time * 9 + i) * jit, h.y + Math.cos(time * 7 + i * 1.3) * jit, h.z);
      c.rotation.x += dt * (1 + (i % 3)); c.rotation.y += dt;
    });
    B.eyes.forEach((e) => e.material.color.set(B.state === 'aim' || B.state === 'tele' || B.state === 'sweep' || B.state === 'dash' ? 0xff2a3a : B.state === 'stun' ? 0x777777 : 0xffffff));
    B.hurtCool = Math.max(0, B.hurtCool - dt);
    B.markHit.visible = false; B.markFix.visible = false; B.markLog.visible = false;
    B.bar.visible = false; B.barArrow.visible = false;
    if (B.outro > 0) {
      B.outro += dt;
      B.shadow.visible = false;
      B.g.scale.setScalar(Math.max(0.15, 1 - B.outro * 0.4));
      B.g.rotation.y += dt * 4;
      B.g.position.set(B.x, B.y + Math.sin(time * 2) * 0.1, 0.2);
      if (B.outro > 4.2 && !R.done) bossDone();
      return;
    }
    // blocs « ERREUR » qui tombent du plafond (ombre rouge = endroit de la chute)
    for (const h of R.hazards) {
      h.t += dt;
      if (h.t > 0.8) { h.vy -= 40 * dt; h.y += h.vy * dt; }
      h.mesh.position.set(h.x, h.y, 0); h.mesh.rotation.z += dt * 3;
      h.shadow.visible = h.t < 0.8 || h.y > 2;
      if (tileSolid(Math.floor(h.x), Math.floor(h.y - 0.4)) || h.y < -2) { h.dead = true; particles.burst(h.x, h.y, 10, [0xff2a3a, 0xffffff], 5, { up: 2 }); OT.Sound.slam(); OT.Input.rumble(-1, 0.3, 0.1, 80); }
      if (h.t > 0.8) { const z = { x0: h.x - h.r, y0: h.y - h.r, x1: h.x + h.r, y1: h.y + h.r }; for (const p of alive) if (overlap(pbox(p), z)) kill(p, 'crush'); }
    }
    for (let i = R.hazards.length - 1; i >= 0; i--) if (R.hazards[i].dead) { R.group.remove(R.hazards[i].mesh); R.group.remove(R.hazards[i].shadow); R.hazards.splice(i, 1); }
    const bob = Math.sin(time * 5) * 0.12;
    const zoneOf = (ry = 0.6) => ({ x0: B.x - 0.6, y0: B.y - ry, x1: B.x + 0.6, y1: B.y + ry });
    const glide = (k) => { B.x += (B.tx - B.x) * Math.min(1, dt * k); B.y += (B.ty - B.y) * Math.min(1, dt * k); };

    if (B.phase === 0) {
      // PHASE 1 — ESSAYER : on le touche… il se téléporte
      glide(8);
      B.markHit.visible = true; B.markHit.position.set(B.x, B.y + 1.4 + bob, 1);
      for (const p of alive) {
        if (B.hurtCool > 0 || !overlap(pbox(p), zoneOf())) continue;
        B.tries++; B.hurtCool = 0.6;
        p.vx = p.x < B.x ? -7 : 7; p.vy = 7; p.ctrlLock = 0.25;
        OT.Sound.hit(); OT.Input.rumble(-1, 0.5, 0.4, 160); shake = 0.2;
        particles.burst(B.x, B.y, 20, [0xff2a3a, 0x2ff3ff, 0xffffff], 7);
        const msgs = ['Raté ! Je suis ailleurs.', 'Toujours pas !', 'Taper au hasard ne corrige rien.'];
        bubble(B.x, B.y + 2, msgs[Math.min(B.tries - 1, 2)], 2.2, '#ff2a3a', T.name);
        const ox = B.x, oy = B.y;
        let k; do { k = Math.floor(Math.random() * B.anchors.length); } while (k === B.anchorI);
        B.anchorI = k; B.x = B.tx = B.anchors[k][0]; B.y = B.ty = B.anchors[k][1];
        particles.burst(B.x, B.y, 16, [0xff2a3a, 0x2ff3ff], 6);
        // 1.5 : téléportation LISIBLE — une traînée de pixels relie l'ancienne et la nouvelle position
        for (let s = 1; s < 8; s++) particles.burst(ox + (B.x - ox) * s / 8, oy + (B.y - oy) * s / 8, 2, [0x2ff3ff, 0xff2a3a], 1, { grav: 0, life: 0.5 });
        if (B.tries >= 3) { bugPhase(B, 1); return; }
        // 1.5 : il se COPIE (deux clones transparents qui clignotent, sans ombre)
        bugClones(B, true); combatEvent('nouveau:clone');
        bugBar(B);
        break;
      }
      // 1.5 : les clones — les toucher ne fait aucun mal, mais ne sert à rien (« Copie vide ! »)
      for (const c of B.clones) {
        if (!c.on) continue;
        c.g.visible = Math.sin(time * 23 + c.k * 2.1) > -0.55;   // ils clignotent
        c.g.position.set(c.x + Math.sin(time * 31 + c.k) * 0.06, c.y + Math.sin(time * 3 + c.k) * 0.06, 0.2);
        c.g.rotation.y += dt * 2;
        c.mk.visible = true; c.mk.position.set(c.x, c.y + 1.4 + bob, 1);
        for (const p of alive) if (overlap(pbox(p), { x0: c.x - 0.6, y0: c.y - 0.6, x1: c.x + 0.6, y1: c.y + 0.6 })) {
          c.on = false; c.g.visible = false; c.mk.visible = false;
          particles.burst(c.x, c.y, 18, [0x2ff3ff, 0xff3fb4, 0xffffff], 5);
          bubble(c.x, c.y + 1.6, 'Copie vide ! Le vrai a une ombre.', 2.2, '#b78cff');
          p.vx = p.x < c.x ? -5 : 5; p.vy = Math.max(p.vy, 5); p.ctrlLock = 0.15;
          OT.Sound.whoosh(); OT.Input.rumble(p.i, 0.1, 0.3, 90);
          break;
        }
      }
      // 1.5 : RAFALE DE DONNÉES — une bande rouge traverse l'écran à hauteur du joueur (1 s), puis la rafale
      // part du bord OPPOSÉ (on a le temps de la voir venir) : sauter, ou changer d'étage
      B.shotT -= dt;
      if (B.shotT <= 0 && alive.length) {
        B.shotT = 3.4;
        const tg = alive[Math.floor(Math.random() * alive.length)];
        const gy = Math.max(1, tg.onGround ? Math.round(tg.y) : groundBelow(tg.x, tg.y + 0.2));
        const AW = R.AW || R.W, vx = tg.x < AW / 2 ? -9 : 9;
        fxLance(vx < 0 ? AW - 1.2 : 1.2, gy + 0.32, vx, { warn: 1.0, w: 1.1, h: 0.42, lane: true, cause: 'zap', mat: bfxMats().col });
        combatEvent('nouveau:shot');
      }
      B.dropT -= dt;
      if (B.dropT <= 0) {
        B.dropT = 1.25;
        const tg = alive[Math.floor(Math.random() * alive.length)];
        const x = tg && Math.random() < 0.5 ? Math.max(1.6, Math.min(33.4, tg.x + (Math.random() - 0.5) * 2)) : 1.6 + Math.random() * 31.8;
        spawnDrop(x);
      }
    } else if (B.phase === 1) {
      // PHASE 2 — CHERCHER : ramasser les 3 logs, éviter les balayages
      const spot = B.logSpots[B.logs], lm = B.logMeshes[B.logs];
      lm.visible = true; lm.position.set(spot[0], spot[1] + bob * 0.5, 0.4);
      B.markLog.visible = true; B.markLog.position.set(spot[0], spot[1] + 1.1 + bob, 1);
      for (const p of alive) if (touches(p, spot[0], spot[1], 0.7, 0.55)) {
        lm.visible = false;
        bubble(spot[0], spot[1] + 1.6, B.logText[B.logs], 3, '#ffe66d');
        B.logs++;
        OT.Sound.part(); OT.Input.rumble(-1, 0.3, 0.6, 200);
        particles.burst(spot[0], spot[1], 18, [0xffe66d, 0xffffff], 5);
        if (B.logs >= 3) { bugPhase(B, 2); return; }
        bugBar(B);
        break;
      }
      if (B.state === 'idle') {
        glide(2.5);
        if (Math.hypot(B.tx - B.x, B.ty - B.y) < 0.3) { const a = B.anchors[Math.floor(Math.random() * B.anchors.length)]; B.tx = a[0]; B.ty = a[1] + 1; }
        // 1.5 : CORRUPTION — une colonne rouge translucide (1,1 s), puis corrompue (1 s). Jamais sur le log à ramasser.
        B.colT -= dt;
        if (B.colT <= 0 && B.dashT > 1.0 && alive.length) {
          B.colT = 2.6;
          const tg = alive[Math.floor(Math.random() * alive.length)];
          let cx = Math.max(2, Math.min(33, tg.x + (Math.random() * 4 - 2)));
          if (Math.abs(cx - spot[0]) < 1.8) cx = spot[0] + (cx < spot[0] ? -2.6 : 2.6);
          cx = Math.max(2, Math.min(33, cx));
          fxColumn(cx - 0.8, cx + 0.8, { warn: 1.1, act: 1.0 });
          combatEvent('nouveau:column');
        }
        B.dashT -= dt;
        if (B.dashT <= 0 && alive.length) {
          const tg = alive[Math.floor(Math.random() * alive.length)];
          B.sweepY = Math.max(1, Math.round(tg.y));
          B.dir = tg.x > 17.5 ? 1 : -1;   // il part du côté opposé au joueur : on a le temps de voir venir
          B.state = 'tele'; B.stateT = 1.1;
          OT.Sound.zap(); for (const p of alive) OT.Input.rumble(p.i, 0, 0.3, 100);
        }
      } else if (B.state === 'tele') {
        B.stateT -= dt;
        B.tx = B.dir > 0 ? 1.2 : 33.8; B.ty = B.sweepY + 0.55; glide(10);
        B.bar.visible = true; B.bar.position.set(17.5, B.sweepY + 0.55, 0.5);
        B.bar.material.opacity = 0.18 + 0.18 * (Math.sin(time * 18) * 0.5 + 0.5);
        B.barArrow.visible = true; B.barArrow.position.set(B.dir > 0 ? 4 : 31, B.sweepY + 0.55, 0.6);
        B.barArrow.rotation.z = B.dir > 0 ? 0 : Math.PI;
        if (B.stateT <= 0) { B.state = 'sweep'; B.x = B.tx; B.y = B.ty; OT.Sound.whoosh(); }
      } else if (B.state === 'sweep') {
        B.x += B.dir * 16 * dt;
        for (const p of alive) if (overlap(pbox(p), zoneOf(0.55))) kill(p, 'zap');
        if (Math.random() < 0.6) particles.burst(B.x, B.y, 2, [0xff2a3a, 0x2ff3ff], 2, { grav: 0, life: 0.3 });
        if (B.x > 34.2 || B.x < 0.8) {
          B.state = 'idle'; B.dashT = 1.7;
          const a = B.anchors[Math.floor(Math.random() * B.anchors.length)]; B.tx = a[0]; B.ty = a[1] + 1;
        }
      }
    } else if (B.phase === 2) {
      // PHASE 3 — CORRIGER : il fonce, se cogne, reste sonné → on le corrige
      if (B.state === 'aim') {
        B.stateT -= dt;
        B.tx = B.x; B.ty = 1.6; glide(8);
        const tg = alive.reduce((a, p) => (!a || Math.abs(p.x - B.x) < Math.abs(a.x - B.x) ? p : a), null);
        if (tg) B.dir = tg.x >= B.x ? 1 : -1;
        if (B.stateT <= 0) {
          B.state = 'dash'; OT.Sound.whoosh(); OT.Input.rumble(-1, 0.3, 0.3, 120);
          // 1.5 : à partir du 1er correctif, son ÉCHO fonce en sens inverse — transparent, sans ombre, INOFFENSIF
          if (B.patches >= 1) { const e = B.clones[0]; e.on = true; B.echoOn = true; e.dir = -B.dir; e.x = B.x; e.y = 1.6; }
        }
      } else if (B.state === 'dash') {
        B.x += B.dir * B.speed * dt; B.y = 1.6;
        for (const p of alive) if (overlap(pbox(p), zoneOf(0.6))) kill(p, 'zap');
        if (Math.random() < 0.5) particles.burst(B.x - B.dir * 0.6, 1.2, 2, [0xff2a3a, 0x2ff3ff], 2, { up: 1, life: 0.3 });
        if (B.x <= 2.0 || B.x >= 33.0) {
          B.x = Math.max(2.0, Math.min(33.0, B.x));
          B.state = 'stun'; B.stateT = 1.9;
          OT.Sound.slam(); OT.Input.rumble(-1, 0.7, 0.3, 220); shake = 0.3;
          particles.burst(B.x + B.dir * 0.6, 1.6, 20, [0xffffff, 0xffe66d], 6, { up: 2 });
          combatEvent('weak');
        }
      } else if (B.state === 'stun') {
        B.stateT -= dt;
        B.markFix.visible = true; B.markFix.position.set(B.x, B.y + 1.5 + bob, 1);
        if (Math.random() < 0.15) particles.burst(B.x, B.y + 0.9, 1, 0xffe66d, 1.5, { grav: 0, life: 0.5 });
        for (const p of alive) {
          if (B.hurtCool > 0 || !overlap(pbox(p), zoneOf())) continue;
          B.hurtCool = 0.8; B.patches++;
          p.vx = p.x < B.x ? -8 : 8; p.vy = 8; p.ctrlLock = 0.3;
          OT.Sound.hit(); OT.Input.rumble(-1, 1, 1, 400); shake = 0.4;
          particles.burst(B.x, B.y, 30, [0x3cff9a, 0xffffff, 0xff2a3a], 9, { up: 2 });
          if (B.patches >= 3) {
            OT.Sound.boom();
            R.hazards.forEach((h) => { R.group.remove(h.mesh); if (h.shadow) R.group.remove(h.shadow); });
            R.hazards.length = 0;
            clearBfx(); bugClones(B, false); B.echoOn = false;
            bubble(B.x, B.y + 2.2, T.end, 4, '#3cff9a', T.name);
            OT.UI.bossBar(null);
            combatCine('victoire', { sub: T.name });
            setTimeout(() => combatEvent('relief'), 1800);
            B.state = 'idle'; B.y = 3; B.outro = 0.01;
            return;
          }
          bubble(B.x, B.y + 2, ['Correctif 1/3 appliqué.', 'Correctif 2/3 appliqué. Encore un !'][B.patches - 1], 2.2, '#3cff9a');
          combatCine('critique');
          combatEvent(B.patches === 2 ? 'near' : 'hurt');
          B.speed = 13 + B.patches * 2.5;
          B.state = 'recover'; B.stateT = 0.8; B.splitPend = true;   // 1.5 : après chaque correctif → SURCHARGE
          bugBar(B);
          break;
        }
        if (B.state === 'stun' && B.stateT <= 0) { B.state = 'recover'; B.stateT = 0.8; }
      } else if (B.state === 'recover') {
        B.stateT -= dt;
        B.tx = 17.5; B.ty = 1.6; glide(3.5);
        if (B.stateT <= 0) {
          if (B.splitPend) {
            // 1.5 : SURCHARGE — il s'élève et DÉCOUPE l'arène : des colonnes rouges (1,5 s d'avance) partout
            // sauf trois zones VERTES. Chaque point de l'arène est à moins de 5 cases d'une zone verte.
            B.splitPend = false; B.splitDone++;
            B.state = 'split'; B.stateT = 2.7;
            const SAFE = [[3.4, 6.6], [15.9, 19.1], [28.4, 31.6]];
            let x = 1;
            for (const s of SAFE) { if (s[0] > x) fxColumn(x, s[0], { warn: 1.5, act: 0.9 }); fxSafe(s[0], s[1], 2.4); x = s[1]; }
            fxColumn(x, (R.AW || R.W) - 1, { warn: 1.5, act: 0.9 });
            if (B.splitDone === 1) combatEvent('nouveau:split');
            else { combatCine('special', { title: 'SURCHARGE !', sub: 'Va dans une zone verte' }); combatEvent('special'); }
            OT.Sound.zap(); OT.Input.rumble(-1, 0.4, 0.6, 300);
          } else { B.state = 'aim'; B.stateT = 0.9; }
        }
      } else if (B.state === 'split') {
        B.stateT -= dt;
        B.tx = 17.5; B.ty = 6.2; glide(4);
        if (Math.random() < 0.4) particles.burst(B.x + (Math.random() - 0.5) * 2, B.y, 1, [0xff2a3a, 0x2ff3ff], 3, { grav: 0, life: 0.3 });
        if (B.stateT <= 0) { B.state = 'aim'; B.stateT = 1.0; }
      }
      // l'ÉCHO (inoffensif) : il traverse l'arène en sens inverse pendant la charge du vrai
      if (B.echoOn) {
        const e = B.clones[0];
        e.x += e.dir * B.speed * dt;
        e.g.visible = Math.sin(time * 23) > -0.55;
        e.g.position.set(e.x, 1.6 + Math.sin(time * 31) * 0.05, 0.2);
        e.mk.visible = false;
        if (e.x < 1.5 || e.x > 33.5 || B.state !== 'dash') { B.echoOn = false; e.on = false; e.g.visible = false; }
      }
    }
    // 1.5 : l'ombre du VRAI Bug, toujours sous lui (les copies n'en ont pas)
    B.shadow.visible = B.outro <= 0;
    if (B.shadow.visible) B.shadow.position.set(B.x, groundBelow(B.x, B.y) + 0.04, 0.2);
    B.g.position.set(B.x, B.y + (B.state === 'stun' ? 0 : Math.sin(time * 3) * 0.06), 0.2);
    B.g.rotation.z = B.state === 'stun' ? Math.sin(time * 6) * 0.2 : 0;
  }


  /* ==================================================================
     version 1.5 — LE SYSTÈME COMMUN DES COMBATS DE BOSS
     Des « effets d'attaque » (R.bfx) partagés par les cinq boss. Chaque effet a
     TOUJOURS un avertissement visible avant d'être dangereux, et sa zone de danger
     correspond exactement à ce qu'on voit :
       slam   : un poing / un bras tombe (marque rouge au sol), puis reste planté
                (solide : on peut monter dessus) avant de remonter
       strip  : une bande du sol qui rougeoie / clignote, puis brûle / s'électrise
       column : une colonne translucide qui devient mortelle (corruption)
       bolt   : un éclair (cercle crépitant au sol, puis la colonne de foudre)
       lance  : un projectile horizontal annoncé (lueur au départ, bande colorée)
       safe   : une zone verte « SÛR » (seulement visuelle)
     Tout est effacé à chaque changement de phase et à chaque réapparition.
     Le robot de test lit les mêmes informations : h.zone, h.on0 / h.on1 (temps du
     monde où l'effet est dangereux), h.vx (projectile).
     ================================================================== */
  let BFXM = null;
  function bfxMats() {
    if (BFXM) return BFXM;
    const mk = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, toneMapped: false, depthWrite: false, side: THREE.DoubleSide });
    BFXM = {
      warn: mk(0xff2a2a, 0.5), warnO: mk(0xff8a1a, 0.55), warnC: mk(0x1764ff, 0.55), warnV: mk(0xb78cff, 0.5), warnY: mk(0xffd21a, 0.6),
      fire: mk(0xff6a10, 0.85), elec: mk(0x2f8bff, 0.9), ghostY: mk(0xffd21a, 0.16), ghostV: mk(0xb78cff, 0.14), bolt: mk(0xfff8d0, 0.95), col: mk(0xff2a3a, 0.6), safe: mk(0x3cff9a, 0.22),
      fist: new THREE.MeshStandardMaterial({ color: 0x4a403a, roughness: 0.55, metalness: 0.6, emissive: 0x200800 }),
      plane: new THREE.PlaneGeometry(1, 1), box: new THREE.BoxGeometry(1, 1, 1), ball: new THREE.SphereGeometry(0.5, 12, 10),
    };
    for (const g of [BFXM.plane, BFXM.box, BFXM.ball]) g.userData.shared = true;
    return BFXM;
  }
  function bfxMesh(geo, mat, sx, sy, sz, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    R.group.add(m);
    return m;
  }
  // une marque au sol : un liseré devant + une plaque à plat (visible sous la caméra 2.5D)
  function bfxFloorMark(x0, x1, g, mat) {
    const X = bfxMats();
    const flat = bfxMesh(X.plane, mat, x1 - x0, 1.6, 1, (x0 + x1) / 2, g + 0.03, 0);
    flat.rotation.x = -Math.PI / 2;
    const edge = bfxMesh(X.plane, mat, x1 - x0, 0.22, 1, (x0 + x1) / 2, g + 0.11, 0.85);
    return [flat, edge];
  }
  function bfxAdd(h) {
    (R.bfx = R.bfx || []).push(h);
    h.t = 0; h.born = time; h.meshes = h.meshes || [];
    h.on0 = time + (h.warn || 0); h.on1 = h.on0 + (h.act || 0.2);
    return h;
  }
  // POING / BRAS QUI S'ÉCRASE : marque rouge (warn s), chute (0,14 s, mortelle), reste planté (stay s)
  function fxSlam(x, w, o = {}) {
    const X = bfxMats(), g = o.ground !== undefined ? o.ground : groundBelow(x, 9), fh = o.h || 1.4;
    const x0 = x - w / 2, x1 = x + w / 2;
    const h = bfxAdd({ k: 'slam', x, w, g, fh, warn: o.warn || 1.0, act: 0.14, stay: o.stay !== undefined ? o.stay : 1.6, onImpact: o.onImpact || null,
      zone: { x0, x1, y0: g, y1: g + fh + 0.3 }, y: g + 7.5 });
    h.mark = bfxFloorMark(x0, x1, g, X.warn);
    h.fist = bfxMesh(X.box, X.fist, w, fh, 1.4, x, h.y + fh / 2, 0);
    h.meshes.push(...h.mark, h.fist);
    return h;
  }
  // BANDE DU SOL qui rougeoie (feu) ou clignote (électricité), puis devient mortelle
  function fxStrip(x0, x1, o = {}) {
    const X = bfxMats(), g = o.ground !== undefined ? o.ground : 1, elec = o.kind === 'elec';
    const h = bfxAdd({ k: 'strip', elec, g, warn: o.warn || 1.0, act: o.act || 1.3, zone: { x0, x1, y0: g - 0.05, y1: g + 0.6 } });
    h.mark = bfxFloorMark(x0, x1, g, elec ? X.warnC : X.warnO);
    h.hot = bfxMesh(X.plane, elec ? X.elec : X.fire, x1 - x0, 0.6, 1, (x0 + x1) / 2, g + 0.3, 0.8);
    h.hot.visible = false;
    h.meshes.push(...h.mark, h.hot);
    return h;
  }
  // COLONNE de corruption : translucide (warn), puis rouge et mortelle sur toute la hauteur
  function fxColumn(x0, x1, o = {}) {
    const X = bfxMats();
    const h = bfxAdd({ k: 'column', warn: o.warn || 1.0, act: o.act || 1.2, zone: { x0, x1, y0: -1, y1: R.H + 1 } });
    h.col = bfxMesh(X.plane, X.warn, x1 - x0, R.H, 1, (x0 + x1) / 2, R.H / 2, 0.7);
    h.meshes.push(h.col);
    return h;
  }
  // ÉCLAIR : un cercle crépite au sol (warn s), puis la foudre tombe (0,25 s)
  function fxBolt(x, o = {}) {
    const X = bfxMats(), g = o.ground !== undefined ? o.ground : groundBelow(x, R.H - 2), r = o.r || 0.65;
    const h = bfxAdd({ k: 'bolt', x, g, warn: o.warn || 0.9, act: 0.25, harmless: !!o.harmless, zone: { x0: x - r * 0.92, x1: x + r * 0.92, y0: g - 0.05, y1: R.H + 1 } });
    h.mark = bfxFloorMark(x - r, x + r, g, o.harmless ? X.warnV : X.warnY);
    h.line = bfxMesh(X.plane, o.harmless ? X.warnV : X.warnY, 0.12, R.H - g, 1, x, (R.H + g) / 2, 0.75);
    // la COLONNE fantôme : toute la zone où la foudre va tomber, en transparence (c'est exactement la zone mortelle)
    h.ghost = bfxMesh(X.plane, o.harmless ? X.ghostV : X.ghostY, (h.zone.x1 - h.zone.x0), R.H - g, 1, x, (R.H + g) / 2, 0.7);
    h.beam = bfxMesh(X.plane, X.bolt, r * 2 * 0.8, R.H - g, 1, x, (R.H + g) / 2, 0.8);
    h.beam.visible = false;
    h.meshes.push(...h.mark, h.line, h.ghost, h.beam);
    return h;
  }
  // PROJECTILE horizontal : lueur au départ (+ bande colorée si lane), puis il file en ligne droite
  function fxLance(x, y, vx, o = {}) {
    const X = bfxMats(), hw = o.w || 1.0, hh = o.h || 0.4;
    const h = bfxAdd({ k: 'lance', x, y, vx, hw, hh, warn: o.warn || 0.7, act: 99, harmless: !!o.harmless, cause: o.cause || 'zap',
      zone: { x0: x - hw / 2, x1: x + hw / 2, y0: y - hh / 2, y1: y + hh / 2 } });
    const mat = o.mat || (o.harmless ? X.warnV : X.bolt);
    h.body = o.round ? bfxMesh(X.ball, mat, hh * 1.6, hh * 1.6, hh * 1.6, x, y, 0.3) : bfxMesh(X.box, mat, hw, hh, 0.5, x, y, 0.3);
    h.glow = bfxMesh(X.ball, X.warnY, 0.8, 0.8, 0.8, x, y, 0.4);
    h.meshes.push(h.body, h.glow);
    if (o.lane) { h.lane = bfxMesh(X.plane, o.harmless ? X.warnV : X.warn, R.AW - 1, hh + 0.25, 1, R.AW / 2, y, 0.6); h.meshes.push(h.lane); }
    return h;
  }
  // ZONE SÛRE (verte, seulement un repère visuel)
  function fxSafe(x0, x1, dur) {
    const X = bfxMats();
    const h = bfxAdd({ k: 'safe', warn: 0, act: dur, harmless: true, zone: { x0, x1, y0: 0, y1: 0 } });
    h.col = bfxMesh(X.plane, X.safe, x1 - x0, R.H, 1, (x0 + x1) / 2, R.H / 2, 0.7);
    h.meshes.push(h.col);
    return h;
  }
  function clearBfx() {
    if (!R) return;
    for (const h of R.bfx || []) for (const m of h.meshes) R.group.remove(m);
    R.bfx = []; R.bfxSolids = [];
  }
  const combatEvent = (n, o) => { if (OT.Combat) OT.Combat.event(n, o); };
  const combatCine = (t, o) => { if (OT.Combat) OT.Combat.cine(t, o); };
  function updateBossFx(alive, dt) {
    const L = R.bfx || [];
    R.bfxSolids = [];
    const blink = Math.sin(time * 18) > 0;
    for (const h of L) {
      h.t += dt;
      const warnLeft = h.warn - h.t, on = h.t >= h.warn && h.t < h.warn + h.act;
      let killZone = null;
      if (h.k === 'slam') {
        if (h.t < h.warn) {
          // le poing descend lentement au-dessus de la marque (on le voit venir)
          h.y = h.g + 7.5 - (h.t / h.warn) * 3.5;
          h.mark.forEach((m) => (m.visible = blink || warnLeft > 0.5));
        } else if (h.t < h.warn + 0.14) {
          h.y = Math.max(h.g, h.g + 4 - ((h.t - h.warn) / 0.14) * 4);
          killZone = { x0: h.zone.x0 + 0.05, x1: h.zone.x1 - 0.05, y0: h.y, y1: h.y + h.fh };
        } else if (!h.landed) {
          h.landed = true; h.y = h.g;
          h.mark.forEach((m) => (m.visible = false));
          OT.Sound.slam(); OT.Input.rumble(-1, 0.8, 0.4, 220); shake = Math.max(shake, 0.35);
          particles.burst(h.x, h.g + 0.2, 22, [0x9c8f80, 0xffa040, 0x5d5148], 7, { up: 2 });
          shock(h.x, h.g + 0.05, 0xffb060, 2.2, 0.4, true);
          const miss = !alive.some((p) => Math.abs(p.x - h.x) < h.w / 2 + 0.9 && p.y < h.g + 2.5);
          if (h.onImpact) h.onImpact(h, miss);
        } else if (h.t < h.warn + 0.14 + h.stay) {
          R.bfxSolids.push({ x0: h.zone.x0, y0: h.g, x1: h.zone.x1, y1: h.g + h.fh, ref: h });
        } else {
          h.y += dt * 9;
          if (h.y > h.g + 9) h.dead = true;
        }
        h.fist.position.y = h.y + h.fh / 2;
      } else if (h.k === 'strip') {
        if (h.t < h.warn) h.mark.forEach((m) => (m.visible = blink || warnLeft > 0.6));
        else if (on) {
          h.mark.forEach((m) => (m.visible = true));
          h.hot.visible = true; h.hot.scale.y = 0.6 + Math.sin(time * 30) * 0.1;
          killZone = h.zone;
          if (Math.random() < 0.6) particles.burst(h.zone.x0 + Math.random() * (h.zone.x1 - h.zone.x0), h.g + 0.1, 1, h.elec ? [0x9ff0ff, 0xffffff] : [0xff6a10, 0xffd28a], h.elec ? 4 : 3, { up: 2, life: 0.4 });
          if (!h.snd) { h.snd = true; if (h.elec) OT.Sound.zap(); else OT.Sound.sizzle ? OT.Sound.sizzle() : OT.Sound.zap(); }
        } else h.dead = true;
      } else if (h.k === 'column') {
        if (h.t < h.warn) { h.col.material = bfxMats().warn; h.col.visible = blink || warnLeft > 0.5; }
        else if (on) {
          h.col.material = bfxMats().col; h.col.visible = true; killZone = h.zone;
          if (!h.snd) { h.snd = true; OT.Sound.zap(); OT.Input.rumble(-1, 0.3, 0.5, 150); }
          if (Math.random() < 0.5) particles.burst(h.zone.x0 + Math.random() * (h.zone.x1 - h.zone.x0), Math.random() * R.H, 1, [0xff2a3a, 0x2ff3ff], 2, { grav: 0, life: 0.3 });
        } else h.dead = true;
      } else if (h.k === 'bolt') {
        if (h.t < h.warn) { h.line.visible = blink; h.ghost.visible = true; h.mark.forEach((m) => (m.visible = true)); if (Math.random() < 0.3) particles.burst(h.x + (Math.random() - 0.5), h.g + 0.1, 1, [0xfff2a0, 0xffffff], 2, { grav: 0, life: 0.2 }); }
        else if (on) {
          h.line.visible = false; h.ghost.visible = false; h.beam.visible = true; h.beam.scale.x = (h.zone.x1 - h.zone.x0) * (0.96 + Math.random() * 0.12);   // la foudre visible = la zone mortelle
          if (!h.harmless) killZone = h.zone;
          if (!h.snd) { h.snd = true; OT.Sound.zap(); if (!h.harmless) { OT.Sound.boom(); shake = Math.max(shake, 0.2); OT.Input.rumble(-1, 0.5, 0.6, 160); particles.burst(h.x, h.g + 0.2, 16, [0xfff2a0, 0xffffff, 0x7fe6ff], 6, { up: 2 }); } }
        } else h.dead = true;
      } else if (h.k === 'lance') {
        if (h.t < h.warn) { h.glow.visible = true; h.glow.scale.setScalar(0.5 + (h.t / h.warn) * 0.6); h.body.visible = false; if (h.lane) h.lane.visible = blink; }
        else {
          if (!h.snd) { h.snd = true; OT.Sound.whoosh(); if (h.lane) h.lane.visible = false; }
          h.glow.visible = false; h.body.visible = !h.harmless || Math.sin(time * 25) > -0.3;
          h.x += h.vx * dt; h.body.position.x = h.x;
          h.zone.x0 = h.x - h.hw / 2; h.zone.x1 = h.x + h.hw / 2;
          // un poing / un bras PLANTÉ au sol arrête le projectile (on peut s'abriter derrière)
          for (const s of L) if (s.k === 'slam' && s.landed && s.t < s.warn + 0.14 + s.stay && h.zone.x1 > s.zone.x0 && h.zone.x0 < s.zone.x1 && h.zone.y0 < s.g + s.fh && h.zone.y1 > s.g) {
            h.dead = true; particles.burst(h.x, h.y, 12, [0xfff2a0, 0xff9a2a, 0xffffff], 4, { up: 1, life: 0.35 }); OT.Sound.slam();
          }
          if (!h.harmless && !h.dead) killZone = h.zone;
          if (Math.random() < 0.5) particles.burst(h.x - Math.sign(h.vx) * 0.4, h.y, 1, [0xfff2a0, 0x7fe6ff], 1, { grav: 0, life: 0.25 });
          if (h.x < 0.6 || h.x > (R.AW || R.W) - 0.6) h.dead = true;
        }
      } else if (h.k === 'safe') {
        h.col.visible = true;
        if (h.t > h.act) h.dead = true;
      }
      // dégâts : seulement quand l'effet est réellement dangereux (et visible comme tel)
      if (killZone) for (const p of alive) {
        if (overlap(pbox(p), killZone)) { h.killed = true; kill(p, h.k === 'strip' ? (h.elec ? 'zap' : 'burn') : h.k === 'slam' ? 'crush' : h.cause || 'zap'); }
        else if (Math.abs(p.x - (killZone.x0 + killZone.x1) / 2) < (killZone.x1 - killZone.x0) / 2 + 1.3) h.close = true;
      }
      if (h.dead && h.close && !h.killed && !h.harmless) combatEvent('dodge');   // esquive de justesse : le boss (ou le héros) réagit
    }
    for (let i = L.length - 1; i >= 0; i--) if (L[i].dead) { for (const m of L[i].meshes) R.group.remove(m); L.splice(i, 1); }
  }

  /* ==================================================================
     BOSS DES MONDES 3, 4, 5 — outils communs
     ================================================================== */
  const BOSS = {
    gardien: { reset: (B) => resetBossPhase(B), update: (B, a, dt) => updateBoss(B, a, dt), start: (B) => bossPhase(B, 0) },
    bug: { reset: (B) => resetBugPhase(B), update: (B, a, dt) => updateBug(B, a, dt), start: (B) => bugPhase(B, 0) },
    exam: { reset: (B) => resetExam(B), update: (B, a, dt) => updateExam(B, a, dt), start: (B) => genPhase(B, 0) },
    zeus: { reset: (B) => resetZeus(B), update: (B, a, dt) => updateZeus(B, a, dt), start: (B) => genPhase(B, 0) },
    rumeur: { reset: (B) => resetRumeur(B), update: (B, a, dt) => updateRumeur(B, a, dt), start: (B) => genPhase(B, 0) },
  };
  function bossOps(B) { return BOSS[B.kind] || BOSS.gardien; }
  function clearHazards() { R.hazards.forEach((h) => { R.group.remove(h.mesh); if (h.shadow) R.group.remove(h.shadow); }); R.hazards.length = 0; clearBfx(); }
  function genPhase(B, ph) {
    const T = WD().bossText, P = T.phases[ph];
    B.phase = ph; arenaMood(ph);
    if (ph > 0) {
      const last = ph === T.phases.length - 1;
      combatCine(last ? 'final' : 'phase', { title: P.name.toUpperCase(), sub: `Phase ${ph + 1}/${T.phases.length}` });
      if (last) setTimeout(() => combatEvent('final'), 2600);
    }
    bubble(B.sayX || R.AW / 2, B.sayY || 9.5, P.say, 3.2, T.color || '#ff9a2a', T.name);
    OT.Input.rumble(-1, 0.9, 0.9, 500); OT.Sound.boom(); shake = 0.5;
    clearHazards();
    bossOps(B).reset(B);
    if (ph > 0 && !B.told[ph] && P.tell) {
      B.told[ph] = true;
      state = 'dialog';
      OT.UI.dialog(P.tell, () => { if (state === 'dialog') state = 'play'; });
    }
  }
  function genBar(B, n, of, help) {
    const T = WD().bossText, P = T.phases[B.phase];
    OT.UI.bossBar({ name: T.name, phase: B.phase + 1, of: T.phases.length, label: `${P.name} · ${n}/${of}`, help: help || P.help, sub: n / of });
  }
  function genOutro(B, text, color) {
    clearHazards();
    combatCine('victoire', { sub: WD().bossText.name });
    setTimeout(() => combatEvent('relief'), 1900);
    OT.Sound.boom(); OT.Input.rumble(-1, 1, 1, 600); shake = 0.6;
    bubble(B.sayX || R.AW / 2, (B.sayY || 9.5) - 1, text, 4, color || '#3cff9a', WD().bossText.name);
    OT.UI.bossBar(null);
    B.outro = 0.01;
  }
  // version 1.3 : on entre dans l'arène depuis l'antichambre → le combat commence (comme avant)
  function bossBegin() {
    R.bossWait = false;
    camMode('fit');
    if (OT.Cam) OT.Cam.cine({ zoom: 1.3, yaw: -0.32, pitch: 0.28, dur: 2.2 });
    updateCamera(0, true);
    bossOps(R.boss).start(R.boss);
    R.boss.told[0] = true;
    // version 1.5 : présentation du boss (nom en grand, bandes noires), puis sa première réplique
    combatEvent('debut'); combatCine('intro', { title: (WD().bossText.name || 'Le Gardien de la Forge').toUpperCase(), sub: R.def.title || '' });
    const intro = (R.def.intro || []).concat(WD().bossText.phases[0].tell || []);
    if (intro.length) { state = 'dialog'; OT.UI.dialog(intro, () => { if (state === 'dialog') state = 'play'; setTimeout(() => combatEvent('intro'), 600); }); }
    else setTimeout(() => combatEvent('intro'), 1500);
    // (l'objectif s'affiche APRÈS la carte de présentation du boss, pour ne pas la recouvrir)
    { const R0 = R; setTimeout(() => { if (R === R0) OT.UI.goal(R.def.goal || 'Bats le boss.'); }, OT.Game._testing ? 0 : 2300); }
    if (OT.Music) OT.Music.play('boss' + worldId);
  }
  // version 1.3 : le boss est vaincu. S'il y a une fuite, l'arène s'effondre et on court vers la sortie.
  function bossDone() {
    const esc = R.def.build && R.def.build.escape;
    if (!esc) { players.forEach((p) => (p.finished = true)); finishLevel(-1); return; }
    if (R.escape) return;
    R.escape = true;
    players.forEach((p) => { p.alive = true; p.deadT = 0; p.dying = 0; p.inv = 0; if (p.anim) p.anim.expr('determined', 3); });
    gateTeleport(players, { to: esc.to, zoneN: esc.zoneN || 2, zoneName: esc.zoneName, zoneGoal: esc.goal || esc.zoneGoal });
    clearHazards(); OT.UI.bossBar(null); arenaMood(3);
    camMode('level'); R.camZf = null; updateCamera(0, true);
    R.camPull = 1.4; shake = 0.5;
    OT.Sound.boom(); OT.Input.rumble(-1, 0.8, 0.8, 500);
    const R0 = R;
    setTimeout(() => { if (R === R0 && R.escape) bubble(players[0].x + 1.5, players[0].y + 2.6, esc.say || 'Tout s\'effondre ! COURS vers la sortie !', 2.6, '#ffd23f'); }, 1500);
    // version 1.4 : quelqu'un crie dans la fuite (Isaïe, Tony, Ange, NEXA, Zeus…), sinon le héros
    const es = R.def.escapeStory;
    if (OT.Dialogue) {
      if (es && es.length) { const next = (k) => { if (k >= es.length || R !== R0) return; OT.Dialogue.say(es[k][0], es[k][1], { priority: 3, onEnd: () => setTimeout(() => next(k + 1), 200) }); }; setTimeout(() => next(0), 2300); }
      else setTimeout(() => { if (R === R0) heroBark('boss_win', null, { force: true }); }, 2300);
    }
  }
  function outroTick(B, dt) {
    B.outro += dt;
    if (B.outro > 4.2 && !R.done) bossDone();
  }
  // projectiles : 'drop' tombe du plafond (ombre rouge), 'orb' va tout droit, 'ball' rebondit, 'sweep' file au ras du sol
  function addHazard(h, color, size) {
    const g = h.type === 'ball' ? new THREE.SphereGeometry(size || 0.35, 14, 10) : h.type === 'sweep' ? new THREE.BoxGeometry(0.5, 0.55, 1.6) : h.type === 'orb' ? new THREE.SphereGeometry(size || 0.28, 12, 10) : new THREE.BoxGeometry(0.7, 0.7, 0.7);
    h.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    if (h.type === 'orb') { const q = M.label('?', { size: 40, h: 0.42, color: '#ffffff', bg: 'none' }); q.position.z = 0.3; h.mesh.add(q); }
    if (h.type === 'drop') {
      h.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.6 }));
      h.shadow.rotation.x = -Math.PI / 2; h.shadow.position.set(h.x, groundBelow(h.x, 11) + 0.03, 0.3);
      R.group.add(h.shadow);
    }
    h.mesh.position.set(h.x, h.y, 0); h.t = 0;
    R.group.add(h.mesh); R.hazards.push(h);
    return h;
  }
  function updateHazards(alive, dt) {
    for (const h of R.hazards) {
      h.t += dt;
      if (h.type === 'drop') {
        if (h.t > 0.8) { h.vy = (h.vy || 0) - 40 * dt; h.y += h.vy * dt; }
        h.shadow.visible = h.t < 0.8 || h.y > 2;
        if (tileSolid(Math.floor(h.x), Math.floor(h.y - 0.4)) || h.y < -2) { h.dead = true; particles.burst(h.x, h.y, 10, [0xffffff, 0x9c8f80], 5, { up: 2 }); OT.Sound.slam(); OT.Input.rumble(-1, 0.3, 0.1, 80); }
        if (h.t <= 0.8) continue;
      } else if (h.type === 'orb') {
        h.x += h.vx * dt; h.y += h.vy * dt; if (h.t > 7) h.dead = true;
      } else if (h.type === 'ball') {
        h.vy -= 22 * dt; h.x += h.vx * dt; h.y += h.vy * dt;
        if (h.vy < 0 && tileSolid(Math.floor(h.x), Math.floor(h.y - h.r))) {
          h.y = Math.floor(h.y - h.r) + 1 + h.r;
          if (h.roll) { if (h.vy < -3) OT.Sound.land(); h.vy = -h.vy * 0.25; if (h.vy < 1.2) h.vy = 0; h.vx = h.roll; }   // balle qui roule : presque pas de rebond
          else { h.vy = Math.max(7, -h.vy * 0.82); OT.Sound.land(); }
        }
        if (tileSolid(Math.floor(h.x + Math.sign(h.vx) * h.r), Math.floor(h.y))) {
          if (h.roll) { h.dead = true; particles.burst(h.x, h.y, 8, [0xffffff, 0xffd23a], 4, { up: 1 }); }
          else h.vx = -h.vx;
        }
        h.mesh.rotation.z -= h.vx * dt * 2;
        if (h.t > 6 || h.y < -2) h.dead = true;
      } else if (h.type === 'sweep') {
        h.x += h.vx * dt; if (h.x < 0.5 || h.x > R.AW - 0.5) h.dead = true;
        h.mesh.scale.y = 1 + Math.sin(h.t * 20) * 0.15;
      }
      h.mesh.position.set(h.x, h.y, 0);
      // 1.5 : une ILLUSION (transparente, elle clignote) ne fait aucun mal
      if (h.fake) { h.mesh.visible = Math.sin(time * 22 + h.t * 5) > -0.45; continue; }
      const r = h.r || 0.3;
      const zone = h.type === 'sweep' ? { x0: h.x - 0.25, y0: h.y - 0.28, x1: h.x + 0.25, y1: h.y + 0.28 } : { x0: h.x - r, y0: h.y - r, x1: h.x + r, y1: h.y + r };
      for (const p of alive) if (overlap(pbox(p), zone)) kill(p, h.type === 'orb' ? 'zap' : 'crush');
    }
    for (let i = R.hazards.length - 1; i >= 0; i--) if (R.hazards[i].dead) { const h = R.hazards[i]; R.group.remove(h.mesh); if (h.shadow) R.group.remove(h.shadow); R.hazards.splice(i, 1); }
  }
  const nearestPlayer = (alive, x) => alive.reduce((a, p) => (!a || Math.abs(p.x - x) < Math.abs(a.x - x) ? p : a), null);
  const randomPlayer = (alive) => alive[Math.floor(Math.random() * alive.length)];
  function disposeLabel(m) { if (!m) return; if (m.parent) m.parent.remove(m); if (m.material) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); } if (m.geometry) m.geometry.dispose(); }
  function fitLabel(text, maxW, opt) { const l = M.label(text, opt); const w = l.geometry.parameters.width; if (w > maxW) l.scale.setScalar(maxW / w); return l; }

  /* ==================================================================
     BOSS DU MONDE 3 : la Machine de l'Examen
     On répond aux questions en se plaçant sur la bonne case (A, B, C, D).
     ================================================================== */
  const PADS = [5, 11, 17, 23];   // x de gauche des 4 cases de réponse (2 cases de large)
  function makeExam(group) {
    const MAT = M.MAT;
    const g = new THREE.Group();
    const body = new THREE.Mesh(M.slabGeo(5, 7, 2.4), [MAT.labPlate, MAT.labTop]); body.position.set(-2.5, 1, 0);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.2), new THREE.MeshBasicMaterial({ color: 0x0b2a30, toneMapped: false }));
    screen.position.set(0, 5.2, 1.25);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshStandardMaterial({ color: 0x9fffe8, emissive: 0x3cffd8, emissiveIntensity: 2 }));
    eye.position.set(0, 7.2, 0.9);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4), MAT.steel); antenna.position.set(0, 8.4, 0);
    g.add(body, screen, eye, antenna);
    g.position.set(32, 0, -0.2);
    group.add(g);
    // les 4 cases
    const pads = PADS.map((x, k) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1.6), new THREE.MeshStandardMaterial({ color: 0x2a5a60, emissive: 0x1a8a80, emissiveIntensity: 0.5 }));
      m.position.set(x + 1, 1.05, 0);
      const letter = M.label('ABCD'[k], { size: 46, h: 0.5, color: '#0b2a30', bg: '#9fffe8' });
      letter.position.set(x + 1, 1.45, 0.9);
      group.add(m, letter);
      return { x, mesh: m, letter, label: null, hold: 0, ans: '', ok: false };
    });
    const B = {
      kind: 'exam', g, eye, screen, pads, box: { x0: 29.4, y0: 1, x1: 35, y1: 8.6 },
      phase: 0, qi: 0, wait: 0, timer: 0, qLabel: null, told: [], outro: 0, dropT: 1.4, sweepT: 3, sayX: 17.5, sayY: 10.2,
      // 1.5 : sol électrique (séquence), bras mécanique, analyse, disjoncteur
      elecT: 2.0, elecI: 0, slamT: 3.5, lastSide: 1, breakT: 0, breakCool: 0,
    };
    // 1.5 : LE DISJONCTEUR, tout à gauche (contre le mur) : le toucher coupe ses défenses 5 s (puis il se recharge)
    const bk = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.5), MAT.steel); box.position.y = 0.55;
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x553300 }));
    lever.position.set(0.15, 1.05, 0.3);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0x3cff9a, toneMapped: false }));
    lamp.position.set(0, 1.25, 0.3);
    const lab = M.label('DISJONCTEUR', { size: 22, h: 0.24, color: '#ffd23f', bg: 'rgba(20,20,20,0.85)' }); lab.position.set(0.4, 1.75, 0.5);
    bk.add(box, lever, lamp, lab); bk.position.set(1.35, 1, 0.2); bk.visible = false; group.add(bk);
    B.breaker = { g: bk, lever, lamp };
    return B;
  }
  function examQuestion(B) {
    const P = WD().bossText.phases[B.phase];
    const Q = P.questions[B.qi];
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    disposeLabel(B.qLabel);
    B.qLabel = fitLabel(Q.q, 26, { size: 34, h: 0.62, color: '#e9fffb', bg: 'rgba(8,30,34,0.92)', border: '#3cffd8' });
    B.qLabel.position.set(17.5, 9.4, 1.5);
    R.group.add(B.qLabel);
    B.pads.forEach((pd, k) => {
      pd.ans = Q.a[order[k]]; pd.ok = order[k] === 0; pd.hold = 0;
      disposeLabel(pd.label);
      pd.label = fitLabel(pd.ans, 4.2, { size: 30, h: 0.42, color: '#ffffff', bg: 'rgba(8,30,34,0.9)', border: '#9fffe8' });
      pd.label.position.set(pd.x + 1, 3.0, 0.9);
      R.group.add(pd.label);
      pd.mesh.material.color.set(0x2a5a60); pd.mesh.material.emissive.set(0x1a8a80);
    });
    B.timer = ez(15);
    B.slamQ = false; B.slamT = 2.2 + Math.random() * 2;   // 1.5 : un coup de bras par question
    genBar(B, B.qi, 3, `${Q.q} — Place-toi sur la bonne case (A, B, C ou D) et reste dessus.`);
  }
  function resetExam(B) {
    B.qi = 0; B.wait = 0.6; B.nextQ = 0; B.dropT = 1.4; B.sweepT = 3;
    B.elecT = 2.0; B.elecI = 0; B.slamT = 3.5; B.breakT = 0; B.breakCool = 0;
    if (B.breaker) B.breaker.g.visible = B.phase >= 1;
    examQuestion(B);
  }
  // 1.5 : les zones du sol ENTRE les cases (les cases elles-mêmes ne sont jamais électrifiées)
  // (bandes de 1,6 case sous les petites plateformes : à côté de chaque case, une place SÛRE pour attendre
  //  sans être sur une case — attendre sur une mauvaise case, ce serait répondre faux)
  const EXAM_GAPS = [[8.2, 9.8], [14.2, 15.8], [20.2, 21.8], [26.2, 27.8]];
  // les attaques annoncées de la Machine (appelées à chaque image, sauf pendant la coupure du disjoncteur)
  function examAttacks(B, alive, dt) {
    const last = B.phase === 2 && B.qi === 2;
    // SOL ÉLECTRIQUE : une zone entre deux cases clignote 1 s (bleu), puis s'électrise 1,1 s — à tour de rôle
    B.elecT -= dt;
    if (B.elecT <= 0) {
      B.elecT = B.phase === 0 ? 1.8 : last ? 1.6 : 2.5;
      const gp = EXAM_GAPS[B.elecI % EXAM_GAPS.length]; B.elecI++;
      fxStrip(gp[0], gp[1], { kind: 'elec', warn: 1.0, act: 1.1 });
      combatEvent('nouveau:elec');
    }
    // BRAS D'ÉVALUATION (phases 2 et 3) : il « corrige » en frappant une MAUVAISE case (marque rouge 1 s avant),
    // la plus proche d'un joueur ; le bras reste planté 1,2 s sur la case. Une fois par question.
    // (il ne frappe jamais entre les cases : on n'est jamais obligé d'attendre sur une mauvaise case)
    if (B.phase >= 1 && alive.length && !B.slamQ) {
      B.slamT -= dt;
      if (B.slamT <= 0) {
        const tg = randomPlayer(alive);
        const wrong = B.pads.filter((q) => !q.ok).sort((a, b) => Math.abs(a.x + 1 - tg.x) - Math.abs(b.x + 1 - tg.x))[0];
        if (wrong) {
          B.slamQ = true;
          fxSlam(wrong.x + 1, 1.8, { warn: 1.0, stay: 1.2, ground: 1, onImpact: () => { wrong.mesh.material.color.set(0x55302a); wrong.mesh.material.emissive.set(0x220000); } });
          combatEvent('nouveau:slam');
        }
      }
    }
    // ANALYSE (phase 3) : les rayons arrivent du côté où tu as répondu la dernière fois (ligne rouge 0,9 s avant)
    if (B.phase >= 2) {
      B.sweepT -= dt;
      if (B.sweepT <= 0) {
        B.sweepT = 3.4;
        const fromLeft = B.lastSide < 0;
        fxLance(fromLeft ? 1.3 : 28.8, 1.32, fromLeft ? 8.5 : -8.5, { warn: 0.9, w: 0.5, h: 0.56, lane: true, cause: 'zap', mat: bfxMats().col });
        combatEvent('nouveau:analyse');
      }
    }
  }
  function updateExam(B, alive, dt) {
    B.eye.material.emissiveIntensity = 2 + Math.sin(time * 4) * 0.6;
    if (B.outro > 0) { B.g.position.y = -Math.min(1.5, B.outro * 0.6); B.eye.material.emissiveIntensity = 0.2; outroTick(B, dt); return; }
    updateHazards(alive, dt);
    if (B.qLabel) B.qLabel.position.y = 9.4 + Math.sin(time * 2) * 0.05;
    B.wait = Math.max(0, B.wait - dt);
    if (B.nextQ > 0) { B.nextQ -= dt; if (B.nextQ <= 0) examQuestion(B); }
    // 1.5 : LE DISJONCTEUR (phases 2 et 3) — on le touche → défenses coupées 5 s, puis 14 s de recharge
    const bk = B.breaker;
    B.breakT = Math.max(0, B.breakT - dt); B.breakCool = Math.max(0, B.breakCool - dt);
    if (bk && bk.g.visible) {
      bk.lamp.material.color.set(B.breakT > 0 ? 0xffd23f : B.breakCool > 0 ? 0xff3020 : 0x3cff9a);
      bk.lever.rotation.z = B.breakT > 0 ? -0.7 : 0.4;
      if (B.breakCool <= 0 && alive.some((p) => p.x < 1.7 && p.y < 2.2)) {
        B.breakT = 5; B.breakCool = 19;
        clearBfx();
        R.hazards.forEach((h) => { R.group.remove(h.mesh); if (h.shadow) R.group.remove(h.shadow); }); R.hazards.length = 0;
        OT.Sound.click(); OT.Sound.zap(); OT.Input.rumble(-1, 0.3, 0.6, 200);
        particles.burst(1.4, 2.2, 16, [0xffd23f, 0xffffff], 4);
        bubble(4, 5, 'DÉFENSES COUPÉES (5 s) !', 2.2, '#ffd23f');
        combatEvent('breaker');
      }
    }
    // dangers selon la phase (rien pendant la coupure du disjoncteur)
    if (B.breakT <= 0) {
      if (B.phase >= 1) { B.dropT -= dt; if (B.dropT <= 0) { B.dropT = B.phase === 1 ? 1.5 : 2.0; const tg = randomPlayer(alive); addHazard({ type: 'drop', x: tg && Math.random() < 0.5 ? Math.max(1.6, Math.min(28.4, tg.x)) : 1.6 + Math.random() * 26.8, y: 11, r: 0.35 }, 0x3cff9a); } }
      examAttacks(B, alive, dt);
    }
    if (B.wait > 0) return;
    // le temps passe
    B.timer -= dt;
    const T = WD().bossText, Q = T.phases[B.phase].questions[B.qi];
    if (Math.floor(B.timer) !== Math.floor(B.timer + dt) && B.timer < 5 && B.timer > 0) { OT.Sound.click(); for (const p of alive) OT.Input.rumble(p.i, 0, 0.2, 50); }
    OT.UI.bossBar({ name: T.name, phase: B.phase + 1, of: 3, label: `${T.phases[B.phase].name} · ${B.qi}/3 · ${Math.max(0, B.timer).toFixed(0)} s`, help: `${Q.q} — Place-toi sur la bonne case et reste dessus.`, sub: B.qi / 3 });
    if (B.timer <= 0) { bubble(17.5, 8, 'Temps écoulé !', 2, '#ff5533', T.name); for (const p of alive) { OT.Sound.zap(); kill(p, 'zap'); } return; }
    // réponses
    for (const pd of B.pads) {
      const zone = { x0: pd.x + 0.1, y0: 0.95, x1: pd.x + 1.9, y1: 1.4 };
      const on = alive.filter((p) => overlap(pbox(p), zone) && p.onGround);
      if (!on.length) { pd.hold = 0; continue; }
      // 1.5 : on répond en S'ARRÊTANT sur la case (traverser une case en courant ne compte plus comme une réponse)
      if (!on.some((p) => Math.abs(p.vx) < 3.5)) { pd.hold = Math.max(0, pd.hold - dt); continue; }
      pd.hold += dt;
      pd.mesh.material.emissive.set(0x3cffd8);
      if (pd.hold < 0.35) continue;
      if (!pd.ok) {
        pd.mesh.material.color.set(0xff3020); pd.mesh.material.emissive.set(0xff3020);
        bubble(pd.x + 1, 4, `Mauvaise réponse ! C'était : ${Q.a[0]}`, 2.6, '#ff5533');
        on.forEach((p) => { OT.Sound.zap(); particles.burst(p.x, p.y + 0.4, 16, [0x7fd0ff, 0xffffff], 8, { grav: 0 }); kill(p, 'zap'); });
        return;
      }
      // bonne réponse
      pd.mesh.material.color.set(0x3cff9a); pd.mesh.material.emissive.set(0x3cff9a);
      OT.Sound.ok(); OT.Input.rumble(-1, 0.5, 0.8, 250); shake = 0.25;
      particles.burst(31, 5.5, 26, [0x3cffd8, 0xffffff, 0xffd28a], 8, { up: 2 });
      bubble(pd.x + 1, 4, 'Bonne réponse !', 1.6, '#3cff9a');
      B.qi++;
      B.lastSide = pd.x < 14 ? -1 : 1;   // 1.5 : la Machine retient le côté de ta réponse (son « analyse »)
      combatCine('critique');
      if (B.phase === T.phases.length - 1 && B.qi === 2) { combatEvent('near'); setTimeout(() => { if (R && R.boss === B && B.outro <= 0) { combatCine('special', { title: 'ÉPREUVE PRATIQUE', sub: 'Dernière question' }); combatEvent('special'); } }, 1500); }
      else if (B.qi < 3) combatEvent('hurt');
      if (B.qi >= 3) {
        if (B.phase + 1 < T.phases.length) { genPhase(B, B.phase + 1); return; }
        B.pads.forEach((q) => disposeLabel(q.label)); disposeLabel(B.qLabel); B.qLabel = null;
        genOutro(B, T.end, '#3cffd8');
        return;
      }
      B.wait = 1.0; B.nextQ = 0.6;
      return;
    }
  }

  /* ==================================================================
     BOSS DU MONDE 4 : Zeus (le défi entre frères)
     Phase 1 : lui sauter sur la tête 3 fois · Phase 2 : attraper 3 ampoules (idées)
     pendant qu'il lance des balles · Phase 3 : il fonce, encore 3 fois sur la tête.
     ================================================================== */
  function makeZeus(group) {
    const ch = OT.CHARACTERS.zeus || { name: 'Zeus', color: 0xf2c230, hat: 0x3a2a00, hatType: 'band' };
    const m = M.person(ch);
    m.scale.setScalar(1.35);
    group.add(m);
    const bulbs = [[9, 6.6], [11.5, 8.6], [23.5, 8.6]].map(([x, y]) => {
      const g2 = new THREE.Group();
      const glass = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffd23a, emissiveIntensity: 1.6 }));
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.2, 10), M.MAT.steel); base.position.y = -0.3;
      g2.add(glass, base); g2.position.set(x, y, 0.3); g2.visible = false;
      group.add(g2);
      return { x, y, mesh: g2, taken: false };
    });
    const B = {
      kind: 'zeus', mesh: m, x: 22, y: 1, vy: 0, dir: -1, h: 2.1, hits: 0, phase: 0, stun: 0, jumpT: 2, state: 'walk', stateT: 0,
      bulbs, throwT: 1.6, told: [], outro: 0, sayX: 17.5, sayY: 10,
      // 1.5 : série d'éclairs + fatigue (phase 1), tempête (phase 2), lance / onde / téléportation (phase 3)
      castT: 4.5, boltN: 0, stormT: 3, stormQ: [], lanceT: 3.5, tpT: 7, tpX: 0, air: false,
    };
    B.markHit = makeMarker(group, 'SAUTE-LUI SUR LA TÊTE', '#f2c230', '#2a1a00');
    return B;
  }
  function resetZeus(B) {
    B.hits = 0; B.stun = 0; B.state = B.phase === 1 ? 'throne' : 'walk'; B.stateT = 0;
    B.x = B.phase === 1 ? 17.5 : 22; B.y = B.phase === 1 ? 7 : 1; B.vy = 0; B.jumpT = 2; B.throwT = 1.6;
    B.bulbs.forEach((b) => { b.taken = false; b.mesh.visible = B.phase === 1; });
    B.castT = 4.5; B.boltN = 0; B.stormT = 3; B.stormQ = []; B.lanceT = 3.5; B.tpT = 7; B.air = false;
    genBar(B, 0, 3);
  }
  // 1.5 : les plateformes de l'arène de Zeus [x0, x1, dessus] (la tempête les frappe l'une après l'autre)
  const ZEUS_PLATS = [[3, 7, 3], [8, 11, 5], [11, 13, 7], [23, 25, 7], [25, 28, 5], [29, 33, 3]];
  function zeusStrike(k) {
    const P = ZEUS_PLATS[k];
    fxBolt((P[0] + P[1]) / 2, { r: (P[1] - P[0]) / 2 + 0.05, warn: 1.1, ground: P[2] });
  }
  function updateZeus(B, alive, dt) {
    const T = WD().bossText;
    const ud = B.mesh.userData;
    if (B.outro > 0) { B.mesh.rotation.y = Math.sin(time * 2) * 0.3; outroTick(B, dt); B.mesh.position.set(B.x, B.y, -0.2); return; }
    updateHazards(alive, dt);
    B.stun = Math.max(0, B.stun - dt);
    B.markHit.visible = false;
    const bob = Math.sin(time * 5) * 0.12;
    if (B.phase === 1) {
      // sur son trône, il lance des « idées folles » (balles qui rebondissent)
      B.x = 17.5; B.y = 7;
      B.throwT -= dt;
      if (B.throwT <= 0 && alive.length) {
        B.throwT = ez(2.4);
        // il laisse tomber ses « idées folles » du bord de son trône : elles roulent au sol
        // (on les saute ; sur les corniches et les blocs, on est à l'abri)
        const tg = nearestPlayer(alive, B.x);
        let side = tg && Math.random() < 0.7 ? (tg.x < B.x ? -1 : 1) : (Math.random() < 0.5 ? -1 : 1);
        // jamais sur la tête de quelqu'un qui est déjà en hauteur juste à côté du trône
        const busy = (s) => alive.some((p) => Math.abs(p.x - (B.x + s * 4.1)) < 1.3 && p.y > 4.5);
        if (busy(side)) side = -side;
        if (busy(side)) B.throwT = 0.5;
        else addHazard({ type: 'ball', x: B.x + side * 4.1, y: B.y + 0.6, vx: side * 0.3, vy: 0, r: 0.32, roll: side * (2.6 + Math.random() * 1.2) }, [0xff7ad1, 0x5ad1ff, 0xffd23a][Math.floor(Math.random() * 3)]);
        OT.Sound.whoosh();
      }
      // 1.5 : LA TEMPÊTE — la plateforme d'un joueur crépite 1,1 s (cercle jaune), puis la foudre la frappe ;
      // une seconde plus tard, c'est la plateforme voisine. On change de plateforme (ou on descend).
      B.stormT -= dt;
      if (B.stormT <= 0 && alive.length) {
        B.stormT = 4.6;
        let k = -1;
        for (const p of alive) ZEUS_PLATS.forEach((P, i) => { if (k < 0 && p.onGround && Math.abs(p.y - P[2]) < 0.2 && p.x > P[0] - 0.3 && p.x < P[1] + 0.3) k = i; });
        if (k < 0) k = Math.floor(Math.random() * ZEUS_PLATS.length);
        zeusStrike(k);
        const nb = k <= 2 ? k + 1 : k - 1;   // la voisine (vers le centre)
        B.stormQ.push({ t: 1.0, k: nb });
        combatEvent('nouveau:storm');
      }
      for (const q of B.stormQ) { q.t -= dt; if (q.t <= 0 && !q.done) { q.done = true; zeusStrike(q.k); } }
      B.stormQ = B.stormQ.filter((q) => !q.done);
      for (const b of B.bulbs) {
        if (b.taken) continue;
        b.mesh.position.y = b.y + bob * 0.4;
        for (const p of alive) if (touches(p, b.x, b.y, 0.65, 0.5)) {
          b.taken = true; b.mesh.visible = false;
          OT.Sound.part(); OT.Input.rumble(-1, 0.3, 0.6, 200);
          particles.burst(b.x, b.y, 20, [0xffd23a, 0xffffff], 6);
          const n = B.bulbs.filter((q) => q.taken).length;
          bubble(b.x, b.y + 1.4, ['Une idée !', 'Deux idées !', 'Trois idées : on y va !'][n - 1], 2, '#ffd23a');
          genBar(B, n, 3);
          if (n >= 3) { genPhase(B, 2); return; }
          break;
        }
      }
    } else {
      // il marche vers le joueur et saute ; en phase 3 il fonce
      const tg = nearestPlayer(alive, B.x);
      const fast = B.phase === 2;
      if (B.stun > 0) { B.state = 'walk'; }
      else if (B.state === 'walk') {
        if (tg) B.dir = tg.x > B.x ? 1 : -1;
        B.x += B.dir * (fast ? 3.2 : 2.6) * (1 + B.hits * 0.15) * dt;
        B.jumpT -= dt;
        if (fast && B.jumpT <= 0 && B.y <= 1.001) { B.vy = 10; B.jumpT = 1.8 + Math.random() * 1.2; }   // il ne saute qu'au dernier round
        if (fast && B.y <= 1.001 && Math.random() < dt * 0.5) { B.state = 'aim'; B.stateT = 0.7; }
        // 1.5 — phase 1 : SÉRIE DE TROIS ÉCLAIRS (cercles crépitants au sol), puis il est FATIGUÉ
        if (B.phase === 0 && B.y <= 1.001) {
          B.castT -= dt;
          if (B.castT <= 0) { B.state = 'cast'; B.stateT = 0; B.boltN = 0; combatEvent('nouveau:bolt'); OT.Sound.zap(); }
        }
        // 1.5 — phase 3 : LANCE DE FOUDRE (sa main brille 0,7 s) et TÉLÉPORTATION (petit éclair violet au sol avant)
        if (fast && B.state === 'walk' && B.y <= 1.001) {
          B.lanceT -= dt; B.tpT -= dt;
          if (B.lanceT <= 0 && tg) {
            B.lanceT = 4.2; B.state = 'charge'; B.stateT = 0.7; B.dir = tg.x > B.x ? 1 : -1;
            fxLance(B.x + B.dir * 0.9, 1.35, B.dir * 9, { warn: 0.7, w: 1.0, h: 0.5, cause: 'zap' });
            combatEvent('nouveau:lance');
          } else if (B.tpT <= 0) {
            B.tpT = 7 + Math.random() * 2;
            const far = [];
            for (let x = 11.5; x <= 23.5; x += 1) if (alive.every((p) => Math.abs(p.x - x) > 4)) far.push(x);
            if (far.length) {
              B.tpX = far[Math.floor(Math.random() * far.length)];
              fxBolt(B.tpX, { harmless: true, warn: 0.9, r: 0.5, ground: 1 });
              B.state = 'tp'; B.stateT = 0.9; combatEvent('nouveau:tp');
            }
          }
        }
      } else if (B.state === 'cast') {
        // il lève la main : trois éclairs l'un après l'autre, là où est le joueur le plus proche à ce moment-là
        B.stateT += dt;
        if (Math.random() < 0.5) particles.burst(B.x + 0.4, B.y + B.h + 0.8, 1, [0xfff2a0, 0x7fe6ff], 2, { grav: 0, life: 0.3 });
        const at = [0.3, 0.85, 1.4];
        if (B.boltN < 3 && B.stateT >= at[B.boltN] && tg) { B.boltN++; fxBolt(Math.max(1.5, Math.min(33.5, tg.x)), { warn: 0.9, r: 0.65, ground: groundBelow(tg.x, tg.y + 0.5) }); }
        if (B.stateT >= 2.3) {
          B.state = 'tired'; B.stateT = 2.4;
          combatEvent('weak'); bubble(B.x, B.y + B.h + 1.6, 'Pff… pff…', 1.6, '#f2c230', 'Zeus');
        }
      } else if (B.state === 'tired') {
        // FATIGUÉ : il ne bouge plus, son corps ne fait aucun mal — c'est le moment de lui sauter sur la tête
        B.stateT -= dt;
        if (Math.random() < 0.08) particles.burst(B.x + (Math.random() - 0.5) * 0.6, B.y + B.h + 0.3, 1, 0x9fe7ff, 1, { life: 0.5 });
        if (B.stateT <= 0) { B.state = 'walk'; B.castT = 5.5; }
      } else if (B.state === 'charge') {
        B.stateT -= dt;
        if (Math.random() < 0.6) particles.burst(B.x + B.dir * 0.7, B.y + 1.1, 1, [0xfff2a0, 0xffffff], 2, { grav: 0, life: 0.25 });
        if (B.stateT <= 0) B.state = 'walk';
      } else if (B.state === 'tp') {
        B.stateT -= dt;
        B.mesh.visible = Math.sin(time * 40) > -0.3;
        if (B.stateT <= 0) {
          particles.burst(B.x, B.y + 1, 14, [0xfff2a0, 0xb78cff], 5);
          B.x = B.tpX; B.mesh.visible = true; B.state = 'walk';
          particles.burst(B.x, B.y + 1, 18, [0xfff2a0, 0xb78cff], 6); OT.Sound.zap();
        }
      } else if (B.state === 'aim') {
        B.stateT -= dt; B.mesh.position.x = B.x + Math.sin(time * 60) * 0.06;
        if (B.stateT <= 0) { B.state = 'dash'; B.stateT = 1.1; OT.Sound.whoosh(); if (tg) B.dir = tg.x > B.x ? 1 : -1; }
      } else if (B.state === 'dash') {
        B.stateT -= dt; B.x += B.dir * 10.5 * dt;
        if (B.stateT <= 0) B.state = 'walk';
      }
      B.vy -= 30 * dt; B.y = Math.max(1, B.y + B.vy * dt); if (B.y <= 1) B.vy = 0;
      B.x = Math.max(11.5, Math.min(23.5, B.x));   // il reste entre les deux corniches
      // 1.5 — phase 3 : quand il RETOMBE d'un saut, une onde part des deux côtés au ras du sol (on la saute)
      if (fast) {
        if (B.air && B.y <= 1.001) {
          fxLance(B.x - 0.8, 1.3, -7, { warn: 0.3, w: 0.5, h: 0.5, cause: 'zap', mat: bfxMats().elec });
          fxLance(B.x + 0.8, 1.3, 7, { warn: 0.3, w: 0.5, h: 0.5, cause: 'zap', mat: bfxMats().elec });
          shake = Math.max(shake, 0.2); OT.Sound.slam();
        }
        B.air = B.y > 1.001;
      }
      if (B.stun <= 0 && B.state !== 'tp') { B.markHit.visible = true; B.markHit.position.set(B.x, B.y + B.h + 1.1 + bob, 1); }
      // contact : sur la tête = coup ; sur le corps = chute
      const top = B.y + B.h;
      for (const p of alive) {
        const dx = Math.abs(p.x - B.x);
        if (B.stun <= 0 && p.vy < 0 && dx < 1.0 && p.y <= top + 0.4 && p.y >= top - 0.9) {
          B.hits++; B.stun = 1.3;
          p.vy = 12.5; p.y = top + 0.05; p.cut = true;
          OT.Sound.hit(); OT.Input.rumble(-1, 0.8, 0.8, 260); shake = 0.3;
          particles.burst(B.x, top, 22, [0xf2c230, 0xffffff], 7, { up: 2 });
          bubble(B.x, top + 1.6, ['Aïe ! Pas mal.', 'Encore ?!', 'D\'accord, d\'accord !'][Math.min(2, B.hits - 1)], 1.8, '#f2c230', 'Zeus');
          genBar(B, B.hits, 3);
          combatCine('critique');
          if (B.hits < 3) {
            combatEvent(B.phase === 2 && B.hits === 2 ? 'near' : 'hurt');
            if (B.phase === 2 && B.hits === 2) { B.lanceT = Math.min(B.lanceT, 1.2); combatCine('special', { title: 'LE POUVOIR ABSOLU', sub: 'Il donne tout' }); }
          }
          if (B.state === 'tired' || B.state === 'cast' || B.state === 'charge' || B.state === 'tp') { B.state = 'walk'; B.mesh.visible = true; B.castT = 4.5; }
          if (B.hits >= 3) {
            if (B.phase === 0) { genPhase(B, 1); return; }
            genOutro(B, T.end, '#f2c230');
            return;
          }
          break;
        }
        if (B.stun <= 0 && B.state !== 'tired' && dx < 0.6 && p.y < top - 0.7 && p.y + p.h > B.y + 0.1) { OT.Sound.slam(); kill(p, 'crush'); }
      }
    }
    // animation
    B.mesh.position.set(B.state === 'aim' ? B.mesh.position.x : B.x, B.y, -0.2);
    B.mesh.rotation.y = B.dir > 0 ? 0.5 : -0.5;
    if (ud.head) ud.head.rotation.z = B.stun > 0 ? Math.sin(time * 12) * 0.25 : 0;
  }

  /* ==================================================================
     BOSS FINAL (Monde 5, The Core) : La Rumeur
     Phase 1 « Les mensonges » : 4 portes, une seule vraie (elle bourdonne) — 3 fois
     Phase 2 « Le doute »      : le sol disparaît par endroits ; 3 vérités à ramasser
     Phase 3 « La vérité »     : 3 interrupteurs pour couper son bouclier, puis la toucher 2 fois
     ================================================================== */
  const DOOR_SPOTS = [[5.5, 3], [10.5, 5], [23.5, 5], [28.5, 3]];
  const TRUTH_SPOTS = [[6, 4.7], [17.5, 4.7], [29, 4.7]];
  const SWITCH_X = [3, 17, 32];
  function makeRumeurBoss(group) {
    const ch = OT.CHARACTERS.rumeur;
    const m = M.person(ch);
    m.scale.setScalar(2.0);
    group.add(m);
    const q = M.label('?', { bg: 'none', color: '#b78cff', size: 90, h: 1.1 });
    q.position.set(0, 2.2, 0.3); m.add(q);
    const shield = new THREE.Mesh(new THREE.SphereGeometry(1.9, 24, 16), new THREE.MeshStandardMaterial({ color: 0xb78cff, emissive: 0x6a2fd6, emissiveIntensity: 1, transparent: true, opacity: 0.35 }));
    group.add(shield);
    const doors = DOOR_SPOTS.map(([x, y]) => {
      const d = M.door('SORTIE'); d.position.set(x, y, -0.5); d.visible = false; group.add(d);
      return { x, y, mesh: d, portal: d.userData.portal, real: false, dead: false };
    });
    const truths = TRUTH_SPOTS.map(([x, y]) => {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.38), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9fe7ff, emissiveIntensity: 1.6 }));
      c.position.set(x, y, 0.3); c.visible = false; group.add(c);
      return { x, y, mesh: c, taken: false };
    });
    const switches = SWITCH_X.map((x) => {
      const sw = makeSwitch({ x, y: 1, fake: false }, group); sw.mesh.visible = false; sw.onT = 0; return sw;
    });
    const B = {
      kind: 'rumeur', mesh: m, shield, doors, truths, switches, x: 17.5, y: 8, phase: 0, hits: 0, orbT: 2, crackT: 1.5,
      shieldOff: 0, told: [], outro: 0, hurt: 0, sayX: 17.5, sayY: 12,
      // 1.5 : illusions, copies, « ? » des bords, pièges des mondes, confrontation finale
      edgeT: 3, medT: 3, medI: 0, salvo: 0, salvoT: 0, tired: 0, volley: 0,
    };
    B.markHit = makeMarker(group, 'TOUCHE-LA !', '#3cff9a', '#08200f');
    // l'OMBRE de la vraie Rumeur (ses copies n'en ont pas)
    B.shadowM = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
    B.shadowM.rotation.x = -Math.PI / 2; B.shadowM.scale.y = 0.6; group.add(B.shadowM);
    // deux COPIES transparentes (phase 2) : elles imitent ses gestes, leurs « ? » sont des illusions
    B.clones = [0, 1].map(() => {
      const c = M.person(ch); c.scale.setScalar(2.0);
      c.traverse((o) => { if (o.material) { o.material = Array.isArray(o.material) ? o.material.map((mm) => mm.clone()) : o.material.clone(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => { mm.transparent = true; mm.opacity = 0.38; mm.depthWrite = false; }); } });
      c.visible = false; group.add(c);
      return { m: c, x: 17.5, y: 8 };
    });
    return B;
  }
  // 1.5 : un « ? » lancé par la Rumeur (ou par une copie) vers un joueur. fake = illusion inoffensive.
  function rumeurOrb(sx, sy, tg, fake, spread) {
    const dx = tg.x - sx, dy = tg.y + 0.5 - sy, a = Math.atan2(dy, dx) + (spread || 0);
    const h = addHazard({ type: 'orb', x: sx, y: sy, vx: Math.cos(a) * 4.4, vy: Math.sin(a) * 4.4, r: 0.3, fake: !!fake }, fake ? 0xd6c2ff : 0x6a2fd6);
    if (fake) { h.mesh.material.transparent = true; h.mesh.material.opacity = 0.35; h.mesh.material.depthWrite = false; }
    return h;
  }
  // 1.5 : LES PIÈGES DES MONDES (phases 3 et 4) — chacun prévient, comme dans son monde d'origine
  function rumeurMedley(B, alive, kind) {
    const tg = randomPlayer(alive); if (!tg) return;
    const k = kind !== undefined ? kind : B.medI++ % 4, AW = R.AW || R.W;
    if (k === 0) {        // la Forge : une onde au ras du sol, depuis un bord (on la saute)
      const fromL = tg.x > AW / 2;
      fxLance(fromL ? 1.3 : AW - 1.3, 1.32, fromL ? 8 : -8, { warn: 0.9, w: 0.5, h: 0.56, lane: true, cause: 'crush', mat: bfxMats().fire });
    } else if (k === 1) { // le Code : une colonne rouge (on en sort)
      const cx = Math.max(2, Math.min(AW - 2, tg.x + (Math.random() * 2 - 1)));
      fxColumn(cx - 0.8, cx + 0.8, { warn: 1.1, act: 1.0 });
    } else if (k === 2) { // le Labo : le sol clignote, puis s'électrise (on s'écarte, ou on monte)
      const x0 = Math.max(1, Math.min(AW - 4, Math.round(tg.x) - 1.5));
      fxStrip(x0, x0 + 3, { kind: 'elec', warn: 1.0, act: 1.1, ground: 1 });
    } else {              // le Nexus : un cercle crépite, l'éclair tombe (on s'écarte)
      fxBolt(Math.max(1.5, Math.min(AW - 1.5, tg.x)), { warn: 0.9, r: 0.65, ground: groundBelow(tg.x, tg.y + 0.5) });
    }
    combatEvent('nouveau:medley');
  }
  function shuffleDoors(B) {
    B.doors.forEach((d) => { d.real = false; d.dead = false; d.mesh.visible = true; });
    B.doors[Math.floor(Math.random() * B.doors.length)].real = true;
  }
  function resetRumeur(B) {
    B.hits = 0; B.orbT = 2; B.crackT = 1.5; B.shieldOff = 0; B.hurt = 0;
    B.x = 17.5; B.y = 8;
    B.edgeT = 3; B.medT = 3; B.salvo = 0; B.salvoT = 1.5; B.tired = 0; B.volley = 0; B.salvoN = 0; B.zoneI = B.zoneI || 0;
    if (B.clones) B.clones.forEach((c) => (c.m.visible = false));
    B.doors.forEach((d) => (d.mesh.visible = false));
    B.truths.forEach((t) => { t.taken = false; t.mesh.visible = B.phase === 1; });
    B.switches.forEach((sw) => { sw.mesh.visible = B.phase === 2; sw.onT = 0; });
    if (B.phase === 0) shuffleDoors(B);
    // le sol revient
    for (let x = 0; x < R.W; x++) { const t = R.tiles[0][x]; if (t && t.ch === 'D') { t.state = 'idle'; t.t = 0; t.mesh.visible = true; t.mesh.position.set(x, 0, 0); t.mesh.material[0].color.set(0xffffff); } }
    genBar(B, 0, B.phase >= 2 ? 2 : 3);
  }
  function updateRumeur(B, alive, dt) {
    const T = WD().bossText;
    if (B.outro > 0) {
      if (B.shadowM) B.shadowM.visible = false;
      if (B.clones) B.clones.forEach((c) => (c.m.visible = false));
      B.mesh.scale.setScalar(Math.max(0.05, 2.0 - B.outro * 0.6));
      B.mesh.rotation.y += dt * 5; B.shield.visible = false;
      if (Math.random() < 0.5) particles.burst(B.x, B.y + 1.5, 2, [0xb78cff, 0x2a2a33], 3, { grav: -0.4, life: 0.8 });
      outroTick(B, dt); return;
    }
    updateHazards(alive, dt);
    B.hurt = Math.max(0, B.hurt - dt);
    B.markHit.visible = false;
    const bob = Math.sin(time * 2) * 0.25;
    // elle lance des « ? » (les rumeurs) vers un joueur
    // 1.5 : phase 1 → une vraie + une ILLUSION ; phase 2 → ses deux copies lancent des illusions ;
    //       phase 4 → seulement pendant ses salves ; jamais pendant qu'elle est épuisée
    B.orbT -= dt;
    if (B.orbT <= 0 && alive.length && B.tired <= 0 && !(B.phase === 2 && B.shieldOff > 0)) {
      B.orbT = B.phase >= 2 ? 2.6 : 2.1;
      const tg = randomPlayer(alive), sx = B.x, sy = B.y + 1.5;
      if (B.phase === 3) {
        // la confrontation : pendant ses salves, ses « ? » ne sont plus que des ILLUSIONS (le vrai danger, ce sont
        // les pièges des mondes, qui préviennent tous)
        if (B.salvo > 0) { rumeurOrb(sx, sy, tg, true, -0.3); rumeurOrb(sx, sy, tg, true, 0.3); OT.Sound.zap(); }
      } else {
        rumeurOrb(sx, sy, tg, false);
        B.volley++;
        if (B.phase === 0 && B.volley >= 2) { rumeurOrb(sx, sy, tg, true, (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.2)); combatEvent('nouveau:illusion'); }
        if (B.phase === 1) for (const c of B.clones) rumeurOrb(c.x, c.y + 1.5, tg, true);
        OT.Sound.zap();
      }
    }
    // l'ombre de la vraie, toujours au sol sous elle
    B.shadowM.visible = true; B.shadowM.position.set(B.x, groundBelow(B.x, B.y) + 0.04, 0.2);
    if (B.phase === 0) {
      B.x = 17.5 + Math.sin(time * 0.6) * 6; B.y = 8 + bob;
      // la vraie porte bourdonne (son + vibration) et respire doucement
      const real = B.doors.find((d) => d.real);
      let hum = 0;
      for (const d of B.doors) {
        if (!d.mesh.visible) continue;
        d.portal.material.opacity = d.real ? 0.75 + Math.sin(time * 5) * 0.2 : 0.92;
        const zone = { x0: d.x - 0.35, y0: d.y, x1: d.x + 0.35, y1: d.y + 1.8 };
        for (const p of alive) if (overlap(pbox(p), zone)) {
          if (d.real) {
            B.hits++;
            OT.Sound.door(); OT.Input.rumble(-1, 0.6, 0.9, 300); shake = 0.3;
            particles.burst(d.x, d.y + 1, 26, [0x3cff9a, 0xffffff], 7, { up: 1 });
            bubble(d.x, d.y + 2.8, ['La vérité était là.', 'Encore une !', 'Plus de mensonges.'][B.hits - 1], 2, '#3cff9a');
            genBar(B, B.hits, 3);
            if (B.hits >= 3) { genPhase(B, 1); return; }
            shuffleDoors(B);
            p.vx = p.x < d.x ? -6 : 6; p.vy = 7; p.ctrlLock = 0.3;
          } else {
            d.mesh.visible = false;
            OT.Sound.boom(); particles.burst(d.x, d.y + 1, 30, [0xb78cff, 0x333333], 9, { up: 2 });
            bubble(d.x, d.y + 2.8, 'On t\'a menti…', 2, '#b78cff', 'La Rumeur');
            kill(p, 'boom');
          }
          break;
        }
      }
      if (real) for (const p of alive) {
        const k = Math.max(0, 1 - Math.hypot(p.x - real.x, p.y - real.y) / 14);
        hum = Math.max(hum, k);
        p.partPulse = (p.partPulse || 0) - dt;
        if (k > 0 && p.partPulse <= 0) { OT.Input.rumble(p.i, k > 0.75 ? (k - 0.75) * 3 : 0, k, 160); p.partPulse = 0.45 - k * 0.3; }
      }
      OT.Sound.setHum(hum * hum);
    } else if (B.phase === 1) {
      OT.Sound.setHum(0);
      B.x = 17.5 + Math.sin(time * 0.8) * 9; B.y = 8.5 + bob;
      // 1.5 : ses deux COPIES imitent ses gestes (miroir et décalée), transparentes, sans ombre
      const cpos = [[17.5 - Math.sin(time * 0.8) * 9, 8.5 + bob], [17.5 + Math.sin(time * 0.8 + 2.1) * 7, 9.2 - bob]];
      B.clones.forEach((c, i) => { c.x = cpos[i][0]; c.y = cpos[i][1]; c.m.visible = Math.sin(time * 17 + i) > -0.7; c.m.position.set(c.x, c.y, -0.6); c.m.rotation.y = B.mesh.rotation.y; });
      if (!B.clonesSaid) { B.clonesSaid = true; combatEvent('nouveau:clone'); }
      // 1.5 : des « ? » arrivent des BORDS de l'écran, à hauteur d'un joueur (une bande violette prévient 1 s)
      B.edgeT -= dt;
      if (B.edgeT <= 0 && alive.length) {
        B.edgeT = 3.6;
        const tg = randomPlayer(alive), AW = R.AW || R.W, fromL = Math.random() < 0.5;
        const gy = Math.max(1, tg.onGround ? Math.round(tg.y) : groundBelow(tg.x, tg.y + 0.3));
        fxLance(fromL ? 1.3 : AW - 1.3, gy + 0.4, fromL ? 7 : -7, { warn: 1.0, w: 0.6, h: 0.5, lane: true, round: true, cause: 'zap', mat: bfxMats().col });
        combatEvent('nouveau:edges');
      }
      // le sol du doute : une zone se fissure (1,2 s), puis disparaît 2,5 s
      B.crackT -= dt;
      if (B.crackT <= 0 && alive.length) {
        B.crackT = 2.2;
        const tg = randomPlayer(alive);
        const cx = Math.max(2, Math.min(31, Math.round(tg.x) - 1 + Math.floor(Math.random() * 3) - 1));
        for (let x = cx; x < cx + 3; x++) { const t = R.tiles[0][x]; if (t && t.ch === 'D' && t.state === 'idle') { t.state = 'warn'; t.t = 1.2; } }
      }
      for (const b of B.truths) {
        if (b.taken) continue;
        b.mesh.rotation.y += dt * 2; b.mesh.position.y = b.y + Math.sin(time * 3) * 0.1;
        for (const p of alive) if (touches(p, b.x, b.y, 0.65, 0.5)) {
          b.taken = true; b.mesh.visible = false;
          OT.Sound.part(); OT.Input.rumble(-1, 0.3, 0.6, 200);
          particles.burst(b.x, b.y, 22, [0xffffff, 0x9fe7ff], 6);
          const n = B.truths.filter((q) => q.taken).length;
          bubble(b.x, b.y + 1.4, ['Une vérité.', 'Deux vérités.', 'Je sais qui je suis.'][n - 1], 2.2, '#9fe7ff');
          genBar(B, n, 3);
          if (n >= 3) { genPhase(B, 2); return; }
          break;
        }
      }
    } else if (B.phase === 2) {
      // 3 interrupteurs à activer ensemble pour couper le bouclier
      let allOn = true;
      for (const sw of B.switches) {
        const zone = { x0: sw.x + 0.1, y0: sw.y, x1: sw.x + 0.9, y1: sw.y + 0.8 };
        const on = alive.some((p) => overlap(pbox(p), zone));
        if (on) { if (sw.onT <= 0) { OT.Sound.click(); OT.Input.rumble(-1, 0.2, 0.3, 80); } sw.onT = ez(7); }
        else sw.onT -= dt;
        sw.lever.rotation.z = sw.onT > 0 ? -0.5 : 0.5;
        sw.lamp.material.color.set(sw.onT > 0 ? 0x3cff9a : 0xff3020);
        if (sw.onT <= 0) allOn = false;
      }
      if (allOn && B.shieldOff <= 0) { B.shieldOff = ez(5); OT.Sound.boom(); bubble(17.5, 9, 'Le bouclier tombe !', 2, '#3cff9a'); B.switches.forEach((sw) => (sw.onT = 0)); clearBfx(); combatEvent('weak'); }
      // 1.5 : elle ressort les pièges des mondes (un toutes les 3,4 s), jamais pendant que son bouclier est tombé
      if (B.shieldOff <= 0) { B.medT -= dt; if (B.medT <= 0 && alive.length) { B.medT = 3.4; rumeurMedley(B, alive); } }
      B.shieldOff -= dt;
      const open = B.shieldOff > 0;
      B.x = 17.5 + (open ? 0 : Math.sin(time * 0.7) * 7);
      B.y += ((open ? 5.0 : 8 + bob) - B.y) * Math.min(1, dt * 3);
      if (open) { B.markHit.visible = true; B.markHit.position.set(B.x, B.y + 4.8, 1); }
      const zone = { x0: B.x - 0.75, y0: B.y + 0.1, x1: B.x + 0.75, y1: B.y + 1.9 };
      for (const p of alive) if (B.hurt <= 0 && overlap(pbox(p), zone)) {
        if (!open) { OT.Sound.zap(); kill(p, 'zap'); continue; }
        B.hits++; B.hurt = 1.2; B.shieldOff = 0;
        p.vx = p.x < B.x ? -8 : 8; p.vy = 9; p.ctrlLock = 0.35;
        OT.Sound.hit(); OT.Input.rumble(-1, 1, 1, 500); shake = 0.5;
        particles.burst(B.x, B.y + 1, 30, [0xb78cff, 0xffffff], 9, { up: 2 });
        genBar(B, B.hits, 2, B.hits < 2 ? 'Encore une fois : rallume les 3 interrupteurs, puis touche-la.' : null);
        combatCine('critique');
        if (B.hits >= 2) {
          OT.Sound.setHum(0);
          if (T.phases.length > 3) { genPhase(B, 3); return; }   // 1.5 : la CONFRONTATION finale
          genOutro(B, T.end, '#b78cff'); return;
        }
        combatEvent('hurt');
        break;
      }
    } else if (B.phase === 3) {
      // 1.5 — LA CONFRONTATION : des SALVES de pièges des quatre mondes (5 s), puis elle s'épuise et descend
      // au-dessus du milieu (3,4 s) : on saute pour la toucher. Deux fois. Le héros lui répond à chaque coup.
      for (const sw of B.switches) sw.mesh.visible = false;
      if (B.tired > 0) {
        B.tired -= dt;
        B.x += (17.5 - B.x) * Math.min(1, dt * 4); B.y += (4.6 - B.y) * Math.min(1, dt * 4);
        B.markHit.visible = true; B.markHit.position.set(B.x, B.y + 4.8, 1);
        if (Math.random() < 0.2) particles.burst(B.x + (Math.random() - 0.5), B.y + 1, 1, [0xb78cff, 0x2a2a33], 2, { grav: -0.4, life: 0.7 });
        const zone = { x0: B.x - 0.8, y0: B.y + 0.1, x1: B.x + 0.8, y1: B.y + 1.9 };
        for (const p of alive) if (B.hurt <= 0 && overlap(pbox(p), zone)) {
          B.hits++; B.hurt = 1.2; B.tired = 0;
          p.vx = p.x < B.x ? -8 : 8; p.vy = 9; p.ctrlLock = 0.35;
          OT.Sound.hit(); OT.Input.rumble(-1, 1, 1, 500); shake = 0.5;
          particles.burst(B.x, B.y + 1, 30, [0xb78cff, 0xffffff, 0x3cff9a], 9, { up: 2 });
          combatCine('critique');
          if (OT.Combat) OT.Combat.finale(B.hits - 1);
          genBar(B, B.hits, 2, B.hits < 2 ? 'Encore une fois ! Tiens bon pendant sa salve, puis touche-la.' : null);
          if (B.hits >= 2) { setTimeout(() => { if (OT.Combat) OT.Combat.finale(2); }, 2600); genOutro(B, T.end, '#b78cff'); return; }
          B.salvo = 0; B.salvoT = 2.2;
          break;
        }
        if (B.tired <= 0) { B.salvo = 0; B.salvoT = 1.2; }
      } else {
        B.x = 17.5 + Math.sin(time * 0.9) * 8; B.y += ((8.5 + bob) - B.y) * Math.min(1, dt * 3);
        if (B.salvo > 0) {
          // une salve = onde, piège de zone, onde, piège de zone (1,2 s d'écart) : jamais deux zones à la fois,
          // il reste toujours un endroit sûr
          B.salvo -= dt; B.medT -= dt;
          if (B.medT <= 0 && alive.length) {
            B.medT = 1.2;
            if (B.salvoN % 2 === 0) rumeurMedley(B, alive, 0);
            else rumeurMedley(B, alive, 1 + (B.zoneI++ % 3));
            B.salvoN++;
          }
          if (B.salvo <= 0) {
            B.tired = 3.4; clearBfx();
            R.hazards.forEach((h) => { R.group.remove(h.mesh); if (h.shadow) R.group.remove(h.shadow); }); R.hazards.length = 0;
            bubble(17.5, 10, 'Je… je n\'ai plus de mots…', 2.2, '#b78cff', 'La Rumeur');
            combatEvent('weak');
          }
        } else {
          B.salvoT -= dt;
          if (B.salvoT <= 0) { B.salvo = 4.9; B.medT = 0.3; B.salvoN = 0; combatCine('special', { title: B.hits ? 'TOUTES TES PEURS' : 'TES ANCIENNES PEURS', sub: 'Chaque piège prévient' }); combatEvent('special'); }
        }
      }
    }
    // le sol du doute évolue
    for (let x = 0; x < R.W; x++) {
      const t = R.tiles[0][x];
      if (!t || t.ch !== 'D') continue;
      if (t.state === 'warn') {
        t.t -= dt; t.mesh.position.x = x + Math.sin(time * 60) * 0.05; t.mesh.material[0].color.set(0xff6a6a);
        if (t.t <= 0) { t.state = 'open'; t.t = 2.5; t.mesh.visible = false; particles.burst(x + 0.5, 0.5, 6, [0xb78cff, 0x2a2a33], 4); }
      } else if (t.state === 'open') {
        t.t -= dt;
        if (t.t <= 0 && !players.some((p) => p.alive && overlap(pbox(p), { x0: x, y0: 0, x1: x + 1, y1: 1 }))) { t.state = 'idle'; t.mesh.visible = true; t.mesh.position.set(x, 0, 0); t.mesh.material[0].color.set(0xffffff); }
      }
    }
    B.mesh.position.set(B.x, B.y, -0.6);
    B.shield.position.set(B.x, B.y + 1.6, -0.3);
    B.shield.visible = B.phase === 2 && B.shieldOff <= 0;
    B.shield.scale.setScalar(1 + Math.sin(time * 6) * 0.04);
    B.mesh.rotation.y = Math.sin(time) * 0.3;
  }

  /* ==================================================================
     7. BULLES DE TEXTE
     ================================================================== */
  // version 1.4 : quand un personnage connu parle dans une bulle, on entend aussi sa voix
  let bubbleVoices = null;
  function voiceOfName(name) {
    if (!bubbleVoices) {
      bubbleVoices = { 'Le Gardien': 'gardien', 'La Rumeur': 'rumeur' };
      for (const id in OT.CHARACTERS) bubbleVoices[OT.CHARACTERS[id].name] = id;
      for (const w in OT.WORLD_DATA) { const T = OT.WORLD_DATA[w].bossText; const b = OT.WORLD_DATA[w].levels.find((l) => l.boss); if (T && T.name && b) bubbleVoices[T.name] = { bug: 'bug', exam: 'machine', zeus: 'zeus', rumeur: 'rumeur', gardien: 'gardien' }[b.boss] || 'gardien'; }
    }
    return bubbleVoices[name] || null;
  }
  function bubble(x, y, text, dur, color, whoName, voice) {
    if (!text) return;
    if (OT.Dialogue && whoName && voice !== false && !party()) {
      const sp = voice || voiceOfName(whoName);
      if (sp) OT.Dialogue.say(sp, text, { priority: ['gardien', 'bug', 'machine', 'zeus'].includes(sp) || (sp === 'rumeur' && R && R.boss) ? 3 : sp === 'rumeur' ? 1 : 2, subtitle: false });
    }
    const el = document.createElement('div');
    el.className = 'bubble';
    el.style.borderColor = color || '#ffd28a';
    if (whoName) { const b = document.createElement('b'); b.style.color = color; b.textContent = whoName; el.appendChild(b); }
    const s = document.createElement('span'); s.textContent = text; el.appendChild(s);
    document.getElementById('bubbles').appendChild(el);
    // 1.5 : jamais deux bulles l'une sur l'autre — la précédente au même endroit s'efface aussitôt
    for (const o of bubbles) if (Math.abs(o.x - x) < 3.2 && Math.abs(o.y - y) < 1.6) o.t = Math.min(o.t, 0.18);
    bubbles.push({ x, y, t: dur, el });
  }
  const v3 = new THREE.Vector3();
  function updateBubbles(dt) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.t -= dt;
      v3.set(b.x, b.y, 0).project(camera);
      const sx = (v3.x * 0.5 + 0.5) * window.innerWidth, sy = (-v3.y * 0.5 + 0.5) * window.innerHeight;
      b.el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
      b.el.style.opacity = Math.min(1, b.t * 3);
      if (b.t <= 0) { b.el.remove(); bubbles.splice(i, 1); }
    }
  }

  /* ==================================================================
     7 bis. MODE FÊTE (multijoueur local) : ce que le moteur fait pour toutes
     les activités. Les règles de chaque activité sont dans party.js.
     ================================================================== */
  function partyTick(alive, dt) {
    const S = R.party;
    for (const p of players) { p.stun = Math.max(0, p.stun - dt); p.stompCool = Math.max(0, p.stompCool - dt); p.inv = Math.max(0, p.inv - dt); }
    // sauter sur la tête d'un autre joueur : on rebondit, lui est étourdi un instant
    if (PM.stomp !== false && S.countdown <= 0) for (const a of alive) for (const b of alive) {
      if (a === b || b.stompCool > 0 || a.vy >= -0.5) continue;
      if (Math.abs(a.x - b.x) < 0.62 && a.y <= b.y + b.h + 0.12 && a.y >= b.y + b.h - 0.42) {
        a.vy = 11.5; a.y = b.y + b.h + 0.01; a.cut = true; a.onGround = false; a.coyote = 0;
        b.stompCool = 0.45; b.squash = 0.55;
        if (b.inv <= 0) { b.stun = 0.55; b.ctrlLock = 0.3; b.vx = Math.sign(b.x - a.x || 1) * 5; }
        OT.Sound.hit(); OT.Input.rumble(a.i, 0.2, 0.5, 90); OT.Input.rumble(b.i, 0.7, 0.4, 200);
        particles.burst(b.x, b.y + b.h, 12, [a.color, 0xffffff], 5, { up: 2 });
        if (PM.onStomp) PM.onStomp(S, PX, a, b);
      }
    }
    if (S.countdown <= 0) { S.t += dt; if (PM.update) PM.update(S, PX, alive, dt); }
    // un appui ne compte qu'une fois par image (le moteur fait 2 sous-pas par image)
    for (const inp of S.inputs || []) if (inp) { inp.jumpP = false; inp.talkP = false; }
    if (S.over && !R.done) finishParty();
  }
  function finishParty() {
    R.done = true;
    state = 'done';
    OT.Sound.setHum(0);
    OT.Sound.door();
    const S = R.party;
    const scores = PM.scores(S, PX);
    if (OT.Light) players.forEach((p) => OT.Light.flash(p.i, 0x00ff66, 1.4));
    setTimeout(() => { if (R && R.party === S) OT.Party.roundOver(S, scores); }, 1300);
  }
  // Ce que les activités (party.js) ont le droit d'utiliser
  const PX = {
    get R() { return R; },
    get players() { return players; },
    get time() { return time; },
    get cam() { return cam; },
    // demi-largeur visible à l'écran (en cases) autour du centre de la caméra
    viewHalfW() { return cam.z * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect; },
    kill: (p, cause) => kill(p, cause),
    bubble: (...a) => bubble(...a),
    addHazard: (h, color, size) => addHazard(h, color, size),
    updateHazards: (alive, dt) => updateHazards(alive, dt),
    clearHazards: () => clearHazards(),
    spawnDrop: (x) => spawnDrop(x),
    groundBelow: (x, fromY) => groundBelow(x, fromY),
    solid: (x, y) => tileSolid(x, y),
    touches: (p, x, y, rx, ry) => touches(p, x, y, rx, ry),
    overlapP: (a, b) => overlap(pbox(a), pbox(b)),
    burst: (...a) => particles.burst(...a),
    shake(v) { shake = Math.max(shake, v); },
    teleport(p, x, y) {
      p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.standOn = null; p.onGround = false;
      particles.burst(x, y + 0.5, 14, [p.color, 0xffffff], 4, { grav: -0.3, life: 0.5 });
    },
    tile: (x, y) => (R.tiles[y] ? R.tiles[y][x] : null),
    // sol piégé '~' : il tombe, puis revient tout seul 3,5 s plus tard
    dropTile(x, y) { const t = R.tiles[y] && R.tiles[y][x]; if (t && t.ch === '~' && t.state === 'idle') { t.state = 'drop'; t.vy = 0; t.oy = 0; t.t = 0; } },
    // bloc rouillé '=' : il se met à trembler puis tombe (Sol de lave)
    shakeTile(x, y, delay) { const t = R.tiles[y] && R.tiles[y][x]; if (t && t.ch === '=' && t.state === 'idle') { t.state = 'shake'; t.t = delay || 0.9; OT.Sound.crumble(); return true; } return false; },
    // caisse cassable 'B' : renvoie vrai si elle vient d'être cassée
    breakTile(x, y) {
      const t = R.tiles[y] && R.tiles[y][x];
      if (!t || t.ch !== 'B' || t.state === 'broken') return false;
      t.state = 'broken'; t.mesh.visible = false;
      particles.burst(x + 0.5, y + 0.5, 14, [0xb5793a, 0x7a4a1e, 0xffd28a], 6, { up: 2 });
      return true;
    },
    group: () => R.group,
    M, get THREE() { return window.THREE; },

    /* ---------- version 1.5 : ce que les modules (extensions.js) peuvent utiliser ---------- */
    get mode() { return mode; },
    get worldId() { return worldId; },
    get levelIndex() { return levelIndex; },
    get state() { return state; },
    set state(v) { state = v; },
    get scene() { return scene; },
    get camera() { return camera; },
    get renderer() { return renderer; },
    get canvas() { return canvas; },
    get who() { return who; },
    get lights() { return { sun, hemi, rim, lampA }; },
    get shakeV() { return shake; },
    PHYS: { GRAV, JUMP_V, MAX_V, RUN_MUL, PW, PH, COYOTE, MAX_FALL },
    splitView: false,                    // vrai pendant l'écran partagé (Versus)
    particles: () => particles,
    shock: (...a) => shock(...a),
    pbox: (p) => pbox(p),
    overlap: (a, b) => overlap(a, b),
    tileSolid: (x, y) => tileSolid(x, y),
    solidsNear: (b, p) => solidsNear(b, p),
    inZone: (p, kind) => inZone(p, kind),
    zoneIdx: (x) => zoneIdx(x),
    nearest: (x, y) => nearest(x, y),
    levOn: (g, inv) => levOn(g, inv),
    easy: () => easy(),
    ez: (v) => ez(v),
    geo13: () => geo13(),
    mats13: () => mats13(),
    setCheckpoint: (x, y) => setCheckpoint(x, y),
    cpFx: (x, y, p) => cpFx(x, y, p),
    spawnFor: (p) => spawnFor(p),
    placePlayer: (p) => placePlayers(p),
    fireTrigger: (tr) => fireTrigger(tr),
    heroBark: (kind, p, o) => heroBark(kind, p, o),
    hudData: () => hudData(),
    finishLevel: (w) => finishLevel(w === undefined ? -1 : w),
    rumble: (i, s, w, ms) => OT.Input.rumble(i, s, w, ms),
    // ralenti de tout le jeu (cinématique de combat) / ralenti des pièges seulement (Time Break)
    slowmo: (scale, dur) => slowmo(scale, dur),
    worldScale: (scale, dur) => worldScale(scale, dur),
    get worldScaleOn() { return wscale.t > 0 ? wscale.scale : 1; },
    // ajouter une entité au niveau en cours (même format que dans les niveaux : { type, x, y, … })
    addEnt(e) {
      if (!R || !R.makeEnt) return null;
      const before = (R.ents[e.type] || []).length;
      R.makeEnt(e);
      const list = R.ents[e.type] || [];
      if (!R.building) extLists();   // ajoutée en cours de partie : on met les listes à jour
      return list.length > before ? list[list.length - 1] : null;
    },
    ents: (type) => (R && R.ents[type]) || [],
    // version 1.5 (tactile) : y a-t-il quelque chose à faire avec ACTION à côté du joueur i ? (porte, caisse, levier, personnage)
    // outil debug (OT.Combat.testBoss) : aller directement à la phase n du boss
    bossPhase(n) {
      const B = R && R.boss; if (!B || R.bossWait || R.escape) return false;
      const k = B.kind || 'gardien', T = WD().bossText, max = (T && T.phases ? T.phases.length : 3) - 1;
      n = Math.max(0, Math.min(max, n | 0));
      if (k === 'gardien') bossPhase(B, n); else if (k === 'bug') bugPhase(B, n); else genPhase(B, n);
      return true;
    },
    actionNear(i) {
      const p = players[i];
      if (!R || !p || !p.alive || p.finished || party()) return false;
      return usableNear(p) || (R.ents.npc || []).some((n) => Math.abs(p.x - n.x) < 1.05 && Math.abs(p.y - n.y) < 1.5);
    },
    // ajouter un bloc plein (ex. : une marche pour atteindre une pièce) dans une case vide
    addBlock(x, y) {
      if (!R || y < 0 || y >= R.H || x < 0 || x >= R.W || R.grid[y][x] !== ' ') return null;
      R.grid[y][x] = '#';
      const m = new THREE.Mesh(M.slabGeo(1), [R.TM.plate, R.TM.top]);
      m.geometry.userData.shared = true;
      m.position.set(x, y, 0); m.castShadow = true; m.receiveShadow = true;
      R.group.add(m);
      return m;
    },
  };

  /* ==================================================================
     8. CAMÉRA 2.5D
     ================================================================== */
  // réglages de la caméra du joueur selon la situation
  let lastIntro = '';
  function camMode(kind) {
    if (!OT.Cam) return;
    OT.Cam.reset();
    OT.Cam.setActive(kind !== 'off');
    if (kind === 'level') OT.Cam.setLimits({ yaw: [-0.5, 0.5], pitch: [-0.18, 0.4], zoom: [0.55, 1.6] });
    if (kind === 'fit') OT.Cam.setLimits({ yaw: [-0.35, 0.35], pitch: [-0.12, 0.3], zoom: [0.7, 1.25] });
  }
  // mise en scène de la fin du niveau : les gagnants fêtent devant la porte, la caméra s'approche
  function stageVictory(winner) {
    const win = players.filter((p) => winner < 0 || p.i === winner);
    const lose = players.filter((p) => winner >= 0 && p.i !== winner);
    const d = R.doorAt;
    win.forEach((p, k) => {
      if (d && win.length > 1) p.x = d.x + 0.5 + (k - (win.length - 1) / 2) * 0.95;
      p.mesh.visible = true; p.hideT = 0; p.dying = 0; p.celebrate = true;
      if (p.anim) { p.anim.emote(); p.anim.loop('victory'); p.anim.expr('happy', 30); }
    });
    lose.forEach((p) => { if (p.anim && p.alive) { p.celebrate = true; p.anim.loop('defeat'); p.anim.expr('sad', 30); } });
    R.victory = { t: 0, focus: win.length ? win : players };
    const c = R.victory.focus[0];
    if (c) {
      particles.burst(c.x, c.y + 1.4, 40, [0xffd23f, 0x3cff9a, 0x3d8bff, 0xff5fa2, 0xffffff], 7, { up: 6 });
      setTimeout(() => R && R.victory && particles.burst(c.x, c.y + 1.8, 30, [0xffd23f, 0xffffff, c.color], 6, { up: 5 }), 450);
    }
    if (OT.Cam) OT.Cam.hold({ zoom: 0.62, pitch: 0.1, swing: 0.38 });
  }

  function updateCamera(dt, snap) {
    if (!R) return;
    // la caméra du joueur (stick droit, L2/R2, souris, doigts) : tourner, monter, zoomer
    const V = OT.Cam && !R.cineCam ? OT.Cam.view() : { yaw: 0, pitch: 0, zoom: 1 };
    let tx, ty, tz;
    if (R.cineCam) { tx = R.cineCam.x; ty = R.cineCam.y; tz = R.cineCam.z; }
    else if (R.boss && !R.victory && !R.escape && !R.bossWait) { tx = R.AW / 2; ty = Math.max(5.6, R.H / 2 - 0.4); tz = Math.max(24, 30 / Math.max(0.9, camera.aspect / 1.6)) + Math.max(0, R.H - 12) * 1.2; }
    else if (party() && (R.def.camera || PM.camera) === 'fit') {
      // arène du mode fête : on voit toute l'arène d'un coup
      const t = Math.tan((camera.fov * Math.PI) / 360);
      tx = R.W / 2; ty = R.H / 2 - 0.9;
      tz = Math.max(14, (R.W / 2 + 0.6) / (t * camera.aspect), (R.H / 2 + 1.4) / t);
    }
    else {
      const list = players.filter((p) => p.alive && !p.finished);
      const use = R.victory ? R.victory.focus : list.length ? list : players;
      let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
      for (const p of use) { minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y); }
      // la caméra regarde un peu devant le héros, d'autant plus qu'il va vite
      tx = (minx + maxx) / 2 + (use.length === 1 && !R.victory ? use[0].face * 0.9 + Math.max(-1.4, Math.min(1.4, use[0].vx * 0.13)) : 0);
      ty = (miny + maxy) / 2 + 1.2;
      const spread = Math.max(maxx - minx, (maxy - miny) * camera.aspect);
      const portraitFix = camera.aspect < 1.2 ? 1.45 : 1;
      // plus près qu'avant : les personnages sont plus grands à l'écran (R2 / L2 pour ajuster)
      // version 1.3 : à plusieurs, la caméra peut reculer davantage (grands niveaux)
      tz = Math.min(38, Math.max(11.5, 10 + spread * 0.75)) * portraitFix;
      // version 1.3 : zoom doux selon la zone (grande salle = on recule, passage étroit = on s'approche)
      let zf = 1, yb = 0;
      for (const z of R.camz || []) if (tx >= z.x0 && tx <= z.x1) { zf = z.z; yb = z.yb; break; }
      if (R.camPull > 0) { R.camPull = Math.max(0, R.camPull - dt); zf = Math.max(zf, 1.35); }   // la caméra recule pour montrer un gros danger
      const kz = snap ? 1 : 1 - Math.exp(-dt * 1.1);
      R.camZf = (R.camZf || zf) + (zf - (R.camZf || zf)) * kz;
      R.camYb = (R.camYb || 0) + (yb - (R.camYb || 0)) * kz;
      tz *= R.camZf; ty += R.camYb;
      const halfW = tz * V.zoom * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
      if (R.victory) { /* la fête : on cadre les gagnants, même au bout du niveau */ }
      else if (R.W > halfW * 2) tx = Math.max(halfW - 1, Math.min(R.W - halfW + 1, tx)); else tx = R.W / 2;
      const touchUI = !document.getElementById('touch').hidden;
      ty = Math.max(ty, tz * Math.min(1, V.zoom) * (touchUI ? 0.14 : 0.27));
      ty = Math.min(ty, R.H - 1.5);
    }
    // version 1.5 : un module peut corriger la cible (caméra de boss, cadrage coop…)
    if (EXT.has('camera')) { const tg = { x: tx, y: ty, z: tz }; EXT.run('camera', tg, dt, PX); tx = tg.x; ty = tg.y; tz = tg.z; }
    // version 1.3 : vue large du stade au début du niveau, puis la caméra plonge vers le départ (≈ 1,8 s)
    let introSnap = false;
    if (R.intro && !R.cineCam) {
      R.intro.t += dt;
      const u = Math.min(1, R.intro.t / R.intro.dur), e = u * u * (3 - 2 * u);
      const wx = R.intro.x, wy = R.intro.y, wz = R.intro.z;
      tx = wx + (tx - wx) * e; ty = wy + (ty - wy) * e; tz = wz + (tz - wz) * e;
      introSnap = true;
      if (u >= 1) R.intro = null;
    }
    // la caméra suit vite le héros (sans à-coups) : elle ne doit jamais donner une impression de lenteur
    const k = snap || introSnap ? 1 : 1 - Math.pow(R.cineCam ? 0.4 : R.victory ? 0.004 : 0.003, dt);
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.z += (tz - cam.z) * k;
    const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
    shake = Math.max(0, shake - dt * 1.5);
    // orbite autour du point regardé : même cadrage qu'avant quand yaw = pitch = 0 et zoom = 1
    const el0 = Math.atan2(2.2, cam.z), r = Math.hypot(2.2, cam.z) * V.zoom;
    const el = Math.max(-0.05, Math.min(0.85, el0 + V.pitch));
    camera.position.set(cam.x + sx + r * Math.cos(el) * Math.sin(V.yaw), cam.y + 0.2 + sy + r * Math.sin(el), r * Math.cos(el) * Math.cos(V.yaw));
    camera.lookAt(cam.x, cam.y + 0.2, 0);
    sun.position.set(cam.x - 8, cam.y + 16, 14);
    sun.target.position.set(cam.x, cam.y - 2, 0);
    const s = sun.shadow.camera;
    const sz = cam.z * Math.max(1, V.zoom);
    s.left = -sz * 1.2; s.right = sz * 1.2; s.top = sz * 0.8; s.bottom = -sz * 0.8; s.near = 1; s.far = 60;
    s.updateProjectionMatrix();
    rim.position.set(cam.x + 6, cam.y + 4, -10);
    lampA.position.set(cam.x - 4, cam.y + 3, 3);
  }

  /* ==================================================================
     9. BOUCLE DE JEU
     ================================================================== */
  let last = 0;
  // multiplicateur de vitesse choisi dans les Paramètres (0,6 à 1,3 ; 1 = normal)
  const SPEEDS = [0.6, 0.75, 1, 1.15, 1.3];
  function gameSpeed() { const v = OT.settings && +OT.settings.gameSpeed; return v > 0 ? Math.max(0.5, Math.min(1.5, v)) : 1; }
  const ghostOn = () => mode === 'solo' && (!OT.settings || OT.settings.ghost !== false);
  function simulate(dt, inputs) {
    R.timer += dt;
    R.attemptT += dt;
    if (party()) {
      const S = R.party;
      // compte à rebours « 3, 2, 1, PARTEZ ! » : personne ne bouge
      if (S.countdown > 0) {
        const before = Math.ceil(S.countdown);
        S.countdown -= dt;
        const after = Math.ceil(S.countdown);
        if (after !== before) { OT.UI.countdown(after > 0 ? after : 0); if (after > 0) OT.Sound.menu(); else OT.Sound.ok(); }
        inputs = inputs.map(() => ({}));
      }
      // étourdi (on lui a sauté sur la tête) : plus de contrôle un court instant
      S.inputs = inputs;   // l'activité lit aussi les commandes (ex. : le Piégeur déplace son viseur)
      inputs = inputs.map((inp, i) => (players[i] && players[i].stun > 0 ? {} : inp || {}));
    }
    // bouton d'action (△ / E / ↓) : porte ou caisse à portée = on l'utilise, sinon on parle au personnage
    let talked = false;
    for (const p of players) {
      p.useT = Math.max(0, (p.useT || 0) - dt);
      if (!p.alive || p.finished || !inputs[p.i] || !inputs[p.i].talkP) continue;
      if (usableNear(p)) { p.useT = 0.25; continue; }
      if (party() || talked) continue;
      const n = (R.ents.npc || []).find((n) => Math.abs(p.x - n.x) < 1.05 && Math.abs(p.y - n.y) < 1.5);
      if (n) { talkTo(n, p); talked = true; }
      else p.useT = 0.25;   // on peut appuyer juste avant d'arriver devant la porte
    }
    if (talked) return;
    if (state !== 'play') return;
    // assez de sous-pas pour que la physique reste précise même si l'image a été lente (≤ 1/120 s chacun)
    const sub = Math.max(2, Math.ceil(dt * 120 - 0.001));
    // version 1.5 : TIME BREAK (gadget) = les pièges ralentissent, pas les joueurs
    const ws = worldScaleNow(dt);
    for (let s = 0; s < sub; s++) {
      if (state !== 'play') return;   // un dialogue vient de s'ouvrir (ex. nouvelle phase du boss)
      for (const p of players) updatePlayer(p, s === 0 ? inputs[p.i] : Object.assign({}, inputs[p.i], { jumpP: false, gadgetP: false }), dt / sub);
      updateWorld(dt / sub * ws);
      if (!R) return;
    }
    // fantôme : on enregistre l'essai en cours (30 images par seconde)
    const p0 = players[0];
    if (ghostOn() && p0 && p0.alive && !p0.finished && R.ghostRec.length < 9000)
      while (R.ghostRec.length < Math.floor(R.attemptT * 30)) R.ghostRec.push([p0.x, p0.y, p0.face]);
    for (const p of players) {
      if (p.alive || p.finished) continue;
      p.deadT -= dt;
      if (p.deadT <= 0) {
        if (party()) { if (!p.out) { placePlayers(p); p.inv = PM.respawnInv !== undefined ? PM.respawnInv : 1.2; } }
        else if (mode === 'versus') placePlayers(p);
        else if (players.every((o) => !o.alive || o.finished)) {
          resetAttempt();
          placePlayers();
          const who = R.barkRetry; setTimeout(() => { if (R && state === 'play') heroBark('retry', who); }, 700);
          if (R.deaths === 3) OT.UI.toast('Astuce : parle aux personnages. Leurs conseils changent après 3 chutes.');
        }
        // version 1.5 (coop) : le partenaire est encore en vie → le module fait revenir celui-ci près de lui
        else if (EXT.has('respawnOne')) EXT.any('respawnOne', p, PX);
      }
    }
    if (party()) OT.UI.partyHud(PM.hud(R.party, PX)); else OT.UI.hud(hudData());
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    // le temps du jeu suit le temps réel (avant : bloqué à 1/30 s par image → tout ralentissait
    // dès que l'ordinateur affichait moins de 30 images par seconde)
    const rdt = Math.min(0.06, (ts - last) / 1000 || 0);   // temps réel
    last = ts;
    // VITESSE DU GAMEPLAY (Paramètres) : un seul réglage, appliqué au temps de TOUT le jeu
    // (personnages, pièges, boss, rivaux, bots). Les déplacements sont donc vraiment plus lents
    // ou plus rapides, et les niveaux restent faisables puisque les pièges suivent le même rythme.
    // La caméra et l'interface gardent le temps réel (elles restent réactives).
    // version 1.5 : RALENTI des cinématiques de combat (rare, ≈ 0,3 s) — tout le jeu ralentit
    const dt = rdt * gameSpeed() * slowNow(rdt);
    time += dt * (wscale.t > 0 ? wscale.scale : 1);   // les pièges suivent l'horloge du monde (Time Break)
    OT.UI.frame(rdt);
    if (OT.Cam) OT.Cam.update(rdt);
    // Soirée OSWEL : les mini-jeux en vue de dessus ont leur propre scène (même vitesse pour tous)
    if (OT.Arena && OT.Arena.active) { OT.Arena.frame(dt); OT.Arena.render(renderer); return; }
    if (R) {
      const readInputs = () => (mode === 'party' ? OT.Input.pollDevices(partyDevs) : OT.Input.poll(mode === 'solo'));
      if (state === 'play') simulate(dt, readInputs());
      else readInputs();
      if (state === 'cine' && cine) updateCine(rdt);
      animate(dt);
      particles.update(dt);
      updateShock(dt);
      updateBubbles(rdt);
      updateCamera(rdt, false);
      if (EXT.has('frame')) EXT.run('frame', dt, rdt, PX);
    }
    updateOffArrows();
    // version 1.5 : un module peut dessiner l'image lui-même (écran partagé du Versus)
    if (!(R && EXT.has('render') && EXT.any('render', renderer, scene, camera, PX))) renderer.render(scene, camera);
  }

  /* --- version 1.5 : RALENTI (cinématiques de combat) et TIME BREAK (gadget) ---
     slowmo(0.3, 0.3) : tout le jeu tourne à 30 % pendant 0,3 s de temps réel, puis revient en douceur.
     worldScale(0.45, 4) : seuls les pièges / boss / poursuites ralentissent pendant 4 s de jeu. */
  const slow = { scale: 1, t: 0, ease: 0 };
  const wscale = { scale: 1, t: 0 };
  function slowNow(rdt) {
    if (slow.t > 0) { slow.t -= rdt; return slow.scale; }
    if (slow.ease > 0) {   // retour progressif à la vitesse normale (0,15 s)
      slow.ease = Math.max(0, slow.ease - rdt);
      return slow.scale + (1 - slow.scale) * (1 - slow.ease / 0.15);
    }
    return 1;
  }
  function slowmo(scale, dur) {
    if (OT.settings && OT.settings.reduceMotion) return;   // réglage d'accessibilité (si présent)
    slow.scale = Math.max(0.1, Math.min(1, scale || 0.3));
    slow.t = Math.max(slow.t, dur || 0.3);
    slow.ease = 0.15;
  }
  function worldScaleNow(dt) {
    if (wscale.t <= 0) return 1;
    wscale.t -= dt;
    return wscale.scale;
  }
  function worldScale(scale, dur) { wscale.scale = Math.max(0.1, Math.min(1, scale)); wscale.t = dur || 0; }

  // version 1.3 : à plusieurs dans un grand niveau, une flèche au bord de l'écran montre le joueur hors champ
  const offEls = [], offV = new THREE.Vector3();
  function updateOffArrows() {
    const show = R && !party() && !PX.splitView && players.length > 1 && (state === 'play' || state === 'dialog') && !(OT.Arena && OT.Arena.active);
    for (let i = 0; i < 4; i++) {
      let el = offEls[i];
      const p = players[i];
      if (!show || !p || !p.alive || p.finished) { if (el) el.hidden = true; continue; }
      offV.set(p.x, p.y + 0.6, 0).project(camera);
      const off = offV.x < -1 || offV.x > 1 || offV.y < -1 || offV.y > 1 || offV.z > 1;
      if (!off) { if (el) el.hidden = true; continue; }
      if (!el) {
        el = offEls[i] = document.createElement('div'); el.className = 'offarrow';
        el.innerHTML = '<i>➤</i><b></b>'; document.body.appendChild(el);
      }
      const W = window.innerWidth, H = window.innerHeight;
      let sx = (offV.x * 0.5 + 0.5) * W, sy = (-offV.y * 0.5 + 0.5) * H;
      if (offV.z > 1) { sx = W - sx; sy = H - sy; }
      const cx = Math.max(30, Math.min(W - 30, sx)), cy = Math.max(70, Math.min(H - 50, sy));
      el.hidden = false; el.style.left = cx + 'px'; el.style.top = cy + 'px';
      el.style.color = '#' + new THREE.Color(p.color).getHexString();
      el.firstChild.style.transform = `rotate(${Math.atan2(sy - cy, sx - cx)}rad)`;
      if (el.lastChild.textContent !== p.name) el.lastChild.textContent = p.name;
    }
  }

  // Animations purement visuelles
  function animate(dt) {
    blackoutLights(dt);
    if (R && R.mood >= 2 && R.moodBase && !R.blackoutDim) rim.intensity = R.moodBase.i * (1.3 + 0.5 * Math.sin(time * (R.mood >= 3 ? 8 : 5)));
    for (const p of players) {
      p.squash += (1 - p.squash) * Math.min(1, dt * 12);
      // sous un abribus, on recule sur le trottoir (les voitures passent devant)
      p.zz = (p.zz || 0) + (((R && R.ents && R.ents.traffic && p.alive && underShelter(p)) ? -1.0 : 0) - (p.zz || 0)) * Math.min(1, dt * 12);
      // gravité inversée : le personnage se retourne (tête en bas)
      p.flipV = (p.flipV || 0) + (((p.gs || 1) < 0 ? 1 : 0) - (p.flipV || 0)) * Math.min(1, dt * 12);
      p.mesh.position.set(p.x, p.y + p.flipV * p.h, p.zz);
      p.mesh.rotation.z = p.flipV * Math.PI;
      p.mesh.scale.set(1 / Math.sqrt(p.squash), p.squash, 1);
      // en train de fêter (ou de bouder) la fin du niveau : face à la caméra
      const targetRot = p.celebrate ? 0 : p.face > 0 ? 0.45 : Math.PI - 0.45;
      p.mesh.rotation.y += (targetRot - p.mesh.rotation.y) * Math.min(1, dt * 14);
      const ud = p.mesh.userData;
      if (p.anim) {
        p.anim.update(dt, { speed: Math.min(1.3, Math.abs(p.vx) / MAX_V), ground: p.onGround || !p.alive || p.finished, vy: p.vy, stun: p.stun > 0, face: R && R.boss && p.alive ? 'determined' : undefined });
        // fin de l'animation de chute / de la porte : on cache le personnage
        if (p.dying > 0) { p.dying -= dt; if (p.dying <= 0) p.mesh.visible = false; }
        if (p.hideT > 0) { p.hideT -= dt; if (p.hideT <= 0 && !R.victory) p.mesh.visible = false; }
      }
      if (ud.marker) { ud.marker.position.y = 1.42 + Math.sin(time * 4 + p.i) * 0.05; ud.marker.rotation.y += dt * 2; }
      // le nom reste face à la caméra même quand le héros se retourne
      ud.tag.rotation.y = -p.mesh.rotation.y;
      if (ud.over) ud.over.rotation.y = -p.mesh.rotation.y;   // mode fête : « LA RUMEUR », vies…
      if (ud.gadTick) ud.gadTick(time);
    }
    // le fantôme de l'essai précédent (solo)
    if (R.ghostRun && ghostOn() && state !== 'cine') {
      if (!R.ghostMesh) {
        R.ghostMesh = M.hero({ color: 0xff8a2b, acc: 'aucun' }, { marker: false });
        R.ghostMesh.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.28; o.material.depthWrite = false; } });
        R.group.add(R.ghostMesh);
      }
      const k = Math.floor(R.attemptT * 30), fr = R.ghostRun[k];
      R.ghostMesh.visible = !!fr;
      if (fr) {
        R.ghostMesh.position.set(fr[0], fr[1], -0.15);
        R.ghostMesh.rotation.y = fr[2] > 0 ? 0.45 : Math.PI - 0.45;
        const nx = R.ghostRun[k + 1];
        const sp = nx ? Math.abs(nx[0] - fr[0]) * 30 : 0;
        const ud = R.ghostMesh.userData, sw = Math.sin(time * 12) * Math.min(0.8, sp * 0.12);
        if (ud.legL) { ud.legL.rotation.x = sw; ud.legR.rotation.x = -sw; }
      } else if (R.ghostRun.length && k === R.ghostRun.length) {
        const l = R.ghostRun[R.ghostRun.length - 1];
        particles.burst(l[0], l[1] + 0.5, 8, [0xff8a2b, 0xffffff], 3, { grav: 0, life: 0.4 });
      }
    } else if (R.ghostMesh) R.ghostMesh.visible = false;
    // le rival marche
    if (R.rival && !R.rival.done) {
      const rv = R.rival, ud = rv.mesh.userData;
      rv.mesh.rotation.y = rv.face > 0 ? 0.45 : Math.PI - 0.45;
      if (ud.tag) ud.tag.rotation.y = -rv.mesh.rotation.y;
      const sw = state === 'play' ? Math.sin(time * 14) * 0.7 : 0;
      if (ud.legL) { ud.legL.rotation.x = sw; ud.legR.rotation.x = -sw; ud.armL.rotation.x = -sw * 0.8; ud.armR.rotation.x = sw * 0.8; }
    }
    if (R.gears) for (const g of R.gears) {
      g.rotation.z += g.userData.speed * dt;
      if (g.userData.bob !== undefined) g.position.y += Math.cos(time * 0.6 + g.userData.bob) * dt * 0.15;   // fenêtres de code qui flottent
    }
    if (R.bulbs) R.bulbs.forEach((b, i) => { b.material.emissiveIntensity = 1.6 + Math.sin(time * 9 + i) * 0.1; });
    if (R.embers) {
      const a = R.embers.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        let y = a.getY(i) + dt * (0.4 + (i % 7) * 0.08);
        if (y > R.embers.userData.H) y = -1;
        a.setY(i, y);
        a.setX(i, a.getX(i) + Math.sin(time + i) * dt * 0.1);
      }
      a.needsUpdate = true;
    }
    for (const n of R.ents.npc || []) if (n.mesh.userData.name) n.mesh.userData.name.rotation.y = -n.mesh.rotation.y;
    for (const n of R.ents.npc || []) if (n.prompt) n.prompt.rotation.y = -n.mesh.rotation.y;
  }

  /* --- version 1.4 : les petites réactions du héros (voix + sous-titre), avec variantes et délai ---
     Chaque personnage jouable a sa voix. En coop, c'est le joueur concerné qui parle. */
  // 1.5 : une réaction qui n'a de sens que la PREMIÈRE fois dans le niveau (ressort, portail, commandes inversées…)
  function heroOnce(kind, p, key) {
    if (!R) return;
    R.saidOnce = R.saidOnce || {};
    const k = key || kind;
    if (R.saidOnce[k]) return;
    if (heroBark(kind, p)) R.saidOnce[k] = true;
  }
  function heroBark(kind, p, o) {
    if (!OT.Dialogue || !R || party()) return null;
    p = p || players[0];
    if (!p) return null;
    return OT.Dialogue.bark(kind, p.char || 'oswel', Object.assign({ name: p.name, color: '#' + new THREE.Color(p.color).getHexString() }, o || {}));
  }
  // celui qui parle s'anime : un personnage du niveau se tourne vers toi et parle, le héros aussi
  function talkAnim(ln, on) {
    if (!R || !ln) return;
    const d = on ? ln.duration : 0;
    const P0 = players[0], P1 = players[1];
    let hero = null;
    if (ln.character === 'oswel') hero = P0; else if (ln.character === 'echo') hero = P1;
    else if (P0 && ln.character === P0.char && !(R.ents.npc || []).some((n) => n.id === ln.character)) hero = P0;
    else if (P1 && ln.character === P1.char) hero = P1;
    if (hero && hero.anim) { if (on) hero.anim.talk(d); else hero.anim.stopTalk(); }
    for (const n of R.ents.npc || []) {
      if (n.id !== ln.character) continue;
      const an = n.mesh.userData.anim;
      if (an) { if (on) an.talk(d); else an.stopTalk(); }
      if (on && P0) n.mesh.rotation.y = P0.x < n.x ? -0.45 : 0.45;
    }
  }
  if (OT.Dialogue) { OT.Dialogue.on('start', (ln) => talkAnim(ln, true)); OT.Dialogue.on('end', (ln) => talkAnim(ln, false)); }
  // salles secrètes des grands niveaux : on sait où elles sont (sections), on réagit en entrant
  function updateSecrets(alive) {
    if (!R.secretRooms) {
      const B = R.def.build;
      R.secretRooms = ((B && B.secs) || []).filter((sc) => sc.k === 'secret').map((sc) => ({ x0: sc.x0 + 6.6, x1: sc.x0 + 14, y0: 3.9, y1: 7, found: false }));
    }
    for (const sr of R.secretRooms) {
      if (sr.found) continue;
      const p = alive.find((q) => q.x > sr.x0 && q.x < sr.x1 && q.y > sr.y0 && q.y < sr.y1);
      if (!p) continue;
      sr.found = true;
      OT.Sound.ok(); OT.Input.rumble(p.i, 0.2, 0.4, 160);
      EXT.run('secretFound', sr, p, PX);   // 1.5 : quêtes, journal, boussole
      const L = R.def.secretLine;
      if (L && OT.Dialogue) {
        setTimeout(() => { if (R) OT.Dialogue.say(L[0], L[1], { priority: 2 }); }, 400);
        if (OT.Dialogue.remember) OT.Dialogue.remember('secret-' + worldId + '-' + levelIndex);
      } else heroBark('secret', p, { force: true });
    }
  }
  // en entrant dans une section pleine de pièges : « Attends… ça sent le piège. »
  const TRAPPY = new Set(['saws', 'hammers', 'crushers', 'pikes', 'presses', 'pistons', 'turrets', 'barrels', 'laserRun', 'heatRun', 'troll', 'fakeCoins', 'fakeFlag', 'doorTrio', 'wireCeil', 'elecRun', 'beltAcid', 'portalPick', 'linkPick']);
  function updateSectionBarks(alive) {
    const B = R.def.build; if (!B || !B.secs || !alive.length) return;
    const p = alive[0];
    const sec = B.secs.find((q) => p.x >= q.x0 && p.x < q.x1);
    if (!sec || sec === R.lastSec) return;
    R.lastSec = sec;
    if (TRAPPY.has(sec.k)) heroBark('trap_near', p);
  }

  function talkTo(n, p) {
    const lv = R.def.dialogs[n.talk || n.id];
    if (!lv) return;
    // on reparle au même personnage : il peut avoir autre chose à dire (et à faire)
    n.talks = (n.talks || 0) + 1;
    const again = n.talks > 1 && lv.again;
    const isAlt = !again && R.deaths >= 3 && lv.alt && lv.alt.length;
    let lines = again ? lv.again : isAlt ? lv.alt : lv.lines;
    const act = again ? lv.againAct : lv.act;
    // version 1.4 : une ligne peut être [texte, { who: 'oswel', if: 'w1' }] (réponse d'Oswel, souvenir)
    lines = (lines || []).map((t) => (Array.isArray(t) ? [(t[1] && t[1].who) || n.id, t[0], t[1]] : [n.id, t]));
    // version 1.5 : il se souvient de toi, parle de ce que tu as vécu, propose une quête, donne un indice (js/quetes.js)
    let more = null;
    if (OT.Quests && mode !== 'versus') {
      try {
        const alt = (lv.alt || []).map((t) => (Array.isArray(t) ? t[0] : t));
        more = OT.Quests.talk(n, { lines, again, isAlt, first: n.talks === 1, world: worldId, level: levelIndex, px: p ? p.x : n.x, alt });
      } catch (e) { console.warn('[quêtes]', e); more = null; }
      if (more && more.lines) lines = more.lines;
    }
    const an = n.mesh.userData.anim;
    if (an) { an.play(again ? 'interact' : 'wave'); an.expr('happy', 2.5); }   // il se tourne vers toi et répond
    state = 'dialog';
    OT.Sound.talk();
    OT.Input.rumble(-1, 0, 0.1, 30);
    const done = () => { OT.UI.show(null); if (state === 'dialog') state = 'play'; if (act) npcAct(act, n); };
    const after = () => { if (more && more.after) { try { more.after(done); } catch (e) { console.warn('[quêtes]', e); done(); } } else done(); };
    if (lines.length) OT.UI.dialog(lines, after); else after();
  }

  /* --- Ce que certains personnages FONT après avoir parlé ---
     Win Black (4-7) : « BLACKOUT » = il détourne l'énergie : les lasers s'éteignent et les blocs
     rose / bleu restent tous solides quelques secondes. Si on lui redemande : blackout TOTAL. */
  const BLACKOUT = 7;
  function npcAct(act, n) {
    EXT.run('npcAct', act, n, PX);   // 1.5 : les quêtes écoutent (« un seul blackout »)
    const helper = (R.ents.npc || []).find((o) => o.id === 'valdes');
    if (act === 'blackout') {
      R.blackout = BLACKOUT; R.blackoutFx = 0;
      if (n.mesh.userData.charge) n.mesh.userData.charge(1);
      particles.burst(n.x, n.y + 0.9, 46, [0x7fe6ff, 0xffffff, 0xf2a516], 9, { up: 3 });
      OT.Sound.zap(); setTimeout(() => OT.Sound.boom(), 120);
      OT.Input.rumble(-1, 1, 0.8, 450);
      if (OT.Light) players.forEach((p) => OT.Light.flash(p.i, 0x5fd4ff, 1.2));
      shake = Math.max(shake, 0.4);
      if (OT.Cam) OT.Cam.punch(0.1);
      bubble(n.x, n.y + 2.6, 'BLACKOUT.', 2.2, '#5fd4ff', 'Win Black');
      if (helper) setTimeout(() => R && R.blackout > 0 && bubble(helper.x, helper.y + 2.6, `Courant coupé ! Les blocs tiennent ${BLACKOUT} secondes. Fonce !`, 3, '#ff8a2b', 'Valdes'), 900);
    } else if (act === 'blackoutTotal') {
      // il a poussé trop loin : TOUT s'éteint (et le bonus est perdu)
      R.blackout = 0; R.blackoutTotal = 2.2; R.blackoutFx = 0;
      particles.burst(n.x, n.y + 0.9, 60, [0x7fe6ff, 0xffffff], 12, { up: 4 });
      OT.Sound.boom(); OT.Sound.setHum(0);
      OT.Input.rumble(-1, 1, 1, 700);
      if (OT.Light) players.forEach((p) => OT.Light.flash(p.i, 0x000000, 2.2));
      shake = Math.max(shake, 0.6);
      n.talks = 0;   // la prochaine fois, il recommence normalement
      setTimeout(() => { if (R && helper) bubble(helper.x, helper.y + 2.6, 'Je t\'avais prévenu… BLACKOUT TOTAL !', 3, '#ff8a2b', 'Valdes'); }, 1900);
    }
  }
  // lumières pendant le BLACKOUT (appelé à chaque image)
  const LBASE = {};
  function restoreLights() {
    if (!R || !R.blackoutDim) return;
    hemi.intensity = LBASE.h; sun.intensity = LBASE.s; rim.intensity = LBASE.r; lampA.intensity = LBASE.l; R.blackoutDim = 0;
    const veil = document.getElementById('blackout'); if (veil) veil.style.opacity = '0';
  }
  function blackoutLights(dt) {
    const on = (R.blackout || 0) > 0 || (R.blackoutTotal || 0) > 0;
    if (!on && !R.blackoutDim) return;
    if (!R.blackoutDim) { LBASE.h = hemi.intensity; LBASE.s = sun.intensity; LBASE.r = rim.intensity; LBASE.l = lampA.intensity; R.blackoutDim = 1; }
    R.blackoutFx = (R.blackoutFx || 0) + dt;
    let target = 1;
    if (R.blackoutTotal > 0) target = R.blackoutTotal < 0.35 ? 0.4 : 0.03;
    else if (R.blackout > 0) {
      // coupure : clignote, puis pénombre ; à la fin, le courant revient en grésillant
      target = R.blackoutFx < 0.45 ? (Math.sin(R.blackoutFx * 60) > 0 ? 0.12 : 0.55) : 0.32;
      if (R.blackout < 1.5 && Math.sin(R.blackoutFx * 30) > 0.3) target = 0.85;
    }
    R.blackoutDim += (target - R.blackoutDim) * Math.min(1, dt * 14);
    const k = R.blackoutDim;
    // un voile noir par-dessus la scène (le ciel et les écrans lumineux s'assombrissent aussi)
    let veil = document.getElementById('blackout');
    if (!veil) { veil = document.createElement('div'); veil.id = 'blackout'; document.body.appendChild(veil); }
    veil.style.opacity = Math.max(0, Math.min(0.94, (1 - k) * (R.blackoutTotal > 0 ? 0.97 : 0.75))).toFixed(3);
    hemi.intensity = LBASE.h * k; sun.intensity = LBASE.s * k; rim.intensity = LBASE.r * k; lampA.intensity = LBASE.l * k;
    if (!on && Math.abs(k - 1) < 0.02) restoreLights();
  }

  function hudData() {
    const newCoins = R.picked.filter((pk) => !(who[0] && who[0].collected && who[0].collected.has(pk.i))).length;
    const extra = [];
    for (const tp of R.ents.tagopen || []) {
      const T = R.tags[tp.g];
      if (T && T.closed) extra.push(`${tp.label} fermée ✓`);
      else if (T && T.t > 0) extra.push(`${tp.label} ouverte ${T.t.toFixed(1)} s`);
    }
    for (const g in R.comp) { const C = R.comp[g]; if (C.t >= 0 && C.built < C.n) extra.push(`Construction ${C.built}/${C.n}`); }
    if (R.rival) extra.push(R.rival.done ? `${R.rival.name} est arrivé avant toi` : `Course contre ${R.rival.name}`);
    if (R.cpOn) extra.push('Drapeau atteint');
    if (R.zones > 1) extra.push(`Zone ${R.zone}/${R.zones}`);
    if (R.cpAt) extra.push('Point de reprise ✓');
    const data = {
      title: `${worldId}-${R.def.secret ? 'S' : levelIndex + 1} · ${R.def.title}`,
      goal: R.def.goal || 'Atteins la porte SORTIE.',
      deaths: R.deaths, time: R.timer, mode, score: score.slice(),
      coins: R.picked.length, coinCount: R.coinCount, newCoins,
      part: (R.ents.part || []).length ? R.hasPart : null,
      power: R.hasElec ? (R.powerOffT > 0 ? Math.max(0, R.powerOffT) : -1) : null,
      extra,
    };
    if (EXT.has('hud')) EXT.run('hud', data, PX);   // version 1.5 : gadget, étoiles, distance coop…
    return data;
  }

  /* ==================================================================
     10. API utilisée par l'interface (ui.js)
     ================================================================== */
  /* --- Cinématique d'introduction d'un monde : la caméra survole le premier niveau --- */
  let cine = null;
  const CINE_SCENE = 3.6;
  function updateCine(dt) {
    cine.t += dt;
    // version 1.4 : chaque plan dure au moins le temps que le narrateur finisse sa phrase
    if (!cine.ends) {
      let acc = 0;
      cine.ends = cine.scenes.map((sc) => (acc += Math.max(CINE_SCENE, OT.Dialogue ? OT.Dialogue.line('narrateur', sc.text).duration + 0.9 : CINE_SCENE)));
    }
    let i = cine.ends.findIndex((e) => cine.t < e); if (i < 0) i = cine.scenes.length - 1;
    if (i !== cine.i || !cine.started) {
      cine.i = i; cine.started = true;
      OT.UI.cineText(cine.scenes[i].text, i, cine.scenes.length);
      if (OT.Dialogue) OT.Dialogue.say('narrateur', cine.scenes[i].text, { priority: 3, subtitle: false });
    }
    R.cineCam = cine.scenes[i].cam;
    if (cine.t >= cine.ends[cine.ends.length - 1]) endCine();
  }
  function endCine() {
    if (!cine) return;
    if (OT.Dialogue) OT.Dialogue.stop();
    const cb = cine.onDone;
    cine = null;
    if (R) R.cineCam = null;
    state = 'idle';
    OT.UI.cineText(null);
    cb && cb();
  }

  return {
    init, applyQuality,
    showBackdrop(world) {
      mode = 'solo'; who = [];
      if (world) worldId = world;
      buildLevel(0);
      makePlayers();
      players.forEach((p) => (p.mesh.visible = false));
      state = 'idle';
      camMode('off');
      cam.x = 10; cam.y = 4; cam.z = 14;
    },
    // whoInfo = [{ name, skin:{color, acc}, collected:Set }, …]
    play(m, idx, whoInfo, keepScore, world) {
      mode = m; levelIndex = idx;
      if (world) worldId = world;
      if (whoInfo) who = whoInfo;
      if (!keepScore) { score[0] = 0; score[1] = 0; }
      buildLevel(idx);
      // version en ligne : les voix des personnages du niveau se chargent pendant l'introduction
      if (OT.Dialogue && OT.Dialogue.preloadLevel) OT.Dialogue.preloadLevel(R.def);
      makePlayers();
      OT.UI.bossBar(null);
      state = 'play';
      // caméra : on part de loin et on plonge vers le héros (plus court si on recommence le même niveau)
      const fight = R.boss && !R.bossWait;
      camMode(fight ? 'fit' : 'level');
      if (OT.Cam) {
        const key = worldId + ':' + idx, again = key === lastIntro; lastIntro = key;
        if (fight) OT.Cam.cine({ zoom: 1.3, yaw: -0.32, pitch: 0.28, dur: 2.2 });
        else if (again) OT.Cam.cine({ zoom: 1.25, yaw: 0.18, pitch: 0.1, dur: 0.7 });
        else {
          // version 1.3 : on montre d'abord le stade en grand (vue large, légère rotation), puis le départ
          OT.Cam.cine({ zoom: 1, yaw: 0.36, pitch: 0.2, dur: 1.9 });
          const sp = R.spawn, depth = Math.min(56, 30 + R.H * 1.2);
          R.intro = { t: 0, dur: 1.9, x: Math.min(R.W - 10, sp.x + 22), y: Math.max(sp.y + 4, R.H * 0.55), z: depth };
        }
      }
      updateCamera(0, true);
      players.forEach((p) => p.anim && p.anim.emote());   // l'émote choisie dans la boutique, en entrant
      OT.UI.hud(hudData());
      if (fight) {
        bossOps(R.boss).start(R.boss);
        R.boss.told[0] = true;
        combatEvent('debut'); combatCine('intro', { title: (WD().bossText.name || 'Le Gardien de la Forge').toUpperCase(), sub: R.def.title || '' });
      }
      const intro = R.bossWait ? [] : (R.def.intro || []).concat(R.boss ? WD().bossText.phases[0].tell : []);
      if (intro.length) { state = 'dialog'; OT.UI.dialog(intro, () => { state = 'play'; if (fight) setTimeout(() => combatEvent('intro'), 600); }); }
      else if (!R.boss) { const R0 = R; setTimeout(() => { if (R === R0 && state === 'play') heroBark('start'); }, 2200); }
      if (R.bossWait) {
        // l'antichambre du boss : on la traverse d'abord (bandeau de zone + objectif)
        const ap = R.def.build.approach;
        OT.UI.goal(ap.goal || 'Rejoins l\'arène du boss.');
      } else OT.UI.goal(R.def.goal || 'Atteins la porte SORTIE.');
      if (OT.Music) OT.Music.play(fight ? 'boss' + worldId : 'world' + worldId);
      if (OT.Light) players.forEach((p) => OT.Light.set(p.i, p.color));
      EXT.run('levelStart', R, PX);   // version 1.5
    },
    // Mode fête : une manche d'une activité. modeDef = règles (party.js), arena = niveau,
    // whoInfo = [{ name, skin }] (2 à 4 joueurs), devs = appareil de chaque joueur
    playParty(modeDef, arena, whoInfo, devs, opts) {
      mode = 'party'; PM = modeDef; partyDevs = devs.slice(); who = whoInfo; levelIndex = 0;
      if (OT.Input.setPartyDevices) OT.Input.setPartyDevices(partyDevs);
      buildLevel(0, arena);
      R.party = { countdown: 3.2, t: 0, over: false, opts: opts || {}, inputs: [], n: whoInfo.length };
      if (PM.noRestore) R.noRestore = true;
      if (PM.crumbleDelay) R.crumbleDelay = PM.crumbleDelay;   // Sol de lave : temps qu'on peut rester sur un bloc
      if (PM.standCrumble) R.standCrumble = true;
      if (PM.setup) PM.setup(R.party, PX);
      makePlayers();
      if (PM.init) PM.init(R.party, PX);
      OT.UI.bossBar(null);
      state = 'play';
      camMode((R.def.camera || PM.camera) === 'fit' ? 'fit' : 'level');
      if (OT.Cam) OT.Cam.cine({ zoom: 1.4, yaw: 0.3, pitch: 0.2, dur: 1.4 });
      updateCamera(0, true);
      OT.UI.partyHud(PM.hud(R.party, PX));
      OT.UI.countdown(3);
      OT.Sound.menu();
      if (OT.Music) OT.Music.play('party');
      if (OT.Light) players.forEach((p) => OT.Light.set(p.i, p.color));
    },
    restart() {
      if (mode === 'party' && R) { const S = R.party; this.playParty(PM, R.def, who, partyDevs, S && S.opts); return; }
      this.play(mode, levelIndex, null, true);
    },
    setPaused(v) {
      if (v && state === 'play') state = 'pause'; else if (!v && state === 'pause') state = 'play';
      if (OT.Dialogue) { if (v) OT.Dialogue.pause(); else OT.Dialogue.resume(); }   // la voix s'arrête avec le jeu
    },
    quit() {
      OT.Sound.setHum(0); OT.UI.bossBar(null);
      if (OT.Input.setPartyDevices) OT.Input.setPartyDevices(null);
      PM = null; partyDevs = [];
      this.showBackdrop(); if (OT.Music) OT.Music.play('menu');
    },
    // Cinématique : scenes = [{ text, cam:{x,y,z} }, …]
    cinematic(world, scenes, onDone) {
      this.showBackdrop(world);
      cine = { scenes, t: 0, i: 0, onDone, started: false };
      state = 'cine';
      R.cineCam = scenes[0].cam;
      cam.x = scenes[0].cam.x - 6; cam.y = scenes[0].cam.y + 2; cam.z = scenes[0].cam.z + 6;
      if (OT.Music) OT.Music.play('world' + world);
    },
    skipCine() { endCine(); },
    get world() { return worldId; },
    get state() { return state; },
    get mode() { return mode; },
    get levelIndex() { return levelIndex; },
    get renderer() { return renderer; },
    get partyApi() { return PX; },
    // version 1.5 : l'API des modules (voir js/extensions.js)
    get api() { return PX; },
    get ext() { return EXT; },
    slowmo: (scale, dur) => slowmo(scale, dur),
    // réglages de la physique (lus par les tests automatiques)
    PHYS: { MAX_V, RUN_MUL, ACC_GROUND, ACC_AIR, FRICTION, TURN_BOOST, GRAV, JUMP_V },
    // pour les tests automatiques uniquement
    get _dbg() { return { R, players, time, renderer, scene }; },
    _sim(n, inputFn, step) {
      const st = step || 1 / 60;
      for (let k = 0; k < n && R && !R.done && (state === 'play' || state === 'dialog'); k++) {
        while (state === 'dialog' && OT.UI.dialogOpen) OT.UI._closeDialog();
        time += st;
        const np = Math.max(2, players.length);
        const inp = Array.from({ length: np }, (_, i) => Object.assign({ left: false, right: false, jump: false, jumpP: false, talk: false, talkP: false, run: 0, analog: 1 }, inputFn ? inputFn(k, i) : {}));
        simulate(st, inp);
      }
    },
    SPEEDS, gameSpeed,
  };
})();
