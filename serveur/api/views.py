"""
L'API du jeu. Tout est en JSON. Aucune donnée personnelle n'est demandée :
juste le pseudo choisi dans le jeu, le temps et le nombre de chutes.
"""
import hashlib
import json
import math
import secrets

from django.core.cache import cache
from django.db.models import Min
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import Bug, Save, Score

WORLDS = 5           # mondes 1 à 5
LEVELS = 10          # 10 niveaux par monde (0 à 9)
CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'   # sans 0/O ni 1/I/L : faciles à recopier
MAX_SAVE = 64 * 1024


def err(msg, status=400):
    return JsonResponse({'error': msg}, status=status)


def client_ip(request):
    fwd = request.META.get('HTTP_X_FORWARDED_FOR', '')
    return (fwd.split(',')[0].strip() if fwd else request.META.get('REMOTE_ADDR', '')) or '?'


def ip_hash(request):
    return hashlib.sha256(client_ip(request).encode()).hexdigest()[:16]


def limited(request, kind, per_minute):
    """Vrai si cette adresse a déjà trop envoyé de choses cette minute (anti-spam)."""
    key = f'rl:{kind}:{ip_hash(request)}'
    n = cache.get(key, 0)
    if n >= per_minute:
        return True
    cache.set(key, n + 1, 60)
    return False


def body(request):
    try:
        data = json.loads(request.body.decode('utf-8') or '{}')
    except (ValueError, UnicodeDecodeError):
        return None
    return data if isinstance(data, dict) else None


def clean_name(s):
    s = ' '.join(str(s or '').split())[:40]
    return ''.join(ch for ch in s if ch.isprintable())


def ping(request):
    return JsonResponse({'ok': True, 'name': "Serveur Oswel's Trap", 'scores': Score.objects.count()})


@csrf_exempt
def scores(request):
    if request.method != 'POST':
        return err('Utilise POST pour envoyer un temps.', 405)
    if limited(request, 'score', 30):
        return err('Trop d\'envois : réessaie dans une minute.', 429)
    d = body(request)
    if d is None:
        return err('JSON invalide.')
    try:
        world, level = int(d.get('world')), int(d.get('level'))
        t, deaths = float(d.get('time')), int(d.get('deaths', 0))
    except (TypeError, ValueError):
        return err('Champs manquants ou invalides.')
    name = clean_name(d.get('name'))
    mode = d.get('mode') if d.get('mode') in ('solo', 'coop', 'versus') else 'solo'
    if not (1 <= world <= WORLDS and 0 <= level < LEVELS):
        return err('Niveau inconnu.')
    if not name:
        return err('Il faut un nom.')
    if not math.isfinite(t) or not (2.0 <= t <= 3600.0) or not (0 <= deaths <= 100000):
        return err('Temps invalide.')
    try:
        version = max(0, min(999, int(d.get('v', 0) or 0)))
    except (TypeError, ValueError):
        version = 0
    s = Score.objects.create(world=world, level=level, name=name, time=round(t, 2), deaths=deaths, mode=mode, version=version, ip_hash=ip_hash(request))
    better = Score.objects.filter(world=world, level=level, version=version, time__lt=s.time).values('name').distinct().count()
    return JsonResponse({'ok': True, 'rank': better + 1}, status=201)


def top(request):
    try:
        world, level = int(request.GET.get('world')), int(request.GET.get('level'))
    except (TypeError, ValueError):
        return err('Paramètres world et level obligatoires.')
    if not (1 <= world <= WORLDS and 0 <= level < LEVELS):
        return err('Niveau inconnu.')
    # les temps d'une ancienne version d'un niveau (plus court) ne sont pas mélangés aux nouveaux
    try:
        version = int(request.GET.get('v', 0) or 0)
    except (TypeError, ValueError):
        version = 0
    # le meilleur temps de chaque joueur, les 10 premiers
    best = (Score.objects.filter(world=world, level=level, version=version).values('name')
            .annotate(best=Min('time')).order_by('best')[:10])
    out = []
    for b in best:
        s = Score.objects.filter(world=world, level=level, version=version, name=b['name'], time=b['best']).order_by('deaths', 'created').first()
        out.append({'name': s.name, 'time': s.time, 'deaths': s.deaths, 'mode': s.mode})
    return JsonResponse({'world': world, 'level': level, 'version': version, 'scores': out})


@csrf_exempt
def bugs(request):
    if request.method != 'POST':
        return err('Utilise POST pour signaler un bug.', 405)
    if limited(request, 'bug', 5):
        return err('Trop de signalements : réessaie dans une minute.', 429)
    d = body(request)
    if d is None:
        return err('JSON invalide.')
    text = str(d.get('text') or '').strip()[:4000]
    if len(text) < 3:
        return err('Décris le bug en quelques mots.')
    info = d.get('info')
    info = json.dumps(info, ensure_ascii=False)[:4000] if not isinstance(info, str) else info[:4000]
    Bug.objects.create(text=text, info=info)
    return JsonResponse({'ok': True}, status=201)


@csrf_exempt
def saves(request):
    if request.method != 'POST':
        return err('Utilise POST pour envoyer une sauvegarde.', 405)
    if limited(request, 'save', 10):
        return err('Trop d\'envois : réessaie dans une minute.', 429)
    d = body(request)
    if d is None:
        return err('JSON invalide.')
    data = str(d.get('data') or '')
    if not data.startswith('OT4:') or len(data) > MAX_SAVE:
        return err('Ce n\'est pas une sauvegarde Oswel\'s Trap.')
    for _ in range(20):
        code = ''.join(secrets.choice(CODE_CHARS) for _ in range(6))
        if not Save.objects.filter(code=code).exists():
            break
    Save.objects.create(code=code, data=data)
    return JsonResponse({'ok': True, 'code': code}, status=201)


def save_detail(request, code):
    if limited(request, 'pull', 20):
        return err('Trop d\'essais : réessaie dans une minute.', 429)
    s = Save.objects.filter(code=code.strip().upper()).first()
    if not s:
        return err('Code inconnu. Vérifie les 6 caractères.', 404)
    s.used += 1
    s.save(update_fields=['used'])
    return JsonResponse({'ok': True, 'data': s.data})
