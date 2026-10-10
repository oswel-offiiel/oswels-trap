/* =====================================================================
   OSWEL'S TRAP — world4.js
   MONDE 4 : NEXUS — « Imaginer »
   Le monde des idées connectées : les réseaux, Internet, l'IA, le design.
   Oswel y rencontre une communauté qui l'inspire : Francheska, Danie Manon,
   Sandex, Fredo, Lady Annee, Valdes, Win Black, Reine Damso, Belvianne,
   Charly et Ashley. Le boss : Zeus, son frère, pour un défi entre frères.

   Nouveaux pièges :
     K bloc rose / Q bloc bleu : CHAQUE SAUT les fait basculer
       (règle simple : on saute vers les blocs transparents, ils apparaîtront)
     portails (on garde son élan), ventilateurs, nuages qui s'effacent.
   ===================================================================== */

window.OT = window.OT || {};

Object.assign(OT.CHARACTERS, {
  francheska: { name: 'Francheska',  color: 0xff6fae, hat: 0x5a1a3a, hatType: 'bun', female: true, hairStyle: 'ponytail', hair: 0x4a1424, accent: 0xffd23f },
  danie:      { name: 'Danie Manon', color: 0x5ad1ff, hat: 0x1a3a5a, hatType: 'bun', female: true, hairStyle: 'braidsL', accent: 0xf2f2f2 },
  sandex:     { name: 'Sandex',      color: 0xf2c230, hat: 0x3a2a00, hatType: 'cap' },
  fredo:      { name: 'Fredo',       color: 0x34c26b, hat: 0x0f3a20, hatType: 'band', char: 'fredo' },   // jouable aussi
  ladyannee:  { name: 'Lady Annee',  color: 0xc78bff, hat: 0x2a1040, hatType: 'bun', female: true, hairStyle: 'long', accent: 0xffd23f },
  // Valdes : l'assistant de Win Black (il explique, Black agit)
  valdes:     { name: 'Valdes',      color: 0xff8a2b, hat: 0x3a1a00, hatType: 'cap', prop: 'tablet', role: 'Assistant de Win Black', char: 'valdes',   // jouable aussi
    profile: {
      title: 'Assistant de Win Black',
      about: "Le bras droit de Win Black. Quand Black se tait et agit, c'est Valdes qui explique : il prépare les outils, surveille l'énergie et prévient quand on va trop loin.",
      met: '4-7',
    } },
  // Win Black : génie de l'électrique et de l'informatique industrielle (veste noire, gants d'électricien)
  // GOD LOVE : personnage jouable (Boutique → Personnage), qu'on croise aussi au niveau 4-7
  godlove:    { name: 'God Love',    color: 0xb0123c, char: 'godlove', ui: 0xff4d7a,
    profile: {
      title: 'Personnage jouable',
      about: "Coupe haute, long manteau, chaîne dorée et un cœur lumineux qui bat sur la poitrine. On le choisit dans la Boutique (onglet Personnage) et dans la Soirée OSWEL. On le croise aussi au niveau 4-7, dans le même niveau que Win Black.",
      met: '4-7',
    } },
  winblack:   { name: 'Win Black',   color: 0x08080b, hat: 0x0b0b0d, hatType: 'short', ui: 0x5fd4ff, gloves: 0xf2a516, eyes: 0x7fe6ff, burns: true,
    profile: {
      nick: 'Black',
      title: "Génie de l'électrique et de l'informatique industrielle",
      about: "Surnommé « Black » parce qu'il n'a jamais eu peur de mettre les mains dans le cambouis. Ancien génie en électrique et informatique industrielle, devenu une légende urbaine chez les bidouilleurs.",
      look: "Veste noire usée par les étincelles, gants d'électricien toujours à portée, regard perçant qui analyse chaque circuit en une seconde. Quand il entre dans une pièce, les machines semblent l'écouter.",
      mind: "Froid et méthodique en apparence, mais intrépide à l'intérieur. Il ne parle pas beaucoup, il agit. Chaque risque qu'il prend est calculé… à sa manière.",
      power: { name: 'BLACKOUT', text: "Win peut détourner toute l'énergie environnante pour surcharger ses outils ou paralyser les systèmes ennemis. Puissance massive, mais s'il pousse trop loin, c'est le blackout total." },
      quote: "On dit que les ignorants sont plus heureux que les savants. Moi, je réponds : le savoir est une arme, alors il me faut des munitions. C'est pour cela que je ne cesserai jamais de chercher.",
      assistant: 'Valdes',
      met: '4-7',
    } },
  reinedamso: { name: 'Reine Damso', color: 0xd8392b, hat: 0xf2c230, hatType: 'scarf', female: true, accent: 0xf2c230 },
  belvianne:  { name: 'Belvianne',   color: 0x8e5bd6, hat: 0xffd28a, hatType: 'bun', female: true, hairStyle: 'bunlong', accent: 0xffd28a },
  charly:     { name: 'Charly',      color: 0x3d8bff, hat: 0x0f2340, hatType: 'cap' },
  ashley:     { name: 'Ashley',      color: 0xff7a7a, hat: 0x3a1010, hatType: 'band', female: true, hairStyle: 'ponytail', accent: 0xff3a3a },
  zeus:       { name: 'Zeus',        color: 0xf2c230, hat: 0x2a1a00, hatType: 'cap' },
  ia:         { name: "L'IA",        color: 0x9fe7ff },
});

OT.WORLD4 = { id: 4, name: 'Nexus', motto: 'Imaginer', levels: [], theme: 'nexus' };
const W4 = OT.WORLD4.levels;

/* ---------- 4-1 : L'éveil ---------- */
(function () {
  const L = OT.mkLevel(72, 11);
  L.rect(1, 0, 70, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'francheska');
  L.sign(7, 1, 'CHAQUE SAUT : ROSE ⇄ BLEU');
  // 1. deux îlots, un bleu puis un rose
  L.rect(10, 0, 20, 0, ' ');
  L.blocks(12, 0, 14, 0, 'Q').blocks(17, 0, 19, 0, 'K');
  L.coins(15, 16, 3);
  // 2. l'escalier qui alterne au-dessus des pics
  L.rect(27, 1, 36, 1, '^');
  L.blocks(28, 2, 29, 2, 'K').blocks(31, 4, 32, 4, 'Q').blocks(34, 6, 35, 6, 'K');
  L.rect(37, 6, 44, 6, '#');
  L.coin(32, 7).coin(40, 8);
  L.check(39, 7);
  // 3. un portail pour passer le mur
  L.rect(47, 1, 47, 9, '#');
  L.portals(46, 1, 49, 1);
  L.rumeur(51, 1, 'Le ventilateur ? Il souffle vers le bas, voyons.');
  // 4. le ventilateur fait monter par-dessus le mur
  L.rect(53, 0, 56, 0, ' ');
  L.fan(54, 0, 9);
  L.rect(57, 1, 57, 5, '#');
  L.coin(55, 9);
  L.door(66, 1);
  L.box(24, 1); L.set(44, 7, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W4.push({
    title: 'L\'éveil', par: 20, goal: 'Chaque saut fait apparaître les blocs transparents. Atteins la SORTIE.', lesson: 'Internet et le Web', tone: 'troll',
    fragment: '« Dans le Nexus, ce qui n\'existe pas encore attend juste qu\'on saute vers lui. »',
    intro: [['francheska', 'Bienvenue dans le Nexus, le monde des idées. Ici, la réalité change chaque fois que tu sautes.'], ['francheska', 'Une règle à retenir : saute vers les blocs transparents. Ils apparaîtront pendant ton saut.']],
    dialogs: {
      francheska: { lines: ['Rose ou bleu : à chaque saut, l\'un apparaît et l\'autre disparaît.', 'Si le bloc vers lequel tu veux sauter est déjà plein, fais d\'abord un petit saut sur place.'],
        alt: ['Regarde la couleur AVANT de sauter : il faut que la prochaine marche soit transparente.'] },
    },
    teach: {
      title: 'Internet et le Web',
      text: "Internet est un immense réseau qui relie des milliards d'ordinateurs entre eux (un réseau de réseaux). Le Web n'est qu'un des services qui fonctionnent sur Internet : les pages et les liens qu'on consulte avec un navigateur. Les e-mails, les jeux en ligne ou les appels vidéo utilisent aussi Internet, sans être le Web.",
      q: { question: 'Quelle phrase est juste ?', options: ['Le Web est un service qui fonctionne sur Internet', 'Internet et le Web sont exactement la même chose', 'Le Web a été créé avant Internet', 'Internet n\'est qu\'un site web'], answer: 0,
        explain: 'Internet est le réseau ; le Web (les pages et les liens) est l\'un des services qui l\'utilisent.' },
    },
    build: L,
  });
})();

/* ---------- 4-2 : Le réseau (adresses IP) ---------- */
(function () {
  const L = OT.mkLevel(72, 12);
  L.rect(1, 0, 70, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'danie');
  L.sign(7, 1, 'ENVOIE LE PAQUET À 192.168.1.7');
  // salle 1 : trois portails, un seul a la bonne adresse
  L.portal(10, 1, 2, 1, { label: '192.168.1.1' });
  L.portal(14, 1, 24, 1, { label: '192.168.1.7' });
  L.portal(18, 1, 2, 1, { label: '10.0.0.7' });
  L.coin(10, 4);
  L.rect(21, 1, 21, 10, '#');
  // salle 2 : la bonne adresse est en hauteur
  L.check(24, 1);
  L.sign(25, 1, 'ENVOIE LE PAQUET À 172.16.0.5');
  L.rect(27, 1, 28, 1, '^');
  L.blocks(30, 2, 31, 2, 'Q').blocks(33, 4, 34, 4, 'K');
  L.portal(34, 5, 49, 1, { label: '172.16.0.5' });
  L.portal(37, 1, 24, 1, { label: '172.16.0.50' });
  L.portal(41, 1, 24, 1, { label: '172.16.5.0' });
  L.coin(31, 5);
  L.rect(45, 1, 45, 10, '#');
  // salle 3 : le ventilateur
  L.rumeur(49, 1, 'Toutes les adresses mènent au même endroit.');
  L.npc(51, 1, 'fredo');
  L.rect(53, 0, 56, 0, ' ');
  L.fan(54, 0, 8);
  L.rect(57, 1, 57, 4, '#');
  L.coins(60, 62, 1);
  L.door(66, 1);
  L.set(32, 1, 'H'); L.box(46, 1);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W4.push({
    title: 'Le réseau', par: 22, goal: 'Envoie le paquet à la bonne adresse IP : choisis le bon portail.', lesson: 'L\'adresse IP', tone: 'puzzle',
    fragment: '« Sur un réseau, chacun a une adresse. Moi, j\'étais encore en train de chercher la mienne. »',
    intro: [['danie', 'Chaque appareil connecté a une adresse IP, comme une adresse postale. Lis bien le numéro avant d\'entrer dans un portail.']],
    dialogs: {
      danie: { lines: ['Une seule différence de chiffre, et le paquet part ailleurs.', 'Les mauvais portails te renvoient au début de la salle.'],
        alt: ['Saute par-dessus le premier portail : le bon est le deuxième, 192.168.1.7.'] },
      fredo: { lines: ['Le ventilateur te soulève. Laisse-toi porter, puis avance au-dessus du mur.'],
        alt: ['Tombe dans le trou, juste au-dessus du ventilateur. Il fait le reste.'] },
    },
    teach: {
      title: 'L\'adresse IP',
      text: "Sur un réseau, chaque appareil reçoit une adresse IP qui l'identifie, par exemple 192.168.1.7 (IPv4 : quatre nombres de 0 à 255). Les routeurs lisent cette adresse pour faire suivre les données, découpées en paquets, jusqu'au bon destinataire. Comme une adresse postale, une erreur d'un seul chiffre envoie le paquet ailleurs.",
      q: { question: 'À quoi sert une adresse IP ?', options: ['À identifier un appareil sur un réseau', 'À protéger un mot de passe', 'À mesurer la vitesse d\'Internet', 'À nommer un fichier'], answer: 0,
        explain: 'L\'adresse IP permet aux routeurs de savoir à quel appareil envoyer les données.' },
    },
    build: L,
  });
})();

/* ---------- 4-3 : Le nuage ---------- */
(function () {
  const L = OT.mkLevel(76, 14);
  L.rect(1, 0, 74, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'sandex');
  L.sign(6, 1, 'MONTE DANS LE NUAGE ↑');
  L.fan(8, 1, 9);
  L.rect(10, 1, 10, 7, '#');
  // les nuages s'effacent quand on reste dessus
  L.rect(11, 1, 35, 1, '^');
  L.rect(12, 7, 15, 7, '=').rect(18, 8, 21, 8, '=').rect(24, 7, 27, 7, '=').rect(30, 6, 33, 6, '=');
  L.coin(13, 9).coin(19, 10).coin(25, 9).coin(31, 8);
  L.check(37, 1);
  L.rumeur(38, 1, 'Les nuages, c\'est solide. Regarde, ça ne bouge pas.');
  // téléversement : un portail vers un nuage tout en haut, puis on redescend
  L.rect(45, 1, 45, 12, '#');
  L.portal(43, 1, 48, 9);
  L.rect(46, 1, 63, 1, '^');
  L.rect(47, 8, 51, 8, '=').rect(54, 6, 56, 6, '=').rect(59, 4, 61, 4, '=');
  L.coin(55, 8).coin(60, 6);
  L.npc(66, 1, 'fredo');
  L.door(71, 1);
  L.box(74, 1);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W4.push({
    title: 'Le nuage', par: 24, goal: 'Traverse les nuages sans t\'arrêter : ils s\'effacent sous tes pieds.', lesson: 'Le cloud', tone: 'épique',
    fragment: '« Le cloud, ce n\'est pas le ciel. C\'est l\'ordinateur de quelqu\'un d\'autre. »',
    intro: [['sandex', 'Le ventilateur va te monter jusqu\'aux nuages. Ensuite, ne reste jamais longtemps au même endroit.']],
    dialogs: {
      sandex: { lines: ['Les nuages tiennent un instant, puis s\'effacent. Ils reviennent ensuite.', 'Au-dessus du mur, laisse le ventilateur te porter, puis va à droite.'],
        alt: ['Saute de nuage en nuage sans t\'arrêter. Le portail suivant t\'envoie tout en haut : redescends vite.'] },
      fredo: { lines: ['Tes fichiers dans le cloud ? Ils sont sur des serveurs, quelque part dans le monde.'], alt: ['La porte est juste là.'] },
    },
    teach: {
      title: 'Le cloud',
      text: "Utiliser le « cloud », c'est utiliser des ordinateurs distants (des serveurs dans des centres de données) à travers Internet : pour stocker ses fichiers, faire tourner un site ou une application. Avantages : accessible partout, pas de matériel à acheter. Inconvénients : il faut une connexion, et faire confiance à l'hébergeur.",
      q: { question: 'Que veut dire « stocker ses fichiers dans le cloud » ?', options: ['Les stocker sur des serveurs distants, via Internet', 'Les stocker dans la mémoire du téléphone', 'Les imprimer', 'Les effacer pour libérer de la place'], answer: 0,
        explain: 'Le cloud, ce sont des serveurs distants auxquels on accède par Internet.' },
    },
    build: L,
  });
})();

/* ---------- 4-4 : Le mot de passe ---------- */
(function () {
  const L = OT.mkLevel(72, 12);
  L.rect(1, 0, 70, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'ladyannee');
  L.sign(7, 1, 'MOT DE PASSE + CODE = ACCÈS');
  // 1. le chemin rose / bleu au-dessus des pics
  L.rect(10, 1, 30, 1, '^');
  L.blocks(11, 2, 12, 2, 'K').blocks(15, 3, 16, 3, 'Q').blocks(19, 4, 20, 4, 'K').blocks(23, 3, 24, 3, 'Q').blocks(27, 2, 28, 2, 'K');
  L.coin(16, 6).coin(20, 7).coin(24, 6);
  // 2. la double authentification : deux boutons en même temps
  L.button(35, 1, true);
  L.sign(36, 1, 'MOT DE PASSE');
  L.rect(38, 1, 38, 1, '#').rect(40, 3, 42, 3, '#');
  L.button(41, 4, true);
  L.sign(42, 4, 'CODE SMS');
  L.gate(45, 1, 6, true);
  L.check(47, 1);
  // 3. les mauvais mots de passe
  L.rumeur(49, 1, 'Le meilleur mot de passe, c\'est 123456 : facile à retenir.');
  L.fakeDoor(52, 1, '123456');
  L.rect(55, 2, 59, 2, '#').fakeDoor(57, 3, 'motdepasse');   // plateforme basse : on y monte d'un saut
  L.coin(55, 5).coin(57, 6).coin(59, 5);         // de part et d'autre de la fausse porte (celle du milieu se prend d'un saut haut)
  L.laser(61, 1, 61, 4, { period: 2.2, on: 0.5 });
  L.door(66, 1, { label: 'K7#vQ2!pL' });
  L.set(33, 1, 'H'); L.box(43, 1);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W4.push({
    title: 'Le mot de passe', par: 22, goal: 'Passe la double vérification, puis choisis la porte au mot de passe solide.', lesson: 'La sécurité des comptes', tone: 'puzzle',
    fragment: '« Un bon mot de passe, c\'est comme un bon ami : unique, et difficile à deviner. »',
    intro: [['ladyannee', 'Dans le Nexus, tout est protégé. Pour passer, il faut ton mot de passe ET un code reçu par SMS.']],
    dialogs: {
      ladyannee: { lines: ['Deux boutons, deux preuves : le mot de passe (en bas) et le code (en haut). Les deux en même temps.', 'Ensuite, méfie-toi des portes au mot de passe trop simple.'],
        alt: ['Appuie sur MOT DE PASSE, monte vite sur la plateforme pour CODE SMS, puis cours à la barrière.'] },
    },
    teach: {
      title: 'Mots de passe et double authentification',
      text: "Un mot de passe solide est long (12 caractères ou plus), mélange lettres, chiffres et symboles, et n'est utilisé que pour un seul compte. « 123456 » ou « motdepasse » sont devinés en une seconde. La double authentification (2FA) ajoute une deuxième preuve, comme un code reçu par SMS : même si le mot de passe fuit, le compte reste protégé.",
      q: { question: 'Lequel de ces mots de passe est le plus solide ?', options: ['K7#vQ2!pL-m9', '123456', 'motdepasse', 'oswel2026'], answer: 0,
        explain: 'Long, mélangé, imprévisible : c\'est ce qui rend un mot de passe difficile à deviner.' },
    },
    build: L,
  });
})();

/* ---------- 4-5 : L'API (requête et réponse) ---------- */
(function () {
  const L = OT.mkLevel(72, 14);
  L.rect(1, 0, 70, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'valdes');
  L.sign(7, 1, 'REQUÊTE → SERVEUR → RÉPONSE');
  // 1. deux fenêtres mobiles au-dessus du vide
  L.rect(10, 0, 22, 0, ' ');
  L.plat(12, 0, 'M', 2, { speed: 1.3 }).plat(18, 0, 'M', 2, { speed: 1.3, phase: 1.2 });
  L.coin(16, 3);
  // 2. le portail REQUÊTE monte au serveur
  L.portal(26, 1, 31, 8, { label: 'REQUÊTE' });
  L.rect(29, 7, 52, 7, '#');                      // le plancher du serveur
  L.rect(29, 8, 29, 12, '#');
  L.rect(35, 8, 36, 8, '^');
  L.rect(41, 8, 43, 8, '^');
  L.fakePart(47, 8);
  L.part(50, 8);
  L.portal(51, 8, 56, 1, { label: 'RÉPONSE' });
  L.rect(54, 1, 54, 6, '#');
  L.coin(42, 11);
  // 3. retour chez le client : la porte a besoin de la réponse
  L.check(56, 1);
  L.rumeur(58, 1, 'La porte s\'ouvre toute seule. Pas besoin de réponse.');
  L.door(66, 1, { needsPart: true, label: 'CLIENT' });
  L.box(29, 1); L.set(48, 1, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W4.push({
    title: 'L\'API', par: 26, goal: 'Envoie une requête au serveur, rapporte la bonne réponse au client.', lesson: 'Les API', tone: 'puzzle',
    fragment: '« Une API, c\'est une promesse : tu demandes comme il faut, je réponds comme prévu. »',
    intro: [['valdes', 'Le client veut une réponse. Elle est au serveur, en haut. Prends le portail REQUÊTE, récupère la vraie réponse, et reviens.']],
    dialogs: {
      valdes: { lines: ['Au serveur, deux réponses brillent. La vraie fait vibrer la manette de plus en plus fort.', 'La porte du client explose si tu arrives sans la bonne réponse.'],
        alt: ['La fausse réponse est la première. Saute par-dessus et prends celle du fond, puis le portail RÉPONSE.'] },
    },
    teach: {
      title: 'Les API',
      text: "Une API (interface de programmation) permet à deux programmes de communiquer selon des règles fixées : on envoie une requête (par exemple « donne-moi la météo de Douala »), le serveur renvoie une réponse dans un format prévu, souvent en JSON. Les applications de paiement, de cartes ou de météo utilisent des API.",
      q: { question: 'Qu\'est-ce qu\'une API ?', options: ['Une interface qui permet à deux programmes de communiquer', 'Un virus informatique', 'Un type d\'écran', 'Un langage pour faire des pages web'], answer: 0,
        explain: 'Une API définit comment demander quelque chose à un programme et ce qu\'il répondra.' },
    },
    build: L,
  });
})();

/* ---------- 4-6 : L'IA apprend (course contre l'IA) ---------- */
(function () {
  const L = OT.mkLevel(74, 12);
  L.rect(1, 0, 72, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'ladyannee');
  L.rival(4.0, 'ia', [[2, 1], [69, 1]]);
  L.sign(6, 1, 'L\'IA A APPRIS LE CHEMIN');
  // 1. alternance rose / bleu sur le sol
  L.rect(9, 0, 22, 0, ' ');
  L.blocks(10, 0, 12, 0, 'Q').blocks(14, 0, 16, 0, 'K').blocks(18, 0, 20, 0, 'Q');
  L.coin(13, 3).coin(17, 3);
  // 2. le ventilateur et le mur
  L.rect(25, 0, 27, 0, ' ');
  L.fan(26, 0, 8);
  L.rect(28, 1, 28, 4, '#');
  L.check(31, 1);
  L.rumeur(32, 1, 'Une IA ne se trompe jamais. Copie-la.');
  // 3. lasers en vague
  L.laser(36, 1, 36, 4, { period: 2.4, phase: 0, on: 0.45 });
  L.laser(39, 1, 39, 4, { period: 2.4, phase: 0.6, on: 0.45 });
  L.laser(42, 1, 42, 4, { period: 2.4, phase: 1.2, on: 0.45 });
  // 4. portail au-dessus du vide
  L.rect(47, 0, 56, 0, ' ');
  L.portals(46, 1, 58, 1);
  L.coin(61, 2).coin(62, 3).coin(63, 3).coin(64, 3).coin(65, 2).coin(66, 1);   // en arc, après le portail (avant : au-dessus du vide)
  L.npc(60, 1, 'ashley');
  L.door(69, 1);
  L.set(23, 1, 'H'); L.box(29, 1);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W4.push({
    title: 'L\'IA apprend', par: 20, goal: 'Fais la course contre l\'IA : arrive à la SORTIE avant elle.', lesson: 'L\'intelligence artificielle', tone: 'épique',
    fragment: '« L\'IA avait appris le chemin. Moi, j\'avais appris pourquoi c\'était le chemin. »',
    intro: [['ia', 'J\'ai regardé des milliers de joueurs. Je connais le chemin par cœur. Tu crois pouvoir me battre ?']],
    dialogs: {
      ladyannee: { lines: ['Une IA apprend à partir d\'exemples. Elle est rapide, mais elle ne fait que ce qu\'elle a vu.', 'Pour les blocs rose et bleu, rappelle-toi : saute vers les transparents.'],
        alt: ['Ne t\'arrête pas pour les pièces : l\'IA, elle, ne s\'arrête jamais.'] },
      ashley: { lines: ['Bien joué ! Une IA, c\'est un outil. C\'est toi qui décides quoi en faire.'], alt: ['La porte est juste là.'] },
    },
    teach: {
      title: 'L\'intelligence artificielle',
      text: "Un programme d'apprentissage automatique (une forme d'IA) n'est pas écrit règle par règle : il apprend à partir de nombreux exemples (des données). Montrez-lui des milliers de photos de chats et de chiens étiquetées, il apprendra à les distinguer. Des données de mauvaise qualité donnent une IA qui se trompe.",
      q: { question: 'De quoi un programme d\'apprentissage automatique a-t-il surtout besoin pour apprendre ?', options: ['De nombreux exemples (des données)', 'D\'un écran plus grand', 'D\'une connexion Bluetooth', 'De rien, il sait déjà tout'], answer: 0,
        explain: 'Il apprend à partir de données : la qualité des exemples fait la qualité du résultat.' },
    },
    build: L,
  });
})();

/* ---------- 4-7 : Git commit (Reine Damso) ---------- */
(function () {
  const L = OT.mkLevel(76, 12);
  L.rect(1, 0, 74, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'reinedamso');
  L.sign(3, 1, 'CHAQUE COMMIT SAUVEGARDE UNE ÉTAPE');
  // un long ravin, construit morceau par morceau : un commit = un morceau de pont
  L.rect(10, 0, 49, 0, ' ');
  const seg = (a, b) => { const c = []; for (let x = a; x <= b; x++) c.push([x, 0]); return c; };
  L.compile(8, 1, seg(10, 19), { g: 0, label: 'git commit', rate: 0.12, say: 'Commit 1 : fondations.', done: 'Étape 1 sauvegardée.' });
  L.compile(20, 1, seg(21, 29), { g: 1, label: 'git commit', rate: 0.12, say: 'Commit 2 : structure.', done: 'Étape 2 sauvegardée.' });
  L.compile(30, 1, seg(31, 39), { g: 2, label: 'git commit', rate: 0.12, say: 'Commit 3 : finitions.', done: 'Étape 3 sauvegardée.' });
  L.compile(40, 1, seg(41, 49), { g: 3, label: 'git commit', rate: 0.12, say: 'Commit 4 : version finale.', done: 'Projet sauvegardé !' });
  L.set(20, 0, '#').set(30, 0, '#').set(40, 0, '#');
  L.rumeur(6, 1, 'Pas besoin de sauvegarder. Fonce, ça ira.');
  L.laser(25, 2, 25, 6, { period: 1, on: 1 });
  L.laser(35, 2, 35, 6, { period: 1, on: 1 });
  L.coins(23, 27, 3).coins(43, 47, 3);
  L.check(51, 1);
  // l'atelier de Win Black et de son assistant Valdes, juste avant les blocs rose / bleu
  L.npc(50, 1, 'valdes').npc(53, 1, 'winblack');
  // la fin : rose / bleu au-dessus des pics
  L.rect(54, 1, 64, 1, '^');
  L.blocks(55, 2, 56, 2, 'K').blocks(59, 3, 60, 3, 'Q').blocks(63, 2, 64, 2, 'K');
  L.npc(67, 1, 'charly').npc(69, 1, 'godlove');
  L.door(71, 1);
  L.box(65, 1); L.set(74, 1, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W4.push({
    title: 'Git commit', par: 26, goal: 'Construis le pont étape par étape : un commit à la fois.', lesson: 'Git et les versions', tone: 'puzzle',
    fragment: '« Reine Damso m\'a appris à sauvegarder souvent. Le jour où tout plante, on remercie le commit d\'avant. »',
    intro: [['reinedamso', 'Un grand projet se construit par petites étapes, et on sauvegarde chacune : c\'est un commit.'], ['reinedamso', 'Marche sur chaque bouton « git commit » : il construit le morceau de pont suivant.']],
    dialogs: {
      reinedamso: { lines: ['Attends que chaque morceau soit construit avant d\'avancer.', 'Les lasers au-dessus du pont ne s\'éteignent jamais : ne saute pas.'],
        alt: ['Un commit, tu attends, tu avances jusqu\'au bouton suivant. Pas de saut sur le pont.'] },
      charly: { lines: ['Avec Git, on peut revenir à n\'importe quelle version. Même à celle d\'avant la catastrophe.'], alt: ['Encore un effort !'] },
      godlove: { lines: ['Moi, c\'est God Love ! Tu peux aussi jouer avec moi : Boutique, onglet Personnage.', 'La sortie est juste là. Si tu joues à deux, attends ton coéquipier : on passe la porte ensemble.'],
        alt: ['Courage, la porte est juste là !'] },
      // l'assistant explique…
      valdes: { lines: ['Moi, c\'est Valdes, l\'assistant de Win Black. Il parle peu : c\'est moi qui explique.', 'Ces blocs rose et bleu changent à chaque saut. Black peut couper leur courant : ils restent alors tous solides.', 'Mais ne lui en demande pas trop. S\'il pousse trop loin… c\'est le blackout total.'],
        alt: ['Parle à Black, juste à côté. Pendant son BLACKOUT, tous les blocs tiennent : traverse vite, le courant revient vite.'] },
      // …Black agit
      winblack: { lines: ['…', 'On dit que les ignorants sont plus heureux que les savants. Moi, je réponds : le savoir est une arme, alors il me faut des munitions.', 'C\'est pour cela que je ne cesserai jamais de chercher.', 'Écarte-toi. BLACKOUT.'],
        alt: ['Tu tombes, tu analyses, tu recommences. BLACKOUT.'],
        again: ['Encore ?', 'Si je pousse trop loin…'],
        act: 'blackout', againAct: 'blackoutTotal' },
    },
    teach: {
      title: 'Git et les versions',
      text: "Git est un outil de gestion de versions. Chaque « commit » enregistre l'état du projet à un instant, avec un message (« ajoute la page contact »). On peut comparer les versions, revenir en arrière après une erreur, et travailler à plusieurs sans écraser le travail des autres (avec GitHub, par exemple).",
      q: { question: 'Que fait un « commit » avec Git ?', options: ['Il enregistre une version du projet', 'Il supprime le projet', 'Il met le site en ligne automatiquement', 'Il corrige les bugs tout seul'], answer: 0,
        explain: 'Un commit sauvegarde l\'état du projet à un moment donné, avec un message.' },
    },
    build: L,
  });
})();

/* ---------- 4-8 : Open source (Belvianne et Charly) ---------- */
(function () {
  const L = OT.mkLevel(74, 12);
  L.rect(1, 0, 72, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'belvianne');
  L.sign(6, 1, 'LE CODE SOURCE EST OUVERT : LIS-LE');
  // 1. un mur qui n'en est pas un (le code source le dit)
  L.sign(9, 1, 'mur.solide = false;');
  L.rect(11, 1, 11, 10, 'o');                     // il monte jusqu'au plafond : on ne peut que le traverser
  L.rect(16, 1, 18, 1, '^');
  L.coins(16, 18, 4);
  // 2. la fausse porte et le vrai passage
  L.rumeur(24, 1, 'Le code source, c\'est secret. Fais confiance aux panneaux.');
  L.sign(26, 1, 'porte.vraie = false;');
  L.fakeDoor(28, 1, 'SORTIE');
  L.sign(31, 1, 'sol[34].solide = false;');
  L.set(34, 0, 'f');                               // une dalle qui a l'air solide… le code dit que non
  L.check(37, 1);
  // 3. rose / bleu et ventilateur
  L.npc(38, 1, 'charly');
  L.rect(41, 0, 51, 0, ' ');
  L.blocks(43, 0, 45, 0, 'Q').blocks(48, 0, 50, 0, 'K');
  L.rect(54, 0, 57, 0, ' ');
  L.fan(55, 0, 9);
  L.rect(58, 1, 58, 5, '#');
  L.coin(56, 8);
  L.door(68, 1);
  L.set(21, 1, 'H'); L.box(52, 1);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W4.push({
    title: 'Open source', par: 22, goal: 'Lis le « code source » sur les panneaux : il dit la vérité sur chaque piège.', lesson: 'L\'open source', tone: 'troll',
    fragment: '« Quand le code est ouvert, personne ne peut te mentir longtemps. »',
    intro: [['belvianne', 'Ici, le code source du niveau est affiché sur les panneaux. Lis-le : il ne ment pas.']],
    dialogs: {
      belvianne: { lines: ['« mur.solide = false » : ce mur, tu peux le traverser.', 'Le code source ouvert, c\'est la transparence : tout le monde peut vérifier.'],
        alt: ['Marche droit dans le premier mur. Et ne passe pas par-dessus : en haut, c\'est un piège.'] },
      charly: { lines: ['Linux, Firefox, Python : des millions de gens utilisent du logiciel libre chaque jour.'],
        alt: ['Saute vers les blocs transparents, puis tombe dans le ventilateur.'] },
    },
    teach: {
      title: 'L\'open source',
      text: "Un logiciel open source (libre) publie son code source : tout le monde peut le lire, l'étudier, le modifier et le partager, selon sa licence. Linux, Firefox, Python ou Wikipédia (pour le contenu) fonctionnent ainsi. Avantages : transparence, sécurité vérifiable, entraide entre développeurs.",
      q: { question: 'Qu\'est-ce qu\'un logiciel open source ?', options: ['Un logiciel dont le code source est public et modifiable', 'Un logiciel forcément payant', 'Un logiciel sans aucun bug', 'Un logiciel qui marche sans ordinateur'], answer: 0,
        explain: 'Son code est ouvert : on peut le lire, l\'améliorer et le partager selon sa licence.' },
    },
    build: L,
  });
})();

/* ---------- 4-9 : Imaginer pour les autres (design thinking) ---------- */
(function () {
  const L = OT.mkLevel(84, 14);
  L.rect(1, 0, 82, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'ashley').npc(6, 1, 'francheska');
  L.sign(8, 1, '1. COMPRENDRE  2. IMAGINER  3. PROTOTYPER  4. TESTER');
  // 1. comprendre : l'escalier rose / bleu
  L.rect(11, 1, 24, 1, '^');
  L.blocks(12, 2, 13, 2, 'K').blocks(16, 4, 17, 4, 'Q').blocks(20, 6, 21, 6, 'K');
  L.rect(23, 6, 28, 6, '#');
  L.coin(17, 7).coin(26, 8);
  // 2. imaginer : les nuages et le ventilateur
  L.rect(29, 1, 44, 1, '^');
  L.rect(30, 5, 32, 5, '=').rect(35, 6, 37, 6, '=').rect(40, 5, 42, 5, '=');
  L.coin(36, 8);
  L.check(46, 1);
  L.rumeur(47, 1, 'Pas besoin de demander aux gens ce qu\'ils veulent. Tu le sais mieux qu\'eux.');
  // 3. prototyper : construire
  L.rect(50, 0, 58, 0, ' ');
  const pont = []; for (let x = 50; x <= 58; x++) pont.push([x, 0]);
  L.compile(48, 1, pont, { g: 0, label: 'PROTOTYPE', rate: 0.15, say: 'Prototype en construction…', done: 'Prototype prêt !' });
  // 4. tester : lasers et portail
  L.laser(61, 1, 61, 4, { period: 2.4, phase: 0, on: 0.45 });
  L.laser(64, 1, 64, 4, { period: 2.4, phase: 0.8, on: 0.45 });
  L.rect(68, 1, 68, 12, '#');
  L.portals(66, 1, 70, 1);
  L.npc(72, 1, 'danie');
  L.door(79, 1);
  L.box(28, 7); L.set(59, 1, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W4.push({
    title: 'Imaginer pour les autres', par: 30, goal: 'Comprendre, imaginer, prototyper, tester : traverse les quatre étapes.', lesson: 'Le design thinking', tone: 'épique',
    fragment: '« Imaginer, ce n\'est pas rêver seul. C\'est imaginer pour quelqu\'un. »',
    intro: [['ashley', 'Une bonne idée commence par les gens. D\'abord comprendre, ensuite imaginer, puis prototyper et tester.'], ['francheska', 'Tout ce que tu as appris dans le Nexus, tu vas en avoir besoin ici.']],
    dialogs: {
      ashley: { lines: ['Les blocs rose et bleu : saute vers les transparents.', 'Les nuages s\'effacent, ne t\'y arrête pas.'],
        alt: ['Si le bloc suivant est déjà plein, fais un petit saut sur place pour changer les couleurs.'] },
      francheska: { lines: ['Le design thinking, c\'est partir de l\'utilisateur, pas de soi.'], alt: ['Courage, tu y es presque.'] },
      danie: { lines: ['Tu as fait le tour du Nexus. Il reste quelqu\'un qui t\'attend… ton frère.'], alt: ['La porte est juste là.'] },
    },
    teach: {
      title: 'Le design thinking',
      text: "Le design thinking est une méthode pour créer des solutions utiles : 1. comprendre les utilisateurs (les écouter, les observer : l'empathie), 2. définir leur vrai problème, 3. imaginer beaucoup d'idées, 4. fabriquer un prototype rapide, 5. le tester avec eux, puis améliorer. On part des besoins réels, pas de ce qu'on croit savoir.",
      q: { question: 'Par quoi commence le design thinking ?', options: ['Comprendre les utilisateurs et leurs besoins', 'Choisir la couleur du logo', 'Écrire tout le code', 'Fixer le prix de vente'], answer: 0,
        explain: 'On commence par l\'empathie : comprendre pour qui on conçoit et quel est leur vrai problème.' },
    },
    build: L,
  });
})();

/* ---------- 4-10 : BOSS — Zeus ---------- */
(function () {
  const L = OT.mkLevel(36, 12);
  L.rect(1, 0, 34, 0, '#');
  L.rect(3, 2, 6, 2, '#');              // corniche gauche : dessus à 3
  L.rect(29, 2, 32, 2, '#');            // corniche droite : dessus à 3
  L.blocks(8, 4, 10, 4, 'Q').blocks(25, 4, 27, 4, 'Q');   // bleus : dessus à 5
  L.blocks(11, 6, 12, 6, 'K').blocks(23, 6, 24, 6, 'K');  // roses : dessus à 7
  L.rect(15, 6, 20, 6, '#');            // le trône de Zeus
  L.coin(4, 4).coin(30, 4).coin(9, 6).coin(26, 6);
  L.start(1, 1);
  W4.push({
    title: 'Zeus', par: 60, goal: 'Le défi de Zeus : saute-lui sur la tête, attrape ses idées, puis gagne le dernier round.', lesson: 'Le brainstorming', tone: 'épique', boss: 'zeus',
    fragment: '« Mon frère ne m\'a jamais laissé gagner. C\'est pour ça que chaque victoire comptait. »',
    intro: [
      ['zeus', 'Alors comme ça, tu imagines des mondes ? Voyons si tu peux battre ton frère.'],
      ['francheska', 'Saute-lui sur la tête ! Mais ne le touche pas de face.'],
    ],
    dialogs: {},
    teach: {
      title: 'Le brainstorming',
      text: "Le brainstorming est une méthode pour trouver des idées en groupe. Ses règles : viser la quantité d'idées, ne critiquer aucune idée pendant la séance, rebondir sur les idées des autres, accepter les idées folles. On trie et on évalue seulement APRÈS.",
      q: { question: 'Pendant un brainstorming, que faut-il éviter ?', options: ['Critiquer les idées trop tôt', 'Proposer beaucoup d\'idées', 'Rebondir sur l\'idée d\'un autre', 'Proposer une idée un peu folle'], answer: 0,
        explain: 'On juge les idées après la séance : critiquer pendant bloque la créativité.' },
    },
    build: L,
  });
})();

OT.WORLD4.bossText = {
  name: 'Zeus', color: '#f2c230',
  phases: [
    { name: 'Le défi', say: 'PREMIER ROUND, PETIT FRÈRE !',
      help: 'Saute-lui sur la tête 3 fois (prends de l\'élan et retombe sur lui). Ne le touche pas de face.',
      tell: [['francheska', 'Premier round : saute sur sa tête, trois fois. Prends de l\'élan, saute avant qu\'il soit trop près, et retombe sur lui.']] },
    { name: 'Les idées', say: 'ATTRAPE MES IDÉES, SI TU PEUX !',
      help: 'Zeus fait rouler des balles au sol depuis son trône. Attrape les 3 ampoules en hauteur : saute vers les blocs transparents pour les atteindre.',
      tell: [['francheska', 'Il est monté sur son trône et fait rouler ses idées folles au sol : saute par-dessus. Attrape les trois ampoules en haut.'], ['francheska', 'Pour les atteindre : saute vers les blocs transparents, ils apparaîtront sous tes pieds.']] },
    { name: 'Ensemble', say: 'DERNIER ROUND. JE NE RETIENS RIEN !',
      help: 'Il fonce maintenant : il tremble avant de charger. Saute-lui sur la tête 3 fois.',
      tell: [['francheska', 'Dernier round ! Il tremble juste avant de foncer. Évite-le, puis retombe sur sa tête.']] },
  ],
  end: 'D\'ACCORD… TU AS GAGNÉ. ON CONSTRUIT LA SUITE ENSEMBLE ?',
};

OT.CHAPTERS[3] = {
  n: 4, title: 'Nexus — Imaginer',
  paragraphs: [
    "Il y a eu un moment où apprendre ne suffisait plus. J'avais envie de créer des choses qui n'existaient pas encore.",
    "Le Nexus, c'est l'endroit où les idées se rencontrent. Francheska, Danie Manon, Sandex, Fredo, Lady Annee, Valdes, Win Black, Reine Damso, Belvianne, Charly, Ashley : chacun m'a montré une autre façon de voir.",
    "J'ai compris que tout est relié : les réseaux, les machines, les gens. Une idée seule ne vaut pas grand-chose. Partagée, elle devient un projet.",
    "Et puis il y a eu Zeus. Mon frère. Le seul qui ne m'a jamais laissé gagner facilement. Ce jour-là, il m'a tendu la main.",
    "Imaginer, ce n'est pas fuir la réalité. C'est la préparer.",
  ],
  last: "J'avais les idées. Il était temps de les construire, pour de vrai.",
};

OT.WORLD4.chapter = OT.CHAPTERS[3];
OT.WORLD4.intro = [
  { text: 'Quelque part entre le réel et l\'imaginaire.', cam: { x: 40, y: 7, z: 36 } },
  { text: 'Un monde où les idées se connectent.', cam: { x: 22, y: 4, z: 22 } },
  { text: 'Ici, chaque saut change la réalité.', cam: { x: 10, y: 3, z: 15 } },
  { text: 'Bienvenue dans le Nexus.', cam: { x: 4, y: 2.5, z: 11 } },
];
OT.WORLD_DATA[4] = OT.WORLD4;
