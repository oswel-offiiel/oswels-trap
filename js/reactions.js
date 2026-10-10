/* =====================================================================
   OSWEL'S TRAP — reactions.js  (version 1.5 : le héros RÉAGIT à ce qu'il vit)

   Avant, le héros disait « Aïe ! » quelle que soit la cause de sa chute. Maintenant
   il réagit à l'événement PRÉCIS qu'il vient de vivre :
     - death_<cause> : ce qui l'a fait tomber (pics, scie, laser, écrasé, brûlé…) ;
     - t_<piège>     : la PREMIÈRE fois qu'un nouveau piège (js/pieges3.js) se révèle ;
     - h_<événement> : ressort, portail, commandes inversées, gravité, levier,
                       sol qui s'effrite, frôler une scie, réussir après plusieurs chutes.
   Règles (gérées par OT.Dialogue.bark) : jamais deux fois de suite la même variante,
   un délai minimal entre deux réactions (pas de bavardage), une probabilité (il ne
   commente pas TOUT), et jamais par-dessus une vraie conversation. Les réactions
   sont courtes (on est en pleine action). Le héros ne parle QUE de ce qui vient
   d'arriver : chaque réaction est appelée par l'événement lui-même, dans game.js
   ou pieges3.js. Les voix se coupent dans les réglages ; les sous-titres restent.
     _      = n'importe quel personnage jouable
     oswel  = OSWEL (et ainsi de suite pour chaque personnage)
   ===================================================================== */
(function () {
  const D = OT.Dialogue;
  if (!D || !D.defineBarks) return;

  /* ---------- 1. Ce qui l'a fait tomber ---------- */
  D.defineBarks('death_spike', { p: 0.6, cd: 8 }, {
    _: ['Les pics… évidemment.', 'Aïe ! Ça pique !'],
    oswel: ['Les pics… évidemment.', 'Je les avais vus, pourtant…', 'Aïe ! Ça pique !'],
    meka: ['Perforation. Noté.'], byte: ['Pic critique !'], franck: ['Ouille, les pointes !'], tony: ['Les pics. On saute plus tôt.'],
  });
  D.defineBarks('death_saw', { p: 0.6, cd: 8 }, {
    _: ['La scie… trop près.', 'Mauvais timing.'],
    oswel: ['La scie… j\'ai mal lu son rythme.', 'Mauvais timing.', 'Trop près de la lame.'],
    meka: ['Rotation sous-estimée.'], byte: ['Découpé en pixels !'], tony: ['Regarde son trajet, puis passe.'],
  });
  D.defineBarks('death_zap', { p: 0.6, cd: 8 }, {
    _: ['Bzzz… électrocuté.', 'Ça grille !'],
    oswel: ['Bzzz… J\'aurais dû attendre que ça s\'éteigne.', 'Ça grille !'],
    meka: ['Surtension.'], byte: ['Court-circuit !'], nexa: ['Le courant passait encore.'], franck: ['Ça secoue, cousin !'],
  });
  D.defineBarks('death_laser', { p: 0.6, cd: 8 }, {
    _: ['Le laser…', 'Trop tôt.'],
    oswel: ['Le laser… j\'y suis allé trop tôt.', 'Il fallait attendre qu\'il s\'éteigne.'],
    meka: ['Faisceau mal calculé.'], tony: ['Compte le rythme : allumé, éteint.'],
  });
  D.defineBarks('death_crush', { p: 0.6, cd: 8 }, {
    _: ['Écrasé…', 'Pas dessous !'],
    oswel: ['Écrasé… Ne jamais rester dessous.', 'La prochaine fois, je regarde en l\'air.'],
    meka: ['Pression excessive.'], byte: ['Aplati comme un sprite 2D !'], franck: ['Ça tombe d\'où, ça ?!'],
  });
  D.defineBarks('death_burn', { p: 0.6, cd: 8 }, {
    _: ['Ça brûle !', 'Trop chaud…'],
    oswel: ['Ça brûle ! Le sol rougeoyait, pourtant…', 'Trop chaud…'],
    meka: ['Température critique.'], franck: ['Ça chauffe, cousin !'],
  });
  D.defineBarks('death_boom', { p: 0.6, cd: 8 }, {
    _: ['BOUM…', 'Ça a explosé !'],
    oswel: ['BOUM… J\'aurais dû m\'éloigner.', 'Ça a explosé !'],
    meka: ['Détonation.'], byte: ['Game over… non, pas encore !'],
  });
  D.defineBarks('death_acid', { p: 0.6, cd: 8 }, {
    _: ['L\'acide…'], oswel: ['L\'acide… Il ne faut jamais y toucher.'], meka: ['Corrosion.'],
  });
  D.defineBarks('death_chase', { p: 0.7, cd: 8 }, {
    _: ['Il m\'a rattrapé…', 'Trop lent !'],
    oswel: ['Il m\'a rattrapé… Il ne faut pas s\'arrêter.', 'Trop lent !'],
    franck: ['Il court vite, celui-là !'],
  });

  /* ---------- 2. Les nouveaux pièges (la première fois qu'ils se révèlent) ---------- */
  D.defineBarks('t_hole', { p: 1, cd: 6 }, {
    _: ['Le trou… a bougé ?!', 'Il s\'est déplacé quand j\'ai sauté !'],
    oswel: ['Le trou… a bougé ?!', 'Il bouge quand je saute… Il y avait une fente dans le sol.'],
    meka: ['Sol mobile détecté.'], byte: ['Le trou a fait un glitch !'], franck: ['Il se déplace, le trou ?!'],
  });
  D.defineBarks('t_spikes', { p: 1, cd: 6 }, {
    _: ['Des pics cachés !', 'Les petits trous… c\'étaient des pics !'],
    oswel: ['Les petits trous dans le sol… c\'étaient des pics !', 'Des pics cachés ! Ils cliquent avant de sortir.'],
    meka: ['Pointes rétractables.'], byte: ['Piège caché débloqué !'], tony: ['Ils font clic avant de sortir. Écoute.'],
  });
  D.defineBarks('t_ceil', { p: 1, cd: 6 }, {
    _: ['Au plafond aussi ?!', 'Ça vient d\'en haut !'],
    oswel: ['Au plafond aussi ?!', 'Ne pas passer dessous… compris.'],
    meka: ['Danger supérieur.'],
  });
  D.defineBarks('t_ghost', { p: 1, cd: 6 }, {
    _: ['La plateforme a disparu !', 'Il ne faut pas s\'arrêter dessus !'],
    oswel: ['Elle a disparu ! Les plateformes claires… il ne faut pas s\'y arrêter.', 'Une plateforme fantôme…'],
    meka: ['Structure instable.'], nexa: ['Elle n\'existait qu\'à moitié.'],
  });
  D.defineBarks('t_wall', { p: 1, cd: 6 }, {
    _: ['Un mur ?! Et le sol derrière…', 'Bloqué !'],
    oswel: ['Un mur ?! Et le sol s\'effondre derrière… On attend qu\'il redescende.', 'Bloqué ! Bon… il va redescendre.'],
    meka: ['Barrière mobile.'], franck: ['D\'où il sort, ce mur ?!'],
  });
  D.defineBarks('t_press', { p: 1, cd: 6 }, {
    _: ['Le plafond descend !', 'Vite, ça descend !'],
    oswel: ['Le plafond descend ! Pas le temps de traîner !', 'Vite, ça descend !'],
    meka: ['Compression en cours.'], byte: ['Écran qui rétrécit !'], franck: ['Cours, cousin, ça descend !'],
  });
  D.defineBarks('t_flap', { p: 1, cd: 6 }, {
    _: ['Je peux sauter en l\'air ici !', 'Comme un oiseau…'],
    oswel: ['Je peux sauter en l\'air ici ! Petits coups d\'aile…', 'Comme un oiseau. Un oiseau très prudent.'],
    byte: ['Mode Flappy activé !'], fredo: ['Un, deux… on bat des ailes en rythme !'],
  });
  D.defineBarks('t_chase', { p: 1, cd: 6 }, {
    _: ['La scie me suit !', 'Ne t\'arrête pas !'],
    oswel: ['La scie me suit ! Elle est plus lente que moi… si je ne m\'arrête pas.', 'Ne t\'arrête pas !'],
    meka: ['Poursuite engagée.'], franck: ['Elle me court après !'],
  });
  D.defineBarks('t_close', { p: 0.8, cd: 10 }, {
    _: ['Ouh, c\'était juste !', 'Elle m\'a frôlé !'],
    oswel: ['Ouh, celle-là, c\'était juste !', 'Elle m\'a frôlé !'],
  });
  D.defineBarks('t_bomb', { p: 1, cd: 6 }, {
    _: ['Une pièce gratuite… piégée !', 'Les ombres rouges ! Des bombes !'],
    oswel: ['Une pièce gratuite… évidemment que c\'était piégé.', 'Les ombres rouges ! Il faut s\'écarter !'],
    meka: ['Appât confirmé.'], byte: ['Pub mensongère !'], tony: ['Rien n\'est gratuit. Retiens ça.'],
  });
  D.defineBarks('t_back', { p: 1, cd: 6 }, {
    _: ['Je n\'aurais pas dû revenir…', 'Le sol est tombé !'],
    oswel: ['Je n\'aurais pas dû revenir en arrière…', 'Une pièce « oubliée »… Bien sûr.'],
    meka: ['Retour sanctionné.'],
  });
  D.defineBarks('t_pattern', { p: 1, cd: 6 }, {
    _: ['La dernière a bougé !', 'Même rythme ? Non !'],
    oswel: ['La dernière plateforme a bougé ! Il ne faut pas sauter par habitude.', 'Même rythme ? Non !'],
    tony: ['L\'habitude, c\'est un piège. Regarde avant.'],
  });
  D.defineBarks('t_wrap', { p: 1, cd: 6 }, {
    _: ['Je suis ressorti de l\'autre côté !', 'Le bord gauche… donne à droite !'],
    oswel: ['Je suis ressorti de l\'autre côté ! Comme dans les vieux jeux.', 'Le bord gauche donne à droite…'],
    byte: ['Téléportation d\'écran !'], nexa: ['Les bords du réseau se rejoignent.'],
  });
  D.defineBarks('t_shy', { p: 1, cd: 6 }, {
    _: ['La porte s\'est décalée !', 'Elle n\'aime pas qu\'on saute…'],
    oswel: ['La porte s\'est décalée ! Bon… j\'y vais en marchant.', 'Elle n\'aime pas qu\'on lui saute dessus.'],
    franck: ['Même les portes ont peur de moi !'],
  });

  /* ---------- 3. Les autres événements vécus ---------- */
  D.defineBarks('h_spring', { p: 0.8, cd: 30 }, {
    _: ['Wouhou !', 'Ça rebondit !'],
    oswel: ['Wouhou ! Ça rebondit !', 'Un ressort !'],
    byte: ['Saut boosté !'], franck: ['Plus haut, cousin !'],
  });
  D.defineBarks('h_portal', { p: 0.7, cd: 30 }, {
    _: ['Téléporté !', 'Hop, de l\'autre côté.'],
    oswel: ['Téléporté ! Ça me retourne l\'estomac.', 'Hop, de l\'autre côté.'],
    nexa: ['Le réseau me transporte.'],
  });
  D.defineBarks('h_portal_trap', { p: 1, cd: 20 }, {
    _: ['Hé ! Il m\'a renvoyé en arrière !', 'Mauvais portail…'],
    oswel: ['Hé ! Il m\'a renvoyé en arrière ! Il tournait à l\'envers…', 'Mauvais portail…'],
  });
  D.defineBarks('h_invert', { p: 1, cd: 40 }, {
    _: ['Les commandes sont inversées !', 'Gauche… c\'est droite ?!'],
    oswel: ['Les commandes sont inversées ! Gauche, c\'est droite…', 'OK… on pense à l\'envers.'],
    meka: ['Polarité inversée.'], byte: ['Manette inversée !'], franck: ['C\'est quoi ce bazar ?!'],
  });
  D.defineBarks('h_flip', { p: 1, cd: 40 }, {
    _: ['Je tombe vers le haut !', 'La gravité s\'est retournée !'],
    oswel: ['Je tombe vers le haut ! La gravité s\'est retournée…', 'Le plafond, c\'est le sol maintenant.'],
    meka: ['Gravité inversée.'], nexa: ['Le haut et le bas ne sont que des conventions.'],
  });
  D.defineBarks('h_lever', { p: 0.6, cd: 25 }, {
    _: ['Clac ! Quelque chose a bougé.', 'Voilà, c\'est activé.'],
    oswel: ['Clac ! Quelque chose a bougé.', 'Un levier, une conséquence.'],
    meka: ['Mécanisme actionné.'], tony: ['Cause, effet.'],
  });
  D.defineBarks('h_crumble', { p: 0.5, cd: 30 }, {
    _: ['Ça s\'effrite !', 'Ne t\'arrête pas !'],
    oswel: ['Ça s\'effrite sous mes pieds !', 'Ne t\'arrête pas sur la rouille !'],
    meka: ['Corrosion de la structure.'],
  });
  D.defineBarks('h_nearmiss', { p: 0.5, cd: 25 }, {
    _: ['C\'était moins une !', 'Ouf !'],
    oswel: ['C\'était moins une !', 'Ouf… mon cœur.'],
    byte: ['Esquive pixel-perfect !'], franck: ['Même pas peur !'],
  });
  D.defineBarks('h_success', { p: 1, cd: 15 }, {
    _: ['Enfin ! Je l\'ai passé !', 'Ça y est !'],
    oswel: ['Enfin ! Il m\'a eu plusieurs fois, mais je l\'ai passé.', 'Ça y est ! Il suffisait de comprendre.'],
    meka: ['Obstacle franchi après analyse.'], byte: ['Niveau de compétence augmenté !'], tony: ['Tu vois ? On apprend en tombant.'],
    franck: ['Enfin, cousin !'],
  });
})();
