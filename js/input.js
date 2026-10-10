/* =====================================================================
   OSWEL'S TRAP — input.js  (version 4)
   Les TROIS façons de jouer :
     1) la manette PS4 (Gamepad API) + ses vibrations,
     2) le clavier (2 joueurs possibles sur le même clavier),
     3) l'écran tactile (Android) avec des boutons à l'écran.
   NOUVEAU : toutes les touches sont personnalisables (OT.settings.binds),
   et on retient pour chaque joueur s'il joue au clavier, à la manette ou
   au doigt, pour afficher la bonne touche à l'écran (ex. « △ Parler »).
   ===================================================================== */

window.OT = window.OT || {};

/* Touches par défaut (event.code = position PHYSIQUE de la touche :
   KeyA = la touche Q en AZERTY, KeyW = la touche Z en AZERTY) */
OT.DEFAULT_BINDS = () => ({
  kb: [
    { left: ['KeyA'], right: ['KeyD'], jump: ['KeyW', 'Space'], talk: ['KeyE'], run: ['ShiftLeft'], gadget: ['KeyF'] },
    { left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'], talk: ['ArrowDown'], run: ['ShiftRight'], gadget: ['ControlRight', 'Numpad0'] },
  ],
  // numéros de boutons de la disposition « standard » (0 = Croix, 1 = Rond, 2 = Carré, 3 = Triangle…)
  pad: [
    { jump: 0, talk: 3, run: 2, gadget: 1 },
    { jump: 0, talk: 3, run: 2, gadget: 1 },
  ],
});
// version 1.5 : nouvelle action « gadget » (F · Ctrl droit · ○). Les touches déjà sauvegardées
// (versions précédentes) n'ont pas cette action : on l'ajoute sans toucher aux autres choix du joueur.
OT.fixBinds = function (B) {
  if (!B || B._v15) return B;
  const D = OT.DEFAULT_BINDS();
  const used = new Set();
  for (const kb of B.kb || []) for (const a in kb) if (Array.isArray(kb[a])) kb[a].forEach((k) => used.add(k));
  for (let i = 0; i < 2; i++) {
    if (B.kb && B.kb[i] && !B.kb[i].gadget) B.kb[i].gadget = D.kb[i].gadget.filter((k) => !used.has(k));
    if (B.pad && B.pad[i] && B.pad[i].gadget === undefined) {
      const taken = [B.pad[i].jump, B.pad[i].talk, B.pad[i].run];
      B.pad[i].gadget = [1, 5, 4].find((b) => !taken.includes(b));
    }
  }
  try { Object.defineProperty(B, '_v15', { value: true, enumerable: false }); } catch (e) {}
  return B;
};

/* Noms affichés des boutons de la manette PS4 */
OT.PAD_NAMES = { 0: '✕', 1: '○', 2: '□', 3: '△', 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 8: 'SHARE', 9: 'OPTIONS', 10: 'L3', 11: 'R3', 12: '↑', 13: '↓', 14: '←', 15: '→', 16: 'PS', 17: 'PAVÉ' };
OT.ACTION_NAMES = { left: 'Aller à gauche', right: 'Aller à droite', jump: 'Sauter', talk: 'Action (parler, ouvrir, entrer)', run: 'Courir', gadget: 'Pouvoir de Tony (appui court = utiliser, maintenir = changer)' };

OT.Input = (function () {
  const keys = new Set();
  let keyQueue = [];
  const touch = [mkPad(), mkPad()];
  const prev = [mkPad(), mkPad()];
  const prevPadBtn = {};
  let stickHold = { dir: null, t: 0 };
  let lastSource = 'keyboard';
  const srcOf = ['kb', 'kb'];      // dernière source utilisée par chaque joueur
  let touchActive = false;
  let capture = null;              // capture d'une nouvelle touche (écran Touches)
  let layoutMap = null;            // vraies lettres du clavier (AZERTY…)
  const usedPad = [null, null];    // index de la manette VRAIMENT utilisée par chaque joueur (pour vibrer la bonne)
  let soloMode = true;             // en solo, on fait vibrer toutes les manettes branchées
  let lastRumble = { ok: null, msg: '' };

  function mkPad() { return { left: false, right: false, jump: false, talk: false, run: 0, gadget: false }; }
  const binds = () => OT.fixBinds((OT.settings && OT.settings.binds) || OT.DEFAULT_BINDS());

  // Lire la disposition du clavier pour afficher « Q » au lieu de « A » en AZERTY
  try { navigator.keyboard && navigator.keyboard.getLayoutMap && navigator.keyboard.getLayoutMap().then((m) => { layoutMap = m; }).catch(() => {}); } catch (e) {}

  /* ---------- Nom lisible d'une touche ---------- */
  const SPECIAL = {
    Space: 'Espace', Enter: 'Entrée', Escape: 'Échap', Backspace: 'Retour', Tab: 'Tab',
    ShiftLeft: 'Maj G', ShiftRight: 'Maj D', ControlLeft: 'Ctrl G', ControlRight: 'Ctrl D', AltLeft: 'Alt', AltRight: 'Alt Gr',
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', NumpadEnter: 'Entrée pavé',
  };
  function keyLabel(code) {
    if (!code) return '—';
    if (SPECIAL[code]) return SPECIAL[code];
    if (layoutMap && layoutMap.get(code)) return layoutMap.get(code).toUpperCase();
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'Pavé ' + code.slice(6);
    return code;
  }
  function padLabel(i) { return OT.PAD_NAMES[i] !== undefined ? OT.PAD_NAMES[i] : 'Bouton ' + i; }

  /* ---------- Clavier ---------- */
  window.addEventListener('keydown', (e) => {
    if (capture && capture.kind === 'kb') {
      e.preventDefault();
      const cb = capture.cb; capture = null;
      cb(e.code === 'Escape' ? null : e.code);
      return;
    }
    // ne pas voler les touches pendant qu'on écrit son pseudo
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (!keys.has(e.code)) keyQueue.push(e.code);
    keys.add(e.code);
    lastSource = 'keyboard';
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  const anyKey = (list) => (list || []).some((k) => keys.has(k));

  /* ---------- Manettes ---------- */
  let padBlocked = false;   // vrai si la page n'a pas le droit de lire les manettes (rare)
  function browserPads() {
    try { return navigator.getGamepads ? Array.from(navigator.getGamepads()).filter((g) => g && g.connected) : []; }
    catch (e) { padBlocked = true; return []; }
  }
  // les manettes vues par le navigateur + celles du « mode direct PS4 » (WebHID) qu'il ne voit pas
  // (ex. : Edge qui dit « aucune manette » alors que la manette marche dans Firefox)
  function pads() {
    let list = browserPads();
    const hid = OT.Light && OT.Light.pads ? OT.Light.pads() : [];
    if (hid.length > list.length) list = list.concat(hid.slice(list.length));
    // version 1.5 : les manettes du RÉSEAU LOCAL (téléphones, autres PC) — voir js/lan.js
    if (OT.LAN && OT.LAN.actif) { const net = OT.LAN.pads(); if (net.length) list = list.concat(net); }
    return list;
  }
  function padFor(pi) {
    // une manette réseau qui a choisi « Joueur 1 / Joueur 2 » passe avant les manettes branchées
    if (OT.LAN && OT.LAN.actif) { const n = OT.LAN.padForSlot(pi); if (n) return n; }
    const list = pads().filter((g) => !g.net);
    const swap = OT.settings && OT.settings.swapPads;
    const idx = swap ? (list.length >= 2 ? 1 - pi : (pi === 1 ? 0 : -1)) : pi;
    return idx >= 0 ? list[idx] || null : null;
  }
  const btn = (g, i) => !!(g && g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.5));
  // stick analogique : petite inclinaison = lent, à moitié = vitesse normale, à fond = vitesse maximale (comme en courant)
  const STICK_DEAD = 0.2;
  const stickSpeed = (ax) => {
    const a = Math.abs(ax); if (a <= STICK_DEAD) return 1;
    const u = Math.min(1, (a - STICK_DEAD) / 0.65);
    return u < 0.5 ? 0.3 + 1.4 * u : 1 + 0.7 * (u - 0.5);   // 0,3 → 1 (normal) → 1,35 (maximum = vitesse de course)
  };
  const val = (g, i) => (g && g.buttons[i] ? g.buttons[i].value : 0);
  // L2 / R2 : zoom de la caméra (réglage par défaut) ou course progressive (ancien réglage)
  const trigRun = () => OT.settings && OT.settings.camTriggers === 'run';
  // un bouton choisi par le joueur dans « Changer les touches » garde toujours sa fonction
  function boundPad(i) { const B = binds(); return B.pad.some((pb) => pb.jump === i || pb.talk === i || pb.run === i || pb.gadget === i); }

  window.addEventListener('gamepadconnected', (e) => {
    lastSource = 'gamepad';
    OT.UI && OT.UI.toast('Manette connectée : ' + shortName(e.gamepad.id));
    setTimeout(() => rumbleRaw(e.gamepad.index, 0.6, 0.3, 220), 50);
  });
  window.addEventListener('gamepaddisconnected', () => OT.UI && OT.UI.toast('Manette déconnectée'));
  function shortName(id) {
    if (/054c|wireless controller|dualshock/i.test(id)) return 'DualShock 4 (PS4)';
    return id.split('(')[0].trim().slice(0, 32) || 'manette';
  }

  /* ---------- Tactile ---------- */
  const fingers = new Map();
  function setTouch(p, k, on) {
    if (k === 'run') touch[p].run = on ? 1 : 0; else touch[p][k] = on;
    const el = document.querySelector(`.tbtn[data-p="${p}"][data-k="${k}"]`);
    if (el) el.classList.toggle('on', on);
  }
  function btnAt(x, y) { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('.tbtn') : null; }
  function onDown(e) {
    const el = e.target.closest && e.target.closest('.tbtn');
    if (!el) return;
    e.preventDefault();
    touchActive = true; lastSource = 'touch';
    const p = +el.dataset.p, k = el.dataset.k;
    srcOf[p] = 'touch';
    fingers.set(e.pointerId, { p, k });
    setTouch(p, k, true);
    if (k === 'jump' || k === 'talk' || k === 'gadget') vibrate(12);
  }
  function onMove(e) {
    const f = fingers.get(e.pointerId);
    if (!f) return;
    const el = btnAt(e.clientX, e.clientY);
    if (el && +el.dataset.p === f.p && el.dataset.k !== f.k) { setTouch(f.p, f.k, false); f.k = el.dataset.k; setTouch(f.p, f.k, true); }
  }
  function onUp(e) { const f = fingers.get(e.pointerId); if (!f) return; setTouch(f.p, f.k, false); fingers.delete(e.pointerId); }
  function initTouch(root) {
    root.addEventListener('pointerdown', onDown, { passive: false });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  function clearTouch() {
    for (const p of [0, 1]) for (const k of ['left', 'right', 'jump', 'talk', 'run', 'gadget']) setTouch(p, k, false);
    fingers.clear();
  }

  /* ---------- Vibrations ----------
     DualShock 4 : strong = gros moteur (chocs), weak = petit moteur (bourdonnement).
     Android tactile : navigator.vibrate(ms). */
  // Vibration par l'API Gamepad du navigateur (Chrome / Edge). Renvoie une promesse.
  function rumbleRaw(gpIndex, strong, weak, ms) {
    let g = null;
    try { g = navigator.getGamepads ? navigator.getGamepads()[gpIndex] : null; } catch (e) { g = null; }
    if (!g) return Promise.resolve('no-pad');
    const s = OT.settings ? OT.settings.vibStrength : 1;
    const a = g.vibrationActuator;
    const params = { startDelay: 0, duration: Math.max(20, Math.round(ms)), strongMagnitude: Math.min(1, strong * s), weakMagnitude: Math.min(1, weak * s) };
    try {
      if (a && a.playEffect) {
        // « dual-rumble » = les deux moteurs de la DualShock 4 (on ne se fie pas à a.type, absent dans les Chrome récents)
        return a.playEffect('dual-rumble', params)
          .then((r) => { lastRumble = { ok: true, msg: r }; return r; })
          .catch((e) => { lastRumble = { ok: false, msg: String(e && e.message || e) }; return 'error'; });
      }
      if (g.hapticActuators && g.hapticActuators[0]) { g.hapticActuators[0].pulse(Math.min(1, Math.max(strong, weak) * s), ms); return Promise.resolve('pulse'); }
    } catch (err) { lastRumble = { ok: false, msg: String(err && err.message || err) }; }
    return Promise.resolve('unsupported');
  }
  function vibrate(ms) {
    if (!OT.settings || !OT.settings.vibration) return;
    try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {}
  }
  // Quelles manettes font vibrer pour le joueur pi ?
  //  - en solo : TOUTES les manettes branchées (sur PC, une manette « virtuelle » de Steam ou DS4Windows
  //    peut passer avant la vraie PS4 dans la liste : on ne vise donc pas seulement la première) ;
  //  - à deux : la manette que ce joueur a réellement utilisée (sinon celle de son numéro).
  function targetsFor(pi) {
    const list = pads();
    // mode fête : chaque joueur a SON appareil ; un joueur au clavier ne fait rien vibrer
    if (partyDevs && pi >= 0) {
      const d = partyDevs[pi];
      const g = d && d.startsWith('pad:') ? list.find((q) => q.index === +d.slice(4)) : null;
      return g ? [g] : [];
    }
    if (pi < 0 || soloMode) return list;
    const used = usedPad[pi] !== null ? list.find((g) => g.index === usedPad[pi]) : null;
    const g = used || padFor(pi);
    return g ? [g] : [];
  }
  function rumble(pi, strong, weak, ms) {
    if (!OT.settings || !OT.settings.vibration) return;
    for (const g of targetsFor(pi)) { if (g.net) OT.LAN.rumble(g, strong, weak, ms); else rumbleRaw(g.index, strong, weak, ms); }
    // mode direct (WebHID) : les vibrations passent aussi par la connexion de la barre lumineuse
    if (OT.Light && OT.Light.count) {
      let li = pi < 0 || soloMode ? -1 : pi;
      if (partyDevs && pi >= 0) { const g = targetsFor(pi)[0]; li = g && g.hid ? g.index - 100 : null; }
      if (li !== null) OT.Light.rumble(li, strong * (OT.settings.vibStrength || 1), weak * (OT.settings.vibStrength || 1), ms);
    }
    if (touchActive && Math.max(strong, weak) >= 0.3) vibrate(Math.round(ms * Math.max(strong, weak)));
  }
  // Test complet (Options) : on essaie chaque manette et on rapporte ce qui s'est passé
  async function testRumble() {
    const list = pads();
    if (!list.length) {
      if (padBlocked) return 'Cette page n\'a pas le droit de lire les manettes : ouvre directement le fichier index.html du jeu.';
      // Linux : un navigateur installé en Flatpak ne voit pas les manettes sans l'accès à /run/udev
      if (/Linux/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent)) return 'Aucune manette vue par ce navigateur. Clique dans la page, puis appuie sur ✕. Sous Linux, si le navigateur est en Flatpak, tape dans un terminal : flatpak override --user --filesystem=/run/udev:ro com.microsoft.Edge (ou com.google.Chrome), puis relance-le avec la manette branchée.';
      return 'Aucune manette vue par ce navigateur. Clique dans la page, puis appuie sur ✕ de la manette (le navigateur ne la montre qu\'après un appui). Toujours rien ? « Mode direct PS4 » juste en dessous.';
    }
    const res = [];
    for (const g of list) {
      if (g.hid) continue;   // mode direct : testé plus bas
      const a = g.vibrationActuator;
      if (!a || !a.playEffect) { res.push(`${shortName(g.id)} : le navigateur ne donne pas accès aux vibrations`); continue; }
      const r = await rumbleRaw(g.index, 1, 1, 600);
      res.push(`${shortName(g.id)} : ${r === 'complete' || r === 'preempted' ? 'vibration envoyée' : 'refusée (' + lastRumble.msg + ')'}`);
    }
    if (OT.Light && OT.Light.count) { OT.Light.rumble(-1, 1, 1, 600); res.push('mode direct PS4 : vibration envoyée'); }
    return res.join(' · ');
  }

  /* ---------- Lecture des commandes, une fois par image ---------- */
  function poll(soloMerge) {
    soloMode = !!soloMerge;
    const B = binds();
    const out = [];
    for (let p = 0; p < 2; p++) {
      const g = padFor(p);
      const kb = B.kb[p], pb = B.pad[p];
      const ax = g ? g.axes[0] || 0 : 0;
      const t = touch[p];
      const kbState = {
        left: anyKey(kb.left), right: anyKey(kb.right), jump: anyKey(kb.jump), talk: anyKey(kb.talk), run: anyKey(kb.run),
        gadget: anyKey(kb.gadget),
      };
      const padState = g ? {
        left: btn(g, 14) || ax < -STICK_DEAD, right: btn(g, 15) || ax > STICK_DEAD,
        jump: btn(g, pb.jump), talk: btn(g, pb.talk), run: Math.max(btn(g, pb.run) ? 1 : 0, trigRun() ? val(g, 7) : 0),
        gadget: pb.gadget !== undefined && btn(g, pb.gadget),
      } : null;
      if (kbState.left || kbState.right || kbState.jump || kbState.talk) srcOf[p] = 'kb';
      if (padState && (padState.left || padState.right || padState.jump || padState.talk)) { srcOf[p] = 'pad'; lastSource = 'gamepad'; usedPad[p] = g.index; }
      out.push({
        left: kbState.left || (padState && padState.left) || t.left,
        right: kbState.right || (padState && padState.right) || t.right,
        jump: kbState.jump || (padState && padState.jump) || t.jump,
        talk: kbState.talk || (padState && padState.talk) || t.talk,
        run: Math.max(kbState.run ? 1 : 0, padState ? padState.run : 0, t.run),
        gadget: kbState.gadget || (padState && padState.gadget) || !!t.gadget,
        analog: g && Math.abs(ax) > STICK_DEAD && !btn(g, 14) && !btn(g, 15) ? stickSpeed(ax) : 1,
      });
    }
    if (soloMerge) {
      // En solo, le joueur 1 peut aussi utiliser les touches / la manette du joueur 2
      const a = out[0], b = out[1];
      if ((b.left || b.right) && !(a.left || a.right)) a.analog = b.analog;   // le stick de la 2e manette garde sa progressivité
      a.left = a.left || b.left; a.right = a.right || b.right; a.jump = a.jump || b.jump; a.talk = a.talk || b.talk; a.run = Math.max(a.run, b.run);
      a.gadget = a.gadget || b.gadget;
      if (srcOf[1] !== 'kb' || b.left || b.right || b.jump) { if (b.left || b.right || b.jump || b.talk) srcOf[0] = srcOf[1]; }
    }
    for (let p = 0; p < 2; p++) {
      out[p].jumpP = out[p].jump && !prev[p].jump;
      out[p].talkP = out[p].talk && !prev[p].talk;
      out[p].gadgetP = out[p].gadget && !prev[p].gadget;   // version 1.5 : gadget
      prev[p].jump = out[p].jump; prev[p].talk = out[p].talk; prev[p].gadget = out[p].gadget;
    }
    return out;
  }

  /* ---------- Mode fête : chaque joueur a son appareil ----------
     'kb0' = clavier gauche (Q D Z…), 'kb1' = clavier droit (flèches),
     'pad:N' = la manette numéro N, 'touch' = l'écran tactile. */
  let partyDevs = null;
  const prevDev = [];
  function setPartyDevices(devs) { partyDevs = devs ? devs.slice() : null; prevDev.length = 0; }
  function devState(dev) {
    const B = binds();
    if (dev === 'kb0' || dev === 'kb1') {
      const kb = B.kb[dev === 'kb0' ? 0 : 1];
      return { left: anyKey(kb.left), right: anyKey(kb.right), jump: anyKey(kb.jump), talk: anyKey(kb.talk), run: anyKey(kb.run) ? 1 : 0, gadget: anyKey(kb.gadget), analog: 1 };
    }
    if (dev && dev.startsWith('pad:')) {
      const g = pads().find((q) => q.index === +dev.slice(4));
      if (!g) return { left: false, right: false, jump: false, talk: false, run: 0, analog: 1 };
      const pb = B.pad[0], ax = g.axes[0] || 0;
      return {
        left: btn(g, 14) || ax < -STICK_DEAD, right: btn(g, 15) || ax > STICK_DEAD,
        jump: btn(g, pb.jump), talk: btn(g, pb.talk), run: Math.max(btn(g, pb.run) ? 1 : 0, trigRun() ? val(g, 7) : 0),
        analog: Math.abs(ax) > STICK_DEAD && !btn(g, 14) && !btn(g, 15) ? stickSpeed(ax) : 1, back: btn(g, 1), start: btn(g, 9),
        gadget: pb.gadget !== undefined && btn(g, pb.gadget),
      };
    }
    if (dev === 'touch') { const t = touch[0]; return { left: t.left, right: t.right, jump: t.jump, talk: t.talk, run: t.run, gadget: !!t.gadget, analog: 1 }; }
    return { left: false, right: false, jump: false, talk: false, run: 0, analog: 1 };
  }
  function pollDevices(devs) {
    soloMode = false;
    return devs.map((dev, slot) => {
      const st = devState(dev);
      const pv = prevDev[slot] || (prevDev[slot] = {});
      st.jumpP = !!st.jump && !pv.jump; st.talkP = !!st.talk && !pv.talk; st.gadgetP = !!st.gadget && !pv.gadget;
      pv.jump = st.jump; pv.talk = st.talk; pv.gadget = st.gadget;
      if (dev && dev.startsWith('pad:') && (st.left || st.right || st.jump)) lastSource = 'gamepad';
      return st;
    });
  }
  // Écran « Appuie pour rejoindre » : ce que chaque appareil vient d'appuyer
  const prevJoin = {};
  function joinPoll() {
    const ev = [];
    const check = (dev, st) => {
      const pv = prevJoin[dev] || (prevJoin[dev] = {});
      for (const k of ['jump', 'talk', 'left', 'right', 'back', 'start']) { if (st[k] && !pv[k]) ev.push({ dev, act: k }); pv[k] = !!st[k]; }
    };
    check('kb0', devState('kb0'));
    check('kb1', devState('kb1'));
    check('kb', { start: keys.has('Enter') || keys.has('NumpadEnter'), back: keys.has('Escape') || keys.has('Backspace') });
    for (const g of pads()) check('pad:' + g.index, devState('pad:' + g.index));
    keyQueue = [];   // les touches servent ici, pas aux menus
    return ev;
  }

  /* ---------- Soirée OSWEL (vue de dessus) : joystick + 2 boutons ----------
     Mêmes commandes pour tous les mini-jeux :
       manette : joystick gauche ou croix · A = ✕ · B = □, ○ ou △ · pause = OPTIONS
       clavier gauche : Z Q S D (W A S D en QWERTY) · A = Espace · B = E
       clavier droit : flèches · A = Entrée · B = Maj droite
       téléphone : joystick et boutons à l'écran (OT.ArenaTouch) */
  const AKEYS = {
    kb0: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], a: ['Space', 'KeyF', 'KeyC'], b: ['KeyE', 'ShiftLeft', 'KeyR'] },
    kb1: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], a: ['Enter', 'NumpadEnter', 'Numpad0', 'ControlRight'], b: ['ShiftRight', 'Numpad1', 'Numpad2', 'Slash'] },
  };
  function arenaState(dev) {
    const st = { mx: 0, mz: 0, a: false, b: false, pause: false };
    if (dev === 'kb0' || dev === 'kb1') {
      const K = AKEYS[dev];
      st.mx = (anyKey(K.right) ? 1 : 0) - (anyKey(K.left) ? 1 : 0);
      st.mz = (anyKey(K.down) ? 1 : 0) - (anyKey(K.up) ? 1 : 0);
      if (st.mx && st.mz) { st.mx *= 0.7071; st.mz *= 0.7071; }
      st.a = anyKey(K.a); st.b = anyKey(K.b);
      st.pause = keys.has('Escape') || (dev === 'kb0' && keys.has('KeyP'));
      return st;
    }
    if (dev && dev.startsWith('pad:')) {
      const g = pads().find((q) => q.index === +dev.slice(4));
      if (!g) return st;
      let ax = g.axes[0] || 0, az = g.axes[1] || 0;
      const m = Math.hypot(ax, az);
      if (m < 0.22) { ax = 0; az = 0; } else { const k = Math.min(1, (m - 0.22) / 0.68) / m; ax *= k; az *= k; }
      const dx = (btn(g, 15) ? 1 : 0) - (btn(g, 14) ? 1 : 0), dz = (btn(g, 13) ? 1 : 0) - (btn(g, 12) ? 1 : 0);
      if (dx || dz) { const n = Math.hypot(dx, dz); ax = dx / n; az = dz / n; }
      st.mx = ax; st.mz = az;
      // L2 / R2 servent au zoom de la caméra (sauf réglage « R2 = courir » : ils restent A et B)
      const tr = trigRun();
      st.a = btn(g, 0) || btn(g, 5) || (tr && btn(g, 7));
      st.b = btn(g, 2) || btn(g, 1) || btn(g, 3) || btn(g, 4) || (tr && btn(g, 6));
      st.pause = btn(g, 9);
      if (st.a || st.b || ax || az) lastSource = 'gamepad';
      return st;
    }
    if (dev === 'touch' && OT.ArenaTouch) return Object.assign(st, OT.ArenaTouch.state());
    return st;
  }
  // Écran des joueurs de la soirée : ce que chaque appareil vient d'appuyer
  const prevAJ = {};
  function arenaJoinPoll() {
    const ev = [];
    const check = (dev, st) => {
      const pv = prevAJ[dev] || (prevAJ[dev] = {});
      const now = { a: st.a, b: st.b, left: st.mx < -0.6, right: st.mx > 0.6, up: st.mz < -0.6, down: st.mz > 0.6, start: st.pause };
      for (const k in now) { if (now[k] && !pv[k]) ev.push({ dev, act: k }); pv[k] = !!now[k]; }
    };
    check('kb0', arenaState('kb0'));
    check('kb1', arenaState('kb1'));
    check('kbx', { mx: 0, mz: 0, a: false, b: keys.has('Backspace'), pause: keys.has('Escape') });
    for (const g of pads()) check('pad:' + g.index, arenaState('pad:' + g.index));
    keyQueue = [];
    return ev;
  }
  // vibrer la manette d'un appareil précis (rien pour le clavier)
  function rumbleDev(dev, strong, weak, ms) {
    if (!OT.settings || !OT.settings.vibration || !dev) return;
    if (dev === 'touch') { if (Math.max(strong, weak) >= 0.3) vibrate(Math.round(ms * Math.max(strong, weak))); return; }
    if (!dev.startsWith('pad:')) return;
    const idx = +dev.slice(4);
    const g = pads().find((q) => q.index === idx);
    if (!g) return;
    if (g.net) { OT.LAN.rumble(g, strong, weak, ms); return; }   // manette du réseau local
    if (g.hid) { if (OT.Light) OT.Light.rumble(idx - 100, strong * (OT.settings.vibStrength || 1), weak * (OT.settings.vibStrength || 1), ms); }
    else rumbleRaw(idx, strong, weak, ms);
  }
  // le nom des boutons A et B pour un appareil (pour les fiches des mini-jeux)
  function arenaLabels(dev) {
    if (dev === 'kb0') return { move: layoutMap ? [keyLabel('KeyW'), keyLabel('KeyA'), keyLabel('KeyS'), keyLabel('KeyD')].join(' ') : 'Z Q S D', a: 'Espace', b: keyLabel('KeyE') };
    if (dev === 'kb1') return { move: 'flèches', a: 'Entrée', b: 'Maj D' };
    if (dev === 'touch') return { move: 'joystick', a: 'A', b: 'B' };
    return { move: 'joystick', a: '✕', b: '□' };
  }

  /* ---------- Navigation dans les menus ---------- */
  function menuActions(dt) {
    const acts = [];
    const B = binds();
    const talkKeys = [...B.kb[0].talk, ...B.kb[1].talk];
    for (const code of keyQueue) {
      if (code === 'ArrowUp') acts.push('up');
      else if (code === 'ArrowDown') acts.push('down');
      else if (code === 'ArrowLeft') acts.push('left');
      else if (code === 'ArrowRight') acts.push('right');
      else if (code === 'Enter' || code === 'Space' || code === 'NumpadEnter') acts.push('ok');
      else if (code === 'Escape' || code === 'Backspace') acts.push('back');
      if (code === 'Escape' || code === 'KeyP') acts.push('pause');
      if (talkKeys.includes(code)) acts.push('talk');
    }
    keyQueue = [];
    let stickDir = null;
    for (const g of pads()) {
      const id = g.index;
      const map = { 12: 'up', 13: 'down', 14: 'left', 15: 'right', 0: 'ok', 1: 'back', 9: 'pause', 8: 'back' };
      // le bouton « Parler » choisi par le joueur fait aussi avancer les dialogues
      map[B.pad[0].talk] = map[B.pad[0].talk] || 'talk';
      for (const b in map) {
        const now = btn(g, +b);
        const key = id + ':' + b;
        if (now && !prevPadBtn[key]) { acts.push(map[b]); lastSource = 'gamepad'; }
        prevPadBtn[key] = now;
      }
      const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
      if (ay < -0.6) stickDir = 'up'; else if (ay > 0.6) stickDir = 'down';
      else if (ax < -0.6) stickDir = 'left'; else if (ax > 0.6) stickDir = 'right';
    }
    if (stickDir) {
      if (stickHold.dir !== stickDir) { acts.push(stickDir); stickHold = { dir: stickDir, t: 0.4 }; }
      else { stickHold.t -= dt; if (stickHold.t <= 0) { acts.push(stickDir); stickHold.t = 0.14; } }
    } else stickHold.dir = null;
    return acts;
  }

  /* ---------- Capture d'une nouvelle touche (écran « Touches ») ---------- */
  function startCapture(kind, player, cb) {
    capture = { kind, player, cb, t: 0 };
    keys.clear(); keyQueue = [];
    // on mémorise l'état actuel des boutons pour n'attraper qu'un NOUVEL appui
    if (kind === 'pad') {
      const g = padFor(player);
      capture.before = g ? g.buttons.map((b) => b.pressed) : [];
    }
  }
  function cancelCapture() { if (capture) { const cb = capture.cb; capture = null; cb(null); } }
  // appelée à chaque image : capture manette
  function pollCapture() {
    if (!capture || capture.kind !== 'pad') return;
    const g = padFor(capture.player);
    if (!g) return;
    for (let i = 0; i < g.buttons.length; i++) {
      const now = g.buttons[i].pressed;
      if (now && !capture.before[i]) {
        if (i === 9) { cancelCapture(); return; }       // OPTIONS = annuler
        const cb = capture.cb; capture = null;
        // on vide l'état « précédent » pour ne pas déclencher le menu
        prevPadBtn[g.index + ':' + i] = true;
        cb(i);
        return;
      }
      capture.before[i] = now;
    }
  }

  /* ---------- Texte de la touche « Parler » d'un joueur ---------- */
  function talkHint(p) {
    const B = binds();
    if (srcOf[p] === 'pad' && padFor(p)) return padLabel(B.pad[p].talk);
    const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (srcOf[p] === 'touch' || ((touchActive || coarse) && srcOf[p] !== 'pad' && keys.size === 0)) return 'ACTION';
    return keyLabel(B.kb[Math.min(p, 1)].talk[0]);
  }
  // version 1.5 : la touche du gadget d'un joueur (« F », « ○ », « GADGET »)
  function gadgetHint(p) {
    const B = binds();
    if (srcOf[p] === 'pad' && padFor(p)) return padLabel(B.pad[Math.min(p, 1)].gadget);
    if (srcOf[p] === 'touch') return 'POUVOIR';
    const k = B.kb[Math.min(p, 1)].gadget;
    return k && k.length ? keyLabel(k[0]) : '—';
  }
  // multijoueur : la touche d'action de l'appareil d'un joueur ('kb0', 'kb1', 'pad:2', 'touch')
  function actLabel(dev) {
    const B = binds();
    if (dev === 'kb0') return keyLabel(B.kb[0].talk[0]);
    if (dev === 'kb1') return keyLabel(B.kb[1].talk[0]);
    if (dev === 'touch') return 'ACTION';
    return padLabel(B.pad[0].talk);
  }

  return {
    poll, menuActions, rumble, vibrate, testRumble, initTouch, clearTouch, pads, padFor, browserPads,
    pollDevices, setPartyDevices, joinPoll, devState, flushMenu() { keyQueue = []; },
    startCapture, cancelCapture, pollCapture, keyLabel, padLabel, talkHint, actLabel, gadgetHint,
    arenaState, arenaJoinPoll, rumbleDev, arenaLabels,
    boundPad, trigRun,
    get capturing() { return !!capture; },
    get lastSource() { return lastSource; },
    get touchActive() { return touchActive; },
    set touchActive(v) { touchActive = v; },
    srcOf: (p) => srcOf[p],
    shortName,
  };
})();

/* =====================================================================
   SON — fabriqué avec WebAudio (aucun fichier à charger)
   ===================================================================== */
OT.Sound = (function () {
  let ctx = null, master = null, hum = null, humGain = null;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    return true;
  }
  // volume des bruitages × volume général (version 1.4)
  const vol = () => (OT.settings ? OT.settings.volume * (OT.settings.master !== undefined ? +OT.settings.master : 1) : 0.6);
  function tone(type, f0, f1, dur, g = 0.3, delay = 0) {
    if (!ctx || vol() <= 0) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), a = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    a.gain.setValueAtTime(g * vol(), t);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(a); a.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, g = 0.3, filt = 1200, delay = 0) {
    if (!ctx || vol() <= 0) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), a = ctx.createGain();
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = filt; a.gain.value = g * vol();
    s.connect(f); f.connect(a); a.connect(master); s.start(ctx.currentTime + delay);
  }
  return {
    unlock: ensure,
    tone, noise,                    // pour l'animation de lancement (splash.js)
    get ctx() { return ctx; },      // partagé avec la musique (music.js)
    jump: () => tone('square', 320, 620, 0.11, 0.1),
    land: () => tone('sine', 140, 60, 0.09, 0.2),
    spring: () => tone('triangle', 200, 900, 0.25, 0.25),
    death: () => { noise(0.35, 0.45, 900); tone('sawtooth', 300, 40, 0.4, 0.2); },
    crumble: () => noise(0.25, 0.22, 500),
    click: () => tone('square', 900, 700, 0.05, 0.1),
    menu: () => tone('triangle', 520, 640, 0.06, 0.1),
    ok: () => { tone('triangle', 523, 523, 0.08, 0.15); tone('triangle', 784, 784, 0.12, 0.15, 0.07); },
    bad: () => { tone('square', 220, 160, 0.18, 0.15); tone('square', 160, 110, 0.22, 0.15, 0.12); },
    door: () => [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.15, 0.18, i * 0.08)),
    coin: () => { tone('square', 988, 988, 0.06, 0.08); tone('square', 1319, 1319, 0.12, 0.08, 0.05); },
    buy: () => [660, 880, 1320].forEach((f, i) => tone('triangle', f, f, 0.1, 0.15, i * 0.06)),
    part: () => [880, 1175, 1568].forEach((f, i) => tone('sine', f, f, 0.12, 0.2, i * 0.06)),
    slam: () => { noise(0.3, 0.5, 300); tone('sine', 90, 35, 0.35, 0.35); },
    zap: () => { noise(0.12, 0.25, 4000); tone('sawtooth', 1400, 200, 0.12, 0.08); },
    whoosh: () => noise(0.4, 0.2, 2500),
    talk: () => tone('square', 440 + Math.random() * 200, 400, 0.04, 0.05),
    boom: () => { noise(0.6, 0.6, 600); tone('sine', 120, 30, 0.6, 0.4); },
    hit: () => { tone('square', 200, 80, 0.2, 0.3); noise(0.15, 0.3, 2000); },
    // version 1.3 : les pièges s'annoncent aussi au son
    tick: (g = 1) => tone('square', 1900, 1700, 0.035, 0.07 * g),                 // tic… tic… piège imminent
    saw: (g = 1) => { noise(0.14, 0.09 * g, 5200); tone('sawtooth', 820, 760, 0.14, 0.025 * g); },
    creak: (g = 1) => tone('triangle', 190, 120, 0.22, 0.09 * g),                // CLONG d'un marteau qui repart
    clang: () => { tone('square', 620, 380, 0.12, 0.12); noise(0.1, 0.18, 3000); },
    fuse: () => noise(0.5, 0.12, 6000),                                           // mèche qui grésille
    alarm: () => [0, 0.22, 0.44].forEach((d, i) => tone('square', i % 2 ? 660 : 880, i % 2 ? 660 : 880, 0.18, 0.12, d)),
    sizzle: (g = 1) => noise(0.32, 0.1 * g, 2400),                                // sol qui chauffe
    gate: () => { [392, 523, 659].forEach((f, i) => tone('triangle', f, f * 1.01, 0.14, 0.16, i * 0.07)); noise(0.3, 0.08, 1800, 0.05); },
    cp: () => [659, 880, 1175].forEach((f, i) => tone('sine', f, f, 0.12, 0.18, i * 0.07)),
    setHum(level) {
      if (!ctx) return;
      if (!hum) {
        hum = ctx.createOscillator(); humGain = ctx.createGain();
        hum.type = 'sawtooth'; hum.frequency.value = 55;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
        humGain.gain.value = 0;
        hum.connect(f); f.connect(humGain); humGain.connect(master); hum.start();
      }
      humGain.gain.setTargetAtTime(Math.max(0, level) * 0.25 * vol(), ctx.currentTime, 0.08);
    },
  };
})();
