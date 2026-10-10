# OSWEL'S TRAP — contexte du projet pour Claude (version 1.5)

Ce fichier est lu automatiquement par Claude au début de chaque session dans ce dossier.
Il explique le projet, ses règles et la façon de le tester. Lis-le en entier avant de modifier quoi que ce soit.

## Qui, quoi
- Auteur : **Oswel** (OSWEL OFFICIEL), étudiant en informatique à l'Université de Douala (Cameroun), parcours
  mécanique → mécatronique → informatique. Il travaille sous **CachyOS (Linux)**, joue avec une **manette PS4**.
- **Toujours répondre en français.** Code **commenté en français**, de façon détaillée et pédagogique
  (Oswel apprend en lisant le code). Il préfère des **livrables complets et fonctionnels** (fichiers entiers,
  projet zippé), pas des morceaux à recoller.
- Le jeu : **Oswel's Trap**, plateforme « troll » en 2.5D (esprit *Level Devil*), de 1 à 4 joueurs, qui raconte
  le parcours réel d'Oswel. Beaucoup de personnages sont de **vraies personnes** de son entourage (famille,
  amis, profs) : les traiter avec respect.

## Ce que contient le jeu (à NE JAMAIS supprimer)
- **Histoire** : 5 mondes × 10 grands niveaux (le 10e = boss en 3 actes : antichambre, arène, fuite).
  1 La Forge (mécanique) · 2 Le Code (programmation, Tony = le guide) · 3 Le Laboratoire (ingénierie) ·
  4 Nexus (Internet, IA, NEXA) · 5 OSWEL City (métier, clients, la Rumeur). Fin ouverte « À SUIVRE… ».
- Modes **Solo / Coop / Versus**, boutique, profils et sauvegardes (localStorage `oswels-trap-v2`), médailles,
  records, checkpoints, cinématiques, leçons, carnet, chapitres lus à voix haute.
- **Soirée OSWEL** : 9 mini-jeux vus de dessus + la variante Le Traître, 1 à 4 joueurs, bots aux mêmes règles.
- **Voix** : 4 536 répliques françaises en 1.5 (1 115 en 1.4), voix de synthèse hors ligne, sous-titres, réglages du son.
- Commandes : clavier (2 joueurs sur un clavier), manettes (jusqu'à 4, vibrations, lumière PS4), tactile
  (boutons discrets par défaut, ACTION seulement quand il sert).
- **Version 1.5** : version PC (Electron, `bureau/`), application Android (Capacitor, `mobile/`), **réseau local**
  (un PC héberge, les téléphones / PC deviennent des manettes via `manette.html`, vidéo du jeu en WebRTC).
  Tout marche **hors ligne** (ne jamais ajouter de dépendance à internet).
- 9 personnages jouables : OSWEL, MEKA, BYTE, NEXA, GOD LOVE, TONY, FREDO, VALDES, FRANCK
  (Franck : rouge, tresses sur toute la tête, jamais de casquette).
- **Tony** (fiche 1.5) : mentor (coder, puis planifier), calme, pédagogue, humour sec, énigmatique ;
  « Ça plante ? On recommence. » ; tenue blanc cassé, capuche blanche à l'intérieur sombre, visage caché,
  deux yeux de lumière sans pupille (blanc doré / cyan pâle), accents violet-noir-bleu nuit, longue écharpe
  blanche. 5 pouvoirs (Ctrl+Z, Boucle while, Debug, Copier-coller, Compiler), un par monde, un seul actif,
  recharge 8-12 s, un seul plan. Voix : grave, posée, effet « hood » (voix.json).
- Règle d'écriture : la relation entre Oswel et **Francheska** n'est jamais dite directement, seulement suggérée.

## Technique
- **Aucune compilation, aucun npm** : HTML + CSS + JavaScript, **Three.js r128** (`js/three.min.js`), tout
  s'exécute dans le navigateur. Tout le code partage l'objet global `window.OT`.
- Lancer : double-clic sur `index.html`, ou mieux `python3 -m http.server 8000` dans ce dossier puis
  http://localhost:8000 (nécessaire pour les outils de test).
- Ordre de chargement : les balises `<script>` de `index.html` (l'ordre compte).

### Les fichiers
```
index.html             toute l'interface (écrans, HUD, dialogues) + l'ordre des scripts
css/style.css          l'apparence
js/data.js             Monde 1, boutique, outil de construction des niveaux (OT.mkLevel : L.rect, L.coin, L.npc…)
js/world2.js…world5.js les mondes 2 à 5 (personnages, niveaux, leçons, quiz, chapitres, cinématiques)
js/sections.js         les sections des grands niveaux (pièges, puzzles, coins calmes…)
js/levelplans.js       le plan de chaque grand niveau (zone 1 = niveau d'origine), boss, temps de référence
js/histoire.js         l'histoire 1.4 : scènes avant/après, rencontres, phrases de zone, secrets, fin, générique
js/dialogue.js         OT.Dialogue : file, priorités, voix, sous-titres, réactions (barks), mémoire de l'histoire
js/repliques.js        les petites réactions des personnages et les répliques de l'annonceur des mini-jeux
js/voices.js           GÉNÉRÉ : la liste des fichiers de voix (ne pas éditer à la main)
js/portrait.js         le portrait 3D animé dans la boîte de dialogue
js/game.js             le moteur de l'histoire (physique, pièges, boss, caméra, 1-2 joueurs)
js/ui.js               menus, profils, boutique, médailles, réglages, sauvegarde (OT.VERSION ici)
js/chars.js            personnages jouables et PNJ (modèles, visages, animations)
js/models.js, camera.js, input.js, music.js, light.js, net.js, splash.js
js/arena/core.js       moteur des mini-jeux (grille, joueurs, bots, caméra, entraînement, flèches, voix)
js/arena/ui.js         la Soirée OSWEL (rejoindre, fiche « MINI-JEU 0X », HUD, résultats, champion)
js/arena/games/*.js    un fichier par mini-jeu (panne.js contient aussi Le Traître)
js/extensions.js       (1.5) OT.GameExt : prises du moteur (types, tuiles, hooks) — hooks : build, update, kill,
                       beforeKill, finish, coinTaken, airJump, cpReached, reset, solids, mechanism (levier),
                       secretFound (salle cachée), npcAct (action d'un PNJ). PX = OT.Game.api (R, players, kill…)
js/combat.js           (1.5) boss : textes des phases (bossText), répliques, cinématiques courtes, finale
js/pieges3.js          (1.5) nouveaux pièges + OT.PIEGES3_PLACEMENT (dans quels niveaux) ; solides avec `ref`
js/reactions.js        (1.5) réactions des héros : death_<cause>, t_<piège>, h_<événement>
js/pouvoirs.js         (1.5) OT.TonyPowers : les 5 pouvoirs de Tony (un par monde, touche « gadget »), leçons ;
                       le moteur fige un piège avec e.frzT / e.fz (game.js : FZ, TT), le clone appuie via bt.ghostT
js/quetes.js           (1.5) OT.Quests : 15 quêtes, rôles, indices (HINTS[k] = [discret, détaillé, solution]),
                       mentors, niveaux secrets (W.levels[10], def.secret) ; état dans le profil : P.q15
js/journal.js          (1.5) Journal (Carnet + écran Pause → Journal)
js/progression.js      (1.5) OT.Stars (★ terminé, ★ toutes les pièces, ★ or) + écran PROGRESSION
js/lan.js              (1.5) réseau local côté jeu : manettes réseau = fausses manettes PS4 dans OT.Input.pads()
manette.html, js/manette.js, css/manette.css   (1.5) la manette à distance (téléphone / autre PC)
js/qrcode.js           (1.5) générateur de QR code (MIT)
bureau/                (1.5) version PC Electron : main.js, preload.js, serveur-lan.js (port 47800), preparer.js
mobile/                (1.5) application Android Capacitor (android/ = projet Android Studio)
.github/workflows/     (1.5) fabrication automatique Windows / Linux / Android
audio/fr/characters/<personnage>/<code>.mp3   les voix
sw.js, manifest.json   version installable / hors ligne
(site web)             le site public oswels-trap.netlify.app (page de téléchargement + le jeu jouable dans le
                       navigateur, dossier jouer/ = copie du jeu faite avec bureau/preparer.js) est dans un AUTRE
                       dépôt : oswel-offiiel/oswels-trap-site (relié à Netlify). Ne pas le mettre dans ce dépôt.
serveur/               serveur Django facultatif (classement en ligne)
tools/validation/      robots de test : valider.py (niveaux), minijeux.py (mini-jeux)
tools/voix/            fabrication des voix (generer.py, voix.json, LISEZMOI.md)
```

### Règles à respecter à chaque modification
1. **Ne rien supprimer** de ce qui fonctionne. Améliorer l'existant, ne pas repartir de zéro.
2. Nouveau fichier JS : l'ajouter dans `index.html` **et** dans la liste `FILES` de `sw.js`.
3. Nouvelle version : changer `OT.VERSION` dans `js/ui.js` et `VERSION` dans `sw.js`, ajouter une section
   « Nouveautés » en haut de `LISEZMOI.md`.
4. Si le **dessin d'un niveau** change (longueur, sections), augmenter `OT.LAYOUT_V` dans `js/levelplans.js`
   (les anciens records sont alors marqués « ancienne version du niveau » ; actuellement 15).
   Toute pièce ajoutée doit être **accessible** : relancer `tools/validation/pieces.py` (Oswel y tient).
5. Une réplique a pour identifiant `personnage/hash-du-texte`. **Modifier un texte de dialogue = sa voix ne
   correspond plus** : le jeu affiche alors le sous-titre seul. Pour refaire les voix :
   `python3 tools/voix/generer.py --prune` puis `python3 tools/voix/generer.py` (voir `tools/voix/LISEZMOI.md`).
   (1.5) Chaque personnage garde SA voix (`tools/voix/voix.json` : base, f0, range, tempo, fx, `calme`) ; la façon
   de dire suit l'émotion de la réplique (`expressif()` : cri plus vif, hésitation plus lente). Fabrication par lots
   (une coupure ne perd que le lot en cours) ; `durees.json` / `expressif.json` = caches de l'outil.
   Toute nouvelle réplique doit avoir sa voix avant une livraison (compter les répliques sans voix).
6. Mini-jeux : tout ce qui est 3D derrière `if (A.headless)` (les tests tournent sans affichage) ; les bots
   n'ont droit qu'au joystick et aux boutons A et B ; chaque jeu garde `goal`, `howto`, `danger`, `win`, `lose`,
   `tuto`, `goals(A)` (fiche claire, entraînement, flèches d'objectif).
7. Réutiliser géométries et matériaux (performance), ne rien créer à chaque image.
8. Garder clavier + manette PS4 + tactile, solo + coop + versus, et la compatibilité des sauvegardes.
9. Le jeu ne doit jamais planter : une erreur dans une partie ne doit pas bloquer le reste (try/catch, valeurs
   par défaut, fichier manquant → sous-titre).

### Tester (obligatoire avant de dire « c'est fini »)
```bash
pip install playwright && python3 -m playwright install chromium   # une fois
python3 tools/validation/minijeux.py            # les 10 mini-jeux, joués par des bots (≈ 2 min)
python3 tools/validation/valider.py 2-          # les niveaux d'un monde, solo et coop (tout : ≈ 1 h 30)
python3 tools/validation/valider.py 1-S         # un niveau secret (1-S … 5-S)
python3 tools/validation/pieces.py              # TOUTES les pièces sont accessibles ? (≈ 40 min ; 3-4 1-S pour cibler)
node -e "new Function(require('fs').readFileSync('js/game.js','utf8'))"   # vérifier la syntaxe d'un fichier
```
Puis ouvrir le jeu dans le navigateur, console ouverte (F12) : aucune erreur rouge.
Limite connue : le robot échoue parfois au boss du Monde 2 en coop (déjà le cas en 1.3, ce n'est pas un bug du jeu).

### Version PC et Android (1.5)
```bash
cd bureau && npm install && npm start          # lancer la version PC
npm run linux / npm run windows                # fabriquer les installeurs (dist/)
node bureau/serveur-lan.js                     # réseau local sans Electron → http://localhost:47800/index.html?hote=1
cd mobile && npm install && npm run apk        # APK (il faut le SDK Android) — ou GitHub Actions
```
Après une modification du jeu, `preparer.js` recopie le jeu dans `bureau/jeu` / `mobile/www` (fait par les scripts npm).

## La suite prévue
- **Fait en 1.5 (finalisation)** : boss refaits (phases, signaux, contre-attaques), nouveaux pièges, réactions,
  quêtes / indices / journal / niveaux secrets, étoiles ★★★, écran Progression, vérification des pièces.
- **Encore possible** : gadgets utiles en jeu (aujourd'hui seule la Boussole agit), coop 3.0, écran partagé du Versus.
- **Phase 3** : jeu en ligne (le serveur Django de `serveur/` existe déjà pour le classement).
- Remplacer les voix de synthèse par de vrais enregistrements (même nom de fichier, puis `generer.py --manifest`).
