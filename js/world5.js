/* =====================================================================
   OSWEL'S TRAP — world5.js
   MONDE 5 : OSWEL CITY — « Construire mon propre avenir »
   Douala. Oswel lance sa propre activité : des sites web pour les
   commerces de la ville. Toute la famille et les amis reviennent :
   Christine, Franck, Romeo, Oncle Patou et sa femme, Tony, Yannick,
   Brayan, Kellia, Junior, Ange, Zeus. Au cœur de la ville, The Core :
   le dernier combat contre La Rumeur.

   Nouveautés : la circulation (on saute par-dessus les voitures,
   on s'abrite sous les abribus), les portes qui demandent des pièces
   (« le client paie à la livraison »), les grues et ascenseurs de chantier.
   ===================================================================== */

window.OT = window.OT || {};

OT.WORLD5 = { id: 5, name: 'OSWEL City', motto: 'Construire mon propre avenir', levels: [], theme: 'city' };
const W5 = OT.WORLD5.levels;
const CAR = (off, len, h, color) => ({ off, len: len || 2, h: h || 0.9, color });

/* ---------- 5-1 : Le premier client (Christine) ---------- */
(function () {
  const L = OT.mkLevel(74, 11);
  L.rect(1, 0, 72, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'christine');
  L.sign(7, 1, 'LE CLIENT PAIE À LA LIVRAISON : 6 PIÈCES');
  // la route : les voitures arrivent en face, on saute par-dessus ou on s'abrite sous l'abribus
  L.traffic(1, 10, 38, -5, [CAR(0), CAR(15, 2.5)]);
  L.rect(18, 2, 19, 2, '#').rect(29, 2, 30, 2, '#');
  L.coin(18, 4).coin(29, 4).coins(23, 25, 3);
  L.check(42, 1);
  L.rumeur(43, 1, 'Livre d\'abord, le client paiera plus tard. Promis.');
  // le chantier : échafaudages qui cèdent, marteaux-piqueurs
  L.rect(46, 0, 53, 0, '=');
  L.coins(47, 52, 2);
  L.piston(57, 0).piston(60, 0.95);
  L.door(68, 1, { needsCoins: 6, label: 'CLIENT' });
  L.box(54, 1); L.set(63, 1, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W5.push({
    title: 'Le premier client', par: 20, goal: 'Livre le site au client : il faut au moins 6 pièces pour qu\'il ouvre la porte.', lesson: 'Le besoin du client', tone: 'troll',
    fragment: '« Mon premier client, c\'était une boutique du quartier. Elle ne voulait pas un site : elle voulait plus de clients. »',
    intro: [['christine', 'Ça y est, tu te lances à ton compte ? Ton premier client t\'attend au bout de la rue.'], ['christine', 'Et rappelle-toi : il paie à la livraison. Ramasse au moins six pièces en chemin.']],
    dialogs: {
      christine: { lines: ['Les voitures arrivent en face. Saute par-dessus, ou abrite-toi sous un abribus : elles passent devant sans te toucher.', 'Le compteur de pièces est en haut de l\'écran.'],
        alt: ['Je suis fière de toi. Tombe autant que tu veux, mais finis ce que tu commences.'] },
    },
    teach: {
      title: 'Le besoin du client',
      text: "Avant de proposer quoi que ce soit, on écoute le client : quel est son problème, son objectif, son budget, son délai ? Puis on reformule (« si je comprends bien, vous voulez… ») pour vérifier. Un client qui demande « un site » veut souvent autre chose derrière : plus de ventes, plus de visibilité, moins d'appels.",
      q: { question: 'Que faut-il faire en premier avec un nouveau client ?', options: ['Écouter son besoin et le reformuler', 'Lui envoyer tout de suite un prix', 'Commencer le site sans attendre', 'Lui montrer ses propres idées d\'abord'], answer: 0,
        explain: 'On commence par comprendre le vrai besoin ; sinon on risque de livrer la mauvaise chose.' },
    },
    build: L,
  });
})();

/* ---------- 5-2 : Le devis (Franck) ---------- */
(function () {
  const L = OT.mkLevel(76, 12);
  L.rect(1, 0, 74, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'franck');
  L.sign(7, 1, 'DEVIS : 3 PAGES · 2 SEMAINES · 300 000 FCFA');
  // le grand trou du chantier et les palettes suspendues aux grues
  L.rect(10, 0, 27, 0, ' ');
  L.plat(12, 0, 'M', 2, { speed: 1.2 }).plat(18, 1, 'M', 2, { speed: 1.2, phase: 1.3 }).plat(24, 0, 'M', 1.5, { speed: 1.2, phase: 2.6 });
  L.coin(15, 4).coin(21, 5);
  L.check(30, 1);
  // l'ascenseur de chantier vers l'étage, au-dessus des fers à béton
  L.plat(33, 0, 'V', 4.4);
  L.rect(35, 1, 44, 1, '^');
  L.rect(35, 4, 42, 4, '#');
  L.coins(37, 41, 6);
  L.rumeur(47, 1, 'Un devis ? Inutile. On se met d\'accord à la fin.');
  L.piston(50, 0).piston(53, 0.65).piston(56, 1.3);
  L.coins(50, 56, 3);
  L.door(70, 1);
  L.set(35, 5, 'H'); L.box(42, 5);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W5.push({
    title: 'Le devis', par: 24, goal: 'Traverse le chantier : palettes des grues, ascenseur, marteaux-piqueurs.', lesson: 'Le devis', tone: 'épique',
    fragment: '« Franck m\'a dit : écris tout. Ce qui n\'est pas écrit n\'existe pas, surtout le jour de payer. »',
    intro: [['franck', 'Avant de construire quoi que ce soit, on fait un devis : ce qu\'on va faire, combien ça coûte, et pour quand.']],
    dialogs: {
      franck: { lines: ['Les palettes bougent toutes seules. Attends qu\'elles s\'approchent avant de sauter.', 'L\'ascenseur monte jusqu\'à l\'étage. Descends de l\'autre côté en sautant loin : en bas, ce sont des fers à béton.'],
        alt: ['Patience sur les palettes : une à la fois, quand l\'écart est petit.'] },
    },
    teach: {
      title: 'Le devis',
      text: "Un devis est une proposition écrite envoyée au client AVANT le travail : la description précise de ce qui sera fait, le prix (détaillé), le délai, et les conditions de paiement (par exemple un acompte au début). Signé, il protège les deux parties : chacun sait ce qui a été promis.",
      q: { question: 'Que doit contenir un devis ?', options: ['Le travail prévu, le prix et le délai', 'Uniquement le prix total', 'Le mot de passe du site', 'La liste des concurrents'], answer: 0,
        explain: 'Un devis décrit ce qui sera fait, pour combien et pour quand, avant de commencer.' },
    },
    build: L,
  });
})();

/* ---------- 5-3 : Le prix juste (Romeo) ---------- */
(function () {
  const L = OT.mkLevel(74, 12);
  L.rect(1, 0, 72, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'romeo');
  L.sign(7, 1, 'PRIX = COÛT + MARGE : IL FAUT 9 PIÈCES');
  // la route, avec un camion (plus long : on saute plus tôt)
  L.traffic(1, 9, 26, -5.5, [CAR(0, 3)]);
  L.rect(14, 2, 15, 2, '#').rect(22, 2, 23, 2, '#');
  L.coin(14, 4).coin(22, 4).coin(18, 3).coin(27, 3);
  // le ressort vers les pièces du toit
  L.spring(29, 1).coin(29, 4).coin(29, 5);   // deux pièces sur le trajet du ressort
  L.rect(32, 4, 37, 4, '#');
  L.coins(32, 35, 6);
  L.check(38, 1);
  // l'ascenseur vers la terrasse
  L.plat(41, 0, 'V', 4.4);
  L.rect(43, 4, 48, 4, '#');
  L.coins(44, 47, 6);
  L.rumeur(50, 1, 'Garde ta marge pour toi : prends moins de pièces, le client ne verra rien.');
  L.rect(53, 1, 54, 1, '^');
  L.laser(58, 1, 58, 4, { period: 2.2, on: 0.5 });
  L.door(68, 1, { needsCoins: 9, label: 'PRIX JUSTE' });
  L.box(31, 1); L.set(48, 5, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W5.push({
    title: 'Le prix juste', par: 26, goal: 'Ramasse au moins 9 pièces : c\'est le prix juste pour ouvrir la porte.', lesson: 'Fixer son prix', tone: 'puzzle',
    fragment: '« Romeo m\'a appris à ne pas brader mon travail. Un prix trop bas, c\'est un travail qui ne dure pas. »',
    intro: [['romeo', 'Ton prix, c\'est ce que ça te coûte, plus ta marge. Ici, la porte ne s\'ouvre qu\'avec le prix juste : 9 pièces.']],
    dialogs: {
      romeo: { lines: ['Les voitures arrivent vite : saute par-dessus, ou attends sous un abribus.', 'Le ressort t\'envoie sur le toit. L\'ascenseur, sur la terrasse. Les pièces sont là-haut.'],
        alt: ['Compte tes pièces en haut de l\'écran. S\'il en manque, la porte te repousse.'] },
    },
    teach: {
      title: 'Fixer son prix',
      text: "Pour fixer un prix, on part du coût de revient (son temps, ses outils, l'hébergement, le transport…), puis on ajoute une marge pour gagner sa vie et investir. Si un site te coûte 60 000 FCFA à produire et que tu veux 25 % de marge : 60 000 + 15 000 = 75 000 FCFA. Vendre en dessous du coût, c'est perdre de l'argent à chaque client.",
      q: { question: 'Un site te coûte 60 000 FCFA. Avec 25 % de marge, quel est ton prix ?', options: ['75 000 FCFA', '60 025 FCFA', '85 000 FCFA', '45 000 FCFA'], answer: 0,
        explain: '25 % de 60 000 = 15 000 ; 60 000 + 15 000 = 75 000 FCFA.' },
    },
    build: L,
  });
})();

/* ---------- 5-4 : Le budget (Oncle Patou et sa femme) ---------- */
(function () {
  const L = OT.mkLevel(74, 11);
  L.rect(1, 0, 72, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'patou').npc(6, 1, 'tante');
  L.sign(8, 1, 'REVENUS − DÉPENSES = ÉPARGNE');
  // le marché : tapis roulants et caisses (certaines cachent des pièces, d'autres des pics)
  L.belt(10, 17, 0, 1);
  L.set(14, 1, 'H');
  L.box(19, 1);
  L.belt(21, 29, 0, -1);
  L.set(25, 1, 'H');
  L.box(31, 1);
  L.coins(22, 24, 3).coin(14, 3);
  L.check(33, 1);
  L.rumeur(34, 1, 'L\'épargne, c\'est ce qui reste à la fin du mois. S\'il reste quelque chose.');
  // la rue
  L.traffic(1, 37, 58, -5.5, [CAR(0), CAR(12, 2.5)]);
  L.rect(43, 2, 44, 2, '#').rect(51, 2, 52, 2, '#');
  L.coin(43, 4).coin(51, 4);
  L.set(62, 1, 'H');
  L.box(65, 1);
  L.door(69, 1);
  W5.push({
    title: 'Le budget', par: 22, goal: 'Traverse le marché et la rue. Méfie-toi des caisses… pas de toutes.', lesson: 'Le budget et l\'épargne', tone: 'troll',
    fragment: '« Ma tante m\'a dit : paie-toi d\'abord. Mets de côté, puis dépense ce qui reste. Pas l\'inverse. »',
    intro: [['patou', 'Tu gagnes ton propre argent maintenant ? Alors écoute ta tante, elle sait compter mieux que moi.'], ['tante', 'Revenus moins dépenses, ça donne ce que tu peux épargner. Et l\'épargne, on la met de côté en premier.']],
    dialogs: {
      patou: { lines: ['Au marché, les caisses se ressemblent. Certaines mordent, d\'autres cachent une pièce. Comme à l\'atelier, tu te souviens ?'],
        alt: ['Saute par-dessus les caisses posées sur les tapis : le tapis t\'y pousse tout seul.'] },
      tante: { lines: ['Si tu gagnes 100 000 et que tu dépenses 80 000, tu peux épargner 20 000. Simple.', 'Dans la rue, attends sous les abribus si tu as peur des voitures.'],
        alt: ['Mange avant de traverser la rue. Ça ne t\'aidera pas, mais ça me rassure.'] },
    },
    teach: {
      title: 'Le budget et l\'épargne',
      text: "Un budget compare les revenus et les dépenses d'un mois. Épargne possible = revenus − dépenses. La bonne habitude : « se payer en premier » — mettre l'épargne de côté dès qu'on est payé, puis vivre avec le reste. Pour une petite entreprise, on sépare aussi l'argent de l'activité et l'argent personnel.",
      q: { question: 'Tu gagnes 100 000 FCFA et tu dépenses 80 000 FCFA dans le mois. Combien peux-tu épargner ?', options: ['20 000 FCFA', '180 000 FCFA', '80 000 FCFA', 'Rien du tout'], answer: 0,
        explain: '100 000 − 80 000 = 20 000 FCFA.' },
    },
    build: L,
  });
})();

/* ---------- 5-5 : Le planning (Tony) ---------- */
(function () {
  const L = OT.mkLevel(74, 14);
  L.rect(1, 0, 72, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'tony');
  L.sign(6, 1, 'ÉTAPE 1 → ÉTAPE 2 → ÉTAPE 3 → LIVRAISON');
  const row = (a, b, y) => { const c = []; for (let x = a; x <= b; x++) c.push([x, y]); return c; };
  // jalon 1 : un pont
  L.rect(10, 0, 18, 0, ' ');
  L.compile(8, 1, row(10, 18, 0), { g: 0, label: 'ÉTAPE 1', rate: 0.12, say: 'Étape 1 lancée.', done: 'Étape 1 terminée.' });
  // jalon 2 : un pont sous des fils électriques (pas de saut)
  L.rect(22, 0, 30, 0, ' ');
  L.compile(20, 1, row(22, 30, 0), { g: 1, label: 'ÉTAPE 2', rate: 0.12, say: 'Étape 2 lancée.', done: 'Étape 2 terminée.' });
  L.laser(22, 3, 30, 3, { period: 1, on: 1 });
  L.coin(14, 3);
  L.check(32, 1);
  L.rumeur(33, 1, 'Le planning ? On verra au fur et à mesure.');
  // jalon 3 : l'escalier vers le toit
  L.compile(34, 1, [[36, 1], [37, 1], [39, 3], [40, 3], [42, 5], [43, 5]], { g: 2, label: 'ÉTAPE 3', rate: 0.15, say: 'Étape 3 lancée.', done: 'Étape 3 terminée.' });
  L.rect(38, 1, 55, 1, '^');
  L.rect(45, 5, 52, 5, '#');
  L.coins(46, 51, 7);
  // livraison : la rue
  L.traffic(1, 59, 67, -5, [CAR(0)]);
  L.door(71, 1, { label: 'LIVRAISON' });
  L.box(45, 6); L.set(52, 6, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W5.push({
    title: 'Le planning', par: 26, goal: 'Lance chaque étape dans l\'ordre, attends qu\'elle soit finie, puis passe à la suivante.', lesson: 'Le planning', tone: 'puzzle',
    fragment: '« Tony m\'avait appris à coder. Il m\'a aussi appris à finir : une étape après l\'autre. »',
    intro: [['tony', 'Un projet tenu, c\'est un projet découpé en étapes, avec une date pour chacune. Ici, chaque étape construit un morceau du chemin.']],
    dialogs: {
      tony: { lines: ['Appuie sur ÉTAPE 1, attends la fin, avance. Puis ÉTAPE 2, puis ÉTAPE 3.', 'Sur le deuxième pont, il y a des fils au-dessus de ta tête : pas de saut.'],
        alt: ['Pour l\'escalier, attends que les six blocs soient là. En dessous, ce sont des pics.'] },
    },
    teach: {
      title: 'Le planning et les jalons',
      text: "On découpe un projet en étapes (des « jalons ») avec une date pour chacune : maquette, développement, tests, mise en ligne. On voit vite si on est en retard, on peut prévenir le client à temps, et on ne laisse pas tout pour la dernière semaine. Un outil simple suffit : une liste de tâches avec des dates.",
      q: { question: 'Pourquoi découper un projet en étapes datées ?', options: ['Pour suivre l\'avancement et tenir le délai', 'Pour que le projet coûte plus cher', 'Pour éviter de parler au client', 'Ça ne sert à rien'], answer: 0,
        explain: 'Les jalons permettent de voir où on en est et de réagir avant qu\'il soit trop tard.' },
    },
    build: L,
  });
})();

/* ---------- 5-6 : Le portfolio (course avec Yannick) ---------- */
(function () {
  const L = OT.mkLevel(76, 12);
  L.rect(1, 0, 74, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'yannick');
  L.rival(4.2, 'yannick', [[2, 1], [71, 1]]);
  L.sign(6, 1, 'MONTRE CE QUE TU SAIS FAIRE');
  // les échafaudages qui cèdent
  L.rect(9, 0, 16, 0, '=');
  L.coins(10, 15, 2);
  // le ressort au-dessus du mur
  L.spring(19, 1);
  L.rect(21, 1, 21, 4, '#');
  L.coin(20, 6);
  // la rue
  L.traffic(1, 26, 44, -6, [CAR(0), CAR(10, 2.5)]);
  L.rect(31, 2, 32, 2, '#').rect(38, 2, 39, 2, '#');
  L.check(48, 1);
  L.rumeur(49, 1, 'Un portfolio ? Personne ne regarde ça.');
  // les palettes
  L.rect(50, 0, 62, 0, ' ');
  L.plat(52, 0, 'M', 2, { speed: 1.4 }).plat(58, 0, 'M', 2, { speed: 1.4, phase: 1.2 });
  L.coin(56, 3);
  L.npc(65, 1, 'brayan');
  L.door(71, 1);
  L.set(23, 1, 'H'); L.box(68, 1);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W5.push({
    title: 'Le portfolio', par: 22, goal: 'Course amicale contre la copie de Yannick : arrive à la SORTIE avant elle.', lesson: 'Le portfolio', tone: 'épique',
    fragment: '« Yannick n\'était plus mon rival. C\'était le premier à partager mes projets. »',
    intro: [['yannick', 'Hé, l\'ancien rival ! On refait une course, pour le plaisir ? Ma copie part maintenant.'], ['yannick', 'Et après, tu me montres ton portfolio. Je veux voir tout ce que tu as construit.']],
    dialogs: {
      yannick: { lines: ['Un portfolio, c\'est la vitrine de tes projets : des captures, des liens, ce que tu as fait.', 'Le ressort t\'envoie par-dessus le mur.'],
        alt: ['Ne t\'arrête pas sur les échafaudages : ils cèdent derrière toi.'] },
      brayan: { lines: ['Mets ton portfolio en ligne : je t\'aide à l\'héberger.'], alt: ['La porte est juste là.'] },
    },
    teach: {
      title: 'Le portfolio',
      text: "Un portfolio présente tes meilleures réalisations : pour chaque projet, le problème du client, ce que tu as fait, une capture et un lien. C'est la preuve de ce que tu sais faire, bien plus convaincante qu'une liste de compétences. Mieux vaut cinq projets soignés que vingt projets bâclés.",
      q: { question: 'À quoi sert un portfolio ?', options: ['À montrer ses réalisations à de futurs clients', 'À stocker ses mots de passe', 'À remplacer un devis', 'À calculer ses impôts'], answer: 0,
        explain: 'Le portfolio montre concrètement ce que tu as déjà réalisé.' },
    },
    build: L,
  });
})();

/* ---------- 5-7 : En ligne (Brayan) ---------- */
(function () {
  const L = OT.mkLevel(76, 12);
  L.rect(1, 0, 74, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'brayan');
  L.sign(6, 1, 'NOM DE DOMAINE + HÉBERGEMENT = EN LIGNE');
  // le métro (portails) sous la ville
  L.rect(10, 1, 10, 10, '#');
  L.portals(8, 1, 12, 1, { label: 'MÉTRO' });
  L.laser(15, 1, 15, 4, { period: 2.4, phase: 0, on: 0.45 });
  L.laser(18, 1, 18, 4, { period: 2.4, phase: 0.8, on: 0.45 });
  L.laser(21, 1, 21, 4, { period: 2.4, phase: 1.6, on: 0.45 });
  L.coins(16, 20, 3);
  L.rect(25, 1, 25, 10, '#');
  L.portals(23, 1, 27, 1, { label: 'MÉTRO' });
  L.check(28, 1);
  L.rumeur(29, 1, 'Pour mettre un site en ligne, il suffit de l\'enregistrer sur ton ordinateur.');
  // la porte « 404 » qui déménage (souvenir du Monde 2)
  L.rect(40, 1, 41, 2, '#');
  L.rect(43, 4, 52, 4, '#');
  L.coins(45, 48, 6);
  L.rect(53, 1, 57, 1, '^');
  L.traffic(1, 59, 66, -5, [CAR(0)]);
  L.door(35, 1, { hops: [[49, 5], [63, 1], [71, 1]], label: 'MON SITE' });
  L.box(32, 1); L.set(50, 1, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W5.push({
    title: 'En ligne', par: 26, goal: 'Prends le métro sous la ville, puis rattrape la porte « MON SITE » qui change d\'adresse.', lesson: 'Mettre un site en ligne', tone: 'troll',
    fragment: '« Le jour où mon site a été en ligne, je l\'ai rechargé cent fois. Juste pour le voir exister. »',
    intro: [['brayan', 'Pour exister sur Internet, il faut deux choses : un nom de domaine (l\'adresse) et un hébergement (le serveur). Je m\'occupe du serveur.']],
    dialogs: {
      brayan: { lines: ['Les portails du métro passent sous les murs. Ensuite, les lasers clignotent en vague : suis le rythme.', 'Ta porte va changer d\'adresse trois fois. Comme au temps du Monde 2.'],
        alt: ['La dernière fois, elle s\'arrête au bout de la rue. Attention aux voitures.'] },
    },
    teach: {
      title: 'Mettre un site en ligne',
      text: "Pour qu'un site soit visible par tous, il faut : un nom de domaine (l'adresse, comme monsite.cm, loué chaque année auprès d'un registraire) et un hébergement (un serveur allumé en permanence qui stocke et envoie les pages). On relie les deux avec le DNS, l'annuaire d'Internet qui traduit le nom en adresse IP.",
      q: { question: 'Que faut-il pour mettre un site en ligne ?', options: ['Un nom de domaine et un hébergement', 'Seulement un ordinateur allumé chez soi', 'Une imprimante', 'Un compte sur un réseau social'], answer: 0,
        explain: 'Le nom de domaine donne l\'adresse, l\'hébergement fournit le serveur ; le DNS les relie.' },
    },
    build: L,
  });
})();

/* ---------- 5-8 : La maintenance (Kellia et Junior) ---------- */
(function () {
  const L = OT.mkLevel(76, 12);
  L.rect(1, 0, 74, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'kellia');
  L.sign(6, 1, 'UN SITE, ÇA S\'ENTRETIENT');
  // le vieux pont tombe en morceaux…
  L.rect(9, 0, 18, 0, '=');
  L.coins(10, 17, 2);
  // …une partie s'est déjà effondrée : on la répare
  L.rect(21, 0, 29, 0, ' ');
  const rep = []; for (let x = 21; x <= 29; x++) rep.push([x, 0]);
  L.compile(19, 1, rep, { g: 0, label: 'RÉPARER', rate: 0.12, say: 'Réparation en cours…', done: 'Réparé !' });
  L.coin(25, 3);
  L.npc(31, 1, 'junior');
  L.check(32, 1);
  // l'usine de sauvegarde : tapis et presses
  L.belt(35, 42, 0, -1);
  L.piston(37, 0).piston(41, 0.95);
  L.rumeur(44, 1, 'Les sauvegardes, c\'est pour les gens qui font des erreurs.');
  L.belt(46, 53, 0, 1);
  L.rect(54, 0, 56, 0, ' ');
  L.rect(57, 1, 58, 1, '^');
  L.laser(63, 1, 63, 4, { period: 2.4, on: 0.5 });
  L.coin(55, 3);
  L.door(70, 1);
  L.set(34, 1, 'H'); L.box(61, 1);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W5.push({
    title: 'La maintenance', par: 24, goal: 'Le vieux pont s\'effondre : traverse-le vite, répare la partie cassée, puis passe l\'usine.', lesson: 'La maintenance', tone: 'troll',
    fragment: '« Livrer un site, ce n\'est pas la fin. C\'est le début de son entretien. »',
    intro: [['kellia', 'Un site qu\'on n\'entretient pas finit par tomber en morceaux. Comme ce pont.']],
    dialogs: {
      kellia: { lines: ['Ne t\'arrête pas sur le vieux pont. Ensuite, marche sur RÉPARER et attends la fin des travaux.'],
        alt: ['Cours sur le vieux pont, puis attends devant le trou que la réparation soit finie.'] },
      junior: { lines: ['Sur le premier tapis, tu avances contre le courant, sous les presses. Passe juste après qu\'elles remontent.', 'Le deuxième tapis t\'aide : laisse-le t\'emmener et saute au bout.'],
        alt: ['Au bout du deuxième tapis, saute tout de suite : le trou, puis des pics.'] },
    },
    teach: {
      title: 'La maintenance',
      text: "Un site en ligne demande de l'entretien : mises à jour de sécurité, sauvegardes régulières (copies du site et de la base de données, gardées ailleurs), surveillance des pannes, renouvellement du nom de domaine. Beaucoup de freelances proposent un contrat de maintenance mensuel : c'est aussi un revenu régulier.",
      q: { question: 'Pourquoi faire des sauvegardes régulières d\'un site ?', options: ['Pour pouvoir le restaurer en cas de problème', 'Pour qu\'il s\'affiche plus vite', 'Pour changer ses couleurs', 'Ça ne sert à rien si le site marche'], answer: 0,
        explain: 'Une panne, un piratage, une erreur : avec une sauvegarde récente, on restaure le site.' },
    },
    build: L,
  });
})();

/* ---------- 5-9 : La réputation (Zeus et Ange) ---------- */
(function () {
  const L = OT.mkLevel(78, 12);
  L.rect(1, 0, 76, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'zeus').npc(6, 1, 'ange');
  L.sign(8, 1, 'AVIS CLIENTS ★★★★★ : CROIS LES PANNEAUX, PAS LES RUMEURS');
  // la ville des rumeurs : chacune ment
  L.rumeur(12, 1, 'Ce mur est solide. Fais demi-tour.');
  L.rect(14, 1, 14, 10, 'o');
  L.rumeur(18, 1, 'Le sol devant toi est en béton armé.');
  L.set(20, 0, 'f').set(21, 0, 'f');
  L.sign(17, 1, 'ATTENTION : SOL ABÎMÉ');
  L.rumeur(25, 1, 'La sortie, c\'est cette porte-là.');
  L.fakeDoor(27, 1, 'SORTIE');
  L.coins(19, 22, 3);
  L.check(31, 1);
  // ceux qui te recommandent t'ouvrent le chemin
  L.npc(32, 1, 'christine');
  L.button(34, 1, true);
  L.gate(37, 1, 5);
  L.traffic(1, 40, 55, -5, [CAR(0), CAR(9, 3)]);
  L.rect(46, 2, 47, 2, '#').rect(53, 2, 54, 2, '#');
  L.coin(46, 4).coin(53, 4);
  L.rumeur(60, 1, 'On dit que tu vas échouer.');
  L.rect(62, 1, 63, 1, '^');
  L.npc(66, 1, 'tony');
  L.door(73, 1);
  L.box(69, 1); L.set(76, 1, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W5.push({
    title: 'La réputation', par: 24, goal: 'Les rumeurs mentent, les panneaux disent vrai. Atteins la SORTIE.', lesson: 'La réputation', tone: 'troll',
    fragment: '« On dit beaucoup de choses sur toi quand tu te lances. Les clients satisfaits, eux, disent la vérité. »',
    intro: [['zeus', 'La Rumeur est partout dans cette ville. Elle raconte n\'importe quoi sur toi.'], ['ange', 'Ne l\'écoute pas. Lis les panneaux, écoute les gens qui te connaissent vraiment.']],
    dialogs: {
      zeus: { lines: ['Tout ce que dit la Rumeur ici est faux. Fais exactement l\'inverse.'], alt: ['Le mur se traverse, le sol est abîmé, la porte est fausse. Voilà.'] },
      ange: { lines: ['Une bonne réputation se construit lentement, un client satisfait après l\'autre.'], alt: ['Saute par-dessus le sol abîmé et par-dessus la fausse porte.'] },
      christine: { lines: ['Je recommande ton travail à tout le monde. Ce bouton ouvre la barrière : c\'est ma façon de t\'aider.'], alt: ['Les voitures : attends-les sous l\'abribus si tu hésites.'] },
      tony: { lines: ['Tu sais ce qui t\'attend au centre de la ville ? The Core. Et elle, la Rumeur, en entier.'], alt: ['On est tous avec toi.'] },
    },
    teach: {
      title: 'La réputation',
      text: "Pour un freelance, la réputation vaut plus que toute publicité : un client satisfait en parle autour de lui, laisse un avis, revient. Elle se construit en tenant ses promesses (délais, qualité, communication) et se perd vite. Les rumeurs passent ; le travail bien fait reste.",
      q: { question: 'Quelle est la meilleure publicité pour un freelance ?', options: ['Un client satisfait qui le recommande', 'Des avis inventés', 'Baisser ses prix sans arrêt', 'Critiquer ses concurrents'], answer: 0,
        explain: 'La recommandation d\'un client content est la publicité la plus crédible.' },
    },
    build: L,
  });
})();

/* ---------- 5-10 : FINAL — The Core (La Rumeur) ---------- */
(function () {
  const L = OT.mkLevel(36, 14);
  L.rect(1, 0, 34, 0, 'D');                // le sol du doute
  L.rect(3, 2, 7, 2, '#');                 // A : dessus à 3
  L.rect(9, 4, 12, 4, '#');                // B : dessus à 5
  L.rect(15, 2, 20, 2, '#');               // C : dessus à 3
  L.rect(22, 4, 25, 4, '#');               // D : dessus à 5
  L.rect(27, 2, 31, 2, '#');               // E : dessus à 3
  L.coin(4, 4).coin(10, 6).coin(24, 6).coin(30, 4);
  L.start(1, 1);
  W5.push({
    title: 'The Core', par: 90, goal: 'Le dernier combat : trouve les vérités et fais taire La Rumeur.', lesson: 'Les objectifs SMART', tone: 'épique', boss: 'rumeur',
    fragment: '« Au cœur de tout, il n\'y avait pas de monstre. Juste le doute. Et je savais maintenant comment le faire taire. »',
    intro: [
      ['rumeur', 'On dit que tu n\'y arriveras pas. On dit que tu vas abandonner. On dit…'],
      ['christine', 'Ne l\'écoute pas. On est tous là.'],
      ['zeus', 'Vas-y, frère. Montre-lui qui tu es.'],
    ],
    dialogs: {},
    teach: {
      title: 'Les objectifs SMART',
      text: "Un objectif utile est SMART : Spécifique (précis), Mesurable (on sait quand il est atteint), Atteignable, Réaliste, et Temporel (avec une échéance). « Réussir » n'est pas un objectif. « Signer 3 clients pour des sites vitrines d'ici le 30 juin » en est un.",
      q: { question: 'Dans un objectif SMART, que signifie le T ?', options: ['Temporel : il a une échéance', 'Terminé', 'Technique', 'Très ambitieux'], answer: 0,
        explain: 'T comme Temporel : un objectif SMART a une date limite.' },
    },
    build: L,
  });
})();

OT.WORLD5.bossText = {
  name: 'La Rumeur', color: '#b78cff',
  phases: [
    { name: 'Les mensonges', say: 'QUATRE PORTES. UNE SEULE DIT VRAI. LAQUELLE ?',
      help: 'Une seule porte est vraie : elle bourdonne, fait vibrer la manette et sa lumière respire. Les fausses explosent. 3 fois. Évite les « ? ».',
      tell: [['tony', 'Quatre portes, une seule vraie. Écoute : elle bourdonne, et ta manette vibre plus fort près d\'elle.'], ['tony', 'Les « ? » qu\'elle lance sont des rumeurs : ne te laisse pas toucher.']] },
    { name: 'Le doute', say: 'ET SI LE SOL SE DÉROBAIT SOUS TES PIEDS ?',
      help: 'Le sol se fissure (rouge) puis disparaît quelques secondes. Ramasse les 3 vérités sur les plateformes.',
      tell: [['christine', 'Le sol devient rouge juste avant de disparaître. Bouge dès que tu le vois.'], ['christine', 'Ramasse les trois vérités sur les plateformes. Elles brillent.']] },
    { name: 'La vérité', say: 'TU NE M\'ATTEINDRAS JAMAIS.',
      help: 'Allume les 3 interrupteurs (en bas) presque en même temps : son bouclier tombe et elle descend. Monte sur la plateforme du milieu et saute pour la toucher. 2 fois.',
      tell: [['zeus', 'Trois interrupteurs, en bas. Allume-les tous, vite : son bouclier tombera et elle descendra.'], ['zeus', 'Alors monte sur la plateforme du milieu et saute-lui dessus. À deux, c\'est plus facile : je ne dis pas ça pour rien.']] },
  ],
  end: 'ON DIT QUE… … …',
};

OT.CHAPTERS[4] = {
  n: 5, title: 'OSWEL City — Construire',
  paragraphs: [
    "Un jour, j'ai arrêté d'attendre qu'on me donne une place. J'ai décidé de la construire.",
    "Des sites pour les commerces de Douala. Un client, puis deux, puis ceux qu'ils m'ont recommandés. J'ai appris à écouter, à écrire un devis, à fixer un prix juste, à tenir un planning.",
    "Christine, Franck, Romeo, Oncle Patou et sa femme, Tony, Yannick, Brayan, Kellia, Junior, Ange, Zeus : ils étaient tous là, d'une façon ou d'une autre.",
    "Et puis il y a eu la Rumeur. Celle qui dit que tu n'y arriveras pas, que c'est trop dur, que ce n'est pas pour toi. Elle parle fort. Mais elle ne construit rien.",
    "La Forge m'a appris à comprendre. Le Code, à créer. Le Laboratoire, à réfléchir. Le Nexus, à imaginer. Et OSWEL City, à oser.",
  ],
  last: 'Ce n\'est pas la fin de l\'histoire. C\'est la fin du début.',
};

OT.WORLD5.chapter = OT.CHAPTERS[4];
OT.WORLD5.intro = [
  { text: 'Douala. Le soir tombe sur la ville.', cam: { x: 40, y: 7, z: 36 } },
  { text: 'Chaque projet est un immeuble qu\'on construit étage par étage.', cam: { x: 22, y: 4, z: 22 } },
  { text: 'Ici, Oswel ne cherche plus sa place. Il la construit.', cam: { x: 10, y: 3, z: 15 } },
  { text: 'Bienvenue à OSWEL City.', cam: { x: 4, y: 2.5, z: 11 } },
];
OT.WORLD_DATA[5] = OT.WORLD5;
OT.WORLDS.forEach((w) => (w.open = !!OT.WORLD_DATA[w.id]));
OT.CREDITS = ['Oswel', 'Christine', 'Franck', 'Romeo', 'Oncle Patou', 'La femme de Patou', 'Tony', 'Yannick', 'Brayan', 'Samuel', 'Peck', 'Youmbi',
  'Ange', 'Dimi', 'Annie', 'Reine', 'Tsague Junior', 'Junior le Gabonais', 'Kellia', 'Francheska', 'Danie Manon', 'Sandex', 'Fredo', 'Lady Annee',
  'Valdes', 'Win Black', 'Reine Damso', 'Belvianne', 'Charly', 'Ashley', 'Zeus', 'et La Rumeur, qui n\'a jamais eu raison'];
