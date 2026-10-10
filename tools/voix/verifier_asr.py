#!/usr/bin/env python3
# =====================================================================
#  OSWEL'S TRAP — VÉRIFIE QU'ON COMPREND LES VOIX (version 1.4)
#
#  Une « oreille » artificielle (reconnaissance vocale DeepSpeech, en
#  français, hors ligne) écoute chaque fichier et écrit ce qu'elle entend.
#  On compare avec le texte de la réplique : pourcentage de mots retrouvés.
#  Une voix avec beaucoup d'effets (Bug, Rumeur, Gardien) aura un score plus
#  bas : c'est normal, l'important est que la phrase reste compréhensible.
#
#  Lancé par generer.py --check, ou à la main :
#     python verifier_asr.py <dossier_modele> <liste.json> <rapport.txt>
#  dossier_modele : contient output_graph.tflite (ou .pbmm) et kenlm.scorer
#  liste.json     : [{"out": "fichier.mp3", "text": "...", "key": "..."}]
# =====================================================================
import json, os, re, subprocess, sys, unicodedata

def norm_words(t):
    """Texte → liste de mots simples (sans accents, sans ponctuation), pour comparer."""
    t = t.lower().replace('’', "'")
    t = unicodedata.normalize('NFD', t)
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
    t = re.sub(r"[^a-z0-9' ]+", ' ', t)
    t = t.replace("'", ' ')
    return [w for w in t.split() if w]

def wer(ref, hyp):
    """Taux d'erreur de mots (distance d'édition entre les deux listes de mots)."""
    r, h = ref, hyp
    if not r:
        return 0.0 if not h else 1.0
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            cur = d[j]
            d[j] = min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1]))
            prev = cur
    return d[len(h)] / len(r)

def main():
    if len(sys.argv) < 4:
        print(__doc__ or 'usage: verifier_asr.py <modele> <liste.json> <rapport.txt>'); sys.exit(1)
    model_dir, lst, report = sys.argv[1:4]
    import numpy as np, deepspeech
    g = os.path.join(model_dir, 'output_graph.tflite')
    if not os.path.exists(g):
        g = os.path.join(model_dir, 'output_graph.pbmm')
    m = deepspeech.Model(g)
    sc = os.path.join(model_dir, 'kenlm.scorer')
    if os.path.exists(sc):
        m.enableExternalScorer(sc)
    items = json.load(open(lst, encoding='utf-8'))
    rows, by_char = [], {}
    for k, it in enumerate(items):
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', it['out'], '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
        heard = m.stt(np.frombuffer(raw, np.int16)) if raw else ''
        ref = norm_words(it['text'])
        e = wer(ref, norm_words(heard))
        ch = it['key'].split('/')[0]
        by_char.setdefault(ch, []).append(e)
        rows.append((e, it['key'], it['text'], heard))
        if (k + 1) % 50 == 0:
            print(f'  écouté {k + 1}/{len(items)}', flush=True)
    rows.sort(key=lambda r: -r[0])
    with open(report, 'w', encoding='utf-8') as f:
        f.write("RAPPORT DE COMPRÉHENSION DES VOIX — mots retrouvés par la reconnaissance vocale\n")
        f.write("(100 % = tous les mots retrouvés ; les voix à effets ont naturellement un score plus bas)\n\n")
        f.write('PAR PERSONNAGE\n')
        for ch, es in sorted(by_char.items(), key=lambda kv: sum(kv[1]) / len(kv[1])):
            f.write(f'  {ch:14s} {len(es):4d} répliques   {100 * (1 - min(1, sum(es) / len(es))):5.1f} % de mots retrouvés\n')
        allv = [r[0] for r in rows]
        if allv:
            f.write(f'\n  TOTAL          {len(allv):4d} répliques   {100 * (1 - min(1, sum(allv) / len(allv))):5.1f} %\n')
        f.write('\nLES RÉPLIQUES LES MOINS BIEN COMPRISES (à réécouter)\n')
        for e, key, text, heard in rows[:60]:
            f.write(f'  {100 * (1 - min(1, e)):5.1f} %  {key}\n      texte  : {text}\n      entendu: {heard}\n')
    print('rapport écrit :', report)

if __name__ == '__main__':
    main()
