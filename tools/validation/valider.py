#!/usr/bin/env python3
# =====================================================================
#  OSWEL'S TRAP — VALIDATION AUTOMATIQUE DES NIVEAUX (version 1.3)
#
#  Plan → construction → simulation → test du chemin → validation.
#  Un robot joue chaque niveau dans le VRAI moteur du jeu (navigateur
#  sans fenêtre), avec les mêmes commandes qu'un joueur (gauche, droite,
#  saut, courir, action) : il n'a pas le droit de tricher (pas de
#  téléportation, pas de vitesse en plus). Un niveau est validé quand le
#  robot atteint la sortie, en solo puis en coop.
#
#  Installation (une seule fois) :
#      pip install playwright
#      python3 -m playwright install chromium
#
#  Utilisation (depuis n'importe où) :
#      python3 tools/validation/valider.py              tous les niveaux (≈ 1 h 30)
#      python3 tools/validation/valider.py 2-           tout le monde 2
#      python3 tools/validation/valider.py 3-4 5-10     le 3-4 et le boss du monde 5
#      python3 tools/validation/valider.py 1-S          le niveau secret du monde 1 (version 1.5)
#      python3 tools/validation/valider.py 1-2 solo     seulement en solo
#      python3 tools/validation/valider.py --section 1 '[{"name": "Essai", "goal": "…", "secs": [["saws", {}], ["rest", {}]]}]'
#            → teste des sections SEULES dans un petit niveau du monde 1
#              (pratique avant d'ajouter une zone dans js/levelplans.js)
#
#  Le résultat s'affiche et est aussi écrit dans tools/validation/rapport.txt.
#  Code de sortie : 0 si tout est validé, 1 sinon.
# =====================================================================
import asyncio, json, sys, os, threading, functools, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ROBOTS = os.path.join(HERE, 'robots')
FILES = ['autouse.js', 'bot3.js', 'bot4.js', 'bossbot.js', 'levels.js', 'w2bots.js', 'w345bots.js', 'secbots.js']

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("Il manque Playwright :  pip install playwright  puis  python3 -m playwright install chromium")
    sys.exit(2)


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve():
    handler = functools.partial(Quiet, directory=ROOT)
    httpd = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]


def robots_js():
    # version 1.5 : les robots des nouveaux pièges / mécanismes (secbots_*.js) sont chargés après secbots.js
    extra = sorted(f for f in os.listdir(ROBOTS) if f.startswith('secbots_') and f.endswith('.js'))
    js = ''.join(open(os.path.join(ROBOTS, f), encoding='utf-8').read() + '\n' for f in FILES + extra)
    # zone 1 = robot d'origine du niveau ; ensuite, le robot des sections (avec plus de temps)
    js += "\nwindow.runLevelExt = (idx, mode, pols, frames) => runLevel(idx, mode, pols.map((pp) => extBot(pp)), (frames || 6000) + 24000); true;\n"
    return js


SECTION_LEVEL = """([zones, W]) => {
  const L = OT.mkLevel(8, 13); L.rect(1, 0, 6, 0, '#'); L.start(2, 1); L.door(5, 1);
  const def = { title: 'Validation', par: 60, goal: 'Test', lesson: '', tone: 'calme', fragment: '', dialogs: {}, teach: { title: '', text: '', q: { question: '', options: ['a','b','c','d'], answer: 0, explain: '' } }, build: L };
  OT.Sections.extend(def, { h: 13, zones });
  OT.WORLD_DATA[W].levels[20] = def;   // (index 20 : le 10 est le niveau secret du monde)
  return { w: L.w, h: L.h, secs: L.secs.map(s => s.k + '@' + s.x0) };
}"""


async def main():
    args = sys.argv[1:]
    out = []

    def say(line):
        print(line, flush=True)
        out.append(line)

    httpd, port = serve()
    t0 = time.time()
    failed = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader"])
        pg = await b.new_page(viewport={"width": 320, "height": 180})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{port}/index.html")
        await pg.wait_for_timeout(2500)
        # un profil de test dans un navigateur temporaire (tes vraies sauvegardes ne sont pas touchées)
        await pg.evaluate("() => { if (OT.Splash && OT.Splash.active) OT.Splash.skip(); if (!OT.Save.active) OT.Save.create('Robot', 'bleu'); }")
        await pg.evaluate(robots_js())
        say(f"OSWEL'S TRAP {await pg.evaluate('() => OT.VERSION')} — validation des niveaux")

        if args and args[0] == '--section':
            W = int(args[1]); zones = json.loads(args[2])
            info = await pg.evaluate(SECTION_LEVEL, [zones, W])
            say(f"niveau d'essai {info['w']} × {info['h']} : {' '.join(info['secs'])}")
            for mode in ['solo', 'coop']:
                r = await pg.evaluate(f"() => {{ window.TEST_WORLD = {W}; const res = runLevel(20, '{mode}', [extBot(null)], 9000); res.last = OT.Game._dbg.players.map(q => [+q.x.toFixed(1), +q.y.toFixed(1)]); return res; }}")
                ok = bool(r['fini']); failed += 0 if ok else 1
                say(f"{'VALIDÉ ' if ok else 'ÉCHEC  '} {mode:5s} chutes={r['morts']:3d} temps={r['temps_s']:6.1f}s {json.dumps(r['morts_detail'][:4], ensure_ascii=False)}{'' if ok else ' arrêt=' + str(r['last'])}")
        else:
            tests = json.load(open(os.path.join(ROBOTS, 'tests.json'), encoding='utf-8'))
            modes = [a for a in args if a in ('solo', 'coop')]
            only = [a for a in args if a not in ('solo', 'coop')]
            for name, w, expr in tests:
                lv, mode = name.split()
                if only and not any(lv.startswith(o) if o.endswith('-') else lv == o for o in only): continue
                if modes and mode not in modes: continue
                e2 = expr.replace('runLevel(', 'runLevelExt(')
                r = await pg.evaluate(f"() => {{ window.TEST_WORLD = {w}; const r = {e2}; const R = OT.Game._dbg.R; r.zone = R.zone + '/' + R.zones; r.W = R.W; r.last = OT.Game._dbg.players.map(q => [+q.x.toFixed(1), +q.y.toFixed(1)]); return r; }}")
                ok = bool(r['fini']); failed += 0 if ok else 1
                say(f"{'VALIDÉ ' if ok else 'ÉCHEC  '} {name:10s} longueur={r['W']:3d} zone={r['zone']:5s} chutes={r['morts']:3d} temps={r['temps_s']:6.1f}s pièces={r['pieces']:7s}"
                    + ('' if ok else f" arrêt={r['last']} {json.dumps(r['morts_detail'][:3], ensure_ascii=False)}"))
        if errs:
            say('Erreurs JavaScript : ' + ' | '.join(errs[:5]))
            failed += 1
        await b.close()
    httpd.shutdown()
    say(f"Terminé en {int(time.time() - t0)} s — {'TOUT EST VALIDÉ ✓' if not failed else str(failed) + ' problème(s)'}")
    with open(os.path.join(HERE, 'rapport.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(out) + '\n')
    sys.exit(0 if not failed else 1)


asyncio.run(main())
