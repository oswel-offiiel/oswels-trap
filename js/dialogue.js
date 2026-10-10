/* =====================================================================
   OSWEL'S TRAP — dialogue.js  (version 1.4)
   LE GESTIONNAIRE DE DIALOGUES ET DE VOIX (OT.Dialogue)

   Une réplique passe toujours par le même chemin :
     réplique → personnage → texte → voix → animation → sous-titre → événement

   Une réplique = { id, character, text, audio, emotion, animation,
                    duration, priority, event, subtitle }
     - id        : identifiant stable. Pour les dialogues de l'histoire, il
                   est calculé à partir du personnage et du texte
                   (« patou/3f2a9c1b ») : si on change le texte, l'ancienne
                   voix n'est plus utilisée (elle ne correspondrait plus).
     - audio     : audio/fr/characters/<personnage>/<code>.mp3
                   (la liste des fichiers qui existent est dans js/voices.js,
                   fabriqué par tools/voix/generer.py)
     - priority  : 3 = cinématique / boss / histoire importante
                   2 = dialogue de gameplay, réaction importante
                   1 = petite réaction, mini-jeu
                   Une voix importante n'est jamais coupée par une voix moins
                   importante (la petite est simplement ignorée).

   Si le fichier audio manque (ou ne se charge pas) : le jeu ne plante
   jamais. On essaie la voix de synthèse du système (si elle existe et si
   l'option est active), sinon on affiche seulement le sous-titre.

   Pour remplacer une voix par un vrai enregistrement : enregistre un .mp3
   et mets-le à la place du fichier du même nom (voir tools/voix/LISEZMOI.md).

   Utilisation depuis le reste du jeu :
     OT.Dialogue.playDialogue('annonceur_go')      réplique nommée
     OT.Dialogue.say('patou', 'Bonjour !', { priority: 2 })
     OT.Dialogue.bark('death', 'oswel')            petite réaction (variantes + délai)
     OT.Dialogue.on('start', fn) / on('end', fn)   pour animer celui qui parle
   ===================================================================== */
window.OT = window.OT || {};

OT.Dialogue = (function () {
  const BASE = 'audio/fr/';
  const PRIO = { cine: 3, story: 3, boss: 3, gameplay: 2, reaction: 2, bark: 1, mini: 1 };

  /* ---------- 1. Les personnages qui parlent ----------
     voice : le dossier de ses voix (audio/fr/characters/<voice>/)
     tts   : réglages de la voix de synthèse de secours (hauteur, vitesse, voix de femme) */
  const F = (pitch = 1.15, rate = 1) => ({ pitch, rate, female: true });
  const M = (pitch = 0.9, rate = 1) => ({ pitch, rate, female: false });
  const SPEAKERS = {
    // narrateurs, annonceur
    narrateur: { name: 'Narrateur', tts: M(0.85, 0.92) },
    chapitre: { name: 'Oswel', tts: M(0.95, 0.95) },
    annonceur: { name: 'Annonceur', tts: M(1, 1.08) },
    // le héros et l'Écho (le 2e joueur)
    oswel: { tts: M(1.05, 1.05) }, echo: { tts: M(1.1, 1.05) },
    // les personnages jouables (réactions)
    meka: { name: 'MEKA', tts: M(0.6, 0.95) }, byte: { name: 'BYTE', tts: M(1.5, 1.1) }, nexa: { name: 'NEXA', tts: F(1.0, 0.9) },
    godlove: { tts: M(1, 1) }, tony: { tts: M(0.85, 0.94) }, fredo: { tts: M(1.15, 1.08) }, valdes: { tts: M(1.1, 1.08) }, franck: { tts: M(1.05, 1.08) },
    // Monde 1
    patou: { tts: M(0.8, 0.95) }, tante: { tts: F(1.05) }, christine: { tts: F(1.2, 1.05) }, romeo: { tts: M(0.95, 1.1) },
    isaie: { name: 'Isaïe', tts: M(1.05, 1.06) }, kevin: { name: 'Kevin', tts: M(1.25, 1.14) }, tchanko: { name: 'Tchanko', tts: M(0.7, 0.9) },
    gardien: { tts: M(0.4, 0.85) }, rumeur: { tts: F(0.6, 0.9) },
    // Monde 2
    yannick: { tts: M(1.1, 1.1) }, samuel: { tts: M(1.1) }, peck: { tts: M(1, 1.05) }, youmbi: { tts: M(1.2) }, brayan: { tts: M(0.95) }, bug: { tts: M(1.4, 1.1) },
    // Monde 3
    ange: { tts: F(1.25) }, kellia: { tts: F(1.25) }, dimi: { tts: M(1.05) }, annie: { tts: F(1.15) }, reine: { tts: F(1.05) },
    tsague: { tts: M(0.85) }, junior: { tts: M(0.9, 1.05) }, machine: { tts: F(0.7, 0.92) },
    // Monde 4
    francheska: { tts: F(1.1, 0.97) }, danie: { tts: F(1.1, 1.05) }, sandex: { tts: M(1.15) }, ladyannee: { tts: F(1.15) },
    winblack: { tts: M(0.6, 0.9) }, reinedamso: { tts: F(1.2) }, belvianne: { tts: F(1.25) }, charly: { tts: M(1.25) }, ashley: { tts: F(1.1) },
    zeus: { tts: M(0.55, 0.92) }, ia: { tts: F(0.9, 1.05) },
    // Monde 5
    lionnel: { tts: M(0.9, 0.98) }, nadia: { tts: F(1.15, 1.06) },
  };
  const speaker = (id) => SPEAKERS[id] || (SPEAKERS[id] = { tts: M() });
  const nameOf = (id) => (speaker(id).name) || ((OT.CHARACTERS && OT.CHARACTERS[id] && OT.CHARACTERS[id].name) || id);

  /* ---------- 2. Identifiant stable d'une réplique (FNV-1a 32 bits sur le texte) ---------- */
  function norm(text) { return String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim(); }
  function hash(text) {
    let h = 0x811c9dc5;
    const s = norm(text);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  const keyOf = (character, text) => character + '/' + hash(text);
  const hasFile = (key) => !!(OT.VOICE_FILES && OT.VOICE_FILES[key]);

  // une réplique complète (avec les valeurs par défaut)
  function line(character, text, o = {}) {
    const key = o.key || keyOf(character, text);
    return Object.assign({
      id: o.id || key, key, character, text: norm(text),
      audio: BASE + 'characters/' + key + '.mp3',
      emotion: null, animation: 'talk', priority: 2, subtitle: true, event: null,
      duration: (OT.VOICE_FILES && OT.VOICE_FILES[key]) || estimate(text),
    }, o, { key });
  }
  // durée approximative quand on n'a pas de fichier (environ 14 caractères par seconde)
  function estimate(text) { return Math.max(1.2, Math.min(9, norm(text).length / 14 + 0.4)); }

  /* ---------- 3. Les répliques nommées (réactions, annonceur, mini-jeux) ---------- */
  const LINES = {};
  function register(id, character, text, o = {}) { LINES[id] = line(character, text, Object.assign({ id }, o)); return LINES[id]; }

  /* ---------- 4. Réglages (Paramètres → Son) ---------- */
  const S = () => OT.settings || {};
  const master = () => (S().master !== undefined ? +S().master : 1);
  const voiceVol = () => (S().voiceVol !== undefined ? +S().voiceVol : 0.9) * master();
  const voicesOn = () => S().voices !== false;
  const subsOn = () => S().subtitles !== false;
  const ttsOn = () => S().ttsFallback !== false;

  /* ---------- 5. Sous-titres ---------- */
  let subEl = null, subT = 0;
  function subs() {
    if (subEl) return subEl;
    subEl = document.getElementById('subs');
    if (!subEl) { subEl = document.createElement('div'); subEl.id = 'subs'; subEl.hidden = true; document.body.appendChild(subEl); }
    return subEl;
  }
  function showSub(ln, color) {
    if (!subsOn() || !ln.subtitle) return;
    const el = subs();
    el.innerHTML = '';
    const b = document.createElement('b'); b.textContent = ln.name || nameOf(ln.character); if (color) b.style.color = color;
    const s = document.createElement('span'); s.textContent = ln.text;
    el.appendChild(b); el.appendChild(s);
    el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    clearTimeout(subT);
    subT = setTimeout(hideSub, (ln.duration + 0.6) * 1000);
  }
  function hideSub() { if (subEl) subEl.hidden = true; }

  /* ---------- 6. Lecture ---------- */
  // une petite réserve d'éléments <audio> (les fichiers se chargent à la demande)
  const cache = new Map();           // src → HTMLAudioElement (les 24 derniers)
  function audioFor(src) {
    let a = cache.get(src);
    if (a) { cache.delete(src); cache.set(src, a); return a; }
    a = new Audio(); a.preload = 'auto'; a.src = src;
    cache.set(src, a);
    if (cache.size > 24) { const [k, old] = cache.entries().next().value; old.onerror = null; old.onended = null; old.src = ''; cache.delete(k); }
    return a;
  }
  /* Version « une seule page » (publiée en ligne) : les voix ne sont pas des fichiers séparés mais
     des PAQUETS, un par personnage (OT.VOICE_PACK_BASE + 'tony.json' = { code: mp3 en base64 }).
     Un paquet se charge la première fois qu'on en a besoin (ou en avance), puis reste en mémoire. */
  const packs = {};
  function loadPack(ch) {
    if (!OT.VOICE_PACK_BASE || !ch) return Promise.resolve();
    if (packs[ch]) return packs[ch].p;
    const P = packs[ch] = { state: 'loading', urls: {} };
    P.p = fetch(OT.VOICE_PACK_BASE + ch + '.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))).then((j) => {
      for (const code in j) {
        const bin = atob(j[code]), u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        P.urls[code] = URL.createObjectURL(new Blob([u8], { type: 'audio/mpeg' }));
      }
      P.state = 'ok';
    }).catch(() => { P.state = 'fail'; });
    return P.p;
  }
  // l'adresse du fichier d'une réplique (null = pas encore disponible)
  function srcFor(key) {
    if (!OT.VOICE_PACK_BASE) return BASE + 'characters/' + key + '.mp3';
    const i = key.indexOf('/'), ch = key.slice(0, i), P = packs[ch];
    if (P && P.state === 'ok') return P.urls[key.slice(i + 1)] || null;
    loadPack(ch);
    return null;
  }
  // charger à l'avance les voix de quelques personnages (début de niveau, mini-jeu…)
  function preloadChars(list) { if (OT.VOICE_PACK_BASE && voicesOn()) [...new Set(list)].forEach((c) => loadPack(c)); }
  // préchargement intelligent : la réplique suivante d'une conversation
  function preload(character, text) {
    const key = keyOf(character, text);
    if (!voicesOn() || !hasFile(key)) return;
    const src = srcFor(key);
    if (src) audioFor(src);
  }

  let cur = null;            // { ln, audio, utter, prio, t0, done }
  let paused = false;
  const listeners = { start: [], end: [] };
  const emit = (ev, ln) => listeners[ev].forEach((f) => { try { f(ln); } catch (e) { console.warn(e); } });
  const missing = new Set(); // fichiers qui n'ont pas pu être lus (on ne réessaie pas)
  let lastPlay = 0;

  // voix de synthèse du système (secours) : une voix française si possible
  let frVoices = null;
  function pickTtsVoice(female) {
    if (!('speechSynthesis' in window)) return null;
    if (!frVoices || !frVoices.length) frVoices = speechSynthesis.getVoices().filter((v) => /^fr/i.test(v.lang));
    if (!frVoices.length) return null;
    const f = frVoices.filter((v) => /amélie|amelie|audrey|aurélie|hortense|julie|marie|céline|denise|virginie|female|femme|google français/i.test(v.name));
    const m = frVoices.filter((v) => /thomas|paul|nicolas|claude|henri|male|homme|daniel/i.test(v.name));
    return (female ? f[0] : m[0]) || frVoices[0];
  }
  if ('speechSynthesis' in window) { try { speechSynthesis.onvoiceschanged = () => { frVoices = null; }; } catch (e) {} }

  function finish(c) {
    if (!c || c.done) return;
    c.done = true;
    if (cur === c) { cur = null; if (OT.Music && OT.Music.duck) OT.Music.duck(false); }
    emit('end', c.ln);
    if (c.cb) { const cb = c.cb; c.cb = null; try { cb(); } catch (e) { console.warn(e); } }
  }

  /* say : joue une réplique. o.priority, o.subtitle (false = la boîte de dialogue affiche déjà le texte),
     o.onEnd, o.color (couleur du nom dans le sous-titre), o.name (nom affiché) */
  function play(ln, o = {}) {
    if (!ln || !ln.text) return null;
    const prio = o.priority !== undefined ? o.priority : ln.priority;
    // une voix plus importante parle déjà : la petite réplique est ignorée (pas de cacophonie)
    if (cur && !cur.done && cur.prio > prio) { if (o.onEnd) o.onEnd(); return null; }
    stop(true);
    const c = { ln: Object.assign({}, ln, { subtitle: o.subtitle !== undefined ? o.subtitle : ln.subtitle, name: o.name || ln.name }), prio, cb: o.onEnd || null, t0: performance.now(), done: false };
    cur = c; lastPlay = performance.now();
    emit('start', c.ln);
    showSub(c.ln, o.color);
    const vol = voiceVol();
    const fallback = () => {
      if (c.done) return;
      // pas de fichier : voix de synthèse, sinon seulement le sous-titre (fin après la durée estimée)
      if (voicesOn() && ttsOn() && vol > 0 && 'speechSynthesis' in window && !o.noTts) {
        const sp = speaker(ln.character).tts || M();
        const v = pickTtsVoice(sp.female);
        if (v) {
          try {
            const u = new SpeechSynthesisUtterance(ln.tts || ln.text);
            u.voice = v; u.lang = v.lang; u.pitch = Math.max(0.1, Math.min(2, sp.pitch)); u.rate = Math.max(0.5, Math.min(1.6, sp.rate * (o.rate || 1)));
            u.volume = Math.min(1, vol);
            u.onend = () => finish(c); u.onerror = () => finish(c);
            c.utter = u;
            speechSynthesis.cancel(); speechSynthesis.speak(u);
            setTimeout(() => finish(c), (ln.duration * 1.8 + 2) * 1000);   // sécurité
            return;
          } catch (e) { /* on continue sans voix */ }
        }
      }
      setTimeout(() => finish(c), ln.duration * 1000);
    };
    const startAudio = (src) => {
      const a = audioFor(src);
      c.audio = a;
      try { a.pause(); a.currentTime = 0; } catch (e) {}
      a.volume = Math.min(1, vol);
      a.playbackRate = o.rate || 1;
      a.onended = () => finish(c);
      a.onerror = () => { missing.add(ln.key); if (!c.done) fallback(); };
      if (OT.Music && OT.Music.duck) OT.Music.duck(true);
      const pr = a.play();
      // lecture refusée (navigateur qui bloque le son avant le premier clic) ou fichier absent.
      // « AbortError » = la lecture a juste été interrompue (pause du jeu, réplique passée) : le fichier est bon.
      if (pr && pr.catch) pr.catch((err) => { if (c.done || (err && err.name === 'AbortError')) return; if (!err || err.name !== 'NotAllowedError') missing.add(ln.key); fallback(); });
      setTimeout(() => finish(c), (ln.duration / (o.rate || 1) + 3) * 1000);   // sécurité si « ended » n'arrive jamais
    };
    if (voicesOn() && vol > 0 && hasFile(ln.key) && !missing.has(ln.key)) {
      const src = srcFor(ln.key);
      if (src) startAudio(src);
      else if (OT.VOICE_PACK_BASE) {
        // le paquet de voix de ce personnage arrive : on attend un tout petit peu (le sous-titre est déjà là)
        const t0 = performance.now();
        loadPack(ln.key.split('/')[0]).then(() => { if (c.done) return; const s2 = srcFor(ln.key); if (s2 && performance.now() - t0 < 2500) startAudio(s2); else fallback(); });
      } else fallback();
    } else fallback();
    return c;
  }
  function say(character, text, o = {}) { return play(line(character, text, o.lineOpts || {}), o); }
  function playDialogue(id, o = {}) {
    const ln = LINES[id];
    if (!ln) { console.warn('Réplique inconnue :', id); return null; }
    return play(ln, o);
  }
  // arrêter la voix en cours (passer une réplique, changer de scène)
  function stop(silent) {
    const c = cur;
    if (!c) return;
    if (c.audio) { try { c.audio.onended = null; c.audio.pause(); } catch (e) {} }
    if (c.utter && 'speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) {} }
    if (!silent) hideSub();
    c.cb = null;
    finish(c);
  }
  function pause() {
    if (paused) return; paused = true;
    if (cur && cur.audio) { try { cur.audio.pause(); } catch (e) {} }
    if ('speechSynthesis' in window) { try { speechSynthesis.pause(); } catch (e) {} }
  }
  function resume() {
    if (!paused) return; paused = false;
    if (cur && cur.audio && !cur.done) { const p = cur.audio.play(); if (p && p.catch) p.catch(() => {}); }
    if ('speechSynthesis' in window) { try { speechSynthesis.resume(); } catch (e) {} }
  }

  /* ---------- 7. Petites réactions (barks) : variantes, probabilité, délai ----------
     BARKS[kind] = { p: probabilité, cd: délai minimal (s), lines: { personnage: [textes…], _: [textes par défaut] } } */
  const BARKS = {};
  const lastBark = {}, lastIdx = {};
  let lastAnyBark = 0;
  function defineBarks(kind, opts, lines) { BARKS[kind] = Object.assign({ p: 1, cd: 6, prio: 1 }, opts, { lines }); }
  function barkLines(kind, who) { const B = BARKS[kind]; if (!B) return null; return B.lines[who] || B.lines._ || null; }
  function bark(kind, who, o = {}) {
    const B = BARKS[kind];
    if (!B) return null;
    const now = performance.now() / 1000;
    if (!o.force) {
      if ((now - (lastBark[kind] || -99)) < B.cd) return null;
      if (now - lastAnyBark < 2.2) return null;                         // pas de bavardage en rafale
      if (Math.random() > (o.p !== undefined ? o.p : B.p)) return null;
      if (cur && !cur.done && cur.prio >= 2) return null;                 // on ne coupe pas une vraie conversation
    }
    const list = barkLines(kind, who);
    if (!list || !list.length) return null;
    // jamais deux fois de suite la même variante
    let i = Math.floor(Math.random() * list.length);
    const k = kind + ':' + who;
    if (list.length > 1 && i === lastIdx[k]) i = (i + 1) % list.length;
    lastIdx[k] = i;
    lastBark[kind] = now; lastAnyBark = now;
    const voice = B.lines[who] ? who : (o.fallbackVoice || who);
    return play(line(voice, list[i]), Object.assign({ priority: B.prio, color: o.color, name: o.name }, o));
  }

  /* ---------- 8. Mémoire narrative (légère) ----------
     Quelques souvenirs gardés dans le profil : les personnages peuvent y faire référence. */
  function remember(flag) { const p = OT.Save && OT.Save.active; if (!p) return; p.memory = p.memory || {}; if (!p.memory[flag]) { p.memory[flag] = Date.now(); OT.Save.save(); } }
  function remembers(flag) { const p = OT.Save && OT.Save.active; return !!(p && p.memory && p.memory[flag]); }
  // une ligne de dialogue peut être conditionnelle : ['isaie', 'Tu te souviens de la Forge ?', { if: 'w1' }]
  function filterLines(lines) {
    return (lines || []).filter((l) => {
      const c = l && l[2]; if (!c) return true;
      if (c.if && !remembers(c.if)) return false;
      if (c.unless && remembers(c.unless)) return false;
      return true;
    });
  }

  /* ---------- 9. Toutes les répliques du jeu (pour l'outil qui fabrique les voix) ---------- */
  function collectAll() {
    const out = [], seen = new Set();
    const add = (character, text, kind) => {
      if (!character || !text) return;
      const k = keyOf(character, text);
      if (seen.has(k)) return; seen.add(k);
      out.push({ key: k, character, text: norm(text), kind, tts: (LINES[k] && LINES[k].tts) || null });
    };
    const W = OT.WORLD_DATA || {};
    const bossVoice = { gardien: 'gardien', bug: 'bug', exam: 'machine', zeus: 'zeus', rumeur: 'rumeur' };
    for (const w in W) {
      const D = W[w];
      (D.intro || []).forEach((c) => add('narrateur', c.text, 'cine'));
      (D.outro || []).forEach((c) => add(c[0], c[1], 'cine'));
      if (D.chapter) { (D.chapter.paragraphs || []).forEach((t) => add('chapitre', t, 'chapitre')); add('chapitre', D.chapter.last, 'chapitre'); }
      const bossLv = D.levels.find((l) => l.boss);
      const bv = bossLv ? bossVoice[bossLv.boss] || 'gardien' : 'gardien';
      if (D.bossText) {
        (D.bossText.phases || []).forEach((ph) => { add(bv, ph.say, 'boss'); (ph.tell || []).forEach(([s, t]) => add(s, t, 'boss')); });
        add(bv, D.bossText.end, 'boss');
        (D.bossText.extra || []).forEach((t) => add(bv, t, 'boss'));
      }
      D.levels.forEach((lv) => {
        ['intro', 'outro', 'endStory', 'escapeStory'].forEach((k) => (lv[k] || []).forEach(([s, t]) => add(s, t, 'story')));
        if (lv.secretLine) add(lv.secretLine[0], lv.secretLine[1], 'story');
        for (const e of (lv.build && lv.build.ents) || []) if (e.type === 'door' && e.zoneSay) add(e.zoneSay[0], e.zoneSay[1], 'story');
        for (const id in (lv.dialogs || {})) {
          const d = lv.dialogs[id], who = d.who || id;
          ['lines', 'alt', 'again'].forEach((k) => (d[k] || []).forEach((t) => (Array.isArray(t) ? add((t[1] && t[1].who) || who, t[0], 'story') : add(who, t, 'story'))));
        }
        for (const e of (lv.build && lv.build.ents) || []) if (e.type === 'rumeur' && e.text) add('rumeur', e.text, 'rumeur');
        (lv.events || []).forEach((ev) => (ev.lines || []).forEach(([s, t]) => add(s, t, 'story')));
      });
    }
    (OT.STORY_EXTRA || []).forEach(([s, t]) => add(s, t, 'story'));
    for (const id in LINES) add(LINES[id].character, LINES[id].text, 'named');
    for (const kind in BARKS) for (const who in BARKS[kind].lines) if (who !== '_') BARKS[kind].lines[who].forEach((t) => add(who, t, 'bark'));
    // les réactions par défaut sont dites par chaque personnage jouable qui n'a pas les siennes
    const chars = (OT.Chars && OT.Chars.LIST ? OT.Chars.LIST.map((c) => c.id) : ['oswel']);
    for (const kind in BARKS) { const def = BARKS[kind].lines._; if (!def) continue; for (const c of chars) if (!BARKS[kind].lines[c]) def.forEach((t) => add(c, t, 'bark')); }
    return out;
  }

  // les personnages qui parlent dans un niveau (pour charger leurs voix à l'avance)
  function preloadLevel(lv) {
    if (!OT.VOICE_PACK_BASE || !lv) return;
    const cs = ['oswel'];
    ['intro', 'outro', 'endStory', 'escapeStory'].forEach((k) => (lv[k] || []).forEach((l) => cs.push(l[0])));
    for (const id in (lv.dialogs || {})) cs.push(id);
    if (lv.secretLine) cs.push(lv.secretLine[0]);
    if (lv.boss) cs.push({ exam: 'machine' }[lv.boss] || lv.boss, 'tony', 'francheska');
    preloadChars(cs);
  }

  return {
    SPEAKERS, LINES, BARKS, PRIO, preloadChars, preloadLevel, loadPack,
    hash, keyOf, line, register, defineBarks, barkLines,
    say, play, playDialogue, bark, stop, pause, resume, preload,
    showSub, hideSub, remember, remembers, filterLines, collectAll,
    nameOf, hasFile,
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    get speaking() { return !!(cur && !cur.done); },
    get current() { return cur ? cur.ln : null; },
    get sinceLast() { return (performance.now() - lastPlay) / 1000; },
  };
})();
// version en ligne (une seule page) : les voix les plus fréquentes se chargent dès le début
if (OT.VOICE_PACK_BASE) setTimeout(() => OT.Dialogue.preloadChars(['oswel', 'narrateur', 'annonceur']), 3000);
// raccourci demandé : playDialogue("oswel_intro_001")
window.playDialogue = (id, o) => OT.Dialogue.playDialogue(id, o);
