# Serveur Oswel's Trap (facultatif)

Petit serveur Django qui ajoute au jeu :

- le **classement mondial** (meilleur temps de chaque joueur, par niveau, en mode normal) ;
- la réception des **bugs signalés** depuis le menu pause ;
- la **sauvegarde dans le nuage** : on envoie son profil, on reçoit un code à 6 caractères, on le tape sur
  un autre appareil.

Aucune donnée personnelle : seulement le pseudo choisi dans le jeu, le temps et le nombre de chutes.
Les adresses IP ne sont jamais enregistrées en clair (seulement une empreinte, pour l'anti-spam).

## Essayer sur ton ordinateur

```bash
cd serveur
pip install -r requirements.txt
python manage.py migrate
python manage.py test                 # 6 tests de l'API
set OSWEL_DEBUG=1                     # Windows (sur Linux/Mac : export OSWEL_DEBUG=1)
python manage.py runserver
```

Dans le jeu : **Options → En ligne → adresse du serveur** = `http://127.0.0.1:8000` → Enregistrer →
Tester la connexion.

Pour voir les scores, les bugs et les sauvegardes : `python manage.py createsuperuser`, puis
http://127.0.0.1:8000/admin/

## Le mettre en ligne gratuitement (PythonAnywhere)

1. Crée un compte gratuit sur https://www.pythonanywhere.com (ton adresse sera `TONPSEUDO.pythonanywhere.com`).
2. Onglet **Files** : envoie le dossier `serveur` (ou, dans une console **Bash** : `git clone` de ton dépôt).
3. Console **Bash** :
   ```bash
   cd serveur
   pip install --user -r requirements.txt
   python manage.py migrate
   python manage.py createsuperuser
   ```
4. Onglet **Web** → *Add a new web app* → *Manual configuration* → la même version de Python.
5. Dans la page Web :
   - **Source code** : `/home/TONPSEUDO/serveur`
   - **WSGI configuration file** : remplace tout le contenu par :
     ```python
     import os, sys
     path = '/home/TONPSEUDO/serveur'
     if path not in sys.path:
         sys.path.insert(0, path)
     os.environ['DJANGO_SETTINGS_MODULE'] = 'oswel_server.settings'
     os.environ['OSWEL_HOSTS'] = 'TONPSEUDO.pythonanywhere.com'
     os.environ['OSWEL_SECRET_KEY'] = 'une-longue-phrase-secrete-que-personne-ne-connait'
     from django.core.wsgi import get_wsgi_application
     application = get_wsgi_application()
     ```
   - **Static files** (pour la page admin) : URL `/static/` → dossier `/home/TONPSEUDO/serveur/static`,
     puis dans la console : `python manage.py collectstatic`
   - Active **Force HTTPS**.
6. Bouton **Reload**. Vérifie : https://TONPSEUDO.pythonanywhere.com/api/ping/ doit afficher `{"ok": true, …}`.
7. Dans le jeu : **Options → En ligne** → `https://TONPSEUDO.pythonanywhere.com` → Enregistrer → Tester.

Le jeu publié sur un site en `https://` ne peut appeler qu'un serveur en `https://` : c'est le cas de
PythonAnywhere.

## Réglages (variables d'environnement)

| Variable | Rôle | Par défaut |
|---|---|---|
| `OSWEL_SECRET_KEY` | clé secrète de Django (obligatoire en ligne) | une clé de test |
| `OSWEL_HOSTS` | adresse(s) du serveur, séparées par des virgules | `localhost,127.0.0.1` |
| `OSWEL_DEBUG` | `1` seulement sur ton ordinateur | `0` |
| `OSWEL_ORIGINS` | sites autorisés à appeler l'API (`*` = tous) | `*` |

## L'API

| Méthode | Adresse | Envoi | Réponse |
|---|---|---|---|
| GET | `/api/ping/` | – | `{ok, name, scores}` |
| POST | `/api/scores/` | `{world, level, name, time, deaths, mode}` | `{ok, rank}` |
| GET | `/api/scores/top/?world=1&level=0` | – | `{scores: [{name, time, deaths, mode}]}` (10 max) |
| POST | `/api/bugs/` | `{text, info}` | `{ok}` |
| POST | `/api/saves/` | `{data: "OT4:…"}` | `{ok, code}` |
| GET | `/api/saves/CODE/` | – | `{ok, data}` |

Anti-spam : 30 scores, 5 bugs, 10 sauvegardes et 20 récupérations par minute et par adresse.
