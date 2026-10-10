/* =====================================================================
   OSWEL'S TRAP — repliques.js  (version 1.4)
   LES PETITES RÉACTIONS (barks) ET LES RÉPLIQUES NOMMÉES.
   Courtes, variées, jamais deux fois de suite la même, avec un délai
   (OT.Dialogue.bark gère la probabilité et le délai).
     _      = ce que dit n'importe quel personnage jouable
     oswel  = ce que dit OSWEL (et ainsi de suite pour chaque personnage)
   ===================================================================== */
(function () {
  const D = OT.Dialogue;
  if (!D) return;

  /* ---------- Pendant l'histoire ---------- */
  // début d'un niveau
  D.defineBarks('start', { p: 0.55, cd: 30 }, {
    _: ['Bon… allons-y.', 'Allez, on y va.', 'C\'est parti.'],
    oswel: ['Bon… allons-y.', 'Ça sent le piège… allons-y quand même.', 'OK. On respire, et on y va.'],
    meka: ['Systèmes prêts. On y va.', 'Boulons serrés. En route.'],
    byte: ['Bip ! Chargement terminé. On y va !', 'Niveau chargé à cent pour cent !'],
    nexa: ['Je sais déjà où ça mène. Enfin… presque.', 'Allons voir ce qui nous attend.'],
    godlove: ['Avec le cœur, on y va !', 'Allez, on y croit !'],
    tony: ['Commence par comprendre. Ensuite, avance.', 'On lit le niveau, et on y va.', 'Je ne te dis pas tout. Regarde.'],
    fredo: ['On met le son et on y va !', 'Un, deux, trois… go !'],
    valdes: ['Black dirait : avance. Alors j\'avance.', 'Mission lancée.'],
    franck: ['Allez cousin, on y va !', 'En rouge et en avant !'],
  });
  // en entrant dans une section pleine de pièges
  D.defineBarks('trap_near', { p: 0.35, cd: 25 }, {
    _: ['Attends…', 'Ça sent le piège.', 'Hmm… c\'est trop calme.'],
    oswel: ['Attends…', 'Ça sent le piège…', 'Ah, ce passage a l\'air facile… beaucoup trop facile.'],
    meka: ['Analyse… piège probable.', 'Mes capteurs n\'aiment pas ça.'],
    byte: ['Alerte pixel !', 'Attention, ça clignote bizarre.'],
    nexa: ['J\'ai déjà vu ce piège. Dans un autre monde.', 'Attention. Ici, rien n\'est ce qu\'il paraît.'],
    godlove: ['Doucement… quelque chose cloche.'],
    tony: ['Attends. Lis d\'abord.', 'Observe avant d\'agir.', 'Ce sol est trop calme.'],
    fredo: ['Ça sonne faux, ça…'],
    valdes: ['Je vérifie… piège confirmé.'],
    franck: ['Attention cousin, c\'est louche.'],
  });
  // une chute (piège, pics, lasers…)
  D.defineBarks('death', { p: 0.6, cd: 7 }, {
    _: ['Aïe !', 'Non…', 'Encore ?!', 'Sérieux ?!'],
    oswel: ['Encore ?!', 'Non…', 'Mais c\'est quoi ce niveau ?!', 'AH !'],
    meka: ['Erreur critique…', 'Aïe. Boulon desserré.'],
    byte: ['Bug détecté… c\'était moi.', 'Écran bleu !'],
    nexa: ['Ce n\'était qu\'une possibilité.', 'Pas cette fois.'],
    godlove: ['Aïe… ça pique le cœur.', 'Oh non…'],
    tony: ['Intéressant. Un bug.', 'Bon. On apprend.', 'Ça plante ? On recommence.', 'Le niveau : un. Moi : zéro. Pour l\'instant.'],
    fredo: ['Ma musique s\'est arrêtée…', 'Fausse note !'],
    valdes: ['Black ne doit pas voir ça.', 'Incident noté.'],
    franck: ['Ah non, pas comme ça !', 'Ouille !'],
  });
  // une chute dans le vide
  D.defineBarks('fall', { p: 0.5, cd: 7 }, {
    _: ['Aaaah !', 'Pas en bas !', 'Le vide…'],
    oswel: ['Aaaah !', 'Je savais que c\'était un piège…'],
    meka: ['Gravité… excessive.'], byte: ['Chute libre ! Sans parachute !'],
    nexa: ['Le vide m\'a encore eue.'], franck: ['Oh non, pas le trou !'],
  });
  // on réapparaît après une chute
  D.defineBarks('retry', { p: 0.45, cd: 18 }, {
    _: ['Cette fois, je connais le piège.', 'On recommence.', 'Encore une fois.'],
    oswel: ['Cette fois, je connais le piège.', 'OK… réfléchissons.', 'Cette fois, je l\'ai.'],
    meka: ['Redémarrage. Cette fois, j\'ai les données.'],
    byte: ['Rechargement du niveau… prêt !'],
    nexa: ['Une autre version de moi y arrive. Celle-ci aussi.'],
    godlove: ['On se relève, toujours.'],
    tony: ['On corrige, et on relance.', 'Ça plante ? On recommence.'],
    fredo: ['On reprend au refrain.'],
    valdes: ['Erreur notée. On recommence.'],
    franck: ['Cette fois, je la sens bien.'],
  });
  D.defineBarks('secret', { p: 1, cd: 10 }, {
    _: ['Tiens… c\'est quoi ça ?', 'Un passage secret !', 'Oh… une salle cachée.'],
    oswel: ['Tiens… c\'est quoi ça ?', 'Un passage secret ! Je le savais.'],
    meka: ['Cavité détectée.'], byte: ['Easter egg trouvé !'], nexa: ['Je savais qu\'il était là.'],
  });
  D.defineBarks('checkpoint', { p: 0.4, cd: 25 }, {
    _: ['Point de reprise. Ouf.', 'On souffle un peu.'],
    oswel: ['Point de reprise. Ouf.', 'Sauvegardé. Comme le dit Reine Damso.'],
    meka: ['Sauvegarde effectuée.'], byte: ['Checkpoint ! Sauvegarde OK.'], tony: ['Sauvegarde. Toujours sauvegarder.'],
  });
  D.defineBarks('zone', { p: 0.3, cd: 40 }, {
    _: ['Nouvelle zone.', 'Bon… on continue.', 'C\'est encore loin ?'],
    oswel: ['Bon… on continue.', 'Encore une zone. Ce niveau ne finit jamais.', 'Allez. Plus loin.'],
    meka: ['Zone suivante. Avancée nominale.'], byte: ['Niveau suivant ! Enfin, zone suivante.'],
  });
  D.defineBarks('fake', { p: 0.85, cd: 8 }, {
    _: ['C\'était un faux !', 'Je me suis fait avoir…', 'Bien joué, le niveau…'],
    oswel: ['Je savais que c\'était un piège… mais j\'y suis allé quand même.', 'C\'était un faux ?!', 'Bien joué, le niveau. Bien joué.'],
    meka: ['Leurre détecté. Trop tard.'], byte: ['Fake news !'], nexa: ['Celle-là, je ne l\'avais pas vue.'],
  });
  D.defineBarks('chase', { p: 1, cd: 15 }, {
    _: ['Cours !', 'Vite, vite, vite !', 'Ne te retourne pas !'],
    oswel: ['Cours !', 'Vite, vite, vite !', 'Pas le temps de réfléchir !'],
    meka: ['Vitesse maximale !'], byte: ['Turbo activé !'], nexa: ['Maintenant. Cours.'], franck: ['Fonce cousin !'],
  });
  D.defineBarks('victory', { p: 1, cd: 5 }, {
    _: ['Enfin !', 'On l\'a fait !', 'Trop facile… enfin, presque.'],
    oswel: ['Enfin !', 'Je savais que c\'était un piège.', 'Cette fois, je l\'ai eu.'],
    meka: ['Mission accomplie. Boulons serrés.'],
    byte: ['GG ! Bien joué !'],
    nexa: ['Comme prévu.'],
    godlove: ['Merci, merci !'],
    tony: ['Propre.'],
    fredo: ['Final en beauté !'],
    valdes: ['Rapport : réussite totale.'],
    franck: ['Rouge victoire !'],
  });
  D.defineBarks('boss_phase', { p: 0.6, cd: 20 }, {
    _: ['Il change de tactique !', 'Ce n\'est pas fini…', 'Encore une phase.'],
    oswel: ['Il change de tactique…', 'OK… réfléchissons.', 'Ce n\'est pas fini.'],
  });
  D.defineBarks('boss_win', { p: 1, cd: 5 }, {
    _: ['Il est tombé ! Maintenant, on court !', 'On l\'a eu ! Vite, la sortie !'],
    oswel: ['Je l\'ai eu ! Maintenant… on court !', 'Il est tombé ! Vite, la sortie !'],
  });
  /* ---------- Pendant les mini-jeux (Soirée OSWEL) ----------
     Très courtes (moins d'une seconde) pour ne jamais couvrir les bruitages.
     Le texte apparaît dans une bulle au-dessus du joueur qui parle. */
  // j'ai éliminé quelqu'un
  D.defineBarks('mg_ko', { p: 0.8, cd: 5 }, {
    _: ['Je l\'ai eu !', 'Touché !', 'Trop facile !'],
    oswel: ['Je l\'ai eu !', 'BOUM !', 'Je savais que ça marcherait.'],
    meka: ['Cible neutralisée.', 'Calcul parfait.'],
    byte: ['Bip ! Touché !', 'Game over pour toi !'],
    nexa: ['Prévu.', 'Je l\'avais vu venir.'],
    godlove: ['Désolé… mais pas trop !', 'Je l\'ai eu !'],
    tony: ['Logique.', 'Bien calculé.'],
    fredo: ['Dans le rythme !', 'BOUM, en musique !'],
    valdes: ['Mission accomplie.', 'Black serait fier.'],
    franck: ['Rouge victoire !', 'Je l\'ai eu, cousin !'],
  });
  // je suis éliminé
  D.defineBarks('mg_out', { p: 0.7, cd: 5 }, {
    _: ['Noooon !', 'Encore une fois !', 'Pas juste !'],
    oswel: ['Encore ?!', 'Noooon !', 'Encore une fois !'],
    meka: ['Système hors service…', 'Erreur fatale.'],
    byte: ['Écran bleu !', 'Je bugue…'],
    nexa: ['Pas cette fois.', 'Intéressant…'],
    godlove: ['Oh non…', 'Je reviendrai !'],
    tony: ['On apprend.', 'Bon. Prochaine fois.'],
    fredo: ['Fausse note !', 'Ma musique…'],
    valdes: ['Incident.', 'Ça ne compte pas !'],
    franck: ['Ah non, pas comme ça !', 'Revanche !'],
  });
  // je me fais pousser / frapper
  D.defineBarks('mg_hit', { p: 0.5, cd: 6 }, {
    _: ['Aïe !', 'Hé !', 'Doucement !'],
    oswel: ['Hé !', 'Aïe !'], meka: ['Choc détecté.', 'Impact enregistré.'], byte: ['Aïe, mes pixels !', 'Ouch, bug !'], nexa: ['Hm.', 'Pas mal.'],
    franck: ['Hé, cousin !', 'Doucement, cousin !'], fredo: ['Ouille !', 'Hé, le rythme !'],
  });
  // j'ai gagné la manche
  D.defineBarks('mg_win', { p: 1, cd: 4 }, {
    _: ['Victoire !', 'Bien joué !', 'Qui est le meilleur ?'],
    oswel: ['Victoire !', 'Cette fois, je l\'ai !', 'Bien joué, tout le monde !'],
    meka: ['Victoire. Boulons serrés.'], byte: ['GG !', 'Niveau terminé !'], nexa: ['Comme prévu.'],
    godlove: ['Merci, merci !'], tony: ['Propre.'], fredo: ['Final en beauté !'], valdes: ['Rapport : victoire.'], franck: ['Rouge victoire !'],
  });
  // attention : un danger proche (le jeu choisit selon où il est, vu de la caméra)
  D.defineBarks('mg_warn', { p: 1, cd: 3 }, { _: ['Attention !'], meka: ['Danger !'], byte: ['Alerte !'] });
  D.defineBarks('mg_left', { p: 1, cd: 3 }, { _: ['À gauche !'] });
  D.defineBarks('mg_right', { p: 1, cd: 3 }, { _: ['À droite !'] });
  D.defineBarks('mg_front', { p: 1, cd: 3 }, { _: ['Devant !'] });
  D.defineBarks('mg_back', { p: 1, cd: 3 }, { _: ['Derrière !'] });
  // encourager / féliciter un coéquipier, ramasser un bonus
  D.defineBarks('mg_nice', { p: 0.6, cd: 6 }, { _: ['Bien joué !', 'Vas-y !'], oswel: ['Bien joué !', 'Vas-y !'], meka: ['Excellent travail.'], byte: ['Trop fort !'] });
  D.defineBarks('mg_item', { p: 0.45, cd: 7 }, { _: ['Bonus !', 'Pour moi !'], byte: ['Power-up !'], meka: ['Amélioration installée.'] });
  // le Traître : accuser / être accusé
  D.defineBarks('mg_traitor', { p: 1, cd: 3 }, { _: ['Traître !', 'C\'est toi, le traître !'] });

  /* ---------- L'annonceur des mini-jeux (répliques nommées) ---------- */
  const NUMS = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
  NUMS.forEach((n, k) => D.register('mg_num' + (k + 1), 'annonceur', `Mini-jeu numéro ${n} !`));
  D.register('mg_finale', 'annonceur', 'La grande finale !');
  const GNAMES = { boum: 'Boum !', patate: 'Patate chaude !', vole: 'Vole-moi ça !', tresor: 'Le Trésor !', train: 'Le Train de la mort !', magnet: 'Chaos magnétique !', course: 'Le Dernier Arrivé !', piege: 'Piège-moi si tu peux !', panne: 'Panne générale !', traitre: 'Le Traître !' };
  for (const id in GNAMES) D.register('mg_g_' + id, 'annonceur', GNAMES[id]);
  D.register('mg_tuto', 'annonceur', 'Entraînement : essaie les commandes !');
  D.register('mg_trois', 'annonceur', 'Trois !');
  D.register('mg_deux', 'annonceur', 'Deux !');
  D.register('mg_un', 'annonceur', 'Un !');
  D.register('mg_go', 'annonceur', 'Partez !');
  D.register('mg_manche2', 'annonceur', 'Manche deux !');
  D.register('mg_manche3', 'annonceur', 'Manche trois !');
  D.register('mg_manche4', 'annonceur', 'Manche quatre !');
  D.register('mg_derniere', 'annonceur', 'Dernière manche !');
  D.register('mg_time', 'annonceur', 'Temps écoulé !');
  D.register('mg_last10', 'annonceur', 'Dix secondes !');
  D.register('mg_sudden', 'annonceur', 'Mort subite !');
  D.register('mg_champion', 'annonceur', 'Voici le champion de la soirée !');

  D.defineBarks('voicetest', { p: 1, cd: 0, prio: 3 }, {
    _: ['Salut ! C\'est ma voix. Tu m\'entends bien ?'],
    oswel: ['Salut ! C\'est Oswel. Tu m\'entends bien ?'],
    meka: ['Test vocal. Un, deux. Systèmes audio opérationnels.'],
    byte: ['Bip bip ! Test du son ! Tu m\'entends ?'],
    nexa: ['Tu m\'entends ? Bien. Je savais que tu m\'entendrais.'],
  });
})();
