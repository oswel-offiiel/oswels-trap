/* =====================================================================
   OSWEL'S TRAP — world3.js
   MONDE 3 : LE LABORATOIRE — « Comprendre l'ingénierie »
   L'université : de nouvelles règles, de nouvelles personnes.
   Ange aide Oswel à s'adapter, Dimi et Annie l'aident en maths,
   Reine lui fait découvrir la biochimie, Tsague Junior, Junior le
   Gabonais et Kellia sont ses camarades. Le boss : la Machine de
   l'Examen, qu'on bat en répondant aux questions.

   Nouveaux pièges : tapis roulants (< >), acide (A), lasers,
   bulles d'apesanteur, et un « catalyseur » qui accélère une réaction.
   ===================================================================== */

window.OT = window.OT || {};

Object.assign(OT.CHARACTERS, {
  ange:    { name: 'Ange',               color: 0x5ad1ff, hat: 0x1a3a5a, hatType: 'bun', female: true, hairStyle: 'long', hair: 0x2a1a10, accent: 0xffffff },
  dimi:    { name: 'Dimi',               color: 0x34c26b, hat: 0x0f3a20, hatType: 'cap' },
  annie:   { name: 'Annie',              color: 0xff8ac8, hat: 0x5a1a3a, hatType: 'bun', female: true, hairStyle: 'ponytail', accent: 0xff5fa2 },
  reine:   { name: 'Reine',              color: 0xf2f2f2, hat: 0x2fd3d3, hatType: 'scarf', female: true, accent: 0x2fd3d3, skirt: 0x2a3a4a },
  tsague:  { name: 'Tsague Junior',      color: 0xff7a1a, hat: 0x3a1a00, hatType: 'cap' },
  junior:  { name: 'Junior le Gabonais', color: 0x2b9e4a, hat: 0xf2c230, hatType: 'band' },
  kellia:  { name: 'Kellia',             color: 0xb78cff, hat: 0x2a1040, hatType: 'bun', female: true, hairStyle: 'long', hair: 0x24123a, accent: 0xd8b8ff },
  machine: { name: 'La Machine de l\'Examen', color: 0x3cffd8 },
});

OT.WORLD3 = { id: 3, name: 'Le Laboratoire', motto: "Comprendre l'ingénierie", levels: [], theme: 'lab' };
const W3 = OT.WORLD3.levels;

/* ---------- 3-1 : Premier jour à la fac ---------- */
(function () {
  const L = OT.mkLevel(70, 10);
  L.rect(1, 0, 68, 0, '#');
  L.start(2, 1);
  L.npc(5, 1, 'ange');
  L.sign(8, 1, 'AMPHI →');
  L.belt(10, 17, 0, 1);                       // le tapis aide…
  L.rect(18, 0, 20, 0, ' ').coins(18, 20, 3);
  L.belt(21, 30, 0, -1);                      // …puis il pousse vers le trou
  L.coins(23, 28, 2);
  L.npc(33, 1, 'kellia');
  L.laser(37, 1, 37, 4, { period: 2.4, phase: 0, on: 0.5 });
  L.laser(41, 1, 41, 4, { period: 2.4, phase: 1.2, on: 0.5 });
  L.check(44, 1);
  L.rumeur(45, 1, 'Les lasers ? De la décoration. Fonce.');
  L.belt(48, 55, 0, 1);
  L.acid(56, 58, 1).coins(56, 58, 3);
  L.sign(62, 1, 'AMPHI 1');
  L.door(66, 1, { label: 'AMPHI 1' });
  L.box(39, 1);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W3.push({
    title: 'Premier jour à la fac', par: 18, goal: 'Trouve l\'amphithéâtre : traverse les tapis, les lasers et l\'acide.', lesson: 'Les unités', tone: 'troll',
    fragment: '« À l\'université, personne ne te tient la main. Sauf ceux qui choisissent de le faire. »',
    intro: [['ange', 'Toi aussi, tu es nouveau ici ? Moi, je viens de Belgique. Le premier jour, je me suis perdu trois fois.'], ['ange', 'Viens, je te montre le chemin. Enfin… j\'essaie.']],
    dialogs: {
      ange: { lines: ['Les tapis roulants vont plus vite que toi. Profite de celui qui va dans ton sens.', 'Et celui d\'après pousse en arrière, vers le trou : ne t\'arrête pas dessus.'],
        alt: ['Courage. S\'adapter, ça prend du temps. Mais tu n\'es pas seul.'] },
      kellia: { lines: ['Les lasers s\'allument et s\'éteignent en rythme. Ils clignotent juste avant de s\'allumer.'],
        alt: ['Attends qu\'il s\'éteigne, puis passe tout de suite. Le deuxième est décalé.'] },
    },
    teach: {
      title: 'Les unités du Système international',
      text: "Les ingénieurs du monde entier utilisent les mêmes unités de base (le SI) : le mètre (m) pour les longueurs, le kilogramme (kg) pour les masses, la seconde (s) pour le temps, l'ampère (A) pour le courant. Les autres en découlent : par exemple le newton (N), l'unité de la force, vaut 1 kg·m/s².",
      q: { question: 'Quelle est l\'unité de la force dans le Système international ?', options: ['Le newton', 'Le joule', 'Le watt', 'Le kilogramme'], answer: 0,
        explain: 'La force se mesure en newtons (N). Le joule mesure l\'énergie, le watt la puissance.' },
    },
    build: L,
  });
})();

/* ---------- 3-2 : La pente (Dimi et Annie) ---------- */
(function () {
  const L = OT.mkLevel(74, 12);
  L.rect(1, 0, 72, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'dimi').npc(6, 1, 'annie');
  L.sign(8, 1, "f(x) = x²  →  f'(x) = 2x");
  // un escalier au-dessus de l'acide : les marches montent de plus en plus vite, puis redescendent
  L.acid(11, 39, 1);
  L.rect(12, 1, 13, 1, '#');      // dessus à 2
  L.rect(16, 1, 17, 2, '#');      // dessus à 3
  L.rect(20, 1, 21, 4, '#');      // dessus à 5
  L.rect(24, 1, 25, 6, '#');      // dessus à 7
  L.belt(24, 25, 6, -1);          // le sommet glisse vers l'arrière
  L.rect(28, 1, 29, 4, '#');      // dessus à 5
  L.rect(32, 1, 33, 2, '#');      // dessus à 3
  L.rect(36, 1, 37, 1, '#');      // dessus à 2
  L.coin(14, 4).coin(18, 5).coin(22, 7).coin(26, 9).coin(30, 7).coin(34, 5);
  L.check(42, 1);
  L.rumeur(43, 1, 'En maths, plus c\'est raide, plus c\'est facile.');
  // les lasers horizontaux : à la cheville (on saute), puis au-dessus de la tête (on ne saute plus)
  L.laser(46, 1, 51, 1, { period: 2, phase: 0, on: 0.5 });
  L.laser(54, 3, 59, 3, { period: 1, on: 1 });
  L.laser(54, 1, 59, 1, { period: 2.4, phase: 0.6, on: 0.45 });
  L.coin(48, 3);
  L.door(70, 1);
  L.set(21, 5, 'H'); L.box(37, 2);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W3.push({
    title: 'La pente', par: 24, goal: 'Monte et redescends l\'escalier au-dessus de l\'acide, puis passe sous les lasers.', lesson: 'La dérivée', tone: 'puzzle',
    fragment: '« Dimi m\'a dit : une dérivée, c\'est juste la pente. J\'ai mis trois semaines à le croire. »',
    intro: [['dimi', 'Les maths de la fac, ça fait peur au début. Avec Annie, on t\'explique.'], ['annie', 'Regarde l\'escalier : plus on monte, plus les marches sont hautes. C\'est ça, une pente qui augmente.']],
    dialogs: {
      dimi: { lines: ['La dérivée de x², c\'est 2x : la pente double quand x double. Comme ces marches.', 'Tout en haut, le sol glisse vers l\'arrière. Saute vite vers la marche suivante.'],
        alt: ['Prends ton temps sur chaque marche. Et ne saute pas trop loin : l\'acide est juste en dessous.'] },
      annie: { lines: ['Le premier laser est à la cheville : saute quand il s\'allume.', 'Le deuxième passage a un laser au-dessus de la tête : là, surtout, ne saute pas. Passe quand celui du bas est éteint.'],
        alt: ['Au deuxième passage : tu marches, tu attends que le laser du bas s\'éteigne, et tu cours.'] },
    },
    teach: {
      title: 'La dérivée',
      text: "La dérivée d'une fonction mesure sa pente, c'est-à-dire à quelle vitesse elle change. Pour f(x) = x², la dérivée est f'(x) = 2x : en x = 1 la pente vaut 2, en x = 3 elle vaut 6. Une règle utile : la dérivée de xⁿ est n·xⁿ⁻¹.",
      q: { question: "Quelle est la dérivée de f(x) = x² ?", options: ["f'(x) = 2x", "f'(x) = x", "f'(x) = x²", "f'(x) = 2"], answer: 0,
        explain: "La dérivée de xⁿ est n·xⁿ⁻¹ : pour x², on obtient 2x." },
    },
    build: L,
  });
})();

/* ---------- 3-3 : Le courant (Tsague Junior) ---------- */
(function () {
  const L = OT.mkLevel(72, 11);
  L.rect(1, 0, 70, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'tsague');
  L.sw(7, 1);
  L.rect(9, 0, 16, 0, 'E');
  L.coins(10, 15, 2);
  L.sw(17, 1);
  L.belt(18, 23, 0, 1);
  L.rect(24, 0, 31, 0, 'E');
  L.check(33, 1);
  L.sign(33, 1, 'INTERRUPTEUR GÉNÉRAL →');
  L.sw(35, 1, true);                       // le faux interrupteur (il électrocute)
  L.rect(37, 2, 39, 2, '#');
  L.sw(38, 3);                             // le vrai, en hauteur
  L.coin(38, 5);
  L.rect(41, 0, 52, 0, 'E');
  L.coins(43, 50, 2);
  L.rumeur(54, 1, 'Le courant, ça ne passe jamais deux fois au même endroit.');
  L.laser(57, 1, 57, 4, { period: 2.2, phase: 0, on: 0.5 });
  L.laser(61, 1, 61, 4, { period: 2.2, phase: 1.1, on: 0.5 });
  L.door(67, 1);
  L.box(59, 1); L.set(70, 1, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W3.push({
    title: 'Le courant', par: 22, goal: 'Coupe le courant pour traverser les sols électriques. Attention au faux interrupteur.', lesson: 'La puissance électrique', tone: 'troll',
    fragment: '« À l\'atelier, je réparais les câbles. À la fac, j\'ai appris à calculer ce qui passe dedans. »',
    intro: [['tsague', 'Bienvenue au labo d\'électricité. Ici, tout est sous tension. Toi compris, bientôt.']],
    dialogs: {
      tsague: { lines: ['Marche sur l\'interrupteur : le courant est coupé quelques secondes. Le compteur est en haut de l\'écran.', 'L\'interrupteur général, le vrai, n\'est jamais là où on l\'attend.'],
        alt: ['Le premier interrupteur en bas est un piège. Saute par-dessus et monte sur la petite plateforme : le vrai est là-haut.'] },
    },
    teach: {
      title: 'La puissance électrique',
      text: "La puissance d'un appareil (en watts) est le produit de la tension (en volts) par l'intensité du courant (en ampères) : P = U × I. Une lampe branchée sur 12 V qui consomme 2 A a une puissance de 24 W. Plus la puissance est grande, plus l'appareil consomme d'énergie chaque seconde.",
      q: { question: 'Un appareil fonctionne sous 12 V et consomme 2 A. Quelle est sa puissance ?', options: ['24 W', '6 W', '14 W', '10 W'], answer: 0,
        explain: 'P = U × I = 12 × 2 = 24 W.' },
    },
    build: L,
  });
})();

/* ---------- 3-4 : Apesanteur (Junior le Gabonais) ---------- */
(function () {
  const L = OT.mkLevel(74, 14);
  L.rect(1, 0, 72, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'junior');
  L.sign(6, 1, 'ZONE D\'APESANTEUR');
  // une grande bulle d'apesanteur au-dessus de l'acide, des pics au plafond
  L.lowg(8, 1, 41, 13);
  L.acid(9, 39, 1);
  L.rect(8, 12, 41, 12, 'W');
  L.rect(11, 3, 13, 3, '#');      // dessus à 4
  L.rect(17, 6, 19, 6, '#');      // dessus à 7
  L.rect(24, 8, 26, 8, '#');      // dessus à 9
  L.rect(30, 6, 32, 6, '#');      // dessus à 7
  L.rect(36, 3, 38, 3, '#');      // dessus à 4
  L.coin(12, 6).coin(18, 9).coin(25, 11).coin(31, 9).coin(37, 6);
  L.check(42, 1);
  L.rumeur(43, 1, 'En apesanteur, plus tu sautes fort, plus tu vas loin. Aucun risque.');
  // les presses hydrauliques
  L.piston(47, 0).piston(51, 0.6).piston(55, 1.2);
  L.coins(47, 55, 4);
  L.door(70, 1);
  L.set(58, 1, 'H'); L.box(64, 1);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W3.push({
    title: 'Apesanteur', par: 26, goal: 'Traverse la bulle d\'apesanteur de plateforme en plateforme, puis passe sous les presses.', lesson: 'L\'énergie potentielle', tone: 'puzzle',
    fragment: '« En apesanteur, un tout petit saut t\'emmène très haut. Une toute petite erreur aussi. »',
    intro: [['junior', 'Moi c\'est Junior, du Gabon. Ici on teste la gravité. Enfin, son absence.'], ['junior', 'Dans la bulle, tu tombes doucement et tu sautes très haut. Trop haut, même : regarde le plafond.']],
    dialogs: {
      junior: { lines: ['Dans la bulle, appuie sur saut juste un instant : un petit saut suffit.', 'Les presses tombent en rythme. Elles tremblent juste avant de frapper.'],
        alt: ['Saut très court, toujours. Si tu gardes le bouton appuyé, tu finis dans les pics du plafond.'] },
    },
    teach: {
      title: 'L\'énergie potentielle',
      text: "Un objet en hauteur stocke de l'énergie potentielle de pesanteur : Ep = m × g × h (masse × gravité × hauteur). Sur Terre, g ≈ 9,8 m/s². Si on double la hauteur, on double l'énergie stockée. C'est cette énergie qui se transforme en vitesse quand l'objet tombe, et c'est celle que les barrages exploitent.",
      q: { question: 'Si on monte un objet deux fois plus haut, son énergie potentielle…', options: ['double', 'reste la même', 'est divisée par deux', 'est multipliée par quatre'], answer: 0,
        explain: 'Ep = m × g × h : elle est proportionnelle à la hauteur.' },
    },
    build: L,
  });
})();

/* ---------- 3-5 : Le labo de Reine (acides) ---------- */
(function () {
  const L = OT.mkLevel(72, 11);
  L.rect(1, 0, 70, 0, '#');
  L.start(2, 1);
  L.npc(5, 1, 'reine');
  L.sign(8, 1, 'pH < 7 : ACIDE');
  L.acid(10, 12, 1).acid(15, 17, 1).acid(20, 22, 1);
  L.coin(11, 3).coin(16, 4).coin(21, 3);
  // un tapis à contre-sens au-dessus d'un long bassin, un laser au-dessus de la tête
  L.acid(25, 33, 1);
  L.rect(26, 2, 31, 2, '<');
  L.laser(26, 5, 30, 5, { period: 1, on: 1 });
  L.coins(27, 30, 4);
  L.check(35, 1);
  L.rumeur(36, 1, 'L\'acide, c\'est juste de l\'eau verte. Ça chatouille.');
  // le titrage : un pont qui s'effondre au-dessus du vide
  L.rect(40, 0, 47, 0, '=');
  L.coins(41, 46, 2);
  L.acid(51, 52, 1).acid(56, 58, 1);
  L.laser(54, 1, 54, 4, { period: 2.4, on: 0.5 });
  L.door(66, 1);
  L.box(39, 1); L.set(48, 1, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W3.push({
    title: 'Le labo de Reine', par: 22, goal: 'Traverse le laboratoire de chimie sans toucher l\'acide.', lesson: 'Le pH', tone: 'puzzle',
    fragment: '« Reine m\'a appris qu\'en chimie, on ne goûte jamais. Même quand c\'est vert et que ça brille. »',
    intro: [['reine', 'Bienvenue en biochimie ! Règle numéro un : on ne touche à rien de vert.']],
    dialogs: {
      reine: { lines: ['Le pH mesure l\'acidité : en dessous de 7 c\'est acide, au-dessus c\'est basique, 7 c\'est neutre.', 'Sur le tapis, avance sans sauter : le laser au-dessus de toi ne pardonne pas.'],
        alt: ['Sur le tapis, marche simplement vers la droite. Tu avances plus lentement, mais tu avances.'] },
    },
    teach: {
      title: 'Le pH',
      text: "Le pH mesure l'acidité d'une solution sur une échelle de 0 à 14. pH < 7 : acide (jus de citron ≈ 2, vinaigre ≈ 3). pH = 7 : neutre (eau pure). pH > 7 : basique (savon ≈ 10). Un acide et une base qui se rencontrent peuvent se neutraliser.",
      q: { question: 'Une solution a un pH de 3. Elle est…', options: ['acide', 'basique', 'neutre', 'impossible à dire'], answer: 0,
        explain: 'En dessous de 7, une solution est acide.' },
    },
    build: L,
  });
})();

/* ---------- 3-6 : Le catalyseur (enzymes) ---------- */
(function () {
  const L = OT.mkLevel(70, 12);
  L.rect(1, 0, 68, 0, '#');
  L.start(2, 1);
  L.npc(3, 1, 'kellia');
  // deux boutons pour la MÊME réaction : sans enzyme (très lent) et avec enzyme (rapide)
  L.rect(5, 1, 5, 1, '#');
  L.rect(6, 3, 8, 3, '#');
  const pont = []; for (let x = 11; x <= 21; x++) pont.push([x, 0]);
  L.rect(11, 0, 21, 0, ' ');
  L.compile(9, 1, pont, { g: 0, label: 'SANS ENZYME', rate: 0.9, say: 'Réaction lente…', done: 'Réaction terminée.' });
  L.compile(7, 4, pont, { g: 0, label: 'ENZYME', rate: 0.1, say: 'Le catalyseur accélère tout !', done: 'Réaction terminée.' });
  L.coin(7, 6).coin(16, 3);
  L.rumeur(23, 1, 'Sans enzyme, c\'est plus naturel. Et à peine plus lent.');
  L.check(24, 1);
  L.npc(25, 1, 'reine');
  // les lasers en vague, puis l'acide sous un tapis
  L.laser(29, 1, 29, 4, { period: 2.4, phase: 0, on: 0.45 });
  L.laser(32, 1, 32, 4, { period: 2.4, phase: 0.6, on: 0.45 });
  L.laser(35, 1, 35, 4, { period: 2.4, phase: 1.2, on: 0.45 });
  L.belt(38, 44, 0, 1);
  L.acid(45, 47, 1);
  // la deuxième réaction : un escalier vers la sortie
  L.rect(51, 1, 66, 1, '^');
  L.compile(49, 1, [[52, 2], [53, 2], [55, 4], [56, 4], [58, 6], [59, 6]], { g: 1, label: 'ENZYME', rate: 0.15, say: 'Catalyse !', done: 'Escalier prêt !' });
  L.rect(61, 6, 66, 6, '#');
  L.coins(62, 64, 8);
  L.door(65, 7);
  L.set(37, 1, 'H'); L.box(61, 7);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W3.push({
    title: 'Le catalyseur', par: 20, goal: 'Lance la réaction pour construire le pont… avec ou sans enzyme ? Puis grimpe jusqu\'à la sortie.', lesson: 'Les enzymes', tone: 'puzzle',
    fragment: '« Certaines personnes sont des catalyseurs : avec elles, tout va plus vite. »',
    intro: [['kellia', 'Deux boutons lancent la même réaction. L\'un est dans ton chemin. L\'autre est un peu caché en hauteur.']],
    dialogs: {
      kellia: { lines: ['Sans enzyme, la réaction est très lente : le pont mettra dix secondes à se construire.', 'Avec l\'enzyme, c\'est presque instantané. Le bouton ENZYME est sur la petite plateforme au-dessus.'],
        alt: ['Monte sur la marche, puis sur la plateforme, et appuie sur ENZYME avant tout.'] },
      reine: { lines: ['Une enzyme est un catalyseur biologique : elle accélère une réaction sans être consommée.', 'Le dernier escalier se construit vite… mais en bas, ce sont des pics.'],
        alt: ['Attends que les six blocs soient là avant de monter.'] },
    },
    teach: {
      title: 'Les enzymes, des catalyseurs',
      text: "Une enzyme est une protéine qui accélère une réaction chimique dans le corps sans être consommée : c'est un catalyseur biologique. Sans enzymes, la digestion d'un repas prendrait des années. Chaque enzyme est spécialisée : l'amylase de la salive, par exemple, découpe l'amidon.",
      q: { question: 'Quel est le rôle d\'une enzyme ?', options: ['Accélérer une réaction sans être consommée', 'Ralentir toutes les réactions', 'Fournir de l\'énergie comme un aliment', 'Remplacer l\'ADN'], answer: 0,
        explain: 'Une enzyme est un catalyseur : elle accélère une réaction précise et ressort intacte.' },
    },
    build: L,
  });
})();

/* ---------- 3-7 : Le dé (probabilités) ---------- */
(function () {
  const L = OT.mkLevel(68, 12);
  L.rect(1, 0, 66, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'dimi').npc(6, 1, 'annie');
  L.sign(9, 1, 'ON LANCE UN DÉ. P(6) = ?');
  // quatre réponses ; les mauvaises renvoient au départ, des lasers entre elles
  L.link(11, 1, 2, 1, '1/2');
  L.coin(11, 3);
  L.laser(14, 1, 14, 5, { period: 2.4, phase: 0, on: 0.45 });
  L.link(16, 1, 31, 1, '1/6', true);
  L.laser(18, 1, 18, 5, { period: 2.4, phase: 1.2, on: 0.45 });
  L.link(20, 1, 2, 1, '6');
  L.link(23, 1, 2, 1, '1/3');
  L.rect(28, 1, 28, 10, '#');
  // deuxième question : la vraie porte
  L.check(31, 1);
  L.belt(33, 37, 0, 1);
  L.acid(38, 39, 1);
  L.sign(42, 1, 'P(nombre pair) = ?');
  L.rect(45, 2, 47, 2, '#').fakeDoor(46, 3, '1/6');
  L.rect(50, 4, 52, 4, '#').fakeDoor(51, 5, '2');
  L.coins(45, 47, 5);
  L.laser(54, 1, 54, 4, { period: 2.2, on: 0.5 });
  L.door(58, 1, { label: '1/2' });
  L.fakeDoor(62, 1, '1/3');
  L.rumeur(43, 1, 'Pair ? Il y a 2 nombres pairs sur un dé. Donc c\'est 2.');
  L.box(26, 1); L.set(49, 1, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W3.push({
    title: 'Le dé', par: 22, goal: 'Réponds aux questions de probabilités : choisis le bon lien, puis la bonne porte.', lesson: 'Les probabilités', tone: 'puzzle',
    fragment: '« Annie m\'a dit : la chance, ça se calcule. Pas le travail. »',
    intro: [['annie', 'On lance un dé à 6 faces. Quelle est la probabilité d\'obtenir un 6 ? Touche la bonne réponse.'], ['dimi', 'Les mauvaises réponses te renvoient au début. C\'est comme ça qu\'on apprend.']],
    dialogs: {
      dimi: { lines: ['Une probabilité, c\'est : cas favorables ÷ cas possibles.', 'Pour un 6 : un seul cas favorable, six cas possibles.'],
        alt: ['C\'est 1/6. Il est sur la plateforme la plus haute à gauche.'] },
      annie: { lines: ['Pour la porte : combien de faces paires ? 2, 4 et 6. Trois sur six.'],
        alt: ['3 sur 6, ça se simplifie : 1/2. Ignore les portes en hauteur.'] },
    },
    teach: {
      title: 'Les probabilités',
      text: "Quand tous les résultats sont équiprobables, la probabilité d'un événement vaut : nombre de cas favorables ÷ nombre de cas possibles. Avec un dé à 6 faces : P(obtenir 6) = 1/6, P(obtenir un nombre pair) = 3/6 = 1/2. Une probabilité est toujours comprise entre 0 (impossible) et 1 (certain).",
      q: { question: 'On lance un dé à 6 faces. Quelle est la probabilité d\'obtenir un 6 ?', options: ['1/6', '1/2', '6', '1/3'], answer: 0,
        explain: 'Un seul cas favorable sur six cas possibles : 1/6.' },
    },
    build: L,
  });
})();

/* ---------- 3-8 : Logique (ET / OU) ---------- */
(function () {
  const L = OT.mkLevel(72, 11);
  L.rect(1, 0, 70, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'tsague');
  // A OU B : un seul suffit
  L.sign(6, 1, 'A OU B');
  L.button(8, 1);
  L.rect(9, 2, 10, 2, '#').button(10, 3);
  L.gate(13, 1, 5);
  L.coin(9, 5);
  // A ET B : les deux en même temps, un laser entre les deux
  L.npc(15, 1, 'junior');
  L.sign(16, 1, 'A ET B');
  L.button(18, 1, true);
  L.laser(21, 1, 21, 4, { period: 2.4, phase: 0, on: 0.5 });
  L.button(24, 1, true);
  L.gate(27, 1, 5, true);
  L.check(29, 1);
  // NON : le sol qui n'est PAS électrique
  L.sign(30, 1, 'NON (électrique)');
  L.sw(32, 1);
  L.rect(34, 0, 43, 0, 'E');
  L.coins(35, 42, 2);
  L.rumeur(45, 1, 'VRAI ET FAUX, ça fait VRAI. À moitié vrai, c\'est vrai.');
  L.belt(47, 53, 0, -1);
  L.acid(54, 55, 1);
  L.laser(58, 1, 58, 4, { period: 2, on: 0.5, phase: 0.5 });
  L.door(66, 1);
  L.set(60, 1, 'H'); L.box(69, 1);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W3.push({
    title: 'ET, OU, NON', par: 22, goal: 'Ouvre les barrières : « OU » demande un bouton, « ET » demande les deux à la fois.', lesson: 'La logique booléenne', tone: 'puzzle',
    fragment: '« Un circuit ne connaît que VRAI et FAUX. C\'est peut-être pour ça qu\'il ne ment jamais. »',
    intro: [['tsague', 'En électronique, tout se décide avec ET, OU et NON. Les barrières de ce couloir obéissent à ces règles.']],
    dialogs: {
      tsague: { lines: ['« A OU B » : un seul bouton suffit pour ouvrir.', 'Les boutons restent actifs quelques secondes après qu\'on les quitte.'],
        alt: ['Pour la barrière « ET » : appuie sur A, passe le laser dès qu\'il s\'éteint, appuie sur B et file à la barrière.'] },
      junior: { lines: ['« A ET B » : les deux boutons doivent être actifs EN MÊME TEMPS.'],
        alt: ['À deux, c\'est plus simple : chacun sur un bouton, puis on passe ensemble.'] },
    },
    teach: {
      title: 'La logique booléenne',
      text: "Les ordinateurs calculent avec deux valeurs : VRAI (1) et FAUX (0). A ET B est vrai seulement si A et B sont vrais tous les deux. A OU B est vrai si au moins l'un des deux est vrai. NON A inverse la valeur. Ces opérations, réalisées par des portes logiques, sont la base de tous les circuits.",
      q: { question: 'Combien vaut « VRAI ET FAUX » ?', options: ['FAUX', 'VRAI', 'Ça dépend', 'VRAI et FAUX à la fois'], answer: 0,
        explain: 'ET n\'est vrai que si les deux sont vrais. Ici l\'un est faux, donc le résultat est FAUX.' },
    },
    build: L,
  });
})();

/* ---------- 3-9 : Le cahier des charges ---------- */
(function () {
  const L = OT.mkLevel(82, 14);
  L.rect(1, 0, 80, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'ange');
  L.sign(6, 1, 'CAHIER DES CHARGES : 1. UN PONT  2. UNE BULLE  3. UNE SORTIE');
  // 1. le pont (catalyseur)
  L.rect(10, 0, 19, 0, ' ');
  const pont = []; for (let x = 10; x <= 19; x++) pont.push([x, 0]);
  L.compile(8, 1, pont, { g: 0, label: 'CONSTRUIRE', rate: 0.2, say: 'Construction…', done: 'Pont conforme !' });
  L.laser(14, 2, 14, 6, { period: 2, on: 1 });
  L.coin(15, 1);
  // 2. la bulle d'apesanteur au-dessus de l'acide
  L.npc(22, 1, 'kellia');
  L.lowg(24, 1, 47, 13);
  L.acid(25, 46, 1);
  L.rect(24, 12, 47, 12, 'W');
  L.rect(27, 4, 29, 4, '#');
  L.rect(33, 7, 34, 7, '#');
  L.rect(38, 5, 39, 5, '#');
  L.rect(43, 3, 45, 3, '#');
  L.laser(31, 2, 31, 10, { period: 2.6, phase: 0, on: 0.4 });
  L.laser(41, 2, 41, 10, { period: 2.6, phase: 1.3, on: 0.4 });
  L.coin(28, 7).coin(34, 10).coin(39, 8).coin(44, 6);
  L.check(49, 1);
  // 3. la sortie : tapis à contre-sens, acide, presses
  L.npc(50, 1, 'junior');
  L.rumeur(52, 1, 'Un cahier des charges ? On l\'écrit après avoir construit, voyons.');
  L.belt(54, 61, 0, -1);
  L.laser(54, 4, 59, 4, { period: 1, on: 1 });
  L.acid(62, 63, 1);
  L.piston(66, 0).piston(69, 0.95);
  L.coins(66, 69, 3);
  L.door(77, 1);
  L.box(72, 1); L.set(80, 1, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W3.push({
    title: 'Le cahier des charges', par: 32, goal: 'Suis le cahier des charges : construis le pont, traverse la bulle, atteins la sortie.', lesson: 'La démarche d\'ingénieur', tone: 'épique',
    fragment: '« Avant, je construisais d\'abord et je réfléchissais après. L\'ingénierie, c\'est l\'inverse. »',
    intro: [['ange', 'Dernière épreuve avant l\'examen. Un ingénieur commence toujours par écrire ce qu\'il veut obtenir : le cahier des charges.']],
    dialogs: {
      ange: { lines: ['Appuie sur CONSTRUIRE et attends que le pont soit complet.', 'Le laser au-dessus du pont reste allumé : ne saute pas en traversant.'],
        alt: ['Tu as fait du chemin depuis le premier jour. Je suis fier de toi.'] },
      kellia: { lines: ['Dans la bulle : petits sauts, et regarde les lasers verticaux avant de passer.'], alt: ['Petits sauts. Toujours.'] },
      junior: { lines: ['Le tapis te pousse vers l\'arrière et le laser t\'empêche de sauter. Marche, c\'est tout.', 'Après l\'acide, deux presses. Passe juste après qu\'elles remontent.'],
        alt: ['Saute l\'acide depuis le bout du tapis, puis attends les presses.'] },
    },
    teach: {
      title: 'La démarche d\'ingénieur',
      text: "Un projet d'ingénierie suit des étapes : 1. le cahier des charges (les besoins et les contraintes : coût, délai, sécurité), 2. la conception (plusieurs solutions, on choisit), 3. le prototype, 4. les tests, 5. l'amélioration. Commencer par construire sans cahier des charges, c'est risquer de construire la mauvaise chose.",
      q: { question: 'Que décrit le cahier des charges d\'un projet ?', options: ['Les besoins et les contraintes à respecter', 'Le prix de chaque vis', 'Le mode d\'emploi pour l\'utilisateur', 'La liste des erreurs déjà faites'], answer: 0,
        explain: 'Il fixe ce que le projet doit faire et dans quelles limites (coût, délai, sécurité…).' },
    },
    build: L,
  });
})();

/* ---------- 3-10 : BOSS — La Machine de l'Examen ---------- */
(function () {
  const L = OT.mkLevel(36, 12);
  L.rect(1, 0, 34, 0, '#');
  L.rect(8, 2, 9, 2, '#').rect(14, 2, 15, 2, '#').rect(20, 2, 21, 2, '#');
  L.coin(9, 4).coin(15, 4).coin(21, 4);
  L.start(2, 1);
  W3.push({
    title: 'L\'Examen', par: 70, goal: 'Réponds aux 9 questions de la Machine : place-toi sur la bonne case (A, B, C ou D).', lesson: 'La méthode scientifique', tone: 'épique', boss: 'exam',
    fragment: '« L\'examen ne voulait pas savoir ce que j\'avais appris par cœur. Il voulait savoir ce que j\'avais compris. »',
    intro: [
      ['ange', 'Voilà l\'examen. Une question à la fois, quatre réponses sur le sol : A, B, C, D.'],
      ['dimi', 'Place-toi sur la bonne case et reste dessus un instant. Une mauvaise réponse, et c\'est la chute.'],
      ['machine', 'QUESTION NUMÉRO UN. VOUS AVEZ QUINZE SECONDES.'],
    ],
    dialogs: {},
    teach: {
      title: 'La méthode scientifique',
      text: "La méthode scientifique avance par étapes : 1. observer, 2. poser une question, 3. formuler une hypothèse, 4. la tester par une expérience, 5. analyser les résultats, 6. conclure (l'hypothèse est confirmée ou rejetée). Une hypothèse qu'on ne peut pas tester n'est pas scientifique.",
      q: { question: 'Après avoir formulé une hypothèse, que fait-on ?', options: ['On la teste par une expérience', 'On la considère comme vraie', 'On l\'oublie', 'On en écrit une autre tout de suite'], answer: 0,
        explain: 'Une hypothèse doit être testée : l\'expérience dira si elle tient ou non.' },
    },
    build: L,
  });
})();

/* Les questions de l'examen (la bonne réponse est toujours écrite en premier ; l'ordre est mélangé en jeu) */
OT.WORLD3.bossText = {
  name: "La Machine de l'Examen", color: '#3cffd8',
  phases: [
    { name: 'Mathématiques', say: 'ÉPREUVE 1 : MATHÉMATIQUES.',
      help: 'Lis la question en haut, puis place-toi sur la case de la bonne réponse et restes-y un instant. 15 secondes par question.',
      tell: [['annie', 'Première épreuve : les maths. Lis la question en haut de l\'écran, puis va sur la bonne case.']],
      questions: [
        { q: 'Combien font 7 × 8 ?', a: ['56', '54', '64', '48'] },
        { q: 'Dérivée de x² ?', a: ['2x', 'x', 'x²', '2'] },
        { q: 'Probabilité d\'obtenir 6 avec un dé ?', a: ['1/6', '1/2', '6', '1/3'] },
      ] },
    { name: 'Chimie', say: 'ÉPREUVE 2 : CHIMIE.',
      help: 'Même règle, mais des fioles tombent du plafond (ombre rouge). Ne reste pas dessous.',
      tell: [['reine', 'Deuxième épreuve : la chimie. Et attention, la Machine fait tomber des fioles : regarde les ombres rouges.']],
      questions: [
        { q: 'Une solution de pH 3 est…', a: ['acide', 'basique', 'neutre', 'salée'] },
        { q: 'La formule de l\'eau ?', a: ['H₂O', 'CO₂', 'O₂', 'NaCl'] },
        { q: 'Une enzyme est…', a: ['un catalyseur', 'un acide', 'un métal', 'un sucre'] },
      ] },
    { name: 'Ingénierie', say: 'ÉPREUVE 3 : INGÉNIERIE.',
      help: 'Des rayons rouges filent au ras du sol : saute par-dessus. Et réponds juste.',
      tell: [['ange', 'Dernière épreuve. Des rayons filent au ras du sol : saute par-dessus. Tu y es presque.']],
      questions: [
        { q: '12 V et 2 A : quelle puissance ?', a: ['24 W', '6 W', '14 W', '10 W'] },
        { q: 'Unité de la force ?', a: ['le newton', 'le joule', 'le watt', 'le volt'] },
        { q: 'VRAI ET FAUX = ?', a: ['FAUX', 'VRAI', 'les deux', 'aucun'] },
      ] },
  ],
  end: 'EXAMEN… RÉUSSI. FÉLICITATIONS.',
};

OT.CHAPTERS[2] = {
  n: 3, title: 'Le Laboratoire — Comprendre',
  paragraphs: [
    "L'université, c'était un autre monde. De nouvelles règles, de nouveaux visages, et personne pour te dire où est l'amphithéâtre.",
    "Ange venait de Belgique. Elle aussi découvrait tout. C'est peut-être pour ça qu'elle a pris le temps de m'aider à trouver ma place.",
    "Dimi et Annie m'ont réconcilié avec les maths. Une dérivée, c'est une pente. Une probabilité, c'est un rapport. Dit comme ça, ça fait moins peur.",
    "Reine m'a fait entrer dans son labo de biochimie. Tsague Junior, Junior et Kellia ont partagé les nuits de révision, les doutes et les fous rires.",
    "J'ai compris que l'ingénierie, ce n'est pas bricoler jusqu'à ce que ça marche. C'est comprendre avant de construire, mesurer, tester, recommencer.",
  ],
  last: "J'avais appris à comprendre. Il me restait à oser imaginer.",
};

OT.WORLD3.chapter = OT.CHAPTERS[2];
OT.WORLD3.intro = [
  { text: 'Douala. L\'université.', cam: { x: 40, y: 7, z: 36 } },
  { text: 'Après les machines et le code, il fallait comprendre la science qui les fait tenir.', cam: { x: 22, y: 4, z: 22 } },
  { text: 'De nouveaux visages. De nouvelles règles.', cam: { x: 10, y: 3, z: 15 } },
  { text: 'Bienvenue au Laboratoire.', cam: { x: 4, y: 2.5, z: 11 } },
];
OT.WORLD_DATA[3] = OT.WORLD3;
