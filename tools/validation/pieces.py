#!/usr/bin/env python3
# =====================================================================
#  OSWEL'S TRAP — VÉRIFIER QUE TOUTES LES PIÈCES SONT ACCESSIBLES (version 1.5)
#
#  Pour chaque niveau, le vérificateur (robots/pieces.js) part du départ, de
#  chaque début de zone et de chaque point de reprise, explore tous les endroits
#  où l'on peut se tenir et essaie les actions d'un joueur (marcher, courir,
#  sauter haut / bas / loin / sur place, revenir en l'air) avec la vraie physique
#  du jeu et ses dangers. Une pièce est « accessible » si on peut la toucher
#  pendant une action qui se termine debout et EN VIE.
#
#  Utilisation :
#      python3 tools/validation/pieces.py              tous les niveaux (≈ 10 min)
#      python3 tools/validation/pieces.py 2-           le monde 2
#      python3 tools/validation/pieces.py 3-4 1-S      le 3-4 et le niveau secret du monde 1
#  (les objets de quête cachés dans les salles secrètes sont vérifiés avec la même règle)
#  Code de sortie : 0 si toutes les pièces sont accessibles, 1 sinon.
#  Le résultat est aussi écrit dans tools/validation/pieces.txt
# =====================================================================
import asyncio, json, sys, os, threading, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ROBOTS = os.path.join(HERE, 'robots')

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("Il manque Playwright :  pip install playwright  puis  python3 -m playwright install chromium")
    sys.exit(2)


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve():
    httpd = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]


def robots_js():
    files = ['w2bots.js', 'secbots.js'] + sorted(f for f in os.listdir(ROBOTS) if f.startswith('secbots_') and f.endswith('.js')) + ['pieces.js']
    # (w2bots.js a besoin de quelques outils de bot4.js : on charge aussi bot4.js)
    files = ['bot4.js'] + files
    return ''.join(open(os.path.join(ROBOTS, f), encoding='utf-8').read() + '\n' for f in files)


async def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    out = []

    def say(line):
        print(line, flush=True)
        out.append(line)

    httpd, port = serve()
    bad = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 320, 'height': 180})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(f'http://127.0.0.1:{port}/index.html')
        await pg.wait_for_timeout(2500)
        # un profil de test (navigateur temporaire : tes vraies sauvegardes ne sont pas touchées) ;
        # les quêtes à objets sont « en cours » pour que les objets de quête soient vérifiés aussi
        await pg.evaluate("() => { if (!OT.Save.active) OT.Save.create('Pieces', 'bleu'); if (OT.Quests) { const s = OT.Quests.state(OT.Save.active); OT.Quests.QUESTS.forEach((Q) => { if (Q.obj.type === 'items') s.q[Q.id] = { s: 'active', got: [] }; }); } }")
        await pg.evaluate(robots_js())
        levels = await pg.evaluate("() => Object.keys(OT.WORLD_DATA).flatMap((w) => OT.WORLD_DATA[w].levels.map((lv, i) => [ +w, i, lv && lv.secret ? w + '-S' : w + '-' + (i + 1) ]).filter((x) => OT.WORLD_DATA[x[0]].levels[x[1]]))")
        total = 0
        for w, i, name in levels:
            if args and not any(name == a or (a.endswith('-') and name.startswith(a)) for a in args):
                continue
            r = await pg.evaluate("""([w, i]) => {
              OT.UI.show(null);
              OT.Game.play('solo', i, [{ name: 'Pieces', skin: { color: 0x3d8bff, acc: 'aucun' }, collected: new Set() }], false, w);
              OT.UI.show(null);
              while (OT.UI.dialogOpen) OT.UI._closeDialog();
              const t0 = performance.now();
              const res = coinReach();
              res.ms = Math.round(performance.now() - t0);
              OT.Game.quit();
              return res;
            }""", [w, i])
            total += r['total']
            ko = r['ko']
            if ko:
                bad += len(ko)
                say(f"ÉCHEC {name:5s} {r['total'] - len(ko)}/{r['total']} pièces accessibles — inaccessibles : {json.dumps(ko, ensure_ascii=False)}  ({r['nodes']} endroits, {r['ms'] / 1000:.1f} s)")
            else:
                say(f"OK   {name:5s} {r['total']}/{r['total']} pièces accessibles  ({r['nodes']} endroits, {r['ms'] / 1000:.1f} s)")
        say(f"Bilan : {total - bad}/{total} pièces accessibles ; {bad} à corriger.")
        if errs:
            say('Erreurs JS : ' + ' | '.join(errs[:5]))
        await b.close()
    httpd.shutdown()
    with open(os.path.join(HERE, 'pieces.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(out) + '\n')
    sys.exit(1 if bad else 0)


asyncio.run(main())
