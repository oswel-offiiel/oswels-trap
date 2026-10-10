/* =====================================================================
   OSWEL'S TRAP — music.js
   Musique fabriquée en direct avec WebAudio (aucun fichier à charger).
   Un petit séquenceur : 16 pas par mesure, 4 accords en boucle,
   une basse, un arpège, et des percussions synthétiques.
   Chaque monde a son thème, chaque boss le sien, plus le menu.
   Le volume se règle dans Options → Musique.
   ===================================================================== */

window.OT = window.OT || {};

OT.Music = (function () {
  // m = note MIDI (69 = la 440 Hz)
  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const MINOR = [0, 3, 7], MAJOR = [0, 4, 7];
  // prog : [décalage en demi-tons de l'accord, type]
  const SONGS = {
    menu:   { bpm: 78,  root: 57, prog: [[0, MINOR], [8, MAJOR], [3, MAJOR], [10, MAJOR]], arp: 'triangle', arpRate: 2, bass: 'sine', drums: 'soft', gain: 0.8 },
    world1: { bpm: 100, root: 45, prog: [[0, MINOR], [5, MINOR], [8, MAJOR], [7, MAJOR]], arp: 'triangle', arpRate: 2, bass: 'sawtooth', drums: 'forge', gain: 0.9 },
    boss1:  { bpm: 138, root: 40, prog: [[0, MINOR], [1, MAJOR], [0, MINOR], [10, MAJOR]], arp: 'sawtooth', arpRate: 4, bass: 'sawtooth', drums: 'boss', gain: 0.85 },
    world2: { bpm: 118, root: 52, prog: [[0, MINOR], [8, MAJOR], [5, MINOR], [7, MAJOR]], arp: 'square', arpRate: 4, bass: 'triangle', drums: 'chip', gain: 0.7 },
    boss2:  { bpm: 146, root: 45, prog: [[0, MINOR], [0, MINOR], [3, MAJOR], [1, MAJOR]], arp: 'square', arpRate: 4, bass: 'sawtooth', drums: 'boss', gain: 0.75 },
    world3: { bpm: 104, root: 50, prog: [[0, MAJOR], [9, MINOR], [5, MAJOR], [7, MAJOR]], arp: 'triangle', arpRate: 4, bass: 'sine', drums: 'chip', gain: 0.75 },
    boss3:  { bpm: 132, root: 48, prog: [[0, MINOR], [3, MAJOR], [10, MAJOR], [5, MINOR]], arp: 'square', arpRate: 4, bass: 'sawtooth', drums: 'boss', gain: 0.7 },
    world4: { bpm: 92, root: 53, prog: [[0, MAJOR], [4, MINOR], [9, MINOR], [5, MAJOR]], arp: 'triangle', arpRate: 2, bass: 'sine', drums: 'soft', gain: 0.85 },
    boss4:  { bpm: 140, root: 46, prog: [[0, MAJOR], [5, MAJOR], [7, MAJOR], [5, MAJOR]], arp: 'square', arpRate: 4, bass: 'sawtooth', drums: 'boss', gain: 0.7 },
    world5: { bpm: 112, root: 47, prog: [[0, MINOR], [5, MINOR], [10, MAJOR], [3, MAJOR]], arp: 'triangle', arpRate: 4, bass: 'sawtooth', drums: 'forge', gain: 0.8 },
    boss5:  { bpm: 150, root: 42, prog: [[0, MINOR], [1, MAJOR], [3, MAJOR], [1, MAJOR]], arp: 'sawtooth', arpRate: 4, bass: 'sawtooth', drums: 'boss', gain: 0.75 },
    ending: { bpm: 80, root: 55, prog: [[0, MAJOR], [7, MAJOR], [9, MINOR], [5, MAJOR]], arp: 'triangle', arpRate: 2, bass: 'sine', drums: 'soft', gain: 0.9 },
    // le multijoueur : une boucle joyeuse et rapide
    party:  { bpm: 132, root: 53, prog: [[0, MAJOR], [9, MINOR], [5, MAJOR], [7, MAJOR]], arp: 'square', arpRate: 4, bass: 'triangle', drums: 'chip', gain: 0.7 },
    podium: { bpm: 96, root: 55, prog: [[0, MAJOR], [5, MAJOR], [7, MAJOR], [0, MAJOR]], arp: 'triangle', arpRate: 4, bass: 'sine', drums: 'forge', gain: 0.85 },
    // Soirée OSWEL : une ambiance par mini-jeu
    boum:   { bpm: 136, root: 45, prog: [[0, MINOR], [8, MAJOR], [10, MAJOR], [7, MAJOR]], arp: 'square', arpRate: 4, bass: 'sawtooth', drums: 'forge', gain: 0.75 },
    train:  { bpm: 156, root: 50, prog: [[0, MINOR], [10, MAJOR], [8, MAJOR], [7, MAJOR]], arp: 'sawtooth', arpRate: 4, bass: 'sawtooth', drums: 'boss', gain: 0.7 },
    labo:   { bpm: 124, root: 52, prog: [[0, MINOR], [3, MAJOR], [5, MINOR], [7, MAJOR]], arp: 'square', arpRate: 4, bass: 'triangle', drums: 'chip', gain: 0.7 },
    tresor: { bpm: 118, root: 50, prog: [[0, MINOR], [5, MINOR], [7, MAJOR], [3, MAJOR]], arp: 'triangle', arpRate: 4, bass: 'sawtooth', drums: 'forge', gain: 0.8 },
    panne:  { bpm: 128, root: 47, prog: [[0, MINOR], [1, MAJOR], [5, MINOR], [7, MAJOR]], arp: 'square', arpRate: 4, bass: 'sawtooth', drums: 'chip', gain: 0.72 },
    ville:  { bpm: 120, root: 53, prog: [[0, MAJOR], [9, MINOR], [2, MINOR], [7, MAJOR]], arp: 'triangle', arpRate: 4, bass: 'triangle', drums: 'chip', gain: 0.75 },
    piege:  { bpm: 112, root: 49, prog: [[0, MINOR], [5, MINOR], [8, MAJOR], [7, MAJOR]], arp: 'square', arpRate: 4, bass: 'sawtooth', drums: 'chip', gain: 0.72 },
    course: { bpm: 148, root: 52, prog: [[0, MAJOR], [7, MAJOR], [9, MINOR], [5, MAJOR]], arp: 'square', arpRate: 4, bass: 'sawtooth', drums: 'boss', gain: 0.7 },
  };
  let rush = 1;   // accélère la musique (fin de manche, mort subite)
  let ctx = null, out = null, noiseBuf = null;
  let cur = null, want = 'menu', step = 0, nextT = 0, timer = 0, switchAtBar = false;
  // version 1.4 : volume général × volume musique ; la musique baisse un peu quand quelqu'un parle
  let ducked = false;
  const vol = () => (OT.settings && OT.settings.music !== undefined ? OT.settings.music : 0.5) * (OT.settings && OT.settings.master !== undefined ? +OT.settings.master : 1);

  function ensure() {
    if (ctx) return true;
    const S = OT.Sound;
    if (!S || !S.ctx) return false;          // le son n'est pas encore débloqué (il faut un premier clic / une touche)
    ctx = S.ctx;
    out = ctx.createGain(); out.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    out.connect(comp); comp.connect(ctx.destination);
    const len = Math.floor(ctx.sampleRate * 0.5);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function note(type, f, t, dur, g, filt) {
    const o = ctx.createOscillator(), a = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    a.gain.setValueAtTime(0.0001, t);
    a.gain.exponentialRampToValueAtTime(g, t + 0.01);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (filt) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filt; o.connect(fl); fl.connect(a); } else o.connect(a);
    a.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  function hit(t, dur, g, f, type) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), a = ctx.createGain();
    s.buffer = noiseBuf; fl.type = type || 'highpass'; fl.frequency.value = f;
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(a); a.connect(out); s.start(t); s.stop(t + dur + 0.02);
  }
  function kick(t, g) {
    const o = ctx.createOscillator(), a = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(a); a.connect(out); o.start(t); o.stop(t + 0.25);
  }

  function playStep(S, s, t) {
    const sp = 60 / (S.bpm * rush) / 4;                       // durée d'un pas (double croche)
    const bar = Math.floor(s / 16) % S.prog.length, k = s % 16;
    const [shift, chord] = S.prog[bar];
    const r = S.root + shift;
    const G = S.gain;
    // basse : sur les temps forts
    if (k % 4 === 0 || (S.drums === 'boss' && k % 2 === 0)) note(S.bass, freq(r - 12 + (k === 12 && S.drums !== 'soft' ? 7 : 0)), t, sp * (S.drums === 'boss' ? 1.6 : 3.2), 0.16 * G, 700);
    // arpège : notes de l'accord, montantes puis descendantes
    if (k % (4 / S.arpRate) === 0) {
      const seq = [0, 1, 2, 3, 2, 1];
      const idx = seq[(k / (4 / S.arpRate)) % seq.length];
      const m = idx === 3 ? r + 12 : r + chord[idx];
      note(S.arp, freq(m + 12), t, sp * 1.8, (S.arp === 'triangle' ? 0.07 : 0.03) * G, S.arp === 'triangle' ? 0 : 2600);
    }
    // nappe très douce au début de chaque mesure
    if (k === 0) for (const c of chord) note('sine', freq(r + c + 12), t, sp * 15, 0.025 * G);
    // percussions
    if (S.drums === 'soft') { if (k % 4 === 2) hit(t, 0.05, 0.03 * G, 7000); }
    else if (S.drums === 'forge') {
      if (k === 0 || k === 8) kick(t, 0.32 * G);
      if (k % 4 === 2) hit(t, 0.04, 0.05 * G, 8000);
      if (k === 4 || k === 12) { note('sine', 1180, t, 0.25, 0.05 * G); note('sine', 1630, t, 0.18, 0.03 * G); }   // l'enclume
    } else if (S.drums === 'chip') {
      if (k % 8 === 0) kick(t, 0.3 * G);
      if (k === 4 || k === 12) hit(t, 0.12, 0.09 * G, 1800, 'bandpass');
      if (k % 2 === 1) hit(t, 0.03, 0.035 * G, 9000);
    } else if (S.drums === 'boss') {
      if (k % 4 === 0) kick(t, 0.36 * G);
      if (k === 4 || k === 12) hit(t, 0.16, 0.12 * G, 1500, 'bandpass');
      if (k % 2 === 1) hit(t, 0.03, 0.05 * G, 8000);
    }
  }

  function tick() {
    if (!ensure()) return;
    const v = vol();
    out.gain.setTargetAtTime(v * 0.55 * (ducked ? 0.45 : 1), ctx.currentTime, ducked ? 0.12 : 0.4);
    if (ctx.state !== 'running') return;
    if (want !== cur && (!cur || switchAtBar === false || step % 16 === 0)) { cur = want; step = 0; nextT = Math.max(nextT, ctx.currentTime + 0.05); }
    const S = SONGS[cur];
    if (!S || v <= 0) { nextT = ctx.currentTime + 0.05; return; }
    const sp = 60 / (S.bpm * rush) / 4;
    if (nextT < ctx.currentTime - 0.2) nextT = ctx.currentTime + 0.05;   // l'onglet a dormi : on repart proprement
    while (nextT < ctx.currentTime + 0.15) { playStep(S, step, nextT); nextT += sp; step++; }
  }

  return {
    // name : 'menu', 'world1'…'world5', 'boss1'…'boss5', 'ending', 'party', 'podium'
    play(name) {
      if (!SONGS[name]) name = name && name.startsWith('boss') ? 'boss1' : 'world1';
      if (name === want) return;
      want = name; switchAtBar = !!cur;
      if (!timer) timer = setInterval(tick, 40);
    },
    stop() { want = null; cur = null; },
    // une voix parle : la musique se fait plus discrète (puis revient doucement)
    duck(on) { ducked = !!on; },
    // 1 = normal, 1.2 = plus rapide (la fin approche)
    set rush(v) { rush = Math.max(0.8, Math.min(1.4, v || 1)); },
    get rush() { return rush; },
    get current() { return cur; },
  };
})();
