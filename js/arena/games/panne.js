/* =====================================================================
   🤝 PANNE GÉNÉRALE — tout le monde dans la même équipe
   🕵️ LE TRAÎTRE   — la même machine… mais l'un de vous la sabote
   La Grande Machine est en panne : il faut la réparer à 100 % avant la
   fin du temps. 4 postes (🔴 Générateur, 🔵 Ordinateur, 🟢 Refroidis-
   sement, 🟡 Électricité), 3 rayons de pièces (🔌 ⚙️ 🧊), et Oncle Patou
   qui joue le contremaître.
   - A : agir (maintenir pour réparer, taper vite, prendre / poser une
     pièce, actionner un levier, répondre à la question du Carnet) ;
   - B : extincteur ;
   - des URGENCES : surchauffe, panne électrique, incendie, porte
     bloquée, surcharge, fuite, virus, coupure générale.
   Machine réparée : l'équipe gagne, chacun marque selon ses réparations.
   Machine explosée : 1 point chacun.
   LE TRAÎTRE : rôles secrets (« tout le monde ferme les yeux »), le
   traître fait baisser les jauges en ayant l'air de réparer, déclenche
   de fausses alertes, coupe le courant, bloque une porte… À la fin :
   QUI EST LE TRAÎTRE ? On vote en se plaçant sur un socle.
   ---------------------------------------------------------------------
   v1.4 — LA GRANDE USINE (31 × 17, avant 23 × 13) :
   - la Grande Machine grandit (7 × 5) au centre ; au-dessus et en
     dessous, ses CONDUITS forment deux COULOIRS : ce sont les seuls
     passages entre la moitié gauche et la moitié droite de l'usine.
     Chacun a sa PORTE (rayures jaunes) qui peut se bloquer ;
   - quatre ATELIERS dans les coins (un poste chacun), séparés des halls
     du milieu par des cloisons (une porte de 2 cases + une grande
     ouverture côté machine) ;
   - les rayons de pièces sont loin des postes qui en ont besoin :
     🔌 fusibles à gauche (pour l'Électricité, en bas à droite),
     🧊 liquide froid en haut à droite (pour le Refroidissement, en bas
     à gauche), ⚙️ engrenages en haut à gauche (pour les 4 côtés de la
     machine) → il faut traverser l'usine, souvent par un couloir ;
   - disjoncteurs dans les 4 coins, dalles A/B/C du Carnet dans le hall
     de droite, socles de vote du Traître devant les entrées des couloirs ;
   - le feu qui s'étend fume d'abord (0,9 s, onde orange au sol) avant de
     prendre : on peut l'éviter, et le jeu prévient les humains tout près.
   Plan (# mur, M machine, P conduits, | portes, G/O/F/E postes,
   g/c/f rayons, T dalles, v socles de vote, b disjoncteurs) :
         0123456789012345678901234567890
      1  #b..GG...gg..PPPPP..cc...OO..b#
      3  #.........v....|....v.........#
      5  #####..###.....|.....###..#####
      8  #f..........MMMMMMM....T.T.T..#
     11  #####..###.....|.....###..#####
     13  #.........v....|....v.........#
     15  #b..FF.......PPPPP.......EE..b#
   ===================================================================== */
(function () {
  const W = 31, D = 17, TIME = 150, R = 1.25;
  // TOUTES les coordonnées de l'usine sont ici (x, z en cases ; un point « x.5 » = le centre d'une case)
  const ST = {
    gen:   { name: 'Générateur', icon: '🔴', color: 0xe8473a, x: 5.0, z: 2.5, cells: [[4, 1], [5, 1]] },
    ordi:  { name: 'Ordinateur', icon: '🔵', color: 0x3d8bff, x: 26.0, z: 2.5, cells: [[25, 1], [26, 1]] },
    froid: { name: 'Refroidissement', icon: '🟢', color: 0x34c26b, x: 5.0, z: 14.5, cells: [[4, 15], [5, 15]] },
    elec:  { name: 'Électricité', icon: '🟡', color: 0xf2c230, x: 26.0, z: 14.5, cells: [[25, 15], [26, 15]] },
  };
  const SHELF = {
    fuse:    { name: 'Fusibles', one: 'Fusible', icon: '🔌', color: 0xff6f3a, x: 2.5, z: 8.5, cells: [[1, 7], [1, 8], [1, 9]] },
    gear:    { name: 'Engrenages', one: 'Engrenage', icon: '⚙️', color: 0xc9c9c9, x: 10.0, z: 2.5, cells: [[9, 1], [10, 1]] },
    coolant: { name: 'Liquide froid', one: 'Liquide froid', icon: '🧊', color: 0x5ad1ff, x: 21.0, z: 2.5, cells: [[20, 1], [21, 1]] },
  };
  const MACH = { x0: 12, x1: 18, z0: 6, z1: 10 };
  const MC = { x: (MACH.x0 + MACH.x1 + 1) / 2, z: (MACH.z0 + MACH.z1 + 1) / 2 };   // le centre de la machine (15,5 ; 8,5)
  const CHIM = { x: MC.x + 2.55, z: MC.z - 0.6 };                                    // la cheminée (vapeur de la surchauffe)
  // les conduits de la machine (murs) : ils ferment le haut et le bas du milieu → deux couloirs
  const PIPES = [{ x0: 13, x1: 17, z0: 1, z1: 2 }, { x0: 13, x1: 17, z0: 14, z1: 15 }];
  // les cloisons des ateliers des coins (rangées z = 5 et z = 11)
  const ROOM_X = [1, 2, 3, 4, 7, 8, 9, 21, 22, 23, 26, 27, 28, 29], ROOM_Z = [5, 11];
  // quelques caisses dans les ateliers (on contourne, on s'abrite)
  const CRATES = [[7, 3], [23, 3], [7, 13], [23, 13]];
  const PORTS = { n: { x: MC.x, z: MACH.z0 - 0.65, name: 'nord' }, s: { x: MC.x, z: MACH.z1 + 1.65, name: 'sud' }, w: { x: MACH.x0 - 0.65, z: MC.z, name: 'ouest' }, e: { x: MACH.x1 + 1.65, z: MC.z, name: 'est' } };
  const BREAKERS = [{ x: 1.6, z: 1.6 }, { x: W - 1.6, z: 1.6 }, { x: 1.6, z: D - 1.6 }, { x: W - 1.6, z: D - 1.6 }];
  const DOORS = { haut: { x: 15, z: [3, 4, 5], cx: 15.5, cz: 4.5, name: 'DU HAUT' }, bas: { x: 15, z: [11, 12, 13], cx: 15.5, cz: 12.5, name: 'DU BAS' } };
  const LEAKS = [{ x: 11.5, z: 5.5 }, { x: 19.5, z: 5.5 }, { x: 11.5, z: 11.5 }, { x: 19.5, z: 11.5 }];
  const TILES = [{ x: 23.5, z: 8.5, l: 'A', c: 0xff8a2b }, { x: 25.5, z: 8.5, l: 'B', c: 0xb78cff }, { x: 27.5, z: 8.5, l: 'C', c: 0x2fd3d3 }];
  const QUIZ_LAB = { x: 25.5, z: 7.1 };                                              // la question, au-dessus des dalles
  const SPAWN = [[9.5, 7.5], [21.5, 7.5], [9.5, 9.5], [21.5, 9.5]];
  const PEDS = [[10.5, 3.5], [20.5, 3.5], [10.5, 13.5], [20.5, 13.5]];               // les socles de vote du Traître
  const IDLE = [[7.5, 8.5], [21.5, 8.5], [11.5, 3.5], [19.5, 3.5], [11.5, 13.5], [19.5, 13.5]];   // où les bots attendent
  const FIRE_MAX = 16;

  const BASE = [
    { id: 'gen', kind: 'hold', text: 'Réparer le générateur', icon: '🔧', at: 'gen', need: 6, gain: 6, patou: 'le générateur, maintiens A dessus !' },
    { id: 'ordi', kind: 'hold', text: 'Redémarrer l\'ordinateur', icon: '💻', at: 'ordi', need: 5, gain: 5, patou: 'redémarre l\'ordinateur !' },
    { id: 'cool', kind: 'deliver', text: 'Recharger le refroidissement', icon: '🧊', at: 'froid', part: 'coolant', gain: 6, patou: 'du liquide froid 🧊 au refroidissement !' },
    { id: 'fuse', kind: 'deliver', text: 'Changer un fusible', icon: '🔌', at: 'elec', part: 'fuse', gain: 6, patou: 'un fusible 🔌 à l\'électricité !' },
    { id: 'gear', kind: 'deliver', text: 'Remplacer un engrenage', icon: '⚙️', at: 'port', part: 'gear', gain: 6, patou: 'un engrenage ⚙️ côté {port} !' },
    { id: 'bolt', kind: 'mash', text: 'Serrer les boulons', icon: '🔩', at: 'port', need: 22, gain: 5, patou: 'serre les boulons côté {port} (tape A) !' },
    { id: 'duo', kind: 'duo', text: 'Calibrage à deux', icon: '🤝', at: 'duo', need: 2.5, gain: 9, patou: 'calibrage à deux : un de chaque côté de la machine !' },
    { id: 'quiz', kind: 'quiz', text: 'Question de l\'ordinateur', icon: '💻', at: 'ordi', gain: 6, patou: 'l\'ordinateur pose une question du Carnet !' },
  ];
  const EVENTS = {
    surchauffe: { text: 'SURCHAUFFE !', sub: 'Maintiens A au Refroidissement 🟢', icon: '🌡️', kind: 'hold', at: 'froid', need: 3, timer: 16, loss: 8, patou: 'Ça chauffe ! Tout le monde au refroidissement !' },
    panne:      { text: 'PANNE ÉLECTRIQUE !', sub: 'Apporte un fusible 🔌 à l\'Électricité 🟡', icon: '🔌', kind: 'deliver', at: 'elec', part: 'fuse', timer: 22, loss: 8, patou: 'Plus de jus ! Un fusible à l\'électricité, vite !' },
    incendie:   { text: 'INCENDIE !', sub: 'Maintiens B : extincteur', icon: '🔥', kind: 'fire', patou: 'Au feu ! Extincteur, bouton B !' },
    porte:      { text: 'PORTE BLOQUÉE !', sub: 'Maintenez A devant pour la forcer', icon: '🚪', kind: 'door', need: 3, timer: 25, patou: 'La porte s\'est coincée. Forcez-la à deux, c\'est plus rapide !' },
    surcharge:  { text: 'SURCHARGE !', sub: 'Tape A très vite à l\'Électricité 🟡', icon: '⚡', kind: 'mash', at: 'elec', need: 14, timer: 13, loss: 8, patou: 'Surcharge ! Tapez A à l\'électricité !' },
    fuite:      { text: 'FUITE !', sub: 'Maintiens A sur la fuite (attention, ça glisse)', icon: '💧', kind: 'leak', need: 3, patou: 'Une fuite d\'huile ! Bouchez-la avant de glisser partout.' },
    virus:      { text: 'VIRUS INFORMATIQUE !', sub: 'Tape A très vite sur l\'Ordinateur 🔵', icon: '🦠', kind: 'mash', at: 'ordi', need: 16, timer: 15, loss: 6, patou: 'Un virus ! Tapez A sur l\'ordinateur, vite !' },
    coupure:    { text: 'COUPURE GÉNÉRALE !', sub: 'Rallumez les 4 disjoncteurs aux coins (A)', icon: '🌑', kind: 'multi', timer: 25, loss: 10, patou: 'Le noir complet ! Les 4 disjoncteurs, dans les coins !' },
  };
  // moins on est nombreux, plus chaque réparation compte
  const MULT = [1, 3.7, 2.3, 1.32, 1.0];
  // la machine s'adapte au niveau des bots : avec des bots forts, elle est plus coriace
  const DIFF = {
    facile:    { gain: 1.75, ev: 1.25, timer: 1.3 },
    normal:    { gain: 1, ev: 1, timer: 1 },
    difficile: { gain: 0.6, ev: 0.85, timer: 0.9 },
    chaos:     { gain: 0.7, ev: 0.7, timer: 0.9 },
  };
  const GAIN = 0.74;           // v1.4 : l'usine est plus grande (plus de trajets) → chaque réparation compte plus

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function isMach(x, z) { return x >= MACH.x0 && x <= MACH.x1 && z >= MACH.z0 && z <= MACH.z1; }
  function base(x, z) {
    if (x === 0 || z === 0 || x === W - 1 || z === D - 1) return 1;
    if (isMach(x, z)) return 1;
    if (PIPES.some((p) => x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1)) return 1;
    if (ROOM_Z.includes(z) && ROOM_X.includes(x)) return 1;
    for (const k in ST) if (ST[k].cells.some(([cx, cz]) => cx === x && cz === z)) return 1;
    for (const k in SHELF) if (SHELF[k].cells.some(([cx, cz]) => cx === x && cz === z)) return 1;
    if (CRATES.some(([cx, cz]) => cx === x && cz === z)) return 2;
    return 0;
  }
  const near = (P, p, r = R) => Math.hypot(P.x - p.x, P.z - p.z) <= r;
  const isTraitor = (A, P) => A.S.tr && P.i === A.S.traitor;

  /* ==================================================================
     LES DEUX ACTIVITÉS
     ================================================================== */
  function makeDef(TR) {
    return {
      id: TR ? 'traitre' : 'panne',
      name: TR ? 'Le Traître' : 'Panne générale',
      icon: TR ? '🕵️' : '🤝',
      color: TR ? '#b78cff' : '#ffcc33',
      theme: 'machine', music: 'panne', variant: TR,
      tagline: TR ? 'Réparez la machine… mais l\'un de vous est un traître. Démasquez-le !' : 'Tous dans la même équipe : réparez la Grande Machine avant qu\'elle explose !',
      rules: TR ? [
        'Rôles secrets : tout le monde ferme les yeux, le jeu appelle chaque joueur l\'un après l\'autre pour lui montrer son rôle.',
        'Les innocents réparent la machine comme dans Panne générale. Le traître fait semblant… mais ses réparations font BAISSER les jauges.',
        'Le traître peut aussi couper le courant (A sur un disjoncteur), bloquer une porte (A au milieu d\'un couloir) ou lancer une fausse alerte (B maintenu loin du feu).',
        'À la fin : QUI EST LE TRAÎTRE ? Va sur le socle de ton suspect. Les innocents gagnent s\'ils le trouvent ET si la machine est réparée.',
      ] : [
        'COOPÉRATION : réparez la machine à 100 % avant la fin du temps. Si elle explose, toute l\'équipe perd.',
        'A : agir. Maintiens pour réparer, tape vite pour serrer, prends une pièce au rayon puis pose-la au bon poste, réponds aux questions du Carnet.',
        'B : extincteur. URGENCES : surchauffe, panne électrique, incendie, porte bloquée, surcharge, fuite, virus, coupure générale !',
        'Oncle Patou distribue le travail. Machine réparée : chacun marque selon ses réparations (le meilleur est l\'employé du mois).',
      ],
      // la fiche de présentation (v1.4)
      goal: TR ? 'Réparez la machine… et démasquez le traître qui la sabote en douce !' : 'Tous ensemble : réparez la Grande Machine à 100 % avant la fin du temps.',
      howto: TR ? [
        'Ton rôle est SECRET : quand le jeu le demande, tout le monde ferme les yeux.',
        'Innocent : répare comme dans Panne générale ({a} agir, {b} extincteur)… et observe.',
        'Traître : tes réparations font BAISSER les jauges. {a} sur un disjoncteur ou au milieu d\'un couloir, {b} maintenu loin du feu : farces !',
        'À la fin, monte sur le socle de ton suspect pour voter.',
      ] : [
        'Suis les flèches : 🟡 réparation, 🔴 urgence. Maintiens ou tape {a} au poste.',
        'Pièces : {a} au rayon (🔌 ⚙️ 🧊) pour en prendre une, puis {a} au bon poste.',
        '{b} maintenu : extincteur contre le feu 🔥.',
        'Les couloirs du haut et du bas relient les deux moitiés de l\'usine.',
      ],
      danger: TR ? 'Quelqu\'un fait baisser les jauges, coupe le courant ou lance de fausses alertes… mais qui ?'
        : 'Les urgences (surchauffe, incendie, porte bloquée, coupure…) font reculer la machine si personne ne s\'en occupe à temps.',
      win: TR ? 'Innocents : machine réparée ET traître démasqué au vote. Traître : faire échouer l\'un des deux.'
        : 'Machine réparée : toute l\'équipe gagne, chacun marque selon ses réparations.',
      lose: TR ? 'Machine explosée ou mauvais suspect : le traître gagne.' : 'Machine explosée : toute l\'équipe a perdu.',
      tuto: TR ? ['Déplace-toi : {move}', '{a} : agir (ou saboter, si tu es le traître…)', '{b} : extincteur (maintenir)']
        : ['Déplace-toi : {move}', '{a} : agir (maintenir, taper, prendre une pièce)', '{b} : extincteur (maintenir)'],
      controls: TR ? { a: 'Agir (traître : saboter)', b: 'Extincteur (traître : fausse alerte)' } : { a: 'Agir (maintenir / taper)', b: 'Extincteur' },
      rounds: 1, scoreName: 'contribution', elimName: 'urgences', maxRound: TIME + (TR ? 140 : 5),
      view: () => ({ x0: 0, z0: 0, x1: W, z1: D }),
      tilt: 36,
      camMin: 0.74,        // grande usine : la caméra suit l'équipe mais garde presque tout en vue
      knockDrag: 5,
      goals(A) { return goalsOf(A); },
      // la caméra garde les URGENCES dans le cadre (feu, disjoncteurs, porte…) ; au vote : les socles
      focus(A) {
        const S = A.S;
        if (S.mode === 'vote') return S.peds || null;
        const out = [];
        for (const j of S.jobs) if (j.urgent && !j.fake) for (const p of j.pts) if (!p.on) out.push(p);
        for (const f of S.fires.slice(0, 4)) out.push({ x: f.x + 0.5, z: f.z + 0.5 });
        return out;
      },

      setup(A) { A.S.contrib = A.fill(A.n, 0); },
      round(A) { setupRound(A, TR); },
      go(A) {
        const S = A.S;
        if (S.mode === 'roles') return;      // l'écran des rôles explique tout
        if (TR && !S.tr) A.banner('RÉPAREZ LA MACHINE !', 'À 2, pas de traître : coopération classique', '#ffcc33', 2.6);
        else A.banner(S.tr ? '🕵️ UN TRAÎTRE EST PARMI VOUS' : 'RÉPAREZ LA MACHINE !', `machine ${OT.Arena.LEVELS[S.lvl].name} · A : agir · B : extincteur`, S.tr ? '#b78cff' : '#ffcc33', 2.4);
        patou(A, 'Au boulot, l\'équipe ! Je vous dis quoi faire, vous le faites.', 2);
      },
      // pendant la distribution des rôles, personne ne bouge (mais l'entraînement reste libre)
      lockMove(A) { return A.S.mode === 'roles' && A.phase === 'play'; },
      speedMod(A, P) { return P.data.part ? 0.92 : 1; },
      grip(A, P) { return A.S.oil.has(Math.floor(P.z) * W + Math.floor(P.x)) ? 2.2 : 24; },
      update(A, dt) { update(A, dt); },
      draw(A, dt, time) { drawAll(A, dt, time); },
      hud(A) { return hud(A); },
      rush(A) { const S = A.S; return S.mode === 'vote' ? 1.1 : TIME - S.gt < 20 ? 1.15 : (S.jobs.some((j) => j.urgent) ? 1.07 : 1); },
      teamResult(A) { return teamResult(A); },
      timeoutRank() { return { text: 'Temps écoulé !' }; },
      stats(A, P) {
        const s = A.stats[P.i];
        const l = [`${s.tasks || 0} réparation${(s.tasks || 0) > 1 ? 's' : ''}`, `${s.kills || 0} urgence${(s.kills || 0) > 1 ? 's' : ''} réglée${(s.kills || 0) > 1 ? 's' : ''}`, `${s.fires || 0} feu${(s.fires || 0) > 1 ? 'x' : ''} éteint${(s.fires || 0) > 1 ? 's' : ''}`];
        if (A.S.tr) l.push(isTraitor(A, P) ? `${A.S.sabotage || 0} sabotage${(A.S.sabotage || 0) > 1 ? 's' : ''}` : P.data.voted >= 0 ? `a voté ${A.players[P.data.voted].name}` : 'n\'a pas voté');
        return l;
      },
      bonus(A, P) {
        const o = [], s = A.stats[P.i], S = A.S;
        if (S.tr && isTraitor(A, P)) o.push('🕵️ Le traître');
        if (S.ok && !isTraitor(A, P) && mvpOf(A) === P.i) o.push('Employé du mois');
        if (S.tr && S.voteDone && P.data.voted === S.traitor) o.push('Fin limier');
        if ((s.fires || 0) >= 5) o.push('Pompier');
        if ((s.deliver || 0) >= 3) o.push('Livreur express');
        if ((s.quiz || 0) >= 2) o.push('Premier de la classe');
        return o;
      },
      bot(A, P, B, L) { return botAct(A, P, B, L); },
      cleanup() { const el = typeof document !== 'undefined' && document.getElementById('arole'); if (el) el.hidden = true; },
    };
  }
  OT.Arena.register(makeDef(false));
  OT.Arena.register(makeDef(true));

  function mvpOf(A) { const c = A.S.contrib; let b = -1; for (let i = 0; i < A.n; i++) if (!isTraitor(A, A.players[i]) && (b < 0 || c[i] > c[b])) b = i; return b; }
  function credit(A, i, v) { const S = A.S; if (isTraitor(A, A.players[i]) && v > 0) v *= 0.5; S.contrib[i] += v; A.score[i] = Math.round(S.contrib[i]); }
  function patou(A, text, prio = 1) {
    const S = A.S;
    if (S.say && S.say.until > A.clock && S.say.prio > prio) return;
    S.say = { text, until: A.clock + 4.5, prio };
  }

  /* ==================================================================
     MISE EN PLACE
     ================================================================== */
  function setupRound(A, TR) {
    const S = A.S;
    A.buildGrid(W, D, base, 'machine');
    Object.assign(S, {
      prog: 0, jobs: [], nextId: 1, fires: [], smolder: [], fireId: 1, oil: new Set(), oilList: [], door: null, blackout: false, invert: null,
      nextEv: 13, bag: [], baseWait: 0, ok: false, ended: false, assignAt: 0, spreadT: 0, oilT: 0, lastPct: -1,
      baseMax: A.n >= 3 ? 3 : 2, t0: 0, gt: 0, mode: 'play', say: null, quizBag: [],
      tr: TR && A.n >= 3, traitor: -1, prankCd: 25, bHold: 0, doorHold: 0, sabT: 0, sabotage: 0, accuseSaid: false, sus: A.players.map(() => A.fill(A.n, 0)),
    });
    // v1.4 : la machine prend la MOYENNE des niveaux des bots (avant : le plus fréquent, et en cas
    // d'égalité le premier de la liste → des bots mélangés donnaient toujours une machine « Facile »)
    const bl = A.players.filter((P) => !P.human).map((P) => DIFF[P.level.id] || DIFF.normal);
    const avg = (k) => (bl.length ? bl.reduce((a, d) => a + d[k], 0) / bl.length : DIFF.normal[k]);
    S.dk = { gain: avg('gain'), ev: avg('ev'), timer: avg('timer') };
    S.lvl = Object.keys(DIFF).sort((a, b) => Math.abs(DIFF[a].gain - S.dk.gain) - Math.abs(DIFF[b].gain - S.dk.gain))[0];
    // v1.4 : on compte ceux qui RÉPARENT vraiment (avec un traître, un joueur de moins… qui sabote en plus)
    const crew = Math.max(1, Math.min(4, A.n - (S.tr ? 1 : 0)));
    S.mult = MULT[crew] * GAIN * S.dk.gain * (S.tr ? (crew <= 2 ? 1.4 : 1.12) : 1);
    // seul ou à deux dans la grande usine, les urgences sont plus espacées, durent plus longtemps
    // et le feu s'étend moins (sinon on passe la partie à courir d'un coin à l'autre)
    S.evMul = (crew === 1 ? 1.6 : crew === 2 ? 1.25 : 1) * S.dk.ev;
    S.tMul = (crew === 1 ? 1.3 : crew === 2 ? 1.1 : 1) * S.dk.timer;
    S.fireMax = crew === 1 ? 9 : crew === 2 ? 12 : FIRE_MAX;
    A.players.forEach((P, i) => {
      A.place(P, SPAWN[i % 4][0], SPAWN[i % 4][1]); P.speed = 4.5; P.r = 0.3;
      P.data = { part: null, voted: -1 };
    });
    if (S.tr) {
      S.traitor = A.rint(0, A.n - 1);
      const humans = A.players.filter((P) => P.human).map((P) => P.i);
      if (humans.length) { S.mode = 'roles'; S.reveal = { queue: humans, k: 0, step: 'wait', t: 0, key: '' }; }
    }
    if (!A.headless) buildScene(A);
    for (let k = 0; k < S.baseMax; k++) addBase(A);
  }

  /* ==================================================================
     LA BOUCLE
     ================================================================== */
  function update(A, dt) {
    const S = A.S;
    // les bras levés quand on travaille
    for (const P of A.players) { if (P.data.workT > 0) { P.data.armL = P.data.armR = -1.5 + Math.sin(A.clock * 22) * 0.35; } else { delete P.data.armL; delete P.data.armR; } }
    if (S.mode === 'roles') { updRoles(A, dt); return; }
    if (S.mode === 'vote') { updVote(A, dt); return; }
    S.gt = A.t - S.t0;
    if (S.invert) { let any = false; for (let i = 0; i < A.n; i++) { S.invert[i] = Math.max(0, S.invert[i] - dt); if (S.invert[i] > 0) any = true; } if (!any) S.invert = null; }
    // rayons de pièces
    for (const P of A.players) {
      if (!P.alive || !P.in.aP) continue;
      for (const k in SHELF) if (near(P, SHELF[k]) && P.data.part !== k) { P.data.part = k; A.sfx('pick'); A.say(P.x, P.z, `${SHELF[k].icon} ${SHELF[k].one}`, P.css, 22); setCarry(A, P); }
    }
    if (S.tr) updTraitor(A, dt);
    for (const j of S.jobs.slice()) updJob(A, j, dt);
    updFire(A, dt);
    updOil(A, dt);
    // nouvelles tâches et urgences
    S.baseWait -= dt;
    if (!S.blackout && S.jobs.filter((j) => !j.urgent).length < S.baseMax && S.baseWait <= 0) { addBase(A); S.baseWait = 1.2; }
    if (S.gt >= S.nextEv && !S.ended) {
      const urgent = S.jobs.filter((j) => j.urgent).length;
      if (urgent >= 2 || S.gt > TIME - 12) S.nextEv = S.gt + 3;
      else {
        addEvent(A);
        S.nextEv = S.gt + A.rand(15, 21) * (1 - 0.3 * S.gt / TIME) * S.evMul;
      }
    }
    S.prog = A.clamp(S.prog, 0, 100);
    // fin de la réparation
    if (!S.ended && (S.prog >= 100 || S.gt >= TIME)) {
      S.ended = true; S.repaired = S.prog >= 100; S.doneAt = S.gt;
      if (S.repaired) { A.burst(MC.x, 2.5, MC.z, 60, [0x3cff9a, 0xffcc33, 0xffffff], 9, { up: 5 }); A.sfx('power'); }
      else { A.burst(MC.x, 1.5, MC.z, 80, [0xff5a1a, 0xffd23a, 0x333333], 10, { up: 6 }); A.shake(1.2); A.sfx('boom'); }
      if (S.tr) { startVote(A); return; }
      S.ok = S.repaired;
      if (S.ok) { const m = mvpOf(A); A.endRound({ winners: A.players.map((P) => P.i), text: '🎉 MACHINE RÉPARÉE !', sub: `en ${Math.round(S.gt)} s · employé du mois : ${A.players[m].name}`, color: '#3cff9a' }); }
      else A.endRound({ text: '💥 LA MACHINE A EXPLOSÉ…', sub: `Réparée à ${Math.floor(S.prog)} % seulement`, color: '#ff5533' });
    }
  }

  function hud(A) {
    const S = A.S;
    if (S.mode === 'roles' && A.phase === 'play') return { timer: TIME, note: '🙈 Distribution des rôles : tout le monde ferme les yeux…', rows: A.players.map((P) => ({ i: P.i, txt: '' })) };
    if (S.mode === 'vote') {
      return {
        timer: S.voteT, note: '🕵️ QUI EST LE TRAÎTRE ? Place-toi sur le socle de ton suspect',
        rows: A.players.map((P) => ({ i: P.i, txt: ` 🗳️ ${S.tally ? S.tally[P.i] : 0}` })),
      };
    }
    const urg = S.jobs.filter((j) => j.urgent).map((j) => `⚠ ${j.icon} ${j.short}${j.timer !== undefined ? ' ' + Math.ceil(j.timer) + ' s' : ''}`);
    const nb = S.jobs.filter((j) => !j.urgent).length;
    const quiz = S.jobs.find((j) => j.kind === 'quiz');
    let panel = '';
    if (quiz && !S.blackout) panel = `<b>💻 ${esc(quiz.q.question)}</b><span>${quiz.q.options.map((o, k) => `<i class="${quiz.off[k] ? 'off' : ''}" style="--c:#${TILES[k].c.toString(16).padStart(6, '0')}"><em>${TILES[k].l}</em> ${esc(o)}</i>`).join('')}</span>`;
    else if (S.say && S.say.until > A.clock) panel = `<span>👷 <b>Oncle Patou :</b> ${esc(S.say.text)}</span>`;
    return {
      timer: TIME - S.gt,
      note: `MACHINE ${Math.floor(S.prog)} %` + (urg.length ? ' — ' + urg.join(' · ') : '') + (S.blackout ? ' — plus de courant !' : nb ? ` — ${nb} réparation${nb > 1 ? 's' : ''} à faire` : ''),
      rows: A.players.map((P) => ({ i: P.i, txt: ` ${P.data.part ? SHELF[P.data.part].icon + ' ' : ''}${Math.round(S.contrib[P.i])}` })),
      panel,
    };
  }

  /* ---------- Les flèches d'objectif (v1.4) ----------
     5 au maximum : d'abord les URGENCES (rouge), puis les réparations (jaune), avec une étiquette
     courte ; une pièce à livrer → une flèche aussi sur son rayon (🔌 ⚙️ 🧊), sauf si quelqu'un la porte
     déjà. Pendant le vote : une flèche à la couleur de chaque socle. */
  function goalsOf(A) {
    const S = A.S, out = [];
    if (S.mode === 'vote') return S.peds ? S.peds.map((p) => ({ x: p.x, z: p.z, color: A.players[p.i].color, size: 0.8, ring: false })) : [];
    if (S.mode !== 'play' || S.ended) return out;
    const add = (q) => { if (out.length < 5) out.push(q); };
    const shelves = new Set();
    const jobs = S.jobs.filter((j) => !j.done && !(S.blackout && !j.urgent))
      .sort((a, b) => (b.urgent - a.urgent) || ((a.timer !== undefined ? a.timer : 99) - (b.timer !== undefined ? b.timer : 99)));
    for (const j of jobs) {
      const col = j.urgent ? 0xff3b30 : 0xffcc33;
      if (j.kind === 'multi') { for (const p of j.pts) if (!p.on) add({ x: p.x, z: p.z, color: col, label: '⚡' }); continue; }
      if (j.kind === 'fire') { const f = S.fires[0]; if (f) add({ x: f.x + 0.5, z: f.z + 0.5, color: col, label: '🔥' }); continue; }
      if (j.kind === 'quiz') { add({ x: TILES[1].x, z: TILES[1].z, color: col, label: '💻 ?', y: 0.4 }); continue; }
      if (j.kind === 'duo') { for (const p of j.pts) add({ x: p.x, z: p.z, color: col, label: '🤝', y: 0.6 }); continue; }
      add({ x: j.pts[0].x, z: j.pts[0].z, color: col, label: (j.urgent ? '⚠ ' : '') + j.icon, y: 0.6 });
      if (j.kind === 'deliver' && !shelves.has(j.part) && !A.players.some((P) => P.alive && P.data.part === j.part)) {
        shelves.add(j.part);
        const sh = SHELF[j.part];
        add({ x: sh.x, z: sh.z, color: sh.color, label: sh.icon, size: 0.85 });
      }
    }
    return out;
  }

  function teamResult(A) {
    const S = A.S;
    const order = A.players.map((P) => P.i).sort((a, b) => S.contrib[b] - S.contrib[a]);
    const lose = Math.min(3, Math.max(0, A.n - 1));
    if (!S.tr) {
      if (S.ok) return { ok: true, text: `Machine réparée en ${Math.round(S.doneAt)} s ! L'équipe gagne, chacun marque selon ses réparations 🎉`, mvp: mvpOf(A) };
      return { ok: false, text: `La machine a explosé à ${Math.floor(S.prog)} %… Toute l'équipe a perdu.`, mvp: -1 };
    }
    const T = A.players[S.traitor];
    const places = {}, medals = {};
    if (S.ok) {
      let k = 0;
      for (const i of order) if (i !== S.traitor) places[i] = k++;
      places[S.traitor] = k; medals[S.traitor] = '🕵️';
      return { ok: true, text: `Traître démasqué : c'était ${T.name} ! Les innocents gagnent 🎉`, mvp: mvpOf(A), places, medals };
    }
    for (const P of A.players) { places[P.i] = P.i === S.traitor ? 0 : lose; medals[P.i] = P.i === S.traitor ? '🕵️' : '💥'; }
    const why = S.accused === S.traitor ? 'démasqué… mais la machine a explosé' : S.accused >= 0 ? `et vous avez accusé ${A.players[S.accused].name}` : 'et personne ne l\'a trouvé';
    return { ok: false, text: `${T.name} était le traître, ${why}. Le traître gagne 🕵️`, mvp: -1, places, medals };
  }

  /* ==================================================================
     LES TÂCHES
     ================================================================== */
  function freePort(A) {
    const S = A.S;
    const used = new Set(S.jobs.filter((j) => j.port).map((j) => j.port));
    const list = Object.keys(PORTS).filter((k) => !used.has(k));
    return list.length ? A.pick(list) : A.pick(Object.keys(PORTS));
  }
  function quizQuestion(A) {
    const S = A.S;
    if (!S.quizBag.length) {
      const all = [];
      for (const w in (OT.WORLD_DATA || {})) for (const lv of OT.WORLD_DATA[w].levels || []) if (lv.teach && lv.teach.q && lv.teach.q.options && lv.teach.q.options.length >= 3) all.push(lv.teach.q);
      S.quizBag = A.shuffle(all);
    }
    const q = S.quizBag.pop();
    if (!q) return null;
    const wrong = A.shuffle(q.options.map((_, k) => k).filter((k) => k !== q.answer)).slice(0, 2);
    const ks = A.shuffle([q.answer].concat(wrong));
    return { question: q.question, options: ks.map((k) => q.options[k]), answer: ks.indexOf(q.answer) };
  }
  function addBase(A) {
    const S = A.S;
    const open = new Set(S.jobs.map((j) => j.tid));
    const list = BASE.filter((t) => !open.has(t.id) && !(t.kind === 'duo' && A.n < 2));
    if (!list.length) return;
    const T = A.pick(list);
    const j = { id: S.nextId++, tid: T.id, kind: T.kind, text: T.text, short: T.text, icon: T.icon, urgent: false, need: T.need || 1, work: 0, gain: T.gain * S.mult, part: T.part, by: {}, color: 0xffcc33 };
    if (T.at === 'port') { j.port = freePort(A); j.pts = [{ x: PORTS[j.port].x, z: PORTS[j.port].z }]; j.text += ` (${PORTS[j.port].name})`; }
    else if (T.at === 'duo') { const ns = Math.random() < 0.5; j.port = ns ? 'n' : 'w'; j.pts = (ns ? [PORTS.n, PORTS.s] : [PORTS.w, PORTS.e]).map((p) => ({ x: p.x, z: p.z })); }
    else { j.pts = [{ x: ST[T.at].x, z: ST[T.at].z }]; j.color = ST[T.at].color; }
    if (T.kind === 'quiz') { j.q = quizQuestion(A); if (!j.q) return; j.off = [false, false, false]; }
    S.jobs.push(j);
    makeMarker(A, j);
    // Oncle Patou distribue le travail (de préférence à un humain libre)
    const busy = (P) => S.jobs.some((q) => q !== j && q.pts.some((p) => near(P, p, 2)));
    const cand = A.players.filter((P) => P.alive && !busy(P));
    const who = cand.find((P) => P.human) || cand[0] || A.pick(A.players);
    let line = T.patou.replace('{port}', j.port && PORTS[j.port] ? PORTS[j.port].name : '');
    if (T.kind === 'duo') { const two = A.players.filter((P) => P !== who); line = `${who.name} et ${(two.find((P) => P.human) || two[0] || who).name}, ${line}`; }
    else line = `${who.name}, ${line}`;
    patou(A, line, 1);
  }

  function addEvent(A, forced, fake) {
    const S = A.S;
    for (let tries = 0; tries < 10; tries++) {
      let id = forced;
      if (!id) { if (!S.bag.length) S.bag = A.shuffle(Object.keys(EVENTS)); id = S.bag.shift(); }
      if (S.jobs.some((j) => j.tid === id)) { if (forced) return false; continue; }
      if (!forced && id === 'coupure' && S.jobs.some((j) => j.urgent)) continue;     // la coupure arrive seule
      if (id === 'porte' && S.door) { if (forced) return false; continue; }
      const E = EVENTS[id];
      const j = { id: S.nextId++, tid: id, kind: E.kind, text: E.text, short: E.text.replace(/ !$/, '').toLowerCase().replace(/^./, (c) => c.toUpperCase()), icon: E.icon, urgent: true, fake: fake === true, need: E.need || 1, work: 0, timer: E.timer ? E.timer * S.tMul : undefined, gain: 3 * S.mult, loss: E.loss || 0, part: E.part, by: {}, color: 0xff3b30 };
      if (E.at) j.pts = [{ x: ST[E.at].x, z: ST[E.at].z }];
      if (id === 'porte') {
        const sides = (typeof fake === 'string' ? [fake] : Object.keys(DOORS)).filter((k) => forced || !A.players.some((P) => P.alive && Math.floor(P.x) === DOORS[k].x && DOORS[k].z.includes(Math.floor(P.z))));
        if (!sides.length) { if (forced) return false; continue; }
        const k = A.pick(sides), Dd = DOORS[k];
        // ceux qui sont dans le passage sont poussés sur le côté
        for (const P of A.players) if (Math.floor(P.x) === Dd.x && Dd.z.includes(Math.floor(P.z))) { P.x = P.x < Dd.x + 0.5 ? Dd.x - 0.45 : Dd.x + 1.45; }
        S.door = { k, D: Dd };
        for (const z of Dd.z) A.setCell(Dd.x, z, A.WALL);
        j.pts = [{ x: Dd.cx, z: Dd.cz }];
        j.text = `PORTE ${Dd.name} BLOQUÉE !`;
        if (!A.headless) makeDoor(A, Dd);
      }
      if (id === 'fuite') { const L = A.pick(LEAKS); j.pts = [{ x: L.x, z: L.z }]; if (!j.fake) addOil(A, Math.floor(L.x), Math.floor(L.z)); j.drain = 0; }
      if (id === 'incendie') {
        const st = A.pick(Object.values(ST));
        let n = 0;
        for (let k = 0; k < 30 && n < 3; k++) { const x = Math.floor(st.x + A.rand(-2, 2)), z = Math.floor(st.z + A.rand(-2, 2)); if (addFire(A, x, z)) n++; }
        if (!n) { if (forced) return false; continue; }
        j.pts = [{ x: st.x, z: st.z }]; j.drain = 0;
      }
      if (id === 'coupure') { S.blackout = true; j.pts = BREAKERS.map((b) => ({ x: b.x, z: b.z, on: false })); A.dim(0.16); }
      // un humain tout près du feu qui prend : on le prévient (« À gauche ! »…)
      if (id === 'incendie' && !j.fake) for (const P of A.players) for (const f of S.fires) if (Math.hypot(f.x + 0.5 - P.x, f.z + 0.5 - P.z) < 2.5) { A.warn(P, f.x + 0.5, f.z + 0.5); break; }
      S.jobs.push(j);
      makeMarker(A, j);
      A.banner(`⚠ ${E.text}`, E.sub, '#ff5533', 2.2);
      patou(A, E.patou, 3);
      A.sfx('warn'); A.shake(0.25);
      for (const P of A.players) A.rumble(P, 0.4, 0.4, 200);
      return true;
    }
    return false;
  }

  function holders(A, p) { return A.players.filter((P) => P.alive && P.stun <= 0 && P.in.a && near(P, p)); }
  // le traître en train de « réparer » : la jauge baisse, et ceux qui sont autour deviennent suspects
  function sabotaging(A, p, list, dt) {
    const S = A.S;
    for (const P of list) P.data.workT = 0.15;
    S.sabT += dt;
    if (S.sabT > 1.5) { S.sabT = 0; S.sabotage++; suspect(A, p.x, p.z, 1, 2.3); }
  }

  function updJob(A, j, dt) {
    const S = A.S;
    if (j.timer !== undefined) {
      j.timer -= dt;
      if (j.timer <= 0) { failJob(A, j); return; }
    }
    if (S.blackout && !j.urgent) return;
    if (j.kind === 'hold' || j.kind === 'leak' || j.kind === 'door') {
      const all = holders(A, j.pts[0]), tr = all.filter((P) => isTraitor(A, P)), hs = all.filter((P) => !isTraitor(A, P));
      if (hs.length) {
        const rate = 1 + 0.7 * (hs.length - 1);
        j.work += dt * rate;
        for (const P of hs) { j.by[P.i] = (j.by[P.i] || 0) + dt * rate / hs.length; P.data.workT = 0.15; }
        if (Math.floor(j.work * 4) !== Math.floor((j.work - dt * rate) * 4)) A.sfx('tick');
      }
      if (tr.length) { j.work = Math.max(0, j.work - dt * 0.7); sabotaging(A, j.pts[0], tr, dt); }
      if (j.kind === 'leak' && !j.fake) { j.drain += dt; if (j.drain > 3) { j.drain = 0; S.prog -= 1; } }
    } else if (j.kind === 'mash') {
      for (const P of A.players) if (P.alive && P.stun <= 0 && P.in.aP && near(P, j.pts[0])) {
        if (isTraitor(A, P)) { j.work = Math.max(0, j.work - 1); sabotaging(A, j.pts[0], [P], 0.35); continue; }
        j.work += 1; j.by[P.i] = (j.by[P.i] || 0) + 1; A.sfx('tick'); P.data.workT = 0.15;
      }
    } else if (j.kind === 'deliver') {
      for (const P of A.players) if (P.alive && P.in.aP && P.data.part === j.part && near(P, j.pts[0])) {
        P.data.part = null; setCarry(A, P);
        j.by[P.i] = 1; A.stat(P.i, 'deliver', 1);
        j.work = j.need;
        break;
      }
    } else if (j.kind === 'duo') {
      const h0 = holders(A, j.pts[0]), h1 = holders(A, j.pts[1]).filter((P) => !h0.includes(P));
      const tr = h0.concat(h1).filter((P) => isTraitor(A, P));
      const g0 = h0.filter((P) => !isTraitor(A, P)), g1 = h1.filter((P) => !isTraitor(A, P));
      if (g0.length && g1.length) {
        j.work += dt;
        for (const P of g0.concat(g1)) { j.by[P.i] = (j.by[P.i] || 0) + dt; P.data.workT = 0.15; }
        if (Math.floor(j.work * 4) !== Math.floor((j.work - dt) * 4)) A.sfx('tick');
      } else j.work = Math.max(0, j.work - dt * 0.5);
      if (tr.length) sabotaging(A, tr[0], tr, dt);
    } else if (j.kind === 'multi') {
      for (const p of j.pts) if (!p.on) for (const P of A.players) if (P.alive && P.in.aP && near(P, p) && !isTraitor(A, P)) { p.on = true; j.by[P.i] = (j.by[P.i] || 0) + 1; A.sfx('ok'); A.say(p.x, p.z, '✔ Disjoncteur', P.css, 22); break; }
      j.work = j.pts.filter((p) => p.on).length; j.need = j.pts.length;
    } else if (j.kind === 'fire') {
      j.work = S.fires.length ? 0 : 1; j.need = 1;
      j.drain += dt;
      if (S.fires.length && j.drain > 2.5) { j.drain = 0; S.prog -= 1; }
    } else if (j.kind === 'quiz') {
      for (const P of A.players) {
        if (!P.alive || !P.in.aP) continue;
        const k = TILES.findIndex((t) => Math.hypot(P.x - t.x, P.z - t.z) < 0.6);
        if (k < 0 || j.off[k]) continue;
        if (k === j.q.answer) { j.by[P.i] = 1; A.stat(P.i, 'quiz', 1); j.work = j.need; A.say(TILES[k].x, TILES[k].z, '✔ Bonne réponse !', '#3cff9a', 26); break; }
        j.off[k] = true; S.prog -= 2;
        A.say(TILES[k].x, TILES[k].z, '✖ Mauvaise réponse ! −2 %', '#ff6b5a', 24); A.sfx('bad');
        if (isTraitor(A, P)) suspect(A, P.x, P.z, 0.5, 1);
        if (j.mk) j.mk.forEach((m) => { if (m.userData.tile === k) m.visible = false; });
      }
    }
    if (j.work >= j.need) doneJob(A, j);
  }

  function shareOut(A, j, total) {
    const sum = Object.values(j.by).reduce((a, b) => a + b, 0) || 1;
    for (const i in j.by) { credit(A, +i, total * j.by[i] / sum); A.stat(+i, j.urgent ? 'kills' : 'tasks', 1); }
  }
  function doneJob(A, j) {
    const S = A.S;
    removeJob(A, j);
    const p = j.pts[0];
    if (j.fake) {
      A.banner('😈 FAUSSE ALERTE !', 'Quelqu\'un vous a fait courir pour rien…', '#b78cff', 2);
      patou(A, 'Fausse alerte ?! Quelqu\'un nous joue des tours… Ouvrez l\'œil.', 3);
      A.sfx('bad');
      endEffects(A, j);
      return;
    }
    S.prog += j.gain;
    shareOut(A, j, j.urgent ? 6 : 5);
    A.say(p.x, p.z, j.urgent ? `✔ ${j.short} : réglé !` : `✔ +${Math.round(j.gain)} %`, '#3cff9a', 28);
    A.sfx(j.urgent ? 'power' : 'ok');
    A.burst(p.x, 1, p.z, 18, [0x3cff9a, 0xffffff, 0xffcc33], 4, { up: 2 });
    if (j.urgent) {
      patou(A, A.pick(['Bien joué, l\'équipe !', 'Ouf. On respire.', 'Ça, c\'est du travail propre !']), 2);
      // petite réaction de celui qui a le plus aidé (pas à chaque fois)
      const best = Object.keys(j.by).sort((a, b) => j.by[b] - j.by[a])[0];
      if (best !== undefined && Math.random() < 0.5) A.voice('nice', A.players[+best], { p: 0.6 });
    }
    endEffects(A, j);
  }
  function failJob(A, j) {
    const S = A.S;
    removeJob(A, j);
    if (j.tid === 'porte') { A.say(j.pts[0].x, j.pts[0].z, 'La porte se rouvre…', '#ffd28a', 24); endEffects(A, j); return; }
    if (j.fake) { A.banner('😈 C\'était une fausse alerte…', 'Rien ne s\'est passé. Mais qui l\'a lancée ?', '#b78cff', 2); endEffects(A, j); return; }
    S.prog -= j.loss;
    A.banner(`✖ ${j.short} : raté !`, `La machine recule de ${j.loss} %`, '#ff5533', 1.8);
    patou(A, 'Raté ! La machine recule. Concentrez-vous !', 3);
    A.sfx('bad'); A.shake(0.5);
    if (j.tid === 'surchauffe') {
      A.burst(MC.x, 1.5, MC.z, 40, [0xffffff, 0xdddddd], 6, { up: 3, grav: -2 });
      for (const P of A.alive()) { const dx = P.x - MC.x, dz = P.z - MC.z; if (Math.hypot(dx, dz) < 6) A.knock(P, dx, dz, 6, 0.6); }
    } else if (j.tid === 'surcharge') {
      for (const P of A.alive()) if (Math.hypot(P.x - ST.elec.x, P.z - ST.elec.z) < 4) { P.stun = Math.max(P.stun, 1.0); A.burst(P.x, 0.8, P.z, 10, [0xffe14a, 0xffffff], 4); }
      A.sfx('zap');
    } else if (j.tid === 'virus') {
      S.invert = A.fill(A.n, 5);
      A.banner('🦠 Commandes inversées !', 'pendant 5 secondes…', '#b78cff', 1.6);
    }
    endEffects(A, j);
  }
  function removeJob(A, j) {
    const S = A.S;
    const k = S.jobs.indexOf(j); if (k >= 0) S.jobs.splice(k, 1);
    j.done = true;
    if (j.mk) { j.mk.forEach((m) => A.remove(m)); j.mk = null; }
  }
  function endEffects(A, j) {
    const S = A.S;
    if (j.tid === 'porte' && S.door) { for (const z of S.door.D.z) A.setCell(S.door.D.x, z, A.FLOOR); if (S.doorMesh) { A.remove(S.doorMesh); S.doorMesh = null; } S.door = null; }
    if (j.tid === 'fuite') { S.oilFade = true; }
    if (j.tid === 'coupure') { S.blackout = false; A.dim(1); }
    if (j.tid === 'incendie') { for (const f of S.fires) A.remove(f.m); S.fires = []; S.smolder = []; }
  }

  /* ---------- Le feu ---------- */
  function addFire(A, x, z) {
    const S = A.S, G = A.grid;
    if (!G.inside(x, z) || G.at(x, z) !== A.FLOOR) return false;
    if (S.fires.some((f) => f.x === x && f.z === z)) return false;
    if (A.players.some((P) => P.alive && Math.floor(P.x) === x && Math.floor(P.z) === z)) return false;
    const f = { id: S.fireId++, x, z, hp: 1, m: null };
    if (!A.headless) {
      const g = new THREE.Group();
      const c1 = A.mesh('box', 0.5, 0xff5a1a, { h: 0.6, basic: true, opacity: 0.9 }); c1.position.y = 0.3; c1.rotation.y = 0.6;
      const c2 = A.mesh('box', 0.32, 0xffd23a, { h: 0.85, basic: true, opacity: 0.9 }); c2.position.y = 0.42; c2.rotation.y = 0.2;
      const c3 = A.mesh('box', 0.6, 0xff2a1a, { h: 0.25, basic: true, opacity: 0.7 }); c3.position.y = 0.12;
      g.add(c3, c1, c2); g.position.set(x + 0.5, 0, z + 0.5);
      A.add(g); f.m = g; f.parts = [c1, c2, c3];
    }
    S.fires.push(f);
    return true;
  }
  // le feu s'étend : la case voisine FUME d'abord (0,9 s, onde orange au sol), puis prend feu
  const smoldering = (S, x, z) => S.smolder.some((q) => q.x === x && q.z === z);
  function updFire(A, dt) {
    const S = A.S;
    for (const q of S.smolder.slice()) {
      q.t += dt;
      if (Math.random() < dt * 9) A.burst(q.x + 0.5, 0.2, q.z + 0.5, 2, [0x777777, 0xff8a3a], 1.2, { up: 2, grav: -1, life: 0.8 });
      if (q.t >= 0.9) { S.smolder.splice(S.smolder.indexOf(q), 1); if (S.fires.length) addFire(A, q.x, q.z); }
    }
    if (!S.fires.length) return;
    S.spreadT += dt;
    if (S.spreadT > 3.8) {
      S.spreadT = 0;
      for (const f of S.fires.slice()) {
        if (S.fires.length + S.smolder.length >= S.fireMax || Math.random() >= 0.25) continue;
        const [dx, dz] = A.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]), x = f.x + dx, z = f.z + dz;
        if (!A.grid.inside(x, z) || A.grid.at(x, z) !== A.FLOOR || S.fires.some((o) => o.x === x && o.z === z) || smoldering(S, x, z)) continue;
        S.smolder.push({ x, z, t: 0 });
        A.wave(x + 0.5, z + 0.5, 0xff7a1a, 0.9, 0.85);
        // un humain juste à côté : « Attention ! », « Derrière ! »…
        for (const P of A.players) if (P.alive && Math.hypot(x + 0.5 - P.x, z + 0.5 - P.z) < 2.2) A.warn(P, x + 0.5, z + 0.5);
      }
    }
    // l'extincteur (B maintenu) : un cône devant soi
    for (const P of A.players) {
      if (!P.alive || !P.in.b || P.stun > 0) continue;
      const fx = Math.sin(P.face), fz = Math.cos(P.face);
      for (const f of S.fires.slice()) {
        const dx = f.x + 0.5 - P.x, dz = f.z + 0.5 - P.z, d = Math.hypot(dx, dz);
        if (d > 2.1 || (d > 0.3 && (dx * fx + dz * fz) / d < 0.55)) continue;
        f.hp -= dt * 1.5;
        if (f.hp <= 0) {
          S.fires.splice(S.fires.indexOf(f), 1); A.remove(f.m);
          credit(A, P.i, 1); A.stat(P.i, 'fires', 1);
          A.burst(f.x + 0.5, 0.4, f.z + 0.5, 10, [0xffffff, 0xcfd8dc], 3, { up: 2 });
          A.sfx('small');
          const j = S.jobs.find((q) => q.kind === 'fire'); if (j) j.by[P.i] = (j.by[P.i] || 0) + 1;
        }
      }
    }
    for (const P of A.alive()) {
      if (P.data.burnT > 0) continue;
      for (const f of S.fires) if (Math.hypot(f.x + 0.5 - P.x, f.z + 0.5 - P.z) < 0.6) {
        P.data.burnT = 1; A.knock(P, P.x - f.x - 0.5 + 0.01, P.z - f.z - 0.5, 6, 0.4); A.say(P.x, P.z, 'Aïe, ça brûle !', '#ff7a3a', 22); A.sfx('hit');
        break;
      }
    }
  }

  /* ---------- L'huile (fuite) ---------- */
  function addOil(A, x, z) {
    const S = A.S, G = A.grid, k = z * W + x;
    if (!G.inside(x, z) || G.solid(x, z) || S.oil.has(k)) return;
    S.oil.add(k);
    const o = { x, z, k, m: null, t: 0 };
    if (!A.headless) { o.m = A.mesh('disc', 0.62, 0x1a1408, { basic: true, opacity: 0.8 }); o.m.position.set(x + 0.5, 0.025, z + 0.5); o.m.scale.setScalar(0.2); A.add(o.m); }
    S.oilList.push(o);
  }
  function updOil(A, dt) {
    const S = A.S;
    if (S.oilFade) { for (const o of S.oilList) A.remove(o.m); S.oilList = []; S.oil.clear(); S.oilFade = false; return; }
    if (!S.oilList.length) return;
    S.oilT += dt;
    if (S.oilT > 2.2 && S.oilList.length < 16) {
      S.oilT = 0;
      const o = A.pick(S.oilList), [dx, dz] = A.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      addOil(A, o.x + dx, o.z + dz);
    }
    for (const o of S.oilList) { o.t += dt; if (o.m) o.m.scale.setScalar(Math.min(1, 0.2 + o.t * 0.8)); }
  }

  /* ==================================================================
     LE TRAÎTRE
     ================================================================== */
  // les bots notent qui se trouvait là quand quelque chose de louche est arrivé
  // (un bot ne remarque pas tout : il faut regarder au bon endroit au bon moment)
  function suspect(A, x, z, w, r, big) {
    const S = A.S;
    for (const O of A.players) {
      if (O.human) continue;
      const d = Math.hypot(O.x - x, O.z - z);
      const see = (big ? 0.2 + 0.45 * O.level.skill : 0.12 + 0.4 * O.level.skill) * Math.max(big ? 0.15 : 0.1, 1 - d / (big ? 10 : 8));
      if (Math.random() < see) for (const Q of A.players) if (Q !== O && Math.hypot(Q.x - x, Q.z - z) < r) S.sus[O.i][Q.i] += w;
      // un bot distrait se trompe parfois de coupable
      if (Math.random() < (1 - O.level.skill) * 0.5) { const Q = A.pick(A.players.filter((q) => q !== O)); S.sus[O.i][Q.i] += w * 0.7; }
    }
  }
  function prank(A, T, kind, arg) {
    const S = A.S;
    let ok = false;
    if (kind === 'coupure') ok = addEvent(A, 'coupure');
    else if (kind === 'porte') ok = addEvent(A, 'porte', arg);
    else if (kind === 'fausse') ok = addEvent(A, A.pick(['surchauffe', 'surcharge', 'virus', 'panne']), true);
    if (!ok) return;
    S.prankCd = 40; S.bHold = 0; S.doorHold = 0; S.sabotage++;
    suspect(A, T.x, T.z, 2, 2.6, true);
    if (T.bot) T.bot.mem.prank = null;
  }
  function updTraitor(A, dt) {
    const S = A.S, T = A.players[S.traitor];
    S.prankCd -= dt;
    if (!T || !T.alive || S.prankCd > 0 || S.gt < 15 || S.ended) { S.bHold = 0; S.doorHold = 0; return; }
    // A sur un disjoncteur (dans un coin) : coupure générale
    if (T.in.aP && !S.blackout && !S.jobs.some((j) => j.urgent)) for (const b of BREAKERS) if (near(T, b)) { prank(A, T, 'coupure'); return; }
    // A maintenu au milieu d'un couloir : la porte se bloque
    const dk = !S.door ? Object.keys(DOORS).find((k) => Math.hypot(T.x - DOORS[k].cx, T.z - DOORS[k].cz) < 0.5) : null;
    if (T.in.a && dk) { S.doorHold += dt; if (S.doorHold > 1.2) { prank(A, T, 'porte', dk); return; } } else S.doorHold = 0;
    // B maintenu loin de tout feu : fausse alerte
    if (T.in.b && !S.fires.some((f) => Math.hypot(f.x + 0.5 - T.x, f.z + 0.5 - T.z) < 2.6) && S.jobs.filter((j) => j.urgent).length < 2) { S.bHold += dt; if (S.bHold > 1.2) prank(A, T, 'fausse'); } else S.bHold = 0;
  }

  /* ---------- Les rôles secrets ---------- */
  function updRoles(A, dt) {
    const S = A.S, Rv = S.reveal;
    Rv.t += dt;
    if (Rv.k >= Rv.queue.length) {
      if (Rv.step !== 'end') { Rv.step = 'end'; Rv.t = 0; }
      else if (Rv.t > 1.8) {
        roleOverlay(A, null);
        S.mode = 'play'; S.t0 = A.t; S.gt = 0;
        A.banner('TOUT LE MONDE OUVRE LES YEUX !', 'Réparez la machine… et méfiez-vous.', '#b78cff', 2.4);
        patou(A, 'Au boulot ! Et gardez un œil sur les autres…', 2);
        return;
      }
    } else {
      const P = A.players[Rv.queue[Rv.k]];
      if (Rv.step === 'wait') {
        if (P.in.aP && Rv.t > 0.3) {
          Rv.step = 'show'; Rv.t = 0;
          if (isTraitor(A, P)) { [0, 380, 760].forEach((ms) => setTimeout(() => A.rumble(P, 0.9, 0.9, 220), ms)); }
          else A.rumble(P, 0.25, 0.25, 150);
        } else if (Rv.t > 25) { Rv.k++; Rv.t = 0; }
      } else if (Rv.step === 'show') {
        if ((P.in.aP && Rv.t > 1.2) || Rv.t > 8) { Rv.step = 'wait'; Rv.k++; Rv.t = 0; }
      }
    }
    const key = Rv.k + ':' + Rv.step;
    if (key !== Rv.key) { Rv.key = key; roleOverlay(A, Rv); }
  }
  function roleOverlay(A, Rv) {
    if (A.headless) return;
    let el = document.getElementById('arole');
    if (!el) { el = document.createElement('div'); el.id = 'arole'; document.body.appendChild(el); }
    if (!Rv) { el.hidden = true; return; }
    el.hidden = false;
    if (Rv.step === 'end' || Rv.k >= Rv.queue.length) { el.innerHTML = `<div class="ar-card"><b class="ar-big">👀 Tout le monde ouvre les yeux !</b><p>Réparez la machine… l'un de vous joue double jeu.</p></div>`; return; }
    const P = A.players[Rv.queue[Rv.k]];
    const lab = OT.Input.arenaLabels(P.dev);
    if (Rv.step === 'wait') {
      el.innerHTML = `<div class="ar-card"><p class="ar-k">🙈 Tout le monde ferme les yeux…</p><b class="ar-big" style="color:${P.css}">${esc(P.name)}</b><p>ouvre les yeux et appuie sur <b class="k">${esc(lab.a)}</b> pour voir ton rôle</p><p class="muted">(les autres : on ne regarde pas !)</p></div>`;
      return;
    }
    el.innerHTML = isTraitor(A, P)
      ? `<div class="ar-card tr"><p class="ar-k">${esc(P.name)}, ton rôle :</p><b class="ar-big">🕵️ TU ES LE TRAÎTRE</b>
         <ul><li>Fais semblant de réparer : quand tu maintiens <b class="k">${esc(lab.a)}</b> sur une réparation, sa jauge <b>baisse</b>.</li>
         <li><b class="k">${esc(lab.a)}</b> sur un disjoncteur (dans un coin) : coupure générale.</li>
         <li><b class="k">${esc(lab.a)}</b> maintenu au milieu d'un couloir (rayures jaunes) : la porte se bloque.</li>
         <li><b class="k">${esc(lab.b)}</b> maintenu loin du feu : fausse alerte.</li></ul>
         <p class="muted">Une grosse farce toutes les 40 s. Ne te fais pas prendre ! — <b class="k">${esc(lab.a)}</b> pour cacher</p></div>`
      : `<div class="ar-card in"><p class="ar-k">${esc(P.name)}, ton rôle :</p><b class="ar-big">😇 TU ES INNOCENT</b>
         <p>Répare la machine avec les autres… et observe : quelqu'un fait baisser les jauges, coupe le courant ou lance de fausses alertes.</p>
         <p class="muted">À la fin, vote pour le traître. — <b class="k">${esc(lab.a)}</b> pour cacher</p></div>`;
  }

  /* ---------- Le vote ---------- */
  function startVote(A) {
    const S = A.S;
    S.mode = 'vote'; S.voteT = 14; S.tally = A.fill(A.n, 0);
    for (const j of S.jobs.slice()) { removeJob(A, j); endEffects(A, j); }
    for (const f of S.fires) A.remove(f.m); S.fires = []; S.smolder = [];
    S.oilFade = true; updOil(A, 0);
    if (S.door) endEffects(A, { tid: 'porte' });
    if (S.blackout) { S.blackout = false; A.dim(1); }
    S.invert = null;
    S.peds = A.players.map((P, k) => ({ i: P.i, x: PEDS[k][0], z: PEDS[k][1] }));
    A.banner((S.repaired ? '🎉 Machine réparée ! ' : '💥 La machine a explosé… ') + 'QUI EST LE TRAÎTRE ?', 'Va te placer sur le socle de ton suspect (14 s)', '#b78cff', 3);
    patou(A, 'Alors… qui a fait le coup ? Montez sur le socle du coupable !', 3);
    A.sfx('rule');
    if (!A.headless) makePeds(A);
    // les bots choisissent leur suspect (le traître accuse un innocent)
    for (const P of A.players) {
      if (P.human) continue;
      const L = P.level;
      const mx = Math.max(1, ...S.sus[P.i]);
      let best = null, bv = -1e9;
      for (const Q of A.players) {
        if (Q === P) continue;
        const v = S.sus[P.i][Q.i] + Math.random() * mx * (1 - L.skill) * 1.2 + Math.random() * 0.3;
        if (v > bv) { bv = v; best = Q; }
      }
      P.bot.mem.vote = best ? best.i : -1;
    }
  }
  function updVote(A, dt) {
    const S = A.S;
    S.voteT -= dt;
    S.tally = A.fill(A.n, 0);
    for (const P of A.players) {
      const p = S.peds.find((q) => Math.hypot(P.x - q.x, P.z - q.z) < 0.85);
      P.data.voted = p && p.i !== P.i ? p.i : -1;
      if (P.data.voted >= 0) S.tally[P.data.voted]++;
      // « Traître ! » : celui qui accuse le dit tout haut (un humain de préférence ; sinon un bot, vers la fin)
      if (!S.accuseSaid && P.data.voted >= 0 && (P.human || (S.voteT < 5 && !A.players.some((Q) => Q.human && Q.data.voted >= 0)))) {
        S.accuseSaid = true; A.voice('traitor', P, { force: true });
      }
    }
    if (S.voteT > 0) return;
    const max = Math.max(...S.tally);
    const top = S.tally.map((v, i) => (v === max ? i : -1)).filter((i) => i >= 0);
    S.accused = max > 0 && top.length === 1 ? top[0] : -1;
    S.voteDone = true;
    S.ok = S.repaired && S.accused === S.traitor;
    const T = A.players[S.traitor];
    A.burst(S.peds[S.traitor].x, 1, S.peds[S.traitor].z, 40, [T.color, 0xb78cff, 0xffffff], 7, { up: 4 });
    A.endRound({
      winners: A.players.filter((P) => (P.i === S.traitor) !== S.ok).map((P) => P.i),
      text: `🕵️ Le traître était ${T.name} !`,
      sub: S.accused === S.traitor ? (S.repaired ? 'Démasqué ! Les innocents gagnent.' : 'Démasqué… mais la machine a explosé : le traître gagne.') : S.accused >= 0 ? `Vous avez accusé ${A.players[S.accused].name}… le traître gagne.` : 'Pas de majorité… le traître gagne.',
      color: S.ok ? '#3cff9a' : '#b78cff',
    });
    A.sfx(S.ok ? 'power' : 'bad');
  }

  /* ==================================================================
     LES BOTS
     ================================================================== */
  function slotsOf(A) {
    const S = A.S, out = [];
    for (const j of S.jobs) {
      if (S.blackout && !j.urgent) continue;
      const pr = (j.urgent ? 3 : 1) + (j.timer !== undefined ? Math.max(0, 12 - j.timer) * 0.2 : 0);
      if (j.kind === 'fire') { S.fires.slice(0, 6).forEach((f) => out.push({ j, f, key: j.id + ':f' + f.id, x: f.x + 0.5, z: f.z + 0.5, prio: pr, cap: 1 })); continue; }
      if (j.kind === 'multi') { j.pts.forEach((p, k) => { if (!p.on) out.push({ j, p, key: j.id + ':' + k, x: p.x, z: p.z, prio: pr, cap: 1 }); }); continue; }
      if (j.kind === 'duo') { j.pts.forEach((p, k) => out.push({ j, p, key: j.id + ':' + k, x: p.x, z: p.z, prio: pr + 0.6, cap: 1 })); continue; }
      if (j.kind === 'quiz') { out.push({ j, key: j.id + ':q', x: TILES[1].x, z: TILES[1].z, prio: pr + 0.3, cap: 1 }); continue; }
      out.push({ j, p: j.pts[0], key: j.id + ':0', x: j.pts[0].x, z: j.pts[0].z, prio: pr, cap: j.kind === 'deliver' ? 1 : 2 });
    }
    return out;
  }
  function assign(A) {
    const S = A.S;
    if (S.assignAt > A.clock) return;
    S.assignAt = A.clock + 0.3;
    const slots = slotsOf(A);
    const used = {};
    // un humain près d'une tâche s'en occupe sûrement
    for (const P of A.players) if (P.human && P.alive) for (const s of slots) if (Math.hypot(P.x - s.x, P.z - s.z) < 1.8) used[s.key] = (used[s.key] || 0) + 1;
    const bots = A.players.filter((P) => !P.human && P.alive && !(P.bot.mem.prank && isTraitor(A, P)));
    const pairs = [];
    for (const P of bots) {
      const M = P.bot.mem, L = P.level;
      if (M.distractT > A.clock) continue;
      if (Math.random() < L.mistake * 0.15) { M.distractT = A.clock + A.rand(1, 3); M.s = null; continue; }   // Facile : il rêvasse
      for (const s of slots) {
        let dist = Math.hypot(P.x - s.x, P.z - s.z);
        if (s.j.kind === 'deliver' && P.data.part !== s.j.part) { const sh = SHELF[s.j.part]; dist = Math.hypot(P.x - sh.x, P.z - sh.z) + Math.hypot(sh.x - s.x, sh.z - s.z); }
        let v = s.prio * 6 - dist * 0.55 + (M.key === s.key ? 3 : 0) + (s.j.kind === 'deliver' && P.data.part === s.j.part ? 6 : 0);
        v += (Math.random() - 0.5) * (1 - L.skill) * 6;
        // le traître préfère les réparations « à maintenir » (pour les saboter en douce)
        if (isTraitor(A, P) && (s.j.kind === 'hold' || s.j.kind === 'mash')) v += 3;
        pairs.push({ P, s, v });
      }
    }
    pairs.sort((a, b) => b.v - a.v);
    const got = new Set();
    for (const { P, s } of pairs) {
      if (got.has(P)) continue;
      if ((used[s.key] || 0) >= s.cap) continue;
      used[s.key] = (used[s.key] || 0) + 1;
      got.add(P);
      P.bot.mem.s = s; P.bot.mem.key = s.key;
    }
    for (const P of bots) if (!got.has(P)) { P.bot.mem.s = null; P.bot.mem.key = null; }
  }

  function pathTo(A, P, pt, rMin, rMax) {
    const S = A.S, G = A.grid;
    const cost = (x, z) => {
      if (G.solid(x, z)) return Infinity;
      let c = 1;
      if (S.fires.some((f) => f.x === x && f.z === z)) c += 40;
      if (smoldering(S, x, z)) c += 25;
      if (S.oil.has(z * W + x)) c += 3;
      return c;
    };
    const goal = (x, z) => { const d = Math.hypot(x + 0.5 - pt.x, z + 0.5 - pt.z); return d <= rMax && d >= rMin && !S.fires.some((f) => f.x === x && f.z === z); };
    const [cx, cz] = A.Bot.cell(P);
    return A.Bot.dijkstra(cx, cz, goal, cost, 3000);
  }
  function walk(A, P, pt, rMax) {
    const path = pathTo(A, P, pt, 0, rMax);
    return path && path.length ? A.Bot.follow(P, path) : A.Bot.toward(P, pt.x, pt.z, 0.3);
  }
  function goAct(A, P, B, L, pt, mode) {
    const dd = Math.hypot(P.x - pt.x, P.z - pt.z);
    if (dd < R - 0.15) {
      const out = { go: [pt.x, pt.z], stop: 0.75 };
      // le traître prudent : devant témoins, il fait juste semblant (il ne touche à rien)
      if (isTraitor(A, P) && pt !== SHELF.fuse && pt !== SHELF.gear && pt !== SHELF.coolant && A.players.some((Q) => Q !== P && A.dist(Q, P) < 3) && Math.random() < L.skill) return out;
      if (mode === 'hold') out.a = true;
      else if (A.clock - (B.mem.lastTap || 0) > 0.12 + (1 - L.skill) * 0.16) { out.tapA = true; B.mem.lastTap = A.clock; }
      return out;
    }
    return walk(A, P, pt, R - 0.2);
  }
  function fireAct(A, P, B, L, f) {
    const fx = f.x + 0.5, fz = f.z + 0.5, dx = fx - P.x, dz = fz - P.z, dd = Math.hypot(dx, dz);
    if (dd < 1.9) {
      const fdx = Math.sin(P.face), fdz = Math.cos(P.face);
      const aimed = dd < 0.3 || (dx * fdx + dz * fdz) / dd > 0.75;
      if (!aimed) return { mx: dx / dd * 0.45, mz: dz / dd * 0.45, b: true };     // se tourner vers le feu
      return { go: [fx, fz], stop: 1.25, b: true };
    }
    const path = pathTo(A, P, { x: fx, z: fz }, 0.9, 1.7);
    return path && path.length ? A.Bot.follow(P, path) : A.Bot.toward(P, fx, fz, 1.3);
  }
  function quizAct(A, P, B, L, j) {
    const M = B.mem;
    if (!M.qpick || M.qpick.id !== j.id || j.off[M.qpick.k]) {
      // plus il est fort, plus il connaît la réponse (le traître se trompe exprès)
      const sure = isTraitor(A, P) ? 0.35 : 0.35 + 0.6 * L.skill;
      const free = [0, 1, 2].filter((k) => !j.off[k]);
      const wrong = free.filter((k) => k !== j.q.answer);
      M.qpick = { id: j.id, k: Math.random() < sure || !wrong.length ? j.q.answer : A.pick(wrong) };
    }
    const t = TILES[M.qpick.k], dd = Math.hypot(P.x - t.x, P.z - t.z);
    if (dd < 0.4) {
      const out = { go: [t.x, t.z], stop: 0.1 };
      if (A.clock - (M.lastTap || 0) > 0.6) { out.tapA = true; M.lastTap = A.clock; }
      return out;
    }
    if (dd < 1.6) return { go: [t.x, t.z], stop: 0.1 };
    return walk(A, P, t, 0.6);
  }
  function prankAct(A, P, B, L) {
    const S = A.S, M = B.mem, pr = M.prank;
    if (A.clock > pr.until || S.prankCd > 0) { M.prank = null; return null; }
    if (pr.kind === 'coupure') {
      if (S.blackout || S.jobs.some((j) => j.urgent)) { M.prank = null; return null; }
      const b = pr.b || (pr.b = BREAKERS.slice().sort((a, c) => Math.hypot(P.x - a.x, P.z - a.z) - Math.hypot(P.x - c.x, P.z - c.z))[0]);
      return goAct(A, P, B, L, b, 'tap');
    }
    if (pr.kind === 'porte') {
      if (S.door) { M.prank = null; return null; }
      const Dd = DOORS[pr.k];
      const dd = Math.hypot(P.x - Dd.cx, P.z - Dd.cz);
      if (dd < 0.35) return { go: [Dd.cx, Dd.cz], stop: 0.05, a: true };
      if (dd < 1.5) return { go: [Dd.cx, Dd.cz], stop: 0.05 };
      return walk(A, P, { x: Dd.cx, z: Dd.cz }, 0.3);
    }
    // fausse alerte : à l'écart des autres, B maintenu
    const crowd = A.players.some((Q) => Q !== P && A.dist(Q, P) < 3);
    if (!crowd) return { mx: 0, mz: 0, b: true };
    if (!pr.spot || Math.hypot(P.x - pr.spot[0], P.z - pr.spot[1]) < 0.5) pr.spot = A.pick(SPAWN.concat(PEDS));
    return A.Bot.toward(P, pr.spot[0], pr.spot[1], 0.3);
  }
  function botAct(A, P, B, L) {
    const S = A.S;
    if (!P.alive || S.mode === 'roles') return {};
    if (S.mode === 'vote') {
      const v = B.mem.vote;
      if (v === undefined || v < 0 || !S.peds) return {};
      if (S.voteT > 13 - L.react * 4) return {};           // le temps de réfléchir
      const p = S.peds[v];
      return Math.hypot(P.x - p.x, P.z - p.z) < 1.5 ? { go: [p.x, p.z], stop: 0.15 } : walk(A, P, p, 0.5);
    }
    if (S.ended) return {};
    // le traître (bot) : de temps en temps, une grosse farce
    if (isTraitor(A, P)) {
      const M = B.mem;
      if (!M.prank && S.prankCd <= 0 && S.gt > 18 && Math.random() < 0.04) {
        const kinds = ['fausse'];
        if (!S.blackout && !S.jobs.some((j) => j.urgent)) kinds.push('coupure');
        if (!S.door) kinds.push('porte');
        M.prank = { kind: A.pick(kinds), k: A.pick(Object.keys(DOORS)), until: A.clock + 12 };
      }
      if (M.prank) { const o = prankAct(A, P, B, L); if (o) return o; }
    }
    assign(A);
    const s = B.mem.s;
    if (!s || s.j.done || (s.f && !S.fires.includes(s.f)) || (s.p && s.p.on)) {
      if (!B.mem.idle || Math.hypot(P.x - B.mem.idle[0], P.z - B.mem.idle[1]) < 0.5) B.mem.idle = A.pick(IDLE);
      return A.Bot.toward(P, B.mem.idle[0], B.mem.idle[1], 0.3);
    }
    const j = s.j;
    if (j.kind === 'deliver' && P.data.part !== j.part) return goAct(A, P, B, L, SHELF[j.part], 'tap');
    if (j.kind === 'fire') return fireAct(A, P, B, L, s.f);
    if (j.kind === 'quiz') return quizAct(A, P, B, L, j);
    const mode = j.kind === 'mash' || j.kind === 'multi' || j.kind === 'deliver' ? 'tap' : 'hold';
    return goAct(A, P, B, L, s.p || j.pts[0], mode);
  }

  /* ==================================================================
     L'AFFICHAGE
     ================================================================== */
  function setCarry(A, P) {
    if (A.headless) return;
    if (!P.data.part) { A.icon(P, null); return; }
    A.icon(P, partMesh(A, P.data.part, SHELF[P.data.part].color));
  }
  function partMesh(A, k, color) {
    const g = new THREE.Group();
    if (k === 'gear') {
      const c = A.mesh('cyl', 0.2, color, { h: 0.08, metal: 0.6 }); c.rotation.x = Math.PI / 2; g.add(c);
      for (let i = 0; i < 6; i++) { const t = A.mesh('box', 0.08, color, { h: 0.08, d: 0.08, metal: 0.6 }); t.position.set(Math.cos(i) * 0.24, Math.sin(i) * 0.24, 0); g.add(t); }
    } else if (k === 'fuse') {
      const b = A.mesh('box', 0.16, 0xffffff, { h: 0.34, d: 0.16 }); const c1 = A.mesh('box', 0.18, color, { h: 0.08, d: 0.18 }); c1.position.y = 0.17; const c2 = c1.clone(); c2.position.y = -0.17; g.add(b, c1, c2);
    } else {
      const b = A.mesh('cyl', 0.13, color, { h: 0.36, emissive: color, ei: 0.3 }); const cap = A.mesh('cyl', 0.07, 0xffffff, { h: 0.08 }); cap.position.y = 0.22; g.add(b, cap);
    }
    return g;
  }

  function buildScene(A) {
    const S = A.S, G = A.grid;
    S.bill = [];
    for (const k in ST) {
      const st = ST[k], [c0, c1] = st.cells, cx = (c0[0] + c1[0]) / 2 + 0.5, cz = c0[1] + 0.5;
      const top = A.mesh('box', 2, st.color, { h: 0.12, d: 0.95, emissive: st.color, ei: 0.25 }); top.position.set(cx, G.wallH + 0.06, cz); A.add(top);
      if (k === 'gen') { const dr = A.mesh('cyl', 0.42, 0x7a2a22, { h: 0.9, metal: 0.4 }); dr.rotation.z = Math.PI / 2; dr.position.set(cx, G.wallH + 0.5, cz); A.add(dr); }
      if (k === 'ordi') { const sc = A.mesh('box', 1.1, 0x1a2a40, { h: 0.7, d: 0.1, emissive: 0x3d8bff, ei: 0.6 }); sc.position.set(cx, G.wallH + 0.45, cz); A.add(sc); S.screen = sc; }
      if (k === 'froid') { for (let i = 0; i < 4; i++) { const p = A.mesh('box', 0.12, 0x5ad1ff, { h: 0.5, d: 0.7, emissive: 0x5ad1ff, ei: 0.3 }); p.position.set(cx - 0.6 + i * 0.4, G.wallH + 0.3, cz); A.add(p); } }
      if (k === 'elec') { const pn = A.mesh('box', 1.2, 0x333333, { h: 0.6, d: 0.3 }); pn.position.set(cx, G.wallH + 0.35, cz); A.add(pn); const z1 = A.mesh('box', 0.3, 0xffe14a, { h: 0.3, d: 0.32, emissive: 0xffe14a, ei: 0.6 }); z1.position.set(cx, G.wallH + 0.4, cz); A.add(z1); S.elecLamp = z1; }
      const lab = A.label(`${st.icon} ${st.name.toUpperCase()}`, { size: 22, h: 0.3, color: '#ffffff', border: '#' + st.color.toString(16).padStart(6, '0') });
      lab.position.set(cx, G.wallH + 1.9, cz); A.add(lab); S.bill.push(lab);
    }
    for (const k in SHELF) {
      const sh = SHELF[k], xs = sh.cells.map((c) => c[0]), zs = sh.cells.map((c) => c[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, z0 = Math.min(...zs), z1 = Math.max(...zs) + 1;
      const shelf = A.mesh('box', x1 - x0 - 0.05, 0x8a6a3a, { h: 0.1, d: z1 - z0 - 0.05 }); shelf.position.set((x0 + x1) / 2, G.wallH + 0.05, (z0 + z1) / 2); A.add(shelf);
      for (const [cx, cz] of sh.cells) { const p = partMesh(A, k, sh.color); p.position.set(cx + 0.5, G.wallH + 0.35, cz + 0.5); p.scale.setScalar(1.3); A.add(p); }
      const lab = A.label(`${sh.icon} ${sh.name.toUpperCase()}`, { size: 20, h: 0.28, color: '#ffffff', border: '#8a6a3a' });
      lab.position.set((x0 + x1) / 2, G.wallH + 1.1, (z0 + z1) / 2); A.add(lab); S.bill.push(lab);
    }
    // la Grande Machine (7 × 5) : une grande cuve au centre, deux chaudières sur les côtés, la cheminée
    const mx = MC.x, mz = MC.z, gw = MACH.x1 - MACH.x0 - 1.4;      // gw : largeur de la jauge
    const tank = A.mesh('cyl', 1.85, 0x8a7a5a, { h: 1.4, metal: 0.5, rough: 0.4 }); tank.position.set(mx, G.wallH + 0.7, mz - 0.2); A.add(tank);
    const ring = A.mesh('cyl', 1.93, 0x5a4a32, { h: 0.18, metal: 0.6 }); ring.position.set(mx, G.wallH + 1.05, mz - 0.2); A.add(ring);
    for (const s of [-1, 1]) {
      const boil = A.mesh('cyl', 0.82, 0x7a6a4c, { h: 1.0, metal: 0.5, rough: 0.45 }); boil.position.set(mx + s * 2.55, G.wallH + 0.5, mz - 0.6); A.add(boil);
      const cap = A.mesh('cyl', 0.88, 0x5a4a32, { h: 0.12, metal: 0.6 }); cap.position.set(mx + s * 2.55, G.wallH + 1.0, mz - 0.6); A.add(cap);
      const pp = A.mesh('cyl', 0.16, 0x6a6f76, { h: 1.6, metal: 0.5 }); pp.rotation.z = Math.PI / 2; pp.position.set(mx + s * 1.4, G.wallH + 0.35, mz + 1.3); A.add(pp);
    }
    const chim = A.mesh('cyl', 0.32, 0x3a3a3a, { h: 1.6 }); chim.position.set(CHIM.x, G.wallH + 1.6, CHIM.z); A.add(chim); S.chim = chim;
    const beacon = A.mesh('ball', 0.28, 0xff2a1a, { emissive: 0xff2a1a, ei: 0.2 }); beacon.position.set(mx, G.wallH + 1.62, mz - 0.2); A.add(beacon); S.beacon = beacon;
    const gb = A.mesh('box', gw + 0.2, 0x1a1a1a, { h: 0.55, d: 0.08 }); gb.position.set(mx, G.wallH * 0.55, MACH.z1 + 1.05); A.add(gb);
    const gf = A.mesh('box', gw, 0xff5533, { h: 0.4, d: 0.1, emissive: 0xff5533, ei: 0.5 }); gf.position.set(mx, G.wallH * 0.55, MACH.z1 + 1.06); A.add(gf); S.gauge = gf; S.gx0 = mx - gw / 2; S.gw = gw;
    // les conduits (au-dessus et au-dessous de la machine) : de gros tuyaux posés sur les murs
    for (const p of PIPES) {
      const cx = (p.x0 + p.x1 + 1) / 2, cz = (p.z0 + p.z1 + 1) / 2, len = p.x1 - p.x0 + 1;
      const tube = A.mesh('cyl', 0.42, 0x6a6f76, { h: len - 0.2, metal: 0.55, rough: 0.35 }); tube.rotation.z = Math.PI / 2; tube.position.set(cx, G.wallH + 0.42, cz); A.add(tube);
      for (const dx of [-1.6, 0, 1.6]) { const bd = A.mesh('cyl', 0.48, 0xffcc33, { h: 0.16, metal: 0.3 }); bd.rotation.z = Math.PI / 2; bd.position.set(cx + dx, G.wallH + 0.42, cz); A.add(bd); }
    }
    // les disjoncteurs (aux coins)
    S.brk = BREAKERS.map((b) => {
      const g = new THREE.Group();
      const box = A.mesh('box', 0.5, 0x4a4f55, { h: 0.6, d: 0.2 }); box.position.y = 0.6;
      const lev = A.mesh('box', 0.1, 0x3cff9a, { h: 0.32, d: 0.1, emissive: 0x3cff9a, ei: 0.5 }); lev.position.set(0, 0.62, 0.14);
      g.add(box, lev); g.position.set(b.x, 0, b.z < D / 2 ? 0.95 : D - 0.95);
      A.add(g); return { g, lev };
    });
    // les passages des portes (rayures jaunes au sol)
    for (const k in DOORS) {
      const Dd = DOORS[k];
      for (const z of Dd.z) for (let s = 0; s < 3; s++) { const st = A.mesh('box', 0.9, s % 2 ? 0x1a1a1a : 0xffcc33, { h: 0.02, d: 0.3, basic: true, opacity: 0.55 }); st.position.set(Dd.x + 0.5, 0.012, z + 0.18 + s * 0.32); A.add(st); }
    }
    // les dalles de réponse (questions du Carnet)
    S.tileMeshes = TILES.map((t) => { const m = A.mesh('box', 0.92, t.c, { h: 0.03, basic: true, opacity: 0.25 }); m.position.set(t.x, 0.016, t.z); A.add(m); return m; });
    // les lampes de poche pour la coupure générale : un halo lumineux au sol (pas de vraie lumière : léger pour toutes les machines)
    const halo = OT.Models.canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.5, 'rgba(255,230,180,0.45)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    S.lamps = A.players.map(() => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), new THREE.MeshBasicMaterial({ map: halo, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      m.rotation.x = -Math.PI / 2; m.visible = false; A.add(m); return m;
    });
  }

  function makeDoor(A, Dd) {
    const S = A.S, G = A.grid;
    const g = new THREE.Group();
    for (const z of Dd.z) {
      const b = A.mesh('box', 0.96, 0xffcc33, { h: G.wallH + 0.2, d: 0.96, metal: 0.3 }); b.position.set(Dd.x + 0.5, (G.wallH + 0.2) / 2, z + 0.5);
      const s = A.mesh('box', 0.98, 0x1a1a1a, { h: 0.18, d: 0.98 }); s.position.set(Dd.x + 0.5, G.wallH * 0.6, z + 0.5);
      g.add(b, s);
    }
    A.add(g); S.doorMesh = g;
  }

  function makePeds(A) {
    const S = A.S;
    S.pedMesh = S.peds.map((p) => {
      const P = A.players[p.i];
      const base = A.mesh('cyl', 0.8, P.color, { h: 0.12, emissive: P.color, ei: 0.35 }); base.position.set(p.x, 0.06, p.z); A.add(base);
      const lab = A.label(`${P.name} ?`, { size: 26, h: 0.36, color: P.css, border: P.css }); lab.position.set(p.x, 0.9, p.z - 0.9); A.add(lab); S.bill.push(lab);
      return { base, lab, n: -1 };
    });
  }

  function makeMarker(A, j) {
    if (A.headless) return;
    const col = j.urgent ? 0xff3b30 : j.color;
    j.mk = [];
    if (j.kind === 'quiz') {
      TILES.forEach((t, k) => {
        const ring = A.mesh('ring', 0.62, t.c, { basic: true, opacity: 0.7 }); ring.position.set(t.x, 0.04, t.z); ring.userData.tile = k; A.add(ring); j.mk.push(ring);
        const lab = A.label(t.l, { size: 40, h: 0.55, color: '#ffffff', border: '#' + t.c.toString(16).padStart(6, '0') }); lab.position.set(t.x, 0.9, t.z); lab.userData.bill = true; lab.userData.tile = k; A.add(lab); j.mk.push(lab);
      });
      const lab = A.label(`${j.icon} ${j.text} : A, B ou C ?`, { size: 24, h: 0.33, color: '#fff3c4', border: '#3d8bff' }); lab.position.set(QUIZ_LAB.x, 2.15, QUIZ_LAB.z); lab.userData.bill = true; A.add(lab); j.mk.push(lab);
      return;
    }
    j.pts.forEach((p, k) => {
      const ring = A.mesh('ring', 0.85, col, { basic: true, opacity: 0.6 }); ring.position.set(p.x, 0.04, p.z); A.add(ring); j.mk.push(ring);
      if (k === 0 || j.kind === 'duo') {
        const lab = A.label(`${j.icon} ${j.text}`, { size: 24, h: 0.33, color: j.urgent ? '#ffffff' : '#fff3c4', bg: j.urgent ? 'rgba(160,20,10,0.92)' : 'rgba(14,11,9,0.88)', border: j.urgent ? '#ff3b30' : '#' + col.toString(16).padStart(6, '0') });
        lab.position.set(p.x, 2.15, p.z); A.add(lab); j.mk.push(lab); lab.userData.bill = true; lab.userData.isLab = k === 0;
        if (j.kind !== 'fire' && j.kind !== 'multi' && j.kind !== 'deliver') {
          const bg = A.mesh('box', 1.2, 0x111111, { h: 0.12, d: 0.05, basic: true }); bg.position.set(p.x, 1.82, p.z); bg.userData.bill = true;
          const fl = A.mesh('box', 1.14, 0x3cff9a, { h: 0.08, d: 0.06, basic: true }); fl.position.set(p.x, 1.82, p.z); fl.userData.fill = j; fl.userData.px = p.x;
          A.add(bg); A.add(fl); j.mk.push(bg, fl);
        }
      }
    });
  }

  function drawAll(A, dt, time) {
    const S = A.S, cam = A.camera;
    if (S.bill) for (const b of S.bill) b.quaternion.copy(cam.quaternion);
    if (S.gauge) {
      const p = Math.max(0.001, S.prog / 100);
      S.gauge.scale.x = p; S.gauge.position.x = S.gx0 + (S.gw / 2) * p;
      const c = p < 0.4 ? 0xff5533 : p < 0.75 ? 0xffcc33 : 0x3cff9a;
      if (S.gaugeCol !== c) { S.gaugeCol = c; S.gauge.material.color.copy(A.lin(c)); S.gauge.material.emissive.copy(A.lin(c)); }
      const pct = Math.floor(S.prog);
      if (pct !== S.lastPct) {
        S.lastPct = pct;
        if (S.pctLab) A.remove(S.pctLab);
        S.pctLab = A.label(`MACHINE ${pct} %`, { size: 28, h: 0.42, color: c === 0x3cff9a ? '#3cff9a' : c === 0xffcc33 ? '#ffcc33' : '#ff7a5a', border: '#444444' });
        S.pctLab.position.set((MACH.x0 + MACH.x1 + 1) / 2, A.grid.wallH + 2.3, (MACH.z0 + MACH.z1 + 1) / 2);
        A.add(S.pctLab);
      }
      if (S.pctLab) S.pctLab.quaternion.copy(cam.quaternion);
    }
    const alarm = S.jobs.some((j) => j.urgent);
    if (S.beacon) S.beacon.material.emissiveIntensity = alarm ? (Math.sin(time * 12) > 0 ? 2.2 : 0.2) : 0.15;
    const hot = S.jobs.some((j) => j.tid === 'surchauffe');
    if (S.chim) S.chim.position.y = A.grid.wallH + 0.7 + (hot ? Math.sin(time * 30) * 0.03 : 0);
    if (hot && Math.random() < dt * 8) A.burst(CHIM.x, A.grid.wallH + 2.5, CHIM.z, 3, [0xffffff, 0xdddddd], 1.5, { up: 2.5, grav: -1, life: 1 });
    if (S.screen) S.screen.material.emissive.copy(A.lin(S.jobs.some((j) => j.tid === 'virus') ? (Math.sin(time * 10) > 0 ? 0x9a2aff : 0x2aff5a) : 0x3d8bff));
    if (S.elecLamp) S.elecLamp.material.emissiveIntensity = S.jobs.some((j) => j.tid === 'surcharge' || j.tid === 'panne') ? (Math.random() < 0.5 ? 2 : 0) : 0.6;
    if (S.jobs.some((j) => j.tid === 'surcharge') && Math.random() < dt * 6) A.burst(ST.elec.x + A.rand(-1, 1), 1.2, ST.elec.z + 0.6, 4, [0xffe14a, 0xffffff], 3);
    const cut = S.jobs.find((j) => j.tid === 'coupure');
    if (S.brk) S.brk.forEach((b, k) => {
      const on = !cut || cut.pts[k].on;
      b.lev.rotation.x = on ? -0.5 : 0.5;
      const c = A.lin(on ? 0x3cff9a : 0xff3b30); b.lev.material.color.copy(c); b.lev.material.emissive.copy(c);
      b.lev.material.emissiveIntensity = !on ? 0.6 + Math.sin(time * 8) * 0.5 : 0.5;
    });
    if (S.lamps) S.lamps.forEach((l, i) => { const P = A.players[i]; l.visible = S.blackout && P.alive; l.position.set(P.x, 0.03, P.z); });
    const quiz = S.jobs.find((j) => j.kind === 'quiz');
    if (S.tileMeshes) S.tileMeshes.forEach((m, k) => { m.material.opacity = quiz && !quiz.off[k] ? 0.45 + Math.sin(time * 4 + k) * 0.15 : 0.12; });
    for (const f of S.fires) if (f.parts) { f.parts[0].scale.y = 0.8 + Math.sin(time * 14 + f.id) * 0.2; f.parts[1].scale.y = 0.8 + Math.sin(time * 18 + f.id * 2) * 0.25; f.m.scale.setScalar(0.5 + 0.5 * Math.max(0, f.hp)); }
    for (const P of A.players) if (P.alive && P.in.b && S.mode === 'play' && Math.random() < dt * 30) A.burst(P.x + Math.sin(P.face) * 0.5, 0.7, P.z + Math.cos(P.face) * 0.5, 2, [0xffffff, 0xe0f0ff], 3.5, { grav: 2, life: 0.35, flat: true });
    if (S.pedMesh) S.pedMesh.forEach((m, k) => {
      const n = S.tally ? S.tally[S.peds[k].i] : 0;
      m.base.scale.y = 1 + n * 0.6; m.base.position.y = 0.06 * (1 + n * 0.6);
      if (m.n !== n) {
        m.n = n;
        const P = A.players[S.peds[k].i], i = S.bill.indexOf(m.lab);
        A.remove(m.lab);
        m.lab = A.label(`${P.name} ? ${'🗳️'.repeat(n)}`, { size: 26, h: 0.36, color: P.css, border: P.css });
        m.lab.position.set(S.peds[k].x, 0.9, S.peds[k].z - 0.9); A.add(m.lab);
        if (i >= 0) S.bill[i] = m.lab; else S.bill.push(m.lab);
      }
    });
    for (const j of S.jobs) {
      if (!j.mk) continue;
      for (const m of j.mk) {
        if (m.userData.bill) m.quaternion.copy(cam.quaternion);
        if (m.userData.fill) { const k = Math.max(0.001, Math.min(1, j.work / j.need)); m.scale.x = k; m.position.x = m.userData.px - 0.57 + 0.57 * k; m.quaternion.copy(cam.quaternion); m.material.color.copy(A.lin(S.blackout && !j.urgent ? 0x777777 : 0x3cff9a)); }
        if (m.geometry && m.geometry.type === 'RingGeometry') m.material.opacity = (j.urgent ? 0.45 + Math.sin(time * 8) * 0.3 : 0.35 + Math.sin(time * 3) * 0.15) * (S.blackout && !j.urgent ? 0.3 : 1);
      }
      if (j.timer !== undefined && Math.ceil(j.timer) !== j.shownT) {
        j.shownT = Math.ceil(j.timer);
        const old = j.mk.find((m) => m.userData.isLab);
        const lab = A.label(`${j.icon} ${j.text} ${j.shownT} s`, { size: 24, h: 0.33, color: '#ffffff', bg: 'rgba(160,20,10,0.92)', border: '#ff3b30' });
        const p = j.pts[0]; lab.position.set(p.x, 2.15, p.z); lab.userData.bill = true; lab.userData.isLab = true;
        A.add(lab);
        const idx = old ? j.mk.indexOf(old) : -1;
        if (idx >= 0) { A.remove(j.mk[idx]); j.mk[idx] = lab; } else j.mk.push(lab);
      }
    }
  }
})();
