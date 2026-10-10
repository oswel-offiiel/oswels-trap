/* =====================================================================
   OSWEL'S TRAP — ui.js  (version 4)
   L'INTERFACE :
     - profils des joueurs (inscription locale, plusieurs profils)
     - progression PAR MONDE (Monde 1 : La Forge, Monde 2 : Le Code…)
     - menus : mondes (avec images), niveaux (avec médailles), boutique,
       options, touches personnalisables, carnet, classement
     - dialogues, fin de niveau (médailles), LEÇON, QUIZ, chapitre
     - cinématique d'introduction de chaque monde
     - signaler un bug, code de sauvegarde, serveur en ligne (facultatif)
     - installation sur Android / PC (application web)
   Les menus se pilotent à la manette (croix / joystick, ✕ valider,
   ○ retour), au clavier (flèches, Entrée, Échap) ou au doigt.
   ===================================================================== */

window.OT = window.OT || {};
OT.VERSION = '1.5';

/* ---------------------------------------------------------------------
   SAUVEGARDE (localStorage) — profils, progression, pièces, options
   --------------------------------------------------------------------- */
OT.Save = (function () {
  const KEY = 'oswels-trap-v2';
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const defaultSettings = () => ({
    vibration: true, vibStrength: 1, volume: 0.6, music: 0.5,
    // version 1.4 : volume général, voix, sous-titres, voix de synthèse si pas d'enregistrement
    master: 1, voiceVol: 0.9, voices: true, subtitles: true, ttsFallback: true,
    shadows: !isMobile, swapPads: false,
    touchMode: 'auto', touch2p: false, touchSize: 'discret',   // version 1.5 : boutons tactiles discrets par défaut
    difficulty: 'normal', ghost: true, lightbar: true, server: '',
    gameSpeed: 1,   // vitesse du gameplay (0,6 à 1,3), réglée dans les Paramètres
    // caméra : sensibilité, sens vertical, retour automatique, L2/R2 = zoom (ou course comme avant)
    camSens: 1, camInvert: false, camRecenter: true, camTriggers: 'zoom',
    binds: OT.DEFAULT_BINDS(),
  });
  let data = { profiles: {}, order: [], active: null, settings: defaultSettings() };

  const newWorldProg = () => ({ unlocked: 1, done: {}, collected: {}, fragments: [], learned: [], quiz: { best: 0, passed: false }, rival: {} });
  function newProfile(name, colorId) {
    const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return {
      id, name, created: Date.now(), v: 4,
      coins: 0, deaths: 0,
      worlds: { 1: newWorldProg() },
      chapters: [], seenIntro: {},
      owned: { colors: OT.FREE_COLORS.slice(), acc: ['aucun'], gad: ['aucun'], fx: ['aucun'], win: ['perso'], emote: ['wave'] },
      skin: { color: colorId || 'bleu', acc: 'aucun', gad: 'aucun', char: 'oswel', fx: 'aucun', win: 'perso', emote: 'wave' },
    };
  }
  // Les profils de la version 3 (un seul monde) sont convertis sans rien perdre
  function migrate(p) {
    if (!p.worlds) {
      p.worlds = { 1: { unlocked: p.unlocked || 1, done: p.done || {}, collected: p.collected || {}, fragments: p.fragments || [], learned: p.learned || [], quiz: p.quiz || { best: 0, passed: false }, rival: {} } };
      ['unlocked', 'done', 'collected', 'fragments', 'learned', 'quiz'].forEach((k) => delete p[k]);
    }
    p.chapters = p.chapters || [];
    p.seenIntro = p.seenIntro || {};
    p.owned = p.owned || { colors: OT.FREE_COLORS.slice(), acc: ['aucun'] };
    p.skin = p.skin || { color: 'bleu', acc: 'aucun' };
    // version 1.0 : gadgets des mondes
    p.owned.gad = p.owned.gad || ['aucun'];
    p.skin.gad = p.skin.gad || 'aucun';
    // version 1.2 : personnage, effets, animation de victoire, émote
    p.owned.fx = p.owned.fx || ['aucun']; p.owned.win = p.owned.win || ['perso']; p.owned.emote = p.owned.emote || ['wave'];
    p.skin.char = p.skin.char || 'oswel'; p.skin.fx = p.skin.fx || 'aucun'; p.skin.win = p.skin.win || 'perso'; p.skin.emote = p.skin.emote || 'wave';
    p.v = 4;
    return p;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        data = Object.assign(data, d);
        data.settings = Object.assign(defaultSettings(), d.settings || {});
        if (!data.settings.binds || !data.settings.binds.kb) data.settings.binds = OT.DEFAULT_BINDS();
        Object.values(data.profiles).forEach(migrate);
      }
    } catch (e) { /* pas de stockage : on joue sans sauvegarde */ }
    OT.settings = data.settings;
    return data;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  const prof = (id) => data.profiles[id || data.active] || null;
  // progression d'un profil dans un monde
  const wp = (p, w) => { p.worlds = p.worlds || {}; return p.worlds[w] || (p.worlds[w] = newWorldProg()); };

  // texte ↔ base64 (avec les accents)
  const b64e = (s) => { const b = new TextEncoder().encode(s); let bin = ''; b.forEach((x) => (bin += String.fromCharCode(x))); return btoa(bin); };
  const b64d = (s) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));

  return {
    load, save, prof, wp,
    get data() { return data; },
    get active() { return prof(); },
    list() { return data.order.map((id) => data.profiles[id]).filter(Boolean); },
    create(name, colorId) {
      const p = newProfile(name, colorId);
      data.profiles[p.id] = p; data.order.push(p.id); data.active = p.id;
      save(); return p;
    },
    select(id) { if (data.profiles[id]) { data.active = id; save(); } },
    remove(id) {
      delete data.profiles[id];
      data.order = data.order.filter((x) => x !== id);
      if (data.active === id) data.active = data.order[0] || null;
      save();
    },
    addDeath() { const p = prof(); if (p) { p.deaths++; if (p.deaths % 10 === 0) save(); } },
    resetSettings() { data.settings = defaultSettings(); OT.settings = data.settings; save(); },
    // Un monde est ouvert si c'est le premier, ou si le quiz du monde précédent est réussi
    worldOpen(p, w) { return !!OT.WORLD_DATA[w] && (w === 1 || (p && wp(p, w - 1).quiz.passed)); },
    levelsDone(p) { return Object.values(p.worlds || {}).reduce((s, x) => s + Object.keys(x.done || {}).length, 0); },
    // Couleur (hex) et accessoire d'un profil
    skinOf(p) {
      const c = OT.SHOP.colors.find((x) => x.id === (p ? p.skin.color : 'bleu')) || OT.SHOP.colors[0];
      return { color: c.hex, acc: p ? p.skin.acc : 'aucun', gad: p ? p.skin.gad || 'aucun' : 'aucun', char: p ? p.skin.char || 'oswel' : 'oswel',
        fx: p ? p.skin.fx || 'aucun' : 'aucun', win: p ? p.skin.win || 'perso' : 'perso', emote: p ? p.skin.emote || 'wave' : 'wave' };
    },
    // Code de sauvegarde : tout le profil dans un texte à copier-coller
    exportCode(p) { return 'OT4:' + b64e(JSON.stringify(p)); },
    importCode(str) {
      let s = String(str || '').trim().replace(/\s+/g, '');
      if (!s.startsWith('OT4:')) throw new Error('Ce n\'est pas un code de sauvegarde Oswel\'s Trap.');
      let p;
      try { p = JSON.parse(b64d(s.slice(4))); } catch (e) { throw new Error('Code abîmé : vérifie qu\'il est complet.'); }
      if (!p || typeof p.name !== 'string' || !p.id) throw new Error('Code invalide.');
      p.name = p.name.slice(0, 16);
      p.coins = Math.max(0, Math.min(1e6, +p.coins || 0));
      migrate(p);
      const same = data.profiles[p.id];
      if (!same) {
        let n = p.name, k = 2;
        while (this.list().some((q) => q.name.toLowerCase() === n.toLowerCase())) n = p.name.slice(0, 13) + ' ' + k++;
        p.name = n;
        data.order.push(p.id);
      }
      data.profiles[p.id] = p;
      data.active = p.id;
      save();
      return p;
    },
  };
})();

/* ---------------------------------------------------------------------
   INTERFACE
   --------------------------------------------------------------------- */
OT.UI = (function () {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const wp = OT.Save.wp;
  let current = null;
  let focusIdx = 0;
  let dlg = null;
  let pendingMode = 'solo';
  let p2Id = null;               // profil du joueur 2 (null = invité)
  let lastComplete = null;
  let toastT = 0;
  let regColor = 'bleu';
  let regFor = 'p1';             // on crée un profil pour J1 ou pour J2
  let confirmDel = null;
  let keysTab = { player: 0, dev: 'kb' };
  let quiz = null;
  let shopFor = 'p1', shopTab = 'char';
  let galTab = 'play', galSel = null;
  let curWorld = 1;              // le monde affiché dans le choix des niveaux
  let board = { w: 1, i: 0 };    // niveau affiché dans le classement
  let installEvt = null;         // proposition d'installation (Android / PC)
  const WDATA = (w) => OT.WORLD_DATA[w || curWorld] || OT.WORLD_DATA[1];
  const MENU_SCREENS = ['title', 'mode', 'p2', 'worlds', 'levels', 'shop', 'carnet', 'profiles', 'register', 'quiz', 'quizresult', 'chapter', 'soon', 'board', 'online', 'controls', 'keys'];
  const frameHooks = {};         // écrans qui lisent eux-mêmes les manettes (ex. « Appuie pour rejoindre »)

  /* ---------- Afficher un écran ---------- */
  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => (s.hidden = true));
    current = id ? $('#screen-' + id) : null;
    if (current) {
      current.hidden = false;
      if (renderers[id]) renderers[id]();
      const items = navItems();
      focusIdx = Math.max(0, items.findIndex((b) => b.dataset.default !== undefined));
      paintFocus();
    }
    const st = OT.Game.state;
    const inGame = !id && st !== 'idle' && st !== 'cine';
    const partyOn = OT.Game.mode === 'party';
    $('#hud').hidden = !inGame || partyOn;
    // Soirée OSWEL : son bandeau reste visible seulement pendant le jeu
    const arenaOn = !!(OT.Arena && OT.Arena.active);
    $('#ahud').hidden = !arenaOn || !!id;
    if (id) { $('#acount').hidden = true; $('#abanner').hidden = true; }
    $('#bubbles').hidden = !!id;   // pas de bulles du jeu derrière les menus
    layoutTouch(inGame && !partyOn);
    if (id !== 'shop' && id !== 'title' && id !== 'gallery') Preview.stop();
    if (id && MENU_SCREENS.includes(id) && st !== 'pause' && OT.Music) OT.Music.play('menu');
  }
  function navItems() {
    if (!current) return [];
    return Array.from(current.querySelectorAll('[data-nav]')).filter((b) => !b.disabled && b.offsetParent !== null);
  }
  function paintFocus() {
    if (current) current.querySelectorAll('.focus').forEach((el) => el.classList.remove('focus'));
    const items = navItems();
    if (focusIdx >= items.length) focusIdx = items.length - 1;
    items.forEach((b, i) => b.classList.toggle('focus', i === focusIdx));
    if (items[focusIdx]) items[focusIdx].scrollIntoView({ block: 'nearest' });
    // boutique : l'objet sélectionné s'essaie tout de suite sur le personnage
    if (current && current.id === 'screen-shop' && items[focusIdx] && items[focusIdx].dataset.try) shopTry(items[focusIdx]);
    // galerie : le personnage sélectionné s'affiche en grand avec son rôle
    if (current && current.id === 'screen-gallery' && items[focusIdx] && items[focusIdx].dataset.gal) galShow(items[focusIdx].dataset.gal);
  }
  function rerender() { const keep = focusIdx; if (current && renderers[current.id.slice(7)]) renderers[current.id.slice(7)](); focusIdx = keep; paintFocus(); }

  const coinSvg = '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="#ffcc33"/><circle cx="8" cy="8" r="4.6" fill="none" stroke="#a86b00" stroke-width="1.4"/></svg>';
  const colorHex = (id) => '#' + ((OT.SHOP.colors.find((c) => c.id === id) || OT.SHOP.colors[0]).hex).toString(16).padStart(6, '0');
  const levelCoins = (w, i) => WDATA(w).levels[i].build.ents.filter((e) => e.type === 'coin').length;
  const MEDAL_NAME = { or: 'Or', argent: 'Argent', bronze: 'Bronze' };
  const MEDAL_RANK = { or: 3, argent: 2, bronze: 1 };
  const medalHtml = (rec) => rec && rec.medal ? `<span class="md ${rec.medal}" title="Médaille ${MEDAL_NAME[rec.medal]}"></span>` : '';
  const nofallHtml = (rec) => rec && rec.nofall ? '<span class="nofall" title="Sans chute">✦</span>' : '';
  const isTyping = () => document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);

  /* ---------- Contenu dynamique des écrans ---------- */
  const renderers = {
    title() {
      const p = OT.Save.active;
      $('#who-chip').innerHTML = p
        ? `<span class="dot" style="background:${colorHex(p.skin.color)}"></span><b>${esc(p.name)}</b><span class="coins">${coinSvg}${p.coins}</span>`
        : 'Aucun profil';
      const standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
      // version PC (Electron) ou application Android : le jeu est déjà installé ; la version PC a un bouton « Quitter »
      const app = !!(window.OTDesktop || window.Capacitor);
      $('#btn-install').hidden = app || standalone || !(installEvt || matchMedia('(pointer: coarse)').matches);
      if ($('#btn-quit')) $('#btn-quit').hidden = !window.OTDesktop;
      $('#title-foot').textContent = `Version ${OT.VERSION} · ${Object.keys(OT.WORLD_DATA).length} mondes jouables · par OSWEL OFFICIEL`;
      // le personnage du joueur à droite (grands écrans seulement : sur téléphone, le menu prend toute la place)
      const th = $('#title-hero');
      if (p && th && th.offsetWidth > 120 && th.offsetHeight > 160) Preview.show(th, OT.Save.skinOf(p), { spin: 0.45, dist: 5.2 }); else Preview.stop();
    },
    register() {
      const box = $('#reg-colors');
      box.innerHTML = OT.FREE_COLORS.map((id) => {
        const c = OT.SHOP.colors.find((x) => x.id === id);
        return `<button class="swatch${id === regColor ? ' on' : ''}" data-nav data-act="regColor:${id}" style="--c:${colorHex(id)}" aria-label="${c.name}"><span></span>${c.name}</button>`;
      }).join('');
      $('#reg-cancel').hidden = OT.Save.list().length === 0;
      $('#reg-for').textContent = regFor === 'p2' ? 'Profil du joueur 2' : 'Nouveau joueur';
    },
    profiles() {
      const list = OT.Save.list();
      const act = OT.Save.data.active;
      $('#profile-list').innerHTML = list.map((p) => `
        <div class="prow${p.id === act ? ' active' : ''}">
          <button class="pcard" data-nav data-act="selectProfile:${p.id}">
            <span class="dot big" style="background:${colorHex(p.skin.color)}"></span>
            <span class="pinfo"><b>${esc(p.name)}</b><small>${OT.Save.levelsDone(p)} niveaux · ${coinSvg}${p.coins} · ${p.deaths} chutes</small></span>
            ${p.id === act ? '<em>Actif</em>' : ''}
          </button>
          <button class="btn ghost small" data-nav data-act="askDelete:${p.id}">Supprimer</button>
        </div>`).join('') || '<p class="muted">Aucun profil pour l\'instant.</p>';
      const c = $('#confirm-del');
      c.hidden = !confirmDel;
      if (confirmDel) $('#confirm-name').textContent = OT.Save.prof(confirmDel).name;
    },
    p2() {
      const list = OT.Save.list().filter((p) => p.id !== OT.Save.data.active);
      $('#p2-list').innerHTML = `<button class="pcard" data-nav data-default data-act="pickP2:guest"><span class="dot big" style="background:#ff8a2b"></span><span class="pinfo"><b>Invité (L'Écho)</b><small>Ne sauvegarde rien</small></span></button>`
        + list.map((p) => `<button class="pcard" data-nav data-act="pickP2:${p.id}"><span class="dot big" style="background:${colorHex(p.skin.color)}"></span><span class="pinfo"><b>${esc(p.name)}</b><small>${coinSvg}${p.coins} · ${OT.Save.levelsDone(p)} niveaux</small></span></button>`).join('');
    },
    worlds() {
      const p = OT.Save.active;
      let firstOpen = null;
      $('#world-list').innerHTML = OT.WORLDS.map((w) => {
        const has = !!OT.WORLD_DATA[w.id];
        const open = OT.Save.worldOpen(p, w.id);
        const prog = open ? `${Object.keys(wp(p, w.id).done).filter((k) => +k < 10).length}/10 niveaux${wp(p, w.id).quiz.passed ? ' · quiz réussi' : ''}` : has ? `Réussis le quiz du Monde ${w.id - 1} pour l'ouvrir` : 'Bientôt';
        // par défaut : le dernier monde ouvert
        if (open) firstOpen = w.id;
        return `<button class="world${open ? '' : ' locked'}" data-nav data-w="${w.id}" data-act="${open ? 'openWorld:' + w.id : 'lockedWorld:' + w.id}">
          <span class="wimg" style="background-image:url('${OT.IMG ? OT.IMG[w.id] : w.img}')"></span>
          <span class="wtxt"><span class="wn">Monde ${w.id}</span><b>${w.name}</b><small>« ${w.motto} »</small><em>${prog}</em></span>
        </button>`;
      }).join('');
      const def = $(`#world-list [data-w="${firstOpen || 1}"]`);
      if (def) def.dataset.default = '';
      $('#worlds-mode').textContent = modeLabel();
    },
    levels() {
      const p = OT.Save.active;
      const W = WDATA(), P = wp(p, curWorld);
      $('#levels-kicker').textContent = `Monde ${curWorld} · Mode ${modeLabel()}`;
      $('#levels-title').textContent = W.name;
      const topic = { 1: 'de mécanique', 2: 'de programmation', 3: 'de sciences et d\'ingénierie', 4: 'sur les technologies et les idées', 5: 'pour créer son activité' }[curWorld] || '';
      $('#levels-motto').textContent = `« ${W.motto}. » Chaque niveau terminé t'apprend une vraie leçon ${topic}.`;
      const box = $('#level-grid');
      box.innerHTML = '';
      W.levels.forEach((lv, i) => {
        // version 1.5 : le niveau SECRET (index 10) n'apparaît que lorsqu'une quête l'a débloqué
        if (lv.secret && !(OT.Quests && OT.Quests.secretOpen(p, curWorld))) return;
        const b = document.createElement('button');
        const done = P.done[i];
        b.className = 'lvl' + (lv.boss ? ' boss' : '') + (lv.secret ? ' secret' : '') + (done ? ' done' : '');
        b.dataset.nav = '';
        const locked = !lv.secret && i >= P.unlocked;
        b.disabled = locked;
        const got = (P.collected[i] || []).length, tot = levelCoins(curWorld, i);
        b.innerHTML = `<span class="n">${lv.boss ? 'BOSS' : lv.secret ? '★ SECRET' : curWorld + '-' + (i + 1)}${medalHtml(done)}${nofallHtml(done)}${OT.Stars ? OT.Stars.html(p, curWorld, i) : ''}</span>
          <span class="t">${locked ? 'Verrouillé' : esc(lv.title)}</span>
          <span class="s">${locked ? '' : `${coinSvg}${got}/${tot}`}${done && (done.v || 0) === OT.LAYOUT_V ? ` · ${fmtShort(done.time)}` : ''}</span>`;
        b.onclick = () => startLevel(i);
        box.appendChild(b);
      });
      const quizBtn = $('#btn-quiz');
      quizBtn.hidden = !P.done[9];
      quizBtn.textContent = P.quiz.passed ? `Refaire le quiz (meilleur : ${P.quiz.best}/10)` : `Passer le quiz : ${W.name}`;
      $('#btn-intro').hidden = !W.intro;
      setTimeout(() => { const items = navItems(); focusIdx = Math.min(items.length - 1, Math.max(0, Math.min(9, P.unlocked - 1))); paintFocus(); }, 0);
    },
    shop() {
      const p = shopP();
      $('#shop-who').textContent = p.name;
      $('#shop-coins').innerHTML = coinSvg + p.coins;
      // une carte d'objet : icône, nom, rareté, prix ou état (acheté / équipé)
      const card = (kind, it, extra = {}) => {
        const owned = ownedList(p, kind).includes(it.id) || it.price === 0;
        const eq = (p.skin[SKIN_KEY[kind]] || DEF_EQ[kind]) === it.id;
        const locked = !!extra.locked;
        const rar = OT.rarityOf(it), R = OT.RARITY[rar];
        const state = eq ? (kind === 'gad' ? 'Porté' : 'Équipé') : owned ? (kind === 'gad' ? 'Porter' : 'Équiper') : locked ? extra.lockTxt : `${coinSvg}${it.price}`;
        const ic = kind === 'color' ? `<span class="dot big" style="background:${colorHex(it.id)}"></span>`
          : kind === 'acc' ? `<span class="acc-ic">${accIcon(it.id)}</span>` : `<span class="acc-ic emo">${it.icon || '✦'}</span>`;
        return `<button class="item r-${rar}${eq ? ' eq' : ''}${owned ? ' own' : ''}${locked ? ' locked' : ''}${!locked && !owned && p.coins < it.price ? ' poor' : ''}" style="--rc:${R.color}" data-nav data-act="shopItem:${kind}:${it.id}" data-try="${kind}:${it.id}">${ic}<span class="iname">${esc(it.name)}</span><span class="iprice">${state}</span><span class="rar">${R.name}</span></button>`;
      };
      // les 4 personnages (gratuits)
      $('#shop-char').innerHTML = OT.Chars.LIST.map((c) => {
        const eq = (p.skin.char || 'oswel') === c.id, col = '#' + c.accent.toString(16).padStart(6, '0');
        return `<button class="item charcard${eq ? ' eq' : ''}" style="--rc:${col}" data-nav data-act="shopItem:char:${c.id}" data-try="char:${c.id}"><span class="cc-name">${c.name}</span><span class="cc-uni">${esc(c.univers)}</span><span class="iprice">${eq ? 'Choisi' : 'Choisir'}</span></button>`;
      }).join('');
      $('#shop-colors').innerHTML = OT.SHOP.colors.map((c) => card('color', c)).join('');
      $('#shop-acc').innerHTML = OT.SHOP.accessories.map((a) => card('acc', a)).join('');
      // gadgets : rangés par monde, achetables seulement une fois arrivé dans le monde
      $('#shop-gad').innerHTML = OT.WORLDS.filter((w) => OT.SHOP.gadgets.some((g) => g.w === w.id)).map((w) => {
        const open = OT.Save.worldOpen(p, w.id);
        const items = OT.SHOP.gadgets.filter((g) => g.w === w.id).map((it) => card('gad', it, { locked: !open && !p.owned.gad.includes(it.id), lockTxt: `🔒 Monde ${w.id}` })).join('');
        return `<h4 class="gadw${open ? '' : ' locked'}">Monde ${w.id} · ${w.name}${open ? '' : ' — arrive dans ce monde pour débloquer'}</h4><div class="items">${items}</div>`;
      }).join('');
      $('#shop-fx').innerHTML = OT.SHOP.fx.map((it) => card('fx', it)).join('');
      $('#shop-win').innerHTML = OT.SHOP.wins.map((it) => card('win', it)).join('');
      $('#shop-emote').innerHTML = OT.SHOP.emotes.map((it) => card('emote', it)).join('');
      const nOpen = OT.SHOP.gadgets.filter((g) => g.id !== 'aucun' && OT.Save.worldOpen(p, g.w)).length;
      $('#shop-gad-n').textContent = `${nOpen}/${OT.SHOP.gadgets.length - 1}`;
      document.querySelectorAll('#shop-tabs .tab').forEach((t) => t.classList.toggle('on', t.dataset.stab === shopTab));
      document.querySelectorAll('#screen-shop .ssec').forEach((sec) => { sec.hidden = sec.dataset.sec !== shopTab; });
      $('#shop-switch').hidden = !p2Id;
      shopTry(null);
    },
    gallery() {
      const all = galleryData();
      ['play', 'story', 'boss'].forEach((k) => { $('#gal-n-' + k).textContent = all.filter((g) => g.group === k).length; });
      document.querySelectorAll('#gal-tabs .tab').forEach((t) => t.classList.toggle('on', t.dataset.gtab === galTab));
      $('#gal-list').innerHTML = all.filter((g) => g.group === galTab).map((g) =>
        `<button class="gcard${g.id === galSel ? ' on' : ''}" style="--gc:${hexCss(g.color)}" data-nav data-gal="${g.id}" data-act="galPick:${g.id}"><span class="gi">${esc(g.name.charAt(0))}</span><b>${esc(g.name)}</b><small>${esc(g.role)}</small></button>`).join('');
      galShow(galSel && all.some((g) => g.id === galSel && g.group === galTab) ? galSel : (all.find((g) => g.group === galTab) || {}).id);
    },
    options() {
      const s = OT.settings;
      $('#opt-diff').textContent = s.difficulty === 'facile' ? 'Facile (drapeaux, plus de temps, sans médaille)' : 'Normale';
      $('#opt-vib').textContent = s.vibration ? 'Activées' : 'Coupées';
      $('#opt-vibs').textContent = Math.round(s.vibStrength * 100) + ' %';
      $('#opt-vol').textContent = Math.round(s.volume * 100) + ' %';
      $('#opt-music').textContent = Math.round(s.music * 100) + ' %';
      $('#opt-master').textContent = Math.round((s.master !== undefined ? s.master : 1) * 100) + ' %';
      $('#opt-voicevol').textContent = Math.round((s.voiceVol !== undefined ? s.voiceVol : 0.9) * 100) + ' %';
      $('#opt-voices').textContent = s.voices !== false ? 'Activées' : 'Coupées';
      $('#opt-subs').textContent = s.subtitles !== false ? 'Affichés' : 'Cachés';
      $('#opt-tts').textContent = s.ttsFallback !== false ? 'Oui' : 'Non';
      $('#opt-ghost').textContent = s.ghost ? 'Activé' : 'Coupé';
      speedRow();
      $('#opt-light').textContent = !OT.Light || !OT.Light.supported ? 'Non disponible ici (Chrome/Edge sur PC)' : OT.Light.count ? (s.lightbar ? `Activé (${OT.Light.count} manette${OT.Light.count > 1 ? 's' : ''})` : 'Lumière coupée') : 'Connecter la manette…';
      $('#opt-shadows').textContent = s.shadows ? 'Activées' : 'Coupées (plus rapide)';
      $('#opt-camsens').textContent = Math.round((s.camSens || 1) * 100) + ' %';
      $('#opt-caminv').textContent = s.camInvert ? 'Inversé' : 'Normal';
      $('#opt-camrec').textContent = s.camRecenter !== false ? 'Oui (après 3 s)' : 'Non (la caméra reste où on la met)';
      $('#opt-camtrig').textContent = s.camTriggers === 'run' ? 'R2 = courir (ancien réglage)' : 'R2 zoom avant · L2 zoom arrière';
      $('#opt-swap').textContent = s.swapPads ? 'Manette 1 → Joueur 2' : 'Manette 1 → Joueur 1';
      $('#opt-touch').textContent = { auto: 'Automatique', on: 'Toujours', off: 'Jamais' }[s.touchMode];
      $('#opt-touch2p').textContent = s.touch2p ? 'Oui (écran partagé)' : 'Non';
      $('#opt-touchsize').textContent = { discret: 'Discrets (petits, transparents)', normal: 'Normaux', grand: 'Grands' }[s.touchSize || 'discret'];
      $('#opt-online').textContent = s.server ? 'Serveur réglé →' : 'Code de sauvegarde, serveur →';
      padsStatus();
      // la ligne se met à jour toute seule : on voit la manette apparaître dès qu'on appuie sur un bouton
      clearInterval(padsTimer);
      padsTimer = setInterval(() => { if ($('#screen-options').hidden) clearInterval(padsTimer); else padsStatus(); }, 700);
    },
    keys() {
      const B = OT.fixBinds ? OT.fixBinds(OT.settings.binds) : OT.settings.binds;
      const { player, dev } = keysTab;
      document.querySelectorAll('[data-keytab]').forEach((b) => b.classList.toggle('on', b.dataset.keytab === player + ':' + dev));
      const rows = dev === 'kb'
        ? ['left', 'right', 'jump', 'talk', 'run'].concat(OT.Gadgets || OT.TonyPowers ? ['gadget'] : []).map((a) => ({ a, v: (B.kb[player][a] || []).map(OT.Input.keyLabel).join(' / ') || '—' }))
        : ['jump', 'talk', 'run'].concat(OT.Gadgets || OT.TonyPowers ? ['gadget'] : []).map((a) => ({ a, v: OT.Input.padLabel(B.pad[player][a]) }));
      $('#key-rows').innerHTML = rows.map((r) => `<button class="opt" data-nav data-act="bind:${r.a}"><span>${OT.ACTION_NAMES[r.a]}</span><b class="kbd">${esc(r.v)}</b></button>`).join('')
        + (dev === 'pad' ? '<p class="muted small">Bouger : joystick gauche ou croix directionnelle. Pause : OPTIONS. Caméra : joystick droit (tourner), R2 (zoom avant), L2 (zoom arrière), pavé tactile en mode direct. Option « Gâchettes L2 / R2 » pour courir avec R2 comme avant.</p>' : '<p class="muted small">Pause : Échap ou P. Les menus utilisent toujours les flèches, Entrée et Échap.</p>');
    },
    controls() {
      const B = OT.fixBinds ? OT.fixBinds(OT.settings.binds) : OT.settings.binds;
      const k = (p, a) => (B.kb[p][a] || []).map(OT.Input.keyLabel).join(' · ');
      const pd = (p, a) => OT.Input.padLabel(B.pad[p][a]);
      $('#ctrl-body').innerHTML = [
        ['Bouger', 'Joystick gauche ou croix', `${k(0, 'left')} / ${k(0, 'right')}`, `${k(1, 'left')} / ${k(1, 'right')}`],
        ['Sauter', pd(0, 'jump'), k(0, 'jump'), k(1, 'jump')],
        ['Courir', pd(0, 'run') + (OT.Input.trigRun() ? ' ou R2 (progressif)' : ''), k(0, 'run'), k(1, 'run')],
        ['Action (parler, ouvrir une caisse, entrer dans une porte)', pd(0, 'talk'), k(0, 'talk'), k(1, 'talk')],
        ...(OT.Gadgets || OT.TonyPowers ? [['Pouvoir de Tony (appui court = utiliser · maintenir = changer)', pd(0, 'gadget'), k(0, 'gadget'), k(1, 'gadget')]] : []),
        ['Pause', 'OPTIONS', 'Échap ou P', 'Échap'],
        ['Tourner la caméra', 'Joystick droit · pavé tactile (mode direct)', 'Souris : glisser', 'Écran : glisser un doigt'],
        ['Zoomer', OT.Input.trigRun() ? '(gâchettes réglées sur « courir »)' : 'R2 avant · L2 arrière', 'Molette', 'Écran : pincer à deux doigts'],
        ['Recentrer la caméra', 'Lâcher le joystick (retour seul)', 'Double-clic', 'Double tap'],
      ].map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
    },
    carnet() {
      const p = OT.Save.active;
      let html = '';
      for (const w of OT.WORLDS) {
        if (!OT.WORLD_DATA[w.id] || !OT.Save.worldOpen(p, w.id)) continue;
        const L = WDATA(w.id).levels, P = wp(p, w.id);
        const frags = L.map((lv, i) => lv.secret && !P.fragments.includes(i) ? '' : P.fragments.includes(i)
          ? `<li><span class="k">${w.id}-${i + 1} · ${esc(lv.title)}</span><p>${esc(lv.fragment)}</p></li>`
          : `<li class="locked"><span class="k">${w.id}-${i + 1}</span><p>Fragment verrouillé</p></li>`).join('');
        const lessons = L.map((lv, i) => !lv.secret && P.learned.includes(i)
          ? `<li><span class="k">Leçon ${i + 1}</span><b>${esc(lv.teach.title)}</b><p>${esc(lv.teach.text)}</p></li>` : '').join('');
        const ch = OT.CHAPTERS[w.id - 1];
        const chap = p.chapters.includes(w.id) && ch
          ? `<button class="btn" data-nav data-act="readChapter:${w.id}">Relire le Chapitre ${w.id} — ${esc(ch.title)}</button>`
          : `<p class="muted">Termine le Monde ${w.id} et réussis le quiz (${OT.QUIZ_PASS}/10) pour débloquer le Chapitre ${w.id}.</p>`;
        // fiches des personnages (ceux qui ont un profil) : débloquées quand on termine leur niveau
        const people = [];
        L.forEach((lv, i) => Object.keys(lv.dialogs || {}).forEach((id) => {
          const c = OT.CHARACTERS[id];
          if (c && c.profile && !people.some((x) => x.id === id)) people.push({ id, c, i: c.profile.met ? +c.profile.met.split('-')[1] - 1 : i });
        }));
        people.sort((a, b) => (b.c.profile.power ? 1 : 0) - (a.c.profile.power ? 1 : 0));   // le personnage principal d'abord, son assistant ensuite
        const fiches = people.map(({ c, i }) => (P.done[i] ? ficheHtml(c) : `<p class="fiche-lock">🔒 <b>${esc(c.name)}</b> — termine le niveau ${w.id}-${i + 1} pour débloquer sa fiche.</p>`)).join('');
        html += `<section class="cworld"><h3>Monde ${w.id} — ${esc(w.name)}</h3>${chap}
          ${fiches ? `<h4>Personnages</h4><div class="fiches">${fiches}</div>` : ''}
          <h4>Ce que j'ai appris</h4>${lessons ? `<ol class="lessons">${lessons}</ol>` : '<p class="muted">Termine un niveau pour apprendre ta première leçon.</p>'}
          <h4>Fragments de l'histoire</h4><ol class="frags">${frags}</ol></section>`;
      }
      $('#carnet-list').innerHTML = (OT.JournalUI ? OT.JournalUI.carnetHtml(p) : '') + (OT.TonyPowers ? OT.TonyPowers.carnetHtml(p) : '') + html + `<p class="muted">Chutes au total : <b>${p.deaths}</b></p>`;
    },
    board() {
      const W = WDATA(board.w), lv = W.levels[board.i];
      $('#board-level').textContent = `${board.w}-${board.i + 1} · ${lv.title}`;
      $('#board-par').textContent = `Temps de référence (médaille d'or) : ${fmtShort(lv.par)} · argent : ${fmtShort(lv.par * 1.6)}`;
      // les temps de l'ancienne version (niveaux courts) passent après, sans rang
      const isOld = (r) => (r.rec.v || 0) !== OT.LAYOUT_V;
      const rows = OT.Save.list().map((p) => ({ name: p.name, rec: wp(p, board.w).done[board.i] })).filter((x) => x.rec)
        .sort((a, b) => (isOld(a) - isOld(b)) || (a.rec.time - b.rec.time));
      let rk = 0;
      $('#board-local').innerHTML = rows.length
        ? rows.map((r) => `<li${isOld(r) ? ' class="old"' : ''}><span class="rk">${isOld(r) ? '–' : ++rk}</span><b>${esc(r.name)}</b>${medalHtml(r.rec)}${nofallHtml(r.rec)}<span class="tm">${fmtTime(r.rec.time)}</span><small>${isOld(r) ? 'ancienne version du niveau' : `${r.rec.deaths} chute${r.rec.deaths > 1 ? 's' : ''}${r.rec.easy ? ' · facile' : ''}`}</small></li>`).join('')
        : '<li class="muted">Personne n\'a encore terminé ce niveau sur cet appareil.</li>';
    },
    online() {
      const s = OT.settings;
      $('#srv-url').value = s.server || '';
      $('#srv-status').textContent = s.server ? 'Serveur réglé. Les meilleurs temps (mode normal) y sont envoyés.' : 'Aucun serveur : le jeu reste entièrement hors ligne.';
      $('#cloud-box').hidden = !s.server;
    },
    bug() {
      $('#bug-info').textContent = bugInfoText();
      $('#bug-send').hidden = !OT.Net || !OT.Net.enabled;
      $('#bug-hint').textContent = OT.Net && OT.Net.enabled
        ? 'Envoie le rapport au serveur, ou copie-le pour l\'envoyer à Oswel.'
        : 'Copie le rapport et envoie-le à Oswel (WhatsApp, e-mail…).';
    },
  };

  function accIcon(id) {
    const s = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
    return {
      aucun: s('<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 18L18 6" stroke="currentColor" stroke-width="2"/>'),
      antenne: s('<path d="M12 22V8" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="6" r="3" fill="#ff3020"/>'),
      casquette: s('<path d="M4 15a8 8 0 0 1 16 0z" fill="#d23a2a"/><path d="M12 15h10" stroke="#d23a2a" stroke-width="3"/>'),
      echarpe: s('<path d="M4 9h16v4H4z" fill="#d8392b"/><path d="M14 13h4v8h-4z" fill="#d8392b"/>'),
      casque: s('<path d="M3 16a9 9 0 0 1 18 0z" fill="#f2c230"/><rect x="2" y="15" width="20" height="3" fill="#f2c230"/>'),
      lunettes: s('<circle cx="7" cy="12" r="4" fill="#2e7d5b"/><circle cx="17" cy="12" r="4" fill="#2e7d5b"/><path d="M11 12h2" stroke="currentColor" stroke-width="2"/>'),
      couronne: s('<path d="M3 18l2-11 4 5 3-7 3 7 4-5 2 11z" fill="#ffcc33"/>'),
    }[id] || '';
  }

  function modeLabel() { return { solo: 'Solo', coop: 'Coopération', versus: 'Versus' }[pendingMode]; }

  /* ---------- Lancer un niveau ---------- */
  function whoInfo(levelIdx) {
    const p1 = OT.Save.active;
    const info = [{ name: p1.name, skin: OT.Save.skinOf(p1), collected: new Set(wp(p1, curWorld).collected[levelIdx] || []) }];
    if (pendingMode !== 'solo') {
      const p2 = p2Id ? OT.Save.prof(p2Id) : null;
      info.push(p2 ? { name: p2.name, skin: OT.Save.skinOf(p2), collected: new Set(wp(p2, curWorld).collected[levelIdx] || []) }
        : { name: "L'Écho", skin: { color: p1.skin.color === 'orange' ? 0x3d8bff : 0xff8a2b, acc: 'antenne', char: (p1.skin.char || 'oswel') === 'nexa' ? 'byte' : 'nexa' }, collected: new Set(), guest: true });
    }
    return info;
  }
  function startLevel(i) {
    OT.Sound.ok();
    show(null);
    OT.Game.play(pendingMode, i, whoInfo(i), false, curWorld);
    show(null);
  }

  /* ---------- Cinématique d'introduction d'un monde ---------- */
  function playIntro(w, then) {
    const sc = WDATA(w).intro;
    if (!sc || !sc.length) { then && then(); return; }
    show(null);
    $('#cine').hidden = false;
    OT.Game.cinematic(w, sc, () => {
      $('#cine').hidden = true;
      const p = OT.Save.active;
      if (p) { p.seenIntro[w] = true; OT.Save.save(); }
      OT.Game.showBackdrop(w);
      then && then();
    });
  }
  function cineText(text, i, n) {
    const el = $('#cine-text');
    if (text === null || text === undefined) { el.classList.remove('on'); return; }
    el.classList.remove('on'); void el.offsetWidth;
    el.textContent = text; el.classList.add('on');
    $('#cine-step').textContent = `${i + 1} / ${n}`;
  }

  /* ---------- Actions des boutons ---------- */
  const actions = {
    play: () => show('mode'),
    mode: (m) => { pendingMode = m; if (m === 'solo') { p2Id = null; show('worlds'); } else show('p2'); },
    pickP2: (id) => { p2Id = id === 'guest' ? null : id; show('worlds'); },
    newP2: () => { regFor = 'p2'; regColor = 'orange'; show('register'); },
    openWorld: (w) => {
      curWorld = +w || 1;
      const p = OT.Save.active;
      OT.Game.showBackdrop(curWorld);
      if (p && !p.seenIntro[curWorld] && WDATA().intro) playIntro(curWorld, () => show('levels'));
      else show('levels');
    },
    replayIntro: () => playIntro(curWorld, () => show('levels')),
    lockedWorld: (w) => toast(OT.WORLD_DATA[w] ? `Réussis le quiz du Monde ${w - 1} pour ouvrir le Monde ${w}.` : 'Ce monde arrive dans une prochaine version.'),
    carnet: () => show('carnet'),
    gallery: () => show('gallery'),
    galTab: (t) => { galTab = t; galSel = null; rerender(); },
    galPick: (...a) => { galShow(a.join(':')); Preview.play('wave'); },   // les ids « pc:oswel » contiennent « : »
    shop: () => { shopFor = 'p1'; show('shop'); },
    shopSwitch: () => { shopFor = shopFor === 'p1' ? 'p2' : 'p1'; rerender(); },
    shopTab: (t) => { shopTab = t; rerender(); },
    pvPlay: (k) => Preview.play(k),
    options: () => { $('#screen-options').dataset.back = OT.Game.state === 'pause' ? 'pause' : 'title'; show('options'); },
    keys: () => show('keys'),
    controls: () => show('controls'),
    online: () => show('online'),
    board: () => { board = { w: curWorld, i: Math.max(0, Math.min(9, (wp(OT.Save.active, curWorld).unlocked || 1) - 1)) }; show('board'); loadOnlineBoard(); },
    boardMove: (d) => {
      const worlds = Object.keys(OT.WORLD_DATA).map(Number).sort();
      let k = worlds.indexOf(board.w) * 10 + board.i + (+d);
      const n = worlds.length * 10;
      k = (k + n) % n;
      board = { w: worlds[Math.floor(k / 10)], i: k % 10 };
      rerender(); loadOnlineBoard();
    },
    bug: () => { $('#screen-bug').dataset.back = OT.Game.state === 'pause' ? 'pause' : 'options'; $('#bug-text').value = ''; show('bug'); },
    bugCopy: () => copyText(bugReportText(), 'Rapport copié. Colle-le dans un message pour Oswel.'),
    bugSend: () => {
      const text = $('#bug-text').value.trim();
      if (text.length < 5) { toast('Décris le problème en quelques mots d\'abord.'); return; }
      toast('Envoi…');
      OT.Net.bug({ text: text.slice(0, 4000), info: bugInfo() }).then(() => { toast('Merci ! Le bug a été envoyé.'); $('#bug-text').value = ''; }).catch((e) => toast(e.message));
    },
    srvSave: () => {
      let u = $('#srv-url').value.trim();
      if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
      OT.settings.server = u.replace(/\/+$/, '');
      OT.Save.save(); rerender();
      toast(u ? 'Adresse du serveur enregistrée.' : 'Serveur retiré : le jeu reste hors ligne.');
    },
    srvTest: () => {
      actions.srvSave();
      if (!OT.settings.server) return;
      $('#srv-status').textContent = 'Test en cours…';
      OT.Net.ping().then((r) => { $('#srv-status').textContent = `Connecté : ${r.name || 'serveur Oswel\'s Trap'} (${r.scores || 0} scores enregistrés).`; })
        .catch((e) => { $('#srv-status').textContent = 'Échec : ' + e.message; });
    },
    codeExport: () => { $('#save-code').value = OT.Save.exportCode(OT.Save.active); toast('Voici ton code. Copie-le et garde-le précieusement.'); },
    codeCopy: () => { if (!$('#save-code').value) actions.codeExport(); copyText($('#save-code').value, 'Code de sauvegarde copié.'); },
    codeImport: () => {
      try { const p = OT.Save.importCode($('#save-code').value); toast(`Profil « ${p.name} » importé et sélectionné.`); $('#save-code').value = ''; }
      catch (e) { toast(e.message); }
    },
    cloudPush: () => {
      $('#cloud-status').textContent = 'Envoi…';
      OT.Net.pushSave(OT.Save.exportCode(OT.Save.active)).then((r) => { $('#cloud-status').innerHTML = `Ton code : <b class="bigcode">${esc(r.code)}</b> — tape-le sur l'autre appareil.`; })
        .catch((e) => { $('#cloud-status').textContent = 'Échec : ' + e.message; });
    },
    cloudPull: () => {
      const code = $('#cloud-code').value.trim();
      if (code.length < 4) { toast('Tape le code reçu (6 caractères).'); return; }
      $('#cloud-status').textContent = 'Récupération…';
      OT.Net.pullSave(code).then((r) => { const p = OT.Save.importCode(r.data); $('#cloud-status').textContent = `Profil « ${p.name} » récupéré et sélectionné.`; })
        .catch((e) => { $('#cloud-status').textContent = 'Échec : ' + e.message; });
    },
    install: async () => {
      if (installEvt) { installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; rerender(); return; }
      toast('Dans Chrome : menu ⋮ → « Installer l\'application » (ou « Ajouter à l\'écran d\'accueil »).');
    },
    profiles: () => { confirmDel = null; show('profiles'); },
    newProfile: () => { regFor = 'p1'; regColor = 'bleu'; show('register'); },
    selectProfile: (id) => { OT.Save.select(id); OT.Sound.ok(); show('title'); },
    askDelete: (id) => { confirmDel = id; rerender(); },
    confirmDelete: () => { if (confirmDel) { OT.Save.remove(confirmDel); confirmDel = null; } if (!OT.Save.list().length) { regFor = 'p1'; show('register'); } else rerender(); },
    cancelDelete: () => { confirmDel = null; rerender(); },
    regColor: (id) => { regColor = id; rerender(); },
    regRandom: () => { $('#reg-name').value = randomName(); },
    regCreate: () => {
      const name = $('#reg-name').value.trim().replace(/\s+/g, ' ');
      if (name.length < 2) { $('#reg-error').textContent = 'Choisis un pseudo d\'au moins 2 lettres (ou « Nom au hasard »).'; $('#reg-name').focus(); return; }
      if (OT.Save.list().some((p) => p.name.toLowerCase() === name.toLowerCase())) { $('#reg-error').textContent = 'Ce pseudo existe déjà sur cet appareil.'; return; }
      $('#reg-error').textContent = '';
      const keepActive = OT.Save.data.active;
      const p = OT.Save.create(name.slice(0, 16), regColor);
      $('#reg-name').value = '';
      OT.Sound.buy();
      if (regFor === 'p2') { OT.Save.select(keepActive); p2Id = p.id; show('worlds'); }
      else show('title');
    },
    regCancel: () => show(regFor === 'p2' ? 'p2' : 'profiles'),
    regImport: () => { show('online'); toast('Colle ton code de sauvegarde puis « Importer ce code ».'); },
    back: () => {
      const back = current && current.dataset.back;
      if (back === 'game') { resume(); return; }
      if (back) show(back);
    },
    fullscreen: () => (window.OTDesktop ? window.OTDesktop.pleinEcran() : goFullscreen()),
    quitApp: () => { if (window.OTDesktop) window.OTDesktop.quitter(); },
    resume: () => resume(),
    restart: () => { show(null); OT.Game.restart(); show(null); },
    quit: () => { OT.Game.quit(); show('title'); },
    title: () => { if (OT.Arena && OT.Arena.active) OT.Arena.stop(); show('title'); },
    toLesson: () => show('lesson'),
    next: () => {
      const c = lastComplete;
      if (!c) return;
      if (c.isBoss) { startQuiz(); return; }
      if (c.def && c.def.secret) { actions.menu(); return; }   // 1.5 : après un niveau secret, retour à la liste
      show(null);
      OT.Game.play(c.mode, c.index + 1, whoInfo(c.index + 1), true, c.world);
      show(null);
    },
    replay: () => { show(null); OT.Game.restart(); show(null); },
    menu: () => { OT.Game.quit(); OT.Game.showBackdrop(curWorld); show('levels'); },
    quiz: () => startQuiz(),
    quizAnswer: (i) => answerQuiz(+i),
    quizNext: () => nextQuiz(),
    readChapter: (n) => openChapter(+n || 1, true),
    chapterDone: () => {
      chapRead++; if (OT.Dialogue) OT.Dialogue.stop();
      if ($('#screen-chapter').dataset.from === 'carnet') { show('carnet'); return; }
      show('soon');
      if (!OT.WORLD_DATA[+$('#screen-chapter').dataset.n + 1] && OT.Music) OT.Music.play('ending');
    },
    shopItem: (kind, id) => buyOrEquip(kind, id),
    keyTab: (v) => { const [p, d] = v.split('-'); keysTab = { player: +p, dev: d }; rerender(); },
    bind: (action) => startBind(action),
    resetKeys: () => { OT.settings.binds = OT.DEFAULT_BINDS(); OT.Save.save(); toast('Touches par défaut rétablies.'); rerender(); },
    light: async () => {
      if (!OT.Light || !OT.Light.supported) { toast('Le mode direct PS4 demande Chrome ou Edge sur ordinateur (pas Firefox, pas Android).'); return; }
      if (!OT.Light.count) { const r = await OT.Light.connect(); toast(r.msg); if (r.ok) { OT.settings.lightbar = true; OT.Light.set(0, 0x3d8bff); OT.Light.set(1, 0xff8a2b); OT.Light.rumble(-1, 0.8, 0.8, 400); } }
      else { OT.settings.lightbar = !OT.settings.lightbar; if (OT.settings.lightbar) { OT.Light.set(0, 0x3d8bff); OT.Light.set(1, 0xff8a2b); } }
      OT.Save.save(); rerender();
    },
    // vitesse du gameplay : −1 / +1 = cran précédent / suivant, 0 = retour à 100 %
    speed: (d) => {
      const s = OT.settings, L = OT.Game.SPEEDS, cur = L.indexOf(+s.gameSpeed || 1);
      const i = +d === 0 ? L.indexOf(1) : Math.max(0, Math.min(L.length - 1, (cur < 0 ? L.indexOf(1) : cur) + (+d)));
      s.gameSpeed = L[i];
      OT.Save.save(); speedRow(); OT.Sound.menu();
    },
    opt: (k) => {
      const s = OT.settings;
      if (k === 'diff') { s.difficulty = s.difficulty === 'facile' ? 'normal' : 'facile'; toast(s.difficulty === 'facile' ? 'Mode facile : un drapeau de reprise au milieu des niveaux, plus de temps sur les mécanismes. Pas de médaille.' : 'Mode normal : médailles et classement.'); }
      if (k === 'vib') { s.vibration = !s.vibration; if (s.vibration) OT.Input.rumble(-1, 0.6, 0.6, 250); }
      if (k === 'vibs') { s.vibStrength = s.vibStrength >= 1 ? 0.25 : s.vibStrength + 0.25; OT.Input.rumble(-1, 0.8, 0.8, 250); }
      if (k === 'vol') { s.volume = s.volume >= 1 ? 0 : Math.round((s.volume + 0.2) * 10) / 10; OT.Sound.ok(); }
      if (k === 'music') { s.music = s.music >= 1 ? 0 : Math.round((s.music + 0.25) * 100) / 100; }
      // version 1.4 : son général, voix, sous-titres
      const step = (v, d) => (v >= 0.999 ? 0 : Math.round((v + d) * 100) / 100);
      if (k === 'master') { s.master = step(s.master !== undefined ? s.master : 1, 0.1); OT.Sound.ok(); }
      if (k === 'voicevol') { s.voiceVol = step(s.voiceVol !== undefined ? s.voiceVol : 0.9, 0.1); OT.Dialogue.bark('voicetest', 'oswel', { force: true }); }
      if (k === 'voices') { s.voices = s.voices === false; if (!s.voices) OT.Dialogue.stop(); }
      if (k === 'subs') { s.subtitles = s.subtitles === false; if (!s.subtitles) OT.Dialogue.hideSub(); }
      if (k === 'tts') s.ttsFallback = s.ttsFallback === false;
      if (k === 'voicetest') {
        const who = (OT.Save.active && OT.Save.active.skin.char) || 'oswel';
        OT.Dialogue.bark('voicetest', who, { force: true, priority: 3 });
      }
      if (k === 'ghost') s.ghost = !s.ghost;
      if (k === 'shadows') { s.shadows = !s.shadows; OT.Game.applyQuality(); }
      if (k === 'swap') s.swapPads = !s.swapPads;
      if (k === 'camsens') { const L = [0.5, 0.75, 1, 1.25, 1.5, 2]; s.camSens = L[(L.indexOf(s.camSens || 1) + 1) % L.length]; }
      if (k === 'caminv') s.camInvert = !s.camInvert;
      if (k === 'camrec') s.camRecenter = s.camRecenter === false;
      if (k === 'camtrig') s.camTriggers = s.camTriggers === 'run' ? 'zoom' : 'run';
      if (k === 'touch') s.touchMode = { auto: 'on', on: 'off', off: 'auto' }[s.touchMode];
      if (k === 'touch2p') s.touch2p = !s.touch2p;
      if (k === 'touchsize') { s.touchSize = { discret: 'normal', normal: 'grand', grand: 'discret' }[s.touchSize || 'discret']; $('#touch').dataset.layout = ''; }
      if (k === 'test') {
        if (!s.vibration) { s.vibration = true; }
        OT.Input.testRumble().then((msg) => {
          toast(msg + (/refusée|ne donne pas/.test(msg) ? ' → essaie « Mode direct PS4 » juste en dessous.' : ''));
          setTimeout(() => OT.Input.rumble(-1, 1, 0, 400), 800);
          setTimeout(() => OT.Input.rumble(-1, 0, 1, 400), 1350);
        });
        OT.Input.vibrate([200, 100, 200]);
        if (OT.Light) OT.Light.test();
      }
      OT.Save.save();
      rerender();
    },
  };

  // la petite ligne « Vitesse du gameplay » : Lent ◀ ──●── ▶ Rapide · 75 %
  const SPEED_NAME = { 0.6: '🐢 Très lent', 0.75: '🚶 Lent', 1: '⚙️ Normal', 1.15: '🏃 Rapide', 1.3: '⚡ Très rapide' };
  function speedRow() {
    const el = $('#opt-speed'); if (!el) return;
    const L = OT.Game.SPEEDS, v = +OT.settings.gameSpeed || 1, i = Math.max(0, L.indexOf(v));
    el.querySelector('.sp-dots').innerHTML = L.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'lo' : ''}"></i>`).join('');
    el.querySelector('.sp-val').textContent = `${SPEED_NAME[v] || ''} · ${Math.round(v * 100)} %`;
  }
  let padsTimer = 0;
  function padsStatus() {
    const pads = OT.Input.pads();
    $('#pads-status').textContent = pads.length
      ? pads.map((g, i) => `Manette ${i + 1} : ${OT.Input.shortName(g.id)}${g.hid ? ' · mode direct (boutons, lumière, vibrations)' : g.vibrationActuator ? ' · vibrations accessibles' : ' · vibrations NON accessibles par le navigateur (utilise le mode direct PS4)'}`).join(' — ')
      : 'Aucune manette vue par ce navigateur. Clique dans la page puis appuie sur ✕. Toujours rien ? Utilise « Mode direct PS4 » ci-dessous.';
  }
  function randomName() {
    const a = ['Piston', 'Boulon', 'Engrenage', 'Rivet', 'Turbo', 'Circuit', 'Ressort', 'Étincelle', 'Volt', 'Clé', 'Pixel', 'Octet'];
    const b = ['Rapide', 'Malin', 'Rouillé', 'Brillant', 'Fou', 'Têtu', 'Calme', 'Agile', 'Royal', 'Rusé'];
    return a[Math.floor(Math.random() * a.length)] + ' ' + b[Math.floor(Math.random() * b.length)];
  }

  function copyText(text, okMsg) {
    const done = () => toast(okMsg);
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done).catch(fallback);
    else fallback();
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Copie impossible : sélectionne le texte et copie-le à la main.'); }
      ta.remove();
    }
  }

  /* ---------- Signaler un bug ---------- */
  function bugInfo() {
    const d = OT.Game._dbg, R = d.R;
    return {
      version: OT.VERSION, monde: OT.Game.world, niveau: OT.Game.levelIndex + 1, mode: OT.Game.mode,
      etat: OT.Game.state, chutes: R ? R.deaths : 0, derniere_chute: R && R.lastCause ? R.lastCause : '',
      position: d.players[0] ? `${d.players[0].x.toFixed(1)}, ${d.players[0].y.toFixed(1)}` : '',
      difficulte: OT.settings.difficulty, manettes: OT.Input.pads().map((g) => OT.Input.shortName(g.id)).join(' / ') || 'aucune',
      ecran: `${window.innerWidth}×${window.innerHeight}`, appareil: navigator.userAgent, date: new Date().toISOString(),
    };
  }
  function bugInfoText() { const i = bugInfo(); return Object.keys(i).map((k) => `${k} : ${i[k]}`).join('\n'); }
  function bugReportText() { return `OSWEL'S TRAP — signalement de bug\n\n${$('#bug-text').value.trim() || '(pas de description)'}\n\n---\n${bugInfoText()}`; }

  /* ---------- Classement en ligne ---------- */
  let boardToken = 0;
  function loadOnlineBoard() {
    const el = $('#board-online');
    if (!OT.Net || !OT.Net.enabled) { el.innerHTML = '<li class="muted">Classement mondial : règle l\'adresse du serveur dans Options → En ligne.</li>'; return; }
    const tok = ++boardToken;
    el.innerHTML = '<li class="muted">Chargement…</li>';
    OT.Net.top(board.w, board.i).then((r) => {
      if (tok !== boardToken) return;
      const list = r.scores || [];
      el.innerHTML = list.length
        ? list.map((s, k) => `<li><span class="rk">${k + 1}</span><b>${esc(s.name)}</b><span class="tm">${fmtTime(s.time)}</span><small>${s.deaths} chute${s.deaths > 1 ? 's' : ''}${s.mode === 'coop' ? ' · coop' : ''}</small></li>`).join('')
        : '<li class="muted">Aucun temps en ligne pour ce niveau. Sois le premier !</li>';
    }).catch((e) => { if (tok === boardToken) el.innerHTML = `<li class="muted">${esc(e.message)}</li>`; });
  }

  /* ---------- Boutique ---------- */
  // boutique : correspondances entre le type d'objet, la liste, ce qu'on possède et ce qu'on porte
  const SKIN_KEY = { color: 'color', acc: 'acc', gad: 'gad', fx: 'fx', win: 'win', emote: 'emote', char: 'char' };
  const OWN_KEY = { color: 'colors', acc: 'acc', gad: 'gad', fx: 'fx', win: 'win', emote: 'emote' };
  const DEF_EQ = { gad: 'aucun', fx: 'aucun', win: 'perso', emote: 'wave', char: 'oswel' };
  const shopList = (kind) => ({ color: OT.SHOP.colors, acc: OT.SHOP.accessories, gad: OT.SHOP.gadgets, fx: OT.SHOP.fx, win: OT.SHOP.wins, emote: OT.SHOP.emotes })[kind] || [];
  const shopP = () => (shopFor === 'p2' && p2Id ? OT.Save.prof(p2Id) : OT.Save.active);
  function ownedList(p, kind) { const k = OWN_KEY[kind]; if (!k) return []; p.owned[k] = p.owned[k] || [DEF_EQ[kind] || 'aucun']; return p.owned[k]; }
  // l'aperçu essaie l'objet sélectionné (sans l'acheter) et la fiche le décrit
  function shopTry(btn) {
    const p = shopP(); if (!p) return;
    const skin = OT.Save.skinOf(p);
    const tr = btn && btn.dataset.try ? btn.dataset.try.split(':') : null;
    let html = '';
    if (tr) {
      const [kind, id] = tr;
      if (kind === 'char') {
        skin.char = id;
        const c = OT.Chars.BY[id];
        html = `<b class="sd-name" style="color:#${c.accent.toString(16).padStart(6, '0')}">${c.name}</b><span class="sd-rar">Personnage · ${esc(c.univers)}</span><p>${esc(c.desc)}</p><small>Mêmes capacités pour tous : seul le style change.</small>`;
      } else {
        const it = shopList(kind).find((x) => x.id === id);
        if (it) {
          if (kind === 'color') skin.color = it.hex; else skin[SKIN_KEY[kind]] = id;
          const R = OT.RARITY[OT.rarityOf(it)];
          const owned = ownedList(p, kind).includes(id) || it.price === 0;
          const eq = (p.skin[SKIN_KEY[kind]] || DEF_EQ[kind]) === id;
          const desc = it.desc || { color: 'La couleur de ta tenue.', acc: 'Se porte sur la tête.', gad: 'Un objet du monde ' + (it.w || '') + ', porté en plus de l\'accessoire.' }[kind] || '';
          html = `<b class="sd-name">${it.icon ? it.icon + ' ' : ''}${esc(it.name)}</b><span class="sd-rar" style="color:${R.color}">${R.name}</span><p>${esc(desc)}</p><small>${eq ? '✔ Équipé' : owned ? '✔ Acheté — appuie pour équiper' : `Prix : ${it.price} pièces${p.coins < it.price ? ` (il t'en manque ${it.price - p.coins})` : ''}`}</small>`;
          if (kind === 'win') setTimeout(() => Preview.play('win'), 60);
          if (kind === 'emote') setTimeout(() => Preview.play('emote'), 60);
        }
      }
    }
    $('#shop-desc').innerHTML = html || `<b class="sd-name">${esc(p.name)}</b><span class="sd-rar">${esc((OT.Chars.BY[p.skin.char || 'oswel'] || {}).name || '')}</span><p>Choisis un onglet, puis un objet : il s'affiche aussitôt sur ton personnage.</p>`;
    Preview.show($('#shop-preview'), skin);
  }
  function buyOrEquip(kind, id) {
    const p = shopP();
    if (kind === 'char') {
      p.skin.char = id; OT.Save.save();
      OT.Sound.ok(); Preview.play('celebrate');
      toast(`${OT.Chars.BY[id].name} choisi !`);
      rerender(); return;
    }
    const list = shopList(kind);
    const it = list.find((x) => x.id === id);
    if (!it) return;
    const owned = ownedList(p, kind);
    if (kind === 'gad' && !owned.includes(id) && !OT.Save.worldOpen(p, it.w)) {
      const W = OT.WORLDS.find((w) => w.id === it.w);
      OT.Sound.bad(); toast(`🔒 « ${it.name} » se débloque quand tu arrives au Monde ${it.w}${W ? ' : ' + W.name : ''}.`); return;
    }
    if (!owned.includes(id) && it.price > 0) {
      if (p.coins < it.price) { OT.Sound.bad(); toast(`Il te manque ${it.price - p.coins} pièces pour « ${it.name} ».`); return; }
      p.coins -= it.price; owned.push(id);
      OT.Sound.buy(); OT.Input.rumble(-1, 0.2, 0.5, 150);
      toast(`« ${it.name} » acheté ! (${OT.RARITY[OT.rarityOf(it)].name})`);
      Preview.play('pickup');
    } else if (!owned.includes(id)) owned.push(id);
    p.skin[SKIN_KEY[kind]] = id;
    OT.Save.save();
    rerender();
  }

  /* ---------- Touches personnalisables ---------- */
  function startBind(action) {
    const { player, dev } = keysTab;
    $('#bind-overlay').hidden = false;
    $('#bind-msg').textContent = dev === 'kb'
      ? `Appuie sur la nouvelle touche pour « ${OT.ACTION_NAMES[action]} » (joueur ${player + 1}). Échap pour annuler.`
      : `Appuie sur le bouton de la manette ${player + 1} pour « ${OT.ACTION_NAMES[action]} ». OPTIONS pour annuler.`;
    if (dev === 'pad' && !OT.Input.padFor(player)) $('#bind-msg').textContent = `Aucune manette pour le joueur ${player + 1}. Branche-la et appuie sur un bouton, ou Échap pour annuler.`;
    OT.Input.startCapture(dev, player, (code) => {
      $('#bind-overlay').hidden = true;
      if (code === null || code === undefined) return;
      const B = OT.settings.binds;
      if (dev === 'kb') {
        // si la touche servait déjà à autre chose, on échange
        for (const p of [0, 1]) for (const a in B.kb[p]) {
          if (p === player && a === action) continue;
          if (B.kb[p][a].includes(code)) B.kb[p][a] = B.kb[p][a].filter((c) => c !== code).length ? B.kb[p][a].filter((c) => c !== code) : B.kb[player][action].slice(0, 1);
        }
        B.kb[player][action] = [code];
      } else {
        for (const a in B.pad[player]) if (a !== action && B.pad[player][a] === code) B.pad[player][a] = B.pad[player][action];
        B.pad[player][action] = code;
      }
      OT.Save.save();
      OT.Sound.ok();
      rerender();
    });
  }

  function resume() { show(null); OT.Game.setPaused(false); }
  function pause() {
    if (OT.Game.state !== 'play') return;
    OT.Game.setPaused(true);
    OT.Input.clearTouch();
    show('pause');
  }

  function goFullscreen() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) { toast('Le plein écran n\'est pas disponible ici.'); return; }
    Promise.resolve(req.call(el)).then(() => {
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    }).catch(() => toast('Le plein écran a été refusé par le navigateur.'));
  }

  /* ---------- Boutons tactiles ---------- */
  function touchWanted() {
    const s = OT.settings;
    if (s.touchMode === 'on') return true;
    if (s.touchMode === 'off') return false;
    return OT.Input.touchActive || matchMedia('(pointer: coarse)').matches;
  }
  function layoutTouch(inGame) {
    const root = $('#touch');
    const want = inGame && touchWanted();
    root.hidden = !want;
    $('#btn-pause').hidden = !inGame;
    if (!want) return;
    const two = OT.Game.mode !== 'solo' && OT.settings.touch2p;
    const key = two ? '2p' : '1p';
    // version 1.5 : taille des boutons (discrets par défaut : ils n'encombrent pas l'écran)
    root.dataset.size = OT.settings.touchSize || 'discret';
    touchRepos();
    if (root.dataset.layout === key) return;
    root.dataset.layout = key;
    const B = (p, k, label, cls = '') => `<div class="tbtn ${cls}" data-p="${p}" data-k="${k}">${label}</div>`;
    root.innerHTML = !two
      ? `<div class="tc left">${B(0, 'left', '◀')}${B(0, 'right', '▶')}</div>
         <div class="tc right">${B(0, 'gadget', 'POUVOIR', 'small gad')}${B(0, 'run', 'COURIR', 'small')}${B(0, 'talk', 'ACTION', 'small')}${B(0, 'jump', 'SAUT', 'big')}</div>`
      : `<div class="tc left p1">${B(0, 'left', '◀')}${B(0, 'right', '▶')}${B(0, 'jump', '⤒', 'j')}${B(0, 'talk', '…', 'small')}${B(0, 'gadget', '✦', 'small gad')}</div>
         <div class="tc right p2">${B(1, 'gadget', '✦', 'small gad')}${B(1, 'talk', '…', 'small')}${B(1, 'left', '◀')}${B(1, 'right', '▶')}${B(1, 'jump', '⤒', 'j')}</div>`;
  }

  /* version 1.5 : les boutons tactiles se font oublier
     - au repos (2,5 s sans toucher l'écran), ils deviennent presque transparents ;
     - le bouton ACTION n'apparaît que s'il y a quelque chose à faire à côté (porte, caisse, levier,
       personnage) ou pendant un dialogue. */
  let reposT = 0, actT = 0;
  function touchRepos() {
    const root = $('#touch');
    root.classList.remove('repos');
    clearTimeout(reposT);
    reposT = setTimeout(() => root.classList.add('repos'), 2500);
    if (!root.dataset.ecoute) { root.dataset.ecoute = '1'; root.addEventListener('pointerdown', touchRepos, true); }
  }
  function touchAction(dt) {
    const root = $('#touch');
    if (root.hidden) return;
    actT -= dt; if (actT > 0) return; actT = 0.15;
    const api = OT.Game.api;
    const parler = !!dlg || OT.Game.state === 'dialog';
    for (const i of [0, 1]) root.classList.toggle('noact' + i, !(parler || (api && api.actionNear && api.actionNear(i))));
  }

  /* ---------- GALERIE : tous les personnages et leur rôle ---------- */
  // le rôle des personnes du parcours d'Oswel (les autres : d'après les niveaux où on les croise)
  const ROLES = {
    patou: "L'oncle d'Oswel. À la Forge, c'est lui qui lui fait découvrir l'atelier et les machines.",
    tante: "La femme de l'oncle Patou.",
    christine: "La sœur d'Oswel. Elle est là du premier monde jusqu'à OSWEL City.",
    franck: "Le cousin d'Oswel. Toujours habillé en rouge (sa couleur préférée), des nattes sur toute la tête. Jouable aussi (Boutique → Personnage).",
    romeo: "Le cousin d'Oswel. Toujours partant pour ouvrir ce qu'il ne faut pas ouvrir.",
    tony: "Celui qui a appris à coder à Oswel. Jouable aussi : casquette à l'envers, lunettes et sacoche d'ordinateur.",
    yannick: "Le rival d'Oswel en code : il fait la course contre toi.",
    zeus: "Le frère d'Oswel. Boss du Nexus : un défi entre frères.",
    ange: "Venue de Belgique, elle aide Oswel à s'adapter à l'Université de Douala.",
    annie: "Elle aide Oswel en maths, avec Dimi.",
    dimi: "Il aide Oswel en maths, avec Annie.",
    rumeur: "Elle donne toujours le mauvais conseil. Ne la crois jamais ! Boss final de The Core.",
    gardien: "Boss du Monde 1 : le gardien de l'atelier, en 3 phases.",
    bug: "Boss du Monde 2 : un amas de pixels qui plante tout. On le corrige en 3 phases : essayer, chercher, corriger.",
    machine: "Boss du Monde 3 : elle pose 9 questions. Place-toi sur la bonne réponse.",
    ia: "L'intelligence artificielle du Nexus : elle a appris le chemin par cœur et fait la course contre toi.",
    fredo: "Programmeur du Nexus. Jouable aussi : bonnet, casque audio autour du cou et montre connectée.",
  };
  const BOSS_IDS = { gardien: 'gardien', bug: 'bug', exam: 'machine', zeus: 'zeus', rumeur: 'rumeur' };
  const hexCss = (h) => '#' + (h >>> 0).toString(16).padStart(6, '0');
  function galleryData() {
    // où croise-t-on chaque personnage ? (personnages, dialogues, intros, rivaux, boss)
    const app = {};
    const add = (id, w, i, lv) => { const a = app[id] || (app[id] = []); if (!a.some((x) => x.w === w && x.i === i)) a.push({ w, i, title: lv.title }); };
    for (const W of OT.WORLDS) {
      const D = OT.WORLD_DATA[W.id]; if (!D) continue;
      D.levels.forEach((lv, i) => {
        for (const e of (lv.build && lv.build.ents) || []) { if (e.type === 'npc' && e.id) add(e.id, W.id, i, lv); if (e.type === 'rival') add(e.name || 'yannick', W.id, i, lv); }
        Object.keys(lv.dialogs || {}).forEach((k) => add(k, W.id, i, lv));
        (lv.intro || []).forEach((l) => add(l[0], W.id, i, lv));
        if (lv.boss) add(BOSS_IDS[lv.boss] || 'gardien', W.id, i, lv);
      });
    }
    const where = (id) => (app[id] || []).map((a) => `${a.w}-${a.i + 1}`);
    const play = OT.Chars.LIST.map((c) => ({ id: 'pc:' + c.id, group: 'play', name: c.name, color: c.accent, role: `Personnage jouable · ${c.univers}`, desc: c.desc, char: c.id, where: where(['tony', 'fredo', 'godlove', 'valdes', 'franck'].includes(c.id) ? c.id : '_'),
      // (1.5 : Tony a une fiche complète — apparence, personnalité, pouvoirs — on la montre aussi ici)
      profile: c.id === 'tony' && OT.CHARACTERS.tony ? Object.assign({}, OT.CHARACTERS.tony.profile, { about: '' }) : null }));
    const bossSet = new Set(Object.values(BOSS_IDS).concat(['ia', 'yannick']));
    const people = Object.keys(OT.CHARACTERS).filter((id) => !['oswel', 'echo'].includes(id) && (app[id] || ROLES[id] || OT.CHARACTERS[id].profile)).map((id) => {
      const ch = OT.CHARACTERS[id], P = ch.profile, A = app[id] || [];
      const W = A.length ? OT.WORLDS.find((w) => w.id === A[0].w) : null;
      // ce qu'il t'apprend : les leçons des niveaux où on le croise
      const lessons = [...new Set(A.map((a) => { const lv = OT.WORLD_DATA[a.w].levels[a.i]; return lv.teach ? lv.teach.title : lv.title; }))].slice(0, 3);
      const label = (P && P.title) || ch.role || (W ? `Monde ${W.id} · ${W.name}` : 'Personnage de l\'histoire');
      const desc = (P && P.about) || ROLES[id] || (lessons.length ? `On le croise dans les niveaux ${A.map((a) => a.w + '-' + (a.i + 1)).slice(0, 4).join(', ')} : ${lessons.join(', ')}.` : '');
      return { id, group: bossSet.has(id) ? 'boss' : 'story', name: ch.name, color: ch.ui || ch.color, role: label, desc, profile: P, where: where(id), firstW: A.length ? A[0].w * 100 + A[0].i : 999 };
    }).sort((a, b) => a.firstW - b.firstW);
    return play.concat(people);
  }
  function galShow(id) {
    const all = galleryData(), g = all.find((x) => x.id === id) || all.find((x) => x.group === galTab);
    if (!g) return;
    galSel = g.id;
    const P = g.profile;
    const w = g.where.length ? `<small class="gal-where">On le croise : ${g.where.slice(0, 8).join(' · ')}${g.where.length > 8 ? '…' : ''}</small>` : '';
    $('#gal-card').innerHTML = `<b class="sd-name" style="color:${hexCss(g.color)}">${esc(g.name)}</b><span class="sd-rar">${esc(g.role)}</span>
      ${g.desc ? `<p>${esc(g.desc)}</p>` : ''}
      ${P && P.look ? `<p><b class="gal-k">Apparence</b> ${esc(P.look)}</p>` : ''}${P && P.mind ? `<p><b class="gal-k">Personnalité</b> ${esc(P.mind)}</p>` : ''}
      ${P && P.power ? `<p class="gal-power"><b>« ${esc(P.power.name)} »</b> ${esc(P.power.text)}</p>` : ''}${powersHtml(P)}
      ${P && P.quote ? `<blockquote>« ${esc(P.quote)} »</blockquote>` : ''}${w}`;
    const el = $('#gal-preview');
    if (g.char) Preview.show(el, { char: g.char, color: g.char === 'tony' ? 0x8a6bd6 : g.char === 'fredo' ? 0x34c26b : g.char === 'godlove' ? 0xb0123c : g.char === 'valdes' ? 0xff8a2b : g.char === 'franck' ? 0xd42a2a : OT.Save.skinOf(OT.Save.active).color, acc: 'aucun', gad: 'aucun' });
    else Preview.model(el, 'npc:' + g.id, () => npcModel(g.id));
  }
  // le modèle 3D d'un personnage de l'histoire (son vrai modèle s'il est jouable)
  function npcModel(id) {
    const ch = OT.CHARACTERS[id];
    if (ch.char) return OT.Models.hero({ char: ch.char, color: ch.color, acc: 'aucun', gad: 'aucun' }, { marker: false });
    if (id === 'bug' && OT.Models.bug) { const b = OT.Models.bug(); b.position.y = 0.8; const g = new THREE.Group(); g.add(b); g.userData.height = 1.6; return g; }
    if (id === 'gardien' || id === 'machine' || id === 'ia') {
      // les boss-machines : une figure holographique à leur couleur
      const g = new THREE.Group(); const col = new THREE.Color(ch.color).convertSRGBToLinear();
      const m = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 });
      const core = id === 'gardien' ? OT.Models.gear(0.42, 12, m, 0.22) : new THREE.Mesh(id === 'ia' ? new THREE.IcosahedronGeometry(0.5, 1) : new THREE.BoxGeometry(0.9, 0.9, 0.5), m);
      core.position.y = 0.9; g.add(core);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); eye.position.set(0, 0.92, 0.32); g.add(eye);
      g.userData.height = 1.5; g.userData.gadTick = (t) => { core.rotation.y = t * 0.6; if (id === 'gardien') core.rotation.z = t * 0.8; core.position.y = 0.9 + Math.sin(t * 2) * 0.05; };
      return g;
    }
    // les personnes de l'histoire : le modèle animé (sans l'étiquette du nom)
    if (OT.Chars && OT.Chars.build) return OT.Chars.build('npc', { color: ch.color, npc: ch, acc: 'aucun', gad: 'aucun' }, { marker: false });
    const m = OT.Models.person(ch);
    if (m.userData.name) m.userData.name.visible = false;
    m.userData.height = 1.35;
    return m;
  }

  // 1.5 : la liste des pouvoirs d'un personnage jouable (Tony) — débloqués ou non pour ce profil
  function powersHtml(P) {
    if (!P || !P.powers) return '';
    const prof = OT.Save.active;
    const open = (w) => !prof || w === 1 || OT.Save.worldOpen(prof, w);
    return `<div class="fiche-power"><b>Pouvoirs (un par monde)</b><ul class="powers">${P.powers.map((pw) => `<li class="${open(pw.w) ? 'on' : 'off'}"><b>${open(pw.w) ? '' : '🔒 '}${esc(pw.name)}</b> <small>Monde ${pw.w}</small> — ${esc(pw.text)}</li>`).join('')}</ul>${P.rules ? `<small>${esc(P.rules)}</small>` : ''}</div>`;
  }

  /* ---------- Fiche d'un personnage (Carnet) ---------- */
  function ficheHtml(c) {
    const P = c.profile, col = '#' + (c.ui || c.color).toString(16).padStart(6, '0');
    const sec = (t, v) => (v ? `<h5>${t}</h5><p>${esc(v)}</p>` : '');
    return `<article class="fiche" style="--fc:${col}">
      <header><span class="fiche-face">${esc(c.name.charAt(0))}</span><div><b>${esc(c.name.toUpperCase())}</b>
        <small>${P.nick ? `« ${esc(P.nick)} » · ` : ''}${esc(P.title || c.role || '')}</small></div></header>
      ${P.about ? `<p>${esc(P.about)}</p>` : ''}
      ${sec('Apparence', P.look)}${sec('Personnalité', P.mind)}
      ${P.power ? `<div class="fiche-power"><b>Capacité spéciale — « ${esc(P.power.name)} »</b><p>${esc(P.power.text)}</p></div>` : ''}
      ${powersHtml(P)}
      ${P.quote ? `<blockquote>« ${esc(P.quote)} »</blockquote>` : ''}
      <small class="fiche-foot">${P.assistant ? `Assistant : ${esc(P.assistant)} · ` : ''}${P.met ? `Rencontré au niveau ${esc(P.met)}` : ''}</small>
    </article>`;
  }

  /* ---------- Dialogues ---------- */
  function dialog(lines, cb) {
    // version 1.4 : certaines répliques dépendent de la mémoire narrative ({ if: 'w1' })
    if (OT.Dialogue) lines = OT.Dialogue.filterLines(lines);
    if (!lines || !lines.length) { if (cb) cb(); return; }
    dlg = { lines, i: 0, cb, shown: 0, full: false };
    $('#dialog').hidden = false;
    OT.Input.clearTouch();
    renderDialog();
  }
  function renderDialog() {
    const [w, text] = dlg.lines[dlg.i];
    let ch = OT.CHARACTERS[w] || { name: w, color: 0xffffff };
    // Oswel et l'Écho prennent le nom et la couleur des joueurs
    const info = OT.Game._dbg.players;
    if (w === 'oswel' && info[0]) ch = { name: info[0].name, color: info[0].color };
    if (w === 'echo' && info[1]) ch = { name: info[1].name, color: info[1].color };
    // ui : couleur d'affichage (ex. Win Black porte du noir : son nom s'affiche en bleu électrique)
    const col = '#' + (ch.ui || ch.color).toString(16).padStart(6, '0');
    $('#dlg-name').textContent = ch.name + (ch.role ? ' · ' + ch.role : '');
    $('#dlg-name').style.color = col;
    $('#dlg-face').style.background = col;
    $('#dlg-letter').textContent = ch.name.replace(/^(Oncle |La |Le |L')/, '').charAt(0);
    dlg.text = text; dlg.shown = 0; dlg.full = false;
    $('#dlg-text').textContent = '';
    $('#dlg-hint').innerHTML = `<span class="kbd">${esc(hintOk())}</span> Continuer`;
    // version 1.4 : le personnage en 3D (il parle, hoche la tête) + sa voix (ou la voix de secours)
    const face3d = OT.Portrait ? OT.Portrait.show($('#dlg-face'), w) : false;
    $('#dialog').classList.toggle('p3d', !!face3d);
    dlg.speed = 55;
    if (OT.Dialogue) {
      const emo = dlg.lines[dlg.i][2] && dlg.lines[dlg.i][2].emotion;
      const ln = OT.Dialogue.line(w, text);
      // le texte s'écrit au rythme de la voix (sous-titre synchronisé)
      dlg.speed = Math.max(24, Math.min(70, text.length / Math.max(0.6, ln.duration - 0.25)));
      OT.Dialogue.play(ln, { priority: 3, subtitle: false, onEnd: () => { if (OT.Portrait) OT.Portrait.stopTalk(); } });
      if (OT.Portrait) { OT.Portrait.talk(ln.duration); if (emo) OT.Portrait.emotion(emo, ln.duration); }
      const nx = dlg.lines[dlg.i + 1];
      if (nx) OT.Dialogue.preload(nx[0], nx[1]);
    }
  }
  function advanceDialog() {
    if (!dlg) return;
    if (!dlg.full) { dlg.shown = dlg.text.length; dlg.full = true; $('#dlg-text').textContent = dlg.text; return; }
    dlg.i++;
    OT.Sound.menu();
    if (OT.Dialogue) OT.Dialogue.stop(true);   // on passe à la réplique suivante : la voix s'arrête
    if (dlg.i >= dlg.lines.length) { const cb = dlg.cb; dlg = null; $('#dialog').hidden = true; if (OT.Portrait) OT.Portrait.hide(); cb && cb(); return; }
    renderDialog();
  }
  function hintOk() {
    const src = OT.Input.lastSource;
    if (src === 'gamepad') return '✕';
    if (src === 'touch' || matchMedia('(pointer: coarse)').matches) return 'Touche';
    return 'Entrée';
  }

  /* ---------- Fin de niveau : récompenses, médaille, fragment, leçon ---------- */
  // Médailles (mode normal, solo ou coop) : or ≤ temps de référence, argent ≤ 1,6 × référence, bronze sinon
  function medalFor(c) {
    if (c.easy || c.mode === 'versus') return null;
    const par = c.def.par || 30;
    return c.time <= par ? 'or' : c.time <= par * 1.6 ? 'argent' : 'bronze';
  }
  function awardLevel(c) {
    const lines = [];
    const profiles = [{ p: OT.Save.active, slot: 0 }];
    if (c.mode !== 'solo' && p2Id) profiles.push({ p: OT.Save.prof(p2Id), slot: 1 });
    const medal = medalFor(c);
    const nofall = !!medal && c.deaths === 0;
    for (const { p, slot } of profiles) {
      const P = wp(p, c.world);
      const set = new Set(P.collected[c.index] || []);
      let gained = 0;
      for (const pk of c.picked) {
        if (c.mode === 'versus' && pk.by !== slot) continue;
        if (!set.has(pk.i)) { set.add(pk.i); gained++; }
      }
      P.collected[c.index] = [...set];
      const prev = P.done[c.index];
      const first = !prev;
      let bonus = first ? (c.isBoss ? OT.REWARDS.bossClear : OT.REWARDS.firstClear) : 0;
      const notes = [];
      // médaille : on garde la meilleure, et on paie la première fois qu'on l'obtient
      const prevRank = prev && prev.medal ? MEDAL_RANK[prev.medal] : 0;
      if (medal && MEDAL_RANK[medal] > prevRank) {
        const pay = { or: 6, argent: 3, bronze: 1 }[medal];
        bonus += pay; notes.push(`médaille ${MEDAL_NAME[medal].toLowerCase()} +${pay}`);
      }
      if (nofall && !(prev && prev.nofall)) { bonus += 4; notes.push('sans chute +4'); }
      if (c.rival && c.rival.beaten && !P.rival[c.index]) { P.rival[c.index] = true; bonus += 8; notes.push(`${c.rival.name} battu +8`); }
      p.coins += gained + bonus;
      const rec = prev ? Object.assign({}, prev) : { time: c.time, deaths: c.deaths };
      // version 1.3 : un temps fait sur l'ancien niveau (plus court) est remplacé par le premier temps du grand niveau
      const stale = !!prev && (prev.v || 0) !== OT.LAYOUT_V;
      if (!prev || stale || c.time < prev.time) { rec.time = c.time; rec.deaths = c.deaths; rec.easy = !!c.easy; }
      rec.v = OT.LAYOUT_V;
      if (medal && MEDAL_RANK[medal] > prevRank) rec.medal = medal;
      if (nofall) rec.nofall = true;
      P.done[c.index] = rec;
      if (!(c.def && c.def.secret)) P.unlocked = Math.max(P.unlocked, Math.min(10, c.index + 2));
      if (!P.fragments.includes(c.index)) P.fragments.push(c.index);
      if (!P.learned.includes(c.index)) P.learned.push(c.index);
      lines.push({ name: p.name, gained, bonus, total: p.coins, notes });
    }
    OT.Save.save();
    // classement en ligne : uniquement les temps du mode normal (solo ou coop)
    if (medal && OT.Net && OT.Net.enabled && (c.speed || 1) === 1 && !(c.def && c.def.secret)) {   // classement : seulement à la vitesse normale
      const names = profiles.map((x) => x.p.name).concat(c.mode === 'coop' && !p2Id ? ["L'Écho"] : []);
      OT.Net.submitScore({ world: c.world, level: c.index, name: names.join(' & ').slice(0, 40), time: +c.time.toFixed(2), deaths: c.deaths, mode: c.mode });
    }
    return { lines, medal, nofall };
  }

  function levelComplete(c) {
    lastComplete = c;
    curWorld = c.world || curWorld;
    const W = WDATA(c.world);
    const res = awardLevel(c);
    const lv = c.def;
    $('#done-kicker').textContent = c.isBoss ? `Monde ${c.world} · passage franchi` : `Niveau ${c.world}-${c.index + 1} terminé`;
    $('#done-title').textContent = lv.title;
    $('#done-fragment').textContent = lv.fragment;
    $('#done-fragment').dataset.tone = lv.tone;
    let stats = `${c.deaths} chute${c.deaths > 1 ? 's' : ''} · ${fmtTime(c.time)} · ${coinSvg}${c.picked.length}/${c.coinCount} ramassées`;
    if (c.speed && c.speed !== 1) stats += ` · vitesse ${Math.round(c.speed * 100)} %`;
    if (c.mode === 'versus' && c.winner >= 0) {
      const names = OT.Game._dbg.players.map((p) => p.name);
      stats = `<b class="${c.winner === 0 ? 'c1' : 'c2'}">${esc(names[c.winner])} gagne la manche !</b> · Score ${c.score[0]} – ${c.score[1]}<br>` + stats;
    }
    // version 1.5 : les étoiles du niveau (★ terminé · ★ toutes les pièces · ★ temps de référence)
    if (OT.Stars && c.mode !== 'versus' && OT.Save.active) {
      const st = OT.Stars.of(OT.Save.active, c.world, c.index);
      stats += `<br><span class="stars big">${'★'.repeat(st.n)}<i>${'★'.repeat(3 - st.n)}</i></span> <small class="muted">★ terminé ✓ · ★ toutes les pièces${st.b ? ' ✓' : ` (${st.got}/${st.tot})`} · ★ temps de référence${st.c ? ' ✓' : ` (${fmtShort(lv.par)})`}</small>`;
    }
    $('#done-stats').innerHTML = stats;
    const md = $('#done-medal');
    if (res.medal) {
      md.hidden = false;
      md.innerHTML = `<span class="md big ${res.medal}"></span><b>Médaille ${MEDAL_NAME[res.medal].toLowerCase()}</b>${res.nofall ? '<span class="nofall big">✦ Sans chute</span>' : ''}<small>Or : moins de ${fmtShort(lv.par)} · Argent : moins de ${fmtShort(lv.par * 1.6)}</small>`;
    } else {
      md.hidden = c.mode === 'versus';
      md.innerHTML = c.easy ? '<small>Mode facile : pas de médaille. Repasse en mode normal pour viser l\'or.</small>' : '';
    }
    let rival = '';
    if (c.rival) rival = c.rival.beaten ? `<p class="rival win">Tu as battu la copie de ${esc(c.rival.name)} !</p>` : `<p class="rival">La copie de ${esc(c.rival.name)} est arrivée avant toi. Revanche ?</p>`;
    $('#done-rival').innerHTML = rival;
    $('#done-rewards').innerHTML = res.lines.map((r) => `<li><b>${esc(r.name)}</b> +${r.gained} pièce${r.gained > 1 ? 's' : ''}${r.bonus ? ` · bonus +${r.bonus}` : ''}${r.notes.length ? ` <span class="muted">(${esc(r.notes.join(', '))})</span>` : ''} <span class="muted">· total ${coinSvg}${r.total}</span></li>`).join('');
    // Préparer l'écran de leçon
    $('#lesson-kicker').textContent = `Leçon ${c.index + 1} sur 10 · ${W.name}`;
    $('#lesson-title').textContent = lv.teach.title;
    $('#lesson-text').textContent = lv.teach.text;
    $('#btn-lesson-next').textContent = c.isBoss ? `Passer le quiz : ${W.name}` : lv.secret ? 'Retour aux niveaux' : 'Niveau suivant';
    $('#lesson-kicker').textContent = lv.secret ? `Niveau secret · ${W.name}` : $('#lesson-kicker').textContent;
    show('done');
  }

  /* ---------- Quiz de fin de monde ---------- */
  function startQuiz() {
    const W = WDATA();
    const qs = W.levels.filter((lv) => !lv.secret).map((lv) => {
      const q = lv.teach.q;
      const order = q.options.map((_, i) => i).sort(() => Math.random() - 0.5);
      return { question: q.question, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer), explain: q.explain, title: lv.teach.title };
    });
    quiz = { qs, i: 0, score: 0, answered: false, world: curWorld };
    $('#quiz-kicker').textContent = `Quiz de fin de monde · ${W.name}`;
    show('quiz');
    renderQuiz();
  }
  function renderQuiz() {
    const q = quiz.qs[quiz.i];
    $('#quiz-progress').textContent = `Question ${quiz.i + 1} / ${quiz.qs.length} · Bonnes réponses : ${quiz.score}`;
    $('#quiz-bar').style.width = (quiz.i / quiz.qs.length) * 100 + '%';
    $('#quiz-q').textContent = q.question;
    $('#quiz-opts').innerHTML = q.options.map((o, i) => `<button class="qopt" data-nav ${i === 0 ? 'data-default' : ''} data-act="quizAnswer:${i}"><span class="ql">${'ABCD'[i]}</span>${esc(o)}</button>`).join('');
    $('#quiz-feedback').hidden = true;
    quiz.answered = false;
    focusIdx = 0; paintFocus();
  }
  function answerQuiz(i) {
    if (!quiz || quiz.answered) return;
    quiz.answered = true;
    const q = quiz.qs[quiz.i];
    const ok = i === q.answer;
    if (ok) { quiz.score++; OT.Sound.ok(); OT.Input.rumble(-1, 0, 0.4, 120); } else { OT.Sound.bad(); OT.Input.rumble(-1, 0.6, 0, 200); }
    const btns = document.querySelectorAll('.qopt');
    btns.forEach((b, k) => { b.disabled = true; b.classList.toggle('right', k === q.answer); b.classList.toggle('wrong', k === i && !ok); });
    $('#quiz-verdict').textContent = ok ? 'Bonne réponse !' : 'Pas tout à fait.';
    $('#quiz-verdict').className = ok ? 'good' : 'bad';
    $('#quiz-explain').textContent = q.explain;
    $('#quiz-feedback').hidden = false;
    $('#btn-quiz-next').textContent = quiz.i + 1 < quiz.qs.length ? 'Question suivante' : 'Voir mon résultat';
    $('#quiz-progress').textContent = `Question ${quiz.i + 1} / ${quiz.qs.length} · Bonnes réponses : ${quiz.score}`;
    focusIdx = 0; paintFocus();
  }
  function nextQuiz() {
    if (!quiz.answered) return;
    quiz.i++;
    if (quiz.i < quiz.qs.length) { renderQuiz(); return; }
    // Résultat
    const p = OT.Save.active, w = quiz.world, P = wp(p, w), W = WDATA(w);
    const passed = quiz.score >= OT.QUIZ_PASS;
    const gain = Math.max(0, quiz.score - P.quiz.best) * OT.REWARDS.perQuizAnswer;
    p.coins += gain;
    P.quiz.best = Math.max(P.quiz.best, quiz.score);
    if (passed) { P.quiz.passed = true; if (!p.chapters.includes(w)) p.chapters.push(w); }
    OT.Save.save();
    $('#qr-score').textContent = `${quiz.score} / ${quiz.qs.length}`;
    $('#qr-title').textContent = passed ? 'Quiz réussi !' : 'Pas encore…';
    $('#qr-text').textContent = passed
      ? `Tu as compris ce que ${W.name} voulait t'apprendre. Le Chapitre ${w} de l'histoire d'Oswel est débloqué.`
      : `Il faut au moins ${OT.QUIZ_PASS} bonnes réponses. Relis les leçons dans le Carnet d'Oswel, puis réessaie.`;
    $('#qr-gain').innerHTML = gain ? `+${gain} pièces ${coinSvg}` : '';
    $('#btn-qr-main').textContent = passed ? `Lire le Chapitre ${w}` : 'Réessayer le quiz';
    $('#btn-qr-main').dataset.act = passed ? 'readChapterNew' : 'quiz';
    show('quizresult');
  }
  actions.readChapterNew = () => openChapter(quiz ? quiz.world : curWorld, false);

  let chapRead = 0;
  function readChapterAloud(ch) {
    if (!OT.Dialogue) return;
    const token = ++chapRead;
    const paras = ch.paragraphs.concat([ch.last]);
    const els = () => [...document.querySelectorAll('#chap-body p')];
    const next = (k) => {
      if (token !== chapRead || k >= paras.length || $('#screen-chapter').hidden) { els().forEach((e) => e.classList.remove('reading')); return; }
      els().forEach((e, j) => e.classList.toggle('reading', j === k));
      const el = els()[k]; if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      OT.Dialogue.say('chapitre', paras[k], { priority: 3, subtitle: false, onEnd: () => setTimeout(() => next(k + 1), 350) });
    };
    setTimeout(() => next(0), 700);
  }
  function openChapter(n, fromCarnet) {
    const ch = OT.CHAPTERS[n - 1];
    if (!ch) return;
    $('#chap-title').textContent = `Chapitre ${ch.n} — ${ch.title}`;
    $('#chap-body').innerHTML = ch.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('') + `<p class="last">${esc(ch.last)}</p>`;
    // version 1.4 : Oswel lit son chapitre (la voix suit le paragraphe surligné)
    readChapterAloud(ch);
    $('#screen-chapter').dataset.from = fromCarnet ? 'carnet' : 'game';
    $('#screen-chapter').dataset.n = n;
    // écran suivant : le monde d'après est-il prêt ?
    const next = n + 1, nw = OT.WORLDS[next - 1];
    $('#soon-kicker').textContent = `Monde ${n} terminé`;
    if (OT.WORLD_DATA[next]) {
      $('#soon-title').textContent = nw.name;
      $('#soon-text').textContent = `« ${nw.motto}. » Le Monde ${next} est débloqué.`;
      $('#soon-sub').textContent = 'Une nouvelle partie de l\'histoire d\'Oswel commence.';
      $('#btn-soon-main').textContent = `Entrer dans ${nw.name}`;
      $('#btn-soon-main').dataset.act = 'openWorld:' + next;
    } else if (!nw) {
      // la fin du jeu… pour l'instant
      // version 1.4 : la fin ouverte
      const E = OT.STORY_ENDING || { title: "OSWEL'S TRAP", lines: ['MON HISTOIRE N\'EST PAS TERMINÉE.', 'LE PROCHAIN NIVEAU RESTE À CRÉER.', 'À SUIVRE…'] };
      $('#soon-kicker').textContent = E.title;
      $('#soon-title').textContent = E.lines[0];
      $('#soon-text').innerHTML = esc(E.lines[1]) + '<br><b class="asuivre">' + esc(E.lines[2]) + '</b>';
      $('#soon-sub').innerHTML = 'Merci d\'avoir joué. La Rumeur s\'est tue, mais l\'histoire d\'Oswel continue de s\'écrire.<br><span class="credits-k">Avec, dans leur propre rôle :</span> ' + esc((OT.CREDITS || []).join(' · '));
      $('#btn-soon-main').textContent = 'Ouvrir le Carnet';
      $('#btn-soon-main').dataset.act = 'carnet';
    } else {
      $('#soon-title').textContent = nw.name;
      $('#soon-text').textContent = 'L\'histoire continue…';
      $('#soon-sub').textContent = `Le Monde ${next} arrive dans une prochaine version d'Oswel's Trap.`;
      $('#btn-soon-main').textContent = 'Ouvrir le Carnet';
      $('#btn-soon-main').dataset.act = 'carnet';
    }
    $('#btn-soon-carnet').hidden = $('#btn-soon-main').dataset.act === 'carnet';
    show('chapter');
  }

  /* ---------- HUD ---------- */
  function hud(d) {
    if (!d) return;
    $('#hud-title').textContent = d.title;
    $('#hud-deaths').textContent = d.deaths;
    $('#hud-time').textContent = fmtTime(d.time);
    $('#hud-coins').innerHTML = `${coinSvg}${d.coins}/${d.coinCount}`;
    const extra = [];
    if (d.part !== null) extra.push(d.part ? 'Pièce du moteur trouvée' : 'Pièce du moteur manquante');
    if (d.power !== null && d.power > 0) extra.push(`Courant coupé ${d.power.toFixed(1)} s`);
    if (d.extra) extra.push(...d.extra);
    $('#hud-extra').textContent = extra.join(' · ');
    const vs = $('#hud-vs');
    vs.hidden = d.mode !== 'versus';
    if (d.mode === 'versus') { const n = OT.Game._dbg.players.map((p) => esc(p.name)); vs.innerHTML = `<span class="c1">${n[0]} ${d.score[0]}</span> – <span class="c2">${d.score[1]} ${n[1] || ''}</span>`; }
  }
  // version 1.5 : l'aide du boss s'affiche EN ENTIER quand elle change (nouvelle phase, nouvelle consigne)
  // ou après plusieurs échecs, puis se replie en une seule ligne au bout de 9 s (l'écran reste dégagé).
  // Le texte complet reste lisible dans le menu pause.
  let bossHelp = '', bossHelpT = 0, bossFull = false;
  const premierePhrase = (t) => { const m = /^(.+?[.!?])(\s|$)/.exec(t || ''); const s = m ? m[1] : (t || ''); return s.length > 120 ? s.slice(0, 117) + '…' : s; };
  function bossHelpShow(full) {
    const h = $('#boss-help'); if (!h) return;
    bossFull = full;
    h.textContent = full ? bossHelp : premierePhrase(bossHelp);
    h.classList.toggle('replie', !full && premierePhrase(bossHelp) !== bossHelp);
    clearTimeout(bossHelpT);
    if (full) bossHelpT = setTimeout(() => bossHelpShow(false), 9000);
  }
  function bossBar(b) {
    const el = $('#bossbar');
    if (!b) { el.hidden = true; bossHelp = ''; clearTimeout(bossHelpT); const pg = $('#pause-boss'); if (pg) pg.textContent = ''; return; }
    el.hidden = false;
    $('#boss-name').textContent = b.name;
    $('#boss-phase').textContent = `Phase ${b.phase}/${b.of} · ${b.label}`;
    if (b.help !== bossHelp) {
      bossHelp = b.help || '';
      bossHelpShow(true);
      const pg = $('#pause-boss'); if (pg) pg.textContent = bossHelp ? `${b.name} — ${bossHelp}` : '';
    }
    $('#boss-fill').style.width = (((b.phase - 1) + (b.sub || 0)) / b.of) * 100 + '%';
  }
  // Objectif du niveau : bandeau au début + ligne permanente dans le HUD + menu pause
  let goalT = 0;
  function goal(text) {
    $('#hud-goal').textContent = 'Objectif : ' + text;
    $('#pause-goal').textContent = 'Objectif : ' + text;
    const b = $('#goal-banner');
    b.querySelector('b').textContent = text;
    b.hidden = false; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
    goalT = 4;
  }
  // version 1.3 : bandeau d'une nouvelle zone (« ZONE 2/4 · La salle des presses »)
  function zone(n, of, name, goalText) {
    const b = $('#zone-banner'); if (!b) return;
    b.querySelector('small').textContent = `Zone ${n} / ${of}`;
    b.querySelector('b').textContent = name || '';
    const em = b.querySelector('em'); em.textContent = goalText || ''; em.hidden = !goalText;
    b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
    if (goalText) { $('#hud-goal').textContent = 'Objectif : ' + goalText; $('#pause-goal').textContent = 'Objectif : ' + goalText; }
  }
  function flash() { const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  function toast(msg) { const el = $('#toast'); el.textContent = msg; el.hidden = false; toastT = Math.max(3.2, msg.length / 18); }
  function fmtTime(t) {
    const m = Math.floor(t / 60), s = Math.floor(t % 60), cs = Math.floor((t * 100) % 100);
    return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }
  function fmtShort(t) { const m = Math.floor(t / 60), s = Math.round(t % 60); return m ? `${m} min ${String(s).padStart(2, '0')}` : `${s} s`; }

  /* ---------- Chaque image ---------- */
  function frame(dt) {
    // animation de lancement : les boutons servent seulement à la lancer ou à la passer
    if (OT.Splash && OT.Splash.active) { OT.Splash.frame(OT.Input.menuActions(dt)); return; }
    OT.Input.pollCapture();
    if (OT.Input.capturing) return;
    if (current && frameHooks[current.id] && !dlg) { if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('#toast').hidden = true; } frameHooks[current.id](dt); return; }
    const acts = OT.Input.menuActions(dt);
    touchAction(dt);
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('#toast').hidden = true; }
    if (goalT > 0) { goalT -= dt; if (goalT <= 0) $('#goal-banner').hidden = true; }
    // cinématique : n'importe quel bouton la passe
    if (OT.Game.state === 'cine') { if (acts.some((a) => a === 'ok' || a === 'back' || a === 'pause' || a === 'talk')) OT.Game.skipCine(); return; }
    if (dlg && !dlg.full) {
      dlg.shown += dt * (dlg.speed || 55);
      const n = Math.floor(dlg.shown);
      $('#dlg-text').textContent = dlg.text.slice(0, n);
      if (n % 4 === 0 && n < dlg.text.length && !(OT.Dialogue && OT.Dialogue.speaking)) OT.Sound.talk();
      if (n >= dlg.text.length) dlg.full = true;
    }
    if (dlg) { if (acts.includes('ok') || acts.includes('talk') || acts.includes('back')) advanceDialog(); return; }
    if (!current) { if (acts.includes('pause') && OT.Game.state === 'play') pause(); return; }
    // si on écrit dans un champ texte, seules Entrée et Échap comptent
    const typing = isTyping();
    const items = navItems();
    for (const a of acts) {
      if (typing && a !== 'ok' && a !== 'back') continue;
      if (a === 'up' || a === 'left') { focusIdx = (focusIdx - 1 + items.length) % items.length; OT.Sound.menu(); paintFocus(); if (isTyping()) document.activeElement.blur(); }
      else if (a === 'down' || a === 'right') { focusIdx = (focusIdx + 1) % items.length; OT.Sound.menu(); paintFocus(); if (isTyping()) document.activeElement.blur(); }
      else if (a === 'ok') { const b = items[focusIdx]; if (b) { OT.Sound.unlock(); if (['INPUT', 'TEXTAREA'].includes(b.tagName)) b.focus(); else b.click(); } break; }
      else if (a === 'back' || (a === 'pause' && current.dataset.back === 'game')) { OT.Sound.menu(); actions.back(); break; }
    }
  }

  /* ---------- Démarrage ---------- */
  function init() {
    document.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      OT.Sound.unlock();
      const [name, ...args] = b.dataset.act.split(':');
      if (actions[name]) { OT.Sound.menu(); actions[name](...args); }
    });
    document.body.addEventListener('pointerover', (e) => {
      const b = e.target.closest('[data-nav]');
      if (!b || !current) return;
      const i = navItems().indexOf(b);
      if (i >= 0 && i !== focusIdx) { focusIdx = i; paintFocus(); }
    });
    $('#reg-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); actions.regCreate(); } });
    $('#srv-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); actions.srvSave(); } });
    $('#dialog').addEventListener('pointerdown', (e) => { e.preventDefault(); advanceDialog(); });
    $('#cine').addEventListener('pointerdown', (e) => { e.preventDefault(); OT.Game.skipCine(); });
    $('#btn-pause').addEventListener('click', () => pause());
    $('#bind-overlay').addEventListener('click', () => OT.Input.cancelCapture());
    OT.Input.initTouch($('#touch'));
    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { OT.Sound.unlock(); if (OT.Music && OT.Game.state === 'idle' && !(OT.Splash && OT.Splash.active)) OT.Music.play('menu'); }, { once: true }));
    // « Tourne ton téléphone » : seulement en jeu (les menus marchent aussi en portrait)
    const checkRotate = () => {
      const inMenu = !!document.querySelector('.screen:not([hidden])') || (OT.Splash && OT.Splash.active);
      const want = !inMenu && window.innerHeight > window.innerWidth * 1.05 && matchMedia('(pointer: coarse)').matches;
      if ($('#rotate').hidden === want) $('#rotate').hidden = !want;
    };
    window.addEventListener('resize', checkRotate); checkRotate();
    setInterval(checkRotate, 400);
    // jamais de zoom du navigateur (pincer, Ctrl + molette, Ctrl +/-) ni de défilement de la page
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
    window.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0', 'Equal', 'Minus'].includes(e.key)) e.preventDefault(); });
    window.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) { e.preventDefault(); return; }
      // un doigt : on ne laisse défiler QUE l'intérieur d'un panneau qui a de quoi défiler
      const sc = e.target.closest && e.target.closest('.scrolly, .screen > .panel, .screen > .title-wrap, .screen > article, .plist, .ctrl-wrap, .shop-list, .items');
      if (!sc) e.preventDefault();
    }, { passive: false });
    window.addEventListener('scroll', () => { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    // Installation (Android / PC) : application web
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (current && current.id === 'screen-title') rerender(); });
    if (!OT.SINGLE_FILE && !window.Capacitor && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
    // version 1.5 — application Android : le bouton « retour » du téléphone = Retour / Pause (et quitter depuis l'accueil)
    try {
      const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
      if (App && App.addListener) App.addListener('backButton', () => {
        if (dlg) { advanceDialog(); return; }
        const st = OT.Game.state;
        if (!current && (st === 'play' || st === 'dialog')) { pause(); return; }
        if (current && current.id === 'screen-title') { App.exitApp(); return; }
        if (!current && OT.Arena && OT.Arena.active && !OT.Arena.paused && OT.ArenaUI) { OT.ArenaUI.pause(null); return; }
        if (current && current.dataset.back) actions.back();
      });
    } catch (e) {}
    // Premier lancement : inscription obligatoire
    if (!OT.Save.active) { regFor = 'p1'; show('register'); } else show('title');
  }

  return {
    init, show, toast, dialog, levelComplete, hud, bossBar, bossHelpFull: () => { if (bossHelp) bossHelpShow(true); }, frame, flash, goal, zone, cineText,
    get dialogOpen() { return !!dlg; },
    // version 1.5 : les profils qui jouent la partie en cours (joueur 1 + vrai profil du joueur 2 hors solo)
    profilesInPlay: () => [OT.Save.active].concat(pendingMode !== 'solo' && p2Id && OT.Save.prof(p2Id) ? [OT.Save.prof(p2Id)] : []).filter(Boolean),
    get world() { return curWorld; },
    // pour les tests automatiques : fermer le dialogue d'un coup
    _closeDialog() { if (!dlg) return; const cb = dlg.cb; dlg = null; $('#dialog').hidden = true; cb && cb(); },
    _actions: actions,
    // pour les autres fichiers d'interface (arena/ui.js) : ajouter des écrans et des boutons
    ext: { actions, renderers, frameHooks, show, esc, toast, $, rerender, get current() { return current; }, pause },
    npcModel: (id) => npcModel(id),
  };
})();

/* ---------------------------------------------------------------------
   APERÇU 3D DU HÉROS dans la boutique (petit rendu séparé)
   --------------------------------------------------------------------- */
/* ---------------------------------------------------------------------
   APERÇU 3D DU PERSONNAGE (écran titre, personnalisation, boutique)
   Un seul moteur de rendu, déplacé d'un écran à l'autre.
   Caméra : glisser (souris / doigt) = tourner, molette ou pincer = zoom,
   manette : stick droit = tourner, R2 = zoom avant, L2 = zoom arrière,
   double-clic / double tap = recentrer. Il tourne tout seul au repos.
   --------------------------------------------------------------------- */
const Preview = (function () {
  let r = null, sc = null, cam = null, hero = null, ctl = null, raf = 0, holder = null, key = '', cv = null;
  let ring = null, halo = null, last = 0, t = 0, opts = {};
  const V = { yaw: 0.45, pitch: 0.1, zoom: 1, ty: 0.45, tp: 0.1, tz: 1, vy: 0, lastIn: -9 };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ptr = new Map(); let pinch = null, lastTap = 0;
  function ensure() {
    if (r) return;
    cv = document.createElement('canvas'); cv.className = 'pv-canvas';
    r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    sc = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    sc.add(new THREE.HemisphereLight(0xffe3c4, 0x2a1a12, 0.85));
    const d = new THREE.DirectionalLight(0xffffff, 1.15); d.position.set(2, 4, 3); sc.add(d);
    const rimL = new THREE.DirectionalLight(0xff9a50, 0.9); rimL.position.set(-3, 2, -3); sc.add(rimL);
    const rimC = new THREE.DirectionalLight(0x5fd4ff, 0.6); rimC.position.set(3, 1.5, -2.5); sc.add(rimC);
    // socle holographique
    const lin = (h) => new THREE.Color(h).convertSRGBToLinear();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.14, 48), new THREE.MeshLambertMaterial({ color: lin(0x1b1820) }));   // mat : pas de reflet clair sur le dessus
    base.position.y = -0.07; sc.add(base);
    ring = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.02, 8, 64), new THREE.MeshBasicMaterial({ color: lin(0xff8a2b), toneMapped: false }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.005; sc.add(ring);
    halo = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshBasicMaterial({ color: lin(0x5fd4ff), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.01; sc.add(halo);
    // commandes : doigts et souris
    const touched = () => { V.lastIn = t; };
    cv.addEventListener('pointerdown', (e) => {
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: V.tz }; }
      if (e.pointerType === 'touch' && ptr.size === 1) { const now = performance.now(); if (now - lastTap < 280) reset(); lastTap = now; }
      touched();
    });
    cv.addEventListener('pointermove', (e) => {
      const p = ptr.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (ptr.size >= 2 && pinch) { const [a, b] = [...ptr.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch.d > 10) V.tz = clamp(pinch.z * (pinch.d / d), 0.45, 1.6); }
      else { V.ty -= dx * 0.012; V.tp = clamp(V.tp + dy * 0.006, -0.35, 0.7); }
      touched();
    });
    const up = (e) => { ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('lostpointercapture', up);
    cv.addEventListener('dblclick', reset);
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('wheel', (e) => { e.preventDefault(); V.tz = clamp(V.tz * Math.exp(clamp(e.deltaY, -200, 200) * 0.0015), 0.45, 1.6); touched(); }, { passive: false });
  }
  function reset() { V.ty = 0.45; V.tp = 0.1; V.tz = 1; V.vy = 0; }
  function show(el, skin, o = {}) {
    if (!window.THREE || !el) return;
    ensure();
    opts = o;
    if (holder !== el) { el.innerHTML = ''; el.appendChild(cv); holder = el; }
    const k = JSON.stringify(skin);
    if (k !== key) {
      if (hero) sc.remove(hero);
      hero = OT.Models.hero(skin, { marker: false }); sc.add(hero); key = k;
      ctl = OT.Anim ? OT.Anim.create(hero) : null;
      ring.material.color.set(new THREE.Color(skin.color || 0xff8a2b).convertSRGBToLinear());
    }
    const w = el.clientWidth || 200, h = el.clientHeight || 220;
    r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  // n'importe quel modèle (personnage de l'histoire, boss) : key = identifiant, build = fabrique
  function model(el, k, build, o = {}) {
    if (!window.THREE || !el) return;
    ensure(); opts = o;
    if (holder !== el) { el.innerHTML = ''; el.appendChild(cv); holder = el; }
    if (k !== key) {
      if (hero) sc.remove(hero);
      hero = build(); sc.add(hero); key = k;
      ctl = OT.Anim && hero.userData && hero.userData.legL ? OT.Anim.create(hero) : null;
      ring.material.color.set(0xffffff);
    }
    const w = el.clientWidth || 200, h = el.clientHeight || 220;
    r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  // l'aperçu essaie un objet : on joue un petit geste
  function play(kind) {
    if (!ctl) return;
    if (kind === 'win') { ctl.loop('victory'); setTimeout(() => ctl && ctl.loop(null), 2600); }
    else if (kind === 'emote') ctl.emote();
    else if (kind === 'reset') reset();
    else ctl.play(kind);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    // plus affiché (écran fermé) : on s'arrête
    if (!holder || !holder.isConnected || holder.offsetParent === null) { stop(); return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; t += dt;
    // manette : stick droit = tourner, R2 / L2 = zoom
    const pads = OT.Input && OT.Input.pads ? OT.Input.pads() : [];
    for (const g of pads) {
      let rx = g.axes[2] || 0, ry = g.axes[3] || 0;
      if (Math.hypot(rx, ry) > 0.18) { V.ty -= rx * dt * 3.2; V.tp = clamp(V.tp + ry * dt * 1.6, -0.35, 0.7); V.lastIn = t; }
      const l2 = g.buttons[6] ? g.buttons[6].value : 0, r2 = g.buttons[7] ? g.buttons[7].value : 0;
      if (r2 > 0.08) { V.tz = clamp(V.tz * Math.exp(-dt * 1.6 * r2), 0.45, 1.6); V.lastIn = t; }
      if (l2 > 0.08) { V.tz = clamp(V.tz * Math.exp(dt * 1.6 * l2), 0.45, 1.6); V.lastIn = t; }
    }
    // au repos : il tourne doucement tout seul
    if (t - V.lastIn > 3 && !ptr.size) V.ty += dt * (opts.spin || 0.35);
    const k = 1 - Math.exp(-dt * 8);
    V.yaw += (V.ty - V.yaw) * k; V.pitch += (V.tp - V.pitch) * k; V.zoom += (V.tz - V.zoom) * (1 - Math.exp(-dt * 6));
    const H = (hero && hero.userData.height) || 1.25;
    const look = H * (0.62 - (1 - V.zoom) * 0.25);           // en zoomant, on regarde le visage
    const dist = (opts.dist || 4.2) * V.zoom;
    cam.position.set(Math.sin(V.yaw) * Math.cos(V.pitch) * dist, look + Math.sin(V.pitch) * dist, Math.cos(V.yaw) * Math.cos(V.pitch) * dist);
    cam.lookAt(0, look, 0);
    if (ctl) ctl.update(dt, { speed: 0, ground: true });
    else if (hero && hero.userData.gadTick) hero.userData.gadTick(t);
    halo.material.opacity = 0.1 + Math.sin(t * 2) * 0.04;
    ring.rotation.z = t * 0.5;
    r.render(sc, cam);
  }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { show, model, stop, play, reset, get _dbg() { return { sc, r, hero }; } };
})();

/* ---------------------------------------------------------------------
   LANCEMENT
   --------------------------------------------------------------------- */
window.addEventListener('load', () => {
  if (!window.THREE) { document.getElementById('boot-error').hidden = false; return; }
  OT.Save.load();
  const go = () => {
    OT.Game.init(document.getElementById('scene'));
    OT.Game.showBackdrop();
    OT.UI.init();
    if (OT.Splash) OT.Splash.run();
  };
  // attendre les polices pour que les étiquettes 3D soient nettes
  if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(go);
  else go();
});
