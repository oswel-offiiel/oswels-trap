# Le site du jeu — oswels-trap.netlify.app

Ce dossier contient le site public d'Oswel's Trap :

- **la page de téléchargement** (`site/page/`) : bande-annonce, boutons Windows / Linux / Android,
  mondes, boss, Tony, personnages, Soirée OSWEL, images du jeu, questions ;
- **le jeu complet jouable dans le navigateur** (`/jouer/`), pour iPhone, iPad, Mac et tout appareil
  sans installation. Il n'est pas rangé ici : il est **copié depuis ce dépôt** au moment de la
  fabrication du site, avec le même outil que la version PC et Android (`bureau/preparer.js`).

## Comment le site se met à jour

Netlify est relié à ce dépôt GitHub. À chaque envoi (`git push`) sur la branche `main` :

1. Netlify lit `netlify.toml` (à la racine du dépôt) ;
2. il lance `bash site/construire.sh`, qui assemble la page + le jeu dans `site/public/` ;
3. il publie `site/public/` sur **https://oswels-trap.netlify.app** (environ 1 minute).

Donc : **un changement dans le jeu met aussi à jour la version navigateur**, et un changement
dans `site/page/` met à jour la page. Rien à glisser à la main.
Un envoi qui ne touche **que** le site (`site/…`, `netlify.toml`) ne relance pas la fabrication
des versions PC et Android sur GitHub (réglage `paths-ignore` dans `.github/workflows/versions.yml`).

### Relier Netlify au dépôt (une seule fois)

Sur Netlify, ouvre le site **oswels-trap** → *Site configuration* → *Build & deploy* →
*Continuous deployment* → **Link repository** → GitHub → `oswel-offiiel/oswels-trap` → branche `main`.
Les réglages (commande et dossier à publier) sont lus dans `netlify.toml` : laisse les champs tels quels
et valide. Le premier déploiement démarre tout seul.

## Les boutons de téléchargement suivent tout seuls les nouvelles versions

En ouvrant la page, `site/page/js/site.js` demande à GitHub la **dernière version publiée**
(onglet *Releases* du dépôt) et met à jour les liens, les tailles, le numéro de version et la date.
Si GitHub ne répond pas, les liens de la version 1.5.0 écrits dans la page restent valables.

Les fichiers doivent garder des noms reconnaissables (c'est déjà le cas avec la fabrication automatique) :

| Bouton | Le nom du fichier doit… |
|---|---|
| Windows, installateur | contenir `windows` et finir par `.exe` |
| Windows, portable | contenir `windows` et finir par `.zip` |
| Linux, AppImage | finir par `.AppImage` |
| Linux, Ubuntu/Debian | finir par `.deb` |
| Linux, Arch/CachyOS | finir par `.pacman` |
| Android | finir par `.apk` |

## Le jeu dans le navigateur (`/jouer/`) — iPhone, iPad, Mac…

- Sur iPhone : ouvrir **oswels-trap.netlify.app/jouer** dans **Safari** → bouton **Partager** →
  **Sur l'écran d'accueil**. Le jeu a son icône, s'ouvre en plein écran et marche ensuite sans internet
  (le jeu est gardé sur l'appareil par `sw.js` ; chaque voix est gardée la première fois qu'elle est jouée).
- Commandes : boutons tactiles ou manette Bluetooth (PS4, PS5, Xbox). Pas de vibrations sur iPhone.
- Sauvegarde : sur l'appareil. Sans ajout à l'écran d'accueil, Safari peut effacer les données d'un site
  qu'on n'a pas ouvert depuis plusieurs semaines.
- Réseau local : depuis le navigateur on ne peut pas héberger (il faut la version PC), mais un iPhone
  peut toujours servir de manette en scannant le QR code du PC.
- **À chaque nouvelle version du jeu, change `VERSION` dans `sw.js`** (règle habituelle) : c'est ce qui
  prévient les joueurs qui ont installé le jeu sur leur écran d'accueil qu'il y a du nouveau.

## Les fichiers

```
netlify.toml              (à la racine du dépôt) les réglages de Netlify
site/construire.sh        assemble le site dans site/public/ (lancé par Netlify)
site/page/index.html      la page (tous les textes sont ici)
site/page/css/style.css   l'apparence (couleurs du jeu dans :root, en haut)
site/page/js/site.js      dernière version depuis GitHub, appareil du visiteur, copier, partager, visionneuse
site/page/fonts/          les polices du jeu
site/page/img/            images du vrai jeu, icône, image de partage (partage.jpg)
site/page/video/          la bande-annonce en 720p
site/page/_headers        réglages Netlify : sécurité de la page, mise en cache, mise à jour du jeu (sw.js)
site/page/404.html        la page « introuvable » (« ENCORE ?! »)
site/public/              le site fabriqué (pas gardé dans le dépôt)
```

## Essayer sur ton PC avant d'envoyer

```bash
bash site/construire.sh
cd site/public && python3 -m http.server 8000
# puis ouvre http://localhost:8000 (et http://localhost:8000/jouer/)
```

## Modifier

- **Un texte de la page** : `site/page/index.html`.
- **Une image** : remplace le fichier dans `site/page/img/` en gardant le même nom (16:9 conseillé).
- **La vidéo** : remplace `site/page/video/bande-annonce.mp4` (MP4 H.264, idéalement moins de 10 Mo).
- **L'adresse du site** (si elle change) : remplace `oswels-trap.netlify.app` dans `site/page/index.html`
  (lignes `og:` et `twitter:`, plus les explications « jouer ») — c'est ce qui donne la belle image
  quand on partage le lien sur WhatsApp ou Facebook.
