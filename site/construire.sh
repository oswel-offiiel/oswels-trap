#!/bin/bash
# =====================================================================
#  OSWEL'S TRAP — fabrication du site oswels-trap.netlify.app
#  Netlify lance ce script tout seul à chaque envoi (push) sur GitHub
#  (réglage dans netlify.toml, à la racine du dépôt).
#
#  Il assemble, dans site/public/ :
#    - la page de téléchargement (site/page/)
#    - le jeu complet, jouable dans le navigateur (jouer/), copié depuis
#      ce même dépôt avec le même outil que la version PC et Android
#      (bureau/preparer.js) : la version navigateur est donc TOUJOURS
#      la même que le reste du jeu, il n'y a rien à recopier à la main.
#
#  Pour l'essayer sur ton PC :
#    bash site/construire.sh && cd site/public && python3 -m http.server 8000
# =====================================================================
set -e
cd "$(dirname "$0")/.."                 # on se place à la racine du dépôt
SORTIE="$PWD/site/public"

# 1) on repart d'un dossier vide
rm -rf "$SORTIE"
mkdir -p "$SORTIE"

# 2) la page de téléchargement
cp -r site/page/. "$SORTIE/"

# 3) le jeu dans le navigateur (sans les outils, le serveur, les versions PC / Android, ni le site)
node bureau/preparer.js "$SORTIE/jouer"
rm -f "$SORTIE/jouer/LISEZMOI.md"

echo "Site prêt dans site/public : $(find "$SORTIE" -type f | wc -l) fichiers, $(du -sh "$SORTIE" | cut -f1)."
