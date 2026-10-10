# Les voix d'OSWEL'S TRAP (version 1.5)

Toutes les répliques du jeu ont une voix française enregistrée dans `audio/fr/` :

> **Version 1.5** : les nouvelles répliques ont toutes leur voix (quêtes, rappels, retrouvailles, réactions des
> héros, nouveaux dialogues des boss, pouvoirs et leçons de Tony, et **chaque indice dit par chaque personnage**
> qui peut le donner, avec SA voix). Tony a une nouvelle voix (grave, posée, un peu feutrée « sous la capuche » :
> effet `hood`) et **toutes** ses répliques ont été refaites avec elle. Les phrases dites dans une bulle par un
> boss ou un personnage sont listées dans `OT.STORY_EXTRA` (js/game.js) pour avoir leur voix aussi.

```
audio/fr/characters/<personnage>/<code>.mp3    une réplique (ex. audio/fr/characters/tony/3f2a9c1b.mp3)
js/voices.js                                   la liste des fichiers qui existent (et leur durée)
```

Le `<code>` est calculé à partir du texte de la réplique (voir `OT.Dialogue.keyOf` dans `js/dialogue.js`).
Si tu changes le texte d'une réplique, son code change : l'ancienne voix n'est plus utilisée et le jeu
affiche simplement le sous-titre (ou utilise la voix de synthèse du navigateur, si elle est activée)
jusqu'à ce que tu relances l'outil.

Le jeu ne plante jamais si un fichier manque : il passe au sous-titre seul.

## Mettre TES propres enregistrements

1. Trouve le fichier de la réplique : lance le jeu, ouvre la console du navigateur (F12) et tape
   `OT.Dialogue.keyOf('tony', 'Commence par comprendre la logique.')` → `tony/xxxxxxxx`.
2. Enregistre ta voix (mono, de préférence), exporte en `.mp3` et remplace
   `audio/fr/characters/tony/xxxxxxxx.mp3`.
3. Mets à jour la liste et les durées : `python3 tools/voix/generer.py --manifest`.

L'outil ne remplace jamais un fichier existant (sauf avec `--force`) : tes enregistrements sont protégés.

## Refabriquer les voix (outil `generer.py`)

`generer.py` ouvre le jeu dans un navigateur sans fenêtre, récupère TOUTES les répliques
(`OT.Dialogue.collectAll()` : cinématiques, chapitres, histoire, boss, Rumeur, réactions, mini-jeux,
annonceur), les fait lire par une voix de synthèse française hors ligne (Mimic 3), donne à chaque
personnage SA voix, puis range les fichiers et réécrit `js/voices.js`.

### Installation (une fois, Linux / CachyOS)

```bash
# 1. ffmpeg (avec rubberband) et uv
sudo pacman -S ffmpeg uv            # CachyOS / Arch

# 2. un environnement Python 3.11 (Mimic 3 ne s'installe pas avec Python 3.13)
uv venv --python 3.11 ~/oswel-voix
uv pip install --python ~/oswel-voix/bin/python mycroft-mimic3-tts gruut_lang_fr "setuptools<70" pyworld

# 3. les voix françaises de Mimic 3 (dépôt MycroftAI/mimic3-voices)
for v in m-ailabs_low siwis_low tom_low; do
  mkdir -p ~/mimic3-voices/fr_FR/$v
  for f in generator.onnx config.json phonemes.txt phoneme_map.txt speakers.txt ALIASES LICENSE; do
    curl -fsSL -o ~/mimic3-voices/fr_FR/$v/$f \
      https://media.githubusercontent.com/media/MycroftAI/mimic3-voices/master/voices/fr_FR/$v/$f || true
  done
done

# 4. pour l'outil : Playwright (Chromium)
pip install playwright && playwright install chromium
```

### Utilisation

```bash
cd oswels-trap
python3 tools/voix/generer.py --mimic3-python ~/oswel-voix/bin/python --voices ~/mimic3-voices
python3 tools/voix/generer.py ... --only tony,nexa     # seulement ces personnages
python3 tools/voix/generer.py ... --force              # tout refaire
python3 tools/voix/generer.py ... --prune              # supprimer les voix de répliques qui n'existent plus
python3 tools/voix/generer.py --manifest               # seulement réécrire js/voices.js
python3 tools/voix/generer.py ... --lot 80             # (1.5) taille des lots, voir plus bas
```

**(1.5) Fabrication par lots** : l'outil fabrique les voix par paquets de 80 (synthèse → mp3 → `js/voices.js`
mis à jour). Si l'ordinateur s'éteint ou si tu arrêtes l'outil, tout ce qui est fini est gardé : relance la
même commande, elle reprend là où elle s'était arrêtée (elle ne fabrique que ce qui manque).

### Les voix des personnages : `voix.json`

Chaque personnage part d'une des 7 voix de base (`bases`) et reçoit :

| réglage   | effet |
|-----------|-------|
| `f0`      | la hauteur visée (Hz) : ~95-140 voix d'homme, ~190-235 voix de femme |
| `range`   | l'expressivité : 1 = normal ; Kevin 1.35 (énergique), Tony 0.85 (posé), Nexa 0.7 (calme, mystérieuse) |
| `timbre`  | combien le timbre suit la hauteur (voix plus grave / plus claire) |
| `tempo`   | la vitesse de parole |
| `fx`      | des effets : `reverb`, `hall_light`, `warm` (Francheska), `nexa_light`, `glitch` (le Bug, avec bégaiements), `metal_light` (le Gardien), `robot_soft` (MEKA, la Machine), `digital` (BYTE), `stadium_light` (l'annonceur), `hood` (Tony, 1.5 : voix un peu feutrée, résonance très proche)… |
| `layer`   | une 2e voix mélangée (la Rumeur : plusieurs voix qui parlent ensemble) |
| `calme`   | (1.5) combien l'émotion de la réplique change sa façon de parler : 1 = normal ; Tony 0.3, NEXA 0.35, la Machine 0.2 (ils restent posés même quand ils s'exclament) |

**(1.5) Des voix plus humaines, réplique par réplique** (`expressif()` dans `generer.py`) : la VOIX du personnage
ne change jamais (même hauteur, même timbre, mêmes effets), mais sa façon de dire suit l'émotion de la phrase :
- un cri, une surprise, la panique (`!`, `?!`, un mot crié en MAJUSCULES : « Attends... IL Y A UN PIÈGE ! ») :
  il parle un peu plus vite, avec plus d'intonation (surtout si la phrase est courte) ;
- une hésitation, une réflexion (`...` : « OK... réfléchissons. ») : il ralentit, et les « ... » font des pauses ;
- une question : une intonation un peu plus vivante ;
- une longue explication (un indice) : un débit posé et clair.
Le texte du sous-titre, lui, n'est jamais modifié.

Le changement de voix utilise **WORLD** (paquet `pyworld`) : la voix change de hauteur et de timbre
en restant compréhensible. Sans `pyworld`, l'outil utilise ffmpeg/rubberband (moins propre).

### Vérifier qu'on comprend les voix (facultatif)

`--check` fait écouter chaque fichier par une reconnaissance vocale française hors ligne (DeepSpeech,
modèle du projet commonvoice-fr) et écrit `tools/voix/rapport.txt` (pourcentage de mots retrouvés par
personnage et les répliques les moins bien comprises).

```bash
python3.9 -m venv ~/asr && ~/asr/bin/pip install deepspeech-tflite==0.9.3 "numpy<2"
python3 tools/voix/generer.py ... --check --asr-python ~/asr/bin/python --asr-model ~/modele-deepspeech-fr
```

Mesures faites pour la version 1.4 : les voix sans effet gardent autant de mots compris que la voix
de synthèse d'origine (environ 60-75 % pour cette reconnaissance, qui n'est pas parfaite elle-même) ;
les voix à effets (Bug, Rumeur, Gardien, Zeus) sont volontairement plus « étranges » mais restent
compréhensibles, et le sous-titre est toujours là.

## Réglages dans le jeu

Paramètres → **Son, voix et sous-titres** : volume général, musique, effets, voix, voix activées /
désactivées, sous-titres activés / désactivés, voix de synthèse de secours, bouton « tester la voix ».
Tout est sauvegardé.

## Crédits des voix de synthèse

- Moteur : Mimic 3 (Mycroft AI) — utilisé seulement pour fabriquer les fichiers, il n'est pas inclus dans le jeu.
- Voix `fr_FR/m-ailabs_low` (locuteurs bernard, zeckou, gilles_g_le_blanc, ezwa, nadine_eckert_boulet) :
  données M-AILABS Speech Dataset, © 2017-2019 M-AILABS.
- Voix `fr_FR/siwis_low` : SIWIS French Speech Synthesis Database, licence CC BY 4.0.
- Voix `fr_FR/tom_low` : licence ODbL.
- Changement de voix : WORLD / pyworld. Effets : ffmpeg.
