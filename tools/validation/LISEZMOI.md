# Validation automatique des niveaux

> Plan → construction → simulation → test du chemin → validation → niveau accepté.

Ce dossier contient le **robot de test** qui a servi à vérifier les grands niveaux de la version 1.3.
Il joue chaque niveau dans le **vrai moteur du jeu** (un Chromium sans fenêtre), avec **les mêmes commandes
qu'un joueur** : gauche, droite, saut (court ou long), courir, action. Il n'a pas le droit de tricher : pas de
téléportation, pas de vitesse en plus, pas de traversée des murs. Un niveau est **validé** quand le robot
atteint la vraie sortie, en solo **et** en coop (deux robots qui doivent s'attendre aux portes de zone).

## Installer (une seule fois)

```bash
pip install playwright
python3 -m playwright install chromium
```

(Sur CachyOS / Arch : `pip install --user playwright`, ou dans un environnement virtuel.)

## Lancer

Depuis le dossier du jeu :

```bash
python3 tools/validation/valider.py              # les 50 niveaux, solo et coop (≈ 1 h 30)
python3 tools/validation/valider.py 2-           # tout le monde 2
python3 tools/validation/valider.py 3-4 5-10     # le niveau 3-4 et le boss du monde 5
python3 tools/validation/valider.py 1-2 solo     # seulement en solo
```

Chaque ligne du résultat donne : la longueur du niveau (en cases), la zone atteinte, le nombre de chutes du
robot, son temps et les pièces ramassées. En cas d'échec, l'endroit où il s'est arrêté et ce qui l'a fait
tomber. Le tout est aussi écrit dans `tools/validation/rapport.txt`.

## Tester une nouvelle zone avant de l'ajouter

```bash
python3 tools/validation/valider.py --section 4 '[{"name": "Essai", "goal": "…", "secs": [["windRun", {"power": -3}], ["rest", {}], ["fanLift", {}]]}]'
```

Le robot construit un petit niveau du monde 4 avec seulement ces sections (voir `js/sections.js` pour la
liste des sections et leurs options) et le joue en solo puis en coop. Si c'est validé, on peut copier la
zone dans `js/levelplans.js`.

## Comment il joue

- **Zone 1** (le niveau d'origine) : le robot écrit pour ce niveau (`robots/bot3.js`, `w2bots.js`,
  `w345bots.js`, `bossbot.js` pour les combats de boss).
- **Zones suivantes** : `robots/secbots.js`. Il imagine plusieurs suites de commandes (marcher, courir,
  sauter plus ou moins longtemps, attendre…), les **simule avec la même physique que le jeu** (gravité,
  sauts, plateformes, pièges qui bougent, tirs, blocs qui apparaissent…), et choisit celle qui avance le plus
  sans danger. Quelques sections ont un petit robot à elles (pousser une caisse, actionner un levier, attendre
  le bon moment au plafond…).
- `robots/tests.json` : la liste des tests (un par niveau et par mode).

Si un niveau échoue après une modification, c'est soit que le niveau est devenu impossible (à corriger !),
soit que le robot ne connaît pas encore la nouvelle mécanique (il faut lui apprendre, dans `secbots.js`).

## Vérifier les mini-jeux (version 1.4)

```bash
python3 tools/validation/minijeux.py                  # les 10 activités, 2 parties par réglage (≈ 2 min)
python3 tools/validation/minijeux.py boum train 5     # seulement Boum ! et le Train, 5 parties par réglage
```

Chaque activité est jouée par des bots, sans affichage, dans le vrai moteur : 4 bots « Normal », 4 niveaux
mélangés (Facile, Normal, Difficile, Chaos) et un duel à 2. Une partie est validée si toutes ses manches se
terminent, avant la limite de temps, sans erreur. Résultat dans `tools/validation/rapport_minijeux.txt`.
