# OSWEL'S TRAP — Version 1.5

Jeu de plateforme piégé en 2.5D (dans l'esprit de *Level Devil*), de **1 à 4 joueurs**. Il a deux parties :

- **Histoire** (1 ou 2 joueurs) : le parcours d'Oswel en **5 mondes et 50 grands niveaux**. Chaque niveau terminé
  apprend une vraie notion, chaque monde se termine par un boss, un quiz et un chapitre de l'histoire.
- **Multijoueur — la Soirée OSWEL** (1 à 4 joueurs, les places libres sont des bots) :
  **9 mini-jeux d'arcade vus de dessus + la variante Le Traître**, à enchaîner entre amis, avec des points et
  un champion de la soirée.

C'est la **version 1.5 : PC, mobile et réseau local**. Le jeu s'installe sur **Windows** et **Linux**, existe en
**application Android**, et se joue **à plusieurs en réseau local** (même Wi-Fi) : les téléphones et les autres PC
deviennent des manettes. **Tout marche hors ligne** (aucune connexion internet nécessaire).

## Nouveautés de la version 1.5 — finalisation (boss, pièges, quêtes, étoiles)

Tout le reste de la version 1.5 (PC, Android, réseau local, ci-dessous) et de la 1.4 est conservé.

### Les 5 boss refaits (phases, signaux, contre-attaques)
Chaque boss a maintenant des **phases nettes** (nom et explication dans Pause → Journal), des **attaques annoncées**
(une zone colorée clignote AVANT de frapper : bleu = électrique, jaune = impact, rouge = danger), une **fenêtre
pour riposter** (le boss se fatigue, s'arrête ou baisse sa garde) et des **répliques** à chaque moment important.
- **Le Gardien de la Forge** (Monde 1) : poings qui s'écrasent (un poing planté au sol arrête les lances), étincelles,
  bouclier ; après le premier coup au cœur, **vague de feu** en bandes (on passe entre les bandes).
- **Le Bug** (Monde 2) : il **se dédouble** (clones), se téléporte en laissant une trace, tire des lances de code
  depuis le bord ; puis **colonnes de corruption** ; enfin il se **fragmente** : seules 3 zones sûres (vertes) restent.
- **L'Examen** (Monde 3) : il faut se poser (sans courir) sur la bonne case ; un bras mécanique frappe une MAUVAISE
  case (on retient que ce n'était pas celle-là) ; le **disjoncteur** tout à gauche coupe ses défenses 5 secondes.
- **Zeus / l'orage** (Monde 4) : éclairs sur les plateformes (la zone s'allume d'abord), chaîne d'orage, charge,
  téléportation ; quand il est **fatigué** il ne fait plus mal : c'est le moment de le toucher.
- **La Rumeur** (Monde 5) : orbes vraies et fausses, clones, ombre, lances des bords, et une **4e phase** :
  la confrontation finale (salves puis fatigue).
Ils ont été joués par les robots de test en **solo et en coop** (voir « Tests » plus bas).

### TONY : nouvelle fiche et 5 pouvoirs
- **Le mentor d'Oswel** (il lui apprend à coder, puis à planifier) : calme et posé, pédagogue, humour sec,
  énigmatique — il en dit moins qu'il n'en sait. Sa phrase : **« Ça plante ? On recommence. »**
- **Nouvelle apparence** : tenue blanc cassé presque immaculée, capuche blanche à l'intérieur sombre qui cache
  le visage, deux yeux de lumière sans pupille (blanc doré, **cyan pâle** quand il utilise un pouvoir), accents
  violets, noirs et bleu nuit, une **longue écharpe blanche qui flotte** quand il court et saute, des particules
  de lumière blanche à chaque pouvoir. Sa voix est grave, posée, un peu feutrée « sous la capuche ».
- **Ses pouvoirs** (quand on joue TONY, en Solo et en Coop) — **un pouvoir débloqué par monde, avec sa leçon**
  (elle s'affiche la première fois et reste dans le Carnet → « Les pouvoirs de Tony ») :

  | Monde | Pouvoir | Effet | Recharge |
  |---|---|---|---|
  | 1 | **Ctrl+Z** | retour à sa position d'il y a 1 seconde (flash sombre, traînée violette) | 10 s |
  | 2 | **Boucle while** | un saut de plus en l'air (2 à partir du Monde 4) | 8 s |
  | 3 | **Debug** | révèle 5 s les pièges invisibles et les faux blocs (faux sol, faux mur, caisse piégée, déclencheurs…) | 10 s |
  | 4 | **Copier-coller** | un clone fantôme va appuyer sur un bouton, un levier ou un interrupteur à sa place | 12 s |
  | 5 | **Compiler** | fige un piège ou un bloc 2 s : il ne bouge plus et ne blesse plus (pas les boss) | 12 s |

- **Commandes** : la touche « pouvoir » (**F** · **Ctrl droit** · **○** sur la manette · bouton tactile **POUVOIR**) :
  **appui court = utiliser**, **maintenir = changer de pouvoir**. Le HUD affiche le pouvoir choisi et sa recharge.
- **Équilibrage** : un seul pouvoir actif à la fois, une recharge commune (changer de pouvoir ne la contourne
  pas), tout se joue sur un seul plan. En Versus, personne n'a de pouvoir (mêmes règles pour tous).

### De nouveaux pièges (27 niveaux), toujours lisibles
Trou qui se déplace quand on saute, pics qui surgissent, plateformes fantômes qui disparaissent, mur qui pousse,
plafond qui descend, porte qui s'ouvre d'un coup, tuyaux à la *Flappy* (on bat des ailes en l'air), scie qui poursuit,
**pièce piégée** (une bombe tombe quand on la prend), pièce qui recule, plateformes à motif, salle qui « boucle »,
portes timides. Chaque piège **se voit avant de tuer** (un tremblement, un bruit, une marque) et a une règle simple
qu'on retient après une mort.

### Les héros réagissent
Une courte phrase du héros selon **ce qui l'a tué** (pics, scie, électricité, laser, écrasement, feu, explosion, acide,
poursuite), au premier passage d'un portail, d'un ressort, d'un levier, d'une gravité inversée, d'une dalle qui
s'effondre, après un **passage de justesse**, ou après avoir enfin réussi un passage raté 3 fois.

### Personnages, quêtes, indices et niveaux secrets
- **15 quêtes** (3 par monde) données par les personnages : ramasser des objets cachés dans les salles secrètes,
  trouver des salles cachées, finir un niveau sans mourir, battre un rival, parler à quelqu'un, vaincre un boss…
  On parle avec **ACTION** ; un petit menu propose d'**accepter**, de **refuser** ou de demander un **indice**.
- **Récompenses** (données **une seule fois**, même si on rejoue) : pièces, un objet pour la boutique, la
  **Boussole d'Isaïe** (une flèche bleue montre la salle cachée ou l'objet de quête le plus proche), un **titre**,
  un souvenir dans le journal, et surtout les **5 niveaux secrets** (un par monde : *La réserve d'oncle Patou*,
  *Le serveur caché*, *Le labo souterrain*, *Le cloud privé*, *Le toit de la ville*).
- **Indices à 3 niveaux** : discret, détaillé ou la solution, sur le piège qui arrive. Après 3, 5 puis 8 chutes au
  même endroit, le mentor du monde souffle lui-même un conseil (sous-titre).
- Les personnages **se souviennent** : ils disent autre chose la deuxième fois, parlent du boss vaincu, remercient.
- **Journal** : Pause → *Journal* (objectif, phase du boss en cours et comment la passer, quêtes, indices de ce
  niveau) et dans le **Carnet** (quêtes en cours et terminées, personnages rencontrés, salles cachées, niveaux
  secrets, titres, souvenirs, ce qu'il faut savoir des boss vaincus).

### Les voix (version 1.5)
- **Toutes les répliques du jeu ont leur voix française : 4 536** (il y en avait 1 115 en 1.4). Les nouvelles :
  quêtes, rappels, retrouvailles, réactions des héros, nouveaux dialogues des boss, pouvoirs et leçons de Tony, et
  **chaque indice dit par chaque personnage qui peut le donner, avec SA voix**.
- **Chaque personnage garde son identité vocale** (Oswel jeune et déterminé, Tony calme et posé, Francheska douce
  et chaleureuse, NEXA mystérieuse, le Bug « glitché » mais compréhensible, Zeus puissant, la Rumeur à plusieurs
  voix avec de l'écho…). Tony a une nouvelle voix qui va avec sa nouvelle fiche : grave, posée, un peu feutrée,
  comme sous sa capuche.
- **Des voix plus humaines** : la façon de dire suit l'émotion de chaque réplique. Un cri ou une surprise est dit
  plus vite, avec plus d'intonation (« Attends… IL Y A UN PIÈGE ! ») ; une hésitation ou une réflexion plus
  lentement, avec des pauses (« OK… réfléchissons. »). Les personnages calmes (Tony, NEXA, la Machine) restent
  posés même quand ils s'exclament. Les anciennes répliques concernées ont été refaites avec cette règle.
- Comme avant : sous-titres toujours affichés, voix et sous-titres réglables (Paramètres → Son), priorités
  (une cinématique ou un boss ne sont jamais coupés par une petite réaction), jamais deux fois la même variante
  d'affilée, et si un fichier manque, le jeu montre le sous-titre sans planter. Tout est hors ligne.

### Étoiles ★★★ et écran PROGRESSION
- **★** niveau terminé · **★★** toutes ses pièces ramassées (en une ou plusieurs parties) · **★★★** temps de
  référence battu (médaille d'or, mode normal). Elles s'affichent sur la liste des niveaux et à la fin du niveau.
- Menu principal → **PROGRESSION** : par monde, niveaux, étoiles, pièces, salles cachées, quêtes, boss, niveau secret,
  et **ce qu'il reste à faire**.
- Les étoiles sont calculées à partir de la sauvegarde existante : les anciens profils les ont tout de suite,
  rien ne peut être perdu ni compté deux fois.

### Toutes les pièces sont accessibles (vérifié)
Un vérificateur (`tools/validation/pieces.py`) essaie, pour **chaque pièce de chaque niveau** (niveaux secrets et
objets de quête compris), tous les mouvements d'un joueur avec la vraie physique du jeu et ses dangers. Une pièce
compte comme accessible seulement si on peut la prendre **et finir debout, vivant**. Les pièces qui ne l'étaient pas
ont été déplacées dans le jeu.

### Ce qui a été vérifié avant de livrer
- **Les 55 niveaux** (50 + 5 niveaux secrets) joués par les robots de test (`tools/validation/valider.py`), en
  **solo et en coop** : 110 parties, toutes réussies. Deux parties coop (2-10 et 4-4) ont échoué au premier
  passage puis réussi au second : c'est le robot coop qui hésite parfois, aucun bug du jeu n'a été trouvé.
- **Les pièces** (`tools/validation/pieces.py`) : **895 / 895 accessibles**, objets de quête compris.
- **Les mini-jeux** (`tools/validation/minijeux.py`) : 60 parties jouées par les bots, aucun échec.
- **Les voix** : 4 536 répliques sur 4 536 ont leur fichier. Une « oreille » artificielle a écouté un échantillon
  de 95 nouvelles répliques : 60 % des mots retrouvés, contre 55,6 % pour les voix de la 1.4. Les voix sont donc
  aussi compréhensibles qu'avant (rapport : `tools/voix/rapport_1.5_echantillon.txt`).
- **Les pouvoirs de Tony**, testés dans le jeu : Ctrl+Z, Boucle while, Debug, Copier-coller (bouton, levier, vrai
  et faux interrupteur) et Compiler (sur une scie). En Versus, il n'a pas de pouvoir. Le score est bien gardé
  après « Rejouer ».
- Le jeu s'ouvre sans aucune erreur dans la console, et aucun fichier ne manque (ni image, ni son, ni voix).

## Nouveautés de la version 1.5 (PC, mobile, réseau local)

Tout le contenu de la version 1.4 est conservé (histoire, voix, mini-jeux, sauvegardes…).

### La version PC (Windows et Linux) — dossier `bureau/`
- **Windows** : `Oswels-Trap-1.5.0-windows-installation.exe` (installeur : raccourci sur le bureau et dans le menu
  Démarrer) ou `Oswels-Trap-1.5.0-windows-x64.zip` (version portable : on dézippe et on lance `Oswel's Trap.exe`).
- **Linux** : `Oswels-Trap-1.5.0-linux-x86_64.AppImage` (un seul fichier : clic droit → Propriétés → « Exécutable »,
  puis double-clic), `…-linux-x64.pacman` pour **CachyOS / Arch** (`sudo pacman -U Oswels-Trap-1.5.0-linux-x64.pacman`),
  `…-linux-amd64.deb` pour Ubuntu / Debian / Mint.
- La fenêtre du jeu est le même jeu que la version web (rien n'est réécrit) : manettes PS4 (vibrations, mode direct
  avec la lumière), clavier, sauvegardes (gardées d'une mise à jour à l'autre), **F11** = plein écran,
  **F12** = console (pour chercher un bug), bouton **✕ Quitter** sur l'accueil.

### Le réseau local (même Wi-Fi, sans internet)
- Menu principal → **📶 Réseau local** → **Héberger sur ce PC** : le PC affiche un **QR code** et une adresse
  (ex. `http://192.168.1.12:47800`).
- Les amis scannent le QR code (ou tapent l'adresse) avec leur **téléphone** ou un **autre PC** : la page devient
  une **manette** (joystick, ✕ ○ □ △, OPTIONS), avec **vibrations** et la **couleur de leur joueur**.
  Ils choisissent **Joueur 1 / Joueur 2** (Histoire en coop ou versus) ; dans la **Soirée OSWEL**, chaque manette
  rejoint en appuyant sur ✕, jusqu'à **4 joueurs**. Rien à installer sur les téléphones (le navigateur suffit).
- **📺 Voir l'écran** : chaque manette peut afficher l'**image du jeu en direct** (avec le son sur la version PC),
  pour jouer chacun sur son écran ; sinon tout le monde regarde l'écran du PC (ou un projecteur).
- Un PC avec une **manette PS4** ou un **clavier** peut aussi servir de manette pour un autre PC (Réseau local →
  Rejoindre, ou ouvrir l'adresse dans un navigateur) : la manette branchée est relayée.
- **Hors ligne** : il faut seulement que les appareils soient sur le même réseau Wi-Fi — un routeur sans internet
  ou le **partage de connexion d'un téléphone (même sans données mobiles)** suffit. Le Wi-Fi d'une école bloque
  souvent les appareils entre eux : c'est alors la solution.
- Windows : la première fois, le pare-feu demande l'autorisation → cocher « Réseaux privés » → Autoriser.
- Sans la version PC (Linux, développement) : `node bureau/serveur-lan.js` puis ouvrir
  `http://localhost:47800/index.html?hote=1`.

### L'application Android — dossier `mobile/`
- Le jeu complet dans une application (hors ligne, paysage, plein écran, écran toujours allumé, vibrations,
  manettes Bluetooth, bouton « retour » du téléphone = Retour / Pause), plus **Réseau local → Rejoindre**.
- Fabrication de l'APK : voir `mobile/LISEZMOI.md` (Android Studio, ou automatiquement sur GitHub avec
  `.github/workflows/versions.yml`, qui fabrique aussi les versions Windows et Linux).

### Commandes tactiles plus discrètes
- Par défaut, les boutons tactiles sont **petits et transparents**, collés aux bords ; ils **s'effacent** quand on
  ne touche pas l'écran (2,5 s) ; le bouton **ACTION n'apparaît que lorsqu'il sert** (porte, caisse, levier,
  personnage, dialogue). Paramètres → **Taille des boutons tactiles** : discrets / normaux / grands.
- Même chose sur la manette du réseau local : les boutons inutiles sont cachés (dans la Soirée : seulement A et B),
  et quand l'image du jeu est affichée, les commandes deviennent plus petites et transparentes.

### Pour les développeurs
- `js/extensions.js` : des « prises » dans le moteur (types de pièges, tuiles, gadgets, coop…) pour ajouter du
  gameplay sans réécrire `js/game.js` (prêtes pour la suite, la « Gameplay 3.0 »). Nouvelle action « gadget »
  dans les touches (F · Ctrl droit · ○), cachée tant qu'aucun gadget n'existe.
- `js/lan.js` (le jeu hôte), `manette.html` + `js/manette.js` + `css/manette.css` (la manette),
  `bureau/` (Electron : `main.js`, `preload.js`, `serveur-lan.js`, `preparer.js`), `mobile/` (Capacitor).

## Nouveautés de la version 1.4 (histoire, voix, mini-jeux géants)

Tout le contenu des versions précédentes est conservé (5 mondes, 50 niveaux, boss, personnages, mini-jeux,
solo / coop / versus, boutique, sauvegardes, médailles, checkpoints, pièges, cinématiques, clavier, manette
PS4, tactile). Cette version l'enrichit.

### L'histoire et les dialogues
- **Avant et après chaque niveau** : une courte scène (les anciennes répliques sont gardées et complétées).
- **Des rencontres dans les niveaux** : 18 coins calmes où l'on croise quelqu'un (Isaïe, Kevin, Tchanko,
  Tony, NEXA, Francheska…) — on s'approche et on appuie sur Action pour parler. Des phrases à l'entrée des
  zones, aux découvertes de secrets, aux événements, et avant / après chaque boss (fuite comprise).
- **Monde 1, La Forge** : Isaïe (l'ami du lycée, moqueur), Kevin (mécatronique, énergique, provocateur) et
  Tchanko (calme, précis) entrent dans l'histoire. **Monde 2, Le Code** : Tony devient le vrai guide
  (« Commence par comprendre la logique. », « Un bug n'est pas toujours ton ennemi. »).
  **Monde 3, Le Laboratoire** : on combine les domaines. **Monde 4, Nexus** : NEXA sait des choses… et le
  laisse deviner. **Monde 5, OSWEL City** : clients, devis, budget, réputation, et la Rumeur.
- **Mémoire de l'histoire** : les personnages se souviennent de ce que tu as vécu (« Tu te souviens de la
  Forge ? » — « J'aurais préféré oublier. »).
- **La fin** : « Le voyage ne s'arrête pas ici. » — « Alors… quel est le prochain niveau ? »
  puis *OSWEL'S TRAP — Mon histoire n'est pas terminée. Le prochain niveau reste à créer. À suivre…*

### Les voix
- **Plus de 1 000 répliques ont une voix française**, avec une identité par personnage : Oswel (jeune,
  déterminé : « Encore ?! », « OK… réfléchissons. »), Isaïe, Kevin, Tchanko, Tony (calme, pédagogue),
  Francheska (douce, chaleureuse), NEXA (mystérieuse), le Bug (voix « glitchée »), Zeus (puissante), la
  Rumeur (plusieurs voix mêlées, avec écho), le Gardien, la Machine, le narrateur, l'annonceur des mini-jeux…
- **Le gestionnaire de dialogues** (`js/dialogue.js`) : file d'attente, passer, pause, priorités (une
  cinématique ou un boss ne sont jamais coupés par une petite réaction), délais pour éviter les répétitions,
  sous-titres synchronisés, animations de parole (la bouche, la tête et les bras bougent, portrait 3D dans
  la boîte de dialogue). Si un fichier manque : le jeu ne plante jamais, il affiche le sous-titre.
- **Réactions en jeu** (avec plusieurs variantes et un délai) : début de niveau, piège en vue, chute,
  nouvel essai, secret, checkpoint, faux bloc, poursuite, victoire, boss.
- **Paramètres → Son, voix et sous-titres** : volume général, musique, effets, voix ; voix activées ou
  non ; sous-titres activés ou non ; voix de synthèse de secours ; « Tester la voix ». Tout est sauvegardé.
- Hors ligne : les voix sont dans `audio/fr/`. Pour mettre **tes propres enregistrements** ou refabriquer
  les voix : `tools/voix/LISEZMOI.md`.

### La Soirée OSWEL : des stades beaucoup plus grands et plus clairs
- **Chaque arène est agrandie** et l'espace en plus sert le jeu (chemins, couverts, raccourcis, zones de
  danger, éléments qui bougent) :

| Activité | Avant → maintenant | Nouveau sur le terrain |
|---|---|---|
| 💣 Boum ! | 15×13 → 23×17 | place de la Forge au centre, 2 marteaux-pilons qui frappent des lignes annoncées, mort subite à 70 s |
| 🥔 Patate chaude | 19×13 → 27×19 | 2e paire de portails, îlots de piliers (couverts), glace, champignons-rebonds, flèche sur la bombe |
| 🪙 Vole-moi ça ! | 21×13 → 29×19 | marché et ruelles, égouts-raccourcis, le TRAM qui traverse la place (et vide les sacs) |
| 🏰 Le Trésor | 21×15 → 29×21 | salles latérales, passage secret, balanciers à pics, 7 emplacements de coffre |
| 🚂 Le Train de la mort | 23×4 → 34×6 | 5 wagons larges, conteneurs pour s'abriter, wagons qui se décrochent un par un |
| 🧲 Chaos magnétique | 17×13 → 25×19 | plusieurs trous, rambardes, pylônes magnétiques qui aspirent tout, bord qui s'effondre |
| 🏃 Le Dernier Arrivé | 30×14 → 42×21 | 4 couloirs, 2 canaux, tremplins et passages étroits risqués |
| 🚧 Piège-moi si tu peux | 28×13 → 36×17 | 3 cloisons, tapis roulants, 4 pièges par manche |
| 🤝 Panne générale / 🕵️ Le Traître | 23×13 → 31×17 | une vraie usine : ateliers dans les coins, couloirs avec portes, machine plus grande |

- **Une fiche claire avant chaque mini-jeu** : « MINI-JEU 03 », le nom, puis **OBJECTIF**, **COMMENT
  JOUER** (avec les touches de TA manette, de ton clavier ou de l'écran tactile), **DANGER**, **VICTOIRE**,
  **DÉFAITE** — annoncée par la voix du stade, avec un son et une vibration de la manette.
- **4 secondes d'entraînement** avant la première manche : on essaie les commandes sans risque (impossible
  de tomber), les consignes se cochent, puis tout le monde revient à sa place : **3, 2, 1, PARTEZ !**
- **Des flèches d'objectif** (le coffre, la porte, ta banque, la bombe…), des dangers toujours **annoncés**
  (cases qui clignotent, voies qui s'allument), la caméra qui cadre les 4 joueurs dans les grands stades.
- **De petites voix** : l'annonceur (« Trois ! Deux ! Un ! Partez ! », « Dix secondes ! », « Dernière
  manche ! ») et les personnages (« Je l'ai eu ! », « Attention ! », « À gauche ! », « Traître ! »,
  « Encore une fois ! »…), courtes, dans une bulle au-dessus de celui qui parle.
- Les **bots** jouent avec les mêmes règles sur les nouveaux terrains (ils évitent les nouveaux dangers).

### Records
Les 18 niveaux qui ont reçu une rencontre sont un peu plus longs : les records sont rangés par version du
dessin des niveaux (les anciens restent visibles, marqués « ancienne version du niveau »).

## Nouveautés de la version 1.3 (grands niveaux, Gameplay 2.0)

### Des niveaux vraiment plus grands (pas un simple zoom)

- **Chaque niveau d'origine est gardé** : il devient la **zone 1**. Sa porte de sortie devient une **porte de
  zone** (lumière bleue) qui mène à la suite : **2 à 4 nouvelles zones** par niveau. Un niveau fait maintenant
  de **180 à 420 cases** de long (avant : 40 à 90).
- Chaque zone a un **nom**, un **objectif** (affiché dans un bandeau quand on y entre) et une suite de
  **sections** qui ont chacune un rôle : apprendre une mécanique → la piéger → la combiner → **respirer** →
  surprendre → finir. Les débuts de monde sont plus courts, les fins de monde plus longues, et le 9e niveau de
  chaque monde a une **poursuite** (lave, virus, acide ou effondrement : rare et spectaculaire).
- Chaque monde a ses propres sections : la **Forge** (complexe industriel : marteaux, presses, scies, écraseurs,
  sol brûlant, tonneaux explosifs, caisses et leviers), le **Code** (blocs glitch en vague, faux liens, tags
  HTML, ponts à compiler, pop-ups, commandes inversées), le **Laboratoire** (salles : tapis et acide, gelée qui
  fait sauter, gravité lourde, lasers que l'on bloque avec une caisse, tourelles), le **Nexus** (îles
  flottantes : blocs rose et bleu, plafond à gravité inversée, vent, portails, ventilateurs) et **Oswel City**
  (secteurs : la route et ses voitures, les toits, les chantiers).
- **Plusieurs chemins** : des **bifurcations** (chemin rapide et dangereux qui rapporte plus, ou chemin sûr et
  plus long), des **salles secrètes** (un mur qui sonne creux…), des raccourcis risqués et de **fausses routes**.
- **Pièces** : les **454 pièces d'origine sont toutes à leur place** (zone 1, et tes pièces déjà ramassées
  restent comptées). Les **331 nouvelles** (785 en tout) récompensent toujours quelque chose : une salle
  secrète, un chemin risqué, un puzzle réussi, un petit détour.
- **Points de reprise** après les sections importantes : chaque porte de zone, plus des drapeaux dans
  certains coins calmes. On ne recommence pas tout le niveau quand on tombe (et on repart vite : 0,65 s).
- **Coins calmes** entre les passages difficiles, avec des panneaux, **La Rumeur** (« Il paraît que… », à ne
  pas croire) ou un personnage de l'histoire à qui parler.

### Gameplay 2.0 : des pièges justes et mémorables

- **Chaque piège a un indice** (visuel, sonore ou vibration) : une fine fissure sur un faux sol, une fausse pièce
  qui ne flotte pas et tourne à l'envers, une fausse porte dont le tourbillon tourne à l'envers, une porte piège à
  la lumière rouge pâle, une ombre rouge sous ce qui va tomber, un sifflement près des scies, une lampe qui
  clignote avant une presse ou une tourelle, un sol qui rougit et grésille avant de brûler, un tic-tac qui
  accélère quand on traîne au mauvais endroit, une alarme avant une poursuite.
- **Nouvelles familles de pièges** : scies (au fond d'une fosse ou qui montent et descendent), marteaux, écraseurs, piques,
  presses murales, tourelles, tonneaux explosifs (en chaîne), sol brûlant, fausses pièces, faux drapeaux, fils qui
  tombent du plafond, pièges déclenchés par le joueur, portails pièges, portes qui renvoient en arrière, zones de
  gravité inversée, de vent, de commandes inversées, de gravité lourde ou légère, tapis accélérateurs, caisses à
  pousser, leviers et boutons qui ouvrent des barrières… Aucun piège n'est un hasard injuste : tout se voit,
  s'entend ou se sent avant.
- **En coop**, chaque porte de zone attend toute l'équipe (« On attend… ») et sert de point de reprise pour les deux.

### Les boss : trois actes

- **L'antichambre** : on traverse d'abord les dernières défenses du boss (une zone de pièges de son monde).
- **L'arène** : le combat en 3 phases, comme avant (on reprend au début de l'arène si on tombe).
- **La fuite** (phase finale) : une fois le boss vaincu, **son repaire s'effondre** — la forge déborde, le système
  plante, l'acide déborde, le Nexus se referme, la tour de The Core s'écroule. Il faut courir jusqu'à la vraie
  sortie. On reprend au début de la fuite si on tombe : on ne refait jamais le combat.

### Caméra et immersion

- **Introduction** de chaque niveau (environ 2 secondes) : vue large du stade, légère rotation, puis la caméra
  plonge vers le départ. Elle est plus courte quand on recommence le même niveau.
- **Zoom automatique doux** : la caméra recule dans les grandes salles et devant un gros danger (une poursuite),
  et se rapproche dans les passages délicats, sans à-coups.
- **À deux** : la caméra recule progressivement quand les joueurs s'éloignent, et une **flèche au bord de
  l'écran** montre un joueur qui sort du champ.
- Les décors (forge, ville, labo, Nexus…) s'étendent sur toute la longueur des niveaux.

### Vitesse du gameplay (Paramètres → Gameplay)

- 🐢 60 % · 🚶 75 % · ⚙️ 100 % (par défaut) · 🏃 115 % · ⚡ 130 %. Le réglage est sauvegardé et s'applique tout de
  suite. C'est **tout le jeu** qui ralentit ou accélère (personnages, pièges, boss, bots) : les sauts restent
  exactement les mêmes, donc tous les niveaux restent faisables. Le stick analogique reste progressif.
- En multijoueur, une seule vitesse pour tout le monde (aucun avantage). Les temps faits à une autre vitesse
  que 100 % ne vont pas au classement en ligne.

### Personnages

- **Franck** devient **jouable** (Boutique → Personnage, et dans la Soirée OSWEL) : sa couleur préférée, le rouge, et des **nattes sur
  toute la tête**, du front jusqu'à la nuque, avec des perles dorées (pas de casquette).
- **Lionnel**, le cousin architecte au Canada (lunettes rondes, écharpe d'hiver, rouleau de plans) : niveaux
  **5-2** et **5-6**. **Nadia**, qui travaille au restaurant (tenue blanche, tablier, carnet de commandes) :
  niveaux **5-3** et **5-4**.
- **Les filles** ont une vraie allure de fille : longs cheveux (lâchés, queue de cheval, longues tresses, chignon
  ou foulard selon chacune), jupe, cils, rouge à lèvres, boucles d'oreilles.

### Records, médailles et sauvegardes

- Les **sauvegardes restent valables** (niveaux terminés, pièces, boutique, médailles).
- Les **temps de référence** (médailles d'or et d'argent) sont recalculés pour les grands niveaux.
- Un meilleur temps fait sur l'**ancien niveau court** est marqué « ancien niveau » dans le classement local
  et remplacé par ton premier temps sur le grand niveau. Le classement en ligne sépare aussi les deux versions
  (le serveur a une petite mise à jour : `python manage.py migrate`).

### Validation automatique des niveaux

- Chaque grand niveau (et chaque boss) a été joué jusqu'à la sortie par un **robot de test**, en solo et en
  coop, dans le vrai moteur du jeu et avec les mêmes commandes qu'un joueur. Ce robot est fourni dans
  `tools/validation/` (voir son `LISEZMOI.md`) : `python3 tools/validation/valider.py` revérifie tous les
  niveaux, et `--section` teste une nouvelle zone avant de l'ajouter.

### Performance

- Les longs niveaux restent légers : les immeubles du décor de la ville partagent leurs matériaux (avant : un
  par immeuble), les textures d'un niveau sont libérées quand on en change, et ce qui est hors de l'écran
  n'est pas dessiné.

## Nouveautés de la version 1.2 (refonte visuelle)

- **L'écran ne bouge plus jamais** : la page ne défile plus, sur PC comme sur téléphone (pas de rebond, pas de
  zoom du navigateur). Seul l'intérieur d'un menu trop long défile, dans son propre cadre.
- **Caméra dynamique** partout : on peut tourner autour de l'action et zoomer (voir les commandes plus bas).
  Elle revient toute seule derrière l'action au bout de 3 secondes (réglable). Petite cinématique au début de
  chaque niveau et de chaque manche, mise en scène de la victoire (la caméra s'approche des gagnants).
- **8 personnages jouables**, avec visages expressifs et vraies animations : **OSWEL** (le héros codeur et
  mécano), **MEKA** (robot mécano), **BYTE** (tête-écran en pixels), **NEXA** (voyageuse des portails),
  **GOD LOVE** (coupe haute, long manteau, cœur lumineux qui bat), **TONY** et **FREDO** (les deux
  programmeurs) et **VALDES** (l'assistant de Win Black : casquette à lampe frontale, gilet technique,
  tablette). Mêmes capacités pour tous : seul le style change. Tony, Fredo, Valdes et God Love apparaissent
  aussi dans l'histoire avec leur vrai modèle (God Love et Valdes au niveau 4-7, avec Win Black).
- **Les personnages non joueurs** (Oncle Patou, Christine, Win Black, Valdes…) ont le même style que les
  héros : vrai corps animé, visage expressif, coiffure ou couvre-chef (casquette, chignon, foulard, bandeau,
  capuche de La Rumeur), et ils te saluent quand tu arrives. Les copies des rivaux ont aussi leur vrai visage.
- **Galerie** (menu principal) : tous les personnages en 3D avec leur rôle — les jouables, les personnes de
  l'histoire (et les niveaux où on les croise), les boss et les rivaux.
- **Les arènes sont des stades** : gradins avec un public qui réagit, pylônes de lumière, écran géant, décor
  propre à chaque ambiance (forge, labo, machine, ville, Nexus, chantier). Ondes de choc, confettis.
- **Nouveau menu principal** (Histoire, Multijoueur, Boutique, Galerie, Carnet, Classement, Profil, Paramètres) avec ton
  personnage en 3D, nouvel habillage de tous les écrans et transitions animées.
- **Podium 3D** à la fin de chaque activité et pour le champion de la soirée.
- **Win Black** (Monde 4, niveau 4-7 « Git commit ») et son assistant **Valdes** : parle à Win Black, son
  **BLACKOUT** coupe le courant (lasers éteints, blocs rose et bleu tous solides pendant 7 secondes)…
  mais ne lui en redemande pas : *blackout total*. Leurs fiches s'ajoutent au **Carnet** (nouvelle partie
  « Personnages ») quand on termine le niveau.

## Correctif 1.2.1 : la vitesse des personnages

Depuis la refonte, les personnages semblaient beaucoup trop lents. Les réglages de vitesse n'avaient pas
changé : le vrai problème était ailleurs, et il est corrigé.

- **Le jeu ne passe plus au ralenti** : avant, quand l'ordinateur affichait moins de 30 images par seconde
  (ce qui arrivait plus souvent avec les nouveaux décors), tout le jeu ralentissait d'autant (à 20 images par seconde, il tournait aux deux tiers de sa vitesse).
  Maintenant le temps du jeu suit le temps réel : les personnages vont à la même vitesse sur tous les PC.
- **Le jeu est plus léger à afficher** (environ 30 % d'objets en moins à dessiner par image), donc plus fluide.
- **Le stick de la manette est progressif et rapide** : petite inclinaison = on marche lentement, à moitié =
  vitesse normale, **à fond = vitesse maximale** (comme en courant). Avant, il fallait pousser le stick très
  loin pour aller à la vitesse normale, et depuis la refonte R2 servait au zoom : on ne courait plus jamais.
- **Demi-tours plus nerveux** (au sol) ; caméra qui suit plus vite, sans grosse inertie.
- **Soirée OSWEL** : tous les personnages vont 25 % plus vite, avec la même vitesse de base pour tout le
  monde (et une meilleure adhérence).
- L'animation de course est calée sur la vraie vitesse (les pieds ne glissent pas).
- Les niveaux de l'histoire, les pièges, les collisions et les sauts n'ont pas bougé (les niveaux sont
  réglés sur la vitesse de marche normale : 7,2 cases par seconde, 9,7 en courant).

## L'histoire

| Monde | Thème | Boss | Ce qu'on y apprend |
|---|---|---|---|
| 1 · La Forge | « Comprendre comment les choses fonctionnent » | Le Gardien de la Forge | mécanique, mécatronique |
| 2 · Le Code | « Apprendre à créer » | Le Bug | premier programme, Web, HTML, CSS, JavaScript, conditions, fonctions, codes d'erreur, bases de données, débogage |
| 3 · Le Laboratoire | « Comprendre l'ingénierie » | La Machine de l'Examen | unités, dérivée, puissance, énergie, pH, enzymes, probabilités, logique |
| 4 · Nexus | « Imaginer » | Zeus (défi entre frères) | Internet, IP, cloud, mots de passe, API, IA, Git, open source, design thinking, brainstorming |
| 5 · OSWEL City | « Construire mon propre avenir » | La Rumeur (The Core) | besoin du client, devis, prix, budget, planning, portfolio, mise en ligne, maintenance, réputation |

On joue en **Solo**, en **Coopération** (les deux doivent atteindre la porte) ou en **Versus** (le premier
arrivé gagne). À la fin du Monde 5 : le dernier chapitre, puis l'écran « À suivre… ».

Ce qu'on y trouve aussi : marques de chute, mode facile avec drapeaux de reprise, musique pour chaque monde
et chaque boss, médailles (or, argent, bronze, « sans chute »), fantôme de ton meilleur essai, leçons et
carnet, classement, lumière de la manette PS4 (bleu J1, orange J2, rouge quand on tombe).

**Portes et caisses** : pour passer une porte, on se met devant et on appuie sur le bouton **Action**
(△ / E / ↓) — une étiquette « △ Entrer » s'affiche. Attention aux fausses portes ! Les **caisses à outils**
s'ouvrent aussi avec Action : une bonne caisse donne une pièce, une caisse piégée mord (on tombe). Il y en a
dans presque tous les niveaux. Un indice pour ceux qui regardent bien : les caisses piégées frémissent.

**Monde 5, la circulation** : les voitures arrivent d'une rue du fond (on les voit venir) et le feu à l'entrée
de la route clignote juste avant. On saute par-dessus, ou on s'abrite **sous un abribus**.

## Le multijoueur : la Soirée OSWEL (1 à 4 joueurs sur ce PC)

Menu principal → **Multijoueur**. Des mini-jeux d'arcade **vus de dessus** dans de grands stades : la caméra
cadre l'action et les joueurs (tourner / zoomer : stick droit, L2 / R2, souris, deux doigts). On peut jouer **seul avec une manette** : les places libres sont prises par des
**bots**, qui utilisent exactement les mêmes commandes que les joueurs (joystick + A + B, sans tricher).

**Les formules** : *Partie rapide* (3 activités au hasard, 8 à 10 min) · *Soirée surprise* (5 activités et
des surprises entre deux : points doublés, le dernier impose l'activité suivante) · *Choisir les activités*
(sa liste, dans son ordre — une seule suffit pour s'entraîner) · *Tournoi* (les 9 activités, puis une
finale en duel entre les deux premiers). Le Traître se choisit dans la liste (ou tombe en Soirée surprise).

**Réglages** : niveau des bots (**Facile**, **Normal**, **Difficile**, **Chaos** — les bots Chaos aiment
viser les humains) et « compléter avec des bots » quand on est 2 ou 3.

**Rejoindre** (écran « Qui joue ? ») : chacun appuie sur **A** de sa manette ou de son côté du clavier.
Gauche / droite change le nom (les profils du jeu, avec leurs accessoires et gadgets), haut / bas la
couleur, **B** libère la place. A encore une fois quand on est prêt, ou OPTIONS pour lancer.

| | Bouger | A | B | Pause |
|---|---|---|---|---|
| Manette (jusqu'à 4) | joystick / croix | ✕ (ou R1, R2) | □ (ou ○, △, L1, L2) | OPTIONS |
| Clavier gauche | Z Q S D (AZERTY) · W A S D | Espace (ou F, C) | E (ou Maj gauche, R) | Échap / P |
| Clavier droit | flèches | Entrée (ou 0 du pavé) | Maj droite (ou 1, 2 du pavé) | Échap |
| Écran tactile | joystick à gauche | bouton A | bouton B | bouton II |

**Les 9 activités + 1 variante** (chacune dure de 1 à 4 minutes, souvent en 3 manches) :

| Activité | Le principe | A | B |
|---|---|---|---|
| 💣 Boum ! | Bombes en croix, caisses à casser, bonus (télécommande, bombe perçante, coup de pied…). Mort subite au bout d'une minute. Le dernier debout gagne ; les fantômes lancent des mini-bombes. | poser une bombe (fantôme : lancer) | faire exploser (télécommande) |
| 🥔 Patate chaude | Une bombe à mèche secrète passe d'un joueur à l'autre au contact. Tapis roulants et portails. Un lancer raté revient en boomerang ! | lancer la patate | sprint (bouscule) |
| 🪙 Vole-moi ça ! | Ramasse des pièces, mets-les au coffre (ton coin). Plus ton sac est lourd, plus tu es lent. Pluie de pièces, pièce géante, le Percepteur… | coup de sac (fait tomber des pièces) | sprint |
| 🏰 Le Trésor | Ouvre les coffres en restant dessus. Alliance (se frapper dans les mains) ou trahison ! Portes, pics, objets. | ouvrir le coffre (maintenir) · ramasser | frapper · utiliser l'objet |
| 🚂 Le Train de la mort | Sur le toit d'un train : barres, lasers, vent, freinage, tunnels, wagons qui se détachent. Pousse les autres dans le vide ; les tombés pilotent un drone à bombes. | sauter (drone : lâcher une bombe) | pousser |
| 🧲 Chaos magnétique | Attire les caisses, boules et blocs, puis renvoie-les sur les autres. La polarité s'inverse ! 3 vies. | attirer (maintenir) | repousser / lancer |
| 🏃 Le Dernier Arrivé | Aller-retour jusqu'à la porte… et les règles changent toutes les 6 s (sol qui disparaît, vitesse ×2, vent, commandes inversées, lasers, « la sortie a déménagé »). | coup d'épaule | — |
| 🚧 Piège-moi si tu peux | **Phase 1** : chacun pose 3 pièges avec son curseur (mine cachée, trou, laser, mur, plaque fragile, ventilateur, sol électrique). **Phase 2** : traverser l'atelier. Les pièges restent d'une manche à l'autre. +1 par victime de tes pièges, −1 si tu tombes dans le tien. | poser / coup d'épaule | changer de piège / sauter |
| 🤝 Panne générale | **Coopération** : réparer la Grande Machine à 100 % avant la fin du temps. 4 postes, 3 rayons de pièces, des questions du Carnet à l'ordinateur, Oncle Patou qui distribue le travail, et des urgences : surchauffe, panne électrique, incendie, porte bloquée, surcharge, fuite, virus, coupure générale. Machine réparée : chacun marque selon ses réparations ; explosée : 1 point chacun. La machine s'adapte au niveau des bots. | agir (maintenir / taper vite / prendre / poser / répondre) | extincteur |
| 🕵️ Le Traître *(variante, dès 3 joueurs)* | La même machine… mais un joueur est secrètement le traître. « Tout le monde ferme les yeux » : le jeu montre son rôle à chaque joueur, l'un après l'autre (le traître sent aussi 3 vibrations). Le traître fait baisser les jauges en ayant l'air de réparer, coupe le courant, bloque une porte ou lance de fausses alertes. À la fin : **QUI EST LE TRAÎTRE ?** chacun va sur le socle de son suspect. | agir (traître : saboter) | extincteur (traître : fausse alerte) |

**Les résultats** après chaque activité : classement, score, éliminations, bonus (« Pris à son propre piège »,
« Employé du mois »…), statistiques, points de la soirée (5, 3, 2, 1) et **pièces** gagnées par les profils
(plus il y a de bots difficiles, plus on gagne). Puis **Activité suivante**, **Rejouer (revanche !)** ou
**Retour aux activités**. À la fin : **🏆 CHAMPION DE LA SOIRÉE**.

Pour se venger : à *Piège-moi si tu peux*, celui qui a le moins marqué a un piège de plus à la manche
suivante ; en *Soirée surprise*, le dernier peut imposer l'activité suivante.

## La boutique et la personnalisation

On gagne des pièces dans l'histoire (pièces des niveaux, premières victoires, médailles, quiz).
L'écran **Boutique** montre ton personnage en grand, en 3D : tourne-le (glisser, ou stick droit de la manette)
et zoome (molette, pincer, R2 / L2). Chaque objet sélectionné **s'essaie aussitôt** sur le personnage, avec sa
description, son prix, sa **rareté** (Commun, Rare, Épique, Légendaire, Mythique) et son état (acheté, équipé).
Les onglets :

- **Personnage** : OSWEL, MEKA, BYTE, NEXA, GOD LOVE, TONY, FREDO ou VALDES (gratuits).
- **Tenue** (la couleur) et **Tête** (casquette, casque, lunettes, couronne…).
- **Effets** : une aura qui te suit partout (étincelles, pixels, anneau du Nexus, orbite dorée, aura BLACKOUT).
- **Victoire** : ton animation quand tu gagnes (poing levé, gros bras, danse, lévitation).
- **Émotes** : le geste fait en entrant dans un niveau et quand tu gagnes (salut, fou rire, danse, toupie…).
- **Gadgets des mondes** : 25 objets, 5 par monde (clé à molette, torche, engrenage dans le dos… canard de
  débogage, cape binaire… fiole lumineuse, atome en orbite… jetpack, drone compagnon… ballon, trophée d'or).
  On les voit tous, mais ceux d'un monde ne s'achètent **qu'une fois arrivé dans ce monde**. On porte un
  gadget en plus de son accessoire, et on le garde en multijoueur.

## Lancer le jeu

Au lancement, une petite animation avec du son présente le jeu (n'importe quel bouton la passe). Si le
navigateur bloque le son, il affiche d'abord « Appuie sur une touche ».

**Sur PC (Windows ou Linux)** : le plus simple est la **version PC à installer** (voir « Nouveautés de la version
1.5 » plus haut et `bureau/LISEZMOI.md`) ; elle permet aussi d'**héberger le réseau local**. Sans l'installer,
on peut toujours double-cliquer sur `index.html` (Chrome, Edge ou Firefox). Branche la manette PS4 (USB ou
Bluetooth), puis appuie sur un de ses boutons pour qu'elle soit détectée. Tout marche sans internet.

**Sur Android** : l'**application** (fichier `.apk`, voir `mobile/LISEZMOI.md`) contient tout le jeu, hors ligne.

**Partager le jeu avec un lien** (navigateur, sans rien installer) :
1. Va sur https://app.netlify.com/drop et glisse le dossier `oswels-trap` dedans.
2. Ouvre le lien obtenu dans Chrome sur ton téléphone.
3. Menu ⋮ → « Installer l'application » : le jeu marche ensuite même sans internet.

## Commandes par défaut (modifiables dans Options → Changer les touches)

| Action | Manette PS4 | Clavier J1 | Clavier J2 | Tactile |
|---|---|---|---|---|
| Bouger | Joystick gauche / croix | Q D (AZERTY) · A D | ← → | ◀ ▶ |
| Sauter | ✕ | Z (AZERTY) · W · Espace | ↑ | SAUT |
| Courir (vitesse maximale) | □ ou stick à fond | Maj gauche | Maj droite | COURIR |
| Action : parler, ouvrir une caisse, entrer dans une porte, poser une bombe | △ | E | ↓ | ACTION |
| Pause | OPTIONS | Échap / P | Échap | bouton II |
| Tourner la caméra | Joystick droit · pavé tactile (mode direct) | Souris : glisser | — | Glisser un doigt sur l'écran |
| Zoomer | R2 avant · L2 arrière | Molette | — | Pincer à deux doigts |
| Recentrer la caméra | (elle revient seule) | Double-clic | — | Double tap |

**Caméra** (Paramètres → les lignes « Caméra ») : vitesse de rotation, sens haut/bas, retour automatique.
L'option **« Gâchettes L2 / R2 »** remet l'ancien réglage (R2 = courir progressivement) si tu préfères.
Le stick gauche est progressif : un peu = lent, à moitié = normal, à fond = vitesse maximale.
Dans la Soirée OSWEL, sur téléphone, le côté gauche de l'écran est le joystick et le **côté droit** sert à
tourner la caméra (deux doigts : zoom).

**Pavé tactile de la manette PS4** : le navigateur ne donne pas la position des doigts sur le pavé ; le jeu ne
peut donc s'en servir que dans le **mode direct PS4** (Options → Mode direct, Chrome ou Edge sur PC) : glisser
un doigt tourne la caméra, écarter deux doigts zoome. Sans le mode direct, le pavé n'est pas utilisé.

## Sur Linux (CachyOS, Arch, Ubuntu…)

Si Edge ou Chrome est installé en **Flatpak**, il ne voit pas la manette (Firefox, lui, la voit) :
le Flatpak n'a pas accès à la liste des manettes du système. Une seule commande suffit, une fois :

```
flatpak kill com.microsoft.Edge
flatpak override --user --filesystem=/run/udev:ro com.microsoft.Edge
```

(pour Chrome : `com.google.Chrome`, pour Chromium : `org.chromium.Chromium`). Branche ensuite la manette
**avant** d'ouvrir le navigateur, puis appuie sur un de ses boutons dans le jeu. Pour savoir si ton navigateur
est un Flatpak : `flatpak list | grep -i -e edge -e chrome`. Un navigateur installé normalement
(`sudo pacman -S chromium`) n'a pas ce problème.

## La manette n'est pas détectée ou ne vibre pas ?

**Edge ou Chrome dit « aucune manette détectée » (alors que Firefox la voit)** :
1. Sur Linux avec un navigateur Flatpak : la commande juste au-dessus.
2. Clique une fois dans la page du jeu, puis appuie sur ✕ : Edge et Chrome ne montrent la manette
   qu'après un appui sur un de ses boutons.
3. Toujours rien ? **Options → Mode direct PS4 (boutons, lumière, vibrations)** → choisis la manette dans
   la liste. Le jeu lit alors les boutons directement, sans passer par le navigateur. Il faut le faire une
   seule fois, ensuite elle est reconnue toute seule à chaque lancement.

**La manette marche mais ne vibre pas** :
1. **Options → Tester les vibrations**. Le message dit ce que voit le navigateur pour chaque manette.
2. Si le message dit « le navigateur ne donne pas accès aux vibrations » ou « refusée » : utilise le
   **Mode direct PS4** (même réglage qu'au-dessus).
3. Si tu utilises **Steam** ou **DS4Windows**, ils peuvent créer une deuxième manette « virtuelle » qui
   avale les vibrations. Ferme-les le temps de jouer, ou utilise le Mode direct PS4.
4. Firefox ne gère ni les vibrations ni le Mode direct : pour vibrer, joue dans Edge ou Chrome.

## Jouer en ligne (facultatif)

Sans réglage, le jeu est 100 % hors ligne. Pour avoir un classement mondial, recevoir les bugs signalés par
les joueurs et transférer une sauvegarde d'un appareil à l'autre avec un code à 6 caractères, installe le
petit serveur du dossier `serveur/` (gratuit sur PythonAnywhere, voir `serveur/README.md`), puis colle son
adresse dans **Options → En ligne**.

Sans serveur, on peut quand même transférer une sauvegarde : Options → En ligne → « Afficher mon code »,
« Copier », puis sur l'autre appareil « Importer ce code ».

## Organisation du code

```
index.html            la page : menus, HUD, dialogues, quiz, cinématiques, écrans du multijoueur
manifest.json, sw.js  le jeu installable et hors ligne (changer VERSION dans sw.js à chaque mise à jour)
css/style.css         l'apparence de l'interface
img/                  aperçus des mondes et icônes
js/three.min.js       moteur 3D (Three.js r128)
js/data.js            Monde 1, boutique (couleurs, accessoires, gadgets) + outils pour construire les niveaux
js/world2.js … world5.js   les mondes 2 à 5 : personnages, niveaux, leçons, quiz, chapitre, cinématique
js/input.js           manettes (jusqu'à 4) + vibrations, clavier, tactile, touches personnalisables, sons
js/light.js           mode direct PS4 (boutons, lumière et vibrations par WebHID)
js/music.js           musique fabriquée en direct (un thème par monde, par boss, et pour le multijoueur)
js/net.js             fonctions en ligne (classement, bugs, sauvegarde dans le nuage)
js/sections.js        LES GRANDS NIVEAUX : les sections (pièges, puzzles, coins calmes…) et la construction des zones
js/levelplans.js      le plan de chaque grand niveau (zones, sections, panneaux) et les boss (antichambre, fuite)
js/models.js          modèles 3D : accessoires, gadgets, personnages non joueurs, blocs, décors
js/chars.js           les 9 personnages jouables (OSWEL, MEKA, BYTE, NEXA, GOD LOVE, TONY, FREDO, VALDES, FRANCK) et les personnages
                      non joueurs : modèles, visages, effets et animations
js/camera.js          la caméra du joueur (stick droit, L2/R2, pavé tactile, souris, doigts, cinématiques)
js/game.js            MOTEUR de l'histoire : physique, pièges, boss, caméra (1 ou 2 joueurs)
js/ui.js              profils, menus, boutique, médailles, leçons, quiz, sauvegarde
js/arena/core.js      MOTEUR des mini-jeux vus de dessus : arène, joueurs, collisions, manches, bots, caméra
js/arena/stadium.js   le stade autour des arènes (gradins, public, lumières, écran géant, décor)
js/arena/podium.js    le podium 3D des résultats et du champion
js/arena/ui.js        la Soirée OSWEL : rejoindre, activités, fiches, HUD, pause, résultats, champion
js/arena/games/*.js   les mini-jeux (un fichier chacun, avec ses règles, son affichage et son bot ;
                      panne.js contient aussi la variante Le Traître)
js/dialogue.js        LES DIALOGUES ET LES VOIX : files, priorités, sous-titres, réactions, mémoire de l'histoire
js/histoire.js        l'histoire de la version 1.4 : personnages (Isaïe, Kevin, Tchanko…), scènes avant / après
                      chaque niveau, rencontres, phrases de zone, secrets, boss, fin
js/repliques.js       les petites réactions (en jeu et dans les mini-jeux) et les répliques de l'annonceur
js/voices.js          la liste des voix enregistrées (fabriquée par tools/voix/generer.py)
js/portrait.js        le portrait 3D animé de celui qui parle
audio/fr/             les voix (audio/fr/characters/<personnage>/<code>.mp3)
js/splash.js          l'animation de lancement
js/extensions.js      (1.5) les « prises » du moteur pour ajouter pièges, gadgets, coop… sans réécrire game.js
js/combat.js          (1.5) les combats de boss : explications des phases, répliques, petites cinématiques, finale
js/pieges3.js         (1.5) les nouveaux pièges (trou qui bouge, pics surgissants, fantômes, Flappy, scie…) et
                      dans quels niveaux ils sont placés (OT.PIEGES3_PLACEMENT)
js/reactions.js       (1.5) les réactions des héros (selon la mort, les découvertes, les passages de justesse)
js/pouvoirs.js        (1.5) les POUVOIRS DE TONY (Ctrl+Z, Boucle while, Debug, Copier-coller, Compiler) et leurs leçons
js/quetes.js          (1.5) QUÊTES, rôles des personnages, indices à 3 niveaux, mémoire, récompenses, niveaux secrets
js/journal.js         (1.5) le Journal (dans le Carnet et dans la pause)
js/progression.js     (1.5) les étoiles ★★★ et l'écran PROGRESSION
js/lan.js             (1.5) RÉSEAU LOCAL côté jeu : les téléphones / PC connectés deviennent des manettes du jeu
js/qrcode.js          (1.5) le QR code de l'écran Réseau local (bibliothèque qrcode-generator, licence MIT)
manette.html          (1.5) la page MANETTE ouverte par les invités (js/manette.js, css/manette.css)
bureau/               (1.5) la VERSION PC (Electron) : main.js, preload.js, serveur-lan.js, preparer.js
mobile/               (1.5) l'APPLICATION ANDROID (Capacitor) : projet android/ prêt à fabriquer
.github/workflows/    (1.5) fabrication automatique des versions sur GitHub (Windows, Linux, Android)
serveur/              le serveur Django (facultatif)
tools/validation/     le robot qui vérifie que chaque niveau peut être terminé (solo et coop : valider.py),
                      que chaque pièce est accessible (pieces.py) et que les mini-jeux marchent (minijeux.py)
tools/voix/           l'outil qui fabrique les voix (voir tools/voix/LISEZMOI.md)
```

Pour **agrandir ou modifier un grand niveau** : dans `js/levelplans.js`, chaque niveau a une liste de zones
`Z(nom, objectif, [sections…])` ; une section est `['saws', { … }]` (voir `js/sections.js` pour la liste et
leurs options). La zone 1 reste toujours le niveau d'origine.

Pour **ajouter un niveau** : copie un bloc de niveau dans le fichier du monde, construis-le avec
`L.rect(...)`, `L.coin(...)`, `L.door(...)`… (y = 0 est la rangée du bas), écris sa leçon dans `teach`,
puis change `VERSION` dans `sw.js`.

Pour **ajouter un mini-jeu** : copie un fichier de `js/arena/games/` (par exemple `course.js`), change son `id`,
ses règles, `round` (l'arène), `update` (la partie) et `bot` (le bot, qui n'a droit qu'au joystick et aux
boutons A et B), ajoute sa balise `<script>` dans `index.html` (avant `<!--ARENA-GAMES-->`) et son fichier dans
`sw.js`. Il apparaît tout seul dans la Soirée OSWEL.

Pour **ajouter un gadget** : ajoute une ligne dans `OT.SHOP.gadgets` (`js/data.js`, avec son monde `w`) et
son modèle 3D dans la fonction `gadget()` de `js/models.js`.

Pour **ajouter un personnage jouable** : dans `js/chars.js`, ajoute une ligne dans `LIST` (nom, univers,
description), une fonction `BUILD.<id>` (son modèle : `humanBase(...)` fait déjà le corps, la tête et le
visage d'un humain), son style de visage dans `STYLES` et sa personnalité dans `PERSO` (animations d'attente
et de victoire). Il apparaît tout seul dans la Boutique, la Galerie et la Soirée OSWEL (ajoute aussi son id
dans `CHARS` de `js/arena/ui.js`).

Pour **donner un profil à un personnage de l'histoire** (comme Win Black) : ajoute `profile: { title, about,
look, mind, power: { name, text }, quote, met }` à sa ligne dans `OT.CHARACTERS` : sa fiche apparaît dans le
Carnet et dans la Galerie.
