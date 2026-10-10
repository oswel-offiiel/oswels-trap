/* =====================================================================
   OSWEL'S TRAP — combat.js  (version 1.5 : les COMBATS DE BOSS)

   Le système COMMUN des cinq combats (le code de chaque boss reste dans
   js/game.js, avec ses attaques) :
     - OT.Combat.cine(type, o)  : une courte mise en scène (≤ 1,6 s) qui ne bloque
       JAMAIS les commandes : bandes noires, titre, petit ralenti, secousse de
       caméra, vibration, coupure brève de la musique.
       types : 'intro', 'phase', 'final', 'special', 'critique', 'victoire'
     - OT.Combat.event(nom)     : un moment du combat → le boss parle (sa voix, ses
       sous-titres) et/ou le héros réagit. Avec des délais : pas de bavardage.
       noms : intro, nouveau:<attaque>, special, dodge, hurt, weak, fail, near,
              final, defeat, after
     - les répliques des boss (personnalité de chacun) et du héros ;
     - les compléments des explications de chaque phase (bossText) : ce que disent
       les personnages correspond EXACTEMENT aux nouvelles attaques du jeu.
   Le ralenti et les secousses respectent le réglage « Réduire les mouvements ».
   ===================================================================== */
window.OT = window.OT || {};

OT.Combat = (function () {
  /* ---------- la voix de chaque boss (fichiers audio/fr/characters/<voix>/…) ---------- */
  const VOIX = { gardien: 'gardien', bug: 'bug', exam: 'machine', zeus: 'zeus', rumeur: 'rumeur' };
  const NOMS = { gardien: 'Le Gardien', bug: 'Le Bug', exam: "La Machine de l'Examen", zeus: 'Zeus', rumeur: 'La Rumeur' };
  const COUL = { gardien: '#ff9a2a', bug: '#ff2a3a', exam: '#3cffd8', zeus: '#f2c230', rumeur: '#b78cff' };

  /* ---------- LEURS RÉPLIQUES (courtes pendant le combat) ----------
     Chaque boss a son caractère : le Gardien parle avec autorité, le Bug bégaie et se
     moque, la Machine est un examinateur froid, Zeus (le grand frère) est arrogant mais
     chaleureux, la Rumeur cherche à faire douter. */
  const LIGNES = {
    gardien: {
      intro: ['Halte. Personne ne quitte la Forge sans mon accord.', 'Approche, apprenti. Montre-moi ce que valent tes mains.'],
      'nouveau:slam': ['Sous mon poing, tout plie !'],
      'nouveau:fire': ['La forge s\'embrase ! Le métal fond. Et toi ?'],
      'nouveau:sweep': ['Mon bras balaie tout !'],
      'nouveau:combo': ['Trop près, apprenti !'],
      special: ['ÉCRASÉ !', 'La forge entière m\'obéit !'],
      dodge: ['Tu esquives… pour l\'instant.', 'Rapide. Mais la force finit toujours par gagner.'],
      hurt: ['Grrr… bien visé.', 'Tu frappes juste, apprenti.'],
      weak: ['Mon équilibre… !'],
      fail: ['Le métal mal chauffé se brise. Recommence.', 'Observe avant de frapper.'],
      near: ['Mes rouages… ralentissent…'],
      after: ['Va. La Forge t\'a appris ce qu\'elle pouvait.'],
    },
    bug: {
      intro: ['Er… erreur quatre cent quatre : héros non trouvé.', 'Je suis partout. Et nulle part.'],
      'nouveau:clone': ['Copier, coller, copier, coller… Lequel est le vrai ?'],
      'nouveau:shot': ['Paquet de données en approche !'],
      'nouveau:column': ['Corruption de la mémoire… chez toi.'],
      'nouveau:split': ['Je découpe ton écran en morceaux !'],
      special: ['Surcharge ! Surcharge !', 'Mémoire saturée… pour toi.'],
      dodge: ['Esquive non prévue dans mon code.', 'Hein ? Tu as débogué ça ?'],
      hurt: ['Aïe ! Ce correctif… pique.', 'Exception non gérée !'],
      weak: ['Je… je plante…'],
      fail: ['Redémarrage du héros… encore.', 'Tu tapes au hasard. Comme au début.'],
      near: ['Je suis une fonc… une fonctionnalité…'],
      after: ['Bon. Ton code tiendra. Peut-être.'],
    },
    exam: {
      intro: ['Candidat Oswel. Installez-vous. L\'examen commence.', 'Aucune note n\'est donnée par pitié.'],
      'nouveau:elec': ['Séquence électrique. Observez l\'ordre.'],
      'nouveau:slam': ['Bras d\'évaluation activé.'],
      'nouveau:analyse': ['Stratégie répétée détectée. Variante appliquée.'],
      special: ['Épreuve pratique. Maintenant.'],
      breaker: ['Défenses interrompues. Astucieux.'],
      dodge: ['Réflexes : satisfaisants.'],
      hurt: ['Réponse exacte. Point accordé.', 'Correct. Question suivante.'],
      fail: ['Erreur de méthode. Reprenez.', 'Le temps est une ressource. Gérez-la.'],
      near: ['Calcul de la note finale…'],
      after: ['Votre dossier est complet. Vous pouvez sortir.'],
    },
    zeus: {
      intro: ['Petit frère ! Tu crois vraiment pouvoir me battre ?', 'Le Nexus est à moi. Viens le prendre.'],
      'nouveau:bolt': ['Regarde le ciel, petit frère !'],
      'nouveau:storm': ['Voilà la tempête !'],
      'nouveau:lance': ['Lance de foudre !'],
      'nouveau:tp': ['Par ici ! Trop lent !'],
      special: ['La foudre ne prévient qu\'une fois !'],
      tired: ['Pff… deux secondes… Même les dieux reprennent leur souffle.'],
      dodge: ['Pas mal… pas mal du tout.', 'Tu as appris ça où ?'],
      hurt: ['Aïe ! Tu tiens ça de moi.', 'Bien joué… mais ce n\'est pas fini.'],
      fail: ['Allez, relève-toi. Je ne vais pas t\'attendre toute la nuit.', 'Encore raté ! Regarde mes mains.'],
      near: ['D\'accord… tu deviens vraiment fort.'],
      after: ['Tu sais quoi ? Je suis fier de toi.'],
    },
    rumeur: {
      intro: ['On dit que tu n\'iras pas plus loin.', 'Tout le monde le pense. Pourquoi pas toi ?'],
      'nouveau:illusion': ['Ce danger est-il réel ? Tu n\'en sais rien.'],
      'nouveau:clone': ['Nous sommes partout. Nous sommes tout le monde.'],
      'nouveau:edges': ['Ça vient de partout, n\'est-ce pas ?'],
      'nouveau:medley': ['Tu te souviens de la Forge ? Du Code ? Moi, oui.'],
      special: ['Tes anciennes peurs, rien que pour toi.'],
      dodge: ['Tu… as vu clair ?', 'Coup de chance. On dira que c\'était de la chance.'],
      hurt: ['Non… ce n\'est pas vrai…', 'Tu n\'avais pas le droit de voir ça.'],
      fail: ['Tu vois ? On avait raison.', 'Abandonne. Personne ne t\'en voudra.'],
      near: ['Si plus personne ne me croit… je n\'existe plus…'],
      final: ['Alors regarde-moi en face, si tu oses.'],
      after: ['…'],
    },
  };
  // les répliques du héros qui RÉPONDENT à la Rumeur pendant la confrontation finale
  const FINALE_HEROS = [
    'On a dit que je n\'y arriverais pas. J\'ai appris à chaque chute.',
    'La Forge, le Code, le Labo, le Nexus… Ce ne sont pas des rumeurs. C\'est mon chemin.',
    'Tu parles fort. Mais tu n\'as jamais rien construit.',
  ];

  /* ---------- enregistrement pour les voix (tools/voix/generer.py les retrouve) ---------- */
  const D = OT.Dialogue;
  if (D && D.register) {
    for (const k in LIGNES) for (const ev in LIGNES[k]) LIGNES[k][ev].forEach((t, i) => D.register(`boss15/${k}/${ev}/${i}`, VOIX[k], t));
    FINALE_HEROS.forEach((t, i) => D.register(`boss15/finale/${i}`, 'oswel', t));
  }

  /* ---------- les réactions du héros pendant les combats ---------- */
  if (D && D.defineBarks) {
    D.defineBarks('boss_new', { p: 0.9, cd: 9 }, {
      _: ['Attends… c\'est nouveau, ça !', 'Il a encore un tour dans son sac…'],
      oswel: ['Attends… c\'est nouveau, ça !', 'Il a encore un tour dans son sac…', 'OK… nouvelle attaque. On observe.'],
      meka: ['Nouveau schéma d\'attaque détecté.'], byte: ['Nouvelle attaque ! Mise à jour des réflexes…'],
      nexa: ['Celle-là, je l\'avais vue venir… presque.'], tony: ['Nouvelle règle. On l\'apprend.'], franck: ['Oh, c\'est quoi ça, cousin ?!'],
    });
    D.defineBarks('boss_dodge', { p: 0.55, cd: 14 }, {
      _: ['Ouh là ! C\'était limite !', 'Raté !', 'Pas aujourd\'hui !'],
      oswel: ['Ouh là ! Celle-là, c\'était vraiment limite !', 'Raté !', 'Pas aujourd\'hui !'],
      meka: ['Esquive calculée.'], byte: ['Esquive parfaite ! Combo !'], franck: ['Trop rapide pour toi !'],
    });
    D.defineBarks('boss_hit', { p: 0.7, cd: 6 }, {
      _: ['Touché !', 'Et un !', 'Ça, c\'est fait !'],
      oswel: ['Touché !', 'Et un !', 'Voilà ! Il fallait juste comprendre.'],
      meka: ['Impact confirmé.'], byte: ['Coup critique !'], tony: ['Propre.'], franck: ['Bam ! En rouge !'],
    });
    D.defineBarks('boss_weak', { p: 1, cd: 10 }, {
      _: ['Il est sonné… c\'est maintenant !', 'Voilà l\'ouverture !'],
      oswel: ['Je crois que j\'ai compris ton point faible.', 'Il est sonné… c\'est maintenant !', 'Voilà l\'ouverture !'],
      meka: ['Faille détectée. J\'y vais.'], tony: ['Là. C\'est la faille.'],
    });
    D.defineBarks('boss_fail', { p: 0.8, cd: 20 }, {
      _: ['Bon. Cette fois, je regarde avant de foncer.', 'Respire… il prévient toujours avant de frapper.'],
      oswel: ['Bon. Cette fois, je regarde avant de foncer.', 'Respire… il prévient toujours avant de frapper.', 'Encore… Mais je commence à comprendre.'],
      meka: ['Recalcul de la stratégie.'], tony: ['On observe, puis on corrige.'],
    });
    D.defineBarks('boss_final', { p: 1, cd: 5 }, {
      _: ['C\'est le dernier round. Je ne lâche rien.', 'Tout ce que j\'ai appris… c\'est maintenant.'],
      oswel: ['C\'est le dernier round. Je ne lâche rien.', 'Tout ce que j\'ai appris… c\'est maintenant.'],
    });
    D.defineBarks('boss_relief', { p: 1, cd: 5 }, {
      _: ['C\'est fini… enfin.', 'On l\'a fait…'],
      oswel: ['C\'est fini… enfin.', 'On l\'a fait…', 'Ouf. Je n\'y croyais plus.'],
    });
  }

  /* ---------- les explications des phases, complétées pour les nouvelles attaques ----------
     (ce que disent Patou, Tony, Annie, Francheska, Christine, Zeus… doit être EXACT) */
  function completer() {
    const W = OT.WORLD_DATA || {};
    const plus = (w, ph, aide, dires) => {
      const T = W[w] && W[w].bossText; const P = T && T.phases[ph];
      if (!P || P._v15) return;
      P._v15 = true;
      if (aide) P.help = (P.help || '') + ' ' + aide;
      if (dires) P.tell = (P.tell || []).concat(dires);
    };
    plus(1, 0, 'Une marque rouge au sol : son poing va s\'écraser là, écarte-toi ; le poing reste planté un instant (tu peux monter dessus). Ne reste pas collé à lui : il enchaîne.',
      [['patou', 'Il écrase aussi son poing : une marque rouge au sol te dit où. Écarte-toi… puis sers-toi du poing planté comme d\'une marche.'],
        ['patou', 'Et ne reste pas collé à lui trop longtemps : quand ses yeux clignotent, il enchaîne une onde tout près.']]);
    plus(1, 1, 'Quand une bande du sol rougeoie, elle va prendre feu : monte sur une marche ou écarte-toi.',
      [['patou', 'La forge s\'embrase : quand une bande du sol rougeoie, elle va brûler. Monte sur une marche ou recule.']]);
    plus(1, 2, 'Son bras balaie le bas de l\'arène (ligne rouge) : saute. S\'il rate un écrasement, il est déséquilibré : son bouclier tombe tout seul, cours frapper le cœur.',
      [['patou', 'Son bras va balayer le bas de l\'arène : une ligne rouge prévient, saute au bon moment.'],
        ['patou', 'Et s\'il rate un écrasement, il perd l\'équilibre : son bouclier tombe tout seul quelques secondes. C\'est ton ouverture.']]);
    plus(2, 0, 'Après ton premier coup, il se copie : les CLONES clignotent et n\'ont pas d\'ombre, le vrai Bug a une ombre au sol. Une bande rouge annonce une rafale de données : saute ou change d\'étage.',
      [['tony', 'Il va se copier. Les clones clignotent et n\'ont pas d\'ombre au sol : le vrai, si.'],
        ['tony', 'Et quand une bande rouge s\'allume en travers de l\'écran, une rafale de données va la traverser : saute, ou change d\'étage.']]);
    plus(2, 1, 'Une colonne rouge translucide = corruption dans une seconde : sors-en.',
      [['tony', 'Quand une colonne devient rouge et translucide, sors-en : une seconde plus tard, elle est corrompue.']]);
    plus(2, 2, 'SURCHARGE : il découpe l\'arène, seules les zones vertes sont sûres. Son écho transparent fonce aussi, sans ombre : il est inoffensif.',
      [['tony', 'En surcharge, il découpe l\'arène : va dans une zone verte. Et ignore son écho transparent : seul le vrai, avec son ombre, est dangereux… et peut être sonné.']]);
    plus(3, 0, 'Entre les cases, le sol s\'électrise à tour de rôle (il clignote juste avant) : passe après, ou saute par les petites plateformes.',
      [['annie', 'Entre les cases, le sol s\'électrise à tour de rôle. Il clignote juste avant : passe après, ou saute par les petites plateformes.']]);
    plus(3, 1, 'Un bras mécanique frappe une MAUVAISE case (marque rouge au sol) : écarte-toi… et retiens que ce n\'était pas celle-là. Le DISJONCTEUR tout à gauche coupe ses défenses 5 secondes.',
      [['reine', 'Un bras frappe là où la marque rouge s\'allume. Et l\'interrupteur tout à gauche coupe ses défenses quelques secondes : c\'est permis !']]);
    plus(3, 2, 'La Machine analyse tes réponses : ses rayons arrivent du côté où tu as répondu la dernière fois. Le sol électrique et le bras reviennent.',
      [['ange', 'Elle analyse ta stratégie : ses rayons viendront du côté où tu as répondu juste avant. Change de côté, ou saute.']]);
    plus(4, 0, 'Ses éclairs tombent là où un cercle crépite au sol. Après sa série de trois éclairs, il est FATIGUÉ quelques secondes : saute-lui sur la tête.',
      [['francheska', 'Il lance des éclairs : un cercle crépitant au sol te dit où. Après sa série de trois, il est fatigué : saute-lui sur la tête à ce moment-là.']]);
    plus(4, 1, 'La tempête frappe les plateformes l\'une après l\'autre : quand la tienne crépite, change de plateforme.',
      [['francheska', 'La tempête frappe les plateformes l\'une après l\'autre : quand la tienne crépite, change de plateforme.']]);
    plus(4, 2, 'Sa main brille : une lance de foudre file au ras du sol, saute. Quand il retombe d\'un saut, une onde part des deux côtés : saute. Un petit éclair au sol annonce où il se téléporte.',
      [['francheska', 'Sa main brille ? Une lance de foudre arrive au ras du sol : saute. Quand il retombe, une onde part des deux côtés.'],
        ['francheska', 'Et s\'il se téléporte, un petit éclair au sol prévient d\'où il va surgir.']]);
    plus(5, 0, 'Certains « ? » sont des illusions : transparents et clignotants, ils ne font rien. Les vrais sont pleins.',
      [['tony', 'Certains « ? » sont des illusions : transparents, ils clignotent et ne font rien. Les vrais sont pleins.']]);
    plus(5, 1, 'Deux copies d\'elle imitent ses gestes : seule la vraie a une ombre au sol. Des « ? » arrivent aussi des bords : une flèche prévient.',
      [['christine', 'Elle se copie : seule la vraie a une ombre au sol. Et des « ? » arrivent des bords de l\'écran : une flèche prévient.']]);
    plus(5, 2, 'Elle ressort les pièges des mondes : onde au sol (saute), colonne rouge (sors-en), sol qui clignote (écarte-toi), cercle d\'éclair (écarte-toi).',
      [['zeus', 'Elle va te ressortir tes vieux pièges : l\'onde de la Forge, la colonne du Bug, le sol électrique du Labo, et mes éclairs. Chacun prévient. Tu les connais.']]);
    // LA CONFRONTATION : une 4e phase, la toute dernière du jeu
    const T5 = W[5] && W[5].bossText;
    if (T5 && T5.phases.length === 3) {
      T5.phases.push({
        name: 'La confrontation', say: 'REGARDE-MOI. QUI CROIRA ENCORE EN TOI ?',
        help: 'Elle enchaîne les pièges des quatre mondes (chacun prévient). Après chaque salve, elle s\'épuise et descend : « TOUCHE-LA ! ». Saute pour la toucher. 2 fois.',
        tell: [['christine', 'Elle a tout essayé. Maintenant, elle utilise tes anciennes peurs : la Forge, le Code, le Labo, le Nexus.'],
          ['christine', 'Chaque attaque prévient. Après sa salve, elle s\'épuise et descend tout près du sol : touche-la. Deux fois. Tu peux le faire.']],
      });
    }
  }
  completer();

  /* ---------- l'affichage : bandes noires et grand titre ---------- */
  let el = null, bars = null, carte = null, tCarte = 0, tBars = 0;
  function dom() {
    if (el) return;
    const st = document.createElement('style');
    st.textContent = `
      #cb-bars { position: fixed; inset: 0; pointer-events: none; z-index: 14; }
      #cb-bars i { position: absolute; left: 0; right: 0; height: 0; background: #000; transition: height .28s ease; }
      #cb-bars i:first-child { top: 0; } #cb-bars i:last-child { bottom: 0; }
      #cb-bars.on i { height: 8vh; }
      #cb-card { position: fixed; left: 50%; top: 15vh; transform: translateX(-50%) scale(.9); z-index: 16; pointer-events: none; text-align: center;
        opacity: 0; transition: opacity .25s, transform .25s; text-shadow: 0 4px 18px rgba(0,0,0,.8); }
      #cb-card.on { opacity: 1; transform: translateX(-50%) scale(1); }
      #cb-card b { display: block; font-family: var(--font-display, 'Bungee', Impact, sans-serif); font-weight: 400; font-size: clamp(1.6rem, 5vw, 3.2rem); letter-spacing: .04em; color: var(--cbc, #ff9a2a); }
      #cb-card small { display: block; margin-top: 4px; font-size: clamp(.8rem, 2vw, 1.05rem); letter-spacing: .25em; color: #ede4d6; text-transform: uppercase; }
      @media (prefers-reduced-motion: reduce) { #cb-bars i, #cb-card { transition: none; } }`;
    document.head.appendChild(st);
    bars = document.createElement('div'); bars.id = 'cb-bars'; bars.innerHTML = '<i></i><i></i>';
    carte = document.createElement('div'); carte.id = 'cb-card'; carte.innerHTML = '<b></b><small></small>';
    document.body.append(bars, carte);
    el = true;
  }
  const doux = () => !!(OT.settings && OT.settings.reduceMotion);
  function montrerCarte(titre, sous, couleur, duree) {
    dom();
    carte.querySelector('b').textContent = titre || '';
    carte.querySelector('small').textContent = sous || '';
    carte.style.setProperty('--cbc', couleur || '#ff9a2a');
    carte.classList.add('on');
    clearTimeout(tCarte); tCarte = setTimeout(() => carte.classList.remove('on'), (duree || 1.6) * 1000);
  }
  function bandes(sec) {
    dom();
    bars.classList.add('on');
    clearTimeout(tBars); tBars = setTimeout(() => bars.classList.remove('on'), sec * 1000);
  }
  const bossKind = () => { const R = OT.Game && OT.Game.api && OT.Game.api.R; return (R && R.boss && R.boss.kind) || 'gardien'; };

  /* ---------- les petites cinématiques (jamais bloquantes) ---------- */
  function cine(type, o = {}) {
    if (OT.Game && OT.Game._testing) return;
    const k = o.kind || bossKind(), c = o.color || COUL[k];
    const api = OT.Game && OT.Game.api;
    const ralenti = (s, d) => { if (!doux() && api && api.slowmo) api.slowmo(s, d); };
    const couper = (ms) => { if (OT.Music && OT.Music.duck) { OT.Music.duck(true); setTimeout(() => OT.Music.duck(false), ms); } };
    if (type === 'intro') { bandes(1.8); montrerCarte(o.title || NOMS[k], o.sub || 'Combat', c, 2.0); couper(900); if (OT.Cam && !doux()) OT.Cam.punch(0.1); OT.Input.rumble(-1, 0.6, 0.6, 400); }
    else if (type === 'phase' || type === 'final') {
      bandes(type === 'final' ? 1.6 : 1.1); montrerCarte(o.title, o.sub, c, type === 'final' ? 1.9 : 1.4);
      ralenti(0.35, type === 'final' ? 0.45 : 0.3); couper(600);
      if (OT.Cam && !doux()) OT.Cam.punch(0.12); OT.Input.rumble(-1, 0.9, 0.7, 450);
    } else if (type === 'special') { montrerCarte(o.title || 'ATTAQUE SPÉCIALE', o.sub || '', c, 1.1); if (OT.Cam && !doux()) OT.Cam.punch(0.08); }
    else if (type === 'critique') { ralenti(0.3, 0.3); if (OT.Cam && !doux()) OT.Cam.punch(0.14); OT.Input.rumble(-1, 1, 1, 350); couper(400); }
    else if (type === 'victoire') { bandes(2.4); montrerCarte('VICTOIRE', o.sub || NOMS[k], '#3cff9a', 2.4); ralenti(0.3, 0.6); couper(1200); OT.Input.rumble(-1, 1, 0.8, 700); }
  }

  /* ---------- les moments du combat : qui parle, quand ---------- */
  const deja = {};          // nouvelle attaque déjà présentée (par combat)
  let dernierBoss = 0, dernierHeros = 0, combatId = 0;
  const recents = {};
  function piocher(k, ev) {
    const L = LIGNES[k] && LIGNES[k][ev];
    if (!L || !L.length) return null;
    const cle = k + ev; let i = Math.floor(Math.random() * L.length);
    if (L.length > 1 && i === recents[cle]) i = (i + 1) % L.length;   // jamais deux fois de suite la même
    recents[cle] = i;
    return L[i];
  }
  function bossDit(k, ev, force) {
    const now = performance.now() / 1000;
    if (!force && now - dernierBoss < 4.5) return false;
    const t = piocher(k, ev);
    if (!t || !D) return false;
    dernierBoss = now;
    D.say(VOIX[k], t, { priority: force ? 3 : 2, name: NOMS[k], color: COUL[k] });
    return true;
  }
  function herosDit(kind, force) {
    const api = OT.Game && OT.Game.api;
    if (!api || !api.heroBark) return;
    const now = performance.now() / 1000;
    if (!force && now - dernierHeros < 3) return;
    if (api.heroBark(kind, null, force ? { force: true } : undefined)) dernierHeros = now;
  }
  function event(nom, o = {}) {
    if (!D || (OT.Game && OT.Game._testing && !o.test)) return;
    const k = o.kind || bossKind();
    if (nom === 'debut') { combatId++; for (const c in deja) delete deja[c]; return; }
    if (nom.startsWith('nouveau:')) {
      // la PREMIÈRE fois qu'une attaque apparaît dans ce combat : le boss la nomme, le héros s'étonne
      if (deja[nom]) return; deja[nom] = true;
      if (!bossDit(k, nom)) bossDit(k, 'special');
      setTimeout(() => herosDit('boss_new'), 1400);
      return;
    }
    if (nom === 'intro') { bossDit(k, 'intro', true); return; }
    if (nom === 'dodge') { if (Math.random() < 0.5) bossDit(k, 'dodge'); else herosDit('boss_dodge'); return; }
    if (nom === 'hurt') { bossDit(k, 'hurt'); setTimeout(() => herosDit('boss_hit'), 900); return; }
    if (nom === 'weak') { bossDit(k, k === 'zeus' ? 'tired' : 'weak'); setTimeout(() => herosDit('boss_weak'), 700); return; }
    if (nom === 'fail') {
      if (OT.UI && OT.UI.bossHelpFull) OT.UI.bossHelpFull();   // après plusieurs échecs : l'aide complète revient
      if (!bossDit(k, 'fail')) return; setTimeout(() => herosDit('boss_fail', true), 2200); return;
    }
    if (nom === 'near') { bossDit(k, 'near', true); return; }
    if (nom === 'final') { bossDit(k, 'final'); setTimeout(() => herosDit('boss_final', true), 1600); return; }
    if (nom === 'breaker') { bossDit(k, 'breaker', true); return; }
    if (nom === 'special') { bossDit(k, 'special'); return; }
    if (nom === 'after') { bossDit(k, 'after', true); return; }
    if (nom === 'relief') { herosDit('boss_relief', true); return; }
  }
  // la confrontation finale : le héros répond, une réplique à la fois
  function finale(i) {
    const t = FINALE_HEROS[i % FINALE_HEROS.length];
    const api = OT.Game && OT.Game.api, p = api && api.players && api.players[0];
    if (D && t) D.say(p && p.char && p.char !== 'oswel' ? p.char : 'oswel', t, { priority: 3, name: p ? p.name : 'Oswel' });
  }

  return {
    cine, event, finale, LIGNES, NOMS, COUL,
    // outil debug : passer directement à une phase du boss du niveau en cours
    testBoss(phase) { const api = OT.Game && OT.Game.api; if (api && api.bossPhase) api.bossPhase(phase | 0); },
  };
})();
