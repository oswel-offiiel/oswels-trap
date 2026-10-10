# Oswel's Trap — l'application Android

Le jeu complet dans une application Android (**Capacitor**) : il marche **sans internet**, en paysage et en plein
écran, l'écran reste allumé, les vibrations et les manettes Bluetooth marchent, et le bouton « retour » du
téléphone sert de Retour / Pause. Menu principal → **📶 Réseau local → Rejoindre** pour servir de manette à un PC
qui héberge une partie.

> Pour jouer en réseau local avec un téléphone, **l'application n'est pas obligatoire** : il suffit de scanner le
> QR code affiché par le PC (le navigateur du téléphone ouvre la manette).

## Installer l'application sur un téléphone
1. Copier le fichier `Oswels-Trap-1.5.0-android.apk` sur le téléphone (câble, Bluetooth, WhatsApp…).
2. L'ouvrir → Android demande d'autoriser « Installer des applications inconnues » pour cette source → Autoriser.
3. Installer, puis lancer « Oswel's Trap ».

## Fabriquer l'APK

### Méthode 1 — automatique, sur GitHub (rien à installer)
1. Mettre le projet sur GitHub (dépôt privé possible).
2. Onglet **Actions** → « Fabriquer les versions » → **Run workflow**.
3. Après ~10 min, télécharger `oswels-trap-android` (l'APK) en bas de la page du « run ».
   (Le même « run » fabrique aussi les versions Windows et Linux.)

### Méthode 2 — sur ton PC (CachyOS)
Il faut **Node.js**, **Java 21** et le **SDK Android** (le plus simple : installer **Android Studio**).

```bash
sudo pacman -S nodejs npm jdk21-openjdk
# Android Studio : yay -S android-studio   (ou le télécharger sur developer.android.com)
#   au premier lancement il installe le SDK ; ensuite :
export ANDROID_HOME=$HOME/Android/Sdk

cd mobile
npm install            # une fois
npm run apk            # copie le jeu dans www/, met à jour le projet Android, fabrique l'APK
# → mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Ou bien `npm run android` puis `npm run ouvrir` : Android Studio s'ouvre sur le projet → bouton ▶ pour l'installer
directement sur un téléphone branché (mode développeur activé).

## Ce qu'il y a dans ce dossier
```
package.json            les commandes (npm run apk…) et Capacitor
capacitor.config.json   nom, identifiant (officiel.oswel.trap), réglages (réseau local en http autorisé)
www/                    le jeu (copié par ../bureau/preparer.js — ne pas modifier ici)
android/                le projet Android (Android Studio). Réglages déjà faits : paysage, plein écran,
                        écran allumé, vibrations, icônes, écran de lancement (voir MainActivity.java, AndroidManifest.xml)
```
Version de l'application : `android/app/build.gradle` (versionCode 15, versionName 1.5.0).
