# =====================================================================
#  OSWEL'S TRAP — synthèse en lot avec Mimic 3 (lancé par generer.py)
#  À lancer avec le python qui a « mycroft-mimic3-tts ».
#     python synth_mimic3.py <dossier_des_voix> <jobs.json>
#  jobs.json : [{"voice": "fr_FR/m-ailabs_low#bernard", "text": "...", "out": "x.wav",
#               "f0": 118, "range": 1.0, "formant": 0.3, "tempo": 0.93}]
#
#  1. Mimic 3 lit le texte (toutes les phrases, avec une petite pause entre elles).
#  2. Si « pyworld » est installé et que la réplique demande une hauteur (f0),
#     on change la voix avec WORLD (un « vocodeur ») : hauteur, expressivité
#     (range), timbre (formant) et vitesse (tempo). C'est bien plus propre qu'un
#     simple changement de hauteur : la voix reste compréhensible.
#     Sans pyworld, generer.py fait le changement de hauteur avec ffmpeg.
# =====================================================================
import sys, json, wave
import numpy as np
from mimic3_tts import Mimic3Settings, Mimic3TextToSpeechSystem, AudioResult

try:
    import pyworld as pw
except ImportError:
    pw = None

if len(sys.argv) > 1 and sys.argv[1] == '--has-world':
    print('world' if pw else 'no-world'); sys.exit(0)

def world_change(x, fs, j):
    """Change la hauteur, l'expressivité, le timbre et la vitesse d'une voix."""
    x = x.astype(np.float64) / 32768.0
    f0, t = pw.harvest(x, fs, f0_floor=60.0, f0_ceil=500.0, frame_period=5.0)
    sp = pw.cheaptrick(x, f0, t, fs)
    ap = pw.d4c(x, f0, t, fs)
    voiced = f0 > 0
    if voiced.any():
        med = float(np.median(f0[voiced]))
        rng = float(j.get('range', 1.0))
        f0 = np.where(voiced, j['f0'] * (np.maximum(f0, 1e-3) / med) ** rng, 0.0)
        # le timbre suit la hauteur, un peu (voix d'homme plus grave, de femme plus claire)
        fr = (j['f0'] / med) ** float(j.get('formant', 0.3))
    else:
        fr = 1.0
    if abs(fr - 1) > 0.005:
        nb = sp.shape[1]
        src = np.clip(np.arange(nb) / fr, 0, nb - 1)
        i0 = np.floor(src).astype(int); i1 = np.minimum(i0 + 1, nb - 1); w = src - i0
        sp = sp[:, i0] * (1 - w) + sp[:, i1] * w
        ap = ap[:, i0] * (1 - w) + ap[:, i1] * w
    tempo = float(j.get('tempo', 1.0))
    if abs(tempo - 1) > 0.005:
        n = len(f0); m = max(2, int(round(n / tempo)))
        idx = np.round(np.linspace(0, n - 1, m)).astype(int)
        f0, sp, ap = f0[idx], sp[idx], ap[idx]
    y = pw.synthesize(np.ascontiguousarray(f0), np.ascontiguousarray(sp), np.ascontiguousarray(ap), fs, frame_period=5.0)
    peak = float(np.max(np.abs(y))) or 1.0
    y = y * min(1.0, 0.92 / peak)
    return (y * 32767).astype(np.int16)

voices_dir, jobs_path = sys.argv[1], sys.argv[2]
jobs = json.load(open(jobs_path, encoding='utf-8'))
tts = Mimic3TextToSpeechSystem(Mimic3Settings(voices_directories=[voices_dir], length_scale=None, noise_scale=None, noise_w=None))
cur_voice = None
for j in jobs:
    if j['voice'] != cur_voice:
        tts.voice = j['voice']; cur_voice = j['voice']
    tts.settings.length_scale = j.get('length_scale') or None
    tts.begin_utterance()
    tts.speak_text(j['text'])
    chunks, rate, width, ch = [], 22050, 2, 1
    for r in tts.end_utterance():
        if isinstance(r, AudioResult):
            rate, width, ch = r.sample_rate_hz, r.sample_width_bytes, r.num_channels
            chunks.append(r.audio_bytes)
            chunks.append(b'\x00' * int(rate * 0.12) * width * ch)   # petite pause entre les phrases
    data = b''.join(chunks)
    done = 'raw'
    if pw is not None and j.get('f0') and width == 2 and ch == 1 and data:
        try:
            data = world_change(np.frombuffer(data, np.int16), rate, j).tobytes(); done = 'world'
        except Exception as e:   # une voix ratée ne bloque pas les autres
            print('world-erreur', j['out'], e, file=sys.stderr)
    with wave.open(j['out'], 'wb') as w:
        w.setnchannels(ch); w.setsampwidth(width); w.setframerate(rate)
        w.writeframes(data)
    print(done, j['out'], flush=True)
