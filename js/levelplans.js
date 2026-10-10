/* =====================================================================
   OSWEL'S TRAP — levelplans.js  (version 1.3)
   LE PLAN DE CHAQUE GRAND NIVEAU.
   La zone 1 est toujours le niveau d'origine (inchangé). Ensuite viennent
   2 à 4 zones nouvelles. Chaque zone a un nom, un objectif, et une suite
   de sections (voir sections.js) choisies pour le thème du niveau :
     apprendre une mécanique → la piéger → la combiner → respirer → finir.
   Les niveaux du début d'un monde sont plus courts, ceux de la fin plus
   longs ; le 9e niveau de chaque monde a une POURSUITE (rare et spectaculaire).
   Les pièces ajoutées récompensent quelque chose : salle secrète, chemin
   risqué, puzzle réussi, petit détour.
   ===================================================================== */
window.OT = window.OT || {};
// version du dessin des niveaux : les records d'avant (niveaux courts) ne se comparent plus aux nouveaux
// 14 = version 1.4 : les coins de rencontre de l'histoire (Isaïe, Kevin, Tchanko, NEXA…) allongent 18 niveaux
// (à passer à 15 quand le dessin des niveaux changera : nouveaux pièges, mécanismes coop…)
// 15 = version 1.5 : les nouveaux pièges (js/pieges3.js) ajoutent des sections dans 30 niveaux
OT.LAYOUT_V = 15;

(function () {
// petits raccourcis d'écriture
const Z = (name, goal, secs, extra) => Object.assign({ name, goal, secs }, extra || {});
const REST = (sign, rumeur, cp) => ['rest', { sign, rumeur, cp }];
const MEET = (sign, npc, cp) => ['rest', { sign, npc, cp }];   // un coin calme avec un personnage à qui parler

OT.EXT_PLANS = {
  /* =================================================================
     MONDE 1 — LA FORGE : un grand complexe industriel
     ================================================================= */
  1: [
    // 1-1 Premier jour à l'atelier (facile, ~1 à 2 min)
    { h: 12, zones: [
      Z('Le vestiaire', 'Traverse le vestiaire sans croire tout ce qu\'on te dit.', [
        REST('VESTIAIRE · CASQUE OBLIGATOIRE', 'Il paraît que les dalles fissurées sont les plus solides.'),
        ['troll', { at: 6, sign: 'SOL NEUF ✓' }],
        ['spikes', { pattern: [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0] }],
        ['gaps', { steps: [[2, 4, 1], [3, 3, 1], [2, 4, 2]] }],
      ]),
      Z('La vraie sortie', 'Trouve la VRAIE porte. Les fausses ont un tourbillon qui tourne à l\'envers.', [
        ['wireCeil', {}],
        ['crumbleBridge', { len: 8, delay: 0.5 }],
        ['secret', {}],
        ['doorTrio', {}],
      ]),
    ] },
    // 1-2 Démontage
    { h: 13, zones: [
      Z('L\'établi', 'Les blocs rouillés ne tiennent pas : ne t\'arrête jamais dessus.', [
        REST('ÉTABLI N°2 · RANGEZ VOS OUTILS', 'Il paraît qu\'on peut faire une pause sur un bloc rouillé.'),
        ['gaps', { steps: [[2, 2, 2, 'c'], [2, 2, 3, 'c'], [2, 2, 2, 'c'], [3, 3, 1]], spikes: true, delay: 0.4 }],
        ['secret', {}],
        ['crumbleBridge', { len: 12, delay: 0.45 }],
      ]),
      Z('Le stock de pièces', 'Une caisse, ça se pousse. Et ça sert de marche.', [
        ['crateStep', {}],
        ['spikes', { pattern: [0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0] }],
        ['gaps', { steps: [[2, 1, 2, 'c'], [2, 1, 2, 'c'], [2, 1, 3, 'c'], [3, 3, 1]], spikes: true, delay: 0.35 }],
        REST('SORTIE DU STOCK →', null, true),
      ]),
    ] },
    // 1-3 Tout tourne ensemble
    { h: 13, zones: [
      Z('La chaîne de transmission', 'Les plateformes avancent toutes seules : saute au bon moment.', [
        REST('TRANSMISSION · NE PAS TOUCHER', 'Il paraît que les marteaux s\'arrêtent quand on les regarde.'),
        ['platRide', { n: 2 }],
        ['hammers', { n: 1, space: 8, py: 6 }],
        ['gaps', { steps: [[2, 3, 2], [3, 2, 1], [2, 3, 2]] }],
      ]),
      Z('Les engrenages', 'Chaque pièce bouge avec les autres. Observe le rythme avant de passer.', [
        ['saws', { list: ['up', 'up'] }],
        ['platRide', { n: 3, speed: 1.6 }],
        ['fork', {}],
        ['hammers', { n: 2, space: 8, py: 6, period: 2.4 }],
      ]),
    ] },
    // 1-4 Le bruit bizarre
    { h: 13, zones: [
      Z('La salle des moteurs', 'Écoute : les pièges font du bruit juste avant de se déclencher.', [
        REST('SALLE DES MOTEURS · BRUIT NORMAL ?', 'Il paraît que les pistons préviennent toujours… ou jamais.'),
        ['pistons', { n: 3, dph: 0.6 }],
        ['troll', { at: 8, w: 3 }],
        ['secret', { extra: true }],
      ]),
      Z('Le bruit se rapproche', 'Tic… tic… tic… Ne t\'arrête pas sous un bloc qui tremble.', [
        ['wireCeil', {}],
        ['crushers', { n: 2 }],
        ['gaps', { steps: [[3, 3, 1], [2, 2, 2], [3, 3, 1]] }],
        REST('ATELIER DE PATOU · POSTE 3', null, true),
      ]),
      Z('Le moteur', 'Le dernier couloir. Les murs se referment en rythme.', [
        ['presses', { n: 2 }],
        ['fakeFlag', {}],
        ['spikes', { pattern: [0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0] }],
      ]),
    ] },
    // 1-5 Au dixième de millimètre
    { h: 13, zones: [
      Z('La presse hydraulique', 'Les pistons frappent en vague. Trouve le rythme.', [
        REST('PRESSE N°1 · PRÉCISION 0,1 mm', 'Il paraît qu\'on passe plus vite sous une presse en sautant.'),
        ['pistons', { n: 5, dph: 0.35 }],
        ['presses', { n: 2, period: 2.6 }],
      ]),
      Z('Le banc de mesure', 'Des corniches étroites : précision avant tout.', [
        ['gaps', { steps: [[2, 1, 2], [2, 1, 2], [3, 1, 3], [2, 2, 2], [3, 1, 1]] }],
        ['spikes', { pattern: [0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0], ceil: 5 }],
        ['crateBtn', {}],
        REST('CONTRÔLE QUALITÉ ✓', null, true),
      ]),
      Z('La pièce parfaite', 'Les piques sortent l\'une après l\'autre : passe entre elles.', [
        ['pikes', { n: 6 }],
        ['crushers', { n: 3 }],
        ['pistons', { n: 4, dph: 0.5, phase0: 0.4 }],
      ]),
    ] },
    // 1-6 Le fil rouge
    { h: 13, zones: [
      Z('Le tableau électrique', 'Le courant passe, s\'arrête, repasse. Avance quand il est coupé.', [
        REST('DANGER · 380 VOLTS', 'Il paraît que le courant ne passe que quand on regarde ailleurs.'),
        ['elecRun', { n: 3 }],
        ['heatRun', { n: 2, period: 3 }],
        ['secret', {}],
      ]),
      Z('Les câbles', 'Un levier ouvre un chemin… et en ferme un autre.', [
        ['levers', { g: 0 }],
        ['saws', { list: ['up', 'pit'] }],
        ['troll', { at: 6, w: 4 }],
        REST('ARMOIRE ÉLECTRIQUE · FERMÉE ?', null, true),
      ]),
      Z('Le court-circuit', 'Les bidons s\'allument quand on approche : passe vite !', [
        ['barrels', { n: 3 }],
        ['timedGate', { dist: 12, time: 2.2 }],
        ['elecRun', { n: 4, w: 3 }],
      ]),
    ] },
    // 1-7 Et si je l'ouvrais ?
    { h: 13, zones: [
      Z('Les placards', 'La curiosité paie… parfois. Les fausses pièces ne flottent pas.', [
        REST('PLACARD · NE PAS OUVRIR', 'Il paraît que derrière chaque mur « NE PAS OUVRIR », il y a un trésor.'),
        ['secret', { extra: true }],
        ['fakeCoins', {}],
        ['gaps', { steps: [[2, 3, 2], [3, 2, 3], [2, 3, 1]] }],
      ]),
      Z('Ne pas ouvrir', 'Un drapeau sans lampe n\'est pas un vrai point de reprise.', [
        ['fakeFlag', {}],
        ['troll', { at: 7, w: 3 }],
        ['crateStep', {}],
        ['doorTrio', {}],
      ], { gateLabel: 'SUITE' }),
      Z('Le coffre', 'Deux chemins : rapide et risqué, ou long et sûr.', [
        ['fork', {}],
        ['hammers', { n: 2, space: 8, py: 6 }],
        ['secret', {}],
      ]),
    ] },
    // 1-8 Le boîtier noir
    { h: 13, zones: [
      Z('Les rails', 'Les plateformes vont vite. Les blocs suspendus tombent quand on passe dessous.', [
        REST('RAILS · VITESSE MAX', 'Il paraît que les écraseurs dorment la nuit.'),
        ['platRide', { n: 3, speed: 1.9 }],
        ['crushers', { n: 2 }],
      ]),
      Z('Le monte-charge', 'Grimpe la tour, puis redescends de l\'autre côté.', [
        ['tower', { h: 9 }],
        ['levers', { g: 1 }],
        REST('MONTE-CHARGE · 500 KG MAX', null, true),
      ]),
      Z('La salle de contrôle', 'Pousse la caisse sur le bouton pour garder la porte ouverte.', [
        ['crateBtn', {}],
        ['pistons', { n: 4, dph: 0.45 }],
        ['presses', { n: 2, period: 2.5 }],
      ]),
    ] },
    // 1-9 L'écran dans l'atelier (difficile, avec POURSUITE)
    { h: 13, zones: [
      Z('L\'atelier s\'éteint', 'Les lumières vacillent. Méfie-toi de tout ce qui pend du plafond.', [
        REST('ATELIER · FERMETURE DANS 5 MIN', 'Il paraît que la forge est éteinte.'),
        ['wireCeil', {}],
        ['crushers', { n: 3 }],
        ['fakeFlag', {}],
      ]),
      Z('Les machines s\'emballent', 'Marteaux, scies, sol brûlant : tout s\'accélère.', [
        ['hammers', { n: 3, space: 8, py: 6, period: 2.2 }],
        ['saws', { list: ['pit', 'up', 'pit'], speed: 3 }],
        ['heatRun', { n: 3, period: 2.6, dph: 0.6 }],
        ['barrels', { n: 2 }],
      ]),
      Z('La coulée', 'LA FORGE DÉBORDE ! Cours et saute sans t\'arrêter.', [
        ['chase', { kind: 'lava', speed: 6.2, sign: '⚠ COULÉE DE MÉTAL' }],
        REST('ZONE SÛRE · OUF', null, true),
      ]),
      Z('L\'écran', 'Au fond de l\'atelier, un écran s\'allume…', [
        ['fork', {}],
        ['gaps', { steps: [[2, 2, 2, 'c'], [2, 2, 3, 'c'], [3, 2, 2, 'c'], [2, 3, 1]], spikes: true, delay: 0.35 }],
        ['doorTrio', {}],
      ]),
    ] },
  ],

  /* =================================================================
     MONDE 2 — LE CODE : un immense environnement numérique
     ================================================================= */
  2: [
    // 2-1 Bonjour, monde
    { h: 12, zones: [
      Z('Le bureau', 'Les blocs glitch s\'éteignent en vague : suis-la.', [
        REST('C:\\OSWEL\\BUREAU', 'Il paraît que les blocs qui clignotent sont les plus fiables.'),
        ['glitchSeq', { n: 7, period: 2.6 }],
        ['troll', { at: 6, sign: 'ÉCRAN BLEU ?' }],
      ]),
      Z('La barre des tâches', 'Les fenêtres bougent toutes seules. Et les cadeaux sont rarement gratuits.', [
        ['platRide', { n: 2 }],
        ['fakeCoins', {}],
        ['secret', {}],
      ]),
    ], exitLabel: '✕ FERMER' },
    // 2-2 La toile
    { h: 12, zones: [
      Z('Les pages', 'Lis bien l\'adresse avant de cliquer sur un lien.', [
        REST('PAGE 5 · index.html', 'Il paraît que www.osweI.cm et www.oswel.cm, c\'est pareil.'),
        ['linkPick', {}],
        ['gaps', { steps: [[2, 3, 2], [3, 2, 1], [2, 3, 2]] }],
        ['secret', {}],
      ]),
      Z('Le site', 'Deux liens encore… et une page qui disparaît.', [
        ['linkPick', { bad: 'www.oswel.cm.fr', good: 'www.oswel.cm' }],
        ['glitchSeq', { n: 8 }],
        ['spikes', { pattern: [0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0] }],
      ]),
    ] },
    // 2-3 Les balises
    { h: 13, zones: [
      Z('Le <body>', 'Ouvre la balise pour faire apparaître les blocs, referme-la pour qu\'ils restent.', [
        REST('<body>', 'Il paraît qu\'on n\'est pas obligé de fermer ses balises.'),
        ['tags', { time: 4 }],
        ['glitchSeq', { n: 7 }],
      ]),
      Z('Les <div>', 'Cette fois, pas de balise fermante : il faut faire vite.', [
        ['tags', { time: 3.5, close: false }],
        ['spikes', { pattern: [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0] }],
        ['levers', { g: 0 }],
        REST('</div>', null, true),
      ]),
      Z('Le </html>', 'Deux chemins pour finir la page.', [
        ['fork', {}],
        ['tags', { time: 4 }],
      ]),
    ] },
    // 2-4 Le styliste
    { h: 13, zones: [
      Z('La feuille de style', 'La glace glisse, les ressorts font sauter : le CSS change tout.', [
        REST('style.css', 'Il paraît que la glace freine très bien.'),
        ['iceRun', {}],
        ['gaps', { steps: [[2, 3, 2], [3, 3, 1], [2, 2, 2]] }],
      ]),
      Z('Les fenêtres', 'Les fenêtres montent et descendent : attends qu\'elles viennent à toi.', [
        ['windows', {}],
        ['iceRun', {}],
        ['secret', {}],
        REST('display: block;', null, true),
      ]),
      Z('Le rendu final', 'Un bug a inversé gauche et droite ici. Réfléchis avant de bouger.', [
        ['invertRun', {}],
        ['spikes', { pattern: [0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0] }],
      ]),
    ] },
    // 2-5 Ça bouge !
    { h: 13, zones: [
      Z('Le pont des événements', 'Le pont n\'existe que si personne ne saute. Les pics sortent quand quelqu\'un saute.', [
        REST('onclick = ?', 'Il paraît que sauter sur le pont, c\'est plus rapide.'),
        ['jumpEvents', {}],
        ['glitchSeq', { n: 8, period: 2.2, dph: 0.2 }],
      ]),
      Z('Les écouteurs', 'Les piques réagissent en rythme. Les fenêtres aussi.', [
        ['pikes', { n: 6, period: 2.0 }],
        ['platRide', { n: 2, speed: 1.7 }],
        REST('addEventListener', null, true),
      ]),
      Z('La boucle', 'Encore un pont… et une porte qui ne reste pas ouverte longtemps.', [
        ['jumpEvents', {}],
        ['timedGate', { dist: 12, time: 2.2 }],
      ]),
    ] },
    // 2-6 Si, sinon
    { h: 13, zones: [
      Z('Si…', 'SI le levier est baissé, ALORS le pont existe… SINON la porte s\'ouvre.', [
        REST('if (levier) { pont(); }', 'Il paraît que la porte de gauche est toujours la bonne.'),
        ['levers', { g: 0 }],
        ['doorTrio', { label: 'SI' }],
      ]),
      Z('…sinon', 'SI la caisse est sur le bouton, ALORS la barrière reste ouverte.', [
        ['crateBtn', {}],
        ['timedGate', { dist: 12, time: 2.3 }],
        ['fork', {}],
        REST('else { recommence(); }', null, true),
      ]),
      Z('Fin du bloc', 'Une dernière condition.', [
        ['tags', { time: 4 }],
        ['spikes', { pattern: [0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0] }],
      ]),
    ] },
    // 2-7 Mon premier projet
    { h: 13, zones: [
      Z('La compilation', 'Appuie sur COMPILER et attends que le pont soit construit.', [
        REST('npm run build', 'Il paraît qu\'on peut traverser pendant la compilation.'),
        ['compileBridge', { rate: 0.24 }],
        ['gaps', { steps: [[2, 3, 2], [3, 2, 3], [2, 3, 1]] }],
      ]),
      Z('Les bugs', 'Les fenêtres pop-up tirent sur toi. Saute par-dessus leurs tirs.', [
        ['turrets', {}],
        ['invertRun', {}],
        ['secret', {}],
        REST('git commit -m "ça marche"', null, true),
      ]),
      Z('La mise en ligne', 'Une dernière compilation, plus rapide.', [
        ['compileBridge', { rate: 0.16 }],
        ['saws', { list: ['up', 'up'] }],
      ]),
    ] },
    // 2-8 Erreur 404
    { h: 13, zones: [
      Z('Page introuvable', 'Les pages s\'effacent, les portes déménagent. Suis la vague.', [
        REST('ERREUR 404', 'Il paraît que la page existe encore quelque part.'),
        ['glitchSeq', { n: 9, period: 2.4 }],
        ['doorTrio', { label: '404' }],
        ['troll', { at: 7 }],
      ]),
      Z('Le cache', 'Un lien vers l\'ancienne page… et un autre vers la bonne.', [
        ['linkPick', { bad: 'oswel.cm/ancien', good: 'oswel.cm/nouveau' }],
        ['platRide', { n: 2 }],
        ['spikes', { pattern: [0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0] }],
        REST('Vider le cache ? OUI', null, true),
      ]),
      Z('Le virus', 'UN VIRUS EFFACE TOUT ! Cours !', [
        ['chase', { kind: 'virus', speed: 6, sign: '⚠ ANTIVIRUS DÉSACTIVÉ' }],
        ['secret', {}],
      ]),
    ] },
    // 2-9 Au-delà de la page (épique)
    { h: 18, zones: [
      Z('Le défilement', 'La page continue vers le haut : grimpe.', [
        REST('scroll ↓', 'Il paraît que la page s\'arrête ici.'),
        ['tower', { h: 12 }],
        ['glitchSeq', { n: 8, period: 2.2 }],
      ]),
      Z('Le pied de page', 'Pop-ups, commandes inversées : le site résiste.', [
        ['fork', {}],
        ['turrets', { two: true }],
        ['invertRun', {}],
        REST('© OSWEL OFFICIEL', null, true),
      ]),
      Z('La dernière ligne', 'Ouvre, compile, ferme : tout ce que tu as appris.', [
        ['tags', { time: 4 }],
        ['jumpEvents', {}],
        ['compileBridge', { rate: 0.2 }],
      ]),
    ] },
  ],

  /* =================================================================
     MONDE 3 — LE LABORATOIRE : un complexe scientifique, salle après salle
     ================================================================= */
  3: [
    // 3-1 Premier jour à la fac
    { h: 12, zones: [
      Z('Le couloir des labos', 'Les lasers clignotent avant de s\'allumer. Passe pendant qu\'ils sont éteints.', [
        REST('LABO 1 · BLOUSE OBLIGATOIRE', 'Il paraît que les lasers sont décoratifs.'),
        ['laserRun', { list: [[2.6, 0.45, 0], [2.6, 0.45, 1.3]] }],
        ['beltAcid', {}],
      ]),
      Z('L\'amphithéâtre', 'Trouve la sortie de l\'amphi.', [
        ['gaps', { steps: [[2, 3, 2], [3, 2, 3], [2, 4, 1]] }],
        ['secret', {}],
        ['spikes', { pattern: [0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0] }],
      ]),
    ], exitLabel: 'AMPHI 2' },
    // 3-2 La pente
    { h: 12, zones: [
      Z('Le plan incliné', 'La gelée ralentit, le tapis bleu propulse. Saute au bon moment.', [
        REST('MÉCANIQUE · PLAN INCLINÉ', 'Il paraît que la gelée violette est délicieuse.'),
        ['beltAcid', {}],
        ['gooBoost', {}],
      ]),
      Z('La salle des lasers', 'Lent, rapide, puis deux en même temps.', [
        ['laserRun', {}],
        ['gaps', { steps: [[2, 3, 1], [3, 2, 2], [2, 3, 1]] }],
        ['secret', {}],
      ]),
    ] },
    // 3-3 Le courant
    { h: 13, zones: [
      Z('Le circuit', 'Courant alternatif : un temps allumé, un temps coupé.', [
        REST('ÉLECTRICITÉ · U = R × I', 'Il paraît que le courant ne circule que dans un sens.'),
        ['elecRun', { n: 3 }],
        ['laserRun', { list: [[2.2, 0.5, 0], [2.2, 0.5, 1.1]] }],
      ]),
      Z('Le blindage', 'Pousse la caisse devant toi : elle arrête le rayon.', [
        ['crateShield', {}],
        ['turrets', {}],
        REST('ISOLANT · CAOUTCHOUC', null, true),
      ]),
      Z('Le disjoncteur', 'Le levier coupe… et rétablit.', [
        ['levers', { g: 0 }],
        ['elecRun', { n: 4, w: 3 }],
      ]),
    ] },
    // 3-4 Apesanteur
    { h: 13, zones: [
      Z('La bulle', 'En apesanteur, on flotte… attention aux pics du plafond.', [
        REST('GRAVITÉ · 9,81 m/s²', 'Il paraît qu\'en apesanteur, on peut sauter aussi haut qu\'on veut.'),
        ['lowgJump', {}],
        ['heavy', {}],
      ]),
      Z('La centrifugeuse', 'Les pistons, puis la gelée : garde ton élan.', [
        ['pistons', { n: 4, dph: 0.45 }],
        ['gooBoost', {}],
        REST('MASSE ≠ POIDS', null, true),
      ]),
      Z('La grande bulle', 'Une bulle encore plus grande. Petits sauts !', [
        ['lowgJump', { len: 26 }],
        ['secret', {}],
      ]),
    ] },
    // 3-5 Le labo de Reine
    { h: 13, zones: [
      Z('La paillasse', 'Les tapis vont dans le mauvais sens, l\'acide attend en dessous.', [
        REST('LABO DE REINE · NE RIEN TOUCHER', 'Il paraît que Reine ne range jamais ses produits.'),
        ['beltAcid', {}],
        ['crateBtn', {}],
      ]),
      Z('L\'autoclave', 'Les lasers sont synchronisés. Les murs se referment.', [
        ['laserRun', { list: [[2.0, 0.5, 0], [2.0, 0.5, 0], [1.6, 0.5, 0.8]] }],
        ['presses', { n: 2 }],
        ['fakeFlag', {}],
      ]),
      Z('La réserve', 'Abrite-toi derrière la caisse.', [
        ['crateShield', {}],
        ['gaps', { steps: [[3, 2, 2], [2, 2, 3], [3, 3, 1]] }],
      ]),
    ] },
    // 3-6 Le catalyseur
    { h: 13, zones: [
      Z('La réaction', 'Le catalyseur construit le pont… plus ou moins vite.', [
        REST('CATALYSEUR · ACCÉLÈRE LA RÉACTION', 'Il paraît que la réaction est instantanée.'),
        ['compileBridge', { rate: 0.22 }],
        ['gooBoost', {}],
      ]),
      Z('Les produits instables', 'Les bidons explosent quand on les approche. Les tourelles tirent.', [
        ['barrels', { n: 3 }],
        ['turrets', {}],
        ['secret', {}],
        REST('ÉQUILIBRE CHIMIQUE', null, true),
      ]),
      Z('La salle lourde', 'Ici, la gravité est presque doublée.', [
        ['heavy', {}],
        ['laserRun', {}],
      ]),
    ] },
    // 3-7 Le dé
    { h: 13, zones: [
      Z('Une chance sur trois', 'Trois portes : une seule est la bonne. Observe-les.', [
        REST('PROBABILITÉS · P = 1/3', 'Il paraît que la porte du milieu gagne toujours.'),
        ['doorTrio', { label: '1/3' }],
        ['portalPick', {}],
      ]),
      Z('La loi des grands nombres', 'Les lasers suivent une règle. Trouve-la.', [
        ['laserRun', { list: [[1.8, 0.5, 0], [1.8, 0.5, 0.9], [1.8, 0.5, 0]] }],
        ['crateStep', {}],
        REST('LANCER N°1000', null, true),
      ]),
      Z('Le tirage', 'Deux chemins. Pas de hasard : du choix.', [
        ['fork', {}],
        ['beltAcid', {}],
      ]),
    ], exitLabel: '2/2' },
    // 3-8 ET, OU, NON
    { h: 13, zones: [
      Z('La porte NON', 'NON : le levier fait l\'inverse de ce qu\'on croit.', [
        REST('LOGIQUE · ET · OU · NON', 'Il paraît que NON(NON(vrai)) = faux.'),
        ['levers', { g: 0 }],
        ['crateBtn', {}],
      ]),
      Z('La porte ET', 'La porte reste ouverte tant que le bouton est appuyé.', [
        ['timedGate', { dist: 12, time: 2.2 }],
        ['laserRun', {}],
        REST('VRAI ET VRAI = VRAI', null, true),
      ]),
      Z('La porte OU', 'Bouclier OU saut : choisis.', [
        ['crateShield', {}],
        ['turrets', {}],
      ]),
    ] },
    // 3-9 Le cahier des charges (difficile, avec POURSUITE)
    { h: 14, zones: [
      Z('Les spécifications', 'Tout ce que tu as appris au labo, dans le bon ordre.', [
        REST('CAHIER DES CHARGES · V3', 'Il paraît que le cahier des charges ne change jamais.'),
        ['lowgJump', {}],
        ['crateShield', {}],
      ]),
      Z('Les tests', 'Tourelles, presses, gelée : le prototype est mis à l\'épreuve.', [
        ['turrets', { two: true }],
        ['presses', { n: 2, period: 2.5 }],
        ['gooBoost', {}],
        REST('TEST N°42 · RÉUSSI ?', null, true),
      ]),
      Z('La fuite', 'L\'ACIDE DÉBORDE ! Cours !', [
        ['chase', { kind: 'acid', speed: 6.2, sign: '⚠ FUITE DANS LA CUVE' }],
        REST('DOUCHE DE SÉCURITÉ', null, false),
      ]),
      Z('La validation', 'Gravité lourde et lasers : la dernière épreuve du prototype.', [
        ['heavy', {}],
        ['laserRun', { list: [[1.8, 0.5, 0], [1.6, 0.5, 0.5], [1.8, 0.55, 1.1]] }],
        ['secret', {}],
      ]),
    ] },
  ],

  /* =================================================================
     MONDE 4 — NEXUS : des zones dimensionnelles et des îles flottantes
     ================================================================= */
  4: [
    // 4-1 L'éveil
    { h: 13, zones: [
      Z('Les deux couleurs', 'Chaque saut fait basculer les blocs roses et bleus.', [
        REST('NEXUS · ÉVEIL', 'Il paraît que les blocs roses sont toujours là.'),
        ['kqHop', {}],
        ['fanLift', {}],
      ]),
      Z('Le premier portail', 'Un portail mène plus loin. L\'autre vacille : méfiance.', [
        ['portalPick', {}],
        ['gaps', { steps: [[2, 3, 2], [3, 2, 3], [2, 3, 1]] }],
        ['secret', {}],
      ]),
    ] },
    // 4-2 Le réseau
    { h: 13, zones: [
      Z('Les nœuds', 'Les plateformes relient les nœuds du réseau.', [
        REST('RÉSEAU · 192.168.0.1', 'Il paraît que tous les portails mènent au même endroit.'),
        ['portalPick', {}],
        ['platRide', { n: 2 }],
      ]),
      Z('La bande passante', 'Le vent souffle contre toi au-dessus des trous.', [
        ['windRun', { power: -3 }],
        ['secret', {}],
        ['kqHop', {}],
      ]),
    ] },
    // 4-3 Le nuage
    { h: 14, zones: [
      Z('Le cumulus', 'Le ventilateur soulève, les nuages s\'effritent.', [
        REST('CLOUD · STOCKAGE ILLIMITÉ', 'Il paraît que les nuages sont solides.'),
        ['fanLift', {}],
        ['gaps', { steps: [[2, 2, 2, 'c'], [2, 2, 3, 'c'], [2, 2, 2, 'c'], [3, 3, 1]], spikes: true, delay: 0.4 }],
      ]),
      Z('Le vent d\'altitude', 'Le vent et un long pont de nuages.', [
        ['windRun', { power: -3.5 }],
        ['crumbleBridge', { len: 12, delay: 0.45 }],
        REST('SYNCHRONISATION…', null, true),
      ]),
      Z('Le sommet', 'Grimpe au sommet du nuage.', [
        ['tower', { h: 10 }],
        ['secret', {}],
      ]),
    ] },
    // 4-4 Le mot de passe
    { h: 13, zones: [
      Z('La connexion', 'Le bon mot de passe ouvre la bonne porte.', [
        REST('IDENTIFIANT : OSWEL', 'Il paraît que « 1234 » est un excellent mot de passe.'),
        ['doorTrio', { label: 'MOT DE PASSE' }],
        ['levers', { g: 0 }],
      ]),
      Z('Le chiffrement', 'Les couleurs basculent à chaque saut ; les lasers gardent la porte.', [
        ['kqHop', {}],
        ['laserRun', { list: [[2.2, 0.5, 0], [1.8, 0.5, 0.9]] }],
        REST('DOUBLE AUTHENTIFICATION ✓', null, true),
      ]),
      Z('Le coffre-fort', 'Une caisse, un bouton, et un faux drapeau.', [
        ['crateBtn', {}],
        ['fakeFlag', {}],
      ]),
    ], exitLabel: 'K7#vQ2!pL' },
    // 4-5 L'API
    { h: 14, zones: [
      Z('La requête', 'Les plateformes portent la requête ; le bon portail la livre.', [
        REST('GET /oswel', 'Il paraît que l\'API répond toujours tout de suite.'),
        ['platRide', { n: 2, speed: 1.6 }],
        ['portalPick', {}],
      ]),
      Z('La réponse', 'Ici, la gravité est inversée : on marche au plafond.', [
        ['flipRoom', {}],
        ['turrets', {}],
        REST('200 OK', null, true),
      ]),
      Z('Le client', 'Le ventilateur te monte jusqu\'au client.', [
        ['fanLift', {}],
        ['gaps', { steps: [[2, 3, 2], [3, 2, 3], [2, 3, 1]] }],
      ]),
    ], exitLabel: 'CLIENT' },
    // 4-6 L'IA apprend
    { h: 14, zones: [
      Z('L\'apprentissage', 'Gravité inversée et lasers : l\'IA observe.', [
        REST('IA · ENTRAÎNEMENT 98 %', 'Il paraît que l\'IA ne se trompe jamais.'),
        ['flipRoom', {}],
        ['laserRun', {}],
      ]),
      Z('Le biais', 'L\'IA a inversé tes commandes. Et les couleurs basculent.', [
        ['invertRun', {}],
        ['kqHop', {}],
        REST('DONNÉES VÉRIFIÉES', null, true),
      ]),
      Z('La généralisation', 'Vent contraire, porte pressée.', [
        ['windRun', { power: -3.5 }],
        ['timedGate', { dist: 12, time: 2.2 }],
      ]),
    ] },
    // 4-7 Git commit
    { h: 14, zones: [
      Z('Le dépôt', 'Compile pour construire le pont ; les couleurs suivent tes sauts.', [
        REST('git init', 'Il paraît qu\'on peut toujours revenir en arrière… sans commit.'),
        ['compileBridge', { rate: 0.2 }],
        ['kqHop', {}],
      ]),
      Z('Les branches', 'Un levier change de branche : un chemin s\'ouvre, l\'autre se ferme.', [
        ['levers', { g: 0 }],
        ['glitchSeq', { n: 8 }],
        REST('git merge', null, true),
      ]),
      Z('Le push', 'Deux chemins avant le push.', [
        ['fork', {}],
        ['secret', {}],
      ]),
    ] },
    // 4-8 Open source
    { h: 14, zones: [
      Z('Le code ouvert', 'Ici, beaucoup de murs sont ouverts… et beaucoup de cadeaux sont faux.', [
        REST('LICENCE LIBRE', 'Il paraît que l\'open source, c\'est n\'importe quoi.'),
        ['secret', { extra: true }],
        ['fakeCoins', {}],
      ]),
      Z('Les contributions', 'Plafond et vent : chacun apporte sa difficulté.', [
        ['flipRoom', {}],
        ['windRun', { power: -3 }],
        REST('PULL REQUEST ACCEPTÉE', null, true),
      ]),
      Z('La communauté', 'Trois portes, une seule fusionne.', [
        ['doorTrio', {}],
        ['secret', {}],
      ]),
    ] },
    // 4-9 Imaginer pour les autres (difficile, avec POURSUITE)
    { h: 14, zones: [
      Z('L\'idée', 'Tout le Nexus à la fois : plafond, couleurs.', [
        REST('DESIGN THINKING · 1. COMPRENDRE', 'Il paraît que les utilisateurs savent toujours ce qu\'ils veulent.'),
        ['flipRoom', {}],
        ['kqHop', {}],
      ]),
      Z('Le prototype', 'Portails, lasers, commandes inversées.', [
        ['portalPick', {}],
        ['laserRun', { list: [[1.8, 0.5, 0], [1.6, 0.5, 0.6], [1.8, 0.5, 1.2]] }],
        ['invertRun', {}],
        REST('TEST UTILISATEUR', null, true),
      ]),
      Z('L\'effondrement', 'LE NEXUS S\'EFFONDRE ! Cours !', [
        ['chase', { kind: 'collapse', speed: 6, collapse: true, sign: '⚠ INSTABILITÉ DIMENSIONNELLE' }],
        REST('ÎLOT STABLE', null, false),
      ]),
      Z('Pour les autres', 'Grimpe, puis laisse-toi porter.', [
        ['tower', { h: 10 }],
        ['fanLift', {}],
      ]),
    ] },
  ],

  /* =================================================================
     MONDE 5 — OSWEL CITY : une grande ville, quartier après quartier
     ================================================================= */
  5: [
    // 5-1 Le premier client
    { h: 13, zones: [
      Z('Le carrefour', 'Les voitures arrivent du fond. Saute-les, ou abrite-toi sous l\'abribus.', [
        REST('RUE DU CLIENT · N°12', 'Il paraît que les voitures s\'arrêtent pour toi.'),
        ['street', {}],
        ['crushers', { n: 2 }],
      ]),
      Z('Les toits', 'Le client habite tout en haut.', [
        ['rooftops', {}],
        ['secret', {}],
      ]),
    ], exitLabel: 'CLIENT' },
    // 5-2 Le devis
    { h: 13, zones: [
      Z('Le chantier', 'Les palettes des grues bougent ; les scies tournent.', [
        REST('CHANTIER · CASQUE OBLIGATOIRE', 'Il paraît qu\'un devis, c\'est juste un chiffre au hasard.'),
        ['platRide', { n: 2 }],
        ['saws', { list: ['up', 'pit'] }],
      ]),
      Z('L\'étage', 'Les marteaux-piqueurs tapent en rythme.', [
        MEET('PLANS VALIDÉS PAR L\'ARCHITECTE', 'lionnel'),
        ['rooftops', { steps: [[2, 4, 2], [3, 3, 3], [2, 4, 2]] }],
        ['pistons', { n: 4, dph: 0.45 }],
        ['secret', {}],
      ]),
    ], dialogs: {
      lionnel: { lines: ['Salut cousin ! Je suis rentré du Canada exprès pour voir ton chantier.', 'Là-bas, je suis architecte. Avant de poser une seule brique, je dessine le plan. Et toi, avant de coder, tu dessines quoi ?', 'Un bon devis, c\'est un plan avec des prix : ce qu\'on va faire, combien ça coûte, et pour quand.'],
        alt: ['Sur un chantier, on regarde où on met les pieds… et au-dessus de sa tête aussi.', 'Les marteaux-piqueurs tapent en rythme. Compte « un, deux », puis passe.'] },
    } },
    // 5-3 Le prix juste
    { h: 13, zones: [
      Z('Le marché', 'Traverse la rue, puis cours avant que la porte se referme.', [
        REST('MARCHÉ CENTRAL · PRIX JUSTE', 'Il paraît que le moins cher est toujours le meilleur.'),
        ['street', {}],
        ['timedGate', { dist: 12, time: 2.3 }],
      ]),
      Z('L\'entrepôt', 'Une caisse sur le bouton, des bidons inflammables.', [
        ['crateBtn', {}],
        ['barrels', { n: 2 }],
        REST('FACTURE PAYÉE ✓', null, true),
      ]),
      Z('La livraison', 'Les toits jusqu\'au client.', [
        MEET('RESTAURANT · PLAT DU JOUR', 'nadia'),
        ['rooftops', {}],
        ['fakeCoins', {}],
      ]),
    ], exitLabel: 'PRIX JUSTE', dialogs: {
      nadia: { lines: ['Oswel ! Tu passes au resto ? Aujourd\'hui : ndolé et plantains.', 'Le prix juste, c\'est quand le client est content… et que toi, tu gagnes quand même ta vie.', 'Si tu vends trop cher, personne ne vient. Trop bon marché, tu fermes à la fin du mois.'],
        alt: ['Méfie-toi des pièces qui ne flottent pas. Comme les clients qui partent sans payer !'] },
    } },
    // 5-4 Le budget
    { h: 13, zones: [
      Z('Les dépenses cachées', 'Certaines pièces ne valent rien. Le goudron est brûlant.', [
        REST('BUDGET · NE PAS DÉPASSER', 'Il paraît qu\'un budget, ça se dépasse toujours un peu.'),
        ['fakeCoins', {}],
        ['heatRun', { n: 3, period: 3 }],
      ]),
      Z('La rue commerçante', 'La rue, puis une caisse pour monter.', [
        MEET('RESTAURANT DE NADIA · OUVERT', 'nadia'),
        ['street', {}],
        ['crateStep', {}],
        REST('ÉCONOMIES : +20 %', null, true),
      ]),
      Z('La banque', 'Les portes blindées se referment.', [
        ['presses', { n: 2 }],
        ['secret', {}],
      ]),
    ], dialogs: {
      nadia: { lines: ['Au restaurant, je note tout : ce qu\'on achète, ce qu\'on vend. Sinon, à la fin du mois, il ne reste rien.', 'Un budget, c\'est simple : ce qui rentre doit être plus grand que ce qui sort.', 'Et on garde toujours un peu de côté pour les imprévus. Le gaz, le frigo qui tombe en panne…'],
        alt: ['Le goudron est brûlant à midi : il rougit juste avant. Attends qu\'il refroidisse.'] },
    } },
    // 5-5 Le planning
    { h: 14, zones: [
      Z('Le diagramme', 'Construis le pont, puis tiens le délai !', [
        REST('PLANNING · LIVRAISON VENDREDI', 'Il paraît qu\'on a toujours plus de temps qu\'on croit.'),
        ['compileBridge', { rate: 0.2 }],
        ['timedGate', { dist: 13, time: 2.3 }],
      ]),
      Z('Les retards', 'Le chantier prend du retard : les blocs tombent, les scies tournent.', [
        ['crushers', { n: 3 }],
        ['saws', { list: ['pit', 'up'] }],
        REST('JALON N°3 ✓', null, true),
      ]),
      Z('La livraison', 'Traverse le boulevard pour livrer.', [
        ['street', { speed: 8 }],
        ['gaps', { steps: [[2, 3, 2], [3, 3, 1], [2, 3, 2]] }],
      ]),
    ], exitLabel: 'LIVRAISON' },
    // 5-6 Le portfolio
    { h: 14, zones: [
      Z('Les toits de Douala', 'Le vent souffle là-haut.', [
        REST('PORTFOLIO · PROJET N°1', 'Il paraît qu\'un portfolio, c\'est juste une liste.'),
        ['rooftops', {}],
        ['windRun', { power: -3 }],
      ]),
      Z('La grue', 'Les palettes, puis la tour en construction.', [
        MEET('IMMEUBLE EN CONSTRUCTION · ARCHITECTE : LIONNEL', 'lionnel'),
        ['platRide', { n: 3, speed: 1.7 }],
        ['tower', { h: 10 }],
        REST('PROJET N°2 · EN LIGNE', null, true),
      ]),
      Z('La vitrine', 'Deux chemins pour présenter ton travail.', [
        ['fork', {}],
        ['secret', {}],
      ]),
    ], dialogs: {
      lionnel: { lines: ['Au Canada, quand je cherche un client, je ne lui raconte pas : je lui montre mes plans et mes maquettes.', 'Ton portfolio, c\'est pareil : tes meilleurs projets, bien présentés, avec ce que TU as fait.', 'Cette tour, c\'est mon dessin. Monte tout en haut, la vue est belle.'],
        alt: ['Sur la tour, monte en zigzag : une corniche à gauche, une à droite.'] },
    } },
    // 5-7 En ligne
    { h: 14, zones: [
      Z('Le serveur', 'Le bon portail mène au serveur ; les lasers le protègent.', [
        REST('HÉBERGEUR · 99,9 %', 'Il paraît qu\'un site en ligne n\'a plus besoin de rien.'),
        ['portalPick', {}],
        ['laserRun', {}],
      ]),
      Z('Les visiteurs', 'Les drones tirent ; la rue est encombrée.', [
        ['turrets', {}],
        ['street', {}],
        REST('1 000 VISITEURS !', null, true),
      ]),
      Z('Le nom de domaine', 'Trois portes : une seule est ton site.', [
        ['doorTrio', { label: 'MON SITE' }],
        ['gaps', { steps: [[2, 3, 2], [3, 2, 3], [2, 3, 1]] }],
      ]),
    ], exitLabel: 'MON SITE' },
    // 5-8 La maintenance
    { h: 14, zones: [
      Z('Les réparations', 'Ce qui est vieux casse : passe vite.', [
        REST('MAINTENANCE · MISE À JOUR', 'Il paraît qu\'un site terminé n\'a jamais besoin de réparations.'),
        ['crumbleBridge', { len: 12, delay: 0.4 }],
        ['pistons', { n: 4, dph: 0.4 }],
      ]),
      Z('La salle des machines', 'Bidons, presses, leviers.', [
        ['barrels', { n: 3 }],
        ['presses', { n: 2, period: 2.6 }],
        ['levers', { g: 0 }],
        REST('SAUVEGARDE OK', null, true),
      ]),
      Z('La mise à jour', 'Le goudron brûle, les blocs tombent.', [
        ['heatRun', { n: 3, period: 2.8, dph: 0.5 }],
        ['crushers', { n: 3 }],
      ]),
    ] },
    // 5-9 La réputation (difficile, avec POURSUITE)
    { h: 14, zones: [
      Z('Les rumeurs', 'Faux drapeaux, fausses pièces : on ne croit pas tout ce qu\'on voit.', [
        REST('AVIS CLIENTS · 4,8 ★', 'Il paraît que la réputation, ça ne compte pas.'),
        ['fakeFlag', {}],
        ['fakeCoins', {}],
      ]),
      Z('Les apparences', 'Trois portes, un mur secret, un sol piégé.', [
        ['doorTrio', {}],
        ['secret', {}],
        ['troll', { at: 7, w: 3 }],
        REST('RECOMMANDÉ PAR 12 CLIENTS', null, true),
      ]),
      Z('L\'effondrement', 'LA RUMEUR FAIT TOUT S\'EFFONDRER ! Cours !', [
        ['chase', { kind: 'collapse', speed: 6.2, collapse: true, sign: '⚠ FAUSSES NOUVELLES' }],
        REST('LA VÉRITÉ', null, false),
      ]),
      Z('La confiance', 'Les toits, puis le dernier chantier.', [
        ['rooftops', {}],
        ['crushers', { n: 3 }],
      ]),
    ] },
  ],
};

})();

/* =================================================================
   LES BOSS : une fois le boss vaincu, son repaire s'effondre.
   Dernière phase = LA FUITE : une poursuite, un instant pour souffler,
   un dernier piège, et la vraie sortie. (On reprend au début de la
   fuite si on tombe : on ne refait jamais le combat.)
   ================================================================= */
(function () {
const Z = (name, goal, secs, extra) => Object.assign({ name, goal, secs }, extra || {});
const REST = (sign, rumeur, cp) => ['rest', { sign, rumeur, cp }];
const LONG = [[2, 6, 1], [3, 5, 1], [2, 4, 2], [3, 6, 1], [2, 5, 1], [3, 5, 2], [2, 6, 1], [3, 8, 1]];
OT.BOSS_ESCAPES = {
  1: { h: 12, escape: true, par: 110, exitLabel: 'DEHORS', arenaLabel: 'GARDIEN',
    approach: [Z('L\'antichambre', 'Le Gardien t\'attend au fond de l\'atelier : traverse ses dernières défenses.', [
      REST('ANTICHAMBRE · ACCÈS RESTREINT', 'Il paraît que le Gardien dort pendant la pause.'),
      ['saws', { list: ['pit', 'up'], speed: 3 }],
      ['heatRun', { n: 2, period: 2.6, dph: 0.6 }],
      ['crushers', { n: 2 }],
    ])],
    escapeSay: 'Le Gardien s\'éteint… et la forge s\'effondre ! COURS !',
    escapeGoal: 'La forge s\'effondre : cours jusqu\'à la porte DEHORS !',
    zones: [Z('La forge s\'effondre', 'Le Gardien est vaincu, mais sa forge s\'écroule : cours jusqu\'à la sortie !', [
      ['chase', { kind: 'lava', speed: 5.8, sign: '⚠ LA FORGE S\'EFFONDRE', steps: LONG }],
      REST('ZONE SÛRE · LE GARDIEN DORT', null, true),
      ['hammers', { n: 2, space: 8, py: 6, period: 2.2 }],
    ])] },
  2: { h: 12, escape: true, par: 125, exitLabel: 'REDÉMARRER', arenaLabel: 'LE BUG',
    approach: [Z('Le noyau', 'Le Bug se cache au cœur du système : rejoins-le.', [
      REST('ROOT://NOYAU', 'Il paraît que le Bug est une fonctionnalité.'),
      ['platRide', { n: 2 }],
      ['linkPick', { bad: 'noyau.exe.zip', good: 'noyau.exe' }],
      ['turrets', {}],
    ])],
    escapeSay: 'Le Bug est corrigé… mais le système plante ! COURS !',
    escapeGoal: 'Le système plante : atteins la porte REDÉMARRER avant le virus !',
    zones: [Z('Le plantage', 'Le Bug est corrigé, mais tout le système plante : cours !', [
      ['chase', { kind: 'virus', speed: 5.8, sign: '⚠ ÉCRAN BLEU', steps: [[2, 6, 1], [3, 5, 2], [2, 5, 1], [3, 4, 2], [2, 6, 1], [3, 5, 1], [2, 4, 2], [3, 8, 1]] }],
      REST('MODE SANS ÉCHEC', null, true),
      ['glitchSeq', { n: 6, period: 2.4 }],
    ])] },
  3: { h: 12, escape: true, par: 145, exitLabel: 'SORTIE DE SECOURS', arenaLabel: 'EXAMEN',
    approach: [Z('Le couloir de l\'examen', 'La salle d\'examen est au bout du couloir. Pas de triche !', [
      REST('SALLE D\'EXAMEN · SILENCE', 'Il paraît que l\'examen est facile.'),
      ['beltAcid', {}],
      ['presses', { n: 2, period: 2.5 }],
      ['gooBoost', {}],
    ])],
    escapeSay: 'Examen réussi… mais la cuve d\'acide déborde ! COURS !',
    escapeGoal: 'L\'acide déborde : file vers la SORTIE DE SECOURS !',
    zones: [Z('L\'alarme du labo', 'L\'examen est réussi, mais la cuve d\'acide déborde : cours !', [
      ['chase', { kind: 'acid', speed: 5.8, sign: '⚠ ÉVACUATION DU LABO', steps: LONG }],
      REST('DOUCHE DE SÉCURITÉ', null, true),
      ['laserRun', { list: [[1.8, 0.5, 0], [1.6, 0.5, 0.6]] }],
    ])] },
  4: { h: 12, escape: true, par: 135, exitLabel: 'RETOUR', arenaLabel: 'ZEUS',
    approach: [Z('L\'escalier du ciel', 'Zeus attend au sommet du Nexus : monte jusqu\'à lui.', [
      REST('OLYMPE · ACCÈS RÉSERVÉ', 'Il paraît que Zeus ne se trompe jamais.'),
      ['windRun', { power: -3 }],
      ['portalPick', {}],
      ['fanLift', {}],
    ])],
    escapeSay: 'Zeus a compris… mais le Nexus se referme ! COURS !',
    escapeGoal: 'Le Nexus se referme : rejoins la porte RETOUR !',
    zones: [Z('Le Nexus se referme', 'Zeus a compris, mais le Nexus se referme : cours !', [
      ['chase', { kind: 'collapse', speed: 5.8, collapse: true, sign: '⚠ LE NEXUS SE REFERME', steps: LONG }],
      REST('ÎLOT STABLE', null, true),
      ['gaps', { steps: [[2, 3, 2], [3, 2, 3], [2, 3, 1]] }],
    ])] },
  5: { h: 14, escape: true, par: 170, exitLabel: 'LA VILLE', arenaLabel: 'THE CORE',
    approach: [Z('La tour de The Core', 'The Core contrôle la ville depuis sa tour : monte jusqu\'à lui.', [
      REST('TOUR THE CORE · ÉTAGE 1', 'Il paraît que The Core dit toujours la vérité.'),
      ['street', {}],
      ['fakeCoins', {}],
      ['crushers', { n: 2 }],
    ])],
    escapeSay: 'The Core s\'éteint… et la tour s\'effondre ! COURS !',
    escapeGoal: 'La tour s\'effondre : redescends vers LA VILLE !',
    zones: [Z('La tour s\'effondre', 'The Core s\'éteint, et sa tour s\'effondre : cours !', [
      ['chase', { kind: 'collapse', speed: 5.8, collapse: true, sign: '⚠ LA TOUR S\'EFFONDRE', steps: LONG }],
      REST('LA VÉRITÉ', null, true),
      ['rooftops', {}],
    ])] },
};
})();

/* Temps de référence des grands niveaux (médaille d'or ; argent = 1,6 ×). Calculés à partir du
   robot de test (qui connaît le niveau par cœur et ne s'arrête jamais) × 1,5, arrondis à 5 s.
   Un premier passage normal prend bien plus longtemps : c'est le temps d'une partie maîtrisée. */
OT.LEVEL_PARS = {
  '1-1': 45, '1-2': 50, '1-3': 60, '1-4': 65, '1-5': 85, '1-6': 55, '1-7': 60, '1-8': 70, '1-9': 80, '1-10': 70,
  '2-1': 40, '2-2': 35, '2-3': 50, '2-4': 50, '2-5': 40, '2-6': 50, '2-7': 65, '2-8': 60, '2-9': 70, '2-10': 80,
  '3-1': 40, '3-2': 60, '3-3': 50, '3-4': 55, '3-5': 55, '3-6': 65, '3-7': 45, '3-8': 55, '3-9': 80, '3-10': 95,
  '4-1': 40, '4-2': 40, '4-3': 55, '4-4': 50, '4-5': 55, '4-6': 55, '4-7': 65, '4-8': 50, '4-9': 80, '4-10': 85,
  '5-1': 40, '5-2': 65, '5-3': 55, '5-4': 55, '5-5': 55, '5-6': 65, '5-7': 45, '5-8': 55, '5-9': 60, '5-10': 140,
};

// version 1.5 : les modules (js/pieges3.js, js/coop.js, js/gadgets.js, js/secrets.js, js/combat.js…) peuvent
// compléter un plan JUSTE AVANT sa construction, sans modifier ce fichier :
//   (OT.PLAN_TRANSFORMS = OT.PLAN_TRANSFORMS || []).push((monde, index, plan, estBoss) => { … });
// (pour un boss, « plan » est son entrée de OT.BOSS_ESCAPES : approach = l'antichambre, zones = la fuite)
OT.PLAN_TRANSFORMS = OT.PLAN_TRANSFORMS || [];
function planTransforms(w, i, plan, boss) {
  for (const f of OT.PLAN_TRANSFORMS) {
    try { f(+w, i, plan, boss); } catch (e) { console.error('Module du plan ' + w + '-' + (i + 1) + ' :', e); }
  }
}
OT.applyPlans = function () {
  for (const w in OT.EXT_PLANS) {
    const W = OT.WORLD_DATA[w]; if (!W) continue;
    OT.EXT_PLANS[w].forEach((plan, i) => {
      if (!plan || !W.levels[i] || W.levels[i].boss) return;
      // version 1.4 : les rencontres de l'histoire (Isaïe, Kevin, Tchanko, NEXA…) et les phrases de zone
      if (OT.storyForPlan) { try { OT.storyForPlan(+w, i, plan); } catch (e) { console.error('Histoire ' + w + '-' + (i + 1), e); } }
      planTransforms(w, i, plan, false);
      try { OT.Sections.extend(W.levels[i], plan); } catch (e) { console.error('Plan du niveau ' + w + '-' + (i + 1) + ' :', e); }
    });
  }
  for (const w in OT.BOSS_ESCAPES) {
    const W = OT.WORLD_DATA[w], lv = W && W.levels.find((l) => l.boss);
    if (!lv) continue;
    planTransforms(w, W.levels.indexOf(lv), OT.BOSS_ESCAPES[w], true);
    try { OT.Sections.extend(lv, OT.BOSS_ESCAPES[w]); } catch (e) { console.error('Fuite du boss ' + w + ' :', e); }
  }
  for (const w in OT.WORLD_DATA) OT.WORLD_DATA[w].levels.forEach((lv, i) => {
    const par = OT.LEVEL_PARS[w + '-' + (i + 1)], plan = OT.EXT_PLANS[w] && OT.EXT_PLANS[w][i];
    if (par && lv.build && lv.build.extended) lv.par = par + ((plan && plan.parBonus) || 0);
  });
};
OT.applyPlans();
