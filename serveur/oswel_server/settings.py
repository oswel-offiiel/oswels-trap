"""
Réglages du serveur Oswel's Trap (classement, bugs, sauvegardes dans le nuage).

En production, on règle trois variables d'environnement (voir README.md) :
  OSWEL_SECRET_KEY   une longue phrase secrète au hasard
  OSWEL_DEBUG        0 (par défaut) ; 1 seulement sur ton ordinateur
  OSWEL_HOSTS        l'adresse du serveur, ex. « oswel.pythonanywhere.com »
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('OSWEL_SECRET_KEY', 'dev-seulement-change-moi-en-production')
DEBUG = os.environ.get('OSWEL_DEBUG', '0') == '1'
ALLOWED_HOSTS = [h.strip() for h in os.environ.get('OSWEL_HOSTS', 'localhost,127.0.0.1').split(',') if h.strip()]

# Origines autorisées à appeler l'API depuis un navigateur (CORS).
# « * » = tout le monde (le jeu peut être hébergé n'importe où : fichier, artifact, GitHub Pages…).
# Pour restreindre : OSWEL_ORIGINS="https://monjeu.github.io,https://autre.site"
CORS_ORIGINS = [o.strip() for o in os.environ.get('OSWEL_ORIGINS', '*').split(',') if o.strip()]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'api',
]

MIDDLEWARE = [
    'api.middleware.SimpleCors',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'oswel_server.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'oswel_server.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Petite mémoire pour limiter le nombre d'envois par minute (anti-spam)
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache', 'LOCATION': 'oswel'}}

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Douala'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'static'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Taille maximale d'une requête (une sauvegarde fait quelques Ko)
DATA_UPLOAD_MAX_MEMORY_SIZE = 256 * 1024

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
