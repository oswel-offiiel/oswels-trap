/* =====================================================================
   OSWEL'S TRAP — world2.js
   MONDE 2 : LE CODE — « Apprendre à créer »
   Après l'atelier, l'écran. Tony apprend à Oswel à parler aux machines
   en leur écrivant. Yannick est son rival, Brayan, Samuel, Peck et
   Youmbi son équipe. Chaque niveau apprend une vraie notion de
   programmation ; le quiz de fin de monde reprend les 10 leçons.

   Nouveaux pièges (voir la légende dans data.js) :
     X glitch · T balise · R glace · Y ressort · J pics-événement
     P pont-événement · C blocs construits par une fonction
     + liens (téléportation), fenêtres mobiles, ascenseurs, porte 404.
   ===================================================================== */

window.OT = window.OT || {};

OT.WORLD2 = { id: 2, name: 'Le Code', motto: 'Apprendre à créer', levels: [], theme: 'code' };
const W2 = OT.WORLD2.levels;

/* ---------- 2-1 : Bonjour, monde ---------- */
(function () {
  const L = OT.mkLevel(68, 10);
  L.rect(1, 0, 66, 0, '#');
  L.start(2, 1);
  L.npc(5, 1, 'tony').npc(8, 1, 'christine');
  L.sign(11, 1, 'BONJOUR, MONDE !');
  L.rect(15, 0, 17, 0, ' ').coins(15, 17, 3);                // premier trou
  L.sign(20, 1, '▶ DÉMARRER');
  L.rect(22, 0, 24, 0, '~').trigger(22, 1, 'drop').coins(22, 24, 2);   // le bouton Démarrer… s'effondre
  L.rect(29, 0, 41, 0, ' ');                                  // un grand vide…
  L.plat(31, 0, 'M', 2, { speed: 1.3 }).plat(37, 0, 'M', 2, { speed: 1.3, phase: 1.2 });   // …et deux fenêtres qui bougent
  L.coin(35, 3);
  L.check(43, 1);
  L.rumeur(44, 1, 'Pour sortir, prends la porte SORTIE. Tout le monde sait ça.');
  L.rect(47, 1, 48, 1, '#');                                  // marche
  L.rect(49, 3, 56, 3, '#');                                  // corniche (en haut : la fausse sortie)
  L.coins(50, 52, 5);
  L.fakeDoor(54, 4, 'SORTIE');
  L.sign(58, 1, 'POUR QUITTER : ✕');
  L.set(60, 1, '^');
  L.door(63, 1, { label: '✕ FERMER' });
  L.box(25, 1); L.set(47, 2, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W2.push({
    title: 'Bonjour, monde', par: 16, goal: 'Quitte le programme : trouve le bouton ✕ FERMER.', lesson: 'Le premier programme', tone: 'troll',
    fragment: '« Mon premier programme disait bonjour. Le deuxième ne disait plus rien. »',
    intro: [['tony', 'Bienvenue de l\'autre côté de l\'écran, Oswel. Ici, on ne démonte rien : on écrit.'], ['echo', 'Et si on écrit mal ?'], ['tony', 'Ça plante ? On recommence. Comme d\'habitude.']],
    dialogs: {
      tony: { lines: ['Un ordinateur ne comprend que des 0 et des 1. Tout le reste, c\'est nous qui l\'avons inventé par-dessus.', 'Un conseil : sur un écran, tout ce qui brille n\'est pas un bouton.'],
        alt: ['Les fenêtres bougent toutes seules. Attends qu\'elles viennent à toi, ne leur cours pas après.', 'Et pour quitter un programme, on ne cherche pas une porte : on le ferme.'] },
      christine: { lines: ['Encore devant l\'écran ? Hier c\'était des boulons, aujourd\'hui des lignes de code.', 'Tant que tu finis ce que tu commences, je ne dis rien.'],
        alt: ['Tu es tombé combien de fois ? Peu importe. Relève-toi, ça, tu sais faire.'] },
    },
    teach: {
      title: 'Les bits et les octets',
      text: "Un ordinateur ne manipule que des 0 et des 1 : ce sont les bits. On les regroupe par 8 pour former un octet. Avec 8 bits, on peut écrire 2⁸ = 256 combinaisons différentes (de 00000000 à 11111111), par exemple un nombre de 0 à 255 ou un caractère.",
      q: { question: 'Combien de valeurs différentes peut représenter un octet (8 bits) ?', options: ['256', '8', '16', '1 000'], answer: 0,
        explain: '2 × 2 × 2 × 2 × 2 × 2 × 2 × 2 = 2⁸ = 256 combinaisons.' },
    },
    build: L,
  });
})();

/* ---------- 2-2 : La toile (les liens) ---------- */
(function () {
  const L = OT.mkLevel(72, 11);
  L.rect(1, 0, 70, 0, '#');
  // quatre « pages » séparées par des murs : on passe de l'une à l'autre par des LIENS
  L.rect(15, 1, 15, 9, '#').rect(33, 1, 33, 9, '#').rect(51, 1, 51, 9, '#');
  // Page 1 : index.html
  L.start(2, 1);
  L.npc(5, 1, 'yannick');
  L.sign(8, 1, 'LIS L\'ADRESSE AVANT DE CLIQUER');
  L.link(10, 1, 2, 1, 'acceuil.html');          // faute de frappe → retour au début
  L.coin(10, 3);
  L.link(13, 1, 17, 1, 'accueil.html', true);
  // Page 2 : accueil.html
  L.rect(20, 0, 22, 0, ' ').coins(20, 22, 3);
  L.set(25, 1, '^');
  L.rect(28, 2, 31, 2, '#');                     // corniche
  L.link(30, 3, 35, 1, 'contact.html', true);
  L.coin(29, 5);
  L.link(31, 1, 17, 1, 'contact.htm1');          // le « 1 » à la place du « l » → page rechargée
  // Page 3 : contact.html — un pont de pixels corrompus qui s'effondre
  L.check(35, 1);
  L.rect(38, 0, 45, 0, '=');
  L.coins(39, 44, 2);
  L.rumeur(46, 1, 'Le premier lien est toujours le bon.');
  L.link(48, 1, 35, 1, 'proj3t.html');
  L.coin(48, 3);
  L.link(50, 1, 53, 1, 'projet.html', true);
  // Page 4 : projet.html — page en construction
  L.npc(55, 1, 'samuel');
  L.rect(59, 0, 63, 0, '=');
  L.coins(59, 63, 3);
  L.door(68, 1);
  L.set(58, 1, 'H'); L.box(64, 1);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W2.push({
    title: 'La toile', par: 22, goal: 'Traverse les pages par les bons liens jusqu\'à la SORTIE.', lesson: 'Le Web et ses liens', tone: 'troll',
    fragment: '« Sur le Web, une seule lettre de travers, et tu te retrouves ailleurs. »',
    intro: [['yannick', 'Alors c\'est toi, le mécanicien qui veut coder ? On verra qui finit le premier.']],
    dialogs: {
      yannick: { lines: ['Les pages sont reliées par des liens. Tu touches un lien, tu changes de page.', 'Mais un lien mal écrit t\'envoie n\'importe où. Moi, je ne fais jamais de fautes. Presque jamais.'],
        alt: ['Bon, d\'accord : regarde bien chaque lettre. « accueil », pas « acceuil ». Ne le répète à personne.'] },
      samuel: { lines: ['Cette page est encore en construction. Le sol ne tient pas longtemps : ne t\'arrête pas.'],
        alt: ['Cours sans t\'arrêter sur les pixels rouges. Ils tombent juste derrière toi.'] },
    },
    teach: {
      title: 'Le client et le serveur',
      text: "Quand tu tapes une adresse (une URL) dans ton navigateur, celui-ci — le client — envoie une requête à un ordinateur distant : le serveur. Le serveur cherche la page demandée et la renvoie, puis le navigateur l'affiche. Les liens hypertexte relient les pages entre elles : c'est la « toile » du Web.",
      q: { question: 'Quand tu ouvres une page web, qui t\'envoie cette page ?', options: ['Le serveur', 'Le clavier', 'La carte graphique', 'Le câble HDMI'], answer: 0,
        explain: 'Ton navigateur (le client) demande la page, le serveur la renvoie.' },
    },
    build: L,
  });
})();

/* ---------- 2-3 : Les balises ---------- */
(function () {
  const L = OT.mkLevel(72, 11);
  L.rect(1, 0, 70, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'tony');
  // 1. <div> … </div> : le pont n'existe que si la balise est ouverte
  L.rect(10, 0, 15, 0, ' ');
  L.tags(10, 15, 0, 'a');
  L.tagOpen(8, 1, 'a', '<div>');
  L.coin(12, 2);
  L.tagClose(17, 1, 'a', '</div>');
  L.rumeur(19, 1, 'Une balise, ça se ferme quand on veut. Ou jamais.');
  // 2. <p> … </p> : un long pont, un trou au milieu, des pics au plafond
  L.rect(22, 0, 35, 0, ' ');
  L.tags(22, 26, 0, 'b').tags(29, 35, 0, 'b');
  L.tagOpen(20, 1, 'b', '<p>');
  L.rect(22, 3, 25, 3, 'W').rect(32, 3, 35, 3, 'W');
  L.coins(27, 28, 3);
  L.tagClose(38, 1, 'b', '</p>');
  L.check(40, 1);
  L.npc(40, 1, 'peck');
  // 3. <ul> … </ul> : un escalier qui n'existe que 7 secondes
  L.tagOpen(43, 1, 'c', '<ul>', 7);
  L.tags(46, 47, 1, 'c').tags(49, 50, 3, 'c').tags(52, 53, 5, 'c');
  L.rect(48, 1, 61, 1, '^');
  L.rect(55, 5, 62, 5, '#');
  L.rect(62, 1, 62, 4, '#');
  L.coin(50, 6);
  L.tagClose(58, 6, 'c', '</ul>');
  L.coin(66, 3);
  L.door(68, 1);
  L.box(36, 1); L.set(45, 1, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W2.push({
    title: 'Les balises', par: 25, goal: 'Ouvre les balises pour faire apparaître les blocs, puis ferme-les pour qu\'ils restent.', lesson: 'Le HTML', tone: 'puzzle',
    fragment: '« J\'ai appris qu\'une balise ouverte doit toujours être fermée. Les promesses aussi. »',
    intro: [['tony', 'Une page web est écrite en HTML, avec des balises. Touche <div> : les blocs apparaissent.'], ['tony', 'Mais seulement quelques secondes. Pour qu\'ils restent, il faut FERMER la balise : touche </div>.']],
    dialogs: {
      tony: { lines: ['<div> ouvre, </div> ferme. Entre les deux, il y a le contenu : ici, ce sont les blocs.', 'Une balise ouverte qui n\'est jamais fermée, c\'est une page cassée.'],
        alt: ['Quand les blocs clignotent, la balise va se refermer toute seule. Dépêche-toi d\'atteindre la balise fermante.'] },
      peck: { lines: ['Le dernier escalier n\'apparaît que 7 secondes. Monte sans t\'arrêter, et ferme </ul> en haut.'],
        alt: ['Saute de marche en marche dès qu\'elles apparaissent. En bas, ce ne sont pas des décorations.'] },
    },
    teach: {
      title: 'Les balises HTML',
      text: "Le HTML décrit le contenu d'une page avec des balises. Une balise ouvrante comme <p> commence un paragraphe, et la balise fermante </p> (avec une barre oblique) le termine. Exemple : <p>Bonjour</p>. On ferme les balises dans l'ordre inverse de leur ouverture.",
      q: { question: 'Comment ferme-t-on la balise <p> ?', options: ['</p>', '<p/>', '<\\p>', '<close p>'], answer: 0,
        explain: 'La balise fermante reprend le nom de la balise, précédé d\'une barre oblique : </p>.' },
    },
    build: L,
  });
})();

/* ---------- 2-4 : Le styliste ---------- */
(function () {
  const L = OT.mkLevel(74, 12);
  L.rect(1, 0, 72, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'youmbi');
  L.sign(7, 1, 'ROUGE = GLACE · BLEU = RESSORT');
  // 1. la glace : on glisse
  L.style(9, 24, 0, 'R');
  L.set(13, 1, '^').set(21, 1, '^');
  L.coin(13, 3).coin(21, 3);
  // 2. le ressort : il fait monter sur la corniche
  L.style(25, 27, 0, 'Y');
  L.rect(29, 1, 29, 2, '#').rect(29, 3, 36, 3, '#');
  L.coin(26, 5).coin(33, 5);
  // 3. le styliste change le CSS…
  L.check(38, 1);
  L.npc(38, 1, 'samuel');
  L.rumeur(40, 1, 'Les blocs bleus te feront monter. Toujours.');
  L.trigger(41, 1, 'swap');
  L.style(44, 45, 0, 'Y');                       // bleus… mais ils deviendront de la glace
  L.rect(46, 3, 48, 3, '#').coins(46, 48, 5);    // appât
  L.style(50, 52, 0, 'R');                       // rouges… mais ils deviendront des ressorts
  L.rect(54, 1, 54, 2, '#').rect(54, 3, 61, 3, '#');
  L.coin(58, 5);
  // 4. la fin : (ressort devenu glace) et des pics juste avant la porte
  L.style(63, 67, 0, 'Y');
  L.set(68, 1, '^');
  L.door(70, 1);
  L.set(29, 4, 'H'); L.box(49, 1);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W2.push({
    title: 'Le styliste', par: 24, goal: 'Glace rouge, ressort bleu… jusqu\'à ce que le CSS change. Atteins la SORTIE.', lesson: 'Le CSS', tone: 'troll',
    fragment: '« Le CSS ne change pas ce que la page dit. Il change ce qu\'elle a l\'air de dire. »',
    intro: [['youmbi', 'Ici, c\'est le CSS qui décide de l\'apparence… et du comportement des blocs. Rouge : ça glisse. Bleu : ça rebondit.']],
    dialogs: {
      youmbi: { lines: ['Sur la glace, lâche la direction bien avant les pics : tu continues de glisser.', 'Les blocs bleus te propulsent en l\'air dès que tu marches dessus.'],
        alt: ['Saute les pics depuis la glace un peu tôt : tu vas loin quand tu glisses.'] },
      samuel: { lines: ['Attention : quelqu\'un modifie la feuille de style en direct. Ce qui était bleu peut devenir rouge.'],
        alt: ['Regarde les couleurs APRÈS le changement, pas avant. Le rouge devenu bleu, c\'est ton ressort.'] },
    },
    teach: {
      title: 'Le CSS',
      text: "Le CSS (feuilles de style) décrit l'apparence d'une page : couleurs, tailles, positions. Une règle CSS a un sélecteur et des déclarations entre accolades. Exemple : p { color: red; } met en rouge le texte de tous les paragraphes.",
      q: { question: 'Quelle règle CSS met en rouge le texte des paragraphes ?', options: ['p { color: red; }', '<p color="red">', 'p = rouge;', 'color(p, red)'], answer: 0,
        explain: 'Sélecteur « p », puis la propriété color avec la valeur red, entre accolades.' },
    },
    build: L,
  });
})();

/* ---------- 2-5 : Ça bouge ! (JavaScript, événements) — course contre Yannick ---------- */
(function () {
  const L = OT.mkLevel(72, 11);
  L.rect(1, 0, 70, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'yannick');
  L.rival(3.8, 'yannick', [[2, 1], [67, 1]]);
  L.sign(6, 1, 'onJump() → ⚠');
  // 1. les pics « événement » : ils sortent quand quelqu'un saute
  L.jumpSpikes(8, 15, 1);
  L.coin(11, 1);   // on la prend en MARCHANT : sauter ici fait sortir les pics
  // 2. le pont « événement » : il disparaît quand quelqu'un saute
  L.rumeur(17, 1, 'Saute sur le pont, c\'est plus rapide.');
  L.rect(19, 0, 27, 0, ' ');
  L.bridge(19, 27, 0);
  L.coins(21, 25, 3);
  // 3. un petit saut… puis surtout plus de saut
  L.check(28, 1);
  L.npc(28, 1, 'peck');
  L.sign(29, 1, 'PETIT SAUT !');
  L.rect(31, 0, 32, 0, ' ');
  L.rect(36, 0, 43, 0, ' ');
  L.bridge(36, 43, 0);
  L.coin(34, 3);
  // 4. pont + pics : on garde les pieds sur terre
  L.rect(47, 0, 52, 0, ' ');
  L.bridge(47, 52, 0);
  L.jumpSpikes(54, 61, 1);
  L.coins(55, 60, 1);   // à prendre en marchant, sans sauter
  L.door(67, 1);
  L.box(33, 1); L.set(46, 1, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W2.push({
    title: 'Ça bouge !', par: 18, goal: 'Quand tu sautes, le niveau réagit. Atteins la SORTIE avant la copie de Yannick.', lesson: 'Le JavaScript', tone: 'troll',
    fragment: '« Une page qui réagit, c\'est une page qui écoute. Moi aussi, j\'ai appris à écouter. »',
    intro: [['yannick', 'Course ! Ma copie contre toi. Elle ne s\'arrête jamais, elle.'], ['yannick', 'Et ici, chaque saut déclenche un événement. Je te laisse découvrir lequel.']],
    dialogs: {
      yannick: { lines: ['Le JavaScript écoute ce que tu fais. Tu sautes ? Il réagit. Pas forcément en ta faveur.'],
        alt: ['D\'accord, un indice : sur le jaune et sur les fentes, on marche. On ne saute pas.'] },
      peck: { lines: ['Le trou suivant se saute, mais tout petit saut : il faut retomber sur le bout de sol, pas sur le pont.', 'Tant que tu es en l\'air, les ponts jaunes n\'existent pas.'],
        alt: ['Appuie très brièvement sur le saut : un saut court, et tu retombes juste avant le pont.'] },
    },
    teach: {
      title: 'Le JavaScript et les événements',
      text: "Le HTML donne le contenu, le CSS l'apparence, et le JavaScript le comportement. Il réagit à des événements : un clic, une touche, un chargement de page… Exemple : bouton.addEventListener('click', ouvrir) exécute la fonction ouvrir à chaque clic sur le bouton.",
      q: { question: 'Quel langage rend une page web interactive dans le navigateur ?', options: ['JavaScript', 'HTML', 'CSS', 'SQL'], answer: 0,
        explain: 'HTML = contenu, CSS = apparence, JavaScript = comportement (réagir aux événements).' },
    },
    build: L,
  });
})();

/* ---------- 2-6 : Si, sinon (les conditions) ---------- */
(function () {
  const L = OT.mkLevel(72, 11);
  L.rect(1, 0, 70, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'tony');
  // 1. SI A ET B → la porte s'ouvre
  L.sign(6, 1, 'BOUTON A');
  L.button(8, 1, true);
  L.sign(13, 1, 'BOUTON B');
  L.button(15, 1, true);
  L.sign(17, 1, 'SI A ET B → OUVERT');
  L.gate(19, 1, 5, true);
  L.coin(11, 3);
  // 2. if (2 > 3) { HAUT } else { BAS }  → c'est faux : on passe par le BAS
  L.rumeur(22, 1, '2 > 3 ? Évidemment que c\'est vrai.');
  L.sign(23, 1, 'if (2 > 3) { HAUT } else { BAS }');
  L.rect(25, 1, 26, 1, '#');
  L.rect(27, 3, 40, 3, '#');
  L.coins(30, 34, 5);
  L.fakeDoor(38, 4, 'SUITE ➜');
  L.coin(33, 1);
  // 3. if (5 >= 5) { HAUT } else { BAS }  → c'est vrai : on passe par le HAUT
  L.check(42, 1);
  L.npc(42, 1, 'youmbi');
  L.sign(43, 1, 'if (5 >= 5) { HAUT } else { BAS }');
  L.rect(45, 1, 46, 1, '#');
  L.rect(47, 3, 60, 3, '#');
  L.coins(50, 56, 5);
  L.fakeDoor(58, 1, 'SUITE ➜');
  L.rect(61, 1, 61, 2, '#');
  L.set(65, 1, '^');
  L.door(68, 1);
  L.set(26, 2, 'H'); L.box(48, 4);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W2.push({
    title: 'Si, sinon', par: 22, goal: 'Lis chaque condition : vraie → HAUT, fausse → BAS. Atteins la SORTIE.', lesson: 'Les conditions', tone: 'puzzle',
    fragment: '« Si j\'abandonne, je ne saurai jamais. Sinon… je saurai peut-être. »',
    intro: [['tony', 'Un programme prend des décisions avec des conditions : SI c\'est vrai, on fait ceci, SINON, on fait cela.'], ['tony', 'Ici, la porte ne s\'ouvre que SI le bouton A ET le bouton B sont actifs en même temps.']],
    dialogs: {
      tony: { lines: ['« ET » veut dire : les deux en même temps. Appuie sur A, cours sur B, puis file à la porte.', 'Ensuite, lis bien les conditions sur les panneaux. Elles ne mentent pas, elles.'],
        alt: ['2 > 3, c\'est FAUX. Donc on prend le « else », le chemin du BAS. 5 >= 5, c\'est VRAI : le chemin du HAUT.'] },
      youmbi: { lines: ['« >= » veut dire « supérieur OU égal ». Cinq est égal à cinq… à toi de conclure.'],
        alt: ['Saute sur la marche, puis saute encore pour monter sur le chemin du haut. En bas, c\'est un cul-de-sac.'] },
    },
    teach: {
      title: 'Les conditions : if / else',
      text: "Une condition permet à un programme de choisir. if (condition) { … } exécute le premier bloc si la condition est vraie, sinon (else) le second. Exemple : if (pieces >= 5) { porte = 'A'; } else { porte = 'B'; }. Les opérateurs de comparaison sont >, <, >=, <=, == (égal) et != (différent).",
      q: { question: "pieces vaut 3. Que vaut porte après : if (pieces >= 5) { porte = 'A'; } else { porte = 'B'; } ?", options: ["'B'", "'A'", "'A' puis 'B'", 'Rien, il y a une erreur'], answer: 0,
        explain: '3 >= 5 est faux, donc c\'est le bloc else qui s\'exécute : porte = \'B\'.' },
    },
    build: L,
  });
})();

/* ---------- 2-7 : Mon premier projet (les fonctions) ---------- */
(function () {
  const L = OT.mkLevel(66, 12);
  L.rect(1, 0, 64, 0, '#');
  L.start(2, 1);
  L.npc(4, 1, 'tony');
  // 1. on APPELLE la fonction : le pont se construit
  L.rect(10, 0, 18, 0, ' ');
  const pont1 = []; for (let x = 10; x <= 18; x++) pont1.push([x, 0]);
  L.compile(7, 1, pont1, { g: 0, label: 'construirePont()', say: 'construirePont() appelée…', done: 'Pont construit !' });
  L.coin(14, 3);
  // 2. on la RÉUTILISE… mais celle-ci construit depuis l'autre côté
  L.check(21, 1);
  L.npc(20, 1, 'samuel');
  L.rumeur(23, 1, 'Le pont se construit en un éclair. Fonce !');
  L.rect(26, 0, 36, 0, ' ');
  const pont2 = []; for (let x = 36; x >= 26; x--) pont2.push([x, 0]);
  L.compile(24, 1, pont2, { g: 1, label: 'construirePont()', say: 'construirePont() rappelée…', done: 'Même fonction, deuxième pont !' });
  L.rect(27, 3, 35, 3, 'W');
  L.coin(31, 2);
  // 3. le projet : un escalier construit par une autre fonction, la porte tout en haut
  L.npc(38, 1, 'peck');
  L.compile(40, 1, [[43, 1], [44, 1], [46, 3], [47, 3], [49, 5], [50, 5]], { g: 2, label: 'construireEscalier()', say: 'construireEscalier() appelée…', done: 'Escalier prêt !' });
  L.rect(45, 1, 63, 1, '^');
  L.rect(52, 5, 63, 5, '#');
  L.coins(54, 56, 7);
  L.npc(56, 6, 'youmbi');
  L.door(61, 6);
  L.box(9, 1); L.set(42, 1, 'H');   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W2.push({
    title: 'Mon premier projet', par: 24, goal: 'Appelle les fonctions pour construire ponts et escalier, puis atteins la SORTIE en haut.', lesson: 'Les fonctions', tone: 'épique',
    fragment: '« On a écrit la fonction une fois. On l\'a appelée cent fois. C\'était NOTRE projet. »',
    intro: [['tony', 'Une fonction, c\'est une suite d\'instructions qu\'on écrit une fois et qu\'on appelle autant de fois qu\'on veut.'], ['tony', 'Marche sur construirePont() pour l\'appeler. Puis attends que le pont soit construit… en entier.']],
    dialogs: {
      tony: { lines: ['construirePont() pose les blocs un par un. Ne cours pas plus vite que ton code.'],
        alt: ['Attends que le dernier bloc apparaisse avant de traverser. Le vide, lui, n\'attend personne.'] },
      samuel: { lines: ['Même fonction, deuxième appel. Mais regarde bien par quel côté elle commence.', 'Et pas de saut sur ce pont : il y a des pics au plafond.'],
        alt: ['Elle construit depuis l\'autre rive. Attends que les blocs arrivent jusqu\'à toi.'] },
      peck: { lines: ['construireEscalier() : trois marches, et la porte est tout en haut. En bas, tu connais la chanson.'],
        alt: ['Attends que les six blocs soient là, puis monte marche par marche.'] },
      youmbi: { lines: ['Brayan dit qu\'on pourra le mettre en ligne. Notre premier vrai projet !'], alt: ['Tu y es presque !'] },
    },
    teach: {
      title: 'Les fonctions',
      text: "Une fonction regroupe des instructions sous un nom pour pouvoir les réutiliser. On la définit une fois : function construirePont(longueur) { … }, puis on l'appelle autant de fois qu'on veut : construirePont(9); construirePont(11);. Elle peut recevoir des paramètres et renvoyer un résultat avec return.",
      q: { question: 'À quoi sert principalement une fonction ?', options: ['À réutiliser un bloc d\'instructions sans le réécrire', 'À rendre le programme plus lent', 'À décorer la page', 'À stocker des images'], answer: 0,
        explain: 'On écrit les instructions une seule fois, puis on appelle la fonction chaque fois qu\'on en a besoin.' },
    },
    build: L,
  });
})();

/* ---------- 2-8 : Erreur 404 ---------- */
(function () {
  const L = OT.mkLevel(74, 12);
  L.rect(1, 0, 72, 0, '#');
  L.start(2, 1);
  L.rumeur(7, 1, 'Les blocs qui clignotent sont décoratifs. Marche dessus.');
  // 1. les blocs glitch : ils apparaissent et disparaissent en vague
  L.rect(10, 0, 31, 0, ' ');
  for (let k = 0; k < 5; k++) L.glitch(11 + k * 4, 12 + k * 4, 0, (3 - 0.75 * k + 3) % 3, 3);
  L.coins(13, 14, 3).coin(25, 3);
  // 2. la porte « 404 » qui déménage
  L.check(33, 1);
  L.npc(33, 1, 'brayan');
  L.door(40, 1, { hops: [[54, 5], [64, 1], [70, 1]] });
  L.rect(45, 1, 46, 2, '#');
  L.rect(48, 4, 57, 4, '#');
  L.coins(49, 51, 6);
  L.rect(58, 1, 62, 1, '^');
  L.glitch(67, 67, 1, 0, 3).glitch(67, 67, 2, 0, 3).glitch(67, 67, 3, 0, 3);
  L.coin(65, 3);
  L.set(36, 1, 'H'); L.box(49, 1);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W2.push({
    title: 'Erreur 404', par: 26, goal: 'Traverse la page corrompue et rattrape la porte qui disparaît.', lesson: 'Les codes d\'erreur', tone: 'troll',
    fragment: '« Page introuvable. Moi, je savais où j\'allais. C\'est la porte qui hésitait. »',
    intro: [['echo', 'Pourquoi tout clignote ?'], ['oswel', 'La page est corrompue. Il va falloir être rapide.']],
    dialogs: {
      brayan: { lines: ['Moi c\'est Brayan, je m\'occupe des serveurs. 404, c\'est le serveur qui dit : « Je ne trouve pas ce que tu demandes. »', 'La porte de ce niveau a changé d\'adresse. Plusieurs fois. Suis-la.'],
        alt: ['Elle saute trois fois. La dernière, elle reste. Promis.'] },
    },
    teach: {
      title: 'Les codes HTTP',
      text: "Le serveur répond toujours avec un code. 200 : tout va bien, voici la page. 301 : la page a déménagé. 404 : page introuvable, l'adresse demandée n'existe pas (ou plus). 500 : erreur interne du serveur, c'est le code du site qui a planté.",
      q: { question: 'Que signifie l\'erreur 404 ?', options: ['La page demandée est introuvable', 'Le serveur a explosé', 'Il n\'y a plus d\'internet', 'La page est trop lourde'], answer: 0,
        explain: '404 = Not Found : le serveur répond, mais il ne trouve rien à cette adresse.' },
    },
    build: L,
  });
})();

/* ---------- 2-9 : Au-delà de la page (la base de données) ---------- */
(function () {
  const L = OT.mkLevel(40, 18);
  L.rect(1, 0, 38, 0, '#');
  L.rect(9, 1, 37, 1, '^');                       // tout le bas est piégé
  L.start(2, 1);
  L.npc(4, 1, 'brayan');
  // ascenseur 1 → corniche 1
  L.plat(6, 0, 'V', 5.4);
  L.rect(9, 5, 16, 5, '#');
  L.set(14, 5, 'f');                              // une dalle fissurée…
  L.rumeur(10, 6, 'Le sol est solide jusqu\'au bout.');
  L.coin(12, 7).coin(14, 8);
  // ascenseur 2 → corniche 2 (avec un mur qui n'en est pas un)
  L.plat(17, 5, 'V', 4.4, { phase: 1.5 });
  L.check(20, 10);
  L.rect(20, 9, 30, 9, '#');
  L.npc(21, 10, 'samuel');
  L.rect(25, 10, 25, 12, 'o');                    // faux mur
  L.coin(23, 12).coin(28, 11);
  // ascenseur 3 → la base de données, tout en haut
  L.plat(31, 9, 'V', 4.4, { phase: 0.7 });
  L.rect(33, 13, 37, 13, '#');
  L.coin(32, 15);
  L.npc(34, 14, 'youmbi');
  L.door(36, 14);
  L.box(24, 10);   // caisses : on les ouvre avec le bouton Action (bonne = 1 pièce, piégée = elle mord)
  W2.push({
    title: 'Au-delà de la page', par: 26, goal: 'Monte jusqu\'à la base de données, tout en haut.', lesson: 'Les bases de données', tone: 'épique',
    fragment: '« Derrière chaque page, il y a des données. Derrière chaque donnée, quelqu\'un. »',
    intro: [['brayan', 'Tu as vu la page. Maintenant, on descend dans les coulisses : le serveur… et tout en haut, la base de données.']],
    dialogs: {
      brayan: { lines: ['Les ascenseurs montent et descendent tout seuls. Monte quand il est en bas, descends quand il est en haut.', 'Tout le sol est piégé. Ne tombe pas.'],
        alt: ['Monte sur l\'ascenseur quand il est à ta hauteur, puis saute sur la corniche quand il arrive en haut.'] },
      samuel: { lines: ['Ce mur ? Il n\'est pas dans la base de données. Donc il n\'existe pas vraiment.'],
        alt: ['Marche droit dans le mur. Fais-moi confiance… pour une fois.'] },
      youmbi: { lines: ['Bienvenue dans la base de données : ici, on garde tout. Les comptes, les scores, les pièces…'], alt: ['La porte est juste là.'] },
    },
    teach: {
      title: 'Les bases de données',
      text: "Un site garde ses informations durables (comptes, messages, scores) dans une base de données. Les données sont rangées dans des tables, avec des lignes (une par élément) et des colonnes (un type d'information). On les interroge avec le langage SQL, par exemple : SELECT nom FROM joueurs WHERE pieces > 100;",
      q: { question: 'Où un site web garde-t-il durablement les comptes de ses utilisateurs ?', options: ['Dans une base de données', 'Dans le CSS', 'Dans le cache du navigateur uniquement', 'Dans la balise <title>'], answer: 0,
        explain: 'Les données durables sont stockées côté serveur, dans une base de données (tables, lignes, colonnes).' },
    },
    build: L,
  });
})();

/* ---------- 2-10 : BOSS — Le Bug ---------- */
(function () {
  const L = OT.mkLevel(36, 12);
  L.rect(1, 0, 34, 0, '#');
  L.rect(4, 2, 7, 2, '#');      // A : dessus à 3
  L.rect(10, 4, 13, 4, '#');    // B : dessus à 5
  L.rect(16, 2, 19, 2, '#');    // C : dessus à 3
  L.rect(22, 4, 25, 4, '#');    // D : dessus à 5
  L.rect(28, 2, 31, 2, '#');    // E : dessus à 3
  L.coin(5, 4).coin(11, 6).coin(23, 6).coin(29, 4);
  L.start(2, 1);
  W2.push({
    title: 'Le Bug', par: 50, goal: 'Corrige le Bug en 3 phases : essayer, chercher, corriger.', lesson: 'Le débogage', tone: 'épique', boss: 'bug',
    fragment: '« On ne corrige pas un bug en le frappant. On le corrige en le comprenant. »',
    intro: [
      ['tony', 'Le voilà : ton premier vrai bug. Il casse tout ce qu\'on a construit.'],
      ['tony', 'Si tu tombes, tu recommences la phase en cours. Pas tout le combat.'],
      ['bug', 'JE NE SUIS PAS UN BUG. JE SUIS UNE FONCTIONNALITÉ.'],
    ],
    dialogs: {},
    teach: {
      title: 'Le débogage',
      text: "Déboguer, c'est trouver et corriger une erreur avec méthode : 1. reproduire le bug, 2. lire le message d'erreur et les logs, 3. formuler une hypothèse sur la cause, 4. corriger, 5. retester pour vérifier que c'est réparé (et que rien d'autre n'est cassé). Taper au hasard ne corrige rien.",
      q: { question: 'Face à un bug, quelle est la première chose à faire ?', options: ['Le reproduire et lire le message d\'erreur', 'Réécrire tout le programme', 'Changer des lignes au hasard', 'Éteindre l\'ordinateur'], answer: 0,
        explain: 'On commence par reproduire le problème et lire les erreurs : sans ça, on corrige à l\'aveugle.' },
    },
    build: L,
  });
})();

/* ---------------------------------------------------------------------
   Boss du Monde 2 : textes des phases (expliquées par Tony)
   --------------------------------------------------------------------- */
OT.WORLD2.bossText = {
  name: 'Le Bug',
  phases: [
    { name: 'Essayer', say: 'ESSAIE DONC DE M\'ATTRAPER.',
      help: 'Touche le Bug (flèche « FRAPPE ICI ? »)… et regarde ce qui se passe. Évite les blocs « ! » qui tombent : leur ombre rouge montre où.',
      tell: [
        ['tony', 'Phase 1 : vas-y, essaie de le toucher. La flèche te montre où il est.'],
        ['tony', 'Attention aux blocs « ! » qui tombent du plafond : leur ombre rouge te dit où ils vont s\'écraser.'],
      ] },
    { name: 'Chercher', say: 'TU NE SAIS MÊME PAS OÙ JE SUIS.',
      help: 'Ramasse les 3 LOGS (les traces de l\'erreur). Une barre rouge annonce un balayage : le Bug va traverser cette ligne. Saute ou change d\'étage.',
      tell: [
        ['tony', 'Tu vois ? Taper au hasard ne corrige rien. Un bon développeur commence par LIRE les traces de l\'erreur : les logs.'],
        ['tony', 'Ramasse les 3 logs. Quand une barre rouge traverse l\'écran, le Bug va foncer sur cette ligne : saute, ou change d\'étage.'],
      ] },
    { name: 'Corriger', say: 'JE SUIS UNE FONCTIONNALITÉ !',
      help: 'Il fonce vers toi : saute par-dessus ou monte sur une plateforme. Quand il se cogne au mur, il est sonné : touche-le pour appliquer un correctif. 3 correctifs.',
      tell: [
        ['tony', 'Les logs disent tout : on sait d\'où il vient. Maintenant, on corrige.'],
        ['tony', 'Il va foncer au ras du sol. Saute par-dessus ou monte sur une plateforme. Quand il se cogne au mur, il est sonné : touche-le. Trois correctifs.'],
      ] },
  ],
  end: 'CORRECTION… APPLIQUÉE…',
};

/* ---------------------------------------------------------------------
   Chapitre 2 (débloqué après le quiz du Monde 2)
   --------------------------------------------------------------------- */
OT.CHAPTERS[1] = {
  n: 2, title: 'Le Code — Créer',
  paragraphs: [
    "Après l'atelier, il y a eu l'écran. Tony m'a montré qu'on pouvait parler à une machine sans la toucher : en lui écrivant.",
    "Mon premier programme affichait « Bonjour, monde ». Le deuxième ne marchait pas. J'ai vite compris qu'en informatique, on passe plus de temps à corriger qu'à écrire.",
    "J'ai appris les balises, les styles, les conditions, les fonctions. Yannick avançait vite, alors j'avançais plus vite. Un rival, c'est quelqu'un qui t'oblige à devenir meilleur.",
    "Avec Brayan, Samuel, Peck et Youmbi, j'ai découvert qu'un projet ne se construit pas seul : il y a ceux qui codent, ceux qui mettent en ligne, ceux qui testent, et ceux qui y croient.",
    "Puis j'ai rencontré mon premier vrai bug. Je l'ai frappé au hasard, il s'est moqué de moi. Alors j'ai lu les erreurs, j'ai cherché, j'ai corrigé. Et il a disparu.",
  ],
  last: 'Je savais maintenant créer. Il me restait à apprendre comment on construit des choses qui tiennent.',
};

/* ---------------------------------------------------------------------
   Registre : le Monde 2 rejoint le jeu
   --------------------------------------------------------------------- */
OT.WORLD2.chapter = OT.CHAPTERS[1];
OT.WORLD2.intro = [
  { text: 'Quelques années plus tard.', cam: { x: 40, y: 7, z: 36 } },
  { text: 'L\'atelier a laissé place à un écran.', cam: { x: 20, y: 4, z: 22 } },
  { text: 'Ici, les machines ne se démontent plus. Elles s\'écrivent.', cam: { x: 9, y: 3, z: 15 } },
  { text: 'Bienvenue dans Le Code.', cam: { x: 4, y: 2.5, z: 11 } },
];
OT.WORLD_DATA[2] = OT.WORLD2;
OT.WORLDS[1].open = true;
OT.CHARACTERS.christine = OT.CHARACTERS.christine || { name: 'Christine', color: 0x8e5bd6 };
