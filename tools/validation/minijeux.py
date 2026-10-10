#!/usr/bin/env python3
# =====================================================================
#  OSWEL'S TRAP — VÉRIFIE LES MINI-JEUX DE LA SOIRÉE OSWEL (version 1.4)
#
#  Fait jouer chaque mini-jeu par des bots, SANS affichage (très rapide),
#  dans le vrai moteur du jeu : 4 bots « Normal », 4 niveaux mélangés,
#  puis un duel à 2. Une partie est validée si elle se termine (toutes les
#  manches jouées), sans erreur JavaScript, et avant la limite de temps.
#
#  Utilisation (depuis le dossier du jeu) :
#     python3 tools/validation/minijeux.py                 tous les mini-jeux, 2 parties par réglage
#     python3 tools/validation/minijeux.py boum train 5    Boum ! et le Train, 5 parties par réglage
#  Résultat à l'écran et dans tools/validation/rapport_minijeux.txt
# =====================================================================
import asyncio, functools, json, os, sys, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SETUPS = [('4 bots Normal', ['normal'] * 4), ('niveaux mélangés', ['facile', 'normal', 'difficile', 'chaos']), ('duel à 2', ['normal', 'normal'])]

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

# le même code que dans le jeu : on lance la partie sans affichage et on la simule jusqu'au bout
JS = """([game, N, levels]) => {
  const out = [];
  const cols = [0xe8473a, 0x3d8bff, 0x34c26b, 0xf2c230];
  for (let k = 0; k < N; k++) {
    const specs = levels.map((lv, i) => ({ name: 'Bot ' + (i + 1) + ' (' + lv + ')', color: cols[i], human: false, level: lv }));
    let sum = null, steps = 0;
    OT.Arena.start(game, specs, { headless: true }, (s) => { sum = s; });
    const A = OT.Arena.match, lim = (A.def.maxRound || 240) * (A.rounds || 1) * 60 + 6000;
    while (!sum && steps < lim) { OT.Arena.sim(600); steps += 600; }
    out.push({ done: !!sum, secs: Math.round(steps / 60), rows: sum ? sum.rows.map((r) => [r.name, r.place + 1, r.score]) : null });
    OT.Arena.stop(true);
  }
  return out; }"""

async def main():
    from playwright.async_api import async_playwright
    args = [a for a in sys.argv[1:]]
    n = int(args.pop()) if args and args[-1].isdigit() else 2
    httpd = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    report, bad = [], 0
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl'])
            pg = await b.new_page(viewport={'width': 640, 'height': 360})
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(f'http://127.0.0.1:{httpd.server_address[1]}/index.html')
            await pg.wait_for_timeout(2500)
            games = args or await pg.evaluate('() => OT.Arena.order')
            for g in games:
                name = await pg.evaluate('(g) => (OT.Arena.games[g] || {}).name || g', g)
                for label, levels in SETUPS:
                    errs.clear()
                    res = await pg.evaluate(JS, [g, n, levels])
                    for r in res:
                        ok = r['done'] and not errs
                        bad += 0 if ok else 1
                        rows = ' · '.join(f'{x[1]}. {x[0]} {x[2]}' for x in (r['rows'] or []))
                        line = f"{'OK ' if ok else 'ÉCHEC'} {name:24s} {label:17s} {r['secs']:4d} s   {rows}" + (f'   erreurs : {errs[:2]}' if errs else '')
                        print(line, flush=True); report.append(line)
            await b.close()
    finally:
        httpd.shutdown()
    report.append(f'\n{bad} échec(s)')
    print(report[-1])
    open(os.path.join(HERE, 'rapport_minijeux.txt'), 'w', encoding='utf-8').write('\n'.join(report) + '\n')

if __name__ == '__main__':
    asyncio.run(main())
