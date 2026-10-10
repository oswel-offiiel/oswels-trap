/* =====================================================================
   OSWEL'S TRAP — data.js  (version 4)
   Toutes les DONNÉES du jeu : niveaux du Monde 1, personnages,
   dialogues, fragments, leçons, quiz, chapitre, boutique, mondes.
   Aucune logique de jeu ici : seulement la description du contenu.

   Système de coordonnées des niveaux :
   - x va de gauche (0) à droite.
   - y va de BAS (0) en HAUT.  y = 0 est la rangée du bas.
   - Un joueur posé sur une tuile de la rangée y a ses pieds à y + 1.
   ===================================================================== */

window.OT = window.OT || {};

/* ---------------------------------------------------------------------
   1. Le constructeur de niveaux
   --------------------------------------------------------------------- */
OT.mkLevel = function (w, h) {
  // Tuiles de la grille :
  //  '#' bloc de métal        'E' sol électrique       '=' bloc qui s'effondre
  //  '~' sol piégé (tombe quand un déclencheur s'active)
  //  '^' pics                 'W' pics au plafond (pointe vers le bas)
  //  'H' caisse à outils piégée (des pics sortent quand on approche)
  //  'v' bloc suspendu qui tombe (déclencheur)
  //  'o' faux mur « NE PAS OUVRIR » (on passe à travers)
  //  'f' faux sol fissuré (on tombe à travers)
  //  'h' caisse à outils INOFFENSIVE : identique à 'H', mais elle cache une pièce
  //  ---- Monde 2 (Le Code) ----
  //  'X' bloc « glitch » : il apparaît et disparaît en boucle (clignote avant)
  //  'T' balise : solide seulement quand sa balise ouvrante est active
  //  'R' style « glace » (on glisse)      'Y' style « ressort » (on rebondit)
  //  'J' pics qui sortent quand quelqu'un saute      'P' pont qui n'existe que si personne ne saute
  //  'C' bloc à compiler (apparaît après le bouton COMPILER)
  //  ---- Mondes 3, 4, 5 ----
  //  '<' '>' tapis roulants      'A' acide (mortel)
  //  'K' bloc rose / 'Q' bloc bleu : chaque saut fait basculer lesquels existent
  //  'D' sol du doute (boss final)
  const grid = [];
  const meta = {};      // infos par case : meta['x,y'] = { phase, group, order… }
  for (let y = 0; y < h; y++) grid.push(new Array(w).fill(' '));
  const L = {
    w, h, grid, meta, ents: [], spawn: { x: 2, y: 1 }, cp: null,
    set(x, y, ch) { if (x >= 0 && x < L.w && y >= 0 && y < L.h) grid[y][x] = ch; return L; },   // L.w / L.h : un niveau peut s'agrandir (version 1.3)
    rect(x0, y0, x1, y1, ch) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) L.set(x, y, ch); return L; },
    add(type, x, y, props) { L.ents.push(Object.assign({ type, x, y }, props || {})); return L; },
    start(x, y) { L.spawn = { x, y }; return L; },
    npc(x, y, id) { return L.add('npc', x, y, { id }); },
    rumeur(x, y, text) { return L.add('rumeur', x, y, { text }); },
    sign(x, y, text) { return L.add('sign', x, y, { text }); },
    door(x, y, props) { return L.add('door', x, y, props); },
    fakeDoor(x, y, label) { return L.add('fakedoor', x, y, { label }); },
    // act : 'drop' (sol piégé), 'ceiling' (blocs suspendus), 'doorRun' (la porte s'enfuit)
    trigger(x, y, act, opts) { return L.add('trigger', x, y, Object.assign({ act }, opts || {})); },
    spring(x, y) { return L.add('spring', x, y); },
    wrench(x, y) { return L.add('wrench', x, y); },
    // long : le bouton reste actif 3 s même en coop (utile pour les portes « ET »)
    button(x, y, long, o) { return L.add('button', x, y, Object.assign({ long: !!long }, o || {})); },   // o : { time (bouton chronométré), g (groupe) }
    gate(x, y0, y1, all, o) { return L.add('gate', x, y0, Object.assign({ y1, all: !!all }, o || {})); },   // o : { lv (levier), inv, g (groupe de boutons) }
    sw(x, y, fake) { return L.add('switch', x, y, { fake: !!fake }); },
    part(x, y) { return L.add('part', x, y); },
    fakePart(x, y) { return L.add('fakepart', x, y); },
    coin(x, y) { return L.add('coin', x, y); },
    coins(x0, x1, y) { for (let x = x0; x <= x1; x++) L.coin(x, y); return L; },
    // plateforme-machine : 'm' grise (inverse), 'n' dorée (même sens)
  // 'M' bouge toute seule de gauche à droite, 'V' monte et descend (opts : speed, phase)
    plat(x, y, kind, range, opts) { return L.add('plat', x, y, Object.assign({ kind, range }, opts || {})); },
    piston(x, phase, o) { return L.add('piston', x, 0, Object.assign({ phase }, o || {})); },   // o : { top, bottom, h } (sinon selon la hauteur du niveau)
    booth(x0, x1, y) { return L.add('booth', x0, y, { x1 }); },
    // caisse à outils inoffensive : même apparence que le piège, une pièce cachée dedans
    box(x, y) { L.set(x, y, 'h'); return L.add('coin', x, y, { inBox: true }); },
    // drapeau de reprise (utilisé seulement en mode facile)
    check(x, y) { L.cp = { x, y }; return L; },
    // ---- Monde 2 ----
    glitch(x0, x1, y, phase, period) { for (let x = x0; x <= x1; x++) { L.set(x, y, 'X'); meta[x + ',' + y] = { phase: phase || 0, period: period || 2.4 }; } return L; },
    tags(x0, x1, y, g) { for (let x = x0; x <= x1; x++) { L.set(x, y, 'T'); meta[x + ',' + y] = { group: g }; } return L; },
    tagOpen(x, y, g, label, time) { return L.add('tagopen', x, y, { g, label: label || '<div>', time }); },
    tagClose(x, y, g, label) { return L.add('tagclose', x, y, { g, label: label || '</div>' }); },
    style(x0, x1, y, ch) { return L.rect(x0, y, x1, y, ch); },
    jumpSpikes(x0, x1, y) { return L.rect(x0, y, x1, y, 'J'); },
    bridge(x0, x1, y) { return L.rect(x0, y, x1, y, 'P'); },
    compile(x, y, cells, opts) { const g = (opts && opts.g) || 0; cells.forEach(([cx, cy], i) => { L.set(cx, cy, 'C'); meta[cx + ',' + cy] = { order: i, cg: g }; }); return L.add('compile', x, y, Object.assign({ g }, opts || {})); },
    link(x, y, tx, ty, label, good) { return L.add('link', x, y, { tx, ty, label, good: !!good }); },
    rival(speed, name, path) { return L.add('rival', 0, 0, { speed, name: name || 'yannick', path }); },
    // ---- Mondes 3, 4, 5 ----
    belt(x0, x1, y, dir) { return L.rect(x0, y, x1, y, dir > 0 ? '>' : '<'); },          // tapis roulant
    acid(x0, x1, y) { return L.rect(x0, y, x1, y, 'A'); },                                 // bassin d'acide
    blocks(x0, y0, x1, y1, ch) { return L.rect(x0, y0, x1, y1, ch); },                      // 'K' rose / 'Q' bleu
    // laser entre deux points (horizontal si y0 = y1, vertical si x0 = x1) ; o = { period, phase, on }
    laser(x0, y0, x1, y1, o) { return L.add('laser', x0, y0, Object.assign({ x0, y0, x1, y1 }, o || {})); },
    lowg(x0, y0, x1, y1) { return L.add('lowg', x0, y0, { x0, y0, x1, y1 }); },             // apesanteur
    fan(x, y, h, power) { return L.add('fan', x, y, { h, power }); },                       // ventilateur
    portal(ax, ay, bx, by, o) { return L.add('portal', ax, ay, Object.assign({ tx: bx, ty: by }, o || {})); },
    portals(ax, ay, bx, by, o) { L.portal(ax, ay, bx, by, o); return L.portal(bx, by, ax, ay, o); },
    traffic(y, x0, x1, speed, cars) { return L.add('traffic', x0, y, { y, x0, x1, speed, cars }); },
    // ---- Version 1.3 : grands niveaux (sections, reprises, nouveaux pièges) ----
    //  'Z' sol brûlant (chauffe, rougeoie, puis brûle)   'G' gelée qui ralentit   '{' '}' tapis accélérateurs
    //  'N' bloc de levier (existe selon la position d'un levier)
    flag(x, y, o) { return L.add('cp', x, y, o); },                                         // point de reprise (tous les modes)
    fakeFlag(x, y, act) { return L.add('cp', x, y, { fake: true, act: act || 'drop' }); },   // faux drapeau (pas de lampe)
    saw(x0, y0, x1, y1, o) { return L.add('saw', x0, y0, Object.assign({ x0, y0, x1, y1 }, o || {})); },
    sawRing(cx, cy, rad, o) { return L.add('saw', cx, cy, Object.assign({ x0: cx, y0: cy, ring: true, rad }, o || {})); },
    hammer(x, y, o) { return L.add('hammer', x, y, o); },                                   // pivot au plafond
    crusher(x, y, o) { return L.add('crusher', x, y, o); },                                 // bloc qui tombe quand on passe dessous
    spear(x, y, dir, o) { return L.add('spear', x, y, Object.assign({ dir }, o || {})); },   // lances qui sortent d'un mur
    pike(x, y, o) { return L.add('spear', x, y, Object.assign({ dir: 1, vert: true, len: 1.4 }, o || {})); },   // pique qui sort du sol en rythme
    turret(x, y, dir, o) { return L.add('turret', x, y, Object.assign({ dir }, o || {})); },
    barrel(x, y) { return L.add('barrel', x, y); },                                          // bidon explosif
    zone(kind, x0, y0, x1, y1, o) { return L.add('zone', x0, y0, Object.assign({ kind, x0, y0, x1, y1 }, o || {})); },
    chase(x0, x1, o) { return L.add('chase', x0, 0, Object.assign({ x0, x1 }, o || {})); },  // poursuite (rare !)
    crate(x, y) { return L.add('crate', x, y); },                                           // caisse à pousser
    lever(x, y, g, o) { return L.add('lever', x, y, Object.assign({ g }, o || {})); },
    lblocks(x0, x1, y, g, inv) { for (let x = x0; x <= x1; x++) { L.set(x, y, 'N'); meta[x + ',' + y] = { lg: g, inv: !!inv }; } return L; },
    heat(x0, x1, y, o) { for (let x = x0; x <= x1; x++) { L.set(x, y, 'Z'); meta[x + ',' + y] = Object.assign({ period: 3, phase: 0 }, o || {}); } return L; },
    goo(x0, x1, y) { return L.rect(x0, y, x1, y, 'G'); },
    boost(x0, x1, y, dir) { return L.rect(x0, y, x1, y, dir > 0 ? '}' : '{'); },
    crumble(x0, x1, y, delay) { for (let x = x0; x <= x1; x++) { L.set(x, y, '='); if (delay) meta[x + ',' + y] = { delay }; } return L; },
    fakeCoin(x, y, act) { return L.add('fakecoin', x, y, { act: act || 'drop' }); },        // fausse pièce (elle ne flotte pas)
    wire(x, y, act, o) { return L.add('trigger', x, y, Object.assign({ act, wire: true }, o || {})); },   // fil tendu, bien visible
    camz(x0, x1, z, o) { return L.add('camz', x0, 0, Object.assign({ x0, x1, z }, o || {})); },          // zoom doux de la caméra
    press(x, y, o) { return L.add('press', x, y, o); },                                     // murs qui se referment
    gateDoor(x, y, to, o) { return L.add('door', x, y, Object.assign({ to }, o || {})); },   // porte de zone (point de reprise)
    trapFloor(x0, x1, y) { for (let x = x0; x <= x1; x++) { L.set(x, y, '~'); meta[x + ',' + y] = { hint: true }; } return L; },   // sol piégé AVEC une fine fissure
    linger(x0, x1, y, o) { return L.add('linger', x0, y, Object.assign({ x0, x1 }, o || {})); },        // « ne traîne pas ici »
  };
  L.rect(0, 0, 0, h - 1, '#');
  L.rect(w - 1, 0, w - 1, h - 1, '#');
  L.rect(0, h - 1, w - 1, h - 1, '#');
  return L;
};

/* ---------------------------------------------------------------------
   2. Les personnages (les vraies personnes du parcours d'Oswel)
   --------------------------------------------------------------------- */
OT.CHARACTERS = {
  patou:     { name: 'Oncle Patou',       color: 0x6f7f4a, hat: 0x3b3b3b, hatType: 'cap' },
  tante:     { name: 'La femme de Patou', color: 0xc0392b, hat: 0xf2d16b, hatType: 'scarf', female: true, skirt: 0xf2d16b },
  christine: { name: 'Christine',         color: 0x8e5bd6, hat: 0x2b1a40, hatType: 'bun', female: true, hairStyle: 'braidsL', accent: 0xffd23f },
  franck:    { name: 'Franck',            color: 0xd42a2a, hat: 0x7a1414, hatType: 'braids', beads: 0xffd23f, char: 'franck' },   // rouge (sa couleur préférée), nattes sur toute la tête ; jouable aussi
  romeo:     { name: 'Romeo',             color: 0xe0b52c, hat: 0x5a3d00, hatType: 'band' },
  rumeur:    { name: 'La Rumeur',         color: 0x2a2a33, hat: 0x111116, hatType: 'hood' },
  gardien:   { name: 'Le Gardien de la Forge', color: 0xff7a1a },
  oswel:     { name: 'Oswel',             color: 0x3d8bff },
  echo:      { name: "L'Écho",            color: 0xff8a2b },
};

/* ---------------------------------------------------------------------
   3. Monde 1 — LA FORGE
   Chaque niveau : titre, leçon racontée, fragment de l'histoire,
   dialogues ('lines' = normal, 'alt' = après 3 chutes),
   et une LEÇON TECHNIQUE vraie, apprise à la fin du niveau
   (elle revient dans le quiz de fin de monde).
   --------------------------------------------------------------------- */
OT.WORLD1 = { id: 1, name: 'La Forge', motto: 'Comprendre comment les choses fonctionnent', levels: [] };
const W1 = OT.WORLD1.levels;

/* ---------- 1-1 : Premier jour à l'atelier ---------- */
(function () {
  const L = OT.mkLevel(66, 10);
  L.rect(1, 0, 64, 0, '#');
  L.set(25, 0, ' ').set(26, 0, ' ');
  L.start(3, 1);
  L.npc(5, 1, 'patou').npc(7, 1, 'christine').npc(10, 1, 'tante');
  L.wrench(14, 1).coin(14, 3);                       // la clé à molette… qui éjecte
  L.sign(18, 1, 'CAISSE À OUTILS →');
  L.set(20, 1, 'H').coin(20, 3);                     // la caisse à outils mord
  L.coins(25, 26, 3);
  L.rumeur(29, 1, 'Il paraît que la clé à molette est inoffensive.');
  L.button(32, 1).gate(34, 1, 6).button(36, 1);      // porte du garage
  L.check(38, 1);
  L.rect(41, 0, 43, 0, '~').trigger(41, 1, 'drop').coins(41, 43, 2);
  L.door(46, 1).trigger(44, 1, 'doorRun', { to: 63 }); // la porte s'enfuit !
  L.set(50, 1, '^').coin(50, 3);
  L.box(47, 1);                                      // celle-ci est inoffensive…
  L.set(55, 1, 'H');                                 // …celle-là non
  L.rect(58, 0, 59, 0, ' ').coins(58, 59, 3);
  W1.push({
    title: "Premier jour à l'atelier", par: 13, goal: "Atteins la porte SORTIE.", lesson: 'La découverte des outils', tone: 'troll',
    fragment: '« Le premier jour, même la clé à molette se moque de toi. »',
    intro: [['echo', 'Tu es sûr de savoir ce que tu fais ?'], ['oswel', "Non. C'est pour ça qu'on est là."]],
    dialogs: {
      patou: { lines: ["Bienvenue à l'atelier, petit. Ici, on apprend avec les mains.", "Une porte, ça ne s'ouvre pas tout seul : mets-toi devant et appuie sur le bouton qui sert à parler.", 'Le sol est solide. Fais-moi confiance.'],
        alt: ['Règle numéro un : ne fais jamais confiance à quelqu\'un qui dit « fais-moi confiance ».', 'Et ne cours pas après la porte. Elle finit toujours par s\'arrêter.'] },
      christine: { lines: ["Je t'ai vu démonter la radio de la maison. Cette fois, essaie de la remonter.", "La porte du garage ne reste pas ouverte toute seule. Il faut quelqu'un sur le bouton."],
        alt: ['Tu tombes, tu te relèves. C\'est tout ce qu\'on te demande.'] },
      tante: { lines: ['Tu as encore les mains noires de graisse ? Mange d\'abord, les machines attendront.', 'Les caisses à outils, on les ouvre avec ce même bouton. Certaines cachent une pièce… d\'autres mordent.'],
        alt: ['Courage. Même ton oncle a cassé trois clés le premier jour. Ne lui dis pas que je te l\'ai dit.', 'Regarde bien les caisses avant de les ouvrir : celles qui mordent ne tiennent pas en place.'] },
    },
    teach: {
      title: 'La clé à molette',
      text: "Une clé à molette a une mâchoire réglable : on tourne la molette pour l'adapter à plusieurs tailles d'écrous. Une clé plate, elle, ne convient qu'à une seule taille, mais elle tient mieux l'écrou.",
      q: { question: "Quel est l'avantage principal d'une clé à molette ?", options: ["Elle s'adapte à plusieurs tailles d'écrous", 'Elle serre plus fort que toutes les autres clés', 'Elle sert à mesurer les pièces', 'Elle coupe le métal'], answer: 0,
        explain: 'Sa mâchoire réglable lui permet de saisir des écrous de tailles différentes.' },
    },
    build: L,
  });
})();

/* ---------- 1-2 : Démontage ---------- */
(function () {
  const L = OT.mkLevel(70, 13);
  L.rect(1, 0, 68, 0, '#');
  L.rect(1, 1, 8, 1, '#');
  L.rect(9, 1, 62, 1, '^');
  L.rect(63, 1, 68, 1, '#');
  const steps = [[11, 2, 13], [16, 3, 17], [21, 4, 22], [26, 5, 27], [30, 4, 31], [34, 3, 36], [39, 5, 41], [44, 7, 46], [49, 5, 51], [54, 3, 56], [59, 2, 61]];
  steps.forEach(([x0, y, x1]) => { L.rect(x0, y, x1, y, '='); L.coin(Math.round((x0 + x1) / 2), y + 2); });
  L.start(2, 2);
  L.npc(5, 2, 'patou');
  L.box(65, 2);                                      // caisse inoffensive (une pièce dedans)
  L.door(67, 2);
  L.set(8, 2, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W1.push({
    title: 'Démontage', par: 16, goal: "Traverse sur les blocs rouillés sans t'arrêter dessus.", lesson: "L'apprentissage des mécanismes", tone: 'calme',
    fragment: '« Pour comprendre une machine, il faut d\'abord la démonter. »',
    dialogs: {
      patou: { lines: ['Pour comprendre une machine, il faut d\'abord la démonter.', 'Ces pièces rouillées ne tiennent même pas une demi-seconde. Ne t\'arrête jamais dessus.'],
        alt: ['Plus vite ! Et ne regarde pas les pièces d\'or : regarde où tu vas atterrir.'] },
    },
    teach: {
      title: "L'ordre de démontage",
      text: "Avant de démonter un mécanisme, on note ou on photographie l'ordre des pièces et leur sens. On les range dans l'ordre de sortie. Le remontage se fait dans l'ordre inverse du démontage.",
      q: { question: 'Dans quel ordre remonte-t-on un mécanisme ?', options: ['Dans l\'ordre inverse du démontage', 'Dans le même ordre que le démontage', 'En commençant par les plus grosses pièces', 'Peu importe l\'ordre'], answer: 0,
        explain: 'La dernière pièce sortie est la première remise en place.' },
    },
    build: L,
  });
})();

/* ---------- 1-3 : Tout tourne ensemble ---------- */
(function () {
  const L = OT.mkLevel(60, 9);
  L.rect(1, 0, 58, 0, '#');
  L.rect(1, 1, 7, 1, '#');
  L.rect(8, 1, 50, 1, '^');
  L.rect(51, 1, 58, 1, '#');
  // Cinq plateformes liées : quand tu es debout sur l'une, ton joystick les pilote toutes.
  L.plat(12, 1, 'm', 3).plat(20, 1, 'n', 3).plat(28, 1, 'm', 3).plat(36, 1, 'n', 3).plat(44, 1, 'm', 3);
  [16, 24, 32, 40, 48].forEach((x) => L.coin(x, 4));
  L.coin(30, 5);   // atteignable d'un saut depuis la plateforme (avant : trop haute)
  L.start(2, 2);
  L.npc(4, 2, 'franck');
  L.rumeur(54, 2, 'Il paraît que les engrenages tournent dans le bon sens.');
  L.set(56, 2, 'H');
  L.door(58, 2);
  L.box(51, 2);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W1.push({
    title: 'Tout tourne ensemble', par: 27, goal: "Monte sur les plateformes et pilote-les jusqu'à la sortie.", lesson: 'Une machine, ce sont des pièces qui travaillent ensemble', tone: 'sérieux',
    fragment: '« Une pièce seule ne fait rien. Ensemble, elles font avancer le monde. »',
    intro: [['oswel', 'Ces plateformes bougent quand on bouge…'], ['echo', 'Toutes en même temps. Et pas toujours dans le bon sens.']],
    dialogs: {
      franck: { lines: ['Toi tu tournes à gauche, moi à droite. Non, ton autre gauche.', 'Debout sur une plateforme, tu ne marches plus : tu pilotes. Et les cinq bougent en même temps.', 'Les grises vont à l\'envers de ta commande. Les dorées vont dans le même sens. Saute pour changer de plateforme.'],
        alt: ['Sur une grise, pousse à gauche jusqu\'au bout : la suivante vient se coller à toi. Sur une dorée, pousse à droite.'] },
    },
    teach: {
      title: 'Les engrenages',
      text: "Deux engrenages qui s'engrènent tournent en sens inverse. Le rapport de leurs dents donne le rapport de vitesse : si le petit a 10 dents et le grand 20, le petit fait 2 tours quand le grand en fait 1.",
      q: { question: 'Un pignon de 10 dents entraîne une roue de 20 dents. Quand la roue fait 1 tour, combien de tours fait le pignon ?', options: ['2 tours', '1 tour', 'Un demi-tour', '20 tours'], answer: 0,
        explain: '20 ÷ 10 = 2 : le petit engrenage tourne deux fois plus vite, et en sens inverse.' },
    },
    build: L,
  });
})();

/* ---------- 1-4 : Le bruit bizarre ---------- */
(function () {
  const L = OT.mkLevel(82, 11);
  L.rect(1, 0, 80, 0, '#');
  L.rect(22, 0, 24, 0, ' ').rect(37, 0, 39, 0, ' ').rect(58, 0, 60, 0, ' ');
  // Escalier caché vers la pièce défectueuse (une marche s'effondre)
  L.rect(10, 2, 11, 2, '#').rect(6, 4, 7, 4, '=').rect(2, 6, 4, 6, '#');
  L.part(3, 7).coin(10, 4).coin(7, 6);
  L.start(14, 1);
  L.npc(16, 1, 'patou');
  L.set(28, 1, '^').set(29, 1, '^').coin(28, 3);
  L.set(33, 1, 'H');
  L.coins(37, 39, 3);
  L.rect(43, 0, 45, 0, '~').trigger(43, 1, 'drop').coins(43, 45, 2);
  L.check(47, 1);
  L.rect(49, 1, 50, 2, '#');
  L.rect(54, 6, 57, 6, 'v').trigger(53, 1, 'ceiling').coin(55, 1);
  L.coins(58, 60, 3);
  L.rumeur(64, 1, 'Il paraît que la pièce est juste à côté de la porte.');
  L.fakePart(70, 1);                  // la FAUSSE pièce : elle explose
  L.box(74, 1);                                      // caisse inoffensive
  L.door(78, 1, { needsPart: true });
  W1.push({
    title: 'Le bruit bizarre', par: 22, goal: "Trouve la vraie pièce du moteur, puis atteins la sortie.", lesson: "Chercher l'origine d'un problème", tone: 'drôle',
    fragment: '« La panne n\'est jamais là où ça fait du bruit. »',
    dialogs: {
      patou: { lines: ['Tu entends ce bruit ? Le moteur de la porte est malade.', 'Il lui manque une pièce. Ne la cherche pas près de la porte : remonte vers l\'origine. Ta manette vibrera plus fort quand tu chaufferas.'],
        alt: ['La vraie pièce ne vibre pas pour rien. Si ta manette reste calme près d\'une pièce… ce n\'est pas la bonne.'] },
    },
    teach: {
      title: 'Le diagnostic',
      text: "Pour trouver une panne, on part du symptôme et on remonte la chaîne : l'énergie arrive-t-elle ? la transmission marche-t-elle ? l'organe qui travaille est-il en bon état ? On teste une seule hypothèse à la fois.",
      q: { question: 'Quelle est la bonne méthode pour chercher une panne ?', options: ['Remonter la chaîne et tester une hypothèse à la fois', 'Changer toutes les pièces en même temps', 'Réparer là où ça fait le plus de bruit', 'Attendre que la panne disparaisse'], answer: 0,
        explain: 'Une hypothèse à la fois : sinon, on ne sait jamais ce qui a vraiment réparé (ou cassé) la machine.' },
    },
    hint: 'part',
    build: L,
  });
})();

/* ---------- 1-5 : Au dixième de millimètre ---------- */
(function () {
  const L = OT.mkLevel(72, 10);
  L.rect(1, 0, 70, 0, '#');
  const P = [[8, 0], [11, 0.3], [14, 0.6], [18, 0.9], [19, 0.9], [23, 1.2], [26, 1.5], [27, 1.5], [28, 1.5], [32, 0.2],
    [36, 0.5], [39, 0.8], [42, 1.1], [43, 1.1], [47, 1.4], [50, 1.7], [54, 0.1], [55, 0.1], [59, 0.4], [62, 0.7]];
  P.forEach(([x, ph]) => L.piston(x, ph));
  [11, 23, 36, 50, 62].forEach((x) => L.coin(x, 1));
  L.check(34, 1);
  L.coin(30, 3).coin(45, 3);
  L.start(2, 1);
  L.npc(4, 1, 'patou');
  L.box(66, 1);                                      // caisse inoffensive
  L.door(68, 1);
  L.set(65, 1, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W1.push({
    title: 'Au dixième de millimètre', par: 35, goal: "Passe sous les pistons au bon moment.", lesson: 'La patience et la précision', tone: 'calme',
    fragment: '« Le métal ne pardonne pas la précipitation. »',
    dialogs: {
      patou: { lines: ['Les pistons ne pardonnent pas la précipitation.', 'Attends. Regarde. Passe. Ta manette tremble juste avant qu\'ils tombent.', 'Et quand ils sont deux ou trois côte à côte, il faut partir dès qu\'ils remontent.'],
        alt: ['Tu cours trop. Le métal a son rythme : apprends-le.'] },
    },
    teach: {
      title: 'Le pied à coulisse',
      text: "Le pied à coulisse mesure des longueurs avec une précision de 0,1 mm, et souvent 0,02 mm grâce à son vernier. Pour aller plus loin, le micromètre mesure au centième de millimètre (0,01 mm).",
      q: { question: 'Quel outil mesure au centième de millimètre (0,01 mm) ?', options: ['Le micromètre', 'Le mètre ruban', 'La clé à molette', 'Le tournevis'], answer: 0,
        explain: 'Le micromètre est l\'outil de la très grande précision en atelier.' },
    },
    build: L,
  });
})();

/* ---------- 1-6 : Le fil rouge ---------- */
(function () {
  const L = OT.mkLevel(77, 9);
  L.rect(1, 0, 75, 0, '#');
  L.rect(12, 0, 17, 0, 'E').rect(21, 0, 37, 0, 'E').rect(42, 0, 47, 0, 'E').rect(51, 0, 67, 0, 'E');
  L.sw(8, 1, true);                       // le FAUX interrupteur
  L.sw(19, 1).sw(49, 1).sw(69, 1);        // les vrais
  L.check(39, 1);
  L.coin(8, 3).coin(14, 3);
  [25, 29, 33].forEach((x) => L.coin(x, 3));
  L.coin(40, 2).coin(45, 3);
  [55, 59, 63].forEach((x) => L.coin(x, 3));
  L.start(2, 1);
  L.npc(4, 1, 'patou');
  L.rumeur(6, 1, 'On m\'a dit que tous les interrupteurs se ressemblent.');
  L.set(72, 1, 'H');
  L.door(74, 1);
  L.box(38, 1);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W1.push({
    title: 'Le fil rouge', par: 17, goal: "Traverse les sols électriques quand le courant est coupé.", lesson: "La découverte de l'électronique et de la mécatronique", tone: 'sérieux',
    fragment: '« Sous le métal, il y avait des fils. Et dans les fils, une logique. »',
    dialogs: {
      patou: { lines: ['Sous le métal, il y a des fils. Et dans les fils, une logique.', 'Un interrupteur coupe vraiment le courant quelques secondes. L\'autre… moi, je n\'y toucherais pas.', 'Quand le courant est coupé, cours ! (□, Maj ou bouton COURIR)'],
        alt: ['Les petits passages se traversent quand le courant se coupe tout seul. Les longs : marche sur l\'interrupteur, puis COURS (□, Maj ou bouton COURIR).'] },
    },
    teach: {
      title: "La loi d'Ohm",
      text: "La loi d'Ohm relie trois grandeurs : U = R × I. La tension U (en volts) est égale à la résistance R (en ohms) multipliée par l'intensité I (en ampères). Avec 12 V et une résistance de 4 Ω, le courant vaut 12 ÷ 4 = 3 A.",
      q: { question: 'Une résistance de 4 Ω est branchée sur 12 V. Quelle est l\'intensité du courant ?', options: ['3 A', '48 A', '16 A', '0,3 A'], answer: 0,
        explain: 'I = U ÷ R = 12 ÷ 4 = 3 ampères.' },
    },
    build: L,
  });
})();

/* ---------- 1-7 : Et si je l'ouvrais ? ---------- */
(function () {
  const L = OT.mkLevel(84, 14);
  L.rect(1, 0, 43, 3, '#');                 // sous-sol plein à gauche
  L.rect(1, 4, 60, 4, '#');                 // sol principal (dessus = 5)
  L.rect(44, 4, 45, 4, 'f');                // faux sol fissuré → passage secret
  L.rect(44, 0, 82, 0, '#');                // sol du tunnel
  L.rect(61, 4, 82, 4, '#');                // plafond du tunnel
  L.rect(62, 5, 82, 12, '#');               // roche
  // Mur « NE PAS OUVRIR » et salle
  L.rect(19, 7, 19, 10, '#').set(19, 5, 'o').set(19, 6, 'o');
  L.rect(19, 11, 60, 11, '#');              // corniche du haut
  L.rect(26, 12, 60, 12, '^');              // impasse pleine de pics
  L.rect(61, 5, 61, 10, '#');
  L.rect(10, 5, 11, 6, '#').rect(13, 8, 14, 8, '#').rect(16, 10, 17, 10, '#');
  L.start(3, 5);
  L.npc(16, 5, 'romeo');
  L.sign(18, 5, 'NE PAS OUVRIR');
  L.rumeur(22, 12, 'On m\'a dit que le chemin du haut était le bon.');
  L.set(30, 5, 'H');
  [24, 28, 36, 48].forEach((x) => L.coin(x, 7));
  L.rumeur(40, 5, 'On m\'a dit que la sortie dorée était la vraie.');
  L.fakeDoor(53, 5).coin(51, 6);
  // Tunnel secret
  [50, 56, 64, 72].forEach((x) => L.coin(x, 2));
  L.check(48, 1);
  L.box(54, 1); L.set(60, 1, '^');                   // caisse inoffensive dans le tunnel
  L.rect(68, 0, 69, 0, '~').trigger(68, 1, 'drop');
  L.set(75, 1, '^');
  L.door(80, 1);
  W1.push({
    title: "Et si je l'ouvrais ?", par: 18, goal: "Trouve le vrai chemin vers la sortie.", lesson: 'La curiosité', tone: 'drôle',
    fragment: '« Le panneau disait de ne pas ouvrir. Évidemment, j\'ai ouvert. »',
    dialogs: {
      romeo: { lines: ['Il est écrit de ne pas ouvrir ? Alors c\'est forcément là que se trouve le meilleur.', 'Et regarde bien le sol. Parfois, une fissure veut dire « entre ».'],
        alt: ['Le chemin du haut ? Tout le monde le prend. Et tout le monde revient. Et la porte dorée… tout le monde y croit.'] },
    },
    teach: {
      title: 'La mécatronique',
      text: "La mécatronique réunit dans un même système la mécanique, l'électronique et l'informatique. Un robot, une imprimante 3D ou le freinage ABS d'une voiture sont des systèmes mécatroniques.",
      q: { question: 'Quels domaines la mécatronique réunit-elle ?', options: ["Mécanique, électronique et informatique", 'Mécanique et chimie', 'Électricité et menuiserie', 'Informatique et biologie'], answer: 0,
        explain: 'Des pièces qui bougent, des circuits qui mesurent, et un programme qui décide.' },
    },
    build: L,
  });
})();

/* ---------- 1-8 : Le boîtier noir ---------- */
(function () {
  const L = OT.mkLevel(64, 9);
  L.rect(1, 0, 62, 0, '#');
  L.rect(1, 1, 7, 1, '#');
  L.rect(8, 1, 50, 1, '^');
  L.rect(51, 1, 62, 1, '#');
  L.plat(12, 1, 'm', 3).plat(20, 1, 'n', 3).plat(28, 1, 'm', 3).plat(36, 1, 'n', 3).plat(44, 1, 'm', 3);
  L.booth(1, 5, 2);
  [16, 24, 32, 40, 48].forEach((x) => L.coin(x, 4));
  L.coin(22, 5).coin(38, 5);   // atteignables d'un saut depuis les plateformes (avant : trop hautes)
  L.start(2, 2);
  L.npc(6, 2, 'patou');
  L.set(58, 2, 'H');
  L.door(61, 2);
  L.box(51, 2);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W1.push({
    title: 'Le boîtier noir', par: 27, goal: "Fais traverser les plateformes grâce au boîtier de commande.", lesson: 'Vouloir comprendre ce qui contrôle les machines', tone: 'sérieux',
    fragment: '« Qui commande vraiment la machine ? »',
    dialogs: {
      patou: { lines: ['Cette machine obéit au boîtier, pas à toi.', 'Quand quelqu\'un marche ici, au boîtier, les plateformes copient ses pas : les grises en miroir, les dorées tout droit.', 'À deux : l\'un reste au boîtier, l\'autre saute de plateforme en plateforme. Seul : pilote-les debout dessus, comme chez Franck.'],
        alt: ['Au boîtier, chaque pas compte. Un pas de trop, et ton coéquipier tombe.'] },
    },
    teach: {
      title: 'La boucle de commande',
      text: "Une machine automatique a trois rôles : le capteur mesure (position, température…), le contrôleur décide (souvent un microcontrôleur programmé), et l'actionneur agit (moteur, vérin). Ensemble, ils forment une boucle de commande.",
      q: { question: 'Dans une boucle de commande, quel élément AGIT sur la machine ?', options: ["L'actionneur (moteur, vérin)", 'Le capteur', 'Le contrôleur', "L'écran"], answer: 0,
        explain: 'Le capteur mesure, le contrôleur décide, l\'actionneur agit.' },
    },
    build: L,
  });
})();

/* ---------- 1-9 : L'écran dans l'atelier ---------- */
(function () {
  const L = OT.mkLevel(90, 10);
  L.rect(1, 0, 88, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'christine');
  L.sign(7, 1, 'DIAGNOSTIC : sol stable ✓');            // mensonge
  L.rect(9, 0, 12, 0, '~').trigger(9, 1, 'drop').coins(10, 11, 2);
  L.sign(15, 1, 'DIAGNOSTIC : objet piégé →');           // vrai
  L.set(18, 1, 'H').coin(18, 3);
  L.sign(22, 1, 'DIAGNOSTIC : plafond OK ✓');           // mensonge
  L.rect(25, 5, 28, 5, 'v').trigger(24, 1, 'ceiling').coin(26, 1);
  L.rumeur(30, 1, 'Il paraît que l\'écran a toujours raison.');
  L.sign(33, 1, 'DIAGNOSTIC : saute maintenant !');      // vrai
  L.rect(35, 0, 37, 0, ' ').coin(36, 3);
  L.check(39, 1);
  L.sign(41, 1, 'DIAGNOSTIC : SORTIE ✓');               // mensonge
  L.fakeDoor(45, 1);
  L.sign(49, 1, 'DIAGNOSTIC : ne saute pas');            // vrai
  L.rect(52, 4, 56, 4, '#').rect(52, 3, 56, 3, 'W').coin(54, 1);
  L.sign(60, 1, 'DIAGNOSTIC : rien à signaler');         // mensonge
  L.box(61, 1); L.set(65, 1, 'H').coin(65, 3);        // la 1re est inoffensive… la 2e non
  L.rect(68, 0, 70, 0, '~').trigger(68, 1, 'drop').coin(69, 2);
  L.sign(73, 1, 'DIAGNOSTIC : la porte va fuir');       // vrai
  L.door(77, 1).trigger(75, 1, 'doorRun', { to: 87 });
  L.set(80, 1, '^');
  L.rect(83, 0, 84, 0, ' ').coin(83, 3);
  W1.push({
    title: "L'écran dans l'atelier", par: 20, goal: "Atteins la sortie. L'écran ne dit pas toujours la vérité.", lesson: "Commencer à regarder vers l'informatique", tone: 'calme',
    fragment: '« Un jour, la réponse n\'était plus dans le moteur. Elle était sur l\'écran. »',
    dialogs: {
      christine: { lines: ['Un jour, la réponse n\'était plus dans le moteur. Elle était sur l\'écran.', 'Mais un écran peut se tromper. Vérifie toujours.'],
        alt: ['Cet écran ment souvent. Retiens bien lesquels de ses messages étaient vrais.'] },
    },
    teach: {
      title: 'La prise de diagnostic',
      text: "Les voitures modernes ont une prise de diagnostic (OBD). On y branche un ordinateur qui lit les codes d'erreur des calculateurs. Mais un code indique un symptôme : il faut encore vérifier la vraie cause avant de changer une pièce.",
      q: { question: "Que donne la lecture d'un code d'erreur sur la prise de diagnostic ?", options: ['Un symptôme à vérifier', 'La pièce exacte à changer, toujours', 'Le prix de la réparation', 'Rien d\'utile'], answer: 0,
        explain: 'Le code guide la recherche, mais le mécanicien doit confirmer la vraie cause.' },
    },
    build: L,
  });
})();

/* ---------- 1-10 : BOSS — Le Gardien de la Forge ---------- */
(function () {
  const L = OT.mkLevel(36, 12);
  L.rect(1, 0, 34, 0, '#');
  // Les marches : chacune est à 2 cases au-dessus de la précédente
  // (le saut monte à environ 2,5 cases, donc on peut toujours les atteindre).
  L.rect(5, 2, 7, 2, '#');     // A : dessus à 3
  L.rect(10, 4, 12, 4, '#');   // B : dessus à 5
  L.rect(15, 2, 17, 2, '#');   // C : dessus à 3
  L.rect(20, 4, 21, 4, '#');   // D : dessus à 5
  L.rect(23, 2, 25, 2, '#');   // E : dessus à 3
  L.rect(26, 4, 27, 4, '#');   // F : dessus à 5, juste devant le Gardien
  L.sw(13, 1);                 // l'interrupteur du bouclier (phase 3), au milieu de l'arène
  L.coin(6, 4).coin(11, 6).coin(21, 6).coin(24, 4);
  L.start(3, 1);
  W1.push({
    title: 'Le Gardien de la Forge', par: 40, goal: "Bats le Gardien de la Forge en 3 phases.", lesson: 'Le premier grand passage', tone: 'épique', boss: 'gardien',
    fragment: '« La Forge ne t\'a pas laissé partir. Elle t\'a laissé grandir. »',
    intro: [
      ['patou', 'Voilà le Gardien de la Forge. Il ne veut pas te détruire. Il veut savoir ce que tu as appris.'],
      ['patou', 'Si tu tombes, tu recommences la phase en cours. Pas tout le combat.'],
      ['gardien', 'DÉMONTE-MOI SI TU PEUX.'],
    ],
    dialogs: {},
    teach: {
      title: 'Le moteur à quatre temps',
      text: "Un moteur à essence à quatre temps répète un cycle : 1. admission (le mélange air-carburant entre), 2. compression (le piston le comprime), 3. combustion-détente (l'étincelle l'enflamme et pousse le piston), 4. échappement (les gaz brûlés sortent).",
      q: { question: 'Quel est le bon ordre des quatre temps du moteur ?', options: ['Admission, compression, combustion-détente, échappement', 'Compression, admission, échappement, combustion', 'Combustion, admission, compression, échappement', 'Échappement, combustion, compression, admission'], answer: 0,
        explain: "On fait entrer, on comprime, on enflamme, puis on évacue." },
    },
    build: L,
  });
})();

/* ---------------------------------------------------------------------
   4. Boss : textes des phases
   --------------------------------------------------------------------- */
OT.BOSS_TEXT = {
  phases: [
    { name: 'Démonter', say: 'DÉMONTE-MOI SI TU PEUX.',
      help: 'Touche le boulon lumineux désigné par la flèche (4 boulons, de plus en plus haut). Monte les marches pour les derniers. Saute par-dessus les ondes au sol.',
      tell: [
        ['patou', 'Phase 1 : touche le boulon lumineux devant sa poitrine. La flèche « FRAPPE ICI » te montre lequel.'],
        ['patou', 'Il y a 4 boulons, de plus en plus haut. Pour les derniers, monte les marches jusqu\'à celle collée au Gardien, puis saute.'],
        ['patou', 'Ses coups de poing envoient des ondes de choc au sol : saute par-dessus, ou reste sur les marches.'],
      ] },
    { name: 'Écouter', say: 'ÉCOUTE. UN SEUL CŒUR BAT VRAIMENT.',
      help: 'Un seul des 4 moteurs est le vrai : il fume, il bourdonne et fait vibrer la manette. Saute dedans. Les faux explosent.',
      tell: [
        ['patou', 'Phase 2 : quatre moteurs sont apparus. Un seul est son vrai cœur, les trois autres explosent si tu les touches.'],
        ['patou', 'Le vrai fume, son bourdonnement monte quand tu t\'approches, et ta manette vibre plus fort. Saute dedans.'],
        ['patou', 'Et regarde en l\'air : il fait tomber des engrenages. Leur ombre rouge te dit où.'],
      ] },
    { name: 'Comprendre', say: 'COMPRENDS CE QUI ME CONTRÔLE.',
      help: "Marche sur l'interrupteur (au milieu) pour couper le bouclier bleu, puis cours toucher le cœur en sautant. 2 coups.",
      tell: [
        ['patou', 'Phase 3 : son cœur brille sur sa poitrine, mais un bouclier bleu le protège. Le toucher maintenant, c\'est la chute.'],
        ['patou', 'Marche sur l\'interrupteur au milieu de l\'arène : le bouclier s\'éteint quelques secondes. Cours vers le cœur et saute dessus.'],
        ['patou', 'Il faut le frapper deux fois. À deux, c\'est plus simple : l\'un reste sur l\'interrupteur, l\'autre frappe.'],
      ] },
  ],
  end: "TU N'AS PLUS BESOIN DE MOI.",
};

/* ---------------------------------------------------------------------
   5. Chapitre 1 (débloqué après le quiz)
   --------------------------------------------------------------------- */
OT.CHAPTERS = [
  {
    n: 1, title: 'La Forge — Comprendre',
    paragraphs: [
      "Mon parcours n'a pas commencé devant un ordinateur. Il a commencé dans un atelier, avec une formation en mécanique.",
      "J'ai appris à reconnaître les outils, à démonter, à remonter. J'ai compris qu'une machine n'est jamais une seule chose : c'est un ensemble de pièces qui travaillent ensemble, et quand l'une d'elles lâche, tout s'arrête.",
      "J'ai appris à chercher l'origine d'une panne au lieu de regarder seulement ses symptômes. J'ai appris la patience, parce que le métal ne pardonne pas la précipitation.",
      "Puis j'ai découvert la mécatronique. Sous le métal, il y avait des câbles, des capteurs, des circuits. Quelque chose décidait à la place de la machine.",
      'Je ne me demandais plus seulement comment elle bougeait. Je me demandais qui lui disait de bouger.',
    ],
    last: 'Je voulais maintenant comprendre ce qui se cachait derrière les machines.',
  },
];

/* Note minimale au quiz pour débloquer le chapitre, et récompenses */
OT.QUIZ_PASS = 6;
OT.REWARDS = { perQuizAnswer: 5, firstClear: 5, bossClear: 30 };

/* ---------------------------------------------------------------------
   6. Les 5 mondes (pour l'écran de choix et les aperçus)
   --------------------------------------------------------------------- */
OT.WORLDS = [
  { id: 1, name: 'La Forge', motto: 'Comprendre comment les choses fonctionnent', img: 'img/monde-1.jpg', open: true },
  { id: 2, name: 'Le Code', motto: 'Apprendre à créer', img: 'img/monde-2.jpg' },
  { id: 3, name: 'Le Laboratoire', motto: "Comprendre l'ingénierie", img: 'img/monde-3.jpg' },
  { id: 4, name: 'Nexus', motto: 'Imaginer', img: 'img/monde-4.jpg' },
  { id: 5, name: 'OSWEL City', motto: 'Construire mon propre avenir', img: 'img/monde-5.jpg' },
];

/* ---------------------------------------------------------------------
   7. La boutique (on paie avec les pièces ramassées)
   --------------------------------------------------------------------- */
OT.SHOP = {
  colors: [
    { id: 'bleu', name: 'Bleu Oswel', hex: 0x3d8bff, price: 0 },
    { id: 'orange', name: 'Orange Écho', hex: 0xff8a2b, price: 0 },
    { id: 'cyan', name: 'Cyan', hex: 0x2fd3d3, price: 0 },
    { id: 'rose', name: 'Rose', hex: 0xff6fae, price: 0 },
    { id: 'rouge', name: 'Rouge forge', hex: 0xd8392b, price: 25 },
    { id: 'vert', name: 'Vert circuit', hex: 0x34c26b, price: 30 },
    { id: 'violet', name: 'Violet Nexus', hex: 0x8e5bd6, price: 40 },
    { id: 'blanc', name: 'Blanc labo', hex: 0xeef2f5, price: 40 },
    { id: 'noir', name: 'Noir carbone', hex: 0x2b2d33, price: 50 },
    { id: 'or', name: 'Or OSWEL', hex: 0xf2c230, price: 80 },
  ],
  accessories: [
    { id: 'aucun', name: 'Aucun', price: 0 },
    { id: 'antenne', name: 'Antenne', price: 15 },
    { id: 'casquette', name: 'Casquette', price: 20 },
    { id: 'echarpe', name: 'Écharpe', price: 30 },
    { id: 'casque', name: 'Casque de chantier', price: 35 },
    { id: 'lunettes', name: 'Lunettes de soudeur', price: 45 },
    { id: 'couronne', name: 'Couronne', price: 100 },
  ],
  // Gadgets des mondes : on les voit dans la boutique, mais on ne peut les acheter
  // qu'une fois arrivé dans leur monde (w). Un seul gadget porté à la fois, en plus de l'accessoire.
  gadgets: [
    { id: 'aucun', name: 'Aucun gadget', price: 0, w: 1, icon: '✖️' },
    { id: 'cle', name: 'Clé à molette', price: 15, w: 1, icon: '🔧' },
    { id: 'marteau', name: 'Marteau de forge', price: 20, w: 1, icon: '🔨' },
    { id: 'tablier', name: 'Tablier de forgeron', price: 25, w: 1, icon: '🦺' },
    { id: 'torche', name: 'Torche', price: 30, w: 1, icon: '🔥' },
    { id: 'engrenage', name: 'Engrenage dorsal', price: 40, w: 1, icon: '⚙️' },
    { id: 'cafe', name: 'Café du codeur', price: 20, w: 2, icon: '☕' },
    { id: 'canard', name: 'Canard de débogage', price: 25, w: 2, icon: '🦆' },
    { id: 'ordi', name: 'Ordinateur portable', price: 35, w: 2, icon: '💻' },
    { id: 'bulle', name: 'Bulle de code', price: 40, w: 2, icon: '💬' },
    { id: 'capecode', name: 'Cape binaire', price: 50, w: 2, icon: '🧥' },
    { id: 'loupe', name: 'Loupe', price: 25, w: 3, icon: '🔍' },
    { id: 'aimant', name: 'Aimant', price: 30, w: 3, icon: '🧲' },
    { id: 'fiole', name: 'Fiole lumineuse', price: 40, w: 3, icon: '🧪' },
    { id: 'blouse', name: 'Blouse de labo', price: 45, w: 3, icon: '🥼' },
    { id: 'atome', name: 'Atome en orbite', price: 55, w: 3, icon: '⚛️' },
    { id: 'nuage', name: 'Nuage du cloud', price: 35, w: 4, icon: '☁️' },
    { id: 'holo', name: 'Écran holographique', price: 40, w: 4, icon: '📊' },
    { id: 'eclair', name: 'Éclair de Zeus', price: 50, w: 4, icon: '⚡' },
    { id: 'jetpack', name: 'Jetpack', price: 60, w: 4, icon: '🚀' },
    { id: 'drone', name: 'Drone compagnon', price: 75, w: 4, icon: '🛸' },
    { id: 'smartphone', name: 'Smartphone', price: 40, w: 5, icon: '📱' },
    { id: 'ballon', name: 'Ballon de la ville', price: 45, w: 5, icon: '🎈' },
    { id: 'mallette', name: 'Mallette du chef', price: 50, w: 5, icon: '💼' },
    { id: 'sac', name: 'Sac de livreur', price: 60, w: 5, icon: '🎒' },
    { id: 'trophee', name: "Trophée d'or", price: 120, w: 5, icon: '🏆' },
  ],
  // Effets : une aura qui suit le personnage partout (histoire, arènes, menus)
  fx: [
    { id: 'aucun', name: 'Aucun effet', price: 0, icon: '✖️', desc: 'Pas d\'effet autour du personnage.' },
    { id: 'etincelles', name: 'Étincelles de forge', price: 35, icon: '✨', desc: 'Des étincelles orange tournent autour de toi, comme à l\'atelier.' },
    { id: 'pixels', name: 'Pixels de code', price: 50, icon: '🟩', desc: 'De petits pixels verts flottent autour de toi.' },
    { id: 'aura', name: 'Anneau du Nexus', price: 75, icon: '💫', desc: 'Un anneau d\'énergie tourne à tes pieds.' },
    { id: 'orbite', name: 'Orbite dorée', price: 110, icon: '🪐', desc: 'Trois pièces d\'or en orbite : la classe des champions.' },
    { id: 'blackout', name: 'Aura BLACKOUT', price: 180, icon: '⚡', rarity: 'mythique', desc: 'L\'énergie de Win Black : des éclairs bleus crépitent autour de toi.' },
  ],
  // Animation de victoire (fin de niveau, manche gagnée, podium)
  wins: [
    { id: 'perso', name: 'Celle du personnage', price: 0, icon: '⭐', desc: 'Chaque personnage a sa façon de fêter : poing levé, muscles, danse ou lévitation.' },
    { id: 'fist', name: 'Poing levé', price: 20, icon: '✊', desc: 'Le bras au ciel, en sautillant.' },
    { id: 'flex', name: 'Gros bras', price: 30, icon: '💪', desc: 'On montre les muscles. Personne ne discute.' },
    { id: 'dance', name: 'Danse de la victoire', price: 45, icon: '🕺', desc: 'Les épaules, les hanches, tout y passe.' },
    { id: 'point', name: 'Doigt vers le ciel', price: 25, icon: '☝️', desc: 'Un bras pointé vers le ciel, l\'autre sur la hanche : la victoire de TONY.' },
    { id: 'groove', name: 'Groove du casque', price: 40, icon: '🎧', desc: 'La tête qui bat la mesure : la victoire de FREDO.' },
    { id: 'salute', name: 'Salut militaire', price: 25, icon: '🫡', desc: 'Garde-à-vous et pouce levé : la victoire de VALDES.' },
    { id: 'heart', name: 'Grand cœur', price: 35, icon: '💖', desc: 'Les bras en cœur au-dessus de la tête : la victoire de GOD LOVE.' },
    { id: 'float', name: 'Lévitation', price: 90, icon: '🌀', desc: 'On s\'élève et on tourne doucement, bras ouverts.' },
  ],
  // Émotes : un geste joué en entrant dans un niveau et quand on gagne
  emotes: [
    { id: 'wave', name: 'Salut', price: 0, icon: '👋', desc: 'Un petit salut de la main.' },
    { id: 'laugh', name: 'Fou rire', price: 20, icon: '😂', desc: 'Plié de rire. Le piège était trop gros.' },
    { id: 'celebrate', name: 'Bras en l\'air', price: 25, icon: '🙌', desc: 'Les deux bras au ciel !' },
    { id: 'dance', name: 'Petite danse', price: 40, icon: '💃', desc: 'Trois pas de danse pour narguer les autres.' },
    { id: 'spin', name: 'Toupie', price: 55, icon: '🌪️', desc: 'Un tour complet sur soi-même.' },
    { id: 'heart', name: 'Cœur avec les mains', price: 30, icon: '🫶', desc: 'Un cœur avec les mains, pour tout le monde.' },
  ],
};
OT.FREE_COLORS = ['bleu', 'orange', 'cyan', 'rose'];

/* Rareté des objets de la boutique (d'après le prix, sauf si l'objet la donne) */
OT.RARITY = {
  commun: { name: 'Commun', color: '#b8c0c8' },
  rare: { name: 'Rare', color: '#3d8bff' },
  epique: { name: 'Épique', color: '#b05cff' },
  legendaire: { name: 'Légendaire', color: '#ffb020' },
  mythique: { name: 'Mythique', color: '#ff3d6e' },
};
OT.rarityOf = (it) => it.rarity || (it.price >= 150 ? 'mythique' : it.price >= 70 ? 'legendaire' : it.price >= 40 ? 'epique' : it.price >= 25 ? 'rare' : 'commun');

/* ---------------------------------------------------------------------
   8. Registre des mondes : chaque monde regroupe ses niveaux, son boss,
      son chapitre, son thème graphique et sa musique.
   --------------------------------------------------------------------- */
OT.WORLD1.theme = 'forge';
OT.WORLD1.bossText = OT.BOSS_TEXT;
OT.WORLD1.chapter = OT.CHAPTERS[0];
OT.WORLD1.intro = [
  { text: 'Douala.', cam: { x: 30, y: 6, z: 34 } },
  { text: 'Un atelier de formation en mécanique.', cam: { x: 14, y: 4, z: 20 } },
  { text: 'Ici, un jeune homme va apprendre à comprendre les machines.', cam: { x: 8, y: 3, z: 14 } },
  { text: 'Il s\'appelle Oswel. Et l\'atelier ne va pas lui faciliter la tâche.', cam: { x: 4, y: 2.5, z: 11 } },
];
OT.WORLD_DATA = { 1: OT.WORLD1 };
// TONY (fiche complète, version 1.5) — jouable aussi : on voit son vrai modèle (js/chars.js) et il a ses POUVOIRS (js/pouvoirs.js)
OT.CHARACTERS.tony = { name: 'Tony', color: 0x8a6bd6, ui: 0xc9b6ff, hat: 0xece6da, hatType: 'hood', char: 'tony', role: 'Mentor d\'Oswel',
  profile: {
    title: 'Mentor d\'Oswel · il lui apprend à coder, puis à planifier',
    about: "Tony a appris à coder à Oswel, puis à planifier ce qu'il code. Il en dit toujours moins qu'il n'en sait : il pose une question, laisse chercher, et ne donne la réponse que si on est vraiment bloqué. On le croise surtout dans Le Code, mais il veille sur tout le parcours.",
    look: "Style ténébreux : une tenue blanc cassé presque immaculée, une capuche blanche à l'intérieur sombre qui cache son visage. À la place des yeux, deux points lumineux sans pupille, blanc doré (cyan pâle quand il utilise un pouvoir). Des accents violets, noirs et bleu nuit, et une longue écharpe blanche qui flotte quand il saute. Des particules de lumière blanche quand il agit.",
    mind: "Calme et posé, pédagogue, humour sec. Énigmatique : il en dit moins qu'il n'en sait. Il ne s'énerve jamais contre une erreur — pour lui, une erreur est une information.",
    powers: [
      { name: 'Ctrl+Z', w: 1, text: "Retour à sa position d'il y a 1 seconde (flash sombre, traînée violette)." },
      { name: 'Boucle while', w: 2, text: 'Un saut supplémentaire en l\'air, 1 fois (2 fois à partir du Monde 4).' },
      { name: 'Debug', w: 3, text: 'Révèle 5 secondes les pièges invisibles et les faux blocs.' },
      { name: 'Copier-coller', w: 4, text: 'Un clone fantôme va appuyer sur un bouton, un levier ou un interrupteur à sa place.' },
      { name: 'Compiler', w: 5, text: 'Fige un piège ou un bloc pendant 2 secondes (il ne bouge plus et ne blesse plus).' },
    ],
    rules: 'Un seul pouvoir actif à la fois · recharge de 8 à 12 s · un pouvoir débloqué par monde, avec sa leçon · tout se joue sur un seul plan.',
    quote: 'Ça plante ? On recommence.',
    met: '2-1',
  } };
OT.CHARACTERS.yannick = { name: 'Yannick', color: 0xd8392b, hat: 0x1a1a1a, hatType: 'band' };
OT.CHARACTERS.brayan = { name: 'Brayan', color: 0x34c26b, hat: 0x0f3a20, hatType: 'cap' };
OT.CHARACTERS.samuel = { name: 'Samuel', color: 0xe0b52c, hat: 0x3a2a00, hatType: 'band' };
OT.CHARACTERS.peck = { name: 'Peck', color: 0x8e5bd6, hat: 0x24123a, hatType: 'cap' };
OT.CHARACTERS.youmbi = { name: 'Youmbi', color: 0x2fd3d3, hat: 0x0a3a3a, hatType: 'band' };
OT.CHARACTERS.bug = { name: 'Le Bug', color: 0xff2a3a };
OT.CHARACTERS.lionnel = { name: 'Lionnel', color: 0x2a3a5c, hat: 0x141a28, hatType: 'short', glasses: true, scarfNeck: 0xd42a2a, prop: 'blueprint',
  profile: { title: 'Cousin d\'Oswel · architecte au Canada', about: "Le cousin d'Oswel, parti au Canada où il est devenu architecte. Il dessine des immeubles et des maisons : il sait qu'avant de construire, on fait un plan… et un devis.", look: 'Veste bleu marine, lunettes rondes, écharpe rouge et blanche (l\'hiver canadien !) et un rouleau de plans toujours sous le bras.' } };
OT.CHARACTERS.nadia = { name: 'Nadia', color: 0xf2f2f2, hat: 0xff8a2b, female: true, hairStyle: 'ponytail', accent: 0xff8a2b, apron: 0x22252c, skirt: 0x22252c, hair: 0x1a100a,
  profile: { title: 'Une bonne amie d\'Oswel · travaille dans un restaurant', about: "Une bonne amie d'Oswel. Elle travaille dans un restaurant de Douala : elle connaît le prix de chaque plat, les dépenses du mois… et les clients pressés.", look: 'Chemise blanche, tablier noir, longue queue de cheval avec un ruban orange et son carnet de commandes à la main.' } };
