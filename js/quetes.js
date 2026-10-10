/* =====================================================================
   OSWEL'S TRAP — quetes.js  (version 1.5 : PERSONNAGES, QUÊTES, SECRETS, INDICES)

   Les personnages ne se contentent plus d'une phrase : ils ont un RÔLE, se
   souviennent de toi, proposent des QUÊTES, donnent des INDICES à trois niveaux
   (discret, détaillé, solution guidée) fondés sur les vrais pièges du niveau,
   et ouvrent des NIVEAUX SECRETS. Tout est enregistré dans le profil.

   1. Les rôles des personnages et leurs retrouvailles
   2. Les souvenirs (ils parlent de ce que tu as VRAIMENT vécu)
   3. Les quêtes (identifiant, objectif mesurable, récompense définie)
   4. Les indices (un par type de section, trois niveaux)
   5. Les niveaux secrets (un par monde, débloqués par une quête)
   6. L'état sauvegardé (profil.q15) — compatible avec les anciennes sauvegardes
   7. Les événements du jeu (objets de quête, boussole, chutes, fin de niveau…)
   8. Les conversations (appelées par game.js → talkTo)
   9. Le menu de choix (accepter une quête, demander un indice)
   10. Le journal (pour le Carnet et l'écran de pause)

   Règles :
   - Une quête n'est JAMAIS obligatoire pour finir l'histoire.
   - Une récompense n'est donnée qu'UNE fois par profil (drapeau « rewarded »).
   - En coop, la progression compte pour les deux profils (s'il y a un vrai
     profil pour le joueur 2) ; chacun reçoit sa récompense. Pas de quêtes en Versus.
   - Une quête terminée est récompensée tout de suite (pas besoin de retrouver
     le personnage : on ne peut pas être bloqué) ; il te remercie la prochaine fois.
   ===================================================================== */
window.OT = window.OT || {};

OT.Quests = (function () {
  const GX = OT.GameExt;
  const Dl = () => OT.Dialogue;

  /* ==================================================================
     1. LES RÔLES ET LES RETROUVAILLES
     ================================================================== */
  const ROLE_NAME = {
    mentor: 'Mentor', explorateur: 'Explorateur', technicien: 'Technicien', marchand: 'Commerçante',
    secrets: 'Gardien des secrets', combattant: 'Combattant', mysterieux: 'Mystérieux', quete: 'Donne des quêtes',
    confiance: 'Personne de confiance', rival: 'Rival (ses défis disent vrai)',
  };
  const ROLES = {
    patou: 'mentor', christine: 'confiance', tante: 'marchand', franck: 'combattant', romeo: 'secrets', isaie: 'explorateur',
    tchanko: 'explorateur', kevin: 'technicien', tony: 'mentor', yannick: 'rival', brayan: 'secrets', samuel: 'technicien',
    peck: 'technicien', youmbi: 'technicien', ange: 'confiance', dimi: 'mentor', annie: 'mentor', reine: 'quete', tsague: 'technicien',
    junior: 'technicien', kellia: 'confiance', francheska: 'confiance', nexa: 'mysterieux', danie: 'technicien', sandex: 'technicien',
    fredo: 'combattant', ladyannee: 'technicien', valdes: 'quete', winblack: 'mysterieux', reinedamso: 'mentor', belvianne: 'technicien',
    charly: 'secrets', ashley: 'confiance', godlove: 'confiance', lionnel: 'quete', nadia: 'confiance', zeus: 'combattant',
  };
  // la façon dont chaque rôle annonce un indice
  const ROLE_HINT = {
    mentor: 'Écoute bien : ', explorateur: 'Moi, j\'ai remarqué ça : ', technicien: 'Côté technique : ', marchand: 'Gratuit, pour toi : ',
    secrets: 'Entre nous : ', combattant: 'Conseil de combat : ', mysterieux: 'Les données disent : ', quete: 'Un conseil : ',
    confiance: 'Je te le dis parce que je tiens à toi : ', rival: 'Je te le dis, mais ne te vante pas : ',
  };
  // (1.5, voix) l'introduction devient une petite phrase à part : « Écoute bien. »
  const introOf = (role) => (ROLE_HINT[role] ? ROLE_HINT[role].replace(/\s*:\s*$/, '.') : '');
  // à la 2e rencontre (et aux suivantes) : ils te reconnaissent
  const RETOUR = {
    _: ['Ça fait plaisir de te revoir.', 'Encore toi ! Ça avance ?'],
    patou: ['Te revoilà, apprenti ! Toujours en un seul morceau ?', 'Ah, toi ! Tu as rangé tes outils, j\'espère.'],
    christine: ['Tu tiens le coup ? On est fiers de toi, tu sais.', 'Encore toi ! Tu me raconteras la suite.'],
    tante: ['Tu as mangé, au moins ?', 'Reviens nous voir plus souvent, hein.'],
    franck: ['Cousin ! Alors, combien de chutes aujourd\'hui ?', 'Toujours debout ? Respect.'],
    romeo: ['Encore toi ! Tu ne lâches rien, hein.'],
    isaie: ['Tiens, tu explores toujours ?', 'Tu as trouvé des salles cachées depuis la dernière fois ?'],
    tchanko: ['On se recroise ! Le monde est petit.'], kevin: ['Toujours en train de démonter des trucs ?'],
    tony: ['Alors, ton code compile ?', 'Te revoilà. On reprend là où on en était.'],
    yannick: ['Encore toi ? Tu progresses… un peu.', 'Je t\'ai à l\'œil.'],
    brayan: ['Hé ! Ça avance, tes pages ?'], samuel: ['Re-salut !'], peck: ['Encore toi !'], youmbi: ['Te revoilà ! Toujours du style ?'],
    ange: ['Ça va mieux, la fac ?', 'Ça fait plaisir de te revoir.'], dimi: ['Alors, ces dérivées ?'], annie: ['Tu as révisé ?'],
    reine: ['De retour au labo ?'], tsague: ['Le courant passe toujours ?'], junior: ['Encore toi ! Ça flotte ?'], kellia: ['Ça fait plaisir de te revoir.'],
    francheska: ['Te revoilà… J\'espérais bien te croiser.'], nexa: ['Je savais que tu reviendrais. Je l\'avais calculé.'],
    danie: ['Re-bonjour !'], sandex: ['Toujours dans les nuages ?'], fredo: ['Encore toi ! On remet le son ?'],
    ladyannee: ['Ton mot de passe est toujours solide ?'], valdes: ['Mission en cours ?'], winblack: ['…Encore toi.'],
    reinedamso: ['Tu as bien sauvegardé ?'], belvianne: ['Re-bonjour !'], charly: ['Salut !'], ashley: ['Te revoilà !'],
    godlove: ['Que Dieu te garde ! Te revoilà.'], lionnel: ['Alors, ces plans avancent ?'], nadia: ['Tu passes au resto après ?'],
    zeus: ['Petit frère ! Toujours debout ?'],
  };

  /* ==================================================================
     2. LES SOUVENIRS : une seule fois par profil, seulement si c'est VRAIMENT arrivé
     ================================================================== */
  const bossDone = (P, w) => { const W = P.worlds && P.worlds[w]; return !!(W && W.done && W.done[9]); };
  const SOUVENIRS = [
    { id: 'patou-b1', who: 'patou', if: (P) => bossDone(P, 1), text: 'Le Gardien de la Forge… Je savais que tu le battrais. Tu as toujours eu de la patience.' },
    { id: 'tony-b2', who: 'tony', if: (P) => bossDone(P, 2), text: 'Le Bug, je l\'ai vu tomber. Tu as corrigé ton code au lieu de taper au hasard. C\'est ça, devenir développeur.' },
    { id: 'ange-b3', who: 'ange', if: (P) => bossDone(P, 3), text: 'L\'examen… Tu te souviens ? Tu as compris au lieu de réciter.' },
    { id: 'franck-b4', who: 'franck', if: (P) => bossDone(P, 4), text: 'Tu as battu Zeus ?! Ton propre frère ! Il doit encore s\'en remettre.' },
    { id: 'zeus-b4', who: 'zeus', if: (P) => bossDone(P, 4), text: 'Tu m\'as battu au Nexus. Je ne l\'ai pas oublié, crois-moi.' },
    { id: 'nadia-b4', who: 'nadia', if: (P) => bossDone(P, 4), text: 'On m\'a raconté pour Zeus ! Le repas est offert, champion.' },
    { id: 'christine-b4', who: 'christine', if: (P) => [1, 2, 3, 4].every((w) => bossDone(P, w)), text: 'Quatre mondes… Tu sais, à la maison, on parle de toi.' },
    { id: 'isaie-sec', who: 'isaie', if: (P) => Object.keys(st(P).secrets).length >= 3, text: 'Trois salles cachées au moins ! Tu regardes enfin les murs comme moi.' },
    { id: 'kellia-ange', who: 'kellia', if: (P) => questDone(P, 'q_notes'), text: 'Tu te souviens de mes notes ? Ange les a encore. Merci de les avoir rapportées.' },
    { id: 'patou-boulons', who: 'patou', if: (P) => questDone(P, 'q_boulons'), text: 'Mes boulons dorés sont revenus à leur place. Grâce à toi.' },
  ];

  /* ==================================================================
     3. LES QUÊTES
     type d'objectif : items (objets cachés dans les salles secrètes), secrets
     (nombre de salles cachées d'un monde), secret (celle d'un niveau), nodeath
     (finir des niveaux sans chute), rival (battre la copie du rival), boss,
     talk (parler à quelqu'un), blackout (un seul BLACKOUT de Win Black).
     ================================================================== */
  const QUESTS = [
    // ----- MONDE 1 : LA FORGE -----
    { id: 'q_boulons', w: 1, giver: 'patou', from: 1, title: 'Les boulons dorés de Patou',
      desc: 'Patou a perdu 3 boulons dorés. Ils ont roulé dans les salles cachées de la Forge (niveaux 1-4, 1-6 et 1-7).',
      obj: { type: 'items', icon: '⚙', name: 'Boulon doré', items: [{ w: 1, i: 3 }, { w: 1, i: 5 }, { w: 1, i: 6 }] },
      offer: ['Dis-moi… tu n\'aurais pas vu mes boulons dorés ? J\'en ai perdu trois.', 'Ils ont roulé dans les salles cachées de l\'atelier, dans les niveaux 1-4, 1-6 et 1-7. Un mur qui n\'a pas tout à fait la même texture, au-dessus d\'une petite marche…'],
      accept: 'Merci ! Rapporte-les-moi quand tu peux. Rien ne presse.',
      remind: 'Il me manque encore {left} boulon(s). Cherche les murs qui n\'ont pas la même texture.',
      thanks: ['Mes boulons ! Tu as l\'œil, apprenti.', 'Garde cette clé à molette : un bon mécanicien en a toujours une sur lui.'],
      reward: { coins: 25, gad: 'cle', journal: 'Les boulons de Patou : à la Forge, on ne jette rien. Chaque pièce a son histoire.' } },
    { id: 'q_salles', w: 1, giver: 'isaie', from: 0, title: 'Les salles cachées de la Forge',
      desc: 'Isaïe veut savoir si tu sais regarder : trouve 2 salles cachées dans les niveaux de la Forge.',
      obj: { type: 'secrets', w: 1, n: 2 },
      offer: ['Tu sais ce que j\'aime ici ? Les endroits que personne ne regarde.', 'Trouve deux salles cachées dans la Forge, et je te donne ma boussole : elle montre ce qui se cache.'],
      accept: 'Indice : un faux mur ne fait pas de bruit quand on le traverse… et il est un peu différent des autres.',
      remind: 'Encore {left} salle(s) cachée(s) à trouver dans la Forge.',
      thanks: ['Deux salles ! Tiens, ma boussole.', 'Quand une salle cachée ou un objet de quête est proche, une flèche apparaît au-dessus de ta tête et le montre.'],
      reward: { coins: 15, compass: true, journal: 'La boussole d\'Isaïe : elle montre les salles cachées et les objets de quête tout proches.' } },
    { id: 'q_defi_franck', w: 1, giver: 'franck', from: 0, title: 'Le défi de Franck',
      desc: 'Termine un niveau de la Forge (pas le boss) sans tomber une seule fois.',
      obj: { type: 'nodeath', w: 1, n: 1, noBoss: true },
      offer: ['Eh cousin ! Je te lance un défi.', 'Termine un niveau de la Forge sans tomber une seule fois. Si tu y arrives, je te montre la réserve secrète d\'oncle Patou.'],
      accept: 'Prends ton temps. Le chrono ne compte pas, seulement les chutes.',
      remind: 'Toujours pas de niveau sans chute ? Respire, observe, et vas-y doucement.',
      thanks: ['Sans tomber ?! OK, OK… respect.', 'La réserve est ouverte : regarde dans la liste des niveaux de la Forge, la case « SECRET ».'],
      reward: { coins: 10, secretLevel: 1, journal: 'Le défi de Franck : un niveau entier sans tomber. La réserve d\'oncle Patou s\'est ouverte.' } },
    // ----- MONDE 2 : LE CODE -----
    { id: 'q_accolades', w: 2, giver: 'tony', from: 0, title: 'Les accolades perdues',
      desc: 'Le programme de Tony ne compile plus : il manque « { », « } » et « ; ». Ils sont cachés dans les salles secrètes des niveaux 2-2, 2-4 et 2-7.',
      obj: { type: 'items', icon: '{}', name: 'Symbole de code', items: [{ w: 2, i: 1 }, { w: 2, i: 3 }, { w: 2, i: 6 }] },
      offer: ['Mon programme ne compile plus. Il manque une accolade ouvrante, une fermante… et un point-virgule.', 'Ils se sont cachés dans les salles secrètes des niveaux 2-2, 2-4 et 2-7. Tu me les rapportes ?'],
      accept: 'Merci. Un bon développeur cherche avant de réécrire.',
      remind: 'Il manque encore {left} symbole(s). Cherche les faux murs au-dessus des petites marches.',
      thanks: ['Ça compile ! Zéro erreur.', 'Tiens, ce canard : quand tu bloques, explique-lui ton problème. Ça marche, je te jure.'],
      reward: { coins: 30, gad: 'canard', journal: 'Les accolades de Tony : un oubli d\'un seul caractère peut tout arrêter.' } },
    { id: 'q_revanche', w: 2, giver: 'yannick', from: 1, title: 'La revanche de Yannick',
      desc: 'Bats la copie de Yannick dans « Ça bouge ! » (2-5).',
      obj: { type: 'rival', w: 2, i: 4 },
      offer: ['Tu crois que tu codes vite ? Ma copie t\'attend dans « Ça bouge ! ».', 'Bats-la, et je te montre le serveur que personne ne connaît.'],
      accept: 'Un conseil, puisque je suis beau joueur : dans « Ça bouge ! », le niveau réagit quand tu sautes. Saute moins, cours plus.',
      remind: 'Ma copie t\'attend toujours dans 2-5.',
      thanks: ['Tu l\'as battue… Bon. Tu mérites de voir le serveur caché.', 'Il est dans la liste des niveaux du Code : la case « SECRET ».'],
      reward: { coins: 10, secretLevel: 2, title: 'Rival respecté', journal: 'La revanche : Yannick n\'a pas dit bravo. Mais il a ouvert son serveur.' } },
    { id: 'q_404', w: 2, giver: 'brayan', from: 7, title: 'La page cachée',
      desc: 'Trouve la salle cachée du niveau « Erreur 404 » (2-8).',
      obj: { type: 'secret', w: 2, i: 7 },
      offer: ['Une erreur 404, c\'est une page qu\'on ne trouve pas. Mais moi, j\'en connais une cachée ici même.', 'Trouve la salle cachée de ce niveau. Elle est vers la fin.'],
      accept: 'Regarde au-dessus d\'une petite marche, vers la fin du niveau.',
      remind: 'La salle cachée de « Erreur 404 » t\'attend toujours.',
      thanks: ['Page trouvée ! Code 200 : tout va bien.'],
      reward: { coins: 20, journal: 'La page cachée : ce qu\'on ne trouve pas n\'a pas disparu. On n\'a juste pas assez cherché.' } },
    // ----- MONDE 3 : LE LABORATOIRE -----
    { id: 'q_echantillons', w: 3, giver: 'reine', from: 4, title: 'Les échantillons de Reine',
      desc: 'Reine a égaré 2 échantillons dans les salles cachées des niveaux 3-6 et 3-9.',
      obj: { type: 'items', icon: '🧪', name: 'Échantillon', items: [{ w: 3, i: 5 }, { w: 3, i: 8 }] },
      offer: ['Deux de mes échantillons ont disparu. Sans eux, mon expérience ne vaut rien.', 'Ils sont dans les salles cachées des niveaux 3-6 et 3-9. Tu peux les retrouver ?'],
      accept: 'Merci. Une expérience sans échantillon, c\'est une hypothèse sans test.',
      remind: 'Encore {left} échantillon(s) à retrouver.',
      thanks: ['Mes échantillons ! L\'expérience peut continuer.', 'Prends cette fiole lumineuse. Elle brille dans le noir, comme une bonne idée.'],
      reward: { coins: 30, gad: 'fiole', journal: 'Les échantillons de Reine : une hypothèse n\'est rien tant qu\'on ne l\'a pas testée.' } },
    { id: 'q_pente', w: 3, giver: 'dimi', from: 0, title: 'La pente parfaite',
      desc: 'Termine 3 niveaux du Laboratoire sans tomber (pas le boss).',
      obj: { type: 'nodeath', w: 3, n: 3, noBoss: true },
      offer: ['Une dérivée, c\'est une pente. Et ta courbe de chutes, elle descend ?', 'Termine trois niveaux du Labo sans tomber. Je te montrerai le labo souterrain.'],
      accept: 'Observe, calcule, puis agis. Comme en maths.',
      remind: 'Encore {left} niveau(x) sans chute.',
      thanks: ['Trois niveaux sans chute : ta courbe est parfaite.', 'Le labo souterrain est ouvert : la case « SECRET » du Laboratoire.'],
      reward: { coins: 10, secretLevel: 3, journal: 'La pente parfaite : moins de chutes, ce n\'est pas de la chance. C\'est de la méthode.' } },
    { id: 'q_notes', w: 3, giver: 'ange', from: 0, title: 'Les notes de Kellia',
      desc: 'Rends à Kellia les notes de cours qu\'elle a prêtées à Ange (on la croise plus loin dans le Laboratoire).',
      obj: { type: 'talk', npc: 'kellia' },
      offer: ['Kellia m\'a prêté ses notes de cours. Elles m\'ont sauvée.', 'Si tu la croises, tu pourras les lui rendre ?'],
      accept: 'Merci. Dis-lui qu\'elles m\'ont vraiment aidée.',
      remind: 'Tu as toujours les notes de Kellia ?',
      deliver: [['kellia', 'Mes notes ! Merci. Ange pense toujours à tout.'], ['oswel', 'Elle m\'a dit que tu expliquais mieux que les livres.']],
      thanks: ['Tu les as rendues ? Merci. On s\'entraide, ici.'],
      reward: { coins: 15, journal: 'Les notes de Kellia : à la fac, personne ne réussit vraiment seul.' } },
    // ----- MONDE 4 : NEXUS -----
    { id: 'q_paquets', w: 4, giver: 'nexa', from: 0, title: 'Les paquets perdus',
      desc: 'NEXA a perdu 3 paquets de données dans les salles cachées des niveaux 4-2, 4-3 et 4-7.',
      obj: { type: 'items', icon: '◆', name: 'Paquet de données', items: [{ w: 4, i: 1 }, { w: 4, i: 2 }, { w: 4, i: 6 }] },
      offer: ['Trois de mes paquets de données se sont perdus dans le réseau.', 'Ils sont dans les salles cachées des niveaux 4-2, 4-3 et 4-7. Retrouve-les, et je t\'en serai… reconnaissante.'],
      accept: 'Probabilité de succès : élevée. Je compte sur toi.',
      remind: 'Encore {left} paquet(s) perdu(s).',
      thanks: ['Paquets reçus. Intégrité : cent pour cent.', 'Prends cet écran holographique. Il affiche ce que tu imagines.'],
      reward: { coins: 35, gad: 'holo', journal: 'Les paquets de NEXA : sur Internet, rien ne se perd vraiment. Il faut savoir où chercher.' } },
    { id: 'q_blackout', w: 4, giver: 'valdes', from: 4, title: 'Un seul blackout',
      desc: 'Dans « Git commit » (4-7), demande à Win Black de couper le courant… UNE seule fois (pas de blackout total), et termine le niveau.',
      obj: { type: 'blackout', w: 4, i: 6 },
      offer: ['Dans « Git commit », Win Black peut couper le courant pour toi. Mais si tu lui redemandes, c\'est le blackout total.', 'Montre-moi que tu sais t\'arrêter à temps : un seul blackout, et tu termines le niveau.'],
      accept: 'Parle-lui une fois, puis fonce. Pas deux.',
      remind: 'Un seul blackout dans 4-7, n\'oublie pas.',
      thanks: ['Un seul blackout : tu sais t\'arrêter. Rare.', 'Le cloud privé est ouvert : la case « SECRET » de Nexus.'],
      reward: { coins: 10, secretLevel: 4, title: 'Maître du courant', journal: 'Un seul blackout : savoir s\'arrêter, c\'est aussi une compétence.' } },
    { id: 'q_croquis', w: 4, giver: 'francheska', from: 0, title: 'Le croquis',
      desc: 'Montre le croquis de Francheska à Ashley (on la croise plus loin dans Nexus).',
      obj: { type: 'talk', npc: 'ashley' },
      offer: ['J\'ai dessiné une idée d\'application pour aider les autres.', 'Ashley devrait la voir… Tu pourrais lui montrer, si tu la croises ?'],
      accept: 'Fais attention à ne pas le plier, d\'accord ?',
      remind: 'Tu l\'as toujours, mon croquis ?',
      deliver: [['ashley', 'C\'est Francheska qui a dessiné ça ? Elle a des idées que personne n\'a.'], ['oswel', 'Oui… elle voit plus loin que nous.']],
      thanks: ['Ashley a aimé ? …Merci d\'avoir pris soin de mon croquis.'],
      reward: { coins: 20, journal: 'Le croquis : une idée plus belle quand on la partage. Je l\'ai rendu sans un pli.' } },
    // ----- MONDE 5 : OSWEL CITY -----
    { id: 'q_dossiers', w: 5, giver: 'christine', from: 0, title: 'Les dossiers clients',
      desc: 'Christine a besoin de 3 dossiers clients rangés… dans les salles cachées des niveaux 5-2, 5-4 et 5-6.',
      obj: { type: 'items', icon: '📁', name: 'Dossier client', items: [{ w: 5, i: 1 }, { w: 5, i: 3 }, { w: 5, i: 5 }] },
      offer: ['Ton premier vrai client ! Mais ses dossiers sont éparpillés partout en ville.', 'Ils sont dans les salles cachées des niveaux 5-2, 5-4 et 5-6. Un bon pro retrouve toujours ses papiers.'],
      accept: 'Je savais que je pouvais compter sur toi.',
      remind: 'Il manque encore {left} dossier(s).',
      thanks: ['Tous les dossiers ! Ton client va être impressionné.', 'Prends cette mallette : un chef d\'entreprise range ses dossiers dedans.'],
      reward: { coins: 40, gad: 'mallette', journal: 'Les dossiers clients : un client fait confiance à celui qui ne perd rien.' } },
    { id: 'q_plans', w: 5, giver: 'lionnel', from: 1, title: 'Les plans de Lionnel',
      desc: 'Termine « Le portfolio » (5-6) sans tomber.',
      obj: { type: 'nodeath', w: 5, n: 1, levels: [5] },
      offer: ['Un architecte ne construit rien sans plan… ni sans précision.', 'Termine « Le portfolio » sans tomber une seule fois, et je te montre le toit de la ville.'],
      accept: 'Mesure deux fois, saute une fois.',
      remind: '« Le portfolio », sans chute. Tu vas y arriver.',
      thanks: ['Sans une chute ! C\'est du travail d\'architecte.', 'Le toit de la ville est ouvert : la case « SECRET » d\'OSWEL City.'],
      reward: { coins: 10, secretLevel: 5, title: 'Bâtisseur', journal: 'Les plans de Lionnel : de loin, il m\'a appris à viser juste.' } },
    { id: 'q_rumeur', w: 5, giver: 'zeus', from: 0, title: 'La dernière rumeur',
      desc: 'Fais taire la Rumeur (le boss d\'OSWEL City).',
      obj: { type: 'boss', w: 5 },
      offer: ['Petit frère, il reste une chose à faire.', 'La Rumeur. Tout le monde l\'écoute. Fais-la taire, pour de bon.'],
      accept: 'Je serai là. Comme toujours.',
      remind: 'La Rumeur parle encore. Va jusqu\'au bout.',
      thanks: ['Tu l\'as fait taire. Je suis fier de toi, petit frère.', 'Ce trophée est à toi. Tu l\'as gagné, pas avec la chance : avec le travail.'],
      reward: { coins: 50, gad: 'trophee', title: 'Plus fort que la Rumeur', journal: 'La dernière rumeur : on dira encore des choses. Moi, je sais d\'où je viens.' } },
  ];
  const QBY = {}; QUESTS.forEach((q) => (QBY[q.id] = q));

  /* ==================================================================
     4. LES INDICES : [discret, détaillé, solution guidée], un par type de section
     (ils décrivent EXACTEMENT le fonctionnement des sections de js/sections.js
     et js/pieges3.js)
     ================================================================== */
  const HINTS = {
    gaps: ['Des piliers au-dessus du vide : vise le milieu de chaque pilier.', 'Les blocs rouillés s\'effondrent peu après qu\'on s\'y pose : enchaîne les sauts sans t\'arrêter dessus. Les piliers gris sont sûrs : souffle là.', 'Arrête-toi sur un pilier gris, repère les blocs rouillés, puis traverse-les d\'un seul élan : un saut par bloc, sans pause.'],
    spikes: ['Une course avec des pics simples, doubles… et parfois des pics au plafond.', 'Saute juste avant chaque pic ; pour les doubles, prends de l\'élan. Sous des pics au plafond, fais de petits sauts (relâche SAUT plus tôt).', 'Avance en marchant, saute à une case de chaque pic ; sous le plafond piégé, appuie brièvement sur SAUT : le saut est plus court.'],
    crumbleBridge: ['Le pont rouillé ne tient pas : ne t\'arrête jamais dessus.', 'Chaque bloc tombe un instant après qu\'on y pose le pied. Traverse d\'une traite ; s\'il y a un fil rouge, des blocs tombent du plafond juste après.', 'Pars du bord en courant (□ / Maj) et ne lâche pas la direction jusqu\'au palier gris de l\'autre côté.'],
    pistons: ['Les pistons préviennent : ils tremblent juste avant de frapper.', 'Ils tombent en vague, l\'un après l\'autre. Passe sous chaque piston juste après qu\'il est remonté.', 'Arrête-toi avant le premier piston, attends qu\'il frappe puis remonte, et avance aussitôt : tu suis la vague au lieu de la croiser.'],
    hammers: ['Les marteaux se balancent : leur arc est tracé au mur.', 'Passe quand le marteau s\'éloigne de toi, pas quand il revient. Ils grincent à chaque aller-retour.', 'Place-toi juste avant l\'arc, attends que le marteau passe devant toi et reparte : à ce moment-là, cours dessous.'],
    crushers: ['Des blocs suspendus tombent quand on passe dessous.', 'Ils tremblent (tic tic tic) et leur ombre rougit avant de tomber : ne t\'arrête jamais dessous.', 'Traverse en courant sans t\'arrêter : le bloc tombe derrière toi. Ne reviens jamais sous un bloc qui tremble.'],
    pikes: ['Des piques sortent du sol en rythme.', 'Les pointes dépassent un instant, avec un clic, avant de jaillir : quand tu les vois, attends.', 'Avance d\'un îlot à l\'autre juste après qu\'une pique est rentrée ; écoute le clic de la suivante.'],
    saws: ['Des scies sur rail : regarde leur trajet avant de passer.', 'Celles du sol roulent dans une fosse : saute quand elles s\'éloignent. Celles qui montent et descendent : passe quand elles sont en haut.', 'Attends au bord, laisse la scie aller au bout de son rail, puis passe juste derrière elle.'],
    barrels: ['Les bidons explosent un peu après qu\'on s\'en approche.', 'Ils s\'allument et grésillent quand tu arrives, puis explosent une seconde plus tard : passe vite. Attention au trou juste derrière.', 'Cours sans t\'arrêter le long des bidons, et saute le trou qui suit dès que tu y arrives.'],
    troll: ['Certaines dalles du sol sont piégées.', 'Les dalles piégées ont une fine fissure : saute par-dessus.', 'Avance doucement, repère chaque dalle fissurée et saute-la ; marche normalement sur les autres.'],
    wireCeil: ['Un fil rouge au sol… il déclenche quelque chose.', 'Franchir le fil fait tomber des blocs du plafond un peu plus loin.', 'Franchis le fil, recule aussitôt, laisse les blocs tomber, puis repars : le passage est libre.'],
    fakeCoins: ['Une des pièces n\'est pas comme les autres.', 'La fausse pièce ne flotte pas et tourne à l\'envers : la prendre fait s\'effondrer le sol. Les vraies pièces sont plus haut, à gauche et à droite.', 'Laisse la pièce qui tourne à l\'envers ; prends celles d\'en haut en sautant depuis les côtés.'],
    fakeFlag: ['Tous les drapeaux ne sont pas des points de reprise.', 'Le faux drapeau n\'a pas de lampe et son mât est tordu ; il est posé sur un sol fissuré. Le vrai est plus loin, avec sa lampe.', 'Saute par-dessus le faux drapeau sans t\'arrêter, et continue jusqu\'au drapeau qui a une lampe.'],
    timedGate: ['Le bouton n\'ouvre la porte que quelques secondes.', 'Dès que tu appuies, ça fait tic-tac : il faut COURIR (□ / Maj / stick à fond) jusqu\'à la porte.', 'Appuie sur le bouton, puis cours sans t\'arrêter et sans sauter inutilement jusqu\'à la porte.'],
    crateBtn: ['La barrière ne reste ouverte que si quelque chose appuie sur le bouton.', 'Pousse la caisse jusque sur le bouton : la barrière restera ouverte.', 'Mets-toi derrière la caisse, pousse-la jusqu\'au bouton, saute par-dessus et passe la barrière.'],
    crateStep: ['Cette corniche est trop haute pour un seul saut.', 'Pousse la caisse contre le mur : elle devient une marche.', 'Pousse la caisse jusqu\'au mur, monte dessus, puis saute sur la corniche.'],
    levers: ['Les leviers changent le décor… dans les deux sens.', 'Le premier levier fait apparaître le pont mais ferme la barrière d\'en face ; de l\'autre côté, un 2e levier remet tout à l\'envers.', 'Actionne le 1er levier, traverse le pont, actionne le 2e levier pour rouvrir la barrière, puis passe.'],
    fork: ['Deux chemins : en haut, rapide ; en bas, sûr.', 'Le chemin du haut a des pics et des blocs rouillés mais plus de pièces ; celui du bas est plus long, avec une petite fosse. Ils se rejoignent.', 'Si tu tombes souvent, prends le bas : marche, et saute seulement la petite fosse.'],
    tower: ['On grimpe en zigzag.', 'Les corniches sont à gauche puis à droite : saute de l\'une à l\'autre en visant leur milieu.', 'Monte corniche par corniche ; en haut, passe par-dessus le mur et laisse-toi glisser de l\'autre côté.'],
    platRide: ['Des plateformes automatiques au-dessus des pics.', 'Attends que la plateforme arrive près de toi, monte dessus et reste au milieu.', 'Monte sur chaque plateforme quand elle est au plus près, puis saute vers la suivante quand elles se croisent.'],
    heatRun: ['Les plaques chauffent en rythme.', 'Elles rougeoient et grésillent juste avant de brûler : attends sur les îlots sûrs.', 'Reste sur un îlot, attends qu\'une plaque redevienne sombre, puis traverse jusqu\'à l\'îlot suivant.'],
    presses: ['Des murs se referment de chaque côté.', 'Passe juste après qu\'ils se sont rouverts ; ne reste jamais entre eux.', 'Arrête-toi avant chaque presse, attends qu\'elle s\'ouvre, et traverse d\'un coup.'],
    chase: ['Quelque chose arrive derrière toi : cours !', 'Ne t\'arrête pas et ne reviens pas : saute les obstacles en courant jusqu\'à la zone sûre.', 'Garde COURIR enfoncé et la direction vers la droite ; saute au dernier moment devant chaque trou.'],
    doorTrio: ['Trois portes, une seule vraie.', 'La fausse a un tourbillon qui tourne à l\'envers ; la piégée a une lumière rouge pâle (elle renvoie en arrière) ; la vraie a une lumière bleue.', 'Entre dans la porte à la lumière bleue.'],
    elecRun: ['Le sol électrique s\'allume et s\'éteint en rythme.', '1,3 seconde allumé, 1,3 seconde éteint ; il grésille juste avant. Attends sur les îlots.', 'Quand le sol vient de s\'éteindre, traverse jusqu\'à l\'îlot suivant ; sinon, attends.'],
    linkPick: ['Deux liens : lis bien l\'adresse.', 'L\'un a une faute de frappe et te renvoie au début ; l\'autre mène à la suite.', 'Prends le lien dont l\'adresse est écrite correctement.'],
    iceRun: ['La glace glisse !', 'On accélère et on freine mal sur la glace : lâche la direction tôt avant le trou. Les blocs-ressorts te font remonter.', 'Avance doucement, lâche la direction avant le bord, et saute sur les ressorts pour remonter.'],
    lowgJump: ['Ici, on flotte.', 'La gravité est faible au-dessus de l\'acide, mais il y a des pics au plafond : fais de petits sauts.', 'Appuie brièvement sur SAUT pour flotter juste au-dessus de l\'acide sans toucher le plafond.'],
    glitchSeq: ['Les blocs « glitch » apparaissent et disparaissent.', 'Ils clignotent juste avant de disparaître, en vague : suis la vague.', 'Pose-toi sur un bloc juste après qu\'il est réapparu, et avance au rythme de la vague.'],
    tags: ['Les balises ouvrent et ferment les blocs.', 'La balise ouvrante fait apparaître les blocs quelques secondes ; la balise fermante les garde.', 'Touche la balise ouvrante, monte sur les blocs, et touche vite la balise fermante : les blocs restent.'],
    jumpEvents: ['Ici, le niveau réagit quand tu sautes.', 'Le pont n\'existe que si personne ne saute, et des pics sortent quand quelqu\'un saute.', 'Traverse le pont en MARCHANT, sans sauter ; ne saute qu\'au-dessus du dernier pic fixe.'],
    compileBridge: ['Le bouton construit un pont.', 'Le pont se construit bloc par bloc : attends la fin de la compilation.', 'Appuie sur le bouton, attends « 0 erreur », puis traverse.'],
    windows: ['Des fenêtres montent et descendent.', 'Monte sur la première quand elle est en bas, puis saute sur la suivante quand elle est à ta hauteur.', 'Attends la fenêtre en bas, monte, puis enchaîne vers la deuxième quand elles se croisent ; finis sur le mur.'],
    invertRun: ['Les commandes sont inversées ici.', 'Gauche devient droite et droite devient gauche, seulement dans cette zone.', 'Pousse vers la GAUCHE pour avancer, et saute les pics comme d\'habitude.'],
    laserRun: ['Les lasers s\'allument en rythme.', 'Chacun a son rythme ; certains sont rapides. Passe quand il vient de s\'éteindre.', 'Arrête-toi avant chaque laser, compte son rythme, et passe juste après qu\'il s\'éteint.'],
    beltAcid: ['Des tapis roulants à contre-sens au-dessus de l\'acide.', 'Les tapis te tirent en arrière : cours, et saute vers l\'avant.', 'Cours sur chaque tapis et saute dès son bout vers le suivant, puis vers le palier.'],
    gooBoost: ['La gelée ralentit, le tapis accélérateur propulse.', 'Traverse la gelée, puis cours sur le tapis accélérateur : il te lance par-dessus la fosse.', 'Ne saute pas dans la gelée ; avance jusqu\'au tapis, cours dessus et saute à son bout.'],
    heavy: ['La gravité est forte ici : les sauts sont courts.', 'Les marches sont basses et le fossé étroit : de petits sauts suffisent.', 'Saute d\'une marche à l\'autre en prenant de l\'élan ; le fossé se passe en courant.'],
    crateShield: ['Un laser balaie le couloir.', 'Pousse la caisse devant toi : elle arrête le rayon.', 'Avance en poussant la caisse jusqu\'à la marche, monte dessus, puis saute sur la marche.'],
    turrets: ['Les tourelles tirent le long du couloir.', 'Leur œil rougit et bipe avant chaque tir : saute par-dessus le tir.', 'Avance, et dès que l\'œil rougit, saute au-dessus de la boule.'],
    kqHop: ['Blocs roses, blocs bleus : chaque saut les fait basculer.', 'Quand tu sautes, les blocs d\'une couleur apparaissent et ceux de l\'autre disparaissent.', 'Avant de sauter, regarde quels blocs existeront après ton saut, et vise ceux-là.'],
    flipRoom: ['La gravité s\'inverse ici.', 'Tu marches au plafond au-dessus d\'une fosse de pics ; attention au pic du plafond au milieu.', 'Avance au plafond et saute par-dessus le pic du plafond, puis continue jusqu\'à la fin de la zone.'],
    windRun: ['Le vent pousse en arrière.', 'Au-dessus des trous, le vent te ralentit : saute plus tôt et garde la direction.', 'Cours, saute bien avant le bord de chaque trou, et ne lâche pas la direction en l\'air.'],
    portalPick: ['Deux portails : un piège, un bon.', 'L\'orange vacille et tourne à l\'envers : il renvoie au début. Le bleu mène à la suite.', 'Saute par-dessus le portail orange et entre dans le bleu.'],
    fanLift: ['Le ventilateur peut te porter.', 'Place-toi dans son souffle : il te soulève jusqu\'à la corniche haute.', 'Va au-dessus du ventilateur, laisse-toi monter, puis glisse vers la corniche à droite.'],
    street: ['La route : les voitures arrivent.', 'Saute par-dessus les voitures ou abrite-toi sous l\'abribus.', 'Attends sous l\'abribus que la voiture passe, puis traverse.'],
    rooftops: ['Des sauts entre les toits.', 'Prends de l\'élan avant chaque saut ; la grue est une plateforme qui bouge.', 'Cours et saute au bord de chaque toit ; sur la grue, attends qu\'elle s\'approche du toit suivant.'],
    shiftHole: ['Il y a une fine fente dans le sol avant le trou…', 'Le trou se décale de 2 cases quand quelqu\'un saute près de lui… exactement là où on comptait atterrir.', 'Fais un petit saut AVANT le trou (il se décale tôt), puis franchis-le à sa nouvelle place ; ou prends un grand élan et saute très loin. S\'il y a des pics cachés à l\'arrivée, ne t\'arrête pas.'],
    popSpikes: ['Les petits trous dans le sol ne sont pas des trous d\'aération.', 'Des pics cachés sortent quand on marche (ou atterrit) dessus : ils dépassent avec un clic juste avant. Au plafond, ils descendent quand on passe dessous. « Hors service » : sa lampe clignote juste avant.', 'Saute par-dessus chaque groupe de petits trous sans t\'y poser ; sous les trous du plafond, passe vite sans sauter.'],
    ghostRoute: ['Les plateformes claires sont un peu… transparentes.', 'Les plateformes fantômes disparaissent si on s\'y arrête plus d\'un instant. En bas, les îlots gris sont sûrs.', 'Prends le chemin du bas (îlots gris) ; ou, en haut, enchaîne les plateformes claires sans jamais t\'arrêter.'],
    popWall: ['Une fente dans le sol, plus loin…', 'En passant le déclencheur, un mur jaillit devant toi et le sol fissuré derrière s\'effondre. Le mur redescend au bout de 3 secondes.', 'Saute les dalles fissurées, et quand le mur jaillit, attends sur le palier : il redescend tout seul.'],
    ceilPress: ['Le plafond du couloir… bouge.', 'Dès qu\'on entre, tout le plafond descend lentement. Ne traîne pas et ne reviens pas en arrière.', 'Entre en courant et traverse d\'une traite, sans sauter (tu te cognerais au plafond).'],
    kickDoor: ['Cette porte SORTIE a un tourbillon qui tourne à l\'envers.', 'C\'est une fausse sortie : elle te renvoie en arrière au-dessus d\'un sol qui s\'effondre. La vraie route passe en haut.', 'Monte les deux marches, saute sur la corniche, puis sur la passerelle du haut, qui passe au-dessus du mur.'],
    flappyPipes: ['Zone bleue : chaque SAUT en l\'air donne un coup d\'aile.', 'Dans la zone « battement », tu peux sauter en l\'air autant de fois que tu veux : de petits coups pour rester au milieu des ouvertures.', 'Saute depuis le bord, puis tapote SAUT régulièrement en avançant doucement ; vise le milieu de chaque ouverture.'],
    sawChase: ['La scie se lance quand tu passes.', 'Elle avance vers toi, moins vite que toi : ne t\'arrête pas, même quand le sol craque.', 'Passe le déclencheur en courant et garde ton élan ; saute le petit trou sans ralentir.'],
    baitCoin: ['Une pièce gratuite… vraiment ?', 'La pièce du milieu est un appât : la prendre fait tomber des bombes (ombres rouges). Le chemin du bas est sûr.', 'Si tu veux les pièces, prends-les puis éloigne-toi tout de suite des ombres rouges ; sinon, passe par le bas.'],
    backCoin: ['Une pièce apparaît derrière toi ? Méfiance.', 'Le sol sous la pièce oubliée est fissuré : il tombe juste après qu\'on la prend.', 'Si tu veux la pièce, saute aussitôt après l\'avoir prise ; sinon, continue tout droit.'],
    patternPlat: ['Quatre plateformes identiques… presque.', 'Quand tu te poses sur la 3e, la 4e glisse d\'une case et demie : regarde-la bouger avant de sauter.', 'Pose-toi sur la 3e, attends que la 4e ait fini de glisser, puis saute vers sa nouvelle place.'],
    wrapRoom: ['À l\'étage, les bords de la salle se rejoignent.', 'En bas, un grand mur bloque. À l\'étage, sortir par le bord GAUCHE te fait revenir par le bord DROIT.', 'Monte sur la marche puis sur la passerelle de gauche, sors par la gauche, et redescends par le trou de la passerelle de droite.'],
  };
  const NO_HINT = new Set(['rest', 'gate', 'exit', 'secret']);
  // qui donne les indices « à distance » (après plusieurs chutes) dans chaque monde
  const MENTOR = { 1: 'patou', 2: 'tony', 3: 'ange', 4: 'francheska', 5: 'christine' };

  /* ==================================================================
     5. LES NIVEAUX SECRETS (un par monde ; index 10 dans la liste du monde)
     ================================================================== */
  const SECRET_DEFS = {
    1: { title: 'La réserve d\'oncle Patou', host: 'patou', goal: 'La réserve secrète : tout ce que la Forge a de plus sournois. Atteins la SORTIE.',
      sign: 'RÉSERVE · INTERDIT AUX APPRENTIS', fragment: '« Dans la réserve de Patou, chaque outil avait servi. Chaque piège aussi. »',
      lines: ['Alors c\'est Franck qui t\'a parlé de ma réserve ? Bon…', 'Ici, je range tout ce qui pique, tombe et se décale. Montre-moi ce que tu as appris.'],
      zones: [['Les étagères', 'Les petits trous, la rouille, le trou qui bouge : tout ce que tu connais.', [['popSpikes', { at: [4, 10], w: 2, off: true }], ['crumbleBridge', { len: 10, delay: 0.45, coins: true }], ['shiftHole', { landSpikes: true, coins: true }]]],
        ['Le coffre', 'Le fond de la réserve. Un trésor t\'attend au bout.', [['ghostRoute', {}], ['popWall', {}], ['hammers', { n: 2, space: 8, py: 6 }], ['secret', { extra: true }], ['rest', { sign: 'LE TRÉSOR DE PATOU →', cp: true }]]]] },
    2: { title: 'Le serveur caché', host: 'yannick', goal: 'Le serveur que personne ne connaît. Atteins la SORTIE.',
      sign: 'SERVEUR PRIVÉ · ACCÈS RESTREINT', fragment: '« Yannick n\'a jamais dit bravo. Mais il m\'a ouvert son serveur. »',
      lines: ['Bienvenue sur mon serveur. Personne d\'autre ne l\'a vu.', 'Ici, tout est un peu… instable. Comme mon code du début.'],
      zones: [['La mémoire vive', 'Les blocs clignotent, les plateformes trichent.', [['glitchSeq', { n: 10, coins: true }], ['patternPlat', {}], ['linkPick', {}]]],
        ['Le cœur du serveur', 'Bats des ailes, fais le tour, et ne crois pas aux cadeaux.', [['flappyPipes', { gaps: [[3, 6], [6, 9], [2, 5]], spikes: true }], ['wrapRoom', {}], ['baitCoin', {}], ['secret', { extra: true }], ['rest', { sign: 'FIN DU SERVEUR →', cp: true }]]]] },
    3: { title: 'Le labo souterrain', host: 'dimi', goal: 'Le laboratoire sous le laboratoire. Atteins la SORTIE.',
      sign: 'SOUS-SOL · EXPÉRIENCES EN COURS', fragment: '« Sous le labo, il y avait un autre labo. Et sous mes chutes, une méthode. »',
      lines: ['Voici le labo souterrain. Les expériences ratées finissent ici.', 'Chaque piège suit une règle. Trouve-la, et le reste est du calcul.'],
      zones: [['Les couloirs', 'Lasers, scie, plafond : chaque piège a son rythme.', [['laserRun', {}], ['sawChase', { coins: true }], ['popSpikes', { mode: 'ceil', at: [5, 11], w: 2, ceil: 3 }]]],
        ['La salle d\'essai', 'Tapis, fantômes et fausse sortie.', [['beltAcid', {}], ['ghostRoute', { sign: 'PROTOTYPE DE PLATEFORME : NE PAS S\'ARRÊTER DESSUS' }], ['kickDoor', {}], ['secret', { extra: true }], ['rest', { sign: 'FIN DES ESSAIS →', cp: true }]]]] },
    4: { title: 'Le cloud privé', host: 'valdes', goal: 'Le cloud privé de Valdes. Atteins la SORTIE.',
      sign: 'CLOUD PRIVÉ · CHIFFRÉ', fragment: '« Le cloud privé tenait dans un seul serveur. Savoir s\'arrêter m\'en avait ouvert la porte. »',
      lines: ['Le cloud privé. Ici, le haut et le bas sont des options.', 'Mission : arriver au bout. Sans blackout, cette fois.'],
      zones: [['Le réseau', 'Ventilateur, blocs qui basculent, bords qui se rejoignent.', [['fanLift', {}], ['kqHop', {}], ['wrapRoom', { sign: 'RÉSEAU EN BOUCLE : BORD GAUCHE = BORD DROIT (À L\'ÉTAGE)' }]]],
        ['Le serveur central', 'La gravité tourne, les ailes battent, le trou bouge.', [['flipRoom', {}], ['flappyPipes', { gaps: [[3, 6], [6, 9], [3, 6]] }], ['shiftHole', { landSpikes: true }], ['secret', { extra: true }], ['rest', { sign: 'FIN DU CLOUD →', cp: true }]]]] },
    5: { title: 'Le toit de la ville', host: 'lionnel', goal: 'Les toits d\'OSWEL City, tout en haut. Atteins la SORTIE.',
      sign: 'TOITS · ACCÈS CHANTIER', fragment: '« Du toit de la ville, on voyait tout le chemin. La Forge, le Code, le Labo, le Nexus. Et la suite. »',
      lines: ['Le toit de la ville. D\'ici, on voit tout ce que tu as construit.', 'Le chemin est dangereux. Mais tu as des plans, maintenant.'],
      zones: [['Les toits', 'Sauts, plafond qui descend, mur qui surgit.', [['rooftops', {}], ['ceilPress', { len: 14, spikes: true }], ['popWall', {}]]],
        ['Le sommet', 'La route, la scie, la pièce oubliée, et la tour.', [['street', {}], ['sawChase', { coins: true }], ['backCoin', {}], ['tower', {}], ['secret', { extra: true }], ['rest', { sign: 'LE SOMMET →', cp: true }]]]] },
  };
  function buildSecretLevels() {
    if (!OT.mkLevel || !OT.Sections) return;
    for (const w in SECRET_DEFS) {
      const W = OT.WORLD_DATA[w]; if (!W) continue;
      const S0 = SECRET_DEFS[w];
      try {
        const L = OT.mkLevel(24, 13);
        L.rect(0, 0, 23, 0, '#');
        L.start(2, 1);
        L.sign(4, 1, S0.sign);
        L.npc(8, 1, S0.host);
        L.rect(13, 2, 15, 2, '#'); L.coin(14, 4);                // une corniche et sa pièce, pour commencer
        L.door(20, 1);
        const lines = S0.lines.slice();
        const def = {
          secret: true, title: S0.title, par: 120, goal: S0.goal, lesson: 'Défi de maîtrise', tone: 'épique', fragment: S0.fragment,
          dialogs: { [S0.host]: { lines, alt: ['Chaque piège ici, tu l\'as déjà vu ailleurs. Rappelle-toi comment tu l\'as passé.'] } },
          teach: { title: 'Défi de maîtrise', text: 'Un niveau secret rassemble les pièges du monde. On ne les passe pas avec de la chance : on les reconnaît, on se souvient de leur règle, et on applique. C\'est ça, maîtriser.',
            q: { question: 'Que faire devant un piège déjà rencontré ?', options: ['Se souvenir de sa règle et l\'appliquer', 'Foncer en espérant', 'Abandonner', 'Attendre qu\'il disparaisse'], answer: 0, explain: 'Chaque piège suit une règle : la reconnaître, c\'est déjà le passer.' } },
          build: L,
        };
        OT.Sections.extend(def, { h: 13, zones: S0.zones.map(([name, goal, secs]) => ({ name, goal, secs })) });
        def.par = 120;
        W.levels[10] = def;
      } catch (e) { console.warn('Niveau secret ' + w, e); }
    }
  }
  buildSecretLevels();

  /* ==================================================================
     6. L'ÉTAT SAUVEGARDÉ (profil.q15)
     ================================================================== */
  function st(P) {
    if (!P) return { q: {}, met: {}, heard: {}, said: {}, secrets: {}, hints: [], journal: [], titles: [], secretLv: {}, compass: false, declined: {} };
    const s = P.q15 = P.q15 || {};
    s.q = s.q || {}; s.met = s.met || {}; s.heard = s.heard || {}; s.said = s.said || {}; s.secrets = s.secrets || {};
    s.hints = Array.isArray(s.hints) ? s.hints : []; s.journal = Array.isArray(s.journal) ? s.journal : []; s.titles = Array.isArray(s.titles) ? s.titles : [];
    s.secretLv = s.secretLv || {}; s.declined = s.declined || {}; s.compass = !!s.compass;
    return s;
  }
  function questDone(P, id) { const q = st(P).q[id]; return !!(q && q.s === 'done'); }
  // les profils qui jouent (joueur 1 + vrai profil du joueur 2 en coop) ; aucun en Versus
  function inPlay() {
    const m = OT.Game && OT.Game.mode;
    if (m === 'versus' || m === 'party') return [];
    const list = OT.UI && OT.UI.profilesInPlay ? OT.UI.profilesInPlay() : [OT.Save.active];
    return list.filter(Boolean);
  }
  const save = () => { try { OT.Save.save(); } catch (e) {} };

  /* ---------- progression et récompense ---------- */
  function progress(P, Q) {
    const q = st(P).q[Q.id]; const o = Q.obj;
    if (!q) return { n: 0, of: 1 };
    if (q.s === 'done') return { n: 1, of: 1, done: true };
    if (o.type === 'items') return { n: (q.got || []).length, of: o.items.length };
    if (o.type === 'secrets') return { n: Object.keys(st(P).secrets).filter((k) => k.startsWith(o.w + '-')).length, of: o.n };   // (les salles trouvées avant comptent aussi)
    if (o.type === 'nodeath') return { n: (q.got || []).length, of: o.n };
    return { n: q.ok ? 1 : 0, of: 1 };
  }
  function rewardText(r) {
    const out = [];
    if (r.coins) out.push(`+${r.coins} pièces`);
    if (r.gad) { const g = (OT.SHOP.gadgets || []).find((x) => x.id === r.gad); out.push(`gadget « ${g ? g.name : r.gad} » (apparence)`); }
    if (r.compass) out.push('la Boussole d\'Isaïe (équipement : elle montre les secrets)');
    if (r.secretLevel) out.push('un NIVEAU SECRET');
    if (r.title) out.push(`le titre « ${r.title} »`);
    return out.join(' · ');
  }
  // vérifie l'objectif ; s'il est atteint : récompense (une seule fois), toast, réaction
  function check(P, Q, R) {
    const s = st(P), q = s.q[Q.id];
    if (!q || q.s !== 'active') return;
    const pr = progress(P, Q);
    if (pr.n < pr.of) return;
    q.s = 'done'; q.done = Date.now();
    if (!q.rewarded) {
      q.rewarded = true;
      const r = Q.reward || {};
      if (r.coins) P.coins = (P.coins || 0) + r.coins;
      if (r.gad) { P.owned = P.owned || {}; P.owned.gad = P.owned.gad || ['aucun']; if (!P.owned.gad.includes(r.gad)) P.owned.gad.push(r.gad); else P.coins += 10; }
      if (r.compass) s.compass = true;
      if (r.secretLevel) s.secretLv[r.secretLevel] = true;
      if (r.title && !s.titles.includes(r.title)) s.titles.push(r.title);
      if (r.journal) s.journal.push({ w: Q.w, t: Q.title, text: r.journal });
      if (OT.UI && OT.UI.toast && P === OT.Save.active) OT.UI.toast(`Quête terminée : ${Q.title} — ${rewardText(r)}`);
      if (OT.Sound) { try { OT.Sound.buy(); } catch (e) {} }
      if (P === OT.Save.active && OT.Game && OT.Game.api && OT.Game.api.heroBark) setTimeout(() => OT.Game.api.heroBark('q_done', null, { force: true }), 900);
    }
    save();
  }
  function each(fn) { for (const P of inPlay()) for (const Q of QUESTS) { const q = st(P).q[Q.id]; if (q && q.s === 'active') fn(P, Q, q); } }

  /* ==================================================================
     7. LES ÉVÉNEMENTS DU JEU
     ================================================================== */
  const T3 = () => window.THREE;
  let ITEM_MAT = null, ITEM_GEO = null, ARROW_MAT = null, ARROW_GEO = null;
  function itemMesh(icon, M) {
    const THREE = T3();
    if (!ITEM_GEO) { ITEM_GEO = new THREE.OctahedronGeometry(0.32); ITEM_GEO.userData.shared = true; ITEM_MAT = new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffc23a, emissiveIntensity: 1.6, metalness: 0.4, roughness: 0.3 }); }
    const g = new THREE.Group();
    g.add(new THREE.Mesh(ITEM_GEO, ITEM_MAT));
    const lab = M.label(icon, { size: 34, h: 0.36, color: '#ffe9a0', bg: 'rgba(30,20,0,0.75)', border: '#ffc23a' }); lab.position.set(0, 0.75, 0.2); g.add(lab);
    return g;
  }
  // où poser l'objet k d'une quête : dans la salle cachée du niveau (au fond, à côté des pièces)
  function itemSpot(B, k) {
    const secs = (B.secs || []).filter((s) => s.k === 'secret');
    const sec = secs[k || 0] || secs[0];
    if (!sec) return null;
    return { x: sec.x0 + 12.5, y: 4.6 };
  }
  GX.on('build', (R, X) => {
    R.qitems = []; R.secDeaths = {}; R.zoneDeaths = 0;
    if (!R.def) return;
    const B = R.def.build || {};
    const P = OT.Save.active;
    const players = inPlay();
    if (players.length) {
      for (const Q of QUESTS) {
        if (Q.obj.type !== 'items') continue;
        Q.obj.items.forEach((it, k) => {
          if (it.w !== X.worldId || it.i !== X.levelIndex) return;
          // visible si au moins un joueur a la quête en cours et n'a pas encore cet objet
          const want = players.some((pp) => { const q = st(pp).q[Q.id]; return q && q.s === 'active' && !(q.got || []).includes(k); });
          if (!want) return;
          const sp = itemSpot(B, it.room); if (!sp) return;
          const m = itemMesh(Q.obj.icon, X.M); m.position.set(sp.x, sp.y, 0.3); X.group().add(m);
          R.qitems.push({ qid: Q.id, k, x: sp.x, y: sp.y, mesh: m, taken: false });
        });
      }
    }
    // la boussole d'Isaïe (si le joueur 1 l'a) : une petite flèche au-dessus de la tête
    R.compass = null;
    if (P && st(P).compass && OT.Game.mode !== 'versus') {
      const THREE = T3();
      if (!ARROW_GEO) { ARROW_GEO = new THREE.ConeGeometry(0.16, 0.42, 8); ARROW_GEO.rotateZ(-Math.PI / 2); ARROW_GEO.userData.shared = true; ARROW_MAT = new THREE.MeshBasicMaterial({ color: 0x5fd4ff, transparent: true, opacity: 0.85, toneMapped: false }); }
      R.compass = new THREE.Mesh(ARROW_GEO, ARROW_MAT); R.compass.visible = false; X.group().add(R.compass);
    }
  });
  GX.on('update', (alive, dt, X) => {
    const R = X.R; if (!R || !R.qitems) return;
    // objets de quête : ils tournent ; on les ramasse comme une pièce
    for (const it of R.qitems) {
      if (it.taken) continue;
      it.mesh.rotation.y += dt * 2; it.mesh.position.y = it.y + Math.sin(X.time * 3 + it.k) * 0.08;
      const p = alive.find((q) => Math.abs(q.x - it.x) < 0.6 && q.y < it.y + 0.4 && q.y + 0.9 > it.y - 0.4);
      if (!p) continue;
      it.taken = true; it.mesh.visible = false;
      X.burst(it.x, it.y, 22, [0xffe9a0, 0xffffff, 0xffc23a], 6, { up: 1 });
      try { OT.Sound.part(); } catch (e) {}
      X.rumble(p.i, 0.2, 0.6, 200);
      const Q = QBY[it.qid];
      for (const P of inPlay()) {
        const q = st(P).q[Q.id];
        if (!q || q.s !== 'active') continue;
        q.got = q.got || []; if (!q.got.includes(it.k)) q.got.push(it.k);
      }
      const P1 = OT.Save.active, pr = progress(P1, Q);
      X.bubble(it.x, it.y + 1.6, `${Q.obj.name} ${Math.min(pr.n, pr.of)}/${pr.of}`, 2.4, '#ffd23f');
      for (const P of inPlay()) check(P, Q, R);
      save();
    }
    // la boussole : la flèche montre la salle cachée non trouvée (ou l'objet de quête) la plus proche, à moins de 30 cases
    if (R.compass) {
      const p = alive[0];
      let best = null;
      if (p) {
        const cand = [];
        for (const it of R.qitems) if (!it.taken) cand.push({ x: it.x, y: it.y });
        const B = R.def.build || {};
        (B.secs || []).filter((s) => s.k === 'secret').forEach((s, k) => { const sr = R.secretRooms && R.secretRooms[k]; if (!sr || !sr.found) cand.push({ x: s.x0 + 10, y: 5 }); });
        for (const c of cand) { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < 30 && d > 1.2 && (!best || d < best.d)) best = { x: c.x, y: c.y, d }; }
      }
      R.compass.visible = !!best;
      if (best) {
        const a = Math.atan2(best.y - (p.y + 1), best.x - p.x);
        R.compass.position.set(p.x + Math.cos(a) * 0.7, p.y + 2.05 + Math.sin(a) * 0.35, 0.6);
        R.compass.rotation.z = a;
        ARROW_MAT.opacity = 0.55 + Math.sin(X.time * 6) * 0.3;
      }
    }
  });
  // une salle cachée trouvée
  GX.on('secretFound', (sr, p, X) => {
    const k = `${X.worldId}-${X.levelIndex}-${(X.R.secretRooms || []).indexOf(sr)}`;
    for (const P of inPlay()) {
      const s = st(P);
      if (!s.secrets[k]) s.secrets[k] = Date.now();
      for (const Q of QUESTS) {
        const q = s.q[Q.id]; if (!q || q.s !== 'active') continue;
        if (Q.obj.type === 'secret' && Q.obj.w === X.worldId && Q.obj.i === X.levelIndex) q.ok = true;
        check(P, Q, X.R);
      }
    }
    save();
  });
  // un personnage agit (Win Black : blackout / blackout total)
  GX.on('npcAct', (act, n, X) => {
    const R = X.R; R.q15 = R.q15 || {};
    if (act === 'blackout') R.q15.blackout = (R.q15.blackout || 0) + 1;
    if (act === 'blackoutTotal') R.q15.total = true;
  });
  // fin de niveau : les objectifs « sans chute », « rival », « boss », « blackout »
  GX.on('finish', (info, X) => {
    const R = X.R, sec = !!(info.def && info.def.secret);
    each((P, Q, q) => {
      const o = Q.obj;
      if (o.type === 'nodeath' && info.world === o.w && info.deaths === 0 && !sec && !(o.noBoss && info.isBoss) && (!o.levels || o.levels.includes(info.index))) {
        q.got = q.got || []; if (!q.got.includes(info.index)) q.got.push(info.index);
      }
      if (o.type === 'rival' && info.world === o.w && info.index === o.i && info.rival && info.rival.beaten) q.ok = true;
      if (o.type === 'boss' && info.world === o.w && info.isBoss) q.ok = true;
      if (o.type === 'blackout' && info.world === o.w && info.index === o.i && R.q15 && R.q15.blackout >= 1 && !R.q15.total) q.ok = true;
      check(P, Q, R);
    });
    save();
  });
  // chutes : on compte par section ; après 3, 5 et 8 chutes au même endroit, le mentor du monde
  // donne (de loin, en sous-titre) l'indice discret, puis détaillé, puis la solution
  GX.on('kill', (p, cause, X) => {
    const R = X.R, B = R.def.build || {};
    if (!B.secs || OT.Game.mode === 'versus' || OT.Game.mode === 'party' || (R.boss && !R.escape)) return;
    const s = B.secs.find((q) => p.x >= q.x0 - 0.5 && p.x < q.x1 + 0.5);
    if (!s) { R.zoneDeaths = (R.zoneDeaths || 0) + 1; return; }
    if (NO_HINT.has(s.k) || !HINTS[s.k]) return;
    const n = (R.secDeaths[s.x0] = (R.secDeaths[s.x0] || 0) + 1);
    const lvl = n === 3 ? 0 : n === 5 ? 1 : n === 8 ? 2 : -1;
    if (lvl < 0) return;
    const who = MENTOR[X.worldId] || 'patou';
    const text = HINTS[s.k][lvl];
    const R0 = R;
    setTimeout(() => {
      if (OT.Game.api.R !== R0 || !Dl()) return;
      Dl().say(who, text, { priority: 2, name: (OT.CHARACTERS[who] || {}).name });
      recordHint(X.worldId, X.levelIndex, s.k, lvl, text, who);
    }, 1500);
  });
  function recordHint(w, i, k, lvl, text, who) {
    for (const P of inPlay()) {
      const s = st(P);
      if (s.hints.some((h) => h.w === w && h.i === i && h.k === k && h.l === lvl)) continue;
      s.hints.unshift({ w, i, k, l: lvl, text, who, t: Date.now() });
      if (s.hints.length > 40) s.hints.length = 40;
    }
    save();
  }

  /* ==================================================================
     8. LES CONVERSATIONS (appelées par game.js → talkTo)
     ================================================================== */
  const pick = (L) => L[Math.floor(Math.random() * L.length)];
  const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (o[k] !== undefined ? o[k] : ''));
  // la section « à venir » qui mérite un conseil : celle où l'on est tombé le plus (≥ 2), sinon la prochaine
  function hintTarget(R, px) {
    const B = R.def.build || {};
    const secs = (B.secs || []).filter((s) => !NO_HINT.has(s.k) && HINTS[s.k] && s.x1 > px - 1);
    if (!secs.length) return null;
    let best = null;
    for (const s of secs) { const d = (R.secDeaths || {})[s.x0] || 0; if (d >= 2 && (!best || d > best.d)) best = { s, d }; }
    const s = best ? best.s : secs[0];
    const zi = (B.zonesX || []).filter((zx) => zx <= s.x0).length;   // 0 = zone 1
    const zname = zi > 0 && R.def.zones ? R.def.zones[zi - 1] : null;
    return { k: s.k, x0: s.x0, zone: zname, ahead: s.x0 > px + 2 };
  }
  // ctx : { lines (répliques normales), again, deaths, world, level, px }
  function talk(n, ctx) {
    const P = OT.Save.active, mode = OT.Game.mode;
    if (!P || mode === 'versus' || mode === 'party') return null;
    const s = st(P), id = n.id, w = ctx.world, i = ctx.level;
    const role = ROLES[id];
    const key = `${w}-${i}-${id}`;
    const met = s.met[id] || 0;
    let lines = ctx.lines || [];
    // déjà entendu (une autre partie) : ils te reconnaissent au lieu de tout répéter
    if (s.heard[key] && !ctx.again && lines.length && !ctx.isAlt) lines = [[id, pick(RETOUR[id] || RETOUR._)]];
    else if (!s.heard[key] && met > 0 && !ctx.again && lines.length && Math.random() < 0.6) lines = [[id, pick(RETOUR[id] || RETOUR._)]].concat(lines);
    if (ctx.first) { s.heard[key] = 1; s.met[id] = met + 1; }
    lines = lines.slice();
    // un souvenir (une seule fois par profil, seulement si c'est vraiment arrivé)
    for (const S0 of SOUVENIRS) if (S0.who === id && !s.said[S0.id] && S0.if(P)) { s.said[S0.id] = 1; lines.push([id, S0.text]); break; }
    // les quêtes
    let offer = null;
    for (const Q of QUESTS) {
      const q = s.q[Q.id];
      // livrer quelque chose à ce personnage (quête « parler à… »)
      if (q && q.s === 'active' && Q.obj.type === 'talk' && Q.obj.npc === id) {
        q.ok = true; (Q.deliver || []).forEach((l) => lines.push([l[0] === 'oswel' ? 'oswel' : l[0], l[1]]));
        for (const PP of inPlay()) { const qq = st(PP).q[Q.id]; if (qq && qq.s === 'active') { qq.ok = true; check(PP, Q, OT.Game.api.R); } }
        continue;
      }
      if (Q.giver !== id) continue;
      if (!q) { if (w === Q.w && i >= (Q.from || 0) && !offer) offer = Q; continue; }
      if (q.s === 'active') { const pr = progress(P, Q); lines.push([id, fill(Q.remind, { left: Math.max(0, pr.of - pr.n) })]); }
      else if (q.s === 'done' && !q.thanked) { q.thanked = true; Q.thanks.forEach((t) => lines.push([id, t])); }
    }
    if (offer) {
      if (s.declined[offer.id]) lines.push([id, 'Tu as réfléchi à ma proposition ?']);
      offer.offer.forEach((t) => lines.push([id, t]));
    }
    save();
    // l'indice : sur la section à venir (ou celle où tu tombes), sinon sur ce passage (zone 1)
    const R = OT.Game.api.R;
    const tg = R ? hintTarget(R, ctx.px) : null;
    const zone1 = R && R.def.build && R.def.build.zonesX && ctx.px < R.def.build.zonesX[0];
    const alt = zone1 && ctx.alt && ctx.alt.length ? ctx.alt : null;
    const after = (done) => {
      const opts = [];
      if (offer) opts.push({ label: `✓ Accepter la quête « ${offer.title} »`, f: () => accept(offer, id, done) });
      if (tg || alt) {
        // (1.5, voix) chaque phrase est une réplique à part : la petite introduction du personnage, l'endroit,
        // puis l'indice — toutes ont une voix fabriquée d'avance (voir hintVoiceLines plus bas)
        const intro = introOf(role);
        const pre = intro ? [[id, intro]] : [];
        const L = (lvl) => {
          if (alt && (!tg || !tg.ahead || lvl === 0)) {
            // zone 1 : ses propres conseils (écrits pour ce niveau), puis la suite
            if (lvl === 0) return pre.concat([[id, R.def.goal || alt[0]]]);
            const out = alt.map((t) => [id, t]);
            if (lvl === 2 && tg) out.push([id, tg.zone ? `Et plus loin, dans « ${tg.zone} ».` : 'Et plus loin.'], [id, HINTS[tg.k][1]]);
            return out;
          }
          return pre.concat(tg.ahead && tg.zone ? [[id, `Plus loin, dans « ${tg.zone} ».`]] : [], [[id, HINTS[tg.k][lvl]]]);
        };
        opts.push({ label: '💡 Un indice discret', f: () => giveHint(L(0), tg, 0, done, w, i, id) });
        opts.push({ label: '🔎 Un conseil détaillé', f: () => giveHint(L(1), tg, 1, done, w, i, id) });
        opts.push({ label: '🧭 La solution guidée', f: () => giveHint(L(2), tg, 2, done, w, i, id) });
      }
      if (!opts.length) { done(); return; }
      opts.push({ label: offer ? 'Plus tard' : 'Merci, ça ira', f: () => { if (offer) { s.declined[offer.id] = 1; save(); } done(); }, cancel: true });
      choose(`${(OT.CHARACTERS[id] || { name: id }).name}${role ? ' · ' + ROLE_NAME[role] : ''}`, opts);
    };
    return { lines, after };
  }
  function accept(Q, id, done) {
    for (const P of inPlay()) {
      const s = st(P); if (!s.q[Q.id]) s.q[Q.id] = { s: 'active', t: Date.now(), got: [] }; delete s.declined[Q.id];
      // déjà fait avant d'accepter ? (salle cachée déjà trouvée, boss déjà battu) : ça compte
      const q = s.q[Q.id], o = Q.obj;
      if (o.type === 'secret' && Object.keys(s.secrets).some((k) => k.startsWith(`${o.w}-${o.i}-`))) q.ok = true;
      if (o.type === 'boss' && bossDone(P, o.w)) q.ok = true;
    }
    save();
    if (OT.UI && OT.UI.toast) OT.UI.toast(`Nouvelle quête : ${Q.title} (voir le Journal)`);
    OT.UI.dialog([[id, Q.accept]], done);
    // la quête est peut-être DÉJÀ remplie (ex. salles cachées trouvées avant) : on vérifie
    for (const P of inPlay()) check(P, Q, OT.Game.api.R);
  }
  function giveHint(lines, tg, lvl, done, w, i, who) {
    if (tg) recordHint(w, i, tg.k, lvl, lines.filter((l) => l[1] !== introOf(ROLES[who])).map((l) => l[1]).join(' '), who);
    OT.UI.dialog(lines, done);
  }

  /* ==================================================================
     9. LE MENU DE CHOIX (clavier, manette, tactile : comme les autres menus)
     ================================================================== */
  let choiceOpts = null;
  function ensureChoiceScreen() {
    if (document.getElementById('screen-choix')) return;
    const sec = document.createElement('section');
    sec.className = 'screen'; sec.id = 'screen-choix'; sec.hidden = true;
    sec.innerHTML = '<div class="panel narrow choix"><div class="kicker" id="choix-who"></div><h2>Que veux-tu ?</h2><nav class="menu" id="choix-list"></nav><p class="muted small">Un indice ne coûte rien. Le jeu est en pause pendant que tu choisis.</p></div>';
    document.body.appendChild(sec);
    const X = OT.UI.ext;
    X.actions.qChoice = (k) => { const o = choiceOpts && choiceOpts[+k]; if (!o) return; choiceOpts = null; X.show(null); o.f(); };
    // Retour (○ / Échap) = la dernière option (« Merci, ça ira » / « Plus tard »)
    const back0 = X.actions.back;
    X.actions.back = () => { const cur = X.current; if (cur && cur.id === 'screen-choix') { const k = choiceOpts ? choiceOpts.findIndex((o) => o.cancel) : -1; X.actions.qChoice(k < 0 ? choiceOpts.length - 1 : k); return; } back0(); };
  }
  function choose(who, opts) {
    ensureChoiceScreen();
    choiceOpts = opts;
    const X = OT.UI.ext;
    X.$('#choix-who').textContent = who;
    X.$('#choix-list').innerHTML = opts.map((o, k) => `<button class="btn${k === 0 ? ' primary' : ''}${o.cancel ? ' ghost' : ''}" data-nav${k === 0 ? ' data-default' : ''} data-act="qChoice:${k}">${X.esc(o.label)}</button>`).join('');
    X.show('choix');
  }

  /* ==================================================================
     10. LE JOURNAL
     ================================================================== */
  function journal(P) {
    P = P || OT.Save.active;
    const s = st(P);
    const quests = QUESTS.map((Q) => {
      const q = s.q[Q.id]; if (!q) return null;
      const pr = progress(P, Q);
      return { id: Q.id, w: Q.w, title: Q.title, desc: Q.desc, giver: (OT.CHARACTERS[Q.giver] || {}).name || Q.giver, done: q.s === 'done', n: Math.min(pr.n, pr.of), of: pr.of, reward: rewardText(Q.reward || {}) };
    }).filter(Boolean);
    const met = Object.keys(s.met).map((id) => ({ id, name: (OT.CHARACTERS[id] || {}).name || id, role: ROLE_NAME[ROLES[id]] || '', n: s.met[id] }));
    const secrets = Object.keys(s.secrets).map((k) => { const [w, i] = k.split('-').map(Number); const lv = OT.WORLD_DATA[w] && OT.WORLD_DATA[w].levels[i]; return { w, i, title: lv ? lv.title : '' }; });
    const secretLv = Object.keys(SECRET_DEFS).map(Number).map((w) => ({ w, title: SECRET_DEFS[w].title, open: !!s.secretLv[w], done: !!(P.worlds && P.worlds[w] && P.worlds[w].done && P.worlds[w].done[10]) }));
    return { quests, met, secrets, secretLv, hints: s.hints, journal: s.journal, titles: s.titles, compass: s.compass };
  }
  const secretOpen = (P, w) => !!(P && st(P).secretLv[w]);
  // la réaction du héros quand une quête se termine
  if (Dl() && Dl().defineBarks) Dl().defineBarks('q_done', { p: 1, cd: 4 }, {
    _: ['Quête terminée !', 'Une promesse tenue.'],
    oswel: ['Une promesse tenue.', 'Voilà, c\'est fait. Ça fait du bien.'],
    franck: ['Mission réussie, cousin !'], meka: ['Objectif accompli.'], byte: ['Quête terminée ! Succès débloqué !'],
  });
  // les répliques des quêtes ont leur voix (tools/voix/generer.py les retrouve)
  if (Dl() && Dl().register) {
    QUESTS.forEach((Q) => {
      Q.offer.concat([Q.accept], Q.thanks).forEach((t, k) => Dl().register(`q15/${Q.id}/${k}`, Q.giver, t));
      (Q.deliver || []).forEach(([who, t], k) => Dl().register(`q15/${Q.id}/d${k}`, who, t));
    });
    for (const id in RETOUR) if (id !== '_') RETOUR[id].forEach((t, k) => Dl().register(`q15/retour/${id}/${k}`, id, t));
    SOUVENIRS.forEach((S0) => Dl().register(`q15/souvenir/${S0.id}`, S0.who, S0.text));
    for (const w in SECRET_DEFS) SECRET_DEFS[w].lines.forEach((t, k) => Dl().register(`q15/secret/${w}/${k}`, SECRET_DEFS[w].host, t));
  }
  // (1.5) TOUTES les phrases d'indice qu'un personnage peut dire, avec SA voix :
  //   - le mentor du monde (après 3, 5, 8 chutes) : chaque indice des pièges de son monde ;
  //   - chaque personnage d'un niveau : son introduction, « Plus loin, dans « zone ». », et les indices
  //     des pièges de CE niveau (c'est lui qui les dit quand on lui demande).
  // L'outil des voix (tools/voix/generer.py) les retrouve grâce à OT.Dialogue.register.
  function hintVoiceLines() {
    const out = [];
    for (const w of Object.keys(OT.WORLD_DATA || {})) {
      const L = OT.WORLD_DATA[w].levels || [];
      L.forEach((lv, i) => {
        if (!lv || !lv.build) return;
        const B = lv.build, kinds = new Set();
        (B.secs || []).forEach((sc) => { if (HINTS[sc.k] && !NO_HINT.has(sc.k)) kinds.add(sc.k); });
        const mentor = MENTOR[w];
        kinds.forEach((k) => HINTS[k].forEach((t) => out.push([mentor, t])));
        const npcs = new Set((B.ents || []).filter((e) => e.type === 'npc' && e.id).map((e) => e.id));
        npcs.forEach((id) => {
          const intro = introOf(ROLES[id]);
          if (intro) out.push([id, intro]);
          if (lv.goal) out.push([id, lv.goal]);
          out.push([id, 'Et plus loin.']);
          (lv.zones || []).forEach((z) => { out.push([id, `Plus loin, dans « ${z} ».`]); out.push([id, `Et plus loin, dans « ${z} ».`]); });
          kinds.forEach((k) => HINTS[k].forEach((t) => out.push([id, t])));
        });
      });
    }
    // les rappels de quête (« Il me manque encore 2 boulon(s)… ») pour chaque nombre possible,
    // « Tu as réfléchi à ma proposition ? » pour chaque personnage qui donne une quête,
    // et les retrouvailles par défaut pour les personnages qui n'ont pas les leurs
    const npcAll = new Set();
    for (const w of Object.keys(OT.WORLD_DATA || {})) (OT.WORLD_DATA[w].levels || []).forEach((lv) => ((lv && lv.build && lv.build.ents) || []).forEach((e) => { if (e.type === 'npc' && e.id) npcAll.add(e.id); }));
    QUESTS.forEach((Q) => {
      const o = Q.obj, max = o.type === 'items' ? o.items.length : o.type === 'secrets' || o.type === 'nodeath' ? o.n : 1;
      for (let left = 0; left <= max; left++) out.push([Q.giver, fill(Q.remind, { left })]);
      out.push([Q.giver, 'Tu as réfléchi à ma proposition ?']);
    });
    npcAll.forEach((id) => { if (!RETOUR[id]) RETOUR._.forEach((t) => out.push([id, t])); });
    return out;
  }
  // (les niveaux et les zones sont construits plus tard : on enregistre au premier besoin)
  function registerHintVoices() {
    if (!Dl() || !Dl().register || registerHintVoices.done) return;
    registerHintVoices.done = true;
    hintVoiceLines().forEach(([who, t]) => Dl().register(`q15/h/${who}/${Dl().keyOf ? Dl().keyOf(who, t) : t}`, who, t));
  }

  try { registerHintVoices(); } catch (e) { console.warn('[quêtes] voix des indices', e); }

  return { QUESTS, HINTS, SECRET_DEFS, ROLES, ROLE_NAME, talk, journal, state: st, secretOpen, progress, questDone, inPlay, hintTarget, hintVoiceLines };
})();
