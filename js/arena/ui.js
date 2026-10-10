/* =====================================================================
   OSWEL'S TRAP — arena/ui.js
   Les ÉCRANS de la Soirée OSWEL (mini-jeux en vue de dessus) :
     - SOIRÉE OSWEL : formule (partie rapide, soirée surprise, choisir,
       tournoi), niveau des bots, compléter avec des bots ;
     - les joueurs : chaque manette / moitié de clavier / téléphone
       prend une place, les places libres sont des bots ;
     - le choix des activités, la fiche de chaque activité ;
     - pendant le jeu : bandeau du haut, compte à rebours, annonces,
       pause, commandes tactiles ;
     - les résultats (Rejouer / Activité suivante / Retour) et le
       CHAMPION DE LA SOIRÉE.
   Le moteur est dans arena/core.js, les jeux dans arena/games/*.js.
   ===================================================================== */

/* ---------- Commandes tactiles : joystick + boutons A et B ---------- */
OT.ArenaTouch = (function () {
  const st = { mx: 0, mz: 0, a: false, b: false, pause: false };
  let el = null, knob = null, stickId = null, cx = 0, cy = 0;
  const fingers = new Map();
  const camIds = new Set();
  function build() {
    el = document.getElementById('atouch');
    if (!el || el.dataset.ok) return;
    el.dataset.ok = '1';
    el.innerHTML = '<div class="at-stick"><div class="at-knob"></div></div><div class="at-btns"><button class="at-b" data-k="b">B</button><button class="at-a" data-k="a">A</button></div><button class="at-pause" data-k="pause">II</button>';
    knob = el.querySelector('.at-knob');
    el.addEventListener('pointerdown', (e) => {
      const k = e.target.closest('[data-k]');
      e.preventDefault();
      if (k) { fingers.set(e.pointerId, k.dataset.k); st[k.dataset.k] = true; k.classList.add('on'); try { navigator.vibrate && navigator.vibrate(10); } catch (er) {} return; }
      if (e.clientX < window.innerWidth * 0.55 && stickId === null) {
        stickId = e.pointerId; cx = e.clientX; cy = e.clientY;
        const s = el.querySelector('.at-stick'); s.style.left = (cx - 60) + 'px'; s.style.top = (cy - 60) + 'px'; s.classList.add('on');
      } else if (e.clientX >= window.innerWidth * 0.55 && OT.Cam) {
        // côté droit (hors boutons) : glisser = tourner la caméra, deux doigts = zoom
        camIds.add(e.pointerId); OT.Cam.begin(e.pointerId, e.clientX, e.clientY, 'touch');
      }
    }, { passive: false });
    window.addEventListener('pointermove', (e) => {
      if (camIds.has(e.pointerId)) { OT.Cam.move(e.pointerId, e.clientX, e.clientY); return; }
      if (e.pointerId !== stickId) return;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy), R = 55;
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const m = Math.min(1, d / R);
      st.mx = d > 6 ? (dx / Math.max(1, Math.hypot(dx, dy))) * m : 0;
      st.mz = d > 6 ? (dy / Math.max(1, Math.hypot(dx, dy))) * m : 0;
    });
    const up = (e) => {
      if (camIds.has(e.pointerId)) { camIds.delete(e.pointerId); OT.Cam.end(e.pointerId); }
      if (e.pointerId === stickId) { stickId = null; st.mx = st.mz = 0; knob.style.transform = ''; el.querySelector('.at-stick').classList.remove('on'); }
      const k = fingers.get(e.pointerId);
      if (k) { st[k] = false; fingers.delete(e.pointerId); const b = el.querySelector(`[data-k="${k}"]`); if (b) b.classList.remove('on'); }
    };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  return {
    show(on) { build(); if (el) el.hidden = !on; if (!on) { st.mx = st.mz = 0; st.a = st.b = st.pause = false; } },
    state: () => ({ mx: st.mx, mz: st.mz, a: st.a, b: st.b, pause: st.pause }),
  };
})();

(function () {
  const X = OT.UI.ext;
  const { actions, renderers, frameHooks, show, esc, toast, $ } = X;
  const AR = () => OT.Arena;

  /* ---------- Joueurs, couleurs, bots ---------- */
  const COLORS = [0xe8473a, 0x3d8bff, 0x34c26b, 0xf2c230, 0xff6fae, 0x8e5bd6, 0x2fd3d3, 0xff8a2b];
  const COLOR_NAMES = ['rouge', 'bleu', 'vert', 'jaune', 'rose', 'violet', 'cyan', 'orange'];
  const hex = (c) => '#' + c.toString(16).padStart(6, '0');
  const CHARS = ['oswel', 'meka', 'byte', 'nexa', 'godlove', 'tony', 'fredo', 'valdes', 'franck'];   // ↑ / ↓ sur l'écran des joueurs
  const GUESTS = ['Piston Rapide', 'Boulon Malin', 'Turbo Têtu', 'Pixel Agile', 'Volt Rusé', 'Octet Fou', 'Rivet Calme', 'Clé Royale'];
  // les bots portent les noms et les tenues de l'histoire
  const BOTS = [
    { name: 'Zeus', acc: 'couronne', gad: 'eclair', char: 'nexa' },
    { name: 'Yannick', acc: 'lunettes', gad: 'ordi', char: 'byte' },
    { name: 'Franck', acc: 'casquette', gad: 'cle', char: 'meka' },
    { name: 'Romeo', acc: 'antenne', gad: 'ballon', char: 'oswel' },
    { name: 'Christine', acc: 'echarpe', gad: 'fiole', char: 'nexa' },
    { name: 'Tony', acc: 'aucun', gad: 'smartphone', char: 'tony' },
  ];
  const DEV_NAME = { kb0: 'Clavier gauche', kb1: 'Clavier droit', touch: 'Écran tactile' };
  const devName = (d) => DEV_NAME[d] || (d && d.startsWith('pad:') ? 'Manette ' + (OT.Input.pads().findIndex((g) => 'pad:' + g.index === d) + 1 || '') : d || '');
  const PLACE = ['1er', '2e', '3e', '4e'];
  const MEDAL = ['🥇', '🥈', '🥉', '4ᵉ'];
  const FORMULAS = {
    rapide: { name: 'Partie rapide', n: 3, desc: '3 activités au hasard' },
    surprise: { name: 'Soirée surprise', n: 5, desc: '5 activités au hasard et des surprises entre deux' },
    choisir: { name: 'Choisir les activités', n: 0, desc: 'ta liste, dans ton ordre' },
    tournoi: { name: 'Tournoi', n: 9, desc: 'les 9 activités, puis une finale en duel' },
  };

  /* ---------- La soirée en cours ---------- */
  const so = {
    formula: 'rapide', level: 'normal', fill: true,
    slots: [],         // humains : { dev, color, nameIdx, ready }
    list: [], idx: 0, players: [], pts: [], coins: [], history: [], double: false, picked: [], final: false, lastSummary: null,
  };
  try { const s = JSON.parse(localStorage.getItem('ot-soiree') || '{}'); if (s.level) so.level = s.level; if (s.fill !== undefined) so.fill = s.fill; } catch (e) {}
  const saveOpts = () => { try { localStorage.setItem('ot-soiree', JSON.stringify({ level: so.level, fill: so.fill })); } catch (e) {} };

  function nameList() {
    const profs = OT.Save.list().map((p) => ({ name: p.name, acc: p.skin.acc, gad: p.skin.gad || 'aucun', char: p.skin.char || 'oswel', fx: p.skin.fx || 'aucun', win: p.skin.win || 'perso', emote: p.skin.emote || 'wave', id: p.id }));
    return profs.concat(GUESTS.map((n, k) => ({ name: n, acc: 'aucun', gad: 'aucun', char: CHARS[k % CHARS.length], id: null })));
  }
  function freeName(start, dir) {
    const L = nameList(); let k = start;
    for (let n = 0; n < L.length; n++) { k = (k + dir + L.length) % L.length; if (!so.slots.some((s) => s.nameIdx === k)) return k; }
    return start;
  }
  function freeColor(start, dir = 1) {
    let k = start;
    for (let n = 0; n < COLORS.length; n++) { k = (k + dir + COLORS.length) % COLORS.length; if (!so.slots.some((s) => s.color === k)) return k; }
    return start;
  }
  // la liste des participants : humains puis bots pour compléter jusqu'à 4
  function buildPlayers() {
    const L = nameList();
    const out = so.slots.map((s, i) => {
      const n = L[s.nameIdx] || { name: 'Joueur ' + (i + 1), acc: 'aucun', gad: 'aucun' };
      return { name: n.name, color: COLORS[s.color], char: s.char || n.char || 'oswel', skin: { color: COLORS[s.color], acc: n.acc || 'aucun', gad: n.gad || 'aucun', char: s.char || n.char || 'oswel', fx: n.fx || 'aucun', win: n.win || 'perso', emote: n.emote || 'wave' }, human: true, dev: s.dev, profileId: n.id || null };
    });
    const fill = so.slots.length <= 1 ? true : so.fill;
    if (fill) {
      const used = new Set(so.slots.map((s) => s.color));
      const bots = OT.Arena.order.length ? BOTS.slice() : BOTS;
      let b = 0;
      while (out.length < 4) {
        let c = out.length; while (used.has(c % COLORS.length)) c++;
        used.add(c % COLORS.length);
        const B = bots[b++ % bots.length];
        out.push({ name: B.name, color: COLORS[c % COLORS.length], char: B.char, skin: { color: COLORS[c % COLORS.length], acc: B.acc, gad: B.gad, char: B.char }, human: false, level: so.level });
      }
    }
    return out;
  }

  /* ==================================================================
     ÉCRAN 1 — SOIRÉE OSWEL
     ================================================================== */
  actions.mp = () => show('soiree');
  renderers.soiree = () => {
    if (OT.Music) OT.Music.play('party');
    const L = OT.Arena.LEVELS[so.level];
    $('#so-level').textContent = L.name;
    $('#so-fill').textContent = so.fill ? 'Oui' : 'Non';
    $('#so-games').innerHTML = OT.Arena.order.map((id) => { const G = OT.Arena.games[id]; return `<span class="so-g" style="--c:${G.color}">${G.icon} ${esc(G.name)}</span>`; }).join('');
  };
  actions.soFormula = (f) => { so.formula = f; so.slots = so.slots.filter((s) => s.dev); show('ajoin'); };
  actions.soLevel = () => { const ids = Object.keys(OT.Arena.LEVELS); so.level = ids[(ids.indexOf(so.level) + 1) % ids.length]; saveOpts(); X.rerender(); };
  actions.soFill = () => { so.fill = !so.fill; saveOpts(); X.rerender(); };
  actions.soLan = () => toast('Le réseau local arrivera avec la version PC du jeu : un PC hébergera la partie, les autres le rejoindront, même depuis un téléphone.');

  /* ==================================================================
     ÉCRAN 2 — LES JOUEURS
     ================================================================== */
  renderers.ajoin = () => {
    OT.Input.arenaJoinPoll();   // on ignore ce qui était déjà appuyé
    const F = FORMULAS[so.formula];
    $('#aj-kicker').textContent = F.name + ' · ' + F.desc;
    const L = nameList();
    const ps = buildPlayers();
    let html = '';
    for (let i = 0; i < 4; i++) {
      const s = so.slots[i], p = ps[i];
      if (s) {
        const n = L[s.nameIdx] || { name: 'Joueur ' + (i + 1) };
        const ch = OT.Chars ? OT.Chars.BY[s.char || n.char || 'oswel'] : null;
        html += `<div class="jslot on${s.ready ? ' ready' : ''}" style="--c:${hex(COLORS[s.color])}"><span class="jnum">P${i + 1}</span><span class="jdot"></span><b>${esc(n.name)}</b><small>${ch ? '◆ ' + ch.name + ' · ' : ''}${esc(devName(s.dev))}${s.ready ? ' · prêt ✓' : ''}</small></div>`;
      } else if (p) {
        const ch = OT.Chars ? OT.Chars.BY[p.char] : null;
        html += `<div class="jslot bot" style="--c:${hex(p.color)}"><span class="jnum">P${i + 1}</span><span class="jdot"></span><b>${esc(p.name)}</b><small>${ch ? '◆ ' + ch.name + ' · ' : ''}Bot · ${OT.Arena.LEVELS[so.level].name}</small></div>`;
      } else html += `<div class="jslot"><span class="jnum">P${i + 1}</span><b>Libre</b><small>Appuie sur A pour rejoindre</small></div>`;
    }
    $('#aj-slots').innerHTML = html;
    const n = so.slots.length;
    $('#aj-help').innerHTML =
      '<p><b>Rejoindre</b> : ✕ (manette) · Espace (clavier gauche) · Entrée (clavier droit)</p>' +
      '<p><b>Nom</b> : gauche / droite · <b>Personnage</b> (OSWEL, MEKA, BYTE, NEXA) : haut / bas · <b>Quitter sa place</b> : B</p>' +
      `<p class="muted">${n === 0 ? 'Personne pour l\'instant.' : n === 1 ? '1 joueur : les 3 autres places sont des bots.' : n + ' joueurs' + (so.fill ? ' + bots pour compléter.' : ', sans bots.')} Appuie encore sur A quand tu es prêt, ou OPTIONS pour lancer.</p>`;
    $('#aj-go').disabled = n === 0;
    $('#aj-touch').hidden = !(matchMedia('(pointer: coarse)').matches) || so.slots.some((s) => s.dev === 'touch');
  };
  frameHooks['screen-ajoin'] = () => {
    const ev = OT.Input.arenaJoinPoll();
    let changed = false;
    for (const e of ev) {
      if (e.dev === 'kbx') { if (e.act === 'start' || e.act === 'b') { show('soiree'); return; } continue; }
      const k = so.slots.findIndex((s) => s.dev === e.dev);
      if (k < 0) {
        if (e.act === 'a' && so.slots.length < 4) { addSlot(e.dev); changed = true; }
        continue;
      }
      const s = so.slots[k];
      if (e.act === 'start') { actions.ajGo(); return; }
      if (e.act === 'a') { s.ready = true; OT.Sound.ok(); changed = true; }
      else if (e.act === 'b') { so.slots.splice(k, 1); OT.Sound.bad(); changed = true; }
      else if (e.act === 'left' || e.act === 'right') { s.nameIdx = freeName(s.nameIdx, e.act === 'left' ? -1 : 1); s.char = null; s.ready = false; OT.Sound.menu(); changed = true; }
      else if (e.act === 'up' || e.act === 'down') { const cur = CHARS.indexOf(s.char || nameList()[s.nameIdx].char || 'oswel'); s.char = CHARS[(cur + (e.act === 'up' ? -1 : 1) + CHARS.length) % CHARS.length]; s.ready = false; OT.Sound.menu(); changed = true; }
    }
    if (changed) {
      renderers.ajoin();
      if (so.slots.length && so.slots.every((s) => s.ready)) actions.ajGo();
    }
  };
  function addSlot(dev) {
    const L = nameList();
    const first = so.slots.length === 0 && OT.Save.active ? L.findIndex((n) => n.id === OT.Save.active.id) : -1;
    const i = so.slots.length;
    so.slots.push({ dev, color: so.slots.some((s) => s.color === i) ? freeColor(i) : i, nameIdx: first >= 0 && !so.slots.some((s) => s.nameIdx === first) ? first : freeName(-1, 1), ready: false });
    OT.Sound.ok(); OT.Input.rumbleDev(dev, 0.3, 0.3, 120);
  }
  actions.ajTouch = () => { if (so.slots.length < 4 && !so.slots.some((s) => s.dev === 'touch')) { addSlot('touch'); X.rerender(); } };
  actions.ajGo = () => {
    if (!so.slots.length) { toast('Appuie sur A (✕, Espace ou Entrée) pour prendre une place.'); return; }
    so.players = buildPlayers();
    so.pts = so.players.map(() => 0); so.coins = so.players.map(() => 0); so.history = []; so.double = false; so.final = false;
    if (so.formula === 'choisir') { so.picked = []; show('aacts'); return; }
    so.list = pickList();
    so.idx = 0;
    show('aintro');
  };
  // les variantes (Le Traître) ne sont pas tirées au sort en partie rapide ni en tournoi
  function pickList() {
    const all = OT.Arena.order.filter((id) => so.formula === 'surprise' || !OT.Arena.games[id].variant);
    if (so.formula === 'tournoi') return all.slice();
    return shuffle(all).slice(0, Math.min(FORMULAS[so.formula].n, all.length));
  }
  function shuffle(l) { l = l.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; }

  /* ==================================================================
     ÉCRAN 3 — CHOISIR LES ACTIVITÉS
     ================================================================== */
  renderers.aacts = () => {
    if (OT.Music) OT.Music.play('party');
    $('#aa-kicker').textContent = `${so.players.filter((p) => p.human).length} joueur(s) · ${so.players.length - so.players.filter((p) => p.human).length} bot(s)`;
    $('#aa-grid').innerHTML = OT.Arena.order.map((id) => {
      const G = OT.Arena.games[id];
      const k = so.picked.indexOf(id);
      return `<button class="acard${k >= 0 ? ' on' : ''}" style="--c:${G.color}" data-nav data-act="aaPick:${id}">
        ${k >= 0 ? `<em>${k + 1}</em>` : ''}<span class="ai">${G.icon}</span><b>${esc(G.name)}</b><small>${esc(G.tagline)}</small></button>`;
    }).join('');
    $('#aa-go').disabled = !so.picked.length;
    $('#aa-go').textContent = so.picked.length ? `Jouer (${so.picked.length} activité${so.picked.length > 1 ? 's' : ''})` : 'Choisis au moins une activité';
  };
  actions.aaPick = (id) => { const k = so.picked.indexOf(id); if (k >= 0) so.picked.splice(k, 1); else so.picked.push(id); X.rerender(); };
  actions.aaGo = () => { if (!so.picked.length) return; so.list = so.picked.slice(); so.idx = 0; show('aintro'); };
  actions.aaAll = () => { so.picked = OT.Arena.order.slice(); X.rerender(); };

  /* ==================================================================
     ÉCRAN 4 — LA FICHE D'UNE ACTIVITÉ
     ================================================================== */
  const curId = () => so.list[so.idx];
  // les touches de chaque appareil, pour la fiche et l'entraînement
  const PAD = { a: '✕', b: '□', move: 'stick gauche' };
  function devLabels(dev) { return dev && dev.startsWith('pad:') ? PAD : OT.Input.arenaLabels(dev || 'pad:0'); }
  // « {a} : poser une bombe » → « ✕ : poser une bombe » (avec des petites touches)
  function keysIn(text, lab) {
    return esc(text).replace(/\{(a|b|move)\}/g, (m, k) => (k === 'move' ? `<span class="k">${esc(lab.move)}</span>` : `<span class="k">${esc(lab[k])}</span>`));
  }
  OT.ArenaKeys = { devLabels, keysIn };
  function legend(G) {
    const devs = [];
    for (const p of so.players) if (p.human) { const kind = p.dev && p.dev.startsWith('pad:') ? 'pad' : p.dev; if (!devs.includes(kind)) devs.push(kind); }
    if (!devs.length) devs.push('pad');
    const name = { pad: '🎮 Manette (PS4)', kb0: '⌨️ Clavier gauche', kb1: '⌨️ Clavier droit', touch: '📱 Écran tactile' };
    return devs.map((d) => {
      const lab = d === 'pad' ? PAD : OT.Input.arenaLabels(d);
      let h = `<span class="dev"><b>${name[d] || d}</b> bouger <span class="k">${esc(lab.move)}</span>`;
      if (G.controls.a) h += ` · <span class="k">${esc(lab.a)}</span> ${esc(G.controls.a)}`;
      if (G.controls.b) h += ` · <span class="k">${esc(lab.b)}</span> ${esc(G.controls.b)}`;
      h += d === 'pad' ? ' · <span class="k">OPTIONS</span> pause' : d === 'touch' ? ' · <span class="k">II</span> pause' : ' · <span class="k">Échap</span> pause';
      return h + '</span>';
    }).join('');
  }
  // la présentation : « MINI-JEU 03 », le nom, l'objectif… avec la voix de l'annonceur et une vibration
  let introKey = '';
  renderers.aintro = () => {
    OT.Input.arenaJoinPoll();
    const G = OT.Arena.games[curId()];
    const dev = (so.players.find((p) => p.human) || {}).dev;
    const lab = devLabels(dev);
    const num = so.idx + 1;
    $('#ai-num').textContent = so.final ? 'GRANDE FINALE' : `MINI-JEU ${String(num).padStart(2, '0')}`;
    $('#ai-kicker').textContent = so.final ? 'Le duel pour le titre' : `Activité ${num} / ${so.list.length}${so.double ? ' · POINTS DOUBLÉS' : ''}`;
    $('#ai-icon').textContent = G.icon;
    $('#ai-name').textContent = G.name;
    $('#ai-card').style.setProperty('--c', G.color);
    $('#ai-tag').textContent = G.tagline;
    const nR = typeof G.rounds === 'function' ? G.rounds(so.players.length) : G.rounds;
    $('#ai-goal').textContent = G.goal || G.tagline;
    const how = G.howto || [`Bouge avec {move}.`].concat(G.controls.a ? [`{a} : ${G.controls.a}.`] : [], G.controls.b ? [`{b} : ${G.controls.b}.`] : []);
    $('#ai-how').innerHTML = how.map((t) => `<li>${keysIn(t, lab)}</li>`).join('') + `<li>${nR > 1 ? nR + ' manches' : '1 manche'}${G.tuto === false ? '' : ' · avant de commencer, 4 secondes d\'entraînement'}.</li>`;
    $('#ai-danger').innerHTML = keysIn(G.danger || (G.rules[2] || ''), lab);
    $('#ai-win').innerHTML = keysIn(G.win || (G.rules[3] || ''), lab);
    $('#ai-lose').innerHTML = keysIn(G.lose || '', lab);
    $('#ai-lose').parentNode.hidden = !G.lose;
    $('#ai-keys').innerHTML = legend(G);
    $('#ai-players').innerHTML = so.players.map((p) => `<span class="aip" style="--c:${hex(p.color)}">${esc(p.name)}${p.human ? '' : ' <small>bot</small>'}</span>`).join('');
    // une seule fois par présentation : son, vibration, voix
    const k = curId() + ':' + so.idx + ':' + so.final;
    if (k !== introKey) {
      introKey = k;
      try { [392, 523, 659, 784, 1046].forEach((f, i) => OT.Sound.tone('square', f, f, 0.12, 0.08, i * 0.07)); } catch (e) {}
      for (const p of so.players) if (p.human && p.dev) OT.Input.rumbleDev(p.dev, 0.5, 0.6, 260);
      if (OT.Dialogue) {
        const D = OT.Dialogue, name = 'mg_g_' + curId();
        if (D.preloadChars) D.preloadChars(['annonceur'].concat(so.players.map((p) => p.char || 'oswel')));
        const first = so.final ? 'mg_finale' : 'mg_num' + Math.min(num, 10);
        const then = () => { if (D.LINES[name] && document.querySelector('#screen-aintro:not([hidden])')) D.playDialogue(name, { priority: 2, subtitle: false }); };
        if (D.LINES[first]) D.playDialogue(first, { priority: 2, subtitle: false, onEnd: then }); else then();
      }
    }
  };
  frameHooks['screen-aintro'] = () => {
    for (const e of OT.Input.arenaJoinPoll()) {
      if (e.dev === 'kbx') { if (e.act === 'start' || e.act === 'b') { actions.aiBack(); return; } continue; }
      if (!so.players.some((p) => p.human && p.dev === e.dev)) continue;
      if (e.act === 'a' || e.act === 'start') { actions.aiGo(); return; }
      if (e.act === 'b') { actions.aiBack(); return; }
    }
  };
  actions.aiBack = () => { introKey = ''; if (OT.Dialogue) OT.Dialogue.stop(true); if (so.formula === 'choisir') show('aacts'); else show('soiree'); };
  actions.aiGo = () => { introKey = ''; if (OT.Dialogue) OT.Dialogue.stop(true); play(curId()); };

  /* ==================================================================
     PENDANT LE JEU
     ================================================================== */
  function play(id, specs) {
    // la grande finale du tournoi : seulement les deux finalistes
    if (!specs && so.final && so.finalists) specs = so.finalists.map((i) => so.players[i]);
    specs = specs || so.players;
    so.map = specs.map((sp) => so.players.indexOf(sp));
    show(null);
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    OT.Arena.lastSpecs = specs;
    OT.Arena.start(id, specs, {}, onDone);
  }
  let hudT = 0, bannerT = 0, countT = 0, tutoT = 0;
  OT.ArenaUI = {
    enter(A) {
      $('#ahud').hidden = false;
      $('#ah-icon').textContent = A.def.icon; $('#ah-title').textContent = A.def.name;
      document.body.classList.add('arena-on');
      OT.ArenaTouch.show(A.players.some((p) => p.human && p.dev === 'touch'));
      hudT = 0;
    },
    leave() {
      $('#ahud').hidden = true; $('#abanner').hidden = true; $('#acount').hidden = true; if ($('#atuto')) $('#atuto').hidden = true;
      document.body.classList.remove('arena-on');
      OT.ArenaTouch.show(false);
    },
    roundStart(A) { $('#ah-round').textContent = A.rounds > 1 ? `Manche ${A.round}/${A.rounds}` : ''; hudT = 0; },
    // l'entraînement : les consignes, cochées quand chaque joueur humain les a essayées
    tuto(A) {
      const el = $('#atuto'); if (!el) return;
      const dev = (A.players.find((P) => P.human) || {}).dev;
      const lab = devLabels(dev);
      $('#at-list').innerHTML = A.tuto.list.map((t) => `<li data-k="${/\{move\}/.test(t) ? 'move' : /\{a\}/.test(t) ? 'a' : /\{b\}/.test(t) ? 'b' : ''}">${keysIn(t, lab)}</li>`).join('');
      el.hidden = false; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      tutoT = 0;
      this.tutoUpdate(A);
    },
    tutoUpdate(A) {
      tutoT -= 1 / 60; if (tutoT > 0) return; tutoT = 0.1;
      const T = A.tuto; if (!T) return;
      $('#at-t').textContent = Math.max(0, Math.ceil(A.tutoT));
      const hum = A.players.filter((P) => P.human);
      const done = (k, P) => { const g = T.prog[P.i]; return k === 'move' ? g.move > 1.2 : !!g[k]; };
      for (const li of $('#at-list').children) { const k = li.dataset.k; li.classList.toggle('ok', !!k && hum.every((P) => done(k, P))); }
      $('#at-ps').innerHTML = hum.map((P) => { const n = ['move', 'a', 'b'].filter((k) => done(k, P)).length; return `<span class="${n >= (A.def.controls.b ? 3 : 2) ? 'ok' : ''}" style="--c:${P.css}">${esc(P.name)} ${'✓'.repeat(n)}</span>`; }).join('');
    },
    tutoEnd() { const el = $('#atuto'); if (el) el.hidden = true; },
    count(c, A) {
      const el = $('#acount');
      el.hidden = false;
      el.innerHTML = c > 0 ? `<small>${A.rounds > 1 ? 'Manche ' + A.round + '/' + A.rounds : esc(A.def.name)}</small><b>${c}</b>` : '<b class="go">GO !</b>';
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      clearTimeout(countT);
      if (c <= 0) countT = setTimeout(() => (el.hidden = true), 700);
    },
    banner(text, sub, color, dur) {
      const el = $('#abanner');
      el.hidden = false;
      el.style.setProperty('--c', color || '#ffd28a');
      el.innerHTML = `<b>${esc(text)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`;
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      clearTimeout(bannerT);
      bannerT = setTimeout(() => (el.hidden = true), (dur || 2) * 1000);
    },
    hud(A) {
      hudT -= 1 / 60;
      if (hudT > 0) return;
      hudT = 0.1;
      const H = A.def.hud ? A.def.hud(A) : {};
      const tm = H.timer;
      $('#ah-timer').textContent = tm !== undefined && tm !== null ? (tm >= 60 ? `${Math.floor(tm / 60)}:${String(Math.floor(tm % 60)).padStart(2, '0')}` : Math.ceil(Math.max(0, tm)) + ' s') : '';
      $('#ah-timer').classList.toggle('hot', tm !== undefined && tm !== null && tm <= 10);
      // « Dix secondes ! » (une fois, quand le chrono passe sous 10 s)
      if (tm !== undefined && tm !== null && A.phase === 'play') { if (A.lastTm > 10 && tm <= 10) OT.Arena.announce('last10'); A.lastTm = tm; }
      $('#ah-note').textContent = H.note || '';
      const pn = $('#ah-panel'); if (pn && pn.innerHTML !== (H.panel || '')) pn.innerHTML = H.panel || '';
      const rows = H.rows || A.players.map((P) => ({ i: P.i, txt: '' }));
      $('#ah-rows').innerHTML = rows.map((r) => {
        const P = A.players[r.i];
        const off = P.out && !P.ghost && !r.fin;
        return `<div class="ah-p${off ? ' off' : ''}${r.fin ? ' fin' : ''}${P.ghost ? ' ghost' : ''}" style="--c:${P.css}"><span class="d"></span><b>${esc(P.name)}</b>${P.human ? '' : '<i>bot</i>'}<span class="s">${A.rounds > 1 ? '<em>' + A.score[P.i] + '</em>' : ''}${r.txt || ''}</span></div>`;
      }).join('');
    },
    pause(P) {
      OT.Arena.paused = true;
      $('#ap-who').textContent = P ? `Pause demandée par ${P.name}` : 'Pause';
      show('apause');
    },
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden && OT.Arena.active && !OT.Arena.paused && OT.Arena.match && OT.Arena.match.phase !== 'done') OT.ArenaUI.pause(null); });
  // pendant un mini-jeu, Espace et Entrée ne doivent pas « cliquer » un bouton de menu resté sélectionné
  window.addEventListener('keydown', (e) => {
    if (OT.Arena.active && !OT.Arena.paused && !document.querySelector('.screen:not([hidden])') && ['Space', 'Enter', 'NumpadEnter', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  }, true);

  actions.apResume = () => { show(null); OT.Arena.paused = false; };
  actions.apRestart = () => { const id = OT.Arena.match.def.id; OT.Arena.stop(); play(id, OT.Arena.lastSpecs || so.players); };
  actions.apQuit = () => { OT.Arena.stop(); show(so.formula === 'choisir' ? 'aacts' : 'soiree'); };
  actions.apLeave = () => { OT.Arena.stop(); show('title'); };
  renderers.apause = () => {
    const A = OT.Arena.match;
    $('#ap-game').textContent = A ? `${A.def.icon} ${A.def.name}${A.rounds > 1 ? ' · manche ' + A.round + '/' + A.rounds : ''}` : '';
    $('#ap-rules').innerHTML = A ? A.def.rules.map((r) => `<li>${esc(r)}</li>`).join('') : '';
  };

  /* ==================================================================
     ÉCRAN 5 — RÉSULTATS
     ================================================================== */
  const PTS = [5, 3, 2, 1];
  function onDone(sum) {
    // points de la soirée et pièces pour les profils
    const hasBots = so.players.some((p) => !p.human);
    for (const r of sum.rows) {
      r.si = so.map && so.map[r.i] >= 0 ? so.map[r.i] : r.i;   // place du joueur dans la soirée
      const P = so.players[r.si];
      r.soPts = (PTS[r.place] || 0) * (so.double ? 2 : 1);
      if (sum.rows.length === 2 && r.place === 1) r.soPts = 3 * (so.double ? 2 : 1);
      if (sum.team && !sum.team.ok && r.place > 0) r.soPts = 1 * (so.double ? 2 : 1);   // équipe battue : 1 point chacun
      so.pts[r.si] += r.soPts;
      r.coinsWon = 0;
      if (P && P.human && P.profileId) {
        const L = OT.Arena.LEVELS[so.level];
        r.coinsWon = Math.max(1, Math.round([6, 4, 2, 1][r.place] * (hasBots ? L.coin : 1)));
        const prof = OT.Save.prof(P.profileId);
        if (prof) { prof.coins += r.coinsWon; so.coins[r.si] += r.coinsWon; }
      }
    }
    OT.Save.save();
    so.history.push({ id: sum.id, rows: sum.rows });
    so.lastSummary = sum;
    so.double = false;
    setTimeout(() => { OT.Arena.stop(true); OT.ArenaUI.leave(); show('ares'); }, 400);
  }
  renderers.ares = () => {
    if (OT.Music) OT.Music.play('podium');
    const sum = so.lastSummary; if (!sum) return;
    const G = OT.Arena.games[sum.id];
    $('#ar-title').textContent = `${G.icon} ${G.name}`;
    const win = sum.rows.filter((r) => r.place === 0);
    $('#ar-win').textContent = sum.team ? sum.team.text : win.length > 1 ? `Égalité : ${win.map((r) => r.name).join(' et ')} !` : `${win[0].name} gagne !`;
    $('#ar-rows').innerHTML = sum.rows.map((r) => `
      <div class="ares-row" style="--c:${r.css}">
        <span class="m">${r.medal || MEDAL[r.place]}</span>
        <span class="n"><b>${esc(r.name)}${r.human ? '' : ' <i>bot</i>'}</b><small>${r.lines.map(esc).join(' · ')}</small>${r.bonus.length ? `<small class="bn">${r.bonus.map(esc).join(' · ')}</small>` : ''}</span>
        <span class="c"><b>${r.score}</b><small>${esc(sum.scoreName)}</small></span>
        <span class="c"><b>${r.elim}</b><small>${esc(sum.elimName || 'élim.')}</small></span>
        <span class="c"><b>+${r.soPts}</b><small>soirée</small></span>
        <span class="c coin"><b>${r.coinsWon ? '+' + r.coinsWon : '—'}</b><small>pièces</small></span>
      </div>`).join('');
    // le podium 3D : les personnages des joueurs, à leur place
    const specs = OT.Arena.lastSpecs || so.players;
    if (OT.Podium) OT.Podium.show($('#ar-pod3d'), sum.rows.slice(0, 4).map((r) => { const sp = specs[r.i] || {}; return { skin: Object.assign({}, sp.skin || {}, { char: sp.char || (sp.skin && sp.skin.char) }), color: sp.color || r.color, name: r.name, place: r.place }; }));
    const last = so.idx >= so.list.length - 1;
    $('#ar-next').textContent = so.final ? 'Voir le champion 🏆' : last ? (so.formula === 'tournoi' ? 'La grande finale ⚔️' : 'Voir le champion 🏆') : 'Activité suivante ▶';
    $('#ar-total').innerHTML = so.players.map((p, i) => ({ p, i, v: so.pts[i] })).sort((a, b) => b.v - a.v).map((x) => `<span style="--c:${hex(x.p.color)}">${esc(x.p.name)} <b>${x.v}</b></span>`).join('');
  };
  actions.arReplay = () => play(so.lastSummary.id, OT.Arena.lastSpecs);
  actions.arBack = () => { if (so.formula === 'choisir') show('aacts'); else { so.formula = 'choisir'; so.picked = []; show('aacts'); } };
  actions.arNext = () => {
    if (so.final) { show('achamp'); return; }
    if (so.idx >= so.list.length - 1) {
      if (so.formula === 'tournoi' && !so.final) {
        // la grande finale : un duel de Boum ! entre les deux premiers
        const top = so.players.map((p, i) => ({ p, i, v: so.pts[i] })).sort((a, b) => b.v - a.v).slice(0, 2);
        so.final = true; so.finalists = top.map((t) => t.i);
        so.list.push('boum'); so.idx = so.list.length - 1;
        show('aintro');
        return;
      }
      show('achamp'); return;
    }
    so.idx++;
    // soirée surprise : un petit événement entre deux activités
    if (so.formula === 'surprise' && Math.random() < 0.6) {
      const ev = Math.random() < 0.5 ? 'double' : 'choose';
      if (ev === 'double') { so.double = true; toast('🎁 SURPRISE : points doublés pour la prochaine activité !'); }
      else {
        const lastI = so.players.map((p, i) => ({ i, v: so.pts[i] })).sort((a, b) => a.v - b.v)[0].i;
        const P = so.players[lastI];
        const left = OT.Arena.order.filter((id) => !so.list.slice(so.idx).includes(id));
        const pick = left.length ? left[Math.floor(Math.random() * left.length)] : null;
        if (pick) { so.list[so.idx] = pick; toast(`🎁 SURPRISE : ${P.name} est dernier, il impose la prochaine activité : ${OT.Arena.games[pick].name} !`); }
      }
    }
    show('aintro');
  };

  /* ==================================================================
     ÉCRAN 6 — CHAMPION DE LA SOIRÉE
     ================================================================== */
  renderers.achamp = () => {
    if (OT.Music) OT.Music.play('podium');
    let order = so.players.map((p, i) => ({ p, i, v: so.pts[i] })).sort((a, b) => b.v - a.v);
    if (so.final && so.history.length) {
      // le vainqueur de la finale est champion
      const fin = so.history[so.history.length - 1].rows;
      const champI = fin.find((r) => r.place === 0).si;
      order = [order.find((o) => o.i === champI)].concat(order.filter((o) => o.i !== champI));
    }
    const champ = order[0];
    $('#ac-name').textContent = champ.p.name;
    OT.Arena.announce('champion');
    $('#ac-name').style.color = hex(champ.p.color);
    $('#ac-sub').textContent = `${so.history.length} activité${so.history.length > 1 ? 's' : ''} jouée${so.history.length > 1 ? 's' : ''} · ${champ.v} points`;
    // podium 3D (le podium en cartes reste pour les petits écrans)
    if (OT.Podium) OT.Podium.show($('#ac-pod3d'), order.slice(0, 4).map((o, k) => ({ skin: Object.assign({}, o.p.skin || {}, { char: o.p.char || (o.p.skin && o.p.skin.char) }), color: o.p.color, name: o.p.name, place: k })), { zoom: 1.05 });
    $('#ac-pod').innerHTML = order.slice(0, 3).map((o, k) => `<div class="pod p${k}" style="--c:${hex(o.p.color)}"><span>${MEDAL[k]}</span><b>${esc(o.p.name)}</b><small>${o.v} pts</small><i></i></div>`).join('');
    $('#ac-rows').innerHTML = order.map((o, k) => `<li style="--c:${hex(o.p.color)}"><span>${PLACE[k]}</span><b>${esc(o.p.name)}</b>${o.p.human ? '' : '<i>bot</i>'}<em>${o.v} pts</em>${so.coins[o.i] ? `<small>+${so.coins[o.i]} pièces</small>` : ''}</li>`).join('');
    // confettis
    const cf = $('#ac-confetti');
    cf.innerHTML = Array.from({ length: 40 }, (_, k) => `<i style="left:${Math.random() * 100}%;background:${hex(COLORS[k % COLORS.length])};animation-delay:${Math.random() * 2}s;animation-duration:${2 + Math.random() * 2}s"></i>`).join('');
    OT.Sound.door();
  };
  actions.acAgain = () => { so.pts = so.players.map(() => 0); so.coins = so.players.map(() => 0); so.history = []; so.final = false; so.idx = 0; if (so.formula !== 'choisir') so.list = pickList(); show('aintro'); };
  actions.acMenu = () => show('soiree');

  // pour les tests automatiques
  OT.Soiree = { so, buildPlayers, play: (id, specs) => play(id, specs), COLORS, BOTS };
})();
