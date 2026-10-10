/* =====================================================================
   OSWEL'S TRAP — histoire.js  (version 1.4)
   L'HISTOIRE ENRICHIE.
   Les dialogues d'origine sont GARDÉS (ils sont dans data.js et
   world2.js … world5.js). Ce fichier AJOUTE :
     - les nouveaux personnages : Isaïe (l'ami du lycée), Kevin et Tchanko
       (la période mécatronique), NEXA (qui en sait plus que toi) ;
     - des répliques avant les niveaux (intro), après les niveaux (outro),
       avant et après les boss ;
     - des rencontres dans les coins calmes des grands niveaux (MEET) ;
     - des phrases quand on entre dans une zone, quand on trouve un secret ;
     - la mémoire narrative (un personnage peut rappeler un monde passé) ;
     - la relation Francheska / Oswel, par petites touches, jamais dite
       franchement ;
     - la fin : « Le voyage ne s'arrête pas ici. »
   Format d'une réplique : [personnage, texte] ou [personnage, texte, { if: 'w1', emotion: 'happy' }]
   ===================================================================== */
window.OT = window.OT || {};

/* ---------- 1. Les nouveaux personnages ---------- */
Object.assign(OT.CHARACTERS, {
  isaie: { name: 'Isaïe', color: 0x2f9e6e, hat: 0x163a2a, hatType: 'band',
    profile: { title: 'Ami depuis le lycée', about: "Isaïe connaît Oswel depuis le lycée. Il l'a vu démonter des stylos, des radios, puis des moteurs. Il se moque un peu… et il est toujours là.",
      look: 'Survêtement vert, bandeau sur la tête, sourire en coin.', mind: 'Taquin, fidèle, il rappelle toujours d\'où on vient.', quote: 'Au lycée, tu démontais déjà les stylos.', met: '1-1' } },
  kevin: { name: 'Kevin', color: 0xff9f1a, hat: 0x222222, hatType: 'cap',
    profile: { title: 'La période mécatronique', about: "Kevin, c'est l'énergie de l'atelier de mécatronique : il touche à tout, parle fort et lance des défis à tout le monde.",
      look: 'Bleu de travail orange, casquette noire.', mind: 'Énergique, spontané, un peu provocateur.', quote: 'Les machines ont un cerveau. Et parfois, il est plus malin que toi !', met: '1-6' } },
  tchanko: { name: 'Tchanko', color: 0x4a5a7a, hat: 0x1a1c21, hatType: 'short', glasses: true,
    profile: { title: 'La période mécatronique', about: "Tchanko parle peu, mais chaque mot compte. Il vérifie tout deux fois et explique en une phrase ce que Kevin dit en dix.",
      look: 'Blouse gris acier, petites lunettes rondes.', mind: 'Calme, précis, pince-sans-rire.', quote: 'Un capteur mesure. Un contrôleur décide. Un actionneur agit.', met: '1-6' } },
  nexa: { name: 'NEXA', color: 0xb78cff, char: 'nexa', ui: 0xc9a6ff,
    profile: { title: 'Celle qui relie les mondes', about: "NEXA apparaît là où on ne l'attend pas. Elle semble savoir ce qui t'attend… et elle ne dit jamais tout.",
      look: 'Voyageuse des portails, lumière violette.', mind: 'Mystérieuse, calme, presque omnisciente.', quote: 'Le voyage ne s\'arrête pas ici.', met: '4-1' } },
});

/* ---------- 2. Ce que chaque niveau ajoute ----------
   intro  : répliques AJOUTÉES à la fin de l'intro existante (avant de jouer)
   pre    : répliques AJOUTÉES au début de l'intro existante
   outro  : 1 ou 2 répliques dites (en voix et sous-titres) à la victoire, sans bloquer
   end    : pour un boss, la conclusion (boîte de dialogue) avant l'écran de résultats
   escape : pour un boss, ce qu'on entend quand le repaire s'effondre
   meet   : une rencontre dans un coin calme d'un grand niveau
            { zone: n° de zone (0 = première zone ajoutée), npc, sign, lines, alt }
   zone   : { n° de zone : [personnage, texte] } dit en entrant dans la zone
   secret : [personnage, texte] dit en découvrant la salle secrète du niveau
   remember : souvenir gardé quand le niveau est terminé (mémoire narrative) */
OT.STORY = {
  /* ======================= MONDE 1 — LA FORGE ======================= */
  '1-1': {
    intro: [['oswel', 'Bon… allons-y.']],
    outro: [['patou', 'Pas mal pour un premier jour. Demain, on recommence.']],
    meet: { zone: 0, npc: 'isaie', sign: 'VESTIAIRE · VISITEURS',
      lines: ["Alors, le mécano ? Premier jour et déjà de la graisse jusqu'aux coudes.", "Au lycée, tu démontais déjà les stylos. Là, au moins, ce sont de vraies machines.", "Je passe juste voir si tu tiens le coup. Ne tombe pas devant ton oncle."],
      alt: ["Tu tombes ? Normal. Au lycée aussi, tu tombais. Et tu te relevais toujours."] },
    secret: ['oswel', 'Tiens… un passage derrière le mur.'],
  },
  '1-2': {
    intro: [['oswel', 'Démonter… ça, je sais faire.'], ['patou', 'Démonter, tout le monde sait. Remonter, on verra.']],
    outro: [['patou', 'Tu vois ? Démonter, c\'est déjà comprendre.']],
  },
  '1-3': {
    outro: [['franck', 'On a tourné ensemble, cousin. Comme des engrenages.']],
  },
  '1-4': {
    outro: [['patou', 'La panne n\'était pas là où ça faisait du bruit. Retiens-le.']],
    meet: { zone: 1, npc: 'isaie', sign: 'PAUSE · CAFÉ TIÈDE',
      lines: ["Ton oncle dit que tu écoutes les moteurs comme d'autres écoutent de la musique.", "Moi, j'entends juste du bruit. Toi, tu entends une panne. C'est bizarre… mais c'est impressionnant."],
      alt: ["Respire. Un moteur, ça se répare. Toi aussi."] },
  },
  '1-5': {
    intro: [['oswel', 'Les pistons… attends. Regarde. Passe.']],
    outro: [['patou', 'Au dixième de millimètre. Bien.']],
  },
  '1-6': {
    pre: [['kevin', 'Hé, le nouveau ! Bienvenue en mécatronique. Ici, les machines ont un cerveau. Et parfois, il est plus malin que toi !'],
      ['tchanko', 'Kevin parle beaucoup. Retiens juste ça : un capteur mesure, un contrôleur décide, un actionneur agit.']],
    outro: [['kevin', 'T\'as survécu au courant ! Bienvenue en mécatronique, pour de vrai.']],
    meet: { zone: 0, npc: 'tchanko', sign: 'ATELIER MÉCATRONIQUE',
      lines: ['Un fil rouge ne veut rien dire tout seul. Regarde où il va.', 'Le courant prend toujours le chemin le plus facile. Toi, ne fais pas pareil.'],
      alt: ['Coupe le courant. Puis cours. Dans cet ordre.'] },
  },
  '1-7': {
    intro: [['oswel', 'Il est écrit de ne pas ouvrir…'], ['oswel', '…donc je vais ouvrir.']],
    outro: [['romeo', 'Tu as ouvert. Évidemment. Je t\'ai bien appris.']],
  },
  '1-8': {
    outro: [['tchanko', 'Entrée, calcul, sortie. Tu as compris le boîtier.']],
    meet: { zone: 0, npc: 'kevin', sign: 'SALLE DES AUTOMATES',
      lines: ["Ce boîtier noir, c'est un automate. Moi, je l'ai ouvert une fois. Il a fait des étincelles.", "Le prof aussi a fait des étincelles. Mais pas les mêmes.", "Tchanko dit qu'il lit les entrées, qu'il calcule, et qu'il commande les sorties. Moi je dis qu'il a un caractère."],
      alt: ["T'inquiète, moi aussi je suis tombé. Plusieurs fois. Aujourd'hui."] },
  },
  '1-9': {
    intro: [['isaie', 'Tu te rends compte ? Au lycée, tu voulais réparer des voitures. Maintenant, tu regardes des écrans.'],
      ['oswel', 'L\'écran me dit ce que la voiture ne dit pas.']],
    outro: [['christine', 'Tu as vérifié au lieu de croire. C\'est ça, le secret.']],
    zone: { 2: ['kevin', 'COURS ! La coulée arrive, ne te retourne pas !'] },
    meet: { zone: 1, npc: 'tchanko', sign: 'POSTE DE CONTRÔLE',
      lines: ["L'écran affiche ce que les capteurs mesurent. Si un capteur ment, l'écran ment aussi.", 'Avant de croire un message, vérifie d\'où il vient.'],
      alt: ['Retiens les messages qui étaient vrais. Oublie les autres.'] },
  },
  '1-10': {
    intro: [['kevin', 'Vas-y ! On a parié sur toi. Enfin, moi, j\'ai parié sur toi.'], ['tchanko', 'Moi, j\'ai parié sur le Gardien. Statistiquement.']],
    escape: [['isaie', 'Il est tombé ! Mais la forge s\'écroule : cours, Oswel !']],
    end: [['isaie', 'Tu l\'as fait. La forge est tombée et toi, tu es debout.'],
      ['patou', 'Tu vois ? Il ne voulait pas te détruire. Il voulait savoir si tu avais compris.'],
      ['kevin', 'Et maintenant ? Tu vas où, le mécano ?'],
      ['oswel', 'Je veux comprendre ce qui décide à la place des machines.'],
      ['tchanko', 'Alors il te faut un clavier.']],
    remember: 'w1',
  },

  /* ======================= MONDE 2 — LE CODE ======================= */
  '2-1': {
    intro: [['tony', 'Commence par comprendre la logique. Le reste viendra.']],
    outro: [['tony', 'Ton premier programme. Garde-le : un jour, il te fera sourire.']],
  },
  '2-2': {
    outro: [['yannick', 'Bon. Tu n\'as fait qu\'une faute de frappe. Je recompte quand même.']],
  },
  '2-3': {
    outro: [['tony', 'Ouvert, fermé. Une promesse tenue.']],
  },
  '2-4': {
    outro: [['youmbi', 'Le style, c\'est l\'apparence. Mais ce qui compte, c\'est ce qu\'il y a dessous.']],
    meet: { zone: 1, npc: 'tony', sign: 'SALLE DE COURS · B12',
      lines: ['Un bug n\'est pas toujours ton ennemi.', 'Souvent, c\'est un professeur qui parle mal. Il faut apprendre à l\'écouter.'],
      alt: ['Quand tu bloques, relis ton code à voix haute. La machine, elle, lit tout.'] },
  },
  '2-5': {
    outro: [['yannick', 'Pas mal… pour un mécanicien.']],
  },
  '2-6': {
    outro: [['tony', 'SI tu persévères, ALORS tu avances. Il n\'y a pas de SINON.']],
    meet: { zone: 0, npc: 'tony', sign: 'BUREAU DE TONY · PORTE OUVERTE',
      lines: ['Tu dois apprendre à raisonner autrement. La machine ne devine rien : elle exécute.', 'Si ça plante, c\'est que tu lui as demandé de planter. Sans le vouloir. Bienvenue dans le métier.'],
      alt: ['Lis la condition. Elle est vraie, ou elle est fausse. Il n\'y a pas de peut-être.'] },
  },
  '2-7': {
    outro: [['youmbi', 'Notre premier projet ! Il marche !'], ['tony', 'Il marche. Maintenant, il faut qu\'il dure.']],
  },
  '2-8': {
    outro: [['brayan', 'Erreur 404 réglée. La page existait bien. Elle se cachait.']],
  },
  '2-9': {
    outro: [['brayan', 'Derrière chaque page, des données. Derrière les données, des gens. N\'oublie jamais les gens.']],
    meet: { zone: 1, npc: 'samuel', sign: 'SALLE DES SERVEURS · NE PAS TOUCHER',
      lines: ['Tu souris à ton téléphone depuis tout à l\'heure. Ce n\'est pas le code qui te fait sourire comme ça.', 'Bon, bon. Je ne dis rien. Les serveurs non plus.'],
      alt: ['Concentre-toi. Tu souriras plus tard.'] },
    secret: ['nexa', 'Tu ne me connais pas encore. Moi, je te connais.'],
  },
  '2-10': {
    pre: [['tony', 'Rappelle-toi : un bug n\'est pas toujours ton ennemi. Celui-là… si.']],
    escape: [['tony', 'Corrigé ! Mais le système plante : sauvegarde tes idées et cours !']],
    end: [['tony', 'Tu as lu les logs, tu as compris, tu as corrigé. Tu es un développeur, maintenant.'],
      ['oswel', 'Grâce à toi.'],
      ['tony', 'Grâce à ta patience. Moi, je t\'ai seulement montré la porte.'],
      ['yannick', 'La prochaine fois, c\'est moi qui le trouve en premier.']],
    remember: 'w2',
  },

  /* ======================= MONDE 3 — LE LABORATOIRE ======================= */
  '3-1': {
    outro: [['ange', 'Tu vois ? On s\'est perdus ensemble, mais on est arrivés.']],
    meet: { zone: 0, npc: 'isaie', sign: 'CAMPUS · ACCUEIL',
      lines: [['Tu te souviens de la Forge ?', { if: 'w1' }], ['J\'aurais préféré oublier… non, je rigole.', { who: 'oswel', if: 'w1' }], 'L\'université, hein ? Le garçon qui démontait les stylos est devenu étudiant ingénieur.', 'Je passe juste te voir. Ne te perds pas dans les couloirs.'],
      alt: ['Tu tombes, tu te relèves. Comme au lycée.'] },
  },
  '3-2': {
    outro: [['dimi', 'Une dérivée, c\'est une pente. Tu viens de la grimper.']],
  },
  '3-3': {
    outro: [['tsague', 'À l\'atelier tu réparais les câbles. Maintenant, tu sais ce qui passe dedans.']],
  },
  '3-4': {
    outro: [['junior', 'Petits sauts, grandes distances. Tu as compris l\'apesanteur.']],
  },
  '3-5': {
    outro: [['reine', 'Rien de vert n\'a été touché. Je suis fière de toi.']],
  },
  '3-6': {
    outro: [['kellia', 'L\'enzyme accélère. Les amis aussi.']],
    meet: { zone: 1, npc: 'kellia', sign: 'SALLE DE RÉVISION',
      lines: ['Ton téléphone a vibré trois fois pendant la révision.', 'Quelqu\'un pense à toi. Non, je n\'ai pas regardé qui. Promis.'],
      alt: ['Concentre-toi : le pont ne se construit pas tout seul… enfin, si, mais lentement.'] },
  },
  '3-7': {
    outro: [['annie', 'La chance, ça se calcule. Le travail, non. Et toi, tu travailles.']],
    secret: ['nexa', 'Chaque monde est une couche. Tu creuses dans la bonne direction.'],
  },
  '3-8': {
    outro: [['tsague', 'VRAI ET VRAI : ça fait VRAI. Bien joué.']],
  },
  '3-9': {
    intro: [['oswel', 'La mécanique, le code, la science… je commence à voir le lien.'], ['ange', 'C\'est ça, l\'ingénierie : tout relier.']],
    outro: [['ange', 'Le cahier des charges est respecté. L\'examen peut venir.']],
  },
  '3-10': {
    pre: [['oswel', 'OK… réfléchissons. Une question à la fois.']],
    escape: [['ange', 'Examen réussi ! Mais la cuve déborde : sors d\'ici !']],
    end: [['ange', 'Tu as réussi ! Pas par cœur : tu as compris.'],
      ['annie', 'Alors, les maths font toujours peur ?'],
      ['oswel', 'Elles ne font plus peur. Elles font… sens.'],
      ['dimi', 'Il a dit « sens ». C\'est officiel : on l\'a perdu.']],
    remember: 'w3',
  },

  /* ======================= MONDE 4 — NEXUS ======================= */
  '4-1': {
    intro: [['oswel', 'Euh… bonjour. On se connaît ?'], ['francheska', 'Peut-être. Peut-être pas encore.', { emotion: 'happy' }]],
    outro: [['francheska', 'Tu as sauté vers ce qui n\'existait pas encore. C\'est un bon début.']],
    meet: { zone: 0, npc: 'nexa', sign: '◇ NEXUS · POINT DE RENCONTRE',
      lines: ['Tu es enfin arrivé. Je t\'attendais depuis la Forge.', 'Qui je suis ? Quelqu\'un qui a déjà vu la fin de ton histoire. Enfin… une des fins.', 'Avance. Les réponses viennent en marchant.'],
      alt: ['Tombe autant qu\'il le faut. Le Nexus se souvient de chaque saut.'] },
  },
  '4-2': {
    outro: [['danie', 'Bonne adresse, bon portail. Tu as trouvé ton chemin.']],
  },
  '4-3': {
    outro: [['sandex', 'Le cloud, ce n\'est pas le ciel. Mais d\'en haut, la vue est belle.']],
    meet: { zone: 1, npc: 'nexa', sign: '◇ NUAGE · ZONE CALME',
      lines: ['Le cloud, ce sont des machines. Les machines, tu les connais depuis la Forge.', 'Tout est relié. Tu ne le vois pas encore… mais tu le sens, non ?'],
      alt: ['Les nuages s\'effacent. Toi, ne t\'efface pas.'] },
  },
  '4-4': {
    outro: [['ladyannee', 'Deux preuves valent mieux qu\'une. Retiens ça pour tes mots de passe.']],
  },
  '4-5': {
    outro: [['valdes', 'Requête, réponse. Le client est content, Black aussi. Enfin, je crois.']],
  },
  '4-6': {
    outro: [['ashley', 'Tu as battu l\'IA. Elle connaissait le chemin. Toi, tu savais pourquoi.']],
    meet: { zone: 1, npc: 'nexa', sign: '◇ SALLE D\'ENTRAÎNEMENT',
      lines: ['L\'IA a appris le chemin. Toi, tu apprends à en tracer un.', 'Ne la copie pas. Comprends-la. C\'est toute la différence.'],
      alt: ['Elle ne s\'arrête jamais. Toi, tu peux réfléchir. C\'est ton avantage.'] },
  },
  '4-7': {
    outro: [['reinedamso', 'Dernier commit enregistré. Tu peux tout casser demain : on reviendra ici.']],
  },
  '4-8': {
    outro: [['belvianne', 'Le code était ouvert. Et toi, tu l\'as lu. C\'est rare.']],
  },
  '4-9': {
    outro: [['danie', 'Ton frère t\'attend. Bonne chance… tu vas en avoir besoin.']],
    meet: { zone: 2, npc: 'francheska', sign: '◇ BELVÉDÈRE DU NEXUS',
      lines: ['Tu fronces toujours les sourcils quand tu réfléchis. Ça n\'a pas changé.', ['Tu me regardes réfléchir ?', { who: 'oswel' }], 'Je regarde ce qui m\'intéresse.', 'Quand tout ça sera fini, tu me montreras ce que tu as construit ?'],
      alt: ['Prends ton temps. Moi, j\'ai tout mon temps.'] },
  },
  '4-10': {
    intro: [['zeus', 'Et elle, c\'est qui ? … Ah. Je vois.'], ['francheska', 'Concentre-toi sur ton frère, Oswel.']],
    escape: [['nexa', 'Le Nexus se referme. Cours… la ville t\'attend.']],
    end: [['zeus', 'D\'accord. Tu as gagné. Cette fois.'],
      ['oswel', 'On construit la suite ensemble ?'],
      ['zeus', 'Ensemble. Mais c\'est moi qui choisis la musique.'],
      ['nexa', 'Tu as imaginé. Maintenant, il faudra construire.']],
    remember: 'w4',
  },

  /* ======================= MONDE 5 — OSWEL CITY ======================= */
  '5-1': {
    outro: [['christine', 'Premier client livré. Je l\'ai déjà dit à tout le quartier.']],
    zone: { 1: ['rumeur', 'On dit qu\'il n\'aura jamais de deuxième client…'] },
  },
  '5-2': {
    outro: [['lionnel', 'Un devis clair, un chantier tranquille. Tu deviens sérieux, cousin.']],
    zone: { 1: ['rumeur', 'On dit que ses prix sont inventés.'] },
  },
  '5-3': {
    outro: [['nadia', 'Le prix juste ! Le client est content, et toi tu manges ce soir.']],
    meet: { zone: 2, npc: 'nadia', sign: 'RESTO · TABLE DU FOND',
      lines: ['Je te garde la table du fond ce soir ? Pour deux, comme d\'habitude ?', ['… Comme d\'habitude.', { who: 'oswel' }], 'Je ne pose pas de questions. Je souris, c\'est tout.'],
      alt: ['File ! Le ndolé t\'attendra.'] },
    zone: { 1: ['rumeur', 'On dit qu\'il travaille pour rien.'] },
  },
  '5-4': {
    outro: [['tante', 'Tu as mis de côté avant de dépenser ? Alors tu es un homme, maintenant.']],
  },
  '5-5': {
    intro: [['tony', 'Tu te souviens de ton premier bug ? Regarde où tu en es.', { if: 'w2' }]],
    outro: [['tony', 'Une étape après l\'autre. C\'est comme ça qu\'on finit.']],
    zone: { 2: ['rumeur', 'On dit qu\'il ne tient jamais ses délais…'] },
  },
  '5-6': {
    outro: [['yannick', 'Ton portfolio est meilleur que le mien. Ne le répète pas.']],
    meet: { zone: 1, npc: 'kevin', sign: 'SALON DES PROJETS',
      lines: ['Hé ! Le mécano est devenu patron !', 'Tchanko a regardé ton portfolio deux fois. Il a dit « correct ». Chez lui, c\'est un compliment énorme.'],
      alt: ['Allez, montre-leur ce que la Forge t\'a appris !'] },
  },
  '5-7': {
    outro: [['brayan', 'En ligne ! Recharge la page autant que tu veux. Moi aussi, je l\'ai fait.']],
    zone: { 1: ['rumeur', 'On dit que son site va tomber en panne demain.'] },
  },
  '5-8': {
    outro: [['kellia', 'Un site entretenu, c\'est un site qui vit.']],
    meet: { zone: 1, npc: 'tchanko', sign: 'ATELIER DE MAINTENANCE',
      lines: ['La maintenance, c\'est comme à l\'atelier : un boulon qu\'on ne vérifie pas finit par lâcher.', 'Vérifie. Puis vérifie encore. Puis dors.'],
      alt: ['Ne t\'arrête pas sur le vieux pont. C\'est ce que j\'aurais dit à la Forge.', { if: 'w1' }] },
  },
  '5-9': {
    outro: [['zeus', 'Elle a tout dit sur toi. Et toi, tu as tout fait.']],
    meet: { zone: 1, npc: 'isaie', sign: 'PLACE DU QUARTIER',
      lines: ['Du lycée à ta propre ville. Je l\'ai toujours dit.', ['Tu disais que j\'allais finir garagiste.', { who: 'oswel' }], 'Garagiste de sites web. J\'avais presque raison.'],
      alt: ['La Rumeur parle fort. Moi, je te connais depuis le lycée.'] },
    zone: { 2: ['francheska', 'Ils parlent fort, la Rumeur et ses copains. Mais moi, je sais qui tu es.'] },
  },
  '5-10': {
    intro: [['nexa', 'La Rumeur se nourrit du doute. Toi, tu as des preuves.']],
    escape: [['rumeur', 'On dit que… on dit que… tout s\'effondre…'], ['zeus', 'Cours, frère ! La tour tombe !']],
    end: [['christine', 'Tu l\'as fait.'],
      ['zeus', 'Mon petit frère. Le constructeur.'],
      ['francheska', 'Je t\'avais dit que tu y arriverais.', { emotion: 'happy' }],
      ['oswel', 'Tu étais là depuis le début, en fait.'],
      ['francheska', 'Depuis bien avant le Nexus.', { emotion: 'happy' }],
      ['nexa', 'Le voyage ne s\'arrête pas ici.'],
      ['oswel', 'Alors… quel est le prochain niveau ?', { emotion: 'happy' }]],
    remember: 'w5',
  },
};

/* ---------- 3. Les rumeurs du boss final ont plusieurs voix (repères pour l'outil des voix) ---------- */
// le générique de fin : les nouveaux venus de la version 1.4 (avant « et La Rumeur… »)
if (OT.CREDITS) OT.CREDITS.splice(Math.max(0, OT.CREDITS.length - 1), 0, ...['Isaïe', 'Kevin', 'Tchanko', 'Lionnel', 'Nadia'].filter((n) => !OT.CREDITS.includes(n)));

OT.STORY_ENDING = {
  title: "OSWEL'S TRAP",
  lines: ['MON HISTOIRE N\'EST PAS TERMINÉE.', 'LE PROCHAIN NIVEAU RESTE À CRÉER.', 'À SUIVRE…'],
};

/* ---------- 4. On applique ce qui ne dépend pas des grands niveaux (intros, outros, fins de boss) ---------- */
OT.applyStory = function () {
  const W = OT.WORLD_DATA;
  for (const key in OT.STORY) {
    const [w, i] = key.split('-').map(Number);
    const lv = W[w] && W[w].levels[i - 1];
    if (!lv) continue;
    const S = OT.STORY[key];
    if (S.pre || S.intro) lv.intro = (S.pre || []).concat(lv.intro || [], S.intro || []);
    if (S.outro) lv.outro = S.outro;
    if (S.end) lv.endStory = S.end;
    if (S.escape) lv.escapeStory = S.escape;
    if (S.secret) lv.secretLine = S.secret;
    if (S.remember) lv.remember = S.remember;
  }
};
OT.applyStory();

/* ---------- 5. Les rencontres et les phrases de zone sont ajoutées aux plans des grands niveaux
   (appelé par levelplans.js juste avant de construire chaque niveau) ---------- */
OT.storyForPlan = function (w, i, plan) {
  const S = OT.STORY[w + '-' + (i + 1)];
  if (!S || !plan || !plan.zones) return;
  if (S.meet && plan.zones[S.meet.zone]) {
    const m = S.meet;
    // si ce personnage a DÉJÀ des répliques dans le niveau (souvent des consignes utiles), on les garde
    // telles quelles : la rencontre reçoit son propre dialogue (« tony@histoire »)
    const lv = OT.WORLD_DATA[w] && OT.WORLD_DATA[w].levels[i];
    const taken = (lv && lv.dialogs && lv.dialogs[m.npc]) || (plan.dialogs && plan.dialogs[m.npc]);
    const key = taken ? m.npc + '@histoire' : m.npc;
    // un coin calme de plus, sans pièce (le total de pièces ne change pas)
    plan.zones[m.zone].secs.splice(m.at || 0, 0, ['rest', { sign: m.sign, npc: m.npc, talk: key, coins: false, len: 10 }]);
    plan.parBonus = 5;   // le temps de référence (médaille d'or) tient compte de ce coin de plus
    // une ligne peut être dite par Oswel ({ who: 'oswel' }) ou dépendre d'un souvenir ({ if: 'w1' }) :
    // elle garde alors la forme [texte, options] (voir talkTo dans game.js)
    plan.dialogs = plan.dialogs || {};
    plan.dialogs[key] = Object.assign({}, taken && key === m.npc ? taken : {}, { who: m.npc, lines: m.lines || [], alt: m.alt || [] });
  }
  if (S.zone) for (const z in S.zone) if (plan.zones[z]) plan.zones[z].say = S.zone[z];
};
