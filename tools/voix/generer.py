#!/usr/bin/env python3
# =====================================================================
#  OSWEL'S TRAP — FABRIQUE LES VOIX DES PERSONNAGES (version 1.4)
#
#  1. lit TOUTES les répliques du jeu (il ouvre le jeu dans un navigateur
#     sans fenêtre et demande OT.Dialogue.collectAll()) ;
#  2. pour chaque réplique qui n'a pas encore de fichier, la fait lire par
#     une voix de synthèse française (Mimic 3, hors ligne) ;
#  3. donne à chaque personnage SA voix : hauteur, vitesse, effets
#     (écho, voix métallique, voix « glitchée » du Bug, plusieurs voix
#     mélangées pour la Rumeur…) — réglages dans tools/voix/voix.json ;
#  4. range les fichiers dans audio/fr/characters/<personnage>/<code>.mp3 ;
#  5. écrit js/voices.js : la liste des fichiers qui existent (le jeu ne
#     demande jamais un fichier absent).
#
#  Tes propres enregistrements : remplace simplement un .mp3 par le tien
#  (même nom). Ce script ne l'écrasera pas (sauf avec --force).
#
#  Installation (une fois) : voir tools/voix/LISEZMOI.md
#  Utilisation :
#     python3 tools/voix/generer.py                    les voix qui manquent
#     python3 tools/voix/generer.py --only tony,nexa   seulement ces personnages
#     python3 tools/voix/generer.py --force            tout refaire
#     python3 tools/voix/generer.py --manifest         seulement réécrire js/voices.js
#     python3 tools/voix/generer.py --prune            supprimer les voix des répliques modifiées
#     python3 tools/voix/generer.py --check            vérifier qu'on comprend les voix (reconnaissance vocale)
# =====================================================================
import argparse, json, os, re, subprocess, sys, tempfile, threading, functools, wave, random, math, shutil
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'audio', 'fr', 'characters')
CFG = json.load(open(os.path.join(HERE, 'voix.json'), encoding='utf-8'))

# ---------------------------------------------------------------------
# 1. Lire les répliques dans le jeu
# ---------------------------------------------------------------------
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

def collect_lines():
    from playwright.sync_api import sync_playwright
    httpd = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'])
            pg = b.new_page()
            pg.goto(f'http://127.0.0.1:{httpd.server_address[1]}/index.html')
            pg.wait_for_timeout(2500)
            lines = pg.evaluate('() => OT.Dialogue.collectAll()')
            b.close()
    finally:
        httpd.shutdown()
    return lines

# ---------------------------------------------------------------------
# 2. Préparer le texte pour la voix (le sous-titre, lui, ne change pas)
# ---------------------------------------------------------------------
ACRONYMS = {'HTML': 'H T M L', 'CSS': 'C S S', 'API': 'A P I', 'IP': 'I P', 'SMS': 'S M S', 'IA': 'I A', 'PS4': 'P S quatre', 'ID': 'I D'}
REPLACE = [
    (r'«|»|“|”|"', ''), (r'…', '...'), (r'[◇⚠✓★→←↓↑•·]', ' '), (r'\s+—\s+', ', '), (r'—', ', '),
    (r'\bpH\b', 'pé ache'), (r'x²', 'x au carré'), (r'\b2x\b', 'deux x'),
    (r'</([a-z]+)>', r'slash \1'), (r'<([a-z]+)>', r'\1'), (r'\bul\b', 'u l'),
    (r'construirePont\(\)', 'construire pont'), (r'construireEscalier\(\)', 'construire escalier'),
    (r'mur\.solide = false', 'mur point solide égal faux'),
    (r'www\.osweI\.cm', 'w w w point o s w e i majuscule point c m'), (r'www\.oswel\.cm', 'w w w point oswel point c m'),
    (r'oswel\.cm/ancien', 'oswel point c m slash ancien'), (r'oswel\.cm/nouveau', 'oswel point c m slash nouveau'),
    (r'noyau\.exe\.zip', 'noyau point exe point zip'), (r'noyau\.exe', 'noyau point exe'),
    (r'192\.168\.1\.7', 'cent quatre-vingt-douze, point cent soixante-huit, point un, point sept'),
    (r'192\.168\.0\.1', 'cent quatre-vingt-douze, point cent soixante-huit, point zéro, point un'),
    (r'NON\(NON\(vrai\)\)', 'non de non de vrai'), (r'5 >= 5', 'cinq supérieur ou égal à cinq'), (r'>=', 'supérieur ou égal'),
    (r'2 > 3', 'deux supérieur à trois'), (r'\b1/6\b', 'un sixième'), (r'\b1/2\b', 'un demi'), (r'\b3 sur 6\b', 'trois sur six'),
    (r'100 000', 'cent mille'), (r'80 000', 'quatre-vingt mille'), (r'20 000', 'vingt mille'),
    (r'\b123456\b', 'un deux trois quatre cinq six'), (r'\b1234\b', 'un deux trois quatre'),
    (r'4,8', 'quatre virgule huit'), (r'N°\s*', 'numéro '), (r'\bB12\b', 'B douze'),
    (r'\bOSWEL\b', 'Oswel'), (r'\bOswel\b', 'Ozwel'), (r'\bNEXA\b', 'Nexa'), (r'\bMEKA\b', 'Méka'), (r'\bBYTE\b', 'Baïte'),
    (r'\bWin Black\b', 'Winne Blaque'), (r'\bBlack\b', 'Blaque'), (r'\bGod Love\b', 'Gode Love'), (r'\bLady Annee\b', 'Lédi Anné'),
    (r'\bFrancheska\b', 'Franchesca'), (r'\bTsague\b', 'Tsagué'), (r'\bThe Core\b', 'Ze Core'),
    (r'\bJavaScript\b', 'Java Script'), (r'\bgit commit\b', 'guite commite'), (r'\bGit\b', 'Guite'), (r'\bcommits?\b', 'commite'),
    (r'\b[Bb]ugs?\b', lambda m: 'Beug' if m.group(0)[0] == 'B' else 'beug'), (r'\blogs\b', 'logues'), (r'\bcloud\b', 'claoude'),
    (r'\bdesign thinking\b', 'dizaïne sinkingue'), (r'\bdebugging\b', 'débeuguingue'), (r'\bdebug\b', 'débeugue'),
    (r'\bopen source\b', 'opène source'), (r'\bOpen source\b', 'Opène source'), (r'\bportfolio\b', 'portfolio'),
    (r'\bGG\b', 'gé gé'), (r'\bOK\b', 'oké'), (r'\bEaster egg\b', 'Isteur ègue'), (r'\bfake news\b', 'fèque niouze'), (r'\bFake news\b', 'Fèque niouze'),
    (r'\bcheckpoint\b', 'tchèque pointe'), (r'\bCheckpoint\b', 'Tchèque pointe'), (r'\bturbo\b', 'turbo'),
]
def tts_text(text):
    t = text
    for k, v in ACRONYMS.items():
        t = re.sub(r'\b' + k + r'\b', v, t)
    for pat, rep in REPLACE:
        t = re.sub(pat, rep, t)
    # les mots écrits en MAJUSCULES (cris, panneaux) sont lus normalement (pas épelés)
    t = re.sub(r"\b([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ'’]{1,})\b", lambda m: m.group(1).lower(), t)
    t = re.sub(r'\s+', ' ', t).strip()
    if not re.search(r'[.!?…]$', t):
        t += '.'
    return t

# ---------------------------------------------------------------------
# 2 bis. Des voix PLUS HUMAINES (version 1.5) : l'émotion de la réplique change le débit et l'intonation
#   - un cri, une surprise, la panique (« Attends... IL Y A UN PIÈGE ! ») : un peu plus vite, plus d'intonation ;
#   - une hésitation, une réflexion (« OK... réfléchissons. ») : plus lentement (les « ... » font des pauses) ;
#   - une question : une intonation un peu plus vivante ;
#   - une longue explication (un indice) : un débit posé et clair.
#   La VOIX du personnage ne change pas (même hauteur, même timbre, mêmes effets) : seulement sa façon de dire.
#   Les personnages calmes (Tony, NEXA, la Machine, le narrateur…) restent posés même quand ils s'exclament :
#   réglage « calme » dans voix.json (0 = aucune variation, 1 = variations complètes ; 1 par défaut).
# ---------------------------------------------------------------------
def expressif(text, prof):
    t = text or ''
    k = float(prof.get('calme', 1.0))
    mots = len(t.split())
    # un mot en MAJUSCULES ne compte comme un cri que dans une phrase qui crie déjà (« IL Y A UN PIÈGE ! »),
    # pas dans un nom ou un panneau (« la SORTIE », « NEXA »)
    cri = t.count('!') + (2 if '?!' in t or '!?' in t else 0) + (1 if '!' in t and re.search(r"\b[A-ZÀ-ÖØ-Þ]{4,}\b", t) else 0)
    hesite = ('…' in t or '...' in t)
    tempo, rng = 1.0, 1.0
    if cri:
        fort = min(1.0, 0.55 + 0.2 * cri) * (1.0 if mots <= 9 else 0.6)    # un cri court est plus vif qu'une longue phrase
        tempo *= 1 + 0.09 * fort * k
        rng *= 1 + 0.24 * fort * k
    if hesite:
        tempo *= 1 - 0.07 * (0.6 + 0.4 * k) * (0.5 if cri else 1.0)       # même les calmes ralentissent pour réfléchir
        rng *= 0.97
    if '?' in t and not cri:
        rng *= 1 + 0.08 * k
    if mots >= 22:
        tempo *= 0.97
    return max(0.86, min(1.14, tempo)), max(0.8, min(1.35, rng))

# ---------------------------------------------------------------------
# 3. Effets (ffmpeg)
# ---------------------------------------------------------------------
FX = {
    'echo_light': 'aecho=0.8:0.6:45:0.18',
    'reverb_small': 'aecho=0.8:0.55:60|110:0.16|0.09',
    'reverb': 'aecho=0.8:0.62:70|140:0.22|0.13',
    'hall': 'aecho=0.8:0.82:140|260:0.32|0.22',
    'stadium': 'aecho=0.8:0.7:180|340:0.25|0.16',
    'warm': 'equalizer=f=220:t=q:w=1.2:g=2,aecho=0.8:0.5:40:0.10',
    'metallic': 'flanger=delay=1.5:depth=1.8:regen=25:speed=0.45,aecho=0.8:0.6:30|70:0.3|0.2',
    'robot': 'flanger=delay=0:depth=0.8:regen=55:width=40:speed=9,acrusher=bits=11:mode=log:aa=1:mix=0.45',
    'robot_soft': 'flanger=delay=0:depth=0.6:regen=40:width=30:speed=6,acrusher=bits=12:mode=log:aa=1:mix=0.35',
    'digital': 'acrusher=bits=9:mode=log:aa=1:mix=0.55',
    'digital_soft': 'chorus=0.7:0.9:30:0.3:0.3:1.5,acrusher=bits=12:mode=log:aa=1:mix=0.3',
    'nexa': 'chorus=0.6:0.9:45|60:0.32|0.26:0.25|0.4:2|1.3,aecho=0.8:0.55:90:0.16',
    'glitch': 'acrusher=bits=8:mode=log:aa=1:mix=0.6,tremolo=f=11:d=0.22',
    'tremolo': 'tremolo=f=5:d=0.18',
    'bass': 'equalizer=f=110:t=q:w=1:g=5',
    # versions légères (on garde l'ambiance sans gêner la compréhension)
    'hall_light': 'aecho=0.8:0.7:110|210:0.2|0.12',
    'metal_light': 'flanger=delay=1:depth=1:regen=12:speed=0.3,aecho=0.8:0.6:25:0.18',
    'bass_light': 'equalizer=f=120:t=q:w=1:g=3',
    'nexa_light': 'chorus=0.7:0.9:35:0.22:0.3:1.6,aecho=0.8:0.5:80:0.12',
    'whisper_air': 'highpass=f=180,equalizer=f=5000:t=q:w=1:g=3',
    'stadium_light': 'aecho=0.8:0.5:120:0.12',
    # 1.5 : Tony parle « sous sa capuche » — un peu feutré, une résonance très courte et proche (reste bien compréhensible)
    'hood': 'lowpass=f=6800,equalizer=f=170:t=q:w=1:g=2,aecho=0.8:0.42:18|34:0.13|0.07',
}
def pitch_chain(base_f0, target_f0, tempo, formant_share):
    """Change la hauteur : une partie avec les formants (le timbre change : voix d'homme / de femme),
    le reste en gardant les formants (pour ne pas sonner comme un dessin animé)."""
    st = 12 * math.log2(target_f0 / base_f0)
    fs = st * formant_share
    rest = st - fs
    parts = []
    if abs(fs) > 0.05:
        parts.append(f'rubberband=pitch={2 ** (fs / 12):.5f}:formant=shifted')
    if abs(rest) > 0.05 or abs(tempo - 1) > 0.005:
        parts.append(f'rubberband=pitch={2 ** (rest / 12):.5f}:tempo={tempo:.4f}:formant=preserved')
    return parts

TRIM = 'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.08,areverse'
NORM = 'loudnorm=I=-17:TP=-1.5:LRA=11'

def stutter(path, rnd):
    """La voix « glitchée » du Bug : quelques petits morceaux répétés (comme un disque rayé), sans
    rendre la phrase incompréhensible."""
    with wave.open(path, 'rb') as w:
        params = w.getparams(); data = w.readframes(w.getnframes())
    fw = params.sampwidth * params.nchannels
    n = len(data) // fw
    if n < params.framerate:
        return
    sl = int(params.framerate * 0.065)
    cuts = sorted(rnd.sample(range(int(n * 0.15), int(n * 0.85)), k=min(3, max(1, n // params.framerate))))
    out, last = bytearray(), 0
    for c in cuts:
        out += data[last * fw:(c + sl) * fw]
        out += data[c * fw:(c + sl) * fw] * (1 + rnd.randrange(2))
        last = c + sl
    out += data[last * fw:]
    with wave.open(path, 'wb') as w:
        w.setparams(params); w.writeframes(bytes(out))

def process(wav, out_mp3, prof, layer_wav=None, world=False):
    """world=True : la hauteur et la vitesse sont déjà changées (WORLD, dans synth_mimic3.py) ;
    sinon on les change ici avec ffmpeg (rubberband, moins propre mais sans dépendance)."""
    bases = CFG['bases']
    b = bases[prof['base']]
    chain = [TRIM] + ([] if world else pitch_chain(b['f0'], prof['f0'], prof.get('tempo', 1), prof.get('formant', 0.55)))
    fx = [FX[f] for f in prof.get('fx', [])]
    if layer_wav:
        L = prof['layer']; lb = bases[L['base']]
        lchain = [TRIM] + ([] if world else pitch_chain(lb['f0'], L['f0'], prof.get('tempo', 1), 0.7))
        filt = (f"[0:a]{','.join(chain)}[a];[1:a]{','.join(lchain)},adelay={int(L.get('delay', 35))}|{int(L.get('delay', 35))},volume={L.get('vol', 0.75)}[b];"
                f"[a][b]amix=inputs=2:duration=longest:normalize=0" + (',' + ','.join(fx) if fx else '') + f",{NORM}")
        cmd = ['ffmpeg', '-v', 'error', '-y', '-i', wav, '-i', layer_wav, '-filter_complex', filt]
    else:
        filt = ','.join(chain + fx + [NORM])
        cmd = ['ffmpeg', '-v', 'error', '-y', '-i', wav, '-af', filt]
    cmd += ['-ar', '22050', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '32k', out_mp3]
    subprocess.run(cmd, check=True)

def duration(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True)
    try:
        return round(float(r.stdout.strip()), 2)
    except ValueError:
        return 0

# ---------------------------------------------------------------------
# 4. Le manifeste (js/voices.js)
# ---------------------------------------------------------------------
# (1.5) les durées déjà mesurées sont gardées (taille + date du fichier) : réécrire la liste reste rapide
#  même avec 4 500 voix (avant, chaque réécriture relançait ffprobe sur TOUS les fichiers).
DUREES = os.path.join(HERE, 'durees.json')
def write_manifest():
    files = {}
    try:
        cache = json.load(open(DUREES, encoding='utf-8'))
    except (OSError, ValueError):
        cache = {}
    if os.path.isdir(OUT):
        for ch in sorted(os.listdir(OUT)):
            d = os.path.join(OUT, ch)
            if not os.path.isdir(d):
                continue
            for f in sorted(os.listdir(d)):
                if f.endswith('.mp3'):
                    path = os.path.join(d, f); st = os.stat(path); k = f'{ch}/{f[:-4]}'
                    c = cache.get(k)
                    if not c or c[0] != st.st_size or abs(c[1] - st.st_mtime) > 0.01:
                        c = cache[k] = [st.st_size, st.st_mtime, duration(path)]
                    files[k] = c[2]
    cache = {k: v for k, v in cache.items() if k in files}
    try:
        json.dump(cache, open(DUREES, 'w', encoding='utf-8'), separators=(',', ':'))
    except OSError:
        pass
    js = ('/* Fabriqué par tools/voix/generer.py : la liste des voix enregistrées (personnage/code → durée en secondes).\n'
          '   Pour ajouter tes propres enregistrements : remplace un .mp3 dans audio/fr/characters/, puis relance\n'
          '   « python3 tools/voix/generer.py --manifest ». */\n'
          'window.OT = window.OT || {};\nOT.VOICE_FILES = ' + json.dumps(files, ensure_ascii=False, separators=(',', ':')) + ';\n')
    open(os.path.join(ROOT, 'js', 'voices.js'), 'w', encoding='utf-8').write(js)
    return files

# ---------------------------------------------------------------------
# 5. Programme principal
# ---------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mimic3-python', default=os.environ.get('MIMIC3_PYTHON', 'python3'), help='le python qui a mycroft-mimic3-tts')
    ap.add_argument('--voices', default=os.environ.get('MIMIC3_VOICES', os.path.expanduser('~/.local/share/mycroft/mimic3/voices')))
    ap.add_argument('--only', default='')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--manifest', action='store_true')
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--expressif', action='store_true', help='refaire (une fois) les voix fabriquées avant la 1.5 dont la réplique a une émotion')
    ap.add_argument('--lot', type=int, default=80, help='taille des lots (une coupure ne perd que le lot en cours)')
    ap.add_argument('--check', action='store_true', help='reconnaissance vocale (DeepSpeech) : rapport dans tools/voix/rapport.txt')
    ap.add_argument('--asr-python', default=os.environ.get('ASR_PYTHON', 'python3'))
    ap.add_argument('--asr-model', default=os.environ.get('ASR_MODEL', ''))
    ap.add_argument('--prune', action='store_true', help='supprime les voix fabriquées dont la réplique n\'existe plus (texte modifié)')
    a = ap.parse_args()

    if a.manifest:
        f = write_manifest(); print(len(f), 'voix dans js/voices.js'); return

    lines = collect_lines()
    if a.prune:
        keep = set(l['key'] for l in lines); n = 0
        for ch in (os.listdir(OUT) if os.path.isdir(OUT) else []):
            d = os.path.join(OUT, ch)
            for f in (os.listdir(d) if os.path.isdir(d) else []):
                if f.endswith('.mp3') and f'{ch}/{f[:-4]}' not in keep:
                    os.remove(os.path.join(d, f)); n += 1
        print(n, 'voix inutilisées supprimées')
    only = set(x for x in a.only.split(',') if x)
    chars = CFG['characters']
    # (1.5) les répliques déjà fabriquées AVEC l'expressivité (voir expressif()) : la liste est gardée ici
    exp_path = os.path.join(HERE, 'expressif.json')
    try:
        exp_done = set(json.load(open(exp_path, encoding='utf-8')))
    except (OSError, ValueError):
        exp_done = set()
    todo = []
    for ln in lines:
        ch = ln['character']
        if only and ch not in only:
            continue
        if ch not in chars:
            print('  (pas de voix définie pour', ch, ')'); continue
        out = os.path.join(OUT, ln['key'] + '.mp3')
        if os.path.exists(out) and not a.force:
            # --expressif : on refait une seule fois les voix fabriquées AVANT l'expressivité, si la réplique
            # a une émotion (cri, hésitation, question…). Les autres ne changeraient pas : on les garde.
            te, ra = expressif(ln['text'], chars[ch])
            if not (a.expressif and ln['key'] not in exp_done and (abs(te - 1) > 0.02 or abs(ra - 1) > 0.03)):
                continue
        todo.append(dict(ln, out=out))
    if a.limit:
        todo = todo[:a.limit]
    print(len(lines), 'répliques dans le jeu,', len(todo), 'voix à fabriquer')

    # WORLD (pyworld) disponible ? → changement de voix propre ; sinon ffmpeg/rubberband
    world = False
    if todo:
        r = subprocess.run([a.mimic3_python, os.path.join(HERE, 'synth_mimic3.py'), '--has-world'], capture_output=True, text=True)
        world = r.stdout.strip() == 'world'
        print('changement de voix :', 'WORLD (pyworld)' if world else 'ffmpeg rubberband (installe pyworld pour une meilleure qualité)')
    # 1.5 : on fabrique PAR LOTS (synthèse → mp3 → liste des voix à jour). Si la fabrication est coupée,
    # tout ce qui est déjà fini reste : relancer la même commande reprend là où elle s'était arrêtée.
    rnd = random.Random(1234)
    LOT = max(20, a.lot)
    fait = 0
    for debut in range(0, len(todo), LOT):
        lot = todo[debut:debut + LOT]
        tmp = tempfile.mkdtemp(prefix='voix_')
        jobs = []
        for k, ln in enumerate(lot):
            prof = dict(chars[ln['character']])
            # la façon de dire (débit, intonation) suit l'émotion de la réplique ; la voix reste la même
            te, ra = expressif(ln['text'], prof)
            prof['tempo'] = prof.get('tempo', 1.0) * te
            prof['range'] = prof.get('range', 1.0) * ra
            ln['prof'] = prof
            text = tts_text(ln.get('tts') or ln['text'])
            ln['wav'] = os.path.join(tmp, f'{k}.wav')
            j = {'voice': CFG['bases'][prof['base']]['voice'], 'text': text, 'out': ln['wav']}
            if world:
                j.update(f0=prof['f0'], range=prof['range'], formant=prof.get('timbre', 0.3), tempo=prof['tempo'])
            jobs.append(j)
            if 'layer' in prof:
                L = prof['layer']
                ln['lwav'] = os.path.join(tmp, f'{k}_l.wav')
                j = {'voice': CFG['bases'][L['base']]['voice'], 'text': text, 'out': ln['lwav']}
                if world:
                    j.update(f0=L['f0'], range=L.get('range', 0.8) * ra, formant=L.get('timbre', 0.4), tempo=prof['tempo'])
                jobs.append(j)
        # une voix à la fois (Mimic 3 charge chaque voix une seule fois par lot)
        jobs.sort(key=lambda j: j['voice'])
        jp = os.path.join(tmp, 'jobs.json'); json.dump(jobs, open(jp, 'w'), ensure_ascii=False)
        subprocess.run([a.mimic3_python, os.path.join(HERE, 'synth_mimic3.py'), a.voices, jp], check=True, stdout=subprocess.DEVNULL)
        for ln in lot:
            prof = ln['prof']
            os.makedirs(os.path.dirname(ln['out']), exist_ok=True)
            try:
                if 'glitch' in prof.get('fx', []):
                    stutter(ln['wav'], rnd)
                process(ln['wav'], ln['out'], prof, ln.get('lwav'), world)
            except Exception as e:   # une réplique ratée ne bloque pas les autres (le jeu affichera son sous-titre)
                print('  ratée :', ln['key'], e, flush=True)
        shutil.rmtree(tmp, ignore_errors=True)
        fait += len(lot)
        exp_done.update(ln['key'] for ln in lot)
        try:
            # (relire le fichier avant d'écrire : deux fabrications peuvent tourner en même temps)
            try:
                exp_done |= set(json.load(open(exp_path, encoding='utf-8')))
            except (OSError, ValueError):
                pass
            json.dump(sorted(exp_done), open(exp_path, 'w', encoding='utf-8'))
        except OSError:
            pass
        write_manifest()
        print(f'  {fait}/{len(todo)}', flush=True)
    files = write_manifest()
    print(len(files), 'voix au total dans js/voices.js')
    if a.check:
        check(todo or [dict(l, out=os.path.join(OUT, l['key'] + '.mp3')) for l in lines if not only or l['character'] in only], a)

def check(items, a):
    """Reconnaissance vocale : on compare ce qu'une machine comprend avec le texte (taux de mots retrouvés)."""
    if not a.asr_model:
        print('--check demande --asr-model (dossier du modèle DeepSpeech français)'); return
    lst = os.path.join(tempfile.gettempdir(), 'voix_check.json')
    json.dump([{'out': i['out'], 'text': i['text'], 'key': i['key']} for i in items if os.path.exists(i['out'])], open(lst, 'w'), ensure_ascii=False)
    subprocess.run([a.asr_python, os.path.join(HERE, 'verifier_asr.py'), a.asr_model, lst, os.path.join(HERE, 'rapport.txt')], check=False)

if __name__ == '__main__':
    main()
