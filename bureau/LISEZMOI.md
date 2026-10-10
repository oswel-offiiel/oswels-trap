# Oswel's Trap — la version PC (Windows et Linux)

Le jeu web emballé avec **Electron** (Chromium + Node.js) : une vraie application, qui marche **sans internet**,
avec les manettes PS4 (vibrations, mode direct avec la lumière) et le **réseau local** (le PC héberge, les
téléphones et les autres PC deviennent des manettes).

## Installer (pour les joueurs)

| Système | Fichier | Comment |
|---|---|---|
| Windows 10 / 11 | `Oswels-Trap-1.5.0-windows-installation.exe` | double-clic → Suivant → Installer. Si Windows affiche « Windows a protégé votre ordinateur » : **Informations complémentaires → Exécuter quand même** (le jeu n'est pas signé par un certificat payant). |
| Windows (sans installer) | `Oswels-Trap-1.5.0-windows-x64.zip` | dézipper, lancer `Oswel's Trap.exe` |
| CachyOS / Arch | `Oswels-Trap-1.5.0-linux-x64.pacman` | `sudo pacman -U Oswels-Trap-1.5.0-linux-x64.pacman` puis « Oswel's Trap » dans le menu des applications (ou `oswels-trap` dans un terminal) |
| Tout Linux | `Oswels-Trap-1.5.0-linux-x86_64.AppImage` | `chmod +x Oswels-Trap-1.5.0-linux-x86_64.AppImage` puis double-clic |
| Ubuntu / Debian / Mint | `Oswels-Trap-1.5.0-linux-amd64.deb` | `sudo apt install ./Oswels-Trap-1.5.0-linux-amd64.deb` |

Les sauvegardes sont gardées quand on installe une nouvelle version.
Touches de la version PC : **F11** plein écran · **F12** console (pour chercher un bug) · bouton **✕ Quitter** sur l'accueil.

### Le pare-feu (réseau local)
- **Windows** : au premier « Héberger », Windows demande l'autorisation → cocher **Réseaux privés** → **Autoriser l'accès**.
  Si on a cliqué « Annuler » par erreur : Paramètres → Pare-feu → « Autoriser une application » → cocher Oswel's Trap.
- **Linux** : si un pare-feu est actif (ufw, firewalld), ouvrir le port **47800/tcp**
  (`sudo ufw allow 47800/tcp` ou `sudo firewall-cmd --add-port=47800/tcp`).
- La vidéo vers les manettes (📺) utilise WebRTC : elle passe sur un Wi-Fi normal et sur un partage de connexion ;
  certains Wi-Fi d'école bloquent les appareils entre eux (dans ce cas, utiliser le partage de connexion d'un téléphone).

## Fabriquer les fichiers (pour Oswel)

Il faut **Node.js 20 ou plus** (`sudo pacman -S nodejs npm` sur CachyOS).

```bash
cd bureau
npm install                 # une fois (télécharge Electron)
npm start                   # lancer le jeu en version PC sans rien fabriquer (pour tester)
npm run linux               # → dist/ : AppImage, .pacman, .deb, .tar.gz   (pacman demande bsdtar : sudo pacman -S libarchive)
npm run windows             # → dist/ : installeur .exe + .zip (depuis Linux, il faut aussi « wine » : sudo pacman -S wine)
npm run tout                # les deux
```

`npm run …` copie d'abord le jeu (le dossier parent) dans `bureau/jeu/` avec `preparer.js` : on modifie toujours le
jeu à la racine du projet, jamais dans `bureau/jeu/`.

Sur GitHub, le fichier `.github/workflows/versions.yml` fabrique tout automatiquement (Windows, Linux et Android).

## Comment c'est construit

```
main.js          la fenêtre, le protocole oswel://jeu/ (adresse fixe = sauvegardes gardées), les autorisations
                 (manettes PS4 en WebHID, capture de la fenêtre pour la vidéo), le démarrage du serveur réseau local
preload.js       window.OTDesktop : ce que la page du jeu a le droit de demander (héberger, plein écran, quitter…)
serveur-lan.js   le serveur du réseau local : les fichiers (page manette) + le relais WebSocket (port 47800)
                 → peut aussi tourner seul : node serveur-lan.js  puis http://localhost:47800/index.html?hote=1
preparer.js      copie le jeu dans bureau/jeu (ou mobile/www pour l'application Android)
ressources/      icônes (icone.png, icone.ico) et apres-emballage.js (met l'icône dans le .exe, sans Wine)
```
