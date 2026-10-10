/* =====================================================================
   OSWEL'S TRAP — pouvoirs.js  (version 1.5 : LES POUVOIRS DE TONY)

   Quand on JOUE Tony (Boutique → Personnage → TONY), il a des pouvoirs de
   programmeur. Un pouvoir est débloqué par monde, avec sa leçon :
     Monde 1  Ctrl+Z         retour à sa position d'il y a 1 seconde
     Monde 2  Boucle while   un saut de plus en l'air (2 à partir du Monde 4)
     Monde 3  Debug          révèle 5 s les pièges invisibles et les faux blocs
     Monde 4  Copier-coller  un clone fantôme appuie sur un bouton à sa place
     Monde 5  Compiler       fige un piège ou un bloc pendant 2 s
   Équilibrage : UN SEUL pouvoir actif à la fois, une recharge de 8 à 12 s
   (commune : changer de pouvoir ne la contourne pas), tout se passe sur un
   seul plan (le moteur n'a pas de couloirs).

   Commandes (la touche « gadget » du jeu : F · Ctrl droit · ○ · bouton tactile) :
     - un APPUI COURT  = utiliser le pouvoir choisi ;
     - MAINTENIR       = faire défiler les pouvoirs débloqués (on lâche sur celui qu'on veut).
   En Solo et en Coop seulement (en Versus tout le monde a les mêmes règles).

   Tout passe par les « prises » du moteur (js/extensions.js) : playerUpdate,
   airJump, update, frame, hud, build, levelStart, reset, kill, clear.
   Le moteur sait « figer » un piège (game.js : FZ / TT), et le clone appuie sur
   les boutons / interrupteurs (bt.ghostT, sw.ghostT). Aucun autre fichier ne
   dépend de celui-ci : s'il manque, le jeu marche comme avant.
   ===================================================================== */
window.OT = window.OT || {};

OT.TonyPowers = (function () {
  const GX = OT.GameExt;
  if (!GX) return null;
  const T = () => window.THREE;

  /* ------------------------------------------------------------------
     1. LES CINQ POUVOIRS (et leur leçon)
     ------------------------------------------------------------------ */
  const POWERS = [
    { id: 'ctrlz', w: 1, name: 'Ctrl+Z', icon: '⟲', cd: 10,
      what: 'Retour à ta position d\'il y a 1 seconde.',
      lesson: { title: 'Annuler : Ctrl+Z', text: 'Ctrl+Z annule la dernière action. Si on peut revenir en arrière, c\'est que le logiciel a GARDÉ l\'état d\'avant. C\'est l\'idée des sauvegardes et des versions (Git) : on ose essayer quand on sait qu\'on peut revenir.' },
      say: ['Premier pouvoir. Le plus utile de tous : Ctrl+Z.', 'Tu te trompes, tu reviens une seconde en arrière. Le logiciel avait gardé l\'état d\'avant : c\'est tout le secret.', 'Ça plante ? On recommence.'] },
    { id: 'boucle', w: 2, name: 'Boucle while', icon: '↻', cd: 8,
      what: 'Un saut de plus en l\'air (2 à partir du Monde 4).',
      lesson: { title: 'La boucle while', text: 'Une boucle while répète des instructions TANT QUE sa condition est vraie : while (enLAir && sautsRestants > 0) { sauter(); }. Chaque tour doit rapprocher la condition de « faux » : sinon la boucle ne s\'arrête jamais (boucle infinie). Ici, elle s\'arrête quand tu touches le sol.' },
      say: ['Une boucle while répète tant que sa condition est vraie.', 'Ici : tant que tu es en l\'air et qu\'il te reste un saut, tu peux sauter encore.', 'Une condition qui ne devient jamais fausse ? Boucle infinie. Ça, ça plante vraiment.'] },
    { id: 'debug', w: 3, name: 'Debug', icon: '◉', cd: 10, dur: 5,
      what: 'Révèle 5 secondes les pièges invisibles et les faux blocs.',
      lesson: { title: 'Déboguer : regarder avant de corriger', text: 'Déboguer, c\'est observer ce que fait VRAIMENT le programme avant de le corriger : afficher les valeurs cachées, poser des points d\'arrêt, lire les messages d\'erreur. On ne devine pas : on regarde, puis on corrige.' },
      say: ['Debug. Pendant cinq secondes, tu vois ce qui est caché : faux blocs, pièges invisibles.', 'Un bon développeur ne devine pas. Il regarde.', 'Et ce que tu as vu, retiens-le. Le debug, lui, ne dure pas.'] },
    { id: 'copier', w: 4, name: 'Copier-coller', icon: '⧉', cd: 12,
      what: 'Un clone fantôme appuie sur un bouton, un levier ou un interrupteur à ta place.',
      lesson: { title: 'Copier-coller (et ses limites)', text: 'Copier-coller du code fait gagner du temps, mais la copie fait exactement la même chose que l\'original, sans réfléchir : elle recopie aussi ses erreurs. Mieux vaut une fonction qu\'on comprend et qu\'on appelle plusieurs fois.' },
      say: ['Copier-coller. Ton clone va appuyer sur un bouton à ta place.', 'Il fait exactement ce qu\'on lui dit. Rien de plus. Même si c\'est un piège.', 'Le copier-coller, c\'est pratique… quand on sait ce qu\'on copie.'] },
    { id: 'compiler', w: 5, name: 'Compiler', icon: '{ }', cd: 12, dur: 2,
      what: 'Fige un piège ou un bloc pendant 2 secondes (il ne bouge plus et ne blesse plus).',
      lesson: { title: 'Compiler : figer avant de livrer', text: 'Compiler transforme le code source en un programme qui ne change plus. Avant de compiler, on PLANIFIE : on sait ce qu\'on veut figer, et pourquoi. Dans le métier, on ne livre pas un programme qui bouge encore.' },
      say: ['Dernier pouvoir : Compiler.', 'Pendant deux secondes, un piège ou un bloc est figé : il ne bouge plus, il ne blesse plus.', 'Deux secondes, c\'est court. Planifie avant d\'appuyer. Coder, puis planifier : c\'était ça, la leçon.'] },
  ];
  const BY = {}; POWERS.forEach((P) => (BY[P.id] = P));
  const newLine = (P) => `Nouveau pouvoir : ${P.name}. ${P.what}`;
  const HOW = 'Un appui court sur la touche Pouvoir pour l\'utiliser. Maintiens-la pour en choisir un autre. Un seul à la fois, et il faut attendre qu\'il recharge.';
  const HOLD = 0.4;        // maintenir plus longtemps = choisir un autre pouvoir
  const CYCLE = 0.55;      // en maintenant : un pouvoir de plus toutes les 0,55 s
  const COL = { violet: 0x8a5cff, dark: 0x2a0d4a, white: 0xffffff, gold: 0xfff0c2, cyan: 0xbff6ff };
  const EYE_POWER = '#bff6ff';   // les yeux de Tony passent au cyan pâle pendant un pouvoir

  /* ------------------------------------------------------------------
     2. QUI A QUOI : pouvoirs débloqués (selon la progression du profil)
     ------------------------------------------------------------------ */
  const prof = () => (OT.Save && OT.Save.active) || null;
  function unlocked(X) {
    const pr = prof();
    // sans profil (tests) : les mondes jusqu'à celui qu'on joue
    return POWERS.filter((P) => P.w === 1 || (pr ? OT.Save.worldOpen(pr, P.w) : X && P.w <= (X.worldId || 1)));
  }
  function loopsMax() { const pr = prof(); return pr && OT.Save.worldOpen(pr, 4) ? 2 : 1; }
  function saved() { const pr = prof(); if (!pr) return {}; pr.tonyPw = pr.tonyPw || { seen: [], sel: '' }; return pr.tonyPw; }
  // les pouvoirs ne marchent qu'en Solo et en Coop, pour un joueur qui joue Tony
  const on = (X, p) => !!(p && p.char === 'tony' && X.R && !X.R.party && (X.mode === 'solo' || X.mode === 'coop'));

  /* ------------------------------------------------------------------
     3. L'ÉTAT DE CHAQUE JOUEUR « Tony »
     ------------------------------------------------------------------ */
  function S(p, X) {
    if (p.tpw) return p.tpw;
    const list = unlocked(X);
    let sel = saved().sel;
    if (!list.some((P) => P.id === sel)) sel = (list.find((P) => P.w === X.worldId) || list[list.length - 1] || POWERS[0]).id;
    p.tpw = { sel, cd: 0, cdMax: 1, held: false, holdT: 0, cycled: false, lastUpd: 0, hist: [], clock: 0, sampleT: 0,
      loops: 0, loopT: 0, loopAir: false, active: null, activeT: 0, eyesT: 0 };
    return p.tpw;
  }
  const ST = { reveals: [], frozen: [], ghost: null, ghostMesh: null, hud: null, lessonQ: null };

  /* ------------------------------------------------------------------
     4. PETITS OUTILS D'AFFICHAGE (géométries et matériaux partagés)
     ------------------------------------------------------------------ */
  const cache = {};
  function edgesGeo() { return cache.edges || (cache.edges = new (T().EdgesGeometry)(new (T().BoxGeometry)(1, 1, 1))); }
  function lineMat(hex) {
    const k = 'l' + hex;
    return cache[k] || (cache[k] = new (T().LineBasicMaterial)({ color: hex, transparent: true, opacity: 0.95, toneMapped: false, depthTest: false }));
  }
  function fillMat(hex) {
    const k = 'f' + hex;
    return cache[k] || (cache[k] = new (T().MeshBasicMaterial)({ color: hex, transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false }));
  }
  const planeGeo = () => cache.plane || (cache.plane = new (T().PlaneGeometry)(1, 1));
  // une étiquette par texte (créée une fois, puis copiée : même texture, même matériau)
  function labelOf(X, text, color) {
    const k = 'lab:' + text + color;
    if (!cache[k]) cache[k] = X.M.label(text, { size: 22, h: 0.3, color, bg: 'rgba(8,6,16,0.82)', border: color });
    const m = cache[k].clone();
    m.renderOrder = 12;
    return m;
  }
  // une boîte « fil de fer » (+ un voile) autour d'une zone du niveau
  function cage(X, b, hex, text, color) {
    const G = new (T().Group)();
    const w = Math.max(0.15, b.x1 - b.x0), h = Math.max(0.15, b.y1 - b.y0);
    const L = new (T().LineSegments)(edgesGeo(), lineMat(hex));
    L.scale.set(w + 0.06, h + 0.06, 1.9); L.position.set((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0); L.renderOrder = 11;
    const F = new (T().Mesh)(planeGeo(), fillMat(hex));
    F.scale.set(w, h, 1); F.position.set((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0.97); F.renderOrder = 11;
    G.add(L, F);
    if (text) { const lab = labelOf(X, text, color || '#ffffff'); lab.position.set((b.x0 + b.x1) / 2, b.y1 + 0.32, 1.05); G.add(lab); }
    X.group().add(G);
    return G;
  }
  function drop(G) { if (G && G.parent) G.parent.remove(G); }
  // le flash (sombre pour Ctrl+Z, cyan pour Debug) : un voile par-dessus l'écran
  function flash(kind) {
    let el = document.getElementById('tony-fx');
    if (!el) { el = document.createElement('div'); el.id = 'tony-fx'; document.body.appendChild(el); }
    el.className = ''; void el.offsetWidth; el.className = kind;
  }
  function eyes(p, on) {
    const ud = p.mesh && p.mesh.userData;
    if (ud && ud.setGlow) ud.setGlow(on ? EYE_POWER : '');
  }
  function sparkle(X, p, n) {
    X.burst(p.x, p.y + 0.7, n || 16, [COL.white, COL.gold, COL.cyan], 3, { grav: -0.25, life: 0.6, size: 0.7 });
  }
  function say(X, p, text, color, dur) { X.bubble(p.x, p.y + 2.35, text, dur || 1.3, color || '#c9b6ff'); }
  function bark(X, p, kind) { try { X.heroBark(kind, p); } catch (e) {} }

  /* ------------------------------------------------------------------
     5. UTILISER LE POUVOIR CHOISI
     ------------------------------------------------------------------ */
  function use(X, p) {
    const st = S(p, X), P = BY[st.sel];
    if (!P) return;
    if (st.active) { say(X, p, 'Un seul pouvoir à la fois.', '#ffd28a'); OT.Sound.bad && OT.Sound.bad(); return; }
    if (st.cd > 0) { say(X, p, `${P.name} : recharge ${Math.ceil(st.cd)} s`, '#ffd28a', 0.9); bark(X, p, 'pw_wait'); return; }
    const ok = ({ ctrlz, boucle, debug, copier, compiler })[P.id](X, p, st);
    if (!ok) return;                                   // rien à faire ici : pas de recharge
    st.cd = st.cdMax = P.cd;
    st.eyesT = Math.max(st.eyesT, P.dur || 1.2);
    eyes(p, true);
    sparkle(X, p, 20);
    X.rumble(p.i, 0.15, 0.35, 90);
    bark(X, p, 'pw_' + P.id);
    const pr = prof(); if (pr) { pr.tonyPw = pr.tonyPw || { seen: [], sel: '' }; pr.tonyPw.used = (pr.tonyPw.used || 0) + 1; }
  }

  /* --- Ctrl+Z : retour à la position d'il y a 1 seconde --- */
  function record(X, p, st, dt) {
    st.clock += dt;
    if (st.clock - st.sampleT < 1 / 30) return;
    st.sampleT = st.clock;
    const h = st.hist, last = h[h.length - 1];
    // téléportation (porte de zone, point de reprise, portail…) : on oublie le passé
    if (last && (Math.abs(p.x - last.x) > 1.6 || Math.abs(p.y - last.y) > 1.6)) h.length = 0;
    h.push({ c: st.clock, x: p.x, y: p.y, f: p.face, g: p.gs || 1 });
    if (h.length > 75) h.shift();
  }
  function freeAt(X, p, x, y) {
    const b = { x0: x - p.w / 2 + 0.02, y0: y + 0.02, x1: x + p.w / 2 - 0.02, y1: y + p.h - 0.02 };
    if (x < 0.4 || x > X.R.W - 0.4) return false;
    for (const s of X.solidsNear(b, p)) if (X.overlap(b, s)) return false;
    return true;
  }
  function ctrlz(X, p, st) {
    const h = st.hist;
    if (h.length < 8) { say(X, p, 'Pas encore de passé à annuler.', '#c9b6ff'); return false; }
    const now = st.clock;
    // on vise 1 s en arrière ; si l'endroit est maintenant occupé (porte fermée…), on essaie un peu avant / après
    const tries = [1.0, 1.1, 0.9, 1.25, 0.8, 1.4, 0.7, 0.6, 0.5];
    let pick = -1;
    for (const ago of tries) {
      let k = -1;
      for (let i = h.length - 1; i >= 0; i--) if (h[i].c <= now - ago) { k = i; break; }
      if (k < 0) continue;
      if (freeAt(X, p, h[k].x, h[k].y)) { pick = k; break; }
    }
    if (pick < 0) { say(X, p, 'Ce passé-là n\'existe plus.', '#c9b6ff'); return false; }
    const to = h[pick];
    // la traînée violette, du présent vers le passé
    for (let i = h.length - 1; i >= pick; i -= 2) X.burst(h[i].x, h[i].y + 0.5, 2, [COL.violet, 0x4a1d8a, COL.white], 0.6, { grav: 0, life: 0.7, size: 0.8 });
    X.shock(p.x, p.y + 0.5, COL.dark, 1.8, 0.35);
    X.burst(p.x, p.y + 0.5, 14, [COL.dark, COL.violet], 4, { grav: 0, life: 0.45 });
    p.x = to.x; p.y = to.y; p.vx = 0; p.vy = 0; p.face = to.f;
    p.onGround = false; p.standOn = null; p.embedded = []; p.coyote = 0.12; p.cut = true; p.jumped = false;
    h.length = pick + 1;                                // ce qui venait après n'a jamais existé
    st.clock = to.c; st.sampleT = to.c;
    X.shock(p.x, p.y + 0.5, COL.violet, 1.6, 0.4);
    flash('ctrlz');
    OT.Sound.whoosh();
    return true;
  }

  /* --- Boucle while : un (ou deux) saut(s) de plus en l'air --- */
  function loopJump(X, p, st) {
    st.loops--;
    const gs = p.gs || 1;
    p.vy = X.PHYS.JUMP_V * 0.92 * gs; p.cut = false; p.jumped = true; p.onGround = false; p.coyote = 0; p.jumpBuf = 0;
    p.squash = 1.25;
    if (p.anim) p.anim.play('jump');
    OT.Sound.jump();
    X.shock(p.x, p.y + 0.05, COL.violet, 1.0, 0.3, true);
    X.burst(p.x, p.y + 0.1, 10, [COL.white, COL.violet], 3, { grav: 0.2, life: 0.4, size: 0.8 });
  }
  function boucle(X, p, st) {
    st.loops = loopsMax(); st.loopT = 4; st.loopAir = !p.onGround;
    say(X, p, `while (sauts < ${st.loops}) { sauter(); }`, '#c9b6ff', 1.6);
    if (!p.onGround) loopJump(X, p, st);               // en l'air : le premier tour part tout de suite
    st.active = 'boucle'; st.activeT = 4;
    return true;
  }

  /* --- Debug : ce qui est caché devient visible 5 s --- */
  const RED = 0xff4a3a, CYAN = 0x5fe8ff, GREEN = 0x3cff9a, GOLD = 0xffd23f;
  const RED_T = '#ff8a7a', CYAN_T = '#bff6ff', GREEN_T = '#a8ffd0', GOLD_T = '#ffe28a';
  const TRIG = { drop: 'PIÈGE : le sol tombe', ceiling: 'PIÈGE : le plafond tombe', swap: 'PIÈGE : le style change', doorRun: 'PIÈGE : la porte s\'enfuit' };
  function debug(X, p, st) {
    const R = X.R, xa = Math.max(0, Math.floor(p.x - 24)), xb = Math.min(R.W - 1, Math.ceil(p.x + 24));
    const near = (x) => x >= xa - 1 && x <= xb + 1;
    const items = [];
    const add = (x0, y0, x1, y1, hex, text, tcol) => items.push({ b: { x0, y0, x1, y1 }, hex, text, tcol });
    // les tuiles qui mentent (on regroupe les cases voisines identiques : une seule étiquette)
    const TILE = { f: ['FAUX SOL', RED, RED_T], o: ['FAUX MUR : passage', CYAN, CYAN_T], '~': ['SOL PIÉGÉ : il tombe', RED, RED_T], v: ['BLOC : il tombe', RED, RED_T],
      H: ['CAISSE PIÉGÉE', RED, RED_T], h: ['CAISSE SÛRE', GREEN, GREEN_T], S: ['FANTÔME : ne t\'arrête pas', CYAN, CYAN_T], O: ['SOL QUI GLISSE', RED, RED_T] };
    for (let y = 0; y < R.H; y++) {
      let run = null;
      for (let x = xa; x <= xb + 1; x++) {
        const t = x <= xb ? R.tiles[y][x] : null;
        const k = t && TILE[t.ch] && (t.state === undefined || t.state === 'idle' || t.ch === 'o' || t.ch === 'f' || t.ch === 'S' || t.ch === 'O') ? t.ch : null;
        if (run && (k !== run.k || x > xb)) { const D = TILE[run.k]; add(run.x0, y, x, y + 1, D[1], D[0], D[2]); run = null; }
        if (k && !run) run = { k, x0: x };
      }
    }
    const E = R.ents;
    for (const c of E.fakecoin || []) if (!c.taken && near(c.x)) add(c.x - 0.4, c.y - 0.4, c.x + 0.4, c.y + 0.4, RED, 'FAUSSE PIÈCE', RED_T);
    for (const c of E.coin || []) if (!c.taken && c.hidden && near(c.x)) add(c.x - 0.4, c.y - 0.4, c.x + 0.4, c.y + 0.4, GOLD, 'PIÈCE CACHÉE', GOLD_T);
    for (const d of E.fakedoor || []) if (near(d.x)) add(d.x, d.y, d.x + 1, d.y + 2.3, RED, 'FAUSSE PORTE', RED_T);
    for (const c of E.cp || []) if (c.fake && !c.fired && near(c.x)) add(c.x, c.y, c.x + 1, c.y + 2, RED, 'FAUX DRAPEAU', RED_T);
    for (const s of E.switch || []) if (s.fake && near(s.x)) add(s.x, s.y, s.x + 1, s.y + 1, RED, 'FAUX INTERRUPTEUR', RED_T);
    for (const pt of E.fakepart || []) if (!pt.taken && near(pt.x)) add(pt.x - 0.4, pt.y - 0.4, pt.x + 0.4, pt.y + 0.4, RED, 'FAUSSE PIÈCE', RED_T);
    for (const pt of E.part || []) if (!pt.taken && near(pt.x)) add(pt.x - 0.4, pt.y - 0.4, pt.x + 0.4, pt.y + 0.4, GREEN, 'LA VRAIE', GREEN_T);
    for (const tr of E.trigger || []) if (!tr.fired && !tr.wire && near(tr.x)) add(tr.x - 0.06, tr.y, tr.x + 0.06, tr.y + 3, RED, TRIG[tr.act] || 'PIÈGE', RED_T);
    for (const lg of E.linger || []) if (!lg.fired && near(lg.x0)) add(lg.x0, lg.y, lg.x1 + 1, lg.y + 0.4, RED, 'NE TRAÎNE PAS ICI', RED_T);
    // les pièges des modules (js/pieges3.js)
    for (const P of E.popspike || []) if (P.st === 'idle' && near(P.x0)) add(P.x0, P.mode === 'ceil' ? P.y - 0.5 : P.y + 1, P.x1 + 1, P.mode === 'ceil' ? P.y : P.y + 1.5, RED, 'PICS CACHÉS', RED_T);
    for (const H of E.hole || []) if (!H.shifted && near(H.h0)) add(H.h0 + H.sh, H.y, H.h0 + H.sh + H.w, H.y + 1, RED, 'LE TROU VIENT ICI', RED_T);
    for (const W of E.popwall || []) if (W.st === 'idle' && near(W.wx)) add(W.wx, W.gy, W.wx + 1, W.gy + W.h, RED, 'MUR SURGISSANT', RED_T);
    for (const C of E.ceilpress || []) if (C.st === 'idle' && near(C.x0)) add(C.x0, C.u - 0.3, C.x1 + 1, C.u, RED, 'LE PLAFOND DESCEND', RED_T);
    for (const C of E.chasesaw || []) if (!C.on && near(C.tx)) add(C.tx - 0.06, C.y - 0.6, C.tx + 0.06, C.y + 2.4, RED, 'DÉPART DE LA SCIE', RED_T);
    for (const B of E.bombcoin || []) if (!B.fired && near(B.cx)) add(B.cx, B.cy - 0.5, B.cx + 1, B.cy + 0.5, RED, 'APPÂT : des bombes', RED_T);
    for (const K of E.backcoin || []) if (!K.picked && near(K.b0)) add(K.b0, K.gy - 1, K.b1 + 1, K.gy, RED, 'S\'EFFONDRE', RED_T);
    for (const P of E.pattern || []) if (!P.kTarget && near(P.xs[3])) add(P.xs[3], P.y - 1, P.xs[3] + P.w, P.y, RED, 'ELLE GLISSE', RED_T);
    for (const K of E.kickdoor || []) if (near(K.x)) add(K.x, K.y, K.x + 1, K.y + 2.3, RED, 'FAUSSE SORTIE', RED_T);
    flash('debug');
    OT.Sound.click && OT.Sound.click();
    if (!items.length) { say(X, p, 'Debug : rien de caché à l\'écran.', CYAN_T, 1.6); return true; }   // savoir que c'est « propre », c'est aussi une info
    items.slice(0, 40).forEach((it, k) => ST.reveals.push({ G: cage(X, it.b, it.hex, k < 28 ? it.text : '', it.tcol), t: P_DEBUG.dur }));
    say(X, p, `Debug : ${items.length} chose${items.length > 1 ? 's' : ''} cachée${items.length > 1 ? 's' : ''}.`, CYAN_T, 1.6);
    st.active = 'debug'; st.activeT = P_DEBUG.dur;
    return true;
  }
  const P_DEBUG = BY.debug;

  /* --- Copier-coller : le clone fantôme appuie à ta place --- */
  function ghostMesh(X) {
    if (ST.ghostMesh && ST.ghostMesh.parent) return ST.ghostMesh;
    const m = OT.Models.hero({ char: 'tony', color: 0x8a6bd6, acc: 'aucun', gad: 'aucun' }, { marker: false });
    const gm = cache.ghostMat || (cache.ghostMat = new (T().MeshBasicMaterial)({ color: 0xdcd2ff, transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false }));
    m.traverse((o) => { if (o.isMesh || o.isLineSegments) { o.material = Array.isArray(o.material) ? o.material.map(() => gm) : gm; o.castShadow = false; o.receiveShadow = false; } });
    m.visible = false;
    X.group().add(m);
    ST.ghostMesh = m;
    ST.ghostAnim = OT.Anim ? OT.Anim.create(m) : null;
    return m;
  }
  function copier(X, p, st) {
    if (ST.ghost) { say(X, p, 'Le clone est déjà en route.', '#c9b6ff'); return false; }
    const E = X.R.ents, cands = [];
    for (const b of E.button || []) cands.push({ k: 'button', o: b, x: b.x + 0.5, y: b.y + 0.1 });
    for (const l of E.lever || []) cands.push({ k: 'lever', o: l, x: l.x + 0.5, y: l.y });
    for (const s of E.switch || []) cands.push({ k: 'switch', o: s, x: s.x + 0.5, y: s.y });
    let best = null, bd = 1e9;
    for (const c of cands) {
      const dx = Math.abs(c.x - p.x), dy = Math.abs(c.y - p.y);
      if (dx > 10 || dy > 6) continue;
      if (c.k === 'button' && c.o.ghostT > 0) continue;
      const d = dx + dy * 1.4 - ((c.x - p.x) * p.face > 0 ? 0.8 : 0);
      if (d < bd) { bd = d; best = c; }
    }
    if (!best) { say(X, p, 'Aucun bouton, levier ou interrupteur à portée.', '#c9b6ff', 1.6); bark(X, p, 'pw_none'); return false; }
    const m = ghostMesh(X);
    m.visible = true; m.scale.setScalar(1);
    m.position.set(p.x, p.y, 0.15);
    ST.ghost = { p, tgt: best, x: p.x, y: p.y, st: 'go', t: 0, life: 9 };
    X.burst(p.x, p.y + 0.6, 18, [COL.white, 0xdcd2ff, COL.violet], 3, { grav: -0.2, life: 0.55 });
    say(X, p, 'copier(); coller();', '#c9b6ff', 1.2);
    st.active = 'copier'; st.activeT = 9;
    return true;
  }
  function updateGhost(X, dt) {
    const G = ST.ghost; if (!G) return;
    const m = ST.ghostMesh; if (!m || !m.parent) { ST.ghost = null; return; }
    const c = G.tgt, R = X.R;
    G.t += dt; G.life -= dt;
    let moving = false;
    if (G.st === 'go') {
      const dx = c.x - G.x, dy = c.y - G.y, d = Math.hypot(dx, dy);
      const step = Math.min(d, 9 * dt);
      if (d > 0.04) { G.x += (dx / d) * step; G.y += (dy / d) * step; moving = true; m.rotation.y = dx >= 0 ? 0.45 : Math.PI - 0.45; }
      else {
        // arrivé : il appuie
        G.st = 'press'; G.t = 0;
        if (ST.ghostAnim) ST.ghostAnim.play('interact');
        if (c.k === 'button') { c.o.ghostT = 6; G.hold = 6; OT.Sound.click && OT.Sound.click(); }
        else if (c.k === 'lever') {
          R.lev[c.o.g] = !R.lev[c.o.g]; G.hold = 0.7;
          OT.Sound.clang && OT.Sound.clang();
          X.burst(c.o.x + 0.5, c.o.y + 0.9, 8, [c.o.col || COL.white, COL.white], 3, { up: 1, life: 0.3 });
          GX.run('mechanism', 'lever', c.o, G.p, X);
        } else if (c.k === 'switch') {
          if (c.o.fake) {
            // un FAUX interrupteur : c'est le clone qui prend la décharge
            OT.Sound.zap && OT.Sound.zap();
            X.burst(G.x, G.y + 0.6, 22, [0x7fd0ff, COL.white], 8, { grav: 0 });
            X.bubble(G.x, G.y + 2.3, 'Faux interrupteur ! Le clone a pris la décharge à ta place.', 2.4, '#ff8a7a');
            bark(X, G.p, 'pw_clonefake');
            G.hold = 0; G.life = 0;
          } else { c.o.ghostT = 1.2; G.hold = 1.2; OT.Sound.click && OT.Sound.click(); }
        }
      }
    } else if (G.st === 'press') {
      if (G.t >= (G.hold || 0)) G.st = 'out';
    }
    if (G.st === 'out' || G.life <= 0) {
      X.burst(G.x, G.y + 0.6, 14, [0xdcd2ff, COL.white], 3, { grav: -0.3, life: 0.5 });
      m.visible = false; ST.ghost = null;
      const st = G.p.tpw; if (st && st.active === 'copier') { st.active = null; st.activeT = 0; }
      return;
    }
    m.position.set(G.x, G.y, 0.15);
    if (ST.ghostAnim) { try { ST.ghostAnim.update(dt, { speed: moving ? 1 : 0, ground: true, vy: 0 }); } catch (e) {} }
    if (m.userData.gadTick) m.userData.gadTick(X.time);
    if (Math.random() < 0.3) X.burst(G.x, G.y + 0.4 + Math.random() * 0.8, 1, [0xdcd2ff, COL.white], 0.5, { grav: -0.3, life: 0.5, size: 0.6 });
  }

  /* --- Compiler : figer un piège ou un bloc 2 s --- */
  function targets(X) {
    const R = X.R, E = R.ents, out = [];
    const T0 = (o, x0, y0, x1, y1, name) => out.push({ o, b: { x0, y0, x1, y1 }, name });
    for (const s of E.saw || []) T0(s, s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r, 'scie');
    for (const h of E.hammer || []) if (h.hx !== undefined) T0(h, h.hx - 0.6, h.hy - 0.45, h.hx + 0.6, h.hy + 0.45, 'marteau');
    for (const k of E.crusher || []) T0(k, k.x, k.y, k.x + k.w, k.y + k.h, 'écraseur');
    for (const s of E.spear || []) T0(s, s.x, s.y, s.x + 1, s.y + 1, 'lance');
    for (const t of E.turret || []) T0(t, t.x, t.y, t.x + 1, t.y + 1, 'tourelle');
    for (const b of E.barrel || []) if (b.state !== 'gone') T0(b, b.x - 0.45, b.y, b.x + 0.45, b.y + 1, 'bidon');
    for (const pr of E.press || []) T0(pr, pr.x - 1, pr.y, pr.x + pr.gap + 1, pr.y + pr.h, 'murs');
    for (const L of E.laser || []) T0(L, L.zone.x0, L.zone.y0, L.zone.x1, L.zone.y1, 'laser');
    for (const c of E.chase || []) if (c.on && !c.done) T0(c, c.front - 1, c.y0, c.front + 0.4, c.y1 + 1, 'mur qui poursuit');
    for (const pl of E.plat || []) if (pl.auto) T0(pl, pl.x, pl.y, pl.x + pl.w, pl.y + pl.h, 'plateforme');
    for (const ps of E.piston || []) if (ps.yb !== undefined) T0(ps, ps.x, ps.yb, ps.x + 1, ps.yb + 1, 'piston');
    for (const tr of E.traffic || []) T0(tr, tr.x0, tr.y, tr.x1, tr.y + 1.2, 'circulation');
    for (const f of R.falling || []) if (!f.done) T0(f.tile, f.x, f.y, f.x + 1, f.y + 1, 'bloc');
    for (const P of E.popspike || []) if (P.st !== 'cool') T0(P, P.x0, P.mode === 'ceil' ? P.y - 0.5 : P.y + 1, P.x1 + 1, P.mode === 'ceil' ? P.y : P.y + 1.5, 'pics');
    for (const W of E.popwall || []) T0(W, W.wx, W.gy, W.wx + 1, W.gy + Math.max(0.4, W.e * W.h), 'mur');
    for (const C of E.ceilpress || []) if (C.st !== 'idle') T0(C, C.x0, C.u - 0.4, C.x1 + 1, C.u, 'plafond');
    for (const C of E.chasesaw || []) if (C.on) T0(C, C.x - 0.6, C.y - 0.6, C.x + 0.6, C.y + 0.6, 'scie');
    for (const B of E.bombcoin || []) if (B.bombs && B.bombs.length) { const xs = B.bombs.map((b) => b.x); T0(B, Math.min(...xs) - 0.5, B.gy, Math.max(...xs) + 0.5, X.R.H - 1, 'bombes'); }
    for (const P of E.pattern || []) T0(P, P.xs[3] + P.k * P.shift, P.y - 1, P.xs[3] + P.k * P.shift + P.w, P.y, 'plateforme');
    for (const G of E.ghost || []) if (G.st !== 'gone') T0(G, G.x0, G.y, G.x1 + 1, G.y + 1, 'plateforme fantôme');
    for (const H of E.hole || []) if (!H.shifted) T0(H, H.x0, H.y, H.x1 + 1, H.y + 1, 'sol');
    // les blocs : rouillé '=', piégé '~', glitch 'X', bloc de plafond 'v' (la rangée entière, 8 cases au plus)
    const xa = Math.max(0, Math.floor(X.players.reduce((m, q) => Math.min(m, q.x), 1e9) - 8));
    const xb = Math.min(R.W - 1, Math.ceil(X.players.reduce((m, q) => Math.max(m, q.x), -1e9) + 8));
    for (let y = 0; y < R.H; y++) {
      let run = null;
      for (let x = xa; x <= xb + 1; x++) {
        const t = x <= xb ? R.tiles[y][x] : null;
        const ok = t && ((t.ch === '=' && t.state !== 'fallen') || (t.ch === '~' && t.state === 'idle') || t.ch === 'X' || (t.ch === 'v' && t.state === 'idle'));
        const k = ok ? t.ch : null;
        if (run && (k !== run.k || x > xb || run.list.length >= 8)) { const L = run.list; T0(L, L[0].x, y, L[L.length - 1].x + 1, y + 1, 'bloc'); run = null; }
        if (k) { if (!run) run = { k, list: [] }; run.list.push(t); }
      }
    }
    return out;
  }
  function freeze(o, dur) { (Array.isArray(o) ? o : [o]).forEach((e) => { e.frzT = dur; }); }
  function compiler(X, p, st) {
    if (X.R.boss && !X.R.bossWait && !X.R.escape) { say(X, p, 'Un boss ne se compile pas. Lui, il faut le comprendre.', '#c9b6ff', 2); return false; }
    const cx = p.x, cy = p.y + 0.45;
    let best = null, bd = 1e9;
    for (const c of targets(X)) {
      const b = c.b;
      const nx = Math.max(b.x0, Math.min(cx, b.x1)), ny = Math.max(b.y0, Math.min(cy, b.y1));
      const d = Math.hypot(nx - cx, (ny - cy) * 1.2);
      if (d > 6.5) continue;
      const front = ((b.x0 + b.x1) / 2 - cx) * (p.face || 1) > 0 ? 0.9 : 0;
      if (d - front < bd) { bd = d - front; best = c; }
    }
    if (!best) { say(X, p, 'Rien à compiler à portée.', '#c9b6ff', 1.4); bark(X, p, 'pw_none'); return false; }
    const dur = BY.compiler.dur;
    freeze(best.o, dur);
    const G = cage(X, best.b, 0xdff8ff, '{ compilé }', '#e6fbff');
    ST.frozen.push({ o: best.o, G, t: dur, cx: (best.b.x0 + best.b.x1) / 2, cy: (best.b.y0 + best.b.y1) / 2 });
    X.burst((best.b.x0 + best.b.x1) / 2, (best.b.y0 + best.b.y1) / 2, 22, [COL.white, COL.cyan, 0x9ad8ff], 4, { grav: 0, life: 0.6 });
    X.shock((best.b.x0 + best.b.x1) / 2, (best.b.y0 + best.b.y1) / 2, COL.cyan, 1.6, 0.35);
    say(X, p, `Compilé : ${best.name}, figé 2 s.`, '#e6fbff', 1.3);
    st.active = 'compiler'; st.activeT = dur;
    OT.Sound.clang && OT.Sound.clang();
    return true;
  }

  /* ------------------------------------------------------------------
     6. BRANCHEMENTS DANS LE MOTEUR
     ------------------------------------------------------------------ */
  // chaque pas de physique, pour chaque joueur
  GX.on('playerUpdate', (p, inp, dt, X) => {
    if (!on(X, p)) return;
    const st = S(p, X);
    record(X, p, st, dt);
    st.cd = Math.max(0, st.cd - dt);
    if (st.eyesT > 0) { st.eyesT -= dt; if (st.eyesT <= 0) eyes(p, false); }
    if (st.active) { st.activeT -= dt; if (st.activeT <= 0 && st.active !== 'copier') st.active = null; }
    // la boucle while s'arrête quand on retouche le sol (ou au bout de 4 s)
    if (st.loops > 0) {
      st.loopT -= dt;
      if (!p.onGround) st.loopAir = true;
      if ((p.onGround && st.loopAir) || st.loopT <= 0) { st.loops = 0; if (st.active === 'boucle') { st.active = null; } }
    }
    // la touche : appui court = utiliser ; maintenir = choisir
    if (inp.gadgetP) { st.held = true; st.holdT = 0; st.cycled = false; st.nextCycle = HOLD; }
    if (st.held) {
      if (inp.gadget) {
        st.holdT += dt;
        if (st.holdT >= st.nextCycle) {
          st.nextCycle += CYCLE; st.cycled = true;
          const list = unlocked(X);
          if (list.length > 1) {
            const i = list.findIndex((P) => P.id === st.sel);
            st.sel = list[(i + 1) % list.length].id;
            const sv = saved(); if (prof()) { sv.sel = st.sel; }
            OT.Sound.menu && OT.Sound.menu();
          }
          const P = BY[st.sel];
          say(X, p, `${P.icon} ${P.name}${list.length > 1 ? `  (${list.findIndex((q) => q.id === P.id) + 1}/${list.length})` : ''}`, '#c9b6ff', 0.75);
        }
      } else {
        st.held = false;
        if (!st.cycled) use(X, p);
        else if (OT.Save && OT.Save.save) OT.Save.save();
      }
    }
  });
  // la boucle while autorise un saut en l'air
  GX.on('airJump', (p, X) => {
    if (!on(X, p) || !p.tpw || p.tpw.loops <= 0) return false;
    const st = p.tpw;
    st.loops--;
    p.airJumpV = X.PHYS.JUMP_V * 0.92;
    X.shock(p.x, p.y + 0.05, COL.violet, 1.0, 0.3, true);
    X.burst(p.x, p.y + 0.1, 10, [COL.white, COL.violet], 3, { grav: 0.2, life: 0.4, size: 0.8 });
    if (st.loops <= 0 && st.active === 'boucle') st.active = null;
    return true;
  });
  // chaque pas du monde : le temps des pièges figés, les révélations, le clone
  GX.on('update', (alive, dt, X) => {
    for (let i = ST.frozen.length - 1; i >= 0; i--) {
      const F = ST.frozen[i];
      F.t -= dt;
      (Array.isArray(F.o) ? F.o : [F.o]).forEach((e) => { e.frzT = Math.max(0, (e.frzT || 0) - dt); e.fz = (e.fz || 0) + dt; });
      if (F.t <= 0) {
        drop(F.G); ST.frozen.splice(i, 1);
        X.burst(F.cx, F.cy, 12, [COL.white, COL.cyan], 3, { grav: 0, life: 0.4 });   // le piège « se décompile » : il repart
      } else if (F.t < 0.5 && F.G) F.G.visible = Math.sin(X.time * 30) > -0.3;   // il va repartir : ça clignote
    }
    for (let i = ST.reveals.length - 1; i >= 0; i--) {
      const r = ST.reveals[i];
      r.t -= dt;
      if (r.t <= 0) { drop(r.G); ST.reveals.splice(i, 1); }
      else if (r.t < 0.8) r.G.visible = Math.sin(X.time * 26) > -0.2;
    }
    updateGhost(X, dt);
  });
  function clearAll() {
    ST.frozen.forEach((F) => { (Array.isArray(F.o) ? F.o : [F.o]).forEach((e) => { e.frzT = 0; }); drop(F.G); });
    ST.reveals.forEach((r) => drop(r.G));
    ST.frozen = []; ST.reveals = [];
    if (ST.ghost) { ST.ghost = null; if (ST.ghostMesh) ST.ghostMesh.visible = false; }
    for (const b of (OT.Game.api.R && OT.Game.api.R.ents.button) || []) b.ghostT = 0;
    for (const s of (OT.Game.api.R && OT.Game.api.R.ents.switch) || []) s.ghostT = 0;
  }
  // l'équipe recommence : plus rien n'est figé, révélé ou cloné ; Ctrl+Z oublie le passé
  GX.on('reset', (X) => {
    clearAll();
    for (const p of X.players) if (p.tpw) { p.tpw.hist.length = 0; p.tpw.loops = 0; p.tpw.active = null; eyes(p, false); }
  });
  GX.on('kill', (p) => { if (p.tpw) { p.tpw.hist.length = 0; p.tpw.loops = 0; p.tpw.held = false; } });
  GX.on('build', () => { ST.frozen = []; ST.reveals = []; ST.ghost = null; ST.ghostMesh = null; ST.ghostAnim = null; });
  GX.on('clear', () => { clearAll(); hudEl(false); document.body.classList.remove('has-gadget'); });

  /* ------------------------------------------------------------------
     7. LE HUD : le pouvoir choisi et sa recharge (et le bouton tactile)
     ------------------------------------------------------------------ */
  function hudEl(show) {
    let el = document.getElementById('hud-tpow');
    if (!el && show) {
      const row = document.getElementById('hud-time');
      el = document.createElement('span'); el.id = 'hud-tpow'; el.className = 'chip tpow';
      if (row && row.parentNode) row.parentNode.insertBefore(el, row.nextSibling); else return null;
    }
    if (el) el.hidden = !show;
    return el;
  }
  let hudT = 0;
  GX.on('frame', (dt, rdt, X) => {
    // le jeu est en pause / en dialogue : on oublie l'appui en cours (il ne partira pas tout seul à la reprise)
    if (X.state !== 'play') for (const p of X.players || []) if (p.tpw) { p.tpw.held = false; p.tpw.cycled = false; }
    hudT -= rdt; if (hudT > 0) return; hudT = 0.1;
    const tonys = (X.players || []).filter((p) => on(X, p));
    document.body.classList.toggle('has-gadget', tonys.length > 0);
    const el = hudEl(tonys.length > 0);
    if (!el || !tonys.length) return;
    el.innerHTML = tonys.map((p) => {
      const st = S(p, X), P = BY[st.sel];
      const key = OT.Input.gadgetHint ? OT.Input.gadgetHint(p.i) : 'F';
      const state = st.active ? '<i class="on">actif</i>' : st.cd > 0 ? `<i class="cd">${Math.ceil(st.cd)} s</i>` : '<i class="ok">prêt</i>';
      const bar = st.cd > 0 ? `<u style="width:${Math.round((1 - st.cd / st.cdMax) * 100)}%"></u>` : '';
      return `<span class="tp"><b>${P.icon} ${P.name}</b> ${state} <kbd>${key}</kbd>${bar}</span>`;
    }).join('');
    el.title = 'Pouvoir de Tony : appui court = utiliser · maintenir = changer de pouvoir';
  });

  /* ------------------------------------------------------------------
     8. UN POUVOIR DÉBLOQUÉ = UNE LEÇON (la première fois qu'on joue Tony dans ce monde)
     ------------------------------------------------------------------ */
  GX.on('levelStart', (R, X) => {
    if (!(X.players || []).some((p) => on(X, p))) return;
    const sv = saved(); sv.seen = sv.seen || [];
    const fresh = unlocked(X).filter((P) => !sv.seen.includes(P.id));
    if (!fresh.length) {
      setTimeout(() => { const p = X.players.find((q) => on(X, q)); if (p && X.R && X.state === 'play') say(X, p, `Pouvoir : ${BY[S(p, X).sel].name} — appui court ; maintenir pour changer`, '#c9b6ff', 3); }, 1600);
      return;
    }
    // le pouvoir de CE monde d'abord (avec sa leçon) ; les autres sont notés dans le Carnet.
    // On attend que le jeu soit vraiment en cours (la scène d'introduction du niveau passe avant).
    const main = fresh.find((P) => P.w === X.worldId) || fresh[fresh.length - 1];
    const R0 = X.R;
    let tries = 0;
    const tryLesson = () => {
      if (X.R !== R0 || ++tries > 60) return;
      if (X.state !== 'play' || OT.UI.dialogOpen || (OT.Dialogue && OT.Dialogue.speaking)) { setTimeout(tryLesson, 600); return; }
      // (des phrases fixes : elles ont toutes leur voix ; la touche exacte s'affiche ensuite dans un message)
      const lines = [['tony', newLine(main)]].concat(main.say.map((t) => ['tony', t]), [['tony', HOW]]);
      const key = OT.Input.gadgetHint ? OT.Input.gadgetHint(0) : 'F';
      X.state = 'dialog';
      OT.UI.dialog(lines, () => {
        OT.UI.show(null); if (X.state === 'dialog') X.state = 'play';
        fresh.forEach((P) => { if (!sv.seen.includes(P.id)) sv.seen.push(P.id); });
        const p = X.players.find((q) => on(X, q)); if (p) { p.tpw = null; const st = S(p, X); st.sel = main.id; sv.sel = main.id; }
        if (OT.Save && OT.Save.save) OT.Save.save();
        if (OT.UI.toast) OT.UI.toast(`Touche ${key} : ${main.name} (maintenir = changer) · Leçon « ${main.lesson.title} » dans le Carnet.`);
      });
    };
    setTimeout(tryLesson, 1400);
  });

  /* ------------------------------------------------------------------
     9. LES RÉPLIQUES DE TONY (courtes, humour sec) — avec leur voix
     ------------------------------------------------------------------ */
  const D = OT.Dialogue;
  if (D && D.defineBarks) {
    D.defineBarks('pw_ctrlz', { p: 0.7, cd: 10 }, { tony: ['Ctrl+Z.', 'Annulé.', 'On revient. Une seconde, ça suffit.'] });
    D.defineBarks('pw_boucle', { p: 0.6, cd: 10 }, { tony: ['Encore un tour.', 'Une boucle. Avec une sortie.'] });
    D.defineBarks('pw_debug', { p: 0.7, cd: 10 }, { tony: ['Mode debug.', 'Voyons ce qui se cache.', 'Les faux blocs mentent mal.'] });
    D.defineBarks('pw_copier', { p: 0.7, cd: 10 }, { tony: ['Copier. Coller.', 'Vas-y. Fais exactement ça.'] });
    D.defineBarks('pw_compiler', { p: 0.7, cd: 10 }, { tony: ['Compilé.', 'Figé. Deux secondes.', 'Ça ne bouge plus.'] });
    D.defineBarks('pw_wait', { p: 0.4, cd: 12 }, { tony: ['Pas encore. Ça recharge.', 'Patience. Ça compile.'] });
    D.defineBarks('pw_none', { p: 0.5, cd: 12 }, { tony: ['Rien à faire ici.', 'Inutile ici.'] });
    D.defineBarks('pw_clonefake', { p: 1, cd: 10 }, { tony: ['Le clone a pris à ma place. Bien.'] });
  }
  if (D && D.register) {
    POWERS.forEach((P) => { P.say.forEach((t, k) => D.register(`tony/pouvoir/${P.id}/${k}`, 'tony', t)); D.register(`tony/pouvoir/${P.id}/nouveau`, 'tony', newLine(P)); });
    D.register('tony/pouvoir/commandes', 'tony', HOW);
  }

  /* ------------------------------------------------------------------
     10. POUR LE CARNET ET LE JOURNAL
     ------------------------------------------------------------------ */
  function carnetHtml(pr) {
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const open = (w) => w === 1 || (pr && OT.Save.worldOpen(pr, w));
    return `<section class="cworld tonypw"><h3>Les pouvoirs de Tony</h3>
      <p class="muted small">Joue TONY (Boutique → Personnage) : un pouvoir par monde. Touche gadget (F · Ctrl droit · ○) : appui court = utiliser, maintenir = changer. Un seul à la fois, recharge de 8 à 12 s, en Solo et en Coop.</p>
      <ol class="lessons">${POWERS.map((P) => open(P.w)
        ? `<li><span class="k">${P.icon} ${esc(P.name)} · Monde ${P.w}</span><b>${esc(P.what)}</b><p><i>Leçon — ${esc(P.lesson.title)}.</i> ${esc(P.lesson.text)}</p><small class="muted">Recharge : ${P.cd} s${P.dur ? ` · dure ${P.dur} s` : ''}</small></li>`
        : `<li class="locked"><span class="k">🔒 ${esc(P.name)} · Monde ${P.w}</span><p>Ouvre le Monde ${P.w} pour le débloquer.</p></li>`).join('')}</ol></section>`;
  }

  return { POWERS, BY, unlocked, carnetHtml, use: (p) => use(OT.Game.api, p), state: (p) => S(p, OT.Game.api),
    // (pour les tests automatiques : ce qui est révélé / figé / cloné en ce moment)
    get _dbg() { return { reveals: ST.reveals.length, frozen: ST.frozen.length, ghost: ST.ghost ? { st: ST.ghost.st, x: ST.ghost.x, y: ST.ghost.y, k: ST.ghost.tgt.k } : null }; } };
})();
