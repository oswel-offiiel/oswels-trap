/* =====================================================================
   OSWEL'S TRAP — lan.js  (version 1.5 : le RÉSEAU LOCAL, côté jeu)

   Idée : UN PC fait tourner le jeu (l'« hôte »). Les autres appareils du
   même Wi-Fi (téléphones, tablettes, autres PC) ouvrent la page « manette »
   servie par ce PC (bureau/serveur-lan.js) et deviennent de VRAIES
   MANETTES pour le jeu : joystick, ✕ ○ □ △, OPTIONS, vibrations, couleur
   du joueur… et, s'ils le veulent, l'IMAGE du jeu en direct (vidéo WebRTC).

   Le plus important : chaque appareil connecté est présenté au jeu comme une
   MANETTE PS4 ordinaire (même forme que l'API Gamepad du navigateur). Le reste
   du jeu (histoire en coop / versus, Soirée OSWEL jusqu'à 4, menus) n'a donc
   rien à changer : input.js ajoute simplement ces manettes à sa liste
   (OT.Input.pads()), et une manette réseau peut être attribuée à un joueur
   (« place » 0 = Joueur 1, 1 = Joueur 2…).

   Messages échangés (JSON, à travers le relais du serveur) :
     manette → jeu : pad {b: boutons (bits 0-16), ax: [x, y, rx, ry], tr: [L2, R2]}
                     place {slot}   video {on}   rtc {sdp | cand}   nom {nom}
     jeu → manette : places {...}   joueur {couleur, nom, aide, contexte}
                     vibre {f, w, ms}   rtc {...}   video {ok, raison}
   ===================================================================== */
window.OT = window.OT || {};

OT.LAN = (function () {
  const NB_BOUTONS = 17;                       // disposition « standard » d'une manette (0 = ✕ … 16 = PS)
  const COULEURS = [0x3d8bff, 0xff8a2b, 0x3cff9a, 0xff5fa2];   // couleur par défaut de chaque place
  const PLACES = 4;                            // Joueur 1 à 4 (l'histoire en utilise 2, la Soirée 4)
  const pads = [];                             // les manettes réseau connectées
  const memoire = {};                          // id de l'appareil → place (pour retrouver sa place après une coupure)
  let ws = null, actif = false, info = null, relance = 0, tick = 0, fermeVoulue = false;
  let flux = null;                             // la vidéo du jeu (partagée par toutes les manettes qui regardent)
  const pairs = new Map();                     // cid → RTCPeerConnection
  const hex = (c) => '#' + (c >>> 0).toString(16).padStart(6, '0').slice(-6);
  const toast = (t) => { if (OT.UI && OT.UI.toast) OT.UI.toast(t); };

  /* ---------- une manette réseau = un objet qui ressemble à un Gamepad ---------- */
  let prochainIndex = 200;                     // index des manettes réseau : 200, 201… (les vraies : 0-3, mode direct : 100+)
  function creerPad(m) {
    const p = {
      // champs de l'API Gamepad (ce que lit input.js)
      id: 'Manette réseau — ' + m.nom, index: prochainIndex++, connected: true, mapping: 'standard', timestamp: performance.now(),
      buttons: Array.from({ length: NB_BOUTONS }, () => ({ pressed: false, touched: false, value: 0 })),
      axes: [0, 0, 0, 0],
      // champs propres au réseau
      net: true, cid: m.cid, cle: m.id, nom: m.nom, appareil: m.appareil,
      slot: memoire[m.id] !== undefined ? memoire[m.id] : -1,
      video: false, dernier: '', vu: performance.now(),
    };
    return p;
  }
  const padDe = (cid) => pads.find((p) => p.cid === cid);

  /* ---------- connexion au relais (le serveur tourne sur CE PC) ---------- */
  function connecter(url) {
    fermeVoulue = false;
    try { ws = new WebSocket(url); } catch (e) { toast('Réseau local : connexion impossible.'); return; }
    ws.onopen = () => { actif = true; relance = 0; envoyerPlaces(); rafraichir(); };
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } recevoir(m); };
    ws.onclose = () => {
      ws = null;
      if (fermeVoulue) return;
      // coupure inattendue : on réessaie (le serveur est sur ce PC, il revient vite)
      setTimeout(() => { if (!fermeVoulue && info) connecter(info.ws); }, Math.min(5000, 500 * ++relance));
    };
  }
  function envoyer(to, msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(Object.assign({ to }, msg))); }

  function recevoir(m) {
    if (m.t === 'arrivee') {
      let p = padDe(m.cid);
      if (!p) { p = creerPad(m); pads.push(p); }
      toast(`📶 ${m.nom} a rejoint la partie (${m.appareil === 'pc' ? 'PC' : 'téléphone'}).`);
      OT.Sound && OT.Sound.ok && OT.Sound.ok();
      envoyerPlaces(); rafraichir();
      return;
    }
    if (m.t === 'depart') {
      const k = pads.findIndex((p) => p.cid === m.cid);
      if (k >= 0) {
        const p = pads[k];
        p.connected = false;
        pads.splice(k, 1);
        fermerPair(m.cid);
        toast(`📶 ${p.nom} s'est déconnecté.`);
      }
      envoyerPlaces(); rafraichir();
      return;
    }
    const p = padDe(m.cid);
    if (!p) return;
    p.vu = performance.now();
    if (m.t === 'pad') {
      // les boutons arrivent en un seul nombre : le bit k = le bouton k est appuyé
      const b = m.b | 0;
      for (let k = 0; k < NB_BOUTONS; k++) {
        const on = !!(b & (1 << k));
        p.buttons[k].pressed = on; p.buttons[k].touched = on; p.buttons[k].value = on ? 1 : 0;
      }
      // gâchettes analogiques (zoom de la caméra / course progressive)
      if (Array.isArray(m.tr)) { for (const [k, v] of [[6, m.tr[0]], [7, m.tr[1]]]) { const x = Math.max(0, Math.min(1, +v || 0)); if (x > p.buttons[k].value) { p.buttons[k].value = x; p.buttons[k].pressed = x > 0.5; } } }
      const ax = Array.isArray(m.ax) ? m.ax : [];
      for (let k = 0; k < 4; k++) p.axes[k] = Math.max(-1, Math.min(1, +ax[k] || 0));
      p.timestamp = performance.now();
    } else if (m.t === 'place') {
      choisirPlace(p, m.slot);
    } else if (m.t === 'nom') {
      p.nom = String(m.nom || p.nom).slice(0, 16); p.id = 'Manette réseau — ' + p.nom;
      envoyerPlaces(); rafraichir();
    } else if (m.t === 'video') {
      if (m.on) demarrerVideo(p); else { p.video = false; fermerPair(p.cid); }
      rafraichir();
    } else if (m.t === 'rtc') {
      const pc = pairs.get(p.cid);
      if (!pc) return;
      if (m.sdp) pc.setRemoteDescription(m.sdp).catch(() => {});
      else if (m.cand) pc.addIceCandidate(m.cand).catch(() => {});
    }
  }

  /* ---------- les places (Joueur 1, Joueur 2…) ---------- */
  function placePrise(slot, sauf) { return pads.some((q) => q !== sauf && q.slot === slot); }
  function choisirPlace(p, slot) {
    slot = slot === null || slot === undefined ? -1 : slot | 0;
    if (slot >= PLACES || slot < -1) slot = -1;
    if (slot >= 0 && placePrise(slot, p)) {
      // la place est prise par une autre manette réseau : on échange
      const autre = pads.find((q) => q !== p && q.slot === slot);
      autre.slot = p.slot; memoire[autre.cle] = autre.slot;
    }
    p.slot = slot; memoire[p.cle] = slot;
    envoyerPlaces(); rafraichir();
  }
  function envoyerPlaces() {
    for (const p of pads) {
      const places = [];
      for (let s = 0; s < PLACES; s++) {
        const q = pads.find((o) => o.slot === s);
        places.push({ slot: s, nom: q ? q.nom : null, moi: q === p, couleur: hex(COULEURS[s]) });
      }
      envoyer(p.cid, { t: 'places', places, slot: p.slot });
    }
  }

  /* ---------- toutes les 0,25 s : ce que chaque manette doit afficher ---------- */
  function contexte() {
    if (OT.Arena && OT.Arena.active) return 'soiree';
    const st = OT.Game ? OT.Game.state : 'idle';
    if (OT.Game && OT.Game.mode !== 'party' && (st === 'play' || st === 'dialog' || st === 'pause' || st === 'done')) return 'histoire';
    return 'menu';
  }
  const AIDE = {
    // (un bouton sans texte est caché sur les téléphones : moins de boutons = un écran moins encombré)
    menu: { 0: 'OK', 1: 'RETOUR', 2: '', 3: '', 9: 'MENU' },
    histoire: { 0: 'SAUT', 1: '', 2: 'COURIR', 3: 'ACTION', 9: 'PAUSE' },
    soiree: { 0: 'A', 1: '', 2: 'B', 3: '', 9: 'PAUSE' },
  };
  function majManettes() {
    if (!actif) return;
    const ctx = contexte();
    const A = OT.Arena && OT.Arena.active ? OT.Arena.match : null;
    const story = OT.Game && OT.Game._dbg ? OT.Game._dbg.players : [];
    for (const p of pads) {
      let couleur = p.slot >= 0 ? COULEURS[p.slot] : 0x9c8f80, nom = p.slot >= 0 ? 'JOUEUR ' + (p.slot + 1) : 'MANETTE';
      if (ctx === 'soiree' && A) {
        const P = A.players.find((q) => q.human && q.dev === 'pad:' + p.index);
        if (P) { couleur = P.color; nom = P.name; } else nom = 'SPECTATEUR';
      } else if (ctx === 'histoire' && p.slot >= 0 && story[p.slot]) {
        couleur = story[p.slot].color; nom = story[p.slot].name;
      }
      const aide = Object.assign({}, AIDE[ctx]);
      if (ctx === 'histoire' && OT.Gadgets) aide[1] = 'GADGET';
      // (1.5) ce joueur joue TONY (Solo / Coop) : le bouton ○ = ses pouvoirs (appui court = utiliser, maintenir = changer)
      if (ctx === 'histoire' && OT.TonyPowers && p.slot >= 0 && story[p.slot] && story[p.slot].char === 'tony' && (OT.Game.mode === 'solo' || OT.Game.mode === 'coop')) aide[1] = 'POUVOIR';
      const msg = { t: 'joueur', couleur: hex(couleur), nom, contexte: ctx, aide, slot: p.slot };
      const s = JSON.stringify(msg);
      if (s !== p.dernier) { p.dernier = s; envoyer(p.cid, msg); }
    }
  }

  /* ---------- vibrations : input.js nous passe les vibrations des manettes réseau ---------- */
  function vibrer(p, fort, faible, ms) {
    if (!p || !p.net) return;
    const now = performance.now();
    if (now - (p.vibT || 0) < 45) return;      // pas plus de ~20 messages par seconde
    p.vibT = now;
    envoyer(p.cid, { t: 'vibre', f: +(+fort || 0).toFixed(2), w: +(+faible || 0).toFixed(2), ms: Math.round(ms || 60) });
  }

  /* ---------- l'image du jeu en direct (WebRTC, seulement sur le réseau local) ---------- */
  async function preparerFlux() {
    if (flux && flux.getVideoTracks().some((t) => t.readyState === 'live')) return flux;
    flux = null;
    // version PC : on filme TOUTE la fenêtre du jeu (menus, textes et HUD compris) + son
    if (window.OTDesktop && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      try { flux = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true }); } catch (e) { flux = null; }
    }
    // sinon : seulement l'image 3D du jeu (le dessin du canvas)
    if (!flux) {
      const cv = document.getElementById('scene');
      if (cv && cv.captureStream) flux = cv.captureStream(30);
    }
    return flux;
  }
  async function demarrerVideo(p) {
    fermerPair(p.cid);
    const f = await preparerFlux().catch(() => null);
    if (!f || typeof RTCPeerConnection === 'undefined') { envoyer(p.cid, { t: 'video', ok: false, raison: 'Vidéo impossible sur ce PC.' }); return; }
    // réseau local : pas besoin de serveur STUN, les adresses locales suffisent
    const pc = new RTCPeerConnection({ iceServers: [] });
    pairs.set(p.cid, pc);
    p.video = true;
    for (const t of f.getTracks()) pc.addTrack(t, f);
    pc.onicecandidate = (e) => { if (e.candidate) envoyer(p.cid, { t: 'rtc', cand: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') { envoyer(p.cid, { t: 'video', ok: false, raison: 'Le Wi-Fi bloque la vidéo entre les appareils.' }); fermerPair(p.cid); p.video = false; rafraichir(); }
    };
    try {
      const offre = await pc.createOffer();
      await pc.setLocalDescription(offre);
      // qualité adaptée au Wi-Fi : 960 × 540 environ, 2,5 Mbit/s au plus
      for (const s of pc.getSenders()) {
        if (!s.track || s.track.kind !== 'video') continue;
        const st = s.track.getSettings ? s.track.getSettings() : {};
        const k = st.height ? Math.max(1, st.height / 540) : 1;
        const prm = s.getParameters();
        prm.encodings = prm.encodings && prm.encodings.length ? prm.encodings : [{}];
        Object.assign(prm.encodings[0], { maxBitrate: 2500000, maxFramerate: 30, scaleResolutionDownBy: k });
        s.setParameters(prm).catch(() => {});
      }
      envoyer(p.cid, { t: 'rtc', sdp: pc.localDescription.toJSON ? pc.localDescription.toJSON() : { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
    } catch (e) { envoyer(p.cid, { t: 'video', ok: false, raison: 'Vidéo impossible.' }); fermerPair(p.cid); }
  }
  function fermerPair(cid) {
    const pc = pairs.get(cid);
    if (pc) { try { pc.close(); } catch (e) {} pairs.delete(cid); }
    // plus personne ne regarde : on arrête de filmer
    if (!pairs.size && flux) { flux.getTracks().forEach((t) => t.stop()); flux = null; }
  }

  /* ---------- héberger / arrêter ---------- */
  // Peut-on héberger ici ? Oui dans la version PC, et aussi dans un navigateur ouvert sur le
  // serveur de bureau/serveur-lan.js (lancé à la main : node bureau/serveur-lan.js).
  async function peutHeberger() {
    if (window.OTDesktop && window.OTDesktop.lanDemarrer) return true;
    if (!/^https?:$/.test(location.protocol)) return false;
    try { const r = await fetch('/lan/info', { cache: 'no-store' }); const j = await r.json(); return j && j.jeu === 'oswels-trap'; } catch (e) { return false; }
  }
  async function heberger() {
    if (actif) return info;
    if (window.OTDesktop && window.OTDesktop.lanDemarrer) {
      const r = await window.OTDesktop.lanDemarrer();
      if (!r || !r.port) { toast('Impossible d\'ouvrir le réseau local : ' + ((r && r.erreur) || 'erreur inconnue')); return null; }
      info = { port: r.port, adresses: r.adresses || [], nom: r.nom, ws: `ws://127.0.0.1:${r.port}/ws?role=hote` };
    } else {
      // navigateur sur le serveur lancé à la main (même PC)
      const port = location.port || '80';
      let adresses = [];
      try { const j = await (await fetch('/lan/info', { cache: 'no-store' })).json(); adresses = j.adresses || []; } catch (e) {}
      info = { port, adresses, nom: 'ce PC', ws: `ws://127.0.0.1:${port}/ws?role=hote` };
    }
    connecter(info.ws);
    clearInterval(tick);
    tick = setInterval(majManettes, 250);
    if (OT.Input && OT.Input.flushMenu) OT.Input.flushMenu();
    return info;
  }
  async function arreter() {
    fermeVoulue = true;
    clearInterval(tick);
    for (const cid of [...pairs.keys()]) fermerPair(cid);
    for (const p of pads) p.connected = false;
    pads.length = 0;
    if (ws) { try { ws.close(); } catch (e) {} ws = null; }
    actif = false;
    if (window.OTDesktop && window.OTDesktop.lanArreter) await window.OTDesktop.lanArreter();
    info = null;
    rafraichir();
  }

  /* =====================================================================
     L'ÉCRAN « RÉSEAU LOCAL » (menu principal → Réseau local)
     ===================================================================== */
  let peut = null;                               // résultat de peutHeberger() (calculé une fois)
  const U = () => (OT.UI && OT.UI.ext) || null;
  function rafraichir() { const u = U(); if (u && u.current && u.current.id === 'screen-lan') u.rerender(); }
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function urlManette(ip) { return `http://${ip}${info && info.port && +info.port !== 80 ? ':' + info.port : ''}`; }
  function qrSvg(texte) {
    if (typeof qrcode !== 'function') return '';
    try { const q = qrcode(0, 'M'); q.addData(texte); q.make(); return q.createSvgTag({ cellSize: 5, margin: 2, scalable: true }); } catch (e) { return ''; }
  }
  const recents = () => { try { return JSON.parse(localStorage.getItem('ot-lan-recents') || '[]'); } catch (e) { return []; } };

  function rendre() {
    const el = document.getElementById('lan-body');
    if (!el) return;
    if (peut === null) { peut = false; peutHeberger().then((v) => { peut = v; rafraichir(); }); }
    let h = '';
    if (actif && info) {
      const ips = info.adresses.length ? info.adresses : [{ ip: location.hostname || 'localhost' }];
      const url = urlManette(ips[0].ip);
      h += `<div class="lan-grid">
        <div class="lan-qr"><div class="lan-qrbox">${qrSvg(url)}</div>
          <p class="lan-url">${esc(url)}</p>
          ${ips.slice(1).map((a) => `<p class="lan-url small">ou ${esc(urlManette(a.ip))}</p>`).join('')}
          <p class="muted small">Même Wi-Fi (ou partage de connexion d'un téléphone). Scanne le code avec l'appareil photo, ou tape l'adresse dans le navigateur.
          <b>Pas besoin d'internet</b> : un routeur ou un partage de connexion sans données mobiles suffit.</p>
          ${window.OTDesktop && window.OTDesktop.plateforme === 'win32' ? '<p class="muted small">Windows : si le pare-feu demande, coche « Réseaux privés » puis « Autoriser l\'accès », sinon les téléphones ne trouvent pas le PC.</p>' : ''}</div>
        <div class="lan-list"><h3>Manettes connectées · ${pads.length}</h3>
          ${pads.length ? pads.map((p) => `<div class="lan-row">
              <span class="dot" style="background:${p.slot >= 0 ? hex(COULEURS[p.slot]) : '#6d625a'}"></span>
              <b>${esc(p.nom)}</b><small>${p.appareil === 'pc' ? '💻' : '📱'}${p.video ? ' · 📺' : ''}</small>
              <button class="btn small" data-nav data-act="lanPlace:${p.cid}">${p.slot >= 0 ? 'Joueur ' + (p.slot + 1) : 'Sans place'}</button>
              <button class="btn small ghost" data-nav data-act="lanRetirer:${p.cid}">Retirer</button></div>`).join('')
            : '<p class="muted">Personne pour l\'instant. Les manettes apparaissent ici dès qu\'elles se connectent.</p>'}
          <p class="muted small">« Joueur 1 / 2 » = qui joue quel personnage dans l'Histoire (coop, versus). Dans la Soirée OSWEL, chaque manette rejoint en appuyant sur ✕, comme une manette branchée.</p>
          <nav class="menu row">
            <button class="btn" data-nav data-default data-act="play">Jouer : Histoire</button>
            <button class="btn" data-nav data-act="mp">Jouer : Soirée OSWEL</button>
            <button class="btn ghost" data-nav data-act="lanStop">Arrêter</button>
          </nav></div></div>`;
    } else {
      h += `<div class="lan-grid"><div class="lan-col"><h3>Héberger une partie</h3>
        <p>Ce PC fait tourner le jeu. Les amis sur le même Wi-Fi le rejoignent avec leur <b>téléphone</b> ou leur <b>PC</b> : ça devient leur manette (et ils peuvent voir l'écran du jeu chez eux).</p>
        ${peut ? '<nav class="menu"><button class="btn" data-nav data-default data-act="lanHost">▶ Héberger sur ce PC</button></nav>'
          : `<p class="muted small">Pour héberger, il faut la <b>version PC</b> du jeu (Windows ou Linux)${/^https?:$/.test(location.protocol) ? ', ou lancer <code>node bureau/serveur-lan.js</code> sur ce PC' : ''}.</p>`}
        <ol class="lan-steps"><li>Tout le monde sur le même Wi-Fi — <b>sans internet, ça marche aussi</b> (le Wi-Fi d'école bloque souvent les appareils entre eux : utilise alors le partage de connexion d'un téléphone, même sans données mobiles).</li>
        <li>Les autres scannent le QR code ou tapent l'adresse affichée.</li><li>Chacun choisit « Joueur 1 », « Joueur 2 »… et c'est parti.</li></ol></div>
        <div class="lan-col"><h3>Rejoindre une partie</h3>
        <p>Un autre PC héberge ? Tape son adresse (affichée sur son écran) : cet appareil devient une manette.</p>
        <input id="lan-addr" class="lan-input" data-nav type="text" inputmode="url" autocomplete="off" placeholder="ex. 192.168.1.12" value="${esc(recents()[0] || '')}">
        <nav class="menu row"><button class="btn" data-nav ${peut ? '' : 'data-default'} data-act="lanJoin">Rejoindre</button></nav>
        ${recents().length ? '<p class="muted small">Récents : ' + recents().map((r) => `<button class="btn small ghost" data-nav data-act="lanJoin:${esc(r)}">${esc(r)}</button>`).join(' ') + '</p>' : ''}
        </div></div>`;
    }
    el.innerHTML = h;
  }

  function rejoindre(adr) {
    adr = String(adr || (document.getElementById('lan-addr') || {}).value || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!adr) { toast('Tape l\'adresse du PC hôte (ex. 192.168.1.12).'); return; }
    if (!/:\d+$/.test(adr)) adr += ':47800';
    try { const r = recents().filter((x) => x !== adr); r.unshift(adr); localStorage.setItem('ot-lan-recents', JSON.stringify(r.slice(0, 4))); } catch (e) {}
    const retour = location.href.split('#')[0];
    const cible = `http://${adr}/manette.html?retour=${encodeURIComponent(retour)}`;
    if (window.OTDesktop && window.OTDesktop.ouvrir) window.OTDesktop.ouvrir(cible);
    else location.href = cible;
  }

  // branchement dans l'interface (ui.js expose ses écrans et actions dans OT.UI.ext)
  function brancher() {
    const u = U();
    if (!u) return;
    u.renderers.lan = rendre;
    const A = u.actions;
    A.lan = () => u.show('lan');
    A.soLan = () => u.show('lan');              // le bouton « Réseau local » de la Soirée OSWEL
    A.lanHost = async () => { await heberger(); rafraichir(); };
    A.lanStop = () => arreter();
    A.lanJoin = (adr) => rejoindre(adr);
    A.lanRetirer = (cid) => { envoyer('fermer', { cid: +cid, raison: 'Retiré par l\'hôte' }); };
    A.lanPlace = (cid) => {
      const p = padDe(+cid); if (!p) return;
      // Joueur 1 → Joueur 2 → Joueur 3 → Joueur 4 → sans place → Joueur 1…
      choisirPlace(p, p.slot + 1 >= PLACES ? -1 : p.slot + 1);
    };
  }

  // dans un navigateur ouvert avec ?hote=1 (serveur lancé à la main) : héberger tout de suite
  window.addEventListener('load', () => {
    brancher();
    if (/[?&]hote=1\b/.test(location.search)) setTimeout(() => heberger(), 800);
  });

  return {
    get actif() { return actif; },
    get info() { return info; },
    // utilisées par input.js
    pads: () => pads,
    padForSlot: (slot) => pads.find((p) => p.slot === slot && p.connected) || null,
    rumble: vibrer,
    // utilisées par l'interface et les tests
    heberger, arreter, rejoindre, peutHeberger, choisirPlace: (cid, slot) => { const p = padDe(cid); if (p) choisirPlace(p, slot); },
    get _pairs() { return pairs; },
  };
})();
